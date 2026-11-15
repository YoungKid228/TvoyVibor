import { expect, test, type Page } from "@playwright/test";

/**
 * Мобильная вёрстка игры «Белка Соломон».
 *
 * Для учебного приложения телефон — основной сценарий, а адаптив до сих пор
 * не проверялся. Здесь два утверждения:
 *   1. на ширине 360 px игра не разъезжается по горизонтали;
 *   2. интерактивные элементы достигают размера 44 px — палец должен попасть.
 */

const MOBILE_WIDTH = 360;
const MIN_TOUCH_TARGET = 44;

async function skipInstallGate(page: Page) {
  const skip = page.getByRole("button", { name: /Продолжить в браузере/i });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: MOBILE_WIDTH, height: 740 });
  await page.goto("/");
  await skipInstallGate(page);
  await page.getByRole("button", { name: /^Игра$/ }).click();
});

test("игра не разъезжается по горизонтали на 360 px", async ({ page }) => {
  await page.getByRole("button", { name: /Начать/i }).click();
  await expect(page.getByText(/День 1 из 7/)).toBeVisible();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test("тач-цели на экране дня не меньше 44 px", async ({ page }) => {
  await page.getByRole("button", { name: /Начать/i }).click();
  await expect(page.getByText(/День 1 из 7/)).toBeVisible();

  const small = await page.evaluate((min) => {
    const bad: string[] = [];
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("button, [role='tab']"),
    );
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      // Кнопки, скрытые через display:none, не считаем.
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.height < min) {
        bad.push(`${node.textContent?.trim().slice(0, 24)} — ${Math.round(rect.height)} px`);
      }
    }
    return bad;
  }, MIN_TOUCH_TARGET);

  expect(small).toEqual([]);
});

test("экран «Правила» читается на телефоне", async ({ page }) => {
  await page.getByRole("button", { name: /Правила/ }).click();
  await expect(page.getByRole("heading", { name: "Правила" })).toBeVisible();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
