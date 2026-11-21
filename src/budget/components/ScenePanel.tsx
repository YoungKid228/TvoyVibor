import Icon from "./Icon";
import SolomonSprite, { dirtLabel } from "./SolomonSprite";
import { iconUrl } from "../../assets/ui/icons";
import type { Location } from "../core/types";

/**
 * Сцена дня: фон локации и Соломон на нём.
 *
 * Фоны приходят без персонажа (`src/assets/backgrounds/loc-*.png`), поэтому
 * спрайт ставится поверх по координатам локации: точка стояния подобрана по
 * макетам в `backgrounds/preview- того как должно быть`.
 *
 * Раскладка вертикальная (9:16): сцена — полоса под шапкой, шириной во
 * весь экран и пропорциями 3:2, как сами фоны. Картинка не обрезается и не
 * растягивается, поэтому Соломон всегда стоит на своём месте.
 *
 * Поверх кадра — две плашки: часы (сколько времени осталось и чем занят
 * игрок) и «Поспать». Сон закрывает день, поэтому кнопка должна быть на
 * виду всегда.
 */

type Props = {
  /** Локация, которую показываем. */
  location: Location;
  /** Настроение Соломона, 0…100. */
  mood: number;
  /** Чистота Соломона, 0…100. */
  cleanliness: number;
  /** Текущее время суток, минуты от 00:00. */
  clock: number;
  /** Короткая подпись того, чем занят игрок сейчас. */
  phaseLabel: string;
  /** Доступен ли сон (иначе кнопка показывает причину). */
  canSleep: boolean;
  /** Почему сон недоступен. */
  sleepHint?: string | null;
  /** Нажатие «Поспать» — открывает подтверждение. */
  onSleep: () => void;
};

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
  clock,
  phaseLabel,
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
      className="relative z-0 w-full shrink-0 overflow-hidden bg-[#241512]"
    >
      {/* Задник: та же картинка, растянутая и приглушённая. Он заполняет
          поля по бокам, когда кадр уменьшается на маленьком экране, — иначе
          по краям остаются пустые полосы. */}
      {background && (
        <img
          src={background}
          alt=""
          className="absolute inset-0 h-full w-full scale-105 object-cover opacity-45 blur-[2px]"
          draggable={false}
        />
      )}

      {/* Кадр — ровно по пропорциям картинки (3:2): она всегда помещается в
          экран целиком, поэтому фон не искажается и не обрезается, а Соломон
          остаётся на своём месте. На маленьком экране кадр уменьшается
          (высота не больше 30 % экрана), чтобы шторке с действиями осталось
          место. */}
      <div
        className="relative mx-auto w-full"
        style={{ aspectRatio: "3 / 2", maxWidth: "min(100%, 45dvh)" }}
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

        {/* Подпись сцены: где мы и в каком он состоянии. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent px-3 pb-1.5 pt-6">
          <span className="flex items-center gap-1.5 text-xs font-bold text-white drop-shadow">
            <Icon name={location.icon} alt="" size={16} className="flex-shrink-0" />
            {location.label}
          </span>
          <span className="text-xs text-stone-100 drop-shadow">
            Соломон {dirtLabel(cleanliness)}
          </span>
        </div>

        {/* Часы: сколько времени в сутках и чем занят игрок. */}
        <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded-lg border-2 border-stone-800/60 bg-stone-900/75 px-2 py-1 text-stone-50">
          <Icon name="ui/ui-clock" alt="" size={16} className="flex-shrink-0" />
          <span className="font-mono text-sm font-bold leading-none">
            {formatClock(clock)}
          </span>
          <span className="text-[10px] leading-tight opacity-90">{phaseLabel}</span>
        </div>

        {/* Сон: кнопка всегда на виду — она закрывает день. */}
        <button
          type="button"
          onClick={onSleep}
          disabled={!canSleep}
          title={sleepHint ?? "Закончить день сном"}
          className="absolute right-2 top-2 flex min-h-11 items-center justify-center gap-1.5 rounded-lg border-2 border-stone-800/60 bg-stone-900/80 px-3 text-xs font-bold leading-tight text-stone-50 transition hover:bg-stone-800/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="ui/solomon" alt="" size={18} className="flex-shrink-0" />
          <span>Поспать</span>
        </button>
      </div>
    </section>
  );
}
