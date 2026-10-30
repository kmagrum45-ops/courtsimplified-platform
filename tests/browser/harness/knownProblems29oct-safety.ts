/**
 * Known problems from the site owner's Chrome re-test of 29 October (safety,
 * deadlines, Family "which court"), each with a failing check in
 * scripts/verification/verifyChrome29octSafety.ts. An entry is deleted in the
 * same PR that makes its checks pass.
 */
/** `checks`: the exact check names the suite prints; each must fail while listed. */
export type KnownProblem = { id: string; reason: string; test: string; checks: string[] };

const SUITE = "scripts/verification/verifyChrome29octSafety.ts";

export const KNOWN_PROBLEMS_29OCT_SAFETY: KnownProblem[] = [
  {
    id: "E1-negated-danger",
    reason:
      "\"No violence. He's a good dad just unreliable.\" showed \"call 911\": the danger word list matches \"violence\" with no regard to \"no\" before it, and the same list also misses \"I don't feel safe\" and \"I'm not safe\".",
    test: SUITE,
    checks: [
      "E1-flag I don't feel safe at home.",
      "E1-flag I'm not safe with him.",
      "E1-no-flag No violence. He's a good dad just unreliable.",
      "E1-no-flag He never hit me.",
      "E1-no-flag There has never been any violence.",
      "E1-no-flag He's not violent, just late with payments.",
      "E1-no-flag I'm not afraid of him, I just want a schedule.",
      "E1-no-flag No threats, no abuse, he's just disorganized.",
      "E1-no-flag There is no abuse in our relationship.",
      "E1-case-file",
    ],
  },
  {
    id: "F1-christmas-not-a-date",
    reason:
      "\"Christmas 2025\" is read as the year 2025 only, so no limitation date is counted, and nothing asks for the day either.",
    test: SUITE,
    checks: [
      "F1-named-day Christmas 2025",
      "F1-named-day on Christmas Day 2025",
      "F1-named-day Boxing Day 2025",
      "F1-named-day New Year's Day 2026",
      "F1-story",
    ],
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
