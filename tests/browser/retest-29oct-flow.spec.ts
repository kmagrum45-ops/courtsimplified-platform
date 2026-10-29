/**
 * Chrome re-test, 29 Oct, item D1: "Continue to your next steps" showed a red line and
 * sent the person back to "Review your initial case information", after PR #499 (the
 * jsonb key-order bounce) was already live.
 *
 * WHAT FAILURE THIS CATCHES: a confirmation silently cancelled by an answer that adds a
 * fact and changes none. The person stopped the questions early ("Stop initial
 * questions and review"), confirmed, then answered one more question. The server's
 * rule (intakeReview.ts existingFactChanged, used by intakeCheckpoint.ts) does not
 * count a first value as a change; the browser (IntakeRecovery.tsx put) counted any
 * difference, so the tick disappeared and the next Continue bounced.
 *
 * Run on each of the four routes whose Continue leads to the next step after Confirm
 * (IntakeRecovery.tsx ContinueKey; "choose" only opens the form, so it is the form's):
 * the Small Claims questions one at a time ("guided", app/builder/page.tsx), the Small
 * Claims form ("form", SmallClaimsIntake.tsx), civil ("civil", CivilIntake.tsx) and
 * Family ("family", FamilyIntake.tsx).
 *
 * Wanted property: an answer that only ADDS a fact keeps the confirmation, and the
 * next step loads. The other half of the rule (a CHANGED answer still cancels the
 * confirmation) is asserted for free by scripts/verification/verifyConfirmationRule.ts,
 * and in the browser by the changed-answer test here.
 *
 * Fixed by the one rule (intakeReview.ts renewsInputRevision, applied by the browser
 * store through applyFactRevisions). What was actually shown, 29 Oct: this spec run
 * against a build of origin/main 95f1b7ba (before the fix) failed all four routes on
 * "an added answer keeps the confirmation" (the changed-answer test passed there, as
 * main cancels on any change); against the fixed build all pass. The four routes are
 * no longer listed in harness/knownProblems29oct-flow.ts, so they must pass.
 *
 * The last test (next steps made before an added answer are offered for updating) is
 * the D1 review's guidance property: run against the D1 commit without it (6a25ae37)
 * it failed, and it passes with intakeReview.ts factsRevision / guidanceNeedsUpdate.
 *
 * Served by this commit's own code (harness/thisCommitServer.ts): no AI, no database.
 * Run: npx playwright test tests/browser/retest-29oct-flow.spec.ts (against a build
 * served on PLAYWRIGHT_BASE_URL, with SITE_ACCESS_PASSWORD in the environment).
 */
import { expect, test, type Page } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveFromThisCommit } from "./harness/thisCommitServer";
import { isKnownProblem } from "./harness/knownProblems29oct-flow";
import { openBuilder } from "./harness/builderGate";
import { recordInitialUnknowns, saveCaseStory } from "./harness/intakeReview";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

const STORY = "I hired Test Decks Ltd. in March 2026 to build a deck for $8,000. I paid $2,000 and $6,000 is still owed. I have the contract, text messages and a bank receipt.";
const CIVIL_STORY = "Synthetic: I hired Test Builder Ltd. in March 2026 to build an addition for $180,000. They took $90,000 and abandoned the job in June 2026.";
const FAMILY_STORY = "Synthetic: my former partner and I separated in March 2026 and we disagree about parenting time for our daughter.";

/** Each route's name, as listed in harness/knownProblems29oct-flow.ts while it fails. */
const NAMES = {
  guided: "retest-29oct D1: confirmed early, one more answer, Continue goes to the next step -- small-claims (sc-deck-owed)",
  form: "retest-29oct D1: confirmed, one more answer on the form, Continue goes to the next step -- small-claims form (sc-deck-owed)",
  civil: "retest-29oct D1: confirmed early, one more answer, Continue goes to the next step -- civil (civil-addition)",
  family: "retest-29oct D1: confirmed early, one more answer, Continue goes to the next step -- family (family-parenting)",
} as const;
type Route = keyof typeof NAMES;

