/**
 * What comes next: for every step in the stage map, the steps it can lead to,
 * what moves the case there, and the rule that governs that move (site owner,
 * 2026-10-12: "every step and every procedure is governed by the last").
 *
 * WHY. The stage map knows each position and its deadlines, but until this
 * file no step said which step follows it. A case moved only when the person
 * confirmed a new step themselves, or (for Small Claims) when filing, service
 * and the defence were recorded. This is the chain those moves follow.
 *
 * EVERY MOVE CARRIES ITS RULE. `rules` are citations from citations.ts (the
 * only place a quote lives; test:stage-map checks each one word for word).
 * `when` says, in plain words, only what those rules say moves the case.
 *
 * NOTHING HERE JUDGES A CASE (CLAUDE.md s. 3). A move says what the rules
 * provide happens next, never what will or should happen in this case. Where
 * the outcome is the court's (a judgment, an order), `by` is "court" and the
 * move says what the rule allows, not what the court will decide.
 *
 * A STEP WITH NO WAY OUT IS DECLARED. Every step either leads somewhere or is
 * listed in FINAL_STEPS with the reason the chain stops there, so a step
 * cannot silently lead nowhere (test:stage-sequence).
 *
 * Small Claims first (2026-10-12). Superior Court civil and family follow.
 */

import { ALL_STAGES, type CaseStage } from "./stageMap";
import { S_CLPA_17_11_WAIVER, S_CLPA_17_2_LEAVE, S_CLPA_17_9_GRANTED } from "./civilStages";
import {
  R_10_01_DEFENDANTS_CLAIM,
  R_10_03_DEFENCE_TO_DEFENDANTS_CLAIM,
  R_11_01_NOTING_IN_DEFAULT,
  R_11_02_DEFAULT_JUDGMENT,
  R_11_03_ASSESSMENT,
  R_11_06_SET_ASIDE,
  R_11_1_01_DISMISSAL_FOR_DELAY,
  R_11_2_01_RESTORE_ON_CONSENT,
  R_13_01_CLERK_FIXES,
  R_13_02_FAILURE_TO_ATTEND,
  R_13_07_SET_DOWN,
  R_16_01_TRIAL_DATE,
  R_17_01_FAILURE_TO_ATTEND_TRIAL,
  R_17_01_SET_ASIDE,
  R_17_04_NEW_TRIAL,
  R_20_03_ENFORCEMENT,
  R_3_02_EXTEND,
  R_6_01_PLACE,
  R_6_02_NO_DIVISION,
  R_7_01_COMMENCEMENT,
  R_8_01_TIME_FOR_SERVICE,
  R_8_04_SUBSTITUTED_SERVICE,
  R_9_01_DEFENCE,
  S_INSURANCE_258_3_1_NOTICE,
  S_INSURANCE_258_3_9_COSTS,
  S_LIMITATIONS_4_BASIC,
  S_LIMITATIONS_5_DISCOVERY,
  S_MONETARY_LIMIT,
  S_MUNICIPAL_44_10_NOTICE,
  S_MUNICIPAL_44_12_EXCUSE,
  S_OLA_6_1_6_EXCUSE,
  S_OLA_6_1_NOTICE,
  S_TORONTO_42_6_NOTICE,
  S_TORONTO_42_8_EXCUSE,
  S_CJA_23_1_1_LEAVE,
  S_CLPA_18_1_NOTICE,
  R_15_01_MOTION_FORM,
  R_15_01_SERVE_FILE,
  R_15_02_HEARING,
  R_9_03_ADMIT_PROPOSE,
  R_9_03_NO_DISPUTE,
  R_9_03_DISPUTE,
  R_16_1_01_TMC,
  R_16_1_02_TMC_PURPOSES,
  R_14_02_ANY_TIME,
  R_14_06_BREACH,
  R_14_07_PLAINTIFF_OFFER,
  R_20_08_GARNISHMENT,
  R_20_10_EXAMINATION,
  R_20_10_ORDER_AS_TO_PAYMENT,
  R_20_02_STAY_VARY,
  type RuleCitation,
} from "./citations";

