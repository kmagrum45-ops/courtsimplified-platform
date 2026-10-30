/**
 * CLAIM TYPE: ONE VALUE ON EVERY SCREEN, THROUGH THE REAL SAVE PATH (site owner, 29 Oct; rule 6 of
 * the fact conversion: the same-answer test for the fact, on every route, failing on main first).
 *
 * What the owner saw on the live site: the overview said "Kind of dispute (your answer): Something
 * said about you (defamation)" while "Check my case file" said "You haven't confirmed what kind of
 * claim this is", the review listed "What kind of dispute is this?" as still needed, and "Preparing
 * your Plaintiff's Claim (Form 7A)" said "A claim type has not been confirmed". All must read the
 * same value.
 *
 * WHAT FAILURE THIS CATCHES: any screen reading the kind of claim from its own copy instead of the
 * case file. Driven through the UI only, as a person would (clicks, and answers typed key by key);
 * it imports none of the case file's modules, so the same spec runs against a build of origin/main
 * (where it fails) and of the branch (where it passes).
 *
 *   1. The owner's defamation flow: Small Claims, "A case is already going" -> "I started it" ->
 *      "They have been noted in default", the defamation story, "What kind of dispute is this?"
 *      answered "Something said about you (defamation)", Confirm, "Show my next step". Then the
 *      overview, the Form 7A section (when shown), "Check my case file" (the real /api/case/review)
 *      and the review agree, on the results page and on the case page ("What we have so far" too).
 *   2. A fresh case: nothing names the kind, "I don't know yet" in the review, then the kind picked
 *      from the overview's list, the case page reloaded: the overview, "What we have so far" and
 *      "Check my case file" agree.
 *   3. Every Small Claims route draws the Form 7A section from the case file, with the overview's
 *      kind (site owner, 30 Oct: it was drawn only after the questions one at a time): the questions
 *      one at a time (1), the review alone ("Show my next step" from the chooser), and the whole form
 *      ("Fill in the form yourself"); each signed in, and the results page reloaded (a saved case
 *      reopened) wherever it shows the overview again.
 *   4. A guest: the kind given in the review is held; the review, reopened, never asks it again.
 *
 * Civil and Family show no kind of claim on the overview, the Form 7A section or "Check my case
 * file" (all three are Small Claims only); their one place ("What we have so far", from the issues
 * picked) is checked by scripts/verification/verifyClaimKindOneValue.ts.
 *
 * THE REAL SAVE PATH: a real staging user and session (realTestSession.ts via
 * authenticateRealTestUser, refuses production), the case saved to and read back from the staging
 * database by the page's own code, every /api route served by the site under test (the analysis and
 * "Check my case file" included: with no model key they run their deterministic parts). Stand-ins,
 * the only ones: the routes that would call a model (serveModelStandIns: guided-turn with each model
 * step replaced, classify-court-path, case/understand, case/read, assistant/law, classify-claim-type,
 * depth-turn), and the situation questions answered by the harness's clicks (autoAnswerSituation).
 *
 * Run: build and serve, then PLAYWRIGHT_BASE_URL=http://localhost:<port> npx playwright test
 * tests/browser/claim-kind-one-value.spec.ts, with the staging loader's environment.
 */
import { expect, test, type Page } from "@playwright/test";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { recordInitialUnknowns } from "./harness/intakeReview";
import { grantSiteAccess } from "./harness/siteAccess";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

const DEFAMATION_STORY = "My former coworker Jordan Testperson sent text messages about me to our manager and three coworkers in May 2026 saying I stole money from the till, which is false. I lost shifts and I have been anxious and unable to sleep. I issued a Small Claims claim against him on June 20, 2026 and he was served on June 23, 2026. He never filed a defence and he was noted in default. There is no order yet. I am claiming $10,000 for defamation and emotional distress. I have screenshots of the texts.";
const DEFAMATION = "Something said about you (defamation)";
const FRESH_STORY = "Synthetic: Test Decks Ltd. owes me $6,000 for a deck. I have the contract and a bank receipt.";
const NOT_CONFIRMED = /haven.t confirmed what kind of claim/i;

/** The home page to the builder, with the story typed as a person types it. */
async function startSmallClaims(page: Page, story: string) {
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel("Tell us what happened in your own words").fill(story);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
  return new URL(page.url()).searchParams.get("intake") as string;
}

