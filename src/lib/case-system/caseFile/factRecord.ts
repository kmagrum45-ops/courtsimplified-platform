/**
 * THE FACT RECORD AND THE SERVER'S ORDER OF SAVES (case core G0, "the rails"; CASE_CORE_DESIGN.md §1, §12).
 *
 * The one record per case lives where the case file already lives: inside
 * `cases.master_result.intakeCheckpoint.sections.caseFile` (CASE_FILE_SECTION), as
 * `caseFile.facts[factId]`. No table or column changes, so no migration.
 *
 *   caseFile.facts[factId] = { value?, state: "answered" | "unsure" | "removed",
 *                              source: "person" | "suggestion-accepted", at, seq, question? }
 *
 * `seq` and `at` are assigned HERE, on the server, when a save is accepted (POST /api/cases/facts):
 * seq = the highest seq the stored record holds + 1. The browser sends only the fact, its state and
 * value, and (for the two-tab rule) the seq it last saw for that fact (`seenSeq`), which is compared,
 * never stored or used to order anything. A write that names `seq` or `at` is refused.
 *
 * Two tabs (§12): a write whose `seenSeq` is behind the stored record's seq is a conflict FOR THAT FACT
 * ONLY; it is not applied, the stored record is returned beside it, and the request's other facts are
 * saved. `force: true` ("Save" pressed on "Not saved yet") makes it the newest save, with the next seq.
 *
 * The checkpoint's `revision` is NOT changed by a fact write. The browser's own checkpoint save
 * compares that revision (intakeCheckpoint.ts saveCheckpoint) and would refuse every later save of an
 * open tab if a fact write renewed it. The other half of that rule -- the browser's whole-checkpoint
 * save must keep the facts the server wrote -- is not true yet: test:fact-coexistence shows it fails.
 *
 * caseFileOf applies the record last (option A, 1 Nov: caseFile.ts applyFactRecords), over every older copy
 * including the change record; no screen writes through the route yet (G2).
 *
 * Pure: no React, no network. States no law.
 */
import { CASE_FILE_SECTION, SLOT_FACTS, emptyCaseFile, give, type SlotFact } from "./caseFile";
import type { CaseFact } from "./factsOfQuestion";
import { readCheckpoint, type IntakeCourt } from "../intakeCheckpoint";
import { caseTitleFromIntake } from "../caseTitle";

/**
 * Every fact a record may hold: the case file's slots, plus the nine question facts the slots cannot
 * hold today (design §1, code report §1.1). The design's later facts (parentingTime, timeline, ...) are
 * added here when they are built, with factsOfQuestion.ts.
 */
export const FACT_IDS = [
  ...SLOT_FACTS,
  "situation", "story", "evidence", "serviceMethod", "courtFileNumber", "claimIssuedDate", "defenceFiledDate", "filedDocuments", "claimServed",
] as const;
export type FactId = (typeof FACT_IDS)[number];
// FACT_IDS and factsOfQuestion's CaseFact are the same set: a fact added to one and not the other fails to compile.
type Same<A, B> = [Exclude<A, B>, Exclude<B, A>] extends [never, never] ? true : false;
const sameFacts: Same<FactId, CaseFact> = true;
void sameFacts;

export const isFactId = (fact: unknown): fact is FactId => typeof fact === "string" && (FACT_IDS as readonly string[]).includes(fact);
const isSlot = (fact: string): fact is SlotFact => (SLOT_FACTS as readonly string[]).includes(fact);

export type FactValue = string | number | boolean | string[];
export type FactState = "answered" | "unsure" | "removed";
export type FactSource = "person" | "suggestion-accepted";
export type FactRecord = { value?: FactValue; state: FactState; source: FactSource; at: string; seq: number; question?: string };
export type FactRecords = Partial<Record<FactId, FactRecord>>;

/** One write as the browser sends it: never a seq, never an ordering time. */
export type FactWrite = { fact: FactId; state: FactState; value?: FactValue; source: FactSource; question?: string; seenSeq?: number; force?: true };
export type FactConflict = { fact: FactId; stored: FactRecord; sent: FactWrite };
export type FactWriteResult =
  | { ok: true; master: Record<string, unknown>; saved: { fact: FactId; seq: number; at: string }[]; conflicts: FactConflict[]; facts: FactRecords }
  | { ok: false; reject: string };

