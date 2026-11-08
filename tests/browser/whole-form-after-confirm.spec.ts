/**
 * ON A CONFIRMED CASE THE WHOLE FORM CAN STILL BE OPENED, AND THE CASE PAGE'S "SHOW MY NEXT STEP" STILL OPENS THE OVERVIEW
 * (Chrome check of #544 on a8c8cf57, 7 Nov 2026, "Anything else wrong" 6).
 *
 * Chrome, Small Claims: once the intake was confirmed there was no visible way to the whole form (all fields), from the
 * case page or the builder; it could be opened only by typing its address (?step=form). Cause: the intake, with the Small
 * Claims route chooser and civil and Family's "Show the whole form instead", is hidden while the overview shows
 * (app/builder/page.tsx, hidden={resultsVisible}). Before F6 (0e601c32) the case page's next-step buttons landed on the
 * whole form, which was the way there; F6 rightly sends them to the overview, where nothing led to the form.
 *
 * What it checks, in all three courts, with the real save path (a real local or staging account; realTestSession.ts
 * refuses production) and the model stand-ins: after Confirm, the case page's "Show my next step" lands on the overview
 * (?step=results) with the step shown, as F6 requires; on that overview "Open the whole form (all your answers)" is offered;
 * it opens the whole form (Small Claims with the case's amount in its box) and the case stays confirmed.
 *
 * WHAT FAILURE THIS CATCHES: a confirmed case whose whole form cannot be reached, or the next-step button landing on a
 * form again.
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

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`a confirmed case: "Show my next step" opens the overview, and the whole form is offered there and opens, still confirmed -- ${court}`, async ({ page }) => {
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

      await page.goto(`/cases/${caseId}`);
      await page.getByTestId("case-show-next-step").click();
      await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
      await expect(page.getByTestId("completed-case-overview"), "the next-step button opened the overview").toBeVisible({ timeout: 240_000 });
      expect(new URL(page.url()).searchParams.get("step"), "the next-step button opened the overview, not a form").toBe("results");

      const open = page.getByTestId("open-whole-form");
      await expect(open, "a confirmed case offers no way to the whole form").toBeVisible({ timeout: 15_000 });
      await open.click();
      if (court === "small-claims") {
        await expect(page.getByTestId("sc-intake-amountClaimed"), "the whole form did not open").toBeVisible({ timeout: 30_000 });
        await expect(page.getByTestId("sc-intake-amountClaimed")).toHaveValue(/5,?000/);
      } else {
        await expect(page.getByRole("button", { name: "Answer one question at a time instead" }), "the whole form did not open").toBeVisible({ timeout: 30_000 });
      }
      await expect(page.getByTestId("intake-review"), "opening the whole form changed the confirmation").toHaveAttribute("data-phase", "user-confirmed");
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
