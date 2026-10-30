import { expect, test } from "@playwright/test";
import { grantSiteAccess } from "./harness/siteAccess";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";

test.use({ trace: "off", screenshot: "off" });

function reading(court: string, round: number) {
  return {
    ok: true,
    understanding: {
      summary: `Synthetic reading ${round}`, facts: [], matters: [], mainCourt: court,
      side: "starting", stage: "", questions: [{ question: `Question ${round}?` }],
      asksForPrediction: false, step: null, regime: null,
    },
    answer: { status: "answered", statements: [], notConfirmed: [], declinedToJudge: false },
  };
}

for (const [court, label] of [["small-claims", "Small Claims"], ["family", "Family"], ["civil", "Civil"]]) {
  test(`${court}: rejected update retains input; retry carries more than eight answers`, async ({ page }) => {
    test.setTimeout(180_000);
    let fail = false;
    let round = 0;
    let lastAnswers: { question: string; answer: string }[] = [];
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
    const first = page.getByLabel("Question 0?", { exact: true });
    await expect(first).toBeVisible({ timeout: 60_000 });
    await first.fill("My complete answer remains here.");
    fail = true;
    await page.getByTestId("case-understanding-update").click();
    await expect(page.getByRole("alert").filter({ hasText: "Your answers are still here" })).toBeVisible();
    await expect(first).toHaveValue("My complete answer remains here.");
    await expect(page.getByTestId("case-understanding-update")).toBeEnabled();
    await page.getByTestId("case-understanding-update").click();
    for (let i = 1; i < 10; i++) {
      const box = page.getByLabel(`Question ${i}?`, { exact: true });
      await expect(box).toBeVisible();
      await box.fill(`Complete answer ${i}`);
      await page.getByTestId("case-understanding-update").click();
    }
    await expect(page.getByLabel("Question 10?", { exact: true })).toBeVisible();
    expect(lastAnswers).toHaveLength(10);
    expect(lastAnswers[0].answer).toBe("My complete answer remains here.");
    expect(lastAnswers[9].answer).toBe("Complete answer 9");
    await page.getByLabel("Question 10?", { exact: true }).fill("A draft that must travel with Check again.");
    await page.getByRole("button", { name: "Check again", exact: true }).click();
    await expect(page.getByLabel("Question 11?", { exact: true })).toBeVisible();
    expect(lastAnswers).toHaveLength(11);
    expect(lastAnswers[10].answer).toBe("A draft that must travel with Check again.");
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
  await expect(page.getByLabel("Question 99?", { exact: true })).toHaveCount(0);
});
