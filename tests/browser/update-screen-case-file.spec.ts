/**
 * THE CASE PAGE'S "UPDATE MY NEXT STEPS" SCREEN SHOWS "WHAT WE HAVE SO FAR", AS THE "REVIEW AND CONFIRM AGAIN" SCREEN DOES
 * (Chrome check of #544 on a8c8cf57, 7 Nov 2026, step 7 and "Anything else wrong" 4).
 *
 * Chrome, Small Claims: after an answer was added on a confirmed case, the case page showed only "Your information is
 * confirmed / Your next steps were made before your latest answer ... / Update my next steps"; "What we have so far" was
 * not on the page, so the new answer could not be checked until the next steps were made again. Cause: when the next
 * steps are out of date the case page shows a short screen instead of its tabs (app/cases/[id]/layout.tsx), and the case
 * file panel was added (#536, 1 Nov) only to its "review and confirm again" version.
 *
 * What it checks, Small Claims, with the real save path (a real local or staging account; realTestSession.ts refuses
 * production) and the model stand-ins: a confirmed case with its next step shown; the whole form opened from the
 * overview and an other party added (a new answer, so the confirmation stands and the next steps are out of date); the
 * case page then shows "Update my next steps" with "What we have so far", holding the new other party.
 *
 * WHAT FAILURE THIS CATCHES: a case page that hides the person's answers while asking them to update their next steps.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser, harnessAdmin } from "./harness/realTestSession";
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

test("\"Update my next steps\" on the case page shows \"What we have so far\" with the answer just added -- small-claims", async ({ page }) => {
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

    // The next step made, then a new answer added on the whole form.
    await page.goto(`/cases/${caseId}`);
    await page.getByTestId("case-show-next-step").click();
    await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 240_000 });
    await page.getByTestId("open-whole-form").click();
    // A new answer typed on the whole form: what the person wants the court to order (fact wants), which this case holds as "not sure" (an answer added, not a change: "not sure" is no answer for the next steps, intakeReview.ts materialFacts). Not the
    // other party's name: since 23 Nov 2026 it is given on the Parties step, whose details are not yet among the facts the
    // next steps rest on (open finding, local run of 24 Nov). Not the evidence box: evidence is optional for the next
    // steps (intakeReview.ts OPTIONAL), so adding it never made them out of date.
    const sent = page.waitForResponse((response) => response.url().includes("/api/cases/facts") && response.request().method() === "POST", { timeout: 60_000 });
    await page.getByTestId("sc-intake-goal").fill("Synthetic: repayment of the $5,000 for the roof work");
    await page.getByTestId("sc-intake-goal").blur();
    expect((await sent).ok(), "the new answer was not saved").toBe(true);
    await expect(page.getByTestId("intake-save-status")).toContainText("Intake saved to your account.", { timeout: 60_000 });
    // Saved in the case row (the real save path) before the case page is opened.
    await expect.poll(async () => JSON.stringify((await harnessAdmin().from("cases").select("master_result").eq("id", caseId).single()).data?.master_result ?? {}).includes("repayment of the"), { timeout: 60_000, message: "the new answer was not saved" }).toBe(true);

    await page.goto(`/cases/${caseId}`);
    await expect(page.getByTestId("case-update-next-steps"), "the case page does not offer to update the next steps").toBeVisible({ timeout: 60_000 });
    const file = page.getByTestId("case-file");
    await expect(file, "\"What we have so far\" is hidden on the update screen").toBeVisible({ timeout: 15_000 });
    await expect(file.locator('[data-testid="case-file-line"][data-fact="wants"]'), "the new answer is not shown").toContainText("repayment of the");
  } finally {
    await deleteHarnessUser(userId);
  }
});
