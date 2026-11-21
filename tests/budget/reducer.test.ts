import { describe, expect, it } from "vitest";
import {
  buy,
  chooseTransport,
  createInitialState,
  endDay,
  hasInternet,
  resolveEvent,
  rest,
  spendBlockReason,
  startDay,
  transportBlockReason,
} from "../../src/budget/core/reducer";
import { DAY, RULES } from "../../src/budget/data/scenario";
import { freeTimeState, stateOnDay } from "./helpers";

describe("утро: завтрак и дорога", () => {
  it("день начинается в 06:00 в фазе утра", () => {
    const g = createInitialState();
    startDay(g);
    expect(g.phase).toBe("morning");
    expect(g.clock).toBe(DAY.startMinutes);
  });

  it("без завтрака и дороги свободное время не открывается", () => {
    const g = createInitialState();
    startDay(g);
    expect(spendBlockReason(g, "kino")).toBe("утром можно только позавтракать");
  });

  it("после завтрака и дороги начинаются пары, потом свободное время", () => {
    const g = createInitialState();
    startDay(g);
    buy(g, "food-cheap");
    expect(g.phase).toBe("morning");
    chooseTransport(g, "bus");
    expect(g.phase).toBe("free");
    expect(g.clock).toBe(DAY.classesEnd);
  });

  it("утром можно только позавтракать", () => {
    const g = createInitialState();
    startDay(g);
    expect(buy(g, "kino")).toBe("утром можно только позавтракать");
  });

  it("второй завтрак не даётся", () => {
    const g = createInitialState();
    startDay(g);
    buy(g, "food-cheap");
    expect(buy(g, "food-fast")).toBe("завтрак уже был");
  });

  it("дорога выбирается один раз", () => {
    const g = createInitialState();
    startDay(g);
    buy(g, "food-cheap");
    chooseTransport(g, "bus");
    expect(chooseTransport(g, "taxi")).toBe("дорога выбирается только утром");
  });

  it("автобус стоит 35 ₽, пешком бесплатно", () => {
    const g = createInitialState();
    startDay(g);
    buy(g, "food-cheap");
    chooseTransport(g, "bus");
    expect(g.cash).toBe(20000 - 120 - 35);

    const walk = createInitialState();
    startDay(walk);
    buy(walk, "food-cheap");
    chooseTransport(walk, "walk");
    expect(walk.cash).toBe(20000 - 120);
  });

  it("пешком Соломон пачкается сильнее, чем на автобусе", () => {
    const walk = createInitialState();
    startDay(walk);
    buy(walk, "food-cheap");
    chooseTransport(walk, "walk");

    const bus = createInitialState();
    startDay(bus);
    buy(bus, "food-cheap");
    chooseTransport(bus, "bus");

    // Пешком пачкается сильнее на 5 пунктов (8 против 3).
    expect(walk.scales.cleanliness).toBe(bus.scales.cleanliness - 5);
  });

  it("дорога отнимает сытость", () => {
    const g = createInitialState();
    startDay(g);
    buy(g, "food-cheap");
    const before = g.scales.hunger;
    chooseTransport(g, "bus");
    // Дорога и пары: −5 в дороге и ещё −15 на парах.
    expect(g.scales.hunger).toBe(before - 5 - RULES.classesHungerCost);
  });

  it("в снегопад пешком не дойдёшь", () => {
    const g = stateOnDay(4);
    startDay(g);
    buy(g, "food-cheap");
    expect(chooseTransport(g, "walk")).toBe("в метель пешком не дойдёшь");
  });

  it("на дорогу нужны деньги", () => {
    const g = createInitialState();
    startDay(g);
    buy(g, "food-cheap");
    g.cash = 0;
    g.savings = 0;
    expect(transportBlockReason(g, "taxi")).toBe("не хватает денег на дорогу");
  });
});

