/**
 * Family status-and-routing triage.
 *
 * COSTS NOTHING TO RUN. Pure functions over recorded answers — no OpenAI call,
 * no network, no randomness. It runs before everything else and on every
 * session, so it has to be free and deterministic.
 *
 * WHY IT EXISTS, AND WHY IT HAS NO SMALL CLAIMS ANALOGUE. In Small Claims the
 * claim type comes first. In family law the routing question comes BEFORE the
 * claim question, because two facts decide which proceedings exist at all:
 *
 *   - Whether the two people were married to each other. The Family Law Act
 *     uses "spouse" to mean two different things: s. 1 (1) (married) governs the
 *     property Parts, and s. 29 adds unmarried cohabitees for the support Part.
 *     So support reaches unmarried couples and property does not.
 *   - Where the parties live. Courts of Justice Act s. 21.8 (1) sends every
 *     Schedule proceeding to the Family Court in 24 named municipalities; the
 *     Divorce Act, the FLA property Parts and the CYFSA each define "court"
 *     differently everywhere else.
 *
 * WHAT THIS MODULE WILL NOT DO. It records facts. It does not conclude.
 * Specifically it never decides that a statutory definition is satisfied, never
 * says which court a person must use, never says a proceeding is or is not
 * available to them, and never computes a date. The four are enumerated again
 * at `TRIAGE_NON_CONCLUSIONS` below, and verifyStatusTriage.ts asserts each one.
 *
 * The strongest temptation is the third. Hiding topics that "don't apply" feels
 * like good UX, and it is the suppression-filter defect this codebase has
 * already removed once: a filter that hides on a derived conclusion writes that
 * conclusion into the user's experience without ever stating it, which is worse
 * than stating it, because it cannot be argued with.
 */

/**
 * Every source cited below is vendored under docs/sources/ and checked by
 * verifyCitedProvisions.ts. See citedProvisions.ts for why.
 */
const FLA_SOURCE = "https://www.ontario.ca/laws/docs/90f03_e.doc";
const CJA_SOURCE = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const FLR_SOURCE = "https://www.ontario.ca/laws/docs/990114_e.doc";
const DIVORCE_ACT_SOURCE = "https://laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html";
const VERIFIED_AT = "2026-09-13";

export type TriageCitation = {
  label: string;
  sourceUrl: string;
  verifiedAt: string;
};

// ---------------------------------------------------------------------------
// What gets recorded
// ---------------------------------------------------------------------------

/** Deliberately the same three-state shape the depth layer uses. */
export type RecordedState = "provided" | "not-yet" | "not-asked";

export type YesNo = "yes" | "no";
export type YesNoUnsure = "yes" | "no" | "unsure";

export type FamilyStatusRecord = {
  /** The FACT, never the word "spouse" — which is the term doing ambiguous work. */
  marriedToOtherParty: YesNo | "not-yet";

  /** Asked only when married. The Divorce-Act-versus-provincial fork. */
  divorceSought: YesNoUnsure | "not-asked" | "not-yet";

  /**
   * Asked only when NOT married. Dates, not a duration the user computes, and
   * not a conclusion about whether s. 29 (a)'s three years are met.
   */
  cohabitationStart: string | null;
  cohabitationEnd: string | null;

  /**
   * Asked only when NOT married. This is the CHILD half of FLA s. 29 (b) and
   * nothing else. The other half of that limb — "a relationship of some
   * permanence" — is a legal judgment, so it is never asked and never inferred.
   */
  haveChildTogether: YesNo | "not-asked" | "not-yet";

  /** Distinct from haveChildTogether: what the case is actually about. */
  caseInvolvesChildren: YesNo | "not-yet";

  /** A municipality name, "other", or null. Never resolved to a court. */
  userMunicipality: string | null;
  otherPartyMunicipality: string | null;
};

export function emptyStatusRecord(): FamilyStatusRecord {
  return {
    marriedToOtherParty: "not-yet",
    divorceSought: "not-yet",
    cohabitationStart: null,
    cohabitationEnd: null,
    haveChildTogether: "not-yet",
    caseInvolvesChildren: "not-yet",
    userMunicipality: null,
    otherPartyMunicipality: null,
  };
}

/**
 * Enumerated so a check can assert them rather than a reviewer remembering
 * them. verifyStatusTriage.ts walks every outcome this module can produce and
 * asserts none of these appears.
 */
export const TRIAGE_NON_CONCLUSIONS = [
  "does not announce that a statutory definition is satisfied",
  "does not say which court a person must use",
  "does not say a proceeding type is or is not available to them",
  "does not compute a date or a duration",
] as const;

