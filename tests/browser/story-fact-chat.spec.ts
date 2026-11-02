/**
 * THE STORY IS NEVER ASKED AGAIN IN THE SMALL CLAIMS CHAT; A USED KIND SUGGESTION IS SAID BACK
 * (founder's Chrome check of #536, round 2, item 2; "story" added to the case file's facts, 1 Nov).
 *
 * After "Use the suggestion: <kind>" the chat showed its story box ("Tell us what happened in your own
 * words...") with Send although the story had been sent, and no "Got it" for the kind.
 *
 * What it checks (stand-ins only: fakeAccount, the model routes, the claim-type route answering "confirmed"):
 *   1. the story sent from the home page: the chat's story box never comes on screen again;
 *   2. "Use the suggestion" on the kind: the chat says "Got it: <kind>." and goes on to a question (or the end),
 *      never the story box.
 * Limit: the stand-in proposes no kind row on the story card, so the card-emptied branch (the continuation
 * at resolveSuggestion's end) is checked by test:story-fact reading the code, not driven here.
 *
 * WHAT FAILURE THIS CATCHES: the story asked again after it was given, or a used suggestion with no answer said back.
 */
import { expect, test } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { serveFromThisCommit, serveModelStandIns } from "./harness/thisCommitServer";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const STORY = "Synthetic story: the plum-yellow crew left my yard torn up in May 2026 after the job. I have photos.";
const KIND = { claimTypeId: "sc-claim-contractor-damage", claimTypeName: "Damage caused by a contractor", quote: "the plum-yellow crew left my yard torn up" };

test("Small Claims chat: after the story is sent and the kind suggestion used, the story box never comes back and the kind is said back", async ({ page }) => {
  test.setTimeout(300_000);
  await grantSiteAccess(page);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  await serveModelStandIns(page, "small-claims", undefined, { suggestKind: KIND });
  await page.route("**/api/intake/classify-claim-type", (route) => route.fulfill({ json: { ok: true, result: { outcome: "confirmed", claimType: { claimTypeId: KIND.claimTypeId, claimTypeName: KIND.claimTypeName }, evidenceGuidance: null, claimGuidance: null } } }));
  // Every time the chat's story box is on screen after the story was given, it is recorded.
  await page.addInitScript(() => {
    (window as unknown as { __storyBoxSeen: number }).__storyBoxSeen = 0;
    setInterval(() => { const box = document.querySelector("textarea[aria-describedby=guided-story-guidance]") as HTMLElement | null; if (box && box.offsetParent) (window as unknown as { __storyBoxSeen: number }).__storyBoxSeen += 1; }, 200);
  });

  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
  const ack = page.getByTestId("acknowledgement-checkbox");
  await expect(ack.or(page.getByRole("button", { name: /Answer questions one at a time/ }))).toBeVisible({ timeout: 60_000 });
  if (await ack.isVisible()) { await ack.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await page.evaluate(() => { (window as unknown as { __storyBoxSeen: number }).__storyBoxSeen = 0; });
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 10_000 }).catch(() => false)) await send.click();

  const card = page.getByTestId("claim-type-suggestion");
  await expect(card, "the kind is suggested").toBeVisible({ timeout: 60_000 });
  await card.getByTestId("claim-type-use-suggestion").click();
  await expect(card).toHaveCount(0, { timeout: 60_000 });
  await expect(page.locator("[data-testid=guided-message][data-from=assistant]").filter({ hasText: `Got it: ${KIND.claimTypeName}.` }), "the kind used is said back").toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator("[data-testid=guided-message][data-question-id]").last().or(page.getByText("That's everything needed for now")).first(), "the chat goes on").toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(2_000);
  expect(await page.evaluate(() => (window as unknown as { __storyBoxSeen: number }).__storyBoxSeen), "the chat's story box never came back after the story was given").toBe(0);
  await page.reload();
  await page.waitForTimeout(5_000);
  await expect(page.locator("textarea[aria-describedby=guided-story-guidance]"), "after a reload, no story box either").toHaveCount(0);
});
