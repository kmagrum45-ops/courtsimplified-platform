/** Explicitly record unknown initial answers through the UI, then confirm the current summary. */
import { expect, type Page } from "@playwright/test";
export async function recordInitialUnknowns(page: Page) {
  const unknowns = page.locator('input[data-testid="intake-unknown"]:not(:checked)');
  while (await unknowns.count()) {
    const count = await unknowns.count();
    await unknowns.first().check();
    await expect(unknowns).toHaveCount(count - 1);
  }
}
export async function confirmInitialInformation(page: Page) {
  if (await page.getByTestId("intake-review").getAttribute("data-phase") === "user-confirmed") return;
  if (await page.getByTestId("intake-review").getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
  await recordInitialUnknowns(page);
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "user-confirmed");
}

/**
 * "Edit case story" is a draft saved by "Save story" in all three areas (StoryEditor,
 * L42 and the #468 re-test). Call after typing into "Case story": it presses Save
 * when there are unsaved edits, and does nothing otherwise.
 */
export async function saveCaseStory(page: Page) {
  const save = page.locator('[data-testid$="story-save"]:visible').first();
  if ((await save.count()) && (await save.isEnabled())) await save.click();
}
