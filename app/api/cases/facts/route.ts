/**
 * POST /api/cases/facts: the one server route that saves facts into the case's fact record
 * (case core G0, "the rails"; CASE_CORE_DESIGN.md §12).
 *
 * In:  { caseId, facts: [{ fact, state, value?, source?, question?, seenSeq?, force? }] }
 * Out: { saved: [{ fact, seq, at }], conflicts: [{ fact, stored, sent }], facts } or { error }
 *
 * The browser never sends a seq or an ordering time (a write naming either is refused,
 * factRecord.ts readFactWrites). The route checks the signed-in owner and case
 * (getAuthenticatedOwnedCase), then factSave.ts saveFactWrites re-reads the row, assigns each accepted
 * write seq = the highest stored seq + 1 and the server's time, and writes only if `updated_at` is
 * unchanged, retrying from the new row when another save landed first. So the order of facts is the
 * order the server accepted the saves. A write made against an older view of a fact (`seenSeq` behind
 * the stored seq) is a conflict for that fact only: returned, not applied; the others are saved.
 *
 * Where it writes: `master_result.intakeCheckpoint.sections.caseFile.facts` and nothing else; no
 * table or column change, so no migration. It writes with the person's own token, so the database's
 * row-level security applies as well as the ownership check (as /api/cases/position does).
 *
 * G0: no screen calls this yet, and no reader reads `caseFile.facts` yet.
 */
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { readFactWrites } from "../../../../src/lib/case-system/caseFile/factRecord";
import { intakeCourtOfRow, saveFactWrites } from "../../../../src/lib/case-system/caseFile/factSave";
import type { CaseRecordClient } from "../../../../src/lib/case-system/updateCaseRecord";
import { UUID_PATTERN } from "../../../../src/lib/case-system/events/caseEventRequest";
import { getAuthenticatedOwnedCase, getAuthenticatedUser } from "../../../../src/lib/supabase/serverAuth";

const MAX_REQUEST_BYTES = 64_000;
const NO_INTAKE = "This case has no intake to save facts into.";

function authenticatedClient(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const token = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return url && key && token
    ? createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } })
    : null;
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_REQUEST_BYTES) return NextResponse.json({ error: "Request too large." }, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  if (!UUID_PATTERN.test(caseId)) return NextResponse.json({ error: "A valid selected case is required." }, { status: 400 });
  const read = readFactWrites(body);
  if (!read.ok) return NextResponse.json({ error: read.error }, { status: 400 });

  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  // Ownership before any write: only the case's id and court are read here.
  const ownedCase = await getAuthenticatedOwnedCase(request, user, caseId, { masterKeys: [] });
  if (!ownedCase) return NextResponse.json({ error: "The selected case could not be found." }, { status: 404 });
  const court = intakeCourtOfRow(ownedCase);
  if (!court) return NextResponse.json({ error: NO_INTAKE }, { status: 409 });
  const supabase = authenticatedClient(request);
  if (!supabase) return NextResponse.json({ error: "Authentication is required." }, { status: 401 });

  const outcome = await saveFactWrites(supabase as unknown as CaseRecordClient, { caseId, userId: user.id, court }, read.writes);
  if (outcome.ok) return NextResponse.json({ saved: outcome.saved, conflicts: outcome.conflicts, facts: outcome.facts });
  if (outcome.reason === "no-intake-checkpoint") return NextResponse.json({ error: NO_INTAKE }, { status: 409 });
  if (outcome.reason === "rejected") return NextResponse.json({ error: outcome.error }, { status: 400 });
  if (outcome.reason === "not-found") return NextResponse.json({ error: "The selected case could not be found." }, { status: 404 });
  if (outcome.reason === "conflict") return NextResponse.json({ error: "Could not save that just now. Please try again." }, { status: 409 });
  return NextResponse.json({ error: "Could not save that." }, { status: 500 });
}
