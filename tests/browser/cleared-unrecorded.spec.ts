/**
 * AN ANSWER CLEARED IN A REVIEW BOX STAYS REMOVED WHEN THE CHANGE RECORD NEVER HELD IT (founder, 2 Nov;
 * failing test only, the fix belongs to G2(d)). Terminal twin: scripts/verification/verifyClearedUnrecorded.ts.
 *
 * Small Claims guided route (stand-ins only: fakeAccount, serveFromThisCommit): the amount answered in the
 * review with its suggestion ($2,400, the review's question: not the change record); the review's summary box
 * draws that answer; the person clears the box and leaves it. After a reload: no review box, and not the
 * review's list, shows $2,400; the saved case read through caseFileOf (what the overview, the case file and
 * the case page read) holds no amount of 2400.
 * The story box is left out of the reading (the story itself mentions the amount).
 *
 * WHAT FAILURE THIS CATCHES: an answer the person cleared shown again because another place still holds it.
 * Expected to FAIL until G2(d) (caseFile.ts followAnswer records a removal only for a fact the change record
 * holds); not in the CI list.
 */
import { expect, test, type Page } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { serveFromThisCommit } from "./harness/thisCommitServer";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { chooseOffers } from "./harness/offers";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const STORY = "Synthetic story: Test Storage Ltd. lost my bicycle while it was in their care in May 2026. It was worth $2,400 and they will not pay.";
const QUESTION = "sc-amount-claimed";

async function guidedChatUntilAmount(page: Page) {
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 5_000 }).catch(() => false)) await send.click();
  let last = "";
  for (let i = 0; i < 20; i++) {
    const finished = page.getByText("That's everything needed for now");
    const proposals = page.getByTestId("story-proposals");
    const message = page.locator("[data-testid=guided-message][data-from=assistant]").last();
    await expect(finished.or(proposals).or(message).first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(600);
    if (await finished.isVisible().catch(() => false)) break;
    if (await proposals.isVisible().catch(() => false)) { await chooseOffers(proposals, "no"); await proposals.getByTestId("story-proposals-continue").click(); await expect(proposals.getByTestId("working-note")).toHaveCount(0, { timeout: 120_000 }); continue; }
    const text = (await message.innerText()).replace(/\s+/g, " ");
    if (text === last) break;
    last = text;
    const id = await page.locator("[data-testid=guided-message][data-question-id]").last().getAttribute("data-question-id");
    if (id === QUESTION || /how much|amount/i.test(text)) break;
    const answer = /add the year/i.test(text) ? "May 12, 2026"
      : /\bwho\b|name of the/i.test(text) ? "Test Storage Ltd."
      : /when|date/i.test(text) ? "May 12, 2026"
      : /bringing this claim|responding to a claim/i.test(text) ? "Bringing the claim (plaintiff)"
      : /filed|served/i.test(text) ? "No"
      : "Synthetic: the receipt and photos";
    const before = await page.locator("[data-testid=guided-message]").count();
    await page.locator("textarea").last().fill(answer);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 60_000 }).toBeGreaterThan(before + 1).catch(() => {});
  }
}

test("Small Claims review: the amount from the review's question, cleared in its summary box: it stays removed after a reload and in the saved case", async ({ page }) => {
  test.setTimeout(300_000);
  await grantSiteAccess(page);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
  const ack = page.getByTestId("acknowledgement-checkbox");
  await expect(ack.or(page.getByRole("button", { name: /Answer questions one at a time/ }))).toBeVisible({ timeout: 60_000 });
  if (await ack.isVisible()) { await ack.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await guidedChatUntilAmount(page);
  const panel = page.getByTestId("intake-review");
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
  const question = panel.locator(`[data-testid=intake-initial-question][data-question="${QUESTION}"]`);
  await question.getByRole("button", { name: "Use the suggestion: $2,400" }).click();
  await expect(question.getByTestId("intake-question-answered")).toContainText("$2,400", { timeout: 20_000 });

  // The summary box draws the review's answer; the person clears it and leaves the box.
  const box = panel.locator("[data-testid=intake-entry][data-field=amountClaimedText]").locator("textarea, input").first();
  await expect(box).toHaveValue("$2,400", { timeout: 20_000 });
  await box.click();
  await box.press("Control+A");
  await box.press("Backspace");
  await box.blur();
  await page.waitForTimeout(2_500);

  const savedAmount = async () => {
    const row = [...account.rows.values()][0] as { master_result?: unknown } | undefined;
    const { caseFileOf } = await import("../../src/lib/case-system/caseFile/caseFile");
    const master = (row?.master_result ?? {}) as { intakeCheckpoint?: unknown };
    return caseFileOf(master.intakeCheckpoint as never, master).amount;
  };
  const url = new URL(page.url());
  const id = url.searchParams.get("intake") ?? url.searchParams.get("caseId") ?? "";
  await page.goto(`/builder?path=small-claims&intake=${id}&step=guided`);
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(panel.locator("[data-testid=intake-entry]").first()).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1_500);
  const boxes = await panel.locator("input, textarea").evaluateAll((items) => items.map((item) => (item as HTMLInputElement).value).filter((value) => value.includes("2,400") && !value.startsWith("Synthetic story")));
  expect.soft(boxes, "after a reload, no review box holds the cleared amount").toEqual([]);
  const listLine = question.getByTestId("intake-question-answered");
  expect.soft((await listLine.count()) ? await listLine.innerText() : "", "after a reload, the review's list does not show the cleared amount").not.toContain("2,400");
  expect(JSON.stringify(await savedAmount()), "the saved case (what the overview, case file and case page read) does not hold the cleared amount").not.toMatch(/"value":2400/);
});
