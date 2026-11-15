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
import {
  addRep,
  clampScales,
  decay,
  isBurntOut,
  shiftPay,
  sleep,
} from "./mood";
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
      cleanliness: 100,
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
    sleepsToday: 0,
    petsToday: 0,
    washesToday: 0,
    itemDays: {},
    dayNotes: [],
    dayStarted: false,
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

/**
 * Проверка, доступна ли трата.
 *
 * Долг разрешён: если денег нет нигде, трата проходит в кредит — кошелёк
 * уходит в минус, настроение падает, а финальный разбор показывает, что
 * игрок перестал считать. Правило живёт в ядре (`buy()`), а не здесь:
 * раньше блокировка стояла только в интерфейсе, и любой путь в обход
 * перерисовки кнопок позволял траты в долг без предупреждения.
 *
 * Здесь же проверяется единственное ограничение бесплатного действия:
 * «поглаживание Соломона» — не чаше N раз в день.
 */
export function spendBlockReason(
  state: GameState,
  spendId: SpendId,
): string | null {
  const spend = spendById(spendId);
  if (!spend) return "нет такой траты";
  if (spendId === "pet" && state.petsToday >= RULES.petPerDay) {
    return `поглаживаний на сегодня хватает (${RULES.petPerDay})`;
  }
  if (spendId === "wash" && state.washesToday >= RULES.washPerDay) {
    return `мытьё на сегодня уже было (${RULES.washPerDay})`;
  }
  return null;
}

/** Проверка, доступен ли сон. */
export function restBlockReason(state: GameState): string | null {
  if (state.sleepsToday >= RULES.sleepPerDay) {
    return "сон уже был сегодня";
  }
  return null;
}

/**
 * Уйдёт ли трата в долг.
 *
 * Показывается в карточке траты: игрок должен видеть долг до покупки,
 * а не после — тогда долг остаётся осознанным решением.
 */
export function goesIntoDebt(state: GameState, spendId: SpendId): boolean {
  const spend = spendById(spendId);
  if (!spend || spend.cost === 0) return false;
  return state.cash < spend.cost && state.savings < spend.cost - state.cash;
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

  // Шкалы приводятся в диапазон ДО расчёта дохода: иначе множитель
  // посчитался бы от значения выше 100 и смена принесла бы больше базовой
  // ставки (при настроении 150 курьер давал 2 000 ₽ вместо 1 600).
  clampScales(state);

  const burnt = isBurntOut(state.scales.mood);
  const gain = shiftPay(job.pay, state.scales.mood);
  state.cash += gain;
  state.income += gain;
  state.scales.energy = Math.max(0, state.scales.energy - job.energyCost);
  state.scales.mood = Math.max(
    0,
    state.scales.mood - job.moodCost * (burnt ? 2 : 1),
  );
  clampScales(state);
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
  // Поглаживание Соломона — бесплатное действие, поэтому у него суточный
  // лимит. Иначе 50 кликов набивают шкалы и обесценивают всю экономику.
  if (spendId === "pet") {
    if (state.petsToday >= RULES.petPerDay) {
      return "поглаживаний на сегодня хватает";
    }
    state.petsToday += 1;
  }
  // Мытьё Соломона — тоже суточное действие: иначе игрок вымывал бы его
  // по десять раз за день ради одного и того же настроения.
  if (spendId === "wash") {
    if (state.washesToday >= RULES.washPerDay) {
      return "мытьё на сегодня уже было";
    }
    state.washesToday += 1;
  }
  const category = categoryForSpend(spendId);
  const paid = payFlexible(state, spend.cost, category);
  state.scales.mood += spend.moodGain;
  state.scales.energy = Math.max(0, state.scales.energy - spend.energyCost);
  state.scales.hunger = Math.min(100, state.scales.hunger + spend.hungerGain);
  state.scales.hygiene = Math.min(
    100,
    state.scales.hygiene + spend.hygieneGain,
  );
  addRep(state, spend.repGain);
  state.scales.solomon = Math.min(
    100,
    state.scales.solomon + spend.solomonGain,
  );
  if (spendId === "wash") {
    // Мытьё возвращает блеск: спрайт снова становится чистым.
    state.scales.cleanliness = 100;
  }
  clampScales(state);
  return `${spendId} ${paid}`;
}

