import Icon from "./Icon";

/**
 * Нижняя навигация дня: три раздела игры.
 *
 * Как на макете: тёмная полоса внизу, в центре — «Потратить» (кнопка
 * всегда подсвечена и всегда доступна: там же живут обязательные платежи),
 * слева — «Кошелёк», справа — «Соломон».
 *
 * Все три кнопки одинаковые: значок и подпись. Суммы на кнопке «Кошелёк» не
 * пишем — из-за них кнопка была выше остальных и ломала ряд. Деньги видно в
 * самом разделе «Кошелёк».
 */

/** Раздел дня, который открыт в шторке. */
export type PanelTab = "wallet" | "spend" | "solomon";

type Props = {
  /** Открытый раздел. */
  tab: PanelTab;
  /** Переключение раздела. */
  onTab: (tab: PanelTab) => void;
  /** Заблокирована ли навигация (открыто событие). */
  disabled?: boolean;
};

type TabDef = {
  id: PanelTab;
  label: string;
  icon: string;
};

const TABS: TabDef[] = [
  { id: "wallet", label: "Кошелёк", icon: "ui/grade-money" },
  { id: "spend", label: "Чем заняться?", icon: "ui/tab-spend" },
  { id: "solomon", label: "Соломон", icon: "ui/tab-pet" },
];

export default function BottomNav({
  tab,
  onTab,
  disabled = false,
}: Props) {
  return (
      <nav
        aria-label="Навигация по дню"
        className="z-20 shrink-0 bg-[#4a1f24] px-2 pb-2 pt-2 shadow-[0_-2px_8px_rgba(0,0,0,0.35)]"
      >
      <ul className="grid grid-cols-3 gap-2">
        {TABS.map((item) => {
          const active = item.id === tab;
          // «Потратить» всегда подсвечена: это главный раздел дня, и
          // обязательные платежи ждут именно там.
          const alwaysLit = item.id === "spend";
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() => onTab(item.id)}
                className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1 py-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-60 ${
                  alwaysLit
                    ? "border-amber-200/60 bg-gradient-to-b from-orange-400 to-orange-600 text-white shadow-[0_3px_0_rgba(0,0,0,0.35)]"
                    : active
                      ? "border-amber-300 bg-[#6b2f36] text-white"
                      : "border-[#6b2f36] bg-[#3a171b] text-amber-50"
                }`}
              >
                <Icon
                  name={item.icon}
                  alt=""
                  size={22}
                  className="flex-shrink-0"
                />
                <span className="text-[11px] font-bold leading-tight">
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
