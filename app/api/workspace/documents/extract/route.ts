/**
 * Extracts the text of one uploaded document, and scans it for personal data.
 *
 * *** WHY THIS IS A SEPARATE REQUEST AND NOT PART OF THE UPLOAD ***
 *
 * Measured, not assumed: a real 500 KB Supreme Court decision took 2.1 to 6.4
 * seconds to parse. A 25 MB scan is a different proposition again. Doing that inside
 * the register request would mean an upload that appears to hang, and on a platform
 * with a function timeout, an upload that fails for a reason the user cannot act on
 * — while the file itself was already stored perfectly well.
 *
 * So registering a document and reading it are two requests. A document with
 * `extraction_status: 'pending'` is complete and usable: it can be labelled, dated,
 * given an exhibit number and put in a chronology. Text is an enhancement, not a
 * precondition.
 *
 * *** THE STALE-TAKEOVER RULE, WHICH IS THE WHOLE REASON THIS IS NOT TRIVIAL ***
 *
 * A function killed mid-parse leaves `extraction_status = 'running'` with nothing
 * running. Retrying blindly would run two extractions over one document; refusing
 * to retry would strand it forever. So a 'running' row is taken over only when
 * `extraction_started_at` is older than STALE_AFTER_MS, and `extraction_attempts`
 * caps how often a document that kills the function can do it again.
 *
 * *** NO MODEL IS CALLED HERE, AND THAT IS THE POINT OF THE FILE ***
 *
 * This route reads the most sensitive bytes in the product. It calls no model,
 * imports no model client, and sends nothing anywhere. Extraction is local parsing
 * and a regex scan. The AI work in Part 4 reads `workspace_document_text` behind
 * `AI_DOCUMENT_ANALYSIS_ENABLED`; it does not live here.
 */

import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { getAuthenticatedUser, getAuthenticatedOwnedCase } from "@/src/lib/supabase/serverAuth";
import { extractDocumentText } from "@/src/lib/case-workspace/extractText";
import { scanForPersonalData } from "@/src/lib/case-workspace/personalDataScan";
import { DOCUMENT_BUCKET, isUuid } from "@/src/lib/case-workspace/storagePaths";

export const runtime = "nodejs";

/*
 * Long enough that a slow-but-live parse is never interrupted, short enough that a
 * user who reloads a minute later is not told to wait again. The 6.4 s measurement
 * above is the floor this has to clear by a wide margin.
 */
const STALE_AFTER_MS = 5 * 60 * 1000;

/*
 * A document that kills the function will kill it again. Three attempts, then it
 * stays 'failed' and the user is told it cannot be read — which is a true statement
 * and a better outcome than an endless spinner.
 */
const MAX_ATTEMPTS = 3;

/** Text stored per document. A 25 MB PDF of dense text can exceed what is useful. */
const MAX_STORED_CHARS = 1_000_000;

/** Below this mean confidence the document goes to 'needs-details'. Mirrors
 *  LOW_CONFIDENCE in src/lib/case-workspace/clientOcr.ts, and
 *  test:workspace-ocr asserts the two agree. */
const LOW_OCR_CONFIDENCE = 70;

/**
 * A ceiling on client-supplied OCR text.
 *
 * Separate from MAX_STORED_CHARS and much smaller, because this text arrives in a
 * REQUEST BODY rather than being read from an object we already hold. A megabyte of
 * server-parsed text is fine; a megabyte of JSON from a browser is a different
 * thing to accept on trust.
 */
const MAX_CLIENT_OCR_CHARS = 200_000;

type ExtractRequestBody = {
  caseId?: string;
  documentId?: string;
  /**
   * Text the USER'S BROWSER read out of an image, with tesseract.
   *
   * *** THIS IS UNTRUSTED INPUT AND IS NOT TREATED AS OUR EXTRACTION ***
   *
   * Everything in it is under the control of whoever is using the browser. So the
   * text is length-capped, the confidence is range-checked and clamped, the method
   * is recorded as `client-ocr` rather than as something the server read, and the
   * personal-data scan is run HERE over the received text rather than trusting any
   * scan the client claims to have done.
   *
   * It is accepted at all because the alternative for a photographed receipt is no
   * text whatsoever, and because it is the user's own document: the risk they take
   * by sending bad text about it is to their own case file, which they can see and
   * correct. It is never treated as authoritative — see the 'needs-details' status.
   */
  clientOcr?: {
    text?: unknown;
    confidence?: unknown;
    language?: unknown;
    pagesRead?: unknown;
    truncated?: unknown;
  };
};

type AcceptedClientOcr = {
  text: string;
  confidence: number;
  language: string;
  truncated: boolean;
};

