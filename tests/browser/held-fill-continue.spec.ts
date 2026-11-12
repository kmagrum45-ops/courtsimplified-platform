/**
 * A HELD ANSWER FILLED INTO THE SMALL CLAIMS FORM NEVER STOPS "CONTINUE" (PR #542, 2 Nov).
 *
 * What it checks: the Small Claims questions one at a time, the amount answered in the review (held in the case
 * file, the form's own box empty), Confirm, one more answer in the chat (as in D1), then "Show my next step". The next step must load, with no "That request
 * did not finish" and no "signal is aborted" notice; afterwards the form's amount box holds the held amount (the
 * one asker's fill still happens).
 *
 * Failure it exists to catch: #542's story pack (run 41529390680, 33 Small Claims tests) and browser-regression
 * (run 41529390735). Cause, measured locally with a probe: the one asker's fill (AskedField.tsx useHeldFill,
 * apply) put the held amount into the form's empty box WHILE the form's analysis ran, and the form cancels its
 * running analysis on any change to its input (SmallClaimsIntake.tsx, the requestScope effect), so the request was
 * aborted ("signal is aborted without reason") and the next step never loaded. With the fill switched off, the same
 * tests passed; request counts and long tasks were no higher than main's.
 *
 * Browser only, synthetic account (fakeAccount), this commit's own server calls (serveFromThisCommit); no staging.
 */
import { expect, test, type Page } from "@playwright/test";
import { chooseOffers } from "./harness/offers";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveFromThisCommit, serveModelStandIns } from "./harness/thisCommitServer";
import { recordInitialUnknowns, tickIfAsked } from "./harness/intakeReview";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

const STORY = "I hired Test Decks Ltd. in March 2026 to build a deck for $8,000. I paid $2,000 and $6,000 is still owed. I have the contract, text messages and a bank receipt.";

async function guidedThenReview(page: Page, changedAmount?: string) {
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Kingston");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 5_000 }).catch(() => false)) await send.click();
  const question = page.locator("[data-testid=guided-message][data-from=assistant]").last();
  const proposals = page.getByTestId("story-proposals");
  await expect(proposals.or(question).first()).toBeVisible({ timeout: 60_000 });
  if (await proposals.isVisible().catch(() => false)) { await chooseOffers(proposals, "no"); await proposals.getByRole("button").last().click(); }
  await expect(page.locator("textarea").last()).toBeVisible({ timeout: 60_000 });

  // The review: the amount held from the story's suggestion, so the form's own box is empty.
  const panel = page.getByTestId("intake-review");
  if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  const q = (id: string) => page.locator(`[data-question="${id}"]`);
  const kind = q("sc-orient-dispute-category").getByRole("button").first();
  if (await kind.count()) await kind.click();
  if (await q("sc-claim-filed").count()) await q("sc-claim-filed").getByRole("button", { name: "No", exact: true }).click();
  const use = q("sc-amount-claimed").getByRole("button", { name: /^Use the suggestion: .*$/ });
  if (await use.count()) await use.first().click();
  // The amount given by the story's suggestion, then changed by the person in the same question's box.
  if (changedAmount) {
    const box = q("sc-amount-claimed").getByRole("textbox").first();
    await expect(box, "the answered amount can be changed in its own box").toBeVisible({ timeout: 30_000 });
    await box.fill("");
    await box.pressSequentially(changedAmount, { delay: 20 });
    await box.blur();
    await page.waitForTimeout(2_000);
  }
  await recordInitialUnknowns(page);
  await tickIfAsked(page);
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });

  // One more answer in the chat after Confirm (a fact added), as the person did in D1.
  const before = await page.locator("[data-testid=guided-message]").count();
  await page.locator("textarea").last().fill("I have the signed contract and the bank receipt.");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 60_000 }).toBeGreaterThan(before + 1);
}

test("a held answer filled into the Small Claims form never stops Continue -- small-claims (sc-deck-owed)", async ({ page }) => {
  test.setTimeout(300_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  await guidedThenReview(page);

  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByTestId("completed-case-overview"), "the next step loads").toBeVisible({ timeout: 120_000 });
  await expect(page.getByText(/That request did not finish|signal is aborted/), "no request stopped under the person").toHaveCount(0);

  // The one asker's fill still happens: the form's amount box holds the held amount.
  await page.goto(page.url().replace(/step=[a-z]+/, "step=form"));
  await expect(page.getByTestId("sc-intake-amountClaimed")).toHaveValue(/6,?000/, { timeout: 60_000 });
});

/*
 * The analysis that keeps running uses the same amount the fill put in (founder, 2 Nov): the overview is never built
 * from a stale value. The amount Continue's analysis sends (the request to /api/small-claims/analyze), the form's
 * filled box and the overview's Amount must all be the same number -- also when the person changed the amount the
 * story suggested, where an older value is held beside the newest one.
 */
const digits = (text: string | null | undefined) => String(text ?? "").replace(/\.00\b/, "").replace(/\D/g, "");

async function amountsSeen(page: Page, sent: string[]) {
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  const overview = page.getByTestId("completed-case-overview");
  await expect(overview, "the next step loads").toBeVisible({ timeout: 120_000 });
  const shown = await page.locator("dt", { hasText: /^Amount$/ }).locator("xpath=following-sibling::dd[1]").first().innerText().catch(() => "");
  await page.goto(page.url().replace(/step=[a-z]+/, "step=form"));
  const box = page.getByTestId("sc-intake-amountClaimed");
  await expect(box).not.toHaveValue("", { timeout: 60_000 });
  return { sent: sent.at(-1) ?? "", shown, filled: await box.inputValue() };
}

