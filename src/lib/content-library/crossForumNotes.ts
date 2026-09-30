/**
 * Connection notes: fixed, sourced text for stories that involve more than one
 * matter, where the rules for one matter affect another.
 *
 * *** WHY THIS EXISTS (2026-09-30) ***
 *
 * The intake was built around one issue per case. A story with two problems --
 * unpaid wages AND discrimination, a tenant with a Board matter AND a damage
 * claim -- was classified as one of them and the other was dropped. The rules
 * that connect those matters are exactly what a self-represented person does
 * not know exists: that filing an employment standards complaint closes the
 * court route for the same wages, that a Human Rights Code claim cannot stand
 * alone in court but can ride with another claim, that claiming at the
 * Landlord and Tenant Board extinguishes anything above its limit.
 *
 * *** WHAT A NOTE IS, AND IS NOT ***
 *
 * Each note states a general rule, quoted from a statute or a decision that
 * was retrieved and read (see `sources`). It is selected by the TOPICS a story
 * mentions -- the permitted "topic surfacing" of CLAUDE.md section 2 -- and it
 * never says the reader's facts satisfy anything. The model only picks issue
 * kinds from a fixed list and quotes the user's own words; every sentence the
 * user reads comes from this file.
 *
 * *** THE CHECK THAT KEEPS THIS HONEST ***
 *
 * `npm run test:cross-forum-notes` asserts that every phrase inside “curly
 * quotes” in a note appears, word for word, in the local copy of one of that
 * note's sources. A quote that cannot be found on disk does not ship.
 *
 * Decisions come from the courts' own databases through the Fetch Decisions
 * workflow (docs/SOURCING_NOTES.md), never from CanLII, and are saved under
 * docs/sources/decisions/. Statutes are the e-Laws copies in
 * docs/sources/corpus/ (see its manifest.json for consolidation dates).
 */

export type IssueKind =
  | "employment-pay"
  | "employment-termination"
  | "discrimination"
  | "residential-tenancy"
  | "injury"
  | "property-damage"
  | "debt-or-contract"
  | "family"
  | "defamation"
  | "other";

export const ISSUE_KINDS: readonly IssueKind[] = [
  "employment-pay",
  "employment-termination",
  "discrimination",
  "residential-tenancy",
  "injury",
  "property-damage",
  "debt-or-contract",
  "family",
  "defamation",
  "other",
];

/** What the user reads for each kind. Topic names only; nothing about law. */
export const ISSUE_KIND_LABELS: Record<IssueKind, { id: string; text: string }> = {
  "employment-pay": { id: "issue-kind:employment-pay", text: "Pay owed by an employer" },
  "employment-termination": {
    id: "issue-kind:employment-termination",
    text: "Losing a job (firing, layoff, termination or severance)",
  },
  discrimination: {
    id: "issue-kind:discrimination",
    text: "Being treated differently because of a personal characteristic",
  },
  "residential-tenancy": { id: "issue-kind:residential-tenancy", text: "A rental home (landlord and tenant)" },
  injury: { id: "issue-kind:injury", text: "An injury" },
  "property-damage": { id: "issue-kind:property-damage", text: "Damage to property" },
  "debt-or-contract": { id: "issue-kind:debt-or-contract", text: "Money owed or an agreement not kept" },
  family: { id: "issue-kind:family", text: "A family matter (separation, parenting or support)" },
  defamation: { id: "issue-kind:defamation", text: "Something said or written about a person" },
  other: { id: "issue-kind:other", text: "Something else" },
};

export const SEVERAL_MATTERS_INTRO = {
  id: "cross-forum:intro",
  text:
    "Your description may involve more than one matter. Different matters can be handled by different courts or tribunals, and a step taken for one can affect another. The notes below explain general rules that often come up when matters like these appear together. They are not an assessment of your situation.",
};

export type NoteSource = {
  /** How the source is cited to the user. */
  sourceName: string;
  /** Public URL a user can open: e-Laws, or the court's own decision page. */
  officialUrl: string;
  /** Where this source's text lives in the repo, for the quote check. */
  localText: string;
  pinpoint: string;
  verifiedAt: string;
};

export type CrossForumNote = {
  id: string;
  title: string;
  text: string;
  sources: NoteSource[];
};

const VERIFIED = "2026-09-30";