const object = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const isValue = (value: unknown): value is FactValue =>
  (typeof value === "string" && value.trim().length > 0 && value.length <= 4_000) ||
  (typeof value === "number" && Number.isFinite(value)) ||
  typeof value === "boolean" ||
  (Array.isArray(value) && value.length > 0 && value.length <= 200 && value.every((item) => typeof item === "string" && item.length <= 1_000));

export const MAX_WRITES_PER_REQUEST = 40;

/** The fact records a checkpoint's sections hold (malformed entries left out). */
export function factRecordsOf(sections: Record<string, unknown> | undefined): FactRecords {
  const out: FactRecords = {};
  for (const [fact, raw] of Object.entries(object(object(object(sections)[CASE_FILE_SECTION]).facts))) {
    const entry = object(raw);
    if (!isFactId(fact) || typeof entry.seq !== "number" || !Number.isInteger(entry.seq) || typeof entry.at !== "string") continue;
    if (entry.state !== "answered" && entry.state !== "unsure" && entry.state !== "removed") continue;
    if (entry.state === "answered" && !isValue(entry.value)) continue;
    out[fact] = {
      state: entry.state,
      ...(isValue(entry.value) && entry.state !== "removed" ? { value: entry.value } : {}),
      source: entry.source === "suggestion-accepted" ? "suggestion-accepted" : "person",
      at: entry.at,
      seq: entry.seq,
      ...(typeof entry.question === "string" ? { question: entry.question } : {}),
    };
  }
  return out;
}

/** The highest seq a record holds (0 when none). */
export const highestSeq = (facts: FactRecords): number => Math.max(0, ...Object.values(facts).map((entry) => entry?.seq ?? 0));

/**
 * The writes in a request body, checked; or the reason the whole request is refused. A write that
 * names `seq` or `at` is refused: the server alone orders saves (§12).
 */
export function readFactWrites(body: unknown): { ok: true; writes: FactWrite[] } | { ok: false; error: string } {
  const list = object(body).facts;
  if (!Array.isArray(list) || list.length === 0) return { ok: false, error: "facts must be a non-empty list" };
  if (list.length > MAX_WRITES_PER_REQUEST) return { ok: false, error: `at most ${MAX_WRITES_PER_REQUEST} facts per save` };
  const writes: FactWrite[] = [];
  const seen = new Set<string>();
  for (const raw of list) {
    const item = object(raw);
    if ("seq" in item || "at" in item) return { ok: false, error: "seq and at are set by the server, never sent" };
    if (!isFactId(item.fact)) return { ok: false, error: `not a fact: ${String(item.fact)}` };
    if (seen.has(item.fact)) return { ok: false, error: `fact sent twice: ${item.fact}` };
    seen.add(item.fact);
    if (item.state !== "answered" && item.state !== "unsure" && item.state !== "removed") return { ok: false, error: `not a state: ${String(item.state)}` };
    if (item.state === "answered" && !isValue(item.value)) return { ok: false, error: `an answer needs a value: ${item.fact}` };
    if (item.state !== "answered" && item.value !== undefined) return { ok: false, error: `only an answer has a value: ${item.fact}` };
    if (item.source !== undefined && item.source !== "person" && item.source !== "suggestion-accepted") return { ok: false, error: `not a source: ${String(item.source)}` };
    if (item.seenSeq !== undefined && !(typeof item.seenSeq === "number" && Number.isInteger(item.seenSeq) && item.seenSeq >= 0)) return { ok: false, error: `seenSeq must be a whole number: ${item.fact}` };
    if (item.question !== undefined && !(typeof item.question === "string" && item.question.length <= 200)) return { ok: false, error: `question must be a short id: ${item.fact}` };
    if (item.force !== undefined && item.force !== true) return { ok: false, error: `force must be true or absent: ${item.fact}` };
    writes.push({
      fact: item.fact,
      state: item.state,
      ...(item.state === "answered" ? { value: item.value as FactValue } : {}),
      source: item.source === "suggestion-accepted" ? "suggestion-accepted" : "person",
      ...(typeof item.question === "string" ? { question: item.question } : {}),
      ...(typeof item.seenSeq === "number" ? { seenSeq: item.seenSeq } : {}),
      ...(item.force === true ? { force: true as const } : {}),
    });
  }
  return { ok: true, writes };
}

