/**
 * SAVED ON LEAVING THE BOX, ALSO WHEN THE NEXT THING PRESSED IS CONFIRM (founder, 1 Nov).
 *
 * The review's text boxes save when the person leaves the box (9ef006f8: saving key by key turned a held
 * box into its held line at the first key). The founder's question: a new value typed into an answered
 * Small Claims review box, then Confirm pressed straight away -- no click anywhere else first, no blur from
 * the test -- is it saved, and shown on every screen? Also: Enter in the box.
 *
 * Each test (stand-ins only: fakeAccount, serveFromThisCommit; the guided chat first, as the founder did):
 * the amount answered $2,400 in the review (its suggestion used), everything else "I do not know yet", the
 * review ready to continue; then $2,650 typed key by key into a box and Continue pressed directly (or Enter
 * first). Then: after the change and before Continue is pressed, the case is not confirmed, on the page or in the
 * saved case (site owner, 12 Nov: there is no tick since then, and a stale confirmation is still the risk); one
 * Continue press saves the value (the press blurs the box) and then confirms; the saved case read through caseFileOf
 * (what the case page reads); the overview; after a reload the review's text, boxes and list of initial questions --
 * all $2,650, never $2,400.
 *
 * WHAT FAILURE THIS CATCHES: a value typed into a review box lost, or an older value kept, when the person
 * goes straight to Continue (or presses Enter) instead of clicking elsewhere first; and a case marked confirmed
 * after an answer changed, before the person pressed Continue again.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { serveFromThisCommit } from "./harness/thisCommitServer";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { chooseOffers } from "./harness/offers";
import { tickIfAsked } from "./harness/intakeReview";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const STORY = "Synthetic story: Test Storage Ltd. lost my bicycle while it was in their care in May 2026. It was worth $2,400 and they will not pay.";
const QUESTION = "sc-amount-claimed";
const QUESTION_BOX = "Answer: What is the total dollar amount you are claiming?";
type Account = Awaited<ReturnType<typeof fakeAccount>>;

/** The guided chat first, as the founder did: questions answered plainly until the amount is asked, then on to the review. */
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

async function reviewWithAmount(page: Page): Promise<{ account: Account; panel: Locator; question: Locator }> {
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
  await expect(question.getByTestId("intake-question-answered")).toContainText("$2,400", { timeout: 20_000 });
  const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
  while (await unknowns.count()) { const left = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(left - 1, { timeout: 20_000 }); }
  await tickIfAsked(page);
  await expect(page.getByTestId("intake-confirm")).toBeEnabled({ timeout: 30_000 });
  return { account, panel, question };
}

/** Selects the box's text and types the new amount key by key (no blur). */
async function typeNew(box: Locator) {
  await box.click();
  await box.press("Control+A");
  await box.pressSequentially("$2,650", { delay: 40 });
}

async function savedAmount(account: Account): Promise<unknown> {
  const row = [...account.rows.values()][0] as { master_result?: unknown } | undefined;
  const { caseFileOf } = await import("../../src/lib/case-system/caseFile/caseFile");
  const master = (row?.master_result ?? {}) as { intakeCheckpoint?: unknown };
  return caseFileOf(master.intakeCheckpoint as never, master).amount.value;
}

/** The review's state as saved in the case (what every other screen reads), not as the page shows it. */
async function savedPhase(account: Account): Promise<string> {
  const row = [...account.rows.values()][0] as { master_result?: unknown } | undefined;
  const { reviewPhase } = await import("../../src/lib/case-system/intakeReview");
  const master = (row?.master_result ?? {}) as { intakeCheckpoint?: unknown; workflowStatus?: unknown };
  return master.intakeCheckpoint ? reviewPhase((master.workflowStatus ?? {}) as Record<string, unknown>, master.intakeCheckpoint as never) : "none";
}

