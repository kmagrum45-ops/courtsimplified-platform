/**
 * AFTER "START THE QUESTIONS AGAIN": NOTHING ASKED TWICE, NOTHING HELD THAT NO SCREEN SHOWS; A GUEST'S
 * "SHOW MY NEXT STEP" SAYS WHY IT CANNOT GO ON (Chrome check of #542 at 6e56e44b, 3 Nov: A2, A3, B1).
 *
 * What it checks, Small Claims, questions one at a time (the story card offers only the kind, as the real
 * reading did for Chrome once the amount was held):
 *   A2  the kind used on the suggestion card before a restart is kept: after it the card is not offered again (site
 *       owner, 6 Nov; it used to be offered and used again, "Got it: Personal loan ..."), "What kind of dispute is
 *       this?" is never asked, and the kind on the review stays the one used. Cause: the chat's next
 *       turn after "Use the suggestion" sent the case file from the render before the kind was saved
 *       (GuidedSmallClaimsIntake.tsx sendTurn, caseFile: reviewView.checkpoint), so the kind was not held. Shown
 *       with "When it happened" answered "I do not know yet" (kept across the restart), so the kind is the next
 *       question the engine would pick.
 *   A3  "When it happened" answered in the chat, "Show my next step", a sentence added to the story and the
 *       questions started again: the answer is either still shown (the review or the case page) or asked again.
 *       Cause: the restart empties the chat's answers in the case record, but the case file still held the copy
 *       saved with the last analysis (caseFile.ts, master_result.intakeAnswers), so the chat did not ask it and
 *       no screen showed it.
 *   B1  a guest presses the review's "Show my next step": the sign-in message shows under that button (in view),
 *       not only at the foot of the form.
 *
 * WHAT FAILURE THIS CATCHES: a fact asked again right after it was confirmed; a fact the chat treats as answered
 * that no screen shows; a button that does nothing visible.
 *
 * Browser only, synthetic account (fakeAccount), this commit's own server calls (serveFromThisCommit) and the
 * model routes' stand-ins (serveModelStandIns: the kind suggested, the story card proposing only the kind); no staging.
 */
import { expect, test, type Page } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { autoAnswerSituation } from "./harness/situation";
import { serveFromThisCommit, serveModelStandIns } from "./harness/thisCommitServer";
import { recordInitialUnknowns, saveCaseStory } from "./harness/intakeReview";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { chooseOffers } from "./harness/offers";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const STORY = "I lent a friend $2,650 and they have not paid it back.";
const KIND = { claimTypeId: "sc-claim-personal-loan-between-individuals", claimTypeName: "Personal loan between individuals -- borrower hasn't repaid", quote: "I lent a friend $2,650" };
const SITUATION = { where: "starting" as const, filed: "something" as const, stage: "plaintiff:claim-issued-not-served" };
const QUESTIONS = "[data-testid=guided-message][data-from=assistant][data-question-id]";

async function signedInCase(page: Page) {
  await grantSiteAccess(page);
  await autoAnswerSituation(page, SITUATION);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  await serveModelStandIns(page, "small-claims", undefined, { suggestKind: KIND, propose: { "sc-orient-dispute-category": "A loan or debt" } });
  await page.route("**/api/intake/classify-claim-type", (route) => route.fulfill({ json: { ok: true, result: { outcome: "confirmed", claimType: { claimTypeId: KIND.claimTypeId, claimTypeName: KIND.claimTypeName }, evidenceGuidance: null, claimGuidance: null } } }));
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Ottawa");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
  const caseId = new URL(page.url()).searchParams.get("intake") ?? "";
  const ack = page.getByTestId("acknowledgement-checkbox");
  await expect(ack.or(page.getByRole("button", { name: /Answer questions one at a time/ }))).toBeVisible({ timeout: 60_000 });
  if (await ack.isVisible()) { await ack.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 10_000 }).catch(() => false)) await send.click();
  return { account, caseId };
}

/** The kind card first ("Use the suggestion"), then each question answered from `answers` ("I do not know yet" otherwise); the ids asked. */
async function answerChat(page: Page, answers: Record<string, string>): Promise<string[]> {
  const card = page.getByTestId("claim-type-suggestion");
  let answered = 0;
  for (let turn = 0; turn < 20; turn++) {
    await page.waitForTimeout(2_000);
    if (await card.isVisible().catch(() => false)) {
      await card.getByTestId("claim-type-use-suggestion").click();
      await expect(card).toHaveCount(0, { timeout: 60_000 });
      continue;
    }
    const proposals = page.getByTestId("story-proposals");
    if (await proposals.isVisible().catch(() => false)) { await chooseOffers(proposals, "no"); await page.getByTestId("story-proposals-continue").click(); continue; }
    const ids = await page.locator(QUESTIONS).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-question-id") ?? ""));
    const box = page.locator("textarea[placeholder='Your answer...']");
    if (ids.length <= answered || !(await box.isVisible().catch(() => false))) break;
    await box.fill(answers[ids.at(-1) ?? ""] ?? "I do not know yet");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    answered = ids.length;
    await expect(page.getByRole("button", { name: "Sending…" })).toHaveCount(0, { timeout: 60_000 });
  }
  return page.locator(QUESTIONS).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-question-id") ?? ""));
}

async function confirmReview(page: Page) {
  const panel = page.getByTestId("intake-review");
  if (await panel.getAttribute("data-phase") === "user-confirmed") return;
  if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  await recordInitialUnknowns(page);
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
}

