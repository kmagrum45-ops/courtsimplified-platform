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
 * Small Claims (2026-10-12), Superior Court civil and family (2026-10-13).
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
  R_11_3_01_DISCONTINUE,
  R_11_3_02_EFFECT,
  R_13_09_AFTER_CONFERENCE,
  R_12_01_AMEND,
  R_12_01_NO_RESPONSE_NEEDED,
  R_12_02_STRIKE,
  R_12_02_ORDERS,
  R_12_02_OWN_INITIATIVE,
  R_12_02_SUBMISSION,
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
  // Discontinuing, amending, striking out (rules 11.3, 12, 13.09)
  move("plaintiff:defence-period-expired-no-defence", "plaintiff:wants-to-discontinue", "you", "Against a defendant who did not file a defence in time, you can discontinue by serving a notice of discontinued claim (Form 11.3A) on the defendants served with the claim and filing it with proof of service.", R_11_3_01_DISCONTINUE),
  move("plaintiff:settlement-conference-held", "plaintiff:wants-to-discontinue", "you", "After a settlement conference, a claim against a party not in default is withdrawn or discontinued only with that party's written consent or the court's leave.", R_13_09_AFTER_CONFERENCE),
  move("plaintiff:defence-filed", "both:amending-a-claim-or-defence", "you", "A claim or defence is amended by filing an amended version marked \"Amended\", with additions underlined and other changes identified.", R_12_01_AMEND),
  move("defendant:defence-filed", "both:amending-a-claim-or-defence", "you", "A claim or defence is amended by filing an amended version marked \"Amended\", with additions underlined and other changes identified.", R_12_01_AMEND),
  move("both:amending-a-claim-or-defence", "plaintiff:awaiting-settlement-conference", "either", "The case goes on with the amended document; a party served with it does not have to amend their own claim or defence.", R_12_01_NO_RESPONSE_NEEDED),
  move("both:amending-a-claim-or-defence", "defendant:awaiting-settlement-conference", "either", "The case goes on with the amended document; a party served with it does not have to amend their own claim or defence.", R_12_01_NO_RESPONSE_NEEDED),
  move("plaintiff:defence-filed", "both:motion-to-strike-out", "either", "A party can ask the court, on motion, to strike out or amend a document that discloses no reasonable cause of action or defence, may delay a fair trial, or is an abuse of process.", R_12_02_STRIKE),
  move("defendant:defence-filed", "both:motion-to-strike-out", "either", "A party can ask the court, on motion, to strike out or amend a document that discloses no reasonable cause of action or defence, may delay a fair trial, or is an abuse of process.", R_12_02_STRIKE),
  move("both:motion-to-strike-out", "plaintiff:awaiting-settlement-conference", "court", "The motion is heard, in person, by video or phone, or in writing, and the case goes on with whatever order is made.", R_15_02_HEARING),
  move("both:motion-to-strike-out", "defendant:awaiting-settlement-conference", "court", "The motion is heard, in person, by video or phone, or in writing, and the case goes on with whatever order is made.", R_15_02_HEARING),
  move("both:motion-to-strike-out", "defendant:judgment-against-me", "court", "If a defence is struck out, the court can grant judgment.", R_12_02_ORDERS),
  move("plaintiff:claim-issued-not-served", "plaintiff:court-considering-dismissal", "court", "The court can, on its own, consider staying or dismissing an action that on its face is inflammatory, a waste of time, a nuisance or an abuse of process; the clerk mails the plaintiff a notice first.", R_12_02_OWN_INITIATIVE, R_12_02_SUBMISSION),
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


/**
 * A rule a step already quotes, looked up by its pinpoint, so a move cites the
 * same verified quote the step shows (test:stage-map checks it word for word)
 * and no quote is typed twice. Throws at load if the step does not carry it.
 */
function stepRule(stageId: string, pinpoint: string): RuleCitation {
  const stage = ALL_STAGES.find((candidate) => candidate.id === stageId);
  const all = stage ? [...stage.rules, ...stage.deadlines.map((deadline) => deadline.rule), ...stage.deadlines.flatMap((deadline) => deadline.exceptions)] : [];
  const found = all.find((rule) => rule.pinpoint === pinpoint);
  if (!found) throw new Error(`stageSequence: ${stageId} does not quote ${pinpoint}`);
  return found;
}

// ---------------------------------------------------------------- Superior Court (civil): first moves

