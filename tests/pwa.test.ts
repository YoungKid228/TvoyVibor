import { afterEach, describe, expect, it } from "vitest";
import {
  canPromptInstall,
  isStandalone,
  promptInstall,
  subscribeToInstallPrompt,
} from "../src/lib/pwa";

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

});

describe("install prompt", () => {
  it("returns false without a deferred beforeinstallprompt event (jsdom)", async () => {
    expect(await promptInstall()).toBe(false);
  });

  it("notifies subscribers and allows prompting after beforeinstallprompt", async () => {
    let notified = 0;
    const unsubscribe = subscribeToInstallPrompt(() => {
      notified += 1;
    });

    const promptCalls: number[] = [];
    const event = new Event("beforeinstallprompt") as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: string }>;
    };
    Object.assign(event, {
      prompt: () => {
        promptCalls.push(1);
        return Promise.resolve();
      },
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });

    window.dispatchEvent(event);
    expect(notified).toBe(1);
    expect(canPromptInstall()).toBe(true);

    unsubscribe();
    expect(await promptInstall()).toBe(true);
    expect(promptCalls).toHaveLength(1);
    expect(canPromptInstall()).toBe(false);
    expect(await promptInstall()).toBe(false);
  });
});
