/**
 * Saves and deletes the user's drafts on their case (`master_result.drafts`).
 *
 * POST   { caseId, draft }    creates or replaces that draft; returns { draft }
 * DELETE { caseId, draftId }  removes it
 *
 * Every draft is checked by validateDraft (src/lib/case-system/drafts/
 * caseDrafts.ts) and refused whole if any part is invalid. Only the
 * bearer-authenticated owner can write, through their own token, so row-level
 * security applies as well. Like /api/cases/position, it changes one key of
 * master_result and writes the rest back as it found it.
 */

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { readCaseDrafts, upsertDraft, validateDraft } from "../../../../src/lib/case-system/drafts/caseDrafts";
import { UUID_PATTERN } from "../../../../src/lib/case-system/events/caseEventRequest";
import { getAuthenticatedOwnedCase, getAuthenticatedUser } from "../../../../src/lib/supabase/serverAuth";

// A full draft can be large: 60 parts of up to 20,000 characters is the most
// validateDraft accepts, so the body limit sits just above that.
const MAX_REQUEST_BYTES = 1_300_000;

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

async function readBody(request: Request): Promise<Record<string, unknown> | NextResponse> {
  const raw = await request.text();
  if (raw.length > MAX_REQUEST_BYTES) return NextResponse.json({ error: "That draft is too large to save." }, { status: 413 });
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
}

async function ownedCaseFor(request: Request, body: Record<string, unknown>) {
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  if (!UUID_PATTERN.test(caseId)) {
    return { error: NextResponse.json({ error: "A valid selected case is required." }, { status: 400 }) };
  }
  const user = await getAuthenticatedUser(request);
  if (!user) return { error: NextResponse.json({ error: "Authentication is required." }, { status: 401 }) };
  const ownedCase = await getAuthenticatedOwnedCase(request, user, caseId);
  if (!ownedCase) return { error: NextResponse.json({ error: "The selected case could not be found." }, { status: 404 }) };
  const supabase = authenticatedClient(request);
  if (!supabase) return { error: NextResponse.json({ error: "Authentication is required." }, { status: 401 }) };
  return { caseId, user, ownedCase, supabase };
}

function masterOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export async function POST(request: Request) {
  const body = await readBody(request);
  if (body instanceof NextResponse) return body;
  const owned = await ownedCaseFor(request, body);
  if ("error" in owned) return owned.error;

  const checked = validateDraft(body.draft, new Date());
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  const master = masterOf(owned.ownedCase.master_result);
  const updated = upsertDraft(readCaseDrafts(master), checked.draft);
  if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: 400 });

  const { error } = await owned.supabase
    .from("cases")
    .update({ master_result: { ...master, drafts: updated.drafts }, updated_at: new Date().toISOString() })
    .eq("id", owned.caseId)
    .eq("user_id", owned.user.id);
  if (error) return NextResponse.json({ error: "Could not save the draft." }, { status: 500 });

  return NextResponse.json({ draft: checked.draft });
}

export async function DELETE(request: Request) {
  const body = await readBody(request);
  if (body instanceof NextResponse) return body;
  const owned = await ownedCaseFor(request, body);
  if ("error" in owned) return owned.error;

  const draftId = typeof body.draftId === "string" ? body.draftId : "";
  const master = masterOf(owned.ownedCase.master_result);
  const remaining = readCaseDrafts(master).filter((draft) => draft.id !== draftId);

  const { error } = await owned.supabase
    .from("cases")
    .update({ master_result: { ...master, drafts: remaining }, updated_at: new Date().toISOString() })
    .eq("id", owned.caseId)
    .eq("user_id", owned.user.id);
  if (error) return NextResponse.json({ error: "Could not delete the draft." }, { status: 500 });

  return NextResponse.json({ deleted: draftId });
}
