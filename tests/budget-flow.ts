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

/**
 * Утро: позавтракать и доехать до пар.
 *
 * Выбор утром сделан как на макете: сначала вариант отмечается в ленте,
 * потом нажимается главная кнопка действия.
 */
export async function morning(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Своя еда/ }).click();
  await page.getByRole("button", { name: /^Позавтракать$/ }).click();
  await page.getByRole("button", { name: /Автобус/ }).click();
  await page.getByRole("button", { name: /^Ехать на пары$/ }).click();
}

/**
 * Прожить свободное время по-человечески: покормить Соломона второй раз,
 * оплатить жильё, развлечься и вымыть Соломона.
 *
 * Два приёма пищи в день обязательны: сон опускает сытость, и без еды
 * Соломон голодает. Развлечение нужно, чтобы настроение не упало до нуля
 * (а это проигрыш), а мытьё — чтобы грязного Соломона пустили в автобус.
 */
export async function feedAndPay(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Чем заняться\?$/ }).first().click();
  // Вкладка «Кушать» — второй приём пищи.
  await page.getByRole("button", { name: /^Кушать$/ }).click();
  await clickIfEnabled(page, /Еда, приготовленная утром/);
  // Вкладка «Платежи» — обязательные платежи.
  await page.getByRole("button", { name: /^Платежи$/ }).click();
  await clickIfEnabled(page, /Жильё в общежитии/);
  // Вкладка «Развлечься» — прогулка: без неё Соломон впадает в депрессию.
  await page.getByRole("button", { name: /^Развлечься$/ }).click();
  await clickIfEnabled(page, /Прогулка в парке/);
  // Раздел «Соломон» — мытьё: иначе в автобус и кафе не пустят.
  await page.getByRole("button", { name: /^Соломон$/ }).click();
  await clickIfEnabled(page, /Помыться/);
}

/**
 * Кликнуть по карточке, если она доступна.
 *
 * Имя карточки — это весь её текст («Помыться −200 ₽ 40 мин …»), поэтому
 * ищем по подстроке, а не по точному совпадению.
 */
async function clickIfEnabled(page: Page, name: RegExp): Promise<void> {
  const card = page.getByRole("button", { name });
  if ((await card.count()) === 0) return;
  if (await card.first().isEnabled().catch(() => false)) {
    await card.first().click();
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
  await page.getByRole("button", { name: /Чем заняться/ }).click();
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
