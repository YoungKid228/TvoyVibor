import raw from "../../data/solomon-game.json";
import type {
  ExpenseAudit,
  GameEvent,
  Item,
  Job,
  Profession,
  Rules,
  Scenario,
  ScenarioKey,
  Spend,
  SpendCategory,
  SpendCategoryKey,
} from "../core/types";

/**
 * Игровые данные берутся из `src/data/solomon-game.json` — тот же файл, который
 * сверяется с эталоном `scripts/balance_sim.py` в `scripts/verify_hermes_doc.py`.
 * Здесь только типизация и разбор структуры, никаких дублирующих констант.
 */

type RawJob = {
  id: string;
  label: string;
  pay: number;
  moodCost: number;
  energyCost: number;
  limit: number;
  requires: string | null;
  local: boolean;
};

type RawSpend = {
  id: string;
  label: string;
  cost: number;
  moodGain: number;
  energyCost: number;
  hungerGain: number;
  hygieneGain: number;
  repGain: number;
  solomonGain: number;
  local: boolean;
};

type RawItem = {
  id: string;
  label: string;
  cost: number;
  effect: "freelance" | "hygiene" | "mood";
  note: string;
};

type RawProfession = {
  id: string;
  label: string;
  payBonus: number;
  moodBonus: number;
  shiftBonus: number;
  repBonus: number;
};

type RawEvent = {
  id: string;
  day: number;
  title: string;
  options: {
    id: string;
    label: string;
    cost: number;
    moodGain: number;
    solomonGain?: number;
    energyCost?: number;
  }[];
};

const data = raw as unknown as {
  jobs: RawJob[];
  spends: RawSpend[];
  items: RawItem[];
  professions: RawProfession[];
  events: RawEvent[];
  scenarios: Record<ScenarioKey, Record<string, number | string>>;
  rules: Record<string, number>;
  spendCategories: Record<SpendCategoryKey, SpendCategory>;
  entertainmentSpends: string[];
};

export const JOBS: Job[] = data.jobs.map((job) => ({
  id: job.id as Job["id"],
  label: job.label,
  pay: job.pay,
  energyCost: job.energyCost,
  moodCost: job.moodCost,
  requires: job.requires,
  limit: job.limit,
  local: job.local,
}));

export const SPENDS: Spend[] = data.spends.map((spend) => ({
  id: spend.id as Spend["id"],
  label: spend.label,
  cost: spend.cost,
  moodGain: spend.moodGain,
  energyCost: spend.energyCost,
  hungerGain: spend.hungerGain,
  hygieneGain: spend.hygieneGain,
  repGain: spend.repGain,
  solomonGain: spend.solomonGain,
  local: spend.local,
}));

export const ITEMS: Item[] = data.items.map((item) => ({
  id: item.id as Item["id"],
  label: item.label,
  cost: item.cost,
  effect: item.effect,
  note: item.note,
}));

export const PROFESSIONS: Profession[] = data.professions.map((prof) => ({
  id: prof.id as Profession["id"],
  label: prof.label,
  repBonus: prof.repBonus,
  shiftBonus: prof.shiftBonus,
  moodBonus: prof.moodBonus,
  payBonus: prof.payBonus,
}));

const EVENT_HINTS: Record<string, Record<string, string>> = {
  phone: {
    repair: "Починим — почти вдвое дешевле, но недорогой телефон обидно.",
    new: "Новый телефон дорогой, зато радость каждый день.",
    old: "Бесплатно, но старый телефон бьёт по настроению — и по Соломону.",
  },
  gift: {
    rich: "Дорогой подарок и кафе: дороже всего, но не гарантирует тёплое отношение.",
    mid: "Подарок и праздник: золотая середина.",
    small: "Символический подарок: дёшево, но внимание важнее суммы.",
  },
  blizzard: {
    taxi: "Быстро, но −400 ₽. Город встал.",
    bus: "Бесплатно, но весь день в транспорте.",
    walk: "Бесплатно, но −15 энергии: в −22 мороз идти далеко.",
  },
};

const EVENT_TITLES: Record<string, string> = {
  phone: "Сломался телефон",
  gift: "День рождения друга",
  blizzard: "Снегопад парализует Биробиджан",
};

const EVENT_DESCRIPTIONS: Record<string, string> = {
  phone:
    "Телефон — рабочий инструмент: без него не сдашь курсовую. Ремонт, новый или отказ от связи?",
  gift:
    "Другу сегодня день рождения. Внимание важнее суммы — но и сумма кое-что значит.",
  blizzard:
    "За окном −22 и метель. Город разделился: одни едут на такси, другие идут пешком.",
};

