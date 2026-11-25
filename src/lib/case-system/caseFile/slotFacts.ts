/** The case file's slots, in the order "What we have so far" shows them. Imports nothing (see caseFile.ts). */
export const SLOT_FACTS = [
  "side", "court", "stage", "filed", "papers", "servedDate", "amount", "otherParty", "children",
  "married", "marriedWhere", "claimKind", "wants", "whenHappened", "conferenceDate", "defenceFiled",
  "outcome", "defendantsClaim", "urgent", "courtDate", "safety",
  // How the papers were served, and the evidence: one fact each across the Small Claims chat, its form, the step page and
  // the court chat (C9, 23 Nov 2026).
  "serviceMethod", "evidence",
  // What was agreed, in the person's words (the Small Claims depth questions and the AI's terms question; C9, 23 Nov 2026).
  "agreementTerms",
  // The story, held once it is given (founder, 1 Nov: no screen asks for it again; its words are `storyText`).
  "story",
] as const;
export type SlotFact = (typeof SLOT_FACTS)[number];
