/**
 * Superior Court of Justice civil actions — the stage map for the civil pathway.
 *
 * Same shape and same rules as the Small Claims map (stageMap.ts): every rule
 * is a verbatim quote that verifyStageMap reads back out of the corpus, every
 * deadline carries its counting provision and its exceptions, and nothing here
 * is a summary of a rule.
 *
 * *** READ AGAINST THE SEPTEMBER 1, 2026 CONSOLIDATION ***
 *
 * Every Rules of Civil Procedure quote below was copied from
 * docs/sources/corpus/rules-of-civil-procedure.txt, whose header reads
 * "CONSOLIDATION PERIOD: FROM SEPTEMBER 1, 2026". SOURCING_NOTES says anything
 * recorded about Superior Court procedure from an earlier reading must be
 * re-checked, so nothing here was carried over from memory of the old rules.
 *
 * *** THINGS THAT LOOK LIKE DEADLINES AND ARE NOT ***
 *
 * - Setting aside a noting of default (r. 19.03) or a default judgment
 *   (r. 19.08) has NO time limit in the Rules of Civil Procedure. The Small
 *   Claims rule (r. 11.06, "as soon as is reasonably possible") is a different
 *   court's rule and must not be borrowed. Those stages carry no deadline.
 * - The affidavit of documents (r. 30.03) has no fixed time in the ordinary
 *   procedure. The 10 days after close of pleadings is r. 76.03 and applies
 *   ONLY to simplified procedure actions.
 * - Mandatory mediation (Rule 24.1) applies only to the actions r. 24.1.04
 *   lists — in practice those started in Ottawa, Toronto or Essex County — so
 *   its 180 days always carries that condition.
 * - r. 24.01 (1) is a DEFENDANT'S power to move to dismiss; it is not an
 *   automatic dismissal and is worded that way wherever it appears.
 * - r. 37.14 (1) requires a set-aside motion "forthwith after the order comes
 *   to the person's attention". No event in deadlineEvents.ts is "the day the
 *   order came to your attention" (order-made is the day it was MADE), so it
 *   is cited as a rule and not modelled as a deadline rather than joined to the
 *   wrong date.
 */
import type { CaseStage, StageDeadline } from "./stageMap";
import type { RuleCitation } from "./citations";
import * as C from "./citations";

const rcp = (pinpoint: string, quote: string): RuleCitation => ({
  sourceId: "rules-of-civil-procedure",
  pinpoint,
  quote,
});

const cja = (pinpoint: string, quote: string): RuleCitation => ({
  sourceId: "cja-courts-of-justice-act",
  pinpoint,
  quote,
});

// ------------------------------------------------------------ counting time

/** Days between two events, "at least" included, and the next-day rule for holidays. */
const RCP_3_01_COUNT = rcp(
  "r. 3.01 (1) (a), (c)",
  "(a) where there is a reference to a number of days between two events, they shall be counted by excluding the day on which the first event happens and including the day on which the second event happens, even if they are described as clear days or the words \"at least\" are used; ... (c) where the time for doing an act expires on a holiday, the act may be done on the next day that is not a holiday;",
);

/** Periods of seven days or less: holidays (which include Saturdays and Sundays) are not counted. */
const RCP_3_01_SHORT = rcp(
  "r. 3.01 (1) (a), (b)",
  "(a) where there is a reference to a number of days between two events, they shall be counted by excluding the day on which the first event happens and including the day on which the second event happens, even if they are described as clear days or the words \"at least\" are used; (b) where a period of seven days or less is prescribed, holidays shall not be counted;",
);

const RCP_1_03_HOLIDAY = rcp(
  "r. 1.03 (1)",
  "\"holiday\" means, (a) any Saturday or Sunday, (b) New Year's Day, (b.1) Family Day, (c) Good Friday, (d) Easter Monday, (e) Victoria Day, (f) Canada Day, (g) Civic Holiday, (h) Labour Day, (i) Thanksgiving Day, (j) Remembrance Day, (k) Christmas Day, (l) Boxing Day, and (m) any special holiday proclaimed by the Governor General or the Lieutenant Governor,",
);

const RCP_1_03_DELIVER = rcp(
  "r. 1.03 (1)",
  "\"deliver\" means serve and file with proof of service, and \"delivery\" has a corresponding meaning;",
);

const RCP_3_02_EXTEND = rcp(
  "r. 3.02 (1)",
  "Subject to subrule (3), the court may by order extend or abridge any time prescribed by these rules or an order, on such terms as are just.",
);

const RCP_3_02_BEFORE_OR_AFTER = rcp(
  "r. 3.02 (2)",
  "A motion for an order extending time may be made before or after the expiration of the time prescribed.",
);

const RCP_3_02_APPEALS = rcp(
  "r. 3.02 (3)",
  "An order under subrule (1) extending or abridging a time prescribed by these rules and relating to an appeal to an appellate court may be made only by a judge of the appellate court.",
);

const RCP_3_02_CONSENT = rcp(
  "r. 3.02 (4)",
  "A time prescribed by these rules for serving, filing or delivering a document may be extended or abridged by filing a consent.",
);

// --------------------------------------------------------------- which court

const S_CJA_23_SMALL_CLAIMS = cja(
  "s. 23 (1)",
  "The Small Claims Court, (a) has jurisdiction in any action for the payment of money where the amount claimed does not exceed the prescribed amount exclusive of interest and costs; and (b) has jurisdiction in any action for the recovery of possession of personal property where the value of the property does not exceed the prescribed amount.",
);

const S_CJA_23_LEAVE = cja(
  "s. 23 (1.1)",
  "An action that is within the Small Claims Court's jurisdiction shall not, despite subsection 11 (2), be commenced in the Superior Court of Justice except with leave of the Superior Court of Justice as provided in the rules of court.",
);

const RCP_14_01_1_LEAVE_TEST = rcp(
  "r. 14.01.1 (3)",
  "The court may grant leave under subsection 23 (1.1) of the Courts of Justice Act only if it is in the interest of justice.",
);

const S_LIMITATIONS_5_PRESUMPTION: RuleCitation = {
  sourceId: "limitations-act-2002",
  pinpoint: "s. 5 (2)",
  quote:
    "A person with a claim shall be presumed to have known of the matters referred to in clause (1) (a) on the day the act or omission on which the claim is based took place, unless the contrary is proved.",
};

const S_LIMITATIONS_15_ULTIMATE: RuleCitation = {
  sourceId: "limitations-act-2002",
  pinpoint: "s. 15 (2)",
  quote:
    "No proceeding shall be commenced in respect of any claim after the 15th anniversary of the day on which the act or omission on which the claim is based took place.",
};

// ------------------------------------------------------ starting the action

const RCP_14_03_STATEMENT_OF_CLAIM = rcp(
  "r. 14.03 (1)",
  "The originating process for the commencement of an action is a statement of claim (Form 14A (general) or 14B (mortgage actions)), except as provided by,",
);

const RCP_14_03_NOTICE_OF_ACTION = rcp(
  "r. 14.03 (2)",
  "Where there is insufficient time to prepare a statement of claim, an action may be commenced by the issuing of a notice of action (Form 14C) that contains a short statement of the nature of the claim.",
);

const RCP_14_03_THIRTY_DAYS = rcp(
  "r. 14.03 (3)",
  "Where a notice of action is used, the plaintiff shall file a statement of claim (Form 14D) within thirty days after the notice of action is issued, and no statement of claim shall be filed thereafter except with the written consent of the defendant or with leave of the court obtained on notice to the defendant.",
);

const RCP_14_07_ISSUED = rcp(
  "r. 14.07 (1)",
  "An originating process is issued by the registrar's act of dating, signing and sealing it with the seal of the court and assigning to it a court file number.",
);

const RCP_14_08_SIX_MONTHS = rcp(
  "r. 14.08 (1)",
  "Where an action is commenced by a statement of claim, the statement of claim shall be served within six months after it is issued.",
);

const RCP_14_08_NOTICE_OF_ACTION = rcp(
  "r. 14.08 (2)",
  "Where an action is commenced by a notice of action, the notice of action and the statement of claim shall be served together within six months after the notice of action is issued.",
);

const RCP_76_02_MANDATORY = rcp(
  "r. 76.02 (1)",
  "The procedure set out in this Rule shall be used in an action if the following conditions are satisfied: 1. The plaintiff's claim is exclusively for one or more of the following: i. Money. ii. Real property. iii. Personal property. 2. The total of the following amounts is $200,000 or less exclusive of interest and costs: i. The amount of money claimed, if any. ii. The fair market value of any real property and of any personal property, as at the date the action is commenced.",
);

const RCP_76_02_SAY_SO = rcp(
  "r. 76.02 (4)",
  "The statement of claim (Form 14A, 14B or 14D) or notice of action (Form 14C) shall indicate that the action is being brought under this Rule.",
);

// ----------------------------------------------------------------- service

const RCP_16_01_MANNER = rcp(
  "r. 16.01 (1)",
  "An originating process shall be served personally as provided in rule 16.02 or by an alternative to personal service as provided in rule 16.03.",
);

const RCP_16_02_INDIVIDUAL = rcp(
  "r. 16.02 (1) (a)",
  "(a) on an individual, other than a person under disability, by leaving a copy of the document with the individual;",
);

const RCP_16_03_MAIL_CARD = rcp(
  "r. 16.03 (4)",
  "Service of a document may be made by sending a copy of the document together with an acknowledgment of receipt card (Form 16A) by mail to the last known address of the person to be served, but service by mail under this subrule is only effective as of the date the sender receives the card.",
);

const RCP_16_03_RESIDENCE = rcp(
  "r. 16.03 (5)",
  "Where an attempt is made to effect personal service at a person's place of residence and for any reason personal service cannot be effected, the document may be served by, (a) leaving a copy, in a sealed envelope addressed to the person, at the place of residence with anyone who appears to be an adult member of the same household; and (b) on the same day or the following day mailing another copy of the document to the person at the place of residence, and service in this manner is effective on the fifth day after the document is mailed.",
);

const RCP_16_04_SUBSTITUTED = rcp(
  "r. 16.04 (1)",
  "Where it appears to the court that it is impractical for any reason to effect prompt service of an originating process or any other document required to be served personally or by an alternative to personal service under these rules, the court may make an order for substituted service or, where necessary in the interest of justice, may dispense with service.",
);

const RCP_16_04_EFFECTIVE = rcp(
  "r. 16.04 (2)",
  "In an order for substituted service, the court shall specify when service in accordance with the order is effective.",
);

// ------------------------------------------------------------- the defence

const RCP_18_01_DEFENCE = rcp(
  "r. 18.01",
  "a statement of defence (Form 18A) shall be delivered, (a) within twenty days after service of the statement of claim, where the defendant is served in Ontario; (b) within forty days after service of the statement of claim, where the defendant is served elsewhere in Canada or in the United States of America; or (c) within sixty days after service of the statement of claim, where the defendant is served anywhere else.",
);

const RCP_18_02_INTENT = rcp(
  "r. 18.02 (1)",
  "A defendant who is served with a statement of claim and intends to defend the action may deliver a notice of intent to defend (Form 18B) within the time prescribed for delivery of a statement of defence.",
);

const RCP_18_02_TEN_MORE = rcp(
  "r. 18.02 (2)",
  "A defendant who delivers a notice of intent to defend within the prescribed time is entitled to ten days, in addition to the time prescribed by rule 18.01, within which to deliver a statement of defence.",
);

const RCP_27_01_COUNTERCLAIM = rcp(
  "r. 27.01 (1)",
  "A defendant may assert, by way of counterclaim in the main action, any right or claim against the plaintiff including a claim for contribution or indemnity under the Negligence Act in respect of another party's claim against the defendant.",
);

const RCP_27_04_COUNTERCLAIM_TIME = rcp(
  "r. 27.04 (1)",
  "Where a counterclaim is only against the plaintiff, or only against the plaintiff and another person who is already a party to the main action, the statement of defence and counterclaim shall be delivered within the time prescribed by rule 18.01 for the delivery of the statement of defence in the main action, or at any time before the defendant is noted in default.",
);

const RCP_27_05_DEFENCE_TO_COUNTERCLAIM = rcp(
  "r. 27.05 (1)",
  "The plaintiff and any other defendant to a counterclaim who is already a party to the main action shall deliver a defence to counterclaim (Form 27C) within twenty days after service of the statement of defence and counterclaim.",
);

const RCP_27_05_COMBINED = rcp(
  "r. 27.05 (2)",
  "Where the plaintiff delivers a reply in the main action, the defence to counterclaim shall be included in the same document as the reply and the document shall be entitled a reply and defence to counterclaim.",
);

const RCP_25_04_REPLY = rcp(
  "r. 25.04 (3)",
  "A reply, if any, shall be delivered within ten days after service of the statement of defence except where the defendant counterclaims, in which case a reply and defence to counterclaim, if any, shall be delivered within twenty days after service of the statement of defence and counterclaim.",
);

const RCP_25_05_CLOSE = rcp(
  "r. 25.05",
  "Pleadings in an action are closed when, (a) the plaintiff has delivered a reply to every defence in the action or the time for delivery of a reply has expired; and (b) every defendant who is in default in delivering a defence in the action has been noted in default.",
);

// ---------------------------------------------------------------- default

const RCP_19_01_NOTING = rcp(
  "r. 19.01 (1)",
  "Where a defendant fails to deliver a statement of defence within the prescribed time, the plaintiff may, on filing proof of service of the statement of claim, or of deemed service under subrule 16.01 (2), require the registrar to note the defendant in default.",
);

const RCP_19_01_LATE_DEFENCE = rcp(
  "r. 19.01 (5)",
  "A defendant may deliver a statement of defence at any time before being noted in default under this rule.",
);

const RCP_19_02_CONSEQUENCES = rcp(
  "r. 19.02 (1)",
  "A defendant who has been noted in default, (a) is deemed to admit the truth of all allegations of fact made in the statement of claim; and (b) shall not deliver a statement of defence or take any other step in the action, other than a motion to set aside the noting of default or any judgment obtained by reason of the default, except with leave of the court or the consent of the plaintiff.",
);

const RCP_19_02_NO_NOTICE = rcp(
  "r. 19.02 (3)",
  "Despite any other rule, a defendant who has been noted in default is not entitled to notice of any step in the action and need not be served with any document in the action, except where the court orders otherwise or where a party requires the personal attendance of the defendant,",
);

const RCP_19_03_SET_ASIDE_NOTING = rcp(
  "r. 19.03 (1)",
  "The noting of default may be set aside by the court on such terms as are just.",
);

const RCP_19_03_CONSENT = rcp(
  "r. 19.03 (2)",
  "Where a defendant delivers a statement of defence with the consent of the plaintiff under clause 19.02 (1) (b), the noting of default against the defendant shall be deemed to have been set aside.",
);

const RCP_19_04_SIGNED_JUDGMENT = rcp(
  "r. 19.04 (1)",
  "Where a defendant has been noted in default, the plaintiff may require the registrar to sign judgment against the defendant in respect of a claim for, (a) a debt or liquidated demand in money, including interest if claimed in the statement of claim (Form 19A); (b) the recovery of possession of land (Form 19B); (c) the recovery of possession of personal property (Form 19C); or (d) foreclosure, sale or redemption of a mortgage (Forms 64B to 64D, 64G to 64K and 64M).",
);

const RCP_19_04_DECLINED = rcp(
  "r. 19.04 (3.1)",
  "If the registrar declines to sign default judgment, the plaintiff may, (a) move before a judge for judgment under rule 19.05; or (b) in the case of a claim referred to in subrule (1), make a motion to the court for default judgment.",
);

const RCP_19_05_MOTION = rcp(
  "r. 19.05 (1)",
  "Where a defendant has been noted in default, the plaintiff may move before a judge for judgment against the defendant on the statement of claim in respect of any claim for which default judgment has not been signed.",
);

const RCP_19_05_AFFIDAVIT = rcp(
  "r. 19.05 (2)",
  "A motion for judgment under subrule (1) shall be supported by evidence given by affidavit if the claim is for unliquidated damages.",
);

const RCP_19_06_FACTS = rcp(
  "r. 19.06",
  "A plaintiff is not entitled to judgment on a motion for judgment or at trial merely because the facts alleged in the statement of claim are deemed to be admitted, unless the facts entitle the plaintiff to judgment.",
);

const RCP_19_08_SET_ASIDE_SIGNED = rcp(
  "r. 19.08 (1)",
  "A judgment against a defendant who has been noted in default that is signed by the registrar or granted by the court on motion under rule 19.04 may be set aside or varied by the court on such terms as are just.",
);

const RCP_19_08_SET_ASIDE_JUDGE = rcp(
  "r. 19.08 (2)",
  "A judgment against a defendant who has been noted in default that is obtained on a motion for judgment on the statement of claim under rule 19.05 or that is obtained after trial may be set aside or varied by a judge on such terms as are just.",
);

const RCP_19_08_NOTING_TOO = rcp(
  "r. 19.08 (3)",
  "On setting aside a judgment under subrule (1) or (2) the court or judge may also set aside the noting of default under rule 19.03.",
);

const RCP_19_09_COUNTERCLAIMS = rcp(
  "r. 19.09",
  "Rules 19.01 to 19.08 apply, with necessary modifications, to counterclaims, crossclaims and third party claims,",
);

// ------------------------------------------------------------------- delay

const RCP_24_01_DEFENDANT_MAY_MOVE = rcp(
  "r. 24.01 (1)",
  "A defendant who is not in default under these rules or an order of the court may move to have an action dismissed for delay where the plaintiff has failed, (a) to serve the statement of claim on all the defendants within the prescribed time; (b) to have noted in default any defendant who has failed to deliver a statement of defence, within thirty days after the default; (c) to set the action down for trial within six months after the close of pleadings;",
);

const RCP_48_14_FIVE_YEARS = rcp(
  "r. 48.14 (1)",
  "Unless the court orders otherwise, the registrar shall dismiss an action for delay in either of the following circumstances, subject to subrules (4) to (8): 1. The action has not been set down for trial or terminated by any means by the fifth anniversary of the commencement of the action. 2. The action was struck off a trial list and has not been restored to a trial list or otherwise terminated by any means by the second anniversary of being struck off.",
);

const RCP_48_14_EXCLUDED = rcp(
  "r. 48.14 (1.1)",
  "Subrule (1) does not apply to, (a) actions placed on the Commercial List established by practice direction in the Toronto Region; and (b) actions under the Class Proceedings Act, 1992.",
);

const RCP_48_14_SERVED = rcp(
  "r. 48.14 (2)",
  "The registrar shall serve an order made under subrule (1) on the parties.",
);

const RCP_48_14_TIMETABLE = rcp(
  "r. 48.14 (4)",
  "Subrule (1) does not apply if, at least 30 days before the expiry of the applicable period referred to in that subrule, a party files the following documents: 1. A timetable, signed by all the parties, that, i. identifies the steps to be completed before the action may be set down for trial or restored to a trial list, as the case may be, ii. shows the date or dates by which the steps will be completed, and iii. shows a date, which shall be no more than two years after the day the applicable period referred to in subrule (1) expires, before which the action shall be set down for trial or restored to a trial list. 2. A draft order establishing the timetable.",
);

const RCP_48_14_STATUS_HEARING = rcp(
  "r. 48.14 (5)",
  "If the parties do not consent to a timetable under subrule (4), any party may, before the expiry of the applicable period referred to in subrule (1), bring a motion for a status hearing.",
);

const RCP_48_14_DISABILITY = rcp(
  "r. 48.14 (8)",
  "Subrule (1) does not apply if, at the time the registrar would otherwise be required under that subrule to dismiss an action for delay, the plaintiff is under a disability.",
);

const RCP_48_14_SET_ASIDE = rcp(
  "r. 48.14 (10)",
  "The dismissal of an action under subrule (1) may be set aside under rule 37.14.",
);

// ---------------------------------------------------------- mediation (24.1)

const RCP_24_1_04_WHERE = rcp(
  "r. 24.1.04 (1)",
  "This Rule applies to the following actions: 1. Actions that were governed by this Rule immediately before January 1, 2010. 2. Actions that are commenced in one of the following counties on or after January 1, 2010: i. The City of Ottawa. ii. The City of Toronto. iii. The County of Essex. 3. Actions that are transferred to a county listed in paragraph 2 on or after January 1, 2014, unless the court orders otherwise.",
);

const RCP_24_1_04_NOT = rcp(
  "r. 24.1.04 (2)",
  "Despite subrule (1), this Rule does not apply to, (a) actions to which Rule 75.1 (Mandatory Mediation - Estates, Trusts and Substitute Decisions) applies; ... (c) actions placed on the Commercial List established by practice direction in the Toronto Region; (d) actions under Rule 64 (Mortgage Actions);",
);

const RCP_24_1_05_EXEMPT = rcp(
  "r. 24.1.05",
  "The court may make an order on a party's motion exempting the action from this Rule.",
);

const RCP_24_1_09_180_DAYS = rcp(
  "r. 24.1.09 (1)",
  "A mediation session shall take place within 180 days after the first defence has been filed, unless the court orders otherwise.",
);

const RCP_24_1_09_POSTPONE = rcp(
  "r. 24.1.09 (3)",
  "Despite subrule (1) and clause (2.1) (b), the mediation session may be postponed to a later date if, (a) the parties consent to the date in writing; and (b) the consent is filed with the mediation co-ordinator.",
);

const RCP_24_1_10_STATEMENT = rcp(
  "r. 24.1.10 (1)",
  "At least seven days before the mediation session, every party shall prepare a statement in Form 24.1C and provide a copy to every other party and to the mediator.",
);

const RCP_24_1_11_ATTEND = rcp(
  "r. 24.1.11 (1)",
  "The parties, and their lawyers if the parties are represented, are required to attend the mediation session unless the court orders otherwise.",
);

const RCP_24_1_12_FAIL = rcp(
  "r. 24.1.12",
  "If it is not practical to conduct a scheduled mediation session because a party fails to attend within the first 30 minutes of the time appointed for the commencement of the session, the mediator shall cancel the session and immediately file with the mediation co-ordinator a certificate of non-compliance (Form 24.1D).",
);

const RCP_24_1_13_POWERS = rcp(
  "r. 24.1.13 (2)",
  "The judge or associate judge may convene a case conference under rule 50.13, and may, (a) establish a timetable for the action; (b) strike out any document filed by a party; (c) dismiss the action, if the non-complying party is a plaintiff, or strike out the statement of defence, if that party is a defendant; (d) order a party to pay costs; (e) make any other order that is just.",
);

// --------------------------------------------------------------- discovery

const RCP_29_1_03_PLAN = rcp(
  "r. 29.1.03 (1)",
  "Where a party to an action intends to obtain evidence under any of the following Rules, the parties to the action shall agree to a discovery plan in accordance with this rule: 1. Rule 30 (Discovery of Documents). 2. Rule 31 (Examination for Discovery). 3. Rule 32 (Inspection of Property). 4. Rule 33 (Medical Examination). 5. Rule 35 (Examination for Discovery by Written Questions).",
);

const RCP_29_1_03_TIMING = rcp(
  "r. 29.1.03 (2)",
  "The discovery plan shall be agreed to before the earlier of, (a) 60 days after the close of pleadings or such longer period as the parties may agree to; and (b) attempting to obtain the evidence.",
);

const RCP_30_03_AFFIDAVIT = rcp(
  "r. 30.03 (1)",
  "A party to an action shall serve on every other party an affidavit of documents (Form 30A or 30B) disclosing to the full extent of the party's knowledge, information and belief all documents relevant to any matter in issue in the action that are or have been in the party's possession, control or power.",
);

const RCP_31_05_1_SEVEN_HOURS = rcp(
  "r. 31.05.1 (1)",
  "No party shall, in conducting oral examinations for discovery, exceed a total of seven hours of examination, regardless of the number of parties or other persons to be examined, except with the consent of the parties or with leave of the court.",
);

// ------------------------------------------------------ simplified procedure

const RCP_76_03_AFFIDAVIT = rcp(
  "r. 76.03 (1)",
  "A party to an action under this Rule shall, within 10 days after the close of pleadings and at the party's own expense, serve on every other party, (a) an affidavit of documents (Form 30A or 30B) disclosing to the full extent of the party's knowledge, information and belief all documents relevant to any matter in issue in the action that are or have been in the party's possession, control or power; and (b) copies of the documents referred to in Schedule A of the affidavit of documents.",
);

const RCP_76_03_WITNESSES = rcp(
  "r. 76.03 (2)",
  "The affidavit of documents shall include a list of the names and addresses of persons who might reasonably be expected to have knowledge of matters in issue in the action, unless the court orders otherwise.",
);

const RCP_76_03_NOT_DISCLOSED = rcp(
  "r. 76.03 (3)",
  "At the trial of the action, a party may not call as a witness a person whose name has not been disclosed in the party's affidavit of documents or any supplementary affidavit of documents, unless the court orders otherwise.",
);

const RCP_76_04_THREE_HOURS = rcp(
  "r. 76.04 (2)",
  "Despite rule 31.05.1 (time limit on discovery), no party shall, in conducting oral examinations for discovery in relation to an action proceeding under this Rule, exceed a total of three hours of examination, regardless of the number of parties or other persons to be examined.",
);

const RCP_76_08_SETTLEMENT_DISCUSSION = rcp(
  "r. 76.08",
  "Within 60 days after the filing of the first statement of defence or notice of intent to defend, the parties shall, in a meeting or telephone call, consider whether, (a) all documents relevant to any matter in issue have been disclosed; and (b) settlement of any or all issues is possible.",
);

const RCP_76_09_SET_DOWN = rcp(
  "r. 76.09 (1)",
  "Despite rule 48.02 (how action set down for trial), the plaintiff shall, within 180 days after the first statement of defence or notice of intent to defend is filed, set the action down for trial by serving a notice of readiness for pre-trial conference (Form 76C) on every party to the action and any counterclaim, crossclaim or third party claim and forthwith filing the notice with proof of service.",
);

const RCP_76_09_ANY_PARTY = rcp("r. 76.09 (2)", "If the plaintiff does not act under subrule (1), any other party may do so.");

const RCP_76_09_CERTIFY = rcp(
  "r. 76.09 (3)",
  "The party who sets the action down for trial shall certify in the notice of readiness for pre-trial conference that there was a settlement discussion.",
);

const RCP_76_10_DOCUMENTS = rcp(
  "r. 76.10 (4)",
  "Despite rule 50.04 (pre-trial conference brief), at least five days before the pre-trial conference, each party shall, (a) file, (0.i) a copy of the parties' proposed trial management plan, (i) a copy of the party's affidavit of documents and copies of the documents relied on for the party's claim or defence, (ii) a copy of any expert affidavit, other than a supplementary expert affidavit, and (iii) any other material necessary for the conference; and (b) deliver, (i) a statement, not exceeding three pages, setting out the issues and the party's position with respect to them, (ii) a trial management checklist (Form 76D),",
);

const RCP_76_11_TRIAL_RECORD = rcp(
  "r. 76.11 (2)",
  "At least 10 days before the date fixed for trial, the party who set the action down for trial shall serve a trial record on every party to the action and any counterclaim, crossclaim or third party claim, and file the record with proof of service.",
);

// --------------------------------------------------------- setting down

const RCP_48_01_WHO = rcp(
  "r. 48.01",
  "After the close of pleadings, any party to an action or to a counterclaim or crossclaim in the action who is not in default under these rules or an order of the court and who is ready for trial may set the action down for trial, together with any counterclaim or crossclaim.",
);

const RCP_48_02_HOW = rcp(
  "r. 48.02 (1)",
  "Where an action is defended, a party who wishes to set it down for trial may do so by serving a trial record prepared in accordance with rule 48.03 on every party to the action or to a counterclaim or crossclaim in the action and on any third or subsequent party and forthwith filing the trial record with proof of service.",
);

const RCP_48_04_NO_MORE_DISCOVERY = rcp(
  "r. 48.04 (1)",
  "Subject to subrule (3), a party who has set an action down for trial shall not initiate or continue any motion or form of discovery without leave of the court.",
);

const RCP_24_1_09_NOTICE_BEFORE_SET_DOWN = rcp(
  "r. 24.1.09 (5)",
  "Before setting the action down for trial, one of the parties shall file with the mediation co-ordinator, (a) a notice (Form 24.1A) stating the mediator's name and the date of the mediation session; or (b) a mediator's report under subrule 24.1.15 (1) indicating that the mediation has been concluded.",
);

const RCP_48_07_READY = rcp(
  "r. 48.07",
  "Where an action is placed on a trial list, (a) all parties shall be deemed to be ready for trial; and",
);

// --------------------------------------------------------------- pretrial

const RCP_50_02_SCHEDULE = rcp(
  "r. 50.02 (1)",
  "Unless the court orders otherwise, within 180 days after an action is set down for trial, the parties shall schedule with the registrar a date and time acceptable to all parties and consistent with the requirements of subrule (2.1) to appear before a judge or associate judge for a pre-trial conference.",
);

const RCP_50_02_REGISTRAR = rcp(
  "r. 50.02 (2)",
  "If the parties do not schedule a pre-trial conference within 180 days after the action is set down for trial, the registrar shall, subject to any previous order, (a) schedule a date and time consistent with the requirements of subrule (2.1) for the parties to appear before a judge or associate judge for a pre-trial conference; and (b) give notice to the parties to appear at the scheduled date and time.",
);

const RCP_50_03_1_READINESS = rcp(
  "r. 50.03.1 (1)",
  "At least 30 days before a pre-trial conference in an action, each party shall deliver a certificate of readiness (Form 50A) indicating whether the party intends to call any expert evidence at trial,",
);

const RCP_50_03_1_RESCHEDULED = rcp(
  "r. 50.03.1 (3)",
  "For greater certainty, if a pre-trial conference is rescheduled, subrule (1) applies with respect to the rescheduled pre-trial conference date.",
);

const RCP_50_04_BRIEF = rcp(
  "r. 50.04",
  "At least five days before a pre-trial conference, each party shall file with proof of service a pre-trial conference brief containing concise statements, without argument, of the following matters:",
);

const RCP_50_05_ATTEND = rcp(
  "r. 50.05 (1)",
  "The lawyers for the parties shall appear at the pre-trial conference and, unless the presiding judge or associate judge orders otherwise, the parties shall also participate.",
);

