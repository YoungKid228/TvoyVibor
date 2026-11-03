/**
 * Типы доменного ядра игры «Белка Соломон».
 *
 * Ядро не знает про React и DOM: чистые данные и чистые функции.
 * Числа обязаны совпадать с эталоном `scripts/balance_sim.py`.
 */

export type ScenarioKey = "short" | "long";

export type Screen =
  | "menu"
  | "day"
  | "event"
  | "result";

/** Состояние всех шкал игрока и питомца. */
export type Scales = {
  /** Настроение игрока — шкала счастья, главная шкала игры. */
  mood: number;
  /** Энергия: хватит ли сил на смену. */
  energy: number;
  /** Сытость. */
  hunger: number;
  /** Гигиена. */
  hygiene: number;
  /** Настроение Соломона — индикатор качества жизни. */
  solomon: number;
};

/** Статьи расходов для итогового разбора. */
export type SpendCategory =
  | "обязательные"
  | "быт"
  | "развлечения"
  | "покупки"
  | "подарки"
  | "телефон"
  | "накопления";

export type SpendCategoryKey =
  | "obligatory"
  | "household"
  | "entertainment"
  | "purchases"
  | "gifts"
  | "phone"
  | "savings";

export type JobId =
  | "dishes"
  | "kafe"
  | "tutor"
  | "freelance"
  | "courier"
  | "market"
  | "hegan"
  | "dorm";

export type SpendId =
  | "kino"
  | "cafe"
  | "bowling"
  | "park"
  | "products"
  | "coffee"
  | "pet"
  | "shower"
  | "clothes"
  | "toyshop"
  | "schnitzel"
  | "matza"
  | "breakfast"
  | "dreidel"
  | "amulet"
  | "festival"
  | "zoo";

export type ItemId = "laptop" | "washer" | "gym";

export type ProfessionId =
  | "none"
  | "student"
  | "courier"
  | "engineer"
  | "creative";

export type Job = {
  id: JobId;
  label: string;
  /** Базовая оплата за смену, ₽. */
  pay: number;
  /** Расход энергии за смену. */
  energyCost: number;
  /** Расход настроения за смену. */
  moodCost: number;
  /** Условие доступа: null | "rep>=2" | "laptop". */
  requires: string | null;
  /** Лимит смен этой работы за неделю. */
  limit: number;
  /** Отсылка к местной культуре ЕАО. */
  local: boolean;
};

export type Spend = {
  id: SpendId;
  label: string;
  /** Цена, ₽. */
  cost: number;
  moodGain: number;
  energyCost: number;
  hungerGain: number;
  hygieneGain: number;
  repGain: number;
  solomonGain: number;
  local: boolean;
};

export type Item = {
  id: ItemId;
  label: string;
  cost: number;
  effect: "freelance" | "hygiene" | "mood";
  note: string;
};

export type Profession = {
  id: ProfessionId;
  label: string;
  /** Дополнительная репутация на старте. */
  repBonus: number;
  /** Дополнительные смены за неделю. */
  shiftBonus: number;
  /** Дополнительное стартовое настроение. */
  moodBonus: number;
  /** Добавка к зарплате, ₽. */
  payBonus: number;
};

export type Scenario = {
  key: ScenarioKey;
  label: string;
  days: number;
  /** Стартовый капитал, ₽. */
  capital: number;
  /** Сумма обязательных расходов, ₽. */
  mandatoryTotal: number;
  /** "once" — платим в первый день; "weekly" — по 1/4 каждую неделю. */
  mandatoryMode: "once" | "weekly";
  salary: number;
  salaryDay: number;
  phoneDay: number;
  giftDay: number;
  /** День локального события «снегопад» (0 — не задано). */
  blizzardDay: number;
  weeklyShiftCap: number;
  hungerDecay: number;
  hygieneDecay: number;
  solomonDecay: number;
};

/** Правила модели — константы, общие для обоих режимов. */
export type Rules = {
  weeklyShiftCap: number;
  burnoutMood: number;
  burnoutRate: number;
  boringDaily: number;
  sleepMood: number;
  sleepEnergy: number;
  saveBonusAt: number;
  saveBonus: number;
  solomonUpAt: number;
  solomonUp: number;
  solomonDown: number;
  gloomyOwnerMood: number;
  solomonHappy: number;
  creditMoodPenalty: number;
  debtDailyMoodPenalty: number;
  hungerPenalty: number;
  hygienePenalty: number;
};

/** Вариант ответа на сюжетное событие. */
export type EventOption = {
  id: string;
  label: string;
  cost: number;
  moodGain: number;
  solomonGain?: number;
  energyCost?: number;
  /** Пояснение для игрока: чем приходится платить. */
  hint: string;
};

export type GameEvent = {
  id: "phone" | "gift" | "blizzard";
  day: number;
  title: string;
  description: string;
  options: EventOption[];
};

/** Запись в журнал игрового дня — для графика и разбора. */
export type DayLogEntry = {
  day: number;
  cash: number;
  savings: number;
  mood: number;
  energy: number;
  solomon: number;
  hunger: number;
  hygiene: number;
  actions: string[];
};

export type ExpenseAudit = {
  obligatoryCovered: boolean;
  optionalShare: number;
  noDebt: boolean;
  hasSavings: boolean;
  walletNotEmpty: boolean;
  verdict: string;
  byCategory: Record<SpendCategory, number>;
};

export type GameStats = {
  finalBalance: number;
  cash: number;
  savings: number;
  avgMood: number;
  avgSolomon: number;
  shifts: number;
  income: number;
  expenses: number;
  moneyGrade: string;
  moodGrade: string;
  solomonGrade: string;
  verdict: string;
  audit: ExpenseAudit;
};

/** Полное состояние игры. */
export type GameState = {
  scenarioKey: ScenarioKey;
  professionId: ProfessionId;
  /** Текущий день, 1-based. */
  day: number;
  /** Номер недели, 0-based: (day - 1) / 7. */
  week: number;
  /** Фаза текущего дня — гарантирует правильный порядок операций. */
  phase: "mandatory" | "blizzard" | "decay" | "actions";
  cash: number;
  savings: number;
  scales: Scales;
  rep: number;
  items: ItemId[];
  income: number;
  expenses: number;
  debt: number;
  /** Всего смен за игру. */
  shifts: number;
  /** Смены по неделям: номер недели → число смен. */
  weekShifts: Record<number, number>;
  /** Смены конкретной работы по неделям: "неделя:работа" → число. */
  weekJobs: Record<string, number>;
  spentByCategory: Record<SpendCategory, number>;
  /** Флаги одноразовых событий — чтобы нельзя было пройти их дважды. */
  salaryPaid: boolean;
  phoneResolved: boolean;
  giftResolved: boolean;
  blizzardResolved: boolean;
  /** Выбранный вариант снегопада. */
  blizzardChoice: "taxi" | "bus" | "walk" | null;
  /** Открытое событие, требующее выбора. */
  pendingEvent: GameEvent | null;
  log: DayLogEntry[];
  /** Флаги действий текущего дня — для защиты от повторного начисления. */
  dayActions: string[];
  finished: boolean;
};
