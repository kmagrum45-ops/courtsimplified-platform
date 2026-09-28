/**
 * What the Rules of the Small Claims Court say about starting an action.
 *
 * General information, repeated from the rule. Nothing here is computed from a
 * user's facts: which of it matters to them is theirs to decide. It is SHOWN
 * only when the user's own record says they are bringing a claim that has not
 * been filed yet -- gated on a recorded fact, the same posture as the rule 11
 * card in IntelligenceOverviewPanel.tsx.
 *
 * Every item is a paraphrase of the rule text in the vendored corpus
 * (docs/sources/corpus/oreg-258-98-small-claims-rules.txt, retrieved
 * 2026-09-27 from the URL below, consolidation 14 October 2025). Pinpoints
 * were checked against that file line by line when this was written.
 *
 * Written 2026-09-28 after a live run whose overview never said how a Small
 * Claims action is started.
 */

export const SMALL_CLAIMS_RULES_SOURCE = {
  sourceName: "Rules of the Small Claims Court, O. Reg. 258/98",
  sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
  verifiedAt: "2026-09-27",
} as const;

export type RuleStep = {
  id: string;
  title: string;
  text: string;
  /** Rule pinpoint, e.g. "r. 7.01(1)". */
  pinpoint: string;
};

/** In the order the rules describe them. Not a checklist of what this user must do. */
export const STARTING_A_SMALL_CLAIMS_ACTION: readonly RuleStep[] = [
  {
    id: "file-form-7a",
    title: "Filing the Plaintiff's Claim (Form 7A)",
    text:
      "An action is started by filing a Plaintiff's Claim (Form 7A) with the court clerk, with a copy " +
      "for each defendant. If it is filed electronically, the extra copies are not needed.",
    pinpoint: "r. 7.01(1), (1.1)",
  },
  {
    id: "clerk-issues",
    title: "The clerk issues the claim",
    text:
      "When the clerk receives the claim, the clerk issues it by dating, signing and sealing it and " +
      "giving it a court file number.",
    pinpoint: "r. 7.02(1)",
  },
  {
    id: "serve-within-six-months",
    title: "Serving the claim",
    text:
      "The claim has to be served on the defendant, personally or by an alternative to personal service " +
      "the rules allow, within six months after it is issued. The court can extend that time, before or " +
      "after the six months.",
    pinpoint: "r. 8.01(1), (2)",
  },
  {
    id: "defence-20-days",
    title: "The defendant's response",
    text:
      "A defendant who wants to dispute the claim has 20 days after being served to serve a Defence " +
      "(Form 9A) on every other party and file it, with proof of service, with the clerk.",
    pinpoint: "r. 9.01",
  },
];

/** What the rule says a Plaintiff's Claim must contain -- r. 7.01(2). */
export const PLAINTIFFS_CLAIM_CONTENTS: readonly string[] = [
  "The full names of the parties (and, if relevant, the capacity in which they sue or are sued).",
  "The nature of the claim, with reasonable certainty and detail, including the date, place and nature of what happened.",
  "The amount of the claim and what you are asking for.",
  "If you are representing yourself: your address, phone number and email address (if any).",
  "The address where you believe the defendant can be served.",
  "A copy of any document the claim is based on, attached to each copy of the claim -- or, if it is unavailable, the reason it is not attached.",
];

export const PLAINTIFFS_CLAIM_CONTENTS_PINPOINT = "r. 7.01(2)";
