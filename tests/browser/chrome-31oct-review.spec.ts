/**
 * THE OWNER'S CHROME CHECK OF 31 OCT, ITEMS 1 AND 5, IN ALL THREE COURTS.
 *
 * 1. A known answer is never listed as remaining (rules 4/5), and one click on a choice ticks it
 *    (rule 7). On the preview (08e5a9ee) the Family review kept "What is the case about? Pick everything
 *    that applies." under "Remaining initial questions" after "Dividing property" was saved, and the
 *    story's suggestion showed already ticked, so the first click unticked it.
 * 5. After a case is confirmed and everything is answered, "Answer questions one at a time" says so in
 *    plain words (src/lib/case-system/copy/askCopy.ts NOTHING_LEFT_TO_ASK); Small Claims showed only
 *    "Send my story" again.
 *
 * WHAT FAILURE THIS CATCHES: an answered question listed under "Remaining initial questions"; a choice
 * shown ticked before the person ticks it; a question screen that is blank or asks again once
 * everything is answered. Read from the page as a person sees it (the fieldset by its legend), so the
 * same spec runs on 08e5a9ee (where it fails) and on the fix.
 *
 * THE REAL SAVE PATH: a real staging user and session (authenticateRealTestUser, refuses production);
 * every save through the site's own code. Stand-ins: serveModelStandIns (the model routes), the
 * situation answers (autoAnswerSituation / openBuilder).
 */
import { expect, test, type Page } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { NOTHING_LEFT_TO_ASK } from "../../src/lib/case-system/copy/askCopy";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

type Court = "family" | "civil" | "small-claims";
const STORY: Record<Court, string> = {
  family: "Synthetic: we separated in May 2026 and cannot agree on dividing the house. The plum-yellow house is in both names.",
  civil: "Synthetic: a supplier never delivered the machine I ordered in April 2026. The plum-yellow invoice is all I have.",
  "small-claims": "A moving company broke my dining table in May 2026. Their truck was parked outside. I have photos.",
};
/** The kind question each court's review asks, and the choice the story supports. */
const KIND: Record<Court, { question: string; value: string }> = {
  family: { question: "issues", value: "property-division" },
  civil: { question: "issues", value: "contract" },
  "small-claims": { question: "sc-orient-dispute-category", value: "Property damage" },
};

async function start(page: Page, court: Court): Promise<string> {
  if (court === "small-claims") {
    await page.goto("/?path=small-claims");
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("City or municipality").fill("Kingston");
    await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY[court]);
    await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
    const ack = page.getByTestId("acknowledgement-checkbox");
    await expect(ack.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
    if (await ack.isVisible()) { await ack.check(); await page.getByTestId("acknowledgement-continue").click(); }
  } else {
    await openBuilder(page, court, { city: "Kingston", story: STORY[court], situation: STARTING_NOTHING_FILED });
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 }).catch(() => {});
  }
  const panel = page.getByTestId("intake-review");
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
  return new URL(page.url()).searchParams.get("intake") ?? "";
}

/**
 * The review's initial questions: ONE list in a fixed order (owner, earlier rule: questions keep their places
 * while answered). Nothing answered may be called remaining: no heading says "Remaining", and the count of
 * what is still to answer leaves an answered question out (owner's Chrome check, 31 Oct).
 */
const questionList = (page: Page) => page.getByTestId("intake-initial-questions");
const stillToAnswer = async (page: Page): Promise<number> => { const words = (await page.getByTestId("intake-remaining-count").innerText()).trim(); return /^(\d+) still to answer/.test(words) ? Number(/^(\d+)/.exec(words)![1]) : 0; };
const order = async (page: Page) => questionList(page).locator("[data-testid=intake-initial-question]").evaluateAll((items) => items.map((item) => item.getAttribute("data-question")));

for (const court of ["family", "civil", "small-claims"] as const) {
  test(`chrome 31 Oct, item 1 (${court}): one click ticks the choice, and the kind once answered keeps its place, marked answered, never counted as remaining`, async ({ page }) => {
    test.setTimeout(300_000);
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await serveModelStandIns(page, court, userId);
      await start(page, court);
      const kind = KIND[court];
      const question = questionList(page).locator(`[data-question="${kind.question}"]`);
      await expect(question, "the kind is asked once").toHaveCount(1, { timeout: 60_000 });
      await expect(question, "not yet answered").toHaveAttribute("data-answered", "false");
      const before = { order: await order(page), left: await stillToAnswer(page) };
      if (court === "small-claims") {
        await question.getByRole("button", { name: new RegExp(`^${kind.value}`) }).click();
      } else {
        const box = question.locator(`input[data-testid=intake-field-pick][value="${kind.value}"]`);
        await expect(box, "a story suggestion is never shown ticked before the person ticks it").not.toBeChecked();
        await box.click();
        await expect(box, "one click ticks it").toBeChecked();
        await question.getByTestId("intake-field-save").click();
      }
      await expect(question, "once answered, it is marked answered").toHaveAttribute("data-answered", "true", { timeout: 30_000 });
      await expect(question.getByTestId("intake-question-answered"), "it says so, with the answer").toContainText("Answered");
      expect(await order(page), "it keeps its place in the one list").toEqual(before.order);
      expect(await stillToAnswer(page), "it is no longer counted as still to answer").toBe(before.left - 1);
      await expect(page.locator("legend", { hasText: /Remaining/ }), "no heading calls an answered question remaining").toHaveCount(0);
    } finally {
      await deleteHarnessUser(userId);
    }
  });

  test(`chrome 31 Oct, item 5 (${court}): confirmed with everything answered, the questions one at a time say so`, async ({ page }) => {
    test.setTimeout(300_000);
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await serveModelStandIns(page, court, userId);
      const id = await start(page, court);
      const panel = page.getByTestId("intake-review");
      const kind = KIND[court];
      const question = panel.locator(`[data-question="${kind.question}"]`);
      if (court === "small-claims") await question.getByRole("button", { name: new RegExp(`^${kind.value}`) }).click();
      else { await question.locator(`input[data-testid=intake-field-pick][value="${kind.value}"]`).check(); await question.getByTestId("intake-field-save").click(); }
      const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
      while (await unknowns.count()) { const n = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(n - 1, { timeout: 20_000 }); }
      await page.getByTestId("intake-review-acknowledgement").check();
      await page.getByTestId("intake-confirm").click();
      await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
      await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
      if (court === "small-claims") await page.goto(`/builder?path=small-claims&intake=${id}&step=guided`);
      else {
        await page.goto(`/builder?path=${court}&intake=${id}`);
        const chat = page.getByRole("button", { name: "Answer one question at a time instead" });
        if (await chat.isVisible({ timeout: 20_000 }).catch(() => false)) await chat.click();
      }
      await expect(page.getByText(NOTHING_LEFT_TO_ASK), "the question screen says nothing is left to ask").toBeVisible({ timeout: 60_000 });
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
