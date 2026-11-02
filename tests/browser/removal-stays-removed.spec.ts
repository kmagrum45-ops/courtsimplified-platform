/**
 * NEWEST WINS, INCLUDING REMOVAL: AN ANSWER EMPTIED IN THE FORM STAYS REMOVED (carry runs 41382392877 and
 * 41382400851 at 92083b36, 1 Nov: "Jordan Testwood" shown again after the person emptied the other party box,
 * on 7 screens in every Small Claims run and on civil and Family review after a reload).
 *
 * Cause (test:newest-answer-wins, failing at 92083b36): caseFile.ts followAnswer recorded each key typed into a
 * box as a change (the case file already held the box's own previous value, "different"), and an emptied box
 * recorded no removal, so the change record's "Jordan Testwood" was applied last after the box was emptied.
 *
 * What it checks (stand-ins only: fakeAccount, serveFromThisCommit): the Small Claims form, the other party typed
 * key by key, then the box emptied; after a reload the review shows no "Testwood", and the saved case read
 * through caseFileOf (what the case page reads) holds no other party.
 *
 * WHAT FAILURE THIS CATCHES: an answer the person removed coming back from another copy or the change record.
 */
import { expect, test } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { serveFromThisCommit } from "./harness/thisCommitServer";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

test("Small Claims form: the other party typed key by key, then emptied: it stays removed after a reload, on the review and in the saved case", async ({ page }) => {
  test.setTimeout(300_000);
  await grantSiteAccess(page);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill("Synthetic story: a contractor took my $3,000 deposit in May 2026 and never did the work.");
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
  const ack = page.getByTestId("acknowledgement-checkbox");
  await expect(ack.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
  if (await ack.isVisible()) { await ack.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  const box = page.getByTestId("sc-intake-otherParty");
  await box.click();
  await box.pressSequentially("Jordan Testwood", { delay: 40 });
  await box.blur();
  await page.waitForTimeout(2_000);
  // Removed: the box emptied, as the carry test does.
  await box.fill("");
  await box.blur();
  await page.waitForTimeout(2_500);
  const saved = async () => {
    const row = [...account.rows.values()][0] as { master_result?: unknown } | undefined;
    const { caseFileOf } = await import("../../src/lib/case-system/caseFile/caseFile");
    const master = (row?.master_result ?? {}) as { intakeCheckpoint?: unknown };
    return caseFileOf(master.intakeCheckpoint as never, master).otherParty;
  };
  await expect.poll(async () => JSON.stringify(await saved()), { timeout: 30_000, message: "the saved case holds no other party" }).not.toContain("Testwood");
  await page.reload();
  const panel = page.getByTestId("intake-review");
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
  await page.waitForTimeout(1_500);
  expect(await panel.innerText(), "after a reload, the review does not show the removed other party").not.toContain("Testwood");
  const values = await panel.locator("input, textarea").evaluateAll((items) => items.map((item) => (item as HTMLInputElement).value));
  expect(values.filter((value) => value.includes("Testwood")), "no review box holds it").toEqual([]);
  expect(JSON.stringify(await saved()), "still removed in the saved case").not.toContain("Testwood");
});
