/**
 * Answers the situation questions (step 2) that now come before the story in every area:
 * where the person is, whether they started a case already going, which papers and the
 * day, whether anything was filed, and the court when asked. One helper, so every spec
 * that starts an intake answers them the same way.
 */
import { expect, type Page } from "@playwright/test";

export type SituationAnswers = {
  where: "starting" | "served" | "going";
  started?: "me" | "them";
  /** "<court>-<form number>" (e.g. "small-claims-7A"), "other" or "not-sure". */
  papers?: string;
  /** The day typed, e.g. "October 6, 2026", or "unknown". */
  receivedOn?: string;
  filed?: "nothing" | "something";
  court?: "small-claims" | "civil" | "family";
  /** For a case already going: the stage map step (its id), or "not-sure" (the default). */
  stage?: string;
};

export const STARTING_NOTHING_FILED: SituationAnswers = { where: "starting", filed: "nothing" };

/** The situation that fits a side: bringing a case with nothing filed, or served with papers not named. */
export function situationForSide(side: "plaintiff" | "defendant" | "applicant" | "respondent" | "bringing" | "responding", papers?: string, receivedOn?: string): SituationAnswers {
  return side === "defendant" || side === "respondent" || side === "responding"
    ? { where: "served", papers: papers ?? "not-sure", receivedOn: receivedOn ?? "unknown" }
    : STARTING_NOTHING_FILED;
}

/** Answers each situation question shown until there are none. Does nothing when none is shown. */
export async function answerSituation(page: Page, answers: SituationAnswers = STARTING_NOTHING_FILED): Promise<void> {
  const gate = page.getByTestId("situation-questions");
  for (let turn = 0; turn < 12; turn += 1) {
    if (!(await gate.isVisible().catch(() => false))) return;
    const question = await gate.getAttribute("data-question");
    // The page's own answerer (autoAnswerSituation's locator handler) may answer the same
    // question first: a click whose button has moved on is not waited for; the question is read again.
    const moved = async () => (await gate.isVisible().catch(() => false)) ? (await gate.getAttribute("data-question").catch(() => null)) !== question : true;
    const option = (value: string) => {
      const target = gate.locator(`[data-testid="situation-option"][data-value="${value}"], [data-testid="situation-paper"][data-value="${value}"]`).first();
      return { click: async () => { try { await target.click({ timeout: 5_000 }); } catch (error) { if (!(await moved())) throw error; } }, isVisible: () => target.isVisible() };
    };
    if (question === "where") await option(answers.where).click();
    else if (question === "started") await option(answers.started ?? "me").click();
    else if (question === "papers") {
      const value = answers.papers ?? "not-sure";
      if (!(await option(value).isVisible()) && (await gate.getByTestId("situation-papers-other-courts").isVisible())) await gate.getByTestId("situation-papers-other-courts").click();
      await option(value).click();
    } else if (question === "received") {
      if (!answers.receivedOn || answers.receivedOn === "unknown") await gate.getByTestId("situation-date-unknown").click();
      else {
        await gate.getByTestId("situation-date-input").fill(answers.receivedOn);
        await gate.getByTestId("situation-date-save").click();
      }
    } else if (question === "filed") await option(answers.filed ?? "nothing").click();
    else if (question === "court") await option(answers.court ?? "small-claims").click();
    // Served: "Nothing else yet" unless a step is given (conference audit, 2026-10-26).
    else if (question === "stage") await option(answers.stage ?? (answers.where === "served" ? "just-served" : "not-sure")).click();
    else throw new Error(`unknown situation question: ${question}`);
    // The next question, or the page behind them.
    await expect.poll(async () => (await gate.isVisible().catch(() => false)) ? await gate.getAttribute("data-question") : "done", { timeout: 15_000 }).not.toBe(question);
  }
}

const ANSWERS = new WeakMap<Page, SituationAnswers | false>();
const REGISTERED = new WeakSet<Page>();

/**
 * Answers the situation questions whenever they appear on this page (a Playwright
 * locator handler), with these answers, or the page's earlier ones. `false` leaves
 * them for the spec to answer itself. grantSiteAccess sets the default once; a spec
 * or openBuilder sets its own before navigating.
 */
export async function autoAnswerSituation(page: Page, answers: SituationAnswers | false = STARTING_NOTHING_FILED, keepEarlier = false): Promise<void> {
  if (!(keepEarlier && ANSWERS.has(page))) ANSWERS.set(page, answers);
  if (REGISTERED.has(page)) return;
  REGISTERED.add(page);
  await page.addLocatorHandler(page.getByTestId("situation-questions"), async () => {
    const chosen = ANSWERS.get(page);
    if (chosen) await answerSituation(page, chosen);
  }, { noWaitAfter: true });
}

/** The answers this page's situation questions are given (autoAnswerSituation), or the default. */
export function situationAnswersFor(page: Page): SituationAnswers {
  return ANSWERS.get(page) || STARTING_NOTHING_FILED;
}

/**
 * Gets past what now comes first on a page that starts an intake: the first-use notice
 * (builder only, when not yet given) and the situation questions, answered with this
 * page's answers. For specs that check the page right after landing, where the locator
 * handler (which runs before actions, not assertions) has not fired yet.
 */
export async function passSituationGate(page: Page): Promise<void> {
  const notice = page.getByTestId("acknowledgement-checkbox");
  const gate = page.getByTestId("situation-questions");
  const page_ = page.getByTestId("intake-review");
  await expect(notice.or(gate).or(page_).first()).toBeVisible({ timeout: 60_000 });
  if (await notice.isVisible()) {
    await notice.check();
    await page.getByTestId("acknowledgement-continue").click();
    await expect(gate.or(page_).first()).toBeVisible({ timeout: 60_000 });
  }
  if (await gate.isVisible()) await answerSituation(page, situationAnswersFor(page));
}
