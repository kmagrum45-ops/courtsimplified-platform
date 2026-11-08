/**
 * THE CASE PAGE'S "SHOW MY NEXT STEP" STARTS THE NEXT STEP IN ONE CLICK (item 1, 6 Nov 2026).
 *
 * Founder's Chrome check of #543 (5 Nov), other problem 2: on a confirmed case with no next step yet, the case
 * page's "Show my next step" only opened the builder, which showed "Show my next step" again; a second click
 * started "Working out your next step…". The same for "Update my next steps" when the next steps are out of date.
 *
 * What this asserts, in all three courts (Small Claims form, civil, Family), on this commit's code with the
 * model stand-ins and the synthetic account (no AI, no database):
 *   1. Confirmed, no next step: one click on the case page's "Show my next step" and the next step loads,
 *      with no second click anywhere; a reload of the builder afterwards does not start it again.
 *   2. Small Claims, next steps out of date (an answer added after them): one click on "Update my next steps"
 *      makes them again, and the case page shows them as current.
 *   3. Small Claims, next steps current: opening the case's Forms tab, which keeps "You recorded an amount"
 *      on its own, leaves them current (other problem 1; the rule itself is test:late-fact-save).
 *
 * What failure it catches: the case page's link going back to opening the builder only (two clicks), or a
 * page that saves an answer the person already gave marking the next steps out of date.
 */
import { expect, test, type Page } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveFromThisCommit } from "./harness/thisCommitServer";
import { openBuilder } from "./harness/builderGate";
import { recordInitialUnknowns, saveCaseStory } from "./harness/intakeReview";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

type Court = "small-claims" | "civil" | "family";
type Rows = Map<string, Record<string, unknown>>;
const STORY = "Synthetic: I hired Test Decks Ltd. in March 2026 to build a deck for $8,000. I paid $2,000 and $6,000 is still owed.";
const CIVIL_STORY = "Synthetic: I hired Test Builder Ltd. in March 2026 to build an addition for $180,000. They took $90,000 and abandoned the job in June 2026.";
const FAMILY_STORY = "Synthetic: my former partner and I separated in March 2026 and we disagree about parenting time for our daughter.";

async function confirmHere(page: Page) {
  const panel = page.getByTestId("intake-review");
  if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  const q = (id: string) => page.locator(`[data-question="${id}"]`);
  const kind = q("sc-orient-dispute-category").getByRole("button").first();
  if (await kind.count()) await kind.click();
  if (await q("sc-claim-filed").count()) await q("sc-claim-filed").getByRole("button", { name: "No", exact: true }).click();
  await recordInitialUnknowns(page);
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
}

async function confirmed(page: Page, court: Court) {
  if (court === "small-claims") {
    await openBuilder(page, "small-claims", { city: "Kingston" });
    await page.getByRole("button", { name: "Fill in the form yourself" }).click();
    await page.getByLabel("Case story", { exact: true }).fill(STORY);
    await saveCaseStory(page);
    await page.getByTestId("sc-intake-amountClaimed").fill("$6,000");
    await page.getByTestId("sc-intake-amountClaimed").blur();
  } else {
    await openBuilder(page, court, { city: "Kingston", story: court === "civil" ? CIVIL_STORY : FAMILY_STORY });
    await expect(page.getByTestId("guided-form-question")).toBeVisible({ timeout: 60_000 });
  }
  await confirmHere(page);
}

async function start(page: Page, court: Court) {
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, court, account.rows as unknown as Rows);
  return account;
}
const caseIdOf = (rows: Rows) => String([...rows.values()][0].id);

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`case page: "Show my next step" starts the next step in one click -- ${court}`, async ({ page }) => {
    test.setTimeout(480_000);
    const account = await start(page, court);
    await confirmed(page, court);
    await page.waitForTimeout(3_000);
    const caseId = caseIdOf(account.rows as unknown as Rows);

    await page.goto(`/cases/${caseId}`);
    await page.getByTestId("case-show-next-step").click();
    await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
    // No second click anywhere: the next step is worked out and shown.
    await expect(page.getByTestId("completed-case-overview"), "one click on the case page did not start the next step").toBeVisible({ timeout: 180_000 });

    // Asked once: a reload does not start it again (the address no longer asks).
    expect(new URL(page.url()).searchParams.get("next"), "the start request stayed in the address").toBeNull();
  });
}

test(`case page: "Update my next steps" makes them again in one click; the Forms tab leaves them current -- small-claims`, async ({ page }) => {
  test.setTimeout(480_000);
  const account = await start(page, "small-claims");
  await confirmed(page, "small-claims");
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 180_000 });
  const rows = account.rows as unknown as Rows;
  const caseId = caseIdOf(rows);
  const row = [...rows.values()][0];

  // The Forms tab, opened with nothing changed: the next steps stay current (other problem 1).
  await page.goto(`/cases/${caseId}/forms`);
  await page.waitForTimeout(8_000);
  await page.goto(`/cases/${caseId}`);
  await expect(page.getByTestId("case-guidance-outdated"), "opening the Forms tab marked the next steps out of date").toHaveCount(0, { timeout: 30_000 });

  // One more answer on the form: the next steps are out of date.
  await page.goto(`/builder?path=small-claims&caseId=${caseId}&step=form`);
  await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "user-confirmed", { timeout: 60_000 });
  const add = page.locator("[data-testid=not-answered-yet][data-field=timeline] [data-testid=not-answered-yet-add]");
  await expect(add.or(page.getByTestId("sc-intake-timeline")).first()).toBeVisible({ timeout: 60_000 });
  if (await add.isVisible().catch(() => false)) await add.click();
  await page.getByTestId("sc-intake-timeline").fill("March 2026: hired them. May 2026: deck finished, $6,000 not paid.");
  await page.getByTestId("sc-intake-timeline").blur();
  await expect.poll(() => JSON.stringify((row.master_result as Record<string, unknown>).intakeCheckpoint), { timeout: 30_000 }).toContain("deck finished");

  await page.goto(`/cases/${caseId}`);
  await page.getByTestId("case-update-next-steps").click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  await expect(page.getByTestId("completed-case-overview"), "one click on \"Update my next steps\" did not make them again").toBeVisible({ timeout: 180_000 });
  await page.goto(`/cases/${caseId}`);
  await expect(page.getByTestId("case-guidance-outdated"), "the next steps made again are not current").toHaveCount(0, { timeout: 60_000 });
});
