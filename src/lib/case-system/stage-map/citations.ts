/**
 * Rule and statute citations for the stage map — quotes only, never paraphrase.
 *
 * *** WHY QUOTES AND NOT SUMMARIES ***
 *
 * A summary of a rule is a new legal statement, written by whoever summarised
 * it. A quote is the rule. `verifyStageMap` reads every quote here back out of
 * the vendored corpus under docs/sources/corpus/ and fails if it is not there —
 * so a provision that was remembered rather than read cannot ship.
 *
 * The quotes are whitespace-normalised. antiword pads words apart and hard-
 * wraps at column 78, so the vendored text of r. 9.01 contains runs of spaces
 * and newlines mid-sentence. The verifier collapses whitespace on BOTH sides
 * before comparing; nothing else about the text may differ.
 *
 * *** TWO URLS, DELIBERATELY ***
 *
 * `sourceId` names the corpus file, which is what gets verified and what
 * `rules:check` watches. `officialUrl` is the human-readable e-Laws page a user
 * follows to check us. They are different addresses for the same law: we verify
 * against a .doc, a person reads a web page. Keeping both means a user is never
 * asked to trust a citation they cannot open.
 *
 * officialUrl is derived from OFFICIAL_URLS by sourceId rather than typed per
 * citation, so a link cannot rot in one block and stay right in forty others.
 */

export type CorpusSourceId =
  | "oreg-258-98-small-claims-rules"
  | "oreg-626-00-monetary-jurisdiction"
  | "limitations-act-2002"
  | "legislation-act-2006"
  | "municipal-act-2001"
  | "city-of-toronto-act-2006"
  | "occupiers-liability-act"
  | "cja-courts-of-justice-act"
  | "holidays-act-canada"
  | "esa-2000-ontario"
  // Added for the claim-type profiles. Each one is vendored -- the ids match
  // docs/sources/corpus/manifest.json -- and each carries its public e-Laws page
  // below, because a citation a user cannot open is not much of a citation.
  | "crown-liability-and-proceedings-act-2019"
  | "libel-and-slander-act"
  | "trustee-act";

/** The page a person opens to read the law for themselves. */
export const OFFICIAL_URLS: Record<CorpusSourceId, string> = {
  "oreg-258-98-small-claims-rules": "https://www.ontario.ca/laws/regulation/980258",
  "oreg-626-00-monetary-jurisdiction": "https://www.ontario.ca/laws/regulation/000626",
  "limitations-act-2002": "https://www.ontario.ca/laws/statute/02l24",
  "legislation-act-2006": "https://www.ontario.ca/laws/statute/06l21",
  "municipal-act-2001": "https://www.ontario.ca/laws/statute/01m25",
  "city-of-toronto-act-2006": "https://www.ontario.ca/laws/statute/06c11",
  "occupiers-liability-act": "https://www.ontario.ca/laws/statute/90o02",
  "cja-courts-of-justice-act": "https://www.ontario.ca/laws/statute/90c43",
  "holidays-act-canada": "https://laws-lois.justice.gc.ca/eng/acts/H-5/",
  "esa-2000-ontario": "https://www.ontario.ca/laws/statute/00e41",
  "crown-liability-and-proceedings-act-2019": "https://www.ontario.ca/laws/statute/19c07",
  "libel-and-slander-act": "https://www.ontario.ca/laws/statute/90l12",
  "trustee-act": "https://www.ontario.ca/laws/statute/90t23",
};

