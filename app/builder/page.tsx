"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import FamilyIntake from "./_components/FamilyIntake";
import SmallClaimsIntake from "./_components/SmallClaimsIntake";
import CivilIntake from "./_components/CivilIntake";
import CourtAssistantChat from "./_components/CourtAssistantChat";
import IntelligenceOverviewPanel from "./_components/IntelligenceOverviewPanel";

import {
  AnalysisResult,
  CourtPath,
  StoredCaseData,
  getPathLabel,
} from "./_components/builderTypes";

import { supabase } from "../../src/lib/supabase/client";
import { saveMasterCaseFromIntake } from "../../src/lib/case-system/masterCaseOrchestrator";
import { buildCaseContextStoragePayload } from "../../src/lib/case-system/caseContextEngine";

function buildWorkflowHref(
  route: string,
  caseId: string | null,
  path: CourtPath,
) {
  const params = new URLSearchParams();

  if (caseId) params.set("caseId", caseId);
  params.set("path", path);

  return `${route}?${params.toString()}`;
}

function getStageForPersistence(
  analysis: AnalysisResult | null,
  caseData: StoredCaseData | null,
) {
  return (
    analysis?.intelligence?.proceduralPosture?.stage ||
    caseData?.caseStage ||
    analysis?.caseStage ||
    "starting-case"
  );
}

function getStoredActiveCaseId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("courtSimplifiedActiveCaseId");
}

function BuilderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryCaseId = searchParams.get("caseId");

  const initialPath = useMemo<CourtPath>(() => {
    const raw = searchParams.get("path");

    if (raw === "family" || raw === "small-claims" || raw === "civil") {
      return raw;
    }

    return "family";
  }, [searchParams]);

  const [courtPath] = useState<CourtPath>(initialPath);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [caseData, setCaseData] = useState<StoredCaseData | null>(null);
  const [masterCaseId, setMasterCaseId] = useState<string | null>(queryCaseId);
  const [savingMaster, setSavingMaster] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState("");

  const pathLabel = getPathLabel(courtPath);

  const activeCaseId = masterCaseId || queryCaseId || getStoredActiveCaseId();

  const workspaceHref = activeCaseId
    ? `/dashboard/cases/${activeCaseId}`
    : "/dashboard";

  const evidenceHref = buildWorkflowHref("/evidence", activeCaseId, courtPath);
  const formsHref = buildWorkflowHref("/forms", activeCaseId, courtPath);
  const documentWorkspaceHref = buildWorkflowHref(
    "/document-workspace",
    activeCaseId,
    courtPath,
  );
  const courtPackageHref = buildWorkflowHref(
    "/court-package",
    activeCaseId,
    courtPath,
  );

  useEffect(() => {
    async function saveMasterCase() {
      if (!analysis || !caseData) return;

      setSavingMaster(true);
      setSaveError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let finalCaseId = queryCaseId || masterCaseId || "";
      const stage = getStageForPersistence(analysis, caseData);
      const now = new Date().toISOString();

      if (!finalCaseId && user) {
        const { data, error } = await supabase
          .from("cases")
          .insert({
            user_id: user.id,
            court_path: courtPath,
            title: "New CourtSimplified Case",
            status: "active",
            current_stage: stage,
            master_result: {
              source: "builder-created-shell",
              lifecycleStage: "intake-started",
              updatedAt: now,
            },
          })
          .select("id")
          .single();

        if (error) {
          setSaveError(error.message);
          setSavingMaster(false);
          return;
        }

        finalCaseId = data.id;
      }

      const record = saveMasterCaseFromIntake({
        caseId: finalCaseId || undefined,
        userId: user?.id,
        courtPath,
        analysis,
        intake: caseData,
      });

      const contextPayload = record.caseContext
        ? buildCaseContextStoragePayload(record.caseContext)
        : null;

      const intelligenceMasterPatch =
        caseData.masterResultPatch &&
        typeof caseData.masterResultPatch === "object"
          ? caseData.masterResultPatch
          : {};

      const masterPayload = {
        ...intelligenceMasterPatch,

        masterCaseFile:
          (intelligenceMasterPatch as any).masterCaseFile ||
          record.caseContext?.masterCaseFile ||
          null,

        courtSimplifiedIntelligence:
          caseData.intelligence ||
          analysis.intelligence ||
          (intelligenceMasterPatch as any).courtSimplifiedIntelligence ||
          null,

        caseContext: contextPayload,
        persistedRecord: record,
        intakeAnalysis: analysis,
        intakeData: caseData,

        source: "builder-intake",
        lifecycleStage: "intake-completed",

        updatedSubsystems: {
          intake: now,
          analysis: now,
          masterCase: now,
          intelligence: now,
        },

        workflowStatus: {
          intakeCompleted: true,
          evidenceStarted: false,
          formsReviewed: false,
          documentWorkspaceStarted: false,
          strategyReviewed: false,
          courtPackageStarted: false,
          trialPackageStarted: false,
          exportReady: false,
        },

        dashboardPatch: caseData.dashboardPatch || null,
        recommendedNextRoute: caseData.recommendedNextRoute || null,

        updatedAt: now,
      };

      const activeId = finalCaseId || record.id;

      localStorage.setItem("courtSimplifiedActiveCaseId", activeId);
      localStorage.setItem("courtSimplifiedMasterCase", JSON.stringify(record));
      localStorage.setItem(
        "courtSimplifiedCaseContext",
        JSON.stringify(contextPayload),
      );
      localStorage.setItem(
        "courtSimplifiedLoadedCaseContext",
        JSON.stringify(contextPayload),
      );
      localStorage.setItem(
        "courtSimplifiedMasterResult",
        JSON.stringify(masterPayload),
      );
      localStorage.setItem("caseData", JSON.stringify(caseData));
      localStorage.setItem("courtSimplifiedCase", JSON.stringify(caseData));

      setMasterCaseId(activeId);

      if (user && activeId) {
        const { error } = await supabase
          .from("cases")
          .update({
            title: record.title,
            court_path: courtPath,
            status: "active",
            current_stage: stage,
            master_result: masterPayload,
            updated_at: now,
          })
          .eq("id", activeId);

        if (error) {
          setSaveError(error.message);
          setSavingMaster(false);
          return;
        }
      }

      setLastSavedAt(now);
      setSavingMaster(false);
    }

    saveMasterCase();
  }, [analysis, caseData, courtPath, masterCaseId, queryCaseId]);

  function handleComplete(result: AnalysisResult, payload: StoredCaseData) {
    setAnalysis(result);
    setCaseData(payload);
  }

  function saveCurrentCaseData() {
    if (!caseData) return;

    localStorage.setItem("caseData", JSON.stringify(caseData));
    localStorage.setItem("courtSimplifiedCase", JSON.stringify(caseData));
  }

  function getActiveCaseId() {
    return masterCaseId || queryCaseId || getStoredActiveCaseId();
  }

  function pushWorkflow(route: string) {
    if (!caseData) return;

    saveCurrentCaseData();
    router.push(buildWorkflowHref(route, getActiveCaseId(), courtPath));
  }

  function goToDashboardCase() {
    const targetCaseId = getActiveCaseId();
    if (!targetCaseId) return;
    router.push(`/dashboard/cases/${targetCaseId}`);
  }

  function goToSettlementConference() {
    if (!caseData) return;

    saveCurrentCaseData();

    router.push(
      buildWorkflowHref("/settlement-conference", getActiveCaseId(), courtPath),
    );
  }

  function goToDraftingAssistant() {
    if (!caseData) return;

    saveCurrentCaseData();

    router.push(
      buildWorkflowHref("/ai-drafting-assistant", getActiveCaseId(), courtPath),
    );
  }

  function handleChatMasterResultUpdate(patch: any) {
    localStorage.setItem("courtSimplifiedMasterResult", JSON.stringify(patch));

    setCaseData((current) =>
      current
        ? {
            ...current,
            masterResultPatch: patch,
          }
        : current,
    );
  }

  function handleChatDashboardUpdate(patch: any) {
    localStorage.setItem("courtSimplifiedDashboardPatch", JSON.stringify(patch));

    setCaseData((current) =>
      current
        ? {
            ...current,
            dashboardPatch: patch,
          }
        : current,
    );
  }

  function handleRecommendedRoute(route: string) {
    localStorage.setItem("courtSimplifiedRecommendedNextRoute", route);

    setCaseData((current) =>
      current
        ? {
            ...current,
            recommendedNextRoute: route,
          }
        : current,
    );
  }

  function startOver() {
    setAnalysis(null);
    setCaseData(null);
    setSaveError("");
    setLastSavedAt("");
    setMasterCaseId(queryCaseId);
  }

  return (
    <main className="min-h-screen bg-[#f8faf8] px-6 py-10 text-[#16302b]">
      <div className="mx-auto max-w-6xl">
        <section className="mb-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#2f7d67]">
                {pathLabel} Case Partner
              </p>

              <h1 className="text-4xl font-bold tracking-tight text-[#10231f]">
                Start by telling CourtSimplified what happened
              </h1>

              <p className="mt-4 max-w-3xl text-lg leading-8 text-[#4d675f]">
                Talk naturally first. CourtSimplified will remember the case,
                identify missing information, investigate proof issues, and help
                route your matter into the connected intake, evidence, forms,
                and court package workflow.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm">
              <p className="font-semibold text-[#10231f]">Workflow status</p>
              <p className="mt-2 text-[#4d675f]">
                Case ID: {activeCaseId || "not created yet"}
              </p>
              <p className="mt-1 text-[#4d675f]">Path: {pathLabel}</p>
              <p className="mt-1 text-[#4d675f]">
                Save:{" "}
                {savingMaster ? "Saving..." : lastSavedAt ? "Saved" : "Waiting"}
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

        <section className="mb-8">
          <CourtAssistantChat
            caseId={getActiveCaseId() || undefined}
            path={courtPath}
            proceduralStage={
              analysis?.intelligence?.proceduralPosture?.stage ||
              caseData?.caseStage
            }
            caseData={{
              courtPath,
              pathLabel,
              analysis,
              intake: caseData,
            }}
            masterResult={caseData?.masterResultPatch}
            evidenceData={analysis?.intelligenceEvidenceIssues}
            strategyData={{
              risks: analysis?.intelligence?.litigationRisks,
              judgeConcerns: analysis?.intelligence?.judgeConcerns,
              opposingArguments: analysis?.intelligence?.opposingArguments,
              nextBestActions: analysis?.nextBestActions,
            }}
            onMasterResultUpdate={handleChatMasterResultUpdate}
            onDashboardUpdate={handleChatDashboardUpdate}
            onRecommendedRoute={handleRecommendedRoute}
          />
        </section>

        {!analysis && (
          <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-[#2f7d67]">
                Structured intake
              </p>

              <h2 className="text-2xl font-bold text-[#10231f]">
                Add details when you are ready
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#4d675f]">
                The conversation helps you organize the case first. Use the
                structured intake below when you are ready to convert the story
                into the formal case workflow.
              </p>
            </div>

            {courtPath === "family" && (
              <FamilyIntake onComplete={handleComplete} />
            )}

            {courtPath === "small-claims" && (
              <SmallClaimsIntake onComplete={handleComplete} />
            )}

            {courtPath === "civil" && <CivilIntake onComplete={handleComplete} />}
          </section>
        )}

        {analysis && (
          <div className="mt-8 space-y-6">
            <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#2f7d67]">
                    Intelligence Result
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-[#10231f]">
                    Case Analysis
                  </h2>

                  <p className="mt-3 max-w-3xl text-[#4d675f]">
                    The intake has been converted into structured litigation
                    intelligence: claim direction, procedure, proof gaps, risks,
                    judge concerns, recommended forms, and next workflow steps.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] px-5 py-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
                    Current stage
                  </p>

                  <p className="mt-1 text-lg font-bold text-[#10231f]">
                    {analysis.intelligence?.proceduralPosture?.stage ||
                      analysis.caseStage}
                  </p>

                  <div className="mt-4 border-t border-[#d8e6df] pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#2f7d67]">
                      Master Case ID
                    </p>

                    <p className="mt-1 break-all text-sm font-medium text-[#16302b]">
                      {savingMaster
                        ? "Saving..."
                        : masterCaseId || "Preparing case record..."}
                    </p>
                  </div>
                </div>
              </div>

              {saveError ? (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {saveError}
                </div>
              ) : null}

              {lastSavedAt ? (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  Intake analysis saved into the master case system.
                </div>
              ) : null}

              <div className="mt-8">
                <IntelligenceOverviewPanel analysis={analysis} />
              </div>

              <div className="mt-8 rounded-3xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
                <h3 className="text-lg font-bold text-[#16302b]">
                  Continue the connected case workflow
                </h3>

                <p className="mt-3 text-sm leading-6 text-[#4d675f]">
                  The intake result now feeds the master case system. Continue
                  into evidence, forms, drafting, strategy, package assembly,
                  trial preparation, or export without losing the case ID.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={goToDashboardCase}
                    disabled={savingMaster || !getActiveCaseId()}
                    className="rounded-2xl bg-[#16302b] px-6 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    Open Master Case →
                  </button>

                  <button
                    type="button"
                    onClick={() => pushWorkflow("/evidence")}
                    className="rounded-2xl border border-[#2f7d67] bg-white px-6 py-3 font-semibold text-[#2f7d67]"
                  >
                    Organize Evidence →
                  </button>

                  <button
                    type="button"
                    onClick={() => pushWorkflow("/forms")}
                    className="rounded-2xl border border-[#2f7d67] bg-white px-6 py-3 font-semibold text-[#2f7d67]"
                  >
                    Review Forms →
                  </button>

                  <button
                    type="button"
                    onClick={() => pushWorkflow("/document-workspace")}
                    className="rounded-2xl bg-[#2f7d67] px-6 py-3 font-semibold text-white"
                  >
                    Document Workspace →
                  </button>

                  <button
                    type="button"
                    onClick={() => pushWorkflow("/litigation-strategy")}
                    className="rounded-2xl border border-[#2f7d67] bg-[#f8fcfa] px-6 py-3 font-semibold text-[#2f7d67]"
                  >
                    Strategy →
                  </button>

                  <button
                    type="button"
                    onClick={() => pushWorkflow("/court-package")}
                    className="rounded-2xl border border-[#2f7d67] bg-[#f8fcfa] px-6 py-3 font-semibold text-[#2f7d67]"
                  >
                    Court Package →
                  </button>

                  <button
                    type="button"
                    onClick={() => pushWorkflow("/trial-package")}
                    className="rounded-2xl border border-[#2f7d67] bg-[#f8fcfa] px-6 py-3 font-semibold text-[#2f7d67]"
                  >
                    Trial Preparation →
                  </button>

                  <button
                    type="button"
                    onClick={() => pushWorkflow("/document-export")}
                    className="rounded-2xl border border-[#2f7d67] bg-[#f8fcfa] px-6 py-3 font-semibold text-[#2f7d67]"
                  >
                    Export →
                  </button>

                  <button
                    type="button"
                    onClick={goToDraftingAssistant}
                    className="rounded-2xl border border-[#2f7d67] bg-[#e9f7f2] px-6 py-3 font-semibold text-[#16302b]"
                  >
                    AI Drafting Assistant →
                  </button>

                  <button
                    type="button"
                    onClick={goToSettlementConference}
                    className="rounded-2xl border border-[#2f7d67] bg-[#f8fcfa] px-6 py-3 font-semibold text-[#2f7d67]"
                  >
                    Settlement Conference →
                  </button>

                  <button
                    type="button"
                    onClick={startOver}
                    className="rounded-2xl border border-[#2f7d67] bg-white px-6 py-3 font-semibold text-[#2f7d67]"
                  >
                    Edit Intake
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

export default function BuilderPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f8faf8] text-[#16302b]">
          Loading builder...
        </main>
      }
    >
      <BuilderPageContent />
    </Suspense>
  );
}