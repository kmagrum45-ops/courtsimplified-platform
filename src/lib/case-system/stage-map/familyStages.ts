/**
 * Family cases under the Family Law Rules — the stage map for the family pathway.
 *
 * Same shape and same rules as the Small Claims map (stageMap.ts): every rule
 * is a verbatim quote that verifyStageMap reads back out of the corpus, every
 * deadline carries its counting provision and its exceptions, and nothing here
 * is a summary of a rule.
 *
 * *** THINGS WORTH KNOWING BEFORE CHANGING THIS FILE ***
 *
 * - family-law-rules.txt uses curly apostrophes (’). The quotes below copy the
 *   file's own characters; a straight apostrophe fails the verifier.
 *
 * - Two counting rules, not one. r. 3 (1) counts every period. r. 3 (2) adds
 *   that a period of LESS THAN SEVEN DAYS skips Saturdays, Sundays and days all
 *   court offices are closed. The 6-day, 4-day and 3-day motion and conference
 *   periods are therefore business days and cite r. 3 (2) as their computation;
 *   the 7-, 10-, 20-, 30- and 45-day periods cite r. 3 (1).
 *
 * - r. 3 (6) lets the parties change most times by written consent, but NOT
 *   the motion confirmation (r. 14 (11) (e)) or the conference confirmation
 *   (r. 17 (14) (c)). Those qualifiers say so and must keep saying so.
 *
 * - r. 3 (7): court staff must refuse a document filed late. A missed answer is
 *   not cured by simply filing it late; it takes written consent (r. 3 (6)) or
 *   a court order (r. 3 (5)). That is why the missed-answer stages cite both.
 *
 * - The answer period is 30 days, and 60 only if served outside Canada OR the
 *   United States (r. 10 (2)). Service in the US is still 30 days. The motion-
 *   to-change response period turns on where the responding party RESIDES and
 *   runs from when they RECEIVE the documents (r. 15 (10)) — not where or when
 *   they were served. Do not "harmonise" the two.
 *
 * *** OUT OF SCOPE: CHILD PROTECTION (CYFSA) CASES ***
 *
 * The Family Law Rules apply to cases under Parts V, VII and VIII of the
 * Child, Youth and Family Services Act, 2017 (r. 1 (2) (a) (ii)), with their
 * own steps: a plan of care with the answer, the r. 33 timetable, different
 * appeal times (r. 38 (2), (7)). This map deliberately does NOT model them. A
 * parent served by a children's aid society is a different position with
 * different stakes, and modelling it half-way would be worse than routing it
 * elsewhere. Where a stage here says "different times apply in a child
 * protection case", that is a pointer out of this map, not a gap in it. The
 * classifier should treat a CYFSA matter as outside this pathway.
 *
 * *** ALSO OUT OF SCOPE: INTERJURISDICTIONAL SUPPORT (RULES 37, 37.1) AND
 * *** INTERNATIONAL CHILD ABDUCTION (RULE 37.2) ***
 *
 * These run on their own rules, response times and statutes (the
 * Interjurisdictional Support Orders Act, 2002 is not vendored). Several
 * stages here name them only to say a rule does not apply to them. A reader
 * in one of these cases is outside this map, not in a gap of it.
 *
 * *** DEADLINES THAT ARE STATED IN A QUALIFIER RATHER THAN THEIR OWN ENTRY ***
 *
 * - r. 8 (5) "served immediately" sets no number of days, so its count-0
 *   deadline does not render. Its words are carried in the applicant's
 *   information-program qualifier, and r. 8 (5) is the stage's first rule.
 * - Appeals from a Superior Court family order go under Rules of Civil
 *   Procedure r. 61.04 via Family Law Rules r. 38 (1), and Divorce Act orders
 *   carry the federal s. 21 (3) 30 days. A family stage cannot carry a
 *   civil-rules deadline, and the Ontario Legislation Act does not count a
 *   federal period, so both are stated in the qualifier of the final-order
 *   appeal deadline, with their provisions in `exceptions`.
 *
 * *** THE FAMILY LAW ACT s. 7 (3) LIMIT IS ONE LIMIT WITH THREE CLOCKS ***
 *
 * It ends on the EARLIEST of 2 years after divorce or nullity, 6 years after
 * separation, and 6 months after death. A deadline has one event, so it is
 * three deadlines that share one qualifier saying "the earliest of three
 * dates", each carrying the s. 2 (8) extension. Do not drop the qualifier from
 * any of them: read alone, each overstates the time.
 *
 * *** REVIEW 2026-10-01 ***
 *
 * An independent review found 14 errors and 5 minor points. Most were rules
 * cited but never rendered (r. 13 (12), r. 13 (14)), deadlines missing beside
 * the ones given (automatic order, expert reports, information-program
 * certificate), the r. 3 (2) weekend sentence next to a 7-day period, and
 * quotes that stopped one clause short (r. 5 (3)). A rule in `rules` does not
 * reach the reader's deadline section; if a reader must act by a date, it
 * belongs in `deadlines` or in a rendered qualifier.
 */
import type { CaseStage } from "./stageMap";
import type { RuleCitation } from "./citations";
import * as C from "./citations";

const flr = (pinpoint: string, quote: string): RuleCitation => ({
  sourceId: "family-law-rules",
  pinpoint,
  quote,
});

// ------------------------------------------------------------ counting time

const F_R3_1_COUNTING = flr(
  "r. 3 (1)",
  "In these rules or an order, the number of days between two events is counted as follows: 1. The first day is the day after the first event. 2. The last day is the day of the second event.",
);

const F_R3_2_SHORT = flr(
  "r. 3 (2)",
  "If a rule or order provides a period of less than seven days for something to be done, Saturdays, Sundays and other days when all court offices are closed do not count as part of the period.",
);

const F_R3_3_CLOSED = flr(
  "r. 3 (3)",
  "If the last day of a period of time under these rules or an order falls on a day when court offices are closed, the period ends on the next day they are open.",
);

const F_R3_5_COURT_CHANGES_TIME = flr(
  "r. 3 (5)",
  "The court may make an order to lengthen or shorten any time set out in these rules or in an order, subject to any limitations provided for by these rules.",
);

const F_R3_6_CONSENT = flr(
  "r. 3 (6)",
  "The parties may, by consent in writing, change any time set out in these rules, except that they may not change a time set out in, (a) clause 14 (11) (e) (confirmation of motion); (b) clause 17 (14) (c) (confirmation of conference);",
);

const F_R3_7_LATE_REFUSED = flr(
  "r. 3 (7)",
  "The staff at a court office shall refuse to accept a document that a person asks to file after, (a) the time specified in these rules; or (b) the later time specified in a consent under subrule (6), a statute that applies to the case, or a court order.",
);

// ------------------------------------------------------- which court, where

const F_R1_2_APPLIES = flr(
  "r. 1 (2)",
  "These rules apply to all family law cases in the Family Court of the Superior Court of Justice, in the Superior Court of Justice and in the Ontario Court of Justice, (a) under, ... (iii) the Children’s Law Reform Act, except sections 59 and 60, ... (iv) the Divorce Act (Canada), ... (v) the Family Law Act, except Part V, (vi) the Family Responsibility and Support Arrears Enforcement Act, 1996,",
);

const F_R1_3_FAMILY_COURT = flr(
  "r. 1 (3)",
  "Despite subrule (2), rule 39 (case management in the Family Court of the Superior Court of Justice) applies only to cases in the Family Court of the Superior Court of Justice, which has jurisdiction in the following municipalities:",
);

const S_CJA_21_8_FAMILY_COURT: RuleCitation = {
  sourceId: "cja-courts-of-justice-act",
  pinpoint: "s. 21.8 (1)",
  quote:
    "In the parts of Ontario where the Family Court has jurisdiction, proceedings referred to in the Schedule to this section, except appeals and prosecutions, shall be commenced, heard and determined in the Family Court.",
};

const F_R5_1_WHERE = flr(
  "r. 5 (1)",
  "Subject to sections 21.8 and 21.11 of the Courts of Justice Act (territorial jurisdiction — Family Court), a case shall be started, (a) in the municipality where a party resides; (b) if the case deals with decision-making responsibility, parenting time or contact with respect to a child, in the municipality where the child habitually resides, except as provided for under section 22 of the Children’s Law Reform Act; ... (c) in a municipality chosen by all parties, but only with the court’s permission given in advance in that municipality.",
);

const F_R5_3_CLERK_REFUSES = flr(
  "r. 5 (3)",
  "The clerk shall refuse to accept an application for filing unless, (a) the case is started in the municipality where a party resides; (b) the case deals with decision-making responsibility, parenting time or contact with respect to a child, or is a child protection case, and is started in the municipality where the child habitually resides; (c) the case is started in a municipality chosen by all parties and the order permitting the case to be started there is filed with the application; or (d) the person asking to file the application says in writing that the case is one that is permitted by clause (1) (b), (b.1) or (b.2) or subrule (2) to be started in that municipality.",
);

const F_R5_8_TRANSFER = flr(
  "r. 5 (8)",
  "If it is substantially more convenient to deal with a case or any step in the case in another municipality, the court may, on motion, order that the case or step be transferred there.",
);

// ------------------------------------------------------- starting a case

const F_R8_1_START = flr(
  "r. 8 (1)",
  "To start a case, a person shall file an application (Form 8, 8A, 8B, 8B.1, 8B.2, 8C, 8D, 8D.1, 33D.1, 34L or 34N).",
);

const F_R8_4_COURT_DATE = flr(
  "r. 8 (4)",
  "When an application is filed, the clerk shall, (a) set a court date, except as provided by subrule 39 (7) (case management, standard track) and subrule 41 (4) (case management, clerk’s role); and (b) seal the application with the court seal.",
);

const F_R8_5_SERVE_IMMEDIATELY = flr(
  "r. 8 (5)",
  "The application shall be served immediately on every other party, and special service shall be used unless the party is listed in subrule (6).",
);

const F_R8_11_NOT_SERVED_BY_COURT_DATE = flr(
  "r. 8 (11)",
  "If an application is not served on a respondent on or before the court date, at the applicant’s request the clerk shall set a new court date for that respondent and the applicant shall make the necessary change to the application and serve it immediately on that respondent.",
);

const F_R6_3_SPECIAL_SERVICE = flr(
  "r. 6 (3)",
  "Special service of a document on a person is carried out by, (a) leaving a copy, (i) with the person to be served, ... (c) mailing a copy to the person, together with an acknowledgment of service in the form of a prepaid return postcard (Form 6), all in an envelope that is addressed to the person and has the sender’s return address (but service under this clause is not valid unless the return postcard, signed by the person, is filed in the continuing record); or (d) leaving a copy at the person’s place of residence, in an envelope addressed to the person, with anyone who appears to be an adult person resident at the same address and, on the same day or on the next, mailing another copy to the person at that address.",
);

const F_R6_4_1_NOT_BY_PARTY = flr(
  "r. 6 (4.1)",
  "Subject to subrule (4.2), special service of the following documents shall be carried out by a person other than the party required to serve the document: 1. An application (Form 8, 8A, 8B, 8B.1, 8B.2, 8C, 8D, 8D.1, 33D.1, 34L or 34N). 2. A motion to change (Form 15), with all required attachments.",
);

const F_R6_4_2_EXCEPTIONS = flr(
  "r. 6 (4.2)",
  "Subrule (4.1) does not apply if, (a) the party required to serve the document or the person being served is a person referred to in clause 8 (6) (c) (officials, agencies, etc.); or (b) the court orders otherwise.",
);

const F_R6_11_1_LEFT_EFFECTIVE = flr(
  "r. 6 (11.1)",
  "Special service of a document under clause (3) (a) or (b) is effective on the day the copy of the document was left in accordance with those clauses or, if the document was left after 4 p.m., the following day.",
);

const F_R6_11_2_LEFT_AND_MAILED = flr(
  "r. 6 (11.2)",
  "Special service of a document under clause (3) (d) is effective on the fifth day after it was mailed.",
);

const F_R6_15_SUBSTITUTED = flr(
  "r. 6 (15)",
  "The court may order that a document be served by substituted service, using a method chosen by the court, if the party making the motion, (a) provides detailed evidence showing, (i) what steps have been taken to locate the person to be served, and (ii) if the person has been located, what steps have been taken to serve the document on that person; and (b) shows that the method of service could reasonably be expected to bring the document to the person’s attention.",
);

const F_R6_15_1_WITHOUT_NOTICE = flr(
  "r. 6 (15.1)",
  "An order under subrule (15) may be obtained on motion without notice, except where the person to be served is a government agency.",
);

const F_R6_16_SERVICE_NOT_REQUIRED = flr(
  "r. 6 (16)",
  "The court may, on motion without notice, order that service is not required if, (a) reasonable efforts to locate the person to be served have not been or would not be successful; and (b) there is no method of substituted service that could reasonably be expected to bring the document to the person’s attention.",
);

const F_R6_18_APPROVE_IRREGULAR = flr(
  "r. 6 (18)",
  "When a document has been served by a method not allowed by these rules or by an order, the court may make an order approving the service if the document, (a) came to the attention of the person to be served; or (b) would have come to the person’s attention if the person had not been evading service.",
);

const F_R6_20_NOT_SEEN = flr(
  "r. 6 (20)",
  "The court may, on motion, lengthen a time, set aside the consequences of failing to take a step by a specified time, order an adjournment, or make any other order that is just, if, despite service of a document having been effected on a person in accordance with this rule, the person shows that the document, (a) did not come to his or her notice; or (b) came to his or her notice only after the effective date of service.",
);

// --------------------------------------------- mandatory information program

const F_R8_1_1_MIP_APPLIES = flr(
  "r. 8.1 (1)",
  "This rule applies to cases started after August 31, 2011 that deal with any of the following: 1. A claim respecting decision-making responsibility, parenting time or contact with respect to a child under the Divorce Act (Canada) or Part III of the Children’s Law Reform Act. 2. A claim respecting net family property under Part I of the Family Law Act. 3. A claim respecting a matrimonial home under Part II of the Family Law Act. 4. A claim for support under the Divorce Act (Canada) or Part III of the Family Law Act. 5. A restraining order under the Family Law Act or the Children’s Law Reform Act. 6. A motion to change a final order or agreement under rule 15, except motions that deal only with changing child or spousal support.",
);

const F_R8_1_2_MIP_EXCEPTIONS = flr(
  "r. 8.1 (2)",
  "Subrules (4) to (7) do not apply to, (a) a person or agency referred to in subsection 33 (3) of the Family Law Act; (b) the Director of the Family Responsibility Office; (c) parties in cases that are proceeding on consent; (d) parties in cases in which the only claims made are for a divorce, costs or the incorporation of the terms of an agreement or prior court order; (d.1) parties to an application in which the only claims made in the application and any answer relate to a family arbitration, family arbitration agreement or family arbitration award, unless the court orders otherwise; (d.2) parties in international child abduction cases; or (e) parties who have already attended a mandatory information program.",
);

const F_R8_1_4_MIP_45_DAYS = flr(
  "r. 8.1 (4)",
  "Each party to a case shall attend the program no later than 45 days after the case is started.",
);

const F_R8_1_5_MIP_APPOINTMENTS = flr(
  "r. 8.1 (5)",
  "The applicant shall arrange his or her own appointment to attend the program, obtain an appointment for the respondent from the person who conducts the program, and serve notice of the respondent’s appointment with the application.",
);

const F_R8_1_7_MIP_NO_STEPS = flr(
  "r. 8.1 (7)",
  "A party shall not take any step in the case before his or her certificate of attendance is filed, except that a respondent may serve and file an answer and a party may make an appointment for a case conference.",
);

const F_R8_1_8_MIP_EXCUSED = flr(
  "r. 8.1 (8)",
  "The court may, on motion, order that any or all of subrules (4) to (7) do not apply to the party because of urgency or hardship or for some other reason in the interest of justice.",
);

// --------------------------------------------------------------- answering

const F_R10_1_ANSWER = flr(
  "r. 10 (1)",
  "A person against whom an application is made shall serve an answer (Form 10, 33B, 33B.1, 33B.2 or 33D.3) on every other party and file it within 30 days after being served with the application.",
);

const F_R10_2_OUTSIDE = flr(
  "r. 10 (2)",
  "If an application is served outside Canada or the United States of America, the time for serving and filing an answer is 60 days.",
);

const F_R10_2_1_ADOPTION = flr(
  "r. 10 (2.1)",
  "In an application to dispense with a parent’s consent before adoption placement, (Form 8D.1), the time for serving the answer is, (a) 20 days, if the application is served in Canada or the United States of America; (b) 40 days, if the application is served outside Canada or the United States of America.",
);

const F_R10_3_CLAIM_IN_ANSWER = flr(
  "r. 10 (3)",
  "A respondent may include in the answer, (a) a claim against the applicant; (b) a claim against any other person, who then also becomes a respondent in the case.",
);

const F_R10_5_NO_ANSWER = flr(
  "r. 10 (5)",
  "The consequences set out in paragraphs 1 to 4 of subrule 1 (8.4) apply, with necessary changes, if a respondent does not serve and file an answer.",
);

const F_R10_6_REPLY = flr(
  "r. 10 (6)",
  "A party may, within 10 days after being served with an answer, serve and file a reply (Form 10A) in response to a claim made in the answer.",
);

const F_R1_8_1_FAILURE_TO_FOLLOW = flr(
  "r. 1 (8.1)",
  "If a person fails to follow these rules, the court may deal with the failure by making any order described in subrule (8), other than a contempt order under clause (8) (g).",
);

const F_R1_8_4_CONSEQUENCES = flr(
  "r. 1 (8.4)",
  "If an order is made striking out a party’s application, answer, motion to change or response to motion to change in a case, the following consequences apply unless a court orders otherwise: 1. The party is not entitled to any further notice of steps in the case, except as provided by subrule 25 (13) (service of order). 2. The party is not entitled to participate in the case in any way. 3. The court may deal with the case in the party’s absence. 4. A date may be set for an uncontested trial of the case.",
);

// --------------------------------------------------------- financial disclosure

const F_R13_1_FINANCIAL_STATEMENT = flr(
  "r. 13 (1)",
  "If an application, answer or motion contains a claim for support, a property claim, or a claim for exclusive possession of the matrimonial home and its contents, (a) the party making the claim shall serve and file a financial statement (Form 13 or 13.1) with the document that contains the claim; and (b) the party against whom the claim is made shall serve and file a financial statement within the time for serving and filing an answer, reply or affidavit or other document responding to the motion, whether the party is serving an answer, reply or affidavit or other document responding to the motion or not.",
);

const F_R13_1_3_TABLE_CHILD_SUPPORT = flr(
  "r. 13 (1.3)",
  "If the only claim for support contained in the application, answer or motion is a claim for child support in the amount specified in the table of the applicable child support guidelines, the party making the claim is not required to file a financial statement, unless the application, answer or motion also contains a property claim or a claim for exclusive possession of the matrimonial home and its contents.",
);

const F_R13_3_2_1_BEFORE_CASE_CONFERENCE = flr(
  "r. 13 (3.2.1)",
  "The party shall also give the information referred to in subrule (3.1) to the other party before any case conference in the case, unless the information has already been served on that party.",
);

const F_R13_4_2_MOTION_TO_CHANGE_SUPPORT = flr(
  "r. 13 (4.2)",
  "if a motion is made under rule 15 requesting a change to a final support order or a support agreement: 1. The party making the motion shall serve and file a financial statement (Form 13 or 13.1) with the motion to change (Form 15). 2. The party responding to the motion shall serve and file a financial statement within the time for serving and filing the response to motion to change (Form 15B) or returning the consent motion to change (Form 15C) to the party making the motion, as set out in subrule 15 (10).",
);

const F_R13_11_MORE_INFORMATION = flr(
  "r. 13 (11)",
  "If a party believes that the financial disclosure provided by another party under this rule, whether in a financial statement or otherwise, does not provide enough information for a full understanding of the other party’s financial circumstances, (a) the party shall make a request in writing to the other party for the necessary additional information; and (b) if any requested information is not given within seven days of the request, the court may, on motion or at a case conference or settlement conference, order the other party to give the information or to serve and file a new financial statement.",
);

const F_R13_12_UPDATE = flr(
  "r. 13 (12)",
  "Before a case conference, settlement conference, motion or trial, a party shall update their financial information by serving and filing the document specified in subrule (12.1) no later than the time specified in subrule (12.2), if the information in the last financial statement provided by the party would be, (a) for a case conference or settlement conference, more than 60 days old by the time the conference is held; (b) for a motion, more than 30 days old by the time the motion is heard; or (c) for a trial, more than 40 days old by the earlier of the start of the trial and of the trial sitting, as applicable.",
);

const F_R13_12_2_UPDATE_TIMING = flr(
  "r. 13 (12.2)",
  "A party shall serve and file the document referred to in subrule (12.1) no later than the following time: 1. For a case conference or settlement conference, i. six days before the conference, in the case of the party requesting the conference or, if the conference is not requested by a party, the applicant or the party making the motion, as the case may be, and ii. four days before the conference, in the case of the other party. 2. For a motion, i. six days before the motion, in the case of the party making the motion, and ii. four days before the motion, in the case of the other party. 3. For a trial, 30 days before the earlier of the start of the trial and of the trial sitting, as applicable.",
);

const F_R13_14_NFP_STATEMENT = flr(
  "r. 13 (14)",
  "Before a settlement conference or trial, each party to a property claim under Part I of the Family Law Act shall, no later than the time specified in subrule (14.0.1), serve and file, (a) a net family property statement (Form 13B); or",
);

// ------------------------------------------------------------------ motions

const F_R14_1_MOTION = flr(
  "r. 14 (1)",
  "A person who wants any of the following may make a motion: 1. A temporary order for a claim made in an application. 2. Directions on how to carry on the case. 3. A change in a temporary order.",
);

const F_R14_4_CONFERENCE_FIRST = flr(
  "r. 14 (4)",
  "No notice of motion or supporting evidence may be served and no motion may be heard before a conference dealing with the substantive issues in the case has been completed.",
);

const F_R14_4_2_URGENCY = flr(
  "r. 14 (4.2)",
  "Subrule (4) does not apply if the court is of the opinion that there is a situation of urgency or hardship or that a case conference is not required for some other reason in the interest of justice.",
);

const F_R14_9_DOCUMENTS = flr(
  "r. 14 (9)",
  "A motion, whether made with or without notice, (a) requires a notice of motion (Form 14) and an affidavit (Form 14A); and (b) may be supported by additional evidence.",
);

const F_R14_11_SERVE_FILE = flr(
  "r. 14 (11) (a)-(c)",
  "A party making a motion with notice shall, (a) serve the documents mentioned in subrule (9) or (10) on all other parties, not later than six days before the motion date; (b) file the documents as soon as possible after service, but not later than four days before the motion date; (c) confer or make best efforts to confer orally or in writing with every other party about the issues that are in dispute in the motion, unless the party is prohibited from such communication by a court order or there is a risk of domestic violence by a party who is not represented by a licensed representative;",
);

const F_R14_11_E_CONFIRM = flr(
  "r. 14 (11) (e)",
  "not later than 2 p.m. three days before the motion date, give the clerk the confirmation of motion (Form 14C) by,",
);

const F_R14_11_1_NOT_CONFIRMED = flr(
  "r. 14 (11.1)",
  "Unless the court orders otherwise, a motion shall not be heard if confirmation of the motion is not given to the clerk in accordance with clause (11) (e).",
);

const F_R14_11_3_RESPONSE = flr(
  "r. 14 (11.3)",
  "A response by a person to a motion made using a notice of motion (Form 14) shall be served and filed not later than four days before the motion date.",
);

const F_R14_11_4_RESPONSE_FORM_14B = flr(
  "r. 14 (11.4)",
  "A response by a person to a motion made using a motion form (Form 14B) shall be served and filed not later than seven days after the motion form is served on the person.",
);

const F_R14_12_WITHOUT_NOTICE = flr(
  "r. 14 (12)",
  "A motion may be made without notice if, (a) the nature or circumstances of the motion make notice unnecessary or not reasonably possible; ... (c) there is an immediate danger to the health or safety of a child or of the party making the motion, and the delay involved in serving a notice of motion would probably have serious consequences;",
);

const F_R14_14_COMES_BACK = flr(
  "r. 14 (14)",
  "An order made on motion without notice (Form 14D) shall require the matter to come back to the court and, if possible, to the same judge, within 14 days or on a date chosen by the court.",
);

const F_R14_15_SERVED = flr(
  "r. 14 (15)",
  "An order made on motion without notice shall be served immediately on all parties affected, together with all documents used on the motion, unless the court orders otherwise.",
);

const F_R14_20_EVIDENCE = flr(
  "r. 14 (20)",
  "The following restrictions apply to evidence for use on a motion, unless the court orders otherwise: 1. The party making the motion shall serve all the evidence in support of the motion with the notice of motion. 2. The party responding to the motion shall then serve all the evidence in response.",
);

const F_R25_19_CHANGE_ORDER = flr(
  "r. 25 (19)",
  "The court may, on motion, change an order that, (a) was obtained by fraud; (b) contains a mistake; (c) needs to be changed to deal with a matter that was before the court but that it did not decide; (d) was made without notice; or (e) was made with notice, if an affected party was not present when the order was made because the notice was inadequate or the party was unable, for a reason satisfactory to the court, to be present.",
);

// ------------------------------------------------------ motions to change

const F_R8_2_ONLY_BY_RULE_15 = flr(
  "r. 8 (2)",
  "Subject to subrule 25 (19) (changing order — fraud, mistake, lack of notice), a party who wants to ask the court to change a final order or an agreement for support filed under section 35 of the Family Law Act, or a family arbitration award filed under section 59.9 of that Act, may do so only by a motion under rule 15 (if permitted to do so by that rule).",
);

const F_R15_2_APPLIES = flr(
  "r. 15 (2)",
  "Subject to subrule (3), this rule only applies to a motion to change, (a) a final order; (b) an agreement for support filed under section 35 of the Family Law Act; or (c) a family arbitration award filed under section 59.9 of the Family Law Act.",
);

const F_R15_5_MOTION_TO_CHANGE = flr(
  "r. 15 (5)",
  "Subject to subrules (17) and (18), a party who wants to ask the court to change a final order or agreement shall serve and file a motion to change (Form 15), with all required attachments.",
);

const F_R15_6_BLANK_FORMS = flr(
  "r. 15 (6)",
  "The party making the motion shall serve on the other party a blank response to motion to change (Form 15B) and a blank consent motion to change (Form 15C) together with the documents referred to in subrule (5).",
);

const F_R15_7_SPECIAL_SERVICE = flr(
  "r. 15 (7)",
  "The documents referred to in subrules (5), (5.1) and (6) shall be served by special service (subrule 6 (3)), and not by regular service.",
);

const F_R15_9_RESPONSE_OR_CONSENT = flr(
  "r. 15 (9)",
  "The following rules apply to a party who is served with a motion to change a final order or agreement: 1. If the party does not agree to the change or if the party wants to ask the court to make an additional or a different change to the final order or agreement, the party shall serve and file a response to motion to change (Form 15B), with all required attachments, within the time set out in clause (10) (a) or (b), as the case may be. 2. If the party agrees to the change or if the parties agree to a different change, the party shall complete the applicable portions of the consent motion to change (Form 15C) and shall, within the time set out in clause (10) (a) or (b), as the case may be, i. return a signed copy of the consent motion to change to the party making the motion, and ii. provide a copy of the signed consent motion to change to the assignee, if any.",
);

const F_R15_10_TIME = flr(
  "r. 15 (10)",
  "The documents referred to in paragraphs 1 and 2 of subrule (9) shall be served and filed or returned and provided, (a) no later than 30 days after the party responding to the motion receives the motion to change and the supporting documents, if that party resides in Canada or the United States of America; or (b) no later than 60 days after the party responding to the motion receives the motion to change and the supporting documents, in any other case.",
);

const F_R15_14_NO_RESPONSE = flr(
  "r. 15 (14)",
  "The consequences set out in paragraphs 1 to 4 of subrule 1 (8.4) apply, with necessary changes, if a party does not serve and file a response to motion to change (Form 15B) or return a consent motion to change (Form 15C) to the party making the motion as required under subrule (9).",
);

const F_R15_15_REQUEST_ORDER = flr(
  "r. 15 (15)",
  "If a party does not serve and file a response to motion to change (Form 15B) or return a consent motion to change (Form 15C) to the party making the motion as required under subrule (9), or if the party’s response is struck out by an order, the party making the motion to change may file a motion form (Form 14B) asking that the court make the order requested in the materials filed by the party, unless an assignee has filed a notice of financial interest in the motion and opposes the change.",
);

// -------------------------------------------------------------- conferences

const F_R17_1_CONFERENCE = flr(
  "r. 17 (1)",
  "Subject to subrules (1.1) and (1.2), in each case in which an answer is filed, a judge shall conduct at least one conference.",
);

const F_R17_2_UNDEFENDED = flr(
  "r. 17 (2)",
  "If no answer is filed, (a) the clerk shall, on request, schedule a case conference or set a date for an uncontested trial or, in an uncontested divorce case, prepare the documents for a judge; and (b) a settlement conference or trial management conference shall be conducted only if the court orders it.",
);

const F_R17_3_MOTION_TO_CHANGE = flr(
  "r. 17 (3)",
  "Subrule (1) applies, with necessary changes, to a motion to change a final order or agreement under rule 15, unless the motion is proceeding on the consent of the parties and any assignee or is unopposed.",
);

const F_R17_3_1_CONFER = flr(
  "r. 17 (3.1)",
  "Before a conference, each party shall, subject to subrule (3.2), confer or make best efforts to confer orally or in writing with every other party respecting, (a) the parties’ requests for financial disclosure; (b) a temporary resolution of the issues that are in dispute; and (c) in the case of a settlement conference or trial management conference, a final resolution of the issues that are in dispute.",
);

const F_R17_3_2_NO_CONFER = flr(
  "r. 17 (3.2)",
  "Subrule (3.1) does not apply with respect to a party if, (a) the party is prohibited from such communication by court order; or (b) there is a risk of domestic violence by a party who is not represented by a licensed representative.",
);

const F_R17_4_CASE_CONFERENCE = flr(
  "r. 17 (4)",
  "The purposes of a case conference include, (a) exploring the chances of settling the case; (b) identifying the issues that are in dispute and those that are not in dispute;",
);

const F_R17_4_1_NOTICE = flr(
  "r. 17 (4.1)",
  "A party who asks for a case conference shall serve and file a case conference notice (Form 17).",
);

const F_R17_5_SETTLEMENT_CONFERENCE = flr(
  "r. 17 (5)",
  "The purposes of a settlement conference include, (a) exploring the chances of settling the case; (b) settling or narrowing the issues in dispute;",
);

const F_R17_6_TRIAL_MANAGEMENT = flr(
  "r. 17 (6)",
  "The purposes of a trial management conference include, (a) exploring the chances of settling the case; ... (f) setting the trial date, if this has not already been done.",
);

const F_R17_10_BEFORE_TRIAL = flr(
  "r. 17 (10)",
  "A case shall not be scheduled for trial unless, (a) a settlement conference has been conducted; or (b) a judge has ordered that the case be scheduled for trial.",
);

const F_R17_13_BRIEFS = flr(
  "r. 17 (13)",
  "Each party shall, within the times required under subrule (13.1), serve and file the following documents for the purposes of a conference: 1. For a case conference, a case conference brief (Form 17A or 17B). 2. For a settlement conference, a settlement conference brief (Form 17C or 17D).",
);

const F_R17_13_1_BRIEF_TIMES = flr(
  "r. 17 (13.1)",
  "The party requesting the conference (or, if the conference is not requested by a party, the applicant or party making the motion) shall serve and file the documents required to be filed for the conference under subrule (13) not later than six days before the date scheduled for the conference and the other party shall do so not later than four days before that date.",
);

const F_R17_14_B_COPY = flr(
  "r. 17 (14) (b)",
  "before giving the clerk confirmation of the conference in Form 17F under clause (c), give a copy of the confirmation of conference to every other party using mail, fax, email or any other method, except in a child protection case; and",
);

const F_R17_14_C_CONFIRM = flr(
  "r. 17 (14) (c)",
  "not later than 2 p.m. three days before the conference date, give the clerk the confirmation of conference (Form 17F) by,",
);

const F_R17_14_1_NOT_CONFIRMED = flr(
  "r. 17 (14.1)",
  "Unless the court orders otherwise, a conference shall not be held if confirmation of the conference is not given to the clerk in accordance with clause (14) (c).",
);

