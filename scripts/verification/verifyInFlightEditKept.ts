/**
 * AN ANSWER CHANGED AGAIN WHILE ITS PREVIOUS SAVE IS STILL ON THE WAY IS KEPT, NOT TREATED AS ANOTHER TAB'S OLDER VIEW
 * (read-only investigation, 9 Nov 2026: the carry test's occasional "typed 9350 in Change, pressed Confirm, every screen
 * shows $9,100", 4 runs in 16 on a1ca8efe and on 7bce4102).
 *
 * The real functions, in the order the race runs them, with no timing: the tab saves 9100 through Change (writeChange's
 * withChange, seen = the record's seq); before the server answers, the person types 9350 in Change (same fact, `seen`
 * read from the tab's record, still the OLD seq); the server accepts 9100 (applyFactWrites numbers it); the tab takes the
 * answer (afterSend); then the next send of the 9350 edit (pendingWrites -> applyFactWrites).
 *
 * WHAT FAILURE THIS CATCHES: the person's newest answer silently lost because the tab mistook its own save for another
 * tab's.
 */
import { caseFileOf, withChange, seenSeqOf, CASE_FILE_SECTION } from "../../src/lib/case-system/caseFile/caseFile";
import { afterSend, pendingWrites } from "../../src/lib/case-system/caseFile/pendingFacts";
import { applyFactWrites } from "../../src/lib/case-system/caseFile/factRecord";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

const CASE = "00000000-0000-4000-8000-000000000001";
const checkpoint = (sections: Record<string, Record<string, unknown>>) => ({ version: 1 as const, flowId: CASE, courtPath: "small-claims", revision: "00000000-0000-4000-8000-000000000002", sections });
// The saved record: the amount, numbered 5 by the server.
let server: Record<string, unknown> = { intakeCheckpoint: checkpoint({ [CASE_FILE_SECTION]: { facts: { amount: { state: "answered", value: "8000", source: "person", at: "2026-11-09T10:00:00.000Z", seq: 5 } } } }) };
const serverFacts = () => ((server.intakeCheckpoint as { sections: Record<string, Record<string, unknown>> }).sections[CASE_FILE_SECTION].facts) as Record<string, unknown>;
let tab: Record<string, Record<string, unknown>> = { [CASE_FILE_SECTION]: { facts: serverFacts() } };
const change = (value: string) => {
  const seen = seenSeqOf(tab, "amount");
  tab = { ...tab, [CASE_FILE_SECTION]: { ...tab[CASE_FILE_SECTION], changes: withChange(tab[CASE_FILE_SECTION].changes, "amount", { state: "answered", value }, new Date(), seen) } };
};
const send = (sent: unknown) => {
  const result = applyFactWrites(server, "small-claims", CASE, pendingWrites(sent), new Date());
  if (!result.ok) throw new Error(`server refused: ${JSON.stringify(result)}`);
  server = result.master;
  return result;
};

// 1. "Change" to 9100: the save leaves.
change("9100");
const firstSent = tab[CASE_FILE_SECTION].changes;
// 2. Before it is answered, "Change" to 9350 (Confirm will flush this one).
change("9350");
// 3. The server answers the first save; the tab takes the answer.
const first = send(firstSent);
check("setup: the server accepted 9100", first.saved.some((s) => s.fact === "amount"), JSON.stringify(first));
tab = afterSend(tab, firstSent, { saved: first.saved, conflicts: first.conflicts, facts: first.facts as never });
const shown = caseFileOf(checkpoint(tab) as never).amount;
check("1. the case file shows the person's newest answer, 9350", JSON.stringify(shown).includes("9350"), JSON.stringify(shown));
// 4. The next send carries 9350.
const second = send(tab[CASE_FILE_SECTION].changes);
check("2. the server takes 9350 (no conflict with the tab's own save)", second.conflicts.length === 0 && JSON.stringify(serverFacts().amount).includes("9350"), JSON.stringify({ conflicts: second.conflicts, saved: serverFacts().amount }));
tab = afterSend(tab, tab[CASE_FILE_SECTION].changes, { saved: second.saved, conflicts: second.conflicts, facts: second.facts as never });

// 3. A real conflict is still one: this tab saves 9400 and, while it is on the way, changes it to 9500; ANOTHER tab saves
// 9999 between this tab's two sends. 9500 must not overwrite the other tab's newer save silently: "Not saved yet".
change("9400");
const ownSent = tab[CASE_FILE_SECTION].changes;
change("9500");
const own = send(ownSent);
tab = afterSend(tab, ownSent, { saved: own.saved, conflicts: own.conflicts, facts: own.facts as never });
const otherTab = applyFactWrites(server, "small-claims", CASE, [{ fact: "amount", state: "answered", value: "9999", source: "person", question: "change", seenSeq: own.saved[0].seq }], new Date());
if (!otherTab.ok) throw new Error("other tab refused");
server = otherTab.master;
const third = send(tab[CASE_FILE_SECTION].changes);
check("3. another tab's newer save is still a conflict (\"Not saved yet\"), never overwritten", third.conflicts.some((c) => c.fact === "amount") && JSON.stringify(serverFacts().amount).includes("9999"), JSON.stringify({ conflicts: third.conflicts, saved: serverFacts().amount }));

console.log(failures ? `\n${failures} check(s) failed.` : "\nAn answer changed while its previous save is on the way is kept.");
process.exit(failures ? 1 : 0);
