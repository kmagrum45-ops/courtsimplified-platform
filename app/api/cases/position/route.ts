/**
 * POST /api/cases/position: records where the user says their case is.
 *
 * In:  { caseId, confirmedStage?, stepId?, dateAnswers?, service? }
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

  const supabase = authenticatedClient(request);
  if (!supabase) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  /*
   * READ, CHANGE, WRITE -- ONLY IF NOTHING ELSE WROTE IN BETWEEN (2026-10-13).
   * Two saves at the same moment both read the case before either wrote, and
   * the second erased the first (a confirmed stage lost to a date save). The
   * write now goes through only if the case's updated_at is still the one we
   * read; if another save got there first, we read again and re-apply this
   * change on top. Three tries, then the person is told it didn't save.
   */
  let position: ReturnType<typeof readCasePosition> | null = null;
  for (let attempt = 0; attempt < 3 && !position; attempt += 1) {
    const { data: fresh, error: readError } = await supabase
      .from("cases")
      .select("master_result,updated_at")
      .eq("id", caseId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (readError || !fresh) return NextResponse.json({ error: "The selected case could not be found." }, { status: 404 });
    const master = (fresh.master_result && typeof fresh.master_result === "object" ? fresh.master_result : {}) as Record<string, unknown>;
    const result = applyPositionPatch(
      readCasePosition(master, ownedCase.court_path),
      { confirmedStage: body.confirmedStage, confirmedStageFrom: body.confirmedStageFrom, stepId: body.stepId, dateAnswers: body.dateAnswers, service: body.service },
      ownedCase.court_path,
      new Date(),
    );
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    let write = supabase
      .from("cases")
      .update({ master_result: { ...master, position: result.position }, updated_at: new Date().toISOString() })
      .eq("id", caseId)
      .eq("user_id", user.id);
    if (fresh.updated_at) write = write.eq("updated_at", fresh.updated_at);
    const { data: written, error } = await write.select("id");
    if (error) return NextResponse.json({ error: "Could not save that." }, { status: 500 });
    if (Array.isArray(written) && written.length > 0) position = result.position;
  }
  if (!position) return NextResponse.json({ error: "Could not save that just now. Please try again." }, { status: 409 });

  return NextResponse.json({ position });
}
