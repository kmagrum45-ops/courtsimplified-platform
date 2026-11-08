/**
 * A FACT SAVED AFTER THE NEXT STEPS WERE MADE, SAYING WHAT THE CASE ALREADY SAID, KEEPS THEM CURRENT (item 1, 6 Nov).
 *
 * Since G2 (#543) every answer is also kept as a server-numbered fact record (caseFile.facts), and the
 * material facts the next steps rest on include those records (intakeReview.ts materialFacts). A record
 * that lands late -- the chat's save arriving after the next steps were made, a page saving an answer the
 * person already gave (the Forms tab keeps "You recorded an amount" on opening) -- repeats an answer the
 * case already holds. The person changed nothing, so "Your next steps were made before your latest answer"
 * must not appear (founder's Chrome check of #543, 5 Nov, other problem 1; site owner, 6 Nov).
 *
 * What this asserts, on all four Continue routes (Small Claims form, Small Claims questions one at a time,
 * civil, Family), with no browser, model or database:
 *   1. A fact record (or an unsent edit) whose value is what the route's own answers already give does not
 *      outdate next steps made from the confirmed facts, and keeps the confirmation.
 *   2. A fact record that CHANGES an answer still outdates them (and, as a change, asks to confirm again):
 *      the property holds both ways, so this check cannot pass by ignoring fact records altogether.
 *   3. The same record saved twice changes nothing the second time.
 *
 * What failure it catches: a late, unchanged save marking the next steps out of date (the case page then
 * says "Update my next steps" though nothing changed), or a real change slipping past the rule.
 *
 * Run: npm run test:late-fact-save
 */
import assert from "node:assert/strict";
import { applyFactRevisions, guidanceIsCurrent, remainingEssentialQuestions, reviewPhase, transitionReview } from "../../src/lib/case-system/intakeReview";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

const FLOW = "22222222-2222-4222-8222-222222222222";
const REVISION = "33333333-3333-4333-8333-333333333333";
const LATER = "44444444-4444-4444-8444-444444444444";
type Sections = Checkpoint["sections"];
const GOAL = "Synthetic: payment of the $6,000 owed.";

const ROUTES: { name: string; court: Checkpoint["courtPath"]; answers: (values: Record<string, unknown>) => Sections }[] = [
  { name: "small-claims form", court: "small-claims", answers: (values) => ({ builder: { step: "form" }, "small-claims": { input: values } }) },
  // The chat keeps an answer as its question's captured field, with the question answered (caseFile.ts, guided.answeredIds).
  { name: "small-claims questions one at a time", court: "small-claims", answers: (values) => ({ builder: { step: "guided" }, guided: { facts: { remedySoughtText: values.goal }, answeredIds: ["sc-remedy-sought"] } }) },
  { name: "civil", court: "civil", answers: (values) => ({ builder: {}, civil: { input: values } }) },
  { name: "family", court: "family", answers: (values) => ({ builder: {}, family: values }) },
];

function checkpoint(court: Checkpoint["courtPath"], sections: Sections): Checkpoint {
  const story = { story: { text: "Synthetic: I hired Test Decks Ltd. to build a deck for $8,000 and $6,000 is still owed.", location: { province: "Ontario", city: "Kingston" } } };
  return { version: 1, flowId: FLOW, courtPath: court, revision: REVISION, inputRevision: REVISION, sections: { ...story, ...sections, builder: { ...sections.builder } } };
}
function confirmed(base: Checkpoint) {
  base.sections.builder.initialUnknowns = remainingEssentialQuestions(base).map((question) => question.id);
  const review = transitionReview({}, base, "review", REVISION, "now");
  return transitionReview(review, base, "confirm", REVISION, "now");
}
function withCaseFile(base: Checkpoint, caseFile: Record<string, unknown>, revision = LATER): Checkpoint {
  return { ...base, revision, sections: { ...base.sections, caseFile: { ...(base.sections.caseFile ?? {}), ...caseFile } } };
}
const record = (value: string, seq: number) => ({ state: "answered", value, source: "person", at: "2026-11-05T21:30:00.000Z", seq, question: "goal" });

let failures = 0;
function check(name: string, run: () => void) {
  try { run(); console.log(`PASS   ${name}`); } catch (error) { failures += 1; console.log(`FAIL   ${name}\n       ${error instanceof Error ? error.message : String(error)}`); }
}
const current = (checkpointNow: Checkpoint, workflow: Record<string, unknown>, court: string) =>
  guidanceIsCurrent({ intakeCheckpoint: checkpointNow, workflowStatus: workflow, guidanceInputRevision: REVISION, guidanceFactsRevision: REVISION }, court, FLOW);

for (const route of ROUTES) {
  check(`${route.name}: a fact record saved late with the answer the case already holds keeps the next steps current`, () => {
    const base = checkpoint(route.court, route.answers({ goal: GOAL }));
    const done = confirmed(base);
    assert.equal(current(base, done, route.court), true, "next steps made from the confirmed facts are current");
    const late = withCaseFile(base, { facts: { wants: record(GOAL, 1) } });
    const renewed = applyFactRevisions(done, base, late);
    assert.equal(renewed, false, "a repeated answer asked to confirm again");
    assert.equal(late.factsRevision, undefined, "a repeated answer marked the next steps out of date");
    assert.equal(current(late, done, route.court), true, "next steps shown as out of date after a save that changed nothing");
    // Saved again: nothing more.
    const again = withCaseFile(late, { facts: { wants: record(GOAL, 2) } }, "55555555-5555-4555-8555-555555555555");
    applyFactRevisions(done, late, again);
    assert.equal(current(again, done, route.court), true, "the same answer saved twice outdated the next steps");
  });

  check(`${route.name}: an unsent edit repeating the answer the case already holds keeps the next steps current`, () => {
    const base = checkpoint(route.court, route.answers({ goal: GOAL }));
    const done = confirmed(base);
    const late = withCaseFile(base, { changes: { wants: { state: "answered", value: GOAL, at: "2026-11-05T21:30:00.000Z", seq: 1 } } });
    applyFactRevisions(done, base, late);
    assert.equal(late.factsRevision, undefined, "a repeated answer, not yet sent, marked the next steps out of date");
  });

  check(`${route.name}: a fact record that changes an answer still outdates the next steps`, () => {
    const base = checkpoint(route.court, route.answers({ goal: GOAL }));
    const done = confirmed(base);
    const changed = withCaseFile(base, { facts: { wants: record("Synthetic: an apology instead.", 1) } });
    const renewed = applyFactRevisions(done, base, changed);
    assert.equal(changed.factsRevision, LATER, "a changed answer left the next steps current");
    assert.equal(renewed, true, "a changed answer did not ask to confirm again");
    assert.notEqual(reviewPhase(done, changed), "user-confirmed", "a changed answer kept the confirmation");
  });
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nA late save that changes nothing keeps the next steps current; a change still outdates them.");
process.exit(failures ? 1 : 0);
