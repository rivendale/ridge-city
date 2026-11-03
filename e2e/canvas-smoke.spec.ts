import { type Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const injection = join(dirname(fileURLToPath(import.meta.url)), "deterministic-injection.js");
const VIEW = { width: 960, height: 540 };

test.use({
  viewport: VIEW,
  deviceScaleFactor: 1,
  locale: "en-US",
  timezoneId: "UTC",
  colorScheme: "dark",
  reducedMotion: "reduce",
});

test("seeded canvas matches the baseline", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.addInitScript({ path: injection });
  await page.goto("/", { waitUntil: "load" });

  await expect(page.locator(".game-root")).toBeVisible();
  const canvas = page.locator("canvas#game");
  await expect(canvas).toBeVisible();

  await expect
    .poll(() => page.evaluate(() => globalThis._e2eInjected === true && performance.now() === 0 && Date.now() === 0))
    .toBe(true);

  const fontsReady = await page.evaluate(async () => {
    const specs = [
      '700 11px "Barlow Condensed"',
      '700 12px "Barlow Condensed"',
      '700 13px "Barlow Condensed"',
      '700 14px "Barlow Condensed"',
      '700 18px "Barlow Condensed"',
      '600 10px "IBM Plex Sans"',
      '700 11px "IBM Plex Sans"',
      '700 12px "IBM Plex Sans"',
    ];
    await Promise.all(specs.map((spec) => document.fonts.load(spec)));
    await document.fonts.ready;
    return (
      document.fonts.check('700 18px "Barlow Condensed"') &&
      document.fonts.check('700 12px "IBM Plex Sans"')
    );
  });
  expect(fontsReady).toBe(true);

  await page.waitForFunction(() => {
    const need = ["asphalt.jpg", "grass.jpg", "water.jpg", "prop-1.png", "prop-9.png"];
    const urls = performance.getEntriesByType("resource").map((entry) => entry.name);
    return need.every((name) => urls.some((url) => url.includes(name)));
  });

  await waitForStableCanvas(page);

  await expect(canvas).toHaveScreenshot("ridge-city-canvas.png", {
    threshold: 0.2,
    animations: "disabled",
    caret: "hide",
  });

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

async function waitForStableCanvas(page: Page) {
  const deadline = Date.now() + 10_000;
  let last = "";
  let streak = 0;
  let saw: { w: number; h: number } | null = null;

  while (Date.now() < deadline) {
    const sample = await page.evaluate(({ width, height }) => {
      const canvas = document.querySelector("canvas#game");
      if (!(canvas instanceof HTMLCanvasElement)) return null;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      if (canvas.width !== width || canvas.height !== height) {
        return { hash: "", varied: false, w: canvas.width, h: canvas.height };
      }
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let hash = 2166136261;
      let min = 255 * 3;
      let max = 0;
      for (let i = 0; i < data.length; i += 64) {
        const lum = data[i] + data[i + 1] + data[i + 2];
        if (lum < min) min = lum;
        if (lum > max) max = lum;
        hash ^= data[i] + (data[i + 1] << 8) + (data[i + 2] << 16);
        hash = Math.imul(hash, 16777619);
      }
      return { hash: String(hash >>> 0), varied: max - min > 24, w: canvas.width, h: canvas.height };
    }, VIEW);

    if (!sample) {
      await page.waitForTimeout(50);
      continue;
    }
    saw = sample;
    if (sample.w !== VIEW.width || sample.h !== VIEW.height) {
      throw new Error(`Canvas is ${sample.w}x${sample.h}. Expected ${VIEW.width}x${VIEW.height}.`);
    }
    if (sample.varied && sample.hash === last) streak += 1;
    else streak = 0;
    if (sample.varied && streak >= 2) return;
    last = sample.varied ? sample.hash : "";
    await page.waitForTimeout(100);
  }

  const size = saw ? `${saw.w}x${saw.h}` : "missing";
  throw new Error(`Game canvas did not settle into a stable frame (${size}).`);
}
