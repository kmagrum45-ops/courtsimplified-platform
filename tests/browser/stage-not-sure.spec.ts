/**
 * "WHERE THE CASE IS", ANSWERED "NOT SURE" AT THE START, IS NEVER ASKED AGAIN (founder, 1 Nov: the
 * stage chooser after "not sure" shows the quiet line, with "Add it" opening the chooser).
 *
 * A person with a case already going who picked "I am not sure" for its step (the situation questions)
 * was asked "Where is your case?" again on the results page and the case page: the step panel
 * (StageAnswerPanel, at builder/page.tsx and cases/[id]/page.tsx; stageFromAnswers.ts:130 "the step panel
 * offers the steps once more"). Measured 1 Nov at caf8dfcd: StageConfirmation shows the stage recorded
 * ("The case has started"), the step panel's list is on screen (log itemC-one-stage-before6.log). Under the not-sure rule the chooser is folded into "Not answered yet: add it when you know"
 * with "Add it", which opens the same chooser. No procedure content or wording changes (CLAUDE.md s. 2a).
 *
 * What it checks (stand-ins only: fakeAccount, serveFromThisCommit), civil, Family and Small Claims (added 2 Nov: the
 * founder's Chrome check of #541 at 354e36fb, step 2, saw the chooser in Small Claims only; cause: the case file read the
 * Small Claims form's guessed or copied stage over the start's "not sure", caseFile.ts each area's form, now skipped once
 * the start answered where the case is; test:unsure-never-saved):
 *   1. results page: neither "Where is your case?" (stage-answer-select) nor a suggested step, nor the stage
 *      chooser; the quiet line is;
 *   2. "Add it" opens the list (the person may still give the step);
 *   3. the case page: the same quiet line, no chooser.
 *
 * WHAT FAILURE THIS CATCHES: the stage asked again after the person said they are not sure.
 */
import { expect, test, type Page } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { serveFromThisCommit } from "./harness/thisCommitServer";
import { NOT_ANSWERED_YET } from "../../src/lib/case-system/copy/askCopy";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { grantSiteAccess } from "./harness/siteAccess";
import { autoAnswerSituation } from "./harness/situation";
import { tickIfAsked } from "./harness/intakeReview";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const STORY = {
  civil: "Synthetic story: a supplier kept my $62,000 deposit and never delivered the equipment. I sued them last month.",
  family: "Synthetic story: my spouse and I separated in March 2026; I started a case about the house last month.",
} as const;

async function finishQuestions(page: Page) {
  for (let i = 0; i < 30; i++) {
    const question = page.getByTestId("guided-form-question");
    if (!(await question.isVisible({ timeout: 5_000 }).catch(() => false))) break;
    const yes = question.getByTestId("guided-form-from-story-yes");
    if (await yes.isVisible().catch(() => false)) { await yes.click(); continue; }
    const option = question.locator("[data-testid^=guided-option-]").first();
    if (await option.count()) { await option.click(); continue; }
    const check = question.locator("[data-testid^=guided-check-]").first();
    if (await check.count()) { await check.check(); await question.getByTestId("guided-form-next").click(); continue; }
    await question.getByTestId("guided-form-skip").click();
  }
  const done = page.getByTestId("guided-form-done");
  if (await done.isVisible().catch(() => false)) await done.click();
  const panel = page.getByTestId("intake-review");
  // "Done" opens the review itself; only when it did not, "Stop initial questions and review".
  if (!(await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 15_000 }).then(() => true).catch(() => false))) {
    const start = page.getByTestId("intake-start-review");
    await start.scrollIntoViewIfNeeded().catch(() => {});
    await console.log(`phase ${await panel.getAttribute("data-phase")}; start enabled ${await start.isEnabled().catch(() => "?")}`);
    await start.click();
  }
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
}

async function confirmAndContinue(page: Page) {
  const panel = page.getByTestId("intake-review");
  const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
  while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1); }
  await tickIfAsked(page);
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  // The one-time "Before you start" notice, when it comes now (Small Claims from the home page): passed, then the next step again.
  const notice = page.getByTestId("acknowledgement-checkbox");
  if (await notice.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await notice.check();
    await page.getByTestId("acknowledgement-continue").click();
    // Passing the notice may start the next step by itself; pressed again only when it did not.
    if (!(await page.getByTestId("completed-case-overview").isVisible({ timeout: 20_000 }).catch(() => false))) await page.locator("button:visible").filter({ hasText: /^(Continue to your next steps|Show my next step)$/ }).first().click({ timeout: 10_000 }).catch(() => {});
  }
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 90_000 });
}

async function expectFolded(page: Page, where: string) {
  // The step panel has drawn where the case is: its question, a step, or the quiet line.
  await expect(page.getByTestId("stage-answer-panel").first()).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1_500);
  await expect.soft(page.getByTestId("stage-answer-select"), `${where}: "Where is your case?" is not asked again`).toBeHidden();
  await expect.soft(page.getByTestId("stage-answer-use-suggestion"), `${where}: no step is suggested in its place`).toHaveCount(0);
  await expect.soft(page.getByTestId("stage-confirmation"), `${where}: the stage chooser is not on screen`).toHaveCount(0);
  const quiet = page.locator("[data-testid=stage-not-answered-yet]");
  await expect(quiet, `${where}: the quiet line for where the case is`).toBeVisible({ timeout: 10_000 });
  await expect(quiet).toContainText(NOT_ANSWERED_YET);
}

for (const court of ["civil", "family"] as const) {
  test(`${court}: a case going, its step "not sure" at the start: the stage is never asked again; "Add it" opens the chooser`, async ({ page }) => {
    test.setTimeout(300_000);
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
    await openBuilder(page, court, { city: "Kingston", story: STORY[court], situation: { where: "going", started: "me", stage: "not-sure" } });
    await finishQuestions(page);
    await confirmAndContinue(page);
    await expectFolded(page, "results");
    const row = [...account.rows.values()][0] as Record<string, unknown>;
    await page.goto(`/cases/${row.id}`);
    await expectFolded(page, "case page");
    await page.locator("[data-testid=stage-not-answered-yet]").getByTestId("not-answered-yet-add").click();
    await expect(page.getByTestId("stage-answer-select"), "Add it opens the list").toBeVisible({ timeout: 20_000 });
  });
}

/*
 * SMALL CLAIMS (founder's Chrome check of #541 at 354e36fb, step 2, 2 Nov): "A case is already going" ->
 * "I started it" -> "I'm not sure" showed the chooser on the step page and the case page, with no quiet line;
 * civil and Family passed. The same three answers here, through the Small Claims review.
 */
test(`small-claims: a case going, its step "not sure" at the start: the stage is never asked again; "Add it" opens the chooser`, async ({ page }) => {
  test.setTimeout(300_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, { where: "going", started: "me", stage: "not-sure" });
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Ottawa");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill("Synthetic story: I lent Sam Tester $2,000 in March 2026 and he has not paid it back. I sued him last month.");
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByTestId("intake-start-review")).first()).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await page.getByTestId("intake-start-review").click();
  await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
  await confirmAndContinue(page);
  await expectFolded(page, "results");
  const row = [...account.rows.values()][0] as Record<string, unknown>;
  await page.goto(`/cases/${row.id}`);
  await expectFolded(page, "case page");
  await page.locator("[data-testid=stage-not-answered-yet]").getByTestId("not-answered-yet-add").click();
  await expect(page.getByTestId("stage-answer-select"), "Add it opens the list").toBeVisible({ timeout: 20_000 });
});
