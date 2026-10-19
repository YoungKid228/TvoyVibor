import { afterEach, describe, expect, it } from "vitest";
import { isStandalone } from "../src/lib/pwa";

const originalMatchMedia = window.matchMedia;

function stubMatchMedia(matchingQueries: string[]) {
  const stub = (query: string) =>
    ({
      matches: matchingQueries.some((m) => query.includes(m)),
    }) as MediaQueryList;
  window.matchMedia = stub as unknown as typeof window.matchMedia;
}

function stubIosStandalone(value: boolean) {
  Object.defineProperty(navigator, "standalone", {
    value,
    configurable: true,
  });
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  delete (navigator as { standalone?: unknown }).standalone;
});

describe("isStandalone", () => {
  it("returns false without matchMedia support (jsdom guard)", () => {
    // в jsdom window.matchMedia отсутствует
    expect(isStandalone()).toBe(false);
  });

  it("returns false when no install marker matches (обычный браузер)", () => {
    stubMatchMedia([]);
    expect(isStandalone()).toBe(false);
  });

  it("returns true for display-mode: standalone (Chrome/Edge/Android)", () => {
    stubMatchMedia(["display-mode: standalone"]);
    expect(isStandalone()).toBe(true);
  });

  it("returns true for display-mode: minimal-ui (часть Android-браузеров)", () => {
    stubMatchMedia(["display-mode: minimal-ui"]);
    expect(isStandalone()).toBe(true);
  });

  it("returns true for iOS navigator.standalone even without display-mode", () => {
    stubMatchMedia([]);
    stubIosStandalone(true);
    expect(isStandalone()).toBe(true);
  });

  it("returns false for iOS navigator.standalone === false", () => {
    stubMatchMedia([]);
    stubIosStandalone(false);
    expect(isStandalone()).toBe(false);
  });
});
