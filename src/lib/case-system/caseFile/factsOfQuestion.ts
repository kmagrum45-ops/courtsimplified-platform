/**
 * WHICH FACT ABOUT THE CASE EACH QUESTION ASKS FOR (the ask-once gate; the case file's slots).
 *
 * Every question the site shows -- the situation questions, the questions one at a
 * time (civil and Family), the Small Claims guided questions and its "here is what I
 * understood" rows, the review's remaining questions, the Family triage, the stage
 * question on the results and case pages, and the step page's date questions -- is
 * mapped here to the fact (or facts) it asks for. Two questions that ask for the same
 * fact in one case are the same question asked twice, whatever their wording.
 *
 * A question not listed asks for a fact of its own (its id), so asking it twice is
 * still caught. Pure.
 */
export type CaseFact =
  | "situation" | "side" | "court" | "stage" | "filed" | "defenceFiled" | "claimServed" | "papers"
  | "servedDate" | "serviceMethod" | "amount" | "otherParty" | "children" | "married" | "claimKind"
  | "wants" | "whenHappened" | "evidence" | "story" | "urgent" | "courtFileNumber" | "courtDate"
  | "conferenceDate" | "claimIssuedDate" | "defenceFiledDate" | "marriedWhere" | "outcome" | "filedDocuments";

const FACTS: Record<string, readonly CaseFact[]> = {
  // The situation questions (situation.ts).
  "situation:where": ["situation"],
  "situation:started": ["side"],
  "situation:papers": ["papers"],
  "situation:received": ["servedDate"],
  "situation:filed": ["filed"],
  "situation:court": ["court"],
  "situation:stage": ["stage"],
  // Civil and Family, one at a time and in the review.
  facts: ["story"],
  yourRole: ["side"],
  // Which documents exist is a detail of its own: the situation answers say whether anything
  // is filed, not which papers (the case file reads "filed" from these lists itself).
  filedDocuments: ["filedDocuments"],
  documents: ["filedDocuments"],
  issues: ["claimKind"],
  childrenInfo: ["children"],
  servedDate: ["servedDate"],
  serviceDetails: ["servedDate", "serviceMethod"],
  // A court date, or a conference date when the answer names one (caseFile.ts give).
  upcomingCourtDate: ["courtDate", "conferenceDate"],
  goal: ["wants"],
  legalRemedy: ["wants"],
  otherParty: ["otherParty"],
  urgent: ["urgent"],
  amountClaimed: ["amount"],
  courtFileNumber: ["courtFileNumber"],
  defendantOutcomeText: ["outcome"],
  remedySought: ["wants"],
  placeOfMarriage: ["marriedWhere"],
  "case-date-case-conference-date": ["conferenceDate"],
  // Every conference's date is the conference date, kept with its kind (caseFile.ts conferenceKind).
  "case-date-family-settlement-conference-date": ["conferenceDate"],
  "case-date-trial-management-conference-date": ["conferenceDate"],
  "case-date-pre-trial-conference-date": ["conferenceDate"],
  "case-date-trial-date": ["courtDate"],
  caseStage: ["stage"],
  // Small Claims guided questions and the review's.
  "sc-orient-role": ["side"],
  "sc-orient-dispute-category": ["claimKind"],
  "sc-orient-when-happened": ["whenHappened"],
  "sc-amount-claimed": ["amount"],
  "sc-claim-filed": ["filed"],
  "sc-defendant-served": ["claimServed"],
  "sc-defendant-claim-received": ["servedDate", "papers"],
  "sc-defendant-service-method": ["servedDate", "serviceMethod"],
  "sc-defendant-defence-filed": ["defenceFiled"],
  "sc-defence-filed": ["defenceFiled"],
  "sc-evidence-available": ["evidence"],
  "sc-remedy-sought": ["wants"],
  // The step page's date questions (casePosition.ts) for the same moments.
  "sc-date-claim-served": ["servedDate"],
  "sc-date-defendants-claim-served": ["servedDate"],
  "case-date-served-with-application": ["servedDate"],
  "case-date-served-with-motion-to-change": ["servedDate"],
  "sc-date-settlement-conference": ["conferenceDate"],
  "case-date-served-with-crossclaim": ["servedDate"],
  "case-date-served-with-third-party-claim": ["servedDate"],
  "sc-date-claim-issued": ["claimIssuedDate"],
  "sc-date-defence-filed": ["defenceFiledDate"],
  "case-date-defence-served": ["defenceFiledDate"],
  "case-date-own-defence-delivered": ["defenceFiledDate"],
  "case-date-own-defence-filed": ["defenceFiledDate"],
  "case-date-act-or-omission": ["whenHappened"],
  // The Family triage.
  "married-to-other-party": ["married"],
  "situation:marriedWhere": ["marriedWhere"],
  "child-together": ["children"],
  "case-involves-children": ["children"],
  // The stage question on the results and case pages.
  "stage-confirmation": ["stage"],
  // The Small Claims guided route's "This sounds like it may be about..." card.
  "claim-kind-suggestion": ["claimKind"],
  // The review's own boxes, by the field they hold (the Small Claims guided facts and form fields).
  role: ["side"],
  claimFiled: ["filed"],
  defenceFiled: ["defenceFiled"],
  amountClaimedText: ["amount"],
  remedySoughtText: ["wants"],
  timelineText: ["whenHappened"],
  claimReceivedText: ["servedDate", "papers"],
  serviceMethodText: ["servedDate", "serviceMethod"],
  serviceDetailsText: ["claimServed"],
  evidenceText: ["evidence"],
  disputeCategory: ["claimKind"],
};

