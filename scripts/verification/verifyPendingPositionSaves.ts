/**
 * A SAVE OF THE STEP OR DATES STILL ON ITS WAY SURVIVES A FULL PAGE LOAD (28 Oct, #488 at real speed).
 *
 * Checks, as properties (pendingPositionSaves.ts, positionSave.ts):
 *   - a save is written down before it is sent, and crossed off once the case holds it;
 *   - one that failed stays written down, for the next page to send;
 *   - a newer save that landed takes its parts out of every older one still written down, so an
 *     older choice is never sent over a newer one (a date by its question, a stage with its source);
 *   - what is written down is merged oldest to newest, and anything past the age limit is dropped;
 *   - across a page load (the page's memory gone, the tab's storage kept): a save whose write never
 *     landed is sent by the next page, before it reads the case, and lands -- in every area;
 *   - a page that read the case before that send lands shows it at once (withReplayedPosition);
 *   - as the tab closes, each case's unsaved parts are what is sent;
 *   - the storage key is in the registry, session-only, cleared by the reset.
 *
 * Failure it exists to catch: the Charter story's day it happened, counted on the next-step page,
 * lost when the page was left during its save, so the case page never showed the deadline; w5's
 * date asked again on the case page (GitHub story pack at real speed, 27-28 Oct).
 */
import { INTAKE_STORAGE_KEYS, PENDING_POSITION_SAVE_KEY } from "../../src/lib/case-system/storage/intakeStorageKeys";
import {
  PENDING_MAX_AGE_MS,
  addPendingPositionSave,
  mergePositionPatches,
  readPendingPositionSaves,
  setPendingStorageForChecks,
  settlePendingPositionSave,
  withoutNewer,
} from "../../src/lib/case-system/storage/pendingPositionSaves";
import { readCasePosition } from "../../src/lib/case-system/casePosition";
import {
  pendingSendsAsPageCloses,
  positionSavesSettled,
  resetPageForChecks,
  savePositionQueuedOutcome,
  setPositionClientForChecks,
  setPositionSaveTimeoutForChecks,
  withReplayedPosition,
} from "../../app/builder/_components/positionSave";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

/** The tab's session storage: kept across a page load, unlike the page's memory. */
const tab = new Map<string, string>();
setPendingStorageForChecks({ getItem: (key) => tab.get(key) ?? null, setItem: (key, value) => void tab.set(key, value), removeItem: (key) => void tab.delete(key) });

type Row = { court_path: string; master_result: Record<string, unknown>; updated_at: string };
/** A case row as PostgREST answers it; `writes: "hang"` never answers a write (the page is left first). */
function fakeCases(row: Row, mode: { writes: "land" | "hang" }) {
  let stamp = 0;
  return {
    from() {
      return {
        select(columns: string) {
          const chain = {
            eq: () => chain,
            maybeSingle: async () => {
              const whole = /^master_result\b/.test(columns);
              const paths = Object.fromEntries([...columns.matchAll(/(\w+):master_result->(\w+)/g)].map(([, alias, key]) => [alias, JSON.parse(JSON.stringify(row.master_result[key] ?? null))]));
              return { data: whole ? { master_result: JSON.parse(JSON.stringify(row.master_result)), updated_at: row.updated_at } : { court_path: row.court_path, ...paths }, error: null };
            },
          };
          return chain;
        },
        update(values: { master_result: Record<string, unknown> }) {
          const filters: [string, string][] = [];
          const chain = {
            eq: (column: string, value: string) => {
              filters.push([column, value]);
              return chain;
            },
            select: async () => {
              if (mode.writes === "hang") return new Promise<never>(() => {});
              const expected = filters.find(([column]) => column === "updated_at")?.[1];
              if (expected !== undefined && expected !== row.updated_at) return { data: [], error: null };
              row.master_result = values.master_result;
              row.updated_at = `2026-10-28T00:00:${String((stamp += 1)).padStart(2, "0")}Z`;
              return { data: [{ id: "case" }], error: null };
            },
          };
          return chain;
        },
      };
    },
  };
}

const DATE_QUESTION: Record<string, string> = { "small-claims": "sc-date-defence-filed", civil: "case-date-third-party-claim-issued", family: "case-date-served-with-motion-to-change" };

