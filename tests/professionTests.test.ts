import { describe, expect, it } from "vitest";
import professionTestsData from "../src/data/professionTests.json";
import professionsData from "../src/data/professions.json";
import {
  PROF_TEST_LEVEL_META,
  scoreProfessionTest,
} from "../src/lib/professionTestScoring";
import type { Profession, ProfessionTest } from "../src/types/test";

const professions = professionsData as Profession[];
const tests = (professionTestsData as { tests: ProfessionTest[] }).tests;

describe("scoreProfessionTest", () => {
  it("sums 1..5 points per answer", () => {
    expect(scoreProfessionTest([1, 2, 3, 4, 5]).total).toBe(15);
    expect(scoreProfessionTest([5, 5, 5, 5, 5]).total).toBe(25);
    expect(scoreProfessionTest([1, 1, 1, 1, 1]).total).toBe(5);
  });

  it("reverses reverse-worded questions (6 − answer)", () => {
    expect(scoreProfessionTest([5], [true]).total).toBe(1);
    expect(scoreProfessionTest([1], [true]).total).toBe(5);
    expect(scoreProfessionTest([3], [true]).total).toBe(3);
  });

  it("maps totals to low/medium/high levels", () => {
    expect(scoreProfessionTest(Array(10).fill(1)).total).toBe(10);
    expect(scoreProfessionTest(Array(10).fill(1)).level).toBe("low");
    expect(scoreProfessionTest(Array(10).fill(2)).level).toBe("low");
    expect(scoreProfessionTest(Array(10).fill(3)).level).toBe("medium");
    expect(scoreProfessionTest(Array(10).fill(5)).level).toBe("high");
    // границы: 23 / 24 и 37 / 38
    expect(scoreProfessionTest([...Array(9).fill(2), 5]).level).toBe("low");
    expect(scoreProfessionTest([...Array(9).fill(2), 6 - 1]).level).toBe("low");
    expect(scoreProfessionTest([...Array(9).fill(3), 1]).level).toBe("medium");
    expect(scoreProfessionTest([...Array(9).fill(4), 1]).level).toBe("medium");
    expect(scoreProfessionTest([...Array(9).fill(4), 2]).level).toBe("high");
  });

  it("documents level meta for all three levels", () => {
    for (const level of ["low", "medium", "high"] as const) {
      expect(PROF_TEST_LEVEL_META[level].title).toBeTruthy();
      expect(PROF_TEST_LEVEL_META[level].description).toBeTruthy();
    }
  });
});

describe("profession tests data integrity", () => {
  it("has a test for every published profession", () => {
    expect(tests).toHaveLength(professions.length);
    const ids = new Set(tests.map((t) => t.professionId));
    for (const p of professions) {
      expect(ids.has(p.id), p.id).toBe(true);
    }
  });

  it("every test has exactly 10 non-empty unique questions", () => {
    for (const t of tests) {
      expect(t.questions, t.professionId).toHaveLength(10);
      for (const q of t.questions) {
        expect(q.length, `${t.professionId}: ${q}`).toBeGreaterThan(20);
      }
      expect(new Set(t.questions).size, t.professionId).toBe(10);
    }
  });
});