/** How each source is named to a user. Shown beside the quote. */
export const SOURCE_NAMES: Record<CorpusSourceId, string> = {
  "oreg-258-98-small-claims-rules": "Rules of the Small Claims Court, O. Reg. 258/98",
  "oreg-626-00-monetary-jurisdiction": "O. Reg. 626/00 (Small Claims Court jurisdiction)",
  "limitations-act-2002": "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
  "legislation-act-2006": "Legislation Act, 2006, S.O. 2006, c. 21, Sched. F",
  "municipal-act-2001": "Municipal Act, 2001, S.O. 2001, c. 25",
  "city-of-toronto-act-2006": "City of Toronto Act, 2006, S.O. 2006, c. 11, Sched. A",
  "occupiers-liability-act": "Occupiers' Liability Act, R.S.O. 1990, c. O.2",
  "cja-courts-of-justice-act": "Courts of Justice Act, R.S.O. 1990, c. C.43",
  "holidays-act-canada": "Holidays Act (Canada), R.S.C. 1985, c. H-5",
  "esa-2000-ontario": "Employment Standards Act, 2000, S.O. 2000, c. 41",
  "crown-liability-and-proceedings-act-2019":
    "Crown Liability and Proceedings Act, 2019, S.O. 2019, c. 7, Sched. 17",
  "libel-and-slander-act": "Libel and Slander Act, R.S.O. 1990, c. L.12",
  "trustee-act": "Trustee Act, R.S.O. 1990, c. T.23",
};

export type RuleCitation = {
  sourceId: CorpusSourceId;
  /** How the provision is cited, e.g. "r. 9.01" or "s. 44 (10)". */
  pinpoint: string;
  /**
   * Verbatim from the vendored text, whitespace collapsed. Never edited for
   * readability. Where a quote skips material, the skipped part is marked with
   * " ... " and the verifier checks each run on either side separately.
   */
  quote: string;
};

export function sourceName(citation: RuleCitation): string {
  return SOURCE_NAMES[citation.sourceId];
}

export function officialUrl(citation: RuleCitation): string {
  return OFFICIAL_URLS[citation.sourceId];
}

/** Shorthand for the regulation nearly every stage cites. */
const scc = (pinpoint: string, quote: string): RuleCitation => ({
  sourceId: "oreg-258-98-small-claims-rules",
  pinpoint,
  quote,
});

// ---------------------------------------------------------------- the rules

export const R_3_01_COMPUTATION = scc(
  "r. 3.01",
  "If these rules or an order of the court prescribe a period of time for the taking of a step in a proceeding, the time shall be counted by excluding the first day and including the last day of the period; if the last day of the period of time falls on a holiday, the period ends on the next day that is not a holiday.",
);

export const R_3_02_EXTEND = scc(
  "r. 3.02 (1)",
  "The court may lengthen or shorten any time prescribed by these rules or an order, on such terms as are just.",
);

export const R_6_01_PLACE = scc(
  "r. 6.01 (1)",
  "An action shall be commenced, (a) in the territorial division, (i) in which the cause of action arose, or (ii) in which the defendant or, if there are several defendants, in which any one of them resides or carries on business",
);

export const R_6_02_NO_DIVISION = scc(
  "r. 6.02",
  "A cause of action shall not be divided into two or more actions for the purpose of bringing it within the court's jurisdiction.",
);

export const R_7_01_COMMENCEMENT = scc(
  "r. 7.01 (1)",
  "An action shall be commenced by filing a plaintiff's claim (Form 7A) with the clerk, together with a copy of the claim for each defendant.",
);

export const R_7_01_ELECTRONIC = scc(
  "r. 7.01 (1.1)",
  "If the plaintiff's claim is filed electronically, the requirement to also file a copy of the claim for each defendant does not apply.",
);

export const R_8_01_TIME_FOR_SERVICE = scc(
  "r. 8.01 (2)",
  "A claim shall be served within six months after the date it is issued, but the court may extend the time for service, before or after the six months has elapsed.",
);

export const R_8_01_MANNER = scc(
  "r. 8.01 (1)",
  "A plaintiff's claim or defendant's claim (Form 7A or 10A) shall be served personally as provided in rule 8.02 or by an alternative to personal service as provided in rule 8.03.",
);

export const R_9_01_DEFENCE = scc(
  "r. 9.01",
  "A defendant who wishes to dispute a plaintiff's claim shall, within 20 days of being served with the claim, (a) serve on every other party a defence (Form 9A); and (b) file the defence, with proof of service, with the clerk.",
);

export const R_10_01_DEFENDANTS_CLAIM = scc(
  "r. 10.01 (2)",
  "The defendant's claim shall be in Form 10A and may be issued, (a) within 20 days after the day on which the defence is filed; or (b) after the time described in clause (a) but before trial or default judgment, with leave of the court.",
);

