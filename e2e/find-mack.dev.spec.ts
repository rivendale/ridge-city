import { expect, test } from "./fixtures";

/**
 * Find Mack (job 1). Mack stands inside the garage lot at (2920, 2680), but only
 * part of the lot is within his 48 px talk radius. Pressing ACT elsewhere in the
 * lot used to open the garage and leave the job on "meet".
 *
 * Runs against the Vite dev server (project "dev-hooks"), because the
 * window.__ridgeCity test hooks only exist in DEV builds.
 */
// Lot corner, about 82 px from Mack (outside his talk radius).
const LOT_CORNER = { x: 2848.5, y: 2720 };
// Back corner of the garage bay, about 210 px from Mack and from the coupe
// parked at (2920, 2660), so ACT can't jack a car there in the control test.
const BAY_INSIDE = { x: 3070, y: 2520 };

async function startBeginner(page: import("@playwright/test").Page) {
  await page.goto("/", { waitUntil: "load" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "load" });
  await page.getByRole("button", { name: "Beginner", exact: true }).click();
  await expect.poll(() => page.evaluate(() => typeof window.__ridgeCity?.warp)).toBe("function");
  await expect.poll(() => page.evaluate(() => window.__ridgeCity!.getState().screen)).toBe("play");
}

async function actAt(page: import("@playwright/test").Page, spot: { x: number; y: number }) {
  await page.evaluate(({ x, y }) => window.__ridgeCity!.warp!(x, y), spot);
  // Let a frame run so the warp settles before the edge-triggered act.
  await page.waitForTimeout(120);
  await page.evaluate(({ x, y }) => {
    window.__ridgeCity!.warp!(x, y);
    window.__ridgeCity!.act();
  }, spot);
  await page.waitForTimeout(200);
  return page.evaluate(() => window.__ridgeCity!.getState());
}

test("ACT inside the garage lot finishes Find Mack instead of opening the garage", async ({ page }) => {
  await startBeginner(page);
  expect(await page.evaluate(() => window.__ridgeCity!.getState().jobId)).toBe("meet");

  const after = await actAt(page, LOT_CORNER);
  expect(after.jobId).not.toBe("meet");
  expect(after.screen).not.toBe("garage");
});

test("ACT inside the garage bay also finishes Find Mack", async ({ page }) => {
  await startBeginner(page);
  const after = await actAt(page, BAY_INSIDE);
  expect(after.jobId).not.toBe("meet");
  expect(after.screen).not.toBe("garage");
});

test("control: after Find Mack, ACT in the garage still opens the garage", async ({ page }) => {
  await startBeginner(page);
  const first = await actAt(page, BAY_INSIDE);
  expect(first.jobId).not.toBe("meet");
  expect(first.screen).toBe("play");

  await page.waitForTimeout(300);
  const second = await actAt(page, BAY_INSIDE);
  expect(second.vehicle).toBe("ON FOOT");
  expect(second.screen).toBe("garage");
});
