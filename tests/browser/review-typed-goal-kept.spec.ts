/**
 * A GOAL TYPED IN THE REVIEW IS KEPT, IN ALL THREE COURTS (proof for PR #536, 31 Oct).
 *
 * In #536's CI on b504dbdc, story-pack's "retest-27oct root cause 3 ... an answer typed after the tick
 * clears it ..." reported a typed "Payment of what is owed" as "I do not know yet". The explanation
 * given was that the test typed into a different box once the review list was split into two groups
 * (8632416d), and the value was never lost. This spec checks the value itself, not the explanation.
 *
 * WHAT IT CHECKS, per court, signed in as a real staging user (the real save path):
 *   1. the review opens;
 *   2. the box for what the person wants is found by its own question, never by position
 *      (Small Claims "What outcome are you asking the court to order?" sc-remedy-sought; civil
 *      "What would you like the court to order?" legalRemedy; Family "What would you like to happen
 *      in the end?" goal: app/builder/_components/guidedFields.ts, src/lib/case-system/intake/questionBank.ts);
 *   3. a distinctive value is typed and the box left (it saves when left);
 *   4. the save is waited for: the cases PATCH/POST answers, the status says "Intake saved to your
 *      account.", and the saved row on staging holds the value (no fixed sleep);
 *   5. the page reloads;
 *   6. the value is (a) still in that same box, (b) shown on the review, and (c) held in the saved case,
 *      each a separate soft assertion so a run reports all three.
 * (An answer typed after "I do not know yet" was ticked must clear the mark: that is fault 2, tested on
 * the not-sure branch fix/not-sure-never-asked, not here.)
 *
 * WHAT FAILURE THIS CATCHES: a typed goal lost on save or reload, shown as "I do not know yet", or kept
 * in a different place from the box the person typed into.
 *
 * STAND-INS: serveModelStandIns (the model routes: case read/understand, court classification, law
 * assistant, guided turn with no model, claim-type and depth routes refused); the situation answers
 * (autoAnswerSituation / openBuilder, "starting, nothing filed"). Everything else is this build's code and
 * the staging database. The harness user is deleted at the end of each test.
 */
import { expect, test, type Page } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { serveModelStandIns } from "./harness/thisCommitServer";
import { authenticateRealTestUser } from "./harness/intakeDriver";
import { deleteHarnessUser, harnessAdmin } from "./harness/realTestSession";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 60_000 });

type Court = "family" | "civil" | "small-claims";
const STORY: Record<Court, string> = {
  family: "Synthetic: we separated in May 2026 and cannot agree on dividing the house. The plum-yellow house is in both names.",
  civil: "Synthetic: a supplier never delivered the machine I ordered in April 2026. The plum-yellow invoice is all I have.",
  "small-claims": "Synthetic: a contractor I paid in April 2026 never finished my deck. The plum-yellow receipt is all I have.",
};
/** The goal question, by its own words, and the id the review lists it under. */
const GOAL: Record<Court, { id: string; label: string }> = {
  "small-claims": { id: "sc-remedy-sought", label: "What outcome are you asking the court to order?" },
  civil: { id: "legalRemedy", label: "What would you like the court to order?" },
  family: { id: "goal", label: "What would you like to happen in the end?" },
};

async function start(page: Page, court: Court): Promise<void> {
  if (court === "small-claims") {
    await page.goto("/?path=small-claims");
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("City or municipality").fill("Kingston");
    await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY[court]);
    await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
    const ack = page.getByTestId("acknowledgement-checkbox");
    await expect(ack.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
    if (await ack.isVisible()) { await ack.check(); await page.getByTestId("acknowledgement-continue").click(); }
  } else {
    await openBuilder(page, court, { city: "Kingston", story: STORY[court], situation: STARTING_NOTHING_FILED });
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 }).catch(() => {});
  }
  const panel = page.getByTestId("intake-review");
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "collecting") await page.getByTestId("intake-start-review").click();
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
}

/** The saved case's checkpoint, as text, read from staging (refuses production). */
async function savedCheckpoint(userId: string): Promise<{ text: string; checkpoint: Record<string, any> | null }> {
  const { data } = await harnessAdmin().from("cases").select("master_result").eq("user_id", userId);
  const checkpoint = ((data ?? []) as { master_result?: { intakeCheckpoint?: Record<string, any> } }[]).map((row) => row.master_result?.intakeCheckpoint).find(Boolean) ?? null;
  return { text: JSON.stringify(checkpoint), checkpoint };
}

