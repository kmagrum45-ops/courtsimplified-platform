import { expect, test } from "@playwright/test";

import { grantSiteAccess } from "./harness/siteAccess";

const paths = [
  { path: "family", label: "Family", area: "Family Intake" },
  { path: "small-claims", label: "Small Claims", area: "Your role" },
  { path: "civil", label: "Civil", area: "Your role" },
] as const;

async function begin(page: import("@playwright/test").Page, journey: typeof paths[number]) {
  // middleware.ts's site-wide password gate (added 2026-08-23) 401s/redirects
  // every navigation until this cookie is set.
  await grantSiteAccess(page);
  await page.goto(`/builder?path=${journey.path}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("court-path-location-gate")).toHaveCount(0);
  await page.getByLabel("Province or territory").selectOption("Ontario");
  await page.getByLabel("City or municipality").fill("Toronto");
  await page.getByLabel("Tell us what happened in your own words").fill("A private logged-out intake needs review.");
  await page.getByRole("button", { name: `Continue with ${journey.label} questions` }).click();
}

for (const journey of paths) {
  test(`logged-out ${journey.label} starts directly in its intake`, async ({ page }) => {
    await begin(page, journey);
    if (journey.path === "civil") await expect(page.getByLabel("Your role")).toBeVisible();
    else await expect(page.getByText(journey.area, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit case story" })).toBeVisible();
  });
}
