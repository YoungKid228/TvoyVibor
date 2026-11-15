import {
  buy,
  chooseTransport,
  createInitialState,
  endDay,
  rest,
  startDay,
} from "../../src/budget/core/reducer";
import type { GameState } from "../../src/budget/core/types";

/**
 * Состояние, готовое к свободному времени.
 *
 * День начинается с утра: сначала завтрак, потом дорога на пары — и только
 * потом открывается свободное время, где доступны работа, траты и уход.
 */
export function freeTimeState(): GameState {
  const state = createInitialState();
  startDay(state);
  buy(state, "food-cheap");
  chooseTransport(state, "bus");
  return state;
}

/**
 * Состояние на начало указанного дня.
 *
 * Каждый предыдущий день проживается полностью: завтрак, дорога, еда и
 * сон. Нужно, чтобы проверить сроки (жильё, интернет) и проигрыш.
 */
export function stateOnDay(day: number, payHousing = true): GameState {
  const state = createInitialState();
  for (let index = 1; index < day; index += 1) {
    startDay(state);
    buy(state, "food-cheap");
    chooseTransport(state, "bus");
    // Жильё оплачиваем: иначе на пятом дне игру выселяют.
    if (payHousing && !state.housingPaid) buy(state, "housing");
    rest(state);
    endDay(state, state.dayActions);
  }
  return state;
}
