import { expect, test } from "@playwright/test";
import {
  morning,
  feedAndPay,
  resolveEventIfOpen,
  sleepAndNextDay,
  startGame,
} from "./budget-flow";

/**
 * Игра «Белка Соломон» полностью офлайн.
 *
 * Офлайн проверялся косвенно (загружается оболочка приложения). Но учебная
 * игра — это семь дней, события, сохранения: если хоть один из этих шагов
 * требует сети, офлайн-режим не работает. Здесь проходится неделя целиком
 * без сети.
 */

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

  await startGame(page);
  await morning(page);

  for (let day = 1; day <= 7; day += 1) {
    if (day > 1) await morning(page);
    await resolveEventIfOpen(page);
    await feedAndPay(page);
    await sleepAndNextDay(page);
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
