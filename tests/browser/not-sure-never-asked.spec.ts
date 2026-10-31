/**
 * "NOT SURE" IS NEVER ASKED AGAIN, ON ANY SCREEN, IN ALL THREE COURTS (site owner, 31 Oct).
 *
 * The owner's rule replaces option 1 of 24 Oct ("a not-sure fact gets one review offer"): after a
 * person says "I don't know" or "not sure" -- typed in the Small Claims guided chat, a skip in the
 * civil or Family questions one at a time, or "I don't know" typed in the whole form -- no screen
 * asks that question again: not the review, not the whole form, not the overview, not the case page,
 * not after a reload. The review shows a quiet line instead, "Not answered yet: add it when you know"
 * (askCopy.ts NOT_ANSWERED_YET), with a control (ChangeAnswer) to fill it in, which saves through the
 * one change path (the case file's change record).
 *
 * What it checks, per court and per way of saying it, signed in through the real save path:
 *   1. the ask-once recorder (harness/askOnce.ts, the held check reading the saved staging row through
 *      caseFileOf) records NO question, empty review box, empty form field or answer-now offer for a
 *      fact the saved case holds as unsure, on any screen it visits;
 *   2. the review: the fact shows the quiet line with its control; no question and no empty box asks
 *      for it; it is not counted as still to answer; Confirm is not blocked by it;
 *   3. the whole form (after the chat): the fact shows the quiet line, not an empty box;
 *   4. the case page ("What we have so far"): the fact shows the quiet line, with no answer-now offer;
 *   5. after a reload, the same on the review and the case page;
 *   6. the review's control fills it in: the value is saved in the case file's change record (read
 *      back from staging) and the review then shows it as the person's answer.
 *
 * WHAT FAILURE THIS CATCHES: the review's held-unsure box or question (its "one more offer"), the
 * questions' story offer of an unsure fact, a form field asking again, the case page offering it again,
 * a not-sure fact counted as remaining, or a quiet line whose control does not save.
 *
 * THE REAL SAVE PATH: a real staging user and session (authenticateRealTestUser, refuses production);
 * the case saved to and read back from the staging database by the page's own code. Stand-ins, the
 * only ones: the routes that would call a model (serveModelStandIns), and the situation answers clicked
 * by the harness (autoAnswerSituation / openBuilder).
 */
import { expect, test, type Page } from "@playwright/test";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { NOT_ANSWERED_YET } from "../../src/lib/case-system/copy/askCopy";
import { slotsOfQuestion } from "../../src/lib/case-system/caseFile/caseFile";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser, harnessAdmin } from "./harness/realTestSession";
import { answerSituation, autoAnswerSituation, situationAnswersFor, STARTING_NOTHING_FILED } from "./harness/situation";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns, type Court } from "./harness/thisCommitServer";
import { heldFacts, heldViolations, recordAsks, type Asked, type HeldState } from "./harness/askOnce";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

const FACT = "wants";
const STORY: Record<Court, string> = {
  "small-claims": "A moving company broke my dining table in May 2026. Their truck was parked outside. I have photos.",
  civil: "Synthetic: a supplier never delivered the machine I ordered in April 2026. The plum-yellow invoice is all I have.",
  family: "Synthetic: we separated in May 2026 and cannot agree on dividing the house. The plum-yellow house is in both names.",
};
/** The whole form's box for what they want, by court. */
const FORM_BOX: Record<Court, string> = { "small-claims": "sc-intake-goal", civil: "What do you want ordered?", family: "What do you want the court to order?" };
const ADDED = "Synthetic: the cost of the table repaired";
const SIDE: Record<Court, string> = { "small-claims": "plaintiff", civil: "plaintiff", family: "applicant" };
const ISSUE: Record<Court, string> = { "small-claims": "", civil: "contract", family: "property-division" };

const idOf = (page: Page) => { const url = new URL(page.url()); return url.searchParams.get("intake") ?? url.searchParams.get("caseId") ?? ""; };
const panelOf = (page: Page) => page.getByTestId("intake-review");

