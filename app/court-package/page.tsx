"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  getActiveCaseContextLocal,
  type CaseContext,
} from "../../src/lib/case-system/caseContextStorage";

import {
  assembleCourtPackage,
  type CourtPackageAssemblyResult,
  type CourtPackageType,
} from "../../src/lib/case-system/courtPackageAssemblyEngine";

type PackageModeOption = {
  value: CourtPackageType;
  label: string;
  description: string;
};

const PACKAGE_MODE_OPTIONS: PackageModeOption[] = [
  {
    value: "general",
    label: "General court package",
    description: "Complete working package for filing, review, and next steps.",
  },
  {
    value: "case-overview",
    label: "Case overview",
    description: "A structured summary of parties, issues, facts, and posture.",
  },
  {
    value: "settlement-conference",
    label: "Settlement conference",
    description: "Focused package for settlement position, proof, and risks.",
  },
  {
    value: "affidavit-outline",
    label: "Affidavit outline",
    description: "Organizes sworn evidence, exhibits, and factual gaps.",
  },
  {
    value: "trial-binder",
    label: "Trial binder",
    description:
      "Trial-focused organization of issues, exhibits, chronology, and proof.",
  },
  {
    value: "chronology",
    label: "Chronology",
    description:
      "Timeline-first package for events, dates, gaps, and sequence problems.",
  },
  {
    value: "evidence-brief",
    label: "Evidence brief",
    description:
      "Issue-by-issue evidence package with proof strengths and gaps.",
  },
  {
    value: "motion-record",
    label: "Motion record",
    description:
      "Motion-focused package for evidence, draft materials, and relief sought.",
  },
];

function buildWorkflowHref(route: string, caseId: string, path: string) {
  const params = new URLSearchParams();

  if (caseId) params.set("caseId", caseId);
  if (path && path !== "unknown") params.set("path", path);

  const query = params.toString();
  return query ? `${route}?${query}` : route;
}

function safeText(value: unknown, fallback = "Not recorded") {
  const text = String(value || "").trim();
  return text || fallback;
}

function getPathLabel(path: string) {
  if (path === "family") return "Family";
  if (path === "small-claims") return "Small Claims";
  if (path === "civil") return "Civil";
  return "Unknown";
}

function getReadinessTone(readiness: string) {
  const value = readiness.toLowerCase();

  if (value.includes("ready") && !value.includes("not")) {
    return "border-[#b7e4cf] bg-[#f0fdf4] text-[#166534]";
  }

  if (
    value.includes("risk") ||
    value.includes("gap") ||
    value.includes("missing")
  ) {
    return "border-[#f3d6a2] bg-[#fff7ed] text-[#92400e]";
  }

  return "border-[#d8e6df] bg-[#f8fcfa] text-[#24463d]";
}

function PackageBox({ title, items }: { title: string; items: string[] }) {
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
        <p className="mt-3 text-sm text-[#6b8078]">Nothing recorded yet.</p>
      )}
    </div>
  );
}

