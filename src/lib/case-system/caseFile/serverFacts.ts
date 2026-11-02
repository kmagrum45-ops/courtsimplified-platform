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
export function withStoredFacts(tab: Sections, stored: unknown): Sections {
  const facts = storedFacts(stored);
  const caseFile = { ...object(tab[RECORD_SECTION]) };
  delete caseFile.facts;
  if (Object.keys(facts).length) caseFile.facts = facts;
  if (!Object.keys(caseFile).length && !(RECORD_SECTION in tab)) return tab;
  return { ...tab, [RECORD_SECTION]: caseFile };
}

/** True when the stored record holds a save the tab's copy has not seen. */
export function factsAhead(tab: unknown, stored: unknown): boolean {
  return recordSeq(storedFacts(stored)) > recordSeq(storedFacts(tab));
}
