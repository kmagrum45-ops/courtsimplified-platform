/**
 * ONE CHANGE PATH, LATEST CHANGE WINS, IN THE BROWSER (site owner's Chrome check, 31 Oct; rule 6).
 *
 * What the owner saw: a wrong kind of claim showed in the review as "your answer already given; it is
 * not asked again", with no way to change it, and the case page's "Change" only went to the builder.
 *
 * What it checks, in Small Claims, civil and Family, signed in through the real save path:
 *   1. the kind answered in the review and confirmed, then changed with the review's "Change" control:
 *      the review says "You changed an answer, so please review and confirm again." (the confirmation
 *      is cancelled), the new kind shows in the review, after a reload too; confirmed again, the new
 *      kind (never the old) shows on the overview, the Form 7A section and "Check my case file" (Small
 *      Claims: those three show the kind only there), and on the case page ("What we have so far");
 *   2. the case page's "Change" for the kind opens the same choices in the review (?change=claimKind),
 *      "Remove this answer", reload: no screen shows the kind (the review, the overview, the Form 7A
 *      section, "Check my case file", the case page, and the questions one at a time do not ask it);
 *   3. "Not quite" on the guided claim-type suggestion (Small Claims): the kind turned down is never
 *      offered again on that case, after a reload and "Start the questions again" with the same story.
 *
 * WHAT FAILURE THIS CATCHES: a held answer with no way to change it; a change an older copy hides
 * (first answer wins); a change after Confirm that keeps the confirmation; a removed answer that comes
 * back after a reload; a turned-down suggestion offered again. Driven through the page as a person
 * uses it; it imports nothing of the change path, so it runs against 2be6a4c1 too (where it fails).
 *
 * THE REAL SAVE PATH: a real staging user and session (authenticateRealTestUser, refuses production),
 * the case saved to and read back from the staging database by the page's own code, every /api route
 * served by the site under test. Stand-ins, the only ones: the routes that would call a model
 * (serveModelStandIns; for test 3 its classifier stand-in suggests one kind, and "No, not that one"
 * gets "no match"), and the situation answers clicked by the harness (autoAnswerSituation / openBuilder).
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { recordInitialUnknowns, saveCaseStory } from "./harness/intakeReview";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

type Court = "family" | "civil" | "small-claims";
const STORY: Record<Court, string> = {
  family: "Synthetic: we separated in May 2026 and cannot agree on dividing the house. The plum-yellow house is in both names.",
  civil: "Synthetic: a supplier never delivered the machine I ordered in April 2026. The plum-yellow invoice is all I have.",
  "small-claims": "A moving company broke my dining table in May 2026. Their truck was parked outside. I have photos.",
};
/** The kind each court's review asks, the first answer, and the change, in the words every screen shows. */
const KIND: Record<Court, { question: string; first: { value: string; words: string }; then: { value: string; words: string } }> = {
  family: { question: "issues", first: { value: "property-division", words: "Dividing property (equalization)" }, then: { value: "child-support", words: "Child support" } },
  civil: { question: "issues", first: { value: "contract", words: "Contract / agreement dispute" }, then: { value: "debt", words: "Debt / money owed" } },
  "small-claims": { question: "sc-orient-dispute-category", first: { value: "Property damage", words: "Property damage" }, then: { value: "A contract or agreement dispute", words: "A contract or agreement dispute" } },
};
const CONFIRM_AGAIN = "You changed an answer, so please review and confirm again.";
const NOT_CONFIRMED = /haven.t confirmed what kind of claim/i;

async function start(page: Page, court: Court): Promise<void> {
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
  await openReview(page);
}

const panelOf = (page: Page) => page.getByTestId("intake-review");
/** The review open for editing: "Stop initial questions and review", or "Review or correct" once confirmed. */
async function openReview(page: Page) {
  const panel = panelOf(page);
  await expect(panel).toBeVisible({ timeout: 60_000 });
  const phase = await panel.getAttribute("data-phase");
  if (phase === "collecting") { await expect(page.getByTestId("intake-start-review")).toBeEnabled({ timeout: 60_000 }); await page.getByTestId("intake-start-review").click(); }
  if (phase === "user-confirmed") { const view = page.getByTestId("intake-view-review"); if (await view.isVisible().catch(() => false)) await view.click(); }
}

