/**
 * A SAVE THAT DID NOT GO THROUGH NEVER SHOWS ITS RAW ERROR, AND IS TRIED ONCE MORE BY ITSELF (site owner, 27 Nov 2026,
 * item D).
 *
 * What it checks:
 *   1. saveFailureWords: a timeout (DOMException "TimeoutError", "signal timed out"), an abort, a network failure
 *      (TypeError "Failed to fetch"), a database error object, and a plain Error carrying raw words ("undefined",
 *      "[object Object]", "null", "elementStateMap") all give the plain words; a sentence the site wrote is kept.
 *   2. saveWorthRetrying: a timeout and a network failure are tried again; a save the page cancelled and a save the
 *      server refused (another tab, too large) are not.
 *   3. saveOnceMore: a failed choice is sent exactly once more; a saved one is not sent again.
 *   4. The intake save (IntakeRecovery.tsx) shows no error's own message unchecked, tries a failed save once more (saveWithOneRetry) with
 *      SAVE_TRYING_AGAIN showing, words a failure through saveFailureWords, and says "Intake saved to your account."
 *      only after the save has come back.
 *   5. The kind-of-claim chooser (IntelligenceOverviewPanel.tsx) sends through saveOnceMore and words a failure with
 *      CHOICE_NOT_SAVED, not inline text.
 * What failure it exists to catch: "signal timed out" (or any raw error) on the page, as #567's browser shard showed,
 * and a save that gives up on the first slow answer.
 *
 * Costs nothing. Run: npm run test:save-failure-words
 */
