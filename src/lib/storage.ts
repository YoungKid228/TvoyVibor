import { SCALE_VALUES } from "../types/test";

export type TestProgress = {
  testId: string;
  answers: Record<string, number | null>;
  currentIndex: number;
  updatedAt: string;
};

export const STORAGE_KEY = "pgu-econ-progress-v2";

function isValidProgress(value: unknown): value is TestProgress {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.testId !== "string") return false;
  if (typeof v.answers !== "object" || v.answers === null) return false;
  for (const answer of Object.values(v.answers)) {
    if (
      answer !== null &&
      !SCALE_VALUES.includes(answer as (typeof SCALE_VALUES)[number])
    ) {
      return false;
    }
  }
  return (
    typeof v.currentIndex === "number" &&
    typeof v.updatedAt === "string"
  );
}

export function loadProgress(testId: string): TestProgress | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored == null) return null;
    const parsed: unknown = JSON.parse(stored);
    if (!isValidProgress(parsed) || parsed.testId !== testId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveProgress(p: TestProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // localStorage может быть недоступен (приватный режим/переполнение) — прогресс не критичен
  }
}

export function clearProgress(testId: string): void {
  try {
    const current = loadProgress(testId);
    if (current) localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
