/**
 * THE REVIEW AND CASE-FILE SAVES GO THROUGH THE ONE WRITER, EACH ANSWER UNDER ITS FACT ID (case core G2;
 * CASE_CORE_DESIGN.md §10, group G2; founder, 4 Nov: "a fact id for every answer").
 *
 * The rule: a save from the review (IntakeReviewPanel), "Change" (ChangeAnswer), "Not saved yet" (NotSavedYet),
 * the chat's "Use the suggestion" (the kind of claim), the form's fill bookkeeping (AskedField) and the case
 * position (the step page's dates and the overview's kind) goes through one writer:
 *   - the browser writer (app/_components/caseWrite.ts) writes the screen's old copy AND, for a field the
 *     field-to-fact table (fieldFacts.ts) maps to a fact, records the answer -- or its removal, for a box
 *     emptied -- in the change record, which the tab sends to POST /api/cases/facts, where the server numbers it;
 *   - a field the table has no row for is refused (no answer is saved without a decision on its fact);
 *   - the position save (route and browser) writes the fact record in the same guarded save (factSave.ts).
 *
 * Checks:
 *   1. no save point of group G2 is left on the one-writer list, and none is found in the G2 files;
 *   2. per court (Small Claims, civil, Family), pure: a first answer given in the review (nothing held before)
 *      is recorded under its fact id; once sent, the server's record holds it with a number and caseFileOf
 *      reads it; an emptied answered box records a removal; a bookkeeping field records nothing; a field with no
 *      row is refused; a start answer (side) changes only with the start questions;
 *   3. the browser writer, on a stand-in recovery: the old copy is written and the fact recorded, in one call;
 *      "Change" and "Not saved yet" write the change record through it;
 *   4. the position: its kind and dates map to fact ids, and a position save writes them into the fact record
 *      with the server's numbers (a stand-in database).
 *
 * WHAT FAILURE IT EXISTS TO CATCH: an answer given in the review that never reaches the fact record (so the
 * server's order cannot decide it, and an older copy can outrank it), a removal not recorded, or a new save of
 * an answer that bypasses the one writer.
 */
import { CASE_FILE_SECTION, caseFileOf, changesOf, type FactChanges } from "../../src/lib/case-system/caseFile/caseFile";
import { applyFactWrites, factRecordsOf } from "../../src/lib/case-system/caseFile/factRecord";
import { factOfField } from "../../src/lib/case-system/caseFile/fieldFacts";
import { pendingWrites } from "../../src/lib/case-system/caseFile/pendingFacts";
import { answerChanges, UnmappedField } from "../../src/lib/case-system/caseFile/tabWrite";
import { positionFactWrites, saveWithFacts } from "../../src/lib/case-system/caseFile/factSave";
import { writeAnswer, writeChange, choosePending, type CaseWriteRecovery } from "../../app/_components/caseWrite";
import { scanSavePoints, type OneWriterEntry } from "./verifyOneWriter";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import allowed from "./oneWriterAllowed.json";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
type Court = "small-claims" | "civil" | "family";
type Sections = Record<string, Record<string, unknown>>;
const ID = "00000000-0000-4000-8000-000000000904";
const T = new Date("2026-11-04T10:00:00Z");
const cp = (court: Court, sections: Sections): Checkpoint =>
  ({ version: 1, flowId: ID, courtPath: court, revision: ID, sections: { story: { text: "Synthetic story for the writer check." }, ...sections } }) as unknown as Checkpoint;

// 1. No G2 save point left.
{
  const g2 = (allowed as OneWriterEntry[]).filter((entry) => entry.group === "G2");
  check("1. no save point of group G2 is left on the one-writer list", g2.length === 0, g2.map((entry) => `${entry.file} :: ${entry.target}`).join("\n      "));
  const G2_FILES = ["app/_components/IntakeReviewPanel.tsx", "app/_components/ChangeAnswer.tsx", "app/_components/NotSavedYet.tsx", "app/builder/_components/positionSave.ts", "app/api/cases/position/route.ts"];
  const found = scanSavePoints().filter((point) => G2_FILES.includes(point.file) || (point.file === "app/builder/_components/GuidedSmallClaimsIntake.tsx" && point.kind === "recovery-put" && point.target.includes("matchedClaimType")) || (point.file === "app/_components/AskedField.tsx" && point.target.includes("filledWords")));
  check("1. no save point is found in the G2 files (the review, Change, Not saved yet, the position) or the three found by #542's merge", found.length === 0, found.map((point) => `${point.file}:${point.line} ${point.kind} ${point.target}`).join("\n      "));
}

