/**
 * Request parsing and validation for the case-event writer.
 *
 * WHY THIS IS IN src/ AND NOT IN THE ROUTE. These functions are checked by
 * scripts/verification/verifyCaseEvents.ts, and a verification suite importing
 * from app/api/ inverts the dependency — src/ is the library, app/ is the
 * delivery mechanism, and a check reaching into a route reads as a mistake to
 * whoever touches it next. The route composes these; it does not own them.
 *
 * THIS NEVER PARSES A DATE, AND THAT IS THE POINT.
 *
 * "4 March" has no year in it. "last Tuesday" depends on when it is read.
 * "after I got the letter" is not a date at all. A server that turned any of
 * those into 2026-03-04 would be guessing, and the guess would then be stored
 * as a fact and used to order the user's case.
 *
 * So a normalized date must arrive as an ISO date the USER selected from a
 * picker shown beside the free-text field. Prose is REJECTED, not converted. A
 * client that sends "4 March" as a normalized date has a bug, and a 400 is the
 * honest answer — quietly parsing it would hide the bug and invent a year.
 *
 * WHERE VALIDATION LIVES. The database owns the invariants: eight CHECK
 * constraints on case_events. They are NOT re-implemented here. Duplicated
 * validation drifts, and the copy that drifts is always the one nobody is
 * looking at. This owns the one thing the schema cannot see — that `eventType`
 * is a member of the sourced vocabulary, which would otherwise need a migration
 * every time sourced content changes.
 */

import { caseEventType, type CaseEventType } from "./caseEventTypes";

/** ISO calendar date, as a date picker produces. Never parsed from prose. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Certainty = "exact" | "approximate" | "unknown";

export type EventSource =
  | "user-stated"
  | "confirmed-from-narrative"
  | "confirmed-from-document";

export function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function optionalText(value: unknown): string | null {
  const trimmed = text(value);
  return trimmed.length > 0 ? trimmed : null;
}

function certainty(value: unknown): Certainty | null {
  return value === "exact" || value === "approximate" || value === "unknown" ? value : null;
}

/**
 * A normalized date must be an ISO date the user picked, or absent.
 *
 * Rejects anything else rather than attempting a parse.
 */
export function pickedDate(
  value: unknown,
): { ok: true; date: string | null } | { ok: false } {
  if (value === undefined || value === null || value === "") return { ok: true, date: null };

  const candidate = text(value);
  if (!ISO_DATE.test(candidate)) return { ok: false };

  // Reject a well-formed but impossible date (2026-02-31) without computing
  // anything about it: round-trip it and require the same string back.
  const parsed = new Date(`${candidate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== candidate) {
    return { ok: false };
  }

  return { ok: true, date: candidate };
}

export type ParsedEvent = {
  eventType: CaseEventType;
  title: string;
  description: string | null;
  occurredAtRaw: string | null;
  occurredAtNormalized: string | null;
  dateCertainty: Certainty;
  scheduledForRaw: string | null;
  scheduledForNormalized: string | null;
  scheduledForCertainty: Certainty;
  source: EventSource;
  narrativeBasis: string | null;
  relatedDocumentId: string | null;
  supersedesEventId: string | null;
  acknowledgedCollision: boolean;
  dryRun: boolean;
};

export function parseEventRequest(raw: Record<string, unknown>): ParsedEvent | null {
  const eventTypeValue = text(raw.eventType);

  // The one invariant the database cannot hold: membership of the sourced
  // vocabulary. caseEventType() returns undefined for anything else, including
  // a plausible-looking type somebody invented.
  if (!caseEventType(eventTypeValue)) return null;

  const title = text(raw.title);
  if (!title) return null;

  const dateCertainty = certainty(raw.dateCertainty ?? "unknown");
  const scheduledForCertainty = certainty(raw.scheduledForCertainty ?? "unknown");
  if (!dateCertainty || !scheduledForCertainty) return null;

  const occurredAt = pickedDate(raw.occurredAtNormalized);
  const scheduledFor = pickedDate(raw.scheduledForNormalized);
  if (!occurredAt.ok || !scheduledFor.ok) return null;

  const source = raw.source ?? "user-stated";
  if (
    source !== "user-stated" &&
    source !== "confirmed-from-narrative" &&
    source !== "confirmed-from-document"
  ) {
    return null;
  }

  const supersedesEventId = optionalText(raw.supersedesEventId);
  if (supersedesEventId && !UUID_PATTERN.test(supersedesEventId)) return null;

  const relatedDocumentId = optionalText(raw.relatedDocumentId);
  if (relatedDocumentId && !UUID_PATTERN.test(relatedDocumentId)) return null;

  if (raw.acknowledgedCollision !== undefined && typeof raw.acknowledgedCollision !== "boolean") {
    return null;
  }
  if (raw.dryRun !== undefined && typeof raw.dryRun !== "boolean") return null;

  return {
    eventType: eventTypeValue as CaseEventType,
    title,
    description: optionalText(raw.description),
    occurredAtRaw: optionalText(raw.occurredAtRaw),
    occurredAtNormalized: occurredAt.date,
    dateCertainty,
    scheduledForRaw: optionalText(raw.scheduledForRaw),
    scheduledForNormalized: scheduledFor.date,
    scheduledForCertainty,
    source,
    narrativeBasis: optionalText(raw.narrativeBasis),
    relatedDocumentId,
    supersedesEventId,
    acknowledgedCollision: raw.acknowledgedCollision === true,
    dryRun: raw.dryRun === true,
  };
}
