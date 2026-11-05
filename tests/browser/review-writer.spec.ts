/**
 * AN ANSWER GIVEN IN THE REVIEW REACHES THE FACT RECORD UNDER ITS FACT ID, NUMBERED BY THE SERVER; CLEARING IT
 * RECORDS A REMOVAL (case core G2; founder, 4 Nov: "a fact id for every answer", "clearing an answered box always
 * records a removal").
 *
 * Per court (Small Claims, civil, Family), signed in, through the page's own save path:
 *   1. the goal is typed into the review's question box and the box is left, as a person does;
 *   2. the saved row's fact record (caseFile.facts.wants) holds it, answered, with the server's number, and the tab's
 *      buffer of unsent edits no longer holds it (sent and accepted);
 *   3. the box is emptied and left: the fact record says removed (a newer number), and the review's box is empty
 *      after a reload, the question no longer marked answered.
 *
 * WHAT FAILURE THIS CATCHES: a review answer that never reaches the fact record (so the server's order cannot decide
 * it, and an older copy can outrank it), and an emptied review box that saves nothing, so the old answer stays
 * (IntakeReviewPanel.tsx before G2: the box's blur returned on an empty value, in all three courts).
 *
 * STAND-INS, the only ones: fakeAccount (the database rows and the signed-in session; its POST /api/cases/facts runs
 * the route's checks and the one writer, saveFactWrites, on those rows), serveFromThisCommit's model stand-ins and
 * analysis, and the situation answers clicked by the harness ("starting, nothing filed"). No staging, no model.
 */
import { expect, test, type Page } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { openBuilder } from "./harness/builderGate";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { serveFromThisCommit } from "./harness/thisCommitServer";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

type Court = "small-claims" | "civil" | "family";
type Rows = Map<string, Record<string, unknown>>;
const STORY: Record<Court, string> = {
  "small-claims": "Synthetic: a contractor I paid in April 2026 never finished my deck. The plum-yellow receipt is all I have.",
  civil: "Synthetic: a supplier never delivered the machine I ordered in April 2026. The plum-yellow invoice is all I have.",
  family: "Synthetic: we separated in May 2026 and cannot agree on dividing the house. The plum-yellow house is in both names.",
};
const GOAL: Record<Court, { id: string; label: string }> = {
  "small-claims": { id: "sc-remedy-sought", label: "What outcome are you asking the court to order?" },
  civil: { id: "legalRemedy", label: "What would you like the court to order?" },
  family: { id: "goal", label: "What would you like to happen in the end?" },
};

const panelOf = (page: Page) => page.getByTestId("intake-review");
type FactRow = { state?: string; value?: unknown; seq?: number };
const caseFileOfRow = (rows: Rows): { facts?: Record<string, FactRow>; changes?: Record<string, unknown> } => {
  const master = ([...rows.values()][0]?.master_result ?? {}) as { intakeCheckpoint?: { sections?: Record<string, unknown> } };
  return (master.intakeCheckpoint?.sections?.caseFile ?? {}) as { facts?: Record<string, FactRow>; changes?: Record<string, unknown> };
};

async function openReview(page: Page) {
  const panel = panelOf(page);
  await expect(panel).toBeVisible({ timeout: 60_000 });
  if ((await panel.getAttribute("data-phase")) === "collecting") { await expect(page.getByTestId("intake-start-review")).toBeEnabled({ timeout: 60_000 }); await page.getByTestId("intake-start-review").click(); }
  await expect(panel).toHaveAttribute("data-phase", "reviewing", { timeout: 60_000 });
}

async function start(page: Page, court: Court) {
  if (court === "small-claims") {
    await page.goto("/?path=small-claims");
    await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("City or municipality").fill("Kingston");
    await page.getByLabel(STORY_LABEL, { exact: true }).fill(STORY[court]);
    await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 });
    const ack = page.getByTestId("acknowledgement-checkbox");
    await expect(ack.or(page.getByRole("button", { name: "Fill in the form yourself" })).first()).toBeVisible({ timeout: 60_000 });
    if (await ack.isVisible()) { await ack.check(); await page.getByTestId("acknowledgement-continue").click(); }
  } else {
    await openBuilder(page, court, { city: "Kingston", story: STORY[court], situation: STARTING_NOTHING_FILED });
    await page.waitForURL(/\/builder\?.*intake=/, { timeout: 60_000 }).catch(() => {});
  }
  await openReview(page);
}

for (const court of ["small-claims", "civil", "family"] as const) {
  test(`review writer (${court}): a goal given in the review reaches the fact record, numbered by the server; emptied, it is recorded removed`, async ({ page }) => {
    test.setTimeout(300_000);
    await grantSiteAccess(page);
    await autoAnswerSituation(page, STARTING_NOTHING_FILED);
    const account = await fakeAccount(page);
    await serveFromThisCommit(page, court, account.rows);
    await start(page, court);
    const panel = panelOf(page);
    const goal = `Payment of what is owed, writer test (${court})`;
    const goalBox = panel.getByLabel(`Answer: ${GOAL[court].label}`, { exact: true });
    const question = panel.locator(`[data-testid=intake-initial-question][data-question="${GOAL[court].id}"]`);

    // 1-2. Given, and left: the fact record holds it with the server's number; the buffer no longer holds it.
    await goalBox.fill(goal);
    await goalBox.blur();
    await expect(question, "the goal is marked answered in its place").toHaveAttribute("data-answered", "true", { timeout: 30_000 });
    await expect.poll(() => JSON.stringify(caseFileOfRow(account.rows).facts?.wants ?? null), { timeout: 60_000, message: "the fact record holds the goal, answered" }).toContain(goal);
    const given = caseFileOfRow(account.rows).facts!.wants!;
    expect(given.state, "answered").toBe("answered");
    expect(typeof given.seq === "number" && given.seq >= 1, `numbered by the server (seq ${given.seq})`).toBe(true);
    await expect.poll(() => Boolean(caseFileOfRow(account.rows).changes?.wants), { timeout: 30_000, message: "sent and accepted: the tab's buffer no longer holds it" }).toBe(false);

    // 3. Emptied and left: recorded removed, with a newer number; after a reload the box is empty and not answered.
    await goalBox.fill("");
    await goalBox.blur();
    await expect.poll(() => caseFileOfRow(account.rows).facts?.wants?.state ?? "(none)", { timeout: 60_000, message: "the emptied goal is recorded removed" }).toBe("removed");
    expect(caseFileOfRow(account.rows).facts!.wants!.seq!, "the removal has a newer number than the answer").toBeGreaterThan(given.seq!);
    await page.reload();
    await openReview(page);
    await expect(panel.getByLabel(`Answer: ${GOAL[court].label}`, { exact: true }), "after a reload the goal's box is empty").toHaveValue("", { timeout: 30_000 });
    await expect(question, "and the goal is not marked answered").not.toHaveAttribute("data-answered", "true");
  });
}
