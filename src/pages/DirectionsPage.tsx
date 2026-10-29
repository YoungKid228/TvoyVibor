import { useMemo } from "react";
import type { Program, Profession } from "../types/test";
import PixelCard from "../components/PixelCard";
import SpecialText from "../components/SpecialText";

type Props = {
  programs: Program[];
  professions: Profession[];
  onOpenProgram: (programId: string, profileName?: string) => void;
};

/** Одинаковая длина вступления для всех карточек профилей магистратуры */
const LEAD_LENGTH = 160;

/** Срок обучения и формы — без стоимости, мест и проходных баллов */
function formatProgramLine(program: Program): string | null {
  const parts: string[] = [];
  if (program.durationByForm) {
    parts.push(
      Object.entries(program.durationByForm)
        .map(([form, dur]) => `${dur} (${form.toLowerCase()})`)
        .join(" · "),
    );
  } else if (program.duration) {
    parts.push(program.duration);
    if (program.forms.length > 0) parts.push(program.forms.join(" / "));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Название профиля дублирует название программы — не показываем его повторно */
function isProfileRedundant(program: Program, profile: string): boolean {
  const normalize = (s: string) =>
    s.replace(/\s*\(.*\)\s*/, "").replace(/ё/g, "е").trim().toLowerCase();
  return normalize(program.title) === normalize(profile);
}

function formatProfilesLine(program: Program): string | null {
  if (program.profiles.length === 0) return null;
  if (program.profiles.length === 1) {
    return isProfileRedundant(program, program.profiles[0])
      ? null
      : `Профиль: ${program.profiles[0]}`;
  }
  return `Профили: ${program.profiles.join(" · ")}`;
}

/**
 * Короткое вступление профиля для карточки направления.
 * Длина у всех профилей одинаковая: текст набирается до LEAD_LENGTH
 * символов по границе слова, лишнее скрывается многоточием.
 */
function profileLead(program: Program, profileName: string): string | null {
  const profile = program.profileDetails.find((p) => p.name === profileName);
  const text = profile?.description?.join(" ");
  if (!text) return null;

  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= LEAD_LENGTH) return clean;

  const cut = clean.slice(0, LEAD_LENGTH);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export default function DirectionsPage({
  programs,
  professions,
  onOpenProgram,
}: Props) {
  const countByProgram = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of professions) {
      counts.set(p.programId, (counts.get(p.programId) ?? 0) + 1);
    }
    return counts;
  }, [professions]);

  return (
    <section aria-label="Направления подготовки">
      <SpecialText className="mb-1 text-2xl font-bold sm:text-3xl">
        Направления подготовки
      </SpecialText>
      <p className="mb-6 text-sm text-stone-500">
        Программы направления «Экономика» в ПГУ им. Шолом-Алейхема.
      </p>

      <div className="flex flex-col gap-6">
        {programs.map((program) => {
          const isMultiProfile = program.profiles.length > 1;

          /* Программа с несколькими профилями (магистратура) —
             каждый профиль получает собственный блок */
          if (isMultiProfile) {
            return (
              <div key={program.id} className="flex flex-col gap-4">
                {program.profiles.map((profileName) => {
                  const lead = profileLead(program, profileName);
                  const forms = program.profileDetails.find(
                    (p) => p.name === profileName,
                  )?.forms;
                  return (
                    <button
                      key={`${program.id}-${profileName}`}
                      type="button"
                      data-testid="program-card"
                      onClick={() => onOpenProgram(program.id, profileName)}
                      className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
                    >
                      <PixelCard>
                        <span className="block text-xs text-orange-700">
                          {program.code} · {program.level}
                        </span>
                        <span className="mt-1 block font-medium">{profileName}</span>
                        <span className="mt-1 block text-sm text-stone-500">
                          {program.title}
                          {forms && forms.length > 0
                            ? ` · ${forms.join(", ").toLowerCase()} форма`
                            : ""}
                        </span>
                        {lead && (
                          <span className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-stone-600">
                            {lead}
                          </span>
                        )}
                      </PixelCard>
                    </button>
                  );
                })}
              </div>
            );
          }

          return (
            <button
              key={program.id}
              type="button"
              data-testid="program-card"
              onClick={() => onOpenProgram(program.id)}
              className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
            >
              <PixelCard>
                <span className="block text-xs text-orange-700">
                  {program.code} · {program.level}
                </span>
                <span className="mt-1 block font-medium">{program.title}</span>
                {formatProfilesLine(program) && (
                  <span className="mt-1 block text-sm text-stone-500">
                    {formatProfilesLine(program)}
                  </span>
                )}
                {formatProgramLine(program) && (
                  <span className="mt-1 block text-sm text-stone-500">
                    {formatProgramLine(program)}
                  </span>
                )}
                <span className="mt-1 block text-sm text-stone-500">
                  Профессий в галерее: {countByProgram.get(program.id) ?? 0}
                </span>
              </PixelCard>
            </button>
          );
        })}
      </div>
    </section>
  );
}
