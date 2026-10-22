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
 *
 * Part 3 adds the stale-story audit's high-risk items in all three areas (below).
 */
import { expect, test, type Page, type Route } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { confirmInitialInformation } from "./harness/intakeReview";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { runFamilyIntakeCanonicalIntegration } from "../../src/lib/case-system/orchestration/familyIntakeCanonicalAdapter";
import { runCivilIntakeCanonicalIntegration } from "../../src/lib/case-system/orchestration/civilIntakeCanonicalAdapter";
import { analyzeSmallClaimsWithBrain } from "../../src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import { guidanceIsCurrent } from "../../src/lib/case-system/intakeReview";

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

/*
 * PART 3: THE STALE-STORY AUDIT'S HIGH-RISK ITEMS, IN ALL THREE AREAS.
 *
 * Each of these kept a copy of something read from the story where the version
 * record did not reach, and it still decided a deadline or a form after the
 * story changed. Item 1 (events confirmed from old story sentences deciding the
 * stage) is worked out on the server from the database, which this synthetic
 * test cannot reach; verifyStoryDataRegistry asserts it (eventsForStory).
 */
type Court = "small-claims" | "family" | "civil";
const COURTS = ["small-claims", "family", "civil"] as const;
const ANALYSIS_STORY = "Synthetic facts: I need help organizing this matter, the parties and dates.";
async function reply(route: Route, court: Court) {
  const { input } = route.request().postDataJSON();
  const result = court === "family" ? await runFamilyIntakeCanonicalIntegration(input, { allowExternalCognition: false }) : court === "civil" ? await runCivilIntakeCanonicalIntegration(input, { allowExternalCognition: false }) : await analyzeSmallClaimsWithBrain(input, { allowExternalCognition: false });
  return { ok: true, result, authenticated: true, reasoningMode: "deterministic-fallback", analysisAvailable: false };
}
async function openForm(page: Page, court: Court, story?: string) {
  await openBuilder(page, court, { story: court === "small-claims" ? undefined : ANALYSIS_STORY });
  if (court === "small-claims") {
    await page.getByRole("button", { name: "Fill in the form yourself" }).click();
    if (story) await page.getByLabel("Case story", { exact: true }).fill(story);
  } else await page.getByTestId("guided-form-show-form").click();
}

for (const court of COURTS) {
  test(`${court}: dates recorded for the old story count no deadline after the story changes and the case is analysed again (audit item 2)`, async ({ page }) => {
    test.setTimeout(300_000);
    const account = await fakeAccount(page);
    await page.route(`**/api/${court}/analyze`, async (route) => route.fulfill({ json: await reply(route, court) }));
    await openForm(page, court, ANALYSIS_STORY);
    await confirmInitialInformation(page);
    const submit = page.getByRole("button", { name: "Continue to your next steps", exact: true });
    await submit.click();
    await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 90_000 });
    const row = [...account.rows.values()][0];
    const master = row.master_result as Record<string, unknown>;
    // A served date and how it was served, entered on the case page for the old story.
    master.position = { ...(master.position as object), dateAnswers: { "sc-date-claim-served": "2026-09-01" }, service: { "sc-date-claim-served": { method: "mail", enteredOn: "2026-09-01" } } };

    await page.goto(`/builder?path=${court}&caseId=${row.id}&step=form`);
    await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "user-confirmed");
    if (court !== "small-claims") await page.getByRole("button", { name: "Edit case story", exact: true }).click();
    await page.getByLabel("Case story", { exact: true }).fill("Synthetic new story: a different matter with different dates.");
    const restart = page.getByTestId("questions-story-changed").getByRole("button", { name: "Start the questions again from my story" });
    if (await restart.isVisible().catch(() => false)) await restart.click();
    await confirmInitialInformation(page);
    await submit.click();
    await expect.poll(() => JSON.stringify((row.master_result as Record<string, unknown>).intakeData), { timeout: 90_000 }).toContain("a different matter");
    const position = (row.master_result as Record<string, unknown>).position as Record<string, unknown>;
    expect(position.dateAnswers, "the old story's served date counts no deadline").toEqual({});
    expect(position.service, "nor how it was served").toEqual({});
  });

  test(`${court}: the Forms page lists nothing from an old analysis left in the browser, and the old keys are removed (audit item 3)`, async ({ page }) => {
    test.setTimeout(120_000);
    await grantSiteAccess(page);
    await page.goto("/about");
    const old = { courtPath: court, facts: "SYNTHETIC OLD STORY", analysis: { requiredForms: [{ formNumber: "Form 99Z", title: "SYNTHETIC OLD FORM" }] } };
    await page.evaluate((value) => {
      for (const key of ["courtSimplifiedMasterResult", "master_result", "courtSimplifiedCase", "caseData"]) localStorage.setItem(key, JSON.stringify(value));
    }, old);
    await page.goto("/forms");
    await expect.poll(() => page.evaluate(() => ["courtSimplifiedMasterResult", "master_result", "courtSimplifiedCase", "caseData"].filter((key) => localStorage.getItem(key) !== null))).toEqual([]);
    expect(await page.locator("body").innerText()).not.toContain("SYNTHETIC OLD");
  });

  test(`${court}: the follow-up chat's first message fills no form (audit item 4)`, async ({ page }) => {
    test.setTimeout(120_000);
    await grantSiteAccess(page);
    await page.goto("/about");
    // What the chat used to hand over: its first message, read into the form's fields.
    await page.evaluate((path) => sessionStorage.setItem(`courtsimplified-ai-case-partner-chat:narrative-prefill:${path}`, JSON.stringify({
      courtPath: path, narrative: "SYNTHETIC CHAT STORY", savedAt: Date.now(),
      facts: [{ field: "otherParty", value: "SYNTHETIC CHAT PARTY", state: "direct", sourceText: "x" }, { field: "amountClaimed", value: "$9,999", state: "direct", sourceText: "x" }, { field: "facts", value: "SYNTHETIC CHAT STORY", state: "direct", sourceText: "x" }],
      questions: [],
    })), court);
    await openForm(page, court);
    const shown = await page.locator("body").innerText();
    for (const text of ["SYNTHETIC CHAT PARTY", "SYNTHETIC CHAT STORY", "9,999"]) expect(shown, `the form does not show "${text}"`).not.toContain(text);
    const values = await page.locator("input, textarea").evaluateAll((fields) => fields.map((field) => (field as HTMLInputElement).value).join(" | "));
    expect(values).not.toContain("SYNTHETIC CHAT");
    expect(await page.evaluate((path) => sessionStorage.getItem(`courtsimplified-ai-case-partner-chat:narrative-prefill:${path}`), court), "the old hand-off is removed").toBeNull();
  });
}

