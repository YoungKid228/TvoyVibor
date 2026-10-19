import { describe, expect, it } from "vitest";
import {
  getResultExtremes,
  scoreTest,
  type ScoredProfession,
} from "../src/lib/scoring";
import type { Profession, Question } from "../src/types/test";

const professions: Profession[] = [
  {
    id: "analyst",
    directionId: "d1",
    programId: "p1",
    title: "Аналитик",
    description: "",
  },
  {
    id: "agent",
    directionId: "d1",
    programId: "p1",
    title: "Агент",
    description: "",
  },
  {
    id: "unweighted",
    directionId: "d1",
    programId: "p1",
    title: "Без весов",
    description: "",
  },
];

const questions: Question[] = [
  { id: "q1", text: "Q1", weights: { analyst: 3, agent: -2 } },
  { id: "q2", text: "Q2", weights: { analyst: 1, agent: 1 } },
];

describe("scoreTest", () => {
  it("computes points as weight × (answer − 3) for all five scale values", () => {
    // analyst: q1 w=3, q2 w=1 → max = 2*(3+1) = 8, min = -8
    // agent:   q1 w=-2, q2 w=1 → max = 2*(2+1) = 6, min = -6
    for (const answer of [1, 2, 3, 4, 5]) {
      const scored = scoreTest(questions, { q1: answer, q2: answer }, professions);
      const analyst = scored.find((s) => s.profession.id === "analyst")!;
      const agent = scored.find((s) => s.profession.id === "agent")!;

      const agreement = answer - 3;
      expect(analyst.raw).toBe(3 * agreement + 1 * agreement);
      expect(agent.raw).toBe(-2 * agreement + 1 * agreement);
      expect(analyst.max).toBe(8);
      expect(analyst.min).toBe(-8);
      expect(agent.max).toBe(6);
      expect(agent.min).toBe(-6);

      const expectedPercent = Math.round(
        ((analyst.raw - analyst.min) / (analyst.max - analyst.min)) * 100,
      );
      expect(analyst.percent).toBe(expectedPercent);
    }
  });

  it("gives 100% for answer 5 and 0% for answer 1 on positive weights", () => {
    const onlyPositive: Question[] = [{ id: "q1", text: "Q1", weights: { analyst: 2 } }];
    const high = scoreTest(onlyPositive, { q1: 5 }, professions);
    const low = scoreTest(onlyPositive, { q1: 1 }, professions);
    expect(high.find((s) => s.profession.id === "analyst")!.percent).toBe(100);
    expect(low.find((s) => s.profession.id === "analyst")!.percent).toBe(0);
  });

  it("inverts result for negative weights", () => {
    const negative: Question[] = [{ id: "q1", text: "Q1", weights: { agent: -2 } }];
    const high = scoreTest(negative, { q1: 5 }, professions);
    const low = scoreTest(negative, { q1: 1 }, professions);
    expect(high.find((s) => s.profession.id === "agent")!.percent).toBe(0);
    expect(low.find((s) => s.profession.id === "agent")!.percent).toBe(100);
  });

  it("gives 50% for neutral answers to all questions", () => {
    const scored = scoreTest(questions, { q1: 3, q2: 3 }, professions);
    for (const s of scored) {
      expect(s.percent).toBe(50);
    }
  });

  it("excludes skipped questions from raw, min and max", () => {
    const scored = scoreTest(questions, { q1: 5, q2: null }, professions);
    const analyst = scored.find((s) => s.profession.id === "analyst")!;
    // только q1: raw = 3*2 = 6; min = -6; max = 6
    expect(analyst.raw).toBe(6);
    expect(analyst.min).toBe(-6);
    expect(analyst.max).toBe(6);
    expect(analyst.percent).toBe(100);
  });

  it("treats out-of-range and non-integer answers as skipped", () => {
    for (const bad of [0, 6, 2.5, "4", null]) {
      const scored = scoreTest(questions, { q1: bad as number | null, q2: 5 }, professions);
      const analyst = scored.find((s) => s.profession.id === "analyst")!;
      // только q2: raw = 1*2 = 2; min = -2; max = 2
      expect(analyst.raw, `answer: ${String(bad)}`).toBe(2);
      expect(analyst.percent).toBe(100);
    }
  });

  it("excludes professions without weights from ranking", () => {
    const scored = scoreTest(questions, { q1: 5, q2: 5 }, professions);
    expect(scored.find((s) => s.profession.id === "unweighted")).toBeUndefined();
    expect(scored).toHaveLength(2);
  });

  it("breaks ties by professions.json order (stable sort)", () => {
    const equal: Question[] = [{ id: "q1", text: "Q1", weights: { analyst: 2, agent: 2 } }];
    const scored = scoreTest(equal, { q1: 4 }, professions);
    expect(scored[0].percent).toBe(scored[1].percent);
    expect(scored[0].profession.id).toBe("analyst");
    expect(scored[1].profession.id).toBe("agent");
  });

  it("sorts by percent descending", () => {
    const scored = scoreTest(questions, { q1: 5, q2: 2 }, professions);
    expect(scored[0].percent).toBeGreaterThanOrEqual(scored[1].percent);
  });

  it("returns percent 0 (not NaN) when no questions were answered", () => {
    const scored = scoreTest(questions, { q1: null, q2: null }, professions);
    const analyst = scored.find((s) => s.profession.id === "analyst")!;
    expect(analyst.max).toBe(0);
    expect(analyst.percent).toBe(0);
    expect(Number.isNaN(analyst.percent)).toBe(false);
  });
});

describe("getResultExtremes", () => {
  it("returns best as first and worst as last of scored list", () => {
    const scored: ScoredProfession[] = scoreTest(
      questions,
      { q1: 5, q2: 5 },
      professions,
    );
    const { best, worst } = getResultExtremes(scored);
    // analyst: всё положительное → 100%; agent: -2*2 + 1*2 = -2 из [-6; 6] → меньше
    expect(best.profession.id).toBe("analyst");
    expect(worst.profession.id).toBe("agent");
  });

  it("throws when scored list is empty", () => {
    expect(() => getResultExtremes([])).toThrow();
  });
});
