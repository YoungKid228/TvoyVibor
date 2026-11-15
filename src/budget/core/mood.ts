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
 * Обрезать все шкалы в диапазон 0…100.
 *
 * Обрезка живёт в ядре, а не только при отрисовке (`ScalePanel`). Пока шкала
 * может уйти за потолок, доход считается от неверного значения (при настроении
 * 150 курьер даёт 2 000 ₽ вместо 1 600), а игрок видит одно число, а модель —
 * другое. Это самый дорогой вид расхождения в обучающей игре.
 */
export function clampScales(state: GameState): void {
  const scales = state.scales;
  scales.mood = Math.max(0, Math.min(100, scales.mood));
  scales.energy = Math.max(0, Math.min(100, scales.energy));
  scales.hunger = Math.max(0, Math.min(100, scales.hunger));
  scales.hygiene = Math.max(0, Math.min(100, scales.hygiene));
  scales.solomon = Math.max(0, Math.min(100, scales.solomon));
  scales.cleanliness = Math.max(0, Math.min(100, scales.cleanliness));
}

/**
 * Вариант спрайта Соломона по загрязнению.
 *
 * 0 — чистый, 1 — слегка грязный, 2 — сильно грязный. Границы те же, что
 * в эталоне (`scripts/balance_sim.py`): вариант одновременно и рисуется,
 * и определяет, насколько сильно Соломон скучает.
 */
export function dirtVariant(cleanliness: number): 0 | 1 | 2 {
  if (cleanliness >= RULES.cleanAt) return 0;
  if (cleanliness > RULES.dirtyAt) return 1;
  return 2;
}

/** Текстовое имя состояния загрязнения — для подписи под шкалой. */
export function dirtLabel(cleanliness: number): string {
  switch (dirtVariant(cleanliness)) {
    case 0:
      return "чистый";
    case 1:
      return "слегка грязный";
    default:
      return "сильно грязный";
  }
}

/** Добавить репутацию с учётом потолка: выше потолка она ничего не даёт. */
export function addRep(state: GameState, amount: number): void {
  state.rep = Math.max(0, Math.min(RULES.repCap, state.rep + amount));
}

/**
 * Ежедневный спад шкал и их взаимные связи.
 *
 * Порядок важен и повторяет эталон: сначала голод и гигиена, потом скука,
 * потом штрафы за голод/гигиену/долг, потом бонусы, и только потом связь
 * «хозяин → Соломон → хозяин».
 *
 * Возвращает список причин изменения шкал — для обратной связи игроку.
 * Для учебной игры причинность важнее всего остального: без неё игрок
 * видит только сумму шкалы и не понимает, что его наказало.
 */
export function decay(state: GameState): string[] {
  const scenario = SCENARIOS[state.scenarioKey];
  const scales = state.scales;
  const notes: string[] = [];

  scales.hunger = Math.max(0, scales.hunger - scenario.hungerDecay);
  const hygieneDecay = state.items.includes("washer")
    ? Math.floor(scenario.hygieneDecay / 2)
    : scenario.hygieneDecay;
  scales.hygiene = Math.max(0, scales.hygiene - hygieneDecay);

  scales.mood -= RULES.boringDaily;
  notes.push(`настроение −${RULES.boringDaily}: скука`);
  if (scales.hunger === 0) {
    scales.mood -= RULES.hungerPenalty;
    notes.push(`настроение −${RULES.hungerPenalty}: голод`);
  }
  if (scales.hygiene === 0) {
    scales.mood -= RULES.hygienePenalty;
    notes.push(`настроение −${RULES.hygienePenalty}: грязь`);
  }
  if (state.cash < 0) {
    scales.mood -= RULES.debtDailyMoodPenalty;
    notes.push(`настроение −${RULES.debtDailyMoodPenalty}: долг`);
  }
  if (state.savings >= RULES.saveBonusAt) {
    scales.mood += RULES.saveBonus;
    notes.push(`настроение +${RULES.saveBonus}: подушка 4 000 ₽`);
  }
  if (isGymActive(state)) {
    scales.mood += 1;
    notes.push("настроение +1: абонемент в зал");
  }

  // Соломон скучает без ухода, а несчастливый хозяин запускает его ещё сильнее.
  // Грязный Соломон скучает сильнее: спрайт пачкается, и это видно игроку.
  scales.cleanliness = Math.max(
    0,
    scales.cleanliness - scenario.cleanlinessDecay,
  );
  const dirt = dirtVariant(scales.cleanliness);
  scales.solomon -= scenario.solomonDecay + dirt;
  if (dirt > 0) {
    notes.push(`Соломон −${dirt}: грязный`);
  }
  if (scales.mood < RULES.gloomyOwnerMood) {
    scales.solomon -= 2;
    notes.push("Соломон −2: хозяин несчастен");
  }
  if (scales.solomon >= RULES.solomonUpAt) {
    scales.mood += RULES.solomonUp;
    notes.push(`настроение +${RULES.solomonUp}: довольный Соломон`);
  } else if (scales.solomon <= 25) {
    scales.mood += RULES.solomonDown;
    notes.push(`настроение ${RULES.solomonDown}: Соломон грустит`);
  }

  clampScales(state);
  return notes;
}

/**
 * Действует ли абонемент в зал.
 *
 * Абонемент имеет срок (2 недели с покупки): иначе 2 500 ₽ дают +1 настроения
 * каждый день навсегда — покупка не требует ни стратегии, ни действий.
 */
export function isGymActive(state: GameState): boolean {
  if (!state.items.includes("gym")) return false;
  const bought = state.itemDays.gym ?? state.day;
  return state.day - bought < RULES.gymDays;
}

/**
 * Сон: возвращает энергию и немного поднимает настроение.
 *
 * Не чаще раза в день: сон даёт +45 энергии бесплатно, а без ограничения
 * энергия становится неограниченным ресурсом и обходит все остальные лимиты
 * вместе с собой. Лимит — именно суточный счётчик, а не следствие энергии:
 * иначе «сон → энергия → снова сон» снова станет бесконечным циклом.
 */
export function sleep(state: GameState): string {
  if (state.sleepsToday >= RULES.sleepPerDay) {
    return "сон уже был сегодня";
  }
  state.sleepsToday += 1;
  state.scales.energy = Math.min(100, state.scales.energy + RULES.sleepEnergy);
  state.scales.mood = Math.min(100, state.scales.mood + RULES.sleepMood);
  clampScales(state);
  return "сон";
}
