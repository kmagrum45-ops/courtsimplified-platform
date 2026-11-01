/**
 * QUESTIONS ANSWERED IN THE REVIEW COME FROM THE SAVED CASE, NOT FROM THE PAGE (fault 1, 31 Oct).
 *
 * The owner's rule: no list of what the person answered, has held, removed, was offered or turned down
 * may live in component state or in the tab. On d9b4dda4 the review (IntakeReviewPanel) kept the
 * questions answered there in page state (useState answeredHere) and their order in a useRef (seenOrder):
 * after a reload, or in a second tab, an answered question vanished from its place.
 *
 * WHAT IT CHECKS, per court (Small Claims, civil, Family), signed in as a real staging user:
 *   1. the review opens with its one list, "Initial questions";
 *   2. the kind of claim (a choice) and the goal (typed) are answered there, as a person answers them,
 *      and the save is waited for (the saved row on staging holds both answers; no fixed sleep);
 *   3. each answered question is marked answered in its place (data-answered="true"), the list keeps
 *      its order, and "N still to answer" counts only the unanswered;
 *   4. the page reloads: the same list, in the same order, both still marked answered with their answer;
 *   5. a SECOND TAB (a new page in the same browser context) opened on the same case shows the same;
 *   6. confirmed, the overview (Small Claims: its kind line) and the case page ("What we have so far":
 *      the kind and what the person wants) show the same answers.
 *
 * WHAT FAILURE THIS CATCHES: an answered question that vanishes, moves, or loses its "answered" mark
 * after a reload or in another tab, because the list was held in the page rather than read from the
 * saved case through the case file (caseFileOf -> answeredInReview, sorted by reviewQuestionRank).
 * It imports nothing of the fix, so it runs against d9b4dda4 too (where it fails at step 4).
 *
 * STAND-INS, the only ones: serveModelStandIns (the routes that would call a model), and the situation
 * answers clicked by the harness (autoAnswerSituation / openBuilder, "starting, nothing filed").
 * Everything else is this build's code and the staging database. The harness user is deleted at the end.
 */
import { expect, test, type Page } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser, harnessAdmin } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { recordInitialUnknowns } from "./harness/intakeReview";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

type Court = "family" | "civil" | "small-claims";
const STORY: Record<Court, string> = {
  family: "Synthetic: we separated in May 2026 and cannot agree on dividing the house. The plum-yellow house is in both names.",
  civil: "Synthetic: a supplier never delivered the machine I ordered in April 2026. The plum-yellow invoice is all I have.",
  "small-claims": "Synthetic: a contractor I paid in April 2026 never finished my deck. The plum-yellow receipt is all I have.",
};
/** The kind question each court's review asks, and the choice made, in the words every screen shows. */
const KIND: Record<Court, { question: string; value: string; words: string }> = {
  family: { question: "issues", value: "property-division", words: "Dividing property (equalization)" },
  civil: { question: "issues", value: "contract", words: "Contract / agreement dispute" },
  "small-claims": { question: "sc-orient-dispute-category", value: "A contract or agreement dispute", words: "A contract or agreement dispute" },
};
/** The goal question, by its own words (guidedFields.ts, questionBank.ts). */
const GOAL: Record<Court, { id: string; label: string }> = {
  "small-claims": { id: "sc-remedy-sought", label: "What outcome are you asking the court to order?" },
  civil: { id: "legalRemedy", label: "What would you like the court to order?" },
  family: { id: "goal", label: "What would you like to happen in the end?" },
};

const panelOf = (page: Page) => page.getByTestId("intake-review");

async function openReview(page: Page) {
  const panel = panelOf(page);
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "collecting") { await expect(page.getByTestId("intake-start-review")).toBeEnabled({ timeout: 60_000 }); await page.getByTestId("intake-start-review").click(); }
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
}

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

