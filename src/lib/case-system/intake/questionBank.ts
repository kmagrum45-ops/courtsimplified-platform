/**
 * Small Claims question bank -- Phase 0 foundation for AI-guided intake.
 *
 * DRAFT wording -- every `text`/`why` below is pending lawyer/paralegal
 * review before it ships to real users, same convention as
 * `outOfScopeForums.ts`. Unlike that file, `status`/`reviewedAt` here are
 * real typed fields (not comment-only) so `verifyIntakeCoverage.ts` can
 * actually check them rather than relying on a human re-reading every
 * docstring.
 *
 * No question may imply case strength or characterize the user's facts
 * legally -- see docs/AI_INTAKE_DESIGN.md, "who does the applying" test.
 * A question is safe to ask without a source only when it is pure fact
 * collection (a date, an amount, a yes/no about what already happened).
 * The moment a question's `why` states a legal/procedural rule (a filing
 * deadline, a monetary limit, what a form does), it needs a `sourceUrl`
 * from ontario.ca, ontariocourts.ca, or ontariocourtforms.on.ca -- verified
 * by web-fetch, not recalled. `verifyIntakeCoverage.ts` enforces this for
 * every non-draft entry; while everything here is `status: "draft"` it is
 * a manual discipline, checked by the licensee review this bank is
 * pending, not yet a hard gate.
 *
 * `covers` links a question to the exact `intentionalGaps` string(s) it
 * addresses in `scripts/verification/scenarioRegistry.ts`. Matching is
 * exact-string, deliberately not fuzzy -- `verifyIntakeCoverage.ts` fails
 * loudly on a scenario gap with no covering question rather than silently
 * guessing a near-match.
 *
 * `appliesWhen.field` values must come from `KNOWN_FACT_FIELDS` below.
 * There is no fact-extraction AI yet (that's a later phase -- see
 * docs/AI_INTAKE_DESIGN.md phase 2), so this registry is a Phase 0
 * placeholder standing in for "the extractor schema" `verifyIntakeCoverage.ts`
 * checks against: the set of fact field names this question bank is
 * designed to eventually be driven by. Expand it deliberately as real
 * extraction gets built, not by inventing a field inline on a question.
 */

export const KNOWN_FACT_FIELDS = [
  "role",
  "disputeCategory",
  "claimFiled",
  "claimServed",
  "defenceFiled",
] as const;

export type KnownFactField = (typeof KNOWN_FACT_FIELDS)[number];

export type FactCondition =
  | { field: KnownFactField; op: "exists" }
  | { field: KnownFactField; op: "notExists" }
  | { field: KnownFactField; op: "truthy" }
  | { field: KnownFactField; op: "equals"; value: string | number | boolean }
  | { field: KnownFactField; op: "in"; values: (string | number | boolean)[] }
  | { all: FactCondition[] }
  | { any: FactCondition[] };

export type QuestionPhase = "orientation" | "substance" | "sensitive";
export type AnswerType = "date" | "amount" | "yes-no" | "short-text" | "choice";

export type IntakeQuestion = {
  id: string;
  courtArea: "small-claims";
  /** Omitted means the question always applies. */
  appliesWhen?: FactCondition;
  /** Exact words shown to the user -- this is legal information, not marketing copy. */
  text: string;
  /** Shown to the user alongside the question. States a legal fact only if sourceUrl is also set. */
  why?: string;
  /** Required whenever `why` (or `text`) states a legal/procedural fact. */
  sourceUrl?: string;
  answerType: AnswerType;
  /** Required when answerType === "choice". */
  choices?: string[];
  /** Every question must have an I-don't-know path that doesn't dead-end. */
  allowUnknown: boolean;
  sensitive: boolean;
  phase: QuestionPhase;
  /** The exact scenarioRegistry.ts intentionalGaps string(s) this question covers, if any. */
  covers?: string[];
  reviewedAt: string | null;
  status: "draft" | "reviewed";
};

