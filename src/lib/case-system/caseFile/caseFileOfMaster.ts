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
import { caseFileOf, claimKindOf, type CaseFile, type ClaimKindHeld } from "./caseFile";

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
