/**
 * Suggests what a document is, by sending its extracted text to a model.
 *
 * ############################################################################
 * ##  THIS ROUTE REFUSES TODAY AND WILL KEEP REFUSING.                      ##
 * ##  `documentAnalysisEnabled()` is false because `ZDR_CONFIRMED_AT` is    ##
 * ##  null: OpenAI has not confirmed that zero data retention and modified  ##
 * ##  abuse monitoring cover uploaded documents, and as of 2026-09-27 the   ##
 * ##  request has not been sent.                                           ##
 * ############################################################################
 *
 * *** WHY THE CODE EXISTS AT ALL IF IT CANNOT RUN ***
 *
 * Because the design decisions are easier to get right now, under review, than under
 * pressure on the day somebody wants the feature. What may leave, what may come back,
 * what is capped and what is logged are settled here and testable here — the payload
 * builder and the response validator are pure functions, so everything decidable
 * without a model is decided and checked with the flag off.
 *
 * *** THE ORDER OF THE GUARDS IS DELIBERATE ***
 *
 * The flag is checked FIRST, before authentication, before the case lookup, before
 * anything reads a document. A refusal that happens after a database read is a refusal
 * that already touched the data, and this route's whole purpose is not to touch it.
 *
 * *** WHAT A CALLER GETS ***
 *
 * 200 with `enabled: false` and the reason, not an error. A disabled feature is not a
 * fault, and a 500 would send a client into a retry loop against a door that is closed
 * on purpose.
 */

import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { getAuthenticatedUser, getAuthenticatedOwnedCase } from "@/src/lib/supabase/serverAuth";
import { isUuid } from "@/src/lib/case-workspace/storagePaths";
import {
  ANALYSIS_DISABLED_REASON,
  MAX_ANALYSES_PER_CASE_PER_DAY,
  MAX_DOCUMENTS_PER_CALL,
  buildAnalysisPayload,
  documentAnalysisEnabled,
  subjectLineGate,
  validateAnalysis,
  type AnalysisSuggestion,
} from "@/src/lib/case-workspace/aiAnalysis";
import { withAiCallContext, recordAiValidation } from "@/src/lib/audit/aiCallLog";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase server environment variables. Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function refuse(status: number, error: string, detail?: string) {
  return NextResponse.json({ success: false, error, detail }, { status });
}

export async function POST(req: NextRequest) {
  /*
   * *** FIRST, BEFORE ANYTHING ELSE ***
   *
   * Not after authentication, not after the case lookup. Nothing about this request is
   * read until it is established that analysis may happen at all.
   */
  if (!documentAnalysisEnabled()) {
    return NextResponse.json({
      success: true,
      enabled: false,
      reason: ANALYSIS_DISABLED_REASON,
      /*
       * Said explicitly so a client does not treat this as a transient failure and
       * retry. The door is closed on purpose and will stay closed.
       */
      retryable: false,
    });
  }

  /* c8 ignore start — unreachable while the flag is off; see the header. */
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return refuse(401, "Authentication is required.");

    const body = (await req.json()) as { caseId?: string; documentIds?: unknown };

    const caseId = String(body.caseId || "").trim();
    if (!isUuid(caseId)) return refuse(400, "A valid case id is required.");

    const documentIds = Array.isArray(body.documentIds)
      ? body.documentIds.map((id) => String(id)).filter(isUuid)
      : [];

    if (documentIds.length === 0) return refuse(400, "A document id is required.");
    if (documentIds.length > MAX_DOCUMENTS_PER_CALL) {
      return refuse(
        422,
        "Too many documents at once.",
        `Analyse ${MAX_DOCUMENTS_PER_CALL} at a time.`,
      );
    }

    const ownedCase = await getAuthenticatedOwnedCase(req, user, caseId);
    if (!ownedCase) return refuse(404, "Case not found.");

    const supabase = getSupabaseAdmin();

    /*
     * The daily cap, counted before any call. A loop that re-analyses a whole case file
     * is the shape of accident this exists for.
     */
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("workspace_documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("case_id", caseId)
      .gte("analysed_at", since);

    if ((count ?? 0) >= MAX_ANALYSES_PER_CASE_PER_DAY) {
      return refuse(
        429,
        "This case has been analysed enough for today.",
        `The limit is ${MAX_ANALYSES_PER_CASE_PER_DAY} documents a day.`,
      );
    }

    const documentId = documentIds[0];

    const { data: document } = await supabase
      .from("workspace_documents")
      .select("id,original_name,storage_path")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .eq("case_id", caseId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!document) return refuse(404, "Document not found.");

    const { data: textRow } = await supabase
      .from("workspace_document_text")
      .select("extracted_text")
      .eq("document_id", documentId)
      .eq("user_id", user.id)
      .maybeSingle();

    const forbidden = {
      extractedText: textRow?.extracted_text ?? null,
      originalName: document.original_name,
      storagePath: document.storage_path,
      userId: user.id,
      caseId,
    };

    const built = buildAnalysisPayload(forbidden);
    if (!built.ok) {
      return refuse(422, "There is nothing to analyse.", built.reason);
    }

    /*
     * The last thing before the call. If this ever fires, something upstream has grown
     * a field it should not have, and the call does not happen.
     */
    const gate = subjectLineGate(built.payload, forbidden);
    if (!gate.ok) {
      console.error(
        `workspace analyse: payload gate REFUSED — ${gate.leaked} would have been sent`,
      );
      return refuse(
        500,
        "CourtSimplified stopped this request to protect your document.",
        "Nothing was sent.",
      );
    }

    const suggestion = await withAiCallContext(
      { callType: "small-claims-analysis", userId: user.id, caseId },
      async (): Promise<AnalysisSuggestion | null> => {
        /*
         * The model call goes here. It is deliberately not written: writing it would
         * mean choosing a prompt and a client for a flow whose terms are not agreed,
         * and the next person would find a call that looks ready and reach for the
         * switch. Everything AROUND it — what may leave, what may come back, the caps,
         * the audit context — is settled and tested.
         */
        recordAiValidation("error", "no model call is wired while the flag is off");
        return null;
      },
    );

    if (!suggestion) {
      return refuse(501, "Document analysis is not wired yet.", ANALYSIS_DISABLED_REASON);
    }

    const validated = validateAnalysis(suggestion);
    if (!validated.ok) {
      recordAiValidation("invalid", validated.reason);
      return refuse(502, "That suggestion could not be used.", validated.reason);
    }

    /*
     * Returned as a SUGGESTION. Nothing is written to the document here — §4, and the
     * PATCH route is the only thing in this product that records what a document is.
     */
    return NextResponse.json({
      success: true,
      enabled: true,
      documentId,
      suggestion: validated.suggestion,
      truncated: built.payload.truncated,
      boundary:
        "Suggestions describe what a document is. They never say whether it helps your case.",
    });
  } catch (error) {
    console.error("workspace analyse error:", error);
    return refuse(500, "CourtSimplified could not analyse this document.");
  }
  /* c8 ignore stop */
}
