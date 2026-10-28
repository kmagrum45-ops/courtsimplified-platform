/**
 * KNOWN PROBLEMS FROM THE SITE OWNER'S CHROME RE-TEST OF 29 OCT (flow items C, D, H).
 *
 * Each entry is a problem reproduced by a test that asserts the WANTED property, so
 * the test fails today. Listing it here lets CI stay green while the problem waits
 * for its fix; a NEW failure (not listed) still fails the build.
 *
 * The list must stay honest both ways: when a fix makes a listed test pass, that
 * test fails with "now passes: delete its entry here" (the terminal suite) or
 * "expected to fail, but passed" (Playwright's test.fail). The update is then a
 * one-line deletion with an obvious cause (CLAUDE.md s. 5: a list that must be
 * maintained is fine; a check that punishes the maintenance is not).
 *
 * Read by: scripts/verification/verifyChrome29OctFlow.ts (terminal, free) and
 * tests/browser/retest-29oct-flow.spec.ts (browser).
 */
export type KnownProblem = {
  id: string;
  /** What the person sees, in plain words, and where the cause is. */
  reason: string;
  /** The exact name of the check or test that reproduces it. */
  test: string;
};

export const KNOWN_PROBLEMS_29OCT_FLOW: readonly KnownProblem[] = [
  {
    id: "C-sc-guided-question-saved",
    reason:
      "A question typed into the Small Claims one-at-a-time chat (\"Do I ask for $1,200 or $1,500?\") is kept word for word as the answer and never answered (orchestrateIntakeTurn.ts, the capturesField copy).",
    test: "C: a question typed as a Small Claims guided answer is not silently saved as the answer",
  },
  {
    id: "C-guided-form-question-saved",
    reason:
      "A question typed into a civil or Family one-at-a-time answer box (\"Is there a deadline?\") passes the only check before keeping (GuidedFormChat.tsx answerNeedsMore) and is saved as the answer.",
    test: "C: a question typed into a civil or Family answer box is not kept as the answer without a note",
  },
  {
    id: "D3-explain-repeats-why",
    reason:
      "On the Small Claims form, \"Why does this matter?\" and \"I don't understand this — explain it\" under the amount show the same paragraph: both read the question's own why (questionExplanations.ts).",
    test: "D3: the explain button says something the why line does not already say",
  },
  {
    id: "D3-explain-generic",
    reason:
      "For a question with no why (side, evidence, outcome), the explain button shows the generic \"This question helps us understand your situation\" sentence (questionExplanations.ts GENERIC_FALLBACK).",
    test: "D3: every question offered with an explain button has its own explanation",
  },
  {
    id: "H1-apology-placeholder",
    reason:
      "The Small Claims form's outcome box suggests \"apology\", which the Small Claims Court cannot order (SmallClaimsIntake.tsx placeholder).",
    test: "H1: no Small Claims box suggests an outcome the court cannot order (apology)",
  },
  {
    id: "H2-dispute-one-choice",
    reason:
      "\"What kind of dispute is this?\" allows one choice only, so a case that is both unpaid money and a contract cannot say so (questionBank.ts sc-orient-dispute-category, answerType choice).",
    test: "H2: the kind of dispute can take more than one answer",
  },
  {
    id: "H3-city-lowercase",
    reason:
      "The court-office line repeats the city as typed (\"If your case is in kingston\") instead of the place's own name (nextStepPractical.ts city.trim()).",
    test: "H3: the court-office line names the city with its own capitalisation",
  },
  {
    id: "D1-new-answer-drops-confirmation",
    reason:
      "After \"Stop initial questions and review\" and Confirm, answering one more chat question cancels the confirmation in the browser (IntakeRecovery.tsx put: any material change renews the revision, unlike the server's existingFactChanged), so \"Continue to your next steps\" shows the red \"needs confirming\" line and sends the person back to the review.",
    test: "retest-29oct D1: confirmed early, one more answer, Continue goes to the next step -- small-claims (sc-deck-owed)",
  },
];

export function isKnownProblem(testName: string): boolean {
  return KNOWN_PROBLEMS_29OCT_FLOW.some((problem) => problem.test === testName);
}
