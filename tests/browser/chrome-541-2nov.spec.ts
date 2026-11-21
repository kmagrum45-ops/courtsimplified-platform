/**
 * THE FOUNDER'S CHROME CHECK OF #541 AT 354e36fb (2 Nov): THE FAILED STEPS 1 AND 3, AND THE LEAK.
 *
 *   1. "I do not know yet" typed into a chat box is never saved as the answer: Small Claims (the chat's goal
 *      question, sc-remedy-sought), civil and Family (the chat's "What do you want the court to order?" /
 *      urgent questions, typed rather than skipped). The overview, the case file page and the saved
 *      analysis input (master_result.intakeData) never show the phrase as the answer; the review shows the
 *      quiet "Not answered yet" line. One reader decides (caseFile/unsureAnswer.ts isUnsureAnswer).
 *   3. A value typed into an open "Change" box and never saved with "Save" is not lost when the person
 *      presses a Confirm control straight away: "Confirm my initial information" saves it first (the
 *      founder typed 5200 and pressed Confirm; the case kept $4,500). Every Confirm control flushes through
 *      one shared path (app/_components/openEdits.ts flushOpenEdits); its terminal twin,
 *      test:confirm-flushes, lists them all.
 *   4. After the story is rewritten, the review's "Other answers given for an earlier version of your story"
 *      shows no internal code ("sc-orient-role", "sc-claim-...") and never "[object Object]".
 *
 * Stand-ins only: fakeAccount (the case rows kept in the page's own store, no staging) and
 * serveFromThisCommit (this commit's routes, every model step replaced).
 *
 * WHAT FAILURE THIS CATCHES: "I do not know yet" shown as what the person wants; an amount typed and
 * confirmed but lost; a question id or "[object Object]" on the review.
 */
import { expect, test, type Page } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { openBuilder } from "./harness/builderGate";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveFromThisCommit, type Court } from "./harness/thisCommitServer";
import { expectNoInternalCodes } from "./harness/noInternalCodes";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { caseFileOf } from "../../src/lib/case-system/caseFile/caseFile";
import { chooseOffers } from "./harness/offers";
import { tickIfAsked } from "./harness/intakeReview";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const PHRASE = "I do not know yet";
const SC_STORY = "Synthetic story: I painted Sam Tester's house in Ottawa. I finished the job on March 20, 2026 and sent an invoice for $3,000. Sam has not paid anything.";
type Rows = Map<string, Record<string, unknown>>;
const rowOf = (rows: Rows) => [...rows.values()][0] as { id?: string; master_result?: Record<string, unknown> } | undefined;

async function smallClaimsStart(page: Page, rows: Rows) {
  await serveFromThisCommit(page, "small-claims", rows);
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Ottawa");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(SC_STORY);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByRole("button", { name: /Answer questions one at a time/ })).first()).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
}

