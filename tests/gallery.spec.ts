import { expect, test } from "@playwright/test";

test("gallery: search, program filter and profession card", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("continue-in-browser").click();

  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Галерея профессий" })
    .click();

  // все 10 карточек
  const cards = page.getByTestId("profession-card");
  await expect(cards).toHaveCount(10);

  // фильтр по программе
  await page
    .getByRole("group", { name: "Фильтр по программе подготовки" })
    .getByRole("button", { name: /Банковское дело/ })
    .click();
  await expect(cards).toHaveCount(1);

  // поиск по названию (сбросив фильтр)
  await page
    .getByRole("group", { name: "Фильтр по программе подготовки" })
    .getByRole("button", { name: "Все" })
    .click();
  await page.getByLabel("Поиск профессии по названию").fill("бухгалтер");
  await expect(cards).toHaveCount(1); // бухгалтер

  // пустой результат
  await page.getByLabel("Поиск профессии по названию").fill("космонавт");
  await expect(
    page.getByText("По вашему запросу профессий не найдено."),
  ).toBeVisible();

  // карточка открывает страницу профессии
  await page.getByLabel("Поиск профессии по названию").fill("");
  await cards.first().click();
  await expect(
    page.getByRole("button", { name: "← В галерею профессий" }),
  ).toBeVisible();
  await expect(
    page.getByText("Описание профессии", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("pending-section")).toHaveCount(0);
});

test("directions: programs, master profiles and related professions", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("continue-in-browser").click();

  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Направления" })
    .click();
  const programCards = page.getByTestId("program-card");
  // 3 программы с одним профилем + 1 блок магистратуры с переключением
  await expect(programCards).toHaveCount(4);

  // в карточках направлений нет мест, стоимости и проходных баллов
  await expect(page.getByText(/бюджетных мест/i)).toHaveCount(0);
  await expect(page.getByText(/платных мест/i)).toHaveCount(0);
  await expect(page.getByText(/стоимость/i)).toHaveCount(0);
  await expect(page.getByText(/проходной балл/i)).toHaveCount(0);

  // карточка направления (Банковское дело): факты со страницы ПГУ + данные из ООП и учебного плана
  await programCards.first().click();
  await expect(page.getByText("Очная: 1 год 10 месяцев")).toBeVisible();
  await expect(page.getByText("Заочная: 3 года 10 месяцев")).toBeVisible();
  await expect(page.getByText("О программе")).toBeVisible();
  await expect(page.getByText("Что я буду изучать?")).toBeVisible();
  await expect(page.getByText("Карьерные перспективы")).toBeVisible();
  await expect(page.getByText("демонстрационным экзаменом")).toBeVisible();
  await expect(page.getByTestId("pending-section")).toHaveCount(0);
  const related = page.getByTestId("related-profession-link");
  expect(await related.count()).toBeGreaterThan(0);

  // связанная профессия открывает карточку галереи
  await related.first().click();
  await expect(
    page.getByRole("button", { name: "← В галерею профессий" }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Направления" })
    .click();

  // магистратура: один блок с переключением профилей
  await page
    .getByTestId("program-card")
    .filter({ hasText: "Электронная коммерция" })
    .getByTestId("directions-profile-switch")
    .filter({ hasText: "Электронная коммерция" })
    .click();
  await page
    .getByTestId("program-card")
    .filter({ hasText: "Электронная коммерция" })
    .getByTestId("directions-open-program")
    .click();
  await expect(page.getByText("Направленности магистратуры")).toBeVisible();
  await expect(page.getByTestId("profile-name")).toHaveCount(1);
  await expect(
    page.getByTestId("profile-name").filter({ hasText: "Электронная коммерция" }),
  ).toBeVisible();
  await expect(page.getByText("70 % курсов ведут эксперты рынка", { exact: false })).toBeVisible();
  // выбрана очная направленность — показывается только её форма и срок
  await expect(page.getByText("Очная: 2 года", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Заочная: 2 года 6 месяцев", { exact: true }),
  ).toHaveCount(0);
  // ЭБиУР — только заочно, остальные направленности — очно
  // (в переключателе направленностей и в карточке выбранной направленности)
  await expect(page.getByText("Форма обучения: заочная", { exact: true })).toHaveCount(1);

  // переключение направленности магистратуры
  await page
    .getByTestId("profile-switch")
    .filter({ hasText: "Аналитическая экономика" })
    .click();
  await expect(
    page.getByTestId("profile-name").filter({ hasText: "Аналитическая экономика" }),
  ).toBeVisible();

  // заочная направленность — только её форма и срок
  await page
    .getByTestId("profile-switch")
    .filter({ hasText: "Экономическая безопасность" })
    .click();
  await expect(
    page.getByText("Заочная: 2 года 6 месяцев", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Очная: 2 года", { exact: true })).toHaveCount(0);

  // официальный источник программы
  await expect(
    page.getByRole("link", { name: "Открыть на сайте ПГУ им. Шолом-Алейхема" }),
  ).toHaveCount(1);
});
