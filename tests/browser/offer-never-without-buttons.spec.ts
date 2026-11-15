/**
 * AN OFFER'S QUESTION IS NEVER SHOWN WITHOUT ITS THREE BUTTONS, in any court (site owner, 15 Nov).
 *
 * Small Claims, Civil and Family, through the chat as a person goes: the first offer answered "I'm not sure", the second
 * "No, that's not right", the rest "Yes" (Family's married question, when asked, "I'm not sure"). At every step, every
 * visible question an offer asks ("Is that right?", "Is this right", "You can use what that says") sits in a box (its
 * nearest element with a test id) that also shows Yes, "No, that's not right" and "I'm not sure".
 *
 * What failure it catches: PR #550 CI, offer-choices Civil: after "I'm not sure" on the first offer, the next offer drew
 * "Amount: $40,000 ... From what you told us: ... Is that right?" with no buttons, because the shared control kept the
 * first answer in state that was not tied to the offer, and the chat drew its question outside the control. The person
 * saw a question they could not answer.
 *
 * THE REAL SAVE PATH: a real test account and session (authenticateRealTestUser); model routes stood in
 * (serveModelStandIns: the guided turn runs the site's own orchestrator with its model steps replaced).
 */
import { expect, test, type Page } from "@playwright/test";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { OFFER_CHOICES } from "../../src/lib/case-system/copy/suggestionCopy";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const ASKS = /\bIs (that|this) right\b|You can use what that says/;

