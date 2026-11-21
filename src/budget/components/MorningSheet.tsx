import { useEffect, useState } from "react";
import ActionSheet from "./ActionSheet";
import Icon from "./Icon";
import { FOOD_SPENDS, SPENDS, TRANSPORTS } from "../data/scenario";
import {
  spendBlockReason,
  transportBlockReason,
  transportCost,
} from "../core/reducer";
import type { GameState, SpendId, TransportId } from "../core/types";

/**
 * Утро дня: что поесть на завтрак и как добраться до пар.
 *
 * Две вкладки — «Завтрак» и «Отправиться на учёбу». Как только игрок
 * позавтракал, вкладка сама переключается на дорогу: варианты завтрака
 * больше не нужны, а выбрать транспорт нужно именно сейчас.
 *
 * Варианты показаны горизонтальной лентой-ползунком: их больше двух, и на
 * каждый видно цену, время и последствия — выбирать приходится не на ощупь.
 * Выбранный вариант отмечен рамкой и галочкой, а действие выполняет
 * главная кнопка внизу шторки.
 */

type Props = {
  state: GameState;
  onBuy: (spendId: SpendId) => void;
  onTransport: (transportId: TransportId) => void;
};

/** Вкладка утренней шторки. */
export type MorningTab = "breakfast" | "study";

/** Еда, которую берут по умолчанию: своя еда — дешевле всех. */
const DEFAULT_FOOD: SpendId = "food-cheap";
/** Дорога по умолчанию: автобус — компромисс между деньгами и временем. */
const DEFAULT_TRANSPORT: TransportId = "bus";

const TABS = [
  { id: "breakfast", label: "Завтрак", icon: "ui/spend-breakfast" },
  { id: "study", label: "Отправиться на учёбу", icon: "ui/ui-transport" },
];

export default function MorningSheet({
  state,
  onBuy,
  onTransport,
}: Props) {
  const [tab, setTab] = useState<MorningTab>("breakfast");
  const [food, setFood] = useState<SpendId>(DEFAULT_FOOD);
  const [transport, setTransport] = useState<TransportId>(DEFAULT_TRANSPORT);

  // Позавтракал — значит, теперь дорога. Переключаем вкладку сами: иначе
  // игроку пришлось бы искать, где выбрать транспорт.
  useEffect(() => {
    if (state.breakfastToday) setTab("study");
  }, [state.breakfastToday]);

  const foods = FOOD_SPENDS.map((id) =>
    SPENDS.find((spend) => spend.id === id),
  ).filter((spend): spend is NonNullable<typeof spend> => Boolean(spend));

  const foodBlocked = state.breakfastToday
    ? "завтрак уже был"
    : spendBlockReason(state, food);
  const transportBlocked = transportBlockReason(state, transport);

  const breakfast = tab === "breakfast";

  return (
    <ActionSheet
      label="Утро"
      tabs={TABS}
      activeTab={tab}
      onTab={(id) => setTab(id as MorningTab)}
      title={breakfast ? "Завтрак" : "Отправиться на учёбу"}
      timeLabel="06:00 — утро"
      description={
        breakfast
          ? "Выберите вариант завтрака на сегодня: сначала завтрак, потом дорога на пары."
          : "Дорога занимает время, а пешком Соломон ещё и пачкается."
      }
      illustration={breakfast ? "ui/spend-breakfast" : "ui/ui-transport"}
      cta={{
        label: breakfast ? "Позавтракать" : "Ехать на пары",
        icon: breakfast ? "ui/spend-breakfast" : "ui/ui-transport",
        disabled: breakfast ? Boolean(foodBlocked) : Boolean(transportBlocked),
        onClick: () => {
          if (breakfast) onBuy(food);
          else onTransport(transport);
        },
      }}
    >
      {breakfast ? (
        <>
          <ul
            aria-label="Варианты завтрака"
            className="mt-2 flex flex-col gap-2"
          >
            {foods.map((spend) => (
              <OptionCard
                key={spend.id}
                label={spend.label}
                icon={spend.icon}
                minutes={spend.minutes}
                price={
                  spend.cost === 0
                    ? "бесплатно"
                    : `−${spend.cost.toLocaleString("ru-RU")} ₽`
                }
                effects={foodEffects(spend.id, state)}
                selected={spend.id === food}
                blocked={
                  state.breakfastToday
                    ? null
                    : spendBlockReason(state, spend.id)
                }
                onSelect={() => setFood(spend.id)}
              />
            ))}
          </ul>
          {foodBlocked && (
            <p className="mt-1 text-[11px] font-medium text-amber-700">
              — {foodBlocked}
            </p>
          )}
        </>
      ) : (
        <>
          <ul
            aria-label="Варианты дороги"
            className="mt-2 flex flex-col gap-2"
          >
            {TRANSPORTS.map((item) => {
              const cost = transportCost(state, item.id);
              return (
                <OptionCard
                  key={item.id}
                  label={item.label}
                  icon={item.icon}
                  minutes={item.minutes}
                  price={cost === 0 ? "бесплатно" : `−${cost} ₽`}
                  effects={transportEffects(
                    item.energyCost,
                    item.dirt,
                    item.moodGain,
                  )}
                  selected={item.id === transport}
                  blocked={transportBlockReason(state, item.id)}
                  onSelect={() => setTransport(item.id)}
                />
              );
            })}
          </ul>
          {transportBlocked && (
            <p className="mt-1 text-[11px] font-medium text-amber-700">
              — {transportBlocked}
            </p>
          )}
        </>
      )}
    </ActionSheet>
  );
}

