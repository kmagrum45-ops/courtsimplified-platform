/**
 * Builds the exhibit book, and applies a numbering the user has confirmed.
 *
 * GET  — returns the book as a PDF, or just its index when `preview=1`.
 * POST — applies a numbering proposal the user accepted.
 *
 * *** WHY THE PREVIEW DOES NOT DOWNLOAD THE DOCUMENTS ***
 *
 * A preview shows the cover and the index. Assembling the real book means downloading
 * every document from storage — potentially hundreds of megabytes for a case with forty
 * scans — and a user flicking to the exhibit book tab in the left nav must not trigger
 * that. `preview=1` builds from the rows alone, so the index shows labels, dates and
 * descriptions with no page numbers, which is exactly what a preview can honestly claim.
 *
 * Page numbers appear only in the real build, where they are recorded from the assembled
 * document. `test:workspace-organisation` verifies that by reading the finished PDF back.
 *
 * *** THE NUMBERING POST IS A CONFIRMATION, NOT A COMMAND ***
 *
 * CLAUDE.md §4. The client sends back the proposal it was shown; the server recomputes
 * the same proposal and refuses if they disagree, so a stale screen cannot apply a
 * numbering the user never saw. A renumber that moves an existing number additionally
 * requires `acknowledgeRenumber`, because that is the operation that invalidates
 * references already served on the other side.
 *
 * NO MODEL IS CALLED HERE.
 */

import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { getAuthenticatedUser, getAuthenticatedOwnedCase } from "@/src/lib/supabase/serverAuth";
import { DOCUMENT_BUCKET, isUuid } from "@/src/lib/case-workspace/storagePaths";
import { COURT_DECISION_TYPE } from "@/src/lib/case-workspace/courtDecision";
import {
  proposeNumbering,
  proposeRenumberFromOne,
  type NumberableDocument,
} from "@/src/lib/case-workspace/exhibitNumbering";
import {
  buildExhibitBook,
  type ExhibitBookDocument,
} from "@/src/lib/case-workspace/exhibitBook";
import type { DatePrecision } from "@/src/lib/case-workspace/parseDate";

export const runtime = "nodejs";

/** Enough for a real book; beyond this the user is told to split it. */
const MAX_BOOK_BYTES = 120 * 1024 * 1024;

type Row = {
  id: string;
  original_name: string;
  mime: string;
  size_bytes: number;
  storage_path: string;
  uploaded_at: string;
  user_type: string | null;
  user_date: string | null;
  user_date_precision: DatePrecision | null;
  user_label: string | null;
  exhibit_number: number | null;
  exhibit_suffix: string | null;
};

const COLUMNS =
  "id,original_name,mime,size_bytes,storage_path,uploaded_at," +
  "user_type,user_date,user_date_precision,user_label,exhibit_number,exhibit_suffix";

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

