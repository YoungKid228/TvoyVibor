import {
  DAY,
  ENTERTAINMENT_SPENDS,
  RULES,
  SCENARIOS,
  eventsForScenario,
  professionById,
  spendById,
  transportById,
} from "../data/scenario";
import { canPay, payFlexible, save, withdraw } from "./finance";
import { addRep, clampScales, classes, decay, sleep } from "./mood";
import type {
  GameEvent,
  GameState,
  LossReason,
  ProfessionId,
  ScenarioKey,
  SpendId,
  TransportId,
} from "./types";

/**
 * Переходы игрового состояния.
 *
 * Повторяет дневной цикл эталона (`scripts/balance_sim.py`) 1:1, включая
 * порядок операций внутри дня. День устроен по часам:
 *
 *   утро (06:00) → завтрак и дорога к парам
 *   пары (09:00…15:00) → время идёт само, силы тратятся
 *   свободное время (15:00…23:00) → работа, развлечения, уход
 *   сон → день закрыт, наутро всё восстановилось
 *
 * Все guard'ы (одноразовость платежей, событий, смен) живут здесь:
 * повторное действие не должно менять баланс.
 */

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
    phase: "morning",
    clock: DAY.startMinutes,
    cash: scenario.capital,
    savings: 0,
    scales: {
      mood: 70 + profession.moodBonus,
      energy: 100,
      hunger: 70,
      cleanliness: 100,
    },
    rep: profession.repBonus,
    items: [],
    income: 0,
    expenses: 0,
    spentByCategory: {
      обязательные: 0,
      быт: 0,
      развлечения: 0,
      покупки: 0,
      подарки: 0,
      телефон: 0,
      накопления: 0,
    },
    phoneResolved: false,
    giftResolved: false,
    phoneBroken: false,
    pendingEvent: null,
    log: [],
    dayActions: [],
    sleepsToday: 0,
    petsToday: 0,
    washesToday: 0,
    laundriesToday: 0,
    funToday: 0,
    breakfastToday: false,
    transportToday: null,
    mealsToday: 0,
    mealStock: { servings: 0, preparedOnDay: 0 },
    lessonsToday: false,
    lessonStreak: 0,
    missedLessons: 0,
    lessonProblems: false,
    housingPaid: false,
    internetUntil: scenario.internetTrialDays,
    transitUntil: 0,
    laundryDay: 1,
    collapseDays: 0,
    treatmentBills: 0,
    lost: false,
    lossReason: null,
    itemDays: {},
    dayNotes: [],
    dayStarted: false,
    finished: false,
  };
}

/* ------------------------------------------------------------------ */
/* Условия, доступные игроку                                           */
/* ------------------------------------------------------------------ */

/** Работает ли интернет в этот день. */
export function hasInternet(state: GameState): boolean {
  return state.day <= state.internetUntil;
}

/** Есть ли проездной. */
export function hasTransitPass(state: GameState): boolean {
  return state.day <= state.transitUntil;
}

/** Работает ли телефон: сломанный телефон закрывает доставку и тик-токи. */
export function hasPhone(state: GameState): boolean {
  return !state.phoneBroken;
}

/** Идёт ли снегопад: пешком в метель не дойдёшь, такси дороже. */
export function isSnowDay(state: GameState): boolean {
  return SCENARIOS[state.scenarioKey].snowDays.includes(state.day);
}

/** Цена поездки с учётом проездного и снегопада. */
export function transportCost(state: GameState, transportId: TransportId): number {
  const item = transportById(transportId);
  if (!item) return 0;
  if (hasTransitPass(state)) return 0;
  if (transportId === "taxi" && isSnowDay(state)) return item.cost + 100;
  return item.cost;
}

/**
 * Проверка, доступна ли трата.
 *
 * Долг разрешён: если денег нет нигде, трата проходит в кредит — кошелёк
 * уходит в минус, настроение падает, а финальный разбор показывает, что
 * игрок перестал считать. Правило живёт в ядре (`buy()`), а не здесь.
 */
