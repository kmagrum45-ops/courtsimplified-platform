/**
 * THE SERVER'S NUMBER DECIDES WHICH ANSWER IS NEWEST; THE TAB ORDERS ONLY ITS UNSENT EDITS (case core G2(a), G2(b);
 * founder, 2 Nov; CASE_CORE_DESIGN.md §12).
 *
 * The rule:
 *   (a) among saved answers to a fact, the one the server numbered highest wins (caseFile.ts applyFactRecords);
 *   (b) the tab's change record (`caseFile.changes`) holds only edits not yet sent. Each edit keeps the saved
 *       number of that fact the tab had seen when it was made (`seen`). An unsent edit made against the current
 *       saved answer (seen >= that answer's number) is this person's newest word and shows; one made against an
 *       older view does not show over the newer saved answer (it is "Not saved yet", G2(c));
 *   - the browser's clock never orders anything: two edits are ordered by the tab's own counter (seq), not `at`.
 *
 * Checks, all pure (caseFileOf, withChange, pendingFacts.ts):
 *   1. an unsent edit made after seeing the saved answer shows over it (failed before G2: option A applied the
 *      record over every change);
 *   2. an unsent edit made against an older view does not show over the newer saved answer;
 *   3. the tab's edits are sent with the number each one saw, never a seq or a time of the tab's own
 *      (pendingWrites), and an edit in conflict is not sent again until the person chooses;
 *   4. after the server answers: an accepted edit leaves the buffer and the server's record takes its place;
 *      an edit the server refused as made against an older view stays, with the newer saved answer beside it
 *      (afterSend); an edit changed again while the save was in flight stays, to be sent next;
 *   5. "Save" on "Not saved yet" sends it as the newest save (force); "Discard" drops it;
 *   6. the change record is ordered by the tab's counter, never the browser's clock (a later seq with an earlier
 *      clock time still wins).
 *
 * WHAT FAILURE THIS CATCHES: an answer typed after a save shown under the older saved answer; an edit made in an
 * older tab silently written over a newer save; the browser's clock deciding which answer wins.
 */
import { caseFileOf, withChange, CASE_FILE_SECTION, type FactChanges } from "../../src/lib/case-system/caseFile/caseFile";
import { afterSend, discardPending, pendingWrites, savePending } from "../../src/lib/case-system/caseFile/pendingFacts";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
type Sections = Record<string, Record<string, unknown>>;
const ID = "00000000-0000-4000-8000-000000000702";
const cp = (sections: Sections): Checkpoint => ({ version: 1, flowId: ID, courtPath: "small-claims", revision: ID, sections: { story: { text: "Synthetic story." }, "small-claims": { input: { amountClaimed: "1000" } }, ...sections } } as unknown as Checkpoint);
const record = (seq: number, value: string | number) => ({ state: "answered" as const, value, source: "person" as const, at: "2026-11-02T10:00:00.000Z", seq });
const T1 = new Date("2026-11-02T10:00:00Z");
const T0 = new Date("2026-11-02T09:00:00Z");

