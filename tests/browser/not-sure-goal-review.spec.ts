/**
 * THE GOAL SAID "NOT SURE" IN THE SMALL CLAIMS GUIDED CHAT IS NEVER AN EMPTY GOAL BOX IN THE REVIEW,
 * NOR ASKED AGAIN ANYWHERE AFTER (founder, 1 Nov; strict check, NOT a carry-list entry).
 *
 * Seen once (run 41347257269 attempt 1), not reproduced, no code-line cause. The staging carry run
 * 41347257269 attempt 1 (Small Claims, signed in, questions route) recorded "asked-twice wants @
 * review-entry@/builder?step=guided: twice: Goal (given at sc-chat:sc-remedy-sought@/builder?step=guided
 * "unsure")": the goal answered "unsure" in the guided chat, then an empty Goal box in the review's
 * summary (`[data-testid=intake-entry][data-empty=true]`, harness/askOnce.ts "review-entry"). Attempt 2
 * was clean. This spec drives exactly that path, every time, and fails on any such box or re-ask.
 *
 * Steps, signed in through the real save path:
 *   1. the Small Claims guided chat; to sc-remedy-sought the person types "unsure" (the carry's words);
 *   2. the saved case (read back from staging through the case file) holds the goal not sure;
 *   3. the review opened from /builder?step=guided (the carry's page): no empty Goal box, no review
 *      question asking for it, not counted in "N still to answer"; the quiet line is there;
 *   4. the same after a reload, on the whole form (&step=form) and on the case page;
 *   5. the ask-once recorder over every screen visited: no ask of the goal after "unsure".
 * Its terminal twin: scripts/verification/verifyNotSureGoalReview.ts (npm run test:not-sure-goal-review).
 *
 * WHAT FAILURE THIS CATCHES: the goal said "not sure" in the guided chat offered again in an empty
 * review box (the run 41347257269 record), listed or counted as still to answer, or asked again on the
 * form, the case page or after a reload.
 *
 * THE REAL SAVE PATH (needs staging; not run while staging is in use by PR checks): a real staging user
 * and session (authenticateRealTestUser, refuses production), the case saved to and read back from the
 * staging database. Stand-ins, the only ones: the routes that would call a model (serveModelStandIns) and
 * the situation answers clicked by the harness (autoAnswerSituation).
 */
