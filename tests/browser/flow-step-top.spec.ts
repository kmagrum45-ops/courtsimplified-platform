/**
 * EVERY STEP OF THE NEW SMALL CLAIMS FLOW STARTS AT THE TOP, ITS HEADING FOCUSED (site owner, 26 Nov 2026, change 6).
 *
 * Jason's live test: the Small Claims chat opened at the bottom of the page, under the start's questions and the review
 * panel, so the person had to find where the new step began. The new flow (SC_FLOW_V2) frames each step (StepFrame.tsx):
 * on entering it, and on every step change, the page is at the top and the step's heading has the focus.
 *
 * What it checks, signed in with the real save path (realTestSession.ts refuses production) and the model stand-ins:
 * the home page story -> Continue -> the Understood step, then the Questions page, then the review: at each, the window
 * is scrolled to the top and the focused element is that step's own heading. With the old Small Claims screens (the switch
 * off) there is no such heading, so the check fails: it passes only on the new flow.
 *
 * WHAT FAILURE THIS CATCHES: a step that opens in the middle or at the bottom of the page, or leaves the focus behind.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const STORY = "Synthetic: In March 2026 I lent my friend Alex Testwood $4,500 for a car repair. He has not paid any of it back. I want my $4,500 back.";

/** The step shown, at the top of the page, with its own heading focused. */
async function atTopWithHeading(page: Page, step: string) {
  await expect(page.locator(`[data-testid=flow-step][data-step=${step}]`), `the ${step} step shows`).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { message: `the ${step} step starts at the top`, timeout: 10_000 }).toBe(0);
  await expect.poll(() => page.evaluate(() => { const el = document.activeElement; return el?.getAttribute("data-testid") === "flow-step-heading" ? el.closest("[data-testid=flow-step]")?.getAttribute("data-step") ?? "" : ""; }), { message: `the ${step} step's heading has the focus`, timeout: 10_000 }).toBe(step);
}

test("every step of the Small Claims flow starts at the top, with its heading focused", async ({ page }) => {
  test.setTimeout(600_000);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    await serveModelStandIns(page, "small-claims", userId);
    await page.goto("/?path=small-claims");
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("City or municipality").fill("Ottawa");
    await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY);
    await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
    const accept = page.getByTestId("case-understanding-continue-suggested").or(page.getByTestId("case-understanding-continue-chosen")).first();
    if (await accept.waitFor({ state: "visible", timeout: 60_000 }).then(() => true, () => false)) await accept.click();
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
    const notice = page.getByTestId("acknowledgement-checkbox");
    if (await notice.waitFor({ state: "visible", timeout: 20_000 }).then(() => true, () => false)) { await notice.check(); await page.getByTestId("acknowledgement-continue").click(); }

    await atTopWithHeading(page, "understood");
    // Scrolled down before going on, so "at the top" is the step's doing.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const yesAll = page.getByTestId("understood-yes-all");
    await (await yesAll.isVisible().catch(() => false) ? yesAll : page.getByTestId("understood-continue")).click();
    await atTopWithHeading(page, "questions");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    for (let round = 0; round < 20; round += 1) {
      const item = page.getByTestId("flow-question").first();
      if (!(await item.isVisible().catch(() => false))) break;
      const id = (await item.getAttribute("data-question-id")) ?? "";
      await page.getByTestId(`flow-unsure-${id}`).click();
      await expect(page.locator(`[data-testid=flow-question][data-question-id="${id}"]`)).toHaveCount(0, { timeout: 30_000 });
    }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByTestId("questions-continue").click();
    await atTopWithHeading(page, "review");
  } finally {
    await deleteHarnessUser(userId).catch(() => {});
  }
});
