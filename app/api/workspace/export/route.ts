/**
 * Export everything this product holds about the person asking.
 *
 * *** WHAT "EVERYTHING" HAS TO MEAN, OR THE FEATURE IS A LIE ***
 *
 * An export that returns the convenient tables and quietly omits the awkward ones is
 * worse than no export: it gives a person a document they will reasonably treat as
 * complete. So this returns every table keyed to the user in the workspace, and where
 * something is deliberately NOT included it says so IN THE EXPORT, with the reason —
 * rather than leaving an absence the reader cannot detect.
 *
 * `docs/data-map.md` is the list this route is built from. If a table is added there
 * and not here, `test:workspace-export` fails: the map and the export are checked
 * against each other, because the failure mode is a new table nobody remembers to
 * export, and that failure is invisible from either side alone.
 *
 * *** THE FILES THEMSELVES ***
 *
 * Documents are returned as short-lived signed URLs, not as bytes. A case file can be
 * hundreds of megabytes, and a serverless function assembling a ZIP of it will time out
 * — leaving the person with an error instead of their data, which is the opposite of
 * what this exists for. The URLs are listed with their expiry so the reader knows they
 * must download promptly.
 *
 * *** WHY THE EXPORT IS NOT CACHED, ANYWHERE ***
 *
 * It is the single most sensitive response this product can produce: one request that
 * returns a person's whole case file. `no-store` on every hop, and the signed URLs are
 * minutes long.
 *
 * NO MODEL IS CALLED HERE.
 */

import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";

import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";
import { DOCUMENT_BUCKET } from "@/src/lib/case-workspace/storagePaths";

export const runtime = "nodejs";

/** Long enough to download a large case file, short enough to be useless if leaked. */
const SIGNED_URL_SECONDS = 15 * 60;

/**
 * The tables this export covers, and what each one holds.
 *
 * Kept as data rather than inline queries so `test:workspace-export` can compare it
 * with `docs/data-map.md`. A table in the map and not here is an omission; a table here
 * and not in the map is an undocumented store.
 */
export const EXPORTED_TABLES = [
  { table: "workspace_documents", what: "One row per document you uploaded" },
  { table: "workspace_document_text", what: "Text read out of your documents" },
  { table: "workspace_timeline_events", what: "Events you added to your timeline" },
  { table: "workspace_communications", what: "Your communication log" },
] as const;

/**
 * Things deliberately not in the export, and why. Stated IN the export.
 *
 * An omission the reader cannot see is the thing that makes an export dishonest.
 */
const NOT_INCLUDED = [
  {
    what: "Other people's data",
    why:
      "Where a document names someone who is not you, that name is in the document and " +
      "in your own records. Nothing about other people is held separately.",
  },
  {
    what: "Deleted documents",
    why:
      "When you delete a document, the file, its text and its record are removed. There " +
      "is nothing left to export, which is the point.",
  },
  {
    what: "Server logs",
    why:
      "Our hosting provider records that requests happened — times, addresses, status " +
      "codes. Those are not stored by us and are not searchable by person.",
  },
] as const;

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

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication is required." },
        { status: 401 },
      );
    }

    const supabase = getSupabaseAdmin();

    const data: Record<string, unknown[]> = {};

    /*
     * Every query scoped by user_id here, explicitly. A service-role client bypasses
     * RLS, so on this path the clause below is the only thing that keeps one person's
     * export from containing another person's case.
     */
    for (const entry of EXPORTED_TABLES) {
      const { data: rows, error } = await supabase
        .from(entry.table)
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error(`export read error on ${entry.table}:`, error.message);
        return NextResponse.json(
          {
            success: false,
            error: "CourtSimplified could not put your export together.",
            detail:
              "Nothing was exported. This is a fault at our end — please try again, and " +
              "tell us if it keeps happening.",
          },
          { status: 500 },
        );
      }

      data[entry.table] = rows ?? [];
    }

    /*
     * Signed URLs for the documents still present. Built from each row's own
     * storage_path, so a row whose object has already gone yields no URL rather than a
     * broken one.
     */
    const documents = (data.workspace_documents ?? []) as { storage_path?: string; id?: string }[];
    const files: { documentId: string; url: string | null }[] = [];

    for (const document of documents) {
      if (!document.storage_path || !document.id) continue;
      const { data: signed } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .createSignedUrl(document.storage_path, SIGNED_URL_SECONDS);
      files.push({ documentId: document.id, url: signed?.signedUrl ?? null });
    }

    const body = {
      success: true,
      exportedAt: new Date().toISOString(),
      /*
       * The account identifier is in the person's OWN export, which is the one place it
       * belongs: they are entitled to know what identifies them here.
       */
      account: { userId: user.id, email: user.email ?? null },
      whatThisContains: EXPORTED_TABLES.map((entry) => ({
        table: entry.table,
        what: entry.what,
        rows: (data[entry.table] ?? []).length,
      })),
      whatThisDoesNotContain: NOT_INCLUDED,
      files: {
        note:
          `Each link below works for ${SIGNED_URL_SECONDS / 60} minutes from the time of ` +
          `this export. Download them now; running the export again will produce new links.`,
        items: files,
      },
      data,
    };

    return new NextResponse(JSON.stringify(body, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="courtsimplified-export.json"',
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
      },
    });
  } catch (error) {
    console.error("export error:", error);
    return NextResponse.json(
      { success: false, error: "CourtSimplified could not put your export together." },
      { status: 500 },
    );
  }
}
