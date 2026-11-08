/**
 * "START THE QUESTIONS AGAIN FROM MY STORY" KEEPS THE OTHER PARTY'S NAME: IN THE CASE HEADING, THE REVIEW AND THE WHOLE
 * FORM (Chrome check of #544 on 9b960f7, 8 Nov 2026, F15).
 *
 * Chrome, Small Claims: the other party typed in the whole form ("Alex Testwood"), so the case page, case file and
 * dashboard said "Your case with Alex Testwood". After a sentence was added to the story, the questions started again
 * from it and the case confirmed again, the case page and case file heading said "Small Claims case", while "The other
 * party: Alex Testwood" was still on both. Cause: the heading is read from the copy of the answers saved with the last
 * next step (master_result.intakeData.otherParty, CaseHomeContext.tsx caseTitle), not from the case file.
 *
 * What it checks, Small Claims (the restart is a Small Claims chat), with the real save path (a real local or staging
 * account; realTestSession.ts refuses production) and the model stand-ins: a confirmed case whose other party was typed
 * in the whole form and whose next step was shown; the story added to, the questions started again from it, confirmed
 * again and the next step shown again; then the case heading and the whole form still name the other party, and the review still does where it did before.
 *
 * WHAT FAILURE THIS CATCHES: an answer the person gave lost, or shown in one place and not another, after a restart.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { confirmReview, DECK_STORY, deckChat, openReview, startDeckCase } from "./harness/deckCase";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const NAME = "Alex Testwood";

async function showNextStep(page: Page) {
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 180_000 });
  await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
  await page.waitForTimeout(3_000);
}

test("a restart from the story keeps the other party's name in the heading, the review and the whole form -- small-claims", async ({ page }) => {
  test.setTimeout(900_000);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    await serveModelStandIns(page, "small-claims", userId);
    await startDeckCase(page);
    const id = new URL(page.url()).searchParams.get("intake") ?? "";
    await deckChat(page);
    // The other party typed in the whole form (Chrome step 6), then confirmed and the next step shown.
    await page.goto(`/builder?path=small-claims&intake=${id}&step=form`);
    await page.getByTestId("sc-intake-otherParty").fill(NAME);
    await page.getByTestId("sc-intake-otherParty").blur();
    await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
    await openReview(page, id);
    await confirmReview(page);
    await showNextStep(page);
    await page.goto(`/cases/${id}`);
    await expect(page.getByRole("heading", { level: 1 }).first(), "before the restart, the heading names the other party").toContainText(NAME, { timeout: 60_000 });

    // What the review and the whole form show of the other party before the restart; the same is shown after it.
    const reviewBefore = ((await (await openReview(page, id)).textContent()) ?? "").includes(NAME);
    await page.goto(`/builder?path=small-claims&intake=${id}&step=form`);
    await expect(page.getByTestId("sc-intake-otherParty")).toHaveValue(NAME, { timeout: 60_000 });
    console.log(`F15 before the restart: the review names the other party: ${reviewBefore}`);

    // The story added to and saved, the questions started again from it, sent, confirmed and the next step again (Chrome step 14).
    await openReview(page, id);
    await page.getByTestId("review-story-draft").fill(`${DECK_STORY} I asked them twice to come back and finish.`);
    await page.getByTestId("review-story-save").click();
    await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
    await page.goto(`/builder?path=small-claims&intake=${id}&step=guided`);
    const restart = page.getByRole("button", { name: "Start the questions again from my story" }).filter({ visible: true }).first();
    await expect(restart).toBeVisible({ timeout: 60_000 });
    await restart.click();
    const sendStory = page.getByTestId("guided-send-saved-story").or(page.getByRole("button", { name: "Send my story" })).first();
    if (await sendStory.isVisible({ timeout: 15_000 }).catch(() => false)) await sendStory.click();
    await expect(page.getByText("That's everything needed for now").or(page.locator("[data-testid=guided-message][data-from=assistant]").last()).first()).toBeVisible({ timeout: 120_000 });
    await page.waitForTimeout(4_000);
    await openReview(page, id);
    if ((await page.getByTestId("intake-review").getAttribute("data-phase")) !== "user-confirmed") await confirmReview(page);
    await showNextStep(page);

    // After the restart: the heading, the review and the whole form still name the other party.
    await page.goto(`/cases/${id}`);
    await expect(page.getByRole("heading", { level: 1 }).first(), "after the restart, the case heading lost the other party").toContainText(NAME, { timeout: 60_000 });
    await page.goto(`/cases/${id}/case-file`);
    await expect(page.getByTestId("case-file").getByRole("heading", { level: 2 }), "after the restart, the case file heading lost the other party").toContainText(NAME, { timeout: 60_000 });
    const review = await openReview(page, id);
    if (reviewBefore) await expect(review, "after the restart, the review lost the other party").toContainText(NAME);
    await page.goto(`/builder?path=small-claims&intake=${id}&step=form`);
    await expect(page.getByTestId("sc-intake-otherParty"), "after the restart, the whole form lost the other party").toHaveValue(NAME, { timeout: 60_000 });
  } finally {
    await deleteHarnessUser(userId);
  }
});
