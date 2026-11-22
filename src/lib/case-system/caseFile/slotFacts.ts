/** The case file's slots, in the order "What we have so far" shows them. Imports nothing (see caseFile.ts). */
export const SLOT_FACTS = [
  "side", "court", "stage", "filed", "papers", "servedDate", "amount", "otherParty", "children",
  "married", "marriedWhere", "claimKind", "wants", "whenHappened", "conferenceDate", "defenceFiled",
  "outcome", "defendantsClaim", "urgent", "courtDate", "safety",
  // The story, held once it is given (founder, 1 Nov: no screen asks for it again; its words are `storyText`).
  "story",
] as const;
export type SlotFact = (typeof SLOT_FACTS)[number];
