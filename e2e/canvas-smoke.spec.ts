import { expect, test } from "@playwright/test";

test("playing canvas matches the baseline", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas#game");
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: "Beginner" }).click();
  await expect(page.locator(".overlay.start")).toHaveCount(0);
  await expect(canvas).toHaveScreenshot("canvas.png");
});
