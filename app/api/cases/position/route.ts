/**
 * POST /api/cases/position: records where the user says their case is.
 *
 * In:  { caseId, confirmedStage?, stepId?, dateAnswers? }
 * Out: { position } or { error }
 *
 * Writes `master_result.position` and nothing else in master_result. Every
 * value is validated by applyPositionPatch (src/lib/case-system/casePosition.ts)
 * against the fixed vocabularies, and the whole patch is refused if any part is
 * invalid. Only the bearer-authenticated owner can write, through their own
 * token, so the database's row-level security applies as well.
 *
 * WHY A ROUTE AND NOT A CLIENT UPDATE. master_result is one JSON column; a
 * client writing it whole would overwrite whatever another tab saved since it
 * last read. This reads the row, changes one key, and writes it back.
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { applyPositionPatch, readCasePosition } from "../../../../src/lib/case-system/casePosition";
import { UUID_PATTERN } from "../../../../src/lib/case-system/events/caseEventRequest";
import { getAuthenticatedOwnedCase, getAuthenticatedUser } from "../../../../src/lib/supabase/serverAuth";

const MAX_REQUEST_BYTES = 4_000;

function authenticatedClient(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return url && key && token
    ? createClient(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  if (!UUID_PATTERN.test(caseId)) {
    return NextResponse.json({ error: "A valid selected case is required." }, { status: 400 });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  const ownedCase = await getAuthenticatedOwnedCase(request, user, caseId);
  if (!ownedCase) return NextResponse.json({ error: "The selected case could not be found." }, { status: 404 });

  const current = readCasePosition(ownedCase.master_result, ownedCase.court_path);
  const result = applyPositionPatch(
    current,
    { confirmedStage: body.confirmedStage, stepId: body.stepId, dateAnswers: body.dateAnswers },
    ownedCase.court_path,
    new Date(),
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const supabase = authenticatedClient(request);
  if (!supabase) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  const master = (ownedCase.master_result && typeof ownedCase.master_result === "object"
    ? ownedCase.master_result
    : {}) as Record<string, unknown>;

  const { error } = await supabase
    .from("cases")
    .update({ master_result: { ...master, position: result.position }, updated_at: new Date().toISOString() })
    .eq("id", caseId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: "Could not save that." }, { status: 500 });

  return NextResponse.json({ position: result.position });
}
