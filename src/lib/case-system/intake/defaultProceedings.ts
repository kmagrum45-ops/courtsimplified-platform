/**
 * What rule 11 of O. Reg. 258/98 provides after a defendant is noted in
 * default — stated, with its forms, for the user to apply to their own claim.
 *
 * COSTS NOTHING. Static sourced content. No AI, no network, no matching.
 *
 * WHAT THIS DOES NOT DO, AND IT IS THE WHOLE POINT. It never says which route
 * a particular claim takes. The distinction r. 11.02 draws is whether the
 * claim is "for a debt or liquidated demand in money" — and deciding that
 * about a user's claim is applying a statutory definition to their facts. The
 * rule states the test; the reader applies it.
 *
 * PERMISSIVE LANGUAGE IS PRESERVED EXACTLY. r. 11.01 (1) (a) says a request to
 * note in default "may be made in Form 9B", and r. 11.03 (2) (b) says a
 * request for an assessment hearing "may be in Form 9B". Neither says the form
 * is required. Writing "requires Form 9B" would be a procedural assertion the
 * rule does not make, and a self-represented person turned away for using the
 * wrong document is exactly the harm that costs.
 *
 * SOURCE. ontario.ca/laws/docs/980258_e.doc, consolidation from October 14,
 * 2025, retrieved 2026-09-14. rr. 11.01-11.06 are vendored verbatim in
 * docs/sources/oreg-258-98-cited-rules.txt and registered in
 * STATUTORY_PROVISIONS.
 */

export const SMALL_CLAIMS_RULES_URL = "https://www.ontario.ca/laws/docs/980258_e.doc";
export const RULE_11_VERIFIED_AT = "2026-09-14";
export const RULE_11_CONSOLIDATION = "2025-10-14";

export type DefaultProceedingRoute = {
  id: string;
  /** The rule, as the user would cite it. */
  rule: string;
  /** Short name for the route. Describes the RULE, never the reader's claim. */
  title: string;
  /** The rule's own words, quoted. */
  quote: string;
  /**
   * What has to be true for this part of the rule to apply, in the rule's
   * terms. Not a test applied to anyone.
   */
  appliesWhen: string[];
  /**
   * Forms the rule names, with the rule's own modal verb preserved. "may be
   * made in" is not "must use".
   */
  forms: string[];
};

