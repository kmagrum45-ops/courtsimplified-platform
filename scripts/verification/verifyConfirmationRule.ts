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
 *   4. The browser store decides every revision renewal through that one rule
 *      (applyFactRevisions): IntakeRecovery.tsx imports it, and no line there sets a
 *      revision any other way; its AI lease compares the facts revision.
 *   5. Guidance (the next steps) is a separate matter from the confirmation (D1
 *      review, 29 Oct): an answer added after Confirm keeps the confirmation but
 *      outdates next steps made without it (guidanceIsCurrent false, guidanceNeedsUpdate
 *      true, the analysis gate refuses with "Update them", never "confirm again");
 *      a change that is not a fact (later evidence) leaves them current; the case page
 *      and Forms show the update control; the builder compares the facts revision.
 *
 * What failure this catches: the browser and server drifting apart again, so a
 * confirmation the server keeps is dropped in the tab (or the reverse), a changed
 * answer after Confirm no longer cancelling it, or next steps built without the
 * person's latest answer shown as if they included it.
 *
 * Run: npm run test:confirmation-rule
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyFactRevisions, existingFactChanged, guidanceIsCurrent, guidanceNeedsUpdate, remainingEssentialQuestions, renewsInputRevision, reviewPhase, transitionReview } from "../../src/lib/case-system/intakeReview";
import { withConfirmedGuidance } from "../../src/lib/security/intakeGuidanceGate";
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
    await check(`${route.name}: next steps made before an answer added after Confirm are outdated; the confirmation stands`, async () => {
      const base = checkpoint(route.court, route.answers({ goal: "Synthetic: payment of the $6,000 owed." }));
      const { done } = confirmed(base);
      const guidance = { guidanceInputRevision: REVISION, guidanceFactsRevision: REVISION };
      assert.equal(guidanceIsCurrent({ intakeCheckpoint: base, workflowStatus: done, ...guidance }, route.court, FLOW), true, "next steps made from the confirmed facts are current");
      // Not a fact: later evidence. Nothing is outdated.
      const evidence = edited(base, route.answers({ goal: "Synthetic: payment of the $6,000 owed.", evidence: ["Synthetic receipt"] }));
      assert.equal(applyFactRevisions(done, base, evidence), false);
      assert.equal(guidanceIsCurrent({ intakeCheckpoint: evidence, workflowStatus: done, ...guidance }, route.court, FLOW), true, "a change that is not a fact outdated the next steps");
      // A fact added: saved through the server as the browser sends it.
      const added = edited(base, route.answers({ goal: "Synthetic: payment of the $6,000 owed.", otherParty: "Test Decks Ltd." }));
      applyFactRevisions(done, base, added);
      const { db, master } = fakeDb(route.court, { intakeCheckpoint: base, workflowStatus: done, ...guidance });
      assert((await saveCheckpoint(db, OWNER, FLOW, added, REVISION, () => true, added.inputRevision !== base.inputRevision, false)).ok);
      const saved = master();
      assert.equal(reviewPhase(saved.workflowStatus as Record<string, unknown>, saved.intakeCheckpoint as Checkpoint), "user-confirmed", "the confirmation was cancelled");
      assert.equal(guidanceIsCurrent(saved, route.court, FLOW), false, "next steps made without the added answer are still shown as current");
      assert.equal(guidanceNeedsUpdate(saved, route.court, FLOW), true, "the next steps are not offered for updating");
      // Made again from the current facts: current.
      assert.equal(guidanceIsCurrent({ ...saved, guidanceFactsRevision: (saved.intakeCheckpoint as Checkpoint).factsRevision }, route.court, FLOW), true, "next steps made again are not current");
      // The analysis gate: "Update them", never "confirm again"; the handler is not reached.
      let reached = false;
      const gate = withConfirmedGuidance(async () => { reached = true; return new Response("{}"); }, { currentAnalysis: true }, { authenticate: async () => ({ id: OWNER }), owned: async () => ({ id: FLOW, court_path: route.court, master_result: saved }), names: async () => null } as never);
      const response = await gate(new Request("http://localhost/api/x", { method: "POST", headers: { "content-type": "application/json", "x-courtsimplified-case-id": FLOW, "x-courtsimplified-input-revision": REVISION }, body: JSON.stringify({ caseId: FLOW }) }) as never);
      assert.equal(reached, false, "guidance was served from next steps made before the latest answer");
      assert.match(String(((await response.json()) as { error?: unknown }).error), /made before your latest answer/, "the refusal does not say the next steps need updating");
    });
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
        // What the browser sends: the revisions set by the store's own step.
        const sent: Checkpoint = structuredClone(next);
        applyFactRevisions(done, base, sent);
        const outcome = await saveCheckpoint(db, OWNER, FLOW, sent, REVISION, () => true, sent.inputRevision !== base.inputRevision, false);
        assert(outcome.ok, "the save was accepted");
        const saved = master().intakeCheckpoint as Checkpoint;
        assert.equal(reviewPhase(master().workflowStatus as Record<string, unknown>, saved) === "user-confirmed", keeps, keeps ? "the server dropped a confirmation the browser kept" : "the server kept a confirmation after a changed answer");
      }
    });
  }

  await check("the browser store sets revisions only through the one rule, and leases AI answers on the facts", () => {
    const source = readFileSync("app/_components/IntakeRecovery.tsx", "utf8");
    assert.match(source, /import \{[^}]*\bapplyFactRevisions\b[^}]*\} from "..\/..\/src\/lib\/case-system\/intakeReview"/, "IntakeRecovery.tsx does not import applyFactRevisions");
    assert((source.match(/applyFactRevisions\(workflowStatus, snapshot, next\)/g) ?? []).length >= 2, "put and \"Start the questions again\" do not both go through applyFactRevisions");
    assert.doesNotMatch(source, /\.(inputRevision|factsRevision)\s*=\s*\w+\.revision/, "a revision is set in the store other than through applyFactRevisions");
    assert.doesNotMatch(source, /materialInitialFacts\(next\)\s*!==\s*materialInitialFacts\(/, "a second copy of the rule (any material difference) is back in the store");
    assert.match(source, /leases\.set\(signal, factsRevision\(snapshot\)\)/, "an AI answer's lease is not taken on the facts revision");
    assert.match(source, /leases\.get\(signal\) !== factsRevision\(snapshot\)/, "an AI answer started on older facts is not discarded");
  });

  await check("the case page, Forms and the builder treat next steps made before the latest answer as outdated", () => {
    const layout = readFileSync("app/cases/[id]/layout.tsx", "utf8");
    assert.match(layout, /guidanceNeedsUpdate\(caseRecord\.master_result/, "the case page does not show the update control");
    assert.match(layout, /data-testid="case-update-next-steps"/);
    const forms = readFileSync("app/forms/FormsWorkspace.tsx", "utf8");
    assert.match(forms, /guidanceNeedsUpdate\(masterResult, path, caseId\)/, "Forms does not show the update control");
    const builder = readFileSync("app/builder/page.tsx", "utf8");
    assert.match(builder, /guidanceFactsRevision: analysisFactsRevision\.current/, "the builder does not record which facts its guidance was made from");
    assert.match(builder, /resultsVisible = [^;]*analysisFactsRevision\.current === factsRevision\(/, "the builder shows results made from older facts");
    assert.match(builder, /sameInitialInformation = [^;]*guidanceFactsRevision\(existingMasterResult\) === analysisFactsRevision\.current/, "the builder keeps the stage and reading made without the latest answer");
  });

  if (failures) { console.error(`\n${failures} check(s) failed.`); process.exit(1); }
  console.log("\nThe browser and the server use the one confirmation rule.");
}

void main();
