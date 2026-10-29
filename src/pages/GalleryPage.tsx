import { useMemo, useState } from "react";
import type { Profession, Program } from "../types/test";
import { programLabel } from "../lib/programLabel";
import { professionPhoto } from "../lib/professionPhotos";
import ProfessionCarousel from "../components/ProfessionCarousel";
import PixelCard from "../components/PixelCard";
import SpecialText from "../components/SpecialText";

type Props = {
  professions: Profession[];
  programs: Program[];
  onOpenProfession: (professionId: string) => void;
};

export default function GalleryPage({
  professions,
  programs,
  onOpenProfession,
}: Props) {
  const [query, setQuery] = useState("");
  const [programId, setProgramId] = useState<string>("all");

  const programById = useMemo(
    () => new Map(programs.map((p) => [p.id, p])),
    [programs],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return professions.filter((p) => {
      if (programId !== "all" && p.programId !== programId) return false;
      if (
        normalizedQuery &&
        !p.title.toLowerCase().includes(normalizedQuery)
      ) {
        return false;
      }
      return true;
    });
  }, [professions, query, programId]);

  return (
    <section aria-label="Галерея профессий">
      <SpecialText className="mb-1 text-2xl font-bold sm:text-3xl">
        Галерея профессий
      </SpecialText>
      <p className="mb-6 text-sm text-stone-500">
        Все профессии направления «Экономика» — с привязкой к программам
        подготовки.
      </p>

      <ProfessionCarousel
        professions={professions}
        programs={programs}
        onOpenProfession={onOpenProfession}
      />

      <div className="mb-4">
        <label htmlFor="profession-search" className="sr-only">
          Поиск профессии по названию
        </label>
        <input
          id="profession-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по названию…"
          className="min-h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Фильтр по программе подготовки">
        <button
          type="button"
          aria-pressed={programId === "all"}
          onClick={() => setProgramId("all")}
          className={`min-h-11 rounded-full border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
            programId === "all"
              ? "border-orange-500 bg-orange-500 text-white"
              : "border-stone-200 bg-white text-stone-700 hover:border-orange-400"
          }`}
        >
          Все
        </button>
        {programs.map((program) => (
          <button
            key={program.id}
            type="button"
            aria-pressed={programId === program.id}
            onClick={() => setProgramId(program.id)}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
              programId === program.id
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-stone-200 bg-white text-stone-700 hover:border-orange-400"
            }`}
          >
            {program.title} ({program.level})
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {filtered.map((profession) => {
          const photo = professionPhoto(profession.id);
          return (
          <PixelCard key={profession.id}>
            <button
              type="button"
              data-testid="profession-card"
              onClick={() => onOpenProfession(profession.id)}
              className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
            >
              {photo && (
                <img
                  src={photo}
                  alt={profession.title}
                  loading="lazy"
                  decoding="async"
                  className="mb-3 w-full rounded-lg object-cover"
                />
              )}
              <span className="block font-medium">{profession.title}</span>
              <span className="mt-1 block text-xs text-orange-700">
                {programLabel(programById.get(profession.programId))}
              </span>
              <span className="mt-1 block text-sm text-stone-500">
                {profession.description}
              </span>
            </button>
          </PixelCard>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-stone-500">
            По вашему запросу профессий не найдено.
          </p>
        )}
      </div>
    </section>
  );
}


