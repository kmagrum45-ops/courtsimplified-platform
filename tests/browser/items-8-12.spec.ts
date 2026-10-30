/**
 * ITEMS 8 TO 12 OF JASON'S 2026-10-24 LIST, EACH PROVED IN A REAL BROWSER.
 *
 *   8  The safety notice shows on the first screen after a story that mentions threats,
 *      fear or violence, at that moment and once (site owner, 2026-10-29): not again on
 *      the case page for the same words -- in civil, Small Claims and Family, on the
 *      questions route and the form route. No notice for a story with none of that. The
 *      911 footer line is on every screen either way.
 *   9  "Show my next step" never fails silently: a failed next step shows a plain message
 *      and Try again, and Try again gets the next step.
 *   10 Change on the situation answers never leaves the papers picture stuck on screen.
 *   11 The stage card uses the court's own words for a case already going (a Family case
 *      conference is never called a settlement conference).
 *   12 The small fixes: a future day served is refused; a blank city says what is missing;
 *      Form 18B is listed only while the time to defend is still running; at phone width
 *      nothing pushes the page sideways; the top line stays in view while scrolling.
 *
 * The site's server calls are answered by this commit's own code (harness/thisCommitServer.ts):
 * no AI, no database. Every check is a property, never today's wording of something else.
 */
import { expect, test, type Page } from "@playwright/test";
import { fakeAccount } from "./harness/syntheticIntakeAccount";
import { grantSiteAccess } from "./harness/siteAccess";
import { serveFromThisCommit, type Court } from "./harness/thisCommitServer";
import { autoAnswerSituation, STARTING_NOTHING_FILED, type SituationAnswers } from "./harness/situation";
import { confirmAndShowNextStep } from "./harness/servedOnce";
import { openBuilder } from "./harness/builderGate";

test.use({ trace: "retain-on-failure", navigationTimeout: 120_000, actionTimeout: 20_000 });

const AREA: Record<Court, string> = { "small-claims": "Small Claims", civil: "Civil", family: "Family" };
const DANGER: Record<Court, string> = {
  "small-claims": "Synthetic story: my former landlord threatened me when I asked for my $1,500 deposit back in June 2026. I am scared to go back there. I have the lease.",
  civil: "Synthetic story: my former business partner threatened me after I asked for the $80,000 he owes me under our agreement in May 2026. I am afraid of him. I have the agreement.",
  family: "Synthetic story: we separated in May 2026. He threatened me in front of our son, age 6, and I am scared to meet him alone. I want a parenting order.",
};
const CALM: Record<Court, string> = {
  "small-claims": "Synthetic story: my former landlord kept my $1,500 deposit when I moved out in June 2026. I have the lease.",
  civil: "Synthetic story: my former business partner owes me $80,000 under our agreement from May 2026. I have the agreement.",
  family: "Synthetic story: we separated in May 2026 and cannot agree on parenting time for our son, age 6.",
};

type Rows = Map<string, Record<string, unknown>>;

/** From the home page, as a person starts: the city, the story, Continue, the first-use notice. */
async function startFromHome(page: Page, court: Court, story: string, situation: SituationAnswers = STARTING_NOTHING_FILED): Promise<Rows> {
  await grantSiteAccess(page);
  await autoAnswerSituation(page, situation);
  const account = await fakeAccount(page);
  await serveFromThisCommit(page, court, account.rows as unknown as Rows);
  await page.goto(`/?path=${court}`);
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("City or municipality").fill("Sudbury");
  await page.getByLabel("Tell us what happened in your own words").fill(story);
  await page.getByRole("button", { name: `Continue to ${AREA[court]} intake` }).click();
  await page.waitForURL(/\/builder\?/, { timeout: 60_000 });
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(page.getByTestId("intake-review")).first()).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await expect(page.getByTestId("intake-review")).toBeVisible({ timeout: 60_000 });
  return account.rows as unknown as Rows;
}

/** The first-use notice, whenever it shows (it can appear after the page has drawn). */
async function passNotice(page: Page, then: ReturnType<Page["getByTestId"]>) {
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  await expect(acknowledgement.or(then).first()).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
}

