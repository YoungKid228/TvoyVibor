import { useMemo, useState } from "react";
import TestCard from "../components/TestCard";
import PixelButton from "../components/PixelButton";
import PixelCard from "../components/PixelCard";
import { loadProgress } from "../lib/storage";
import type {
  Audience,
  CareerTest,
  Direction,
  Profession,
  ProfessionTest,
} from "../types/test";

type Props = {
  tests: CareerTest[];
  directions: Direction[];
  professions: Profession[];
  professionTests: ProfessionTest[];
  onSelect: (testId: string) => void;
  onSelectProfessionTest: (professionId: string) => void;
};

const audienceLabels: Record<Audience, string> = {
  school: "Я школьник (9–11 класс)",
  college_or_bachelor: "Я студент СПО / бакалавриата / магистратуры",
};

import SpecialText from "../components/SpecialText";

export default function HomePage({
  tests,
  directions,
  professions,
  professionTests,
  onSelect,
  onSelectProfessionTest,
}: Props) {
  const [audience, setAudience] = useState<Audience>("school");

  const audienceTests = useMemo(
    () => tests.filter((t) => t.audience === audience),
    [tests, audience],
  );

  const activeDirections = useMemo(() => {
    const ids = new Set(audienceTests.map((t) => t.directionId));
    return directions.filter((d) => ids.has(d.id));
  }, [audienceTests, directions]);

  const professionById = useMemo(
    () => new Map(professions.map((p) => [p.id, p])),
    [professions],
  );

  const [showAllProfessionTests, setShowAllProfessionTests] = useState(false);
  const visibleProfessionTests = showAllProfessionTests
    ? professionTests
    : professionTests.slice(0, 6);

  return (
    <section aria-label="Выбор теста">
      <SpecialText className="mb-1 text-2xl font-bold sm:text-3xl">
        Выбери свой вариант теста
      </SpecialText>
      <p className="mb-6 text-sm text-stone-500">
        Ответь на 20 вопросов — и увидишь, какие профессии направления
        «Экономика» тебе ближе всего.
      </p>

      <fieldset className="mb-6">
        <legend className="mb-2 text-sm font-medium text-stone-700">
          Кто ты?
        </legend>
        <div className="flex flex-col gap-2">
          {(Object.keys(audienceLabels) as Audience[]).map((a) => (
            <label
              key={a}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-orange-500 has-checked:border-orange-500 has-checked:bg-orange-50"
            >
              <input
                type="radio"
                name="audience"
                value={a}
                checked={audience === a}
                onChange={() => setAudience(a)}
                className="accent-orange-500"
              />
              {audienceLabels[a]}
            </label>
          ))}
        </div>
      </fieldset>

      <h3 className="mb-2 text-base font-medium text-stone-700">
        Доступные тесты
      </h3>
      {activeDirections.length === 1 && (
        <p className="mb-2 text-sm text-stone-500">
          Направление: {activeDirections[0].title}
        </p>
      )}
      <div className="flex flex-col gap-6">
        {audienceTests.map((test) => (
          <TestCard
            key={test.id}
            test={test}
            hasProgress={loadProgress(test.id) != null}
            onStart={() => onSelect(test.id)}
          />
        ))}
      </div>

      <div
        aria-hidden="true"
        className="my-8 border-t-4 border-dashed border-orange-200"
      />

      <section aria-label="Тесты по профессиям">
        <SpecialText className="mb-1 text-2xl font-bold sm:text-3xl">
          Тесты по профессиям
        </SpecialText>
        <p className="mb-6 text-sm text-stone-500">
          10 вопросов про реальные рабочие задачи каждой профессии — и честный
          ответ, насколько она тебе подходит (от 10 до 50 баллов).
        </p>

        <div className="flex flex-col gap-4">
          {visibleProfessionTests.map((pt) => {
            const profession = professionById.get(pt.professionId);
            if (!profession) return null;
            return (
              <button
                key={pt.professionId}
                type="button"
                data-testid="profession-test-card"
                onClick={() => onSelectProfessionTest(pt.professionId)}
                className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
              >
                <PixelCard bg="#fff7ed">
                  <span className="block font-medium">{profession.title}</span>
                  <span className="mt-1 block text-sm text-stone-500">
                    10 вопросов · шкала склонности
                  </span>
                </PixelCard>
              </button>
            );
          })}
        </div>

        {professionTests.length > 6 && (
          <PixelButton
            type="button"
            data-testid="toggle-profession-tests"
            onClick={() => setShowAllProfessionTests((v) => !v)}
            className="min-h-11 w-full px-4 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
            style={{ marginTop: 16 }}
          >
            {showAllProfessionTests
              ? "Свернуть список"
              : `Показать все тесты (${professionTests.length})`}
          </PixelButton>
        )}
      </section>
    </section>
  );
}
