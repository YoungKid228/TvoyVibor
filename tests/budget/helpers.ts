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
 * Состояние на утре: дорогу ещё не выбирали.
 *
 * Нужно для проверок транспорта: грязного Соломона не пускают в автобус
 * и такси, а выбор дороги возможен только утром.
 */
export function morningState(): GameState {
  const state = createInitialState();
  startDay(state);
  buy(state, "food-cheap");
  return state;
}

/**
 * Состояние на начало указанного дня.
 *
 * Каждый предыдущий день проживается полностью: завтрак, дорога, еда и
 * сон. Нужно, чтобы проверить сроки (жильё, интернет) и проигрыш.
 *
 * Прожитая неделя — это игра по правилам: без развлечений настроение
 * падает до нуля (а это проигрыш), а без мытья Соломон становится слишком
 * грязным, чтобы сесть в автобус. Поэтому в каждом дне есть прогулка, ласка
 * и мытьё.
 */
export function stateOnDay(day: number, payHousing = true): GameState {
  const state = createInitialState();
  for (let index = 1; index < day; index += 1) {
    startDay(state);
    buy(state, "food-cheap");
    chooseTransport(state, "bus");
    // Второй приём пищи: сон опускает сытость, и без еды Соломон голодает
    // (два дня голода — счёт за лечение).
    buy(state, "food-leftovers");
    // Жильё оплачиваем: иначе на пятом дне игру выселяют.
    if (payHousing && !state.housingPaid) buy(state, "housing");
    // Развлечение, ласка и мытьё: иначе Соломон впадёт в депрессию или
    // окажется слишком грязным для транспорта.
    buy(state, "park");
    buy(state, "pet");
    if (state.scales.cleanliness < 40) buy(state, "wash");
    rest(state);
    endDay(state, state.dayActions);
  }
  return state;
}
