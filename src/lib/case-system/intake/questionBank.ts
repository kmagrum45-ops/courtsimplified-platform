/**
 * Small Claims question bank -- Phase 0 foundation for AI-guided intake.
 *
 * Every entry's `status`/`reviewedAt` reflects the site owner's own review
 * for this pre-launch product, same real typed fields `verifyIntakeCoverage.ts`
 * checks rather than relying on a human re-reading every docstring.
 *
 * No question may imply case strength or characterize the user's facts
 * legally -- see docs/AI_INTAKE_DESIGN.md, "who does the applying" test.
 * A question is safe to ask without a source only when it is pure fact
 * collection (a date, an amount, a yes/no about what already happened).
 * The moment a question's `why` states a legal/procedural rule (a filing
 * deadline, a monetary limit, what a form does), it needs a `sourceUrl`
 * from ontario.ca, ontariocourts.ca, or ontariocourtforms.on.ca -- verified
 * by web-fetch, not recalled. `verifyIntakeCoverage.ts` enforces this for
 * every `status: "reviewed"` entry as a hard gate.
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
  // "twentyDaysElapsed" was removed in Session 48. It held an AI-inferred
  // conclusion that a legal deadline had passed, extracted from free-text
  // prose, and no extractor can reach that conclusion correctly: it requires
  // r. 3.01's exclude-first/include-last counting, the weekend/holiday
  // rollover, and the service-effectiveness rule for the method actually
  // used -- and the regulation is silent on how the last of those composes
  // with the first. Its only consumer gated a default-step question on it.
  // Deleted rather than left unused: an inferred legal conclusion sitting in
  // the fact model is a standing invitation for the next feature to rely on
  // it. See docs/SMALL_CLAIMS_RULES_MAP.md Part 1 and Part 3.
  // Session 30: verbatim free-text answers, captured directly by
  // orchestrateIntakeTurn.ts (via a question's capturesField below) rather
  // than by AI extraction -- the exact question being answered is already
  // known with certainty, so there is nothing for an extractor to infer.
  "amountClaimedText",
  "timelineText",
  "evidenceText",
  "remedySoughtText",
  "serviceDetailsText",
  "claimReceivedText",
  "defenceFactsText",
  "defenceEvidenceText",
  "defendantOutcomeText",
  // Session 48 — the three defendant gaps INTAKE_ENTRY_POINT_DESIGN.md §1c
  // identified. All three are verbatim-captured free text, the same shape as
  // the fields above, never an inferred conclusion. No `caseStage` field is
  // added: that design's own decision 2 concluded a derived position cannot
  // drift from the facts it came from, so stage is computed from
  // claimFiled/claimServed/defenceFiled by deriveCaseStage() rather than
  // stored. See caseStageDerivation.ts.
  "serviceMethodText",
  "counterclaimIntentText",
  "admissionAndPaymentText",
  // 2026-09-29. Set by the extractor only when the person's OWN words say it
  // happened. They gate the two "learned of" date questions: a defendant who
  // was just served is never asked about default or judgment unless they
  // raise it (site owner's rule, 2026-09-29).
  "notedInDefault",
  "defaultJudgment",
] as const;

export type KnownFactField = (typeof KNOWN_FACT_FIELDS)[number];

/**
 * Session 16. Widened from a literal "small-claims" so the engine
 * (selectQuestions.ts, orchestrateIntakeTurn.ts, claimTypes.ts) can accept
 * a Family or Civil question/claim-type bank later without a type change
 * here -- adding real Family/Civil content is separate, future, sourcing
 * work, not done this session. Every entry in QUESTION_BANK below still
 * has courtArea: "small-claims" -- this only widens what the TYPE allows.
 */