async function passNotice(page: Page) {
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  const situation = page.getByTestId("situation-questions");
  const ready = page.getByTestId("intake-review").or(page.getByTestId("guided-form-question")).or(page.getByTestId("guided-form-show-form"))
    .or(page.getByRole("button", { name: "Fill in the form yourself" })).or(page.getByTestId("sc-intake-otherParty")).or(page.getByTestId("completed-case-overview"));
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

async function giveStory(page: Page, court: Court) {
  if (court === "small-claims") {
    await page.goto("/?path=small-claims");
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("City or municipality").fill("Kingston");
    await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY[court]);
    await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
    await passNotice(page);
  } else {
    await openBuilder(page, court, { city: "Kingston", story: STORY[court], situation: STARTING_NOTHING_FILED });
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 }).catch(() => {});
  }
}

/** The Small Claims questions one at a time: "I don't know" for what they want, an answer for the rest. Returns the question it said it to. */
async function smallClaimsChat(page: Page): Promise<string | null> {
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 5_000 }).catch(() => false)) await send.click();
  let last = "";
  let notSure: string | null = null;
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
    const wants = id ? slotsOfQuestion(id).includes(FACT) : /court to order|outcome|trying to get/i.test(text);
    const answer = wants ? "I don't know"
      : /add the year/i.test(text) ? "October 6, 2026"
      : /how much|amount/i.test(text) ? "$2,400"
      : /\bwho\b.*\b(other party|suing|sue|defendant)|name of the (other|person|business)/i.test(text) ? "Jordan Testwood"
      : /when|date/i.test(text) ? "March 3, 2026"
      : /bringing this claim|responding to a claim/i.test(text) ? "Bringing the claim (plaintiff)"
      : /kind of dispute/i.test(text) ? "Property damage"
      : /filed|served/i.test(text) ? "No"
      : "Synthetic: photos of the table";
    if (wants) notSure = id ?? "wants";
    const before = await page.locator("[data-testid=guided-message]").count();
    await page.locator("textarea").last().fill(answer);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 60_000 }).toBeGreaterThan(before + 1).catch(() => {});
  }
  return notSure;
}

/** Civil and Family questions one at a time: a skip for what they want, an answer for the rest. Returns whether it was skipped. */
async function oneAtATime(page: Page, court: Court): Promise<boolean> {
  let skippedIt = false;
  for (let i = 0; i < 30; i++) {
    const question = page.getByTestId("guided-form-question");
    if (!(await question.isVisible({ timeout: 10_000 }).catch(() => false))) break;
    const key = (await question.getAttribute("data-key")) ?? "";
    const yes = question.getByTestId("guided-form-from-story-yes");
    const no = question.getByTestId("guided-form-from-story-no");
    if (slotsOfQuestion(key).includes(FACT)) {
      if (await no.isVisible().catch(() => false)) await no.click();
      await question.getByTestId("guided-form-skip").click();
      skippedIt = true;
      continue;
    }
    if (key === "yourRole") {
      if (await yes.isVisible().catch(() => false)) { await yes.click(); continue; }
      await question.getByTestId(`guided-option-${SIDE[court]}`).click();
      continue;
    }
    if (key === "documents" || key === "filedDocuments" || key === "issues") {
      if (await no.isVisible().catch(() => false)) await no.click();
      await question.getByTestId(`guided-check-${key === "issues" ? ISSUE[court] : "nothing"}`).check();
      await question.getByTestId("guided-form-next").click();
      continue;
    }
    if (await yes.isVisible().catch(() => false)) { await yes.click(); continue; }
    await question.getByTestId("guided-form-skip").click();
  }
  return skippedIt;
}

/** The whole form: "I don't know" typed in the box for what they want. */
async function wholeForm(page: Page, court: Court) {
  if (court === "small-claims") {
    await page.getByRole("button", { name: "Fill in the form yourself" }).click();
    const box = page.getByTestId(FORM_BOX[court]);
    await box.fill("I don't know");
    await box.blur();
  } else {
    const show = page.getByTestId("guided-form-show-form");
    await expect(show).toBeVisible({ timeout: 60_000 });
    await show.click();
    const box = page.locator("label").filter({ has: page.locator("span.font-semibold", { hasText: new RegExp(`^${FORM_BOX[court].replace(/[?().]/g, "\\$&")}$`) }) }).locator("textarea").first();
    await box.fill("I don't know");
    await box.blur();
  }
}