/**
 * An answer's value as the case file keeps it, through the case file's own `give` (an amount as a
 * number, a rough time kept as unsure, "I don't know" as unsure), so a record holds what caseFileOf
 * would. Null when the value gives nothing.
 */
function normalised(write: FactWrite): { state: FactState; value?: FactValue } | null {
  if (write.state !== "answered") return { state: write.state };
  if (!isSlot(write.fact)) return { state: "answered", value: write.value };
  const file = emptyCaseFile();
  give(file, write.fact, write.value, write.question ?? "fact");
  const slot = file[write.fact];
  if (slot.state === "answered" && slot.value !== undefined) return { state: "answered", value: slot.value };
  if (slot.state === "unsure") return { state: "unsure" };
  return null;
}

/** Whether a stored record already holds this answer (its state, and its value as the case file keeps it). */
function sameRecord(held: FactRecord, kept: { state: FactState; value?: FactValue }): boolean {
  return held.state === kept.state && JSON.stringify(held.value ?? null) === JSON.stringify(kept.value ?? null);
}

/**
 * THE SERVER'S SAVE OF FACT WRITES, pure: applied to the master result as read, each accepted write
 * gets the next seq after the highest stored, and the server's time. Run inside updateMasterResult's
 * compare-and-set, so a lost race re-reads the row and runs this again on the new record.
 */
export function applyFactWrites(master: Record<string, unknown>, court: IntakeCourt, caseId: string, writes: readonly FactWrite[], now: Date): FactWriteResult {
  const checkpoint = readCheckpoint(master.intakeCheckpoint, court, caseId);
  if (!checkpoint) return { ok: false, reject: "no-intake-checkpoint" };
  const stored = factRecordsOf(checkpoint.sections);
  const facts: FactRecords = { ...stored };
  let seq = highestSeq(stored);
  const at = now.toISOString();
  const saved: { fact: FactId; seq: number; at: string }[] = [];
  const conflicts: FactConflict[] = [];
  let wrote = false;
  for (const write of writes) {
    const held = stored[write.fact];
    const kept = normalised(write);
    if (!kept) return { ok: false, reject: `no-value:${write.fact}` };
    if (held && !write.force && (write.seenSeq ?? 0) < held.seq) {
      // The same answer the record already holds (a resend after a timeout, two saves racing): already saved, so it is
      // neither a conflict nor numbered again (found on the real save path, 5 Nov: "Not saved yet" for an identical answer).
      if (sameRecord(held, kept)) { saved.push({ fact: write.fact, seq: held.seq, at: held.at }); continue; }
      conflicts.push({ fact: write.fact, stored: held, sent: write });
      continue;
    }
    seq += 1;
    facts[write.fact] = { ...kept, source: write.source, at, seq, ...(write.question ? { question: write.question } : {}) };
    saved.push({ fact: write.fact, seq, at });
    wrote = true;
  }
  if (!wrote) return { ok: true, master, saved, conflicts, facts: stored };
  const caseFile = object(checkpoint.sections[CASE_FILE_SECTION]);
  const next = { ...checkpoint, sections: { ...checkpoint.sections, [CASE_FILE_SECTION]: { ...caseFile, facts } } };
  if (!readCheckpoint(next, court, caseId)) return { ok: false, reject: "intake-too-large" };
  // The case's title, saved beside the record whenever the other party is (Chrome check of #545 at 7bce410: the dashboard
  // said "Small Claims case" after the other party was known). Derived here, by the one writer, so a list of cases reads a
  // saved title and never the answers themselves.
  const titled = saved.some((entry) => entry.fact === "otherParty")
    ? { caseTitle: caseTitleFromIntake(facts.otherParty?.state === "answered" ? facts.otherParty.value : "", court) }
    : {};
  return { ok: true, master: { ...master, intakeCheckpoint: next, ...titled }, saved, conflicts, facts };
}
