import type { Profession, Question, ScaleValue } from "../types/test";

export type ScoredProfession = {
  profession: Profession;
  /** Суммарный балл: Σ (вес × (ответ − 3)) по отвеченным вопросам */
  raw: number;
  /** Минимально возможный балл по тем же вопросам */
  min: number;
  /** Максимально возможный балл по тем же вопросам */
  max: number;
  /** percent = (raw − min) / (max − min) × 100; 50 — нейтрально */
  percent: number;
};

function isScaleValue(value: unknown): value is ScaleValue {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Методика: за ответ a на вопрос q профессия p получает
 * points = w(q, p) × (a − 3), где w — знаковый вес влияния.
 * Пропущенный вопрос (ответ не 1..5) исключается из raw, min и max.
 * В результат попадают только профессии с хотя бы одним ненулевым весом;
 * профессии без утверждённых весов не ранжируются (методика готовится).
 */
export function scoreTest(
  questions: Question[],
  answers: Record<string, number | null>,
  professions: Profession[],
): ScoredProfession[] {
  const weightedProfessions = professions.filter((p) =>
    questions.some((q) => (q.weights[p.id] ?? 0) !== 0),
  );

  const raw = new Map<string, number>();
  const min = new Map<string, number>();
  const max = new Map<string, number>();

  for (const question of questions) {
    const answer = answers[question.id];
    if (!isScaleValue(answer)) continue; // пропущенный вопрос

    const agreement = answer - 3;
    for (const profession of weightedProfessions) {
      const weight = question.weights[profession.id] ?? 0;
      if (weight === 0) continue;
      const points = weight * agreement;
      raw.set(profession.id, (raw.get(profession.id) ?? 0) + points);
      min.set(profession.id, (min.get(profession.id) ?? 0) + -2 * Math.abs(weight));
      max.set(profession.id, (max.get(profession.id) ?? 0) + 2 * Math.abs(weight));
    }
  }

  return weightedProfessions
    .map((profession) => {
      const rawScore = raw.get(profession.id) ?? 0;
      const minScore = min.get(profession.id) ?? 0;
      const maxScore = max.get(profession.id) ?? 0;
      const span = maxScore - minScore;
      return {
        profession,
        raw: rawScore,
        min: minScore,
        max: maxScore,
        percent:
          span === 0 ? 0 : Math.round(((rawScore - minScore) / span) * 100),
      };
    })
    .sort((a, b) => b.percent - a.percent);
}

export function getResultExtremes(scored: ScoredProfession[]): {
  best: ScoredProfession;
  worst: ScoredProfession;
} {
  if (scored.length === 0) {
    throw new Error("scoreTest returned no professions");
  }
  return { best: scored[0], worst: scored[scored.length - 1] };
}
