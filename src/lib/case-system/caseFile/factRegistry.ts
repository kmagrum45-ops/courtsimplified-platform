/**
 * THE FACT REGISTRY (site owner, Round 6, PR 2, 25 Nov 2026): one entry per fact the site asks for, saying where the fact
 * lives, which questions ask it, whether the story can give it, and whom it applies to. Every screen asks the one asker
 * (missingFacts, heldAnswer, the situation's next question), and the one asker reads applicability from here, so a
 * question that does not apply to this person's side and stage is shown nowhere.
 *
 *   home         where the fact's one value is kept: the case file's slot, the Parties record, the start's answers, or the
 *                intake's own answer box (caseFile.ts reads each into the one case file).
 *   questions    the question ids that ask it, read from factsOfQuestion.ts (one copy: never listed twice).
 *   fromStory    the story reader's key when the story can give it (intakeReview.ts statedInStory), else none.
 *   applies      whom it applies to, with the reason. A fact with no rule applies to everyone. Each rule is a plain fact
 *                about the case: no court papers exist when nothing has been filed, and only the person responding has a
 *                defence to write. A rule states no law and decides no procedure (that is the stage map's).
 *
 * Pure: no React, no network. Checked by test:fact-registry (every fact has an entry, every question id it names asks
 * it, every rule has its reason, every fact any screen can ask is registered). The journey matrix's check 3 does NOT
 * read these rules: it compares with each story's own list, written from the stage map (matrixStories.ts mustNotAsk).
 *
 * NEXT REGISTRY STEP (not done yet: these facts still have no rule, so they apply to everyone). Each should depend on
 * the claim kind, the court or the stage, and gets its rule, with its reason, in its own PR with the matrix row that
 * shows it asked where it does not apply:
 *   by claim kind   paymentHistory (a debt or loan), agreementTerms (a contract or agreement), publication (defamation),
 *                   completionDate and noticeToContractor (a contractor's work), damagesBreakdown (a claim for money);
 *   by court        children, married, marriedWhere, divorceSought, cohabitation, property, adoption, livingSituation,
 *                   livingHistory, safety (Family);
 *   by side         admission (the person responding), twentyDaysPassed and notedInDefault (the person bringing the
 *                   case, once the claim is served);
 *   by stage        defenceFiled and serviceMethod (once something is filed, as the court papers' dates already are),
 *                   settlementEfforts and deadlineDetails (the steps of the stage map that ask them).
 */
import { SLOT_FACTS } from "./slotFacts";
import type { CaseFact } from "./factsOfQuestion";

/** What the registry needs to know about a case to say whether a fact applies. */
export type FactContext = {
  court: "small-claims" | "civil" | "family" | null;
  /** The person's side: bringing the case, or responding to one. */
  side: "bringing" | "responding" | null;
  /** Nothing has been filed with a court yet (the person said they are starting a case). */
  nothingFiled: boolean;
};

export type FactHome = "case-file slot" | "parties record" | "start answers" | "intake answer" | "step dates" | "uploaded documents";
export type FactEntry = { fact: CaseFact | string; home: FactHome; fromStory: string | null; applies?: { who: string; when: (context: FactContext) => boolean; why: string } };

const papersExist = (context: FactContext) => !context.nothingFiled || context.side === "responding";
const respondingOnly = (context: FactContext) => context.side === "responding";
const NO_PAPERS_YET = "nothing has been filed with a court yet, so there are no court papers for this to be about";

/** Facts kept in the Parties record (parties/parties.ts), not as case-file slots. */
const PARTIES: readonly CaseFact[] = ["otherParty", "yourName", "yourLastName", "otherPartyLastName", "otherPartyMunicipality"];
/** Facts kept as the start's own answers (situation/situation.ts). */
const START: readonly CaseFact[] = ["situation", "side", "court", "papers"];
/** The story reader's keys (intakeReview.ts statedInStory): the facts the story itself can give, offered once. */
const FROM_STORY: Partial<Record<CaseFact, string>> = { amount: "amount", whenHappened: "whenHappened", wants: "wants", otherParty: "otherParty", servedDate: "servedDate", children: "children", married: "married", claimKind: "claimKind", evidence: "evidence" };

