import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./packages/web/e2e",
  outputDir: "./output/playwright/test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "./output/playwright/html-report", open: "never" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:3010",
    ...devices["Desktop Chrome"],
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  webServer: {
    command: "node packages/web/node_modules/next/dist/bin/next dev packages/web -p 3010",
    url: "http://127.0.0.1:3010",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
