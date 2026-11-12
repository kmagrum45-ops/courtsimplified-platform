/**
 * THE CHROME CHECK OF #545 AT 7bce410 (9 Nov 2026), ON THE SCREENS CHROME SAW, IN EVERY COURT WHERE THE SCREEN EXISTS.
 *
 * With the real save path (a real local or staging account; realTestSession.ts refuses production) and the model
 * stand-ins:
 *   1. the case pages, all three courts:
 *      B6 (note 5): the next-step card says "Based on the date in your story" for a deadline counted from the story's date
 *         (Small Claims and Civil; Family's starting step counts none);
 *      B8 (note 2): the other party changed on the case page, the dashboard's case card is "Your case with" that name;
 *      B7 (1.6c): the amount changed on the case page (Small Claims, Civil), the case file page shows "Amount: $5,200.00"
 *         and the other party;
 *   2. the race (owner's yes, 9 Nov): every save of an answer delayed 4 seconds, a first change saved, a second typed in
 *      Change and Confirm pressed at once: the second is what every screen shows (the amount in Small Claims and Civil,
 *      the other party in Family, which records no amount). Failed about 1 run in 4 in the carry test before the fix.
 *   3. Family: B2 (3.4d) the situation card never asks "Which municipality do you live in?" when Home gave the city, and
 *      asks the other person's on its own; B1 (3.5) for a couple never married, the Forms tab tags no Form 8A "For your
 *      step" and lists none under "Forms for your next step".
 *
 * WHAT FAILURE THIS CATCHES: the screens Chrome saw going wrong again.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser, harnessAdmin } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { openBuilder } from "./harness/builderGate";
import { recordInitialUnknowns, tickIfAsked } from "./harness/intakeReview";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const STORIES = {
  "small-claims": { story: "Synthetic: In March 2026 I lent my friend Alex Testwood $4,500 for a car repair. He promised in a text message to pay me back by June 1, 2026. He has not paid anything back.", read: { month: 6, day: 1, date: "2026-06-01", quote: "He promised in a text message to pay me back by June 1, 2026." } },
  civil: { story: "Synthetic: In June 2025 I lent my former business partner, Dana Testwood, $85,000 by e-transfer to buy equipment. She signed a one-page note promising to repay it by March 1, 2026. She has paid nothing.", read: { month: 3, day: 1, date: "2026-03-01", quote: "promising to repay it by March 1, 2026" } },
  family: { story: "Synthetic: Jordan Testfield and I lived together from 2018 to August 2025 but never married. Our daughter is 6 and lives with me. I want a regular parenting-time schedule.", read: null },
} as const;

/** A confirmed case with its next step shown, in the given court; returns its id. */
async function confirmedCase(page: Page, court: keyof typeof STORIES): Promise<string> {
  const { story } = STORIES[court];
  if (court === "small-claims") {
    await page.goto("/?path=small-claims");
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("City or municipality").fill("Ottawa");
    await page.getByLabel(STORY_LABEL, { exact: true }).fill(story);
    await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
    const notice = page.getByTestId("acknowledgement-checkbox");
    if (await notice.waitFor({ state: "visible", timeout: 20_000 }).then(() => true, () => false)) { await notice.check(); await page.getByTestId("acknowledgement-continue").click(); }
    await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  } else {
    await openBuilder(page, court, { city: "Ottawa", story });
    await page.getByTestId("guided-form-show-form").click();
  }
  await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
  const id = new URL(page.url()).searchParams.get("intake") ?? "";
  const panel = page.getByTestId("intake-review");
  if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 30_000 });
  await recordInitialUnknowns(page);
  await tickIfAsked(page);
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
  await page.getByTestId("intake-continue-guidance").click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 240_000 });
  await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
  return id;
}

/** A line of the case page's "What we have so far": from an answer, or from the story (its amount is "amountAgainst"). */
const factLine = (page: Page, fact: string) => page.locator(`[data-testid="case-file-line"][data-fact="${fact}"], [data-testid="case-file-story-line"][data-fact="${fact}"], [data-testid="case-file-story-line"][data-fact="${fact}Against"]`).first();

/** The saved answer to a fact, as the server numbered it (the case file's fact record), and the saved title. */
async function savedRow(id: string) {
  const master = ((await harnessAdmin().from("cases").select("master_result").eq("id", id).single()).data?.master_result ?? {}) as Record<string, unknown>;
  const sections = ((master.intakeCheckpoint as Record<string, unknown> | undefined)?.sections ?? {}) as Record<string, Record<string, unknown>>;
  return { master, facts: (sections.caseFile?.facts ?? {}) as Record<string, { state: string; value?: unknown; seq: number }>, changes: sections.caseFile?.changes };
}