const ESA: Omit<NoteSource, "pinpoint"> = {
  sourceName: "Employment Standards Act, 2000, S.O. 2000, c. 41",
  officialUrl: "https://www.ontario.ca/laws/statute/00e41",
  localText: "docs/sources/corpus/esa-2000-ontario.txt",
  verifiedAt: VERIFIED,
};
const CODE: Omit<NoteSource, "pinpoint"> = {
  sourceName: "Human Rights Code, R.S.O. 1990, c. H.19",
  officialUrl: "https://www.ontario.ca/laws/statute/90h19",
  localText: "docs/sources/corpus/human-rights-code.txt",
  verifiedAt: VERIFIED,
};
const RTA: Omit<NoteSource, "pinpoint"> = {
  sourceName: "Residential Tenancies Act, 2006, S.O. 2006, c. 17",
  officialUrl: "https://www.ontario.ca/laws/statute/06r17",
  localText: "docs/sources/corpus/residential-tenancies-act-2006.txt",
  verifiedAt: VERIFIED,
};

export const CROSS_FORUM_NOTES: CrossForumNote[] = [
  {
    id: "cross-forum:employment-standards-or-court",
    title: "Pay owed by an employer: a complaint or a court case",
    text:
      "The Employment Standards Act, 2000 makes an employee choose between its complaint process and a court case. An employee who files a complaint under the Act about unpaid wages “may not commence a civil proceeding with respect to the same matter” (s. 97(1)), and a complaint claiming termination or severance pay rules out a court case for wrongful dismissal about the same termination (s. 97(2)). Starting a court case first rules out a complaint about the same matter or the same termination (s. 98). An employee who withdraws a complaint “within two weeks after it is filed” may still go to court (s. 97(4)). The Court of Appeal for Ontario has said that where an employer dismisses an employee without giving the benefits the Act requires, the employee “may claim both those benefits and common law damages in a single civil action, so long as there is no double recovery” (Brake v. PJ-M2R Restaurant Inc., 2017 ONCA 402, para. 150).",
    sources: [
      { ...ESA, pinpoint: "ss. 97(1), 97(2), 97(4), 98" },
      {
        sourceName: "Brake v. PJ-M2R Restaurant Inc., 2017 ONCA 402",
        officialUrl: "https://coadecisions.ontariocourts.ca/coa/coa/en/item/15800/index.do",
        localText: "docs/sources/decisions/brake-v-pj-m2r-restaurant-2017-ONCA-402.txt",
        pinpoint: "para. 150",
        verifiedAt: VERIFIED,
      },
    ],
  },
  {
    id: "cross-forum:human-rights-with-another-claim",
    title: "Discrimination alongside another claim",
    text:
      "The Human Rights Code lets a court order compensation or restitution when it finds, in a civil case, that a party infringed a right under Part I of the Code (s. 46.1(1)). The Code “does not permit a person to commence an action based solely on an infringement of a right under Part I” (s. 46.1(2)). The Court of Appeal for Ontario has said that a claim founded directly on a breach of the Code is “subject to the comprehensive enforcement scheme of the Code”, but that a breach of the Code “may be properly raised in an action if the claim is otherwise properly before the court” (Jaffer v. York University, 2010 ONCA 654, paras. 37 and 44). The Code also says a person may not apply to the Human Rights Tribunal about a right while a court case seeking an order under s. 46.1 for the same alleged infringement has been started and not finally decided or withdrawn, or after a court has finally decided whether the right was infringed or the matter was settled (s. 34(11)).",
    sources: [
      { ...CODE, pinpoint: "ss. 34(11), 46.1" },
      {
        sourceName: "Jaffer v. York University, 2010 ONCA 654",
        officialUrl: "https://coadecisions.ontariocourts.ca/coa/coa/en/item/9970/index.do",
        localText: "docs/sources/decisions/jaffer-v-york-university-2010-ONCA-654.txt",
        pinpoint: "paras. 37, 44",
        verifiedAt: VERIFIED,
      },
    ],
  },
  {
    id: "cross-forum:tenancy-and-court",
    title: "A rental home and another claim",
    text:
      "The Landlord and Tenant Board “has exclusive jurisdiction to determine all applications under this Act and with respect to all matters in which jurisdiction is conferred on it by this Act” (Residential Tenancies Act, 2006, s. 168(2)). Where it otherwise has jurisdiction, the Board can order payment of up to the greater of $10,000 and the Small Claims Court limit (s. 207(1)). A person whose claim is larger may go to court, and the court can then use the Board's powers (s. 207(2)). When a claim of that amount or less is made to the Board, “all rights of the party in excess of the Board's monetary jurisdiction are extinguished once the Board issues its order” (s. 207(3)). The Court of Appeal for Ontario has said the Board does not have exclusive jurisdiction over all claims of non-repair against a landlord: it has jurisdiction over a tenant's or former tenant's damages claim where the “essential character of the claim” is for non-repair and within its monetary limit, and that jurisdiction is not exclusive because of s. 207(2) (Letestu Estate v. Ritlyn Investments Limited, 2017 ONCA 442, para. 10). In another case the court heard a claim that asked for “equitable relief and a certificate of pending litigation, which the Landlord and Tenant Board would have had no jurisdiction to order” (Kaiman v. Graham, 2009 ONCA 77, para. 13). And where a court was deciding other issues about a rental home, the court held that the parties “must have their possessory rights determined before that Board” (Jesan Real Estate Ltd. v. Doyle, 2020 ONCA 714, para. 60).",
    sources: [
      { ...RTA, pinpoint: "ss. 168(2), 207(1)-(3)" },
      {
        sourceName: "Letestu Estate v. Ritlyn Investments Limited, 2017 ONCA 442",
        officialUrl: "https://coadecisions.ontariocourts.ca/coa/coa/en/item/15837/index.do",
        localText: "docs/sources/decisions/letestu-estate-v-ritlyn-2017-ONCA-442.txt",
        pinpoint: "para. 10",
        verifiedAt: VERIFIED,
      },
      {
        sourceName: "Kaiman v. Graham, 2009 ONCA 77",
        officialUrl: "https://coadecisions.ontariocourts.ca/coa/coa/en/item/8644/index.do",
        localText: "docs/sources/decisions/kaiman-v-graham-2009-ONCA-77.txt",
        pinpoint: "para. 13",
        verifiedAt: VERIFIED,
      },
      {
        sourceName: "Jesan Real Estate Ltd. v. Doyle, 2020 ONCA 714",
        officialUrl: "https://coadecisions.ontariocourts.ca/coa/coa/en/item/19170/index.do",
        localText: "docs/sources/decisions/jesan-real-estate-v-doyle-2020-ONCA-714.txt",
        pinpoint: "para. 60",
        verifiedAt: VERIFIED,
      },
    ],
  },
  {
    id: "cross-forum:several-people-at-fault",
    title: "More than one person or business involved",
    text:
      "Under the Negligence Act, where damages have been caused or contributed to by the fault or neglect of two or more persons, “the court shall determine the degree in which each of such persons is at fault or negligent”, and persons found at fault or negligent are “jointly and severally liable to the person suffering loss or damage for such fault or negligence” (s. 1).",
    sources: [
      {
        sourceName: "Negligence Act, R.S.O. 1990, c. N.1",
        officialUrl: "https://www.ontario.ca/laws/statute/90n01",
        localText: "docs/sources/corpus/negligence-act.txt",
        pinpoint: "s. 1",
        verifiedAt: VERIFIED,
      },
    ],
  },
  {
    id: "cross-forum:earlier-decision",
    title: "When something has already been decided",
    text:
      "When a court or tribunal has already decided a question between the same people, a later case can be bound by that answer. The Supreme Court of Canada restated three conditions: “(1) that the same question has been decided; (2) that the judicial decision which is said to create the estoppel was final; and, (3) that the parties to the judicial decision or their privies were the same persons as the parties to the proceedings in which the estoppel is raised or their privies” (Danyluk v. Ainsworth Technologies Inc., 2001 SCC 44, para. 25). It also said these rules “should not be mechanically applied”, and that even when the conditions are met a court “must still determine whether, as a matter of discretion, issue estoppel ought to be applied” (para. 33).",
    sources: [
      {
        sourceName: "Danyluk v. Ainsworth Technologies Inc., 2001 SCC 44",
        officialUrl: "https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/1882/index.do",
        localText: "docs/sources/decisions/danyluk-v-ainsworth-2001-SCC-44.english.txt",
        pinpoint: "paras. 25, 33",
        verifiedAt: VERIFIED,
      },
    ],
  },
  {
    id: "cross-forum:unmarried-couple",
    title: "Living together without marriage",
    text:
      "The Family Law Act defines a “spouse” as either of two persons who “are married to each other” (or who entered a void or voidable marriage in good faith) (s. 1(1)). For the support part of the Act, the definition also “includes either of two persons who are not married to each other and have cohabited” continuously for at least three years, or in a relationship of some permanence if they are the parents of a child (s. 29). The Supreme Court of Canada has said that the property statutes provide the framework “for married spouses”, but “for unmarried persons in domestic relationships in most common law provinces, judge-made law was and remains the only option” (Kerr v. Baranow, 2011 SCC 10, para. 1).",
    sources: [
      {
        sourceName: "Family Law Act, R.S.O. 1990, c. F.3",
        officialUrl: "https://www.ontario.ca/laws/statute/90f03",
        localText: "docs/sources/corpus/family-law-act.txt",
        pinpoint: "ss. 1(1), 29",
        verifiedAt: VERIFIED,
      },
      {
        sourceName: "Kerr v. Baranow, 2011 SCC 10",
        officialUrl: "https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/7922/index.do",
        localText: "docs/sources/decisions/kerr-v-baranow-2011-SCC-10.english.txt",
        pinpoint: "para. 1",
        verifiedAt: VERIFIED,
      },
    ],
  },
  {
    id: "cross-forum:over-small-claims-limit",
    title: "Amounts above the Small Claims Court limit",
    text:
      "The Rules of the Small Claims Court provide that “A cause of action shall not be divided into two or more actions for the purpose of bringing it within the court's jurisdiction” (r. 6.02). In the Superior Court, “If a plaintiff recovers an amount within the monetary jurisdiction of the Small Claims Court, the court may order that the plaintiff shall not recover any costs” (Rules of Civil Procedure, r. 57.05(1)). That subrule “does not apply to an action transferred to the Superior Court of Justice under section 107 of the Courts of Justice Act” (r. 57.05(2)).",
    sources: [
      {
        sourceName: "Rules of the Small Claims Court, O. Reg. 258/98",
        officialUrl: "https://www.ontario.ca/laws/regulation/980258",
        localText: "docs/sources/corpus/oreg-258-98-small-claims-rules.txt",
        pinpoint: "r. 6.02",
        verifiedAt: VERIFIED,
      },
      {
        sourceName: "Rules of Civil Procedure, R.R.O. 1990, Reg. 194",
        officialUrl: "https://www.ontario.ca/laws/regulation/900194",
        localText: "docs/sources/corpus/rules-of-civil-procedure.txt",
        pinpoint: "r. 57.05(1)-(2)",
        verifiedAt: VERIFIED,
      },
    ],
  },
];

