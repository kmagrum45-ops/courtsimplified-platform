/**
 * AN ANSWER GIVEN AFTER "I DO NOT KNOW YET" CLEARS THE MARK, IN ALL THREE COURTS (fault 2, 31 Oct;
 * decided to belong to item C, not #536).
 *
 * WHAT IT CHECKS, per court, signed in as a real staging user (the real save path): on the review,
 * the goal question (Small Claims sc-remedy-sought, civil legalRemedy, Family goal) is ticked
 * "I do not know yet" and the tick reaches the saved case. The person then answers that same question
 * the way the page offers it: the answer box if it is still shown, otherwise the quiet line's
 * "Add it" (or its "Change"), then types the answer. After the save and a reload:
 *   (a) the saved case holds the typed answer;
 *   (b) the saved case no longer marks the question "I do not know yet" (builder.initialUnknowns);
 *   (c) the review shows the question answered (data-answered="true"), not ticked and not the quiet line.
 *
 * WHAT FAILURE THIS CATCHES: the latest answer losing to an earlier "I do not know yet" (rule: the latest
 * answer wins), so the case keeps saying "not known" for something the person has answered, and the
 * not-sure rule then hides the question with its answer.
 *
 * STAND-INS: serveModelStandIns (the model routes); the situation answers (autoAnswerSituation /
 * openBuilder, "starting, nothing filed"). Everything else is this build's code and the staging
 * database. The harness user is deleted at the end of each test.
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


async function tickThenAnswer(page: Page, court: Court, userId: string, typed: string) {
  const panel = page.getByTestId("intake-review");
  const label = `Answer: ${GOAL[court].label}`;
  const question = () => panel.locator(`[data-testid=intake-initial-question][data-question="${GOAL[court].id}"]`);
  await expect(question(), "the goal question is on the review").toHaveCount(1, { timeout: 60_000 });
  await question().getByTestId("intake-unknown").check();
  await expect.poll(async () => heldGoal(court, (await savedCheckpoint(userId)).checkpoint).unknown, { timeout: 30_000, message: "the not-known mark reached the saved case" }).toBe(true);

  // Answer it the way the page now offers it.
  const box = question().getByLabel(label, { exact: true });
  if (!(await box.count())) {
    const add = question().getByTestId("not-answered-yet-add");
    const change = question().getByTestId("change-answer-open");
    if (await add.count()) await add.click();
    else if (await change.count()) await change.click();
  }
  const changeText = question().getByTestId("change-answer-text");
  await expect(box.or(changeText), "after the tick, the page still offers a way to answer the question").toHaveCount(1, { timeout: 20_000 });
  const saved = page.waitForResponse((response) => /\/rest\/v1\/cases/.test(response.url()) && ["PATCH", "POST"].includes(response.request().method()), { timeout: 60_000 });
  if (await box.count()) { await box.fill(typed); await box.blur(); }
  else { await changeText.fill(typed); await question().getByTestId("change-answer-save").click(); }
  expect((await saved).ok(), "the save request succeeded").toBe(true);
  await expect.poll(async () => (await savedCheckpoint(userId)).text.includes(typed), { timeout: 30_000, message: "the typed answer reached the saved case before the reload" }).toBe(true);

  await page.reload();
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
  await expect(page.getByTestId("intake-save-status")).toHaveText(/Intake saved to your account\./, { timeout: 60_000 });
  const { text, checkpoint } = await savedCheckpoint(userId);
  const held = heldGoal(court, checkpoint);
  console.log(`[${court}] after reload: saved ${JSON.stringify(held)}; question ${JSON.stringify(await question().count() ? await question().evaluate((node) => ({ answered: node.getAttribute("data-answered"), unknown: node.getAttribute("data-unknown"), text: (node as HTMLElement).innerText })) : null)}`);
  expect.soft(text.includes(typed), "(a) the saved case holds the typed answer").toBe(true);
  expect.soft(held.unknown, "(b) the saved case no longer marks the question \"I do not know yet\"").toBe(false);
  await expect.soft(question(), "(c) the review shows the question answered").toHaveAttribute("data-answered", "true", { timeout: 10_000 });
  await expect.soft(question(), "(c) the review does not show it marked not known").toHaveAttribute("data-unknown", "false", { timeout: 10_000 });
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`review answer clears unknown (${court}): "I do not know yet" ticked, then answered, the answer wins after a reload`, async ({ page }) => {
    test.setTimeout(300_000);
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    const userId = await authenticateRealTestUser(page, { realCases: true });
    try {
      await serveModelStandIns(page, court, userId);
      await start(page, court);
      await tickThenAnswer(page, court, userId, `Return of my deposit, test 31 Oct (${court})`);
    } finally {
      await deleteHarnessUser(userId);
    }
  });
}
