import { RULES } from "../data/scenario";
import type { GameState, SpendCategory } from "./types";

/**
 * Деньги. Единственное место, где считается арифметика кошелька.
 * Повторяет `scripts/balance_sim.py` 1:1, включая порядок операций.
 */

/** Хватает ли денег с учётом подушки безопасности. */
export function canPay(state: GameState, amount: number): boolean {
  return state.cash >= amount || state.savings >= amount - state.cash;
}

/**
 * Оплата. Если в кошельке не хватает — добираем из подушки.
 * Возвращает текст действия для журнала.
 */
export function pay(
  state: GameState,
  amount: number,
  category?: SpendCategory,
): string {
  if (state.cash >= amount) {
    state.cash -= amount;
    state.expenses += amount;
    if (category) state.spentByCategory[category] += amount;
    return `-${amount}`;
  }
  if (state.savings >= amount - state.cash) {
    const take = amount - state.cash;
    state.savings -= take;
    state.cash -= amount - take;
    state.expenses += amount;
    if (category) state.spentByCategory[category] += amount;
    return `-${amount} (из подушки ${take})`;
  }
  return "нет денег";
}

/**
 * Покупка в долг: кошелёк уходит в минус, настроение падает.
 * Так игрок сам видит последствия — итоговый разбор их подсвечивает.
 */
export function payOnCredit(
  state: GameState,
  amount: number,
  category?: SpendCategory,
): string {
  state.cash -= amount;
  state.debt += amount;
  state.expenses += amount;
  if (category) state.spentByCategory[category] += amount;
  state.scales.mood = Math.max(
    0,
    state.scales.mood - RULES.creditMoodPenalty,
  );
  return `-${amount} (в долг)`;
}

/**
 * Оплатить списание: сначала кошелёк, потом подушка, иначе — долг.
 * Именно так ведёт себя эталонный симулятор.
 */
export function payFlexible(
  state: GameState,
  amount: number,
  category?: SpendCategory,
): string {
  if (canPay(state, amount)) return pay(state, amount, category);
  return payOnCredit(state, amount, category);
}

/** Отложить деньги в подушку безопасности. */
export function save(state: GameState, amount: number): string {
  if (state.cash < amount) return "нет денег";
  state.cash -= amount;
  state.savings += amount;
  state.spentByCategory["накопления"] += amount;
  return `подушка +${amount}`;
}

/** Снять из подушки безопасности. */
export function withdraw(state: GameState, amount: number): string {
  if (state.savings < amount) return "нет денег";
  state.savings -= amount;
  state.cash += amount;
  return `из подушки +${amount}`;
}

/** Итоговый баланс = кошелёк + подушка. Именно он идёт в шкалу оценки. */
export function finalBalance(state: GameState): number {
  return state.cash + state.savings;
}
