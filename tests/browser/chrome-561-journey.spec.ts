/**
 * CHROME'S RUN 1 OF #561, SMALL CLAIMS, AS A GUEST: THE QUESTION LOG (site owner, 23 Nov 2026, the one-asker rebuild).
 *
 * Chrome's exact story and city, given on the home page as a guest (no AI, no data leaves the site), then "Fill in the
 * form yourself", every offer the page makes taken with Yes (as a person whose story is right), then the review. The
 * ask-once recorder (harness/askOnce.ts) records every question shown on every screen; harness/questionLog.ts writes the
 * plain-text QUESTION LOG (question-logs/sc-chrome561-guest.txt: the screen, the fact id, whether the record held it at
 * that moment) and its verdicts. Fails on any question asked while the record held its fact, any fact shown twice, and
 * any question that names no fact (fail closed).
 *
 * The signed-in run is the ask-once suite's story "sc-chrome561-kitchen" (ask-once-pages.spec.ts), which writes its own
 * log. QUESTION_LOG_ONLY=1 writes the log without failing: the "before" logs, run on #561's code (the journey workflow).
 *
 * WHAT FAILURE THIS CATCHES: a guest asked for what their story already says (Chrome 1.4: eight facts), or anything twice.
 */
import { expect, test } from "@playwright/test";
import { STORY_LABEL } from "../../src/lib/case-system/copy/storyGuidance";
import { grantSiteAccess } from "./harness/siteAccess";
import { autoAnswerSituation, STARTING_NOTHING_FILED } from "./harness/situation";
import { recordAsks } from "./harness/askOnce";
import { writeQuestionLog } from "./harness/questionLog";

test.use({ trace: "off", screenshot: "off", navigationTimeout: 120_000, actionTimeout: 45_000 });

/** Chrome's story, word for word (test of #561, run 1). */
export const CHROME_561_SC = "TEST Tess Plaintiff, Ottawa, hired TEST Fakebuild Contracting Inc., Ottawa, in January 2026 to renovate a kitchen. I paid $5,468.45. The work was not finished and I want my money back.";

test("Chrome #561 run 1, Small Claims, guest: no fact the story gives is asked, nothing twice, every question names its fact", async ({ page }) => {
  test.setTimeout(420_000);
  await grantSiteAccess(page);
  await autoAnswerSituation(page, STARTING_NOTHING_FILED);
  const events = await recordAsks(page);
  await page.goto("/?path=small-claims");
  await expect(page.getByTestId("court-path-location-gate-ready")).toBeVisible({ timeout: 120_000 });
  await page.getByLabel("City or municipality").fill("Ottawa");
  await page.getByLabel(STORY_LABEL, { exact: true }).fill(CHROME_561_SC);
  await page.getByRole("button", { name: "Continue to Small Claims intake" }).click();
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  const form = page.getByRole("button", { name: "Fill in the form yourself" });
  await expect(acknowledgement.or(form).first()).toBeVisible({ timeout: 120_000 });
  if (await acknowledgement.isVisible().catch(() => false)) { await acknowledgement.check(); await page.getByTestId("acknowledgement-continue").click(); }
  await form.click();
  await page.waitForTimeout(6_000);
  // Every offer the page makes, taken with Yes: the story's values are right (Chrome's story).
  for (let i = 0; i < 20; i += 1) {
    const yes = page.locator("[data-use-suggestion]").first();
    if (!(await yes.isVisible().catch(() => false))) break;
    await yes.click();
    await page.waitForTimeout(1_000);
  }
  // A person or a company, for each party the page still asks it of: the story says (Inc. is a company).
  for (const kind of await page.getByTestId("parties-kind").all()) {
    const label = (await kind.getAttribute("aria-label")) ?? "";
    await kind.getByTestId(/Inc\.|Ltd\./.test(label) ? "parties-kind-company" : "parties-kind-person").click().catch(() => {});
  }
  const review = page.getByTestId("intake-start-review");
  if (await review.isVisible({ timeout: 15_000 }).catch(() => false)) { await review.click(); await page.waitForTimeout(6_000); }
  const result = writeQuestionLog("sc-chrome561-guest", "Chrome #561 run 1, Small Claims, guest (story to the review)", events);
  console.log(`QUESTION LOG sc-chrome561-guest: ${result.lines.length} shown; held ${result.held.length}; twice ${result.twice.length}; no fact ${result.noFact.length}`);
  if (process.env.QUESTION_LOG_ONLY === "1") return;
  expect(result.held, "no question asked while the record held its fact").toEqual([]);
  expect(result.twice, "no fact shown twice").toEqual([]);
  expect(result.noFact, "every question names its fact (fail closed)").toEqual([]);
});