export const R_10_03_DEFENCE_TO_DEFENDANTS_CLAIM = scc(
  "r. 10.03",
  "A party who wishes to dispute the defendant's claim or a third party who wishes to dispute the plaintiff's claim shall, within 20 days after service of the defendant's claim, (a) serve on every other party a defence (Form 9A); and (b) file the defence, with proof of service, with the clerk.",
);

export const R_11_01_NOTING_IN_DEFAULT = scc(
  "r. 11.01 (1)",
  "If a defendant to a plaintiff's claim or a defendant's claim fails to file a defence to all or part of the claim with the clerk within the prescribed time, the clerk may note the defendant in default on the filing of, (a) a request to note the defendant in default, which may be made in Form 9B; and (b) proof that the claim was served within the court's territorial division, subject to subrule (3).",
);

export const R_11_02_DEFAULT_JUDGMENT = scc(
  "r. 11.02 (1)",
  "If a defendant has been noted in default, the clerk may sign default judgment (Form 11B) in respect of the claim or any part of the claim to which the default applies that is for a debt or liquidated demand in money, including interest if claimed.",
);

export const R_11_03_ASSESSMENT = scc(
  "r. 11.03 (2)",
  "To obtain judgment, the plaintiff may, (a) file a notice of motion and supporting affidavit (Form 15A) requesting a motion in writing for an assessment of damages, setting out the reasons why the motion should be granted and attaching any relevant documents; or (b) file a request for an assessment hearing, which may be in Form 9B.",
);

export const R_11_06_SET_ASIDE = scc(
  "r. 11.06",
  "The court may set aside the noting in default or default judgment against a party and any step that has been taken to enforce the judgment, on such terms as are just, if the party makes a motion to set aside and the court is satisfied that, (a) the party has a meritorious defence and a reasonable explanation for the default; and (b) the motion is made as soon as is reasonably possible in all the circumstances.",
);

export const R_11_1_01_DISMISSAL_FOR_DELAY = scc(
  "r. 11.1.01 (1)",
  "Unless the court orders otherwise, the clerk shall make an order dismissing an action for delay if, by the second anniversary of the commencement of the action, (a) the action has not been disposed of by order; and (b) no step has been taken by the plaintiff under rule 11.03 to obtain judgment, nor has a trial date been requested.",
);

export const R_13_01_SETTLEMENT_CONFERENCE = scc(
  "r. 13.01 (1)",
  "A settlement conference shall be held in every defended action.",
);

/*
 * Added after the pipeline could not support "you will receive a notice with
 * the date and time". The statement is true and this is where it lives — it
 * was simply not in the stage's citation list, so the drafter had no way to
 * reach it. Found by reading why a sentence failed, not by auditing the map.
 */
export const R_13_01_CLERK_FIXES = scc(
  "r. 13.01 (2)",
  "The clerk shall fix a time, date and place for the settlement conference and serve a notice of settlement conference, together with a list of proposed witnesses (Form 13A), on the parties.",
);

export const R_10_04_TRIED_TOGETHER = scc(
  "r. 10.04 (1)",
  "A defendant's claim shall be tried and disposed of at the trial of the action, unless the court orders otherwise.",
);

export const R_13_01_TIMING = scc(
  "r. 13.01 (3)",
  "The settlement conference shall be held within 90 days after the first defence is filed.",
);

export const R_13_02_FAILURE_TO_ATTEND = scc(
  "r. 13.02 (5)",
  "If a party who has received a notice of settlement conference fails to attend the conference, the court may, (a) impose appropriate sanctions, by way of costs or otherwise; and (b) order that an additional settlement conference be held, if necessary.",
);

export const R_13_02_DEFENDANT_TWICE_ABSENT = scc(
  "r. 13.02 (6)",
  "If a defendant fails to attend a first settlement conference, receives notice of an additional settlement conference and fails to attend the additional settlement conference, the court may, (a) strike out the defence and dismiss the defendant's claim, if any, and allow the plaintiff to prove the plaintiff's claim; or (b) make such other order as is just.",
);

export const R_13_03_DISCLOSURE = scc(
  "r. 13.03 (2)",
  "At least 14 days before the date of the settlement conference, each party shall serve on every other party and file with the court, (a) a copy of any document to be relied on at the trial, including an expert report, not attached to the party's claim or defence",
);

