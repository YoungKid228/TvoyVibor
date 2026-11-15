import { expect, test, type Page } from "@playwright/test";

/**
 * Сквозной сценарий игры «Белка Соломон».
 *
 * Проверяет полный цикл: меню → неделя с событиями → итоговый экран.
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

test("игра: меню, неделя и итоговый экран", async ({ page }) => {
  await page.getByRole("button", { name: /^Игра$/ }).click();

  await expect(page.getByText("Белка Соломон")).toBeVisible();
  await page.getByRole("button", { name: /Начать/i }).click();

  // День 1: шесть шкал (включая чистоту Соломона) и кошелёк.
  await expect(page.getByText(/День 1 из 7/)).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(6);

  // Шесть шкал с прогресс-баром — проверяем, что они не пустые.
  const bars = page.getByRole("progressbar");
  for (let i = 0; i < 6; i += 1) {
    await expect(bars.nth(i)).toBeVisible();
  }

  // Проходим неделю: закрываем события и заканчиваем дни.
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

  // Итоговый экран: две оценки, разбор расходов и рекомендации.
  await expect(page.getByText(/Итог недели/)).toBeVisible();
  await expect(page.getByText("Оценка по деньгам")).toBeVisible();
  await expect(page.getByText("Оценка по счастью")).toBeVisible();
  await expect(page.getByText("Проверка расходов")).toBeVisible();
  await expect(page.getByText("Что стоит изменить")).toBeVisible();
});

test("игра: прогресс сохраняется после перезагрузки", async ({ page }) => {
  await page.getByRole("button", { name: /^Игра$/ }).click();
  await page.getByRole("button", { name: /Начать/i }).click();
  await expect(page.getByText(/День 1 из 7/)).toBeVisible();

  // Делаем действие, чтобы состояние изменилось.
  await page.getByRole("button", { name: /Помощь по хозяйству/ }).click();
  await page.getByRole("button", { name: "Закончить день" }).click();
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
