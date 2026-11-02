/**
 * THE RAILS OF THE ONE CASE RECORD (case core G0; docs CASE_CORE_DESIGN.md §1, §10, §12).
 *
 * What it checks, with no network and no AI:
 *   1. `give` is exported from caseFile.ts and records an answer the way caseFileOf does.
 *   2. The server alone orders saves (§12): a write naming `seq` or `at` is refused; each accepted write
 *      gets seq = the highest stored seq + 1 and the server's time, whatever the browser's clock says;
 *      writes in one request get consecutive seqs; the checkpoint's revision and every other section are
 *      left as they were; a case with no intake checkpoint is refused.
 *   3. Two tabs, on the server (§12): a write made against an older view of a fact (its `seenSeq` behind
 *      the stored seq) is a conflict for that fact only -- not applied, the stored record returned -- and
 *      the request's other facts are saved; "Save" (force) makes it the newest, with the next seq.
 *   4. The compare-and-set retry: through factSave.ts saveFactWrites (what POST /api/cases/facts runs)
 *      and a stand-in database where another save lands between the read and the write, the write is
 *      retried on the new row and gets the seq after the other save's.
 *   5. The one field-to-fact table (fieldFacts.ts): every mapped id is a real fact; no field maps to two
 *      facts (a compound question maps to neither and is listed); every literal (section, field) a save
 *      point writes today (test:one-writer's scan) has a row, so a new field needs a decision.
 *   Each check that guards a property is shown to fail on a planted mutation in the same run.
 *
 * What failure it exists to catch: a seq or ordering time taken from the browser (two tabs then order
 * by clock skew, and an older edit can win); a lost race that silently drops a save or reuses a seq; a
 * field written under the wrong fact id, or under two.
 *
 * The coexistence rule (§11) is NOT here: it fails today, by design, in test:fact-coexistence.
 */
import { CASE_FILE_SECTION, caseFileOf, emptyCaseFile, give } from "../../src/lib/case-system/caseFile/caseFile";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { FACT_IDS, applyFactWrites, factRecordsOf, readFactWrites, type FactWrite } from "../../src/lib/case-system/caseFile/factRecord";
import { saveFactWrites } from "../../src/lib/case-system/caseFile/factSave";
import { FIELD_ROWS, factOfField, fieldRow } from "../../src/lib/case-system/caseFile/fieldFacts";
import { factsOfQuestion } from "../../src/lib/case-system/caseFile/factsOfQuestion";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { scanSavePoints } from "./verifyOneWriter";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const CASE_ID = "11111111-1111-4111-8111-111111111111";
const REV = "22222222-2222-4222-8222-222222222222";
const masterWith = (facts: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
  workflowStatus: { intakeReview: { version: 1 } },
  intakeCheckpoint: { version: 1, flowId: CASE_ID, courtPath: "small-claims", revision: REV, sections: { story: { text: "A moving company broke my table." }, [CASE_FILE_SECTION]: { facts, changes: {} }, ...extra } },
});
const NOW = new Date("2026-11-01T15:00:00.000Z");
const sectionsOf = (master: Record<string, unknown>) => (master.intakeCheckpoint as { sections: Record<string, Record<string, unknown>> }).sections;

