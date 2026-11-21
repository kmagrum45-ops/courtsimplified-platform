/**
 * Two of the three live bugs the site owner found by hand on 2026-10-16,
 * as a browser journey through the actual front door (app/page.tsx ->
 * HomeLocationGate -> CaseUnderstandingCard), with /api/case/understand
 * mocked so this costs no OpenAI spend and needs no database: both bugs are
 * pure client state, independent of what the model or the database return.
 *
 *   npx playwright test tests/browser/case-understanding-continuity.spec.ts
 *
 * THE THIRD BUG (a brand new case silently landing on an old one of the same
 * court type) needs a real saved case to reproduce honestly and is covered
 * instead by the static property check in verifyNoStaleIntake.ts (since
 * 30 Oct: "no code reads or writes a remembered last case", the recovery that
 * caused it having been removed; test:open-case) and, live, by
 * address-opens-chosen-case.spec.ts.
 *
 * Until this run, NOTHING in the test suite opened the home page's story
 * flow at all: every existing browser spec (guest-intake.spec.ts,
 * walkthrough.spec.ts) navigates straight to /builder, so this front door,
 * shipped 2026-10-14, had zero browser-level coverage of any kind when these
 * bugs shipped two days later.
 */
import { expect, test, type Page } from "@playwright/test";

import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { openBuilder } from "./harness/builderGate";
import { confirmInitialInformation, saveCaseStory } from "./harness/intakeReview";
import { createStageAnswerPost } from "../../app/api/case/stage-answer/route";
import { guidanceIsCurrent } from "../../src/lib/case-system/intakeReview";

import { grantSiteAccess } from "./harness/siteAccess";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { homeQuestionsFor } from "../../src/lib/case-system/caseFile/factQuestions";

type UnderstandBody = {
  ok: true;
  understanding: {
    summary: string;
    facts: { label: string; value: string }[];
    matters: never[];
    mainCourt: "small-claims";
    side: "starting";
    stage: string;
    questions: { id?: string; question: string; why?: string }[];
    asksForPrediction: false;
    step: string;
    regime: null;
  };
  answer: {
    status: "answered";
    statements: never[];
    notConfirmed: never[];
    declinedToJudge: false;
  };
};

function understandResponse(questions: { id: string; question: string; why?: string }[]): UnderstandBody {
  return {
    ok: true,
    understanding: {
      summary: "Your neighbour's dog bit you, and you want compensation for your vet bills.",
      facts: [{ label: "Incident date", value: "September 13, 2026" }],
      matters: [],
      mainCourt: "small-claims",
      side: "starting",
      stage: "Deciding whether to sue",
      // A real stage-map step, so StageAnswerPanel renders its real date
      // question (case-date-act-or-omission) instead of nothing.
      step: "before-filing:deciding-whether-to-sue",
      questions,
      asksForPrediction: false,
      regime: null,
    },
    answer: { status: "answered", statements: [], notConfirmed: [], declinedToJudge: false },
  };
}

// The site's own questions, by id and in their fixed words (factQuestions.ts; no model-written question reaches the card).
const [AMOUNT, WHEN, REMEDY] = homeQuestionsFor("small-claims", "starting");
const ROUND_1 = [AMOUNT, WHEN];
const ROUND_2 = [WHEN, REMEDY];
const AMOUNT_ANSWER = "$2,400";
const WHEN_ANSWER = "Last spring";

async function mockUnderstand(page: Page, questions: { id: string; question: string; why?: string }[]) {
  await page.route("**/api/case/understand", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(understandResponse(questions)) });
  });
}

// Deadline assertions belong after explicit review, not on the home intake.
async function openConfirmedStage(page: Page, story: string, stepId: string) {
  const account = await fakeAccount(page);
  await openBuilder(page, "small-claims");
  await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  await page.getByLabel("Case story", { exact: true }).fill(story);
  await saveCaseStory(page);
  await expect(page.getByTestId("stage-answer-dates")).toHaveCount(0);
  await confirmInitialInformation(page);
  const row = [...account.rows.values()][0];
  const master = row.master_result as Record<string, unknown>;
  master.guidanceInputRevision = (master.intakeCheckpoint as Record<string, unknown>).inputRevision;
  master.intakeData = { courtPath: "small-claims", facts: story, extra: { yourProvince: "Ontario", yourCity: "Toronto", yourRole: "plaintiff" } };
  master.position = { confirmedStage: "starting-case", stepId, dateAnswers: {} };
  await page.route("**/api/case/stage-answer", async route => {
    expect(guidanceIsCurrent(row.master_result, "small-claims", String(row.id))).toBe(true);
    expect(route.request().postDataJSON().caseId).toBe(row.id);
    const result = await createStageAnswerPost()(new Request(route.request().url(), { method: "POST", headers: { "Content-Type": "application/json" }, body: route.request().postData() }));
    await route.fulfill({ status: result.status, json: await result.json() });
  });
  await page.goto(`/cases/${row.id}`, { timeout: 120_000 });
}

