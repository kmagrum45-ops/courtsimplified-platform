/**
 * WHETHER ONE SMALL CLAIMS CATALOGUE ITEM SHOWS FOR THIS CASE (site owner, 27 Nov 2026, step 2): its condition (the
 * generated entry, or the default rule: its own claim type) read against the case record. Hidden by default; a fact the
 * record does not hold yet comes back as `ask`, for the one asker to ask once. Used by the new results step (step 3).
 */
import type { CaseFile } from "../caseFile/caseFile";
import { defaultCondition, itemKey, verdictOf, type ApplicabilityAnswers, type ItemCondition, type Verdict } from "./catalogueConditions";
import { GENERATED_CONDITIONS } from "./catalogueConditions.generated";

export function conditionFor(claimTypeId: string, list: "element" | "consideration" | "note", idOrIndex: string | number): ItemCondition {
  return GENERATED_CONDITIONS[itemKey(claimTypeId, list, idOrIndex)] ?? defaultCondition(claimTypeId);
}

export function itemApplies(record: CaseFile | null, claimTypeId: string, list: "element" | "consideration" | "note", idOrIndex: string | number, answers: ApplicabilityAnswers = {}): Verdict {
  return verdictOf(conditionFor(claimTypeId, list, idOrIndex), record, answers);
}
