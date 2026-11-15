import raw from "../../data/solomon-game.json";
import type {
  DayPlan,
  ExpenseAudit,
  GameEvent,
  Job,
  Location,
  Profession,
  Rules,
  Scenario,
  ScenarioKey,
  Spend,
  SpendCategory,
  SpendCategoryKey,
  Transport,
} from "../core/types";

/**
 * Игровые данные берутся из `src/data/solomon-game.json` — тот же файл, который
 * сверяется с эталоном `scripts/balance_sim.py` в `scripts/verify_hermes_doc.py`.
 * Здесь только типизация и разбор структуры, никаких дублирующих констант.
 */

type RawJob = {
  id: string;
  label: string;
  icon: string;
  pay: number;
  moodCost: number;
  energyCost: number;
  minutes: number;
  limit: number;
  requires: string | null;
  local: boolean;
};

type RawSpend = {
  id: string;
  label: string;
  icon: string;
  cost: number;
  minutes: number;
  location: string;
  moodGain: number;
  energyCost: number;
  energyGain: number;
  hungerGain: number;
  cleanlinessGain: number;
  repGain: number;
  category: SpendCategory;
  preparesMeal: boolean;
  requires: string | null;
  once?: boolean;
  period?: boolean;
};

type RawTransport = {
  id: string;
  label: string;
  icon: string;
  cost: number;
  minutes: number;
  energyCost: number;
  dirt: number;
  moodGain: number;
};

type RawProfession = {
  id: string;
  label: string;
  icon: string;
  payBonus: number;
  moodBonus: number;
  shiftBonus: number;
  repBonus: number;
};

type RawEvent = {
  id: string;
  day: number;
  title: string;
  icon: string;
  location: string;
  options: {
    id: string;
    label: string;
    icon: string;
    cost: number;
    moodGain: number;
    solomonGain?: number;
    energyCost?: number;
  }[];
};

type RawLocation = {
  id: string;
  label: string;
  background: string;
  icon: string;
  character: { height: number; x: number; y: number };
};

const data = raw as unknown as {
  day: DayPlan;
  jobs: RawJob[];
  spends: RawSpend[];
  transport: RawTransport[];
  professions: RawProfession[];
  events: RawEvent[];
  locations: Record<string, RawLocation>;
  tabLocations: Record<string, string>;
  scenarios: Record<ScenarioKey, Record<string, number | number[] | string>>;
  rules: Record<string, number | boolean>;
  spendCategories: Record<SpendCategoryKey, SpendCategory>;
  entertainmentSpends: string[];
};

export const JOBS: Job[] = data.jobs.map((job) => ({
  id: job.id as Job["id"],
  label: job.label,
  icon: job.icon,
  pay: job.pay,
  energyCost: job.energyCost,
  moodCost: job.moodCost,
  minutes: job.minutes,
  requires: job.requires,
  limit: job.limit,
  local: job.local,
}));

export const SPENDS: Spend[] = data.spends.map((spend) => ({
  id: spend.id as Spend["id"],
  label: spend.label,
  icon: spend.icon,
  cost: spend.cost,
  minutes: spend.minutes,
  location: spend.location,
  moodGain: spend.moodGain,
  energyCost: spend.energyCost,
  energyGain: spend.energyGain,
  hungerGain: spend.hungerGain,
  cleanlinessGain: spend.cleanlinessGain,
  repGain: spend.repGain,
  category: spend.category,
  preparesMeal: spend.preparesMeal,
  requires: spend.requires,
  once: spend.once,
  period: spend.period,
}));

export const TRANSPORTS: Transport[] = data.transport.map((item) => ({
  id: item.id as Transport["id"],
  label: item.label,
  icon: item.icon,
  cost: item.cost,
  minutes: item.minutes,
  energyCost: item.energyCost,
  dirt: item.dirt,
  moodGain: item.moodGain,
}));

export const PROFESSIONS: Profession[] = data.professions.map((prof) => ({
  id: prof.id as Profession["id"],
  label: prof.label,
  icon: prof.icon,
  repBonus: prof.repBonus,
  shiftBonus: prof.shiftBonus,
  moodBonus: prof.moodBonus,
  payBonus: prof.payBonus,
}));

