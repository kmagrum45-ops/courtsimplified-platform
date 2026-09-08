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
 *
 * Structurally never returns a `status: "draft"` question -- every entry in
 * questionBank.ts starts draft, pending licensee review, and this is the
 * one chokepoint every consumer calls through. A UI that wants to show
 * guided questions gets nothing back until a question is actually marked
 * "reviewed"; it cannot bypass that by reaching into QUESTION_BANK
 * directly and skipping this filter, since QUESTION_BANK's own entries
 * carry no other gate. Enforced here, not by a comment, specifically so it
 * can't be silently dropped the way sc-safety-check was.
 */

import {
  QUESTION_BANK,
  type CourtArea,
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

/**
 * Session 32: exported so other deterministic modules that gate content on
 * the same FactCondition shape (claimGuidance.ts's education/remedy
 * surfacing) reuse this evaluator instead of re-implementing it -- the
 * logic stays owned by one module, same "reinvents none of their logic"
 * posture as orchestrateIntakeTurn.ts's own file header.
 */
export function evaluateFactCondition(condition: FactCondition, facts: IntakeFacts): boolean {
  if ("all" in condition) {
    return condition.all.every((inner) => evaluateFactCondition(inner, facts));
  }
  if ("any" in condition) {
    return condition.any.some((inner) => evaluateFactCondition(inner, facts));
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
  return evaluateFactCondition(question.appliesWhen, facts);
}

/**
 * Returns the ordered list of question IDs still to ask, given the facts
 * gathered so far and the questions already answered. Same input always
 * produces the same output -- no Date/Math.random/network access anywhere
 * in this module.
 *
 * Session 16: `courtArea` was a hardcoded "small-claims" literal here --
 * the one real engine-level Small-Claims hardcoding found this session.
 * Now a parameter (defaulting to "small-claims" for every existing
 * caller), so a bank mixing multiple court areas' questions (or a future
 * Family/Civil-only bank) is filtered correctly instead of always being
 * checked against a fixed literal.
 */
export function selectQuestions(
  facts: IntakeFacts,
  answeredIds: readonly string[],
  bank: readonly IntakeQuestion[] = QUESTION_BANK,
  courtArea: CourtArea = "small-claims",
): string[] {
  const answered = new Set(answeredIds);

  return bank
    .filter((question) => question.courtArea === courtArea)
    .filter((question) => question.status === "reviewed")
    .filter((question) => !answered.has(question.id))
    .filter((question) => questionApplies(question, facts))
    .sort((a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase]) // stable: preserves bank order within a phase
    .map((question) => question.id);
}
