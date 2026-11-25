/**
 * A CONFIRMED CASE WHOSE NEXT STEP IS SAVED AND UP TO DATE SHOWS IT AT ONCE IN THE BUILDER, WITH NO NEW AI RUN
 * (Chrome check of #544 on 99e2ec0, 7 Nov 2026, Note A and F10).
 *
 * Chrome, Small Claims: on a confirmed case the overview appeared only after "Show my next step" and about 70 s of the
 * next step being worked out again, every time; the overview's own address (?step=results) sent the person to the case
 * page instead. Cause: the builder kept no copy of the saved step it could show (the overview is drawn only from a run
 * made this visit), and opening ?step=results on a case with an up-to-date step went to the case page
 * (IntakeRecovery.tsx).
 *
 * What it checks, in all three courts, with the real save path (a real local or staging account; realTestSession.ts
 * refuses production) and the model stand-ins: a confirmed case whose next step was worked out and saved; then
 *   1. the overview's address opened again: the overview shows the saved step within 15 s, on the builder, with no
 *      request to work out a next step;
 *   2. the builder opened on a route, "Show my next step" pressed once: the overview shows within 15 s, again with no
 *      such request.
 *
 * WHAT FAILURE THIS CATCHES: a saved, current next step that the person has to wait for again, or cannot open at all.
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

/** Each request that works out a next step (the analysis routes), counted from now. */
function countStepRuns(page: Page) {
  const runs: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && /^\/api\/(small-claims|civil|family)\/analyze$/.test(new URL(request.url()).pathname)) runs.push(new URL(request.url()).pathname);
  });
  return runs;
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`a saved, current next step shows at once on the builder, with no new AI run -- ${court}`, async ({ page }) => {
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
      await page.getByTestId("intake-continue-guidance").click();
      await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 240_000 });
      // The step saved with the case (the case page shows it as the next step, nothing to update).
      await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
      await page.goto(`/cases/${caseId}`);
      await expect(page.getByTestId("case-show-next-step")).toHaveCount(0, { timeout: 60_000 });

      const runs = countStepRuns(page);
      // 1. The overview's own address.
      await page.goto(`/builder?path=${court}&intake=${caseId}&step=results`);
      await expect(page.getByTestId("completed-case-overview"), "1. the saved next step is not shown at once on the overview's address").toBeVisible({ timeout: 15_000 });
      expect(new URL(page.url()).pathname, "1. the overview's address left the builder").toBe("/builder");

      // 2. The builder on a route, then one press of "Show my next step".
      const route = court === "small-claims" ? "&step=form" : "";
      await page.goto(`/builder?path=${court}&intake=${caseId}${route}`);
      const show = page.getByTestId("intake-continue-guidance");
      await expect(show).toHaveText("Show my next step", { timeout: 60_000 });
      await show.click();
      await expect(page.getByTestId("completed-case-overview"), "2. the saved next step is not shown at once after the press").toBeVisible({ timeout: 15_000 });
      expect(runs, "a saved, current next step was worked out again").toEqual([]);
      await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "user-confirmed");
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
