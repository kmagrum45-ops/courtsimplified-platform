"use client";

/**
 * Case file: the whole case on one page, laid out to print or save as a PDF
 * (the browser's own "Save as PDF"), for a meeting, a duty counsel visit, or
 * the user's own binder.
 *
 * Everything on it is the user's own record: what they told us, the stage they
 * confirmed, the steps they recorded, their documents in exhibit order, the
 * deadlines worked out from dates they gave, and the titles of their drafts.
 * It adds no assessment of the case (CLAUDE.md section 3).
 *
 * Replaced /document-export and /court-package on 2026-10-04: both sat behind
 * a gate that required a "case strategy" no part of the site produces, so no
 * user could ever reach their output.
 */

import { useEffect, useState } from "react";

import { getStageLabel } from "../../../builder/_components/builderTypes";
import { readCaseDrafts } from "@/src/lib/case-system/drafts/caseDrafts";
import { findStage } from "@/src/lib/case-system/stage-map/stageMap";
import { COURT_LABELS, authHeaders, caseTitle, formatDate, useCaseHome } from "../../_components/CaseHomeContext";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  occurred_at_raw: string | null;
  occurred_at_normalized: string | null;
  date_certainty: string;
};

type DocumentRow = {
  id: string;
  exhibitNumber: number | null;
  exhibitSuffix: string | null;
  originalName: string;
  label: string | null;
  displayDate: string | null;
  dateConfirmedByUser: boolean;
};

type TimelineItem = {
  displayDate: string;
  title: string;
  source: { kind: string; description: string; rule?: string | null };
};

function whenText(event: EventRow): string {
  if (event.date_certainty === "exact" && event.occurred_at_normalized) return formatDate(`${event.occurred_at_normalized}T12:00:00`);
  if (event.occurred_at_raw) return `${event.occurred_at_raw} (approximate)`;
  return "No date recorded";
}

export default function CaseFileSection() {
  const { caseRecord, position } = useCaseHome();
  const master = (caseRecord.master_result ?? {}) as Record<string, unknown>;
  const intake = (master.intakeData ?? {}) as { facts?: string; goal?: string; yourName?: string; otherParty?: string };
  const drafts = readCaseDrafts(master);
  const step = position.stepId ? findStage(position.stepId) : undefined;

  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[] | null>(null);
  const [deadlines, setDeadlines] = useState<TimelineItem[] | null>(null);

  useEffect(() => {
    void (async () => {
      const headers = await authHeaders();
      if (!headers) return;
      const id = encodeURIComponent(caseRecord.id);
      const [eventsBody, documentsBody, timelineBody] = await Promise.all([
        fetch(`/api/cases/events?caseId=${id}`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/workspace/organisation?caseId=${id}&view=documents`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`/api/workspace/organisation?caseId=${id}&view=timeline`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      setEvents((eventsBody?.events ?? []) as EventRow[]);
      setDocuments([...((documentsBody?.dated ?? []) as DocumentRow[]), ...((documentsBody?.dateNeeded ?? []) as DocumentRow[])]);
      setDeadlines(((timelineBody?.items ?? []) as TimelineItem[]).filter((item) => item.source.kind === "computed"));
    })();
  }, [caseRecord.id]);

  const loaded = events !== null && documents !== null && deadlines !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="max-w-2xl text-sm text-[#4f685f]">
          Your case on one page. Print it, or choose &ldquo;Save as PDF&rdquo; in the print window to keep a copy.
        </p>
        <button
          type="button"
          disabled={!loaded}
          onClick={() => window.print()}
          className="rounded-xl bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loaded ? "Print or save as PDF" : "Preparing…"}
        </button>
      </div>

      <article data-testid="case-file" className="rounded-3xl border border-[#d8e6df] bg-white p-8 text-[#10231f] print:rounded-none print:border-0 print:p-0">
        <header className="border-b border-[#e3efe9] pb-4">
          <p className="text-sm text-[#4f685f]">{(caseRecord.court_path && COURT_LABELS[caseRecord.court_path]) || "Court not chosen yet"}</p>
          <h2 className="mt-1 text-2xl font-bold">{caseTitle(caseRecord)}</h2>
          <p className="mt-1 text-sm text-[#4f685f]">Printed {formatDate(new Date().toISOString())}</p>
        </header>

        <FileSection title="Where the case is">
          <p>{position.confirmedStage ? getStageLabel(position.confirmedStage) : "Not confirmed yet."}</p>
          {step ? <p className="mt-1">Exact step: {step.userQuestion}</p> : null}
        </FileSection>

        <FileSection title="Deadlines worked out from your dates">
          {deadlines?.length ? (
            <ul className="space-y-2">
              {deadlines.map((item) => (
                <li key={`${item.title}-${item.displayDate}`}>
                  <strong>{item.displayDate}</strong>: {item.title}
                  {item.source.rule ? ` (${item.source.rule})` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p>None yet. Give the dates on the Overview tab and the deadlines for your step are worked out for you.</p>
          )}
        </FileSection>

        <FileSection title="What happened, in your words">
          {intake.yourName || intake.otherParty ? (
            <p className="mb-2">
              {[intake.yourName && `You: ${intake.yourName}`, intake.otherParty && `Other side: ${intake.otherParty}`].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <p className="whitespace-pre-line">{intake.facts?.trim() || "Not recorded."}</p>
          {intake.goal?.trim() ? (
            <p className="mt-3 whitespace-pre-line">
              <strong>What you want:</strong> {intake.goal.trim()}
            </p>
          ) : null}
        </FileSection>

        <FileSection title="Steps you recorded">
          {events?.length ? (
            <ul className="space-y-2">
              {events.map((event) => (
                <li key={event.id}>
                  <strong>{whenText(event)}</strong>: {event.title}
                  {event.description ? ` — ${event.description}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p>Nothing recorded yet.</p>
          )}
        </FileSection>

        <FileSection title="Documents">
          {documents?.length ? (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e3efe9]">
                  <th className="py-1 pr-3">Exhibit</th>
                  <th className="py-1 pr-3">Document</th>
                  <th className="py-1">Date</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-[#f0f5f3]">
                    <td className="py-1 pr-3">{doc.exhibitNumber !== null ? `${doc.exhibitNumber}${doc.exhibitSuffix ?? ""}` : "—"}</td>
                    <td className="py-1 pr-3">{doc.label?.trim() || doc.originalName}</td>
                    <td className="py-1">
                      {doc.displayDate ?? "Date needed"}
                      {doc.displayDate && !doc.dateConfirmedByUser ? " (not confirmed)" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No documents saved yet.</p>
          )}
        </FileSection>

        <FileSection title="Your drafts">
          {drafts.length ? (
            <ul className="space-y-1">
              {drafts.map((draft) => (
                <li key={draft.id}>
                  {draft.title || "Untitled draft"} (updated {formatDate(draft.updatedAt)})
                </li>
              ))}
            </ul>
          ) : (
            <p>No drafts yet.</p>
          )}
        </FileSection>

        <p className="mt-8 border-t border-[#e3efe9] pt-4 text-xs text-[#4f685f]">
          Prepared with CourtSimplified from what you recorded. CourtSimplified guides you through the court process but is
          not your lawyer. Check each date and rule against its official source before you rely on it.
        </p>
      </article>
    </div>
  );
}

function FileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h3 className="text-lg font-bold">{title}</h3>
      <div className="mt-2 text-sm leading-6">{children}</div>
    </section>
  );
}
