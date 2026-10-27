/**
 * GET /api/workspace/documents/link?documentId=<uuid>[&download=1]
 *
 * A one-minute link to one of the person's own uploaded files, to open it or save it (Charter
 * re-test 2026-10-26: there was no way to open, download or delete an upload). A link is made only
 * for the signed-in owner's own row that is not being deleted, lasts a minute, and is never stored.
 *
 * The link is a path on this site (src/lib/case-workspace/fileLink.ts), served by
 * /api/workspace/documents/file/<id>/<file name>: the tab is titled with the file's own name and a
 * download never navigates the page away (Charter re-test 27 Oct: the storage service's own address
 * titled the tab with a random code, and a real Download click logged an error). The bucket stays
 * private (case-evidence, public=false). Deleting uses DELETE /api/workspace/documents.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getAuthenticatedUser } from "@/src/lib/supabase/serverAuth";
import { isUuid } from "@/src/lib/case-workspace/storagePaths";
import { FILE_LINK_SECONDS, fileLinkPath } from "@/src/lib/case-workspace/fileLink";

export const runtime = "nodejs";

/** How long a link lasts, in seconds. */
export const LINK_SECONDS = FILE_LINK_SECONDS;

type Row = { id: string; storage_path: string; original_name: string | null; deleted_at: string | null } | null;
type Dependencies = {
  authenticate: (request: NextRequest) => Promise<{ id: string } | null>;
  /** The person's own row, by id and owner. */
  ownRow: (documentId: string, userId: string) => Promise<Row>;
  /** The server-only secret the link is signed with (never logged). */
  secret: () => string | undefined;
};

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server environment variables.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const refuse = (status: number, error: string) => NextResponse.json({ success: false, error }, { status, headers: { "Cache-Control": "private, no-store" } });

export function createDocumentLinkGet(overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    authenticate: (request) => getAuthenticatedUser(request) as Promise<{ id: string } | null>,
    ownRow: async (documentId, userId) => {
      const { data } = await admin().from("workspace_documents").select("id,storage_path,original_name,deleted_at").eq("id", documentId).eq("user_id", userId).maybeSingle();
      return (data as Row) ?? null;
    },
    secret: () => process.env.SUPABASE_SERVICE_ROLE_KEY,
    ...overrides,
  };
  return async function documentLinkGet(request: NextRequest) {
    try {
      const user = await deps.authenticate(request);
      if (!user) return refuse(401, "Please sign in to open your files.");
      const params = new URL(request.url).searchParams;
      const documentId = String(params.get("documentId") ?? "").trim();
      if (!isUuid(documentId)) return refuse(400, "A valid document id is required.");
      const row = await deps.ownRow(documentId, user.id);
      if (!row || row.deleted_at) return refuse(404, "File not found.");
      const secret = deps.secret();
      if (!secret) return refuse(500, "The file could not be opened just now. Please try again.");
      const download = params.get("download") === "1";
      const url = fileLinkPath({ secret, ownerId: user.id, documentId, name: row.original_name, download });
      return NextResponse.json({ success: true, url, expiresInSeconds: LINK_SECONDS }, { headers: { "Cache-Control": "private, no-store" } });
    } catch {
      return refuse(500, "The file could not be opened just now. Please try again.");
    }
  };
}

export const GET = createDocumentLinkGet();
