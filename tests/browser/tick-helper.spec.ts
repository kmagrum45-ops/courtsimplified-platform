/**
 * THE SHARED TICK HELPER ENFORCES "ONE TICK SETTLES EXACTLY THE TICKED BOX" (site owner, 15 Nov 2026).
 *
 * recordInitialUnknowns (harness/intakeReview.ts) ticks the review's "I do not know yet" boxes for 43 specs. After a tick,
 * another box may leave the page only when it asks the same fact as the ticked one (factsOfQuestion.ts: Small Claims'
 * outcome and counterclaim both ask "outcome", so after one is settled the other is not asked). This checks the helper
 * itself, on a page of its own whose script does each thing on purpose:
 *   - a box of the SAME fact leaves after the tick: the helper passes;
 *   - a box of a DIFFERENT fact leaves after the tick: the helper fails;
 *   - a tick that ticks a second box too: the helper fails.
 *
 * What failure it catches: the helper quietly accepting a tick that removed or settled a box it should not have, which
 * would let every spec using it miss that fault on the site.
 *
 * No server, no account: page.setContent only.
 */
import { expect, test, type Page } from "@playwright/test";
import { recordInitialUnknowns } from "./harness/intakeReview";

/** Three review questions with their tick boxes; `onTick` is what the page does when the first box is ticked. */
async function reviewWith(page: Page, ids: string[], onTick: string) {
  await page.setContent(`<div>${ids.map((id) => `<div data-question="${id}"><p>${id}</p><input type="checkbox" data-testid="intake-unknown"></div>`).join("")}</div>
    <script>
      const boxes = document.querySelectorAll('[data-testid="intake-unknown"]');
      boxes[0].addEventListener("change", () => { ${onTick} });
    </script>`);
}

test("the helper passes when a box asking the same fact leaves after a tick", async ({ page }) => {
  await reviewWith(page, ["sc-defendant-outcome", "sc-defendant-counterclaim", "sc-orient-when-happened"], `document.querySelector('[data-question="sc-defendant-counterclaim"]').remove();`);
  await recordInitialUnknowns(page);
  await expect(page.locator('[data-question="sc-orient-when-happened"] input')).toBeChecked();
});

test("the helper fails when a box asking a different fact leaves after a tick", async ({ page }) => {
  await reviewWith(page, ["sc-defendant-outcome", "sc-orient-when-happened", "sc-defendant-counterclaim"], `document.querySelector('[data-question="sc-orient-when-happened"]').remove();`);
  await expect(recordInitialUnknowns(page)).rejects.toThrow(/only a question asking the same fact may leave/);
});

test("the helper fails when one tick ticks a second box", async ({ page }) => {
  test.setTimeout(30_000);
  await reviewWith(page, ["sc-defendant-outcome", "sc-orient-when-happened", "sc-defendant-counterclaim"], `document.querySelector('[data-question="sc-orient-when-happened"] input').checked = true;`);
  await expect(recordInitialUnknowns(page)).rejects.toThrow(/one tick ticks exactly one box/);
});
