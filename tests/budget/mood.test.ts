import { describe, expect, it } from "vitest";
import { clampScales, decay, sleepFactors } from "../../src/budget/core/mood";
import {
  buy,
  chooseTransport,
  createInitialState,
  endDay,
  rest,
  startDay,
} from "../../src/budget/core/reducer";
import { RULES, TRANSPORTS } from "../../src/budget/data/scenario";
import { freeTimeState } from "./helpers";

describe("шкалы", () => {
  it("ежедневный спад уменьшает сытость и общую чистоту", () => {
    const g = createInitialState();
    const before = { ...g.scales };
    decay(g);
    expect(g.scales.hunger).toBe(before.hunger - 25);
    expect(g.scales.cleanliness).toBe(before.cleanliness - 15);
    // −2 скука, −4 за брошенного Соломона
    expect(g.scales.mood).toBe(before.mood - 6);
  });

  it("голод и грязь бьют по настроению", () => {
    const g = createInitialState();
    g.scales.hunger = 0;
    g.scales.cleanliness = 0;
    decay(g);
    // −2 скука, −4 Соломон скучает, −5 голод, −3 грязь, −2 за грязного Соломона
    expect(g.scales.mood).toBe(70 - 2 - 4 - 5 - 3 - 2);
  });

  it("долга в игре нет: кошелёк не уходит в минус", () => {
    const g = createInitialState();
    expect(g.cash).toBe(20000);
    expect("debt" in g).toBe(false);
  });

  it("подушка 4 000 ₽ даёт +1 настроения в день", () => {
    const g = createInitialState();
    g.savings = 4000;
    const before = g.scales.mood;
    decay(g);
    expect(g.scales.mood).toBe(before - 6 + 1);
  });

  it("брошенный Соломон отнимает настроение каждый день", () => {
    const g = createInitialState();
    const before = g.scales.mood;
    decay(g);
    expect(g.scales.mood).toBe(before - 6);
  });

  it("шкалы не выходят за 0…100", () => {
    const g = createInitialState();
    g.scales.mood = 99;
    g.scales.cleanliness = 99;
    decay(g);
    expect(g.scales.mood).toBeLessThanOrEqual(100);
    expect(g.scales.cleanliness).toBeLessThanOrEqual(100);
    expect(g.scales.mood).toBeGreaterThanOrEqual(0);
    expect(g.scales.cleanliness).toBeGreaterThanOrEqual(0);
  });
});

describe("спад шкал объясняет причины (обратная связь)", () => {
  it("возвращает список причин изменения", () => {
    const g = createInitialState();
    const notes = decay(g);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.join("; ")).toContain("скука");
  });

  it("называет причину штрафа за голод и грязь", () => {
    const g = createInitialState();
    g.scales.hunger = 0;
    g.scales.cleanliness = 0;
    const notes = decay(g).join("; ");
    expect(notes).toContain("голод");
    expect(notes).toContain("грязь");
  });

  it("называет бонус за подушку и скуку Соломона", () => {
    const g = createInitialState();
    g.savings = 4000;
    const notes = decay(g).join("; ");
    expect(notes).toContain("подушка");
    expect(notes).toContain("Соломон скучает");
  });
});

describe("пары меняют шкалы", () => {
  it("после пар падают энергия, сытость и чистота", () => {
    const g = createInitialState();
    startDay(g);
    buy(g, "food-cheap");
    const before = { ...g.scales };
    // Дорога открывает фазу пар, пары идут до 15:00 и сразу тратят шкалы.
    chooseTransport(g, "bus");
    expect(g.phase).toBe("free");
    // Дорога (автобус) и пары — обе фазы тратят шкалы.
    const bus = TRANSPORTS.find((t) => t.id === "bus")!;
    expect(g.scales.energy).toBe(
      before.energy - bus.energyCost - RULES.classesEnergyCost,
    );
    // Завтрак уже съеден: `before` снят после него.
    expect(g.scales.hunger).toBe(
      before.hunger - bus.hungerCost - RULES.classesHungerCost,
    );
    expect(g.scales.cleanliness).toBe(
      before.cleanliness - bus.dirt - RULES.classesCleanlinessCost,
    );
  });

  it("игрок видит причины: пары, сытость, чистота", () => {
    const g = createInitialState();
    startDay(g);
    buy(g, "food-cheap");
    chooseTransport(g, "bus");
    const notes = g.dayNotes.join("; ");
    expect(notes).toContain("пары");
  });
});

describe("день без развлечений", () => {
  it("настроение падает, если развлечений не было", () => {
    const g = freeTimeState();
    const before = g.scales.mood;
    endDay(g, g.dayActions);
    // Минус штраф за скуку и минус за пропущенные уроки.
    expect(g.scales.mood).toBe(
      before - RULES.noFunMoodPenalty - RULES.missedLessonMood,
    );
    // Записи дня обнуляются в конце дня — смотрим журнал.
    expect(g.log[g.log.length - 1].notes.join("; ")).toContain(
      "день без развлечений",
    );
  });

  it("развлечение за день снимает штраф", () => {
    const g = freeTimeState();
    buy(g, "park");
    expect(g.funToday).toBe(1);
    const before = g.scales.mood;
    endDay(g, g.dayActions);
    // Штрафа за скуку нет — остаётся только минус за пропущенные уроки.
    expect(g.scales.mood).toBe(before - RULES.missedLessonMood);
  });
});

describe("сон", () => {
  it("возвращает силы и опускает сытость", () => {
    const g = freeTimeState();
    g.scales.energy = 40;
    g.scales.hunger = 60;
    const before = { ...g.scales };
    rest(g);
    // Сон возвращает силы до потолка и опускает сытость.
    expect(g.scales.energy).toBe(100);
    expect(g.scales.hunger).toBe(before.hunger - RULES.sleepHunger);
  });

  it("качество сна зависит от чистоты", () => {
    const clean = freeTimeState();
    clean.scales.cleanliness = 100;
    const dirty = freeTimeState();
    dirty.scales.cleanliness = 10;
    expect(sleepFactors(clean).energy).toBe(RULES.cleanFactorGood);
    expect(sleepFactors(dirty).energy).toBe(RULES.cleanFactorBad);
  });
});

describe("обрезка шкал в ядре", () => {
  it("clampScales держит все шкалы в 0…100", () => {
    const g = createInitialState();
    g.scales.mood = 150;
    g.scales.energy = 300;
    g.scales.hunger = -20;
    g.scales.cleanliness = 500;
    clampScales(g);
    expect(g.scales.mood).toBe(100);
    expect(g.scales.energy).toBe(100);
    expect(g.scales.hunger).toBe(0);
    expect(g.scales.cleanliness).toBe(100);
  });
});