export type CourtArea = "small-claims" | "family" | "civil";

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
  courtArea: CourtArea;
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
  /** Neutral examples that help a user understand the kind of factual answer requested. */
  examples?: string[];
  /**
   * Session 30: when set, the user's raw answer text to this question is
   * captured verbatim into IntakeFacts[capturesField] by
   * orchestrateIntakeTurn.ts -- no AI extraction, since the question being
   * answered is already known with certainty at the moment of answering.
   * Only meaningful for free-text-style answers; must be one of the
   * "...Text" fields in KNOWN_FACT_FIELDS above, never one of the 6
   * AI-extracted structured fields.
   */
  capturesField?: KnownFactField;
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
    capturesField: "timelineText",
    allowUnknown: true,
    sensitive: false,
    phase: "orientation",
    covers: ["important date"],
    reviewedAt: "2026-09-07",
    status: "reviewed",
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
    reviewedAt: "2026-09-07",
    status: "reviewed",
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
      // 2026-09-28: was "Work done or services provided (e.g. a contractor)",
      // which a freelancer owed money would also pick. Unpaid work has its own
      // choice above.
      "Work or a service you paid for (e.g. a contractor)",
      "A deposit that wasn't returned",
      "A consumer purchase problem",
      "A vehicle-related dispute",
      "Something said about you (defamation)",
      /*
       * Added with the injury-date question. Somebody who slipped on an icy
       * municipal sidewalk had no category to pick but "Something else", which
       * is the worst possible answer for them: the municipal notice deadline is
       * TEN DAYS, and nothing downstream could recognise what they had.
       */
      "A slip, a fall, or another injury",
      "Something else",
    ],
    allowUnknown: true,
    sensitive: false,
    phase: "orientation",
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },

  // ------------------------------------------------------------------ substance
  {
    id: "sc-amount-claimed",
    courtArea: "small-claims",
    appliesWhen: { field: "role", op: "equals", value: "plaintiff" },
    text: "What is the total dollar amount you are claiming?",
    why:
      "Small Claims Court can only hear claims up to $50,000 (effective October 1, 2025), " +
      "excluding interest and costs -- if your amount is higher, this may not be the right court.",
    sourceUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
    answerType: "amount",
    capturesField: "amountClaimedText",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    id: "sc-defamation-publication-details",
    courtArea: "small-claims",
    appliesWhen: { field: "disputeCategory", op: "equals", value: "defamation" },
    text:
      "What exact words were said or written, who received or saw them, and when did that happen?",
    answerType: "short-text",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-07",
    status: "reviewed",
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
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    // 2026-09-28: plaintiff only. Worded from the plaintiff's side ("the other
    // party", "the defendant"), it was asked of defendants too, because the gate
    // tested only the filing facts. Found by the story review battery (SC7, SC8).
    id: "sc-defendant-served",
    courtArea: "small-claims",
    appliesWhen: {
      all: [
        { field: "role", op: "equals", value: "plaintiff" },
        { field: "claimFiled", op: "equals", value: true },
      ],
    },
    text:
      "Has the other party been formally served with the claim, and do you have a completed " +
      "Affidavit of Service (Form 8A)?",
    why: "The court needs proof of service before a case can move forward without a response.",
    sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/serving-documents",
    answerType: "yes-no",
    capturesField: "serviceDetailsText",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    // 2026-09-28: plaintiff only. Worded from the plaintiff's side ("the other
    // party", "the defendant"), it was asked of defendants too, because the gate
    // tested only the filing facts. Found by the story review battery (SC7, SC8).
    id: "sc-defence-filed",
    courtArea: "small-claims",
    appliesWhen: {
      all: [
        { field: "role", op: "equals", value: "plaintiff" },
        { field: "claimServed", op: "equals", value: true },
      ],
    },
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
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    // 2026-09-28: plaintiff only. Worded from the plaintiff's side ("the other
    // party", "the defendant"), it was asked of defendants too, because the gate
    // tested only the filing facts. Found by the story review battery (SC7, SC8).
    id: "sc-defence-time-elapsed",
    courtArea: "small-claims",
    appliesWhen: {
      all: [
        { field: "role", op: "equals", value: "plaintiff" },
        { field: "claimServed", op: "equals", value: true },
        { field: "defenceFiled", op: "equals", value: false },
      ],
    },
    text: "Has it been 20 calendar days since the defendant was served with the claim?",
    why: "This helps identify the procedural stage after service when no Defence has been recorded.",
    sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/default-proceedings/",
    answerType: "yes-no",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    // Session 48. The `twentyDaysElapsed` condition was removed from this
    // gate. It was an AI-inferred conclusion that a legal deadline had
    // passed, and surfacing this question only when the system believed that
    // amounted to signalling that the default step was available -- a
    // conclusion the system is not in a position to reach. Three provisions
    // push the real deadline later than a naive count (r. 3.01 excludes the
    // day of service; a last day falling on a weekend rolls forward; and
    // when service is effective depends on the method used), and one
    // composition question is unanswerable from the regulation at all.
    // The rule is now stated so the user can apply it to their own dates.
    // 2026-09-28: plaintiff only. Worded from the plaintiff's side ("the other
    // party", "the defendant"), it was asked of defendants too, because the gate
    // tested only the filing facts. Found by the story review battery (SC7, SC8).
    id: "sc-defendant-noted-in-default",
    courtArea: "small-claims",
    appliesWhen: {
      all: [
        { field: "role", op: "equals", value: "plaintiff" },
        { field: "claimServed", op: "equals", value: true },
        { field: "defenceFiled", op: "equals", value: false },
      ],
    },
    text:
      "If the defendant hasn't filed a Defence: what date were they served, and how was the claim " +
      "served on them? And have you already asked the court to note them in default?",
    why:
      "A defendant who wants to dispute a claim has 20 days from being served to serve and file a " +
      "Defence. How that period is counted is set by the Rules: the first day is excluded and the " +
      "last day is included, and if the last day falls on a holiday the period ends on the next day " +
      "that is not a holiday -- and \"holiday\" is defined to include any Saturday or Sunday. So " +
      "weekends in the middle are counted and extend nothing; only the last day moves. " +
      "When service counts as effective depends on how it was done. Served in person, it is the day " +
      "it happened. Where a claim is sent to an individual's home by registered mail or courier and " +
      "a signature verifying receipt is obtained, the Rules make service effective on the date that " +
      "signature shows receipt -- not the date of mailing. (The separate five-day rule for documents " +
      "sent by mail or courier expressly does NOT apply to a claim served that way.) " +
      "One thing the Rules do not say: how those service-effectiveness provisions interact with the " +
      "counting rule -- whether the effective day is the excluded first day, for instance. Because " +
      "the regulation is silent on that, this site does not calculate the date for you. These are " +
      "the facts to confirm so you can work it out, and the court or a licensed paralegal or lawyer " +
      "can confirm it.",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
    answerType: "short-text",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    id: "sc-defendant-claim-received",
    courtArea: "small-claims",
    appliesWhen: { field: "role", op: "equals", value: "defendant" },
    text: "When did you receive the Plaintiff's Claim, and what court documents did you receive?",
    answerType: "short-text",
    capturesField: "claimReceivedText",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-10",
    status: "reviewed",
  },
  {
    // 2026-09-29. For the person being sued, the next step after being served
    // is responding, so that is what is asked -- never default or judgment
    // unless they raise it (site owner's rule). sc-defence-filed asks the
    // PLAINTIFF whether the other side has filed; this is the defendant's own.
    // The `why` repeats r. 9.01 of the Rules of the Small Claims Court, read
    // from docs/sources/corpus/oreg-258-98-small-claims-rules.txt (e-Laws
    // 980258_e.doc, retrieved 2026-09-27), the same wording as
    // smallClaimsStartingSteps.ts "defence-20-days".
    id: "sc-defendant-defence-filed",
    courtArea: "small-claims",
    appliesWhen: { field: "role", op: "equals", value: "defendant" },
    text: "Have you filed a Defence (Form 9A) with the court yet?",
    why:
      "A defendant who wants to dispute the claim has 20 days after being served to serve a Defence " +
      "(Form 9A) on every other party and file it, with proof of service, with the clerk.",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
    answerType: "yes-no",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-29",
    status: "reviewed",
  },
  {
    id: "sc-defendant-response-facts",
    courtArea: "small-claims",
    appliesWhen: { field: "role", op: "equals", value: "defendant" },
    text: "In your own words, which facts in the Plaintiff's Claim do you agree with, and which facts do you disagree with?",
    answerType: "short-text",
    capturesField: "defenceFactsText",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-10",
    status: "reviewed",
  },
  {
    id: "sc-defendant-response-evidence",
    courtArea: "small-claims",
    appliesWhen: { field: "role", op: "equals", value: "defendant" },
    text: "What documents, messages, photos, receipts, or witness information do you have about your response?",
    answerType: "short-text",
    capturesField: "defenceEvidenceText",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-10",
    status: "reviewed",
  },
  {
    id: "sc-defendant-outcome",
    courtArea: "small-claims",
    appliesWhen: { field: "role", op: "equals", value: "defendant" },
    text: "Are you only responding to the Plaintiff's Claim, or are you asking the court for an outcome of your own? Describe it in your own words.",
    answerType: "short-text",
    capturesField: "defendantOutcomeText",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-10",
    status: "reviewed",
  },
  {
    // GAP 2 (INTAKE_ENTRY_POINT_DESIGN.md §1c). The reworked
    // sc-defendant-noted-in-default asks a PLAINTIFF for date and method of
    // service, because when service is effective depends on how it was done.
    // A defendant needs the same two facts for the opposite reason: their own
    // 20 days under r. 9.01 runs from being served.
    //
    // Says what the Rules provide and stops. It does NOT compute a date, and
    // says so -- the regulation never states how the service-effectiveness
    // provisions compose with r. 3.01's counting rule, and 3fdccdc
    // established that recording that silence beats inferring a default.
    id: "sc-defendant-service-method",
    courtArea: "small-claims",
    appliesWhen: { field: "role", op: "equals", value: "defendant" },
    text:
      "How was the Plaintiff's Claim delivered to you -- handed to you in person, left with someone " +
      "else, sent by registered mail or courier, by email, or another way? And what date did that " +
      "happen?",
    why:
      "A defendant who wants to dispute a claim has 20 days from being served to serve and file a " +
      "Defence. When service counts as effective depends on how it was done: in person, it is the " +
      "day it happened; where a claim is sent to an individual's home by registered mail or courier " +
      "and a signature verifying receipt is obtained, the Rules make service effective on the date " +
      "that signature shows receipt, not the date of mailing. (The separate five-day rule for " +
      "documents sent by mail or courier expressly does NOT apply to a claim served that way.) " +
      "The Rules also count a period by excluding the first day and including the last, and if the " +
      "last day falls on a holiday the period ends on the next day that is not a holiday -- with " +
      "\"holiday\" defined to include any Saturday or Sunday, so weekends in between are counted and " +
      "extend nothing. " +
      "What the Rules do NOT say is how those two things interact -- whether the effective day is " +
      "the excluded first day, for instance. Because the regulation is silent on that, this site " +
      "does not calculate the date for you. These are the facts to write down so you can work it " +
      "out, and the court or a licensed paralegal or lawyer can confirm it.",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
    answerType: "short-text",
    capturesField: "serviceMethodText",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-12",
    status: "reviewed",
  },
  {
    // GAP 1. Deliberately consistent with claimTypes.ts's
    // defence-set-off-or-counterclaim, corrected in 3fdccdc, rather than
    // restating r. 10.01(2) independently -- two statements of the same rule
    // drift, and that entry is the one already reviewed.
    id: "sc-defendant-counterclaim",
    courtArea: "small-claims",
    appliesWhen: { field: "role", op: "equals", value: "defendant" },
    text:
      "Do you believe the plaintiff -- or someone else -- owes you money or is responsible for part " +
      "of what happened? And have you already started your own claim about it?",
    why:
      "A defendant can bring their own claim against the plaintiff or someone else as part of the " +
      "same case, called a Defendant's Claim (Form 10A). The Rules say it may be ISSUED within 20 " +
      "days after the day the defence is filed -- issuing and filing are different steps, and the " +
      "20 days runs from the day the defence was filed, not from when it was served or received. " +
      "Missing that window does not end it: after those 20 days a Defendant's Claim may still be " +
      "issued with leave of the court, at any point before trial or default judgment. After trial " +
      "or default judgment that route is no longer available. Once issued it still has to be served " +
      "on every person it is made against. " +
      "Whether any of that fits your situation is yours to decide -- this question only records what " +
      "you think happened and what you have done so far.",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
    answerType: "short-text",
    capturesField: "counterclaimIntentText",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-12",
    status: "reviewed",
  },
  {
    // GAP 3. r. 9.03, sourced directly from O. Reg. 258/98. A common
    // defendant position the question bank had no route for at all: many
    // people do not dispute owing money, they dispute paying it at once.
    //
    // Asks what the person wants and what they can manage. It does not
    // suggest they should admit anything, and does not characterise their
    // position -- admitting liability is a decision with real consequences
    // and is theirs alone.
    id: "sc-defendant-admission-payment",
    courtArea: "small-claims",
    appliesWhen: { field: "role", op: "equals", value: "defendant" },
    text:
      "Is there any part of this claim you accept you owe? If there is, is the difficulty the amount " +
      "itself, or being able to pay it all at once?",
    why:
      "The Rules provide a route for this. A defendant who admits liability for all or part of the " +
      "plaintiff's claim but wants to arrange terms of payment may, IN THE DEFENCE, admit liability " +
      "and propose terms of payment. " +
      "What happens next depends on the plaintiff. If the plaintiff does not dispute the proposal " +
      "within 20 days after service of the defence, the defendant must then make payment in " +
      "accordance with the proposal AS IF IT WERE A COURT ORDER -- and if they do not, the plaintiff " +
      "can serve a notice of default of payment (Form 20L), and the clerk signs judgment for the " +
      "unpaid balance once 15 days have passed since that notice was served. " +
      "If the plaintiff does dispute it, they file and serve a request to clerk (Form 9B) for a terms " +
      "of payment hearing, and the clerk fixes a time and serves notice of the hearing. " +
      "Whether to admit any part of a claim is a significant decision and entirely yours. This " +
      "question only records what you tell us.",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
    answerType: "short-text",
    capturesField: "admissionAndPaymentText",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-12",
    status: "reviewed",
  },
  {
    // 2026-09-28: plaintiff only, and "work-or-services" now means work the
    // narrator PAID FOR (extractIntakeFacts.ts). Both questions are addressed to
    // the customer ("before hiring anyone else"); they were asked of a contractor
    // being sued and of freelancers owed money. Found by the story review battery.
    id: "sc-contractor-completion-date",
    courtArea: "small-claims",
    appliesWhen: {
      all: [
        { field: "role", op: "equals", value: "plaintiff" },
        { field: "disputeCategory", op: "equals", value: "work-or-services" },
      ],
    },
    // Reworded 2026-09-28: the old text ("...and did that date pass before the
    // other party stopped responding?") read oddly when no date was agreed,
    // which is common with informal hires, and asked the user to compare two
    // dates in one breath. Still pure fact collection.
    text: "Was a date agreed for the work to be finished? If so, what was it?",
    answerType: "short-text",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    covers: [
      "Exact agreed completion date and whether it passed before the contractor stopped responding",
    ],
    reviewedAt: "2026-09-07",
    status: "reviewed",
    // Pure fact-gathering -- no legal rule is stated, so no sourceUrl is needed.
  },
  {
    // 2026-09-28: plaintiff only, and "work-or-services" now means work the
    // narrator PAID FOR (extractIntakeFacts.ts). Both questions are addressed to
    // the customer ("before hiring anyone else"); they were asked of a contractor
    // being sued and of freelancers owed money. Found by the story review battery.
    id: "sc-contractor-notice-before-replacement",
    courtArea: "small-claims",
    appliesWhen: {
      all: [
        { field: "role", op: "equals", value: "plaintiff" },
        { field: "disputeCategory", op: "equals", value: "work-or-services" },
      ],
    },
    text:
      "Before hiring anyone else to finish or fix the work, did you tell the original contractor " +
      "about the problem and give them a chance to respond?",
    answerType: "yes-no",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    covers: ["Whether any written notice was given to the original contractor before hiring the second one"],
    reviewedAt: "2026-09-07",
    status: "reviewed",
    // Deliberately no `why`/sourceUrl: no ontario.ca/ontariocourts.ca/ontariocourtforms.on.ca
    // page was found stating a notice-before-replacement rule for this fact pattern during
    // this session's research, so this stays a plain factual question rather than a taught one.
  },
  {
    id: "sc-evidence-available",
    courtArea: "small-claims",
    appliesWhen: { field: "role", op: "equals", value: "plaintiff" },
    text:
      "What evidence do you have to support your claim (documents, photos, messages, receipts, " +
      "witnesses)?",
    answerType: "short-text",
    capturesField: "evidenceText",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    id: "sc-remedy-sought",
    courtArea: "small-claims",
    appliesWhen: { field: "role", op: "equals", value: "plaintiff" },
    text: "What outcome are you asking the court to order?",
    examples: [
      "Payment of a specific amount of money",
      "Return of property or its value",
      "Payment for repair costs or other documented losses",
      "Another outcome — describe it in your own words",
    ],
    answerType: "short-text",
    capturesField: "remedySoughtText",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },

  /*
   * ---------------------------------------------- the dates a deadline runs from
   *
   * DECISION 5. Seven questions, one for each event in the stage map that a
   * deadline is counted from and that a person can simply report. The events
   * are catalogued in `case-system/deadlines/deadlineEvents.ts`, which holds the
   * join from these ids to the deadlines, and which also records the events we
   * deliberately DO NOT ask about and why — the limitation period is the
   * important one, because when a claim was "discovered" is decided under
   * Limitations Act s. 5 and is not a fact a reader can report.
   *
   * *** WHY EVERY ONE IS OPTIONAL AND CONDITIONAL ***
   *
   * Each begins "If…" and every one has `allowUnknown`. A known date buys the
   * reader a computed deadline with the counting shown; an unknown one costs
   * them nothing, because the block still states the period and the rule. There
   * is no path where skipping one produces a worse answer, which is the only
   * arrangement under which an optional question is honest.
   *
   * *** WHY NONE OF THEM HAS A `sourceUrl` ***
   *
   * None states a legal or procedural fact. "What date was it served?" asks for
   * something that happened; it does not say what follows from the answer. The
   * moment one of these said "you have 20 days from that date" it would need a
   * source — and it would also be the wrong place to say it, because the
   * deadline belongs beside the rule in the stage answer, not in the question.
   *
   * *** WHY THERE IS NO `capturesField` ***
   *
   * `capturesField` writes a verbatim answer into an `IntakeFacts` text field.
   * These answers are consumed as DATES, by `caseDatesFrom`, which refuses
   * anything ambiguous — "03/04/2026" is two different days and is rejected
   * rather than guessed. Storing them as prose beside that would create a second
   * copy that the arithmetic does not read.
   *
   * *** WHY EACH ONE IS GATED ON THE STATE THAT MAKES IT POSSIBLE ***
   *
   * They were ungated at first, on the reasoning that the "If…" did the work and
   * a gate we got wrong would hide a question somebody needed. Running
   * `test:fixtures` settled it, and it settled it twice over:
   *
   *   - Every fixture went from 11 turns to 18. Three pre-filing stories were
   *     each asked seven questions about default judgments and settlement
   *     conferences in a case that did not exist yet. Even answered "not
   *     applicable" seven times, that is a worse intake.
   *
   *   - Worse, all three picked up `possibleCorrections: role "plaintiff" ->
   *     "defendant"`. The extractor reads the transcript, and a plaintiff
   *     answering questions about being served with a claim and being noted in
   *     default reads like a defendant. The correction was only ever proposed,
   *     never applied (CLAUDE.md §4), and the stories still matched the right
   *     claim type — but a date question was pushing the reader's own role
   *     toward the wrong answer, which is not a cost worth paying for a date we
   *     would not have used.
   *
   * So each is gated on the procedural fact that makes it answerable at all,
   * and the two side-specific ones on `role` as well: a defendant's claim is
   * served BY a defendant ON a plaintiff (r. 10), and being noted in default
   * happens to a defendant.
   *
   * The "If…" phrasing STAYS even so. The gates read AI-extracted booleans,
   * which can be wrong, and the conditional wording is what keeps a
   * wrongly-gated question from asserting something about the reader's case.
   */
  {
    /*
     * The date a 10-day clock starts, and the highest-stakes date in the bank.
     *
     * Municipal Act s. 44 (10) and City of Toronto Act s. 42 (6) give TEN DAYS
     * from the injury to serve written notice, and Occupiers' Liability Act
     * s. 6.1 gives sixty for snow and ice on private premises. Those are the
     * only deadlines in this product where missing it means there is no action
     * at all, and until this question existed they were the only ones that could
     * never show a computed date — the event was recorded as one we do not ask
     * about, on a reason that stopped being true the day the route started
     * accepting dates.
     *
     * *** WHY THE GATE IS A SET AND NOT A SINGLE VALUE ***
     *
     * `disputeCategory` is a lowercase-hyphenated slug the extractor writes
     * freely ("a short lowercase-hyphenated slug for the kind of dispute, if
     * clear"), so an `equals "personal-injury"` gate would hold or fail on which
     * synonym a model happened to pick that run. Several are listed. If it emits
     * one that is not here the question is not asked, the date stays unknown, and
     * the block shows the period — the same fallback as every other date, and the
     * reason that fallback had to be safe.
     */
    id: "sc-date-injury",
    courtArea: "small-claims",
    appliesWhen: {
      field: "disputeCategory",
      op: "in",
      values: [
        "personal-injury",
        "injury",
        "slip-and-fall",
        "slip-or-fall",
        "trip-and-fall",
        "premises-liability",
        "occupiers-liability",
      ],
    },
    text: "If this involves an injury, what date did it happen?",
    examples: ["2026-02-03", "3 February 2026", "February 3 2026"],
    answerType: "date",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-26",
    status: "reviewed",
  },
  {
    id: "sc-date-claim-served",
    courtArea: "small-claims",
    appliesWhen: { field: "claimServed", op: "equals", value: true },
    text: "If the claim has been served, what date was it served?",
    examples: ["2026-03-02", "3 April 2026", "April 3 2026"],
    answerType: "date",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-25",
    status: "reviewed",
  },
  {
    id: "sc-date-claim-issued",
    courtArea: "small-claims",
    appliesWhen: { field: "claimFiled", op: "equals", value: true },
    text: "If a claim has been issued by the court, what date is on it?",
    examples: ["2026-03-02", "3 April 2026", "April 3 2026"],
    answerType: "date",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-25",
    status: "reviewed",
  },
  {
    id: "sc-date-defence-filed",
    courtArea: "small-claims",
    appliesWhen: { field: "defenceFiled", op: "equals", value: true },
    text: "If a defence has been filed, what date was it filed?",
    examples: ["2026-03-02", "3 April 2026", "April 3 2026"],
    answerType: "date",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-25",
    status: "reviewed",
  },
  {
    id: "sc-date-defendants-claim-served",
    courtArea: "small-claims",
    appliesWhen: {
      all: [
        { field: "role", op: "equals", value: "plaintiff" },
        { field: "defenceFiled", op: "equals", value: true },
      ],
    },
    text: "If you were served with a defendant's claim, what date was it served?",
    examples: ["2026-03-02", "3 April 2026", "April 3 2026"],
    answerType: "date",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-25",
    status: "reviewed",
  },
  {
    id: "sc-date-settlement-conference",
    courtArea: "small-claims",
    appliesWhen: { field: "defenceFiled", op: "equals", value: true },
    text: "If a settlement conference has been scheduled, what date is it?",
    examples: ["2026-03-02", "3 April 2026", "April 3 2026"],
    answerType: "date",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-25",
    status: "reviewed",
  },
  {
    id: "sc-date-learned-of-default",
    courtArea: "small-claims",
    appliesWhen: {
      all: [
        { field: "role", op: "equals", value: "defendant" },
        { field: "claimServed", op: "equals", value: true },
        { field: "notedInDefault", op: "equals", value: true },
      ],
    },
    text: "If you have been noted in default, what date did you find out?",
    examples: ["2026-03-02", "3 April 2026", "April 3 2026"],
    answerType: "date",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-25",
    status: "reviewed",
  },
  {
    /*
     * The date you FOUND OUT, not the date of the judgment.
     *
     * r. 17.01 (5) gives 30 days after the party becomes aware of the judgment,
     * and r. 11.06 speaks to acting as soon as is reasonably possible after
     * learning of the default. A judgment made at a hearing nobody attended is
     * often learned of weeks later, so counting from the judgment date would
     * hand the reader a deadline earlier than the one the rule gives them. The
     * judgment date is therefore a question we do not ask at all — see
     * deadlineEvents.ts.
     */
    id: "sc-date-learned-of-judgment",
    courtArea: "small-claims",
    // Unchanged for a plaintiff. A defendant is asked only when their own
    // words say a judgment was made (2026-09-29).
    appliesWhen: {
      any: [
        {
          all: [
            { field: "role", op: "equals", value: "plaintiff" },
            { field: "claimFiled", op: "equals", value: true },
          ],
        },
        {
          all: [
            { field: "role", op: "equals", value: "defendant" },
            { field: "claimFiled", op: "equals", value: true },
            { field: "defaultJudgment", op: "equals", value: true },
          ],
        },
      ],
    },
    text: "If judgment was made at a hearing you did not attend, what date did you find out?",
    examples: ["2026-03-02", "3 April 2026", "April 3 2026"],
    answerType: "date",
    allowUnknown: true,
    sensitive: false,
    phase: "substance",
    reviewedAt: "2026-09-25",
    status: "reviewed",
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
    reviewedAt: "2026-09-07",
    status: "reviewed",
    // Screening question, not a legal-fact assertion -- no source required.
  },
];
