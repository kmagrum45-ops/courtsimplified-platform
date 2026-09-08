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

  if (journey.path === "small-claims") {
    // Session 14 removed the story field from this shared gate for Small
    // Claims specifically -- whichever mode is chosen collects the story
    // itself instead, so a logged-out user "starts directly in its intake"
    // by reaching the mode-selector screen, then choosing a mode, not by
    // filling a story field that no longer exists at this step.
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Fill in the form yourself" }).click();
    return;
  }

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
