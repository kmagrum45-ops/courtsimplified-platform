/**
 * Chrome re-test, 29 Oct, item D1: "Continue to your next steps" showed a red line and
 * sent the person back to "Review your initial case information", after PR #499 (the
 * jsonb key-order bounce) was already live.
 *
 * WHAT FAILURE THIS CATCHES: a confirmation silently cancelled by an answer that adds a
 * fact and changes none. The person stopped the questions early ("Stop initial
 * questions and review"), confirmed, then answered one more question in the chat. The
 * server's rule (intakeCheckpoint.ts, existingFactChanged) does not count a first
 * value as a change; the browser's (IntakeRecovery.tsx put) counts any difference, so
 * the tick disappears and the next Continue bounces.
 *
 * Wanted property: an answer that only ADDS a fact keeps the confirmation, and the
 * next step loads. Listed in harness/knownProblems29oct-flow.ts until fixed
 * (test.fail), so a pass then says "delete the entry".
 *
 * Served by this commit's own code (harness/thisCommitServer.ts): no AI, no database.
 * Run: npx playwright test tests/browser/retest-29oct-flow.spec.ts (against a build
 * served on PLAYWRIGHT_BASE_URL, with SITE_ACCESS_PASSWORD in the environment).
 */
import { expect, test } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveFromThisCommit } from "./harness/thisCommitServer";
import { isKnownProblem } from "./harness/knownProblems29oct-flow";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

const STORY = "I hired Test Decks Ltd. in March 2026 to build a deck for $8,000. I paid $2,000 and $6,000 is still owed. I have the contract, text messages and a bank receipt.";

const NAME = "retest-29oct D1: confirmed early, one more answer, Continue goes to the next step -- small-claims (sc-deck-owed)";
test(NAME, async ({ page }) => {
  // SHOW_KNOWN=1 runs it as a plain test, to see the failing line.
  test.fail(isKnownProblem(NAME) && !process.env.SHOW_KNOWN,"known problem D1 (harness/knownProblems29oct-flow.ts)");
  test.setTimeout(480_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);

  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Kingston");
  await page.getByLabel("Tell us what happened in your own words").fill(STORY);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 5_000 }).catch(() => false)) await send.click();

  // The chat's first question (any "Here's what I understood" card accepted as offered).
  const question = page.locator("[data-testid=guided-message][data-from=assistant]").last();
  const proposals = page.getByTestId("story-proposals");
  await expect(proposals.or(question).first()).toBeVisible({ timeout: 60_000 });
  if (await proposals.isVisible().catch(() => false)) await proposals.getByRole("button").last().click();
  await expect(page.locator("textarea").last()).toBeVisible({ timeout: 60_000 });

  // Stop early, answer what the review needs, confirm.
  await page.getByTestId("intake-start-review").click();
  const panel = page.getByTestId("intake-review");
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  const q = (id: string) => page.locator(`[data-question="${id}"]`);
  const kind = q("sc-orient-dispute-category").getByRole("button").first();
  if (await kind.count()) await kind.click();
  if (await q("sc-claim-filed").count()) await q("sc-claim-filed").getByRole("button", { name: "No", exact: true }).click();
  const use = q("sc-amount-claimed").getByRole("button", { name: /^Use “.*” \(from your story\)$/ });
  if (await use.count()) await use.first().click();
  const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
  while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1, { timeout: 20_000 }); }
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });

  // One more answer in the chat: a fact added, nothing changed.
  const before = await page.locator("[data-testid=guided-message]").count();
  const box = page.locator("textarea").last();
  if (await box.isVisible().catch(() => false)) {
    await box.fill("I have the signed contract and the bank receipt.");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 60_000 }).toBeGreaterThan(before + 1);
  }
  await page.waitForTimeout(3_000);

  // The wanted property: still confirmed, and the next step loads with no "needs confirming" line.
  await expect(panel, "an added answer keeps the confirmation").toHaveAttribute("data-phase", "user-confirmed", { timeout: 10_000 });
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByText(/needs confirming before your next steps|is not confirmed yet/), "no red line sending the person back").toHaveCount(0);
  await expect(page.getByTestId("completed-case-overview"), "the next step loads").toBeVisible({ timeout: 120_000 });
});

/*
 * The owner's Chrome test of #501's preview (29 Oct, second round), findings 5 and 7. Same
 * story, same served code; each asserts the WANTED property and is listed in
 * harness/knownProblems29oct-flow.ts until fixed (test.fail).
 */
async function reachNextStep(page: import("@playwright/test").Page) {
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Ottawa");
  await page.getByLabel("Tell us what happened in your own words").fill(STORY);
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
  if (await proposals.isVisible().catch(() => false)) await proposals.getByRole("button").last().click();
  await expect(page.locator("textarea").last()).toBeVisible({ timeout: 60_000 });
  await page.getByTestId("intake-start-review").click();
  const panel = page.getByTestId("intake-review");
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  const q = (id: string) => page.locator(`[data-question="${id}"]`);
  const kind = q("sc-orient-dispute-category").getByRole("button").first();
  if (await kind.count()) await kind.click();
  if (await q("sc-claim-filed").count()) await q("sc-claim-filed").getByRole("button", { name: "No", exact: true }).click();
  const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
  while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1, { timeout: 20_000 }); }
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 120_000 });
  return account;
}

// Finding 5: "Update your story", nothing changed, "Show my next step" waited ~2 minutes again: the
// guided continue handler (app/builder/page.tsx, useContinueHandler("guided")) always runs the analysis.
const NAME_5 = "OWNER-5: back to the questions with nothing changed, the next step shows without a new analysis -- small-claims";
test(NAME_5, async ({ page }) => {
  test.fail(isKnownProblem(NAME_5) && !process.env.SHOW_KNOWN, "known problem OWNER-5 (harness/knownProblems29oct-flow.ts)");
  test.setTimeout(480_000);
  const account = await reachNextStep(page);
  const row = [...account.rows.values()][0] as Record<string, unknown>;
  await page.goto(`/cases/${row.id}`);
  await page.getByRole("link", { name: "Update your story" }).click();
  const show = page.getByTestId("intake-continue-guidance");
  await expect(show).toBeVisible({ timeout: 60_000 });
  let analyses = 0;
  page.on("request", (request) => { if (/\/api\/small-claims\/analyze/.test(request.url())) analyses += 1; });
  await show.click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 120_000 });
  expect(analyses, "the saved next step is shown again; nothing changed, so nothing is analysed again").toBe(0);
});

// Finding 7: at phone width the chat's Ask button wrapped one letter per line (body overflow-wrap:
// anywhere, app/globals.css; the button can shrink in its flex row, CourtAssistantChat.tsx).
const NAME_7 = "OWNER-7: at 375 px the chat's Ask button keeps its word on one line -- small-claims";
test(NAME_7, async ({ page }) => {
  test.fail(isKnownProblem(NAME_7) && !process.env.SHOW_KNOWN, "known problem OWNER-7 (harness/knownProblems29oct-flow.ts)");
  test.setTimeout(480_000);
  await reachNextStep(page);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.getByRole("button", { name: "Ask follow-up questions" }).click();
  await page.getByPlaceholder("Ask about an important date, document, or case detail.").fill("What should I gather first?");
  const ask = page.getByRole("button", { name: "Ask", exact: true });
  await expect(ask).toBeVisible({ timeout: 30_000 });
  // The text's line boxes: one distinct top per line.
  const lines = await ask.evaluate((button) => {
    const range = document.createRange();
    range.selectNodeContents(button);
    return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
  });
  expect(lines, "\"Ask\" is on one line").toBe(1);
});
