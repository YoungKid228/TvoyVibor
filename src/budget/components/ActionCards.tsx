import { useState } from "react";
import PixelButton from "../../components/PixelButton";
import { ITEMS, JOBS, SPENDS } from "../data/scenario";
import { jobBlockReason, spendBlockReason } from "../core/reducer";
import type { GameState, ItemId, JobId, SpendId } from "../core/types";

/**
 * Карточки действий в трёх вкладках: «Заработать», «Потратить», «Отдохнуть».
 *
 * Каждое действие что-то тратит — бесплатных действий «только в плюс» нет.
 * Недоступные действия подписаны причиной (лимит, нет энергии, мало
 * репутации), чтобы игрок понимал правила, а не угадывал их.
 */

type Tab = "work" | "spend" | "rest";

type Props = {
  state: GameState;
  onWork: (jobId: JobId) => void;
  onBuy: (spendId: SpendId) => void;
  onBuyItem: (itemId: ItemId) => void;
  onRest: () => void;
};

export default function ActionCards({
  state,
  onWork,
  onBuy,
  onBuyItem,
  onRest,
}: Props) {
  const [tab, setTab] = useState<Tab>("work");

  const weekShifts = state.weekShifts[state.week] ?? 0;

  return (
    <section aria-label="Действия" className="flex flex-col gap-3">
      <div
        className="flex flex-wrap gap-1"
        role="tablist"
        aria-label="Вкладки действий"
      >
        <TabButton
          active={tab === "work"}
          onClick={() => setTab("work")}
          label="Заработать"
          hint={`${weekShifts} смен из 4`}
        />
        <TabButton
          active={tab === "spend"}
          onClick={() => setTab("spend")}
          label="Потратить"
          hint="настроение вверх, кошелёк вниз"
        />
        <TabButton
          active={tab === "rest"}
          onClick={() => setTab("rest")}
          label="Отдохнуть"
          hint="сон и покупки"
        />
      </div>

      {tab === "work" && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {JOBS.map((job) => {
            const blocked = jobBlockReason(state, job.id);
            return (
              <ActionCard
                key={job.id}
                title={job.label}
                price={`+${job.pay.toLocaleString("ru-RU")} ₽`}
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
            {SPENDS.map((spend) => {
              const blocked = spendBlockReason(state, spend.id);
              return (
                <ActionCard
                  key={spend.id}
                  title={spend.label}
                  price={
                    spend.cost === 0
                      ? "бесплатно"
                      : `−${spend.cost.toLocaleString("ru-RU")} ₽`
                  }
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
            effects={[
              { text: "энергия +45", tone: "gain" },
              { text: "настроение +4", tone: "gain" },
            ]}
            blocked={null}
            onClick={onRest}
          />
          <ActionCard
            title="Погладить Соломона"
            price="бесплатно"
            effects={[
              { text: "Соломон +5", tone: "gain" },
              { text: "энергия −2", tone: "cost" },
            ]}
            blocked={null}
            onClick={() => onBuy("pet")}
          />
        </ul>
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-h-11 rounded-lg border px-3 py-1 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
        active
          ? "border-orange-700 bg-orange-100 font-bold text-orange-900"
          : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
      }`}
    >
      <span className="block">{label}</span>
      <span className="block text-[10px] font-normal text-stone-500">{hint}</span>
    </button>
  );
}

type Effect = { text: string; tone: "gain" | "cost" };

function ActionCard({
  title,
  price,
  effects,
  blocked,
  onClick,
}: {
  title: string;
  price: string;
  effects: Effect[];
  blocked: string | null;
  onClick: () => void;
}) {
  return (
    <li>
      <PixelButton
        type="button"
        onClick={onClick}
        disabled={Boolean(blocked)}
        className="flex min-h-16 w-full flex-col items-start gap-1 px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
      >
        <span className="flex w-full items-baseline justify-between gap-2">
          <span className="text-sm font-bold text-stone-900">{title}</span>
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
