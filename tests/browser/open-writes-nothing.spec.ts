/**
 * OPENING A SCREEN OF A CONFIRMED CASE, WITH NOTHING CHANGED, SAVES NOTHING: NO "COULD NOT BE SAVED", NO LEAVE GUARD,
 * AND THE CONFIRMATION STAYS (Chrome check of #544 on 99e2ec0, 7 Nov 2026, "Could not be saved" 1-3, F9).
 *
 * Chrome, Small Claims, signed in: after only opening the review and the whole form, "Your case could not be saved just
 * now. Try again. Retry saving intake" showed, and the page refused to be left until Retry was pressed. Cause found
 * here: opening a route wrote page bookkeeping (which route is open, "builder".step and "builder".startedModes) as if
 * the person had answered something, so every open sent a save of the whole case, and a save slower than the 10 s
 * request limit (positionSave.ts CASE_REQUEST_TIMEOUT_MS) said "could not be saved" and left the tab marked unsaved,
 * which is what the leave guard blocks on. And the whole form's first opening after a "Change" put the case file's
 * words in its boxes before it recorded that those words were the fill's, so for a moment the box looked like a new
 * answer and the confirmation was cancelled ("You changed an answer, so please review and confirm again").
 *
 * What it checks, with the real save path (a real local or staging account; realTestSession.ts refuses production) and
 * the model stand-ins, every save of the case row held for 15 s (longer than the request limit) after Confirm:
 *   1. a confirmed case whose story was edited, the questions started again from it and the amount changed with "Change"
 *      and confirmed (Chrome step 20); the whole form opened for the first time: still confirmed;
 *   2. the questions route opened, then the whole form again: no "could not be saved", and leaving is not refused.
 *
 * WHAT FAILURE THIS CATCHES: a write sent only because a screen was opened, its failure shown as the person's case not
 * saving, a leave guard with nothing to protect, or a confirmation cancelled by opening the form.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { confirmReview, DECK_STORY, deckChat, openReview, startDeckCase } from "./harness/deckCase";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

/** Every PATCH of the case row from now on takes `ms` before it is sent. */
async function slowCaseSaves(page: Page, ms: number) {
  await page.route("**/rest/v1/cases?**", async (route) => {
    if (route.request().method() !== "PATCH") return route.fallback();
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.fallback().catch(() => undefined);
  });
}

test("opening the whole form and the questions of a confirmed case saves nothing, cancels nothing, and never blocks leaving -- small-claims", async ({ page }) => {
  test.setTimeout(900_000);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    await serveModelStandIns(page, "small-claims", userId);
    await startDeckCase(page);
    const id = new URL(page.url()).searchParams.get("intake") ?? "";
    await deckChat(page);
    await openReview(page, id);
    await confirmReview(page);
    await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
    await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 180_000 });
    // The story edited and saved, the questions started again from it, then the amount changed with "Change" and
    // confirmed (Chrome step 20; the whole form not opened yet).
    await openReview(page, id);
    await page.getByTestId("review-story-draft").fill(`${DECK_STORY} I asked them twice to come back and finish.`);
    await page.getByTestId("review-story-save").click();
    await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
    await page.goto(`/builder?path=small-claims&intake=${id}&step=guided`);
    const restart = page.getByRole("button", { name: "Start the questions again from my story" }).first();
    await expect(restart).toBeVisible({ timeout: 60_000 });
    await restart.click();
    const sendStory = page.getByTestId("guided-send-saved-story").or(page.getByRole("button", { name: "Send my story" })).first();
    if (await sendStory.isVisible({ timeout: 15_000 }).catch(() => false)) await sendStory.click();
    await expect(page.getByText("That's everything needed for now").or(page.locator("[data-testid=guided-message][data-from=assistant]").last()).first()).toBeVisible({ timeout: 120_000 });
    await page.waitForTimeout(4_000);
    const panel = await openReview(page, id);
    const held = panel.locator("[data-testid=intake-entry-held][data-fact=amount]").first();
    const box = panel.locator('[data-testid=intake-entry][data-field="amountClaimed"], [data-testid=intake-entry][data-field="amountClaimedText"]').first().locator("input, textarea").first();
    if (await held.count()) {
      await held.getByTestId("change-answer-open").click();
      await held.getByTestId("change-answer-text").fill("$9,900");
      await held.getByTestId("change-answer-save").click();
    } else { await box.fill("$9,900"); await box.blur(); }
    await page.waitForTimeout(3_000);
    if ((await panel.getAttribute("data-phase")) !== "user-confirmed") await confirmReview(page);
    await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });

    // 1. The whole form, opened for the first time (its boxes filled from the case file): the case stays confirmed.
    await page.goto(`/builder?path=small-claims&intake=${id}&step=form`);
    const review = page.getByTestId("intake-review");
    await expect(review).toHaveAttribute("data-phase", "user-confirmed", { timeout: 60_000 });
    await page.waitForTimeout(8_000);
    await expect(review, "1. opening the whole form cancelled the confirmation").toHaveAttribute("data-phase", "user-confirmed");
    await expect(page.getByTestId("intake-save-status")).not.toContainText(/could not be saved/i);

    // 2. Every save now slower than the request limit; the questions route, then the whole form, opened with nothing changed.
    await slowCaseSaves(page, 15_000);
    const dialogs: string[] = [];
    page.on("dialog", (dialog) => { dialogs.push(dialog.type()); void dialog.accept().catch(() => undefined); });
    for (const step of ["guided", "form"]) {
      await page.goto(`/builder?path=small-claims&intake=${id}&step=${step}`);
      await expect(review).toHaveAttribute("data-phase", "user-confirmed", { timeout: 60_000 });
      await page.waitForTimeout(16_000);
      await expect(page.getByTestId("intake-save-status"), `2. opening ${step} with nothing changed said the case could not be saved`).not.toContainText(/could not be saved/i);
    }
    expect(dialogs, "2. leaving was refused (a leave guard) with nothing changed").toEqual([]);
    await expect(review).toHaveAttribute("data-phase", "user-confirmed");
  } finally {
    await deleteHarnessUser(userId);
  }
});
