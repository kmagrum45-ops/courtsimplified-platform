"use client";

import { useRef, useState } from "react";

import { supabase } from "../../../src/lib/supabase/client";
import { COURT_DECISION_TYPE, DECISION_CAUTION, DECISION_SEARCH_HELP } from "../../../src/lib/case-workspace/courtDecision";

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

/** Uploads one file to the case. Returns the new document's id. */
async function uploadOne(caseId: string, file: File): Promise<string> {
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
  return String(started.documentId);
}

/**
 * Marks an uploaded file as a court decision from CanLII (2026-10-07), through
 * the same PATCH every document type goes through.
 *
 * If it cannot be marked (before the database update that adds the type), the
 * file is removed again rather than left behind as ordinary evidence, where it
 * would show without "Source: CanLII" and could reach the timeline or the
 * exhibit book (CanLII Terms s. 4.2).
 */
async function removeUpload(documentId: string): Promise<boolean> {
  const response = await fetch(`/api/workspace/documents?documentId=${encodeURIComponent(documentId)}`, {
    method: "DELETE",
    headers: await authHeader(),
  }).catch(() => null);
  return Boolean(response?.ok);
}

async function markAsDecision(documentId: string): Promise<string | null> {
  const response = await fetch("/api/workspace/documents", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ documentId, userType: COURT_DECISION_TYPE }),
  }).catch(() => null);
  if (response?.ok) return null;
  const removed = await removeUpload(documentId);
  return removed
    ? "Court decisions cannot be added just yet, so this file was not kept. Please try again later."
    : "This file could not be marked as a court decision. Please delete it from your documents and try again later.";
}

export default function EvidenceUploadCard({
  caseId,
  onUploaded,
  showDocumentsLink = true,
}: {
  caseId: string | null;
  /** Called after a batch finishes, so a document list beside the card can refresh. */
  onUploaded?: () => void;
  /** Off on the case page's Documents section, where the list is right below. */
  showDocumentsLink?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const decisionInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [busy, setBusy] = useState(false);

  /** One decision at a time, from a file the person downloaded for their own case. */
  async function handleDecision(files: FileList | null) {
    const file = files?.[0];
    if (!caseId || !file) return;
    setBusy(true);
    setRows((current) => [{ name: file.name, state: "uploading" as const }, ...current]);
    try {
      const documentId = await uploadOne(caseId, file);
      const problem = await markAsDecision(documentId);
      setRows((current) =>
        current.map((row) =>
          row.name === file.name && row.state === "uploading"
            ? problem
              ? { ...row, state: "failed", message: problem }
              : { ...row, state: "done", message: "added as a court decision" }
            : row,
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "That file could not be uploaded.";
      setRows((current) =>
        current.map((row) => (row.name === file.name && row.state === "uploading" ? { ...row, state: "failed", message } : row)),
      );
    }
    setBusy(false);
    if (decisionInput.current) decisionInput.current.value = "";
    onUploaded?.();
  }

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
    onUploaded?.();
  }

  return (
    <section data-testid="evidence-upload" className="rounded-3xl border border-[#d8e6df] bg-white p-6">
      <h2 className="text-xl font-bold text-[#10231f]">Add your documents and photos</h2>
      <p className="mt-2 text-sm text-[#4d675f]">
        Receipts, photos, messages, invoices, contracts: anything that shows what happened. You can add
        PDFs, pictures and Word files, up to 25 MB each. Files you add here are uploaded and stored
        privately with your case, and only you can see them.
        {showDocumentsLink
          ? " (The document list in the intake did not upload anything; this is where files are actually saved.)"
          : ""}
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
                    {row.state === "uploading" ? "uploading…" : row.state === "done" ? row.message || "added" : row.message}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {/*
            A court decision the person downloaded from CanLII for their own
            case (2026-10-07). One file at a time, never a batch: CanLII's Terms
            (s. 5.1) forbid systematic downloading, and nothing here invites it.
          */}
          <div className="mt-5 border-t border-[#e8efec] pt-4">
            <h3 className="text-sm font-semibold text-[#10231f]">Add a court decision from CanLII</h3>
            <p className="mt-1 text-sm text-[#4d675f]">
              If you found a decision on CanLII that you want to read for your case, download it there and add it
              here. It stays private in this case and is always shown with &ldquo;Source: CanLII&rdquo;.
            </p>
            <p className="mt-1 text-xs leading-5 text-[#6b8078]">{DECISION_SEARCH_HELP}</p>
            <p className="mt-1 text-xs leading-5 text-[#7a5418]">{DECISION_CAUTION}</p>
            <input
              ref={decisionInput}
              type="file"
              accept=".pdf,.doc,.docx,.rtf,.txt,application/pdf,text/plain"
              className="hidden"
              onChange={(event) => void handleDecision(event.target.files)}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => decisionInput.current?.click()}
              className="mt-3 rounded-xl border border-[#2f7d67] px-4 py-2 text-sm font-semibold text-[#2f7d67] disabled:opacity-50"
            >
              Choose a court decision
            </button>
          </div>
          {showDocumentsLink ? (
            <a
              href={`/cases/${encodeURIComponent(caseId)}/documents`}
              className="mt-4 inline-block text-sm font-semibold text-[#2f7d67] underline"
            >
              See and organize all your documents
            </a>
          ) : null}
        </>
      )}
    </section>
  );
}
