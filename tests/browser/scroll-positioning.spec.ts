import { expect, test } from "@playwright/test";

import { grantSiteAccess } from "./harness/siteAccess";

for (const journey of [
  { path: "family", label: "Family", heading: "Family Intake" },
  { path: "small-claims", label: "Small Claims", heading: "Confirm the details needed for your Small Claims matter." },
  { path: "civil", label: "Civil", heading: "Your role" },
] as const) {
  test(`${journey.label} navigation opens the intake at the top of its destination`, async ({ page }) => {
    // middleware.ts's site-wide password gate (added 2026-08-23) 401s/redirects
    // every navigation until this cookie is set.
    await grantSiteAccess(page);
    await page.goto(`/?path=${journey.path}`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("court-path-location-gate-ready").waitFor({ state: "visible" });
    await page.getByLabel("Province or territory").selectOption("Ontario");
    await page.getByLabel("City or municipality").fill("Ottawa");
    await page.getByLabel("Tell us what happened in your own words").fill("A test case is being started.");
    await page.getByRole("button", { name: `Continue to ${journey.label} intake` }).click();
    if (journey.path === "civil") await expect(page.getByLabel("Your role")).toBeVisible();
    else await expect(page.getByText(journey.heading, { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
}

test("ordinary intake typing does not change the reader's scroll position", async ({ page }) => {
  // middleware.ts's site-wide password gate (added 2026-08-23) 401s/redirects
  // every navigation until this cookie is set.
  await grantSiteAccess(page);
  await page.goto("/?path=family", { waitUntil: "domcontentloaded" });
  await page.getByTestId("court-path-location-gate-ready").waitFor({ state: "visible" });
  await page.evaluate(() => window.scrollTo(0, 180));
  const before = await page.evaluate(() => window.scrollY);
  await page.getByLabel("Tell us what happened in your own words").evaluate((element) => {
    const textarea = element as HTMLTextAreaElement;
    textarea.value = "Typing should not move the reader away from this field.";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(before);
});
