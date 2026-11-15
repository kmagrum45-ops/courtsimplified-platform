/** Explicitly record unknown initial answers through the UI, then confirm the current summary. */
import { expect, type Page } from "@playwright/test";
export async function recordInitialUnknowns(page: Page) {
  const unknowns = page.locator('input[data-testid="intake-unknown"]:not(:checked)');
  const ticked = page.locator('input[data-testid="intake-unknown"]:checked');
  while (await unknowns.count()) {
    const count = await unknowns.count();
    const before = await ticked.count();
    await unknowns.first().check();
    // One tick settles exactly the ticked box: one more box is ticked, never another ticked for the person (site owner's
    // ticked-box rule). The unticked list shrinks by at least that one: a question that asks the same fact is then not
    // asked (never ask twice; e.g. Small Claims' outcome and counterclaim both ask "outcome", 057db2c3), so it leaves the
    // page, unticked (PR #550 CI, stage-rule: 2 unticked became 0 after one tick).
    await expect.poll(() => ticked.count(), { message: "one tick ticks exactly one box" }).toBe(before + 1);
    await expect.poll(() => unknowns.count(), { message: "the ticked box leaves the unticked list" }).toBeLessThanOrEqual(count - 1);
  }
}
export async function confirmInitialInformation(page: Page) {
  if (await page.getByTestId("intake-review").getAttribute("data-phase") === "user-confirmed") return;
  if (await page.getByTestId("intake-review").getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
  await recordInitialUnknowns(page);
  await tickIfAsked(page);
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

/**
 * The review's tick, only when the review asks for it (site owner, 11 Nov 2026): it asks only while an offer from the
 * story is undecided; a value the person typed never asks for confirmation. Specs that ticked it every time tick it
 * here instead, so nothing they check changes.
 */
export async function tickIfAsked(page: Page) {
  // Since 12 Nov there is no tick: each story offer still undecided in the review has its own choices (site owner, "three
  // choices, no tick"). "No, that's not right" leaves the suggestion unused and the box empty, as the tick did.
  const offers = page.getByTestId("intake-review").getByTestId("review-offer-no");
  for (let i = 0; i < 20 && (await offers.count()); i++) {
    const left = await offers.count();
    await offers.first().click();
    for (let wait = 0; wait < 80 && (await offers.count()) >= left; wait++) await page.waitForTimeout(250);
  }
  const tick = page.getByTestId("intake-review-acknowledgement");
  if (await tick.waitFor({ state: "visible", timeout: 3_000 }).then(() => true, () => false)) await tick.check();
}
