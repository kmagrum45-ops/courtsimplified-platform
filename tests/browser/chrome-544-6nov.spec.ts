/**
 * CHROME CHECK OF #544 (6 Nov 2026, preview 8901278): THE NEWEST ANSWER WINS ON EVERY SCREEN, SMALL CLAIMS.
 *
 * F1. After "Save story" the review's amount box showed the chat's old answer ($6,400) while the whole form showed the
 *     newest ($9,400), also after a reload; after "Start the questions again from my story" the review showed an older
 *     review answer (9350).
 *
 * What it checks, on this commit's code with the real save path (a real local or staging account, realTestSession.ts
 * refuses production) and the model stand-ins (serveModelStandIns): the chat answers the amount ($6,400), the review is
 * confirmed and the next step shown, the review's own box is changed (9350) and confirmed, the whole form's box is
 * changed ($9,400); then
 *   1. the story edited on the review and saved: the review's amount shows $9,400, never $6,400 or 9350, also after a reload;
 *   2. the questions started again from the story: the review's amount still shows $9,400.
 *
 * WHAT FAILURE THIS CATCHES: a screen showing its own older copy of an answer after the person gave a newer one elsewhere.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser, harnessAdmin } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { recordInitialUnknowns } from "./harness/intakeReview";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { asksForDate } from "../../src/lib/case-system/dates";
import { chooseOffers } from "./harness/offers";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

export const DECK_STORY = "I hired a deck builder in March 2026 to build a deck at my home. They never finished it and kept the money I paid. My neighbour remembers their teal-orange van.";
const AMOUNT = "sc-amount-claimed";

const idOf = (page: Page) => new URL(page.url()).searchParams.get("intake") ?? "";

async function passNotice(page: Page) {
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  const ready = page.getByRole("button", { name: /Answer questions one at a time/ }).or(page.getByTestId("intake-review")).or(page.locator("[data-testid=guided-message]").first());
  await expect(acknowledgement.or(ready).first()).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1_500);
  if (await acknowledgement.isVisible().catch(() => false)) {
    await acknowledgement.check();
    await page.getByTestId("acknowledgement-continue").click();
    await expect(page.getByTestId("first-use-acknowledgement")).toBeHidden({ timeout: 30_000 });
  }
}

export async function startDeckCase(page: Page) {
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Kingston");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(DECK_STORY);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
  await passNotice(page);
}

/** The chat, as Chrome answered it: the date, the kind, $6,400, and "I do not know yet" for what the court should order. */
export async function deckChat(page: Page) {
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
    const answer = /add the year/i.test(text) ? "March 3, 2026"
      : /how much|amount/i.test(text) ? "$6,400"
      : asksForDate(text) ? "March 3, 2026"
      : /kind of dispute/i.test(text) ? "A contract or agreement dispute"
      : /bringing this claim|responding to a claim/i.test(text) ? "Bringing the claim (plaintiff)"
      : /filed|served/i.test(text) ? "No"
      : "I do not know yet";
    const before = await page.locator("[data-testid=guided-message]").count();
    await page.locator("textarea").last().fill(answer);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(() => page.locator("[data-testid=guided-message]").count(), { timeout: 60_000 }).toBeGreaterThan(before + 1).catch(() => {});
  }
}

export async function openReview(page: Page, id: string, step = "guided") {
  await page.goto(`/builder?path=small-claims&intake=${id}&step=${step}`);
  const panel = page.getByTestId("intake-review");
  await expect(panel).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1_500);
  if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
  if (await page.getByTestId("intake-view-review").isVisible().catch(() => false)) await page.getByTestId("intake-view-review").click();
  await page.waitForTimeout(800);
  return panel;
}

export async function confirmReview(page: Page) {
  const panel = page.getByTestId("intake-review");
  await recordInitialUnknowns(page);
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
}

