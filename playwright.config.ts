import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "tests/browser",
  reporter: "line",
  timeout: 10_000,
  workers: 1,
  use: { baseURL, actionTimeout: 8_000, navigationTimeout: 8_000, trace: "retain-on-failure", screenshot: "only-on-failure" },
});
