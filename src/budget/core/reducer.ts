import {
  ITEMS,
  RULES,
  SCENARIOS,
  categoryForSpend,
  eventsForScenario,
  jobById,
  professionById,
  spendById,
} from "../data/scenario";
import { pay, payFlexible, save, withdraw } from "./finance";
import { decay, isBurntOut, shiftPay, sleep } from "./mood";
import { pythonRound } from "./rounding";
import type {
  GameEvent,
  GameState,
  ItemId,
  JobId,
  ProfessionId,
  ScenarioKey,
  SpendId,
} from "./types";

/**
 * Переходы игрового состояния.
 *
 * Повторяет дневной цикл эталона (`scripts/balance_sim.py`) 1:1, включая
 * порядок операций внутри дня. В эталоне день выглядит так:
 *
 *   day_events(day)  →  blizzard → обязательные расходы → зарплата
 *   decay()          →  спад шкал
 *   policy(day)      →  событие (телефон/подарок) + действия игрока
 *
 * Чтобы этот порядок не «поехал» при доработках, дневной цикл разбит на
 * явные фазы, а `advance()` ведёт состояние по ним до первой точки, где
 * нужно решение игрока.
 *
 * Все guard'ы (одноразовость зарплаты, событий, смен) живут здесь:
 * повторное действие не должно менять баланс.
 */

/** Фаза текущего дня. */
export type DayPhase =
  | "blizzard" // снегопад: ждём выбор игрока
  | "mandatory" // обязательные расходы и зарплата
  | "decay" // ежедневный спад шкал
  | "actions"; // события и действия игрока

/** Ключ счётчика смен конкретной работы: неделя + работа. */
function weekJobKey(week: number, jobId: string): string {
  return `${week}:${jobId}`;
}

/** Создать новое состояние игры. */
export function createInitialState(
  scenarioKey: ScenarioKey = "short",
  professionId: ProfessionId = "none",
): GameState {
  const scenario = SCENARIOS[scenarioKey];
  const profession = professionById(professionId);
  return {
    scenarioKey,
    professionId,
    day: 1,
    week: 0,
    phase: "blizzard",
    cash: scenario.capital,
    savings: 0,
    scales: {
      mood: 70 + profession.moodBonus,
      energy: 100,
      hunger: 100,
      hygiene: 100,
      solomon: 70,
    },
    rep: profession.repBonus,
    items: [],
    income: 0,
    expenses: 0,
    debt: 0,
    shifts: 0,
    weekShifts: {},
    weekJobs: {},
    spentByCategory: {
      обязательные: 0,
      быт: 0,
      развлечения: 0,
      покупки: 0,
      подарки: 0,
      телефон: 0,
      накопления: 0,
    },
    salaryPaid: false,
    phoneResolved: false,
    giftResolved: false,
    blizzardResolved: false,
    blizzardChoice: null,
    pendingEvent: null,
    log: [],
    dayActions: [],
    finished: false,
  };
}

/* ------------------------------------------------------------------ */
/* Проверки доступности                                                */
/* ------------------------------------------------------------------ */

/** Проверка, доступна ли работа. Возвращает причину отказа или null. */
export function jobBlockReason(
  state: GameState,
  jobId: JobId,
): string | null {
  const job = jobById(jobId);
  if (!job) return "нет такой работы";
  if (job.requires === "laptop" && !state.items.includes("laptop")) {
    return "нужен ноутбук";
  }
  if (job.requires === "rep>=2" && state.rep < 2) return "мало репутации";
  const cap = RULES.weeklyShiftCap + professionById(state.professionId).shiftBonus;
  if ((state.weekShifts[state.week] ?? 0) >= cap) {
    return "недельный лимит смен исчерпан";
  }
  if ((state.weekJobs[weekJobKey(state.week, jobId)] ?? 0) >= job.limit) {
    return "лимит смен";
  }
  if (state.scales.energy < job.energyCost) return "нет энергии";
  return null;
}

/** Проверка, доступна ли трата. */
export function spendBlockReason(
  state: GameState,
  spendId: SpendId,
): string | null {
  const spend = spendById(spendId);
  if (!spend) return "нет такой траты";
  if (state.cash < 0 && spend.cost > 0) return "кошелёк в минусе";
  return null;
}

/* ------------------------------------------------------------------ */
/* Действия игрока                                                     */
/* ------------------------------------------------------------------ */

