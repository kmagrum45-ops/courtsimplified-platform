/**
 * WHAT EACH FACT MEANS, ONCE (site owner, 19 Nov 2026: "add a build check that fails if two facts are declared as the
 * same meaning"). One plain-English meaning per fact id (factsOfQuestion.ts CaseFact; the full table, with who asks and
 * who reads each, is in the owner's review folder). A new fact id must declare its meaning here (the type requires
 * it), and test:fact-meanings fails when two ids declare the same meaning: the same real-world fact under two ids is
 * how one fact gets asked twice. Suspected duplicates already in the record are listed for the owner's decision, not
 * merged (DUPLICATES_UNDER_REVIEW); this file says each id's meaning as it is used today.
 */
import type { CaseFact } from "./factsOfQuestion";

export const FACT_MEANINGS: Readonly<Record<CaseFact, string>> = {
  situation: "where the person is with the case at the start: starting one, served, or a case already going",
  side: "whether the person is bringing the case or responding to it",
  court: "which court the case is in",
  stage: "the step of the court process the case is at now",
  filed: "whether anything has been filed with the court yet",
  defenceFiled: "whether a defence or answer has been filed",
  defendantsClaim: "whether the person being sued is making a claim of their own back (a defendant's claim)",
  claimServed: "whether the plaintiff has served the claim on the defendant",
  papers: "which court papers the person was served with",
  servedDate: "the day the person received the papers that started the case",
  serviceMethod: "how the papers were delivered",
  amount: "the amount of money claimed",
  otherParty: "the other party's name",
  children: "the children in the case",
  married: "whether the person and the other person were married to each other",
  claimKind: "what kind of claim or case it is",
  wants: "what the person wants the court to order",
  whenHappened: "when the events that led to the case happened",
  evidence: "the evidence the person has",
  agreementTerms: "what was agreed with the other side, in the person's own words",
  story: "the person's own account in their words",
  urgent: "anything urgent, such as a deadline this week",
  courtFileNumber: "the court file number on the papers",
  courtDate: "the next court date",
  conferenceDate: "the date of a scheduled conference",
  claimIssuedDate: "the date on the issued claim",
  defenceFiledDate: "the date a defence was filed",
  marriedWhere: "where the marriage took place",
  outcome: "what the person being sued wants for themselves, in their words",
  filedDocuments: "which documents have been filed or exist",
  safety: "safety worries: threats, violence, or a child's safety",
  publication: "in a defamation claim, the words said or written, who received them, and when",
  twentyDaysPassed: "whether twenty days have passed since the defendant was served",
  notedInDefault: "for a plaintiff, how and when the defendant was served and whether default was asked for",
  responseFacts: "which facts in the claim the person being sued agrees and disagrees with",
  admission: "any part of the claim the person being sued accepts owing",
  completionDate: "the date agreed for the work to be finished",
  noticeToContractor: "whether the contractor was told of the problem before someone else was hired",
  timeline: "in a family case, the important dates in order",
  livingSituation: "where everyone lives now and who the children live with",
  livingHistory: "past caregiving and living arrangements",
  property: "in a family case, details of the home, property and financial disclosure",
  adoption: "details of an adoption",
  missingEvidence: "evidence the person does not have yet",
  yourLastName: "the person's own last name (a one-word name gives only the first)",
  otherPartyLastName: "the other party's last name (a one-word name gives only the first)",
  courtLocation: "which Small Claims court office the claim is filed at",
  paymentHistory: "what has been paid on the debt, and when",
  damagesBreakdown: "what the losses claimed are made up of",
  deadlineDetails: "a deadline the person knows of in the case",
  settlementEfforts: "what the person has tried to settle it",
  yourName: "the person's own name",
  divorceSought: "whether the person is asking a court for a divorce",
  cohabitation: "when the person and the other person lived together",
  municipality: "the municipality the person lives in",
  otherPartyMunicipality: "the municipality the other person lives in",
};

/**
 * Suspected duplicates found 19 Nov 2026 (the owner's review folder, fact-table.md, D1-D20): different ids, or
 * different stored values, that may hold the same real-world fact. NOT merged: the owner decides each. Listed so the
 * check can say which are known and which are new.
 */
export const DUPLICATES_UNDER_REVIEW: readonly (readonly string[])[] = [
  ["whenHappened", "sc-date-injury"],
  ["municipality", "home city (story.location)", "your own Parties city", "Form 7A plaintiff city"],
  ["court", "the reading's 'Where this seems to belong'"],
  ["safety", "urgent", "someone about to move away with a child"],
  ["otherParty", "Parties names"],
  ["amount", "lost pay and costs lines", "wants (money breakdown)"],
  ["wants", "outcome"],
  ["defendantsClaim", "outcome"],
  ["filed", "papers", "stage", "defenceFiled", "filedDocuments"],
  ["servedDate", "situation receivedOn", "Family timeline"],
  ["married", "triage marriedToOtherParty", "family.married"],
  ["children", "livingSituation"],
  ["timeline (Family)", "timeline (Small Claims form = whenHappened)"],
  ["courtFileNumber", "claimNumber (Small Claims form)"],
  ["yourName", "your own Parties names"],
];

/** A meaning compared without case, punctuation, or the small words, so a rewording that says the same thing still matches. */
export function meaningKey(meaning: string): string {
  const small = new Set(["the", "a", "an", "of", "to", "or", "and", "in", "on", "for", "is", "it", "their", "that", "with", "whether", "what", "which", "s"]);
  return meaning.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((word) => word && !small.has(word)).sort().join(" ");
}