/** The Small Claims chat: `goal` typed to sc-remedy-sought, a plain answer to everything else. */
async function smallClaimsChat(page: Page, goal: string, amount = "$3,000"): Promise<boolean> {
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 5_000 }).catch(() => false)) await send.click();
  let last = "";
  let askedGoal = false;
  for (let i = 0; i < 25; i++) {
    const finished = page.getByText("That's everything needed for now");
    const proposals = page.getByTestId("story-proposals");
    const message = page.locator("[data-testid=guided-message][data-from=assistant]").last();
    await expect(finished.or(proposals).or(message).first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(600);
    if (await finished.isVisible().catch(() => false)) break;
    if (await proposals.isVisible().catch(() => false)) { await chooseOffers(proposals, "no"); await proposals.getByTestId("story-proposals-continue").click(); await expect(proposals.getByTestId("working-note")).toHaveCount(0, { timeout: 120_000 }); continue; }
    const text = (await message.innerText()).replace(/\s+/g, " ");
    if (text === last) break;
    last = text;
    const id = await page.locator("[data-testid=guided-message][data-question-id]").last().getAttribute("data-question-id");
    if (id === "sc-remedy-sought") askedGoal = true;
    const answer = id === "sc-remedy-sought" ? goal
      : /add the year/i.test(text) ? "March 20, 2026"
      : /how much|amount/i.test(text) ? amount
      : /\bwho\b|name of the/i.test(text) ? "Sam Tester"
      : /when|date/i.test(text) ? "March 20, 2026"
      : /bringing this claim|responding to a claim/i.test(text) ? "Bringing the claim (plaintiff)"
      : /kind of dispute/i.test(text) ? "Unpaid money owed to me"
      : /filed|served/i.test(text) ? "No"
      : "Synthetic: the invoice and texts";
    const before = await page.locator("[data-testid=guided-message]").count();
    await page.locator("textarea").last().fill(answer);
    // The Send button moves while the chat draws its reply: pressed once it has stopped.
    await page.getByRole("button", { name: "Send", exact: true }).click({ timeout: 60_000 });
    await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 60_000 }).toBeGreaterThan(before + 1).catch(() => {});
  }
  return askedGoal;
}

async function toReview(page: Page) {
  const panel = page.getByTestId("intake-review");
  await expect(panel).toBeVisible({ timeout: 60_000 });
  // "Done" in the questions opens the review by itself; only when it did not, "Stop initial questions and review".
  if (await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 10_000 }).then(() => true).catch(() => false)) return;
  const phase = await panel.getAttribute("data-phase");
  if (phase === "collecting") await page.getByTestId("intake-start-review").click();
  // A confirmed review opened again to look or correct: its entries show, the phase stays confirmed until a change.
  if (phase === "user-confirmed") { await page.getByTestId("intake-view-review").click(); await expect(panel.locator("[data-testid=intake-entry]").first()).toBeVisible({ timeout: 60_000 }); return; }
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
}

/** Every remaining question "I do not know yet", the acknowledgement, Confirm. */
async function confirmReview(page: Page) {
  const panel = page.getByTestId("intake-review");
  const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
  while (await unknowns.count()) { const left = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(left - 1, { timeout: 20_000 }); }
  await tickIfAsked(page);
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
}

async function nextStep(page: Page) {
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  const notice = page.getByTestId("acknowledgement-checkbox");
  if (await notice.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await notice.check();
    await page.getByTestId("acknowledgement-continue").click();
    if (!(await page.getByTestId("completed-case-overview").isVisible({ timeout: 20_000 }).catch(() => false))) await page.locator("button:visible").filter({ hasText: /^(Continue to your next steps|Show my next step)$/ }).first().click({ timeout: 10_000 }).catch(() => {});
  }
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 180_000 });
  await page.waitForTimeout(2_000);
}

/** The phrase is nowhere shown as the answer: the overview, the case file page, the saved analysis input. */
async function expectPhraseNotSaved(page: Page, rows: Rows, where: string) {
  await expect(page.getByTestId("completed-case-overview"), `${where}: the overview never shows "${PHRASE}" as an answer`).not.toContainText(PHRASE);
  const row = rowOf(rows);
  const intake = (row?.master_result?.intakeData ?? {}) as Record<string, unknown>;
  const saved = Object.entries(intake).filter(([, value]) => typeof value === "string" && value.trim().toLowerCase() === PHRASE.toLowerCase()).map(([key]) => key);
  expect(saved, `${where}: no field of the saved analysis input holds "${PHRASE}"`).toEqual([]);
  await page.goto(`/cases/${row?.id}/case-file`);
  await expect(page.getByTestId("case-file")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId("case-file"), `${where}: the case file page never shows "${PHRASE}" as an answer`).not.toContainText(PHRASE);
}

