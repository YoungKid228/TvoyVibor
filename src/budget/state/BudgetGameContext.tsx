import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import {
  createInitialState,
  endDay,
  normalizeState,
  resolveEvent,
  spendBlockReason,
  startDay,
  transportBlockReason,
  buy,
  chooseTransport,
  rest,
  saveToSavings,
  skipPayments,
  takeFromSavings,
} from "../core/reducer";
import { SCENARIOS } from "../data/scenario";
import { clearGame, loadGame, saveGame } from "../storage/saveRepository";
import type {
  GameState,
  ProfessionId,
  ScenarioKey,
  SpendId,
  TransportId,
} from "../core/types";

/**
 * Состояние игры.
 *
 * Действия применяются к копии состояния (иммутабельно), чтобы React
 * корректно перерисовывал экраны. Деньги и шкалы считает только ядро —
 * здесь нет никакой арифметики.
 */

type Screen = "menu" | "rules" | "briefing" | "day" | "result";

/**
 * Результат действия.
 *
 * `error` — причина отказа: её показывает всплывающее уведомление.
 * `message` — что получилось: тоже всплывает, но зелёным.
 */
type ActionResult = {
  message?: string | null;
  error?: string | null;
};

type GameContextValue = {
  state: GameState;
  screen: Screen;
  /** Сообщение о последнем действии — показывается игроку. */
  message: string | null;
  error: string | null;
  startGame: (scenarioKey: ScenarioKey, professionId: ProfessionId) => void;
  /** Перейти от брифинга к первому дню. */
  startPlaying: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  toMenu: () => void;
  showRules: () => void;
  /** Вернуться к игровому дню из экрана правил. */
  backToDay: () => void;
  doBuy: (spendId: SpendId) => void;
  doTransport: (transportId: TransportId) => void;
  doRest: () => void;
  doSave: (amount: number) => void;
  doWithdraw: (amount: number) => void;
  /** Решение «ничего не платить». */
  doSkipPayments: () => void;
  chooseEvent: (optionId: string) => void;
  finishDay: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

type Action =
  | { type: "start"; scenarioKey: ScenarioKey; professionId: ProfessionId }
  | { type: "play" }
  | { type: "resume" }
  | { type: "reset" }
  | { type: "menu" }
  | { type: "rules" }
  | { type: "back" }
  | { type: "apply"; next: GameState; message: string | null; error: string | null }
  | { type: "load"; state: GameState };

type Store = {
  state: GameState;
  screen: Screen;
  message: string | null;
  error: string | null;
};

const initialStore: Store = {
  state: createInitialState("short", "none"),
  screen: "menu",
  message: null,
  error: null,
};

function reducer(store: Store, action: Action): Store {
  switch (action.type) {
    case "start": {
      const state = createInitialState(action.scenarioKey, action.professionId);
      startDay(state);
      return {
        state,
        // Сначала брифинг: игрока знакомят с белкой и объясняют, что есть
        // обязательные расходы, а есть необязательные.
        screen: "briefing",
        message: null,
        error: null,
      };
    }
    case "play":
      return { ...store, screen: "day" };
    case "resume": {
      const state = store.state;
      // Пустое состояние — это ещё не начатая игра: запускаем первый день.
      // Начатый день перезапускать нельзя: списались бы обязательные
      // расходы и спад шкал второй раз.
      if (state.log.length === 0 && !state.finished && !state.dayStarted) {
        startDay(state);
      }
      return {
        ...store,
        state,
        screen: state.finished ? "result" : "day",
      };
    }
    case "reset":
      return { ...initialStore, state: createInitialState("short", "none") };
    case "menu":
      return { ...store, screen: "menu" };
    case "rules":
      return { ...store, screen: "rules" };
    case "back": {
      // Назад из правил: если день уже идёт — возвращаемся в него, иначе
      // (правила открыли из меню) — в меню.
      return { ...store, screen: store.state.dayStarted ? "day" : "menu" };
    }
    case "apply":
      return {
        state: action.next,
        // Событие — часть дня, а не отдельный экран: игрок видит шкалы
        // и кошелёк, выбирая между «ремонт 4 000» и «старый телефон 0».
        // Проигрыш — отдельный экран: итоги при проигрыше не подводятся.
        screen: action.next.lost
          ? "day"
          : action.next.finished
            ? "result"
            : "day",
        message: action.message,
        error: action.error,
      };
    case "load":
      // Сохранение подгружается в меню: игрок сам решает, продолжить ли.
      // Так кнопки «Продолжить» и «Сбросить» остаются доступными.
      return { ...store, state: action.state, message: null, error: null };
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(reducer, initialStore);
  const hydrated = useRef(false);

  // При старте подхватываем сохранение: прогресс переживает перезагрузку.
  useEffect(() => {
    let cancelled = false;
    void loadGame().then((state) => {
      if (cancelled || !state) return;
      dispatch({ type: "load", state: normalizeState(state) });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Автосохранение после каждого изменения состояния.
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    if (store.screen === "menu" && store.state.log.length === 0) return;
    void saveGame(store.state);
  }, [store.state]);

  /** Применить действие к копии состояния. */
  const apply = useCallback(
    (mutate: (draft: GameState) => ActionResult) => {
      const draft: GameState = {
        ...store.state,
        scales: { ...store.state.scales },
        items: [...store.state.items],
        spentByCategory: { ...store.state.spentByCategory },
        log: [...store.state.log],
        dayActions: [...store.state.dayActions],
        dayNotes: [...store.state.dayNotes],
        itemDays: { ...store.state.itemDays },
        mealStock: { ...store.state.mealStock },
      };
      const result = mutate(draft);
      dispatch({
        type: "apply",
        next: draft,
        message: result.message ?? null,
        error: result.error ?? null,
      });
    },
    [store.state],
  );

  const value = useMemo<GameContextValue>(
    () => ({
      state: store.state,
      screen: store.screen,
      message: store.message,
      error: store.error,
      startGame: (scenarioKey, professionId) =>
        dispatch({ type: "start", scenarioKey, professionId }),
      startPlaying: () => dispatch({ type: "play" }),
      resumeGame: () => dispatch({ type: "resume" }),
      resetGame: () => {
        void clearGame();
        dispatch({ type: "reset" });
      },
      toMenu: () => dispatch({ type: "menu" }),
      showRules: () => dispatch({ type: "rules" }),
      backToDay: () => dispatch({ type: "back" }),
      // Покупка: причина отказа (в том числе «уже ночь, пора спать»)
      // идёт в уведомление, а не теряется внизу страницы.
      doBuy: (spendId) =>
        apply((draft) => {
          const reason = spendBlockReason(draft, spendId);
          if (reason) return { error: reason };
          return { message: buy(draft, spendId) };
        }),
      doTransport: (transportId) =>
        apply((draft) => {
          const reason = transportBlockReason(draft, transportId);
          if (reason) return { error: reason };
          return { message: chooseTransport(draft, transportId) };
        }),
      // Сон закрывает день: восстанавливает силы и переводит игру на
      // следующий день. Без сна день не заканчивается.
      doRest: () =>
        apply((draft) => {
          const message = rest(draft);
          if (draft.phase !== "done") return { message };
          endDay(draft, draft.dayActions);
          if (draft.lost) return { message: "Игра проиграна." };
          if (draft.finished) return { message: "Игра закончилась — подводим итоги." };
          startDay(draft);
          return { message: "Сон прошёл, наступило утро." };
        }),
      doSave: (amount) =>
        apply((draft) => {
          if (amount === 0) return {};
          return { message: saveToSavings(draft, amount) };
        }),
      doWithdraw: (amount) =>
        apply((draft) => ({ message: takeFromSavings(draft, amount) })),
      doSkipPayments: () =>
        apply((draft) => ({ message: skipPayments(draft) })),
      chooseEvent: (optionId) =>
        apply((draft) => ({ message: resolveEvent(draft, optionId) })),
      finishDay: () =>
        apply((draft) => {
          endDay(draft, draft.dayActions);
          if (draft.finished) {
            return { message: "Неделя закончилась — подводим итоги." };
          }
          startDay(draft);
          return {};
        }),
    }),
    [apply, store],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame должен вызываться внутри GameProvider");
  return ctx;
}

export { SCENARIOS };