/**
 * STAND-IN (listed in the report): the starting answers saved straight into the fact record, as the server keeps them,
 * so the case page shows them as answers with "Change". The model stand-ins read none from the story; the real path
 * gives them through the questions. Every change after this goes through the real Change box and save.
 */
async function seedAnswers(id: string, answers: Record<string, string>) {
  const admin = harnessAdmin();
  const row = await admin.from("cases").select("master_result").eq("id", id).single();
  const master = row.data?.master_result as Record<string, any>;
  const facts = { ...(master.intakeCheckpoint.sections.caseFile?.facts ?? {}) };
  let seq = Math.max(0, ...Object.values(facts).map((fact: any) => fact.seq ?? 0));
  for (const [fact, value] of Object.entries(answers)) facts[fact] = { state: "answered", value, source: "person", at: new Date().toISOString(), seq: ++seq, question: "change" };
  master.intakeCheckpoint.sections.caseFile = { ...(master.intakeCheckpoint.sections.caseFile ?? {}), facts };
  await admin.from("cases").update({ master_result: master }).eq("id", id);
}

/** The whole form's own box for a fact (Small Claims' whole-form route), where the person changes it there. */
const formBoxFor = (page: Page, fact: string) =>
  fact === "amount" ? page.getByRole("textbox", { name: /^Amount claimed or disputed/ }) : fact === "otherParty" ? page.getByRole("textbox", { name: /^Other party name$/ }) : null;

/** The review opened from the builder, ticked and confirmed again (a changed answer is confirmed before the case file shows). */
async function confirmAgain(page: Page, id: string, court: string) {
  await page.goto(`/builder?caseId=${id}&path=${court}&review=open`);
  const panel = page.getByTestId("intake-review");
  await expect(panel).toBeVisible({ timeout: 90_000 });
  if (await panel.getAttribute("data-phase") === "user-confirmed") return;
  const start = page.getByTestId("intake-start-review").filter({ visible: true }).first();
  if (await panel.getAttribute("data-phase") === "collecting" && await start.isVisible().catch(() => false)) await start.click({ timeout: 10_000 }).catch(() => {});
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 30_000 });
  await recordInitialUnknowns(page);
  const ack = page.getByTestId("intake-review-acknowledgement");
  if (!(await ack.isChecked())) await ack.check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 120_000 });
  // The next step is shown again: until it is, the case's tabs and case file are hidden (B9, reported).
  await page.getByTestId("intake-continue-guidance").click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 240_000 });
  await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
}