const F_R17_14_2_BRING = flr(
  "r. 17 (14.2)",
  "The following documents shall be brought to a settlement conference: 1. Any document that supports a party’s position in respect of a dispute regarding the value of property or regarding the amount of a debt, in the case of a property claim under Part I of the Family Law Act.",
);

const F_R17_15_ATTEND = flr(
  "r. 17 (15)",
  "The following shall come to each conference: 1. The parties, unless the court orders otherwise.",
);

const F_R17_18_COSTS = flr(
  "r. 17 (18)",
  "Costs shall not be awarded at a conference unless a party to the conference was not prepared, did not serve the required documents, did not make any required disclosure, otherwise contributed to the conference being unproductive or otherwise did not follow these rules, in which case the judge shall, despite subrule 24 (1), (a) order the party to pay the costs of the conference immediately;",
);

const F_R17_19_AGREEMENT = flr(
  "r. 17 (19)",
  "No agreement reached at a conference is effective until it is signed by the parties, witnessed and, in a case involving a special party or a child party, approved by the court.",
);

// -------------------------------------------------------------------- trial

const F_R23_1_TRIAL_RECORD = flr(
  "r. 23 (1)",
  "At least 20 days before the earlier of the start of the trial and of the trial sitting, as applicable, the applicant shall serve and file a trial record containing a table of contents and the following documents:",
);

const F_R23_2_RESPONDENT_ADDS = flr(
  "r. 23 (2)",
  "Not later than seven days before the start of the trial, a respondent may serve, file and add to the trial record any document referred to in subrule (1) that is not already in the trial record.",
);

const F_R23_3_SUMMONS = flr(
  "r. 23 (3)",
  "A party who wants a witness to give evidence in court or to be questioned and to bring documents or other things shall serve on the witness a summons to witness (Form 23) by special service in accordance with subrule 6 (4), together with the witness fee set out in subrule (4).",
);

const F_R23_3_2_SUMMONS_TIME = flr(
  "r. 23 (3.2)",
  "A summons to witness in Form 23 or 23A, together with the witness fee, shall be served on the person summoned as a witness at least seven days before the person is required to be present in court or at a questioning or, if clause 20 (14) (b) applies, within the time specified by the court under that clause.",
);

// ------------------------------------------------------ enforcement, appeals

const F_R26_3_PAYMENT_ORDERS = flr(
  "r. 26 (3)",
  "A payment order may be enforced by, (a) a request for a financial statement (subrule 27 (1)); ... (d) seizure and sale (rule 28); (e) garnishment (rule 29); (f) a default hearing (rule 30), if the order is a support order;",
);

const F_R26_4_OTHER_ORDERS = flr(
  "r. 26 (4)",
  "An order other than a payment order may be enforced by, (a) a writ of temporary seizure of property (subrule 28 (10)); (b) a contempt order (rule 31); and",
);

const F_R26_10_DIRECTOR = flr(
  "r. 26 (10)",
  "If the Director enforces an order under the Family Responsibility and Support Arrears Enforcement Act, 1996, anything in these rules relating to enforcement by the person in whose favour the order was made applies to the Director.",
);

const S_FRSAEA_5_1_DIRECTOR_DUTY: RuleCitation = {
  sourceId: "family-responsibility-support-arrears-enforcement-act",
  pinpoint: "s. 5 (1)",
  quote:
    "It is the duty of the Director to enforce support orders where the support order and the related support deduction order, if any, are filed in the Director’s office and to pay the amounts collected to the person to whom they are owed.",
};

const S_FRSAEA_12_1_CLERK_FILES: RuleCitation = {
  sourceId: "family-responsibility-support-arrears-enforcement-act",
  pinpoint: "s. 12 (1)",
  quote:
    "The clerk or registrar of the court that makes a support order shall file it with the Director’s office promptly after it is signed.",
};

const F_R38_1_HIGHER_COURTS = flr(
  "r. 38 (1)",
  "Rules 61, 62 and 63 of the Rules of Civil Procedure apply with necessary changes, including the changes set out in subrules (2) to (3.1), (a) if an appeal lies to the Divisional Court or the Court of Appeal;",
);

const F_R38_4_OCJ_APPEALS = flr(
  "r. 38 (4)",
  "Subrules (5) to (45.1) apply to an appeal from an order of the Ontario Court of Justice to the Superior Court of Justice under, (a) section 48 of the Family Law Act; (b) section 73 of the Children’s Law Reform Act;",
);

const F_R38_5_START_APPEAL = flr(
  "r. 38 (5)",
  "To start an appeal from a final order of the Ontario Court of Justice to the Superior Court of Justice under any of the provisions listed in subrule (4), a party shall, (a) within 30 days after the date of the order or decision being appealed from, serve a notice of appeal (Form 38) on, (i) every other party affected by the appeal or entitled to appeal, (ii) the clerk of the court in the place where the order was made, and ... (b) within 10 days after serving the notice of appeal, file it.",
);

const F_R38_6_TEMPORARY = flr(
  "r. 38 (6)",
  "Subrule (5) applies to the starting of an appeal from a temporary order of the Ontario Court of Justice to the Superior Court of Justice except that the notice of appeal shall be served within seven days after the date of the temporary order.",
);

const F_R38_7_CYFSA_TEMPORARY = flr(
  "r. 38 (7)",
  "To start an appeal from a temporary order of the Ontario Court of Justice to the Superior Court of Justice in a case under the Child, Youth and Family Services Act, 2017, subrule (5) applies and the notice of appeal shall be served within 30 days after the date of the temporary order.",
);

const S_DIVORCE_12_1_EFFECTIVE: RuleCitation = {
  sourceId: "divorce-act",
  pinpoint: "s. 12 (1)",
  quote:
    "Subject to this section, a divorce takes effect on the thirty-first day after the day on which the judgment granting the divorce is rendered.",
};

// ------------------------------------------------- Family Law Act time limit

const S_FLA_5_1_EQUALIZATION: RuleCitation = {
  sourceId: "family-law-act",
  pinpoint: "s. 5 (1)",
  quote:
    "When a divorce is granted or a marriage is declared a nullity, or when the spouses are separated and there is no reasonable prospect that they will resume cohabitation, the spouse whose net family property is the lesser of the two net family properties is entitled to one-half the difference between them.",
};

const S_FLA_7_3_LIMITATION: RuleCitation = {
  sourceId: "family-law-act",
  pinpoint: "s. 7 (3)",
  quote:
    "An application based on subsection 5 (1) or (2) shall not be brought after the earliest of, (a) two years after the day the marriage is terminated by divorce or judgment of nullity; (b) six years after the day the spouses separate and there is no reasonable prospect that they will resume cohabitation; (c) six months after the first spouse’s death.",
};

const S_FLA_2_8_EXTENSION: RuleCitation = {
  sourceId: "family-law-act",
  pinpoint: "s. 2 (8)",
  quote:
    "The court may, on motion, extend a time prescribed by this Act if it is satisfied that, (a) there are apparent grounds for relief; (b) relief is unavailable because of delay that has been incurred in good faith; and (c) no person will suffer substantial prejudice by reason of the delay.",
};

// ------------------------------------------- added after independent review

const F_R5_2_DANGER = flr(
  "r. 5 (2)",
  "Subject to sections 21.8 and 21.11 of the Courts of Justice Act, if there is immediate danger that a child may be removed from Ontario or immediate danger to a child’s or party’s health or safety, a party may start a case in any municipality and a motion may be heard in that municipality, but the case shall be transferred to a municipality referred to in subrule (1) immediately after the motion is heard, unless the court orders otherwise.",
);

const S_FLA_4_1_COURT_PART_I: RuleCitation = {
  sourceId: "family-law-act",
  pinpoint: "s. 4 (1)",
  quote: "“court” means a court as defined in subsection 1 (1), but does not include the Ontario Court of Justice;",
};

const S_FLA_1_1_SPOUSE: RuleCitation = {
  sourceId: "family-law-act",
  pinpoint: "s. 1 (1)",
  quote:
    "“spouse” means either of two persons who, (a) are married to each other, or (b) have together entered into a marriage that is voidable or void, in good faith on the part of a person relying on this clause to assert any right.",
};

const S_FLA_6_10_ELECTION: RuleCitation = {
  sourceId: "family-law-act",
  pinpoint: "s. 6 (10)",
  quote:
    "The surviving spouse’s election shall be in the form prescribed by the regulations and shall be filed in the office of the Estate Registrar for Ontario within six months after the first spouse’s death.",
};

const S_FLA_6_11_DEEMED_ELECTION: RuleCitation = {
  sourceId: "family-law-act",
  pinpoint: "s. 6 (11)",
  quote:
    "If the surviving spouse does not file the election within that time, he or she shall be deemed to have elected to take under the will or to receive the entitlement under the Succession Law Reform Act, or both, as the case may be, unless the court, on application, orders otherwise.",
};

const S_FLA_37_3_SIX_MONTHS: RuleCitation = {
  sourceId: "family-law-act",
  pinpoint: "s. 37 (3)",
  quote:
    "No application for variation shall be made within six months after the making of the order for support or the disposition of another application for variation in respect of the same order, except by leave of the court.",
};

const S_DIVORCE_2_1_COURT: RuleCitation = {
  sourceId: "divorce-act",
  pinpoint: "s. 2 (1) “court”",
  quote: "court , in respect of a province, means (a) for the Province of Ontario, the Superior Court of Justice,",
};

const S_DIVORCE_3_1_RESIDENCE: RuleCitation = {
  sourceId: "divorce-act",
  pinpoint: "s. 3 (1)",
  quote:
    "A court in a province has jurisdiction to hear and determine a divorce proceeding if either spouse has been habitually resident in the province for at least one year immediately preceding the commencement of the proceeding.",
};

const S_DIVORCE_21_2_NO_APPEAL_AFTER_EFFECT: RuleCitation = {
  sourceId: "divorce-act",
  pinpoint: "s. 21 (2)",
  quote: "No appeal lies from a judgment granting a divorce on or after the day on which the divorce takes effect.",
};

const S_DIVORCE_21_3_THIRTY_DAYS: RuleCitation = {
  sourceId: "divorce-act",
  pinpoint: "s. 21 (3)",
  quote: "No appeal lies from an order made under this Act more than thirty days after the day on which the order was made.",
};

const S_DIVORCE_21_4_EXTENSION: RuleCitation = {
  sourceId: "divorce-act",
  pinpoint: "s. 21 (4)",
  quote:
    "An appellate court or a judge thereof may, on special grounds, either before or after the expiration of the time fixed by subsection (3) for instituting an appeal, by order extend that time.",
};

const S_CJA_19_1_DIVISIONAL: RuleCitation = {
  sourceId: "cja-courts-of-justice-act",
  pinpoint: "s. 19 (1)",
  quote:
    "An appeal lies to the Divisional Court from, (a) a final order of a judge of the Superior Court of Justice, as described in subsections (1.1) and (1.2); (a.1) a final order of a judge of the Family Court made only under a provision of an Act or regulation of Ontario; (b) an interlocutory order of a judge of the Superior Court of Justice, with leave as provided in the rules of court;",
};

const S_CJA_6_1_B_COURT_OF_APPEAL: RuleCitation = {
  sourceId: "cja-courts-of-justice-act",
  pinpoint: "s. 6 (1) (b)",
  quote:
    "(b) a final order of a judge of the Superior Court of Justice, except, (i) an order referred to in clause 19 (1) (a) or (a.1), or (ii) an order from which an appeal lies to the Divisional Court under another Act;",
};

const F_R6_11_3_CLOSED_DAY = flr(
  "r. 6 (11.3)",
  "Despite subrules (7) to (11.2), if the effective date of service under one of those subrules would be a day on which court offices are closed, service is instead effective on the next day on which they are open.",
);

const F_R8_3_1_PARENTING_DOCUMENTS = flr(
  "r. 8 (3.1)",
  "An application containing a claim respecting decision-making responsibility, parenting time or contact with respect to a child shall be accompanied by the applicable documents referred to in rule 35.1.",
);

const F_R8_0_1_1_AUTO_APPLIES = flr(
  "r. 8.0.1 (1)",
  "This rule applies to a case in which any of the following claims is made, if the claim is made on or after February 1, 2022: 1. A claim respecting decision-making responsibility or parenting time with respect to a child under the Divorce Act (Canada) or Part III of the Children’s Law Reform Act. 2. A claim respecting net family property under Part I of the Family Law Act. 3. A claim respecting a matrimonial home under Part II of the Family Law Act. 4. A claim for support under the Divorce Act (Canada) or Part III of the Family Law Act.",
);

const F_R8_0_1_2_WHEN_MADE = flr(
  "r. 8.0.1 (2)",
  "For the purposes of this rule, a claim is made when any of the following occurs: 1. An application that contains the claim is issued. 2. An answer, motion to change a final order or agreement under rule 15 or response to motion to change that contains the claim is filed.",
);

const F_R8_0_1_3_AUTO_ISSUED = flr(
  "r. 8.0.1 (3)",
  "On the making of a claim to which this rule applies, the clerk shall issue an automatic order (Form 8.0.1) and provide it to the party making the claim.",
);

const F_R8_0_1_4_AUTO_EXCEPTIONS = flr(
  "r. 8.0.1 (4)",
  "Subrule (3) does not apply, (a) if an automatic order has already been issued in the case; (b) if the case is proceeding on consent of the parties; (c) if the only claims to which this rule applies relate to, (i) the incorporation of the terms of an agreement or prior court order, or (ii) a family arbitration, family arbitration agreement or family arbitration award; or",
);

const F_R8_0_1_5_AUTO_SERVICE = flr(
  "r. 8.0.1 (5)",
  "The party to whom the automatic order is provided shall serve the automatic order on every other party in the case in accordance with the following rules: 1. If the claim is made in an application, the automatic order shall be served together with the application. 2. If the claim is made in an answer, motion to change a final order or agreement under rule 15 or response to motion to change, the automatic order shall be served promptly after the party receives it from the clerk, but in any event not later than seven days after the automatic order is issued.",
);

const F_R8_1_6_CERTIFICATE = flr(
  "r. 8.1 (6)",
  "The person who conducts the program shall provide for each party who attends a certificate of attendance, which shall be filed as soon as possible, and in any event not later than 2 p.m. on the second day before the day of the case conference, if one is scheduled.",
);

const F_R10_4_ADDED_RESPONDENT = flr(
  "r. 10 (4)",
  "Subrules (1) to (3) apply to a respondent added under subrule (3), except that the time for serving and filing an answer is 14 days after service on the added respondent, or 30 days if the added respondent is served outside Canada or the United States of America.",
);

const F_R10_4_1_PARENTING_DOCUMENTS = flr(
  "r. 10 (4.1)",
  "An answer containing a claim respecting decision-making responsibility, parenting time or contact with respect to a child shall be accompanied by the applicable documents referred to in rule 35.1.",
);

const F_R13_3_3_PART_I_DISCLOSURE = flr(
  "r. 13 (3.3)",
  "A party who is required under subrules (1) to (3) to serve and file a financial statement in relation to a claim under Part I of the Family Law Act shall, no later than 30 days after the day by which the financial statement is required to be served, serve on the other party the following information, unless the court orders otherwise: 1. The statement issued closest to the valuation date for each bank account or other account in a financial institution, pension, registered retirement or other savings plan, and any other savings or investments in which the party had an interest on that date.",
);

const F_R13_3_4_OTHER_PROPERTY_DISCLOSURE = flr(
  "r. 13 (3.4)",
  "A party who is required under subrules (1) to (3) to serve and file a financial statement in relation to a property claim other than a claim under Part I of the Family Law Act shall, no later than 30 days after the day by which the financial statement is required to be served, serve on the other party any information necessary to support the claim, unless the court orders otherwise.",
);

const F_R13_4_TEMPORARY_SUPPORT = flr(
  "r. 13 (4)",
  "Subject to subrule (1.3), the following rules respecting financial statements apply if a motion contains a request for a change in a temporary support order: 1. The party making the motion shall serve and file a financial statement (Form 13 or 13.1) with the notice of motion. 2. The party responding to the motion shall serve and file a financial statement as soon as possible after being served with the notice of motion, but in any event no later than two days before the motion date. Any affidavit in response to the motion shall be served and filed at the same time as the financial statement.",
);

const F_R13_4_3_RESPONSE_ASKS_SUPPORT = flr(
  "r. 13 (4.3)",
  "Subrules (4) and (4.1), or subrule (4.2), as the case may be, apply with necessary changes if a party makes a motion to change an order or agreement for which the party is not required by this rule to file a financial statement, and the party responding to the motion requests a change to a support order or support agreement.",
);

const F_R13_5_0_2_CERTIFICATE = flr(
  "r. 13 (5.0.2)",
  "A party who is required to serve documents under subrule (3.1), (3.3), (3.4) or (5.0.1) shall confirm service by, (a) serving a certificate of financial disclosure (Form 13A) together with the documents; and (b) filing the certificate no later than, (i) six days before a case conference, in the case of the applicant or the party making the motion, as the case may be, and (ii) four days before the case conference, in the case of the other party.",
);

const F_R13_11_0_1_SPECIFY = flr(
  "r. 13 (11.0.1)",
  "In seeking an order under clause (11) (b), the party shall specify in the motion, case conference brief or settlement conference brief the information that was requested under clause (11) (a) but not given.",
);

const F_R13_14_0_1_NFP_TIMING = flr(
  "r. 13 (14.0.1)",
  "A party shall serve and file the document referred to in subrule (14) no later than, (a) for a settlement conference, (i) six days before the conference, in the case of the party requesting the conference or, if the conference is not requested by a party, the applicant or the party making the motion, as the case may be, and (ii) four days before the conference, in the case of the other party; and (b) for a trial, 30 days before the earlier of the start of the trial and of the trial sitting, as applicable.",
);

const F_R13_14_2_JOINT_COMPARISON = flr(
  "r. 13 (14.2)",
  "Parties who have served and filed net family property statements in accordance with subrule (14) shall file a joint comparison of net family property statements (Form 13C) no later than six days before a settlement conference, subject to subrule (14.3).",
);

const F_R13_14_3_SEPARATE_COMPARISON = flr(
  "r. 13 (14.3)",
  "If the parties fail to agree on a joint comparison of net family properties, each party shall serve and file the party’s own comparison of net family property statements (Form 13C) no later than, (a) six days before a settlement conference, in the case of the party requesting the conference or, if the settlement conference is not requested by a party, the applicant or the party making the motion, as the case may be; and (b) four days before the settlement conference, in the case of the other party.",
);

const F_R13_17_ORDER_TO_PROVIDE = flr(
  "r. 13 (17)",
  "If a party has not served or filed a document in accordance with the requirements of this rule or an Act or regulation, the court may on motion order the party to serve or file the document and, if the court makes that order, it shall also order the party to pay costs.",
);

const F_R14_6_A_CHANGE_WITHOUT_NOTICE = flr(
  "r. 14 (6) (a)",
  "Subrule (4) does not apply to a motion, (a) to change a temporary order under subrule 25 (19) (fraud, mistake, lack of notice);",
);

const F_R14_10_MOTION_FORM = flr(
  "r. 14 (10)",
  "If a motion is limited to procedural, uncomplicated or unopposed matters, the party making the motion may use a motion form (Form 14B) instead of a notice of motion and affidavit.",
);

const F_R14_11_D_COPY = flr(
  "r. 14 (11) (d)",
  "before giving the clerk confirmation of the motion in Form 14C under clause (e), give a copy of the confirmation of motion to every other party using mail, fax, email or any other method, subject to subrule (11.0.1); and",
);

const F_R14_11_5_REPLY = flr(
  "r. 14 (11.5)",
  "A party who uses a notice of motion (Form 14) and who is served with a response to it may serve and file a reply not later than 2 p.m. three days before the motion date.",
);

const F_R15_4_WHERE = flr(
  "r. 15 (4)",
  "Rule 5 (where a case starts) applies to a motion to change a final order or agreement as if the motion were a new case.",
);

const F_R15_5_1_PARENTING_DOCUMENTS = flr(
  "r. 15 (5.1)",
  "If the motion includes a claim respecting decision-making responsibility, parenting time or contact with respect to a child, the documents referred to in subrule (5) shall be accompanied by the applicable documents referred to in rule 35.1.",
);

const F_R15_11_ASSIGNEE = flr(
  "r. 15 (11)",
  "In a motion to change a final order or agreement that has been assigned to an assignee, a party shall, in serving documents under subrule (5) or paragraph 1 of subrule (9), serve the documents on the assignee as if the assignee were also a party.",
);

const F_R17_13_TMC_DOCUMENTS = flr(
  "r. 17 (13)",
  "3. For a trial management conference held in the Ontario Court of Justice, a trial management conference brief (Form 17E). 4. For a trial management conference held in the Superior Court of Justice or the Family Court of the Superior Court of Justice, the following documents, subject to paragraph 5: i. The trial scheduling endorsement form referred to in clause (8) (a.1), completed by the parties and endorsed by the court, if it has not already been filed. ii. An offer to settle all outstanding claims in the case. iii. An outline of the party’s opening statement. 5. For a trial management conference held in the Superior Court of Justice or the Family Court of the Superior Court of Justice in relation to a case to which subrule (11) does not apply by virtue of subrule (11.2), a trial management conference brief (Form 17E).",
);

const F_R20_2_2_EXPERT_REPORT = flr(
  "r. 20.2 (2)",
  "A party who wishes to call a litigation expert as a witness at trial shall, at least six days before the settlement conference, serve on all other parties and file a report signed by the expert and containing, at a minimum, the following:",
);

const F_R20_2_4_SUPPLEMENTARY = flr(
  "r. 20.2 (4)",
  "Any supplementary report by a litigation expert must be signed by the expert, and shall be served on all other parties and filed, (a) at least 30 days before the start of the trial; or (b) in a child protection case, at least 14 days before the start of the trial.",
);

const F_R20_2_14_PARTICIPANT = flr(
  "r. 20.2 (14)",
  "A party who wishes to call a participant expert as a witness at trial shall, (a) at least six days before the settlement conference, (i) serve notice of the fact on all other parties, and (ii) if the party wishes to submit any written opinion prepared by the expert as evidence in the trial, serve the written opinion on all other parties and file it; and",
);

const F_R20_2_14_1_LATE = flr(
  "r. 20.2 (14.1)",
  "Unless the trial judge or judge managing the case orders otherwise, the time to serve or file a report, opinion or other document under this rule may only be extended under subrule 3 (5) (order to lengthen or shorten time) by an order made at the settlement conference, together with an order with respect to costs.",
);

const F_R3_6_B1_EXPERT = flr(
  "r. 3 (6) (b.1)",
  "(b.1) rule 20.2 (expert opinion evidence);",
);

const F_R23_22_UNCONTESTED = flr(
  "r. 23 (22)",
  "At an uncontested trial, evidence by affidavit in Form 14A or Form 23C and, if applicable, Forms 35.1 and 35.1A may be used without an order under clause 1 (7.2) (i), unless the court directs that oral evidence must be given.",
);

const F_R38_32_NOT_FILED = flr(
  "r. 38 (32)",
  "If a person serves a notice of appeal and does not file it within 10 days as required by clause (5) (b), the appeal shall be deemed to be withdrawn unless the court orders otherwise.",
);

const F_R38_33_SUPPORT_NOT_STAYED = flr(
  "r. 38 (33)",
  "The service of a notice of appeal from a temporary or final order does not stay a support order or an order that enforces a support order.",
);

const F_R38_34_OTHER_STAYED = flr(
  "r. 38 (34)",
  "The service of a notice of appeal from a temporary or final order stays, until the disposition of the appeal, any other payment order made under the temporary or final order.",
);

const F_R6_4_PERSONAL_ONLY = flr(
  "r. 6 (4)",
  "Special service of the following documents shall be carried out only by a method set out in clause (3) (a), unless the court orders otherwise: 1. A notice of contempt motion. 2. A summons to witness.",
);

const F_R13_12_1_WHICH_DOCUMENT = flr(
  "r. 13 (12.1)",
  "For the purposes of subrule (12), a party shall serve and file the following document: 1. If the information in the last statement has not changed, an affidavit saying that the information in the last statement has not changed and is still true. 2. If the information in the last statement has changed, the following document: i. If the changes are only minor, an affidavit with details of the changes. ii. In any other case, a new financial statement.",
);

// ------------------------------------------- added after the second review

const S_LEGISLATION_89_5_EXCLUDED: RuleCitation = {
  sourceId: "legislation-act-2006",
  pinpoint: "s. 89 (5)",
  quote: "A period of time described as beginning before or after a specified day excludes that day.",
};

const R_RCP_61_03_1_3_LEAVE_TIMES: RuleCitation = {
  sourceId: "rules-of-civil-procedure",
  pinpoint: "r. 61.03.1 (3)",
  quote:
    "The notice of motion, (a) shall be served within 15 days after the making of the order or decision from which leave to appeal is sought, unless a statute provides otherwise; and (b) shall be filed with proof of service in the office of the Registrar within five days after service.",
};

const R_RCP_62_02_1_LEAVE_NEEDED: RuleCitation = {
  sourceId: "rules-of-civil-procedure",
  pinpoint: "r. 62.02 (1)",
  quote:
    "Leave to appeal to the Divisional Court from any of the following orders or decisions shall be obtained from a panel of that court in accordance with this rule: 1. An interlocutory order of a judge of the Superior Court of Justice, under clause 19 (1) (b) of the Courts of Justice Act. 2. A final order of a judge of the Superior Court of Justice for costs, under clauses 19 (1) (a) and 133 (b) of the Courts of Justice Act.",
};

const R_RCP_62_02_3_LEAVE_NOTICE: RuleCitation = {
  sourceId: "rules-of-civil-procedure",
  pinpoint: "r. 62.02 (3)",
  quote:
    "Subrules 61.03.1 (2) and (3) apply, with necessary modifications, to the notice of motion for leave except that the notice shall be in Form 61A.",
};

const F_R38_1_LEAVE = flr(
  "r. 38 (1) (b)",
  "(b) if leave to appeal to the Divisional Court or the Court of Appeal is required, in a family law case as described in subrule 1 (2).",
);

const F_R6_4_IMPRISONMENT = flr(
  "r. 6 (4)",
  "Special service of the following documents shall be carried out only by a method set out in clause (3) (a), unless the court orders otherwise: ... 3. A notice of motion or notice of default hearing in which the person to be served faces a possibility of imprisonment.",
);

const F_R13_3_1_SUPPORT_DOCUMENTS = flr(
  "r. 13 (3.1)",
  "A party who is required under subrules (1) to (3) to serve and file a financial statement in relation to a claim for support shall serve the following information in accordance with subrule (3.2), unless the court orders otherwise: 1. The income and financial information referred to in subsection 21 (1) of the child support guidelines.",
);

const F_R13_3_2_WHEN_SUPPORT_DOCUMENTS = flr(
  "r. 13 (3.2)",
  "The party shall serve the information referred to in subrule (3.1), (a) with the financial statement, if the application, answer or motion contains a claim for support but does not contain a property claim; or (b) with the documents required to be served under subrule (3.3) or (3.4), as the case may be, if the application, answer or motion contains a property claim.",
);

const F_R13_5_0_1_CHANGE_SUPPORT_DOCUMENTS = flr(
  "r. 13 (5.0.1)",
  "A party who is required under subrules (4) to (4.3) to serve and file a financial statement shall serve with the financial statement the following information, unless the court orders otherwise: 1. The documents referred to in subrule (3.1). 2. A current schedule of arrears from the Family Responsibility Office.",
);

const F_R13_13_1_UPDATED_CERTIFICATE = flr(
  "r. 13 (13.1)",
  "Before any settlement conference or trial management conference, a party who has served a corrected, updated or new version of a document referred to in subrule (3.1), (3.3), (3.4) or (5.0.1) in accordance with subrule (15), or additional documents in accordance with subrule (16), shall serve and file an updated certificate of financial disclosure (Form 13A), no later than, (a) six days before the conference, in the case of the party requesting the conference or, if the conference is not requested by a party, the applicant or the party making the motion, as the case may be; and (b) four days before the conference, in the case of the other party.",
);

const F_R14_6_EXEMPT = flr(
  "r. 14 (6)",
  "Subrule (4) does not apply to a motion, (a) to change a temporary order under subrule 25 (19) (fraud, mistake, lack of notice); (b) for a contempt order under rule 31 or an order striking out a document under subrule (22); (c) for summary judgment under rule 16; ... (e) to limit or stay a support order, the enforcement of arrears under a support order, or an alternative payment order under the Family Responsibility and Support Arrears Enforcement Act, 1996; (e.1) in a child protection case; (e.2) made without notice, made on consent, that is unopposed or that is limited to procedural, uncomplicated or unopposed matters (Form 14B); (e.3) made in an appeal;",
);

const F_R14_13_WITHOUT_NOTICE_FILING = flr(
  "r. 14 (13)",
  "The documents for use on a motion without notice shall be filed on or before the motion date, unless the court orders otherwise.",
);

const F_R16_1_SUMMARY_JUDGMENT = flr(
  "r. 16 (1)",
  "After the respondent has served an answer or after the time for serving an answer has expired, a party may make a motion for summary judgment for a final order without a trial on all or part of any claim made or any defence presented in the case.",
);

const F_R16_4_1_RESPONDING_EVIDENCE = flr(
  "r. 16 (4.1)",
  "In response to the affidavit or other evidence served by the party making the motion, the party responding to the motion may not rest on mere allegations or denials but shall set out, in an affidavit or other evidence, specific facts showing that there is a genuine issue for trial.",
);

const F_R16_5_PERSONAL_KNOWLEDGE = flr(
  "r. 16 (5)",
  "If a party’s evidence is not from a person who has personal knowledge of the facts in dispute, the court may draw conclusions unfavourable to the party.",
);

const F_R16_6_NO_GENUINE_ISSUE = flr(
  "r. 16 (6)",
  "If there is no genuine issue requiring a trial of a claim or defence, the court shall make a final order accordingly.",
);

const F_R30_2_SERVICE = flr(
  "r. 30 (2)",
  "The notice of default hearing shall be served on the payor by special service in accordance with subrule 6 (4) and filed.",
);

const F_R30_3_PAYOR_DISPUTE = flr(
  "r. 30 (3)",
  "Within 10 days after being served with the notice, the payor shall serve on the recipient and file, (a) a financial statement (Form 13); and (b) a default dispute (Form 30B).",
);

const F_R30_6_PRESUMED_CORRECT = flr(
  "r. 30 (6)",
  "The payor is presumed to admit that the recipient’s statement of money owed is correct, unless the payor has filed a default dispute stating that the statement of money owed is not correct and giving detailed reasons.",
);

const F_R30_7_TO_HEARING_DATE = flr(
  "r. 30 (7)",
  "At the default hearing, the court may decide and enforce the amount owing as of the date of the hearing.",
);

const F_R30_8_CONDITIONAL_IMPRISONMENT = flr(
  "r. 30 (8)",
  "The court may make an order under clause 41 (10) (h) or (i) of the Family Responsibility and Support Arrears Enforcement Act, 1996, suspending the payor’s imprisonment on appropriate conditions.",
);

// The three case-management rules carry the same dismissal machinery, word for
// word, under different numbers: r. 39 (Family Court of the Superior Court),
// r. 40 (Ontario Court of Justice), r. 41 (other Superior Court). Checked
// 2026-10-01 by reading all three. Only the set-aside subrule differs in who
// may hear it (r. 39 (14.1) names the case management judge).

const F_R39_3_NO_CONSENT = flr(
  "r. 39 (3)",
  "A time set out in this rule may be lengthened only by order of the case management judge and not by the parties’ consent under subrule 3 (6).",
);
const F_R40_3_NO_CONSENT = flr(
  "r. 40 (3)",
  "A time set out in this rule may be lengthened only by order and not by the parties’ consent under subrule 3 (6).",
);
const F_R41_3_NO_CONSENT = flr(
  "r. 41 (3)",
  "A time set out in this rule may be lengthened only by order of the court and not by the parties’ consent under subrule 3 (6).",
);

const F_R39_11_NOTICE = flr(
  "r. 39 (11)",
  "The clerk shall serve a notice of approaching dismissal (Form 39) for a case on the parties by mail or email if the case has not been settled, withdrawn or scheduled or adjourned for trial before the 365th day after the date the case was started, and that time has not been lengthened by an order under subrule (3).",
);
const F_R40_5_NOTICE = flr(
  "r. 40 (5)",
  "The clerk shall serve a notice of approaching dismissal (Form 39) for a case on the parties by mail or email if the case has not been settled, withdrawn or scheduled or adjourned for trial before the 365th day after the date the case was started, and that time has not been lengthened by an order under subrule (3).",
);
const F_R41_5_NOTICE = flr(
  "r. 41 (5)",
  "The clerk shall serve a notice of approaching dismissal (Form 39) for a case on the parties by mail or email if the case has not been settled, withdrawn or scheduled or adjourned for trial before the 365th day after the date the case was started, and that time has not been lengthened by an order under subrule (3).",
);

