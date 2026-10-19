/**
 * ONE RECORD OF WHICH STORY EACH ANSWER WAS BASED ON (storyBasis.ts), CIVIL AND FAMILY.
 *
 * PR #463 round 5 re-test: after the story changed, civil and family showed no
 * block and no message, kept the old answers as "Got it", pre-filled the review
 * with the old story's facts, and family still showed "Parenting time / access"
 * and "one child, age 6" for a story about spousal support with no children.
 *
 * Each case records answers, confirms, changes the story in the review, and
 * requires: the review panel does not pre-fill the old answers and cannot
 * confirm; every route (questions, form, review) is blocked with the message
 * beside its button; "Go to the questions" scrolls to them; and after "Start
 * the questions again" nothing from the old version appears on the page or in
 * the tab's storage.
 */
import { expect, test, type Page } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { confirmInitialInformation } from "./harness/intakeReview";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

const CASES = {
  family: {
    old: "Synthetic old story: my former partner and I separated and disagree about parenting time for our daughter.",
    fresh: "Synthetic new story: we were married for 12 years and I am asking for spousal support. We have no children.",
    answer: async (page: Page) => {
      await page.getByTestId("family-issue-parenting-time").click();
      await page.getByLabel("Children / parenting details").fill("Synthetic: one child, age 6.");
    },
    oldText: ["one child, age 6", "Parenting time / access"],
    oldStored: ["one child, age 6", "parenting-time"],
  },
  civil: {
    old: "Synthetic old story: I hired Test Builder Ltd. to build an addition for $180,000 and they abandoned the job.",
    fresh: "Synthetic new story: my neighbour's tree fell on my garage during a storm and their insurer refused to pay.",
    answer: async (page: Page) => {
      await page.getByLabel("Amount claimed or disputed").fill("$180,000");
      await page.getByLabel("What do you want ordered?").fill("Synthetic: an order that Test Builder Ltd. finish the addition.");
    },
    oldText: ["$180,000", "finish the addition"],
    oldStored: ["180,000", "finish the addition"],
  },
} as const;

for (const court of ["family", "civil"] as const) {
  const story = CASES[court];
  test(`${court}: a changed story sets aside every answer based on the old one, on every route`, async ({ page }) => {
    test.setTimeout(240_000);
    await openBuilder(page, court, { story: story.old });
    await page.getByTestId("guided-form-show-form").click();
    await story.answer(page);
    await confirmInitialInformation(page);

    // The story changes in the review.
    const panel = page.getByTestId("intake-review");
    await page.getByTestId("intake-view-review").click();
    await panel.getByRole("textbox", { name: "Review: Your story", exact: true }).fill(story.fresh);
    await expect(panel).toHaveAttribute("data-phase", "reviewing");

    // The review: old answers are not pre-filled; they are marked; Confirm is blocked.
    await expect(page.getByTestId("intake-answer-stale").first()).toBeVisible();
    for (const text of story.oldText) await expect(panel, `the review does not show "${text}"`).not.toContainText(text);
    await expect(page.getByTestId("intake-confirm-needs")).toContainText("earlier version of your story");
    await expect(page.getByTestId("intake-confirm")).toBeDisabled();
    await expect(panel.getByTestId("story-changed-beside-button")).toContainText("Start the questions again from your story first");
    await expect(page.getByTestId("intake-continue-guidance"), "no next step from the review").toHaveCount(0);

    // The form: no old values, its own Continue disabled with the message beside it.
    await expect(page.getByTestId(`${court}-intake-story-changed`)).toBeVisible();
    await expect(page.getByTestId(`${court}-intake-continue`)).toBeDisabled();
    const shown = await page.locator("body").innerText();
    for (const text of story.oldText) expect(shown, `nothing on the page shows "${text}"`).not.toContain(text);
    expect(shown).not.toContain(story.old);

    // "Go to the questions" opens and scrolls to them.
    await panel.getByTestId("story-changed-beside-button").getByRole("button", { name: "Go to the questions" }).click();
    const questions = page.getByTestId("questions-story-changed");
    await expect(questions).toBeInViewport({ timeout: 10_000 });

    // Starting again removes the old answers everywhere.
    await questions.getByRole("button", { name: "Start the questions again from my story" }).click();
    await expect(page.getByTestId("questions-story-changed")).toHaveCount(0);
    await expect(page.getByTestId("intake-answer-stale")).toHaveCount(0);
    const stored = await page.evaluate(() => sessionStorage.getItem("courtSimplifiedGuestIntakeSession") ?? "");
    for (const text of story.oldStored) expect(stored, `the tab no longer holds "${text}"`).not.toContain(text);
    const after = await page.locator("body").innerText();
    for (const text of story.oldText) expect(after, `"${text}" does not come back`).not.toContain(text);
  });
}
