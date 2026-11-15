import {
  DAY,
  RULES,
  SCENARIOS,
  eventsForScenario,
  jobById,
  professionById,
  spendById,
  transportById,
} from "../data/scenario";
import { canPay, payFlexible, save, withdraw } from "./finance";
import {
  addRep,
  clampScales,
  classes,
  decay,
  isBurntOut,
  shiftPay,
  sleep,
} from "./mood";
import type {
  GameEvent,
  GameState,
  JobId,
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
    phoneResolved: false,
    giftResolved: false,
    phoneBroken: false,
    pendingEvent: null,
    log: [],
    dayActions: [],
    sleepsToday: 0,
    petsToday: 0,
    washesToday: 0,
    breakfastToday: false,
    transportToday: null,
    mealsToday: 0,
    preparedMeal: false,
    lessonsToday: false,
    lessonStreak: 0,
    missedLessons: 0,
    lessonProblems: false,
    housingPaid: false,
    internetUntil: scenario.internetTrialDays,
    transitUntil: 0,
    laundryDay: 1,
    neglectDays: 0,
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

/** Проверка, доступна ли работа. Возвращает причину отказа или null. */
export function jobBlockReason(
  state: GameState,
  jobId: JobId,
): string | null {
  const job = jobById(jobId);
  if (!job) return "нет такой работы";
  if (state.pendingEvent) return "сначала закрой событие";
  if (state.phase !== "free") return "работать можно только после пар";
  if (job.requires === "internet" && (!hasInternet(state) || !hasPhone(state))) {
    return "нужен интернет и телефон";
  }
  if (
    job.requires === "internet+lessons" &&
    (!hasInternet(state) ||
      state.lessonStreak < RULES.lessonStreakForTutor)
  ) {
    return `нужен интернет и ${RULES.lessonStreakForTutor} дня уроков подряд`;
  }
  if (job.requires === "day2" && state.day < 2) {
    return "лаборантом можно со второго дня";
  }
  if (state.clock + job.minutes > DAY.nightMinutes) {
    return "не хватит времени до ночи";
  }
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
 * игрок перестал считать. Правило живёт в ядре (`buy()`), а не здесь.
 */
export function spendBlockReason(
  state: GameState,
  spendId: SpendId,
): string | null {
  const spend = spendById(spendId);
  if (!spend) return "нет такой траты";
  if (state.pendingEvent) return "сначала закрой событие";
  if (spendId === "pet" && state.petsToday >= RULES.petPerDay) {
    return `поглаживаний на сегодня хватает (${RULES.petPerDay})`;
  }
  if (spendId === "wash" && state.washesToday >= RULES.washPerDay) {
    return `мытьё на сегодня уже было (${RULES.washPerDay})`;
  }
  // Сытый Соломон больше не ест: два приёма пищи в день — и всё.
  if (spendId.startsWith("food-") && state.mealsToday >= RULES.mealsPerDay) {
    return `Соломон сыт: еда больше не лезет (${RULES.mealsPerDay} приёма пищи в день)`;
  }
  if (spend.requires === "preparedMeal" && !state.preparedMeal) {
    return "нечего есть: сначала приготовь еду";
  }
  if (spend.requires === "internet" && !hasInternet(state)) {
    return "нет интернета";
  }
  if (
    spend.requires === "mood" &&
    state.scales.mood < RULES.moodForFun
  ) {
    return "настроение плохое — не до развлечений";
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

/** Уйдёт ли трата в долг. */
export function goesIntoDebt(state: GameState, spendId: SpendId): boolean {
  const spend = spendById(spendId);
  if (!spend || spend.cost === 0) return false;
  return state.cash < spend.cost && state.savings < spend.cost - state.cash;
}

/* ------------------------------------------------------------------ */
/* Действия игрока                                                     */
/* ------------------------------------------------------------------ */

/** Выйти на смену. Работать можно только после пар. */
export function work(state: GameState, jobId: JobId): string {
  const job = jobById(jobId);
  if (!job) return "нет такой работы";
  const reason = jobBlockReason(state, jobId);
  if (reason) return reason;

  // Шкалы приводятся в диапазон ДО расчёта дохода: иначе множитель
  // посчитался бы от значения выше 100 и смена принесла бы больше базовой
  // ставки.
  clampScales(state);

  const burnt = isBurntOut(state.scales.mood);
  const base = job.pay + professionById(state.professionId).payBonus;
  const gain = shiftPay(base, state.scales.mood);
  state.cash += gain;
  state.income += gain;
  state.scales.energy = Math.max(0, state.scales.energy - job.energyCost);
  state.scales.mood = Math.max(
    0,
    state.scales.mood - job.moodCost * (burnt ? 2 : 1),
  );
  state.clock += job.minutes;
  clampScales(state);
  const key = weekJobKey(state.week, jobId);
  state.weekJobs[key] = (state.weekJobs[key] ?? 0) + 1;
  state.weekShifts[state.week] = (state.weekShifts[state.week] ?? 0) + 1;
  state.shifts += 1;
  const label = `работа: ${job.label} +${gain}`;
  state.dayActions.push(label);
  return label + (burnt ? " (выгорание)" : "");
}

/**
 * Потратить деньги и время.
 *
 * Утром доступна только еда — это завтрак. После пар — всё остальное.
 */
export function buy(state: GameState, spendId: SpendId): string {
  const spend = spendById(spendId);
  if (!spend) return "нет такой траты";

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
    if (spend.preparesMeal) state.preparedMeal = true;
    if (spendId === "food-leftovers") state.preparedMeal = false;
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
  if (spendId === "laundry") state.laundryDay = state.day;
  state.clock += spend.minutes;
  clampScales(state);

  const label = `${spend.label} ${paid}`;
  state.dayActions.push(label);
  advance(state);
  return label;
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
  if (state.phase !== "morning") return "дорога выбирается только утром";
  if (state.transportToday) return "дорога уже выбрана";
  const item = transportById(transportId);
  if (!item) return "нет такого транспорта";
  if (transportId === "walk" && isSnowDay(state)) {
    return "в метель пешком не дойдёшь";
  }
  if (state.clock + item.minutes > DAY.morningEnd) {
    return "не успеваешь к парам";
  }

  const cost = transportCost(state, transportId);
  if (cost > 0) {
    payFlexible(state, cost, "обязательные");
  }
  state.scales.energy = Math.max(0, state.scales.energy - item.energyCost);
  state.scales.mood += item.moodGain;
  if (item.dirt > 0) {
    state.scales.cleanliness = Math.max(
      0,
      state.scales.cleanliness - item.dirt,
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
    payFlexible(state, option.cost, "телефон");
    state.scales.mood += option.moodGain;
    state.phoneResolved = true;
    // Телефон, который не починили, закрывает доставку и тик-токи.
    state.phoneBroken = optionId === "old";
    label = `телефон: ${optionId} −${option.cost}`;
  } else {
    if (state.giftResolved) return "событие уже закрыто";
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
  state.breakfastToday = false;
  state.transportToday = null;
  state.mealsToday = 0;
  state.preparedMeal = false;
  state.lessonsToday = false;
  state.clock = DAY.startMinutes;
  state.phase = "morning";
  state.dayNotes = decay(state);
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
    title: "Соломона выселили",
    text: "Жильё в общежитии не было оплачено вовремя. Соломона выселили, а вам пришлось разбираться самому — и толку от этого не вышло.",
  },
  neglect: {
    id: "neglect",
    title: "За Соломоном не уследили",
    text: "Два дня подряд Соломон оставался голодным и брошенным. Ему стало плохо, и к счастью, кто-то другой о нём смог позаботиться лучше.",
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

  // 3. Пренебрежение: голодный или грустный Соломон два дня подряд.
  // Проигрыш завязан на голод: пока еда есть, за Соломоном можно не уследить
  // (он будет скучать, развлечения закроются), но не бросить его голодным.
  const neglected = state.scales.hunger <= RULES.neglectHunger;
  state.neglectDays = neglected ? state.neglectDays + 1 : 0;
  if (state.neglectDays >= RULES.neglectDaysToLose) {
    state.lost = true;
    state.lossReason = LOSS_REASONS.neglect;
  }

  // 4. Жильё: не заплатил к сроку — выселение.
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
    breakfastToday: state.breakfastToday ?? false,
    transportToday: state.transportToday ?? null,
    mealsToday: state.mealsToday ?? 0,
    preparedMeal: state.preparedMeal ?? false,
    lessonsToday: state.lessonsToday ?? false,
    lessonStreak: state.lessonStreak ?? 0,
    missedLessons: state.missedLessons ?? 0,
    lessonProblems: state.lessonProblems ?? false,
    housingPaid: state.housingPaid ?? false,
    internetUntil: state.internetUntil ?? 0,
    transitUntil: state.transitUntil ?? 0,
    laundryDay: state.laundryDay ?? 1,
    neglectDays: state.neglectDays ?? 0,
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
