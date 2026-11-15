import { expect, test, type Page } from "@playwright/test";
import {
  morning,
  feedAndPay,
  resolveEventIfOpen,
  sleepAndNextDay,
  startGame,
} from "./budget-flow";

/**
 * Сквозной сценарий игры «Белка Соломон».
 *
 * Проверяет полный цикл: меню → брифинг → неделя с событиями → итоговый
 * экран.
 */

/**
 * Дождаться, пока автосохранение запишет нужный день.
 *
 * Запись в IndexedDB асинхронная: экран переключается на следующий день
 * сразу, а данные в базе появляются чуть позже. Если перезагрузить страницу
 * в этот промежуток, загрузится предыдущее состояние — и тест проверит не
 * то, что хотел.
 */
async function waitForSavedDay(page: Page, day: number) {
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const db = await new Promise<IDBDatabase>((res, rej) => {
            const r = indexedDB.open("pgu-econ-budget");
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
          });
          const tx = db.transaction("saves", "readonly");
          const req = tx.objectStore("saves").get("budget-game");
          const value = await new Promise<{ state?: { day?: number } } | null>(
            (res) => {
              req.onsuccess = () => res(req.result);
              req.onerror = () => res(null);
            },
          );
          return value?.state?.day ?? null;
        }),
      { timeout: 10_000 },
    )
    .toBe(day);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // Диалог установки приложения перекрывает интерфейс при первом визите.
  const skip = page.getByRole("button", { name: /Продолжить в браузере/i });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
});

test("игра: меню, брифинг, неделя и итоговый экран", async ({ page }) => {
  await page.getByRole("button", { name: /^Игра$/ }).click();

  await expect(page.getByText("Белка Соломон")).toBeVisible();
  await page.getByRole("button", { name: /Начать/i }).click();

  // Брифинг: знакомство с белкой и объяснение обязательных расходов.
  await expect(page.getByText(/Знакомьтесь: это Соломон/)).toBeVisible();
  await expect(page.getByText("Обязательные", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Понятно, начинаем/i }).click();

  // День 1: четыре шкалы (настроение, энергия, сытость, чистота) и кошелёк.
  await expect(page.getByText(/День 1 из 7/)).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(4);

  // Четыре шкалы с прогресс-баром — проверяем, что они не пустые.
  const bars = page.getByRole("progressbar");
  for (let i = 0; i < 4; i += 1) {
    await expect(bars.nth(i)).toBeVisible();
  }

  // Утром выбираем завтрак и дорогу.
  await expect(page.getByLabel("Утро")).toBeVisible();
  await morning(page);

  // Проходим неделю: каждое утро, событие, обязательный платёж и сон.
  for (let day = 1; day <= 7; day += 1) {
    if (day > 1) await morning(page);
    await resolveEventIfOpen(page);
    await feedAndPay(page);
    await sleepAndNextDay(page);
    if (day < 7) {
      await expect(page.getByText(`День ${day + 1} из 7`)).toBeVisible();
    }
  }

  // Итоговый экран: две оценки, разбор расходов и рекомендации.
  await expect(page.getByText(/Итог недели/)).toBeVisible();
  await expect(page.getByText("Оценка по деньгам")).toBeVisible();
  await expect(page.getByText("Оценка по счастью")).toBeVisible();
  await expect(page.getByText("Проверка расходов")).toBeVisible();
  await expect(page.getByText("Что стоит изменить")).toBeVisible();
});

test("игра: прогресс сохраняется после перезагрузки", async ({ page }) => {
  await startGame(page);

  // Делаем действие, чтобы состояние изменилось.
  await morning(page);
  await page.getByRole("button", { name: /Курьерская доставка/ }).click();
  await sleepAndNextDay(page);
  await expect(page.getByText(/День 2 из 7/)).toBeVisible();
  // Ждём, пока автосохранение допишет новый день: без этого перезагрузка
  // успела бы загрузить предыдущее состояние.
  await waitForSavedDay(page, 2);

  await page.reload();
  const skip = page.getByRole("button", { name: /Продолжить в браузере/i });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
  await page.getByRole("button", { name: /^Игра$/ }).click();

  // После перезагрузки игра возвращается в меню, где доступна кнопка
  // «Продолжить» — по ней открывается сохранённый день.
  const resume = page.getByRole("button", { name: /Продолжить/i });
  await expect(resume).toBeVisible();
  await resume.click();
  await expect(page.getByText(/День 2 из 7/)).toBeVisible();
});
