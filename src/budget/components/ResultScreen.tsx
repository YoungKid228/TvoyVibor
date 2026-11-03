import PixelButton from "../../components/PixelButton";
import { stats } from "../core/evaluation";
import { recommendations } from "../core/recommendations";
import type { GameState } from "../core/types";

/**
 * Итог недели: две оценки, общий вердикт, разбор расходов и график настроения.
 *
 * Это то, что игрок уносит с урока: не «сколько осталось», а «из чего это
 * сложилось» — и вывод, что деньги и счастье конфликтуют.
 */

type Props = {
  state: GameState;
  onRestart: () => void;
  onMenu: () => void;
};

export default function ResultScreen({ state, onRestart, onMenu }: Props) {
  const s = stats(state);
  const tips = recommendations(state);

  return (
    <section aria-label="Финансовый итог" className="flex flex-col gap-4">
      <header className="rounded-xl border border-stone-300 bg-white p-4 shadow-[3px_3px_0_#d6d3d1]">
        <h2 className="text-xl font-bold text-stone-900">
          Итог недели: {s.verdict}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <GradeCard
            title="Оценка по деньгам"
            value={`${s.finalBalance.toLocaleString("ru-RU")} ₽`}
            grade={s.moneyGrade}
          />
          <GradeCard
            title="Оценка по счастью"
            value={`${s.avgSolomon.toFixed(1)}`}
            grade={s.solomonGrade}
          />
          <GradeCard
            title="Ваше настроение"
            value={`${s.avgMood.toFixed(1)}`}
            grade={s.moodGrade}
          />
        </div>
      </header>

      <MoodChart state={state} />

      <section
        aria-label="Проверка расходов"
        className="rounded-xl border border-stone-300 bg-white p-4 shadow-[3px_3px_0_#d6d3d1]"
      >
        <h3 className="text-lg font-bold text-stone-900">Проверка расходов</h3>
        <p className="mt-1 text-sm text-stone-700">{s.audit.verdict}</p>
        <ul className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
          <AuditRow
            ok={s.audit.obligatoryCovered}
            label="Обязательные расходы покрыты"
          />
          <AuditRow ok={s.audit.noDebt} label="Нет долга" />
          <AuditRow ok={s.audit.hasSavings} label="Есть подушка (≥ 2 000 ₽)" />
          <AuditRow
            ok={s.audit.walletNotEmpty}
            label="В кошельке остались деньги"
          />
          <AuditRow
            ok={s.audit.optionalShare <= 0.6}
            label={`Доля необязательных трат ${Math.round(
              s.audit.optionalShare * 100,
            )} % (ориентир ≤ 60 %)`}
          />
        </ul>

        <h4 className="mt-4 text-sm font-bold text-stone-700">
          Из чего сложились расходы
        </h4>
        <ul className="mt-1 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
          {Object.entries(s.audit.byCategory).map(([key, value]) => (
            <li
              key={key}
              className="flex justify-between gap-3 border-b border-stone-100 py-1"
            >
              <span className="text-stone-600">{key}</span>
              <span className="font-mono tabular-nums text-stone-800">
                {value.toLocaleString("ru-RU")} ₽
              </span>
            </li>
          ))}
          <li className="flex justify-between gap-3 border-b border-stone-100 py-1 font-bold">
            <span className="text-stone-700">Доход</span>
            <span className="font-mono tabular-nums text-emerald-700">
              {s.income.toLocaleString("ru-RU")} ₽
            </span>
          </li>
          <li className="flex justify-between gap-3 border-b border-stone-100 py-1 font-bold">
            <span className="text-stone-700">Расход</span>
            <span className="font-mono tabular-nums text-rose-700">
              {s.expenses.toLocaleString("ru-RU")} ₽
            </span>
          </li>
        </ul>
      </section>

      <section
        aria-label="Рекомендации"
        className="rounded-xl border border-stone-300 bg-white p-4 shadow-[3px_3px_0_#d6d3d1]"
      >
        <h3 className="text-lg font-bold text-stone-900">
          Что стоит изменить
        </h3>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-stone-700">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        <PixelButton
          type="button"
          variant="primary"
          onClick={onRestart}
          className="min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          Сыграть заново
        </PixelButton>
        <PixelButton
          type="button"
          onClick={onMenu}
          className="min-h-11 px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          В главное меню
        </PixelButton>
      </div>
    </section>
  );
}

function GradeCard({
  title,
  value,
  grade,
}: {
  title: string;
  value: string;
  grade: string;
}) {
  return (
    <div className="rounded-lg border border-stone-300 bg-stone-50 p-3">
      <div className="text-xs text-stone-500">{title}</div>
      <div className="font-mono text-2xl font-bold tabular-nums text-stone-900">
        {value}
      </div>
      <div className="text-sm font-medium text-orange-800">{grade}</div>
    </div>
  );
}

function AuditRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className={ok ? "text-emerald-700" : "text-rose-700"}>
        {ok ? "✓" : "✗"}
      </span>
      <span className={ok ? "text-stone-700" : "font-medium text-rose-800"}>
        {label}
      </span>
    </li>
  );
}

/** График настроения по дням — простой SVG без зависимостей. */
function MoodChart({ state }: { state: GameState }) {
  const width = 320;
  const height = 90;
  const points = state.log.map((entry, index) => {
    const x =
      state.log.length === 1
        ? width / 2
        : (index / (state.log.length - 1)) * (width - 8) + 4;
    const y = height - 6 - (Math.max(0, Math.min(100, entry.mood)) / 100) * (height - 12);
    return { x, y, mood: entry.mood, day: entry.day };
  });
  return (
    <section
      aria-label="Настроение по дням"
      className="rounded-xl border border-stone-300 bg-white p-4 shadow-[3px_3px_0_#d6d3d1]"
    >
      <h3 className="text-lg font-bold text-stone-900">Настроение по дням</h3>
      {points.length > 1 ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mt-2 w-full max-w-md"
          role="img"
          aria-label={`График настроения: ${points
            .map((p) => `день ${p.day} — ${p.mood}`)
            .join(", ")}`}
        >
          <polyline
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#f97316"
            strokeWidth={2}
          />
          {points.map((p) => (
            <circle key={p.day} cx={p.x} cy={p.y} r={2.5} fill="#c2410c" />
          ))}
        </svg>
      ) : (
        <p className="text-sm text-stone-500">Недостаточно данных.</p>
      )}
    </section>
  );
}