const RCP_53_03_EXPERT = rcp(
  "r. 53.03 (1)",
  "A party who intends to call an expert witness at trial shall, not less than 90 days before the pre-trial conference scheduled under subrule 50.02 (1) or (2), serve on every other party to the action a report, signed by the expert, containing the information listed in subrule (2.1).",
);

const RCP_53_03_RESPONDING_EXPERT = rcp(
  "r. 53.03 (2)",
  "A party who intends to call an expert witness at trial to respond to the expert witness of another party shall, not less than 60 days before the pre-trial conference, serve on every other party to the action a report, signed by the expert, containing the information listed in subrule (2.1).",
);

// ------------------------------------------------------------------ trial

const RCP_52_01_ALL_ABSENT = rcp(
  "r. 52.01 (1)",
  "Where an action is called for trial and all the parties fail to attend, the trial judge may strike the action off the trial list.",
);

const RCP_52_01_ONE_ABSENT = rcp(
  "r. 52.01 (2)",
  "Where an action is called for trial and a party fails to attend, the trial judge may, (a) proceed with the trial in the absence of the party; (b) where the plaintiff attends and the defendant fails to attend, dismiss the counterclaim, if any, and allow the plaintiff to prove the claim; (c) where the defendant attends and the plaintiff fails to attend, dismiss the action and allow the defendant to prove the counterclaim, if any; or (d) make such other order as is just.",
);

const RCP_52_01_SET_ASIDE = rcp(
  "r. 52.01 (3)",
  "A judge may set aside or vary, on such terms as are just, a judgment obtained against a party who failed to attend at the trial.",
);

// ---------------------------------------------------------------- motions

const RCP_37_07_SEVEN_DAYS = rcp(
  "r. 37.07 (6)",
  "Where a motion is made on notice, the notice of motion shall be served at least seven days before the date on which the motion is to be heard.",
);

const RCP_37_08_FILE = rcp(
  "r. 37.08 (1)",
  "Where a motion is made on notice, the notice of motion shall be filed with proof of service at least seven days before the hearing date in the court office where the motion is to be heard.",
);

const RCP_37_10_MOTION_RECORD = rcp(
  "r. 37.10 (1)",
  "Where a motion is made on notice, the moving party shall, unless the court orders otherwise before or at the hearing of the motion, serve a motion record on every other party to the motion and file it, with proof of service, in the court office where the motion is to be heard, at least seven days before the hearing,",
);

const RCP_37_10_RESPONDING_RECORD = rcp(
  "r. 37.10 (3)",
  "Where a motion record is served a responding party who is of the opinion that it is incomplete may serve on every other party, and file, with proof of service, in the court office where the motion is to be heard, at least four days before the hearing, a responding party's motion record",
);

const RCP_37_10_MOVING_FACTUM = rcp(
  "r. 37.10 (7)",
  "The moving party's factum, if any, shall be served and filed with proof of service in the court office where the motion is to be heard at least seven days before the hearing.",
);

const RCP_37_10_RESPONDING_FACTUM = rcp(
  "r. 37.10 (8)",
  "The responding party's factum, if any, shall be served and filed with proof of service in the court office where the motion is to be heard at least four days before the hearing.",
);

const RCP_37_14_SET_ASIDE_ORDER = rcp(
  "r. 37.14 (1)",
  "A party or other person who, (a) is affected by an order obtained on motion without notice; (b) fails to appear on a motion through accident, mistake or insufficient notice; or (c) is affected by an order of a registrar, may move to set aside or vary the order, by a notice of motion that is served forthwith after the order comes to the person's attention and names the first available hearing date that is at least three days after service of the notice of motion.",
);

const RCP_37_14_POWER = rcp(
  "r. 37.14 (2)",
  "On a motion under subrule (1), the court may set aside or vary the order on such terms as are just.",
);

// ----------------------------------------------------- appeals and payment

const S_CJA_6_COURT_OF_APPEAL = cja(
  "s. 6 (1) (b)",
  "(b) a final order of a judge of the Superior Court of Justice, except, (i) an order referred to in clause 19 (1) (a) or (a.1), or (ii) an order from which an appeal lies to the Divisional Court under another Act;",
);

const S_CJA_19_DIVISIONAL = cja(
  "s. 19 (1)",
  "An appeal lies to the Divisional Court from, (a) a final order of a judge of the Superior Court of Justice, as described in subsections (1.1) and (1.2); (a.1) a final order of a judge of the Family Court made only under a provision of an Act or regulation of Ontario; (b) an interlocutory order of a judge of the Superior Court of Justice, with leave as provided in the rules of court;",
);

const S_CJA_19_50K = cja(
  "s. 19 (1.2)",
  "If the notice of appeal is filed on or after October 1, 2007, clause (1) (a) applies in respect of a final order, (a) for a single payment of not more than $50,000, exclusive of costs; (b) for periodic payments that amount to not more than $50,000, exclusive of costs, in the 12 months commencing on the date the first payment is due under the order; (c) dismissing a claim for an amount that is not more than the amount set out in clause (a) or (b); or (d) dismissing a claim for an amount that is more than the amount set out in clause (a) or (b) and in respect of which the judge or jury indicates that if the claim had been allowed the amount awarded would have been not more than the amount set out in clause (a) or (b).",
);

const RCP_60_02_METHODS = rcp(
  "r. 60.02 (1)",
  "In addition to any other method of enforcement provided by law, an order for the payment or recovery of money may be enforced by, (a) a writ of seizure and sale (Form 60A) under rule 60.07; (b) garnishment under rule 60.08; (c) a writ of sequestration (Form 60B) under rule 60.09; and (d) the appointment of a receiver.",
);

const RCP_60_08_GARNISHMENT = rcp(
  "r. 60.08 (1)",
  "A creditor under an order for the payment or recovery of money may enforce it by garnishment of debts payable to the debtor by other persons.",
);

const RCP_60_08_SIX_YEARS = rcp(
  "r. 60.08 (2)",
  "If six years or more have elapsed since the date of the order, or if its enforcement is subject to a condition, a notice of garnishment shall not be issued unless leave of the court is first obtained.",
);

const RCP_60_18_EXAMINATION = rcp(
  "r. 60.18 (2)",
  "A creditor may examine the debtor in relation to, (a) the reason for nonpayment or nonperformance of the order; (b) the debtor's income and property; (c) the debts owed to and by the debtor; (d) the disposal the debtor has made of any property either before or after the making of the order; (e) the debtor's present, past and future means to satisfy the order; (f) whether the debtor intends to obey the order or has any reason for not doing so; and (g) any other matter pertinent to the enforcement of the order.",
);

// ------------------------------------------------- added after the review

/*
 * The Limitations Act provisions the review found missing. C.S_LIMITATIONS_5_DISCOVERY
 * in citations.ts quotes only the lead-in of s. 5 (1) ("A claim is discovered on the
 * earlier of,"), so the civil map carries the whole subsection itself: a qualifier
 * that explains discovery must be supported by the words that define it.
 */
const lim = (pinpoint: string, quote: string): RuleCitation => ({
  sourceId: "limitations-act-2002",
  pinpoint,
  quote,
});

const S_LIM_5_1_FULL = lim(
  "s. 5 (1)",
  "A claim is discovered on the earlier of, (a) the day on which the person with the claim first knew, (i) that the injury, loss or damage had occurred, (ii) that the injury, loss or damage was caused by or contributed to by an act or omission, (iii) that the act or omission was that of the person against whom the claim is made, and (iv) that, having regard to the nature of the injury, loss or damage, a proceeding would be an appropriate means to seek to remedy it; and (b) the day on which a reasonable person with the abilities and in the circumstances of the person with the claim first ought to have known of the matters referred to in clause (a).",
);

const S_LIM_6_MINORS = lim(
  "s. 6",
  "The limitation period established by section 4 does not run during any time in which the person with the claim, (a) is a minor; and (b) is not represented by a litigation guardian in relation to the claim.",
);

const S_LIM_7_1_INCAPABLE = lim(
  "s. 7 (1)",
  "The limitation period established by section 4 does not run during any time in which the person with the claim, (a) is incapable of commencing a proceeding in respect of the claim because of his or her physical, mental or psychological condition; and (b) is not represented by a litigation guardian in relation to the claim.",
);

const S_LIM_7_2_PRESUMED_CAPABLE = lim(
  "s. 7 (2)",
  "A person shall be presumed to have been capable of commencing a proceeding in respect of a claim at all times unless the contrary is proved.",
);

const S_LIM_7_3_SIX_MONTHS = lim(
  "s. 7 (3)",
  "If the running of a limitation period is postponed or suspended under this section and the period has less than six months to run when the postponement or suspension ends, the period is extended to include the day that is six months after the day on which the postponement or suspension ends.",
);

const S_LIM_11_1_RESOLUTION = lim(
  "s. 11 (1)",
  "If a person with a claim and a person against whom the claim is made have agreed to have an independent third party resolve the claim or assist them in resolving it, the limitation periods established by sections 4 and 15 do not run from the date the agreement is made until, (a) the date the claim is resolved; (b) the date the attempted resolution process is terminated; or (c) the date a party terminates or withdraws from the agreement.",
);

const S_LIM_13_1_ACKNOWLEDGMENT = lim(
  "s. 13 (1)",
  "If a person acknowledges liability in respect of a claim for payment of a liquidated sum, the recovery of personal property, the enforcement of a charge on personal property or relief from enforcement of a charge on personal property, the act or omission on which the claim is based shall be deemed to have taken place on the day on which the acknowledgment was made.",
);

const S_LIM_13_10_WRITING = lim(
  "s. 13 (10)",
  "Subsections (1), (2), (3), (6) and (7) do not apply unless the acknowledgment is in writing and signed by the person making it or the person's agent.",
);

const S_LIM_15_4_NOT_RUN = lim(
  "s. 15 (4)",
  "The limitation period established by subsection (2) does not run during any time in which, (a) the person with the claim, (i) is incapable of commencing a proceeding in respect of the claim because of his or her physical, mental or psychological condition, and (ii) is not represented by a litigation guardian in relation to the claim; (b) the person with the claim is a minor and is not represented by a litigation guardian in relation to the claim; or (c) the person against whom the claim is made, (i) wilfully conceals from the person with the claim the fact that injury, loss or damage has occurred,",
);

const S_CLPA_18_5_COUNTERCLAIM: RuleCitation = {
  sourceId: "crown-liability-and-proceedings-act-2019",
  pinpoint: "s. 18 (5)",
  quote: "This section does not apply with respect to a counterclaim, crossclaim or claim by way of set-off.",
};

const S_CLPA_18_6_NULLITY: RuleCitation = {
  sourceId: "crown-liability-and-proceedings-act-2019",
  pinpoint: "s. 18 (6)",
  quote:
    "For greater certainty, failure to give notice of a claim as required by this section renders a proceeding brought without such notice a nullity in respect of the claim, from the time the proceeding is brought.",
};

const S_CJA_23_COUNTERCLAIMS = cja(
  "s. 23 (1.2)",
  "Subsection (1.1) does not apply with respect to a counterclaim, crossclaim or third or subsequent party claim, where the main action was commenced in the Superior Court of Justice.",
);

const S_CJA_133_LEAVE = cja(
  "s. 133",
  "No appeal lies without leave of the court to which the appeal is to be taken, (a) from an order made with the consent of the parties; or (b) where the appeal is only as to costs that are in the discretion of the court that made the order for costs.",
);

const RCP_14_01_1_WITHOUT_NOTICE = rcp(
  "r. 14.01.1 (2)",
  "A motion under subsection 23 (1.1) of the Courts of Justice Act for leave to commence an action in the Superior Court of Justice that is within the Small Claims Court's jurisdiction may be made without notice, unless the court orders otherwise.",
);

const RCP_16_02_CORPORATION = rcp(
  "r. 16.02 (1) (c)",
  "(c) on any other corporation, by leaving a copy of the document with an officer, director or agent of the corporation, or with a person at any place of business of the corporation who appears to be in control or management of the place of business;",
);

const RCP_16_03_CORPORATION_MAIL = rcp(
  "r. 16.03 (6)",
  "Where the head office, registered office or principal place of business of a corporation or, in the case of an extra-provincial corporation, the attorney for service in Ontario cannot be found at the last address recorded with the Ministry of Public and Business Service Delivery, service may be made on the corporation by mailing a copy of the document to the corporation or to the attorney for service in Ontario, as the case may be, at that address.",
);

const RCP_16_04_DISPENSED = rcp(
  "r. 16.04 (3)",
  "Where an order is made dispensing with service of a document, the document shall be deemed to have been served on the date of the order for the purpose of the computation of time under these rules.",
);

const RCP_16_07_NOT_NOTICED = rcp(
  "r. 16.07",
  "Even though a person has been served with a document in accordance with these rules, the person may show on a motion to set aside the consequences of default, for an extension of time or in support of a request for an adjournment, that the document, (a) did not come to the person's notice; or (b) came to the person's notice only at some time later than when it was served or is deemed to have been served.",
);

const RCP_16_08_VALIDATING = rcp(
  "r. 16.08",
  "Where a document has been served in a manner other than one authorized by these rules or an order, the court may make an order validating the service where the court is satisfied that, (a) the document came to the notice of the person to be served; or (b) the document was served in such a manner that it would have come to the notice of the person to be served, except for the person's own attempts to evade service.",
);

const RCP_24_01_E_RESTORE = rcp(
  "r. 24.01 (1) (e)",
  "A defendant who is not in default under these rules or an order of the court may move to have an action dismissed for delay where the plaintiff has failed, ... (e) to move for leave to restore to a trial list an action that has been struck off the trial list, within thirty days after the action was struck off.",
);

const RCP_24_03_COUNTERCLAIM_ELECTION = rcp(
  "r. 24.03",
  "Where an action against a defendant who has counterclaimed is dismissed for delay, the defendant may within thirty days after the dismissal deliver a notice of election to proceed with the counterclaim (Form 23B), and if the defendant fails to do so, the counterclaim shall be deemed to be discontinued without costs.",
);

const RCP_24_05_NOT_A_DEFENCE = rcp(
  "r. 24.05 (1)",
  "The dismissal of an action for delay is not a defence to a subsequent action unless the order dismissing the action provides otherwise.",
);

const RCP_48_14_EFFECT = rcp(
  "r. 48.14 (9)",
  "Rules 24.03 to 24.05 (effect of dismissal for delay), other than subrule 24.04 (1.1), apply to an action dismissed under subrule (1).",
);

const RCP_48_11_STRUCK_OFF = rcp(
  "r. 48.11",
  "Where an action is struck off a trial list, it shall not thereafter be placed on any trial list except, (a) in the case of an action struck off the list by a judge, with leave of a judge; or (b) in any other case, with leave of the court.",
);

const RCP_37_14_WHERE = rcp(
  "r. 37.14 (3)",
  "A motion under subrule (1) or any other rule to set aside, vary or amend an order of a registrar may be made to a judge or associate judge, at a place determined in accordance with rule 37.03 (where motions to be brought).",
);

const RCP_37_10_1_CONFIRM = rcp(
  "r. 37.10.1 (1)",
  "A party who makes a motion on notice to another party shall confer or attempt to confer with the other party and shall, not later than 2 p.m. five days before the hearing date, (a) give the registrar a confirmation of motion (Form 37B) by, (i) sending it by email to the court office, or (ii) leaving it at the court office; and (b) send a copy of the confirmation of motion to the other party by email.",
);

const RCP_37_10_1_RESPONDING_CONFIRM = rcp(
  "r. 37.10.1 (2)",
  "If a party fails to send a copy of the confirmation of motion to a responding party in accordance with clause (1) (b), the responding party may, not later than 10 a.m. four days before the hearing date, (a) give the registrar a confirmation of motion (Form 37B) by, (i) sending it by email to the court office, or (ii) leaving it at the court office; and (b) send a copy of the confirmation of motion to the moving party by email.",
);

const RCP_37_10_1_ABANDONED = rcp(
  "r. 37.10.1 (4)",
  "If no confirmation is given under subrule (1), the motion shall not be heard and is deemed to have been abandoned, unless the court orders otherwise.",
);

const RCP_37_10_CHART = rcp(
  "r. 37.10 (10) (b)",
  "(b) the responding party shall serve on the moving party and every other party to the motion and file with proof of service, in the court office where the motion is to be heard, at least four days before the hearing, a copy of the undertakings and refusals chart that was served by the moving party completed so as to show, (i) the answer provided, or (ii) the basis for the refusal to answer the question or satisfy the undertaking.",
);

const RCP_37_12_1_IN_WRITING = rcp(
  "r. 37.12.1 (4)",
  "The moving party may propose in the notice of motion that the motion be heard in writing without the attendance of the parties, in which case, (a) the motion shall be made on at least fourteen days notice;",
);

const RCP_37_12_1_RESPONSE = rcp(
  "r. 37.12.1 (5)",
  "Within ten days after being served with the moving party's material, the responding party shall serve and file, with proof of service, in the court office where the motion is to be heard, (a) a consent to the motion; (b) a notice that the responding party does not oppose the motion; (c) a motion record, a notice that the responding party agrees to have the motion heard and determined in writing under this rule and a factum entitled factum for a motion in writing, setting out the party's argument; or (d) a notice that the responding party intends to make oral argument, along with any material intended to be relied upon by the party.",
);

const RCP_24_1_09_CHOOSE = rcp("r. 24.1.09 (4)", "The parties shall choose a mediator under subrule 24.1.08 (2).");

const RCP_24_1_09_ASSIGN = rcp(
  "r. 24.1.09 (6)",
  "If the mediation co-ordinator does not, within 180 days after the first defence has been filed, receive an order under subrule (1), a consent under subrule (3), a notice under clause (5) (a), a mediator's report or a notice that the action has been settled, he or she shall immediately assign a mediator from the list, unless the court orders otherwise.",
);

const RCP_24_1_10_PLEADINGS = rcp(
  "r. 24.1.10 (4)",
  "The plaintiff shall include a copy of the pleadings with the copy of the statement that is provided to the mediator.",
);

const RCP_24_1_10_CANCEL = rcp(
  "r. 24.1.10 (5)",
  "If it is not practical to conduct a mediation session because a party fails to comply with subrule (1), the mediator shall cancel the session and immediately file with the mediation co-ordinator a certificate of non-compliance (Form 24.1D).",
);

const RCP_76_01_OTHER_RULES = rcp(
  "r. 76.01 (2)",
  "The rules that apply to an action apply to an action that is proceeding under this Rule, unless this Rule provides otherwise.",
);

const RCP_76_04_NOT_PERMITTED = rcp(
  "r. 76.04 (1)",
  "The following are not permitted in an action under this Rule: 1. Examination for discovery by written questions and answers under Rule 35. 2. Cross-examination of a deponent on an affidavit under rule 39.02. 3. Examination of a witness on a motion under rule 39.03.",
);

const RCP_76_10_PLAN = rcp(
  "r. 76.10 (2)",
  "At least 30 days before the pre-trial conference, the parties shall agree to a proposed trial management plan that contains the following: 1. A list of every witness, including every expert witness, whose evidence a party intends to adduce at trial. 2. A division of time between the parties, the total of which shall not exceed five days,",
);

const RCP_76_12_CROSS_EXAMINE = rcp(
  "r. 76.12 (3)",
  "A party who intends to examine or cross-examine the deponent of an affidavit at the trial shall, at least 10 days before the date fixed for trial, give notice of that intention to the party who filed the affidavit, who shall arrange for the deponent's attendance at the trial.",
);

const RCP_53_03_SCHEDULE = rcp(
  "r. 53.03 (2.2)",
  "Within 60 days after an action is set down for trial, the parties shall agree to a schedule setting out dates for the service of experts' reports in order to meet the requirements of subrules (1), (2) and (3), unless the court orders otherwise.",
);

const RCP_53_03_NO_REPORT = rcp(
  "r. 53.03 (3)",
  "An expert witness may not testify with respect to an issue, except with leave of the trial judge, unless the substance of his or her testimony with respect to that issue is set out in, (a) a report served under this rule; (b) a supplementary report served on every other party to the action not less than 45 days before the commencement of the trial; or (c) a responding supplementary report served on every other party to the action not less than 15 days before the commencement of the trial.",
);

const RCP_53_03_EXTEND = rcp(
  "r. 53.03 (4)",
  "The time provided for service of a report or supplementary report under this rule may be extended or abridged, (a) by the judge or associate judge at the pre-trial conference or at any conference under Rule 77; (b) by the court, on motion; or (c) on the written consent of the parties, except that the parties may not consent to an extension that would affect the scheduled trial date.",
);

const RCP_53_04_SUMMONS = rcp(
  "r. 53.04 (1)",
  "A party who requires the attendance of a person in Ontario as a witness at a trial may serve the person with a summons to witness (Form 53A) requiring him or her to attend the trial at the time and place stated in the summons,",
);

const RCP_27_02_SAME_DOCUMENT = rcp(
  "r. 27.02",
  "A counterclaim (Form 27A or 27B) shall be included in the same document as the statement of defence and the document shall be entitled a statement of defence and counterclaim.",
);

const RCP_28_04_CROSSCLAIM = rcp(
  "r. 28.04 (1)",
  "A statement of defence and crossclaim shall be delivered, (a) within the time prescribed by rule 18.01 for delivery of the statement of defence in the main action or at any time before the defendant is noted in default; or (b) subsequently with leave, which the court shall grant unless the plaintiff would be prejudiced thereby.",
);

const RCP_29_02_ISSUE = rcp(
  "r. 29.02 (1)",
  "A third party claim (Form 29A) shall be issued within 10 days after the defendant delivers a statement of defence, or at any time before the defendant is noted in default.",
);

const RCP_29_02_AFTER_REPLY = rcp(
  "r. 29.02 (1.1)",
  "A third party claim may be issued within 10 days after the plaintiff delivers a reply in the main action to the defendant's statement of defence.",
);

const RCP_29_02_CONSENT_LEAVE = rcp(
  "r. 29.02 (1.2)",
  "A third party claim may be issued at any time with the plaintiff's consent or with leave, which the court shall grant unless the plaintiff would be prejudiced thereby.",
);

const RCP_29_02_SERVE = rcp(
  "r. 29.02 (2)",
  "A third party claim shall be served on the third party personally or by an alternative to personal service under rule 16.03, together with all the pleadings previously delivered in the main action or in any counterclaim, crossclaim or third or subsequent party claim in the main action, within thirty days after the third party claim is issued.",
);

const RCP_29_03_THIRD_PARTY_DEFENCE = rcp(
  "r. 29.03",
  "Except as provided in subrule 18.02 (3) (notice of intent to defend) or 19.01 (5) (late filing of defence), a third party may defend against the third party claim by delivering a third party defence (Form 29B), (a) within twenty days after service of the third party claim, where the third party is served in Ontario; (b) within forty days after service of the third party claim, where the defendant is served elsewhere in Canada or in the United States of America; or (c) within sixty days after service of the third party claim, where the third party is served anywhere else.",
);

const RCP_18_02_THIRD_PARTY = rcp(
  "r. 18.02 (3)",
  "Subrules (1) and (2) apply, with necessary modifications, to, (a) a defendant to a counterclaim who is not already a party to the main action and who has been served with a statement of defence and counterclaim; and (b) a third party who has been served with a third party claim.",
);

const RCP_29_05_DEFEND_MAIN = rcp(
  "r. 29.05 (1)",
  "Where appropriate, the third party may defend against the plaintiff's claim against the defendant by delivering a statement of defence in the main action, in which the third party may raise any defence open to the defendant.",
);

const RCP_29_05_SAME_TIME = rcp(
  "r. 29.05 (3)",
  "The third party shall deliver the statement of defence within the main action within the time prescribed by rule 29.03 for the delivery of the third party defence.",
);

const RCP_29_07_THIRD_PARTY_DEFAULT = rcp(
  "r. 29.07",
  "Where a third party has been noted in default, the defendant may obtain judgment against the third party only at the trial of the main action or on motion to a judge.",
);

const RCP_51_02_REQUEST = rcp(
  "r. 51.02 (1)",
  "A party may at any time, by serving a request to admit (Form 51A), request any other party to admit, for the purposes of the proceeding only, the truth of a fact or the authenticity of a document.",
);

const RCP_51_03_RESPOND = rcp(
  "r. 51.03 (1)",
  "A party on whom a request to admit is served shall respond to it within twenty days after it is served by serving on the requesting party a response to request to admit (Form 51B).",
);

const RCP_51_03_DEEMED = rcp(
  "r. 51.03 (2)",
  "Where the party on whom the request is served fails to serve a response as required by subrule (1), the party shall be deemed, for the purposes of the proceeding only, to admit the truth of the facts or the authenticity of the documents mentioned in the request to admit.",
);

const RCP_51_03_DENY_OR_REASON = rcp(
  "r. 51.03 (3)",
  "A party shall also be deemed, for the purposes of the proceeding only, to admit the truth of the facts or the authenticity of the documents mentioned in the request, unless the party's response, (a) specifically denies the truth of a fact or the authenticity of a document mentioned in the request; or (b) refuses to admit the truth of a fact or the authenticity of a document and sets out the reason for the refusal.",
);

const RCP_51_04_COSTS = rcp(
  "r. 51.04",
  "Where a party denies or refuses to admit the truth of a fact or the authenticity of a document after receiving a request to admit, and the fact or document is subsequently proved at the hearing, the court may take the denial or refusal into account in exercising its discretion respecting costs.",
);

const RCP_60_07_LEAVE = rcp(
  "r. 60.07 (2)",
  "If six years or more have elapsed since the date of the order, or if its enforcement is subject to a condition, a writ of seizure and sale shall not be issued unless leave of the court is first obtained.",
);

const RCP_60_07_EXPIRES = rcp(
  "r. 60.07 (6)",
  "A writ of seizure and sale expires on the sixth anniversary of the date of its issue or, if it is renewed under subrule (8) or (9), on the sixth anniversary of the date on which it would have expired had it not been renewed.",
);

const RCP_60_07_RENEW_SHERIFF = rcp(
  "r. 60.07 (8)",
  "A writ of seizure and sale that is filed with a sheriff may be renewed before its expiration by filing a request to renew (Form 60E) with the sheriff, who shall record the date of the renewal and the new expiration date.",
);

const RCP_60_07_RENEW_REGISTRAR = rcp(
  "r. 60.07 (9)",
  "A writ of seizure and sale that is not filed with a sheriff may be renewed before its expiration by filing with the registrar who issued it a requisition to renew the writ, and the registrar shall renew the writ and record the date of renewal.",
);

const RCP_60_07_RENEW_WINDOW = rcp(
  "r. 60.07 (9.1)",
  "A request to renew under subrule (8) or requisition to renew under subrule (9) may only be filed during the six year period preceding the expiry to which the request or requisition relates.",
);

const RCP_60_08_IN_FORCE = rcp(
  "r. 60.08 (6.2)",
  "A notice of garnishment remains in force for six years from the date of its issue and for a further six years from each renewal.",
);

const RCP_60_08_RENEW = rcp(
  "r. 60.08 (6.3)",
  "A notice of garnishment may be renewed before its expiration by filing with the registrar where the proceeding was commenced a requisition for renewal of garnishment (Form 60G.1) together with the affidavit required by subrule (4).",
);

const RCP_63_01_DEFAULT_NOT_STAYED = rcp(
  "r. 63.01 (2)",
  "The delivery of a notice of appeal from an order refusing to set aside a default judgment does not stay the default judgment, but it may be stayed by order and rule 63.02 applies as if the appeal were from the default judgment.",
);

const RCP_61_07_CROSS_APPEAL = rcp(
  "r. 61.07 (1)",
  "A respondent who, (a) seeks to set aside or vary the order appealed from; or (b) will seek, if the appeal is allowed in whole or in part, other relief or a different disposition than the order appealed from, shall, within fifteen days after service of the notice of appeal, serve a notice of cross-appeal (Form 61E) on all parties whose interests may be affected by the cross-appeal and on any person entitled by statute to be heard on the appeal,",
);

const RCP_62_02_LEAVE_FROM = rcp(
  "r. 62.02 (1)",
  "Leave to appeal to the Divisional Court from any of the following orders or decisions shall be obtained from a panel of that court in accordance with this rule: 1. An interlocutory order of a judge of the Superior Court of Justice, under clause 19 (1) (b) of the Courts of Justice Act. 2. A final order of a judge of the Superior Court of Justice for costs, under clauses 19 (1) (a) and 133 (b) of the Courts of Justice Act.",
);

const RCP_62_02_NOTICE = rcp(
  "r. 62.02 (3)",
  "Subrules 61.03.1 (2) and (3) apply, with necessary modifications, to the notice of motion for leave except that the notice shall be in Form 61A.",
);

const RCP_61_03_1_FIFTEEN_DAYS = rcp(
  "r. 61.03.1 (3)",
  "The notice of motion, (a) shall be served within 15 days after the making of the order or decision from which leave to appeal is sought, unless a statute provides otherwise; and (b) shall be filed with proof of service in the office of the Registrar within five days after service.",
);

const RCP_62_02_TEST = rcp(
  "r. 62.02 (4)",
  "Leave to appeal from an interlocutory order shall not be granted unless, (a) there is a conflicting decision by another judge or court in Ontario or elsewhere on the matter involved in the proposed appeal and it is, in the opinion of the panel hearing the motion, desirable that leave to appeal be granted; or (b) there appears to the panel hearing the motion good reason to doubt the correctness of the order in question and the proposed appeal involves matters of such importance that, in the panel's opinion, leave to appeal should be granted.",
);

const RCP_62_02_AFTER_LEAVE = rcp(
  "r. 62.02 (8)",
  "Where leave is granted, the notice of appeal required by rule 61.04, together with the appellant's certificate respecting evidence required by subrule 61.05 (1), shall be delivered within seven days after the granting of leave, and thereafter Rule 61 applies to the appeal.",
);

const RCP_62_01_ASSOCIATE_JUDGE = rcp(
  "r. 62.01 (1)",
  "Subrules (2) to (10) apply to an appeal that is made to a judge, (a) from an interlocutory order referred to in clause 17 (a) of the Courts of Justice Act;",
);

const RCP_62_01_SEVEN_DAYS = rcp(
  "r. 62.01 (2)",
  "An appeal shall be commenced by serving a notice of appeal (Form 62A) on all parties whose interests may be affected by the appeal, within seven days after the making of the order or certificate appealed from.",
);

const RCP_62_02_IN_WRITING = rcp(
  "r. 62.02 (2)",
  "The motion for leave to appeal shall be heard in writing, without the attendance of parties or lawyers.",
);