/** The questions of the review that ask for the fact (not answered, not quiet), and its empty boxes. */
async function reviewAsks(page: Page): Promise<string[]> {
  const panel = panelOf(page);
  const asked: string[] = [];
  for (const id of await panel.locator("[data-testid=intake-initial-question][data-answered=false]").evaluateAll((items) => items.map((item) => item.getAttribute("data-question") ?? ""))) if (slotsOfQuestion(id).includes(FACT)) asked.push(`question ${id}`);
  for (const id of await panel.locator("[data-testid=intake-entry][data-empty=true]").evaluateAll((items) => items.map((item) => item.getAttribute("data-field") ?? ""))) if (slotsOfQuestion(id).includes(FACT)) asked.push(`empty box ${id}`);
  return asked;
}

async function openReview(page: Page, court: Court, caseId: string, step: string) {
  await page.goto(`/builder?path=${court}&intake=${caseId}${step}`);
  await passNotice(page);
  const panel = panelOf(page);
  await expect(panel).toBeVisible({ timeout: 60_000 });
  const phase = await panel.getAttribute("data-phase");
  if (phase === "collecting") { await expect(page.getByTestId("intake-start-review")).toBeEnabled({ timeout: 60_000 }); await page.getByTestId("intake-start-review").click(); }
  if (phase === "user-confirmed") await page.getByTestId("intake-view-review").click();
  await expect(panel.locator("[data-testid=intake-entry]").first()).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1_500);
}

/** The review as it must be: the quiet line with its control, nothing asking, not counted. */
async function checkReview(page: Page, where: string) {
  const panel = panelOf(page);
  const quiet = panel.locator(`[data-testid=not-answered-yet][data-fact="${FACT}"]`).first();
  await expect.soft(quiet, `the review shows the quiet line for what they want (${where})`).toBeVisible({ timeout: 30_000 });
  await expect.soft(quiet, `in the owner's words (${where})`).toContainText(NOT_ANSWERED_YET);
  await expect.soft(quiet.getByTestId("change-answer-open"), `with a control to fill it in (${where})`).toBeVisible();
  expect.soft(await reviewAsks(page), `no question or empty box in the review asks for it again (${where})`).toEqual([]);
}

async function checkCasePage(page: Page, caseId: string, where: string) {
  await page.goto(`/cases/${caseId}`);
  await expect(page.getByTestId("case-file")).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(1_500);
  const line = page.locator(`[data-testid=case-file-line][data-fact="${FACT}"]`);
  await expect.soft(line, `the case page lists what they want once (${where})`).toHaveCount(1);
  await expect.soft(line.getByTestId("not-answered-yet"), `as the quiet line (${where})`).toContainText(NOT_ANSWERED_YET);
  await expect.soft(page.getByTestId("case-file-answer-now"), `no answer-now offer on the case page (${where})`).toHaveCount(0);
}

type Entry = "chat" | "form";
const RUNS: { court: Court; entry: Entry }[] = (["small-claims", "civil", "family"] as Court[]).flatMap((court) => (["chat", "form"] as Entry[]).map((entry) => ({ court, entry })));

