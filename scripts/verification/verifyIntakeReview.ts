/**
 * Explicit initial-intake review across all three courts. Exercises revision-bound
 * confirmation, legacy compatibility, editable summaries and optional evidence.
 * Prevents analysis or stale answers from silently completing a user's intake.
 * Synthetic in-memory inputs only; no external AI or real cases.
 */
import assert from "node:assert/strict";
import { canReview, existingFactChanged, panelAnswerFacts, materialInitialFacts, reconcileReview, remainingEssentialQuestions, reviewEntries, reviewPhase, suggestInitialAnswers, transitionReview } from "../../src/lib/case-system/intakeReview";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { selectQuestions } from "../../src/lib/case-system/intake/selectQuestions";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { SERVED_LINE } from "../../src/lib/case-system/casePosition";
import { migrateStory } from "../../src/lib/case-system/intakeStory";

for (const courtPath of ["small-claims", "family", "civil"] as const) {
  const answers = { facts: "Synthetic initial story", yourRole: "applicant", evidence: ["Synthetic document"] };
  const checkpoint: Checkpoint = { version: 1, flowId: "11111111-1111-4111-8111-111111111111", courtPath, revision: "22222222-2222-4222-8222-222222222222", inputRevision: "22222222-2222-4222-8222-222222222222", sections: { story: { text: answers.facts, location: { province: "Ontario", city: "Toronto" } }, builder: {}, [courtPath]: courtPath === "family" ? answers : { input: answers } } };
  const workflow = { intakeCompleted: false, formsReviewed: true, unrelated: { retained: true } };
  assert(canReview(checkpoint));
  assert(reviewEntries(checkpoint).some(entry => entry.section === "story" && entry.field === "text" && entry.value === answers.facts));
  assert.equal(reviewEntries(checkpoint).filter(entry => String(entry.value) === answers.facts).length, 1, "the story is reviewed from one copy only");
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
  const missing = structuredClone(checkpoint); delete missing.sections.story.location;
  assert.equal(canReview(missing), false);
  console.log(`PASS ${courtPath}: explicit review, revisions, legacy compatibility, optional evidence and preservation`);
}

const initialIds = selectQuestions({}, [], QUESTION_BANK, "small-claims", "initial");
assert(initialIds.length > 0);
assert(initialIds.every(id => QUESTION_BANK.some(question => question.id === id && question.status === "reviewed")));
assert.deepEqual(selectQuestions({}, initialIds, QUESTION_BANK, "small-claims", "initial"), [], "the finite initial selector has a stopping point");
assert(selectQuestions({ role: "plaintiff" }, []).includes("sc-evidence-available"), "later evidence remains available through the existing selector");
assert(!selectQuestions({ role: "plaintiff" }, [], QUESTION_BANK, "small-claims", "initial").includes("sc-evidence-available"), "later evidence cannot extend initial questioning");

// ONE COPY OF THE STORY (2026-10-18, PR #463 re-test): an older checkpoint's
// five copies move into sections.story once and are deleted, so none can be
// shown again; a current checkpoint is returned untouched.
{
  const legacy: Checkpoint = { version: 1, flowId: "11111111-1111-4111-8111-111111111111", courtPath: "family", revision: "22222222-2222-4222-8222-222222222222",
    sections: { home: { facts: "Old home copy", city: "Ottawa", understoodAnswers: [] }, builder: { homeStory: "Old builder copy", confirmedLocation: { province: "Ontario", city: "Toronto" }, step: "form" }, family: { facts: "Newest form copy", yourRole: "applicant" } } };
  const moved = migrateStory(legacy);
  assert.equal(moved.sections.story.text, "Newest form copy", "the form's copy is the one the person last edited");
  assert.deepEqual(moved.sections.story.location, { province: "Ontario", city: "Toronto" });
  const json = JSON.stringify(moved.sections);
  for (const stale of ["Old home copy", "Old builder copy", "Ottawa"]) assert(!json.includes(stale), `no stale copy survives: ${stale}`);
  assert.equal(moved.sections.family.yourRole, "applicant", "the form's other answers are kept");
  assert.equal(migrateStory(moved), moved, "a current checkpoint is left untouched");
  const sc: Checkpoint = { ...legacy, courtPath: "small-claims", sections: { "small-claims": { input: { facts: "SC story", yourCity: "Toronto", yourProvince: "Ontario", goal: "repayment" } } } };
  const scMoved = migrateStory(sc);
  assert.equal(scMoved.sections.story.text, "SC story");
  assert.deepEqual(scMoved.sections["small-claims"].input, { goal: "repayment" }, "the form input keeps only its own answers");
  console.log("PASS one copy of the story: legacy copies migrate once and are removed");
}

