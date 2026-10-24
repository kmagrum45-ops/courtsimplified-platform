/**
 * A SERVED DATE THE PERSON DID NOT KNOW AT THE START IS OFFERED EXACTLY ONCE MORE (Jason,
 * 2026-10-24, option 1): in the review, as one field (the "Day you were served" box, never
 * also a question), and the next step never asks it again: it shows the day given, or folds
 * it ("not known yet -- Add it"), which is not a question.
 */
import { expect, type Page } from "@playwright/test";

const SERVED_IDS = ["sc-date-claim-served", "sc-date-defendants-claim-served", "case-date-served-with-application", "case-date-served-with-motion-to-change"];

/** In the review: one field for the day served -- the box -- and no question for it beside it. */
export async function expectServedOfferedOnceInReview(page: Page) {
  const panel = page.getByTestId("intake-review");
  await expect(panel.getByRole("textbox", { name: "Review: Day you were served", exact: true }), "the review offers the day served once, as one field").toHaveCount(1);
  await expect(panel.locator('[data-testid=intake-initial-question][data-question="servedDate"]'), "never also as a question beside the box").toHaveCount(0);
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
