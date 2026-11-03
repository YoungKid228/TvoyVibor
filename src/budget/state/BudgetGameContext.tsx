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
  resolveEvent,
  startDay,
  buy,
  buyItem,
  rest,
  saveToSavings,
  takeFromSavings,
  work,
} from "../core/reducer";
import { SCENARIOS } from "../data/scenario";
import { clearGame, loadGame, saveGame } from "../storage/saveRepository";
import type {
  GameState,
  ItemId,
  JobId,
  ProfessionId,
  ScenarioKey,
  SpendId,
} from "../core/types";

/**
 * Состояние игры.
 *
 * Действия применяются к копии состояния (иммутабельно), чтобы React
 * корректно перерисовывал экраны. Деньги и шкалы считает только ядро —
 * здесь нет никакой арифметики.
 */

type Screen = "menu" | "day" | "event" | "result";

type GameContextValue = {
  state: GameState;
  screen: Screen;
  /** Сообщение о последнем действии — показывается игроку. */
  message: string | null;
  error: string | null;
  startGame: (scenarioKey: ScenarioKey, professionId: ProfessionId) => void;
  resumeGame: () => void;
  resetGame: () => void;
  toMenu: () => void;
  doWork: (jobId: JobId) => void;
  doBuy: (spendId: SpendId) => void;
  doBuyItem: (itemId: ItemId) => void;
  doRest: () => void;
  doSave: (amount: number) => void;
  doWithdraw: (amount: number) => void;
  chooseEvent: (optionId: string) => void;
  finishDay: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

type Action =
  | { type: "start"; scenarioKey: ScenarioKey; professionId: ProfessionId }
  | { type: "resume" }
  | { type: "reset" }
  | { type: "menu" }
  | { type: "apply"; next: GameState; message: string | null; error: string | null }
  | { type: "screen"; screen: Screen }
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
        screen: state.pendingEvent ? "event" : "day",
        message: null,
        error: null,
      };
    }
    case "resume": {
      const state = store.state;
      // Пустое состояние — это ещё не начатая игра: запускаем первый день.
      if (state.log.length === 0 && !state.finished) {
        startDay(state);
      }
      return {
        ...store,
        state,
        screen: state.pendingEvent
          ? "event"
          : state.finished
            ? "result"
            : "day",
      };
    }
    case "reset":
      return { ...initialStore, state: createInitialState("short", "none") };
    case "menu":
      return { ...store, screen: "menu" };
    case "apply":
      return {
        state: action.next,
        screen: action.next.finished
          ? "result"
          : action.next.pendingEvent
            ? "event"
            : "day",
        message: action.message,
        error: action.error,
      };
    case "screen":
      return { ...store, screen: action.screen };
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
      dispatch({ type: "load", state });
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
    (mutate: (draft: GameState) => string | null, isError = false) => {
      const draft: GameState = {
        ...store.state,
        scales: { ...store.state.scales },
        items: [...store.state.items],
        weekShifts: { ...store.state.weekShifts },
        weekJobs: { ...store.state.weekJobs },
        spentByCategory: { ...store.state.spentByCategory },
        log: [...store.state.log],
        dayActions: [...store.state.dayActions],
      };
      const result = mutate(draft);
      dispatch({
        type: "apply",
        next: draft,
        message: isError ? null : result,
        error: isError ? result : null,
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
      resumeGame: () => dispatch({ type: "resume" }),
      resetGame: () => {
        void clearGame();
        dispatch({ type: "reset" });
      },
      toMenu: () => dispatch({ type: "menu" }),
      doWork: (jobId) => apply((draft) => work(draft, jobId)),
      doBuy: (spendId) => apply((draft) => buy(draft, spendId)),
      doBuyItem: (itemId) => apply((draft) => buyItem(draft, itemId)),
      doRest: () => apply((draft) => rest(draft)),
      doSave: (amount) =>
        apply((draft) => {
          if (amount === 0) return null;
          return saveToSavings(draft, amount);
        }),
      doWithdraw: (amount) => apply((draft) => takeFromSavings(draft, amount)),
      chooseEvent: (optionId) =>
        apply((draft) => {
          const result = resolveEvent(draft, optionId);
          return result.startsWith("нет ") || result.includes("недоступно")
            ? result
            : result;
        }),
      finishDay: () =>
        apply((draft) => {
          endDay(draft, draft.dayActions);
          if (draft.finished) return "Неделя закончилась — подводим итоги.";
          startDay(draft);
          return null;
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
