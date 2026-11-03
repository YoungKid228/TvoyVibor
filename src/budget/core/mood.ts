import { RULES, SCENARIOS } from "../data/scenario";
import type { GameState } from "./types";

/**
 * Шкалы: ежедневный спад, множитель дохода, выгорание, связь с Соломоном.
 *
 * Правило «настроение влияет на доход» нельзя размазывать по UI — поэтому
 * весь расчёт живёт здесь. Повторяет `scripts/balance_sim.py`.
 */

/** Множитель дохода от настроения: 0.5 при 0 → 1.0 при 100. */
export function incomeMultiplier(mood: number): number {
  return 0.5 + (0.5 * mood) / 100;
}

/**
 * Доход округляется до 50 ₽ — как реальные выплаты.
 *
 * Округление половины — к чётному, как в Python (`round`): 825 / 50 = 16.5 →
 * 16 → 800 ₽, а не 850. Иначе код игры разошёлся бы с эталоном
 * `scripts/balance_sim.py` на 50 ₽ за смену.
 */
export function round50(value: number): number {
  const quotient = value / 50;
  const floor = Math.floor(quotient);
  const diff = quotient - floor;
  if (diff > 0.5) return (floor + 1) * 50;
  if (diff < 0.5) return floor * 50;
  // Ровно половина — к чётному, как в Python.
  return (floor % 2 === 0 ? floor : floor + 1) * 50;
}

/** Фактическая оплата смены с учётом настроения и выгорания. */
export function shiftPay(base: number, mood: number): number {
  const burnt = mood < RULES.burnoutMood;
  const rate = burnt ? RULES.burnoutRate : 1;
  return round50(base * incomeMultiplier(mood) * rate);
}

/** Идёт ли выгорание: настроение ниже порога. */
export function isBurntOut(mood: number): boolean {
  return mood < RULES.burnoutMood;
}

/**
 * Ежедневный спад шкал и их взаимные связи.
 *
 * Порядок важен и повторяет эталон: сначала голод и гигиена, потом скука,
 * потом штрафы за голод/гигиену/долг, потом бонусы, и только потом связь
 * «хозяин → Соломон → хозяин».
 */
export function decay(state: GameState): void {
  const scenario = SCENARIOS[state.scenarioKey];
  const scales = state.scales;

  scales.hunger = Math.max(0, scales.hunger - scenario.hungerDecay);
  const hygieneDecay = state.items.includes("washer")
    ? Math.floor(scenario.hygieneDecay / 2)
    : scenario.hygieneDecay;
  scales.hygiene = Math.max(0, scales.hygiene - hygieneDecay);

  scales.mood -= RULES.boringDaily;
  if (scales.hunger === 0) scales.mood -= RULES.hungerPenalty;
  if (scales.hygiene === 0) scales.mood -= RULES.hygienePenalty;
  if (state.cash < 0) scales.mood -= RULES.debtDailyMoodPenalty;
  if (state.savings >= RULES.saveBonusAt) scales.mood += RULES.saveBonus;
  if (state.items.includes("gym")) scales.mood += 1;

  // Соломон скучает без ухода, а несчастный хозяин запускает его ещё сильнее.
  scales.solomon -= scenario.solomonDecay;
  if (scales.mood < RULES.gloomyOwnerMood) scales.solomon -= 2;
  if (scales.solomon >= RULES.solomonUpAt) {
    scales.mood += RULES.solomonUp;
  } else if (scales.solomon <= 25) {
    scales.mood += RULES.solomonDown;
  }

  scales.solomon = Math.max(0, Math.min(100, scales.solomon));
  scales.mood = Math.max(0, Math.min(100, scales.mood));
}

/** Сон: возвращает энергию и немного поднимает настроение. */
export function sleep(state: GameState): string {
  state.scales.energy = Math.min(100, state.scales.energy + RULES.sleepEnergy);
  state.scales.mood = Math.min(100, state.scales.mood + RULES.sleepMood);
  return "сон";
}
