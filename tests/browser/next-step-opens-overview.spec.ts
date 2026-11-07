/**
 * THE CASE PAGE'S "SHOW MY NEXT STEP" OPENS THE OVERVIEW WITH THE STEP SHOWN, NOT THE LAST ROUTE USED, AND THE
 * WAITING LINE ENDS WITH THE WORK (Chrome check of #544, 6 Nov 2026, F6).
 *
 * Chrome, Small Claims: "Show my next step" and "Update my next steps" on the case page opened the whole form (the
 * route last used) instead of the overview, and "Finish the step shown below first; your next step will then appear."
 * stayed on screen after the work ended.
 *
 * What it checks, Small Claims on the whole form (Chrome's route), with the real save path (a real local or staging
 * account; realTestSession.ts refuses production) and the model stand-ins: after Confirm, the case page's "Show my next
 * step" lands on the builder's overview (?step=results), the overview appears with the step, the whole form is never
 * shown, and the waiting line is not left on screen.
 *
 * WHAT FAILURE THIS CATCHES: a next-step button that lands on a form instead of the step, or a waiting line left on screen.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { recordInitialUnknowns, saveCaseStory } from "./harness/intakeReview";

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
  await page.getByTestId("intake-review-acknowledgement").check();
}

test(`the case page's "Show my next step" opens the overview with the step, never the whole form, and no waiting line is left -- small-claims`, async ({ page }) => {
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

    await page.goto(`/cases/${caseId}`);
    const show = page.getByTestId("case-show-next-step");
    await expect(show).toBeVisible({ timeout: 60_000 });
    await show.click();
    await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
    // Watched from the moment the builder opens: the whole form must never be what the button opened.
    const formSeen = await page.evaluate(() => new Promise<boolean>((resolve) => {
      const box = () => document.querySelector<HTMLElement>("[data-testid=sc-intake-amountClaimed]");
      let seen = false;
      const look = () => { const el = box(); if (el && el.offsetParent !== null) seen = true; };
      look();
      const watcher = new MutationObserver(look);
      watcher.observe(document.body, { subtree: true, childList: true, attributes: true });
      const end = () => { watcher.disconnect(); resolve(seen); };
      const overview = () => document.querySelector("[data-testid=completed-case-overview]");
      const wait = window.setInterval(() => { if (overview()) { window.clearInterval(wait); end(); } }, 250);
      window.setTimeout(() => { window.clearInterval(wait); end(); }, 240_000);
    }));
    expect(new URL(page.url()).searchParams.get("step"), "the button opened the overview, not the last route used").toBe("results");
    await expect(page.getByTestId("completed-case-overview"), "the overview is shown with the step").toBeVisible({ timeout: 30_000 });
    expect(formSeen, "the whole form was shown instead of the overview").toBe(false);
    await expect(page.getByTestId("intake-continue-waiting"), "the waiting line is left on screen after the work ended").toHaveCount(0, { timeout: 15_000 });
  } finally {
    await deleteHarnessUser(userId);
  }
});