const MISSED_CONFERENCE_NOTICE_TEXT =
  "If a case conference or settlement conference is arranged for a date on or later than the 365th day after the date the case was started, but the hearing does not take place on that date and is not adjourned by a judge, the clerk shall serve the notice of approaching dismissal on the parties by mail or email.";
const F_R39_11_2_MISSED = flr("r. 39 (11.2)", MISSED_CONFERENCE_NOTICE_TEXT);
const F_R40_5_2_MISSED = flr("r. 40 (5.2)", MISSED_CONFERENCE_NOTICE_TEXT);
const F_R41_5_2_MISSED = flr("r. 41 (5.2)", MISSED_CONFERENCE_NOTICE_TEXT);

const DISMISSAL_TEXT =
  "shall be dismissed without further notice, unless one of the parties, within 60 days after the notice is served, (a) obtains an order under subrule (3) to lengthen that time; (b) files an agreement signed by all parties and their licensed representatives, if any, for a final order disposing of all issues in the case, and a notice of motion for an order carrying out the agreement; (c) serves on all parties and files a notice of withdrawal (Form 12) that discontinues all outstanding claims in the case; (d) schedules or adjourns the case for trial; or (e) arranges a case conference or settlement conference for the first available date.";
const F_R39_12_DISMISSAL = flr("r. 39 (12)", DISMISSAL_TEXT);
const F_R40_6_DISMISSAL = flr("r. 40 (6)", DISMISSAL_TEXT);
const F_R41_6_DISMISSAL = flr("r. 41 (6)", DISMISSAL_TEXT);

const F_R39_12_1_SECOND_MISS = flr(
  "r. 39 (12.1)",
  "If a case conference or settlement conference is arranged for a date as described in clause (12) (e), but the hearing does not take place on that date and is not adjourned by a judge, the case shall be dismissed without further notice.",
);
const F_R40_6_1_SECOND_MISS = flr(
  "r. 40 (6.1)",
  "If a case conference or settlement conference is arranged for a date as described in clause (6) (e), but the hearing does not take place on that date and is not adjourned by a judge, the case shall be dismissed without further notice.",
);
const F_R41_6_1_SECOND_MISS = flr(
  "r. 41 (6.1)",
  "If a case conference or settlement conference is arranged for a date as described in clause (6) (e), but the hearing does not take place on that date and is not adjourned by a judge, the case shall be dismissed without further notice.",
);

const F_R39_14_1_SET_ASIDE = flr(
  "r. 39 (14.1)",
  "The case management judge or another judge may, on motion, set aside an order of the clerk under subrule (12).",
);
const F_R40_9_SET_ASIDE = flr("r. 40 (9)", "A judge may, on motion, set aside an order of the clerk under subrule (6).");
const F_R41_9_SET_ASIDE = flr("r. 41 (9)", "A judge may, on motion, set aside an order of the clerk under subrule (6).");

const F_R40_2_EXCLUDED = flr(
  "r. 40 (2)",
  "This rule does not apply to, (a) enforcements; (b) cases under rule 37, 37.1 or 37.2; or (c) cases under the Child, Youth and Family Services Act, 2017.",
);

const F_R39_2_EXCLUDED = flr(
  "r. 39 (2)",
  "This rule does not apply to, (a) enforcements; (b) cases under rule 32.1, 37, 37.1 or 37.2; or (c) cases under the Child, Youth and Family Services Act, 2017.",
);
const F_R41_2_EXCLUDED = flr(
  "r. 41 (2)",
  "This rule does not apply to, (a) enforcements; or (b) cases under rule 32.1, 37, 37.1 or 37.2.",
);

const DISMISSAL_RULES = [
  F_R39_2_EXCLUDED, F_R41_2_EXCLUDED,
  F_R39_11_NOTICE, F_R39_11_2_MISSED, F_R39_12_DISMISSAL, F_R39_12_1_SECOND_MISS, F_R39_3_NO_CONSENT, F_R39_14_1_SET_ASIDE,
  F_R40_5_NOTICE, F_R40_5_2_MISSED, F_R40_6_DISMISSAL, F_R40_6_1_SECOND_MISS, F_R40_3_NO_CONSENT, F_R40_9_SET_ASIDE, F_R40_2_EXCLUDED,
  F_R41_5_NOTICE, F_R41_5_2_MISSED, F_R41_6_DISMISSAL, F_R41_6_1_SECOND_MISS, F_R41_3_NO_CONSENT, F_R41_9_SET_ASIDE,
];

// ------------------------------------------- added after the third review

const F_R9_1_CONTINUING_RECORD = flr(
  "r. 9 (1)",
  "A person starting a case shall, (a) prepare a single continuing record of the case, to be the court’s permanent record of the case; and (b) serve it on all other parties and file it, along with the affidavits of service or other documents proving that the continuing record was served.",
);

const F_R39_8_STANDARD_TRACK = flr(
  "r. 39 (8)",
  "In a standard track case, (a) the clerk shall not set a court date when the application is filed; (b) a case management judge shall be assigned when a case conference or a motion is scheduled, whichever comes first; and (c) the clerk shall schedule a case conference on any party’s request.",
);

const F_R39_7_STANDARD_CLAIMS = flr(
  "r. 39 (7)",
  "Applications in which the applicant makes any of the following claims are standard track cases (subrule (8)): 1. A claim for divorce. 2. A property claim. 3. A claim under the Arbitration Act, 1991 or the Family Law Act relating to a family arbitration, family arbitration agreement or family arbitration award.",
);

const F_R41_4_CLERK = flr(
  "r. 41 (4)",
  "The clerk shall not set a court date when the application is filed, and the case shall come before the court when a case conference or a motion is scheduled, whichever comes first, and the clerk shall schedule a case conference on any party’s request.",
);

const FIRST_DATE_C =
  "(c) if an answer has been filed in response to an application, or if a response to motion to change (Form 15B) or a notice of financial interest has been filed in a motion to change a final order or agreement under rule 15, confirm that the case is ready for a hearing, case conference or settlement conference and schedule it accordingly;";
const FIRST_DATE_D =
  "(d) if no answer has been filed in response to an application, send the case to a judge for a decision on the basis of affidavit evidence or, on request of the applicant, schedule a case conference;";
const F_R40_4_C_SCHEDULES = flr("r. 40 (4) (c)", FIRST_DATE_C);
const F_R39_5_C_SCHEDULES = flr("r. 39 (5) (c)", FIRST_DATE_C);
const F_R40_4_D_NO_ANSWER = flr("r. 40 (4) (d)", FIRST_DATE_D);
const F_R39_5_D_NO_ANSWER = flr("r. 39 (5) (d)", FIRST_DATE_D);

const F_R36_1_START = flr(
  "r. 36 (1)",
  "Either spouse may start a divorce case by, (a) filing an application naming the other spouse as a respondent; or (b) filing a joint application with no respondent.",
);
const F_R36_2_JOINT = flr(
  "r. 36 (2)",
  "In a joint application, the divorce and any other order sought shall be made only with the consent of both spouses.",
);
const F_R36_4_CERTIFICATES = flr(
  "r. 36 (4)",
  "The court shall not grant a divorce until the following have been filed: 1. A marriage certificate or marriage registration certificate, unless the application states that it is impractical to obtain a certificate and explains why. 2. A report on earlier divorce cases started by either spouse, issued under the Central Registry of Divorce Proceedings Regulations (Canada).",
);
const F_R36_5_AFFIDAVIT = flr(
  "r. 36 (5)",
  "An affidavit in Form 36 containing the following information shall be filed in accordance with subrule (5.1): 1. Confirmation that all the information in the application is correct, except as stated in the affidavit.",
);
const F_R36_5_1_WHO_FILES = flr(
  "r. 36 (5.1)",
  "The affidavit referred to in subrule (5) shall be filed, (a) by the applicant, if the respondent files no answer or files an answer and later withdraws it; or (b) in the case of a joint application, by the applicants.",
);
const F_R36_6_DRAFT_ORDER = flr(
  "r. 36 (6)",
  "The applicant shall file with the affidavit, (a) three copies of a draft divorce order (Form 25A); (b) a stamped envelope addressed to each party; and",
);
const F_R36_7_JUDGE = flr(
  "r. 36 (7)",
  "Once the requirements of subrules (4) to (6) have been met, the clerk shall prepare a certificate (Form 36A) and present the documents to a judge, who may, (a) grant the divorce as set out in the draft order; (b) have the clerk return the documents to the applicant to make any needed corrections; or",
);

const F_R24_19_COSTS_SUBMISSIONS = flr(
  "r. 24 (19)",
  "If the court requires the parties to provide written submissions on costs with respect to a step in the case, the following rules apply, unless the court orders otherwise: 1. Each party shall serve and file a written submission on costs no later than 15 days after the court requires the written submissions. 2. A party may serve and file a responding written submission on costs, no later than 30 days after the court requires the written submissions. 3. A written submission shall be no longer than three pages or, if it relates to costs of a trial, five pages,",
);

const F_R31_1_CONTEMPT = flr(
  "r. 31 (1)",
  "An order, other than a payment order, may be enforced by a contempt motion made in the case in which the order was made, even if another penalty is available.",
);
const F_R31_2_SERVICE = flr(
  "r. 31 (2)",
  "The notice of contempt motion (Form 31) shall be served together with a supporting affidavit, by special service in accordance with subrule 6 (4), unless the court orders otherwise.",
);
const F_R31_4_WARRANT = flr(
  "r. 31 (4)",
  "To bring before the court a person against whom a contempt motion is made, the court may issue a warrant for the person’s arrest if, (a) the person’s attendance is necessary in the interest of justice; and (b) the person is not likely to attend voluntarily.",
);
const F_R31_5_ORDERS = flr(
  "r. 31 (5)",
  "If the court finds a person in contempt of the court, it may order that the person, (a) be imprisoned for any period and on any conditions that are just; (b) pay a fine in any amount that is appropriate; (c) pay an amount to a party as a penalty; (d) do anything else that the court decides is appropriate; (e) not do what the court forbids; (f) pay costs in an amount decided by the court; and (g) obey any other order.",
);
const F_R6_4_CONTEMPT = flr(
  "r. 6 (4)",
  "Special service of the following documents shall be carried out only by a method set out in clause (3) (a), unless the court orders otherwise: 1. A notice of contempt motion.",
);

const F_R19_1_AFFIDAVIT_OF_DOCUMENTS = flr(
  "r. 19 (1)",
  "Subject to subrule (1.1), every party shall, within 10 days after another party’s request, give the other party an affidavit listing every document that is, (a) relevant to any issue in the case; and (b) in the party’s control, or available to the party on request.",
);
const F_R19_1_1_EXCEPTIONS = flr(
  "r. 19 (1.1)",
  "Subrule (1) does not apply, (a) to the Office of the Children’s Lawyer or to children’s aid societies; and (b) in respect of documents required to be served under rule 13 (financial disclosure).",
);
const F_R19_2_ACCESS = flr(
  "r. 19 (2)",
  "The other party is entitled, on request, (a) to examine any document listed in the affidavit, unless it is protected by a legal privilege; and (b) to receive, at the party’s own expense at the legal aid rate, a copy of any document that the party is entitled to examine under clause (a).",
);

const F_R18_3_TO_10_OFFERS = flr(
  "r. 18 (3)-(10)",
  "A party may serve an offer on any other party. ... A party who made an offer may withdraw it by serving a notice of withdrawal, at any time before the offer is accepted. ... An offer that is not accepted within the time set out in the offer is considered to have been withdrawn. ... An offer may not be accepted after the court begins to give a decision that disposes of a claim dealt with in the offer. ... The only valid way of accepting an offer is by serving an acceptance on the party who made the offer, at any time before, (a) the offer is withdrawn; or (b) the court begins to give a decision that disposes of a claim dealt with in the offer. ... A party may accept an offer in accordance with subrule (9) even if the party has previously rejected the offer or made a counter-offer.",
);
const F_R18_4_SIGNATURES = flr(
  "r. 18 (4)",
  "An offer must be signed personally by the party making it and by their licensed representative.",
);
const F_R18_8_CONFIDENTIAL = flr(
  "r. 18 (8)",
  "The terms of an offer, (a) shall not be mentioned in any document filed in the continuing record; and (b) shall not be mentioned to the judge hearing the claim dealt with in the offer, until the judge has dealt with all the issues in dispute except costs.",
);

const F_R30_4_RECIPIENT_UPDATE = flr(
  "r. 30 (4)",
  "The recipient shall serve and file a new statement of money owed (subrule 26 (5)) not more than seven days before the default hearing.",
);
const F_R30_5_DIRECTOR_UPDATE = flr(
  "r. 30 (5)",
  "Despite subrule 26 (10), subrule (4) applies to the Director only if, (a) the amount the Director is asking the court to enforce is greater than the amount shown in the notice of default hearing; or (b) the court directs it.",
);
const S_FRSAEA_41_7_ARREST: RuleCitation = {
  sourceId: "family-responsibility-support-arrears-enforcement-act",
  pinpoint: "s. 41 (7)",
  quote:
    "If the payor fails to file the financial statement or to appear as the notice under subsection (1) or (2) requires, the court may issue a warrant for the payor’s arrest for the purpose of bringing him or her before the court.",
};
const S_FRSAEA_41_1_2_APPEAR: RuleCitation = {
  sourceId: "family-responsibility-support-arrears-enforcement-act",
  pinpoint: "s. 41 (2)",
  quote:
    "When a support order that is not filed in the Director’s office is in default, the recipient may file a request with the court, together with a statement of arrears, and, on such filing, the clerk of the court shall, by notice served on the payor together with the statement of arrears, require the payor to file a financial statement and appear before the court to explain the default.",
};
const S_FRSAEA_41_1_DIRECTOR: RuleCitation = {
  sourceId: "family-responsibility-support-arrears-enforcement-act",
  pinpoint: "s. 41 (1)",
  quote:
    "When a support order that is filed in the Director’s office is in default, the Director may prepare a statement of the arrears and, by notice served on the payor together with the statement of arrears, may require the payor to deliver to the Director a financial statement and such proof of income as may be required by the regulations and to appear before the court to explain the default.",
};
const S_FRSAEA_41_9_PRESUMPTIONS: RuleCitation = {
  sourceId: "family-responsibility-support-arrears-enforcement-act",
  pinpoint: "s. 41 (9)",
  quote:
    "At the default hearing, unless the contrary is shown, the payor shall be presumed to have the ability to pay the arrears and to make subsequent payments under the order,",
};
const S_FRSAEA_41_10_POWERS: RuleCitation = {
  sourceId: "family-responsibility-support-arrears-enforcement-act",
  pinpoint: "s. 41 (10)",
  quote:
    "The court may, unless it is satisfied that the payor is unable for valid reasons to pay the arrears or to make subsequent payments under the order, order that the payor, (a) pay all or part of the arrears by such periodic or lump sum payments as the court considers just, ... (e) provide security in such form as the court directs for the arrears and subsequent payment; ... (h) be imprisoned continuously or intermittently until the period specified in the order, which shall not be more than 180 days, has expired, or until the arrears are paid, whichever is sooner;",
};

const F_R6_7_MAIL = flr("r. 6 (7)", "Service of a document by mail is effective on the fifth day after it was mailed.");
const F_R6_11_EMAIL = flr(
  "r. 6 (11)",
  "Service of a document by fax or email is effective on, (a) the date shown on the first page of the fax or in the email message, as the case may be; or (b) if the first page of the fax or the email message shows that the document was served after 4 p.m., the following day.",
);

const F_R15_17_CONSENT = flr(
  "r. 15 (17)",
  "if the parties to a final order or agreement want to ask the court to change the final order or agreement and the parties and any assignee agree to the change, the parties shall file, (a) a consent motion to change (Form 15C), with all required attachments;",
);
const F_R15_18_CONSENT_CHILD_SUPPORT = flr(
  "r. 15 (18)",
  "If the parties to a final order or agreement want to ask the court to change the final order or agreement in relation only to a child support obligation, and the parties and any assignee agree to the change, the parties shall file, (a) a consent motion to change child support (Form 15D), with all required attachments;",
);

// ------------------------------------------- added after the fourth review

const F_R13_7_PROOF_OF_INCOME = flr(
  "r. 13 (7)",
  "The clerk shall not accept the financial statement of a party making or responding to a claim for support unless the following are attached to the form: 1. Proof of the party’s current income. 2. One of the following, as proof of the party’s income for the three previous years:",
);
const F_R14_11_6_NO_REPLY = flr(
  "r. 14 (11.6)",
  "A party who uses a motion form (Form 14B) and who is served with a response to it may not serve or file a reply.",
);
const S_CJA_133_LEAVE: RuleCitation = {
  sourceId: "cja-courts-of-justice-act",
  pinpoint: "s. 133",
  quote:
    "No appeal lies without leave of the court to which the appeal is to be taken, (a) from an order made with the consent of the parties; or (b) where the appeal is only as to costs that are in the discretion of the court that made the order for costs.",
};
const F_R25_4_DRAFT_APPROVAL = flr(
  "r. 25 (4)",
  "A party who prepares an order shall serve a draft, for approval of its form and content, on every other party who was in court or was represented when the order was made (including a child who has a lawyer).",
);
const F_R25_5_DISPUTE = flr(
  "r. 25 (5)",
  "Unless the court orders otherwise, a party who disagrees with the form or content of a draft order shall serve, on every party who was served under subrule (4) and on the party who served the draft order, (a) a notice disputing approval (Form 25E);",
);
const F_R25_8_NO_RESPONSE = flr(
  "r. 25 (8)",
  "If no approval or notice disputing approval (Form 25E) is served within 10 days after the draft order is served for approval, it may be signed without approval.",
);
const F_R25_11_A_CLERK = flr(
  "r. 25 (11) (a)",
  "The clerk shall prepare the order for signature, (a) within 10 days after it is made, if no party has a licensed representative;",
);
const F_R18_12_1_COSTS = flr(
  "r. 18 (12.1)",
  "The making, withdrawal, acceptance and rejection of offers are subject to the costs consequences provided for under rule 24.",
);
const F_R11_2_AMENDED_ANSWER = flr(
  "r. 11 (2)",
  "A respondent may amend the answer without the court’s permission as follows: 1. If the application has been amended, by serving and filing an amended answer within 14 days after being served with the amended application. 2. If the application has not been amended, by serving and filing an amended answer and also filing the consent of all parties to the amendment.",
);
const F_R11_1_AMENDED_APPLICATION = flr(
  "r. 11 (1)",
  "An applicant may amend the application without the court’s permission as follows: 1. If no answer has been filed, by serving and filing an amended application in the manner set out in rule 8 (starting a case). 2. If an answer has been filed, by serving and filing an amended application in the manner set out in rule 8 and also filing the consent of all parties to the amendment.",
);
const F_R11_2_1_CHILD_PROTECTION = flr(
  "r. 11 (2.1)",
  "In a child protection case, if a significant change relating to the child happens after the original document is filed, (a) the applicant may serve and file an amended application, an amended plan of care or both; and (b) the respondent may serve and file an amended answer and plan of care, but no later than, (i) 30 days after being served under clause (a), if service was within Canada or the United States of America, or (ii) 60 days after being served under clause (a), if service was outside Canada or the United States of America.",
);
const F_R38_9_CROSS_APPEAL = flr(
  "r. 38 (9)",
  "If the respondent in an appeal also wants to appeal the same order, this rule applies, with necessary changes, to the respondent’s appeal, and the two appeals shall be heard together.",
);
const F_R38_13_TRANSCRIPT_CONSULT = flr(
  "r. 38 (13)",
  "The appellant shall determine if the appeal requires a transcript of evidence in consultation with the respondent.",
);
const F_R38_19_RESPONDENT_FACTUM = flr(
  "r. 38 (19)",
  "The respondent shall, within the timeline set out in subrule (21) or (22), serve on every other party to the appeal and file, (a) a respondent’s factum (subrule (20)); and (b) if applicable, a respondent’s appeal record containing a copy of any material that was before the court appealed from which are necessary for the appeal but are not included in the appellant’s appeal record.",
);
const F_R38_21_TIMELINES = flr(
  "r. 38 (21)",
  "Except for appeals in cases under the Child, Youth and Family Services Act, 2017, the following timelines for serving appeal records and factums apply: 1. If a transcript is required, the appellant’s appeal record and factum shall be served on the respondent and any other person entitled to be heard in the appeal and filed within 60 days from the date of receiving notice that evidence has been transcribed. 2. If no transcript is required, the appellant’s appeal record and factum shall be served on the respondent and any other person entitled to be heard in the appeal and filed within 30 days of filing of the notice of appeal. 3. The respondent’s appeal record and factum shall be served on the appellant and any other person entitled to be heard on the appeal and filed within 60 days from the serving of the appellant’s appeal record and factum.",
);

// ------------------------------------------- added after the fifth review

const F_R11_3_PERMISSION = flr(
  "r. 11 (3)",
  "On motion, the court shall give permission to a party to amend an application, answer or reply, unless the amendment would disadvantage another party in a way for which costs or an adjournment could not compensate.",
);
const F_R11_3_1_PARENTING = flr(
  "r. 11 (3.1)",
  "If an application or answer is amended to include a claim respecting decision-making responsibility, parenting time or contact with respect to a child that was not in the original application or answer, the amended application or amended answer shall be accompanied by the applicable documents referred to in rule 35.1.",
);
const S_FRSAEA_41_6_FORMS: RuleCitation = {
  sourceId: "family-responsibility-support-arrears-enforcement-act",
  pinpoint: "s. 41 (6)",
  quote:
    "A financial statement and statement of arrears required by subsection (2) shall be in the form prescribed by the rules of the court and a financial statement required by subsection (1) or (4) shall be in the form prescribed by the regulations.",
};
const frsaea = (pinpoint: string, quote: string): RuleCitation => ({
  sourceId: "family-responsibility-support-arrears-enforcement-act",
  pinpoint,
  quote,
});
const S_FRSAEA_34_FIRST_NOTICE = frsaea(
  "s. 34",
  "When a support order that is filed in the Director’s office is in default, the Director may serve a first notice on the payor, informing the payor that his or her driver’s licence may be suspended unless, within 30 days after the day the first notice is served, (a) the payor makes an arrangement satisfactory to the Director for complying with the support order and for paying the arrears owing under the support order; (b) the payor obtains an order to refrain under subsection 35 (1) and files the order in the Director’s office; or (c) the payor pays all arrears owing under the support order.",
);
const S_FRSAEA_35_1_REFRAIN = frsaea(
  "s. 35 (1)",
  "If a payor is served with a first notice under section 34 and makes a motion to change the support order, the payor may also, on notice to the Director, make a motion for an order that the Director refrain from directing the suspension of the payor’s driver’s licence under subsection 37 (1), on the terms that the court considers just, which may include payment terms.",
);
const S_FRSAEA_35_4_EXCEPTIONS = frsaea(
  "s. 35 (4)",
  "Despite subsection (1), a motion for an order to refrain may be made, (a) before making a motion to change the support order, on the undertaking of the payor or the payor’s lawyer to obtain, within 20 days after the date of the order to refrain, a court date for the motion to change the support order; or (b) without making a motion to change the support order, if the payor has started an appeal of the support order and the appeal has not been determined.",
);
const S_FRSAEA_35_5_WHICH_COURT = frsaea(
  "s. 35 (5)",
  "A motion for an order to refrain shall be made in the court that has jurisdiction to change the support order.",
);
const S_FRSAEA_35_7_FINANCIAL = frsaea(
  "s. 35 (7)",
  "A payor who makes a motion for an order to refrain shall serve and file together with the notice of motion, (a) a financial statement, in the form prescribed by the regulations or in the form prescribed by the rules of court; and (b) such proof of income as may be prescribed by the regulations.",
);
const S_FRSAEA_35_8_UNDERTAKING = frsaea(
  "s. 35 (8)",
  "Despite clause (7) (b), if the payor is unable to serve and file the proof of income before the motion is heard, the court may make the order to refrain subject to the undertaking of the payor or the payor’s lawyer to serve and file the proof of income within 20 days.",
);
const S_FRSAEA_35_10_NOT_AFTER = frsaea(
  "s. 35 (10)",
  "A court shall not make an order to refrain after the 30-day period referred to in the first notice,",
);
const S_FRSAEA_35_11_ONLY_WITHIN = frsaea(
  "s. 35 (11)",
  "A court may make an order to refrain only within the 30-day period referred to in the first notice and may make only one order to refrain in respect of any first notice.",
);
const S_FRSAEA_35_12_NO_EXTENSION = frsaea(
  "s. 35 (12)",
  "For greater certainty, the 30-day period referred to in the first notice can not be extended for the purposes of subsections (10) and (11).",
);
const S_FRSAEA_35_13_CLOSED_EARLIER = frsaea(
  "s. 35 (13)",
  "For greater certainty, if the 30-day period referred to in the first notice expires on a day when court offices are closed, the last day for making an order to refrain is the last day on which court offices are open before the 30-day period expires.",
);
const F_R13_5_1_REFRAIN_STATEMENT = flr(
  "r. 13 (5.1)",
  "A payor who makes a motion to require the Director of the Family Responsibility Office to refrain from suspending the payor’s driver’s licence shall, in accordance with subsection 35 (7) of the Family Responsibility and Support Arrears Enforcement Act, 1996, serve and file with the notice of motion, (a) a financial statement (Form 13 or 13.1) or a financial statement incorporated as Form 4 in Ontario Regulation 167/97 (General) made under that Act; and (b) the proof of income specified in section 15 of the regulation referred to in clause (a).",
);
const F_R14_6_D_REFRAIN = flr(
  "r. 14 (6) (d)",
  "(d) to require the Director of the Family Responsibility Office to refrain from suspending a licence;",
);
const F_R29_12_PAID_OUT = flr(
  "r. 29 (12)",
  "On receiving money under a notice of garnishment, the Director or clerk shall, even if a dispute has been filed, but subject to subrules (9) and (13), immediately pay,",
);
const F_R29_13_NOT_PAID_OUT = flr(
  "r. 29 (13)",
  "The court may, at a garnishment hearing or on a motion to change the garnishment under this rule, order that subrule (12) does not apply.",
);
const F_R29_16_DISPUTE = flr(
  "r. 29 (16)",
  "Within 10 days after being served with a notice of garnishment or a statutory declaration of indexed support, a payor, garnishee or co- owner of a debt may serve on the other parties and file a dispute (Form 29E, 29F or 29G).",
);
const F_R29_17_HEARING = flr(
  "r. 29 (17)",
  "The clerk shall, on request, issue a notice of garnishment hearing (Form 29H), (a) within 10 days after a dispute is served and filed; or (b) if the recipient says that the garnishee has not paid any money or has not paid enough money.",
);

// ------------------------------------------- added after the sixth review

const S_DIVORCE_8_2_BREAKDOWN: RuleCitation = {
  sourceId: "divorce-act",
  pinpoint: "s. 8 (2)",
  quote:
    "Breakdown of a marriage is established only if (a) the spouses have lived separate and apart for at least one year immediately preceding the determination of the divorce proceeding and were living separate and apart at the commencement of the proceeding; or (b) the spouse against whom the divorce proceeding is brought has, since celebration of the marriage, (i) committed adultery, or (ii) treated the other spouse with physical or mental cruelty of such a kind as to render intolerable the continued cohabitation of the spouses.",
};
const S_DIVORCE_11_1_B_CHILD_SUPPORT: RuleCitation = {
  sourceId: "divorce-act",
  pinpoint: "s. 11 (1) (b)",
  quote:
    "(b) to satisfy itself that reasonable arrangements have been made for the support of any children of the marriage, having regard to the applicable guidelines, and, if such arrangements have not been made, to stay the granting of the divorce until such arrangements are made;",
};
const F_R24_12_OFFER_COSTS = flr(
  "r. 24 (12)",
  "A party who makes an offer in relation to a step in a case is, unless the court orders otherwise, entitled to costs to the date the offer was served and full recovery of costs from that date to the conclusion of the step, if the following conditions are met: 1. If the offer relates to a motion, it is made at least one day before the motion date. 2. If the offer relates to a trial or the hearing of a step other than a motion, it is made at least seven days before the trial or hearing date. 3. The offer does not expire and is not withdrawn before the hearing starts. 4. The offer is not accepted. 5. The party who made the offer obtains an order that is as good as or better than the offer.",
);
const F_R6_4_1_ITEM_3 = flr(
  "r. 6 (4.1)",
  "Subject to subrule (4.2), special service of the following documents shall be carried out by a person other than the party required to serve the document: ... 3. A document listed in subrule (4).",
);

// ------------------------------------------- added after the seventh review

const F_R29_8_JOINT_DEBT = flr(
  "r. 29 (8)",
  "If a garnishee has been served with a notice of garnishment and the garnishee owes a debt to which subrules (4) and (5) apply to the payor and another person jointly, (a) the garnishee shall pay, in accordance with subrule (11), half of the debt, or the larger or smaller amount that the court orders; (b) the garnishee shall immediately send the other person a notice to co-owner of debt (Form 29C) by mail, fax or email, to the person’s address in the garnishee’s records; and (c) the garnishee shall immediately serve the notice to co-owner of debt on the recipient or the Director, depending on who is enforcing the order, and on the sheriff or clerk if the sheriff or clerk is to receive the money under subrule (11) or (12).",
);
const F_R29_9_HELD_30_DAYS = flr(
  "r. 29 (9)",
  "Despite subrule (12), if served with notice under clause (8) (c), the sheriff, clerk or Director shall hold the money received for 30 days, and may pay it out when the 30 days expire, unless the other person serves and files a dispute within the 30 days.",
);
const F_R1_4_1_STAY_DISMISS = flr(
  "r. 1.4 (1)",
  "The court may, on its own initiative or on a party’s request under subrule (3), make an order staying or dismissing a case that appears on its face to be frivolous or vexatious or otherwise an abuse of the court process.",
);
const F_R1_4_3_REQUEST = flr(
  "r. 1.4 (3)",
  "A party who wishes the court to make an order under subrule (1) shall serve on every other party and file a request in Form 1.4.",
);
const F_R1_4_5_NOTICE = flr(
  "r. 1.4 (5)",
  "If the court determines that it may be appropriate to make an order under subrule (1), the court shall direct the clerk to give notice to the parties in Form 1.4A that the case may be stayed or dismissed.",
);
const F_R1_4_6_AUTOMATIC_STAY = flr(
  "r. 1.4 (6)",
  "Once the clerk gives notice to any of the parties, (a) the case is automatically stayed until the court either makes an order under subrule (1) or an order declining to stay or dismiss the case; and (b) no party may take any step in the case other than the steps in this rule, unless the court orders otherwise.",
);
const F_R1_4_7_SUBMISSIONS = flr(
  "r. 1.4 (7)",
  "If notice is given under subrule (5), the parties may make written submissions about whether the court should make an order under subrule (1) in accordance with the following procedures, unless the court orders otherwise: 1. No later than 15 days after receiving the notice, the party who brought the case that is the subject of the notice may file with the court a written submission, no more than 10 pages in length, responding to the notice. 2. If a written submission is not filed in accordance with paragraph 1, the court may make the order without any further notice to the parties. 3. If a written submission is filed in accordance with paragraph 1, the court may direct the clerk to give a copy of the submission to any other party. 4. A party who receives a copy of the filed submission may, no later than 10 days after receiving it, file with the court a responding written submission, no more than 10 pages in length. 5. A party who files a responding submission shall give a copy of it to the party who brought the case that is the subject of the notice and to any other party who requests a copy.",
);
const F_R1_4_8_RECEIPT = flr(
  "r. 1.4 (8)",
  "The notice in Form 1.4A and any copy of a submission that is given under subrule (7) shall be given in a manner of regular service specified in subrule 6 (2), and rule 6 applies with necessary modifications to a determination of when the document is considered to have been received.",
);
const F_R1_4_9_MOTIONS = flr(
  "r. 1.4 (9)",
  "The court may, on its own initiative or on a party’s request, make an order staying or dismissing a motion that appears on its face to be frivolous or vexatious or otherwise an abuse of the court process.",
);
const F_R1_4_10_MOTION_PROCEDURE = flr(
  "r. 1.4 (10)",
  "Subrules (2) to (8), other than subrule (6), apply for the purposes of subrule (9), with the following and any other necessary modifications: 1. A reference to a case shall be read as a reference to the motion. 2. A reference to the party who brought a case shall be read as a reference to the party who made the motion.",
);
const F_R22_2_REQUEST = flr(
  "r. 22 (2)",
  "At any time, by serving a request to admit (Form 22) on another party, a party may ask the other party to admit, for purposes of the case only, that a fact is true or that a document is genuine.",
);
const F_R22_4_RESPONSE_20_DAYS = flr(
  "r. 22 (4)",
  "The party on whom the request to admit is served is considered to have admitted, for purposes of the case only, that the fact is true or that the document is genuine, unless the party serves a response (Form 22A) within 20 days, (a) denying that a particular fact mentioned in the request is true or that a particular document mentioned in the request is genuine; or (b) refusing to admit that a particular fact mentioned in the request is true or that a particular document mentioned in the request is genuine, and giving the reasons for each refusal.",
);
const F_R22_5_WITHDRAW = flr(
  "r. 22 (5)",
  "An admission that a fact is true or that a document is genuine (whether contained in a document served in the case or resulting from subrule (4)), may be withdrawn only with the other party’s consent or with the court’s permission.",
);
const FIRST_DATE_E =
  "(e) if no response to motion to change (Form 15B), consent motion to change (Form 15C) or notice of financial interest is filed in response to a motion to change a final order or agreement under rule 15, send the case to a judge for a decision on the basis of the evidence filed in the motion.";