/** Claims against the Crown for misfeasance or bad faith (2026-10-13). The rest of the civil chain follows. */
const CIVIL_MOVES: StageMove[] = [
  move("civil:before-filing:notice-required-before-suing", "civil:plaintiff:crown-misfeasance-leave-needed", "you", "Notice of the claim was served on the Crown at least 60 days before the proceeding is brought; a claim of misfeasance in public office or bad faith then goes ahead only with the court's leave.", S_CLPA_18_1_NOTICE, S_CLPA_17_2_LEAVE),
  move("civil:plaintiff:crown-misfeasance-leave-needed", "civil:plaintiff:claim-issued-not-served", "court", "Leave is granted, or the Crown waives it in writing: the stay is lifted and the proceeding goes on.", S_CLPA_17_9_GRANTED, S_CLPA_17_11_WAIVER),
  move("civil:before-filing:deciding-whether-to-sue", "civil:plaintiff:claim-drafted-not-issued", "you", "An action is started by a statement of claim (Form 14A or 14B).", stepRule("civil:plaintiff:claim-drafted-not-issued", "r. 14.03 (1)")),
  move("civil:before-filing:deciding-whether-to-sue", "civil:before-filing:notice-required-before-suing", "you", "A claim for damages against the Ontario Crown needs written notice served at least 60 days before the proceeding is brought; other statutes require notice for some other claims.", stepRule("civil:before-filing:notice-required-before-suing", "s. 18 (1)")),
  move("civil:before-filing:deciding-whether-to-sue", "civil:before-filing:limitation-period-may-have-passed", "time", "The two years may have run from the day the claim was discovered.", stepRule("civil:before-filing:limitation-period-may-have-passed", "s. 4"), stepRule("civil:before-filing:limitation-period-may-have-passed", "s. 5 (1)")),
  move("civil:before-filing:deciding-whether-to-sue", "before-filing:deciding-whether-to-sue", "you", "A claim within the Small Claims Court's limit cannot be started in the Superior Court without that court's leave.", stepRule("civil:before-filing:deciding-whether-to-sue", "s. 23 (1.1)")),
  move("civil:before-filing:notice-required-before-suing", "civil:plaintiff:claim-drafted-not-issued", "you", "Once the required notice has been given, the action is started by a statement of claim.", stepRule("civil:before-filing:notice-required-before-suing", "s. 18 (1)"), stepRule("civil:plaintiff:claim-drafted-not-issued", "r. 14.03 (1)")),
  move("civil:before-filing:limitation-period-may-have-passed", "civil:plaintiff:claim-drafted-not-issued", "you", "The Act sets when a claim is discovered; a claim started within two years of that day can go ahead.", stepRule("civil:before-filing:limitation-period-may-have-passed", "s. 5 (1)"), stepRule("civil:plaintiff:claim-drafted-not-issued", "r. 14.03 (1)")),
  move("civil:plaintiff:claim-drafted-not-issued", "civil:plaintiff:claim-issued-not-served", "court", "The registrar issues the claim by dating, signing and sealing it and giving it a court file number.", stepRule("civil:plaintiff:claim-drafted-not-issued", "r. 14.07 (1)")),
  move("civil:plaintiff:claim-issued-not-served", "civil:plaintiff:served-awaiting-defence", "you", "You serve the statement of claim, within six months after it was issued.", stepRule("civil:plaintiff:claim-issued-not-served", "r. 14.08 (1)")),
  move("civil:plaintiff:claim-issued-not-served", "civil:plaintiff:service-attempted-failed", "you", "Prompt service turns out to be impractical.", stepRule("civil:plaintiff:service-attempted-failed", "r. 16.04 (1)")),
  move("civil:plaintiff:service-attempted-failed", "civil:plaintiff:served-awaiting-defence", "court", "The court may order substituted service or, where necessary in the interest of justice, dispense with service.", stepRule("civil:plaintiff:service-attempted-failed", "r. 16.04 (1)")),
  move("civil:plaintiff:served-awaiting-defence", "civil:plaintiff:defence-received", "other-side", "The defendant delivers a statement of defence: within 20 days if served in Ontario, 40 elsewhere in Canada or the U.S., 60 anywhere else.", stepRule("civil:plaintiff:served-awaiting-defence", "r. 18.01")),
  move("civil:plaintiff:served-awaiting-defence", "civil:plaintiff:defence-period-expired-no-defence", "time", "The time to deliver a defence runs out with no defence.", stepRule("civil:plaintiff:served-awaiting-defence", "r. 18.01")),
  move("civil:plaintiff:defence-period-expired-no-defence", "civil:plaintiff:defendant-noted-in-default", "you", "You file proof of service and require the registrar to note the defendant in default.", stepRule("civil:plaintiff:defence-period-expired-no-defence", "r. 19.01 (1)")),
  move("civil:plaintiff:defendant-noted-in-default", "civil:plaintiff:judgment-unpaid", "court", "For a debt or fixed sum, recovery of land or property, or foreclosure, the registrar may sign default judgment at your request.", stepRule("civil:plaintiff:defendant-noted-in-default", "r. 19.04 (1)")),
  move("civil:plaintiff:defendant-noted-in-default", "civil:both:motion-scheduled", "you", "For any other claim, you may move before a judge for judgment on the statement of claim.", stepRule("civil:plaintiff:defendant-noted-in-default", "r. 19.05 (1)")),
  move("civil:plaintiff:defence-received", "civil:plaintiff:served-with-counterclaim", "other-side", "The defendant's statement of defence includes a counterclaim; a defence to counterclaim (Form 27C) is due within 20 days of its service.", stepRule("civil:plaintiff:served-with-counterclaim", "r. 27.05 (1)")),
  move("civil:plaintiff:defence-received", "civil:both:discovery", "either", "A party who wants evidence through discovery of documents or examinations; the parties agree a discovery plan.", stepRule("civil:both:discovery", "r. 29.1.03 (1)")),
  move("civil:plaintiff:defence-received", "civil:both:mandatory-mediation", "court", "An action started in Ottawa, Toronto or Essex County on or after January 1, 2010 is under mandatory mediation.", stepRule("civil:both:mandatory-mediation", "r. 24.1.04 (1)")),
  move("civil:plaintiff:defence-received", "civil:both:simplified-procedure-after-defence", "either", "The claim is only for money or property and totals $200,000 or less, so the simplified procedure is used.", stepRule("civil:both:simplified-procedure-after-defence", "r. 76.02 (1)")),
  move("civil:plaintiff:defence-received", "civil:both:served-with-amended-pleading", "other-side", "A party amends a pleading; a response is due within the time left for the original or 10 days after service, whichever is longer.", stepRule("civil:both:served-with-amended-pleading", "r. 26.05 (1)")),
  move("civil:plaintiff:defence-received", "civil:both:offer-to-settle", "either", "An offer to settle may be made at any time; made less than seven days before the hearing, the costs consequences in rule 49.10 do not apply.", stepRule("civil:both:offer-to-settle", "r. 49.03")),
  move("civil:plaintiff:defence-received", "civil:plaintiff:wants-to-discontinue", "you", "Before pleadings close you may discontinue by a notice of discontinuance (Form 23A); after, with leave or everyone's consent.", stepRule("civil:plaintiff:wants-to-discontinue", "r. 23.01 (1)")),
  move("civil:plaintiff:served-with-counterclaim", "civil:both:discovery", "either", "Pleadings on the counterclaim are delivered and the action moves to discovery.", stepRule("civil:both:discovery", "r. 29.1.03 (1)")),
  move("civil:both:discovery", "civil:plaintiff:ready-to-set-down", "either", "After the close of pleadings, a party who is not in default and is ready for trial may set the action down.", stepRule("civil:plaintiff:ready-to-set-down", "r. 48.01")),
  move("civil:both:discovery", "civil:both:served-with-request-to-admit", "other-side", "A party may at any time serve a request to admit (Form 51A) a fact or that a document is genuine.", stepRule("civil:both:served-with-request-to-admit", "r. 51.02 (1)")),
  move("civil:both:discovery", "civil:both:summary-judgment-motion", "either", "After the defence is delivered, the plaintiff may move for summary judgment on all or part of the claim.", stepRule("civil:both:summary-judgment-motion", "r. 20.01 (1)")),
  move("civil:both:discovery", "civil:both:motion-scheduled", "either", "A party brings a motion on notice, served at least seven days before it is heard.", stepRule("civil:both:motion-scheduled", "r. 37.07 (6)")),
  move("civil:both:served-with-request-to-admit", "civil:both:discovery", "you", "You respond within 20 days by serving a response to request to admit (Form 51B).", stepRule("civil:both:served-with-request-to-admit", "r. 51.03 (1)")),
  move("civil:both:mandatory-mediation", "civil:plaintiff:ready-to-set-down", "either", "Before setting the action down, a party files the mediator's name and session date (Form 24.1A) or the mediator's report.", stepRule("civil:plaintiff:ready-to-set-down", "r. 24.1.09 (5)")),
  move("civil:both:simplified-procedure-after-defence", "civil:both:pretrial-scheduled", "either", "The plaintiff sets the action down within 180 days after the first defence by serving a notice of readiness for pre-trial conference (Form 76C).", stepRule("civil:both:simplified-procedure-after-defence", "r. 76.09 (1)")),
  move("civil:both:served-with-amended-pleading", "civil:both:discovery", "you", "You respond to the amended pleading within the longer of the time left and 10 days after service.", stepRule("civil:both:served-with-amended-pleading", "r. 26.05 (1)")),
  move("civil:plaintiff:ready-to-set-down", "civil:both:pretrial-scheduled", "you", "You set the action down by serving a trial record on every party and filing it with proof of service; a pre-trial conference is then scheduled within 180 days.", stepRule("civil:plaintiff:ready-to-set-down", "r. 48.02 (1)"), stepRule("civil:both:pretrial-scheduled", "r. 50.02 (1)")),
  move("civil:plaintiff:ready-to-set-down", "civil:plaintiff:action-dismissed-for-delay", "time", "An action not set down for trial or ended by the fifth anniversary of its start is dismissed for delay by the registrar, unless the court orders otherwise.", stepRule("civil:plaintiff:ready-to-set-down", "r. 48.14 (1)")),
  move("civil:both:pretrial-scheduled", "civil:both:trial-date-set", "court", "The action is placed on a trial list and all parties are deemed ready for trial.", stepRule("civil:both:trial-date-set", "r. 48.07")),
  move("civil:both:trial-date-set", "civil:both:judgment-given", "court", "After the trial, a final order is made; an appeal starts with a notice of appeal served within 30 days.", stepRule("civil:both:judgment-given", "r. 61.04 (1)")),
  move("civil:both:trial-date-set", "civil:both:missed-trial", "either", "When the action is called for trial, all the parties fail to attend.", stepRule("civil:both:missed-trial", "r. 52.01 (1)")),
  move("civil:both:missed-trial", "civil:plaintiff:struck-off-trial-list", "court", "The trial judge may strike the action off the trial list.", stepRule("civil:both:missed-trial", "r. 52.01 (1)")),
  move("civil:both:missed-trial", "civil:both:motion-scheduled", "either", "A judge may set aside or vary a judgment obtained against a party who did not attend the trial.", stepRule("civil:both:missed-trial", "r. 52.01 (3)")),
  move("civil:plaintiff:struck-off-trial-list", "civil:both:trial-date-set", "court", "An action struck off a trial list goes back on only with leave.", stepRule("civil:plaintiff:struck-off-trial-list", "r. 48.11")),
  move("civil:plaintiff:struck-off-trial-list", "civil:plaintiff:action-dismissed-for-delay", "time", "An action struck off a trial list and not restored or ended is dismissed for delay by the registrar, unless the court orders otherwise.", stepRule("civil:plaintiff:ready-to-set-down", "r. 48.14 (1)")),
  move("civil:plaintiff:action-dismissed-for-delay", "civil:both:motion-scheduled", "you", "A party affected by a registrar's order may move to set it aside, by a notice of motion served as soon as the order comes to their attention.", stepRule("civil:plaintiff:action-dismissed-for-delay", "r. 37.14 (1)")),
  move("civil:both:judgment-given", "civil:both:appeal-in-progress", "either", "An appeal starts with a notice of appeal (Form 61A.2 or 61A.3) served within 30 days after the order.", stepRule("civil:both:judgment-given", "r. 61.04 (1)")),
  move("civil:both:judgment-given", "civil:plaintiff:judgment-unpaid", "other-side", "An order for money that is not paid may be enforced by a writ of seizure and sale, garnishment, a writ of sequestration or a receiver.", stepRule("civil:plaintiff:judgment-unpaid", "r. 60.02 (1)")),
  move("civil:both:judgment-given", "civil:defendant:judgment-being-enforced", "other-side", "An order for money that is not paid may be enforced by a writ of seizure and sale, garnishment, a writ of sequestration or a receiver.", stepRule("civil:plaintiff:judgment-unpaid", "r. 60.02 (1)")),
  move("civil:both:summary-judgment-motion", "civil:both:judgment-given", "court", "The court grants summary judgment if there is no genuine issue requiring a trial, or the parties agree and the court finds it appropriate.", stepRule("civil:both:summary-judgment-motion", "r. 20.04 (2)")),
  move("civil:both:motion-scheduled", "civil:both:interlocutory-order-made", "court", "The motion is heard and an order is made.", stepRule("civil:both:motion-scheduled", "r. 37.07 (6)")),
  move("civil:both:interlocutory-order-made", "civil:both:appeal-in-progress", "either", "An interlocutory order of a Superior Court judge can be appealed to the Divisional Court only with leave of a panel of that court.", stepRule("civil:both:interlocutory-order-made", "r. 62.02 (1)")),
  move("civil:both:interlocutory-order-made", "civil:both:discovery", "either", "Without an appeal, the action continues.", stepRule("civil:both:interlocutory-order-made", "s. 19 (1)")),
  move("civil:both:offer-to-settle", "civil:both:trial-date-set", "either", "If no offer is accepted, the action continues; an offer made at least seven days before the hearing and not withdrawn can affect costs.", stepRule("civil:both:offer-to-settle", "r. 49.10 (1)")),
  move("civil:both:lawyer-removed-from-record", "civil:both:discovery", "you", "Within 30 days after being served with the order, you appoint a new lawyer (Form 15B) or serve a notice of intention to act in person (Form 15C).", stepRule("civil:both:lawyer-removed-from-record", "r. 15.04 (16)")),
  move("civil:defendant:served-defence-period-running", "civil:defendant:defence-delivered", "you", "You deliver a statement of defence (Form 18A): within 20 days if served in Ontario, 40 elsewhere in Canada or the U.S., 60 anywhere else.", stepRule("civil:plaintiff:served-awaiting-defence", "r. 18.01")),
  move("civil:defendant:served-defence-period-running", "civil:defendant:defence-period-expired-not-noted", "time", "The time to deliver a defence runs out.", stepRule("civil:plaintiff:served-awaiting-defence", "r. 18.01")),
  move("civil:defendant:defence-period-expired-not-noted", "civil:defendant:defence-delivered", "you", "You may still deliver a statement of defence at any time before being noted in default.", stepRule("civil:defendant:defence-period-expired-not-noted", "r. 19.01 (5)")),
  move("civil:defendant:defence-period-expired-not-noted", "civil:defendant:noted-in-default", "other-side", "The plaintiff files proof of service and requires the registrar to note you in default.", stepRule("civil:plaintiff:defence-period-expired-no-defence", "r. 19.01 (1)")),
  move("civil:defendant:noted-in-default", "civil:defendant:defence-delivered", "court", "The court may set aside the noting of default on such terms as are just.", stepRule("civil:defendant:noted-in-default", "r. 19.03 (1)")),
  move("civil:defendant:noted-in-default", "civil:defendant:default-judgment-against-me", "court", "For a debt or fixed sum and some other claims, the registrar may sign default judgment at the plaintiff's request.", stepRule("civil:plaintiff:defendant-noted-in-default", "r. 19.04 (1)")),
  move("civil:defendant:default-judgment-against-me", "civil:defendant:defence-delivered", "court", "The court may set aside or vary the default judgment on such terms as are just.", stepRule("civil:defendant:default-judgment-against-me", "r. 19.08 (1)")),
  move("civil:defendant:default-judgment-against-me", "civil:defendant:judgment-being-enforced", "other-side", "An unpaid order for money may be enforced by a writ of seizure and sale, garnishment, a writ of sequestration or a receiver.", stepRule("civil:plaintiff:judgment-unpaid", "r. 60.02 (1)")),
  move("civil:defendant:defence-delivered", "civil:both:discovery", "either", "A party who wants evidence through discovery; the parties agree a discovery plan.", stepRule("civil:both:discovery", "r. 29.1.03 (1)")),
  move("civil:defendant:defence-delivered", "civil:both:offer-to-settle", "either", "An offer to settle may be made at any time.", stepRule("civil:both:offer-to-settle", "r. 49.03")),
  move("civil:defendant:defence-delivered", "civil:defendant:plaintiff-delaying", "time", "The plaintiff fails to take a step the rules set a time for, such as setting the action down for trial.", stepRule("civil:defendant:plaintiff-delaying", "r. 24.01 (1)")),
  move("civil:defendant:defence-delivered", "civil:defendant:served-with-crossclaim", "other-side", "Another defendant crossclaims against you; a defence to crossclaim (Form 28B) is due within 20 days.", stepRule("civil:defendant:served-with-crossclaim", "r. 28.05 (1)")),
  move("civil:defendant:defence-delivered", "civil:defendant:action-discontinued-counterclaim-pending", "other-side", "The plaintiff discontinues the action against you while your counterclaim is outstanding.", stepRule("civil:defendant:action-discontinued-counterclaim-pending", "r. 23.02")),
  move("civil:defendant:defence-delivered", "civil:defendant:action-dismissed-counterclaim-pending", "court", "The action against you is dismissed for delay while your counterclaim is outstanding.", stepRule("civil:defendant:action-dismissed-counterclaim-pending", "r. 24.03")),
  move("civil:defendant:plaintiff-delaying", "civil:both:motion-scheduled", "you", "A defendant not in default may move to have the action dismissed for delay.", stepRule("civil:defendant:plaintiff-delaying", "r. 24.01 (1)")),
  move("civil:defendant:served-with-crossclaim", "civil:both:discovery", "you", "You deliver a defence to crossclaim (Form 28B) within 20 days of service.", stepRule("civil:defendant:served-with-crossclaim", "r. 28.05 (1)")),
  move("civil:defendant:served-with-counterclaim-as-new-party", "civil:both:discovery", "you", "You deliver a defence to counterclaim within 20 days if served in Ontario (longer elsewhere).", stepRule("civil:defendant:served-with-counterclaim-as-new-party", "r. 27.05 (3)")),
  move("civil:defendant:served-with-third-party-claim", "civil:both:discovery", "you", "You may defend by delivering a third party defence (Form 29B) within 20 days if served in Ontario (longer elsewhere).", stepRule("civil:defendant:served-with-third-party-claim", "r. 29.03")),
  move("civil:defendant:action-discontinued-counterclaim-pending", "civil:both:discovery", "you", "Within 30 days you may deliver a notice of election to proceed with the counterclaim (Form 23B); otherwise it is deemed discontinued.", stepRule("civil:defendant:action-discontinued-counterclaim-pending", "r. 23.02")),
  move("civil:defendant:action-dismissed-counterclaim-pending", "civil:both:discovery", "you", "Within 30 days you may deliver a notice of election to proceed with the counterclaim (Form 23B); otherwise it is deemed discontinued.", stepRule("civil:defendant:action-dismissed-counterclaim-pending", "r. 24.03")),
  // Law map, 2026-10-13: striking out, amending, injunctions, certificates of pending litigation, anti-SLAPP
  move("civil:plaintiff:defence-received", "civil:both:motion-to-strike-or-dismiss", "either", "A party can move before a judge to strike out a pleading that discloses no reasonable cause of action or defence, or to decide a question of law before trial; the motion is made promptly.", stepRule("civil:both:motion-to-strike-or-dismiss", "r. 21.01 (1)"), stepRule("civil:both:motion-to-strike-or-dismiss", "r. 21.02")),
  move("civil:defendant:served-defence-period-running", "civil:both:motion-to-strike-or-dismiss", "you", "A defendant can move to have the action stayed or dismissed, for example where the court has no jurisdiction, another proceeding is pending, or the action is frivolous, vexatious or an abuse of process.", stepRule("civil:both:motion-to-strike-or-dismiss", "r. 21.01 (3)")),
  move("civil:defendant:defence-delivered", "civil:both:motion-to-strike-or-dismiss", "either", "A party can move before a judge to strike out a pleading that discloses no reasonable cause of action or defence, or to decide a question of law before trial.", stepRule("civil:both:motion-to-strike-or-dismiss", "r. 21.01 (1)")),
  move("civil:both:motion-to-strike-or-dismiss", "civil:both:interlocutory-order-made", "court", "The judge hears the motion and can make an order, such as striking out a pleading with or without leave to amend.", stepRule("civil:both:motion-to-strike-or-dismiss", "r. 21.01 (1)"), stepRule("civil:both:motion-to-strike-or-dismiss", "r. 25.11")),
  move("civil:both:motion-to-strike-or-dismiss", "civil:both:judgment-given", "court", "The judge can grant judgment on the motion.", stepRule("civil:both:motion-to-strike-or-dismiss", "r. 21.01 (1)")),
  move("civil:plaintiff:defence-received", "civil:both:amending-a-pleading", "you", "A party can amend their own pleading without leave before pleadings close (unless parties change), on everyone's filed consent, or with the court's leave.", stepRule("civil:both:amending-a-pleading", "r. 26.02")),
  move("civil:defendant:defence-delivered", "civil:both:amending-a-pleading", "you", "A party can amend their own pleading without leave before pleadings close (unless parties change), on everyone's filed consent, or with the court's leave.", stepRule("civil:both:amending-a-pleading", "r. 26.02")),
  move("civil:both:amending-a-pleading", "civil:both:motion-scheduled", "you", "Where leave is needed, it is asked by motion; the court grants it on just terms unless prejudice would result that costs or an adjournment could not make up for.", stepRule("civil:both:amending-a-pleading", "r. 26.01")),
  move("civil:both:amending-a-pleading", "civil:both:discovery", "either", "The other parties respond to the amended pleading within the time left for the original or 10 days after service, whichever is longer, and the action goes on.", stepRule("civil:both:served-with-amended-pleading", "r. 26.05 (1)")),
  move("civil:plaintiff:claim-issued-not-served", "civil:both:asking-for-injunction", "you", "Once the action is started, a party can ask a judge for an interlocutory injunction or mandatory order, granted where it appears just or convenient.", stepRule("civil:both:asking-for-injunction", "s. 101 (1)")),
  move("civil:defendant:defence-delivered", "civil:both:asking-for-injunction", "you", "A party can ask a judge for an interlocutory injunction or mandatory order, granted where it appears just or convenient.", stepRule("civil:both:asking-for-injunction", "s. 101 (1)")),
  move("civil:both:asking-for-injunction", "civil:both:interlocutory-order-made", "court", "The judge decides the motion; an order can include terms the judge considers just.", stepRule("civil:both:asking-for-injunction", "s. 101 (1)"), stepRule("civil:both:asking-for-injunction", "s. 101 (2)")),
  move("civil:plaintiff:claim-drafted-not-issued", "civil:plaintiff:certificate-of-pending-litigation", "you", "If the action puts an interest in land in question, the statement of claim includes a claim for a certificate of pending litigation and a description of the land.", stepRule("civil:plaintiff:certificate-of-pending-litigation", "r. 42.01 (2)")),
  move("civil:plaintiff:certificate-of-pending-litigation", "civil:plaintiff:claim-issued-not-served", "court", "The registrar issues the certificate only under a court order, which can be asked for by motion without notice; it is then registered on title.", stepRule("civil:plaintiff:certificate-of-pending-litigation", "r. 42.01 (1)"), stepRule("civil:plaintiff:certificate-of-pending-litigation", "r. 42.01 (3)")),
  move("civil:defendant:served-defence-period-running", "civil:defendant:sued-over-public-expression", "you", "A person sued over expression relating to a matter of public interest can move under section 137.1 to have the proceeding dismissed; once the motion is made, no other step is taken until it is finally decided.", stepRule("civil:defendant:sued-over-public-expression", "s. 137.1 (3)"), stepRule("civil:defendant:sued-over-public-expression", "s. 137.1 (5)")),
  move("civil:defendant:sued-over-public-expression", "civil:both:judgment-given", "court", "The motion is heard within 60 days after it is filed; the judge decides it under the tests in subsections 137.1 (3) and (4), which can end the proceeding.", stepRule("civil:defendant:sued-over-public-expression", "s. 137.2 (2)"), stepRule("civil:defendant:sued-over-public-expression", "s. 137.1 (4)")),
  move("civil:defendant:sued-over-public-expression", "civil:defendant:defence-delivered", "court", "If the proceeding is not dismissed, it goes on once the motion, including any appeal, is finally disposed of.", stepRule("civil:defendant:sued-over-public-expression", "s. 137.1 (5)")),
];


