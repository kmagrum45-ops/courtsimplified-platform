/**
 * PART 2 — the stage map. Where a person actually is in an Ontario Small
 * Claims case, for both sides, including the positions where something has
 * already gone wrong.
 *
 * *** WHAT WENT WRONG BEFORE ***
 *
 * docs/accuracy-diagnosis.md traced ten realistic stories through the live
 * code. Eight received the same block — "file a Defence within 20 days" —
 * including three plaintiffs and a defendant against whom default judgment had
 * already been signed. The root cause was `text.includes("defendant")` in a
 * hand-written `inferStage`, but the deeper cause was that there was nowhere
 * better for those stories to go: the nine-value `UniversalStage` taxonomy had
 * no position for a claim issued but not served, a defence period running,
 * twenty days elapsed with no defence, a defendant noted in default, or a
 * default judgment signed. FIVE OF THE TEN STORIES HAD NO CORRECT DESTINATION.
 * Better detection against that taxonomy would have produced a better-aimed
 * wrong answer.
 *
 * So the taxonomy comes first, and it is deliberately finer than the routing
 * code can currently resolve. A stage the classifier cannot yet reach is a
 * known gap. A stage that does not exist is a silent wrong answer.
 *
 * *** WHAT EACH STAGE MUST CARRY, AND WHY ***
 *
 * `distinguishedFrom` is the part that would have prevented the original bug.
 * Each stage states what separates it from the positions it is most likely to
 * be confused with — not a description of itself, but the fact that decides
 * between two neighbours. "Has a defence been filed" is what separates
 * `plaintiff:served-awaiting-defence` from
 * `plaintiff:defence-period-expired-no-defence`, and any classifier that
 * cannot answer it must return UNKNOWN rather than pick. `verifyStageMap`
 * requires every non-special stage to name at least one neighbour, because a
 * stage with no recorded boundary is a stage nothing can be told apart from.
 *
 * `cues` are what a person actually writes, in their words. They are inputs to
 * classification, never shown to a user, and never sufficient on their own —
 * see the UNKNOWN stage.
 *
 * *** STAGES WHERE SOMETHING WENT WRONG ARE FIRST-CLASS ***
 *
 * Missed deadline, failed service, missed hearing, default judgment against
 * you, wrong court. These are ordinary positions carrying ordinary content,
 * not error states or fallbacks. They are also, predictably, when a person is
 * most frightened and most likely to be searching at midnight. A product that
 * models the happy path and treats everything else as "not sure" fails exactly
 * the people with the most at stake.
 *
 * *** WHAT THIS FILE IS NOT ***
 *
 * It is not content. No text here is shown to a user, apart from the two
 * special stages' messages, which say only that we do not know and where to
 * go. The blocks a user reads are Part 3's, keyed by stage id, and written
 * through the drafter/verifier pipeline. Keeping the model and the words apart
 * means the taxonomy can be argued about without anyone rewriting prose, and
 * the prose can be verified without anyone re-litigating the taxonomy.
 *
 * *** EVERY CITATION HERE IS A QUOTE, AND EVERY QUOTE IS CHECKED ***
 *
 * See citations.ts. `verifyStageMap` reads each quote back out of the vendored
 * corpus, so a rule number recalled rather than read cannot ship.
 */

import type { DeadlineEventKey } from "../deadlines/deadlineEvents";
import type { RuleCitation } from "./citations";
import * as C from "./citations";

export type Side = "plaintiff" | "defendant" | "both";

/**
 * Which regime counts the days.
 *
 * Not decoration. r. 3.01 governs periods prescribed by the Small Claims
 * rules; the Legislation Act governs statutory periods such as the notice
 * deadlines. They differ, and the difference decides real dates — see the
 * Saturday note in citations.ts.
 */
export type CountingRegime = "small-claims-rules" | "legislation-act";

/**
 * What missing the deadline costs.
 *
 * The distinction the pre-suit notice work established. Missing a defence
 * deadline changes what happens next and is recoverable by motion under
 * r. 11.06. Missing a notice deadline means, subject to narrow exceptions,
 * there is no action at all. Content that presents the two the same way
 * teaches people that every deadline is survivable, which is false in exactly
 * the cases where being wrong is unrecoverable.
 */
export type DeadlineConsequence = "bars-the-claim" | "changes-what-happens-next";

export type DeadlineLength =
  | { unit: "days"; count: number }
  | { unit: "months"; count: number }
  | { unit: "years"; count: number };

export type StageDeadline = {
  id: string;
  /** Plain language, no law. The law is in `rule`. */
  what: string;
  /**
   * The event the clock runs from, in the words a reader sees.
   *
   * This is the prose. `countFromEvent` beside it is the key. Both are here on
   * purpose: the prose is what belongs in a sentence ("counted from the day the
   * defendant was served with the claim") and it is deliberately phrased from
   * the reader's side, which makes it useless as an identifier — the same
   * moment is "the day of being served with the claim" on the other side of the
   * same case.
   */
  countFrom: string;
  /**
   * Which event in the catalogue that is, so a date a user gave us can be
   * joined to it and the engine can be called.
   *
   * Decision 5. Before this, the deadline engine had no production caller: it
   * could count days correctly and nothing ever asked it to, because nothing
   * connected "the day the defendant was served with the claim" to an answer in
   * a form. See deadlines/deadlineEvents.ts, which also records which of these
   * events we decline to ask about and why.
   */
  countFromEvent: DeadlineEventKey;
  length: DeadlineLength;
  /**
   * Whether the period runs forward from an event or back from a hearing.
   *
   * Defaults to "after". Only r. 13.03 (2)'s disclosure deadline counts back,
   * and it reads completely differently — "at least 14 days before the
   * conference" rather than "within 14 days of" it. Recorded rather than
   * inferred from the prose, so the renderer and the deadline engine cannot
   * disagree about which way a clock runs.
   */
  direction?: "after" | "before";
  regime: CountingRegime;
  /** The provision that imposes the deadline. */
  rule: RuleCitation;
  /** The provision that says how the days are counted. */
  computation: RuleCitation;
  consequence: DeadlineConsequence;
  /**
   * Provisions that qualify the deadline, shown in the same breath as the
   * number. A block that gives a bar without its exceptions frightens people
   * out of claims they still have.
   */
  exceptions: RuleCitation[];
};

export type StageId = (typeof CASE_STAGES)[number]["id"];

