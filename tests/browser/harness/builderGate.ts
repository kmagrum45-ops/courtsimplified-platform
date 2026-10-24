/**
 * Gets a spec past the builder's own location gate and onto the path's screens.
 *
 * WHY THIS IS NOT THE EXISTING HELPER. `family-adoption.spec.ts` reaches the
 * family path through `/` — the HomeLocationGate — whose button reads "Continue
 * to Family intake". `/builder?path=family` has a SECOND, separate gate with
 * its own markup and its own button, "Continue with Family questions". Nothing
 * in the harness crossed that one, so every screen mounted behind
 * `confirmedLocation` in app/builder/page.tsx was unreachable from a browser
 * test: the family triage, the family intake, the child support screen and the
 * table card, the Small Claims mode chooser and both its intakes, and the civil
 * intake.
 *
 * NO SIGN-IN. Deliberate, and it is not laziness — it is what the screen
 * actually needs. The child support screen holds its own state and builds its
 * own draft through a pure function; it makes no API call, so there is no
 * server-side token to validate. `intakeDriver.authenticateRealTestUser` mints
 * a real Supabase session because the ANALYZE routes validate one server-side,
 * which Playwright cannot intercept. Nothing here reaches those routes.
 *
 * The saving: no user row is created, so there is none to delete, and a failed
 * teardown cannot leave state for the next run to pass on. Specs that DO need a
 * session should keep using the intakeDriver helper.
 */

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { grantSiteAccess } from "./siteAccess";
import { answerSituation, autoAnswerSituation, situationAnswersFor, STARTING_NOTHING_FILED, type SituationAnswers } from "./situation";

export type BuilderPath = "family" | "small-claims" | "civil";

const PATH_LABEL: Record<BuilderPath, string> = {
  family: "Family",
  "small-claims": "Small Claims",
  civil: "Civil",
};

/**
 * Site access, then `/builder?path=<path>`, then through the location gate.
 *
 * Location is collected at the gate. A supplied Family/Civil story is then
 * answered through the intake's own first question.
 */
export async function openBuilder(
  page: Page,
  path: BuilderPath,
  options: { city?: string; story?: string; situation?: SituationAnswers } = {},
): Promise<void> {
  const city = options.city ?? "Sudbury";
  const story = options.story ?? "";

  await grantSiteAccess(page);
  // A spec that set the page's situation answers (autoAnswerSituation) keeps them unless it passes others.
  await autoAnswerSituation(page, options.situation ?? STARTING_NOTHING_FILED, options.situation === undefined);
  await page.goto(`/builder?path=${path}`, { waitUntil: "domcontentloaded" });

  // The gate renders nothing until the mount effect has run — the hydration
  // defence in app/builder/page.tsx, which shows "Preparing a private case
  // start…" until React has attached its handlers. Waiting for the select is
  // waiting for that, without asserting on the mechanism.
  const province = page.getByLabel("Province or territory");
  const acknowledgement = page.getByTestId("acknowledgement-checkbox");
  const situation = page.getByTestId("situation-questions");
  await expect(province.or(acknowledgement).or(situation)).toBeVisible({ timeout: 60_000 });
  if (await acknowledgement.isVisible()) {
    await acknowledgement.check();
    await page.getByTestId("acknowledgement-continue").click();
  }
  // The situation questions come before the story and the location (step 2).
  await expect(province.or(situation)).toBeVisible({ timeout: 60_000 });
  await answerSituation(page, situationAnswersFor(page));
  await expect(province).toBeVisible({ timeout: 60_000 });

  await province.selectOption("Ontario");
  await page.getByLabel("City or municipality").fill(city);

  // The gate's button text is NOT uniform across paths. app/builder/page.tsx:
  //   courtPath === "small-claims" ? "Continue" : `Continue with ${label} questions`
  //
  // This helper claimed to support all three paths from the day it was written
  // and had only ever been run on family, so the small-claims branch was wrong
  // and nothing said so — the same untested-branch shape as everything else
  // found today. Exact match, so "Continue" does not also match the family
  // button.
  const button =
    path === "small-claims"
      ? page.getByRole("button", { name: "Continue", exact: true })
      : page.getByRole("button", { name: `Continue with ${PATH_LABEL[path]} questions` });
  await expect(
    button,
    "the gate's Continue button is disabled — it requires Ontario, a non-empty " +
    "city",
  ).toBeEnabled();

  await button.click();
  // The location gate now asks only location on every path. Family and Civil
  // collect the story as their first intake question.
  if (path !== "small-claims" && story) {
    const question = page.getByTestId("guided-form-question");
    await expect(question).toHaveAttribute("data-key", "facts");
    await question.getByRole("textbox").fill(story);
    await question.getByTestId("guided-form-next").click();
  }
}
