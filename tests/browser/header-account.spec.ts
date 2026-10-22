/**
 * THE HEADER'S ACCOUNT CONTROLS FIT AT EVERY WIDTH (L25, #465 re-test A).
 *
 * "Signed in as" and Log out were added to the header on every page. At about
 * 855px the row overflowed: both were off-screen and every page scrolled
 * sideways. At each width a signed-in person must reach Log out (directly, or
 * from the menu on narrower screens) and no page may scroll sideways.
 *
 * Synthetic account (fakeAccount): nothing reaches a database.
 */
import { expect, test } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

for (const width of [375, 768, 855, 1024, 1280, 1440]) {
  test(`at ${width}px a signed-in person reaches Log out and no page scrolls sideways`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await fakeAccount(page);
    await grantSiteAccess(page);
    for (const path of ["/about", "/builder?path=small-claims"]) {
      await page.goto(path);
      // The visible one: below 1024px Log out is in the page but hidden in the desktop row.
      await expect(page.locator('[data-testid="header-log-out"]:visible, button[aria-label="Open menu"]:visible').first()).toBeVisible({ timeout: 60_000 });
      const sideways = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(sideways, `${path}: the page does not scroll sideways`).toBeLessThanOrEqual(0);
      const menu = page.getByRole("button", { name: "Open menu" });
      if (await menu.isVisible()) await menu.click();
      const logOut = page.locator('[data-testid="header-log-out"]:visible').first();
      await expect(logOut, `${path}: Log out is on screen`).toBeInViewport();
    }
  });
}