// ---------------------------------------------------------------------------
// The questions, and the order
// ---------------------------------------------------------------------------

export type TriageQuestionId =
  | "married-to-other-party"
  | "divorce-sought"
  | "cohabitation-dates"
  | "child-together"
  | "case-involves-children"
  | "municipalities";

export type TriageQuestionKind = "yes-no" | "yes-no-unsure" | "date-range" | "municipality-pair";

export type TriageQuestion = {
  id: TriageQuestionId;
  kind: TriageQuestionKind;
  /** Shown verbatim. One question on screen, nothing else. */
  prompt: string;
  /** Shown under the prompt only if the user asks why. Never legal advice. */
  whyAsked: string;
};

const QUESTIONS: Record<TriageQuestionId, TriageQuestion> = {
  "married-to-other-party": {
    id: "married-to-other-party",
    kind: "yes-no",
    prompt: "Were you and the other person married to each other?",
    whyAsked:
      "Ontario's family statutes treat married and unmarried couples differently in some " +
      "areas and the same in others. Recording this now means you are not shown rules that " +
      "are about a different situation.",
  },
  "divorce-sought": {
    id: "divorce-sought",
    kind: "yes-no-unsure",
    prompt: "Are you asking a court for a divorce?",
    whyAsked:
      "A divorce is dealt with under the federal Divorce Act. Separating without divorcing " +
      "is dealt with under Ontario statutes. It is common not to have decided yet.",
  },
  "cohabitation-dates": {
    id: "cohabitation-dates",
    kind: "date-range",
    prompt: "Did you live together? If so, from roughly when to roughly when?",
    whyAsked:
      "Some Ontario support rules refer to how long two people lived together. Recording " +
      "the dates lets you read those rules against your own situation.",
  },
  "child-together": {
    id: "child-together",
    kind: "yes-no",
    prompt: "Do you and the other person have a child together?",
    whyAsked:
      "Some Ontario support rules refer to whether two people are the parents of a child. " +
      "This is separate from what your case is about.",
  },
  "case-involves-children": {
    id: "case-involves-children",
    kind: "yes-no",
    prompt: "Does what you are dealing with involve any children?",
    whyAsked:
      "This decides which parts of the process are relevant — it is a different question " +
      "from whether you and the other person have a child together.",
  },
  municipalities: {
    id: "municipalities",
    kind: "municipality-pair",
    prompt: "Which municipality do you live in? And the other person, if you know?",
    whyAsked:
      "In 24 named municipalities a single Family Court hears all family matters. Elsewhere " +
      "there is more than one court. Both answers matter, because a case may be started in " +
      "the Family Court if EITHER person lives in one of them.",
  },
};

/**
 * The next question, or null when the triage has what it needs.
 *
 * Order is pruning-first: each answer removes questions that are then never
 * asked. Married people are never asked the cohabitation questions; unmarried
 * people are never asked about divorce.
 *
 * Municipality is last because it is routing rather than existence, and it is
 * only meaningful once there is something to route.
 */
export function selectNextTriageQuestion(record: FamilyStatusRecord): TriageQuestion | null {
  if (record.marriedToOtherParty === "not-yet") {
    return QUESTIONS["married-to-other-party"];
  }

  if (record.marriedToOtherParty === "yes") {
    if (record.divorceSought === "not-yet") return QUESTIONS["divorce-sought"];
  } else {
    if (record.cohabitationStart === null) return QUESTIONS["cohabitation-dates"];
    if (record.haveChildTogether === "not-yet") return QUESTIONS["child-together"];
  }

  if (record.caseInvolvesChildren === "not-yet") return QUESTIONS["case-involves-children"];
  if (record.userMunicipality === null) return QUESTIONS.municipalities;

  return null;
}

/** Questions that will never be asked given what is recorded so far. */
export function prunedQuestions(record: FamilyStatusRecord): TriageQuestionId[] {
  if (record.marriedToOtherParty === "yes") return ["cohabitation-dates", "child-together"];
  if (record.marriedToOtherParty === "no") return ["divorce-sought"];
  return [];
}

// ---------------------------------------------------------------------------
// The 24 municipalities
// ---------------------------------------------------------------------------

/**
 * O. Reg. 114/99, r. 1 (3), verbatim and in the regulation's own order.
 *
 * A closed list in the regulation — not something to infer from a court-locator
 * page. Toronto is not on it, which surprises people.
 */