async function confirmHere(page: Page) {
  const panel = page.getByTestId("intake-review");
  if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  const q = (id: string) => page.locator(`[data-question="${id}"]`);
  const kind = q("sc-orient-dispute-category").getByRole("button").first();
  if (await kind.count()) await kind.click();
  if (await q("sc-claim-filed").count()) await q("sc-claim-filed").getByRole("button", { name: "No", exact: true }).click();
  const use = q("sc-amount-claimed").getByRole("button", { name: /^Use “.*” \(from your story\)$/ });
  if (await use.count()) await use.first().click();
  await recordInitialUnknowns(page);
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
}

/** The Small Claims questions one at a time: stop early, confirm, answer one more in the chat. */
async function smallClaimsGuided(page: Page) {
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Kingston");
  await page.getByLabel("Tell us what happened in your own words").fill(STORY);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 5_000 }).catch(() => false)) await send.click();

  // The chat's first question (any "Here's what I understood" card accepted as offered).
  const question = page.locator("[data-testid=guided-message][data-from=assistant]").last();
  const proposals = page.getByTestId("story-proposals");
  await expect(proposals.or(question).first()).toBeVisible({ timeout: 60_000 });
  if (await proposals.isVisible().catch(() => false)) await proposals.getByRole("button").last().click();
  await expect(page.locator("textarea").last()).toBeVisible({ timeout: 60_000 });

  await confirmHere(page);

  // One more answer in the chat: a fact added, nothing changed.
  const before = await page.locator("[data-testid=guided-message]").count();
  const box = page.locator("textarea").last();
  await expect(box, "the chat is still open for one more answer").toBeVisible();
  await box.fill("I have the signed contract and the bank receipt.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 60_000 }).toBeGreaterThan(before + 1);
}

/** The Small Claims form, with the amount answered, confirmed. */
async function confirmedForm(page: Page) {
  await openBuilder(page, "small-claims", { city: "Kingston" });
  await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  await page.getByLabel("Case story", { exact: true }).fill(STORY);
  await saveCaseStory(page);
  await page.getByTestId("sc-intake-amountClaimed").fill("$6,000");
  await page.getByTestId("sc-intake-amountClaimed").blur();
  await confirmHere(page);
}

/** The Small Claims form: confirm, then fill a box that was empty (a first value). */
async function smallClaimsForm(page: Page) {
  await confirmedForm(page);
  const box = page.getByTestId("sc-intake-timeline");
  await expect(box, "the box answered after Confirm was empty: this adds a fact, it changes none").toHaveValue("");
  await box.fill("March 2026: hired them. April 2026: paid $2,000. May 2026: deck finished, $6,000 not paid.");
  await box.blur();
}

/** Civil or Family questions one at a time: stop early, confirm, answer the next question. */
async function guidedForm(page: Page, court: "civil" | "family") {
  await openBuilder(page, court, { city: "Kingston", story: court === "civil" ? CIVIL_STORY : FAMILY_STORY });
  const question = page.getByTestId("guided-form-question");
  await expect(question).toBeVisible({ timeout: 60_000 });
  await confirmHere(page);

  // One more answer to the question on screen: whatever it asks, a first answer to it.
  await expect(question, "a question is still open to answer after Confirm").toBeVisible({ timeout: 30_000 });
  const key = await question.getAttribute("data-key");
  const textbox = question.getByRole("textbox");
  // The question may offer what the story says ("Is that right?"): "Yes, that's right" is the answer.
  const fromStory = page.getByTestId("guided-form-from-story-yes");
  if (await fromStory.isVisible().catch(() => false)) await fromStory.click();
  else {
    if (await textbox.count()) {
      await expect(textbox.first(), `the "${key}" answer was empty: this adds a fact`).toHaveValue("");
      await textbox.first().fill(court === "civil" ? "Synthetic: Test Builder Ltd., a contractor in Kingston." : "Synthetic: one daughter, age 6.");
    } else await question.locator("[data-testid^=guided-option-], [data-testid^=guided-check-]").first().click();
    const next = question.getByTestId("guided-form-next");
    if (await next.count()) await next.click();
  }
  await expect(page.getByTestId("guided-form-question").and(page.locator(`[data-key="${key}"]`)), "the answer was taken").toHaveCount(0, { timeout: 30_000 });
}