const F_R40_4_E_NO_RESPONSE = flr("r. 40 (4) (e)", FIRST_DATE_E);
const F_R39_5_E_NO_RESPONSE = flr("r. 39 (5) (e)", FIRST_DATE_E);

// ------------------------------------------- added after the eighth review

const S_DIVORCE_14_DISSOLVES: RuleCitation = {
  sourceId: "divorce-act",
  pinpoint: "s. 14",
  quote: "On taking effect, a divorce granted under this Act dissolves the marriage of the spouses.",
};
const F_R23_21_AFFIDAVIT_EVIDENCE = flr(
  "r. 23 (21)",
  "Evidence at trial by affidavit or another method not requiring a party or witness to attend in person may be used only if, (a) the use is in accordance with an order under clause 1 (7.2) (i); (b) the evidence is served at least 30 days before the start of the trial; and (c) the evidence would have been admissible if given by the party or witness in court.",
);
const F_R23_11_1_OPPOSING_PARTY = flr(
  "r. 23 (11.1)",
  "A party who wishes to call an opposing party as a witness may have the opposing party attend, (a) by serving a summons under subrule (3) on the opposing party; or (b) by serving on the opposing party’s lawyer, at least 10 days before the start of the trial, a notice of intention to call the opposing party as a witness.",
);
const F_R21_A_NOTICE = flr(
  "r. 21 (a)",
  "When the Children’s Lawyer investigates and reports on decision- making responsibility, parenting time or contact with respect to a child under section 112 of the Courts of Justice Act, (a) the Children’s Lawyer shall first serve notice on the parties and file it;",
);
const F_R21_B_SERVE_CL = flr(
  "r. 21 (b)",
  "(b) the parties shall, from the time they are served with the notice, serve the Children’s Lawyer with every document in the case that involves issues of decision-making responsibility, parenting time, contact, support or education in relation to the child, as if the Children’s Lawyer were a party in the case;",
);
const F_R21_D_REPORT = flr(
  "r. 21 (d)",
  "(d) within 90 days after serving the notice under clause (a), the Children’s Lawyer shall serve a report on the parties and file it;",
);
const F_R21_E_DISPUTE = flr(
  "r. 21 (e)",
  "(e) within 30 days after being served with the report, a party may serve and file a statement disputing anything in it; and",
);
const F_R21_F_NO_TRIAL = flr(
  "r. 21 (f)",
  "(f) the trial shall not be held and the court shall not make a final order in the case until the 30 days referred to in clause (e) expire or the parties file a statement giving up their right to that time.",
);
const F_R27_1_REQUEST = flr(
  "r. 27 (1)",
  "If a payment order is in default, a recipient may serve a request for a financial statement (Form 27) on the payor.",
);
const F_R27_2_15_DAYS = flr(
  "r. 27 (2)",
  "Within 15 days after being served with the request, the payor shall send a completed financial statement (Form 13) to the recipient by mail, fax or email.",
);
const F_R27_3_FREQUENCY = flr(
  "r. 27 (3)",
  "A recipient may request a financial statement only once in a six- month period, unless the court gives the recipient permission to do so more often.",
);
const F_R27_5_ORDER = flr("r. 27 (5)", "The court may, on motion, order a payor to serve and file a financial statement.");
const F_R27_6_IMPRISONMENT = flr(
  "r. 27 (6)",
  "If the payor does not serve and file a financial statement within 10 days after being served with the order, the court may, on motion with special service (subrule 6 (3)), order that the payor be imprisoned continuously or intermittently for not more than 40 days.",
);
const F_R1_4_2_BJDR_ONLY_SCJ = flr(
  "r. 1 (4.2)",
  "Despite subrule (2), rule 43 (binding judicial dispute resolution in the Superior Court of Justice) applies only to cases in the Superior Court of Justice, including in the Family Court of the Superior Court of Justice.",
);
const F_R43_4_WHERE = flr(
  "r. 43 (4)",
  "Subject to subrule (5), this rule applies in cases in the Superior Court of Justice, including cases in the Family Court of the Superior Court of Justice, in any municipality that is indicated on the Ontario Courts website as having been designated by the Chief Justice of the Superior Court of Justice for the purposes of this rule.",
);
const F_R43_5_EXCLUDED = flr(
  "r. 43 (5)",
  "This rule does not apply with respect to cases, (a) under the Child, Youth and Family Services Act, 2017; (b) to which rule 37 (interjurisdictional support orders) applies; or (c) to which rule 37.2 (international child abduction) applies.",
);
const F_R43_7_REQUEST = flr(
  "r. 43 (7)",
  "In order to request a binding judicial dispute resolution hearing, each party shall serve and file, (a) a binding judicial dispute resolution hearing request and consent in Form 43 or 43A; and (b) a motion form (Form 14B).",
);
const F_R43_12_NO_WITHDRAWAL = flr(
  "r. 43 (12)",
  "A party may not withdraw their consent to a binding judicial dispute resolution hearing once the hearing has been ordered by the court, except with every other party’s written consent or the court’s permission.",
);
const F_R43_13_DOCUMENTS = flr(
  "r. 43 (13)",
  "Each party shall, within the time specified in subrule (15), serve and file the following documents, unless the court orders otherwise: 1. An affidavit (Form 43B or 14A) that meets the following requirements: i. The affidavit, excluding exhibits, is not longer than 12 pages. ii. Any exhibits to the affidavit, not including any document referred to in paragraphs 2 to 12, do not total more than 10 pages in length, unless the court orders otherwise. 2. A draft order setting out the relief the party is seeking.",
);
const F_R43_15_TIMELINES = flr(
  "r. 43 (15)",
  "The documents shall be served and filed not later than, (a) 20 days before the binding judicial dispute resolution hearing, for documents filed by the applicant or, in the case of a motion to change a final order or agreement under rule 15, the party making the motion; and (b) 10 days before the binding judicial dispute resolution hearing, for documents filed by the respondent or, in the case of a motion to change a final order or agreement under rule 15, the party responding to the motion.",
);
const F_R43_16_REPLY = flr(
  "r. 43 (16)",
  "The applicant or party making the motion may, not later than five days before the binding judicial dispute resolution hearing, serve and file an affidavit (Form 14A) that is not longer than four pages replying to any new matters raised by the respondent or party responding to the motion in their affidavit.",
);
const F_R43_18_CONFIRM = flr(
  "r. 43 (18)",
  "Each party shall, (a) give a copy of a confirmation of binding judicial dispute resolution hearing (Form 43C) to every other party using mail, fax, email or any other method, before giving the confirmation to the clerk under clause (b); and (b) not later than 2 p.m. three days before the date of the binding judicial dispute resolution hearing, give the clerk the confirmation of issues for binding judicial dispute resolution hearing by,",
);
const F_R3_6_G_BJDR = flr(
  "r. 3 (6) (g)",
  "(g) subrule 43 (18) (confirmation of binding judicial dispute resolution hearing).",
);

// ------------------------------------------- added after the ninth review

const F_R43_13_FULL_LIST = flr(
  "r. 43 (13)",
  "3. Any relevant agreements, minutes of settlement or court orders. 4. Any offer to settle that has not been withdrawn. 5. If the case involves a claim for support but not a property claim or a claim for exclusive possession of the matrimonial home and its contents, an updated financial statement (Form 13), together with an updated certificate of financial disclosure (Form 13A). 6. If the case involves a property claim or a claim for exclusive possession of the matrimonial home and its contents, updated versions of the financial statement (Form 13.1), net family property statement (Form 13B) and comparison of net family property statements (Form 13C), together with an updated certificate of financial disclosure (Form 13A). 7. If the case involves a claim respecting decision-making responsibility, parenting time or contact with respect to a child, an updated affidavit in Form 35.1 and, if applicable, an updated affidavit in Form 35.1A. 8. If the issues to be dealt with at the binding judicial dispute resolution hearing include the amount or duration of support, details about what the amount and duration should be, including calculations. 9. If the issues to be dealt with at the binding judicial dispute resolution hearing include the calculation of support arrears, a statement of money owed in Form 26 or, if applicable, a statement of arrears in the form used by the Director of the Family Responsibility Office. 10. If the issues to be dealt with at the binding judicial dispute resolution hearing include the amount of special or extraordinary expenses within the meaning of section 7 of the child support guidelines, proof of the amount in dispute. 11. If the issues to be dealt with at the binding judicial dispute resolution hearing include a property claim or a claim for exclusive possession of the matrimonial home and its contents, any supporting documents, including any reports of an expert or other professional relating to those issues. 12. If the issues to be dealt with at the binding judicial dispute resolution hearing include a claim for decision-making responsibility, parenting time or contact with respect to a child, any reports of an expert or other professional relating to those issues.",
);
const F_R31_3_AFFIDAVIT = flr(
  "r. 31 (3)",
  "The supporting affidavit may contain statements of information that the person signing the affidavit learned from someone else, but only if the requirements of subrule 14 (19) are satisfied.",
);
const F_R12_1_WITHDRAW = flr(
  "r. 12 (1)",
  "A party who does not want to continue with all or part of a case may withdraw all or part of the application, answer or reply by serving a notice of withdrawal (Form 12) on every other party and filing it.",
);
const F_R12_2_SPECIAL_PARTY = flr(
  "r. 12 (2)",
  "The application, answer or reply of a special party or a child party may be withdrawn (whether in whole or in part) only with the court’s permission,",
);
const F_R12_3_COSTS = flr(
  "r. 12 (3)",
  "A party who withdraws all or part of an application, answer or reply shall pay the costs of every other party in relation to the withdrawn application, answer, reply or part, up to the date of the withdrawal, unless the court orders or the parties agree otherwise.",
);
const F_R14_16_WITHDRAW_MOTION = flr(
  "r. 14 (16)",
  "A party making a motion may withdraw it in the same way as an application or answer is withdrawn under rule 12.",
);
const F_R20_4_CONSENT_OR_ORDER = flr(
  "r. 20 (4)",
  "In a case other than a child protection case, a party is entitled to obtain information from another party about any issue in the case, (a) with the other party’s consent; or (b) by an order under subrule (5).",
);
const F_R20_5_ORDER = flr(
  "r. 20 (5)",
  "The court may, on motion, order that a person (whether a party or not) be questioned by a party or disclose information by affidavit or by another method about any issue in the case, if the following conditions are met: 1. It would be unfair to the party who wants the questioning or disclosure to carry on with the case without it. 2. The information is not easily available by any other method. 3. The questioning or disclosure will not cause unacceptable delay or undue expense.",
);
const F_R20_8_PRECONDITIONS = flr(
  "r. 20 (8)",
  "A party who wants to question a person or obtain information by affidavit or by another method may do so only if the party, (a) has served and filed any answer, financial statement or net family property statement that these rules require; and (b) promises in writing not to serve or file any further material for the next step in the case, except in reply to the answers or information obtained.",
);
const F_R20_11_PLACE = flr(
  "r. 20 (11)",
  "The questioning shall take place in the municipality in which the person to be questioned lives, unless that person and the party who wants to do the questioning agree to hold it in another municipality.",
);
const F_R20_12_ARRANGEMENTS = flr(
  "r. 20 (12)",
  "If the person to be questioned and the party who wants to do the questioning do not agree on one or more of the following matters, the court shall, on motion, make an order to decide the matter: 1. The date and time for the questioning.",
);
const F_R20_13_NOTICE = flr(
  "r. 20 (13)",
  "The parties shall, not later than three days before the questioning, be served with notice of the name of the person to be questioned and the address, date and time of the questioning.",
);
const S_LEGISLATION_89_6_FULL: RuleCitation = {
  sourceId: "legislation-act-2006",
  pinpoint: "s. 89 (6)",
  quote:
    "If a period of time is described as a number of months before or after a specified day, the following rules apply: 1. The number of months is counted from the specified day, excluding the month in which the specified day falls. 2. The period includes the day in the last month counted that has the same calendar number as the specified day or, if that month has no day with that number, its last day.",
};

// ------------------------------------------- added after the tenth review

const F_R35_1_3_POLICE_CHECK = flr(
  "r. 35.1 (3)",
  "Every person who makes a claim for decision-making responsibility with respect to a child and who is not a parent of the child shall attach to Form 35.1, (a) a police records check obtained not more than 60 days before the person starts the claim; or (b) if the person requested the police records check for the purposes of the claim but has not received it by the time the person starts the claim, proof of the request.",
);
const F_R35_1_4_POLICE_CHECK_LATER = flr(
  "r. 35.1 (4)",
  "If clause (3) (b) applies, the person shall serve and file the police records check no later than 10 days after receiving it.",
);
const F_R25_2_PREPARE_DRAFT = flr(
  "r. 25 (2)",
  "The party in whose favour an order is made shall prepare a draft of the order (Form 25, 25A, 25B, 25C or 25D), unless the court orders otherwise.",
);
const F_R25_3_OTHER_PREPARES = flr(
  "r. 25 (3)",
  "If the party in whose favour an order is made does not have a licensed representative or does not prepare a draft order within 10 days after the order is made, any other party may prepare the draft order, unless the court orders otherwise.",
);
const F_R38_30_DISMISS_FOR_DELAY = flr(
  "r. 38 (30)",
  "If the appellant has not, (a) filed proof that a transcript of evidence was ordered under subrule (12); (b) served and filed the appeal record and factum within the timelines set out in subrule (21) or (22) or such longer time as may have been ordered by the court, the respondent may file a motion form (Form 14B) to have the appeal dismissed for delay.",
);
const F_R38_12_TRANSCRIPT = flr(
  "r. 38 (12)",
  "If the appeal requires a transcript of evidence, the appellant shall, within 30 days after filing the notice of appeal, file proof that the transcript has been ordered.",
);
const F_R29_21_CHANGE = flr(
  "r. 29 (21)",
  "If there has been a material change in the payor’s circumstances affecting the payor’s ability to pay, the court may, on motion, use the powers listed in subrule (19).",
);
const F_R13_13_QUESTION_FS = flr(
  "r. 13 (13)",
  "A party may be questioned under rule 20 on a financial statement provided under this rule, but only after a request for information has been made under clause (11) (a).",
);
const F_R36_8_CERTIFICATE = flr(
  "r. 36 (8)",
  "When a divorce takes effect, the clerk shall, on either party’s request, (a) check the continuing record or, if there is no continuing record, the court file, to verify that, (i) no appeal has been taken from the divorce order, or any appeal from it has been disposed of, and (ii) no order has been made extending the time for an appeal, or any extended time has expired without an appeal; and (b) if satisfied of those matters, issue a divorce certificate (Form 36B)",
);

// ------------------------------------------- added after the eleventh review

const F_R29_25_27_PAYOR_NOTICES = flr(
  "r. 29 (25)-(27)",
  "Within 10 days after returning to work for or starting to receive money again from the garnishee, the payor shall send a notice as subrule (27) requires, saying that the payor has returned to work for or started to receive money again from the garnishee. ... Within 10 days after starting to work for or receive money from a new income source, the payor shall send a notice as subrule (27) requires, saying that the payor has started to work for or to receive money from the new income source. ... A notice referred to in subrule (23), (24), (25) or (26) shall be sent to the clerk, and to the recipient or the Director (depending on who is enforcing the order), by mail or email.",
);
const F_R27_11_EXAMINATION = flr(
  "r. 27 (11)",
  "If a payment order is in default, the recipient may serve on the payor, by special service (subrule 6 (3)), an appointment for a financial examination (Form 27C), requiring the payor to, (a) come to a financial examination; (b) bring to the examination any document or thing named in the appointment that is in the payor’s control or available to the payor on request, relevant to the enforcement of the order, and not protected by a legal privilege; and (c) serve a financial statement (Form 13) on the recipient, not later than seven days before the date of the examination.",
);
const F_R27_13_PLACE = flr(
  "r. 27 (13)",
  "A financial examination shall be held, (a) in a place where the parties and the person to be examined agree; (b) where the person to be examined lives in Ontario, in the municipality where the person lives; or (c) in a place chosen by the court.",
);
const F_R25_5_FULL = flr(
  "r. 25 (5)",
  "Unless the court orders otherwise, a party who disagrees with the form or content of a draft order shall serve, on every party who was served under subrule (4) and on the party who served the draft order, (a) a notice disputing approval (Form 25E); (b) a copy of the order, redrafted as proposed; and (c) notice of a time and date at which the clerk will settle the order by telephone conference.",
);

// ---------------------------------------------------- shared deadline text
//
// The renderer adds one family counting paragraph (r. 3 (1), (2), (3)) to any
// stage with a family-rules deadline (2026-10-01). So qualifiers here no longer
// repeat the r. 3 (2) weekend sentence or the r. 3 (3) closed-day sentence;
// saying them per deadline was the same text twice. Do not add them back.


const DISMISSAL_STEPS =
  "Step one: get an order giving more time. Step two: file an agreement signed by all parties and their licensed representatives, if any, for a final order on all issues. File it with a notice of motion for an order carrying it out. Step three: serve and file a notice of withdrawal (Form 12) of all outstanding claims. Step four: schedule or adjourn the case for trial. Step five: arrange a case conference or settlement conference for the first available date.";

const DISMISSAL_EXCLUSIONS =
  "These rules do not apply to an enforcement. They do not apply to cases under rules 37, 37.1 and 37.2. Those cover support across borders, provisional orders and child abduction across borders. In the Superior Court and the Family Court, they do not apply to a request to enforce a family arbitration award (rule 32.1). In the Ontario Court of Justice and the Family Court, they do not apply to a child protection case.";

const CONSENT_OR_COURT = "The parties can agree in writing to change this time. The court can also change it.";

const CONFIRM_QUALIFIER = `The parties cannot change this time by agreement. Unless the court orders otherwise, the conference will not go ahead without it.`;

const FINANCIAL_UPDATE_CONFERENCE =
  "Your last financial statement may be more than 60 days old by the conference. If so, update it by this same day. Serve and file an affidavit saying nothing has changed, an affidavit with the changes, or a new statement.";

const LIMIT_QUALIFIER =
  "The time ends on the earliest of three dates. One is 2 years after a divorce or a nullity judgment ends the marriage. One is 6 years after the spouses separate with no reasonable prospect of living together again. One is 6 months after the first spouse dies. The court can extend the time on a motion. It must find three things. There are apparent grounds for relief. The delay was in good faith. No one will suffer substantial prejudice from it. This claim is only for married spouses. That includes a void or voidable marriage entered into in good faith.";

const ANSWER_QUALIFIER_YOU =
  "If you were served outside Canada and the United States, you have 60 days. If another party’s answer added you as a respondent, you have 14 days. That becomes 30 days if you were served outside Canada and the United States. Other times apply to an application to dispense with a parent’s consent before adoption placement. Service rules decide when your time starts. Papers left at your home with an adult, with a copy mailed, count as served on the fifth day after mailing. Papers left with you after 4 p.m. count as served the next day. If that day is one when court offices are closed, service counts on the next open day. For mail with an acknowledgment card, the rules set no separate start day. The general rule for mail is the fifth day after mailing. That service counts only once the card you signed is filed. If the application claims support, property or the matrimonial home against you, your financial statement is due in the same time. For a support claim with no property claim, serve the income papers in r. 13 (3.1) with it. If your answer claims decision-making responsibility, parenting time or contact, add the papers rule 35.1 requires. Your answer may make its own claim about parenting, property or support. If the clerk then issues an automatic order, serve it on every other party promptly, and no later than 7 days after it is issued. If you miss the time, then unless the court orders otherwise, you lose the right to notice of further steps. Any order must still be served on you. You cannot take part in the case. The court may decide the case without you. A date may be set for an uncontested trial. The court office will refuse a late answer. It will take one only if the other parties agree in writing or the court gives more time. The parties can agree in writing to change the time. The court can also give more time.";

const ANSWER_QUALIFIER_THEY =
  "If the respondent was served outside Canada and the United States, the time is 60 days. A respondent added by another party’s answer has 14 days. That becomes 30 days if they were served outside Canada and the United States. Other times apply to an application to dispense with a parent’s consent before adoption placement. Service rules decide when the time starts. Papers left at the home with an adult, with a copy mailed, count as served on the fifth day after mailing. Papers left with the respondent after 4 p.m. count as served the next day. If that day is one when court offices are closed, service counts on the next open day. For mail with an acknowledgment card, the rules set no separate start day. The general rule for mail is the fifth day after mailing. That service counts only once the card signed by the respondent is filed. If the application claims support, property or the matrimonial home, the respondent’s financial statement is due in the same time. The parties can agree in writing to change the time. The court can also give more time.";

const ANSWER_EXCEPTIONS = [
  F_R10_2_OUTSIDE,
  F_R6_3_SPECIAL_SERVICE,
  F_R6_7_MAIL,
  F_R10_4_ADDED_RESPONDENT,
  F_R10_2_1_ADOPTION,
  F_R6_11_1_LEFT_EFFECTIVE,
  F_R6_11_2_LEFT_AND_MAILED,
  F_R6_11_3_CLOSED_DAY,
  F_R13_1_FINANCIAL_STATEMENT,
  F_R3_3_CLOSED,
  F_R3_6_CONSENT,
  F_R3_5_COURT_CHANGES_TIME,
];

const MIP_QUALIFIER_CORE =
  "This applies only to some cases. They are cases about parenting, support, net family property, the matrimonial home or a restraining order. It also covers a motion to change that is not only about child or spousal support. It does not apply to a case on consent. It does not apply where the only claims are for a divorce, costs, or putting an agreement or order into an order. It does not apply where the only claims are about a family arbitration, unless the court orders otherwise. It does not apply in an international child abduction case. It does not apply to the Director of the Family Responsibility Office, or to an agency under s. 33 (3) of the Family Law Act. It does not apply to a person who has already attended. File your certificate of attendance as soon as you can. File it no later than 2 p.m. on the second day before the case conference. The court can excuse a party because of urgency or hardship, or for another reason in the interest of justice.";

const MIP_EXCEPTIONS = [F_R8_1_1_MIP_APPLIES, F_R8_1_2_MIP_EXCEPTIONS, F_R8_1_6_CERTIFICATE, F_R8_1_8_MIP_EXCUSED];

const RESPONDENT_OWN_CLAIM =
  " If the property claim is your own claim in your answer, your financial statement is due with the answer. So if you serve your answer early, count the 30 days from that day.";

const propertyDisclosureDeadline = (id: string, what: string, countFrom: string, extra = "") => ({
  id,
  what,
  qualifier:
    "For a claim under Part I of the Family Law Act, the rule lists the papers. One example is the statement closest to the valuation date for each bank or other account. For any other property claim, serve the information needed to support the claim. If there is also a support claim, serve the income papers in r. 13 (3.1) with it. Serve a certificate of financial disclosure (Form 13A) with the papers. The court can order otherwise." + extra,
  countFrom,
  countFromEvent: "financial-statement-due" as const,
  length: { unit: "days" as const, count: 30 },
  regime: "family-rules" as const,
  rule: F_R13_3_3_PART_I_DISCLOSURE,
  computation: F_R3_1_COUNTING,
  consequence: "changes-what-happens-next" as const,
  exceptions: [
    F_R13_3_4_OTHER_PROPERTY_DISCLOSURE,
    F_R13_3_2_WHEN_SUPPORT_DOCUMENTS,
    F_R13_3_1_SUPPORT_DOCUMENTS,
    F_R13_5_0_2_CERTIFICATE,
    F_R13_1_FINANCIAL_STATEMENT,
  ],
});

const APPLICANT_PROPERTY_DISCLOSURE_WHAT =
  "If your application makes a property claim, serve the respondent with the property papers the rule lists";
const APPLICANT_PROPERTY_DISCLOSURE_FROM =
  "the day your financial statement was due, which is the day you served the application";
const RESPONDENT_MIP_EXTRA =
  "The applicant books your appointment and serves notice of it with the application. The 45 days run from the day the application was filed, not the day you were served. Until your certificate is filed, you cannot take other steps. You can still serve and file an answer. You can also book a case conference.";

const APPLICANT_MIP_EXTRA =
  "You book your own appointment and the respondent’s. Serve notice of the respondent’s appointment with the application. Until your certificate is filed, you cannot take another step in the case. The one exception is booking a case conference. The court can order otherwise on a motion.";

const mipDeadline = (id: string, qualifierExtra: string, extraExceptions: RuleCitation[] = []) => ({
  id,
  what: "Attend the mandatory information program",
  qualifier: `${MIP_QUALIFIER_CORE}${qualifierExtra ? ` ${qualifierExtra}` : ""}`,
  countFrom: "the day the case was started",
  countFromEvent: "family-case-started" as const,
  length: { unit: "days" as const, count: 45 },
  regime: "family-rules" as const,
  rule: F_R8_1_4_MIP_45_DAYS,
  computation: F_R3_1_COUNTING,
  consequence: "changes-what-happens-next" as const,
  exceptions: [...MIP_EXCEPTIONS, ...extraExceptions],
});

const LIMIT_QUALIFIER_SHORT =
  "This is one of the three dates above. The time ends on whichever comes first. The court can extend it, as set out above.";

const limitDeadline = (
  id: string,
  what: string,
  countFrom: string,
  countFromEvent: "marriage-terminated" | "spouses-separated" | "spouse-died",
  length: { unit: "years" | "months"; count: number },
  qualifier: string = LIMIT_QUALIFIER_SHORT,
  extraExceptions: RuleCitation[] = [],
) => ({
  id,
  what,
  qualifier,
  countFrom,
  countFromEvent,
  length,
  regime: "legislation-act" as const,
  rule: S_FLA_7_3_LIMITATION,
  // s. 89 (6) is about MONTHS only. A period of years after a day is counted
  // under s. 89 (5), which excludes the day itself (second review, 2026-10-01).
  computation: length.unit === "months" ? C.S_LEGISLATION_89_6_MONTHS : S_LEGISLATION_89_5_EXCLUDED,
  consequence: "bars-the-claim" as const,
  // s. 2 (8) is the Act's extension power and the only exception it gives to
  // s. 7 (3); s. 1 (1) is there because the qualifier says who the claim is for.
  exceptions: [S_FLA_2_8_EXTENSION, S_FLA_1_1_SPOUSE, ...extraExceptions],
});

