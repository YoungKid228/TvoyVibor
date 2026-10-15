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
import type { CareerTest, Question } from "../types/test";

type Props = {
  test: CareerTest;
  questions: Question[];
  professions: import("../types/test").Profession[];
  onExit: () => void;
};

export default function TestPage({
  test,
  questions,
  professions,
  onExit,
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
    return (
      <ResultScreen
        scored={scoreTest(orderedQuestions, progress.answers, professions)}
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
      />
    );
  }

  if (!currentQuestion) {
    return (
      <p className="text-slate-600">
        Вопросы теста не найдены.{" "}
        <button
          type="button"
          onClick={onExit}
          className="text-sky-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          На главную
        </button>
      </p>
    );
  }

  const handleAnswer = (optionId: string) => {
    update({ answers: { ...progress.answers, [currentQuestion.id]: optionId } });
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
        question={currentQuestion}
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
