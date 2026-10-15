import { describe, expect, it } from "vitest";
import directions from "../src/data/directions.json";
import professionsData from "../src/data/professions.json";
import testsData from "../src/data/tests.json";
import type { CareerTest, Profession, Question } from "../src/types/test";

const professions = professionsData as Profession[];
const { questions, tests } = testsData as {
  questions: Question[];
  tests: CareerTest[];
};

const questionById = new Map(questions.map((q) => [q.id, q]));
const professionIds = new Set(professions.map((p) => p.id));
const directionIds = new Set(directions.map((d) => d.id));

function uniqueIds(ids: string[]): boolean {
  return new Set(ids).size === ids.length;
}

describe("data integrity", () => {
  it("every published test has exactly 20 existing questions", () => {
    for (const test of tests) {
      expect(test.questionIds, test.id).toHaveLength(20);
      for (const qid of test.questionIds) {
        expect(questionById.has(qid), `${test.id}: ${qid}`).toBe(true);
      }
    }
  });

  it("all ids are unique within their sets", () => {
    expect(uniqueIds(questions.map((q) => q.id))).toBe(true);
    expect(uniqueIds(tests.map((t) => t.id))).toBe(true);
    expect(uniqueIds(professions.map((p) => p.id))).toBe(true);
    expect(uniqueIds(directions.map((d) => d.id))).toBe(true);
    for (const q of questions) {
      expect(uniqueIds(q.options.map((o) => o.id)), q.id).toBe(true);
    }
  });

  it("every profession id in option scores exists", () => {
    for (const q of questions) {
      for (const o of q.options) {
        for (const pid of Object.keys(o.scores)) {
          expect(professionIds.has(pid), `${q.id}/${o.id}: ${pid}`).toBe(true);
        }
      }
    }
  });

  it("every test references an existing direction and covers both audiences", () => {
    const audiences = new Set<string>();
    for (const test of tests) {
      expect(directionIds.has(test.directionId), test.id).toBe(true);
      audiences.add(test.audience);
    }
    expect(audiences.has("school")).toBe(true);
    expect(audiences.has("college_or_bachelor")).toBe(true);
  });

  it("every question has at least 2 options", () => {
    for (const q of questions) {
      expect(q.options.length, q.id).toBeGreaterThanOrEqual(2);
    }
  });
});