/** Every visible offer question with its three buttons in the same box; the failure names the box and its words. */
async function noQuestionWithoutButtons(page: Page, where: string) {
  const lonely = await page.evaluate(({ asks, yes, no, unsure }) => {
    const pattern = new RegExp(asks);
    const shown = (element: Element) => { const rect = element.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden"; };
    const out: string[] = [];
    for (const element of Array.from(document.querySelectorAll("body *"))) {
      const own = Array.from(element.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent ?? "").join("");
      if (!pattern.test(own) || !shown(element)) continue;
      const box = element.closest("[data-testid]") ?? document.body;
      const buttons = Array.from(box.querySelectorAll("button")).filter(shown).map((button) => (button.textContent ?? "").trim());
      if (![yes, no, unsure].every((label) => buttons.includes(label))) out.push(`[data-testid=${box.getAttribute("data-testid")}] "${(box.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 140)}" buttons: ${JSON.stringify(buttons)}`);
    }
    return out;
  }, { asks: ASKS.source, yes: OFFER_CHOICES.yes, no: OFFER_CHOICES.no, unsure: OFFER_CHOICES.unsure });
  expect(lonely, `${where}: every offer's question is shown with Yes, No and Not sure`).toEqual([]);
}

/** First offer "I'm not sure", second "No", the rest "Yes". */
function chooser() {
  let made = 0;
  return () => (made++ === 0 ? "unsure" : made === 2 ? "no" : "yes") as "yes" | "no" | "unsure";
}

async function oneAtATime(page: Page, court: "civil" | "family") {
  const question = page.getByTestId("guided-form-question");
  const next = chooser();
  let offers = 0;
  for (let i = 0; i < 25; i++) {
    const triage = page.getByTestId("triage-story-suggestion").or(page.getByTestId("family-status-triage")).filter({ visible: true }).first();
    await expect(question.or(page.getByTestId("guided-nothing-left")).or(triage).first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(500);
    await noQuestionWithoutButtons(page, `${court}, step ${i}`);
    if (await triage.isVisible().catch(() => false)) {
      const unsure = triage.getByRole("button", { name: OFFER_CHOICES.unsure, exact: true }).first();
      if (await unsure.isVisible().catch(() => false)) { await unsure.click(); await page.waitForTimeout(500); continue; }
    }
    if (!(await question.isVisible().catch(() => false))) break;
    const offered = question.getByTestId("guided-form-from-story");
    if (await offered.isVisible().catch(() => false)) {
      offers++;
      const choice = next();
      await question.getByTestId(`guided-form-from-story-${choice}`).click();
      await page.waitForTimeout(500);
      await noQuestionWithoutButtons(page, `${court}, after "${choice}" on offer ${offers}`);
      if (choice === "no") await page.getByTestId("guided-form-skip").click();
      continue;
    }
    const partial = question.getByTestId("guided-form-partial-use");
    if (await partial.isVisible().catch(() => false)) {
      offers++;
      const choice = next();
      await question.getByTestId(choice === "yes" ? "guided-form-partial-use" : `guided-form-partial-use-${choice}`).click();
      await page.waitForTimeout(500);
      await noQuestionWithoutButtons(page, `${court}, after "${choice}" on a partial offer`);
    }
    await page.getByTestId("guided-form-skip").click();
  }
  expect(offers, `${court}: the story made at least two offers to answer`).toBeGreaterThanOrEqual(2);
}

const STORIES = {
  civil: "Synthetic: a supplier never delivered the machine I ordered in April 2026. I paid $40,000 for it and I want my $40,000 back.",
  family: "Synthetic: Jordan Testfield and I lived together from 2018 to August 2025. Our daughter is 6 and lives with me. I want a regular parenting-time schedule and child support.",
} as const;

for (const court of ["civil", "family"] as const) {
  test(`${court}: an offer's question is never shown without its three buttons`, async ({ page }) => {
    test.setTimeout(600_000);
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await serveModelStandIns(page, court, userId);
      await openBuilder(page, court, { city: "Kingston", story: STORIES[court], situation: STARTING_NOTHING_FILED });
      await oneAtATime(page, court);
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}

test("small-claims: an offer's question is never shown without its three buttons", async ({ page }) => {
  test.setTimeout(600_000);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await serveModelStandIns(page, "small-claims", userId);
    await page.goto("/?path=small-claims");
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("City or municipality").fill("Kingston");
    await page.getByLabel(STORY_LABEL, { exact: true }).fill("my neighbor cut down a tree on my property without my permission. i want the tree replaced and i got a quote for 1500 to do the work and supply the tree");
    await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
    const ack = page.getByTestId("acknowledgement-checkbox");
    const choose = page.getByRole("button", { name: /Answer questions one at a time/ });
    await expect(ack.or(choose).first()).toBeVisible({ timeout: 60_000 });
    if (await ack.isVisible()) { await ack.check(); await page.getByTestId("acknowledgement-continue").click(); }
    await choose.click();
    const send = page.getByTestId("guided-send-saved-story");
    if (await send.isVisible({ timeout: 10_000 }).catch(() => false)) await send.click();
    const next = chooser();
    let offers = 0;
    for (let turn = 0; turn < 25; turn++) {
      const finished = page.getByText("That's everything needed for now");
      const proposals = page.getByTestId("story-proposals");
      const suggestion = page.getByTestId("claim-type-suggestion");
      const message = page.locator("[data-testid=guided-message][data-from=assistant]").last();
      await expect(finished.or(proposals).or(suggestion).or(message).first()).toBeVisible({ timeout: 90_000 });
      await page.waitForTimeout(800);
      await noQuestionWithoutButtons(page, `small-claims, turn ${turn}`);
      if (await finished.isVisible().catch(() => false)) break;
      if (await proposals.isVisible().catch(() => false)) {
        for (const row of await proposals.getByTestId("story-proposal-row").all()) { offers++; await row.getByTestId(`story-proposal-${next()}`).click(); }
        await noQuestionWithoutButtons(page, "small-claims, the card answered");
        await proposals.getByTestId("story-proposals-continue").click();
        await expect(proposals).toHaveCount(0, { timeout: 120_000 });
        continue;
      }
      if (await suggestion.isVisible().catch(() => false)) {
        offers++;
        await suggestion.getByRole("button", { name: OFFER_CHOICES.unsure, exact: true }).click();
        await page.waitForTimeout(800);
        await noQuestionWithoutButtons(page, "small-claims, after \"I'm not sure\" on the kind");
        continue;
      }
      const text = (await message.innerText()).replace(/\s+/g, " ");
      const before = await page.locator("[data-testid=guided-message]").count();
      await page.locator("textarea").last().fill(/how much|amount|dollar/i.test(text) ? "1500" : /when/i.test(text) ? "October 4, 2026" : "I want the tree replaced.");
      await page.getByRole("button", { name: "Send", exact: true }).click();
      await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 90_000 }).toBeGreaterThan(before + 1).catch(() => {});
    }
    expect(offers, "small-claims: the story made at least two offers to answer").toBeGreaterThanOrEqual(2);
  } finally {
    await deleteHarnessUser(userId);
  }
});
