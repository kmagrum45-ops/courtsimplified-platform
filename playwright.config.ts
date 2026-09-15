import { defineConfig } from "@playwright/test";

/**
 * Playwright owns its own dev server unless told otherwise.
 *
 * WHY A PORT OTHER THAN 3000. A developer's own `npm run dev` normally holds
 * 3000, and a test run should neither fight it nor silently depend on whether
 * it happens to be healthy. Starting a dedicated server on 3100 means a run is
 * reproducible on a machine with no server up, and unaffected by the state of
 * one that is.
 *
 * reuseExistingServer is TRUE so that a server already on 3100 — a second run,
 * or one started by hand — is used rather than duplicated.
 *
 * PLAYWRIGHT_BASE_URL still overrides everything, and setting it skips the
 * managed server entirely.
 */
const managedPort = 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${managedPort}`;

export default defineConfig({
  testDir: "tests/browser",
  reporter: "line",
  timeout: 10_000,
  workers: 1,
  use: { baseURL, actionTimeout: 8_000, navigationTimeout: 8_000, trace: "retain-on-failure", screenshot: "only-on-failure" },
  /*
   * The cold Next compile happens during this health probe, BEFORE any spec
   * navigates, so the existing specs keep their 8s navigationTimeout without
   * paying for it. That is the one thing that could have turned a passing spec
   * into a config-caused timeout.
   */
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${managedPort}`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 240_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
