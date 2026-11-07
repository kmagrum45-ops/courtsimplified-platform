/**
 * A CONFIRMATION WHOSE SAVE ANSWERED WITH AN ERROR: THE RETRY CLEARS THE MESSAGE ONCE IT HAS LANDED, OR SENDS IT AGAIN
 * (Chrome check of #544 on a8c8cf57, 7 Nov 2026, step 19 and "Anything else wrong" 1).
 *
 * Chrome, Small Claims, signed in: the save of Confirm (a PATCH of the case row) answered 503 several times. The page
 * said "Your review could not be saved. Your answers remain here; retry before continuing. Retry saving intake Sign in
 * for account recovery"; four presses of "Retry saving intake" over three minutes did not clear it, yet after a reload
 * the case was confirmed. Cause: the retry only re-ran the answers' save, which, with nothing left to save, returned
 * before the line that clears the message (IntakeRecovery.tsx flush), and never looked at or re-sent the confirmation.
 *
 * What it checks, with the real save path on a local or staging account (realTestSession.ts refuses production) and the
 * model stand-ins, the database's answer to the confirmation's save replaced by a 503 once:
 *   1. the save reached the database (the 503 came after it): one "Retry saving intake" reads the case back, finds the
 *      confirmation and clears the message;
 *   2. the save did not reach the database: one "Retry saving intake" sends the confirmation again, and the case is
 *      confirmed after a reload.
 *
 * WHAT FAILURE THIS CATCHES: a "could not be saved" message that no retry clears, or a confirmation lost to one error.
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

/** A Small Claims case on the whole form, saved, its review ready to confirm. */
async function caseReadyToConfirm(page: Page, userId: string) {
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  await serveModelStandIns(page, "small-claims", userId);
  await openBuilder(page, "small-claims", { city: "Ottawa" });
  await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  await page.getByLabel("Case story", { exact: true }).fill(STORY);
  await saveCaseStory(page);
  await page.getByTestId("sc-intake-amountClaimed").fill("$5,000");
  await page.getByTestId("sc-intake-amountClaimed").blur();
  await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
  await readyToConfirm(page);
}

/** The next save of the case row that records a confirmation answers 503; `reaches`: the database got it first. */
async function failNextConfirmSave(page: Page, reaches: boolean) {
  let done = false;
  await page.route("**/rest/v1/cases?**", async (route) => {
    const request = route.request();
    if (done || request.method() !== "PATCH" || !/confirmedRevision/.test(request.postData() ?? "")) return route.fallback();
    done = true;
    if (reaches) await route.fetch();
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Service Unavailable" }) });
  });
}

for (const reaches of [true, false]) {
  test(`a confirmation save answered 503 ${reaches ? "after it reached the database: the retry finds it and clears the message" : "before it reached the database: the retry sends it again"}-- small-claims`, async ({ page }) => {
    test.setTimeout(600_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await caseReadyToConfirm(page, userId);
      await failNextConfirmSave(page, reaches);
      await page.getByTestId("intake-confirm").click();
      const status = page.getByTestId("intake-save-status");
      await expect(status).toHaveAttribute("role", "alert", { timeout: 60_000 });

      await status.getByRole("button", { name: "Retry saving intake", exact: true }).click();
      await expect(status, "one retry did not clear the message").not.toHaveAttribute("role", "alert", { timeout: 60_000 });
      await expect(status).not.toContainText("could not be saved");
      await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "user-confirmed", { timeout: 30_000 });

      // The confirmation is in the saved case, not only on this page.
      await page.reload();
      await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
