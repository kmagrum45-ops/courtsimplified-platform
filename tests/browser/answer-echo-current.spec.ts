/**
 * THE NEWEST ANSWER SHOWS ON EVERY SCREEN AT ONCE, INCLUDING THE ONES THAT REPEAT AN ANSWER BACK
 * (founder's Chrome check of #536 at 5b30f0da, 1 Nov; rules 5 and 7).
 *
 * What the founder saw:
 *   - civil and Family: the questions one at a time still said "Got it: Contract / agreement dispute."
 *     (Family: "Got it: Dividing property (equalization)." and "Got it: I want it sold.") after the kind,
 *     and the goal, were changed in the review, also after a reload; every other screen showed the change;
 *   - Small Claims: after Confirm, the kind changed in the review; "You changed an answer, so please
 *     review and confirm again." was gone after a reload, and the case page showed neither the new kind
 *     nor that message until the person confirmed again.
 *
 * What it checks, signed in through the real save path:
 *   1. civil and Family: the kind (and in Family the goal) accepted with "Use the suggestion" in the
 *      questions one at a time, then changed in the review (the kind with "Change", the goal in its box);
 *      reloaded, the questions' acknowledgements show the new answer and never "Got it: <the old one>";
 *   2. all three courts: the kind answered in the review, confirmed, then changed with "Change"; reloaded,
 *      the review still says "You changed an answer, so please review and confirm again."; the case page,
 *      before confirming again, shows the same message and the new kind in "What we have so far", never
 *      the old one.
 *
 * WHAT FAILURE THIS CATCHES: a screen that repeats an answer back from its own copy (a transcript kept in
 * the page's state) after the person changed it elsewhere; the "confirm again" message carried only in
 * the page's memory; a case page that hides the person's latest answer until they confirm it again.
 *
 * THE REAL SAVE PATH: a real staging user and session (authenticateRealTestUser, refuses production), the
 * case saved to and read back from the staging database by the page's own code. Stand-ins, the only ones:
 * the routes that would call a model (serveModelStandIns), and the situation answers set by the harness
 * (autoAnswerSituation / openBuilder).
 */
import { expect, test, type Page } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { recordInitialUnknowns } from "./harness/intakeReview";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

type Court = "family" | "civil" | "small-claims";
const CONFIRM_AGAIN = "You changed an answer, so please review and confirm again.";
const panelOf = (page: Page) => page.getByTestId("intake-review");
const reviewKindLine = (page: Page) => panelOf(page).locator('[data-testid="intake-entry-held"][data-fact="claimKind"]');
const savedNow = async (page: Page) => { await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 }).catch(() => {}); await page.waitForTimeout(1_500); };
const caseIdOf = (page: Page) => new URL(page.url()).searchParams.get("intake") ?? new URL(page.url()).searchParams.get("caseId") ?? "";

async function openReview(page: Page) {
  const panel = panelOf(page);
  await expect(panel).toBeVisible({ timeout: 60_000 });
  const phase = await panel.getAttribute("data-phase");
  if (phase === "collecting") { await expect(page.getByTestId("intake-start-review")).toBeEnabled({ timeout: 60_000 }); await page.getByTestId("intake-start-review").click(); }
  if (phase === "user-confirmed") { const view = page.getByTestId("intake-view-review"); if (await view.isVisible().catch(() => false)) await view.click(); }
  // A confirmed intake stays confirmed while it is only viewed ("Review or correct"); a change makes it "reviewing".
  if (phase !== "user-confirmed") await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
}

/** The kind changed with the review's "Change": a list (civil, Family) or one choice (Small Claims). */
async function changeKind(page: Page, court: Court, from: string, to: string) {
  const line = reviewKindLine(page);
  await expect(line, "the kind shows as held in the review").toHaveCount(1, { timeout: 60_000 });
  await line.getByTestId("change-answer-open").click();
  const control = line.getByTestId("change-answer");
  if (court === "small-claims") await control.getByTestId("change-answer-choice").filter({ hasText: new RegExp(`^${to}$`) }).click();
  else {
    await control.locator(`input[data-testid=change-answer-pick][value="${from}"]`).uncheck();
    await control.locator(`input[data-testid=change-answer-pick][value="${to}"]`).check();
    await control.getByTestId("change-answer-save").click();
  }
}

