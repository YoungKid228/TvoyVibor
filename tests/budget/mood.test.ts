import { describe, expect, it } from "vitest";
import {
  clampScales,
  decay,
  incomeMultiplier,
  isGymActive,
  round50,
  shiftPay,
} from "../../src/budget/core/mood";
import {
  buy,
  buyItem,
  createInitialState,
  endDay,
  rest,
  startDay,
  work,
} from "../../src/budget/core/reducer";
import { RULES } from "../../src/budget/data/scenario";

describe("шкалы", () => {
  it("множитель дохода: 0.5 при 0 → 1.0 при 100", () => {
    expect(incomeMultiplier(0)).toBe(0.5);
    expect(incomeMultiplier(50)).toBe(0.75);
    expect(incomeMultiplier(100)).toBe(1);
  });

  it("доход округляется до 50 ₽ к чётному, как в эталоне", () => {
    expect(round50(825)).toBe(800);
    expect(round50(875)).toBe(900);
    expect(round50(1280)).toBe(1300);
  });

  it("выгорание снижает оплату до 70 %", () => {
    const burnt = shiftPay(1600, 20);
    const normal = shiftPay(1600, 30);
    expect(normal).toBe(1050);
    expect(burnt).toBe(650);
    expect(burnt).toBeLessThan(normal);
  });

  it("выгорание начинается ниже порога 25", () => {
    expect(RULES.burnoutMood).toBe(25);
    // На 24 настроение выгорание уже действует (смена = 450 вместо 650),
    // на 25 — выгорания нет, но и оплата выше.
    expect(shiftPay(1000, 24)).toBe(450);
    expect(shiftPay(1000, 25)).toBe(600);
  });

  it("ежедневный спад уменьшает сытость, гигиену и настроение", () => {
    const g = createInitialState();
    const before = { ...g.scales };
    decay(g);
    expect(g.scales.hunger).toBe(before.hunger - 6);
    expect(g.scales.hygiene).toBe(before.hygiene - 5);
    expect(g.scales.mood).toBe(before.mood - 1); // −2 скука, +1 за довольного Соломона
  });

  it("голод и грязь бьют по настроению", () => {
    const g = createInitialState();
    g.scales.hunger = 0;
    g.scales.hygiene = 0;
    g.scales.solomon = 0;
    decay(g);
    // −2 скука, −5 голод, −3 грязь, −3 за брошенного Соломона
    expect(g.scales.mood).toBe(70 - 2 - 5 - 3 - 3);
    expect(g.scales.solomon).toBe(0);
  });

  it("долг снижает настроение на 3 в день", () => {
    const g = createInitialState();
    g.cash = -500;
    const before = g.scales.mood;
    decay(g);
    // −2 скука, −3 за долг, +1 за довольного Соломона
    expect(g.scales.mood).toBe(before - 2 - 3 + 1);
  });

  it("подушка 4 000 ₽ даёт +1 настроения в день", () => {
    const g = createInitialState();
    g.savings = 4000;
    const before = g.scales.mood;
    decay(g);
    // −2 скука, +1 за подушку, +1 за довольного Соломона
    expect(g.scales.mood).toBe(before - 2 + 1 + 1);
  });

  it("несчастный хозяин запускает Соломона сильнее", () => {
    const g = createInitialState();
    g.scales.mood = 10;
    g.scales.solomon = 50;
    decay(g);
    // −4 спад, −2 за несчастного хозяина
    expect(g.scales.solomon).toBe(44);
  });

  it("довольный Соломон даёт хозяину +1 настроения", () => {
    const g = createInitialState();
    g.scales.solomon = 80;
    const before = g.scales.mood;
    decay(g);
    expect(g.scales.mood).toBe(before - 2 + 1);
  });

  it("шкалы не выходят за 0…100", () => {
    const g = createInitialState();
    g.scales.mood = 99;
    g.scales.solomon = 99;
    decay(g);
    expect(g.scales.mood).toBeLessThanOrEqual(100);
    expect(g.scales.solomon).toBeLessThanOrEqual(100);
    expect(g.scales.mood).toBeGreaterThanOrEqual(0);
    expect(g.scales.solomon).toBeGreaterThanOrEqual(0);
  });
});

