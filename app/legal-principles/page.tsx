"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

type PrincipleCard = {
  area: string;
  title: string;
  plainMeaning: string;
  courtFocus: string[];
  proofNeeded: string[];
  workflowUse: string[];
  commonRisks: string[];
};

const PRINCIPLES: PrincipleCard[] = [
  {
    area: "Civil Proof",
    title: "Balance of Probabilities",
    plainMeaning:
      "In most civil cases, the court decides whether something is more likely than not.",
    courtFocus: [
      "Whether the story is internally consistent.",
      "Whether documents support the facts.",
      "Whether the explanation is more believable than the other side’s version.",
    ],
    proofNeeded: [
      "Clear timeline.",
      "Documents, messages, contracts, photos, receipts, or records.",
      "Consistent explanation of what happened.",
    ],
    workflowUse: [
      "Use Evidence to organize exhibits.",
      "Use Strategy to identify weak proof.",
      "Use Trial Package to prepare how the evidence will be presented.",
    ],
    commonRisks: [
      "Assuming the court will believe facts without records.",
      "Contradictory dates or unclear timelines.",
      "Too much emotion and not enough proof.",
    ],
  },
  {
    area: "Negligence",
    title: "Duty, Breach, Causation, and Damages",
    plainMeaning:
      "A negligence claim usually needs responsibility, a failure of that responsibility, a connection to harm, and a real loss.",
    courtFocus: [
      "Whether the other party owed a legal responsibility.",
      "What standard of conduct was expected.",
      "Whether the failure caused the claimed loss.",
      "Whether the harm can be proven.",
    ],
    proofNeeded: [
      "Facts showing responsibility.",
      "Evidence showing what went wrong.",
      "Evidence connecting the conduct to the loss.",
      "Receipts, repair records, medical records, photos, estimates, or other proof of harm.",
    ],
    workflowUse: [
      "Use Legal Strategy to test causation.",
      "Use Evidence to connect each exhibit to an issue.",
      "Use Document Workspace to draft facts in a structured way.",
    ],
    commonRisks: [
      "Focusing only on the bad outcome.",
      "Weak connection between conduct and loss.",
      "No documents proving damages.",
    ],
  },
  {
    area: "Contracts",
    title: "Agreement, Breach, and Loss",
    plainMeaning:
      "Contract disputes usually turn on what was agreed, what was not followed, and what loss resulted.",
    courtFocus: [
      "The wording of the agreement.",
      "The surrounding context.",
      "What each side did after the agreement.",
      "Whether the claimed loss flows from the breach.",
    ],
    proofNeeded: [
      "Contract or written agreement.",
      "Emails, texts, invoices, payments, receipts, or work records.",
      "Proof of what was promised.",
      "Proof of what was not delivered or paid.",
    ],
    workflowUse: [
      "Use Evidence to group contract records.",
      "Use Timeline to show sequence.",
      "Use Strategy to prepare for opposing explanations.",
    ],
    commonRisks: [
      "No clear agreement.",
      "Unclear payment records.",
      "Missing proof of loss.",
    ],
  },
  {
    area: "Charter / Government Action",
    title: "State Conduct and Rights Impact",
    plainMeaning:
      "Charter issues usually involve government conduct affecting rights, fairness, liberty, security, equality, or legal process.",
    courtFocus: [
      "Whether the actor was government or state-connected.",
      "What right or legal interest was affected.",
      "Whether the process or outcome was arbitrary, unfair, overbroad, or disproportionate.",
      "Whether the harm is connected to the state conduct.",
    ],
    proofNeeded: [
      "Government records, court documents, policies, decisions, orders, or correspondence.",
      "Timeline of government action.",
      "Evidence of real impact.",
      "Clear link between state conduct and harm.",
    ],
    workflowUse: [
      "Use Case Law for reasoning principles.",
      "Use Legal Strategy to identify state-action weaknesses.",
      "Use Document Workspace to avoid vague rights language.",
    ],
    commonRisks: [
      "Using broad Charter language without facts.",
      "Not identifying the government action clearly.",
      "Not proving practical impact.",
    ],
  },
  {
    area: "Evidence",
    title: "Relevance, Reliability, and Organization",
    plainMeaning:
      "Evidence matters when it helps prove a fact the court actually needs to decide.",
    courtFocus: [
      "Whether the evidence is relevant.",
      "Whether it is reliable.",
      "Whether it supports a disputed fact.",
      "Whether it is organized clearly.",
    ],
    proofNeeded: [
      "Exhibit labels.",
      "Short description of what each exhibit proves.",
      "Dates and source of each record.",
      "Connection between evidence and legal issue.",
    ],
    workflowUse: [
      "Use Evidence page to label exhibits.",
      "Use Trial Package to sequence exhibits.",
      "Use Court Package to assemble final materials.",
    ],
    commonRisks: [
      "Uploading documents without explaining relevance.",
      "Duplicate or disorganized exhibits.",
      "Evidence that does not prove the issue claimed.",
    ],
  },
  {
    area: "Procedure",
    title: "Forms, Deadlines, Service, and Filing",
    plainMeaning:
      "Even strong facts can be harmed if procedure is not followed.",
    courtFocus: [
      "Whether the correct forms were used.",
      "Whether documents were served properly.",
      "Whether deadlines were met.",
      "Whether the court has the information it needs.",
    ],
    proofNeeded: [
      "Correct court forms.",
      "Proof of service.",
      "Filed copies.",
      "Deadline tracking.",
    ],
    workflowUse: [
      "Use Forms page for required documents.",
      "Use Dashboard for case stage.",
      "Use Export to review final package readiness.",
    ],
    commonRisks: [
      "Wrong form for the stage.",
      "Missing proof of service.",
      "Late or incomplete materials.",
    ],
  },
  {
    area: "Damages / Remedy",
    title: "What the Court Can Order",
    plainMeaning:
      "A case should clearly explain what result is being asked for and why it is supported.",
    courtFocus: [
      "What remedy is requested.",
      "Whether the remedy is legally available.",
      "Whether the amount or order is supported by evidence.",
      "Whether the request is proportionate and clear.",
    ],
    proofNeeded: [
      "Damages calculation.",
      "Receipts, estimates, invoices, records, or other support.",
      "Explanation of how the number was reached.",
      "Evidence connecting the loss to the legal claim.",
    ],
    workflowUse: [
      "Use Document Workspace to draft remedy request.",
      "Use Strategy to test weakness in damages.",
      "Use Export to verify final support.",
    ],
    commonRisks: [
      "Asking for an amount without calculation.",
      "No documents supporting loss.",
      "Remedy does not match the legal issue.",
    ],
  },
];

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

