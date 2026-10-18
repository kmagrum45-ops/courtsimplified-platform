/**
 * Explicit initial-intake review across all three courts. Exercises revision-bound
 * confirmation, legacy compatibility, editable summaries and optional evidence.
 * Prevents analysis or stale answers from silently completing a user's intake.
 * Synthetic in-memory inputs only; no external AI or real cases.
 */
import assert from "node:assert/strict";
import { canReview, materialInitialFacts, reconcileReview, remainingEssentialQuestions, reviewEntries, reviewPhase, transitionReview } from "../../src/lib/case-system/intakeReview";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { selectQuestions } from "../../src/lib/case-system/intake/selectQuestions";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";

for (const courtPath of ["small-claims", "family", "civil"] as const) {
  const answers = { facts: "Synthetic initial story", yourRole: "applicant", evidence: ["Synthetic document"] };
  const checkpoint: Checkpoint = { version: 1, flowId: "11111111-1111-4111-8111-111111111111", courtPath, revision: "22222222-2222-4222-8222-222222222222", inputRevision: "22222222-2222-4222-8222-222222222222", sections: { builder: { confirmedLocation: { province: "Ontario", city: "Toronto" } }, [courtPath]: courtPath === "family" ? answers : { input: answers } } };
  const workflow = { intakeCompleted: false, formsReviewed: true, unrelated: { retained: true } };
  assert(canReview(checkpoint));
  assert(reviewEntries(checkpoint).some(entry => entry.field === "facts" && entry.value === answers.facts));
  assert.equal(reviewPhase(workflow, checkpoint), "collecting");
  assert.throws(() => transitionReview(workflow, checkpoint, "confirm", checkpoint.revision, "now"));
  const review = transitionReview(workflow, checkpoint, "review", checkpoint.revision, "now");
  assert.equal(review.intakeCompleted, false);
  assert.throws(() => transitionReview(review, checkpoint, "confirm", checkpoint.revision, "now"), /initial questions/);
  checkpoint.sections.builder.initialUnknowns = remainingEssentialQuestions(checkpoint).map(question => question.id);
  const confirmed = transitionReview(review, checkpoint, "confirm", checkpoint.revision, "now");
  assert.equal(reviewPhase(confirmed, checkpoint), "user-confirmed");
  assert.equal(confirmed.formsReviewed, true);
  assert.deepEqual(confirmed.unrelated, workflow.unrelated);
  assert.deepEqual(transitionReview(confirmed, checkpoint, "confirm", checkpoint.revision, "later"), confirmed);
  assert.equal(reviewPhase({ intakeCompleted: true }, checkpoint), "collecting", "legacy completion is not review provenance");
  const changed = structuredClone(checkpoint);
  changed.revision = changed.inputRevision = "33333333-3333-4333-8333-333333333333";
  assert.throws(() => transitionReview(review, changed, "confirm", checkpoint.revision, "now"));
  assert.equal(reconcileReview(confirmed, checkpoint, changed).intakeCompleted, false);
  assert.equal(reviewPhase(reconcileReview(review, checkpoint, changed), changed), "reviewing");
  const optional = structuredClone(checkpoint);
  if (courtPath === "family") optional.sections.family.evidence = ["Later document"];
  else (optional.sections[courtPath].input as Record<string, unknown>).evidence = ["Later document"];
  assert.equal(materialInitialFacts(optional), materialInitialFacts(checkpoint), "later evidence does not invalidate initial review");
  const missing = structuredClone(checkpoint); missing.sections.builder = {};
  assert.equal(canReview(missing), false);
  console.log(`PASS ${courtPath}: explicit review, revisions, legacy compatibility, optional evidence and preservation`);
}

const initialIds = selectQuestions({}, [], QUESTION_BANK, "small-claims", "initial");
assert(initialIds.length > 0);
assert(initialIds.every(id => QUESTION_BANK.some(question => question.id === id && question.status === "reviewed")));
assert.deepEqual(selectQuestions({}, initialIds, QUESTION_BANK, "small-claims", "initial"), [], "the finite initial selector has a stopping point");
assert(selectQuestions({ role: "plaintiff" }, []).includes("sc-evidence-available"), "later evidence remains available through the existing selector");
assert(!selectQuestions({ role: "plaintiff" }, [], QUESTION_BANK, "small-claims", "initial").includes("sc-evidence-available"), "later evidence cannot extend initial questioning");
