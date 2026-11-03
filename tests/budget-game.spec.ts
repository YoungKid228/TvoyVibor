import { expect, test } from "@playwright/test";

/**
 * Сквозной сценарий игры «Белка Соломон».
 *
 * Проверяет полный цикл: меню → неделя с событиями → итоговый экран.
 */

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

  // День 1: пять шкал и кошелёк.
  await expect(page.getByText(/День 1 из 7/)).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(5);

  // Пять шкал с прогресс-баром — проверяем, что они не пустые.
  const bars = page.getByRole("progressbar");
  for (let i = 0; i < 5; i += 1) {
    await expect(bars.nth(i)).toBeVisible();
  }

  // Проходим неделю: закрываем события и заканчиваем дни.
  for (let day = 1; day <= 7; day += 1) {
    const blizzard = page.getByRole("button", { name: /Автобус/ });
    if (await blizzard.isVisible().catch(() => false)) {
      await blizzard.click();
    }
    const repair = page.getByRole("button", { name: /^Ремонт/ });
    if (await repair.isVisible().catch(() => false)) {
      await repair.click();
    }
    const gift = page.getByRole("button", { name: /Подарок и праздник/ });
    if (await gift.isVisible().catch(() => false)) {
      await gift.click();
    }
    await page.getByRole("button", { name: "Закончить день" }).click();
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
