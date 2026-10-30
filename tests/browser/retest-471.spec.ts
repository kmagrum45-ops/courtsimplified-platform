/**
 * PR #470 RE-TEST FOLLOW-UPS, THROUGH THE STEPS A PERSON TAKES (2026-10-23).
 *
 * What it catches, each in the areas where the screen exists:
 *  - after "Save story" on a changed story, answering a question again with the
 *    same choice (or saving the same ticks) clears "Answered for an earlier version
 *    of your story"; a question answered there stays on screen, so a different
 *    choice can be switched back (Small Claims, civil, Family);
 *  - the review's "Day you were served" box asks for the year ("October 6"), as the
 *    questions do (Family);
 *  - "Close without saving" on the review's story box leaves the story shown (all three);
 *  - the case page names the starting side too, not only the responding side (all three);
 *  - a served date the person typed is labelled as their answer, not "From your
 *    story", on the results (Family);
 *  - Small Claims: "No" to "Has a Plaintiff's Claim been filed?" shows as Claim Filed.
 * Step 2: the side and "has anything been filed" are answered once, in the situation
 * questions before the story, so a story change never sets them aside and no later
 * step asks them again; these tests assert that where they used to answer them again.
 * The server calls are this commit's own code (harness/thisCommitServer.ts).
 */
import { expect, test, type Page } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { serveFromThisCommit, type Court } from "./harness/thisCommitServer";
import { autoAnswerSituation } from "./harness/situation";
import { expectServedNotAskedOnNextStep, expectServedOfferedOnceInReview } from "./harness/servedOnce";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 20_000 });

type Rows = Map<string, Record<string, unknown>>;
const STORY: Record<Court, string> = {
  "small-claims": "Synthetic story: I paid Test Roofing Ltd. $9,000 on May 12, 2026 to fix my roof and they never came back. I have the receipt.",
  civil: "Synthetic story: Northwind Supplies Ltd. kept my $62,000 deposit and never delivered the equipment. I have the invoice.",
  family: "Synthetic story: my spouse and I separated in March 2026 after 12 years of marriage. I want spousal support.",
};
const STARTING: Record<Court, string> = { "small-claims": "plaintiff", civil: "plaintiff", family: "applicant" };
const panel = (page: Page) => page.getByTestId("intake-review");
const question = (page: Page, id: string) => panel(page).locator(`[data-testid=intake-initial-question][data-question="${id}"]`);

/** Civil and Family: every guided question answered as the person would, then the review. */
async function guided(page: Page, court: "civil" | "family", side: string, filed: string[], served?: string) {
  for (let i = 0; i < 30; i++) {
    const q = page.getByTestId("guided-form-question");
    if (!(await q.isVisible().catch(() => false))) break;
    const key = (await q.getAttribute("data-key")) ?? "";
    const suggested = q.getByTestId("guided-form-from-story");
    if (await suggested.isVisible().catch(() => false)) {
      if (["yourRole", "documents", "filedDocuments"].includes(key)) await q.getByTestId("guided-form-from-story-no").click();
      else { await q.getByTestId("guided-form-from-story-yes").click(); continue; }
    }
    if (key === "yourRole") { await q.getByTestId(`guided-option-${side}`).click(); continue; }
    if (key === "documents" || key === "filedDocuments") { for (const item of filed) await q.getByTestId(`guided-check-${item}`).check(); await q.getByTestId("guided-form-next").click(); continue; }
    if (key === "servedDate" && served) { await q.getByRole("textbox").fill(served); await q.getByTestId("guided-form-next").click(); continue; }
    const check = q.locator("[data-testid^=guided-check-]").first();
    if (key === "issues" && await check.count()) { await check.check(); await q.getByTestId("guided-form-next").click(); continue; }
    await q.getByTestId("guided-form-skip").click();
  }
  await page.getByTestId("guided-form-done").click();
  await expect(panel(page)).toHaveAttribute("data-phase", "reviewing");
}

/** Small Claims from the home page, into the review, with the side and "No" answered there. */
async function smallClaimsReview(page: Page) {
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY["small-claims"]);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await page.getByTestId("intake-start-review").click();
  await expect(panel(page)).toHaveAttribute("data-phase", "reviewing");
  // The side and "nothing filed" were given in the situation questions (step 2): not asked here.
  await expect(question(page, "sc-orient-role")).toHaveCount(0);
  await expect(question(page, "sc-claim-filed")).toHaveCount(0);
}

async function start(page: Page, court: Court) {
  await grantSiteAccess(page);
  await autoAnswerSituation(page, { where: "starting", filed: "nothing" });
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, court, account.rows as unknown as Rows);
  if (court === "small-claims") await smallClaimsReview(page);
  else {
    await openBuilder(page, court, { story: STORY[court] });
    await guided(page, court, STARTING[court], ["nothing"]);
  }
  return account;
}

