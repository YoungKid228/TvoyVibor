import type { Profession, Question } from "../types/test";

export type ScoredProfession = {
  profession: Profession;
  raw: number;
  max: number;
  percent: number;
};

export function scoreTest(
  questions: Question[],
  answers: Record<string, string | null>,
  professions: Profession[],
): ScoredProfession[] {
  const raw = new Map<string, number>();
  const max = new Map<string, number>();

  for (const question of questions) {
    const optionId = answers[question.id];
    const option =
      optionId != null
        ? question.options.find((o) => o.id === optionId)
        : undefined;
    if (!option) continue; // пропущенный вопрос: исключаем из raw и из max

    for (const [professionId, value] of Object.entries(option.scores)) {
      raw.set(professionId, (raw.get(professionId) ?? 0) + value);
    }
    for (const profession of professions) {
      const optionValue = option.scores[profession.id];
      const bestPossible = Math.max(
        optionValue ?? 0,
        ...question.options.map((o) => o.scores[profession.id] ?? 0),
      );
      max.set(profession.id, (max.get(profession.id) ?? 0) + bestPossible);
    }
  }

  const scored = professions.map((profession) => {
    const rawScore = raw.get(profession.id) ?? 0;
    const maxScore = max.get(profession.id) ?? 0;
    return {
      profession,
      raw: rawScore,
      max: maxScore,
      percent:
        maxScore === 0 ? 0 : Math.round((rawScore / maxScore) * 100),
    };
  });

  return scored.sort((a, b) => b.percent - a.percent);
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
