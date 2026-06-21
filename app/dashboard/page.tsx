"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "../../src/lib/supabase/client";

import {
  buildDashboardSummary,
  buildDashboardWorkflowHref,
  labelDashboardPath,
  type DashboardCaseShell,
} from "../../src/lib/case-system/dashboardEngine";

type CourtPath = "family" | "small-claims" | "civil" | "unknown";

type CaseRow = DashboardCaseShell & {
  court_path: CourtPath;
  created_at: string;
  updated_at: string;
};

type CreateCaseOption = {
  path: Exclude<CourtPath, "unknown">;
  title: string;
  description: string;
  defaultTitle: string;
};

const caseOptions: CreateCaseOption[] = [
  {
    path: "family",
    title: "Family Case",
    description:
      "Parenting, support, safety, disclosure, conferences, motions, and family court documents.",
    defaultTitle: "New Family Case",
  },
  {
    path: "small-claims",
    title: "Small Claims Case",
    description:
      "Money disputes, contracts, damages, defamation, service issues, settlement conferences, and trial prep.",
    defaultTitle: "New Small Claims Case",
  },
  {
    path: "civil",
    title: "Civil Litigation Case",
    description:
      "Negligence, Charter, human rights, privacy, institutional failure, defamation, contracts, and complex evidence.",
    defaultTitle: "New Civil Case",
  },
];

function formatDate(value: string) {
  if (!value) return "unknown";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "unknown";
  }
}

