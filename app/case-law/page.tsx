"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";

type CaseLawCard = {
  category: string;
  title: string;
  principle: string;
  reasoning: string[];
  courtroomUse: string[];
  risks: string[];
};

const CASES: CaseLawCard[] = [
  {
    category: "Negligence",
    title: "Donoghue v. Stevenson",
    principle:
      "Duty of care and foreseeability are central to negligence reasoning.",
    reasoning: [
      "Courts focus on relationships and foreseeable harm.",
      "Judges analyze whether responsibility should legally exist.",
      "The structure of the relationship matters, not just the outcome.",
    ],
    courtroomUse: [
      "Connect conduct to foreseeable harm.",
      "Explain why responsibility existed.",
      "Focus on causation and structure.",
    ],
    risks: [
      "Emotional arguments without legal structure.",
      "Assuming bad outcomes automatically create liability.",
    ],
  },
  {
    category: "Civil Proof",
    title: "F.H. v. McDougall",
    principle:
      "Civil cases are decided on balance of probabilities, not certainty.",
    reasoning: [
      "Courts compare competing explanations.",
      "Consistency and reliability matter heavily.",
      "Stronger documentation usually improves credibility.",
    ],
    courtroomUse: [
      "Use organized exhibits.",
      "Maintain timeline consistency.",
      "Avoid exaggeration.",
    ],
    risks: ["Inconsistent chronology.", "Unsupported assumptions."],
  },
  {
    category: "Charter",
    title: "Canada (AG) v. Bedford",
    principle:
      "Government action must not create arbitrary or grossly disproportionate effects.",
    reasoning: [
      "Courts analyze the real-world impact of state conduct.",
      "Effects matter, not just intentions.",
      "Structure and practical consequences are central.",
    ],
    courtroomUse: [
      "Connect process failures to real consequences.",
      "Focus on operational effects.",
      "Show why safeguards failed in practice.",
    ],
    risks: [
      "Abstract Charter language without evidence.",
      "Ignoring practical consequences.",
    ],
  },
  {
    category: "Bail",
    title: "R. v. Antic",
    principle:
      "Release conditions must be justified and minimally restrictive.",
    reasoning: [
      "Courts examine proportionality and justification.",
      "Restrictions must connect to identified risks.",
      "Release structure matters.",
    ],
    courtroomUse: [
      "Challenge unjustified conditions.",
      "Analyze structural coherence.",
      "Focus on risk calibration.",
    ],
    risks: ["Overbroad conditions.", "Weak justification structure."],
  },
  {
    category: "Contracts",
    title: "Sattva Capital Corp. v. Creston Moly Corp.",
    principle:
      "Contracts are interpreted using factual context and surrounding circumstances.",
    reasoning: [
      "Courts analyze intent and context together.",
      "Meaning is not isolated from circumstances.",
      "Emails and negotiations may matter.",
    ],
    courtroomUse: [
      "Provide contextual evidence.",
      "Explain surrounding negotiations.",
      "Show practical meaning.",
    ],
    risks: ["Ignoring contextual evidence.", "Over-focusing on isolated wording."],
  },
  {
    category: "Procedure",
    title: "Hryniak v. Mauldin",
    principle:
      "Civil procedure should promote fair, proportionate, and efficient resolution.",
    reasoning: [
      "Courts discourage unnecessary complexity.",
      "Procedure should improve access to justice.",
      "Efficiency must still preserve fairness.",
    ],
    courtroomUse: [
      "Organize evidence clearly.",
      "Use concise focused arguments.",
      "Avoid procedural clutter.",
    ],
    risks: ["Overloading the court.", "Disorganized filings."],
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

function CaseLawPageContent() {
  const searchParams = useSearchParams();

  const caseId = searchParams.get("caseId") || "";
  const path = searchParams.get("path") || "unknown";

  const groupedCases = useMemo(() => {
    return CASES.reduce<Record<string, CaseLawCard[]>>((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }

      acc[item.category].push(item);

      return acc;
    }, {});
  }, []);

  const workspaceHref = caseId ? `/dashboard/cases/${caseId}` : "/dashboard";
  const strategyHref = buildWorkflowHref("/litigation-strategy", caseId, path);
  const documentWorkspaceHref = buildWorkflowHref(
    "/document-workspace",
    caseId,
    path,
  );
  const evidenceHref = buildWorkflowHref("/evidence", caseId, path);
  const trialPackageHref = buildWorkflowHref("/trial-package", caseId, path);
  const exportHref = buildWorkflowHref("/document-export", caseId, path);

  return (
    <main className="min-h-screen bg-[#f6faf8] px-6 py-12 text-[#16302b]">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl border border-[#d8e6df] bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
                Judicial Reasoning System
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                Case Law and Court Reasoning
              </h1>

              <p className="mt-4 max-w-4xl text-lg leading-8 text-[#4d675f]">
                This system teaches how courts actually reason through facts,
                procedure, proof, fairness, evidence, and legal structure.
                CourtSimplified uses this reasoning approach throughout the
                litigation workflow.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm">
              <p className="font-semibold text-[#10231f]">
                Workflow Integration
              </p>
              <p className="mt-2 text-[#4d675f]">Strategy</p>
              <p className="mt-1 text-[#4d675f]">Drafting</p>
              <p className="mt-1 text-[#4d675f]">Trial Preparation</p>
              <p className="mt-1 text-[#4d675f]">Court Packages</p>
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
              href={documentWorkspaceHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Drafting
            </Link>

            <Link
              href={evidenceHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Evidence
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

        <Section
          title="How courts actually reason"
          description="The purpose of case law is not to memorize citations. It is to understand how judges move from facts to legal conclusions."
        >
          <div className="grid gap-4 md:grid-cols-4">
            {[
              [
                "Facts Matter",
                "Courts analyze what actually happened, not just accusations or conclusions.",
              ],
              [
                "Structure Matters",
                "Courts look for organized reasoning, legal coherence, and evidence connections.",
              ],
              [
                "Proof Matters",
                "Judges compare competing explanations and evaluate credibility.",
              ],
              [
                "Practical Effects Matter",
                "Courts often focus on real-world consequences, fairness, and proportionality.",
              ],
            ].map(([title, body]) => (
              <div
                key={title}
                className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5"
              >
                <h3 className="font-semibold text-[#10231f]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {Object.entries(groupedCases).map(([category, cases]) => (
          <Section
            key={category}
            title={category}
            description={`Core reasoning principles frequently connected to ${category.toLowerCase()} analysis.`}
          >
            <div className="space-y-6">
              {cases.map((caseItem) => (
                <div
                  key={caseItem.title}
                  className="rounded-3xl border border-[#d8e6df] bg-[#f8fcfa] p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">
                        {caseItem.category}
                      </p>

                      <h3 className="mt-1 text-2xl font-bold">
                        {caseItem.title}
                      </h3>
                    </div>

                    <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#2f7d67]">
                      Foundational Principle
                    </span>
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#d8e6df] bg-white p-5">
                    <h4 className="font-semibold text-[#10231f]">
                      Core Principle
                    </h4>

                    <p className="mt-2 text-sm leading-7 text-[#24463d]">
                      {caseItem.principle}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-5 md:grid-cols-3">
                    <div className="rounded-2xl border border-[#d8e6df] bg-white p-5">
                      <h4 className="font-semibold text-[#10231f]">
                        How Courts Reason
                      </h4>

                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
                        {caseItem.reasoning.map((item, index) => (
                          <li key={`${caseItem.title}-reasoning-${index}`}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-[#d8e6df] bg-white p-5">
                      <h4 className="font-semibold text-[#10231f]">
                        Practical Use
                      </h4>

                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
                        {caseItem.courtroomUse.map((item, index) => (
                          <li key={`${caseItem.title}-use-${index}`}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                      <h4 className="font-semibold text-red-800">
                        Common Risks
                      </h4>

                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-red-900">
                        {caseItem.risks.map((item, index) => (
                          <li key={`${caseItem.title}-risk-${index}`}>
                            {item}
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
          title="Case law operating rules"
          description="CourtSimplified uses these principles throughout the litigation workflow."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {[
              [
                "Reasoning over citation volume",
                "Courts care more about coherent reasoning than overwhelming citation lists.",
              ],
              [
                "Facts must connect to proof",
                "Assertions without evidence usually weaken credibility.",
              ],
              [
                "Procedure affects outcomes",
                "Organization, timing, and procedural coherence matter heavily.",
              ],
              [
                "Courts compare competing narratives",
                "Judges often evaluate which explanation is more coherent and supported.",
              ],
            ].map(([title, body]) => (
              <div
                key={title}
                className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5"
              >
                <h3 className="font-semibold text-[#10231f]">{title}</h3>

                <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-[#16302b]">
            Connected litigation workflow
          </h2>

          <p className="mt-4 max-w-3xl text-[#4d675f]">
            Case-law reasoning should improve drafting, strategy, evidence
            organization, trial preparation, and final court package quality
            throughout the platform.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={strategyHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Strategy
            </Link>

            <Link
              href={documentWorkspaceHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Drafting
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
              Continue Workflow
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function CaseLawPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f6faf8] px-6 py-12 text-[#16302b]">
          Loading case law...
        </main>
      }
    >
      <CaseLawPageContent />
    </Suspense>
  );
}