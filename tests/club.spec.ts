import { expect, test } from "@playwright/test";

test("club section opens from navigation and shows key info", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("continue-in-browser").click();

  await page.getByRole("navigation").getByRole("button", { name: "Клуб" }).click();

  await expect(
    page.getByRole("heading", { name: "Клуб молодого предпринимателя" }),
  ).toBeVisible();
  await expect(
    page.getByText("Партнёры клуба", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("аудитория 209")).toBeVisible();

  // возврат к тестам
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Тесты" })
    .click();
  await expect(page.getByTestId("test-card").first()).toBeVisible();
});
