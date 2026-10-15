import { describe, expect, it } from "vitest";
import { isStandalone } from "../src/lib/pwa";

describe("isStandalone", () => {
  it("returns false in a normal browser context", () => {
    expect(isStandalone()).toBe(false);
  });
});
