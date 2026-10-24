/**
 * PR #470 RE-TEST, THROUGH THE STEPS A PERSON TAKES (2026-10-22).
 *
 * Items in the #470 round that a unit check called fixed still failed live, so
 * each item here is tested in a browser, from the intake through to the page
 * the person saw it on. The case's own saves go through the merge the server
 * route uses (applyPositionPatch), so the case page reads what it would live.
 *
 * What it catches:
 *  - "Nothing filed yet" settles the stage on the results AND the case page,
 *    answered in the questions or in the review panel (the panel's answers
 *    never reached the form: it was not told of them);
 *  - the Family served date answered in the review accepts real dates,
 *    and asks for the year only when one is missing;
 *  - "Pick everything that fits" stays open until saved, and keeps every pick;
 *  - a side answered in the review shows in the form's own "Your role".
 */
import { expect, test, type Page, type Route } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { runFamilyIntakeCanonicalIntegration } from "../../src/lib/case-system/orchestration/familyIntakeCanonicalAdapter";
import { runCivilIntakeCanonicalIntegration } from "../../src/lib/case-system/orchestration/civilIntakeCanonicalAdapter";
import { applyPositionPatch, readCasePosition } from "../../src/lib/case-system/casePosition";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 30_000 });

type Court = "civil" | "family";
const STORY: Record<Court, string> = {
  civil: "Synthetic story: a supplier kept my $62,000 deposit and never delivered the equipment. I have the invoice and emails.",
  family: "Synthetic story: my spouse and I separated in March 2026 after 12 years of marriage. I want spousal support.",
};
const FILED: Record<Court, string> = { civil: "documents", family: "filedDocuments" };
type Rows = Map<string, Record<string, unknown>>;

/** The analysis, the case reader and the position save, as the server does them, on the synthetic account. */
async function serverRoutes(page: Page, court: Court, rows: Rows) {
  await page.route(`**/api/${court}/analyze`, async (route: Route) => {
    const { input } = route.request().postDataJSON();
    const result = court === "family" ? await runFamilyIntakeCanonicalIntegration(input, { allowExternalCognition: false }) : await runCivilIntakeCanonicalIntegration(input, { allowExternalCognition: false });
    return route.fulfill({ json: { ok: true, result, authenticated: true, reasoningMode: "deterministic-fallback", analysisAvailable: false } });
  });
  await page.route("**/api/case/read", (route) => route.fulfill({ json: { ok: true, skipped: "off" } }));
  await page.route("**/api/cases/position", async (route: Route) => {
    const body = route.request().postDataJSON();
    const row = rows.get(body.caseId);
    if (!row) return route.fulfill({ status: 404, json: { error: "not found" } });
    const master = (row.master_result ?? {}) as Record<string, unknown>;
    const result = applyPositionPatch(readCasePosition(master, court), body, court, new Date());
    if (!result.ok) return route.fulfill({ status: 400, json: { error: result.error } });
    row.master_result = { ...master, position: result.position };
    row.updated_at = new Date().toISOString();
    return route.fulfill({ json: { position: result.position } });
  });
}

/**
 * The guided questions, answered as a person would: the side given, "Nothing filed
 * yet" (or `filed`), a suggestion from the story accepted, anything else skipped.
 * At `stopAt` the person stops the questions and goes to the review.
 */
async function answerQuestions(page: Page, options: { side: string; filed?: string[]; issues?: string[]; stopAt?: string; neverAsked?: string[] }) {
  for (let i = 0; i < 30; i++) {
    const question = page.getByTestId("guided-form-question");
    if (!(await question.isVisible().catch(() => false))) break;
    const key = (await question.getAttribute("data-key")) ?? "";
    // The situation answers, given before the story, settle these: never asked again (step 2).
    expect(options.neverAsked ?? [], `"${key}" is asked again after the situation questions`).not.toContain(key);
    if (key === options.stopAt) {
      await page.getByTestId("intake-start-review").click();
      await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
      return;
    }
    const yes = question.getByTestId("guided-form-from-story-yes");
    if (await yes.isVisible().catch(() => false)) { await yes.click(); continue; }
    if (key === "yourRole") { await question.getByTestId(`guided-option-${options.side}`).click(); continue; }
    if (key === "documents" || key === "filedDocuments") {
      for (const item of options.filed ?? ["nothing"]) await question.getByTestId(`guided-check-${item}`).check();
      await question.getByTestId("guided-form-next").click();
      continue;
    }
    if (key === "issues" && options.issues) {
      for (const item of options.issues) await question.getByTestId(`guided-check-${item}`).check();
      await question.getByTestId("guided-form-next").click();
      continue;
    }
    const option = question.locator("[data-testid^=guided-option-]").first();
    if (await option.count()) { await option.click(); continue; }
    const check = question.locator("[data-testid^=guided-check-]").first();
    if (await check.count()) { await check.check(); await question.getByTestId("guided-form-next").click(); continue; }
    await question.getByTestId("guided-form-skip").click();
  }
  await page.getByTestId("guided-form-done").click();
  await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
}

