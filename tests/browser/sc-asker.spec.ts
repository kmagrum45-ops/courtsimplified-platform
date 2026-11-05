/**
 * THE SMALL CLAIMS ASKER, IN THE PAGE (founder's plan step 5, 1 Nov: one asker, the question engine,
 * checks the case file before any question is shown; intake/asker.ts).
 *
 * The carry test's asked-twice entries this pilot clears (valid local carry runs 41389173210 and
 * 41389180946 at 9824623d): the Small Claims form showed an EMPTY amount box after the amount was
 * answered in the chat or in the review, and an empty "Important dates / timeline" box after "when did it
 * happen" was answered in the chat (form-field@/builder?step=form, facts amount and whenHappened).
 *
 * What it checks (stand-ins only: fakeAccount, serveFromThisCommit -- the model routes answered by this
 * commit's own code with every model step replaced; the situation answers clicked by the harness (grantSiteAccess -> autoAnswerSituation)):
 *   1. the questions one at a time: the amount and the date answered in the chat are in the form's boxes
 *      (the person's own answers, filled once), and a box the person then clears stays clear after a reload;
 *   2. the review: the amount answered there is in the form's amount box;
 *   3. risk (b): with only a story that names an amount and a month, the form's amount and timeline boxes
 *      stay empty (a story guess is offered, never typed in as the person's answer).
 *
 * WHAT FAILURE THIS CATCHES: the form asking again for an answer the person already gave (an empty box
 * while the case file holds it), a box refilled after the person cleared it, or a story guess filled in.
 */
import { expect, test, type Page } from "@playwright/test";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { answerSituation, situationAnswersFor } from "./harness/situation";
import { serveFromThisCommit } from "./harness/thisCommitServer";
import { asksForDate } from "../../src/lib/case-system/dates";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const STORY = "Synthetic story: I hired a deck builder in March 2026 to build a deck at my home. They never finished it and kept the $5,000 I paid. I have the contract.";
const AMOUNT = "$6,400";
const DAY = "March 3, 2026";

const idOf = (page: Page) => { const url = new URL(page.url()); return url.searchParams.get("intake") ?? url.searchParams.get("caseId") ?? ""; };

async function passNotice(page: Page) {
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  const situation = page.getByTestId("situation-questions");
  const ready = page.getByTestId("intake-review").or(page.getByRole("button", { name: "Fill in the form yourself" })).or(page.getByTestId("sc-intake-otherParty")).or(page.getByRole("button", { name: /Answer questions one at a time/ }));
  for (let round = 0; round < 5; round++) {
    await expect(acknowledgement.or(situation).or(ready).first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(1_000);
    if (await acknowledgement.isVisible().catch(() => false)) {
      if (!(await acknowledgement.isChecked().catch(() => true))) await acknowledgement.check().catch(() => {});
      await page.getByTestId("acknowledgement-continue").click().catch(() => {});
      await expect(page.getByTestId("first-use-acknowledgement")).toBeHidden({ timeout: 30_000 });
      continue;
    }
    if (await situation.isVisible().catch(() => false)) { await answerSituation(page, situationAnswersFor(page)); continue; }
    return;
  }
}

async function start(page: Page) {
  await grantSiteAccess(page);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, "small-claims", account.rows as unknown as Map<string, Record<string, unknown>>);
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Kingston");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
  await passNotice(page);
  return idOf(page);
}

async function openForm(page: Page, id: string) {
  await page.goto(`/builder?path=small-claims&intake=${id}&step=form`);
  await passNotice(page);
  await expect(page.getByTestId("sc-intake-otherParty")).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(2_500);
}

