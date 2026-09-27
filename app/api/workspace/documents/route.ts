/**
 * A case's documents: register one after upload, list them, delete one completely.
 *
 * *** POST IS THE AUTHORITATIVE CHECK, AND IT READS THE OBJECT BACK ***
 *
 * The upload-url route checked a file head the CLIENT supplied. That is worth
 * doing for the user's sake and worth nothing as a control. So this route
 * downloads the object that actually landed and decides from those bytes: the
 * size, the sha256, and the type. Nothing from the request body is trusted about
 * the file except the name the user wants to see it under.
 *
 * If the object is not acceptable it is REMOVED, and the refusal says so. An
 * object that failed registration must not survive: it would be a file in a user's
 * folder that no screen lists, no deletion reaches and no retention policy knows
 * about.
 *
 * *** THE PATH IS REBUILT, NEVER ACCEPTED ***
 *
 * The body carries a documentId, not a storage path. The path is rebuilt from the
 * AUTHENTICATED user's id, the owned case's id and that document id. A body that
 * could name its own path is a body that could name somebody else's, and the fact
 * that RLS would also refuse is not a reason to let the request describe the
 * object it wants.
 *
 * *** WHAT DELETE HAS TO DO, WHICH IS MORE THAN DELETE A ROW ***
 *
 * `workspace_document_text` cascades from the document row. The storage OBJECT
 * cascades from nothing. So a row-only delete leaves the file — the actual medical
 * record — sitting in the bucket while every screen reports it gone. The order here
 * is: mark, remove the object, then delete the row, so that a failure halfway
 * leaves a row carrying `deleted_at` with its object still present, which is a
 * state `test:workspace-deletion` looks for and reports as a bug rather than a
 * state nobody can see.
 *
 * NO MODEL IS CALLED ON ANY PATH IN THIS FILE. No document content and no file
 * name leaves the server here.
 */

import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

import { getAuthenticatedUser, getAuthenticatedOwnedCase } from "@/src/lib/supabase/serverAuth";
import {
  MAX_DOCUMENT_BYTES,
  SNIFF_BYTES,
  validateUpload,
} from "@/src/lib/case-workspace/fileValidation";
import {
  DOCUMENT_BUCKET,
  documentObjectPath,
  isUuid,
} from "@/src/lib/case-workspace/storagePaths";
import { DOCUMENT_TYPE_IDS } from "@/src/lib/case-workspace/documentTypes";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 16 * 1024;

/** Columns a document LIST may read. Deliberately excludes nothing sensitive
 *  by accident: extracted text lives in another table and is not selected here. */
const DOCUMENT_COLUMNS =
  "id,case_id,storage_path,original_name,mime,size_bytes,sha256,uploaded_at," +
  "user_type,user_date,user_date_precision,user_label,exhibit_number,exhibit_suffix," +
  "parties,amount,notes,extraction_status,deleted_at";

type RegisterRequestBody = {
  caseId?: string;
  documentId?: string;
  originalName?: string;
  declaredMime?: string | null;
};

/** Alias used by PATCH; same client, named so the call sites read as one thing. */
const supabaseAdminFor = () => getSupabaseAdmin();

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