// SUGGEST, NEVER DECIDE (2026-10-18): a suggestion read from the story answers
// nothing until the person chooses it; their choice answers the question.
{
  const sc: Checkpoint = { version: 1, flowId: "11111111-1111-4111-8111-111111111111", courtPath: "small-claims", revision: "22222222-2222-4222-8222-222222222222",
    sections: { story: { text: "I paid a contractor $9,000 on May 12, 2026 to fix my roof and he never came back.", location: { province: "Ontario", city: "Sudbury" } }, builder: {} } };
  const suggested = suggestInitialAnswers(sc);
  assert.equal(suggested["sc-orient-when-happened"], "2026-05-12");
  assert(suggested["sc-orient-role"]?.includes("plaintiff"));
  const before = remainingEssentialQuestions(sc).map(question => question.id);
  assert(before.includes("sc-orient-role"), "a suggestion alone answers nothing");
  const chosen = structuredClone(sc); chosen.sections.builder.initialAnswers = { "sc-orient-role": suggested["sc-orient-role"] };
  assert(!remainingEssentialQuestions(chosen).some(question => question.id === "sc-orient-role"), "the person's choice answers it");
  assert.notEqual(materialInitialFacts(chosen), materialInitialFacts(sc), "an answer is a material fact");
  // A review-panel edit of a confirmed intake returns it to reviewing; any other edit to collecting.
  const confirmed = { intakeCompleted: true, intakeReview: { version: 1, reviewedRevision: sc.revision, confirmedRevision: sc.revision } };
  const next = { ...sc, revision: "33333333-3333-4333-8333-333333333333", inputRevision: "33333333-3333-4333-8333-333333333333" };
  assert.equal(reviewPhase(reconcileReview(confirmed, sc, next, true), next), "reviewing");
  assert.equal(reviewPhase(reconcileReview(confirmed, sc, next), next), "collecting");
  console.log("PASS suggestions never answer by themselves; a review edit stays in review");
}

// PR #463 re-test round 2 (2026-10-18).
{
  // A form registering defaults is not an edit; changing an answer is.
  const base: Checkpoint = { version: 1, flowId: "11111111-1111-4111-8111-111111111111", courtPath: "small-claims", revision: "22222222-2222-4222-8222-222222222222",
    sections: { story: { text: "A contractor took a $3,000 deposit and never did the work, in August 2026.", location: { province: "Ontario", city: "Sudbury" } }, builder: { step: "form" } } };
  const registered = structuredClone(base); registered.sections["small-claims"] = { input: { yourRole: "", caseStage: "starting-case", goal: "" } };
  assert.equal(existingFactChanged(base, registered), false, "a field getting its first value is not a changed answer");
  const changed = structuredClone(registered); (changed.sections.story as Record<string, unknown>).text = "A different story.";
  assert.equal(existingFactChanged(registered, changed), true, "a changed story is a changed answer");
  const removed = structuredClone(registered); (removed.sections["small-claims"].input as Record<string, unknown>).caseStage = "";
  assert.equal(existingFactChanged(registered, removed), true, "a removed answer is a changed answer");
  // Month and year, and the side of someone telling a story about money they paid.
  const suggested = suggestInitialAnswers(base);
  assert.equal(suggested["sc-orient-when-happened"], "August 2026");
  assert.equal(suggested["sc-orient-role"], "Bringing the claim (plaintiff)");
  // Family: the story and the Timeline's served date count as answered; choices read in the form's words.
  const family: Checkpoint = { version: 1, flowId: "11111111-1111-4111-8111-111111111111", courtPath: "family", revision: "22222222-2222-4222-8222-222222222222",
    sections: { story: { text: "We were never married. I was served with her Application on October 9, 2026.", location: { province: "Ontario", city: "Ottawa" } }, family: { yourRole: "respondent", filedDocuments: ["application"], timeline: `${SERVED_LINE}2026-10-09` } } };
  const missing = remainingEssentialQuestions(family, true).map(question => question.id);
  assert(!missing.includes("facts"), "the story answers 'In your own words'");
  assert(!missing.includes("servedDate"), "the Timeline's served date answers 'What day were you served'");
  const entries = reviewEntries(family);
  assert.equal(entries.find(entry => entry.field === "yourRole")?.choices?.find(choice => choice.value === "respondent")?.label, "The other person started it and I was served");
  assert(entries.find(entry => entry.field === "filedDocuments")?.choices?.some(choice => choice.value === "application"), "filed documents carry their words");
  console.log("PASS defaults are not edits; month suggestions; Family reads the story and its choices in words");
}