/** Карточка варианта в ленте: цена, время, последствия. */
function OptionCard({
  label,
  icon,
  minutes,
  price,
  effects,
  selected,
  blocked,
  onSelect,
}: {
  label: string;
  icon: string;
  minutes: number;
  price: string;
  effects: { text: string; tone: "gain" | "cost" }[];
  selected: boolean;
  blocked: string | null;
  onSelect: () => void;
}) {
  return (
    <li className="w-full">
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={`relative flex min-h-16 w-full flex-col items-start gap-1 rounded-xl border-2 px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
          selected
            ? "border-orange-500 bg-white shadow-[0_3px_0_rgba(249,115,22,0.45)]"
            : "border-stone-300 bg-[#f4ece0]"
        }`}
      >
        {/* Галочка выбора — как на макете. */}
        <span
          aria-hidden="true"
          className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
            selected
              ? "border-orange-500 bg-orange-500 text-white"
              : "border-stone-400 bg-white text-transparent"
          }`}
        >
          ✓
        </span>
        <div className="flex items-start gap-2 pr-6">
          <Icon
            name={icon}
            alt=""
            size={24}
            className="flex-shrink-0"
          />
          <span className="text-sm font-bold leading-tight text-stone-900">
            {label}
          </span>
        </div>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
          <span className="font-mono font-bold text-stone-700">{price}</span>
          <span className="text-stone-500">{minutes} мин</span>
          {effects.slice(0, 3).map((effect) => (
            <span
              key={effect.text}
              className={
                effect.tone === "gain" ? "text-emerald-700" : "text-rose-700"
              }
            >
              {effect.text}
            </span>
          ))}
        </span>
        {blocked && (
          <span className="text-[11px] font-medium text-amber-700">
            — {blocked}
          </span>
        )}
      </button>
    </li>
  );
}

/** Последствия варианта еды: сытость, энергия, запас еды. */
function foodEffects(
  spendId: string,
  state: GameState,
): { text: string; tone: "gain" | "cost" }[] {
  const spend = SPENDS.find((item) => item.id === spendId);
  if (!spend) return [];
  const effects: { text: string; tone: "gain" | "cost" }[] = [];
  if (spend.hungerGain) {
    effects.push({ text: `сытость +${spend.hungerGain}`, tone: "gain" });
  }
  if (spend.energyGain) {
    effects.push({ text: `энергия +${spend.energyGain}`, tone: "gain" });
  }
  if (spend.energyCost) {
    effects.push({ text: `энергия −${spend.energyCost}`, tone: "cost" });
  }
  if (spendId === "food-leftovers") {
    effects.push({
      text: `порций осталось: ${state.mealStock.servings}`,
      tone: "cost",
    });
  }
  if (spend.preparesMeal) {
    effects.push({ text: "запас на 2 дня", tone: "gain" });
  }
  return effects;
}

/** Последствия варианта дороги. */
function transportEffects(
  energyCost: number,
  dirt: number,
  moodGain: number,
): { text: string; tone: "gain" | "cost" }[] {
  const effects: { text: string; tone: "gain" | "cost" }[] = [];
  if (energyCost > 0) {
    effects.push({ text: `энергия −${energyCost}`, tone: "cost" });
  }
  if (dirt > 0) {
    effects.push({ text: `пачкается +${dirt}`, tone: "cost" });
  }
  if (moodGain > 0) {
    effects.push({ text: `настроение +${moodGain}`, tone: "gain" });
  }
  if (moodGain < 0) {
    effects.push({ text: `настроение ${moodGain}`, tone: "cost" });
  }
  return effects;
}
