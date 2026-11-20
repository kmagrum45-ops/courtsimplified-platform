import { expect, test } from "@playwright/test";
import { grantSiteAccess } from "./harness/siteAccess";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { homeQuestionsFor } from "../../src/lib/case-system/caseFile/factQuestions";

test.use({ trace: "off", screenshot: "off" });

/*
 * The home card shows only the site's own questions, by id (factQuestions.ts homeQuestionsFor; site owner, 19 Nov 2026):
 * a model-written "Question 3?" never reaches it, so this mock returns the court's fixed questions. A question the record
 * answers is not asked again (homeAsks). That more than eight answers travel untrimmed is checked on the request itself,
 * for every court (test:intake-requests, 16 answers).
 */
function reading(court: string, round: number) {
  return {
    ok: true,
    understanding: {
      summary: `Synthetic reading ${round}`, facts: [], matters: [], mainCourt: court,
      side: "starting", stage: "", questions: homeQuestionsFor(court, "starting").map((item) => ({ id: item.id, question: item.question })),
      asksForPrediction: false, step: null, regime: null,
    },
    answer: { status: "answered", statements: [], notConfirmed: [], declinedToJudge: false },
  };
}

for (const [court, label] of [["small-claims", "Small Claims"], ["family", "Family"], ["civil", "Civil"]]) {
  test(`${court}: rejected update retains input; each update carries every answer given so far`, async ({ page }) => {
    test.setTimeout(180_000);
    let fail = false;
    let round = 0;
    let lastAnswers: { question: string; answer: string }[] = [];
    const questions = homeQuestionsFor(court, "starting");
    expect(questions.length, `${court} has site questions for the home card`).toBeGreaterThanOrEqual(2);
    const box = (id: string) => page.getByTestId(`case-understanding-answer-${id}`);
    // Each answer of its question's type (an amount for an amount question, a date for a date question): one that is not is not recorded, and is asked again.
    const answerOf = (id: string, words: string) => /amount/i.test(id) ? "$2,400" : /when/i.test(id) ? "March 2026" : words;
    const FIRST = answerOf(questions[0].id, "My complete answer remains here.");
    await grantSiteAccess(page);
    await page.route("**/api/case/understand", async (route) => {
      lastAnswers = route.request().postDataJSON().answers ?? [];
      if (fail) { fail = false; await route.fulfill({ status: 503, json: { ok: false } }); return; }
      await route.fulfill({ json: reading(court, round++) });
    });
    await page.goto(`/?path=${court}`, { timeout: 120_000 });
    await page.getByLabel("City or municipality").fill("Ottawa");
    await page.getByLabel(STORY_LABEL, { exact: true }).fill("Synthetic description for intake request regression testing.");
    await page.getByRole("button", { name: `Continue to ${label} intake` }).click();
    const first = box(questions[0].id);
    await expect(first).toBeVisible({ timeout: 60_000 });
    await first.fill(FIRST);
    fail = true;
    await page.getByTestId("case-understanding-update").click();
    await expect(page.getByRole("alert").filter({ hasText: "Your answers are still here" })).toBeVisible();
    await expect(first).toHaveValue(FIRST);
    await expect(page.getByTestId("case-understanding-update")).toBeEnabled();
    await page.getByTestId("case-understanding-update").click();
    await expect(first, "an answered question is not asked again").toHaveCount(0);
    expect(lastAnswers.map((item) => item.answer)).toEqual([FIRST]);
    for (let i = 1; i < questions.length - 1; i++) {
      await expect(box(questions[i].id)).toBeVisible();
      await box(questions[i].id).fill(answerOf(questions[i].id, `Complete answer ${i}`));
      await page.getByTestId("case-understanding-update").click();
      await expect(box(questions[i].id)).toHaveCount(0);
      expect(lastAnswers, "every answer given so far travels, the first one included").toHaveLength(i + 1);
      expect(lastAnswers[0].answer).toBe(FIRST);
      expect(lastAnswers[i].answer).toBe(answerOf(questions[i].id, `Complete answer ${i}`));
    }
    const last = questions[questions.length - 1];
    await expect(box(last.id)).toBeVisible();
    await box(last.id).fill("A draft that must travel with Check again.");
    await page.getByRole("button", { name: "Check again", exact: true }).click();
    await expect(box(last.id)).toHaveCount(0);
    expect(lastAnswers).toHaveLength(questions.length);
    expect(lastAnswers[0].answer).toBe(FIRST);
    expect(lastAnswers[questions.length - 1].answer).toBe("A draft that must travel with Check again.");
  });
}

test("editing the story cancels an older reading without losing the new story", async ({ page }) => {
  test.setTimeout(180_000);
  await grantSiteAccess(page);
  let release!: () => void;
  let arrived!: () => void;
  const received = new Promise<void>((resolve) => { arrived = resolve; });
  await page.route("**/api/case/understand", async (route) => {
    arrived();
    await new Promise<void>((resolve) => { release = resolve; });
    await route.fulfill({ json: reading("small-claims", 99) }).catch(() => {});
  });
  await page.goto("/?path=small-claims", { timeout: 120_000 });
  await page.getByLabel("City or municipality").fill("Ottawa");
  const story = page.getByLabel(STORY_LABEL, { exact: true });
  await story.fill("The original synthetic description.");
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await received;
  await story.fill("The newer synthetic description must remain intact.");
  release();
  await expect(page.getByRole("button", { name: "Continue to Small Claims intake" })).toBeEnabled();
  await expect(story).toHaveValue("The newer synthetic description must remain intact.");
  await expect(page.getByTestId(/^case-understanding-answer-/)).toHaveCount(0);
});