import { readFileSync } from "node:fs";
import { checkpointSaveResult, SaveNoAnswer, saveFailureWords, saveOnceMore, saveWithOneRetry, saveWorthRetrying } from "../../src/lib/case-system/intake/saveFailure";
import { saveCheckpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { saveFactWrites } from "../../src/lib/case-system/caseFile/factSave";
import { CASE_FILE_SECTION } from "../../src/lib/case-system/caseFile/caseFile";
import { SAVE_NOT_CONFIRMED, SAVE_TRYING_AGAIN } from "../../src/lib/case-system/copy/askCopy";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : ` -- ${detail}`}`);
};
const PLAIN = "plain words";

// 1. The words.
const raw: [string, unknown][] = [
  ["a timeout", new DOMException("signal timed out", "TimeoutError")],
  ["an abort", new DOMException("This operation was aborted", "AbortError")],
  ["a network failure", new TypeError("Failed to fetch")],
  ["a database error object", { code: "57014", message: "canceling statement due to statement timeout" }],
  ["a plain Error saying signal timed out", new Error("signal timed out")],
  ["a plain Error saying undefined", new Error("Cannot read undefined")],
  ["a plain Error saying [object Object]", new Error("[object Object]")],
  ["a plain Error saying null", new Error("value was null")],
  ["a plain Error naming elementStateMap", new Error("elementStateMap missing")],
  ["an empty Error", new Error("")],
  ["a string", "signal timed out"],
];
for (const [what, error] of raw) check(`${what} is shown in plain words`, saveFailureWords(error, PLAIN) === PLAIN, saveFailureWords(error, PLAIN));
const own = "Another tab changed this intake. Your pending text is retained here; open the saved case in a new tab before resolving the difference.";
check("a sentence the site wrote is kept", saveFailureWords(new Error(own), PLAIN) === own);

// 2. Worth one more try.
check("a timeout is tried again", saveWorthRetrying(new DOMException("signal timed out", "TimeoutError")));
check("a network failure is tried again", saveWorthRetrying(new TypeError("Failed to fetch")));
check("a save the page cancelled is not", !saveWorthRetrying(new DOMException("signal timed out", "TimeoutError"), true));
check("a save the server refused is not", !saveWorthRetrying(new Error(own)));
check("a text too large is not", !saveWorthRetrying(new Error("Your latest text is too large to save. Copy it before leaving and shorten it before continuing.")));

// 3. One choice, once more.
async function oncemore() {
  for (const [answers, want, calls] of [[[false, true], true, 2], [[true], true, 1], [[false, false], false, 2]] as [boolean[], boolean, number][]) {
    let n = 0;
    const got = await saveOnceMore(async () => answers[n++] ?? false);
    check(`saveOnceMore ${JSON.stringify(answers)} gives ${want} after ${calls} send(s)`, got === want && n === calls, `got ${got} after ${n}`);
  }
}

// 4. The intake save.
const recovery = readFileSync("app/_components/IntakeRecovery.tsx", "utf8");
check("4a. no error's own message is shown unchecked", !/\? error\.message :/.test(recovery));
check("4b. a failed save goes through the one retry (saveWithOneRetry, checked in 6-7), saying so", recovery.includes("saveWithOneRetry(work, { cancelled: () => !current() || Boolean(signal?.aborted), onRetry: () => setNotice(SAVE_TRYING_AGAIN) })"));
check("4e. a checkpoint answer is read by checkpointSaveResult, and no answer is tried again (SaveNoAnswer)", recovery.includes("checkpointSaveResult(outcome)") && recovery.includes('if (result === "no-answer") throw new SaveNoAnswer();'));
check("4c. a failure is worded through saveFailureWords", /failure\(saveFailureWords\(error, SAVE_NOT_CONFIRMED\)\)/.test(recovery));
const saved = recovery.indexOf('"Intake saved to your account."');
check("4d. \"Intake saved\" shows only after the save came back", saved > recovery.indexOf("const outcome = await saveCheckpoint(") && saved > recovery.indexOf("serverRevision = sent.revision;") && recovery.indexOf("serverRevision = sent.revision;") > 0);

// 5. The kind-of-claim chooser.
const overview = readFileSync("app/builder/_components/IntelligenceOverviewPanel.tsx", "utf8");
check("5a. the chooser sends through saveOnceMore", (overview.match(/saveOnceMore\(\(\) => savePositionQueued\(caseId, claimKindAnswer/g) ?? []).length === 2 && !/await savePositionQueued\(caseId, claimKindAnswer/.test(overview));
check("5b. its failure words come from CHOICE_NOT_SAVED", overview.includes("{CHOICE_NOT_SAVED}") && !overview.includes("That could not be saved just now"));

// 6-8. The first save reached the server but its answer was lost; then the retry runs (site owner's ruling 4, 27 Nov 2026).
// The real save code (saveCheckpoint, saveFactWrites, checkpointSaveResult, saveWithOneRetry) against a stand-in database
// (STAND-IN: an in-memory row with supabase-js's chain, as verifyFactRails.ts uses) that applies a write and then hands
// back a timeout instead of its answer -- the way supabase-js reports AbortSignal.timeout firing after the row was written.
const CASE_ID = "11111111-1111-4111-8111-111111111111";
const OLD_REV = "22222222-2222-4222-8222-222222222222";
const NEW_REV = "33333333-3333-4333-8333-333333333333";
const LOST = { message: "AbortError: signal timed out" };
type Row = { master_result: Record<string, unknown>; updated_at: string };
function standIn(row: Row, answer: (n: number) => "answer" | "lose-after-writing" | "no-answer") {
  const db = { row, reads: 0, writeTries: 0, rowsWritten: 0 };
  const chain = (kind: "select" | "update", values?: Record<string, unknown>) => {
    const filters: Record<string, string> = {};
    const self = {
      eq(column: string, value: string) { filters[column] = value; return self; },
      abortSignal() { return self; },
      async maybeSingle() { db.reads += 1; return { data: { master_result: db.row.master_result, updated_at: db.row.updated_at }, error: null }; },
      async select() {
        if (kind !== "update") return { data: [], error: null };
        db.writeTries += 1;
        const how = answer(db.writeTries);
        if (how === "no-answer") return { data: null, error: LOST };
        if (filters.updated_at && filters.updated_at !== db.row.updated_at) return { data: [], error: null };
        db.row = { master_result: values!.master_result as Record<string, unknown>, updated_at: String(values!.updated_at) };
        db.rowsWritten += 1;
        return how === "lose-after-writing" ? { data: null, error: LOST } : { data: [{ id: CASE_ID }], error: null };
      },
    };
    return self;
  };
  return { db, client: { from: () => ({ select: () => chain("select"), update: (values: Record<string, unknown>) => chain("update", values) }) } };
}
const checkpointWith = (revision: string, facts: Record<string, unknown> = {}) => ({ version: 1, flowId: CASE_ID, courtPath: "small-claims", revision, inputRevision: revision, sections: { story: { text: "A moving company broke my table." }, [CASE_FILE_SECTION]: { facts, changes: {} } } });
const masterWith = (revision: string, facts: Record<string, unknown> = {}) => ({ workflowStatus: { intakeReview: { version: 1 } }, intakeCheckpoint: checkpointWith(revision, facts) });
const revisionOf = (row: Row) => (row.master_result.intakeCheckpoint as { revision?: string }).revision;

/** The intake save's own steps (IntakeRecovery.tsx flush): the checkpoint save, what its answer means, and what the page says. */
async function intakeSave(client: unknown, onRetry: () => void) {
  const snapshot = checkpointWith(NEW_REV) as Parameters<typeof saveCheckpoint>[3];
  let notice = "Saving intake…";
  try {
    await saveWithOneRetry(async () => {
      const outcome = await saveCheckpoint(client as Parameters<typeof saveCheckpoint>[0], "u1", CASE_ID, snapshot, OLD_REV, () => true);
      const result = checkpointSaveResult(outcome);
      if (result === "no-answer") throw new SaveNoAnswer();
      if (result !== "saved") throw new Error("Your intake could not be saved. Your pending text remains in this tab. Please retry before continuing.");
    }, { onRetry: () => { onRetry(); notice = SAVE_TRYING_AGAIN; } });
    notice = "Intake saved to your account.";
  } catch (error) {
    notice = saveFailureWords(error, SAVE_NOT_CONFIRMED);
  }
  return notice;
}

async function lostReply() {
  // 6. The checkpoint: written, answer lost, retried.
  {
    const { db, client } = standIn({ master_result: masterWith(OLD_REV), updated_at: "t1" }, (n) => (n === 1 ? "lose-after-writing" : "answer"));
    let retries = 0;
    const notice = await intakeSave(client, () => { retries += 1; });
    check("6a. a lost answer is tried once more by itself", retries === 1, `retries ${retries}`);
    check("6b. the retry ends saved: the case holds the new revision", revisionOf(db.row) === NEW_REV, String(revisionOf(db.row)));
    check("6c. nothing is written twice (one row write; the retry finds it already saved)", db.rowsWritten === 1 && db.writeTries === 1, `rows written ${db.rowsWritten}, write tries ${db.writeTries}`);
    check("6d. the page says saved only now, after the retry confirmed it", notice === "Intake saved to your account.", notice);
  }
  // 7. Nothing saved: every try gets no answer and nothing is written.
  {
    const { db, client } = standIn({ master_result: masterWith(OLD_REV), updated_at: "t1" }, () => "no-answer");
    let retries = 0;
    const notice = await intakeSave(client, () => { retries += 1; });
    check("7a. tried exactly once more, then given up", retries === 1 && db.writeTries === 2, `retries ${retries}, write tries ${db.writeTries}`);
    check("7b. the case still holds the old revision", revisionOf(db.row) === OLD_REV && db.rowsWritten === 0);
    check("7c. the page never says saved when nothing saved, and says it in plain words", notice === SAVE_NOT_CONFIRMED && !/saved to your account/i.test(notice) && forbiddenRaw(notice), notice);
  }
  // 8. The facts request: the same answer sent again after a lost answer.
  {
    const { db, client } = standIn({ master_result: masterWith(OLD_REV), updated_at: "t1" }, () => "answer");
    const write = [{ fact: "amount" as const, state: "answered" as const, value: "4000", source: "person" as const, seenSeq: 0 }];
    const first = await saveFactWrites(client, { caseId: CASE_ID, userId: "u1", court: "small-claims" }, write, () => new Date("2026-11-27T15:00:00.000Z"));
    const afterFirst = db.rowsWritten;
    const again = await saveFactWrites(client, { caseId: CASE_ID, userId: "u1", court: "small-claims" }, write, () => new Date("2026-11-27T15:00:11.000Z"));
    const facts = ((db.row.master_result.intakeCheckpoint as { sections: Record<string, Record<string, unknown>> }).sections[CASE_FILE_SECTION].facts ?? {}) as Record<string, { value?: unknown; seq?: number }>;
    check("8a. the resent answer is saved, not a conflict", again.ok && again.saved.length === 1 && again.conflicts.length === 0, JSON.stringify(again));
    check("8b. no duplicate: one amount, numbered once, the same value", Object.keys(facts).length === 1 && facts.amount?.seq === 1 && facts.amount?.value === 4000 && first.ok && again.ok && again.saved[0]?.seq === 1, JSON.stringify(facts));
    check("8c. the resend writes nothing to the row", afterFirst === 1 && db.rowsWritten === 1, `rows written ${db.rowsWritten}`);
  }
}
const forbiddenRaw = (text: string) => !/signal timed out|AbortError|Error:|\bundefined\b|\[object|\bnull\b|elementStateMap/.test(text);

oncemore().then(lostReply).then(() => {
  if (failures) { console.log(`\n${failures} check(s) failed.`); process.exit(1); }
  console.log("\nA save that did not go through: every check passed.");
});
