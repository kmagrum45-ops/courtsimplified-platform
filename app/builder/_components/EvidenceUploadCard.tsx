"use client";

import { useRef, useState } from "react";

import { supabase } from "../../../src/lib/supabase/client";

/**
 * "Add your documents and photos" on the case summary.
 *
 * WHY (2026-09-30). The site owner finished an intake, read the summary, and
 * had nowhere to put the dry-cleaning receipt and the photos he had just
 * listed. The case workspace page said "Anything you upload will appear here",
 * but no screen had an upload control: the server half (upload-url, then
 * register) was built and the client half never was.
 *
 * This is that client half, using the server's own three steps unchanged:
 *   1. POST /api/workspace/documents/upload-url with the file's first bytes, so
 *      the type is checked BEFORE anything is stored;
 *   2. upload the file to the signed URL that route returns;
 *   3. POST /api/workspace/documents, which reads the stored object back and
 *      decides from its real bytes (and removes it if it is not acceptable).
 * The storage path is built by the server from the signed-in user and the
 * owned case; nothing here names a path. No model is called.
 */

const SNIFF_BYTES = 64; // matches fileValidation.ts SNIFF_BYTES

const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.tif,.tiff,.webp,.heic,.doc,.docx,.rtf,.txt," +
  "application/pdf,image/*,text/plain";

type UploadRow = { name: string; state: "uploading" | "done" | "failed"; message?: string };

async function authHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function headBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function uploadOne(caseId: string, file: File): Promise<void> {
  const headers = { "Content-Type": "application/json", ...(await authHeader()) };

  const start = await fetch("/api/workspace/documents/upload-url", {
    method: "POST",
    headers,
    body: JSON.stringify({
      caseId,
      originalName: file.name,
      declaredMime: file.type || null,
      sizeBytes: file.size,
      head: await headBase64(file),
    }),
  });
  const started = await start.json().catch(() => ({}));
  if (!start.ok || !started.success) {
    throw new Error(started.detail || started.error || "That file could not be uploaded.");
  }

  const { error: uploadError } = await supabase.storage
    .from(started.bucket)
    .uploadToSignedUrl(started.storagePath, started.token, file, {
      contentType: started.storedMime || file.type || undefined,
    });
  if (uploadError) throw new Error("The upload did not finish. Please try again.");

  const register = await fetch("/api/workspace/documents", {
    method: "POST",
    headers,
    body: JSON.stringify({
      caseId,
      documentId: started.documentId,
      originalName: file.name,
      declaredMime: file.type || null,
    }),
  });
  const registered = await register.json().catch(() => ({}));
  if (!register.ok || registered.success === false) {
    throw new Error(registered.detail || registered.error || "That file could not be saved.");
  }
}

export default function EvidenceUploadCard({ caseId }: { caseId: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!caseId || !files || files.length === 0) return;
    setBusy(true);
    const list = Array.from(files);
    setRows((current) => [...list.map((file) => ({ name: file.name, state: "uploading" as const })), ...current]);
    for (const file of list) {
      try {
        await uploadOne(caseId, file);
        setRows((current) => current.map((row) => (row.name === file.name && row.state === "uploading" ? { ...row, state: "done" } : row)));
      } catch (error) {
        const message = error instanceof Error ? error.message : "That file could not be uploaded.";
        setRows((current) =>
          current.map((row) => (row.name === file.name && row.state === "uploading" ? { ...row, state: "failed", message } : row)),
        );
      }
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <section data-testid="evidence-upload" className="rounded-3xl border border-[#d8e6df] bg-white p-6">
      <h2 className="text-xl font-bold text-[#10231f]">Add your documents and photos</h2>
      <p className="mt-2 text-sm text-[#4d675f]">
        Receipts, photos, messages, invoices, contracts: anything that shows what happened. You can add
        PDFs, pictures and Word files, up to 25 MB each. They are stored with your case and only you can
        see them.
      </p>

      {!caseId ? (
        <p className="mt-3 text-sm text-[#4d675f]">Save your case first, then you can add files to it.</p>
      ) : (
        <>
          <input
            ref={input}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(event) => void handleFiles(event.target.files)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="mt-4 rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Uploading..." : "Choose files"}
          </button>
          {rows.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm">
              {rows.map((row, index) => (
                <li key={`${row.name}-${index}`} className="rounded-xl border border-[#d8e6df] px-3 py-2">
                  <span className="font-semibold text-[#16302b]">{row.name}</span>{" "}
                  <span className={row.state === "failed" ? "text-[#a63b3b]" : "text-[#4d675f]"}>
                    {row.state === "uploading" ? "uploading…" : row.state === "done" ? "added" : row.message}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <a
            href={`/case-workspace/${caseId}`}
            className="mt-4 inline-block text-sm font-semibold text-[#2f7d67] underline"
          >
            See and organize all your documents
          </a>
        </>
      )}
    </section>
  );
}
