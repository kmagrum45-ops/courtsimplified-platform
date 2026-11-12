/**
 * EVERY STORY OFFER HAS THREE EXPLICIT CHOICES, AND EACH DOES WHAT IT SAYS (site owner, 11 Nov 2026).
 *
 * "Each offer (a value read from the story) gets three explicit choices: Yes, No, that's not right, I'm not sure.
 * Continue stays disabled until every offer has a choice. No means the fact is unknown, so the question is asked ONCE.
 * I'm not sure means settled: never asked again." Checked on each card a person meets:
 *   - Small Claims, "Here's what I understood" (the tree story from the live site: the quote of 1500 is offered as the
 *     amount): Continue is disabled until every row has a choice; Yes keeps the value and the amount question is never
 *     asked; No asks that question once and never again; I'm not sure never asks it; what was chosen is a neutral note,
 *     never the person's own bubble.
 *   - Civil, one question at a time: a story offer shows Yes / No, that's not right / I'm not sure; I'm not sure moves
 *     on and the question never comes back; No asks the same question plainly, once.
 *
 * THE REAL SAVE PATH: a real test account and session (authenticateRealTestUser); model routes stood in
 * (serveModelStandIns: the guided turn runs the site's own orchestrator with its model steps replaced).
 */
import { expect, test, type Page } from "@playwright/test";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const TREE = "my neighbor cut down a tree on my property withoiut my permission. i want the tree replaced and i got a quote for 1500 to do the work and supply the tree";

async function startSmallClaims(page: Page) {
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Kingston");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(TREE);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
  const ack = page.getByTestId("acknowledgement-checkbox");
  await expect(ack.or(page.getByRole("button", { name: /Answer questions one at a time/ })).first()).toBeVisible({ timeout: 60_000 });
  if (await ack.isVisible()) { await ack.check(); await page.getByTestId("acknowledgement-continue").click(); }
  const choose = page.getByRole("button", { name: /Answer questions one at a time/ });
  await expect(choose).toBeVisible({ timeout: 60_000 });
  await choose.click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 10_000 }).catch(() => false)) await send.click();
}

/** Answers the chat to its end, counting each question by its id; the card's rows are chosen by `choose`. */
async function chatToTheEnd(page: Page, choose: (questionId: string) => "yes" | "no" | "unsure"): Promise<Map<string, number>> {
  const asked = new Map<string, number>();
  let last = "";
  for (let turn = 0; turn < 25; turn++) {
    const finished = page.getByText("That's everything needed for now");
    const proposals = page.getByTestId("story-proposals");
    const suggestion = page.getByTestId("claim-type-suggestion");
    const question = page.locator("[data-testid=guided-message][data-from=assistant]").last();
    await expect(finished.or(proposals).or(suggestion).or(question).first()).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(800);
    if (await finished.isVisible().catch(() => false)) break;
    if (await proposals.isVisible().catch(() => false)) {
      const continueButton = proposals.getByTestId("story-proposals-continue");
      await expect(continueButton, "Continue is disabled until every offer has a choice").toBeDisabled();
      const rows = await proposals.getByTestId("story-proposal-row").all();
      for (const [index, row] of rows.entries()) {
        await row.getByTestId(`story-proposal-${choose((await row.getAttribute("data-question-id")) ?? "")}`).click();
        if (index < rows.length - 1) await expect(continueButton, "still disabled while an offer has no choice").toBeDisabled();
      }
      await expect(continueButton).toBeEnabled();
      await continueButton.click();
      await expect(proposals).toHaveCount(0, { timeout: 120_000 });
      continue;
    }
    if (await suggestion.isVisible().catch(() => false)) { await suggestion.getByRole("button").first().click(); continue; }
    const id = (await question.getAttribute("data-question-id")) ?? "";
    const text = (await question.innerText()).replace(/\s+/g, " ");
    if (text === last) break;
    last = text;
    if (id) asked.set(id, (asked.get(id) ?? 0) + 1);
    const answer = /add the year/i.test(text) ? "October 4, 2026" : /how much|amount|dollar/i.test(text) ? "1500" : /when/i.test(text) ? "October 4, 2026" : "I want the tree replaced.";
    const before = await page.locator("[data-testid=guided-message]").count();
    await page.locator("textarea").last().fill(answer);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 90_000 }).toBeGreaterThan(before + 1).catch(() => {});
  }
  return asked;
}

