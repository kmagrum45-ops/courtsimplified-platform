/**
 * THE OVERVIEW'S "WHEN" IS THE SAME DATE THE CASE PAGE SHOWS (item 6, 6 Nov 2026).
 *
 * Founder's Chrome check of #543 (5 Nov), other problem 5: in Civil the review's Timeline was filled from the
 * story's suggestion (every dated sentence, storyFacts.ts timelineIn), and the overview's Case snapshot then
 * showed "When (your words): My neighbour Paul Brown's contractor damaged the foundation of my house on June 3,
 * 2025 while digging next door." -- a whole sentence, with the other party's name -- while the case page showed
 * "When it happened / June 3, 2025". The overview read the Timeline box (IntelligenceOverviewPanel.tsx); the case
 * page reads the case file's whenHappened.
 *
 * What it checks, civil (the route Chrome took; the row is drawn the same for every court), on this commit's code with the
 * model stand-ins and the synthetic account: after the Timeline suggestion is used and the next step made, the
 * overview's "When" row says exactly what the case page's "When it happened" says, and no snapshot row carries
 * the story's sentence.
 *
 * WHAT FAILURE THIS CATCHES: two screens giving the same fact in different words, one of them a story sentence.
 */
import { expect, test, type Page } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveFromThisCommit } from "./harness/thisCommitServer";
import { openBuilder } from "./harness/builderGate";
import { recordInitialUnknowns } from "./harness/intakeReview";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const STORY = "Synthetic: my neighbour's contractor damaged the foundation of my house on June 3, 2025 while digging next door. Repairs are quoted at $80,000 and the neighbour refuses to pay.";
const SENTENCE = "contractor damaged the foundation";

async function rowValue(page: Page, scope: ReturnType<Page["getByTestId"]>, label: RegExp): Promise<string | null> {
  const terms = scope.locator("dt");
  const count = await terms.count();
  for (let index = 0; index < count; index++) {
    const term = terms.nth(index);
    if (label.test((await term.innerText()).trim())) return (await term.locator("xpath=following-sibling::dd[1]").innerText()).trim();
  }
  return null;
}

test("the overview's When is the case page's date, never the story's sentence -- civil", async ({ page }) => {
  test.setTimeout(480_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "civil", account.rows as unknown as Map<string, Record<string, unknown>>);
  await openBuilder(page, "civil", { city: "Ottawa", story: STORY });
  await expect(page.getByTestId("guided-form-question")).toBeVisible({ timeout: 60_000 });

  const panel = page.getByTestId("intake-review");
  if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  // The Timeline filled from the story's suggestion, as Chrome did.
  const timeline = page.getByTestId("intake-entry-from-story").filter({ hasText: SENTENCE }).first();
  await expect(timeline, "the review offers the story's dated sentence for the Timeline").toBeVisible({ timeout: 30_000 });
  await timeline.click();
  await recordInitialUnknowns(page);
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  const overview = page.getByTestId("completed-case-overview");
  await expect(overview).toBeVisible({ timeout: 180_000 });
  const shownOnOverview = await rowValue(page, overview, /^When\b/);
  const rows = await overview.locator("dd").allInnerTexts();

  const caseId = String([...(account.rows as unknown as Map<string, Record<string, unknown>>).values()][0].id);
  await page.goto(`/cases/${caseId}`);
  await expect(page.getByTestId("case-file")).toBeVisible({ timeout: 60_000 });
  // The case page's "When it happened", or none: the overview must say the same (nothing when the case page has nothing).
  const line = page.locator('[data-testid="case-file-line"][data-fact="whenHappened"] dd');
  const onCasePage = (await line.count()) ? (await line.innerText()).replace(/\s*(Change|Add it with your next step)\s*$/, "").trim() : null;

  expect(shownOnOverview, `the overview's When (case page: ${onCasePage})`).toBe(onCasePage);
  expect(rows.filter((value) => value.includes(SENTENCE) && value.length < 400), "a snapshot row carries the story's sentence").toEqual([]);
});
