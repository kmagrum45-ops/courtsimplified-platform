/**
 * A SUGGESTION IS OFFERED, NEVER PRE-TICKED, IN ALL THREE COURTS (owner's Chrome check, 31 Oct).
 *
 * The owner's rule: a suggestion read from the person's story, or made by the site, is offered with
 * the same one-click "Use the suggestion" control (app/_components/UseSuggestion.tsx, words from
 * src/lib/case-system/copy/suggestionCopy.ts), never shown ticked, selected or filled in. The person
 * uses it or ignores it; ignoring it saves nothing (CLAUDE.md s. 4).
 *
 * Each place this spec reaches with the stand-ins, as a person sees it:
 *   - Small Claims review: the kind-of-dispute choice ("Property damage") is not pressed; it is
 *     offered with "Use the suggestion"; after a reload with nothing pressed, nothing was saved;
 *     one click saves it (the question moves out of Remaining, its choice marked).
 *   - Small Claims questions one at a time, "Here's what I understood": a row starts unticked and
 *     with no answer box filled in; continuing without using it confirms nothing; one click on
 *     "Use the suggestion" ticks it, and continuing records it.
 *   - Civil questions one at a time: a story offer is "Use the suggestion" (no "Yes, that's right");
 *     "No, let me answer" leaves every choice unpressed and nothing saved; one click saves it.
 *   - Family questions one at a time: the children box a part of the story answers starts EMPTY,
 *     with the story's words offered; one click fills it in.
 *
 * WHAT FAILURE THIS CATCHES: a story suggestion shown ticked, selected or typed into a box before the
 * person chose it (on 2be6a4c1 the story card's rows started ticked and the children box started
 * filled in), or offered with words of its own instead of the one control.
 *
 * THE REAL SAVE PATH: a real staging user and session (authenticateRealTestUser, refuses production);
 * every save through the site's own code. Stand-ins: serveModelStandIns (the model routes: case read,
 * case understand, court classifier, law assistant, the guided turn with its model steps replaced, the
 * claim-type classifier and depth turn off), the situation answers (autoAnswerSituation / openBuilder).
 */
import { expect, test, type Page } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, situationForSide, STARTING_NOTHING_FILED } from "./harness/situation";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { USE_THE_SUGGESTION } from "../../src/lib/case-system/copy/suggestionCopy";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

const OFFER = "[data-use-suggestion]";
const offerWords = new RegExp(`^${USE_THE_SUGGESTION}`);

async function startSmallClaims(page: Page, story: string): Promise<string> {
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Kingston");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(story);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
  const ack = page.getByTestId("acknowledgement-checkbox");
  await expect(ack.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
  if (await ack.isVisible()) { await ack.check(); await page.getByTestId("acknowledgement-continue").click(); }
  return new URL(page.url()).searchParams.get("intake") ?? "";
}

async function toReview(page: Page) {
  const panel = page.getByTestId("intake-review");
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
  return panel;
}

const remainingList = (page: Page) => page.locator("fieldset").filter({ has: page.locator("legend", { hasText: /^Remaining initial questions$/ }) });
const answeredList = (page: Page) => page.locator("fieldset").filter({ has: page.locator("legend", { hasText: /^Answered here/ }) });

test("Small Claims review: the kind of dispute is offered, not pressed; ignored saves nothing; one click saves it", async ({ page }) => {
  test.setTimeout(300_000);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await serveModelStandIns(page, "small-claims", userId);
    await startSmallClaims(page, "A moving company broke my dining table in May 2026. Their truck was parked outside. I have photos.");
    await toReview(page);
    const question = () => remainingList(page).locator('[data-question="sc-orient-dispute-category"]');
    await expect(question(), "asked once, under Remaining").toHaveCount(1, { timeout: 60_000 });
    await expect(question().locator('button[aria-pressed="true"]'), "no choice is pressed before the person presses one").toHaveCount(0);
    const offer = question().locator(OFFER);
    await expect(offer, "the story's suggestion is offered with the one control").toHaveCount(1);
    await expect(offer).toHaveText(`${USE_THE_SUGGESTION}: Property damage`);

    // Ignored, and the page read again: nothing was saved.
    await page.reload();
    await toReview(page);
    await expect(question(), "ignored, it is still asked").toHaveCount(1, { timeout: 60_000 });
    await expect(question().locator('button[aria-pressed="true"]'), "ignored, nothing was saved").toHaveCount(0);

    await question().locator(OFFER).click();
    await expect(question(), "one click saves it: no longer remaining").toHaveCount(0, { timeout: 30_000 });
    await expect(answeredList(page).locator('[data-question="sc-orient-dispute-category"] button[aria-pressed="true"]')).toHaveText(/^Property damage$/);
  } finally {
    await deleteHarnessUser(userId);
  }
});

