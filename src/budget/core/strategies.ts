import {
  buy,
  chooseTransport,
  hasInternet,
  rest,
  resolveEvent,
  saveToSavings,
} from "../core/reducer";
import type { GameState, TransportId } from "../core/types";

/**
 * Типовые стратегии поведения.
 *
 * Это не «бот», а эталонные профили для проверки баланса: каждый из них
 * повторяет одноимённую стратегию `scripts/balance_sim.py` и даёт известный
 * результат. Если числа в игре разойдутся с эталоном — тесты упадут.
 *
 * День устроен по часам, поэтому стратегия идёт по фазам:
 * утро (завтрак и дорога) → свободное время (уход, траты, развлечения) → сон.
 *
 * Заработка в игре нет: игрок — студент, и траты он делает из капитала.
 *
 * День события — обычный день: сначала закрывается событие, потом игрок
 * продолжает жить как обычно.
 */

type Policy = (state: GameState) => string[];

/**
 * Закрыть открытое событие: вариант зависит от типа события.
 * У телефона варианты repair/new/old, у подарка — big/mid/small.
 */
function closeEvent(state: GameState, phone: string, gift: string): string {
  if (!state.pendingEvent) return "";
  const choice = state.pendingEvent.id === "phone" ? phone : gift;
  return resolveEvent(state, choice);
}

/** Позавтракать и выбрать дорогу. */
function morning(
  state: GameState,
  food: "food-cheap" | "food-fast" | "food-luxe",
  transport: TransportId,
): string[] {
  const acts: string[] = [];
  if (!state.breakfastToday) acts.push(buy(state, food));
  if (!state.transportToday) acts.push(chooseTransport(state, transport));
  return acts;
}

/** Поесть из запаса, если он есть, иначе купить еду. */
function meal(state: GameState, fallback: "food-cheap" | "food-fast" | "food-luxe"): string {
  if (state.mealStock.servings > 0) return buy(state, "food-leftovers");
  return buy(state, fallback);
}

/**
 * Копилка: копит и почти не тратит, но каждый день гуляет.
 *
 * Гулять приходится: без развлечений настроение падает на 12 в день, а
 * ноль настроения — это проигрыш от депрессии.
 */
export const policySaver: Policy = (state) => {
  const acts: string[] = [];

  acts.push(...morning(state, "food-cheap", "walk"));

  if (state.phase === "free") {
    acts.push(closeEvent(state, "repair", "small"));
    // Жильё платить надо: иначе выселение.
    if (!state.housingPaid) acts.push(buy(state, "housing"));
    if (state.day === 1) acts.push(saveToSavings(state, 4000));
    // Интернет не покупает: тик-токов и игр нет.
    // Еда — из запаса: он остался от завтрака.
    acts.push(meal(state, "food-cheap"));
    // Развлечение — ровно одно в день, иначе Соломон впадёт в депрессию.
    acts.push(buy(state, "park"));
    // Ласка — бесплатно, а настроение поднимает.
    acts.push(buy(state, "pet"));
    // Мытьё — до того, как Соломон станет сильно грязным: грязного не
    // пускают в транспорт, а Соломон ещё и хуже спит.
    if (state.scales.cleanliness < 25) acts.push(buy(state, "wash"));
  }

  acts.push(rest(state));
  return acts;
};

/** Ученик: учится и ест в кафе, развлекается через день. */
export const policyStudent: Policy = (state) => {
  const acts: string[] = [];

  acts.push(...morning(state, "food-fast", "bus"));

  if (state.phase === "free") {
    acts.push(closeEvent(state, "repair", "mid"));
    if (!state.housingPaid) acts.push(buy(state, "housing"));
    acts.push(meal(state, "food-fast"));
    // Уроки каждый день: без них Соломону тяжело.
    acts.push(buy(state, "lessons"));
    // Развлечение — через день: без него настроение дойдёт до нуля.
    if (state.day % 2 === 1) acts.push(buy(state, "park"));
    // Мытьё — до того, как Соломон станет сильно грязным: грязного не
    // пускают в автобус, такси и кафе.
    if (state.scales.cleanliness < 45) acts.push(buy(state, "wash"));
  }

  acts.push(rest(state));
  return acts;
};

/** Баланс: уроки, уход за Соломоном, умеренные траты и развлечения. */
export const policyBalanced: Policy = (state) => {
  const acts: string[] = [];

  acts.push(...morning(state, "food-cheap", "bus"));

  if (state.phase === "free") {
    acts.push(closeEvent(state, "repair", "mid"));
    if (!state.housingPaid) acts.push(buy(state, "housing"));
    if (!hasInternet(state)) acts.push(buy(state, "internet"));
    // Уроки каждый день: без них Соломону тяжело.
    acts.push(buy(state, "lessons"));
    // Уход за Соломоном: он грустит, когда за ним не смотрят.
    acts.push(buy(state, "pet"));
    // Чистота общая: одного мытья хватает и за игрока, и за Соломона.
    if (state.scales.cleanliness < 60) acts.push(buy(state, "wash"));
    // Второй приём пищи: сон опускает сытость, без еды Соломон голодает.
    acts.push(meal(state, "food-fast"));
    // Раз в два дня — прогулка в парке.
    if (state.day % 2 === 0) acts.push(buy(state, "park"));
  }

  acts.push(rest(state));
  return acts;
};

/** Гедонист: дорогая еда, такси, кино и щедрые подарки. Деньги кончаются. */
export const policyGecko: Policy = (state) => {
  const acts: string[] = [];

  acts.push(...morning(state, "food-luxe", "taxi"));

  if (state.phase === "free") {
    acts.push(closeEvent(state, "new", "big"));
    if (!state.housingPaid) acts.push(buy(state, "housing"));
    if (!hasInternet(state)) acts.push(buy(state, "internet"));
    if (state.day % 2 === 1) acts.push(buy(state, "kino"));
    acts.push(buy(state, "park"));
    acts.push(meal(state, "food-luxe"));
    // Грязного Соломона не пускают в такси, кино и ресторан, поэтому
    // богатый игрок тоже моется — иначе он останется без дороги.
    if (state.scales.cleanliness < 45) acts.push(buy(state, "wash"));
  }

  acts.push(rest(state));
  return acts;
};

export const POLICIES: Record<string, Policy> = {
  Копилка: policySaver,
  Ученик: policyStudent,
  Баланс: policyBalanced,
  Гедонист: policyGecko,
};
