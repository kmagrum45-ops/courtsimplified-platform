/**
 * THE SAVED NEXT STEP, WHEN IT IS STILL THE ONE FOR WHAT THE TAB HOLDS (Chrome check of #544 on 99e2ec0, 7 Nov, F10).
 *
 * A confirmed case's next step is saved with it (app/builder/page.tsx: intakeAnalysis and intakeData, stamped with
 * the revisions of the answers it was made from). While those stamps match the confirmed answers as this tab holds
 * them now (intakeReview.ts guidanceIsCurrent), that saved step is the next step: it is shown as it was saved, never
 * worked out again (about 70 s of AI each time on the preview). Anything changed since, and it is not current, so the
 * step is worked out afresh as before.
 */
import { guidanceIsCurrent } from "./intakeReview";

type Value = Record<string, unknown>;
const object = (value: unknown): Value | null => value && typeof value === "object" && !Array.isArray(value) ? value as Value : null;

export type SavedStep = { analysis: Value; data: Value };

/**
 * The saved step, or null. `master` is the saved case (master_result); `now` is what this tab holds (the review's
 * workflow status and checkpoint), which wins over the saved copy of both.
 */
export function savedStepOf(master: unknown, now: { workflowStatus: unknown; checkpoint: unknown } | null | undefined, court: string | null | undefined, caseId: string | null | undefined): SavedStep | null {
  const saved = object(master);
  if (!saved || !now || !caseId) return null;
  const analysis = object(saved.intakeAnalysis);
  const data = object(saved.intakeData);
  if (!analysis || !data) return null;
  return guidanceIsCurrent({ ...saved, workflowStatus: now.workflowStatus, intakeCheckpoint: now.checkpoint }, court, caseId) ? { analysis, data } : null;
}