/** Выйти на смену. */
export function work(state: GameState, jobId: JobId): string {
  const job = jobById(jobId);
  if (!job) return "нет такой работы";
  if (job.requires === "laptop" && !state.items.includes("laptop")) {
    return "нет ноутбука";
  }
  if (job.requires === "rep>=2" && state.rep < 2) return "мало репутации";
  const cap =
    RULES.weeklyShiftCap + professionById(state.professionId).shiftBonus;
  if ((state.weekShifts[state.week] ?? 0) >= cap) {
    return "недельный лимит смен исчерпан";
  }
  if ((state.weekJobs[weekJobKey(state.week, jobId)] ?? 0) >= job.limit) {
    return "лимит смен";
  }
  if (state.scales.energy < job.energyCost) return "нет энергии";

  const burnt = isBurntOut(state.scales.mood);
  const gain = shiftPay(job.pay, state.scales.mood);
  state.cash += gain;
  state.income += gain;
  state.scales.energy = Math.max(0, state.scales.energy - job.energyCost);
  state.scales.mood = Math.max(
    0,
    state.scales.mood - job.moodCost * (burnt ? 2 : 1),
  );
  const key = weekJobKey(state.week, jobId);
  state.weekJobs[key] = (state.weekJobs[key] ?? 0) + 1;
  state.weekShifts[state.week] = (state.weekShifts[state.week] ?? 0) + 1;
  state.shifts += 1;
  return `${job.id} +${gain}` + (burnt ? " (выгорание)" : "");
}

/** Потратить деньги. */
export function buy(state: GameState, spendId: SpendId): string {
  const spend = spendById(spendId);
  if (!spend) return "нет такой траты";
  const category = categoryForSpend(spendId);
  const paid = payFlexible(state, spend.cost, category);
  state.scales.mood += spend.moodGain;
  state.scales.energy = Math.max(0, state.scales.energy - spend.energyCost);
  state.scales.hunger = Math.min(100, state.scales.hunger + spend.hungerGain);
  state.scales.hygiene = Math.min(
    100,
    state.scales.hygiene + spend.hygieneGain,
  );
  state.rep += spend.repGain;
  state.scales.solomon = Math.min(
    100,
    state.scales.solomon + spend.solomonGain,
  );
  return `${spendId} ${paid}`;
}

/** Крупная покупка. */
export function buyItem(state: GameState, itemId: ItemId): string {
  const item = ITEMS.find((i) => i.id === itemId);
  if (!item) return "нет такой покупки";
  if (state.items.includes(itemId)) return "уже куплено";
  payFlexible(state, item.cost, "покупки");
  state.items.push(itemId);
  return `${itemId} -${item.cost}`;
}

/** Отдых: сон. */
export function rest(state: GameState): string {
  return sleep(state);
}

/** Отложить в подушку. */
export function saveToSavings(state: GameState, amount: number): string {
  return save(state, amount);
}

/** Снять из подушки. */
export function takeFromSavings(state: GameState, amount: number): string {
  return withdraw(state, amount);
}

/* ------------------------------------------------------------------ */
/* События                                                             */
/* ------------------------------------------------------------------ */

/**
 * Выбрать вариант открытого события.
 * После закрытия события дневной цикл продолжается со следующей фазы.
 */
export function resolveEvent(state: GameState, optionId: string): string {
  const event = state.pendingEvent;
  if (!event) return "нет открытого события";
  const option = event.options.find((o) => o.id === optionId);
  if (!option) return "нет такого варианта";

  let label = "";
  if (event.id === "phone") {
    if (state.phoneResolved) return "событие уже закрыто";
    payFlexible(state, option.cost, "телефон");
    state.scales.mood += option.moodGain;
    state.scales.solomon += option.solomonGain ?? 0;
    state.phoneResolved = true;
    label = `телефон:${optionId} -${option.cost}`;
  } else if (event.id === "gift") {
    if (state.giftResolved) return "событие уже закрыто";
    payFlexible(state, option.cost, "подарки");
    state.scales.mood += option.moodGain;
    state.scales.solomon += option.solomonGain ?? 0;
    state.rep += 1;
    state.giftResolved = true;
    label = `подарок:${optionId} -${option.cost}`;
  } else {
    if (state.blizzardResolved) return "событие уже закрыто";
    if (optionId === "taxi") {
      if (state.cash + state.savings < option.cost) {
        return "снегопад: такси недоступно";
      }
      pay(state, option.cost, "быт");
      state.scales.mood = Math.max(0, state.scales.mood + option.moodGain);
      state.blizzardResolved = true;
      state.blizzardChoice = "taxi";
      label = "снегопад: такси -400";
    } else if (optionId === "bus") {
      state.scales.mood = Math.max(0, state.scales.mood + option.moodGain);
      state.blizzardResolved = true;
      state.blizzardChoice = "bus";
      label = "снегопад: автобус, бесплатно, но долго";
    } else {
      state.scales.energy = Math.max(
        0,
        state.scales.energy - (option.energyCost ?? 0),
      );
      state.scales.mood = Math.max(0, state.scales.mood + option.moodGain);
      state.blizzardResolved = true;
      state.blizzardChoice = "walk";
      label = "снегопад: пешком";
    }
  }

  state.pendingEvent = null;
  // Событие закрыто — дневной цикл продолжается со следующей фазы.
  advance(state);
  return label;
}