import { expect, test, type Page } from "@playwright/test";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { NOT_ANSWERED_YET } from "../../src/lib/case-system/copy/askCopy";
import { slotsOfQuestion } from "../../src/lib/case-system/caseFile/caseFile";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser, harnessAdmin } from "./harness/realTestSession";
import { answerSituation, autoAnswerSituation, situationAnswersFor, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { factsAskedTwice, heldFacts, heldViolations, recordAsks, type Asked, type HeldState } from "./harness/askOnce";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

const COURT = "small-claims" as const;
const FACT = "wants";
const QUESTION = "sc-remedy-sought";
const STORY = "Synthetic: I repaired a client's fence in May 2026 and they never paid the $2,400 invoice. I have the invoice and texts.";

const panelOf = (page: Page) => page.getByTestId("intake-review");
const idOf = (page: Page) => { const url = new URL(page.url()); return url.searchParams.get("intake") ?? url.searchParams.get("caseId") ?? ""; };

async function passNotice(page: Page) {
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  const situation = page.getByTestId("situation-questions");
  const ready = page.getByTestId("intake-review").or(page.getByRole("button", { name: /Answer questions one at a time/ })).or(page.getByTestId("sc-intake-otherParty")).or(page.getByTestId("completed-case-overview"));
  for (let round = 0; round < 5; round++) {
    await expect(acknowledgement.or(situation).or(ready).first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(1_500);
    if (await acknowledgement.isVisible().catch(() => false)) {
      if (!(await acknowledgement.isChecked().catch(() => true))) await acknowledgement.check({ timeout: 10_000 }).catch(() => {});
      const proceed = page.getByTestId("acknowledgement-continue");
      if (await proceed.isEnabled().catch(() => false)) await proceed.click({ timeout: 10_000 }).catch(() => {});
      await expect(page.getByTestId("first-use-acknowledgement")).toBeHidden({ timeout: 30_000 });
      continue;
    }
    if (await situation.isVisible().catch(() => false)) { await answerSituation(page, situationAnswersFor(page)); continue; }
    return;
  }
}

/** The guided chat: "unsure" to sc-remedy-sought, an answer to everything else. Returns whether it was asked. */
async function guidedChat(page: Page): Promise<boolean> {
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 5_000 }).catch(() => false)) await send.click();
  let last = "";
  let saidUnsure = false;
  for (let i = 0; i < 25; i++) {
    const finished = page.getByText("That's everything needed for now");
    const proposals = page.getByTestId("story-proposals");
    const question = page.locator("[data-testid=guided-message][data-from=assistant]").last();
    await expect(finished.or(proposals).or(question).first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(600);
    if (await finished.isVisible().catch(() => false)) break;
    if (await proposals.isVisible().catch(() => false)) {
      await proposals.getByTestId("story-proposals-continue").click();
      await expect(proposals.getByTestId("working-note")).toHaveCount(0, { timeout: 120_000 });
      continue;
    }
    const text = (await question.innerText()).replace(/\s+/g, " ");
    if (text === last) break;
    last = text;
    const id = await page.locator("[data-testid=guided-message][data-question-id]").last().getAttribute("data-question-id");
    const answer = id === QUESTION ? "unsure"
      : /add the year/i.test(text) ? "October 6, 2026"
      : /how much|amount/i.test(text) ? "$2,400"
      : /\bwho\b.*\b(other party|suing|sue|defendant)|name of the (other|person|business)/i.test(text) ? "Jordan Testwood"
      : /when|date/i.test(text) ? "May 12, 2026"
      : /bringing this claim|responding to a claim/i.test(text) ? "Bringing the claim (plaintiff)"
      : /kind of dispute/i.test(text) ? "Unpaid invoice"
      : /filed|served/i.test(text) ? "No"
      : "Synthetic: the invoice and texts";
    if (id === QUESTION) saidUnsure = true;
    const before = await page.locator("[data-testid=guided-message]").count();
    await page.locator("textarea").last().fill(answer);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 60_000 }).toBeGreaterThan(before + 1).catch(() => {});
  }
  return saidUnsure;
}

async function openReview(page: Page, caseId: string, step: string) {
  await page.goto(`/builder?path=${COURT}&intake=${caseId}${step}`);
  await passNotice(page);
  const panel = panelOf(page);
  await expect(panel).toBeVisible({ timeout: 60_000 });
  const phase = await panel.getAttribute("data-phase");
  if (phase === "collecting") { await expect(page.getByTestId("intake-start-review")).toBeEnabled({ timeout: 60_000 }); await page.getByTestId("intake-start-review").click(); }
  if (phase === "user-confirmed") await page.getByTestId("intake-view-review").click();
  await expect(panel.locator("[data-testid=intake-entry]").first()).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1_500);
}

/** The review: no empty Goal box (the run 41347257269 record), no question for the goal, not counted, the quiet line shown. */
async function checkReview(page: Page, where: string) {
  const panel = panelOf(page);
  const emptyBoxes = (await panel.locator("[data-testid=intake-entry][data-empty=true]").evaluateAll((items) => items.map((item) => item.getAttribute("data-field") ?? ""))).filter((field) => slotsOfQuestion(field).includes(FACT));
  expect(emptyBoxes, `no empty Goal box in the review (${where})`).toEqual([]);
  const asking = (await panel.locator("[data-testid=intake-initial-question][data-answered=false]").evaluateAll((items) => items.map((item) => item.getAttribute("data-question") ?? ""))).filter((id) => slotsOfQuestion(id).includes(FACT));
  expect(asking, `no review question asks for the goal (${where})`).toEqual([]);
  const count = page.getByTestId("intake-remaining-count");
  if (await count.count()) {
    const left = Number((await count.innerText()).match(/^(\d+) still to answer/)?.[1] ?? 0);
    const unanswered = await panel.locator("[data-testid=intake-initial-question][data-answered=false]").count();
    expect(left, `"N still to answer" counts only questions still asked, never the goal said not sure (${where})`).toBe(unanswered);
  }
  await expect(panel.locator(`[data-testid=not-answered-yet][data-fact="${FACT}"]`).first(), `the quiet line is shown for the goal (${where})`).toContainText(NOT_ANSWERED_YET, { timeout: 30_000 });
}