/** Крупная покупка. */
export function buyItem(state: GameState, itemId: ItemId): string {
  const item = ITEMS.find((i) => i.id === itemId);
  if (!item) return "нет такой покупки";
  if (state.items.includes(itemId)) return "уже куплено";
  payFlexible(state, item.cost, "покупки");
  state.items.push(itemId);
  state.itemDays[itemId] = state.day;
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
 * После закрытия события дневной цикл продолжается со следующей фазы —
 * день события остаётся обычным днём, просто с дополнительным выбором.
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
    addRep(state, 1);
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

  clampScales(state);
  // Событие — часть дня, поэтому его подпись попадает в журнал дня.
  // Порядок важен: событие открывается до действий игрока, значит и в
  // журнале оно стоит первым (так же, как в эталоне).
  state.dayActions.push(label);
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
        state.dayNotes = decay(state);
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

/**
 * Начать новый день.
 *
 * `startDay()` вызывается только один раз на день: повторный вызов сдвинул бы
 * день заново (списал бы обязательные расходы дважды и сбросил спад шкал).
 * Поэтому день помечается флагом `dayStarted`, а повторный вызов — no-op.
 */
export function startDay(state: GameState): string[] {
  if (state.dayStarted) return state.dayActions;
  // День помечается начатым сразу: иначе перезагрузка страницы во время
  // события перезапустила бы дневной цикл и списала обязательные расходы
  // второй раз.
  state.dayStarted = true;
  state.week = Math.floor((state.day - 1) / 7);
  state.dayActions = [];
  // Суточные счётчики бесплатных действий обнуляются каждый день.
  state.sleepsToday = 0;
  state.petsToday = 0;
  state.washesToday = 0;
  state.phase = "blizzard";
  return advance(state);
}

/**
 * Завершить день: записать в журнал и перейти к следующему.
 *
 * `dayActions` очищается здесь, а не только в `startDay()`: иначе после
 * перезагрузки страницы (когда `startDay()` не вызывается) действия
 * прошлого дня переезжают в журнал текущего, а сам день не начинается —
 * не спадают шкалы и не списываются расходы.
 */
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
    cleanliness: state.scales.cleanliness,
    actions,
    notes: state.dayNotes,
  });

  const scenario = SCENARIOS[state.scenarioKey];
  state.dayActions = [];
  state.dayNotes = [];
  state.dayStarted = false;
  if (state.day >= scenario.days) {
    state.finished = true;
    return;
  }
  state.day += 1;
}

/**
 * Нормализовать загруженное состояние.
 *
 * Сохранение может быть сделано в любой момент, поэтому при загрузке
 * приводим состояние к консистентному виду.
 *
 * Важно: действия и счётчики **текущего** дня сохраняются — иначе
 * перезагрузка обнуляла бы суточные лимиты (например, можно было бы
 * погладить Соломона ещё раз) и теряла часть журнала дня. Обнуляется
 * только «хвост» от прошлого дня — состояние, в котором день не начат.
 */
export function normalizeState(state: GameState): GameState {
  const dayStarted = Boolean(state.dayStarted);
  return {
    ...state,
    dayStarted,
    dayActions: dayStarted ? state.dayActions : [],
    dayNotes: state.dayNotes ?? [],
    sleepsToday: state.sleepsToday ?? 0,
    petsToday: state.petsToday ?? 0,
    washesToday: state.washesToday ?? 0,
    itemDays: state.itemDays ?? {},
    // Шкалы приводятся в диапазон: сохранение могло быть сделано старой
    // версией игры, где обрезки в ядре не было.
    scales: {
      mood: Math.max(0, Math.min(100, state.scales.mood)),
      energy: Math.max(0, Math.min(100, state.scales.energy)),
      hunger: Math.max(0, Math.min(100, state.scales.hunger)),
      hygiene: Math.max(0, Math.min(100, state.scales.hygiene)),
      solomon: Math.max(0, Math.min(100, state.scales.solomon)),
      cleanliness: Math.max(
        0,
        Math.min(100, state.scales.cleanliness ?? 100),
      ),
    },
    rep: Math.max(0, Math.min(RULES.repCap, state.rep)),
  };
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
    // где policy в эти дни закрывает событие и продолжает обычный день.
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
