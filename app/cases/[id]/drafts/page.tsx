"use client";

/**
 * Drafts: the user's own working documents for this case, saved on the case.
 *
 * Each draft starts from something the user already gave us — their timeline,
 * their story, their intake answers — or from nothing, and is theirs to edit.
 * Nothing here is written by a model and nothing here judges the case. The
 * optional spelling check (TidyWordingReview) only offers fixes the user
 * accepts one by one.
 *
 * Replaced /document-workspace and /ai-drafting-assistant on 2026-10-04. Those
 * kept a single draft in this browser only, generated mostly boilerplate from
 * an evidence store nothing fills, and offered regex "rewrites" that changed
 * meaning ("I think" became "The available information suggests").
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import TidyWordingReview from "../../../builder/_components/TidyWordingReview";
import ScopePreviewNotice from "../../../builder/_components/ScopePreviewNotice";
import {
  DRAFT_KIND_LABELS,
  affidavitOutlineDraft,
  blankDraft,
  chronologyDraft,
  draftAsPlainText,
  draftAsWordHtml,
  importLegacyWorkspaceDocument,
  newId,
  readCaseDrafts,
  yourStoryDraft,
  type CaseDraft,
  type IntakeStory,
  type TimelineEntry,
} from "@/src/lib/case-system/drafts/caseDrafts";
import { startingDocumentDraft, startingDocumentTitle, type StartingDocumentIntake } from "@/src/lib/case-system/drafts/startingDocumentDraft";
import { respondingDocumentDraft, respondingDocumentTitle, type RespondingDocumentIntake } from "@/src/lib/case-system/drafts/respondingDocumentDraft";
import { COURT_DOCUMENT_DRAFTING_ENABLED } from "@/src/lib/case-system/policy/courtDocumentDrafting";
import { FORM_COMPLETION_PAUSED } from "@/src/lib/content-library/phaseScope";
import { originatingDocumentRecorded } from "../../../builder/_components/respondingSide";
import type { StoredCaseData } from "../../../builder/_components/builderTypes";
import { authHeaders, formatDate, useCaseHome } from "../../_components/CaseHomeContext";

type SaveState = "idle" | "saving" | "saved" | "failed";

/** The key the old browser-only drafting page used (workflowCaseLoader, removed 2026-10-04). */
const legacyKey = (caseId: string) => `courtSimplifiedWorkspaceDocument:case:${caseId}`;

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const fileName = (title: string) => (title.trim() || "draft").replace(/[^\w\- ]+/g, "").replace(/\s+/g, "-").slice(0, 80) || "draft";

