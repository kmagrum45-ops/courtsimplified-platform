/**
 * GET  /api/cases/event-candidates — what the parser suggested, and what the
 *      user has already said about each.
 * POST /api/cases/event-candidates — dismiss a candidate, or restore one.
 *
 * A candidate is NOT an event. It is a sentence from the user's own intake
 * narrative that might describe a procedural event. Confirming one writes a
 * case_events row through POST /api/cases/events with
 * source: "confirmed-from-narrative" and the sentence in narrative_basis —
 * this route does not write events.
 *
 * WHAT THIS ROUTE STORES: dismissals only.
 *
 *   confirmed  -> a case_events row exists carrying the same sentence
 *   dismissed  -> a live dismissal row exists here
 *   unanswered -> neither, and NOTHING IS STORED
 *
 * There is deliberately nowhere to record "the user didn't answer". Silence is
 * not "no", and a candidate the user skipped must stay answerable indefinitely.
 * Making that a property of the schema rather than of anyone's care is the
 * whole point — there is no expiry, no sweep, and no bulk "reviewed" marker,
 * because any of those would convert silence into an answer.
 *
 * CANDIDATES CARRY NO PROCEDURAL TYPE. The narrative parser produces a title, a
 * description and the source sentence; it does not classify into the
 * O. Reg. 258/98 vocabulary and should not. The user chooses the type when they
 * confirm. That is why the fingerprint is over the sentence alone.
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import {
  candidateFingerprint,
  candidatesFromTimeline,
  resolveCandidates,
  type CandidateDismissalRow,
} from "../../../../src/lib/case-system/events/caseEventCandidates";
import { type CaseEventRow } from "../../../../src/lib/case-system/events/caseEventAdapter";
import {
  UUID_PATTERN,
  optionalText,
  text,
} from "../../../../src/lib/case-system/events/caseEventRequest";
import {
  getAuthenticatedOwnedCase,
  getAuthenticatedUser,
} from "../../../../src/lib/supabase/serverAuth";

const MAX_REQUEST_BYTES = 8_000;
const ALLOWED_KEYS = ["caseId", "action", "narrativeBasis", "dismissalId"];

const EVENT_COLUMNS =
  "id,case_id,event_type,court_path,title,description," +
  "occurred_at_raw,occurred_at_normalized,date_certainty," +
  "scheduled_for_raw,scheduled_for_normalized,scheduled_for_certainty," +
  "source,narrative_basis,related_document_id,supersedes_event_id," +
  "retracted_at,created_at";

const DISMISSAL_COLUMNS =
  "id,case_id,candidate_fingerprint,narrative_basis,suggested_event_type," +
  "dismissed_at,restored_at";

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

async function loadCase(request: Request, caseId: string) {
  const user = await getAuthenticatedUser(request);
  if (!user) return { error: "Authentication is required.", status: 401 } as const;

  const ownedCase = await getAuthenticatedOwnedCase(request, user, caseId);
  if (!ownedCase) {
    return { error: "The selected case could not be found.", status: 404 } as const;
  }

  const supabase = authenticatedClient(request);
  if (!supabase) return { error: "Authentication is required.", status: 401 } as const;

  return { user, ownedCase, supabase } as const;
}

export async function GET(request: Request) {
  const caseId = new URL(request.url).searchParams.get("caseId") || "";
  if (!UUID_PATTERN.test(caseId)) {
    return NextResponse.json({ error: "A valid selected case is required." }, { status: 400 });
  }

  const loaded = await loadCase(request, caseId);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  const masterResult = asRecord(loaded.ownedCase.master_result);
  const candidates = candidatesFromTimeline(masterResult?.timeline);

  const [{ data: eventRows }, { data: dismissalRows }] = await Promise.all([
    loaded.supabase.from("case_events").select(EVENT_COLUMNS).eq("case_id", caseId),
    loaded.supabase
      .from("case_event_candidate_dismissals")
      .select(DISMISSAL_COLUMNS)
      .eq("case_id", caseId),
  ]);

  const resolved = resolveCandidates(
    candidates,
    (eventRows || []) as unknown as CaseEventRow[],
    (dismissalRows || []) as unknown as CandidateDismissalRow[],
  );

  return NextResponse.json({
    // Everything, with its state, so the surface can show what was already
    // decided as well as what still needs an answer.
    candidates: resolved,
    awaitingAnswer: resolved.filter((candidate) => candidate.state === "unanswered").length,
    // Said in the response rather than left to the client to phrase, because
    // getting it wrong is how silence becomes "no".
    note:
      "Candidates you do not answer stay here. Nothing expires, and not answering is not " +
      "recorded as a no.",
  });
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
  const action = text(raw?.action);

  if (
    !raw ||
    !exactKeys(raw, ALLOWED_KEYS) ||
    !UUID_PATTERN.test(caseId) ||
    (action !== "dismiss" && action !== "restore")
  ) {
    return NextResponse.json(
      { error: "A valid selected case and an action of 'dismiss' or 'restore' are required." },
      { status: 400 },
    );
  }

  const loaded = await loadCase(request, caseId);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  // ---- Restore: reverse a dismissal, recorded rather than deleted ----

  if (action === "restore") {
    const dismissalId = optionalText(raw.dismissalId);
    if (!dismissalId || !UUID_PATTERN.test(dismissalId)) {
      return NextResponse.json(
        { error: "The dismissal to restore is required." },
        { status: 400 },
      );
    }

    const { data, error } = await loaded.supabase
      .from("case_event_candidate_dismissals")
      .update({ restored_at: new Date().toISOString() })
      .eq("id", dismissalId)
      .eq("case_id", caseId)
      .is("restored_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "The dismissal could not be restored." }, { status: 500 });
    }
    if (!data?.id) {
      return NextResponse.json(
        { error: "That dismissal could not be found, or it has already been restored." },
        { status: 404 },
      );
    }

    return NextResponse.json({ status: "restored", dismissalId: data.id });
  }

  // ---- Dismiss ----

  const narrativeBasis = optionalText(raw.narrativeBasis);
  if (!narrativeBasis) {
    return NextResponse.json(
      {
        error:
          "The sentence being dismissed is required. Dismissals are keyed on the sentence, " +
          "not on a candidate id, because candidate ids are regenerated on every parse.",
      },
      { status: 400 },
    );
  }

  const fingerprint = candidateFingerprint(narrativeBasis);

  const { data, error } = await loaded.supabase
    .from("case_event_candidate_dismissals")
    .insert({
      case_id: caseId,
      user_id: loaded.user.id,
      candidate_fingerprint: fingerprint,
      narrative_basis: narrativeBasis,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // The partial unique index means a second live dismissal of the same
    // sentence conflicts. Dismissing twice is the same dismissal, not an error
    // worth surfacing as a failure.
    if ((error.code || "") === "23505") {
      return NextResponse.json({ status: "dismissed", alreadyDismissed: true });
    }
    return NextResponse.json({ error: "The candidate could not be dismissed." }, { status: 500 });
  }

  return NextResponse.json({ status: "dismissed", dismissalId: data?.id ?? null }, { status: 201 });
}