// ---------------------------------------------------------------------------
// POST — register an uploaded object as a document
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let supabase: ReturnType<typeof getSupabaseAdmin> | null = null;
  let storagePath: string | null = null;

  /**
   * Removes an object that must not survive. Failures are logged and swallowed:
   * the caller is already refusing, and a cleanup failure must not turn a refusal
   * into a 500 that the client might read as "try again with the same object".
   */
  const removeOrphan = async (why: string) => {
    if (!supabase || !storagePath) return;
    const { error } = await supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    if (error) {
      console.error(
        `workspace register: ORPHANED OBJECT left in ${DOCUMENT_BUCKET} after ${why}:`,
        error.message,
      );
    }
  };

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return refuse(401, "Authentication is required.");

    if (Number(req.headers.get("content-length") || 0) > MAX_BODY_BYTES) {
      return refuse(413, "The request is too large.");
    }

    const body: RegisterRequestBody = await req.json();

    const caseId = String(body.caseId || "").trim();
    const documentId = String(body.documentId || "").trim();

    if (!isUuid(caseId)) return refuse(400, "A valid case id is required.");
    if (!isUuid(documentId)) return refuse(400, "A valid document id is required.");

    const ownedCase = await getAuthenticatedOwnedCase(req, user, caseId);
    if (!ownedCase) return refuse(404, "Case not found.");

    supabase = getSupabaseAdmin();
    storagePath = documentObjectPath({ userId: user.id, caseId, documentId });

    // ---- read the object that actually landed ----

    const { data: blob, error: downloadError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .download(storagePath);

    if (downloadError || !blob) {
      /*
       * Nothing to clean up: there is no object. This is the ordinary case of a
       * client registering before the upload finished, or after it failed.
       */
      return refuse(
        409,
        "No uploaded file was found for this document.",
        "The upload has not finished, or it did not succeed. Upload the file first, then register it.",
      );
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());

    if (bytes.byteLength === 0) {
      await removeOrphan("an empty object");
      return refuse(422, "empty", "The uploaded file is empty, so there is nothing to store.");
    }

    if (bytes.byteLength > MAX_DOCUMENT_BYTES) {
      /*
       * Reachable even with the bucket's own size limit in place: the limit was
       * added later than the bucket, and a bucket setting is dashboard-reachable
       * state that no request can rely on.
       */
      await removeOrphan("an oversized object");
      return refuse(
        422,
        "too-large",
        `The uploaded file is larger than the ${MAX_DOCUMENT_BYTES / (1024 * 1024)} MB limit.`,
      );
    }

    const originalName = String(body.originalName || "").trim();

    const validation = validateUpload({
      originalName,
      declaredMime: body.declaredMime ?? null,
      sizeBytes: bytes.byteLength,
      head: bytes.slice(0, SNIFF_BYTES),
    });

    if (!validation.ok) {
      await removeOrphan(`a refused file (${validation.reason})`);
      return refuse(422, validation.reason, validation.detail);
    }

    const sha256 = createHash("sha256").update(bytes).digest("hex");

    // ---- exact duplicate, decided on the hash and not on the name ----

    const { data: duplicate } = await supabase
      .from("workspace_documents")
      .select("id,original_name,uploaded_at")
      .eq("user_id", user.id)
      .eq("case_id", caseId)
      .eq("sha256", sha256)
      .is("deleted_at", null)
      .maybeSingle();

    const { data: inserted, error: insertError } = await supabase
      .from("workspace_documents")
      .insert({
        id: documentId,
        case_id: caseId,
        user_id: user.id,
        storage_path: storagePath,
        original_name: originalName,
        mime: validation.storedMime,
        size_bytes: bytes.byteLength,
        sha256,
        extraction_status: "pending",
      })
      .select(DOCUMENT_COLUMNS)
      .single();

    if (insertError || !inserted) {
      /*
       * The row is what makes an object a document. Without it the object is
       * unreachable and unlistable, so it goes.
       */
      await removeOrphan("a failed row insert");
      console.error("workspace register insert error:", insertError?.message);
      return refuse(500, "CourtSimplified could not save this document.");
    }

    return NextResponse.json({
      success: true,
      document: inserted,
      mismatchNotice: validation.mismatchNotice,
      /*
       * A suggestion, never an action. CLAUDE.md §4: the duplicate is reported and
       * the user decides. Nothing is merged or removed on our initiative.
       */
      duplicateOf: duplicate
        ? {
            id: duplicate.id,
            originalName: duplicate.original_name,
            uploadedAt: duplicate.uploaded_at,
            notice:
              "This file is byte-for-byte identical to a document already in this " +
              "case. Both have been kept — you may want only one, or you may have " +
              "a reason to keep both.",
          }
        : null,
    });
  } catch (error) {
    await removeOrphan("an unexpected error");
    console.error("workspace register error:", error);
    return refuse(500, "CourtSimplified could not save this document.");
  }
}

