/**
 * A FORM BOX THAT FOLLOWED THE RECORD NEVER PUTS ITS OLD VALUE BACK FROM ANOTHER TAB (rules 2 and 3, site owner 6 Nov
 * 2026: the two-tab test asked for before #544's push).
 *
 * The whole form's boxes follow the newest saved answer (boxFollow.ts useBoxesFollow), written into the form's copy in
 * the tab, with nothing sent. The risk: tab A's form follows the record to one value; tab B then changes that answer;
 * tab A, still open with its older copy, saves something else, and its copy's old value goes to the server with that
 * save and replaces tab B's newer answer.
 *
 * What it checks, in all three courts (Small Claims: the amount; civil and Family: the other party), on this commit's
 * code with the real save path (a real local or staging account, realTestSession.ts refuses production), the model
 * stand-ins and two tabs of one signed-in browser:
 *   1. tab A: the answer changed on the review; tab A's whole form box follows it;
 *   2. tab B: the same answer changed again, to a newer value;
 *   3. tab A, never reloaded: a different box ("Your name") typed and saved;
 *   4. tab B's value is still the saved one: on a fresh load the case page, the review and the whole form show it,
 *      and never tab A's older value.
 *
 * WHAT FAILURE THIS CATCHES: an older copy in one tab overwriting a newer answer given in another.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { recordInitialUnknowns, saveCaseStory, tickIfAsked } from "./harness/intakeReview";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const STORY = "Synthetic: I paid a contractor in March 2026 to repair my roof and the work was never done.";
const CASES = {
  "small-claims": { fact: "amount", first: "$7,250", inA: "$8,150", inAShown: /8,150/, inB: "$9,350", inBShown: /9,350/, old: /8,150/ },
  civil: { fact: "otherParty", first: "Testwood Roofing Ltd.", inA: "Northgate Roofing Inc.", inAShown: /Northgate Roofing Inc\./, inB: "Eastline Roofing Co.", inBShown: /Eastline Roofing Co\./, old: /Northgate/ },
  family: { fact: "otherParty", first: "Jordan Testwood", inA: "Morgan Testwood", inAShown: /Morgan Testwood/, inB: "Riley Testwood", inBShown: /Riley Testwood/, old: /Morgan/ },
} as const;
type Court = keyof typeof CASES;

function box(page: Page, court: Court) {
  if (court === "small-claims") return page.getByTestId("sc-intake-amountClaimed");
  return page.locator("label").filter({ has: page.locator("span.font-semibold", { hasText: /^Other party$/ }) }).locator("input, textarea").first();
}
function nameBox(page: Page, court: Court) {
  if (court === "small-claims") return page.getByTestId("sc-intake-yourName");
  return page.locator("label").filter({ has: page.locator("span.font-semibold", { hasText: /^Your name$/ }) }).locator("input, textarea").first();
}
async function openForm(page: Page, court: Court, caseId: string) {
  await page.goto(`/builder?path=${court}&intake=${caseId}${court === "small-claims" ? "&step=form" : ""}`);
  const show = page.getByTestId("guided-form-show-form");
  await expect(show.or(box(page, court)).first()).toBeVisible({ timeout: 60_000 });
  if (await show.isVisible().catch(() => false)) await show.click();
  await expect(box(page, court)).toBeVisible({ timeout: 60_000 });
}
/** "Change" for the fact on the review (?change=<fact>), a new value typed and saved. */
async function changeOnReview(page: Page, court: Court, caseId: string, value: string) {
  await page.goto(`/builder?path=${court}&intake=${caseId}${court === "small-claims" ? "&step=form" : ""}&change=${CASES[court].fact}`);
  const panel = page.getByTestId("intake-review");
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
  const change = panel.locator(`[data-testid=change-answer][data-fact=${CASES[court].fact}]`).first();
  await expect(change).toBeVisible({ timeout: 30_000 });
  if (!(await change.getByTestId("change-answer-text").isVisible().catch(() => false))) await change.getByTestId("change-answer-open").click();
  await change.getByTestId("change-answer-text").fill(value);
  await change.getByTestId("change-answer-save").click();
  await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
  await page.waitForTimeout(3_000);
}

for (const court of Object.keys(CASES) as Court[]) {
  test(`tab A's followed form box never puts its older value back over tab B's newer answer -- ${court}`, async ({ page, context }) => {
    test.setTimeout(600_000);
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
      await box(page, court).fill(c.first);
      await box(page, court).blur();
      await page.waitForTimeout(3_000);
      const panel = page.getByTestId("intake-review");
      if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
      await expect(panel).toHaveAttribute("data-phase", "reviewing");
      const kind = page.locator('[data-question="sc-orient-dispute-category"]').getByRole("button").first();
      if (await kind.count()) await kind.click();
      const filed = page.locator('[data-question="sc-claim-filed"]');
      if (await filed.count()) await filed.getByRole("button", { name: "No", exact: true }).click();
      await recordInitialUnknowns(page);
      await tickIfAsked(page);
      await page.getByTestId("intake-confirm").click();
      await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });

      // 1. Tab A: changed on the review; the whole form's box follows.
      await changeOnReview(page, court, caseId, c.inA);
      await openForm(page, court, caseId);
      await expect(box(page, court), "tab A's box follows the record").toHaveValue(c.inAShown, { timeout: 15_000 });
      await page.waitForTimeout(3_000);

      // 2. Tab B: the same answer changed again.
      const tabB = await context.newPage();
      await serveModelStandIns(tabB, court, userId);
      await changeOnReview(tabB, court, caseId, c.inB);

      // 3. Tab A, never reloaded: something else typed and saved.
      await page.bringToFront();
      console.log(`[${court}] tab A box before its save: ${await box(page, court).inputValue()}`);
      await nameBox(page, court).fill("Synthetic Testperson");
      await nameBox(page, court).blur();
      await page.waitForTimeout(6_000);

      // 4. A fresh load: tab B's answer, everywhere, never tab A's older value.
      await tabB.bringToFront();
      await tabB.goto(`/cases/${caseId}`);
      const facts = tabB.getByTestId("case-file");
      await expect(facts.first()).toBeVisible({ timeout: 60_000 });
      await expect(facts.first(), "the case page shows tab B's answer").toContainText(c.inBShown, { timeout: 15_000 });
      await expect(facts.first(), "the case page shows tab A's older value").not.toContainText(c.old);
      await openForm(tabB, court, caseId);
      await expect(box(tabB, court), "the whole form shows tab B's answer").toHaveValue(c.inBShown, { timeout: 15_000 });
      // Tab A, reloaded, shows it too.
      await page.bringToFront();
      await openForm(page, court, caseId);
      await expect(box(page, court), "tab A, reloaded, shows tab B's answer").toHaveValue(c.inBShown, { timeout: 15_000 });
      await expect(nameBox(page, court), "tab A's own save is kept").toHaveValue("Synthetic Testperson");
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
