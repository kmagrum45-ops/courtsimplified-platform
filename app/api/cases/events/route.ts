/**
 * POST /api/cases/events — records a procedural event on a case.
 *
 * THIS ROUTE NEVER PARSES A DATE, AND THAT IS DELIBERATE.
 *
 * "4 March" has no year in it. "last Tuesday" depends on when it is read.
 * "after I got the letter" is not a date at all. A server that turned any of
 * those into 2026-03-04 would be guessing, and the guess would then be stored
 * as a fact and used to order the user's case.
 *
 * So `occurred_at_normalized` and `scheduled_for_normalized` only ever hold a
 * date the USER selected, from a date picker shown beside the free-text field.
 * `occurred_at_raw` keeps their own words. `date_certainty` records whether the
 * date is exact, approximate, or absent, and the adapter passes only 'exact'
 * dates downstream — an approximate date is a recollection, and sorting on it
 * would convert a recollection into a fact.
 *
 * WHERE VALIDATION LIVES. The database owns the invariants: eight CHECK
 * constraints on case_events enforce the court path, the certainty vocabularies,
 * the source vocabulary, that a narrative-confirmed row keeps the sentence it
 * came from, that a normalized date has the user's raw words beside it, and
 * that a retraction carries a reason. Those are NOT re-implemented here.
 * Duplicated validation drifts, and the copy that drifts is always the one
 * nobody is looking at.
 *
 * This route owns the one thing the database cannot see: that `event_type` is a
 * member of the sourced vocabulary in caseEventTypes.ts. A CHECK constraint
 * listing those values would have to be migrated every time the vocabulary
 * changes, and the vocabulary is sourced content that will change.
 *
 * THE SINGLETON PROMPT IS ENFORCED SERVER-SIDE. There is one claim issuance and
 * there can be many motions. Recording a second event of a singleton type gets
 * a 409 carrying the rows that already exist, and the write is REFUSED until
 * the caller says which it is — a correction (supersedes_event_id) or a genuine
 * second thing (acknowledgedCollision). A client that forgets to ask cannot
 * silently duplicate.
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  CASE_EVENT_TYPES,
  caseEventType,
  isSingletonType,
} from "../../../../src/lib/case-system/events/caseEventTypes";
import {
  liveCaseEvents,
  type CaseEventRow,
} from "../../../../src/lib/case-system/events/caseEventAdapter";
import {
  existingSingletonEvents,
  findCaseEventInconsistencies,
} from "../../../../src/lib/case-system/events/caseEventConsistency";
import { deriveCaseStageWithEvents } from "../../../../src/lib/case-system/events/caseStageFromEvents";
import {
  analysisFreshness,
  freshnessMessage,
} from "../../../../src/lib/case-system/events/caseAnalysisFreshness";
// Parsing and validation live in src/, not here: verifyCaseEvents checks them,
// and a verification suite importing from app/api/ inverts the dependency.
import {
  UUID_PATTERN,
  parseEventRequest,
  text,
  type ParsedEvent,
} from "../../../../src/lib/case-system/events/caseEventRequest";
import {
  getAuthenticatedOwnedCase,
  getAuthenticatedUser,
} from "../../../../src/lib/supabase/serverAuth";

const MAX_REQUEST_BYTES = 8_000;

const ALLOWED_KEYS = [
  "caseId",
  "eventType",
  "title",
  "description",
  "occurredAtRaw",
  "occurredAtNormalized",
  "dateCertainty",
  "scheduledForRaw",
  "scheduledForNormalized",
  "scheduledForCertainty",
  "source",
  "narrativeBasis",
  "relatedDocumentId",
  "supersedesEventId",
  "acknowledgedCollision",
  "dryRun",
];

const SELECT_COLUMNS =
  "id,case_id,event_type,court_path,title,description," +
  "occurred_at_raw,occurred_at_normalized,date_certainty," +
  "scheduled_for_raw,scheduled_for_normalized,scheduled_for_certainty," +
  "source,narrative_basis,related_document_id,supersedes_event_id," +
  "retracted_at,created_at";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function authenticatedClient(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = bearerToken(request);

  return url && key && token
    ? createClient(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
}


function collisionResponse(
  parsed: ParsedEvent,
  colliding: CaseEventRow[],
): NextResponse {
  const definition = caseEventType(parsed.eventType);

  return NextResponse.json(
    {
      status: "collision",
      eventType: parsed.eventType,
      // Everything the prompt needs, so the client does not re-query.
      existing: colliding.map((row) => ({
        id: row.id,
        title: row.title,
        occurredAtRaw: row.occurred_at_raw,
        occurredAtNormalized: row.occurred_at_normalized,
        dateCertainty: row.date_certainty,
        createdAt: row.created_at,
      })),
      message:
        `You have already recorded "${colliding[0]?.title}"` +
        (colliding[0]?.occurred_at_raw ? ` on ${colliding[0].occurred_at_raw}` : "") +
        `. Is this the same thing, a correction, or something else?`,
      // The rule that makes this a singleton, so the prompt is not a bare
      // assertion that only one can exist.
      rule: definition?.rule ?? null,
      ruleQuote: definition?.ruleQuote ?? null,
      resolutions: [
        {
          action: "supersede",
          label: "It is a correction — replace what I recorded",
          send: "supersedesEventId",
        },
        {
          action: "record-anyway",
          label: "It is something else — record both",
          send: "acknowledgedCollision",
        },
        { action: "cancel", label: "Cancel", send: null },
      ],
    },
    { status: 409 },
  );
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "The request is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "A valid request body is required." }, { status: 400 });
  }

  const raw = asRecord(body);
  const caseId = text(raw?.caseId);

  if (!raw || !exactKeys(raw, ALLOWED_KEYS) || !UUID_PATTERN.test(caseId)) {
    return NextResponse.json(
      { error: "A valid selected case and event are required." },
      { status: 400 },
    );
  }

  const parsed = parseEventRequest(raw);
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "The event could not be recorded. An event type from the recorded vocabulary and a " +
          "title are required, and any date must be supplied as a calendar date you selected.",
        // Surfaced so a client can render the picker's options without a second
        // request, and so a bad eventType is diagnosable.
        allowedEventTypes: CASE_EVENT_TYPES.map((definition) => definition.type),
      },
      { status: 400 },
    );
  }

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  const ownedCase = await getAuthenticatedOwnedCase(request, user, caseId);
  if (!ownedCase) {
    return NextResponse.json({ error: "The selected case could not be found." }, { status: 404 });
  }

  // court_path is CHECK-constrained to small-claims on the table. Refusing here
  // too gives the user a sentence instead of a database error string.
  if (ownedCase.court_path !== "small-claims") {
    return NextResponse.json(
      {
        error:
          "Event recording is available for Small Claims cases. The event vocabulary for other " +
          "court paths has not been sourced yet.",
      },
      { status: 400 },
    );
  }

  const supabase = authenticatedClient(request);
  if (!supabase) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  const { data: existingRows, error: readError } = await supabase
    .from("case_events")
    .select(SELECT_COLUMNS)
    .eq("case_id", caseId);

  if (readError) {
    return NextResponse.json({ error: "Could not read the case's events." }, { status: 500 });
  }

  const rows = (existingRows || []) as unknown as CaseEventRow[];

  // ---- The singleton prompt, enforced here rather than trusted to the client ----

  const colliding = existingSingletonEvents(rows, parsed.eventType, isSingletonType).filter(
    (row) => row.id !== parsed.supersedesEventId,
  );

  const resolved = parsed.supersedesEventId !== null || parsed.acknowledgedCollision;

  if (colliding.length > 0 && !resolved) {
    return collisionResponse(parsed, colliding);
  }

  // A correction must point at a live event on THIS case. Checking here rather
  // than relying on the foreign key, which would allow superseding an event
  // belonging to another of the user's cases.
  if (parsed.supersedesEventId) {
    const target = liveCaseEvents(rows).find((row) => row.id === parsed.supersedesEventId);
    if (!target) {
      return NextResponse.json(
        { error: "The event being corrected could not be found on this case." },
        { status: 400 },
      );
    }
  }

  if (parsed.dryRun) {
    return NextResponse.json({ status: "ok", wouldWrite: true });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("case_events")
    .insert({
      case_id: caseId,
      user_id: user.id,
      event_type: parsed.eventType,
      court_path: "small-claims",
      title: parsed.title,
      description: parsed.description,
      occurred_at_raw: parsed.occurredAtRaw,
      occurred_at_normalized: parsed.occurredAtNormalized,
      date_certainty: parsed.dateCertainty,
      scheduled_for_raw: parsed.scheduledForRaw,
      scheduled_for_normalized: parsed.scheduledForNormalized,
      scheduled_for_certainty: parsed.scheduledForCertainty,
      source: parsed.source,
      narrative_basis: parsed.narrativeBasis,
      related_document_id: parsed.relatedDocumentId,
      supersedes_event_id: parsed.supersedesEventId,
    })
    .select(SELECT_COLUMNS)
    .maybeSingle();

  if (insertError || !inserted) {
    // The database's CHECK constraints are the floor and they are NOT
    // duplicated above. A violation here means the request was internally
    // inconsistent in a way only the schema can see — a normalized date with no
    // raw words, say. Return the constraint name so it is diagnosable without
    // leaking the query.
    const constraint = (insertError?.message || "").match(/case_events_[a-z_]+/)?.[0] ?? null;

    return NextResponse.json(
      {
        error: "The event could not be recorded.",
        ...(constraint ? { constraint } : {}),
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ status: "ok", event: inserted }, { status: 201 });
}

/** GET /api/cases/events?caseId=… — the case's live events, newest first. */
export async function GET(request: Request) {
  const caseId = new URL(request.url).searchParams.get("caseId") || "";
  if (!UUID_PATTERN.test(caseId)) {
    return NextResponse.json({ error: "A valid selected case is required." }, { status: 400 });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  const ownedCase = await getAuthenticatedOwnedCase(request, user, caseId);
  if (!ownedCase) {
    return NextResponse.json({ error: "The selected case could not be found." }, { status: 404 });
  }

  const supabase = authenticatedClient(request);
  if (!supabase) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  const { data, error } = await supabase
    .from("case_events")
    .select(SELECT_COLUMNS)
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not read the case's events." }, { status: 500 });
  }

  const rows = (data || []) as unknown as CaseEventRow[];

  // Stage, derived from intake answers AND the events just read. Returned here
  // rather than computed in the client so the basis and the events come from
  // one read of the same rows — a client deriving separately could show a stage
  // and a reason that disagree.
  const masterResult = ownedCase.master_result as Record<string, unknown> | null;
  const intakeFacts = (masterResult?.intakeFacts ?? {}) as Record<string, unknown>;
  const stage = deriveCaseStageWithEvents(intakeFacts as never, rows);

  // Whether the stored analysis has seen these events. Never triggers a
  // recompute — recomputing costs API calls and is the user's decision.
  const freshness = analysisFreshness(masterResult, rows);

  return NextResponse.json({
    // Superseded and retracted rows are returned too, under `all`, because the
    // user was shown things based on them and the record stays auditable.
    events: liveCaseEvents(rows),
    all: rows,
    stage,
    freshness,
    freshnessMessage: freshnessMessage(freshness),
    inconsistencies: findCaseEventInconsistencies(rows),
  });
}
