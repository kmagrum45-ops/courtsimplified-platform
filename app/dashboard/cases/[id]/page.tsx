"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { supabase } from "../../../../src/lib/supabase/client";

import {
  buildDashboardSummary,
  buildDashboardWorkflowHref,
  labelDashboardPath,
  type DashboardCaseShell,
} from "../../../../src/lib/case-system/dashboardEngine";

type CourtPath = "family" | "small-claims" | "civil" | "unknown";

type CaseRow = DashboardCaseShell & {
  court_path: CourtPath;
  created_at: string;
  updated_at: string;
};

function statusTone(count: number) {
  if (count === 0) return "text-red-700 bg-red-50 border-red-200";
  if (count < 3) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-emerald-700 bg-emerald-50 border-emerald-200";
}

function readinessTone(score: number) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function completionTone(complete: boolean, warning: boolean) {
  if (complete) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (warning) return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-red-200 bg-red-50 text-red-800";
}

function intelligenceTone(level?: string) {
  if (!level) return "border-slate-200 bg-slate-50 text-slate-700";
  if (["very-high", "high", "ready", "manageable"].includes(level)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (["medium", "elevated", "developing", "near-ready"].includes(level)) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  return "border-red-200 bg-red-50 text-red-800";
}

function riskTone(value: number) {
  if (value <= 0) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (value < 3) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

export default function CaseWorkspacePage() {
  const params = useParams();
  const router = useRouter();

  const caseId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const [loading, setLoading] = useState(true);
  const [caseFile, setCaseFile] = useState<CaseRow | null>(null);
  const [error, setError] = useState("");

  const dashboard = useMemo(
    () => (caseFile ? buildDashboardSummary(caseFile) : null),
    [caseFile],
  );

  const master = dashboard?.master;
  const highRisks = dashboard?.highRisks || [];
  const masterHasData = dashboard?.masterHasData || false;
  const systemScore = dashboard?.systemScore || 0;
  const operationalWarnings = dashboard?.operationalWarnings || [];
  const readinessScore = dashboard?.readinessScore || 0;
  const readinessLevel = dashboard?.readinessLevel || "not-ready";

  const nextAction = dashboard?.nextAction || {
    title: "Return to Dashboard",
    text: "Case could not be loaded.",
    href: "/dashboard",
  };

  const workflowCards = dashboard?.workflowCards || [];

  const authority = master?.authorityReadiness;
  const contradictions = master?.contradictionReadiness;
  const credibility = master?.credibilityIntelligence;

  async function loadCase() {
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

    const { data, error: caseError } = await supabase
      .from("cases")
      .select(
        "id,title,court_path,status,current_stage,created_at,updated_at,master_result",
      )
      .eq("id", caseId)
      .single();

    if (caseError) {
      setError(caseError.message);
      setCaseFile(null);
    } else {
      setCaseFile(data as CaseRow);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (caseId) {
      loadCase();
    }
  }, [caseId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6faf8] text-[#1F2937]">
        <div className="rounded-3xl border border-[#d7e7e5] bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#2FB8AC]">
            CourtSimplified
          </p>
          <p className="mt-3 text-lg font-semibold">
            Loading litigation workspace...
          </p>
        </div>
      </main>
    );
  }

  if (error || !caseFile || !master) {
    return (
      <main className="min-h-screen bg-[#f6faf8] px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-white p-8 text-red-700">
          <h1 className="text-2xl font-bold">Case could not be loaded</h1>
          <p className="mt-3">{error || "No case file was found."}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-full bg-[#2f7d67] px-5 py-3 font-semibold text-white"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6faf8] px-6 py-10 text-[#1F2937]">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl border border-[#d7e7e5] bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2FB8AC]">
                Litigation Command Center
              </p>

              <h1 className="mt-2 text-4xl font-bold">{caseFile.title}</h1>

              <p className="mt-3 max-w-3xl text-[#4B5563]">
                This workspace coordinates intake, case intelligence, evidence,
                proof mapping, procedure, strategy, forms, drafting, package
                preparation, trial readiness, and export safety for this case.
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-[#d7e7e5] bg-[#f8fcfb] px-4 py-2 font-semibold">
                  {labelDashboardPath(caseFile.court_path)}
                </span>
                <span className="rounded-full border border-[#d7e7e5] bg-[#f8fcfb] px-4 py-2 font-semibold">
                  Stage: {caseFile.current_stage || "not set"}
                </span>
                <span className="rounded-full border border-[#d7e7e5] bg-[#f8fcfb] px-4 py-2 font-semibold">
                  Status: {caseFile.status}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#d7e7e5] bg-[#f8fcfb] px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                Case ID
              </p>
              <p className="mt-1 max-w-[260px] break-all font-mono text-sm">
                {caseFile.id}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#d7e7e5] bg-white p-7 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2FB8AC]">
                Recommended Next Action
              </p>
              <h2 className="mt-2 text-2xl font-bold">{nextAction.title}</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-[#4B5563]">
                {nextAction.text}
              </p>
            </div>

            <Link
              href={nextAction.href}
              className="inline-flex rounded-full bg-[#2f7d67] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#256b58]"
            >
              Continue →
            </Link>
          </div>
        </section>

        {!masterHasData ? (
          <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
            <h2 className="text-xl font-bold">
              Case intelligence is not built yet
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6">
              This case exists, but the master case result is still empty or
              incomplete. Start or continue the intake first so CourtSimplified
              can build the issues, timeline, evidence structure, proof map,
              form needs, strategy warnings, and readiness score.
            </p>

            <Link
              href={buildDashboardWorkflowHref("/builder", caseFile)}
              className="mt-5 inline-flex rounded-full bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white"
            >
              Continue Intake →
            </Link>
          </section>
        ) : null}

        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-6">
          {[
            ["Parties", master.parties.length],
            ["Facts", master.facts.length],
            ["Issues", master.issues.length],
            ["Evidence", master.evidence.length],
            ["Proof Map", master.proofMap.length],
            ["High Risks", highRisks.length],
          ].map(([label, value]) => (
            <div
              key={label}
              className={`rounded-3xl border p-6 shadow-sm ${statusTone(Number(value))}`}
            >
              <p className="text-sm font-semibold uppercase tracking-wide">
                {label}
              </p>
              <p className="mt-3 text-4xl font-bold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-[#d7e7e5] bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold">Case Readiness</h2>

            <div className="mt-5">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>{readinessLevel}</span>
                <span>{readinessScore}/100</span>
              </div>

              <div className="mt-2 h-4 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${readinessTone(readinessScore)}`}
                  style={{ width: `${readinessScore}%` }}
                />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[#d7e7e5] bg-[#f8fcfb] p-5">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>System completeness</span>
                <span>{systemScore}/100</span>
              </div>

              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[#2f7d67]"
                  style={{ width: `${systemScore}%` }}
                />
              </div>

              <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                This score measures whether the case has enough structured
                facts, issues, evidence, proof mapping, forms, strategy,
                authority, contradiction, credibility, and package data to
                operate as a connected litigation file.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-[#f8fcfb] p-5">
                <h3 className="font-bold">Readiness Reasons</h3>

                <ul className="mt-3 space-y-2 text-sm text-[#4B5563]">
                  {master.readiness.reasons.slice(0, 5).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}

                  {master.readiness.reasons.length === 0 ? (
                    <li>
                      • Add facts, evidence, and issue links to build readiness.
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="rounded-2xl bg-[#fff8ed] p-5">
                <h3 className="font-bold text-amber-800">Blockers</h3>

                <ul className="mt-3 space-y-2 text-sm text-amber-900">
                  {master.readiness.blockers.slice(0, 5).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}

                  {master.readiness.blockers.length === 0 ? (
                    <li>• No major readiness blockers detected yet.</li>
                  ) : null}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#d7e7e5] bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-bold">Priority Alerts</h2>

            <div className="mt-5 space-y-3">
              {[
                ...master.proceduralIntelligence.pathwayWarnings,
                ...master.proceduralIntelligence.limitationConcerns,
                ...master.proceduralIntelligence.urgencyConcerns,
                ...master.proceduralIntelligence.serviceConcerns,
                ...master.proceduralIntelligence.disclosureConcerns,
                ...(authority?.warnings || []),
                ...(contradictions?.warnings || []),
                ...(credibility?.warnings || []),
                ...highRisks.map(
                  (risk) => risk.description || risk.title || "High risk item",
                ),
              ]
                .slice(0, 10)
                .map((alert) => (
                  <div
                    key={alert}
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
                  >
                    {alert}
                  </div>
                ))}

              {highRisks.length === 0 &&
              master.proceduralIntelligence.pathwayWarnings.length === 0 &&
              (authority?.warnings || []).length === 0 &&
              (contradictions?.warnings || []).length === 0 &&
              (credibility?.warnings || []).length === 0 ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  No high-risk alerts detected yet. Continue adding facts,
                  evidence, dates, authority, and proof connections.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#d7e7e5] bg-white p-7 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#2FB8AC]">
              Intelligence Layer
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Litigation Intelligence Matrix
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#4B5563]">
              These panels expose the authority, contradiction, credibility, and
              risk intelligence produced by the core CourtSimplified pipeline.
            </p>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <div
              className={`rounded-3xl border p-6 shadow-sm ${intelligenceTone(
                authority?.authorityReadiness,
              )}`}
            >
              <p className="text-sm font-semibold uppercase tracking-wide">
                Authority Intelligence
              </p>
              <h3 className="mt-2 text-2xl font-bold">
                {authority?.authorityReadiness || "not available"}
              </h3>

              <div className="mt-5 grid gap-3 text-sm">
                <div className="flex justify-between rounded-2xl bg-white/60 p-3">
                  <span>Strong authorities</span>
                  <span className="font-bold">
                    {authority?.strongestAuthorityCount ?? 0}
                  </span>
                </div>
                <div className="flex justify-between rounded-2xl bg-white/60 p-3">
                  <span>Unsafe citations</span>
                  <span className="font-bold">
                    {authority?.unsafeAuthorityCount ?? 0}
                  </span>
                </div>
                <div className="flex justify-between rounded-2xl bg-white/60 p-3">
                  <span>Wrong jurisdiction</span>
                  <span className="font-bold">
                    {authority?.wrongJurisdictionAuthorityCount ?? 0}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6">
                {authority?.summary || "No authority analysis is available yet."}
              </p>
            </div>

            <div
              className={`rounded-3xl border p-6 shadow-sm ${intelligenceTone(
                contradictions?.contradictionReadiness,
              )}`}
            >
              <p className="text-sm font-semibold uppercase tracking-wide">
                Contradiction Intelligence
              </p>
              <h3 className="mt-2 text-2xl font-bold">
                {contradictions?.contradictionReadiness || "not available"}
              </h3>

              <div className="mt-5 grid gap-3 text-sm">
                <div className="flex justify-between rounded-2xl bg-white/60 p-3">
                  <span>Critical findings</span>
                  <span className="font-bold">
                    {contradictions?.criticalFindings ?? 0}
                  </span>
                </div>
                <div className="flex justify-between rounded-2xl bg-white/60 p-3">
                  <span>High findings</span>
                  <span className="font-bold">
                    {contradictions?.highFindings ?? 0}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6">
                {contradictions?.summary ||
                  "No contradiction analysis is available yet."}
              </p>
            </div>

            <div
              className={`rounded-3xl border p-6 shadow-sm ${intelligenceTone(
                credibility?.credibilityReadiness,
              )}`}
            >
              <p className="text-sm font-semibold uppercase tracking-wide">
                Credibility Intelligence
              </p>
              <h3 className="mt-2 text-2xl font-bold">
                {credibility?.overallLevel || "not available"}
              </h3>

              <div className="mt-5 grid gap-3 text-sm">
                <div className="flex justify-between rounded-2xl bg-white/60 p-3">
                  <span>Judge concern</span>
                  <span className="font-bold">
                    {credibility?.judgeConcernScore ?? 0}
                  </span>
                </div>
                <div className="flex justify-between rounded-2xl bg-white/60 p-3">
                  <span>Cross-exam risk</span>
                  <span className="font-bold">
                    {credibility?.crossExaminationRiskScore ?? 0}
                  </span>
                </div>
                <div className="flex justify-between rounded-2xl bg-white/60 p-3">
                  <span>Settlement pressure</span>
                  <span className="font-bold">
                    {credibility?.settlementPressureScore ?? 0}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6">
                {credibility?.summary ||
                  "No credibility analysis is available yet."}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Unsafe Citations",
                value: authority?.unsafeAuthorityCount ?? 0,
              },
              {
                label: "Wrong Jurisdiction",
                value: authority?.wrongJurisdictionAuthorityCount ?? 0,
              },
              {
                label: "Critical Contradictions",
                value: contradictions?.criticalFindings ?? 0,
              },
              {
                label: "High Contradictions",
                value: contradictions?.highFindings ?? 0,
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-3xl border p-5 shadow-sm ${riskTone(
                  item.value,
                )}`}
              >
                <p className="text-sm font-semibold uppercase tracking-wide">
                  {item.label}
                </p>
                <p className="mt-3 text-4xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#d7e7e5] bg-white p-7 shadow-sm">
          <h2 className="text-2xl font-bold">Workflow Health</h2>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-[#4B5563]">
            This shows whether the case has enough structured information for
            each subsystem to work properly. A warning does not mean the case is
            bad; it means that part of the workflow needs more information.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {workflowCards.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${completionTone(
                  item.complete,
                  item.warning,
                )}`}
              >
                <p className="text-sm font-semibold uppercase tracking-wide">
                  {item.complete ? "Ready" : item.warning ? "Needs Work" : "Open"}
                </p>

                <h3 className="mt-2 text-xl font-bold">{item.title}</h3>

                <p className="mt-3 text-sm leading-6">{item.text}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-[#d7e7e5] bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Workflow Command Links</h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4B5563]">
                Every subsystem receives this case ID so the workflow stays
                connected to the same case record and master result.
              </p>
            </div>

            <button
              type="button"
              onClick={loadCase}
              className="rounded-full bg-[#2f7d67] px-6 py-3 font-semibold text-white"
            >
              Refresh Case Intelligence
            </button>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {workflowCards.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-3xl border border-[#d7e7e5] bg-[#f8fcfb] p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#2FB8AC] hover:bg-white hover:shadow-md"
              >
                <h3 className="text-xl font-bold">{item.title}</h3>

                <p className="mt-3 text-sm leading-6 text-[#4B5563]">
                  {item.text}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-[#d7e7e5] bg-white p-7 shadow-sm">
            <h2 className="text-xl font-bold">Operational Warnings</h2>

            <ul className="mt-4 space-y-2 text-sm text-[#4B5563]">
              {operationalWarnings.slice(0, 8).map((item) => (
                <li key={item}>• {item}</li>
              ))}

              {operationalWarnings.length === 0 ? (
                <li>• Core operating data is present across the case file.</li>
              ) : null}
            </ul>
          </div>

          <div className="rounded-3xl border border-[#d7e7e5] bg-white p-7 shadow-sm">
            <h2 className="text-xl font-bold">Likely Other Side Arguments</h2>

            <ul className="mt-4 space-y-2 text-sm text-[#4B5563]">
              {master.strategy.likelyOtherSideArguments
                .slice(0, 6)
                .map((item) => (
                  <li key={item}>• {item}</li>
                ))}

              {master.strategy.likelyOtherSideArguments.length === 0 ? (
                <li>
                  • Add more facts and evidence to generate attack analysis.
                </li>
              ) : null}
            </ul>
          </div>

          <div className="rounded-3xl border border-[#d7e7e5] bg-white p-7 shadow-sm">
            <h2 className="text-xl font-bold">Judge-Facing Concerns</h2>

            <ul className="mt-4 space-y-2 text-sm text-[#4B5563]">
              {master.strategy.likelyJudgeConcerns.slice(0, 6).map((item) => (
                <li key={item}>• {item}</li>
              ))}

              {master.strategy.likelyJudgeConcerns.length === 0 ? (
                <li>
                  • Continue strategy review so the system can flag what a
                  judge may focus on.
                </li>
              ) : null}
            </ul>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-[#d7e7e5] bg-white p-7 shadow-sm">
            <h2 className="text-xl font-bold">Proof Gaps</h2>

            <ul className="mt-4 space-y-2 text-sm text-[#4B5563]">
              {master.strategy.weaknesses.slice(0, 6).map((item) => (
                <li key={item}>• {item}</li>
              ))}

              {master.strategy.weaknesses.length === 0 ? (
                <li>• No proof-gap details available yet.</li>
              ) : null}
            </ul>
          </div>

          <div className="rounded-3xl border border-[#d7e7e5] bg-white p-7 shadow-sm">
            <h2 className="text-xl font-bold">Next Procedural Focus</h2>

            <ul className="mt-4 space-y-2 text-sm text-[#4B5563]">
              {master.proceduralIntelligence.nextProceduralFocus
                .slice(0, 6)
                .map((item) => (
                  <li key={item}>• {item}</li>
                ))}

              {master.proceduralIntelligence.nextProceduralFocus.length === 0 ? (
                <li>• Continue intake so the system can identify next steps.</li>
              ) : null}
            </ul>
          </div>

          <div className="rounded-3xl border border-[#d7e7e5] bg-white p-7 shadow-sm">
            <h2 className="text-xl font-bold">AI Memory Status</h2>

            <p className="mt-4 text-sm leading-6 text-[#4B5563]">
              Last updated by:{" "}
              <span className="font-semibold">
                {master.aiMemory.lastUpdatedByEngine || "not recorded"}
              </span>
            </p>

            <ul className="mt-4 space-y-2 text-sm text-[#4B5563]">
              {master.aiMemory.unresolvedQuestions.slice(0, 5).map((item) => (
                <li key={item}>• {item}</li>
              ))}

              {master.aiMemory.unresolvedQuestions.length === 0 ? (
                <li>• No unresolved AI intake questions recorded yet.</li>
              ) : null}
            </ul>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/dashboard"
            className="rounded-full border border-[#2f7d67] bg-white px-6 py-3 font-semibold text-[#2f7d67]"
          >
            Back to Dashboard
          </Link>

          <Link
            href={buildDashboardWorkflowHref("/builder", caseFile)}
            className="rounded-full bg-[#2f7d67] px-6 py-3 font-semibold text-white"
          >
            Continue Building Case
          </Link>
        </div>
      </div>
    </main>
  );
}