const EVENT_HINTS: Record<string, Record<string, string>> = {
  phone: {
    repair: "Починим — почти вдвое дешевле, но связь работает через день.",
    new: "Новый телефон дорогой, зато радость каждый день.",
    old: "Бесплатно, но без телефона нет курьерской доставки и тик-тока.",
  },
  gift: {
    big: "Впечатление сильное, но дыра в кошельке тоже.",
    mid: "Золотая середина: и друг, и кошелёк довольны.",
    small: "Дёшево, но внимание важнее суммы.",
  },
};

const EVENT_TITLES: Record<string, string> = {
  phone: "Сломался телефон",
  gift: "День рождения друга",
};

const EVENT_DESCRIPTIONS: Record<string, string> = {
  phone:
    "Телефон — рабочий инструмент: без него не выйти на курьерскую доставку и не посмотреть тик-токи. Ремонт, новый или отказ от связи?",
  gift:
    "Другу сегодня день рождения. Внимание важнее суммы — но и сумма кое-что значит.",
};

export const EVENTS: GameEvent[] = data.events.map((event) => ({
  id: event.id as GameEvent["id"],
  day: event.day,
  title: EVENT_TITLES[event.id] ?? event.title,
  description: EVENT_DESCRIPTIONS[event.id] ?? "",
  icon: event.icon,
  location: event.location,
  options: event.options.map((option) => ({
    id: option.id,
    label: option.label,
    icon: option.icon,
    cost: option.cost,
    moodGain: option.moodGain,
    energyCost: option.energyCost ?? 0,
    hint: EVENT_HINTS[event.id]?.[option.id] ?? "",
  })),
}));

/** Расписание дня: часы в минутах от 00:00. */
export const DAY: DayPlan = data.day;

export const RULES: Rules = {
  weeklyShiftCap: data.rules.weeklyShiftCap as number,
  burnoutMood: data.rules.burnoutMood as number,
  burnoutRate: data.rules.burnoutRate as number,
  boringDaily: data.rules.boringDaily as number,
  sleepMood: data.rules.sleepMood as number,
  sleepEnergy: data.rules.sleepEnergy as number,
  sleepHunger: data.rules.sleepHunger as number,
  petNeglectMood: data.rules.petNeglectMood as number,
  mealsPerDay: data.rules.mealsPerDay as number,
  sleepPerDay: data.rules.sleepPerDay as number,
  petPerDay: data.rules.petPerDay as number,
  washPerDay: data.rules.washPerDay as number,
  cleanAt: data.rules.cleanAt as number,
  dirtyAt: data.rules.dirtyAt as number,
  cleanlinessDecay: data.rules.cleanlinessDecay as number,
  repCap: data.rules.repCap as number,
  saveBonusAt: data.rules.saveBonusAt as number,
  saveBonus: data.rules.saveBonus as number,
  hungerPenalty: data.rules.hungerPenalty as number,
  hygienePenalty: data.rules.hygienePenalty as number,
  classesEnergyCost: data.rules.classesEnergyCost as number,
  classesMoodCost: data.rules.classesMoodCost as number,
  classesMinutes: data.rules.classesMinutes as number,
  lessonStreakForTutor: data.rules.lessonStreakForTutor as number,
  lessonMoodGain: data.rules.lessonMoodGain as number,
  missedLessonMood: data.rules.missedLessonMood as number,
  lessonProblemsAfter: data.rules.lessonProblemsAfter as number,
  moodForFun: data.rules.moodForFun as number,
  neglectHunger: data.rules.neglectHunger as number,
  neglectDaysToLose: data.rules.neglectDaysToLose as number,
  cleanFactorGood: data.rules.cleanFactorGood as number,
  cleanFactorWeak: data.rules.cleanFactorWeak as number,
  cleanFactorBad: data.rules.cleanFactorBad as number,
};