async function main() {
  // --- The store itself ------------------------------------------------------------------------
  tab.clear();
  addPendingPositionSave("c", { id: "a", at: Date.now(), patch: { dateAnswers: { q1: "2026-01-01", q2: "2026-01-02" }, stepId: "s1" } });
  addPendingPositionSave("c", { id: "b", at: Date.now(), patch: { dateAnswers: { q1: "2026-02-02" } } });
  check("saves are written down in order", readPendingPositionSaves("c").map((entry) => entry.id).join() === "a,b");
  settlePendingPositionSave("c", "b");
  const left = readPendingPositionSaves("c");
  check(
    "a newer save that landed takes its parts out of older ones (the older date is never sent over it)",
    left.length === 1 && JSON.stringify(left[0].patch) === JSON.stringify({ dateAnswers: { q2: "2026-01-02" }, stepId: "s1" }),
    JSON.stringify(left),
  );
  check("a stage that landed takes the older stage and its source with it", withoutNewer({ confirmedStage: "x", confirmedStageFrom: "story", stepId: "s" }, { confirmedStage: "y" })?.confirmedStageFrom === undefined);
  check("merged oldest to newest: the later part wins, dates merged by question", JSON.stringify(mergePositionPatches([{ dateAnswers: { q1: "1", q2: "2" }, stepId: "a" }, { dateAnswers: { q1: "3" }, stepId: "b" }])) === JSON.stringify({ dateAnswers: { q1: "3", q2: "2" }, stepId: "b" }));
  tab.clear();
  addPendingPositionSave("old", { id: "x", at: Date.now() - PENDING_MAX_AGE_MS - 1, patch: { stepId: "s" } });
  check("a save older than the limit is dropped, not sent", readPendingPositionSaves("old").length === 0);

  // --- Across a page load, every area -----------------------------------------------------------
  setPositionSaveTimeoutForChecks(60_000);
  for (const court of ["small-claims", "civil", "family"] as const) {
    tab.clear();
    resetPageForChecks();
    const questionId = DATE_QUESTION[court];
    const row: Row = { court_path: court, master_result: { intakeData: { courtPath: court }, casePicture: { kept: true } }, updated_at: "2026-10-28T00:00:00Z" };
    const caseId = `lost-${court}`;
    // Page 1: the date is answered; its write never lands before the page is left.
    setPositionClientForChecks(fakeCases(row, { writes: "hang" }) as never);
    void savePositionQueuedOutcome(caseId, { dateAnswers: { [questionId]: "2026-03-03" } });
    await new Promise((resolve) => setTimeout(resolve, 20));
    check(`${court}: the save is written down while it is on its way`, readPendingPositionSaves(caseId).length === 1);
    check(`${court}: as the tab closes, that save is what is sent`, JSON.stringify(pendingSendsAsPageCloses().find((send) => send.caseId === caseId)?.body ?? {}).includes("2026-03-03"));
    check(`${court}: the case does not hold it yet (the page is left now)`, !readCasePosition(row.master_result, court).dateAnswers[questionId]);
    // Page 2: the page's memory is gone; the tab's storage is not.
    resetPageForChecks();
    setPositionClientForChecks(fakeCases(row, { writes: "land" }) as never);
    const shown = withReplayedPosition(JSON.parse(JSON.stringify(row.master_result)), caseId, court);
    check(`${court}: a page that read the case first shows the date at once`, readCasePosition(shown, court).dateAnswers[questionId] === "2026-03-03");
    await positionSavesSettled(caseId, 5_000);
    const position = readCasePosition(row.master_result, court);
    check(`${court}: the next page sends it before reading, and the case holds the date`, position.dateAnswers[questionId] === "2026-03-03" && Boolean(row.master_result.casePicture), JSON.stringify(position.dateAnswers));
    check(`${court}: once it has landed it is crossed off`, readPendingPositionSaves(caseId).length === 0);
  }

  // --- A failed save stays for the next page ------------------------------------------------------
  tab.clear();
  resetPageForChecks();
  setPositionClientForChecks({ from: () => ({ select: () => { const chain = { eq: () => chain, maybeSingle: async () => ({ data: null, error: { code: "57014", message: "timeout" } }) }; return chain; } }) } as never);
  const failed = await savePositionQueuedOutcome("f", { stepId: "s" });
  check("a save that failed stays written down for the next page", failed === "failed" && readPendingPositionSaves("f").length === 1);

  // --- The registry -------------------------------------------------------------------------------
  const entry = INTAKE_STORAGE_KEYS.find((item) => item.key === PENDING_POSITION_SAVE_KEY);
  check("the key is in the storage registry, session only, cleared by prefix", Boolean(entry) && entry!.area === "session" && entry!.matches === "prefix" && entry!.holdsCaseContent);

  setPositionClientForChecks(null);
  setPositionSaveTimeoutForChecks(null);
  setPendingStorageForChecks(null);
  console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
  process.exit(failures ? 1 : 0);
}

void main();
