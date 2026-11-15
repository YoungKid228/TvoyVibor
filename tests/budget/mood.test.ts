import { describe, expect, it } from "vitest";
import {
  clampScales,
  decay,
  incomeMultiplier,
  round50,
  shiftPay,
  sleepFactors,
} from "../../src/budget/core/mood";
import {
  buy,
  createInitialState,
  endDay,
  rest,
  startDay,
  work,
} from "../../src/budget/core/reducer";
import { RULES } from "../../src/budget/data/scenario";
import { freeTimeState } from "./helpers";

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
    expect(shiftPay(1000, 24)).toBe(450);
    expect(shiftPay(1000, 25)).toBe(600);
  });

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

describe("обрезка шкал в ядре (аудит, проблема 1)", () => {
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

  it("настроение не уезжает за потолок после many покупок", () => {
    const g = freeTimeState();
    g.cash = 100000;
    for (let i = 0; i < 40; i += 1) {
      buy(g, "kino");
    }
    expect(g.scales.mood).toBeLessThanOrEqual(100);
  });

  it("доход не превышает базовую ставку при настроении выше 100", () => {
    // При настроении 150 множитель давал 1,25 и курьер приносил 2 000 ₽
    // вместо 1 600. Обрезка в ядре делает это невозможным.
    const g = freeTimeState();
    g.scales.mood = 150;
    g.scales.energy = 100;
    const result = work(g, "courier");
    expect(result).toContain("+1600");
  });
});

describe("сон: качество восстановления зависит от чистоты", () => {
  it("чистый Соломон восстанавливает всё", () => {
    const g = freeTimeState();
    g.scales.hunger = 100;
    g.scales.cleanliness = 100;
    const factors = sleepFactors(g);
    expect(factors.energy).toBe(1);
  });

  it("слегка грязный Соломон — 70 % восстановления", () => {
    const g = freeTimeState();
    g.scales.hunger = 100;
    g.scales.cleanliness = 50;
    expect(sleepFactors(g).clean).toBe(0.7);
  });

  it("сильно грязный Соломон — 45 % восстановления", () => {
    const g = freeTimeState();
    g.scales.hunger = 100;
    g.scales.cleanliness = 20;
    expect(sleepFactors(g).clean).toBe(0.45);
  });

  it("сон опускает сытость, а не поднимает её", () => {
    const g = freeTimeState();
    g.scales.energy = 0;
    g.scales.hunger = 100;
    g.scales.cleanliness = 100;
    rest(g);
    expect(g.scales.energy).toBe(RULES.sleepEnergy);
    expect(g.scales.hunger).toBe(100 - RULES.sleepHunger);
  });

  it("сон закрывает день", () => {
    const g = freeTimeState();
    rest(g);
    expect(g.phase).toBe("done");
    expect(g.clock).toBe(1380);
  });
});

describe("сон ограничен одним разом в день (аудит, проблема 3)", () => {
  it("второй сон в тот же день не даёт энергию", () => {
    const g = freeTimeState();
    g.scales.energy = 0;
    expect(rest(g)).toBe("сон");
    const energy = g.scales.energy;
    expect(rest(g)).toBe("сон уже был сегодня");
    expect(g.scales.energy).toBe(energy);
  });

  it("счётчик сна обнуляется на следующий день", () => {
    const g = freeTimeState();
    rest(g);
    expect(g.sleepsToday).toBe(1);
    endDay(g, g.dayActions);
    startDay(g);
    expect(g.sleepsToday).toBe(0);
  });
});

describe("поглаживание ограничено (аудит, проблема 2)", () => {
  it("не больше трёх поглаживаний в день", () => {
    const g = freeTimeState();
    for (let i = 0; i < 3; i += 1) {
      expect(buy(g, "pet")).toContain("Погладить");
    }
    const mood = g.scales.mood;
    expect(buy(g, "pet")).toBe("поглаживаний на сегодня хватает (3)");
    expect(g.scales.mood).toBe(mood);
  });

  it("счётчик поглаживаний обнуляется на следующий день", () => {
    const g = freeTimeState();
    for (let i = 0; i < 3; i += 1) buy(g, "pet");
    endDay(g, g.dayActions);
    startDay(g);
    expect(g.petsToday).toBe(0);
  });

  it("шкалы не набиваются кликами: настроение в пределах 100", () => {
    const g = freeTimeState();
    for (let i = 0; i < 50; i += 1) {
      buy(g, "pet");
    }
    expect(g.scales.mood).toBeLessThanOrEqual(100);
  });
});

describe("потолок репутации", () => {
  it("репутация не растёт выше потолка", () => {
    const g = freeTimeState();
    for (let i = 0; i < 20; i += 1) {
      g.cash = 100000;
      buy(g, "lessons");
    }
    expect(g.rep).toBeLessThanOrEqual(RULES.repCap);
  });
});