/** The facts a question asks for: its listed facts, or a fact of its own (its id). */
/**
 * Which fact a question asks for, from its own words, for questions that have no id of their own:
 * the story reading's questions on the home page and the chat's (Charter re-test 27 Oct: the
 * person answered "what would you like the court to order?" on the home page, including a
 * declaration; nothing else knew, so the review offered a story sentence instead and the chat asked
 * "what outcome are you seeking?" again). Null when the words name none of these.
 */
const ASKS_FOR: [RegExp, CaseFact][] = [
  [/\bwhat (?:outcome|result|remedy|remedies)\b|\boutcome (?:are|do) you (?:seeking|want)\b|\bwhat (?:do|would) you (?:want|like)(?: (?:to happen|the court to (?:order|do)))?\b|\bwhat are you (?:asking|seeking)\b|\bwhat (?:would you like|do you want) the court\b/i, "wants"],
  [/\bhow much\b|\bwhat (?:is the )?amount\b/i, "amount"],
  [/\bwhen were you served\b|\bwhat (?:date|day) were you served\b|\bhow were (?:the papers|you) served\b/i, "servedDate"],
  [/\b(?:have you|has anyone|has anything been) (?:already )?(?:started|filed)\b|\bstarted a court case\b/i, "filed"],
  [/\bwho (?:is|are) the (?:other party|other side|defendants?|respondents?)\b|\bwho (?:exactly )?(?:are you|do you want to|will you|would you like to) su(?:e|ing)\b|\bwho (?:exactly )?(?:do|would) you (?:name|sue)\b/i, "otherParty"],
  [/\bwhen did (?:this|it|the [a-z]+) happen\b|\bwhat (?:date|day) did (?:this|it) happen\b/i, "whenHappened"],
];

export function factOfAskedText(question: string): CaseFact | null {
  return ASKS_FOR.find(([asks]) => asks.test(question))?.[1] ?? null;
}

export function factsOfQuestion(id: string, surface?: string): string[] {
  const keyed = surface === "situation" ? FACTS[`situation:${id}`] : undefined;
  return [...(keyed ?? FACTS[id] ?? [id])];
}