/** The kind answered in the review, as a person answers it. */
async function answerKind(page: Page, court: Court) {
  const kind = KIND[court];
  const question = panelOf(page).locator(`[data-question="${kind.question}"]`);
  await expect(question).toHaveCount(1, { timeout: 60_000 });
  if (court === "small-claims") await question.getByRole("button", { name: new RegExp(`^${kind.first.value}`) }).click();
  else { await question.locator(`input[data-testid=intake-field-pick][value="${kind.first.value}"]`).check(); await question.getByTestId("intake-field-save").click(); }
}

/** Everything else "I don't know yet", the tick, Confirm, saved; then "Show my next step". */
async function confirmAndShowNextStep(page: Page) {
  const panel = panelOf(page);
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
  await recordInitialUnknowns(page);
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 180_000 });
}

const savedNow = async (page: Page) => { await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 }).catch(() => {}); await page.waitForTimeout(1_500); };
const reviewKindLine = (page: Page): Locator => panelOf(page).locator('[data-testid="intake-entry-held"][data-fact="claimKind"]');

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

/** The overview's kind line (Small Claims), the Form 7A section, and "Check my case file", on this page. */
async function smallClaimsScreens(page: Page, where: string, shows: string | null, never: string[]) {
  const kindLine = page.getByTestId("claim-kind").first();
  await expect(kindLine, `the overview's kind line is drawn (${where})`).toBeVisible({ timeout: 60_000 });
  const kindText = (await kindLine.innerText()).split("\n")[0].trim();
  if (shows) expect.soft(kindText, `the overview shows the new kind (${where})`).toBe(shows);
  for (const old of never) expect.soft(kindText, `the overview never shows "${old}" (${where})`).not.toContain(old);
  const form7A = page.getByTestId("statement-of-claim-surface");
  if (await form7A.count()) {
    const shown = await form7A.innerText();
    if (shows) expect.soft(shown, `the Form 7A section shows the new kind (${where})`).toContain(shows);
    for (const old of never) expect.soft(shown, `the Form 7A section never shows "${old}" (${where})`).not.toContain(old);
  } else if (new URL(page.url()).pathname === "/builder") expect.soft(await form7A.count(), `the Form 7A section is drawn on the builder (${where})`).toBe(1);
  const check = await checkMyCaseFile(page);
  if (shows) expect.soft(check, `"Check my case file" holds a kind (${where})`).not.toMatch(NOT_CONFIRMED);
  else expect.soft(check, `"Check my case file" holds no kind once it is removed (${where})`).toMatch(NOT_CONFIRMED);
  for (const old of never) expect.soft(check, `"Check my case file" never shows "${old}" (${where})`).not.toContain(old);
}

