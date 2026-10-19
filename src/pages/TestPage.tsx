import { useMemo, useState } from "react";
import ProgressBar from "../components/ProgressBar";
import QuestionScreen from "../components/QuestionScreen";
import ResultScreen from "../components/ResultScreen";
import { scoreTest } from "../lib/scoring";
import {
  clearProgress,
  loadProgress,
  saveProgress,
  type TestProgress,
} from "../lib/storage";
import type { CareerTest, Profession, Question } from "../types/test";

type Props = {
  test: CareerTest;
  questions: Question[];
  professions: Profession[];
  onExit: () => void;
  onOpenProfession: (professionId: string) => void;
};

export default function TestPage({
  test,
  questions,
  professions,
  onExit,
  onOpenProfession,
}: Props) {
  const orderedQuestions = useMemo(() => {
    const byId = new Map(questions.map((q) => [q.id, q]));
    return test.questionIds
      .map((id) => byId.get(id))
      .filter((q): q is Question => q != null);
  }, [test, questions]);

  const [progress, setProgress] = useState<TestProgress>(() => {
    const saved = loadProgress(test.id);
    if (saved) return saved;
    return {
      testId: test.id,
      answers: {},
      currentIndex: 0,
      updatedAt: new Date().toISOString(),
    };
  });

  const [finished, setFinished] = useState(false);

  const update = (patch: Partial<TestProgress>) => {
    setProgress((prev) => {
      const next = { ...prev, ...patch, updatedAt: new Date().toISOString() };
      saveProgress(next);
      return next;
    });
  };

  const currentQuestion = orderedQuestions[progress.currentIndex];

  if (finished) {
    const scored = scoreTest(orderedQuestions, progress.answers, professions);
    const scoredIds = new Set(scored.map((s) => s.profession.id));
    const pending = professions.filter((p) => !scoredIds.has(p.id));
    return (
      <ResultScreen
        scored={scored}
        pendingCount={pending.length}
        onRestart={() => {
          clearProgress(test.id);
          setProgress({
            testId: test.id,
            answers: {},
            currentIndex: 0,
            updatedAt: new Date().toISOString(),
          });
          setFinished(false);
        }}
        onOpenProfession={onOpenProfession}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <p className="text-stone-600">
        Вопросы теста не найдены.{" "}
        <button
          type="button"
          onClick={onExit}
          className="text-orange-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          На главную
        </button>
      </p>
    );
  }

  const handleAnswer = (value: number) => {
    update({ answers: { ...progress.answers, [currentQuestion.id]: value } });
  };

  const handleNext = () => {
    if (progress.currentIndex + 1 >= orderedQuestions.length) {
      clearProgress(test.id);
      setFinished(true);
      return;
    }
    update({ currentIndex: progress.currentIndex + 1 });
  };

  const handleBack = () => {
    if (progress.currentIndex > 0) {
      update({ currentIndex: progress.currentIndex - 1 });
    }
  };

  return (
    <section aria-label={test.title}>
      <div className="mb-6">
        <ProgressBar
          current={progress.currentIndex + 1}
          total={orderedQuestions.length}
        />
      </div>
      <QuestionScreen
        questionText={currentQuestion.text}
        index={progress.currentIndex}
        total={orderedQuestions.length}
        selected={progress.answers[currentQuestion.id] ?? null}
        onAnswer={handleAnswer}
        onNext={handleNext}
        onBack={handleBack}
        canGoBack={progress.currentIndex > 0}
      />
    </section>
  );
}
