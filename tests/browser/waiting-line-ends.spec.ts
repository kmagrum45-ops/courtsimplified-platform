/**
 * "FINISH THE STEP SHOWN BELOW FIRST" NEVER OUTLASTS THE WORK IT WAITED FOR: NOT AFTER A SAVE ERROR THAT FOLLOWS THE AI
 * STEP, AND NOT WHEN A QUEUED START NEVER RUNS (Chrome check of #544 on a8c8cf57, 7 Nov 2026, step 8 and "Anything else
 * wrong" 2).
 *
 * Chrome, Small Claims: one press of the case page's "Update my next steps" opened the overview with "Working out your
 * next step…" and, beside it, "Finish the step shown below first; your next step will then appear."; about 1 min 40 s
 * later the case could not be saved ("TimeoutError: signal timed out"). The line is shown while a start waits for its
 * route to be on the page (IntakeReviewPanel.tsx), and was meant to end with the work.
 *
 * What it checks, Small Claims, with the real save path (a real local or staging account; realTestSession.ts refuses
 * production) and the model stand-ins, the case's save after the AI step (its PATCH of the case row, the one write that
 * carries `derivedFrom`) answered 503 every time: from the case page's "Show my next step", once the page says the case
 * could not be saved, the waiting line is gone and the button is not left working.
 *
 * Then where the line belongs (15 Nov, PR #550 CI): the line is shown only while a start waits on a step the person
 * must finish (the "Before you start" notice), and since e31f2300 it is never drawn once the work has begun. From the
 * case page the work begins within 25 ms of the builder's first paint, so the line is never drawn there (measured frame
 * by frame; before e31f2300 the one frame it was seen in was the one after the work ended, the frame that commit
 * removed), and the run checked nothing. So the second part brings the notice back (not given on this browser),
 * presses the builder's own "Show my next step": the line must show while the notice waits (the run fails if it never
 * does), the notice is given, the work runs and ends in the save error, and the line is gone and the button not working.
 *
 * WHAT FAILURE THIS CATCHES: a waiting line (or a working button) left on screen after the work ended in an error.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { recordInitialUnknowns, saveCaseStory, tickIfAsked } from "./harness/intakeReview";
import { ACKNOWLEDGEMENT_KEY } from "../../src/lib/content-library/acknowledgement";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const STORY = "Synthetic: I paid a contractor $5,000 in March 2026 to repair my roof and the work was never done.";

/** The review opened and its questions answered, up to (not including) Confirm. */
async function readyToConfirm(page: Page) {
  const panel = page.getByTestId("intake-review");
  if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  const kind = page.locator('[data-question="sc-orient-dispute-category"]').getByRole("button").first();
  if (await kind.count()) await kind.click();
  const filed = page.locator('[data-question="sc-claim-filed"]');
  if (await filed.count()) await filed.getByRole("button", { name: "No", exact: true }).click();
  await recordInitialUnknowns(page);
  await tickIfAsked(page);
}

test("after a save error that follows the AI step, the waiting line is gone and the button is not left working -- small-claims", async ({ page }) => {
  test.setTimeout(600_000);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    await serveModelStandIns(page, "small-claims", userId);
    await openBuilder(page, "small-claims", { city: "Ottawa" });
    await page.getByRole("button", { name: "Fill in the form yourself" }).click();
    await page.getByLabel("Case story", { exact: true }).fill(STORY);
    await saveCaseStory(page);
    await page.getByTestId("sc-intake-amountClaimed").fill("$5,000");
    await page.getByTestId("sc-intake-amountClaimed").blur();
    await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
    const caseId = new URL(page.url()).searchParams.get("intake") ?? "";
    await readyToConfirm(page);
    await page.getByTestId("intake-confirm").click();
    await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
    await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });

    // The case's save after the AI step answers 503, every time.
    await page.route("**/rest/v1/cases?**", async (route) => {
      const request = route.request();
      if (request.method() === "PATCH" && /"derivedFrom"/.test(request.postData() ?? "")) {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Service Unavailable" }) });
        return;
      }
      await route.fallback();
    });
    const saveError = page.getByText("Your case could not be saved just now. Nothing you entered is lost.");
    const line = page.getByTestId("intake-continue-waiting");
    const workingNow = page.getByText(/Working out your next step/);

    // 1. From the case page: the work starts at once and ends in the save error; no line, the button not left working.
    await page.goto(`/cases/${caseId}`);
    await page.getByTestId("case-show-next-step").click();
    await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
    await expect(saveError, "the save error is shown").toBeVisible({ timeout: 240_000 });
    await expect(line, "the waiting line outlasted the work, which ended in a save error").toHaveCount(0, { timeout: 5_000 });
    await expect(workingNow, "the button was left working after the save error").toHaveCount(0, { timeout: 20_000 });

    // 2. Where the line belongs: the "Before you start" notice not yet given on this browser, the builder's own button pressed.
    await page.evaluate((key) => { for (const name of Object.keys(window.localStorage)) if (name.startsWith(key)) window.localStorage.removeItem(name); }, ACKNOWLEDGEMENT_KEY);
    await page.reload();
    await expect(page.getByTestId("acknowledgement-checkbox"), "the notice is back").toBeVisible({ timeout: 60_000 });
    await expect(saveError, "no save error before this start").toHaveCount(0);
    // Whether the line was shown at all, watched from before the press: the checks below mean nothing without it.
    await page.evaluate(() => {
      const w = window as unknown as { __waitingSeen?: boolean };
      w.__waitingSeen = false;
      const look = () => { if (document.querySelector("[data-testid=intake-continue-waiting]")) w.__waitingSeen = true; };
      look();
      new MutationObserver(look).observe(document.body, { subtree: true, childList: true });
    });
    await page.getByTestId("intake-continue-guidance").click();
    await expect(line, "the waiting line shows while the notice waits").toContainText("Finish the step shown below first", { timeout: 30_000 });
    await page.getByTestId("acknowledgement-checkbox").check();
    await page.getByTestId("acknowledgement-continue").click();
    await expect(saveError, "the save error is shown").toBeVisible({ timeout: 240_000 });
    expect(await page.evaluate(() => (window as unknown as { __waitingSeen?: boolean }).__waitingSeen), "the waiting line never showed, so this run checks nothing").toBe(true);
    await expect(line, "the waiting line outlasted the work, which ended in a save error").toHaveCount(0, { timeout: 5_000 });
    await expect(workingNow, "the button was left working after the save error").toHaveCount(0, { timeout: 20_000 });
  } finally {
    await deleteHarnessUser(userId);
  }
});
