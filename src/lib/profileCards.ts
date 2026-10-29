import type { Program, ProgramProfile } from "../types/test";

/** Одинаковая длина краткого описания направленности */
export const PROFILE_SUMMARY_LENGTH = 160;

/** Форма обучения направленности: «Очная» / «Заочная» */
export function profileForm(profile: ProgramProfile): string | null {
  const form = profile.forms?.[0];
  return form ? form : null;
}

/** Срок обучения по форме, заданной для направленности */
export function profileDuration(
  program: Program,
  profile: ProgramProfile,
): string | null {
  const form = profileForm(profile);
  if (form && program.durationByForm?.[form]) {
    return program.durationByForm[form];
  }
  return program.duration ?? null;
}

/**
 * Краткое описание направленности одинаковой длины:
 * текст обрезается по границе слова, лишнее скрывается многоточием.
 */
export function profileSummary(profile: ProgramProfile): string | null {
  const text = profile.description?.join(" ");
  if (!text) return null;
  return shorten(text);
}

/**
 * Краткое описание программы одинаковой длины —
 * для карточек направлений без отдельных профилей.
 */
export function programSummary(program: Program): string | null {
  const text = program.description?.join(" ");
  if (!text) return null;
  return shorten(text);
}

/** Обрезает текст до PROFILE_SUMMARY_LENGTH по границе слова */
function shorten(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= PROFILE_SUMMARY_LENGTH) return clean;

  const cut = clean.slice(0, PROFILE_SUMMARY_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