// Re-test round 7 (Small Claims restart path).
{
  const invoice = "Synthetic: I finished renovation work on June 10, 2026 and sent an invoice for $8,500. Payment was due July 10, 2026 and the client never paid.";
  const sc: Checkpoint = { version: 1, flowId: "11111111-1111-4111-8111-111111111111", courtPath: "small-claims", revision: "22222222-2222-4222-8222-222222222222",
    sections: { story: { text: invoice, location: { province: "Ontario", city: "Sudbury" } }, builder: { step: "guided" } } };
  const suggested = suggestInitialAnswers(sc);
  assert.equal(suggested["sc-orient-when-happened"], "2026-06-10", "when it happened, not the due date");
  // Step 1 (one date module): a missing year is asked, never guessed. "June 10" used to take
  // the deadline's year; now nothing is offered (the only full date is the deadline), and the
  // person types the date and is asked for its year.
  assert.equal(suggestInitialAnswers({ ...sc, sections: { ...sc.sections, story: { text: "Work finished June 10, payment due July 10, 2026." } } })["sc-orient-when-happened"], undefined, "a date with no year is not given another date's year, and the deadline is not offered");
  assert.equal(suggestInitialAnswers({ ...sc, sections: { ...sc.sections, story: { text: "Work finished in August 2026 and they never paid." } } })["sc-orient-when-happened"], "August 2026", "a month and year is offered as it is");
  assert.equal(suggested["sc-orient-dispute-category"], "Unpaid money owed to you", "an unpaid invoice is money owed, whatever the work");
  // A side chosen in the review makes its questions due; their answers clear them.
  const withSide = structuredClone(sc); withSide.sections.builder.initialAnswers = { "sc-orient-role": "Bringing the claim (plaintiff)" };
  const due = remainingEssentialQuestions(withSide).map(question => question.id);
  for (const id of ["sc-amount-claimed", "sc-claim-filed", "sc-remedy-sought"]) assert(due.includes(id), `a side chosen in the review makes ${id} a question`);
  withSide.sections.builder.initialAnswers = { ...withSide.sections.builder.initialAnswers as object, "sc-orient-when-happened": "2026-06-10", "sc-orient-dispute-category": "Unpaid money owed to you", "sc-amount-claimed": "$8,500", "sc-claim-filed": "No", "sc-remedy-sought": "Payment" };
  assert.deepEqual(remainingEssentialQuestions(withSide), [], "answers given in the review clear every question, with no 'I do not know yet'");
  assert.deepEqual(panelAnswerFacts(withSide), { role: "plaintiff", timelineText: "2026-06-10", amountClaimedText: "$8,500", claimFiled: false, remedySoughtText: "Payment" }, "the review's answers are facts for the next step");
  console.log("PASS the review's answers are facts; the due date is not when it happened");
}