async function confirmAndContinue(page: Page) {
  const panel = page.getByTestId("intake-review");
  const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
  while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1); }
  await page.getByTestId("intake-review-acknowledgement").check();
  await page.getByTestId("intake-confirm").click();
  await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
  // The form ends with "Continue to your next steps"; questions stopped early, "Show my next step".
  await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
  await expect(page.getByTestId("completed-case-overview")).toBeVisible({ timeout: 90_000 });
}

/** The stage is settled (recorded), not asked as "Which of these fits your case best?". */
async function expectStageSettled(page: Page, where: string) {
  await expect(page.getByTestId("stage-confirmed"), `${where}: the stage is recorded from "Nothing filed yet"`).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Which of these fits your case best?"), `${where}: the stage is not asked again`).toHaveCount(0);
}

/** A question in the review panel's remaining questions. */
const reviewQuestion = (page: Page, id: string) => page.getByTestId("intake-review").locator(`[data-testid=intake-initial-question][data-question="${id}"]`);

for (const court of ["civil", "family"] as const) {
  const side = court === "civil" ? "plaintiff" : "applicant";
  for (const where of ["questions", "review"] as const) {
    // "Nothing filed yet" is answered once, in the situation questions (step 2); the intake is then
    // finished in the questions or the review, and neither asks it again.
    test(`${court}: "Nothing filed yet" answered at the start settles the stage on the results and the case page (intake finished in the ${where})`, async ({ page }) => {
      test.setTimeout(240_000);
      const account = await fakeAccount(page);
      await serverRoutes(page, court, account.rows as unknown as Rows);
      await openBuilder(page, court, { story: STORY[court], situation: { where: "starting", filed: "nothing" } });
      await answerQuestions(page, { side, stopAt: where === "review" ? "issues" : undefined, neverAsked: ["yourRole", FILED[court]] });
      if (where === "review") await expect(reviewQuestion(page, FILED[court]), "the review does not ask it again").toHaveCount(0);
      await confirmAndContinue(page);
      await expectStageSettled(page, "results");
      const row = [...account.rows.values()][0] as Record<string, unknown>;
      await expect.poll(() => ((row.master_result as Record<string, unknown>).position as Record<string, unknown> | undefined)?.confirmedStage ?? null, { timeout: 30_000 }).toBe("starting-case");
      await page.goto(`/cases/${row.id}`);
      await expectStageSettled(page, "case page");
    });
  }

  test(`${court}: the side given at the start shows in the form's own role, and "Pick everything" keeps every pick until saved`, async ({ page }) => {
    test.setTimeout(180_000);
    await fakeAccount(page);
    await openBuilder(page, court, { story: STORY[court], situation: { where: "starting", filed: "nothing" } });
    await answerQuestions(page, { side, stopAt: "issues", neverAsked: ["yourRole"] });
    await expect(reviewQuestion(page, "yourRole"), "the review does not ask the side again").toHaveCount(0);
    const issues = reviewQuestion(page, "issues");
    const picks = issues.getByTestId("intake-field-pick");
    await picks.nth(0).check();
    await expect(issues, "the question stays open after the first pick").toBeVisible();
    await picks.nth(1).check();
    await issues.getByTestId("intake-field-save").click();
    await expect(issues).toHaveAttribute("data-answered", "true");
    await page.getByTestId("guided-form-show-form").click().catch(() => {});
    await expect(page.getByTestId("role-from-start"), "the form shows the side given at the start").toContainText(court === "civil" ? "Plaintiff" : "applicant");
  });
}

