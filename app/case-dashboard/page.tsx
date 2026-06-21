"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getActiveCaseContextLocal,
  type CaseContext,
} from "../../src/lib/case-system/caseContextStorage";

import { buildTimelineFromEvidence } from "../../src/lib/case-system/timelineEngine";

function DashboardBox({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-[#10231f]">{title}</h3>

      {items.length > 0 ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#24463d]">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[#6b8078]">
          Nothing recorded yet.
        </p>
      )}
    </div>
  );
}

export default function CaseDashboardPage() {
  const [context, setContext] = useState<CaseContext | null>(null);

  useEffect(() => {
    setContext(getActiveCaseContextLocal());
  }, []);

  const timelineAnalysis = useMemo(() => {
    if (!context) return null;

    return buildTimelineFromEvidence(context.evidenceItems || []);
  }, [context]);

  if (!context) {
    return (
      <main className="min-h-screen bg-[#f8faf8] p-6 text-[#16302b]">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">
            Case Dashboard
          </h1>

          <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              No active case context found
            </h2>

            <p className="mt-3 text-[#4d675f]">
              Save an evidence package first. Once evidence is saved,
              CourtSimplified will build a live case context here.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8faf8] p-6 text-[#16302b]">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
            Litigation Command Center
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {context.title}
          </h1>

          <p className="mt-3 max-w-3xl text-[#4d675f]">
            {context.summary || "No case summary has been created yet."}
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Case path
              </p>

              <p className="mt-1 font-semibold">
                {context.casePath}
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Stage
              </p>

              <p className="mt-1 font-semibold">
                {context.stage}
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Party role
              </p>

              <p className="mt-1 font-semibold">
                {context.partyRole}
              </p>
            </div>
          </div>
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <DashboardBox
            title="Strengths"
            items={context.strengths}
          />

          <DashboardBox
            title="Weaknesses"
            items={context.weaknesses}
          />

          <DashboardBox
            title="Missing information"
            items={context.missingInformation}
          />

          <DashboardBox
            title="Next steps"
            items={context.nextSteps}
          />

          <DashboardBox
            title="Strategy notes"
            items={context.strategyNotes}
          />

          <DashboardBox
            title="Court package notes"
            items={context.courtPackageNotes}
          />
        </section>

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Issues detected
          </h2>

          {context.issues.length > 0 ? (
            <div className="mt-5 space-y-4">
              {context.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4"
                >
                  <h3 className="font-bold">
                    {issue.title}
                  </h3>

                  {issue.description && (
                    <p className="mt-2 text-sm text-[#49635c]">
                      {issue.description}
                    </p>
                  )}

                  <p className="mt-2 text-sm font-semibold text-[#2f7d67]">
                    Linked evidence:{" "}
                    {issue.linkedEvidenceIds.length}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#6b8078]">
              No issues have been identified yet.
            </p>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                Timeline intelligence
              </h2>

              <p className="mt-2 text-sm text-[#4d675f]">
                CourtSimplified automatically builds chronology
                structure from the evidence package.
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] px-4 py-3 text-sm font-semibold text-[#2f7d67]">
              {timelineAnalysis?.orderedEvents.length || 0} ordered event(s)
            </div>
          </div>

          {timelineAnalysis &&
          timelineAnalysis.orderedEvents.length > 0 ? (
            <div className="mt-6 space-y-4">
              {timelineAnalysis.orderedEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#e6f3ee] px-3 py-1 text-xs font-semibold uppercase text-[#2f7d67]">
                      {event.eventType.replaceAll("-", " ")}
                    </span>

                    <span className="rounded-full bg-[#f0f4f2] px-3 py-1 text-xs font-semibold text-[#49635c]">
                      {event.confidence} confidence
                    </span>
                  </div>

                  <p className="mt-4 text-sm font-semibold text-[#2f7d67]">
                    {event.date || "No date"}
                  </p>

                  <h3 className="mt-1 text-lg font-bold">
                    {event.title}
                  </h3>

                  <p className="mt-3 text-sm text-[#49635c]">
                    {event.description}
                  </p>

                  {event.exhibitLabels.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {event.exhibitLabels.map((label) => (
                        <span
                          key={`${event.id}-${label}`}
                          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#24463d]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}

                  {event.warnings.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-[#d8e6df] bg-white p-4">
                      <h4 className="font-semibold text-[#10231f]">
                        Timeline warnings
                      </h4>

                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#24463d]">
                        {event.warnings.map((warning, index) => (
                          <li key={`${event.id}-warning-${index}`}>
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {event.suggestedFixes.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-[#d8e6df] bg-white p-4">
                      <h4 className="font-semibold text-[#10231f]">
                        Suggested fixes
                      </h4>

                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#24463d]">
                        {event.suggestedFixes.map((fix, index) => (
                          <li key={`${event.id}-fix-${index}`}>
                            {fix}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-[#6b8078]">
              No timeline events available yet.
            </p>
          )}
        </section>

        {timelineAnalysis && (
          <section className="mt-8 grid gap-5 md:grid-cols-2">
            <DashboardBox
              title="Chronology warnings"
              items={timelineAnalysis.chronologyWarnings}
            />

            <DashboardBox
              title="Chronology gaps"
              items={timelineAnalysis.chronologyGaps}
            />

            <DashboardBox
              title="Escalation patterns"
              items={timelineAnalysis.escalationPatterns}
            />

            <DashboardBox
              title="Contradiction risks"
              items={timelineAnalysis.contradictionRisks}
            />

            <DashboardBox
              title="Timeline next steps"
              items={timelineAnalysis.nextSteps}
            />

            <DashboardBox
              title="Undated events"
              items={timelineAnalysis.undatedEvents.map(
                (event) => event.title
              )}
            />
          </section>
        )}

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Evidence intelligence
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <DashboardBox
              title="Corroboration"
              items={
                context.evidenceAnalysis.corroborationNotes || []
              }
            />

            <DashboardBox
              title="Contradictions"
              items={
                context.evidenceAnalysis.contradictionNotes || []
              }
            />

            <DashboardBox
              title="Credibility concerns"
              items={
                context.evidenceAnalysis.credibilityConcerns || []
              }
            />

            <DashboardBox
              title="Proof gaps"
              items={context.evidenceAnalysis.proofGaps || []}
            />
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Risk register
          </h2>

          {context.risks.length > 0 ? (
            <div className="mt-5 space-y-4">
              {context.risks.map((risk) => (
                <div
                  key={risk.id}
                  className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#e6f3ee] px-3 py-1 text-xs font-semibold uppercase text-[#2f7d67]">
                      {risk.source}
                    </span>

                    <span className="rounded-full bg-[#f0f4f2] px-3 py-1 text-xs font-semibold text-[#49635c]">
                      Severity: {risk.severity}
                    </span>
                  </div>

                  <h3 className="mt-3 font-bold">
                    {risk.title}
                  </h3>

                  <p className="mt-2 text-sm text-[#49635c]">
                    {risk.description}
                  </p>

                  {risk.suggestedFix && (
                    <p className="mt-3 text-sm font-semibold text-[#24463d]">
                      Suggested fix: {risk.suggestedFix}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#6b8078]">
              No risks have been detected yet.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}