/** A sentence added to the story on the form, then "Start the questions again from my story" on the questions page. */
async function addSentenceAndRestart(page: Page, caseId: string) {
  await page.goto(`/builder?path=small-claims&caseId=${caseId}&step=form`);
  const edit = page.getByRole("button", { name: "Edit case story", exact: true });
  await expect(edit).toBeVisible({ timeout: 60_000 });
  await edit.click();
  await page.getByLabel("Case story", { exact: true }).fill(`${STORY} I have asked them for the money several times.`);
  await saveCaseStory(page);
  await page.waitForTimeout(3_000);
  await page.goto(`/builder?path=small-claims&caseId=${caseId}&step=guided`);
  const restart = page.getByRole("button", { name: "Start the questions again from my story" }).filter({ visible: true }).first();
  await expect(restart).toBeVisible({ timeout: 60_000 });
  await restart.click();
  await page.waitForTimeout(3_000);
  const begin = page.getByRole("button", { name: /Answer questions one at a time/ });
  if (await begin.isVisible({ timeout: 5_000 }).catch(() => false)) await begin.click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 20_000 }).catch(() => false)) await send.click();
}

test("A2: after the questions start again, the kind used on the suggestion card is not asked again -- small-claims", async ({ page }) => {
  test.setTimeout(600_000);
  const { caseId } = await signedInCase(page);
  const before = await answerChat(page, { "sc-amount-claimed": "$2,650", "sc-orient-when-happened": "I do not know yet" });
  // Right after "Use the suggestion": the kind is said back and "What kind of dispute is this?" is not asked.
  const said = await page.locator("[data-testid=guided-message][data-from=assistant]").allInnerTexts();
  expect(said.some((text) => text.includes(`Got it: ${KIND.claimTypeName}.`)), "the kind was used on the suggestion card").toBe(true);
  expect(before, `"What kind of dispute is this?" is not asked right after "Use the suggestion" (asked: ${before.join(", ")})`).not.toContain("sc-orient-dispute-category");
  await confirmReview(page);
  await addSentenceAndRestart(page, caseId);
  // The kind used before the restart is kept, so its card is not offered again (site owner, 6 Nov: restart-keeps-answers.spec.ts;
  // this used to require the card to be used again after the restart, "Got it: <kind>"). Checked before answering anything,
  // since answerChat uses any card it finds.
  await page.waitForTimeout(8_000);
  await expect(page.getByTestId("claim-type-suggestion"), "the kind used before the restart is offered again").toHaveCount(0);
  const asked = await answerChat(page, { "sc-orient-dispute-category": "A loan I gave to a friend" });
  expect(asked, `"What kind of dispute is this?" is not asked after the restart either (asked: ${asked.join(", ")})`).not.toContain("sc-orient-dispute-category");
  await page.getByTestId("intake-start-review").click().catch(() => undefined);
  await expect(page.getByTestId("intake-review"), "the review keeps the kind used").toContainText(`Kind of claim: ${KIND.claimTypeName}`, { timeout: 30_000 });
});

test("A3: after Show my next step and the questions started again, When it happened is still shown or asked again -- small-claims", async ({ page }) => {
  test.setTimeout(600_000);
  const { caseId } = await signedInCase(page);
  await answerChat(page, { "sc-amount-claimed": "$2,650", "sc-orient-when-happened": "March 15, 2025" });
  await confirmReview(page);
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByTestId("completed-case-overview"), "the next step loads").toBeVisible({ timeout: 120_000 });
  await page.goto(`/cases/${caseId}`);
  await expect(page.getByTestId("case-file"), "before the restart, the case page shows when it happened").toContainText("March 15, 2025", { timeout: 60_000 });

  await addSentenceAndRestart(page, caseId);
  const asked = await answerChat(page, { "sc-orient-when-happened": "March 15, 2025" });
  const askedAgain = asked.includes("sc-orient-when-happened");
  // Confirmed again, as Chrome did: the case page's "What we have so far" is read after it.
  await confirmReview(page);
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByTestId("completed-case-overview"), "the next step loads again").toBeVisible({ timeout: 120_000 });
  await page.goto(`/cases/${caseId}`);
  const caseFile = page.getByTestId("case-file");
  await expect(caseFile).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(3_000);
  const shown = (await caseFile.innerText()).includes("March 15, 2025");
  expect(askedAgain || shown, `"When it happened" is asked again or still shown (asked: ${asked.join(", ")}; shown on the case page: ${shown})`).toBe(true);
});

test("B1: a guest's Show my next step in the review says, under the button, that signing in is needed -- small-claims", async ({ page }) => {
  test.setTimeout(300_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, SITUATION);
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Ottawa");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const ack = page.getByTestId("acknowledgement-checkbox");
  await expect(ack.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
  if (await ack.isVisible()) { await ack.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  await page.getByTestId("sc-intake-amountClaimed").fill("$2,650");
  await confirmReview(page);
  const show = page.getByTestId("intake-continue-guidance");
  await show.scrollIntoViewIfNeeded();
  await show.click();
  const message = page.getByTestId("intake-review").getByTestId("intake-continue-sign-in");
  await expect(message, "the sign-in message shows in the review, under the button").toBeVisible({ timeout: 15_000 });
  await expect(message).toContainText("Please sign in to continue");
  await expect(message, "the message is on screen where the person clicked").toBeInViewport();
});