export function spendBlockReason(
  state: GameState,
  spendId: SpendId,
): string | null {
  const spend = spendById(spendId);
  if (!spend) return "нет такой траты";
  if (state.pendingEvent) return "сначала закрой событие";
  // Время и фаза дня проверяются здесь, а не внутри buy(): интерфейс
  // спрашивает причину ДО действия — иначе локация менялась бы даже
  // тогда, когда действие выполнить нельзя.
  if (state.phase === "done") return "день уже закончился";
  if (state.phase === "morning") {
    if (!spendId.startsWith("food-")) return "утром можно только позавтракать";
    if (state.breakfastToday) return "завтрак уже был";
    if (state.clock + spend.minutes > DAY.morningEnd) {
      return "не успеваешь к парам";
    }
  } else if (state.phase !== "free") {
    return "сейчас всё занято: сначала пары";
  } else if (state.clock + spend.minutes > DAY.nightMinutes) {
    return "уже ночь, пора спать";
  }
  if (spendId === "pet" && state.petsToday >= RULES.petPerDay) {
    return `поглаживаний на сегодня хватает (${RULES.petPerDay})`;
  }
  if (spendId === "wash" && state.washesToday >= RULES.washPerDay) {
    return `мытьё на сегодня уже было (${RULES.washPerDay})`;
  }
  // Стирку нельзя повторять весь вечер: иначе вечером можно вымыть
  // весь кошелёк в сорок нажатий.
  if (spendId === "laundry" && state.laundriesToday >= RULES.laundryPerDay) {
    return `стирка на сегодня уже была (${RULES.laundryPerDay})`;
  }
  // Запас еды кончился — это точнее, чем «сыт»: можно доесть остатки.
  if (spend.requires === "mealStock" && state.mealStock.servings <= 0) {
    return "запас еды пуст: сначала приготовь еду";
  }
  // Сытый Соломон больше не ест: два приёма пищи в день — и всё.
  if (spendId.startsWith("food-") && state.mealsToday >= RULES.mealsPerDay) {
    return `Соломон сыт: еда больше не лезет (${RULES.mealsPerDay} приёма пищи в день)`;
  }
  // Требований может быть несколько ("mood+clean"): проверяем по очереди и
  // показываем игроку первое невыполненное.
  for (const token of (spend.requires ?? "").split("+")) {
    if (!token) continue;
    if (token === "internet" && !hasInternet(state)) {
      return "нет интернета";
    }
    if (token === "mood" && state.scales.mood < RULES.moodForFun) {
      return "настроение плохое — не до развлечений";
    }
    // Грязного Соломона не пускают в общественные места. Порог — «сильно
    // грязный» (≤ 33), а не ноль: спрайт грязного Соломона виден игроку,
    // и правило должно быть видно вместе с ним.
    if (token === "clean" && state.scales.cleanliness <= RULES.dirtyAt) {
      return "Соломон грязный — в общественное место его не пустят";
    }
  }
  // Голодный Соломон не развлекается: сначала накормить.
  if (
    ENTERTAINMENT_SPENDS.includes(spendId) &&
    state.scales.hunger <= 0
  ) {
    return "Соломон голоден — не до развлечений";
  }
  // Долга нет: без денег трата не проходит.
  if (spend.cost > 0 && !canPay(state, spend.cost)) {
    return "не хватает денег";
  }
  // Сил тоже может не хватить: работать и готовить на нуле нельзя.
  if (spend.energyCost > 0 && state.scales.energy < spend.energyCost) {
    return "нет энергии";
  }
  if (spend.once && state.housingPaid) return "жильё уже оплачено";
  const scenario = SCENARIOS[state.scenarioKey];
  if (spend.id === "internet" && state.internetUntil >= scenario.days) {
    return "интернет уже оплачен";
  }
  if (spend.id === "transit-pass" && state.transitUntil >= scenario.days) {
    return "проездной уже куплен";
  }
  return null;
}