/** The saved case's checkpoint sections, read from staging (refuses production). */
async function savedSections(userId: string): Promise<Record<string, any>> {
  const { data } = await harnessAdmin().from("cases").select("master_result").eq("user_id", userId);
  const checkpoint = ((data ?? []) as { master_result?: { intakeCheckpoint?: Record<string, any> } }[]).map((row) => row.master_result?.intakeCheckpoint).find(Boolean);
  return checkpoint?.sections ?? {};
}
function savedAnswers(court: Court, sections: Record<string, any>): { kind: unknown; goal: unknown } {
  if (court === "small-claims") return { kind: sections.builder?.initialAnswers?.[KIND[court].question], goal: sections.builder?.initialAnswers?.[GOAL[court].id] };
  if (court === "civil") return { kind: sections.civil?.input?.issues, goal: sections.civil?.input?.legalRemedy };
  return { kind: sections.family?.issues, goal: sections.family?.goal };
}

type Shown = { list: { id: string; answered: string | null; text: string }[]; remaining: string };
/** The review's one list as drawn: each question's id, its "answered" mark and words, in page order. */
async function shownList(page: Page): Promise<Shown> {
  const panel = panelOf(page);
  await expect(panel.getByTestId("intake-initial-questions")).toBeVisible({ timeout: 60_000 });
  const list = await panel.locator("[data-testid=intake-initial-question]").evaluateAll((nodes) => nodes.map((node) => ({
    id: node.getAttribute("data-question") ?? "",
    answered: node.getAttribute("data-answered"),
    text: (node.querySelector("[data-testid=intake-question-answered]") as HTMLElement | null)?.innerText ?? "",
  })));
  return { list, remaining: (await panel.getByTestId("intake-remaining-count").innerText()).trim() };
}