const ROUTES: Record<Route, { court: "small-claims" | "civil" | "family"; run: (page: Page) => Promise<void> }> = {
  guided: { court: "small-claims", run: smallClaimsGuided },
  form: { court: "small-claims", run: smallClaimsForm },
  civil: { court: "civil", run: (page) => guidedForm(page, "civil") },
  family: { court: "family", run: (page) => guidedForm(page, "family") },
};

for (const route of Object.keys(NAMES) as Route[]) {
  const name = NAMES[route];
  test(name, async ({ page }) => {
    // SHOW_KNOWN=1 runs it as a plain test, to see the failing line.
    test.fail(isKnownProblem(name) && !process.env.SHOW_KNOWN, "known problem D1 (harness/knownProblems29oct-flow.ts)");
    test.setTimeout(480_000);
    await grantSiteAccess(page);
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, ROUTES[route].court, account.rows as unknown as Map<string, Record<string, unknown>>);

    await ROUTES[route].run(page);
    await page.waitForTimeout(3_000);

    // The wanted property: still confirmed, and the next step loads with no "needs confirming" line.
    const panel = page.getByTestId("intake-review");
    await expect(panel, "an added answer keeps the confirmation").toHaveAttribute("data-phase", "user-confirmed", { timeout: 10_000 });
    await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
    await expect(page.getByText(/needs confirming before your next steps|is not confirmed yet/), "no red line sending the person back").toHaveCount(0);
    await expect(page.getByTestId("completed-case-overview"), "the next step loads").toBeVisible({ timeout: 120_000 });
  });
}

/*
 * The other half of the one rule, in the browser: an answer the person already had,
 * CHANGED after Confirm, still cancels the confirmation (the Small Claims form's
 * amount, given before Confirm and changed after it).
 */
test("retest-29oct D1: a changed answer after Confirm still cancels the confirmation -- small-claims form", async ({ page }) => {
  test.setTimeout(300_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  await confirmedForm(page);
  const panel = page.getByTestId("intake-review");
  // The amount given before Confirm, changed after it.
  const box = page.getByTestId("sc-intake-amountClaimed");
  await expect(box).toHaveValue("$6,000");
  await box.fill("$7,500");
  await box.blur();
  await expect(panel, "a changed answer cancels the confirmation").not.toHaveAttribute("data-phase", "user-confirmed", { timeout: 20_000 });
});

/*
 * D1 review (29 Oct): the confirmation stands after an added answer, but next steps made
 * before it do not. Next steps made, then one more answer on the form: the case page says
 * the next steps were made before the latest answer and offers to update them (never
 * "review again"); Continue makes them again, and the case page shows them.
 */
test("retest-29oct D1: next steps made before an added answer are offered for updating, not shown as current -- small-claims form", async ({ page }) => {
  test.setTimeout(480_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  await confirmedForm(page);
  const next = page.getByRole("button", { name: "Continue to your next steps", exact: true }).first();
  await next.click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 120_000 });
  const row = [...account.rows.values()][0];
  const caseId = String(row.id);

  // One more answer, on the form: a fact added.
  await page.goto(`/builder?path=small-claims&caseId=${caseId}&step=form`);
  const panel = page.getByTestId("intake-review");
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 60_000 });
  const box = page.getByTestId("sc-intake-timeline");
  await expect(box).toHaveValue("");
  await box.fill("March 2026: hired them. May 2026: deck finished, $6,000 not paid.");
  await box.blur();
  await expect.poll(() => JSON.stringify((row.master_result as Record<string, unknown>).intakeCheckpoint), { timeout: 30_000 }).toContain("deck finished");

  // The case page: the confirmation stands; the next steps are offered for updating.
  await page.goto(`/cases/${caseId}`);
  await expect(page.getByTestId("case-guidance-outdated"), "next steps made before the latest answer are not shown as current").toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Review your initial information before receiving case guidance"), "never sent back to the review").toHaveCount(0);
  await page.getByTestId("case-update-next-steps").click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 60_000 });
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByTestId("completed-case-overview"), "the next steps are made again").toBeVisible({ timeout: 120_000 });
  await page.goto(`/cases/${caseId}`);
  await expect(page.getByTestId("case-guidance-outdated")).toHaveCount(0, { timeout: 60_000 });
});

