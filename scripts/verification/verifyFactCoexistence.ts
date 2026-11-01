/**
 * FAILING FIRST: ONCE A FACT RECORD EXISTS, EVERY OLD COPY IS IGNORED (case core G0; CASE_CORE_DESIGN.md §11).
 *
 * THIS SUITE FAILS TODAY, ON PURPOSE. It is the test the save points and readers must pass before they
 * move (G1/G2). It is NOT in CI until it passes; when a group makes a check pass, that check stays.
 *
 * The rule (§11): for any fact, once `caseFile.facts[fact]` exists, every old copy of that fact (a form's
 * field, the guided answers, the review's answers, the analysis copy intakeData) is ignored by
 * caseFileOf and by every converted reader, whatever is written there later. A removal through the new
 * path (POST /api/cases/facts, factRecord.ts applyFactWrites) wins on every reader; a newer answer
 * through the new path wins over an older copy's.
 *
 * What it does, in Small Claims, civil and Family: writes the old copy of the other party (the court's own
 * form field, and the analysis copy in intakeData, as an unconverted screen and "Show my next step" save
 * them), then removes the other party through the rail (applyFactWrites), then asks each shared reader:
 *   - caseFileOf (caseFileOfMaster)          -- the case file every screen reads
 *   - readCaseRecord(...).otherParty         -- the case page and the forms page
 *   - storedIntakeValues(...).otherParty     -- the form prefill (builder/page.tsx)
 *   - getCaseValues(...).defendantName       -- generate-form's values (app/api/generate-form/route.ts)
 * and, for the amount, an answer through the rail against a different old copy. Finally: the browser's
 * whole-checkpoint save (intakeCheckpoint.ts saveCheckpoint) must keep the facts the rail wrote.
 *
 * Each failure line names the code line that causes it today. Readers that read no saved row in a
 * terminal (the case title column, CaseHomeContext's header, the dashboard card's JSON path select, the
 * chat) are covered by the browser spec tests/browser/fact-coexistence.spec.ts.
 *
 * Wrong if: any reader here shows "Old Name" after G1/G2 claim to have moved it.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { CASE_FILE_SECTION } from "../../src/lib/case-system/caseFile/caseFile";
import { caseFileOfMaster } from "../../src/lib/case-system/caseFile/caseFileOfMaster";
import { applyFactWrites, factRecordsOf, type FactWrite } from "../../src/lib/case-system/caseFile/factRecord";
import { readCaseRecord, storedIntakeValues } from "../../src/lib/case-system/caseRecord";
import { saveCheckpoint, type Checkpoint, type IntakeCourt } from "../../src/lib/case-system/intakeCheckpoint";
// generate-form builds a database client when imported: given a placeholder address it never calls (no secret, no network).
type GetCaseValues = (master: unknown, court: IntakeCourt) => { defendantName: string };

const OWNER = "11111111-1111-4111-8111-111111111111";
const FLOW = "22222222-2222-4222-8222-222222222222";
const REVISION = "33333333-3333-4333-8333-333333333333";
const LATER = "44444444-4444-4444-8444-444444444444";
const OLD = "Old Name Movers Ltd.";
const NOW = new Date("2026-11-01T15:00:00.000Z");

let passed = 0;
const failed: string[] = [];
const check = (name: string, ok: boolean, cause: string) => {
  if (ok) { passed += 1; console.log(`pass  ${name}`); return; }
  failed.push(name);
  console.log(`FAIL  ${name}\n      expected to fail before G1/G2 -- cause today: ${cause}`);
};

/** Where each court's unconverted form keeps the other party and the amount. */
function oldCopies(court: IntakeCourt, otherParty: string, amount: string): Checkpoint["sections"] {
  if (court === "family") return { family: { otherParty } };
  return { [court]: { input: { otherParty, amountClaimed: amount } } };
}

function master(court: IntakeCourt, sections: Checkpoint["sections"], facts: Record<string, unknown> = {}): Record<string, unknown> {
  const checkpoint: Checkpoint = { version: 1, flowId: FLOW, courtPath: court, revision: REVISION, inputRevision: REVISION, sections: { story: { text: "Synthetic: a moving company broke my table in May 2026." }, ...sections, [CASE_FILE_SECTION]: { facts } } };
  // The analysis copy "Show my next step" saves (builder/page.tsx:1099), with the old name.
  return { courtPath: court, workflowStatus: { intakeReview: { version: 1 } }, intakeCheckpoint: checkpoint, intakeData: { courtPath: court, otherParty: OLD, extra: { otherParty: OLD, amountClaimed: "9000" } } };
}

/** Through the rail, as POST /api/cases/facts applies it. */
function throughRail(court: IntakeCourt, stored: Record<string, unknown>, writes: FactWrite[]): Record<string, unknown> {
  const result = applyFactWrites(stored, court, FLOW, writes, NOW);
  if (!result.ok) throw new Error(`the rail refused the write: ${result.reject}`);
  return result.master;
}