const toNumberable = (row: Row): NumberableDocument => ({
  id: row.id,
  userDate: row.user_date,
  userDatePrecision: row.user_date_precision ?? "day",
  exhibitNumber: row.exhibit_number,
  exhibitSuffix: row.exhibit_suffix,
  uploadedAt: row.uploaded_at,
  originalName: row.original_name,
});

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return refuse(401, "Authentication is required.");

    const { searchParams } = new URL(req.url);
    const caseId = String(searchParams.get("caseId") || "").trim();
    const preview = searchParams.get("preview") === "1";

    if (!isUuid(caseId)) return refuse(400, "A valid case id is required.");

    const ownedCase = await getAuthenticatedOwnedCase(req, user, caseId);
    if (!ownedCase) return refuse(404, "Case not found.");

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("workspace_documents")
      .select(COLUMNS)
      .eq("user_id", user.id)
      .eq("case_id", caseId)
      .is("deleted_at", null)
      .not("exhibit_number", "is", null);

    if (error) {
      console.error("exhibit book read error:", error.message);
      return refuse(500, "CourtSimplified could not load this case's exhibits.");
    }

    // A court decision from CanLII is kept with the case for the person's own
    // research; it is not their evidence and never goes in the book (2026-10-07).
    const rows = ((data ?? []) as unknown as Row[]).filter((row) => row.user_type !== COURT_DECISION_TYPE);

    if (rows.length === 0) {
      return refuse(
        409,
        "No exhibits yet.",
        "Give your documents exhibit numbers first, and they will appear in the book.",
      );
    }

    const master = (ownedCase.master_result ?? {}) as {
      persistedRecord?: { title?: string };
      caseContext?: { courtFileNumber?: string; plaintiff?: string; defendant?: string };
    };

    const caseDetails = {
      title: master.persistedRecord?.title ?? "Untitled case",
      courtFileNumber: master.caseContext?.courtFileNumber ?? null,
      /*
       * Not invented. A case with no recorded court name gets no court line on the
       * cover rather than a guess at which court it is in.
       */
      courtName: null,
      plaintiff: master.caseContext?.plaintiff ?? null,
      defendant: master.caseContext?.defendant ?? null,
    };

    const documents: ExhibitBookDocument[] = rows.map((row) => ({
      id: row.id,
      exhibitNumber: row.exhibit_number as number,
      exhibitSuffix: row.exhibit_suffix,
      userLabel: row.user_label,
      originalName: row.original_name,
      userType: row.user_type,
      userDate: row.user_date,
      userDatePrecision: row.user_date_precision ?? "day",
      mime: row.mime,
    }));

    if (preview) {
      /*
       * No bytes fetched. The index comes back with `page: null` throughout, which is
       * honest: a preview cannot know a page number, and showing a plausible one would
       * be the index-disagrees-with-book failure in its most damaging form.
       */
      const book = await buildExhibitBook(caseDetails, documents);
      return NextResponse.json({
        success: true,
        preview: true,
        index: book.index,
        separateCount: book.separateCount,
        caseDetails,
      });
    }

    const totalBytes = rows.reduce((sum, row) => sum + Number(row.size_bytes ?? 0), 0);
    if (totalBytes > MAX_BOOK_BYTES) {
      return refuse(
        413,
        "This book is too large to build in one go.",
        `The documents come to ${(totalBytes / (1024 * 1024)).toFixed(0)} MB. Building a ` +
          `book this size would time out. Removing the largest scans from the book, or ` +
          `splitting it in two, will work.`,
      );
    }

    // Fetch the bytes for the documents that can be placed.
    for (const document of documents) {
      const row = rows.find((candidate) => candidate.id === document.id);
      if (!row) continue;
      const { data: blob } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .download(row.storage_path);
      if (blob) document.bytes = new Uint8Array(await blob.arrayBuffer());
    }

    const book = await buildExhibitBook(caseDetails, documents);

    return new NextResponse(Buffer.from(book.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="exhibit-book.pdf"',
        /*
         * The book contains the user's evidence. No cache, anywhere, ever — a shared
         * computer is the exposure DATA_FLOW_INVENTORY §4.3 is about.
         */
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
      },
    });
  } catch (error) {
    console.error("exhibit book error:", error);
    return refuse(500, "CourtSimplified could not build the exhibit book.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return refuse(401, "Authentication is required.");

    const body = (await req.json()) as {
      caseId?: string;
      mode?: "add-new" | "renumber-from-one";
      acknowledgeRenumber?: boolean;
      /** What the screen showed, echoed back. */
      expect?: { documentId: string; exhibitNumber: number; exhibitSuffix: string | null }[];
    };

    const caseId = String(body.caseId || "").trim();
    if (!isUuid(caseId)) return refuse(400, "A valid case id is required.");

    const ownedCase = await getAuthenticatedOwnedCase(req, user, caseId);
    if (!ownedCase) return refuse(404, "Case not found.");

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("workspace_documents")
      .select(COLUMNS)
      .eq("user_id", user.id)
      .eq("case_id", caseId)
      .is("deleted_at", null);

    if (error) {
      console.error("exhibit numbering read error:", error.message);
      return refuse(500, "CourtSimplified could not load this case's documents.");
    }

    // Court decisions are not exhibits (see the GET above).
    const numberable = ((data ?? []) as unknown as Row[])
      .filter((row) => row.user_type !== COURT_DECISION_TYPE)
      .map(toNumberable);

    const mode = body.mode === "renumber-from-one" ? "renumber-from-one" : "add-new";
    const proposal =
      mode === "renumber-from-one"
        ? proposeRenumberFromOne(numberable)
        : proposeNumbering(numberable);

    /*
     * *** THE SCREEN'S PROPOSAL AND THE SERVER'S MUST AGREE ***
     *
     * The user confirmed a specific set of numbers. If a document was added or dated
     * since that screen rendered, the server's proposal differs — and applying it would
     * assign numbers the user never saw, which is deciding for them (§4).
     */
    if (Array.isArray(body.expect)) {
      const actual = new Map(
        proposal.proposed.map((entry) => [
          entry.documentId,
          `${entry.exhibitNumber}${entry.exhibitSuffix ?? ""}`,
        ]),
      );
      const mismatched = body.expect.filter(
        (entry) =>
          actual.get(entry.documentId) !==
          `${entry.exhibitNumber}${entry.exhibitSuffix ?? ""}`,
      );

      if (mismatched.length > 0 || body.expect.length !== proposal.proposed.length) {
        return refuse(
          409,
          "The numbering has changed since you saw it.",
          "A document was added, dated or removed. Check the new numbering and confirm again.",
        );
      }
    }

    const moves = proposal.proposed.filter((entry) => entry.isChange).length;
    if (moves > 0 && body.acknowledgeRenumber !== true) {
      return refuse(
        409,
        "This would change numbers that are already in use.",
        proposal.warning ??
          `${moves} document(s) would get a different exhibit number. Confirm that you ` +
            `understand before this is applied.`,
      );
    }

    let applied = 0;
    for (const entry of proposal.proposed) {
      const { error: updateError } = await supabase
        .from("workspace_documents")
        .update({
          exhibit_number: entry.exhibitNumber,
          exhibit_suffix: entry.exhibitSuffix,
        })
        .eq("id", entry.documentId)
        .eq("user_id", user.id)
        .is("deleted_at", null);

      if (updateError) {
        console.error(`exhibit numbering write error for ${entry.documentId}:`, updateError.message);
        return refuse(
          500,
          "CourtSimplified could not finish numbering these documents.",
          `${applied} of ${proposal.proposed.length} were numbered. Try again to finish.`,
        );
      }
      applied += 1;
    }

    return NextResponse.json({
      success: true,
      applied,
      needDates: proposal.needDates,
      mode,
    });
  } catch (error) {
    console.error("exhibit numbering error:", error);
    return refuse(500, "CourtSimplified could not number these documents.");
  }
}
