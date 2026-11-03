import { describe, expect, it } from "vitest";
import {
  buy,
  buyItem,
  createInitialState,
  endDay,
  resolveEvent,
  startDay,
  work,
} from "../../src/budget/core/reducer";
import { expenseAudit } from "../../src/budget/core/evaluation";
import { RULES } from "../../src/budget/data/scenario";

describe("редьюсер: идемпотентность", () => {
  it("зарплата начисляется один раз", () => {
    const g = createInitialState();
    g.day = 4;
    startDay(g);
    // День 4 — снегопад: игра ждёт выбора, зарплата пока не начислена.
    expect(g.pendingEvent?.id).toBe("blizzard");
    expect(g.salaryPaid).toBe(false);
    resolveEvent(g, "bus");
    expect(g.salaryPaid).toBe(true);
    const afterSalary = g.cash;
    expect(afterSalary).toBe(20000 + 15000);
    // Повторный проход по фазе «mandatory» не должен начислять зарплату ещё раз.
    g.phase = "mandatory";
    startDay(g);
    expect(g.cash).toBe(afterSalary);
  });

  it("событие нельзя закрыть дважды", () => {
    const g = createInitialState();
    g.day = 5;
    startDay(g);
    expect(g.pendingEvent?.id).toBe("phone");
    const cashAfter = g.cash;
    resolveEvent(g, "repair");
    expect(g.cash).toBe(cashAfter - 4000);
    // Второй раз событие не открывается.
    g.phase = "actions";
    startDay(g);
    expect(g.pendingEvent).toBeNull();
  });

  it("недельный лимит смен соблюдается", () => {
    const g = createInitialState();
    startDay(g);
    const cap = RULES.weeklyShiftCap;
    let done = 0;
    for (let i = 0; i < cap + 3; i += 1) {
      g.scales.energy = 100;
      const result = work(g, "dishes");
      if (result.startsWith("dishes")) done += 1;
    }
    expect(done).toBe(cap);
  });

  it("лимит смен конкретной работы тоже действует", () => {
    const g = createInitialState();
    startDay(g);
    // Курьер разрешён максимум 2 раза в неделю.
    g.scales.energy = 100;
    expect(work(g, "courier")).toContain("courier");
    g.scales.energy = 100;
    expect(work(g, "courier")).toContain("courier");
    g.scales.energy = 100;
    expect(work(g, "courier")).toBe("лимит смен");
  });

  it("счётчик смен обнуляется на новой неделе", () => {
    const g = createInitialState();
    startDay(g);
    g.scales.energy = 100;
    work(g, "courier");
    expect(g.weekShifts[0]).toBe(1);
    // Переходим на вторую неделю.
    g.day = 8;
    startDay(g);
    expect(g.week).toBe(1);
    expect(g.weekShifts[1]).toBeUndefined();
    g.scales.energy = 100;
    expect(work(g, "courier")).toContain("courier");
  });

  it("работа недоступна без энергии", () => {
    const g = createInitialState();
    startDay(g);
    g.scales.energy = 5;
    expect(work(g, "courier")).toBe("нет энергии");
  });

  it("репетиторство открывается репутацией", () => {
    const g = createInitialState();
    startDay(g);
    expect(work(g, "tutor")).toBe("мало репутации");
    g.rep = 2;
    g.scales.energy = 100;
    expect(work(g, "tutor")).toContain("tutor");
  });

  it("фриланс открывается ноутбуком", () => {
    const g = createInitialState();
    startDay(g);
    expect(work(g, "freelance")).toBe("нет ноутбука");
    buyItem(g, "laptop");
    g.scales.energy = 100;
    expect(work(g, "freelance")).toContain("freelance");
  });

  it("покупку нельзя сделать дважды", () => {
    const g = createInitialState();
    startDay(g);
    buyItem(g, "laptop");
    expect(buyItem(g, "laptop")).toBe("уже куплено");
    expect(g.items.filter((i) => i === "laptop")).toHaveLength(1);
  });
});

