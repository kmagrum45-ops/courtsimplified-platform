/**
 * Known problems from the site owner's Chrome re-test of 29 October (safety,
 * deadlines, Family "which court"), each with a failing check in
 * scripts/verification/verifyChrome29octSafety.ts. An entry is deleted in the
 * same PR that makes its checks pass.
 */
export type KnownProblem = { id: string; reason: string; test: string; checks: string[] };

const SUITE = "scripts/verification/verifyChrome29octSafety.ts";

export const KNOWN_PROBLEMS_29OCT_SAFETY: KnownProblem[] = [
  {
    id: "E1-negated-danger",
    reason:
      "\"No violence. He's a good dad just unreliable.\" showed \"call 911\": the danger word list matches \"violence\" with no regard to \"no\" before it, and the same list also misses \"I don't feel safe\" and \"I'm not safe\".",
    test: SUITE,
    checks: ["E1-flag", "E1-no-flag", "E1-case-file"],
  },
  {
    id: "E2-helplines-everywhere",
    reason:
      "The results page shows the domestic-violence helplines (Assaulted Women's Helpline, Fem'aide) on every case in every area, including a bakery invoice in Small Claims, open after the review is confirmed.",
    test: SUITE,
    checks: ["E2-helplines-guarded"],
  },
  {
    id: "F1-christmas-not-a-date",
    reason:
      "\"Christmas 2025\" is read as the year 2025 only, so no limitation date is counted, and nothing asks for the day either.",
    test: SUITE,
    checks: ["F1-named-day", "F1-story"],
  },
  {
    id: "G1-no-local-courthouse",
    reason:
      "The Family \"which court\" step never names the family court office in the person's city, although the saved court list has one there: offices are switched off for every before-filing step.",
    test: SUITE,
    checks: ["G1-courthouse"],
  },
  {
    id: "G2-divorce-for-never-married",
    reason:
      "A person who said they were never married is shown divorce material on the which-court step: the Divorce Act's \"court\" statement in the triage, and Form 8A (Application (Divorce)) as a form for their step.",
    test: SUITE,
    checks: ["G2-form-8A", "G2-triage"],
  },
];
