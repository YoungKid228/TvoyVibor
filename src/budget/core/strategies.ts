import {
  buy,
  chooseTransport,
  hasInternet,
  rest,
  resolveEvent,
  saveToSavings,
  work,
} from "../core/reducer";
import type { GameState, JobId, TransportId } from "../core/types";

/**
 * Типовые стратегии поведения.
 *
 * Это не «бот», а эталонные профили для проверки баланса: каждый из них
 * повторяет одноимённую стратегию `scripts/balance_sim.py` и даёт известный
 * результат. Если числа в игре разойдутся с эталоном — тесты упадут.
 *
 * День устроен по часам, поэтому стратегия идёт по фазам:
 * утро (завтрак и дорога) → свободное время (работа, уход, траты) → сон.
 *
 * День события — обычный день: сначала закрывается событие, потом игрок
 * продолжает жить как обычно.
 */

type Policy = (state: GameState) => string[];

/**
 * Взять первую доступную смену из списка по приоритету.
 * Если лимит недели исчерпан или не хватает энергии — пробуем следующую работу,
 * как поступил бы игрок, а не сдаёмся после первой неудачи.
 */
export function tryJobs(state: GameState, order: JobId[]): string[] {
  for (const key of order) {
    const result = work(state, key);
    if (!/^(нет |недельный|лимит|мало |нужен |лаборантом|работать|не хватит)/.test(result)) {
      return [result];
    }
  }
  return ["смен нет"];
}

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

/** Копилка: копит и почти не тратит. Соломон брошен — счастье падает. */
export const policySaver: Policy = (state) => {
  const acts: string[] = [];

  acts.push(...morning(state, "food-cheap", "walk"));

  if (state.phase === "free") {
    acts.push(closeEvent(state, "repair", "small"));
    // Жильё платить надо: иначе выселение.
    if (!state.housingPaid) acts.push(buy(state, "housing"));
    if (state.day === 1) acts.push(saveToSavings(state, 4000));
    // Интернет не покупает: работает только лаборантом.
    acts.push(...tryJobs(state, ["lab"]));
    if (state.scales.hunger < 45 || state.scales.energy < 40) {
      acts.push(buy(state, "food-cheap"));
    }
  }

  acts.push(rest(state));
  return acts;
};

/** Трудяга: максимум смен, никаких развлечений и никакого ухода за Соломоном. */
export const policyWorker: Policy = (state) => {
  const acts: string[] = [];

  acts.push(...morning(state, "food-fast", "bus"));

  if (state.phase === "free") {
    acts.push(closeEvent(state, "repair", "mid"));
    if (!state.housingPaid) acts.push(buy(state, "housing"));
    if (!hasInternet(state)) acts.push(buy(state, "internet"));
    acts.push(...tryJobs(state, ["courier", "tutor", "lab"]));
    if (state.scales.hunger < 50) acts.push(buy(state, "food-fast"));
  }

  acts.push(rest(state));
  return acts;
};

/** Баланс: работа в хорошей форме, уход за Соломоном, умеренные траты. */
export const policyBalanced: Policy = (state) => {
  const acts: string[] = [];

  acts.push(...morning(state, "food-cheap", "bus"));

  if (state.phase === "free") {
    acts.push(closeEvent(state, "repair", "mid"));
    if (!state.housingPaid) acts.push(buy(state, "housing"));
    if (!hasInternet(state)) acts.push(buy(state, "internet"));
    // Уроки каждый день: три дня подряд открывают репетиторство.
    acts.push(buy(state, "lessons"));
    acts.push(...tryJobs(state, ["courier", "tutor", "lab"]));
    // Уход за Соломоном: он грустит, когда за ним не смотрят.
    acts.push(buy(state, "pet"));
    // Чистота общая: одного мытья хватает и за игрока, и за Соломона.
    if (state.scales.cleanliness < 60) acts.push(buy(state, "wash"));
    else if (state.scales.cleanliness < 80) acts.push(buy(state, "shower"));
    if (state.scales.hunger < 60 || state.scales.energy < 45) {
      acts.push(buy(state, state.preparedMeal ? "food-leftovers" : "food-fast"));
    }
    if (state.day % 2 === 0) acts.push(buy(state, "park"));
  }

  acts.push(rest(state));
  return acts;
};

/** Гедонист: развлечения и дорогие покупки в долг. Деньги кончаются. */
export const policyGecko: Policy = (state) => {
  const acts: string[] = [];

  acts.push(...morning(state, "food-luxe", "taxi"));

  if (state.phase === "free") {
    acts.push(closeEvent(state, "new", "big"));
    if (!state.housingPaid) acts.push(buy(state, "housing"));
    if (!hasInternet(state)) acts.push(buy(state, "internet"));
    acts.push(buy(state, "kino"));
    acts.push(buy(state, "park"));
    acts.push(...tryJobs(state, ["courier", "lab"]));
    if (state.scales.hunger < 60 || state.scales.energy < 45) {
      acts.push(buy(state, "food-luxe"));
    }
  }

  acts.push(rest(state));
  return acts;
};

export const POLICIES: Record<string, Policy> = {
  Копилка: policySaver,
  Трудяга: policyWorker,
  Баланс: policyBalanced,
  Гедонист: policyGecko,
};
