"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

/*
 * The 22 stage cards moved to src/lib/content-library/proceduralStages.ts on
 * 2026-09-23. They were a module-private const here, which meant the content
 * inventory could not see them and no review packet listed them -- 926 lines
 * of live procedural content across three courts, outside every review track.
 *
 * The page renders the same array it always did.
 */
import {
  PRINCIPLES,
  type PrincipleCard,
  type PrincipleCitation,
} from "../../src/lib/content-library/proceduralStages";


function buildWorkflowHref(route: string, caseId?: string, path?: string) {
  const params = new URLSearchParams();

  if (caseId) params.set("caseId", caseId);
  if (path && path !== "unknown") params.set("path", path);

  const query = params.toString();
  return query ? `${route}?${query}` : route;
}

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

      <div className="mt-5">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function CitationList({ citations }: { citations: PrincipleCitation[] }) {
  return (
    <ul className="space-y-2 text-xs leading-5 text-[#49635c]">
      {citations.map((citation, index) => (
        <li key={`${citation.officialUrl}-${index}`}>
          <a
            href={citation.officialUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#2f7d67] underline"
          >
            {citation.sourceName}
          </a>
          {citation.pinpoint ? <> — {citation.pinpoint}</> : null}
          <span className="text-[#6b8078]"> · verified {citation.verifiedAt}</span>
        </li>
      ))}
    </ul>
  );
}

function LegalPrinciplesPageContent() {
  const searchParams = useSearchParams();

  const caseId = searchParams.get("caseId") || "";
  const path = searchParams.get("path") || "unknown";

  const groupedPrinciples = useMemo(() => {
    return PRINCIPLES.reduce<Record<string, PrincipleCard[]>>((acc, item) => {
      if (!acc[item.courtPath]) acc[item.courtPath] = [];
      acc[item.courtPath].push(item);
      return acc;
    }, {});
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
  const exportHref = buildWorkflowHref("/document-export", caseId, path);

  return (
    <main className="min-h-screen bg-[#f6faf8] px-6 py-12 text-[#16302b]">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl border border-[#d8e6df] bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
                Procedure Reference
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                Legal Principles and Court Procedure
              </h1>

              <p className="mt-4 max-w-4xl text-lg leading-8 text-[#4d675f]">
                This page covers procedure, forms, monetary limits, and
                deadlines for Ontario Small Claims Court, Superior Court civil
                claims, and Family Court — the facts a self-represented
                litigant needs to move a case forward correctly. Every
                statement here is sourced and dated below it.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm">
              <p className="font-semibold text-[#10231f]">Sourced From</p>
              <p className="mt-2 text-[#4d675f]">ontario.ca</p>
              <p className="mt-1 text-[#4d675f]">ontariocourts.ca</p>
              <p className="mt-1 text-[#4d675f]">ontariocourtforms.on.ca</p>
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
              href={strategyHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Strategy
            </Link>

            <Link
              href={evidenceHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Evidence
            </Link>

            <Link
              href={documentWorkspaceHref}
              className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
            >
              Apply to Drafting
            </Link>
          </div>
        </section>

        <Section
          title="How to use this page"
          description="This is not a substitute for legal advice. It is a sourced procedural reference — what form to file, what deadline applies, and what a missed step costs. Every fact below links to the official source it was checked against, and the date it was checked."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
              <h3 className="font-semibold text-[#10231f]">Identify</h3>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                Find the court path — Small Claims, Civil, or Family — that
                matches the case.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
              <h3 className="font-semibold text-[#10231f]">Track</h3>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                Match each stage of the case to its deadline, form, and
                service rule.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
              <h3 className="font-semibold text-[#10231f]">Verify</h3>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                Facts like dollar limits change — check the verified date on
                each card, and the official source if it looks old.
              </p>
            </div>
          </div>
        </Section>

        {Object.entries(groupedPrinciples).map(([courtPath, principles]) => (
          <Section
            key={courtPath}
            title={courtPath}
            description={`Sourced procedure, forms, and deadlines for ${courtPath}.`}
          >
            <div className="space-y-6">
              {principles.map((principle) => (
                <div
                  key={principle.title}
                  className="rounded-3xl border border-[#d8e6df] bg-[#f8fcfa] p-6"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">
                    {principle.courtPath}
                  </p>

                  <h3 className="mt-1 text-2xl font-bold">
                    {principle.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#4d675f]">
                    {principle.summary}
                  </p>

                  <div className="mt-5 grid gap-5 md:grid-cols-4">
                    <div className="rounded-2xl border border-[#d8e6df] bg-white p-5">
                      <h4 className="font-semibold text-[#10231f]">
                        Key Facts
                      </h4>
                      <div className="mt-3">
                        <BulletList items={principle.keyFacts} />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#d8e6df] bg-white p-5">
                      <h4 className="font-semibold text-[#10231f]">
                        Workflow Use
                      </h4>
                      <div className="mt-3">
                        <BulletList items={principle.workflowUse} />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                      <h4 className="font-semibold text-red-800">
                        Common Risks
                      </h4>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-red-900">
                        {principle.commonRisks.map((risk, index) => (
                          <li key={`${principle.title}-risk-${index}`}>
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-[#d8e6df] bg-white p-5">
                      <h4 className="font-semibold text-[#10231f]">
                        Source
                      </h4>
                      <div className="mt-3">
                        <CitationList citations={principle.citations} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        ))}

        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-[#16302b]">
            Connected litigation workflow
          </h2>

          <p className="mt-4 max-w-3xl text-[#4d675f]">
            Use this procedure reference alongside evidence organization,
            strategy, drafting, form selection, trial preparation, and court
            packages.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={formsHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Forms
            </Link>

            <Link
              href={evidenceHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Evidence
            </Link>

            <Link
              href={strategyHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Strategy
            </Link>

            <Link
              href={courtPackageHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Court Package
            </Link>

            <Link
              href={trialPackageHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
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

export default function LegalPrinciplesPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f6faf8] text-[#16302b]">
          Loading legal principles...
        </main>
      }
    >
      <LegalPrinciplesPageContent />
    </Suspense>
  );
}
