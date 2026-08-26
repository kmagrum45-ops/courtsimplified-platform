import { expect, test } from "@playwright/test";

import { grantSiteAccess } from "./harness/siteAccess";

test("FAM-ADOPTION-ADULT-001 shows a safe adult step-parent adoption overview", async ({ page }) => {
  test.setTimeout(30_000);
  // middleware.ts's site-wide password gate (added 2026-08-23) 401s/redirects
  // every navigation until this cookie is set.
  await grantSiteAccess(page);
  await page.goto("/?path=family", { waitUntil: "domcontentloaded" });
  await page.getByTestId("court-path-location-gate-ready").waitFor({ state: "visible" });
  await page.getByLabel("Province or territory").selectOption("Ontario");
  await page.getByLabel("City or municipality").fill("Ottawa");
  await page.getByLabel("Tell us what happened in your own words").fill("A 20-year-old adult wants adoption by a long-term step-parent after living with her mother and step-parent for approximately 15 years. Her biological father has not been involved for years and cannot currently be located.");
  await page.getByRole("button", { name: "Continue to Family intake" }).click();
  await page.getByRole("button", { name: "Adoption — step-parent, relative, or adult adoption" }).click();
  await page.getByLabel("Adoption details").fill("The person to be adopted is 20, wants adoption, is an Ontario resident, and the applicant is a step-parent. The biological father cannot currently be located; reasonable efforts to contact him are recorded.");
  await page.getByRole("button", { name: "Continue to Unified Analysis" }).click();

  const overview = page.getByTestId("completed-case-overview");
  await expect(overview).toBeVisible({ timeout: 20_000 });
  await expect(overview.getByText("Your case overview", { exact: true })).toBeVisible();
  await expect(overview.getByText("Possible adult step-parent adoption process to review", { exact: true })).toBeVisible();
  await expect(overview.getByText("Does the adult person freely agree to the proposed adoption?", { exact: true })).toBeVisible();
  await expect(overview.getByText("Family relationship and living-history information", { exact: true })).toBeVisible();
  await expect(overview.getByRole("link", { name: "Ontario: Adopt a stepchild or relative" })).toHaveAttribute("href", "https://www.ontario.ca/page/adopt-stepchild-or-relative");
  await expect(overview.getByRole("link", { name: "Ontario Court Services: Form 8D, Application (adoption)" })).toHaveAttribute("href", "https://ontariocourtforms.on.ca/en/family-law-rules-forms/8d/");
  await expect(overview.getByRole("link", { name: "Ontario Child, Youth and Family Services Act" })).toHaveAttribute("href", "https://www.ontario.ca/laws/statute/17c14");
  await expect(overview.getByText(/custody|parenting time/i)).toHaveCount(0);
  await expect(overview.getByText(/will approve|automatic|consent is unnecessary|father must consent/i)).toHaveCount(0);
});
