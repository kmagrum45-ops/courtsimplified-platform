/**
 * THE BROWSER'S ONE WRITER (case core G2; CASE_CORE_DESIGN.md §10; founder, 4 Nov: "a fact id for every answer").
 *
 * Every save of case data from the review (IntakeReviewPanel), "Change" (ChangeAnswer), "Not saved yet" (NotSavedYet)
 * and the chat's "Use the suggestion" goes through here, never through recovery.put itself (test:one-writer fails
 * on a new direct save). One call:
 *   1. refuses a field the field-to-fact table (fieldFacts.ts) has no row for (UnmappedField);
 *   2. writes the screen's old copy, so the screens that still read it keep working (design §11, coexistence);
 *   3. for a field that holds a fact, records the answer -- or a removal, for an answered box emptied -- in the change
 *      record (caseFile/tabWrite.ts answerChanges), which IntakeRecovery sends to POST /api/cases/facts, where the
 *      server numbers it; so the server's order decides which answer is newest (G2(a)).
 * "Change" and "Not saved yet" write the change record itself, here too.
 *
 * Plain functions over the recovery's read/put, so test:review-writer runs them on a stand-in. States no law.
 */
import { CASE_FILE_SECTION, caseFileOf, seenSeqOf, withChange, type ChangeInput, type SlotFact } from "../../src/lib/case-system/caseFile/caseFile";
import { discardPending, savePending } from "../../src/lib/case-system/caseFile/pendingFacts";
import { answerChanges, UnmappedField } from "../../src/lib/case-system/caseFile/tabWrite";
import { fieldRow } from "../../src/lib/case-system/caseFile/fieldFacts";
import type { FactId } from "../../src/lib/case-system/caseFile/factRecord";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

/** The parts of the intake recovery the writer uses (IntakeRecovery's value, or a stand-in in the checks). */
export type CaseWriteRecovery = {
  read(section: string, key: string): unknown;
  put(section: string, key: string, value: unknown, touched?: boolean, external?: boolean, fromReview?: boolean, reaffirm?: true | string): void;
  getReview(): { checkpoint: Checkpoint };
  getSavedMaster(): Record<string, unknown> | null;
};

/**
 * `touched`: false for a value the screen registers that the person did not give (a default, bookkeeping kept beside
 * an answer): its old copy is written and nothing is recorded. `facts`: facts a value holds inside a field with no fact
 * of its own (Family's day of service in its Timeline). The rest are recovery.put's own.
 */
export type WriteOptions = { touched?: boolean; external?: boolean; fromReview?: boolean; reaffirm?: true | string; facts?: Partial<Record<FactId, unknown>> };

/** Saves (section, field) and records the facts it answers. Throws UnmappedField for a field with no row. */
export function writeAnswer(recovery: CaseWriteRecovery, section: string, field: string, value: unknown, options: WriteOptions = {}): void {
  if (!fieldRow(section, field)) throw new UnmappedField(section, field);
  const touched = options.touched ?? true;
  const before = recovery.read(section, field);
  // The case file before the save: whether an emptied box held an answer.
  const held = touched ? caseFileOf(recovery.getReview().checkpoint, recovery.getSavedMaster() ?? undefined) : undefined;
  recovery.put(section, field, value, touched, options.external ?? false, options.fromReview ?? false, options.reaffirm);
  if (!touched) return;
  const after: unknown = JSON.parse(JSON.stringify(value instanceof Set ? [...value] : value ?? null));
  const changes = answerChanges(recovery.getReview().checkpoint.sections, { section, field, before, after, facts: options.facts }, held);
  if (changes) recovery.put(CASE_FILE_SECTION, "changes", changes, true, options.external ?? false, options.fromReview ?? false);
}

/** "Change" on a fact: the person's newest answer, or its removal, with the server's number for it as this tab saw it. */
export function writeChange(recovery: CaseWriteRecovery, fact: SlotFact, change: ChangeInput): void {
  const seen = seenSeqOf({ [CASE_FILE_SECTION]: { facts: recovery.read(CASE_FILE_SECTION, "facts") } }, fact);
  recovery.put(CASE_FILE_SECTION, "changes", withChange(recovery.read(CASE_FILE_SECTION, "changes"), fact, change, new Date(), seen), true, true, true);
}

/** "Not saved yet": "Save" sends the waiting edit as the newest save; "Discard" drops it and the saved answer stands. */
export function choosePending(recovery: CaseWriteRecovery, fact: SlotFact, keepMine: boolean): void {
  const current = recovery.read(CASE_FILE_SECTION, "changes");
  recovery.put(CASE_FILE_SECTION, "changes", keepMine ? savePending(current, fact) : discardPending(current, fact), true, true, true);
}