// ---------------------------------------------------------------------------
// GET — the case's documents
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return refuse(401, "Authentication is required.");

    const { searchParams } = new URL(req.url);
    const caseId = String(searchParams.get("caseId") || "").trim();

    if (!isUuid(caseId)) return refuse(400, "A valid case id is required.");

    const ownedCase = await getAuthenticatedOwnedCase(req, user, caseId);
    if (!ownedCase) return refuse(404, "Case not found.");

    const supabase = getSupabaseAdmin();

    /*
     * Both .eq() clauses are deliberate. RLS enforces user_id as well, and this is
     * not distrust of RLS — it is that a service-role client bypasses RLS
     * entirely, so on this path the only thing scoping the query to the caller is
     * the clause written here.
     */
    const { data, error } = await supabase
      .from("workspace_documents")
      .select(DOCUMENT_COLUMNS)
      .eq("user_id", user.id)
      .eq("case_id", caseId)
      .is("deleted_at", null)
      .order("uploaded_at", { ascending: true });

    if (error) {
      console.error("workspace list error:", error.message);
      return refuse(500, "CourtSimplified could not load this case's documents.");
    }

    return NextResponse.json({ success: true, documents: data || [] });
  } catch (error) {
    console.error("workspace list error:", error);
    return refuse(500, "CourtSimplified could not load this case's documents.");
  }
}

// ---------------------------------------------------------------------------
// DELETE — the object, the extracted text and the row
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// PATCH — the user confirming or correcting what a document is
// ---------------------------------------------------------------------------

