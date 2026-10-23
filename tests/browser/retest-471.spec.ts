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
 * The server calls are this commit's own code (harness/thisCommitServer.ts).
 */
import { expect, test, type Page } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { serveFromThisCommit, type Court } from "./harness/thisCommitServer";

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
  await page.getByLabel("Tell us what happened in your own words").fill(STORY["small-claims"]);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await page.getByTestId("intake-start-review").click();
  await expect(panel(page)).toHaveAttribute("data-phase", "reviewing");
  await question(page, "sc-orient-role").getByRole("button", { name: /Bringing the claim/ }).first().click();
  await question(page, "sc-claim-filed").getByRole("button", { name: "No", exact: true }).click();
}

async function start(page: Page, court: Court) {
  await grantSiteAccess(page);
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
  // Civil and Family mark each answer; Small Claims asks its answered questions again.
  await expect(page.getByTestId("intake-answer-stale").or(page.getByTestId("intake-confirm-needs").filter({ hasText: "earlier version of your story" })).first()).toBeVisible();
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`${court}: after the story changes, the same side chosen again clears "earlier version"; a different side can be switched back`, async ({ page }) => {
    test.setTimeout(240_000);
    await start(page, court);
    await changeStory(page);
    const roleId = court === "small-claims" ? "sc-orient-role" : "yourRole";
    const role = question(page, roleId);
    const staleBefore = await page.getByTestId("intake-answer-stale").count();
    const same = court === "small-claims" ? role.getByRole("button", { name: /Bringing the claim/ }).first() : role.getByTestId("intake-field-choice").first();
    const other = court === "small-claims" ? role.getByRole("button", { name: /Responding/ }).first() : role.getByTestId("intake-field-choice").nth(1);
    await same.click();
    await expect(role, "the question stays on screen").toBeVisible();
    await expect(same).toHaveAttribute("aria-pressed", "true");
    if (court !== "small-claims") await expect(page.getByTestId("intake-answer-stale"), "the side is no longer from an earlier version").toHaveCount(staleBefore - 1);
    await other.click();
    await expect(other).toHaveAttribute("aria-pressed", "true");
    await same.click();
    await expect(same, "switched back").toHaveAttribute("aria-pressed", "true");
    // The same ticks saved again move that answer onto the current story too.
    if (court !== "small-claims") {
      const filed = question(page, court === "civil" ? "documents" : "filedDocuments");
      const before = await page.getByTestId("intake-answer-stale").count();
      await filed.locator('input[data-testid=intake-field-pick][value="nothing"]').check();
      await filed.getByTestId("intake-field-save").click();
      await expect(page.getByTestId("intake-answer-stale"), "the same ticks saved again are no longer from an earlier version").toHaveCount(before - 1);
    } else {
      // Small Claims: with the side and "No" given again, nothing is from an earlier version.
      await question(page, "sc-claim-filed").getByRole("button", { name: "No", exact: true }).click();
      await expect(page.getByTestId("intake-confirm-needs")).not.toContainText("earlier version of your story");
    }
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
    await expect(page.getByText(court === "family" ? "You started, or plan to start, this case (applicant)" : "You are bringing this case (plaintiff)")).toBeVisible({ timeout: 60_000 });
  });
}

test(`Family: the review's "Day you were served" box asks for the year, and a typed date is labelled as the person's answer`, async ({ page }) => {
  test.setTimeout(240_000);
  await grantSiteAccess(page);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "family", account.rows as unknown as Rows);
  await openBuilder(page, "family", { story: "Synthetic story: my former partner started a family case about parenting time for our daughter, age 5." });
  await guided(page, "family", "respondent", ["application"], "October 6, 2026");
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
});

test("Small Claims: \"No\" to the claim-filed question stays shown as the answer given", async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, "small-claims");
  // On the guided route the review also shows it as Claim Filed: Yes / No, the answer
  // marked (an unticked box read as no answer); reviewEntries is checked for that in
  // test:review-follow-ups, since the guided route needs the AI questions.
  await expect(question(page, "sc-claim-filed").getByRole("button", { name: "No", exact: true })).toHaveAttribute("aria-pressed", "true");
});
