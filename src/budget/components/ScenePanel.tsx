import Icon from "./Icon";
import SolomonSprite, { dirtLabel } from "./SolomonSprite";
import { iconUrl } from "../../assets/ui/icons";
import type { Location } from "../core/types";

/**
 * Сцена дня: фон локации, на ней Соломон и кнопки-переключатели.
 *
 * Фоны приходят без персонажа (`src/assets/backgrounds/loc-*.png`), поэтому
 * спрайт ставится поверх по координатам локации: точка стояния подобрана так,
 * чтобы белка стояла на полу/снегу и не закрывала важные детали сцены.
 *
 * Кнопки вкладок живут прямо на кадре — как на макете: одна сверху слева и
 * три столбиком справа. Они же переключают локацию: «Заработать» открывает
 * город, «Потратить» — Арбат, «Отдохнуть» — общежитие, «Соломон» — ванную.
 */

/** Вкладки действий — они же переключатели локаций. */
export type SceneTab = "work" | "spend" | "rest" | "pet";

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
 * Верхняя левая — первая вкладка, справа в столбик — остальные три.
 * Правая колонка начинается с 70 % ширины, а персонаж нигде не доходит до
 * этих 70 %, поэтому кнопки не наезжают на белку.
 */
const TAB_BUTTONS: TabButton[] = [
  {
    id: "work",
    label: "Заработать",
    icon: "ui/tab-earn",
    spot: { left: "1.5%", top: "5%", width: "22%", height: "22%" },
  },
  {
    id: "spend",
    label: "Потратить",
    icon: "ui/tab-spend",
    spot: { left: "70%", top: "4%", width: "26.5%", height: "20%" },
  },
  {
    id: "rest",
    label: "Отдохнуть",
    icon: "ui/tab-rest",
    spot: { left: "70%", top: "33.5%", width: "26.5%", height: "20%" },
  },
  {
    id: "pet",
    label: "Соломон",
    icon: "ui/tab-pet",
    spot: { left: "70%", top: "62%", width: "26.5%", height: "20%" },
  },
];

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
  /** Заблокированы ли переключатели (открыто событие). */
  disabled?: boolean;
};

export default function ScenePanel({
  location,
  mood,
  cleanliness,
  tab,
  onTab,
  disabled = false,
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
