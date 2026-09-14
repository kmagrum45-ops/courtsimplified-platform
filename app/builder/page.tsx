"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import FamilyIntake from "./_components/FamilyIntake";
import SmallClaimsIntake, {
  requestSmallClaimsAnalysis,
} from "./_components/SmallClaimsIntake";
import GuidedSmallClaimsIntake, {
  type GuidedIntakeCompletionResult,
} from "./_components/GuidedSmallClaimsIntake";
import { mapGuidedIntakeToSmallClaimsInput } from "./_components/guidedIntakeToSmallClaimsInput";
import StatementOfClaimSurface from "./_components/StatementOfClaimSurface";
import type { SmallClaimsIntelligenceInput } from "@/src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import type { ElementStateMap } from "@/src/lib/case-system/intake/depth/elementStateMap";
import CivilIntake from "./_components/CivilIntake";
import FamilyStatusTriage, {
  emptyTriageState,
  triageStateFromStored,
  type FamilyTriageState,
} from "./_components/FamilyStatusTriage";
import CourtAssistantChat from "./_components/CourtAssistantChat";
import IntelligenceOverviewPanel from "./_components/IntelligenceOverviewPanel";
import ProcedureAuthorityDisplay from "./_components/ProcedureAuthorityDisplay";
import EventCandidateSurface from "./_components/EventCandidateSurface";
import { buildDerivedFrom } from "../../src/lib/case-system/events/caseAnalysisFreshness";
import { filingFactsFromDocuments } from "../../src/lib/case-system/intelligence/answeredQuestions";
import type { CaseEventRow } from "../../src/lib/case-system/events/caseEventAdapter";

import {
  AnalysisResult,
  CourtPath,
  StoredCaseData,
  getPathLabel,
} from "./_components/builderTypes";

import { supabase } from "../../src/lib/supabase/client";
import { buildMasterCaseFromIntake } from "../../src/lib/case-system/masterCaseOrchestrator";
import { buildCaseContextStoragePayload } from "../../src/lib/case-system/caseContextEngine";
import { consumeGuestIntakeSession, loadCompactBuilderDraft, saveCompactBuilderDraft } from "../../src/lib/case-system/builderDraftStorage";
import { draftSmallClaimsPlaintiffClaim } from "../../src/lib/case-system/claimDraftEngine";
import { buildWorkspaceDocument } from "../../src/lib/case-system/documentWorkspaceEngine";
import { writeWorkspaceDocument } from "../../src/lib/case-system/workflowCaseLoader";
import type { GeneratedDocument } from "../../src/lib/case-system/documentGenerationEngine";

// Pre-rewrite intelligence UI, parked rather than deleted. Declared as
// boolean instead of the literal false: a literal makes TypeScript treat the
// guarded blocks as unreachable and skip narrowing, so `analysis` reads as
// possibly null inside them even though `analysis &&` already guards it.
const SHOW_LEGACY_INTELLIGENCE_UI: boolean = false;

