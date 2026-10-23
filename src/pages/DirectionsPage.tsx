import { useMemo } from "react";
import type { Program, Profession } from "../types/test";
import PixelCard from "../components/PixelCard";
import SpecialText from "../components/SpecialText";

type Props = {
  programs: Program[];
  professions: Profession[];
  onOpenProgram: (programId: string) => void;
};

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
  if (program.costPerYearByForm) {
    parts.push(
      Object.entries(program.costPerYearByForm)
        .map(([form, cost]) => `${cost} (${form.toLowerCase()})`)
        .join(" · "),
    );
  } else if (program.costPerYear) {
    parts.push(program.costPerYear);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Название профиля дублирует название программы — не показываем его повторно */
function isProfileRedundant(program: Program, profile: string): boolean {
  const normalize = (s: string) =>
    s.replace(/\s*\(.*\)\s*/, "").replace(/ё/g, "е").trim().toLowerCase();
  return normalize(program.title) === normalize(profile);
}

/**
 * Краткая сводка по вариантам поступления для карточки направления:
 * «Очная: 20 бюджетных, 3 платных · Заочная: 15 платных».
 */
function formatAdmissionSummary(program: Program): string | null {
  const options = program.admissionOptions;
  if (!options || options.length === 0) return null;
  const byForm = new Map<string, string[]>();
  for (const option of options) {
    const places: string[] = [];
    if (option.budgetPlaces !== null) places.push(`${option.budgetPlaces} бюджетных`);
    if (option.paidPlaces !== null) places.push(`${option.paidPlaces} платных`);
    const key = option.form;
    const merged = byForm.get(key) ?? [];
    // Одна и та же форма может идти по двум базам — места перечисляем один раз
    const unique = places.filter((p) => !merged.includes(p));
    byForm.set(key, [...merged, ...unique]);
  }
  const parts: string[] = [];
  for (const [form, places] of byForm) {
    parts.push(
      places.length > 0
        ? `${form}: ${places.join(", ")}`
        : `${form}: срок уточняется`,
    );
  }
  return parts.length > 0 ? `Мест на 2026 год — ${parts.join(" · ")}` : null;
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
        {programs.map((program) => (
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
              <span className="mt-1 block text-sm text-stone-500">
                {formatProgramLine(program)}
              </span>
              {formatAdmissionSummary(program) && (
                <span className="mt-1 block text-sm text-stone-500">
                  {formatAdmissionSummary(program)}
                </span>
              )}
              <span className="mt-1 block text-sm text-stone-500">
                Профессий в галерее: {countByProgram.get(program.id) ?? 0}
              </span>
            </PixelCard>
          </button>
        ))}
      </div>
    </section>
  );
}
