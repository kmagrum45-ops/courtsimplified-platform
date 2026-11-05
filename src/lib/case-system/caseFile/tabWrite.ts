/**
 * THE TAB'S HALF OF THE ONE WRITER: WHICH FACTS A SAVE ANSWERS (case core G2; CASE_CORE_DESIGN.md §10; founder,
 * 4 Nov: "a fact id for every answer").
 *
 * A screen saves a field of the checkpoint (section, field). Through the browser writer (app/_components/caseWrite.ts)
 * this says which facts that save answers, by the one field-to-fact table (fieldFacts.ts factOfField), and records
 * each in the change record, the tab's buffer of unsent edits that IntakeRecovery sends to POST /api/cases/facts,
 * where the server numbers it (pendingFacts.ts). So every answer saved from these screens reaches the fact record
 * under its fact id, and the server's order decides which answer is newest.
 *
 *   - an answer (a value the case file can read) is recorded, unless the change record or the saved fact record
 *     already holds that same answer;
 *   - a box emptied that held an answer records a removal (founder, 2 Nov: "an emptied box is always a removal");
 *   - "not sure" is not recorded here: it lives in the case file's own `unsure` record, keyed by fact already;
 *   - a field the table names as holding no fact (bookkeeping, page state) records nothing;
 *   - a field the table has no row for is refused (UnmappedField): no answer is saved without a decision on its fact;
 *   - a field or key that asks for two facts (compound) records nothing (a value written twice would be two facts);
 *   - the start answers (side, court, stage, papers) and the story change only through their own questions, as in
 *     caseFile.ts followAnswer, and the nine question facts that are not slots yet (evidence, serviceMethod, ...) wait
 *     until the change record can hold them.
 * `facts`: facts a value holds inside a field with no fact of its own (Family keeps the day of service in its
 * Timeline), named by the caller and checked against FACT_IDS.
 *
 * Pure: no React, no network. States no law.
 */
import { CASE_FILE_SECTION, changesOf, emptyCaseFile, give, seenSeqOf, SLOT_FACTS, withChange, type CaseFile, type FactChanges, type SlotFact } from "./caseFile";
import { factRecordsOf, isFactId, type FactId } from "./factRecord";
import { factOfField, fieldRow } from "./fieldFacts";
import { isUnsureAnswer } from "./unsureAnswer";

/** A save of a field the field-to-fact table has no row for. */
export class UnmappedField extends Error {
  constructor(section: string, field: string) {
    super(`No row in the field-to-fact table (fieldFacts.ts) for ${section}.${field}: decide which fact it holds before saving it.`);
    this.name = "UnmappedField";
  }
}

export type AnswerWrite = { section: string; field: string; before: unknown; after: unknown; facts?: Partial<Record<FactId, unknown>> };

/** The start answers and the story: changed only through their own questions (caseFile.ts followAnswer). */
const OWN_PATH: ReadonlySet<string> = new Set(["side", "court", "stage", "papers", "story"]);
const isSlot = (fact: string): fact is SlotFact => (SLOT_FACTS as readonly string[]).includes(fact);
const object = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const blank = (value: unknown) => value === undefined || value === null || (typeof value === "string" && !value.trim()) || (Array.isArray(value) && value.length === 0);
const changeable = (value: unknown): value is string | number | boolean | string[] =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean" || (Array.isArray(value) && value.every((item) => typeof item === "string"));

/** A value as the case file reads it for a fact (an amount "$2,400" is 2400); undefined when it gives no answer. */
function readAs(fact: SlotFact, value: unknown): unknown {
  const file = emptyCaseFile();
  give(file, fact, value, "compare");
  return file[fact].state === "answered" ? file[fact].value : undefined;
}

/** Whether the change record or the saved fact record already holds this answer. */
function alreadyHeld(sections: Record<string, unknown>, changes: FactChanges, fact: SlotFact, value: unknown): boolean {
  const read = JSON.stringify(readAs(fact, value));
  const change = changes[fact];
  if (change) return change.state === "answered" && JSON.stringify(readAs(fact, change.value)) === read;
  const saved = factRecordsOf(sections)[fact];
  return Boolean(saved && saved.state === "answered" && JSON.stringify(saved.value) === read);
}

/** "Before" for a fact the caller named: the case file before the save says whether it held an answer. */
const NAMED = Symbol("named");

/** Each (fact, before, after) a save gives, by the field-to-fact table. Throws UnmappedField for a field with no row. */
function factsOfSave(write: AnswerWrite): [SlotFact, unknown, unknown][] {
  const row = fieldRow(write.section, write.field);
  if (!row) throw new UnmappedField(write.section, write.field);
  const pairs: [string | undefined, unknown, unknown][] =
    row.kind === "answer" ? [[undefined, write.before, write.after]]
    // A keyed container holds answers under question ids; a list (the review's "I do not know yet" marks) holds none.
    : row.kind === "keyed" && !Array.isArray(write.after) && !Array.isArray(write.before)
      ? Object.keys({ ...object(write.before), ...object(write.after) }).map((key) => [key, object(write.before)[key], object(write.after)[key]])
    : [];
  const out: [SlotFact, unknown, unknown][] = [];
  for (const [key, was, given] of pairs) {
    if (JSON.stringify(was) === JSON.stringify(given)) continue;
    const mapped = factOfField(write.section, write.field, key);
    if ("fact" in mapped && isSlot(mapped.fact) && !OWN_PATH.has(mapped.fact)) out.push([mapped.fact, was, given]);
  }
  for (const [fact, given] of Object.entries(write.facts ?? {})) {
    if (!isFactId(fact)) throw new UnmappedField(write.section, `${write.field} (fact ${fact})`);
    // Named by the caller inside a field with no fact of its own: whether it held an answer is the case file's to say.
    if (isSlot(fact) && !OWN_PATH.has(fact)) out.push([fact, NAMED, given]);
  }
  return out;
}

/**
 * The change record after a save of (section, field): each fact it answers recorded, each answered box emptied
 * recorded as a removal. `held`: the case file as it was before the save (whether an emptied box held an answer).
 * Null when the save records nothing.
 */
export function answerChanges(sections: Record<string, unknown>, write: AnswerWrite, held?: CaseFile, now: Date = new Date()): FactChanges | null {
  const facts = factsOfSave(write);
  let next: FactChanges | null = null;
  for (const [fact, was, given] of facts) {
    const current = next ?? changesOf(sections);
    if (given === "not-sure" || isUnsureAnswer(given)) continue;
    const value = Array.isArray(given) ? given.filter((item) => item !== "not-sure") : given;
    if (blank(value)) {
      // Emptied: a removal, when the box held something and the fact is held answered (recorded or from another place).
      const recorded = current[fact];
      const heldAnswered = recorded ? recorded.state === "answered" : held?.[fact].state === "answered";
      if ((was === NAMED || !blank(was)) && heldAnswered) next = withChange(current, fact, { state: "removed" }, now, seenSeqOf(sections, fact));
      continue;
    }
    if (!changeable(value) || readAs(fact, value) === undefined || alreadyHeld(sections, current, fact, value)) continue;
    next = withChange(current, fact, { state: "answered", value }, now, seenSeqOf(sections, fact));
  }
  return next;
}

export { CASE_FILE_SECTION };
