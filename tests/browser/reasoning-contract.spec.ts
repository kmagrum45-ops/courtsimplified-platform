import { expect, test } from "@playwright/test";

import { grantSiteAccess } from "./harness/siteAccess";

const journeys = [
  { path: "family", label: "Family", issue: "Parenting time / access" },
  { path: "family", label: "Family", issue: "Child support" },
  { path: "civil", label: "Civil", issue: "Contract / agreement dispute" },
  { path: "civil", label: "Civil", issue: "Negligence / harm / damages" },
] as const;

for (const journey of journeys) {
  test(`${journey.label}: ${journey.issue} reaches the reasoning-contract overview`, async ({ page }) => {
    // middleware.ts's site-wide password gate (added 2026-08-23) 401s/redirects
    // every navigation until this cookie is set.
    await grantSiteAccess(page);
    await page.goto(`/?path=${journey.path}`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("court-path-location-gate-ready").waitFor({ state: "visible" });
    await page.getByLabel("Province or territory").selectOption("Ontario");
    await page.getByLabel("City or municipality").fill("Ottawa");
    await page.getByLabel("Tell us what happened in your own words").fill("Synthetic saved facts for a focused review.");
    await page.getByRole("button", { name: `Continue to ${journey.label} intake` }).click();
    if (journey.path === "civil") await page.getByLabel("Your role").selectOption("plaintiff");
    await page.getByRole("button", { name: journey.issue }).click();
    await page.getByRole("button", { name: /Continue to Unified Analysis/ }).click();
    const overview = page.getByTestId("case-overview");
    await expect(overview).toBeVisible({ timeout: 20_000 });
    await expect(overview.getByText("Issues to review", { exact: true })).toBeVisible();
    await expect(overview.getByText("will win", { exact: false })).toHaveCount(0);
  });
}
