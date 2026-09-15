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

export type BuilderPath = "family" | "small-claims" | "civil";

const PATH_LABEL: Record<BuilderPath, string> = {
  family: "Family",
  "small-claims": "Small Claims",
  civil: "Civil",
};

/**
 * Site access, then `/builder?path=<path>`, then through the location gate.
 *
 * `story` is required on every path except small-claims, where the gate does
 * not render the field — the button stays disabled without it, so passing it
 * is not optional decoration.
 */
export async function openBuilder(
  page: Page,
  path: BuilderPath,
  options: { city?: string; story?: string } = {},
): Promise<void> {
  const city = options.city ?? "Sudbury";
  const story = options.story ?? "";

  await grantSiteAccess(page);
  await page.goto(`/builder?path=${path}`, { waitUntil: "domcontentloaded" });

  // The gate renders nothing until the mount effect has run — the hydration
  // defence in app/builder/page.tsx, which shows "Preparing a private case
  // start…" until React has attached its handlers. Waiting for the select is
  // waiting for that, without asserting on the mechanism.
  const province = page.getByLabel("Province or territory");
  await expect(province).toBeVisible({ timeout: 60_000 });

  await province.selectOption("Ontario");
  await page.getByLabel("City or municipality").fill(city);

  if (path !== "small-claims") {
    await page.getByLabel("Tell us what happened in your own words").fill(story);
  }

  const button = page.getByRole("button", {
    name: `Continue with ${PATH_LABEL[path]} questions`,
  });
  await expect(
    button,
    "the gate's Continue button is disabled — it requires Ontario, a non-empty " +
      "city, and on every path but small-claims a non-empty story",
  ).toBeEnabled();

  await button.click();
}