test("the goal said \"unsure\" in the Small Claims guided chat is never an empty Goal box or asked again (seen once, run 41347257269 attempt 1)", async ({ page }) => {
  test.setTimeout(900_000);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  let caseId = "";
  let held: Map<string, HeldState> | null = null;
  const admin = harnessAdmin();
  const savedMaster = async () => ((await admin.from("cases").select("master_result").eq("id", caseId).eq("user_id", userId).maybeSingle()).data as { master_result?: Record<string, unknown> } | null)?.master_result ?? null;
  const refresh = setInterval(async () => { if (!caseId) return; const master = await savedMaster(); held = master ? heldFacts(master, COURT) : null; }, 2_000);
  const asked: Asked[] = await recordAsks(page, { held: () => (held ? (fact: string) => held!.get(fact) ?? null : null) });
  try {
    await serveModelStandIns(page, COURT, userId);
    await page.goto(`/?path=${COURT}`);
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("City or municipality").fill("Kingston");
    await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY);
    await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
    await passNotice(page);
    caseId = idOf(page);
    expect(caseId, "the case is saved").not.toBe("");

    // 1-2. "unsure" to sc-remedy-sought; the saved case holds the goal not sure.
    expect(await guidedChat(page), `the guided chat asked ${QUESTION} and the person typed "unsure"`).toBe(true);
    await expect.poll(async () => { const master = await savedMaster(); return master ? heldFacts(master, COURT).get(FACT) ?? "none" : "none"; }, { timeout: 60_000, message: "the saved case holds the goal as unsure" }).toBe("unsure");

    // 3. The review from the guided page (the carry's page), then after a reload.
    await openReview(page, caseId, "&step=guided");
    await checkReview(page, "review from the guided page");
    await page.reload();
    await openReview(page, caseId, "&step=guided");
    await checkReview(page, "after a reload");
    // 4. The whole form, and its review.
    await page.goto(`/builder?path=${COURT}&intake=${caseId}&step=form`);
    await passNotice(page);
    await expect(page.locator(`[data-testid=not-answered-yet][data-fact="${FACT}"]`).first(), "the whole form shows the quiet line, not an empty Goal box").toBeVisible({ timeout: 60_000 });
    await openReview(page, caseId, "&step=form");
    await checkReview(page, "review from the whole form");
    // Confirm (the goal said "unsure" never blocks it), the overview, then the case page (it exists once
    // the intake is confirmed and the next step made, as in not-sure-never-asked.spec.ts).
    const panel = panelOf(page);
    const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
    while (await unknowns.count()) { const left = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(left - 1, { timeout: 20_000 }); }
    await page.getByTestId("intake-review-acknowledgement").check();
    await expect(page.getByTestId("intake-confirm"), "Confirm is not blocked by the goal said not sure").toBeEnabled({ timeout: 30_000 });
    await page.getByTestId("intake-confirm").click();
    await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
    await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
    await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 180_000 });
    await page.waitForTimeout(3_000);
    await page.goto(`/cases/${caseId}`);
    await expect(page.getByTestId("case-file")).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(1_500);
    await expect(page.locator(`[data-testid=case-file-line][data-fact="${FACT}"] [data-testid=case-file-answer-now]`), "no answer-now offer for the goal on the case page").toHaveCount(0);

    // 5. Every screen the recorder saw: no ask of the goal after "unsure".
    const reasks = heldViolations(asked).filter((violation) => violation.fact === FACT);
    // The carry's own count ("asked-twice"): the goal given in the chat, then asked on any later screen.
    const twice = factsAskedTwice(asked, STARTING_NOTHING_FILED).filter((repeat) => repeat.fact === FACT);
    expect.soft(twice.map((repeat) => `twice: ${repeat.asks.map((ask) => `${ask.surface}:${ask.id}@${ask.screen}`).join(", ")} (given at ${repeat.given.surface}:${repeat.given.id})`), "the carry count: the goal is not asked twice").toEqual([]);
    expect(reasks.map((violation) => `${violation.fact} @ ${violation.surface}:${violation.id} on ${violation.screen}: ${violation.detail}`), "no screen asked the goal again after \"unsure\"").toEqual([]);
  } finally {
    clearInterval(refresh);
    await deleteHarnessUser(userId);
  }
});
