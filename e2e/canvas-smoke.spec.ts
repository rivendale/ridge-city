import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const SEED = "20261102";
/** Fixed frames after Beginner. The virtual clock steps 1/60 s each frame. */
const FRAMES = 90;
const injection = join(dirname(fileURLToPath(import.meta.url)), "deterministic-injection.js");

test.beforeEach(async ({ page }) => {
  await page.addInitScript({ path: injection });
});

test("playing canvas matches the baseline", async ({ page }) => {
  await page.goto(`/?seed=${SEED}`);
  const canvas = page.locator("canvas#game");
  await expect(canvas).toBeVisible();
  await page.waitForFunction(
    () => document.querySelector("canvas#game")?.getAttribute("data-assets") === "ready",
  );
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    await document.fonts.load('700 13px "Barlow Condensed"');
    await document.fonts.load('700 12px "IBM Plex Sans"');
    return {
      barlow: document.fonts.check('700 13px "Barlow Condensed"'),
      plex: document.fonts.check('700 12px "IBM Plex Sans"'),
    };
  });
  expect(fonts.barlow, "Barlow Condensed should load before the shot").toBe(true);
  expect(fonts.plex, "IBM Plex Sans should load before the shot").toBe(true);

  await page.getByRole("button", { name: "Beginner" }).click();
  await expect(page.locator(".overlay.start")).toHaveCount(0);
  await page.evaluate((frames) => {
    const advance = (window as unknown as { __ridgeAdvance?: (n: number) => void }).__ridgeAdvance;
    if (!advance) throw new Error("seeded clock was not installed");
    advance(frames);
  }, FRAMES);

  await expect(canvas).toHaveScreenshot("canvas.png", {
    threshold: 0.2,
    maxDiffPixelRatio: 0.002,
  });
});