/** Who or what moves the case: the person at the step, the other side, either party, the court or clerk, or time running out. */
export type Mover = "you" | "other-side" | "either" | "court" | "time";

export type StageMove = {
  from: string;
  to: string;
  /** Plain words: what moves the case. Says only what `rules` say. */
  when: string;
  by: Mover;
  rules: RuleCitation[];
};

export type FinalStep = { stage: string; why: string; rules: RuleCitation[] };

const move = (from: string, to: string, by: Mover, when: string, ...rules: RuleCitation[]): StageMove => ({ from, to, when, by, rules });

// ---------------------------------------------------------------- Small Claims

const SMALL_CLAIMS_MOVES: StageMove[] = [
  // Before filing
  move("before-filing:deciding-whether-to-sue", "plaintiff:claim-drafted-not-filed", "you", "You decide to start a claim: it is started by filing a plaintiff's claim (Form 7A) with the clerk.", R_7_01_COMMENCEMENT),
  move("before-filing:deciding-whether-to-sue", "before-filing:notice-municipality", "you", "The claim is for an injury from a road or bridge a municipality keeps in repair: written notice to the clerk comes first, within 10 days.", S_MUNICIPAL_44_10_NOTICE),
  move("before-filing:deciding-whether-to-sue", "before-filing:notice-toronto", "you", "The claim is for an injury from a City of Toronto road or bridge: written notice to the city clerk comes first, within 10 days.", S_TORONTO_42_6_NOTICE),
  move("before-filing:deciding-whether-to-sue", "before-filing:notice-snow-ice-private", "you", "The claim is for an injury from snow or ice on someone's property: written notice comes first, within 60 days.", S_OLA_6_1_NOTICE),
  move("before-filing:deciding-whether-to-sue", "before-filing:notice-vehicle-injury", "you", "The claim is for an injury from a vehicle: written notice of your intention to sue comes first.", S_INSURANCE_258_3_1_NOTICE),
  move("before-filing:deciding-whether-to-sue", "before-filing:limitation-period-may-have-passed", "time", "More than two years may have passed since the claim was discovered.", S_LIMITATIONS_4_BASIC),
  move("before-filing:deciding-whether-to-sue", "before-filing:claim-exceeds-small-claims-limit", "you", "The amount is more than the $50,000 Small Claims limit.", S_MONETARY_LIMIT),

  move("before-filing:notice-municipality", "plaintiff:claim-drafted-not-filed", "you", "Written notice was given to the clerk within the 10 days; the claim can then be started.", S_MUNICIPAL_44_10_NOTICE, R_7_01_COMMENCEMENT),
  move("before-filing:notice-municipality", "before-filing:notice-deadline-missed", "time", "The 10 days passed without written notice.", S_MUNICIPAL_44_10_NOTICE),
  move("before-filing:notice-toronto", "plaintiff:claim-drafted-not-filed", "you", "Written notice was given to the city clerk within the 10 days; the claim can then be started.", S_TORONTO_42_6_NOTICE, R_7_01_COMMENCEMENT),
  move("before-filing:notice-toronto", "before-filing:notice-deadline-missed", "time", "The 10 days passed without written notice.", S_TORONTO_42_6_NOTICE),
  move("before-filing:notice-snow-ice-private", "plaintiff:claim-drafted-not-filed", "you", "Written notice was given within the 60 days; the claim can then be started.", S_OLA_6_1_NOTICE, R_7_01_COMMENCEMENT),
  move("before-filing:notice-snow-ice-private", "before-filing:notice-deadline-missed", "time", "The 60 days passed without written notice.", S_OLA_6_1_NOTICE),
  move("before-filing:notice-vehicle-injury", "plaintiff:claim-drafted-not-filed", "you", "The claim can be started; if the notice steps were not followed, the court considers that when it awards costs.", S_INSURANCE_258_3_9_COSTS, R_7_01_COMMENCEMENT),
  move("before-filing:notice-deadline-missed", "plaintiff:claim-drafted-not-filed", "you", "The claim can still be started: missing the notice does not end it if a judge finds a reasonable excuse and the other side was not prejudiced.", S_MUNICIPAL_44_12_EXCUSE, S_TORONTO_42_8_EXCUSE, S_OLA_6_1_6_EXCUSE),
  move("before-filing:limitation-period-may-have-passed", "plaintiff:claim-drafted-not-filed", "you", "The two years run from the day the claim was discovered, which the Act defines; a claim started within them can go ahead.", S_LIMITATIONS_4_BASIC, S_LIMITATIONS_5_DISCOVERY),
  move("before-filing:claim-exceeds-small-claims-limit", "plaintiff:claim-drafted-not-filed", "you", "The claim is brought for no more than $50,000, as one claim: a claim cannot be split into several to fit the limit.", S_MONETARY_LIMIT, R_6_02_NO_DIVISION),
  move("before-filing:claim-exceeds-small-claims-limit", "civil:before-filing:deciding-whether-to-sue", "you", "The claim is brought in the Superior Court of Justice instead.", S_MONETARY_LIMIT, S_CJA_23_1_1_LEAVE),

  // Plaintiff: starting and serving
  move("plaintiff:claim-drafted-not-filed", "plaintiff:claim-issued-not-served", "you", "You file the plaintiff's claim (Form 7A) with the clerk.", R_7_01_COMMENCEMENT),
  move("plaintiff:claim-issued-not-served", "plaintiff:served-awaiting-defence", "you", "You serve the claim, within six months after it was issued.", R_8_01_TIME_FOR_SERVICE),
  move("plaintiff:claim-issued-not-served", "plaintiff:service-attempted-failed", "you", "Attempts to serve it do not work.", R_8_04_SUBSTITUTED_SERVICE),
  move("plaintiff:claim-issued-not-served", "plaintiff:six-month-service-window-expired", "time", "Six months pass after it was issued without service.", R_8_01_TIME_FOR_SERVICE),
  move("plaintiff:service-attempted-failed", "plaintiff:served-awaiting-defence", "you", "The claim is served, including by substituted service if the court allows it.", R_8_04_SUBSTITUTED_SERVICE),
  move("plaintiff:service-attempted-failed", "plaintiff:six-month-service-window-expired", "time", "Six months pass after it was issued without service.", R_8_01_TIME_FOR_SERVICE),
  move("plaintiff:six-month-service-window-expired", "plaintiff:served-awaiting-defence", "court", "The court can extend the time for service, even after the six months; the claim is then served.", R_8_01_TIME_FOR_SERVICE),

  // Plaintiff: after service
  move("plaintiff:served-awaiting-defence", "plaintiff:defence-filed", "other-side", "The defendant serves and files a defence (Form 9A) within 20 days of being served.", R_9_01_DEFENCE),
  move("plaintiff:served-awaiting-defence", "plaintiff:defence-period-expired-no-defence", "time", "The 20 days pass with no defence filed.", R_9_01_DEFENCE),
  move("plaintiff:defence-period-expired-no-defence", "plaintiff:defendant-noted-in-default", "you", "You file a request to note the defendant in default (Form 9B) with proof the claim was served.", R_11_01_NOTING_IN_DEFAULT),
  move("plaintiff:defendant-noted-in-default", "plaintiff:default-judgment-signed", "court", "For a debt or a fixed sum of money, the clerk may sign default judgment (Form 11B).", R_11_02_DEFAULT_JUDGMENT),
  move("plaintiff:defendant-noted-in-default", "plaintiff:assessment-of-damages-needed", "you", "For any other amount, judgment comes through an assessment: a motion in writing (Form 15A) or a request for an assessment hearing (Form 9B).", R_11_03_ASSESSMENT),
  move("plaintiff:assessment-of-damages-needed", "plaintiff:judgment-in-my-favour-unpaid", "court", "Judgment is given on the assessment and is not paid; an order for money can be enforced.", R_11_03_ASSESSMENT, R_20_03_ENFORCEMENT),
  move("plaintiff:default-judgment-signed", "plaintiff:judgment-in-my-favour-unpaid", "other-side", "The judgment is not paid; an order for money can be enforced.", R_20_03_ENFORCEMENT),
  move("plaintiff:default-judgment-signed", "plaintiff:defence-filed", "court", "The defendant makes a motion and the court sets the default judgment aside; the case goes on.", R_11_06_SET_ASIDE),
  move("plaintiff:defence-filed", "plaintiff:awaiting-settlement-conference", "court", "The clerk sets the settlement conference and serves notice of it.", R_13_01_CLERK_FIXES),
  move("plaintiff:defence-filed", "plaintiff:served-with-defendants-claim", "other-side", "The defendant makes their own claim (a defendant's claim, Form 10A).", R_10_01_DEFENDANTS_CLAIM),
  move("plaintiff:served-with-defendants-claim", "plaintiff:awaiting-settlement-conference", "court", "If you dispute it, you serve and file a defence (Form 9A) within 20 days; the clerk sets the settlement conference.", R_10_03_DEFENCE_TO_DEFENDANTS_CLAIM, R_13_01_CLERK_FIXES),
  move("plaintiff:awaiting-settlement-conference", "plaintiff:settlement-conference-held", "court", "The settlement conference is held and the case is not resolved.", R_13_07_SET_DOWN),
  move("plaintiff:awaiting-settlement-conference", "both:missed-settlement-conference", "either", "A party who got notice does not attend.", R_13_02_FAILURE_TO_ATTEND),
  move("plaintiff:settlement-conference-held", "plaintiff:trial-date-set", "you", "A party files a request to the clerk (Form 9B) to fix a trial date and pays the fee; the clerk fixes the date.", R_16_01_TRIAL_DATE),
  move("plaintiff:trial-date-set", "plaintiff:judgment-in-my-favour-unpaid", "court", "If judgment is given for you after the trial and is not paid, an order for money can be enforced.", R_20_03_ENFORCEMENT),
  move("plaintiff:trial-date-set", "both:missed-trial", "either", "A party does not attend the trial.", R_17_01_FAILURE_TO_ATTEND_TRIAL),

  // Defendant
  move("defendant:served-defence-period-running", "defendant:defence-filed", "you", "You serve a defence (Form 9A) on every other party and file it with proof of service, within 20 days of being served.", R_9_01_DEFENCE),
  move("defendant:served-defence-period-running", "defendant:defence-period-expired-not-yet-noted", "time", "The 20 days pass without a defence filed.", R_9_01_DEFENCE),
  move("defendant:defence-period-expired-not-yet-noted", "defendant:noted-in-default", "other-side", "The plaintiff files a request to note you in default (Form 9B).", R_11_01_NOTING_IN_DEFAULT),
  move("defendant:defence-period-expired-not-yet-noted", "defendant:defence-filed", "court", "The court can lengthen the time; the defence is then filed.", R_3_02_EXTEND),
  move("defendant:noted-in-default", "defendant:default-judgment-against-me", "court", "For a debt or a fixed sum of money, the clerk may sign default judgment (Form 11B).", R_11_02_DEFAULT_JUDGMENT),
  move("defendant:noted-in-default", "defendant:defence-filed", "court", "On your motion, made as soon as reasonably possible, the court may set aside the noting in default.", R_11_06_SET_ASIDE),
  move("defendant:default-judgment-against-me", "defendant:defence-filed", "court", "On your motion, made as soon as reasonably possible, the court may set aside the default judgment.", R_11_06_SET_ASIDE),
  move("defendant:defence-filed", "defendant:considering-defendants-claim", "you", "You want to make your own claim: a defendant's claim (Form 10A) can be issued within 20 days after your defence is filed, or later with leave.", R_10_01_DEFENDANTS_CLAIM),
  move("defendant:defence-filed", "defendant:awaiting-settlement-conference", "court", "The clerk sets the settlement conference and serves notice of it.", R_13_01_CLERK_FIXES),
  move("defendant:considering-defendants-claim", "defendant:awaiting-settlement-conference", "court", "The clerk sets the settlement conference and serves notice of it.", R_13_01_CLERK_FIXES),
  move("defendant:awaiting-settlement-conference", "defendant:trial-date-set", "court", "After the settlement conference, a party files a request to the clerk (Form 9B) to fix a trial date; the clerk fixes the date.", R_13_07_SET_DOWN, R_16_01_TRIAL_DATE),
  move("defendant:awaiting-settlement-conference", "both:missed-settlement-conference", "either", "A party who got notice does not attend.", R_13_02_FAILURE_TO_ATTEND),
  move("defendant:trial-date-set", "defendant:judgment-against-me", "court", "If judgment is given against you after the trial, a motion for a new trial can be made within 30 days.", R_17_04_NEW_TRIAL),
  move("defendant:trial-date-set", "both:missed-trial", "either", "A party does not attend the trial.", R_17_01_FAILURE_TO_ATTEND_TRIAL),

  // Either side
  move("both:missed-settlement-conference", "plaintiff:awaiting-settlement-conference", "court", "The court may order an additional settlement conference.", R_13_02_FAILURE_TO_ATTEND),
  move("both:missed-settlement-conference", "defendant:awaiting-settlement-conference", "court", "The court may order an additional settlement conference.", R_13_02_FAILURE_TO_ATTEND),
  move("both:missed-trial", "plaintiff:trial-date-set", "court", "The court may set aside or change a judgment against a party who did not attend.", R_17_01_SET_ASIDE),
  move("both:missed-trial", "defendant:trial-date-set", "court", "The court may set aside or change a judgment against a party who did not attend.", R_17_01_SET_ASIDE),
  move("both:filed-in-wrong-place", "plaintiff:claim-drafted-not-filed", "you", "An action is started in the territorial division where the claim arose or where a defendant lives or does business.", R_6_01_PLACE),
];

