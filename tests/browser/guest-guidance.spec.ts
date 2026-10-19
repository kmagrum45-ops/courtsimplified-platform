/**
 * GUESTS AND GUIDANCE (PR #463 re-test, 2026-10-18; site owner's decision).
 *
 * Every area's analysis runs the AI danger/distress safety check first, and
 * that check needs an account, so a guest must sign in before guidance —
 * Small Claims since "Session 19", Family and Civil from 2026-10-18 (Family is
 * the highest-risk area). Before this, a Family or Civil guest's story reached
 * analysis with the safety check silently refused (401, read as "clear").
 *
 * After confirming, "Show my next step" must not do nothing: a guest is told
 * plainly to sign in, no analysis request is made, and the confirmation
 * stands. Switching Small Claims route must not cancel it either.
 */
import { expect, test, type Page } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { grantSiteAccess } from "./harness/siteAccess";
import { confirmInitialInformation } from "./harness/intakeReview";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const STORY = {
  family: "Synthetic story: my former partner and I separated in March 2026 and we have not agreed on parenting time for our daughter.",
  civil: "Synthetic story: a contractor was paid $80,000 in May 2026 to renovate my house and left the work unfinished.",
  "small-claims": "Synthetic story: a contractor was paid $9,000 in May 2026 to fix my roof and never came back.",
};

async function confirmed(page: Page) {
  await expect(page.getByTestId("intake-review"), "the confirmation stands").toHaveAttribute("data-phase", "user-confirmed");
}

function watchAnalysis(page: Page) {
  const calls: string[] = [];
  page.on("request", (request) => { if (/\/api\/(small-claims|family|civil)\/analyze/.test(request.url())) calls.push(request.url()); });
  return calls;
}

for (const court of ["family", "civil"] as const) {
  test(`${court} guest: Show my next step asks for sign-in and sends nothing for analysis`, async ({ page }) => {
    test.setTimeout(240_000);
    const calls = watchAnalysis(page);
    await openBuilder(page, court, { story: STORY[court] });
    await confirmInitialInformation(page);
    await page.getByTestId("intake-continue-guidance").click();
    await expect(page.getByTestId("sign-in-for-safety-check")).toContainText(`${court === "family" ? "Family" : "Civil"} intake requires a signed-in account`);
    await confirmed(page);
    expect(calls, "a guest's story never reaches analysis unchecked").toEqual([]);
  });
}

test("small-claims guest: switching route keeps the confirmation; Show my next step asks for sign-in", async ({ page }) => {
  test.setTimeout(240_000);
  const calls = watchAnalysis(page);
  await grantSiteAccess(page);
  await page.route("**/api/case/understand", (route) => route.fulfill({ json: { ok: true, skipped: "off" } }));
  await page.route("**/api/classify-court-path", (route) => route.fulfill({ json: { primaryPath: "small-claims", confidence: 0.95 } }));
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel("Tell us what happened in your own words").fill(STORY["small-claims"]);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) {
    await acknowledgement.check();
    await page.getByTestId("acknowledgement-continue").click();
  }

  await confirmInitialInformation(page);
  await page.getByRole("button", { name: "Answer questions one at a time with AI help" }).click();
  await confirmed(page);
  // The guided route: Show my next step says sign-in is needed.
  await page.getByTestId("intake-continue-guidance").click();
  await expect(page.getByText("Please sign in to continue. Small Claims intake requires a signed-in account")).toBeVisible({ timeout: 60_000 });
  await confirmed(page);

  // Back on the chooser, it opens the form, which says the same.
  await page.goBack();
  await expect(page.getByRole("button", { name: "Fill in the form yourself" })).toBeVisible();
  await confirmed(page);
  await page.getByTestId("intake-continue-guidance").click();
  await expect(page.getByTestId("sign-in-for-safety-check")).toContainText("Small Claims intake requires a signed-in account");
  await confirmed(page);
  expect(calls, "a guest's story never reaches analysis unchecked").toEqual([]);
});