/** The route the person takes: the questions one at a time, or the form. Then the review. */
async function takeRoute(page: Page, court: Court, route: "questions" | "form") {
  await passNotice(page, court === "small-claims" ? page.getByRole("button", { name: "Fill in the form yourself" }) : page.getByTestId("guided-form-chat"));
  if (court === "small-claims") {
    await page.getByRole("button", { name: route === "form" ? "Fill in the form yourself" : /Answer questions one at a time/ }).click();
    if (route === "form") {
      const save = page.locator('[data-testid$="story-save"]:visible').first();
      if ((await save.count()) && (await save.isEnabled())) await save.click();
    }
  } else if (route === "form") {
    await page.getByTestId("guided-form-show-form").click();
  } else {
    await expect(page.getByTestId("guided-form-chat")).toBeVisible({ timeout: 60_000 });
  }
  if ((await page.getByTestId("intake-review").getAttribute("data-phase")) !== "reviewing") await page.getByTestId("intake-start-review").click();
  await expect(page.getByTestId("intake-review")).toHaveAttribute("data-phase", "reviewing");
}

async function openCasePage(page: Page, rows: Rows) {
  const row = [...rows.values()][0];
  expect(row?.id, "the case was saved").toBeTruthy();
  await page.goto(`/cases/${row!.id}`);
  await page.waitForLoadState("networkidle").catch(() => {});
}

// ---------------------------------------------------------------------------
// 8. The safety notice.
// ---------------------------------------------------------------------------
for (const court of ["small-claims", "civil", "family"] as const) {
  for (const route of ["questions", "form"] as const) {
    test(`8. ${AREA[court]} (${route}): a story with threats and fear shows the safety notice on the first screen, once: not again on the case page`, async ({ page }) => {
      test.setTimeout(240_000);
      const rows = await startFromHome(page, court, DANGER[court]);
      const notice = page.getByTestId("safety-notice");
      await expect(notice, "the first screen after the story shows the safety notice").toBeVisible();
      await expect(notice).toContainText("911");
      await expect(notice).toContainText("Victim Support Line: 1-888-579-2888");
      await takeRoute(page, court, route);
      await confirmAndShowNextStep(page);
      if (court === "family") await expect(page.getByTestId("family-safety-resources"), "the Family support box is open on the results page").toHaveAttribute("open", "");
      await openCasePage(page, rows);
      await expect(page.getByTestId("case-file").or(page.getByText("Where your case is")).first()).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("safety-notice"), "not shown again on the case page for the same words").toHaveCount(0);
      await expect(page.getByTestId("safety-footer-line"), "the 911 footer line is still there").toContainText("If you feel you are in immediate danger, call 911");
      if (court === "family") await expect(page.getByTestId("family-safety-resources"), "the Family support box is open on the case page").toHaveAttribute("open", "");
    });

    test(`8. ${AREA[court]} (${route}): a story with no threats, fear or violence shows no safety notice anywhere`, async ({ page }) => {
      test.setTimeout(240_000);
      const rows = await startFromHome(page, court, CALM[court]);
      await expect(page.getByTestId("safety-notice")).toHaveCount(0);
      await takeRoute(page, court, route);
      await confirmAndShowNextStep(page);
      await expect(page.getByTestId("safety-notice"), "none on the results page").toHaveCount(0);
      await openCasePage(page, rows);
      await expect(page.getByTestId("case-file").or(page.getByText("Where your case is")).first()).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("safety-notice"), "none on the case page").toHaveCount(0);
    });
  }
}

// ---------------------------------------------------------------------------
// 8b. The emergency notice's rule (site owner, 2026-10-30): only when the person says they
// are in danger, afraid for their safety, or threatened or hurt now. Not for a legal
// threat, not for a Family case on its own. The footer line and /support are there for
// everyone. The decision is storyNamesPresentDanger (dangerWords.ts), the one rule every
// SafetyNotice reads; the terminal suite test:safety-footer holds it to the same cases.
// ---------------------------------------------------------------------------
const NOTICE_CASES: { name: string; court: Court; story: string; shows: boolean }[] = [
  { name: "(a) a threat and fear now", court: "small-claims", shows: true,
    story: "Synthetic story: He threatened me and I'm scared. He owes me $2,000 for the car I sold him in May 2026. I have the bill of sale." },
  { name: "(b) not safe at home", court: "family", shows: true,
    story: "Synthetic story: we separated in May 2026 and I don't feel safe at home. I want a parenting order for our son, age 6." },
  { name: "(c) a legal threat only", court: "small-claims", shows: false,
    story: "Synthetic story: The customer threatened to sue me over the invoice. I finished his renovation in April 2026 and he has not paid me the $4,000 balance. I have the invoice." },
  { name: "(d) a Family case with no danger", court: "family", shows: false,
    story: "Synthetic story: our relationship ended last year. We have two children, ages 4 and 7, who live with me. I want child support; he has paid nothing since March 2026." },
];
for (const entry of NOTICE_CASES) {
  test(`8b. ${AREA[entry.court]} ${entry.name}: the emergency notice ${entry.shows ? "shows" : "does not show"}; the footer line and the support lines are there`, async ({ page }) => {
    test.setTimeout(180_000);
    await startFromHome(page, entry.court, entry.story);
    const footer = page.getByTestId("safety-footer-line");
    await expect(footer, "(e) the footer line").toContainText("If you feel you are in immediate danger, call 911");
    await page.waitForLoadState("networkidle").catch(() => {});
    if (entry.shows) {
      await expect(page.getByTestId("safety-notice"), "the first screen after the story shows the notice").toBeVisible();
      await expect(page.getByTestId("safety-notice")).toContainText("911");
    } else {
      await expect(page.getByTestId("safety-notice"), "no emergency notice").toHaveCount(0);
    }
    await footer.getByRole("link", { name: "Other support lines" }).click();
    await page.waitForURL(/\/support$/, { timeout: 60_000 });
    await expect(page.getByTestId("support-lines"), "(e) the support lines page").toContainText("Assaulted Women's Helpline: 1-866-863-0511");
  });
}

