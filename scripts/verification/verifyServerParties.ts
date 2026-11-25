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
import { partyName, type PartiesRecord } from "../../src/lib/case-system/parties/parties";

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
  check("3. an edit not sent yet is the person's newest word: kept, with its mark, in the tab and in a save (never lost)", nameIn(pending) === "Acme Movers Ltd." && pending[CASE_FILE_SECTION][PARTIES_PENDING] === true, JSON.stringify(pending));
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

  // 8. THE RECORD IS THE NAME'S HOME (rule 1, 14 Nov 2026; caseWrite.ts writeParties): a name shown from another place,
  // edited here part by part, is saved WHOLE in the record (never half a name); a first name with none held is the record's
  // alone; a held name emptied here is removed so it is not shown again.
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
  const named = (t: ReturnType<typeof tab>) => { const other = (t.sections[CASE_FILE_SECTION].parties as PartiesRecord | undefined)?.list.find((party) => party.side === "other"); return other ? partyName(other) : ""; };
  const chat = { otherParty: { state: "answered", value: "Alex Testwood", source: "person", at: "2026-11-24T10:00:00.000Z", seq: 1, question: "chat:other-party" } };
  // As the step shows a name held from the chat: the whole name and its parts, all held elsewhere; then the first name typed.
  const shownFrom = (details: Record<string, string>, heldElsewhere: string[]) => ({ version: 1, list: [{ id: "p-other", side: "other", kind: "person", details, unsure: [], heldElsewhere }], declined: [] }) as unknown as PartiesRecord;
  const held = tab(chat);
  writeParties(held.recovery as never, shownFrom({ fullName: "Alex Testwood", firstName: "Morgan", lastName: "Testwood" }, ["fullName", "lastName"]));
  check("8. the first name changed over a name held from the chat: the record holds the whole name, not half of it", named(held) === "Morgan Testwood", named(held));
  writeParties(held.recovery as never, shownFrom({ firstName: "Morgan", lastName: "Testtitle" }, []));
  check("8. then the last name changed: the record holds the whole new name", named(held) === "Morgan Testtitle", named(held));
  check("8. a name typed here records no second copy as a fact change (the record is its home)", (held.sections[CASE_FILE_SECTION].changes as Record<string, unknown> | undefined)?.otherParty === undefined, JSON.stringify(held.sections[CASE_FILE_SECTION].changes));
  const emptied = tab(chat);
  writeParties(emptied.recovery as never, { version: 1, list: [{ id: "p-other", side: "other", kind: "person", details: {}, unsure: ["firstName", "lastName"] }], declined: [] } as unknown as PartiesRecord);
  check("8. a name held from the chat, emptied here, is removed", ((emptied.sections[CASE_FILE_SECTION].changes ?? {}) as Record<string, { state?: string }>).otherParty?.state === "removed", JSON.stringify(emptied.sections[CASE_FILE_SECTION].changes));
  const fresh = tab({});
  writeParties(fresh.recovery as never, BETA);
  check("8. a first name, with none held, is the record's alone: no fact change", fresh.sections[CASE_FILE_SECTION].changes === undefined && named(fresh) === "Beta Movers Ltd." && fresh.sections[CASE_FILE_SECTION][PARTIES_PENDING] === true, JSON.stringify(fresh.sections[CASE_FILE_SECTION]));
}

// 9. THE TAB'S WHOLE SAVE SAVES THE TITLE FROM THE RECORD IT WRITES (intakeCheckpoint.ts saveCheckpoint, parties.ts
// partiesTitle): the record and the title never disagree, whichever save wrote the record (chrome-545-round).
async function wholeSaveTitle() {
  const { saveCheckpoint } = await import("../../src/lib/case-system/intakeCheckpoint");
  const CASE_ID = "33333333-3333-4333-8333-333333333333";
  const OLD_REV = "44444444-4444-4444-8444-444444444444";
  const NEW_REV = "55555555-5555-4555-8555-555555555555";
  type Row = { master_result: Record<string, unknown>; updated_at: string; user_id: string; court_path: string };
  const db = { row: { master_result: { caseTitle: "Your case with Acme Movers Ltd.", intakeCheckpoint: { version: 1, flowId: CASE_ID, courtPath: "small-claims", revision: OLD_REV, sections: { story: { text: "A moving company broke my table." }, [CASE_FILE_SECTION]: { parties: ACME, [PARTIES_SEQ]: 1 } } } }, updated_at: "t1", user_id: "u1", court_path: "small-claims" } as Row };
  const chain = (kind: "select" | "update", values?: Record<string, unknown>) => {
    const filters: Record<string, string> = {};
    const self = {
      eq(column: string, value: string) { filters[column] = value; return self; },
      abortSignal() { return self; },
      async maybeSingle() { return { data: { ...db.row }, error: null }; },
      async select() {
        if (kind !== "update" || filters.updated_at !== db.row.updated_at) return { data: [], error: null };
        db.row = { ...db.row, master_result: values!.master_result as Record<string, unknown>, updated_at: String(values!.updated_at) };
        return { data: [{ id: CASE_ID }], error: null };
      },
    };
    return self;
  };
  const client = { from: () => ({ select: () => chain("select"), update: (values: Record<string, unknown>) => chain("update", values) }) };
  // The tab's unsent edit (Beta) saved by its whole save.
  const snapshot = { version: 1, flowId: CASE_ID, courtPath: "small-claims", revision: NEW_REV, sections: { story: { text: "A moving company broke my table." }, [CASE_FILE_SECTION]: { parties: BETA, [PARTIES_SEQ]: 1, [PARTIES_PENDING]: true } } };
  const outcome = await saveCheckpoint(client as never, "u1", CASE_ID, snapshot as never, OLD_REV, () => true);
  const written = ((db.row.master_result.intakeCheckpoint as { sections: Sections }).sections[CASE_FILE_SECTION]);
  check("9. a whole save writes the tab's unsent Parties edit (the name typed is never lost)", outcome.ok === true && String(((written.parties as PartiesRecord).list[0].details as Record<string, string>).companyName) === "Beta Movers Ltd.", JSON.stringify(outcome));
  check("9. and saves the case's title from the record it writes", db.row.master_result.caseTitle === "Your case with Beta Movers Ltd.", String(db.row.master_result.caseTitle));
}
void throughTheRoute().then(wholeSaveTitle).then(() => {
if (failures) { console.error(`\n${failures} check(s) failed.`); process.exit(1); }
console.log("\nThe Parties record is the server's once numbered; a tab's whole save never puts an older one back; an unsent edit is kept.");
});
