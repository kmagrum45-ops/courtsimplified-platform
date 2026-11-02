/**
 * THE NEWEST ANSWER SHOWS EVERYWHERE AT ONCE: THE REVIEW'S "ANSWERED: ..." LINE FOLLOWS ITS OWN BOX
 * (founder's Chrome check of #536, round 2, "Anything else" item 1, 1 Nov).
 *
 * In the Small Claims review the person used the suggestion "$2,400" for "What is the total dollar
 * amount you are claiming?", then changed that box to $2,650. The "Initial questions" list still said
 * "Answered: $2,400. You can change it here.", also after a reload, and the case page showed $2,400.
 *
 * What it checks (stand-ins only: fakeAccount, the case rows kept in the page's own store, no staging):
 *   1. the suggestion used: the question says "Answered: $2,400";
 *   2. the box changed to $2,650: the line says $2,650 and no longer $2,400, at once;
 *   3. after a reload: the line and the box both say $2,650, never $2,400.
 *
 * The third test is the founder's path (the guided chat, the review's suggestion used, Confirm, the next step,
 * then the review's summary box changed, typed key by key). The case page reads the saved case through
 * caseFileOf (CaseFilePanel); it is server-rendered, so with the stand-in account the test reads the saved row
 * through the same caseFileOf instead of opening it. The rule it relies on: test:newest-answer-wins.
 *
 * WHAT FAILURE THIS CATCHES: a second copy of the amount (an older answer from another place, or the
 * review's first answer) shown as current after the person changed it in the review.
 */
import { expect, test, type Page } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { serveFromThisCommit } from "./harness/thisCommitServer";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const STORY = "Synthetic story: Test Storage Ltd. lost my bicycle while it was in their care in May 2026. It was worth $2,400 and they will not pay.";
const QUESTION = "sc-amount-claimed";

async function smallClaimsReview(page: Page) {
  await page.route("**/api/case/understand", (route) => route.fulfill({ json: { ok: true, skipped: "off" } }));
  await page.route("**/api/classify-court-path", (route) => route.fulfill({ json: { primaryPath: "small-claims", confidence: 0.95 } }));
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) {
    await acknowledgement.check();
    await page.getByTestId("acknowledgement-continue").click();
  }
  await page.getByTestId("intake-start-review").click();
  await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
}