function recordSentAmounts(page: Page): string[] {
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/small-claims/analyze")) sent.push(String(request.postDataJSON()?.input?.amountClaimed ?? ""));
  });
  return sent;
}

test("the analysis that keeps running uses the same amount that was filled in -- small-claims (sc-deck-owed)", async ({ page }) => {
  test.setTimeout(300_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  const sent = recordSentAmounts(page);
  await guidedThenReview(page);
  const seen = await amountsSeen(page, sent);
  expect(digits(seen.filled), `the form's box holds the held amount: ${JSON.stringify(seen)}`).toBe("6000");
  expect(digits(seen.sent), `the analysis sent the same amount: ${JSON.stringify(seen)}`).toBe(digits(seen.filled));
  expect(digits(seen.shown), `the overview shows the same amount: ${JSON.stringify(seen)}`).toBe(digits(seen.filled));
});

test("the amount changed in the review is the one filled in, sent to the analysis and shown -- small-claims (sc-deck-owed)", async ({ page }) => {
  test.setTimeout(300_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  const sent = recordSentAmounts(page);
  // The story's suggestion gave $6,000; the person changed it to $7,250 before Confirm.
  await guidedThenReview(page, "$7,250");
  const seen = await amountsSeen(page, sent);
  expect(digits(seen.filled), `the form's box holds the changed amount: ${JSON.stringify(seen)}`).toBe("7250");
  expect(digits(seen.sent), `the analysis sent the changed amount, never the older one: ${JSON.stringify(seen)}`).toBe("7250");
  expect(digits(seen.shown), `the overview shows the changed amount: ${JSON.stringify(seen)}`).toBe("7250");
});

/*
 * B3 (Chrome check of #542 at 6e56e44b, 3 Nov): a box the fill put words in follows the person's newest answer. The amount
 * answered in the chat ($2,650) was filled into the form's empty amount box; the amount was then changed to $2,400 in the
 * review and confirmed, and the form's box still held "$2,650.00" -- an old value the form's own Continue would send.
 * Cause: the fill fills a box once (asker.ts formFill: an empty box, never filled before), so a box it filled kept the
 * words it was given. Wanted: the box holds the newest answer, never the older one, and the form's analysis sends it.
 */
test("a box the fill put an amount in follows the amount changed in the review -- small-claims (loan)", async ({ page }) => {
  test.setTimeout(400_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  await serveModelStandIns(page, "small-claims");
  const sent = recordSentAmounts(page);
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Ottawa");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill("I lent a friend money and they have not paid it back.");
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
  const caseId = new URL(page.url()).searchParams.get("intake") ?? "";
  const ack = page.getByTestId("acknowledgement-checkbox");
  await expect(ack.or(page.getByRole("button", { name: /Answer questions one at a time/ }))).toBeVisible({ timeout: 60_000 });
  if (await ack.isVisible()) { await ack.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 10_000 }).catch(() => false)) await send.click();
  for (let turn = 0; turn < 15; turn++) {
    await page.waitForTimeout(2_000);
    const box = page.locator("textarea[placeholder='Your answer...']");
    if (!(await box.isVisible().catch(() => false))) break;
    const id = await page.locator("[data-testid=guided-message][data-from=assistant][data-question-id]").last().getAttribute("data-question-id");
    await box.fill(id === "sc-amount-claimed" ? "$2,650" : id === "sc-orient-dispute-category" ? "A loan or debt" : "I do not know yet");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByRole("button", { name: "Sending…" })).toHaveCount(0, { timeout: 60_000 });
  }
  const form = `/builder?path=small-claims&caseId=${caseId}&step=form`;
  const amountBox = page.getByTestId("sc-intake-amountClaimed");
  await page.goto(form);
  await expect(amountBox, "the fill puts the chat's amount into the empty box").toHaveValue(/2,?650/, { timeout: 60_000 });

  // Saved before leaving the form (the fill is a write like any other).
  const savedAmount = () => String(((((account.rows.get(caseId) as Record<string, unknown> | undefined)?.master_result as Record<string, unknown> | undefined)?.intakeCheckpoint as { sections?: Record<string, { input?: Record<string, unknown> }> } | undefined)?.sections?.["small-claims"]?.input?.amountClaimed) ?? "");
  await expect.poll(savedAmount, { timeout: 30_000 }).toMatch(/2,?650/);
  // The amount changed in the review's own box, then confirmed.
  await page.goto(`/builder?path=small-claims&caseId=${caseId}&step=guided`);
  const panel = page.getByTestId("intake-review");
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").click();
  const reviewAmount = panel.locator("[data-testid=intake-entry][data-field=amountClaimedText]").locator("input, textarea").first();
  await expect(reviewAmount).toHaveValue(/2,?650/, { timeout: 30_000 });
  await reviewAmount.fill("");
  await reviewAmount.pressSequentially("$2,400", { delay: 20 });
  await reviewAmount.blur();
  await page.waitForTimeout(2_000);
  await recordInitialUnknowns(page);
  await tickIfAsked(page);
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });

  await page.goto(form);
  await expect(amountBox, "the form's box holds the newest amount, never the older one").toHaveValue(/2,?400/, { timeout: 60_000 });
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByTestId("completed-case-overview"), "the next step loads").toBeVisible({ timeout: 120_000 });
  expect(digits(sent.at(-1)), `the form's analysis sends the newest amount: ${JSON.stringify(sent)}`).toBe("2400");
});