export const R_13_07_SET_DOWN = scc(
  "r. 13.07",
  "At or after the settlement conference, the clerk shall provide the parties with a notice stating that one of the parties must request a trial date if the action is not disposed of within 30 days after the settlement conference, and pay the fee required for setting the action down for trial.",
);

export const R_16_01_TRIAL_DATE = scc(
  "r. 16.01 (1)",
  "The clerk shall fix a date for trial and serve a notice of trial on each party who has filed a claim or defence if, (a) a settlement conference has been held; and (b) a party has filed a request to the clerk (Form 9B) to fix a date for trial and has paid the required fee.",
);

export const R_17_01_FAILURE_TO_ATTEND_TRIAL = scc(
  "r. 17.01 (2)",
  "If an action is called for trial and a party fails to attend, the trial judge may, (a) proceed with the trial in the party's absence; (b) if the plaintiff attends and the defendant fails to do so, strike out the defence and dismiss the defendant's claim, if any, and allow the plaintiff to prove the plaintiff's claim, subject to subrule (3); (c) if the defendant attends and the plaintiff fails to do so, dismiss the action and allow the defendant to prove the defendant's claim, if any",
);

/*
 * *** THE TWO HOLIDAY DEFINITIONS ARE NOT THE SAME, AND THE DIFFERENCE DECIDES
 * *** REAL DATES
 *
 * r. 1.02 makes ANY SATURDAY OR SUNDAY a holiday, and includes Civic Holiday.
 * Legislation Act s. 88 (2) makes only SUNDAY a holiday, and has no Civic
 * Holiday at all.
 *
 * So a period ending on a Saturday runs to Monday under the Small Claims rules
 * and expires that Saturday under the Legislation Act. On a 10-day municipal
 * notice — a statutory period — assuming the friendlier rule loses the claim.
 * This is why every deadline in the stage map records which regime counts it.
 *
 * The substitution rules differ too. r. 1.02 moves New Year's, Canada Day and
 * Remembrance Day to the following Monday when they fall on a Saturday OR a
 * Sunday, and gives Christmas both the Monday and the Tuesday. s. 88 (3)-(5)
 * shifts only for Sunday, and defers Canada Day to the federal Holidays Act.
 */

export const R_1_02_HOLIDAY = scc(
  "r. 1.02 (1)",
  "\"holiday\" means, (a) any Saturday or Sunday, (b) New Year's Day, (b.1) Family Day, (c) Good Friday, (d) Easter Monday, (e) Victoria Day, (f) Canada Day, (g) Civic Holiday, (h) Labour Day, (i) Thanksgiving Day, (j) Remembrance Day, (k) Christmas Day, (l) Boxing Day, and (m) any special holiday proclaimed by the Governor General or the Lieutenant Governor,",
);

export const R_1_02_HOLIDAY_SUBSTITUTION = scc(
  "r. 1.02 (1)",
  "and if New Year's Day, Canada Day or Remembrance Day falls on a Saturday or Sunday, the following Monday is a holiday, and if Christmas Day falls on a Saturday or Sunday, the following Monday and Tuesday are holidays, and if Christmas Day falls on a Friday, the following Monday is a holiday;",
);

/*
 * *** THE REMEDY THAT WAS FIVE LINES BELOW THE RULE WE CITED ***
 *
 * `both:missed-trial` cited only r. 17.01 (2) — what the judge MAY do when
 * somebody fails to attend — and so the block told the reader "the rules do
 * not set out a step for this". An independent review found r. 17.01 (4) and
 * (5) immediately below it: the court may set aside the judgment, and there is
 * a HARD 30-DAY CLOCK from becoming aware of it.
 *
 * Telling a frightened person there is no remedy, in wording designed to sound
 * trustworthy, while a 30-day limit runs, is the most damaging thing in this
 * review. The cause was a citation list that stopped one subrule short.
 */
export const R_17_01_SET_ASIDE = scc(
  "r. 17.01 (4)",
  "The court may set aside or vary, on such terms as are just, a judgment obtained against a party who failed to attend at the trial.",
);