test("Small Claims review: the amount changed in its box is the answer the list shows, at once and after a reload", async ({ page }) => {
  test.setTimeout(240_000);
  await grantSiteAccess(page);
  await fakeAccount(page);
  await smallClaimsReview(page);
  const question = page.locator(`[data-testid=intake-initial-question][data-question="${QUESTION}"]`);
  await question.getByRole("button", { name: "Use the suggestion: $2,400" }).click();
  await expect(question.getByTestId("intake-question-answered"), "1. the suggestion used is the answer").toContainText("$2,400");

  const box = question.getByLabel("Answer: What is the total dollar amount you are claiming?", { exact: true });
  await box.fill("$2,650");
  await box.blur();
  await expect(question.getByTestId("intake-question-answered"), "2. the changed amount shows at once").toContainText("$2,650", { timeout: 20_000 });
  await expect(question.getByTestId("intake-question-answered"), "2. the older amount is not shown as the answer").not.toContainText("$2,400");

  await page.waitForTimeout(2_000);
  await page.reload();
  await expect(page.getByTestId("intake-review")).toBeVisible({ timeout: 60_000 });
  if ((await page.getByTestId("intake-review").getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(question.getByTestId("intake-question-answered"), "3. after a reload, the line says the newest amount").toContainText("$2,650", { timeout: 30_000 });
  await expect(question.getByTestId("intake-question-answered"), "3. never the older one").not.toContainText("$2,400");
  await expect(question.getByLabel("Answer: What is the total dollar amount you are claiming?", { exact: true }), "3. the box holds the newest amount").toHaveValue(/^\$2,650(\.00)?$/);
});

/** The guided chat first (signed in, stand-ins), as the founder did: questions answered plainly until the amount is asked, then on to the review. */
async function guidedChat(page: Page) {
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
    if (await proposals.isVisible().catch(() => false)) { await proposals.getByTestId("story-proposals-continue").click(); await expect(proposals.getByTestId("working-note")).toHaveCount(0, { timeout: 120_000 }); continue; }
    const text = (await message.innerText()).replace(/\s+/g, " ");
    if (text === last) break;
    last = text;
    const id = await page.locator("[data-testid=guided-message][data-question-id]").last().getAttribute("data-question-id");
    // The founder left the chat before the amount was asked there (it was offered in the review).
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

test("Small Claims guided route, signed in: the amount changed in the review is the answer the list and the case file show, after a reload", async ({ page }) => {
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
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByRole("button", { name: /Answer questions one at a time/ }))).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await guidedChat(page);
  const panel = page.getByTestId("intake-review");
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
  const question = panel.locator(`[data-testid=intake-initial-question][data-question="${QUESTION}"]`);
  const box = question.getByLabel("Answer: What is the total dollar amount you are claiming?", { exact: true });
  // Answered in the chat or not: the question is in the review to change, or its answer is held.
  if (!(await question.count())) test.info().annotations.push({ type: "note", description: "the amount question is not listed in the review after the chat" });
  await expect(question, "the amount question is in the review (answered in the chat or to answer here)").toHaveCount(1, { timeout: 20_000 });
  const use = question.getByRole("button", { name: "Use the suggestion: $2,400" });
  if (await use.count()) await use.click();
  await box.fill("$2,650");
  await box.blur();
  await expect(question.getByTestId("intake-question-answered"), "the changed amount shows at once").toContainText("$2,650", { timeout: 20_000 });
  await page.waitForTimeout(2_000);
  await page.reload();
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(question.getByTestId("intake-question-answered"), "after a reload, the newest amount").toContainText("$2,650", { timeout: 30_000 });
  await expect(question.getByTestId("intake-question-answered"), "never the older one").not.toContainText("$2,400");
  // The saved case (what the case page reads) holds the newest amount.
  const row = [...account.rows.values()][0] as { master_result?: unknown } | undefined;
  const { caseFileOf } = await import("../../src/lib/case-system/caseFile/caseFile");
  const master = (row?.master_result ?? {}) as { intakeCheckpoint?: unknown };
  const file = caseFileOf(master.intakeCheckpoint as never, master);
  expect(String(file.amount.value ?? ""), "the saved case's amount is the newest").toMatch(/2,?650/);
});

test("Small Claims guided route, signed in: confirmed and next step made with $2,400, then changed to $2,650 in the review: the newest shows in the list and the saved case", async ({ page }) => {
  test.setTimeout(400_000);
  await grantSiteAccess(page);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByRole("button", { name: /Answer questions one at a time/ }))).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await guidedChat(page);
  const panel = page.getByTestId("intake-review");
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
  const question = panel.locator(`[data-testid=intake-initial-question][data-question="${QUESTION}"]`);
  await question.getByRole("button", { name: "Use the suggestion: $2,400" }).click();
  // Everything else "I do not know yet", then Confirm and the next step (the saved case now holds $2,400 everywhere it copies it).
  const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
  while (await unknowns.count()) { const left = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(left - 1, { timeout: 20_000 }); }
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 180_000 });
  await page.waitForTimeout(3_000);
  // Back to the review, change the amount there.
  const id = new URL(page.url()).searchParams.get("intake") ?? new URL(page.url()).searchParams.get("caseId") ?? "";
  await page.goto(`/builder?path=small-claims&intake=${id}&step=guided`);
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "user-confirmed") await page.getByTestId("intake-view-review").click();
  if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").click();
  await page.waitForTimeout(2_000);
  console.log(`back in the review: phase ${await panel.getAttribute("data-phase")}; questions ${JSON.stringify(await panel.locator("[data-testid=intake-initial-question]").evaluateAll((items) => items.map((item) => [item.getAttribute("data-question"), item.getAttribute("data-answered")])))}; entries ${JSON.stringify(await panel.locator("[data-testid=intake-entry]").evaluateAll((items) => items.map((item) => [item.getAttribute("data-field"), (item as HTMLElement).innerText.slice(0, 80), [...item.querySelectorAll("input,textarea")].map((box) => (box as HTMLInputElement).value)])))}`);
  // The founder's box: the review's "What is the total dollar amount you are claiming?" entry (the guided answer's box).
  const box = panel.locator("[data-testid=intake-entry][data-field=amountClaimedText]").locator("input,textarea").first();
  await expect(box).toHaveValue("$2,400", { timeout: 30_000 });
  // Typed key by key, as a person types (the box is the answer itself now: it must not vanish when emptied).
  await box.fill("");
  await box.pressSequentially("$2,650", { delay: 40 });
  await box.blur();
  if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 30_000 });
  await expect(question.getByTestId("intake-question-answered"), "the changed amount shows at once").toContainText("$2,650", { timeout: 20_000 });
  await page.waitForTimeout(2_000);
  await page.reload();
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "user-confirmed") await page.getByTestId("intake-view-review").click();
  if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(question.getByTestId("intake-question-answered"), "after a reload, the newest amount").toContainText("$2,650", { timeout: 30_000 });
  await expect(question.getByTestId("intake-question-answered"), "never the older one").not.toContainText("$2,400");
  const row = [...account.rows.values()][0] as { master_result?: unknown } | undefined;
  const { caseFileOf } = await import("../../src/lib/case-system/caseFile/caseFile");
  const master = (row?.master_result ?? {}) as { intakeCheckpoint?: unknown };
  const file = caseFileOf(master.intakeCheckpoint as never, master);
  console.log(`saved amount: ${JSON.stringify(file.amount)}; form copy: ${JSON.stringify(((master.intakeCheckpoint as { sections?: Record<string, { input?: Record<string, unknown> }> })?.sections?.["small-claims"]?.input ?? {}).amountClaimed)}`);
  expect(String(file.amount.value ?? ""), "the saved case's amount (what the case page reads) is the newest").toMatch(/2,?650/);
});