/** Проверка, доступен ли сон. */
export function restBlockReason(state: GameState): string | null {
  if (state.sleepsToday >= RULES.sleepPerDay) {
    return "сон уже был сегодня";
  }
  if (state.phase === "morning") return "сначала позавтракай и доедь до пар";
  if (state.phase === "classes") return "сначала отсиди пары";
  if (state.phase === "done") return "день уже закончился";
  return null;
}

/**
 * Нужно ли стирать вещи.
 *
 * Раз в несколько дней Соломону нечего надеть: если вещи не стирали, он
 * расстраивается. Проверка вынесена отдельно, чтобы интерфейс мог
 * предупредить игрока заранее, а не после штрафа.
 */
export function laundryDue(state: GameState): boolean {
  const scenario = SCENARIOS[state.scenarioKey];
  return state.day - state.laundryDay >= scenario.laundryEveryDays;
}

/* ------------------------------------------------------------------ */
/* Действия игрока                                                     */
/* ------------------------------------------------------------------ */

/**
 * Потратить деньги и время.
 *
 * Утром доступна только еда — это завтрак. После пар — всё остальное.
 */
export function buy(state: GameState, spendId: SpendId): string {
  const spend = spendById(spendId);
  if (!spend) return "нет такой траты";

  const reason = spendBlockReason(state, spendId);
  if (reason) return reason;

  const category = spend.category;
  const paid = payFlexible(state, spend.cost, category);
  state.scales.mood += spend.moodGain;
  state.scales.energy = Math.max(
    0,
    state.scales.energy - spend.energyCost + spend.energyGain,
  );
  state.scales.hunger = Math.min(100, state.scales.hunger + spend.hungerGain);
  state.scales.cleanliness = Math.min(
    100,
    state.scales.cleanliness + spend.cleanlinessGain,
  );
  addRep(state, spend.repGain);

  if (spendId === "wash") {
    // Мытьё возвращает блеск: спрайт снова становится чистым.
    state.scales.cleanliness = 100;
  }
  if (spendId.startsWith("food-")) {
    state.mealsToday += 1;
    state.breakfastToday = true;
    if (spend.preparesMeal) {
      // Приготовили еду: одна порция съедена сразу, остальные — запас
      // на сегодня и на завтра. Новая порция заменяет старый запас:
      // еда хранится ровно два дня, а не копится.
      state.mealStock = {
        servings: RULES.mealServings - 1,
        preparedOnDay: state.day,
      };
    } else if (spendId === "food-leftovers") {
      state.mealStock = {
        servings: Math.max(0, state.mealStock.servings - 1),
        preparedOnDay: state.mealStock.preparedOnDay,
      };
    }
  }
  // Развлечения считаем отдельно: без них за день Соломон грустит.
  if (ENTERTAINMENT_SPENDS.includes(spendId)) {
    state.funToday += 1;
  }
  if (spendId === "pet") {
    // Поглаживание бесплатно, поэтому у него суточный лимит: иначе
    // пятьдесят кликов набивают шкалы и обесценивают всю экономику.
    state.petsToday += 1;
  }
  if (spendId === "wash") {
    // Мытьё — тоже суточное действие.
    state.washesToday += 1;
  }
  if (spendId === "lessons") {
    state.lessonsToday = true;
    state.lessonStreak += 1;
    state.missedLessons = 0;
  }
  if (spendId === "housing") state.housingPaid = true;
  if (spendId === "internet") {
    const scenario = SCENARIOS[state.scenarioKey];
    state.internetUntil = Math.min(
      state.day + scenario.internetDays - 1,
      scenario.days,
    );
  }
  if (spendId === "transit-pass") {
    const scenario = SCENARIOS[state.scenarioKey];
    state.transitUntil = Math.min(
      state.day + scenario.transitDays - 1,
      scenario.days,
    );
  }
  if (spendId === "laundry") {
    state.laundryDay = state.day;
    state.laundriesToday += 1;
  }
  state.clock += spend.minutes;
  clampScales(state);

  const label = `${spend.label} ${paid}`;
  state.dayActions.push(label);
  advance(state);
  return label;
}

