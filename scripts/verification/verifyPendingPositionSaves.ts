/**
 * A SAVE OF THE STEP OR DATES STILL ON ITS WAY SURVIVES A FULL PAGE LOAD (28 Oct, #488 at real speed).
 *
 * Checks, as properties (pendingPositionSaves.ts, positionSave.ts):
 *   - a save is written down before it is sent, and crossed off once the case holds it;
 *   - one that finished, even as failed or refused, is crossed off; only one cut off by the page going stays;
 *   - resent values stop covering what the case holds once they have landed;
 *   - a resend as the page closes is tried once by each route;
 *   - a newer save that landed takes its parts out of every older one still written down, so an
 *     older choice is never sent over a newer one (a date by its question, a stage with its source);
 *   - what is written down is merged oldest to newest, and anything past the age limit is dropped;
 *   - across a page load (the page's memory gone, the tab's storage kept): a save whose write never
 *     landed is sent by the next page, before it reads the case, and lands -- in every area;
 *   - a page that read the case before that send lands shows it at once (withReplayedPosition);
 *   - as the tab closes, each case's unsaved parts are what is sent;
 *   - the Forms page's "does this form apply" choices, the same way: written down, crossed off when
 *     saved or refused for good, kept on no answer or a server error, sent by the next page, newer wins;
 *   - the storage keys are in the registry, session-only, cleared by the reset.
 *
 * Failure it exists to catch: the Charter story's day it happened, counted on the next-step page,
 * lost when the page was left during its save, so the case page never showed the deadline; w5's
 * date asked again on the case page (GitHub story pack at real speed, 27-28 Oct).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { INTAKE_STORAGE_KEYS, PENDING_FORM_APPLICABILITY_KEY, PENDING_POSITION_SAVE_KEY } from "../../src/lib/case-system/storage/intakeStorageKeys";
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
  pageGoing,
  positionSavesSettled,
  replayPendingFormApplicability,
  replayPendingPositionSaves,
  resetPageForChecks,
  saveFormApplicabilityQueued,
  setFormsRouteForChecks,
  savePositionQueuedOutcome,
  setPositionClientForChecks,
  setPositionSaveTimeoutForChecks,
  unsavedFromEarlierPage,
  withReplayedPosition,
} from "../../app/builder/_components/positionSave";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
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

  // --- A save that finished is crossed off, even when it failed (fresh review, 28 Oct) -----------------
  // The page already says "not saved"; sent again later it could land over a newer choice made
  // in another tab. Only a save cut off by the page going stays written down (above).
  tab.clear();
  resetPageForChecks();
  setPositionClientForChecks({ from: () => ({ select: () => { const chain = { eq: () => chain, maybeSingle: async () => ({ data: null, error: { code: "57014", message: "timeout" } }) }; return chain; } }) } as never);
  const failed = await savePositionQueuedOutcome("f", { stepId: "s" });
  check("a save that finished as failed is crossed off, never sent again later", failed === "failed" && readPendingPositionSaves("f").length === 0);
  // The same failure once the page is going (its request cancelled as it goes) is a cut-off save: kept.
  pageGoing();
  const cut = await savePositionQueuedOutcome("f2", { stepId: "s" });
  check("a save that fails once the page is going is kept, for the next page to send", cut === "failed" && readPendingPositionSaves("f2").length === 1);
  resetPageForChecks();

  // --- Resent values stop covering the case once they have landed (fresh review, 28 Oct) ---------------
  tab.clear();
  resetPageForChecks();
  {
    const row: Row = { court_path: "civil", master_result: { intakeData: { courtPath: "civil" } }, updated_at: "2026-10-28T00:00:00Z" };
    setPositionClientForChecks(fakeCases(row, { writes: "hang" }) as never);
    void savePositionQueuedOutcome("r", { dateAnswers: { "case-date-third-party-claim-issued": "2026-01-01" } });
    await new Promise((resolve) => setTimeout(resolve, 20));
    resetPageForChecks();
    setPositionClientForChecks(fakeCases(row, { writes: "land" }) as never);
    replayPendingPositionSaves("r");
    check("while the resend is on its way, the page shows it", JSON.stringify(unsavedFromEarlierPage("r") ?? {}).includes("2026-01-01"));
    await positionSavesSettled("r", 5_000);
    await new Promise((resolve) => setTimeout(resolve, 0));
    check("once it has landed, it no longer covers what the case holds (a newer choice there wins)", unsavedFromEarlierPage("r") === null);
  }

  // --- The Forms page's "does this form apply" choices (owner, 28 Oct) ---------------------------------
  tab.clear();
  resetPageForChecks();
  const sent: Record<string, unknown>[] = [];
  const answer = (status: number | null) => async (body: Record<string, unknown>) => {
    sent.push(body);
    return status === null ? null : new Response("{}", { status });
  };
  // Cut off: no answer ever comes, because the page goes while it waits.
  const cutOff = async (body: Record<string, unknown>) => {
    sent.push(body);
    return new Promise<Response | null>(() => {});
  };
  // Page 1: the save is cut off.
  setFormsRouteForChecks(cutOff);
  void saveFormApplicabilityQueued("forms-case", { smallClaims: { claimingMoney: true } }, "token");
  await new Promise((resolve) => setTimeout(resolve, 20));
  check("forms: a choice cut off by the page going stays written down", readPendingPositionSaves("forms-case", Date.now(), "formApplicability").length === 1);
  const close = pendingSendsAsPageCloses().find((send) => send.caseId === "forms-case" && send.url === "/api/cases/form-applicability");
  check("forms: as the tab closes, the choice is what is sent, to the forms route", close?.method === "PATCH" && JSON.stringify(close.body).includes("claimingMoney"));
  // Page 2: the next Forms page sends it before it reads the choices.
  resetPageForChecks();
  sent.length = 0;
  setFormsRouteForChecks(answer(200));
  await replayPendingFormApplicability("forms-case", "token");
  check("forms: the next page sends it before reading, and once saved it is crossed off", JSON.stringify(sent[0] ?? {}).includes("claimingMoney") && readPendingPositionSaves("forms-case", Date.now(), "formApplicability").length === 0);
  // A newer answer to the same question wins over the older one still written down.
  tab.clear();
  resetPageForChecks();
  setFormsRouteForChecks(cutOff);
  void saveFormApplicabilityQueued("forms-b", { smallClaims: { claimingMoney: true, other: "x" } }, "token");
  await new Promise((resolve) => setTimeout(resolve, 20));
  // The newer save goes straight to the route (the queue would wait behind the cut-off one).
  setFormsRouteForChecks(answer(200));
  addPendingPositionSave("forms-b", { id: "newer", at: Date.now(), patch: { smallClaims: { claimingMoney: false } } }, "formApplicability");
  settlePendingPositionSave("forms-b", "newer", "formApplicability");
  const leftOver = readPendingPositionSaves("forms-b", Date.now(), "formApplicability");
  check(
    "forms: a newer answer takes the older answer to the same question out of what is left (the rest stays)",
    leftOver.length === 1 && JSON.stringify(leftOver[0].patch) === JSON.stringify({ smallClaims: { other: "x" } }),
    JSON.stringify(leftOver),
  );
  // Any answer from the route finishes the save: refused (400), a server error (500), or none at all.
  tab.clear();
  resetPageForChecks();
  for (const [caseId, status] of [["forms-c", 400], ["forms-d", 500], ["forms-e", null]] as const) {
    setFormsRouteForChecks(answer(status));
    await saveFormApplicabilityQueued(caseId, { civil: { x: true } }, "token");
  }
  check("forms: a save that finished, however it finished, is crossed off", ["forms-c", "forms-d", "forms-e"].every((caseId) => readPendingPositionSaves(caseId, Date.now(), "formApplicability").length === 0));
  setFormsRouteForChecks(null);

  // --- A resend as the page closes is tried once by each route (fresh review, 28 Oct) ------------------
  for (const route of ["app/api/cases/position/route.ts", "app/api/cases/form-applicability/route.ts"]) {
    const source = readFileSync(path.join(ROOT, route), "utf8");
    check(`${route}: a resend is tried once, so a case changed since is not written over`, /request\.headers\.get\(RESEND_HEADER\) \? 1 :/.test(source));
  }
  check("the send as the page closes is marked as a resend", /\[RESEND_HEADER\]: "1"/.test(readFileSync(path.join(ROOT, "app/builder/_components/positionSave.ts"), "utf8")));

  // --- The registry -------------------------------------------------------------------------------
  const entry = INTAKE_STORAGE_KEYS.find((item) => item.key === PENDING_POSITION_SAVE_KEY);
  check("the key is in the storage registry, session only, cleared by prefix", Boolean(entry) && entry!.area === "session" && entry!.matches === "prefix" && entry!.holdsCaseContent);
  const formsEntry = INTAKE_STORAGE_KEYS.find((item) => item.key === PENDING_FORM_APPLICABILITY_KEY);
  check("the forms key is in the storage registry, session only, cleared by prefix", Boolean(formsEntry) && formsEntry!.area === "session" && formsEntry!.matches === "prefix" && formsEntry!.holdsCaseContent);

  setPositionClientForChecks(null);
  setPositionSaveTimeoutForChecks(null);
  setPendingStorageForChecks(null);
  console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
  process.exit(failures ? 1 : 0);
}

void main();
