/**
 * EVERY PAGE NAMES THE SAME STAGE AND THE SAME DEADLINES, ALSO AFTER A SECOND "SHOW MY NEXT STEP" IN ONE VISIT
 * (Chrome check of #544 on 9b960f7, 8 Nov 2026, F12).
 *
 * Chrome, Small Claims: Confirm, "Show my next step", then (same builder visit) the amount changed in the review,
 * Confirm, "Show my next step" again. The case page's next step then said "the last day for this is Friday 10 March
 * 2028", while the case file page said "Where the case is / Not confirmed yet." and "Deadlines worked out from your
 * dates / None yet.", and the case page's "What we have so far" had lost its "Deadline" line; the same after a reload.
 * Cause found here: a next step worked out again for changed answers clears the saved stage on purpose (builder
 * page.tsx, the case save), and the stage read from the answers is then meant to be saved again; but the page
 * remembered it had already saved that stage this visit (sentPositionRef, positionSave.ts savedParts), so it never
 * sent it. The case page's next step falls back to the start answers for its stage; the case file and the "Deadline"
 * line did not (caseStep.ts caseStepFor), so the pages disagreed.
 *
 * What it checks, in all three courts, with the real save path (a real local or staging account; realTestSession.ts
 * refuses production) and the model stand-ins: a case confirmed and its next step shown; in the same visit the amount
 * changed (the amount, or the city where the amount is held), confirmed again and the next step shown again; then the case page and the case file page:
 *   0. the stage worked out again is saved on the case again;
 *   1. the case file names where the case is (not "Not confirmed yet.") while the case page shows a next step;
 *   2. with a date given on the case page, the deadlines are the same on both pages: each deadline date the case page
 *      lists is on the case file, and the other way round.
 *
 * WHAT FAILURE THIS CATCHES: two pages of one case disagreeing about its stage or its deadlines.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser, harnessAdmin } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { recordInitialUnknowns, saveCaseStory } from "./harness/intakeReview";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const STORY = "Synthetic: On March 10, 2026 I paid a contractor $5,000 to repair my roof and the work was never done.";

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

/** The deadline dates a page lists (the case page's "What we have so far", or the case file page). */
async function deadlineDates(page: Page): Promise<string[]> {
  const texts = await page.getByTestId("case-file-deadline").allTextContents();
  return texts.map((text) => (text.match(/(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}/) ?? [text])[0]).sort();
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`the case page and the case file name the same stage and deadlines after a second next step in one visit -- ${court}`, async ({ page }) => {
    test.setTimeout(900_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      const amountBox = court === "small-claims" ? "sc-intake-amountClaimed" : null;
      if (court === "small-claims") {
        await openBuilder(page, court, { city: "Ottawa" });
        await page.getByRole("button", { name: "Fill in the form yourself" }).click();
        await page.getByLabel("Case story", { exact: true }).fill(STORY);
        await saveCaseStory(page);
        await page.getByTestId(amountBox!).fill("$5,000");
        await page.getByTestId(amountBox!).blur();
      } else {
        await openBuilder(page, court, { city: "Ottawa", story: STORY });
        await page.getByTestId("guided-form-show-form").click();
      }
      await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
      const caseId = new URL(page.url()).searchParams.get("intake") ?? "";
      await readyToConfirm(page);
      await page.getByTestId("intake-confirm").click();
      const review = page.getByTestId("intake-review");
      await expect(review).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
      await page.getByTestId("intake-continue-guidance").click();
      await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 240_000 });
      await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
      await page.waitForTimeout(3_000);

      // The same visit: the review opened, an answer changed (Chrome step 10), confirmed, and the next step again.
      await page.getByTestId("intake-view-review").click();
      // The amount where it is a box (Small Claims; Chrome changed the amount), else the city box.
      const field = court === "small-claims" ? "amountClaimed" : "city";
      const box = review.locator(`[data-testid=intake-entry][data-field=${field}]`).locator("input, textarea").first();
      await box.fill(court === "small-claims" ? "$5,500" : "Kanata");
      await box.blur();
      await expect(review).toHaveAttribute("data-phase", "reviewing", { timeout: 30_000 });
      await readyToConfirm(page);
      await page.getByTestId("intake-confirm").click();
      await expect(review).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
      const show = page.getByTestId("intake-continue-guidance");
      await expect(show).toHaveText("Show my next step", { timeout: 60_000 });
      await show.click();
      await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 240_000 });
      await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
      await page.waitForTimeout(5_000);

      // 0. The stage worked out again from the answers is saved on the case again (the builder cleared it on purpose).
      const saved = await harnessAdmin().from("cases").select("master_result").eq("id", caseId).single();
      const position = ((saved.data?.master_result ?? {}) as { position?: { confirmedStage?: string | null; confirmedStageFrom?: string } }).position ?? {};
      expect(position.confirmedStage ?? null, "0. the case's saved stage was not saved again after the second next step").not.toBeNull();

      await page.goto(`/cases/${caseId}`);
      await expect(page.getByTestId("stage-answer-panel"), "the case page shows a next step").toBeVisible({ timeout: 90_000 });
      // A date the step counts a deadline from, given on the case page (as retest-29oct D1), so both pages have one.
      const dates = page.getByTestId("stage-answer-dates");
      if (await dates.isVisible({ timeout: 15_000 }).catch(() => false)) {
        const later = dates.getByTestId("stage-answer-date-later").first();
        if (await later.count()) await later.getByRole("button", { name: "Add it" }).click();
        const question = dates.getByTestId("stage-answer-date-question").first();
        if (await question.count()) {
          await question.locator('input[type="date"]').fill("2026-03-10");
          await page.getByTestId("stage-answer-dates-save").click();
          await page.waitForTimeout(4_000);
          await page.reload();
          await expect(page.getByTestId("stage-answer-panel")).toBeVisible({ timeout: 90_000 });
        }
      }
      await page.waitForTimeout(3_000);
      const onCasePage = await deadlineDates(page);

      await page.goto(`/cases/${caseId}/case-file`);
      const file = page.getByTestId("case-file");
      await expect(file).toBeVisible({ timeout: 90_000 });
      await expect(page.getByTestId("case-file-deadlines-loading")).toHaveCount(0, { timeout: 60_000 });
      await expect(file.locator("section", { hasText: "Where the case is" }), "1. the case file says the stage is not confirmed while the case page shows a next step").not.toContainText("Not confirmed yet.");
      const onCaseFile = await deadlineDates(page);
      console.log(`F12 ${court}: case page deadlines ${JSON.stringify(onCasePage)}, case file ${JSON.stringify(onCaseFile)}`);
      // The case file fills its list in after it loads: read until it settles.
      await expect.poll(() => deadlineDates(page), { timeout: 30_000, message: "2. the case file's deadlines differ from the case page's" }).toEqual(onCasePage);
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
