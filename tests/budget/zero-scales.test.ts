import { describe, expect, it } from "vitest";
import { RULES } from "../../src/budget/data/scenario";
import {
  buy,
  chooseTransport,
  createInitialState,
  spendBlockReason,
  startDay,
  transportBlockReason,
} from "../../src/budget/core/reducer";
import { freeTimeState, morningState } from "./helpers";

/**
 * Ноль на шкале — это событие, а не просто число.
 *
 * Проверяем, что у каждой шкалы есть свой последний рубеж:
 *   * грязного Соломона не пускают в транспорт и общественные места;
 *   * голодного не пускают в развлечения;
 *   * без сил нельзя готовить, мыться и делать уроки;
 *   * без настроения — проигрыш.
 *
 * Порог грязи — «сильно грязный» (≤ 33), а не ноль: столько грязи видно
 * на спрайте, и правило должно быть видно вместе с ним.
 */
describe("грязный Соломон", () => {
  it("в автобус и такси сильно грязного не пускают", () => {
    const state = morningState();
    state.scales.cleanliness = RULES.dirtyAt;
    expect(transportBlockReason(state, "bus")).toContain("грязный");
    expect(transportBlockReason(state, "taxi")).toContain("грязный");
  });

  it("пешком можно: в транспорт не пускают, а идти — можно", () => {
    const state = morningState();
    state.scales.cleanliness = RULES.dirtyAt;
    expect(transportBlockReason(state, "walk")).toBeNull();
  });

  it("в кафе и кино сильно грязного не пускают", () => {
    const state = freeTimeState();
    state.scales.cleanliness = RULES.dirtyAt;
    expect(spendBlockReason(state, "food-fast")).toContain("грязный");
    expect(spendBlockReason(state, "food-luxe")).toContain("грязный");
    expect(spendBlockReason(state, "kino")).toContain("грязный");
  });

  it("свою еда дома остаётся доступной: грязному ходить в кафе не надо", () => {
    const state = freeTimeState();
    state.scales.cleanliness = RULES.dirtyAt;
    expect(spendBlockReason(state, "food-cheap")).toBeNull();
  });

  it("чистого Соломона пускают везде", () => {
    const state = morningState();
    state.scales.cleanliness = RULES.dirtyAt + 1;
    expect(transportBlockReason(state, "bus")).toBeNull();
    expect(transportBlockReason(state, "taxi")).toBeNull();
    // И в кафе — но это уже свободное время, поэтому отдельный снимок.
    const free = freeTimeState();
    free.scales.cleanliness = RULES.dirtyAt + 1;
    expect(spendBlockReason(free, "food-fast")).toBeNull();
  });

  it("после мытья снова пускают", () => {
    const state = freeTimeState();
    state.scales.cleanliness = 10;
    buy(state, "wash");
    expect(state.scales.cleanliness).toBe(100);
    // И в автобус снова пускают: проверяем на утреннем снимке.
    const morning = morningState();
    morning.scales.cleanliness = 100;
    expect(transportBlockReason(morning, "bus")).toBeNull();
  });
});

describe("голодный Соломон", () => {
  it("в развлечения не пускают: сначала накормить", () => {
    const state = freeTimeState();
    state.scales.hunger = 0;
    expect(spendBlockReason(state, "park")).toContain("голоден");
    expect(spendBlockReason(state, "kino")).toContain("голоден");
  });

  it("еда при этом остаётся доступной", () => {
    const state = freeTimeState();
    state.scales.hunger = 0;
    expect(spendBlockReason(state, "food-cheap")).toBeNull();
  });

  it("после еды развлечения снова доступны", () => {
    const state = freeTimeState();
    state.scales.hunger = 0;
    buy(state, "food-cheap");
    expect(spendBlockReason(state, "park")).toBeNull();
  });
});

describe("Соломон без сил", () => {
  it("нельзя готовить, мыться и делать уроки", () => {
    const state = freeTimeState();
    state.scales.energy = 0;
    expect(spendBlockReason(state, "food-cheap")).toContain("нет энергии");
    expect(spendBlockReason(state, "wash")).toContain("нет энергии");
    expect(spendBlockReason(state, "lessons")).toContain("нет энергии");
  });

  it("бесплатное и отнимающее мало энергии — можно", () => {
    const state = freeTimeState();
    state.scales.energy = 0;
    expect(spendBlockReason(state, "pet")).toBeNull();
  });
});

describe("дорога в грязь", () => {
  it("автобус пачкает меньше, чем пешком", () => {
    const bus = createInitialState();
    startDay(bus);
    buy(bus, "food-cheap");
    const before = bus.scales.cleanliness;
    chooseTransport(bus, "bus");
    const afterBus = bus.scales.cleanliness;

    const walk = createInitialState();
    startDay(walk);
    buy(walk, "food-cheap");
    chooseTransport(walk, "walk");

    expect(afterBus).toBeGreaterThan(walk.scales.cleanliness);
    expect(afterBus).toBeLessThan(before);
  });
});
