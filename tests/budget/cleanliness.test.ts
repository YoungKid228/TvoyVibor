import { describe, expect, it } from "vitest";
import { RULES, SCENARIOS } from "../../src/budget/data/scenario";
import { dirtLabel, dirtVariant } from "../../src/budget/core/mood";
import {
  buy,
  createInitialState,
  endDay,
  normalizeState,
  resolveEvent,
  spendBlockReason,
  startDay,
} from "../../src/budget/core/reducer";
import { dirtFromCleanliness, spriteKey } from "../../src/budget/components/SolomonSprite";

/**
 * Механика загрязнения Соломона.
 *
 * Проверяем три вещи, которые должны совпадать с эталоном
 * `scripts/balance_sim.py`:
 *   1. вариант спрайта по шкале чистоты;
 *   2. что грязный Соломон скучает сильнее;
 *   3. что мытьё — суточное действие, которое возвращает блеск.
 */

describe("вариант спрайта по загрязнению", () => {
  it("границы вариантов совпадают с правилами игры", () => {
    expect(dirtVariant(RULES.cleanAt)).toBe(0);
    expect(dirtVariant(RULES.cleanAt - 1)).toBe(1);
    expect(dirtVariant(RULES.dirtyAt + 1)).toBe(1);
    expect(dirtVariant(RULES.dirtyAt)).toBe(2);
  });

  it("компонент спрайта считает вариант так же, как ядро", () => {
    for (const value of [0, 20, 33, 34, 50, 66, 67, 100]) {
      expect(dirtFromCleanliness(value)).toBe(dirtVariant(value));
    }
  });

  it("у вариантов есть понятные названия", () => {
    expect(dirtLabel(100)).toBe("чистый");
    expect(dirtLabel(50)).toBe("слегка грязный");
    expect(dirtLabel(10)).toBe("сильно грязный");
  });

  it("радостная поза 3 есть только в чистом варианте", () => {
    // Позы 3 в новом наборе нет: грязного радостного Соломона не бывает,
    // поэтому подставляется поза 10 — у неё все три варианта есть.
    expect(spriteKey(90, 0, false)).toBe("3_0");
    expect(spriteKey(90, 1, false)).toBe("10_1");
    expect(spriteKey(90, 2, false)).toBe("10_2");
  });

  it("сон и грусть берут свои позы во всех вариантах загрязнения", () => {
    expect(spriteKey(50, 2, true)).toBe("6_2");
    expect(spriteKey(10, 2, false)).toBe("7_2");
    expect(spriteKey(60, 1, false)).toBe("1_1");
  });
});

describe("грязь влияет на настроение Соломона", () => {
  it("грязный Соломон теряет настроение быстрее", () => {
    const clean = createInitialState("short");
    const dirty = createInitialState("short");
    dirty.scales.cleanliness = 0;

    clean.scales.solomon = 80;
    dirty.scales.solomon = 80;
    startDay(clean);
    startDay(dirty);

    // Спад за день: базовый solomon_decay плюс штраф за грязь.
    const base = SCENARIOS.short.solomonDecay;
    expect(clean.scales.solomon).toBeCloseTo(80 - base, 5);
    expect(dirty.scales.solomon).toBeCloseTo(80 - base - 2, 5);
  });

  it("игрок видит причину падения в журнале дня", () => {
    const state = createInitialState("short");
    state.scales.cleanliness = 0;
    startDay(state);
    expect(state.dayNotes.some((note) => note.includes("грязный"))).toBe(true);
  });
});

describe("мытьё Соломона", () => {
  it("стоит 200 ₽ и возвращает чистоту", () => {
    const state = createInitialState("short");
    state.scales.cleanliness = 10;
    const cashBefore = state.cash;

    buy(state, "wash");

    expect(state.cash).toBe(cashBefore - 200);
    expect(state.scales.cleanliness).toBe(100);
  });

  it("не чаще раза в день", () => {
    const state = createInitialState("short");
    startDay(state);

    expect(spendBlockReason(state, "wash")).toBeNull();
    buy(state, "wash");
    expect(spendBlockReason(state, "wash")).not.toBeNull();
    expect(buy(state, "wash")).toContain("мытьё");
  });

  it("суточный счётчик обнуляется на следующий день", () => {
    const state = createInitialState("short");
    startDay(state);
    buy(state, "wash");
    expect(state.washesToday).toBe(1);

    endDay(state, state.dayActions);
    startDay(state);
    expect(state.washesToday).toBe(0);
    expect(spendBlockReason(state, "wash")).toBeNull();
  });

  it("счётчик мытья сохраняется при перезагрузке", () => {
    const state = createInitialState("short");
    startDay(state);
    buy(state, "wash");

    const loaded = normalizeState(JSON.parse(JSON.stringify(state)));
    expect(loaded.washesToday).toBe(1);
    expect(spendBlockReason(loaded, "wash")).not.toBeNull();
  });

  it("вымытый Соломон довольнее запущенного", () => {
    const washed = createInitialState("short");
    const neglected = createInitialState("short");
    startDay(washed);
    startDay(neglected);
    washed.scales.cleanliness = 0;
    neglected.scales.cleanliness = 0;
    buy(washed, "wash");

    expect(washed.scales.cleanliness).toBe(100);
    expect(neglected.scales.cleanliness).toBe(0);
  });
});

describe("чистота в сценариях", () => {
  it("Соломон пачкается одинаково в обоих режимах", () => {
    expect(SCENARIOS.short.cleanlinessDecay).toBe(15);
    expect(SCENARIOS.long.cleanlinessDecay).toBe(15);
  });

  it("за неделю без мытья Соломон становится сильно грязным", () => {
    const state = createInitialState("short");
    for (let day = 0; day < 5; day += 1) {
      startDay(state);
      // Снегопад на 4-й день останавливает дневной цикл до спада шкал:
      // событие нужно закрыть, иначе день не отработает.
      if (state.pendingEvent) resolveEvent(state, "bus");
      endDay(state, state.dayActions);
    }
    // 100 − 15 × 5 = 25 — это уже «сильно грязный» (порог 33).
    expect(state.scales.cleanliness).toBe(25);
    expect(dirtVariant(state.scales.cleanliness)).toBe(2);
  });
});
