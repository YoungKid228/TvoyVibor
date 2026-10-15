import { useMemo, useState } from "react";
import TestCard from "../components/TestCard";
import { loadProgress } from "../lib/storage";
import type { Audience, CareerTest } from "../types/test";

type Props = {
  tests: CareerTest[];
  onSelect: (testId: string) => void;
};

const audienceLabels: Record<Audience, string> = {
  school: "Я школьник (9–11 класс)",
  college_or_bachelor: "Я студент СПО / бакалавриата / магистратуры",
};

export default function HomePage({ tests, onSelect }: Props) {
  const [audience, setAudience] = useState<Audience>("school");

  const audienceTests = useMemo(
    () => tests.filter((t) => t.audience === audience),
    [tests, audience],
  );

  return (
    <section aria-label="Выбор теста">
      <h2 className="mb-1 text-xl font-semibold">Выбери свой вариант теста</h2>
      <p className="mb-4 text-sm text-slate-500">
        Ответь на 20 вопросов — и увидишь, какие профессии направления
        «Экономика» тебе ближе всего.
      </p>

      <fieldset className="mb-6">
        <legend className="mb-2 text-sm font-medium text-slate-700">
          Кто ты?
        </legend>
        <div className="flex flex-col gap-2">
          {(Object.keys(audienceLabels) as Audience[]).map((a) => (
            <label
              key={a}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-600 has-checked:border-sky-600 has-checked:bg-sky-50"
            >
              <input
                type="radio"
                name="audience"
                value={a}
                checked={audience === a}
                onChange={() => setAudience(a)}
                className="accent-sky-600"
              />
              {audienceLabels[a]}
            </label>
          ))}
        </div>
      </fieldset>

      <h3 className="mb-2 text-sm font-medium text-slate-700">
        Доступные тесты
      </h3>
      <div className="flex flex-col gap-2">
        {audienceTests.map((test) => (
          <TestCard
            key={test.id}
            test={test}
            hasProgress={loadProgress(test.id) != null}
            onStart={() => onSelect(test.id)}
          />
        ))}
        {audienceTests.length === 0 && (
          <p className="text-sm text-slate-500">
            Для этой аудитории тесты пока не добавлены.
          </p>
        )}
      </div>
    </section>
  );
}