export const SPEND_CATEGORIES: Record<SpendCategoryKey, SpendCategory> =
  data.spendCategories;

/**
 * Локации — фоны сцен, где стоит Соломон.
 *
 * Фоны приходят без персонажа, поэтому локация описывает ещё и точку,
 * где его поставить: координаты в процентах от кадра подобраны по
 * макетам в `backgrounds/preview- того как должно быть`.
 */
export const LOCATIONS: Record<string, Location> = Object.fromEntries(
  Object.entries(data.locations).map(([id, loc]) => [
    id,
    {
      id: loc.id,
      label: loc.label,
      background: loc.background,
      icon: loc.icon,
      character: { ...loc.character },
    },
  ]),
);

/** Какая вкладка открывает какую локацию: «Заработать» → город и т. д. */
export const TAB_LOCATIONS: Record<string, string> = { ...data.tabLocations };

/** Локация по идентификатору; неизвестная — первая доступная. */
export function locationById(id: string): Location {
  return LOCATIONS[id] ?? Object.values(LOCATIONS)[0];
}

/** Траты, которые в разборе считаются необязательными. */
export const ENTERTAINMENT_SPENDS: string[] = data.entertainmentSpends;

function makeScenario(
  key: ScenarioKey,
  raw: Record<string, number | number[] | string>,
): Scenario {
  return {
    key,
    label: raw.label as string,
    days: raw.days as number,
    capital: raw.capital as number,
    housingDeadline: raw.housingDeadline as number,
    internetTrialDays: raw.internetTrialDays as number,
    internetDays: raw.internetDays as number,
    transitDays: raw.transitDays as number,
    laundryEveryDays: raw.laundryEveryDays as number,
    phoneDay: raw.phoneDay as number,
    giftDay: raw.giftDay as number,
    snowDays: raw.snowDays as number[],
    weeklyShiftCap: raw.weeklyShiftCap as number,
    hungerDecay: raw.hungerDecay as number,
    cleanlinessDecay: raw.cleanlinessDecay as number,
  };
}

/** Режимы игры — из данных: добавить режим = добавить запись в JSON. */
export const SCENARIOS = Object.fromEntries(
  (Object.keys(data.scenarios) as ScenarioKey[]).map((key) => [
    key,
    makeScenario(key, data.scenarios[key]),
  ]),
) as Record<ScenarioKey, Scenario>;

/** Типы событий, которые нужно закрыть выбором, — по сценарию. */
export function eventsForScenario(key: ScenarioKey): GameEvent[] {
  const current = SCENARIOS[key];
  return EVENTS.map((event) => {
    if (event.id === "phone") return { ...event, day: current.phoneDay };
    if (event.id === "gift") return { ...event, day: current.giftDay };
    return event;
  }).filter((event) => event.day > 0);
}

export function jobById(id: string): Job | undefined {
  return JOBS.find((job) => job.id === id);
}

export function spendById(id: string): Spend | undefined {
  return SPENDS.find((spend) => spend.id === id);
}

export function transportById(id: string): Transport | undefined {
  return TRANSPORTS.find((item) => item.id === id);
}

export function professionById(id: string): Profession {
  return PROFESSIONS.find((prof) => prof.id === id) ?? PROFESSIONS[0];
}

/** Категория статьи расходов для траты. */
export function categoryForSpend(id: string): SpendCategory {
  return spendById(id)?.category ?? "быт";
}

/**
 * Сколько обязательных расходов нужно покрыть за игру: жильё и интернет.
 *
 * Жильё платится один раз, интернет — на период: в коротком режиме период
 * равен всей игре, поэтому сумма одна и та же.
 */
export const OBLIGATORY_TOTAL = SPENDS.filter(
  (spend) => spend.id === "housing" || spend.id === "internet",
).reduce((sum, spend) => sum + spend.cost, 0);

/** Еда — то, чем игрок завтракает и обедает. */
export const FOOD_SPENDS: string[] = SPENDS.filter((spend) =>
  spend.id.startsWith("food-"),
).map((spend) => spend.id);

export type { ExpenseAudit };
