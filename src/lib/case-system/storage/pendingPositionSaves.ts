/**
 * A SAVE OF THE PERSON'S STEP, DATES OR FORM CHOICES STILL ON ITS WAY SURVIVES THE PAGE (28 Oct, #488 at real speed).
 *
 * The step, the stage and the dates are saved to the case one after another, through one queue
 * held in the page's memory (positionSave.ts). When the page is left by a full load -- a reload, a
 * typed address, a closed tab -- while a save is still waiting its turn or half done, that memory
 * is gone and the save with it. At the live site's speed that window is seconds: the date given in
 * the review ("June 3, 2025") was counted on the next-step page, and the case page never had it,
 * so its deadline never showed (Charter story); a date from the story was asked again on the case
 * page until the page found it in the story once more (w5). The Forms page's "does this form apply"
 * choices go through the same queue (/api/cases/form-applicability) and could be lost the same way.
 *
 * So each save is written down in this tab before it is sent and crossed off once the case holds
 * it (or refused it). The next page in this tab that saves to or reads that case sends what is
 * still written down first (positionSave.ts), and a closed tab sends it as it closes. Session
 * storage: it dies with the tab, and sign-out clears it (the registry entries,
 * PENDING_POSITION_SAVE_KEY and PENDING_FORM_APPLICABILITY_KEY). Older than 30 minutes, it is
 * dropped rather than sent.
 */
import { PENDING_FORM_APPLICABILITY_KEY, PENDING_POSITION_SAVE_KEY } from "./intakeStorageKeys";

export type PendingPositionSave = { id: string; at: number; patch: Record<string, unknown> };

/** What is written down: the step, stage and dates ("position"), or the Forms page's choices. */
export type PendingKind = "position" | "formApplicability";

/** A save written down longer ago than this is dropped, not sent. */
export const PENDING_MAX_AGE_MS = 30 * 60_000;

type Area = Pick<Storage, "getItem" | "setItem" | "removeItem">;
let areaForChecks: Area | null = null;
/** Set only by checks: the storage used instead of the tab's. */
export function setPendingStorageForChecks(area: Area | null) {
  areaForChecks = area;
}

function area(): Area | null {
  if (areaForChecks) return areaForChecks;
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

const PREFIX: Record<PendingKind, string> = { position: PENDING_POSITION_SAVE_KEY, formApplicability: PENDING_FORM_APPLICABILITY_KEY };
const keyFor = (caseId: string, kind: PendingKind) => `${PREFIX[kind]}${caseId}`;

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

function write(caseId: string, entries: PendingPositionSave[], kind: PendingKind) {
  const store = area();
  if (!store) return;
  try {
    if (entries.length) store.setItem(keyFor(caseId, kind), JSON.stringify(entries));
    else store.removeItem(keyFor(caseId, kind));
  } catch {
    // Storage full or refused: the save still goes ahead as before, only without this safety net.
  }
}

/** The saves for this case written down in this tab and not yet crossed off, oldest first, none older than the limit. */
export function readPendingPositionSaves(caseId: string, now = Date.now(), kind: PendingKind = "position"): PendingPositionSave[] {
  const store = area();
  if (!store) return [];
  try {
    const parsed = JSON.parse(store.getItem(keyFor(caseId, kind)) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is PendingPositionSave =>
        Boolean(entry) && typeof entry.id === "string" && typeof entry.at === "number" && now - entry.at <= PENDING_MAX_AGE_MS && Object.keys(asObject(entry.patch)).length > 0,
    );
  } catch {
    return [];
  }
}

/** Writes a save down before it is sent. */
export function addPendingPositionSave(caseId: string, entry: PendingPositionSave, kind: PendingKind = "position") {
  write(caseId, [...readPendingPositionSaves(caseId, Date.now(), kind), entry], kind);
}

/** Parts that are merged by their inner key: dates and service by question; form choices by form group, then question. */
const byInnerKey = (kind: PendingKind, key: string) => kind === "formApplicability" || key === "dateAnswers" || key === "service";

/**
 * What an older save still carries once a newer one has landed: the newer one's parts are taken
 * out of it (a date by its question, a form choice by its group and question, the stage with where
 * it came from), so an older choice is never sent again over a newer one.
 */
export function withoutNewer(older: Record<string, unknown>, newer: Record<string, unknown>, kind: PendingKind = "position"): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(older)) {
    if (byInnerKey(kind, key) && key in newer) {
      const covered = asObject(newer[key]);
      const left = Object.fromEntries(Object.entries(asObject(value)).filter(([id]) => !(id in covered)));
      if (Object.keys(left).length) out[key] = left;
    } else if (kind === "position" && key === "confirmedStageFrom") {
      if (!("confirmedStage" in newer)) out[key] = value;
    } else if (!(key in newer)) {
      out[key] = value;
    }
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Crosses a save off once the case holds it (or refused it), and takes its parts out of every
 * save written down before it.
 */
export function settlePendingPositionSave(caseId: string, id: string, kind: PendingKind = "position") {
  const entries = readPendingPositionSaves(caseId, Date.now(), kind);
  const index = entries.findIndex((entry) => entry.id === id);
  if (index < 0) return;
  const settled = entries[index];
  const kept: PendingPositionSave[] = [];
  entries.forEach((entry, i) => {
    if (i === index) return;
    if (i > index) return void kept.push(entry);
    const left = withoutNewer(entry.patch, settled.patch, kind);
    if (left) kept.push({ ...entry, patch: left });
  });
  write(caseId, kept, kind);
}

/** Every save written down for this case, merged oldest to newest into one, and crossed off. */
export function takePendingPositionSaves(caseId: string, kind: PendingKind = "position"): Record<string, unknown> | null {
  const entries = readPendingPositionSaves(caseId, Date.now(), kind);
  write(caseId, [], kind);
  return mergePositionPatches(entries.map((entry) => entry.patch), kind);
}

/** The saves merged in order: a later part wins; dates, service and form choices are merged by question. */
export function mergePositionPatches(patches: Record<string, unknown>[], kind: PendingKind = "position"): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  for (const patch of patches) {
    for (const [key, value] of Object.entries(patch)) {
      if (byInnerKey(kind, key)) out[key] = { ...asObject(out[key]), ...asObject(value) };
      else out[key] = value;
    }
    // A stage without where it came from replaces the earlier stage and its source together.
    if (kind === "position" && "confirmedStage" in patch && !("confirmedStageFrom" in patch)) delete out.confirmedStageFrom;
  }
  return Object.keys(out).length ? out : null;
}

/** Every case with a save written down in this tab (for the send as the tab closes). */
export function casesWithPendingPositionSaves(caseIds: Iterable<string>, kind: PendingKind = "position"): string[] {
  return [...caseIds].filter((caseId) => readPendingPositionSaves(caseId, Date.now(), kind).length > 0);
}