export type CaseStage = {
  id: string;
  side: Side;
  /** A position where something has already gone wrong. Not an error state. */
  wentWrong: boolean;
  /**
   * The question a person in this position actually asks, in their words.
   * Part 3 organises blocks by this rather than by rule topic.
   */
  userQuestion: string;
  /** Internal label. Not user-facing. */
  title: string;
  /** What is true of the case right now. Plain language, no legal statements. */
  description: string;
  /** Things a person writes that point here. Inputs only; never shown. */
  cues: string[];
  /** What separates this from each neighbour it is confused with. */
  distinguishedFrom: Array<{ stage: string; by: string }>;
  rules: RuleCitation[];
  deadlines: StageDeadline[];
  /**
   * This stage renders ONLY where the scope classifier affirmatively said
   * "small-claims". Not "did not say out-of-scope" — said it.
   *
   * *** THE FAILURE THIS CLOSES, AND WHY A GLOBAL GATE COULD NOT ***
   *
   * "My neighbour smashed my car windows on purpose. I want him charged." came
   * back from `classifyCourtPath` as **civil at 0.8** — affirmatively in scope —
   * and then from the stage resolver as `before-filing:deciding-whether-to-sue`
   * at 0.90. Two independent components, both wrong, agreeing. Nothing was shown
   * only because that block is unpublished, which is luck and not a control.
   *
   * A global "must be affirmatively in scope" gate does not help: civil IS
   * affirmative. A global "must be small-claims" gate breaks the opposite and
   * worse case — the icy-sidewalk story classifies as **unknown**, and that is a
   * municipal notice claim with a TEN-DAY bar which must still reach its block.
   *
   * So the gate is per stage, and it goes on the stages whose content is generic
   * enough to look plausible for a matter that belongs somewhere else entirely.
   * A person genuinely deciding whether to sue over a debt gets "small-claims"
   * from the classifier; a person wanting somebody charged does not.
   *
   * This is deliberately NOT on the notice stages. They describe a specific
   * situation, they carry the deadlines that bar a claim, and a reader who
   * reaches one has said enough for the stage resolver to place them precisely.
   */
  requiresAffirmativeScope?: true;
  /**
   * A fact this stage's content depends on, which must come FROM THE USER.
   *
   * *** THE HIGH-STAKES AMBIGUITY RULE ***
   *
   * Where the answer turns on a fact the reader has not given us, and getting it
   * wrong costs them a claim, the product asks instead of inferring. The model
   * may not supply the deciding fact, however confident it sounds.
   *
   * The case that forced it: asked about "a city sidewalk", the chat returned the
   * City of Toronto block. Toronto has its own Act (s. 42) and its own clerk;
   * every other municipality is s. 44. That reader would have served notice on
   * the wrong office, with ten days to do it in and no action at all if they
   * missed it — and nothing in their story named a city.
   *
   * `generalAlternative` is what they get meanwhile: the block that is true
   * whichever answer comes back, plus the question. Not silence.
   */
  requiresConfirmedFact?: {
    /** Key in the facts record the caller passes to `renderStageAnswer`. */
    key: string;
    /** Asked verbatim. Never model-written. */
    question: string;
    /** The stage to show instead, until the fact is confirmed. */
    generalAlternative?: string;
  };
};

// =====================================================================
// Before anything is filed
// =====================================================================