/* ------------------------------------------------------------------ */
/* Дневной цикл                                                        */
/* ------------------------------------------------------------------ */

/** Обязательные расходы и зарплата. Зарплата начисляется один раз за игру. */
function applyMandatory(state: GameState): string[] {
  const scenario = SCENARIOS[state.scenarioKey];
  const acts: string[] = [];

  if (scenario.mandatoryMode === "once") {
    if (state.day === 1) {
      acts.push(
        `обязательные ${pay(state, scenario.mandatoryTotal, "обязательные")}`,
      );
    }
  } else if ((state.day - 1) % 7 === 0) {
    acts.push(
      `обязательные ${pay(state, Math.floor(scenario.mandatoryTotal / 4), "обязательные")}`,
    );
  }

  if (state.day === scenario.salaryDay && !state.salaryPaid) {
    const gain = scenario.salary + professionById(state.professionId).payBonus;
    state.cash += gain;
    state.income += gain;
    state.salaryPaid = true;
    acts.push(`зарплата +${gain}`);
  }

  return acts;
}

/** Открыть событие дня, если оно есть и ещё не закрыто. */
function openPendingEvent(state: GameState): GameEvent | null {
  for (const event of eventsForScenario(state.scenarioKey)) {
    if (event.day !== state.day) continue;
    if (event.id === "phone" && state.phoneResolved) continue;
    if (event.id === "gift" && state.giftResolved) continue;
    if (event.id === "blizzard" && state.blizzardResolved) continue;
    return event;
  }
  return null;
}

/**
 * Продвинуть дневной цикл до следующей фазы.
 * Останавливается, если нужно решение игрока (открытое событие).
 */
export function advance(state: GameState): string[] {
  for (;;) {
    switch (state.phase) {
      case "blizzard": {
        // Снегопад в эталоне происходит до обязательных расходов: такси
        // решает, хватит ли денег на проезд, когда в кошельке ещё полный
        // стартовый капитал.
        const event = openPendingEvent(state);
        if (event && event.id === "blizzard") {
          state.pendingEvent = event;
          state.phase = "mandatory";
          return state.dayActions;
        }
        state.phase = "mandatory";
        break;
      }
      case "mandatory": {
        state.dayActions.push(...applyMandatory(state));
        state.phase = "decay";
        break;
      }
      case "decay": {
        decay(state);
        state.phase = "actions";
        break;
      }
      case "actions": {
        const event = openPendingEvent(state);
        if (event) {
          state.pendingEvent = event;
          return state.dayActions;
        }
        return state.dayActions;
      }
    }
  }
}

/** Начать новый день. */
export function startDay(state: GameState): string[] {
  state.week = Math.floor((state.day - 1) / 7);
  state.dayActions = [];
  state.phase = "blizzard";
  return advance(state);
}

/** Завершить день: записать в журнал и перейти к следующему. */
export function endDay(state: GameState, actions: string[]): void {
  state.log.push({
    day: state.day,
    cash: state.cash,
    savings: state.savings,
    mood: state.scales.mood,
    energy: state.scales.energy,
    solomon: pythonRound(state.scales.solomon, 1),
    hunger: state.scales.hunger,
    hygiene: state.scales.hygiene,
    actions,
  });

  const scenario = SCENARIOS[state.scenarioKey];
  if (state.day >= scenario.days) {
    state.finished = true;
    return;
  }
  state.day += 1;
}

/**
 * Полный автопрогон режима для тестов: применяет стратегию к каждому дню.
 * Стратегия должна повторять эталонную (`scripts/balance_sim.py`).
 */
export function runScenario(
  scenarioKey: ScenarioKey,
  professionId: ProfessionId,
  policy: (state: GameState) => string[],
  eventChoice: (event: GameEvent) => string = defaultEventChoice,
): GameState {
  const state = createInitialState(scenarioKey, professionId);
  const scenario = SCENARIOS[scenarioKey];
  for (let day = 1; day <= scenario.days; day += 1) {
    startDay(state);
    // Снегопад в эталоне происходит автоматически (выбор задан заранее).
    // События «телефон» и «подарок» решает сама стратегия — как в эталоне,
    // где policy в эти дни прерывается и не делает других действий.
    if (state.pendingEvent?.id === "blizzard") {
      resolveEvent(state, eventChoice(state.pendingEvent));
    }
    state.dayActions.push(...policy(state));
    endDay(state, state.dayActions);
  }
  return state;
}

/** Выбор варианта события по умолчанию — как в эталонной стратегии «Баланс». */
export function defaultEventChoice(event: GameEvent): string {
  if (event.id === "phone") return "repair";
  if (event.id === "gift") return "mid";
  return "bus";
}