// 2. Pure: each court's first answer in the review is recorded under its fact id; sent, the server numbers it.
type Case = { court: Court; section: string; field: string; before: unknown; after: unknown; fact: "amount" | "otherParty"; value: unknown; read: unknown };
const CASES: Case[] = [
  { court: "small-claims", section: "builder", field: "initialAnswers", before: {}, after: { "sc-amount-claimed": "$2,400" }, fact: "amount", value: "$2,400", read: 2400 },
  { court: "civil", section: "civil", field: "input", before: {}, after: { otherParty: "Pat Synthetic" }, fact: "otherParty", value: "Pat Synthetic", read: "Pat Synthetic" },
  { court: "family", section: "family", field: "otherParty", before: "", after: "Sam Synthetic", fact: "otherParty", value: "Sam Synthetic", read: "Sam Synthetic" },
];
for (const c of CASES) {
  const sections: Sections = { [c.section]: { [c.field]: c.after } };
  const changes = answerChanges(sections, { section: c.section, field: c.field, before: c.before, after: c.after }, caseFileOf(cp(c.court, sections)), T);
  const entry = changesOf({ [CASE_FILE_SECTION]: { changes } })[c.fact];
  check(`2. ${c.court}: a first answer given in the review is recorded under its fact id (${c.fact})`, entry?.state === "answered" && JSON.stringify(entry.value) === JSON.stringify(c.value), JSON.stringify(changes));
  const writes = pendingWrites(changes);
  const master = { intakeCheckpoint: cp(c.court, { ...sections, [CASE_FILE_SECTION]: { changes } }) };
  const saved = applyFactWrites(master, c.court, ID, writes, T);
  const record = saved.ok ? factRecordsOf((saved.master.intakeCheckpoint as Checkpoint).sections)[c.fact] : undefined;
  check(`2. ${c.court}: sent, the server's record holds it with a number`, Boolean(record && record.seq >= 1 && record.state === "answered"), JSON.stringify(saved));
  // Read from the fact record alone (no form copy beside it), so only the numbered answer can give it.
  const read = saved.ok ? caseFileOf(cp(c.court, { [CASE_FILE_SECTION]: { facts: saved.facts } }))[c.fact].value : undefined;
  check(`2. ${c.court}: caseFileOf reads the numbered answer from the fact record alone`, JSON.stringify(read) === JSON.stringify(c.read), JSON.stringify(read));
  // Emptied: a removal.
  const emptiedAfter = c.section === "family" ? "" : Object.fromEntries(Object.keys(c.after as object).map((key) => [key, ""]));
  const held: Sections = { [c.section]: { [c.field]: c.after }, [CASE_FILE_SECTION]: { facts: saved.ok ? saved.facts : {} } };
  const emptied = answerChanges({ ...held, [c.section]: { [c.field]: emptiedAfter } }, { section: c.section, field: c.field, before: c.after, after: emptiedAfter }, caseFileOf(cp(c.court, held)), T);
  check(`2. ${c.court}: an emptied answered box records a removal`, changesOf({ [CASE_FILE_SECTION]: { changes: emptied } })[c.fact]?.state === "removed", JSON.stringify(emptied));
}
{
  const none = answerChanges({ civil: { personSet: ["yourRole"] } }, { section: "civil", field: "personSet", before: [], after: ["yourRole"] }, undefined, T);
  check("2. a bookkeeping field (civil.personSet) records nothing", !none || Object.keys(none).length === 0, JSON.stringify(none));
  let refused = false;
  try { answerChanges({}, { section: "made-up", field: "box", before: "", after: "x" }, undefined, T); } catch (error) { refused = error instanceof UnmappedField; }
  check("2. a field with no row in the field-to-fact table is refused", refused);
  const start = answerChanges({ builder: { initialAnswers: { "sc-orient-role": "plaintiff" } } }, { section: "builder", field: "initialAnswers", before: {}, after: { "sc-orient-role": "plaintiff" } }, undefined, T);
  check("2. a start answer (side) changes only with the start questions, never through the change record", !changesOf({ [CASE_FILE_SECTION]: { changes: start } }).side, JSON.stringify(start));
  const served = answerChanges({ family: { timeline: "Served: 2026-09-01" } }, { section: "family", field: "timeline", before: "", after: "Served: 2026-09-01", facts: { servedDate: "2026-09-01" } }, undefined, T);
  check("2. Family's day of service, kept in its Timeline, is recorded under servedDate", changesOf({ [CASE_FILE_SECTION]: { changes: served } }).servedDate?.state === "answered", JSON.stringify(served));
}

