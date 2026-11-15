import { RULES, SCENARIOS } from "../data/scenario";
import type { GameState } from "./types";

/**
 * Шкалы: ежедневный спад, множитель дохода, выгорание, сон.
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
 * 150 курьер давал 2 000 ₽ вместо 1 600), а игрок видит одно число, а модель —
 * другое. Это самый дорогой вид расхождения в обучающей игре.
 */
export function clampScales(state: GameState): void {
  const scales = state.scales;
  scales.mood = Math.max(0, Math.min(100, scales.mood));
  scales.energy = Math.max(0, Math.min(100, scales.energy));
  scales.hunger = Math.max(0, Math.min(100, scales.hunger));
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
  scales.cleanliness = Math.max(
    0,
    scales.cleanliness - scenario.cleanlinessDecay,
  );

  // Настроение общее: и скука, и брошенный Соломон бьют по нему.
  scales.mood -= RULES.boringDaily + RULES.petNeglectMood;
  notes.push(`настроение −${RULES.boringDaily}: скука`);
  notes.push(
    `настроение −${RULES.petNeglectMood}: Соломон скучает без ухода`,
  );
  if (scales.hunger === 0) {
    scales.mood -= RULES.hungerPenalty;
    notes.push(`настроение −${RULES.hungerPenalty}: голод`);
  }
  if (scales.cleanliness === 0) {
    scales.mood -= RULES.hygienePenalty;
    notes.push(`настроение −${RULES.hygienePenalty}: грязь`);
  }
  if (state.savings >= RULES.saveBonusAt) {
    scales.mood += RULES.saveBonus;
    notes.push(`настроение +${RULES.saveBonus}: подушка 4 000 ₽`);
  }
  // Грязный Соломон — общая грязь: это видно на спрайте и бьёт по настроению.
  const dirt = dirtVariant(scales.cleanliness);
  if (dirt > 0) {
    scales.mood -= dirt;
    notes.push(`настроение −${dirt}: Соломон грязный`);
  }

  clampScales(state);
  return notes;
}

/**
 * Множители восстановления во сне.
 *
 * Сон восстанавливает энергию и сытость не полностью: качество сна зависит
 * от двух вещей — насколько сыт хозяин и насколько чист Соломон.
 *
 * Голодный и грязный Соломон — это затяжная спираль: сон восстанавливает
 * мало, поэтому на следующий день сил меньше, а еда и мытьё стоят денег
 * и времени, которых тоже не хватает.
 */
export function sleepFactors(state: GameState): {
  energy: number;
  clean: number;
} {
  const scales = state.scales;
  const clean =
    scales.cleanliness >= RULES.cleanAt
      ? RULES.cleanFactorGood
      : scales.cleanliness > RULES.dirtyAt
        ? RULES.cleanFactorWeak
        : RULES.cleanFactorBad;
  return { energy: clean, clean };
}

/**
 * Сон: возвращает энергию и сытость и немного поднимает настроение.
 *
 * Не чаще раза в день: сон даёт до 60 энергии бесплатно, а без ограничения
 * энергия становится неограниченным ресурсом и обходит все остальные лимиты
 * вместе с собой. Лимит — именно суточный счётчик, а не следствие энергии:
 * иначе «сон → энергия → снова сон» снова станет бесконечным циклом.
 *
 * Сон — обязательное условие конца дня: без него день не закрывается.
 */
export function sleep(state: GameState): string {
  if (state.sleepsToday >= RULES.sleepPerDay) {
    return "сон уже был сегодня";
  }
  state.sleepsToday += 1;
  const factors = sleepFactors(state);
  const energy = Math.round(RULES.sleepEnergy * factors.energy);
  // Сон не восстанавливает сытость — наоборот, опускает её.
  const hungerLoss = Math.min(state.scales.hunger, RULES.sleepHunger);
  state.scales.energy = Math.min(100, state.scales.energy + energy);
  state.scales.hunger = Math.max(0, state.scales.hunger - hungerLoss);
  state.scales.mood = Math.min(100, state.scales.mood + RULES.sleepMood);
  clampScales(state);
  const notes: string[] = [`сон: энергия +${energy}, сытость −${hungerLoss}`];
  if (factors.clean < RULES.cleanFactorGood) {
    notes.push(
      `сон хуже обычного: Соломон ${dirtLabel(state.scales.cleanliness)} (×${factors.clean})`,
    );
  }
  state.dayNotes.push(...notes);
  return "сон";
}

/** Пары: обязательный блок дня, который отнимает силы. */
export function classes(state: GameState): string[] {
  const notes: string[] = [];
  state.scales.energy = Math.max(
    0,
    state.scales.energy - RULES.classesEnergyCost,
  );
  state.scales.mood = Math.max(0, state.scales.mood - RULES.classesMoodCost);
  notes.push(`энергия −${RULES.classesEnergyCost}: пары`);
  clampScales(state);
  return notes;
}
