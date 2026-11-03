import PixelButton from "../../components/PixelButton";
import type { GameEvent } from "../core/types";

/**
 * Экран сюжетного события: три варианта с разной ценой.
 *
 * Цена выражена по-разному: деньгами, энергией или настроением — так же,
 * как в исходном документе. Ровно один вариант можно выбрать.
 */

type Props = {
  event: GameEvent;
  onChoose: (optionId: string) => void;
  error?: string | null;
};

export default function EventScreen({ event, onChoose, error }: Props) {
  return (
    <section
      aria-label={event.title}
      className="rounded-xl border border-orange-300 bg-orange-50 p-4 shadow-[3px_3px_0_#fdba74]"
    >
      <h2 className="text-lg font-bold text-orange-900">{event.title}</h2>
      <p className="mt-1 text-sm text-stone-700">{event.description}</p>

      {error && (
        <p className="mt-2 rounded border border-red-300 bg-red-50 px-2 py-1 text-sm text-red-800">
          {error}
        </p>
      )}

      <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        {event.options.map((option) => (
          <li key={option.id}>
            <PixelButton
              type="button"
              onClick={() => onChoose(option.id)}
              className="flex min-h-24 w-full flex-col items-start gap-1 px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
            >
              <span className="text-sm font-bold text-stone-900">
                {option.label}
              </span>
              <span className="font-mono text-xs text-stone-700">
                {option.cost === 0
                  ? "бесплатно"
                  : `−${option.cost.toLocaleString("ru-RU")} ₽`}
              </span>
              <span className="text-[11px] leading-snug text-stone-600">
                {option.hint}
              </span>
              <span className="mt-auto flex flex-wrap gap-x-3 text-[11px]">
                {option.moodGain !== 0 && (
                  <span
                    className={
                      option.moodGain > 0 ? "text-emerald-700" : "text-rose-700"
                    }
                  >
                    настроение {option.moodGain > 0 ? "+" : ""}
                    {option.moodGain}
                  </span>
                )}
                {(option.solomonGain ?? 0) !== 0 && (
                  <span
                    className={
                      (option.solomonGain ?? 0) > 0
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }
                  >
                    Соломон {option.solomonGain! > 0 ? "+" : ""}
                    {option.solomonGain}
                  </span>
                )}
                {(option.energyCost ?? 0) > 0 && (
                  <span className="text-rose-700">энергия −{option.energyCost}</span>
                )}
              </span>
            </PixelButton>
          </li>
        ))}
      </ul>
    </section>
  );
}