export const DEFAULT_PROCEEDING_ROUTES: DefaultProceedingRoute[] = [
  {
    id: "r11-01-noting-in-default",
    rule: "r. 11.01",
    title: "Noting a defendant in default",
    quote:
      "If a defendant to a plaintiff's claim or a defendant's claim fails to file a defence to all " +
      "or part of the claim with the clerk within the prescribed time, the clerk may note the " +
      "defendant in default on the filing of, (a) a request to note the defendant in default, which " +
      "may be made in Form 9B; and (b) proof that the claim was served within the court's " +
      "territorial division, subject to subrule (3).",
    appliesWhen: [
      "A defendant has not filed a defence to all or part of the claim within the prescribed time.",
      "This step comes before either of the judgment routes below.",
      "r. 11.01 (2): a person under disability may not be noted in default except with leave of the court.",
    ],
    forms: [
      "A request to note the defendant in default — the rule says this \"may be made in Form 9B\".",
    ],
  },
  {
    id: "r11-01-3-outside-territorial-division",
    rule: "r. 11.01 (3)",
    title: "Where every defendant was served outside the court's territorial division",
    quote:
      "If all the defendants have been served outside the court's territorial division, the clerk " +
      "shall not note any defendant in default until it is proved by an affidavit for jurisdiction " +
      "(Form 11A) filed with the clerk, or by evidence presented before a judge, that the action was " +
      "properly brought in that territorial division.",
    appliesWhen: [
      "ALL defendants were served outside the court's territorial division.",
      "Note the modal: the clerk \"shall not\" note anyone in default until this is proved. This is a precondition, not an option.",
    ],
    forms: [
      "An affidavit for jurisdiction (Form 11A) filed with the clerk — or evidence presented before a judge, which the rule offers as an alternative.",
    ],
  },
  {
    id: "r11-02-debt-or-liquidated-demand",
    rule: "r. 11.02",
    title: "Debt or liquidated demand in money — the clerk may sign",
    quote:
      "If a defendant has been noted in default, the clerk may sign default judgment (Form 11B) in " +
      "respect of the claim or any part of the claim to which the default applies that is for a debt " +
      "or liquidated demand in money, including interest if claimed.",
    appliesWhen: [
      "A defendant has been noted in default — the rule says \"a defendant\", not all of them.",
      "The claim, or the part of it in question, is \"for a debt or liquidated demand in money\".",
      "r. 11.02 (2): signing judgment on part of a claim does not affect the right to proceed on the rest, or against another defendant.",
    ],
    forms: ["Default judgment — Form 11B, signed by the clerk."],
  },
  {
    id: "r11-03-unliquidated-demand",
    rule: "r. 11.03",
    title: "Anything r. 11.02 does not cover — damages must be assessed",
    quote:
      "If all defendants have been noted in default, the plaintiff may obtain judgment against a " +
      "defendant noted in default with respect to any part of the claim to which rule 11.02 does not " +
      "apply. To obtain judgment, the plaintiff may, (a) file a notice of motion and supporting " +
      "affidavit (Form 15A) requesting a motion in writing for an assessment of damages, setting out " +
      "the reasons why the motion should be granted and attaching any relevant documents; or (b) file " +
      "a request for an assessment hearing, which may be in Form 9B.",
    appliesWhen: [
      "ALL defendants have been noted in default — a higher threshold than r. 11.02, which needs only one.",
      "The part of the claim in question is one r. 11.02 does not apply to.",
      "r. 11.03 (5): on an assessment the plaintiff is not required to prove liability against a defendant noted in default, but is required to prove the amount of the claim.",
    ],
    forms: [
      "A notice of motion and supporting affidavit — Form 15A — for a motion in writing for an assessment of damages; or",
      "A request for an assessment hearing — the rule says this \"may be in Form 9B\".",
    ],
  },
  {
    id: "r11-03-7-defence-filed",
    rule: "r. 11.03 (7)",
    title: "Where any defendant has filed a defence",
    quote:
      "If one or more defendants have filed a defence, a plaintiff requiring an assessment of damages " +
      "against a defendant noted in default shall proceed to a settlement conference under rule 13 " +
      "and, if necessary, a trial in accordance with rule 17.",
    appliesWhen: [
      "One or more defendants have filed a defence, and an assessment of damages is required against a different defendant who was noted in default.",
      "This is neither of the two routes above: the rule directs a settlement conference under r. 13, then trial under r. 17 if necessary.",
    ],
    forms: ["The rule names no form here. It directs the proceeding to r. 13 and then r. 17."],
  },
  {
    id: "r11-04-defendants-claim",
    rule: "r. 11.04",
    title: "Default on a defendant's claim is different",
    quote:
      "If a party against whom a defendant's claim is made has been noted in default, judgment may be " +
      "obtained against the party only at trial or on motion.",
    appliesWhen: [
      "The claim in default is a DEFENDANT'S claim rather than a plaintiff's claim.",
      "The clerk-signed route in r. 11.02 is not available here at all — the rule says \"only at trial or on motion\".",
    ],
    forms: ["The rule names no form. Judgment comes at trial or on motion."],
  },
];

/**
 * r. 11.06 — setting aside. Kept separate because it is the other party's
 * remedy, not a route to judgment, and a plaintiff reading the routes above
 * should know it exists.
 */
export const SETTING_ASIDE_DEFAULT = {
  rule: "r. 11.06",
  quote:
    "The court may set aside the noting in default or default judgment against a party and any step " +
    "that has been taken to enforce the judgment, on such terms as are just, if the party makes a " +
    "motion to set aside and the court is satisfied that, (a) the party has a meritorious defence and " +
    "a reasonable explanation for the default; and (b) the motion is made as soon as is reasonably " +
    "possible in all the circumstances.",
};