export const FAMILY_COURT_MUNICIPALITIES: readonly string[] = [
  "Regional Municipality of Durham",
  "County of Elgin",
  "County of Frontenac",
  "Regional Municipality of Haldimand-Norfolk",
  "County of Haliburton",
  "City of Hamilton",
  "County of Hastings",
  "City of Kawartha Lakes",
  "County of Lanark",
  "United Counties of Leeds and Grenville",
  "County of Lennox and Addington",
  "County of Middlesex",
  "Territorial District of Muskoka",
  "Regional Municipality of Niagara",
  "County of Northumberland",
  "City of Ottawa",
  "County of Peterborough",
  "United Counties of Prescott and Russell",
  "County of Prince Edward",
  "County of Renfrew",
  "County of Simcoe",
  "United Counties of Stormont, Dundas and Glengarry",
  "Regional Municipality of Waterloo",
  "Regional Municipality of York",
];

export const FAMILY_COURT_MUNICIPALITIES_CITATION: TriageCitation = {
  label: "O. Reg. 114/99 (Family Law Rules), r. 1 (3)",
  sourceUrl: FLR_SOURCE,
  verifiedAt: VERIFIED_AT,
};

export type MunicipalityRow = {
  name: string;
  /**
   * True where this row equals a municipality the user recorded. Highlighting a
   * match is navigation — helping someone find their own answer in a list of
   * 24. It is NOT a determination that their case goes to the Family Court, and
   * nothing downstream may treat it as one.
   */
  matchesRecordedAnswer: boolean;
};

export function municipalityRows(record: FamilyStatusRecord): MunicipalityRow[] {
  const recorded = new Set(
    [record.userMunicipality, record.otherPartyMunicipality].filter(
      (value): value is string => typeof value === "string",
    ),
  );

  return FAMILY_COURT_MUNICIPALITIES.map((name) => ({
    name,
    matchesRecordedAnswer: recorded.has(name),
  }));
}

// ---------------------------------------------------------------------------
// What the user is shown at the end
// ---------------------------------------------------------------------------

export type CourtInformationStatement = {
  text: string;
  citations: TriageCitation[];
};

/**
 * General statements of each statute's scope. Every one is about the STATUTE.
 * None is about the reader. The user does the applying, which is the
 * "who does the applying" test in CLAUDE.md section 2.
 */