const S_CJA_17_ASSOCIATE_JUDGE = cja(
  "s. 17 (a)",
  "An appeal lies to the Superior Court of Justice from, (a) an interlocutory order of a master, case management master or associate judge;",
);

const S_CLPA_8_1_B_PROPERTY: RuleCitation = {
  sourceId: "crown-liability-and-proceedings-act-2019",
  pinpoint: "s. 8 (1) (b)",
  quote: "(b) in respect of a breach of duty attaching to the ownership, occupation, possession or control of property;",
};

const S_LIM_13_9_BEFORE_EXPIRY = lim(
  "s. 13 (9)",
  "This section does not apply unless the acknowledgment is made to the person with the claim, the person's agent or an official receiver or trustee acting under the Bankruptcy and Insolvency Act (Canada) before the expiry of the limitation period applicable to the claim.",
);

const S_CLPA_15_SERVICE: RuleCitation = {
  sourceId: "crown-liability-and-proceedings-act-2019",
  pinpoint: "s. 15",
  quote:
    "A document to be served personally on the Crown in a proceeding to which it is a party shall be served by leaving a copy of the document with an employee of the Crown at the Crown Law Office (Civil Law) of the Ministry of the Attorney General.",
};

const ev = (pinpoint: string, quote: string): RuleCitation => ({ sourceId: "evidence-act", pinpoint, quote });

const S_EVIDENCE_35_2 = ev(
  "s. 35 (2)",
  "Any writing or record made of any act, transaction, occurrence or event is admissible as evidence of such act, transaction, occurrence or event if made in the usual and ordinary course of any business and if it was in the usual and ordinary course of such business to make such writing or record at the time of such act, transaction, occurrence or event or within a reasonable time thereafter.",
);

const S_EVIDENCE_35_3 = ev(
  "s. 35 (3)",
  "Subsection (2) does not apply unless the party tendering the writing or record has given at least seven days notice of the party’s intention to all other parties in the action, and any party to the action is entitled to obtain from the person who has possession thereof production for inspection of the writing or record within five days after giving notice to produce the same.",
);

const S_EVIDENCE_52_2 = ev(
  "s. 52 (2)",
  "A report obtained by or prepared for a party to an action and signed by a practitioner and any other report of the practitioner that relates to the action are, with leave of the court and after at least ten days notice has been given to all other parties, admissible in evidence in the action.",
);

const S_EVIDENCE_52_3 = ev(
  "s. 52 (3)",
  "Unless otherwise ordered by the court, a party to an action is entitled, at the time that notice is given under subsection (2), to a copy of the report together with any other report of the practitioner that relates to the action.",
);

const S_EVIDENCE_52_4 = ev(
  "s. 52 (4)",
  "Except by leave of the judge presiding at the trial, a practitioner who signs a report with respect to a party shall not give evidence at the trial unless the report is given to all other parties in accordance with subsection (2).",
);

const RCP_31_07_FAIL = rcp(
  "r. 31.07 (1) (b), (c)",
  "(b) the party or other person indicates that the question will be considered or taken under advisement, but no answer is provided within 60 days after the response; or (c) the party or other person undertakes to answer the question, but no answer is provided within 60 days after the response.",
);

const RCP_31_07_EFFECT = rcp(
  "r. 31.07 (2)",
  "If a party, or a person examined for discovery on behalf of or in place of a party, fails to answer a question as described in subrule (1), the party may not introduce at the trial the information that was not provided, except with leave of the trial judge.",
);

const RCP_31_07_HONOUR = rcp(
  "r. 31.07 (4)",
  "For greater certainty, nothing in these rules relieves a party or other person who undertakes to answer a question from the obligation to honour the undertaking.",
);

const RCP_29_1_03_CONTENTS = rcp(
  "r. 29.1.03 (3)",
  "The discovery plan shall be in writing, and shall include, (a) the intended scope of documentary discovery under rule 30.02, taking into account relevance, costs and the importance and complexity of the issues in the particular action; (b) dates for the service of each party's affidavit of documents (Form 30A or 30B) under rule 30.03;",
);

const RCP_76_02_OBJECTION = rcp(
  "r. 76.02 (5) (a)",
  "An action commenced under this Rule continues to proceed under this Rule unless, (a) the defendant objects in the statement of defence to the action proceeding under this Rule because the plaintiff's claim does not comply with subrule (1), and the plaintiff does not abandon in the reply the claims or parts of claims that do not comply;",
);

const RCP_27_04_NEW_PARTY = rcp(
  "r. 27.04 (2)",
  "Where a counterclaim is against the plaintiff and a defendant to the counterclaim who is not already a party to the main action, the statement of defence and counterclaim shall be served, after it has been issued, on the parties to the main action and, together with all the pleadings previously delivered in the main action, on a defendant to the counterclaim who is not already a party to the main action, and shall be filed with proof of service, (a) within thirty days after the statement of defence and counterclaim is issued or at any time before the defendant is noted in default; or (b) subsequently with leave of the court.",
);

const RCP_27_05_NEW_PARTY_DEFENCE = rcp(
  "r. 27.05 (3)",
  "Except as provided in subrule 18.02 (3) (notice of intent to defend) or 19.01 (5) (late delivery of defence), a defendant to a counterclaim who is not already a party to the main action shall deliver a defence to counterclaim, (a) within twenty days after service of the statement of defence and counterclaim, where the defendant to the counterclaim is served in Ontario; (b) within forty days after service of the statement of defence and counterclaim, where the defendant to the counterclaim is served elsewhere in Canada or in the United States of America; or (c) within sixty days after service of the statement of defence and counterclaim, where the defendant to the counterclaim is served anywhere else.",
);

const RCP_29_02_OTHER_PARTIES = rcp(
  "r. 29.02 (3)",
  "A third party claim shall also be served on every other party to the main action within the time for service on the third party, but personal service is not required.",
);

const RCP_24_1_09_TRANSFERRED = rcp(
  "r. 24.1.09 (2.1)",
  "In the case of an action described in paragraph 3 of subrule 24.1.04 (1), (a) subrules (1) and (6) do not apply; and (b) the court may make an order, on motion or otherwise, specifying the date by which a mediation session must take place.",
);

const RCP_37_10_MOVING_CHART = rcp(
  "r. 37.10 (10) (a)",
  "(a) the moving party shall serve on every other party to the motion and file with proof of service, in the court office where the motion is to be heard, at least seven days before the hearing, a refusals and undertakings chart (Form 37C)",
);

const RCP_37_12_1_IN_WRITING_MATERIAL = rcp(
  "r. 37.12.1 (4) (b)",
  "(b) the moving party shall serve with the notice of motion and immediately file, with proof of service in the court office where the motion is to be heard, a motion record, a draft order and a factum entitled factum for a motion in writing, setting out the moving party's argument;",
);

const RCP_76_05_MOTION_FORM = rcp(
  "r. 76.05 (1)",
  "The moving party shall serve a motion form (Form 76B) in accordance with rule 37.07 and shall submit it to the court before the motion is brought and heard.",
);

const RCP_76_05_MATERIALS = rcp(
  "r. 76.05 (3)",
  "Depending on the practical requirements of the situation, the motion may be made with or without supporting material or a motion record.",
);

const RCP_62_01_HEARING_DATE = rcp(
  "r. 62.01 (3)",
  "The notice of appeal shall name the first available hearing date that is not less than seven days after the date of service of the notice of appeal,",
);

const RCP_62_01_FILE = rcp(
  "r. 62.01 (5)",
  "The notice of appeal shall be filed in the court office where the appeal is to be heard, with proof of service, not later than seven days before the hearing date.",
);

const RCP_62_02_PROCEDURES = rcp(
  "r. 62.02 (5)",
  "Subrules 61.03.1 (4) to (19) (motion for leave to appeal to Court of Appeal) apply, with the following and any other necessary modifications, to the motion for leave to appeal:",
);

const RCP_61_03_1_RECORD_30_DAYS = rcp(
  "r. 61.03.1 (6)",
  "Within 30 days after filing the notice of motion for leave to appeal, the moving party shall file the motion record, factum and any transcripts and book of authorities, with proof of service.",
);

const RCP_49_02_OFFER = rcp(
  "r. 49.02 (1)",
  "A party to a proceeding may serve on any other party an offer to settle any one or more of the claims in the proceeding on the terms specified in the offer to settle (Form 49A).",
);

const RCP_49_03_SEVEN_DAYS = rcp(
  "r. 49.03",
  "An offer to settle may be made at any time, but where the offer to settle is made less than seven days before the hearing of the proceeding commences, the costs consequences referred to in rule 49.10 do not apply.",
);

const RCP_49_04_WITHDRAW = rcp(
  "r. 49.04 (1)",
  "An offer to settle may be withdrawn at any time before it is accepted by serving written notice of withdrawal of the offer on the party to whom the offer was made.",
);

const RCP_49_04_EXPIRES = rcp(
  "r. 49.04 (3)",
  "Where an offer to settle specifies a time within which it may be accepted and it is not accepted or withdrawn within that time, it shall be deemed to have been withdrawn when the time expires.",
);

const RCP_49_04_DISPOSED = rcp(
  "r. 49.04 (4)",
  "An offer may not be accepted after the court disposes of the claim in respect of which the offer is made.",
);

const RCP_49_05_WITHOUT_PREJUDICE = rcp(
  "r. 49.05",
  "An offer to settle shall be deemed to be an offer of compromise made without prejudice.",
);

const RCP_49_10_PLAINTIFF_OFFER = rcp(
  "r. 49.10 (1)",
  "Where an offer to settle, (a) is made by a plaintiff at least seven days before the commencement of the hearing of the proceeding; (b) is not withdrawn and does not expire before the commencement of the hearing of the proceeding; and (c) is not accepted by the defendant, and the plaintiff obtains a judgment as favourable as or more favourable than the terms of the offer to settle, the plaintiff is entitled to partial indemnity costs to the date the offer to settle was served and substantial indemnity costs from that date, unless the court orders otherwise.",
);

const RCP_49_10_DEFENDANT_OFFER = rcp(
  "r. 49.10 (2)",
  "Where an offer to settle, (a) is made by a defendant at least seven days before the commencement of the hearing of the proceeding; (b) is not withdrawn and does not expire before the commencement of the hearing of the proceeding; and (c) is not accepted by the plaintiff, and the plaintiff obtains a judgment as favourable as or less favourable than the terms of the offer to settle, the plaintiff is entitled to partial indemnity costs to the date the offer was served and the defendant is entitled to partial indemnity costs from that date, unless the court orders otherwise.",
);

const S_MUNICIPAL_44_2_ALL_DAMAGES: RuleCitation = {
  sourceId: "municipal-act-2001",
  pinpoint: "s. 44 (2)",
  quote:
    "A municipality that defaults in complying with subsection (1) is, subject to the Negligence Act, liable for all damages any person sustains because of the default.",
};

const S_MUNICIPAL_44_10_B_JOINT: RuleCitation = {
  sourceId: "municipal-act-2001",
  pinpoint: "s. 44 (10) (b)",
  quote:
    "(b) if the claim is against two or more municipalities jointly responsible for the repair of the highway or bridge, the clerk of each of the municipalities.",
};

const S_CLPA_18_2_PARTICULARS: RuleCitation = {
  sourceId: "crown-liability-and-proceedings-act-2019",
  pinpoint: "s. 18 (2)",
  quote:
    "The Attorney General may require such additional particulars as in his or her opinion are necessary to enable the claim to be investigated.",
};

const RCP_3_01_D_LATE_SERVICE = rcp(
  "r. 3.01 (1) (d)",
  "(d) service of a document, other than an originating process, made after 4 p.m. or at any time on a holiday shall be deemed to have been made on the next day that is not a holiday.",
);

const RCP_27_03_ISSUE_NEW_PARTY = rcp(
  "r. 27.03",
  "Where a person who is not already a party to the main action is made a defendant to the counterclaim, the statement of defence and counterclaim, (a) shall be issued, (i) within the time prescribed by rule 18.01 for delivery of the statement of defence in the main action or at any time before the defendant is noted in default, or (ii) subsequently with leave of the court;",
);

const RCP_49_01_1_APPLIES = rcp(
  "r. 49.01.1",
  "This Rule applies to actions, applications and, with necessary modifications, motions, counterclaims, crossclaims and third or subsequent party claims.",
);

const RCP_50_02_WINDOW = rcp(
  "r. 50.02 (2.1)",
  "Unless otherwise provided by a court order or applicable practice direction, a pre-trial conference shall be scheduled for a date that is not more than 120 days and not less than 30 days before the later of the following dates: 1. The first day fixed for the trial. 2. The first day of the sitting during which the trial is expected to be held.",
);

const RCP_62_01_APPEAL_RECORD = rcp(
  "r. 62.01 (7)",
  "The appellant shall, not later than seven days before the hearing, serve on every other party and file, with proof of service, in the court office where the appeal is to be heard, an appeal record containing, ... and a factum that meets the requirements of rule 4.06.1.",
);

const RCP_62_01_RESPONDENT_FACTUM = rcp(
  "r. 62.01 (8)",
  "The respondent shall serve on every other party, at least four days before the hearing, (a) a factum that meets the requirements of rule 4.06.1; and (b) any further material that was before the judge or officer appealed from and is necessary for the hearing of the appeal.",
);

const RCP_62_01_RESPONDENT_FILE = rcp(
  "r. 62.01 (8.1)",
  "The respondent's factum, and any further material, shall be filed with proof of service in the court office where the appeal is to be heard, at least four days before the hearing.",
);

const RCP_61_03_1_RESPONDING_25_DAYS = rcp(
  "r. 61.03.1 (10)",
  "Within 25 days after service of the moving party's motion record and other documents, the responding party shall file the factum and any motion record and book of authorities, with proof of service.",
);

const RCP_61_05_RESPONDENT_CERTIFICATE = rcp(
  "r. 61.05 (2)",
  "Within fifteen days after service of the appellant's certificate, the respondent shall serve on the appellant, and file with proof of service, a respondent's certificate respecting evidence (Form 61D), confirming the appellant's certificate or setting out any additions to or deletions from it.",
);

const RCP_61_05_DEEMED_CONFIRMED = rcp(
  "r. 61.05 (3)",
  "A respondent who fails to serve and file a respondent's certificate within the prescribed time shall be deemed to have confirmed the appellant's certificate.",
);

const RCP_61_05_TRANSCRIPT_ORDERED = rcp(
  "r. 61.05 (5)",
  "The appellant shall within thirty days after filing the notice of appeal file proof that the appellant has ordered a transcript of all oral evidence that the parties have not agreed to omit, subject to any direction under subrule 61.09 (4) (relief from compliance).",
);

const RCP_61_09_PERFECT = rcp(
  "r. 61.09 (1)",
  "The appellant shall perfect the appeal by complying with subrules (2) and (3), (a) where no transcript of evidence is required for the appeal, within thirty days after filing the notice of appeal; or (b) where a transcript of evidence is required for the appeal, within 60 days after receiving notice that the evidence has been transcribed.",
);

const RCP_61_12_RESPONDENT_FACTUM = rcp(
  "r. 61.12 (2)",
  "The respondent's factum and compendium shall be delivered within 60 days after service of the appeal book and compendium, exhibit book, transcript of evidence, if any, and appellant's factum.",
);

const RCP_61_13_MOTION = rcp(
  "r. 61.13 (1)",
  "Where an appellant has not, (a) filed proof that a transcript of evidence that the parties have not agreed to omit was ordered within the time prescribed by subrule 61.05 (5); or (b) perfected the appeal within the time prescribed by subrule 61.09 (1), the respondent may make a motion to the Registrar, on ten days notice to the appellant, to have the appeal dismissed for delay.",
);

const RCP_61_13_REGISTRAR_ONE_YEAR = rcp(
  "r. 61.13 (2)",
  "Where the appellant has not, (a) filed a transcript of evidence within 60 days after the Registrar received notice that the evidence has been transcribed; or (b) perfected the appeal within one year after filing the notice of appeal, the Registrar may serve notice on the appellant that the appeal will be dismissed for delay unless it is perfected within ten days after service of the notice.",
);

const RCP_61_13_REGISTRAR_NOTICE = rcp(
  "r. 61.13 (2.1)",
  "Where no transcript of evidence is required for the appeal and the appellant has not perfected it within the time prescribed by subrule 61.09 (1), the Registrar may serve notice on the appellant that the appeal will be dismissed for delay unless it is perfected within 10 days after service of the notice.",
);

const RCP_61_13_DISMISS = rcp(
  "r. 61.13 (3)",
  "Where the appellant does not cure the default, (a) in the case of a motion under subrule (1), before the hearing of the motion; or (b) in the case of a notice under subrule (2) or (2.1), within ten days after service of the notice, or within such longer period as a judge of the appellate court allows, the Registrar shall make an order in (Form 61I) dismissing the appeal for delay, with costs fixed at $750, despite rule 58.13 and shall serve the order on the parties.",
);

const S_LIM_13_11_PART_PAYMENT = lim(
  "s. 13 (11)",
  "In the case of a claim for payment of a liquidated sum, part payment of the sum by the person against whom the claim is made or by the person's agent has the same effect as the acknowledgment referred to in subsection (10).",
);

const S_LIM_5_3_DEMAND = lim(
  "s. 5 (3)",
  "For the purposes of subclause (1) (a) (i), the day on which injury, loss or damage occurs in relation to a demand obligation is the first day on which there is a failure to perform the obligation, once a demand for the performance is made.",
);

const S_LIM_19_1_SCHEDULE = lim(
  "s. 19 (1)",
  "A limitation period set out in or under another Act that applies to a claim to which this Act applies is of no effect unless, (a) the provision establishing it is listed in the Schedule to this Act;",
);

const S_LIM_SCHEDULE_LIBEL = lim("Schedule", "LIBEL AND SLANDER ACT |SECTION 6 |");

const S_LS_8_1_NEWSPAPER_NAMES: RuleCitation = {
  sourceId: "libel-and-slander-act",
  pinpoint: "s. 8 (1)",
  quote:
    "No defendant in an action for a libel in a newspaper is entitled to the benefit of sections 5 and 6 unless the names of the proprietor and publisher and the address of publication are stated either at the head of the editorials or on the front page of the newspaper.",
};

const RCP_15_01_CORPORATION_LAWYER = rcp(
  "r. 15.01 (2)",
  "A party to a proceeding that is a corporation shall be represented by a lawyer, except with leave of the court.",
);

const RCP_20_01_PLAINTIFF = rcp(
  "r. 20.01 (1)",
  "A plaintiff may, after the defendant has delivered a statement of defence or served a notice of motion, move with supporting affidavit material or other evidence for summary judgment on all or part of the claim in the statement of claim.",
);

const RCP_20_01_DEFENDANT = rcp(
  "r. 20.01 (3)",
  "A defendant may, after delivering a statement of defence, move with supporting affidavit material or other evidence for summary judgment dismissing all or part of the claim in the statement of claim.",
);

const RCP_20_02_RESPONDING_EVIDENCE = rcp(
  "r. 20.02 (2)",
  "In response to affidavit material or other evidence supporting a motion for summary judgment, a responding party may not rest solely on the allegations or denials in the party's pleadings, but must set out, in affidavit material or other evidence, specific facts showing that there is a genuine issue requiring a trial.",
);

const RCP_20_03_FACTUMS = rcp(
  "r. 20.03 (1)",
  "On a motion for summary judgment, each party shall serve on every other party to the motion a factum that meets the requirements of rule 4.06.1.",
);

const RCP_20_03_MOVING = rcp(
  "r. 20.03 (2)",
  "The moving party's factum shall be served and filed with proof of service in the court office where the motion is to be heard at least seven days before the hearing.",
);

const RCP_20_03_RESPONDING = rcp(
  "r. 20.03 (3)",
  "The responding party's factum shall be served and filed with proof of service in the court office where the motion is to be heard at least four days before the hearing.",
);

const RCP_20_04_TEST = rcp(
  "r. 20.04 (2)",
  "The court shall grant summary judgment if, (a) the court is satisfied that there is no genuine issue requiring a trial with respect to a claim or defence; or (b) the parties agree to have all or part of the claim determined by a summary judgment and the court is satisfied that it is appropriate to grant summary judgment.",
);

const RCP_49_11_JOINT = rcp(
  "r. 49.11",
  "Where there are two or more defendants, the plaintiff may offer to settle with any defendant and any defendant may offer to settle with the plaintiff, but where the defendants are alleged to be jointly or jointly and severally liable to the plaintiff in respect of a claim and rights of contribution or indemnity may exist between the defendants, the costs consequences prescribed by rule 49.10 do not apply to an offer to settle unless,",
);

const RCP_37_10_RESPONDING_RECORD_FULL = rcp(
  "r. 37.10 (3)",
  "Where a motion record is served a responding party who is of the opinion that it is incomplete may serve on every other party, and file, with proof of service, in the court office where the motion is to be heard, at least four days before the hearing, a responding party's motion record containing, ... (b) a copy of any material to be used by the responding party on the motion and not included in the motion record.",
);

const RCP_3_01_SCOPE = rcp(
  "r. 3.01 (1)",
  "In the computation of time under these rules or an order, except where a contrary intention appears,",
);

const RCP_47_01_JURY = rcp(
  "r. 47.01",
  "A party to an action may require that the issues of fact be tried or the damages be assessed, or both, by a jury, by delivering a jury notice (Form 47A) at any time before the close of pleadings, unless section 108 of the Courts of Justice Act or another statute requires that the action be tried without a jury.",
);

const RCP_76_02_1_NO_JURY = rcp(
  "r. 76.02.1 (1)",
  "An action that is proceeding under this Rule shall not be tried with a jury and, subject to subrule (2), no party to the action may deliver a jury notice under rule 47.01.",
);

const RCP_76_02_1_JURY_EXCEPTIONS = rcp(
  "r. 76.02.1 (2)",
  "A party to an action that is proceeding under this Rule may deliver a jury notice under rule 47.01 if the action involves a claim for relief arising from one of the following: 1. Slander. 2. Libel. 3. Malicious arrest. 4. Malicious prosecution. 5. False imprisonment.",
);

const RCP_28_05_DEFENCE_TO_CROSSCLAIM = rcp(
  "r. 28.05 (1)",
  "Subject to subrule (2), a defence to crossclaim (Form 28B) shall be delivered within twenty days after service of the statement of defence and crossclaim.",
);

const RCP_28_05_NOT_REQUIRED = rcp(
  "r. 28.05 (2)",
  "Where, (a) a crossclaim contains no claim other than a claim for contribution or indemnity under the Negligence Act; (b) the defendant to the crossclaim has delivered a statement of defence in the main action; and (c) the defendant to the crossclaim in response to the crossclaim relies on the facts pleaded in the defendant's statement of defence in the main action and not on a different version of the facts or on any matter that might, if not specifically pleaded, take the crossclaiming defendant by surprise, the defendant to the crossclaim need not deliver a defence to the crossclaim",
);

const RCP_28_07_CROSSCLAIM_DEFAULT = rcp(
  "r. 28.07",
  "Where a defendant against whom a crossclaim is made is noted in default in respect of the crossclaim, the crossclaiming defendant may obtain judgment against the other defendant only at the trial of the main action or on motion to a judge.",
);

const RCP_19_09_FULL = rcp(
  "r. 19.09",
  "Rules 19.01 to 19.08 apply, with necessary modifications, to counterclaims, crossclaims and third party claims, subject to rules 28.07 (default of defence to crossclaim) and 29.07 (default of defence to third party claim).",
);

const RCP_23_01_DISCONTINUE = rcp(
  "r. 23.01 (1)",
  "A plaintiff may discontinue all or part of an action against any defendant, (a) before the close of pleadings, by serving on all parties who have been served with the statement of claim a notice of discontinuance (Form 23A) and filing the notice with proof of service; (b) after the close of pleadings, with leave of the court; or (c) at any time, by filing the consent of all parties.",
);

const RCP_23_02_COUNTERCLAIM_ELECTION = rcp(
  "r. 23.02",
  "Where an action is discontinued against a defendant who has counterclaimed, the defendant may deliver within thirty days after the discontinuance a notice of election to proceed with the counterclaim (Form 23B), and if the defendant fails to do so, the counterclaim shall be deemed to be discontinued without costs.",
);

const RCP_27_06_REPLY_TO_DEFENCE_TO_COUNTERCLAIM = rcp(
  "r. 27.06",
  "A reply to defence to counterclaim (Form 27D), if any, shall be delivered within ten days after service of the defence to counterclaim.",
);

const RCP_29_05_PLAINTIFF_REPLY = rcp(
  "r. 29.05 (4)",
  "The plaintiff shall deliver a reply, if any, to the third party's statement of defence in the main action within 10 days after it is served on the plaintiff.",
);

const RCP_25_06_SPECIAL_DAMAGES = rcp(
  "r. 25.06 (9)",
  "(b) the amounts and particulars of special damages need only be pleaded to the extent that they are known at the date of the pleading, but notice of any further amounts and particulars shall be delivered forthwith after they become known and, in any event, not less than ten days before trial.",
);

const RCP_53_07_ADVERSE_WITNESS = rcp(
  "r. 53.07 (2)",
  "A party may secure the attendance of a person referred to in subrule (1) as a witness at a trial, (a) by serving the person with a summons to witness, or by serving on the adverse party or the lawyer for the adverse party, at least 10 days before the commencement of the trial, a notice of intention to call the person as a witness; and (b) by paying or tendering attendance money calculated in accordance with Tariff A at the same time.",
);

const RCP_53_07_WHO = rcp(
  "r. 53.07 (1)",
  "Subrules (2) to (7) apply in respect of the following persons: 1. An adverse party. 2. An officer, director, employee or sole proprietor of an adverse party. 3. A partner of a partnership that is an adverse party.",
);

const RCP_16_06_MAIL_FIFTH_DAY = rcp(
  "r. 16.06 (2)",
  "Service of a document by mail, except under subrule 16.03 (4), is effective on the fifth day after the document is mailed but the document may be filed with proof of service before service becomes effective.",
);

const RCP_29_01_FULL = rcp(
  "r. 29.01",
  "A defendant may commence a third party claim against any person who is not a party to the action and who, (a) is or may be liable to the defendant for all or part of the plaintiff's claim; (b) is or may be liable to the defendant for an independent claim for damages or other relief arising out of, (i) a transaction or occurrence or series of transactions or occurrences involved in the main action, or (ii) a related transaction or occurrence or series of transactions or occurrences; or (c) should be bound by the determination of an issue arising between the plaintiff and the defendant.",
);

const S_LIM_18_1_CONTRIBUTION = lim(
  "s. 18 (1)",
  "For the purposes of subsection 5 (2) and section 15, in the case of a claim by one alleged wrongdoer against another for contribution and indemnity, the day on which the first alleged wrongdoer was served with the claim in respect of which contribution and indemnity is sought shall be deemed to be the day the act or omission on which that alleged wrongdoer's claim is based took place.",
);

const RCP_24_1_13_REFER = rcp(
  "r. 24.1.13 (1)",
  "When a certificate of non-compliance is filed, the mediation co-ordinator shall refer the matter to a judge or associate judge.",
);

const RCP_37_10_RECORD_CONTENTS = rcp(
  "r. 37.10 (2)",
  "(c) a copy of all affidavits and other material served by any party for use on the motion;",
);

const S_CJA_19_1_C_ASSOCIATE_FINAL = cja(
  "s. 19 (1) (c)",
  "(c) a final order of a master, case management master or associate judge.",
);

const RCP_23_05_COSTS = rcp(
  "r. 23.05 (1)",
  "If all or part of an action is discontinued, any party to the action may, within thirty days after the action is discontinued, make a motion respecting the costs of the action.",
);

const RCP_24_05_1_COSTS = rcp(
  "r. 24.05.1 (1)",
  "If an action is dismissed for delay, any party to the action may, within thirty days after the dismissal, make a motion respecting the costs of the action.",
);

const RCP_29_05_BOUND = rcp(
  "r. 29.05 (5)",
  "A third party who does not deliver a statement of defence in the main action is bound by any order or determination made in the main action between the plaintiff and the defendant who made the third party claim.",
);

function discontinuanceCosts(id: string): StageDeadline {
  return {
    id,
    what: "If you want the court to deal with the costs of the discontinued action, make a motion about the costs",
    countFrom: "the day the action was discontinued",
    countFromEvent: "action-discontinued",
    length: { unit: "days", count: 30 },
    regime: "civil-rules",
    rule: RCP_23_05_COSTS,
    computation: RCP_3_01_COUNT,
    consequence: "changes-what-happens-next",
    qualifier:
      "Any party to the action can make this motion. It applies whether all or part of the action was discontinued. If a crossclaim or third party claim is treated as dismissed, a costs motion about it can be made within 30 days after that deemed dismissal. The time can be extended by filing a consent, or by the court.",
    exceptions: [RCP_23_05_DEEMED_COSTS, RCP_3_02_CONSENT, RCP_3_02_EXTEND],
  };
}

const RCP_23_01_DISABILITY = rcp(
  "r. 23.01 (2)",
  "If a party to an action is under disability, the action may be discontinued by or against the party only with leave of a judge obtained on motion under rule 7.07.1.",
);

const RCP_23_04_NOT_A_DEFENCE = rcp(
  "r. 23.04 (1)",
  "The discontinuance of all or part of an action is not a defence to a subsequent action, unless the order giving leave to discontinue or a consent filed by the parties provides otherwise.",
);

const RCP_23_04_STAY = rcp(
  "r. 23.04 (2)",
  "Where a plaintiff has discontinued and is liable for costs of an action, and another action involving the same subject matter is subsequently brought between the same parties or their representatives or successors in interest before payment of the costs of the discontinued action, the court may order a stay of the subsequent action until the costs of the discontinued action have been paid.",
);

const RCP_15_04_CORPORATION = rcp(
  "r. 15.04 (12)",
  "If an order is made removing from the record a lawyer acting for a corporation, the corporation shall, within 30 days after being served with the order, (a) appoint a new lawyer of record by serving a notice in Form 15B under subrule 15.03 (2); or (b) obtain and serve on every other party an order under subrule 15.01 (2) granting it leave to be represented by a person other than a lawyer.",
);

