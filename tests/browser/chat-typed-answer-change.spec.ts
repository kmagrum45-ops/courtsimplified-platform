/**
 * UNDER A TYPED REPLY WHOSE ANSWER WAS LATER CHANGED, THE CHAT SAYS SO (item 5, 6 Nov 2026).
 *
 * Founder's Chrome check of #543 (5 Nov), other problem 3: the outcome was typed in reply to the Small Claims
 * chat's question ("Payment of the $2,650 I lent them") and later changed on the review; the chat's history still
 * showed only the old reply, so $2,650 was on screen after the change. The chat redraws its "Confirmed from my
 * story" lines with the newest answer (summaryText), but a reply the person typed stays as typed.
 *
 * What it checks, Small Claims, questions one at a time, on this commit's code with the model stand-ins and the
 * synthetic account: the reply stays as the person typed it (it is their words), and directly under it the chat
 * shows "You changed this answer: <the newest answer>". A reply not changed has no such line. (Civil and Family
 * chats already redraw each reply as "..., as you changed it": GuidedFormChat.tsx.)
 *
 * WHAT FAILURE THIS CATCHES: the chat showing an answer the person has since changed, with nothing to say so.
 */
import { expect, test } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveFromThisCommit, serveModelStandIns } from "./harness/thisCommitServer";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { chooseOffers } from "./harness/offers";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const STORY = "I lent a friend $2,650 on March 15, 2025 and they have not paid it back.";
const OLD = "Payment of the $2,650 I lent them";
const NEW = "Repayment of the money I lent them";
const QUESTIONS = "[data-testid=guided-message][data-from=assistant][data-question-id]";

test("a typed reply changed later on the review: the chat says \"You changed this answer\" under it -- small-claims", async ({ page }) => {
  test.setTimeout(480_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  await serveModelStandIns(page, "small-claims");
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Ottawa");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
  const ack = page.getByTestId("acknowledgement-checkbox");
  await expect(ack.or(page.getByRole("button", { name: /Answer questions one at a time/ }))).toBeVisible({ timeout: 60_000 });
  if (await ack.isVisible()) { await ack.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 10_000 }).catch(() => false)) await send.click();

  // The chat's questions, each answered "I do not know yet", except the outcome, typed until it is asked.
  let answered = 0;
  for (let turn = 0; turn < 20; turn++) {
    await page.waitForTimeout(2_000);
    const proposals = page.getByTestId("story-proposals");
    if (await proposals.isVisible().catch(() => false)) { await chooseOffers(proposals, "no"); await page.getByTestId("story-proposals-continue").click(); continue; }
    const ids = await page.locator(QUESTIONS).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-question-id") ?? ""));
    const box = page.locator("textarea[placeholder='Your answer...']");
    if (ids.length <= answered || !(await box.isVisible().catch(() => false))) break;
    const asked = ids.at(-1);
    await box.fill(asked === "sc-remedy-sought" ? OLD : "I do not know yet");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    answered = ids.length;
    await expect(page.getByRole("button", { name: "Sending…" })).toHaveCount(0, { timeout: 60_000 });
    if (asked === "sc-remedy-sought") break;
  }
  const reply = page.locator("[data-testid=guided-message][data-from=user]").filter({ hasText: OLD });
  await expect(reply, "the outcome was typed in the chat").toHaveCount(1);
  await expect(page.getByTestId("answer-changed-note"), "a reply not changed says nothing more").toHaveCount(0);

  // Changed on the review.
  // The chat may have opened the review itself once its questions ran out.
  const outcome = page.getByLabel("Review: What outcome are you asking the court to order?");
  if (!(await outcome.waitFor({ state: "visible", timeout: 15_000 }).then(() => true).catch(() => false))) await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
  await expect(outcome).toBeVisible({ timeout: 30_000 });
  await outcome.fill(NEW);
  await outcome.blur();
  await page.waitForTimeout(3_000);

  await expect(reply, "the reply stays as the person typed it").toHaveCount(1);
  // Directly under the reply, beside it (the reply itself stays the person's words).
  await expect(reply.locator("xpath=following-sibling::*[1]"), "the chat does not say the answer was changed").toHaveText(`You changed this answer: ${NEW}`, { timeout: 30_000 });
  await expect(reply, "the note was put inside the person's reply").not.toContainText("You changed this answer");
});