/** Validates and clamps a client OCR payload, or returns null if unusable. */
function acceptClientOcr(raw: ExtractRequestBody["clientOcr"]): AcceptedClientOcr | null {
  if (!raw || typeof raw !== "object") return null;

  const text = typeof raw.text === "string" ? raw.text.trim() : "";

  /*
   * Empty text is rejected outright rather than stored with a low confidence. An
   * empty success is the exact failure Part 2 was built to avoid, and it would be no
   * better for arriving from a browser.
   */
  if (text.length === 0) return null;

  const confidenceRaw = Number(raw.confidence);
  /*
   * A missing or nonsensical confidence is treated as ZERO, not as good. Zero sends
   * the document to 'needs-details', which asks the user to check it — the safe
   * direction. Defaulting to a high number would let a client skip the review step
   * by simply omitting the field.
   */
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.min(100, Math.max(0, confidenceRaw))
    : 0;

  return {
    text: text.length > MAX_CLIENT_OCR_CHARS ? text.slice(0, MAX_CLIENT_OCR_CHARS) : text,
    confidence,
    // Not free text: an arbitrary string here would end up in a query filter.
    language: raw.language === "eng+fra" || raw.language === "eng" || raw.language === "fra"
      ? raw.language
      : "unknown",
    truncated: raw.truncated === true,
  };
}

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
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return refuse(401, "Authentication is required.");

    const body: ExtractRequestBody = await req.json();

    const caseId = String(body.caseId || "").trim();
    const documentId = String(body.documentId || "").trim();

    if (!isUuid(caseId)) return refuse(400, "A valid case id is required.");
    if (!isUuid(documentId)) return refuse(400, "A valid document id is required.");

    const ownedCase = await getAuthenticatedOwnedCase(req, user, caseId);
    if (!ownedCase) return refuse(404, "Case not found.");

    const supabase = getSupabaseAdmin();

    const { data: document, error: readError } = await supabase
      .from("workspace_documents")
      .select(
        "id,storage_path,mime,extraction_status,extraction_started_at,extraction_attempts,extraction_notice",
      )
      .eq("id", documentId)
      .eq("user_id", user.id)
      .eq("case_id", caseId)
      .is("deleted_at", null)
      .maybeSingle();

    if (readError) {
      console.error("workspace extract read error:", readError.message);
      return refuse(500, "CourtSimplified could not read this document.");
    }

    if (!document) return refuse(404, "Document not found.");

    // ---- already finished: idempotent, and says so rather than redoing work ----

    /*
     * 'needs-details' is terminal too, UNLESS the browser has brought new OCR text.
     *
     * Without that exception the row would fall through to the claim step and
     * re-parse a document whose text layer is already known to be empty — burning an
     * attempt, every time, to reach the same answer. With it, a user who retries on a
     * better device or a straighter photograph gets a second reading.
     */
    const terminal =
      document.extraction_status === "done" ||
      document.extraction_status === "skipped" ||
      (document.extraction_status === "needs-details" && body.clientOcr === undefined);

    if (terminal) {
      return NextResponse.json({
        success: true,
        documentId,
        status: document.extraction_status,
        notice: document.extraction_notice,
        alreadyComplete: true,
      });
    }

    // ---- somebody else is doing it, unless they died ----

    if (document.extraction_status === "running") {
      const startedAt = document.extraction_started_at
        ? new Date(document.extraction_started_at).getTime()
        : 0;
      const age = Date.now() - startedAt;

      if (startedAt > 0 && age < STALE_AFTER_MS) {
        return NextResponse.json(
          {
            success: true,
            documentId,
            status: "running",
            detail: "This document is being read now.",
          },
          { status: 202 },
        );
      }
      /*
       * Fall through and take it over. `startedAt === 0` means a 'running' row with
       * no timestamp, which is either a row written before this column existed or a
       * bug — either way nothing is running, so taking it over is right.
       */
    }

    if ((document.extraction_attempts ?? 0) >= MAX_ATTEMPTS) {
      return NextResponse.json({
        success: true,
        documentId,
        status: "failed",
        notice:
          document.extraction_notice ||
          "CourtSimplified could not read this document after several attempts. You " +
            "can still give it a label, a date and an exhibit number yourself.",
        attemptsExhausted: true,
      });
    }

    // ---- claim it ----

    const attempts = (document.extraction_attempts ?? 0) + 1;

    await supabase
      .from("workspace_documents")
      .update({
        extraction_status: "running",
        extraction_started_at: new Date().toISOString(),
        extraction_attempts: attempts,
      })
      .eq("id", documentId)
      .eq("user_id", user.id);

    // ---- read the object and parse it ----

    const { data: blob, error: downloadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .download(document.storage_path);

    if (downloadError || !blob) {
      await supabase
        .from("workspace_documents")
        .update({
          extraction_status: "failed",
          extraction_notice:
            "CourtSimplified could not open the stored file. You can still label and date it yourself.",
        })
        .eq("id", documentId)
        .eq("user_id", user.id);

      console.error("workspace extract download error:", downloadError?.message);
      return refuse(500, "CourtSimplified could not open the stored file.");
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());

    /*
     * The mime stored at registration, which was decided from the bytes. Not a
     * client's claim, and not re-sniffed here — the register route already did that
     * and refused anything that failed.
     */
    const outcome = await extractDocumentText(document.mime, bytes);

    // ---- no text from the server: the browser's OCR is the second chance ----

    const clientOcr = acceptClientOcr(body.clientOcr);

    if (outcome.status !== "done" && clientOcr === null) {
      /*
       * The fallback the OCR design keeps deliberately: no server text, and either
       * the browser could not run tesseract or it read nothing. Reported as skipped
       * with a reason, never as an empty success.
       */
      await supabase
        .from("workspace_documents")
        .update({
          extraction_status: outcome.status, // 'skipped' or 'failed'
          extraction_notice: outcome.reason,
        })
        .eq("id", documentId)
        .eq("user_id", user.id);

      return NextResponse.json({
        success: true,
        documentId,
        status: outcome.status,
        notice: outcome.reason,
        /*
         * Said plainly, because a user who uploaded a photo of a receipt needs to
         * know the document still counts.
         */
        stillUsable: true,
      });
    }

    /*
     * *** THE SERVER'S OWN TEXT ALWAYS WINS ***
     *
     * If the text layer was read successfully, that text is exact and the browser's
     * guess is not needed — so client OCR is used only where server extraction
     * produced nothing. Preferring a client payload over a real text layer would let
     * a request replace the contents of a PDF we can read perfectly well.
     */
    const usingClientOcr = outcome.status !== "done";

    const rawText = outcome.status === "done" ? outcome.text : (clientOcr as AcceptedClientOcr).text;

    const text = rawText.length > MAX_STORED_CHARS ? rawText.slice(0, MAX_STORED_CHARS) : rawText;

    const method = usingClientOcr ? "client-ocr" : outcome.method;
    const confidence = usingClientOcr ? (clientOcr as AcceptedClientOcr).confidence : null;

    /*
     * Low-confidence OCR is text worth keeping and not worth relying on, so the
     * document lands in 'needs-details' and the user is asked for the date and a
     * description. CLAUDE.md §4 — a guess is a suggestion, not a fact.
     */
    const needsDetails = usingClientOcr && (confidence ?? 0) < LOW_OCR_CONFIDENCE;

    /*
     * Scanned HERE, over the text that actually arrived. Any scan the client claims
     * to have run is irrelevant: the warning exists to protect the user, and a
     * protection that a request can switch off by omitting a field is not one.
     */
    const scan = scanForPersonalData(text);

    const { error: textError } = await supabase.from("workspace_document_text").upsert(
      {
        document_id: documentId,
        user_id: user.id,
        extracted_text: text,
        char_count: text.length,
        extracted_at: new Date().toISOString(),
        extraction_method: method,
        /*
         * NULL for anything that is not OCR. A PDF text layer is not "100%
         * confident", it is simply not a guess, and storing 100 would make the two
         * indistinguishable in a query.
         */
        extraction_confidence: confidence,
        /*
         * Flag NAMES only. scanForPersonalData has no path that returns a match, so
         * there is nothing here that could carry one even by accident.
         */
        pii_flags: scan.flags,
      },
      { onConflict: "document_id" },
    );

    if (textError) {
      await supabase
        .from("workspace_documents")
        .update({
          extraction_status: "failed",
          extraction_notice:
            "CourtSimplified read this document but could not save its text. You can still label and date it yourself.",
        })
        .eq("id", documentId)
        .eq("user_id", user.id);

      console.error("workspace extract save error:", textError.message);
      return refuse(500, "CourtSimplified could not save the document text.");
    }

    const finalStatus = needsDetails ? "needs-details" : "done";

    const notice = needsDetails
      ? "CourtSimplified read this image, but some of the text is likely to be " +
        "wrong — photographs and scans are hard to read. Please type the date and " +
        "a short description yourself so your chronology is right."
      : usingClientOcr
        ? "This text was read from an image in your browser, so it may contain " +
          "mistakes. It is worth a quick look."
        : null;

    await supabase
      .from("workspace_documents")
      .update({
        extraction_status: finalStatus,
        extraction_notice: notice,
      })
      .eq("id", documentId)
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      documentId,
      status: finalStatus,
      method,
      /*
       * Returned so the UI can label the text's provenance on screen. A user looking
       * at a chronology needs to know which entries came from a machine reading a
       * photograph.
       */
      source: usingClientOcr ? "client-ocr" : "server-extraction",
      confidence,
      notice,
      charCount: text.length,
      truncated:
        rawText.length > MAX_STORED_CHARS ||
        (usingClientOcr && (clientOcr as AcceptedClientOcr).truncated),
      /*
       * Messages and counts. The identifiers themselves are never in this response,
       * because the scanner cannot return them — test:workspace-pii serialises the
       * whole result and asserts none appears.
       *
       * Note what these say and do not say: each states what appears to be printed
       * on the document. None of them tells the user what to do about it. Saying
       * "court files are public, so redact this" would be a legal statement about
       * Ontario court records, and CLAUDE.md §2 forbids writing one without a
       * retrieved, citable source.
       */
      personalData: scan.findings,
    });
  } catch (error) {
    console.error("workspace extract error:", error);
    return refuse(500, "CourtSimplified could not read this document.");
  }
}