// 3. The browser writer on a stand-in recovery.
function standIn(court: Court, sections: Sections): CaseWriteRecovery & { sections: Sections; puts: string[] } {
  const state = { sections: structuredClone(sections), puts: [] as string[] };
  return Object.assign(state, {
    read: (section: string, key: string) => state.sections[section]?.[key],
    put: (section: string, key: string, value: unknown) => { state.puts.push(`${section}:${key}`); state.sections = { ...state.sections, [section]: { ...state.sections[section], [key]: structuredClone(value) } }; },
    getReview: () => ({ checkpoint: cp(court, state.sections) }),
    getSavedMaster: () => null,
  });
}
{
  const recovery = standIn("small-claims", { builder: { initialAnswers: {} } });
  writeAnswer(recovery, "builder", "initialAnswers", { "sc-amount-claimed": "$2,400" }, { fromReview: true });
  check("3. the browser writer writes the old copy", (recovery.sections.builder.initialAnswers as Record<string, unknown>)["sc-amount-claimed"] === "$2,400", recovery.puts.join(","));
  check("3. and records the answer under its fact id in the same call", changesOf(recovery.sections).amount?.state === "answered", JSON.stringify(recovery.sections[CASE_FILE_SECTION]));
  let refused = false;
  try { writeAnswer(recovery, "made-up", "box", "x"); } catch (error) { refused = error instanceof UnmappedField; }
  check("3. the browser writer refuses a field with no row", refused);
  const change = standIn("civil", { civil: { input: { otherParty: "Pat Synthetic" } } });
  writeChange(change, "otherParty", { state: "removed" });
  check("3. \"Change\" writes the change record through the writer", changesOf(change.sections).otherParty?.state === "removed", JSON.stringify(change.sections[CASE_FILE_SECTION]));
  const held: FactChanges = { amount: { state: "answered", value: "2650", at: T.toISOString(), seq: 1, seen: 2, held: { state: "answered", value: 2400, seq: 4 } } } as FactChanges;
  const pending = standIn("small-claims", { [CASE_FILE_SECTION]: { changes: held } });
  choosePending(pending, "amount", true);
  check("3. \"Not saved yet\" Save marks the edit to send as the newest save, through the writer", changesOf(pending.sections).amount?.force === true, JSON.stringify(pending.sections[CASE_FILE_SECTION]));
  choosePending(pending, "amount", false);
  check("3. \"Not saved yet\" Discard drops the edit, through the writer", !changesOf(pending.sections).amount, JSON.stringify(pending.sections[CASE_FILE_SECTION]));
}

// 4. The position.
{
  const kind = factOfField("position", "claimKind");
  const day = factOfField("position", "dateAnswers", "sc-date-claim-served");
  check("4. the position's kind of claim maps to the fact claimKind", "fact" in kind && kind.fact === "claimKind", JSON.stringify(kind));
  check("4. the position's day the claim was served maps to a fact", "fact" in day, JSON.stringify(day));
  const writes = positionFactWrites({ claimKind: "unpaid-invoice", dateAnswers: { "sc-date-claim-served": "2026-09-01" } });
  check("4. a position patch gives its fact writes (kind and day)", writes.some((w) => w.fact === "claimKind") && writes.length === 2, JSON.stringify(writes));
  const row: { master_result: Record<string, unknown>; updated_at: string } = { updated_at: "2026-11-04T09:00:00Z", master_result: { intakeCheckpoint: cp("small-claims", {}) } };
  const chain = (kind: "select" | "update", values?: Record<string, unknown>) => {
    const filters: Record<string, string> = {};
    const self = {
      eq(column: string, value: string) { filters[column] = value; return self; },
      async maybeSingle() { return { data: { master_result: row.master_result, updated_at: row.updated_at }, error: null }; },
      async select() {
        if (kind !== "update" || filters.updated_at !== row.updated_at) return { data: [], error: null };
        row.master_result = values!.master_result as Record<string, unknown>;
        row.updated_at = String(values!.updated_at);
        return { data: [{ id: ID }], error: null };
      },
    };
    return self;
  };
  const client = { from: () => ({ select: () => chain("select"), update: (values: Record<string, unknown>) => chain("update", values) }) };
  void saveWithFacts(client as never, { caseId: ID, userId: ID, court: "small-claims" }, (master) => ({ ...master, position: { claimKind: "unpaid-invoice" } }), writes, () => T).then((outcome) => {
    const facts = factRecordsOf((row.master_result.intakeCheckpoint as Checkpoint).sections);
    check("4. a position save writes the old copy and the fact record in one guarded save", outcome.ok && Boolean(facts.claimKind?.seq) && (row.master_result.position as Record<string, unknown> | undefined)?.claimKind === "unpaid-invoice", JSON.stringify(outcome));
    console.log(failures ? `\n${failures} check(s) failed.` : "\nThe review writer: every check passed.");
    if (failures) process.exitCode = 1;
  });
}
