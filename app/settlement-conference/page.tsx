"use client";

import Link from "next/link";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-[#6b8078]">
        No information available yet.
      </p>
    );
  }

  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function buildWorkflowHref(route: string, caseId?: string, path?: string) {
  const params = new URLSearchParams();

  if (caseId) params.set("caseId", caseId);
  if (path && path !== "unknown") params.set("path", path);

  const query = params.toString();
  return query ? `${route}?${query}` : route;
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
  const storedEvidence = localStorage.getItem(
    "courtSimplifiedEvidencePackage",
  );

  if (!storedEvidence) return null;

  try {
    return JSON.parse(storedEvidence);
  } catch {
    return null;
  }
}

function getConferenceTone(score: number) {
  if (score >= 80) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (score >= 50) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-red-200 bg-red-50 text-red-800";
}

function getConferenceLabel(score: number) {
  if (score >= 80) return "Conference prepared";
  if (score >= 50) return "Needs conference review";
  return "Needs major preparation";
}

function SettlementConferencePageContent() {
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

  const exhibitTitles = useMemo(() => {
    if (!evidencePackage) return [];

    return evidencePackage.exhibits.map((exhibit) => {
      return `Exhibit ${exhibit.label}: ${
        exhibit.title || "Untitled exhibit"
      }`;
    });
  }, [evidencePackage]);

  const confirmedExhibits = useMemo(() => {
    if (!evidencePackage) return 0;

    return evidencePackage.exhibits.filter(
      (item) => item.confirmed,
    ).length;
  }, [evidencePackage]);

  const conferenceScore = useMemo(() => {
    let score = 35;

    if (caseData?.analysis?.summary || caseData?.facts) score += 10;
    if ((caseData?.analysis?.detectedIssues || []).length > 0) score += 10;
    if ((caseData?.analysis?.caseStrategy || []).length > 0) score += 10;
    if ((caseData?.analysis?.opposingArguments || []).length > 0) score += 10;
    if ((caseData?.analysis?.courtConcerns || []).length > 0) score += 5;

    if (evidencePackage?.exhibitCount) score += 10;

    if (
      evidencePackage?.exhibitCount &&
      confirmedExhibits === evidencePackage.exhibitCount
    ) {
      score += 10;
    }

    const penalties =
      (caseData?.analysis?.missingEvidence || []).length +
      (evidencePackage?.evidenceReview?.weaknesses || []).length;

    score -= Math.min(penalties * 5, 30);

    return Math.max(0, Math.min(100, score));
  }, [caseData, evidencePackage, confirmedExhibits]);

  const settlementStrengths = [
    ...(evidencePackage?.evidenceReview?.strengths || []),
    ...(caseData?.analysis?.caseStrategy || []),
  ];

  const settlementWeaknesses = [
    ...(evidencePackage?.evidenceReview?.weaknesses || []),
    ...(caseData?.analysis?.risksAndGaps || []),
    ...(caseData?.analysis?.missingEvidence || []),
  ];

  const negotiationPressurePoints = [
    ...(caseData?.analysis?.opposingArguments || []).map(
      (item) => `Defence position: ${item}`,
    ),

    ...(caseData?.analysis?.courtConcerns || []).map(
      (item) => `Judge concern: ${item}`,
    ),

    ...(evidencePackage?.evidenceReview?.risks || []).map(
      (item) => `Evidence risk: ${item}`,
    ),
  ];

  const settlementPreparationChecklist = [
    "Prepare a concise explanation of the dispute.",
    "Know the strongest and weakest parts of the case.",
    "Organize exhibits in chronological order.",
    "Prepare realistic settlement expectations.",
    "Focus on provable facts instead of emotion.",
    "Know what outcome is acceptable before attending.",
    "Prepare responses to likely defence arguments.",
    "Bring copies of important messages, contracts, receipts, or records.",
    "Review damages calculations and supporting proof.",
    "Be prepared to discuss compromise positions.",
  ];

  const workspaceHref = caseId ? `/dashboard/cases/${caseId}` : "/dashboard";

  const evidenceHref = buildWorkflowHref("/evidence", caseId, path);

  const formsHref = buildWorkflowHref("/forms", caseId, path);

  const strategyHref = buildWorkflowHref(
    "/litigation-strategy",
    caseId,
    path,
  );

  const documentWorkspaceHref = buildWorkflowHref(
    "/document-workspace",
    caseId,
    path,
  );

  const courtPackageHref = buildWorkflowHref(
    "/court-package",
    caseId,
    path,
  );

  const trialPackageHref = buildWorkflowHref(
    "/trial-package",
    caseId,
    path,
  );

  const exportHref = buildWorkflowHref(
    "/document-export",
    caseId,
    path,
  );

  return (
    <main className="min-h-screen bg-[#f6faf8] p-6 text-[#16302b]">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
                Settlement Conference System
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                Settlement Conference Preparation
              </h1>

              <p className="mt-4 max-w-4xl text-lg leading-8 text-[#4d675f]">
                Prepare negotiation posture, evidence leverage, likely defence
                positions, judge-facing concerns, and settlement readiness
                before attending a conference.
              </p>
            </div>

            <div
              className={`rounded-2xl border p-4 text-sm ${getConferenceTone(
                conferenceScore,
              )}`}
            >
              <p className="font-semibold">Conference Readiness</p>

              <p className="mt-2 text-2xl font-bold">
                {conferenceScore}%
              </p>

              <p className="mt-1 font-semibold">
                {getConferenceLabel(conferenceScore)}
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

              <p className="mt-1 font-semibold">
                {confirmedExhibits}
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Defence Issues
              </p>

              <p className="mt-1 font-semibold">
                {(caseData?.analysis?.opposingArguments || []).length}
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Risks
              </p>

              <p className="mt-1 font-semibold">
                {settlementWeaknesses.length}
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
          title="Case Summary"
          description="A settlement conference should begin from a clear explanation of the dispute and requested outcome."
        >
          <p className="whitespace-pre-wrap text-sm leading-7 text-[#24463d]">
            {caseData?.analysis?.summary ||
              caseData?.facts ||
              "No case summary available yet."}
          </p>
        </Section>

        <Section
          title="Issues in Dispute"
          description="These are the major points the parties may disagree about."
        >
          <BulletList items={caseData?.analysis?.detectedIssues} />
        </Section>

        <Section
          title="Evidence Package Overview"
          description="Settlement leverage often depends on how organized and persuasive the evidence appears."
        >
          {evidencePackage ? (
            <div className="space-y-4">
              <p className="text-sm text-[#24463d]">
                Confirmed Exhibits:{" "}
                <strong>{confirmedExhibits}</strong> /{" "}
                <strong>{evidencePackage.exhibitCount}</strong>
              </p>

              <BulletList items={exhibitTitles} />
            </div>
          ) : (
            <p className="text-sm text-[#6b8078]">
              No saved evidence package found yet.
            </p>
          )}
        </Section>

        <Section
          title="Settlement Strengths"
          description="These are likely the strongest points supporting the user’s position."
        >
          <BulletList items={settlementStrengths} />
        </Section>

        <Section
          title="Settlement Risks and Weaknesses"
          description="These are the areas the defence or judge may focus on during settlement discussions."
        >
          <BulletList items={settlementWeaknesses} />
        </Section>

        <Section
          title="Negotiation Pressure Points"
          description="These are the realistic pressure points likely to arise during conference discussions."
        >
          <BulletList items={negotiationPressurePoints} />
        </Section>

        <Section
          title="Possible Defence Arguments"
          description="Prepare short, fact-based responses to the likely arguments the other side may raise."
        >
          <BulletList items={caseData?.analysis?.opposingArguments} />
        </Section>

        <Section
          title="Possible Judge Concerns"
          description="Judges at conferences often focus on weak proof, missing evidence, practicality, and settlement realism."
        >
          <BulletList items={caseData?.analysis?.courtConcerns} />
        </Section>

        <Section
          title="Settlement Goals"
          description="The user should know their realistic goals before attending."
        >
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-[#16302b]">
                Primary Goal
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#24463d]">
                {caseData?.goal || "No settlement goal recorded yet."}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-[#16302b]">
                Recommended Guidance
              </h3>

              <div className="mt-2">
                <BulletList items={caseData?.analysis?.guidance} />
              </div>
            </div>
          </div>
        </Section>

        <Section
          title="Recommended Next Actions"
          description="These are the highest-value preparation steps before the conference."
        >
          <BulletList items={caseData?.analysis?.nextBestActions} />
        </Section>

        <Section
          title="Conference Preparation Checklist"
          description="Use this checklist before attending."
        >
          <BulletList items={settlementPreparationChecklist} />
        </Section>

        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-[#16302b]">
            Connected litigation workflow
          </h2>

          <p className="mt-4 max-w-3xl text-[#4d675f]">
            Settlement preparation connects evidence, strategy, document
            drafting, trial preparation, court package assembly, and export.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={strategyHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Review Strategy
            </Link>

            <Link
              href={documentWorkspaceHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Document Workspace
            </Link>

            <Link
              href={trialPackageHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Trial Package
            </Link>

            <Link
              href={courtPackageHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Court Package
            </Link>

            <Link
              href={exportHref}
              className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
            >
              Continue to Export
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function SettlementConferencePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f6faf8] text-[#16302b]">
          Loading settlement conference...
        </main>
      }
    >
      <SettlementConferencePageContent />
    </Suspense>
  );
}