/** Whom a fact applies to, when not everyone (each with its reason). */
const RULES: Partial<Record<CaseFact, { who: string; when: (context: FactContext) => boolean; why: string }>> = {
  filed: { who: "anyone except a person who said they want to start a case", when: (context) => !(context.nothingFiled && context.side !== "responding"), why: "the person said they want to start a case, which says nothing has been filed yet (a case already filed is \"A case is already going\")" },
  claimServed: { who: "once something is filed, or the person is responding", when: papersExist, why: NO_PAPERS_YET },
  servedDate: { who: "once something is filed, or the person is responding", when: papersExist, why: NO_PAPERS_YET },
  claimIssuedDate: { who: "once something is filed, or the person is responding", when: papersExist, why: NO_PAPERS_YET },
  courtFileNumber: { who: "once something is filed, or the person is responding", when: papersExist, why: NO_PAPERS_YET },
  courtDate: { who: "once something is filed, or the person is responding", when: papersExist, why: NO_PAPERS_YET },
  conferenceDate: { who: "once something is filed, or the person is responding", when: papersExist, why: NO_PAPERS_YET },
  defenceFiledDate: { who: "once something is filed, or the person is responding", when: papersExist, why: NO_PAPERS_YET },
  responseFacts: { who: "the person responding", when: respondingOnly, why: "a defence response is written by the person responding to someone else's claim" },
  defendantsClaim: { who: "the person responding", when: respondingOnly, why: "a claim of the defendant's own is the responding side's" },
};

const ALL_FACTS: readonly CaseFact[] = [
  "situation", "side", "court", "stage", "filed", "defenceFiled", "defendantsClaim", "claimServed", "papers", "servedDate", "serviceMethod",
  "amount", "otherParty", "children", "married", "claimKind", "wants", "whenHappened", "evidence", "agreementTerms", "story", "urgent",
  "courtFileNumber", "courtDate", "conferenceDate", "claimIssuedDate", "defenceFiledDate", "marriedWhere", "outcome", "filedDocuments",
  "safety", "yourLastName", "otherPartyLastName", "courtLocation", "paymentHistory", "damagesBreakdown", "deadlineDetails",
  "settlementEfforts", "publication", "twentyDaysPassed", "notedInDefault", "responseFacts", "admission", "completionDate",
  "noticeToContractor", "timeline", "livingSituation", "livingHistory", "property", "adoption", "missingEvidence", "yourName",
  "divorceSought", "cohabitation", "municipality", "otherPartyMunicipality",
];

const homeOf = (fact: CaseFact): FactHome =>
  PARTIES.includes(fact) ? "parties record" : START.includes(fact) ? "start answers" : (SLOT_FACTS as readonly string[]).includes(fact) ? "case-file slot" : "intake answer";

/**
 * Facts asked by an id of their own (factsOfQuestion: an id it does not map asks its own fact), each written here by hand
 * so a new one fails test:fact-registry until it is entered (fail closed): never registered by being listed elsewhere.
 *   step dates          the step page's date questions (casePosition.ts dateQuestionsForStep): each asked only on the
 *                       stage map's step it belongs to, so the map decides where it applies;
 *   uploaded documents  the files the person uploaded, shown on the review;
 *   intake answer       the review's own boxes for Civil and Family details.
 */
