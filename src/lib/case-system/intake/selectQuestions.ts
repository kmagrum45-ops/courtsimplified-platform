/**
 * Deterministic question selector -- Phase 0 foundation for AI-guided intake.
 *
 * Pure function: (facts, answeredIds) -> ordered remaining question IDs.
 * No AI, no network, no side effects. Phase 3 of the eventual AI-guided
 * intake (see docs/AI_INTAKE_DESIGN.md) is explicitly "NO AI, deterministic"
 * -- this file is that phase's entire implementation, not a placeholder for
 * a later AI version of the same job. Ordering (orientation before
 * substance before sensitive) comes from each question's `phase` field,
 * not from array position -- see questionBank.ts.
 */

import {
  QUESTION_BANK,
  type FactCondition,
  type IntakeQuestion,
  type KnownFactField,
  type QuestionPhase,
} from "./questionBank";

export type IntakeFacts = Partial<Record<KnownFactField, string | number | boolean>>;

const PHASE_ORDER: Record<QuestionPhase, number> = {
  orientation: 0,
  substance: 1,
  sensitive: 2,
};

function evaluateCondition(condition: FactCondition, facts: IntakeFacts): boolean {
  if ("all" in condition) {
    return condition.all.every((inner) => evaluateCondition(inner, facts));
  }
  if ("any" in condition) {
    return condition.any.some((inner) => evaluateCondition(inner, facts));
  }

  const value = facts[condition.field];
  switch (condition.op) {
    case "exists":
      return value !== undefined;
    case "notExists":
      return value === undefined;
    case "truthy":
      return Boolean(value);
    case "equals":
      return value === condition.value;
    case "in":
      return value !== undefined && condition.values.includes(value);
    default: {
      const exhaustiveCheck: never = condition;
      throw new Error(`Unhandled FactCondition op: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}

function questionApplies(question: IntakeQuestion, facts: IntakeFacts): boolean {
  if (!question.appliesWhen) return true;
  return evaluateCondition(question.appliesWhen, facts);
}

/**
 * Returns the ordered list of question IDs still to ask, given the facts
 * gathered so far and the questions already answered. Same input always
 * produces the same output -- no Date/Math.random/network access anywhere
 * in this module.
 */
export function selectQuestions(
  facts: IntakeFacts,
  answeredIds: readonly string[],
  bank: readonly IntakeQuestion[] = QUESTION_BANK,
): string[] {
  const answered = new Set(answeredIds);

  return bank
    .filter((question) => question.courtArea === "small-claims")
    .filter((question) => !answered.has(question.id))
    .filter((question) => questionApplies(question, facts))
    .sort((a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase]) // stable: preserves bank order within a phase
    .map((question) => question.id);
}
