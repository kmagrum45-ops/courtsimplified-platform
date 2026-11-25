/**
 * A DATE THE SITE WORKED OUT FROM THE STORY NEVER REPLACES AN ANSWER THE PERSON GAVE, AND IS NEVER SHOWN AS ONE
 * (Chrome check of production c38e69fd, 8 Nov 2026, B2).
 *
 * Chrome, Small Claims: "When it happened: March 2026" was the person's answer; the next step's "Work out your dates"
 * kept "June 1, 2026" from the story (the repayment date) for "On what day did the thing your claim is about happen", and
 * "When it happened" then said June 1, 2026, the review "2026-06-01 (as you changed it)", though nothing was changed.
 * Civil: "When it happened: March 1, 2026" for a loan made in June 2025. Cause found here: the step page keeps a date the
 * story reading found by itself, so its deadline is counted at once (StageAnswerPanel), and that save was recorded as the
 * person's newest answer to "When it happened" (factSave.ts positionFactWrites, force) and read as one (caseFile.ts).
 *
 * What it checks, in all three courts, with the real save path (a real local or staging account; realTestSession.ts
 * refuses production) and the model stand-ins: a confirmed case and its next step; the story reading's date for the step
 * (master_result.casePicture, as the case reader saves it in production) set on the case; then the case page and review:
 *   1. "When it happened" is the person's own answer (Small Claims: "March 2026"), never the date kept from the story;
 *   2. no line of the review says "(as you changed it)": the person changed nothing;
 *   3. the deadline is still counted from the date kept from the story (Small Claims June 1, 2028; Civil March 1, 2028):
 *      which date a deadline counts from is not changed here.
 * Family's starting step asks no date to count from; the review check (2) runs there too.
 *
 * WHAT FAILURE THIS CATCHES: a date the site worked out shown as, or replacing, the person's answer.
 */
import { expect, test, type Page } from "@playwright/test";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser, harnessAdmin } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { recordInitialUnknowns, tickIfAsked } from "./harness/intakeReview";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

const CASES = {
  "small-claims": { story: "Synthetic: In March 2026 I lent my friend Alex Testwood $4,500 for a car repair. He promised in a text message to pay me back by June 1, 2026. He has not paid anything back.", read: { month: 6, day: 1, date: "2026-06-01", quote: "He promised in a text message to pay me back by June 1, 2026." }, kept: /June 1, 2026/, deadline: "June 1, 2028" },
  civil: { story: "Synthetic: In June 2025 I lent my former business partner, Dana Testwood, $85,000 by e-transfer to buy equipment. She signed a one-page note promising to repay it by March 1, 2026. She has paid nothing.", read: { month: 3, day: 1, date: "2026-03-01", quote: "promising to repay it by March 1, 2026" }, kept: /March 1, 2026/, deadline: "March 1, 2028" },
  family: { story: "Synthetic: Jordan Testfield and I lived together from 2018 to August 2025 but never married. Our daughter is 6 and lives with me. I want a regular parenting-time schedule.", read: null, kept: null, deadline: null },
} as const;

/** Small Claims, questions one at a time: the story sent, then the review, where "When it happened" is answered. */
async function smallClaimsCase(page: Page, story: string) {
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Kingston");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(story);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
  const notice = page.getByTestId("acknowledgement-checkbox");
  if (await notice.waitFor({ state: "visible", timeout: 20_000 }).then(() => true, () => false)) { await notice.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await page.getByRole("button", { name: /Answer questions one at a time/ }).click();
  const send = page.getByTestId("guided-send-saved-story");
  if (await send.isVisible({ timeout: 5_000 }).catch(() => false)) await send.click();
  await expect(page.locator("[data-testid=guided-message][data-from=assistant]").last().or(page.getByTestId("story-proposals")).first()).toBeVisible({ timeout: 60_000 });
}

async function readyToConfirm(page: Page, court: string) {
  const panel = page.getByTestId("intake-review");
  if (await panel.getAttribute("data-phase") === "collecting") await page.getByTestId("intake-start-review").filter({ visible: true }).first().click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing");
  if (court === "small-claims") {
    // The person's own answer to "When it happened", in the review's question.
    const question = page.locator('[data-question="sc-orient-when-happened"]');
    await expect(question, "the review asks when it happened").toBeVisible({ timeout: 30_000 });
    const box = question.locator('input[type="text"], input:not([type]), textarea').first();
    await box.fill("March 2026");
    await box.blur();
    const save = question.getByTestId("intake-field-save");
    if (await save.isVisible().catch(() => false)) await save.click();
    const kind = page.locator('[data-question="sc-orient-dispute-category"]').getByRole("button").first();
    if (await kind.count()) await kind.click();
  }
  await recordInitialUnknowns(page);
  await tickIfAsked(page);
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`a date worked out from the story never replaces the person's answer or shows as changed -- ${court}`, async ({ page }) => {
    test.setTimeout(600_000);
    const { story, read, kept, deadline } = CASES[court];
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await autoAnswerSituation(page, STARTING_NOTHING_FILED);
      await serveModelStandIns(page, court, userId);
      if (court === "small-claims") await smallClaimsCase(page, story);
      else {
        await openBuilder(page, court, { city: "Ottawa", story });
        await page.getByTestId("guided-form-show-form").click();
      }
      await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
      const id = new URL(page.url()).searchParams.get("intake") ?? "";
      await readyToConfirm(page, court);
      await page.getByTestId("intake-confirm").click();
      await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "user-confirmed", { timeout: 90_000 });
      await page.getByTestId("intake-continue-guidance").click();
      await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 240_000 });
      await expect(page.getByTestId("intake-save-status")).toContainText(/saved/i, { timeout: 60_000 });
      await page.waitForTimeout(3_000);
      // The story reading's date for the step, as the case reader saves it in production (the stand-ins read none).
      if (read) {
        const admin = harnessAdmin();
        const row = await admin.from("cases").select("master_result").eq("id", id).single();
        const master = (row.data?.master_result ?? {}) as Record<string, unknown>;
        await admin.from("cases").update({ master_result: { ...master, casePicture: { side: null, events: [], dates: [{ questionId: "case-date-act-or-omission", ...read }] } } }).eq("id", id);
      }
      await page.goto(`/cases/${id}`);
      await expect(page.getByTestId("stage-answer-panel")).toBeVisible({ timeout: 90_000 });
      await page.waitForTimeout(6_000);
      await page.reload();
      await expect(page.getByTestId("stage-answer-panel")).toBeVisible({ timeout: 90_000 });
      await page.waitForTimeout(3_000);

      // 3. The deadline still counts from the date kept from the story.
      if (deadline) await expect(page.getByTestId("case-file-deadline").first(), "3. the deadline no longer counts from the date kept from the story").toContainText(deadline, { timeout: 30_000 });
      // 1. "When it happened" is the person's answer, never the date kept from the story.
      const when = page.locator('[data-testid="case-file-line"][data-fact="whenHappened"]');
      if (court === "small-claims") await expect(when, "1. \"When it happened\" is not the person's answer").toContainText("March 2026", { timeout: 30_000 });
      if (kept && await when.count()) await expect(when, "1. \"When it happened\" shows the date kept from the story").not.toContainText(kept);

      // 2. Nothing in the review says "(as you changed it)".
      await page.goto(`/builder?path=${court}&intake=${id}&step=${court === "small-claims" ? "guided" : "form"}`);
      await page.getByTestId("intake-view-review").click({ timeout: 60_000 });
      await expect(page.getByTestId("intake-review"), "2. the review says an answer was changed").not.toContainText("as you changed it", { timeout: 15_000 });
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
