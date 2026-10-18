/**
 * GUESTS REACH GUIDANCE (PR #463 re-test, 2026-10-18).
 *
 * After confirming, a guest was told to "choose Continue in your intake below"
 * and there was no Continue; choosing the other Small Claims route cancelled
 * the confirmation. This confirms as a guest, presses the review panel's
 * Continue, and requires guidance from the real analysis routes (which serve
 * guests without AI): the next step's stage question and the form it offers,
 * then — once the stage is chosen — the step with its deadline. The
 * confirmation must stand throughout.
 *
 * Small Claims guests still need to sign in first: its analysis requires the AI
 * safety check, which needs an account (SmallClaimsIntake, "Session 19"). The
 * test pins that Continue says so plainly rather than doing nothing, and that
 * switching route on the chooser keeps the confirmation.
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

for (const court of ["family", "civil"] as const) {
  test(`${court} guest: confirm, then Continue shows the next step, its form and deadline`, async ({ page }) => {
    test.setTimeout(240_000);
    await openBuilder(page, court, { story: STORY[court] });
    await confirmInitialInformation(page);
    await page.getByTestId("intake-continue-guidance").click();
    await expect(page).toHaveURL(/step=results/, { timeout: 120_000 });
    await confirmed(page);

    // The next step: choosing where the case stands, then the step it leads to.
    const stage = page.getByRole("combobox", { name: "Case stage" });
    await expect(stage).toBeVisible({ timeout: 60_000 });
    const firstStage = await stage.locator("option").nth(1).getAttribute("value");
    await stage.selectOption(firstStage!);
    await page.getByRole("button", { name: "Use this", exact: true }).click();
    const answer = page.getByTestId("stage-answer-panel");
    await expect(answer).toBeVisible({ timeout: 60_000 });
    // The step loads after the panel appears; these wait for it.
    await expect(answer, "the next step is shown").toContainText("YOUR NEXT STEP", { ignoreCase: true, timeout: 60_000 });
    await expect(answer, "the next step names its form").toContainText(/\bForm\s+[0-9]+[A-Z]?\b/);
    await expect(answer, "the next step states its deadline").toContainText(/\b\d+ days after\b/);
    await expect(answer, "the step cites its rule").toContainText(/checked \d{4}-\d{2}-\d{2}/);
    await expect(answer).not.toContainText("We could not load this just now");
    await confirmed(page);
  });
}

test("small-claims guest: switching route keeps the confirmation; Continue asks for sign-in plainly", async ({ page }) => {
  test.setTimeout(240_000);
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
  // The guided route: Continue says sign-in is needed, and runs no analysis.
  let analysed = false;
  await page.route("**/api/small-claims/analyze", (route) => { analysed = true; return route.continue(); });
  await page.getByTestId("intake-continue-guidance").click();
  await expect(page.getByText("Please sign in to continue. Small Claims intake requires a signed-in account")).toBeVisible({ timeout: 60_000 });
  await confirmed(page);

  // Back on the chooser, Continue opens the form, which says the same.
  await page.goBack();
  await expect(page.getByRole("button", { name: "Fill in the form yourself" })).toBeVisible();
  await confirmed(page);
  await page.getByTestId("intake-continue-guidance").click();
  await expect(page.getByText("Please sign in to continue. Small Claims intake now requires a signed-in account")).toBeVisible({ timeout: 60_000 });
  await confirmed(page);
  expect(analysed, "a Small Claims guest's story never reaches analysis without the safety check").toBe(false);
});
