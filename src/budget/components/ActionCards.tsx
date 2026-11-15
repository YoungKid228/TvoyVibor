import PixelButton from "../../components/PixelButton";
import Icon from "./Icon";
import { ITEMS, JOBS, RULES, SPENDS } from "../data/scenario";
import {
  goesIntoDebt,
  jobBlockReason,
  restBlockReason,
  spendBlockReason,
} from "../core/reducer";
import type { GameState, ItemId, JobId, SpendId } from "../core/types";
import type { SceneTab } from "./ScenePanel";

/**
 * Карточки действий в четырёх вкладках: «Заработать», «Потратить», «Отдохнуть», «Соломон».
 *
 * Сами вкладки-переключатели нарисованы на сцене (`ScenePanel`): они же
 * переключают локацию. Здесь — только содержимое активной вкладки.
 *
 * Каждое действие что-то тратит — бесплатных действий «только в плюс» нет.
 * Недоступные действия подписаны причиной (лимит, нет энергии, мало
 * репутации), чтобы игрок понимал правила, а не угадывал их.
 */

/**
 * Уход за питомцем — не покупка: эти действия живут во вкладке «Соломон»,
 * и в «Потратить» их нет, чтобы одно действие не было на двух вкладках.
 */
const PET_CARE_SPENDS: SpendId[] = ["pet", "wash"];

type Props = {
  state: GameState;
  /** Активная вкладка — её содержимое и показываем. */
  tab: SceneTab;
  onWork: (jobId: JobId) => void;
  onBuy: (spendId: SpendId) => void;
  onBuyItem: (itemId: ItemId) => void;
  onRest: () => void;
};

export default function ActionCards({
  state,
  tab,
  onWork,
  onBuy,
  onBuyItem,
  onRest,
}: Props) {
  const weekShifts = state.weekShifts[state.week] ?? 0;

  return (
    <section aria-label="Действия" className="flex flex-col gap-3">
      <p className="text-xs text-stone-600">
        {tab === "work" && `Смены на этой неделе: ${weekShifts} из 4`}
        {tab === "spend" && "Покупки: настроение вверх, кошелёк вниз"}
        {tab === "rest" && "Отдых: сон восстанавливает энергию"}
        {tab === "pet" && "Уход за Соломоном: поглаживание и мытьё"}
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
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SPENDS.filter(
              (spend) => !PET_CARE_SPENDS.includes(spend.id),
            ).map((spend) => {
              const blocked = spendBlockReason(state, spend.id);
              const debt = goesIntoDebt(state, spend.id);
              return (
                <ActionCard
                  key={spend.id}
                  title={spend.label}
                  price={
                    spend.cost === 0
                      ? "бесплатно"
                      : `−${spend.cost.toLocaleString("ru-RU")} ₽`
                  }
                  icon={spend.icon}
                  effects={[
                    ...(spend.moodGain
                      ? [
                          {
                            text: `настроение ${spend.moodGain > 0 ? "+" : ""}${spend.moodGain}`,
                            tone: spend.moodGain > 0 ? ("gain" as const) : ("cost" as const),
                          },
                        ]
                      : []),
                    ...(spend.energyCost
                      ? [{ text: `энергия −${spend.energyCost}`, tone: "cost" as const }]
                      : []),
                    ...(spend.hungerGain
                      ? [{ text: `сытость +${spend.hungerGain}`, tone: "gain" as const }]
                      : []),
                    ...(spend.hygieneGain
                      ? [{ text: `гигиена +${spend.hygieneGain}`, tone: "gain" as const }]
                      : []),
                    ...(spend.solomonGain
                      ? [
                          {
                            text: `Соломон ${spend.solomonGain > 0 ? "+" : ""}${spend.solomonGain}`,
                            tone: spend.solomonGain > 0 ? ("gain" as const) : ("cost" as const),
                          },
                        ]
                      : []),
                    // Долг разрешён, но игрок должен видеть его до покупки:
                    // долг должен быть осознанным решением, а не сюрпризом.
                    ...(debt
                      ? [
                          {
                            text: "уйдёт в долг",
                            tone: "cost" as const,
                          },
                        ]
                      : []),
                  ]}
                  blocked={blocked}
                  onClick={() => onBuy(spend.id)}
                />
              );
            })}
          </ul>

          <h3 className="mt-2 text-sm font-bold text-stone-700">
            Крупные покупки
          </h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ITEMS.map((item) => (
              <ActionCard
                key={item.id}
                title={item.label}
                price={`−${item.cost.toLocaleString("ru-RU")} ₽`}
                icon={item.icon}
                effects={[{ text: item.note, tone: "gain" }]}
                blocked={state.items.includes(item.id) ? "уже куплено" : null}
                onClick={() => onBuyItem(item.id)}
              />
            ))}
          </ul>
        </>
      )}

      {tab === "rest" && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ActionCard
            title="Поспать"
            price="бесплатно"
            icon="ui/ui-day"
            effects={[
              { text: "энергия +45", tone: "gain" },
              { text: "настроение +4", tone: "gain" },
            ]}
            blocked={restBlockReason(state)}
            onClick={onRest}
          />
        </ul>
      )}

      {tab === "pet" && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <ActionCard
            title="Погладить Соломона"
            price="бесплатно"
            icon="ui/heart-2"
            effects={[
              { text: "Соломон +5", tone: "gain" },
              { text: "энергия −2", tone: "cost" },
              {
                text: `осталось ${Math.max(0, RULES.petPerDay - state.petsToday)} из ${RULES.petPerDay}`,
                tone: "cost",
              },
            ]}
            blocked={spendBlockReason(state, "pet")}
            onClick={() => onBuy("pet")}
          />
          <ActionCard
            title="Вымыть Соломона"
            price="−200 ₽"
            icon="ui/spend-shower"
            effects={[
              // Мытьё возвращает блеск, а не «добавляет чистоту»: после него
              // Соломон снова чистый (100), поэтому подпись — «чистота → 100».
              { text: "чистота → 100", tone: "gain" },
              { text: "настроение +1", tone: "gain" },
              { text: "Соломон +2", tone: "gain" },
              {
                text: `осталось ${Math.max(0, RULES.washPerDay - state.washesToday)} из ${RULES.washPerDay}`,
                tone: "cost",
              },
            ]}
            blocked={spendBlockReason(state, "wash")}
            onClick={() => onBuy("wash")}
          />
        </ul>
      )}
    </section>
  );
}

type Effect = { text: string; tone: "gain" | "cost" };

function ActionCard(
  {
    title,
    price,
    icon,
    effects,
    blocked,
    onClick,
  }: {
    title: string;
    price: string;
    icon: string;
    effects: Effect[];
    blocked: string | null;
    onClick: () => void;
  }
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