export const R_17_01_SET_ASIDE_30_DAYS = scc(
  "r. 17.01 (5)",
  "The court may make an order under subrule (4) only if, (a) the party who failed to attend makes a motion for the order within 30 days after becoming aware of the judgment; or (b) the party who failed to attend makes a motion for an extension of the 30-day period mentioned in clause (a) and the court is satisfied that there are special circumstances that justify the extension.",
);

/*
 * Same class of error: `both:filed-in-wrong-place` quoted only r. 6.01 (1),
 * concluded nothing said how to fix filing in the wrong place, and recorded
 * the stage as having no source. Subrules (2) and (3) of the same rule are the
 * remedy.
 */
export const R_6_01_TRIED_ELSEWHERE = scc(
  "r. 6.01 (2)",
  "An action shall be tried in the place where it is commenced, but if the court is satisfied that the balance of convenience substantially favours holding the trial at another place than those described in subrule (1), the court may order that the action be tried at that other place.",
);

export const R_6_01_JUDGE_MAY_MOVE = scc(
  "r. 6.01 (3)",
  "If, when an action is called for trial, settlement conference or trial management conference, the judge finds that the place where the action was commenced is not the proper place of trial, the court may order that the action be tried in any other place where it could have been commenced under this rule.",
);

/*
 * Substituted service. The block on failed service understated the test as
 * "if personal service is impractical"; the rule requires that personal
 * service OR AN ALTERNATIVE to it be impractical, so a user who had tried only
 * personal service would bring a motion that fails.
 */
export const R_8_04_SUBSTITUTED_SERVICE = scc(
  "r. 8.04",
  "If it is shown that it is impractical to effect prompt service of a claim personally or by an alternative to personal service, the court may allow substituted service.",
);

// ------------------------------------------------------------- the statutes

/*
 * Day counting for STATUTORY periods.
 *
 * r. 3.01 counts time for "these rules" — it does not reach the Municipal Act
 * or Occupiers' Liability Act notice periods. Those are counted under the
 * Legislation Act, 2006, and the two regimes are not identical, so the stage
 * map records which one governs each deadline rather than assuming one rule
 * covers everything.
 *
 * *** THE SATURDAY TRAP ***
 *
 * s. 88 (2) lists the holidays, and SATURDAY IS NOT ONE OF THEM — only Sunday.
 * So a 10-day notice period ending on a Saturday is NOT extended by s. 89 (1).
 * What can extend it is s. 89 (2), and only where the place for filing or
 * serving is closed. Anyone reasoning "it lands on a weekend, so I have until
 * Monday" is reasoning from the wrong rule, and on a 10-day notice period that
 * error bars the claim. Part 4's engine must implement s. 88 and s. 89 as
 * written, not as weekend intuition suggests.
 */

export const S_LEGISLATION_88_HOLIDAYS: RuleCitation = {
  sourceId: "legislation-act-2006",
  pinpoint: "s. 88 (2)",
  quote:
    "The following days are holidays: 1. Sunday. 2. New Year's Day. 2.1 Family Day. 3. Good Friday. 4. Easter Monday. 5. Victoria Day. 6. Canada Day. 7. Labour Day. 8. Thanksgiving Day. 9. Remembrance Day. 10. Christmas Day. 11. Boxing Day.",
};

export const S_LEGISLATION_89_1_HOLIDAY: RuleCitation = {
  sourceId: "legislation-act-2006",
  pinpoint: "s. 89 (1)",
  quote:
    "Time limits that would otherwise expire on a holiday are extended to include the next day that is not a holiday.",
};

export const S_LEGISLATION_89_2_CLOSED: RuleCitation = {
  sourceId: "legislation-act-2006",
  pinpoint: "s. 89 (2)",
  quote:
    "Time limits for registering or filing documents or for doing anything else that expire on a day when the place for doing so is not open during its regular hours of business are extended to include the next day the place is open during its regular hours of business.",
};

export const S_LEGISLATION_89_3_BETWEEN: RuleCitation = {
  sourceId: "legislation-act-2006",
  pinpoint: "s. 89 (3)",
  quote:
    "A reference to a number of days between two events excludes the day on which the first event happens and includes the day on which the second event happens",
};

