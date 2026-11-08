/**
 * "START THE QUESTIONS AGAIN FROM MY STORY" ON THE WHOLE FORM IS ONE BUTTON THE PERSON CAN SEE, AND A REAL CLICK ON IT
 * STARTS THE QUESTIONS AGAIN (Chrome check of #544 on 9b960f7, 8 Nov 2026, F16).
 *
 * Chrome, Small Claims: after "Save story" on the review opened from the whole form (step=form), the page listed "Start
 * the questions again from my story", but it was not visible and a normal click did nothing; a scripted press worked.
 * Cause found here: once the questions route has been opened, the Small Claims chat stays on the page, hidden
 * (builder page.tsx, `hidden` while the whole form shows), and its own restart button with it; and the whole form's
 * own notice (StoryChangedNotice "questions") had a button of the same name that only set the earlier answers aside
 * and stayed on the form, so the questions never started again (and the confirmation was cancelled).
 *
 * What it checks, Small Claims (whose chat is kept hidden) with the real save path (a real local or staging account;
 * realTestSession.ts refuses production) and the model stand-ins: a confirmed case whose questions were answered; the
 * review opened from the whole form, the story added to and saved; then
 *   1. exactly one "Start the questions again from my story" is visible, with a size, on screen once scrolled to, and
 *      not covered (the element at its centre is the button);
 *   2. a real Playwright click on it (no force, no script) opens the questions again: the questions route shows, and
 *      the story is sent or the questions are asked.
 *
 * WHAT FAILURE THIS CATCHES: a button the person cannot see or press, or one that does not do what it says.
 */
import { expect, test } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { confirmReview, DECK_STORY, deckChat, openReview, startDeckCase } from "./harness/deckCase";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const NAME = "Start the questions again from my story";

test("on the whole form, \"Start the questions again from my story\" is one visible button and a real click starts the questions again -- small-claims", async ({ page }) => {
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
    await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });

    // The review opened from the whole form, the story added to and saved (Chrome step 14).
    const review = await openReview(page, id, "form");
    await review.getByTestId("review-story-draft").fill(`${DECK_STORY} I asked them twice to come back and finish.`);
    await review.getByTestId("review-story-save").click();
    await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
    await page.waitForTimeout(2_000);

    // What every button of that name is, as Chrome's tools would find it.
    const all = page.locator("button", { hasText: NAME });
    const report = await all.evaluateAll((buttons) => buttons.map((button) => {
      const box = button.getBoundingClientRect();
      const style = getComputedStyle(button);
      return { hiddenAncestor: Boolean(button.closest("[hidden]")), width: box.width, height: box.height, display: style.display, visibility: style.visibility, disabled: (button as HTMLButtonElement).disabled };
    }));
    console.log(`F16 buttons named "${NAME}": ${JSON.stringify(report)}`);
    const visible = page.getByRole("button", { name: NAME }).filter({ visible: true });
    await expect(visible, "1. exactly one visible button of that name").toHaveCount(1, { timeout: 30_000 });
    await visible.scrollIntoViewIfNeeded();
    const covered = await visible.evaluate((button) => {
      const box = button.getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return !(top === button || button.contains(top));
    });
    expect(covered, "1. the button is covered by something else").toBe(false);

    // A real click: the questions open again from the story.
    await visible.click();
    await expect.poll(() => new URL(page.url()).searchParams.get("step"), { timeout: 30_000, message: "2. the click did not open the questions" }).toBe("guided");
    const chat = page.locator("[data-testid=guided-message]").or(page.getByTestId("guided-send-saved-story")).or(page.getByRole("button", { name: "Send my story" })).first();
    await expect(chat, "2. the questions did not start again").toBeVisible({ timeout: 60_000 });
  } finally {
    await deleteHarnessUser(userId);
  }
});
