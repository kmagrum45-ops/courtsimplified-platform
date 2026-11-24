/**
 * THE PARTIES RECORD, NUMBERED BY THE SERVER (site owner's choice, 24 Nov 2026: "server-numbered Parties"; serverFacts.ts).
 *
 * Why it exists: the Small Claims form's own "Other party name" box was removed (23 Nov 2026), so the Parties step is the
 * one place a name is given, and its record was saved only inside the tab's whole checkpoint. When a second tab's save met
 * a conflict on another answer (the amount), its whole save was held back, and the name typed there never reached the
 * case (tests/browser/fact-two-tabs.spec.ts: passed on main, failed on #563).
 *
 * What it checks, with no network and no AI:
 *   1. a whole-checkpoint save keeps the server's numbered Parties record over the tab's older copy;
 *   2. a case whose record the server never numbered (an older case, a guest's) keeps the tab's copy, as before;
 *   3. an edit the tab has not sent yet (partiesPending) stays the tab's, with its mark, until it is sent;
 *   4. the server numbers each saved record after the stored one, and clears the mark;
 *   5. after the send, the tab takes the saved copy and its number in and clears the mark -- unless the person changed
 *      the record again while it was on the way (then it stays marked, to be sent next);
 *   6. through factSave.ts saveFactWrites (what POST /api/cases/facts runs), a Parties record sent with no fact writes is
 *      saved with the next number, and returned; a second tab's later record is the newest.
 * Each property check is shown to fail on a planted mutation in the same run.
 *
 * What failure it exists to catch: a tab's whole save putting back an older Parties record over a newer one another tab
 * saved; or a tab's unsent Parties edit lost.
 */
import { CASE_FILE_SECTION } from "../../src/lib/case-system/caseFile/caseFile";
import { afterPartiesSent, PARTIES_PENDING, PARTIES_SEQ, sectionWithSavedParties, withStoredFacts } from "../../src/lib/case-system/caseFile/serverFacts";
import { saveFactWrites } from "../../src/lib/case-system/caseFile/factSave";
import type { PartiesRecord } from "../../src/lib/case-system/parties/parties";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const mutant = (name: string, caught: boolean) => check(`mutation caught: ${name}`, caught);

const party = (name: string): PartiesRecord => ({ version: 1, list: [{ id: "p-other", side: "other", kind: "company", details: { companyName: name }, unsure: [] }], declined: [] }) as unknown as PartiesRecord;
const ACME = party("Acme Movers Ltd.");
const BETA = party("Beta Movers Ltd.");
type Sections = Record<string, Record<string, unknown>>;
const nameIn = (sections: Sections): string => String(((sections[CASE_FILE_SECTION]?.parties as PartiesRecord | undefined)?.list?.[0]?.details as Record<string, string> | undefined)?.companyName ?? "");

// 1-3. The whole-checkpoint save's rule.
{
  const stored = { [CASE_FILE_SECTION]: { parties: BETA, [PARTIES_SEQ]: 2 } };
  const tabOld: Sections = { [CASE_FILE_SECTION]: { parties: ACME, [PARTIES_SEQ]: 1 } };
  const kept = withStoredFacts(tabOld, stored);
  check("1. a whole save keeps the server's numbered record over the tab's older copy", nameIn(kept) === "Beta Movers Ltd." && kept[CASE_FILE_SECTION][PARTIES_SEQ] === 2, JSON.stringify(kept));
  const older = withStoredFacts(tabOld, { [CASE_FILE_SECTION]: { parties: BETA } });
  check("2. a record the server never numbered: the tab's copy is kept, as before", nameIn(older) === "Acme Movers Ltd.", JSON.stringify(older));
  const guest = withStoredFacts(tabOld, {});
  check("2. a guest's first save (nothing stored): the tab's copy is kept", nameIn(guest) === "Acme Movers Ltd.");
  const pendingTab: Sections = { [CASE_FILE_SECTION]: { parties: ACME, [PARTIES_SEQ]: 1, [PARTIES_PENDING]: true } };
  const pending = withStoredFacts(pendingTab, stored);
  check("3. an edit not sent yet stays the tab's, with its mark", nameIn(pending) === "Acme Movers Ltd." && pending[CASE_FILE_SECTION][PARTIES_PENDING] === true, JSON.stringify(pending));
  // Mutation: the tab's copy always kept (the rule before this change) -- check 1 must catch it.
  const always = (tab: Sections) => tab;
  mutant("a whole save that keeps the tab's copy (the old rule) puts the older name back", nameIn(always(tabOld)) !== "Beta Movers Ltd.");
}

// 4-5. Numbering, and the tab after the send.
{
  const first = sectionWithSavedParties({}, ACME);
  check("4. the first saved record is numbered 1, with no mark", first[PARTIES_SEQ] === 1 && !(PARTIES_PENDING in first));
  const next = sectionWithSavedParties({ ...first, [PARTIES_PENDING]: true }, BETA);
  check("4. the next saved record is numbered after the stored one, and the mark is cleared", next[PARTIES_SEQ] === 2 && !(PARTIES_PENDING in next) && (next.parties as PartiesRecord) === BETA);
  const tab: Sections = { [CASE_FILE_SECTION]: { parties: ACME, [PARTIES_PENDING]: true } };
  const taken = afterPartiesSent(tab, ACME, { record: ACME, seq: 3 });
  check("5. after the send the tab takes the saved copy and its number, and clears the mark", taken[CASE_FILE_SECTION][PARTIES_SEQ] === 3 && taken[CASE_FILE_SECTION][PARTIES_PENDING] === undefined);
  const changed: Sections = { [CASE_FILE_SECTION]: { parties: BETA, [PARTIES_PENDING]: true } };
  const still = afterPartiesSent(changed, ACME, { record: ACME, seq: 3 });
  check("5. changed again while on the way: the newer edit stays, marked, to be sent next", nameIn(still) === "Beta Movers Ltd." && still[CASE_FILE_SECTION][PARTIES_PENDING] === true);
  mutant("clearing the mark whatever changed since would drop the newer edit", (() => { const wrong = { ...changed[CASE_FILE_SECTION] }; delete wrong[PARTIES_PENDING]; return wrong[PARTIES_PENDING] !== true; })());
}