/**
 * Почему нельзя выбрать дорогу.
 *
 * Отказ вынесен из действия отдельно: интерфейс спрашивает причину ДО
 * покупки, иначе игрок увидит отказ только постфактум.
 */
export function transportBlockReason(
  state: GameState,
  transportId: TransportId,
): string | null {
  if (state.phase !== "morning") return "дорога выбирается только утром";
  if (state.transportToday) return "дорога уже выбрана";
  const item = transportById(transportId);
  if (!item) return "нет такого транспорта";
  // Грязного Соломона не пускают в общественный транспорт. Порог — «сильно
  // грязный» (≤ 33): столько грязи видно на спрайте, и правило должно
  // быть видно вместе с ним.
  if (
    (transportId === "bus" || transportId === "taxi") &&
    state.scales.cleanliness <= RULES.dirtyAt
  ) {
    return "Соломон грязный — в общественное место его не пустят";
  }
  if (transportId === "walk" && isSnowDay(state)) {
    // Пешком в метель не ходят — но если весь транспорт закрыт из-за грязи,
    // игрок останется без дороги на пары. Тогда идти можно, но Соломон
    // замёрзнет.
    if (!dirtyBlocksTransport(state)) return "в метель пешком не дойдёшь";
  }
  if (state.clock + item.minutes > DAY.morningEnd) {
    return "не успеваешь к парам";
  }
  const cost = transportCost(state, transportId);
  if (cost > 0 && !canPay(state, cost)) {
    return "не хватает денег на дорогу";
  }
  return null;
}

/**
 * Закрыт ли весь платный транспорт из-за грязи.
 *
 * Нужно, чтобы в метель можно было дойти пешком: иначе грязный Соломон
 * остался бы без дороги на пары вообще.
 */
export function dirtyBlocksTransport(state: GameState): boolean {
  return state.scales.cleanliness <= RULES.dirtyAt;
}

/**
 * Утренний выбор дороги до пар.
 *
 * Пешком — бесплатно, но устаёшь и Соломон пачкается. Автобус дешевле такси.
 * С проездным всё бесплатно.
 */
export function chooseTransport(
  state: GameState,
  transportId: TransportId,
): string {
  const reason = transportBlockReason(state, transportId);
  if (reason) return reason;
  const item = transportById(transportId);
  if (!item) return "нет такого транспорта";

  const cost = transportCost(state, transportId);
  if (cost > 0) {
    payFlexible(state, cost, "обязательные");
  }
  state.scales.energy = Math.max(0, state.scales.energy - item.energyCost);
  state.scales.hunger = Math.max(0, state.scales.hunger - item.hungerCost);
  state.scales.mood += item.moodGain;
  if (item.dirt > 0) {
    state.scales.cleanliness = Math.max(
      0,
      state.scales.cleanliness - item.dirt,
    );
  }
  // Обморок на морозе: грязный Соломон в метель идёт пешком и мёрзнет.
  if (transportId === "walk" && isSnowDay(state)) {
    state.scales.mood = Math.max(
      0,
      state.scales.mood - RULES.sickMoodCost,
    );
    state.scales.energy = Math.max(
      0,
      state.scales.energy - RULES.sickEnergyCost,
    );
    state.dayNotes.push(
      `настроение −${RULES.sickMoodCost}, энергия −${RULES.sickEnergyCost}: Соломон замёрз в метель`,
    );
  }
  state.clock += item.minutes;
  state.transportToday = transportId;
  clampScales(state);
  const label = `дорога: ${item.label}${cost > 0 ? ` −${cost}` : " (проездной)"}`;
  state.dayActions.push(label);
  advance(state);
  return label;
}

