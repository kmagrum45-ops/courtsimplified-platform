/** The Family triage and the case file (caseFile.ts): a triage question another question already answered is skipped. Pure. */
import { alreadyAsked, type CaseFile, type Slot } from "./caseFile";
import type { FamilyStatusRecord } from "../family/statusTriage";

// Only "does this involve children" shares the children slot: "a child together" is a different
// fact ("my son from my first marriage"), and married is asked here first (reviewer 7).
const TRIAGE_FIELD = { "case-involves-children": "caseInvolvesChildren" } as const;

/** A slot's yes or no, from the person's answer ("No children" is no; any named child is yes), or null. */
function yesOrNoOf(slot: Slot): "yes" | "no" | null {
  if (slot.state !== "answered") return null;
  if (typeof slot.value === "boolean") return slot.value ? "yes" : "no";
  const text = Array.isArray(slot.value) ? slot.value.join(" ") : String(slot.value ?? "");
  if (!text.trim()) return null;
  return /^\s*(?:no|none|nope|n\/a)\b|\bno (?:children|kids|child)\b|\b(?:don'?t|do not|didn'?t|did not)\s+have\s+(?:any\s+)?(?:children|kids|a child)\b|\bchildless\b/i.test(text) ? "no" : "yes";
}

/**
 * The triage record with what the case file already holds from another question: those
 * triage questions are skipped (an answer of "not sure" too). The triage's own answers win.
 */
export function withCaseFileAnswers(record: FamilyStatusRecord, file: CaseFile): FamilyStatusRecord {
  const out = { ...record } as Record<string, unknown>;
  for (const [id, field] of Object.entries(TRIAGE_FIELD)) {
    if (out[field] !== "not-yet" || !alreadyAsked(file, id)) continue;
    const slot = file.children;
    // Held by the triage itself counts through its own field; only another question's answer fills it.
    if (slot.source?.kind === "answer" && Object.keys(TRIAGE_FIELD).includes(slot.source.question)) continue;
    out[field] = yesOrNoOf(slot) ?? "not-asked";
  }
  return out as FamilyStatusRecord;
}