const BEFORE_FILING: CaseStage[] = [
  {
    id: "before-filing:deciding-whether-to-sue",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "Can I sue over this, and is Small Claims the right court?",
    title: "Deciding whether and where to sue",
    description:
      "Nothing has been filed. The person is working out whether this court can hear their dispute and whether they are still in time.",
    cues: [
      "thinking about suing",
      "can I take them to small claims",
      "how much can I sue for",
      "is it too late to sue",
      "do I have to sue where they live",
    ],
    distinguishedFrom: [
      {
        stage: "plaintiff:claim-drafted-not-filed",
        by: "whether a Plaintiff's Claim has actually been written up and is ready to file",
      },
      {
        stage: "before-filing:claim-exceeds-small-claims-limit",
        by: "whether the amount claimed is over $50,000",
      },
      {
        stage: "before-filing:limitation-period-may-have-passed",
        by: "whether more than two years have passed since the claim was discovered",
      },
    ],
    rules: [C.S_MONETARY_LIMIT, C.R_6_01_PLACE, C.S_LIMITATIONS_4_BASIC],
    deadlines: [
      {
        id: "deadline:basic-limitation",
        what: "The general deadline to start a court case",
        countFrom: "the day the claim was discovered",
        countFromEvent: "claim-discovered",
        length: { unit: "years", count: 2 },
        regime: "legislation-act",
        rule: C.S_LIMITATIONS_4_BASIC,
        computation: C.S_LEGISLATION_89_6_MONTHS,
        consequence: "bars-the-claim",
        exceptions: [C.S_LIMITATIONS_5_DISCOVERY],
      },
    ],
    /*
     * THE CATCH-ALL, AND THEREFORE THE EXPOSURE. Its own question is "Can I sue
     * over this, and is Small Claims the right court?" — which is where a
     * criminal complaint, a tenancy dispute or a human-rights matter lands when
     * the classifier is wrong. A person genuinely deciding whether to sue over a
     * debt is classified "small-claims"; the one who wants somebody charged was
     * classified "civil".
     */
    requiresAffirmativeScope: true,
  },
  {
    id: "before-filing:notice-municipality",
    side: "plaintiff",
    wentWrong: false,
    userQuestion:
      "I was hurt because a road or sidewalk was in bad repair — do I have to tell the city first?",
    title: "Pre-suit notice to a municipality",
    description:
      "The injury is said to come from a municipality failing to keep a highway, bridge or sidewalk in repair, and no notice has been given to the clerk yet.",
    cues: [
      "tripped on a broken sidewalk",
      "pothole damaged my car",
      "the city never fixed it",
      "fell on a city road",
      "the township is responsible for the road",
    ],
    distinguishedFrom: [
      {
        stage: "before-filing:notice-toronto",
        by: "whether the municipality is the City of Toronto, which has its own Act",
      },
      {
        stage: "before-filing:notice-snow-ice-private",
        by: "whether the place is municipal or private property",
      },
      {
        stage: "before-filing:notice-deadline-missed",
        by: "whether more than 10 days have already passed since the injury",
      },
    ],
    rules: [
      C.S_MUNICIPAL_44_10_NOTICE,
      C.S_MUNICIPAL_44_9_SIDEWALK,
      C.S_LEGISLATION_88_HOLIDAYS,
      C.S_LEGISLATION_89_1_HOLIDAY,
      C.S_MUNICIPAL_44_11_DEATH,
      C.S_MUNICIPAL_44_12_EXCUSE,
    ],
    deadlines: [
      {
        id: "deadline:municipal-notice-10-days",
        what: "Give written notice of the claim to the clerk of the municipality",
        countFrom: "the occurrence of the injury",
        countFromEvent: "injury-occurred",
        length: { unit: "days", count: 10 },
        regime: "legislation-act",
        rule: C.S_MUNICIPAL_44_10_NOTICE,
        computation: C.S_LEGISLATION_89_3_BETWEEN,
        consequence: "bars-the-claim",
        exceptions: [C.S_MUNICIPAL_44_11_DEATH, C.S_MUNICIPAL_44_12_EXCUSE],
      },
    ],
  },
  {
    id: "before-filing:notice-toronto",
    side: "plaintiff",
    wentWrong: false,
    userQuestion:
      "I was hurt on a Toronto street or sidewalk — do I have to tell the City first?",
    title: "Pre-suit notice to the City of Toronto",
    description:
      "The same 10-day notice, for a claim against the City of Toronto, which is governed by its own Act rather than the Municipal Act.",
    cues: [
      "fell on a Toronto sidewalk",
      "City of Toronto road",
      "pothole in Toronto",
    ],
    distinguishedFrom: [
      {
        stage: "before-filing:notice-municipality",
        by: "whether the municipality is Toronto or any other Ontario municipality",
      },
    ],
    rules: [
      C.S_TORONTO_42_6_NOTICE,
      C.S_TORONTO_42_5_SIDEWALK,
      // s. 42 (7) was missing while s. 42 (8) was present. See citations.ts.
      C.S_TORONTO_42_7_DEATH,
      C.S_TORONTO_42_8_EXCUSE,
      C.S_LEGISLATION_88_HOLIDAYS,
      C.S_LEGISLATION_89_1_HOLIDAY,
    ],
    deadlines: [
      {
        id: "deadline:toronto-notice-10-days",
        what: "Give written notice of the claim to the city clerk",
        countFrom: "the occurrence of the injury",
        countFromEvent: "injury-occurred",
        length: { unit: "days", count: 10 },
        regime: "legislation-act",
        rule: C.S_TORONTO_42_6_NOTICE,
        computation: C.S_LEGISLATION_89_3_BETWEEN,
        consequence: "bars-the-claim",
        exceptions: [C.S_TORONTO_42_7_DEATH, C.S_TORONTO_42_8_EXCUSE],
      },
    ],
    /*
     * MUNICIPALITY-SPECIFIC, SO THE MUNICIPALITY MUST BE CONFIRMED.
     *
     * s. 42 (6) names the CITY CLERK of Toronto. Every other municipality is
     * Municipal Act s. 44 (10) and a different clerk. Asked about "a city
     * sidewalk", the chat returned this block — and a reader who served the wrong
     * clerk has done nothing, with ten days to do it in.
     *
     * Until the reader says which city, they get the general Municipal Act block,
     * which is true whichever answer comes back, and the question.
     */
    requiresConfirmedFact: {
      key: "municipality",
      question: "Which city or town was this in?",
      generalAlternative: "before-filing:notice-municipality",
    },
  },
  {
    id: "before-filing:notice-snow-ice-private",
    side: "plaintiff",
    wentWrong: false,
    userQuestion:
      "I slipped on ice outside a shop or building — is there something I have to send before I sue?",
    title: "Pre-suit notice for a snow or ice injury on private property",
    description:
      "A personal injury caused by snow or ice, where the place is occupied privately rather than by a municipality, and no notice has been sent.",
    cues: [
      "slipped on ice in the parking lot",
      "fell outside the store",
      "the landlord never salted",
      "icy walkway at my apartment",
      "snow removal company",
    ],
    distinguishedFrom: [
      {
        stage: "before-filing:notice-municipality",
        by: "whether the place is private premises or a municipal highway or sidewalk",
      },
      {
        stage: "before-filing:notice-deadline-missed",
        by: "whether more than 60 days have already passed since the injury",
      },
    ],
    rules: [C.S_OLA_6_1_NOTICE, C.S_OLA_6_1_2_WHO, C.S_OLA_6_1_5_DEATH, C.S_OLA_6_1_6_EXCUSE, C.S_LEGISLATION_88_HOLIDAYS, C.S_LEGISLATION_89_1_HOLIDAY],
    deadlines: [
      {
        id: "deadline:occupier-notice-60-days",
        // Plain wording, because this is rendered straight into the block a
        // user reads. The near-verbatim version read at grade 9.3 and pushed
        // whole blocks over the target on its own. HOW to serve it — by hand
        // or by registered mail, per s. 6.1 (1) — belongs in "what to do
        // next", not in the label on a deadline.
        what:
          "Give written notice of the claim to an occupier or to the snow-removal contractor. The notice must say the date, time and place of the injury",
        countFrom: "the occurrence of the injury",
        countFromEvent: "injury-occurred",
        length: { unit: "days", count: 60 },
        regime: "legislation-act",
        rule: C.S_OLA_6_1_NOTICE,
        computation: C.S_LEGISLATION_89_3_BETWEEN,
        consequence: "bars-the-claim",
        exceptions: [C.S_OLA_6_1_5_DEATH, C.S_OLA_6_1_6_EXCUSE],
      },
    ],
  },
  {
    id: "before-filing:notice-deadline-missed",
    side: "plaintiff",
    wentWrong: true,
    userQuestion:
      "Nobody told me I had to send a notice and the time has passed — is it over?",
    title: "A pre-suit notice deadline has already passed",
    description:
      "The injury is one of the kinds that needs notice first, and the notice period has run out without notice being given.",
    cues: [
      "I only just found out about the notice",
      "it has been months since I fell",
      "did not know I had to tell the city",
      "too late to give notice",
    ],
    distinguishedFrom: [
      {
        stage: "before-filing:notice-municipality",
        by: "whether the 10 days have run out",
      },
      {
        stage: "before-filing:notice-snow-ice-private",
        by: "whether the 60 days have run out",
      },
      {
        stage: "before-filing:limitation-period-may-have-passed",
        by: "which clock has expired — the notice period or the two-year limitation period",
      },
    ],
    rules: [
      C.S_MUNICIPAL_44_11_DEATH,
      C.S_MUNICIPAL_44_12_EXCUSE,
      C.S_TORONTO_42_8_EXCUSE,
      C.S_OLA_6_1_5_DEATH,
      C.S_OLA_6_1_6_EXCUSE,
    ],
    deadlines: [],
  },
  {
    id: "before-filing:limitation-period-may-have-passed",
    side: "plaintiff",
    wentWrong: true,
    userQuestion: "This happened a long time ago — am I out of time?",
    title: "The limitation period may have expired",
    description:
      "More than two years appear to have passed since the events, and when the claim was discovered has not been established.",
    cues: [
      "this happened three years ago",
      "am I too late",
      "I only found out recently",
      "statute of limitations",
    ],
    distinguishedFrom: [
      {
        stage: "before-filing:deciding-whether-to-sue",
        by: "whether two years have apparently passed since the events described",
      },
      {
        stage: "before-filing:notice-deadline-missed",
        by: "which clock has expired — the two-year limitation period or a pre-suit notice period",
      },
    ],
    rules: [C.S_LIMITATIONS_4_BASIC, C.S_LIMITATIONS_5_DISCOVERY],
    deadlines: [],
    /*
     * Same reasoning. "Is it too late?" is askable about any dispute in any
     * forum, and this block would answer it with the Small Claims limitation
     * period.
     */
    requiresAffirmativeScope: true,
  },
  {
    id: "before-filing:claim-exceeds-small-claims-limit",
    side: "plaintiff",
    wentWrong: true,
    userQuestion: "My claim is worth more than the limit — what happens now?",
    title: "The amount claimed is over the Small Claims limit",
    description:
      "The amount described is above what this court can award, so the dispute either goes elsewhere or the amount over the limit is given up.",
    cues: [
      "they owe me eighty thousand",
      "more than fifty thousand",
      "too much for small claims",
      "should I split it into two claims",
    ],
    distinguishedFrom: [
      {
        stage: "before-filing:deciding-whether-to-sue",
        by: "whether the amount described exceeds $50,000",
      },
      {
        stage: "both:filed-in-wrong-place",
        by: "whether anything has been filed yet",
      },
    ],
    rules: [C.S_MONETARY_LIMIT, C.R_6_02_NO_DIVISION],
    deadlines: [],
    /*
     * Same reasoning, and it reads as authoritative about which court to use —
     * which is precisely the question a misclassified matter needs answered
     * correctly rather than confidently.
     */
    requiresAffirmativeScope: true,
  },
];

// =====================================================================
// Plaintiff, case under way
// =====================================================================

