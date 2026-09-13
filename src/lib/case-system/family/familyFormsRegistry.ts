/**
 * Ontario family court forms, each cited to the rule in O. Reg. 114/99 that
 * requires it.
 *
 * WHY THIS EXISTS. `familyStrategyEngine.ts` and `familyWorkflowEngine.ts`
 * hardcoded nine form numbers as bare strings — "Form 8 - Application",
 * "Form 35.1 - Parenting Affidavit" — with no `sourceUrl` anywhere in ~4,800
 * lines of family engine code, on a path reachable in one click from the
 * homepage. A form number is a procedural fact; CLAUDE.md section 2 requires it
 * to cite a real, resolvable source.
 *
 * SOURCE. Every entry below was read out of O. Reg. 114/99 (Family Law Rules),
 * retrieved 2026-09-13 via the e-Laws `.doc` route documented in
 * SOURCING_NOTES.md (`ontario.ca/laws/docs/990114_e.doc` + `antiword`),
 * consolidation period from 2026-05-01, last amendment 228/25.
 *
 * `officialTitle` is the regulation's OWN title for the form, taken from the
 * forms table at the end of the regulation — not a paraphrase. This matters:
 * the engines called Form 35.1 the "Parenting Affidavit", which is pre-2021
 * language. The regulation calls it "Affidavit (Decision-Making
 * Responsibility, Parenting Time and Contact)", reflecting the terminology the
 * Divorce Act and CLRA now use. Shipping the old wording would have taught
 * users a vocabulary the court no longer uses.
 *
 * WHAT THIS DOES NOT DO. It does not decide which form a user needs. Naming a
 * form and citing the rule that requires it is legal information; telling a
 * particular user "you need Form 13" applies that rule to their facts, which is
 * the "who does the applying" test failing. The engines that route forms are
 * unchanged by this file and that question is still open — see
 * docs/OUTSTANDING_ISSUES.md section 11.
 */

/** The one regulation every entry here is sourced to. */
export const FAMILY_LAW_RULES_SOURCE_URL = "https://www.ontario.ca/laws/docs/990114_e.doc";
export const FAMILY_LAW_RULES_CITATION = "O. Reg. 114/99 (Family Law Rules)";
export const FAMILY_LAW_RULES_VERIFIED_AT = "2026-09-13";

export type FamilyForm = {
  /** The form number as the regulation writes it. */
  formNumber: string;
  /** The regulation's own title for the form. Never paraphrased. */
  officialTitle: string;
  /** The rule requiring or providing for the form. */
  requiringRule: string;
  /** The regulation's own words, quoted, so the citation can be checked. */
  ruleQuote: string;
  sourceUrl: string;
  verifiedAt: string;
};