test("the date suggestion reads the story; a new round keeps each answer under its own question, by id, and a new question starts empty", async ({ page }) => {
  // A local dev server compiles both the home page and stage-answer route on
  // first use. CI serves a prebuilt app, but the same assertions run locally.
  test.setTimeout(180_000);
  page.setDefaultNavigationTimeout(120_000);
  await grantSiteAccess(page);
  await mockUnderstand(page, ROUND_1);

  await page.goto("/?path=small-claims", { waitUntil: "domcontentloaded" });
  await page.getByLabel("City or municipality").fill("Ottawa");
  // The "this happened on <date>" phrasing is the one branch of
  // storyHintsForDates (casePosition.ts) confirmed, independently of this
  // spec, to populate case-date-act-or-omission -- used here instead of a
  // more naturally-worded story so this test does not depend on guessing the
  // per-question cue-word matching too.
  await page
    .getByLabel(STORY_LABEL, { exact: true })
    // No date, amount or "I want" in it, so the card asks each site question it is given (factQuestions.ts homeAsks).
    .fill("My neighbour's dog bit me and I had to pay vet bills.");
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();

  const card = page.getByTestId("case-understanding");
  await expect(card).toBeVisible();

  await expect(page.getByTestId("stage-answer-dates")).toHaveCount(0);

  // Round 1 asks the amount, then when; only the amount is answered. Round 2 asks when (now first, in the amount's
  // place), then what is wanted.
  const box = (id: string) => card.getByTestId(`case-understanding-answer-${id}`);
  await expect(box(WHEN.id)).toBeVisible();
  await box(AMOUNT.id).fill(AMOUNT_ANSWER);
  await mockUnderstand(page, ROUND_2);
  await page.getByTestId("case-understanding-update").click();
  await expect(box(REMEDY.id)).toBeVisible();

  /*
   * Each box is named by its question's id, never its place (site owner, 19 Nov 2026). Kept by place, round 1's first
   * answer (the amount) would sit under round 2's first question (when), and the chat would type into the wrong box
   * (Chrome pass 3 re-recording: the harness typed into "Review: City"). The bug of 16 Oct 2026 stays fixed: no answer
   * shows under another question. And a question is asked only while the record has no answer for it (site owner,
   * 19 Nov 2026, rule (a)): the amount, answered, is not asked again (factQuestions.ts homeAsks).
   */
  await expect(box(AMOUNT.id), "an answered question is not asked again").toHaveCount(0);
  await expect(box(WHEN.id), "the amount answer does not move into the question now in its place").toHaveValue("");
  await expect(box(REMEDY.id), "a new question starts empty").toHaveValue("");
  for (const other of await card.locator("[data-fact-question] input").all()) await expect(other).not.toHaveValue(AMOUNT_ANSWER);
  // A typed answer stays under its own question while the person is still on the card.
  await box(WHEN.id).fill(WHEN_ANSWER);
  await box(REMEDY.id).fill("Pay my vet bills");
  await expect(box(WHEN.id), "the when answer stays under the when question").toHaveValue(WHEN_ANSWER);
  await openConfirmedStage(page, "My neighbour's dog bit me. This happened on September 13, 2026.", "before-filing:deciding-whether-to-sue");
  const knownDate = page.getByTestId("stage-answer-known-case-date-act-or-omission");
  await expect(knownDate).toBeVisible({ timeout: 60_000 });
  await expect(knownDate).toContainText("September");
  await expect(knownDate).toContainText("2026");
  await expect(knownDate).toContainText(/from your story/i);


});

test("a passed Small Claims filing deadline shows the admission qualifier inside its warning", async ({ page }) => {
  test.setTimeout(180_000);
  await openConfirmedStage(page, "I lent my friend $5,000 March 2023, due December 2023, never paid. January 2025 he texted admitting he owes the 5k.", "plaintiff:claim-drafted-not-filed");
  const dates = page.getByTestId("stage-answer-dates");
  await expect(dates).toBeVisible({ timeout: 60_000 });
  const change = dates.getByRole("button", { name: "Change", exact: true });
  if (await change.count()) await change.first().click();
  // A day marked "I don't know yet" is never asked again: folded here ("Not answered yet: add it when you know -- Add it"; site owner, 31 Oct).
  const addIt = dates.getByRole("button", { name: "Add it", exact: true });
  if (await addIt.count()) await addIt.first().click();
  await dates.locator('input[type="date"]').first().fill("2023-12-31");
  await dates.getByRole("button", { name: "Count my deadline", exact: true }).click();
  const warning = page.getByTestId("next-step-passed-bar");
  await expect(warning).toBeVisible({ timeout: 60_000 });
  await expect(warning).toContainText("Missing this time limit");
  await expect(warning.getByTestId("next-step-passed-qualifier")).toContainText("The other side may admit in writing, and sign");
  await expect(warning).toContainText("before the time ran out");
  await expect(warning).toContainText("s. 13 (1)");
});
