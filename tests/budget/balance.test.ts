import { describe, expect, it } from "vitest";
import { SCENARIOS } from "../../src/budget/data/scenario";
import { runScenario } from "../../src/budget/core/reducer";
import { stats } from "../../src/budget/core/evaluation";
import { POLICIES } from "../../src/budget/core/strategies";

/**
 * Эталонный прогон: числа обязаны совпадать с `scripts/balance_sim.py`.
 *
 * Это главная страховка от «красивых, но неверных» чисел: если код игры
 * разойдётся с эталонной моделью, тест упадёт.
 *
 * Источник значений — раздел 11 документа `docs/Хермес-вариант.md`.
 */

describe("эталонный прогон короткого режима (неделя)", () => {
  const expected: Record<
    string,
    [number, number, number, number, number, number, string]
  > = {
    // баланс, кошелёк, подушка, ср. настроение, ср. Соломон, смен, вердикт
    Копилка: [
      20700,
      16700,
      4000,
      52.7,
      54.7,
      3,
      "Деньги есть, но Соломон несчастлив",
    ],
    Трудяга: [
      19850,
      19850,
      0,
      45.4,
      55.0,
      4,
      "Деньги есть, но Соломон несчастлив",
    ],
    Баланс: [
      18900,
      16900,
      2000,
      67.3,
      76.6,
      3,
      "Успех: и деньги есть, и Соломон счастлив",
    ],
    Гедонист: [
      -1750,
      -1750,
      0,
      91.7,
      71.6,
      3,
      "Соломон счастлив, но денег нет",
    ],
  };

  for (const [name, policy] of Object.entries(POLICIES)) {
    it(`стратегия «${name}» совпадает с эталоном`, () => {
      const state = runScenario("short", "none", policy);
      const s = stats(state);
      const want = expected[name];
      expect([s.finalBalance, s.cash, s.savings]).toEqual([
        want[0],
        want[1],
        want[2],
      ]);
      expect(s.avgMood).toBeCloseTo(want[3], 1);
      expect(s.avgSolomon).toBeCloseTo(want[4], 1);
      expect(s.shifts).toBe(want[5]);
      expect(s.verdict).toBe(want[6]);
    });
  }

  it("разбор расходов совпадает с эталоном", () => {
    const cases: Record<string, [number, string]> = {
      Копилка: [0.265, "Расходы распределены грамотно"],
      Трудяга: [0.342, "Расходы покрыты, но резерв не создан"],
      Баланс: [0.377, "Расходы распределены грамотно"],
      Гедонист: [0.685, "Расходы превысили доходы"],
    };
    for (const [name, policy] of Object.entries(POLICIES)) {
      const s = stats(runScenario("short", "none", policy));
      expect(s.audit.optionalShare).toBeCloseTo(cases[name][0], 3);
      expect(s.audit.verdict).toBe(cases[name][1]);
    }
  });

  it("ход недели стратегии «Баланс» совпадает с эталоном", () => {
    const state = runScenario("short", "none", POLICIES["Баланс"]);
    const byDay = new Map(state.log.map((entry) => [entry.day, entry]));
    const expectedRows: Record<number, [number, number, number, number, number]> =
      {
        1: [6100, 2000, 68, 56, 74],
        2: [7450, 2000, 60, 24, 75],
        3: [7200, 2000, 64, 14, 79],
        4: [22200, 2000, 67, 57, 80],
        5: [18200, 2000, 69, 57, 77],
        6: [15700, 2000, 74, 57, 75],
        7: [16900, 2000, 69, 35, 76],
      };
    for (const [day, want] of Object.entries(expectedRows)) {
      const row = byDay.get(Number(day));
      expect(row).toBeDefined();
      expect([
        row!.cash,
        row!.savings,
        row!.mood,
        row!.energy,
        row!.solomon,
      ]).toEqual(want);
    }
  });
});

describe("эталонный прогон длинного режима (месяц)", () => {
  const expected: Record<string, [number, number, number, number, number, string]> =
    {
      Копилка: [16450, 12450, 4000, 44.5, 21.1, "Деньги есть, но Соломон несчастлив"],
      Трудяга: [23500, 23500, 0, 14.2, 18.8, "Деньги есть, но Соломон несчастлив"],
      Баланс: [
        23650,
        21650,
        2000,
        57.9,
        88.1,
        "Успех: и деньги есть, и Соломон счастлив",
      ],
      Гедонист: [-23250, -23250, 0, 89.5, 62.0, "Соломон счастлив, но денег нет"],
    };

  for (const [name, policy] of Object.entries(POLICIES)) {
    it(`стратегия «${name}» совпадает с эталоном`, () => {
      const s = stats(runScenario("long", "none", policy));
      const want = expected[name];
      expect(s.finalBalance).toBe(want[0]);
      expect(s.cash).toBe(want[1]);
      expect(s.savings).toBe(want[2]);
      expect(s.avgMood).toBeCloseTo(want[3], 1);
      expect(s.avgSolomon).toBeCloseTo(want[4], 1);
      expect(s.verdict).toBe(want[5]);
    });
  }
});

describe("выбор профессии слабо влияет на игру", () => {
  it("разброс итогового баланса не превышает 500 ₽", () => {
    const balances = (["none", "student", "courier", "engineer", "creative"] as const).map(
      (prof) => stats(runScenario("short", prof, POLICIES["Баланс"])).finalBalance,
    );
    expect(Math.max(...balances) - Math.min(...balances)).toBeLessThanOrEqual(500);
  });

  it("вердикт не меняется ни при одной профессии", () => {
    const verdicts = (["none", "student", "courier", "engineer", "creative"] as const).map(
      (prof) => stats(runScenario("short", prof, POLICIES["Баланс"])).verdict,
    );
    expect(new Set(verdicts).size).toBe(1);
  });
});

describe("сценарии", () => {
  it("короткий режим — 7 дней, длинный — 28", () => {
    expect(SCENARIOS.short.days).toBe(7);
    expect(SCENARIOS.long.days).toBe(28);
  });

  it("обязательные расходы короткого режима — 12 500 ₽", () => {
    expect(SCENARIOS.short.mandatoryTotal).toBe(12500);
    expect(SCENARIOS.long.mandatoryTotal).toBe(12500);
  });
});
