/**
 * THE STAGE THE CASE FILE ALREADY HOLDS, FOR THE STAGE CARD (C9, 23 Nov 2026: each page reads the one shared reader of the
 * case file and never decides for itself whether to ask).
 *
 * The stage card (StageConfirmation, on the AI summary page and the case page) decided from its own copy (the case
 * position's confirmed stage, the answers, the situation), so a stage the person settled elsewhere -- "I'm not sure" at
 * the start or on the step page, or a stage they chose there -- was asked again ("Where is your case right now?"). This
 * reads the stage slot through the one function (factStatus.ts slotStatus):
 *   known    the person's own stage, said elsewhere: the card shows it as recorded, with Change;
 *   settled  "I'm not sure" (or removed): the card shows the quiet "add it when you know" line, never the question.
 * Null: nothing held, so the card asks as before.
 *
 * Pure. States no law.
 */
import { slotStatus } from "./factStatus";
import type { CaseFile } from "./caseFile";

export type HeldStage = { kind: "known"; stage: string } | { kind: "settled" };

export function stageHeldElsewhere(file: CaseFile | null | undefined): HeldStage | null {
  const slot = file?.stage;
  if (!slot) return null;
  const status = slotStatus(slot);
  if (status === "settled") return { kind: "settled" };
  if (status === "known" && typeof slot.value === "string" && slot.value.trim()) {
    return slot.value === "not-sure" ? { kind: "settled" } : { kind: "known", stage: slot.value };
  }
  return null;
}
