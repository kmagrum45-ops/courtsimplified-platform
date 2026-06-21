"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ExportDocument = {
  title: string;
  category: string;
  ready: boolean;
  reason: string;
  route?: string;
};

type EvidencePackage = {
  exhibitCount: number;
  exhibits: {
    label: string;
    title: string;
    confirmed: boolean;
  }[];
};

type StoredCaseData = {
  courtPath?: string;
  facts?: string;
  timeline?: string;
  goal?: string;
  analysis?: {
    summary?: string;
    detectedIssues?: string[];
    risksAndGaps?: string[];
    guidance?: string[];
    nextBestActions?: string[];
    caseStrategy?: string[];
    missingEvidence?: string[];
    opposingArguments?: string[];
    courtConcerns?: string[];
  };
};

type ExportResult = {
  id: string;
  title: string;
  format: string;
  readiness: string;
  readinessScore: number;
  content: string;
  warnings: string[];
  diagnostics: {
    id: string;
    level: string;
    message: string;
    category: string;
  }[];
  sections: {
    id: string;
    heading: string;
    category: string;
    warnings: string[];
    locked: boolean;
    hasContent: boolean;
  }[];
  nextSteps: string[];
  metadata: {
    sectionCount: number;
    lockedSectionCount?: number;
    warningCount: number;
    exhibitReferenceCount: number;
    packageMode: string;
  };
};

function buildWorkflowHref(route: string, caseId?: string, path?: string) {
  const params = new URLSearchParams();

  if (caseId) params.set("caseId", caseId);
  if (path && path !== "unknown") params.set("path", path);

  const query = params.toString();
  return query ? `${route}?${query}` : route;
}

function ExportSection({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: string[];
}) {
  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-[#16302b]">{title}</h2>

      {description ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d675f]">
          {description}
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-[#6b8078]">
          No information available yet.
        </p>
      )}
    </section>
  );
}