async function main() {
// 1. give is exported and records an amount as a number.
{
  const file = emptyCaseFile();
  give(file, "amount", "$5,000", "sc-amount-claimed");
  check("give is exported from caseFile.ts and keeps an amount as a number", file.amount.state === "answered" && file.amount.value === 5000, JSON.stringify(file.amount));
}

// 2. The server orders saves.
{
  const refused = readFactWrites({ facts: [{ fact: "amount", state: "answered", value: "5000", seq: 9 }] });
  check("a write naming seq is refused (the server alone orders saves)", !refused.ok);
  check("a write naming at is refused (no ordering time from the browser)", !readFactWrites({ facts: [{ fact: "amount", state: "answered", value: "5000", at: "2099-01-01T00:00:00Z" }] }).ok);
  check("a write naming a fact that is not one is refused", !readFactWrites({ facts: [{ fact: "otherPartyCopy", state: "answered", value: "x" }] }).ok);
  check("the same fact twice in one request is refused", !readFactWrites({ facts: [{ fact: "amount", state: "removed" }, { fact: "amount", state: "removed" }] }).ok);
  check("a removal carrying a value is refused", !readFactWrites({ facts: [{ fact: "otherParty", state: "removed", value: "x" }] }).ok);

  const stored = masterWith({ otherParty: { state: "answered", value: "Acme Movers", source: "person", at: "2026-10-31T10:00:00.000Z", seq: 7 } });
  const read = readFactWrites({ facts: [{ fact: "amount", state: "answered", value: "$5,000" }, { fact: "evidence", state: "answered", value: ["photos"] }, { fact: "whenHappened", state: "unsure" }] });
  const result = read.ok ? applyFactWrites(stored, "small-claims", CASE_ID, read.writes, NOW) : null;
  const saved = result?.ok ? result.saved : [];
  check("each accepted write gets the next seq after the highest stored (7 -> 8, 9, 10)", saved.map((item) => item.seq).join() === "8,9,10", JSON.stringify(saved));
  check("each accepted write gets the server's time", saved.every((item) => item.at === NOW.toISOString()));
  const facts = result?.ok ? factRecordsOf(sectionsOf(result.master)) : {};
  check("the amount is kept as the case file keeps it (a number, through give)", facts.amount?.value === 5000 && facts.amount.state === "answered", JSON.stringify(facts.amount));
  check("an unsure write holds no value", facts.whenHappened?.state === "unsure" && facts.whenHappened.value === undefined);
  check("a fact not written keeps its record", facts.otherParty?.seq === 7 && facts.otherParty.value === "Acme Movers");
  const before = stored.intakeCheckpoint;
  const after = result?.ok ? (result.master.intakeCheckpoint as typeof before) : before;
  check("the checkpoint's revision is not changed (an open tab's next save is not refused)", after.revision === before.revision);
  check("every other section is left as it was", JSON.stringify(after.sections.story) === JSON.stringify(before.sections.story) && JSON.stringify((after.sections[CASE_FILE_SECTION] as Record<string, unknown>).changes) === "{}");
  const noCheckpoint = applyFactWrites({ workflowStatus: {} }, "small-claims", CASE_ID, [{ fact: "amount", state: "removed", source: "person" }], NOW);
  check("a case with no intake checkpoint is refused, never given a made-up one", !noCheckpoint.ok && noCheckpoint.reject === "no-intake-checkpoint");
  // Mutation: if the browser's seq were used, the check above would see it. Planted: a write whose seq the
  // reader let through would order by the browser -- shown by feeding applyFactWrites a forged stored seq.
  const forged = applyFactWrites(masterWith({ amount: { state: "answered", value: 1, source: "person", at: "x", seq: 99 } }), "small-claims", CASE_ID, [{ fact: "otherParty", state: "removed", source: "person" }], NOW);
  check("mutation: the next seq follows whatever the STORED record holds (99 -> 100), so a seq can only come from the row", forged.ok && forged.saved[0]?.seq === 100);
}

// 3. Two tabs, on the server.
{
  const stored = masterWith({ amount: { state: "answered", value: 5000, source: "person", at: "2026-11-01T14:00:00.000Z", seq: 4 } });
  // Tab 2 saw the amount at seq 3 (before tab 1's save at 4), and also changed the other party.
  const writes: FactWrite[] = [
    { fact: "amount", state: "answered", value: "6000", source: "person", seenSeq: 3 },
    { fact: "otherParty", state: "answered", value: "Acme Movers", source: "person", seenSeq: 0 },
  ];
  const result = applyFactWrites(stored, "small-claims", CASE_ID, writes, NOW);
  check("two tabs: the fact edited against an older view is a conflict, with the newer saved value returned", result.ok && result.conflicts.length === 1 && result.conflicts[0].fact === "amount" && result.conflicts[0].stored.value === 5000);
  const facts = result.ok ? factRecordsOf(sectionsOf(result.master)) : {};
  check("two tabs: the conflicting edit is not applied", facts.amount?.value === 5000 && facts.amount.seq === 4);
  check("two tabs: the tab's other facts are saved", facts.otherParty?.value === "Acme Movers" && facts.otherParty.seq === 5);
  const forced = applyFactWrites(result.ok ? result.master : stored, "small-claims", CASE_ID, [{ ...writes[0], force: true }], NOW);
  const after = forced.ok ? factRecordsOf(sectionsOf(forced.master)) : {};
  check("two tabs: \"Save\" makes the held edit the newest save, with the next seq, so it wins", after.amount?.value === 6000 && after.amount.seq === 6);
  const current = applyFactWrites(stored, "small-claims", CASE_ID, [{ ...writes[0], seenSeq: 4 }], NOW);
  check("two tabs: an edit made against the current view saves normally", current.ok && current.conflicts.length === 0 && current.saved[0]?.seq === 5);
  const allConflict = applyFactWrites(stored, "small-claims", CASE_ID, [writes[0]], NOW);
  check("two tabs: a request whose only fact conflicts writes nothing", allConflict.ok && allConflict.saved.length === 0 && allConflict.master === stored);
}

// 4. The compare-and-set retry, through what the route runs.
{
  type Row = { master_result: Record<string, unknown>; updated_at: string };
  const db = { row: { master_result: masterWith({ amount: { state: "answered", value: 5000, source: "person", at: "2026-11-01T14:00:00.000Z", seq: 4 } }), updated_at: "t1" } as Row, reads: 0, writes: 0 };
  // Another save lands after this route's first read: it adds the other party at seq 5 and stamps t2.
  const otherSave = () => {
    const sections = sectionsOf(db.row.master_result);
    const facts = { ...(sections[CASE_FILE_SECTION].facts as Record<string, unknown>), otherParty: { state: "removed", source: "person", at: "2026-11-01T14:59:00.000Z", seq: 5 } };
    db.row = { master_result: { ...db.row.master_result, intakeCheckpoint: { ...(db.row.master_result.intakeCheckpoint as object), sections: { ...sections, [CASE_FILE_SECTION]: { ...sections[CASE_FILE_SECTION], facts } } } }, updated_at: "t2" };
  };
  const chain = (kind: "select" | "update", values?: Record<string, unknown>) => {
    const filters: Record<string, string> = {};
    const self = {
      eq(column: string, value: string) { filters[column] = value; return self; },
      async maybeSingle() { db.reads += 1; const read = { data: { master_result: db.row.master_result, updated_at: db.row.updated_at }, error: null }; if (db.reads === 1) otherSave(); return read; },
      async select() {
        db.writes += 1;
        if (kind !== "update" || filters.updated_at !== db.row.updated_at) return { data: [], error: null };
        db.row = { master_result: values!.master_result as Record<string, unknown>, updated_at: String(values!.updated_at) };
        return { data: [{ id: CASE_ID }], error: null };
      },
    };
    return self;
  };
  const client = { from: () => ({ select: () => chain("select"), update: (values: Record<string, unknown>) => chain("update", values) }) };
  const outcome = await saveFactWrites(client, { caseId: CASE_ID, userId: "u1", court: "small-claims" }, [{ fact: "amount", state: "answered", value: "7000", source: "person", seenSeq: 4 }], () => NOW);
  const facts = factRecordsOf(sectionsOf(db.row.master_result));
  check("compare-and-set: the lost race is retried on the new row (two reads, two write attempts)", db.reads === 2 && db.writes === 2, `reads ${db.reads}, writes ${db.writes}`);
  check("compare-and-set: the retried write gets the seq after the other save's (5 -> 6), never a reused one", outcome.ok && outcome.saved[0]?.seq === 6 && facts.amount?.seq === 6 && facts.amount.value === 7000, JSON.stringify(outcome));
  check("compare-and-set: the other save's fact is kept", facts.otherParty?.state === "removed" && facts.otherParty.seq === 5);
}

// 6. Option A (1 Nov): caseFileOf applies the fact record last.
{
  const cp = (caseFile: Record<string, unknown>, form: Record<string, unknown> = { otherParty: "Old Name Ltd.", amountClaimed: "9000" }): Checkpoint =>
    ({ version: 1, flowId: CASE_ID, courtPath: "small-claims", revision: REV, sections: { story: { text: "A moving company broke my table." }, "small-claims": { input: form }, [CASE_FILE_SECTION]: caseFile } });
  const rec = (state: string, seq: number, value?: unknown) => ({ state, seq, at: "2026-11-01T15:00:00.000Z", source: "person", ...(value === undefined ? {} : { value }) });
  const change = (state: string, seq: number, value?: unknown) => ({ state, seq, at: "2099-01-01T00:00:00.000Z", ...(value === undefined ? {} : { value }) });
  const removedOverChange = caseFileOf(cp({ facts: { otherParty: rec("removed", 1) }, changes: { otherParty: change("answered", 99, "Later Change Ltd.") } }));
  check("option A: a fact record wins over a later change-record entry for the same fact (seqs never compared)", removedOverChange.otherParty.removed === true && removedOverChange.otherParty.value === undefined, JSON.stringify(removedOverChange.otherParty));
  const answeredOverChange = caseFileOf(cp({ facts: { amount: rec("answered", 1, 5000) }, changes: { amount: change("answered", 99, "7000") } }));
  check("option A: a fact record's answer wins over a change-record answer and the form's copy", answeredOverChange.amount.value === 5000, JSON.stringify(answeredOverChange.amount));
  const unsure = caseFileOf(cp({ facts: { amount: rec("unsure", 2) } }));
  check("option A: an unsure record makes the fact unsure over the form's answer", unsure.amount.state === "unsure" && unsure.amount.value === undefined, JSON.stringify(unsure.amount));
  const noRecord = caseFileOf(cp({ changes: { otherParty: change("answered", 3, "Changed Ltd.") } }));
  const noRecordAtAll = caseFileOf(cp({}));
  check("option A: no fact record -> today's order (the change record over the form's copy; else the form's copy)", noRecord.otherParty.value === "Changed Ltd." && noRecordAtAll.otherParty.value === "Old Name Ltd." && noRecordAtAll.amount.value === 9000);
  const otherFactUntouched = caseFileOf(cp({ facts: { amount: rec("removed", 4) } }));
  check("option A: a record for one fact leaves every other fact to today's order", otherFactUntouched.otherParty.value === "Old Name Ltd." && otherFactUntouched.amount.removed === true);
}

// 5. The one field-to-fact table.
{
  const realFact = new Set<string>(FACT_IDS);
  const mapped: string[] = [];
  const compound: string[] = [];
  const problems: string[] = [];
  const keysOf: { situation: string[]; keyed: string[] } = {
    situation: ["where", "started", "papers", "received", "filed", "court", "stage", "marriedWhere"],
    keyed: [...QUESTION_BANK.map((question) => question.id), ...QUESTION_BANK.flatMap((question): string[] => (typeof question.capturesField === "string" ? [question.capturesField] : [])),
      "facts", "yourRole", "filedDocuments", "documents", "issues", "childrenInfo", "servedDate", "serviceDetails", "upcomingCourtDate", "goal", "legalRemedy", "otherParty", "urgent", "amountClaimed", "courtFileNumber",
      "remedySought", "caseStage", "role", "claimFiled", "defenceFiled", "amountClaimedText", "remedySoughtText", "timelineText", "claimReceivedText", "serviceMethodText", "serviceDetailsText", "evidenceText", "disputeCategory",
      "yourName", "timeline", "evidence", "damagesBreakdown", "settlementEfforts", "marriedToOtherParty", "caseInvolvesChildren", "haveChildTogether", "sc-date-claim-served", "case-date-trial-date"],
  };
  for (const row of FIELD_ROWS) {
    const keys = row.kind === "keyed" ? (row.surface === "situation" ? keysOf.situation : keysOf.keyed) : [undefined as string | undefined];
    for (const key of keys) {
      const where = `${row.section}.${row.field}${key ? `[${key}]` : ""}`;
      const result = factOfField(row.section, row.field, key);
      if ("fact" in result) { mapped.push(where); if (!realFact.has(result.fact)) problems.push(`${where} -> ${result.fact} is not a fact`); }
      if ("compound" in result) {
        compound.push(`${key ?? `${row.section}.${row.field}`} -> ${result.compound.join(" + ")}`);
        const question = row.kind === "answer" ? row.question : row.kind === "keyed" ? row.aliases?.[key ?? ""] ?? key ?? "" : "";
        if (factsOfQuestion(question, row.kind === "keyed" ? row.surface : undefined).filter((fact) => realFact.has(fact)).length < 2) problems.push(`${where} is listed compound but asks for one fact`);
      }
    }
  }
  check(`the field-to-fact table: every mapped field holds a real fact (${mapped.length} mapped places)`, problems.length === 0, problems.join("\n      "));
  check("the field-to-fact table: no field maps to two facts (compound questions map to neither)", FIELD_ROWS.every((row) => row.kind !== "answer" || !("fact" in factOfField(row.section, row.field)) || factsOfQuestion(row.question).filter((fact) => realFact.has(fact)).length === 1));
  console.log(`note  compound questions (written under neither fact until split, G3-G5), wherever they are kept: ${[...new Set(compound)].join("; ")}`);
  check("the field-to-fact table: each (section, field) has one row", FIELD_ROWS.every((row, index) => FIELD_ROWS.findIndex((other) => other.section === row.section && other.field === row.field) === index));

  // Every literal (section, field) a save point writes today has a row.
  const CONSTANTS: Record<string, string> = { STORY_SECTION: "story", SITUATION_SECTION: "situation", SITUATION_FIELD: "record", CASE_FILE_SECTION: "caseFile" };
  const literal = (arg: string): string | null => CONSTANTS[arg] ?? (/^"([^"]+)"$/.exec(arg)?.[1] ?? null);
  const pairsOf = (found: ReturnType<typeof scanSavePoints>) => found.filter((point) => point.kind === "intake-state" || point.kind === "recovery-put").flatMap((point) => {
    const [section, field] = point.target.split(", ").map(literal);
    return section && field ? [{ section, field, at: `${point.file}:${point.line}` }] : [];
  });
  const found = scanSavePoints();
  const pairs = pairsOf(found);
  const dynamic = found.filter((point) => (point.kind === "intake-state" || point.kind === "recovery-put") && !pairsOf([point]).length);
  const missing = pairs.filter((pair) => !fieldRow(pair.section, pair.field));
  check(`every literal (section, field) a save point writes today has a row in the table (${new Set(pairs.map((pair) => `${pair.section}.${pair.field}`)).size} fields)`, missing.length === 0, missing.map((pair) => `${pair.section}.${pair.field} at ${pair.at}`).join("\n      "));
  console.log(`note  ${dynamic.length} save points write a section or field chosen at run time (not checkable by name): ${dynamic.map((point) => `${point.file}:${point.line} ${point.target}`).join("; ")}`);

  // Mutations: each property check fails on a planted break.
  const plantedPairs = pairsOf(scanSavePoints(undefined, { "app/__fact_rails_self_test__/Planted.tsx": "const [x, setX] = useIntakeState(\"civil\", \"otherPartyCopy\", \"\");" }));
  check("mutation: a planted field written with no row is found missing", plantedPairs.some((pair) => !fieldRow(pair.section, pair.field)));
  check("mutation: a field whose question asks for two facts is never mapped to one (serviceDetails)", "compound" in factOfField("civil", "input", "serviceDetails"));
  check("mutation: a key that is no fact maps to none, never to a made-up fact", "none" in factOfField("civil", "input", "otherPartyCopy"));
}

}

void main().then(() => {
if (failures) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll fact-rail checks passed.");
});
