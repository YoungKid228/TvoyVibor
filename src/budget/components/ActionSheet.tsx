import type { ReactNode } from "react";
import Icon from "./Icon";

/**
 * Шторка действий — нижняя панель над навигацией.
 *
 * Вид — как на макете: кремовая карточка с закруглёнными углами и серой
 * ручкой-«перетаскивателем» сверху, внутри — вкладки-пилюли, карточка
 * заголовка действия (иконка, название, жёлтая плашка времени, пояснение),
 * содержимое и одна крупная оранжевая кнопка действия.
 *
 * Кнопка действия всегда одна и всегда главная: игрок не должен искать,
 * где нажимать.
 */

/** Вкладка шторки. */
export type SheetTab = {
  id: string;
  label: string;
  icon: string;
};

type Props = {
  /** Подпись секции для доступности: «Утро», «Действия». */
  label?: string;
  /** Вкладки шторки. В свободное время их нет: разделы — в навигации. */
  tabs?: SheetTab[];
  /** Активная вкладка. */
  activeTab?: string;
  /** Переключение вкладки. */
  onTab?: (id: string) => void;
  /** Заголовок карточки действия. */
  title: string;
  /** Плашка времени: «06:00 — утро». */
  timeLabel: string;
  /** Пояснение под заголовком. */
  description: string;
  /** Иконка-иллюстрация в карточке заголовка. */
  illustration?: string;
  /** Содержимое: ползунок вариантов или карточки действий. */
  children: ReactNode;
  /** Главная кнопка действия. */
  cta?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    icon?: string;
  };
};

export default function ActionSheet({
  label = "Действия",
  tabs,
  activeTab,
  onTab,
  title,
  timeLabel,
  description,
  illustration,
  children,
  cta,
}: Props) {
  return (
    <section
      aria-label={label}
      className="z-10 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-2xl border-t-2 border-amber-200/70 bg-[#fdf1de] shadow-[0_-4px_16px_rgba(0,0,0,0.35)]"
    >
      {/* Ручка-«перетаскиватель»: как на макете. */}
      <div className="flex justify-center pt-1" aria-hidden="true">
        <span className="h-1 w-12 rounded-full bg-stone-400" />
      </div>

      {/* Вкладки-пилюли. */}
      {tabs && tabs.length > 0 && (
        <div className="flex gap-2 px-3 pt-2">
          {tabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => onTab?.(tab.id)}
                className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border-2 px-2 py-1.5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
                  active
                    ? "border-orange-300 bg-gradient-to-b from-orange-400 to-orange-600 text-white shadow-[0_3px_0_rgba(180,83,9,0.6)]"
                    : "border-stone-300 bg-[#f7e6cf] text-stone-700"
                }`}
              >
                <Icon
                  name={tab.icon}
                  alt=""
                  size={20}
                  className="flex-shrink-0"
                />
                <span className="text-sm font-bold leading-tight">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Карточка заголовка действия и содержимое вкладки — прокручиваются
          вместе. На маленьком экране (а это телефон) закреплённая карточка
          съедала всё место, и варианты переставали помещаться. */}
      <div className="relative mt-2 min-h-0 flex-1">
        <div className="h-full overflow-y-auto px-3 pb-1">
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200/70 bg-white/70 px-2.5 py-2">
            {illustration && (
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                <Icon name={illustration} alt="" size={28} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="text-sm font-bold leading-tight text-stone-900">
                  {title}
                </h3>
                <p className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                  <Icon name="ui/ui-clock" alt="" size={11} />
                  {timeLabel}
                </p>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-stone-700">
                {description}
              </p>
            </div>
          </div>

          {children}
        </div>

        {/* Подсказка «ещё ниже есть»: тень у нижнего края прокрутки. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[#fdf1de] to-transparent"
        />
      </div>

      {/* Главная кнопка действия. */}
      {cta && (
        <div className="shrink-0 px-3 pb-2 pt-1">
          <button
            type="button"
            onClick={cta.onClick}
            disabled={cta.disabled}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-orange-400 to-orange-600 px-3 text-base font-bold text-white shadow-[0_4px_0_rgba(180,83,9,0.75)] transition active:translate-y-0.5 active:shadow-[0_2px_0_rgba(180,83,9,0.75)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:from-stone-300 disabled:to-stone-400 disabled:text-stone-600 disabled:shadow-none"
          >
            {cta.icon && <Icon name={cta.icon} alt="" size={20} />}
            <span>{cta.label}</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </section>
  );
}