function loadCaseData(): StoredCaseData | null {
  if (typeof window === "undefined") return null;

  const raw =
    localStorage.getItem("caseData") ||
    localStorage.getItem("courtSimplifiedCase");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadEvidencePackage(): EvidencePackage | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("courtSimplifiedEvidencePackage");

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getExportTone(score: number) {
  if (score >= 80) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (score >= 50) return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-red-200 bg-red-50 text-red-800";
}

function getExportLabel(score: number) {
  if (score >= 80) return "Ready for final review";
  if (score >= 50) return "Needs review before export";
  return "Needs repair before export";
}

function DocumentExportPageContent() {
  const searchParams = useSearchParams();

  const caseId = searchParams.get("caseId") || "";
  const path = searchParams.get("path") || "unknown";

  const [caseData, setCaseData] = useState<StoredCaseData | null>(null);
  const [evidencePackage, setEvidencePackage] =
    useState<EvidencePackage | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    setCaseData(loadCaseData());
    setEvidencePackage(loadEvidencePackage());
  }, []);

  const workspaceHref = caseId ? `/dashboard/cases/${caseId}` : "/dashboard";
  const evidenceHref = buildWorkflowHref("/evidence", caseId, path);
  const formsHref = buildWorkflowHref("/forms", caseId, path);
  const strategyHref = buildWorkflowHref("/litigation-strategy", caseId, path);
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

  const confirmedExhibits = useMemo(() => {
    return (evidencePackage?.exhibits || []).filter((item) => item.confirmed)
      .length;
  }, [evidencePackage]);

  const exportDocuments = useMemo<ExportDocument[]>(() => {
    return [
      {
        title: "Case Summary",
        category: "Core Litigation",
        ready: !!caseData?.analysis?.summary,
        reason: caseData?.analysis?.summary
          ? "Case summary exists."
          : "No generated case summary found.",
        route: documentWorkspaceHref,
      },
      {
        title: "Evidence Package",
        category: "Evidence",
        ready: !!evidencePackage,
        reason: evidencePackage
          ? "Evidence package is connected."
          : "No evidence package found.",
        route: evidenceHref,
      },
      {
        title: "Confirmed Exhibits",
        category: "Evidence",
        ready:
          !!evidencePackage?.exhibitCount &&
          confirmedExhibits === evidencePackage.exhibitCount,
        reason:
          evidencePackage?.exhibitCount &&
          confirmedExhibits === evidencePackage.exhibitCount
            ? "All exhibits are confirmed."
            : "Some exhibits still need review or confirmation.",
        route: evidenceHref,
      },
      {
        title: "Chronology",
        category: "Timeline",
        ready: !!caseData?.timeline,
        reason: caseData?.timeline
          ? "Timeline content exists."
          : "No timeline found in the saved case data.",
        route: trialPackageHref,
      },
      {
        title: "Litigation Strategy",
        category: "Strategy",
        ready: !!caseData?.analysis?.caseStrategy?.length,
        reason: caseData?.analysis?.caseStrategy?.length
          ? "Strategy points are recorded."
          : "No strategy points found.",
        route: strategyHref,
      },
      {
        title: "Issue-Proof Analysis",
        category: "Analysis",
        ready: !!caseData?.analysis?.detectedIssues?.length,
        reason: caseData?.analysis?.detectedIssues?.length
          ? "Issues are identified."
          : "No issue-proof analysis found.",
        route: strategyHref,
      },
      {
        title: "Trial Preparation Package",
        category: "Trial",
        ready: !!evidencePackage?.exhibitCount,
        reason: evidencePackage?.exhibitCount
          ? "Trial package has exhibit material."
          : "Trial package needs evidence material.",
        route: trialPackageHref,
      },
      {
        title: "Court Filing Package",
        category: "Court Package",
        ready: !!caseData,
        reason: caseData
          ? "Case data exists for package assembly."
          : "No saved case data found.",
        route: courtPackageHref,
      },
    ];
  }, [
    caseData,
    evidencePackage,
    confirmedExhibits,
    documentWorkspaceHref,
    evidenceHref,
    strategyHref,
    trialPackageHref,
    courtPackageHref,
  ]);

  const readyCount = exportDocuments.filter((item) => item.ready).length;
  const missingCount = exportDocuments.filter((item) => !item.ready).length;
  const exportScore = Math.round((readyCount / exportDocuments.length) * 100);

  const exportRisks = [
    ...(caseData?.analysis?.risksAndGaps || []),
    ...(caseData?.analysis?.missingEvidence || []),
    ...exportDocuments
      .filter((item) => !item.ready)
      .map((item) => `${item.title}: ${item.reason}`),
  ];

  const exhibitReviewItems = (evidencePackage?.exhibits || []).map((exhibit) => {
    return `Exhibit ${exhibit.label}: ${
      exhibit.title || "Untitled exhibit"
    } — ${exhibit.confirmed ? "confirmed" : "needs review"}`;
  });

  async function generateExportPackage() {
    try {
      setIsExporting(true);
      setExportError(null);
      setExportResult(null);

      const workspaceDocumentRaw = localStorage.getItem(
        "courtSimplifiedWorkspaceDocument",
      );

      let workspaceDocument = null;

      try {
        workspaceDocument = workspaceDocumentRaw
          ? JSON.parse(workspaceDocumentRaw)
          : null;
      } catch {
        workspaceDocument = null;
      }

      const response = await fetch("/api/document-export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caseId,
          path,
          caseData,
          master_result: caseData,
          workspaceDocument,
          evidencePackage,
          exportFormat: "plain-text",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "CourtSimplified could not generate the export package.",
        );
      }

      setExportResult(result.exportPackage);
    } catch (error: any) {
      setExportError(
        error?.message ||
          "CourtSimplified could not generate the export package.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6faf8] p-6 text-[#16302b]">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
                Litigation Export System
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                Court Package Export
              </h1>

              <p className="mt-4 max-w-4xl text-lg leading-8 text-[#4d675f]">
                Finalize, review, organize, and prepare export-ready litigation
                materials from the connected CourtSimplified workflow.
              </p>
            </div>

            <div
              className={`rounded-2xl border p-4 text-sm ${getExportTone(
                exportScore,
              )}`}
            >
              <p className="font-semibold">Export Status</p>
              <p className="mt-2 text-2xl font-bold">{exportScore}%</p>
              <p className="mt-1 font-semibold">
                {getExportLabel(exportScore)}
              </p>
              <p className="mt-2">Ready: {readyCount}</p>
              <p className="mt-1">Missing: {missingCount}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Export items
              </p>
              <p className="mt-1 font-semibold">{exportDocuments.length}</p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Ready
              </p>
              <p className="mt-1 font-semibold">{readyCount}</p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Missing
              </p>
              <p className="mt-1 font-semibold">{missingCount}</p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Exhibits
              </p>
              <p className="mt-1 font-semibold">
                {confirmedExhibits}/{evidencePackage?.exhibitCount || 0}
              </p>
            </div>
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
              href={strategyHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Strategy
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

            <Link
              href={trialPackageHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Trial Package
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-[#16302b]">
            Export Readiness
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d675f]">
            Each item should be reviewed before the user relies on the package
            for filing, court use, settlement, or lawyer review.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {exportDocuments.map((document) => (
              <div
                key={document.title}
                className={`rounded-2xl border p-5 ${
                  document.ready
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide">
                      {document.category}
                    </p>

                    <h3 className="mt-2 text-lg font-bold">
                      {document.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6">
                      {document.reason}
                    </p>
                  </div>

                  <div
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      document.ready
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {document.ready ? "Ready" : "Missing"}
                  </div>
                </div>

                {document.route ? (
                  <Link
                    href={document.route}
                    className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#24463d]"
                  >
                    Review source
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <ExportSection
          title="Export risks"
          description="These issues should be reviewed before final export."
          items={exportRisks}
        />

        <ExportSection
          title="Exhibit export review"
          description="Final exhibit status should be checked before printing or filing."
          items={exhibitReviewItems}
        />

        <ExportSection
          title="Final judge-facing concerns"
          description="These concerns should be answered in the final materials where relevant."
          items={caseData?.analysis?.courtConcerns || []}
        />

        <ExportSection
          title="Likely opposing arguments"
          description="Final materials should anticipate the strongest points the other side may raise."
          items={caseData?.analysis?.opposingArguments || []}
        />

        <ExportSection
          title="Final export preparation checklist"
          description="Use this checklist before creating final documents."
          items={[
            "Review all exhibit labels for consistency.",
            "Ensure chronology dates match evidence.",
            "Ensure important exhibits are referenced in the strategy.",
            "Remove emotional or speculative wording where proof is required.",
            "Verify damages calculations and supporting proof.",
            "Ensure all important screenshots, contracts, and messages are included.",
            "Ensure issue-proof mapping is internally consistent.",
            "Review for contradictions before export.",
            "Ensure court forms match the current procedural stage.",
            "Prepare clean printable copies for court use.",
          ]}
        />

        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-[#16302b]">
            Export Actions
          </h2>

          <p className="mt-4 max-w-3xl text-[#4d675f]">
            Generate structured litigation export packages from the connected
            CourtSimplified workflow system.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={courtPackageHref}
              className="rounded-full border border-[#d8e6df] bg-white px-6 py-3 text-sm font-semibold text-[#24463d]"
            >
              Review Court Package
            </Link>

            <Link
              href={trialPackageHref}
              className="rounded-full border border-[#d8e6df] bg-white px-6 py-3 text-sm font-semibold text-[#24463d]"
            >
              Review Trial Package
            </Link>

            <Link
              href={settlementHref}
              className="rounded-full border border-[#d8e6df] bg-white px-6 py-3 text-sm font-semibold text-[#24463d]"
            >
              Review Settlement Package
            </Link>

            <button
              type="button"
              disabled={isExporting}
              onClick={generateExportPackage}
              className="rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting
                ? "Generating Export..."
                : "Generate Export Package"}
            </button>
          </div>
        </section>

        {exportError ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-red-800">
              Export Error
            </h2>

            <p className="mt-3 text-sm leading-6 text-red-700">
              {exportError}
            </p>
          </section>
        ) : null}

        {exportResult ? (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                  Export Generated
                </p>

                <h2 className="mt-2 text-3xl font-bold text-emerald-900">
                  Litigation Export Package Ready
                </h2>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-emerald-800">
                  CourtSimplified successfully generated a structured litigation
                  export package from the connected workflow system.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-emerald-700">
                  Readiness
                </p>

                <p className="mt-1 text-3xl font-bold text-emerald-900">
                  {exportResult.readinessScore}%
                </p>

                <p className="mt-1 text-sm font-semibold text-emerald-700 capitalize">
                  {exportResult.readiness}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {(exportResult.sections || []).map((section) => (
                <div
                  key={section.id}
                  className="rounded-2xl border border-emerald-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        {section.category}
                      </p>

                      <h3 className="mt-1 text-lg font-bold text-emerald-900">
                        {section.heading}
                      </h3>
                    </div>

                    <div
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        section.hasContent
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {section.hasContent ? "Ready" : "Review"}
                    </div>
                  </div>

                  {section.warnings?.length ? (
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-amber-900">
                      {section.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-emerald-700">
                      No export warnings detected.
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-white p-5">
                <h3 className="text-xl font-bold text-emerald-900">
                  Export Diagnostics
                </h3>

                {(exportResult.diagnostics || []).length > 0 ? (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
                    {exportResult.diagnostics.map((diagnostic) => (
                      <li key={diagnostic.id}>
                        [{diagnostic.level.toUpperCase()}]{" "}
                        {diagnostic.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-emerald-700">
                    No export diagnostics were generated.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-white p-5">
                <h3 className="text-xl font-bold text-emerald-900">
                  Next Steps
                </h3>

                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
                  {(exportResult.nextSteps || []).map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-emerald-200 bg-white p-5">
              <h3 className="text-xl font-bold text-emerald-900">
                Export Metadata
              </h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-[#f7faf8] p-4">
                  <p className="text-xs font-semibold uppercase text-[#6b8078]">
                    Sections
                  </p>

                  <p className="mt-1 text-lg font-bold text-[#16302b]">
                    {exportResult.metadata?.sectionCount || 0}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f7faf8] p-4">
                  <p className="text-xs font-semibold uppercase text-[#6b8078]">
                    Warnings
                  </p>

                  <p className="mt-1 text-lg font-bold text-[#16302b]">
                    {exportResult.metadata?.warningCount || 0}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f7faf8] p-4">
                  <p className="text-xs font-semibold uppercase text-[#6b8078]">
                    Exhibit References
                  </p>

                  <p className="mt-1 text-lg font-bold text-[#16302b]">
                    {exportResult.metadata?.exhibitReferenceCount || 0}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f7faf8] p-4">
                  <p className="text-xs font-semibold uppercase text-[#6b8078]">
                    Package Mode
                  </p>

                  <p className="mt-1 text-lg font-bold capitalize text-[#16302b]">
                    {exportResult.metadata?.packageMode || "unknown"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-emerald-200 bg-white p-5">
              <h3 className="text-xl font-bold text-emerald-900">
                Plain Text Export Preview
              </h3>

              <pre className="mt-4 max-h-[500px] overflow-auto whitespace-pre-wrap rounded-2xl bg-[#f7faf8] p-4 text-xs leading-6 text-[#24463d]">
                {exportResult.content}
              </pre>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export default function DocumentExportPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f6faf8] p-6 text-[#16302b]">
          Loading document export...
        </main>
      }
    >
      <DocumentExportPageContent />
    </Suspense>
  );
}