const PLAINTIFF: CaseStage[] = [
  {
    id: "plaintiff:claim-drafted-not-filed",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "How do I actually file my claim, and what does it cost?",
    title: "Claim prepared but not filed",
    description: "The claim has been written up but not yet filed with the court.",
    cues: [
      "I have filled out the form 7a",
      "ready to file",
      "where do I file",
      "how much is the filing fee",
      "can I file online",
    ],
    distinguishedFrom: [
      {
        stage: "before-filing:deciding-whether-to-sue",
        by: "whether a claim has actually been prepared",
      },
      {
        stage: "plaintiff:claim-issued-not-served",
        by: "whether the court has issued the claim",
      },
    ],
    rules: [C.R_7_01_COMMENCEMENT, C.R_7_01_ELECTRONIC, C.R_6_01_PLACE],
    deadlines: [],
  },
  {
    id: "plaintiff:claim-issued-not-served",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "The court gave me back my claim — how do I get it to the defendant?",
    title: "Claim issued, not yet served",
    description:
      "The court has issued the claim. It has not yet been delivered to the defendant in the way the rules require.",
    cues: [
      "I filed my claim",
      "got my claim number",
      "how do I serve them",
      "do I have to hand it to them myself",
      "they will not answer the door",
    ],
    distinguishedFrom: [
      {
        stage: "plaintiff:claim-drafted-not-filed",
        by: "whether the court has issued the claim",
      },
      {
        stage: "plaintiff:served-awaiting-defence",
        by: "whether the defendant has actually been served",
      },
      {
        stage: "plaintiff:service-attempted-failed",
        by: "whether service has been attempted and failed",
      },
    ],
    rules: [C.R_8_01_MANNER, C.R_8_01_TIME_FOR_SERVICE],
    deadlines: [
      {
        id: "deadline:serve-claim-six-months",
        what: "Serve the claim on the defendant",
        countFrom: "the date the claim was issued",
        countFromEvent: "claim-issued",
        length: { unit: "months", count: 6 },
        regime: "small-claims-rules",
        rule: C.R_8_01_TIME_FOR_SERVICE,
        computation: C.R_3_01_COMPUTATION,
        consequence: "changes-what-happens-next",
        exceptions: [C.R_8_01_TIME_FOR_SERVICE, C.R_3_02_EXTEND],
      },
    ],
  },
  {
    id: "plaintiff:service-attempted-failed",
    side: "plaintiff",
    wentWrong: true,
    userQuestion: "I cannot find them or they will not take the papers — now what?",
    title: "Service attempted and failed",
    description:
      "The claim has been issued and delivery to the defendant has been tried without success.",
    cues: [
      "cannot find the defendant",
      "they moved and I do not have an address",
      "refused to accept the papers",
      "the process server could not serve them",
      "no answer at the address",
    ],
    distinguishedFrom: [
      {
        stage: "plaintiff:claim-issued-not-served",
        by: "whether service has been attempted at all",
      },
      {
        stage: "plaintiff:six-month-service-window-expired",
        by: "whether six months have passed since the claim was issued",
      },
    ],
    // r. 8.04 added: the block understated the test as "if personal service is
    // impractical". The rule requires personal service OR AN ALTERNATIVE to it
    // to be impractical, so a user who had tried only personal service would
    // bring a motion that fails.
    rules: [
      C.R_8_01_MANNER,
      C.R_8_01_TIME_FOR_SERVICE,
      C.R_8_04_SUBSTITUTED_SERVICE,
      C.R_3_02_EXTEND,
    ],
    deadlines: [
      {
        id: "deadline:serve-claim-six-months:failed-service",
        what: "Serve the claim on the defendant",
        countFrom: "the date the claim was issued",
        countFromEvent: "claim-issued",
        length: { unit: "months", count: 6 },
        regime: "small-claims-rules",
        rule: C.R_8_01_TIME_FOR_SERVICE,
        computation: C.R_3_01_COMPUTATION,
        consequence: "changes-what-happens-next",
        exceptions: [C.R_8_01_TIME_FOR_SERVICE, C.R_3_02_EXTEND],
      },
    ],
  },
  {
    id: "plaintiff:six-month-service-window-expired",
    side: "plaintiff",
    wentWrong: true,
    userQuestion: "It has been more than six months and I never served them — is my case dead?",
    title: "The six-month service window has run out",
    description:
      "The claim was issued more than six months ago and has still not been served.",
    cues: [
      "filed last year and never served",
      "six months went by",
      "my claim has been sitting there",
    ],
    distinguishedFrom: [
      {
        stage: "plaintiff:claim-issued-not-served",
        by: "whether six months have passed since the claim was issued",
      },
      {
        stage: "plaintiff:action-dismissed-for-delay",
        by: "whether the clerk has made an order dismissing the action",
      },
    ],
    rules: [C.R_8_01_TIME_FOR_SERVICE, C.R_3_02_EXTEND],
    deadlines: [],
  },
  {
    id: "plaintiff:served-awaiting-defence",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "They have been served — how long do I have to wait to hear back?",
    title: "Served, defence period running",
    description:
      "The defendant has been served and the time to deliver a defence has not yet run out.",
    cues: [
      "I served them last week",
      "waiting to hear back",
      "when do they have to respond",
      "the affidavit of service is filed",
    ],
    distinguishedFrom: [
      {
        stage: "plaintiff:claim-issued-not-served",
        by: "whether the defendant has been served",
      },
      {
        stage: "plaintiff:defence-period-expired-no-defence",
        by: "whether the 20 days have run out with no defence filed",
      },
      {
        stage: "plaintiff:defence-filed",
        by: "whether a defence has been filed",
      },
    ],
    rules: [C.R_9_01_DEFENCE, C.R_3_01_COMPUTATION],
    deadlines: [
      {
        id: "deadline:defence-20-days:plaintiff-view",
        what: "The defendant's time to serve and file a defence",
        countFrom: "the day the defendant was served with the claim",
        countFromEvent: "served-with-claim",
        length: { unit: "days", count: 20 },
        regime: "small-claims-rules",
        rule: C.R_9_01_DEFENCE,
        computation: C.R_3_01_COMPUTATION,
        consequence: "changes-what-happens-next",
        exceptions: [C.R_3_02_EXTEND],
      },
    ],
  },
  {
    id: "plaintiff:defence-period-expired-no-defence",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "The 20 days are up and they never responded — what can I do?",
    title: "Defence period expired, no defence filed",
    description:
      "More than 20 days have passed since service and no defence has been filed. Nothing has been asked of the clerk yet.",
    cues: [
      "they never filed a defence",
      "twenty days are up",
      "no response from the defendant",
      "how do I note them in default",
    ],
    distinguishedFrom: [
      {
        stage: "plaintiff:served-awaiting-defence",
        by: "whether the 20 days have run out",
      },
      {
        stage: "plaintiff:defendant-noted-in-default",
        by: "whether the clerk has actually noted the defendant in default",
      },
    ],
    // r. 11.02 and r. 11.03 are here because the content pipeline could not
    // write "what happens after" without them: a plaintiff asking "they never
    // responded, what can I do?" needs the whole arc — note in default, then
    // judgment — not just the first step. The rules a stage cites have to
    // cover the reader's QUESTION, not only the reader's position.
    rules: [
      C.R_11_01_NOTING_IN_DEFAULT,
      C.R_9_01_DEFENCE,
      C.R_11_02_DEFAULT_JUDGMENT,
      C.R_11_03_ASSESSMENT,
    ],
    deadlines: [],
  },
  {
    id: "plaintiff:defendant-noted-in-default",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "They have been noted in default — how do I get my judgment?",
    title: "Defendant noted in default",
    description:
      "The clerk has noted the defendant in default. No judgment has been signed yet.",
    cues: [
      "noted in default",
      "the clerk noted them",
      "form 9b filed",
      "how do I get default judgment",
    ],
    distinguishedFrom: [
      {
        stage: "plaintiff:defence-period-expired-no-defence",
        by: "whether the clerk has noted the defendant in default",
      },
      {
        stage: "plaintiff:default-judgment-signed",
        by: "whether judgment has actually been signed",
      },
      {
        stage: "plaintiff:assessment-of-damages-needed",
        by: "whether the claim is for a debt or liquidated demand, which the clerk can sign, or for damages, which must be assessed",
      },
    ],
    rules: [C.R_11_02_DEFAULT_JUDGMENT, C.R_11_03_ASSESSMENT],
    deadlines: [],
  },
  {
    id: "plaintiff:assessment-of-damages-needed",
    side: "plaintiff",
    wentWrong: false,
    userQuestion:
      "The clerk says my claim is not for a fixed amount — how do I prove what I am owed?",
    title: "Default judgment needs an assessment of damages",
    description:
      "The defendant is in default, and the claim is not for a debt or liquidated demand, so the amount has to be assessed rather than signed by the clerk.",
    cues: [
      "the clerk would not sign judgment",
      "assessment hearing",
      "my claim is for damages not a set amount",
      "motion for assessment of damages",
    ],
    distinguishedFrom: [
      {
        stage: "plaintiff:defendant-noted-in-default",
        by: "whether the clerk has refused to sign judgment because the amount is not liquidated",
      },
    ],
    rules: [C.R_11_03_ASSESSMENT, C.R_11_02_DEFAULT_JUDGMENT],
    deadlines: [],
  },
  {
    id: "plaintiff:default-judgment-signed",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "I have a default judgment — how do I actually get paid?",
    title: "Default judgment obtained",
    description:
      "Judgment has been signed against a defendant who did not defend. Nothing has been collected yet.",
    cues: [
      "I got default judgment",
      "form 11b",
      "they still have not paid",
      "how do I enforce the judgment",
    ],
    distinguishedFrom: [
      {
        stage: "plaintiff:defendant-noted-in-default",
        by: "whether judgment has been signed, not merely noted",
      },
      {
        stage: "plaintiff:judgment-in-my-favour-unpaid",
        by: "whether the judgment came from default or from a trial",
      },
    ],
    rules: [C.R_11_02_DEFAULT_JUDGMENT, C.R_11_06_SET_ASIDE],
    deadlines: [],
  },
  {
    id: "plaintiff:defence-filed",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "They filed a defence — what happens next?",
    title: "Defence filed, action defended",
    description:
      "The defendant has filed a defence, so the action is defended and a settlement conference will be held.",
    cues: [
      "they filed a defence",
      "the defendant disputes everything",
      "got a copy of their defence",
      "what happens after a defence",
    ],
    distinguishedFrom: [
      {
        stage: "plaintiff:defence-period-expired-no-defence",
        by: "whether a defence was in fact filed",
      },
      {
        stage: "plaintiff:awaiting-settlement-conference",
        by: "whether a date for the settlement conference has been received",
      },
      {
        stage: "plaintiff:served-with-defendants-claim",
        by: "whether the defendant also made a claim of their own",
      },
    ],
    rules: [C.R_13_01_SETTLEMENT_CONFERENCE, C.R_13_01_TIMING, C.R_13_01_CLERK_FIXES],
    deadlines: [
      {
        id: "deadline:settlement-conference-90-days",
        what: "The settlement conference is to be held",
        countFrom: "the day the first defence was filed",
        countFromEvent: "first-defence-filed",
        length: { unit: "days", count: 90 },
        regime: "small-claims-rules",
        rule: C.R_13_01_TIMING,
        computation: C.R_3_01_COMPUTATION,
        consequence: "changes-what-happens-next",
        exceptions: [],
      },
    ],
  },
  {
    id: "plaintiff:served-with-defendants-claim",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "They are suing me back — do I have to respond to that too?",
    title: "Served with a defendant's claim",
    description:
      "The defendant has made a claim of their own, and the plaintiff has been served with it.",
    cues: [
      "they countersued",
      "defendant's claim",
      "form 10a",
      "now they say I owe them",
    ],
    distinguishedFrom: [
      {
        stage: "plaintiff:defence-filed",
        by: "whether the defendant made a claim of their own as well as a defence",
      },
      {
        stage: "defendant:served-defence-period-running",
        by: "which claim the person is responding to — the original claim or a defendant's claim",
      },
    ],
    rules: [C.R_10_03_DEFENCE_TO_DEFENDANTS_CLAIM, C.R_10_01_DEFENDANTS_CLAIM],
    deadlines: [
      {
        id: "deadline:defence-to-defendants-claim-20-days",
        what: "Serve and file a defence to the defendant's claim",
        countFrom: "the day the defendant's claim was served",
        countFromEvent: "defendants-claim-served",
        length: { unit: "days", count: 20 },
        regime: "small-claims-rules",
        rule: C.R_10_03_DEFENCE_TO_DEFENDANTS_CLAIM,
        computation: C.R_3_01_COMPUTATION,
        consequence: "changes-what-happens-next",
        exceptions: [C.R_3_02_EXTEND],
      },
    ],
  },
  {
    id: "plaintiff:awaiting-settlement-conference",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "I have a settlement conference date — what do I have to send in, and when?",
    title: "Settlement conference scheduled",
    description:
      "A date has been set for the settlement conference and it has not happened yet.",
    cues: [
      "settlement conference next month",
      "got a notice of settlement conference",
      "what do I bring to the settlement conference",
      "do I have to send my documents",
    ],
    distinguishedFrom: [
      {
        stage: "plaintiff:defence-filed",
        by: "whether a date has been received",
      },
      {
        stage: "plaintiff:settlement-conference-held",
        by: "whether the conference has already taken place",
      },
    ],
    rules: [C.R_13_03_DISCLOSURE, C.R_13_02_FAILURE_TO_ATTEND],
    deadlines: [
      {
        id: "deadline:settlement-conference-disclosure-14-days",
        // Plain wording: this renders straight into the block. The near-verbatim
        // r. 13.03 (2) phrasing read at grade 9.3.
        what:
          "Give every other party and the court a copy of any document you will use at trial. This includes any expert report. You do not need to send what is already attached to your claim or defence",
        countFrom: "the date of the settlement conference, counting backwards",
        countFromEvent: "settlement-conference-date",
        length: { unit: "days", count: 14 },
        direction: "before",
        regime: "small-claims-rules",
        rule: C.R_13_03_DISCLOSURE,
        computation: C.R_3_01_COMPUTATION,
        consequence: "changes-what-happens-next",
        exceptions: [],
      },
    ],
  },
  {
    id: "plaintiff:settlement-conference-held",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "The settlement conference did not settle it — how do I get a trial date?",
    title: "Settlement conference held, no resolution",
    description:
      "The settlement conference has taken place and the action has not been disposed of. No trial date has been requested.",
    cues: [
      "the settlement conference did not work",
      "we could not agree",
      "how do I set it down for trial",
      "request to clerk to set a trial date",
    ],
    distinguishedFrom: [
      {
        stage: "plaintiff:awaiting-settlement-conference",
        by: "whether the conference has taken place",
      },
      {
        stage: "plaintiff:trial-date-set",
        by: "whether the clerk has fixed a trial date and served a notice of trial",
      },
    ],
    rules: [C.R_13_07_SET_DOWN, C.R_16_01_TRIAL_DATE],
    deadlines: [
      {
        id: "deadline:request-trial-date-30-days",
        what:
          "One of the parties must request a trial date and pay the fee if the action is not disposed of",
        countFrom: "the day of the settlement conference",
        countFromEvent: "settlement-conference-date",
        length: { unit: "days", count: 30 },
        regime: "small-claims-rules",
        rule: C.R_13_07_SET_DOWN,
        computation: C.R_3_01_COMPUTATION,
        consequence: "changes-what-happens-next",
        exceptions: [],
      },
    ],
  },
  {
    id: "plaintiff:trial-date-set",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "I have a trial date — what do I need to do to get ready?",
    title: "Trial scheduled",
    description: "The clerk has fixed a trial date and served a notice of trial.",
    cues: [
      "my trial is in June",
      "got the notice of trial",
      "what do I bring to trial",
      "how do I get my witness to come",
    ],
    distinguishedFrom: [
      {
        stage: "plaintiff:settlement-conference-held",
        by: "whether a trial date has been fixed",
      },
      {
        stage: "both:missed-trial",
        by: "whether the trial date has already passed",
      },
    ],
    rules: [C.R_16_01_TRIAL_DATE, C.R_17_01_FAILURE_TO_ATTEND_TRIAL],
    deadlines: [],
  },
  {
    id: "plaintiff:judgment-in-my-favour-unpaid",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "I won but they are not paying — how do I collect?",
    title: "Judgment obtained, unpaid",
    description:
      "Judgment has been given in the plaintiff's favour and the money has not been paid.",
    cues: [
      "I won my case",
      "the judge ordered them to pay",
      "they are ignoring the judgment",
      "garnish their wages",
      "how do I collect",
    ],
    distinguishedFrom: [
      {
        stage: "plaintiff:default-judgment-signed",
        by: "whether the judgment came from a trial or from default",
      },
      {
        stage: "plaintiff:trial-date-set",
        by: "whether the trial has happened and judgment been given",
      },
    ],
    rules: [],
    deadlines: [],
  },
  {
    id: "plaintiff:action-dismissed-for-delay",
    side: "plaintiff",
    wentWrong: true,
    userQuestion: "The court dismissed my case for delay — can I do anything about it?",
    title: "Action dismissed for delay by the clerk",
    description:
      "The clerk has made an order dismissing the action because two years passed without judgment being sought or a trial date requested.",
    cues: [
      "my case was dismissed for delay",
      "got an order dismissing my action",
      "second anniversary",
      "the clerk dismissed it",
    ],
    distinguishedFrom: [
      {
        stage: "plaintiff:six-month-service-window-expired",
        by: "whether an order dismissing the action has actually been made",
      },
      {
        stage: "plaintiff:settlement-conference-held",
        by: "whether two years passed without a trial date being requested",
      },
    ],
    rules: [C.R_11_1_01_DISMISSAL_FOR_DELAY],
    deadlines: [
      {
        id: "deadline:dismissal-for-delay-two-years",
        what: "Obtain judgment or request a trial date before the action is dismissed",
        countFrom: "the commencement of the action",
        countFromEvent: "action-commenced",
        length: { unit: "years", count: 2 },
        regime: "small-claims-rules",
        rule: C.R_11_1_01_DISMISSAL_FOR_DELAY,
        computation: C.R_3_01_COMPUTATION,
        consequence: "changes-what-happens-next",
        exceptions: [C.R_11_1_01_DISMISSAL_FOR_DELAY],
      },
    ],
  },
];