const STEP_DATES: readonly string[] = [
  "case-date-order-made", "sc-date-defendants-claim-served", "sc-date-learned-of-judgment", 
  "case-date-motion-hearing-date", "case-date-defence-served", "case-date-sc-dismissal-notice-received", 
  "case-date-third-party-defence-served", "case-date-struck-off-trial-list", 
  "case-date-action-dismissed-for-delay", "case-date-action-discontinued", "case-date-writ-issued", 
  "case-date-third-party-claim-issued", "case-date-defence-to-counterclaim-served", 
  "case-date-served-with-third-party-claim", "case-date-served-with-crossclaim", 
  "case-date-served-with-removal-order", "case-date-served-with-amended-pleading", 
  "case-date-discovery-answer-given", "case-date-mediation-session-date", 
  "case-date-served-with-request-to-admit", "case-date-served-with-motion-material", 
  "case-date-appeal-hearing-date", "case-date-leave-motion-record-served", "case-date-set-down-for-trial", 
  "case-date-served-with-notice-of-appeal", "case-date-notice-of-appeal-filed", 
  "case-date-transcript-ready-notice", "case-date-served-with-appeal-materials", "case-date-spouse-died", 
  "case-date-answer-served", "case-date-automatic-order-issued", 
  "case-date-notice-of-approaching-dismissal-served", "case-date-disclosure-requested", 
  "case-date-motion-form-served", "case-date-draft-order-served", "case-date-costs-submissions-requested", 
  "case-date-served-with-notice-of-default-hearing", "case-date-documents-requested", 
  "case-date-served-with-amended-application", "case-date-appellant-record-served", 
  "case-date-licence-suspension-first-notice-served", "case-date-served-with-notice-of-garnishment", 
  "case-date-stay-or-dismiss-notice-received", "case-date-stay-or-dismiss-submission-received", 
  "case-date-childrens-lawyer-report-served", "case-date-served-with-request-for-financial-statement", 
  "case-date-served-with-order-for-financial-statement", "case-date-bjdr-hearing-date", 
  "case-date-questioning-date", "case-date-financial-examination-date", "sc-date-learned-of-default"
];
const UPLOADED: readonly string[] = ["uploadedEvidenceFiles", "uploadedFiles", "evidenceFiles"];
const REVIEW_BOXES: readonly string[] = [
  "existingOrderDate", "humanRightsGrounds", "discriminationFacts", "accommodationRequests", "governmentActor", 
  "publicDecisionOrConduct", "institutionalFacts", "privacyRecordsFacts", "limitationDeadline", 
  "defendantAddress"
];

/** The registry: one entry per fact. */
export const FACT_REGISTRY: readonly FactEntry[] = [
  ...ALL_FACTS.map((fact) => ({ fact, home: homeOf(fact), fromStory: FROM_STORY[fact] ?? null, ...(RULES[fact] ? { applies: RULES[fact] } : {}) })),
  ...STEP_DATES.map((fact) => ({ fact, home: "step dates" as const, fromStory: null })),
  ...UPLOADED.map((fact) => ({ fact, home: "uploaded documents" as const, fromStory: null })),
  ...REVIEW_BOXES.map((fact) => ({ fact, home: "intake answer" as const, fromStory: null })),
];

/** Whether a fact applies to this case: true unless its rule says otherwise. The one place this is decided. */
export function factApplies(fact: string, context: FactContext): boolean {
  const entry = FACT_REGISTRY.find((item) => item.fact === fact);
  return entry?.applies ? entry.applies.when(context) : true;
}

/** A question applies when every fact it asks applies (a question asking a fact that does not apply is shown nowhere). */
export function questionApplies(facts: readonly string[], context: FactContext): boolean {
  return facts.every((fact) => factApplies(fact, context));
}

/**
 * The context, read from the one case file: its court, the person's side and whether anything is filed, each only when
 * the file holds it as answered (a start answer counts). Unknown stays unknown: nothing is ruled out on a guess.
 */
export function contextOfFile(file: unknown): FactContext {
  const slots = (file && typeof file === "object" ? file : {}) as Record<string, { state?: string; value?: unknown } | undefined>;
  const held = (fact: string) => (slots[fact]?.state === "answered" ? slots[fact]?.value : undefined);
  const court = held("court");
  const side = held("side");
  return {
    court: court === "small-claims" || court === "civil" || court === "family" ? court : null,
    side: side === "bringing" || side === "responding" ? side : null,
    nothingFiled: held("filed") === false && side !== "responding",
  };
}