/** Small Claims questions one at a time, as a defendant, until "Here's what I understood" shows. */
async function guidedUntilProposals(page: Page) {
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 5_000 }).catch(() => false)) await send.click();
  const proposals = page.getByTestId("story-proposals");
  const question = page.locator("[data-testid=guided-message][data-from=assistant]").last();
  for (let turn = 0; turn < 12; turn++) {
    await expect(proposals.or(question).first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(600);
    if (await proposals.isVisible().catch(() => false)) return proposals;
    const text = (await question.innerText()).replace(/\s+/g, " ");
    const answer = /bringing this claim|responding to a claim/i.test(text) ? "Responding to a claim (defendant)" : /add the year/i.test(text) ? "May 3, 2026" : "I don't know";
    const before = await page.locator("[data-testid=guided-message]").count();
    await page.locator("textarea").last().fill(answer);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 60_000 }).toBeGreaterThan(before + 1).catch(() => {});
  }
  throw new Error("the story card was not shown");
}

const DEFENDANT_STORY = "My former landlord sued me in Small Claims Court in May 2026 for $3,000 of rent. I was served with his claim. He kept my $1,500 deposit.";

for (const use of [false, true]) {
  test(`Small Claims "Here's what I understood": a row starts unticked and empty; ${use ? "one click uses it and it is recorded" : "ignored, nothing is confirmed"}`, async ({ page }) => {
    test.setTimeout(300_000);
    await autoAnswerSituation(page, situationForSide("defendant"));
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await serveModelStandIns(page, "small-claims", userId);
      await startSmallClaims(page, DEFENDANT_STORY);
      const proposals = await guidedUntilProposals(page);
      const row = proposals.getByTestId("story-proposal-row").first();
      await expect(row.locator("input[type=checkbox]"), "not ticked before the person chooses it").not.toBeChecked();
      await expect(row.locator("input[type=text]:not([disabled]), select:not([disabled])"), "no answer box filled in before the person chooses it").toHaveCount(0);
      const offer = row.locator(OFFER);
      await expect(offer, "offered with the one control").toHaveCount(1);
      await expect(offer).toHaveText(offerWords);
      const before = await page.locator("[data-testid=guided-message][data-from=user]").count();
      if (use) {
        await offer.click();
        await expect(row.locator("input[type=checkbox]"), "one click ticks it").toBeChecked();
      }
      await proposals.getByTestId("story-proposals-continue").click();
      const said = page.locator("[data-testid=guided-message][data-from=user]").nth(before);
      await expect(said).toBeVisible({ timeout: 60_000 });
      if (use) await expect(said, "what was used is recorded").toContainText("Confirmed from my story");
      else await expect(said, "ignored, nothing is confirmed").toHaveText(/None of those were right/);
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}

test("Civil questions one at a time: a story offer is the one control; 'No, let me answer' saves nothing and presses nothing; one click saves it", async ({ page }) => {
  test.setTimeout(300_000);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await serveModelStandIns(page, "civil", userId);
    await openBuilder(page, "civil", { city: "Kingston", story: "Synthetic: a supplier never delivered the machine I ordered in April 2026. I paid $40,000 for it and I want my $40,000 back.", situation: STARTING_NOTHING_FILED });
    const question = page.getByTestId("guided-form-question");
    let ignored = false;
    let used = false;
    for (let i = 0; i < 14 && !(ignored && used); i++) {
      await expect(question.or(page.getByTestId("guided-nothing-left")).first()).toBeVisible({ timeout: 60_000 });
      if (!(await question.isVisible().catch(() => false))) break;
      const key = (await question.getAttribute("data-key")) ?? "";
      const offered = question.getByTestId("guided-form-from-story");
      if (await offered.isVisible().catch(() => false)) {
        const yes = question.getByTestId("guided-form-from-story-yes");
        await expect(yes, "the story offer is the one control").toHaveAttribute("data-use-suggestion", "");
        await expect(yes).toHaveText(offerWords);
        await expect(offered.getByText(/that's right/i), "no words of its own").toHaveCount(0);
        if (!ignored) {
          await question.getByTestId("guided-form-from-story-no").click();
          await expect(question.getByTestId("guided-form-from-story"), "ignored, the offer goes and the question is asked plainly").toHaveCount(0);
          await expect(question, "the same question").toHaveAttribute("data-key", key);
          await expect(question.locator('[aria-pressed="true"], input:checked'), "nothing pressed or ticked").toHaveCount(0);
          const box = question.getByRole("textbox");
          if (await box.count()) await expect(box, "nothing filled in").toHaveValue("");
          ignored = true;
          await page.getByTestId("guided-form-skip").click();
          continue;
        }
        const acks = await page.getByTestId("guided-form-ack").count();
        await yes.click();
        await expect(page.getByTestId("guided-form-ack"), "one click saves it").toHaveCount(acks + 1, { timeout: 30_000 });
        used = true;
        continue;
      }
      await page.getByTestId("guided-form-skip").click();
    }
    expect(ignored && used, "a story offer was reached, ignored once and used once").toBe(true);
  } finally {
    await deleteHarnessUser(userId);
  }
});

test("Family questions one at a time: the children box a part of the story answers starts empty, offered; one click fills it", async ({ page }) => {
  test.setTimeout(300_000);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await serveModelStandIns(page, "family", userId);
    await openBuilder(page, "family", { city: "Kingston", story: "Synthetic: we separated in May 2026. I need child support for our daughter.", situation: STARTING_NOTHING_FILED });
    const question = page.getByTestId("guided-form-question");
    let reached = false;
    for (let i = 0; i < 14 && !reached; i++) {
      await expect(question.or(page.getByTestId("guided-nothing-left")).first()).toBeVisible({ timeout: 60_000 });
      if (!(await question.isVisible().catch(() => false))) break;
      const key = (await question.getAttribute("data-key")) ?? "";
      if (key === "childrenInfo") {
        reached = true;
        const box = question.getByRole("textbox");
        await expect(box, "the box starts empty: the story's words are offered, not typed in").toHaveValue("");
        const offer = question.locator(OFFER);
        await expect(offer, "offered with the one control").toHaveCount(1);
        await expect(offer).toHaveText(offerWords);
        const words = ((await offer.innerText()).split(": ").slice(1).join(": ")).trim();
        await offer.click();
        await expect.poll(async () => (await box.inputValue()).trim(), { message: "one click fills it in" }).toBe(words);
        break;
      }
      if (key === "issues") {
        const yes = question.getByTestId("guided-form-from-story-yes");
        if (await yes.isVisible().catch(() => false)) { await yes.click(); continue; }
        await question.getByTestId("guided-check-child-support").check();
        await question.getByTestId("guided-form-next").click();
        continue;
      }
      if (key === "yourRole") { await question.getByTestId("guided-option-applicant").click(); continue; }
      await page.getByTestId("guided-form-skip").click();
    }
    expect(reached, "the children question was reached").toBe(true);
  } finally {
    await deleteHarnessUser(userId);
  }
});