/*
 * The owner's Chrome test of #501's preview (29 Oct, second round), findings 5 and 7. Same
 * story, same served code; each asserts the WANTED property and is listed in
 * harness/knownProblems29oct-flow.ts until fixed (test.fail).
 */
async function reachNextStep(page: import("@playwright/test").Page) {
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Ottawa");
  await page.getByLabel("Tell us what happened in your own words").fill(STORY);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 5_000 }).catch(() => false)) await send.click();
  const question = page.locator("[data-testid=guided-message][data-from=assistant]").last();
  const proposals = page.getByTestId("story-proposals");
  await expect(proposals.or(question).first()).toBeVisible({ timeout: 60_000 });
  if (await proposals.isVisible().catch(() => false)) await proposals.getByRole("button").last().click();
  await expect(page.locator("textarea").last()).toBeVisible({ timeout: 60_000 });
  await page.getByTestId("intake-start-review").click();
  const panel = page.getByTestId("intake-review");
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  const q = (id: string) => page.locator(`[data-question="${id}"]`);
  const kind = q("sc-orient-dispute-category").getByRole("button").first();
  if (await kind.count()) await kind.click();
  if (await q("sc-claim-filed").count()) await q("sc-claim-filed").getByRole("button", { name: "No", exact: true }).click();
  const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
  while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1, { timeout: 20_000 }); }
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 120_000 });
  return account;
}

// Finding 5: "Update your story", nothing changed, "Show my next step" waited ~2 minutes again: the
// guided continue handler (app/builder/page.tsx, useContinueHandler("guided")) always runs the analysis.
const NAME_5 = "OWNER-5: back to the questions with nothing changed, the next step shows without a new analysis -- small-claims";
test(NAME_5, async ({ page }) => {
  test.fail(isKnownProblem(NAME_5) && !process.env.SHOW_KNOWN, "known problem OWNER-5 (harness/knownProblems29oct-flow.ts)");
  test.setTimeout(480_000);
  const account = await reachNextStep(page);
  const row = [...account.rows.values()][0] as Record<string, unknown>;
  await page.goto(`/cases/${row.id}`);
  await page.getByRole("link", { name: "Update your story" }).click();
  const show = page.getByTestId("intake-continue-guidance");
  await expect(show).toBeVisible({ timeout: 60_000 });
  let analyses = 0;
  page.on("request", (request) => { if (/\/api\/small-claims\/analyze/.test(request.url())) analyses += 1; });
  await show.click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 120_000 });
  expect(analyses, "the saved next step is shown again; nothing changed, so nothing is analysed again").toBe(0);
});

// Finding 7: at phone width the chat's Ask button wrapped one letter per line (body overflow-wrap:
// anywhere, app/globals.css; the button can shrink in its flex row, CourtAssistantChat.tsx).
const NAME_7 = "OWNER-7: at 375 px the chat's Ask button keeps its word on one line -- small-claims";
test(NAME_7, async ({ page }) => {
  test.fail(isKnownProblem(NAME_7) && !process.env.SHOW_KNOWN, "known problem OWNER-7 (harness/knownProblems29oct-flow.ts)");
  test.setTimeout(480_000);
  await reachNextStep(page);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.getByRole("button", { name: "Ask follow-up questions" }).click();
  await page.getByPlaceholder("Ask about an important date, document, or case detail.").fill("What should I gather first?");
  const ask = page.getByRole("button", { name: "Ask", exact: true });
  await expect(ask).toBeVisible({ timeout: 30_000 });
  // The text's line boxes: one distinct top per line.
  const lines = await ask.evaluate((button) => {
    const range = document.createRange();
    range.selectNodeContents(button);
    return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
  });
  expect(lines, "\"Ask\" is on one line").toBe(1);
});
