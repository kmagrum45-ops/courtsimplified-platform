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
 *      a change that is not a fact (the form's open view) leaves them current; the case page
 *      and Forms show the update control; the builder compares the facts revision.
 *   6. A date given on the next-step page ("Add it", "Work out your dates":
 *      StageAnswerPanel.tsx countDeadline) needs no remaking of the next steps (D1,
 *      29 Oct). Saved through the browser's own save (positionSave.ts
 *      savePositionDirect), it writes only master_result.position: the intake
 *      checkpoint and its facts revision are unchanged, guidanceIsCurrent stays true,
 *      no "Update my next steps" shows, and the server's position route writes only
 *      `position` too. The deadline is counted from the saved date each time the page
 *      is shown, on the case page (stepDeadlines.ts countedStepDeadlines) and on the
 *      step card (the stage-answer route, through its real confirmation gate), so a
 *      changed date changes the deadline with nothing remade.
 *   7. TYPED one key at a time (Chrome check of #514's preview, 29 Oct): after Confirm,
 *      an empty box typed into key by key -- each key press its own write, each saved
 *      through saveCheckpoint -- keeps the confirmation on every route, and the next
 *      steps are outdated; an answer that WAS confirmed, typed over key by key, still
 *      cancels it. Compared with the facts as confirmed (confirmedAnswerChanged, the
 *      marks recorded by transitionReview), never with the last key press.
 *   8. WHAT THE CONFIRM SCREEN SHOWS IS WHAT WAS CONFIRMED (Chrome check of #514's
 *      preview, 29 Oct: "Evidence you have" removed after Confirm left the case
 *      "confirmed"). On every route, an "optional later detail" shown on the confirm
 *      screen, removed or changed key by key after Confirm, cancels the confirmation;
 *      something the screen never shows (the form's open view, `mode`) added, changed
 *      and removed leaves the confirmation and the facts revision alone.
 *
 * What failure this catches: the browser and server drifting apart again, so a
 * confirmation the server keeps is dropped in the tab (or the reverse), a changed
 * answer after Confirm no longer cancelling it, next steps built without the
 * person's latest answer shown as if they included it, or a date added on the step
 * page outdating the next steps (or leaving a deadline counted from the old date).
 *
 * Run: npm run test:confirmation-rule
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { reviewEntries, inputRevision, applyFactRevisions, existingFactChanged, factsRevision, guidanceIsCurrent, guidanceNeedsUpdate, remainingEssentialQuestions, renewsInputRevision, reviewPhase, transitionReview } from "../../src/lib/case-system/intakeReview";
import { withConfirmedGuidance } from "../../src/lib/security/intakeGuidanceGate";
import { saveCheckpoint, type Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { readCasePosition } from "../../src/lib/case-system/casePosition";
import { countedStepDeadlines } from "../../src/lib/case-system/caseFile/stepDeadlines";
import { savePositionDirect, type PositionWriteClient } from "../../app/builder/_components/positionSave";
import { createStageAnswerPost } from "../../app/api/case/stage-answer/route";

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
      // Not a fact: something the confirm screen never shows (the form's open view). Nothing is outdated.
      // (Later evidence used to be the example; it IS shown on the confirm screen, so it counts: check 8.)
      const evidence = edited(base, route.answers({ goal: "Synthetic: payment of the $6,000 owed.", mode: "form" }));
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

  await check("a date added on the next-step page needs no remaking: next steps stay current and its deadline is counted from the saved date", async () => {
    // A Small Claims defendant whose next steps were made from the confirmed facts, at the
    // step that counts the Defence from the day the claim was served (a date question).
    const STEP = "defendant:served-defence-period-running";
    const QUESTION = "sc-date-claim-served";
    const base = checkpoint("small-claims", ROUTES[0].answers({ goal: "Synthetic: payment of the $6,000 owed." }));
    const { done } = confirmed(base);
    const start = { intakeCheckpoint: structuredClone(base), workflowStatus: done, guidanceInputRevision: REVISION, guidanceFactsRevision: REVISION, position: { stepId: STEP } };
    assert.equal(guidanceIsCurrent(start, "small-claims", FLOW), true, "the synthetic next steps are current before the date");
    const { db, master } = fakeDb("small-claims", start);
    // What the step card sends (StageAnswerPanel.tsx countDeadline), shown as the case page shows it.
    const card = withConfirmedGuidance(createStageAnswerPost(), { currentAnalysis: true }, { authenticate: async () => ({ id: OWNER }), owned: async () => ({ id: FLOW, court_path: "small-claims", master_result: master() }), names: async () => null } as never);
    const shown: string[] = [];
    for (const day of ["2026-10-01", "2026-10-08"]) {
      assert.equal(await savePositionDirect(db as unknown as PositionWriteClient, FLOW, { dateAnswers: { [QUESTION]: day }, stepId: STEP }), "saved", "the date was not saved");
      const saved = master();
      // (a) Not an intake answer: the facts and the confirmation are untouched, the next steps current.
      assert.deepEqual(saved.intakeCheckpoint, base, "saving a step-page date changed the intake checkpoint");
      assert.equal(factsRevision(saved.intakeCheckpoint as Checkpoint), factsRevision(base), "saving a step-page date renewed the facts revision");
      assert.equal(guidanceIsCurrent(saved, "small-claims", FLOW), true, "a date added on the step page outdated the next steps");
      assert.equal(guidanceNeedsUpdate(saved, "small-claims", FLOW), false, "a date added on the step page shows \"Update my next steps\"");
      for (const key of Object.keys(start)) if (key !== "position") assert.deepEqual(saved[key], start[key as keyof typeof start], `saving a step-page date changed master_result.${key}`);
      // (b) Counted when shown, from the saved date: the case page and the step card agree.
      const position = readCasePosition(saved, "small-claims");
      assert.equal(position.dateAnswers[QUESTION], day, "the saved date is not on the case");
      const casePage = countedStepDeadlines(position.stepId, position.dateAnswers);
      assert(casePage.length > 0 && casePage.every((entry) => entry.date > day), "the case page counts no deadline after the saved date");
      const response = await card(new Request("http://localhost/api/case/stage-answer", { method: "POST", headers: { "content-type": "application/json", "x-courtsimplified-case-id": FLOW, "x-courtsimplified-input-revision": REVISION }, body: JSON.stringify({ caseId: FLOW, stageId: STEP, courtPath: "small-claims", dateAnswers: position.dateAnswers }) }) as never);
      assert.equal(response.status, 200, "the step card was refused after a step-page date (the next steps were treated as outdated)");
      const body = (await response.json()) as { nextStep?: { deadlines: { id?: string; date: string }[] } };
      for (const entry of casePage) assert.equal(body.nextStep?.deadlines.find((item) => item.id === entry.id)?.date, entry.date, "the step card and the case page count different days from the saved date");
      shown.push(casePage.map((entry) => entry.date).join());
    }
    assert.notEqual(shown[0], shown[1], "a changed date left the deadline as it was: it is not counted from the saved date");
    // The server's own route writes the position and nothing else in master_result.
    const route = readFileSync("app/api/cases/position/route.ts", "utf8");
    assert.match(route, /return result\.ok \? \{ \.\.\.master, position: \{/, "the position route no longer writes only master_result.position");
    assert.doesNotMatch(route, /\b(intakeCheckpoint|workflowStatus|guidanceFactsRevision|guidanceInputRevision)\s*:/, "the position route writes the intake or the next steps' revision");
  });

  for (const route of ROUTES) {
    await check(`${route.name}: typed key by key after Confirm, a new answer keeps the confirmation and outdates the next steps; a confirmed answer typed over still cancels it`, async () => {
      const base = checkpoint(route.court, route.answers({ goal: "Synthetic: payment of the $6,000 owed." }));
      const { done } = confirmed(base);
      const guidance = { guidanceInputRevision: REVISION, guidanceFactsRevision: REVISION };
      const typeInto = async (field: string, text: string, start: Record<string, unknown>) => {
        const { db, master } = fakeDb(route.court, { intakeCheckpoint: base, workflowStatus: done, ...guidance });
        let previous = base;
        let workflow: Record<string, unknown> = done;
        let serverRevision = REVISION;
        for (let length = 1; length <= text.length; length++) {
          const revision = `55555555-5555-4555-8555-${String(length).padStart(12, "0")}`;
          const next: Checkpoint = { ...previous, revision, sections: { ...previous.sections, ...route.answers({ ...start, [field]: text.slice(0, length) }), builder: previous.sections.builder } };
          // The browser store's own step for each key press, then the save, as the page does.
          applyFactRevisions(workflow, previous, next);
          const outcome = await saveCheckpoint(db, OWNER, FLOW, next, serverRevision, () => true, inputRevision(next) !== inputRevision(previous), false);
          assert(outcome.ok, "each key press saved");
          serverRevision = revision;
          workflow = master().workflowStatus as Record<string, unknown>;
          previous = master().intakeCheckpoint as Checkpoint;
        }
        return master();
      };
      const added = await typeInto("timeline", "March 2026 hired them", { goal: "Synthetic: payment of the $6,000 owed." });
      assert.equal(reviewPhase(added.workflowStatus as Record<string, unknown>, added.intakeCheckpoint as Checkpoint), "user-confirmed", "typing a new answer key by key cancelled the confirmation");
      assert.equal(guidanceIsCurrent(added, route.court, FLOW), false, "next steps made before the typed answer are still shown as current");
      assert.equal(guidanceNeedsUpdate(added, route.court, FLOW), true, "the next steps are not offered for updating");
      const changed = await typeInto("goal", "Synthetic: payment of the $6,000 owed, and costs", {});
      assert.notEqual(reviewPhase(changed.workflowStatus as Record<string, unknown>, changed.intakeCheckpoint as Checkpoint), "user-confirmed", "a confirmed answer typed over kept the confirmation");
    });
  }

  for (const route of ROUTES) {
    await check(`${route.name}: an optional answer shown on the confirm screen, removed or changed key by key after Confirm, cancels it; something never shown leaves it alone`, async () => {
      const evidence = "Contract and bank receipt";
      const shown = { goal: "Synthetic: payment of the $6,000 owed.", evidence };
      const base = checkpoint(route.court, route.answers(shown));
      assert(reviewEntries(base).some((entry) => entry.field === "evidence" && entry.value === evidence), "the evidence is on the confirm screen");
      const { done } = confirmed(base);
      // Each value in turn, written and saved as the page does (the store's step, then saveCheckpoint).
      const writeEach = async (values: Record<string, unknown>[]) => {
        const { db, master } = fakeDb(route.court, { intakeCheckpoint: base, workflowStatus: done });
        let previous = base;
        let workflow: Record<string, unknown> = done;
        let serverRevision = REVISION;
        for (const [index, values_] of values.entries()) {
          const revision = `66666666-6666-4666-8666-${String(index + 1).padStart(12, "0")}`;
          const next: Checkpoint = { ...previous, revision, sections: { ...previous.sections, ...route.answers(values_), builder: previous.sections.builder } };
          applyFactRevisions(workflow, previous, next);
          assert((await saveCheckpoint(db, OWNER, FLOW, next, serverRevision, () => true, inputRevision(next) !== inputRevision(previous), false)).ok);
          serverRevision = revision;
          workflow = master().workflowStatus as Record<string, unknown>;
          previous = master().intakeCheckpoint as Checkpoint;
        }
        return master();
      };
      const phase = (master: Record<string, unknown>) => reviewPhase(master.workflowStatus as Record<string, unknown>, master.intakeCheckpoint as Checkpoint);
      const removed = await writeEach([...Array(evidence.length).keys()].map((index) => ({ ...shown, evidence: evidence.slice(0, evidence.length - index - 1) })));
      assert.notEqual(phase(removed), "user-confirmed", "a confirmed optional answer removed key by key kept the confirmation");
      const changed = await writeEach([..." and texts"].map((_, index) => ({ ...shown, evidence: evidence + " and texts".slice(0, index + 1) })));
      assert.notEqual(phase(changed), "user-confirmed", "a confirmed optional answer changed key by key kept the confirmation");
      const neverShown = await writeEach([{ ...shown, mode: "form" }, { ...shown, mode: "chat" }, { ...shown }]);
      assert.equal(phase(neverShown), "user-confirmed", "something the confirm screen never shows cancelled the confirmation");
      assert.equal(factsRevision(neverShown.intakeCheckpoint as Checkpoint), factsRevision(base), "something the confirm screen never shows outdated the next steps");
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
