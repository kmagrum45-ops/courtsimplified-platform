/**
 * TWO TABS, ONE FACT EACH -- A PER-FACT CONFLICT, NEVER A SILENT LOSS (case core G0; §12).
 *
 * Written failing first (G0); both halves are now built: the server (test:fact-rails: a write made against an
 * older view of a fact is a conflict for that fact only; the others save) and the page
 * (app/_components/NotSavedYet.tsx: "Not saved yet: <fact>", this tab's answer and the newer saved one beside it,
 * and "Save mine" to make this tab's the newest). Selectors updated 10 Nov 2026 to that markup
 * (data-testid="not-saved-yet-<fact>", button "Save mine"); every check keeps its meaning. Not in CI.
 *
 * Steps (design §12), on the Small Claims whole form, signed in through the real save path:
 *   1. the same case open in two tabs;
 *   2. the amount changed in tab 1 (6000) and saved;
 *   3. the amount changed differently in tab 2 (7000), and the other party (another fact) too, and saved;
 *   4. tab 2 shows "Not saved yet" with tab 1's value (6000) beside it, and tab 2's other party is saved;
 *   5. "Save mine" in tab 2; both tabs reloaded show 7000, and so does the case page.
 *
 * THE REAL SAVE PATH: a real staging user and session (authenticateRealTestUser, refuses production).
 * Stand-ins, the only ones: the routes that would call a model (serveModelStandIns) and the situation
 * answers clicked by the harness (autoAnswerSituation).
 * NEEDS STAGING: do not run while staging is in use by PR checks.
 */
import { expect, test, type Page } from "@playwright/test";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { openWholeForm, savedNow, typeOtherParty } from "./harness/factRail";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

const amountBox = (page: Page) => page.getByTestId("sc-intake-amountClaimed");
async function typeAmount(page: Page, amount: string) {
  await expect(amountBox(page)).toBeVisible({ timeout: 60_000 });
  await amountBox(page).fill(amount);
  // Wait for this tab's save to reach the server, so the two tabs' saves land in the order the steps say
  // (without it, tab 2's save could land first and the conflict would be tab 1's).
  const answered = page.waitForResponse((response) => response.url().includes("/api/cases/facts") && response.request().method() === "POST", { timeout: 60_000 });
  await amountBox(page).blur();
  await answered;
  await savedNow(page);
}
const openForm = async (page: Page, caseId: string) => {
  await page.goto(`/builder?path=small-claims&caseId=${caseId}&step=form`);
  await expect(amountBox(page)).toBeVisible({ timeout: 60_000 });
};

test("two tabs (small-claims): the amount changed in both tabs is a conflict for the amount only; the other tab's other fact saves; Save makes it the newest", async ({ page, context }) => {
  test.setTimeout(900_000);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await serveModelStandIns(page, "small-claims", userId);
    const caseId = await openWholeForm(page, "small-claims", "Synthetic: a moving company broke my dining table in May 2026. I have photos.");
    await typeAmount(page, "5000");
    await typeOtherParty(page, "small-claims", "Acme Movers Ltd.");

    // 1. The same case in a second tab (the same signed-in browser).
    const tab2 = await context.newPage();
    await serveModelStandIns(tab2, "small-claims", userId);
    await openForm(tab2, caseId);
    await expect(amountBox(tab2)).toHaveValue(/5,?000/);

    // 2-3. Tab 1 saves 6000; tab 2, still showing 5000, saves 7000 and a new other party.
    await typeAmount(page, "6000");
    await typeAmount(tab2, "7000");
    await typeOtherParty(tab2, "small-claims", "Beta Movers Ltd.");

    // 4. Tab 2: "Not saved yet" with tab 1's value beside it; its other fact saved.
    const notSaved = tab2.getByText(/Not saved yet/).first();
    await expect(notSaved, "tab 2 shows its amount as not saved yet").toBeVisible({ timeout: 30_000 });
    const holder = tab2.getByTestId("not-saved-yet-amount");
    await expect(holder, "the not-saved-yet notice is for the amount").toContainText(/Not saved yet/);
    await expect(holder, "tab 1's saved value is shown beside it").toContainText(/6,?000/);
    await expect(holder, "tab 2's own entry is shown too").toContainText(/7,?000/);
    await expect(tab2.locator('[data-testid^="not-saved-yet-"]').filter({ hasText: /Not saved yet/ }), "only the amount is not saved yet").toHaveCount(1);
    await openForm(page, caseId);
    await expect(page.getByTestId("sc-intake-otherParty"), "tab 2's other fact (the other party) is saved").toHaveValue("Beta Movers Ltd.");
    await expect(amountBox(page), "tab 2's conflicting amount was not applied").toHaveValue(/6,?000/);

    // 5. "Save mine" in tab 2 makes it the newest save.
    await holder.getByRole("button", { name: /^Save mine$/ }).click();
    await savedNow(tab2);
    await openForm(page, caseId);
    await openForm(tab2, caseId);
    await expect(amountBox(page), "reloaded, tab 1 shows tab 2's saved amount").toHaveValue(/7,?000/);
    await expect(amountBox(tab2), "reloaded, tab 2 shows its saved amount").toHaveValue(/7,?000/);
    await page.goto(`/cases/${caseId}`);
    const amountLine = page.locator('[data-testid="case-file-line"][data-fact="amount"]');
    await expect(amountLine, "the case page shows tab 2's amount").toContainText(/7,?000/, { timeout: 60_000 });
  } finally {
    await deleteHarnessUser(userId);
  }
});