/** After the change: not confirmed until Continue is pressed again; one press saves the value, then confirms. Every screen holds $2,650 and none $2,400. */
async function everyScreen(page: Page, account: Account, panel: Locator, how: string) {
  // After the change and before the next Continue press, the case is not confirmed: neither the page nor the saved
  // case (site owner, 12 Nov: removing the tick does not remove the risk of a stale confirmation). Reading the
  // attribute and the saved row does not move the focus, so the box is still not left before the press.
  // Held for five seconds, not read once: a confirmation that lands a moment after the save is caught too (the
  // deliberate-fault run of 12 Nov confirmed about two seconds after the save, after a single read had passed).
  for (let look = 0; look < 10; look++) {
    expect(await panel.getAttribute("data-phase"), `${how}: not confirmed after the change, before Continue is pressed again`).toBe("reviewing");
    await page.waitForTimeout(500);
  }
  expect(await savedPhase(account), `${how}: the saved case is not confirmed after the change, before Continue is pressed again`).not.toBe("user-confirmed");
  // The press leaves the box first (its blur), which saves the value, then confirms.
  if ((await panel.getAttribute("data-phase")) === "reviewing") await page.getByTestId("intake-confirm").click();
  await expect.poll(() => savedAmount(account), { timeout: 30_000, message: `${how}: saved as soon as Continue is pressed` }).toBe(2650);
  await expect(panel, `${how}: one Continue press confirms`).toHaveAttribute("data-phase", "user-confirmed", { timeout: 60_000 });
  await expect.poll(() => savedPhase(account), { timeout: 30_000, message: `${how}: the saved case is confirmed by that one press` }).toBe("user-confirmed");
  await expect.poll(() => savedAmount(account), { timeout: 30_000, message: `${how}: the saved case (what the case page reads) holds the new amount` }).toBe(2650);
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  const overview = page.getByTestId("completed-case-overview");
  await expect(overview).toBeVisible({ timeout: 180_000 });
  await page.waitForTimeout(2_000);
  const shown = await overview.innerText();
  expect.soft(shown.includes("2,400") && !shown.includes("2,650"), `${how}: the overview never shows only the older amount`).toBe(false);
  // Reloaded: the review opened again from the address, as review-newest-answer.spec.ts does.
  const url = new URL(page.url());
  const id = url.searchParams.get("intake") ?? url.searchParams.get("caseId") ?? "";
  await page.goto(`/builder?path=small-claims&intake=${id}&step=guided`);
  await expect(panel).toHaveAttribute("data-phase", /user-confirmed|reviewing/, { timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "user-confirmed") await page.getByTestId("intake-view-review").click();
  await expect(panel.locator("[data-testid=intake-entry]").first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1_500);
  // The review shows the amount as text (a held line) or in its box (a text area's value is not in innerText).
  const boxValues = await panel.locator("input, textarea").evaluateAll((items) => items.map((item) => (item as HTMLInputElement).value).join(" "));
  expect(`${await panel.innerText()} ${boxValues}`, `${how}: after a reload, the review shows the new amount`).toMatch(/2,650/);
  // One Continue press now confirms, and a confirmed review does not draw its list of initial questions (it did while
  // the tick was asked again). Its amount line is where the review shows the amount once confirmed: checked here.
  const amountLine = panel.locator("[data-testid=intake-entry][data-field=amountClaimedText]");
  const amountBox = await amountLine.locator("input, textarea").evaluateAll((items) => items.map((item) => (item as HTMLInputElement).value).join(" "));
  expect(`${await amountLine.innerText()} ${amountBox}`, `${how}: the review's amount line shows the new amount`).toMatch(/2,650/);
  const amounts = await panel.locator("input, textarea").evaluateAll((items) => items.map((item) => (item as HTMLInputElement).value).filter((value) => value.includes("$") && !value.startsWith("Synthetic story")));
  expect(amounts.filter((value) => value.includes("2,400")), `${how}: no box holds the older amount`).toEqual([]);
  expect(await savedAmount(account), `${how}: still saved after the reload`).toBe(2650);
}

test("the review's summary box: $2,650 typed, then Confirm pressed straight away: saved and shown everywhere", async ({ page }) => {
  test.setTimeout(400_000);
  const { account, panel } = await reviewWithAmount(page);
  const box = panel.locator("[data-testid=intake-entry][data-field=amountClaimedText]").locator("textarea, input").first();
  await expect(box).toHaveValue("$2,400", { timeout: 20_000 });
  await typeNew(box);
  // No blur from the test: the next thing pressed is Continue (everyScreen presses it, after checking nothing is confirmed yet).
  await everyScreen(page, account, panel, "summary box, then Confirm");
});

test("the question's own box: $2,650 typed, then Confirm pressed straight away: saved and shown everywhere", async ({ page }) => {
  test.setTimeout(400_000);
  const { account, panel, question } = await reviewWithAmount(page);
  await typeNew(question.getByLabel(QUESTION_BOX, { exact: true }));
  await everyScreen(page, account, panel, "question box, then Confirm");
});

test("Enter in the question's own box saves it and does not confirm the review; then one Continue press confirms", async ({ page }) => {
  test.setTimeout(400_000);
  const { account, panel, question } = await reviewWithAmount(page);
  const box = question.getByLabel(QUESTION_BOX, { exact: true });
  await typeNew(box);
  await box.press("Enter");
  await expect(question.getByTestId("intake-question-answered"), "Enter saved the new amount").toContainText("2,650", { timeout: 20_000 });
  await expect(panel, "Enter does not confirm the review by itself").toHaveAttribute("data-phase", "reviewing");
  // Enter saved it; nothing is confirmed until Continue is pressed (everyScreen checks, then presses it once).
  await everyScreen(page, account, panel, "question box, Enter, then Confirm");
});

test("Enter in the summary box adds a line (a text area; it does not submit); Confirm then saves the value", async ({ page }) => {
  test.setTimeout(400_000);
  const { account, panel } = await reviewWithAmount(page);
  const box = panel.locator("[data-testid=intake-entry][data-field=amountClaimedText]").locator("textarea, input").first();
  await typeNew(box);
  await box.press("Enter");
  await expect(panel, "Enter does not confirm the review by itself").toHaveAttribute("data-phase", "reviewing");
  await everyScreen(page, account, panel, "summary box, Enter, then Confirm");
});
