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
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

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
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY["small-claims"]);
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
  // Said on the screen, and since L27 beside the button too: either copy will do.
  await expect(page.getByText("Please sign in to continue. Small Claims intake requires a signed-in account").first()).toBeVisible({ timeout: 60_000 });
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

// Re-test round 2: say up front that guidance needs a free account, and make the
// sign-in link bring this intake along (the carry rules: verifyGuestCarry).
test("guests are told up front, and signing in from the intake marks it to come along", async ({ page }) => {
  test.setTimeout(240_000);
  await grantSiteAccess(page);
  await page.route("**/api/case/understand", (route) => route.fulfill({ json: { ok: true, skipped: "off" } }));
  await page.route("**/api/classify-court-path", (route) => route.fulfill({ json: { primaryPath: "family", confidence: 0.95 } }));
  await page.goto("/?path=family");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("To see your next steps, you will need a free account")).toBeVisible();
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY.family);
  await page.getByRole("button", { name: "Continue to Family intake" }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const flow = new URL(page.url()).searchParams.get("intake");
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await confirmInitialInformation(page);
  // The "Before you start" step still showing: Show my next step says so instead of doing nothing.
  if (await acknowledgement.isVisible()) {
    await page.getByTestId("intake-continue-guidance").click();
    await expect(page.getByTestId("intake-continue-waiting")).toContainText("Finish the step shown below first");
    await acknowledgement.check();
    await page.getByTestId("acknowledgement-continue").click();
  }
  await page.getByTestId("intake-continue-guidance").click();
  await page.getByTestId("sign-in-for-safety-check").getByRole("link", { name: "Sign in or create a free account" }).click();
  await page.waitForURL(/\/login\?next=/);
  const next = new URL(page.url()).searchParams.get("next") ?? "";
  expect(next, "sign-in returns to this intake").toContain(`intake=${flow}`);
  const mark = await page.evaluate(() => JSON.parse(sessionStorage.getItem("courtSimplifiedGuestCarry") ?? "null"));
  expect(mark?.flowId, "this intake, and only it, is marked to come along").toBe(flow);
  const kept = await page.evaluate(() => sessionStorage.getItem("courtSimplifiedGuestIntakeSession") ?? "");
  expect(kept, "what the guest entered is still here for the login page to carry").toContain("parenting time");
});
