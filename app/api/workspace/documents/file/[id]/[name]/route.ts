/**
 * GET /api/workspace/documents/file/<id>/<file name>?exp=…&sig=…[&download=1]
 *
 * Serves one of the person's own uploaded files for a minute, from a link the link route made after
 * checking the signed-in owner (src/lib/case-workspace/fileLink.ts). The address ends with the file's
 * own name, so an opened tab is titled with it; a download is an attachment with that name, so the
 * page is never navigated away. A bad, expired or wrong-choice signature, a file being deleted, or a
 * storage failure is a short plain page, never the browser's own error page (Charter re-test 27 Oct).
 * The bucket stays private: the object is read here with the server's own key.
 */
import { createClient } from "@supabase/supabase-js";

import { DOCUMENT_BUCKET, isUuid } from "@/src/lib/case-workspace/storagePaths";
import { fileLinkValid } from "@/src/lib/case-workspace/fileLink";

export const runtime = "nodejs";

type Row = { storage_path: string; original_name: string | null; mime: string | null; deleted_at: string | null } | null;
type Dependencies = {
  secret: () => string | undefined;
  row: (documentId: string) => Promise<Row>;
  object: (path: string) => Promise<Blob | null>;
};

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server environment variables.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const NO_STORE = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
/** The site's own words, never the browser's error page. */
function plainPage(status: number, words: string): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>File not available</title></head><body style="font-family:system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem;color:#16302b"><h1 style="font-size:1.25rem">File not available</h1><p>${words}</p><p>Go back to your case and choose Open or Download again.</p></body></html>`;
  return new Response(html, { status, headers: { ...NO_STORE, "Content-Type": "text/html; charset=utf-8" } });
}

/** The file's name for Content-Disposition: plain ASCII as a fallback, the full name as UTF-8. */
function disposition(kind: "inline" | "attachment", name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_") || "document";
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export function createDocumentFileGet(overrides: Partial<Dependencies> = {}) {
  const deps: Dependencies = {
    secret: () => process.env.SUPABASE_SERVICE_ROLE_KEY,
    row: async (documentId) => {
      const { data } = await admin().from("workspace_documents").select("storage_path,original_name,mime,deleted_at").eq("id", documentId).maybeSingle();
      return (data as Row) ?? null;
    },
    object: async (path) => {
      const { data } = await admin().storage.from(DOCUMENT_BUCKET).download(path);
      return data ?? null;
    },
    ...overrides,
  };
  return async function documentFileGet(request: Request, context: { params: Promise<{ id: string; name: string }> }) {
    try {
      const { id } = await context.params;
      const params = new URL(request.url).searchParams;
      const download = params.get("download") === "1";
      const secret = deps.secret();
      if (!isUuid(id) || !secret || !fileLinkValid({ secret, documentId: id, expires: params.get("exp"), sig: params.get("sig"), download })) {
        return plainPage(403, "This link has expired or is not valid. Links to your files last one minute.");
      }
      const row = await deps.row(id);
      if (!row || row.deleted_at) return plainPage(404, "This file is no longer in your case.");
      const object = await deps.object(row.storage_path);
      if (!object) return plainPage(502, "The file could not be read from storage just now. Please try again in a moment.");
      const name = row.original_name?.trim() || "document";
      return new Response(object.stream(), {
        status: 200,
        headers: { ...NO_STORE, "Content-Type": row.mime || object.type || "application/octet-stream", "Content-Disposition": disposition(download ? "attachment" : "inline", name) },
      });
    } catch {
      return plainPage(500, "The file could not be opened just now. Please try again.");
    }
  };
}

export const GET = createDocumentFileGet();