export const QUESTION_BANK: IntakeQuestion[] = [
  // ---------------------------------------------------------------- orientation
  {
    id: "sc-orient-when-happened",
    courtArea: "small-claims",
    text: "Roughly when did the situation that led to this claim happen?",
    answerType: "date",
    allowUnknown: true,
    sensitive: false,
    phase: "orientation",
    covers: ["important date"],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-orient-role",
    courtArea: "small-claims",
    text: "Are you the person or business bringing this claim, or the one responding to a claim?",
    answerType: "choice",
    choices: ["Bringing the claim (plaintiff)", "Responding to a claim (defendant)"],
    allowUnknown: true,
    sensitive: false,
    phase: "orientation",
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-orient-dispute-category",
    courtArea: "small-claims",
    text: "What kind of dispute is this?",
    answerType: "choice",
    choices: [
      "Unpaid money owed to you",
      "A contract or agreement dispute",
      "Property damage",
      "A loan or debt",
      "Work done or services provided (e.g. a contractor)",
      "A deposit that wasn't returned",
      "A consumer purchase problem",
      "A vehicle-related dispute",
      "Something said about you (defamation)",
      "Something else",
    ],
    allowUnknown: true,
    sensitive: false,
    phase: "orientation",
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------ substance
  {
    id: "sc-amount-claimed",
    courtArea: "small-claims",
    text: "What is the total dollar amount you are claiming?",
    why:
      "Small Claims Court can only hear claims up to $50,000 (effective October 1, 2025), " +
      "excluding interest and costs -- if your amount is higher, this may not be the right court.",
    sourceUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
    answerType: "amount",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-claim-filed",
    courtArea: "small-claims",
    appliesWhen: { field: "role", op: "equals", value: "plaintiff" },
    text: "Has a Plaintiff's Claim (Form 7A) already been filed with the court?",
    why: "This is the form that formally starts a Small Claims Court case.",
    sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
    answerType: "yes-no",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-defendant-served",
    courtArea: "small-claims",
    appliesWhen: { field: "claimFiled", op: "equals", value: true },
    text:
      "Has the other party been formally served with the claim, and do you have a completed " +
      "Affidavit of Service (Form 8A)?",
    why: "The court needs proof of service before a case can move forward without a response.",
    sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/serving-documents",
    answerType: "yes-no",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-defence-filed",
    courtArea: "small-claims",
    appliesWhen: { field: "claimServed", op: "equals", value: true },
    text: "Has the other party filed a Defence with the court?",
    why:
      "A defendant generally has 20 calendar days to serve and file a defence. If that time has " +
      "passed with no defence filed, the plaintiff may be able to ask the court to note the " +
      "defendant in default.",
    sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/default-proceedings/",
    answerType: "yes-no",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    covers: ["Defence status"],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-contractor-completion-date",
    courtArea: "small-claims",
    appliesWhen: { field: "disputeCategory", op: "equals", value: "work-or-services" },
    text:
      "What was the agreed completion date for the work, and did that date pass before the " +
      "other party stopped responding?",
    answerType: "short-text",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    covers: [
      "Exact agreed completion date and whether it passed before the contractor stopped responding",
    ],
    reviewedAt: null,
    status: "draft",
    // Pure fact-gathering -- no legal rule is stated, so no sourceUrl is needed.
  },
  {
    id: "sc-contractor-notice-before-replacement",
    courtArea: "small-claims",
    appliesWhen: { field: "disputeCategory", op: "equals", value: "work-or-services" },
    text:
      "Before hiring anyone else to finish or fix the work, did you tell the original contractor " +
      "about the problem and give them a chance to respond?",
    answerType: "yes-no",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    covers: ["Whether any written notice was given to the original contractor before hiring the second one"],
    reviewedAt: null,
    status: "draft",
    // Deliberately no `why`/sourceUrl: no ontario.ca/ontariocourts.ca/ontariocourtforms.on.ca
    // page was found stating a notice-before-replacement rule for this fact pattern during
    // this session's research, so this stays a plain factual question rather than a taught one.
  },
  {
    id: "sc-evidence-available",
    courtArea: "small-claims",
    text:
      "What evidence do you have to support your claim (documents, photos, messages, receipts, " +
      "witnesses)?",
    answerType: "short-text",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-remedy-sought",
    courtArea: "small-claims",
    text: "What outcome are you asking the court to order?",
    answerType: "short-text",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: null,
    status: "draft",
  },

  // ------------------------------------------------------------------ sensitive
  {
    id: "sc-safety-check",
    courtArea: "small-claims",
    text:
      "Is there anything about your safety, or the other party's behaviour toward you, that we " +
      "should know before continuing?",
    answerType: "short-text",
    allowUnknown: true,
    sensitive: true,
    phase: "sensitive",
    reviewedAt: null,
    status: "draft",
    // Screening question, not a legal-fact assertion -- no source required.
  },
];