// ---------------------------------------------------------------- Family (2026-10-13)

const F = (stageId: string, pinpoint: string) => stepRule(`family:${stageId}`, pinpoint);
/** "A case shall not be scheduled for trial unless a settlement conference has been conducted": why the steps between conferences return to the settlement conference. */
const FAMILY_BEFORE_TRIAL = () => F("both:settlement-conference-scheduled", "r. 17 (10)");

const FAMILY_MOVES: StageMove[] = [
  // Before filing
  move("family:before-filing:deciding-where-to-start", "family:applicant:application-filed-not-served", "you", "A family case is started by filing an application (Form 8 or another listed form), in the municipality the rules name.", F("applicant:application-filed-not-served", "r. 8 (1)"), F("before-filing:deciding-where-to-start", "r. 5 (1)")),
  move("family:before-filing:deciding-where-to-start", "family:before-filing:property-claim-time-limit", "time", "A claim to equalize net family property has its own time limit: two years after a divorce, six years after separation, or six months after a spouse's death, whichever comes first.", F("before-filing:property-claim-time-limit", "s. 7 (3)")),
  move("family:before-filing:deciding-where-to-start", "family:applicant:uncontested-or-joint-divorce", "you", "Either spouse may start a divorce case, naming the other as respondent, or the spouses may file a joint application with no respondent.", F("applicant:uncontested-or-joint-divorce", "r. 36 (1)")),
  move("family:before-filing:deciding-where-to-start", "family:both:asking-to-change-final-order", "you", "Where there is already a final order, a filed support agreement or a filed arbitration award, the way to change it is a motion to change.", F("both:asking-to-change-final-order", "r. 15 (2)")),
  move("family:before-filing:property-claim-time-limit", "family:applicant:application-filed-not-served", "you", "An application to equalize net family property is filed before the earliest of those times.", F("before-filing:property-claim-time-limit", "s. 7 (3)"), F("applicant:application-filed-not-served", "r. 8 (1)")),

  // Applicant
  move("family:applicant:application-filed-not-served", "family:applicant:served-waiting-for-answer", "you", "You serve the application right away on every other party, by special service unless the rules say otherwise.", F("applicant:application-filed-not-served", "r. 8 (5)")),
  move("family:applicant:application-filed-not-served", "family:applicant:service-failed", "you", "Attempts to serve it do not work.", F("applicant:service-failed", "r. 6 (15)")),
  move("family:applicant:application-filed-not-served", "family:both:served-with-automatic-order", "court", "For a parenting, property or matrimonial home claim, the clerk issues an automatic order, which is served with the application.", F("both:served-with-automatic-order", "r. 8.0.1 (3)"), F("both:served-with-automatic-order", "r. 8.0.1 (5)")),
  move("family:applicant:application-filed-not-served", "family:applicant:amending-own-application", "you", "Before an answer is filed you may amend the application without the court's permission; after, only with everyone's consent.", F("applicant:amending-own-application", "r. 11 (1)")),
  move("family:applicant:service-failed", "family:applicant:served-waiting-for-answer", "court", "On a motion with detailed evidence of the steps taken, the court may order substituted service, or order that service is not required.", F("applicant:service-failed", "r. 6 (15)"), F("applicant:service-failed", "r. 6 (16)")),
  move("family:applicant:served-waiting-for-answer", "family:applicant:answer-received", "other-side", "The respondent serves and files an answer within 30 days after being served.", F("applicant:served-waiting-for-answer", "r. 10 (1)")),
  move("family:applicant:served-waiting-for-answer", "family:applicant:no-answer-filed", "time", "The 30 days pass with no answer served and filed.", F("applicant:served-waiting-for-answer", "r. 10 (1)"), F("applicant:served-waiting-for-answer", "r. 10 (5)")),
  move("family:applicant:no-answer-filed", "family:both:trial-scheduled", "you", "On request, the clerk sets a date for an uncontested trial; the court may deal with the case without the respondent.", F("applicant:no-answer-filed", "r. 17 (2)"), F("applicant:no-answer-filed", "r. 1 (8.4)")),
  move("family:applicant:no-answer-filed", "family:both:case-conference-scheduled", "you", "On request, the clerk schedules a case conference.", F("applicant:no-answer-filed", "r. 17 (2)")),
  move("family:applicant:no-answer-filed", "family:applicant:uncontested-or-joint-divorce", "you", "In a divorce case with no answer, you file the affidavit for a divorce (Form 36) and the clerk prepares the documents for a judge.", F("applicant:no-answer-filed", "r. 36 (5.1)"), F("applicant:no-answer-filed", "r. 17 (2)")),
  move("family:applicant:answer-received", "family:both:case-conference-scheduled", "court", "In each case where an answer is filed, a judge holds at least one conference; a party asks for it by a case conference notice (Form 17).", F("applicant:answer-received", "r. 17 (1)"), F("applicant:answer-received", "r. 17 (4.1)")),
  move("family:applicant:amending-own-application", "family:applicant:served-waiting-for-answer", "you", "You serve and file the amended application in the same way as the first.", F("applicant:amending-own-application", "r. 11 (1)")),
  move("family:applicant:uncontested-or-joint-divorce", "family:both:final-order-made", "court", "A divorce the judge grants takes effect on the 31st day after the judgment.", F("applicant:uncontested-or-joint-divorce", "s. 12 (1)")),

  // Respondent
  move("family:respondent:served-time-to-answer-running", "family:respondent:answer-filed", "you", "You serve an answer on every other party and file it within 30 days after being served.", F("respondent:served-time-to-answer-running", "r. 10 (1)")),
  move("family:respondent:served-time-to-answer-running", "family:respondent:answer-time-missed", "time", "The 30 days pass without an answer served and filed.", F("respondent:served-time-to-answer-running", "r. 10 (1)")),
  move("family:respondent:served-time-to-answer-running", "family:respondent:served-with-amended-application", "other-side", "The applicant serves an amended application; you may amend your answer within 14 days.", F("respondent:served-with-amended-application", "r. 11 (2)")),
  move("family:respondent:served-time-to-answer-running", "family:both:served-with-automatic-order", "other-side", "An automatic order issued on the application is served on you with it.", F("both:served-with-automatic-order", "r. 8.0.1 (5)")),
  move("family:respondent:answer-time-missed", "family:respondent:answer-filed", "court", "The court may lengthen any time in the rules, or the parties may change it by written consent; the answer is then filed.", F("respondent:answer-time-missed", "r. 3 (5)"), F("respondent:answer-time-missed", "r. 3 (6)")),
  move("family:respondent:answer-time-missed", "family:both:trial-scheduled", "other-side", "Without an answer, the court may deal with the case in your absence and a date may be set for an uncontested trial.", F("respondent:answer-time-missed", "r. 10 (5)"), F("applicant:no-answer-filed", "r. 1 (8.4)")),
  move("family:respondent:answer-filed", "family:both:case-conference-scheduled", "court", "In each case where an answer is filed, a judge holds at least one conference.", F("respondent:answer-filed", "r. 17 (1)")),
  move("family:respondent:served-with-amended-application", "family:respondent:answer-filed", "you", "You may serve and file an amended answer within 14 days after being served with the amended application.", F("respondent:served-with-amended-application", "r. 11 (2)")),

  // The automatic order
  move("family:both:served-with-automatic-order", "family:both:case-conference-scheduled", "court", "The case goes on: where an answer is filed, a judge holds at least one conference.", F("respondent:answer-filed", "r. 17 (1)")),

  // Conferences
  move("family:both:case-conference-scheduled", "family:both:settlement-conference-scheduled", "court", "After the case conference comes a settlement conference; a case is scheduled for trial only after one, or on a judge's order.", F("both:settlement-conference-scheduled", "r. 17 (5)"), FAMILY_BEFORE_TRIAL()),
  move("family:both:case-conference-scheduled", "family:both:missed-or-unconfirmed-conference", "either", "A conference is not held if it was not confirmed to the clerk, unless the court orders otherwise, and the parties must come to it.", F("both:missed-or-unconfirmed-conference", "r. 17 (14.1)"), F("both:missed-or-unconfirmed-conference", "r. 17 (15)")),
  move("family:both:case-conference-scheduled", "family:both:bringing-a-motion", "you", "Once a conference on the substantive issues has been completed, a motion for a temporary order can be served (sooner only in the cases the rules allow, such as urgency).", F("both:bringing-a-motion", "r. 14 (4)"), F("both:bringing-a-motion", "r. 14 (1)")),
  move("family:both:case-conference-scheduled", "family:both:responding-to-a-motion", "other-side", "The other party brings a motion; a response is due not later than four days before the motion date.", F("both:responding-to-a-motion", "r. 14 (11.3)")),
  move("family:both:case-conference-scheduled", "family:both:financial-disclosure-missing", "you", "The other party's financial disclosure is not enough to understand their finances: you ask in writing for what is missing.", F("both:financial-disclosure-missing", "r. 13 (11)")),
  move("family:both:case-conference-scheduled", "family:both:document-disclosure-requested", "other-side", "A party asks for an affidavit listing documents, due within 10 days of the request.", F("both:document-disclosure-requested", "r. 19 (1)")),
  move("family:both:case-conference-scheduled", "family:both:questioning", "either", "A party may get information from another party by consent, or by a court order for questioning.", F("both:questioning", "r. 20 (4)"), F("both:questioning", "r. 20 (5)")),
  move("family:both:case-conference-scheduled", "family:both:served-with-request-to-admit", "other-side", "At any time, a party may serve a request to admit (Form 22) a fact or that a document is genuine.", F("both:served-with-request-to-admit", "r. 22 (2)")),
  move("family:both:case-conference-scheduled", "family:both:offer-to-settle", "either", "A party may serve an offer to settle on any other party.", F("both:offer-to-settle", "r. 18 (3)-(10)")),
  move("family:both:case-conference-scheduled", "family:both:childrens-lawyer-report", "court", "Where the Children's Lawyer investigates and reports on parenting, notice is first served on the parties.", F("both:childrens-lawyer-report", "r. 21 (a)")),
  move("family:both:case-conference-scheduled", "family:both:responding-to-summary-judgment", "other-side", "After an answer is served, or the time for one has run out, a party may move for summary judgment.", F("both:responding-to-summary-judgment", "r. 16 (1)")),
  move("family:both:case-conference-scheduled", "family:both:binding-judicial-dispute-resolution", "either", "Where the court offers it, each party may ask for a binding judicial dispute resolution hearing by serving and filing a request and consent (Form 43 or 43A).", F("both:binding-judicial-dispute-resolution", "r. 43 (4)"), F("both:binding-judicial-dispute-resolution", "r. 43 (7)")),
  move("family:both:case-conference-scheduled", "family:both:withdrawing-a-claim", "you", "A party may withdraw all or part of an application, answer or reply by serving and filing a notice of withdrawal (Form 12).", F("both:withdrawing-a-claim", "r. 12 (1)")),
  move("family:both:case-conference-scheduled", "family:both:case-in-wrong-municipality", "either", "If another municipality is substantially more convenient, the court may on motion transfer the case.", F("both:case-in-wrong-municipality", "r. 5 (8)")),
  move("family:both:case-conference-scheduled", "family:both:notice-of-approaching-dismissal", "court", "If the case is not settled, withdrawn or scheduled for trial before the 365th day after it started, the clerk serves a notice of approaching dismissal (Form 39).", F("both:notice-of-approaching-dismissal", "r. 39 (11)")),
  move("family:both:case-conference-scheduled", "family:both:notice-case-may-be-stayed-or-dismissed", "court", "The court may give notice (Form 1.4A) that a case which appears frivolous, vexatious or an abuse of process may be stayed or dismissed.", F("both:notice-case-may-be-stayed-or-dismissed", "r. 1.4 (1)"), F("both:notice-case-may-be-stayed-or-dismissed", "r. 1.4 (5)")),
  move("family:both:settlement-conference-scheduled", "family:both:trial-management-conference-scheduled", "court", "A trial management conference may follow; among its purposes is setting the trial date.", F("both:trial-management-conference-scheduled", "r. 17 (6)")),
  move("family:both:settlement-conference-scheduled", "family:both:trial-scheduled", "court", "Once a settlement conference has been held, the case can be scheduled for trial.", FAMILY_BEFORE_TRIAL()),
  move("family:both:settlement-conference-scheduled", "family:both:missed-or-unconfirmed-conference", "either", "A conference is not held if it was not confirmed to the clerk, unless the court orders otherwise.", F("both:settlement-conference-scheduled", "r. 17 (14.1)")),
  move("family:both:settlement-conference-scheduled", "family:both:offer-to-settle", "either", "A party may serve an offer to settle on any other party.", F("both:offer-to-settle", "r. 18 (3)-(10)")),
  move("family:both:trial-management-conference-scheduled", "family:both:trial-scheduled", "court", "The trial management conference sets the trial date, if that has not already been done.", F("both:trial-management-conference-scheduled", "r. 17 (6)")),
  move("family:both:trial-management-conference-scheduled", "family:both:missed-or-unconfirmed-conference", "either", "A conference is not held if it was not confirmed to the clerk, unless the court orders otherwise.", F("both:trial-management-conference-scheduled", "r. 17 (14.1)")),
  move("family:both:missed-or-unconfirmed-conference", "family:both:case-conference-scheduled", "you", "A party who asks for a conference serves and files a conference notice (Form 17).", F("applicant:answer-received", "r. 17 (4.1)")),
  move("family:both:missed-or-unconfirmed-conference", "family:both:notice-of-approaching-dismissal", "court", "If the case is not settled, withdrawn or scheduled for trial before the 365th day after it started, the clerk serves a notice of approaching dismissal.", F("both:missed-or-unconfirmed-conference", "r. 40 (5)")),

  // Disclosure, questioning, admissions, reports: the case then goes on to the settlement conference
  move("family:both:financial-disclosure-missing", "family:both:bringing-a-motion", "you", "If the information is not given within seven days, a motion can be made; the court may order the document served or filed and order costs.", F("both:financial-disclosure-missing", "r. 13 (11)"), F("both:financial-disclosure-missing", "r. 13 (17)")),
  move("family:both:document-disclosure-requested", "family:both:settlement-conference-scheduled", "you", "You give the affidavit listing documents within 10 days of the request; a case reaches trial only after a settlement conference.", F("both:document-disclosure-requested", "r. 19 (1)"), FAMILY_BEFORE_TRIAL()),
  move("family:both:served-with-request-to-admit", "family:both:settlement-conference-scheduled", "you", "Unless you serve a response (Form 22A) within 20 days, the fact or document is treated as admitted for the case; a case reaches trial only after a settlement conference.", F("both:served-with-request-to-admit", "r. 22 (4)"), FAMILY_BEFORE_TRIAL()),
  move("family:both:questioning", "family:both:settlement-conference-scheduled", "either", "The parties are served at least three days ahead with who is to be questioned, where and when; a case reaches trial only after a settlement conference.", F("both:questioning", "r. 20 (13)"), FAMILY_BEFORE_TRIAL()),
  move("family:both:childrens-lawyer-report", "family:both:settlement-conference-scheduled", "you", "Within 30 days after being served with the report, a party may serve and file a statement disputing anything in it; a case reaches trial only after a settlement conference.", F("both:childrens-lawyer-report", "r. 21 (e)"), FAMILY_BEFORE_TRIAL()),
  move("family:both:offer-to-settle", "family:both:trial-scheduled", "either", "If no offer is accepted, the case goes on; offers carry the costs consequences in rule 24.", F("both:offer-to-settle", "r. 18 (12.1)"), F("both:offer-to-settle", "r. 24 (12)")),
  move("family:both:case-in-wrong-municipality", "family:both:case-conference-scheduled", "court", "If the court transfers the case or a step, it goes on in the other municipality.", F("both:case-in-wrong-municipality", "r. 5 (8)")),
  move("family:both:notice-of-approaching-dismissal", "family:both:case-conference-scheduled", "you", "Within 60 days after the notice is served, a party takes one of the listed steps, such as getting an order lengthening the time; otherwise the case is dismissed without further notice.", F("both:notice-of-approaching-dismissal", "r. 40 (6)")),

  // Motions
  move("family:both:bringing-a-motion", "family:both:order-made-without-notice", "court", "A motion may be made without notice where notice is unnecessary or not reasonably possible, or in the other cases the rule lists, such as immediate danger to a child's or a party's health or safety.", F("both:bringing-a-motion", "r. 14 (12)")),
  move("family:both:bringing-a-motion", "family:both:settlement-conference-scheduled", "court", "You serve the motion papers at least six days before the motion date and file them at least four days before; the motion is heard and the case goes on to a settlement conference before any trial.", F("both:bringing-a-motion", "r. 14 (11) (a)-(c)"), FAMILY_BEFORE_TRIAL()),
  move("family:both:bringing-a-motion", "family:both:appealing-temporary-order", "either", "An appeal from a temporary order of the Ontario Court of Justice starts with a notice of appeal served within seven days of the order.", F("both:appealing-temporary-order", "r. 38 (6)")),
  move("family:both:responding-to-a-motion", "family:both:settlement-conference-scheduled", "you", "You serve and file your response not later than four days before the motion date; the motion is heard and the case goes on to a settlement conference before any trial.", F("both:responding-to-a-motion", "r. 14 (11.3)"), FAMILY_BEFORE_TRIAL()),
  move("family:both:responding-to-a-motion", "family:both:appealing-temporary-order", "either", "An appeal from a temporary order of the Ontario Court of Justice starts with a notice of appeal served within seven days of the order.", F("both:appealing-temporary-order", "r. 38 (6)")),
  move("family:both:order-made-without-notice", "family:both:bringing-a-motion", "court", "The order is served right away on everyone affected, and the matter comes back to court, if possible to the same judge, within 14 days or on a date the court chooses.", F("both:order-made-without-notice", "r. 14 (14)"), F("both:order-made-without-notice", "r. 14 (15)")),
  move("family:both:responding-to-summary-judgment", "family:both:final-order-made", "court", "You set out specific facts in an affidavit showing a genuine issue for trial; if there is none, the court makes a final order.", F("both:responding-to-summary-judgment", "r. 16 (4.1)"), F("both:responding-to-summary-judgment", "r. 16 (6)")),
  move("family:both:binding-judicial-dispute-resolution", "family:both:final-order-made", "court", "Once the court orders the hearing, consent can be withdrawn only with everyone's written consent or the court's permission; the hearing ends in the court's order.", F("both:binding-judicial-dispute-resolution", "r. 43 (12)")),

  // Changing a final order
  move("family:both:asking-to-change-final-order", "family:both:motion-to-change-response-time-missed", "time", "The other party has 30 days after receiving the motion to change to respond (60 outside Canada and the U.S.), and that time passes.", F("both:asking-to-change-final-order", "r. 15 (10)")),
  move("family:both:asking-to-change-final-order", "family:both:case-conference-scheduled", "court", "A judge holds at least one conference on a motion to change, unless it is on consent or unopposed.", F("both:asking-to-change-final-order", "r. 17 (3)"), F("respondent:answer-filed", "r. 17 (1)")),
  move("family:both:asking-to-change-final-order", "family:both:final-order-made", "court", "If the parties and any assignee agree to the change, they file a consent motion to change (Form 15C).", F("both:asking-to-change-final-order", "r. 15 (17)")),
  move("family:both:served-with-motion-to-change", "family:both:case-conference-scheduled", "you", "If you do not agree, you serve and file a response within 30 days after receiving the motion (60 outside Canada and the U.S.).", F("both:served-with-motion-to-change", "r. 15 (10)")),
  move("family:both:served-with-motion-to-change", "family:both:motion-to-change-response-time-missed", "time", "The 30 days (60 outside Canada and the U.S.) pass without a response or a returned consent.", F("both:served-with-motion-to-change", "r. 15 (10)"), F("both:served-with-motion-to-change", "r. 15 (14)")),
  move("family:both:motion-to-change-response-time-missed", "family:both:final-order-made", "court", "The party who made the motion may file a motion form (Form 14B) asking the court to make the order requested.", F("both:motion-to-change-response-time-missed", "r. 15 (15)")),
  move("family:both:motion-to-change-response-time-missed", "family:both:served-with-motion-to-change", "court", "The court may lengthen any time in the rules; the response is then served and filed.", F("respondent:answer-time-missed", "r. 3 (5)")),

  // Trial and after
  move("family:both:trial-scheduled", "family:both:final-order-made", "court", "The applicant serves and files a trial record at least 20 days before the trial; after the trial, the court's order is final, and an appeal from a final order of the Ontario Court of Justice starts within 30 days.", F("both:trial-scheduled", "r. 23 (1)"), F("both:final-order-made", "r. 38 (5)")),
  move("family:both:trial-scheduled", "family:both:offer-to-settle", "either", "A party may serve an offer to settle on any other party, up to when the court begins to give its decision.", F("both:offer-to-settle", "r. 18 (3)-(10)")),
  move("family:both:final-order-made", "family:both:served-with-notice-of-appeal", "other-side", "Another party starts an appeal by serving a notice of appeal (Form 38) within 30 days after the order.", F("both:final-order-made", "r. 38 (5)")),
  move("family:both:final-order-made", "family:both:support-order-not-paid", "other-side", "An order to pay can be enforced in the ways the rules list; a support order is filed with the Director's office.", F("both:support-order-not-paid", "r. 26 (3)"), F("both:support-order-not-paid", "s. 12 (1)")),
  move("family:both:final-order-made", "family:both:asking-to-change-final-order", "you", "A final order is changed by a motion to change.", F("both:asking-to-change-final-order", "r. 15 (2)")),
  move("family:both:final-order-made", "family:both:served-with-motion-to-change", "other-side", "Another party brings a motion to change the final order; a response is due within 30 days (60 outside Canada and the U.S.).", F("both:served-with-motion-to-change", "r. 15 (10)")),

  // Enforcement
  move("family:both:support-order-not-paid", "family:both:served-with-request-for-financial-statement", "either", "If a payment order is in default, the recipient may serve a request for a financial statement (Form 27).", F("both:served-with-request-for-financial-statement", "r. 27 (1)")),
  move("family:both:support-order-not-paid", "family:both:served-with-financial-examination-appointment", "either", "If a payment order is in default, the recipient may serve an appointment for a financial examination (Form 27C).", F("both:served-with-financial-examination-appointment", "r. 27 (11)")),
  move("family:both:support-order-not-paid", "family:both:served-with-notice-of-garnishment", "either", "A payment order may be enforced by garnishment; a payor or garnishee may dispute it within 10 days.", F("both:support-order-not-paid", "r. 26 (3)"), F("both:served-with-notice-of-garnishment", "r. 29 (16)")),
  move("family:both:support-order-not-paid", "family:both:served-with-notice-of-default-hearing", "either", "A support order may be enforced by a default hearing; the notice is served on the payor by special service.", F("both:support-order-not-paid", "r. 26 (3)"), F("both:served-with-notice-of-default-hearing", "r. 30 (2)")),
  move("family:both:support-order-not-paid", "family:both:served-with-contempt-motion", "either", "An order other than a payment order may be enforced by a contempt motion in the case where it was made.", F("both:served-with-contempt-motion", "r. 31 (1)")),
  move("family:both:support-order-not-paid", "family:both:served-with-licence-suspension-notice", "other-side", "When a support order filed with the Director is in default, the Director may serve a first notice that the payor's driver's licence may be suspended unless, within 30 days, the payor acts.", F("both:served-with-licence-suspension-notice", "s. 34")),
  move("family:both:served-with-licence-suspension-notice", "family:both:asking-to-change-final-order", "you", "A payor who makes a motion to change the support order may also ask the court, on notice to the Director, to order the Director not to suspend the licence.", F("both:served-with-licence-suspension-notice", "s. 35 (1)")),
];

