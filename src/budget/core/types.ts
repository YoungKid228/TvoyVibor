/**
 * Типы доменного ядра игры «Белка Соломон».
 *
 * Ядро не знает про React и DOM: чистые данные и чистые функции.
 * Числа обязаны совпадать с эталоном `scripts/balance_sim.py`.
 *
 * День устроен по часам: утро (завтрак и дорога к парам), пары до 15:00,
 * потом свободное время и сон. Сон — обязательное условие конца дня.
 */

/**
 * Ключ сценария. Список режимов — в `src/data/solomon-game.json` → `scenarios`.
 * Сейчас играется неделя; месячный режим убран и вернётся данными.
 */
export type ScenarioKey = "short";

export type Screen =
  | "menu"
  | "day"
  | "event"
  | "result";

/**
 * Состояние шкал. Их четыре, и две из них общие для игрока и Соломона:
 * настроение и чистота.
 */
export type Scales = {
  /** Настроение — общее у игрока и Соломона: счастье здесь одно. */
  mood: number;
  /** Энергия: хватит ли сил на смену, учёбу и готовку. */
  energy: number;
  /** Сытость. */
  hunger: number;
  /** Чистота — общая: и игрок, и Соломон. 0 — грязно. */
  cleanliness: number;
};

/** Запас приготовленной еды. */
export type MealStock = {
  /** Сколько порций осталось. */
  servings: number;
  /** В какой день еду приготовили. */
  preparedOnDay: number;
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

export type SpendId =
  | "food-cheap"
  | "food-fast"
  | "food-luxe"
  | "food-leftovers"
  | "food-coffee"
  | "food-syrniki"
  | "housing"
  | "internet"
  | "transit-pass"
  | "laundry"
  | "kino"
  | "park"
  | "tiktok"
  | "computer"
  | "pet"
  | "wash"
  | "lessons";

export type TransportId = "walk" | "bus" | "taxi";

export type ItemId = "laptop" | "washer" | "gym";

export type ProfessionId =
  | "none"
  | "student"
  | "courier"
  | "engineer"
  | "creative";

export type Spend = {
  id: SpendId;
  label: string;
  /** Иконка траты из набора `src/assets/ui`. */
  icon: string;
  /** Цена, ₽. */
  cost: number;
  /** Длительность действия, минут. */
  minutes: number;
  /** Локация, где происходит действие: игра показывает её на сцене. */
  location: string;
  moodGain: number;
  /** Расход энергии (положительное число). */
  energyCost: number;
  /** Прирост энергии от еды (положительное число). */
  energyGain: number;
  hungerGain: number;
  /** Прирост общей чистоты. */
  cleanlinessGain: number;
  repGain: number;
  /** Статья разбора расходов. */
  category: SpendCategory;
  /** Готовит ли трата еду «на потом». */
  preparesMeal: boolean;
  /** Условие доступности: null | "preparedMeal" | "internet" | "mood". */
  requires: string | null;
  /** Разовая трата: оплачивается один раз за игру. */
  once?: boolean;
  /** Периодическая трата: оплачивается на весь период. */
  period?: boolean;
};

/** Утренний выбор дороги до пар. */
export type Transport = {
  id: TransportId;
  label: string;
  icon: string;
  /** Цена поездки, ₽ (с проездным — 0). */
  cost: number;
  /** Длительность дороги, минут. */
  minutes: number;
  /** Расход энергии. */
  energyCost: number;
  /** Расход сытости: до пары ещё нужно идти. */
  hungerCost: number;
  /** Насколько Соломон пачкается по дороге. */
  dirt: number;
  moodGain: number;
};

/** Расписание дня: часы в минутах от 00:00. */
export type DayPlan = {
  /** Начало дня. */
  startMinutes: number;
  /** До этого времени нужно успеть позавтракать и доехать до пар. */
  morningEnd: number;
  /** Начало пар. */
  classesStart: number;
  /** Конец пар. */
  classesEnd: number;
  /** После этого времени день закончен — только сон. */
  nightMinutes: number;
};

export type Profession = {
  id: ProfessionId;
  label: string;
  /** Иконка профессии из набора `src/assets/ui`. */
  icon: string;
  /** Дополнительная репутация на старте. */
  repBonus: number;
  /** Дополнительное стартовое настроение. */
  moodBonus: number;
};

export type Scenario = {
  key: ScenarioKey;
  label: string;
  days: number;
  /** Стартовый капитал, ₽. */
  capital: number;
  /** После какого дня неоплаченное жильё — это выселение. */
  housingDeadline: number;
  /** Сколько дней интернет работает бесплатно. */
  internetTrialDays: number;
  /** На сколько дней хватает оплаты интернета. */
  internetDays: number;
  /** На сколько дней хватает проездного. */
  transitDays: number;
  /** Как часто нужно стирать вещи. */
  laundryEveryDays: number;
  phoneDay: number;
  giftDay: number;
  /** Дни снегопада: дорога дороже и дольше. */
  snowDays: number[];
  hungerDecay: number;
  /** Насколько падает общая чистота за день (0…100). */
  cleanlinessDecay: number;
};

/** Правила модели — константы, общие для обоих режимов. */
export type Rules = {
  boringDaily: number;
  sleepMood: number;
  /** Базовая энергия, которую возвращает сон. */
  sleepEnergy: number;
  /** На сколько сон опускает сытость. */
  sleepHunger: number;
  /** Сколько приёмов пищи в день можно съесть. */
  mealsPerDay: number;
  /** Настроение, которое Соломон снимает скукой без ухода. */
  petNeglectMood: number;
  /** Сколько раз в день можно спать. */
  sleepPerDay: number;
  /** Сколько раз в день можно погладить Соломона. */
  petPerDay: number;
  /** Сколько раз в день можно мыть Соломона. */
  washPerDay: number;
  /** Сколько раз в день можно стирать вещи. */
  laundryPerDay: number;
  /** Сколько порций в приготовленной еде. */
  mealServings: number;
  /** Сколько дней еда хранится: готовим в день D — доступно в D и D+1. */
  mealKeepsDays: number;
  /** Сколько развлечений нужно за день, чтобы Соломон не грустил. */
  funPerDay: number;
  /** Насколько падает настроение за день без развлечений. */
  noFunMoodPenalty: number;
  /** Чистота Соломона, начиная с которой он считается чистым (вариант спрайта 0). */
  cleanAt: number;
  /** Чистота Соломона, ниже которой он считается сильно грязным (вариант 2). */
  dirtyAt: number;
  /** Насколько Соломон пачкается за день. */
  cleanlinessDecay: number;
  /** Потолок репутации: выше него репутация ничего не даёт. */
  repCap: number;
  saveBonusAt: number;
  saveBonus: number;
  hungerPenalty: number;
  hygienePenalty: number;
  /** Расход энергии за пары. */
  classesEnergyCost: number;
  /** Расход настроения за пары. */
  classesMoodCost: number;
  /** Расход сытости за пары. */
  classesHungerCost: number;
  /** Расход чистоты за пары. */
  classesCleanlinessCost: number;
  /** Длительность пар, минут. */
  classesMinutes: number;
  /** Штраф настроению за пропущенные уроки. */
  missedLessonMood: number;
  /** После скольких пропусков у Соломона начинаются проблемы с учёбой. */
  lessonProblemsAfter: number;
  /** Ниже этого настроения развлечения недоступны. */
  moodForFun: number;
  /** Сытость, ниже которой Соломон считается брошенным. */
  neglectHunger: number;
  /**
   * Сколько дней подряд энергия или сытость на нуле — и приходит счёт на
   * лечение (Соломон теряет сознание).
   */
  collapseDaysToBill: number;
  /** Счёт за лечение, ₽. */
  treatmentCost: number;
  /** Обморок на морозе: сколько настроения уходит. */
  sickMoodCost: number;
  /** Обморок на морозе: сколько энергии уходит. */
  sickEnergyCost: number;
  cleanFactorGood: number;
  cleanFactorWeak: number;
  cleanFactorBad: number;
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
  energyCost?: number;
  /** Пояснение для игрока: чем приходится платить. */
  hint: string;
};

export type GameEvent = {
  id: "phone" | "gift";
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
  hunger: number;
  /** Общая чистота на конец дня. */
  cleanliness: number;
  actions: string[];
  /** Причины изменения шкал в этот день. */
  notes: string[];
};

/** Причина проигрыша. */
export type LossReason = {
  id: "housing" | "depression";
  title: string;
  text: string;
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
  avgCleanliness: number;
  income: number;
  expenses: number;
  moneyGrade: string;
  moodGrade: string;
  verdict: string;
  audit: ExpenseAudit;
};

/** Фаза дня. */
export type DayPhase =
  /** Утро: завтрак и дорога к парам. */
  | "morning"
  /** Пары: игрок ждёт, время идёт само. */
  | "classes"
  /** Свободное время: работа, развлечения, уход. */
  | "free"
  /** День закончен (после сна). */
  | "done";

/** Полное состояние игры. */
export type GameState = {
  scenarioKey: ScenarioKey;
  professionId: ProfessionId;
  /** Текущий день, 1-based. */
  day: number;
  /** Номер недели, 0-based: (day - 1) / 7. */
  week: number;
  /** Фаза текущего дня. */
  phase: DayPhase;
  /** Время суток в минутах от 00:00. */
  clock: number;
  cash: number;
  savings: number;
  scales: Scales;
  /** Успеваемость: растёт от уроков, падает от пропусков. */
  rep: number;
  items: ItemId[];
  income: number;
  expenses: number;
  spentByCategory: Record<SpendCategory, number>;
  /** Флаги одноразовых событий — чтобы нельзя было пройти их дважды. */
  phoneResolved: boolean;
  giftResolved: boolean;
  /** Телефон сломали и не починили: нет курьерской доставки и тик-тока. */
  phoneBroken: boolean;
  /** Открытое событие, требующее выбора. */
  pendingEvent: GameEvent | null;
  log: DayLogEntry[];
  /** Флаги действий текущего дня — для защиты от повторного начисления. */
  dayActions: string[];
  /** Сколько раз игрок спал сегодня. */
  sleepsToday: number;
  /** Сколько раз игрок гладил Соломона. */
  petsToday: number;
  /** Сколько раз игрок мыл Соломона. */
  washesToday: number;
  /** Сколько раз игрок стирал вещи сегодня. */
  laundriesToday: number;
  /** Сколько развлечений было сегодня. */
  funToday: number;
  /** Завтрак выбран? */
  breakfastToday: boolean;
  /** Как добрались до пар? */
  transportToday: TransportId | null;
  /** Сколько раз ел сегодня. */
  mealsToday: number;
  /**
   * Запас еды, приготовленной утром.
   *
   * Еда хранится два дня и считается порциями: приготовил — есть запас
   * на сегодня и на завтра, а если не съел и завтра — еда пропадает.
   */
  mealStock: MealStock;
  /** Уроки сделаны сегодня? */
  lessonsToday: boolean;
  /** Сколько дней подряд сделаны уроки. */
  lessonStreak: number;
  /** Сколько дней подряд уроки пропущены. */
  missedLessons: number;
  /** У Соломона начались проблемы с учёбой. */
  lessonProblems: boolean;
  /** Жильё оплачено? */
  housingPaid: boolean;
  /** До какого дня (включительно) работает интернет. */
  internetUntil: number;
  /** До какого дня (включительно) действует проездной. */
  transitUntil: number;
  /** В какой день последний раз стирали вещи. */
  laundryDay: number;
  /**
   * Сколько дней подряд энергия или сытость была на нуле. На второй такой
   * день Соломон теряет сознание, и приходит счёт на лечение.
   */
  collapseDays: number;
  /** Сколько счетов на лечение за игру. */
  treatmentBills: number;
  /** Проигрыш: причина и факт. */
  lost: boolean;
  lossReason: LossReason | null;
  /** День покупки каждой крупной вещи. */
  itemDays: Record<string, number>;
  /** Причины изменения шкал за текущего дня — для обратной связи. */
  dayNotes: string[];
  /** Начался ли уже дневной цикл текущего дня. */
  dayStarted: boolean;
  finished: boolean;
};
