import { expect, test } from "@playwright/test";

test("no horizontal scroll at 320px width", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await page.getByTestId("continue-in-browser").click();
  await page.getByTestId("test-card").first().click();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test("keyboard navigation: options are focusable and answerable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("continue-in-browser").click();
  await page.getByTestId("test-card").first().click();

  await page.getByTestId("answer-option").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("answer-option").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByTestId("next-btn")).toBeEnabled();
});
