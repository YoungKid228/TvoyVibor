import { describe, expect, it } from "vitest";
import {
  canPay,
  finalBalance,
  pay,
  payFlexible,
  save,
  withdraw,
} from "../../src/budget/core/finance";
import { createInitialState } from "../../src/budget/core/reducer";

describe("финансы", () => {
  it("при достатке в кошельке платит из кошелька", () => {
    const g = createInitialState();
    expect(pay(g, 800, "развлечения")).toBe("-800");
    expect(g.cash).toBe(19200);
    expect(g.savings).toBe(0);
    expect(g.expenses).toBe(800);
  });

  it("при нехватке в кошельке добирает из подушки", () => {
    const g = createInitialState();
    g.cash = 500;
    g.savings = 4000;
    expect(pay(g, 2000, "быт")).toBe("-2000 (из подушки 1500)");
    expect(g.cash).toBe(0);
    expect(g.savings).toBe(2500);
  });

  it("долга нет: без денег оплата не проходит", () => {
    const g = createInitialState();
    g.cash = 500;
    g.savings = 0;
    const before = g.scales.mood;
    expect(payFlexible(g, 3000, "покупки")).toBe("не хватает денег");
    expect(g.cash).toBe(500);
    expect(g.scales.mood).toBe(before);
  });

  it("подушку можно снять", () => {
    const g = createInitialState();
    save(g, 4000);
    expect(g.savings).toBe(4000);
    expect(g.cash).toBe(16000);
    expect(withdraw(g, 1500)).toBe("из подушки +1500");
    expect(g.cash).toBe(17500);
    expect(g.savings).toBe(2500);
  });

  it("итоговый баланс = кошелёк + подушка", () => {
    const g = createInitialState();
    g.cash = 1000;
    g.savings = 2000;
    expect(finalBalance(g)).toBe(3000);
  });

  it("canPay учитывает подушку", () => {
    const g = createInitialState();
    g.cash = 1000;
    g.savings = 500;
    expect(canPay(g, 1500)).toBe(true);
    expect(canPay(g, 1501)).toBe(false);
  });

  it("нельзя отложить больше, чем есть в кошельке", () => {
    const g = createInitialState();
    g.cash = 100;
    expect(save(g, 4000)).toBe("нет денег");
    expect(g.savings).toBe(0);
  });
});
