import { NextResponse } from "next/server";

import { caseFileFromMasterResult } from "@/src/lib/case-system/caseReview/caseReview";
import { runCaseReview } from "@/src/lib/case-system/caseReview/runCaseReview";
import { hasConfiguredServerAi } from "@/src/lib/case-system/intelligence/serverAiConfiguration";
import { getAuthenticatedOwnedCase, getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";

/**
 * Case review for a saved case the signed-in user owns.
 *
 * The case is read server-side from its owner's record -- the client sends only
 * the case id, so what is reviewed is what the user saved, not whatever a
 * request body claims. Names and addresses are read for the deterministic
 * checks and never sent to the model: caseFileText() carries only the story,
 * timeline, amount, evidence and goal text.
 */

export const runtime = "nodejs";

const MAX_CASE_ID_LENGTH = 100;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "A case id is required." }, { status: 400 });
  }
  const caseId =
    body && typeof body === "object" && typeof (body as { caseId?: unknown }).caseId === "string"
      ? ((body as { caseId: string }).caseId)
      : "";
  if (!caseId || caseId.length > MAX_CASE_ID_LENGTH) {
    return NextResponse.json({ ok: false, error: "A case id is required." }, { status: 400 });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }
  const owned = await getAuthenticatedOwnedCase(request, user, caseId);
  if (!owned) {
    return NextResponse.json({ ok: false, error: "Case not found." }, { status: 404 });
  }

  try {
    const file = caseFileFromMasterResult(owned.master_result, owned.court_path);
    const apiKey = hasConfiguredServerAi() ? process.env.OPENAI_API_KEY || null : null;
    const result = await runCaseReview(file, apiKey);
    return NextResponse.json({ ok: true, result });
  } catch {
    console.error("Case review route failed.");
    return NextResponse.json({ ok: false, error: "The case review could not run right now." }, { status: 500 });
  }
}
