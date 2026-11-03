import { defineConfig, devices } from "@playwright/test";

const port = 4173;

/**
 * Nick's Playwright rule (2026-11-02): until Playwright bundles Chromium
 * >= 156.0.8078.73, Playwright may run ONLY against our own local builds
 * (localhost / 127.0.0.1 / file served by this config's webServer), never
 * against outside sites, and must set chromiumSandbox: true.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  updateSnapshots: "missing",
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      threshold: 0.2,
      animations: "disabled",
      caret: "hide",
    },
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    chromiumSandbox: true,
    viewport: { width: 960, height: 540 },
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "dark",
    reducedMotion: "reduce",
    launchOptions: {
      args: [
        "--font-render-hinting=none",
        "--disable-font-subpixel-positioning",
        "--disable-lcd-text",
        "--force-device-scale-factor=1",
      ],
    },
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 960, height: 540 },
        deviceScaleFactor: 1,
        chromiumSandbox: true,
      },
    },
  ],
});
