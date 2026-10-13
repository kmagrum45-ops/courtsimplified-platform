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
];

export const STAGE_MOVES: StageMove[] = [...SMALL_CLAIMS_MOVES, ...LAW_MAP_MOVES, ...DISMISSAL_MOVES, ...CIVIL_MOVES];

/** Steps where this chain stops, and why. Each is a real end, or the next move belongs to a part of the map not yet built. */
export const FINAL_STEPS: FinalStep[] = [
  { stage: "plaintiff:debtor-examination", why: "After the examination the court may make an order as to payment; the other ways to enforce (garnishment, writs) are in this step's card.", rules: [R_20_10_ORDER_AS_TO_PAYMENT, R_20_03_ENFORCEMENT] },
  { stage: "defendant:judgment-being-enforced", why: "The debtor may ask the court to stay enforcement or change the payments if their circumstances have changed; after an examination the court may make an order as to payment.", rules: [R_20_02_STAY_VARY, R_20_10_ORDER_AS_TO_PAYMENT] },
  { stage: "plaintiff:action-dismissed-for-delay", why: "If every party consents, the clerk can restore the action to the list (Form 11.2A); the case then picks up where it was.", rules: [R_11_2_01_RESTORE_ON_CONSENT] },
  { stage: "civil:both:appeal-in-progress", why: "The appeal is perfected and decided by the appellate court; the appellate steps are this step's own deadlines.", rules: [stepRule("civil:both:appeal-in-progress", "r. 61.09 (1)")] },
  { stage: "civil:plaintiff:judgment-unpaid", why: "The judgment is enforced from here; a writ of seizure and sale lasts six years and can be renewed.", rules: [stepRule("civil:plaintiff:judgment-unpaid", "r. 60.07 (6)")] },
  { stage: "civil:defendant:judgment-being-enforced", why: "Delivering a notice of appeal stays the payment of money under the order (except support) until the appeal is decided.", rules: [stepRule("civil:defendant:judgment-being-enforced", "r. 63.01 (1)")] },
  { stage: "civil:plaintiff:wants-to-discontinue", why: "The action ends for the parties it is discontinued against; any party may move about costs within 30 days.", rules: [stepRule("civil:plaintiff:wants-to-discontinue", "r. 23.05 (1)")] },
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
export const SEQUENCED_PATHWAYS = ["small-claims", "civil"] as const;

export function isSequenced(stage: CaseStage): boolean {
  return (SEQUENCED_PATHWAYS as readonly string[]).includes(stage.pathway ?? "small-claims");
}