test("Small Claims questions one at a time: the amount and the date answered in the chat are in the form's boxes; a box cleared stays clear", async ({ page }) => {
  test.setTimeout(300_000);
  const id = await start(page);
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 5_000 }).catch(() => false)) await send.click();
  let last = "";
  const answered: string[] = [];
  for (let i = 0; i < 25; i++) {
    const finished = page.getByText("That's everything needed for now");
    const proposals = page.getByTestId("story-proposals");
    const question = page.locator("[data-testid=guided-message][data-from=assistant]").last();
    await expect(finished.or(proposals).or(question).first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(600);
    if (await finished.isVisible().catch(() => false)) break;
    if (await proposals.isVisible().catch(() => false)) { await proposals.getByTestId("story-proposals-continue").click(); await expect(proposals.getByTestId("working-note")).toHaveCount(0, { timeout: 120_000 }); continue; }
    const text = (await question.innerText()).replace(/\s+/g, " ");
    if (text === last) break;
    last = text;
    const answer = /add the year/i.test(text) ? DAY : /how much|amount/i.test(text) ? AMOUNT : asksForDate(text) ? DAY
      : /bringing this claim|responding to a claim/i.test(text) ? "Bringing the claim (plaintiff)" : /kind of dispute/i.test(text) ? "A contract or agreement dispute" : /filed|served/i.test(text) ? "No" : "I don't know";
    if (answer === AMOUNT) answered.push("amount");
    if (answer === DAY) answered.push("date");
    const before = await page.locator("[data-testid=guided-message]").count();
    await page.locator("textarea").last().fill(answer);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 60_000 }).toBeGreaterThan(before + 1).catch(() => {});
  }
  expect(answered, "the chat asked for the amount and for when it happened").toEqual(expect.arrayContaining(["amount", "date"]));

  await openForm(page, id);
  await expect(page.getByTestId("sc-intake-amountClaimed"), "the amount given in the chat is in the form's amount box (not asked again)").toHaveValue(/6,?400/, { timeout: 20_000 });
  await expect(page.getByTestId("sc-intake-timeline"), "the date given in the chat is in the form's timeline box (not asked again)").toHaveValue(/March 3, 2026/, { timeout: 20_000 });

  // The person clears the amount: it stays clear (never refilled from the case file).
  const amount = page.getByTestId("sc-intake-amountClaimed");
  await amount.fill("");
  await amount.blur();
  await page.waitForTimeout(3_000);
  await openForm(page, id);
  await expect(page.getByTestId("sc-intake-amountClaimed"), "a box the person cleared is not refilled").toHaveValue("");
});

test("Small Claims review: the amount answered there is in the form's amount box", async ({ page }) => {
  test.setTimeout(300_000);
  const id = await start(page);
  const panel = page.getByTestId("intake-review");
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", /reviewing|user-confirmed/, { timeout: 60_000 });
  const box = panel.locator('[data-testid=intake-initial-question][data-question="sc-amount-claimed"][data-answered="false"]').getByRole("textbox");
  await expect(box, "the review asks for the amount").toBeVisible({ timeout: 30_000 });
  await box.fill(AMOUNT);
  await box.press("Enter");
  await expect(panel.locator('[data-testid=intake-initial-question][data-question="sc-amount-claimed"][data-answered="true"]')).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(3_000);
  await openForm(page, id);
  await expect(page.getByTestId("sc-intake-amountClaimed"), "the amount given in the review is in the form's amount box (not asked again)").toHaveValue(/6,?400/, { timeout: 20_000 });
});

test("risk (b): a story naming an amount and a month fills no box as the person's answer", async ({ page }) => {
  test.setTimeout(300_000);
  const id = await start(page);
  await openForm(page, id);
  await expect(page.getByTestId("sc-intake-amountClaimed"), "the story's $5,000 is not typed into the amount box").toHaveValue("");
  await expect(page.getByTestId("sc-intake-timeline"), "the story's month is not typed into the timeline box").toHaveValue("");
});

// Local carry runs 41393577468 / 41393585578 at 20d4d32d: the form route showed "$6,400.00$7,250" after the person
// cleared "$6,400" and typed "$7,250" key by key -- the held amount was put back into the box under their keys.
test("the form: a box the person clears and types in key by key keeps only their new value, after a reload too", async ({ page }) => {
  test.setTimeout(300_000);
  const id = await start(page);
  await openForm(page, id);
  const amount = page.getByTestId("sc-intake-amountClaimed");
  await amount.fill(AMOUNT);
  await amount.blur();
  await page.waitForTimeout(3_000);
  await amount.fill("");
  await amount.pressSequentially("$7,250", { delay: 20 });
  await amount.blur();
  await page.waitForTimeout(3_000);
  await expect(amount, "only the person's new value is in the box").toHaveValue("$7,250");
  await openForm(page, id);
  await expect(page.getByTestId("sc-intake-amountClaimed"), "after a reload, only the person's new value").toHaveValue("$7,250");
});
