"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  getActiveCaseContextLocal,
  type CaseContext,
} from "../../src/lib/case-system/caseContextStorage";

import {
  buildLitigationStrategyReport,
  type LitigationStrategyReport,
} from "../../src/lib/case-system/litigationStrategyEngine";
import LegalInformationNotice from "../_components/LegalInformationNotice";

function StrategyBox({
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
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[#6b8078]">Nothing detected yet.</p>
      )}
    </div>
  );
}

function buildWorkflowHref(route: string, caseId?: string, path?: string) {
  const params = new URLSearchParams();

  if (caseId) params.set("caseId", caseId);
  if (path && path !== "unknown") params.set("path", path);

  const query = params.toString();
  return query ? `${route}?${query}` : route;
}

function getPathLabel(path: string | undefined) {
  if (path === "family") return "Family";
  if (path === "small-claims") return "Small Claims";
  if (path === "civil") return "Civil";
  return "Unknown";
}

function LitigationStrategyPageContent() {
  const searchParams = useSearchParams();

  const caseId = searchParams.get("caseId") || "";
  const path = searchParams.get("path") || "unknown";

  const [context, setContext] = useState<CaseContext | null>(null);

  useEffect(() => {
    setContext(getActiveCaseContextLocal());
  }, []);

  const report: LitigationStrategyReport | null = useMemo(() => {
    if (!context) return null;
    return buildLitigationStrategyReport(context);
  }, [context]);

  const workspaceHref = caseId ? `/dashboard/cases/${caseId}` : "/dashboard";
  const builderHref = buildWorkflowHref("/builder", caseId, path);
  const evidenceHref = buildWorkflowHref("/evidence", caseId, path);
  const formsHref = buildWorkflowHref("/forms", caseId, path);
  const documentWorkspaceHref = buildWorkflowHref(
    "/document-workspace",
    caseId,
    path,
  );
  const courtPackageHref = buildWorkflowHref("/court-package", caseId, path);
  const trialPackageHref = buildWorkflowHref("/trial-package", caseId, path);
  const settlementHref = buildWorkflowHref(
    "/settlement-conference",
    caseId,
    path,
  );
  const exportHref = buildWorkflowHref("/document-export", caseId, path);

  if (!context || !report) {
    return (
      <main className="min-h-screen bg-[#f8faf8] p-6 text-[#16302b]">
        <div className="mx-auto max-w-6xl">
          <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
              Litigation Strategy
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              No active case context found
            </h1>

            <p className="mt-3 max-w-3xl text-[#4d675f]">
              CourtSimplified needs an active case context before it can analyze
              strengths, weaknesses, missing proof, likely opposing arguments,
              judge-facing concerns, and next strategic moves.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={workspaceHref}
                className="rounded-full border border-[#2f7d67] bg-white px-5 py-2 text-sm font-semibold text-[#2f7d67]"
              >
                Back to Case Workspace
              </Link>

              <Link
                href={builderHref}
                className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
              >
                Continue Intake
              </Link>

              <Link
                href={evidenceHref}
                className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
              >
                Evidence
              </Link>

              <Link
                href={formsHref}
                className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
              >
                Forms
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const totalStrategyItems =
    report.strengths.length +
    report.weaknesses.length +
    report.opposingArguments.length +
    report.judicialConcerns.length +
    report.missingEvidence.length +
    report.timelineConcerns.length +
    report.proceduralConcerns.length;

  const strategicRepairItems = [
    ...report.missingEvidence.map((item) => `Evidence gap: ${item}`),
    ...report.timelineConcerns.map((item) => `Timeline issue: ${item}`),
    ...report.proceduralConcerns.map((item) => `Procedure issue: ${item}`),
    ...report.judicialConcerns.map(
      (item) => `Judge concern: ${item.concern}`,
    ),
  ];

  return (
    <main className="min-h-screen bg-[#f8faf8] p-6 text-[#16302b]">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
                Litigation Strategy Intelligence
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Strategy Review
              </h1>

              <p className="mt-3 max-w-3xl text-[#4d675f]">
                CourtSimplified organizes the active case context into what's
                supported by evidence, what's missing, points the other side
                may raise, and questions to be ready to answer.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm">
              <p className="font-semibold text-[#10231f]">
                {context.title || "CourtSimplified Case"}
              </p>

              <p className="mt-1 text-[#4d675f]">
                Case ID: {caseId || context.caseId || "draft-case"}
              </p>

              <p className="mt-1 text-[#4d675f]">
                Path:{" "}
                {getPathLabel(path !== "unknown" ? path : context.casePath)}
              </p>

              <p className="mt-1 text-[#4d675f]">
                Stage: {context.stage || "not-sure"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Gaps identified
              </p>
              <p className="mt-1 font-semibold">{report.weaknesses.length}</p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Strategy items
              </p>
              <p className="mt-1 font-semibold">{totalStrategyItems}</p>
            </div>
          </div>

          <div className="mt-5">
            <LegalInformationNotice />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={workspaceHref}
              className="rounded-full border border-[#2f7d67] bg-white px-5 py-2 text-sm font-semibold text-[#2f7d67]"
            >
              Case Workspace
            </Link>

            <Link
              href={evidenceHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Evidence
            </Link>

            <Link
              href={formsHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Forms
            </Link>

            <Link
              href={documentWorkspaceHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Document Workspace
            </Link>

            <Link
              href={courtPackageHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Court Package
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <StrategyBox title="Missing evidence" items={report.missingEvidence} />
          <StrategyBox title="Timeline concerns" items={report.timelineConcerns} />
          <StrategyBox
            title="Procedural concerns"
            items={report.proceduralConcerns}
          />
          <StrategyBox
            title="Recommended next steps"
            items={report.recommendedNextSteps}
          />
        </section>

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">How this page organizes your case</h2>

          <p className="mt-3 max-w-4xl text-[#4d675f]">
            This page connects your facts to your evidence, shows what&apos;s
            missing, lists points the other side may raise, and lists
            questions you may need to answer — so you can review and prepare
            before documents are finalized.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
              <p className="font-semibold text-[#10231f]">
                1. Connect facts to evidence
              </p>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                Every claim or response needs facts and evidence tied to what
                must legally be proven.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
              <p className="font-semibold text-[#10231f]">
                2. Prepare for the other side&apos;s points
              </p>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                This section lists points the other side may raise, so you
                can prepare your response.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
              <p className="font-semibold text-[#10231f]">
                3. Review before filing
              </p>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                Review any gaps before the final package is exported or used
                in court.
              </p>
            </div>
          </div>
        </section>

        {strategicRepairItems.length > 0 ? (
          <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Strategy repair checklist
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6">
                  These are the highest-value items to repair before generating
                  final documents, trial materials, or export packages.
                </p>
              </div>

              <Link
                href={evidenceHref}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-amber-900"
              >
                Repair Evidence
              </Link>
            </div>

            <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-6">
              {strategicRepairItems.slice(0, 12).map((item, index) => (
                <li key={`repair-${index}`}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Points Supported by Evidence</h2>

          {report.strengths.length > 0 ? (
            <div className="mt-5 space-y-4">
              {report.strengths.map((strength) => (
                <div
                  key={strength.id}
                  className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5"
                >
                  <h3 className="font-bold">{strength.title}</h3>

                  <p className="mt-2 text-sm leading-6 text-[#49635c]">
                    {strength.explanation}
                  </p>

                  {strength.linkedEvidenceLabels.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {strength.linkedEvidenceLabels.map((label, index) => (
                        <span
                          key={`${strength.id}-${label}-${index}`}
                          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2f7d67]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#6b8078]">
              No points connected to evidence yet. Add evidence, timeline
              entries, and issue links so this section can list them.
            </p>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Gaps to Address</h2>

          {report.weaknesses.length > 0 ? (
            <div className="mt-5 space-y-4">
              {report.weaknesses.map((weakness) => (
                <div
                  key={weakness.id}
                  className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5"
                >
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#e6f3ee] px-3 py-1 text-xs font-semibold uppercase text-[#2f7d67]">
                      {weakness.category}
                    </span>
                  </div>

                  <h3 className="mt-3 font-bold">{weakness.title}</h3>

                  <p className="mt-2 text-sm leading-6 text-[#49635c]">
                    {weakness.explanation}
                  </p>

                  {weakness.suggestedFixes.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-[#d8e6df] bg-white p-4">
                      <h4 className="font-semibold text-[#10231f]">
                        Ways to Address This
                      </h4>

                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
                        {weakness.suggestedFixes.map((fix, index) => (
                          <li key={`${weakness.id}-fix-${index}`}>{fix}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {weakness.linkedEvidenceLabels.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {weakness.linkedEvidenceLabels.map((label, index) => (
                        <span
                          key={`${weakness.id}-${label}-${index}`}
                          className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2f7d67]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#6b8078]">
              No gaps identified yet. Continue adding proof and timeline
              details so this section can list them before court.
            </p>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Points the Other Side May Raise</h2>

          {report.opposingArguments.length > 0 ? (
            <div className="mt-5 space-y-4">
              {report.opposingArguments.map((argument) => (
                <div
                  key={argument.id}
                  className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5"
                >
                  <h3 className="font-bold">{argument.title}</h3>

                  <p className="mt-2 text-sm leading-6 text-[#49635c]">
                    {argument.explanation}
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-[#d8e6df] bg-white p-4">
                      <p className="text-sm font-semibold text-[#10231f]">
                        Likely target
                      </p>

                      <p className="mt-1 text-sm leading-6 text-[#49635c]">
                        {argument.likelyTarget}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#d8e6df] bg-white p-4">
                      <p className="text-sm font-semibold text-[#10231f]">
                        Ways to Prepare a Response
                      </p>

                      <p className="mt-1 text-sm leading-6 text-[#49635c]">
                        {argument.possibleResponse}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#6b8078]">
              No points from the other side identified yet.
            </p>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Questions to Be Ready to Answer</h2>

          {report.judicialConcerns.length > 0 ? (
            <div className="mt-5 space-y-4">
              {report.judicialConcerns.map((concern) => (
                <div
                  key={concern.id}
                  className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5"
                >
                  <h3 className="font-bold">{concern.concern}</h3>

                  <p className="mt-2 text-sm leading-6 text-[#49635c]">
                    {concern.reason}
                  </p>

                  <div className="mt-4 rounded-2xl border border-[#d8e6df] bg-white p-4">
                    <p className="text-sm font-semibold text-[#10231f]">
                      Ways to Prepare
                    </p>

                    <p className="mt-1 text-sm leading-6 text-[#49635c]">
                      {concern.possibleSolution}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#6b8078]">
              No questions identified yet.
            </p>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Connected litigation workflow
          </h2>

          <p className="mt-3 max-w-3xl text-[#4d675f]">
            Strategy feeds document drafting, evidence repair, form selection,
            settlement preparation, court package assembly, trial preparation,
            and export.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={evidenceHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Repair Evidence
            </Link>

            <Link
              href={documentWorkspaceHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Document Workspace
            </Link>

            <Link
              href={settlementHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Settlement Conference
            </Link>

            <Link
              href={courtPackageHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Court Package
            </Link>

            <Link
              href={trialPackageHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Trial Package
            </Link>

            <Link
              href={exportHref}
              className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
            >
              Export
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LitigationStrategyPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f8faf8] text-[#16302b]">
          Loading litigation strategy...
        </main>
      }
    >
      <LitigationStrategyPageContent />
    </Suspense>
  );
}