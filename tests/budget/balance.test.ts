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
      51.7,
      3,
      "Деньги есть, но Соломон несчастлив",
    ],
    Трудяга: [
      19850,
      19850,
      0,
      46.6,
      52.0,
      4,
      "Деньги есть, но Соломон несчастлив",
    ],
    Баланс: [
      19500,
      17500,
      2000,
      67.4,
      83.6,
      4,
      "Успех: и деньги есть, и Соломон счастлив",
    ],
    Гедонист: [
      -5250,
      -5250,
      0,
      90.9,
      70.9,
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
      Баланс: [0.395, "Расходы распределены грамотно"],
      Гедонист: [0.711, "Расходы превысили доходы"],
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
    // кошелёк, подушка, настроение, энергия, Соломон, чистота
    const expectedRows: Record<
      number,
      [number, number, number, number, number, number]
    > = {
      1: [6100, 2000, 68, 56, 74, 85],
      2: [7250, 2000, 61, 24, 77, 100],
      3: [7000, 2000, 65, 14, 81, 85],
      4: [21800, 2000, 69, 57, 84, 100],
      5: [19000, 2000, 67, 35, 86, 85],
      6: [17500, 2000, 69, 13, 91, 100],
      7: [17500, 2000, 73, 56, 92, 85],
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
        row!.cleanliness,
      ]).toEqual(want);
    }
  });

  it("«Баланс» моет Соломона, остальные стратегии — нет", () => {
    const balanced = runScenario("short", "none", POLICIES["Баланс"]);
    const worker = runScenario("short", "none", POLICIES["Трудяга"]);
    expect(balanced.log.some((d) => d.actions.some((a) => a.includes("wash")))).toBe(
      true,
    );
    expect(worker.log.some((d) => d.actions.some((a) => a.includes("wash")))).toBe(
      false,
    );
    // «Баланс» тратит на мытьё, но держит Соломона чистым и довольным.
    const lastBalanced = balanced.log[balanced.log.length - 1];
    const lastWorker = worker.log[worker.log.length - 1];
    expect(lastBalanced.cleanliness).toBeGreaterThan(lastWorker.cleanliness);
    expect(balanced.scales.solomon).toBeGreaterThan(worker.scales.solomon);
  });
});

describe("эталонный прогон длинного режима (месяц)", () => {
  const expected: Record<string, [number, number, number, number, number, string]> =
    {
      Копилка: [16450, 12450, 4000, 38.8, 15.8, "Деньги есть, но Соломон несчастлив"],
      Трудяга: [23450, 23450, 0, 13.6, 15.2, "Деньги есть, но Соломон несчастлив"],
      Баланс: [
        21100,
        19100,
        2000,
        65.3,
        94.9,
        "Успех: и деньги есть, и Соломон счастлив",
      ],
      Гедонист: [-27050, -27050, 0, 82.5, 41.4, "Провал: ни денег, ни счастья"],
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

  it("«Инженер» получает маленький денежный перевес, как «Творческий»", () => {
    const engineer = stats(runScenario("short", "engineer", POLICIES["Баланс"]));
    const creative = stats(runScenario("short", "creative", POLICIES["Баланс"]));
    const none = stats(runScenario("short", "none", POLICIES["Баланс"]));
    expect(engineer.finalBalance).toBeGreaterThan(none.finalBalance);
    expect(creative.finalBalance).toBeGreaterThan(engineer.finalBalance);
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
