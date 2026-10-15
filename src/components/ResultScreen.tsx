import { getResultExtremes, type ScoredProfession } from "../lib/scoring";

type Props = {
  scored: ScoredProfession[];
  onRestart: () => void;
};

export default function ResultScreen({ scored, onRestart }: Props) {
  const { best, worst } = getResultExtremes(scored);
  const top = scored.slice(0, 3);

  return (
    <section data-testid="result-screen" aria-label="Результат теста">
      <h2 className="mb-1 text-xl font-semibold">Твой результат</h2>
      <p className="mb-6 text-sm text-slate-500">
        Показатель соответствия модели теста, а не научно доказанная
        вероятность успеха.
      </p>

      <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4">
        <p className="text-sm font-medium text-sky-800">
          Наиболее подходит: {best.profession.title}
        </p>
        <p className="mt-1 text-sm text-sky-900/80">
          {best.profession.description}
        </p>
      </div>

      <ol className="mb-6 flex flex-col gap-2">
        {top.map((s) => (
          <li
            key={s.profession.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
          >
            <span>{s.profession.title}</span>
            <span className="font-medium tabular-nums">{s.percent}%</span>
          </li>
        ))}
      </ol>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">
          Наименее подходит сейчас: {worst.profession.title}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Это не приговор: интересы могут измениться. Показатель отражает только
          соответствие твоих ответов модели этого теста.
        </p>
      </div>

      <button
        type="button"
        data-testid="restart-btn"
        onClick={onRestart}
        className="min-h-11 w-full rounded-lg bg-sky-600 px-6 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
      >
        Пройти заново
      </button>
    </section>
  );
}
