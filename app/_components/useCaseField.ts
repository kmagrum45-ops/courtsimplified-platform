"use client";

/**
 * A FIELD OF BOOKKEEPING, THROUGH THE ONE WRITER (case core G2; CASE_CORE_DESIGN.md §10).
 *
 * useIntakeState for a field the field-to-fact table (fieldFacts.ts) names as holding no fact: what the page keeps
 * beside the person's answers (the form boxes the case file filled, and the words put in each). A field with no row,
 * or one that holds a fact, is refused: an answer is saved through caseWrite.ts writeAnswer, which records its fact.
 * States no law.
 */
import { useIntakeState } from "./IntakeRecovery";
import { fieldRow } from "../../src/lib/case-system/caseFile/fieldFacts";
import { UnmappedField } from "../../src/lib/case-system/caseFile/tabWrite";

export function useCaseField<T>(section: string, field: string, initial: T) {
  const row = fieldRow(section, field);
  if (!row) throw new UnmappedField(section, field);
  if (row.kind !== "none") throw new Error(`${section}.${field} holds a fact: save it through caseWrite.ts writeAnswer, which records it.`);
  return useIntakeState<T>(section, field, initial);
}