export default function CaseDraftsSection() {
  const { caseRecord, reload, responding, courtPath } = useCaseHome();
  const caseId = caseRecord.id;
  const master = (caseRecord.master_result ?? {}) as Record<string, unknown>;

  const [drafts, setDrafts] = useState<CaseDraft[]>(() => readCaseDrafts(master));
  const [openId, setOpenId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string>("");
  const [message, setMessage] = useState("");
  const [timeline, setTimeline] = useState<TimelineEntry[] | null>(null);
  const [legacy, setLegacy] = useState<CaseDraft | null>(null);
  const pending = useRef<CaseDraft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useMemo(() => drafts.find((draft) => draft.id === openId) ?? null, [drafts, openId]);

  // ?open=<id> from the builder's "create draft" buttons.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("open");
    if (requested && drafts.some((draft) => draft.id === requested)) setOpenId(requested);
    try {
      const raw = localStorage.getItem(legacyKey(caseId));
      if (raw) setLegacy(importLegacyWorkspaceDocument(JSON.parse(raw), new Date()));
    } catch {
      setLegacy(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The user's own record, for the chronology and affidavit starting points.
  useEffect(() => {
    void (async () => {
      const headers = await authHeaders();
      if (!headers) return setTimeline([]);
      const [events, documents] = await Promise.all([
        fetch(`/api/cases/events?caseId=${encodeURIComponent(caseId)}`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/workspace/organisation?caseId=${encodeURIComponent(caseId)}&view=documents`, { headers })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      const entries: TimelineEntry[] = [];
      for (const event of (events?.events ?? []) as Array<Record<string, unknown>>) {
        entries.push({
          date: event.date_certainty === "exact" && typeof event.occurred_at_normalized === "string" ? event.occurred_at_normalized : null,
          when: typeof event.occurred_at_raw === "string" ? event.occurred_at_raw : null,
          title: String(event.title ?? ""),
          detail: typeof event.description === "string" ? event.description : null,
          source: "timeline",
        });
      }
      for (const doc of (documents?.dated ?? []) as Array<Record<string, unknown>>) {
        if (!doc.dateConfirmedByUser || typeof doc.date !== "string" || doc.datePrecision !== "day") continue;
        const exhibit = doc.exhibitNumber !== null && doc.exhibitNumber !== undefined ? `Exhibit ${doc.exhibitNumber}${doc.exhibitSuffix ?? ""}: ` : "";
        entries.push({
          date: doc.date,
          when: null,
          title: `${exhibit}${String((doc.label as string) || doc.originalName || "Document")}`,
          detail: null,
          source: "document",
        });
      }
      setTimeline(entries);
    })();
  }, [caseId]);

  const persist = useCallback(
    async (draft: CaseDraft): Promise<boolean> => {
      setSaveState("saving");
      const headers = await authHeaders();
      const response = headers
        ? await fetch("/api/cases/drafts", { method: "POST", headers, body: JSON.stringify({ caseId, draft }) }).catch(() => null)
        : null;
      if (!response?.ok) {
        const body = response ? await response.json().catch(() => ({})) : {};
        setSaveState("failed");
        setMessage(typeof body.error === "string" ? body.error : "Not saved. Check your connection and try again.");
        return false;
      }
      setSaveState("saved");
      setSavedAt(new Date().toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" }));
      setMessage("");
      return true;
    },
    [caseId],
  );

  /** Edits apply at once on screen and are saved a moment after typing stops. */
  function change(next: CaseDraft) {
    setDrafts((current) => current.map((draft) => (draft.id === next.id ? next : draft)));
    pending.current = next;
    setSaveState("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (pending.current) void persist(pending.current);
      pending.current = null;
    }, 1200);
  }

  async function flush() {
    if (timer.current) clearTimeout(timer.current);
    if (pending.current) {
      const draft = pending.current;
      pending.current = null;
      await persist(draft);
    }
  }

  async function create(draft: CaseDraft) {
    if (await persist(draft)) {
      setDrafts((current) => [draft, ...current.filter((existing) => existing.id !== draft.id)]);
      setOpenId(draft.id);
      void reload();
    }
  }

  async function remove(draft: CaseDraft) {
    if (!window.confirm(`Delete "${draft.title || "Untitled draft"}"? This cannot be undone.`)) return;
    const headers = await authHeaders();
    const response = headers
      ? await fetch("/api/cases/drafts", { method: "DELETE", headers, body: JSON.stringify({ caseId, draftId: draft.id }) }).catch(() => null)
      : null;
    if (!response?.ok) {
      setMessage("That draft could not be deleted. Please try again.");
      return;
    }
    setDrafts((current) => current.filter((existing) => existing.id !== draft.id));
    setOpenId(null);
    void reload();
  }

  const intake = (master.intakeData ?? {}) as IntakeStory;

  // The document that starts a case, offered only where the builder offers it:
  // drafting in scope, not paused, not already filed, and not to the side
  // responding to a case someone else started.
  const startingTitle = startingDocumentTitle(courtPath);
  const offerStartingDocument =
    COURT_DOCUMENT_DRAFTING_ENABLED &&
    !FORM_COMPLETION_PAUSED &&
    Boolean(startingTitle) &&
    !responding &&
    !originatingDocumentRecorded({
      courtPath: courtPath ?? "",
      caseData: (master.intakeData as StoredCaseData | undefined) ?? null,
      intakeFacts: (master.intakeFacts as Record<string, unknown> | undefined) ?? null,
    });

  // The document that RESPONDS to a case, offered to the side responding
  // (respondingDocumentDraft.ts), under the same drafting gates.
  const respondingTitle = respondingDocumentTitle(courtPath);
  const offerRespondingDocument =
    COURT_DOCUMENT_DRAFTING_ENABLED && !FORM_COMPLETION_PAUSED && Boolean(respondingTitle) && responding;

  if (open) {
    return (
      <DraftEditor
        draft={open}
        saveState={saveState}
        savedAt={savedAt}
        message={message}
        onChange={change}
        onBack={async () => {
          await flush();
          setOpenId(null);
          void reload();
        }}
        onDelete={() => void remove(open)}
        onRetry={() => void persist(open)}
      />
    );
  }

  const now = () => new Date();

  return (
    <div className="space-y-6">
      {message ? <p role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{message}</p> : null}

      {legacy ? (
        <section className="rounded-3xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
          <p className="font-semibold text-[#10231f]">A draft from the old drafting page is saved in this browser</p>
          <p className="mt-1 text-sm text-[#4f685f]">
            &ldquo;{legacy.title}&rdquo; was kept only on this device. Save it to your case so you can open it anywhere.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={async () => {
                await create(legacy);
                try {
                  localStorage.removeItem(legacyKey(caseId));
                } catch {
                  // Saved to the case either way.
                }
                setLegacy(null);
              }}
              className="rounded-xl bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white"
            >
              Save it to this case
            </button>
            <button type="button" onClick={() => setLegacy(null)} className="rounded-xl border border-[#d8e6df] bg-white px-4 py-2 text-sm font-semibold text-[#24463d]">
              Not now
            </button>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="start-draft-heading" className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
        <h2 id="start-draft-heading" className="text-xl font-bold text-[#10231f]">Start a draft</h2>
        <p className="mt-1 text-sm text-[#4f685f]">
          Each one starts from what you have already told us, laid out under plain headings for you to edit. It is saved to
          your case, and you can download it for Word.
        </p>
        {offerStartingDocument || offerRespondingDocument ? (
          <div className="mt-3">
            <ScopePreviewNotice scope="formCompletion" />
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <StartOption
            title="Chronology"
            description={
              timeline === null
                ? "What happened, in date order, from your timeline and dated documents."
                : `What happened, in date order: ${timeline.length} item${timeline.length === 1 ? "" : "s"} from your timeline and dated documents.`
            }
            onClick={() => void create(chronologyDraft(timeline ?? [], now()))}
            disabled={timeline === null}
          />
          <StartOption
            title="Your story"
            description="What happened and what you want, in the words you used when you told us."
            onClick={() => void create(yourStoryDraft(intake, now()))}
          />
          <StartOption
            title="Affidavit outline"
            description="Numbered statements, one per thing that happened, for you to rewrite in your own words."
            onClick={() => void create(affidavitOutlineDraft(timeline ?? [], now()))}
            disabled={timeline === null}
          />
          {offerStartingDocument && startingTitle ? (
            <StartOption
              title={startingTitle.replace(/^Draft /, "")}
              description="The document that starts your case, laid out from your answers, to compare with the official form."
              onClick={() => {
                const draft = startingDocumentDraft(courtPath, master.intakeData as StartingDocumentIntake, now());
                if (draft) void create(draft);
              }}
            />
          ) : null}
          {offerRespondingDocument && respondingTitle ? (
            <StartOption
              title={respondingTitle.replace(/^Draft /, "")}
              description="Your response to the case, laid out from your answers, to compare with the official form."
              onClick={() => {
                const draft = respondingDocumentDraft(courtPath, master.intakeData as RespondingDocumentIntake, now());
                if (draft) void create(draft);
              }}
            />
          ) : null}
          <StartOption title="Blank draft" description="Start from an empty page." onClick={() => void create(blankDraft(now()))} />
        </div>
      </section>

      <section aria-labelledby="your-drafts-heading">
        <h2 id="your-drafts-heading" className="text-xl font-bold text-[#10231f]">Your drafts</h2>
        {drafts.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-[#d8e6df] bg-white p-4 text-sm text-[#4f685f]">No drafts yet.</p>
        ) : (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {drafts.map((draft) => {
              const checked = draft.sections.filter((part) => part.reviewed).length;
              return (
                <li key={draft.id}>
                  <button
                    type="button"
                    data-testid="case-draft"
                    onClick={() => setOpenId(draft.id)}
                    className="block w-full rounded-3xl border border-[#d8e6df] bg-white p-5 text-left transition hover:border-[#2f7d67]"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">{DRAFT_KIND_LABELS[draft.kind]}</p>
                    <p className="mt-1 font-bold text-[#10231f]">{draft.title || "Untitled draft"}</p>
                    <p className="mt-2 text-xs text-[#4f685f]">
                      Updated {formatDate(draft.updatedAt)} · {checked} of {draft.sections.length} part
                      {draft.sections.length === 1 ? "" : "s"} checked by you
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function StartOption({
  title,
  description,
  onClick,
  disabled = false,
}: {
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-left transition hover:border-[#2f7d67] disabled:opacity-60"
    >
      <p className="font-semibold text-[#10231f]">{title}</p>
      <p className="mt-1 text-sm text-[#4f685f]">{description}</p>
    </button>
  );
}

function DraftEditor({
  draft,
  saveState,
  savedAt,
  message,
  onChange,
  onBack,
  onDelete,
  onRetry,
}: {
  draft: CaseDraft;
  saveState: SaveState;
  savedAt: string;
  message: string;
  onChange: (draft: CaseDraft) => void;
  onBack: () => void;
  onDelete: () => void;
  onRetry: () => void;
}) {
  const setSection = (index: number, patch: Partial<CaseDraft["sections"][number]>) =>
    onChange({ ...draft, sections: draft.sections.map((part, i) => (i === index ? { ...part, ...patch } : part)) });
  const move = (index: number, by: number) => {
    const target = index + by;
    if (target < 0 || target >= draft.sections.length) return;
    const sections = [...draft.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    onChange({ ...draft, sections });
  };

  return (
    <div className="space-y-5" data-testid="draft-editor">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="text-sm font-semibold text-[#2f7d67] underline">
          ← All drafts
        </button>
        <p className="text-sm text-[#4f685f]" aria-live="polite">
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? `Saved to your case${savedAt ? ` at ${savedAt}` : ""}` : saveState === "failed" ? "" : "Changes save automatically"}
        </p>
      </div>

      {saveState === "failed" ? (
        <p role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          {message || "Not saved."}{" "}
          <button type="button" onClick={onRetry} className="font-semibold underline">
            Try again
          </button>
        </p>
      ) : null}

      <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">{DRAFT_KIND_LABELS[draft.kind]}</span>
          <input
            aria-label="Draft title"
            value={draft.title}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
            className="mt-1 w-full rounded-xl border border-transparent px-2 py-1 text-2xl font-bold text-[#10231f] hover:border-[#d8e6df] focus:border-[#2f7d67] focus:outline-none"
          />
        </label>

        <ol className="mt-5 space-y-5">
          {draft.sections.map((part, index) => (
            <li key={part.id} className="rounded-2xl border border-[#e3efe9] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  aria-label={`Heading for part ${index + 1}`}
                  placeholder="Heading (optional)"
                  value={part.heading}
                  onChange={(event) => setSection(index, { heading: event.target.value })}
                  className="min-w-0 flex-1 rounded-xl border border-[#d8e6df] px-3 py-2 font-semibold"
                />
                <button type="button" aria-label="Move up" onClick={() => move(index, -1)} disabled={index === 0} className="rounded-lg border border-[#d8e6df] px-2 py-1 text-sm disabled:opacity-40">↑</button>
                <button type="button" aria-label="Move down" onClick={() => move(index, 1)} disabled={index === draft.sections.length - 1} className="rounded-lg border border-[#d8e6df] px-2 py-1 text-sm disabled:opacity-40">↓</button>
                <button
                  type="button"
                  aria-label="Remove this part"
                  onClick={() => {
                    if (part.text.trim() && !window.confirm("Remove this part and its text?")) return;
                    onChange({ ...draft, sections: draft.sections.filter((_, i) => i !== index) });
                  }}
                  className="rounded-lg border border-[#d8e6df] px-2 py-1 text-sm"
                >
                  Remove
                </button>
              </div>
              <textarea
                aria-label={`Text for part ${index + 1}`}
                value={part.text}
                rows={Math.min(24, Math.max(4, part.text.split("\n").length + 1))}
                onChange={(event) => setSection(index, { text: event.target.value })}
                className="mt-3 w-full rounded-xl border border-[#d8e6df] px-3 py-2 leading-7"
              />
              <label className="mt-2 inline-flex items-center gap-2 text-sm text-[#24463d]">
                <input type="checkbox" checked={part.reviewed} onChange={(event) => setSection(index, { reviewed: event.target.checked })} />
                I have checked this part
              </label>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => onChange({ ...draft, sections: [...draft.sections, { id: newId("part"), heading: "", text: "", reviewed: false }] })}
          className="mt-4 rounded-xl border border-[#2f7d67] px-4 py-2 text-sm font-semibold text-[#2f7d67]"
        >
          Add a part
        </button>
      </section>

      <TidyWordingReview
        fields={draft.sections.map((part, index) => ({
          key: part.id,
          label: part.heading || `Part ${index + 1}`,
          value: part.text,
          setValue: (next: string) => setSection(index, { text: next }),
        }))}
      />

      <section className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => download(`${fileName(draft.title)}.doc`, draftAsWordHtml(draft), "application/msword")}
          className="rounded-xl bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white"
        >
          Download for Word
        </button>
        <button
          type="button"
          onClick={() => download(`${fileName(draft.title)}.txt`, draftAsPlainText(draft), "text/plain;charset=utf-8")}
          className="rounded-xl border border-[#2f7d67] bg-white px-4 py-2 text-sm font-semibold text-[#2f7d67]"
        >
          Download as text
        </button>
        <button
          type="button"
          onClick={() => {
            const printWindow = window.open("", "_blank");
            if (!printWindow) return;
            printWindow.document.write(draftAsWordHtml(draft));
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
          }}
          className="rounded-xl border border-[#d8e6df] bg-white px-4 py-2 text-sm font-semibold text-[#24463d]"
        >
          Print
        </button>
        <button type="button" onClick={onDelete} className="ml-auto rounded-xl border border-[#e6c9c9] bg-white px-4 py-2 text-sm font-semibold text-[#7c2d2d]">
          Delete draft
        </button>
      </section>
    </div>
  );
}