/**
 * The questions one at a time, answered as a person would (typed key by key), until "What kind of
 * dispute is this?" is answered with `kind`; anything else "I don't know". Returns whether the
 * question was asked there (else it is answered in the review).
 */
async function guidedUntilKind(page: Page, kind: string): Promise<boolean> {
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 5_000 }).catch(() => false)) await send.click();
  const question = page.locator("[data-testid=guided-message][data-from=assistant]").last();
  const proposals = page.getByTestId("story-proposals");
  const finished = page.getByText("That's everything needed for now");
  for (let turn = 0; turn < 14; turn++) {
    await expect(finished.or(proposals).or(question).first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(600);
    if (await finished.isVisible().catch(() => false)) return false;
    if (await proposals.isVisible().catch(() => false)) {
      await proposals.getByRole("button").last().click();
      await expect(proposals.getByTestId("working-note")).toHaveCount(0, { timeout: 120_000 });
      continue;
    }
    const text = (await question.innerText()).replace(/\s+/g, " ");
    const asksKind = /kind of dispute/i.test(text);
    const before = await page.locator("[data-testid=guided-message]").count();
    const box = page.locator("textarea").last();
    await box.fill("");
    await box.pressSequentially(asksKind ? kind : "I don't know", { delay: 15 });
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 60_000 }).toBeGreaterThan(before + 1).catch(() => {});
    if (asksKind) return true;
  }
  return false;
}

/** The review: the kind of dispute answered here if not yet, everything else "I don't know yet", Confirm. */
/** "Stop initial questions and review" (once it is enabled), unless the review is already open. */
async function openReview(page: Page) {
  const panel = page.getByTestId("intake-review");
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) !== "reviewing") {
    const start = page.getByTestId("intake-start-review");
    await expect(start.or(panel.and(page.locator('[data-phase="reviewing"]'))).first()).toBeVisible({ timeout: 60_000 });
    if (await start.isVisible().catch(() => false)) { await expect(start).toBeEnabled({ timeout: 60_000 }); await start.click(); }
  }
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
}

async function reviewAndConfirm(page: Page, kind: string | null) {
  const panel = page.getByTestId("intake-review");
  await openReview(page);
  const kindQuestion = page.locator('[data-question="sc-orient-dispute-category"]');
  if (kind && (await kindQuestion.count())) await kindQuestion.getByRole("button", { name: kind, exact: true }).click();
  await recordInitialUnknowns(page);
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
  await page.getByRole("button", { name: "Show my next step", exact: true }).first().click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 180_000 });
}

/** "Check my case file", run as a person runs it (the real route), and its words. */
async function checkMyCaseFile(page: Page): Promise<string> {
  const card = page.getByTestId("case-review");
  await expect(card).toBeVisible({ timeout: 60_000 });
  const button = card.getByRole("button", { name: /^(Check my case file|Check again)$/ });
  await expect(button).toBeEnabled({ timeout: 60_000 });
  await button.click();
  await expect(card.getByRole("button", { name: "Check again" }).or(card.locator(".text-\\[\\#a63b3b\\]")).first()).toBeVisible({ timeout: 120_000 });
  return card.innerText();
}

/**
 * The Form 7A section beside the overview, on every Small Claims route: drawn, with the overview's
 * kind of claim, and never "has not been confirmed" (site owner, 30 Oct). Required, not "when shown".
 */
async function form7AAgrees(page: Page, words: string, where: string) {
  const form7A = page.getByTestId("statement-of-claim-surface");
  await expect(form7A, `the Form 7A section is drawn (${where})`).toHaveCount(1, { timeout: 60_000 });
  const shown = await form7A.innerText();
  expect.soft(shown, `the Form 7A section never says the kind is not confirmed (${where})`).not.toMatch(/has not been confirmed/i);
  expect.soft(shown, `the Form 7A section shows the overview's kind (${where})`).toContain(words);
}

/** The kind of claim the overview shows, by its own line. */
async function overviewKind(page: Page): Promise<{ label: string; words: string }> {
  const value = page.getByTestId("claim-kind").first();
  await expect(value).toBeVisible({ timeout: 60_000 });
  const label = (await value.locator("xpath=preceding-sibling::dt[1]").innerText()).trim();
  return { label, words: (await value.innerText()).split("\n")[0].trim() };
}

