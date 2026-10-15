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
    title: "Аналитик",
    description: "",
  },
  {
    id: "agent",
    directionId: "d1",
    title: "Агент",
    description: "",
  },
];

const questions: Question[] = [
  {
    id: "q1",
    text: "Q1",
    professionGroupId: "analyst",
    options: [
      { id: "q1-a", label: "A", scores: { analyst: 3, agent: 1 } },
      { id: "q1-b", label: "B", scores: { agent: 3 } },
    ],
  },
  {
    id: "q2",
    text: "Q2",
    professionGroupId: "agent",
    options: [
      { id: "q2-a", label: "A", scores: { agent: 2, analyst: 2 } },
      { id: "q2-b", label: "B", scores: { analyst: 1 } },
    ],
  },
];

describe("scoreTest", () => {
  it("sums raw and max scores per profession across answered questions", () => {
    const scored = scoreTest(questions, { q1: "q1-a", q2: "q2-b" }, professions);
    const analyst = scored.find((s) => s.profession.id === "analyst")!;
    const agent = scored.find((s) => s.profession.id === "agent")!;
    // analyst: raw = 3 + 1 = 4; max = (3 from q1) + (2 from q2) = 5
    expect(analyst.raw).toBe(4);
    expect(analyst.max).toBe(5);
    // agent: raw = 1 + 0 = 1; max = (3 from q1... q1 options: agent max 3) + (2 from q2) = 5
    expect(agent.raw).toBe(1);
    expect(agent.max).toBe(5);
    expect(analyst.percent).toBe(80);
    expect(agent.percent).toBe(20);
  });

  it("excludes skipped questions from both raw and max", () => {
    const scored = scoreTest(questions, { q1: "q1-a", q2: null }, professions);
    const analyst = scored.find((s) => s.profession.id === "analyst")!;
    expect(analyst.raw).toBe(3);
    expect(analyst.max).toBe(3);
    expect(analyst.percent).toBe(100);
  });

  it("treats unknown option id as skipped", () => {
    const scored = scoreTest(questions, { q1: "no-such-option", q2: "q2-a" }, professions);
    const agent = scored.find((s) => s.profession.id === "agent")!;
    // q1 skipped for everyone: agent raw = 2 (q2), max = 2 (q2)
    expect(agent.raw).toBe(2);
    expect(agent.max).toBe(2);
  });

  it("breaks ties by professions.json order", () => {
    const q3: Question = {
      id: "q3",
      text: "Q3",
      professionGroupId: "analyst",
      options: [{ id: "q3-a", label: "A", scores: { analyst: 5, agent: 5 } }],
    };
    const scored = scoreTest([q3], { q3: "q3-a" }, professions);
    expect(scored[0].profession.id).toBe("analyst");
    expect(scored[1].profession.id).toBe("agent");
  });

  it("returns percent 0 (not NaN) when max is 0", () => {
    const qLonely: Question = {
      id: "ql",
      text: "QL",
      professionGroupId: "analyst",
      options: [{ id: "ql-a", label: "A", scores: { analyst: 5 } }],
    };
    const scored = scoreTest([qLonely], { ql: "ql-a" }, professions);
    const agent = scored.find((s) => s.profession.id === "agent")!;
    expect(agent.max).toBe(0);
    expect(agent.percent).toBe(0);
    expect(Number.isNaN(agent.percent)).toBe(false);
  });

  it("sorts by percent descending", () => {
    const scored = scoreTest(questions, { q1: "q1-a", q2: "q2-b" }, professions);
    expect(scored[0].percent).toBeGreaterThanOrEqual(scored[1].percent);
  });
});

describe("getResultExtremes", () => {
  it("returns best as first and worst as last of scored list", () => {
    const scored: ScoredProfession[] = scoreTest(
      questions,
      { q1: "q1-a", q2: "q2-b" },
      professions,
    );
    const { best, worst } = getResultExtremes(scored);
    expect(best.profession.id).toBe("analyst");
    expect(worst.profession.id).toBe("agent");
  });
});