/** The two conference-brief deadlines and the confirmation, for one kind of conference. */
const conferenceDeadlines = (
  kind: "case" | "settlement" | "tmc",
  event: "case-conference-date" | "family-settlement-conference-date" | "trial-management-conference-date",
) => {
  const name =
    kind === "case" ? "case conference" : kind === "settlement" ? "settlement conference" : "trial management conference";
  const documents =
    kind === "case"
      ? "your case conference brief"
      : kind === "settlement"
        ? "your settlement conference brief"
        : "your conference papers. In the Ontario Court of Justice, that is a trial management conference brief (Form 17E). In the Superior Court, it is the endorsed trial scheduling form if it is not already filed, an offer to settle all outstanding claims, and an outline of your opening statement. A case the rules exempt from that form uses a trial management conference brief instead";
  const asked = kind === "case" ? "If you served the case conference notice (Form 17)" : `If you asked for the ${name}`;
  const UPDATED_CERTIFICATE =
    "If you have served corrected, updated or extra financial disclosure, serve and file an updated certificate of financial disclosure (Form 13A) by the same day.";
  const CONFER =
    "Before the conference, talk or write to every other party, or make your best effort to. Discuss requests for financial disclosure and settling the issues for now" +
    (kind === "case" ? "" : ", and settling them for good") +
    ". You do not have to if a court order forbids it. You also do not have to if there is a risk of domestic violence by a party with no licensed representative.";
  const extra6 =
    kind === "tmc"
      ? ` ${UPDATED_CERTIFICATE} ${CONFER}`
      : kind === "case"
        ? ` ${FINANCIAL_UPDATE_CONFERENCE} If there is a support claim, give the other party the income papers in r. 13 (3.1) before the case conference, unless you already served them. ${CONFER}`
        : ` ${FINANCIAL_UPDATE_CONFERENCE} If there is a property claim under Part I of the Family Law Act, also serve and file your net family property statement (Form 13B) by the same day. Or serve and file an affidavit that it has not changed. ${UPDATED_CERTIFICATE} ${CONFER} In a Part I property claim, bring to the conference any paper that supports your side on a disputed property value or debt amount. Also bring any financial disclosure paper whose service is disputed.`;
  const extraExceptions =
    kind === "tmc"
      ? [F_R17_13_TMC_DOCUMENTS, F_R13_13_1_UPDATED_CERTIFICATE, F_R17_3_1_CONFER, F_R17_3_2_NO_CONFER]
      : kind === "case"
        ? [F_R13_12_UPDATE, F_R13_12_1_WHICH_DOCUMENT, F_R13_12_2_UPDATE_TIMING, F_R13_3_2_1_BEFORE_CASE_CONFERENCE, F_R13_3_1_SUPPORT_DOCUMENTS, F_R17_3_1_CONFER, F_R17_3_2_NO_CONFER]
        : [F_R13_12_UPDATE, F_R13_12_1_WHICH_DOCUMENT, F_R13_12_2_UPDATE_TIMING, F_R13_14_NFP_STATEMENT, F_R13_14_0_1_NFP_TIMING, F_R13_13_1_UPDATED_CERTIFICATE, F_R17_3_1_CONFER, F_R17_3_2_NO_CONFER, F_R17_14_2_BRING];
  const countFrom = `the date of the ${name}, counting backwards`;
  return [
    {
      id: `deadline:family:${kind}-conference-documents-6-days`,
      what: `${asked}, serve and file ${documents}. If no one asked for the conference, this time is for the applicant or the party who made the motion`,
      countFrom,
      countFromEvent: event,
      length: { unit: "days" as const, count: 6 },
      direction: "before" as const,
      qualifier: `${extra6.trim()} ${CONSENT_OR_COURT}`.trim(),
      regime: "family-rules" as const,
      rule: F_R17_13_1_BRIEF_TIMES,
      computation: F_R3_2_SHORT,
      consequence: "changes-what-happens-next" as const,
      exceptions: [F_R3_2_SHORT, F_R17_13_BRIEFS, F_R17_4_1_NOTICE, ...extraExceptions, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
    },
    {
      id: `deadline:family:${kind}-conference-documents-4-days`,
      what: kind === "tmc" ? "If you are the other party, serve and file your conference papers, as listed above" : `If you are the other party, serve and file ${documents}`,
      countFrom,
      countFromEvent: event,
      length: { unit: "days" as const, count: 4 },
      direction: "before" as const,
      // The extra steps are stated once, on the 6-day deadline above (tenth-round
      // plain-language pass removed the word-for-word repeat here).
      qualifier: `The extra steps listed above apply to you too. Where they say "by the same day", your day is this 4-day one. ${CONSENT_OR_COURT}`,
      regime: "family-rules" as const,
      rule: F_R17_13_1_BRIEF_TIMES,
      computation: F_R3_2_SHORT,
      consequence: "changes-what-happens-next" as const,
      exceptions: [F_R3_2_SHORT, F_R17_13_BRIEFS, ...extraExceptions, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
    },
    {
      id: `deadline:family:${kind}-conference-confirmation`,
      what: "Give a copy of the confirmation of conference (Form 17F) to every other party. Then give it to the clerk no later than 2 p.m",
      countFrom,
      countFromEvent: event,
      length: { unit: "days" as const, count: 3 },
      direction: "before" as const,
      qualifier: CONFIRM_QUALIFIER,
      regime: "family-rules" as const,
      rule: F_R17_14_C_CONFIRM,
      computation: F_R3_2_SHORT,
      consequence: "changes-what-happens-next" as const,
      exceptions: [F_R3_2_SHORT, F_R3_6_CONSENT, F_R17_14_1_NOT_CONFIRMED, F_R17_14_B_COPY],
    },
  ];
};

// =====================================================================
// Before anything is filed
// =====================================================================

const BEFORE_FILING: CaseStage[] = [
  {
    id: "family:before-filing:deciding-where-to-start",
    pathway: "family",
    side: "applicant",
    wentWrong: false,
    userQuestion: "Which court do I go to for my family case, and where?",
    title: "Deciding which family court to start in, and where",
    description:
      "Nothing has been filed. The person is working out which court hears this kind of family matter and in which municipality the case starts. This map does not cover child protection cases brought by a children's aid society, which the Family Law Rules treat separately. In the municipalities where the Family Court of the Superior Court of Justice has jurisdiction (listed in r. 1 (3)), the family proceedings listed in the Courts of Justice Act are started, heard and decided in the Family Court. A divorce, and a claim to divide family property under Part I of the Family Law Act, cannot be started in the Ontario Court of Justice. An Ontario court can hear a divorce only if either spouse has been habitually resident in Ontario for at least one year before the case starts.",
    cues: [
      "which court for custody",
      "where do I file for divorce",
      "family court or superior court",
      "do I file where my ex lives",
      "how do I start a family case",
    ],
    distinguishedFrom: [
      {
        stage: "family:applicant:application-filed-not-served",
        by: "whether an application has already been filed with the court",
      },
      {
        stage: "family:before-filing:property-claim-time-limit",
        by: "whether the question is where to start or whether a property claim is still in time",
      },
      {
        stage: "family:both:case-in-wrong-municipality",
        by: "whether a case has already been started somewhere",
      },
    ],
    rules: [
      F_R1_2_APPLIES,
      F_R1_3_FAMILY_COURT,
      S_CJA_21_8_FAMILY_COURT,
      S_FLA_4_1_COURT_PART_I,
      S_DIVORCE_2_1_COURT,
      S_DIVORCE_3_1_RESIDENCE,
      F_R5_1_WHERE,
      F_R5_2_DANGER,
      F_R5_3_CLERK_REFUSES,
    ],
    deadlines: [],
    /*
     * The family catch-all. "Which court do I go to?" is what a criminal,
     * child-protection or tenancy matter looks like after a misclassification,
     * so this stage routes and does not instruct.
     */
    requiresAffirmativeScope: true,
    forumCheckOnly: true,
  },
  {
    id: "family:before-filing:property-claim-time-limit",
    pathway: "family",
    side: "applicant",
    wentWrong: false,
    userQuestion: "Is there a time limit to ask for my share of our property after our marriage ended?",
    title: "Time limit for a claim to equalize net family property",
    description:
      "A married spouse is asking whether a claim to equalize net family property can still be started. Equalization is for married spouses (including a void or voidable marriage entered in good faith), not unmarried partners. The Family Law Act sets a time limit that runs from divorce, separation or death, whichever gives the earliest date, and lets the court extend it. The claim cannot be brought in the Ontario Court of Justice. When a spouse has died, the survivor's election has its own six-month time.",
    cues: [
      "we separated years ago",
      "is it too late to split the property",
      "equalization deadline",
      "divorce was two years ago",
      "my spouse died and I want my share",
    ],
    distinguishedFrom: [
      {
        stage: "family:before-filing:deciding-where-to-start",
        by: "whether the question is about the property time limit or about which court to start in",
      },
      {
        stage: "family:both:asking-to-change-final-order",
        by: "whether there is already a final order or filed agreement to change",
      },
    ],
    rules: [
      S_FLA_5_1_EQUALIZATION,
      S_FLA_1_1_SPOUSE,
      S_FLA_7_3_LIMITATION,
      S_DIVORCE_12_1_EFFECTIVE,
      S_DIVORCE_14_DISSOLVES,
      S_FLA_2_8_EXTENSION,
      S_FLA_4_1_COURT_PART_I,
      S_FLA_6_10_ELECTION,
      S_FLA_6_11_DEEMED_ELECTION,
    ],
    /*
     * s. 7 (3) is ONE limit with three start events, ending on whichever comes
     * first. It is recorded as three deadlines because a deadline has one event.
     * The full "earliest of three dates" and s. 2 (8) text renders once, on the
     * first; the other two carry a short pointer to it, so the reader sees one
     * explanation and three clocks (second review). Each still carries s. 2 (8)
     * in `exceptions`. Do not reorder: the first must stay first.
     */
    deadlines: [
      limitDeadline(
        "deadline:family:equalization-2-years-after-divorce",
        "Apply to equalize net family property, if a divorce or nullity judgment ended the marriage",
        "the day the divorce or judgment of nullity ended the marriage",
        "marriage-terminated",
        { unit: "years", count: 2 },
        `${LIMIT_QUALIFIER} A divorce usually takes effect on the 31st day after the judgment. The 2 years count from the day it takes effect.`,
        [S_DIVORCE_12_1_EFFECTIVE, S_DIVORCE_14_DISSOLVES],
      ),
      limitDeadline(
        "deadline:family:equalization-6-years-after-separation",
        "Apply to equalize net family property, if the spouses have separated",
        "the day the spouses separated with no reasonable prospect of living together again",
        "spouses-separated",
        { unit: "years", count: 6 },
      ),
      limitDeadline(
        "deadline:family:equalization-6-months-after-death",
        "Apply to equalize net family property, if the first spouse has died",
        "the first spouse’s death",
        "spouse-died",
        { unit: "months", count: 6 },
        `${LIMIT_QUALIFIER_SHORT} A period of months ends on the day with the same number as the start day. If that month has no such day, it ends on the last day of the month (Legislation Act, 2006, s. 89 (6)).`,
        [S_LEGISLATION_89_6_FULL],
      ),
      {
        id: "deadline:family:surviving-spouse-election-6-months",
        what:
          "If your spouse has died and you want your equalization entitlement, file your choice (election) with the Estate Registrar for Ontario",
        qualifier:
          "If you do not file it in time, you are treated as choosing what the will or the Succession Law Reform Act gives you, or both. The court can order otherwise on an application. The court can also extend a time set by the Family Law Act on a motion. It must find apparent grounds for relief, a delay in good faith, and no substantial prejudice to anyone. A period of months ends on the day with the same number as the start day. If that month has no such day, it ends on the last day of the month (Legislation Act, 2006, s. 89 (6)).",
        countFrom: "the first spouse’s death",
        countFromEvent: "spouse-died",
        length: { unit: "months", count: 6 },
        regime: "legislation-act",
        rule: S_FLA_6_10_ELECTION,
        computation: C.S_LEGISLATION_89_6_MONTHS,
        consequence: "bars-the-claim",
        exceptions: [S_FLA_6_11_DEEMED_ELECTION, S_FLA_2_8_EXTENSION, S_LEGISLATION_89_6_FULL],
      },
    ],
    requiresAffirmativeScope: true,
  },
];

// =====================================================================
// Applicant
// =====================================================================

const APPLICANT: CaseStage[] = [
  {
    id: "family:applicant:application-filed-not-served",
    pathway: "family",
    side: "applicant",
    wentWrong: false,
    userQuestion: "I filed my application — how do I get it to the other parent or my ex?",
    title: "Application filed, not yet served",
    description:
      "The application has been filed and has not yet been served on the respondent. In the Ontario Court of Justice, and on the Family Court's fast track, the clerk sets a court date when the application is filed. In the rest of the Superior Court, and on the Family Court's standard track (divorce, property or family arbitration claims), no court date is set until a case conference or motion is scheduled.",
    cues: [
      "I filed my application",
      "got a court date",
      "how do I serve my ex",
      "can I hand them the papers myself",
      "mandatory information program",
    ],
    distinguishedFrom: [
      {
        stage: "family:before-filing:deciding-where-to-start",
        by: "whether an application has been filed",
      },
      {
        stage: "family:applicant:served-waiting-for-answer",
        by: "whether the respondent has been served",
      },
      {
        stage: "family:applicant:service-failed",
        by: "whether service has been tried and did not work",
      },
    ],
    // r. 8 (5) is first. Its "serve immediately" deadline has no number and
    // renders as its own paragraph (count-0 deadlines render their words).
    rules: [
      F_R8_5_SERVE_IMMEDIATELY,
      F_R6_4_1_NOT_BY_PARTY,
      F_R6_4_2_EXCEPTIONS,
      F_R6_3_SPECIAL_SERVICE,
      F_R8_1_START,
      F_R8_4_COURT_DATE,
      F_R39_7_STANDARD_CLAIMS,
      F_R39_8_STANDARD_TRACK,
      F_R41_4_CLERK,
      F_R9_1_CONTINUING_RECORD,
      F_R8_3_1_PARENTING_DOCUMENTS,
      F_R8_0_1_1_AUTO_APPLIES,
      F_R8_0_1_3_AUTO_ISSUED,
      F_R8_0_1_5_AUTO_SERVICE,
      F_R8_11_NOT_SERVED_BY_COURT_DATE,
      F_R13_1_FINANCIAL_STATEMENT,
      F_R8_1_1_MIP_APPLIES,
      F_R8_1_4_MIP_45_DAYS,
      F_R8_1_5_MIP_APPOINTMENTS,
    ],
    deadlines: [
      {
        id: "deadline:family:serve-application-immediately",
        what:
          "Serve the application on every other party right away, by special service. The rule sets no number of days. It says the application must be served immediately",
        qualifier:
          "Someone other than you must do the special service, unless the court orders otherwise. Serve the continuing record on all other parties too. File it with proof of service. Some papers must go with the application. In a case about parenting, net family property, the matrimonial home or support, include the automatic order (Form 8.0.1). Include your financial statement if one is required. For a support claim with no property claim, also include the income papers in r. 13 (3.1) and a certificate of financial disclosure (Form 13A). The clerk will not accept a financial statement for a support claim without proof of your income. You need proof of your current income and of your income for the past three years. For a claim about decision-making responsibility, parenting time or contact, include the papers rule 35.1 requires. If you are not the child's parent and ask for decision-making responsibility, attach a police records check to Form 35.1. If you only have proof that you asked for the check, serve and file the check within 10 days after you get it. If the application is not served by its court date, the clerk must set a new date if you ask. You then serve it right away.",
        countFrom: "the day the application was filed",
        countFromEvent: "family-case-started",
        length: { unit: "days", count: 0 },
        regime: "family-rules",
        rule: F_R8_5_SERVE_IMMEDIATELY,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [
          F_R6_4_1_NOT_BY_PARTY,
          F_R6_4_2_EXCEPTIONS,
          F_R8_0_1_5_AUTO_SERVICE,
          F_R13_1_FINANCIAL_STATEMENT,
          F_R13_3_2_WHEN_SUPPORT_DOCUMENTS,
          F_R13_3_1_SUPPORT_DOCUMENTS,
          F_R13_5_0_2_CERTIFICATE,
          F_R13_7_PROOF_OF_INCOME,
          F_R8_3_1_PARENTING_DOCUMENTS,
          F_R35_1_3_POLICE_CHECK,
          F_R35_1_4_POLICE_CHECK_LATER,
          F_R9_1_CONTINUING_RECORD,
          F_R8_11_NOT_SERVED_BY_COURT_DATE,
        ],
      },
      mipDeadline("deadline:family:mip-45-days:applicant", APPLICANT_MIP_EXTRA, [F_R8_1_5_MIP_APPOINTMENTS, F_R8_1_7_MIP_NO_STEPS]),
      propertyDisclosureDeadline(
        "deadline:family:property-disclosure-30-days:applicant",
        APPLICANT_PROPERTY_DISCLOSURE_WHAT,
        APPLICANT_PROPERTY_DISCLOSURE_FROM,
      ),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:applicant:service-failed",
    pathway: "family",
    side: "applicant",
    wentWrong: true,
    userQuestion: "I cannot find my ex or they keep avoiding the papers — what now?",
    title: "Service of the application attempted and failed",
    description:
      "The application has been filed and serving it on the respondent has been tried without success.",
    cues: [
      "cannot find my ex",
      "they are avoiding being served",
      "no address for the other parent",
      "the process server could not serve them",
      "they moved away",
    ],
    distinguishedFrom: [
      {
        stage: "family:applicant:application-filed-not-served",
        by: "whether service has been tried at all",
      },
      {
        stage: "family:applicant:served-waiting-for-answer",
        by: "whether service was in the end carried out",
      },
    ],
    rules: [
      F_R6_15_SUBSTITUTED,
      F_R6_15_1_WITHOUT_NOTICE,
      F_R6_16_SERVICE_NOT_REQUIRED,
      F_R6_18_APPROVE_IRREGULAR,
      F_R8_11_NOT_SERVED_BY_COURT_DATE,
      F_R8_1_4_MIP_45_DAYS,
      F_R8_1_7_MIP_NO_STEPS,
      F_R8_1_8_MIP_EXCUSED,
    ],
    deadlines: [
      mipDeadline(
        "deadline:family:mip-45-days:service-failed",
        "Until your certificate is filed, you cannot take another step in the case. That includes a motion for substituted service. The one exception is booking a case conference. The court can order otherwise on a motion.",
        [F_R8_1_7_MIP_NO_STEPS],
      ),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:applicant:served-waiting-for-answer",
    pathway: "family",
    side: "applicant",
    wentWrong: false,
    userQuestion: "My ex has been served — how long do they have to answer?",
    title: "Application served, answer period running",
    description:
      "The respondent has been served with the application and the time to serve and file an answer has not run out.",
    cues: [
      "my ex was served",
      "waiting for their answer",
      "when do they have to respond",
      "affidavit of service filed",
    ],
    distinguishedFrom: [
      {
        stage: "family:applicant:application-filed-not-served",
        by: "whether the respondent has been served",
      },
      {
        stage: "family:applicant:no-answer-filed",
        by: "whether the time for an answer has run out with no answer served and filed",
      },
      {
        stage: "family:applicant:answer-received",
        by: "whether an answer has been served",
      },
    ],
    rules: [F_R10_1_ANSWER, F_R10_2_OUTSIDE, F_R13_1_FINANCIAL_STATEMENT, F_R13_3_3_PART_I_DISCLOSURE, F_R8_1_4_MIP_45_DAYS, F_R10_5_NO_ANSWER],
    deadlines: [
      {
        id: "deadline:family:answer-30-days:applicant-view",
        what: "The respondent's time to serve an answer on every other party and file it",
        actor: "other-party",
        qualifier: ANSWER_QUALIFIER_THEY,
        countFrom: "the day the respondent was served with the application",
        countFromEvent: "served-with-application",
        length: { unit: "days", count: 30 },
        regime: "family-rules",
        rule: F_R10_1_ANSWER,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: ANSWER_EXCEPTIONS,
      },
      mipDeadline(
        "deadline:family:mip-45-days:applicant-waiting",
        `${APPLICANT_MIP_EXTRA} If you claim support and no property, the income papers in r. 13 (3.1) should have gone with your financial statement. If they did not, serve them now. In any case, serve them before the case conference.`,
        [F_R8_1_5_MIP_APPOINTMENTS, F_R8_1_7_MIP_NO_STEPS, F_R13_3_2_WHEN_SUPPORT_DOCUMENTS, F_R13_3_2_1_BEFORE_CASE_CONFERENCE],
      ),
      propertyDisclosureDeadline(
        "deadline:family:property-disclosure-30-days:applicant-waiting",
        APPLICANT_PROPERTY_DISCLOSURE_WHAT,
        APPLICANT_PROPERTY_DISCLOSURE_FROM,
      ),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:applicant:no-answer-filed",
    pathway: "family",
    side: "applicant",
    wentWrong: false,
    userQuestion: "The time is up and my ex never answered — what happens now?",
    title: "Answer period expired, no answer filed",
    description:
      "The time for the respondent to serve and file an answer has passed and no answer has been filed. In the Ontario Court of Justice and on the Family Court's fast track, the clerk, by the first court date, sends the case to a judge to decide on affidavit evidence or, at the applicant's request, schedules a case conference. Otherwise the clerk, on request, schedules a case conference or sets a date for an uncontested trial, or in an uncontested divorce prepares the documents for a judge. In a divorce, the applicant files a Form 36 affidavit.",
    cues: [
      "they never answered",
      "no answer was filed",
      "30 days are up",
      "uncontested divorce",
      "can I go ahead without them",
    ],
    distinguishedFrom: [
      {
        stage: "family:applicant:served-waiting-for-answer",
        by: "whether the time for an answer has run out",
      },
      {
        stage: "family:applicant:answer-received",
        by: "whether an answer was in fact served and filed",
      },
    ],
    rules: [
      F_R10_5_NO_ANSWER,
      F_R1_8_4_CONSEQUENCES,
      F_R17_2_UNDEFENDED,
      F_R40_4_D_NO_ANSWER,
      F_R39_5_D_NO_ANSWER,
      F_R36_5_1_WHO_FILES,
      F_R23_22_UNCONTESTED,
      F_R3_7_LATE_REFUSED,
      F_R8_1_4_MIP_45_DAYS,
      F_R8_1_7_MIP_NO_STEPS,
    ],
    deadlines: [
      mipDeadline(
        "deadline:family:mip-45-days:no-answer",
        "Until your certificate is filed, you cannot ask for an uncontested trial or take another step. The one exception is booking a case conference. The court can order otherwise.",
        [F_R8_1_7_MIP_NO_STEPS],
      ),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:applicant:answer-received",
    pathway: "family",
    side: "applicant",
    wentWrong: false,
    userQuestion: "My ex filed an answer and is claiming things against me — what happens next?",
    title: "Answer served, case defended",
    description:
      "The respondent has served and filed an answer, which may include claims of their own. At least one conference must be held. In the Ontario Court of Justice and on the Family Court's fast track, the clerk schedules it. In the rest of the Superior Court and on the Family Court's standard track, a party has to ask the clerk to schedule the case conference, and serves and files a case conference notice (Form 17).",
    cues: [
      "they filed an answer",
      "my ex disagrees with everything",
      "their answer has a claim against me",
      "do I have to reply",
      "what happens after the answer",
    ],
    distinguishedFrom: [
      {
        stage: "family:applicant:no-answer-filed",
        by: "whether an answer was served and filed",
      },
      {
        stage: "family:both:case-conference-scheduled",
        by: "whether a date for the case conference has been set",
      },
      {
        stage: "family:both:served-with-automatic-order",
        by: "whether the question is about the answer itself or the automatic order served with it",
      },
    ],
    rules: [
      F_R10_6_REPLY,
      F_R10_3_CLAIM_IN_ANSWER,
      F_R13_1_FINANCIAL_STATEMENT,
      F_R17_1_CONFERENCE,
      F_R40_4_C_SCHEDULES,
      F_R39_5_C_SCHEDULES,
      F_R39_8_STANDARD_TRACK,
      F_R41_4_CLERK,
      F_R17_4_1_NOTICE,
    ],
    deadlines: [
      {
        id: "deadline:family:reply-10-days",
        what: "If you want to respond to a claim in the answer, serve and file a reply (Form 10A)",
        qualifier:
          "If the answer claims support, property or the matrimonial home against you, serve and file a financial statement in the same 10 days. You must do this even if you do not reply. For a support claim with no property claim, serve the income papers in r. 13 (3.1) with it. Where the information program applies, you cannot serve a reply until your certificate is filed. The court can order otherwise. The parties can agree in writing to change the time. The court can also give more time.",
        countFrom: "the day you were served with the answer",
        countFromEvent: "answer-served",
        length: { unit: "days", count: 10 },
        regime: "family-rules",
        rule: F_R10_6_REPLY,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [
          F_R13_1_FINANCIAL_STATEMENT,
          F_R13_3_1_SUPPORT_DOCUMENTS,
          F_R13_3_2_WHEN_SUPPORT_DOCUMENTS,
          F_R8_1_7_MIP_NO_STEPS,
          F_R8_1_8_MIP_EXCUSED,
          F_R3_3_CLOSED,
          F_R3_6_CONSENT,
          F_R3_5_COURT_CHANGES_TIME,
        ],
      },
      mipDeadline(
        "deadline:family:mip-45-days:answer-received",
        "Until your certificate is filed, you cannot serve a reply or take any other step. The one exception is booking a case conference. The court can order otherwise on a motion.",
        [F_R8_1_7_MIP_NO_STEPS],
      ),
      propertyDisclosureDeadline(
        "deadline:family:property-disclosure-30-days:answer-received",
        "If the answer makes a property claim against you, serve the respondent with the property papers the rule lists",
        "the day your financial statement was due, which is 10 days after you were served with the answer",
      ),
    ],
    requiresAffirmativeScope: true,
  },
];

// =====================================================================
// Respondent
// =====================================================================

const RESPONDENT: CaseStage[] = [
  {
    id: "family:respondent:served-time-to-answer-running",
    pathway: "family",
    side: "respondent",
    wentWrong: false,
    userQuestion: "I was served with family court papers — what do I have to do, and by when?",
    title: "Served with an application, time to answer still running",
    description:
      "The respondent has been served with an application, or has been added as a respondent by another party's answer, and the time to serve and file an answer has not run out. In the Ontario Court of Justice and on the Family Court's fast track, the application shows a court date set by the clerk; if no answer has been filed by then, the clerk sends the case to a judge to decide on affidavit evidence, unless the applicant asks for a case conference.",
    cues: [
      "I got served with an application",
      "my ex is taking me to court",
      "form 8 was handed to me",
      "how long do I have to answer",
      "I was added to the case by their answer",
    ],
    distinguishedFrom: [
      {
        stage: "family:respondent:answer-time-missed",
        by: "whether the time to answer has run out",
      },
      {
        stage: "family:respondent:answer-filed",
        by: "whether an answer has been served and filed",
      },
      {
        stage: "family:both:served-with-motion-to-change",
        by: "whether the papers are an application starting a case or a motion to change a final order",
      },
    ],
    rules: [
      F_R10_1_ANSWER,
      F_R10_2_OUTSIDE,
      F_R10_4_ADDED_RESPONDENT,
      F_R10_3_CLAIM_IN_ANSWER,
      F_R10_4_1_PARENTING_DOCUMENTS,
      F_R13_1_FINANCIAL_STATEMENT,
      F_R8_0_1_5_AUTO_SERVICE,
      F_R10_5_NO_ANSWER,
      F_R8_1_4_MIP_45_DAYS,
      F_R8_1_5_MIP_APPOINTMENTS,
      F_R8_1_7_MIP_NO_STEPS,
      F_R8_4_COURT_DATE,
      F_R40_4_D_NO_ANSWER,
      F_R39_5_D_NO_ANSWER,
    ],
    deadlines: [
      {
        id: "deadline:family:answer-30-days",
        what: "Serve an answer on every other party and file it",
        qualifier: ANSWER_QUALIFIER_YOU,
        countFrom: "the day of being served with the application",
        countFromEvent: "served-with-application",
        length: { unit: "days", count: 30 },
        regime: "family-rules",
        rule: F_R10_1_ANSWER,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [
          ...ANSWER_EXCEPTIONS,
          F_R8_0_1_5_AUTO_SERVICE,
          F_R13_3_1_SUPPORT_DOCUMENTS,
          F_R13_3_2_WHEN_SUPPORT_DOCUMENTS,
          F_R10_4_1_PARENTING_DOCUMENTS,
          F_R10_5_NO_ANSWER,
          F_R1_8_4_CONSEQUENCES,
          F_R3_7_LATE_REFUSED,
        ],
      },
      propertyDisclosureDeadline(
        "deadline:family:property-disclosure-30-days:respondent-served",
        "If the application or your answer has a property claim, serve the other party with the property papers the rule lists",
        "the day your financial statement was due, which is the last day for your answer",
        RESPONDENT_OWN_CLAIM,
      ),
      mipDeadline("deadline:family:mip-45-days:respondent", RESPONDENT_MIP_EXTRA, [F_R8_1_5_MIP_APPOINTMENTS, F_R8_1_7_MIP_NO_STEPS]),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:respondent:answer-time-missed",
    pathway: "family",
    side: "respondent",
    wentWrong: true,
    userQuestion: "I missed the deadline to answer — can I still take part in my family case?",
    title: "Time to answer missed",
    description:
      "The time to serve and file an answer has passed and the respondent has not filed one. In the Ontario Court of Justice and on the Family Court's fast track, if no answer has been filed, the clerk sends the case to a judge on or before the first court date for a decision on affidavit evidence, unless the applicant asks for a case conference. A late answer can be filed only if the other parties consent in writing to a later time, or the court makes an order lengthening the time; until then, the consequences of not answering apply. If the application claims support, property or the matrimonial home, the respondent's financial statement was also due within the answer time, whether or not an answer is filed, and the court can order it, with costs.",
    cues: [
      "I missed the 30 days",
      "the court would not take my answer",
      "I never answered the application",
      "they are going ahead without me",
      "uncontested trial date",
    ],
    distinguishedFrom: [
      {
        stage: "family:respondent:served-time-to-answer-running",
        by: "whether the time to answer has run out",
      },
      {
        stage: "family:both:final-order-made",
        by: "whether the court has already made a final order",
      },
    ],
    rules: [
      F_R10_5_NO_ANSWER,
      F_R1_8_4_CONSEQUENCES,
      F_R3_7_LATE_REFUSED,
      F_R3_6_CONSENT,
      F_R3_5_COURT_CHANGES_TIME,
      F_R6_20_NOT_SEEN,
      F_R17_2_UNDEFENDED,
      F_R13_1_FINANCIAL_STATEMENT,
      F_R13_17_ORDER_TO_PROVIDE,
      F_R40_4_D_NO_ANSWER,
      F_R39_5_D_NO_ANSWER,
    ],
    deadlines: [],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:respondent:answer-filed",
    pathway: "family",
    side: "respondent",
    wentWrong: false,
    userQuestion: "I filed my answer — what happens next?",
    title: "Answer served and filed",
    description:
      "The respondent has served and filed an answer, so the case is defended and at least one conference must be held. In the Ontario Court of Justice and on the Family Court's fast track, the clerk schedules it. In the rest of the Superior Court and on the Family Court's standard track, a party has to ask the clerk to schedule the case conference (Form 17). If the answer made a claim, the applicant may serve and file a reply within 10 days after being served with it.",
    cues: [
      "I filed my answer",
      "sent in form 10",
      "what happens after I answer",
      "they replied to my answer",
    ],
    distinguishedFrom: [
      {
        stage: "family:respondent:served-time-to-answer-running",
        by: "whether the answer has been served and filed",
      },
      {
        stage: "family:both:case-conference-scheduled",
        by: "whether a date for the case conference has been set",
      },
    ],
    rules: [
      F_R17_1_CONFERENCE,
      F_R40_4_C_SCHEDULES,
      F_R39_5_C_SCHEDULES,
      F_R39_8_STANDARD_TRACK,
      F_R41_4_CLERK,
      F_R10_6_REPLY,
      F_R17_4_1_NOTICE,
      F_R8_0_1_2_WHEN_MADE,
      F_R8_0_1_5_AUTO_SERVICE,
      F_R13_3_3_PART_I_DISCLOSURE,
      F_R13_3_4_OTHER_PROPERTY_DISCLOSURE,
      F_R13_11_MORE_INFORMATION,
    ],
    deadlines: [
      {
        id: "deadline:family:automatic-order-from-answer-7-days",
        what:
          "If your answer made its own claim about parenting, property or support and the clerk gave you an automatic order, serve it on every other party",
        qualifier:
          "Serve it promptly after the clerk gives it to you.",
        countFrom: "the day the automatic order was issued",
        countFromEvent: "automatic-order-issued",
        length: { unit: "days", count: 7 },
        regime: "family-rules",
        rule: F_R8_0_1_5_AUTO_SERVICE,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R8_0_1_2_WHEN_MADE, F_R8_0_1_4_AUTO_EXCEPTIONS, F_R3_3_CLOSED],
      },
      mipDeadline("deadline:family:mip-45-days:answer-filed", RESPONDENT_MIP_EXTRA, [F_R8_1_5_MIP_APPOINTMENTS, F_R8_1_7_MIP_NO_STEPS]),
      propertyDisclosureDeadline(
        "deadline:family:property-disclosure-30-days:respondent",
        "If the application or your answer has a property claim, serve the other party with the property papers the rule lists",
        "the day your financial statement was due, which is the last day for your answer",
        RESPONDENT_OWN_CLAIM,
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
    id: "family:both:served-with-automatic-order",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "I was served with an automatic order — what is it, and where does it come from?",
    title: "Served with an automatic order",
    description:
      "The other party made a claim about parenting, net family property, the matrimonial home or support, and the clerk issued an automatic order (Form 8.0.1), which was served on this party with the application or after an answer, motion to change or response.",
    cues: [
      "automatic order",
      "form 8.0.1",
      "I was served with an order I never asked for",
      "the clerk issued an order at the start of the case",
    ],
    distinguishedFrom: [
      {
        stage: "family:respondent:served-time-to-answer-running",
        by: "whether the question is about the automatic order or about answering the application served with it",
      },
      {
        stage: "family:both:order-made-without-notice",
        by: "whether the order was issued by the clerk automatically or made by a judge on a motion without notice",
      },
    ],
    // The order's own terms are on Form 8.0.1, which is not in the corpus. This
    // stage carries only what the rule says about when it issues and is served.
    rules: [
      F_R8_0_1_1_AUTO_APPLIES,
      F_R8_0_1_2_WHEN_MADE,
      F_R8_0_1_3_AUTO_ISSUED,
      F_R8_0_1_4_AUTO_EXCEPTIONS,
      F_R8_0_1_5_AUTO_SERVICE,
    ],
    deadlines: [],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:case-conference-scheduled",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "I have a case conference coming up — what do I have to file, and when?",
    title: "Case conference scheduled",
    description: "A date has been set for a case conference and it has not happened yet.",
    cues: [
      "case conference next month",
      "case conference brief",
      "form 17a",
      "what do I bring to the case conference",
      "confirmation of conference",
    ],
    distinguishedFrom: [
      {
        stage: "family:respondent:answer-filed",
        by: "whether a case conference date has been set",
      },
      {
        stage: "family:both:settlement-conference-scheduled",
        by: "whether the conference coming up is a case conference or a settlement conference",
      },
      {
        stage: "family:both:missed-or-unconfirmed-conference",
        by: "whether the conference date has already passed or the conference was not confirmed",
      },
    ],
    rules: [
      F_R17_4_CASE_CONFERENCE,
      F_R17_4_1_NOTICE,
      F_R17_13_BRIEFS,
      F_R17_13_1_BRIEF_TIMES,
      F_R17_14_B_COPY,
      F_R17_14_C_CONFIRM,
      F_R17_14_1_NOT_CONFIRMED,
      F_R17_3_1_CONFER,
      F_R17_3_2_NO_CONFER,
      F_R13_3_2_1_BEFORE_CASE_CONFERENCE,
      F_R13_5_0_2_CERTIFICATE,
      F_R13_12_UPDATE,
      F_R8_1_6_CERTIFICATE,
      F_R17_15_ATTEND,
      F_R14_4_CONFERENCE_FIRST,
    ],
    deadlines: [
      ...conferenceDeadlines("case", "case-conference-date"),
      {
        id: "deadline:family:financial-disclosure-certificate-6-days",
        what:
          "If you are the applicant or the party who made the motion, and you had to serve financial disclosure, file your certificate of financial disclosure (Form 13A)",
        countFrom: "the date of the case conference, counting backwards",
        countFromEvent: "case-conference-date",
        length: { unit: "days", count: 6 },
        direction: "before",
        qualifier: `You also serve the certificate with the disclosure papers. ${CONSENT_OR_COURT}`,
        regime: "family-rules",
        rule: F_R13_5_0_2_CERTIFICATE,
        computation: F_R3_2_SHORT,
        consequence: "changes-what-happens-next",
        exceptions: [F_R3_2_SHORT, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
      {
        id: "deadline:family:financial-disclosure-certificate-4-days",
        what:
          "If you are the other party and had to serve financial disclosure, file your certificate (Form 13A)",
        countFrom: "the date of the case conference, counting backwards",
        countFromEvent: "case-conference-date",
        length: { unit: "days", count: 4 },
        direction: "before",
        qualifier: `You also serve the certificate with the disclosure papers. ${CONSENT_OR_COURT}`,
        regime: "family-rules",
        rule: F_R13_5_0_2_CERTIFICATE,
        computation: F_R3_2_SHORT,
        consequence: "changes-what-happens-next",
        exceptions: [F_R3_2_SHORT, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
      {
        id: "deadline:family:mip-certificate-before-case-conference",
        what:
          "File your information program certificate of attendance as soon as you can, and no later than 2 p.m",
        countFrom: "the date of the case conference, counting backwards",
        countFromEvent: "case-conference-date",
        length: { unit: "days", count: 2 },
        direction: "before",
        qualifier: `This applies only if the program applies to the case. ${CONSENT_OR_COURT}`,
        regime: "family-rules",
        rule: F_R8_1_6_CERTIFICATE,
        computation: F_R3_2_SHORT,
        consequence: "changes-what-happens-next",
        exceptions: [F_R3_2_SHORT, F_R8_1_1_MIP_APPLIES, F_R8_1_2_MIP_EXCEPTIONS, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:settlement-conference-scheduled",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "We have a settlement conference — what do I need to file and bring?",
    title: "Settlement conference scheduled",
    description: "A date has been set for a settlement conference and it has not happened yet.",
    cues: [
      "settlement conference date",
      "settlement conference brief",
      "form 17c",
      "net family property statement",
      "expert report before the settlement conference",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:case-conference-scheduled",
        by: "whether the conference coming up is a settlement conference or a case conference",
      },
      {
        stage: "family:both:trial-management-conference-scheduled",
        by: "whether the conference coming up is a settlement conference or a trial management conference",
      },
      {
        stage: "family:both:missed-or-unconfirmed-conference",
        by: "whether the conference date has already passed or the conference was not confirmed",
      },
    ],
    rules: [
      F_R17_5_SETTLEMENT_CONFERENCE,
      F_R17_13_BRIEFS,
      F_R17_13_1_BRIEF_TIMES,
      F_R17_14_B_COPY,
      F_R17_14_C_CONFIRM,
      F_R17_14_1_NOT_CONFIRMED,
      F_R17_14_2_BRING,
      F_R17_3_1_CONFER,
      F_R13_12_UPDATE,
      F_R13_14_NFP_STATEMENT,
      F_R13_14_2_JOINT_COMPARISON,
      F_R20_2_2_EXPERT_REPORT,
      F_R20_2_14_PARTICIPANT,
      F_R17_10_BEFORE_TRIAL,
      F_R17_19_AGREEMENT,
    ],
    deadlines: [
      ...conferenceDeadlines("settlement", "family-settlement-conference-date"),
      {
        id: "deadline:family:nfp-comparison-6-days",
        what:
          "If there is a property claim under Part I of the Family Law Act, file a joint comparison of net family property statements (Form 13C)",
        countFrom: "the date of the settlement conference, counting backwards",
        countFromEvent: "family-settlement-conference-date",
        length: { unit: "days", count: 6 },
        direction: "before",
        qualifier: `If the parties cannot agree on a joint one, each party serves and files their own. The party who asked for the conference does it 6 days before. If no one asked, that is the applicant or the party who made the motion. The other party does it 4 days before. ${CONSENT_OR_COURT}`,
        regime: "family-rules",
        rule: F_R13_14_2_JOINT_COMPARISON,
        computation: F_R3_2_SHORT,
        consequence: "changes-what-happens-next",
        exceptions: [F_R3_2_SHORT, F_R13_14_3_SEPARATE_COMPARISON, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
      {
        id: "deadline:family:expert-report-6-days",
        what:
          "If you want to call a litigation expert at trial, serve the expert's signed report on all other parties and file it",
        countFrom: "the date of the settlement conference, counting backwards",
        countFromEvent: "family-settlement-conference-date",
        length: { unit: "days", count: 6 },
        direction: "before",
        qualifier: `For a participant expert, serve notice on all other parties by the same day. Also serve and file any written opinion from that expert that you want to use. The parties cannot change this time by agreement. It can be extended only by an order made at the settlement conference, with an order about costs. The trial judge or the judge managing the case can order otherwise.`,
        regime: "family-rules",
        rule: F_R20_2_2_EXPERT_REPORT,
        computation: F_R3_2_SHORT,
        consequence: "changes-what-happens-next",
        exceptions: [F_R3_2_SHORT, F_R20_2_14_PARTICIPANT, F_R3_6_CONSENT, F_R3_6_B1_EXPERT, F_R20_2_14_1_LATE],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:trial-management-conference-scheduled",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "We have a trial management conference — what do I have to file for it?",
    title: "Trial management conference scheduled",
    description:
      "A date has been set for a trial management conference and it has not happened yet. The documents differ between the Ontario Court of Justice and the Superior Court of Justice.",
    cues: [
      "trial management conference",
      "form 17e",
      "trial scheduling endorsement form",
      "outline of opening statement",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:settlement-conference-scheduled",
        by: "whether the conference coming up is a trial management conference or a settlement conference",
      },
      {
        stage: "family:both:trial-scheduled",
        by: "whether the trial management conference is still to come or the trial date is the next step",
      },
    ],
    rules: [
      F_R17_6_TRIAL_MANAGEMENT,
      F_R17_13_TMC_DOCUMENTS,
      F_R17_13_1_BRIEF_TIMES,
      F_R17_14_B_COPY,
      F_R17_14_C_CONFIRM,
      F_R17_14_1_NOT_CONFIRMED,
      F_R17_3_1_CONFER,
      F_R17_15_ATTEND,
    ],
    deadlines: conferenceDeadlines("tmc", "trial-management-conference-date"),
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:missed-or-unconfirmed-conference",
    pathway: "family",
    side: "both",
    wentWrong: true,
    userQuestion: "I missed my conference, or forgot to confirm it — what happens now?",
    title: "Missed a conference, or it was not confirmed",
    description:
      "A party did not attend a case, settlement or trial management conference, did not confirm it in time, or came without the required documents.",
    cues: [
      "I missed the case conference",
      "I forgot to confirm the conference",
      "the conference did not go ahead",
      "the judge ordered me to pay costs",
      "I did not file my brief",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:case-conference-scheduled",
        by: "whether the conference date has passed or the confirmation time has gone by",
      },
      {
        stage: "family:both:settlement-conference-scheduled",
        by: "whether the conference date has passed or the confirmation time has gone by",
      },
      {
        stage: "family:both:notice-of-approaching-dismissal",
        by: "whether a notice of approaching dismissal has already been served",
      },
    ],
    rules: [F_R17_15_ATTEND, F_R17_14_1_NOT_CONFIRMED, F_R17_18_COSTS, F_R1_8_1_FAILURE_TO_FOLLOW, ...DISMISSAL_RULES],
    deadlines: [
      {
        id: "deadline:family:missed-conference-dismissal-warning",
        what:
          "If the clerk serves a notice of approaching dismissal, take one of the five steps below, or the case is dismissed without further notice",
        qualifier:
          `${DISMISSAL_STEPS} After a missed conference, the clerk serves that notice if three things are true. It was a case or settlement conference. It was set for 365 days or more after the case started. And a judge did not adjourn it. The clerk also serves one if the case was not settled, withdrawn, or scheduled or adjourned for trial before day 365. If a conference arranged as step five also does not go ahead, and a judge did not adjourn it, the case is dismissed without further notice. A judge can set aside the clerk's dismissal order on a motion. ${DISMISSAL_EXCLUSIONS}`,
        countFrom: "the day the notice of approaching dismissal was served",
        countFromEvent: "notice-of-approaching-dismissal-served",
        length: { unit: "days", count: 60 },
        regime: "family-rules",
        rule: F_R40_6_DISMISSAL,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R40_5_2_MISSED, F_R39_11_2_MISSED, F_R41_5_2_MISSED, F_R39_12_DISMISSAL, F_R41_6_DISMISSAL, F_R40_6_1_SECOND_MISS, F_R40_9_SET_ASIDE, F_R39_2_EXCLUDED, F_R40_2_EXCLUDED, F_R41_2_EXCLUDED],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:financial-disclosure-missing",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "The other side's financial disclosure is incomplete — how do I get the rest?",
    title: "Asking for missing financial disclosure",
    description:
      "A party thinks the other party's financial statement or disclosure does not give enough information for a full understanding of their finances.",
    cues: [
      "they did not give their tax returns",
      "the financial statement is incomplete",
      "how do I make them disclose",
      "request for information",
      "they are hiding income",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:case-conference-scheduled",
        by: "whether the question is about missing disclosure or about getting ready for a conference",
      },
      {
        stage: "family:both:bringing-a-motion",
        by: "whether the request is still the written request the rule requires first, or already a motion",
      },
    ],
    rules: [F_R13_11_MORE_INFORMATION, F_R13_11_0_1_SPECIFY, F_R13_17_ORDER_TO_PROVIDE],
    deadlines: [
      {
        id: "deadline:family:disclosure-request-7-days",
        what: "The other party's time to give the additional financial information you asked for in writing",
        actor: "other-party",
        qualifier:
          "If it is not given in that time, the court can order it. It can do so on a motion or at a case or settlement conference. In your motion or conference brief, say what you asked for and did not get.",
        countFrom: "the day of the written request",
        countFromEvent: "disclosure-requested",
        length: { unit: "days", count: 7 },
        regime: "family-rules",
        rule: F_R13_11_MORE_INFORMATION,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R13_11_0_1_SPECIFY, F_R3_3_CLOSED],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:bringing-a-motion",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "I need a temporary order before the case is over — how do I bring a motion?",
    title: "Bringing a motion for a temporary order",
    description:
      "A party wants a temporary order, directions, or a change to a temporary order while the case goes on.",
    cues: [
      "temporary custody order",
      "interim support",
      "I need an order now",
      "notice of motion form 14",
      "emergency motion",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:responding-to-a-motion",
        by: "whether the person is making the motion or answering one",
      },
      {
        stage: "family:both:asking-to-change-final-order",
        by: "whether the order to be changed is temporary or final",
      },
      {
        stage: "family:both:case-conference-scheduled",
        by: "whether a conference on the main issues has been completed, since most motions must wait for it",
      },
    ],
    rules: [
      F_R14_1_MOTION,
      F_R14_4_CONFERENCE_FIRST,
      F_R14_4_2_URGENCY,
      F_R14_9_DOCUMENTS,
      F_R14_10_MOTION_FORM,
      F_R14_11_SERVE_FILE,
      F_R14_11_D_COPY,
      F_R14_11_E_CONFIRM,
      F_R14_11_1_NOT_CONFIRMED,
      F_R14_11_5_REPLY,
      F_R14_12_WITHOUT_NOTICE,
      F_R14_13_WITHOUT_NOTICE_FILING,
      F_R14_6_EXEMPT,
      F_R14_20_EVIDENCE,
      F_R13_4_TEMPORARY_SUPPORT,
      F_R13_12_UPDATE,
    ],
    deadlines: [
      {
        id: "deadline:family:motion-serve-6-days",
        what: "Serve your notice of motion and affidavit (or your motion form) on all other parties",
        countFrom: "the date the motion will be heard, counting backwards",
        countFromEvent: "motion-hearing-date",
        length: { unit: "days", count: 6 },
        direction: "before",
        qualifier: `In most cases, you cannot serve a motion or have it heard until a conference on the main issues is done. The court can allow it sooner for urgency, hardship or another reason in the interest of justice. The wait does not apply to the motions the rule lists. Examples are motions without notice, on consent, unopposed or procedural (Form 14B). It also does not apply to a motion for summary judgment, or to change an order for fraud, mistake or lack of notice. Before the motion, talk or write to every other party about the issues, or make your best effort to. You do not have to if a court order forbids it. You also do not have to if there is a risk of domestic violence by a party with no licensed representative. Where the information program applies, you cannot bring a motion until your certificate is filed. The court can order otherwise, for example for urgency or hardship. Your last financial statement may be more than 30 days old when the motion is heard. If so, update it by this same day with an affidavit or a new statement. If the motion claims support, property or exclusive possession of the matrimonial home, serve and file a financial statement with it. Do the same if it asks to change temporary support. For a motion without notice, file the papers on or before the motion date. If the court then makes an order, serve it right away on every party affected. Serve all the motion papers with it, unless the court orders otherwise. The order sets a return date within 14 days, or on a date the court chooses. ${CONSENT_OR_COURT}`,
        regime: "family-rules",
        rule: F_R14_11_SERVE_FILE,
        computation: F_R3_2_SHORT,
        consequence: "changes-what-happens-next",
        exceptions: [
          F_R3_2_SHORT,
          F_R14_4_CONFERENCE_FIRST,
          F_R14_4_2_URGENCY,
          F_R14_6_EXEMPT,
          F_R14_11_SERVE_FILE,
          F_R14_13_WITHOUT_NOTICE_FILING,
          F_R14_14_COMES_BACK,
          F_R14_15_SERVED,
          F_R8_1_7_MIP_NO_STEPS,
          F_R8_1_8_MIP_EXCUSED,
          F_R13_12_UPDATE,
          F_R13_12_1_WHICH_DOCUMENT,
          F_R13_12_2_UPDATE_TIMING,
          F_R13_4_TEMPORARY_SUPPORT,
          F_R13_1_FINANCIAL_STATEMENT,
          F_R3_6_CONSENT,
          F_R3_5_COURT_CHANGES_TIME,
        ],
      },
      {
        id: "deadline:family:motion-file-4-days",
        what: "File your motion papers. File them as soon as you can after you serve them",
        countFrom: "the date the motion will be heard, counting backwards",
        countFromEvent: "motion-hearing-date",
        length: { unit: "days", count: 4 },
        direction: "before",
        qualifier: `${CONSENT_OR_COURT}`,
        regime: "family-rules",
        rule: F_R14_11_SERVE_FILE,
        computation: F_R3_2_SHORT,
        consequence: "changes-what-happens-next",
        exceptions: [F_R3_2_SHORT, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
      {
        id: "deadline:family:motion-confirmation",
        what:
          "Give a copy of the confirmation of motion (Form 14C) to every other party. Then give it to the clerk no later than 2 p.m",
        countFrom: "the date the motion will be heard, counting backwards",
        countFromEvent: "motion-hearing-date",
        length: { unit: "days", count: 3 },
        direction: "before",
        qualifier: `The parties cannot change this time by agreement. Unless the court orders otherwise, the motion will not be heard without it. If you used a notice of motion and got a response, any reply is due by this same time. If you used a motion form (Form 14B), you cannot reply to a response.`,
        regime: "family-rules",
        rule: F_R14_11_E_CONFIRM,
        computation: F_R3_2_SHORT,
        consequence: "changes-what-happens-next",
        exceptions: [F_R3_2_SHORT, F_R3_6_CONSENT, F_R14_11_1_NOT_CONFIRMED, F_R14_11_D_COPY, F_R14_11_5_REPLY, F_R14_11_6_NO_REPLY],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:responding-to-a-motion",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "I was served with a motion — how do I respond, and by when?",
    title: "Served with a motion, response time running",
    description:
      "A party has been served with a motion for a temporary order or directions and the motion has not been heard yet.",
    cues: [
      "I got a notice of motion",
      "my ex brought a motion",
      "how do I respond to a motion",
      "affidavit in response",
      "form 14b was served on me",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:bringing-a-motion",
        by: "whether the person is answering a motion or making one",
      },
      {
        stage: "family:both:order-made-without-notice",
        by: "whether an order has already been made without the person being told",
      },
    ],
    rules: [
      F_R14_11_3_RESPONSE,
      F_R14_11_4_RESPONSE_FORM_14B,
      F_R14_20_EVIDENCE,
      F_R13_4_TEMPORARY_SUPPORT,
      F_R13_12_UPDATE,
      F_R13_12_2_UPDATE_TIMING,
    ],
    deadlines: [
      {
        id: "deadline:family:motion-response-4-days",
        what: "If you were served with a notice of motion (Form 14), serve and file your response",
        countFrom: "the date the motion will be heard, counting backwards",
        countFromEvent: "motion-hearing-date",
        length: { unit: "days", count: 4 },
        direction: "before",
        qualifier: `Your last financial statement may be more than 30 days old when the motion is heard. If so, update it by this same day with an affidavit or a new statement. The motion may claim support, property or exclusive possession of the matrimonial home against you. If so, serve and file your financial statement by this same day, even if you do not respond. If the motion asks to change temporary support, see the rule below as well. Meet whichever time is earlier. ${CONSENT_OR_COURT}`,
        regime: "family-rules",
        rule: F_R14_11_3_RESPONSE,
        computation: F_R3_2_SHORT,
        consequence: "changes-what-happens-next",
        exceptions: [F_R3_2_SHORT, F_R13_12_UPDATE, F_R13_12_1_WHICH_DOCUMENT, F_R13_12_2_UPDATE_TIMING, F_R13_1_FINANCIAL_STATEMENT, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
      {
        id: "deadline:family:motion-form-response-7-days",
        what: "If you were served with a motion form (Form 14B), serve and file your response",
        countFrom: "the day the motion form was served on you",
        countFromEvent: "motion-form-served",
        length: { unit: "days", count: 7 },
        qualifier:
          "Every day counts, including Saturdays and Sundays. The parties can agree in writing to change this time. The court can also change it.",
        regime: "family-rules",
        rule: F_R14_11_4_RESPONSE_FORM_14B,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R3_3_CLOSED, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
      {
        id: "deadline:family:temporary-support-financial-statement-2-days",
        what:
          "If the motion asks to change temporary support, serve and file your financial statement as soon as you can after you are served. Serve and file your affidavit in response at the same time",
        countFrom: "the date the motion will be heard, counting backwards",
        countFromEvent: "motion-hearing-date",
        length: { unit: "days", count: 2 },
        direction: "before",
        regime: "family-rules",
        qualifier: `The rule for this kind of motion sets 2 days before the motion for both papers. The general rule for a response sets 4 days. To be safe, serve and file both by the 4-day date. ${CONSENT_OR_COURT}`,
        rule: F_R13_4_TEMPORARY_SUPPORT,
        computation: F_R3_2_SHORT,
        consequence: "changes-what-happens-next",
        exceptions: [F_R3_2_SHORT, F_R14_11_3_RESPONSE, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:order-made-without-notice",
    pathway: "family",
    side: "both",
    wentWrong: true,
    userQuestion: "A judge made an order against me and I was never told about the motion — what can I do?",
    title: "Order made on a motion without notice",
    description:
      "A temporary order was made on a motion the other party brought without notice. The matter has to come back to court.",
    cues: [
      "order made without notice",
      "emergency order against me",
      "I was not told about the motion",
      "ex parte order",
      "they got an order behind my back",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:responding-to-a-motion",
        by: "whether the order has already been made without notice, rather than a motion still to be heard",
      },
      {
        stage: "family:both:final-order-made",
        by: "whether the order is a temporary order made without notice or a final order",
      },
    ],
    rules: [F_R14_12_WITHOUT_NOTICE, F_R14_14_COMES_BACK, F_R14_15_SERVED, F_R25_19_CHANGE_ORDER, F_R14_6_A_CHANGE_WITHOUT_NOTICE],
    deadlines: [
      {
        id: "deadline:family:without-notice-return-14-days",
        what: "The order must send the matter back to court",
        actor: "court",
        qualifier:
          "The court can choose another date instead. The matter goes back to the same judge if possible. The order sets the return date. Unless the court orders otherwise, the other party must serve you right away. They must serve the order and all the papers used on the motion. You can also bring a motion to change the order because it was made without notice. That motion does not have to wait for a conference.",
        countFrom: "the day the order was made",
        countFromEvent: "order-made",
        length: { unit: "days", count: 14 },
        regime: "family-rules",
        rule: F_R14_14_COMES_BACK,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R14_14_COMES_BACK, F_R14_15_SERVED, F_R25_19_CHANGE_ORDER, F_R14_6_A_CHANGE_WITHOUT_NOTICE],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:asking-to-change-final-order",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "Things have changed since the final order — how do I ask the court to change it?",
    title: "Bringing a motion to change a final order or support agreement",
    description:
      "There is a final order, a filed support agreement or a filed arbitration award, and a party wants it changed. A motion to change is started where rule 5 says a new case would start, such as the municipality where a party resides or, for parenting issues, where the child habitually resides, which may be different from where the order was made.",
    cues: [
      "change my support order",
      "vary the custody order",
      "motion to change form 15",
      "I lost my job and cannot pay support",
      "change the final order",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:bringing-a-motion",
        by: "whether the order to be changed is final or temporary",
      },
      {
        stage: "family:both:served-with-motion-to-change",
        by: "whether the person is asking for the change or responding to it",
      },
      {
        stage: "family:both:motion-to-change-response-time-missed",
        by: "whether the other party's time to respond has run out with no response or consent",
      },
    ],
    rules: [
      F_R8_2_ONLY_BY_RULE_15,
      F_R15_2_APPLIES,
      F_R15_4_WHERE,
      F_R15_5_MOTION_TO_CHANGE,
      F_R15_17_CONSENT,
      F_R15_18_CONSENT_CHILD_SUPPORT,
      F_R15_5_1_PARENTING_DOCUMENTS,
      F_R15_6_BLANK_FORMS,
      F_R15_7_SPECIAL_SERVICE,
      F_R6_4_1_NOT_BY_PARTY,
      F_R15_11_ASSIGNEE,
      F_R13_4_2_MOTION_TO_CHANGE_SUPPORT,
      F_R15_10_TIME,
      F_R17_3_MOTION_TO_CHANGE,
      F_R8_0_1_5_AUTO_SERVICE,
      F_R13_5_0_1_CHANGE_SUPPORT_DOCUMENTS,
      S_FLA_37_3_SIX_MONTHS,
    ],
    deadlines: [
      {
        id: "deadline:family:serve-motion-to-change",
        what:
          "Serve and file your motion to change (Form 15). Include all required attachments, a blank response (Form 15B) and a blank consent (Form 15C). If you ask to change decision-making responsibility, parenting time or contact, include the papers rule 35.1 requires. Serve it by special service, not regular service",
        qualifier:
          "Someone other than you must serve it, unless the court orders otherwise. If the other party and any assignee agree to the change, you do not serve a motion to change. Instead the parties file a consent motion to change (Form 15C), with the papers the rule lists. If only child support is changing, use Form 15D. If you ask to change support, serve and file your financial statement with the motion. You do not need one if the only support claim is child support in the table amount. Serve the papers the rule lists with it. Examples are the income papers in r. 13 (3.1) and a current schedule of arrears from the Family Responsibility Office. Add a certificate of financial disclosure (Form 13A). If the order or agreement was assigned, serve the assignee as if it were a party.",
        countFrom: "the day the motion to change was filed",
        countFromEvent: "motion-to-change-filed",
        length: { unit: "days", count: 0 },
        regime: "family-rules",
        rule: F_R15_7_SPECIAL_SERVICE,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [
          F_R15_5_MOTION_TO_CHANGE,
          F_R15_6_BLANK_FORMS,
          F_R6_4_1_NOT_BY_PARTY,
          F_R6_4_2_EXCEPTIONS,
          F_R13_4_2_MOTION_TO_CHANGE_SUPPORT,
          F_R13_5_0_1_CHANGE_SUPPORT_DOCUMENTS,
          F_R13_1_3_TABLE_CHILD_SUPPORT,
          F_R13_5_0_2_CERTIFICATE,
          F_R15_17_CONSENT,
          F_R15_18_CONSENT_CHILD_SUPPORT,
          F_R15_11_ASSIGNEE,
        ],
      },
      /*
       * Count 0 ON PURPOSE (fifth review asked for {6 months}). FLA s. 37 (3) is
       * a NOT-BEFORE period: no application within six months, except by leave.
       * The deadline type only expresses a last day. Encoded as 6 months under
       * the legislation-act regime, the engine would compute "six months after
       * the order" and present it as the day by which to act, which is the
       * reverse of the statute. Count 0 renders the words only, and
       * computedDeadline.ts skips count 0, so nothing computes a date from it.
       * Reviews 5 and 7 both asked for {6 months}; both were declined for this
       * reason. Change it only when StageDeadline gains a not-before shape.
       */
      {
        id: "deadline:family:fla-support-variation-not-within-6-months",
        what:
          "If the order is a support order under the Family Law Act, you cannot apply to vary it within six months after it was made. The same is true within six months after the last decision on an application to vary it. The court can give permission (leave)",
        qualifier:
          "The six months are counted under the Legislation Act, 2006. They end on the day with the same number as the start day. If that month has no such day, they end on its last day.",
        countFrom: "the day the support order was made",
        countFromEvent: "order-made",
        length: { unit: "days", count: 0 },
        regime: "legislation-act",
        rule: S_FLA_37_3_SIX_MONTHS,
        computation: C.S_LEGISLATION_89_6_MONTHS,
        consequence: "changes-what-happens-next",
        exceptions: [S_FLA_37_3_SIX_MONTHS, S_LEGISLATION_89_6_FULL],
      },
      {
        id: "deadline:family:motion-to-change-response:moving-party-view",
        what: "The other party's time to serve and file a response, or return a signed consent",
        actor: "other-party",
        qualifier:
          "It is 60 days if they do not live in Canada or the United States. The parties can agree in writing to change the time. The court can also give more time.",
        countFrom: "the day the other party receives the motion to change and its supporting documents",
        countFromEvent: "served-with-motion-to-change",
        length: { unit: "days", count: 30 },
        regime: "family-rules",
        rule: F_R15_10_TIME,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R15_10_TIME, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
      {
        id: "deadline:family:automatic-order-from-motion-to-change-7-days",
        what:
          "If your motion to change makes a claim about parenting, property or support and the clerk gave you an automatic order, serve it on every other party",
        qualifier:
          "Serve it promptly after the clerk gives it to you.",
        countFrom: "the day the automatic order was issued",
        countFromEvent: "automatic-order-issued",
        length: { unit: "days", count: 7 },
        regime: "family-rules",
        rule: F_R8_0_1_5_AUTO_SERVICE,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R8_0_1_2_WHEN_MADE, F_R8_0_1_4_AUTO_EXCEPTIONS, F_R3_3_CLOSED],
      },
      mipDeadline(
        "deadline:family:mip-45-days:motion-to-change",
        "Until your certificate is filed, you cannot take another step in the case. The one exception is booking a case conference. The court can order otherwise on a motion. The rule counts the 45 days from when the case started. It says nothing more exact for a motion to change.",
        [F_R8_1_7_MIP_NO_STEPS],
      ),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:served-with-motion-to-change",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "My ex wants to change our final order — what do I have to do, and by when?",
    title: "Served with a motion to change a final order",
    description:
      "A party has been served with a motion to change a final order or support agreement and the time to respond has not run out.",
    cues: [
      "I got a motion to change",
      "my ex wants to lower support",
      "form 15b response",
      "consent motion to change",
      "they want to change custody",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:asking-to-change-final-order",
        by: "whether the person is responding to the change or asking for it",
      },
      {
        stage: "family:both:motion-to-change-response-time-missed",
        by: "whether the time to respond has already run out",
      },
      {
        stage: "family:respondent:served-time-to-answer-running",
        by: "whether the papers are a motion to change a final order or an application starting a case",
      },
    ],
    rules: [
      F_R15_9_RESPONSE_OR_CONSENT,
      F_R15_10_TIME,
      F_R13_4_2_MOTION_TO_CHANGE_SUPPORT,
      F_R13_4_3_RESPONSE_ASKS_SUPPORT,
      F_R8_0_1_5_AUTO_SERVICE,
      F_R15_14_NO_RESPONSE,
    ],
    deadlines: [
      {
        id: "deadline:family:motion-to-change-response",
        what:
          "If you do not agree, or want the court to make an added or different change, serve and file a response (Form 15B). If you agree, return a signed consent motion to change (Form 15C) to the party making the motion. Give a copy to any assignee",
        qualifier:
          "It is 60 days if you do not live in Canada or the United States. The motion may ask to change support, or your response may ask for a support change. If so, your financial statement is due in the same time. Serve the papers the rule lists with it. Examples are the income papers in r. 13 (3.1) and a current schedule of arrears from the Family Responsibility Office. Add a certificate of financial disclosure (Form 13A). Your response may ask for its own change to parenting, property or support. If the clerk then issues an automatic order, serve it promptly, and no later than 7 days after it is issued. Where the information program applies, your certificate must be filed before you serve the response. This is explained below. The parties can agree in writing to change the time. The court can also give more time.",
        countFrom: "the day you receive the motion to change and its supporting documents",
        countFromEvent: "served-with-motion-to-change",
        length: { unit: "days", count: 30 },
        regime: "family-rules",
        rule: F_R15_10_TIME,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [
          F_R15_10_TIME,
          F_R13_4_2_MOTION_TO_CHANGE_SUPPORT,
          F_R13_4_3_RESPONSE_ASKS_SUPPORT,
          F_R13_5_0_1_CHANGE_SUPPORT_DOCUMENTS,
          F_R13_5_0_2_CERTIFICATE,
          F_R8_0_1_5_AUTO_SERVICE,
          F_R8_1_7_MIP_NO_STEPS,
          F_R3_6_CONSENT,
          F_R3_5_COURT_CHANGES_TIME,
        ],
      },
      mipDeadline(
        "deadline:family:mip-45-days:served-with-motion-to-change",
        "Until your certificate is filed, you cannot take any step in the case except booking a case conference. The rule's other exception is for an answer. It does not mention a response to a motion to change. So where the program applies, attend it and file your certificate before your response is due. Or ask the court on a motion to excuse you. The rule counts the 45 days from when the case started. It says nothing more exact for a motion to change.",
        [F_R8_1_7_MIP_NO_STEPS],
      ),
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:motion-to-change-response-time-missed",
    pathway: "family",
    side: "both",
    wentWrong: true,
    userQuestion: "Nobody responded to the motion to change in time — what happens now?",
    title: "Time to respond to a motion to change has run out",
    description:
      "The time to serve and file a response, or return a consent, to a motion to change has passed and neither was done. In the Ontario Court of Justice and on the Family Court's fast track, the clerk sends the motion to a judge on or before the first court date for a decision on the evidence filed. In any court, the party who made the motion may also file a motion form (Form 14B) asking for the order requested, unless an assignee has filed a notice of financial interest and opposes the change. A late response can be filed only if the other parties consent in writing to a later time or the court lengthens the time; a party who never actually saw the papers can ask the court to lengthen the time or set aside the consequences.",
    cues: [
      "I missed the time to respond to the motion to change",
      "they never responded to my motion to change",
      "can the judge change it without them",
      "form 14b to ask for the order",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:served-with-motion-to-change",
        by: "whether the time to respond has run out",
      },
      {
        stage: "family:both:asking-to-change-final-order",
        by: "whether the other party's time to respond has run out",
      },
    ],
    rules: [
      F_R15_14_NO_RESPONSE,
      F_R1_8_4_CONSEQUENCES,
      F_R15_15_REQUEST_ORDER,
      F_R40_4_E_NO_RESPONSE,
      F_R39_5_E_NO_RESPONSE,
      F_R3_7_LATE_REFUSED,
      F_R3_6_CONSENT,
      F_R3_5_COURT_CHANGES_TIME,
      F_R6_20_NOT_SEEN,
    ],
    deadlines: [],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:trial-scheduled",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "Our family case is going to trial — what do I have to file before it starts?",
    title: "Trial scheduled",
    description: "The case has been scheduled for trial and the trial has not started.",
    cues: [
      "trial date",
      "trial record",
      "trial sitting",
      "how do I get a witness to come",
      "summons to witness",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:settlement-conference-scheduled",
        by: "whether the case has been scheduled for trial",
      },
      {
        stage: "family:both:final-order-made",
        by: "whether the trial has happened and a final order been made",
      },
    ],
    rules: [
      F_R17_10_BEFORE_TRIAL,
      F_R23_1_TRIAL_RECORD,
      F_R23_2_RESPONDENT_ADDS,
      F_R23_3_SUMMONS,
      F_R6_4_PERSONAL_ONLY,
      F_R23_3_2_SUMMONS_TIME,
      F_R13_12_UPDATE,
      F_R13_12_2_UPDATE_TIMING,
      F_R13_14_NFP_STATEMENT,
      F_R13_14_0_1_NFP_TIMING,
      F_R20_2_4_SUPPLEMENTARY,
      F_R23_21_AFFIDAVIT_EVIDENCE,
      F_R23_11_1_OPPOSING_PARTY,
    ],
    deadlines: [
      {
        id: "deadline:family:trial-record-20-days",
        what:
          "If you are the applicant, serve and file a trial record with a table of contents and the documents the rule lists",
        countFrom: "the start of the trial or of the trial sitting, whichever is earlier, counting backwards",
        countFromEvent: "trial-date",
        length: { unit: "days", count: 20 },
        direction: "before",
        qualifier: `${CONSENT_OR_COURT} Separately, an offer to settle counts under the costs rule in r. 24 (12) only if it is made at least 7 days before the trial. It must also stay open until the trial starts.`,
        regime: "family-rules",
        rule: F_R23_1_TRIAL_RECORD,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME, F_R24_12_OFFER_COSTS],
      },
      {
        id: "deadline:family:trial-record-respondent-adds-7-days",
        what:
          "If you are the respondent and want to add a document that is not already in the trial record, serve and file it",
        countFrom: "the start of the trial, counting backwards",
        countFromEvent: "trial-date",
        length: { unit: "days", count: 7 },
        direction: "before",
        qualifier: `Only papers of the kinds listed for the trial record can be added. ${CONSENT_OR_COURT}`,
        regime: "family-rules",
        rule: F_R23_2_RESPONDENT_ADDS,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R23_1_TRIAL_RECORD, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
      {
        id: "deadline:family:trial-financial-update-30-days",
        what: "Update your financial information by serving and filing an affidavit or a new financial statement",
        countFrom: "the start of the trial or of the trial sitting, whichever is earlier, counting backwards",
        countFromEvent: "trial-date",
        length: { unit: "days", count: 30 },
        direction: "before",
        qualifier: `This applies only if your last financial statement would be more than 40 days old by then. That is the start of the trial or trial sitting, whichever is earlier. ${CONSENT_OR_COURT}`,
        regime: "family-rules",
        rule: F_R13_12_2_UPDATE_TIMING,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R13_12_UPDATE, F_R13_12_1_WHICH_DOCUMENT, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
      {
        id: "deadline:family:trial-nfp-statement-30-days",
        what:
          "If there is a property claim under Part I of the Family Law Act, serve and file a net family property statement (Form 13B), or an affidavit that your last one has not changed",
        countFrom: "the start of the trial or of the trial sitting, whichever is earlier, counting backwards",
        countFromEvent: "trial-date",
        length: { unit: "days", count: 30 },
        direction: "before",
        qualifier: CONSENT_OR_COURT,
        regime: "family-rules",
        rule: F_R13_14_0_1_NFP_TIMING,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R13_14_NFP_STATEMENT, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
      {
        id: "deadline:family:supplementary-expert-report-30-days",
        what:
          "If your litigation expert has a supplementary report, serve it on all other parties and file it, signed by the expert",
        countFrom: "the start of the trial, counting backwards",
        countFromEvent: "trial-date",
        length: { unit: "days", count: 30 },
        direction: "before",
        qualifier:
          "In a child protection case it is 14 days. The parties cannot change this time by agreement. It can be extended only by an order made at the settlement conference. The trial judge or the judge managing the case can order otherwise.",
        regime: "family-rules",
        rule: F_R20_2_4_SUPPLEMENTARY,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R3_6_CONSENT, F_R3_6_B1_EXPERT, F_R20_2_14_1_LATE],
      },
      {
        id: "deadline:family:summons-to-witness-7-days",
        what:
          "If you need a witness, serve a summons to witness (Form 23) with the witness fee by leaving it with the witness personally",
        countFrom: "the day the witness must be in court or at a questioning, counting backwards",
        countFromEvent: "witness-attendance-date",
        length: { unit: "days", count: 7 },
        direction: "before",
        qualifier: `Someone other than you must serve it, unless the court orders otherwise. The court can also order another way of serving it. The opposing party may have a lawyer. To call that party as a witness, you can instead serve their lawyer with a notice of intention to call them. Do that at least 10 days before the trial starts. ${CONSENT_OR_COURT}`,
        regime: "family-rules",
        rule: F_R23_3_2_SUMMONS_TIME,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R23_3_SUMMONS, F_R6_4_PERSONAL_ONLY, F_R6_4_1_ITEM_3, F_R6_4_2_EXCEPTIONS, F_R23_11_1_OPPOSING_PARTY, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
      {
        id: "deadline:family:trial-affidavit-evidence-30-days",
        what:
          "If the court ordered that evidence be given by affidavit or another way without coming to court, serve that evidence",
        countFrom: "the start of the trial, counting backwards",
        countFromEvent: "trial-date",
        length: { unit: "days", count: 30 },
        direction: "before",
        qualifier: `If you do not, it cannot be used at trial. ${CONSENT_OR_COURT}`,
        regime: "family-rules",
        rule: F_R23_21_AFFIDAVIT_EVIDENCE,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:appealing-temporary-order",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "I disagree with a temporary order — can I appeal it, and how fast?",
    title: "Appealing a temporary order",
    description:
      "The court has made a temporary order and a party wants to appeal it. The route differs between the Ontario Court of Justice and the Superior Court of Justice.",
    cues: [
      "appeal a temporary order",
      "appeal the interim order",
      "I disagree with the temporary custody order",
      "notice of appeal form 38",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:final-order-made",
        by: "whether the order is temporary or final",
      },
      {
        stage: "family:both:bringing-a-motion",
        by: "whether the person wants to appeal the temporary order or ask the same court to change it",
      },
    ],
    rules: [
      F_R38_4_OCJ_APPEALS,
      F_R38_6_TEMPORARY,
      F_R38_5_START_APPEAL,
      F_R38_7_CYFSA_TEMPORARY,
      F_R38_32_NOT_FILED,
      S_CJA_19_1_DIVISIONAL,
      F_R38_1_LEAVE,
      R_RCP_62_02_1_LEAVE_NEEDED,
      R_RCP_62_02_3_LEAVE_NOTICE,
      R_RCP_61_03_1_3_LEAVE_TIMES,
      F_R14_1_MOTION,
      F_R38_33_SUPPORT_NOT_STAYED,
      F_R38_34_OTHER_STAYED,
    ],
    deadlines: [
      {
        id: "deadline:family:appeal-temporary-order-ocj-7-days",
        what:
          "If you want to appeal a temporary order of the Ontario Court of Justice to the Superior Court of Justice, serve a notice of appeal (Form 38). Serve every other party affected and the clerk of the court where the order was made",
        countFrom: "the date of the temporary order",
        countFromEvent: "order-made",
        length: { unit: "days", count: 7 },
        qualifier:
          "File it within 10 days after serving it. If you do not, the appeal is treated as withdrawn unless the court orders otherwise. In a child protection case, the time to serve is 30 days. A temporary order made by a judge of the Superior Court of Justice is different. An appeal to the Divisional Court then needs leave. Under the civil rules, serve a notice of motion for leave to appeal (Form 61A) within 15 days after the order. File it with proof of service within 5 days after serving it. The court can give more time.",
        regime: "family-rules",
        rule: F_R38_6_TEMPORARY,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [
          F_R38_5_START_APPEAL,
          F_R38_32_NOT_FILED,
          F_R38_7_CYFSA_TEMPORARY,
          S_CJA_19_1_DIVISIONAL,
          F_R38_1_LEAVE,
          R_RCP_62_02_1_LEAVE_NEEDED,
          R_RCP_62_02_3_LEAVE_NOTICE,
          R_RCP_61_03_1_3_LEAVE_TIMES,
          F_R3_5_COURT_CHANGES_TIME,
        ],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:final-order-made",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "The judge made a final order — can I appeal it or get it changed?",
    title: "Final order made",
    description:
      "The court has made a final order in the case, after a trial, a hearing or an uncontested process.",
    cues: [
      "the judge made a final order",
      "I disagree with the decision",
      "can I appeal",
      "the order has a mistake in it",
      "when is my divorce final",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:trial-scheduled",
        by: "whether the trial has happened and a final order been made",
      },
      {
        stage: "family:both:asking-to-change-final-order",
        by: "whether the person wants the order reviewed now or changed later because things have changed",
      },
      {
        stage: "family:both:support-order-not-paid",
        by: "whether the problem is the order itself or that it is not being paid",
      },
      {
        stage: "family:both:appealing-temporary-order",
        by: "whether the order is final or temporary",
      },
    ],
    rules: [
      F_R38_4_OCJ_APPEALS,
      F_R38_5_START_APPEAL,
      F_R38_32_NOT_FILED,
      F_R38_33_SUPPORT_NOT_STAYED,
      F_R38_34_OTHER_STAYED,
      F_R38_1_HIGHER_COURTS,
      C.R_61_04_APPEAL_30_DAYS,
      C.R_61_04_FILE_10_DAYS,
      C.R_63_01_STAY,
      S_CJA_19_1_DIVISIONAL,
      S_CJA_6_1_B_COURT_OF_APPEAL,
      S_DIVORCE_12_1_EFFECTIVE,
      S_DIVORCE_21_2_NO_APPEAL_AFTER_EFFECT,
      S_DIVORCE_21_3_THIRTY_DAYS,
      S_DIVORCE_21_4_EXTENSION,
      F_R25_19_CHANGE_ORDER,
      F_R24_19_COSTS_SUBMISSIONS,
      F_R25_8_NO_RESPONSE,
      S_CJA_133_LEAVE,
    ],
    /*
     * One deadline, whose qualifier carries the Superior Court route. The
     * Superior Court appeal runs under Rules of Civil Procedure r. 61.04 by way
     * of r. 38 (1), and a family stage cannot carry a civil-rules deadline; the
     * Divorce Act s. 21 (3) limit is federal and the Legislation Act does not
     * count it. Both are stated in the qualifier, with their provisions in
     * `exceptions`, so a Superior Court reader still sees the 30 days.
     */
    deadlines: [
      {
        id: "deadline:family:appeal-final-order-30-days",
        what:
          "If you want to appeal a final order of the Ontario Court of Justice to the Superior Court of Justice, serve a notice of appeal (Form 38). Serve every other party affected and the clerk where the order was made",
        countFrom: "the date of the order or decision being appealed",
        countFromEvent: "order-made",
        length: { unit: "days", count: 30 },
        qualifier:
          "File the notice within 10 days after serving it. If you do not, the appeal is treated as withdrawn unless the court orders otherwise. A final order of the Superior Court of Justice or its Family Court is different. The appeal goes to the Divisional Court or the Court of Appeal, depending on the order. Serve the notice of appeal within 30 days after the order. Serve the appellant's certificate respecting evidence (Form 61C) with it. File the notice within 10 days after serving it. Some appeals need leave of the court the appeal goes to. That includes an appeal from an order made on consent, and an appeal only about costs. For a Superior Court order going to the Divisional Court, serve a notice of motion for leave within 15 days after the order. File it within 5 days after serving it. An order under the Divorce Act cannot be appealed more than 30 days after it was made. The appeal court can extend that time on special grounds. A divorce itself cannot be appealed once it takes effect. That is usually the 31st day after the judgment. On an appeal to the Superior Court of Justice, serving the notice does not stop a support order from being enforced. The court can give more time.",
        regime: "family-rules",
        rule: F_R38_5_START_APPEAL,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [
          F_R38_4_OCJ_APPEALS,
          F_R38_32_NOT_FILED,
          F_R38_1_HIGHER_COURTS,
          C.R_61_04_APPEAL_30_DAYS,
          C.R_61_04_FILE_10_DAYS,
          C.R_61_05_CERTIFICATE,
          S_CJA_133_LEAVE,
          R_RCP_62_02_1_LEAVE_NEEDED,
          R_RCP_62_02_3_LEAVE_NOTICE,
          R_RCP_61_03_1_3_LEAVE_TIMES,
          S_CJA_19_1_DIVISIONAL,
          S_CJA_6_1_B_COURT_OF_APPEAL,
          S_DIVORCE_21_3_THIRTY_DAYS,
          S_DIVORCE_21_4_EXTENSION,
          S_DIVORCE_21_2_NO_APPEAL_AFTER_EFFECT,
          S_DIVORCE_12_1_EFFECTIVE,
          F_R38_33_SUPPORT_NOT_STAYED,
          F_R3_5_COURT_CHANGES_TIME,
        ],
      },
      {
        id: "deadline:family:draft-order-approval-10-days",
        what:
          "If another party serves you a draft of the order for approval, serve your approval or a notice disputing approval (Form 25E)",
        qualifier:
          "If you serve neither in that time, the order can be signed without your approval. If you dispute it, serve Form 25E with a copy of the order redrafted as you propose. Also serve notice of the time the clerk sets to settle it by telephone. Serve these on the party who served the draft, and on every other party it was served on. The party the order favours prepares the draft and serves it for approval. Another party may prepare it if that party has no licensed representative. Another party may also prepare it if that party does not do so within 10 days. Where no party has a licensed representative, the clerk prepares the order.",
        countFrom: "the day the draft order was served on you for approval",
        countFromEvent: "draft-order-served",
        length: { unit: "days", count: 10 },
        regime: "family-rules",
        rule: F_R25_8_NO_RESPONSE,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R25_2_PREPARE_DRAFT, F_R25_3_OTHER_PREPARES, F_R25_4_DRAFT_APPROVAL, F_R25_5_DISPUTE, F_R25_5_FULL, F_R25_11_A_CLERK],
      },
      {
        id: "deadline:family:costs-submissions-15-days",
        what: "If the court asks for written submissions on costs, serve and file yours",
        qualifier:
          "Any reply submission is due within 30 days after the court asked. A submission can be no longer than three pages. For the costs of a trial, the limit is five pages. These times and limits apply unless the court orders otherwise.",
        countFrom: "the day the court required the written submissions",
        countFromEvent: "costs-submissions-requested",
        length: { unit: "days", count: 15 },
        regime: "family-rules",
        rule: F_R24_19_COSTS_SUBMISSIONS,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R24_19_COSTS_SUBMISSIONS, F_R3_3_CLOSED],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:support-order-not-paid",
    pathway: "family",
    side: "both",
    wentWrong: true,
    userQuestion: "There is a support order but the payments are not being made — who enforces it?",
    title: "Support or other order not being obeyed",
    description:
      "A support order or other family order has been made and is not being paid or obeyed.",
    cues: [
      "my ex is not paying child support",
      "Family Responsibility Office",
      "FRO is not collecting",
      "support arrears",
      "garnish wages for support",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:final-order-made",
        by: "whether the problem is that the order is not being paid or obeyed, rather than the order itself",
      },
      {
        stage: "family:both:asking-to-change-final-order",
        by: "whether the person wants the order enforced or wants its terms changed",
      },
    ],
    rules: [
      S_FRSAEA_5_1_DIRECTOR_DUTY,
      S_FRSAEA_12_1_CLERK_FILES,
      F_R26_3_PAYMENT_ORDERS,
      F_R26_4_OTHER_ORDERS,
      F_R26_10_DIRECTOR,
    ],
    deadlines: [],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:case-in-wrong-municipality",
    pathway: "family",
    side: "both",
    wentWrong: true,
    userQuestion: "The case was started in the wrong city — or it would be easier somewhere else. Can it be moved?",
    title: "Case started in the wrong municipality, or better heard elsewhere",
    description:
      "The case appears to have been started somewhere other than where the rules require, or a party says it would be much more convenient elsewhere.",
    cues: [
      "filed in the wrong city",
      "the clerk would not accept my application",
      "the children live in another city now",
      "move the case to where I live",
      "transfer the file",
    ],
    distinguishedFrom: [
      {
        stage: "family:before-filing:deciding-where-to-start",
        by: "whether the case has already been started or filed somewhere",
      },
      {
        stage: "family:applicant:application-filed-not-served",
        by: "whether the problem is where the case was filed rather than getting it served",
      },
    ],
    rules: [F_R5_1_WHERE, F_R5_2_DANGER, F_R5_3_CLERK_REFUSES, F_R5_8_TRANSFER, F_R15_4_WHERE, S_CJA_21_8_FAMILY_COURT],
    deadlines: [],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:notice-of-approaching-dismissal",
    pathway: "family",
    side: "both",
    wentWrong: true,
    userQuestion: "I got a notice that my family case will be dismissed — how do I stop that?",
    title: "Served with a notice of approaching dismissal",
    description:
      "The clerk has served a notice of approaching dismissal (Form 39), because the case was not settled, withdrawn, or scheduled or adjourned for trial before the 365th day after it started, or because a conference set for after that day did not go ahead. The case will be dismissed without further notice unless a party takes one of the listed steps in time.",
    cues: [
      "notice of approaching dismissal",
      "form 39",
      "my case will be dismissed",
      "it has been a year since we started",
      "the clerk dismissed my case",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:missed-or-unconfirmed-conference",
        by: "whether a notice of approaching dismissal has actually been served",
      },
      {
        stage: "family:both:case-conference-scheduled",
        by: "whether a conference is simply coming up or the case is under a notice of approaching dismissal",
      },
    ],
    rules: DISMISSAL_RULES,
    deadlines: [
      {
        id: "deadline:family:approaching-dismissal-60-days",
        what:
          "Take one of the five steps below, or the case is dismissed without further notice",
        qualifier:
          `${DISMISSAL_STEPS} Only one party needs to take a step. The parties cannot extend this time by agreement. Only a court order can. If a conference arranged as step five does not go ahead, and a judge did not adjourn it, the case is dismissed without further notice. If the clerk dismisses the case, a judge can set aside the dismissal order on a motion. ${DISMISSAL_EXCLUSIONS} If the notice came by mail, it counts as served on the fifth day after mailing. If it came by email, it counts as served on the date in the email, or the next day if sent after 4 p.m. To be safe, count from the day it was mailed or emailed.`,
        countFrom: "the day the notice of approaching dismissal was served",
        countFromEvent: "notice-of-approaching-dismissal-served",
        length: { unit: "days", count: 60 },
        regime: "family-rules",
        rule: F_R40_6_DISMISSAL,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [
          F_R39_12_DISMISSAL,
          F_R41_6_DISMISSAL,
          F_R39_3_NO_CONSENT,
          F_R40_3_NO_CONSENT,
          F_R41_3_NO_CONSENT,
          F_R39_12_1_SECOND_MISS,
          F_R40_6_1_SECOND_MISS,
          F_R41_6_1_SECOND_MISS,
          F_R39_14_1_SET_ASIDE,
          F_R40_9_SET_ASIDE,
          F_R41_9_SET_ASIDE,
          F_R39_2_EXCLUDED,
          F_R40_2_EXCLUDED,
          F_R41_2_EXCLUDED,
          F_R6_7_MAIL,
          F_R6_11_EMAIL,
        ],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:served-with-notice-of-default-hearing",
    pathway: "family",
    side: "both",
    wentWrong: true,
    userQuestion: "A notice of default hearing has been issued about unpaid support — what do I have to do?",
    title: "Notice of default hearing issued on a support order",
    description:
      "A support order is in default and a notice of default hearing has been issued and served on the payor. The order is being enforced either by the recipient or by the Director of the Family Responsibility Office; when the Director enforces, the rules on enforcement by the recipient apply to the Director. The payor must file a financial statement and appear to explain the default. The enforcing party may have to update the statement of money owed.",
    cues: [
      "notice of default hearing",
      "default dispute form 30b",
      "FRO is taking me to court for arrears",
      "statement of money owed",
      "they say I owe support arrears",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:support-order-not-paid",
        by: "whether a notice of default hearing has been issued, or the person is still asking how the order gets enforced",
      },
      {
        stage: "family:both:asking-to-change-final-order",
        by: "whether the person is dealing with enforcement of the order or asking to change its terms",
      },
    ],
    rules: [
      F_R30_2_SERVICE,
      F_R6_4_IMPRISONMENT,
      F_R30_3_PAYOR_DISPUTE,
      F_R26_10_DIRECTOR,
      S_FRSAEA_41_1_DIRECTOR,
      S_FRSAEA_41_1_2_APPEAR,
      F_R30_6_PRESUMED_CORRECT,
      F_R30_4_RECIPIENT_UPDATE,
      F_R30_5_DIRECTOR_UPDATE,
      F_R30_7_TO_HEARING_DATE,
      S_FRSAEA_41_7_ARREST,
      S_FRSAEA_41_9_PRESUMPTIONS,
      S_FRSAEA_41_10_POWERS,
      F_R30_8_CONDITIONAL_IMPRISONMENT,
      F_R26_3_PAYMENT_ORDERS,
    ],
    deadlines: [
      {
        id: "deadline:family:default-dispute-10-days",
        what:
          "If you are the payor, serve a financial statement and a default dispute (Form 30B) on the party enforcing the order, and file them",
        qualifier:
          "The party enforcing is the recipient, or the Director of the Family Responsibility Office. Use Form 13 for the financial statement. If the Director is enforcing, use the form the regulations require, as the notice will say. Also give the Director the proof of income the notice asks for. You are presumed to agree that the statement of money owed is correct. That changes only if you file a default dispute saying it is wrong and giving detailed reasons. You must also come to court to explain the default. If you do not file the financial statement or do not come, the court can issue a warrant for your arrest. At the hearing, you are presumed able to pay unless you show otherwise. Unless the court finds you cannot pay for valid reasons, it can order payments, security, or jail for up to 180 days. The court can decide and enforce the amount owing up to the hearing date.",
        countFrom: "the day you were served with the notice of default hearing",
        countFromEvent: "served-with-notice-of-default-hearing",
        length: { unit: "days", count: 10 },
        regime: "family-rules",
        rule: F_R30_3_PAYOR_DISPUTE,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [
          F_R26_10_DIRECTOR,
          S_FRSAEA_41_1_DIRECTOR,
          S_FRSAEA_41_1_2_APPEAR,
          S_FRSAEA_41_6_FORMS,
          F_R30_6_PRESUMED_CORRECT,
          S_FRSAEA_41_7_ARREST,
          S_FRSAEA_41_9_PRESUMPTIONS,
          S_FRSAEA_41_10_POWERS,
          F_R30_7_TO_HEARING_DATE,
          F_R3_3_CLOSED,
        ],
      },
      /*
       * Count 0 ON PURPOSE (fifth review asked for {7 days, before}). r. 30 (4)
       * sets a WINDOW, "not more than seven days before" the hearing: the
       * earliest day, not the last. The deadline type has no window shape, and
       * `direction: "before"` renders as "Do this at least 7 days before",
       * which is the opposite of the rule. Count 0 renders only the `what`,
       * which states the window in words. Nothing computes from it: family-rules
       * deadlines are never computed (deadlineEngine.ts throws for the regime)
       * and computedDeadline.ts skips count 0.
       */
      {
        id: "deadline:family:default-hearing-new-statement-of-money-owed",
        what:
          "If you are the recipient enforcing the order, serve and file a new statement of money owed no more than 7 days before the default hearing. That means within the last 7 days before it, not earlier",
        qualifier:
          "If the Director of the Family Responsibility Office is enforcing, the Director must do this only in two cases. One is if it asks the court to enforce more than the notice shows. The other is if the court directs it.",
        countFrom: "the date of the default hearing",
        countFromEvent: "default-hearing-date",
        length: { unit: "days", count: 0 },
        regime: "family-rules",
        rule: F_R30_4_RECIPIENT_UPDATE,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R30_5_DIRECTOR_UPDATE],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:responding-to-summary-judgment",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "The other side wants a final order without a trial — how do I respond to a summary judgment motion?",
    title: "Served with a motion for summary judgment",
    description:
      "A party has made a motion for summary judgment, asking for a final order without a trial on all or part of a claim or defence, and the motion has not been heard.",
    cues: [
      "summary judgment",
      "they want an order without a trial",
      "motion for a final order without trial",
      "no genuine issue for trial",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:responding-to-a-motion",
        by: "whether the motion asks for a final order without a trial or for a temporary order",
      },
      {
        stage: "family:both:trial-scheduled",
        by: "whether the case is going to trial or a party is asking to decide it without one",
      },
    ],
    rules: [
      F_R16_1_SUMMARY_JUDGMENT,
      F_R16_4_1_RESPONDING_EVIDENCE,
      F_R16_5_PERSONAL_KNOWLEDGE,
      F_R16_6_NO_GENUINE_ISSUE,
      F_R14_6_EXEMPT,
      F_R14_11_3_RESPONSE,
    ],
    deadlines: [
      {
        id: "deadline:family:summary-judgment-response-4-days",
        what:
          "Serve and file your response. Include an affidavit or other evidence with specific facts showing there is a genuine issue for trial",
        qualifier: `You cannot rely only on allegations or denials. If your evidence does not come from someone who knows the facts personally, the court may draw conclusions against you. If there is no genuine issue that needs a trial, the court makes a final order. Your last financial statement may be more than 30 days old when the motion is heard. If so, update it by this same day with an affidavit or a new statement. ${CONSENT_OR_COURT}`,
        countFrom: "the date the motion will be heard, counting backwards",
        countFromEvent: "motion-hearing-date",
        length: { unit: "days", count: 4 },
        direction: "before",
        regime: "family-rules",
        rule: F_R14_11_3_RESPONSE,
        computation: F_R3_2_SHORT,
        consequence: "changes-what-happens-next",
        exceptions: [
          F_R3_2_SHORT,
          F_R16_4_1_RESPONDING_EVIDENCE,
          F_R16_5_PERSONAL_KNOWLEDGE,
          F_R16_6_NO_GENUINE_ISSUE,
          F_R13_12_UPDATE,
          F_R13_12_1_WHICH_DOCUMENT,
          F_R13_12_2_UPDATE_TIMING,
          F_R3_6_CONSENT,
          F_R3_5_COURT_CHANGES_TIME,
        ],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:applicant:uncontested-or-joint-divorce",
    pathway: "family",
    side: "applicant",
    wentWrong: false,
    userQuestion: "We both want the divorce, or my spouse is not contesting it — how does a divorce go through on paper?",
    title: "Uncontested or joint divorce",
    description:
      "A divorce is going ahead without a contest: either the spouses filed a joint application, or one spouse applied and the other filed no answer or withdrew it. The divorce is dealt with on affidavit evidence and a draft order. Where the divorce is based on separation, the spouses must have lived separate and apart for at least one year before the divorce is decided, and been living apart when the case started; the Act also allows a divorce for adultery or cruelty. The court must be satisfied that reasonable arrangements have been made for the support of any children of the marriage, or it holds back the divorce until they are. Once the divorce takes effect, either party can ask the clerk for a divorce certificate (Form 36B).",
    cues: [
      "joint divorce",
      "uncontested divorce",
      "simple divorce",
      "form 36 affidavit",
      "my spouse is not contesting the divorce",
    ],
    distinguishedFrom: [
      {
        stage: "family:applicant:no-answer-filed",
        by: "whether the only claim being dealt with without an answer is the divorce itself, or other claims as well",
      },
      {
        stage: "family:both:final-order-made",
        by: "whether the divorce has been granted already",
      },
    ],
    // No deadline: rule 36 sets what must be filed, not when. The time the
    // divorce takes effect is Divorce Act s. 12 (1).
    rules: [
      F_R36_1_START,
      F_R36_2_JOINT,
      F_R36_4_CERTIFICATES,
      F_R36_5_AFFIDAVIT,
      F_R36_5_1_WHO_FILES,
      F_R36_6_DRAFT_ORDER,
      F_R36_7_JUDGE,
      F_R17_2_UNDEFENDED,
      S_DIVORCE_3_1_RESIDENCE,
      S_DIVORCE_8_2_BREAKDOWN,
      S_DIVORCE_11_1_B_CHILD_SUPPORT,
      S_DIVORCE_12_1_EFFECTIVE,
      F_R36_8_CERTIFICATE,
    ],
    deadlines: [],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:served-with-contempt-motion",
    pathway: "family",
    side: "both",
    wentWrong: true,
    userQuestion: "I was served with a contempt motion for not following an order — what could happen?",
    title: "Served with a contempt motion",
    description:
      "Another party has made a contempt motion to enforce an order that is not a payment order, and it has been served with a supporting affidavit. Under the motion rules, the party responding serves all their evidence in response, and a contempt motion does not have to wait for a conference. The court can issue a warrant to bring the person to court if their attendance is necessary in the interest of justice and they are not likely to attend voluntarily. If the court finds contempt, it can order imprisonment, a fine, a penalty, costs or other terms.",
    cues: [
      "contempt motion",
      "form 31",
      "they say I am in contempt",
      "I did not follow the parenting order",
      "could I go to jail for not following the order",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:responding-to-a-motion",
        by: "whether the motion is a contempt motion or an ordinary motion for a temporary order",
      },
      {
        stage: "family:both:served-with-notice-of-default-hearing",
        by: "whether the order being enforced is a support order at a default hearing or another order by contempt",
      },
    ],
    // No deadline. r. 14 (11.3)'s 4-day response is for a motion made using a
    // notice of motion (Form 14); a contempt motion uses Form 31 (r. 31 (2)),
    // and the saved rules set no separate response time for it.
    rules: [F_R31_1_CONTEMPT, F_R31_2_SERVICE, F_R31_3_AFFIDAVIT, F_R6_4_CONTEMPT, F_R31_4_WARRANT, F_R31_5_ORDERS, F_R14_6_EXEMPT, F_R14_20_EVIDENCE, F_R14_11_3_RESPONSE],
    // Count 0 ON PURPOSE: information only. The saved rules set no response time
    // for a Form 31 motion, and r. 14 (11.3) is worded for a Form 14 notice of
    // motion, so no number is asserted.
    deadlines: [
      {
        id: "deadline:family:contempt-response-information",
        what:
          "Rule 31 sets no separate time to respond to a notice of contempt motion (Form 31). The general rule for responding to a motion sets 4 days before the motion date. But that rule is worded for a notice of motion in Form 14, not Form 31",
        qualifier:
          "Under the motion rules, the party responding serves all their evidence in response. The safe course is to serve and file your evidence at least 4 days before the motion date.",
        countFrom: "the date the motion will be heard",
        countFromEvent: "motion-hearing-date",
        length: { unit: "days", count: 0 },
        regime: "family-rules",
        rule: F_R31_2_SERVICE,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R14_11_3_RESPONSE, F_R14_20_EVIDENCE],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:document-disclosure-requested",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "The other side asked me for a list of my documents — what do I have to give them, and by when?",
    title: "Asked for an affidavit listing documents",
    description:
      "Another party has asked for an affidavit listing every document that is relevant to an issue in the case and in this party's control or available on request.",
    cues: [
      "affidavit of documents",
      "they want a list of my documents",
      "request for documents",
      "document disclosure",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:financial-disclosure-missing",
        by: "whether the request is for an affidavit listing documents or for financial disclosure under rule 13",
      },
    ],
    rules: [F_R19_1_AFFIDAVIT_OF_DOCUMENTS, F_R19_1_1_EXCEPTIONS, F_R19_2_ACCESS],
    deadlines: [
      {
        id: "deadline:family:affidavit-of-documents-10-days",
        what:
          "Give the other party an affidavit listing every document that is relevant to any issue in the case. List those in your control, or that you can get on request",
        qualifier:
          "This does not cover the financial papers rule 13 requires. Those have their own rules. The other party can then ask to see a listed document, unless it is protected by legal privilege. They can get a copy at their own cost. The parties can agree in writing to change this time. The court can also change it.",
        countFrom: "the day of the other party's request",
        countFromEvent: "documents-requested",
        length: { unit: "days", count: 10 },
        regime: "family-rules",
        rule: F_R19_1_AFFIDAVIT_OF_DOCUMENTS,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R19_1_1_EXCEPTIONS, F_R19_2_ACCESS, F_R3_3_CLOSED, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:offer-to-settle",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "We got an offer to settle, or want to make one — how long does it stay open?",
    title: "Making or receiving an offer to settle",
    description:
      "A party has made, or is thinking of making, a written offer to settle one or more claims. The rules set how an offer is made, withdrawn and accepted. No fixed time limits acceptance, but the costs rule in r. 24 (12) depends on when an offer is made and whether it stays open.",
    cues: [
      "offer to settle",
      "they sent me an offer",
      "can I still accept the offer",
      "counter-offer",
      "withdraw my offer",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:settlement-conference-scheduled",
        by: "whether the person is dealing with a written offer or getting ready for a settlement conference",
      },
    ],
    rules: [F_R18_3_TO_10_OFFERS, F_R18_4_SIGNATURES, F_R18_8_CONFIDENTIAL, F_R18_12_1_COSTS, F_R24_12_OFFER_COSTS, F_R17_19_AGREEMENT],
    deadlines: [
      {
        id: "deadline:family:offer-acceptance-window",
        what:
          "To accept an offer, serve an acceptance on the party who made it. Do it before the offer is withdrawn or ends, and before the court starts to give a decision on the claim it covers",
        qualifier:
          "An offer not accepted within the time it sets is treated as withdrawn. The party who made it can withdraw it at any time before it is accepted, by serving a notice of withdrawal. It can still be accepted after it was rejected, or after a counter-offer. The party making it must sign it personally. Their licensed representative, if they have one, must sign it too. Making, withdrawing, accepting or rejecting an offer can affect costs. The costs rule in r. 24 (12) has conditions. An offer about a motion must be made at least 1 day before the motion date. An offer about a trial or other hearing must be made at least 7 days before it. The offer must not end or be withdrawn before the hearing starts. It must not be accepted. The party who made it must get an order as good as or better than the offer.",
        countFrom: "the day the offer was served",
        countFromEvent: "offer-served",
        length: { unit: "days", count: 0 },
        regime: "family-rules",
        rule: F_R18_3_TO_10_OFFERS,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R18_4_SIGNATURES, F_R18_12_1_COSTS, F_R24_12_OFFER_COSTS],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:respondent:served-with-amended-application",
    pathway: "family",
    side: "respondent",
    wentWrong: false,
    userQuestion: "The applicant changed their application after I answered — do I have to answer again?",
    title: "Served with an amended application",
    description:
      "The applicant has amended the application and served the amended application on the respondent. The respondent may amend the answer without the court's permission within a set time.",
    cues: [
      "amended application",
      "they changed their application",
      "do I need to amend my answer",
      "new claims added to the application",
    ],
    distinguishedFrom: [
      {
        stage: "family:respondent:served-time-to-answer-running",
        by: "whether the papers are the first application or an amended one",
      },
      {
        stage: "family:respondent:answer-filed",
        by: "whether the application has since been amended",
      },
    ],
    rules: [F_R11_1_AMENDED_APPLICATION, F_R11_2_AMENDED_ANSWER, F_R11_2_1_CHILD_PROTECTION, F_R11_3_PERMISSION, F_R11_3_1_PARENTING],
    deadlines: [
      {
        id: "deadline:family:amended-answer-14-days",
        what:
          "If you want to amend your answer without the court's permission, serve and file an amended answer",
        qualifier:
          "In a child protection case, if something significant about the child has changed, the time is 30 days. It is 60 days if you were served outside Canada and the United States. After the time runs out, you can amend your answer only in two ways. You can file the consent of all parties. Or you can get the court's permission on a motion. Your amended answer may add a claim about decision-making responsibility, parenting time or contact that was not in your first answer. If so, include the papers rule 35.1 requires. The amendment may add a claim for support or property against you. If so, your financial statement is due in the time for answering it. The parties can agree in writing to change this time. The court can also change it.",
        countFrom: "the day you were served with the amended application",
        countFromEvent: "served-with-amended-application",
        length: { unit: "days", count: 14 },
        regime: "family-rules",
        rule: F_R11_2_AMENDED_ANSWER,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R11_2_1_CHILD_PROTECTION, F_R11_3_PERMISSION, F_R11_3_1_PARENTING, F_R13_1_FINANCIAL_STATEMENT, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:served-with-notice-of-appeal",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "The other side is appealing an Ontario Court of Justice order to the Superior Court — what do I have to do?",
    title: "Served with a notice of appeal to the Superior Court of Justice",
    description:
      "Another party has started an appeal from an order of the Ontario Court of Justice to the Superior Court of Justice under rule 38, and has served the notice of appeal. Appeals to the Divisional Court or the Court of Appeal follow the Rules of Civil Procedure instead.",
    cues: [
      "served with a notice of appeal",
      "my ex is appealing the order",
      "form 38",
      "respondent's factum",
      "appeal to the superior court",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:final-order-made",
        by: "whether the person wants to appeal or has been served with the other side's appeal",
      },
      {
        stage: "family:both:appealing-temporary-order",
        by: "whether the person is starting an appeal or responding to one",
      },
    ],
    rules: [
      F_R38_4_OCJ_APPEALS,
      F_R38_9_CROSS_APPEAL,
      F_R38_13_TRANSCRIPT_CONSULT,
      F_R38_19_RESPONDENT_FACTUM,
      F_R38_21_TIMELINES,
      F_R38_33_SUPPORT_NOT_STAYED,
      F_R38_34_OTHER_STAYED,
      F_R38_1_HIGHER_COURTS,
    ],
    deadlines: [
      {
        id: "deadline:family:respondent-appeal-record-factum-60-days",
        what:
          "Serve your respondent's factum on the appellant and anyone else entitled to be heard, and file it. Do the same with a respondent's appeal record if one is needed",
        qualifier:
          "The appellant decides whether a transcript is needed after talking with you. You may also want to appeal the same order. If so, the same rule applies, and the two appeals are heard together. Your own notice of appeal must be served within 30 days after the date of the order. For a temporary order, it is 7 days. Count from the order, not from when you were served. Serving a notice of appeal does not stop a support order from being enforced. It does hold back other payment orders until the appeal is decided. The appellant may miss a step. It may not file proof that a needed transcript was ordered within 30 days after filing the notice. Or it may not serve and file the appeal record and factum on time. You can then file a motion form (Form 14B) to have the appeal dismissed for delay. Other times apply in a child protection case. The parties can agree in writing to change this time. The court can also change it.",
        countFrom: "the day the appellant's appeal record and factum were served",
        countFromEvent: "appellant-record-served",
        length: { unit: "days", count: 60 },
        regime: "family-rules",
        rule: F_R38_21_TIMELINES,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [
          F_R38_19_RESPONDENT_FACTUM,
          F_R38_12_TRANSCRIPT,
          F_R38_30_DISMISS_FOR_DELAY,
          F_R38_13_TRANSCRIPT_CONSULT,
          F_R38_9_CROSS_APPEAL,
          F_R38_5_START_APPEAL,
          F_R38_6_TEMPORARY,
          F_R38_33_SUPPORT_NOT_STAYED,
          F_R38_34_OTHER_STAYED,
          F_R3_6_CONSENT,
          F_R3_5_COURT_CHANGES_TIME,
        ],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:served-with-licence-suspension-notice",
    pathway: "family",
    side: "both",
    wentWrong: true,
    userQuestion: "FRO says my driver's licence may be suspended for unpaid support — what can I do, and how long do I have?",
    title: "Support payor served with a first notice of driver's licence suspension",
    description:
      "A support order filed with the Family Responsibility Office is in default, and the Director has served the payor with a first notice that the payor's driver's licence may be suspended unless, within 30 days, the payor makes a satisfactory arrangement, obtains and files a court order to refrain, or pays all arrears.",
    cues: [
      "FRO licence suspension",
      "driver's licence will be suspended",
      "first notice from the Family Responsibility Office",
      "order to refrain",
      "suspend my licence for support arrears",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:served-with-notice-of-default-hearing",
        by: "whether the payor was served with a first notice of licence suspension or with a notice of default hearing",
      },
      {
        stage: "family:both:asking-to-change-final-order",
        by: "whether the payor faces a licence suspension notice now, or is only asking to change support",
      },
    ],
    rules: [
      S_FRSAEA_34_FIRST_NOTICE,
      S_FRSAEA_35_1_REFRAIN,
      S_FRSAEA_35_4_EXCEPTIONS,
      S_FRSAEA_35_5_WHICH_COURT,
      S_FRSAEA_35_7_FINANCIAL,
      F_R13_5_1_REFRAIN_STATEMENT,
      F_R14_6_D_REFRAIN,
      S_FRSAEA_35_10_NOT_AFTER,
      S_FRSAEA_35_11_ONLY_WITHIN,
      S_FRSAEA_35_12_NO_EXTENSION,
      S_FRSAEA_35_13_CLOSED_EARLIER,
    ],
    /*
     * Statutory, so counted under the Legislation Act. Deliberately NOT marked
     * "bars-the-claim": that marking adds the Legislation Act weekend paragraph,
     * which says a time limit moves LATER when it ends on a closed day. s. 35 (13)
     * moves this one EARLIER for the court order, and s. 35 (12) says it cannot
     * be extended. The qualifier says both plainly. The event is not asked at
     * intake, so no date is computed from it.
     */
    deadlines: [
      {
        id: "deadline:family:licence-suspension-30-days",
        what:
          "To stop the suspension, do one of three things. Make an arrangement the Director accepts for paying the support and the arrears. Or get a court order to refrain and file it in the Director's office. Or pay all the arrears",
        qualifier:
          "For a court order to refrain, these 30 days cannot be extended. A court cannot make an order to refrain after the 30 days. It can make only one for each first notice. If the 30th day is a day court offices are closed, the time for the order does NOT move to the next open day. The order to refrain must be made by the last day court offices are open BEFORE the 30th day. To ask for an order to refrain, bring a motion to change the support order. Also bring a motion for the order to refrain, on notice to the Director. Bring both in the court that can change the support order. You can ask for the order to refrain before you bring the motion to change. To do that, you or your lawyer must give an undertaking (a formal promise) to get a court date for the motion to change. That date must be got within 20 days after the order. You do not need a motion to change if you have appealed the support order and the appeal is not decided. Serve and file a financial statement and proof of income with the notice of motion. If you cannot file proof of income before the motion is heard, the court can still make the order. You or your lawyer must then undertake to serve and file it within 20 days. This motion does not have to wait for a case conference. A motion must normally be served at least 6 days before it is heard, not counting weekends. The order must be made within the 30 days. So start right away.",
        countFrom: "the day the first notice was served",
        countFromEvent: "licence-suspension-first-notice-served",
        length: { unit: "days", count: 30 },
        regime: "legislation-act",
        rule: S_FRSAEA_34_FIRST_NOTICE,
        computation: C.S_LEGISLATION_89_3_BETWEEN,
        consequence: "changes-what-happens-next",
        exceptions: [
          S_FRSAEA_35_12_NO_EXTENSION,
          S_FRSAEA_35_10_NOT_AFTER,
          S_FRSAEA_35_11_ONLY_WITHIN,
          S_FRSAEA_35_13_CLOSED_EARLIER,
          S_FRSAEA_35_1_REFRAIN,
          S_FRSAEA_35_4_EXCEPTIONS,
          S_FRSAEA_35_5_WHICH_COURT,
          S_FRSAEA_35_7_FINANCIAL,
          S_FRSAEA_35_8_UNDERTAKING,
          F_R13_5_1_REFRAIN_STATEMENT,
          F_R14_6_D_REFRAIN,
          F_R14_11_SERVE_FILE,
          F_R3_2_SHORT,
        ],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:served-with-notice-of-garnishment",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "I was served with a notice of garnishment for family support — can I dispute it?",
    title: "Served with a notice of garnishment",
    description:
      "A payment order is being enforced by garnishment. A notice of garnishment (or a statutory declaration of indexed support) has been served on the payor or a garnishee, or a co-owner of a garnished joint debt has been sent a notice to co-owner of debt (Form 29C).",
    cues: [
      "notice of garnishment",
      "my wages are being garnished for support",
      "my bank account was garnished",
      "garnishment dispute",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:served-with-notice-of-default-hearing",
        by: "whether the enforcement step served is a notice of garnishment or a notice of default hearing",
      },
      {
        stage: "family:both:support-order-not-paid",
        by: "whether the person has been served with a garnishment or is the one trying to get support paid",
      },
    ],
    rules: [F_R26_3_PAYMENT_ORDERS, F_R29_16_DISPUTE, F_R29_17_HEARING, F_R29_12_PAID_OUT, F_R29_13_NOT_PAID_OUT, F_R29_8_JOINT_DEBT, F_R29_9_HELD_30_DAYS],
    deadlines: [
      {
        id: "deadline:family:garnishment-dispute-10-days",
        what:
          "If you are the payor or the garnishee, you can dispute a notice of garnishment or a statutory declaration of indexed support. To do so, serve a dispute (Form 29E, 29F or 29G) on the other parties and file it",
        qualifier:
          "Except for a joint debt, money taken under the garnishment is paid out even if a dispute is filed. The court can order otherwise. After a dispute is served and filed, the clerk issues a notice of garnishment hearing if asked. The payor's situation may later change in a way that affects their ability to pay. The payor can then bring a motion to change the garnishment. While the garnishment is in place, the payor may go back to work for the garnishee or start getting money from a new source. If so, the payor sends a notice to the clerk and to the recipient or the Director within 10 days. The parties can agree in writing to change this time. The court can also change it.",
        countFrom: "the day you were served with the notice of garnishment or the statutory declaration of indexed support",
        countFromEvent: "served-with-notice-of-garnishment",
        length: { unit: "days", count: 10 },
        regime: "family-rules",
        rule: F_R29_16_DISPUTE,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R29_12_PAID_OUT, F_R29_13_NOT_PAID_OUT, F_R29_9_HELD_30_DAYS, F_R29_17_HEARING, F_R29_21_CHANGE, F_R29_25_27_PAYOR_NOTICES, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
      {
        id: "deadline:family:co-owner-dispute-30-days",
        what:
          "If you co-own a debt that was garnished and got a notice to co-owner of debt (Form 29C), you can dispute it. To stop the money being paid out, serve and file a dispute within the 30-day holding period",
        qualifier:
          "The sheriff, clerk or Director holds the money for 30 days. They may pay it out when the 30 days end, unless you serve and file a dispute within them. The rule does not say exactly when the 30 days start. So act as soon as you get the notice.",
        countFrom: "the start of the 30-day holding period, which the rule does not fix",
        countFromEvent: "co-owner-notice-served",
        // Count 0 ON PURPOSE (eighth review): r. 29 (9) says the money is held
        // "for 30 days" but does not say from when. A counted 30 days would
        // invent a start date. The 30 days are stated in the words instead.
        length: { unit: "days", count: 0 },
        regime: "family-rules",
        rule: F_R29_9_HELD_30_DAYS,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R29_8_JOINT_DEBT],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:notice-case-may-be-stayed-or-dismissed",
    pathway: "family",
    side: "both",
    wentWrong: true,
    userQuestion: "The court sent a notice that our case or motion may be stayed or dismissed as frivolous or an abuse — what happens now?",
    title: "Notice that the case or motion may be stayed or dismissed (rule 1.4)",
    description:
      "The court has directed the clerk to give the parties notice (Form 1.4A) that a case or motion may be stayed or dismissed because it appears on its face to be frivolous, vexatious or otherwise an abuse of the court process. For a case, the notice stays it automatically, and no party may take any other step except under this rule, unless the court orders otherwise.",
    cues: [
      "form 1.4A",
      "frivolous or vexatious",
      "abuse of the court process",
      "the court may dismiss my case",
      "my case is stayed",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:notice-of-approaching-dismissal",
        by: "whether the notice is about an abuse of process under rule 1.4 or about delay after 365 days",
      },
      {
        stage: "family:both:responding-to-summary-judgment",
        by: "whether the court raised a possible stay or dismissal under rule 1.4 or a party moved for summary judgment",
      },
    ],
    rules: [
      F_R1_4_1_STAY_DISMISS,
      F_R1_4_3_REQUEST,
      F_R1_4_5_NOTICE,
      F_R1_4_6_AUTOMATIC_STAY,
      F_R1_4_7_SUBMISSIONS,
      F_R1_4_8_RECEIPT,
      F_R1_4_9_MOTIONS,
      F_R1_4_10_MOTION_PROCEDURE,
      F_R6_7_MAIL,
    ],
    deadlines: [
      {
        id: "deadline:family:rule-1-4-submission-15-days",
        what:
          "If you brought the case or motion the notice is about, file a written submission of no more than 10 pages responding to the notice",
        qualifier:
          "If no submission is filed in time, the court may make the order without further notice. The notice is given by regular service. Rule 6 decides when it is received. For example, a notice sent by mail is received on the fifth day after mailing. These times apply unless the court orders otherwise.",
        countFrom: "the day you received the notice (Form 1.4A)",
        countFromEvent: "stay-or-dismiss-notice-received",
        length: { unit: "days", count: 15 },
        regime: "family-rules",
        rule: F_R1_4_7_SUBMISSIONS,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R1_4_8_RECEIPT, F_R6_7_MAIL, F_R1_4_10_MOTION_PROCEDURE],
      },
      {
        id: "deadline:family:rule-1-4-responding-submission-10-days",
        what:
          "If you are another party and the clerk gives you a copy of that submission, you may file a reply submission of no more than 10 pages",
        qualifier:
          "Give a copy of your reply to the party who brought the case or motion. Also give one to any other party who asks. These times apply unless the court orders otherwise.",
        countFrom: "the day you received the copy of the submission",
        countFromEvent: "stay-or-dismiss-submission-received",
        length: { unit: "days", count: 10 },
        regime: "family-rules",
        rule: F_R1_4_7_SUBMISSIONS,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R1_4_8_RECEIPT],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:served-with-request-to-admit",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "I was served with a request to admit facts or documents — what happens if I ignore it?",
    title: "Served with a request to admit",
    description:
      "Another party has served a request to admit (Form 22), asking this party to admit, for the case only, that facts are true or documents are genuine.",
    cues: [
      "request to admit",
      "form 22",
      "they want me to admit facts",
      "admit that the document is genuine",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:document-disclosure-requested",
        by: "whether the request asks for an admission of facts or documents or for a list of documents",
      },
    ],
    rules: [F_R22_2_REQUEST, F_R22_4_RESPONSE_20_DAYS, F_R22_5_WITHDRAW],
    deadlines: [
      {
        id: "deadline:family:request-to-admit-20-days",
        what:
          "Serve a response (Form 22A) for each fact or document in the request that you do not accept. Deny it, or refuse to admit it and give your reasons",
        qualifier:
          "If you do not respond in time, you are treated as admitting them for this case. You can withdraw an admission only if the other party agrees or the court allows it. The parties can agree in writing to change this time. The court can also change it.",
        countFrom: "the day you were served with the request to admit",
        countFromEvent: "served-with-request-to-admit",
        length: { unit: "days", count: 20 },
        regime: "family-rules",
        rule: F_R22_4_RESPONSE_20_DAYS,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R22_5_WITHDRAW, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:childrens-lawyer-report",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "The Children's Lawyer is involved or has served a report — what do I have to do?",
    title: "Children's Lawyer investigating or reporting on parenting",
    description:
      "The Children's Lawyer is investigating and reporting on decision-making responsibility, parenting time or contact, has served notice on the parties, and may have served a report.",
    cues: [
      "Children's Lawyer report",
      "OCL report",
      "clinician investigation",
      "I disagree with the Children's Lawyer",
      "notice from the Office of the Children's Lawyer",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:trial-scheduled",
        by: "whether the question is about the Children's Lawyer's report or about general trial preparation",
      },
      {
        stage: "family:both:case-conference-scheduled",
        by: "whether the Children's Lawyer is involved or the question is about an upcoming conference",
      },
    ],
    rules: [F_R21_A_NOTICE, F_R21_B_SERVE_CL, F_R21_D_REPORT, F_R21_E_DISPUTE, F_R21_F_NO_TRIAL],
    deadlines: [
      {
        id: "deadline:family:childrens-lawyer-report-dispute-30-days",
        what: "If you dispute anything in the Children's Lawyer's report, serve and file a statement disputing it",
        qualifier:
          "Until these 30 days end, the trial cannot be held and the court cannot make a final order. The parties can file a statement giving up that time. From the day you were served with the Children's Lawyer's notice, serve the Children's Lawyer with every paper about the child. That means papers about decision-making responsibility, parenting time, contact, support or education. Serve them as if the Children's Lawyer were a party. The parties can agree in writing to change this time. The court can also change it.",
        countFrom: "the day you were served with the report",
        countFromEvent: "childrens-lawyer-report-served",
        length: { unit: "days", count: 30 },
        regime: "family-rules",
        rule: F_R21_E_DISPUTE,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R21_F_NO_TRIAL, F_R21_B_SERVE_CL, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:served-with-request-for-financial-statement",
    pathway: "family",
    side: "both",
    wentWrong: true,
    userQuestion: "I was served with a request for a financial statement because a payment order is in default — what do I have to do?",
    title: "Payor served with a request for a financial statement (enforcement)",
    description:
      "A payment order is in default and the recipient has served the payor with a request for a financial statement (Form 27). If the payor does not comply, the court can order a financial statement on motion.",
    cues: [
      "form 27",
      "request for financial statement",
      "they want my financial statement for arrears",
      "order to file a financial statement",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:served-with-notice-of-default-hearing",
        by: "whether the payor was served with a request for a financial statement or a notice of default hearing",
      },
      {
        stage: "family:both:financial-disclosure-missing",
        by: "whether the request comes during enforcement of a payment order or during the case under rule 13",
      },
    ],
    rules: [F_R27_1_REQUEST, F_R27_2_15_DAYS, F_R27_3_FREQUENCY, F_R27_5_ORDER, F_R27_6_IMPRISONMENT],
    deadlines: [
      {
        id: "deadline:family:request-for-financial-statement-15-days",
        what: "Send a completed financial statement (Form 13) to the recipient by mail, fax or email",
        qualifier:
          "A recipient can ask only once in six months, unless the court allows more. If you do not send it, the court can order you to serve and file one. The parties can agree in writing to change this time. The court can also change it.",
        countFrom: "the day you were served with the request",
        countFromEvent: "served-with-request-for-financial-statement",
        length: { unit: "days", count: 15 },
        regime: "family-rules",
        rule: F_R27_2_15_DAYS,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R27_3_FREQUENCY, F_R27_5_ORDER, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
      {
        id: "deadline:family:order-for-financial-statement-10-days",
        what: "If the court has ordered you to serve and file a financial statement, serve and file it",
        qualifier:
          "If you do not, the other side can bring a motion, served on you by special service. The court can then order you jailed for up to 40 days, all at once or on and off.",
        countFrom: "the day you were served with the order",
        countFromEvent: "served-with-order-for-financial-statement",
        length: { unit: "days", count: 10 },
        regime: "family-rules",
        rule: F_R27_6_IMPRISONMENT,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R27_6_IMPRISONMENT],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:binding-judicial-dispute-resolution",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "We agreed to a binding judicial dispute resolution hearing — what do we file, and when?",
    title: "Binding judicial dispute resolution hearing (rule 43)",
    description:
      "The parties have asked for, or the court has ordered, a binding judicial dispute resolution hearing: a single summary hearing where a judge helps settle issues and decides the rest. It is available only in the Superior Court of Justice (including the Family Court) in a municipality the Chief Justice has designated on the Ontario Courts website, and not in child protection, interjurisdictional support or international child abduction cases.",
    cues: [
      "binding judicial dispute resolution",
      "BJDR",
      "form 43",
      "summary hearing instead of a trial",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:trial-scheduled",
        by: "whether the case is going to a trial or to a binding judicial dispute resolution hearing",
      },
      {
        stage: "family:both:settlement-conference-scheduled",
        by: "whether the next step is a settlement conference or a binding hearing",
      },
    ],
    rules: [
      F_R1_4_2_BJDR_ONLY_SCJ,
      F_R43_4_WHERE,
      F_R43_5_EXCLUDED,
      F_R43_7_REQUEST,
      F_R43_12_NO_WITHDRAWAL,
      F_R43_13_DOCUMENTS,
      F_R43_13_FULL_LIST,
      F_R43_15_TIMELINES,
      F_R43_16_REPLY,
      F_R43_18_CONFIRM,
    ],
    deadlines: [
      {
        id: "deadline:family:bjdr-documents-20-days",
        what:
          "If you are the applicant, or the party who made a motion to change, serve and file your hearing papers, as listed below",
        qualifier:
          "Your papers are these. An affidavit (Form 43B or 14A) of no more than 12 pages, with no more than 10 pages of exhibits. A draft order. Any relevant agreements, minutes of settlement or court orders. Any offer to settle that has not been withdrawn. For a support claim, an updated financial statement and certificate of financial disclosure (Form 13A). For a property claim, updated Forms 13.1, 13B and 13C, with Form 13A. For a parenting claim, an updated Form 35.1, and Form 35.1A if it applies. If the amount or length of support is an issue, your calculations. If support arrears are an issue, a statement of money owed. If special expenses are an issue, proof of the amount. For property issues, any supporting papers and expert or professional reports. For parenting issues, any expert or professional reports. Once the court has ordered the hearing, you cannot withdraw your consent. The exception is with every other party's written consent or the court's permission. The parties can agree in writing to change this time. The court can also change it.",
        countFrom: "the date of the binding judicial dispute resolution hearing, counting backwards",
        countFromEvent: "bjdr-hearing-date",
        length: { unit: "days", count: 20 },
        direction: "before",
        regime: "family-rules",
        rule: F_R43_15_TIMELINES,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R43_13_DOCUMENTS, F_R43_13_FULL_LIST, F_R43_12_NO_WITHDRAWAL, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
      {
        id: "deadline:family:bjdr-documents-10-days",
        what:
          "If you are the respondent, or the party responding to a motion to change, serve and file the same hearing papers, as listed above",
        qualifier: CONSENT_OR_COURT,
        countFrom: "the date of the binding judicial dispute resolution hearing, counting backwards",
        countFromEvent: "bjdr-hearing-date",
        length: { unit: "days", count: 10 },
        direction: "before",
        regime: "family-rules",
        rule: F_R43_15_TIMELINES,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R43_13_DOCUMENTS, F_R43_13_FULL_LIST, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
      {
        id: "deadline:family:bjdr-reply-5-days",
        what:
          "If you are the applicant or the party who made the motion, you may serve and file a reply affidavit of no more than four pages about new matters in the other party's affidavit",
        qualifier: CONSENT_OR_COURT,
        countFrom: "the date of the binding judicial dispute resolution hearing, counting backwards",
        countFromEvent: "bjdr-hearing-date",
        length: { unit: "days", count: 5 },
        direction: "before",
        regime: "family-rules",
        rule: F_R43_16_REPLY,
        computation: F_R3_2_SHORT,
        consequence: "changes-what-happens-next",
        exceptions: [F_R3_2_SHORT, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
      {
        id: "deadline:family:bjdr-confirmation",
        what:
          "Give a copy of the confirmation (Form 43C) to every other party. Then give it to the clerk no later than 2 p.m",
        qualifier: "The parties cannot change this time by agreement.",
        countFrom: "the date of the binding judicial dispute resolution hearing, counting backwards",
        countFromEvent: "bjdr-hearing-date",
        length: { unit: "days", count: 3 },
        direction: "before",
        regime: "family-rules",
        rule: F_R43_18_CONFIRM,
        computation: F_R3_2_SHORT,
        consequence: "changes-what-happens-next",
        exceptions: [F_R3_2_SHORT, F_R3_6_CONSENT, F_R3_6_G_BJDR],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:questioning",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "Can I question the other side under oath, or do I have to answer their questions?",
    title: "Questioning a party or witness (rule 20)",
    description:
      "A party wants to question another party or a witness under oath, or get information by affidavit, or has been asked to be questioned. Outside child protection cases, this happens only with the other party's consent or a court order.",
    cues: [
      "questioning",
      "examination under oath",
      "they want to question me",
      "cross-examine on the financial statement",
      "discovery in family court",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:document-disclosure-requested",
        by: "whether the request is to question a person or for an affidavit listing documents",
      },
      {
        stage: "family:both:financial-disclosure-missing",
        by: "whether the person wants to question someone or is still at the written request for financial information",
      },
    ],
    rules: [
      F_R20_4_CONSENT_OR_ORDER,
      F_R20_5_ORDER,
      F_R20_8_PRECONDITIONS,
      F_R20_11_PLACE,
      F_R20_12_ARRANGEMENTS,
      F_R20_13_NOTICE,
      F_R13_11_MORE_INFORMATION,
    ],
    deadlines: [
      {
        id: "deadline:family:questioning-notice-3-days",
        what:
          "If you are arranging the questioning, serve every party with notice of who will be questioned, and the address, date and time",
        qualifier: `Before you can question anyone, you must have served and filed any answer, financial statement or net family property statement the rules require. You must also promise in writing not to serve or file more papers for the next step, except in reply. The questioning takes place in the city or town where the person lives, unless they and you agree on another. To question someone on their financial statement, you must first have asked in writing for the missing information under r. 13 (11) (a). ${CONSENT_OR_COURT}`,
        countFrom: "the date of the questioning, counting backwards",
        countFromEvent: "questioning-date",
        length: { unit: "days", count: 3 },
        direction: "before",
        regime: "family-rules",
        rule: F_R20_13_NOTICE,
        computation: F_R3_2_SHORT,
        consequence: "changes-what-happens-next",
        exceptions: [F_R3_2_SHORT, F_R20_8_PRECONDITIONS, F_R20_11_PLACE, F_R13_13_QUESTION_FS, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
    ],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:withdrawing-a-claim",
    pathway: "family",
    side: "both",
    wentWrong: false,
    userQuestion: "I want to drop my case or part of it — how do I withdraw, and does it cost me anything?",
    title: "Withdrawing an application, answer, reply or motion",
    description:
      "A party no longer wants to continue with all or part of their application, answer, reply or motion.",
    cues: [
      "withdraw my application",
      "drop the case",
      "notice of withdrawal form 12",
      "withdraw my motion",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:offer-to-settle",
        by: "whether the person is withdrawing a claim or settling it with an offer",
      },
      {
        stage: "family:both:notice-of-approaching-dismissal",
        by: "whether the person is choosing to withdraw or the case faces dismissal for delay",
      },
    ],
    rules: [F_R12_1_WITHDRAW, F_R12_2_SPECIAL_PARTY, F_R12_3_COSTS, F_R14_16_WITHDRAW_MOTION],
    // No deadline: rule 12 sets no time for withdrawing.
    deadlines: [],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:applicant:amending-own-application",
    pathway: "family",
    side: "applicant",
    wentWrong: false,
    userQuestion: "I need to change my application after I filed it — can I?",
    title: "Applicant amending their own application",
    description:
      "The applicant wants to amend the application. Before an answer is filed, it can be done without the court's permission by serving and filing an amended application as for starting a case. After an answer is filed, it needs the consent of all parties filed, or the court's permission on a motion. A new parenting claim needs the rule 35.1 documents.",
    cues: [
      "amend my application",
      "add a claim to my application",
      "change my application",
    ],
    distinguishedFrom: [
      {
        stage: "family:respondent:served-with-amended-application",
        by: "whether the person is the applicant amending or the respondent served with the amendment",
      },
    ],
    // No deadline: r. 11 (1) sets none for the applicant.
    rules: [F_R11_1_AMENDED_APPLICATION, F_R11_3_PERMISSION, F_R11_3_1_PARENTING],
    deadlines: [],
    requiresAffirmativeScope: true,
  },
  {
    id: "family:both:served-with-financial-examination-appointment",
    pathway: "family",
    side: "both",
    wentWrong: true,
    userQuestion: "I was served with an appointment for a financial examination about unpaid support — what do I have to do?",
    title: "Payor served with an appointment for a financial examination (Form 27C)",
    description:
      "A payment order is in default and the recipient has served the payor, by special service, with an appointment for a financial examination (Form 27C).",
    cues: [
      "form 27C",
      "financial examination",
      "appointment for a financial examination",
      "they want to question me about my money",
    ],
    distinguishedFrom: [
      {
        stage: "family:both:served-with-request-for-financial-statement",
        by: "whether the payor was served with an appointment for a financial examination or a request for a financial statement",
      },
      {
        stage: "family:both:served-with-notice-of-default-hearing",
        by: "whether the payor was served with an appointment for a financial examination or a notice of default hearing",
      },
    ],
    rules: [F_R27_11_EXAMINATION, F_R27_13_PLACE, F_R26_3_PAYMENT_ORDERS],
    deadlines: [
      {
        id: "deadline:family:financial-examination-statement-7-days",
        what: "Serve a financial statement (Form 13) on the recipient",
        qualifier:
          "You must also come to the examination. Bring any document or thing named in the appointment that you control or can get, that relates to enforcing the order, and that is not protected by legal privilege. The examination is held where the parties and you agree. If not, it is in the city or town in Ontario where you live, or where the court chooses. The parties can agree in writing to change this time. The court can also change it.",
        countFrom: "the date of the examination, counting backwards",
        countFromEvent: "financial-examination-date",
        length: { unit: "days", count: 7 },
        direction: "before",
        regime: "family-rules",
        rule: F_R27_11_EXAMINATION,
        computation: F_R3_1_COUNTING,
        consequence: "changes-what-happens-next",
        exceptions: [F_R27_13_PLACE, F_R3_6_CONSENT, F_R3_5_COURT_CHANGES_TIME],
      },
    ],
    requiresAffirmativeScope: true,
  },
];

/*
 * BACKWARDS-COUNTED TIMES (ninth and tenth reviews). r. 3 (3) moves a period
 * that ENDS on a closed day to the next open day, and does not clearly say how
 * that applies to a time counted back from a date. The shared family counting
 * footer in stageAnswers.ts now says the safe course is the last open day
 * before it. Do NOT add that sentence to qualifiers here: it was removed from
 * them once the footer carried it, so it is said once per stage.
 */
export const FAMILY_STAGES: CaseStage[] = [...BEFORE_FILING, ...APPLICANT, ...RESPONDENT, ...BOTH];
