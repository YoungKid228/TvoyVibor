import { useMemo, useState } from "react";
import type { Program, Profession } from "../types/test";
import PixelCard from "../components/PixelCard";
import SpecialText from "../components/SpecialText";
import {
  profileDuration,
  profileForm,
  profileSummary,
  programSummary,
} from "../lib/profileCards";

type Props = {
  programs: Program[];
  professions: Profession[];
  onOpenProgram: (programId: string, profileName?: string) => void;
};

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
      : `Направленность: ${program.profiles[0]}`;
  }
  return `Направленности: ${program.profiles.join(" · ")}`;
}

export default function DirectionsPage({
  programs,
  professions,
  onOpenProgram,
}: Props) {
  const [selectedProfiles, setSelectedProfiles] = useState<
    Record<string, string>
  >({});

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

          /* Магистратура — один блок с переключением направленностей внутри */
          if (isMultiProfile) {
            const selected =
              selectedProfiles[program.id] ?? program.profiles[0];

            return (
              <div
                key={program.id}
                data-testid="program-card"
                className="rounded-lg focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-orange-500"
              >
                <PixelCard>
                  <span className="block text-xs text-orange-700">
                    {program.code} · {program.level}
                  </span>
                  <span className="mt-1 block font-medium">{program.title}</span>

                  <div
                    role="group"
                    aria-label="Направленности магистратуры"
                    className="mt-2 flex flex-col gap-2"
                  >
                    {program.profiles.map((profileName) => {
                      const active = profileName === selected;
                      const profile = program.profileDetails.find(
                        (p) => p.name === profileName,
                      );
                      const form = profile ? profileForm(profile) : null;
                      const duration = profile
                        ? profileDuration(program, profile)
                        : null;
                      const summary = profile
                        ? profileSummary(profile)
                        : null;
                      return (
                        <button
                          key={profileName}
                          type="button"
                          data-testid="directions-profile-switch"
                          aria-current={active ? "true" : undefined}
                          onClick={() =>
                            setSelectedProfiles((prev) => ({
                              ...prev,
                              [program.id]: profileName,
                            }))
                          }
                          className={`block w-full rounded-lg border-2 px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
                            active
                              ? "border-orange-500 bg-orange-100"
                              : "border-stone-300 bg-white hover:border-orange-300 hover:bg-orange-50"
                          }`}
                        >
                          <span
                            className={`block text-sm font-medium ${
                              active ? "text-orange-900" : "text-stone-800"
                            }`}
                          >
                            {profileName}
                          </span>
                          <span className="mt-0.5 block text-xs text-stone-500">
                            {form && (
                              <span>Форма обучения: {form.toLowerCase()}</span>
                            )}
                            {form && duration && <span> · </span>}
                            {duration && (
                              <span>Срок обучения: {duration}</span>
                            )}
                          </span>
                          {summary && (
                            <span className="mt-1 line-clamp-2 block text-xs text-stone-600">
                              {summary}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <span className="mt-1 block text-sm text-stone-500">
                    Профессий в галерее: {countByProgram.get(program.id) ?? 0}
                  </span>

                  <button
                    type="button"
                    data-testid="directions-open-program"
                    onClick={() => onOpenProgram(program.id, selected)}
                    className="mt-3 block w-full rounded-lg border-2 border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 transition-colors hover:border-orange-300 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
                  >
                    Открыть программу
                  </button>
                </PixelCard>
              </div>
            );
          }

          const summary = programSummary(program);

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
                {summary && (
                  <span className="mt-1 line-clamp-2 min-h-[2.5rem] block text-sm text-stone-600">
                    {summary}
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
