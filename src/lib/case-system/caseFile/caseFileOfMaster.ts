/**
 * THE CASE FILE OF A SAVED CASE: its checkpoint and its saved position, read by caseFileOf.
 *
 * The one way a reader that has only the saved case (master_result) -- the server routes, the
 * case record, "Check my case file" -- gets the case file, so it reads the same slots as the
 * screens do (site owner, 29 Oct: the overview, "Check my case file", the review and the Form 7A
 * section each read the kind of claim from a different place and disagreed).
 *
 * Its own file because caseFile.ts is imported by intakeReview.ts, which intakeCheckpoint.ts
 * imports: reading the checkpoint from caseFile.ts itself would make a cycle.
 */
import { readCheckpoint } from "../intakeCheckpoint";
import { caseFileOf, claimKindOf, slotText, type CaseFile, type ClaimKindHeld, type SlotFact } from "./caseFile";

const object = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const AREAS = new Set(["small-claims", "civil", "family"]);

/** The area a saved case is in: the column when given, else its checkpoint's or its intake's. */
export function areaOfMaster(master: unknown, courtPath?: string | null): "small-claims" | "civil" | "family" | null {
  const record = object(master);
  for (const value of [courtPath, object(record.intakeCheckpoint).courtPath, object(record.intakeData).courtPath, record.courtPath]) {
    if (typeof value === "string" && AREAS.has(value)) return value as "small-claims" | "civil" | "family";
  }
  return null;
}

/** The case file of a saved case (its checkpoint, when it has a readable one, and its saved position). */
export function caseFileOfMaster(master: unknown, courtPath?: string | null): CaseFile {
  const area = areaOfMaster(master, courtPath);
  const checkpoint = area ? readCheckpoint(object(master).intakeCheckpoint, area) : null;
  const file = caseFileOf(checkpoint, master);
  file.area ??= area ?? undefined;
  return file;
}

/**
 * WHAT THE CASE FILE SAYS OF ONE FACT, IN WORDS (G1a, 1 Nov): for a reader that fills a box or a line
 * from a saved case (the form prefill, generate-form, the case record). `held` when the case file says
 * anything: its answer (the fact record first, then the change record, then today's order, caseFileOf),
 * or "" once the person removed it or said they are not sure -- never an older copy then.
 */
export type HeldWords = { held: true; words: string } | { held: false };
export function heldWordsOf(file: CaseFile, fact: SlotFact): HeldWords {
  const slot = file[fact];
  if (slot.removed || slot.state === "unsure") return { held: true, words: "" };
  if (slot.state === "answered") return { held: true, words: slotText(slot, (iso) => iso) };
  return { held: false };
}

/**
 * THE OTHER PARTY OF A SAVED CASE: the case file's words when it holds any (a removal included), else
 * -- only then -- the analysis copy an older saved case kept (intakeData.otherParty, its extra and
 * civilInput copies). The legacy copies are read here only (CASE_CORE_DESIGN.md §3), so no reader
 * reads them itself and a removal through the fact record or "Change" wins on every reader.
 */
export function otherPartyOfMaster(master: unknown, courtPath?: string | null, file: CaseFile = caseFileOfMaster(master, courtPath)): string {
  const held = heldWordsOf(file, "otherParty");
  if (held.held) return held.words;
  const intake = object(object(master).intakeData);
  const extra = object(intake.extra);
  for (const copy of [intake.otherParty, extra.otherParty, object(extra.civilInput).otherParty]) if (typeof copy === "string" && copy.trim()) return copy.trim();
  return "";
}

/** The kind of claim a saved case holds (claimKindOf on its case file). */
export function claimKindOfMaster(master: unknown, courtPath?: string | null): ClaimKindHeld {
  return claimKindOf(caseFileOfMaster(master, courtPath));
}

/**
 * The columns a court read of a saved case row needs (courtOfSavedRow): its saved case and, as the
 * fallback inside this reader only, the row's own court column.
 */
export const SAVED_COURT_COLUMNS = "court_path, master_result";

/**
 * THE COURT OF A SAVED CASE ROW, through the case file (rule 2, 30 Oct): the court the case file holds
 * (the person's situation answer, else its checkpoint's court), else the row's court column, else null.
 * Read by the builder's "an id with no court" path (IntakeRecovery savedCourtOf), never the column alone.
 */
export function courtOfSavedRow(row: unknown): "small-claims" | "civil" | "family" | null {
  const record = object(row);
  const column = typeof record.court_path === "string" && AREAS.has(record.court_path) ? record.court_path : null;
  const file = caseFileOfMaster(record.master_result, column);
  const held = file.court.state === "answered" && typeof file.court.value === "string" && AREAS.has(file.court.value) ? file.court.value : null;
  return (held ?? column ?? areaOfMaster(record.master_result)) as "small-claims" | "civil" | "family" | null;
}
