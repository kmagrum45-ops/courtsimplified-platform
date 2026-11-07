/**
 * A WHOLE-FORM BOX FOLLOWS THE NEWEST SAVED ANSWER (rule 3, site owner 6 Nov 2026; Chrome check of #544, step 14).
 *
 * Chrome typed $7,250 into the Small Claims whole form, then changed the amount on the review to $8,150 and then
 * $9,350. The review, overview, case page and chat all showed $9,350; the whole form's box still showed $7,250, after
 * a reload too. Cause: a box followed a newer answer only while it held words the fill had put there
 * (asker.ts filledToFollow); a box the person had typed in was "theirs" and never followed again. Civil and Family
 * forms had no follow at all. Reproduced locally on main and on #544.
 *
 * The rule: a box protects only text being typed and not yet sent. Once saved, the box follows the newest saved
 * answer. A cleared box records a removal and stays empty until a newer answer arrives.
 *
 * What it checks, in all three courts, on this commit's code with the real save path (a real local or staging
 * account, realTestSession.ts refuses production) and the model stand-ins:
 *   1. a value typed in the whole form, then changed on the review with "Change": the form's box shows the newest
 *      answer, and still does after a reload;
 *   2. the box cleared: it stays empty after a reload;
 *   3. a newer answer given on the review after that: the box shows it;
 *   4. (rule 6) a box following is not an answer: after the review change is confirmed and the next step shown,
 *      opening the form (the box follows) and saving the tab leaves the case page current: no "made before your
 *      latest answer", no "confirm again".
 *
 * WHAT FAILURE THIS CATCHES: a form box showing an answer the person has since changed (its own copy).
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { recordInitialUnknowns, saveCaseStory } from "./harness/intakeReview";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const STORY = "Synthetic: I paid a contractor in March 2026 to repair my roof and the work was never done.";
const CASES = {
  "small-claims": { fact: "amount", first: "$7,250", changed: "$8,150", shown: /8,150/, newer: "$9,350", newerShown: /9,350/ },
  civil: { fact: "otherParty", first: "Testwood Roofing Ltd.", changed: "Northgate Roofing Inc.", shown: /Northgate Roofing Inc\./, newer: "Eastline Roofing Co.", newerShown: /Eastline Roofing Co\./ },
  family: { fact: "otherParty", first: "Jordan Testwood", changed: "Morgan Testwood", shown: /Morgan Testwood/, newer: "Riley Testwood", newerShown: /Riley Testwood/ },
} as const;
type Court = keyof typeof CASES;

function box(page: Page, court: Court) {
  if (court === "small-claims") return page.getByTestId("sc-intake-amountClaimed");
  return page.locator("label").filter({ has: page.locator("span.font-semibold", { hasText: /^Other party$/ }) }).locator("input, textarea").first();
}
async function openForm(page: Page, court: Court, caseId: string) {
  await page.goto(`/builder?path=${court}&intake=${caseId}${court === "small-claims" ? "&step=form" : ""}`);
  const show = page.getByTestId("guided-form-show-form");
  await expect(show.or(box(page, court)).first()).toBeVisible({ timeout: 60_000 });
  if (await show.isVisible().catch(() => false)) await show.click();
  await expect(box(page, court)).toBeVisible({ timeout: 60_000 });
}
/**
 * "Change" for the fact, as the case page's "Change" opens it (?change=<fact>, the review with that fact's Change box):
 * a new value typed and saved. A different place from the form's own box, as Chrome's review change was.
 */
async function changeOnReview(page: Page, court: Court, caseId: string, value: string) {
  await page.goto(`/builder?path=${court}&intake=${caseId}${court === "small-claims" ? "&step=form" : ""}&change=${CASES[court].fact}`);
  const panel = page.getByTestId("intake-review");
  await expect(panel).toBeVisible({ timeout: 60_000 });
  // Not confirmed (a change since), the review is opened first, as the person does.
  if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
  const change = panel.locator(`[data-testid=change-answer][data-fact=${CASES[court].fact}]`).first();
  await expect(change).toBeVisible({ timeout: 30_000 });
  if (!(await change.getByTestId("change-answer-text").isVisible().catch(() => false))) await change.getByTestId("change-answer-open").click();
  const held = change;
  const text = held.getByTestId("change-answer-text");
  await text.fill(value);
  await held.getByTestId("change-answer-save").click();
  await page.waitForTimeout(3_000);
}