function buildWorkflowHref(
  route: string,
  caseId: string | null,
  path: CourtPath,
) {
  const params = new URLSearchParams();

  if (caseId) {
    params.set("caseId", caseId);
  }

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

/**
 * Whether the originating document is ALREADY RECORDED as filed.
 *
 * The "What CourtSimplified can help with next" buttons were gated on
 * `courtPath` and `getActiveCaseId()` and nothing else. A user whose case
 * recorded the claim filed, served, and a default judgment obtained was still
 * offered "Create Plaintiff's Claim draft (Form 7A)" — the document that
 * starts the case, offered to someone past default.
 *
 * Two independent signals, either of which is enough, because they are
 * populated on different paths and a case can have one without the other:
 *
 *   - `extra.filedDocuments` / `extra.documents`, the list the overview panel
 *     already renders under "Documents already recorded".
 *   - `IntakeFacts.claimFiled`, the guided-intake answer that
 *     deriveCaseStageWithEvents reads.
 *
 * Only TRUE is meaningful. Absence means not recorded, never "did not
 * happen" — the same rule the intakeFacts writer follows.
 */
function originatingDocumentRecorded(args: {
  courtPath: CourtPath;
  caseData: StoredCaseData | null;
  intakeFacts: Record<string, unknown> | null;
}): boolean {
  if (args.intakeFacts?.claimFiled === true) return true;

  const extra = args.caseData?.extra as Record<string, unknown> | undefined;
  const raw = extra?.filedDocuments ?? extra?.documents;
  const filed = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string")
    : [];

  const originating: Partial<Record<CourtPath, string[]>> = {
    "small-claims": ["plaintiffs-claim"],
    civil: ["statement-of-claim"],
    family: ["application"],
  };

  return (originating[args.courtPath] || []).some((id) => filed.includes(id));
}

function createChatSessionId(path: CourtPath): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${path}-${crypto.randomUUID()}`;
  }

  return `${path}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function clearTransientCaseContext() {
  if (typeof window === "undefined") {
    return;
  }

  const transientKeys = [
    "courtSimplifiedActiveCaseId",
    "courtSimplifiedMasterCase",
    "courtSimplifiedCaseContext",
    "courtSimplifiedLoadedCaseContext",
    "courtSimplifiedMasterResult",
    "courtSimplifiedMasterResultPatch",
    "courtSimplifiedDashboardPatch",
    "courtSimplifiedRecommendedNextRoute",
    "caseData",
    "courtSimplifiedCase",
  ];

  for (const key of transientKeys) {
    localStorage.removeItem(key);
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mergeMasterResult(
  current: unknown,
  patch: unknown,
): Record<string, unknown> {
  const currentRecord = asRecord(current);
  const patchRecord = asRecord(patch);
  const canonicalMasterCase =
    patchRecord.masterCase || currentRecord.masterCase;

  return {
    ...currentRecord,
    ...patchRecord,
    ...(canonicalMasterCase
      ? { masterCase: canonicalMasterCase }
      : {}),
    updatedAt: new Date().toISOString(),
  };
}

function isAnalysisAvailable(caseData: StoredCaseData | null): boolean {
  const execution = asRecord(caseData?.extra).analysisExecution;
  return asRecord(execution).analysisAvailable === true;
}

function BuilderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryCaseId = searchParams.get("caseId");

  const initialPath = useMemo<CourtPath | null>(() => {
    const raw = searchParams.get("path");

    if (raw === "family" || raw === "small-claims" || raw === "civil") {
      return raw;
    }

    return null;
  }, [searchParams]);

  const courtPath = initialPath || "family";

  const [chatSessionId, setChatSessionId] = useState(() =>
    createChatSessionId(courtPath),
  );

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [caseData, setCaseData] = useState<StoredCaseData | null>(null);
  // Session 48 — inputs the Statement of Claim surface needs. Retained from
  // the completing guided turn rather than rebuilt, so the readiness gate reads
  // the same element states the depth phase produced.
  const [draftInput, setDraftInput] = useState<SmallClaimsIntelligenceInput | null>(null);
  const [draftClaimTypeId, setDraftClaimTypeId] = useState<string | null>(null);
  const [draftElementStateMap, setDraftElementStateMap] = useState<ElementStateMap>({});
  // Guided intake produces real IntakeFacts. Retained so the save site can
  // persist them -- see the intakeFacts block in masterPayload for why.
  const [draftIntakeFacts, setDraftIntakeFacts] = useState<Record<string, unknown> | null>(null);

  /*
   * The family triage's recorded answers, persisted at the same save site as
   * derivedFrom and intakeFacts so there is ONE writer rather than three, and
   * so master_result's read-without-write audit (OUTSTANDING_ISSUES section
   * 21) sees it.
   *
   * Hydrated from the loaded case below. A triage that forgets what the user
   * already told it is worse than no triage — it asks the same questions
   * again and teaches them the answers do not stick.
   */
  const [triageState, setTriageState] = useState<FamilyTriageState>(emptyTriageState);
  const [masterCaseId, setMasterCaseId] = useState<string | null>(queryCaseId);
  const [existingMasterResult, setExistingMasterResult] = useState<
    Record<string, unknown>
  >({});
  const [existingCaseStage, setExistingCaseStage] = useState("");
  const [caseLoadError, setCaseLoadError] = useState("");
  const [loadingExistingCase, setLoadingExistingCase] = useState(
    Boolean(queryCaseId),
  );
  const [savingMaster, setSavingMaster] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [localDraftWarning, setLocalDraftWarning] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [canonicalIntakeSaved, setCanonicalIntakeSaved] = useState(false);
  const completedOverviewRef = useRef<HTMLElement | null>(null);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [confirmedLocation, setConfirmedLocation] = useState<{
    province: "Ontario";
    city: string;
  } | null>(null);
  const [homeStory, setHomeStory] = useState("");
  const [intakeProvince, setIntakeProvince] = useState("");
  const [intakeCity, setIntakeCity] = useState("");
  const [intakeStory, setIntakeStory] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [smallClaimsMode, setSmallClaimsMode] = useState<"choose" | "form" | "guided">("choose");
  // Session 29: guided intake's completion result is now mapped into
  // SmallClaimsIntelligenceInput and run through the same
  // /api/small-claims/analyze -> handleComplete pipeline the form uses --
  // see guidedIntakeToSmallClaimsInput.ts for exactly which fields are
  // real versus left empty. These two only cover the brief window between
  // "conversation complete" and the analysis call resolving; once it
  // succeeds, handleComplete's own analysis/canonicalIntakeSaved state
  // takes over rendering, same as the form path.
  const [guidedAnalyzing, setGuidedAnalyzing] = useState(false);
  const [guidedAnalysisError, setGuidedAnalysisError] = useState("");

  /*
   * Picking a mode is an internal state change, not a URL change, so
   * ScrollToTopOnNavigation.tsx's pathname/search-based effect never fires
   * for it. Without this, the browser is left wherever it scrolled to
   * click the mode card, not at the top of the destination screen the app
   * otherwise guarantees on every real navigation.
   */
  useEffect(() => {
    if (smallClaimsMode !== "choose") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [smallClaimsMode]);

  const pathLabel = getPathLabel(courtPath);
  const analysisAvailable = isAnalysisAvailable(caseData);

  /*
   * The cold-load intake gate below (no confirmedLocation yet) renders the
   * same server-rendered markup on the client's first paint, before React
   * has attached its event handlers. A selection made in that window is a
   * native DOM mutation React doesn't know about -- hydration then
   * reconciles the controlled inputs back to their still-blank React state
   * and silently discards it. Gating the gate's render on a mount effect
   * guarantees hydration has already committed by the time the form (and
   * its event handlers) exist at all, the same defense HomeLocationGate
   * already uses for this exact class of race.
   */
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (queryCaseId) return;
    let active = true;
    async function loadUserDraft() {
      const temporaryGuide = sessionStorage.getItem("courtSimplifiedNotSureGuide");
      if (initialPath && temporaryGuide) {
        try {
          const guide = JSON.parse(temporaryGuide) as { province?: string; city?: string; facts?: string };
          if (guide.province === "Ontario" && guide.city?.trim() && guide.facts?.trim()) {
            sessionStorage.removeItem("courtSimplifiedNotSureGuide");
            setConfirmedLocation({ province: "Ontario", city: guide.city.trim() });
            setHomeStory(guide.facts.trim());
            return;
          }
        } catch { sessionStorage.removeItem("courtSimplifiedNotSureGuide"); }
      }
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      const draft = data.user
        ? loadCompactBuilderDraft(localStorage, data.user.id)
        : consumeGuestIntakeSession(sessionStorage);
      if (initialPath && draft?.courtPath === courtPath && draft.province === "Ontario" && draft.city.trim() && draft.facts.trim()) {
        setConfirmedLocation({ province: "Ontario", city: draft.city.trim() });
        setHomeStory(draft.facts.trim());
        return;
      }
      return;
    }
    void loadUserDraft();
    return () => { active = false; };
  }, [courtPath, initialPath, queryCaseId, router]);
  /*
   * Important:
   * A case is active here only when:
   * 1. the URL supplied a real caseId; or
   * 2. this builder session created a new case.
   *
   * We intentionally do not fall back to the last active case stored in
   * localStorage. That fallback caused unrelated court paths to share cases.
   */
  const activeCaseId = masterCaseId || queryCaseId || null;

  const workspaceHref = activeCaseId
    ? `/dashboard/cases/${activeCaseId}`
    : "/dashboard";

  const evidenceHref = buildWorkflowHref(
    "/evidence",
    activeCaseId,
    courtPath,
  );

  const formsHref = buildWorkflowHref(
    "/forms",
    activeCaseId,
    courtPath,
  );

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

  /*
   * Opening the builder without a caseId means the user intentionally started
   * a new matter. Remove only temporary shared context from the previous case.
   * Existing Supabase cases and case-specific chat records remain untouched.
   */
  useEffect(() => {
    if (queryCaseId) {
      return;
    }

    clearTransientCaseContext();
    setAnalysis(null);
    setCaseData(null);
    setMasterCaseId(null);
    setExistingMasterResult({});
    setExistingCaseStage("");
    setCaseLoadError("");
    setLoadingExistingCase(false);
    setSaveError("");
    setLastSavedAt("");
    setChatSessionId(createChatSessionId(courtPath));
  }, [initialPath, queryCaseId]);

  useEffect(() => {
    let active = true;

    async function loadExistingCase() {
      if (!queryCaseId) return;

      setCaseLoadError("");
      setLoadingExistingCase(true);

      const { data, error } = await supabase
        .from("cases")
        .select("id,current_stage,master_result")
        .eq("id", queryCaseId)
        .maybeSingle();

      if (!active) return;

      if (error || !data) {
        setExistingMasterResult({});
        setExistingCaseStage("");
        setCaseLoadError(
          error?.message || "The selected case could not be loaded.",
        );
        setLoadingExistingCase(false);
        return;
      }

      const loadedMasterResult = asRecord(data.master_result);

      setMasterCaseId(data.id);
      setExistingMasterResult(loadedMasterResult);
      setTriageState(triageStateFromStored(loadedMasterResult.familyStatus));
      setExistingCaseStage(
        typeof data.current_stage === "string" ? data.current_stage : "",
      );

      setLoadingExistingCase(false);
    }

    loadExistingCase();

    return () => {
      active = false;
    };
  }, [queryCaseId]);

  useEffect(() => {
    async function saveMasterCase() {
      if (!analysis || !caseData) {
        return;
      }

      setSavingMaster(true);
      setSaveError("");
      setLocalDraftWarning("");

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

      const record = buildMasterCaseFromIntake({
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

      const localDraftSaved = saveCompactBuilderDraft(localStorage, {
        caseId: activeId,
        courtPath,
        province: confirmedLocation?.province,
        city: confirmedLocation?.city,
        caseStage: stage,
        yourName: caseData.yourName,
        otherParty: caseData.otherParty,
        facts: caseData.facts,
        timeline: caseData.timeline,
        evidence: caseData.evidence,
        missingEvidence: caseData.missingEvidence,
        goal: caseData.goal,
        urgent: caseData.urgent,
      }, user?.id);

      setMasterCaseId(activeId);

      if (user && activeId) {
        /**
         * `derivedFrom` makes master_result an honestly-dated cache.
         *
         * Without it every case reads as "never-analyzed" and the staleness
         * banner can never fire — the reader and the message existed before
         * this and were inert, because nothing wrote the field.
         *
         * The events are read HERE, at the moment of saving, so the stamp
         * records what this analysis actually saw. Reading them earlier would
         * date the analysis against a stale view; not reading them at all
         * would leave `latestEventCreatedAt` null on a case that has events,
         * which then reads as fresh forever.
         */
        const { data: eventRowsForStamp } = await supabase
          .from("case_events")
          .select("id,retracted_at,supersedes_event_id,created_at")
          .eq("case_id", activeId);

        const derivedFrom = buildDerivedFrom(
          (eventRowsForStamp || []) as unknown as CaseEventRow[],
          new Date(),
        );

        /**
         * `intakeFacts` is the OTHER half of the stage derivation.
         *
         * `deriveCaseStageWithEvents` reads claimFiled / claimServed /
         * defenceFiled from it and merges confirmed events over the top.
         * Nothing wrote it before, so every case handed `{}` to that function
         * and the stage came entirely from events — a user who told intake they
         * had filed and served still saw "Not enough recorded to say".
         *
         * TWO SOURCES, and the more reliable one wins:
         *
         *  - Guided intake produces genuine `IntakeFacts`, captured above. That
         *    is the user answering the question directly.
         *  - Both paths record `filedDocuments`, and
         *    `filingFactsFromDocuments` is the existing, already-used mapping
         *    from those selections to filing facts. Reading a user's own
         *    document selections back is not an inference — it is the same
         *    answer in the other direction, and it is what the overview panel
         *    already does.
         *
         * Only TRUE is written. A user who did not select "plaintiffs-claim"
         * has not told us they did not file — the same one-directional rule the
         * event-derived facts follow, for the same reason.
         */
        const filingFacts = filingFactsFromDocuments(
          (caseData as unknown as Record<string, unknown>)?.filedDocuments,
        );

        const intakeFacts: Record<string, unknown> = {
          ...(filingFacts.anythingFiled ? { claimFiled: true } : {}),
          ...(filingFacts.anythingServed ? { claimServed: true } : {}),
          ...(filingFacts.defenceOnRecord ? { defenceFiled: true } : {}),
          // Guided facts last: they are the user's direct answer, so they
          // override anything read back out of document selections.
          ...(draftIntakeFacts || {}),
        };

        const { error } = await supabase
          .from("cases")
          .update({
            title: record.title,
            court_path: courtPath,
            status: "active",
            current_stage: stage,
            master_result: { ...masterPayload, derivedFrom, intakeFacts, familyStatus: triageState },
            updated_at: now,
          })
          .eq("id", activeId);

        if (error) {
          setSaveError(error.message);
          setSavingMaster(false);
          return;
        }
      }

      if (!localDraftSaved) {
        setLocalDraftWarning(
          "This browser cannot keep a local recovery draft. Your result remains available on this page.",
        );
      }

      setLastSavedAt(user && activeId ? now : "");
      setCanonicalIntakeSaved(true);
      setSavingMaster(false);
    }

    saveMasterCase();
  }, [
    analysis,
    caseData,
    courtPath,
    masterCaseId,
    queryCaseId,
  ]);

  /*
   * Session 29: reshapes guided intake's result into
   * SmallClaimsIntelligenceInput (guidedIntakeToSmallClaimsInput.ts),
   * calls the exact same requestSmallClaimsAnalysis() the form path uses,
   * then calls the exact same handleComplete() with the result -- no new
   * save logic, no new destination. confirmedLocation is guaranteed set
   * here (guided mode only ever renders once it is).
   */
  async function handleGuidedComplete(result: GuidedIntakeCompletionResult) {
    if (!confirmedLocation) return;

    setGuidedAnalyzing(true);
    setGuidedAnalysisError("");

    try {
      const mappedInput = mapGuidedIntakeToSmallClaimsInput(result, confirmedLocation, homeStory);

      // Retained for the Statement of Claim surface below.
      setDraftInput(mappedInput);
      setDraftClaimTypeId(result.matchedClaimType?.claimTypeId || null);
      setDraftElementStateMap((result.elementStateMap as ElementStateMap) || {});
      // Guided intake produces real IntakeFacts — claimFiled, claimServed,
      // defenceFiled among them. Retained so the save site can persist them;
      // without that, deriveCaseStageWithEvents receives {} and the stage comes
      // entirely from confirmed events.
      setDraftIntakeFacts(result.facts as Record<string, unknown>);

      // The active case, so the run sees the events the user confirmed.
      const response = await requestSmallClaimsAnalysis(
        mappedInput,
        getActiveCaseId(),
      );
      const analysisResult = response.result!;
      const payload: StoredCaseData = {
        ...analysisResult.payload,
        extra: {
          ...(analysisResult.payload.extra || {}),
          analysisExecution: {
            reasoningMode: response.reasoningMode,
            analysisAvailable: response.analysisAvailable === true,
            authenticated: response.authenticated === true,
            completedAt: new Date().toISOString(),
          },
          // Per-element record state from the depth phase, carried through so
          // the readiness gate reads the SAME map the depth answers populated
          // rather than rebuilding its own (design section 5). Absent when no
          // claim type was confirmed or the user skipped — both legitimate.
          ...(result.elementStateMap ? { elementStateMap: result.elementStateMap } : {}),
        },
      };
      handleComplete(analysisResult.analysis, payload);
    } catch (error) {
      setGuidedAnalysisError(
        error instanceof Error
          ? error.message
          : "CourtSimplified could not complete the guided intake analysis. Please review the intake and try again.",
      );
    } finally {
      setGuidedAnalyzing(false);
    }
  }

  function handleComplete(
    result: AnalysisResult,
    payload: StoredCaseData,
  ) {
    setCanonicalIntakeSaved(false);
    const masterResultPatch = mergeMasterResult(
      queryCaseId ? existingMasterResult : {},
      payload.masterResultPatch,
    );

    setAnalysis(result);
    setCaseData({
      ...payload,
      masterResultPatch,
    });
  }

  const originatingDocumentFiled = originatingDocumentRecorded({
    courtPath,
    caseData,
    intakeFacts: draftIntakeFacts,
  });

  function getActiveCaseId() {
    return masterCaseId || queryCaseId || null;
  }

  function pushWorkflow(route: string) {
    if (!caseData) {
      return;
    }

    router.push(
      buildWorkflowHref(
        route,
        getActiveCaseId(),
        courtPath,
      ),
    );
  }

  function createSmallClaimsClaimDraft() {
    const caseId = getActiveCaseId();
    if (!caseData || !caseId || courtPath !== "small-claims") {
      setSaveError("Save the selected Small Claims case before creating a working claim draft.");
      return;
    }

    const claim = draftSmallClaimsPlaintiffClaim(caseData);
    const now = new Date().toISOString();
    const generatedDocument: GeneratedDocument = {
      id: `small-claims-form-7a-${Date.now()}`,
      documentType: "general-litigation-package",
      title: "Draft Plaintiff’s Claim (Form 7A)",
      subtitle: "Working draft created from your saved Small Claims intake — review and edit before use.",
      generatedAt: now,
      readiness: "needs-review",
      sections: [
        { id: "parties", heading: "Parties", purpose: "Record the party details entered during intake.", paragraphs: claim.partySection, bulletPoints: [], linkedEvidenceIds: [], exhibitLabels: [], warnings: [] },
        { id: "claim-overview", heading: "What you are asking for", purpose: "Record the outcome entered during intake.", paragraphs: claim.claimOverview, bulletPoints: [], linkedEvidenceIds: [], exhibitLabels: [], warnings: [] },
        { id: "facts", heading: "Facts", purpose: "Organize the facts entered during intake into numbered paragraphs for review.", paragraphs: claim.numberedClaimFacts, bulletPoints: [], linkedEvidenceIds: [], exhibitLabels: [], warnings: [] },
        { id: "amount-claimed", heading: "Amount claimed", purpose: "Review the amount and calculation entered during intake.", paragraphs: claim.damagesSection, bulletPoints: [], linkedEvidenceIds: [], exhibitLabels: [], warnings: [] },
        { id: "evidence", heading: "Evidence to review", purpose: "List the records identified during intake.", paragraphs: claim.evidenceSection, bulletPoints: [], linkedEvidenceIds: [], exhibitLabels: [], warnings: [] },
      ],
      warnings: claim.missingInformation,
      nextSteps: ["Review every fact, amount, and party detail.", "Complete missing information before relying on this draft.", "Compare the draft with the official Form 7A before filing or serving."],
    };

    writeWorkspaceDocument(caseId, buildWorkspaceDocument({ generatedDocument }));
    router.push(buildWorkflowHref("/document-workspace", caseId, courtPath));
  }

  function createCourtAreaWorkingDraft(
    title: string,
    subtitle: string,
    factsHeading: string,
  ) {
    const caseId = getActiveCaseId();
    if (!caseData || !caseId) {
      setSaveError("Save the selected case before creating a working draft.");
      return;
    }

    const extra = asRecord(caseData.extra);
    const amount = String(extra.amountClaimed || extra.damagesBreakdown || "").trim();
    const now = new Date().toISOString();
    const generatedDocument: GeneratedDocument = {
      id: `originating-draft-${Date.now()}`,
      documentType: "general-litigation-package",
      title,
      subtitle,
      generatedAt: now,
      readiness: "needs-review",
      sections: [
        { id: "parties", heading: "Parties", purpose: "Review the party details entered during intake.", paragraphs: [`Applicant/Plaintiff: ${caseData.yourName || "Not entered"}`, `Other party: ${caseData.otherParty || "Not entered"}`], bulletPoints: [], linkedEvidenceIds: [], exhibitLabels: [], warnings: [] },
        { id: "facts", heading: factsHeading, purpose: "Review and edit the facts entered during intake.", paragraphs: [caseData.facts || "No facts entered yet."], bulletPoints: [], linkedEvidenceIds: [], exhibitLabels: [], warnings: [] },
        { id: "outcome", heading: "Requested outcome", purpose: "Review the outcome entered during intake.", paragraphs: [caseData.goal || "No requested outcome entered yet."], bulletPoints: [], linkedEvidenceIds: [], exhibitLabels: [], warnings: [] },
        { id: "amount-and-timeline", heading: "Amount and timeline", purpose: "Review amounts and important dates entered during intake.", paragraphs: [amount ? `Amount entered: ${amount}` : "No amount entered.", caseData.timeline || "No timeline entered yet."], bulletPoints: [], linkedEvidenceIds: [], exhibitLabels: [], warnings: [] },
        { id: "evidence", heading: "Evidence to review", purpose: "Review the records identified during intake.", paragraphs: [caseData.evidence || "No evidence description entered yet."], bulletPoints: [], linkedEvidenceIds: [], exhibitLabels: [], warnings: [] },
      ],
      warnings: ["This is a working draft created from intake. Review every field and compare it with the official court form before use."],
      nextSteps: ["Review and edit the draft.", "Complete any missing facts, dates, and party details.", "Compare the draft with the official court form before filing or serving."],
    };

    writeWorkspaceDocument(caseId, buildWorkspaceDocument({ generatedDocument }));
    router.push(buildWorkflowHref("/document-workspace", caseId, courtPath));
  }

  function goToDashboardCase() {
    const targetCaseId = getActiveCaseId();

    if (!targetCaseId) {
      return;
    }

    router.push(`/dashboard/cases/${targetCaseId}`);
  }

  function goToSettlementConference() {
    if (!caseData) {
      return;
    }

    router.push(
      buildWorkflowHref(
        "/settlement-conference",
        getActiveCaseId(),
        courtPath,
      ),
    );
  }

  function goToDraftingAssistant() {
    if (!caseData) {
      return;
    }

    router.push(
      buildWorkflowHref(
        "/ai-drafting-assistant",
        getActiveCaseId(),
        courtPath,
      ),
    );
  }

  function handleChatMasterResultUpdate(patch: any) {
    setCaseData((current) => {
      const currentMasterResult = current?.masterResultPatch || existingMasterResult;
      const mergedMasterResult = mergeMasterResult(
        currentMasterResult,
        patch,
      );

      return current
        ? {
            ...current,
            masterResultPatch: mergedMasterResult,
          }
        : current;
    });
  }

  useEffect(() => {
    if (!analysis || !canonicalIntakeSaved || !completedOverviewRef.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    completedOverviewRef.current.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, [analysis, canonicalIntakeSaved]);

  function handleChatDashboardUpdate(patch: any) {
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
    setCaseData((current) =>
      current
        ? {
            ...current,
            recommendedNextRoute: route,
          }
        : current,
    );
  }

  /*
   * Edit Intake keeps the current case and chat because the user is editing
   * the same matter, not creating a new one.
   */
  function editCurrentIntake() {
    setAnalysis(null);
    setCaseData(null);
    setSaveError("");
    setLastSavedAt("");
    setCanonicalIntakeSaved(false);
  }

  /*
   * Start New Case removes only temporary active-case context and creates a
   * completely new chat session. It does not delete any saved case.
   */
  function startNewCase() {
    if (savingMaster) {
      return;
    }

    clearTransientCaseContext();

    setAnalysis(null);
    setCaseData(null);
    setMasterCaseId(null);
    setExistingMasterResult({});
    setExistingCaseStage("");
    setCaseLoadError("");
    setLoadingExistingCase(false);
    setSaveError("");
    setLastSavedAt("");
    setCanonicalIntakeSaved(false);
    setChatSessionId(createChatSessionId(courtPath));

    router.replace(`/builder?path=${courtPath}`);
  }

  return (
    <main className="min-h-screen bg-[#f8faf8] px-6 py-10 text-[#16302b]">
      <div className="mx-auto max-w-6xl">
        {!analysis && SHOW_LEGACY_INTELLIGENCE_UI && <section className="mb-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#2f7d67]">
                {pathLabel} Case Partner
              </p>

              <h1 className="text-4xl font-bold tracking-tight text-[#10231f]">
                {pathLabel} structured intake
              </h1>

              <p className="mt-4 max-w-3xl text-lg leading-8 text-[#4d675f]">
                Your case story and confirmed location are already attached.
                Continue with the details needed for this court path.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm">
              <p className="font-semibold text-[#10231f]">
                Workflow status
              </p>

              <p className="mt-2 text-[#4d675f]">
                Case ID: {activeCaseId || "not created yet"}
              </p>

              <p className="mt-1 text-[#4d675f]">
                Path: {pathLabel}
              </p>

              <p className="mt-1 text-[#4d675f]">
                Save:{" "}
                {savingMaster
                  ? "Saving..."
                  : lastSavedAt
                    ? "Saved"
                    : "Waiting"}
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

            {!queryCaseId && (
              <button
                type="button"
                onClick={startNewCase}
                disabled={savingMaster}
                className="rounded-full border border-[#b8d8cc] bg-[#f4fbf8] px-5 py-2 text-sm font-semibold text-[#2f7d67] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start Fresh Case
              </button>
            )}
          </div>
        </section>}

        {loadingExistingCase ? (
          <div className="mb-8 rounded-2xl border border-[#d8e6df] bg-white p-4 text-sm text-[#4d675f]">
            Loading the selected case before enabling analysis...
          </div>
        ) : null}

        {caseLoadError ? (
          <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {caseLoadError} No data from another case was substituted.
          </div>
        ) : null}

        {!loadingExistingCase && !caseLoadError && !analysis && !confirmedLocation && (
          <section className="mx-auto max-w-3xl rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#2f7d67]">{pathLabel} intake</p>
            <h1 className="mt-2 text-3xl font-bold text-[#10231f]">{pathLabel} structured intake</h1>
            {!hydrated ? (
              <p className="mt-6 text-sm font-semibold text-[#4d675f]" aria-live="polite">Preparing a private case start…</p>
            ) : (
              <>
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <label><span className="font-semibold">Province or territory</span><select aria-label="Province or territory" value={intakeProvince} onChange={(event) => setIntakeProvince(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"><option value="">Select province or territory</option><option value="Ontario">Ontario</option></select></label>
                  <label><span className="font-semibold">City or municipality</span><input aria-label="City or municipality" value={intakeCity} onChange={(event) => setIntakeCity(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3" /></label>
                </div>
                {courtPath !== "small-claims" && (
                  <label className="mt-5 block"><span className="font-semibold">Tell us what happened in your own words</span><textarea aria-label="Tell us what happened in your own words" value={intakeStory} onChange={(event) => setIntakeStory(event.target.value)} className="mt-2 min-h-32 w-full rounded-2xl border border-[#d8e6df] px-4 py-3" /></label>
                )}
                <button
                  type="button"
                  disabled={intakeProvince !== "Ontario" || !intakeCity.trim() || (courtPath !== "small-claims" && !intakeStory.trim())}
                  onClick={() => {
                    setConfirmedLocation({ province: "Ontario", city: intakeCity.trim() });
                    setHomeStory(courtPath === "small-claims" ? "" : intakeStory.trim());
                  }}
                  className="mt-6 rounded-xl bg-[#2f7d67] px-5 py-3 font-semibold text-white disabled:bg-slate-300"
                >
                  {courtPath === "small-claims" ? "Continue" : `Continue with ${pathLabel} questions`}
                </button>
              </>
            )}
          </section>
        )}

        {!loadingExistingCase && !caseLoadError && !analysis && confirmedLocation && (
          <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-[#2f7d67]">
                Structured intake
              </p>

              <h2 className="text-2xl font-bold text-[#10231f]">
                Add details when you are ready
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#4d675f]">
                Your Home location confirmation is already attached to this
                intake. Add the area-specific case details below.
              </p>
            </div>

            {/*
              ABOVE FamilyIntake and NOT blocking it. The routing question does
              come before the claim question in family law — that is the
              module's premise — but statusTriage RECORDS FACTS and gates
              nothing downstream, so putting a multi-step form in front of a
              user who wants to look around costs something and buys nothing.
              Both render; the user chooses.
            */}
            {courtPath === "family" && !loadingExistingCase && !caseLoadError && (
              <FamilyStatusTriage state={triageState} onChange={setTriageState} />
            )}

            {courtPath === "family" && (
              <FamilyIntake onComplete={handleComplete} location={confirmedLocation} initialStory={homeStory} />
            )}

            {courtPath === "small-claims" && smallClaimsMode === "choose" && (
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSmallClaimsMode("form")}
                  className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-6 text-left transition hover:border-[#2f7d67]"
                >
                  <h3 className="text-lg font-bold text-[#10231f]">Fill in the form yourself</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                    Work through the structured intake form at your own pace, filling in each section directly.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSmallClaimsMode("guided")}
                  className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-6 text-left transition hover:border-[#2f7d67]"
                >
                  <h3 className="text-lg font-bold text-[#10231f]">Answer questions one at a time with AI help</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                    Describe what happened in your own words and answer follow-up questions one at a time.
                  </p>
                </button>
              </div>
            )}

            {courtPath === "small-claims" && smallClaimsMode === "form" && (
              <SmallClaimsIntake onComplete={handleComplete} location={confirmedLocation} initialStory={homeStory} />
            )}

            {courtPath === "small-claims" && smallClaimsMode === "guided" && (
              <>
                <GuidedSmallClaimsIntake
                  location={confirmedLocation}
                  initialStory={homeStory}
                  onComplete={handleGuidedComplete}
                />
                {guidedAnalyzing ? (
                  <p className="mt-4 text-sm font-semibold text-[#4d675f]" aria-live="polite">
                    Analyzing your guided intake...
                  </p>
                ) : null}
                {guidedAnalysisError ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {guidedAnalysisError}
                  </div>
                ) : null}
              </>
            )}

            {courtPath === "civil" && (
              <CivilIntake
                onComplete={handleComplete}
                caseId={queryCaseId || masterCaseId}
                location={confirmedLocation}
                initialStory={homeStory}
              />
            )}
          </section>
        )}

        {analysis && !loadingExistingCase && !caseLoadError && !canonicalIntakeSaved && (
          <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm" aria-live="polite">
            <h2 className="text-xl font-bold text-[#10231f]">Saving core intake</h2>
            <p className="mt-2 text-sm leading-6 text-[#4d675f]">
              CourtSimplified is saving this area&apos;s structured intake to the canonical case record before opening AI Case Partner.
            </p>
            {saveError && <p className="mt-3 text-sm font-semibold text-[#a63b3b]">The core intake could not be saved. Review or edit the intake before continuing.</p>}
          </section>
        )}

        {/*
          MOUNTED ON caseId ALONE, outside the analysis gate below.

          This sat inside `analysis && canonicalIntakeSaved`, and both are
          React state: `analysis` starts null, is set only by handleComplete
          after an analysis run, and is reset to null when an existing case
          loads. So a user who ran intake, saw candidates, answered none and
          reloaded never saw them again — they were still unanswered
          server-side, and nothing rendered them.

          That defeated the design decision the schema was built around:
          unanswered candidates never expire, because silence is not "no".
          They did not expire. They became invisible, which is worse, because
          the record says they are still open.

          The surface needs NOTHING from `analysis`. Its only prop is caseId
          and it fetches its own state from /api/cases/event-candidates. The
          gate was incidental — it was placed there for layout, between the
          overview panel and the draft, and inherited a condition that had
          nothing to do with it.
        */}
        {getActiveCaseId() && !loadingExistingCase && !caseLoadError ? (
          <div className="mt-8">
            <EventCandidateSurface caseId={getActiveCaseId() as string} />
          </div>
        ) : null}

        {analysis && canonicalIntakeSaved && (
          <section ref={completedOverviewRef} className="mt-8 space-y-6" data-testid="completed-case-overview" tabIndex={-1}>
            <IntelligenceOverviewPanel analysis={analysis} intake={caseData} />
            {/*
              The Statement of Claim stays gated, and not by oversight — see
              the note in the spec. It needs `draftInput`, a
              SmallClaimsIntelligenceInput built during the run, which no load
              path reconstructs.
            */}
            {draftInput ? (
              <StatementOfClaimSurface
                matchedClaimTypeId={draftClaimTypeId}
                initialElementStateMap={draftElementStateMap}
                mappedInput={draftInput}
                onStateMapChange={setDraftElementStateMap}
              />
            ) : null}
            <ProcedureAuthorityDisplay
              courtArea={courtPath}
              procedureStage={getStageForPersistence(analysis, caseData)}
            />
            <section className="rounded-2xl border border-[#d8e6df] bg-white p-5">
              <h2 className="text-lg font-bold text-[#16302b]">What CourtSimplified can help with next</h2>
              {/*
                The draft buttons below are gated on whether the originating
                document is already recorded as filed. They used to be gated on
                courtPath and a case id only, so a case recording the claim
                filed, served and a default judgment obtained was still offered
                "Create Plaintiff's Claim draft (Form 7A)" — the document that
                starts the case, offered to someone past default.
              */}
              {originatingDocumentFiled ? (
                <p className="mt-3 text-sm leading-6 text-[#4d675f]" data-testid="originating-document-recorded">
                  Your records show the document that starts this case has already been filed, so
                  a draft of it is not offered here. If that is not right, change what is recorded
                  under &ldquo;Documents already recorded&rdquo;.
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                {courtPath === "small-claims" && getActiveCaseId() && !originatingDocumentFiled ? (
                  <button type="button" onClick={createSmallClaimsClaimDraft} className="rounded-xl bg-[#16302b] px-5 py-3 text-sm font-semibold text-white">
                    Create Plaintiff&apos;s Claim draft (Form 7A)
                  </button>
                ) : null}
                {courtPath === "civil" && getActiveCaseId() && !originatingDocumentFiled ? (
                  <button type="button" onClick={() => createCourtAreaWorkingDraft("Draft Statement of Claim (Form 14A)", "Working draft created from your saved Ontario Civil intake — review and edit before use.", "Material facts")} className="rounded-xl bg-[#16302b] px-5 py-3 text-sm font-semibold text-white">
                    Create Statement of Claim draft (Form 14A)
                  </button>
                ) : null}
                {courtPath === "family" && getActiveCaseId() && !originatingDocumentFiled ? (
                  <button type="button" onClick={() => createCourtAreaWorkingDraft("Draft Family Application (Form 8)", "Working draft created from your saved Ontario Family intake — review and edit before use.", "Facts for review")} className="rounded-xl bg-[#16302b] px-5 py-3 text-sm font-semibold text-white">
                    Create Family Application draft (Form 8)
                  </button>
                ) : null}
                <button type="button" onClick={() => pushWorkflow("/evidence")} className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white">Organize evidence</button>
                <button type="button" onClick={goToDashboardCase} disabled={savingMaster || !getActiveCaseId()} className="rounded-xl border border-[#2f7d67] bg-white px-5 py-3 text-sm font-semibold text-[#2f7d67] disabled:opacity-50">Review intake details</button>
                <button type="button" onClick={() => pushWorkflow("/forms")} className="rounded-xl border border-[#2f7d67] bg-white px-5 py-3 text-sm font-semibold text-[#2f7d67]">Check official forms and procedure</button>
              </div>
            </section>
            {analysisAvailable && !showFollowUp && <button type="button" onClick={() => setShowFollowUp(true)} className="text-sm font-semibold text-[#2f7d67]">Ask follow-up questions</button>}
            {analysisAvailable && showFollowUp && <CourtAssistantChat
              caseId={queryCaseId || undefined}
              chatSessionId={queryCaseId ? undefined : chatSessionId}
              path={courtPath}
              proceduralStage={analysis?.intelligence?.proceduralPosture?.stage || caseData?.caseStage || existingCaseStage}
              caseData={{ courtPath, pathLabel, analysis, intake: caseData, createdMasterCaseId: masterCaseId }}
              masterResult={caseData?.masterResultPatch || existingMasterResult}
              evidenceData={analysis?.intelligenceEvidenceIssues}
              strategyData={{ risks: analysis?.intelligence?.litigationRisks, nextBestActions: analysis?.nextBestActions }}
              onMasterResultUpdate={handleChatMasterResultUpdate}
              onDashboardUpdate={handleChatDashboardUpdate}
              onRecommendedRoute={handleRecommendedRoute}
            />}
          </section>
        )}

        {analysis && SHOW_LEGACY_INTELLIGENCE_UI && (
          <div className="mt-8 space-y-6">
            <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#2f7d67]">
                    Intelligence Result
                  </p>

                  <h2 className="mt-2 text-3xl font-bold text-[#10231f]">
                    Your case information
                  </h2>

                  <p className="mt-3 max-w-3xl text-[#4d675f]">
                    Review the information currently recorded for your case and
                    the items that may need attention next.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] px-5 py-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
                    Current stage
                  </p>

                  <p className="mt-1 text-lg font-bold capitalize text-[#10231f]">
                    {analysis.intelligence?.proceduralPosture?.stage ||
                      analysis.caseStage}
                  </p>

                </div>
              </div>

              {saveError ? (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {saveError}
                </div>
              ) : null}

              {lastSavedAt ? (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  Your intake information has been saved.
                </div>
              ) : null}

              <div className="mt-8">
                <IntelligenceOverviewPanel analysis={analysis} intake={caseData} />
              </div>

              <div className="mt-8 rounded-3xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
                <h3 className="text-lg font-bold text-[#16302b]">
                  Continue with your case
                </h3>

                <p className="mt-3 text-sm leading-6 text-[#4d675f]">
                  Choose the area you want to work on next. Court requirements
                  and any forms should be reviewed before you act.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={goToDashboardCase}
                    disabled={
                      savingMaster || !getActiveCaseId()
                    }
                    className="rounded-2xl bg-[#16302b] px-6 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    Review saved intake
                  </button>

                  <button
                    type="button"
                    onClick={() => pushWorkflow("/evidence")}
                    className="rounded-2xl border border-[#2f7d67] bg-white px-6 py-3 font-semibold text-[#2f7d67]"
                  >
                    Organize evidence
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
                    onClick={() =>
                      pushWorkflow("/document-workspace")
                    }
                    className="rounded-2xl bg-[#2f7d67] px-6 py-3 font-semibold text-white"
                  >
                    Document Workspace →
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      pushWorkflow("/litigation-strategy")
                    }
                    className="rounded-2xl border border-[#2f7d67] bg-[#f8fcfa] px-6 py-3 font-semibold text-[#2f7d67]"
                  >
                    Strategy →
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      pushWorkflow("/court-package")
                    }
                    className="rounded-2xl border border-[#2f7d67] bg-[#f8fcfa] px-6 py-3 font-semibold text-[#2f7d67]"
                  >
                    Court Package →
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      pushWorkflow("/trial-package")
                    }
                    className="rounded-2xl border border-[#2f7d67] bg-[#f8fcfa] px-6 py-3 font-semibold text-[#2f7d67]"
                  >
                    Trial Preparation →
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      pushWorkflow("/document-export")
                    }
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
                    onClick={editCurrentIntake}
                    className="rounded-2xl border border-[#2f7d67] bg-white px-6 py-3 font-semibold text-[#2f7d67]"
                  >
                    Edit Intake
                  </button>

                  <button
                    type="button"
                    onClick={startNewCase}
                    disabled={savingMaster}
                    className="rounded-2xl border border-[#9a4f13] bg-[#fff4e5] px-6 py-3 font-semibold text-[#9a4f13] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Start New Case
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {analysis && SHOW_LEGACY_INTELLIGENCE_UI && !loadingExistingCase && !caseLoadError && canonicalIntakeSaved && (
          <section className="mt-8">
            {!analysisAvailable && (
              <p className="mb-5 rounded-2xl border border-[#d8e6df] bg-white p-4 text-sm text-[#24463d]" data-testid="case-follow-up-unavailable-message">
                Case follow-up is temporarily unavailable. Your saved summary and evidence workspace are still available.
              </p>
            )}
            <CourtAssistantChat
              caseId={queryCaseId || undefined}
              chatSessionId={queryCaseId ? undefined : chatSessionId}
              path={courtPath}
              proceduralStage={analysis?.intelligence?.proceduralPosture?.stage || caseData?.caseStage || existingCaseStage}
              caseData={{ courtPath, pathLabel, analysis, intake: caseData, createdMasterCaseId: masterCaseId }}
              masterResult={caseData?.masterResultPatch || existingMasterResult}
              evidenceData={analysis?.intelligenceEvidenceIssues}
              strategyData={{ risks: analysis?.intelligence?.litigationRisks, nextBestActions: analysis?.nextBestActions }}
              onMasterResultUpdate={handleChatMasterResultUpdate}
              onDashboardUpdate={handleChatDashboardUpdate}
              onRecommendedRoute={handleRecommendedRoute}
            />
          </section>
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
