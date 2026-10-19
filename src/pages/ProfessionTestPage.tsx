"use client";

import { useMemo, useState } from "react";
import ProgressBar from "../components/ProgressBar";
import QuestionScreen from "../components/QuestionScreen";
import PixelButton from "../components/PixelButton";
import PixelCard from "../components/PixelCard";
import SpecialText from "../components/SpecialText";
import {
  PROF_TEST_LEVEL_META,
  scoreProfessionTest,
} from "../lib/professionTestScoring";
import type { Profession, ProfessionTest } from "../types/test";

type Props = {
  test: ProfessionTest;
  profession: Profession | undefined;
  onExit: () => void;
  onOpenProfession: (professionId: string) => void;
};

export default function ProfessionTestPage({
  test,
  profession,
  onExit,
  onOpenProfession,
}: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    test.questions.map(() => null),
  );
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  const title = profession
    ? `Тест по профессии: ${profession.title}`
    : "Тест по профессии";

  const result = useMemo(() => {
    if (!finished) return null;
    return scoreProfessionTest(answers.map((a) => a ?? 3));
  }, [finished, answers]);

  const currentQuestion = test.questions[index];

  if (result) {
    const meta = PROF_TEST_LEVEL_META[result.level];
    return (
      <section data-testid="profession-test-result" aria-label="Результат теста по профессии">
        <SpecialText className="mb-1 text-2xl font-bold sm:text-3xl">
          Твой результат
        </SpecialText>
        <p className="mb-6 text-sm text-stone-500">{title}</p>

        <PixelCard className="mb-6" style={{ marginBottom: 24 }}>
          <p className="text-4xl font-bold tabular-nums">
            {result.total}
            <span className="text-lg font-normal text-stone-500"> / 50</span>
          </p>
          <p
            data-testid="profession-test-level"
            className={`mt-3 inline-block rounded-full px-3 py-1 text-sm font-medium ${meta.className}`}
          >
            {meta.title}
          </p>
          <p className="mt-3 text-sm text-stone-600">{meta.description}</p>
          <p className="mt-2 text-xs text-stone-400">
            Показатель отражает, насколько твои ответы совпадают с задачами
            профессии, а не вероятность успеха в ней.
          </p>
        </PixelCard>

        <div
          className="flex flex-col gap-4"
          style={{ marginTop: 12 }}
        >
          {profession && (
            <PixelButton
              type="button"
              variant="primary"
              data-testid="open-profession-btn"
              onClick={() => onOpenProfession(profession.id)}
              className="min-h-11 px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
              style={{ margin: 0 }}
            >
              Узнать больше о профессии
            </PixelButton>
          )}
          <PixelButton
            type="button"
            onClick={() => {
              setAnswers(test.questions.map(() => null));
              setIndex(0);
              setFinished(false);
            }}
            className="min-h-11 px-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
            style={{ margin: 0 }}
          >
            Пройти заново
          </PixelButton>
          <PixelButton
            type="button"
            onClick={onExit}
            className="min-h-11 px-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
            style={{ margin: 0 }}
          >
            К списку тестов
          </PixelButton>
        </div>
      </section>
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
          К списку тестов
        </button>
      </p>
    );
  }

  return (
    <section aria-label={title}>
      <PixelButton
        type="button"
        onClick={onExit}
        className="min-h-11 px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        style={{ marginBottom: 16 }}
      >
        ← К списку тестов
      </PixelButton>
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>

      <div className="mb-6">
        <ProgressBar current={index + 1} total={test.questions.length} />
      </div>
      <QuestionScreen
        questionText={currentQuestion}
        index={index}
        total={test.questions.length}
        selected={answers[index] ?? null}
        onAnswer={(value) =>
          setAnswers((prev) => prev.map((a, i) => (i === index ? value : a)))
        }
        onNext={() => {
          if (index + 1 >= test.questions.length) setFinished(true);
          else setIndex(index + 1);
        }}
        onBack={() => setIndex((i) => Math.max(0, i - 1))}
        canGoBack={index > 0}
      />
    </section>
  );
}