describe("свободное время", () => {
  it("после 23:00 ничего не купить", () => {
    const g = freeTimeState();
    g.clock = 1370;
    expect(buy(g, "kino")).toBe("уже ночь, пора спать");
    expect(spendBlockReason(g, "kino")).toBe("уже ночь, пора спать");
  });

  it("без интернета нет тик-токов и игр в компьютер", () => {
    const g = freeTimeState();
    g.internetUntil = 0;
    expect(spendBlockReason(g, "tiktok")).toBe("нет интернета");
    expect(spendBlockReason(g, "computer")).toBe("нет интернета");
    g.internetUntil = 7;
    expect(spendBlockReason(g, "computer")).toBeNull();
  });

  it("интернет стоит 1 500 ₽ за период", () => {
    const g = freeTimeState();
    const before = g.cash;
    buy(g, "internet");
    expect(g.cash).toBe(before - 1500);
  });

  it("поглаживание возвращает энергию", () => {
    const g = freeTimeState();
    g.scales.energy = 50;
    buy(g, "pet");
    expect(g.scales.energy).toBe(62);
  });

  it("стирку нельзя повторять весь вечер", () => {
    const g = freeTimeState();
    expect(spendBlockReason(g, "laundry")).toBeNull();
    buy(g, "laundry");
    expect(spendBlockReason(g, "laundry")).toBe(
      `стирка на сегодня уже была (${RULES.laundryPerDay})`,
    );
  });

  it("мытьё Соломона остаётся один раз в день", () => {
    const g = freeTimeState();
    buy(g, "wash");
    expect(spendBlockReason(g, "wash")).toContain("мытьё");
  });

  it("«Помыться» — это мытьё Соломона, отдельного мытья себя нет", () => {
    const g = freeTimeState();
    expect(buy(g, "wash")).toContain("Помыться");
  });
});

describe("запас еды", () => {
  it("приготовленная еда даёт запас на два дня", () => {
    const g = freeTimeState();
    // Завтрак уже приготовлен в helper'е: одна порция съедена, две в запасе.
    expect(g.mealStock.servings).toBe(RULES.mealServings - 1);
    expect(g.mealStock.preparedOnDay).toBe(g.day);
  });

  it("остатки можно съесть и порция уменьшается", () => {
    const g = freeTimeState();
    const servings = g.mealStock.servings;
    expect(buy(g, "food-leftovers")).toContain("Еда, приготовленная утром");
    expect(g.mealStock.servings).toBe(servings - 1);
  });

  it("без запаса остатков нет", () => {
    const g = freeTimeState();
    g.mealStock = { servings: 0, preparedOnDay: 0 };
    expect(spendBlockReason(g, "food-leftovers")).toBe(
      "запас еды пуст: сначала приготовь еду",
    );
  });

  it("на следующий день запас ещё есть, а через день — испорчен", () => {
    const g = freeTimeState();
    endDay(g, g.dayActions);
    startDay(g);
    expect(g.mealStock.servings).toBe(RULES.mealServings - 1);
    endDay(g, g.dayActions);
    startDay(g);
    expect(g.mealStock.servings).toBe(0);
    expect(g.dayNotes.join("; ")).toContain("еда испортилась");
  });

  it("еда не съедается сверх двух приёмов в день", () => {
    const g = freeTimeState();
    buy(g, "food-leftovers");
    expect(spendBlockReason(g, "food-cheap")).toContain("Соломон сыт");
  });
});

describe("развлечения и настроение", () => {
  it("развлечение считается и снимает штраф за скуку", () => {
    const g = freeTimeState();
    buy(g, "park");
    expect(g.funToday).toBe(1);
  });

  it("без развлечений день закрывается штрафом", () => {
    const g = freeTimeState();
    const before = g.scales.mood;
    endDay(g, g.dayActions);
    // Штраф за скуку и штраф за пропущенные уроки.
    expect(g.scales.mood).toBe(
      before - RULES.noFunMoodPenalty - RULES.missedLessonMood,
    );
  });
});

describe("день, события и проигрыш", () => {
  it("интернет работает до оплаченного дня", () => {
    const g = createInitialState();
    expect(hasInternet(g)).toBe(true);
    g.internetUntil = 0;
    expect(hasInternet(g)).toBe(false);
  });

  it("событие закрывается один раз", () => {
    const g = stateOnDay(5);
    startDay(g);
    buy(g, "food-cheap");
    chooseTransport(g, "bus");
    expect(g.pendingEvent?.id).toBe("phone");
    resolveEvent(g, "repair");
    expect(g.pendingEvent).toBeNull();
    expect(resolveEvent(g, "repair")).toBe("нет открытого события");
  });

  it("событие не проходит в долг", () => {
    const g = stateOnDay(5);
    startDay(g);
    buy(g, "food-cheap");
    chooseTransport(g, "bus");
    g.cash = 0;
    g.savings = 0;
    expect(resolveEvent(g, "repair")).toBe("не хватает денег");
    expect(g.pendingEvent).not.toBeNull();
  });

  it("неоплаченное жильё — проигрыш", () => {
    const g = stateOnDay(5, false);
    startDay(g);
    expect(g.lost).toBe(true);
  });

  it("сон закрывает день", () => {
    const g = freeTimeState();
    rest(g);
    expect(g.phase).toBe("done");
    expect(g.clock).toBe(DAY.nightMinutes);
  });
});