/** Moves for the Small Claims steps added from the law map (2026-10-13). */
const LAW_MAP_MOVES: StageMove[] = [
  // Admitting the claim and proposing terms of payment (r. 9.03)
  move("defendant:served-defence-period-running", "defendant:admitted-and-proposed-terms", "you", "You admit all or part of the claim and, in your defence, propose terms of payment.", R_9_03_ADMIT_PROPOSE),
  move("plaintiff:served-awaiting-defence", "plaintiff:defendant-proposed-terms", "other-side", "The defendant's defence admits all or part of the claim and proposes terms of payment.", R_9_03_ADMIT_PROPOSE),
  move("plaintiff:defendant-proposed-terms", "plaintiff:judgment-in-my-favour-unpaid", "other-side", "If you do not dispute the proposal within 20 days and the defendant misses payments, you may serve a notice of default of payment (Form 20L) and ask the clerk for judgment for the unpaid balance.", R_9_03_NO_DISPUTE),
  move("defendant:admitted-and-proposed-terms", "defendant:judgment-being-enforced", "other-side", "If the plaintiff does not dispute the proposal, you pay as if it were a court order; if a payment is missed, the plaintiff may serve a notice of default of payment and get judgment for the unpaid balance.", R_9_03_NO_DISPUTE),
  move("defendant:admitted-and-proposed-terms", "defendant:awaiting-settlement-conference", "other-side", "The plaintiff may dispute the proposal within 20 days by asking for a terms of payment hearing (Form 9B).", R_9_03_DISPUTE),
  // Motions (r. 15)
  move("plaintiff:defence-filed", "both:bringing-a-motion", "you", "You ask the court for an order before trial by a notice of motion and supporting affidavit (Form 15A).", R_15_01_MOTION_FORM),
  move("defendant:defence-filed", "both:bringing-a-motion", "you", "You ask the court for an order before trial by a notice of motion and supporting affidavit (Form 15A).", R_15_01_MOTION_FORM),
  move("plaintiff:defence-filed", "both:responding-to-a-motion", "other-side", "The other party serves a notice of motion at least seven days before the hearing date.", R_15_01_SERVE_FILE),
  move("defendant:defence-filed", "both:responding-to-a-motion", "other-side", "The other party serves a notice of motion at least seven days before the hearing date.", R_15_01_SERVE_FILE),
  move("both:bringing-a-motion", "plaintiff:awaiting-settlement-conference", "court", "The motion is heard, in person, by video or phone, or in writing, and the case goes on with whatever order is made.", R_15_02_HEARING),
  move("both:bringing-a-motion", "defendant:awaiting-settlement-conference", "court", "The motion is heard, in person, by video or phone, or in writing, and the case goes on with whatever order is made.", R_15_02_HEARING),
  move("both:responding-to-a-motion", "plaintiff:awaiting-settlement-conference", "court", "The motion is heard, in person, by video or phone, or in writing, and the case goes on with whatever order is made.", R_15_02_HEARING),
  move("both:responding-to-a-motion", "defendant:awaiting-settlement-conference", "court", "The motion is heard, in person, by video or phone, or in writing, and the case goes on with whatever order is made.", R_15_02_HEARING),
  // Trial management conference (r. 16.1)
  move("plaintiff:settlement-conference-held", "both:trial-management-conference", "court", "After a request to fix a trial date is filed, the court may direct a trial management conference before a judge.", R_16_1_01_TMC),
  move("both:trial-management-conference", "plaintiff:trial-date-set", "court", "The conference assesses readiness for trial and sets the trial date, if necessary.", R_16_1_02_TMC_PURPOSES),
  move("both:trial-management-conference", "defendant:trial-date-set", "court", "The conference assesses readiness for trial and sets the trial date, if necessary.", R_16_1_02_TMC_PURPOSES),
  // Offers to settle (r. 14)
  move("plaintiff:defence-filed", "both:offer-to-settle", "either", "An offer to settle may be made at any time.", R_14_02_ANY_TIME),
  move("defendant:defence-filed", "both:offer-to-settle", "either", "An offer to settle may be made at any time.", R_14_02_ANY_TIME),
  move("both:offer-to-settle", "both:bringing-a-motion", "either", "If a party does not do what an accepted offer says, the other party may make a motion for judgment in its terms, or carry on as if there had been no offer.", R_14_06_BREACH),
  move("both:offer-to-settle", "plaintiff:trial-date-set", "either", "If no offer is accepted, the case goes on; an offer made at least seven days before the trial can affect the costs the court awards.", R_14_07_PLAINTIFF_OFFER),
  // Enforcement (r. 20)
  move("plaintiff:judgment-in-my-favour-unpaid", "plaintiff:debtor-examination", "you", "If the judgment is not paid, the clerk issues a notice of examination (Form 20H) at your request.", R_20_10_EXAMINATION),
  move("defendant:judgment-against-me", "defendant:judgment-being-enforced", "other-side", "If the judgment is not paid, the creditor may enforce it, for example by garnishment.", R_20_08_GARNISHMENT),
  move("defendant:default-judgment-against-me", "defendant:judgment-being-enforced", "other-side", "If the judgment is not paid, the creditor may enforce it, for example by garnishment.", R_20_08_GARNISHMENT),
];