export const FAMILY_FORMS: FamilyForm[] = [
  {
    formNumber: "8",
    officialTitle: "Application (General)",
    requiringRule: "r. 8(1)",
    ruleQuote:
      "To start a case, a person shall file an application (Form 8, 8A, 8B, 8B.1, 8B.2, 8C, 8D, 8D.1, 34L or 34N).",
    sourceUrl: FAMILY_LAW_RULES_SOURCE_URL,
    verifiedAt: FAMILY_LAW_RULES_VERIFIED_AT,
  },
  {
    formNumber: "10",
    officialTitle: "Answer",
    requiringRule: "r. 10(1)",
    ruleQuote:
      "A person against whom an application is made shall serve an answer (Form 10, 33B, 33B.1 or 33B.2) on every other party and file it within 30 days after being served with the application.",
    sourceUrl: FAMILY_LAW_RULES_SOURCE_URL,
    verifiedAt: FAMILY_LAW_RULES_VERIFIED_AT,
  },
  {
    formNumber: "13",
    officialTitle: "Financial Statement (Support Claims)",
    requiringRule: "r. 13(1.1)",
    ruleQuote:
      "If the application, answer or motion contains a claim for support but does not contain a property claim or a claim for exclusive possession of the matrimonial home and its contents, the financial statement used by the parties under these rules shall be in Form 13.",
    sourceUrl: FAMILY_LAW_RULES_SOURCE_URL,
    verifiedAt: FAMILY_LAW_RULES_VERIFIED_AT,
  },
  {
    formNumber: "13.1",
    officialTitle: "Financial Statement (Property and Support Claims)",
    requiringRule: "r. 13(1.2)",
    ruleQuote:
      "If the application, answer or motion contains a property claim or a claim for exclusive possession of the matrimonial home and its contents, the financial statement used by the parties under these rules shall be in Form 13.1, whether a claim for support is also included or not.",
    sourceUrl: FAMILY_LAW_RULES_SOURCE_URL,
    verifiedAt: FAMILY_LAW_RULES_VERIFIED_AT,
  },
  {
    formNumber: "14",
    officialTitle: "Notice of Motion",
    requiringRule: "r. 14",
    ruleQuote: "requires a notice of motion (Form 14) and an affidavit (Form 14A)",
    sourceUrl: FAMILY_LAW_RULES_SOURCE_URL,
    verifiedAt: FAMILY_LAW_RULES_VERIFIED_AT,
  },
  {
    formNumber: "14A",
    officialTitle: "Affidavit (General)",
    requiringRule: "r. 14",
    ruleQuote: "requires a notice of motion (Form 14) and an affidavit (Form 14A)",
    sourceUrl: FAMILY_LAW_RULES_SOURCE_URL,
    verifiedAt: FAMILY_LAW_RULES_VERIFIED_AT,
  },
  {
    formNumber: "17A",
    officialTitle: "Case Conference Brief - General",
    requiringRule: "r. 17",
    ruleQuote: "For a case conference, a case conference brief (Form 17A or ...)",
    sourceUrl: FAMILY_LAW_RULES_SOURCE_URL,
    verifiedAt: FAMILY_LAW_RULES_VERIFIED_AT,
  },
  {
    formNumber: "17C",
    officialTitle: "Settlement Conference Brief - General",
    requiringRule: "r. 17",
    ruleQuote: "(Form 17C or 17D)",
    sourceUrl: FAMILY_LAW_RULES_SOURCE_URL,
    verifiedAt: FAMILY_LAW_RULES_VERIFIED_AT,
  },
  {
    formNumber: "35.1",
    // The regulation's TABLE OF FORMS reads "AFFIDAVIT (DECISION-MAKING
    // RESPONSIBILITY, PARENTING TIME, CONTACT)" — a comma, not "and". The
    // inserted word was a paraphrase in the one field documented never to
    // carry one.
    officialTitle:
      "Affidavit (Decision-Making Responsibility, Parenting Time, Contact)",
    requiringRule: "r. 8(3.1), referring to r. 35.1",
    ruleQuote:
      "An application containing a claim respecting decision-making responsibility, parenting time or contact with respect to a child shall be accompanied by the applicable documents referred to in rule 35.1.",
    sourceUrl: FAMILY_LAW_RULES_SOURCE_URL,
    verifiedAt: FAMILY_LAW_RULES_VERIFIED_AT,
  },
];

const BY_NUMBER = new Map(FAMILY_FORMS.map((form) => [form.formNumber, form]));

export function familyForm(formNumber: string): FamilyForm | undefined {
  return BY_NUMBER.get(formNumber);
}

/**
 * The label the engines use in place of their old hardcoded strings.
 *
 * Returns the regulation's own title, so nothing downstream reintroduces a
 * paraphrase. Throws on an unknown form number rather than returning a bare
 * string: a form that is not in this registry is a form with no citation, and
 * failing loudly in a harness beats shipping it.
 */
export function familyFormLabel(formNumber: string): string {
  const form = familyForm(formNumber);

  if (!form) {
    throw new Error(
      `familyFormLabel: Form ${formNumber} is not in FAMILY_FORMS. ` +
        `Every form number shown to a user must cite the rule requiring it (CLAUDE.md section 2).`,
    );
  }

  return `Form ${form.formNumber} — ${form.officialTitle}`;
}