export const S_LEGISLATION_89_6_MONTHS: RuleCitation = {
  sourceId: "legislation-act-2006",
  pinpoint: "s. 89 (6)",
  quote:
    "The number of months is counted from the specified day, excluding the month in which the specified day falls. 2. The period includes the day in the last month counted that has the same calendar number as the specified day or, if that month has no day with that number, its last day.",
};

/*
 * The Legislation Act reaches regulations too — s. 46 says so expressly, and
 * s. 47 makes that subject to a contrary intention. r. 3.01 is a contrary
 * intention about counting DAYS and about which days are holidays; it says
 * nothing about counting MONTHS, so s. 89 (6) supplies that for the six-month
 * service window in r. 8.01 (2).
 */
export const S_LEGISLATION_46_APPLIES: RuleCitation = {
  sourceId: "legislation-act-2006",
  pinpoint: "s. 46",
  quote: "Every provision of this Part applies to every Act and regulation.",
};

export const S_LEGISLATION_89_7_LEAP: RuleCitation = {
  sourceId: "legislation-act-2006",
  pinpoint: "s. 89 (7)",
  quote:
    "The anniversary of an event that took place on February 29 falls on February 28, except in a leap year.",
};

// --- when the named holidays actually fall. See scripts/rules/holidaySources.ts
// --- for the five whose dates no statute we could find states at all.

export const S_HOLIDAYS_ACT_4_VICTORIA: RuleCitation = {
  sourceId: "holidays-act-canada",
  pinpoint: "s. 4",
  quote:
    "The first Monday immediately preceding May 25 is a legal holiday and shall be kept and observed as such throughout Canada under the name of",
};

export const S_HOLIDAYS_ACT_2_CANADA_DAY: RuleCitation = {
  sourceId: "holidays-act-canada",
  pinpoint: "s. 2",
  quote: "July 1, not being a Sunday, is a legal holiday",
};

export const S_HOLIDAYS_ACT_3_REMEMBRANCE: RuleCitation = {
  sourceId: "holidays-act-canada",
  pinpoint: "s. 3",
  quote: "November 11, being the day in the year 1918",
};

export const S_ESA_FAMILY_DAY: RuleCitation = {
  sourceId: "esa-2000-ontario",
  pinpoint: "s. 1 (1)",
  quote: "Family Day, being the third Monday in February.",
};

export const S_LIMITATIONS_4_BASIC: RuleCitation = {
  sourceId: "limitations-act-2002",
  pinpoint: "s. 4",
  quote:
    "Unless this Act provides otherwise, a proceeding shall not be commenced in respect of a claim after the second anniversary of the day on which the claim was discovered.",
};

export const S_LIMITATIONS_5_DISCOVERY: RuleCitation = {
  sourceId: "limitations-act-2002",
  pinpoint: "s. 5 (1)",
  quote: "A claim is discovered on the earlier of,",
};

export const S_MONETARY_LIMIT: RuleCitation = {
  sourceId: "oreg-626-00-monetary-jurisdiction",
  pinpoint: "s. 1 (1)",
  quote: "The maximum amount of a claim in the Small Claims Court is $50,000.",
};

// --- the pre-suit notice provisions. See scripts/rules/noticeSources.ts for
// --- why they are handled apart from every other deadline in the product.

export const S_MUNICIPAL_44_10_NOTICE: RuleCitation = {
  sourceId: "municipal-act-2001",
  pinpoint: "s. 44 (10)",
  quote:
    "No action shall be brought for the recovery of damages under subsection (2) unless, within 10 days after the occurrence of the injury, written notice of the claim and of the injury complained of, including the date, time and location of the occurrence, has been served upon or sent by registered mail to, (a) the clerk of the municipality",
};

export const S_MUNICIPAL_44_11_DEATH: RuleCitation = {
  sourceId: "municipal-act-2001",
  pinpoint: "s. 44 (11)",
  quote:
    "Failure to give notice is not a bar to the action in the case of the death of the injured person as a result of the injury.",
};

