import { expect, type Page } from "@playwright/test";

/**
 * Общие шаги сквозных сценариев игры «Белка Соломон».
 *
 * День устроен по часам: утром игрок завтракает и выбирает дорогу, потом
 * идут пары, потом свободное время, а заканчивается день сном. Эти
 * помощники повторяют этот путь, чтобы тесты говорили о игре, а не о
 * вёрстке.
 */

/** Меню → брифинг → первый день. */
export async function startGame(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Игра$/ }).click();
  await page.getByRole("button", { name: /Начать/i }).click();
  await page.getByRole("button", { name: /Понятно, начинаем/i }).click();
  await expect(page.getByText(/День 1 из 7/)).toBeVisible();
}

/** Утро: позавтракать и доехать до пар. */
export async function morning(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Своя еда/ }).click();
  await page.getByRole("button", { name: /Автобус/ }).click();
}

/**
 * Покормить Соломона второй раз и оплатить жильё.
 *
 * Кормить нужно дважды в день: сон опускает сытость, и при одном приёме
 * пищи Соломон через несколько дней голодает — и игра проигрывается.
 */
export async function feedAndPay(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Потратить$/ }).first().click();
  const leftovers = page.getByRole("button", { name: /Еда, приготовленная утром/ });
  if (await leftovers.isEnabled().catch(() => false)) {
    await leftovers.click();
  }
  const housing = page.getByRole("button", { name: /Жильё в общежитии/ });
  if (await housing.isEnabled().catch(() => false)) {
    await housing.click();
  }
}

/** Закрыть открытое событие, если оно есть. */
export async function resolveEventIfOpen(page: Page): Promise<void> {
  for (const name of [/Починить/, /Подарок и праздник/]) {
    const button = page.getByRole("button", { name });
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await expect(button).toBeHidden();
      return;
    }
  }
}

/** Оплатить жильё, если ещё не оплачено: иначе на 5-й день выселяют. */
export async function payHousing(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Потратить/ }).click();
  const housing = page.getByRole("button", { name: /Жильё в общежитии/ });
  if (await housing.isEnabled().catch(() => false)) {
    await housing.click();
  }
}

/** Закончить день сном и перейти к следующему. */
export async function sleepAndNextDay(page: Page): Promise<void> {
  // Кнопка сна есть на сцене и видна всегда.
  await page.getByRole("button", { name: /^Поспать$/ }).click();
  // Подтверждение: если времени много, игра предупреждает.
  const confirm = page.getByRole("button", { name: /Всё равно поспать|Да, поспать/ });
  await confirm.click();
}

/**
 * Прожить день целиком: утро, событие, обязательный платёж, сон.
 */
export async function playDay(page: Page): Promise<void> {
  await morning(page);
  await resolveEventIfOpen(page);
  await feedAndPay(page);
  await sleepAndNextDay(page);
}
