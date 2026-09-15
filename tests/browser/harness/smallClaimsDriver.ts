/**
 * Drives the Small Claims form intake from the builder gate to the overview.
 *
 * *** THIS DRIVER REACHES THE INTAKE FORM. IT DOES NOT REACH THE OVERVIEW. ***
 *
 * Established by running it, after a plan that read correctly and was wrong:
 *
 * `/api/small-claims/analyze` gates external cognition on
 * `authenticated && hasExternalAiKey()` (route.ts:289), so an unauthenticated
 * request would run the engine deterministically — free, and asserting the
 * product rather than a stub. That part is true.
 *
 * What it misses is that **the request is never made**.
 * `SmallClaimsIntake.handleAnalyze` (line 679) calls
 * `supabase.auth.getSession()` and returns early without a session, setting
 * `authRequired`. Session 19, deliberate and documented there: the safety check
 * has no deterministic fallback, so a guest submission would skip it silently.
 * Guided mode requires authentication for the same reason.
 *
 * So the two conditions are mutually exclusive. Signed out, there is no
 * analysis at all. Signed in, external cognition is on and the run costs real
 * model calls. There is no free path to the overview, and a probe run confirmed
 * it: zero `/api/` requests after clicking Generate Summary.
 *
 * WHAT THIS COVERS: the gate, the mode chooser, and the intake form — every
 * field, by testid. That is where SC-2's and SC-3's inputs are entered and it
 * is genuinely useful, but it stops at the button.
 *
 * WHAT REACHING THE OVERVIEW WOULD TAKE, recorded so the next attempt does not
 * re-derive it: a real session via `mintRealTestSession`, plus a decision about
 * the analyze call. Stubbing it is less compromised than it first appears —
 * `IntelligenceOverviewPanel` reads the amount from `intake` (`caseData`, the
 * user's own form) and not from the analysis, so SC-2's central assertion would
 * still be about the product. Assertions about analysis-DERIVED content would
 * not be. That distinction is the decision, and it has not been made.
 *
 * TESTIDS, NOT LABELS. Every control is addressed by `sc-intake-<field>`, added
 * in 8fca313 and derived from the `updateField(...)` call the control already
 * makes. Addressing them by visible label would break when someone reworded
 * one for clarity — a false failure on a change that should be free.
 */

import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

import { openBuilder } from "./builderGate";

/** Every field the form intake accepts, by its own field name. */
export type SmallClaimsIntakeFields = Partial<{
  caseStage: string;
  yourRole: string;
  yourName: string;
  otherParty: string;
  facts: string;
  timeline: string;
  evidence: string;
  missingEvidence: string;
  goal: string;
  amountClaimed: string;
  damagesBreakdown: string;
  yourAddress: string;
  yourEmail: string;
  yourPostalCode: string;
  defendantAddress: string;
  serviceDetails: string;
  agreementDetails: string;
  paymentHistory: string;
  settlementEfforts: string;
  defenceResponse: string;
  deadlineDetails: string;
  urgent: string;
}>;

/** Fields rendered as <select>; everything else is typed into. */
const SELECTS = new Set(["caseStage", "yourRole"]);

/**
 * Gate → "Fill in the form yourself" → the intake form.
 *
 * The mode chooser's buttons carry no testid and are matched on their heading
 * text. That is acceptable where a testid is not: the heading IS the choice a
 * user makes, so rewording it is a change to the decision being tested, not
 * incidental copy.
 */
export async function openSmallClaimsForm(
  page: Page,
  options: { city?: string; story?: string } = {},
): Promise<void> {
  await openBuilder(page, "small-claims", { city: options.city ?? "London" });

  const chooseForm = page.getByRole("button", { name: /Fill in the form yourself/i });
  await expect(chooseForm).toBeVisible({ timeout: 60_000 });
  await chooseForm.click();

  // The analyze button alone. An `.or()` of two controls is a strict-mode
  // violation once both are present, and the button is the one thing the form
  // always has.
  await expect(page.getByTestId("sc-intake-analyze")).toBeVisible({ timeout: 60_000 });

  if (options.story) await setStory(page, options.story);
}

/**
 * The story field is behind an "Edit case story" toggle, because the intake
 * shows it as prose by default. Opening it is part of filling it in.
 */
export async function setStory(page: Page, story: string): Promise<void> {
  const field = page.getByTestId("sc-intake-facts");
  if (!(await field.isVisible().catch(() => false))) {
    await page.getByTestId("sc-intake-edit-story").click();
  }
  await field.fill(story);
}

/** Fills the named fields and leaves everything else alone. */
export async function fillSmallClaimsIntake(
  page: Page,
  fields: SmallClaimsIntakeFields,
): Promise<void> {
  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined) continue;

    if (name === "facts") {
      await setStory(page, value);
      continue;
    }

    const control = page.getByTestId(`sc-intake-${name}`);
    await expect(
      control,
      `no control with testid sc-intake-${name} — the field name must match the ` +
        "updateField() call in SmallClaimsIntake.tsx",
    ).toBeVisible({ timeout: 20_000 });

    if (SELECTS.has(name)) await control.selectOption(value);
    else await control.fill(value);
  }
}

/**
 * Clicks Generate Summary. Does NOT wait for an overview — see the file header.
 *
 * Signed out this produces no request at all: `handleAnalyze` returns early
 * without a session. A helper that waited for the overview here would hang for
 * its full timeout and then report something false about why.
 */
export async function clickGenerateSummary(page: Page): Promise<void> {
  const analyze = page.getByTestId("sc-intake-analyze");
  await expect(analyze).toBeEnabled({ timeout: 20_000 });
  await analyze.click();
}

/**
 * Whether the intake is asking the user to sign in, which is what a guest gets
 * instead of an analysis. Exposed so a spec can assert that deliberate
 * behaviour rather than time out against it.
 */
export async function awaitAuthRequired(page: Page): Promise<void> {
  await expect(
    page.getByText(/sign in|signed in|create an account/i).first(),
    "signed out, Generate Summary should ask for a session — SmallClaimsIntake " +
      "line 679, because the safety check has no deterministic fallback",
  ).toBeVisible({ timeout: 30_000 });
}
