import { describe, expect, it } from "vitest";
import { decay, incomeMultiplier, round50, shiftPay } from "../../src/budget/core/mood";
import { createInitialState } from "../../src/budget/core/reducer";
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
