import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  expect: { timeout: 8_000 },
  reporter: "line",
  testMatch: "production.spec.ts",
  testDir: "./tests",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3101",
    channel: "chrome",
    viewport: { height: 1024, width: 1440 },
  },
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3101",
    reuseExistingServer: false,
    timeout: 120_000,
    url: "http://127.0.0.1:3101",
  },
});