function fakeDb(court: IntakeCourt, stored: Record<string, unknown>) {
  let row: Record<string, unknown> = { id: FLOW, user_id: OWNER, court_path: court, updated_at: "first", master_result: stored };
  const db = { from() {
    let values: Record<string, unknown> | undefined;
    const filters: Record<string, unknown> = {};
    const matches = () => Object.entries(filters).every(([key, value]) => row[key] === value);
    const chain = {
      select() { if (values) { if (!matches()) return Promise.resolve({ data: [], error: null }); row = { ...row, ...values }; return Promise.resolve({ data: [{ id: FLOW }], error: null }); } return chain; },
      eq(key: string, value: unknown) { filters[key] = value; return chain; },
      abortSignal() { return chain; },
      maybeSingle() { return Promise.resolve({ data: matches() ? row : null, error: null }); },
    };
    return { select() { return chain; }, update(next: Record<string, unknown>) { values = next; return chain; } };
  } } as unknown as Pick<SupabaseClient, "from">;
  return { db, master: () => row.master_result as Record<string, unknown> };
}

async function main() {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://127.0.0.1:9";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "placeholder-not-a-key";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "placeholder-not-a-key";
  const { getCaseValues } = (await import("../../app/api/generate-form/route")) as unknown as { getCaseValues: GetCaseValues };
  for (const court of ["small-claims", "civil", "family"] as const) {
    // 1-2. The old copy written by an unconverted screen; the removal through the new path.
    const removed = throughRail(court, master(court, oldCopies(court, OLD, "9000")), [{ fact: "otherParty", state: "removed", source: "person" }]);
    // The unconverted screen writes the old copy again after the removal (whatever is written there later).
    const rewritten = { ...removed, intakeCheckpoint: { ...(removed.intakeCheckpoint as Checkpoint), sections: { ...(removed.intakeCheckpoint as Checkpoint).sections, ...oldCopies(court, OLD, "9000") } } };
    // Control (passes today): the harness can see a removal -- the same removal through today's change
    // record (caseFile.changes) is honoured by caseFileOf, so a failure below is the fact record unread.
    const viaChanges = master(court, oldCopies(court, OLD, "9000"));
    (viaChanges.intakeCheckpoint as Checkpoint).sections[CASE_FILE_SECTION] = { changes: { otherParty: { state: "removed", at: NOW.toISOString(), seq: 1 } } };
    const control = caseFileOfMaster(viaChanges, court).otherParty;
    check(`${court}: control -- the same removal through today's change record is honoured by caseFileOf`, control.removed === true && control.value === undefined, "the harness itself is wrong");
    const file = caseFileOfMaster(rewritten, court);
    check(`${court}: caseFileOf -- the other party removed through the new path stays removed over the form's old copy`, file.otherParty.state !== "answered" && file.otherParty.value !== OLD,
      "caseFile.ts:234 caseFileOf never reads sections.caseFile.facts; it gives the form's copy at caseFile.ts:280-298 (only the older change record, caseFile.ts:426, is applied last)");
    check(`${court}: readCaseRecord -- the case page's other party is empty after the removal`, readCaseRecord(rewritten, court).otherParty === "",
      "caseRecord.ts:169 reads intakeData.otherParty / extra.otherParty unless the change record (not the fact record) says otherwise");
    check(`${court}: storedIntakeValues -- the form prefill has no other party after the removal`, !storedIntakeValues(rewritten).otherParty,
      "caseRecord.ts:206 picks intakeData.otherParty / extra.otherParty / civilInput.otherParty directly");
    check(`${court}: getCaseValues -- generate-form's defendant is not the removed name`, !getCaseValues(rewritten, court).defendantName.includes(OLD),
      "app/api/generate-form/route.ts:589-600 deep-searches the whole saved row for any key named otherParty");

    // A newer answer through the new path wins over an older copy (Small Claims and civil keep an amount on the form).
    if (court !== "family") {
      const answered = throughRail(court, master(court, oldCopies(court, "Acme", "9000")), [{ fact: "amount", state: "answered", value: "5000", source: "person" }]);
      const amount = caseFileOfMaster(answered, court).amount;
      check(`${court}: caseFileOf -- the amount answered through the new path (5000) wins over the form's old copy (9000)`, amount.value === 5000,
        `caseFile.ts:280-298 gives the form's amountClaimed first (first answer stands, caseFile.ts:170 give) and never reads the fact record; got ${JSON.stringify(amount.value)}`);
    }

    // The browser's whole-checkpoint save keeps the facts the server wrote.
    const stored = throughRail(court, master(court, oldCopies(court, "Acme", "9000")), [{ fact: "otherParty", state: "removed", source: "person" }]);
    const { db, master: after } = fakeDb(court, stored);
    const tab = stored.intakeCheckpoint as Checkpoint;
    // The tab's snapshot, made before the server's fact write (its caseFile section has no facts), with one more answer.
    const snapshot: Checkpoint = { ...tab, revision: LATER, sections: { ...tab.sections, [CASE_FILE_SECTION]: {}, story: { text: "Synthetic: a moving company broke my table in May 2026. More detail." } } };
    const outcome = await saveCheckpoint(db, OWNER, FLOW, snapshot, REVISION, () => true);
    const kept = factRecordsOf((after().intakeCheckpoint as Checkpoint).sections).otherParty;
    check(`${court}: saveCheckpoint -- the tab's whole-checkpoint save keeps the fact the server wrote`, outcome.ok && kept?.state === "removed",
      `intakeCheckpoint.ts:115 writes the tab's snapshot whole (intakeCheckpoint: committed), so a fact the server wrote since the tab's copy is erased (save ok: ${outcome.ok})`);
  }

  console.log(`\nFact coexistence (FAILING FIRST, not in CI): ${passed} passed, ${failed.length} failed.`);
  if (failed.length) process.exit(1);
  console.log("All coexistence checks pass: the rule holds; add this suite to CI.");
}

void main();
