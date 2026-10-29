import { useMemo, useState } from "react";
import TestCard from "../components/TestCard";
import { loadProgress } from "../lib/storage";
import type { Audience, CareerTest, Direction } from "../types/test";

type Props = {
  tests: CareerTest[];
  directions: Direction[];
  onSelect: (testId: string) => void;
};

const audienceLabels: Record<Audience, string> = {
  school: "Я школьник (9–11 класс)",
  college_or_bachelor: "Я студент СПО / бакалавриата / магистратуры",
};

import SpecialText from "../components/SpecialText";

export default function HomePage({
  tests,
  directions,
  onSelect,
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

      <h3 className="mb-3 text-base font-medium text-stone-700">
        Доступные тесты
      </h3>
      {activeDirections.length === 1 && (
        <p className="mb-3 text-sm text-stone-500">
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
    </section>
  );
}
