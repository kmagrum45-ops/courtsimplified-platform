/**
 * WHILE THE NEXT STEP IS BEING WORKED OUT, "FINISH THE STEP SHOWN BELOW FIRST" IS NOT SHOWN (Chrome check of #544 on
 * 9b960f7, 8 Nov 2026, F13).
 *
 * Chrome: "Show my next step" (and "Update my next steps") pressed on the case page opened the builder, which started
 * the next step, and "Finish the step shown below first; your next step will then appear." stayed on screen for the whole
 * 63-68 s of work, beside "Working out your next step from the court rules…". Cause: a start asked for from the case
 * page waits until its route is on the page (IntakeReviewPanel.tsx, `waiting`), and the line was shown for as long as
 * `waiting` lasted, which includes the work itself. The progress line is the one to show while work runs.
 *
 * What it checks, in all three courts, with the real save path (a real local or staging account; realTestSession.ts
 * refuses production) and the model stand-ins, the work held for 12 s: a confirmed case whose next step has not been
 * shown; the case page's "Show my next step" pressed; for as long as "Working out your next step" shows, the line
 * "Finish the step shown below first" is never on screen; the next step then shows.
 *
 * WHAT FAILURE THIS CATCHES: a line telling the person to finish a step while the site is the one still working.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { recordInitialUnknowns, saveCaseStory, tickIfAsked } from "./harness/intakeReview";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const STORY = "Synthetic: I paid a contractor $5,000 in March 2026 to repair my roof and the work was never done.";

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

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`"Finish the step shown below first" is not shown while the next step is worked out from the case page -- ${court}`, async ({ page }) => {
    test.setTimeout(600_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
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
      await readyToConfirm(page);
      await page.getByTestId("intake-confirm").click();
      await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
      await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });

      // The work of the next step held for 12 s (Chrome's took 63-68 s), after the stand-ins are in place.
      await page.route(/\/api\/(small-claims|civil|family)\/analyze$/, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 12_000));
        await route.fallback().catch(() => undefined);
      });
      await page.goto(`/cases/${caseId}`);
      await page.getByTestId("case-show-next-step").click();
      await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
      const status = page.getByTestId("next-step-status");
      await expect(status, "the progress line shows while the next step is worked out").toContainText(/Working out your next step/, { timeout: 60_000 });
      const seen: string[] = [];
      const started = Date.now();
      while (Date.now() - started < 30_000 && await status.isVisible().catch(() => false) && /Working out/.test(await status.textContent().catch(() => "") ?? "")) {
        if (await page.getByTestId("intake-continue-waiting").isVisible().catch(() => false)) seen.push(`${((Date.now() - started) / 1000).toFixed(1)} s`);
        await page.waitForTimeout(250);
      }
      expect(seen, "\"Finish the step shown below first\" showed while the next step was being worked out").toEqual([]);
      await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 120_000 });
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}

/*
 * The same, frame by frame (browser-regression run 43490561082 attempt 1, family: the line was seen at 13.1 s, just after the
 * 12 s of work). Polling every 250 ms sees a line painted for one frame only sometimes; this watches every painted frame
 * (requestAnimationFrame) from the moment "Working out your next step" first shows until the next step is on screen.
 * Cause it catches: the line's condition was `waiting && !working`, and `waiting` is cleared by an effect that runs after
 * the frame in which `working` turned false, so that frame painted the line.
 */
for (const court of ["small-claims", "civil", "family"] as const) {
  test(`"Finish the step shown below first" is never painted, not for one frame, once the next step is being worked out -- ${court}`, async ({ page }) => {
    test.setTimeout(600_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      await page.addInitScript(() => {
        const w = window as unknown as { __finishLineFrames: number; __workSeen: boolean };
        w.__finishLineFrames = 0; w.__workSeen = false;
        const frame = () => {
          if (/Working out/.test(document.querySelector("[data-testid=next-step-status]")?.textContent ?? "")) w.__workSeen = true;
          if (w.__workSeen && !document.querySelector("[data-testid=completed-case-overview]") && document.querySelector("[data-testid=intake-continue-waiting]")) w.__finishLineFrames += 1;
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
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
      await readyToConfirm(page);
      await page.getByTestId("intake-confirm").click();
      await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
      await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
      await page.route(/\/api\/(small-claims|civil|family)\/analyze$/, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 12_000));
        await route.fallback().catch(() => undefined);
      });
      await page.goto(`/cases/${caseId}`);
      await page.getByTestId("case-show-next-step").click();
      await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
      await expect(page.getByTestId("next-step-status"), "the progress line shows while the next step is worked out").toContainText(/Working out your next step/, { timeout: 60_000 });
      await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 120_000 });
      expect(await page.evaluate(() => (window as unknown as { __finishLineFrames: number }).__finishLineFrames), "frames painted with \"Finish the step shown below first\" after the work began").toBe(0);
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
