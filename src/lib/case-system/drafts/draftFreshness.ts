/**
 * IS A DRAFT STILL WHAT THE CASE SAYS? (Chrome pass 2 on #550, C.5, 17 Nov 2026: the Form 7A draft made before the
 * amount was changed still said "$5,468.45" and "Payment of $5,000 for pain and suffering…", with no notice that it
 * was out of date.)
 *
 * A draft made from the case keeps, beside its parts, the case's facts in words as they were when it was made
 * (`madeFrom`, saved with the draft; additive: a draft saved before has none and is never called out of date). The
 * drafts page compares them with the case file now and says which changed. The draft itself is the person's own
 * document and is never rewritten: they start a new one from the case, or edit this one.
 *
 * The case file is the one source (caseFile.ts caseFileOf); the other side's names come from the Parties record
 * (otherSideWords), as on the case page. The story is kept as a short fingerprint, not its words.
 * test:stale-copies runs it.
 */
import { otherSideWords, type CaseFile, type SlotFact } from "../caseFile/caseFile";
import { heldWordsOf } from "../caseFile/caseFileOfMaster";

/** The case's facts in words, as a draft records them when it is made. */
export type MadeFrom = Partial<Record<SlotFact, string>>;
export type DraftChange = { fact: SlotFact; then: string; now: string };

/** A short fingerprint of the story (FNV-1a): a changed story is noticed without the story's words being copied again. */
function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (const char of text.replace(/\s+/g, " ").trim()) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `story:${hash.toString(16)}`;
}

/**
 * The facts a draft is written from (the story, who, how much, when, what is wanted, the kind of claim and the Family
 * facts). Where the case is (side, court, stage, filed, papers, dates of steps, urgent, safety) moves on as the case
 * does and changes no draft, so it never calls one out of date.
 */
export const DRAFT_FACTS = ["story", "amount", "otherParty", "whenHappened", "wants", "outcome", "claimKind", "children", "married", "marriedWhere", "servedDate", "defendantsClaim"] as const satisfies readonly SlotFact[];

function wordsOf(file: CaseFile, fact: SlotFact): string {
  const held = heldWordsOf(file, fact);
  if (!held.held || !held.words.trim()) return "";
  if (fact === "story") return fingerprint(held.words);
  if (fact === "otherParty") return otherSideWords(file) ?? held.words.trim();
  return held.words.trim();
}

/** What the case says now, fact by fact, for a draft being made from it. Only facts it holds an answer for. */
export function madeFromOf(file: CaseFile): MadeFrom {
  const made: MadeFrom = {};
  for (const fact of DRAFT_FACTS) {
    const words = wordsOf(file, fact);
    if (words) made[fact] = words;
  }
  return made;
}

/**
 * What changed since the draft was made: each fact it was made with whose words are different now (removed, or "not
 * sure" now, reads as now ""). A draft with no record of what it was made from (blank, or saved before) has none.
 */
export function draftChanges(madeFrom: MadeFrom | undefined, file: CaseFile): DraftChange[] {
  if (!madeFrom) return [];
  const changes: DraftChange[] = [];
  for (const fact of DRAFT_FACTS) {
    const then = madeFrom[fact];
    if (then === undefined) continue;
    const now = wordsOf(file, fact);
    if (now !== then) changes.push({ fact, then: fact === "story" ? "" : then, now: fact === "story" ? "" : now });
  }
  return changes;
}

/** Validates a stored `madeFrom` (the drafts route and readCaseDrafts): known facts, short strings; anything else dropped. */
export function readMadeFrom(raw: unknown): MadeFrom | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const made: MadeFrom = {};
  for (const fact of DRAFT_FACTS) {
    const value = (raw as Record<string, unknown>)[fact];
    if (typeof value === "string" && value.length <= 2_000) made[fact] = value;
  }
  return Object.keys(made).length ? made : undefined;
}

/**
 * A draft as shown (site owner, 19 Nov 2026; Chrome pass 3 on #550, CA-4: a Form 7A draft made before the amount changed
 * still said $5,468.45, with no notice): one the person has not changed (edited === false) is built from the case as it is
 * now, by `fresh` (the same builder that made it); one they changed, or an older draft that does not say, keeps their words
 * and is said to be out of date (draftChanges). Pure: shown, never saved by being shown.
 */
export function draftToShow<D extends { sections: unknown[]; madeFrom?: MadeFrom; edited?: boolean }>(draft: D, file: CaseFile, fresh: (draft: D) => { sections: D["sections"] } | null): D {
  if (draft.edited !== false || !draftChanges(draft.madeFrom, file).length) return draft;
  const made = fresh(draft);
  return made ? { ...draft, sections: made.sections, madeFrom: madeFromOf(file) } : draft;
}
