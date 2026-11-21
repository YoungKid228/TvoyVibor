import PixelButton from "../../components/PixelButton";

/**
 * Панель кошелька: свободные деньги, подушка безопасности и общий баланс.
 *
 * Итоговый баланс = кошелёк + подушка — именно он попадает в шкалу оценки.
 *
 * Панель живёт в шторке на телефоне, поэтому три суммы стоят в одну строку:
 * отдельными блоками они не помещались и съедали место карточек действий.
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
      className="rounded-xl border border-stone-300 bg-white p-2.5 shadow-[3px_3px_0_#d6d3d1]"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-stone-500">Кошелёк</div>
          <div
            className={`font-mono text-base font-bold tabular-nums ${inDebt ? "text-red-700" : "text-stone-900"}`}
          >
            {cash.toLocaleString("ru-RU")} ₽
          </div>
          {inDebt && (
            <div className="text-[10px] font-medium text-red-700">
              Долг {Math.abs(cash).toLocaleString("ru-RU")} ₽
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-stone-500">Подушка</div>
          <div className="font-mono text-base font-bold tabular-nums text-stone-900">
            {savings.toLocaleString("ru-RU")} ₽
          </div>
          {savings >= 4000 && (
            <div className="text-[10px] text-emerald-700">
              +1 настроения в день
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-stone-500">Итог</div>
          <div className="font-mono text-base font-bold tabular-nums text-orange-700">
            {balance.toLocaleString("ru-RU")} ₽
          </div>
          <div className="text-[10px] text-stone-500">
            расход: {expenses.toLocaleString("ru-RU")} ₽
          </div>
        </div>
      </div>

      {/* Заработка в игре нет, поэтому доход всегда нулевой и показывать
          его рядом с суммами незачем. */}
      {income !== 0 && (
        <div className="text-[11px] text-stone-500">
          доход: {income.toLocaleString("ru-RU")} ₽
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2 border-t border-stone-200 pt-2">
        <div>
          <div className="mb-1 text-[11px] font-medium text-stone-600">
            Отложить в подушку
          </div>
          <div className="flex flex-wrap gap-1">
            {SAVE_OPTIONS.map((amount) => (
              <PixelButton
                key={`save-${amount}`}
                type="button"
                onClick={() => onSave(amount)}
                disabled={amount === 0 || cash < amount}
                className="min-h-11 px-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
              >
                {amount === 0 ? "ничего" : `${amount.toLocaleString("ru-RU")} ₽`}
              </PixelButton>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium text-stone-600">
            Снять из подушки
          </div>
          <div className="flex flex-wrap gap-1">
            {WITHDRAW_OPTIONS.map((amount) => (
              <PixelButton
                key={`withdraw-${amount}`}
                type="button"
                onClick={() => onWithdraw(amount)}
                disabled={savings < amount}
                className="min-h-11 px-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
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