export function courtInformation(): CourtInformationStatement[] {
  return [
    {
      text:
        "Which court hears a family case depends on what is being asked for. The Divorce Act " +
        "defines \"court\", for Ontario, as the Superior Court of Justice — so a divorce, and " +
        "any parenting, contact or support order asked for as part of a divorce, is not heard " +
        "in the Ontario Court of Justice.",
      citations: [
        { label: "Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.), s. 2 (1)", sourceUrl: DIVORCE_ACT_SOURCE, verifiedAt: VERIFIED_AT },
      ],
    },
    {
      text:
        "The Family Law Act's property rules (Part I) and matrimonial home rules (Part II) " +
        "each define \"court\" to exclude the Ontario Court of Justice. Support and parenting " +
        "under the Ontario statutes may be heard in the Ontario Court of Justice, the Family " +
        "Court, or the Superior Court of Justice.",
      citations: [
        { label: "Family Law Act, R.S.O. 1990, c. F.3, ss. 1 (1), 4 (1), 17", sourceUrl: FLA_SOURCE, verifiedAt: VERIFIED_AT },
      ],
    },
    {
      text:
        "In 24 named municipalities there is a single Family Court that hears all of it. " +
        "Proceedings listed in the Courts of Justice Act's Schedule \"shall be commenced, " +
        "heard and determined in the Family Court\" there. A case may be started in the Family " +
        "Court if either party lives in one of those municipalities.",
      citations: [
        { label: "Courts of Justice Act, R.S.O. 1990, c. C.43, ss. 21.8 (1), 21.11 (1)", sourceUrl: CJA_SOURCE, verifiedAt: VERIFIED_AT },
        FAMILY_COURT_MUNICIPALITIES_CITATION,
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Topic surfacing
// ---------------------------------------------------------------------------

export type SurfacedTopic = {
  id: string;
  title: string;
  /** One line. A description of the topic, never of the reader's situation. */
  summary: string;
  /** The longer body, shown on open. Still general; still about the law. */
  body: string;
  citations: TriageCitation[];
  /**
   * Which recorded facts caused this to appear, in plain words. Shown to the
   * user. Surfacing is navigation, and navigation the reader can see the reason
   * for is navigation they can disagree with.
   */
  surfacedBecause: string[];
};

const SPOUSE_DEFINITIONS_TOPIC: Omit<SurfacedTopic, "surfacedBecause"> = {
  id: "fla-two-spouse-definitions",
  title: "The Family Law Act uses \"spouse\" to mean two different things",
  summary:
    "Ontario's property-division rules and its support rules do not cover the same couples.",
  body:
    "The property rules are in Part I of the Family Law Act. Part I uses the definition of " +
    "\"spouse\" in s. 1 (1) — two people who are married to each other. The matrimonial-home " +
    "rules in Part II use the same definition.\n\n" +
    "The support rules in Part III use a wider definition, in s. 29: it includes people who " +
    "are married, and in addition two people who are not married to each other and have " +
    "cohabited either continuously for at least three years, or in a relationship of some " +
    "permanence if they are the parents of a child.\n\n" +
    "So a couple can be covered by the support rules and not by the property rules. Which " +
    "sections apply to a particular situation depends on facts a court may have to determine " +
    "— including when a couple separated, which is often disputed.",
  citations: [
    { label: "Family Law Act, R.S.O. 1990, c. F.3, ss. 1 (1), 4 (1), 17, 29", sourceUrl: FLA_SOURCE, verifiedAt: VERIFIED_AT },
  ],
};

const UNJUST_ENRICHMENT_TOPIC: Omit<SurfacedTopic, "surfacedBecause"> = {
  id: "cohabitee-unjust-enrichment",
  title: "A concept worth reading about: unjust enrichment",
  summary:
    "A recognised kind of family proceeding between people who have lived together, separate from the Family Law Act's property scheme.",
  body:
    "Claims for a constructive or resulting trust, or for a monetary award as compensation " +
    "for unjust enrichment between persons who have cohabited, are a kind of family " +
    "proceeding in their own right. They appear in the Courts of Justice Act's Schedule as " +
    "item 3, and in the Family Law Rules at r. 1 (2) (c).\n\n" +
    "This is a different route from the Family Law Act's equalization scheme and it works " +
    "differently. It is worth reading about what the concept means and what someone bringing " +
    "this kind of claim generally has to show, to see whether it fits.",
  citations: [
    { label: "Courts of Justice Act, R.S.O. 1990, c. C.43, s. 21.8, Schedule, item 3", sourceUrl: CJA_SOURCE, verifiedAt: VERIFIED_AT },
    { label: "O. Reg. 114/99 (Family Law Rules), r. 1 (2) (c)", sourceUrl: FLR_SOURCE, verifiedAt: VERIFIED_AT },
  ],
};

const EQUALIZATION_LIMITATION_TOPIC: Omit<SurfacedTopic, "surfacedBecause"> = {
  id: "fla-equalization-limitation",
  title: "There is a time limit on an equalization application",
  summary:
    "Family Law Act s. 7 (3) sets three separate deadlines and the earliest one governs.",
  body:
    "An application based on s. 5 (1) or (2) \"shall not be brought after the earliest of, " +
    "(a) two years after the day the marriage is terminated by divorce or judgment of " +
    "nullity; (b) six years after the day the spouses separate and there is no reasonable " +
    "prospect that they will resume cohabitation; (c) six months after the first spouse's " +
    "death.\"\n\n" +
    "Which of the three bites first depends on the dates in a particular situation, and one " +
    "of them — the day a couple separated with no reasonable prospect of resuming " +
    "cohabitation — is itself frequently disputed. This site does not calculate the date for " +
    "you. Because a missed deadline cannot usually be undone, this is worth confirming with " +
    "a licensed paralegal or lawyer.",
  citations: [
    { label: "Family Law Act, R.S.O. 1990, c. F.3, ss. 5, 7 (3)", sourceUrl: FLA_SOURCE, verifiedAt: VERIFIED_AT },
  ],
};

const DIVORCE_GROUNDS_TOPIC: Omit<SurfacedTopic, "surfacedBecause"> = {
  id: "divorce-act-grounds",
  title: "What the Divorce Act requires for a divorce",
  summary:
    "Breakdown of the marriage is established only in the three ways s. 8 (2) lists.",
  body:
    "Divorce Act s. 8 (1) lets a court grant a divorce on the ground that there has been a " +
    "breakdown of the marriage. s. 8 (2) says breakdown \"is established only if\" the spouses " +
    "have lived separate and apart for at least one year immediately preceding the " +
    "determination of the divorce proceeding and were living separate and apart at the " +
    "commencement of the proceeding, or the spouse against whom the proceeding is brought has " +
    "committed adultery or treated the other spouse with physical or mental cruelty.",
  citations: [
    { label: "Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.), s. 8", sourceUrl: DIVORCE_ACT_SOURCE, verifiedAt: VERIFIED_AT },
  ],
};

/**
 * Topics to read, chosen from recorded facts.
 *
 * The unjust-enrichment topic is surfaced UNPROMPTED to anyone who recorded
 * living together while not married — not only to someone who asks about
 * equalization. Someone who does not know the phrase cannot ask for it, and a
 * cohabitee who leaves believing they have no property remedy at all has been
 * misinformed by omission. It names a concept and cites where it lives; it says
 * nothing about whether this reader has such a claim.
 */
export function surfacedTopics(record: FamilyStatusRecord): SurfacedTopic[] {
  const topics: SurfacedTopic[] = [];

  if (record.marriedToOtherParty === "no") {
    topics.push({
      ...SPOUSE_DEFINITIONS_TOPIC,
      surfacedBecause: ["You recorded that you and the other person were not married to each other."],
    });

    if (record.cohabitationStart !== null) {
      topics.push({
        ...UNJUST_ENRICHMENT_TOPIC,
        surfacedBecause: [
          "You recorded that you and the other person were not married to each other.",
          "You recorded that you lived together.",
        ],
      });
    }
  }

  if (record.marriedToOtherParty === "yes") {
    topics.push({
      ...SPOUSE_DEFINITIONS_TOPIC,
      surfacedBecause: ["You recorded that you and the other person were married to each other."],
    });

    topics.push({
      ...EQUALIZATION_LIMITATION_TOPIC,
      surfacedBecause: ["You recorded that you and the other person were married to each other."],
    });

    if (record.divorceSought === "yes" || record.divorceSought === "unsure") {
      topics.push({
        ...DIVORCE_GROUNDS_TOPIC,
        surfacedBecause: [
          record.divorceSought === "yes"
            ? "You recorded that you are asking a court for a divorce."
            : "You recorded that you have not decided about a divorce yet.",
        ],
      });
    }
  }

  return topics;
}

// ---------------------------------------------------------------------------
// The outcome
// ---------------------------------------------------------------------------

export type RecordedFact = {
  label: string;
  /** Exactly what the user said, read back. Never a derived value. */
  value: string;
  state: RecordedState;
};

export type TriageOutcome = {
  complete: boolean;
  recorded: RecordedFact[];
  courtInformation: CourtInformationStatement[];
  municipalities: MunicipalityRow[];
  municipalitiesCitation: TriageCitation;
  topics: SurfacedTopic[];
};

function fact(label: string, value: string | null, notAsked: boolean): RecordedFact {
  if (notAsked) return { label, value: "Not asked", state: "not-asked" };
  if (value === null || value === "not-yet") return { label, value: "Not answered yet", state: "not-yet" };
  return { label, value, state: "provided" };
}

const YES_NO_TEXT: Record<string, string> = {
  yes: "Yes",
  no: "No",
  unsure: "Not decided yet",
};

export function buildTriageOutcome(record: FamilyStatusRecord): TriageOutcome {
  const pruned = new Set(prunedQuestions(record));

  const recorded: RecordedFact[] = [
    fact(
      "Married to the other person",
      YES_NO_TEXT[record.marriedToOtherParty] ?? "not-yet",
      false,
    ),
    fact(
      "Asking a court for a divorce",
      YES_NO_TEXT[record.divorceSought] ?? "not-yet",
      pruned.has("divorce-sought"),
    ),
    fact(
      "Lived together",
      record.cohabitationStart
        ? `${record.cohabitationStart} to ${record.cohabitationEnd ?? "not recorded"}`
        : null,
      pruned.has("cohabitation-dates"),
    ),
    fact(
      "Have a child together",
      YES_NO_TEXT[record.haveChildTogether] ?? "not-yet",
      pruned.has("child-together"),
    ),
    fact(
      "The case involves children",
      YES_NO_TEXT[record.caseInvolvesChildren] ?? "not-yet",
      false,
    ),
    fact("Your municipality", record.userMunicipality, false),
    fact("The other person's municipality", record.otherPartyMunicipality, false),
  ];

  return {
    complete: selectNextTriageQuestion(record) === null,
    recorded,
    courtInformation: courtInformation(),
    municipalities: municipalityRows(record),
    municipalitiesCitation: FAMILY_COURT_MUNICIPALITIES_CITATION,
    topics: surfacedTopics(record),
  };
}