/** The review opened, confirmed and the next step shown, as Chrome did after each change. */
async function reconfirm(page: Page, id: string) {
  const panel = await openReview(page, id);
  if ((await panel.getAttribute("data-phase")) !== "user-confirmed") await confirmReview(page);
  // From the case page, as Chrome did: "Show my next step" or "Update my next steps" when the case page offers one.
  await page.goto(`/cases/${id}`);
  const next = page.getByRole("button", { name: /^(Show my next step|Update my next steps)$/ }).or(page.getByRole("link", { name: /^(Show my next step|Update my next steps)$/ })).first();
  await expect(next.or(page.getByTestId("case-file")).first()).toBeVisible({ timeout: 90_000 });
  if (await next.isVisible().catch(() => false)) {
    await next.click();
    await page.waitForTimeout(2_000);
    await expect(page.getByText(/Working out your next step/)).toHaveCount(0, { timeout: 180_000 });
  }
  await page.waitForTimeout(2_000);
}

/** What the review shows for the amount: its box, the answered question's box, or the held line. */
export async function reviewAmount(page: Page): Promise<string> {
  const panel = page.getByTestId("intake-review");
  for (const field of ["amountClaimed", "amountClaimedText", "amount"]) {
    const input = panel.locator(`[data-testid=intake-entry][data-field="${field}"]`).first().locator("input, textarea").first();
    if (await input.count()) return input.inputValue();
  }
  const held = panel.locator("[data-testid=intake-entry-held][data-fact=amount]").first();
  if (await held.count()) return held.innerText();
  const question = panel.locator(`[data-testid=intake-initial-question][data-question="${AMOUNT}"]`);
  if (await question.count()) return question.innerText();
  return "(no amount shown)";
}

async function reviewAmountBox(page: Page) {
  const panel = page.getByTestId("intake-review");
  for (const field of ["amountClaimed", "amountClaimedText", "amount"]) {
    const input = panel.locator(`[data-testid=intake-entry][data-field="${field}"]`).first().locator("input, textarea").first();
    if (await input.count()) return input;
  }
  return null;
}

export async function formAmount(page: Page, id: string, value?: string) {
  await page.goto(`/builder?path=small-claims&intake=${id}&step=form`);
  const show = page.getByTestId("guided-form-show-form");
  const box = page.getByTestId("sc-intake-amountClaimed");
  await expect(show.or(box).first()).toBeVisible({ timeout: 60_000 });
  if (await show.isVisible().catch(() => false)) await show.click();
  await expect(box).toBeVisible({ timeout: 60_000 });
  if (value !== undefined) { await box.fill(value); await box.blur(); await page.waitForTimeout(3_000); }
  return box.inputValue();
}

/** The saved row, for the report (what each store holds), read through the local or staging admin client. */
async function dump(id: string, when: string) {
  const { data } = await harnessAdmin().from("cases").select("master_result").eq("id", id).maybeSingle();
  const cp = (data?.master_result as { intakeCheckpoint?: { sections?: Record<string, Record<string, unknown>> } } | null)?.intakeCheckpoint;
  const s = cp?.sections ?? {};
  const pick = (o: unknown, keys: string[]) => Object.fromEntries(keys.map((k) => [k, (o as Record<string, unknown> | undefined)?.[k]]).filter(([, v]) => v !== undefined));
  console.log(`DUMP ${when}: form=${JSON.stringify(pick(s["small-claims"]?.input, ["amountClaimed"]))} guided.facts=${JSON.stringify(pick(s.guided?.facts, ["amountClaimedText", "amountClaimed"]))} earlier=${JSON.stringify(((s.guided?.earlierAnswers as unknown[]) ?? []).filter((a) => /amount/.test(JSON.stringify(a))))} review=${JSON.stringify(pick(s.builder?.initialAnswers, [AMOUNT]))} facts=${JSON.stringify((s.caseFile?.facts as Record<string, unknown> | undefined)?.amount)} changes=${JSON.stringify((s.caseFile?.changes as Record<string, unknown> | undefined)?.amount)} basis=${JSON.stringify(Object.fromEntries(Object.entries(s.storyBasis ?? {}).filter(([k]) => /amount/i.test(k))))}`);
}