// =====================================================================
// Defendant
// =====================================================================

const DEFENDANT: CaseStage[] = [
  {
    id: "defendant:served-defence-period-running",
    side: "defendant",
    wentWrong: false,
    userQuestion: "I have been sued — what do I have to do, and by when?",
    title: "Served with a claim, time to defend still running",
    description:
      "The defendant has been served with a claim and the 20 days to deliver a defence have not run out.",
    cues: [
      "I got served with a claim",
      "someone is suing me",
      "form 7a was handed to me",
      "how long do I have to respond",
      "I have twenty days",
    ],
    distinguishedFrom: [
      {
        stage: "defendant:defence-period-expired-not-yet-noted",
        by: "whether the 20 days have run out",
      },
      {
        stage: "defendant:defence-filed",
        by: "whether a defence has been served and filed",
      },
      {
        stage: "plaintiff:served-with-defendants-claim",
        by: "which claim the person is responding to — the original claim or a defendant's claim",
      },
    ],
    // r. 11.01 and r. 13.01 answer "what happens after", which splits two ways
    // here: file in time and a settlement conference follows; do not, and the
    // clerk can note you in default. A block that covers only one of those
    // leaves out whichever half the reader is about to live through.
    rules: [
      C.R_9_01_DEFENCE,
      C.R_3_01_COMPUTATION,
      C.R_11_01_NOTING_IN_DEFAULT,
      C.R_13_01_SETTLEMENT_CONFERENCE,
    ],
    deadlines: [
      {
        id: "deadline:defence-20-days",
        what: "Serve a defence on every other party and file it with the clerk, with proof of service",
        countFrom: "the day of being served with the claim",
        countFromEvent: "served-with-claim",
        length: { unit: "days", count: 20 },
        regime: "small-claims-rules",
        rule: C.R_9_01_DEFENCE,
        computation: C.R_3_01_COMPUTATION,
        consequence: "changes-what-happens-next",
        exceptions: [C.R_3_02_EXTEND],
      },
    ],
  },
  {
    id: "defendant:defence-period-expired-not-yet-noted",
    side: "defendant",
    wentWrong: true,
    userQuestion: "I missed the 20 days — is it too late to defend myself?",
    title: "Defence period missed, not yet noted in default",
    description:
      "More than 20 days have passed since service without a defence being filed, and the defendant has not been noted in default.",
    cues: [
      "I missed the deadline",
      "it has been a month since I was served",
      "I forgot to file my defence",
      "is it too late to file a defence",
    ],
    distinguishedFrom: [
      {
        stage: "defendant:served-defence-period-running",
        by: "whether the 20 days have run out",
      },
      {
        stage: "defendant:noted-in-default",
        by: "whether the clerk has noted the defendant in default",
      },
    ],
    rules: [C.R_11_01_NOTING_IN_DEFAULT, C.R_9_01_DEFENCE, C.R_3_02_EXTEND],
    deadlines: [],
  },
  {
    id: "defendant:noted-in-default",
    side: "defendant",
    wentWrong: true,
    userQuestion: "I have been noted in default — can I still fight this?",
    title: "Noted in default",
    description:
      "The clerk has noted the defendant in default. No judgment has been signed yet.",
    cues: [
      "I was noted in default",
      "the court says I am in default",
      "got a notice that I did not defend",
    ],
    distinguishedFrom: [
      {
        stage: "defendant:defence-period-expired-not-yet-noted",
        by: "whether the clerk has noted the defendant in default",
      },
      {
        stage: "defendant:default-judgment-against-me",
        by: "whether judgment has been signed as well as noting",
      },
    ],
    rules: [C.R_11_06_SET_ASIDE, C.R_11_01_NOTING_IN_DEFAULT],
    deadlines: [],
  },
  {
    id: "defendant:default-judgment-against-me",
    side: "defendant",
    wentWrong: true,
    userQuestion:
      "There is a judgment against me and I never knew about the case — what can I do?",
    title: "Default judgment signed against the defendant",
    description:
      "Judgment has been signed against a defendant who did not file a defence. Enforcement may or may not have started.",
    cues: [
      "there is a judgment against me",
      "my wages are being garnished",
      "I never got the papers",
      "found out from my bank",
      "default judgment against me",
    ],
    distinguishedFrom: [
      {
        stage: "defendant:noted-in-default",
        by: "whether judgment has been signed, not merely noting",
      },
      {
        stage: "defendant:judgment-against-me",
        by: "whether the judgment came from default or from a trial the defendant took part in",
      },
    ],
    rules: [C.R_11_06_SET_ASIDE, C.R_11_02_DEFAULT_JUDGMENT],
    deadlines: [
      {
        id: "deadline:set-aside-as-soon-as-possible",
        what:
          "Bring a motion to set aside. The rule sets no fixed number of days: the motion must be made as soon as is reasonably possible in all the circumstances",
        countFrom: "learning of the noting in default or the default judgment",
        countFromEvent: "learned-of-default",
        length: { unit: "days", count: 0 },
        regime: "small-claims-rules",
        rule: C.R_11_06_SET_ASIDE,
        computation: C.R_3_01_COMPUTATION,
        consequence: "changes-what-happens-next",
        exceptions: [],
      },
    ],
  },
  {
    id: "defendant:defence-filed",
    side: "defendant",
    wentWrong: false,
    userQuestion: "I filed my defence — what happens next?",
    title: "Defence filed",
    description:
      "The defendant has served and filed a defence, so the action is defended and a settlement conference will be held.",
    cues: [
      "I filed my defence",
      "sent in form 9a",
      "what happens after I file a defence",
    ],
    distinguishedFrom: [
      {
        stage: "defendant:served-defence-period-running",
        by: "whether the defence has actually been served and filed",
      },
      {
        stage: "defendant:considering-defendants-claim",
        by: "whether the defendant also wants to make a claim of their own",
      },
      {
        stage: "defendant:awaiting-settlement-conference",
        by: "whether a date for the settlement conference has been received",
      },
    ],
    rules: [C.R_13_01_SETTLEMENT_CONFERENCE, C.R_13_01_TIMING, C.R_13_01_CLERK_FIXES],
    deadlines: [
      {
        id: "deadline:settlement-conference-90-days:defendant",
        what: "The settlement conference is to be held",
        countFrom: "the day the first defence was filed",
        countFromEvent: "first-defence-filed",
        length: { unit: "days", count: 90 },
        regime: "small-claims-rules",
        rule: C.R_13_01_TIMING,
        computation: C.R_3_01_COMPUTATION,
        consequence: "changes-what-happens-next",
        exceptions: [],
      },
    ],
  },
  {
    id: "defendant:considering-defendants-claim",
    side: "defendant",
    wentWrong: false,
    userQuestion: "They owe me money too — can I sue them back in the same case?",
    title: "Considering a defendant's claim",
    description:
      "The defendant wants to claim against the plaintiff or someone else in the same action.",
    cues: [
      "can I countersue",
      "they actually owe me",
      "I want to claim against them too",
      "add another person to the case",
    ],
    distinguishedFrom: [
      {
        stage: "defendant:defence-filed",
        by: "whether the defendant wants to make a claim as well as defend",
      },
      {
        stage: "plaintiff:served-with-defendants-claim",
        by: "who is making the defendant's claim and who is responding to it",
      },
    ],
    rules: [C.R_10_01_DEFENDANTS_CLAIM, C.R_10_04_TRIED_TOGETHER],
    deadlines: [
      {
        id: "deadline:issue-defendants-claim-20-days",
        what: "Issue the defendant's claim (Form 10A) without needing leave of the court",
        countFrom: "the day the defence is filed",
        countFromEvent: "first-defence-filed",
        length: { unit: "days", count: 20 },
        regime: "small-claims-rules",
        rule: C.R_10_01_DEFENDANTS_CLAIM,
        computation: C.R_3_01_COMPUTATION,
        consequence: "changes-what-happens-next",
        exceptions: [C.R_10_01_DEFENDANTS_CLAIM],
      },
    ],
  },
  {
    id: "defendant:awaiting-settlement-conference",
    side: "defendant",
    wentWrong: false,
    userQuestion:
      "I have a settlement conference date — what do I have to send in, and when?",
    title: "Settlement conference scheduled",
    description:
      "A date has been set for the settlement conference and it has not happened yet.",
    cues: [
      "settlement conference date",
      "got a notice of settlement conference",
      "what do I need to file before the conference",
    ],
    distinguishedFrom: [
      {
        stage: "defendant:defence-filed",
        by: "whether a date has been received",
      },
      {
        stage: "plaintiff:awaiting-settlement-conference",
        by: "which side the person is on",
      },
      {
        stage: "both:missed-settlement-conference",
        by: "whether the conference date has already passed",
      },
    ],
    rules: [C.R_13_03_DISCLOSURE, C.R_13_02_FAILURE_TO_ATTEND, C.R_13_02_DEFENDANT_TWICE_ABSENT],
    deadlines: [
      {
        id: "deadline:settlement-conference-disclosure-14-days:defendant",
        // Plain wording: this renders straight into the block. The near-verbatim
        // r. 13.03 (2) phrasing read at grade 9.3.
        what:
          "Give every other party and the court a copy of any document you will use at trial. This includes any expert report. You do not need to send what is already attached to your claim or defence",
        countFrom: "the date of the settlement conference, counting backwards",
        countFromEvent: "settlement-conference-date",
        length: { unit: "days", count: 14 },
        direction: "before",
        regime: "small-claims-rules",
        rule: C.R_13_03_DISCLOSURE,
        computation: C.R_3_01_COMPUTATION,
        consequence: "changes-what-happens-next",
        exceptions: [],
      },
    ],
  },
  {
    id: "defendant:trial-date-set",
    side: "defendant",
    wentWrong: false,
    userQuestion: "There is a trial date — how do I get ready to defend myself?",
    title: "Trial scheduled",
    description: "The clerk has fixed a trial date and served a notice of trial.",
    cues: [
      "trial date",
      "notice of trial",
      "what do I bring to defend myself",
    ],
    distinguishedFrom: [
      {
        stage: "defendant:awaiting-settlement-conference",
        by: "whether the settlement conference has happened and a trial date been fixed",
      },
      {
        stage: "plaintiff:trial-date-set",
        by: "which side the person is on",
      },
      {
        stage: "both:missed-trial",
        by: "whether the trial date has already passed",
      },
    ],
    rules: [C.R_16_01_TRIAL_DATE, C.R_17_01_FAILURE_TO_ATTEND_TRIAL],
    deadlines: [],
  },
  {
    id: "defendant:judgment-against-me",
    side: "defendant",
    wentWrong: false,
    userQuestion: "I lost — what happens now, and what if I cannot pay?",
    title: "Judgment given against the defendant after a hearing",
    description:
      "Judgment has been given against the defendant in a case they took part in.",
    cues: [
      "I lost my case",
      "the judge ruled against me",
      "I cannot afford to pay the judgment",
      "can I pay it in instalments",
    ],
    distinguishedFrom: [
      {
        stage: "defendant:default-judgment-against-me",
        by: "whether the defendant took part in the case or the judgment came from default",
      },
      {
        stage: "defendant:trial-date-set",
        by: "whether the trial has happened",
      },
    ],
    // r. 11.06 was missing here entirely — this stage's rules list was empty, so
    // the drafter could not say that a default judgment can be set aside. The
    // block that most needs a route out had no rule describing one.
    rules: [C.R_11_06_SET_ASIDE],
    deadlines: [],
  },
];