// 1. The questions one at a time repeat back the case file's answer, after a change made in the review.
const PANEL: Record<"civil" | "family", { story: string; kind: { from: string; fromWords: string; to: string; toWords: string }; goal?: { fromWords: string; to: string } }> = {
  civil: {
    story: "Synthetic: in April 2026 my business paid Northern Lumber Supply Inc. $85,000 for building materials. The supplier never delivered the materials and will not return the money.",
    kind: { from: "contract", fromWords: "Contract / agreement dispute", to: "debt", toWords: "Debt / money owed" },
  },
  family: {
    story: "Synthetic: my husband and I separated in May 2026. We cannot agree on dividing the house: he wants to keep living there and I want it sold.",
    kind: { from: "property-division", fromWords: "Dividing property (equalization)", to: "sale-of-home", toWords: "Selling the family home" },
    goal: { fromWords: "I want it sold", to: "Synthetic: the house sold and the money divided equally" },
  },
};

for (const court of ["civil", "family"] as const) {
  test(`answer echo (${court}): the questions one at a time repeat back the newest answer after a change in the review, after a reload`, async ({ page }) => {
    test.setTimeout(600_000);
    const setup = PANEL[court];
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await serveModelStandIns(page, court, userId);
      await openBuilder(page, court, { city: "Ottawa", story: setup.story, situation: STARTING_NOTHING_FILED });
      const chat = page.getByTestId("guided-form-chat");
      await expect(chat).toBeVisible({ timeout: 60_000 });
      // The kind (and the goal) accepted from the story with one click; every other question skipped.
      const accepted = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const question = page.getByTestId("guided-form-question");
        if (!(await question.isVisible({ timeout: 10_000 }).catch(() => false))) break;
        const key = (await question.getAttribute("data-key")) ?? "";
        const yes = question.getByTestId("guided-form-from-story-yes");
        if ((key === "issues" || key === "goal") && (await yes.isVisible().catch(() => false))) {
          const group = (await question.getByTestId("guided-form-from-story").getAttribute("data-group")) ?? key;
          await yes.click();
          for (const item of group.split(" ")) accepted.add(item);
        } else await question.getByTestId("guided-form-skip").click();
        await page.waitForTimeout(400);
      }
      expect(accepted.has("issues"), "the kind was offered from the story and accepted").toBe(true);
      await expect(chat.getByTestId("guided-form-ack").filter({ hasText: `Got it: ${setup.kind.fromWords}.` }), "the questions acknowledge the kind given").toHaveCount(1);
      if (setup.goal) {
        expect(accepted.has("goal"), "the goal was offered from the story and accepted").toBe(true);
        await expect(chat.getByTestId("guided-form-ack").filter({ hasText: `Got it: ${setup.goal.fromWords}.` })).toHaveCount(1);
      }
      await savedNow(page);

      // Changed in the review: the kind with "Change", the goal in its own box.
      await openReview(page);
      await changeKind(page, court, setup.kind.from, setup.kind.to);
      await expect(reviewKindLine(page), "the review shows the new kind").toContainText(setup.kind.toWords, { timeout: 30_000 });
      if (setup.goal) {
        const goalBox = panelOf(page).locator('[data-testid=intake-entry][data-field="goal"]').locator("textarea, input[type=text]").first();
        await expect(goalBox, "the review shows the goal in its box").toBeVisible({ timeout: 30_000 });
        await goalBox.fill(setup.goal.to);
        await goalBox.blur();
      }
      await savedNow(page);

      for (const when of ["at once", "after a reload"]) {
        if (when === "after a reload") { await page.reload(); await expect(chat).toBeVisible({ timeout: 60_000 }); await page.waitForTimeout(2_000); }
        const acks = (await chat.getByTestId("guided-form-ack").allInnerTexts()).join("\n");
        expect.soft(acks, `the questions never repeat back the old kind (${when})`).not.toContain(`Got it: ${setup.kind.fromWords}.`);
        expect.soft(acks, `the questions repeat back the new kind (${when})`).toContain(`Got it: ${setup.kind.toWords}.`);
        if (setup.goal) {
          expect.soft(acks, `the questions never repeat back the old goal (${when})`).not.toContain(`Got it: ${setup.goal.fromWords}.`);
          expect.soft(acks, `the questions repeat back the new goal (${when})`).toContain(`Got it: ${setup.goal.to}.`);
        }
      }
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}

// 2. After Confirm, a change: said in the review after a reload, and on the case page before confirming again.
const STORY: Record<Court, string> = {
  family: "Synthetic: we separated in May 2026 and cannot agree on dividing the house. The plum-yellow house is in both names.",
  civil: "Synthetic: a supplier never delivered the machine I ordered in April 2026. The plum-yellow invoice is all I have.",
  "small-claims": "A moving company broke my dining table in May 2026. Their truck was parked outside. I have photos.",
};
const KIND: Record<Court, { question: string; first: { value: string; words: string }; then: { value: string; words: string } }> = {
  family: { question: "issues", first: { value: "property-division", words: "Dividing property (equalization)" }, then: { value: "child-support", words: "Child support" } },
  civil: { question: "issues", first: { value: "contract", words: "Contract / agreement dispute" }, then: { value: "debt", words: "Debt / money owed" } },
  "small-claims": { question: "sc-orient-dispute-category", first: { value: "Property damage", words: "Property damage" }, then: { value: "A contract or agreement dispute", words: "A contract or agreement dispute" } },
};

async function start(page: Page, court: Court) {
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
}

// Reloaded at once as well (Small Claims, where the founder saw it): before the change has reached the saved case.
for (const [court, atOnce] of [["small-claims", false], ["small-claims", true], ["civil", false], ["family", false]] as const) {
  test(`changed after Confirm (${court}): the review says so after a reload${atOnce ? " made at once" : ""}, and the case page shows the new answer and the message before confirming again`, async ({ page }) => {
    test.setTimeout(900_000);
    const kind = KIND[court];
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await serveModelStandIns(page, court, userId);
      await start(page, court);
      const caseId = caseIdOf(page);
      await openReview(page);
      const question = panelOf(page).locator(`[data-question="${kind.question}"]`);
      await expect(question).toHaveCount(1, { timeout: 60_000 });
      if (court === "small-claims") await question.getByRole("button", { name: new RegExp(`^${kind.first.value}`) }).click();
      else { await question.locator(`input[data-testid=intake-field-pick][value="${kind.first.value}"]`).check(); await question.getByTestId("intake-field-save").click(); }
      await recordInitialUnknowns(page);
      await page.getByTestId("intake-review-acknowledgement").check();
      await page.getByTestId("intake-confirm").click();
      await expect(panelOf(page)).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
      await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
      await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 180_000 });
      // The overview's "Case snapshot" lists the kind in every court (rule 5; civil and Family had no row).
      await expect.soft(page.getByTestId("completed-case-overview").getByTestId("claim-kind").first(), "the overview's snapshot shows the kind").toContainText(kind.first.words, { timeout: 30_000 });

      await openReview(page);
      await changeKind(page, court, kind.first.value, kind.then.value);
      await expect(reviewKindLine(page), "the review shows the new kind").toContainText(kind.then.words, { timeout: 30_000 });
      await expect(page.getByTestId("intake-confirm-again"), "the review says why").toHaveText(CONFIRM_AGAIN);
      if (!atOnce) await savedNow(page);
      await page.reload();
      await expect(panelOf(page)).toBeVisible({ timeout: 60_000 });
      await openReview(page);
      await expect(page.getByTestId("intake-confirm-again"), "reloaded, the review still says why").toHaveText(CONFIRM_AGAIN, { timeout: 30_000 });

      // The case page, before confirming again: the message and the new kind, never the old one.
      await savedNow(page);
      await page.goto(`/cases/${caseId}`);
      await page.waitForLoadState("networkidle").catch(() => {});
      await expect(page.getByTestId("case-confirm-again"), "the case page says the change needs confirming").toHaveText(CONFIRM_AGAIN, { timeout: 60_000 });
      const line = page.locator('[data-testid="case-file-line"][data-fact="claimKind"]');
      await expect(line, "the case page lists the kind before confirming again").toHaveCount(1, { timeout: 30_000 });
      await expect(line).toContainText(kind.then.words);
      expect.soft(await page.getByTestId("case-file").innerText(), "the case page never shows the old kind").not.toContain(kind.first.words);
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
