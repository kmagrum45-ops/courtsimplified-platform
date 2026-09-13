/**
 * The Small Claims procedural event vocabulary, sourced.
 *
 * Every entry except `other-user-described` cites a provision of O. Reg. 258/98
 * (Rules of the Small Claims Court) and quotes the rule's own words. The
 * regulation is vendored at docs/sources/oreg-258-98-cited-rules.txt for
 * rr. 16-20 and registered in sources/statutoryProvisions.ts; the remaining
 * rules quoted here were retrieved and read from the same document
 * (consolidation from 2025-10-14) on 2026-09-13.
 *
 * WHY A VOCABULARY AND NOT FREE TEXT. An event type is a procedural
 * characterisation — saying an event was a "defence filed" places it inside
 * r. 9.01. That is a legal fact about the user's case and CLAUDE.md section 2
 * requires it to cite a real provision, the same standard the nine family form
 * numbers are held to.
 *
 * WHAT THIS FILE DOES NOT DO. It does not decide which event a user had. It
 * names the events the regulation recognises and quotes what each rule says.
 * The user chooses.
 */

/** The one regulation every sourced entry here cites. */
export const SMALL_CLAIMS_RULES_SOURCE_URL = "https://www.ontario.ca/laws/docs/980258_e.doc";
export const SMALL_CLAIMS_RULES_CITATION = "O. Reg. 258/98 (Rules of the Small Claims Court)";
export const SMALL_CLAIMS_RULES_CONSOLIDATION = "2025-10-14";
export const SMALL_CLAIMS_RULES_VERIFIED_AT = "2026-09-13";

export type CaseEventType =
  | "claim-filed"
  | "claim-served"
  | "defence-filed"
  | "defendants-claim-issued"
  | "noted-in-default"
  | "settlement-conference-held"
  | "motion-served"
  | "trial-date-fixed"
  | "trial-held"
  | "order-or-judgment-received"
  | "enforcement-step"
  | "other-user-described";

/**
 * Whether the regulation contemplates one of these per action or many.
 *
 * `singleton-per-party` is its own value rather than being folded into
 * `singleton`, because the distinction is real and getting it wrong breaks
 * multi-defendant cases: r. 9.01 gives EACH defendant a defence, so a case with
 * three defendants legitimately has three defence-filed events. No database
 * constraint enforces any of this — a singleton collision is SURFACED to the
 * user ("you already recorded X on DATE; is this the same thing, a correction,
 * or something else?") and never merged or silently duplicated.
 */
export type CaseEventCardinality = "singleton" | "singleton-per-party" | "repeatable";

export type CaseEventTypeDefinition = {
  type: CaseEventType;
  /** Plain-language label. The user's own words go in the event's title. */
  label: string;
  cardinality: CaseEventCardinality;
  /**
   * The provision that recognises this event, or null for the untyped option.
   * null is only legitimate on `other-user-described`, and the check asserts it.
   */
  rule: string | null;
  /** The rule's own words. Never paraphrased. Empty only where rule is null. */
  ruleQuote: string;
  sourceUrl: string | null;
  verifiedAt: string | null;
  /**
   * FIRST-CLASS means: presented as a normal, equally available choice, never
   * as a fallback reached after the real options, never buried behind "none of
   * the above", never auto-selected as a default.
   *
   * This is a DESIGN CONSTRAINT carried in the data, not a comment, so a later
   * session cannot demote it without deleting a field a check reads.
   * `verifyCaseEventTypes.ts` asserts exactly one type carries it.
   *
   * WHY IT MATTERS. Forcing a real event into a wrong type corrupts every
   * derivation downstream — deriveCaseStage reads types, the contradiction
   * check reads types, and a mis-typed event produces a confident wrong answer
   * rather than an honest gap. Recording an event untyped is the CORRECT answer
   * whenever the user's event does not map cleanly, not a failure to classify.
   */
  firstClassUntyped?: true;
};