test("Family: the served date answered in the review accepts real dates, and asks for a year only when one is missing", async ({ page }) => {
  test.setTimeout(180_000);
  await fakeAccount(page);
  // Served, the day not known at the start: the review asks it (step 2 keeps the date rule here too).
  await openBuilder(page, "family", { story: "Synthetic story: my former partner started a family case and I was served with the Application.", situation: { where: "served", papers: "family-8", receivedOn: "unknown" } });
  await answerQuestions(page, { side: "respondent", filed: ["application"], stopAt: "servedDate", neverAsked: ["yourRole", "filedDocuments"] });
  const question = reviewQuestion(page, "servedDate");
  const box = question.getByRole("textbox");
  await box.fill("October 6");
  await box.press("Enter");
  await expect(question.getByTestId("intake-field-needs-more")).toContainText("add the year");
  await box.fill("October 6, 2026");
  await box.press("Enter");
  await expect(question, "the example's own date is accepted").toHaveAttribute("data-answered", "true");
  await expect(page.getByTestId("intake-review")).toContainText("October 6, 2026");
});

/*
 * SMALL CLAIMS: THE AMOUNT OFFERED (claimAmount.ts). From the home page, as a person
 * starts: the review's suggestion for "the amount claimed", and every box in the
 * review, carry the amount owed or the damage -- never the amount already paid or a
 * fee -- and with an unclear story nothing is offered and the question is asked.
 */
async function smallClaimsReview(page: Page, story: string) {
  await page.route("**/api/case/understand", (route) => route.fulfill({ json: { ok: true, skipped: "off" } }));
  await page.route("**/api/classify-court-path", (route) => route.fulfill({ json: { primaryPath: "small-claims", confidence: 0.95 } }));
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel("Tell us what happened in your own words").fill(story);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByRole("button", { name: "Fill in the form yourself" }))).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) {
    await acknowledgement.check();
    await page.getByTestId("acknowledgement-continue").click();
  }
  await page.getByTestId("intake-start-review").click();
  await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
  // The side was given in the situation questions (step 2): the review does not ask it again.
  await expect(page.locator('[data-question="sc-orient-role"]')).toHaveCount(0);
  return page.locator('[data-question="sc-amount-claimed"]');
}

/** Every value a box in the review holds, except the story itself. */
const reviewValues = (page: Page) => page.getByTestId("intake-review").locator("input, textarea").evaluateAll((boxes) =>
  boxes.filter((box) => !/story/i.test(box.getAttribute("aria-label") ?? "")).map((box) => (box as HTMLInputElement).value).join(" | "));

for (const [name, story, offered, never] of [
  ["paid $2,000, $6,000 still owed", "Synthetic story: I hired Test Renovations Ltd. in March 2026 to build a deck for $8,000. I paid $2,000 and $6,000 is still owed.", "$6,000", ["$2,000", "$8,000"]],
  ["a $3,800 fee and $2,500 of damage", "Synthetic story: Test Garage Ltd. charged me a $3,800 fee and caused $2,500 of damage to my car.", "$2,500", ["$3,800"]],
] as const) {
  test(`Small Claims: ${name}: the review offers ${offered}, never ${never.join(" or ")}`, async ({ page }) => {
    test.setTimeout(180_000);
    await grantSiteAccess(page);
    await fakeAccount(page);
    const amount = await smallClaimsReview(page, story);
    await expect(amount.getByRole("button", { name: `Use “${offered}” (from your story)` })).toBeVisible();
    for (const wrong of never) {
      await expect(amount.getByRole("button", { name: new RegExp(wrong.replace(/[$,]/g, "\$&")) })).toHaveCount(0);
      expect(await reviewValues(page), `no box in the review holds ${wrong}`).not.toContain(wrong);
    }
  });
}

test("Small Claims: a price and a payment with nothing said to be owed: no amount is offered, and it is asked", async ({ page }) => {
  test.setTimeout(180_000);
  await grantSiteAccess(page);
  await fakeAccount(page);
  const amount = await smallClaimsReview(page, "Synthetic story: I hired Test Renovations Ltd. to build a deck for $8,000. I paid $2,000 and they never finished.");
  await expect(amount, "the amount is asked").toBeVisible();
  await expect(amount.getByRole("button", { name: /from your story/ })).toHaveCount(0);
  expect(await reviewValues(page)).not.toMatch(/\$\d/);
});

/*
 * THE STORY BOX IN THE REVIEW (all three areas): a draft saved with "Save story", as
 * in the form. Typing changed the story at once and marked every answer "Answered for
 * an earlier version of your story". Civil and Family also show "Edit case story" in
 * the questions view, where it was hidden.
 */
