import { SCENARIOS } from "../data/scenario";
import {
  buy,
  resolveEvent,
  rest,
  saveToSavings,
  work,
} from "../core/reducer";
import type { GameState, JobId } from "../core/types";

/**
 * Типовые стратегии поведения.
 *
 * Это не «бот», а эталонные профили для проверки баланса: каждый из них
 * повторяет одноимённую стратегию `scripts/balance_sim.py` и даёт известный
 * результат. Если числа в игре разойдутся с эталоном — тесты упадут.
 */

type Policy = (state: GameState) => string[];

/**
 * Взять первую доступную смену из списка по приоритету.
 * Если лимит недели исчерпан или не хватает энергии — пробуем следующую работу,
 * как поступил бы игрок, а не сдаёмся после первой неудачи.
 */
export function tryJobs(
  state: GameState,
  order: JobId[],
): string[] {
  for (const key of order) {
    const result = work(state, key);
    if (!/^(нет |недельный|лимит|мало )/.test(result)) return [result];
  }
  return ["смен нет"];
}

/** Копилка: копит и почти не тратит. Соломон брошен — счастье падает. */
export const policySaver: Policy = (state) => {
  const acts: string[] = [];
  const scenario = SCENARIOS[state.scenarioKey];

  if (state.day === scenario.phoneDay) return [resolveEvent(state, "repair")];
  if (state.day === scenario.giftDay) return [resolveEvent(state, "small")];

  if (state.day === 1) acts.push(saveToSavings(state, 4000));
  if (state.scales.energy >= 30 && state.cash < 9000) {
    acts.push(...tryJobs(state, ["kafe", "dishes"]));
  }
  if (state.scales.hunger < 45) acts.push(buy(state, "products"));
  if (state.scales.hygiene < 45) acts.push(buy(state, "shower"));
  return acts;
};

/** Трудяга: максимум смен, никаких развлечений и никакого ухода за Соломоном. */
export const policyWorker: Policy = (state) => {
  const acts: string[] = [];
  const scenario = SCENARIOS[state.scenarioKey];

  if (state.day === scenario.phoneDay) return [resolveEvent(state, "repair")];
  if (state.day === scenario.giftDay) return [resolveEvent(state, "mid")];

  if (state.scales.energy >= 30) {
    acts.push(...tryJobs(state, ["courier", "kafe", "dishes"]));
  } else if (state.scales.energy >= 12) {
    acts.push(...tryJobs(state, ["dishes"]));
  } else {
    acts.push(rest(state));
  }
  if (state.scales.hunger < 45) acts.push(buy(state, "products"));
  if (state.scales.hygiene < 45) acts.push(buy(state, "shower"));
  return acts;
};

/** Баланс: работа в хорошей форме, отдых, Соломон, умеренные траты. */
export const policyBalanced: Policy = (state) => {
  const acts: string[] = [];
  const scenario = SCENARIOS[state.scenarioKey];

  if (state.day === scenario.phoneDay) return [resolveEvent(state, "repair")];
  if (state.day === scenario.giftDay) return [resolveEvent(state, "mid")];

  if (state.day === 1) {
    acts.push(saveToSavings(state, 2000));
    acts.push(buy(state, "kino"));
  }
  if (state.scales.energy >= 30 && state.scales.mood >= 45) {
    acts.push(...tryJobs(state, ["courier", "tutor", "kafe"]));
  } else if (state.scales.energy < 20) {
    acts.push(rest(state));
  }
  acts.push(buy(state, "pet"));
  if (state.scales.hunger < 50) acts.push(buy(state, "products"));
  if (state.scales.hygiene < 45) acts.push(buy(state, "shower"));
  if (state.day === 3) acts.push(buy(state, "park"));
  return acts;
};

/** Гедонист: развлечения и дорогие покупки в долг. Деньги кончаются. */
export const policyGecko: Policy = (state) => {
  const acts: string[] = [];
  const scenario = SCENARIOS[state.scenarioKey];

  if (state.day === scenario.phoneDay) return [resolveEvent(state, "new")];
  if (state.day === scenario.giftDay) return [resolveEvent(state, "big")];

  if (state.scales.energy < 30) {
    acts.push(rest(state));
  } else {
    acts.push(work(state, "kafe"));
  }
  acts.push(buy(state, state.day % 2 ? "bowling" : "cafe"));
  if (state.day === 2) acts.push(buy(state, "toyshop"));
  if (state.scales.hunger < 55) acts.push(buy(state, "products"));
  if (state.scales.hygiene < 45) acts.push(buy(state, "shower"));
  return acts;
};

export const POLICIES: Record<string, Policy> = {
  Копилка: policySaver,
  Трудяга: policyWorker,
  Баланс: policyBalanced,
  Гедонист: policyGecko,
};
