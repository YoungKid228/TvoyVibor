import PixelButton from "../../components/PixelButton";

/**
 * Панель кошелька: свободные деньги, подушка безопасности и общий баланс.
 *
 * Итоговый баланс = кошелёк + подушка — именно он попадает в шкалу оценки.
 */

type Props = {
  cash: number;
  savings: number;
  income: number;
  expenses: number;
  onSave: (amount: number) => void;
  onWithdraw: (amount: number) => void;
};

const SAVE_OPTIONS = [0, 2000, 4000];
const WITHDRAW_OPTIONS = [2000, 4000, 8000];

export default function WalletPanel({
  cash,
  savings,
  income,
  expenses,
  onSave,
  onWithdraw,
}: Props) {
  const balance = cash + savings;
  const inDebt = cash < 0;

  return (
    <section
      aria-label="Кошелёк"
      className="rounded-xl border border-stone-300 bg-white p-3 shadow-[3px_3px_0_#d6d3d1]"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div>
          <div className="text-xs text-stone-500">Кошелёк</div>
          <div
            className={`font-mono text-xl font-bold tabular-nums ${inDebt ? "text-red-700" : "text-stone-900"}`}
          >
            {cash.toLocaleString("ru-RU")} ₽
          </div>
          {inDebt && (
            <div className="text-xs font-medium text-red-700">
              Долг {Math.abs(cash).toLocaleString("ru-RU")} ₽
            </div>
          )}
        </div>
        <div>
          <div className="text-xs text-stone-500">Подушка</div>
          <div className="font-mono text-xl font-bold tabular-nums text-stone-900">
            {savings.toLocaleString("ru-RU")} ₽
          </div>
          {savings >= 4000 && (
            <div className="text-xs text-emerald-700">+1 настроения в день</div>
          )}
        </div>
        <div>
          <div className="text-xs text-stone-500">Итоговый баланс</div>
          <div className="font-mono text-xl font-bold tabular-nums text-orange-700">
            {balance.toLocaleString("ru-RU")} ₽
          </div>
        </div>
        <div className="ml-auto text-xs text-stone-500">
          <div>доход: {income.toLocaleString("ru-RU")} ₽</div>
          <div>расход: {expenses.toLocaleString("ru-RU")} ₽</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 border-t border-stone-200 pt-3">
        <div>
          <div className="mb-1 text-xs font-medium text-stone-600">
            Отложить в подушку
          </div>
          <div className="flex flex-wrap gap-1">
            {SAVE_OPTIONS.map((amount) => (
              <PixelButton
                key={`save-${amount}`}
                type="button"
                onClick={() => onSave(amount)}
                disabled={amount === 0 || cash < amount}
                className="min-h-9 px-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
              >
                {amount === 0 ? "ничего" : `${amount.toLocaleString("ru-RU")} ₽`}
              </PixelButton>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-medium text-stone-600">
            Снять из подушки
          </div>
          <div className="flex flex-wrap gap-1">
            {WITHDRAW_OPTIONS.map((amount) => (
              <PixelButton
                key={`withdraw-${amount}`}
                type="button"
                onClick={() => onWithdraw(amount)}
                disabled={savings < amount}
                className="min-h-9 px-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
              >
                {amount.toLocaleString("ru-RU")} ₽
              </PixelButton>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