for (const [name, amountChoice] of [["Yes keeps the quoted amount", "yes"], ["I'm not sure settles the amount", "unsure"], ["No asks the amount once", "no"]] as const) {
  test(`Small Claims offer card: Continue waits for every choice; ${name}; the wants offer said No is asked once`, async ({ page }) => {
    test.setTimeout(600_000);
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await serveModelStandIns(page, "small-claims", userId);
      await startSmallClaims(page);
      const offered: string[] = [];
      const asked = await chatToTheEnd(page, (questionId) => {
        offered.push(questionId);
        return questionId === "sc-amount-claimed" ? amountChoice : questionId === "sc-remedy-sought" ? "no" : "yes";
      });
      expect(offered, "the story's quote of 1500 is offered as the amount").toContain("sc-amount-claimed");
      if (amountChoice === "no") expect(asked.get("sc-amount-claimed"), "No: the amount is asked once").toBe(1);
      else expect(asked.get("sc-amount-claimed") ?? 0, `${amountChoice === "yes" ? "Yes" : "I'm not sure"}: the amount is never asked`).toBe(0);
      if (offered.includes("sc-remedy-sought")) expect(asked.get("sc-remedy-sought"), "No: what you want is asked once").toBe(1);
      await expect(page.locator("[data-testid=guided-message][data-from=note]").first(), "what was chosen is a note").toBeVisible();
      await expect(page.locator("[data-testid=guided-message][data-from=user]").filter({ hasText: /Confirmed from|None of those/ }), "nothing written in the person's name").toHaveCount(0);
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}

test("Civil offer: Yes / No, that's not right / I'm not sure; not sure is never asked again; No asks the question once", async ({ page }) => {
  test.setTimeout(600_000);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await serveModelStandIns(page, "civil", userId);
    await openBuilder(page, "civil", { city: "Kingston", story: "Synthetic: a supplier never delivered the machine I ordered in April 2026. I paid $40,000 for it and I want my $40,000 back.", situation: STARTING_NOTHING_FILED });
    const question = page.getByTestId("guided-form-question");
    const seen = new Map<string, number>();
    let unsureKey = "";
    let noKey = "";
    for (let i = 0; i < 20; i++) {
      await expect(question.or(page.getByTestId("guided-nothing-left")).first()).toBeVisible({ timeout: 60_000 });
      if (!(await question.isVisible().catch(() => false))) break;
      const key = (await question.getAttribute("data-key")) ?? "";
      seen.set(key, (seen.get(key) ?? 0) + 1);
      const offered = question.getByTestId("guided-form-from-story");
      if (await offered.isVisible().catch(() => false)) {
        for (const id of ["yes", "no", "unsure"]) await expect(question.getByTestId(`guided-form-from-story-${id}`), "three choices").toHaveCount(1);
        if (!unsureKey) { unsureKey = key; await question.getByTestId("guided-form-from-story-unsure").click(); continue; }
        if (!noKey) {
          noKey = key;
          await question.getByTestId("guided-form-from-story-no").click();
          await expect(question.getByTestId("guided-form-from-story"), "No: the offer goes, the question is asked plainly").toHaveCount(0);
          await expect(question).toHaveAttribute("data-key", key);
          await page.getByTestId("guided-form-skip").click();
          continue;
        }
        await question.getByTestId("guided-form-from-story-yes").click();
        continue;
      }
      await page.getByTestId("guided-form-skip").click();
    }
    expect(unsureKey, "an offer was answered I'm not sure").not.toBe("");
    expect(seen.get(unsureKey), "I'm not sure: that question never comes back").toBe(1);
    if (noKey) expect(seen.get(noKey), "No: that question is asked once (the plain ask is the same visit)").toBe(1);
  } finally {
    await deleteHarnessUser(userId);
  }
});

test("the review is a summary: every value typed or said Yes to, so no tick and no confirmation; one press continues", async ({ page }) => {
  test.setTimeout(600_000);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await serveModelStandIns(page, "small-claims", userId);
    await startSmallClaims(page);
    await chatToTheEnd(page, () => "yes");
    const panel = page.getByTestId("intake-review");
    await expect(panel).toBeVisible({ timeout: 60_000 });
    if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
    await expect(panel).toHaveAttribute("data-phase", /reviewing|user-confirmed/, { timeout: 60_000 });
    if ((await panel.getAttribute("data-phase")) === "reviewing") {
      // Unanswered initial questions are marked as the person does; nothing typed is confirmed again.
      const unknowns = page.locator('input[data-testid="intake-unknown"]:not(:checked)');
      while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1); }
      await expect(page.getByTestId("intake-review-acknowledgement"), "no tick: a value the person typed never asks for confirmation").toHaveCount(0);
      await expect(page.getByTestId("intake-confirm"), "the one button continues").toHaveText("Continue");
      await expect(page.getByText("Confirm my initial information"), "no confirmation is asked").toHaveCount(0);
      await page.getByTestId("intake-confirm").click();
    }
    await expect(panel, "one press").toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
  } finally {
    await deleteHarnessUser(userId);
  }
});
