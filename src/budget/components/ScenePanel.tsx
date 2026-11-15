import Icon from "./Icon";
import SolomonSprite, { dirtLabel } from "./SolomonSprite";
import { iconUrl } from "../../assets/ui/icons";
import type { Location } from "../core/types";

/**
 * Сцена дня: фон локации, на ней Соломон и кнопки-переключатели.
 *
 * Фоны приходят без персонажа (`src/assets/backgrounds/loc-*.png`), поэтому
 * спрайт ставится поверх по координатам локации: точка стояния подобрана по
 * макетам в `backgrounds/preview- того как должно быть`.
 *
 * Кнопки вкладок живут прямо на кадре — как на макете: одна сверху слева и
 * столбик справа. Они же переключают локацию: «Заработать» открывает город,
 * «Потратить» — Арбат, «Соломон» — ванную.
 */

/** Вкладки действий — они же переключатели локаций. */
export type SceneTab = "work" | "spend" | "solomon";

type TabButton = {
  id: SceneTab;
  label: string;
  icon: string;
  /** Место кнопки на кадре — как на макете сцены. */
  spot: { left: string; top: string; width: string; height: string };
};

/**
 * Раскладка кнопок по кадру.
 *
 * Справа в столбик — три вкладки: «Потратить», «Соломон», «Заработать».
 * Правая колонка начинается с 70 % ширины, а персонаж нигде не доходит до
 * этих 70 %, поэтому кнопки не наезжают на белку.
 *
 * Слева сверху — сон и часы рядом с ним: сон закрывает день, поэтому он
 * должен быть на виду всегда, а часы показывают, сколько времени осталось.
 */
const TAB_BUTTONS: TabButton[] = [
  {
    id: "spend",
    label: "Потратить",
    icon: "ui/tab-spend",
    spot: { left: "70%", top: "4%", width: "26.5%", height: "20%" },
  },
  {
    id: "solomon",
    label: "Соломон",
    icon: "ui/tab-pet",
    spot: { left: "70%", top: "33.5%", width: "26.5%", height: "20%" },
  },
  {
    id: "work",
    label: "Заработать",
    icon: "ui/tab-earn",
    spot: { left: "70%", top: "62%", width: "26.5%", height: "20%" },
  },
];

/** Сон: закрывает день, поэтому живёт слева сверху и виден всегда. */
const SLEEP_SPOT = {
  left: "2%",
  top: "2%",
  width: "18%",
  height: "15%",
};

/** Часы — рядом со сном, справа от него. */
const CLOCK_SPOT = { left: "21%", top: "2%", width: "20%", height: "15%" };

/**
 * Доля высоты канваса спрайта, которую занимает сам персонаж.
 *
 * В подготовленном спрайте холст 300×340, а белка занимает 236×296:
 * 296/340 ≈ 0.87 высоты и 236/300 ≈ 0.79 ширины. Отсюда — обратный
 * пересчёт: сколько процентов высоты сцены должен занимать канвас, чтобы
 * персонаж был нужного размера.
 */
const CHARACTER_TO_CANVAS = 296 / 340;
/** Отступ от низа канваса до ног персонажа — 12 пикселей из 340. */
const FEET_OFFSET = 12 / 340;

type Props = {
  /** Локация, которую показываем. */
  location: Location;
  /** Настроение Соломона, 0…100. */
  mood: number;
  /** Чистота Соломона, 0…100. */
  cleanliness: number;
  /** Активная вкладка. */
  tab: SceneTab;
  /** Переключение вкладки (= смена локации). */
  onTab: (tab: SceneTab) => void;
  /** Текущее время суток, минуты от 00:00. */
  clock: number;
  /** Короткая подпись того, чем занят игрок сейчас. */
  phaseLabel: string;
  /** Заблокированы ли переключатели (открыто событие). */
  disabled?: boolean;
  /** Доступен ли сон (иначе кнопка показывает причину). */
  canSleep: boolean;
  /** Почему сон недоступен. */
  sleepHint?: string | null;
  /** Нажатие «Поспать» — открывает подтверждение. */
  onSleep: () => void;
};