// ---------------------------------------------------------------------------
// 9. A failed next step is never silent.
// ---------------------------------------------------------------------------
for (const route of ["questions", "form"] as const) {
  test(`9. Small Claims (${route}): a next step that fails shows a plain message and Try again, and Try again gets it`, async ({ page }) => {
    test.setTimeout(240_000);
    await startFromHome(page, "small-claims", CALM["small-claims"]);
    await takeRoute(page, "small-claims", route);
    let failing = true;
    await page.route("**/api/small-claims/analyze", async (request) => {
      if (failing) return request.fulfill({ status: 500, json: { ok: false, error: "Synthetic failure." } });
      return request.fallback();
    });
    const panel = page.getByTestId("intake-review");
    const unknowns = panel.locator('input[data-testid="intake-unknown"]:not(:checked)');
    while (await unknowns.count()) { const count = await unknowns.count(); await unknowns.first().check(); await expect(unknowns).toHaveCount(count - 1); }
    await page.getByTestId("intake-review-acknowledgement").check();
    await page.getByTestId("intake-confirm").click();
    await expect(panel).toHaveAttribute("data-phase", "user-confirmed");
    await page.getByRole("button", { name: /^(Continue to your next steps|Show my next step)$/ }).first().click();
    const retry = page.getByRole("button", { name: "Try again" }).first();
    await expect(retry, "a failed next step offers Try again").toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId("next-step-error").or(page.getByTestId("guided-analysis-error")).or(page.getByTestId("analysis-retry")).first(), "and says so").toBeVisible();
    await expect(page.getByTestId("completed-case-overview")).toHaveCount(0);
    failing = false;
    await retry.click();
    await expect(page.getByTestId("completed-case-overview"), "Try again gets the next step").toBeVisible({ timeout: 90_000 });
  });
}