describe("редьюсер: дневной цикл", () => {
  it("обязательные расходы списываются в первый день", () => {
    const g = createInitialState();
    startDay(g);
    expect(g.cash).toBe(20000 - 12500);
    expect(g.spentByCategory["обязательные"]).toBe(12500);
  });

  it("зарплата приходит в день 4", () => {
    const g = createInitialState();
    g.day = 4;
    startDay(g);
    resolveEvent(g, "bus");
    // Обязательные расходы списываются только в день 1, поэтому в день 4
    // в кошельке стартовый капитал плюс зарплата.
    expect(g.cash).toBe(20000 + 15000);
  });

  it("снегопад открывается в день 4", () => {
    const g = createInitialState();
    g.day = 4;
    startDay(g);
    expect(g.pendingEvent?.id).toBe("blizzard");
  });

  it("такси в снегопад стоит 400 ₽", () => {
    const g = createInitialState();
    g.day = 4;
    startDay(g);
    const before = g.cash;
    resolveEvent(g, "taxi");
    // После снегопада догоняет зарплата дня 4.
    expect(g.cash).toBe(before - 400 + 15000);
    expect(g.spentByCategory["быт"]).toBe(400);
  });

  it("автобус в снегопад бесплатный", () => {
    const g = createInitialState();
    g.day = 4;
    startDay(g);
    const before = g.cash;
    resolveEvent(g, "bus");
    expect(g.cash).toBe(before + 15000);
    expect(g.blizzardChoice).toBe("bus");
  });

  it("пешком в снегопад стоит 15 энергии", () => {
    const g = createInitialState();
    g.day = 4;
    startDay(g);
    const before = g.scales.energy;
    resolveEvent(g, "walk");
    expect(g.scales.energy).toBe(before - 15);
  });

  it("повторное поглаживание Соломона даёт тот же эффект", () => {
    const g = createInitialState();
    startDay(g);
    const before = g.scales.solomon;
    buy(g, "pet");
    expect(g.scales.solomon).toBe(before + 5);
  });

  it("завершение дня пишет в журнал", () => {
    const g = createInitialState();
    startDay(g);
    endDay(g, g.dayActions);
    expect(g.log).toHaveLength(1);
    expect(g.log[0].day).toBe(1);
  });
});

describe("разбор расходов", () => {
  it("обязательные не покрыты — первый вердикт", () => {
    const g = createInitialState();
    g.spentByCategory["обязательные"] = 5000;
    expect(expenseAudit(g).verdict).toBe("Обязательные расходы не покрыты");
  });

  it("долг даёт вердикт «расходы превысили доходы»", () => {
    const g = createInitialState();
    g.spentByCategory["обязательные"] = 12500;
    g.cash = -100;
    expect(expenseAudit(g).verdict).toBe("Расходы превысили доходы");
  });

  it("слишком много необязательных трат", () => {
    const g = createInitialState();
    g.spentByCategory["обязательные"] = 12500;
    g.spentByCategory["развлечения"] = 30000;
    expect(expenseAudit(g).verdict).toBe("Траты ушли далеко за рамки необходимого");
  });

  it("подушка и непустой кошелёк — грамотно", () => {
    const g = createInitialState();
    g.spentByCategory["обязательные"] = 12500;
    g.spentByCategory["развлечения"] = 3000;
    g.savings = 2000;
    g.cash = 1000;
    expect(expenseAudit(g).verdict).toBe("Расходы распределены грамотно");
  });

  it("без резерва — покрыты, но резерв не создан", () => {
    const g = createInitialState();
    g.spentByCategory["обязательные"] = 12500;
    g.cash = 1000;
    expect(expenseAudit(g).verdict).toBe("Расходы покрыты, но резерв не создан");
  });

  it("накопления не входят в долю необязательных трат", () => {
    const g = createInitialState();
    g.spentByCategory["обязательные"] = 12500;
    g.spentByCategory["накопления"] = 4000;
    expect(expenseAudit(g).optionalShare).toBe(0);
  });
});
