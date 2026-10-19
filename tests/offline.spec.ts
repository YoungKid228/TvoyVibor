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

test("deep link is served as app shell online and offline", async ({
  page,
  context,
}) => {
  // SPA-fallback dev/preview-сервера: прямой переход по URL отдаёт приложение
  await page.goto("/some-deep-link");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Экономика",
  );

  // офлайн: service worker отвечает index.html на навигационные запросы
  await page.goto("/");
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null,
    undefined,
    { timeout: 15000 },
  );
  await context.setOffline(true);
  await page.goto("/some-deep-link", { waitUntil: "load" });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Экономика",
  );
  await context.setOffline(false);
});