/** What the saved case holds for the goal question: its value and whether it is marked not known. */
function heldGoal(court: Court, checkpoint: Record<string, any> | null): { value: unknown; unknown: boolean } {
  const sections = checkpoint?.sections ?? {};
  const unknowns: string[] = Array.isArray(sections.builder?.initialUnknowns) ? sections.builder.initialUnknowns : [];
  const value = court === "small-claims" ? sections.builder?.initialAnswers?.[GOAL[court].id] : court === "civil" ? sections.civil?.input?.legalRemedy : sections.family?.goal;
  return { value, unknown: unknowns.includes(GOAL[court].id) };
}

/** Every typing box in the review, in page order, by its label (for the record of which box is first). */
const boxLabels = (page: Page) => page.getByTestId("intake-review").locator('input[aria-label^="Answer: "]').evaluateAll((inputs) => inputs.map((input) => input.getAttribute("aria-label")));

async function typeSaveReload(page: Page, court: Court, userId: string, typed: string, markUnknownFirst: boolean) {
  const panel = page.getByTestId("intake-review");
  const label = `Answer: ${GOAL[court].label}`;
  console.log(`[${court}] review boxes before typing, in order: ${JSON.stringify(await boxLabels(page))}`);
  const box = panel.getByLabel(label, { exact: true });
  await expect(box, `the goal box "${label}" is on the review`).toHaveCount(1, { timeout: 60_000 });
  if (markUnknownFirst) {
    const question = panel.locator(`[data-testid=intake-initial-question][data-question="${GOAL[court].id}"]`);
    await question.getByTestId("intake-unknown").check();
    await expect(question).toHaveAttribute("data-unknown", "true", { timeout: 20_000 });
    await expect.poll(async () => heldGoal(court, (await savedCheckpoint(userId)).checkpoint).unknown, { timeout: 30_000, message: "the not-known mark reached the saved case" }).toBe(true);
    console.log(`[${court}] after the not-known tick, the first box is: ${JSON.stringify((await boxLabels(page))[0])}`);
  }
  await box.fill(typed);
  const saved = page.waitForResponse((response) => /\/rest\/v1\/cases/.test(response.url()) && ["PATCH", "POST"].includes(response.request().method()), { timeout: 60_000 });
  await box.blur();
  const response = await saved;
  expect(response.ok(), "the save request succeeded").toBe(true);
  await expect(page.getByTestId("intake-save-status"), "the page says it saved").toHaveText(/Intake saved to your account\./, { timeout: 60_000 });
  await expect.poll(async () => (await savedCheckpoint(userId)).text.includes(typed), { timeout: 30_000, message: "the typed value reached the saved case before the reload" }).toBe(true);
  console.log(`[${court}] saved before reload: ${JSON.stringify(heldGoal(court, (await savedCheckpoint(userId)).checkpoint))}`);

  await page.reload();
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
  await expect(page.getByTestId("intake-save-status")).toHaveText(/Intake saved to your account\./, { timeout: 60_000 });
  const afterBox = panel.getByLabel(label, { exact: true });
  const shownQuestion = panel.locator(`[data-testid=intake-initial-question][data-question="${GOAL[court].id}"]`);
  console.log(`[${court}] after reload: goal box count ${await afterBox.count()}, value ${JSON.stringify(await afterBox.count() ? await afterBox.inputValue() : null)}; question ${JSON.stringify(await shownQuestion.count() ? await shownQuestion.evaluate((node) => ({ answered: node.getAttribute("data-answered"), unknown: node.getAttribute("data-unknown"), text: (node as HTMLElement).innerText })) : null)}`);
  const held = heldGoal(court, (await savedCheckpoint(userId)).checkpoint);
  console.log(`[${court}] saved after reload: ${JSON.stringify(held)}`);

  // (a) the same box, by its label, still holds what was typed
  expect.soft(await afterBox.count() ? await afterBox.inputValue() : "(no such box after the reload)", "(a) the typed value is still in the same box").toBe(typed);
  // (b) shown on the review
  await expect.soft(panel, "(b) the typed value is shown on the review").toContainText(typed, { timeout: 10_000 });
  // (c) held in the saved case, as that question's answer, and not marked "I do not know yet"
  expect.soft(held.value, "(c) the saved case holds the typed value for the goal question").toBe(typed);
  expect.soft(held.unknown, "(c) the saved case does not mark the goal question \"I do not know yet\"").toBe(false);
  if (await shownQuestion.count()) await expect.soft(shownQuestion.getByTestId("intake-unknown"), "the review does not show the goal question ticked \"I do not know yet\"").not.toBeChecked();
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`review typed goal (${court}): typed in the goal box, saved, reloaded, it is still there`, async ({ page }) => {
    test.setTimeout(300_000);
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await serveModelStandIns(page, court, userId);
      await start(page, court);
      await typeSaveReload(page, court, userId, `Payment of what is owed, test 31 Oct (${court})`, false);
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
