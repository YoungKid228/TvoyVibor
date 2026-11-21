import { describe, expect, it } from "vitest";
import { runScenario } from "../../src/budget/core/reducer";
import { stats } from "../../src/budget/core/evaluation";
import { POLICIES } from "../../src/budget/core/strategies";

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
    [number, number, number, number, number, string]
  > = {
    // баланс, кошелёк, подушка, ср. настроение, ср. чистота, вердикт
    Копилка: [
      12160,
      8160,
      4000,
      40.7,
      69.6,
      "Деньги есть, но настроение провалилось",
    ],
    Ученик: [
      9355,
      9355,
      0,
      88.1,
      77.0,
      "Успех: и деньги есть, и настроение хорошее",
    ],
    Баланс: [
      10015,
      10015,
      0,
      58.6,
      86.9,
      "Успех: и деньги есть, и настроение хорошее",
    ],
    Гедонист: [
      900,
      900,
      0,
      78.7,
      60.1,
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
      expect(s.verdict).toBe(want[5]);
    });
  }

  it("разбор расходов совпадает с эталоном", () => {
    const cases: Record<string, [number, string]> = {
      Копилка: [0.446, "Обязательные расходы не покрыты"],
      Ученик: [0.366, "Расходы покрыты, но резерв не создан"],
      Баланс: [0.391, "Расходы покрыты, но резерв не создан"],
      Гедонист: [0.398, "Расходы покрыты, но резерв не создан"],
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
      1: [16345, 0, 61, 100, 77, 70],
      2: [15790, 0, 71, 100, 100, 70],
      3: [15635, 0, 60, 100, 77, 70],
      4: [13580, 0, 65, 100, 100, 70],
      5: [11925, 0, 47, 100, 77, 70],
      6: [10170, 0, 61, 100, 100, 70],
      7: [10015, 0, 45, 100, 77, 70],
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

  it("заработка в игре нет: доход за неделю нулевой", () => {
    const state = runScenario("short", "student", POLICIES["Баланс"]);
    expect(state.income).toBe(0);
  });

  it("«Баланс» моется и ест в кафе, «Копилка» — только гуляет в парке", () => {
    const balanced = runScenario("short", "student", POLICIES["Баланс"]);
    const saver = runScenario("short", "student", POLICIES["Копилка"]);
    expect(
      balanced.log.some((d) => d.actions.some((a) => a.includes("Помыться"))),
    ).toBe(true);
    // «Копилка» моется тоже: без этого её не пустят в транспорт.
    expect(
      saver.log.some((d) => d.actions.some((a) => a.includes("Помыться"))),
    ).toBe(true);
    // Но дорогих развлечений у неё нет — ни разу за неделю.
    expect(
      saver.log.some((d) => d.actions.some((a) => a.includes("кино"))),
    ).toBe(false);
    // Настроение у неё ниже, чем у «Баланса»: копить и веселиться — плохо.
    const avg = (state: typeof saver) =>
      state.log.reduce((sum, d) => sum + d.mood, 0) / state.log.length;
    expect(avg(saver)).toBeLessThan(avg(balanced));
  });

  it("без развлечений за день настроение падает", () => {
    // «Баланс» гуляет через день: в дни без прогулки штраф есть.
    const balanced = runScenario("short", "student", POLICIES["Баланс"]);
    const notes = balanced.log.flatMap((d) => d.notes).join("; ");
    expect(notes).toContain("день без развлечений");
  });
});