const RCP_15_04_CORPORATION_FAILS = rcp(
  "r. 15.04 (13)",
  "If the corporation fails to comply with subrule (12), (a) the court may dismiss its proceeding or strike out its defence; and (b) in an appeal, (i) a judge of the appellate court may, on motion, dismiss the corporation's appeal, or (ii) the court hearing the appeal may deny it the right to be heard.",
);

const RCP_15_04_REPRESENTATIVE = rcp(
  "r. 15.04 (14)",
  "If an order is made removing from the record a lawyer acting for a party who acts in a representative capacity or who is under disability, the party acting in a representative capacity or the litigation guardian of the party under disability shall, within 30 days after being served with the order, appoint a new lawyer of record by serving a notice in Form 15B under subrule 15.03 (2).",
);

const RCP_15_04_OTHER_CLIENTS = rcp(
  "r. 15.04 (16)",
  "If an order is made removing from the record a lawyer for a client to whom subrules (12) and (14) do not apply, the client shall, within 30 days after being served with the order, (a) appoint a new lawyer of record by serving a notice in Form 15B under subrule 15.03 (2); or (b) serve a notice of intention to act in person (Form 15C) under subrule 15.03 (3).",
);

const RCP_15_04_OTHER_FAILS = rcp(
  "r. 15.04 (17)",
  "If a client to whom subrule (16) applies fails to comply with that subrule, (a) the court may dismiss the client's proceeding or strike out the client's defence; and (b) in an appeal, (i) a judge of the appellate court may, on motion, dismiss the client's appeal, or (ii) the court hearing the appeal may deny the client the right to be heard.",
);

const RCP_23_03_DEEMED_DISMISSED = rcp(
  "r. 23.03 (1)",
  "Where an action is discontinued against a defendant who has crossclaimed or made a third party claim, the crossclaim or third party claim shall be deemed to be dismissed thirty days after the discontinuance unless the court orders otherwise during the thirty-day period.",
);

const RCP_61_07_FILE_CROSS_APPEAL = rcp(
  "r. 61.07 (2)",
  "The notice of cross-appeal, with proof of service, shall be filed in the office of the Registrar within ten days after service.",
);

const RCP_61_12_CROSS_APPEAL_FACTUM = rcp(
  "r. 61.12 (6) (b)",
  "(b) the appellant shall deliver a factum as a respondent to the cross-appeal within 10 days after service of the respondent's factum.",
);

const S_MUNICIPAL_44_1_REPAIR: RuleCitation = {
  sourceId: "municipal-act-2001",
  pinpoint: "s. 44 (1)",
  quote:
    "The municipality that has jurisdiction over a highway or bridge shall keep it in a state of repair that is reasonable in the circumstances, including the character and location of the highway or bridge.",
};

const S_CLPA_17_1_MISFEASANCE: RuleCitation = {
  sourceId: "crown-liability-and-proceedings-act-2019",
  pinpoint: "s. 17 (1)",
  quote:
    "This section applies to proceedings brought against the Crown or an officer or employee of the Crown that include a claim in respect of a tort of misfeasance in public office or a tort based on bad faith respecting anything done in the exercise or intended exercise of the officer or employee's powers or the performance or intended performance of the officer or employee's duties or functions.",
};

const S_CLPA_17_2_LEAVE: RuleCitation = {
  sourceId: "crown-liability-and-proceedings-act-2019",
  pinpoint: "s. 17 (2)",
  quote:
    "A proceeding to which this section applies that is brought on or after the day section 1 of Schedule 7 to the Smarter and Stronger Justice Act, 2020 comes into force may proceed only with leave of the court and, unless and until leave is granted, is deemed to have been stayed in respect of all claims in that proceeding from the time that it is brought.",
};

const RCP_28_08_REPLY = rcp(
  "r. 28.08",
  "A reply to defence to crossclaim (Form 28C), if any, shall be delivered within ten days after service of the defence to crossclaim.",
);

const RCP_29_04_REPLY = rcp(
  "r. 29.04",
  "A reply to third party defence (Form 29C), if any, shall be delivered within ten days after service of the third party defence.",
);

const RCP_50_03_1_EXTENSION = rcp("r. 50.03.1 (2)", "Subrule (1) applies regardless of any extension of the time to file the report.");

const RCP_50_03_1_EXPERTS = rcp(
  "r. 50.03.1 (1)",
  "and, if so, for each expert, (a) whether the report of the expert required by subrule 53.03 (1) or (2), as the case may be, was served on the other parties within the time specified by that subrule; and (b) if the expert's report was not served on the other parties within the time specified by subrule 53.03 (1) or (2), the reason why.",
);

const RCP_76_10_TRIAL_PLANNING = rcp(
  "r. 76.10 (5) (b)",
  "The pre-trial conference judge or associate judge shall, ... (b) fix dates for the delivery of any witness affidavits, including any outstanding expert affidavits;",
);

const RCP_26_05_RESPOND = rcp(
  "r. 26.05 (1)",
  "A party shall respond to an amended pleading within the time remaining for responding to the original pleading, or within ten days after service of the amended pleading, whichever is the longer period, unless the court orders otherwise.",
);

const RCP_26_05_DEEMED = rcp(
  "r. 26.05 (2)",
  "A party who has responded to a pleading that is subsequently amended and does not respond to the amended pleading within the prescribed time shall be deemed to rely on the party's original pleading in answer to the amended pleading.",
);

const S_LS_8_3_BROADCAST: RuleCitation = {
  sourceId: "libel-and-slander-act",
  pinpoint: "s. 8 (3)",
  quote:
    "Where a person, by registered letter containing the person's address and addressed to a broadcasting station, alleges that a libel against the person has been broadcast from the station and requests the name and address of the owner or operator of the station or the names and addresses of the owner and the operator of the station, sections 5 and 6 do not apply with respect to an action by such person against such owner or operator for the alleged libel unless the person whose name and address are so requested delivers the requested information to the first-mentioned person, or mails it by registered letter addressed to the person, within ten days from the date on which the first-mentioned registered letter is received at the broadcasting station.",
};

const S_LIM_15_4_C_MISLEADS = lim(
  "s. 15 (4) (c)",
  "(c) the person against whom the claim is made, (i) wilfully conceals from the person with the claim the fact that injury, loss or damage has occurred, that it was caused by or contributed to by an act or omission or that the act or omission was that of the person against whom the claim is made, or (ii) wilfully misleads the person with the claim as to the appropriateness of a proceeding as a means of remedying the injury, loss or damage.",
);

const S_LIM_15_5_BURDEN = lim("s. 15 (5)", "The burden of proving that subsection (4) applies is on the person with the claim.");

const RCP_23_05_DEEMED_COSTS = rcp(
  "r. 23.05 (2)",
  "If a crossclaim or third party claim is deemed to be dismissed, any party to the crossclaim or third party claim may, within thirty days after the deemed dismissal, make a motion respecting the costs of the crossclaim or third party claim.",
);

const RCP_24_01_MUST_DISMISS = rcp(
  "r. 24.01 (2)",
  "The court shall, subject to subrule 24.02 (2), dismiss an action for delay if either of the circumstances described in paragraphs 1 and 2 of subrule 48.14 (1) applies to the action, unless the plaintiff demonstrates that dismissal of the action would be unjust.",
);

const RCP_24_02_DISABILITY = rcp(
  "r. 24.02 (1)",
  "Where the plaintiff is under disability, notice of a motion to dismiss an action for delay shall be served on the plaintiff's litigation guardian and, if the litigation guardian is not the Children's Lawyer or the Public Guardian and Trustee, (a) on the Children's Lawyer, if the plaintiff is a minor; or (b) on the Public Guardian and Trustee, in any other case.",
);

// =====================================================================
// Deadlines used on more than one stage
// =====================================================================

/*
 * The review's first finding: "2 years, counted from the day the claim was
 * discovered" reads as "the day I found out". s. 5 (1) makes it the EARLIER of
 * actual knowledge and when a reasonable person ought to have known, s. 5 (2)
 * presumes knowledge on the day of the act, and s. 15 (2) is a separate 15-year
 * cap. All three are said here, generally, with the full text in `exceptions`.
 */
const LIMITATION_QUALIFIER =
  "This applies unless the Limitations Act, 2002 says otherwise. For example, a claim based on a sexual assault has no time limit. A claim is discovered on the earlier of two days. The first is the day you knew four things: you had a loss, an act or omission caused it, whose act or omission it was, and that a court case was a proper way to fix it. The second is the day a reasonable person in your place ought to have known those things. You are presumed to have known them on the day of the act or omission, unless you prove otherwise. Separately, no case can start more than 15 years after the act or omission, except in some cases the Act lists. Some other Acts, listed in a schedule to the Limitations Act, set shorter times. For example, a case for libel in an Ontario newspaper or broadcast must start within three months after you learned of the libel.";

const LIMITATION_SUSPENSIONS =
  " The two years do not run while the person with the claim is a minor and has no litigation guardian. They also do not run while a physical, mental or psychological condition keeps the person from starting a case, and they have no litigation guardian. A person is presumed able to start a case unless shown otherwise. If that condition ends with less than six months left, the time runs to six months after it ends. The 15 years also do not run while the other side wilfully hides from you that the loss happened, that an act or omission caused it, or that it was theirs. Nor do they run while the other side wilfully misleads you about whether a court case is a proper way to fix it. You must prove this. The two years and the 15 years also stop while the parties have agreed to have an independent third party resolve the claim or help resolve it. The other side may admit in writing, and sign, that they owe a fixed sum of money. The same goes for an admission that they must return personal property. It also goes for enforcing a charge on personal property, or relief from that. Then the act or omission is treated as happening on the day of that admission. This counts only if it was made before the time ran out. It must be made to you, your agent, or an official receiver or trustee under the Bankruptcy and Insolvency Act (Canada). For a fixed sum of money, a part payment by the other side or their agent works the same way as a written, signed admission. For a debt payable on demand, the loss happens on the first day it is not paid after a demand for payment.";

function basicLimitation(id: string, withSuspensions = false): StageDeadline {
  return {
    id,
    what: "The general deadline to start a court case",
    qualifier: LIMITATION_QUALIFIER + (withSuspensions ? LIMITATION_SUSPENSIONS : ""),
    countFrom: "the day the claim was discovered",
    countFromEvent: "claim-discovered",
    length: { unit: "years", count: 2 },
    regime: "legislation-act",
    rule: C.S_LIMITATIONS_4_BASIC,
    computation: C.S_LEGISLATION_89_7_LEAP,
    consequence: "bars-the-claim",
    exceptions: [
      S_LIM_5_1_FULL,
      S_LIMITATIONS_5_PRESUMPTION,
      C.S_LIMITATIONS_16_NONE,
      S_LIMITATIONS_15_ULTIMATE,
      S_LIM_15_4_NOT_RUN,
      S_LIM_19_1_SCHEDULE,
      S_LIM_SCHEDULE_LIBEL,
      C.S_LS_6_LIMITATION,
      C.S_LS_7_SCOPE,
      ...(withSuspensions
        ? [
            S_LIM_6_MINORS,
            S_LIM_7_1_INCAPABLE,
            S_LIM_7_2_PRESUMED_CAPABLE,
            S_LIM_7_3_SIX_MONTHS,
            S_LIM_11_1_RESOLUTION,
            S_LIM_13_1_ACKNOWLEDGMENT,
            S_LIM_13_9_BEFORE_EXPIRY,
            S_LIM_13_10_WRITING,
            S_LIM_13_11_PART_PAYMENT,
            S_LIM_5_3_DEMAND,
            S_LIM_15_4_C_MISLEADS,
            S_LIM_15_5_BURDEN,
          ]
        : []),
    ],
  };
}

/*
 * r. 48.14 (1) is "subject to subrules (4) to (8)", and (1.1) takes two kinds
 * of action out entirely. Every one of those is a way the dismissal does not
 * happen, so every one is in the qualifier. Without them a plaintiff with a
 * signed timetable on file would be told the registrar is about to dismiss.
 */
const REGISTRAR_DISMISSAL_QUALIFIER =
  "This does not apply if the action has already ended some other way. It does not apply if a party files a timetable signed by all parties, and a draft order, at least 30 days before the time ends. The timetable must give a date, no more than two years after the time ends, by which the action will be set down or restored. If the parties do not agree on a timetable, any party can ask for a status hearing before the time ends. It does not apply if you are under a disability at that time. It does not apply to Commercial List actions or class actions. The court can order otherwise. A dismissal can be set aside on a motion under rule 37.14.";

const REGISTRAR_DISMISSAL_QUALIFIER_BOTH = REGISTRAR_DISMISSAL_QUALIFIER.replace(
  "if you are under a disability",
  "if the plaintiff is under a disability",
);

const REGISTRAR_DISMISSAL_EXCEPTIONS = [
  RCP_48_14_EXCLUDED,
  RCP_48_14_TIMETABLE,
  RCP_48_14_STATUS_HEARING,
  RCP_48_14_DISABILITY,
  RCP_48_14_SET_ASIDE,
];

function fiveYearDismissal(id: string, bothSides = false): StageDeadline {
  return {
    id,
    what: bothSides
      ? "If you are the plaintiff, set the action down for trial, or the registrar will dismiss it for delay"
      : "Set the action down for trial, or the registrar will dismiss it for delay",
    countFrom: "the day the action was started",
    countFromEvent: "action-commenced",
    length: { unit: "years", count: 5 },
    regime: "civil-rules",
    rule: RCP_48_14_FIVE_YEARS,
    computation: C.R_RCP_3_01_HOLIDAY,
    consequence: "changes-what-happens-next",
    qualifier: bothSides ? REGISTRAR_DISMISSAL_QUALIFIER_BOTH : REGISTRAR_DISMISSAL_QUALIFIER,
    exceptions: REGISTRAR_DISMISSAL_EXCEPTIONS,
  };
}

function serveSixMonths(id: string): StageDeadline {
  return {
    id,
    what: "Serve the statement of claim on the defendant",
    countFrom: "the day the statement of claim was issued",
    countFromEvent: "claim-issued",
    length: { unit: "months", count: 6 },
    regime: "civil-rules",
    rule: RCP_14_08_SIX_MONTHS,
    computation: C.R_RCP_3_01_HOLIDAY,
    consequence: "changes-what-happens-next",
    qualifier:
      "If you started with a notice of action, serve the notice and the statement of claim together within six months after the notice was issued. The time can be extended by filing a consent. The court can also extend it, before or after the time runs out. If you do not serve the claim in time, a defendant who is not in default can ask the court to dismiss the action for delay.",
    exceptions: [
      RCP_14_08_NOTICE_OF_ACTION,
      RCP_3_02_CONSENT,
      RCP_3_02_EXTEND,
      RCP_3_02_BEFORE_OR_AFTER,
      RCP_24_01_DEFENDANT_MAY_MOVE,
    ],
  };
}

function appealDeadline(id: string, extraQualifier = "", extraExceptions: RuleCitation[] = []): StageDeadline {
  return {
    id,
    what: "If you want to appeal a final order, serve a notice of appeal with a certificate respecting evidence (Form 61C)",
    countFrom: "the day the order was made",
    countFromEvent: "order-made",
    length: { unit: "days", count: 30 },
    regime: "civil-rules",
    rule: C.R_61_04_APPEAL_30_DAYS,
    computation: C.R_RCP_3_01_HOLIDAY,
    consequence: "changes-what-happens-next",
    qualifier:
      "File the notice, with proof of service, within 10 days after you serve it. Which court hears the appeal depends on the order. Some final orders of a Superior Court judge go to the Divisional Court. These include an order to pay one sum of $50,000 or less, or payments of $50,000 or less in the first 12 months, not counting costs. They also include an order dismissing a claim for $50,000 or less. So does an order dismissing a larger claim where the judge or jury says the award would have been $50,000 or less. Other final orders of a Superior Court judge go to the Court of Appeal. A final order of an associate judge goes to the Divisional Court. An appeal only about costs, or from an order made with everyone's consent, needs leave first. Only a judge of the appeal court can extend the time." +
      extraQualifier,
    exceptions: [
      C.R_61_04_FILE_10_DAYS,
      C.R_61_05_CERTIFICATE,
      S_CJA_19_50K,
      S_CJA_6_COURT_OF_APPEAL,
      S_CJA_19_1_C_ASSOCIATE_FINAL,
      S_CJA_133_LEAVE,
      RCP_3_02_APPEALS,
      ...extraExceptions,
    ],
  };
}

function setAsideRegistrarOrder(id: string, what: string): StageDeadline {
  return {
    id,
    what,
    countFrom: "the day the order came to your attention",
    countFromEvent: "order-came-to-attention",
    length: { unit: "days", count: 0 },
    regime: "civil-rules",
    rule: RCP_37_14_SET_ASIDE_ORDER,
    computation: RCP_3_01_COUNT,
    consequence: "changes-what-happens-next",
    qualifier:
      "The rule sets no fixed number of days. Serve the notice of motion forthwith (right away) after the order comes to your attention. It must name the first available hearing date at least three days after you serve it.",
    exceptions: [RCP_37_14_POWER],
  };
}

function undertakingsDeadline(id: string): StageDeadline {
  return {
    id,
    what: "If you gave an undertaking or took a question under advisement at an examination for discovery, answer it",
    countFrom: "the day you gave that response at the examination",
    countFromEvent: "discovery-answer-given",
    length: { unit: "days", count: 60 },
    regime: "civil-rules",
    rule: RCP_31_07_FAIL,
    computation: RCP_3_01_COUNT,
    consequence: "changes-what-happens-next",
    qualifier:
      "If you do not answer in that time, you cannot use that information at trial without the trial judge's permission. You still have to keep an undertaking.",
    exceptions: [RCP_31_07_EFFECT, RCP_31_07_HONOUR],
  };
}

function simplifiedAffidavit(id: string): StageDeadline {
  return {
    id,
    what: "If your action is under the simplified procedure, serve every other party with an affidavit of documents. Include copies of the documents in its Schedule A. You pay the cost",
    countFrom: "the day pleadings closed",
    countFromEvent: "pleadings-closed",
    length: { unit: "days", count: 10 },
    regime: "civil-rules",
    rule: RCP_76_03_AFFIDAVIT,
    computation: RCP_3_01_COUNT,
    consequence: "changes-what-happens-next",
    qualifier:
      "This applies only to an action under the simplified procedure. Pleadings close when every defence has been replied to, or the time for a reply has run out, and every defendant who did not defend has been noted in default. The affidavit must also list the people who might know about the issues, unless the court orders otherwise. A person not named in it cannot be a witness at trial unless the court orders otherwise. The time can be extended by filing a consent, or by the court.",
    exceptions: [RCP_25_05_CLOSE, RCP_76_03_WITNESSES, RCP_76_03_NOT_DISCLOSED, RCP_3_02_CONSENT, RCP_3_02_EXTEND],
  };
}

function simplifiedSetDown(id: string, plaintiffOnlyStage: boolean): StageDeadline {
  return {
    id,
    what: plaintiffOnlyStage
      ? "If your action is under the simplified procedure, set it down for trial. Do this by serving a notice of readiness for pre-trial conference (Form 76C) on every party and filing it with proof of service"
      : "If you are the plaintiff, set the action down for trial. Do this by serving a notice of readiness for pre-trial conference (Form 76C) on every party and filing it with proof of service",
    countFrom: "the day the first statement of defence or notice of intent to defend was filed",
    countFromEvent: "first-defence-filed",
    length: { unit: "days", count: 180 },
    regime: "civil-rules",
    rule: RCP_76_09_SET_DOWN,
    computation: RCP_3_01_COUNT,
    consequence: "changes-what-happens-next",
    qualifier: plaintiffOnlyStage
      ? "This applies only to an action under the simplified procedure. It replaces the usual way of setting down. If you do not do it, any other party may. You must certify in the notice that there was a settlement discussion. The court can extend the time."
      : "This applies only to an action under the simplified procedure. If you are not the plaintiff, this is not your duty. If the plaintiff does not do it, any other party may. The party who sets it down must certify that there was a settlement discussion. The court can extend the time.",
    exceptions: [RCP_76_09_ANY_PARTY, RCP_76_09_CERTIFY, RCP_3_02_EXTEND],
  };
}

function discoveryPlan(id: string): StageDeadline {
  return {
    id,
    what: "If any party wants evidence through discovery, such as documents, an examination, an inspection or a medical exam, agree on a written discovery plan with the other parties",
    countFrom: "the day pleadings closed",
    countFromEvent: "pleadings-closed",
    length: { unit: "days", count: 60 },
    regime: "civil-rules",
    rule: RCP_29_1_03_TIMING,
    computation: RCP_3_01_COUNT,
    consequence: "changes-what-happens-next",
    qualifier:
      "The parties can agree to a longer time. But the plan must be agreed before anyone tries to get the evidence, if that comes first. The plan must be in writing. It must set dates for serving each party's affidavit of documents.",
    exceptions: [RCP_29_1_03_TIMING, RCP_29_1_03_CONTENTS],
  };
}

function setDownSixMonths(id: string, bothSides = false): StageDeadline {
  return {
    id,
    what: (bothSides ? "If you are the plaintiff, set" : "Set") +
      " the action down for trial. If you do not, a defendant who is not in default can ask the court to dismiss the action for delay",
    countFrom: "the day pleadings closed",
    countFromEvent: "pleadings-closed",
    length: { unit: "months", count: 6 },
    regime: "civil-rules",
    rule: RCP_24_01_DEFENDANT_MAY_MOVE,
    computation: C.R_RCP_3_01_HOLIDAY,
    consequence: "changes-what-happens-next",
    qualifier:
      "This is not an automatic dismissal. It is a motion a defendant may bring. The registrar's own dismissal comes at five years. Once you set the action down, you cannot start or continue discovery or motions without leave. If your action is covered by mandatory mediation, one party must first file with the mediation co-ordinator the notice naming the mediator and date (Form 24.1A), or the mediator's report. If your action is under the simplified procedure, it is set down another way. That is by a notice of readiness for pre-trial conference (Form 76C), within 180 days after the first defence.",
    exceptions: [RCP_48_14_FIVE_YEARS, RCP_76_09_SET_DOWN, RCP_48_04_NO_MORE_DISCOVERY, RCP_24_1_09_NOTICE_BEFORE_SET_DOWN],
  };
}

function juryNotice(id: string, afterCounterclaim = false): StageDeadline {
  return {
    id,
    what: "If you want a jury, deliver a jury notice (Form 47A) before pleadings close",
    countFrom: "the day pleadings close",
    countFromEvent: "pleadings-closed",
    length: { unit: "days", count: 0 },
    regime: "civil-rules",
    rule: RCP_47_01_JURY,
    computation: RCP_3_01_COUNT,
    consequence: "changes-what-happens-next",
    qualifier:
      (afterCounterclaim
        ? "The rule fixes no number of days. The cut-off is the close of pleadings. With a counterclaim, that is not before the defendant replies to your defence to counterclaim, or the 10 days for that reply run out. Delivering the jury notice with your defence to counterclaim avoids any doubt."
        : "The rule fixes no number of days. The cut-off is the close of pleadings. That can come 10 days after the defence if no reply is delivered.") +
      (afterCounterclaim ? "" : " If a reply is delivered sooner, pleadings close when it is delivered, as long as every defendant has delivered a defence or been noted in default.") +
      " Some statutes require a trial without a jury. A simplified procedure action cannot have a jury. The exception is a claim for slander, libel, malicious arrest, malicious prosecution or false imprisonment.",
    exceptions: [RCP_25_04_REPLY, RCP_25_05_CLOSE, RCP_27_06_REPLY_TO_DEFENCE_TO_COUNTERCLAIM, RCP_76_02_1_NO_JURY, RCP_76_02_1_JURY_EXCEPTIONS],
  };
}

function dismissalCosts(id: string): StageDeadline {
  return {
    id,
    what: "If the action was dismissed for delay, you can ask the court to deal with the costs of the action. Do this by making a motion about the costs",
    countFrom: "the day the action was dismissed",
    countFromEvent: "action-dismissed-for-delay",
    length: { unit: "days", count: 30 },
    regime: "civil-rules",
    rule: RCP_24_05_1_COSTS,
    computation: RCP_3_01_COUNT,
    consequence: "changes-what-happens-next",
    qualifier:
      "Any party to the action can make this motion. The rule's own words cover any action \"dismissed for delay\". The registrar's five-year order is a dismissal for delay. The only doubt comes from rule 48.14 (9). That rule applies the dismissal rules to a registrar's order, but it names only rules 24.03 to 24.05. So the rules' text does not settle whether this rule, 24.05.1, reaches that order. Bringing the motion within the 30 days avoids the doubt. The time can be extended by filing a consent, or by the court.",
    exceptions: [RCP_48_14_EFFECT, RCP_48_14_FIVE_YEARS, RCP_3_02_CONSENT, RCP_3_02_EXTEND],
  };
}

const DEFENCE_QUALIFIER_SERVICE =
  "If the claim was left at a home with an adult and a copy mailed, service takes effect on the fifth day after mailing. If it was mailed with an acknowledgment of receipt card, service takes effect on the day the sender gets the card back. If a corporation was served by mail to its last recorded address, service takes effect on the fifth day after mailing.";

const MEDIATION_QUALIFIER =
  "This applies only to actions that Rule 24.1 covers. For example, it covers actions started in Ottawa, Toronto or the County of Essex on or after January 1, 2010. Some kinds of action are left out. The court can exempt an action, or set a different time. The parties can put off the session by filing their written consent with the mediation co-ordinator. Some actions are covered only because they were moved to Ottawa, Toronto or Essex. For those, the 180 days do not apply, and the court can set the date. The co-ordinator assigns a mediator if, within the 180 days, they receive none of these: a notice of the mediator and date, a mediator's report, a consent, an order, or a notice of settlement.";

function mediationDeadline(id: string): StageDeadline {
  return {
    id,
    what: "If your action is covered by mandatory mediation, choose a mediator with the other parties and hold the mediation session",
    countFrom: "the day the first defence was filed",
    countFromEvent: "first-defence-filed",
    length: { unit: "days", count: 180 },
    regime: "civil-rules",
    rule: RCP_24_1_09_180_DAYS,
    computation: RCP_3_01_COUNT,
    consequence: "changes-what-happens-next",
    qualifier: MEDIATION_QUALIFIER,
    exceptions: [
      RCP_24_1_04_WHERE,
      RCP_24_1_04_NOT,
      RCP_24_1_05_EXEMPT,
      RCP_24_1_09_POSTPONE,
      RCP_24_1_09_CHOOSE,
      RCP_24_1_09_ASSIGN,
      RCP_24_1_09_TRANSFERRED,
    ],
  };
}

function simplifiedSettlementDiscussion(id: string): StageDeadline {
  return {
    id,
    what: "If your action is under the simplified procedure, meet or talk by phone with the other parties. Discuss whether all relevant documents have been shared, and whether any issue can be settled",
    countFrom: "the day the first statement of defence or notice of intent to defend was filed",
    countFromEvent: "first-defence-filed",
    length: { unit: "days", count: 60 },
    regime: "civil-rules",
    rule: RCP_76_08_SETTLEMENT_DISCUSSION,
    computation: RCP_3_01_COUNT,
    consequence: "changes-what-happens-next",
    qualifier: "This applies only to an action under the simplified procedure. The general rules for actions also apply to it, unless Rule 76 says otherwise.",
    exceptions: [RCP_76_01_OTHER_RULES],
  };
}

const THIRD_PARTY_CLAIM_DEADLINE: StageDeadline = {
  id: "deadline:civil:third-party-claim-10-days",
  what: "You can bring in someone who is not yet a party if they are or may be liable to you for all or part of the plaintiff's claim. You can also do it for a related claim, or if they should be bound by the result. To do this, issue a third party claim (Form 29A)",
  countFrom: "the day you delivered your statement of defence",
  countFromEvent: "own-defence-delivered",
  length: { unit: "days", count: 10 },
  regime: "civil-rules",
  rule: RCP_29_02_ISSUE,
  computation: RCP_3_01_COUNT,
  consequence: "changes-what-happens-next",
  qualifier:
    "You can also issue it at any time before you are noted in default. Or you can issue it within 10 days after the plaintiff delivers a reply to your defence. After that, you can issue it at any time with the plaintiff's consent or the court's leave. The court must give leave unless it would prejudice the plaintiff. You must serve it within 30 days after it is issued. The two-year limitation period still applies to your claim against the third party. For a claim for contribution and indemnity, the Limitations Act, 2002 treats the day you were served with the plaintiff's claim as the day of the act or omission.",
  exceptions: [RCP_29_01_FULL, RCP_29_02_AFTER_REPLY, RCP_29_02_CONSENT_LEAVE, RCP_29_02_SERVE, C.S_LIMITATIONS_4_BASIC, S_LIM_18_1_CONTRIBUTION],
};

// =====================================================================
// Before anything is filed
// =====================================================================

