/**
 * EVERY SCREEN OF THE CASE PAGE'S GATE SHOWS "WHAT WE HAVE SO FAR" AND "UPDATE YOUR STORY" (Chrome check of #544 on
 * 99e2ec0, 7 Nov 2026, F11).
 *
 * Chrome, Small Claims: after a Confirm, the case page said "Your information is confirmed / Your next step has not been
 * shown yet ... / Show my next step" and nothing else, so the story could be edited only by typing the builder's
 * address. Cause: of the gate's four screens (app/cases/[id]/layout.tsx: not confirmed yet, confirm again, next step not
 * shown yet, next steps to update), only two drew the case file, and none had "Update your story".
 *
 * What it checks, in all three courts, with the real save path (a real local or staging account; realTestSession.ts
 * refuses production) and the model stand-ins: the case page before Confirm (not confirmed yet) and after it (next step
 * not shown yet) shows "What we have so far" and an "Update your story" link to the builder.
 *
 * WHAT FAILURE THIS CATCHES: a case page screen that hides the person's case file or the way to change their story.
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

/** The case page's gate screen shows the case file and the way to the story. */
async function gateShowsCaseFile(page: Page, caseId: string, screen: string, when: string) {
  await page.goto(`/cases/${caseId}`);
  await expect(page.getByTestId(screen), `${when}: the expected screen`).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "What we have so far" }), `${when}: "What we have so far" is hidden`).toBeVisible();
  const story = page.getByRole("link", { name: "Update your story", exact: true });
  await expect(story, `${when}: "Update your story" is hidden`).toBeVisible();
  expect(await story.getAttribute("href")).toMatch(/^\/builder\?/);
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`the case page's gate screens show "What we have so far" and "Update your story" -- ${court}`, async ({ page }) => {
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
      const builder = page.url();

      await gateShowsCaseFile(page, caseId, "case-intake-gate", "not confirmed yet");

      await page.goto(builder);
      await readyToConfirm(page);
      await page.getByTestId("intake-confirm").click();
      await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
      await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
      await gateShowsCaseFile(page, caseId, "case-confirmed-no-step", "next step not shown yet");
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
