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
import { authStorageKey, deleteHarnessUser, mintRealTestSession } from "./realTestSession";

/**
 * A fresh harness user, and the id so the spec can delete it.
 *
 * Must be called BEFORE the first navigation — it works by seeding
 * localStorage through an init script, which only applies to pages loaded
 * afterwards.
 *
 * A session is required to reach an analysis at all (see the header), so this
 * is not optional for any spec that gets past the intake form.
 */
export async function signInHarnessUser(page: Page): Promise<string> {
  const session = await mintRealTestSession();

  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    {
      key: authStorageKey(session.supabaseUrl),
      value: JSON.stringify(session.session),
    },
  );

  return session.userId;
}

export { deleteHarnessUser };

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

/**
 * ===========================================================================
 * THE ANALYZE STUB — WHAT IT DOES AND DOES NOT COMPROMISE
 * ===========================================================================
 *
 * READ THIS BEFORE ADDING AN ASSERTION TO A SPEC THAT USES IT.
 *
 * *** IT ECHOES THE USER'S OWN INPUT BACK AS `payload`. ***
 *
 * `payload` becomes `caseData`, and `IntelligenceOverviewPanel` reads the
 * amount, parties, story, goal and evidence from `caseData` — NOT from the
 * analysis. So a figure on that panel travelled: the form field the spec typed
 * into → `input` in the POST body → `payload` here → `caseData` → the panel's
 * `textField(intake, "amountClaimed")` → `formatRecordedAmount`. Every step
 * after the stub is real product code, and the stub invents nothing along it.
 *
 * *** NOT COMPROMISED — safe to assert on a spec using this stub ***
 *
 *   - the user's amount, verbatim, qualifiers intact
 *   - that no dollar figure appears which the spec did not type
 *   - that nothing was totalled or otherwise arithmetic'd
 *   - parties, story, goal, evidence, as entered
 *   - the absence of grades, percentages, readiness language
 *   - anything the panel derives from `intake`
 *
 * *** COMPROMISED — an assertion on any of these is TESTING THIS FILE ***
 *
 *   - `detectedIssues`, `legalIssues`, `summary`, `guidance`, `risksAndGaps`,
 *     `missingInformation`, `inferredFacts`
 *   - required/completed/received forms, and anything routed from them
 *   - the claim type, the evidence checklist, court points, common defences
 *   - `reasoningMode`, and anything that differs between the structured-AI and
 *     deterministic paths
 *
 * **An analysis-content assertion added to a spec using this stub would be
 * asserting fiction written here, and it would pass forever regardless of what
 * the product does.** That is not a hypothetical: `aiStubs.ts` carries the same
 * warning in its own header, and the matcher scored 0/10 on real prose for
 * months while panel tests passed against fallback output.
 *
 * If a scenario needs analysis content, it does not belong in a spec using this
 * stub. `npm run test:fixtures` runs the real pipeline, for real cost, and is
 * what covers that.
 *
 * WHY STUBBED AT ALL. Reaching the overview requires a session
 * (SmallClaimsIntake line 679, the safety check has no deterministic
 * fallback), and a session turns external cognition ON — so every unstubbed run
 * would spend real model calls. The intake-derived assertions above are what
 * SC-2 and SC-3 are about, and they are free and honest this way.
 */
export async function stubSmallClaimsAnalyze(page: Page): Promise<{ calls: number }> {
  const state = { calls: 0 };

  await page.route("**/api/small-claims/analyze", async (route) => {
    state.calls += 1;

    const body = route.request().postDataJSON() as {
      input?: Record<string, unknown>;
    };
    const input = body?.input || {};
    const text = (key: string) => String(input[key] ?? "");

    // Everything the panel reads from `intake`, taken from what was POSTed.
    // Nothing here is authored: if the spec typed it, it comes back; if it did
    // not, the field is empty.
    const payload = {
      courtPath: "small-claims",
      pathLabel: "Small Claims",
      caseStage: text("caseStage") || "starting-case",
      yourName: text("yourName"),
      otherParty: text("otherParty"),
      facts: text("facts"),
      timeline: text("timeline"),
      evidence: text("evidence"),
      missingEvidence: text("missingEvidence"),
      goal: text("goal"),
      urgent: text("urgent"),
      // EVERYTHING ELSE GOES IN `extra`, because that is where the panel looks.
      // `IntelligenceOverviewPanel.textField` reads `intake.extra[field]` and
      // nothing else, so `amountClaimed` at the top level would be invisible —
      // which is exactly what happened on the first run, and is the shape of
      // stub infidelity worth watching for: the stub answered, the page
      // rendered, and one field was silently absent.
      extra: { ...input },
      analysis: null as unknown,
    };

    // Deliberately EMPTY rather than plausible. A stub that returned
    // convincing issues and guidance would invite exactly the assertions the
    // header above forbids; empty arrays make it obvious that nothing here is
    // a finding about the case.
    const analysis = {
      courtPath: "small-claims",
      caseStage: payload.caseStage,
      completedForms: [],
      receivedForms: [],
      requiredNextForms: [],
      notNeededNow: [],
      detectedIssues: [],
      inferredFacts: [],
      missingInformation: [],
      risksAndGaps: [],
      guidance: [],
      summary: "",
    };
    payload.analysis = analysis;

    await route.fulfill({
      status: 200,
      json: {
        ok: true,
        result: { analysis, payload },
        reasoningMode: "deterministic-fallback",
        analysisAvailable: false,
        authenticated: true,
      },
    });
  });

  return state;
}