describe("спад шкал объясняет причины (обратная связь)", () => {
  it("возвращает список причин изменения", () => {
    const g = createInitialState();
    const notes = decay(g);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes.join("; ")).toContain("скука");
  });

  it("называет причину штрафа за голод, грязь и долг", () => {
    const g = createInitialState();
    g.scales.hunger = 0;
    g.scales.hygiene = 0;
    g.cash = -100;
    const notes = decay(g).join("; ");
    expect(notes).toContain("голод");
    expect(notes).toContain("грязь");
    expect(notes).toContain("долг");
  });

  it("называет бонус за подушку и за довольного Соломона", () => {
    const g = createInitialState();
    g.savings = 4000;
    g.scales.solomon = 80;
    const notes = decay(g).join("; ");
    expect(notes).toContain("подушка");
    expect(notes).toContain("довольный Соломон");
  });
});

describe("обрезка шкал в ядре (аудит, проблема 1)", () => {
  it("clampScales держит все шкалы в 0…100", () => {
    const g = createInitialState();
    g.scales.mood = 150;
    g.scales.energy = 300;
    g.scales.hunger = -20;
    g.scales.hygiene = 500;
    g.scales.solomon = 120;
    clampScales(g);
    expect(g.scales.mood).toBe(100);
    expect(g.scales.energy).toBe(100);
    expect(g.scales.hunger).toBe(0);
    expect(g.scales.hygiene).toBe(100);
    expect(g.scales.solomon).toBe(100);
  });

  it("настроение не уезжает за потолок после many покупок", () => {
    const g = createInitialState();
    startDay(g);
    for (let i = 0; i < 40; i += 1) {
      buy(g, "kino");
    }
    expect(g.scales.mood).toBeLessThanOrEqual(100);
  });

  it("доход не превышает базовую ставку при настроении выше 100", () => {
    // При настроении 150 множитель давал 1,25 и курьер приносил 2 000 ₽
    // вместо 1 600. Обрезка в ядре делает это невозможным.
    const g = createInitialState();
    startDay(g);
    g.scales.mood = 150;
    g.scales.energy = 100;
    const result = work(g, "courier");
    expect(result).toContain("+1600");
  });
});

describe("сон ограничен одним разом в день (аудит, проблема 3)", () => {
  it("второй сон в тот же день не даёт энергию", () => {
    const g = createInitialState();
    startDay(g);
    g.scales.energy = 0;
    expect(rest(g)).toBe("сон");
    const energy = g.scales.energy;
    expect(energy).toBe(45);
    expect(rest(g)).toBe("сон уже был сегодня");
    expect(g.scales.energy).toBe(energy);
  });

  it("счётчик сна обнуляется на следующий день", () => {
    const g = createInitialState();
    startDay(g);
    rest(g);
    expect(g.sleepsToday).toBe(1);
    endDay(g, g.dayActions);
    startDay(g);
    expect(g.sleepsToday).toBe(0);
    expect(rest(g)).toBe("сон");
  });
});

describe("поглаживание ограничено (аудит, проблема 2)", () => {
  it("не больше трёх поглаживаний в день", () => {
    const g = createInitialState();
    startDay(g);
    for (let i = 0; i < 3; i += 1) {
      expect(buy(g, "pet")).toContain("pet");
    }
    const solomon = g.scales.solomon;
    expect(buy(g, "pet")).toBe("поглаживаний на сегодня хватает");
    expect(g.scales.solomon).toBe(solomon);
  });

  it("счётчик поглаживаний обнуляется на следующий день", () => {
    const g = createInitialState();
    startDay(g);
    for (let i = 0; i < 3; i += 1) buy(g, "pet");
    endDay(g, g.dayActions);
    startDay(g);
    expect(g.petsToday).toBe(0);
    expect(buy(g, "pet")).toContain("pet");
  });

  it("шкалы не набиваются кликами: Соломон и настроение в пределах 100", () => {
    const g = createInitialState();
    startDay(g);
    for (let i = 0; i < 50; i += 1) {
      buy(g, "pet");
    }
    expect(g.scales.solomon).toBeLessThanOrEqual(100);
    expect(g.scales.mood).toBeLessThanOrEqual(100);
  });
});

describe("потолок репутации и срок абонемента", () => {
  it("репутация не растёт выше потолка", () => {
    const g = createInitialState();
    startDay(g);
    for (let i = 0; i < 20; i += 1) {
      g.cash = 100000;
      buy(g, "park");
    }
    expect(g.rep).toBeLessThanOrEqual(RULES.repCap);
  });

  it("абонемент в зал действует ограниченный срок", () => {
    const g = createInitialState();
    startDay(g);
    buyItem(g, "gym");
    expect(isGymActive(g)).toBe(true);
    g.day = 1 + RULES.gymDays;
    expect(isGymActive(g)).toBe(false);
  });
});
