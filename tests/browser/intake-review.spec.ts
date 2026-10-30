import { recordInitialUnknowns, saveCaseStory } from "./harness/intakeReview";
import { expect, test } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { answerSituation, autoAnswerSituation } from "./harness/situation";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });
const STORY = "Synthetic initial case information: I need help organizing this matter and the relevant dates.";
const CORRECTION = "Synthetic corrected initial facts: the earlier description omitted an important event.";

test("Small Claims guided route: review edits update the existing unsent story", async ({ page }) => {
  test.setTimeout(180_000);
  await fakeAccount(page);
  await openBuilder(page, "small-claims");
  await page.getByRole("button", { name: "Answer questions one at a time with AI help" }).click();
  const story = page.getByRole("textbox", { name: STORY_LABEL, exact: true });
  await story.fill(STORY);
  await saveCaseStory(page);
  await page.getByTestId("intake-start-review").click();
  const panel = page.getByTestId("intake-review");
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  await panel.getByRole("textbox", { name: "Review: Your story", exact: true }).fill(CORRECTION);
  // The story changes on "Save story", not as it is typed (#470 re-test).
  await page.getByTestId("intake-review").getByTestId("review-story-save").click();
  await expect(story).toHaveValue(CORRECTION);
  await recordInitialUnknowns(page);
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  // Wait for the save to land: a reload mid-save correctly stays "reviewing" (CI race, 2026-10-18).
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
  await page.reload();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
  // After a reload the saved story is shown as text; "Edit my story" opens it in the box (2026-10-18).
  await expect(page.getByTestId("guided-saved-story")).toContainText(CORRECTION);
  await page.getByRole("button", { name: "Edit my story" }).click();
  await expect(story).toHaveValue(CORRECTION);
  await story.fill(`${CORRECTION} Further change.`);
  await saveCaseStory(page);
  await expect(panel).toHaveAttribute("data-phase", "collecting");
});

