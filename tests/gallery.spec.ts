import { expect, test } from "@playwright/test";

test("gallery: search, program filter and profession card", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("continue-in-browser").click();

  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Галерея профессий" })
    .click();

  // все 20 карточек
  const cards = page.getByTestId("profession-card");
  await expect(cards).toHaveCount(20);

  // фильтр по программе
  await page
    .getByRole("group", { name: "Фильтр по программе подготовки" })
    .getByRole("button", { name: /Банковское дело/ })
    .click();
  await expect(cards).toHaveCount(3);

  // поиск по названию (сбросив фильтр)
  await page
    .getByRole("group", { name: "Фильтр по программе подготовки" })
    .getByRole("button", { name: "Все" })
    .click();
  await page.getByLabel("Поиск профессии по названию").fill("бухгалтер");
  await expect(cards).toHaveCount(3); // бухгалтер, по расчёту зарплаты, главный

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

test("directions: four programs with placeholders and related professions", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("continue-in-browser").click();

  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Направления" })
    .click();
  const programCards = page.getByTestId("program-card");
  await expect(programCards).toHaveCount(4);

  // карточка направления (Банковское дело): факты со страницы ПГУ + данные из ООП и учебного плана
  await programCards.first().click();
  await expect(page.getByText("Очная: 1 год 10 месяцев")).toBeVisible();
  await expect(page.getByText("Заочная: 3 года 10 месяцев")).toBeVisible();
  await expect(page.getByText("Платных мест: 30")).toBeVisible();
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

  // магистратура: профили с контентом со страницы ПГУ, профиль ЭБиУР — из ООП (заочная форма)
  await page.getByTestId("program-card").filter({ hasText: "38.04.01" }).click();
  await expect(page.getByText("Профили программы")).toBeVisible();
  await expect(page.getByTestId("profile-name")).toHaveCount(3);
  await expect(
    page.getByTestId("profile-name").filter({ hasText: "Электронная коммерция" }),
  ).toBeVisible();
  await expect(page.getByText("70 % курсов ведут эксперты рынка", { exact: false })).toBeVisible();
  await expect(page.getByText("Очная: 2 года", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Заочная: 2 года 6 месяцев", { exact: true }),
  ).toBeVisible();
  // ЭБиУР — только заочно, остальные профили — очно
  await expect(page.getByText("Форма обучения: заочная", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Форма обучения: очная", { exact: true })).toHaveCount(2);

  // официальный источник программы
  await expect(
    page.getByRole("link", { name: "Открыть на сайте ПГУ им. Шолом-Алейхема" }),
  ).toHaveCount(1);
});
