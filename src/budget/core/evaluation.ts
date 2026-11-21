import { OBLIGATORY_TOTAL } from "../data/scenario";
import { finalBalance } from "./finance";
import { pythonRound } from "./rounding";
import type { ExpenseAudit, GameState, GameStats } from "./types";

/**
 * Итоговая оценка: две оси (деньги и счастье), общий вердикт и разбор расходов.
 * Повторяет `scripts/balance_sim.py`.
 */

/**
 * Оценка по деньгам.
 *
 * Шкала сдвинута под новую модель: заработка в игре нет, деньги только
 * копятся из капитала, поэтому «хороший результат» — это 8 000 ₽ на руках.
 */
export function moneyGrade(balance: number): string {
  if (balance >= 12000) return "Отличный результат";
  if (balance >= 8000) return "Хороший результат";
  if (balance >= 0) return "Есть над чем поработать";
  return "Бюджет ушёл в минус";
}

/** Оценка шкалы счастья игрока. */
export function moodGrade(mood: number): string {
  if (mood >= 75) return "Настроение отличное";
  if (mood >= 50) return "Настроение хорошее";
  if (mood >= 25) return "Настроение так себе";
  return "Настроение плохое";
}

/** Итоговый вердикт: деньги И настроение. Худшее из двух. */
export function overallGrade(balance: number, mood: number): string {
  const moneyOk = balance >= 8000;
  const moodOk = mood >= 50;
  if (moneyOk && moodOk) return "Успех: и деньги есть, и настроение хорошее";
  if (moneyOk) return "Деньги есть, но настроение провалилось";
  if (moodOk) return "Настроение хорошее, но денег нет";
  return "Провал: ни денег, ни настроения";
}

/**
 * Проверка расходов: как игрок распорядился деньгами.
 *
 * Это то, что игрок видит на экране «Финансовый итог»: разбор не только по
 * остатку, но и по структуре трат. Накопления в долю трат не входят: это не
 * расход, а перевод денег в резерв.
 */
export function expenseAudit(state: GameState): ExpenseAudit {
  const items = state.spentByCategory;
  const spentTotal = Object.entries(items)
    .filter(([key]) => key !== "накопления")
    .reduce((sum, [, value]) => sum + value, 0);
  const obligatory = items["обязательные"];
  const discretionary = spentTotal - obligatory;
  const share = spentTotal > 0 ? discretionary / spentTotal : 0;

  const checks = {
    obligatoryCovered: obligatory >= OBLIGATORY_TOTAL,
    optionalShare: pythonRound(share, 3),
    noDebt: state.cash >= 0,
    hasSavings: state.savings >= 2000,
    walletNotEmpty: state.cash > 0,
  };

  // Все нарушения перечисляются, а не только первое: вердикт-заголовок
  // перекрывал остальные, и игрок не видел, что у него ещё долг и
  // 90 % необязательных трат.
  const violations: string[] = [];
  if (!checks.obligatoryCovered) {
    violations.push("обязательные расходы не покрыты");
  }
  if (!checks.noDebt) {
    violations.push("есть долг");
  }
  if (share > 0.6) {
    violations.push("доля необязательных трат выше 60 %");
  }
  if (!checks.hasSavings) {
    violations.push("нет финансовой подушки");
  }
  if (!checks.walletNotEmpty) {
    violations.push("кошелёк пуст");
  }

  let verdict: string;
  if (!checks.obligatoryCovered) {
    verdict = "Обязательные расходы не покрыты";
  } else if (!checks.noDebt) {
    verdict = "Расходы превысили доходы";
  } else if (share > 0.6) {
    verdict = "Траты ушли далеко за рамки необходимого";
  } else if (checks.hasSavings && checks.walletNotEmpty) {
    verdict = "Расходы распределены грамотно";
  } else {
    verdict = "Расходы покрыты, но резерв не создан";
  }

  return { ...checks, verdict, violations, byCategory: { ...items } };
}

/** Сводные итоги игры. */
export function stats(state: GameState): GameStats {
  const entries = state.log;
  const avgMood =
    entries.reduce((sum, entry) => sum + entry.mood, 0) / (entries.length || 1);
  const avgCleanliness =
    entries.reduce((sum, entry) => sum + entry.cleanliness, 0) /
    (entries.length || 1);
  const balance = finalBalance(state);
  const audit = expenseAudit(state);

  return {
    finalBalance: balance,
    cash: state.cash,
    savings: state.savings,
    avgMood: pythonRound(avgMood, 1),
    avgCleanliness: pythonRound(avgCleanliness, 1),
    income: state.income,
    expenses: state.expenses,
    moneyGrade: moneyGrade(balance),
    moodGrade: moodGrade(Math.round(avgMood)),
    verdict: overallGrade(balance, Math.round(avgMood)),
    audit,
  };
}
