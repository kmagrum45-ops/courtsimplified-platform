/**
 * A CLICK ON "SHOW MY NEXT STEP" RIGHT AFTER CONFIRM IS NEVER DROPPED (rule 7, site owner 6 Nov 2026).
 *
 * Founder's Chrome check of #544 (6 Nov), step 13: the first click on the review's "Show my next step", right after
 * "Confirm my initial information", did nothing; a second click worked. Cause, reproduced locally on main and on
 * #544: when Confirm's save ends, the panel shows the button while its `busy` flag is still set, so the button is
 * drawn disabled (only faded) for a moment, and a click in that moment is ignored with no word why
 * (IntakeReviewPanel.tsx, `disabled={busy || ...}`). Playwright's own click waits for an enabled button, which is
 * why no test saw it: this one clicks the instant the button is in the page, as a person can.
 *
 * What it checks, in all three courts, on this commit's code with the real save path (a real local or staging
 * account, realTestSession.ts refuses production) and the model stand-ins: a click armed before Confirm fires the
 * moment the button appears, and the next step is shown with no second click. While a save is still running the
 * button says "Saving…" and runs the click when the save ends.
 *
 * WHAT FAILURE THIS CATCHES: a button that silently ignores a click.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { recordInitialUnknowns, saveCaseStory, tickIfAsked } from "./harness/intakeReview";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const STORY = "Synthetic: I paid a contractor $5,000 in March 2026 to repair my roof and the work was never done.";

/** A click on the review's "Show my next step" the moment it is in the page, enabled or not; returns what it saw. */
async function armInstantClick(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __instant?: { disabled: boolean; text: string | null }[] };
    w.__instant = [];
    const tryClick = () => {
      const button = document.querySelector<HTMLButtonElement>("[data-testid=intake-continue-guidance]");
      if (!button) return false;
      w.__instant!.push({ disabled: button.disabled, text: button.textContent });
      button.click();
      return true;
    };
    const watcher = new MutationObserver(() => { if (tryClick()) watcher.disconnect(); });
    watcher.observe(document.body, { subtree: true, childList: true, attributes: true });
  });
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`one click on "Show my next step" the instant it appears after Confirm shows the next step -- ${court}`, async ({ page }) => {
    test.setTimeout(480_000);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      if (court === "small-claims") {
        await openBuilder(page, court, { city: "Ottawa" });
        await page.getByRole("button", { name: "Fill in the form yourself" }).click();
        await page.getByLabel("Case story", { exact: true }).fill(STORY);
        await saveCaseStory(page);
        await page.getByTestId("sc-intake-amountClaimed").fill("$5,000");
        await page.getByTestId("sc-intake-amountClaimed").blur();
      } else {
        await openBuilder(page, court, { city: "Ottawa", story: STORY });
        await page.getByTestId("guided-form-show-form").click();
      }
      const panel = page.getByTestId("intake-review");
      if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
      await expect(panel).toHaveAttribute("data-phase", "reviewing");
      const kind = page.locator('[data-question="sc-orient-dispute-category"]').getByRole("button").first();
      if (await kind.count()) await kind.click();
      const filed = page.locator('[data-question="sc-claim-filed"]');
      if (await filed.count()) await filed.getByRole("button", { name: "No", exact: true }).click();
      await recordInitialUnknowns(page);
      await tickIfAsked(page);
      await armInstantClick(page);
      await page.getByTestId("intake-confirm").click();
      await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
      const seen = await page.evaluate(() => (window as unknown as { __instant?: unknown[] }).__instant ?? []);
      expect(seen.length, "the instant click reached the button").toBeGreaterThan(0);
      // No second click: the one click shows the next step (or says it is working on it).
      await expect(page.getByTestId("completed-case-overview").or(page.getByText(/Working out your next step|Saving…/)).first(), `the first click was ignored (button when clicked: ${JSON.stringify(seen)})`).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId("completed-case-overview"), "the next step from that one click").toBeVisible({ timeout: 180_000 });
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
