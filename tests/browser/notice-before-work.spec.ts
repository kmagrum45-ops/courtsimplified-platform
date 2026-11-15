/**
 * NO WORK STARTS BEFORE THE "BEFORE YOU START" NOTICE IS ACCEPTED (site owner, 15 Nov 2026).
 *
 * The notice says the site is not a lawyer and that AI is used. Found while fixing waiting-line-ends (PR #550): from the
 * case page's "Show my next step", with the notice not yet given on this browser, the builder showed the notice and
 * worked out the next step behind it, before the person had accepted anything.
 *
 * What it checks, in all three courts, with the real save path (a real local or staging account; realTestSession.ts
 * refuses production) and the model stand-ins, every network request watched:
 *   1. a confirmed case, the notice not given on this browser, the case page's "Show my next step" pressed: while the
 *      notice shows, NO work request is sent (any analysis, AI or next-step route: WORK below); once it is accepted the
 *      next step is worked out (the press is kept, not lost);
 *      While it waits, the button says "Finish the step shown below first" and so does the waiting line, never
 *      "Working out your next step" (site owner, 15 Nov: the button said the site was working while it was waiting);
 *   2. the builder opened directly for a new case (a link, the "fill in the form" route), the notice not given: from its
 *      first paint until the notice is accepted, NO work request is sent.
 *
 * What failure it catches: a route that starts analysis or an AI request before the person has accepted the notice.
 *
 * The home page's own notice, before its story reading and court suggestion: home-notice.spec.ts. Every place that
 * sends work, and the pages that do not show the notice: test:notice-gate.
 */
import { expect, test, type Page, type Request } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { recordInitialUnknowns, saveCaseStory, tickIfAsked } from "./harness/intakeReview";
import { ACKNOWLEDGEMENT_KEY } from "../../src/lib/content-library/acknowledgement";
import { WORK_ROUTE } from "../../scripts/verification/noticeGateList";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const STORY = "Synthetic: I paid a contractor $5,000 in March 2026 to repair my roof and the work was never done.";
const LABEL = { "small-claims": "Small Claims", civil: "Civil", family: "Family" } as const;

/** Every work request from now on, as "METHOD path". */
function watchWork(page: Page): string[] {
  const seen: string[] = [];
  page.on("request", (request: Request) => {
    const path = new URL(request.url()).pathname;
    if (WORK_ROUTE.test(path)) seen.push(`${request.method()} ${path}`);
  });
  return seen;
}
const forgetNotice = (page: Page) => page.evaluate((key) => { for (const name of Object.keys(window.localStorage)) if (name.startsWith(key)) window.localStorage.removeItem(name); }, ACKNOWLEDGEMENT_KEY);
async function accept(page: Page) {
  await page.getByTestId("acknowledgement-checkbox").check();
  await page.getByTestId("acknowledgement-continue").click();
}

async function confirmedCase(page: Page, court: keyof typeof LABEL): Promise<string> {
  if (court === "small-claims") {
    await openBuilder(page, court, { city: "Ottawa" });
    await page.getByRole("button", { name: "Fill in the form yourself" }).click();
    await page.getByLabel("Case story", { exact: true }).fill(STORY);
    await saveCaseStory(page);
    await page.getByTestId("sc-intake-amountClaimed").fill("$5,000");
    await page.getByTestId("sc-intake-amountClaimed").blur();
  } else {
    await openBuilder(page, court, { city: "Ottawa", story: STORY });
    await page.getByTestId("guided-form-show-form").click();
  }
  await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
  const caseId = new URL(page.url()).searchParams.get("intake") ?? "";
  const panel = page.getByTestId("intake-review");
  if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  const kind = page.locator('[data-question="sc-orient-dispute-category"]').getByRole("button").first();
  if (await kind.count()) await kind.click();
  const filed = page.locator('[data-question="sc-claim-filed"]');
  if (await filed.count()) await filed.getByRole("button", { name: "No", exact: true }).click();
  await recordInitialUnknowns(page);
  await tickIfAsked(page);
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
  await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
  return caseId;
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`from the case page, no work starts before the notice is accepted; then the next step is worked out -- ${court}`, async ({ page }) => {
    test.setTimeout(600_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      const caseId = await confirmedCase(page, court);
      await page.goto(`/cases/${caseId}`);
      await forgetNotice(page);
      const work = watchWork(page);
      await page.getByTestId("case-show-next-step").click();
      await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
      await expect(page.getByTestId("acknowledgement-checkbox"), "the notice is shown").toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("intake-continue-guidance"), "the button says what the person must do").toHaveText("Finish the step shown below first", { timeout: 30_000 });
      await expect(page.getByTestId("intake-continue-waiting"), "the waiting line shows on this route").toContainText("Finish the step shown below first");
      await page.waitForTimeout(8_000);
      await expect(page.getByText(/Working out your next step/), "nothing says the site is working while the notice waits").toHaveCount(0);
      await expect(page.getByTestId("intake-continue-guidance"), "still says what the person must do").toHaveText("Finish the step shown below first");
      expect(work, "work requests sent while the notice was not yet accepted").toEqual([]);
      await accept(page);
      await expect(page.getByTestId("completed-case-overview"), "once accepted, the next step is worked out").toBeVisible({ timeout: 240_000 });
      expect(work.length, "the next step's work ran after the notice").toBeGreaterThan(0);
    } finally {
      await deleteHarnessUser(userId);
    }
  });

  test(`the builder opened directly for a new case: no work starts before the notice is accepted -- ${court}`, async ({ page }) => {
    test.setTimeout(600_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      await page.goto("/about");
      await forgetNotice(page);
      const work = watchWork(page);
      await page.goto(`/builder?path=${court}`);
      await expect(page.getByTestId("acknowledgement-checkbox"), "the notice is shown").toBeVisible({ timeout: 60_000 });
      await page.waitForTimeout(8_000);
      expect(work, "work requests sent on the builder while the notice was not yet accepted").toEqual([]);
      await accept(page);
      await expect(page.getByTestId("acknowledgement-checkbox"), "the notice is gone once accepted").toHaveCount(0, { timeout: 30_000 });
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
