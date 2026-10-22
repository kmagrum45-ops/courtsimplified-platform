/**
 * THE COURTHOUSES PAGE AT PHONE WIDTH (Part 3b, #465 re-test).
 *
 * At 393px a long "Civil contacts" email (393 University) made the page scroll
 * sideways, and the intro read "65Superior Court". With every contact list
 * open, the page must not scroll sideways, and no number runs into a word.
 */
import { expect, test } from "@playwright/test";
import { grantSiteAccess } from "./harness/siteAccess";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

test("courthouses: no sideways scroll at phone width, and the count is spaced from its words", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 393, height: 850 });
  await grantSiteAccess(page);
  await page.goto("/courthouses");
  for (const details of await page.locator("details").all()) await details.evaluate((element) => { (element as HTMLDetailsElement).open = true; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), "no sideways scroll").toBeLessThanOrEqual(0);
  expect(await page.locator("body").innerText()).not.toMatch(/\dSuperior Court/);
});
