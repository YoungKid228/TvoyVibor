import type { Scales } from "../core/types";
import Icon from "./Icon";

/**
 * Панель шкал (HUD) — четыре шкалы.
 *
 * Настроение и чистота общие у игрока и Соломона: счастье здесь одно,
 * и грязь тоже одна. Шкала настроения помечена — это главная шкала игры.
 */

type ScaleKey = keyof Scales;

type ScaleDef = {
  key: ScaleKey;
  label: string;
  /** Короткая подпись для плитки HUD: места на шесть шкал в ряд мало. */
  short: string;
  hint: string;
  /** Цвет заливки. */
  color: string;
  /** Основная ли шкала. */
  primary?: boolean;
  /** Путь к иконке. */
  icon: string;
  /**
   * Иконка, зависящая от значения шкалы. Нужна настроению Соломона:
   * чем он довольнее, тем «теплее» сердечко.
   */
  iconByValue?: (value: number) => string;
};

const SCALES: ScaleDef[] = [
  {
    key: "mood",
    label: "Настроение",
    short: "Настр.",
    hint: "Шкала счастья: чем выше, тем больше смены платят.",
    color: "#f97316",
    primary: true,
    icon: "ui/mood",
    // Сердечко теплеет вместе с настроением.
    iconByValue: (v) => (v >= 85 ? "ui/heart-3" : v >= 67 ? "ui/heart-2" : "ui/heart-1"),
  },
  {
    key: "energy",
    label: "Энергия",
    short: "Энерг.",
    hint: "Хватит ли сил на смену. Восстанавливается сном.",
    color: "#0f766e",
    icon: "ui/energy",
  },
  {
    key: "hunger",
    label: "Сытость",
    short: "Сытость",
    hint: "Падает каждый день. Лечится продуктами и кафе.",
    color: "#ca8a04",
    icon: "ui/hunger",
  },
  {
    key: "cleanliness",
    label: "Чистота",
    short: "Чистота",
    hint: "Общая чистота: игрок и Соломон. Падает на 15 в день. Мытьё — 200 ₽.",
    color: "#1d4ed8",
    icon: "ui/spend-shower",
  },
];

type Props = {
  scales: Scales;
};

export default function ScalePanel({ scales }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
      <div className="flex items-baseline justify-between gap-1">
        <span className="flex min-w-0 items-center gap-1">
          <Icon
            name={def.iconByValue ? def.iconByValue(clamped) : def.icon}
            alt=""
            size={14}
            className="flex-shrink-0"
          />
          <span
            className={`text-[11px] leading-tight ${
              def.primary ? "font-bold text-orange-700" : "text-stone-600"
            }`}
          >
            {def.short}
          </span>
        </span>
        <span className="shrink-0 font-mono text-xs tabular-nums text-stone-700">
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
