"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type EvidencePackage = {
  createdAt: string;
  exhibitCount: number;
  exhibits: {
    id: number;
    label: string;
    title: string;
    description: string;
    relevance: string;
    confirmed: boolean;
  }[];
  evidenceReview: {
    strengths: string[];
    weaknesses: string[];
    missingInformation: string[];
    risks: string[];
    suggestedFixes: string[];
    exhibitUse: string[];
  };
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
    opposingArguments?: string[];
    courtConcerns?: string[];
    caseStrategy?: string[];
    missingEvidence?: string[];
  };
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-[#16302b]">{title}</h2>

      {description ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d675f]">
          {description}
        </p>
      ) : null}

      <div className="mt-4">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items?: string[] }) {
  const cleanItems = (items || []).filter(Boolean);

  if (cleanItems.length === 0) {
    return (
      <p className="text-sm text-[#6b8078]">
        No information available yet.
      </p>
    );
  }

  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
      {cleanItems.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function readStoredCase(): StoredCaseData | null {
  const storedCase =
    localStorage.getItem("caseData") ||
    localStorage.getItem("courtSimplifiedCase");

  if (!storedCase) return null;

  try {
    return JSON.parse(storedCase);
  } catch {
    return null;
  }
}

function readEvidencePackage(): EvidencePackage | null {
  const storedEvidence = localStorage.getItem("courtSimplifiedEvidencePackage");

  if (!storedEvidence) return null;

  try {
    return JSON.parse(storedEvidence);
  } catch {
    return null;
  }
}

function buildWorkflowHref(route: string, caseId?: string, path?: string) {
  const params = new URLSearchParams();

  if (caseId) params.set("caseId", caseId);
  if (path && path !== "unknown") params.set("path", path);

  const query = params.toString();
  return query ? `${route}?${query}` : route;
}

function getReadinessTone(score: number) {
  if (score >= 80) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (score >= 50) return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-red-200 bg-red-50 text-red-800";
}

function getReadinessLabel(score: number) {
  if (score >= 80) return "Courtroom organized";
  if (score >= 50) return "Needs review";
  return "Needs repair";
}

function TrialPackagePageContent() {
  const searchParams = useSearchParams();

  const caseId = searchParams.get("caseId") || "";
  const path = searchParams.get("path") || "unknown";

  const [caseData, setCaseData] = useState<StoredCaseData | null>(null);
  const [evidencePackage, setEvidencePackage] =
    useState<EvidencePackage | null>(null);

  useEffect(() => {
    setCaseData(readStoredCase());
    setEvidencePackage(readEvidencePackage());
  }, []);

  const confirmedExhibits = useMemo(() => {
    if (!evidencePackage) return 0;
    return evidencePackage.exhibits.filter((item) => item.confirmed).length;
  }, [evidencePackage]);

  const exhibitTitles = useMemo(() => {
    if (!evidencePackage) return [];

    return evidencePackage.exhibits.map((exhibit) => {
      return `Exhibit ${exhibit.label}: ${exhibit.title || "Untitled exhibit"}`;
    });
  }, [evidencePackage]);

  const proofMap = useMemo(() => {
    if (!evidencePackage) return [];

    return evidencePackage.exhibits.map((exhibit) => ({
      label: exhibit.label,
      title: exhibit.title || "Untitled exhibit",
      relevance: exhibit.relevance || "No relevance statement recorded.",
      confirmed: exhibit.confirmed,
      description: exhibit.description || "No exhibit description recorded.",
    }));
  }, [evidencePackage]);

  const readinessScore = useMemo(() => {
    let score = 30;

    if (caseData?.analysis?.summary || caseData?.facts) score += 10;
    if ((caseData?.analysis?.detectedIssues || []).length > 0) score += 10;
    if ((caseData?.analysis?.caseStrategy || []).length > 0) score += 10;
    if ((caseData?.analysis?.opposingArguments || []).length > 0) score += 10;
    if ((caseData?.analysis?.courtConcerns || []).length > 0) score += 5;

    if (evidencePackage?.exhibitCount) score += 10;
    if (evidencePackage?.exhibitCount && confirmedExhibits > 0) score += 10;
    if (
      evidencePackage?.exhibitCount &&
      confirmedExhibits === evidencePackage.exhibitCount
    ) {
      score += 5;
    }

    const riskCount =
      (evidencePackage?.evidenceReview?.risks || []).length +
      (evidencePackage?.evidenceReview?.weaknesses || []).length +
      (caseData?.analysis?.missingEvidence || []).length;

    score -= Math.min(riskCount * 5, 25);

    return Math.max(0, Math.min(100, score));
  }, [caseData, evidencePackage, confirmedExhibits]);

  const readinessWarnings = useMemo(() => {
    const warnings: string[] = [];

    if (!caseData?.analysis?.summary && !caseData?.facts) {
      warnings.push("No clear case theory or summary is recorded yet.");
    }

    if (!evidencePackage || evidencePackage.exhibitCount === 0) {
      warnings.push("No evidence package or exhibits are connected yet.");
    }

    if (evidencePackage && confirmedExhibits < evidencePackage.exhibitCount) {
      warnings.push("Some exhibits are not confirmed for courtroom use yet.");
    }

    if ((caseData?.analysis?.opposingArguments || []).length === 0) {
      warnings.push("Likely opposing arguments have not been developed yet.");
    }

    if ((caseData?.analysis?.courtConcerns || []).length === 0) {
      warnings.push("Judge-facing concerns have not been reviewed yet.");
    }

    if ((caseData?.analysis?.missingEvidence || []).length > 0) {
      warnings.push("Missing evidence remains unresolved.");
    }

    return warnings;
  }, [caseData, evidencePackage, confirmedExhibits]);

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
  const exportHref = buildWorkflowHref("/document-export", caseId, path);

  return (
    <main className="min-h-screen bg-[#f6faf8] p-6 text-[#16302b]">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
                Trial Preparation System
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                Trial Preparation Package
              </h1>

              <p className="mt-4 max-w-4xl text-lg leading-8 text-[#4d675f]">
                Prepare evidence, arguments, chronology, proof structure,
                exhibit order, strategy responses, and judge-facing concerns
                before trial or hearing.
              </p>
            </div>

            <div
              className={`rounded-2xl border p-4 text-sm ${getReadinessTone(
                readinessScore,
              )}`}
            >
              <p className="font-semibold">Trial Readiness</p>

              <p className="mt-2 text-2xl font-bold">{readinessScore}%</p>

              <p className="mt-1 font-semibold">
                {getReadinessLabel(readinessScore)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Exhibits
              </p>
              <p className="mt-1 font-semibold">
                {evidencePackage?.exhibitCount || 0}
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Confirmed
              </p>
              <p className="mt-1 font-semibold">{confirmedExhibits}</p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Issues
              </p>
              <p className="mt-1 font-semibold">
                {caseData?.analysis?.detectedIssues?.length || 0}
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Risks
              </p>
              <p className="mt-1 font-semibold">
                {(evidencePackage?.evidenceReview?.risks || []).length +
                  (caseData?.analysis?.risksAndGaps || []).length}
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
          </div>
        </section>

        <Section
          title="Courtroom readiness warnings"
          description="These items should be repaired before relying on the package in court."
        >
          <BulletList items={readinessWarnings} />
        </Section>

        <Section
          title="Case theory"
          description="The trial package should start from a clear theory of what happened, why it matters, and what relief is being requested."
        >
          <p className="whitespace-pre-wrap text-sm leading-7 text-[#24463d]">
            {caseData?.analysis?.summary ||
              caseData?.facts ||
              "No case theory generated yet."}
          </p>
        </Section>

        <Section
          title="Legal issues and proof targets"
          description="These are the issues the user must be ready to prove, answer, or explain."
        >
          <BulletList items={caseData?.analysis?.detectedIssues} />
        </Section>

        <Section
          title="Trial strategy"
          description="This section should guide how the case is presented, what to emphasize, and what to avoid."
        >
          <BulletList items={caseData?.analysis?.caseStrategy} />
        </Section>

        <Section
          title="Exhibit sequence"
          description="A courtroom-ready package needs exhibits in a usable order, with labels, purpose, and confirmation status."
        >
          {proofMap.length > 0 ? (
            <div className="space-y-4">
              {proofMap.map((exhibit) => (
                <div
                  key={`${exhibit.label}-${exhibit.title}`}
                  className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-wide text-[#2f7d67]">
                        Exhibit {exhibit.label}
                      </p>

                      <h3 className="mt-1 text-lg font-bold text-[#10231f]">
                        {exhibit.title}
                      </h3>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        exhibit.confirmed
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {exhibit.confirmed ? "Confirmed" : "Needs review"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[#49635c]">
                    {exhibit.description}
                  </p>

                  <div className="mt-4 rounded-2xl border border-[#d8e6df] bg-white p-4">
                    <p className="text-sm font-semibold text-[#10231f]">
                      Why this exhibit matters
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#49635c]">
                      {exhibit.relevance}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <BulletList items={exhibitTitles} />
          )}
        </Section>

        <Section
          title="Evidence strengths"
          description="These points should be emphasized if they are supported by reliable proof."
        >
          <BulletList items={evidencePackage?.evidenceReview?.strengths} />
        </Section>

        <Section
          title="Evidence weaknesses and repair items"
          description="These are areas the other side may attack or the court may question."
        >
          <BulletList
            items={[
              ...(evidencePackage?.evidenceReview?.risks || []),
              ...(evidencePackage?.evidenceReview?.weaknesses || []),
              ...(evidencePackage?.evidenceReview?.missingInformation || []),
              ...(caseData?.analysis?.missingEvidence || []),
            ]}
          />
        </Section>

        <Section
          title="Possible opposing attacks"
          description="Prepare short, factual responses to the arguments the other side may make."
        >
          <BulletList items={caseData?.analysis?.opposingArguments} />
        </Section>

        <Section
          title="Possible judge concerns"
          description="This helps the user prepare for the questions or concerns a judge may raise."
        >
          <BulletList items={caseData?.analysis?.courtConcerns} />
        </Section>

        <Section
          title="Chronology and presentation risks"
          description="Court presentations are stronger when dates, exhibits, and explanations line up cleanly."
        >
          <BulletList
            items={[
              "Ensure the chronology is internally consistent.",
              "Ensure dates match exhibits and documents.",
              "Avoid emotional wording where proof is required.",
              "Prepare concise explanations for complex events.",
              "Separate assumptions from provable facts.",
              "Ensure exhibit references are consistent throughout the package.",
              "Review contradictions before trial.",
              "Identify areas where the other side may claim speculation.",
            ]}
          />
        </Section>

        <Section
          title="Recommended trial preparation"
          description="Use this as the practical preparation checklist before a hearing, settlement conference, or trial."
        >
          <BulletList
            items={[
              "Prepare a chronological evidence binder.",
              "Organize exhibits in the order they will be referenced.",
              "Prepare a short opening explanation of the case.",
              "Focus on provable facts instead of emotional arguments.",
              "Prepare responses to likely defence arguments.",
              "Bring printed copies of all important exhibits.",
              "Prepare damages calculations and supporting proof.",
              "Review inconsistencies before trial.",
              "Prepare concise explanations for each major event.",
              "Know which exhibit supports each legal point.",
            ]}
          />
        </Section>

        <Section
          title="Trial readiness checklist"
          description="The user should not move to export until these basic readiness items are reviewed."
        >
          <BulletList
            items={[
              "All exhibits organized and labeled.",
              "All important evidence printed or saved in an accessible format.",
              "Damages calculations prepared where damages are claimed.",
              "Timeline reviewed and verified.",
              "Weaknesses reviewed before court.",
              "Opposing arguments anticipated.",
              "Important messages, contracts, records, and documents prepared.",
              "Witnesses identified if applicable.",
              "All referenced exhibits can be quickly located.",
              "Court package reviewed for consistency.",
            ]}
          />
        </Section>

        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-[#16302b]">
            Connected litigation workflow
          </h2>

          <p className="mt-4 max-w-3xl text-[#4d675f]">
            Trial preparation connects evidence, forms, strategy, chronology,
            proof mapping, document drafting, court package assembly, and export.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={evidenceHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Repair Evidence
            </Link>

            <Link
              href={strategyHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Review Strategy
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
              href={exportHref}
              className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
            >
              Export Trial Package
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function TrialPackagePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f6faf8] text-[#16302b]">
          Loading trial package...
        </main>
      }
    >
      <TrialPackagePageContent />
    </Suspense>
  );
}