/**
 * *** THIS IS THE "CONFIRM" HALF OF SUGGEST-THEN-CONFIRM ***
 *
 * CLAUDE.md §4: every AI-generated output is a suggestion the user confirms or
 * overrides. Nothing else in this product writes `user_type`, `user_date` or
 * `user_label` — not extraction, not OCR, not the analysis in Part 4. A suggestion is
 * returned to the screen, the user accepts or edits it, and THIS route records the
 * result. The column names say whose values they are.
 *
 * So there is no "apply suggestion" endpoint and there must not be one. The difference
 * between a suggestion and a decision is that a person made the second, and a route
 * that writes a suggestion directly erases that difference while looking like a
 * convenience.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return refuse(401, "Authentication is required.");

    if (Number(req.headers.get("content-length") || 0) > MAX_BODY_BYTES) {
      return refuse(413, "The request is too large.");
    }

    const body = (await req.json()) as {
      documentId?: string;
      userType?: string | null;
      userDate?: string | null;
      userDatePrecision?: string | null;
      userLabel?: string | null;
      parties?: unknown;
      amount?: unknown;
      notes?: string | null;
    };

    const documentId = String(body.documentId || "").trim();
    if (!isUuid(documentId)) return refuse(400, "A valid document id is required.");

    const update: Record<string, unknown> = {};

    if (body.userType !== undefined) {
      const type = body.userType === null ? null : String(body.userType);
      /*
       * Checked here as well as by the CHECK constraint. The constraint is the thing
       * that cannot be bypassed; this exists so a bad value returns a 422 the screen
       * can show rather than a 500 from a rejected insert.
       */
      if (type !== null && !DOCUMENT_TYPE_IDS.includes(type as (typeof DOCUMENT_TYPE_IDS)[number])) {
        return refuse(422, "Unknown document type.", `"${type}" is not in the catalogue.`);
      }
      update.user_type = type;
    }

    if (body.userDate !== undefined) {
      const date = body.userDate === null ? null : String(body.userDate).trim();
      if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return refuse(422, "A date must be written as YYYY-MM-DD.");
      }

      const precision = String(body.userDatePrecision ?? "day");
      if (!["day", "month", "year"].includes(precision)) {
        return refuse(422, "Precision must be day, month or year.");
      }

      /*
       * *** A MONTH OR YEAR DATE MUST NOT CARRY A DAY THE DOCUMENT NEVER GAVE ***
       *
       * The CHECK constraint enforces this at the table, and it is enforced here too so
       * the user gets a readable refusal. A document dated "March 2026" stored as
       * 2026-03-14 asserts a day nobody read, and a chronology is taken as a record of
       * what happened.
       */
      if (date !== null && precision !== "day") {
        const [, month, day] = date.split("-");
        if (day !== "01" || (precision === "year" && month !== "01")) {
          return refuse(
            422,
            "That date is more precise than the precision says.",
            precision === "month"
              ? "A month-precision date must be the first of the month."
              : "A year-precision date must be 1 January.",
          );
        }
      }

      update.user_date = date;
      update.user_date_precision = precision;
    }

    if (body.userLabel !== undefined) {
      update.user_label = body.userLabel === null ? null : String(body.userLabel).slice(0, 300);
    }

    if (body.notes !== undefined) {
      update.notes = body.notes === null ? null : String(body.notes).slice(0, 4000);
    }

    if (body.parties !== undefined) {
      update.parties = Array.isArray(body.parties)
        ? body.parties.map((party) => String(party).slice(0, 200)).slice(0, 20)
        : [];
    }

    if (body.amount !== undefined) {
      if (body.amount === null) {
        update.amount = null;
      } else {
        const amount = Number(body.amount);
        if (!Number.isFinite(amount)) return refuse(422, "That amount is not a number.");
        update.amount = amount;
      }
    }

    if (Object.keys(update).length === 0) {
      return refuse(400, "Nothing to change.");
    }

    /*
     * Confirming a date is what moves a document out of 'needs-details'. Without this
     * the low-confidence OCR banner would stay on screen after the user had answered it,
     * which reads as the product ignoring them.
     */
    if (update.user_date !== undefined && update.user_date !== null) {
      const { data: current } = await supabaseAdminFor().from("workspace_documents")
        .select("extraction_status")
        .eq("id", documentId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (current?.extraction_status === "needs-details") {
        update.extraction_status = "done";
        update.extraction_notice = null;
      }
    }

    const { data, error } = await supabaseAdminFor()
      .from("workspace_documents")
      .update(update)
      .eq("id", documentId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .select(DOCUMENT_COLUMNS)
      .maybeSingle();

    if (error) {
      console.error("workspace patch error:", error.message);
      return refuse(500, "CourtSimplified could not save this change.");
    }

    if (!data) return refuse(404, "Document not found.");

    return NextResponse.json({ success: true, document: data });
  } catch (error) {
    console.error("workspace patch error:", error);
    return refuse(500, "CourtSimplified could not save this change.");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return refuse(401, "Authentication is required.");

    const { searchParams } = new URL(req.url);
    const documentId = String(searchParams.get("documentId") || "").trim();

    if (!isUuid(documentId)) return refuse(400, "A valid document id is required.");

    const supabase = getSupabaseAdmin();

    const { data: document, error: readError } = await supabase
      .from("workspace_documents")
      .select("id,storage_path,user_id")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (readError) {
      console.error("workspace delete read error:", readError.message);
      return refuse(500, "CourtSimplified could not delete this document.");
    }

    if (!document) return refuse(404, "Document not found.");

    /*
     * Step 1: mark it. If everything after this fails, the row records that a
     * delete was attempted and did not complete, which is what makes an incomplete
     * deletion findable instead of silent.
     */
    await supabase
      .from("workspace_documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", documentId)
      .eq("user_id", user.id);

    // Step 2: the object. This is the part that nothing cascades.
    const { error: removeError } = await supabase.storage
      .from(DOCUMENT_BUCKET)
      .remove([document.storage_path]);

    if (removeError) {
      /*
       * The row stays, carrying deleted_at, and the user is told the truth: the
       * file is still there. Reporting success here would be telling somebody
       * their medical record is gone when it is not.
       */
      console.error(
        `workspace delete: object NOT removed for document ${documentId}:`,
        removeError.message,
      );
      return refuse(
        500,
        "CourtSimplified could not finish deleting this document.",
        "The file has not been removed. It is hidden from your case and will be " +
          "retried; nothing has been lost, but it is not yet deleted.",
      );
    }

    /*
     * Step 3: the row, which cascades workspace_document_text. Done last, because
     * the row is the only record of which object to remove — deleting it first
     * would leave an object nothing can name.
     */
    const { error: deleteError } = await supabase
      .from("workspace_documents")
      .delete()
      .eq("id", documentId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("workspace delete row error:", deleteError.message);
      return refuse(
        500,
        "CourtSimplified could not finish deleting this document.",
        "The file itself has been removed. A record of it remains and will be cleared.",
      );
    }

    return NextResponse.json({
      success: true,
      deletedId: documentId,
      /*
       * Enumerated so the user's deletion promise is auditable, and so a reader of
       * this response can see that the object was included.
       */
      removed: ["the file itself", "any extracted text", "the document record"],
    });
  } catch (error) {
    console.error("workspace delete error:", error);
    return refuse(500, "CourtSimplified could not delete this document.");
  }
}
