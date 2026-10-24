/**
 * The situation questions come before the story, in every area, and are never asked again (step 2).
 *
 *   - before the story: where the person is; for a case going, whether they started it;
 *     if served, which papers by the top of their first page (the court's own pictures)
 *     and the day, with the year asked, never guessed;
 *   - the top line repeats the answers with a Change link, and Change opens them again;
 *   - the side is not asked again by the questions one at a time (civil, Family) or on
 *     the forms (Small Claims, civil, Family);
 *   - the story is a cross-check: a contradiction is asked about, never applied;
 *   - papers from another court ask which court, never switch it.
 *
 * Failure it exists to catch: the side, "filed" or the day served asked again after
 * these questions, or the story overriding what the person said.
 */
import { expect, test } from "@playwright/test";
import { openBuilder } from "./harness/builderGate";
import { grantSiteAccess } from "./harness/siteAccess";
import { autoAnswerSituation } from "./harness/situation";
import { FIRST_PAGES } from "../../src/lib/case-system/situation/situation";

test.use({ trace: "retain-on-failure", actionTimeout: 20_000 });

const COURTS = ["small-claims", "civil", "family"] as const;
const FIRST: Record<(typeof COURTS)[number], { papers: string; line: string }> = {
  "small-claims": { papers: "small-claims-7A", line: "You're being sued in Small Claims Court · Plaintiff’s Claim (Form 7A) · served October 6, 2026" },
  civil: { papers: "civil-14A", line: "You're responding to a civil case · Statement of Claim (General) (Form 14A) · served October 6, 2026" },
  family: { papers: "family-8", line: "You're responding to a family case · Application (General) (Form 8) · served October 6, 2026" },
};

for (const court of COURTS) {
  test(`${court}: the situation questions come first; the papers are picked by their first page; the year is asked; the top line and Change`, async ({ page }) => {
    test.setTimeout(120_000);
    await grantSiteAccess(page);
    await autoAnswerSituation(page, false);
    await page.goto(`/?path=${court}`);
    const gate = page.getByTestId("situation-questions");
    await expect(gate).toHaveAttribute("data-question", "where", { timeout: 60_000 });
    await expect(page.getByLabel("Tell us what happened in your own words")).toHaveCount(0);

    await gate.locator('[data-testid="situation-option"][data-value="served"]').click();
    await expect(gate).toHaveAttribute("data-question", "papers");
    await expect(gate.getByTestId("situation-paper")).toHaveCount(FIRST_PAGES.filter((page) => page.court === court).length);
    await expect(gate.getByRole("img").first()).toHaveAttribute("alt", /^Top of the first page of Form /);
    await gate.locator(`[data-testid="situation-paper"][data-value="${FIRST[court].papers}"]`).click();

    await expect(gate).toHaveAttribute("data-question", "received");
    await gate.getByTestId("situation-date-input").fill("Oct 6");
    await gate.getByTestId("situation-date-save").click();
    await expect(gate.getByTestId("situation-date-needs-more")).toContainText("add the year");
    await gate.getByTestId("situation-date-input").fill("October 6, 2026");
    await gate.getByTestId("situation-date-save").click();

    await expect(gate).toHaveCount(0);
    await expect(page.getByTestId("situation-line")).toContainText(FIRST[court].line);
    await expect(page.getByLabel("Tell us what happened in your own words")).toBeVisible();

    await page.getByTestId("situation-change").click();
    await expect(gate).toHaveAttribute("data-question", "where");
    await expect(gate.locator('[data-testid="situation-option"][data-value="served"]')).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("situation-change-done").click();
    await expect(page.getByTestId("situation-line")).toContainText(FIRST[court].line);

    // Kept across a reload: the person's own answers, not the page's state.
    await page.reload();
    await expect(page.getByTestId("situation-line")).toContainText(FIRST[court].line, { timeout: 60_000 });
  });
}

for (const court of ["civil", "family"] as const) {
  test(`${court}: the questions one at a time never ask the side again`, async ({ page }) => {
    test.setTimeout(120_000);
    await openBuilder(page, court, {
      story: court === "family" ? "Synthetic: my former partner wants parenting time with our child." : "Synthetic: a supplier says I owe them for equipment.",
      situation: { where: "served", papers: FIRST[court].papers, receivedOn: "October 6, 2026" },
    });
    await expect(page.getByTestId("situation-line")).toContainText(FIRST[court].line);
    const roleQuestion = court === "family" ? "Are you starting a family case, or responding to one the other person started?" : "Are you suing someone, or is someone suing you?";
    // The chat's next question is asked, and it is never the side.
    const question = page.getByTestId("guided-form-question").last();
    await expect(question).toBeVisible({ timeout: 60_000 });
    await expect(question).not.toHaveText(roleQuestion);
    await expect(page.getByText(roleQuestion, { exact: true })).toHaveCount(0);
  });
}

test("small-claims: the form shows the side from the situation answers, with no role to choose", async ({ page }) => {
  test.setTimeout(120_000);
  await openBuilder(page, "small-claims", { situation: { where: "served", papers: "small-claims-7A", receivedOn: "October 6, 2026" } });
  await page.getByRole("button", { name: "Fill in the form yourself" }).click();
  await expect(page.getByTestId("sc-intake-yourRole-from-start")).toContainText("Defendant / responding party");
  await expect(page.getByTestId("sc-intake-yourRole")).toHaveCount(0);
});

test("family: a story that says the other side is asked about, never applied", async ({ page }) => {
  test.setTimeout(120_000);
  await openBuilder(page, "family", { story: "Synthetic: I was served with an application by my former partner.", situation: { where: "starting", filed: "nothing" } });
  const check = page.getByTestId("situation-cross-check");
  await expect(check).toContainText("sounds like you are responding to a case");
  await expect(check).toContainText("You told us you are bringing the case");
  await expect(page.getByTestId("situation-line")).toContainText("You're bringing a family case");
  await check.getByTestId("situation-cross-check-keep").click();
  await expect(check).toHaveCount(0);
  await expect(page.getByTestId("situation-line")).toContainText("You're bringing a family case");
});

test("small-claims: papers from another court ask which court, and never switch it", async ({ page }) => {
  test.setTimeout(120_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, false);
  await page.goto("/?path=small-claims");
  const gate = page.getByTestId("situation-questions");
  await expect(gate).toHaveAttribute("data-question", "where", { timeout: 60_000 });
  await gate.locator('[data-testid="situation-option"][data-value="served"]').click();
  await gate.getByTestId("situation-papers-other-courts").click();
  await gate.locator('[data-testid="situation-paper"][data-value="civil-14A"]').click();
  await gate.getByTestId("situation-date-input").fill("October 6, 2026");
  await gate.getByTestId("situation-date-save").click();
  await expect(gate).toHaveAttribute("data-question", "court");
  await expect(gate.getByTestId("situation-court-differs")).toContainText("The papers you picked are from a civil court, and you started in Small Claims");
  // Still Small Claims until the person picks.
  expect(new URL(page.url()).searchParams.get("path")).toBe("small-claims");
});