/** The review on `page` shows the same list as `expected`, both answers marked answered in their place. */
async function sameAsBefore(page: Page, court: Court, expected: Shown, goal: string, where: string) {
  await openReview(page);
  // Drawn once the saved case is read: the kind question is listed (answered) or the run fails here.
  await expect(panelOf(page).locator(`[data-testid=intake-initial-question][data-question="${KIND[court].question}"]`), `${where}: the answered kind question is still listed`).toHaveCount(1, { timeout: 30_000 }).catch(() => {});
  const now = await shownList(page);
  console.log(`[${court}] ${where}: ${JSON.stringify(now.list.map((item) => `${item.id}:${item.answered}`))} / ${now.remaining}`);
  expect.soft(now.list.map((item) => item.id), `${where}: the same questions, in the same order`).toEqual(expected.list.map((item) => item.id));
  for (const id of [KIND[court].question, GOAL[court].id]) {
    const before = expected.list.findIndex((item) => item.id === id);
    const after = now.list.findIndex((item) => item.id === id);
    expect.soft(after, `${where}: "${id}" keeps its place (${before})`).toBe(before);
    expect.soft(now.list[after]?.answered ?? "(not listed)", `${where}: "${id}" is marked answered`).toBe("true");
  }
  expect.soft(now.list.find((item) => item.id === KIND[court].question)?.text ?? "", `${where}: the kind shows its answer`).toContain(KIND[court].words);
  expect.soft(now.list.find((item) => item.id === GOAL[court].id)?.text ?? "", `${where}: the goal shows its answer`).toContain(goal);
  expect.soft(now.remaining, `${where}: the same count still to answer`).toBe(expected.remaining);
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`review answered kept (${court}): answered in the review, the same list and places after a reload, in a second tab, on the overview and the case page`, async ({ page, context }) => {
    test.setTimeout(600_000);
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    const goal = `Payment of what is owed, kept test (${court})`;
    try {
      await serveModelStandIns(page, court, userId);
      await start(page, court);
      const caseId = new URL(page.url()).searchParams.get("intake") ?? new URL(page.url()).searchParams.get("caseId") ?? "";
      const panel = panelOf(page);
      const first = await shownList(page);
      console.log(`[${court}] first drawn: ${JSON.stringify(first.list.map((item) => item.id))} / ${first.remaining}`);
      expect(first.list.map((item) => item.id), "the kind question is in the review's list").toContain(KIND[court].question);
      expect(first.list.map((item) => item.id), "the goal question is in the review's list").toContain(GOAL[court].id);

      // Answered as a person answers them.
      const kindQuestion = panel.locator(`[data-testid=intake-initial-question][data-question="${KIND[court].question}"]`);
      if (court === "small-claims") await kindQuestion.getByRole("button", { name: KIND[court].value, exact: true }).click();
      else { await kindQuestion.locator(`input[data-testid=intake-field-pick][value="${KIND[court].value}"]`).check(); await kindQuestion.getByTestId("intake-field-save").click(); }
      await expect(kindQuestion, "the kind is marked answered in its place").toHaveAttribute("data-answered", "true", { timeout: 30_000 });
      const goalBox = panel.getByLabel(`Answer: ${GOAL[court].label}`, { exact: true });
      await goalBox.fill(goal);
      await goalBox.blur();
      await expect(panel.locator(`[data-testid=intake-initial-question][data-question="${GOAL[court].id}"]`), "the goal is marked answered in its place").toHaveAttribute("data-answered", "true", { timeout: 30_000 });
      await expect(page.getByTestId("intake-save-status"), "the page says it saved").toHaveText(/Intake saved to your account\./, { timeout: 60_000 });
      await expect.poll(async () => { const held = savedAnswers(court, await savedSections(userId)); return JSON.stringify(held.kind ?? "").includes(KIND[court].value) && held.goal === goal; }, { timeout: 60_000, message: "both answers reached the saved case" }).toBe(true);

      const answered = await shownList(page);
      console.log(`[${court}] answered here: ${JSON.stringify(answered.list.map((item) => `${item.id}:${item.answered}`))} / ${answered.remaining}`);
      expect(answered.list.map((item) => item.id), "answering moved no question").toEqual(first.list.map((item) => item.id));
      const left = answered.list.filter((item) => item.answered !== "true").length;
      expect.soft(answered.remaining, "\"still to answer\" counts only the unanswered").toBe(left === 0 ? "Nothing here is still to answer." : `${left} still to answer.`);

      // Reloaded.
      await page.reload();
      await sameAsBefore(page, court, answered, goal, "after a reload");

      // A second tab on the same case.
      const second = await context.newPage();
      await serveModelStandIns(second, court, userId);
      await second.goto(page.url());
      await sameAsBefore(second, court, answered, goal, "in a second tab");
      await second.close();

      // Confirmed: the overview and the case page show the same answers.
      await recordInitialUnknowns(page);
      await page.getByTestId("intake-review-acknowledgement").check();
      await page.getByTestId("intake-confirm").click();
      await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
      await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
      await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 180_000 });
      if (court === "small-claims") {
        const kindLine = page.getByTestId("claim-kind").first();
        await expect(kindLine, "the overview's kind line is drawn").toBeVisible({ timeout: 60_000 });
        expect.soft((await kindLine.innerText()).split("\n")[0].trim(), "the overview shows the kind answered in the review").toBe(KIND[court].words);
      }
      await page.goto(`/cases/${caseId}`);
      await expect(page.getByTestId("case-file")).toBeVisible({ timeout: 60_000 });
      const kindLine = page.locator('[data-testid="case-file-line"][data-fact="claimKind"]');
      await expect(kindLine, "the case page lists the kind").toHaveCount(1, { timeout: 30_000 });
      expect.soft(await kindLine.innerText(), "the case page shows the kind answered in the review").toContain(KIND[court].words);
      const wantsLine = page.locator('[data-testid="case-file-line"][data-fact="wants"]');
      await expect(wantsLine, "the case page lists what the person wants").toHaveCount(1, { timeout: 30_000 });
      expect.soft(await wantsLine.innerText(), "the case page shows the goal answered in the review").toContain(goal);
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
