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
  /** Чистота Соломона: 100 — только что вымыт, 0 — грязный. */
  cleanliness: number;
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
  | "zoo"
  | "wash";

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
  /** Иконка работы из набора `src/assets/ui`. */
  icon: string;
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
  /** Иконка траты из набора `src/assets/ui`. */
  icon: string;
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
  /** Иконка крупной покупки из набора `src/assets/ui`. */
  icon: string;
  cost: number;
  effect: "freelance" | "hygiene" | "mood";
  note: string;
};

export type Profession = {
  id: ProfessionId;
  label: string;
  /** Иконка профессии из набора `src/assets/ui`. */
  icon: string;
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
  /** Насколько Соломон пачкается за день (шкала чистоты 0…100). */
  cleanlinessDecay: number;
};

/** Правила модели — константы, общие для обоих режимов. */
export type Rules = {
  weeklyShiftCap: number;
  burnoutMood: number;
  burnoutRate: number;
  boringDaily: number;
  sleepMood: number;
  sleepEnergy: number;
  /** Сколько раз в день можно спать. */
  sleepPerDay: number;
  /** Сколько раз в день можно погладить Соломона. */
  petPerDay: number;
  /** Сколько раз в день можно вымыть Соломона. */
  washPerDay: number;
  /** Чистота Соломона, начиная с которой он считается чистым (вариант спрайта 0). */
  cleanAt: number;
  /** Чистота Соломона, ниже которой он считается сильно грязным (вариант 2). */
  dirtyAt: number;
  /** Потолок репутации: выше него репутация ничего не даёт. */
  repCap: number;
  /** Срок абонемента в зал, дней с момента покупки. */
  gymDays: number;
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

/** Где стоит персонаж в кадре локации — в процентах от размера фона. */
export type CharacterSpot = {
  /** Высота персонажа, % высоты кадра. */
  height: number;
  /** Центр персонажа по горизонтали, % ширины кадра. */
  x: number;
  /** Уровень пола (низ персонажа), % высоты кадра. */
  y: number;
};

/** Локация — фон сцены, где стоит Соломон. */
export type Location = {
  id: string;
  label: string;
  /** Фон сцены. */
  background: string;
  /** Иконка локации. */
  icon: string;
  /** Где в кадре стоит персонаж. */
  character: CharacterSpot;
};

/** Вариант ответа на сюжетное событие. */
export type EventOption = {
  id: string;
  label: string;
  /** Иконка варианта из набора `src/assets/ui`. */
  icon: string;
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
  /** Иконка события из набора `src/assets/ui`. */
  icon: string;
  /** Локация, в которой разворачивается событие. */
  location: string;
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
  /** Чистота Соломона на конец дня. */
  cleanliness: number;
  actions: string[];
  /** Причины изменения шкал в этот день. */
  notes: string[];
};

export type ExpenseAudit = {
  obligatoryCovered: boolean;
  optionalShare: number;
  noDebt: boolean;
  hasSavings: boolean;
  walletNotEmpty: boolean;
  /** Короткий вердикт — заголовок разбора. */
  verdict: string;
  /** Все нарушения списком: вердикт-заголовок перекрывал остальные. */
  violations: string[];
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
  /** Сколько раз игрок спал сегодня. */
  sleepsToday: number;
  /** Сколько раз игрок гладил Соломона сегодня. */
  petsToday: number;
  /** Сколько раз игрок мыл Соломона сегодня. */
  washesToday: number;
  /** День покупки каждой крупной вещи — чтобы абонемент имел срок. */
  itemDays: Record<string, number>;
  /** Причины изменения шкал за текущий день — для обратной связи. */
  dayNotes: string[];
  /** Начался ли уже дневной цикл текущего дня. */
  dayStarted: boolean;
  finished: boolean;
};
