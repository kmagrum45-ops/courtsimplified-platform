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
  upcomingCourtDate: ["courtDate"],
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
export function factsOfQuestion(id: string, surface?: string): string[] {
  const keyed = surface === "situation" ? FACTS[`situation:${id}`] : undefined;
  return [...(keyed ?? FACTS[id] ?? [id])];
}