/** The case page: "What we have so far" (and the overview, Small Claims). */
async function casePage(page: Page, court: Court, caseId: string, shows: string | null, never: string[]) {
  await page.goto(`/cases/${caseId}`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await expect(page.getByTestId("case-file")).toBeVisible({ timeout: 60_000 });
  const line = page.locator('[data-testid="case-file-line"][data-fact="claimKind"]');
  if (shows) { await expect(line, "\"What we have so far\" lists the kind").toHaveCount(1, { timeout: 30_000 }); expect.soft(await line.innerText(), "\"What we have so far\" shows the new kind").toContain(shows); }
  else expect.soft(await line.count(), "\"What we have so far\" lists no kind once it is removed").toBe(0);
  const all = await page.getByTestId("case-file").innerText();
  for (const old of never) expect.soft(all, `"What we have so far" never shows "${old}"`).not.toContain(old);
  if (court === "small-claims") await smallClaimsScreens(page, "case page", shows, never);
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`one change path (${court}): the kind changed with the review's Change, every screen shows the new kind; removed from the case page, none shows it`, async ({ page }) => {
    test.setTimeout(900_000);
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    const kind = KIND[court];
    try {
      await serveModelStandIns(page, court, userId);
      await start(page, court);
      const caseId = new URL(page.url()).searchParams.get("intake") ?? new URL(page.url()).searchParams.get("caseId") ?? "";
      await answerKind(page, court);
      await confirmAndShowNextStep(page);
      if (court === "small-claims") await smallClaimsScreens(page, "results page, first answer", kind.first.words, []);

      // 1. Changed with the review's "Change" control.
      await openReview(page);
      const line = reviewKindLine(page);
      await expect(line, "the kind shows as held in the review").toHaveCount(1, { timeout: 60_000 });
      await expect(line).toContainText(kind.first.words);
      await line.getByTestId("change-answer-open").click();
      const control = line.getByTestId("change-answer");
      if (court === "small-claims") await control.getByTestId("change-answer-choice").filter({ hasText: new RegExp(`^${kind.then.value}$`) }).click();
      else {
        await control.locator(`input[data-testid=change-answer-pick][value="${kind.first.value}"]`).uncheck();
        await control.locator(`input[data-testid=change-answer-pick][value="${kind.then.value}"]`).check();
        await control.getByTestId("change-answer-save").click();
      }
      await expect(reviewKindLine(page), "the review shows the new kind").toContainText(kind.then.words, { timeout: 30_000 });
      await expect(panelOf(page), "the confirmation is cancelled").toHaveAttribute("data-phase", "reviewing", { timeout: 30_000 });
      await expect(page.getByTestId("intake-confirm-again"), "the review says why, in the owner's words").toHaveText(CONFIRM_AGAIN);
      await savedNow(page);
      await page.reload();
      await openReview(page);
      await expect(panelOf(page), "reloaded, still not confirmed").toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
      await expect(page.getByTestId("intake-confirm-again"), "reloaded, the review still says why").toHaveText(CONFIRM_AGAIN);
      await expect(reviewKindLine(page), "reloaded, the review shows the new kind").toContainText(kind.then.words);
      expect.soft(await reviewKindLine(page).innerText(), "the review never shows the old kind").not.toContain(kind.first.words);
      await confirmAndShowNextStep(page);
      if (court === "small-claims") await smallClaimsScreens(page, "results page, changed", kind.then.words, [kind.first.words]);
      await casePage(page, court, caseId, kind.then.words, [kind.first.words]);

      // 2. The case page's "Change" opens the same choices; "Remove this answer".
      await page.locator('[data-testid="case-file-line"][data-fact="claimKind"]').getByTestId("case-file-change").click();
      await page.waitForURL(/\/builder\?.*change=claimKind/, { timeout: 60_000 });
      const opened = panelOf(page).locator('[data-testid="change-answer"][data-fact="claimKind"][data-open="true"]');
      await expect(opened, "the case page's Change opens that fact's choices").toBeVisible({ timeout: 60_000 });
      await opened.getByTestId("change-answer-remove").click();
      await expect(reviewKindLine(page), "the review shows it removed").toHaveAttribute("data-removed", "true", { timeout: 30_000 });
      await expect(page.getByTestId("intake-confirm-again")).toHaveText(CONFIRM_AGAIN);
      await savedNow(page);
      // Reloaded without ?change= (which would open the choices again, listing every kind).
      const reloaded = new URL(page.url());
      reloaded.searchParams.delete("change");
      await page.goto(reloaded.toString());
      await openReview(page);
      const removedLine = reviewKindLine(page);
      await expect(removedLine, "reloaded, the review shows the kind removed").toHaveAttribute("data-removed", "true", { timeout: 60_000 });
      for (const old of [kind.first.words, kind.then.words]) expect.soft(await removedLine.innerText(), `reloaded, the review never shows "${old}"`).not.toContain(old);
      expect.soft(await panelOf(page).locator(`[data-question="${kind.question}"]`).count(), "the review does not ask the removed kind again by itself").toBe(0);
      await confirmAndShowNextStep(page);
      if (court === "small-claims") await smallClaimsScreens(page, "results page, removed", null, [kind.first.words, kind.then.words]);
      await casePage(page, court, caseId, null, [kind.first.words, kind.then.words]);
      if (court === "small-claims") {
        // The questions one at a time: the removed kind is not asked again by itself.
        await page.goto(`/builder?path=small-claims&caseId=${caseId}&step=guided`);
        await page.waitForTimeout(5_000);
        expect.soft(await page.locator("[data-testid=guided-message][data-from=assistant]").filter({ hasText: /kind of dispute/i }).count(), "the questions one at a time do not ask the removed kind").toBe(0);
      }
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}

test("one change path (small-claims): \"No, not that one\" on the guided suggestion is never offered again on the case, after a reload and the questions started again", async ({ page }) => {
  test.setTimeout(600_000);
  const story = "Synthetic: the plum-yellow crew left my yard torn up in May 2026 after the job. I have photos.";
  const suggestion = { claimTypeId: "sc-claim-contractor-damage", claimTypeName: "Damage caused by a contractor", quote: "the plum-yellow crew left my yard torn up" };
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await serveModelStandIns(page, "small-claims", userId, { suggestKind: suggestion });
    await page.goto("/?path=small-claims");
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("City or municipality").fill("Kingston");
    await page.getByLabel(STORY_LABEL, { exact: true }).fill(story);
    await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
    const ack = page.getByTestId("acknowledgement-checkbox");
    await expect(ack.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
    if (await ack.isVisible()) { await ack.check(); await page.getByTestId("acknowledgement-continue").click(); }
    const caseId = new URL(page.url()).searchParams.get("intake") ?? "";
    const askedOnce = async () => {
      await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
      const send = page.getByTestId("guided-send-saved-story");
      if (await send.isVisible({ timeout: 10_000 }).catch(() => false)) await send.click();
      await page.waitForTimeout(3_000);
      await expect(page.locator("[data-testid=guided-message]").first().or(page.getByTestId("claim-type-suggestion")).first()).toBeVisible({ timeout: 60_000 });
    };
    await askedOnce();
    const card = page.getByTestId("claim-type-suggestion");
    await expect(card, "the stand-in's suggestion is offered once").toBeVisible({ timeout: 60_000 });
    await expect(card).toContainText(suggestion.claimTypeName);
    await card.getByRole("button", { name: "No, not that one" }).click();
    await expect(card).toHaveCount(0, { timeout: 60_000 });
    await savedNow(page);

    // Reloaded, and the questions started again from the same story (the stand-in suggests the same kind).
    await page.goto(`/builder?path=small-claims&caseId=${caseId}&step=form`);
    const edit = page.getByRole("button", { name: "Edit case story", exact: true });
    await expect(edit).toBeVisible({ timeout: 60_000 });
    await edit.click();
    const storyBox = page.getByLabel("Case story", { exact: true });
    await expect(storyBox).toBeVisible({ timeout: 60_000 });
    await storyBox.fill(`${story} The crew left on May 30.`);
    await saveCaseStory(page);
    const restart = page.getByRole("button", { name: "Start the questions again from my story" }).filter({ visible: true }).first();
    if (await restart.isVisible({ timeout: 15_000 }).catch(() => false)) await restart.click();
    await savedNow(page);
    await page.goto(`/builder?path=small-claims&caseId=${caseId}&step=guided`);
    const restartHere = page.getByRole("button", { name: "Start the questions again from my story" }).filter({ visible: true }).first();
    await expect(restartHere.or(page.getByTestId("guided-send-saved-story")).or(page.getByRole("button", { name: /Answer questions one at a time/ })).first()).toBeVisible({ timeout: 60_000 });
    for (let attempt = 0; attempt < 3 && (await restartHere.isVisible().catch(() => false)); attempt++) { await page.waitForTimeout(1_500); await restartHere.click(); await page.waitForTimeout(2_000); }
    await expect(restartHere, "the questions are started again").toHaveCount(0, { timeout: 30_000 });
    const begin = page.getByRole("button", { name: /Answer questions one at a time/ });
    if (await begin.isVisible({ timeout: 5_000 }).catch(() => false)) await begin.click();
    const send = page.getByTestId("guided-send-saved-story");
    if (await send.isVisible({ timeout: 20_000 }).catch(() => false)) await send.click();
    // The story read again (the stand-in suggests the same kind on this opening story).
    await expect(page.locator("[data-testid=guided-message][data-from=assistant]").first().or(page.getByTestId("claim-type-suggestion")).first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(5_000);
    await expect(page.getByTestId("claim-type-suggestion"), "the kind turned down is not offered again").toHaveCount(0);
  } finally {
    await deleteHarnessUser(userId);
  }
});