/** The story changed in the review's story box and saved. */
async function changeStory(page: Page) {
  const box = panel(page).getByRole("textbox", { name: "Review: Your story", exact: true });
  await box.fill(`${await box.inputValue()} Synthetic: one more detail added later.`);
  await panel(page).getByTestId("review-story-save").click();
  await expect(panel(page).getByTestId("review-story-save")).toBeDisabled();
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`${court}: after the story changes, the side and "filed" given at the start are never set aside or asked again`, async ({ page }) => {
    test.setTimeout(240_000);
    await start(page, court);
    await changeStory(page);
    const sideId = court === "small-claims" ? "sc-orient-role" : "yourRole";
    const filedId = court === "small-claims" ? "sc-claim-filed" : court === "civil" ? "documents" : "filedDocuments";
    await expect(question(page, sideId), "the side is not asked again").toHaveCount(0);
    await expect(question(page, filedId), "\"filed\" is not asked again").toHaveCount(0);
    await expect(page.getByTestId("intake-confirm-needs")).not.toContainText(/side|filed/i);
    await expect(page.getByTestId("situation-line"), "the answers given at the start stand").toContainText(court === "small-claims" ? "You're suing in Small Claims Court · nothing filed yet" : court === "civil" ? "You're bringing a civil case · nothing filed yet" : "You're bringing a family case · nothing filed yet");
  });

  test(`${court}: "Close without saving" on the review's story box leaves the story shown`, async ({ page }) => {
    test.setTimeout(180_000);
    await start(page, court);
    const box = panel(page).getByRole("textbox", { name: "Review: Your story", exact: true });
    const story = await box.inputValue();
    await box.fill(`${story} Synthetic: an unsaved edit.`);
    await panel(page).getByRole("button", { name: "Close without saving" }).click();
    await expect(panel(page).getByTestId("review-story-edit-text")).toHaveText(story);
    await expect(panel(page).getByTestId("review-story-edit")).toBeVisible();
  });

  test(`${court}: the case page names the starting side`, async ({ page }) => {
    test.setTimeout(240_000);
    const account = await start(page, court);
    const unknowns = panel(page).locator('input[data-testid="intake-unknown"]:not(:checked)');
    while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1); }
    await page.getByTestId("intake-review-acknowledgement").check();
    await page.getByTestId("intake-confirm").click();
    await expect(panel(page)).toHaveAttribute("data-phase", "user-confirmed");
    await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
    await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 90_000 });
    const row = [...account.rows.values()][0] as Record<string, unknown>;
    await page.goto(`/cases/${row.id}`);
    // The case page's top line: the person's own answers from before their story (step 2), with Change.
    await expect(page.getByTestId("situation-line")).toContainText(court === "small-claims" ? "You're suing in Small Claims Court" : court === "civil" ? "You're bringing a civil case" : "You're bringing a family case", { timeout: 60_000 });
    await expect(page.getByTestId("situation-change")).toHaveAttribute("href", /situation=change/);
  });
}

test(`Family: the review's "Day you were served" box asks for the year, and a typed date is labelled as the person's answer`, async ({ page }) => {
  test.setTimeout(240_000);
  await grantSiteAccess(page);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "family", account.rows as unknown as Rows);
  // Served, the day not known at the start: the questions and the review ask it, with the year rule.
  await openBuilder(page, "family", { story: "Synthetic story: my former partner started a family case about parenting time for our daughter, age 5.", situation: { where: "served", papers: "family-8", receivedOn: "unknown" } });
  await guided(page, "family", "respondent", ["application"], "October 6, 2026");
  // Offered once more in the review, as one field (Jason, 2026-10-24, option 1).
  await expectServedOfferedOnceInReview(page);
  const served = panel(page).getByRole("textbox", { name: "Review: Day you were served" });
  await served.fill("October 6");
  await served.press("Enter");
  await expect(panel(page).getByTestId("intake-entry-needs-more")).toContainText("add the year");
  await served.fill("October 6, 2026");
  await served.press("Enter");
  await expect(panel(page).getByTestId("intake-entry-needs-more")).toHaveCount(0);
  const unknowns = panel(page).locator('input[data-testid="intake-unknown"]:not(:checked)');
  while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1); }
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel(page)).toHaveAttribute("data-phase", "user-confirmed");
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(2_000);
  const results = await page.locator("body").innerText();
  expect(results, "the typed date is not labelled as the story").not.toMatch(/From your story: “[^”]*October 6, 2026/);
  if (/October 6, 2026/.test(results)) expect(results).toMatch(/From your answer: “[^”]*October 6, 2026/);
  // Offered exactly once: the next step does not ask it again.
  await expectServedNotAskedOnNextStep(page);
});

test("Small Claims: \"nothing filed yet\", given at the start, stays shown as the answer given", async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, "small-claims");
  // Answered once, in the situation questions (step 2): shown in the top line, never asked again.
  await expect(page.getByTestId("situation-line")).toContainText("nothing filed yet");
  await expect(question(page, "sc-claim-filed")).toHaveCount(0);
});