// =====================================================================
// Either side — things that went wrong
// =====================================================================

const BOTH: CaseStage[] = [
  {
    id: "both:missed-settlement-conference",
    side: "both",
    wentWrong: true,
    userQuestion: "I missed my settlement conference — what happens to me now?",
    title: "Missed a settlement conference",
    description:
      "A party who received a notice of settlement conference did not attend it.",
    cues: [
      "I missed the settlement conference",
      "I did not go to the conference",
      "I got the date wrong",
      "I was sick on the day of the conference",
    ],
    distinguishedFrom: [
      {
        stage: "plaintiff:awaiting-settlement-conference",
        by: "whether the conference date has passed and was missed",
      },
      {
        stage: "defendant:awaiting-settlement-conference",
        by: "whether the conference date has passed and was missed",
      },
      {
        stage: "both:missed-trial",
        by: "whether what was missed was a settlement conference or a trial",
      },
    ],
    rules: [C.R_13_02_FAILURE_TO_ATTEND, C.R_13_02_DEFENDANT_TWICE_ABSENT],
    deadlines: [],
  },
  {
    id: "both:missed-trial",
    side: "both",
    wentWrong: true,
    userQuestion: "I missed my trial date — is my case over?",
    title: "Missed a trial",
    description: "An action was called for trial and a party did not attend.",
    cues: [
      "I missed my trial",
      "I did not show up to court",
      "they had the trial without me",
      "my case was decided while I was not there",
    ],
    distinguishedFrom: [
      {
        stage: "both:missed-settlement-conference",
        by: "whether what was missed was a trial or a settlement conference",
      },
      {
        stage: "defendant:default-judgment-against-me",
        by: "whether judgment followed a trial the party missed or a defence never filed",
      },
    ],
    /*
     * r. 17.01 (4) and (5) were missing from this list, so the drafter could
     * not support "you may ask the court to set the judgment aside" and the
     * block ended up saying the rules set out no step — while a 30-day clock
     * was running. Found by independent review. See citations.ts.
     */
    rules: [
      C.R_17_01_FAILURE_TO_ATTEND_TRIAL,
      C.R_17_01_SET_ASIDE,
      C.R_17_01_SET_ASIDE_30_DAYS,
    ],
    deadlines: [
      {
        id: "deadline:set-aside-after-missed-trial",
        what:
          "Ask the court to set aside a judgment made when you did not attend, by making a motion",
        countFrom: "the day you became aware of the judgment",
        countFromEvent: "trial-judgment-awareness",
        length: { unit: "days", count: 30 },
        regime: "small-claims-rules",
        rule: C.R_17_01_SET_ASIDE_30_DAYS,
        computation: C.R_3_01_COMPUTATION,
        consequence: "changes-what-happens-next",
        /*
         * r. 17.01 (5) (b) lets the court extend the 30 days for special
         * circumstances. Giving the number without it would tell somebody on
         * day 31 that it was over.
         */
        exceptions: [C.R_17_01_SET_ASIDE_30_DAYS],
      },
    ],
  },
  {
    id: "both:filed-in-wrong-place",
    side: "both",
    wentWrong: true,
    userQuestion: "I think the case is in the wrong court or the wrong city — does that matter?",
    title: "Filed in the wrong court or the wrong territorial division",
    description:
      "The action appears to have been started somewhere other than where the rules require, or in a court that cannot hear it.",
    cues: [
      "I filed in the wrong city",
      "the case is in a court far from me",
      "this should be superior court",
      "wrong courthouse",
    ],
    distinguishedFrom: [
      {
        stage: "before-filing:claim-exceeds-small-claims-limit",
        by: "whether anything has been filed yet",
      },
      {
        stage: "plaintiff:claim-drafted-not-filed",
        by: "whether the claim has been filed somewhere already",
      },
    ],
    /*
     * r. 6.01 (2) and (3) are the remedy, and citing only subrule (1) is why
     * this stage was recorded as having no source for what to do. The claim
     * that "nothing anywhere says how to fix having commenced it in the wrong
     * place" was wrong, and it was wrong about the very rule already cited.
     */
    rules: [
      C.R_6_01_PLACE,
      C.R_6_01_TRIED_ELSEWHERE,
      C.R_6_01_JUDGE_MAY_MOVE,
      C.R_6_02_NO_DIVISION,
      C.S_MONETARY_LIMIT,
    ],
    deadlines: [],
  },
];

