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
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveFromThisCommit } from "./harness/thisCommitServer";
import { recordInitialUnknowns } from "./harness/intakeReview";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

const STORY = "I hired Test Decks Ltd. in March 2026 to build a deck for $8,000. I paid $2,000 and $6,000 is still owed. I have the contract, text messages and a bank receipt.";

async function guidedThenReview(page: Page) {
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
  if (await proposals.isVisible().catch(() => false)) await proposals.getByRole("button").last().click();
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
  await recordInitialUnknowns(page);
  await page.getByTestId("intake-review-acknowledgement").check();
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
