import { expect, test } from "@playwright/test";

test("app shell loads from cache when offline after first visit", async ({
  page,
  context,
}) => {
  await page.goto("/");
  // ждём активации service worker
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null,
    undefined,
    { timeout: 15000 },
  );

  await context.setOffline(true);
  await page.goto("/", { waitUntil: "load" });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Экономика",
  );
  await context.setOffline(false);
});
