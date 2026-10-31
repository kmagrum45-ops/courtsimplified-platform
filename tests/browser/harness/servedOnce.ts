/**
 * A SERVED DATE THE PERSON DID NOT KNOW AT THE START IS NEVER ASKED AGAIN (site owner, 31 Oct; it
 * replaced option 1 of 24 Oct, "offered exactly once more in the review"): the review shows the quiet
 * line "Not answered yet: add it when you know" in the "Day you were served" box's place, never a box
 * or a question asking for it, and its "Add it" (ChangeAnswer, the one change path) takes the day when
 * the person knows it. The next step never asks it again: it shows the day given, or folds it.
 */
import { expect, type Locator, type Page } from "@playwright/test";
import { NOT_ANSWERED_YET } from "../../../src/lib/case-system/copy/askCopy";

const SERVED_IDS = ["sc-date-claim-served", "sc-date-defendants-claim-served", "case-date-served-with-application", "case-date-served-with-motion-to-change"];

/** In the review: no box and no question asks for the day served; the quiet line stands in the box's place. */
export async function expectServedNotAskedInReview(page: Page) {
  const panel = page.getByTestId("intake-review");
  await expect(panel.getByRole("textbox", { name: "Review: Day you were served", exact: true }), "the review does not ask the day served again (no box)").toHaveCount(0);
  await expect(panel.locator('[data-testid=intake-initial-question][data-question="servedDate"][data-answered=false]'), "nor as a question").toHaveCount(0);
  await expect(servedQuietLine(page), "the quiet line stands in its place").toContainText(NOT_ANSWERED_YET);
}

/** The review's quiet line for the day served (its box's place). */
export const servedQuietLine = (page: Page): Locator => page.getByTestId("intake-review").locator('[data-testid=not-answered-yet][data-fact="servedDate"]').first();

/** "Add it" on the quiet line, as a person adds the day once they know it: the text box it opens (ChangeAnswer). */
export async function openServedAdd(page: Page): Promise<Locator> {
  const line = servedQuietLine(page);
  await line.getByTestId("change-answer-open").click();
  const box = line.getByTestId("change-answer-text");
  await expect(box).toBeVisible();
  return box;
}

/** On the next step: no question for the day served (it is shown, or folded as "not known yet"). */
export async function expectServedNotAskedOnNextStep(page: Page) {
  const panel = page.getByTestId("stage-answer-panel");
  await expect(panel).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(1_500);
  for (const id of SERVED_IDS) {
    await expect(panel.locator(`[data-testid=stage-answer-date-question][data-question-id="${id}"]`), `the next step does not ask the day served again (${id})`).toHaveCount(0);
  }
}

/** Confirms the review (anything left as "I don't know yet") and opens the next step. */
export async function confirmAndShowNextStep(page: Page) {
  const panel = page.getByTestId("intake-review");
  const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
  while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1); }
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 90_000 });
}