/**
 * A step that carries the two-year dismissal-for-delay deadline leads to the
 * dismissed step when that time runs out. Derived from the deadline itself,
 * so a step given that deadline later gets the move without a second edit.
 */
const DISMISSAL_MOVES: StageMove[] = ALL_STAGES.filter((stage) =>
  stage.id !== "plaintiff:action-dismissed-for-delay" && stage.deadlines.some((deadline) => deadline.rule.quote === R_11_1_01_DISMISSAL_FOR_DELAY.quote),
).map((stage) =>
  move(stage.id, "plaintiff:action-dismissed-for-delay", "time", "Two years after the action was started, with no judgment, no step to get one under rule 11.03 and no trial date requested, the clerk dismisses it for delay.", R_11_1_01_DISMISSAL_FOR_DELAY),
);

// ---------------------------------------------------------------- Superior Court (civil): first moves

/** Claims against the Crown for misfeasance or bad faith (2026-10-13). The rest of the civil chain follows. */
const CIVIL_MOVES: StageMove[] = [
  move("civil:before-filing:notice-required-before-suing", "civil:plaintiff:crown-misfeasance-leave-needed", "you", "Notice of the claim was served on the Crown at least 60 days before the proceeding is brought; a claim of misfeasance in public office or bad faith then goes ahead only with the court's leave.", S_CLPA_18_1_NOTICE, S_CLPA_17_2_LEAVE),
  move("civil:plaintiff:crown-misfeasance-leave-needed", "civil:plaintiff:claim-issued-not-served", "court", "Leave is granted, or the Crown waives it in writing: the stay is lifted and the proceeding goes on.", S_CLPA_17_9_GRANTED, S_CLPA_17_11_WAIVER),
];