test("F1 Small Claims: after the whole form's newest amount, \"Save story\" and \"Start the questions again\" show that amount on the review, never an older one", async ({ page }) => {
  test.setTimeout(600_000);
  const userId = await authenticateRealTestUser(page, { realCases: true });
  try {
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    await serveModelStandIns(page, "small-claims", userId);
    await startDeckCase(page);
    const id = idOf(page);
    await deckChat(page);
    let panel = await openReview(page, id);
    await confirmReview(page);
    await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
    await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 180_000 });
    await dump(id, "after the chat and the next step");

    // Chrome steps 5-10: the other party typed in the whole form; then the amount changed there to $7,250 and the other
    // party cleared; confirmed again and the next step shown.
    await formAmount(page, id);
    const other = page.getByTestId("sc-intake-otherParty");
    if (await other.count()) { await other.fill("Jordan Testwood"); await other.blur(); await page.waitForTimeout(3_000); }
    // "Update my next steps", as Chrome pressed it after the stand-in.
    await reconfirm(page, id);
    await dump(id, "after the other party and the next steps again");
    console.log(`form box before $7,250: ${await formAmount(page, id)}`);
    await dump(id, "after the form opened again");
    await formAmount(page, id, "$7,250");
    if (await other.count()) { await other.fill(""); await other.blur(); await page.waitForTimeout(3_000); }
    await page.reload();
    await reconfirm(page, id);
    await dump(id, "after the form's $7,250, confirmed");

    // Chrome steps 13-14: the review's own box, $8,150, Confirm; then 9350, Confirm.
    for (const value of ["$8,150", "9350"]) {
      panel = await openReview(page, id);
      const box = await reviewAmountBox(page);
      if (box) { await box.fill(value); await box.blur(); }
      else {
        const held = panel.locator("[data-testid=intake-entry-held][data-fact=amount]").first();
        await held.getByTestId("change-answer-open").click();
        await held.getByTestId("change-answer-text").fill(value);
        await held.getByTestId("change-answer-save").click();
      }
      console.log(`review box for ${value}: ${box ? "a plain box" : "the held line's Change"}`);
      await page.waitForTimeout(3_000);
      await reconfirm(page, id);
      await dump(id, `after the review's ${value}, confirmed`);
    }

    // The whole form's box, as Chrome step 16: $9,400, no confirm.
    await formAmount(page, id, "$9,400");
    await dump(id, "after the form's $9,400");
    expect(await formAmount(page, id), "the form keeps $9,400").toMatch(/9,400/);

    // 1. The story edited on the review and saved.
    panel = await openReview(page, id);
    await page.getByTestId("review-story-draft").fill(`${DECK_STORY} I asked them twice to come back and finish.`);
    await page.getByTestId("review-story-save").click();
    await page.waitForTimeout(3_000);
    await dump(id, "after Save story");
    const atOnce = await reviewAmount(page);
    console.log(`review amount right after Save story: ${atOnce}`);
    expect(atOnce, "1. right after Save story, never the chat's $6,400").not.toMatch(/6,?400/);
    panel = await openReview(page, id);
    const afterSave = await reviewAmount(page);
    console.log(`review amount after Save story: ${afterSave}`);
    expect(afterSave, "1. after Save story the review shows the newest amount").toMatch(/9,?400/);
    expect(afterSave, "1. never the chat's $6,400").not.toMatch(/6,?400/);
    await page.reload();
    panel = await openReview(page, id);
    expect(await reviewAmount(page), "1. after a reload too").toMatch(/9,?400/);

    // 2. The questions started again from the story.
    const restart = page.getByRole("button", { name: "Start the questions again from my story" }).first();
    await expect(restart).toBeVisible({ timeout: 30_000 });
    await restart.click();
    const sendStory = page.getByTestId("guided-send-saved-story").or(page.getByRole("button", { name: "Send my story" })).first();
    if (await sendStory.isVisible({ timeout: 15_000 }).catch(() => false)) await sendStory.click();
    await expect(page.getByText("That's everything needed for now").or(page.locator("[data-testid=guided-message][data-from=assistant]").last()).first()).toBeVisible({ timeout: 120_000 });
    await page.waitForTimeout(4_000);
    await dump(id, "after the restart");
    panel = await openReview(page, id);
    const afterRestart = await reviewAmount(page);
    console.log(`review amount after the restart: ${afterRestart}`);
    expect(afterRestart, "2. after the restart the review shows the newest amount").toMatch(/9,?400/);
    expect(afterRestart, "2. never the review's older 9350").not.toMatch(/9,?350/);
    expect(await formAmount(page, id), "2. the form still shows the newest").toMatch(/9,?400/);
  } finally {
    await deleteHarnessUser(userId);
  }
});