test("claim type, one value: the owner's defamation flow (Small Claims, case already going, noted in default)", async ({ page }) => {
  test.setTimeout(600_000);
  await autoAnswerSituation(page, { where: "going", started: "me", stage: "plaintiff:defendant-noted-in-default" });
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await serveModelStandIns(page, "small-claims", userId);
    const caseId = await startSmallClaims(page, DEFAMATION_STORY);
    const askedInQuestions = await guidedUntilKind(page, DEFAMATION);
    test.info().annotations.push({ type: "kind answered", description: askedInQuestions ? "in the questions one at a time" : "in the review" });
    if (askedInQuestions) {
      // The review before Confirm: the kind given in the questions is not listed as still needed.
      await openReview(page);
      await expect(page.locator('[data-question="sc-orient-dispute-category"]'), "the review does not ask the kind already given").toHaveCount(0);
    }
    await reviewAndConfirm(page, DEFAMATION);

    // The results page.
    const shown = await overviewKind(page);
    expect.soft(shown, "the overview shows the person's answer as theirs").toEqual({ label: "Kind of dispute (your answer)", words: DEFAMATION });
    await form7AAgrees(page, DEFAMATION, "questions one at a time");
    expect.soft(await checkMyCaseFile(page), "\"Check my case file\" agrees on the results page").not.toMatch(NOT_CONFIRMED);

    // The case page.
    await page.goto(`/cases/${caseId}`);
    await page.waitForLoadState("networkidle").catch(() => {});
    expect.soft(await overviewKind(page), "the case page's overview shows the same answer").toEqual({ label: "Kind of dispute (your answer)", words: DEFAMATION });
    const line = page.locator('[data-testid="case-file-line"][data-fact="claimKind"]');
    await expect(line, "\"What we have so far\" lists the kind of claim").toHaveCount(1, { timeout: 60_000 });
    expect.soft(await line.innerText(), "\"What we have so far\" shows the same words").toContain(DEFAMATION);
    expect.soft(await checkMyCaseFile(page), "\"Check my case file\" agrees on the case page").not.toMatch(NOT_CONFIRMED);

    // "Update your story": back to the questions; the review never asks the kind again.
    await page.goto(`/builder?path=small-claims&intake=${caseId}`);
    const panel = page.getByTestId("intake-review");
    await expect(panel).toBeVisible({ timeout: 60_000 });
    const view = page.getByTestId("intake-view-review");
    if (await view.isVisible().catch(() => false)) await view.click();
    expect.soft(await page.locator('[data-question="sc-orient-dispute-category"]').count(), "the review does not ask \"What kind of dispute is this?\" again").toBe(0);
  } finally {
    await deleteHarnessUser(userId);
  }
});

test("claim type, one value: a fresh case, the kind picked on the overview, the case page reloaded", async ({ page }) => {
  test.setTimeout(600_000);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await serveModelStandIns(page, "small-claims", userId);
    const caseId = await startSmallClaims(page, FRESH_STORY);
    await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
    const send = page.getByTestId("guided-send-saved-story");
    if (await send.isVisible({ timeout: 5_000 }).catch(() => false)) await send.click();
    const question = page.locator("[data-testid=guided-message][data-from=assistant]").last();
    const proposals = page.getByTestId("story-proposals");
    await expect(proposals.or(question).first()).toBeVisible({ timeout: 60_000 });
    if (await proposals.isVisible().catch(() => false)) await proposals.getByRole("button").last().click();
    await expect(page.locator("textarea").last()).toBeVisible({ timeout: 60_000 });
    // Nothing names the kind: "I don't know yet" for it in the review, with everything else.
    await reviewAndConfirm(page, null);

    // The overview asks it (folded after "not sure"): picked from its list, as a person picks.
    await page.goto(`/cases/${caseId}`);
    await page.waitForLoadState("networkidle").catch(() => {});
    const choose = page.getByTestId("claim-kind-choose");
    if (await choose.isVisible({ timeout: 30_000 }).catch(() => false)) await choose.click();
    const select = page.getByTestId("claim-kind-select");
    await expect(select).toBeVisible({ timeout: 60_000 });
    const picked = (await select.locator("option").nth(1).innerText()).trim();
    await select.selectOption({ label: picked });
    await page.getByTestId("claim-kind-use").click();
    await expect(page.getByTestId("claim-kind-select")).toHaveCount(0, { timeout: 60_000 });

    // Reloaded: every place reads the pick from the saved case.
    await page.reload();
    await page.waitForLoadState("networkidle").catch(() => {});
    expect.soft(await overviewKind(page), "the overview shows the kind picked, as the person's").toEqual({ label: "Kind of claim you chose", words: picked });
    const line = page.locator('[data-testid="case-file-line"][data-fact="claimKind"]');
    await expect(line, "\"What we have so far\" lists the kind of claim").toHaveCount(1, { timeout: 60_000 });
    expect.soft(await line.innerText(), "\"What we have so far\" shows the same words").toContain(picked);
    expect.soft(await checkMyCaseFile(page), "\"Check my case file\" agrees").not.toMatch(NOT_CONFIRMED);
  } finally {
    await deleteHarnessUser(userId);
  }
});

