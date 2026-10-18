import { remainingEssentialQuestions } from "../../src/lib/case-system/intakeReview";
/**
 * Unfinished intake recovery across Small Claims, Family and Civil.
 * Synthetic storage and case clients verify exact text, account/case/court isolation,
 * queued CAS writes, stale-generation rejection and ambiguous insert recovery.
 * Catches lost drafts and old writes replacing newer intake without AI, network or real cases.
 */
import assert from "node:assert/strict";
import { checkpointMatches, createCheckpointCase, loadCheckpointCase, readCheckpoint, readIntakeSession, saveCheckpoint, saveReviewTransition, writeIntakeSession, type Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { consumeGuestIntakeSession } from "../../src/lib/case-system/builderDraftStorage";
import type { SupabaseClient } from "@supabase/supabase-js";

const owner = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const revision = "33333333-3333-4333-8333-333333333333";
const newer = "44444444-4444-4444-8444-444444444444";
async function main() {
for (const court of ["small-claims", "family", "civil"] as const) {
  const snapshot: Checkpoint = { version: 1, flowId: id, courtPath: court, revision, sections: { form: { draft: "Synthetic exact text ".repeat(1000), position: 4 } } };
  let raw = "";
  const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; }, removeItem: () => { raw = ""; } };
  assert(writeIntakeSession(storage, { version: 2, ownerId: owner, caseId: id, serverRevision: null, checkpoint: snapshot }));
  assert.deepEqual(readIntakeSession(storage, id, owner, court)?.checkpoint, snapshot);
  assert.equal(readIntakeSession(storage, id, "another-owner", court), null);
  assert.equal(readIntakeSession(storage, newer, owner, court), null);
  assert.equal(consumeGuestIntakeSession(storage), null);
  assert(raw.length > 0, "legacy consumer must not delete the active recovery envelope");
  assert.equal(readCheckpoint({ ...snapshot, sections: { form: { draft: "x".repeat(500_001) } } }, court), null);
  assert.equal(writeIntakeSession({ setItem() { throw Error("quota"); } }, { version: 2, ownerId: owner, caseId: id, serverRevision: null, checkpoint: snapshot }), false);

  let row: Record<string, unknown> | null = { id, user_id: owner, court_path: court, updated_at: "first", master_result: { masterCase: { id }, caseSystemAssembly: { court }, position: { confirmed: true } } };
  let writes = 0;
  let interruptInsert = false;
  const db = { from() {
    let values: Record<string, unknown> | undefined;
    let projection = "";
    const filters: Record<string, unknown> = {};
    const chain = {
      select() { return values ? Promise.resolve(write()) : chain; },
      eq(key: string, value: unknown) { filters[key] = value; return chain; },
      abortSignal() { return chain; },
      maybeSingle() { return Promise.resolve({ data: matches() ? (projection.includes("revision:") ? { ...row, revision: (row!.master_result as { intakeCheckpoint?: { revision: string } })?.intakeCheckpoint?.revision } : row) : null, error: null }); },
      single() { return Promise.resolve({ data: { id }, error: interruptInsert ? { message: "Synthetic interrupted insert" } : null }); },
    };
    function matches() { return row && Object.entries(filters).every(([key, value]) => row![key] === value); }
    function write() { if (!matches()) return { data: [], error: null }; row = { ...row, ...values }; writes++; return { data: [{ id }], error: null }; }
    return {
      select(columns: string) { projection = columns; return chain; },
      update(next: Record<string, unknown>) { values = next; return chain; },
      insert(next: Record<string, unknown>) { row = next; writes++; return { ...chain, select: () => chain }; },
    };
  } } as unknown as Pick<SupabaseClient, "from">;
  assert.equal(await loadCheckpointCase(db, id, "another-owner", court), null);
  const wrongCourt = court === "civil" ? "family" : "civil";
  assert.equal(await loadCheckpointCase(db, id, owner, wrongCourt), null);
  assert((await saveCheckpoint(db, owner, id, snapshot, null, () => true)).ok);
  const master = row!.master_result as Record<string, unknown>;
  assert.deepEqual(master.masterCase, { id });
  assert.deepEqual(master.caseSystemAssembly, { court });
  assert.deepEqual(master.position, { confirmed: true });
  assert(await checkpointMatches(db, id, owner, court, revision));
  assert.equal(await checkpointMatches(db, id, owner, wrongCourt, revision), false);
  assert.equal(await checkpointMatches(db, id, owner, court, newer), false);
  const before = writes;
  assert.equal((await saveCheckpoint(db, owner, id, { ...snapshot, courtPath: wrongCourt }, revision, () => true)).ok, false);
  assert.equal((await saveCheckpoint(db, owner, id, { ...snapshot, flowId: newer }, revision, () => true)).ok, false);
  assert.equal((await saveCheckpoint(db, owner, id, { ...snapshot, revision: newer }, null, () => true)).ok, false);
  assert.equal((await saveCheckpoint(db, owner, id, { ...snapshot, revision: newer }, revision, () => false)).ok, false);
  assert.equal((await saveCheckpoint(db, "another-owner", id, { ...snapshot, revision: newer }, revision, () => true)).ok, false);
  assert.equal(writes, before, "conflicts, stale generations and wrong accounts never write");
  assert((await saveCheckpoint(db, owner, id, { ...snapshot, revision: newer }, revision, () => true)).ok);
  const reviewSnapshot: Checkpoint = { ...snapshot, revision, inputRevision: revision, sections: { builder: { confirmedLocation: { city: "Toronto", province: "Ontario" }, homeStory: "Synthetic initial facts" } } };
  reviewSnapshot.sections.builder.initialUnknowns = remainingEssentialQuestions(reviewSnapshot).map(question => question.id);
  assert((await saveCheckpoint(db, owner, id, reviewSnapshot, newer, () => true)).ok);
  assert.equal((await saveReviewTransition(db, owner, id, reviewSnapshot, "confirm", revision, () => true)).ok, false, "analysis or a saved case is not review");
  assert((await saveReviewTransition(db, owner, id, reviewSnapshot, "review", revision, () => true)).ok);
  const reviewWrites = writes;
  assert.equal((await saveReviewTransition(db, "another-owner", id, reviewSnapshot, "confirm", revision, () => true)).ok, false);
  assert.equal((await saveReviewTransition(db, owner, id, { ...reviewSnapshot, courtPath: wrongCourt }, "confirm", revision, () => true)).ok, false);
  assert.equal((await saveReviewTransition(db, owner, id, reviewSnapshot, "confirm", newer, () => true)).ok, false);
  assert.equal((await saveReviewTransition(db, owner, id, reviewSnapshot, "confirm", revision, () => false)).ok, false);
  assert.equal(writes, reviewWrites, "rejected confirmations must never write");
  assert((await saveReviewTransition(db, owner, id, reviewSnapshot, "confirm", revision, () => true)).ok);
  const confirmedMaster = row!.master_result as Record<string, unknown>;
  assert.equal((confirmedMaster.workflowStatus as Record<string, unknown>).intakeCompleted, true);
  assert.deepEqual(confirmedMaster.masterCase, { id });
  assert.deepEqual(confirmedMaster.caseSystemAssembly, { court });
  const edited: Checkpoint = { ...reviewSnapshot, revision: newer, sections: { builder: { ...reviewSnapshot.sections.builder, homeStory: "Newer synthetic initial facts" } } };
  assert((await saveCheckpoint(db, owner, id, edited, revision, () => true)).ok);
  const editedMaster = row!.master_result as Record<string, unknown>;
  assert.equal((editedMaster.workflowStatus as Record<string, unknown>).intakeCompleted, false, "material edits invalidate confirmation even if the caller reuses its input revision");
  assert.equal((editedMaster.intakeCheckpoint as Checkpoint).inputRevision, newer);
  assert.equal((await saveReviewTransition(db, owner, id, reviewSnapshot, "confirm", revision, () => true)).ok, false, "old tabs cannot confirm newer answers");
  row = null;
  interruptInsert = true;
  await createCheckpointCase(db, owner, snapshot);
  assert.equal(row!.id, id, "ambiguous insert recovers the same case ID");
  console.log(`PASS ${court}: exact recovery, ownership, court isolation, CAS, stale writes, field preservation, interrupted insert`);
}

}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.stack : "FAIL intake recovery verification"); process.exitCode = 1; });
