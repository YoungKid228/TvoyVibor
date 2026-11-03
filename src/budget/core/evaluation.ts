import { RULES, SCENARIOS } from "../data/scenario";
import { finalBalance } from "./finance";
import { pythonRound } from "./rounding";
import type { ExpenseAudit, GameState, GameStats } from "./types";

/**
 * Итоговая оценка: две оси (деньги и счастье), общий вердикт и разбор расходов.
 * Повторяет `scripts/balance_sim.py`.
 */

/** Оценка по деньгам — шкала из исходного документа. */
export function moneyGrade(balance: number): string {
  if (balance >= 7000) return "Отличный результат";
  if (balance >= 3000) return "Хороший результат";
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

/** Оценка качества жизни по настроению Соломона. */
export function solomonGrade(solomon: number): string {
  if (solomon >= 75) return "Соломон доволен";
  if (solomon >= 50) return "Соломон спокоен";
  if (solomon >= 25) return "Соломон скучает";
  return "Соломон грустит";
}

/** Итоговый вердикт: деньги И качество жизни. Худшее из двух. */
export function overallGrade(balance: number, solomon: number): string {
  const moneyOk = balance >= 3000;
  const solomonOk = solomon >= RULES.solomonHappy;
  if (moneyOk && solomonOk) return "Успех: и деньги есть, и Соломон счастлив";
  if (moneyOk) return "Деньги есть, но Соломон несчастлив";
  if (solomonOk) return "Соломон счастлив, но денег нет";
  return "Провал: ни денег, ни счастья";
}

/**
 * Проверка расходов: как игрок распорядился деньгами.
 *
 * Это то, что игрок видит на экране «Финансовый итог»: разбор не только по
 * остатку, но и по структуре трат. Накопления в долю трат не входят: это не
 * расход, а перевод денег в резерв.
 */
export function expenseAudit(state: GameState): ExpenseAudit {
  const scenario = SCENARIOS[state.scenarioKey];
  const items = state.spentByCategory;
  const spentTotal = Object.entries(items)
    .filter(([key]) => key !== "накопления")
    .reduce((sum, [, value]) => sum + value, 0);
  const obligatory = items["обязательные"];
  const discretionary = spentTotal - obligatory;
  const share = spentTotal > 0 ? discretionary / spentTotal : 0;

  const checks = {
    obligatoryCovered: obligatory >= scenario.mandatoryTotal,
    optionalShare: pythonRound(share, 3),
    noDebt: state.cash >= 0,
    hasSavings: state.savings >= 2000,
    walletNotEmpty: state.cash > 0,
  };

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

  return { ...checks, verdict, byCategory: { ...items } };
}

/** Сводные итоги игры. */
export function stats(state: GameState): GameStats {
  const entries = state.log;
  const avgMood =
    entries.reduce((sum, entry) => sum + entry.mood, 0) / (entries.length || 1);
  const avgSolomon =
    entries.reduce((sum, entry) => sum + entry.solomon, 0) / (entries.length || 1);
  const balance = finalBalance(state);
  const audit = expenseAudit(state);

  return {
    finalBalance: balance,
    cash: state.cash,
    savings: state.savings,
    avgMood: pythonRound(avgMood, 1),
    avgSolomon: pythonRound(avgSolomon, 1),
    shifts: state.shifts,
    income: state.income,
    expenses: state.expenses,
    moneyGrade: moneyGrade(balance),
    moodGrade: moodGrade(Math.round(avgMood)),
    solomonGrade: solomonGrade(Math.round(avgSolomon)),
    verdict: overallGrade(balance, Math.round(avgSolomon)),
    audit,
  };
}
