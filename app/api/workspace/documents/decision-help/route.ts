/**
 * POST /api/workspace/documents/decision-help { documentId }
 *
 * Plain-language help with a court decision the person uploaded to their own
 * case: what the decision is about, and passages that may relate to their
 * situation. Runs only when the person clicks for it, and only when document
 * analysis is switched on (documentAnalysisEnabled: OpenAI Zero Data Retention
 * confirmed AND AI_DOCUMENT_ANALYSIS_ENABLED=true). Otherwise { enabled: false }.
 *
 * What it will never do (courtDecision.ts checkedDecisionHelp):
 *   - show a quote that is not word for word in the uploaded decision;
 *   - say how the person's case will turn out, or grade it (CLAUDE.md s. 3);
 *   - put a name to an anonymised party (CanLII Terms s. 4.3).
 *
 * The decision stays in its owner's case: read with the owner's id, sent to
 * the model with store:false (openaiClient.ts), never logged (the audit row
 * keeps a hash and a length), never saved anywhere else.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";
import { isUuid } from "@/src/lib/case-workspace/storagePaths";
import { documentAnalysisEnabled } from "@/src/lib/case-workspace/aiAnalysis";
import { checkedDecisionHelp, DECISION_SOURCE } from "@/src/lib/case-workspace/courtDecision";
import { COURT_DECISION_TYPE } from "@/src/lib/case-workspace/courtDecisionStore";
import { extractDocumentText } from "@/src/lib/case-workspace/extractText";
import { withAiCallContext } from "@/src/lib/audit/aiCallLog";
import { createOpenAIClient } from "@/src/lib/case-system/openaiClient";
import { modelParams } from "@/src/lib/case-system/aiModels";
import { userStory } from "@/src/lib/case-system/userStory";

export const runtime = "nodejs";

const DOCUMENT_BUCKET = "case-evidence";
const MAX_DECISION_CHARS = 60_000;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

const SYSTEM = `You help a person who is representing themselves in an Ontario court understand a court decision they downloaded from ${DECISION_SOURCE} for their own case.
Return JSON: {"explanation": string, "passages": [{"quote": string, "why": string}]}.
- explanation: 4 to 8 plain sentences on what the case was about, what the court decided and the main reasons, in words a non-lawyer understands.
- passages: up to 5 passages from the decision that relate to the person's situation. "quote" must be copied exactly, word for word, from the decision. "why" says in one plain sentence what the passage is about and how it connects to their situation.
Never say or suggest how the person's own case will turn out, whether they have a good or bad case, or their chances. Never guess at or fill in a name the decision anonymises (initials, redactions), and never connect the decision to real people. If the decision does not relate to their situation, say so plainly.`;

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
    return NextResponse.json({ error: "The text of this decision could not be read. Try a PDF or Word copy from CanLII." }, { status: 422 });
  }

  const { data: owned } = await db.from("cases").select("master_result").eq("id", doc.case_id).eq("user_id", user.id).maybeSingle();
  const story = userStory(((owned?.master_result ?? {}) as { intakeData?: { facts?: unknown; extra?: unknown } }).intakeData).slice(0, 2000);

  const raw = await withAiCallContext({ callType: "decision-help", userId: user.id, caseId: doc.case_id }, async () => {
    const client = createOpenAIClient(process.env.OPENAI_API_KEY ?? "");
    const response = await client.chat.completions.create({
      ...modelParams("standard"),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `The person's situation, in their words:\n${story || "(not given)"}\n\nThe decision:\n${text.slice(0, MAX_DECISION_CHARS)}`,
        },
      ],
    });
    try {
      return JSON.parse(response.choices[0]?.message?.content ?? "null") as unknown;
    } catch {
      return null;
    }
  }).catch(() => null);

  const help = checkedDecisionHelp(raw, text);
  if (!help) return NextResponse.json({ enabled: true, help: null, message: "We could not produce a checked explanation this time." });
  return NextResponse.json({ enabled: true, help });
}