export const S_MUNICIPAL_44_12_EXCUSE: RuleCitation = {
  sourceId: "municipal-act-2001",
  pinpoint: "s. 44 (12)",
  quote:
    "Failure to give notice or insufficiency of the notice is not a bar to the action if a judge finds that there is reasonable excuse for the want or the insufficiency of the notice and that the municipality is not prejudiced in its defence.",
};

export const S_MUNICIPAL_44_9_SIDEWALK: RuleCitation = {
  sourceId: "municipal-act-2001",
  pinpoint: "s. 44 (9)",
  quote:
    "Except in case of gross negligence, a municipality is not liable for a personal injury caused by snow or ice on a sidewalk.",
};

export const S_TORONTO_42_6_NOTICE: RuleCitation = {
  sourceId: "city-of-toronto-act-2006",
  pinpoint: "s. 42 (6)",
  quote:
    "No action shall be brought for the recovery of damages under subsection (2) unless, within 10 days after the occurrence of the injury, written notice of the claim and of the injury complained of, including the date, time and location of the occurrence, has been served upon or sent by registered mail to, (a) the city clerk",
};

export const S_TORONTO_42_5_SIDEWALK: RuleCitation = {
  sourceId: "city-of-toronto-act-2006",
  pinpoint: "s. 42 (5)",
  quote:
    "Except in case of gross negligence, the City is not liable for a personal injury caused by snow or ice on a sidewalk.",
};

/*
 * *** THE CITATION LIST STOPPED ONE SUBRULE SHORT. AGAIN. ***
 *
 * The Toronto stage cited s. 42 (6) (the 10-day bar), s. 42 (5) (no liability
 * for snow and ice on a sidewalk) and s. 42 (8) (reasonable excuse) — and not
 * s. 42 (7), the death exception, although the Municipal Act stage beside it
 * cites both of its equivalents, s. 44 (11) and s. 44 (12).
 *
 * This is the third time in this work that a missing adjacent subrule has been
 * the defect: r. 17.01 (4)-(5) produced a block saying the rules set out no step
 * for a missed trial, and r. 6.01 (2)-(3) produced the same claim in a comment.
 * Here it meant a family bringing a claim after a fatal injury could be shown a
 * ten-day bar with no mention that the bar does not apply to them.
 */
export const S_TORONTO_42_7_DEATH: RuleCitation = {
  sourceId: "city-of-toronto-act-2006",
  pinpoint: "s. 42 (7)",
  quote:
    "Failure to give notice is not a bar to the action in the case of the death of the injured person as a result of the injury.",
};

export const S_TORONTO_42_8_EXCUSE: RuleCitation = {
  sourceId: "city-of-toronto-act-2006",
  pinpoint: "s. 42 (8)",
  quote:
    "Failure to give notice or insufficiency of the notice is not a bar to the action if a judge finds that there is reasonable excuse for the want or the insufficiency of the notice and that the City is not prejudiced in its defence.",
};

export const S_OLA_6_1_NOTICE: RuleCitation = {
  sourceId: "occupiers-liability-act",
  pinpoint: "s. 6.1 (1)",
  quote:
    "No action shall be brought for the recovery of damages for personal injury caused by snow or ice against a person or persons listed in subsection (2) unless, within 60 days after the occurrence of the injury, written notice of the claim, including the date, time and location of the occurrence, has been personally served on or sent by registered mail to at least one person listed in subsection (2).",
};

export const S_OLA_6_1_2_WHO: RuleCitation = {
  sourceId: "occupiers-liability-act",
  pinpoint: "s. 6.1 (2)",
  quote:
    "The persons referred to in subsection (1) are the following: 1. An occupier. 2. An independent contractor employed by the occupier to remove snow or ice on the premises during the relevant period in which the injury occurred.",
};

export const S_OLA_6_1_5_DEATH: RuleCitation = {
  sourceId: "occupiers-liability-act",
  pinpoint: "s. 6.1 (5)",
  quote:
    "Failure to give notice in accordance with subsection (1) is not a bar to the action in the case of the death of the injured person as a result of the injury.",
};

export const S_OLA_6_1_6_EXCUSE: RuleCitation = {
  sourceId: "occupiers-liability-act",
  pinpoint: "s. 6.1 (6)",
  quote:
    "Failure to give notice in accordance with subsection (1) or insufficiency of the notice is not a bar to the action if a judge finds that there is reasonable excuse for the want or the insufficiency of the notice and that the defendant is not prejudiced in its defence.",
};

