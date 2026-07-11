import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  expect: { timeout: 8_000 },
  fullyParallel: true,
  reporter: "line",
  testDir: "./tests",
  testIgnore: "production.spec.ts",
  use: {
    baseURL: "http://127.0.0.1:3100",
    channel: "chrome",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    reuseExistingServer: true,
    timeout: 120_000,
    url: "http://127.0.0.1:3100",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { height: 1024, width: 1440 } },
    },
    {
      name: "tablet",
      use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { height: 1024, width: 768 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"], channel: "chrome", viewport: { height: 844, width: 390 } },
    },
  ],
});
