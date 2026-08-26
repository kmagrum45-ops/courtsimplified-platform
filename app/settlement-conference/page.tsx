"use client";

import Link from "next/link";
import { meaningfulIssueSignals } from "@/src/lib/case-system/intelligence/issueSignals";
import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

import {
  loadDraftWorkflowBundle,
  loadWorkflowCaseBundle,
} from "../../src/lib/case-system/workflowCaseLoader";
import LegalInformationNotice from "../_components/LegalInformationNotice";

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

function SettlementConferencePageContent() {
  const searchParams = useSearchParams();

  const caseId = searchParams.get("caseId") || "";
  const path = searchParams.get("path") || "unknown";

  const [caseData, setCaseData] = useState<StoredCaseData | null>(null);

  const [evidencePackage, setEvidencePackage] =
    useState<EvidencePackage | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [contextError, setContextError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadContext() {
      setLoadingContext(true);
      setContextError("");

      try {
        const bundle = caseId
          ? await loadWorkflowCaseBundle(caseId)
          : loadDraftWorkflowBundle();

        if (!active) return;

        setCaseData(bundle.caseData as StoredCaseData | null);
        setEvidencePackage(
          bundle.evidencePackage as EvidencePackage | null,
        );
      } catch (error) {
        if (!active) return;

        setCaseData(null);
        setEvidencePackage(null);
        setContextError(
          error instanceof Error
            ? error.message
            : "The requested case could not be loaded.",
        );
      } finally {
        if (active) setLoadingContext(false);
      }
    }

    loadContext();

    return () => {
      active = false;
    };
  }, [caseId]);

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

  // Plain completion tracking, not a merit score -- see the identical note
  // in trial-package/page.tsx. Nothing here is weighted by risk.
  const preparationChecklist = useMemo(() => {
    return [
      {
        label: "Case summary recorded",
        done: Boolean(caseData?.analysis?.summary || caseData?.facts),
      },
      {
        label: "Issues identified",
        done: (caseData?.analysis?.detectedIssues || []).length > 0,
      },
      {
        label: "Strategy notes recorded",
        done: (caseData?.analysis?.caseStrategy || []).length > 0,
      },
      {
        label: "Opposing arguments considered",
        done: (caseData?.analysis?.opposingArguments || []).length > 0,
      },
      {
        label: "Court concerns considered",
        done: (caseData?.analysis?.courtConcerns || []).length > 0,
      },
      {
        label: "Exhibits added",
        done: Boolean(evidencePackage?.exhibitCount),
      },
      {
        label: "All exhibits confirmed",
        done: Boolean(
          evidencePackage?.exhibitCount &&
            confirmedExhibits === evidencePackage.exhibitCount,
        ),
      },
    ];
  }, [caseData, evidencePackage, confirmedExhibits]);

  const completedChecklistCount = preparationChecklist.filter(
    (item) => item.done,
  ).length;

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
        {loadingContext ? (
          <div className="rounded-2xl border border-[#d8e6df] bg-white p-4 text-sm text-[#4d675f]">
            Loading the selected case package...
          </div>
        ) : null}

        {contextError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {contextError} No data from another case was substituted.
          </div>
        ) : null}

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

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm">
              <p className="font-semibold">Preparation Checklist</p>

              <p className="mt-2 text-2xl font-bold">
                {completedChecklistCount} of {preparationChecklist.length}
              </p>

              <p className="mt-1 text-[#4d675f]">items completed</p>
            </div>
          </div>

          <div className="mt-4">
            <LegalInformationNotice />
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
          {/* Same leak as the case overview: "unknown" is the engines'
              unclassified domain and would list as an issue in dispute. */}
          <BulletList items={meaningfulIssueSignals(caseData?.analysis?.detectedIssues || [])} />
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
          title="Points Supported by Evidence"
          description="These points are supported by the evidence and strategy notes recorded so far."
        >
          <BulletList items={settlementStrengths} />
        </Section>

        <Section
          title="Gaps to Address"
          description="These are areas the other side may raise, or where more proof would help."
        >
          <BulletList items={settlementWeaknesses} />
        </Section>

        <Section
          title="Points to Prepare For"
          description="Points that may come up during the conference discussion, organized by where they come from."
        >
          <BulletList items={negotiationPressurePoints} />
        </Section>

        <Section
          title="Points the Other Side May Raise"
          description="Prepare short, fact-based responses to the likely arguments the other side may raise."
        >
          <BulletList items={caseData?.analysis?.opposingArguments} />
        </Section>

        <Section
          title="Questions to Be Ready to Answer"
          description="This helps you prepare for questions a judge may ask at the conference."
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
