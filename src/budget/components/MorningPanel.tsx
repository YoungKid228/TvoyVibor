import PixelButton from "../../components/PixelButton";
import Icon from "./Icon";
import { FOOD_SPENDS, SPENDS, TRANSPORTS } from "../data/scenario";
import { spendBlockReason, transportCost } from "../core/reducer";
import type { GameState, SpendId, TransportId } from "../core/types";

/**
 * Утро дня: что поесть на завтрак и как добраться до пар.
 *
 * День начинается в 06:00. До 09:00 нужно успеть позавтракать и доехать:
 * дорога занимает время, а готовка — ещё больше. Не успел — остаёшься
 * без завтрака, и день начинается с голодного Соломона.
 */
type Props = {
  state: GameState;
  onBuy: (spendId: SpendId) => void;
  onTransport: (transportId: TransportId) => void;
};

export default function MorningPanel({ state, onBuy, onTransport }: Props) {
  const foods = FOOD_SPENDS.map((id) =>
    SPENDS.find((spend) => spend.id === id),
  ).filter((spend): spend is NonNullable<typeof spend> => Boolean(spend));

  return (
    <section
      aria-label="Утро"
      className="flex flex-col gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 shadow-[3px_3px_0_#d6d3d1]"
    >
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <Icon name="ui/ui-clock" alt="" size={18} />
          06:00 — утро
        </h3>
        <p className="mt-0.5 text-xs text-stone-700">
          Сначала завтрак, потом дорога на пары — выберите по одному варианту в
          каждом разделе. Пары идут до 15:00, потом день свободен, а закончить
          его можно только сном.
        </p>
      </div>

      <div>
        <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-stone-600">
          Завтрак {state.breakfastToday ? "— выбран" : ""}
        </h4>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {foods.map((spend) => {
            const blocked = spendBlockReason(state, spend.id);
            return (
              <li key={spend.id}>
                <PixelButton
                  type="button"
                  onClick={() => onBuy(spend.id)}
                  disabled={Boolean(blocked)}
                  className="flex min-h-16 w-full flex-col items-start gap-1 px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
                >
                  <span className="flex w-full items-baseline justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Icon
                        name={spend.icon}
                        alt={spend.label}
                        size={24}
                        className="flex-shrink-0"
                      />
                      <span className="text-sm font-bold text-stone-900">
                        {spend.label}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-stone-700">
                      −{spend.cost.toLocaleString("ru-RU")} ₽
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                    <span className="text-stone-600">{spend.minutes} мин</span>
                    <span className="text-emerald-700">
                      сытость +{spend.hungerGain}
                    </span>
                    {spend.energyCost > 0 && (
                      <span className="text-rose-700">
                        энергия −{spend.energyCost}
                      </span>
                    )}
                    {spend.energyGain > 0 && (
                      <span className="text-emerald-700">
                        энергия +{spend.energyGain}
                      </span>
                    )}
                    {blocked && (
                      <span className="font-medium text-amber-700">
                        — {blocked}
                      </span>
                    )}
                  </span>
                </PixelButton>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-stone-600">
          Дорога на пары {state.transportToday ? "— выбрана" : ""}
        </h4>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {TRANSPORTS.map((item) => {
            const cost = transportCost(state, item.id);
            const blocked = state.transportToday
              ? "дорога уже выбрана"
              : item.id === "walk" && state.scales.energy < item.energyCost
                ? "нет энергии"
                : null;
            return (
              <li key={item.id}>
                <PixelButton
                  type="button"
                  onClick={() => onTransport(item.id)}
                  disabled={Boolean(blocked)}
                  className="flex min-h-16 w-full flex-col items-start gap-1 px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
                >
                  <span className="flex w-full items-baseline justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Icon
                        name={item.icon}
                        alt={item.label}
                        size={24}
                        className="flex-shrink-0"
                      />
                      <span className="text-sm font-bold text-stone-900">
                        {item.label}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-stone-700">
                      {cost === 0 ? "бесплатно" : `−${cost} ₽`}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                    <span className="text-stone-600">{item.minutes} мин</span>
                    {item.energyCost > 0 && (
                      <span className="text-rose-700">
                        энергия −{item.energyCost}
                      </span>
                    )}
                    {item.dirt > 0 && (
                      <span className="text-amber-700">
                        Соломон пачкается +{item.dirt}
                      </span>
                    )}
                    {blocked && (
                      <span className="font-medium text-amber-700">
                        — {blocked}
                      </span>
                    )}
                  </span>
                </PixelButton>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