function LegalPrinciplesPageContent() {
  const searchParams = useSearchParams();

  const caseId = searchParams.get("caseId") || "";
  const path = searchParams.get("path") || "unknown";

  const groupedPrinciples = useMemo(() => {
    return PRINCIPLES.reduce<Record<string, PrincipleCard[]>>((acc, item) => {
      if (!acc[item.area]) acc[item.area] = [];
      acc[item.area].push(item);
      return acc;
    }, {});
  }, []);

  const workspaceHref = caseId ? `/dashboard/cases/${caseId}` : "/dashboard";
  const evidenceHref = buildWorkflowHref("/evidence", caseId, path);
  const formsHref = buildWorkflowHref("/forms", caseId, path);
  const strategyHref = buildWorkflowHref("/litigation-strategy", caseId, path);
  const caseLawHref = buildWorkflowHref("/case-law", caseId, path);
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
                Legal Reasoning Layer
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                Legal Principles and Court Analysis
              </h1>

              <p className="mt-4 max-w-4xl text-lg leading-8 text-[#4d675f]">
                This page explains the legal structures courts commonly use
                when reviewing facts, evidence, procedure, remedies, and
                responsibility. It supports the rest of the CourtSimplified
                workflow by helping users understand what their documents and
                evidence must prove.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm">
              <p className="font-semibold text-[#10231f]">System Role</p>
              <p className="mt-2 text-[#4d675f]">Doctrine</p>
              <p className="mt-1 text-[#4d675f]">Proof Structure</p>
              <p className="mt-1 text-[#4d675f]">Strategy Support</p>
              <p className="mt-1 text-[#4d675f]">Drafting Guidance</p>
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
              href={caseLawHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Case Law
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
          description="This is not a substitute for legal advice. It is a structured reasoning layer that helps users organize facts, proof, and documents around the issues courts usually care about."
        >
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
              <h3 className="font-semibold text-[#10231f]">Identify</h3>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                Find the legal structure that matches the case problem.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
              <h3 className="font-semibold text-[#10231f]">Prove</h3>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                Match each issue to evidence, records, dates, and exhibits.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
              <h3 className="font-semibold text-[#10231f]">Test</h3>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                Look for missing proof, weak causation, or unclear remedies.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
              <h3 className="font-semibold text-[#10231f]">Apply</h3>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                Use the structure in drafting, strategy, trial prep, and export.
              </p>
            </div>
          </div>
        </Section>

        {Object.entries(groupedPrinciples).map(([area, principles]) => (
          <Section
            key={area}
            title={area}
            description={`Core court-analysis structure for ${area.toLowerCase()} issues.`}
          >
            <div className="space-y-6">
              {principles.map((principle) => (
                <div
                  key={principle.title}
                  className="rounded-3xl border border-[#d8e6df] bg-[#f8fcfa] p-6"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">
                    {principle.area}
                  </p>

                  <h3 className="mt-1 text-2xl font-bold">
                    {principle.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#4d675f]">
                    {principle.plainMeaning}
                  </p>

                  <div className="mt-5 grid gap-5 md:grid-cols-4">
                    <div className="rounded-2xl border border-[#d8e6df] bg-white p-5">
                      <h4 className="font-semibold text-[#10231f]">
                        Court Focus
                      </h4>
                      <div className="mt-3">
                        <BulletList items={principle.courtFocus} />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#d8e6df] bg-white p-5">
                      <h4 className="font-semibold text-[#10231f]">
                        Proof Needed
                      </h4>
                      <div className="mt-3">
                        <BulletList items={principle.proofNeeded} />
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
                  </div>
                </div>
              ))}
            </div>
          </Section>
        ))}

        <Section
          title="System-wide legal reasoning rules"
          description="These rules should guide every CourtSimplified workflow page."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
              <h3 className="font-semibold text-[#10231f]">
                A fact is not proof by itself
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                The user must connect facts to exhibits, records, witnesses,
                admissions, or other reliable support.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
              <h3 className="font-semibold text-[#10231f]">
                A bad outcome is not automatically liability
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                The system should test legal responsibility, causation, and
                available remedies before drafting conclusions.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
              <h3 className="font-semibold text-[#10231f]">
                Procedure controls what the court can consider
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                Forms, service, deadlines, filing requirements, and evidence
                rules must be integrated into the workflow.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
              <h3 className="font-semibold text-[#10231f]">
                Strong drafting follows strong proof
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                Documents should be drafted from organized issues, evidence,
                timeline, strategy, and remedy analysis.
              </p>
            </div>
          </div>
        </Section>

        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-[#16302b]">
            Connected litigation workflow
          </h2>

          <p className="mt-4 max-w-3xl text-[#4d675f]">
            Legal principles should strengthen evidence organization, strategy,
            drafting, form selection, trial preparation, court packages, and
            final export. This page is the doctrine layer that supports the
            full litigation operating system.
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