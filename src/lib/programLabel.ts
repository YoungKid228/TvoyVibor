type ProgramLike = {
  code: string;
  title: string;
  level: string;
  profiles?: string[];
};

/** Единая подпись программы подготовки: «38.02.07 · Банковское дело · СПО» */
export function programLabel(program: ProgramLike | undefined): string {
  if (!program) return "";
  const profile =
    program.profiles && program.profiles.length > 0
      ? ` — ${program.profiles[0]}`
      : "";
  return `${program.code} · ${program.title} · ${program.level}${profile}`;
}
