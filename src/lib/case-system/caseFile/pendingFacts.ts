/**
 * THE TAB'S UNSENT EDITS, AND WHAT HAPPENS WHEN THE SERVER ANSWERS (case core G2(b), G2(c); CASE_CORE_DESIGN.md §4, §12).
 *
 * Signed in, the tab's change record (`caseFile.changes`, written by caseFile.ts withChange through followAnswer and
 * "Change") is a buffer: the edits this tab has not sent yet. IntakeRecovery sends them to POST /api/cases/facts
 * (pendingWrites), and the server numbers each one it accepts. Then (afterSend):
 *   - an accepted edit leaves the buffer, and the server's record takes its place;
 *   - an edit changed again while the save was in flight stays, to be sent next;
 *   - an edit the server refused as made against an older view (another tab saved that fact since) stays, marked
 *     with the newer saved answer (`held`); it is not sent again until the person presses "Save" (savePending:
 *     sent with force, so it becomes the newest save) or "Discard" (discardPending).
 * The tab sends only the fact, its state and value, and the server's number it saw (`seenSeq`); never a number or a
 * time of its own (factRecord.ts readFactWrites refuses both).
 *
 * Guests have no saved row: their change record stays the whole record of their edits, ordered by the tab's counter.
 *
 * Pure: no React, no network. States no law.
 */
import { CASE_FILE_SECTION, changesOf, CHANGE_QUESTION, emptyCaseFile, give, type FactChange, type FactChanges, type SlotFact } from "./caseFile";
import type { FactConflict, FactRecords, FactWrite } from "./factRecord";

/** Whether the case file reads an answer from this value (the server refuses a whole send holding one it cannot). */
function readable(fact: SlotFact, value: unknown): boolean {
  const file = emptyCaseFile();
  give(file, fact, value, CHANGE_QUESTION);
  return file[fact].state === "answered" || file[fact].state === "unsure";
}

/**
 * The writes to send: every unsent edit not waiting on "Not saved yet" (or one the person chose to save). An answer the
 * case file cannot read (an amount box holding "$") is not sent: it stays in the buffer, shown on this tab as before.
 */
export function pendingWrites(changes: unknown): FactWrite[] {
  const writes: FactWrite[] = [];
  for (const [fact, change] of Object.entries(changesOf({ [CASE_FILE_SECTION]: { changes } })) as [SlotFact, FactChange][]) {
    if (change.held && !change.force) continue;
    if (change.state === "answered" && !readable(fact, change.value)) continue;
    writes.push({
      fact,
      state: change.state,
      ...(change.state === "answered" ? { value: change.value } : {}),
      source: "person",
      // An answer given at a place is sent under that place (the server keeps it as the record's question), so it is read as
      // that place's own answer; a change is sent as a change.
      question: change.place ?? CHANGE_QUESTION,
      seenSeq: change.seen ?? 0,
      ...(change.force ? { force: true as const } : {}),
    });
  }
  return writes;
}

export type SendResponse = { saved: { fact: string; seq: number; at: string }[]; conflicts: FactConflict[]; facts: FactRecords };

/**
 * The tab's sections after the server answered a send of `sent` (the change record as it was sent). `sections` is the
 * tab's sections NOW: an edit made while the save was in flight has a newer tab number than the one sent, and stays.
 */
export function afterSend(sections: Record<string, Record<string, unknown>>, sent: unknown, response: SendResponse): Record<string, Record<string, unknown>> {
  const before = changesOf({ [CASE_FILE_SECTION]: { changes: sent } });
  const now = changesOf(sections);
  const accepted = new Set(response.saved.map((entry) => entry.fact));
  const acceptedSeq = new Map(response.saved.map((entry) => [entry.fact, entry.seq]));
  const refused = new Map(response.conflicts.map((conflict) => [conflict.fact, conflict.stored]));
  const kept: FactChanges = {};
  for (const [fact, change] of Object.entries(now) as [SlotFact, FactChange][]) {
    const wasSent = before[fact];
    const unchangedSinceSent = Boolean(wasSent && wasSent.seq === change.seq);
    if (unchangedSinceSent && accepted.has(fact)) continue;
    const stored = unchangedSinceSent ? refused.get(fact) : undefined;
    if (stored) {
      const { force: _force, ...rest } = change;
      void _force;
      kept[fact] = { ...rest, held: { state: stored.state, ...(stored.value !== undefined ? { value: stored.value } : {}), seq: stored.seq } } as FactChange;
      continue;
    }
    // Changed again while this save was on the way, against the same saved answer the save was made against: the only
    // save in between is this tab's own, so the newer edit now stands on the number the server just gave it. Without
    // this the tab took its own save for another tab's: "9350" typed in Change while "9100" was saving was hidden and
    // then refused as "Not saved yet", and Confirm kept $9,100 (carry test, about 1 run in 4; owner's yes, 9 Nov).
    // A save from another tab still moves the record past this number, and is still a conflict.
    const ownSeq = acceptedSeq.get(fact);
    if (wasSent && !unchangedSinceSent && ownSeq !== undefined && (change.seen ?? 0) === (wasSent.seen ?? 0)) {
      kept[fact] = { ...change, seen: ownSeq };
      continue;
    }
    kept[fact] = change;
  }
  const caseFile: Record<string, unknown> = { ...(sections[CASE_FILE_SECTION] ?? {}), facts: response.facts };
  if (Object.keys(kept).length) caseFile.changes = kept;
  else delete caseFile.changes;
  return { ...sections, [CASE_FILE_SECTION]: caseFile };
}

/** "Save" on "Not saved yet": the waiting edit is sent as the newest save. */
export function savePending(changes: unknown, fact: SlotFact): FactChanges {
  const current = changesOf({ [CASE_FILE_SECTION]: { changes } });
  const change = current[fact];
  return change ? { ...current, [fact]: { ...change, force: true } } : current;
}

/** "Discard" on "Not saved yet": the waiting edit is dropped, and the saved answer stands. */
export function discardPending(changes: unknown, fact: SlotFact): FactChanges {
  const current = changesOf({ [CASE_FILE_SECTION]: { changes } });
  delete current[fact];
  return current;
}

/** The edits waiting on "Not saved yet", with the newer saved answer beside each. */
export function notSavedYet(changes: unknown): { fact: SlotFact; mine: FactChange; saved: NonNullable<FactChange["held"]> }[] {
  return (Object.entries(changesOf({ [CASE_FILE_SECTION]: { changes } })) as [SlotFact, FactChange][])
    .filter(([, change]) => change.held && !change.force)
    .map(([fact, change]) => ({ fact, mine: change, saved: change.held! }));
}
