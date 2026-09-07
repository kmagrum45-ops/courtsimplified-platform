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

function TrialPackagePageContent() {
  const searchParams = useSearchParams();
  const caseId = searchParams.get("caseId") || "";
  const path = searchParams.get("path") || "unknown";

  if (!caseId) {
    return (
      <main className="min-h-screen bg-[#f6faf8] p-6 text-[#16302b]">
        <section className="mx-auto max-w-3xl rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
            Trial Preparation
          </p>
          <h1 className="mt-2 text-3xl font-bold">Choose a case first</h1>
          <p className="mt-3 max-w-2xl leading-7 text-[#4d675f]">
            Open trial-preparation tools from one of your cases. CourtSimplified
            will not use a draft or another case when the selected case is unavailable.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
          >
            Go to My Cases
          </Link>
        </section>
      </main>
    );
  }

  const tools = [
    ["Evidence", "Organize the records you want to review for this case.", buildWorkflowHref("/evidence", caseId, path)],
    ["Document Workspace", "Review draft materials connected to this selected case.", buildWorkflowHref("/document-workspace", caseId, path)],
    ["Court Package", "Organize a court package for careful review.", buildWorkflowHref("/court-package", caseId, path)],
    ["Export", "Prepare a working export for careful review.", buildWorkflowHref("/document-export", caseId, path)],
  ];

  return (
    <main className="min-h-screen bg-[#f6faf8] p-6 text-[#16302b]">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
            Trial Preparation
          </p>
          <h1 className="mt-2 text-4xl font-bold">Organize Your Materials</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#4d675f]">
            Keep your documents, records, and working materials organized in one
            selected case. CourtSimplified does not assess the strength of your case,
            predict what another party or a judge may do, or recommend a legal strategy.
          </p>
          <div className="mt-5 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm text-[#4d675f]">
            <p className="font-semibold text-[#10231f]">Selected case</p>
            <p className="mt-1 break-all">Case ID: {caseId}</p>
          </div>
          <div className="mt-5">
            <LegalInformationNotice />
          </div>
        </section>

        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-[#16302b]">Review before relying on materials</h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 leading-7 text-[#4d675f]">
            <li>Check that facts, dates, and document labels are accurate.</li>
            <li>Keep records organized so you can locate them easily.</li>
            <li>Confirm current filing, service, and court requirements independently.</li>
            <li>Get advice from a licensed lawyer or paralegal when you need advice about your circumstances.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Open a case workspace</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {tools.map(([title, description, href]) => (
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
      </div>
    </main>
  );
}

export default function TrialPackagePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f6faf8] text-[#16302b]">
          Loading trial preparation...
        </main>
      }
    >
      <TrialPackagePageContent />
    </Suspense>
  );
}
