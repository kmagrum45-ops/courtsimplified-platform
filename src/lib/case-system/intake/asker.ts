/**
 * THE ONE ASKER (founder's plan, step 5, "the memory fix", 1 Nov): "built in the question engine -- the
 * one asker, not per screen: check caseFileOf before any question is shown."
 *
 * One saved record per case; one writer (`give`); one reader (`caseFileOf`); ONE ASKER: this module, used
 * by the question engine (selectQuestions.ts) and by every Small Claims screen that shows a question or a
 * box asking for a fact (the chat through the engine, the review, the form). Before a question is shown it
 * asks the case file whether the question's fact is already held:
 *   answered  the person's own answer (newest wins, through the change record): never asked again; a form
 *             box shows it (filled once, never over what the person typed, never again once they cleared it);
 *   unsure    "not sure", a skip, "I don't know": never asked again; the screen shows the quiet line;
 *   removed   the person removed it: not asked again by itself; they add it back with "Change".
 * A value guessed from the story (a slot with confirmed false, a proposal, an unticked kind) is NOT held: it
 * never hides a question and never fills a box as answered. It may only be offered as a suggestion the
 * person confirms (CLAUDE.md s. 4).
 *
 * Pure: no React, no network. States no law; changes no question's wording.
 */
import { isUnsureAnswer, slotText, SLOT_FACTS, emptyCaseFile, type CaseFile, type Slot, type SlotFact } from "../caseFile/caseFile";
import { formatForCourt } from "../dates";
// The one asker decides whether a box is held (caseFile/missingFacts.ts heldAnswer); this module only fills form boxes
// from what it holds (site owner, 23 Nov 2026: the second copies here are deleted).
import { askedFacts, heldAnswer } from "../caseFile/heldAnswer";
import { boxView } from "../caseFile/boxView";
import { factTypeOf } from "../caseFile/factTypes";

/** The person's held answer to a question, in their words as screens show them (slotText); null unless answered and confirmed. */
export function heldWords(file: CaseFile | null | undefined, questionId: string): string | null {
  const decision = heldAnswer(file, questionId);
  if (!decision || decision.held !== "answered") return null;
  const words = slotText(decision.slot, (iso) => formatForCourt(iso));
  return words.trim() && !isUnsureAnswer(words) ? words : null;
}

/**
 * The facts a Small Claims form box is filled with, when the person holds an answer: who the other party is,
 * the amount, when it happened, what they want. Named by fact, never by a form key: a box is fillable when it
 * asks for exactly one of these (askedFacts), so a box added later for one of them is filled too.
 */
/**
 * The kinds of fact a typed box holds as words: an answer of one of them, held anywhere, is put into its empty box (boxView:
 * "answered anywhere: the SAME box, pre-filled with that answer"; site owner, 24 Nov 2026). Was four named facts (the other
 * party, the amount, when it happened, what they want), so an answer held elsewhere for any other box (the evidence, what
 * was agreed) left it empty.
 */
const TYPED_KINDS = new Set(["words", "amount", "date", "name"]);
// Not the story (its own editor) nor whether anything is filed (a choice): neither is a typed box.
export const FILLABLE_FACTS: readonly SlotFact[] = SLOT_FACTS.filter((fact) => fact !== "story" && fact !== "filed" && TYPED_KINDS.has(factTypeOf(fact) ?? ""));
/** Whether a form box (by its key) is filled from the case file: it asks for exactly one fact of a typed kind. */
export function fillable(field: string): boolean {
  const facts = askedFacts(field);
  return facts.length === 1 && FILLABLE_FACTS.includes(facts[0]);
}

/**
 * The Small Claims form's boxes to fill from the case file, once: empty, never filled before in this case
 * (`filledBefore`, kept in the saved case, so a box the person cleared stays clear), and held answered by the
 * person. Never a story guess, a "not sure", or a removed answer; never over what the person typed.
 * `filledBefore` also takes the boxes that held words during this visit (seenNow): a box the person cleared,
 * to type a new value key by key, is never filled again under their keys (local carry runs 41393577468 /
 * 41393585578: "$6,400.00$7,250"). And the form's own answer is never filled back into its own box: that box
 * is the answer, so empty means the person emptied it.
 */
export function formFill(file: CaseFile | null | undefined, values: Record<string, unknown>, filledBefore: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const before = new Set(filledBefore);
  for (const field of Object.keys(values)) {
    if (!fillable(field) || before.has(field)) continue;
    const value = values[field];
    if (typeof value === "string" && value.trim()) continue;
    const decision = heldAnswer(file, field);
    if (decision && decision.slot.source?.kind === "answer" && decision.slot.source.question === `small-claims:${field}`) continue;
    const words = heldWords(file, field);
    // What the box shows, from the one table (caseFile/boxView.ts): the held answer, pre-filled into the empty box.
    const fill = words ? boxView({ state: "answered", words }, typeof value === "string" ? value : "").fill : null;
    if (fill) out[field] = fill;
  }
  return out;
}

/**
 * A box the fill put words in follows the person's newest answer (Chrome check of #542, 3 Nov, B3: the amount changed
 * in the review to $2,400, the form's box the fill had given "$2,650.00" kept it, and the form's own Continue would have
 * sent it). `filledWords`: the words the fill last put in each box (kept in the saved case). While a box still holds
 * exactly those words it is the fill's, not an answer of the person's: it takes the newest held words, or is emptied
 * when the fact is no longer held answered (removed, "not sure"). A box whose words differ -- typed over or cleared by
 * the person -- is theirs and is never touched; so is a box it emptied (never filled again by itself). `file`: the case
 * file, which never counts the fill's words as an answer (caseFile.ts), so a box never answers for itself.
 */
export function filledToFollow(file: CaseFile | null | undefined, values: Record<string, unknown>, filledWords: Readonly<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, words] of Object.entries(filledWords)) {
    if (!fillable(field) || !words || values[field] !== words) continue;
    const newest = heldWords(file, field) ?? "";
    if (newest !== words) out[field] = newest;
  }
  return out;
}

/** The form's boxes that have held words during this visit: those already seen, and those holding words now. */
export function seenNow(values: Record<string, unknown>, seen: readonly string[]): string[] {
  const now = Object.entries(values).filter(([, value]) => typeof value === "string" && value.trim()).map(([field]) => field);
  return [...new Set([...seen, ...now])];
}

/** The case file as the engine needs it on the server: its slots only (no story words). */
export function heldForEngine(file: CaseFile): Partial<Record<SlotFact, Slot>> {
  return Object.fromEntries(SLOT_FACTS.map((fact) => [fact, file[fact]])) as Partial<Record<SlotFact, Slot>>;
}

const SLOT_STATES = new Set(["not-asked", "answered", "unsure"]);
const isSlot = (value: unknown): value is Slot => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const slot = value as Record<string, unknown>;
  return typeof slot.state === "string" && SLOT_STATES.has(slot.state) && typeof slot.confirmed === "boolean" && (slot.removed === undefined || slot.removed === true);
};

/** The case file a request sent (heldForEngine's shape), checked slot by slot: a malformed slot holds nothing. Null when it is not an object. */
export function heldFromRequest(value: unknown): CaseFile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const file = emptyCaseFile();
  const sent = value as Record<string, unknown>;
  for (const fact of SLOT_FACTS) {
    const slot = sent[fact];
    if (isSlot(slot)) file[fact] = { state: slot.state, confirmed: slot.confirmed, ...(slot.removed ? { removed: true as const } : {}), ...(slot.value !== undefined ? { value: slot.value } : {}), ...(slot.source ? { source: slot.source } : {}) };
  }
  return file;
}