/*
 * #465 RE-TEST E AND G: CHANGING THE STORY ON A SAVED CASE AND ANALYSING AGAIN.
 *
 * Small Claims and Family showed "Another tab changed this intake" with one tab
 * open, the case page stayed on "Review your initial information" after the
 * person had re-confirmed and seen results, and the follow-up chat was refused
 * (409) on every message. All three are the guidance gate: the case page and the
 * chat routes show guidance only while the saved analysis was built from the
 * confirmed intake (guidanceIsCurrent). This walks the same path in all three
 * areas and requires: no conflict message, one confirm is enough, the saved
 * case passes the gate the chat routes apply, and the case page shows guidance.
 */
for (const court of COURTS) {
  test(`${court}: change the story, analyse again: no false conflict, the case page reaches guidance after one confirm, the chat is not refused`, async ({ page }) => {
    test.setTimeout(300_000);
    const account = await fakeAccount(page);
    await page.route(`**/api/${court}/analyze`, async (route) => route.fulfill({ json: await reply(route, court) }));
    await openForm(page, court, ANALYSIS_STORY);
    await confirmInitialInformation(page);
    const submit = page.getByRole("button", { name: "Continue to your next steps", exact: true });
    await submit.click();
    await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 90_000 });
    const row = [...account.rows.values()][0];

    await page.goto(`/builder?path=${court}&caseId=${row.id}&step=form`);
    await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "user-confirmed");
    if (court !== "small-claims") await page.getByRole("button", { name: "Edit case story", exact: true }).click();
    await page.getByLabel("Case story", { exact: true }).fill("Synthetic new story: a different matter, analysed again.");
    const restart = page.getByTestId("questions-story-changed").getByRole("button", { name: "Start the questions again from my story" });
    if (await restart.isVisible().catch(() => false)) await restart.click();
    await confirmInitialInformation(page);
    await submit.click();
    await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 90_000 });
    // Let any save the analysis started finish.
    await expect(page.getByTestId("intake-save-status")).not.toContainText("Saving", { timeout: 30_000 });
    await expect(page.getByText("Another tab changed this intake"), "one tab: no conflict").toHaveCount(0);
    await expect.poll(() => guidanceIsCurrent(row.master_result, court, String(row.id)), {
      message: "the saved analysis was built from the confirmed intake, so the chat routes' gate (withConfirmedGuidance) lets the chat answer",
      timeout: 30_000,
    }).toBe(true);
    await page.goto(`/cases/${row.id}`);
    await expect(page.getByTestId("case-intake-gate"), "the case page does not ask for the review again").toHaveCount(0, { timeout: 60_000 });
  });
}

// L26 (#465 re-test D): Continue before the review is confirmed says so beside
// the button, with a link up to the review, instead of only jumping the page.
for (const court of COURTS) {
  test(`${court}: Continue before confirming the review says so beside the button, with a link to it`, async ({ page }) => {
    test.setTimeout(180_000);
    await openForm(page, court, ANALYSIS_STORY);
    await page.getByRole("button", { name: "Continue to your next steps", exact: true }).click();
    const notice = page.getByTestId("review-needed-beside-button");
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("needs confirming");
    await notice.getByRole("button", { name: "Go to your initial case information" }).click();
    // Its heading, not partway down its fields (#465 re-test).
    await expect(page.getByTestId("intake-review").getByRole("heading", { level: 2 }).first()).toBeInViewport({ timeout: 10_000 });
  });
}
