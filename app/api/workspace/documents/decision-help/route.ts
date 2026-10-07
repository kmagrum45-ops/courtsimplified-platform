/**
 * POST /api/workspace/documents/decision-help { documentId }
 *
 * Plain-language help with a court decision the person uploaded to their own
 * case: what the decision is about, and passages from it that may relate to
 * their situation. Runs only when the person clicks for it, and only when
 * document analysis is switched on (documentAnalysisEnabled: OpenAI Zero Data
 * Retention confirmed AND AI_DOCUMENT_ANALYSIS_ENABLED=true). Otherwise it
 * answers { enabled: false } and no model is called.
 *
 * What it will never show (courtDecision.ts checkedDecisionHelp):
 *   - a quote that is not word for word in the uploaded decision (the same
 *     check library quotes pass, quoteMatch.ts);
 *   - anything saying how the person's case will turn out, or grading it
 *     (CLAUDE.md s. 3);
 *   - a name the decision does not itself contain: no filling in initials or
 *     redactions, no connecting it to real people (CanLII Terms s. 4.3).
 *
 * The decision stays in its owner's case: read with the owner's id from their
 * own case, sent with store:false (openaiClient.ts), never logged (the audit
 * row keeps a hash and a length, aiCallLog.ts), never saved anywhere else.
 * The model call itself is in src/lib/case-workspace/decisionHelp.ts, so no
 * workspace route imports a model client (test:workspace-upload).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { readCaseRecord } from "@/src/lib/case-system/caseRecord";
import { documentAnalysisEnabled } from "@/src/lib/case-workspace/aiAnalysis";
import { COURT_DECISION_TYPE } from "@/src/lib/case-workspace/courtDecision";
import { askDecisionHelp } from "@/src/lib/case-workspace/decisionHelp";
import { extractDocumentText } from "@/src/lib/case-workspace/extractText";
import { DOCUMENT_BUCKET, isUuid } from "@/src/lib/case-workspace/storagePaths";
import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";

export const runtime = "nodejs";

/** Help requests per person per day; each is one model call. */
const MAX_PER_DAY = 10;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}


export async function POST(req: NextRequest) {
  if (!documentAnalysisEnabled()) return NextResponse.json({ enabled: false });
  const user = await getAuthenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { documentId?: unknown };
  const documentId = String(body.documentId ?? "");
  if (!isUuid(documentId)) return NextResponse.json({ error: "A valid document is required." }, { status: 400 });

  const db = admin();
  if (!db) return NextResponse.json({ error: "Not available right now." }, { status: 503 });

  // The owner's own decision, nothing else.
  const { data: doc } = await db
    .from("workspace_documents")
    .select("id,case_id,storage_path,mime,user_type")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!doc || doc.user_type !== COURT_DECISION_TYPE) {
    return NextResponse.json({ error: "Mark the document as a court decision first." }, { status: 404 });
  }

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await db
    .from("ai_call_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("call_type", "decision-help")
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_DAY) {
    return NextResponse.json({ error: `Help with decisions is limited to ${MAX_PER_DAY} a day. Please try again tomorrow.` }, { status: 429 });
  }

  let text = "";
  const { data: stored } = await db
    .from("workspace_document_text")
    .select("extracted_text")
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();
  text = stored?.extracted_text ?? "";
  if (!text) {
    const { data: file } = await db.storage.from(DOCUMENT_BUCKET).download(doc.storage_path);
    if (file) {
      const outcome = await extractDocumentText(doc.mime, new Uint8Array(await file.arrayBuffer()));
      if (outcome.status === "done") text = outcome.text;
    }
  }
  if (text.trim().length < 200) {
    return NextResponse.json(
      { error: "The text of this decision could not be read. Try the PDF or Word copy from CanLII." },
      { status: 422 },
    );
  }

  const { data: owned } = await db
    .from("cases")
    .select("master_result,court_path")
    .eq("id", doc.case_id)
    .eq("user_id", user.id)
    .maybeSingle();
  const story = owned ? readCaseRecord(owned.master_result, owned.court_path).story : "";

  // The model call and every check on its answer (decisionHelp.ts, courtDecision.ts checkedDecisionHelp).
  const help = await askDecisionHelp({ userId: user.id, caseId: doc.case_id, story, decisionText: text });

  if (!help) {
    return NextResponse.json({ enabled: true, help: null, message: "We could not produce a checked explanation this time." });
  }
  return NextResponse.json({ enabled: true, help });
}