function createStarterMasterResult(
  path: Exclude<CourtPath, "unknown">,
  title: string,
) {
  const now = new Date().toISOString();

  return {
    masterCaseFile: {
      id: `starter_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      casePath: path,
      province: "Ontario",
      jurisdiction: "",
      courtOrTribunal: "",
      stage: "starting-case",
      userRole: "unknown",
      title,
      summary: "",
      parties: [],
      facts: [],
      issues: [],
      timeline: [],
      evidence: [],
      proofMap: [],
      formNeeds: [],
      risks: [
        {
          id: "starter_risk_missing_intake",
          title: "Case intake not completed",
          description:
            "The case has been created, but facts, parties, issues, evidence, and procedural history still need to be added.",
          severity: "medium",
          source: "intake",
          suggestedFix:
            "Start the AI intake and add the core story, dates, parties, documents, and goals.",
        },
      ],
      proceduralIntelligence: {
        likelyForumIssues: [],
        limitationConcerns: [],
        urgencyConcerns: [],
        serviceConcerns: [],
        disclosureConcerns: [],
        nextProceduralFocus: [
          "Complete intake before relying on form recommendations or court package outputs.",
          "Add dates, parties, evidence, current stage, and what has already been filed or served.",
        ],
        pathwayWarnings: [],
      },
      strategy: {
        strengths: [],
        weaknesses: [
          "No evidence has been linked yet.",
          "No legal issues have been mapped yet.",
          "No proof chart has been created yet.",
        ],
        likelyOtherSideArguments: [],
        likelyJudgeConcerns: [],
        suggestedWordingImprovements: [],
        settlementConsiderations: [],
        nextStrategicSteps: [
          "Complete intake.",
          "Upload or describe evidence.",
          "Build timeline.",
          "Review proof gaps before drafting.",
        ],
      },
      courtPackage: {
        packageSections: [],
        exhibitOrder: [],
        missingPackageItems: [
          "Facts",
          "Timeline",
          "Evidence",
          "Issues",
          "Proof map",
          "Forms",
        ],
        filingNotes: [],
        serviceNotes: [],
        exportNotes: [],
      },
      readiness: {
        level: "not-ready",
        score: 0,
        reasons: [],
        blockers: [
          "The case needs intake, evidence, timeline, issue mapping, and proof mapping before export.",
        ],
      },
      aiMemory: {
        plainLanguageSummary: "",
        structuredSummary: "",
        userGoals: [],
        importantFacts: [],
        unresolvedQuestions: [
          "What happened?",
          "Who is involved?",
          "What dates matter?",
          "What documents or screenshots exist?",
          "What result is the user asking for?",
        ],
        warningsForAi: [
          "Do not invent legal advice, deadlines, case law, or forms.",
          "Ask clarifying questions when facts or evidence are missing.",
          "Separate facts from conclusions.",
          "Link every recommendation to case stage, evidence, and user goals.",
        ],
        lastUpdatedByEngine: "dashboardCreateCase",
      },
      domainData: {},
    },
  };
}

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [creatingPath, setCreatingPath] = useState<CourtPath | "">("");
  const [userEmail, setUserEmail] = useState("");
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [error, setError] = useState("");

  const enrichedCases = useMemo(() => {
    return cases.map((caseFile) => ({
      caseFile,
      dashboard: buildDashboardSummary(caseFile),
    }));
  }, [cases]);

  const caseStats = useMemo(() => {
    const exportReady = enrichedCases.filter(
      (item) => item.dashboard.readinessScore >= 80,
    ).length;

    const needsIntake = enrichedCases.filter(
      (item) =>
        !item.dashboard.masterHasData ||
        item.dashboard.master.facts.length === 0,
    ).length;

    const active = cases.filter((item) => item.status === "active").length;

    return {
      total: cases.length,
      active,
      needsIntake,
      exportReady,
      family: cases.filter((item) => item.court_path === "family").length,
      smallClaims: cases.filter((item) => item.court_path === "small-claims")
        .length,
      civil: cases.filter((item) => item.court_path === "civil").length,
    };
  }, [cases, enrichedCases]);

  const mostRecentCase = enrichedCases[0];

  async function loadDashboard() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    setUserEmail(user.email || "");

    const { data, error } = await supabase
      .from("cases")
      .select(
        "id,title,court_path,status,current_stage,created_at,updated_at,master_result",
      )
      .order("updated_at", { ascending: false });

    if (error) {
      setError(error.message);
      setCases([]);
    } else {
      setCases((data || []) as CaseRow[]);
    }

    setLoading(false);
  }

  async function createCase(option: CreateCaseOption) {
    setCreatingPath(option.path);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }
        const starterMasterResult = createStarterMasterResult(
      option.path,
      option.defaultTitle,
    );

    const { data, error } = await supabase
      .from("cases")
      .insert({
        user_id: user.id,
        court_path: option.path,
        title: option.defaultTitle,
        status: "active",
        current_stage: "starting-case",
        master_result: starterMasterResult,
      })
      .select("id")
      .single();

    setCreatingPath("");

    if (error) {
      setError(error.message);
      return;
    }

    router.push(`/dashboard/cases/${data.id}`);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8] text-[#1F2937]">
        <div className="rounded-3xl border border-[#d7e7e5] bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#2FB8AC]">
            CourtSimplified
          </p>
          <p className="mt-3 text-lg font-semibold">
            Loading your secure litigation workspace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6faf8] px-6 py-10 text-[#1F2937]">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-[#d7e7e5] bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2FB8AC]">
                CourtSimplified Command Center
              </p>

              <h1 className="mt-2 text-4xl font-bold">
                My Litigation Workspace
              </h1>

              <p className="mt-3 max-w-3xl text-[#4B5563]">
                Signed in as {userEmail}. This dashboard coordinates your case
                files, AI intake, evidence intelligence, form review, drafting,
                litigation strategy, court package preparation, trial package,
                and export readiness.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={loadDashboard}
                className="rounded-full border border-[#2f7d67] bg-white px-6 py-3 font-semibold text-[#2f7d67] transition hover:bg-[#eef8f5]"
              >
                Refresh
              </button>

              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-[#2f7d67] bg-white px-6 py-3 font-semibold text-[#2f7d67] transition hover:bg-[#eef8f5]"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mt-8 grid gap-5 md:grid-cols-4">
          <div className="rounded-3xl border border-[#d7e7e5] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">
              Total Cases
            </p>
            <p className="mt-3 text-4xl font-bold">{caseStats.total}</p>
            <p className="mt-2 text-sm text-[#6B7280]">
              All saved litigation files.
            </p>
          </div>

          <div className="rounded-3xl border border-[#d7e7e5] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">
              Active Cases
            </p>
            <p className="mt-3 text-4xl font-bold">{caseStats.active}</p>
            <p className="mt-2 text-sm text-[#6B7280]">
              Currently open workflows.
            </p>
          </div>

          <div className="rounded-3xl border border-[#d7e7e5] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">
              Needs Intake
            </p>
            <p className="mt-3 text-4xl font-bold">{caseStats.needsIntake}</p>
            <p className="mt-2 text-sm text-[#6B7280]">
              Files missing core facts.
            </p>
          </div>

          <div className="rounded-3xl border border-[#d7e7e5] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">
              Export Ready
            </p>
            <p className="mt-3 text-4xl font-bold">{caseStats.exportReady}</p>
            <p className="mt-2 text-sm text-[#6B7280]">
              Packages near final review.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-[#d7e7e5] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">
              Family
            </p>
            <p className="mt-3 text-4xl font-bold">{caseStats.family}</p>
          </div>

          <div className="rounded-3xl border border-[#d7e7e5] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">
              Small Claims
            </p>
            <p className="mt-3 text-4xl font-bold">{caseStats.smallClaims}</p>
          </div>

          <div className="rounded-3xl border border-[#d7e7e5] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">
              Civil
            </p>
            <p className="mt-3 text-4xl font-bold">{caseStats.civil}</p>
          </div>
        </section>

        {mostRecentCase ? (
          <section className="mt-8 rounded-3xl border border-[#d7e7e5] bg-white p-7 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-[#2FB8AC]">
                  Continue where you left off
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {mostRecentCase.caseFile.title}
                </h2>

                <p className="mt-2 text-[#4B5563]">
                  {labelDashboardPath(mostRecentCase.caseFile.court_path)} ·{" "}
                  {mostRecentCase.caseFile.current_stage || "stage not set"} ·{" "}
                  {mostRecentCase.caseFile.status}
                </p>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#4B5563]">
                  Recommended next step:{" "}
                  <span className="font-semibold text-[#1F2937]">
                    {mostRecentCase.dashboard.nextAction.title}
                  </span>
                  . {mostRecentCase.dashboard.nextAction.text}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/dashboard/cases/${mostRecentCase.caseFile.id}`,
                    )
                  }
                  className="rounded-full border border-[#2f7d67] bg-white px-6 py-3 font-semibold text-[#2f7d67] transition hover:bg-[#eef8f5]"
                >
                  Open Command Center
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(mostRecentCase.dashboard.nextAction.href)
                  }
                  className="rounded-full bg-[#2f7d67] px-6 py-3 font-semibold text-white transition hover:bg-[#256b58]"
                >
                  Continue Next Step
                </button>
              </div>
            </div>
          </section>
        ) : null}
                <section className="mt-8 rounded-3xl border border-[#d7e7e5] bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-bold">Start a Case</h2>

          <p className="mt-3 max-w-3xl text-[#4B5563]">
            Each new case begins with a master litigation file. The system will
            track intake, evidence, proof gaps, procedural risks, forms,
            strategy, drafting, and court package readiness from the start.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {caseOptions.map((option) => (
              <button
                key={option.path}
                type="button"
                onClick={() => createCase(option)}
                disabled={Boolean(creatingPath)}
                className="rounded-3xl border border-[#d7e7e5] bg-[#f8fcfb] p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#2FB8AC] hover:shadow-md disabled:opacity-50"
              >
                <h3 className="text-xl font-bold">{option.title}</h3>

                <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                  {option.description}
                </p>

                <span className="mt-5 inline-flex rounded-full bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white">
                  {creatingPath === option.path ? "Creating..." : "Create Case"}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#d7e7e5] bg-white p-7 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">My Cases</h2>

              <p className="mt-2 text-[#4B5563]">
                Continue a case file, recover the workflow, or open the full
                litigation command center.
              </p>
            </div>

            <button
              type="button"
              onClick={loadDashboard}
              className="rounded-full border border-[#2f7d67] bg-white px-5 py-3 font-semibold text-[#2f7d67] transition hover:bg-[#eef8f5]"
            >
              Refresh
            </button>
          </div>

          {enrichedCases.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[#bfd8d3] bg-[#f8fcfb] p-6 text-[#4B5563]">
              No cases yet. Create a case above to open your first litigation
              workspace.
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {enrichedCases.map(({ caseFile, dashboard }) => (
                <article
                  key={caseFile.id}
                  className="rounded-3xl border border-[#d7e7e5] bg-[#f8fcfb] p-5 shadow-sm transition hover:border-[#2FB8AC] hover:bg-white"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold">{caseFile.title}</h3>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2f7d67] ring-1 ring-[#d7e7e5]">
                          {labelDashboardPath(caseFile.court_path)}
                        </span>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#4B5563] ring-1 ring-[#d7e7e5]">
                          {caseFile.status}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-[#4B5563]">
                        Stage: {caseFile.current_stage || "stage not set"}
                      </p>

                      <p className="mt-1 text-xs text-[#6B7280]">
                        Last updated: {formatDate(caseFile.updated_at)}
                      </p>

                      <div className="mt-4">
                        <div className="h-3 overflow-hidden rounded-full bg-[#e6f2ef]">
                          <div
                            className="h-full rounded-full bg-[#2f7d67]"
                            style={{
                              width: `${dashboard.readinessScore}%`,
                            }}
                          />
                        </div>

                        <p className="mt-2 text-xs font-semibold text-[#4B5563]">
                          Readiness score: {dashboard.readinessScore}/100
                        </p>
                      </div>

                      <div className="mt-4 grid gap-2 text-xs md:grid-cols-5">
                        {dashboard.workflowCards.slice(0, 5).map((step) => (
                          <span
                            key={step.key}
                            className={`rounded-full px-3 py-2 font-semibold ${
                              step.complete
                                ? "bg-[#e8f7f2] text-[#1f6b54]"
                                : "bg-[#fff7ed] text-[#9a3412]"
                            }`}
                          >
                            {step.title} {step.complete ? "ready" : "needed"}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 rounded-2xl border border-[#d7e7e5] bg-white p-4">
                        <p className="text-sm font-bold">
                          Next step: {dashboard.nextAction.title}
                        </p>

                        <p className="mt-1 text-sm leading-6 text-[#4B5563]">
                          {dashboard.nextAction.text}
                        </p>

                        {dashboard.operationalWarnings.length > 0 ? (
                          <ul className="mt-3 space-y-1 text-sm text-[#6B7280]">
                            {dashboard.operationalWarnings
                              .slice(0, 3)
                              .map((warning) => (
                                <li key={warning}>• {warning}</li>
                              ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex min-w-[220px] flex-col gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/dashboard/cases/${caseFile.id}`)
                        }
                        className="rounded-full border border-[#2f7d67] bg-white px-5 py-3 text-sm font-semibold text-[#2f7d67] transition hover:bg-[#eef8f5]"
                      >
                        Open Command Center
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push(dashboard.nextAction.href)}
                        className="rounded-full bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#256b58]"
                      >
                        Continue Workflow
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            buildDashboardWorkflowHref(
                              "/document-workspace",
                              caseFile,
                            ),
                          )
                        }
                        className="rounded-full border border-[#bfd8d3] bg-white px-5 py-3 text-sm font-semibold text-[#374151] transition hover:bg-[#f3fbf8]"
                      >
                        Document Workspace
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}