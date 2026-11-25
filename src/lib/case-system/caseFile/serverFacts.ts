/**
 * THE FACT RECORD BELONGS TO THE SERVER (case core G2(c); CASE_CORE_DESIGN.md §4, §12).
 *
 * `sections.caseFile.facts` is written only by POST /api/cases/facts (factRecord.ts applyFactWrites), which
 * gives each accepted save the next seq. A tab's whole-checkpoint save (intakeCheckpoint.ts saveCheckpoint)
 * carries a snapshot the tab made earlier, so its copy of the record may be older than the stored one.
 * The rule: every save of a checkpoint keeps the STORED record exactly, whatever the tab's copy holds; a tab
 * never adds, changes or erases a fact record. Before G2 the tab's snapshot was written whole and the
 * record the server had written since was erased (intakeCheckpoint.ts:115, cause read on staging, 1 Nov).
 *
 * `factsAhead` tells the tab when the stored record moved past what it last saw, so the stale save does not
 * pass quietly: the tab adopts the stored record (its screens then show it) and any unsent edit made against
 * the older view is a conflict for that fact ("Not saved yet").
 *
 * Imports nothing, so intakeCheckpoint.ts can use it without a cycle (the section name is caseFile.ts's
 * CASE_FILE_SECTION; test:server-facts checks the two agree). Pure. States no law.
 */
export const RECORD_SECTION = "caseFile";

type Sections = Record<string, Record<string, unknown>>;
const object = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

/** The raw fact record a checkpoint's sections hold (each entry as stored), or an empty object. */
export function storedFacts(sections: unknown): Record<string, unknown> {
  return object(object(object(sections)[RECORD_SECTION]).facts);
}

/** The highest seq in a raw fact record (0 when none). */
export function recordSeq(facts: Record<string, unknown>): number {
  let high = 0;
  for (const entry of Object.values(facts)) {
    const seq = object(entry).seq;
    if (typeof seq === "number" && Number.isInteger(seq) && seq > high) high = seq;
  }
  return high;
}

/**
 * The tab's sections with the stored fact record in place of the tab's copy: the stored record when there
 * is one, and no record at all when nothing is stored (a tab never creates one).
 */
export function withStoredFacts(tab: Sections, stored: unknown, inTheTab = false): Sections {
  const facts = storedFacts(stored);
  const caseFile = { ...object(tab[RECORD_SECTION]) };
  delete caseFile.facts;
  if (Object.keys(facts).length) caseFile.facts = facts;
  // The Parties record, once the server has numbered it, is the server's too (the same rule): the stored record is kept,
  // whatever the tab's copy holds; the tab's edits reach it only through POST /api/cases/facts. A case whose record the
  // server never numbered (saved before 24 Nov 2026, or a guest's) keeps the tab's copy, as before. `inTheTab`: the tab
  // reading the saved case keeps an edit it has not sent yet (`partiesPending`), with its mark, until it is sent. A SAVE
  // never writes it: the server keeps its numbered record and the edit arrives by its own send, which also saves the
  // case's title from it (factSave.ts). Written by a whole save, the record and the title disagreed (local run of
  // chrome-545-round, 24 Nov 2026: the record "Morgan Testtitle", the title still "Morgan Testwood").
  const storedFile = object(object(stored)[RECORD_SECTION]);
  if (typeof storedFile[PARTIES_SEQ] === "number" && !(inTheTab && caseFile[PARTIES_PENDING] === true)) {
    caseFile.parties = storedFile.parties;
    caseFile[PARTIES_SEQ] = storedFile[PARTIES_SEQ];
  }
  if (!Object.keys(caseFile).length && !(RECORD_SECTION in tab)) return tab;
  return { ...tab, [RECORD_SECTION]: caseFile };
}

/**
 * THE PARTIES RECORD, NUMBERED BY THE SERVER (site owner's choice, 24 Nov 2026: "server-numbered Parties"). Since the
 * Small Claims form's own "Other party name" box was removed (23 Nov 2026) the Parties step is the one place a name is
 * given, and its record was saved only with the tab's whole checkpoint, so a second tab's name was lost when that tab's
 * save met a conflict on another answer (fact-two-tabs: passed on main, failed on #563). Now an edit is marked
 * `partiesPending` in the tab, sent by itself to POST /api/cases/facts (beside the fact writes, as the offer choices
 * are), and the server writes the record with the next `partiesSeq`; the newest save is the newest record.
 */
export const PARTIES_SEQ = "partiesSeq";
export const PARTIES_PENDING = "partiesPending";

/** The caseFile section with the Parties record the server accepted, numbered after the stored one. */
export function sectionWithSavedParties(caseFileSection: unknown, record: unknown): Record<string, unknown> {
  const section = { ...object(caseFileSection) };
  const seq = typeof section[PARTIES_SEQ] === "number" ? (section[PARTIES_SEQ] as number) + 1 : 1;
  delete section[PARTIES_PENDING];
  return { ...section, parties: record, [PARTIES_SEQ]: seq };
}

/** The tab's sections after the server saved the Parties record it sent: the saved copy and its number taken in, and the
 * mark cleared, unless the person changed the record again while it was on the way (then it stays marked, to be sent). */
export function afterPartiesSent(sections: Sections, sent: unknown, saved: { record: unknown; seq: number }): Sections {
  const caseFile = { ...object(sections[RECORD_SECTION]) };
  const changedSince = JSON.stringify(caseFile.parties ?? null) !== JSON.stringify(sent ?? null);
  caseFile[PARTIES_SEQ] = saved.seq;
  if (!changedSince) {
    caseFile.parties = saved.record;
    delete caseFile[PARTIES_PENDING];
  }
  return { ...sections, [RECORD_SECTION]: caseFile };
}

/** True when the stored record holds a save the tab's copy has not seen. */
export function factsAhead(tab: unknown, stored: unknown): boolean {
  return recordSeq(storedFacts(stored)) > recordSeq(storedFacts(tab));
}
