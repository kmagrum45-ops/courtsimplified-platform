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
import { CASE_FILE_SECTION, caseFileOf, heldOtherName, seenSeqOf, withChange, type ChangeInput, type SlotFact } from "../../src/lib/case-system/caseFile/caseFile";
import { discardPending, savePending } from "../../src/lib/case-system/caseFile/pendingFacts";
import { answerChanges, UnmappedField } from "../../src/lib/case-system/caseFile/tabWrite";
import { fieldRow } from "../../src/lib/case-system/caseFile/fieldFacts";
import type { FactId } from "../../src/lib/case-system/caseFile/factRecord";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { partyName, readParties, withoutHeldElsewhere, type PartiesRecord } from "../../src/lib/case-system/parties/parties";
import { PARTIES_PENDING } from "../../src/lib/case-system/caseFile/serverFacts";
import { PARTY_DETAIL_TYPES, partyDetailFits } from "../../src/lib/case-system/caseFile/factTypes";
import { offerChoiceParts, OFFER_CHOICES_FIELD, type OfferChoice, type OfferTarget } from "../../src/lib/case-system/caseFile/offerChoice";

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

/**
 * A form box following the newest saved answer (AskedField.tsx useBoxesFollow, boxFollow.ts): the form's copy takes the
 * answer's words. Not an answer: no change is recorded, the confirmation is untouched, nothing is sent (touched=false);
 * the box is told (external), so it shows the words at once.
 */
export function writeFollow(recovery: CaseWriteRecovery, section: string, field: string, value: unknown): void {
  recovery.put(section, field, value, false, true);
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

/**
 * The person typing in a box of a whole form (Small Claims keeps its boxes in `small-claims.input`): the box's new
 * words, saved into the form's input as it is held (the story has its own path). Through the one writer, so every fact a
 * typed box holds is sent and numbered by the server (Chrome check of #544, 6 Nov, F1: saved as the form's own copy,
 * a box typed over the words the form was filled with was never numbered, and a restart from the story brought an older
 * answer back; test:whole-form-record).
 */
export function writeFormBox(recovery: CaseWriteRecovery, section: string, field: string, value: unknown): void {
  const saved = recovery.read(section, "input");
  writeAnswer(recovery, section, "input", { ...(saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {}), [field]: value });
}

/**
 * The parties (site owner, 14 Nov 2026, rule 1): the whole record, saved into the case record's own section
 * (CASE_FILE_SECTION.parties), where caseFileOf reads it. The one place parties are written: the Parties step
 * (PartiesStep.tsx) calls this and nothing else. Checked before it is saved (parties.ts readParties): a record that is
 * not well formed is refused, never half-saved.
 */
export function writeParties(recovery: CaseWriteRecovery, record: PartiesRecord): void {
  // What was read from another place (the home page's city, the chat's name) is shown, never saved here (C9).
  const checked = readParties(JSON.parse(JSON.stringify({ ...record, list: record.list.map(withoutHeldElsewhere) })));
  if (!checked) throw new Error("The parties could not be saved: the record is not well formed.");
  // A detail written now keeps only a value of its type: a place is never a name (factTypes.ts; decision 1, 18 Nov 2026).
  // Only what changed is checked, so a record saved before the rule is still read and saved as it was.
  const before = readParties(recovery.read(CASE_FILE_SECTION, "parties"));
  // The other side's name the case holds from ANOTHER place (the chat, the review, the questions), read before this save:
  // as the case file reads it, or as the fact record holds it (the tab's newer unsent change, else the server's record). The
  // record's copy is the one every page shows, and the case file names an older case's other party "from the parties"
  // (caseFile.ts, question "parties"), so heldOtherName alone missed it (local run of chrome-545-round, 24 Nov 2026).
  const recordName = (() => {
    const object = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
    const entry = (object(recovery.read(CASE_FILE_SECTION, "changes")).otherParty ?? object(recovery.read(CASE_FILE_SECTION, "facts")).otherParty) as { state?: unknown; value?: unknown } | undefined;
    return entry?.state === "answered" && typeof entry.value === "string" ? entry.value.trim() : "";
  })();
  const elsewhere = heldOtherName(caseFileOf(recovery.getReview().checkpoint, recovery.getSavedMaster() ?? undefined)) || recordName;
  for (const party of checked.list) {
    const was = before?.list.find((item) => item.id === party.id);
    for (const [detail, value] of Object.entries(party.details)) {
      if (typeof value !== "string" || !value.trim() || (was?.details as Record<string, unknown> | undefined)?.[detail] === value) continue;
      if (!partyDetailFits(detail, value)) throw new Error(PARTY_DETAIL_TYPES[detail as keyof typeof PARTY_DETAIL_TYPES] === "name" ? `“${value.trim()}” cannot be a name here: it is a place or a question. Type the name, or leave it empty.` : `“${value.trim()}” does not fit this box.`);
    }
  }
  recovery.put(CASE_FILE_SECTION, "parties", checked, true, true, true);
  // Not sent yet: the tab sends the record to the server by itself (POST /api/cases/facts), which numbers it, before any
  // save of its whole checkpoint (serverFacts.ts PARTIES_PENDING; site owner's choice, 24 Nov 2026).
  recovery.put(CASE_FILE_SECTION, PARTIES_PENDING, true, true, true, true);
  // The same rule as every form box (caseFile.ts followAnswer; tabWrite.ts answerChanges): a name given here where the
  // case holds another from another place is the newest answer to that fact, recorded as its change (sent and numbered
  // like any answer); the name emptied here, part by part, records its removal. A first name, with none held, records
  // nothing more than the Parties record. Before this, a name changed on the Parties step left the old one in the case
  // file, the review and the case page (chrome-545-round, CI on d8cba8f5).
  if (elsewhere) {
    // Read from the record as the step shows it (with the parts held elsewhere), so a changed first name keeps the held last name.
    const others = record.list.filter((party) => party.side === "other");
    if (others.length === 1) {
      const now = partyName(others[0]).trim();
      const emptied = !now && others[0].unsure.some((detail) => detail === "firstName" || detail === "lastName" || detail === "fullName" || detail === "companyName");
      if (now && now !== elsewhere) writeChange(recovery, "otherParty", { state: "answered", value: now });
      else if (emptied) writeChange(recovery, "otherParty", { state: "removed" });
    }
  }
}

/**
 * The person's No or I'm not sure on an offer (site owner, 14 Nov 2026; offerChoice.ts): kept under the offer's key, and
 * for "I'm not sure" on an offer for a fact, that fact settled "not sure" in the change record (sent to the server like
 * every edit). The one place an offer's choice is written for a screen with the intake's save (offerChoiceSave.ts).
 */
export function writeOfferChoice(recovery: CaseWriteRecovery, target: OfferTarget, choice: OfferChoice): void {
  const seen = target.fact ? seenSeqOf({ [CASE_FILE_SECTION]: { facts: recovery.read(CASE_FILE_SECTION, "facts") } }, target.fact) : undefined;
  const parts = offerChoiceParts({ offerChoices: recovery.read(CASE_FILE_SECTION, OFFER_CHOICES_FIELD), changes: recovery.read(CASE_FILE_SECTION, "changes") }, target, choice, new Date(), seen, caseFileOf(recovery.getReview().checkpoint, recovery.getSavedMaster() ?? undefined));
  recovery.put(CASE_FILE_SECTION, OFFER_CHOICES_FIELD, parts.offerChoices, true, true, true);
  if (parts.changes) recovery.put(CASE_FILE_SECTION, "changes", parts.changes, true, true, true);
}
