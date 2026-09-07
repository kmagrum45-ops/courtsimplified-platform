"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import LegalInformationNotice from "../_components/LegalInformationNotice";

function buildWorkflowHref(route: string, caseId: string, path: string) {
  const params = new URLSearchParams({ caseId });
  if (path !== "unknown") params.set("path", path);
  return `${route}?${params.toString()}`;
}

function getPathLabel(path: string) {
  if (path === "family") return "Ontario Family";
  if (path === "small-claims") return "Ontario Small Claims";
  if (path === "civil") return "Ontario Civil";
  return "Court area not yet confirmed";
}

function LitigationStrategyPageContent() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId") || "";
  const path = searchParams.get("path") || "unknown";

  if (!caseId) {
    return (
      <main className="min-h-screen bg-[#f8faf8] p-6 text-[#16302b]">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
              Case Preparation
            </p>
            <h1 className="mt-2 text-3xl font-bold">Choose a case first</h1>
            <p className="mt-3 max-w-2xl leading-7 text-[#4d675f]">
              Select one of your cases from the dashboard before opening its
              preparation tools. CourtSimplified will not substitute another
              case when a selected case is unavailable.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard"
                className="inline-flex rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
              >
                Go to My Cases
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const evidenceHref = buildWorkflowHref("/evidence", caseId, path);
  const formsHref = buildWorkflowHref("/forms", caseId, path);
  const documentWorkspaceHref = buildWorkflowHref("/document-workspace", caseId, path);
  const settlementHref = buildWorkflowHref("/settlement-conference", caseId, path);
  const trialPackageHref = buildWorkflowHref("/trial-package", caseId, path);
  const exportHref = buildWorkflowHref("/document-export", caseId, path);

  const preparationTools = [
    ["Evidence", "Add and organize the records you want to keep with this case.", evidenceHref],
    ["Forms", "Review court forms connected to this selected case.", formsHref],
    ["Document Workspace", "Work on structured draft materials for review.", documentWorkspaceHref],
    ["Settlement Conference", "Organize conference-preparation materials.", settlementHref],
    ["Trial Preparation", "Organize trial-preparation materials.", trialPackageHref],
    ["Export", "Prepare a working export for careful review.", exportHref],
  ];

  return (
    <main className="min-h-screen bg-[#f8faf8] p-6 text-[#16302b]">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
            Case Preparation
          </p>
          <h1 className="mt-2 text-3xl font-bold">Organize Your Case</h1>
          <p className="mt-3 max-w-3xl leading-7 text-[#4d675f]">
            Keep your facts, evidence, forms, and draft materials organized in
            one selected case. CourtSimplified does not assess the strength of
            your case, predict an outcome, or tell you what legal position to take.
          </p>

          <div className="mt-5 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm text-[#4d675f]">
            <p className="font-semibold text-[#10231f]">Selected case</p>
            <p className="mt-1 break-all">Case ID: {caseId}</p>
            <p className="mt-1">Court area: {getPathLabel(path)}</p>
          </div>

          <div className="mt-5">
            <LegalInformationNotice />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Continue preparing</h2>
          <p className="mt-2 max-w-3xl text-[#4d675f]">
            Choose the workspace that matches the material you want to organize.
            Review all information for accuracy before relying on it.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {preparationTools.map(([title, description, href]) => (
              <Link
                key={title}
                href={href}
                className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm transition hover:border-[#2f7d67] hover:bg-[#f8fcfa]"
              >
                <h3 className="font-semibold text-[#10231f]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4d675f]">{description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Before using materials in court</h2>
          <p className="mt-3 max-w-3xl leading-7 text-[#4d675f]">
            Confirm the facts, dates, documents, filing requirements, and current
            court procedures. If you need advice about your circumstances, speak
            with a licensed lawyer or paralegal.
          </p>
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
          Loading case preparation...
        </main>
      }
    >
      <LitigationStrategyPageContent />
    </Suspense>
  );
}