test(`1. Small Claims chat: "${PHRASE}" typed to the goal question is never saved as the answer`, async ({ page }) => {
  test.setTimeout(400_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  const rows = account.rows as unknown as Rows;
  await smallClaimsStart(page, rows);
  expect(await smallClaimsChat(page, PHRASE), "the chat asked the goal question").toBe(true);
  await toReview(page);
  await expect(page.locator('[data-testid=not-answered-yet][data-fact="wants"]').first(), "the review shows the quiet line for the goal").toBeVisible({ timeout: 30_000 });
  await confirmReview(page);
  await nextStep(page);
  await expectPhraseNotSaved(page, rows, "small-claims chat");
});

/** Civil and Family chat: every text question about the goal or anything urgent answered by typing the phrase. */
for (const court of ["civil", "family"] as const satisfies readonly Court[]) {
  test(`1. ${court} chat: "${PHRASE}" typed (not skipped) is never saved as the answer`, async ({ page }) => {
    test.setTimeout(400_000);
    const account = await fakeAccount(page);
    const rows = account.rows as unknown as Rows;
    await serveFromThisCommit(page, court, rows);
    const story = court === "civil"
      ? "Synthetic: I hired Test Builders Inc. in March 2026 to build an addition for $80,000. They abandoned the job in June 2026."
      : "Synthetic: Alex Sample and I separated in January 2026. Our child Jordan is 7. I want a regular parenting time schedule.";
    await openBuilder(page, court, { city: "Ottawa", story });
    let typed = 0;
    for (let i = 0; i < 30; i++) {
      const question = page.getByTestId("guided-form-question");
      if (!(await question.isVisible({ timeout: 5_000 }).catch(() => false))) break;
      const key = (await question.getAttribute("data-key")) ?? "";
      const box = question.getByRole("textbox");
      if (/goal|remedy|urgent/i.test(key) && (await box.count())) { await box.first().fill(PHRASE); await question.getByTestId("guided-form-next").click(); typed += 1; continue; }
      const yes = question.getByTestId("guided-form-from-story-yes");
      if (await yes.isVisible().catch(() => false)) { await yes.click(); continue; }
      const option = question.locator("[data-testid^=guided-option-]").first();
      if (await option.count()) { await option.click(); continue; }
      const check = question.locator("[data-testid^=guided-check-]").first();
      if (await check.count()) { await check.check(); await question.getByTestId("guided-form-next").click(); continue; }
      await question.getByTestId("guided-form-skip").click();
    }
    expect(typed, "the chat asked at least one goal or urgent question and the phrase was typed").toBeGreaterThan(0);
    const done = page.getByTestId("guided-form-done");
    if (await done.isVisible().catch(() => false)) await done.click();
    await toReview(page);
    await confirmReview(page);
    await nextStep(page);
    await expectPhraseNotSaved(page, rows, `${court} chat`);
  });
}

/** The saved case's amount, read through the case file (what every screen reads). */
const savedAmount = (rows: Rows) => { const master = rowOf(rows)?.master_result as { intakeCheckpoint?: never } | undefined; return String(caseFileOf(master?.intakeCheckpoint ?? null, master).amount.value ?? ""); };

test("3a. Small Claims: 5200 typed into the open Change box (\"Add it\" on the amount), then \"Confirm my initial information\" straight away: 5200 is kept", async ({ page }) => {
  test.setTimeout(400_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  const rows = account.rows as unknown as Rows;
  await smallClaimsStart(page, rows);
  // The amount said "not sure" in the chat: the review offers it through the one Change box ("Add it").
  await smallClaimsChat(page, "Payment of the money owed", "I don't know");
  await toReview(page);
  await confirmReview(page);
  await nextStep(page);
  await page.goto(`/builder?path=small-claims&intake=${rowOf(rows)?.id ?? ""}&step=guided`);
  await toReview(page);
  const panel = page.getByTestId("intake-review");
  const change = panel.locator('[data-testid=change-answer][data-fact="amount"]').first();
  // The founder's order: a first change saved with "Save" ($4,500), which brings Confirm back; then the box
  // opened again, 5200 typed, and Confirm pressed straight away.
  await change.getByTestId("change-answer-open").click();
  await change.getByTestId("change-answer-text").fill("4500");
  await change.getByTestId("change-answer-save").click();
  await expect.poll(() => savedAmount(rows), { timeout: 30_000, message: "the $4,500 change is saved" }).toMatch(/^4,?500/);
  await expect(page.getByTestId("intake-confirm")).toBeVisible({ timeout: 30_000 });
  const again = panel.locator('[data-testid=change-answer][data-fact="amount"]').first();
  await again.getByTestId("change-answer-open").click();
  await again.getByTestId("change-answer-text").pressSequentially("5200", { delay: 20 });
  const ack = page.getByTestId("intake-review-acknowledgement");
  if (await ack.isVisible().catch(() => false) && !(await ack.isChecked())) await ack.check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
  await expect.poll(() => savedAmount(rows), { timeout: 30_000, message: "the saved case holds 5200, typed before Confirm" }).toMatch(/^5,?200/);
  await page.reload();
  await toReview(page);
  await expect(panel, "the review shows $5,200 after a reload").toContainText(/5,200/);
});

test("3b. Small Claims: the review's own amount box changed first, then 5200 typed in its Change box, then \"Confirm my initial information\" straight away: $5,200 is kept", async ({ page }) => {
  test.setTimeout(400_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  const rows = account.rows as unknown as Rows;
  await smallClaimsStart(page, rows);
  await smallClaimsChat(page, "Payment of the money owed");
  await toReview(page);
  await confirmReview(page);
  await nextStep(page);
  await page.goto(`/builder?path=small-claims&intake=${rowOf(rows)?.id ?? ""}&step=guided`);
  await toReview(page);
  const panel = page.getByTestId("intake-review");
  const box = panel.getByRole("textbox", { name: "Review: What is the total dollar amount you are claiming?", exact: true });
  // The founder's order: a first change ($4,500, the box left), which brings Confirm back; then $5,200 typed and
  // Confirm pressed straight away.
  await box.fill("$4,500");
  await box.blur();
  await expect(page.getByTestId("intake-confirm")).toBeVisible({ timeout: 30_000 });
  // A saved answer to the amount now shows as its line with "Change" (the one Change box): opened, $5,200 typed.
  const change = panel.locator('[data-testid=change-answer][data-fact="amount"]').first();
  await change.getByTestId("change-answer-open").click();
  await change.getByTestId("change-answer-text").pressSequentially("5200", { delay: 20 });
  const ack = page.getByTestId("intake-review-acknowledgement");
  if (await ack.isVisible().catch(() => false) && !(await ack.isChecked())) await ack.check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
  await expect.poll(() => savedAmount(rows), { timeout: 30_000, message: "the saved case holds $5,200, typed before Confirm" }).toMatch(/^5,?200/);
});

test("4. Small Claims: after the story is rewritten, the earlier answers are listed in words: no internal code, no [object Object]", async ({ page }) => {
  test.setTimeout(400_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  const rows = account.rows as unknown as Rows;
  await smallClaimsStart(page, rows);
  await smallClaimsChat(page, "Payment of the money owed");
  await toReview(page);
  await confirmReview(page);
  const panel = page.getByTestId("intake-review");
  await page.getByTestId("intake-view-review").click();
  await panel.getByRole("textbox", { name: "Review: Your story", exact: true }).fill("Synthetic story: I painted Sam Tester's fence in Ottawa in April 2026 and sent an invoice for $3,800. Sam has not paid.");
  await panel.getByTestId("review-story-save").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  await expect(panel.getByTestId("intake-hidden-stale"), "the earlier answers are listed").toBeVisible({ timeout: 30_000 });
  await expectNoInternalCodes(page, "review after the story was rewritten");
});