/**
 * Часы в виде «09:40».
 *
 * Функция не экспортируется: файл с компонентом и посторонним экспортом
 * ломает горячую перезагрузку Vite (Fast Refresh) — страница перезагружается
 * целиком при каждой правке сцены.
 */
function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function ScenePanel({
  location,
  mood,
  cleanliness,
  tab,
  onTab,
  clock,
  phaseLabel,
  disabled = false,
  canSleep,
  sleepHint = null,
  onSleep,
}: Props) {
  const background = iconUrl(location.background);
  const spot = location.character;
  // Канвас спрайта должен быть чуть выше персонажа — иначе тот обрежется.
  const canvasHeight = spot.height / CHARACTER_TO_CANVAS;
  const feet = FEET_OFFSET * canvasHeight;

  return (
    <section
      aria-label={`Сцена: ${location.label}`}
      className="relative w-full overflow-hidden rounded-xl border-2 border-stone-700 bg-stone-800 shadow-[3px_3px_0_#a8a29e]"
      style={{ aspectRatio: "3 / 2" }}
    >
      {background && (
        <img
          src={background}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      )}

      {/* Соломон стоит на сцене: поза по настроению, вид — по чистоте. */}
      <div
        className="absolute aspect-square"
        style={{
          height: `${canvasHeight}%`,
          bottom: `${100 - spot.y - feet}%`,
          left: `${spot.x}%`,
          transform: "translateX(-50%)",
        }}
      >
        <SolomonSprite
          mood={mood}
          cleanliness={cleanliness}
          height={340}
          className="h-full w-full"
        />
      </div>

      {/* Кнопки-переключатели локаций — прямо на кадре. */}
      {TAB_BUTTONS.map((button) => {
        const active = button.id === tab;
        return (
          <button
            key={button.id}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onTab(button.id)}
            className={`absolute flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border-2 px-1 py-1 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? "border-orange-400 bg-orange-500/90 text-white shadow-[0_0_0_2px_rgba(0,0,0,0.35)]"
                : "border-stone-800/70 bg-stone-900/70 text-stone-50 hover:bg-stone-800/85"
            }`}
            style={{
              left: button.spot.left,
              top: button.spot.top,
              width: button.spot.width,
              height: button.spot.height,
            }}
          >
            <Icon
              name={button.icon}
              alt=""
              size={22}
              className="flex-shrink-0"
            />
            <span className="text-[11px] font-bold leading-tight">
              {button.label}
            </span>
          </button>
        );
      })}

      {/* Сон: кнопка всегда на виду — она закрывает день. */}
      <button
        type="button"
        onClick={onSleep}
        disabled={!canSleep}
        title={sleepHint ?? "Закончить день сном"}
        className="absolute flex min-h-11 items-center justify-center gap-1 rounded-lg border-2 border-stone-800/70 bg-stone-900/75 px-2 text-[11px] font-bold leading-tight text-stone-50 transition hover:bg-stone-800/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          left: SLEEP_SPOT.left,
          top: SLEEP_SPOT.top,
          width: SLEEP_SPOT.width,
          height: SLEEP_SPOT.height,
        }}
      >
        <Icon name="ui/ui-clock" alt="" size={18} className="flex-shrink-0" />
        <span>Поспать</span>
      </button>

      {/* Часы: сколько времени в сутках и чем занят игрок. */}
      <div
        className="absolute flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-stone-800/70 bg-stone-900/70 px-1 py-1 text-center text-stone-50"
        style={{
          left: CLOCK_SPOT.left,
          top: CLOCK_SPOT.top,
          width: CLOCK_SPOT.width,
          height: CLOCK_SPOT.height,
        }}
      >
        <span className="font-mono text-base font-bold leading-none">
          {formatClock(clock)}
        </span>
        <span className="text-[9px] leading-tight opacity-90">{phaseLabel}</span>
      </div>

      {/* Подпись сцены: где мы и в каком он состоянии. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-1.5 pt-6">
        <span className="flex items-center gap-1.5 text-xs font-bold text-white drop-shadow">
          <Icon name={location.icon} alt="" size={16} className="flex-shrink-0" />
          {location.label}
        </span>
        <span className="text-xs text-stone-100 drop-shadow">
          Соломон {dirtLabel(cleanliness)}
        </span>
      </div>
    </section>
  );
}
