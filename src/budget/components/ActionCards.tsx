import Icon from "./Icon";
import { RULES, SPENDS } from "../data/scenario";
import { spendBlockReason } from "../core/reducer";
import type { GameState, SpendId } from "../core/types";

/**
 * Содержимое шторки в свободное время.
 *
 * Разделы:
 *   «Кошелёк»   — сколько денег осталось и сколько отложено;
 *   «Развлечься» — кино, прогулка, тик-токи, компьютер;
 *   «Кушать»    — еда и остатки приготовленного;
 *   «Платежи»   — обязательные платежи и вариант «ничего не платить»;
 *   «Соломон»   — помыться, погладить, сделать уроки.
 *
 * У каждого действия есть цена (время и, иногда, деньги) и последствия.
 * Недоступные действия подписаны причиной (лимит, нет энергии, нет
 * интернета, грязный Соломон), чтобы игрок понимал правила, а не угадывал
 * их.
 */

/** Группа карточек в шторке. */
export type SpendGroup = "fun" | "food" | "bills" | "care";

/**
 * Раздел «Потратить»: еда, обязательные платежи, развлечения.
 *
 * Обязательные платежи идут первыми: забыть их — значит выселение или
 * пропавший интернет, и об этом лучше видеть сразу.
 */
const SPEND_TABS: Record<SpendId, SpendGroup> = {
  "food-cheap": "food",
  "food-fast": "food",
  "food-luxe": "food",
  "food-leftovers": "food",
  "food-coffee": "food",
  "food-syrniki": "food",
  housing: "bills",
  internet: "bills",
  "transit-pass": "bills",
  laundry: "bills",
  kino: "fun",
  park: "fun",
  tiktok: "fun",
  computer: "fun",
  pet: "care",
  wash: "care",
  lessons: "care",
};

/** Заголовки групп — как в шторке. */
export const GROUP_TITLES: Record<SpendGroup, { title: string; icon: string }> =
  {
    fun: { title: "Развлечься", icon: "ui/spend-kino" },
    food: { title: "Кушать", icon: "ui/spend-breakfast" },
    bills: { title: "Платежи", icon: "ui/ui-mandatory" },
    care: { title: "Соломон", icon: "ui/tab-pet" },
  };

type Props = {
  state: GameState;
  /** Какая группа карточек показана. */
  group: SpendGroup;
  onBuy: (spendId: SpendId) => void;
  /** Решение «ничего не платить». */
  onSkipPayments?: () => void;
};

export default function ActionCards({
  state,
  group,
  onBuy,
  onSkipPayments,
}: Props) {
  const cards = SPENDS.filter((spend) => SPEND_TABS[spend.id] === group);

  return (
    <section
      aria-label={GROUP_TITLES[group].title}
      className="flex flex-col gap-2"
    >
      {group === "bills" && (
        <p className="text-xs text-stone-600">
          Обязательные платежи: их нельзя забыть. Жильё не оплачено вовремя —
          выселение, без интернета пропадают тик-токи и игры.
        </p>
      )}

      <ul className="grid grid-cols-1 gap-2">
        {cards.map((spend) => (
          <SpendCard
            key={spend.id}
            state={state}
            spendId={spend.id}
            onBuy={onBuy}
          />
        ))}
      </ul>

      {/* «Ничего не платить» — честный вариант: игрок сам решает, что
          обязательных платежей сегодня не будет. */}
      {group === "bills" && onSkipPayments && (
        <button
          type="button"
          onClick={onSkipPayments}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 bg-white/60 px-3 py-2 text-xs font-bold text-stone-600 transition hover:border-orange-300 hover:text-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
        >
          <Icon name="ui/ui-recommend" alt="" size={18} />
          Ничего не платить
        </button>
      )}
    </section>
  );
}

type Effect = { text: string; tone: "gain" | "cost" };