// =====================================================================
// The two positions that are not positions
// =====================================================================

/**
 * *** WHY UNKNOWN IS A REAL STAGE AND NOT A NULL ***
 *
 * Part 0 found `inferStage` and `getStageForPersistence` both defaulting to
 * `starting-case` when nothing matched. A default is a confident answer given
 * without evidence, and it was the mechanism by which a defendant with a
 * judgment already against them was told how to start a claim.
 *
 * UNKNOWN is what the classifier returns when the facts that separate two
 * stages are absent. It has its own content: a plain statement that we cannot
 * tell where the case is, the specific question that would settle it, and the
 * referrals. That is a designed outcome, not a failure — it is the honest
 * answer, and it is always better than a wrong stage delivered fluently.
 */
const SPECIAL: CaseStage[] = [
  {
    id: "unknown",
    side: "both",
    wentWrong: false,
    userQuestion: "I am not sure where my case is up to.",
    title: "Stage not established",
    description:
      "There is not enough information to place the case, or the information points to more than one position.",
    cues: [],
    distinguishedFrom: [],
    rules: [],
    deadlines: [],
  },
  {
    id: "out-of-scope",
    side: "both",
    wentWrong: false,
    userQuestion: "Is this something this court deals with at all?",
    title: "Outside Ontario Small Claims Court",
    description:
      "The matter is not an Ontario Small Claims Court matter — for example a family, criminal, immigration or tribunal matter, or a dispute outside Ontario.",
    cues: [],
    distinguishedFrom: [],
    rules: [],
    deadlines: [],
  },
];