export const STAGE_MOVES: StageMove[] = [...SMALL_CLAIMS_MOVES, ...LAW_MAP_MOVES, ...DISMISSAL_MOVES, ...CIVIL_MOVES, ...FAMILY_MOVES];

/** Steps where this chain stops, and why. Each is a real end, or the next move belongs to a part of the map not yet built. */
export const FINAL_STEPS: FinalStep[] = [
  { stage: "plaintiff:debtor-examination", why: "After the examination the court may make an order as to payment; the other ways to enforce (garnishment, writs) are in this step's card.", rules: [R_20_10_ORDER_AS_TO_PAYMENT, R_20_03_ENFORCEMENT] },
  { stage: "defendant:judgment-being-enforced", why: "The debtor may ask the court to stay enforcement or change the payments if their circumstances have changed; after an examination the court may make an order as to payment.", rules: [R_20_02_STAY_VARY, R_20_10_ORDER_AS_TO_PAYMENT] },
  { stage: "plaintiff:action-dismissed-for-delay", why: "If every party consents, the clerk can restore the action to the list (Form 11.2A); the case then picks up where it was.", rules: [R_11_2_01_RESTORE_ON_CONSENT] },
  { stage: "plaintiff:wants-to-discontinue", why: "The claim ends against the defendants it is discontinued against; a discontinuance is not a defence to a later action on the matter, unless an order granting leave says otherwise.", rules: [R_11_3_02_EFFECT] },
  { stage: "plaintiff:court-considering-dismissal", why: "The court decides on the written submissions; if the plaintiff files none within 20 days, it can make the order without further notice.", rules: [R_12_02_SUBMISSION] },
  { stage: "civil:both:appeal-in-progress", why: "The appeal is perfected and decided by the appellate court; the appellate steps are this step's own deadlines.", rules: [stepRule("civil:both:appeal-in-progress", "r. 61.09 (1)")] },
  { stage: "civil:plaintiff:judgment-unpaid", why: "The judgment is enforced from here; a writ of seizure and sale lasts six years and can be renewed.", rules: [stepRule("civil:plaintiff:judgment-unpaid", "r. 60.07 (6)")] },
  { stage: "civil:defendant:judgment-being-enforced", why: "Delivering a notice of appeal stays the payment of money under the order (except support) until the appeal is decided.", rules: [stepRule("civil:defendant:judgment-being-enforced", "r. 63.01 (1)")] },
  { stage: "civil:plaintiff:wants-to-discontinue", why: "The action ends for the parties it is discontinued against; any party may move about costs within 30 days.", rules: [stepRule("civil:plaintiff:wants-to-discontinue", "r. 23.05 (1)")] },
  { stage: "family:both:appealing-temporary-order", why: "The appeal is decided by the Superior Court of Justice; the appeal's own steps are this step's deadlines.", rules: [stepRule("family:both:appealing-temporary-order", "r. 38 (6)")] },
  { stage: "family:both:served-with-notice-of-appeal", why: "The appeal is decided by the appellate court; serving a notice of appeal does not stay a support order.", rules: [stepRule("family:both:served-with-notice-of-appeal", "r. 38 (21)"), stepRule("family:both:served-with-notice-of-appeal", "r. 38 (33)")] },
  { stage: "family:both:served-with-request-for-financial-statement", why: "The payor sends a completed financial statement within 15 days; enforcement goes on from the support order.", rules: [stepRule("family:both:served-with-request-for-financial-statement", "r. 27 (2)")] },
  { stage: "family:both:served-with-financial-examination-appointment", why: "The financial examination is held where the parties agree, where the payor lives in Ontario, or where the court chooses.", rules: [stepRule("family:both:served-with-financial-examination-appointment", "r. 27 (13)")] },
  { stage: "family:both:served-with-notice-of-garnishment", why: "A dispute goes to a garnishment hearing, which the clerk issues on request.", rules: [stepRule("family:both:served-with-notice-of-garnishment", "r. 29 (17)")] },
  { stage: "family:both:served-with-notice-of-default-hearing", why: "At the default hearing the court may decide and enforce the amount owing.", rules: [stepRule("family:both:served-with-notice-of-default-hearing", "r. 30 (7)")] },
  { stage: "family:both:served-with-contempt-motion", why: "The motion is decided by the court; the rule lists the orders it may make if it finds contempt.", rules: [stepRule("family:both:served-with-contempt-motion", "r. 31 (5)")] },
  { stage: "family:both:withdrawing-a-claim", why: "The withdrawn part ends; the party who withdraws pays the other parties' costs of it to that date, unless the court orders or the parties agree otherwise.", rules: [stepRule("family:both:withdrawing-a-claim", "r. 12 (3)")] },
  { stage: "family:both:notice-case-may-be-stayed-or-dismissed", why: "The court decides after the written submissions the rule allows, filed within 15 days of the notice.", rules: [stepRule("family:both:notice-case-may-be-stayed-or-dismissed", "r. 1.4 (7)")] },
];