for (const court of ["small-claims", "family", "civil"] as const) {
  test(`${court}: review is editable and durable; only explicit confirmation completes intake`, async ({ page }) => {
    test.setTimeout(240_000);
    const account = await fakeAccount(page);
    await openBuilder(page, court, { story: court === "small-claims" ? undefined : STORY });
    if (court === "small-claims") {
      await page.getByRole("button", { name: "Fill in the form yourself" }).click();
      await page.getByLabel("Case story", { exact: true }).fill(STORY);
      await saveCaseStory(page);
    } else await page.getByTestId("guided-form-show-form").click();
    const panel = page.getByTestId("intake-review");
    await expect(panel).toHaveAttribute("data-phase", "collecting");
    await expect(page.getByTestId("intake-start-review")).toBeEnabled();
    await expect.poll(() => account.rows.size).toBe(1);
    // Wait for the intake's saves to settle before changing the saved case directly:
    // a save still in flight (Small Claims re-reads story values just after "Save
    // story") would write its own copy over the changes below.
    let lastWrites = -1;
    await expect.poll(async () => {
      const now = account.writes();
      const settled = now === lastWrites;
      lastWrites = now;
      return settled;
    }, { intervals: [1_500], timeout: 30_000 }).toBe(true);
    const row = [...account.rows.values()][0];
    const master = () => row.master_result as Record<string, unknown>;
    expect((master().workflowStatus as Record<string, unknown>).intakeCompleted).toBe(false);
    master().masterCase = { id: row.id, unrelated: "preserved" };
    master().caseSystemAssembly = { unrelated: "preserved" };
    master().evidence = { reference: "synthetic-owned-evidence" };
    master().documents = { reference: "synthetic-owned-document" };
    (master().workflowStatus as Record<string, unknown>).formsReviewed = true;
    await page.getByTestId("intake-start-review").click();
    await expect(panel).toHaveAttribute("data-phase", "reviewing");
    await expect(page.getByTestId("intake-confirm")).toBeDisabled();
    await page.reload();
    await expect(panel).toHaveAttribute("data-phase", "reviewing");
    const reviewStory = panel.getByRole("textbox", { name: /^Review: (Your story|Facts)$/ });
    await reviewStory.fill(CORRECTION);
    // The story changes on "Save story", not as it is typed (#470 re-test).
    await page.getByTestId("intake-review").getByTestId("review-story-save").click();
    await expect(panel).toHaveAttribute("data-phase", "reviewing");
    await recordInitialUnknowns(page);
    await page.getByTestId("intake-review-acknowledgement").check();
    await page.getByTestId("intake-confirm").click();
    await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
    const confirmed = master().workflowStatus as Record<string, unknown>;
    expect(confirmed.intakeCompleted).toBe(true);
    expect(confirmed.formsReviewed).toBe(true);
    expect((confirmed.intakeReview as Record<string, unknown>).confirmedRevision).toBe((master().intakeCheckpoint as Record<string, unknown>).inputRevision);
    expect(master().masterCase).toEqual({ id: row.id, unrelated: "preserved" });
    expect(master().caseSystemAssembly).toEqual({ unrelated: "preserved" });
    expect(master().evidence).toEqual({ reference: "synthetic-owned-evidence" });
    expect(master().documents).toEqual({ reference: "synthetic-owned-document" });
    await page.reload();
    await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
    if (court !== "small-claims") await page.getByRole("button", { name: "Edit case story", exact: true }).click();
    const originalForm = page.getByLabel("Case story", { exact: true });
    await expect(originalForm).toHaveValue(CORRECTION);
    await originalForm.fill(`${CORRECTION} Further material change.`);
    await saveCaseStory(page);
    await expect(panel).toHaveAttribute("data-phase", "collecting");
    await expect.poll(() => (master().workflowStatus as Record<string, unknown>).intakeCompleted).toBe(false);
  });

  test(`${court}: failed confirmation never claims success; legacy completion is not new confirmation`, async ({ page }) => {
    test.setTimeout(240_000);
    const account = await fakeAccount(page);
    await openBuilder(page, court, { story: court === "small-claims" ? undefined : STORY });
    if (court === "small-claims") {
      await page.getByRole("button", { name: "Fill in the form yourself" }).click();
      await page.getByLabel("Case story", { exact: true }).fill(STORY);
      await saveCaseStory(page);
    }
    const panel = page.getByTestId("intake-review");
    await page.getByTestId("intake-start-review").click();
    await expect(panel).toHaveAttribute("data-phase", "reviewing");
    await recordInitialUnknowns(page);
    const row = [...account.rows.values()][0];
    const master = () => row.master_result as Record<string, unknown>;
    const count = await page.getByTestId("intake-unknown").count();
    await expect.poll(() => (((master().intakeCheckpoint as { sections: { builder?: { initialUnknowns?: string[] } } }).sections.builder?.initialUnknowns) ?? []).length).toBe(count);
    account.fail(true);
    await page.getByTestId("intake-review-acknowledgement").check();
    await page.getByTestId("intake-confirm").click();
    await expect(panel.getByRole("alert")).toContainText("not saved");
    expect((master().workflowStatus as Record<string, unknown>).intakeCompleted).toBe(false);
    await page.reload();
    await expect(panel).toHaveAttribute("data-phase", "reviewing");
    account.fail(false);
    await recordInitialUnknowns(page);
    await page.getByTestId("intake-review-acknowledgement").check();
    await page.getByTestId("intake-confirm").click();
    await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
    master().workflowStatus = { intakeCompleted: true, formsReviewed: true };
    master().lifecycleStage = "intake-completed";
    await page.evaluate(() => sessionStorage.clear());
    await page.goto(`/builder?path=${court}&caseId=${row.id}`);
    await expect(panel).toContainText("There is no recorded confirmation under the new review process");
    await expect(panel).toHaveAttribute("data-phase", "collecting");
    expect((master().workflowStatus as Record<string, unknown>).intakeCompleted).toBe(true);
    expect((master().workflowStatus as Record<string, unknown>).intakeReview).toBeUndefined();
  });
  test(`${court}: guest review and confirmation recover only in this tab's exact flow`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.route("**/api/**", route => route.fulfill({ status: 503, json: { ok: false } }));
    await openBuilder(page, court, { story: court === "small-claims" ? undefined : STORY });
    if (court === "small-claims") {
      await page.getByRole("button", { name: "Fill in the form yourself" }).click();
      await page.getByLabel("Case story", { exact: true }).fill(STORY);
      await saveCaseStory(page);
    }
    const panel = page.getByTestId("intake-review");
    // Each transition must land before the reload that tests its recovery (CI race, 2026-10-18).
    await page.getByTestId("intake-start-review").click();
    await expect(panel).toHaveAttribute("data-phase", "reviewing");
    await page.reload();
    await expect(panel).toHaveAttribute("data-phase", "reviewing");
    await recordInitialUnknowns(page);
    await page.getByTestId("intake-review-acknowledgement").check();
    await page.getByTestId("intake-confirm").click();
    await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
    await page.reload();
    await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
    expect(await page.evaluate(() => Object.keys(localStorage).filter(key => /intake|draft/i.test(key)))).toEqual([]);
    // This test answers the new case's situation questions itself, after seeing them.
    await autoAnswerSituation(page, false);
    await page.goto(`/builder?path=${court}`);
    // A fresh start first asks before discarding the unsaved case (2026-10-18).
    await page.getByTestId("unsaved-case-discard").click();
    // The new case starts at the situation questions (step 2), with nothing from the old one.
    await expect(page.getByTestId("situation-questions")).toHaveAttribute("data-question", "where");
    await answerSituation(page);
    await expect(panel).toHaveAttribute("data-phase", "collecting");
    await expect(page.getByTestId("intake-start-review")).toBeDisabled();
  });

  test(`${court}: a stale reviewing tab cannot confirm another tab's newer facts`, async ({ page }) => {
    test.setTimeout(180_000);
    const account = await fakeAccount(page);
    await openBuilder(page, court, { story: court === "small-claims" ? undefined : STORY });
    if (court === "small-claims") {
      await page.getByRole("button", { name: "Fill in the form yourself" }).click();
      await page.getByLabel("Case story", { exact: true }).fill(STORY);
      await saveCaseStory(page);
    }
    await page.getByTestId("intake-start-review").click();
    await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
    const row = [...account.rows.values()][0];
    await recordInitialUnknowns(page);
    const unknownCount = await page.getByTestId("intake-unknown").count();
    await expect.poll(() => ((row.master_result as { intakeCheckpoint: { sections: { builder: { initialUnknowns?: string[] } } } }).intakeCheckpoint.sections.builder.initialUnknowns ?? []).length).toBe(unknownCount);
    const master = row.master_result as Record<string, unknown>;
    const checkpoint = master.intakeCheckpoint as Record<string, unknown>;
    checkpoint.revision = checkpoint.inputRevision = "99999999-9999-4999-8999-999999999999";
    master.workflowStatus = { intakeCompleted: false, intakeReview: { version: 1 } };
    const callsBeforeConfirmation = account.calls();
    await page.getByTestId("intake-review-acknowledgement").check();
    await page.getByTestId("intake-confirm").click();
    await expect(page.getByTestId("intake-review").getByRole("alert")).toContainText("not saved");
    expect((master.workflowStatus as Record<string, unknown>).intakeCompleted).toBe(false);
    expect(checkpoint.revision).toBe("99999999-9999-4999-8999-999999999999");
    expect(account.calls()).toBe(callsBeforeConfirmation);
  });
}

test("Not sure which one: completed questionnaire reaches its existing path chooser", async ({ page }) => {
  test.setTimeout(180_000);
  await grantSiteAccess(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Not sure which one/ }).click();
  await page.getByLabel("Guide province or territory").selectOption("Ontario");
  await page.getByLabel("Guide city or municipality").fill("Ottawa");
  await page.getByLabel("Guide what happened").fill(STORY);
  await page.getByLabel("Guide relationship").fill("two people");
  await page.getByLabel("Guide remedy").fill("money back");
  await page.getByLabel("Guide amount").fill("500");
  await expect(page.getByRole("button", { name: "Choose Civil", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Review possible court paths" }).click();
  await expect(page.locator("#finder-errors")).toContainText("Has a case already started?");
  await expect(page.getByLabel("Guide what happened")).toHaveValue(STORY);
  await page.getByLabel("Guide case started").selectOption("not-sure");
  await page.getByRole("button", { name: "Review possible court paths" }).click();
  await expect(page.getByRole("button", { name: "Choose Civil", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Choose Civil", exact: true }).click();
  await expect(page).toHaveURL(/\/builder\?path=civil/);
});