export const CASE_STAGES = [
  ...BEFORE_FILING,
  ...PLAINTIFF,
  ...DEFENDANT,
  ...BOTH,
  ...SPECIAL,
] as const;

/** The stages that are positions in a case, as opposed to "we do not know". */
export const SPECIAL_STAGE_IDS = ["unknown", "out-of-scope"] as const;

export function isSpecialStage(id: string): boolean {
  return (SPECIAL_STAGE_IDS as readonly string[]).includes(id);
}

export function findStage(id: string): CaseStage | undefined {
  return CASE_STAGES.find((stage) => stage.id === id);
}

export function stagesForSide(side: Side): CaseStage[] {
  return CASE_STAGES.filter((stage) => stage.side === side || stage.side === "both");
}

/** Every position where something has already gone wrong. */
export function wentWrongStages(): CaseStage[] {
  return CASE_STAGES.filter((stage) => stage.wentWrong);
}

/**
 * Deadlines that end the claim rather than change the next step.
 *
 * Exposed as its own function because these need different treatment
 * everywhere: different prominence in content, different urgency in the
 * deadline engine, and a different failure mode if we get them wrong.
 */
export function claimBarringDeadlines(): Array<{ stage: CaseStage; deadline: StageDeadline }> {
  const found: Array<{ stage: CaseStage; deadline: StageDeadline }> = [];
  for (const stage of CASE_STAGES) {
    for (const deadline of stage.deadlines) {
      if (deadline.consequence === "bars-the-claim") found.push({ stage, deadline });
    }
  }
  return found;
}