// 1. An unsent edit made after seeing the saved answer (seq 4) shows over it.
{
  const changes = withChange({}, "amount", { state: "answered", value: "2650" }, T1, 4);
  const file = caseFileOf(cp({ [CASE_FILE_SECTION]: { facts: { amount: record(4, 2400) }, changes } }));
  check("1. an unsent edit made after seeing the saved answer shows over it", file.amount.value === 2650, `amount ${JSON.stringify(file.amount.value)}`);
}
// 2. An unsent edit made against an older view (seen 2) does not show over the newer saved answer (seq 4).
{
  const changes = withChange({}, "amount", { state: "answered", value: "2650" }, T1, 2);
  const file = caseFileOf(cp({ [CASE_FILE_SECTION]: { facts: { amount: record(4, 2400) }, changes } }));
  check("2. an edit made against an older view does not show over the newer saved answer", file.amount.value === 2400, `amount ${JSON.stringify(file.amount.value)}`);
}
// 3. What is sent: the fact, its state and value, the number it saw; never a seq or time of the tab's.
let pending: FactChanges = withChange({}, "amount", { state: "answered", value: "2650" }, T1, 4);
pending = withChange(pending, "otherParty", { state: "removed" }, T1, 0);
{
  const writes = pendingWrites(pending);
  const amount = writes.find((write) => write.fact === "amount");
  const party = writes.find((write) => write.fact === "otherParty");
  check("3a. each unsent edit is sent with the number it saw", amount?.seenSeq === 4 && party?.seenSeq === 0 && amount?.value === "2650" && party?.state === "removed",
    JSON.stringify(writes));
  check("3b. nothing the tab numbered or timed is sent", writes.every((write) => !("seq" in write) && !("at" in write)), JSON.stringify(writes));
}
// 4. After the server answers.
{
  const sent = pending;
  // While the save was in flight, the person changed the amount again.
  const inFlight = withChange(sent, "amount", { state: "answered", value: "2700" }, T1, 4);
  const stored = { state: "answered" as const, value: "Synthetic Other Tab Ltd.", source: "person" as const, at: "2026-11-02T10:01:00.000Z", seq: 5 };
  const response = {
    saved: [{ fact: "amount" as const, seq: 6, at: "2026-11-02T10:02:00.000Z" }],
    conflicts: [{ fact: "otherParty" as const, stored, sent: pendingWrites(sent).find((write) => write.fact === "otherParty")! }],
    facts: { amount: record(6, 2650), otherParty: stored },
  };
  const next = afterSend({ [CASE_FILE_SECTION]: { changes: inFlight } }, sent, response);
  const after = next[CASE_FILE_SECTION] as { changes: Record<string, Record<string, unknown>>; facts: Record<string, unknown> };
  check("4a. the server's record takes the place of what it accepted", JSON.stringify(after.facts) === JSON.stringify(response.facts), JSON.stringify(after.facts));
  check("4b. an edit changed again in flight stays, to be sent next", after.changes.amount?.value === "2700", JSON.stringify(after.changes.amount));
  check("4c. an edit refused as made against an older view stays, with the newer saved answer beside it",
    after.changes.otherParty?.state === "removed" && (after.changes.otherParty?.held as { seq?: number } | undefined)?.seq === 5, JSON.stringify(after.changes.otherParty));
  check("4d. an edit in conflict is not sent again until the person chooses", !pendingWrites(after.changes).some((write) => write.fact === "otherParty"), JSON.stringify(pendingWrites(after.changes)));
  const file = caseFileOf(cp(next));
  check("4e. the screens show the newer saved answer while the conflict waits", file.otherParty.value === "Synthetic Other Tab Ltd.", JSON.stringify(file.otherParty));
  // An accepted edit with nothing newer leaves the buffer entirely.
  const clean = afterSend({ [CASE_FILE_SECTION]: { changes: sent } }, sent, { ...response, conflicts: [] , saved: [...response.saved, { fact: "otherParty" as const, seq: 7, at: "x" }], facts: { amount: record(6, 2650), otherParty: { state: "removed" as const, source: "person" as const, at: "x", seq: 7 } } });
  check("4f. every accepted edit leaves the buffer", Object.keys((clean[CASE_FILE_SECTION] as { changes?: object }).changes ?? {}).length === 0, JSON.stringify(clean[CASE_FILE_SECTION]));
  // 5. Save / Discard.
  const saving = pendingWrites(savePending(after.changes, "otherParty"));
  check("5a. \"Save\" sends the waiting edit as the newest save", saving.some((write) => write.fact === "otherParty" && write.force === true), JSON.stringify(saving));
  const discarded = discardPending(after.changes, "otherParty");
  check("5b. \"Discard\" drops it", !("otherParty" in discarded) && "amount" in discarded, JSON.stringify(discarded));
}
// 6. The tab's counter orders its edits, never the browser's clock: the amount changed first (seq 1, clock 10:00),
// then the other party (seq 2, the clock set back to 09:00). Applied in the order given.
{
  let changes = withChange({}, "amount", { state: "answered", value: "2650" }, T1);
  changes = withChange(changes, "otherParty", { state: "removed" }, T0);
  const file = caseFileOf(cp({ [CASE_FILE_SECTION]: { changes } }));
  check("6. edits are applied in the order the tab numbered them, not by the clock", JSON.stringify(file.changedFacts) === JSON.stringify(["amount", "otherParty"]), JSON.stringify(file.changedFacts));
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nServer order: all checks pass.");
if (failures) process.exit(1);
