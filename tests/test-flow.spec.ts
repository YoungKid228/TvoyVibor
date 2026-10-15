import { expect, test } from "@playwright/test";

async function passTest(page: import("@playwright/test").Page) {
  await page.goto("/");
  // standalone не определён в обычном браузере: сначала экран установки
  await page.getByTestId("continue-in-browser").click();
  await page.getByTestId("test-card").first().click();

  for (let i = 0; i < 20; i++) {
    await expect(page.getByTestId("progress-bar")).toContainText(
      `${i + 1} / 20`,
    );
    await page.getByTestId("answer-option").first().click();
    const next = page.getByTestId("next-btn");
    if (i < 19) {
      await next.click();
    } else {
      await next.click(); // 20-й вопрос: «Завершить»
    }
  }
  await expect(page.getByTestId("result-screen")).toBeVisible();
}

test("full flow: 20 answers with progress bar and back navigation keeps answers", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("continue-in-browser").click();
  await page.getByTestId("test-card").first().click();

  // ответ на 1-й вопрос, вперёд, назад — ответ должен сохраниться
  const firstOption = page.getByTestId("answer-option").first();
  await firstOption.click();
  await expect(firstOption).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("next-btn").click();
  await page.getByTestId("back-btn").click();
  await expect(page.getByTestId("answer-option").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByTestId("next-btn").click();
  for (let i = 1; i < 20; i++) {
    await page.getByTestId("answer-option").first().click();
    await page.getByTestId("next-btn").click();
  }
  await expect(page.getByTestId("result-screen")).toBeVisible();
});

test("progress survives page reload mid-test", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("continue-in-browser").click();
  await page.getByTestId("test-card").first().click();

  for (let i = 0; i < 10; i++) {
    await page.getByTestId("answer-option").first().click();
    await page.getByTestId("next-btn").click();
  }
  // теперь на 11-м вопросе
  await expect(page.getByTestId("progress-bar")).toContainText("11 / 20");

  await page.reload();
  await page.getByTestId("continue-in-browser").click();
  await page.getByTestId("test-card").first().click();
  await expect(page.getByTestId("progress-bar")).toContainText("11 / 20");
});

test("result screen shows best profession and explanation", async ({
  page,
}) => {
  await passTest(page);
  await expect(page.getByTestId("result-screen")).toContainText(
    "Наиболее подходит",
  );
  await expect(page.getByTestId("result-screen")).toContainText(
    "соответствие",
  );
});

test("manifest is served", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const manifest = await res.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.name).toContain("ПГУ");
});
