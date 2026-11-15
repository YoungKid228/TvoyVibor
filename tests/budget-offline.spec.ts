import { expect, test, type Page } from "@playwright/test";

/**
 * Игра «Белка Соломон» полностью офлайн.
 *
 * Офлайн проверялся косвенно (загружается оболочка приложения). Но учебная
 * игра — это семь дней, события, сохранения: если хоть один из этих шагов
 * требует сети, офлайн-режим не работает. Здесь проходится неделя целиком
 * без сети.
 */

/** Закрыть открытое событие, если оно есть. */
async function resolveEventIfOpen(page: Page) {
  for (const name of [/Автобус/, /^Ремонт/, /Подарок и праздник/]) {
    const button = page.getByRole("button", { name });
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await expect(button).toBeHidden();
      return;
    }
  }
}

test("неделя проходится полностью офлайн", async ({ page, context }) => {
  await page.goto("/");
  // ждём активации service worker — без него нет офлайн-кэша.
  // Таймаут с запасом: под нагрузкой (параллельные браузеры) регистрация
  // service worker занимает заметно больше времени.
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null,
    undefined,
    { timeout: 45_000 },
  );

  const skip = page.getByRole("button", { name: /Продолжить в браузере/i });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }

  // Обрываем сеть до начала игры: всё, что нужно, уже в кэше.
  await context.setOffline(true);

  await page.getByRole("button", { name: /^Игра$/ }).click();
  await page.getByRole("button", { name: /Начать/i }).click();
  await expect(page.getByText(/День 1 из 7/)).toBeVisible();

  for (let day = 1; day <= 7; day += 1) {
    await resolveEventIfOpen(page);
    const finish = page.getByRole("button", { name: "Закончить день" });
    // Пока открыто событие, день закончить нельзя.
    await expect(finish).toBeEnabled();
    await finish.click();
    if (day < 7) {
      // Ждём отрисовку следующего дня — событие (если оно есть) рисуется
      // вместе с ним, поэтому следующая проверка уже надёжна.
      await expect(page.getByText(`День ${day + 1} из 7`)).toBeVisible();
    }
  }

  await expect(page.getByText(/Итог недели/)).toBeVisible();
  await expect(page.getByText("Проверка расходов")).toBeVisible();

  // Прогресс сохраняется: после перезагрузки (всё ещё офлайн) игра
  // продолжается с последнего места.
  await page.reload();
  const skip2 = page.getByRole("button", { name: /Продолжить в браузере/i });
  if (await skip2.isVisible().catch(() => false)) {
    await skip2.click();
  }
  await page.getByRole("button", { name: /^Игра$/ }).click();
  await page.getByRole("button", { name: /Продолжить/i }).click();
  await expect(page.getByText(/Итог недели/)).toBeVisible();

  await context.setOffline(false);
});
