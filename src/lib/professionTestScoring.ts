export type ProfessionTest = {
  professionId: string;
  questions: string[];
};

export type ProfessionTestResultLevel = "low" | "medium" | "high";

export type ProfessionTestScore = {
  /** Сумма баллов за все вопросы: от 10 до 50 */
  total: number;
  level: ProfessionTestResultLevel;
};

/**
 * Методика: каждый ответ по 5-балльной шкале приносит 1–5 баллов.
 * Вопрос с reverse: true — обратный смысл, его баллы переворачиваются
 * (ответ «полностью моё» приносит 1 балл, «совсем не моё» — 5).
 */
export function scoreProfessionTest(
  answers: number[],
  reverseFlags: readonly boolean[] = [],
): ProfessionTestScore {
  let total = 0;
  answers.forEach((answer, i) => {
    const points = reverseFlags[i] ? 6 - answer : answer;
    total += points;
  });
  const level: ProfessionTestResultLevel =
    total <= 23 ? "low" : total <= 37 ? "medium" : "high";
  return { total, level };
}

export const PROF_TEST_LEVEL_META: Record<
  ProfessionTestResultLevel,
  { title: string; description: string; className: string }
> = {
  low: {
    title: "Низкая склонность",
    description:
      "Задачи и особенности профессии в основном не совпадают с твоими интересами. Это нормально — посмотри другие профессии и их тесты.",
    className: "bg-stone-100 text-stone-700",
  },
  medium: {
    title: "Средняя склонность",
    description:
      "Некоторые стороны профессии тебе подходят, но другие могут вызывать трудности или не вызывать интереса. Прочитай о профессии подробнее, чтобы решить.",
    className: "bg-amber-100 text-amber-800",
  },
  high: {
    title: "Высокая склонность",
    description:
      "Твои интересы во многом совпадают с задачами профессии — стоит рассмотреть её подробнее.",
    className: "bg-orange-100 text-orange-800",
  },
};
