/**
 * Answers the Forms page's questions already has, offered -- never saved --
 * from the case record.
 *
 * WHY (master plan Phase 1, 2026-10-07). Every page review found the Forms
 * page asking "Are you responding to a Plaintiff's Claim?" of a person whose
 * case already says they were served and are the defendant, and "Is this a
 * divorce application?" of a mother who said they were never married. The
 * answer is pre-selected with where it came from; nothing is recorded until
 * the person presses Save, which is their confirmation (CLAUDE.md section 4).
 * The verified recommendation still needs that saved answer.
 *
 * Kept apart from the route and the Forms page on purpose: those two must
 * carry no form-specific field names (verifyFormsSelectedCaseIsolation). The
 * rules here are keyed on the question's own field path.
 */

import type { CaseRecord } from "../caseRecord";

export type ApplicabilitySuggestion = { fieldPath: string; value: boolean | string; reason: string };

type Question = { field_path: string; choices: ReadonlyArray<{ value: unknown }> };

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/** One rule per question this module can answer from the record. */
function suggest(
  fieldPath: string,
  record: CaseRecord,
  master: Record<string, unknown>,
): { value: boolean | string; reason: string } | null {
  const last = fieldPath.split(".").at(-1) ?? "";
  const side = record.side?.value;

  // "Are you responding to a Plaintiff's Claim / Family Application?"
  if (/^respondingTo/.test(last) && side) {
    return side === "responding"
      ? { value: true, reason: "Your case says you are responding to the other side's case." }
      : { value: false, reason: "Your case says you are the one starting it." };
  }

  // "Is this a divorce application?" -- from the family questions' own answers.
  if (last === "isDivorceApplication") {
    const family = asRecord(asRecord(master.familyStatus).record);
    if (family.marriedToOtherParty === "no") {
      return { value: false, reason: "You said you were not married to the other person." };
    }
    if (family.divorceSought === "yes") return { value: true, reason: "You said you are asking for a divorce." };
    if (family.divorceSought === "no") return { value: false, reason: "You said you are not asking for a divorce." };
  }

  // "Does your case include a claim about decision-making, parenting time or contact?"
  if (last === "hasDecisionMakingParentingTimeOrContactClaim") {
    const issues = asRecord(asRecord(master.intakeData).extra).issues;
    const list = Array.isArray(issues) ? issues.map(String) : [];
    if (list.some((issue) => /decision|custody|parenting|access|contact/i.test(issue))) {
      return { value: true, reason: "The issues you chose include parenting." };
    }
  }
  return null;
}

export function suggestApplicability(
  questions: ReadonlyArray<Question>,
  record: CaseRecord,
  masterResult: unknown,
): ApplicabilitySuggestion[] {
  const master = asRecord(masterResult);
  const out: ApplicabilitySuggestion[] = [];
  for (const question of questions) {
    const found = suggest(question.field_path, record, master);
    // Only a value the question itself offers.
    if (found && question.choices.some((choice) => choice.value === found.value)) {
      out.push({ fieldPath: question.field_path, ...found });
    }
  }
  return out;
}
