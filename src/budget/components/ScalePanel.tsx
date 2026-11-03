import type { Scales } from "../core/types";

/**
 * Панель шкал (HUD) — пять шкал, как в Talking Tom, но с финансовым смыслом.
 *
 * Шкала настроения помечена звёздочкой: это главная шкала игры.
 */

type ScaleKey = keyof Scales;

type ScaleDef = {
  key: ScaleKey;
  label: string;
  hint: string;
  /** Цвет заливки. */
  color: string;
  /** Основная ли шкала. */
  primary?: boolean;
};

const SCALES: ScaleDef[] = [
  {
    key: "mood",
    label: "Настроение",
    hint: "Шкала счастья: чем выше, тем больше смены платят.",
    color: "#f97316",
    primary: true,
  },
  {
    key: "energy",
    label: "Энергия",
    hint: "Хватит ли сил на смену. Восстанавливается сном.",
    color: "#0f766e",
  },
  {
    key: "hunger",
    label: "Сытость",
    hint: "Падает каждый день. Лечится продуктами и кафе.",
    color: "#ca8a04",
  },
  {
    key: "hygiene",
    label: "Гигиена",
    hint: "Падает каждый день. Лечится душем.",
    color: "#1d4ed8",
  },
  {
    key: "solomon",
    label: "Соломон",
    hint: "Настроение питомца. Растёт от ухода, падает без него.",
    color: "#b45309",
  },
];

type Props = {
  scales: Scales;
};

export default function ScalePanel({ scales }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {SCALES.map((scale) => (
        <ScaleBar
          key={scale.key}
          def={scale}
          value={scales[scale.key]}
        />
      ))}
    </div>
  );
}

function ScaleBar({ def, value }: { def: ScaleDef; value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="rounded-lg border border-stone-300 bg-white p-2"
      title={def.hint}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`text-xs ${def.primary ? "font-bold text-orange-700" : "text-stone-600"}`}
        >
          {def.label}
          {def.primary ? " ⭐" : ""}
        </span>
        <span className="font-mono text-xs tabular-nums text-stone-700">
          {clamped}
        </span>
      </div>
      <div
        className="mt-1 h-2.5 w-full overflow-hidden rounded border border-stone-300 bg-stone-100"
        role="progressbar"
        aria-label={def.label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full"
          style={{ width: `${clamped}%`, backgroundColor: def.color }}
        />
      </div>
    </div>
  );
}
