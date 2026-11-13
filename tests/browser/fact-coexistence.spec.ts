/**
 * FAILING FIRST: A REMOVAL THROUGH THE NEW PATH WINS ON EVERY SCREEN (case core G0; CASE_CORE_DESIGN.md §11).
 *
 * EXPECTED TO FAIL TODAY, in all three courts. It is the browser half of test:fact-coexistence: the save
 * points and shared readers must pass it before they move (G1/G2). Not in CI until it passes.
 *
 * Steps (design §11), in Small Claims, civil and Family, signed in through the real save path:
 *   1. the other party typed into the court's whole form (an unconverted screen: the old copy);
 *   2. removed through the new path: POST /api/cases/facts { otherParty: removed };
 *   3. the whole form rewrites the old copy with the old name (typed again, the page's own save);
 *   4. reload; then every screen that shows the other party must not show the old name: the review, the
 *      overview after "Show my next step", the case page's title and "What we have so far", and the
 *      dashboard card. (Form prefill and generate-form's values: test:fact-coexistence, terminal.)
 *
 * Why it fails today (file:line): caseFileOf never reads caseFile.facts (caseFile.ts:234); the review
 * reads caseFileOf; the case title column is written from the analysis copy (builder/page.tsx:1099-1102)
 * and shown by the case page (cases/[id]/layout.tsx:289); the dashboard selects
 * master_result->intakeData (dashboard/page.tsx:171-190); and the tab's next whole-checkpoint save
 * erases the fact the server wrote (intakeCheckpoint.ts:115).
 *
 * THE REAL SAVE PATH: a real staging user and session (authenticateRealTestUser, refuses production).
 * Stand-ins, the only ones: the routes that would call a model (serveModelStandIns); the situation answers
 * clicked by the harness (autoAnswerSituation); and step 2's request, sent from the page with the page's
 * own session because no screen calls the route yet (the browser half of `give` is G2).
 * NEEDS STAGING: do not run while staging is in use by PR checks.
 */
import { expect, test, type Page } from "@playwright/test";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { recordInitialUnknowns, tickIfAsked } from "./harness/intakeReview";
import { openWholeForm, otherPartyScreens, postFacts, savedNow, typeOtherParty, type Court } from "./harness/factRail";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

const OLD = "Plum Yellow Movers Ltd.";
const STORY: Record<Court, string> = {
  "small-claims": "Synthetic: a moving company broke my dining table in May 2026. I have photos.",
  civil: "Synthetic: a supplier never delivered the machine I ordered in April 2026. I have the invoice.",
  family: "Synthetic: we separated in May 2026 and cannot agree on dividing the house.",
};

async function reviewAndNextStep(page: Page): Promise<{ review: string; overview: string }> {
  const panel = page.getByTestId("intake-review");
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
  const review = await panel.innerText();
  await recordInitialUnknowns(page);
  await tickIfAsked(page);
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  const overview = page.getByTestId("completed-case-overview");
  await expect(overview).toBeVisible({ timeout: 180_000 });
  return { review, overview: await overview.innerText() };
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`coexistence (${court}): the other party removed through POST /api/cases/facts stays removed on every screen after an unconverted form rewrites the old name`, async ({ page }) => {
    test.setTimeout(900_000);
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await serveModelStandIns(page, court, userId);
      const caseId = await openWholeForm(page, court, STORY[court]);
      expect(caseId, "the intake has a saved case").toMatch(/^[0-9a-f-]{36}$/);
      // 1. The old copy, typed into the whole form.
      await typeOtherParty(page, court, OLD);
      // 2. Removed through the new path.
      const removed = await postFacts(page, caseId, [{ fact: "otherParty", state: "removed", source: "person" }]);
      expect(removed.status, `POST /api/cases/facts answered ${JSON.stringify(removed.body)}`).toBe(200);
      expect(removed.body.saved?.map((item) => item.fact)).toEqual(["otherParty"]);
      // 3. The unconverted form writes the old copy again (emptied, then the old name typed back).
      await typeOtherParty(page, court, "");
      await typeOtherParty(page, court, OLD);
      await savedNow(page);
      // 4. Reload; every screen.
      await page.reload();
      const { review, overview } = await reviewAndNextStep(page);
      expect.soft(review, "the review does not show the removed name").not.toContain(OLD);
      expect.soft(overview, "the overview does not show the removed name").not.toContain(OLD);
      for (const screen of await otherPartyScreens(page, caseId)) expect.soft(screen.text, `${screen.where} does not show the removed name`).not.toContain(OLD);
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