/** The Small Claims Court limit, as pathwayDescriptions.ts states and sources it. */
const SMALL_CLAIMS_LIMIT = 50_000;

export type StoryIssue = { kind: IssueKind; quote: string };

export type StoryMatters = {
  issues: StoryIssue[];
  /** The story names more than one person or business it holds responsible. */
  severalOtherParties: boolean;
  /** The story says a court or tribunal already decided something between the parties. */
  earlierDecision: boolean;
  /** The story describes a couple who lived together without marrying. */
  unmarriedCouple: boolean;
};

export const NO_MATTERS: StoryMatters = {
  issues: [],
  severalOtherParties: false,
  earlierDecision: false,
  unmarriedCouple: false,
};

const EMPLOYMENT: IssueKind[] = ["employment-pay", "employment-termination"];
const COURT_CLAIMS: IssueKind[] = [
  "employment-pay",
  "employment-termination",
  "injury",
  "property-damage",
  "debt-or-contract",
  "defamation",
];

/**
 * Which notes a story's topics call for. Pure and deterministic: the same
 * topics always select the same notes, so the selection itself can be tested
 * without a model.
 */
export function selectCrossForumNotes(
  matters: StoryMatters,
  statedAmounts: readonly number[] = [],
): CrossForumNote[] {
  const kinds = new Set(matters.issues.map((issue) => issue.kind));
  const has = (kind: IssueKind) => kinds.has(kind);
  const any = (list: IssueKind[]) => list.some(has);
  const chosen = new Set<string>();

  if (any(EMPLOYMENT)) chosen.add("cross-forum:employment-standards-or-court");
  if (has("discrimination") && (any(COURT_CLAIMS) || has("residential-tenancy"))) chosen.add("cross-forum:human-rights-with-another-claim");
  if (has("residential-tenancy") && (any(COURT_CLAIMS) || has("discrimination"))) {
    chosen.add("cross-forum:tenancy-and-court");
  }
  if (matters.severalOtherParties && (has("injury") || has("property-damage"))) {
    chosen.add("cross-forum:several-people-at-fault");
  }
  if (matters.earlierDecision) chosen.add("cross-forum:earlier-decision");
  if (matters.unmarriedCouple && has("family")) chosen.add("cross-forum:unmarried-couple");
  // The Small Claims limit only matters for a court claim for money; a family
  // matter or a Board claim above it is not "over the Small Claims limit".
  if (any(COURT_CLAIMS) && statedAmounts.some((amount) => amount > SMALL_CLAIMS_LIMIT)) chosen.add("cross-forum:over-small-claims-limit");

  return CROSS_FORUM_NOTES.filter((note) => chosen.has(note.id));
}

/** Whether the several-matters card has anything to say. */
export function hasSeveralMattersContent(matters: StoryMatters, statedAmounts: readonly number[] = []): boolean {
  const distinctKinds = new Set(matters.issues.map((issue) => issue.kind).filter((kind) => kind !== "other"));
  return distinctKinds.size >= 2 || selectCrossForumNotes(matters, statedAmounts).length > 0;
}
