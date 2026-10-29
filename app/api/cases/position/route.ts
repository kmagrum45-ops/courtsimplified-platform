/**
 * POST /api/cases/position: records where the user says their case is.
 *
 * In:  { caseId, confirmedStage?, confirmedStageFrom?, motionToChange?, stepId?, dateAnswers?, service?, claimKind?, defendants? }
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

import { applyPositionPatch, fullDayIn, readCasePosition } from "../../../../src/lib/case-system/casePosition";
import { caseFileOf, withoutCaseFileDates } from "../../../../src/lib/case-system/caseFile/caseFile";
import { readCheckpoint } from "../../../../src/lib/case-system/intakeCheckpoint";
import { updateMasterResult, type CaseRecordClient } from "../../../../src/lib/case-system/updateCaseRecord";
import { UUID_PATTERN } from "../../../../src/lib/case-system/events/caseEventRequest";
import { getAuthenticatedOwnedCase, getAuthenticatedUser } from "../../../../src/lib/supabase/serverAuth";
import { situationOfCase, withoutSituationDates } from "../../../../src/lib/case-system/situation/situation";

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
  // One shared save path for the case record (updateCaseRecord.ts, 2026-10-14
  // audit): the same guarded read-change-write, with a short pause between
  // retries, instead of this route's own copy of it.
  const patch = { confirmedStage: body.confirmedStage, confirmedStageFrom: body.confirmedStageFrom, motionToChange: body.motionToChange, stepId: body.stepId, dateAnswers: body.dateAnswers, service: body.service, claimKind: body.claimKind, defendants: body.defendants };
  const saved = await updateMasterResult(
    supabase as unknown as CaseRecordClient,
    { caseId, userId: user.id },
    (master) => {
      const result = applyPositionPatch(readCasePosition(master, ownedCase.court_path), patch, ownedCase.court_path, new Date());
      // The situation's own date is read over the position, never written into it (situation.ts).
      // Nor a day the case file holds from another answer (caseFile.ts): it is read over the position too.
      const before = readCasePosition(master, ownedCase.court_path).dateAnswers;
      const court = ownedCase.court_path === "small-claims" || ownedCase.court_path === "civil" || ownedCase.court_path === "family" ? ownedCase.court_path : null;
      const file = caseFileOf(court ? readCheckpoint((master as Record<string, unknown>).intakeCheckpoint, court) : null, { ...(master as Record<string, unknown>), position: undefined });
      return result.ok ? { ...master, position: { ...result.position, dateAnswers: withoutCaseFileDates(withoutSituationDates(result.position.dateAnswers, ownedCase.court_path, situationOfCase(master)), before, file, fullDayIn) } } : { reject: result.error };
    },
    3,
  );
  if (!saved.ok) {
    if (saved.reason === "rejected") return NextResponse.json({ error: saved.error }, { status: 400 });
    if (saved.reason === "not-found") return NextResponse.json({ error: "The selected case could not be found." }, { status: 404 });
    if (saved.reason === "conflict") return NextResponse.json({ error: "Could not save that just now. Please try again." }, { status: 409 });
    return NextResponse.json({ error: "Could not save that." }, { status: 500 });
  }
  const position = readCasePosition(saved.master, ownedCase.court_path);

  return NextResponse.json({ position });
}