export const CASE_EVENT_TYPES: CaseEventTypeDefinition[] = [
  // FIRST, deliberately — and this position was corrected once already.
  //
  // It was originally written last, which is precisely the slot a fallback
  // occupies, and verifyCaseEvents caught it. Order here is presentation-
  // significant: a user reading top-down meets this BEFORE they start fitting
  // their event to the closest wrong rule. Recording an event untyped is the
  // correct answer whenever nothing matches, not a failure to classify.
  {
    type: "other-user-described",
    label: "Something else happened",
    cardinality: "repeatable",
    // No rule, and that is the point. This records what the user says happened
    // WITHOUT asserting any procedural characterisation of it.
    rule: null,
    ruleQuote: "",
    sourceUrl: null,
    verifiedAt: null,
    firstClassUntyped: true,
  },
  {
    type: "claim-filed",
    label: "I filed a claim with the court",
    cardinality: "singleton",
    rule: "O. Reg. 258/98, r. 7.01 (1)",
    ruleQuote:
      "An action shall be commenced by filing a plaintiff's claim (Form 7A) with the clerk, " +
      "together with a copy of the claim for each defendant.",
    sourceUrl: SMALL_CLAIMS_RULES_SOURCE_URL,
    verifiedAt: SMALL_CLAIMS_RULES_VERIFIED_AT,
  },
  {
    type: "claim-served",
    label: "The claim was served",
    cardinality: "singleton-per-party",
    rule: "O. Reg. 258/98, r. 8.01 (1)",
    ruleQuote:
      "A plaintiff's claim or defendant's claim (Form 7A or 10A) shall be served personally as " +
      "provided in rule 8.02 or by an alternative to personal service as provided in rule 8.03.",
    sourceUrl: SMALL_CLAIMS_RULES_SOURCE_URL,
    verifiedAt: SMALL_CLAIMS_RULES_VERIFIED_AT,
  },
  {
    type: "defence-filed",
    label: "A defence was filed",
    cardinality: "singleton-per-party",
    rule: "O. Reg. 258/98, r. 9.01",
    ruleQuote:
      "A defendant who wishes to dispute a plaintiff's claim shall, within 20 days of being " +
      "served with the claim, (a) serve on every other party a defence (Form 9A); and (b) file " +
      "the defence, with proof of service, with the clerk.",
    sourceUrl: SMALL_CLAIMS_RULES_SOURCE_URL,
    verifiedAt: SMALL_CLAIMS_RULES_VERIFIED_AT,
  },
  {
    type: "defendants-claim-issued",
    label: "A defendant's claim was issued",
    cardinality: "repeatable",
    rule: "O. Reg. 258/98, r. 10.01 (1)",
    ruleQuote:
      "A defendant may make a claim, (a) against the plaintiff; (b) against any other person, " +
      "(i) arising out of the transaction or occurrence relied upon by the plaintiff, or " +
      "(ii) related to the plaintiff's claim.",
    sourceUrl: SMALL_CLAIMS_RULES_SOURCE_URL,
    verifiedAt: SMALL_CLAIMS_RULES_VERIFIED_AT,
  },
  {
    type: "noted-in-default",
    label: "A defendant was noted in default",
    cardinality: "singleton-per-party",
    rule: "O. Reg. 258/98, r. 11.01 (1)",
    ruleQuote:
      "If a defendant to a plaintiff's claim or a defendant's claim fails to file a defence to " +
      "all or part of the claim with the clerk within the prescribed time, the clerk may note " +
      "the defendant in default on the filing of, (a) a request to note the defendant in " +
      "default, which may be made in Form 9B.",
    sourceUrl: SMALL_CLAIMS_RULES_SOURCE_URL,
    verifiedAt: SMALL_CLAIMS_RULES_VERIFIED_AT,
  },
  {
    type: "settlement-conference-held",
    label: "A settlement conference was held",
    cardinality: "singleton",
    rule: "O. Reg. 258/98, r. 13.01 (1)",
    ruleQuote: "A settlement conference shall be held in every defended action.",
    sourceUrl: SMALL_CLAIMS_RULES_SOURCE_URL,
    verifiedAt: SMALL_CLAIMS_RULES_VERIFIED_AT,
  },
  {
    type: "motion-served",
    label: "A motion was served",
    cardinality: "repeatable",
    rule: "O. Reg. 258/98, r. 15.01 (1)",
    ruleQuote:
      "A motion shall be made by a notice of motion and supporting affidavit (Form 15A).",
    sourceUrl: SMALL_CLAIMS_RULES_SOURCE_URL,
    verifiedAt: SMALL_CLAIMS_RULES_VERIFIED_AT,
  },
  {
    type: "trial-date-fixed",
    label: "A trial date was fixed",
    cardinality: "singleton",
    // Form 9B is a general Request to Clerk, used BOTH to note default
    // (r. 11.01 (1) (a)) and to fix a trial date here. Describing it as "the
    // trial-setting form" would be wrong.
    rule: "O. Reg. 258/98, r. 16.01 (1)",
    ruleQuote:
      "The clerk shall fix a date for trial and serve a notice of trial on each party who has " +
      "filed a claim or defence if, (a) a settlement conference has been held; and (b) a party " +
      "has filed a request to the clerk (Form 9B) to fix a date for trial and has paid the " +
      "required fee.",
    sourceUrl: SMALL_CLAIMS_RULES_SOURCE_URL,
    verifiedAt: SMALL_CLAIMS_RULES_VERIFIED_AT,
  },
  {
    type: "trial-held",
    label: "The trial was held",
    cardinality: "singleton",
    rule: "O. Reg. 258/98, r. 17",
    ruleQuote: "Rule 17 governs the conduct of the trial.",
    sourceUrl: SMALL_CLAIMS_RULES_SOURCE_URL,
    verifiedAt: SMALL_CLAIMS_RULES_VERIFIED_AT,
  },
  {
    type: "order-or-judgment-received",
    label: "I received an order or judgment",
    cardinality: "repeatable",
    rule: "O. Reg. 258/98, r. 13.05 (5), r. 16.1.04 (2)",
    ruleQuote:
      "Orders made at a settlement conference and at a trial management conference are signed " +
      "by the judge, with the rules setting time to act after signing.",
    sourceUrl: SMALL_CLAIMS_RULES_SOURCE_URL,
    verifiedAt: SMALL_CLAIMS_RULES_VERIFIED_AT,
  },
  {
    type: "enforcement-step",
    label: "I took an enforcement step",
    cardinality: "repeatable",
    rule: "O. Reg. 258/98, r. 20",
    ruleQuote:
      "Rule 20 governs enforcement of orders, naming among others the affidavit for enforcement " +
      "request (Form 20P), the certificate of judgment (Form 20A), the writ of delivery " +
      "(Form 20B) and writs of seizure and sale (Forms 20C and 20D).",
    sourceUrl: SMALL_CLAIMS_RULES_SOURCE_URL,
    verifiedAt: SMALL_CLAIMS_RULES_VERIFIED_AT,
  },
];

const BY_TYPE = new Map(CASE_EVENT_TYPES.map((definition) => [definition.type, definition]));

export function caseEventType(type: string): CaseEventTypeDefinition | undefined {
  return BY_TYPE.get(type as CaseEventType);
}

/** The untyped option. Exactly one exists; the suite asserts that. */
export function untypedEventDefinition(): CaseEventTypeDefinition {
  const untyped = CASE_EVENT_TYPES.find((definition) => definition.firstClassUntyped);
  if (!untyped) {
    throw new Error(
      "caseEventTypes: no first-class untyped option. Forcing a real event into a wrong type " +
        "corrupts every derivation downstream, so one must always exist.",
    );
  }
  return untyped;
}

export function isSingletonType(type: CaseEventType): boolean {
  const definition = BY_TYPE.get(type);
  return definition?.cardinality === "singleton";
}