export const EVENTS: GameEvent[] = data.events.map((event) => ({
  id: event.id as GameEvent["id"],
  day: event.day,
  title: EVENT_TITLES[event.id] ?? event.id,
  description: EVENT_DESCRIPTIONS[event.id] ?? "",
  options: event.options.map((option) => ({
    id: option.id,
    label: option.label,
    cost: option.cost,
    moodGain: option.moodGain,
    solomonGain: option.solomonGain ?? 0,
    energyCost: option.energyCost ?? 0,
    hint: EVENT_HINTS[event.id]?.[option.id] ?? "",
  })),
}));

export const RULES: Rules = {
  weeklyShiftCap: data.rules.weeklyShiftCap,
  burnoutMood: data.rules.burnoutMood,
  burnoutRate: data.rules.burnoutRate,
  boringDaily: data.rules.boringDaily,
  sleepMood: data.rules.sleepMood,
  sleepEnergy: data.rules.sleepEnergy,
  saveBonusAt: data.rules.saveBonusAt,
  saveBonus: data.rules.saveBonus,
  solomonUpAt: data.rules.solomonUpAt,
  solomonUp: data.rules.solomonUp,
  solomonDown: data.rules.solomonDown,
  gloomyOwnerMood: data.rules.gloomyOwnerMood,
  solomonHappy: data.rules.solomonHappy,
  creditMoodPenalty: data.rules.creditMoodPenalty,
  debtDailyMoodPenalty: data.rules.debtDailyMoodPenalty,
  hungerPenalty: data.rules.hungerPenalty,
  hygienePenalty: data.rules.hygienePenalty,
};

export const SPEND_CATEGORIES: Record<SpendCategoryKey, SpendCategory> =
  data.spendCategories;

/** Траты, которые в разборе считаются необязательными. */
export const ENTERTAINMENT_SPENDS: string[] = data.entertainmentSpends;

export const SCENARIOS: Record<ScenarioKey, Scenario> = {
  short: {
    key: "short",
    label: "Неделя",
    days: data.scenarios.short.days as number,
    capital: data.scenarios.short.capital as number,
    mandatoryTotal: data.scenarios.short.mandatoryTotal as number,
    mandatoryMode: data.scenarios.short.mandatoryMode as "once",
    salary: data.scenarios.short.salary as number,
    salaryDay: data.scenarios.short.salaryDay as number,
    phoneDay: data.scenarios.short.phoneDay as number,
    giftDay: data.scenarios.short.giftDay as number,
    blizzardDay: data.scenarios.short.blizzardDay as number,
    weeklyShiftCap: data.scenarios.short.weeklyShiftCap as number,
    hungerDecay: data.scenarios.short.hungerDecay as number,
    hygieneDecay: data.scenarios.short.hygieneDecay as number,
    solomonDecay: data.scenarios.short.solomonDecay as number,
  },
  long: {
    key: "long",
    label: "Месяц",
    days: data.scenarios.long.days as number,
    capital: data.scenarios.long.capital as number,
    mandatoryTotal: data.scenarios.long.mandatoryTotal as number,
    mandatoryMode: data.scenarios.long.mandatoryMode as "weekly",
    salary: data.scenarios.long.salary as number,
    salaryDay: data.scenarios.long.salaryDay as number,
    phoneDay: data.scenarios.long.phoneDay as number,
    giftDay: data.scenarios.long.giftDay as number,
    blizzardDay: data.scenarios.long.blizzardDay as number,
    weeklyShiftCap: data.scenarios.long.weeklyShiftCap as number,
    hungerDecay: data.scenarios.long.hungerDecay as number,
    hygieneDecay: data.scenarios.long.hygieneDecay as number,
    solomonDecay: data.scenarios.long.solomonDecay as number,
  },
};

/** Типы событий, которые нужно закрыть выбором, — по сценарию. */
export function eventsForScenario(key: ScenarioKey): GameEvent[] {
  const scenario = SCENARIOS[key];
  return EVENTS.map((event) => {
    if (event.id === "phone") return { ...event, day: scenario.phoneDay };
    if (event.id === "gift") return { ...event, day: scenario.giftDay };
    if (event.id === "blizzard") return { ...event, day: scenario.blizzardDay };
    return event;
  }).filter((event) => event.day > 0);
}

export function jobById(id: string): Job | undefined {
  return JOBS.find((job) => job.id === id);
}

export function spendById(id: string): Spend | undefined {
  return SPENDS.find((spend) => spend.id === id);
}

export function itemById(id: string): Item | undefined {
  return ITEMS.find((item) => item.id === id);
}

export function professionById(id: string): Profession {
  return PROFESSIONS.find((prof) => prof.id === id) ?? PROFESSIONS[0];
}

/** Категория статьи расходов для траты. */
export function categoryForSpend(id: string): SpendCategory {
  return ENTERTAINMENT_SPENDS.includes(id)
    ? "развлечения"
    : "быт";
}

export type { ExpenseAudit };
