/**
 * ONE RULE FOR WHAT CANCELS A CONFIRMATION, IN THE BROWSER AND ON THE SERVER (D1).
 *
 * Chrome re-test, 29 Oct, item D1: after "Stop initial questions and review" and
 * Confirm, one more answer took the confirmation away in the browser, so "Continue to
 * your next steps" showed the red "needs confirming" line and sent the person back to
 * the review. The server kept a confirmation unless an answer the person already had
 * changed (intakeReview.ts existingFactChanged); the browser store (IntakeRecovery.tsx
 * put) renewed the input revision on ANY difference, a new fact included.
 *
 * What this asserts, with no browser, model or database:
 *   1. The one rule (intakeReview.ts renewsInputRevision), on all four Continue routes
 *      (Small Claims form, Small Claims questions one at a time, civil, Family): after
 *      Confirm, an answer that only ADDS a fact does not renew; a CHANGED or REMOVED
 *      answer does. Once confirmed it gives exactly what existingFactChanged gives.
 *   2. Before Confirm (reviewing), any material change still renews, so a tick given
 *      before a late answer is asked for again.
 *   3. The server (intakeCheckpoint.ts saveCheckpoint), sent what the browser now
 *      sends, keeps the confirmation for a new fact and cancels it for a changed one.
 *   4. The browser store decides every input-revision renewal through that one rule:
 *      IntakeRecovery.tsx imports it, and no line there renews a revision any other way.
 *
 * What failure this catches: the browser and server drifting apart again, so a
 * confirmation the server keeps is dropped in the tab (or the reverse), or a changed
 * answer after Confirm no longer cancelling it.
 *
 * Run: npm run test:confirmation-rule
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { existingFactChanged, remainingEssentialQuestions, renewsInputRevision, reviewPhase, transitionReview } from "../../src/lib/case-system/intakeReview";
import { saveCheckpoint, type Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

const OWNER = "11111111-1111-4111-8111-111111111111";
const FLOW = "22222222-2222-4222-8222-222222222222";
const REVISION = "33333333-3333-4333-8333-333333333333";
const LATER = "44444444-4444-4444-8444-444444444444";
type Sections = Checkpoint["sections"];

/** Where each route keeps its answers (intakeReview.ts reviewEntries). */
const ROUTES: { name: string; court: Checkpoint["courtPath"]; answers: (values: Record<string, unknown>) => Sections }[] = [
  { name: "small-claims form", court: "small-claims", answers: (values) => ({ builder: { step: "form" }, "small-claims": { input: values } }) },
  { name: "small-claims questions one at a time", court: "small-claims", answers: (values) => ({ builder: { step: "guided" }, guided: { facts: values } }) },
  { name: "civil", court: "civil", answers: (values) => ({ builder: {}, civil: { input: values } }) },
  { name: "family", court: "family", answers: (values) => ({ builder: {}, family: values }) },
];

function checkpoint(court: Checkpoint["courtPath"], sections: Sections, revision = REVISION): Checkpoint {
  const story = { story: { text: "Synthetic: I hired Test Decks Ltd. to build a deck for $8,000 and $6,000 is still owed.", location: { province: "Ontario", city: "Kingston" } } };
  return { version: 1, flowId: FLOW, courtPath: court, revision, inputRevision: revision, sections: { ...story, ...sections, builder: { ...sections.builder } } };
}

/** The same intake, reviewed and confirmed (unknowns marked, as the review panel does). */
function confirmed(base: Checkpoint) {
  base.sections.builder.initialUnknowns = remainingEssentialQuestions(base).map((question) => question.id);
  const review = transitionReview({}, base, "review", REVISION, "now");
  return { review, done: transitionReview(review, base, "confirm", REVISION, "now") };
}

/** Each change as the browser makes it: a new revision, the input revision renewed only by the rule. */
function edited(base: Checkpoint, sections: Sections): Checkpoint {
  const builder = base.sections.builder;
  return { ...base, revision: LATER, sections: { ...base.sections, ...sections, builder: { ...builder, ...sections.builder } } };
}

let failures = 0;
async function check(name: string, run: () => void | Promise<void>) {
  try { await run(); console.log(`PASS   ${name}`); } catch (error) { failures += 1; console.log(`FAIL   ${name}\n       ${error instanceof Error ? error.message : String(error)}`); }
}

