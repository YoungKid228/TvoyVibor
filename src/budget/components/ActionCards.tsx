import PixelButton from "../../components/PixelButton";
import Icon from "./Icon";
import { JOBS, RULES, SPENDS } from "../data/scenario";
import {
  goesIntoDebt,
  jobBlockReason,
  spendBlockReason,
} from "../core/reducer";
import type { GameState, JobId, SpendId } from "../core/types";
import type { SceneTab } from "./ScenePanel";

/**
 * Карточки действий в трёх вкладках: «Заработать», «Потратить», «Соломон».
 *
 * Вкладки-переключатели нарисованы на сцене (`ScenePanel`): они же
 * переключают локацию. Здесь — только содержимое активной вкладки.
 *
 * У каждого действия есть цена (время и, иногда, деньги) и последствия.
 * Недоступные действия подписаны причиной (лимит, нет энергии, нет
 * интернета), чтобы игрок понимал правила, а не угадывал их.
 */

/**
 * Вкладка «Потратить»: еда, обязательные платежи, развлечения.
 *
 * Уход за Соломоном (pet, wash, lessons, shower) живёт только во вкладке
 * «Соломон» — одно действие не должно быть на двух вкладках.
 */
const SPEND_TABS: Record<SpendId, "food" | "bills" | "fun" | "care"> = {
  "food-cheap": "food",
  "food-fast": "food",
  "food-luxe": "food",
  "food-leftovers": "food",
  housing: "bills",
  internet: "bills",
  "transit-pass": "bills",
  laundry: "bills",
  kino: "fun",
  park: "fun",
  tiktok: "fun",
  pet: "care",
  wash: "care",
  lessons: "care",
  shower: "care",
};

const SPEND_GROUPS: { key: "food" | "bills" | "fun"; title: string }[] = [
  { key: "food", title: "Еда — каждый день" },
  { key: "bills", title: "Обязательные платежи" },
  { key: "fun", title: "Развлечения" },
];

/** Вкладка «Соломон»: уход за питомцем и за собой. */
const CARE_SPENDS: SpendId[] = ["pet", "wash", "lessons", "shower"];

type Props = {
  state: GameState;
  /** Активная вкладка — её содержимое и показываем. */
  tab: SceneTab;
  onWork: (jobId: JobId) => void;
  onBuy: (spendId: SpendId) => void;
};

export default function ActionCards({
  state,
  tab,
  onWork,
  onBuy,
}: Props) {
  const weekShifts = state.weekShifts[state.week] ?? 0;

  return (
    <section aria-label="Действия" className="flex flex-col gap-3">
      <p className="text-xs text-stone-600">
        {tab === "work" &&
          `Смены на этой неделе: ${weekShifts} из ${RULES.weeklyShiftCap}`}
        {tab === "spend" &&
          "Обязательные платежи — разово и на период. Остальное по желанию."}
        {tab === "solomon" &&
          "Соломону нужны ласка, вода и чистая одежда. Сон закрывает день."}
      </p>

      {tab === "work" && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {JOBS.map((job) => {
            const blocked = jobBlockReason(state, job.id);
            return (
              <ActionCard
                key={job.id}
                title={job.label}
                price={`+${job.pay.toLocaleString("ru-RU")} ₽`}
                icon={job.icon}
                minutes={job.minutes}
                effects={[
                  { text: `энергия −${job.energyCost}`, tone: "cost" },
                  { text: `настроение −${job.moodCost}`, tone: "cost" },
                ]}
                blocked={blocked}
                onClick={() => onWork(job.id)}
              />
            );
          })}
        </ul>
      )}

      {tab === "spend" && (
        <>
          {SPEND_GROUPS.map((group) => {
            const cards = SPENDS.filter(
              (spend) => SPEND_TABS[spend.id] === group.key,
            );
            if (cards.length === 0) return null;
            return (
              <div key={group.key}>
                <h3 className="mb-1 mt-1 text-sm font-bold text-stone-700">
                  {group.title}
                </h3>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {cards.map((spend) => (
                    <SpendCard
                      key={spend.id}
                      state={state}
                      spendId={spend.id}
                      onBuy={onBuy}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </>
      )}

      {tab === "solomon" && (
        <>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CARE_SPENDS.map((spendId) => (
              <SpendCard
                key={spendId}
                state={state}
                spendId={spendId}
                onBuy={onBuy}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

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
  const debt = goesIntoDebt(state, spendId);
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
  // Долг разрешён, но игрок должен видеть его до покупки: долг должен быть
  // осознанным решением, а не сюрпризом.
  if (debt) {
    effects.push({ text: "уйдёт в долг", tone: "cost" });
  }

  return (
    <ActionCard
      title={spend.label}
      price={
        spend.cost === 0
          ? "бесплатно"
          : `−${spend.cost.toLocaleString("ru-RU")} ₽`
      }
      icon={spend.icon}
      minutes={spend.minutes}
      effects={effects}
      blocked={blocked}
      onClick={() => onBuy(spendId)}
    />
  );
}

type Effect = { text: string; tone: "gain" | "cost" };

function ActionCard(
  {
    title,
    price,
    icon,
    minutes,
    effects,
    blocked,
    onClick,
  }: {
    title: string;
    price: string;
    icon: string;
    /** Сколько времени занимает действие, минут. */
    minutes: number;
    effects: Effect[];
    blocked: string | null;
    onClick: () => void;
  },
) {
  return (
    <li>
      <PixelButton
        type="button"
        onClick={onClick}
        disabled={Boolean(blocked)}
        className="flex min-h-16 w-full flex-col items-start gap-1 px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
      >
        <span className="flex w-full items-baseline justify-between gap-2">
          <span className="flex items-center gap-2">
            <Icon
              name={icon}
              alt={title}
              size={24}
              className="flex-shrink-0"
            />
            <span className="text-sm font-bold text-stone-900">{title}</span>
          </span>
          <span className="shrink-0 font-mono text-xs text-stone-700">
            {price}
          </span>
        </span>
        <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
          {minutes > 0 && (
            <span className="flex items-center gap-1 text-stone-600">
              <Icon name="ui/ui-clock" alt="" size={12} />
              {minutes} мин
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
      </PixelButton>
    </li>
  );
}
