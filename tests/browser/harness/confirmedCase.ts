/**
 * A confirmed case in a court, made through the real builder and save path (a real local or staging account), for the
 * notice specs (notice-before-work, notice-on-case-pages). The person fills the form or the chat, opens the review,
 * answers the kind and "filed" when asked, records the initial unknowns and confirms. Returns the case id.
 */
import { expect, type Page } from "@playwright/test";
import { openBuilder } from "./builderGate";
import { recordInitialUnknowns, saveCaseStory, tickIfAsked } from "./intakeReview";

export const CONFIRMED_CASE_STORY = "Synthetic: I paid a contractor $5,000 in March 2026 to repair my roof and the work was never done.";
const STORY = CONFIRMED_CASE_STORY;

export async function confirmedCase(page: Page, court: "small-claims" | "civil" | "family"): Promise<string> {
  if (court === "small-claims") {
    await openBuilder(page, court, { city: "Ottawa" });
    await page.getByRole("button", { name: "Fill in the form yourself" }).click();
    await page.getByLabel("Case story", { exact: true }).fill(STORY);
    await saveCaseStory(page);
    await page.getByTestId("sc-intake-amountClaimed").fill("$5,000");
    await page.getByTestId("sc-intake-amountClaimed").blur();
  } else {
    await openBuilder(page, court, { city: "Ottawa", story: STORY });
    await page.getByTestId("guided-form-show-form").click();
  }
  await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
  const caseId = new URL(page.url()).searchParams.get("intake") ?? "";
  const panel = page.getByTestId("intake-review");
  if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  const kind = page.locator('[data-question="sc-orient-dispute-category"]').getByRole("button").first();
  if (await kind.count()) await kind.click();
  const filed = page.locator('[data-question="sc-claim-filed"]');
  if (await filed.count()) await filed.getByRole("button", { name: "No", exact: true }).click();
  await recordInitialUnknowns(page);
  await tickIfAsked(page);
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
  await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
  return caseId;
}