/** A row the server's write path can read and update (as verifyIntakeRecovery.ts). */
function fakeDb(court: Checkpoint["courtPath"], master: Record<string, unknown>) {
  let row: Record<string, unknown> = { id: FLOW, user_id: OWNER, court_path: court, updated_at: "first", master_result: master };
  const db = { from() {
    let values: Record<string, unknown> | undefined;
    const filters: Record<string, unknown> = {};
    const matches = () => Object.entries(filters).every(([key, value]) => row[key] === value);
    const chain = {
      select() { if (values) { if (!matches()) return Promise.resolve({ data: [], error: null }); row = { ...row, ...values }; return Promise.resolve({ data: [{ id: FLOW }], error: null }); } return chain; },
      eq(key: string, value: unknown) { filters[key] = value; return chain; },
      abortSignal() { return chain; },
      maybeSingle() { return Promise.resolve({ data: matches() ? row : null, error: null }); },
      single() { return Promise.resolve({ data: { id: FLOW }, error: null }); },
    };
    return { select() { return chain; }, update(next: Record<string, unknown>) { values = next; return chain; } };
  } } as unknown as Pick<SupabaseClient, "from">;
  return { db, master: () => row.master_result as Record<string, unknown> };
}

async function main() {
  for (const route of ROUTES) {
    const base = checkpoint(route.court, route.answers({ goal: "Synthetic: payment of the $6,000 owed." }));
    const { review, done } = confirmed(base);
    assert.equal(reviewPhase(done, base), "user-confirmed", `${route.name}: the synthetic intake is confirmed`);
    const added = edited(base, route.answers({ goal: "Synthetic: payment of the $6,000 owed.", otherParty: "Test Decks Ltd." }));
    const changed = edited(base, route.answers({ goal: "Synthetic: payment of $7,500." }));
    const removed = edited(base, route.answers({}));

    await check(`${route.name}: after Confirm, an answer that only adds a fact keeps the confirmation`, () => {
      assert.equal(existingFactChanged(base, added), false, "the synthetic new answer is a first value");
      assert.equal(renewsInputRevision(done, base, added), false, "a new fact renewed the input revision, cancelling the confirmation (D1)");
    });
    await check(`${route.name}: after Confirm, a changed or removed answer still cancels it`, () => {
      assert.equal(renewsInputRevision(done, base, changed), true, "a changed answer kept the confirmation");
      assert.equal(renewsInputRevision(done, base, removed), true, "a removed answer kept the confirmation");
    });
    await check(`${route.name}: once confirmed, the browser's rule is the server's existingFactChanged`, () => {
      for (const next of [added, changed, removed]) assert.equal(renewsInputRevision(done, base, next), existingFactChanged(base, next));
    });
    await check(`${route.name}: before Confirm, a new answer is asked to be ticked again`, () => {
      assert.equal(reviewPhase(review, base), "reviewing");
      assert.equal(renewsInputRevision(review, base, added), true, "a late answer kept a tick given before it");
    });
    await check(`${route.name}: the server keeps the confirmation for a new fact and cancels it for a changed one`, async () => {
      for (const [next, keeps] of [[added, true], [changed, false]] as const) {
        const { db, master } = fakeDb(route.court, { intakeCheckpoint: base, workflowStatus: done });
        // What the browser sends: the input revision renewed only when the one rule says so.
        const sent: Checkpoint = renewsInputRevision(done, base, next) ? { ...next, inputRevision: next.revision } : next;
        const outcome = await saveCheckpoint(db, OWNER, FLOW, sent, REVISION, () => true, sent.inputRevision !== base.inputRevision, false);
        assert(outcome.ok, "the save was accepted");
        const saved = master().intakeCheckpoint as Checkpoint;
        assert.equal(reviewPhase(master().workflowStatus as Record<string, unknown>, saved) === "user-confirmed", keeps, keeps ? "the server dropped a confirmation the browser kept" : "the server kept a confirmation after a changed answer");
      }
    });
  }

  await check("the browser store renews the input revision only through the one rule", () => {
    const source = readFileSync("app/_components/IntakeRecovery.tsx", "utf8");
    assert.match(source, /import \{[^}]*\brenewsInputRevision\b[^}]*\} from "..\/..\/src\/lib\/case-system\/intakeReview"/, "IntakeRecovery.tsx does not import renewsInputRevision");
    const renewals = source.split(/\r?\n/).filter((line) => /\.inputRevision\s*=\s*\w+\.revision/.test(line));
    assert(renewals.length > 0, "no input-revision renewal found in IntakeRecovery.tsx: this check no longer reads the store");
    for (const line of renewals) assert.match(line, /renewsInputRevision\(/, `a renewal not decided by the one rule: ${line.trim().slice(0, 140)}`);
    assert.doesNotMatch(source, /materialInitialFacts\(next\)\s*!==\s*materialInitialFacts\(/, "a second copy of the rule (any material difference) is back in the store");
  });

  if (failures) { console.error(`\n${failures} check(s) failed.`); process.exit(1); }
  console.log("\nThe browser and the server use the one confirmation rule.");
}

void main();
