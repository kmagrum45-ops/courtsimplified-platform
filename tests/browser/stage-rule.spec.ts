/**
 * GATE A3: THE STAGE OF A CASE ALREADY GOING IS ASKED ONCE AND REMEMBERED.
 *
 * For a case already going (either side, all three areas):
 *   - the situation questions ask what has happened so far, once, offering the stage
 *     map's own steps for that court in their plain words (each option a real step,
 *     labelled with the step's own question);
 *   - the answer is kept with the situation answers and shown in the top line;
 *   - it is never asked again: the results and case pages do not ask the stage, and no
 *     other question asks it (the ask-once recorder);
 *   - the step the next-step panel uses is the one chosen (no suggestion contradicts it).
 *
 * Failure it exists to catch: walkthrough case 6b, where "a case already going" never
 * asked the stage, the top line showed none, and the site suggested filing a Defence the
 * person had already filed.
 */
import { expect, test, type Page } from "@playwright/test";
import { confirmInitialInformation, saveCaseStory } from "./harness/intakeReview";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { serveFromThisCommit, type Court } from "./harness/thisCommitServer";
import { autoAnswerSituation } from "./harness/situation";
import { factsAskedTwice, recordAsks } from "./harness/askOnce";
import { findStage } from "../../src/lib/case-system/stage-map/stageMap";

test.use({ trace: "retain-on-failure", actionTimeout: 20_000, navigationTimeout: 120_000 });

const STORY: Record<Court, string> = {
  "small-claims": "Synthetic story: I sued Test Roofing Ltd. for $9,000 in August 2026. They filed a Defence and now there is a settlement conference.",
  civil: "Synthetic story: I sued Test Motors Ltd. for $90,000 in September 2026 over a defective truck. They delivered a statement of defence.",
  family: "Synthetic story: our family case started in May 2026. We have a case conference scheduled and I have filed my financial statement.",
};

async function toResults(page: Page, court: Court) {
  if (court === "small-claims") {
    await page.getByRole("button", { name: "Fill in the form yourself" }).click();
    await page.getByLabel("Case story", { exact: true }).fill(STORY[court]);
    await saveCaseStory(page);
  } else await page.getByTestId("guided-form-show-form").click();
  await confirmInitialInformation(page);
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 90_000 });
}

