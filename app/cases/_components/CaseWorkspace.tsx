"use client";

/**
 * The case workspace: where a litigant keeps their documents and turns them into
 * court-ready material.
 *
 * Moved from app/case-workspace/[caseId]/page.tsx on 2026-10-04. It renders
 * inside the case page now: the Documents section shows its documents,
 * communication log and exhibit book, and the Timeline section its chronology
 * and deadlines. Before the move only the builder's upload card linked here.
 *
 * *** THE ONE SENTENCE THIS SCREEN EXISTS TO HONOUR ***
 *
 * "Suggestions describe what a document is. They never say whether it helps your case."
 *
 * It is printed in the detail panel, beside every suggestion, and it is the whole
 * boundary of this feature. CLAUDE.md §3 forbids grading a case; §4 makes every
 * suggestion something the user confirms. So the panel can offer "this looks like an
 * invoice dated 3 March for $4,200" and can never offer "this is your strongest
 * document" — and the line tells the reader which of those to expect, before they
 * read the first suggestion.
 *
 * *** WHERE SUGGESTIONS COME FROM TODAY, WHICH IS NOT A MODEL ***
 *
 * No model runs on this branch. `AI_DOCUMENT_ANALYSIS_ENABLED` and the analysis behind
 * it are Slice 3. Every suggestion shown here is read from the document's own text by
 * `findDates` — local parsing, no network. The panel says so, because "AI suggestion"
 * on a screen that does no AI would be a lie, and the label is the only thing telling
 * the user how much to trust it.
 *
 * *** WHY THE TABLE HAS A "DATE NEEDED" GROUP RATHER THAN NULLS AT THE BOTTOM ***
 *
 * A document with no confirmed date is not late in the chronology; it is absent from it.
 * Sorting it to the end of a date-ordered table says it happened last. A named group
 * says what is true and what to do about it.
 *
 * Accessibility is built in rather than retrofitted: a real <nav>, a real <table> with
 * scoped headers and a caption, the detail panel as an aria-labelled region, and every
 * control reachable and labelled. AODA review is Slice 4; the cheap part is done now.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "../../../src/lib/supabase/client";
import { VerifiedServingPanel } from "../../../src/components/case-workspace/VerifiedServingPanel";
import { DOCUMENT_TYPES } from "../../../src/lib/case-workspace/documentTypes";

// ---------------------------------------------------------------------------
// The left nav. Order follows the work: gather, order, produce.
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: "documents", label: "Documents & evidence" },
  { id: "communications", label: "Communication log" },
  { id: "exhibit-book", label: "Exhibit book" },
  { id: "timeline", label: "From your documents" },
  { id: "deadlines", label: "Deadlines" },
] as const;

// "Case overview" (a duplicate of Documents) and "Stage checklist" (a
// placeholder) were dropped when this moved into the case page, which has its
// own overview with the stage and the next step.
export type SectionId = (typeof SECTIONS)[number]["id"];

type Ambiguity = { raw: string; dayFirst: string; monthFirst: string };

type DocumentView = {
  id: string;
  exhibitNumber: number | null;
  exhibitSuffix: string | null;
  originalName: string;
  label: string | null;
  type: string | null;
  date: string | null;
  datePrecision: "day" | "month" | "year";
  displayDate: string | null;
  dateConfirmedByUser: boolean;
  extractionStatus: string;
  extractionNotice: string | null;
  parties: string[];
  amount: string | null;
  notes: string | null;
  ambiguity: Ambiguity | null;
};

type TimelineItem = {
  date: string;
  displayDate: string;
  title: string;
  source:
    | { kind: "document"; exhibitLabel: string | null; description: string; dateConfirmedByUser: boolean }
    | { kind: "user-entered"; description: string }
    | { kind: "computed"; description: string; rule: string | null; ruleUrl: string | null };
  notes: string[];
};

type CommunicationEntry = {
  id: string;
  headline: string;
  displayDate: string;
  summary: string;
  noDocumentNote: string | null;
};

type ExhibitIndexEntry = {
  label: string;
  description: string;
  typeLabel: string | null;
  displayDate: string | null;
  page: number | null;
  suppliedSeparately: string | null;
};

async function authHeaders(): Promise<Record<string, string> | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }
    : null;
}

const typeLabel = (id: string | null): string | null =>
  id ? DOCUMENT_TYPES.find((type) => type.id === id)?.label ?? id : null;

// ---------------------------------------------------------------------------

export default function CaseWorkspace({
  caseId,
  sections,
  refreshKey = 0,
}: {
  caseId: string;
  /** Which parts to show, in order; the first opens first. */
  sections: SectionId[];
  /** Change it to reload, e.g. after an upload beside this list. */
  refreshKey?: number;
}) {
  const shown = SECTIONS.filter((entry) => sections.includes(entry.id));
  const [section, setSection] = useState<SectionId>(sections[0] ?? "documents");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dated, setDated] = useState<DocumentView[]>([]);
  const [dateNeeded, setDateNeeded] = useState<DocumentView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [communications, setCommunications] = useState<CommunicationEntry[]>([]);
  const [exhibitIndex, setExhibitIndex] = useState<ExhibitIndexEntry[]>([]);

  const load = useCallback(
    async (view: string) => {
      setLoading(true);
      setError(null);
      try {
        const headers = await authHeaders();
        if (!headers) {
          setError("Please sign in to open your case workspace.");
          return;
        }

        const url =
          view === "exhibit-book"
            ? `/api/workspace/exhibit-book?caseId=${caseId}&preview=1`
            : `/api/workspace/organisation?caseId=${caseId}&view=${view}`;

        const response = await fetch(url, { headers });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          setError(payload.detail || payload.error || "That did not load.");
          return;
        }

        if (view === "documents") {
          setDated(payload.dated ?? []);
          setDateNeeded(payload.dateNeeded ?? []);
        } else if (view === "timeline") {
          setTimeline(payload.items ?? []);
        } else if (view === "communications") {
          setCommunications(payload.entries ?? []);
        } else if (view === "exhibit-book") {
          setExhibitIndex(payload.index ?? []);
        }
      } catch {
        setError("That did not load. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [caseId],
  );

  useEffect(() => {
    const view = section === "deadlines" ? "timeline" : section;
    void load(view);
  }, [section, load, refreshKey]);

  const allDocuments = useMemo(() => [...dated, ...dateNeeded], [dated, dateNeeded]);
  const selected = useMemo(
    () => allDocuments.find((document) => document.id === selectedId) ?? null,
    [allDocuments, selectedId],
  );

  /** Confirms a change. The only path that writes what a document is. */
  const save = useCallback(
    async (documentId: string, change: Record<string, unknown>) => {
      const headers = await authHeaders();
      if (!headers) return;
      const response = await fetch("/api/workspace/documents", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ documentId, ...change }),
      });
      if (response.ok) await load("documents");
    },
    [load],
  );

  return (
    <div className="text-[#16302b]">
      {shown.length > 1 ? (
        <nav aria-label="Parts of this section" className="mb-4">
          <ul className="flex flex-wrap gap-2">
            {shown.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => setSection(entry.id)}
                  aria-current={section === entry.id ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2FB8AC] ${
                    section === entry.id
                      ? "bg-[#16302b] font-semibold text-white"
                      : "border border-[#d8e6df] bg-white text-[#24463d] hover:border-[#2f7d67]"
                  }`}
                >
                  {entry.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          {error ? (
            <p role="alert" className="mb-4 rounded-2xl border border-[#e6c9c9] bg-white p-4 text-sm">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="mb-4 text-sm text-[#6b8078]" aria-live="polite">
              Loading…
            </p>
          ) : null}

          {section === "documents" ? (
            <DocumentsTable
              dated={dated}
              dateNeeded={dateNeeded}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onConfirmDate={(id, iso) => void save(id, { userDate: iso, userDatePrecision: "day" })}
            />
          ) : null}

          {section === "timeline" ? <TimelineView items={timeline} /> : null}

          {section === "communications" ? <CommunicationsView entries={communications} /> : null}

          {section === "exhibit-book" ? (
            <ExhibitBookView caseId={caseId} index={exhibitIndex} />
          ) : null}

          {section === "deadlines" ? (
            <DeadlinesView items={timeline.filter((item) => item.source.kind === "computed")} />
          ) : null}
        </div>

        {/* ---- detail panel ---- */}
        {section === "documents" ? <DetailPanel document={selected} onSave={save} /> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The documents table
// ---------------------------------------------------------------------------

function StatusChip({ document }: { document: DocumentView }) {
  const { extractionStatus } = document;

  const tone =
    extractionStatus === "done"
      ? "bg-[#e8f6f4] text-[#1c5c55]"
      : extractionStatus === "needs-details"
        ? "bg-[#fdf3e3] text-[#7a5418]"
        : extractionStatus === "failed"
          ? "bg-[#fbeaea] text-[#7c2d2d]"
          : "bg-[#eef2f1] text-[#4c615b]";

  const label =
    extractionStatus === "done"
      ? "Text read"
      : extractionStatus === "needs-details"
        ? "Needs your details"
        : extractionStatus === "skipped"
          ? "No text to read"
          : extractionStatus === "failed"
            ? "Could not read"
            : "Waiting";

  return <span className={`rounded-full px-2 py-0.5 text-xs ${tone}`}>{label}</span>;
}

function DocumentRow({
  document,
  selected,
  onSelect,
  onConfirmDate,
}: {
  document: DocumentView;
  selected: boolean;
  onSelect: (id: string) => void;
  onConfirmDate: (id: string, iso: string) => void;
}) {
  return (
    <>
      <tr
        onClick={() => onSelect(document.id)}
        className={`cursor-pointer border-t border-[#e8efec] ${
          selected ? "bg-[#f1f8f6]" : "hover:bg-[#fafcfb]"
        }`}
      >
        <th scope="row" className="px-3 py-2 text-left text-sm font-semibold">
          {document.exhibitNumber !== null
            ? `${document.exhibitNumber}${document.exhibitSuffix ?? ""}`
            : "—"}
        </th>
        <td className="px-3 py-2 text-sm">
          {document.label?.trim() || document.originalName}
          {document.label?.trim() ? (
            <span className="block text-xs text-[#6b8078]">{document.originalName}</span>
          ) : null}
        </td>
        <td className="px-3 py-2">
          {document.type ? (
            <span className="rounded-full bg-[#eef2f1] px-2 py-0.5 text-xs text-[#4c615b]">
              {typeLabel(document.type)}
            </span>
          ) : (
            <span className="text-xs text-[#6b8078]">Not set</span>
          )}
        </td>
        <td className="px-3 py-2 text-sm">
          {document.displayDate ?? <span className="text-[#6b8078]">—</span>}
          {/*
            An unconfirmed date is marked on the row, not only in the detail panel. The
            table is what people scan, and a date read by a machine that looks identical
            to one the user checked is the thing that gets relied on by mistake.
          */}
          {document.displayDate && !document.dateConfirmedByUser ? (
            <span className="block text-xs text-[#7a5418]">not confirmed</span>
          ) : null}
        </td>
        <td className="px-3 py-2">
          <StatusChip document={document} />
        </td>
      </tr>

      {/*
        The inline ambiguous-date prompt. Offered, never resolved for them: "03/04/2026"
        is 3 April to most of the world and 4 March to some of it, and nothing in the
        document says which. Guessing would put a date in a chronology the document does
        not support.
      */}
      {document.ambiguity ? (
        <tr className="border-t border-[#f0e3c9] bg-[#fdfaf2]">
          <td />
          <td colSpan={4} className="px-3 py-3">
            <p className="text-sm">
              This document says <strong>{document.ambiguity.raw}</strong>. That could be
              two different dates — which one is it?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onConfirmDate(document.id, document.ambiguity!.dayFirst)}
                className="rounded-full border border-[#cfe3dd] bg-white px-3 py-1 text-sm hover:bg-[#f1f8f6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2FB8AC]"
              >
                {document.ambiguity.dayFirst}
              </button>
              <button
                type="button"
                onClick={() => onConfirmDate(document.id, document.ambiguity!.monthFirst)}
                className="rounded-full border border-[#cfe3dd] bg-white px-3 py-1 text-sm hover:bg-[#f1f8f6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2FB8AC]"
              >
                {document.ambiguity.monthFirst}
              </button>
              <button
                type="button"
                onClick={() => onSelect(document.id)}
                className="rounded-full px-3 py-1 text-sm text-[#4c615b] underline hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2FB8AC]"
              >
                Neither — I will type it
              </button>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function DocumentsTable({
  dated,
  dateNeeded,
  selectedId,
  onSelect,
  onConfirmDate,
}: {
  dated: DocumentView[];
  dateNeeded: DocumentView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConfirmDate: (id: string, iso: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-[#10231f]">Documents &amp; evidence</h2>
      <p className="mt-1 text-sm text-[#6b8078]">
        In the order they happened. {dated.length} dated, {dateNeeded.length} still need a date.
      </p>

      <table className="mt-4 w-full border-collapse">
        <caption className="sr-only">
          Your documents, sorted by the date you confirmed, with the ones still needing a
          date grouped at the end.
        </caption>
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-[#6b8078]">
            <th scope="col" className="px-3 pb-2">
              Exhibit
            </th>
            <th scope="col" className="px-3 pb-2">
              Document
            </th>
            <th scope="col" className="px-3 pb-2">
              Type
            </th>
            <th scope="col" className="px-3 pb-2">
              Date
            </th>
            <th scope="col" className="px-3 pb-2">
              Status
            </th>
          </tr>
        </thead>

        <tbody>
          {dated.map((document) => (
            <DocumentRow
              key={document.id}
              document={document}
              selected={document.id === selectedId}
              onSelect={onSelect}
              onConfirmDate={onConfirmDate}
            />
          ))}

          {dateNeeded.length > 0 ? (
            <tr>
              <th
                scope="colgroup"
                colSpan={5}
                className="px-3 pb-2 pt-5 text-left text-xs font-semibold uppercase tracking-wide text-[#7a5418]"
              >
                Date needed — {dateNeeded.length} document
                {dateNeeded.length === 1 ? "" : "s"} not yet in your timeline
              </th>
            </tr>
          ) : null}

          {dateNeeded.map((document) => (
            <DocumentRow
              key={document.id}
              document={document}
              selected={document.id === selectedId}
              onSelect={onSelect}
              onConfirmDate={onConfirmDate}
            />
          ))}
        </tbody>
      </table>

      {dated.length === 0 && dateNeeded.length === 0 ? (
        <p className="mt-4 text-sm text-[#6b8078]">
          No documents yet. Anything you upload will appear here.
        </p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// The right-hand detail panel
// ---------------------------------------------------------------------------

/**
 * The line that defines this feature's boundary. Printed verbatim, every time.
 *
 * Not a tooltip, not a help link, not shown once and dismissed. A user deciding whether
 * to trust a suggestion needs to know what kind of thing it is at the moment they read
 * it, and §3 means the answer is always the same: it describes the document and says
 * nothing about the case.
 */
const SUGGESTION_BOUNDARY =
  "Suggestions describe what a document is. They never say whether it helps your case.";

function DetailPanel({
  document,
  onSave,
}: {
  document: DocumentView | null;
  onSave: (id: string, change: Record<string, unknown>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftType, setDraftType] = useState("");
  const [draftLabel, setDraftLabel] = useState("");

  useEffect(() => {
    setEditing(false);
    setDraftDate(document?.date ?? "");
    setDraftType(document?.type ?? "");
    setDraftLabel(document?.label ?? "");
  }, [document?.id, document?.date, document?.type, document?.label]);

  if (!document) {
    return (
      <aside
        aria-label="Document details"
        className="hidden w-full shrink-0 rounded-3xl lg:w-80 border border-[#d8e6df] bg-white p-5 shadow-sm lg:block"
      >
        <p className="text-sm text-[#6b8078]">
          Choose a document to see what CourtSimplified read from it.
        </p>
      </aside>
    );
  }

  const suggestedDate = document.ambiguity
    ? null
    : !document.dateConfirmedByUser && document.date
      ? document.displayDate
      : null;

  return (
    <aside
      aria-label={`Details for ${document.label?.trim() || document.originalName}`}
      className="w-full shrink-0 rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm lg:w-80"
    >
      <h2 className="font-semibold text-[#10231f]">
        {document.label?.trim() || document.originalName}
      </h2>

      <p className="mt-3 rounded-xl bg-[#f4f8f7] p-3 text-xs leading-5 text-[#4c615b]">
        {SUGGESTION_BOUNDARY}
      </p>

      {/*
        Provenance, stated plainly. No model runs on this branch: everything offered here
        was read out of the document's own text locally. Calling it an AI suggestion when
        no AI ran would misstate how much to trust it.
      */}
      <p className="mt-2 text-xs text-[#6b8078]">
        Read from the document itself on this device. No AI analysis has run on it.
      </p>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#6b8078]">What it is</dt>
          <dd>{typeLabel(document.type) ?? <span className="text-[#6b8078]">Not set yet</span>}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#6b8078]">Date</dt>
          <dd>
            {document.displayDate ?? <span className="text-[#6b8078]">Not set yet</span>}
            {suggestedDate ? (
              <span className="block text-xs text-[#7a5418]">
                Suggested from the document — please confirm
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#6b8078]">People named</dt>
          <dd>
            {document.parties.length > 0 ? (
              document.parties.join(", ")
            ) : (
              <span className="text-[#6b8078]">None recorded</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#6b8078]">Amount</dt>
          <dd>{document.amount ?? <span className="text-[#6b8078]">None recorded</span>}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[#6b8078]">Description</dt>
          <dd>{document.notes ?? <span className="text-[#6b8078]">None recorded</span>}</dd>
        </div>
      </dl>

      {document.extractionNotice ? (
        <p className="mt-4 rounded-xl bg-[#fdf3e3] p-3 text-xs leading-5 text-[#7a5418]">
          {document.extractionNotice}
        </p>
      ) : null}

      {editing ? (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave(document.id, {
              userDate: draftDate || null,
              userDatePrecision: "day",
              userType: draftType || null,
              userLabel: draftLabel || null,
            }).then(() => setEditing(false));
          }}
        >
          <label className="block text-xs uppercase tracking-wide text-[#6b8078]">
            Date
            <input
              type="date"
              value={draftDate}
              onChange={(event) => setDraftDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[#cfe3dd] px-2 py-1 text-sm text-[#16302b]"
            />
          </label>

          <label className="block text-xs uppercase tracking-wide text-[#6b8078]">
            What it is
            <select
              value={draftType}
              onChange={(event) => setDraftType(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[#cfe3dd] px-2 py-1 text-sm text-[#16302b]"
            >
              <option value="">Not set</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs uppercase tracking-wide text-[#6b8078]">
            Your label
            <input
              type="text"
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[#cfe3dd] px-2 py-1 text-sm text-[#16302b]"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-full bg-[#2FB8AC] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#259E94] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2FB8AC]"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full px-3 py-1.5 text-sm underline hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2FB8AC]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex gap-2">
          {/*
            Confirm and Edit, never "apply". Confirm records what is shown as the user's
            own; Edit lets them correct it first. Both go through the same PATCH, which is
            the only thing in this product that writes what a document is.
          */}
          <button
            type="button"
            onClick={() =>
              void onSave(document.id, {
                userDate: document.date,
                userDatePrecision: document.datePrecision,
                userType: document.type,
              })
            }
            className="rounded-full bg-[#2FB8AC] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#259E94] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2FB8AC]"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full border border-[#cfe3dd] px-4 py-1.5 text-sm hover:bg-[#f1f8f6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2FB8AC]"
          >
            Edit
          </button>
        </div>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// The chronology
// ---------------------------------------------------------------------------

function SourceTag({ source }: { source: TimelineItem["source"] }) {
  /*
   * Every item carries one. Three different kinds of claim land on one line — a date on
   * paper, something the user remembers, and a date nobody has seen that was counted from
   * a rule — and presented identically the computed one looks the most solid and is the
   * least.
   */
  const tone =
    source.kind === "document"
      ? "bg-[#e8f6f4] text-[#1c5c55]"
      : source.kind === "user-entered"
        ? "bg-[#eef2f1] text-[#4c615b]"
        : "bg-[#eef0f8] text-[#3c4478]";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${tone}`}>
      {source.description}
      {source.kind === "computed" && source.ruleUrl ? (
        <a
          href={source.ruleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          check the rule yourself
        </a>
      ) : null}
    </span>
  );
}

function TimelineView({ items }: { items: TimelineItem[] }) {
  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-[#10231f]">Timeline</h2>
      <p className="mt-1 text-sm text-[#6b8078]">
        Every entry says where it came from.
      </p>

      <ol className="mt-4 space-y-4">
        {items.map((item, index) => (
          <li key={`${item.date}-${index}`} className="border-l-2 border-[#d8e6df] pl-4">
            <p className="text-xs text-[#6b8078]">{item.displayDate}</p>
            <p className="text-sm font-medium">{item.title}</p>
            <div className="mt-1">
              <SourceTag source={item.source} />
              {item.source.kind === "document" && item.source.exhibitLabel ? (
                <span className="ml-2 text-xs text-[#6b8078]">
                  Exhibit {item.source.exhibitLabel}
                </span>
              ) : null}
            </div>
            {item.notes.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs leading-5 text-[#4c615b]">
                {item.notes.map((note, noteIndex) => (
                  <li key={noteIndex}>{note}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-[#6b8078]">
          Nothing dated yet. A document gets a place here once you confirm its date.
        </p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Deadlines — the same computed items, on their own
// ---------------------------------------------------------------------------

function DeadlinesView({ items }: { items: TimelineItem[] }) {
  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-[#10231f]">Deadlines</h2>
      <p className="mt-1 text-sm text-[#6b8078]">
        Worked out by counting from the dates you gave us. Each one shows its working.
      </p>

      <ul className="mt-4 space-y-4">
        {items.map((item, index) => (
          <li key={index} className="rounded-2xl bg-[#fafcfb] p-4">
            <p className="text-sm font-medium">{item.title}</p>
            <p className="mt-1 text-sm">{item.displayDate}</p>
            <div className="mt-2">
              <SourceTag source={item.source} />
            </div>
            <ul className="mt-2 space-y-1 text-xs leading-5 text-[#4c615b]">
              {item.notes.map((note, noteIndex) => (
                <li key={noteIndex}>{note}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-[#6b8078]">
          No deadlines can be worked out yet. They appear once your case has a stage and you
          have given us the date each period runs from.
        </p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// The communication log
// ---------------------------------------------------------------------------

function CommunicationsView({ entries }: { entries: CommunicationEntry[] }) {
  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-[#10231f]">Communication log</h2>
      <p className="mt-1 text-sm text-[#6b8078]">
        What was said, when, and whether a document goes with it.
      </p>

      <ul className="mt-4 divide-y divide-[#e8efec]">
        {entries.map((entry) => (
          <li key={entry.id} className="py-3">
            <p className="text-xs text-[#6b8078]">{entry.displayDate}</p>
            <p className="text-sm font-medium">{entry.headline}</p>
            <p className="text-sm">{entry.summary}</p>
            {entry.noDocumentNote ? (
              <p className="mt-1 text-xs text-[#6b8078]">{entry.noDocumentNote}</p>
            ) : null}
          </li>
        ))}
      </ul>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-[#6b8078]">Nothing logged yet.</p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------
// The exhibit book — preview beside the verified serving content
// ---------------------------------------------------------------------------

function ExhibitBookView({ caseId, index }: { caseId: string; index: ExhibitIndexEntry[] }) {
  const [building, setBuilding] = useState(false);

  const download = useCallback(async () => {
    setBuilding(true);
    try {
      const headers = await authHeaders();
      if (!headers) return;
      const response = await fetch(`/api/workspace/exhibit-book?caseId=${caseId}`, { headers });
      if (!response.ok) return;
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = "exhibit-book.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setBuilding(false);
    }
  }, [caseId]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <section className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold text-[#10231f]">Exhibit book</h2>
          <button
            type="button"
            onClick={() => void download()}
            disabled={building || index.length === 0}
            className="rounded-full bg-[#2FB8AC] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#259E94] disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2FB8AC]"
          >
            {building ? "Building…" : "Build the book"}
          </button>
        </div>

        <p className="mt-1 text-sm text-[#6b8078]">
          Cover page and index. Page numbers are filled in when the book is built, from the
          pages as assembled.
        </p>

        <table className="mt-4 w-full border-collapse">
          <caption className="sr-only">The exhibit index: label, description, date and page.</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[#6b8078]">
              <th scope="col" className="px-3 pb-2">Exhibit</th>
              <th scope="col" className="px-3 pb-2">Document</th>
              <th scope="col" className="px-3 pb-2">Date</th>
              <th scope="col" className="px-3 pb-2">Page</th>
            </tr>
          </thead>
          <tbody>
            {index.map((entry) => (
              <tr key={entry.label} className="border-t border-[#e8efec]">
                <th scope="row" className="px-3 py-2 text-left text-sm font-semibold">
                  {entry.label}
                </th>
                <td className="px-3 py-2 text-sm">
                  {entry.description}
                  {entry.typeLabel ? (
                    <span className="block text-xs text-[#6b8078]">{entry.typeLabel}</span>
                  ) : null}
                  {entry.suppliedSeparately ? (
                    <span className="block text-xs text-[#7a5418]">{entry.suppliedSeparately}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-sm">{entry.displayDate ?? "—"}</td>
                <td className="px-3 py-2 text-sm">{entry.page ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {index.length === 0 ? (
          <p className="mt-4 text-sm text-[#6b8078]">
            No exhibits yet. Give your documents exhibit numbers and they will appear here.
          </p>
        ) : null}
      </section>

      {/*
        The verified serving-documents content, beside the book.
        Stage-independent by construction: the panel takes no stage, case id or claim type,
        so it renders the same thing whatever position the case is in — which is right,
        because service obligations recur throughout a case.
      */}
      <VerifiedServingPanel className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm" />
    </div>
  );
}
