import { beforeEach, describe, expect, it } from "vitest";
import {
  STORAGE_KEY,
  clearProgress,
  loadProgress,
  saveProgress,
  type TestProgress,
} from "../src/lib/storage";

const progress: TestProgress = {
  testId: "t1",
  answers: { q1: 4, q2: null },
  currentIndex: 1,
  updatedAt: "2026-10-15T12:00:00.000Z",
};

beforeEach(() => {
  localStorage.clear();
});

describe("saveProgress/loadProgress", () => {
  it("round-trips saved progress", () => {
    saveProgress(progress);
    expect(loadProgress("t1")).toEqual(progress);
  });

  it("returns null when nothing saved", () => {
    expect(loadProgress("t1")).toBeNull();
  });

  it("returns null for corrupted JSON without throwing", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(loadProgress("t1")).toBeNull();
  });

  it("returns null when answers contain out-of-scale values", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        testId: "t1",
        answers: { q1: 8 },
        currentIndex: 0,
        updatedAt: "2026-10-15T12:00:00.000Z",
      }),
    );
    expect(loadProgress("t1")).toBeNull();
  });

  it("returns null when saved record belongs to another test", () => {
    saveProgress(progress);
    expect(loadProgress("other-test")).toBeNull();
  });
});

describe("clearProgress", () => {
  it("removes saved progress", () => {
    saveProgress(progress);
    clearProgress("t1");
    expect(loadProgress("t1")).toBeNull();
  });
});