/**
 * Steps a case can be found in with no move leading there: where a case
 * starts, and positions people arrive at from outside the chain. Each says why.
 */
export const STARTING_POINTS: { stage: string; why: string }[] = [
  { stage: "before-filing:deciding-whether-to-sue", why: "Where a person who may sue starts." },
  { stage: "defendant:served-defence-period-running", why: "Where a person who has been sued starts: the plaintiff's claim was served on them." },
  { stage: "both:filed-in-wrong-place", why: "Found when a case turns out to have been started in the wrong place; no step in the chain leads there on purpose." },
  { stage: "civil:before-filing:deciding-whether-to-sue", why: "Where a person who may sue in the Superior Court starts." },
  { stage: "civil:defendant:served-defence-period-running", why: "Where a person sued in the Superior Court starts: the statement of claim was served on them." },
  { stage: "civil:defendant:served-with-third-party-claim", why: "A person brought into an action by a third party claim starts here." },
  { stage: "civil:defendant:served-with-counterclaim-as-new-party", why: "A person not yet a party, brought in by a counterclaim, starts here." },
  { stage: "civil:both:lawyer-removed-from-record", why: "Can happen at any point in an action; no step leads there on purpose." },
  { stage: "family:before-filing:deciding-where-to-start", why: "Where a person starting a family case begins." },
  { stage: "family:respondent:served-time-to-answer-running", why: "Where a person served with a family application starts." },
  { stage: "family:both:served-with-motion-to-change", why: "A person served with a motion to change a final order starts here, often years after the case ended." },
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
export const SEQUENCED_PATHWAYS = ["small-claims", "civil", "family"] as const;

export function isSequenced(stage: CaseStage): boolean {
  return (SEQUENCED_PATHWAYS as readonly string[]).includes(stage.pathway ?? "small-claims");
}
