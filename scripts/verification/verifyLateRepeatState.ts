/**
 * A LATE SAVE REPEATING A "NOT SURE" OR A REMOVAL THE PERSON ALREADY HAS KEEPS THE NEXT STEPS CURRENT AND THE
 * CONFIRMATION STANDING (site owner, 6 Nov 2026, read of the read pack: item 3; rules 5 and 6).
 *
 * test:late-fact-save covers a late save repeating an ANSWER. "Not sure" and "removed" are states too (rule 1), held
 * as server-numbered fact records (caseFile.facts) and as unsent edits (caseFile.changes). A page or a tab saving the
 * same state again -- the chat's save arriving late, a second tab, the Forms tab on opening -- changes nothing the
 * person said, so it must neither mark the next steps out of date ("made before your latest answer") nor cancel the
 * confirmation ("confirm again").
 *
 * What this asserts, on all four Continue routes (Small Claims form, Small Claims questions one at a time, civil,
 * Family), with no browser, model or database, through the real rule (intakeReview.ts applyFactRevisions,
 * guidanceIsCurrent, reviewPhase):
 *   1. a "not sure" the person already has, saved again later as a fact record: next steps current, still confirmed;
 *   2. the same as an unsent edit (caseFile.changes);
 *   3. a removal the person already has, saved again later as a fact record: next steps current, still confirmed;
 *   4. both ways: a "not sure" replaced by an answer, or a removal replaced by a name, still outdates the next steps,
 *      so this cannot pass by ignoring the records altogether.
 *
 * What failure it catches: a save that changes nothing sending the person back to "Update my next steps" or
 * "review and confirm again".
 *
 * Run: npm run test:late-repeat-state
 */
import assert from "node:assert/strict";
import { applyFactRevisions, guidanceIsCurrent, remainingEssentialQuestions, reviewPhase, transitionReview } from "../../src/lib/case-system/intakeReview";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

const FLOW = "22222222-2222-4222-8222-222222222222";
const REVISION = "33333333-3333-4333-8333-333333333333";
const LATER = "44444444-4444-4444-8444-444444444444";
type Sections = Checkpoint["sections"];
const AT = "2026-11-06T15:00:00.000Z";
const LATE = "2026-11-06T16:00:00.000Z";

const ROUTES: { name: string; court: Checkpoint["courtPath"]; answers: Sections }[] = [
  { name: "small-claims form", court: "small-claims", answers: { builder: { step: "form" }, "small-claims": { input: { amountClaimed: "$6,000" } } } },
  { name: "small-claims questions one at a time", court: "small-claims", answers: { builder: { step: "guided" }, guided: { facts: { amountClaimed: 6000 }, answeredIds: ["sc-amount-claimed"] } } },
  { name: "civil", court: "civil", answers: { builder: {}, civil: { input: { amountClaimed: "$96,000" } } } },
  { name: "family", court: "family", answers: { builder: {}, family: { goal: "Synthetic: alternate weekends." } } },
];

function checkpoint(court: Checkpoint["courtPath"], sections: Sections, caseFile: Record<string, unknown>): Checkpoint {
  const story = { story: { text: "Synthetic: I hired Test Decks Ltd. to build a deck for $8,000 and $6,000 is still owed.", location: { province: "Ontario", city: "Kingston" } } };
  return { version: 1, flowId: FLOW, courtPath: court, revision: REVISION, inputRevision: REVISION, sections: { ...story, ...sections, builder: { ...sections.builder }, caseFile } };
}
function confirmed(base: Checkpoint) {
  base.sections.builder.initialUnknowns = remainingEssentialQuestions(base).map((question) => question.id);
  const review = transitionReview({}, base, "review", REVISION, "now");
  return transitionReview(review, base, "confirm", REVISION, "now");
}
function later(base: Checkpoint, caseFile: Record<string, unknown>): Checkpoint {
  return { ...base, revision: LATER, sections: { ...base.sections, caseFile: { ...(base.sections.caseFile ?? {}), ...caseFile } } };
}
const rec = (state: "answered" | "unsure" | "removed", seq: number, at: string, value?: string) => ({ state, ...(value !== undefined ? { value } : {}), source: "person", at, seq, question: "review" });
const current = (checkpointNow: Checkpoint, workflow: Record<string, unknown>, court: string) =>
  guidanceIsCurrent({ intakeCheckpoint: checkpointNow, workflowStatus: workflow, guidanceInputRevision: REVISION, guidanceFactsRevision: REVISION }, court, FLOW);

let failures = 0;
function check(name: string, run: () => void) {
  try { run(); console.log(`PASS   ${name}`); } catch (error) { failures += 1; console.log(`FAIL   ${name}\n       ${error instanceof Error ? error.message : String(error)}`); }
}
function unchanged(base: Checkpoint, late: Checkpoint, court: string) {
  const done = confirmed(base);
  assert.equal(current(base, done, court), true, "precondition: next steps made from the confirmed facts are current");
  const renewed = applyFactRevisions(done, base, late);
  assert.equal(late.factsRevision, undefined, "the repeat marked the next steps out of date");
  assert.equal(current(late, done, court), true, "next steps shown as out of date after a save that changed nothing");
  assert.equal(renewed, false, "the repeat asked to confirm again");
  assert.equal(reviewPhase(done, late), "user-confirmed", "the repeat cancelled the confirmation");
}

for (const route of ROUTES) {
  check(`${route.name}: a "not sure" saved again late (fact record) keeps the next steps current and the confirmation`, () => {
    const base = checkpoint(route.court, route.answers, { facts: { otherParty: rec("unsure", 1, AT) } });
    unchanged(base, later(base, { facts: { otherParty: rec("unsure", 2, LATE) } }), route.court);
  });

  check(`${route.name}: a "not sure" saved again as an unsent edit keeps the next steps current and the confirmation`, () => {
    const base = checkpoint(route.court, route.answers, { facts: { otherParty: rec("unsure", 1, AT) } });
    unchanged(base, later(base, { changes: { otherParty: { state: "unsure", at: LATE, seq: 2 } } }), route.court);
  });

  check(`${route.name}: a removal saved again late (fact record) keeps the next steps current and the confirmation`, () => {
    const base = checkpoint(route.court, route.answers, { facts: { otherParty: rec("removed", 1, AT) } });
    unchanged(base, later(base, { facts: { otherParty: rec("removed", 2, LATE) } }), route.court);
  });

  check(`${route.name}: replacing a "not sure" or a removal with an answer still outdates the next steps`, () => {
    for (const state of ["unsure", "removed"] as const) {
      const base = checkpoint(route.court, route.answers, { facts: { otherParty: rec(state, 1, AT) } });
      const done = confirmed(base);
      const late = later(base, { facts: { otherParty: rec("answered", 2, LATE, "Synthetic Northgate Ltd.") } });
      applyFactRevisions(done, base, late);
      assert.equal(late.factsRevision, LATER, `an answer replacing "${state}" left the next steps current`);
    }
  });
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nA late save repeating \"not sure\" or a removal changes nothing; an answer replacing them still outdates the next steps.");
process.exit(failures ? 1 : 0);