for (const { court, entry } of RUNS) {
  test(`not sure is never asked again -- ${court} ${entry === "chat" ? "questions" : "whole form"}`, async ({ page }) => {
    test.setTimeout(900_000);
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    let caseId = "";
    let held: Map<string, HeldState> | null = null;
    const admin = harnessAdmin();
    const savedMaster = async () => ((await admin.from("cases").select("master_result").eq("id", caseId).eq("user_id", userId).maybeSingle()).data as { master_result?: Record<string, unknown> } | null)?.master_result ?? null;
    const refresh = setInterval(async () => { if (!caseId) return; const master = await savedMaster(); held = master ? heldFacts(master, court) : null; }, 2_000);
    const asked: Asked[] = await recordAsks(page, { held: () => (held ? (fact: string) => held!.get(fact) ?? null : null) });
    try {
      await serveModelStandIns(page, court, userId);
      await giveStory(page, court);
      caseId = idOf(page);
      expect(caseId, "the case is saved").not.toBe("");

      // 1. "Not sure", said the chosen way.
      if (entry === "chat") {
        if (court === "small-claims") expect(await smallClaimsChat(page), "the chat asked what they want, and they said \"I don't know\"").not.toBeNull();
        else expect(await oneAtATime(page, court), "the questions asked what they want, and they skipped it").toBe(true);
      } else await wholeForm(page, court);
      // The saved case holds it as unsure (the real save path).
      await expect.poll(async () => { const master = await savedMaster(); return master ? heldFacts(master, court).get(FACT) ?? "none" : "none"; }, { timeout: 60_000, message: "the saved case holds what they want as unsure" }).toBe("unsure");

      // 2. The whole form after the chat: the quiet line, not an empty box.
      if (entry === "chat") {
        await page.goto(`/builder?path=${court}&intake=${caseId}${court === "small-claims" ? "&step=form" : ""}`);
        await passNotice(page);
        if (court !== "small-claims") { const show = page.getByTestId("guided-form-show-form"); if (await show.isVisible({ timeout: 20_000 }).catch(() => false)) await show.click(); }
        await expect.soft(page.locator(`[data-testid=not-answered-yet][data-fact="${FACT}"]`).first(), "the whole form shows the quiet line, not an empty box").toBeVisible({ timeout: 60_000 });
      }

      // 3. The review: the quiet line, nothing asking, not counted, Confirm not blocked.
      const step = court === "small-claims" ? (entry === "chat" ? "&step=guided" : "&step=form") : "";
      await openReview(page, court, caseId, step);
      await checkReview(page, "first look");
      const panel = panelOf(page);
      const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
      while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1, { timeout: 20_000 }); }
      await expect(page.getByTestId("intake-remaining-count").or(panel.locator("[data-testid=intake-confirm]")).first()).toBeVisible();
      if (await page.getByTestId("intake-remaining-count").count()) expect(await page.getByTestId("intake-remaining-count").innerText(), "nothing is still to answer once the rest is marked").toMatch(/^Nothing here is still to answer/);
      await page.getByTestId("intake-review-acknowledgement").check();
      await expect(page.getByTestId("intake-confirm"), "Confirm is not blocked by a not-sure fact").toBeEnabled({ timeout: 30_000 });
      await page.getByTestId("intake-confirm").click();
      await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });

      // 4. The overview.
      await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
      await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 180_000 });
      await page.waitForTimeout(3_000);

      // 5. The case page, then a reload of it and of the review.
      await checkCasePage(page, caseId, "after confirm");
      await page.reload();
      await checkCasePage(page, caseId, "after a reload");
      await openReview(page, court, caseId, step);
      await checkReview(page, "after a reload");

      // 6. Every screen the recorder saw, up to here: no question, box, field or offer for a fact held unsure.
      const unsureAsks = heldViolations(asked).filter((violation) => violation.detail === "held unsure");
      expect.soft(unsureAsks.map((violation) => `${violation.fact} @ ${violation.surface}:${violation.id} on ${violation.screen}: ${violation.text}`), "no screen asked a not-sure fact again").toEqual([]);
      // 7. Filled in through the quiet line's control: the change path saves it.
      const quiet = panel.locator(`[data-testid=not-answered-yet][data-fact="${FACT}"]`).first();
      await quiet.getByTestId("change-answer-open").click();
      await quiet.getByTestId("change-answer-text").fill(ADDED);
      await quiet.getByTestId("change-answer-save").click();
      await expect.poll(async () => { const master = await savedMaster(); const changes = ((master?.intakeCheckpoint as { sections?: Record<string, { changes?: Record<string, { value?: unknown }> }> } | undefined)?.sections?.caseFile?.changes ?? {}); return changes[FACT]?.value ?? null; }, { timeout: 60_000, message: "the added answer is saved in the case file's change record" }).toBe(ADDED);
      await expect(panel.locator(`[data-testid=intake-entry-held][data-fact="${FACT}"]`).first(), "the review then shows it as the person's answer").toContainText(ADDED, { timeout: 30_000 });
      await expect(panel.locator(`[data-testid=not-answered-yet][data-fact="${FACT}"]`), "and no quiet line for it remains").toHaveCount(0);

    } finally {
      clearInterval(refresh);
      await deleteHarnessUser(userId);
    }
  });
}
