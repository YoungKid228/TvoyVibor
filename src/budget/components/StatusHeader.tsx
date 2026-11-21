import Icon from "./Icon";
import ScalePanel from "./ScalePanel";
import type { Scales } from "../core/types";

/**
 * Шапка игрового дня.
 *
 * Как на макете: тёмно-бордовая полоса, календарь, крупный «День N из 7»,
 * под ним «Неделя W • до ночи X ч», справа — кнопка выхода в меню. Под
 * заголовком — четыре карточки шкал, и они всегда на виду: игрок должен
 * видеть настроение, энергию, сытость и чистоту, не листая вниз.
 *
 * Отдельной кнопки «Правила» в игре нет: правила видны в меню, до которого
 * ведёт домик, — а в шапке остаётся один понятный выход.
 */

type Props = {
  /** Номер дня внутри режима. */
  day: number;
  /** Сколько дней в режиме. */
  days: number;
  /** Номер недели, начиная с нуля. */
  week: number;
  /** Сколько минут осталось до ночи. */
  minutesLeft: number;
  /** Шкалы игрока. */
  scales: Scales;
  /** Выход в меню. */
  onMenu: () => void;
};

export default function StatusHeader({
  day,
  days,
  week,
  minutesLeft,
  scales,
  onMenu,
}: Props) {
  return (
    <header className="z-20 shrink-0 bg-[#4a1f24] px-3 pb-2 pt-2 shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-2">
        <Icon name="ui/ui-day" alt="" size={30} className="flex-shrink-0" />
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight text-white">
            День {day} из {days}
          </h2>
          <p className="text-[11px] leading-tight text-rose-100">
            Неделя {week + 1} • до ночи {formatHours(minutesLeft)} ч
          </p>
        </div>
        <button
          type="button"
          onClick={onMenu}
          aria-label="В меню"
          title="В меню"
          className="ml-auto flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border-2 border-amber-100/40 bg-[#3a171b] text-amber-50 transition hover:bg-[#55242a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          <HomeIcon />
        </button>
      </div>

      <div className="mt-2">
        <ScalePanel scales={scales} />
      </div>
    </header>
  );
}

/**
 * Значок домика для выхода в меню.
 *
 * В наборе `src/assets/ui` такого знака нет, а рисовать новый PNG ради одной
 * кнопки — лишний арт в реестре иконок. Поэтому значок нарисован прямо
 * здесь: крыша, стена и дверь.
 */
function HomeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      <g fill="currentColor">
        <rect x="7" y="1" width="2" height="2" />
        <rect x="5" y="3" width="6" height="2" />
        <rect x="3" y="5" width="10" height="2" />
        <rect x="1" y="7" width="14" height="2" />
        <rect x="3" y="9" width="10" height="5" />
      </g>
      <rect x="6" y="10" width="4" height="4" fill="#3a171b" />
    </svg>
  );
}

/** Минуты до ночи — «17 ч». */
function formatHours(minutes: number): number {
  return Math.max(0, Math.round(minutes / 60));
}
