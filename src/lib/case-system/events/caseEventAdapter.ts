/**
 * Maps stored `case_events` rows to the `ProceduralEvent[]` the engines consume.
 *
 * WHY AN ADAPTER RATHER THAN A SHARED TYPE. `ProceduralEventType` has 77
 * members and the sourced Small Claims vocabulary has 12. They do not line up,
 * and neither should be bent to fit the other:
 *
 *   - SEVEN members of the union are DEADLINES, not events: "defence-due",
 *     "undertaking-due", "motion-confirmation-due", "conference-materials-due",
 *     "certificate-of-readiness-due", "pre-trial-brief-due" and
 *     "trial-materials-due". An event happened; a deadline has not. Storing a
 *     deadline as an event would be a category error, and deadlines are a
 *     separate table with different semantics.
 *
 *   - Much of the union is Superior Court civil vocabulary that Small Claims
 *     does not have at all — "affidavit-of-documents-served",
 *     "discovery-scheduled", "discovery-completed", "undertaking-given",
 *     "notice-of-action-issued". Small Claims has no discovery.
 *
 * The union wants its own audit; see OUTSTANDING_ISSUES.md. Until then this
 * adapter carries the mismatch explicitly, in a table anyone can read, rather
 * than hiding it in a rename.
 *
 * `buildProceduralState` works unchanged when fed from here: it consumes
 * `ProceduralEvent[]` and does not care where they came from.
 */

import type {
  ProceduralArea,
  ProceduralEvent,
  ProceduralEventType,
} from "../procedure/proceduralStateArchitecture";

import { type CaseEventType } from "./caseEventTypes";

/**
 * The columns `CaseEventRow` is made of, as a PostgREST select list.
 *
 * Lives with the type rather than in each route, so a column added to the type
 * cannot be silently absent from one caller's select and present in another's.
 */
export const CASE_EVENT_SELECT_COLUMNS =
  "id,case_id,event_type,court_path,title,description," +
  "occurred_at_raw,occurred_at_normalized,date_certainty," +
  "scheduled_for_raw,scheduled_for_normalized,scheduled_for_certainty," +
  "source,narrative_basis,related_document_id,supersedes_event_id," +
  "retracted_at,created_at";

/** A stored row, as selected from `case_events`. */
export type CaseEventRow = {
  id: string;
  case_id: string;
  event_type: string;
  court_path: string;
  title: string;
  description: string | null;
  occurred_at_raw: string | null;
  occurred_at_normalized: string | null;
  date_certainty: "exact" | "approximate" | "unknown";
  scheduled_for_raw: string | null;
  scheduled_for_normalized: string | null;
  scheduled_for_certainty: "exact" | "approximate" | "unknown";
  source: "user-stated" | "confirmed-from-narrative" | "confirmed-from-document";
  narrative_basis: string | null;
  related_document_id: string | null;
  supersedes_event_id: string | null;
  retracted_at: string | null;
  created_at: string;
};

/**
 * THE MAPPING TABLE.
 *
 * `union` is the nearest honest counterpart in `ProceduralEventType`.
 * `exact` records whether it is a genuine match or an approximation, so the
 * approximations stay visible instead of reading as clean mappings. Where it is
 * false, the real sourced type is preserved in the ProceduralEvent's
 * `description` prefix and nothing downstream has to guess.
 */
export const EVENT_TYPE_MAPPING: Record<
  CaseEventType,
  { union: ProceduralEventType; area: ProceduralArea; exact: boolean; note?: string }
> = {
  "claim-filed": { union: "claim-filed", area: "commencement", exact: true },
  "claim-served": { union: "claim-served", area: "service", exact: true },
  "defence-filed": { union: "response-filed", area: "response", exact: false,
    note: "The union splits serve/file into response-served and response-filed; r. 9.01 requires both in one step." },
  "defendants-claim-issued": { union: "pleading-delivered", area: "response", exact: false,
    note: "The union has no defendant's-claim member. r. 10.01 (1) is a distinct Small Claims concept." },
  "noted-in-default": { union: "default-noted", area: "default", exact: true },
  "settlement-conference-held": { union: "conference-completed", area: "settlement", exact: true },
  "motion-served": { union: "motion-served", area: "motion", exact: true },
  "trial-date-fixed": { union: "trial-scheduled", area: "trial", exact: true },
  "trial-held": { union: "trial-completed", area: "trial", exact: true },
  "order-or-judgment-received": { union: "order-issued", area: "trial", exact: false,
    note: "The union distinguishes order-issued from judgment-issued; the user records receiving one document." },
  "enforcement-step": { union: "enforcement-started", area: "enforcement", exact: false,
    note: "r. 20 offers parallel routes and any number of steps; the union has a single start marker." },
  "other-user-described": { union: "unknown", area: "unknown", exact: false,
    note: "Deliberately unmapped. The user's event carries no procedural characterisation and none is invented here." },
};

/**
 * Live events: not retracted, and not superseded by another live row.
 *
 * Superseded rows are kept (decision 3 — the user was shown things based on the
 * original) and excluded from derivation.
 */
export function liveCaseEvents(rows: CaseEventRow[]): CaseEventRow[] {
  const supersededIds = new Set(
    rows
      .filter((row) => row.retracted_at === null && row.supersedes_event_id)
      .map((row) => row.supersedes_event_id as string),
  );

  return rows.filter((row) => row.retracted_at === null && !supersededIds.has(row.id));
}

/**
 * A date that can be relied on for ordering.
 *
 * Only 'exact' qualifies. An approximate date is the user's best recollection,
 * and sorting or comparing on it silently converts a guess into a fact.
 */
export function reliableOccurredAt(row: CaseEventRow): string | null {
  return row.date_certainty === "exact" ? row.occurred_at_normalized : null;
}

function describe(row: CaseEventRow): string {
  const mapping = EVENT_TYPE_MAPPING[row.event_type as CaseEventType];
  const base = row.description || "";

  // Where the mapping is approximate, the real sourced type is preserved so
  // nothing downstream has to infer it back out of the union member.
  if (mapping && !mapping.exact) {
    return base
      ? `[${row.event_type}] ${base}`
      : `[${row.event_type}]`;
  }

  return base;
}

export function toProceduralEvent(row: CaseEventRow): ProceduralEvent {
  const mapping = EVENT_TYPE_MAPPING[row.event_type as CaseEventType] ?? {
    union: "unknown" as ProceduralEventType,
    area: "unknown" as ProceduralArea,
    exact: false,
  };

  return {
    id: row.id,
    type: mapping.union,
    area: mapping.area,
    title: row.title,
    description: describe(row),
    occurredAtRaw: row.occurred_at_raw ?? undefined,
    // Only an exact date crosses over. buildProceduralState treats a present
    // normalized date as certain, so passing an approximation would upgrade a
    // recollection into a fact.
    occurredAtNormalized: reliableOccurredAt(row) ?? undefined,
    // Every row here is user-confirmed by construction: the table's source
    // CHECK has no 'system-inference' value.
    source: "user",
    relatedAuthorityIds: [],
    relatedDocumentIds: row.related_document_id ? [row.related_document_id] : [],
    relatedEvidenceIds: [],
    relatedDeadlineIds: [],
    // ProceduralEvent requires a confidence and case_events deliberately does
    // not store one — an ordinal over a user-stated fact is the pattern removed
    // repeatedly from this codebase. Every row is a confirmed user statement,
    // so this is a constant, not a judgment about the event.
    confidence: "high",
  };
}

export function toProceduralEvents(rows: CaseEventRow[]): ProceduralEvent[] {
  return liveCaseEvents(rows).map(toProceduralEvent);
}