// ---------------------------------------------------------------------------
// 10. Change never leaves the papers picture stuck.
// ---------------------------------------------------------------------------
test("10. Change from starting a case to served: the papers question moves on after a picture is picked, without a refresh", async ({ page }) => {
  test.setTimeout(180_000);
  await openBuilder(page, "small-claims");
  await autoAnswerSituation(page, false);
  await page.getByTestId("situation-change").click();
  const gate = page.getByTestId("situation-questions");
  await expect(gate).toHaveAttribute("data-question", "where");
  await gate.locator('[data-testid="situation-option"][data-value="served"]').click();
  await expect(gate).toHaveAttribute("data-question", "papers");
  await gate.locator('[data-testid="situation-paper"][data-value="small-claims-7A"]').click();
  await expect(gate, "the papers picture does not stay on screen").not.toHaveAttribute("data-question", "papers", { timeout: 10_000 });
  await expect(gate).toHaveAttribute("data-question", "received");
  await gate.getByTestId("situation-date-input").fill("October 20, 2026");
  await gate.getByTestId("situation-date-save").click();
  await expect(gate).toHaveAttribute("data-question", "stage");
  await gate.locator('[data-testid="situation-option"][data-value="just-served"]').click();
  await expect(page.getByTestId("situation-line")).toContainText(/Plaintiff.s Claim \(Form 7A\)/);
  await expect(page.getByTestId("situation-paper")).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// 11. The court's own words on the stage card.
// ---------------------------------------------------------------------------
test("11. A Family case already going with a case conference: the stage card says case conference, never settlement conference", async ({ page }) => {
  test.setTimeout(240_000);
  await startFromHome(page, "family", "Synthetic story: I filed an Application about parenting time in July 2026. We have a case conference on December 3, 2026.", { where: "going", started: "me", stage: "family:both:case-conference-scheduled" });
  await takeRoute(page, "family", "form");
  await confirmAndShowNextStep(page);
  const recorded = page.getByTestId("stage-confirmed");
  await expect(recorded).toBeVisible({ timeout: 60_000 });
  await expect(recorded).toContainText(/case conference/i);
  await expect(recorded).not.toContainText(/settlement conference is coming up/i);
});

// ---------------------------------------------------------------------------
// 12. The small fixes.
// ---------------------------------------------------------------------------
test("12. A day served after today is refused, with a plain reason", async ({ page }) => {
  test.setTimeout(120_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, false);
  await page.goto("/builder?path=small-claims");
  const notice = page.getByTestId("acknowledgement-checkbox");
  const gate = page.getByTestId("situation-questions");
  await expect(notice.or(gate).first()).toBeVisible({ timeout: 60_000 });
  if (await notice.isVisible()) { await notice.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await gate.locator('[data-testid="situation-option"][data-value="served"]').click();
  await gate.locator('[data-testid="situation-paper"][data-value="small-claims-7A"]').click();
  const next = new Date();
  next.setFullYear(next.getFullYear() + 1);
  await gate.getByTestId("situation-date-input").fill(next.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }));
  await gate.getByTestId("situation-date-save").click();
  await expect(gate.getByTestId("situation-date-needs-more")).toContainText("after today");
  await expect(gate).toHaveAttribute("data-question", "received");
});

test("12. A blank city says what is missing", async ({ page }) => {
  test.setTimeout(120_000);
  await grantSiteAccess(page);
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 60_000 });
  await page.getByLabel("Tell us what happened in your own words").fill(CALM["small-claims"]);
  await expect(page.getByTestId("location-missing")).toContainText("city or municipality");
  await expect(page.getByRole("button", { name: "Continue to Small Claims intake" })).toBeDisabled();
});

/** A day N days before today, as the person types it ("October 21, 2026"). */
const daysAgo = (n: number) => { const day = new Date(); day.setDate(day.getDate() - n); return day.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); };

for (const [label, ago, listed] of [["still running", 2, true], ["passed", 40, false]] as const) {
  test(`12. Civil, served ${ago} days ago (time to defend ${label}): Form 18B is ${listed ? "listed" : "not listed"}`, async ({ page }) => {
    test.setTimeout(240_000);
    await startFromHome(page, "civil", "Synthetic story: Test Equipment Ltd. is suing me for $80,000 and I was served with a Statement of Claim. I have the purchase agreement.", { where: "served", papers: "civil-14A", receivedOn: daysAgo(ago) });
    await takeRoute(page, "civil", "form");
    await confirmAndShowNextStep(page);
    const card = page.getByTestId("next-step-card").first();
    await expect(card).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(1_500);
    if (listed) await expect(card.getByTestId("next-step-forms"), "the notice of intent to defend is offered while the time runs").toContainText("Form 18B");
    else {
      // Never offered once the time to defend has passed: not in the forms to use, and not its filing fee.
      await expect(card.getByTestId("next-step-forms"), "the form list does not offer Form 18B").not.toContainText("Form 18B");
      await expect(card.getByTestId("next-step-practical"), "nor its filing fee").not.toContainText("Filing a notice of intent to defend");
      await expect(card, "nor the step's sentence about it, anywhere on the card").not.toContainText("Form 18B");
    }
  });
}

test("12. At phone width nothing pushes the page sideways, and the top line stays in view while scrolling", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const rows = await startFromHome(page, "small-claims", CALM["small-claims"]);
  const wide = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(await wide(), "the builder fits the screen").toBeLessThanOrEqual(1);
  await takeRoute(page, "small-claims", "form");
  await confirmAndShowNextStep(page);
  expect(await wide(), "the results fit the screen").toBeLessThanOrEqual(1);
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(500);
  const line = await page.getByTestId("situation-line").boundingBox();
  expect(line, "the top line is on screen after scrolling").not.toBeNull();
  expect(line!.y).toBeGreaterThanOrEqual(-1);
  expect(line!.y).toBeLessThan(844);
  await openCasePage(page, rows);
  await expect(page.getByTestId("case-file").or(page.getByText("Where your case is")).first()).toBeVisible({ timeout: 60_000 });
  expect(await wide(), "the case page fits the screen").toBeLessThanOrEqual(1);
});