const BEFORE_FILING: CaseStage[] = [
  {
    id: "civil:before-filing:deciding-whether-to-sue",
    pathway: "civil",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "Can I sue over this in the Superior Court, and am I still in time?",
    title: "Deciding whether to start a Superior Court action",
    description:
      "Nothing has been filed. The person is working out whether the Superior Court is the place for the dispute and whether they are still in time.",
    cues: [
      "thinking about suing for more than fifty thousand",
      "is this too big for small claims",
      "should I go to superior court",
      "can I sue in superior court",
      "statement of claim superior court",
    ],
    distinguishedFrom: [
      {
        stage: "civil:plaintiff:claim-drafted-not-issued",
        by: "whether a statement of claim has actually been written up and is ready to be issued",
      },
      {
        stage: "civil:before-filing:limitation-period-may-have-passed",
        by: "whether more than two years appear to have passed since the events",
      },
      {
        stage: "civil:before-filing:notice-required-before-suing",
        by: "whether the claim is against the Ontario government, a municipality over a highway, bridge or municipal sidewalk, an occupier over snow or ice, or an Ontario newspaper or broadcaster over a libel, where written notice comes first",
      },
    ],
    rules: [
      S_CJA_23_SMALL_CLAIMS,
      C.S_MONETARY_LIMIT,
      S_CJA_23_LEAVE,
      S_CJA_23_COUNTERCLAIMS,
      RCP_14_01_1_WITHOUT_NOTICE,
      RCP_14_01_1_LEAVE_TEST,
      RCP_76_02_MANDATORY,
      C.S_LIMITATIONS_4_BASIC,
    ],
    deadlines: [basicLimitation("deadline:civil:basic-limitation")],
    requiresAffirmativeScope: true,
    forumCheckOnly: true,
  },
  {
    id: "civil:before-filing:notice-required-before-suing",
    pathway: "civil",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "Do I have to send a notice before I sue the government, the city, a property owner or a newspaper?",
    title: "A written notice is required before suing",
    description:
      "The claim is of a kind where a statute requires written notice before an action can be brought: damages from the Ontario Crown, a municipality's failure to repair a highway or bridge (including snow or ice on a municipal sidewalk), an injury from snow or ice on someone's premises, or a libel in an Ontario newspaper or broadcast.",
    cues: [
      "suing the Ontario government",
      "suing the province",
      "pothole damaged my car",
      "fell on a city sidewalk",
      "slipped on ice in a parking lot",
      "notice of claim to the Crown",
      "the newspaper printed lies about me",
      "defamed on the radio",
    ],
    distinguishedFrom: [
      {
        stage: "civil:before-filing:deciding-whether-to-sue",
        by: "whether the person being sued is the Ontario Crown, a municipality over a highway, bridge or municipal sidewalk, an occupier over snow or ice, or an Ontario newspaper or broadcaster over a libel",
      },
      {
        stage: "civil:before-filing:limitation-period-may-have-passed",
        by: "which clock is in question, a notice period or the two-year limitation period",
      },
    ],
    rules: [
      C.S_CLPA_18_1_NOTICE,
      S_CLPA_15_SERVICE,
      S_CLPA_17_1_MISFEASANCE,
      S_CLPA_17_2_LEAVE,
      C.S_CLPA_18_3_EXTENSION,
      C.S_CLPA_18_4_PROPERTY,
      S_CLPA_18_6_NULLITY,
      S_MUNICIPAL_44_1_REPAIR,
      C.S_MUNICIPAL_44_9_SIDEWALK,
      S_MUNICIPAL_44_2_ALL_DAMAGES,
      C.S_MUNICIPAL_44_10_NOTICE,
      S_MUNICIPAL_44_10_B_JOINT,
      C.S_MUNICIPAL_44_11_DEATH,
      C.S_MUNICIPAL_44_12_EXCUSE,
      C.S_TORONTO_42_6_NOTICE,
      C.S_OLA_6_1_NOTICE,
      C.S_OLA_6_1_2_WHO,
      C.S_LS_5_1_NOTICE,
      C.S_LS_6_LIMITATION,
      C.S_LS_7_SCOPE,
      S_LS_8_1_NEWSPAPER_NAMES,
      S_LS_8_3_BROADCAST,
      C.S_LIMITATIONS_4_BASIC,
      C.S_LEGISLATION_88_HOLIDAYS,
      C.S_LEGISLATION_89_1_HOLIDAY,
    ],
    deadlines: [
      {
        id: "deadline:civil:crown-notice-60-days",
        what: "If you are claiming damages from the Ontario Crown, serve a notice of claim on the Crown",
        countFrom: "the day you start the action, counting backwards",
        countFromEvent: "action-commenced",
        length: { unit: "days", count: 60 },
        direction: "before",
        regime: "legislation-act",
        rule: C.S_CLPA_18_1_NOTICE,
        computation: C.S_LEGISLATION_89_3_BETWEEN,
        consequence: "bars-the-claim",
        qualifier:
          "A claim against the Crown or a Crown officer or employee for misfeasance in public office or bad faith needs the court's leave. Until leave is given, it is stayed. Earlier is fine. Serve the notice as section 15 of the Act requires. That means leaving a copy with an employee at the Crown Law Office (Civil Law) of the Ministry of the Attorney General. The notice must give enough detail to identify the event the claim came from. The Attorney General may ask for more details to look into the claim. The 60 days count back from the day the action starts. So serving later, even because of a Sunday or holiday, leaves fewer than 60 days. An action started without the notice has no effect (it is a nullity). A claim about a duty that comes with owning, occupying, possessing or controlling property is different. Its notice must be served no later than 10 days after the event. The notice requirement does not apply to a counterclaim, crossclaim or set-off. Sometimes the notice is served before the limitation period ends, but the 60 days end after it. Then the limitation period is extended to the end of the seventh day after the 60 days.",
        exceptions: [S_CLPA_15_SERVICE, S_CLPA_17_1_MISFEASANCE, S_CLPA_17_2_LEAVE, S_CLPA_18_2_PARTICULARS, C.S_CLPA_18_4_PROPERTY, S_CLPA_8_1_B_PROPERTY, C.S_CLPA_18_3_EXTENSION, S_CLPA_18_5_COUNTERCLAIM, S_CLPA_18_6_NULLITY],
      },
      {
        id: "deadline:civil:municipal-notice-10-days",
        what: "If a municipality did not keep a highway (road) or bridge in repair and you claim damages, give written notice of the claim to the municipal clerk",
        countFrom: "the day of the injury",
        countFromEvent: "injury-occurred",
        length: { unit: "days", count: 10 },
        regime: "legislation-act",
        rule: C.S_MUNICIPAL_44_10_NOTICE,
        computation: C.S_LEGISLATION_89_3_BETWEEN,
        consequence: "bars-the-claim",
        qualifier:
          "This covers all damages a person suffers because of the failure to repair. The same section covers injury from snow or ice on a municipal sidewalk. There, the municipality is liable only for gross negligence. If you were hurt on a municipal sidewalk, this 10-day notice to the clerk may be the one that applies, not the 60-day notice to an occupier. The notice must give the date, time and place. Serve it on the clerk, or send it by registered mail. If two or more municipalities share the duty to repair the road or bridge, notify the clerk of each. In Toronto, the City of Toronto Act, 2006 sets the same 10 days, with notice to the city clerk. Missing the notice is not a bar if the injured person died from the injury. It is also not a bar if a judge finds a reasonable excuse and no prejudice to the municipality.",
        exceptions: [
          S_MUNICIPAL_44_1_REPAIR,
          C.S_MUNICIPAL_44_9_SIDEWALK,
          S_MUNICIPAL_44_2_ALL_DAMAGES,
          S_MUNICIPAL_44_10_B_JOINT,
          C.S_MUNICIPAL_44_11_DEATH,
          C.S_MUNICIPAL_44_12_EXCUSE,
          C.S_TORONTO_42_6_NOTICE,
          C.S_TORONTO_42_7_DEATH,
          C.S_TORONTO_42_8_EXCUSE,
        ],
      },
      {
        id: "deadline:civil:occupier-notice-60-days",
        what: "If you were hurt by snow or ice on someone's premises, give written notice of the claim to an occupier or to their snow-removal contractor",
        countFrom: "the day of the injury",
        countFromEvent: "injury-occurred",
        length: { unit: "days", count: 60 },
        regime: "legislation-act",
        rule: C.S_OLA_6_1_NOTICE,
        computation: C.S_LEGISLATION_89_3_BETWEEN,
        consequence: "bars-the-claim",
        qualifier:
          "The notice must give the date, time and place. Serve it in person or send it by registered mail. Missing the notice is not a bar if the injured person died from the injury. It is also not a bar if a judge finds a reasonable excuse and no prejudice to the defendant.",
        exceptions: [C.S_OLA_6_1_2_WHO, C.S_OLA_6_1_5_DEATH, C.S_OLA_6_1_6_EXCUSE],
      },
      {
        id: "deadline:civil:libel-notice-six-weeks",
        what: "If you are suing over a libel in an Ontario newspaper or broadcast, give the defendant written notice that specifies the matter you complain of",
        countFrom: "the day the libel came to your knowledge",
        countFromEvent: "libel-came-to-knowledge",
        length: { unit: "days", count: 42 },
        regime: "legislation-act",
        rule: C.S_LS_5_1_NOTICE,
        computation: C.S_LEGISLATION_89_3_BETWEEN,
        consequence: "bars-the-claim",
        qualifier:
          "The Act says six weeks, which is 42 days. Serve the notice the same way as a statement of claim, or give it to an adult at the defendant's chief office. This applies only to newspapers printed and published in Ontario, and to broadcasts from a station in Ontario. A newspaper cannot rely on it unless it prints its owner's and publisher's names and its address of publication. These must appear at the head of the editorials or on the front page. For a broadcast, you may ask the station by registered letter for the owner's or operator's name and address. If the station does not give them within ten days after it gets your letter, this does not apply against that owner or operator.",
        exceptions: [C.S_LS_7_SCOPE, S_LS_8_1_NEWSPAPER_NAMES, S_LS_8_3_BROADCAST],
      },
      {
        id: "deadline:civil:libel-action-three-months",
        what: "If you are suing over a libel in an Ontario newspaper or broadcast, start the action",
        countFrom: "the day the libel came to your knowledge",
        countFromEvent: "libel-came-to-knowledge",
        length: { unit: "months", count: 3 },
        regime: "legislation-act",
        rule: C.S_LS_6_LIMITATION,
        computation: C.S_LEGISLATION_89_6_MONTHS,
        consequence: "bars-the-claim",
        qualifier:
          "This shorter time replaces the general two years, because the Limitations Act lists it in its schedule. It applies only to newspapers printed and published in Ontario, and to broadcasts from a station in Ontario. A newspaper cannot rely on it unless it prints its owner's and publisher's names and its address of publication. These must appear at the head of the editorials or on the front page. For a broadcast, you may ask the station by registered letter for the owner's or operator's name and address. If the station does not give them within ten days after it gets your letter, this does not apply against that owner or operator.",
        exceptions: [C.S_LS_7_SCOPE, S_LS_8_1_NEWSPAPER_NAMES, S_LS_8_3_BROADCAST, S_LIM_19_1_SCHEDULE, S_LIM_SCHEDULE_LIBEL],
      },
      basicLimitation("deadline:civil:basic-limitation-notice-stage"),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:before-filing:limitation-period-may-have-passed",
    pathway: "civil",
    side: "plaintiff",
    wentWrong: true,
    userQuestion: "This happened years ago — is it too late to sue?",
    title: "The limitation period may have passed",
    description:
      "More than two years appear to have passed since the events, and when the claim was discovered has not been worked out.",
    cues: [
      "this happened three years ago",
      "am I too late to sue",
      "I only found out recently",
      "statute of limitations",
      "it was over fifteen years ago",
    ],
    distinguishedFrom: [
      {
        stage: "civil:before-filing:deciding-whether-to-sue",
        by: "whether two years have apparently passed since the events described",
      },
      {
        stage: "civil:before-filing:notice-required-before-suing",
        by: "which clock is in question, the two-year limitation period or a notice period",
      },
    ],
    // The rules that stop or postpone the clock are here because the question
    // is "is it too late?", and minority, incapacity, an agreed resolution
    // process and a written acknowledgment each change the answer.
    rules: [
      C.S_LIMITATIONS_4_BASIC,
      S_LIM_5_1_FULL,
      S_LIMITATIONS_5_PRESUMPTION,
      S_LIM_6_MINORS,
      S_LIM_7_1_INCAPABLE,
      S_LIM_7_2_PRESUMED_CAPABLE,
      S_LIM_7_3_SIX_MONTHS,
      S_LIM_11_1_RESOLUTION,
      S_LIM_13_1_ACKNOWLEDGMENT,
      S_LIM_13_9_BEFORE_EXPIRY,
      S_LIM_13_10_WRITING,
      S_LIM_13_11_PART_PAYMENT,
      S_LIM_5_3_DEMAND,
      S_LIM_19_1_SCHEDULE,
      S_LIMITATIONS_15_ULTIMATE,
      S_LIM_15_4_NOT_RUN,
      S_LIM_15_4_C_MISLEADS,
      S_LIM_15_5_BURDEN,
      C.S_LIMITATIONS_16_NONE,
    ],
    /*
     * Round 2 review: the stage had no deadline, so a reader asking "is it too
     * late?" saw neither the two years nor what stops the clock. The deadline
     * is shown as a period with the suspensions; nothing here computes a date
     * from the reader's facts (claim-discovered is never asked).
     */
    deadlines: [basicLimitation("deadline:civil:basic-limitation-may-have-passed", true)],
    requiresAffirmativeScope: true,
    forumCheckOnly: true,
  },
];

// =====================================================================
// Plaintiff
// =====================================================================

const PLAINTIFF: CaseStage[] = [
  {
    id: "civil:plaintiff:claim-drafted-not-issued",
    pathway: "civil",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "How do I start my action in the Superior Court?",
    title: "Statement of claim prepared, not yet issued",
    description:
      "A statement of claim or notice of action has been prepared but the registrar has not yet issued it.",
    cues: [
      "I wrote my statement of claim",
      "form 14A",
      "how do I get my claim issued",
      "notice of action",
      "simplified procedure",
    ],
    distinguishedFrom: [
      {
        stage: "civil:before-filing:deciding-whether-to-sue",
        by: "whether a statement of claim or notice of action has actually been prepared",
      },
      {
        stage: "civil:plaintiff:claim-issued-not-served",
        by: "whether the registrar has issued it and given it a court file number",
      },
    ],
    rules: [
      RCP_14_03_STATEMENT_OF_CLAIM,
      RCP_14_03_NOTICE_OF_ACTION,
      RCP_14_03_THIRTY_DAYS,
      RCP_14_07_ISSUED,
      RCP_76_02_MANDATORY,
      RCP_76_02_SAY_SO,
      S_CJA_23_LEAVE,
      RCP_14_01_1_WITHOUT_NOTICE,
      RCP_14_01_1_LEAVE_TEST,
      RCP_15_01_CORPORATION_LAWYER,
      C.S_LIMITATIONS_4_BASIC,
    ],
    deadlines: [basicLimitation("deadline:civil:basic-limitation-claim-drafted")],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:plaintiff:claim-issued-not-served",
    pathway: "civil",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "My claim was issued — how do I serve the defendant, and by when?",
    title: "Claim issued, not yet served",
    description:
      "The registrar has issued the statement of claim or notice of action. It has not yet been served on the defendant.",
    cues: [
      "my claim was issued",
      "I have a court file number",
      "how do I serve the statement of claim",
      "do I need a process server",
      "how do I serve a company",
    ],
    distinguishedFrom: [
      {
        stage: "civil:plaintiff:claim-drafted-not-issued",
        by: "whether the registrar has issued the claim",
      },
      {
        stage: "civil:plaintiff:service-attempted-failed",
        by: "whether service has been tried and failed",
      },
      {
        stage: "civil:plaintiff:served-awaiting-defence",
        by: "whether the defendant has actually been served",
      },
    ],
    rules: [
      RCP_14_08_SIX_MONTHS,
      RCP_14_08_NOTICE_OF_ACTION,
      RCP_14_03_THIRTY_DAYS,
      RCP_16_01_MANNER,
      RCP_16_02_INDIVIDUAL,
      RCP_16_02_CORPORATION,
      RCP_16_03_RESIDENCE,
      RCP_16_03_MAIL_CARD,
      RCP_16_03_CORPORATION_MAIL,
    ],
    deadlines: [
      serveSixMonths("deadline:civil:serve-claim-six-months"),
      {
        id: "deadline:civil:statement-of-claim-after-notice-of-action",
        what: "If you started with a notice of action, file your statement of claim (Form 14D)",
        countFrom: "the day the notice of action was issued",
        countFromEvent: "claim-issued",
        length: { unit: "days", count: 30 },
        regime: "civil-rules",
        rule: RCP_14_03_THIRTY_DAYS,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This applies only if you started with a notice of action. After the 30 days, you can file the statement of claim only with the defendant's written consent or the court's permission. You must ask for that permission on notice to the defendant.",
        exceptions: [RCP_14_03_THIRTY_DAYS],
      },
      fiveYearDismissal("deadline:civil:five-year-dismissal-claim-issued"),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:plaintiff:service-attempted-failed",
    pathway: "civil",
    side: "plaintiff",
    wentWrong: true,
    userQuestion: "I cannot find the defendant to serve them — what now?",
    title: "Service of the claim tried and failed",
    description:
      "The claim has been issued and serving it on the defendant has been tried without success.",
    cues: [
      "cannot find the defendant",
      "they moved and I have no address",
      "the process server could not serve them",
      "they are avoiding service",
      "substituted service",
    ],
    distinguishedFrom: [
      {
        stage: "civil:plaintiff:claim-issued-not-served",
        by: "whether service has been tried at all",
      },
      {
        stage: "civil:plaintiff:served-awaiting-defence",
        by: "whether the defendant has in fact been served",
      },
    ],
    rules: [
      RCP_16_01_MANNER,
      RCP_16_03_RESIDENCE,
      RCP_16_03_CORPORATION_MAIL,
      RCP_16_04_SUBSTITUTED,
      RCP_16_04_EFFECTIVE,
      RCP_16_04_DISPENSED,
      RCP_16_08_VALIDATING,
      RCP_3_02_EXTEND,
    ],
    deadlines: [
      serveSixMonths("deadline:civil:serve-claim-six-months:failed-service"),
      fiveYearDismissal("deadline:civil:five-year-dismissal-service-failed"),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:plaintiff:served-awaiting-defence",
    pathway: "civil",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "I served the defendant — how long do they have to respond?",
    title: "Claim served, time for defence running",
    description:
      "The defendant has been served with the statement of claim and the time to deliver a defence has not run out.",
    cues: [
      "I served the statement of claim",
      "waiting for their defence",
      "when do they have to respond",
      "they sent a notice of intent to defend",
    ],
    distinguishedFrom: [
      {
        stage: "civil:plaintiff:claim-issued-not-served",
        by: "whether the defendant has been served",
      },
      {
        stage: "civil:plaintiff:defence-period-expired-no-defence",
        by: "whether the time for the defence has run out with no defence delivered",
      },
      {
        stage: "civil:plaintiff:defence-received",
        by: "whether a statement of defence has been delivered",
      },
    ],
    rules: [RCP_18_01_DEFENCE, RCP_18_02_INTENT, RCP_18_02_TEN_MORE],
    deadlines: [
      {
        id: "deadline:civil:defence:plaintiff-view",
        what: "The defendant's time to deliver a statement of defence",
        actor: "other-party",
        countFrom: "the day the defendant was served with the statement of claim",
        countFromEvent: "served-with-claim",
        length: { unit: "days", count: 20 },
        regime: "civil-rules",
        rule: RCP_18_01_DEFENCE,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This is the time if the defendant was served in Ontario. If they were served elsewhere in Canada or in the United States, it is 40 days. If they were served anywhere else, it is 60 days. A defendant who delivers a notice of intent to defend in that time gets 10 more days. " +
          DEFENCE_QUALIFIER_SERVICE +
          " The time can be extended by filing a consent, or by the court.",
        exceptions: [
          RCP_18_02_INTENT,
          RCP_18_02_TEN_MORE,
          RCP_16_03_RESIDENCE,
          RCP_16_03_MAIL_CARD,
          RCP_16_03_CORPORATION_MAIL,
          RCP_16_06_MAIL_FIFTH_DAY,
          RCP_3_02_CONSENT,
          RCP_3_02_EXTEND,
        ],
      },
      fiveYearDismissal("deadline:civil:five-year-dismissal-awaiting-defence"),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:plaintiff:defence-period-expired-no-defence",
    pathway: "civil",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "The defendant's time is up and they never filed a defence — what can I do?",
    title: "Time for defence over, no defence delivered",
    description:
      "The time to deliver a statement of defence has run out, no defence has been delivered, and the defendant has not been noted in default.",
    cues: [
      "they never filed a defence",
      "the 20 days are up",
      "no response to my statement of claim",
      "how do I note them in default",
    ],
    distinguishedFrom: [
      {
        stage: "civil:plaintiff:served-awaiting-defence",
        by: "whether the time for the defence has run out",
      },
      {
        stage: "civil:plaintiff:defendant-noted-in-default",
        by: "whether the registrar has noted the defendant in default",
      },
    ],
    rules: [RCP_19_01_NOTING, RCP_19_01_LATE_DEFENCE, RCP_24_01_DEFENDANT_MAY_MOVE, RCP_19_04_SIGNED_JUDGMENT, RCP_19_05_MOTION],
    deadlines: [
      {
        id: "deadline:civil:note-default-30-days",
        what: "If there is more than one defendant, have the one who did not defend noted in default. Do this by filing proof of service of the statement of claim with the registrar. If you do not, a defendant who is not in default can ask the court to dismiss your action for delay",
        countFrom: "the day the defendant's time to deliver a defence ran out",
        countFromEvent: "defence-time-expired",
        length: { unit: "days", count: 30 },
        regime: "civil-rules",
        rule: RCP_24_01_DEFENDANT_MAY_MOVE,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "Only a defendant who is not in default can bring this motion. So it matters mainly where there is more than one defendant. Until a defendant is noted in default, they can still deliver a defence.",
        exceptions: [RCP_19_01_NOTING, RCP_19_01_LATE_DEFENCE],
      },
      fiveYearDismissal("deadline:civil:five-year-dismissal-defence-expired"),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:plaintiff:defendant-noted-in-default",
    pathway: "civil",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "The defendant was noted in default — how do I get judgment?",
    title: "Defendant noted in default, no judgment yet",
    description:
      "The registrar has noted the defendant in default. No judgment has been signed or granted yet.",
    cues: [
      "noted in default",
      "requisition for default judgment",
      "form 19D",
      "the registrar will not sign judgment",
      "motion for default judgment",
    ],
    distinguishedFrom: [
      {
        stage: "civil:plaintiff:defence-period-expired-no-defence",
        by: "whether the registrar has actually noted the defendant in default",
      },
      {
        stage: "civil:plaintiff:judgment-unpaid",
        by: "whether judgment has been signed or granted",
      },
    ],
    rules: [
      RCP_19_04_SIGNED_JUDGMENT,
      RCP_19_04_DECLINED,
      RCP_19_05_MOTION,
      RCP_19_05_AFFIDAVIT,
      RCP_19_06_FACTS,
      RCP_19_02_CONSEQUENCES,
    ],
    deadlines: [fiveYearDismissal("deadline:civil:five-year-dismissal-noted")],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:plaintiff:defence-received",
    pathway: "civil",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "The defendant served a statement of defence — what happens now?",
    title: "Statement of defence received",
    description:
      "The defendant has delivered a statement of defence. Pleadings may not yet be closed.",
    cues: [
      "they filed a statement of defence",
      "got their defence",
      "do I need to file a reply",
      "what happens after the defence",
    ],
    distinguishedFrom: [
      {
        stage: "civil:plaintiff:served-awaiting-defence",
        by: "whether a defence has been delivered",
      },
      {
        stage: "civil:plaintiff:served-with-counterclaim",
        by: "whether the defendant also made a counterclaim against the plaintiff",
      },
      {
        stage: "civil:both:discovery",
        by: "whether pleadings have closed and the parties have moved on to exchanging documents",
      },
      {
        stage: "civil:both:simplified-procedure-after-defence",
        by: "whether the action is under the simplified procedure, which has its own steps after the defence",
      },
    ],
    rules: [RCP_25_04_REPLY, RCP_25_05_CLOSE, RCP_47_01_JURY, RCP_29_05_PLAINTIFF_REPLY, RCP_76_02_OBJECTION, RCP_76_03_AFFIDAVIT, RCP_76_09_SET_DOWN, RCP_29_1_03_TIMING, RCP_24_1_04_WHERE, RCP_76_08_SETTLEMENT_DISCUSSION, RCP_24_1_09_180_DAYS],
    deadlines: [
      {
        id: "deadline:civil:reply-10-days",
        what: "If you want to reply to the defence, deliver a reply",
        countFrom: "the day the statement of defence was served on you",
        countFromEvent: "defence-served",
        length: { unit: "days", count: 10 },
        regime: "civil-rules",
        rule: RCP_25_04_REPLY,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "A reply is optional. If the defendant also counterclaimed, you have 20 days instead for a reply and defence to counterclaim. Deliver means serve it on the other parties and file it with proof of service. Your action may be under the simplified procedure, and the defence may object that your claim does not fit it. Then the action stays under that procedure only if your reply gives up the parts of the claim that do not fit. The time can be extended by filing a consent, or by the court.",
        exceptions: [RCP_27_05_COMBINED, RCP_1_03_DELIVER, RCP_76_02_OBJECTION, RCP_3_02_CONSENT, RCP_3_02_EXTEND],
      },
      simplifiedAffidavit("deadline:civil:simplified-affidavit-of-documents:defence-received"),
      simplifiedSettlementDiscussion("deadline:civil:simplified-settlement-discussion:defence-received"),
      simplifiedSetDown("deadline:civil:simplified-set-down-180-days:defence-received", true),
      juryNotice("deadline:civil:jury-notice:defence-received"),
      discoveryPlan("deadline:civil:discovery-plan:defence-received"),
      {
        id: "deadline:civil:reply-to-third-party-defence-10-days",
        what: "If a third party delivered a statement of defence in the main action and you want to reply to it, deliver a reply",
        countFrom: "the day the third party's statement of defence was served on you",
        countFromEvent: "third-party-defence-served",
        length: { unit: "days", count: 10 },
        regime: "civil-rules",
        rule: RCP_29_05_PLAINTIFF_REPLY,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier: "This applies only where a defendant brought in a third party who has also defended the main action. A reply is optional.",
        exceptions: [RCP_29_05_DEFEND_MAIN],
      },
      setDownSixMonths("deadline:civil:set-down-six-months-after-pleadings:defence-received"),
      mediationDeadline("deadline:civil:mediation-180-days:defence-received"),
      fiveYearDismissal("deadline:civil:five-year-dismissal-defence-received"),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:plaintiff:served-with-counterclaim",
    pathway: "civil",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "The defendant is suing me back in the same case — do I have to respond?",
    title: "Served with a statement of defence and counterclaim",
    description:
      "The defendant's statement of defence includes a counterclaim against the plaintiff.",
    cues: [
      "they counterclaimed",
      "statement of defence and counterclaim",
      "now they say I owe them",
      "defence to counterclaim",
    ],
    distinguishedFrom: [
      {
        stage: "civil:plaintiff:defence-received",
        by: "whether the defence includes a counterclaim",
      },
      {
        stage: "civil:defendant:served-defence-period-running",
        by: "whether the person is answering a counterclaim in their own action or a statement of claim brought against them",
      },
    ],
    rules: [RCP_27_05_DEFENCE_TO_COUNTERCLAIM, RCP_27_05_COMBINED, RCP_25_04_REPLY, RCP_25_05_CLOSE, RCP_27_06_REPLY_TO_DEFENCE_TO_COUNTERCLAIM, RCP_47_01_JURY, RCP_19_09_COUNTERCLAIMS, RCP_19_02_CONSEQUENCES, RCP_24_1_04_WHERE, RCP_24_1_09_180_DAYS, RCP_76_03_AFFIDAVIT, RCP_76_08_SETTLEMENT_DISCUSSION, RCP_76_09_SET_DOWN, RCP_29_1_03_TIMING, RCP_24_01_DEFENDANT_MAY_MOVE],
    deadlines: [
      {
        id: "deadline:civil:defence-to-counterclaim-20-days",
        what: "Deliver a defence to counterclaim (Form 27C)",
        countFrom: "the day the statement of defence and counterclaim was served on you",
        countFromEvent: "defendants-claim-served",
        length: { unit: "days", count: 20 },
        regime: "civil-rules",
        rule: RCP_27_05_DEFENCE_TO_COUNTERCLAIM,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "If you also deliver a reply, put both in one document called a reply and defence to counterclaim. If you do not deliver a defence to counterclaim in time, the defendant can have you noted in default on the counterclaim. You would then be treated as admitting the facts it alleges. Judgment could then be given against you on it. The time can be extended by filing a consent, or by the court.",
        exceptions: [RCP_27_05_COMBINED, RCP_19_09_COUNTERCLAIMS, RCP_19_02_CONSEQUENCES, RCP_3_02_CONSENT, RCP_3_02_EXTEND],
      },
      juryNotice("deadline:civil:jury-notice:served-with-counterclaim", true),
      simplifiedAffidavit("deadline:civil:simplified-affidavit-of-documents:served-with-counterclaim"),
      simplifiedSettlementDiscussion("deadline:civil:simplified-settlement-discussion:served-with-counterclaim"),
      simplifiedSetDown("deadline:civil:simplified-set-down-180-days:served-with-counterclaim", true),
      mediationDeadline("deadline:civil:mediation-180-days:served-with-counterclaim"),
      discoveryPlan("deadline:civil:discovery-plan:served-with-counterclaim"),
      setDownSixMonths("deadline:civil:set-down-six-months-after-pleadings:served-with-counterclaim"),
      fiveYearDismissal("deadline:civil:five-year-dismissal-served-with-counterclaim"),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:plaintiff:ready-to-set-down",
    pathway: "civil",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "How do I get my action set down for trial, and is there a deadline?",
    title: "Pleadings closed, action not yet set down for trial",
    description:
      "Pleadings are closed and the action has not been set down for trial.",
    cues: [
      "how do I set the action down for trial",
      "trial record",
      "five years",
      "the registrar may dismiss my action",
      "status hearing",
    ],
    distinguishedFrom: [
      {
        stage: "civil:both:discovery",
        by: "whether the steps before trial, such as documents and examinations, are finished",
      },
      {
        stage: "civil:both:pretrial-scheduled",
        by: "whether the action has been set down for trial",
      },
      {
        stage: "civil:plaintiff:action-dismissed-for-delay",
        by: "whether the registrar has already made an order dismissing the action",
      },
    ],
    rules: [
      RCP_48_01_WHO,
      RCP_48_02_HOW,
      RCP_48_04_NO_MORE_DISCOVERY,
      RCP_24_1_09_NOTICE_BEFORE_SET_DOWN,
      RCP_76_09_SET_DOWN,
      RCP_53_03_SCHEDULE,
      RCP_48_14_FIVE_YEARS,
      RCP_24_01_DEFENDANT_MAY_MOVE,
    ],
    deadlines: [
      setDownSixMonths("deadline:civil:set-down-six-months-after-pleadings"),
      simplifiedSetDown("deadline:civil:simplified-set-down-180-days", true),
      fiveYearDismissal("deadline:civil:five-year-dismissal-ready-to-set-down"),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:plaintiff:struck-off-trial-list",
    pathway: "civil",
    side: "plaintiff",
    wentWrong: true,
    userQuestion: "My action was struck off the trial list — how do I get it back on?",
    title: "Action struck off the trial list",
    description:
      "The action was on a trial list and has been struck off it. It has not been restored.",
    cues: [
      "struck off the trial list",
      "nobody attended the trial",
      "restore to the trial list",
      "my case was taken off the list",
    ],
    distinguishedFrom: [
      {
        stage: "civil:both:missed-trial",
        by: "whether the trial judge struck the action off the list, or went ahead and made an order without a party",
      },
      {
        stage: "civil:plaintiff:action-dismissed-for-delay",
        by: "whether the registrar has gone on to dismiss the action",
      },
    ],
    rules: [RCP_48_11_STRUCK_OFF, RCP_52_01_ALL_ABSENT, RCP_24_01_E_RESTORE, RCP_48_14_FIVE_YEARS],
    deadlines: [
      {
        id: "deadline:civil:restore-trial-list-30-days",
        what: "Bring a motion for leave to restore the action to the trial list. If you do not, a defendant who is not in default can ask the court to dismiss the action for delay",
        countFrom: "the day the action was struck off the trial list",
        countFromEvent: "struck-off-trial-list",
        length: { unit: "days", count: 30 },
        regime: "civil-rules",
        rule: RCP_24_01_E_RESTORE,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This is not an automatic dismissal. It is a motion a defendant may bring. If a judge struck the action off, the leave must come from a judge.",
        exceptions: [RCP_48_11_STRUCK_OFF],
      },
      {
        id: "deadline:civil:struck-off-two-year-dismissal",
        what: "Have the action restored to a trial list, or the registrar will dismiss it for delay",
        countFrom: "the day the action was struck off the trial list",
        countFromEvent: "struck-off-trial-list",
        length: { unit: "years", count: 2 },
        regime: "civil-rules",
        rule: RCP_48_14_FIVE_YEARS,
        computation: C.R_RCP_3_01_HOLIDAY,
        consequence: "changes-what-happens-next",
        qualifier: REGISTRAR_DISMISSAL_QUALIFIER,
        exceptions: REGISTRAR_DISMISSAL_EXCEPTIONS,
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:plaintiff:action-dismissed-for-delay",
    pathway: "civil",
    side: "plaintiff",
    wentWrong: true,
    userQuestion: "The registrar dismissed my action for delay — can I undo that?",
    title: "Action dismissed for delay by the registrar",
    description:
      "The registrar has made an order dismissing the action for delay.",
    cues: [
      "my action was dismissed for delay",
      "form 48D",
      "order dismissing action for delay",
      "the registrar dismissed my case",
    ],
    distinguishedFrom: [
      {
        stage: "civil:plaintiff:ready-to-set-down",
        by: "whether an order dismissing the action has actually been made",
      },
      {
        stage: "civil:defendant:action-dismissed-counterclaim-pending",
        by: "whether the person is the plaintiff whose action was dismissed or a defendant with a counterclaim",
      },
      {
        stage: "civil:both:judgment-given",
        by: "whether the registrar dismissed the action or a judge or associate judge dismissed it on a defendant's motion",
      },
    ],
    rules: [
      RCP_48_14_FIVE_YEARS,
      RCP_48_14_SERVED,
      RCP_48_14_SET_ASIDE,
      RCP_37_14_SET_ASIDE_ORDER,
      RCP_37_14_POWER,
      RCP_37_14_WHERE,
      RCP_48_14_EFFECT,
      RCP_24_05_NOT_A_DEFENCE,
      RCP_24_03_COUNTERCLAIM_ELECTION,
      RCP_24_05_1_COSTS,
    ],
    deadlines: [
      setAsideRegistrarOrder(
        "deadline:civil:set-aside-dismissal-forthwith",
        "If you want the dismissal set aside, serve a notice of motion to set it aside",
      ),
      dismissalCosts("deadline:civil:dismissal-costs-30-days:plaintiff"),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:plaintiff:wants-to-discontinue",
    pathway: "civil",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "I want to drop my lawsuit — how do I stop it?",
    title: "Plaintiff discontinuing the action",
    description:
      "The plaintiff wants to discontinue all or part of the action against one or more defendants.",
    cues: [
      "I want to drop my case",
      "withdraw my claim",
      "notice of discontinuance",
      "form 23A",
      "stop the lawsuit",
    ],
    distinguishedFrom: [
      {
        stage: "civil:defendant:action-discontinued-counterclaim-pending",
        by: "whether the person is the plaintiff discontinuing or a defendant with a counterclaim after the discontinuance",
      },
      {
        stage: "civil:plaintiff:action-dismissed-for-delay",
        by: "whether the plaintiff is choosing to end the action or the registrar has dismissed it",
      },
    ],
    rules: [RCP_23_01_DISCONTINUE, RCP_23_01_DISABILITY, RCP_23_02_COUNTERCLAIM_ELECTION, RCP_23_04_NOT_A_DEFENCE, RCP_23_04_STAY, RCP_23_05_COSTS, RCP_25_05_CLOSE],
    deadlines: [
      {
        id: "deadline:civil:discontinue-before-pleadings-close",
        what: "To discontinue without the court's leave or everyone's consent, act before pleadings close. Serve a notice of discontinuance (Form 23A) on all parties served with the statement of claim. File it with proof of service",
        countFrom: "the day pleadings close",
        countFromEvent: "pleadings-closed",
        length: { unit: "days", count: 0 },
        regime: "civil-rules",
        rule: RCP_23_01_DISCONTINUE,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "The rule fixes no number of days. The cut-off is the close of pleadings. After that, you need the court's leave. You can also discontinue at any time by filing the consent of all parties. If any party is under a disability, discontinuing by or against that party needs a judge's leave. A defendant who counterclaimed then has 30 days to choose to go on with the counterclaim. A discontinuance does not stop a later action on the same claim, unless the leave order or a filed consent says so. But a later action can be put on hold until the costs of the discontinued one are paid.",
        exceptions: [RCP_25_05_CLOSE, RCP_23_01_DISABILITY, RCP_23_02_COUNTERCLAIM_ELECTION, RCP_23_04_NOT_A_DEFENCE, RCP_23_04_STAY],
      },
      discontinuanceCosts("deadline:civil:discontinuance-costs-30-days"),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:plaintiff:judgment-unpaid",
    pathway: "civil",
    side: "plaintiff",
    wentWrong: false,
    userQuestion: "I have a judgment but they will not pay — how do I collect?",
    title: "Judgment obtained, not paid",
    description:
      "The plaintiff has a judgment for money, by default or after a hearing, and it has not been paid.",
    cues: [
      "I won but they have not paid",
      "how do I garnish wages",
      "writ of seizure and sale",
      "examination in aid of execution",
      "enforce my judgment",
    ],
    distinguishedFrom: [
      {
        stage: "civil:plaintiff:defendant-noted-in-default",
        by: "whether judgment has actually been signed or granted",
      },
      {
        stage: "civil:both:judgment-given",
        by: "whether the question is collecting the money or appealing the decision",
      },
    ],
    rules: [
      RCP_60_02_METHODS,
      RCP_60_07_LEAVE,
      RCP_60_07_EXPIRES,
      RCP_60_08_GARNISHMENT,
      RCP_60_08_SIX_YEARS,
      RCP_60_08_IN_FORCE,
      RCP_60_08_RENEW,
      RCP_60_18_EXAMINATION,
      C.R_63_01_STAY,
    ],
    deadlines: [
      {
        id: "deadline:civil:renew-writ-six-years",
        what: "If you have a writ of seizure and sale, renew it before it expires",
        countFrom: "the day the writ was issued",
        countFromEvent: "writ-issued",
        length: { unit: "years", count: 6 },
        regime: "civil-rules",
        rule: RCP_60_07_EXPIRES,
        computation: C.R_RCP_3_01_HOLIDAY,
        consequence: "changes-what-happens-next",
        qualifier:
          "A writ filed with a sheriff is renewed by filing a request to renew (Form 60E) with the sheriff. A writ not filed with a sheriff is renewed with the registrar who issued it. A renewal can be filed only in the six years before the expiry it relates to. A notice of garnishment also lasts six years and can be renewed before it expires.",
        exceptions: [RCP_60_07_RENEW_SHERIFF, RCP_60_07_RENEW_REGISTRAR, RCP_60_07_RENEW_WINDOW, RCP_60_08_IN_FORCE, RCP_60_08_RENEW],
      },
    ],
    requiresAffirmativeScope: true,
  },
];

// =====================================================================
// Defendant
// =====================================================================

const DEFENDANT: CaseStage[] = [
  {
    id: "civil:defendant:served-defence-period-running",
    pathway: "civil",
    side: "defendant",
    wentWrong: false,
    userQuestion: "I was served with a statement of claim — what do I have to do, and by when?",
    title: "Served with a statement of claim, time to defend running",
    description:
      "The defendant has been served with a statement of claim and the time to deliver a defence has not run out.",
    cues: [
      "I got served with a statement of claim",
      "someone is suing me in superior court",
      "how long do I have to file a defence",
      "notice of intent to defend",
      "can I counterclaim",
    ],
    distinguishedFrom: [
      {
        stage: "civil:defendant:defence-period-expired-not-noted",
        by: "whether the time for the defence has run out",
      },
      {
        stage: "civil:defendant:defence-delivered",
        by: "whether the statement of defence has been delivered",
      },
      {
        stage: "civil:plaintiff:served-with-counterclaim",
        by: "whether the person is answering a statement of claim against them or a counterclaim in their own action",
      },
      {
        stage: "civil:defendant:served-with-third-party-claim",
        by: "whether the claim served is a statement of claim or a third party claim by a defendant",
      },
    ],
    rules: [
      RCP_18_01_DEFENCE,
      RCP_18_02_INTENT,
      RCP_18_02_TEN_MORE,
      RCP_19_01_NOTING,
      RCP_19_02_NO_NOTICE,
      RCP_15_01_CORPORATION_LAWYER,
      RCP_27_01_COUNTERCLAIM,
      RCP_27_02_SAME_DOCUMENT,
      RCP_27_04_COUNTERCLAIM_TIME,
      RCP_27_03_ISSUE_NEW_PARTY,
      RCP_27_04_NEW_PARTY,
      RCP_28_04_CROSSCLAIM,
      RCP_29_01_FULL,
    ],
    deadlines: [
      {
        id: "deadline:civil:defence",
        what: "Deliver a statement of defence (Form 18A)",
        countFrom: "the day you were served with the statement of claim",
        countFromEvent: "served-with-claim",
        length: { unit: "days", count: 20 },
        regime: "civil-rules",
        rule: RCP_18_01_DEFENCE,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This is the time if you were served in Ontario. If you were served elsewhere in Canada or in the United States, it is 40 days. If you were served anywhere else, it is 60 days. If you deliver a notice of intent to defend (Form 18B) in that time, you get 10 more days for the defence. Deliver means serve it on the other parties and file it with proof of service. " +
          DEFENCE_QUALIFIER_SERVICE +
          " A counterclaim against the plaintiff goes in the same document as your defence, by the same time. Your counterclaim may also name someone who is not yet a party. If so, issue it within the same time as your defence, or before you are noted in default, or later with the court's leave. Then serve and file it, with proof of service, within 30 days after it is issued. You can also do this at any time before you are noted in default, or later with the court's leave. A crossclaim against a co-defendant goes with your defence, by the same time. It can also go in at any time before you are noted in default, or later with leave. The court must give that leave unless it would prejudice the plaintiff. The time can be extended by filing a consent, or by the court. You can still deliver a defence at any time before you are noted in default. But once the time is up, the plaintiff can have you noted in default without telling you. After that, you get no notice of further steps. If the claim is under the simplified procedure and you say it does not fit Rule 76, say so in your defence. A jury notice must be delivered before pleadings close.",
        exceptions: [
          RCP_18_02_INTENT,
          RCP_18_02_TEN_MORE,
          RCP_1_03_DELIVER,
          RCP_16_03_RESIDENCE,
          RCP_16_03_MAIL_CARD,
          RCP_16_03_CORPORATION_MAIL,
          RCP_16_06_MAIL_FIFTH_DAY,
          RCP_27_02_SAME_DOCUMENT,
          RCP_27_04_COUNTERCLAIM_TIME,
          RCP_27_03_ISSUE_NEW_PARTY,
          RCP_27_04_NEW_PARTY,
          RCP_28_04_CROSSCLAIM,
          RCP_3_02_CONSENT,
          RCP_3_02_EXTEND,
          RCP_19_01_LATE_DEFENCE,
          RCP_19_01_NOTING,
          RCP_19_02_NO_NOTICE,
          RCP_76_02_OBJECTION,
          RCP_47_01_JURY,
        ],
      },
      THIRD_PARTY_CLAIM_DEADLINE,
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:defendant:defence-delivered",
    pathway: "civil",
    side: "defendant",
    wentWrong: false,
    userQuestion: "I delivered my statement of defence — what happens next?",
    title: "Statement of defence delivered",
    description:
      "The defendant has served and filed a statement of defence. Discovery has not started.",
    cues: [
      "I filed my statement of defence",
      "what happens after my defence",
      "I want to add someone else to the case",
      "third party claim",
      "crossclaim",
    ],
    distinguishedFrom: [
      {
        stage: "civil:defendant:served-defence-period-running",
        by: "whether the statement of defence has been delivered",
      },
      {
        stage: "civil:both:discovery",
        by: "whether pleadings have closed and the parties are exchanging documents",
      },
    ],
    rules: [RCP_29_01_FULL, S_LIM_18_1_CONTRIBUTION, RCP_29_02_ISSUE, RCP_29_02_AFTER_REPLY, RCP_29_02_CONSENT_LEAVE, RCP_29_02_SERVE, RCP_29_02_OTHER_PARTIES, RCP_28_04_CROSSCLAIM, RCP_25_05_CLOSE, RCP_47_01_JURY, RCP_29_1_03_TIMING, RCP_27_06_REPLY_TO_DEFENCE_TO_COUNTERCLAIM, RCP_28_08_REPLY, RCP_29_04_REPLY],
    deadlines: [
      { ...THIRD_PARTY_CLAIM_DEADLINE, id: "deadline:civil:third-party-claim-10-days:defence-delivered" },
      {
        id: "deadline:civil:serve-third-party-claim-30-days",
        what: "If you issued a third party claim, serve it on the third party with all the pleadings delivered so far, and on every other party",
        countFrom: "the day the third party claim was issued",
        countFromEvent: "third-party-claim-issued",
        length: { unit: "days", count: 30 },
        regime: "civil-rules",
        rule: RCP_29_02_SERVE,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "The third party must be served personally or by an alternative to personal service. The other parties to the main action must be served in the same time, but not personally. The time can be extended by filing a consent, or by the court.",
        exceptions: [RCP_29_02_OTHER_PARTIES, RCP_3_02_CONSENT, RCP_3_02_EXTEND],
      },
      juryNotice("deadline:civil:jury-notice:defence-delivered"),
      simplifiedAffidavit("deadline:civil:simplified-affidavit-of-documents:defence-delivered"),
      discoveryPlan("deadline:civil:discovery-plan:defence-delivered"),
      {
        id: "deadline:civil:reply-to-defence-to-counterclaim-10-days",
        what: "If you counterclaimed and want to reply to the defence to counterclaim, deliver a reply to defence to counterclaim (Form 27D)",
        countFrom: "the day the defence to counterclaim was served on you",
        countFromEvent: "defence-to-counterclaim-served",
        length: { unit: "days", count: 10 },
        regime: "civil-rules",
        rule: RCP_27_06_REPLY_TO_DEFENCE_TO_COUNTERCLAIM,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier: "This applies only if you counterclaimed. A reply is optional. If you crossclaimed, you have the same 10 days to reply to a defence to crossclaim (Form 28C). If you brought a third party claim, you also have 10 days to reply to the third party defence (Form 29C). Each runs from service of that defence.",
        exceptions: [RCP_28_08_REPLY, RCP_29_04_REPLY],
      },
      simplifiedSettlementDiscussion("deadline:civil:simplified-settlement-discussion:defence-delivered"),
      mediationDeadline("deadline:civil:mediation-180-days:defence-delivered"),
      {
        id: "deadline:civil:simplified-set-down-180-days:defendant-view",
        what: "If the action is under the simplified procedure, the plaintiff sets it down for trial by serving and filing a notice of readiness for pre-trial conference (Form 76C)",
        actor: "other-party",
        countFrom: "the day the first statement of defence or notice of intent to defend was filed",
        countFromEvent: "first-defence-filed",
        length: { unit: "days", count: 180 },
        regime: "civil-rules",
        rule: RCP_76_09_SET_DOWN,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This applies only to an action under the simplified procedure. If the plaintiff does not do it, any other party may.",
        exceptions: [RCP_76_09_ANY_PARTY],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:defendant:served-with-third-party-claim",
    pathway: "civil",
    side: "defendant",
    wentWrong: false,
    userQuestion: "A defendant in someone else's lawsuit has brought me into it — what do I do?",
    title: "Served with a third party claim",
    description:
      "A defendant has issued and served a third party claim against this person, who was not a party to the action before.",
    cues: [
      "third party claim",
      "form 29A",
      "they added me to the lawsuit",
      "the defendant says I am responsible",
      "third party defence",
    ],
    distinguishedFrom: [
      {
        stage: "civil:defendant:served-defence-period-running",
        by: "whether the person was served with a statement of claim by the plaintiff or a third party claim by a defendant",
      },
    ],
    rules: [
      RCP_29_03_THIRD_PARTY_DEFENCE,
      RCP_18_02_THIRD_PARTY,
      RCP_29_05_DEFEND_MAIN,
      RCP_29_05_SAME_TIME,
      RCP_29_05_BOUND,
      RCP_29_07_THIRD_PARTY_DEFAULT,
      RCP_19_09_COUNTERCLAIMS,
      S_CJA_23_COUNTERCLAIMS,
    ],
    deadlines: [
      {
        id: "deadline:civil:third-party-defence",
        what: "If you want to defend the third party claim, deliver a third party defence (Form 29B)",
        countFrom: "the day you were served with the third party claim",
        countFromEvent: "served-with-third-party-claim",
        length: { unit: "days", count: 20 },
        regime: "civil-rules",
        rule: RCP_29_03_THIRD_PARTY_DEFENCE,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This is the time if you were served in Ontario. If you were served elsewhere in Canada or in the United States, it is 40 days. If you were served anywhere else, it is 60 days. A notice of intent to defend in that time gives you 10 more days. You can also defend the plaintiff's claim. Do this by delivering a statement of defence in the main action, in the same time. If you do not, you are still bound by any order or finding in the main action between the plaintiff and the defendant who brought you in. If you do not deliver a third party defence in time, you can be noted in default. You would then be treated as admitting the facts the third party claim alleges. Judgment could be given against you at the trial or on a motion to a judge. The time can be extended by filing a consent, or by the court.",
        exceptions: [RCP_18_02_THIRD_PARTY, RCP_18_02_TEN_MORE, RCP_29_05_SAME_TIME, RCP_29_05_BOUND, RCP_19_09_COUNTERCLAIMS, RCP_19_02_CONSEQUENCES, RCP_29_07_THIRD_PARTY_DEFAULT, RCP_3_02_CONSENT, RCP_3_02_EXTEND],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:defendant:served-with-counterclaim-as-new-party",
    pathway: "civil",
    side: "defendant",
    wentWrong: false,
    userQuestion: "I was not part of this lawsuit, but a defendant's counterclaim now names me — what do I do?",
    title: "Served with a counterclaim as a new party",
    description:
      "A defendant has issued a statement of defence and counterclaim that names this person, who was not already a party to the main action.",
    cues: [
      "the counterclaim names me",
      "statement of defence and counterclaim served on me",
      "I was added in a counterclaim",
      "defence to counterclaim",
    ],
    distinguishedFrom: [
      {
        stage: "civil:plaintiff:served-with-counterclaim",
        by: "whether the person was already a party to the main action when the counterclaim was served",
      },
      {
        stage: "civil:defendant:served-with-third-party-claim",
        by: "whether the claim served is a counterclaim or a third party claim",
      },
    ],
    rules: [RCP_27_04_NEW_PARTY, RCP_27_05_NEW_PARTY_DEFENCE, RCP_18_02_THIRD_PARTY, RCP_18_02_TEN_MORE, RCP_19_01_LATE_DEFENCE, RCP_19_09_COUNTERCLAIMS],
    deadlines: [
      {
        id: "deadline:civil:defence-to-counterclaim-new-party",
        what: "If you want to defend the counterclaim, deliver a defence to counterclaim (Form 27C)",
        countFrom: "the day you were served with the statement of defence and counterclaim",
        countFromEvent: "defendants-claim-served",
        length: { unit: "days", count: 20 },
        regime: "civil-rules",
        rule: RCP_27_05_NEW_PARTY_DEFENCE,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This is the time if you were served in Ontario. If you were served elsewhere in Canada or in the United States, it is 40 days. If you were served anywhere else, it is 60 days. A notice of intent to defend in that time gives you 10 more days. You can still deliver a defence at any time before you are noted in default. The default rules apply to a counterclaim. The time can be extended by filing a consent, or by the court.",
        exceptions: [RCP_18_02_THIRD_PARTY, RCP_18_02_TEN_MORE, RCP_19_01_LATE_DEFENCE, RCP_19_09_COUNTERCLAIMS, RCP_3_02_CONSENT, RCP_3_02_EXTEND],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:defendant:served-with-crossclaim",
    pathway: "civil",
    side: "defendant",
    wentWrong: false,
    userQuestion: "Another defendant has crossclaimed against me — do I have to respond?",
    title: "Served with a statement of defence and crossclaim",
    description:
      "A co-defendant has delivered a statement of defence and crossclaim that makes a claim against this defendant.",
    cues: [
      "crossclaim against me",
      "the other defendant is blaming me",
      "statement of defence and crossclaim",
      "defence to crossclaim",
    ],
    distinguishedFrom: [
      {
        stage: "civil:defendant:served-with-third-party-claim",
        by: "whether the claim comes from a co-defendant already in the action or brings in someone new",
      },
      {
        stage: "civil:defendant:defence-delivered",
        by: "whether a co-defendant has made a claim against this defendant",
      },
    ],
    rules: [RCP_28_05_DEFENCE_TO_CROSSCLAIM, RCP_28_05_NOT_REQUIRED, RCP_19_09_FULL, RCP_28_07_CROSSCLAIM_DEFAULT, RCP_19_02_CONSEQUENCES],
    deadlines: [
      {
        id: "deadline:civil:defence-to-crossclaim-20-days",
        what: "Deliver a defence to crossclaim (Form 28B)",
        countFrom: "the day the statement of defence and crossclaim was served on you",
        countFromEvent: "served-with-crossclaim",
        length: { unit: "days", count: 20 },
        regime: "civil-rules",
        rule: RCP_28_05_DEFENCE_TO_CROSSCLAIM,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "You do not need one if three things are true. First, the crossclaim asks only for contribution or indemnity under the Negligence Act. Second, you have delivered a defence in the main action. Third, you rely on the facts in that defence, with nothing different or surprising. Otherwise, if you do not deliver it in time, you can be noted in default on the crossclaim. You would then be treated as admitting its facts. The co-defendant could then get judgment against you at the trial or on a motion to a judge. The time can be extended by filing a consent, or by the court.",
        exceptions: [RCP_28_05_NOT_REQUIRED, RCP_19_09_FULL, RCP_19_02_CONSEQUENCES, RCP_28_07_CROSSCLAIM_DEFAULT, RCP_3_02_CONSENT, RCP_3_02_EXTEND],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:defendant:action-discontinued-counterclaim-pending",
    pathway: "civil",
    side: "defendant",
    wentWrong: false,
    userQuestion: "The plaintiff dropped the case against me — what happens to my counterclaim?",
    title: "Action discontinued, defendant's counterclaim outstanding",
    description:
      "The plaintiff has discontinued the action against a defendant who counterclaimed.",
    cues: [
      "notice of discontinuance",
      "they dropped their case",
      "the plaintiff withdrew the claim",
      "what about my counterclaim",
    ],
    distinguishedFrom: [
      {
        stage: "civil:defendant:action-dismissed-counterclaim-pending",
        by: "whether the plaintiff discontinued the action or it was dismissed for delay",
      },
    ],
    rules: [RCP_23_01_DISCONTINUE, RCP_23_02_COUNTERCLAIM_ELECTION, RCP_23_03_DEEMED_DISMISSED, RCP_23_05_COSTS],
    deadlines: [
      {
        id: "deadline:civil:counterclaim-election-after-discontinuance-30-days",
        what: "If you want to go on with your counterclaim, deliver a notice of election to proceed with the counterclaim (Form 23B)",
        countFrom: "the day the action was discontinued",
        countFromEvent: "action-discontinued",
        length: { unit: "days", count: 30 },
        regime: "civil-rules",
        rule: RCP_23_02_COUNTERCLAIM_ELECTION,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "If you do not, the counterclaim is treated as discontinued, without costs. You may also have made a crossclaim or third party claim. If so, it is treated as dismissed 30 days after the discontinuance, unless the court orders otherwise within those 30 days. The time can be extended by filing a consent, or by the court.",
        exceptions: [RCP_23_03_DEEMED_DISMISSED, RCP_3_02_CONSENT, RCP_3_02_EXTEND],
      },
      discontinuanceCosts("deadline:civil:discontinuance-costs-30-days:counterclaim-pending"),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:defendant:plaintiff-delaying",
    pathway: "civil",
    side: "defendant",
    wentWrong: false,
    userQuestion: "The plaintiff is not moving the case forward — can I get it dismissed?",
    title: "Plaintiff delaying, defendant may move to dismiss",
    description:
      "The plaintiff has let a time in the rules pass, and a defendant who is not in default is considering a motion to dismiss the action for delay.",
    cues: [
      "the plaintiff is doing nothing",
      "they never set it down for trial",
      "motion to dismiss for delay",
      "the case has been sitting for years",
    ],
    distinguishedFrom: [
      {
        stage: "civil:plaintiff:action-dismissed-for-delay",
        by: "whether the person is a defendant asking for a dismissal or the plaintiff whose action was dismissed",
      },
      {
        stage: "civil:defendant:action-dismissed-counterclaim-pending",
        by: "whether the action has already been dismissed",
      },
    ],
    rules: [RCP_24_01_DEFENDANT_MAY_MOVE, RCP_24_01_E_RESTORE, RCP_24_01_MUST_DISMISS, RCP_24_02_DISABILITY, RCP_48_14_FIVE_YEARS],
    // No deadline: r. 24.01 gives the defendant a motion, with no time limit
    // of its own. The plaintiff's lapsed times are the plaintiff's deadlines.
    deadlines: [],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:defendant:defence-period-expired-not-noted",
    pathway: "civil",
    side: "defendant",
    wentWrong: true,
    userQuestion: "I missed the time to file my defence — is it too late?",
    title: "Time for defence missed, not yet noted in default",
    description:
      "The time to deliver a statement of defence has run out without one being delivered, and the defendant has not been noted in default.",
    cues: [
      "I missed the deadline for my defence",
      "it has been a month since I was served",
      "is it too late to file a defence",
      "I forgot to respond to the claim",
    ],
    distinguishedFrom: [
      {
        stage: "civil:defendant:served-defence-period-running",
        by: "whether the time for the defence has run out",
      },
      {
        stage: "civil:defendant:noted-in-default",
        by: "whether the registrar has noted the defendant in default",
      },
    ],
    rules: [RCP_19_01_LATE_DEFENCE, RCP_19_01_NOTING, RCP_19_02_NO_NOTICE, RCP_3_02_CONSENT, RCP_3_02_EXTEND],
    deadlines: [
      {
        id: "deadline:civil:late-defence-before-noting",
        what: "If you want to defend, deliver your statement of defence",
        countFrom: "the day your time to deliver a defence ran out",
        countFromEvent: "defence-time-expired",
        length: { unit: "days", count: 0 },
        regime: "civil-rules",
        rule: RCP_19_01_LATE_DEFENCE,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "The rules set no further fixed number of days. But you can deliver it only until you are noted in default. The plaintiff can have that done at any time by filing proof of service. After that, you get no notice of further steps. The time can also be extended by filing a consent, or by the court.",
        exceptions: [RCP_19_01_NOTING, RCP_19_02_NO_NOTICE, RCP_3_02_CONSENT, RCP_3_02_EXTEND],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:defendant:noted-in-default",
    pathway: "civil",
    side: "defendant",
    wentWrong: true,
    userQuestion: "I have been noted in default — can I still defend?",
    title: "Noted in default, no judgment yet",
    description:
      "The registrar has noted the defendant in default. No judgment has been signed or granted yet.",
    cues: [
      "I was noted in default",
      "the court says I am in default",
      "can I still file my defence",
      "set aside the noting of default",
    ],
    distinguishedFrom: [
      {
        stage: "civil:defendant:defence-period-expired-not-noted",
        by: "whether the registrar has noted the defendant in default",
      },
      {
        stage: "civil:defendant:default-judgment-against-me",
        by: "whether a judgment has also been signed or granted",
      },
    ],
    rules: [RCP_19_02_CONSEQUENCES, RCP_19_02_NO_NOTICE, RCP_19_03_SET_ASIDE_NOTING, RCP_19_03_CONSENT, RCP_16_07_NOT_NOTICED],
    // r. 19.03 sets no time for the motion, so this is a count-0 entry: it
    // renders its words with no number. Not to be filled in from the Small
    // Claims r. 11.06.
    deadlines: [
      {
        id: "deadline:civil:set-aside-noting",
        what: "If you want to defend, bring a motion to set aside the noting of default. Or get the plaintiff's consent to deliver a defence",
        countFrom: "the day you learned you were noted in default",
        countFromEvent: "learned-of-default",
        length: { unit: "days", count: 0 },
        regime: "civil-rules",
        rule: RCP_19_03_SET_ASIDE_NOTING,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "The rule sets no fixed number of days. If you deliver a defence with the plaintiff's consent, the noting of default is treated as set aside. You are not entitled to notice of further steps, so the plaintiff can seek judgment without telling you.",
        exceptions: [RCP_19_03_CONSENT, RCP_19_02_CONSEQUENCES, RCP_19_02_NO_NOTICE],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:defendant:default-judgment-against-me",
    pathway: "civil",
    side: "defendant",
    wentWrong: true,
    userQuestion: "There is a default judgment against me — what can I do?",
    title: "Default judgment against the defendant",
    description:
      "A judgment has been signed or granted against a defendant who was noted in default.",
    cues: [
      "default judgment against me",
      "I never knew about the case",
      "my bank account was garnished",
      "set aside default judgment",
    ],
    distinguishedFrom: [
      {
        stage: "civil:defendant:noted-in-default",
        by: "whether a judgment has been signed or granted, not only a noting of default",
      },
      {
        stage: "civil:both:judgment-given",
        by: "whether the judgment came from default or from a hearing the defendant took part in",
      },
    ],
    rules: [
      RCP_19_08_SET_ASIDE_SIGNED,
      RCP_19_08_SET_ASIDE_JUDGE,
      RCP_19_08_NOTING_TOO,
      RCP_19_02_CONSEQUENCES,
      RCP_19_04_SIGNED_JUDGMENT,
      RCP_16_07_NOT_NOTICED,
      RCP_63_01_DEFAULT_NOT_STAYED,
    ],
    // r. 19.08 sets no time, so this is a count-0 entry: it renders its words
    // with no number. See the header.
    deadlines: [
      {
        id: "deadline:civil:set-aside-default-judgment",
        what: "If you want the default judgment set aside, bring a motion to set it aside",
        countFrom: "the day you learned of the default judgment",
        countFromEvent: "learned-of-default",
        length: { unit: "days", count: 0 },
        regime: "civil-rules",
        rule: RCP_19_08_SET_ASIDE_SIGNED,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "The rule sets no fixed number of days. The court can set aside a judgment the registrar signed, or one the court granted on a motion under rule 19.04. A judge can set aside one granted on a motion for judgment under rule 19.05, or after a trial. An appeal from a final order of a judge must start within 30 days after the order is made. Appealing a refusal to set aside a default judgment does not by itself stop the judgment from being enforced.",
        exceptions: [RCP_19_08_SET_ASIDE_JUDGE, C.R_61_04_APPEAL_30_DAYS, RCP_63_01_DEFAULT_NOT_STAYED],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:defendant:action-dismissed-counterclaim-pending",
    pathway: "civil",
    side: "defendant",
    wentWrong: false,
    userQuestion: "The plaintiff's case was dismissed for delay — what happens to my counterclaim?",
    title: "Action dismissed for delay, defendant's counterclaim outstanding",
    description:
      "The action against a defendant who counterclaimed has been dismissed for delay.",
    cues: [
      "their case was dismissed for delay",
      "what about my counterclaim",
      "notice of election to proceed with counterclaim",
      "form 23B",
    ],
    distinguishedFrom: [
      {
        stage: "civil:plaintiff:action-dismissed-for-delay",
        by: "whether the person is the plaintiff whose action was dismissed or a defendant with a counterclaim",
      },
      {
        stage: "civil:defendant:action-discontinued-counterclaim-pending",
        by: "whether the action was dismissed for delay or discontinued by the plaintiff",
      },
    ],
    rules: [RCP_24_03_COUNTERCLAIM_ELECTION, RCP_48_14_EFFECT, RCP_24_05_1_COSTS],
    deadlines: [
      {
        id: "deadline:civil:counterclaim-election-30-days",
        what: "If you want to go on with your counterclaim, deliver a notice of election to proceed with the counterclaim (Form 23B)",
        countFrom: "the day the action was dismissed",
        countFromEvent: "action-dismissed-for-delay",
        length: { unit: "days", count: 30 },
        regime: "civil-rules",
        rule: RCP_24_03_COUNTERCLAIM_ELECTION,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "If you do not, the counterclaim is treated as discontinued, without costs. This applies to a dismissal by the registrar as well as by the court. The time can be extended by filing a consent, or by the court.",
        exceptions: [RCP_48_14_EFFECT, RCP_3_02_CONSENT, RCP_3_02_EXTEND],
      },
      dismissalCosts("deadline:civil:dismissal-costs-30-days"),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:defendant:judgment-being-enforced",
    pathway: "civil",
    side: "defendant",
    wentWrong: false,
    userQuestion: "There is a judgment against me and they are trying to collect — what can they do?",
    title: "Judgment debtor facing enforcement",
    description:
      "A judgment for money has been made against this person, and the creditor has started or may start enforcing it.",
    cues: [
      "they are garnishing my wages",
      "writ of seizure and sale against me",
      "examination in aid of execution",
      "they want to question me about my finances",
      "I cannot pay the judgment",
    ],
    distinguishedFrom: [
      {
        stage: "civil:defendant:default-judgment-against-me",
        by: "whether the question is undoing a default judgment or what the creditor can do to collect",
      },
      {
        stage: "civil:plaintiff:judgment-unpaid",
        by: "whether the person is the one collecting or the one the judgment is against",
      },
    ],
    rules: [RCP_60_02_METHODS, RCP_60_07_LEAVE, RCP_60_08_GARNISHMENT, RCP_60_08_SIX_YEARS, RCP_60_18_EXAMINATION, C.R_63_01_STAY],
    // Rule 60's time limits bind the creditor. The one clock the debtor may
    // still be inside is the appeal period, and delivering a notice of appeal
    // stays the money parts of the order (r. 63.01 (1)).
    deadlines: [
      appealDeadline(
        "deadline:civil:notice-of-appeal-30-days:judgment-being-enforced",
        " Delivering a notice of appeal pauses the parts of the order that say to pay money, until the appeal is decided. This does not apply to support.",
        [C.R_63_01_STAY],
      ),
    ],
    requiresAffirmativeScope: true,
  },
];

// =====================================================================
// Either side
// =====================================================================

const BOTH: CaseStage[] = [
  {
    id: "civil:both:lawyer-removed-from-record",
    pathway: "civil",
    side: "both",
    wentWrong: true,
    userQuestion: "My lawyer got off the record — what do I have to do now?",
    title: "Lawyer removed from the record",
    description:
      "The court has made an order removing a party's lawyer from the record, and the party has been or will be served with it.",
    cues: [
      "my lawyer got off the record",
      "order removing lawyer from the record",
      "my lawyer quit my case",
      "notice of intention to act in person",
      "form 15C",
    ],
    distinguishedFrom: [
      {
        stage: "civil:both:motion-scheduled",
        by: "whether the lawyer's motion to get off the record has already been decided",
      },
    ],
    rules: [RCP_15_04_CORPORATION, RCP_15_04_CORPORATION_FAILS, RCP_15_04_REPRESENTATIVE, RCP_15_04_OTHER_CLIENTS, RCP_15_04_OTHER_FAILS, RCP_15_01_CORPORATION_LAWYER],
    deadlines: [
      {
        id: "deadline:civil:after-lawyer-removed-30-days",
        what: "If you are an individual, do one of two things. Appoint a new lawyer by serving a notice (Form 15B). Or serve a notice of intention to act in person (Form 15C)",
        countFrom: "the day you were served with the order removing your lawyer",
        countFromEvent: "served-with-removal-order",
        length: { unit: "days", count: 30 },
        regime: "civil-rules",
        rule: RCP_15_04_OTHER_CLIENTS,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "If you do not, the court may dismiss your case or strike out your defence. In an appeal, the appeal may be dismissed or you may lose the right to be heard. A corporation has 30 days to do one of two things instead. It can appoint a new lawyer. Or it can get and serve an order letting someone who is not a lawyer represent it. The same results follow if it does not. A party acting in a representative role, or the litigation guardian of a party under disability, has 30 days to appoint a new lawyer. The time can be extended by the court.",
        exceptions: [RCP_15_04_OTHER_FAILS, RCP_15_04_CORPORATION, RCP_15_04_CORPORATION_FAILS, RCP_15_04_REPRESENTATIVE, RCP_3_02_EXTEND],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:both:served-with-amended-pleading",
    pathway: "civil",
    side: "both",
    wentWrong: false,
    userQuestion: "The other side served an amended claim or defence — do I have to respond again?",
    title: "Served with an amended pleading",
    description:
      "Another party has served an amended statement of claim, defence, counterclaim or other pleading.",
    cues: [
      "amended statement of claim",
      "amended statement of defence",
      "they changed their claim",
      "amended pleading",
    ],
    distinguishedFrom: [
      {
        stage: "civil:plaintiff:defence-received",
        by: "whether the pleading served is an original pleading or an amended one",
      },
      {
        stage: "civil:defendant:served-defence-period-running",
        by: "whether the claim served is the original statement of claim or an amended one after a defence was already delivered",
      },
    ],
    rules: [RCP_26_05_RESPOND, RCP_26_05_DEEMED],
    deadlines: [
      {
        id: "deadline:civil:respond-to-amended-pleading",
        what: "Respond to the amended pleading",
        countFrom: "the day the amended pleading was served on you",
        countFromEvent: "served-with-amended-pleading",
        length: { unit: "days", count: 10 },
        regime: "civil-rules",
        rule: RCP_26_05_RESPOND,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "You have the longer of two times: these 10 days, or the time that was left to respond to the original pleading. The court can order otherwise. If you had already responded to the original, you may choose not to respond again. You are then treated as relying on your original pleading.",
        exceptions: [RCP_26_05_DEEMED],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:both:discovery",
    pathway: "civil",
    side: "both",
    wentWrong: false,
    userQuestion: "What is discovery, and what do I have to hand over?",
    title: "Discovery of documents and examinations",
    description:
      "Pleadings are closed and the parties are at the stage of exchanging documents and holding examinations for discovery under the ordinary procedure.",
    cues: [
      "affidavit of documents",
      "examination for discovery",
      "discovery plan",
      "they want my documents",
      "how long can they question me",
    ],
    distinguishedFrom: [
      {
        stage: "civil:plaintiff:defence-received",
        by: "whether pleadings have closed",
      },
      {
        stage: "civil:both:simplified-procedure-after-defence",
        by: "whether the action is under the simplified procedure, which has its own document deadline and a shorter examination",
      },
      {
        stage: "civil:plaintiff:ready-to-set-down",
        by: "whether discovery is finished and the action is ready to be set down",
      },
    ],
    rules: [RCP_29_1_03_PLAN, RCP_29_1_03_TIMING, RCP_29_1_03_CONTENTS, RCP_30_03_AFFIDAVIT, RCP_31_05_1_SEVEN_HOURS, RCP_31_07_FAIL, RCP_31_07_EFFECT, RCP_31_07_HONOUR, RCP_25_05_CLOSE],
    deadlines: [
      discoveryPlan("deadline:civil:discovery-plan"),
      undertakingsDeadline("deadline:civil:undertakings-60-days"),
      setDownSixMonths("deadline:civil:set-down-six-months-after-pleadings:discovery", true),
      fiveYearDismissal("deadline:civil:five-year-dismissal-discovery", true),
      mediationDeadline("deadline:civil:mediation-180-days:discovery"),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:both:simplified-procedure-after-defence",
    pathway: "civil",
    side: "both",
    wentWrong: false,
    userQuestion: "My case is under the simplified procedure — what are the steps after the defence?",
    title: "Simplified procedure action, defended",
    description:
      "The action is proceeding under the simplified procedure in Rule 76 and a defence or notice of intent to defend has been filed.",
    cues: [
      "simplified procedure",
      "rule 76",
      "notice of readiness for pre-trial conference",
      "form 76C",
      "claim under two hundred thousand",
    ],
    distinguishedFrom: [
      {
        stage: "civil:both:discovery",
        by: "whether the action is under the simplified procedure or the ordinary procedure",
      },
      {
        stage: "civil:both:pretrial-scheduled",
        by: "whether the action has been set down for trial",
      },
    ],
    rules: [
      RCP_76_01_OTHER_RULES,
      RCP_76_02_MANDATORY,
      RCP_76_03_AFFIDAVIT,
      RCP_76_03_WITNESSES,
      RCP_76_03_NOT_DISCLOSED,
      RCP_76_04_NOT_PERMITTED,
      RCP_76_04_THREE_HOURS,
      RCP_31_07_FAIL,
      RCP_31_07_EFFECT,
      RCP_29_1_03_TIMING,
      RCP_76_08_SETTLEMENT_DISCUSSION,
      RCP_76_09_SET_DOWN,
      RCP_76_09_ANY_PARTY,
      RCP_76_09_CERTIFY,
    ],
    /*
     * The 180-day set-down (r. 76.09 (1)) is the PLAINTIFF's duty. On this
     * both-sides stage "you" may be either party, so the `what` opens with
     * "If you are the plaintiff" and the qualifier tells any other party what
     * r. 76.09 (2) lets them do.
     */
    deadlines: [
      simplifiedAffidavit("deadline:civil:simplified-affidavit-of-documents"),
      simplifiedSettlementDiscussion("deadline:civil:simplified-settlement-discussion"),
      mediationDeadline("deadline:civil:mediation-180-days:simplified"),
      simplifiedSetDown("deadline:civil:simplified-set-down-180-days:both", false),
      undertakingsDeadline("deadline:civil:undertakings-60-days:simplified"),
      discoveryPlan("deadline:civil:discovery-plan:simplified"),
      fiveYearDismissal("deadline:civil:five-year-dismissal-simplified", true),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:both:mandatory-mediation",
    pathway: "civil",
    side: "both",
    wentWrong: false,
    userQuestion: "Do we have to go to mediation, and what do I need to do for it?",
    title: "Mandatory mediation under Rule 24.1",
    description:
      "A defence has been filed in an action that may be covered by mandatory mediation, and the mediation session has not yet been held.",
    cues: [
      "mandatory mediation",
      "mediation co-ordinator",
      "do I have to go to mediation",
      "form 24.1C",
      "I missed the mediation",
    ],
    distinguishedFrom: [
      {
        stage: "civil:both:pretrial-scheduled",
        by: "whether the meeting is a mediation with a mediator or a pre-trial conference with a judge",
      },
      {
        stage: "civil:plaintiff:defence-received",
        by: "whether the action is one that Rule 24.1 covers and a mediation is now being arranged",
      },
    ],
    rules: [
      RCP_24_1_04_WHERE,
      RCP_24_1_04_NOT,
      RCP_24_1_05_EXEMPT,
      RCP_24_1_09_180_DAYS,
      RCP_24_1_09_TRANSFERRED,
      RCP_24_1_09_CHOOSE,
      RCP_24_1_09_NOTICE_BEFORE_SET_DOWN,
      RCP_24_1_09_ASSIGN,
      RCP_24_1_10_STATEMENT,
      RCP_24_1_11_ATTEND,
      RCP_24_1_12_FAIL,
      RCP_24_1_13_POWERS,
    ],
    deadlines: [
      mediationDeadline("deadline:civil:mediation-180-days"),
      {
        id: "deadline:civil:mediation-statement-7-days",
        what: "Prepare a statement of issues (Form 24.1C) and give a copy to every other party and to the mediator",
        countFrom: "the date of the mediation session, counting backwards",
        countFromEvent: "mediation-session-date",
        length: { unit: "days", count: 7 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_24_1_10_STATEMENT,
        computation: RCP_3_01_SHORT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This is the latest it can be done; earlier is fine. Because the period is seven days or less, Saturdays, Sundays and holidays are not counted. The plaintiff must also include a copy of the pleadings with the mediator's copy. A party may fail to do this, so that holding the session is not practical. Then the mediator cancels it and files a certificate of non-compliance. The matter then goes to a judge or associate judge. The judge can dismiss the action of a plaintiff who did not comply. The judge can strike out the defence of a defendant who did not comply, or make other orders.",
        exceptions: [RCP_24_1_10_PLEADINGS, RCP_24_1_10_CANCEL, RCP_24_1_13_REFER, RCP_24_1_13_POWERS, RCP_1_03_HOLIDAY],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:both:served-with-request-to-admit",
    pathway: "civil",
    side: "both",
    wentWrong: false,
    userQuestion: "I got a request to admit — what happens if I do not answer?",
    title: "Served with a request to admit",
    description:
      "Another party has served a request to admit facts or documents (Form 51A) and no response has been served.",
    cues: [
      "request to admit",
      "form 51A",
      "they want me to admit facts",
      "response to request to admit",
    ],
    distinguishedFrom: [
      {
        stage: "civil:both:discovery",
        by: "whether the paper served is a request to admit, which has its own 20-day answer time, rather than a discovery step",
      },
      {
        stage: "civil:both:motion-scheduled",
        by: "whether the paper served is a request to admit or a notice of motion",
      },
    ],
    rules: [RCP_51_02_REQUEST, RCP_51_03_RESPOND, RCP_51_03_DEEMED, RCP_51_03_DENY_OR_REASON, RCP_51_04_COSTS],
    deadlines: [
      {
        id: "deadline:civil:response-to-request-to-admit-20-days",
        what: "Serve a response to request to admit (Form 51B) on the party who sent the request",
        countFrom: "the day the request to admit was served on you",
        countFromEvent: "served-with-request-to-admit",
        length: { unit: "days", count: 20 },
        regime: "civil-rules",
        rule: RCP_51_03_RESPOND,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "If you do not respond in time, you are treated as admitting the facts or documents in the request, for this case only. You are also treated as admitting anything your response does not specifically deny, or refuse to admit with a reason. The time can be extended by filing a consent, or by the court.",
        exceptions: [RCP_51_03_DEEMED, RCP_51_03_DENY_OR_REASON, RCP_3_02_CONSENT, RCP_3_02_EXTEND],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:both:offer-to-settle",
    pathway: "civil",
    side: "both",
    wentWrong: false,
    userQuestion: "How do offers to settle work, and does the timing matter?",
    title: "Making or receiving an offer to settle",
    description:
      "A party has made, or is thinking of making, a formal offer to settle under Rule 49, and the claim has not been decided.",
    cues: [
      "offer to settle",
      "form 49A",
      "they made me an offer",
      "can I withdraw my offer",
      "costs consequences",
    ],
    distinguishedFrom: [
      {
        stage: "civil:both:pretrial-scheduled",
        by: "whether the question is a settlement offer between the parties or a pre-trial conference with a judge",
      },
      {
        stage: "civil:both:judgment-given",
        by: "whether the court has already disposed of the claim, after which an offer cannot be accepted",
      },
    ],
    rules: [
      RCP_49_01_1_APPLIES,
      RCP_49_02_OFFER,
      RCP_49_03_SEVEN_DAYS,
      RCP_49_04_WITHDRAW,
      RCP_49_04_EXPIRES,
      RCP_49_04_DISPOSED,
      RCP_49_05_WITHOUT_PREJUDICE,
      RCP_49_10_PLAINTIFF_OFFER,
      RCP_49_10_DEFENDANT_OFFER,
      RCP_49_11_JOINT,
    ],
    deadlines: [
      {
        id: "deadline:civil:offer-to-settle-7-days",
        what: "For the costs rules in rule 49.10 to apply to an offer to settle, serve the offer (Form 49A)",
        countFrom: "the first day of trial, counting backwards",
        countFromEvent: "trial-date",
        length: { unit: "days", count: 7 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_49_03_SEVEN_DAYS,
        computation: RCP_3_01_SHORT,
        consequence: "changes-what-happens-next",
        qualifier:
          "An offer can be made at any time. But if it is made less than seven days before the hearing, the rule 49.10 costs rules do not apply. Because the period is seven days or less, Saturdays, Sundays and holidays are not counted. The offer must also stay open, not withdrawn or expired, until the hearing starts. Rule 49 also applies, with needed changes, to motions, counterclaims, crossclaims and third party claims. For an offer on a motion, the hearing is the hearing of that motion. Several defendants may be said to be jointly liable. If so, the rule 49.10 costs rules apply only if the offer meets the terms of rule 49.11. An offer can be withdrawn by written notice at any time before it is accepted. It ends when any time it gives for acceptance runs out. It cannot be accepted after the court decides the claim.",
        exceptions: [RCP_49_01_1_APPLIES, RCP_49_11_JOINT, RCP_49_10_PLAINTIFF_OFFER, RCP_49_10_DEFENDANT_OFFER, RCP_49_04_WITHDRAW, RCP_49_04_EXPIRES, RCP_49_04_DISPOSED, RCP_1_03_HOLIDAY],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:both:summary-judgment-motion",
    pathway: "civil",
    side: "both",
    wentWrong: false,
    userQuestion: "The other side brought a motion for summary judgment — what do I have to file?",
    title: "A motion for summary judgment is scheduled",
    description:
      "A party has brought, or is about to bring, a motion for summary judgment on all or part of the claim, and the hearing date has not passed.",
    cues: [
      "motion for summary judgment",
      "they want judgment without a trial",
      "summary judgment",
      "no genuine issue requiring a trial",
      "rule 20",
    ],
    distinguishedFrom: [
      {
        stage: "civil:both:motion-scheduled",
        by: "whether the motion asks for judgment on the claim without a trial, which has its own required factums and evidence",
      },
      {
        stage: "civil:both:trial-date-set",
        by: "whether the claim is to be decided on a motion or at a trial",
      },
    ],
    rules: [
      RCP_20_01_PLAINTIFF,
      RCP_20_01_DEFENDANT,
      RCP_20_02_RESPONDING_EVIDENCE,
      RCP_20_03_FACTUMS,
      RCP_20_03_MOVING,
      RCP_20_03_RESPONDING,
      RCP_20_04_TEST,
      RCP_37_07_SEVEN_DAYS,
      RCP_37_10_MOTION_RECORD,
      RCP_37_10_1_CONFIRM,
      RCP_37_10_RESPONDING_RECORD_FULL,
      RCP_37_10_1_RESPONDING_CONFIRM,
    ],
    deadlines: [
      {
        id: "deadline:civil:summary-judgment-moving-7-days",
        what: "If you are bringing the motion for summary judgment, serve the notice of motion, motion record and your factum on the other parties. File them with proof of service",
        countFrom: "the date the motion will be heard, counting backwards",
        countFromEvent: "motion-hearing-date",
        length: { unit: "days", count: 7 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_20_03_MOVING,
        computation: RCP_3_01_SHORT,
        consequence: "changes-what-happens-next",
        qualifier:
          "A factum is required on this motion. This is the latest it can be done; earlier is fine. Because the period is seven days or less, Saturdays, Sundays and holidays are not counted. A document served after 4 p.m., or on a Saturday, Sunday or holiday, counts as served on the next day that is not a holiday. You must also give the registrar a confirmation of motion (Form 37B) by 2 p.m. five days before the hearing. If you do not, the motion is not heard.",
        exceptions: [RCP_20_03_FACTUMS, RCP_37_07_SEVEN_DAYS, RCP_37_10_MOTION_RECORD, RCP_37_10_1_CONFIRM, RCP_37_10_1_ABANDONED, RCP_3_01_D_LATE_SERVICE, RCP_1_03_HOLIDAY],
      },
      {
        id: "deadline:civil:summary-judgment-responding-4-days",
        what: "If you are responding to a motion for summary judgment, serve your factum on the other parties and file it with proof of service",
        countFrom: "the date the motion will be heard, counting backwards",
        countFromEvent: "motion-hearing-date",
        length: { unit: "days", count: 4 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_20_03_RESPONDING,
        computation: RCP_3_01_SHORT,
        consequence: "changes-what-happens-next",
        qualifier:
          "A factum is required on this motion. You cannot rely only on what your pleading says or denies. You must set out specific facts, in affidavits or other evidence, showing there is a genuine issue that needs a trial. This is the latest it can be done; earlier is fine. Because the period is seven days or less, Saturdays, Sundays and holidays are not counted. A document served after 4 p.m., or on a Saturday, Sunday or holiday, counts as served on the next day that is not a holiday.",
        exceptions: [RCP_20_03_FACTUMS, RCP_20_02_RESPONDING_EVIDENCE, RCP_3_01_D_LATE_SERVICE, RCP_1_03_HOLIDAY],
      },
      {
        id: "deadline:civil:summary-judgment-responding-record-4-days",
        what: "If you are responding, serve your affidavits and other evidence on the other parties. If the moving party's motion record does not include them, serve and file a responding party's motion record containing them, with proof of service",
        countFrom: "the date the motion will be heard, counting backwards",
        countFromEvent: "motion-hearing-date",
        length: { unit: "days", count: 4 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_37_10_RESPONDING_RECORD_FULL,
        computation: RCP_3_01_SHORT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This is how your evidence of specific facts reaches the court. This is the latest it can be done; earlier is fine. Because the period is seven days or less, Saturdays, Sundays and holidays are not counted. If the moving party did not email you a copy of their confirmation of motion, you may give the registrar your own confirmation of motion (Form 37B) by 10 a.m. four days before the hearing.",
        exceptions: [RCP_20_02_RESPONDING_EVIDENCE, RCP_37_10_RECORD_CONTENTS, RCP_37_10_1_RESPONDING_CONFIRM, RCP_1_03_HOLIDAY],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:both:motion-scheduled",
    pathway: "civil",
    side: "both",
    wentWrong: false,
    userQuestion: "There is a motion in my case — what do I have to file, and when?",
    title: "A motion is scheduled",
    description:
      "A party has brought, or is about to bring, a motion on notice, and the hearing date has not passed.",
    cues: [
      "notice of motion",
      "motion record",
      "they brought a motion against me",
      "I want to bring a motion",
      "confirmation of motion",
      "I missed the motion",
    ],
    distinguishedFrom: [
      {
        stage: "civil:both:pretrial-scheduled",
        by: "whether the hearing is a motion or a pre-trial conference",
      },
      {
        stage: "civil:both:trial-date-set",
        by: "whether the hearing is a motion or the trial",
      },
      {
        stage: "civil:both:interlocutory-order-made",
        by: "whether the motion has been decided and the question is appealing the order",
      },
      {
        stage: "civil:both:summary-judgment-motion",
        by: "whether the motion asks for summary judgment on the claim, which has its own required factums and evidence",
      },
    ],
    rules: [
      RCP_37_07_SEVEN_DAYS,
      RCP_37_08_FILE,
      RCP_37_10_MOTION_RECORD,
      RCP_37_10_RESPONDING_RECORD,
      RCP_37_10_MOVING_FACTUM,
      RCP_37_10_RESPONDING_FACTUM,
      RCP_37_10_MOVING_CHART,
      RCP_37_10_CHART,
      RCP_37_10_1_CONFIRM,
      RCP_37_10_1_RESPONDING_CONFIRM,
      RCP_37_10_1_ABANDONED,
      RCP_37_12_1_IN_WRITING,
      RCP_37_12_1_IN_WRITING_MATERIAL,
      RCP_37_12_1_RESPONSE,
      RCP_76_05_MOTION_FORM,
      RCP_76_05_MATERIALS,
      RCP_3_01_D_LATE_SERVICE,
      RCP_37_14_SET_ASIDE_ORDER,
      RCP_37_14_POWER,
    ],
    deadlines: [
      {
        id: "deadline:civil:motion-moving-party-7-days",
        what: "If you are bringing the motion, serve the notice of motion and motion record on the other parties. File them with proof of service",
        countFrom: "the date the motion will be heard, counting backwards",
        countFromEvent: "motion-hearing-date",
        length: { unit: "days", count: 7 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_37_07_SEVEN_DAYS,
        computation: RCP_3_01_SHORT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This is the latest it can be done; earlier is fine. Because the period is seven days or less, Saturdays, Sundays and holidays are not counted. Your factum, if you have one, is due by the same day. On a motion for summary judgment, a factum is required. The court can order otherwise for the motion record. A document served after 4 p.m., or on a Saturday, Sunday or holiday, counts as served on the next day that is not a holiday. On a motion about refusals or undertakings, your refusals and undertakings chart (Form 37C) is due by the same day. You may propose that the motion be heard in writing, without the parties attending. If so, give at least 14 days notice. Serve your motion record, a draft order and a factum for a motion in writing with the notice of motion, and file them right away. In a simplified procedure action, you serve a motion form (Form 76B). The motion may be made with or without supporting material or a motion record.",
        exceptions: [RCP_37_08_FILE, RCP_37_10_MOTION_RECORD, RCP_37_10_MOVING_FACTUM, RCP_20_03_FACTUMS, RCP_37_10_MOVING_CHART, RCP_37_12_1_IN_WRITING, RCP_37_12_1_IN_WRITING_MATERIAL, RCP_76_05_MOTION_FORM, RCP_76_05_MATERIALS, RCP_3_01_D_LATE_SERVICE, RCP_1_03_HOLIDAY],
      },
      {
        id: "deadline:civil:confirmation-of-motion-5-days",
        what: "If you are bringing the motion, talk or try to talk with the other party. Then give the registrar a confirmation of motion (Form 37B), and email a copy to the other party, by 2 p.m. on the day",
        countFrom: "the date the motion will be heard, counting backwards",
        countFromEvent: "motion-hearing-date",
        length: { unit: "days", count: 5 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_37_10_1_CONFIRM,
        computation: RCP_3_01_SHORT,
        consequence: "changes-what-happens-next",
        qualifier:
          "Because the period is seven days or less, Saturdays, Sundays and holidays are not counted. If no confirmation is given, the motion is not heard. It is treated as abandoned, unless the court orders otherwise.",
        exceptions: [RCP_37_10_1_ABANDONED, RCP_1_03_HOLIDAY],
      },
      {
        id: "deadline:civil:motion-responding-factum-4-days",
        what: "If you are responding to the motion, serve your factum on the other parties and file it with proof of service",
        countFrom: "the date the motion will be heard, counting backwards",
        countFromEvent: "motion-hearing-date",
        length: { unit: "days", count: 4 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_37_10_RESPONDING_FACTUM,
        computation: RCP_3_01_SHORT,
        consequence: "changes-what-happens-next",
        qualifier:
          "A factum is optional on most motions, but required on a motion for summary judgment. This is the latest it can be done; earlier is fine. Because the period is seven days or less, Saturdays, Sundays and holidays are not counted. On a motion about refusals or undertakings, your completed chart is due by the same day. A document served after 4 p.m., or on a Saturday, Sunday or holiday, counts as served on the next day that is not a holiday.",
        exceptions: [RCP_20_03_FACTUMS, RCP_37_10_CHART, RCP_3_01_D_LATE_SERVICE, RCP_1_03_HOLIDAY],
      },
      {
        id: "deadline:civil:motion-responding-record-4-days",
        what: "If you are responding and think the motion record is incomplete, serve a responding party's motion record on the other parties. File it with proof of service",
        countFrom: "the date the motion will be heard, counting backwards",
        countFromEvent: "motion-hearing-date",
        length: { unit: "days", count: 4 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_37_10_RESPONDING_RECORD,
        computation: RCP_3_01_SHORT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This is the latest it can be done; earlier is fine. Because the period is seven days or less, Saturdays, Sundays and holidays are not counted.",
        exceptions: [RCP_1_03_HOLIDAY],
      },
      {
        id: "deadline:civil:responding-confirmation-4-days",
        what: "If you are responding and the moving party did not email you their confirmation of motion, you may give the registrar your own (Form 37B). Email a copy to the moving party, by 10 a.m. on the day",
        countFrom: "the date the motion will be heard, counting backwards",
        countFromEvent: "motion-hearing-date",
        length: { unit: "days", count: 4 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_37_10_1_RESPONDING_CONFIRM,
        computation: RCP_3_01_SHORT,
        consequence: "changes-what-happens-next",
        qualifier:
          "Because the period is seven days or less, Saturdays, Sundays and holidays are not counted.",
        exceptions: [RCP_1_03_HOLIDAY],
      },
      {
        id: "deadline:civil:motion-in-writing-response-10-days",
        what: "If the moving party asked for the motion to be heard in writing, serve and file your response, with proof of service. It is one of these: a consent; a notice that you do not oppose; your motion record, a notice that you agree to a hearing in writing, and a factum for a motion in writing; or a notice that you want to make oral argument, with your material",
        countFrom: "the day you were served with the moving party's material",
        countFromEvent: "served-with-motion-material",
        length: { unit: "days", count: 10 },
        regime: "civil-rules",
        rule: RCP_37_12_1_RESPONSE,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier: "This applies when the moving party proposed in the notice of motion that the motion be heard in writing.",
        exceptions: [RCP_37_12_1_IN_WRITING],
      },
      setAsideRegistrarOrder(
        "deadline:civil:set-aside-order-missed-motion",
        "If you did not appear on the motion through accident, mistake or insufficient notice, serve a notice of motion to set aside or vary the order",
      ),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:both:interlocutory-order-made",
    pathway: "civil",
    side: "both",
    wentWrong: false,
    userQuestion: "A judge decided a motion against me — can I appeal it, and by when?",
    title: "Interlocutory order made on a motion",
    description:
      "A judge or associate judge has made an order on a motion that does not finally decide the action.",
    cues: [
      "the judge decided the motion",
      "appeal a motion decision",
      "leave to appeal",
      "interlocutory order",
      "associate judge order",
    ],
    distinguishedFrom: [
      {
        stage: "civil:both:judgment-given",
        by: "whether the order finally decides the action or is made on a motion along the way",
      },
      {
        stage: "civil:both:motion-scheduled",
        by: "whether the motion has already been decided",
      },
    ],
    rules: [S_CJA_19_DIVISIONAL, S_CJA_17_ASSOCIATE_JUDGE, RCP_62_02_LEAVE_FROM, RCP_62_02_IN_WRITING, RCP_62_02_NOTICE, RCP_61_03_1_FIFTEEN_DAYS, RCP_62_02_TEST, RCP_62_02_AFTER_LEAVE, RCP_62_02_PROCEDURES, RCP_61_03_1_RECORD_30_DAYS, RCP_62_01_ASSOCIATE_JUDGE, RCP_62_01_SEVEN_DAYS, RCP_62_01_HEARING_DATE, RCP_62_01_FILE, RCP_62_01_APPEAL_RECORD, RCP_62_01_RESPONDENT_FACTUM, RCP_61_03_1_RESPONDING_25_DAYS, C.R_63_01_STAY],
    deadlines: [
      {
        id: "deadline:civil:leave-to-appeal-interlocutory-15-days",
        what: "If you want to appeal an interlocutory order of a Superior Court judge, serve a notice of motion for leave to appeal to the Divisional Court (Form 61A)",
        countFrom: "the day the order was made",
        countFromEvent: "order-made",
        length: { unit: "days", count: 15 },
        regime: "civil-rules",
        rule: RCP_61_03_1_FIFTEEN_DAYS,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "File the notice, with proof of service, within five days after you serve it. A panel of the Divisional Court hears the leave motion in writing. The same leave process applies to a final order of a Superior Court judge that is only about costs. Within 30 days after filing the notice of motion, file your motion record, factum, any transcripts and any book of authorities, with proof of service. If leave is granted, deliver the notice of appeal, with your certificate respecting evidence (Form 61C), within seven days after leave is granted.",
        exceptions: [RCP_62_02_LEAVE_FROM, RCP_62_02_NOTICE, RCP_62_02_IN_WRITING, RCP_62_02_PROCEDURES, RCP_61_03_1_RECORD_30_DAYS, RCP_62_02_AFTER_LEAVE],
      },
      {
        id: "deadline:civil:appeal-associate-judge-7-days",
        what: "If you want to appeal an interlocutory order of an associate judge, serve a notice of appeal (Form 62A) on all parties whose interests may be affected",
        countFrom: "the day the order was made",
        countFromEvent: "order-made",
        length: { unit: "days", count: 7 },
        regime: "civil-rules",
        rule: RCP_62_01_SEVEN_DAYS,
        computation: RCP_3_01_SHORT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This appeal goes to a judge, not to the Divisional Court. Because the period is seven days or less, Saturdays, Sundays and holidays are not counted. The notice must name the first available hearing date at least seven days after you serve it. File it with proof of service no later than seven days before that hearing date.",
        exceptions: [RCP_62_01_ASSOCIATE_JUDGE, S_CJA_17_ASSOCIATE_JUDGE, RCP_62_01_HEARING_DATE, RCP_62_01_FILE, RCP_1_03_HOLIDAY],
      },
      {
        id: "deadline:civil:associate-judge-appeal-record-7-days",
        what: "If you are appealing an associate judge's order, serve your appeal record and factum on every other party and file them with proof of service",
        countFrom: "the date the appeal will be heard, counting backwards",
        countFromEvent: "appeal-hearing-date",
        length: { unit: "days", count: 7 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_62_01_APPEAL_RECORD,
        computation: RCP_3_01_SHORT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This is the latest it can be done; earlier is fine. Because the period is seven days or less, Saturdays, Sundays and holidays are not counted.",
        exceptions: [RCP_1_03_HOLIDAY],
      },
      {
        id: "deadline:civil:associate-judge-appeal-respondent-4-days",
        what: "If you are responding to an appeal from an associate judge's order, serve your factum, and any more material needed, on every other party. File it with proof of service",
        countFrom: "the date the appeal will be heard, counting backwards",
        countFromEvent: "appeal-hearing-date",
        length: { unit: "days", count: 4 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_62_01_RESPONDENT_FACTUM,
        computation: RCP_3_01_SHORT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This is the latest it can be done; earlier is fine. Because the period is seven days or less, Saturdays, Sundays and holidays are not counted.",
        exceptions: [RCP_62_01_RESPONDENT_FILE, RCP_1_03_HOLIDAY],
      },
      {
        id: "deadline:civil:leave-motion-response-25-days",
        what: "If the other side asks the Divisional Court for leave to appeal and you oppose it, file your factum, any motion record and any book of authorities. File them with proof of service",
        countFrom: "the day you were served with the moving party's motion record",
        countFromEvent: "leave-motion-record-served",
        length: { unit: "days", count: 25 },
        regime: "civil-rules",
        rule: RCP_61_03_1_RESPONDING_25_DAYS,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier: "This applies to a motion for leave to appeal an interlocutory order or a costs order of a Superior Court judge.",
        exceptions: [RCP_62_02_PROCEDURES, RCP_62_02_LEAVE_FROM],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:both:pretrial-scheduled",
    pathway: "civil",
    side: "both",
    wentWrong: false,
    userQuestion: "My action has been set down for trial — what has to happen before the pre-trial conference?",
    title: "Set down for trial, before the pre-trial conference",
    description:
      "The action has been set down for trial and the pre-trial conference has not happened yet. Its date may or may not be set.",
    cues: [
      "pre-trial conference",
      "pretrial brief",
      "certificate of readiness",
      "expert report deadline",
      "form 50A",
      "we set it down for trial",
    ],
    distinguishedFrom: [
      {
        stage: "civil:plaintiff:ready-to-set-down",
        by: "whether the action has been set down for trial",
      },
      {
        stage: "civil:both:trial-date-set",
        by: "whether the pre-trial conference has already been held",
      },
      {
        stage: "civil:both:mandatory-mediation",
        by: "whether the meeting is a pre-trial conference with a judge or a mediation with a mediator",
      },
    ],
    rules: [
      RCP_50_02_SCHEDULE,
      RCP_50_02_REGISTRAR,
      RCP_50_02_WINDOW,
      RCP_50_03_1_READINESS,
      RCP_50_04_BRIEF,
      RCP_50_05_ATTEND,
      RCP_53_03_SCHEDULE,
      RCP_53_03_EXPERT,
      RCP_53_03_NO_REPORT,
      RCP_76_10_PLAN,
      RCP_76_10_DOCUMENTS,
    ],
    deadlines: [
      {
        id: "deadline:civil:schedule-pretrial-180-days",
        what: "Schedule a pre-trial conference date with the registrar, agreed among the parties",
        countFrom: "the day the action was set down for trial",
        countFromEvent: "set-down-for-trial",
        length: { unit: "days", count: 180 },
        regime: "civil-rules",
        rule: RCP_50_02_SCHEDULE,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "If the parties do not schedule it in that time, the registrar schedules it and tells the parties. The court can order otherwise. The date must be 30 to 120 days before the first trial day, or before the first day of the trial sittings, whichever is later. An order or practice direction can say otherwise.",
        exceptions: [RCP_50_02_REGISTRAR, RCP_50_02_WINDOW],
      },
      {
        id: "deadline:civil:expert-report-schedule-60-days",
        what: "Agree with the other parties on a schedule of dates for serving experts' reports",
        countFrom: "the day the action was set down for trial",
        countFromEvent: "set-down-for-trial",
        length: { unit: "days", count: 60 },
        regime: "civil-rules",
        rule: RCP_53_03_SCHEDULE,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier: "The court can order otherwise.",
        exceptions: [],
      },
      {
        id: "deadline:civil:expert-report-90-days",
        what: "If you will call an expert witness at trial, serve the expert's signed report on every other party",
        countFrom: "the date of the pre-trial conference, counting backwards",
        countFromEvent: "pre-trial-conference-date",
        length: { unit: "days", count: 90 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_53_03_EXPERT,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This is the latest it can be done; earlier is fine. A report from an expert who answers another party's expert must be served at least 60 days before the pre-trial conference. An expert cannot testify on an issue that is not in a report served in time, unless the trial judge allows it. The time can be extended by the pre-trial judge, by the court on a motion, or by the parties' written consent. But consent cannot move the trial date.",
        exceptions: [RCP_53_03_RESPONDING_EXPERT, RCP_53_03_NO_REPORT, RCP_53_03_EXTEND],
      },
      {
        id: "deadline:civil:certificate-of-readiness-30-days",
        what: "Deliver a certificate of readiness (Form 50A) saying whether you will call expert evidence at trial",
        countFrom: "the date of the pre-trial conference, counting backwards",
        countFromEvent: "pre-trial-conference-date",
        length: { unit: "days", count: 30 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_50_03_1_READINESS,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "For each expert, say whether their report was served in time and, if not, why. This applies even if the time to serve the report was extended. This is the latest it can be done; earlier is fine. If the pre-trial conference is moved, count from the new date.",
        exceptions: [RCP_50_03_1_EXPERTS, RCP_50_03_1_EXTENSION, RCP_50_03_1_RESCHEDULED],
      },
      {
        id: "deadline:civil:simplified-trial-management-plan-30-days",
        what: "If your action is under the simplified procedure, agree with the other parties on a proposed trial management plan",
        countFrom: "the date of the pre-trial conference, counting backwards",
        countFromEvent: "pre-trial-conference-date",
        length: { unit: "days", count: 30 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_76_10_PLAN,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This applies only to an action under the simplified procedure. The plan lists every witness, including experts, and divides the trial time between the parties, to a total of no more than five days. This is the latest it can be done; earlier is fine.",
        exceptions: [],
      },
      {
        id: "deadline:civil:pretrial-brief-5-days",
        what: "File a pre-trial conference brief, with proof of service",
        countFrom: "the date of the pre-trial conference, counting backwards",
        countFromEvent: "pre-trial-conference-date",
        length: { unit: "days", count: 5 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_50_04_BRIEF,
        computation: RCP_3_01_SHORT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This is the latest it can be done; earlier is fine. Because the period is seven days or less, Saturdays, Sundays and holidays are not counted. In a simplified procedure action, each party files other things instead. These are the proposed trial management plan, the party's affidavit of documents and the documents it relies on, any expert affidavit, and any other material needed. Each party also delivers a statement of no more than three pages on the issues and its position, and a trial management checklist (Form 76D).",
        exceptions: [RCP_76_10_DOCUMENTS, RCP_1_03_HOLIDAY],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:both:trial-date-set",
    pathway: "civil",
    side: "both",
    wentWrong: false,
    userQuestion: "My trial is coming up — what do I need to do to be ready?",
    title: "Trial scheduled",
    description:
      "The pre-trial conference has been held, the action is on a trial list or has a trial date, and the trial has not started.",
    cues: [
      "my trial date",
      "the trial list",
      "trial record",
      "how do I get ready for trial",
      "summons to witness",
    ],
    distinguishedFrom: [
      {
        stage: "civil:both:pretrial-scheduled",
        by: "whether the pre-trial conference has been held",
      },
      {
        stage: "civil:both:missed-trial",
        by: "whether the trial has already been called and a party was not there",
      },
    ],
    rules: [RCP_48_07_READY, RCP_52_01_ONE_ABSENT, RCP_53_03_NO_REPORT, RCP_53_04_SUMMONS, RCP_76_10_TRIAL_PLANNING, RCP_76_11_TRIAL_RECORD, RCP_76_12_CROSS_EXAMINE, RCP_25_06_SPECIAL_DAMAGES, RCP_53_07_WHO, RCP_53_07_ADVERSE_WITNESS, S_EVIDENCE_35_2, S_EVIDENCE_35_3, S_EVIDENCE_52_2, S_EVIDENCE_52_4],
    deadlines: [
      {
        id: "deadline:civil:supplementary-expert-report-45-days",
        what: "If your expert will testify on something not in their report, serve a supplementary report on every other party",
        countFrom: "the first day of trial, counting backwards",
        countFromEvent: "trial-date",
        length: { unit: "days", count: 45 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_53_03_NO_REPORT,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This is the latest it can be done; earlier is fine. A responding supplementary report must be served at least 15 days before trial. Otherwise the expert cannot testify on that issue without the trial judge's leave. The time can be extended by the judge at a pre-trial conference, by the court on a motion, or by the parties' written consent. But consent cannot move the trial date.",
        exceptions: [RCP_53_03_EXTEND],
      },
      {
        id: "deadline:civil:simplified-trial-record-10-days",
        what: "If your action is under the simplified procedure and you set it down for trial, serve a trial record on every party and file it with proof of service",
        countFrom: "the first day of trial, counting backwards",
        countFromEvent: "trial-date",
        length: { unit: "days", count: 10 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_76_11_TRIAL_RECORD,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This applies only to an action under the simplified procedure, and only to the party who set it down. It is the latest it can be done; earlier is fine. Witness affidavits, including any outstanding expert affidavits, must be delivered by the dates the pre-trial judge fixed.",
        exceptions: [RCP_76_10_TRIAL_PLANNING],
      },
      {
        id: "deadline:civil:business-records-notice-7-days",
        what: "If you want to use business records, such as invoices or account records, under the Evidence Act's business-records rule, give every other party notice that you plan to",
        countFrom: "the day you tender the records in evidence, counting backwards",
        countFromEvent: "evidence-tendered",
        length: { unit: "days", count: 7 },
        direction: "before",
        regime: "legislation-act",
        rule: S_EVIDENCE_35_3,
        computation: C.S_LEGISLATION_89_3_BETWEEN,
        consequence: "changes-what-happens-next",
        qualifier:
          "The Act requires at least seven days notice of your plan. It does not name the trial date. The notice must come before the records are offered in evidence. So notice given at least 7 days before the first day of trial covers every day of the trial. Giving notice later, even because of a Sunday or holiday, leaves fewer than 7 days. This notice is set by a statute, the Evidence Act. So it is counted under the Legislation Act, 2006, not under the court rules' counting described below. The day the notice is given is not counted, and the day the evidence is offered is. Without the notice, the business-records rule does not apply. Any other party can have the records produced for inspection within five days after giving notice to produce them.",
        exceptions: [S_EVIDENCE_35_2, RCP_3_01_SCOPE],
      },
      {
        id: "deadline:civil:practitioner-report-notice-10-days",
        what: "If you want to use a report signed by a doctor or other health practitioner, give every other party notice",
        countFrom: "the day you tender the report in evidence, counting backwards",
        countFromEvent: "evidence-tendered",
        length: { unit: "days", count: 10 },
        direction: "before",
        regime: "legislation-act",
        rule: S_EVIDENCE_52_2,
        computation: C.S_LEGISLATION_89_3_BETWEEN,
        consequence: "changes-what-happens-next",
        qualifier:
          "The Act requires at least ten days notice to all other parties before the report is admitted. It does not name the trial date. Notice given at least 10 days before the first day of trial covers every day of the trial. Giving notice later, even because of a Sunday or holiday, leaves fewer than 10 days. This notice is set by a statute, the Evidence Act. So it is counted under the Legislation Act, 2006, not under the court rules' counting described below. The day the notice is given is not counted, and the day the report is offered is. The report also needs the court's leave to be admitted. When notice is given, the other parties can get a copy of the report, unless the court orders otherwise. A practitioner who signed a report cannot testify at trial unless the report was given to the other parties this way. The trial judge can allow it anyway.",
        exceptions: [S_EVIDENCE_52_3, S_EVIDENCE_52_4, RCP_3_01_SCOPE],
      },
      {
        id: "deadline:civil:special-damages-update-10-days",
        what: "If you claim special damages and have further amounts or details not in your pleading, deliver notice of them",
        countFrom: "the first day of trial, counting backwards",
        countFromEvent: "trial-date",
        length: { unit: "days", count: 10 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_25_06_SPECIAL_DAMAGES,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "The notice must be delivered right away once the amounts become known, and in any event not less than ten days before trial.",
        exceptions: [],
      },
      {
        id: "deadline:civil:adverse-party-witness-10-days",
        what: "You may want to call the other side as a witness, or its officer, director, employee, sole proprietor or partner. If so, serve them with a summons to witness. Or serve a notice of intention to call them on the other side or its lawyer",
        countFrom: "the first day of trial, counting backwards",
        countFromEvent: "trial-date",
        length: { unit: "days", count: 10 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_53_07_ADVERSE_WITNESS,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "The 10 days apply to the notice of intention. Attendance money under Tariff A must be paid or offered at the same time. If the person is already at the trial, no summons or attendance money is needed.",
        exceptions: [RCP_53_07_WHO],
      },
      {
        id: "deadline:civil:simplified-cross-examine-notice-10-days",
        what: "If your action is under the simplified procedure and you want to examine or cross-examine someone who gave an affidavit, give notice to the party who filed the affidavit",
        countFrom: "the first day of trial, counting backwards",
        countFromEvent: "trial-date",
        length: { unit: "days", count: 10 },
        direction: "before",
        regime: "civil-rules",
        rule: RCP_76_12_CROSS_EXAMINE,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This applies only to an action under the simplified procedure. The party who filed the affidavit then arranges for that person to attend. It is the latest it can be done; earlier is fine.",
        exceptions: [],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:both:missed-trial",
    pathway: "civil",
    side: "both",
    wentWrong: true,
    userQuestion: "I missed my trial — is my case over?",
    title: "A party did not attend the trial",
    description:
      "The action was called for trial and a party did not attend.",
    cues: [
      "I missed my trial",
      "they had the trial without me",
      "I did not show up to court",
      "judgment was made while I was not there",
    ],
    distinguishedFrom: [
      {
        stage: "civil:both:trial-date-set",
        by: "whether the trial has already been called",
      },
      {
        stage: "civil:defendant:default-judgment-against-me",
        by: "whether the judgment followed a missed trial or a defence that was never delivered",
      },
      {
        stage: "civil:plaintiff:struck-off-trial-list",
        by: "whether no party attended and the action was struck off the list instead of decided",
      },
    ],
    rules: [RCP_52_01_ALL_ABSENT, RCP_52_01_ONE_ABSENT, RCP_52_01_SET_ASIDE, RCP_48_11_STRUCK_OFF, C.R_61_04_APPEAL_30_DAYS],
    // The r. 52.01 (3) set-aside motion has no time in the rule; the Small
    // Claims 30 days (r. 17.01 (5)) is a different court's rule. The appeal
    // clock does run, from the day the order was made.
    deadlines: [
      appealDeadline(
        "deadline:civil:notice-of-appeal-30-days:missed-trial",
        " You can also ask a judge to set aside the judgment under rule 52.01 (3). That rule sets no fixed time. If no party attended and the action was struck off the trial list, other steps apply. There are 30 days to move for leave to restore it, and two years before the registrar dismisses it.",
        [RCP_52_01_SET_ASIDE, RCP_52_01_ALL_ABSENT, RCP_24_01_E_RESTORE, RCP_48_14_FIVE_YEARS],
      ),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:both:judgment-given",
    pathway: "civil",
    side: "both",
    wentWrong: false,
    userQuestion: "The judge decided my case and I disagree — can I appeal, and by when?",
    title: "Final order made after a hearing",
    description:
      "A judge or associate judge of the Superior Court has made a final order in an action the person took part in.",
    cues: [
      "I lost my case",
      "I want to appeal",
      "notice of appeal",
      "Divisional Court or Court of Appeal",
      "they appealed and I want to cross-appeal",
    ],
    distinguishedFrom: [
      {
        stage: "civil:defendant:default-judgment-against-me",
        by: "whether the judgment came from a hearing the person took part in or from default",
      },
      {
        stage: "civil:plaintiff:judgment-unpaid",
        by: "whether the question is appealing the decision or collecting the money",
      },
      {
        stage: "civil:both:interlocutory-order-made",
        by: "whether the order finally decides the action or is made on a motion along the way",
      },
      {
        stage: "civil:both:appeal-in-progress",
        by: "whether a notice of appeal has already been served",
      },
    ],
    rules: [
      S_CJA_6_COURT_OF_APPEAL,
      S_CJA_19_DIVISIONAL,
      S_CJA_19_1_C_ASSOCIATE_FINAL,
      S_CJA_19_50K,
      S_CJA_133_LEAVE,
      C.R_61_04_APPEAL_30_DAYS,
      C.R_61_04_FILE_10_DAYS,
      C.R_61_05_CERTIFICATE,
      RCP_61_07_CROSS_APPEAL,
      RCP_62_02_LEAVE_FROM,
      RCP_61_03_1_FIFTEEN_DAYS,
      C.R_63_01_STAY,
      RCP_3_02_APPEALS,
    ],
    deadlines: [
      appealDeadline(
        "deadline:civil:notice-of-appeal-30-days",
        " For a costs-only appeal, the motion for leave must be served within 15 days after the order, in either appeal court.",
        [RCP_62_02_LEAVE_FROM, RCP_62_02_NOTICE, RCP_61_03_1_FIFTEEN_DAYS],
      ),
      {
        id: "deadline:civil:cross-appeal-15-days",
        what: "If the other side appealed and you want the order changed too, serve a notice of cross-appeal (Form 61E)",
        countFrom: "the day you were served with the notice of appeal",
        countFromEvent: "served-with-notice-of-appeal",
        length: { unit: "days", count: 15 },
        regime: "civil-rules",
        rule: RCP_61_07_CROSS_APPEAL,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "This applies if you want the order set aside or changed. It also applies if you want a different result if the appeal succeeds. Only a judge of the appeal court can extend the time.",
        exceptions: [RCP_3_02_APPEALS],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "civil:both:appeal-in-progress",
    pathway: "civil",
    side: "both",
    wentWrong: false,
    userQuestion: "An appeal has been started — what has to be done next, and by when?",
    title: "Appeal started, not yet perfected or heard",
    description:
      "A notice of appeal from a final order has been served, and the appeal has not been heard. The person may be the appellant or the respondent.",
    cues: [
      "I filed my notice of appeal",
      "they appealed",
      "perfect the appeal",
      "transcript for the appeal",
      "respondent's certificate respecting evidence",
      "appeal dismissed for delay",
    ],
    distinguishedFrom: [
      {
        stage: "civil:both:judgment-given",
        by: "whether a notice of appeal has already been served",
      },
    ],
    rules: [
      C.R_61_04_FILE_10_DAYS,
      RCP_61_05_RESPONDENT_CERTIFICATE,
      RCP_61_05_DEEMED_CONFIRMED,
      RCP_61_05_TRANSCRIPT_ORDERED,
      RCP_61_09_PERFECT,
      RCP_61_12_RESPONDENT_FACTUM,
      RCP_61_13_MOTION,
      RCP_61_13_REGISTRAR_ONE_YEAR,
      RCP_61_13_REGISTRAR_NOTICE,
      RCP_61_13_DISMISS,
      RCP_61_07_CROSS_APPEAL,
      RCP_61_07_FILE_CROSS_APPEAL,
      RCP_61_12_CROSS_APPEAL_FACTUM,
      C.R_63_01_STAY,
    ],
    deadlines: [
      {
        id: "deadline:civil:file-notice-of-appeal-10-days",
        what: "If you are the appellant, file the notice of appeal, with proof of service, in the Registrar's office",
        countFrom: "the day you served the notice of appeal",
        countFromEvent: "served-with-notice-of-appeal",
        length: { unit: "days", count: 10 },
        regime: "civil-rules",
        rule: C.R_61_04_FILE_10_DAYS,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "The 30 days to file proof that you ordered a transcript, and the 30 days to perfect an appeal that needs no transcript, are both counted from the day you file it. Only a judge of the appeal court can extend the time.",
        exceptions: [RCP_61_05_TRANSCRIPT_ORDERED, RCP_61_09_PERFECT, RCP_3_02_APPEALS],
      },
      {
        id: "deadline:civil:respondent-certificate-15-days",
        what: "If you are the respondent, serve a respondent's certificate respecting evidence (Form 61D) on the appellant. File it with proof of service",
        countFrom: "the day you were served with the appellant's certificate, which comes with the notice of appeal",
        countFromEvent: "served-with-notice-of-appeal",
        length: { unit: "days", count: 15 },
        regime: "civil-rules",
        rule: RCP_61_05_RESPONDENT_CERTIFICATE,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "It confirms the appellant's certificate, or sets out additions or deletions. If you do not serve and file it in time, you are treated as confirming the appellant's certificate. A notice of cross-appeal has the same 15 days. It must be filed with proof of service within 10 days after it is served.",
        exceptions: [C.R_61_04_APPEAL_30_DAYS, RCP_61_05_DEEMED_CONFIRMED, RCP_61_07_CROSS_APPEAL, RCP_61_07_FILE_CROSS_APPEAL],
      },
      {
        id: "deadline:civil:transcript-ordered-30-days",
        what: "If you are the appellant, file proof that you have ordered a transcript of all oral evidence the parties have not agreed to leave out",
        countFrom: "the day you filed the notice of appeal",
        countFromEvent: "notice-of-appeal-filed",
        length: { unit: "days", count: 30 },
        regime: "civil-rules",
        rule: RCP_61_05_TRANSCRIPT_ORDERED,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "If you do not, the respondent can ask the Registrar, on ten days notice, to dismiss the appeal for delay. If the problem is not fixed before that motion is heard, the Registrar dismisses the appeal. Costs are then fixed at $750. A judge of the appeal court can allow more time.",
        exceptions: [RCP_61_13_MOTION, RCP_61_13_DISMISS],
      },
      {
        id: "deadline:civil:perfect-appeal-no-transcript-30-days",
        what: "If you are the appellant and no transcript is needed, perfect the appeal by serving and filing the appeal documents",
        countFrom: "the day you filed the notice of appeal",
        countFromEvent: "notice-of-appeal-filed",
        length: { unit: "days", count: 30 },
        regime: "civil-rules",
        rule: RCP_61_09_PERFECT,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "If you do not, the respondent can move to have the appeal dismissed for delay. Or the Registrar can give notice that it will be dismissed unless it is perfected within 10 days. If the problem is not fixed in time, the Registrar dismisses the appeal, with costs fixed at $750. A judge of the appeal court can allow more time after a Registrar's notice. If there is a cross-appeal, deliver your factum as respondent to it within 10 days after the respondent's factum is served.",
        exceptions: [RCP_61_12_CROSS_APPEAL_FACTUM, RCP_61_13_MOTION, RCP_61_13_REGISTRAR_NOTICE, RCP_61_13_DISMISS],
      },
      {
        id: "deadline:civil:perfect-appeal-with-transcript-60-days",
        what: "If you are the appellant and a transcript is needed, perfect the appeal by serving and filing the appeal documents",
        countFrom: "the day you received notice that the evidence has been transcribed",
        countFromEvent: "transcript-ready-notice",
        length: { unit: "days", count: 60 },
        regime: "civil-rules",
        rule: RCP_61_09_PERFECT,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier:
          "If you do not, the respondent can move to have the appeal dismissed for delay. The Registrar can also give notice that the appeal will be dismissed unless it is perfected within 10 days. The Registrar can do this if the transcript is not filed within 60 days after the Registrar was told it was ready. The Registrar can also do it if the appeal is not perfected within one year after the notice of appeal was filed. If the problem is not fixed in time, the Registrar dismisses the appeal, with costs fixed at $750. If there is a cross-appeal, deliver your factum as respondent to it within 10 days after the respondent's factum is served.",
        exceptions: [RCP_61_12_CROSS_APPEAL_FACTUM, RCP_61_13_MOTION, RCP_61_13_REGISTRAR_ONE_YEAR, RCP_61_13_DISMISS],
      },
      {
        id: "deadline:civil:respondent-factum-60-days",
        what: "If you are the respondent, deliver your factum and compendium",
        countFrom: "the day you were served with the appeal book and compendium, exhibit book, any transcript and the appellant's factum",
        countFromEvent: "served-with-appeal-materials",
        length: { unit: "days", count: 60 },
        regime: "civil-rules",
        rule: RCP_61_12_RESPONDENT_FACTUM,
        computation: RCP_3_01_COUNT,
        consequence: "changes-what-happens-next",
        qualifier: "Deliver means serve it on the other parties and file it with proof of service. Only a judge of the appeal court can extend the time.",
        exceptions: [RCP_1_03_DELIVER, RCP_3_02_APPEALS],
      },
    ],
    requiresAffirmativeScope: true,
  },
];

export const CIVIL_STAGES: CaseStage[] = [...BEFORE_FILING, ...PLAINTIFF, ...DEFENDANT, ...BOTH];