export const STAGE_MOVES: StageMove[] = [...SMALL_CLAIMS_MOVES, ...LAW_MAP_MOVES, ...DISMISSAL_MOVES, ...CIVIL_MOVES];

/** Steps where this chain stops, and why. Each is a real end, or the next move belongs to a part of the map not yet built. */
export const FINAL_STEPS: FinalStep[] = [
  { stage: "plaintiff:debtor-examination", why: "After the examination the court may make an order as to payment; the other ways to enforce (garnishment, writs) are in this step's card.", rules: [R_20_10_ORDER_AS_TO_PAYMENT, R_20_03_ENFORCEMENT] },
  { stage: "defendant:judgment-being-enforced", why: "The debtor may ask the court to stay enforcement or change the payments if their circumstances have changed; after an examination the court may make an order as to payment.", rules: [R_20_02_STAY_VARY, R_20_10_ORDER_AS_TO_PAYMENT] },
  { stage: "plaintiff:action-dismissed-for-delay", why: "If every party consents, the clerk can restore the action to the list (Form 11.2A); the case then picks up where it was.", rules: [R_11_2_01_RESTORE_ON_CONSENT] },
];

/**
 * Steps a case can be found in with no move leading there: where a case
 * starts, and positions people arrive at from outside the chain. Each says why.
 */
export const STARTING_POINTS: { stage: string; why: string }[] = [
  { stage: "before-filing:deciding-whether-to-sue", why: "Where a person who may sue starts." },
  { stage: "defendant:served-defence-period-running", why: "Where a person who has been sued starts: the plaintiff's claim was served on them." },
  { stage: "both:filed-in-wrong-place", why: "Found when a case turns out to have been started in the wrong place; no step in the chain leads there on purpose." },
];

/** The steps a step can lead to. */
export function movesFrom(stageId: string): StageMove[] {
  return STAGE_MOVES.filter((candidate) => candidate.from === stageId);
}

/** The steps that lead to a step. */
export function movesInto(stageId: string): StageMove[] {
  return STAGE_MOVES.filter((candidate) => candidate.to === stageId);
}

/** The stages this chain covers so far. */
export const SEQUENCED_PATHWAYS = ["small-claims"] as const;

export function isSequenced(stage: CaseStage): boolean {
  return (SEQUENCED_PATHWAYS as readonly string[]).includes(stage.pathway ?? "small-claims");
}