// 6. Through what the route runs, with a stand-in database.
async function throughTheRoute() {
  const CASE_ID = "11111111-1111-4111-8111-111111111111";
  const REV = "22222222-2222-4222-8222-222222222222";
  type Row = { master_result: Record<string, unknown>; updated_at: string };
  const db = { row: { master_result: { intakeCheckpoint: { version: 1, flowId: CASE_ID, courtPath: "small-claims", revision: REV, sections: { story: { text: "A moving company broke my table." }, [CASE_FILE_SECTION]: { parties: ACME } } } }, updated_at: "t1" } as Row };
  const chain = (kind: "select" | "update", values?: Record<string, unknown>) => {
    const filters: Record<string, string> = {};
    const self = {
      eq(column: string, value: string) { filters[column] = value; return self; },
      async maybeSingle() { return { data: { master_result: db.row.master_result, updated_at: db.row.updated_at }, error: null }; },
      async select() {
        if (kind !== "update" || filters.updated_at !== db.row.updated_at) return { data: [], error: null };
        db.row = { master_result: values!.master_result as Record<string, unknown>, updated_at: String(values!.updated_at) };
        return { data: [{ id: CASE_ID }], error: null };
      },
    };
    return self;
  };
  const client = { from: () => ({ select: () => chain("select"), update: (values: Record<string, unknown>) => chain("update", values) }) };
  const section = () => ((db.row.master_result.intakeCheckpoint as { sections: Sections }).sections[CASE_FILE_SECTION]);
  const one = await saveFactWrites(client as never, { caseId: CASE_ID, userId: "u1", court: "small-claims" }, [], undefined, [], BETA);
  check("6. a Parties record sent alone is saved, numbered 1, and returned", one.ok && one.parties?.seq === 1 && (section().parties as PartiesRecord) === BETA && section()[PARTIES_SEQ] === 1, JSON.stringify(one));
  const two = await saveFactWrites(client as never, { caseId: CASE_ID, userId: "u1", court: "small-claims" }, [], undefined, [], ACME);
  check("6. a later record (another tab) is the newest, numbered 2", two.ok && two.parties?.seq === 2 && (section().parties as PartiesRecord) === ACME);
  // 7. The saved title the list of cases reads (chrome-545-round B8): from the record's other party, never emptied by a
  // record that names none (a name held elsewhere is not saved in the record).
  check("7. a record naming the other party saves the case's title with that name", String(db.row.master_result.caseTitle ?? "").includes("Acme Movers Ltd."), String(db.row.master_result.caseTitle));
  const unnamed = { version: 1, list: [{ id: "p-other", side: "other", details: { municipality: "Ottawa" }, unsure: [] }], declined: [] } as unknown as PartiesRecord;
  await saveFactWrites(client as never, { caseId: CASE_ID, userId: "u1", court: "small-claims" }, [], undefined, [], unnamed);
  check("7. a record naming no one leaves the saved title as it was", String(db.row.master_result.caseTitle ?? "").includes("Acme Movers Ltd."), String(db.row.master_result.caseTitle));

  // 8. A name changed on the Parties step where the case holds another from another place is the newest answer to that
  // fact (caseWrite.ts writeParties, the form boxes' rule); a first name with none held records nothing more.
  const { writeParties } = await import("../../app/_components/caseWrite");
  const tab = (facts: Record<string, unknown>) => {
    const sections: Record<string, Record<string, unknown>> = { story: { text: "A moving company broke my table." }, [CASE_FILE_SECTION]: { facts } };
    return {
      sections,
      recovery: {
        read: (section: string, key: string) => sections[section]?.[key],
        put: (section: string, key: string, value: unknown) => { sections[section] = { ...(sections[section] ?? {}), [key]: value }; },
        getReview: () => ({ checkpoint: { version: 1, flowId: CASE_ID, courtPath: "small-claims", revision: REV, sections } as never }),
        getSavedMaster: () => null,
      },
    };
  };
  const held = tab({ otherParty: { state: "answered", value: "Alex Testwood", source: "person", at: "2026-11-24T10:00:00.000Z", seq: 1, question: "chat:other-party" } });
  writeParties(held.recovery as never, BETA);
  const changed = (held.sections[CASE_FILE_SECTION].changes ?? {}) as Record<string, { state?: string; value?: unknown }>;
  check("8. a name changed on the Parties step over one held from the chat is recorded as the newest answer", changed.otherParty?.state === "answered" && changed.otherParty.value === "Beta Movers Ltd.", JSON.stringify(changed));
  const fresh = tab({});
  writeParties(fresh.recovery as never, BETA);
  check("8. a first name, with none held, records nothing more than the Parties record", fresh.sections[CASE_FILE_SECTION].changes === undefined && fresh.sections[CASE_FILE_SECTION][PARTIES_PENDING] === true, JSON.stringify(fresh.sections[CASE_FILE_SECTION]));
}

void throughTheRoute().then(() => {
if (failures) { console.error(`\n${failures} check(s) failed.`); process.exit(1); }
console.log("\nThe Parties record is the server's once numbered; a tab's whole save never puts an older one back; an unsent edit is kept.");
});
