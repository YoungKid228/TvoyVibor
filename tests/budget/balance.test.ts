import { describe, expect, it } from "vitest";
import { runScenario } from "../../src/budget/core/reducer";
import { stats } from "../../src/budget/core/evaluation";
import { POLICIES } from "../../src/budget/core/strategies";
import { PROFESSIONS } from "../../src/budget/data/scenario";

/**
 * Эталонный прогон: числа обязаны совпадать с `scripts/balance_sim.py`.
 *
 * Это главная страховка от «красивых, но неверных» чисел: если код игры
 * разойдётся с эталонной моделью, тест упадёт.
 *
 * Источник значений — вывод `python scripts/balance_sim.py` (таблицы
 * раздела 11 документа `docs/Хермес-вариант.md`).
 */

describe("эталонный прогон короткого режима (неделя)", () => {
  const expected: Record<
    string,
    [number, number, number, number, number, number, string]
  > = {
    // баланс, кошелёк, подушка, ср. настроение, ср. чистота, смен, вердикт
    Копилка: [
      15320,
      11320,
      4000,
      17.7,
      30.0,
      2,
      "Деньги есть, но настроение провалилось",
    ],
    Трудяга: [
      17155,
      17155,
      0,
      28.9,
      40.7,
      7,
      "Деньги есть, но настроение провалилось",
    ],
    Баланс: [
      21315,
      21315,
      0,
      79.7,
      91.4,
      7,
      "Успех: и деньги есть, и настроение хорошее",
    ],
    Гедонист: [
      5500,
      5500,
      0,
      89.1,
      40.7,
      7,
      "Настроение хорошее, но денег нет",
    ],
  };

  for (const [name, policy] of Object.entries(POLICIES)) {
    it(`стратегия «${name}» совпадает с эталоном`, () => {
      const state = runScenario("short", "student", policy);
      const s = stats(state);
      const want = expected[name];
      expect([s.finalBalance, s.cash, s.savings]).toEqual([
        want[0],
        want[1],
        want[2],
      ]);
      expect(s.avgMood).toBeCloseTo(want[3], 1);
      expect(s.avgCleanliness).toBeCloseTo(want[4], 1);
      expect(s.shifts).toBe(want[5]);
      expect(s.verdict).toBe(want[6]);
    });
  }

  it("разбор расходов совпадает с эталоном", () => {
    const cases: Record<string, [number, string]> = {
      Копилка: [0.293, "Расходы распределены грамотно"],
      Трудяга: [0.278, "Расходы покрыты, но резерв не создан"],
      Баланс: [0.394, "Расходы покрыты, но резерв не создан"],
      Гедонист: [0.526, "Расходы покрыты, но резерв не создан"],
    };
    for (const [name, policy] of Object.entries(POLICIES)) {
      const s = stats(runScenario("short", "student", policy));
      expect(s.audit.optionalShare).toBeCloseTo(cases[name][0], 3);
      expect(s.audit.verdict).toBe(cases[name][1]);
    }
  });

  it("ход недели стратегии «Баланс» совпадает с эталоном", () => {
    const state = runScenario("short", "student", POLICIES["Баланс"]);
    const byDay = new Map(state.log.map((entry) => [entry.day, entry]));
    // кошелёк, подушка, настроение, энергия, чистота, сытость
    const expectedRows: Record<
      number,
      [number, number, number, number, number, number]
    > = {
      1: [17695, 0, 71, 100, 85, 70],
      2: [18640, 0, 80, 100, 100, 70],
      3: [19885, 0, 79, 100, 85, 70],
      4: [20430, 0, 83, 100, 100, 70],
      5: [20175, 0, 75, 100, 85, 70],
      6: [20020, 0, 88, 100, 100, 70],
      7: [21315, 0, 82, 100, 85, 70],
    };
    for (const [day, want] of Object.entries(expectedRows)) {
      const row = byDay.get(Number(day));
      expect(row).toBeDefined();
      expect([
        row!.cash,
        row!.savings,
        row!.mood,
        row!.energy,
        row!.cleanliness,
        row!.hunger,
      ]).toEqual(want);
    }
  });

  it("«Баланс» следит за чистотой, остальные стратегии — нет", () => {
    const balanced = runScenario("short", "student", POLICIES["Баланс"]);
    const worker = runScenario("short", "student", POLICIES["Трудяга"]);
    expect(
      balanced.log.some((d) => d.actions.some((a) => a.includes("Помыться"))),
    ).toBe(true);
    expect(
      worker.log.some((d) => d.actions.some((a) => a.includes("Помыться"))),
    ).toBe(false);
    // «Баланс» держит общую чистоту и настроение, «Трудяга» — нет.
    const lastBalanced = balanced.log[balanced.log.length - 1];
    const lastWorker = worker.log[worker.log.length - 1];
    expect(lastBalanced.cleanliness).toBeGreaterThan(lastWorker.cleanliness);
    expect(balanced.scales.mood).toBeGreaterThan(worker.scales.mood);
  });

  it("все стратегии доживают до конца недели", () => {
    for (const [name, policy] of Object.entries(POLICIES)) {
      const state = runScenario("short", "student", policy);
      expect(state.lost, `«${name}» проиграла`).toBe(false);
      expect(state.log.length).toBe(7);
    }
  });
});

describe("профессия одна — игрок всегда студент", () => {
  it("в игре ровно одна профессия", () => {
    expect(PROFESSIONS.map((prof) => prof.id)).toEqual(["student"]);
  });

  it("игра запускается как студент", () => {
    const state = runScenario("short", "student", POLICIES["Баланс"]);
    expect(state.professionId).toBe("student");
    expect(state.scales.mood).toBeGreaterThan(0);
  });
});