for (const court of ["small-claims", "civil", "family"] as const) {
  for (const started of ["me", "them"] as const) {
    test(`${court}, a case already going that ${started === "me" ? "I started" : "I am responding to"}: the stage is asked once, kept, shown, and never contradicted`, async ({ page }) => {
      test.setTimeout(240_000);
      await grantSiteAccess(page);
      const asked = await recordAsks(page);
      await autoAnswerSituation(page, false);
      const account = await fakeAccount(page);
      await serveFromThisCommit(page, court, account.rows as unknown as Map<string, Record<string, unknown>>);
      // When the page has its new case: the answer to the request that creates it has reached the page.
      let caseCreatedForPage = false;
      page.on("response", (response) => { if (response.request().method() === "POST" && /\/rest\/v1\/cases(\?|$)/.test(response.url())) caseCreatedForPage = true; });
      await page.goto(`/builder?path=${court}`);
      const notice = page.getByTestId("acknowledgement-checkbox");
      const gate = page.getByTestId("situation-questions");
      await expect(notice.or(gate).first()).toBeVisible({ timeout: 60_000 });
      if (await notice.isVisible()) { await notice.check(); await page.getByTestId("acknowledgement-continue").click(); }
      // Owner, 28 Oct: at real speed the first answers can be given while the new case is still being
      // created. Recorded here: whether the page had its new case yet, and what it said meanwhile.
      const caseExistedAtFirstAnswer = caseCreatedForPage;
      const shownWhileCreating = (await page.locator("body").innerText()).match(/Saving intake…|Answers will be saved to your account as you type.|Opening your intake…|Intake saved to your account./)?.[0] ?? "(no saving notice)";
      await gate.locator('[data-testid="situation-option"][data-value="going"]').click();
      await gate.locator(`[data-testid="situation-option"][data-value="${started}"]`).click();
      // A responding person names the papers and the day first, if asked.
      if ((await gate.isVisible()) && (await gate.getAttribute("data-question")) === "papers") await gate.locator('[data-testid="situation-option"][data-value="not-sure"]').click();
      if ((await gate.isVisible()) && (await gate.getAttribute("data-question")) === "received") await gate.getByTestId("situation-date-unknown").click();

      // 1. The stage is asked, in the stage map's own words.
      await expect(gate, "the situation questions ask what has happened so far").toHaveAttribute("data-question", "stage");
      const options = gate.locator('[data-testid="situation-option"]');
      expect(await options.count(), "the stage map's steps are offered").toBeGreaterThan(1);
      for (const option of await options.all()) {
        const value = (await option.getAttribute("data-value")) ?? "";
        if (value === "not-sure") continue;
        const step = findStage(value);
        expect(step, `"${value}" is a step in the stage map`).toBeTruthy();
        expect(await option.innerText(), `"${value}" is offered in the stage map's own words`).toContain(step!.userQuestion);
      }
      const chosen = options.first();
      const chosenStep = (await chosen.getAttribute("data-value")) ?? "";
      const chosenWords = findStage(chosenStep)!.userQuestion;
      await chosen.click();
      // Answers given before the page has its new case: the page says it is saving, never nothing.
      if (!caseExistedAtFirstAnswer) expect(shownWhileCreating, "the page says it is saving while the new case is created").not.toBe("(no saving notice)");
      if (process.env.BROWSER_SPEED === "slow") console.log(`REAL-SPEED ${court}/${started}: the page had its new case at the first answer: ${caseExistedAtFirstAnswer}; the page said: "${shownWhileCreating}"`);
      // The answers reach the saved case (they were given before or while it was created).
      const savedStage = () => {
        const row = [...account.rows.values()][0] as Record<string, unknown> | undefined;
        const sections = ((row?.master_result as Record<string, unknown> | undefined)?.intakeCheckpoint as Record<string, unknown> | undefined)?.sections as Record<string, Record<string, unknown>> | undefined;
        return (sections?.situation?.record as Record<string, unknown> | undefined)?.stage ?? null;
      };
      await expect.poll(savedStage, { timeout: 90_000, message: "the chosen stage is in the saved case" }).toBe(chosenStep);

      // 2. Kept and shown in the top line.
      await expect(gate).toHaveCount(0);
      await expect(page.getByTestId("situation-line"), "the top line shows the stage").toContainText(chosenWords);

      // 3. Never asked again, and never contradicted.
      await openBuilderAfterSituation(page, court);
      await toResults(page, court);
      await expect(page.getByText("Which of these fits your case best?"), "the results do not ask the stage again").toHaveCount(0);
      await expect(page.getByTestId("stage-answer-panel"), "the next step is the stage chosen").toHaveAttribute("data-stage-id", chosenStep);
      const row = [...account.rows.values()][0] as Record<string, unknown> | undefined;
      if (row?.id) {
        await page.goto(`/cases/${row.id}`);
        await expect(page.getByTestId("situation-line")).toContainText(chosenWords, { timeout: 60_000 });
        await expect(page.getByText("Which of these fits your case best?"), "the case page does not ask the stage again").toHaveCount(0);
        await expect(page.getByTestId("stage-answer-panel")).toHaveAttribute("data-stage-id", chosenStep);
      }
      const repeats = factsAskedTwice(asked, false).filter((repeat) => repeat.fact === "stage");
      expect(repeats, "the stage is asked once").toEqual([]);
    });
  }
}

/** After the situation questions on the builder: the location and the story, as a person gives them. */
async function openBuilderAfterSituation(page: Page, court: Court) {
  const province = page.getByLabel("Province or territory");
  // The location is asked when the case has none; otherwise the first screen after it shows. Waited
  // for, not glanced at: at real speed the location form appears seconds later, and a glance went on
  // without the city, to a question that is only asked once the city is given (#488, 28 Oct).
  const after = court === "small-claims" ? page.getByRole("button", { name: "Fill in the form yourself" }) : page.getByTestId("guided-form-question");
  await expect(province.or(after).first()).toBeVisible({ timeout: 60_000 });
  if (await province.isVisible().catch(() => false)) {
    await province.selectOption("Ontario");
    await page.getByLabel("City or municipality").fill("Sudbury");
    await page.getByRole("button", { name: court === "small-claims" ? "Continue" : `Continue with ${court === "civil" ? "Civil" : "Family"} questions`, exact: true }).click();
  }
  if (court !== "small-claims") {
    const question = page.getByTestId("guided-form-question");
    await expect(question).toBeVisible({ timeout: 60_000 });
    await question.getByRole("textbox").fill(STORY[court]);
    await question.getByTestId("guided-form-next").click();
  }
}