/**
 * Every other Small Claims route to the results page: the review alone ("Show my next step" from the
 * chooser, which opens the form and runs it) and the whole form ("Fill in the form yourself"). The kind
 * is given in the review, as a person gives it. The overview, the Form 7A section and "Check my case
 * file" agree; reloaded, the page (if it shows the overview again) still agrees.
 */
for (const route of ["review", "form"] as const) {
  test(`claim type, one value: the Form 7A section on the ${route === "review" ? "review alone (Show my next step)" : "whole form"} route, signed in`, async ({ page }) => {
    test.setTimeout(600_000);
    await autoAnswerSituation(page, { where: "going", started: "me", stage: "plaintiff:defendant-noted-in-default" });
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await serveModelStandIns(page, "small-claims", userId);
      await startSmallClaims(page, DEFAMATION_STORY);
      if (route === "form") {
        await page.getByRole("button", { name: "Fill in the form yourself" }).click();
        const box = page.getByLabel("Case story", { exact: true });
        if ((await box.count()) && !(await box.inputValue()).trim()) await box.fill(DEFAMATION_STORY);
        const save = page.locator('[data-testid$="story-save"]:visible').first();
        if ((await save.count()) && (await save.isEnabled())) await save.click();
      }
      await reviewAndConfirm(page, DEFAMATION);
      const shown = await overviewKind(page);
      expect.soft(shown, "the overview shows the person's answer as theirs").toEqual({ label: "Kind of dispute (your answer)", words: DEFAMATION });
      await form7AAgrees(page, shown.words, route);
      expect.soft(await checkMyCaseFile(page), "\"Check my case file\" agrees").not.toMatch(NOT_CONFIRMED);

      // Reloaded: the saved case reopened. Wherever the overview is drawn again, the Form 7A section is too, with the same kind.
      await page.reload();
      await page.waitForLoadState("networkidle").catch(() => {});
      const overviewAgain = await page.getByTestId("claim-kind").first().isVisible({ timeout: 60_000 }).catch(() => false);
      test.info().annotations.push({ type: "reloaded", description: overviewAgain ? "overview shown again" : "overview not shown on reload" });
      if (overviewAgain) await form7AAgrees(page, (await overviewKind(page)).words, `${route}, reloaded`);
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}

/** A guest (no account): the kind given in the review is held, and the review reopened never asks it again. */
test("claim type, one value: a guest gives the kind in the review; it is never asked again", async ({ page }) => {
  test.setTimeout(300_000);
  await autoAnswerSituation(page, { where: "going", started: "me", stage: "plaintiff:defendant-noted-in-default" });
  await grantSiteAccess(page);
  await serveModelStandIns(page, "small-claims");
  await startSmallClaims(page, DEFAMATION_STORY);
  await openReview(page);
  const kindQuestion = page.locator('[data-question="sc-orient-dispute-category"]');
  await expect(kindQuestion, "the review asks the kind once (nothing has given it)").toHaveCount(1, { timeout: 60_000 });
  await kindQuestion.getByRole("button", { name: DEFAMATION, exact: true }).click();
  await recordInitialUnknowns(page);
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  const panel = page.getByTestId("intake-review");
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
  await page.getByTestId("intake-view-review").click();
  expect.soft(await page.locator('[data-question="sc-orient-dispute-category"]').count(), "the review does not ask \"What kind of dispute is this?\" again").toBe(0);
  await page.reload();
  await expect(panel).toBeVisible({ timeout: 60_000 });
  const view = page.getByTestId("intake-view-review");
  if (await view.isVisible().catch(() => false)) await view.click();
  expect.soft(await page.locator('[data-question="sc-orient-dispute-category"]').count(), "reloaded, the review still does not ask it").toBe(0);
});
