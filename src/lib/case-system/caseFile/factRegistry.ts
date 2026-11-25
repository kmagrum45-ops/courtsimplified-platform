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
 * it, every rule has its reason) and by the journey matrix's check 3, which reads these rules.
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

export type FactHome = "case-file slot" | "parties record" | "start answers" | "intake answer";
export type FactEntry = { fact: CaseFact; home: FactHome; fromStory: string | null; applies?: { when: (context: FactContext) => boolean; why: string } };

const noPapersYet = (context: FactContext) => !context.nothingFiled || context.side === "responding";
const respondingOnly = (context: FactContext) => context.side === "responding";
const NO_PAPERS_YET = "nothing has been filed with a court yet, so there are no court papers for this to be about";

/** Facts kept in the Parties record (parties/parties.ts), not as case-file slots. */
const PARTIES: readonly CaseFact[] = ["otherParty", "yourName", "yourLastName", "otherPartyLastName", "otherPartyMunicipality"];
/** Facts kept as the start's own answers (situation/situation.ts). */
const START: readonly CaseFact[] = ["situation", "side", "court", "papers"];
/** The story reader's keys (intakeReview.ts statedInStory): the facts the story itself can give, offered once. */
const FROM_STORY: Partial<Record<CaseFact, string>> = { amount: "amount", whenHappened: "whenHappened", wants: "wants", otherParty: "otherParty", servedDate: "servedDate", children: "children", married: "married", claimKind: "claimKind", evidence: "evidence" };

/** Whom a fact applies to, when not everyone (each with its reason). */
const RULES: Partial<Record<CaseFact, { when: (context: FactContext) => boolean; why: string }>> = {
  filed: { when: (context) => !(context.nothingFiled && context.side !== "responding"), why: "the person said they want to start a case, which says nothing has been filed yet (a case already filed is \"A case is already going\")" },
  claimServed: { when: noPapersYet, why: NO_PAPERS_YET },
  servedDate: { when: noPapersYet, why: NO_PAPERS_YET },
  claimIssuedDate: { when: noPapersYet, why: NO_PAPERS_YET },
  courtFileNumber: { when: noPapersYet, why: NO_PAPERS_YET },
  courtDate: { when: noPapersYet, why: NO_PAPERS_YET },
  conferenceDate: { when: noPapersYet, why: NO_PAPERS_YET },
  defenceFiledDate: { when: noPapersYet, why: NO_PAPERS_YET },
  responseFacts: { when: respondingOnly, why: "a defence response is written by the person responding to someone else's claim" },
  defendantsClaim: { when: respondingOnly, why: "a claim of the defendant's own is the responding side's" },
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

/** The registry: one entry per fact. */
export const FACT_REGISTRY: readonly FactEntry[] = ALL_FACTS.map((fact) => ({
  fact,
  home: homeOf(fact),
  fromStory: FROM_STORY[fact] ?? null,
  ...(RULES[fact] ? { applies: RULES[fact] } : {}),
}));

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