/** Карточка траты: цена, время, последствия и причина блокировки. */
function SpendCard({
  state,
  spendId,
  onBuy,
}: {
  state: GameState;
  spendId: SpendId;
  onBuy: (spendId: SpendId) => void;
}) {
  const spend = SPENDS.find((item) => item.id === spendId);
  if (!spend) return null;
  const blocked = spendBlockReason(state, spendId);
  const effects: Effect[] = [];

  if (spend.moodGain) {
    effects.push({
      text: `настроение ${spend.moodGain > 0 ? "+" : ""}${spend.moodGain}`,
      tone: spend.moodGain > 0 ? "gain" : "cost",
    });
  }
  if (spend.energyCost) {
    effects.push({ text: `энергия −${spend.energyCost}`, tone: "cost" });
  }
  if (spend.energyGain) {
    effects.push({ text: `энергия +${spend.energyGain}`, tone: "gain" });
  }
  if (spend.hungerGain) {
    effects.push({ text: `сытость +${spend.hungerGain}`, tone: "gain" });
  }
  if (spend.cleanlinessGain) {
    effects.push({
      text: `чистота +${spend.cleanlinessGain}`,
      tone: "gain",
    });
  }
  if (spendId === "wash") {
    effects.push({ text: "чистота → 100", tone: "gain" });
  }
  if (spendId === "lessons") {
    effects.push({
      text: `уроки подряд: ${state.lessonStreak + 1}`,
      tone: "gain",
    });
  }
  if (spendId === "pet") {
    effects.push({
      text: `осталось ${Math.max(0, RULES.petPerDay - state.petsToday)} из ${RULES.petPerDay}`,
      tone: "cost",
    });
  }
  if (spendId === "wash") {
    effects.push({
      text: `осталось ${Math.max(0, RULES.washPerDay - state.washesToday)} из ${RULES.washPerDay}`,
      tone: "cost",
    });
  }
  if (spendId === "laundry") {
    effects.push({
      text: `осталось ${Math.max(0, RULES.laundryPerDay - state.laundriesToday)} из ${RULES.laundryPerDay}`,
      tone: "cost",
    });
  }
  // Запас еды: сколько порций осталось и до какого дня они не испортятся.
  if (spendId === "food-leftovers") {
    effects.push({
      text: `порций осталось: ${state.mealStock.servings}`,
      tone: "cost",
    });
  }
  if (spend.preparesMeal) {
    effects.push({
      text: `готовит ${RULES.mealServings} порции на ${RULES.mealKeepsDays} дня`,
      tone: "gain",
    });
  }
  // Развлечения: без них за день Соломон грустит.
  if (SPEND_TABS[spendId] === "fun") {
    effects.push({
      text: `развлечений сегодня: ${state.funToday} из ${RULES.funPerDay}`,
      tone: "cost",
    });
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onBuy(spendId)}
        disabled={Boolean(blocked)}
        className={`flex min-h-16 w-full flex-col items-start gap-1 rounded-xl border-2 px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
          blocked
            ? "border-stone-200 bg-stone-100/70 opacity-70"
            : "border-amber-200/70 bg-white hover:border-orange-300"
        }`}
      >
        <span className="flex w-full items-baseline justify-between gap-2">
          <span className="flex items-center gap-2">
            <Icon name={spend.icon} alt="" size={24} className="flex-shrink-0" />
            <span className="text-sm font-bold text-stone-900">{spend.label}</span>
          </span>
          <span className="shrink-0 font-mono text-xs font-bold text-stone-700">
            {spend.cost === 0
              ? "бесплатно"
              : `−${spend.cost.toLocaleString("ru-RU")} ₽`}
          </span>
        </span>
        <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
          {spend.minutes > 0 && (
            <span className="flex items-center gap-1 text-stone-600">
              <Icon name="ui/ui-clock" alt="" size={12} />
              {spend.minutes} мин
            </span>
          )}
          {effects.map((effect) => (
            <span
              key={effect.text}
              className={
                effect.tone === "gain" ? "text-emerald-700" : "text-rose-700"
              }
            >
              {effect.text}
            </span>
          ))}
          {blocked && (
            <span className="font-medium text-amber-700">— {blocked}</span>
          )}
        </span>
      </button>
    </li>
  );
}