for (const court of ["small-claims", "civil", "family"] as const) {
  test(`${court}: the review's story box changes the story only on Save story`, async ({ page }) => {
    test.setTimeout(180_000);
    await grantSiteAccess(page);
    await fakeAccount(page);
    if (court === "small-claims") {
      await smallClaimsReview(page, "Synthetic story: I paid Test Roofing Ltd. $9,000 to fix my roof and they never came back.");
    } else {
      await openBuilder(page, court, { story: STORY[court] });
      await answerQuestions(page, { side: court === "civil" ? "plaintiff" : "applicant" });
      await expect(page.getByRole("button", { name: "Edit case story", exact: true }), "the form's story box is shown in the questions view").toBeVisible();
    }
    const panel = page.getByTestId("intake-review");
    const box = panel.getByRole("textbox", { name: "Review: Your story", exact: true });
    const before = await box.inputValue();
    await box.fill(`${before} Synthetic: one more detail.`);
    await expect(panel.getByTestId("review-story-save"), "there is a Save story button").toBeEnabled();
    await page.waitForTimeout(1_000);
    await expect(page.getByTestId("intake-answer-stale"), "typing sets no answer aside").toHaveCount(0);
    await expect(panel.getByTestId("story-changed-beside-button")).toHaveCount(0);
    await panel.getByTestId("review-story-save").click();
    await expect(box).toHaveValue(`${before} Synthetic: one more detail.`);
    await expect(panel.getByTestId("review-story-save"), "saved: nothing left to save").toBeDisabled();
  });
}

/*
 * THE SIDE DECIDES WHAT IS OFFERED. A civil defendant was offered a Statement of
 * Claim draft, and a Family respondent's results said "This produces your
 * application": both are the starting side's documents. Tested with the side given
 * in the questions and in the review panel (whose answers did not reach the form).
 */
for (const where of ["questions", "review"] as const) {
  test(`civil defendant (side given at the start; intake finished in the ${where}): no Statement of Claim draft is offered`, async ({ page }) => {
    test.setTimeout(240_000);
    const account = await fakeAccount(page);
    await serverRoutes(page, "civil", account.rows as unknown as Rows);
    await openBuilder(page, "civil", { story: "Synthetic story: Test Supply Ltd. is suing me for $62,000 they say I owe for equipment. I was served with a Statement of Claim.", situation: { where: "served", papers: "civil-14A", receivedOn: "unknown" } });
    await answerQuestions(page, { side: "defendant", filed: ["statement-claim"], stopAt: where === "review" ? "issues" : undefined, neverAsked: ["yourRole", "documents"] });
    await confirmAndContinue(page);
    await expect(page.getByTestId("completed-case-overview")).toBeVisible();
    await expect(page.getByRole("button", { name: /Statement of Claim draft/ })).toHaveCount(0);
    await expect(page.getByText(/Statement of Claim draft/)).toHaveCount(0);
  });

  test(`Family respondent (side given at the start; intake finished in the ${where}): the results never say "This produces your application"`, async ({ page }) => {
    test.setTimeout(240_000);
    const account = await fakeAccount(page);
    await serverRoutes(page, "family", account.rows as unknown as Rows);
    await openBuilder(page, "family", { story: "Synthetic story: my former partner started a case for child support and I was served with the Application.", situation: { where: "served", papers: "family-8", receivedOn: "unknown" } });
    await answerQuestions(page, { side: "respondent", filed: ["application"], issues: ["child-support"], stopAt: where === "review" ? "issues" : undefined, neverAsked: ["yourRole", "filedDocuments"] });
    if (where === "review") {
      const issues = reviewQuestion(page, "issues");
      await issues.getByRole("checkbox", { name: /Child support/ }).check();
      await issues.getByTestId("intake-field-save").click();
    }
    await confirmAndContinue(page);
    await expect(page.getByTestId("completed-case-overview")).toBeVisible();
    await page.waitForTimeout(2_000);
    await expect(page.getByText("This produces your application")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Application draft/ })).toHaveCount(0);
  });
}

// The control for the test above: the starting side does see it, so its absence is a real "no".
test("Family applicant asking for child support: the results offer the application builder", async ({ page }) => {
  test.setTimeout(240_000);
  const account = await fakeAccount(page);
  await serverRoutes(page, "family", account.rows as unknown as Rows);
  await openBuilder(page, "family", { story: "Synthetic story: we separated in March 2026 and I want child support for our son." });
  await answerQuestions(page, { side: "applicant", issues: ["child-support"] });
  await confirmAndContinue(page);
  await expect(page.getByText("This produces your application")).toBeVisible({ timeout: 30_000 });
});