/**
 * Решение «ничего не платить».
 *
 * Игрок сам отказывается от обязательных платежей на сегодня. Это не
 * действие с ценой, а запись в журнал дня: ничего не тратится, но решение
 * остаётся в истории — как и должно быть в игре про бюджет.
 */
export function skipPayments(state: GameState): string {
  state.dayActions.push("платежи: ничего не плачу");
  state.dayNotes.push("платежи отложены: сегодня ничего не платим");
  return "платежи отложены";
}

/** Сон: закрывает день. */
export function rest(state: GameState): string {
  const reason = restBlockReason(state);
  if (reason) return reason;
  const label = sleep(state);
  state.clock = DAY.nightMinutes;
  state.phase = "done";
  state.dayActions.push("сон");
  return label;
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
 * После закрытия события дневной цикл продолжается — день события остаётся
 * обычным днём, просто с дополнительным выбором.
 */
export function resolveEvent(state: GameState, optionId: string): string {
  const event = state.pendingEvent;
  if (!event) return "нет открытого события";
  const option = event.options.find((o) => o.id === optionId);
  if (!option) return "нет такого варианта";

  let label = "";
  if (event.id === "phone") {
    if (state.phoneResolved) return "событие уже закрыто";
    // Долга нет: если денег не хватает, событие не закрывается.
    if (option.cost > 0 && !canPay(state, option.cost)) {
      return "не хватает денег";
    }
    payFlexible(state, option.cost, "телефон");
    state.scales.mood += option.moodGain;
    state.phoneResolved = true;
    // Телефон, который не починили, закрывает доставку и тик-токи.
    state.phoneBroken = optionId === "old";
    label = `телефон: ${optionId} −${option.cost}`;
  } else {
    if (state.giftResolved) return "событие уже закрыто";
    // Долга нет: если денег не хватает, событие не закрывается.
    if (option.cost > 0 && !canPay(state, option.cost)) {
      return "не хватает денег";
    }
    payFlexible(state, option.cost, "подарки");
    state.scales.mood += option.moodGain;
    addRep(state, 1);
    state.giftResolved = true;
    label = `подарок: ${optionId} −${option.cost}`;
  }

  clampScales(state);
  // Событие — часть дня, поэтому его подпись попадает в журнал дня.
  state.dayActions.push(label);
  state.pendingEvent = null;
  // Событие закрыто — дневной цикл продолжается со следующей фазы.
  advance(state);
  return label;
}

/* ------------------------------------------------------------------ */
/* Дневной цикл                                                        */
/* ------------------------------------------------------------------ */

/** Открыть событие дня, если оно есть и ещё не закрыто. */
function openPendingEvent(state: GameState): GameEvent | null {
  for (const event of eventsForScenario(state.scenarioKey)) {
    if (event.day !== state.day) continue;
    if (event.id === "phone" && state.phoneResolved) continue;
    if (event.id === "gift" && state.giftResolved) continue;
    return event;
  }
  return null;
}

/**
 * Продвинуть дневной цикл до следующей фазы.
 * Останавливается, если нужно решение игрока (завтрак, дорога, событие).
 */
export function advance(state: GameState): string[] {
  for (;;) {
    switch (state.phase) {
      case "morning": {
        if (state.breakfastToday && state.transportToday) {
          state.phase = "classes";
          break;
        }
        return state.dayActions;
      }
      case "classes": {
        state.dayNotes.push(...classes(state));
        state.clock = DAY.classesEnd;
        state.phase = "free";
        break;
      }
      case "free": {
        const event = openPendingEvent(state);
        if (event) {
          state.pendingEvent = event;
          return state.dayActions;
        }
        return state.dayActions;
      }
      default:
        return state.dayActions;
    }
  }
}

/**
 * Начать новый день.
 *
 * `startDay()` вызывается только один раз на день: повторный вызов сдвинул бы
 * день заново (списал бы спад шкал второй раз). Поэтому день помечается
 * флагом `dayStarted`, а повторный вызов — no-op.
 */
export function startDay(state: GameState): string[] {
  if (state.dayStarted) return state.dayActions;
  // День помечается начатым сразу: иначе перезагрузка страницы во время
  // события перезапустила бы дневной цикл.
  state.dayStarted = true;
  state.week = Math.floor((state.day - 1) / 7);
  state.dayActions = [];
  state.dayNotes = [];
  // Суточные счётчики действий обнуляются каждый день.
  state.sleepsToday = 0;
  state.petsToday = 0;
  state.washesToday = 0;
  state.laundriesToday = 0;
  state.funToday = 0;
  state.breakfastToday = false;
  state.transportToday = null;
  state.mealsToday = 0;
  state.lessonsToday = false;
  state.clock = DAY.startMinutes;
  state.phase = "morning";
  state.dayNotes = decay(state);
  // Еда хранится два дня: приготовили в день D — доступна в D и D+1,
  // а на D+2 она портится и пропадает.
  if (
    state.mealStock.servings > 0 &&
    state.day - state.mealStock.preparedOnDay >= RULES.mealKeepsDays
  ) {
    state.mealStock = { servings: 0, preparedOnDay: 0 };
    state.dayNotes.push("еда испортилась: запас пролежал слишком долго");
  }
  // Неоплаченное жильё — проигрыш сразу, а не в конце дня: ждать следующей
  // ночи, чтобы узнать о выселении, незачем.
  const scenario = SCENARIOS[state.scenarioKey];
  if (!state.housingPaid && state.day > scenario.housingDeadline) {
    state.lost = true;
    state.lossReason = LOSS_REASONS.housing;
    return state.dayActions;
  }
  return advance(state);
}

/** Причины проигрыша. */
export const LOSS_REASONS: Record<LossReason["id"], LossReason> = {
  housing: {
    id: "housing",
    title: "Вас выселили из общежития",
    text: "Жильё в общежитии не было оплачено вовремя. Вас выселили, а коробку с орехами пришлось забрать с собой.",
  },
  depression: {
    id: "depression",
    title: "Соломон впал в депрессию",
    text: "Настроение упало до нуля: без развлечений и без заботы Соломону стало так плохо, что он больше не встал. Развлекайтесь каждый день — и следите за настроением.",
  },
};

/**
 * Завершить день: записать в журнал, применить последствия и перейти к
 * следующему дню.
 *
 * Проверки проигрыша живут здесь, а не в интерфейсе: правило «не уследил —
 * проиграл» должно срабатывать одинаково в игре и в эталоне.
 */
export function endDay(state: GameState, actions: string[]): void {
  const scenario = SCENARIOS[state.scenarioKey];

  // 1. Уроки: если не сделаны — у Соломона начинаются проблемы с учёбой.
  if (!state.lessonsToday) {
    state.lessonStreak = 0;
    state.missedLessons += 1;

    state.scales.mood = Math.max(0, state.scales.mood - RULES.missedLessonMood);
    state.dayNotes.push(
      `настроение −${RULES.missedLessonMood}: уроки пропущены`,
    );
    if (state.missedLessons >= RULES.lessonProblemsAfter) {
      state.lessonProblems = true;
      state.dayNotes.push("у Соломона начались проблемы с учёбой");
    }
  }

  // 2. Стирка: Соломону нечего надеть.
  if (state.day - state.laundryDay >= scenario.laundryEveryDays) {
    state.scales.mood = Math.max(0, state.scales.mood - 5);
    state.dayNotes.push("настроение −5: Соломону нечего надеть — постирайте вещи");
  }

  // 3. День без радости: без развлечений Соломон грустит.
  if (state.funToday < RULES.funPerDay) {
    state.scales.mood = Math.max(0, state.scales.mood - RULES.noFunMoodPenalty);
    state.dayNotes.push(
      `настроение −${RULES.noFunMoodPenalty}: день без развлечений`,
    );
  }

  // 4. Ноль на шкале — это событие.
  //   * энергия или сытость на нуле два дня подряд: Соломон теряет сознание,
  //     и на лечение уходят деньги;
  //   * настроение на нуле: депрессия, и на этом игра проиграна.
  const collapsed = state.scales.energy <= 0 || state.scales.hunger <= 0;
  state.collapseDays = collapsed ? state.collapseDays + 1 : 0;
  if (state.collapseDays >= RULES.collapseDaysToBill) {
    state.collapseDays = 0;
    state.treatmentBills += 1;
    payFlexible(state, RULES.treatmentCost, "быт");
    // Причина обморока разная: голод — одно, истощение — другое. Игрок
    // должен понимать, что именно с ним случилось.
    const cause = state.scales.hunger <= 0 ? "от голода" : "от истощения";
    state.dayNotes.push(
      `Соломон потерял сознание ${cause}: счёт на лечение −${RULES.treatmentCost}`,
    );
    state.dayActions.push(`лечение −${RULES.treatmentCost}`);
  }
  if (state.scales.mood <= 0) {
    state.lost = true;
    state.lossReason = LOSS_REASONS.depression;
  }

  // 5. Жильё: не заплатил к сроку — выселение.
  if (!state.housingPaid && state.day >= scenario.housingDeadline) {
    state.lost = true;
    state.lossReason = LOSS_REASONS.housing;
  }

  clampScales(state);
  state.log.push({
    day: state.day,
    cash: state.cash,
    savings: state.savings,
    mood: state.scales.mood,
    energy: state.scales.energy,

    hunger: state.scales.hunger,
    cleanliness: state.scales.cleanliness,
    actions,
    notes: state.dayNotes,
  });

  state.dayActions = [];
  state.dayNotes = [];
  state.dayStarted = false;
  if (state.lost || state.day >= scenario.days) {
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
 * погладить Соломона ещё раз) и теряла часть журнала дня.
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
    laundriesToday: state.laundriesToday ?? 0,
    funToday: state.funToday ?? 0,
    breakfastToday: state.breakfastToday ?? false,
    transportToday: state.transportToday ?? null,
    mealsToday: state.mealsToday ?? 0,
    mealStock: state.mealStock ?? { servings: 0, preparedOnDay: 0 },
    lessonsToday: state.lessonsToday ?? false,
    lessonStreak: state.lessonStreak ?? 0,
    missedLessons: state.missedLessons ?? 0,
    lessonProblems: state.lessonProblems ?? false,
    housingPaid: state.housingPaid ?? false,
    internetUntil: state.internetUntil ?? 0,
    transitUntil: state.transitUntil ?? 0,
    laundryDay: state.laundryDay ?? 1,
    collapseDays: state.collapseDays ?? 0,
    treatmentBills: state.treatmentBills ?? 0,
    lost: state.lost ?? false,
    lossReason: state.lossReason ?? null,
    clock: state.clock ?? DAY.startMinutes,
    phase: state.phase ?? "morning",
    itemDays: state.itemDays ?? {},
    // Шкалы приводятся в диапазон: сохранение могло быть сделано старой
    // версией игры, где обрезки в ядре не было.
    scales: {
      mood: Math.max(0, Math.min(100, state.scales.mood)),
      energy: Math.max(0, Math.min(100, state.scales.energy)),
      hunger: Math.max(0, Math.min(100, state.scales.hunger)),
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
    // Утро: завтрак и дорога — их задаёт стратегия. Действия сами пишут
    // себя в журнал дня, поэтому результат стратегии сюда не возвращаем.
    policy(state);
    // Событие открывается в свободное время: если стратегия его не закрыла,
    // закрываем вариантом по умолчанию (как в эталоне).
    if (state.pendingEvent) {
      resolveEvent(state, eventChoice(state.pendingEvent));
    }
    endDay(state, state.dayActions);
    if (state.finished) break;
  }
  return state;
}

/** Выбор варианта события по умолчанию — как в эталонной стратегии «Баланс». */
export function defaultEventChoice(event: GameEvent): string {
  if (event.id === "phone") return "repair";
  return "mid";
}