/* ---------------------------------------------------------------------------
 * CLAIM-BARRING PROVISIONS FOR THE CLAIM-TYPE PROFILES
 *
 * Every quote below was extracted FROM THE VENDORED TEXT by a script, not
 * transcribed. Transcribing a 400-character statutory sentence by hand is an
 * invitation to drop a word, and a dropped word in a claim-barring provision is
 * the worst kind of error this repository can make.
 *
 * Two of these are scoping provisions rather than deadlines, and they are here
 * because without them the deadlines beside them would be stated far too widely:
 *
 *   S_LS_7_SCOPE      — ss. 5 (1) and 6 apply ONLY to Ontario newspapers and
 *                       Ontario broadcasts. A profile that told everyone
 *                       defamed online that they had six weeks would frighten
 *                       people who have two years; one that told a newspaper
 *                       case it had two years would end the claim.
 *   S_CLPA_18_4_PROPERTY — the Crown's general rule is 60 days BEFORE starting;
 *                       for a property-duty claim it is 10 days AFTER the event.
 *                       Same section, opposite shape.
 * ------------------------------------------------------------------------- */

export const S_CLPA_18_1_NOTICE: RuleCitation = {
  sourceId: "crown-liability-and-proceedings-act-2019",
  pinpoint: "s. 18 (1)",
  quote:
    "No proceeding that includes a claim for damages may be brought against the Crown unless, at least 60 days before the commencement of the proceeding, the claimant serves on the Crown, in accordance with section 15, notice of the claim containing sufficient particulars to identify the occasion out of which the claim arose.",
};

export const S_CLPA_18_3_EXTENSION: RuleCitation = {
  sourceId: "crown-liability-and-proceedings-act-2019",
  pinpoint: "s. 18 (3)",
  quote:
    "If a notice of claim is served under subsection (1) before the expiry of a limitation period applicable with respect to the claim but the 60-day period referred to in that subsection ends after the expiry of the limitation period, the limitation period is extended to the last instant of the seventh day following the end of the 60-day period.",
};

export const S_CLPA_18_4_PROPERTY: RuleCitation = {
  sourceId: "crown-liability-and-proceedings-act-2019",
  pinpoint: "s. 18 (4)",
  quote:
    "Despite subsection (1), no proceeding that includes a claim for damages may be brought against the Crown under clause 8 (1) (b) unless the notice required by subsection (1) is served on the Crown in accordance with section 15 no later than 10 days after the occurrence of the event out of which the claim arises.",
};

export const S_LS_5_1_NOTICE: RuleCitation = {
  sourceId: "libel-and-slander-act",
  pinpoint: "s. 5 (1)",
  quote:
    "No action for libel in a newspaper or in a broadcast lies unless the plaintiff has, within six weeks after the alleged libel has come to the plaintiff's knowledge, given to the defendant notice in writing, specifying the matter complained of, which shall be served in the same manner as a statement of claim or by delivering it to a grown-up person at the chief office of the defendant.",
};

export const S_LS_6_LIMITATION: RuleCitation = {
  sourceId: "libel-and-slander-act",
  pinpoint: "s. 6",
  quote:
    "An action for a libel in a newspaper or in a broadcast shall be commenced within three months after the libel has come to the knowledge of the person defamed, but, where such an action is brought within that period, the action may include a claim for any other libel against the plaintiff by the defendant in the same newspaper or the same broadcasting station within a period of one year before the commencement of the action.",
};

export const S_LS_7_SCOPE: RuleCitation = {
  sourceId: "libel-and-slander-act",
  pinpoint: "s. 7",
  quote:
    "Subsection 5 (1) and section 6 apply only to newspapers printed and published in Ontario and to broadcasts from a station in Ontario.",
};

export const S_TRUSTEE_38_3_LIMITATION: RuleCitation = {
  sourceId: "trustee-act",
  pinpoint: "s. 38 (3)",
  quote:
    "An action under this section shall not be brought after the expiration of two years from the death of the deceased.",
};