function EmptyContextCard({
  workspaceHref,
  builderHref,
  evidenceHref,
  formsHref,
}: {
  workspaceHref: string;
  builderHref: string;
  evidenceHref: string;
  formsHref: string;
}) {
  return (
    <main className="min-h-screen bg-[#f8faf8] p-6 text-[#16302b]">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
            Court Package Assembly
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            No active case context found
          </h1>

          <p className="mt-3 max-w-3xl text-[#4d675f]">
            CourtSimplified needs an active case context before it can assemble
            package sections, exhibits, proof charts, chronology, strategy notes,
            and export-ready materials.
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

function CourtPackagePageContent() {
  const searchParams = useSearchParams();

  const caseId = searchParams.get("caseId") || "";
  const path = searchParams.get("path") || "unknown";

  const [context, setContext] = useState<CaseContext | null>(null);
  const [packageType, setPackageType] = useState<CourtPackageType>("general");

  useEffect(() => {
    setContext(getActiveCaseContextLocal());
  }, []);

  const courtPackage: CourtPackageAssemblyResult | null = useMemo(() => {
    if (!context) return null;
    return assembleCourtPackage(context, packageType);
  }, [context, packageType]);

  const selectedMode = useMemo(() => {
    return (
      PACKAGE_MODE_OPTIONS.find((option) => option.value === packageType) ||
      PACKAGE_MODE_OPTIONS[0]
    );
  }, [packageType]);

  const workspaceHref = caseId ? `/dashboard/cases/${caseId}` : "/dashboard";
  const builderHref = buildWorkflowHref("/builder", caseId, path);
  const evidenceHref = buildWorkflowHref("/evidence", caseId, path);
  const formsHref = buildWorkflowHref("/forms", caseId, path);
  const documentWorkspaceHref = buildWorkflowHref(
    "/document-workspace",
    caseId,
    path,
  );
  const strategyHref = buildWorkflowHref("/litigation-strategy", caseId, path);
  const trialPackageHref = buildWorkflowHref("/trial-package", caseId, path);
  const exportHref = buildWorkflowHref("/document-export", caseId, path);

  if (!context || !courtPackage) {
    return (
      <EmptyContextCard
        workspaceHref={workspaceHref}
        builderHref={builderHref}
        evidenceHref={evidenceHref}
        formsHref={formsHref}
      />
    );
  }

  const activePath = path !== "unknown" ? path : context.casePath;
  const readinessTone = getReadinessTone(courtPackage.readiness);

  return (
    <main className="min-h-screen bg-[#f8faf8] p-6 text-[#16302b]">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
                Court Package Assembly
              </p>

              <h1 className="mt-2 text-3xl font-bold">{courtPackage.title}</h1>

              <p className="mt-3 max-w-3xl text-[#4d675f]">
                {courtPackage.summary}
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
                Path: {getPathLabel(activePath)}
              </p>
              <p className="mt-1 text-[#4d675f]">
                Stage: {safeText(context.stage, "not-sure")}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Package type
              </p>
              <p className="mt-1 font-semibold">{courtPackage.packageType}</p>
            </div>

            <div className={`rounded-2xl border p-4 ${readinessTone}`}>
              <p className="text-xs font-semibold uppercase">Readiness</p>
              <p className="mt-1 font-semibold">{courtPackage.readiness}</p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Sections
              </p>
              <p className="mt-1 font-semibold">
                {courtPackage.sections.length}
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Evidence gaps
              </p>
              <p className="mt-1 font-semibold">
                {courtPackage.evidenceGaps.length}
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
              href={documentWorkspaceHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Document Workspace
            </Link>

            <Link
              href={strategyHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Strategy
            </Link>
          </div>

          <div className="mt-6 rounded-3xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
            <label className="text-sm font-semibold text-[#10231f]">
              Package mode
            </label>

            <select
              value={packageType}
              onChange={(event) =>
                setPackageType(event.target.value as CourtPackageType)
              }
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white p-3 text-sm"
            >
              {PACKAGE_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <p className="mt-3 text-sm leading-6 text-[#4d675f]">
              {selectedMode.description}
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <PackageBox title="Evidence gaps" items={courtPackage.evidenceGaps} />
          <PackageBox title="Court warnings" items={courtPackage.courtWarnings} />
          <PackageBox title="Next steps" items={courtPackage.nextSteps} />
          <PackageBox
            title="Chronology warnings"
            items={courtPackage.timelineAnalysis.chronologyWarnings}
          />
        </section>

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Package sections</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d675f]">
                Each section is assembled from the active case context so the
                package remains tied to intake facts, proof, warnings, and next
                procedural steps.
              </p>
            </div>

            <Link
              href={documentWorkspaceHref}
              className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
            >
              Build Draft Documents
            </Link>
          </div>

          <div className="mt-5 space-y-5">
            {courtPackage.sections.map((section) => (
              <div
                key={section.id}
                className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5"
              >
                <h3 className="text-lg font-bold">{section.title}</h3>

                <p className="mt-2 text-sm leading-6 text-[#49635c]">
                  {section.purpose}
                </p>

                {section.content.length > 0 ? (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
                    {section.content.map((item, index) => (
                      <li key={`${section.id}-content-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-[#6b8078]">
                    No content assembled yet.
                  </p>
                )}

                {section.exhibitLabels.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {section.exhibitLabels.map((label, index) => (
                      <span
                        key={`${section.id}-${label}-${index}`}
                        className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2f7d67]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}

                {section.warnings.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-[#f3d6a2] bg-white p-4">
                    <h4 className="font-semibold text-[#92400e]">Warnings</h4>

                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
                      {section.warnings.map((warning, index) => (
                        <li key={`${section.id}-warning-${index}`}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {section.suggestedFixes.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-[#d8e6df] bg-white p-4">
                    <h4 className="font-semibold text-[#10231f]">
                      Suggested fixes
                    </h4>

                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
                      {section.suggestedFixes.map((fix, index) => (
                        <li key={`${section.id}-fix-${index}`}>{fix}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Chronology package</h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d675f]">
            A strong court package needs a clear timeline. This section helps
            expose date gaps, sequencing issues, and event-to-evidence problems.
          </p>

          {courtPackage.chronology.content.length > 0 ? (
            <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
              {courtPackage.chronology.content.map((item, index) => (
                <li key={`chronology-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#6b8078]">
              No chronology content assembled yet.
            </p>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Issue-by-issue evidence map</h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d675f]">
            This map connects legal issues to evidence so the final package is
            organized around what must be proven, not just uploaded documents.
          </p>

          {courtPackage.issueEvidenceMap.length > 0 ? (
            <div className="mt-5 space-y-4">
              {courtPackage.issueEvidenceMap.map((section) => (
                <div
                  key={section.id}
                  className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5"
                >
                  <h3 className="font-bold">{section.title}</h3>

                  <p className="mt-2 text-sm leading-6 text-[#49635c]">
                    {section.purpose}
                  </p>

                  {section.content.length > 0 ? (
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
                      {section.content.map((item, index) => (
                        <li key={`${section.id}-map-${index}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-[#6b8078]">
                      No linked evidence yet.
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#6b8078]">
              No issue map has been assembled yet.
            </p>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Connected litigation workflow</h2>

          <p className="mt-3 max-w-3xl text-[#4d675f]">
            The court package pulls together intake, evidence, forms, proof
            mapping, strategy, chronology, trial preparation, and export.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={formsHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Review Forms
            </Link>

            <Link
              href={strategyHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Litigation Strategy
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
              Export Package
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function CourtPackagePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f8faf8] p-6 text-[#16302b]">
          Loading court package...
        </main>
      }
    >
      <CourtPackagePageContent />
    </Suspense>
  );
}