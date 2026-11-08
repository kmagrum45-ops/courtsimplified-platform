/**
 * The deck-builder case Chrome used on #544 (Small Claims, Kingston), as shared steps: start it from the home page, answer
 * the chat as Chrome did, open the review and confirm. Copied from chrome-544-6nov.spec.ts (a test file cannot be
 * imported by another without running its tests), unchanged.
 */
import { expect, type Page } from "@playwright/test";
import { recordInitialUnknowns } from "./intakeReview";
import { STORY_LABEL } from "../../../src/lib/case-system/copy/storyGuidance";
import { asksForDate } from "../../../src/lib/case-system/dates";

export const DECK_STORY = "I hired a deck builder in March 2026 to build a deck at my home. They never finished it and kept the money I paid. My neighbour remembers their teal-orange van.";
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
    if (await proposals.isVisible().catch(() => false)) { await proposals.getByTestId("story-proposals-continue").click(); await expect(proposals.getByTestId("working-note")).toHaveCount(0, { timeout: 120_000 }); continue; }
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
