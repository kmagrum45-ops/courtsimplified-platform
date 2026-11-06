/**
 * "START THE QUESTIONS AGAIN" ASKS NOTHING THE PERSON ALREADY GAVE OR CONFIRMED (item 2; site owner, 6 Nov 2026).
 *
 * Founder's Chrome check of #543 (5 Nov), step 3: the kind was confirmed on the suggestion card and "When it
 * happened" answered, a sentence was added to the story and the questions were started again; the chat offered
 * the kind again ("This sounds like it may be about: ... is that right?") and offered the date again.
 *
 * What it checks, Small Claims, questions one at a time, on this commit's code with the model stand-ins and the
 * synthetic account (helpers as restart-asked-once.spec.ts): after the restart the kind card is not shown, neither
 * "What kind of dispute is this?" nor "When it happened" is asked, and the review still shows both answers. The
 * rule itself, in all three courts, is test:restart-keeps-answers.
 *
 * WHAT FAILURE THIS CATCHES: a restart that asks again what the person already gave or confirmed.
 */
import { expect, test, type Page } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { autoAnswerSituation } from "./harness/situation";
import { serveFromThisCommit, serveModelStandIns } from "./harness/thisCommitServer";
import { recordInitialUnknowns, saveCaseStory } from "./harness/intakeReview";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

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
    if (await proposals.isVisible().catch(() => false)) { await page.getByTestId("story-proposals-continue").click(); continue; }
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

test("after a sentence is added and the questions start again, the kind and the date the person gave are not asked again -- small-claims", async ({ page }) => {
  test.setTimeout(600_000);
  const { caseId } = await signedInCase(page);
  await answerChat(page, { "sc-amount-claimed": "$2,650", "sc-orient-when-happened": "March 15, 2025" });
  await confirmReview(page);
  const before = await page.locator(QUESTIONS).count();
  await addSentenceAndRestart(page, caseId);
  await page.waitForTimeout(8_000);
  await expect(page.getByTestId("claim-type-suggestion"), "the kind the person confirmed is offered again").toHaveCount(0);
  const asked = (await page.locator(QUESTIONS).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-question-id") ?? ""))).slice(0);
  expect(asked, `asked after the restart: ${asked.join(", ")} (before it: ${before})`).not.toContain("sc-orient-dispute-category");
  expect(asked, `asked after the restart: ${asked.join(", ")}`).not.toContain("sc-orient-when-happened");
  await page.getByTestId("intake-start-review").click().catch(() => undefined);
  const review = page.getByTestId("intake-review");
  await expect(review, "the review keeps the kind").toContainText(KIND.claimTypeName, { timeout: 30_000 });
  await expect(review, "the review keeps the date").toContainText("March 15, 2025", { timeout: 30_000 });
});