/** "Change" (or "Add it") on a line of the case page's "What we have so far", typed and saved in the review it opens. */
async function changeOnCasePage(page: Page, id: string, fact: string, words: string) {
  await page.goto(`/cases/${id}`);
  const line = factLine(page, fact);
  await expect(line).toBeVisible({ timeout: 90_000 });
  await line.getByRole("link").first().click();
  const opened = page.getByTestId("intake-review").locator(`[data-testid="change-answer"][data-fact="${fact}"][data-open="true"]`);
  // Small Claims' lines open the whole form, whose own boxes hold its answers (typed there, saved as they are held).
  const formBox = formBoxFor(page, fact);
  const useForm = Boolean(formBox) && await formBox!.waitFor({ state: "visible", timeout: 15_000 }).then(() => true, () => false);
  if (!useForm) await expect(opened).toBeVisible({ timeout: 60_000 });
  if (useForm && formBox) {
    await formBox.fill(words);
    await formBox.blur();
  } else {
    await opened.getByTestId("change-answer-text").fill(words);
    await opened.getByTestId("change-answer-save").click();
  }
  // The server numbered the new answer (never only the tab's unsent change record).
  await expect.poll(async () => String((await savedRow(id)).facts[fact]?.value ?? ""), { timeout: 45_000, message: `the change of ${fact} was saved: ${JSON.stringify(await savedRow(id).then((row) => ({ fact: row.facts[fact], changes: row.changes, caseTitle: row.master.caseTitle })))}` }).toBe(words);
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`case pages: the story's date named as the story's, the dashboard title, the case file's amount and other party -- ${court}`, async ({ page }) => {
    test.setTimeout(900_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      const id = await confirmedCase(page, court);
      await seedAnswers(id, court === "family" ? { otherParty: "Jordan Testfield" } : { otherParty: court === "civil" ? "Dana Testwood" : "Alex Testwood", amount: "4500" });
      // B4 (note 1): the saved row never nests the previous record inside intakeData (rows reached 4.6 MB on staging).
      const saved = (await harnessAdmin().from("cases").select("master_result").eq("id", id).single()).data?.master_result as Record<string, unknown>;
      expect(Object.keys((saved?.intakeData ?? {}) as object), "B4: intakeData holds a copy of the whole saved record").not.toContain("masterResultPatch");
      const read = STORIES[court].read;
      if (read) {
        // The story reading's date for the step, as the case reader saves it (the stand-ins read none).
        const admin = harnessAdmin();
        const row = await admin.from("cases").select("master_result").eq("id", id).single();
        await admin.from("cases").update({ master_result: { ...(row.data?.master_result as Record<string, unknown>), casePicture: { side: null, events: [], dates: [{ questionId: "case-date-act-or-omission", ...read }] } } }).eq("id", id);
        await page.goto(`/cases/${id}`);
        await expect(page.getByTestId("stage-answer-panel")).toBeVisible({ timeout: 90_000 });
        // B6: the card names where the date came from.
        await expect(page.getByTestId("stage-answer-panel"), "B6: the card says the date is from the story").toContainText("Based on the date in your story", { timeout: 60_000 });
        await expect(page.getByTestId("stage-answer-panel"), "B6: never \"the date you gave us\" for the story's date").not.toContainText("Based on the date you gave us");
      }
      // B8: the other party changed; the dashboard's card is titled with the name.
      const name = "Morgan Testtitle";
      await changeOnCasePage(page, id, "otherParty", name);
      expect((await savedRow(id)).master.caseTitle, "B8: the title was saved with the other party").toBe(`Your case with ${name}`);
      await page.goto("/dashboard");
      await expect(page.getByTestId("dashboard-case").first().locator("h3"), "B8: the dashboard card is titled with the newest other party").toHaveText(`Your case with ${name}`, { timeout: 60_000 });
      // B7: the amount changed; the case file page shows it, and the other party.
      if (court !== "family") await changeOnCasePage(page, id, "amount", "5200");
      await confirmAgain(page, id, court);
      await page.goto(`/cases/${id}/case-file`);
      await expect(page.locator("article[data-testid=case-file]")).toBeVisible({ timeout: 90_000 });
      await expect(page.locator("article[data-testid=case-file]"), "B7: the case file shows the other party").toContainText(`Other side: ${name}`, { timeout: 30_000 });
      if (court !== "family") await expect(page.getByTestId("case-file-amount"), "B7: the case file shows the amount").toContainText(/\$5,200(\.00)?\b/);
      else await expect(page.getByTestId("case-file-amount"), "B7: no amount line when none is recorded").toHaveCount(0);
    } finally {
      await deleteHarnessUser(userId);
    }
  });

  test(`a second answer typed while the first is still saving, then Confirm: the second is kept -- ${court}`, async ({ page }) => {
    test.setTimeout(900_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      const id = await confirmedCase(page, court);
      await seedAnswers(id, court === "family" ? { otherParty: "Jordan Testfield" } : { otherParty: court === "civil" ? "Dana Testwood" : "Alex Testwood", amount: "4500" });
      // The amount in Small Claims (the whole form's own box) and Civil (the review's Change); the other party in Family,
      // which records no amount.
      const fact = court === "family" ? "otherParty" : "amount";
      const [first, second, shown] = court === "family" ? ["Pat Testone", "Pat Testtwo", "Pat Testtwo"] : ["9100", "9350", /\$9,350(\.00)?\b/];
      // Every save of an answer takes 4 seconds to come back.
      await page.route("**/api/cases/facts", async (route) => { await new Promise((resolve) => setTimeout(resolve, 4_000)); await route.continue(); });
      await page.goto(`/cases/${id}`);
      const line = factLine(page, fact);
      await expect(line).toBeVisible({ timeout: 90_000 });
      await line.getByRole("link").first().click();
      const review = page.getByTestId("intake-review");
      if (court === "small-claims") {
        // The whole form's own box: the first amount typed and left (saved as it is held), then the second typed.
        const formBox = formBoxFor(page, fact)!;
        await expect(formBox).toBeVisible({ timeout: 60_000 });
        await formBox.fill(first);
        await formBox.blur();
        await page.waitForTimeout(1_000);
        await formBox.fill("");
        await formBox.pressSequentially(second, { delay: 20 });
        await formBox.blur();
        if (await review.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
      } else {
        const box = review.locator(`[data-testid="change-answer"][data-fact="${fact}"]`).first();
        await expect(box).toHaveAttribute("data-open", "true", { timeout: 60_000 });
        await box.getByTestId("change-answer-text").fill(first);
        await box.getByTestId("change-answer-save").click();
        // While that save is on its way: the second answer typed in Change, and Confirm pressed straight away.
        await expect(page.getByTestId("intake-confirm")).toBeVisible({ timeout: 30_000 });
        if (await box.getByTestId("change-answer-open").isVisible().catch(() => false)) await box.getByTestId("change-answer-open").click();
        await box.getByTestId("change-answer-text").fill("");
        await box.getByTestId("change-answer-text").pressSequentially(second, { delay: 20 });
      }
      await expect(page.getByTestId("intake-confirm")).toBeVisible({ timeout: 30_000 });
      const ack = page.getByTestId("intake-review-acknowledgement");
      if (await ack.isVisible().catch(() => false) && !(await ack.isChecked())) await ack.check();
      await page.getByTestId("intake-confirm").click();
      // A Confirm pressed while the first save is still on its way may be refused with "Your initial facts changed. Review
      // them again before confirming." (a message, never a silent click; reported separately, 9 Nov). The person ticks
      // and confirms again; the newest answer must survive either way.
      const refused = page.getByText("Your initial facts changed. Review them again before confirming.");
      await expect(review.and(page.locator('[data-phase="user-confirmed"]')).or(refused).first()).toBeVisible({ timeout: 120_000 });
      if (await refused.isVisible().catch(() => false)) {
        console.log(`RACE CONFIRM REFUSED ONCE [${court}]`);
        if (!(await ack.isChecked())) await ack.check();
        await page.getByTestId("intake-confirm").click();
      }
      await expect(review).toHaveAttribute("data-phase", "user-confirmed", { timeout: 120_000 });
      await expect.poll(async () => JSON.stringify((await harnessAdmin().from("cases").select("master_result").eq("id", id).single()).data?.master_result ?? {}).includes(second), { timeout: 60_000, message: "the second answer was saved" }).toBe(true);
      await page.unroute("**/api/cases/facts");
      await page.goto(`/cases/${id}`);
      await expect(factLine(page, fact), "the newest answer shows, never the first").toContainText(shown, { timeout: 90_000 });
      await expect(page.getByText("Not saved yet"), "no \"Not saved yet\" for the tab's own save").toHaveCount(0);
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}

test("Family, never married: the municipality Home gave is not asked again; Form 8A is not \"For your step\"", async ({ page }) => {
  test.setTimeout(900_000);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    await serveModelStandIns(page, "family", userId);
    const id = await confirmedCase(page, "family");
    // The situation card, answered as the person would, until it has nothing more to ask.
    const triage = page.getByTestId("family-status-triage");
    await expect(triage).toBeVisible({ timeout: 90_000 });
    const asked: string[] = [];
    for (let turn = 0; turn < 10; turn++) {
      const question = triage.getByTestId("triage-question");
      if (!(await question.isVisible({ timeout: 10_000 }).catch(() => false))) break;
      const key = (await question.getAttribute("data-question")) ?? "";
      asked.push(key);
      if (key === "married-to-other-party") await question.getByTestId("triage-answer-no").click();
      else if (key === "other-party-municipality") { await question.getByTestId("triage-municipality-other").fill("Gatineau"); await question.getByTestId("triage-municipality-record").click(); }
      else if (key === "municipalities") break;
      else if (await question.getByTestId("triage-answer-yes").isVisible().catch(() => false)) await question.getByTestId("triage-answer-yes").click();
      else if (await question.getByTestId("triage-dates-record").isEnabled().catch(() => false)) await question.getByTestId("triage-dates-record").click();
      else await question.getByTestId("triage-answer-not-yet").first().click();
      await expect.poll(async () => ((await question.count()) ? (await question.getAttribute("data-question", { timeout: 2_000 }).catch(() => "")) ?? "" : ""), { timeout: 20_000 }).not.toBe(key);
    }
    expect(asked, "B2: \"Which municipality do you live in?\" asked although Home gave Ottawa").not.toContain("municipalities");
    expect(asked, "B2: the other person's municipality is asked on its own").toContain("other-party-municipality");
    await expect(triage.getByTestId("triage-recorded").filter({ hasText: "Ottawa" }), "B2: Ottawa is what is recorded").toHaveCount(1);
    await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
    await page.waitForTimeout(3_000);
    // B1: the Forms tab, for a couple who recorded they were never married.
    await page.goto(`/cases/${id}/forms`);
    await expect(page.getByText("Forms for your next step").first()).toBeVisible({ timeout: 90_000 });
    const card8A = page.locator("article").filter({ has: page.locator("span", { hasText: /^Form 8A$/i }) });
    await expect(card8A.first()).toBeVisible({ timeout: 90_000 });
    await expect(card8A.getByTestId("form-for-your-step"), "B1: Form 8A is tagged \"For your step\"").toHaveCount(0);
    await expect(page.getByTestId("next-step-practical").getByText(/Form 8A\b/), "B1: Form 8A is under \"Forms for your next step\"").toHaveCount(0);
  } finally {
    await deleteHarnessUser(userId);
  }
});
