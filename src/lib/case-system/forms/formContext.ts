/**
 * What a form is filled from: the case record, read through caseFileOf, and nothing else (site owner, 14 Nov 2026,
 * rules 1, 6 and 7). The parties by the person's role, each its own entry; the amount the record holds; the reasons in
 * the person's own words (the site's questions and the sentences that only give party details taken out).
 *
 * Pure. States no law.
 */
import { askedQuestionsOf, bringsTheCase, caseFileOf, storyOfFile, type CaseFile } from "../caseFile/caseFile";
import { parseRecordedAmount } from "../format/recordedAmount";
import { partiesByRole, storyWithoutPartyDetails } from "../parties/parties";
import { personWordsOnly } from "../personWords";
import type { Checkpoint } from "../intakeCheckpoint";
import type { FormContext } from "./formMap";

/** The amount the record holds, if answered. */
export function heldAmount(file: CaseFile): number | null {
  if (file.amount.state !== "answered") return null;
  return typeof file.amount.value === "number" ? file.amount.value : parseRecordedAmount(String(file.amount.value ?? ""));
}

/** The person's own words for the reasons for the claim. */
export function reasonsOf(file: CaseFile, asked: readonly string[]): string {
  return storyWithoutPartyDetails(personWordsOnly(storyOfFile(file), asked)).trim();
}

/** The context a form is filled from, for a saved case's checkpoint (and its saved master, for an older case). */
export function formContextOf(checkpoint: Checkpoint | null, master?: unknown): FormContext {
  const file = caseFileOf(checkpoint, master);
  const sides = partiesByRole(file.parties.list, bringsTheCase(file) || !file.side.value);
  return { file, plaintiffs: sides.plaintiffs, defendants: sides.defendants, amount: heldAmount(file), reasons: reasonsOf(file, askedQuestionsOf(checkpoint)) };
}