for (const court of Object.keys(CASES) as Court[]) {
  test(`the whole form's box follows the newest saved answer; a cleared box stays empty until a newer one -- ${court}`, async ({ page }) => {
    test.setTimeout(480_000);
    const c = CASES[court];
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      if (court === "small-claims") {
        await openBuilder(page, court, { city: "Ottawa" });
        await page.getByRole("button", { name: "Fill in the form yourself" }).click();
        await page.getByLabel("Case story", { exact: true }).fill(STORY);
        await saveCaseStory(page);
      } else {
        await openBuilder(page, court, { city: "Ottawa", story: STORY });
        await page.getByTestId("guided-form-show-form").click();
      }
      await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
      const caseId = new URL(page.url()).searchParams.get("intake") ?? "";
      const field = box(page, court);
      await field.fill(c.first);
      await field.blur();
      await page.waitForTimeout(3_000);
      // Confirmed, as Chrome had: the case page's "Change" opens a confirmed review.
      const kind = page.locator('[data-question="sc-orient-dispute-category"]').getByRole("button").first();
      const panel0 = page.getByTestId("intake-review");
      if (await panel0.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
      await expect(panel0).toHaveAttribute("data-phase", "reviewing");
      if (await kind.count()) await kind.click();
      const filed = page.locator('[data-question="sc-claim-filed"]');
      if (await filed.count()) await filed.getByRole("button", { name: "No", exact: true }).click();
      await recordInitialUnknowns(page);
      await page.getByTestId("intake-review-acknowledgement").check();
      await page.getByTestId("intake-confirm").click();
      await expect(panel0).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });

      // 1. Changed on the review: the form's box follows, after a reload too.
      await changeOnReview(page, court, caseId, c.changed);
      await openForm(page, court, caseId);
      await expect(box(page, court), "the form's box shows the answer changed on the review").toHaveValue(c.shown, { timeout: 15_000 });
      await page.reload();
      await openForm(page, court, caseId);
      await expect(box(page, court), "after a reload too").toHaveValue(c.shown, { timeout: 15_000 });

      // 4. Following is not an answer (rule 6): confirm the change, show the next step, open the form, then the case page.
      await page.goto(`/builder?path=${court}&intake=${caseId}${court === "small-claims" ? "&step=form" : ""}`);
      const panel4 = page.getByTestId("intake-review");
      await expect(panel4).toBeVisible({ timeout: 60_000 });
      if (await panel4.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
      if (await panel4.getAttribute("data-phase") !== "user-confirmed") {
        await expect(panel4).toHaveAttribute("data-phase", "reviewing");
        await recordInitialUnknowns(page);
        await page.getByTestId("intake-review-acknowledgement").check();
        await page.getByTestId("intake-confirm").click();
        await expect(panel4).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
      }
      await page.getByTestId("intake-continue-guidance").click();
      await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 180_000 });
      await openForm(page, court, caseId);
      await expect(box(page, court)).toHaveValue(c.shown, { timeout: 15_000 });
      await page.waitForTimeout(4_000);
      await page.goto(`/cases/${caseId}`);
      await expect(page.getByTestId("case-file").or(page.getByTestId("case-guidance-outdated")).or(page.getByTestId("case-review-again")).first()).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("case-guidance-outdated"), "opening the form made the next steps out of date").toHaveCount(0);
      await expect(page.getByTestId("case-review-again"), "opening the form cancelled the confirmation").toHaveCount(0);

      // 2. Cleared: stays empty after a reload.
      await openForm(page, court, caseId);
      await box(page, court).fill("");
      await box(page, court).blur();
      await page.waitForTimeout(3_000);
      await page.reload();
      await openForm(page, court, caseId);
      await page.waitForTimeout(3_000);
      await expect(box(page, court), "a cleared box stays empty").toHaveValue("");

      // 3. A newer answer on the review: the box shows it.
      await changeOnReview(page, court, caseId, c.newer);
      await openForm(page, court, caseId);
      await expect(box(page, court), "the box shows the newer answer given after it was cleared").toHaveValue(c.newerShown, { timeout: 15_000 });
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
