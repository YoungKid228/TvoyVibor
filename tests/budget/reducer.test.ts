import { describe, expect, it } from "vitest";
import {
  buy,
  chooseTransport,
  createInitialState,
  endDay,
  hasInternet,
  jobBlockReason,
  resolveEvent,
  rest,
  spendBlockReason,
  startDay,
  work,
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
    expect(g.phase).toBe("morning");
    expect(work(g, "courier")).toBe("работать можно только после пар");
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

  it("пешком Соломон пачкается", () => {
    const g = createInitialState();
    startDay(g);
    buy(g, "food-cheap");
    const before = g.scales.cleanliness;
    chooseTransport(g, "walk");
    expect(g.scales.cleanliness).toBe(before - 5);
  });

  it("в снегопад пешком не дойдёшь", () => {
    const g = stateOnDay(4);
    startDay(g);
    buy(g, "food-cheap");
    expect(chooseTransport(g, "walk")).toBe("в метель пешком не дойдёшь");
  });
});

describe("свободное время", () => {
  it("работа тратит время и энергию", () => {
    const g = freeTimeState();
    const energy = g.scales.energy;
    const clock = g.clock;
    work(g, "courier");
    expect(g.scales.energy).toBe(energy - 30);
    expect(g.clock).toBe(clock + 180);
  });

  it("работа позже ночи недоступна", () => {
    const g = freeTimeState();
    g.clock = 1300;
    expect(jobBlockReason(g, "courier")).toBe("не хватит времени до ночи");
  });

  it("после 23:00 ничего не купить", () => {
    const g = freeTimeState();
    g.clock = 1370;
    expect(buy(g, "kino")).toBe("уже ночь, пора спать");
  });

  it("курьерская доставка требует интернет и телефон", () => {
    const g = freeTimeState();
    g.internetUntil = 0;
    expect(jobBlockReason(g, "courier")).toBe("нужен интернет и телефон");
    g.internetUntil = 7;
    g.phoneBroken = true;
    expect(jobBlockReason(g, "courier")).toBe("нужен интернет и телефон");
  });

  it("репетиторство открывается после трёх дней уроков", () => {
    const g = freeTimeState();
    expect(jobBlockReason(g, "tutor")).toBe(
      `нужен интернет и ${RULES.lessonStreakForTutor} дня уроков подряд`,
    );
    g.lessonStreak = 3;
    expect(jobBlockReason(g, "tutor")).toBeNull();
  });

  it("лаборант доступен со второго дня", () => {
    const g = freeTimeState();
    expect(jobBlockReason(g, "lab")).toBe("лаборантом можно со второго дня");
    g.day = 2;
    expect(jobBlockReason(g, "lab")).toBeNull();
  });
});

describe("обязательные платежи", () => {
  it("жильё платится один раз", () => {
    const g = freeTimeState();
    expect(buy(g, "housing")).toContain("Жильё");
    expect(g.housingPaid).toBe(true);
    expect(spendBlockReason(g, "housing")).toBe("жильё уже оплачено");
  });

  it("интернет даётся на период, потом пропадает", () => {
    const g = freeTimeState();
    expect(hasInternet(g)).toBe(true); // пробные дни
    buy(g, "internet");
    expect(g.internetUntil).toBe(7);
    const later = stateOnDay(4);
    expect(hasInternet(later)).toBe(false);
    expect(spendBlockReason(later, "tiktok")).toBe("нет интернета");
  });

  it("проездной делает дорогу бесплатной", () => {
    const g = freeTimeState();
    buy(g, "transit-pass");
    expect(g.transitUntil).toBe(g.day + 7 - 1);
  });
});

describe("проигрыш", () => {
  it("неоплаченное жильё к сроку — выселение", () => {
    const g = stateOnDay(5, false);
    startDay(g);
    buy(g, "food-cheap");
    chooseTransport(g, "bus");
    // На 5-й день открывается событие про телефон — сначала его закрываем.
    if (g.pendingEvent) resolveEvent(g, "repair");
    rest(g);
    endDay(g, g.dayActions);
    expect(g.lost).toBe(true);
    expect(g.lossReason?.id).toBe("housing");
  });

  it("оплаченное жильё спасает", () => {
    const g = stateOnDay(5);
    startDay(g);
    buy(g, "food-cheap");
    chooseTransport(g, "bus");
    if (g.pendingEvent) resolveEvent(g, "repair");
    buy(g, "housing");
    rest(g);
    endDay(g, g.dayActions);
    expect(g.lost).toBe(false);
  });

  it("два дня без еды — за Соломоном не уследили", () => {
    const g = createInitialState();
    for (let day = 0; day < 2; day += 1) {
      startDay(g);
      chooseTransport(g, "bus");
      g.scales.hunger = 10;
      rest(g);
      endDay(g, g.dayActions);
    }
    expect(g.lost).toBe(true);
    expect(g.lossReason?.id).toBe("neglect");
  });
});

describe("уроки", () => {
  it("сделанные уроки повышают настроение", () => {
    const g = freeTimeState();
    const before = g.scales.mood;
    buy(g, "lessons");
    expect(g.scales.mood).toBe(before + 3);
    expect(g.lessonsToday).toBe(true);
  });

  it("пропущенные уроки штрафуют и ломают серию", () => {
    const g = freeTimeState();
    g.lessonStreak = 5;
    rest(g);
    endDay(g, g.dayActions);
    expect(g.lessonStreak).toBe(0);
    expect(g.missedLessons).toBe(1);
  });

  it("три пропуска подряд — проблемы с учёбой у Соломона", () => {
    const g = createInitialState();
    for (let day = 0; day < 3; day += 1) {
      startDay(g);
      chooseTransport(g, "bus");
      rest(g);
      endDay(g, g.dayActions);
    }
    expect(g.lessonProblems).toBe(true);
  });
});

describe("событие", () => {
  it("открывается в свободное время и блокирует работу", () => {
    const g = stateOnDay(5);
    startDay(g);
    buy(g, "food-cheap");
    chooseTransport(g, "bus");
    expect(g.pendingEvent?.id).toBe("phone");
    expect(g.phase).toBe("free");
    expect(jobBlockReason(g, "courier")).toBe("сначала закрой событие");
  });

  it("сломанный телефон закрывает курьерскую доставку", () => {
    const g = stateOnDay(5);
    startDay(g);
    buy(g, "food-cheap");
    chooseTransport(g, "bus");
    resolveEvent(g, "old");
    expect(g.phoneBroken).toBe(true);
    expect(jobBlockReason(g, "courier")).toBe("нужен интернет и телефон");
  });
});

describe("сон закрывает день", () => {
  it("после сна фаза — «день закончен»", () => {
    const g = freeTimeState();
    rest(g);
    expect(g.phase).toBe("done");
    expect(g.sleepsToday).toBe(1);
  });

  it("сон утром невозможен", () => {
    const g = createInitialState();
    startDay(g);
    expect(rest(g)).toBe("сначала позавтракай и доедь до пар");
  });
});
