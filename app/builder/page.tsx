"use client";

import { useIntakeReviewView, usePrepareCaseGuidance, intakeGuidanceHeaders, useIntakeState, useStory, useCaseLocation, useContinueHandler, useIntakeRecovery, useBeforeIntakeAI, useValidateIntakeResponse, IntakeRecoveryBoundary } from "../_components/IntakeRecovery";
import SafetyCheckUnavailable from "./_components/SafetyCheckUnavailable";
import { confirmedLocationOf, storyOf } from "../../src/lib/case-system/intakeStory";

import { reviewPhase } from "../../src/lib/case-system/intakeReview";
import { IntakeRequest } from "../_components/intakeRequest";

import { recordedAmountOf } from "@/src/lib/case-system/amountNotes";
import { findStage } from "@/src/lib/case-system/stage-map/stageMap";
import { documentsOf, storedIntakeValues } from "@/src/lib/case-system/caseRecord";
import Link from "next/link";
import GetHelp from "../_components/GetHelp";
import { readStoredPicture, stepFromPicture, type CasePicture } from "../../src/lib/case-system/intake/caseReader";
import { stepNamedInStory } from "../../src/lib/case-system/stage-map/suggestedStep";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import FamilyIntake, { type FamilyScope } from "./_components/FamilyIntake";
import { ChildSupportTableCard } from "./_components/ChildSupportTableCard";
import ChildSupportIntake from "./_components/ChildSupportIntake";
import { childSupportPrefill } from "./_components/childSupportPrefill";
import SmallClaimsIntake, {
  requestSmallClaimsAnalysis,
} from "./_components/SmallClaimsIntake";
import GuidedSmallClaimsIntake, {
  type GuidedIntakeCompletionResult,
} from "./_components/GuidedSmallClaimsIntake";
import { readSourcedAnswers } from "./_components/SourcedQuestions";
import {
  CASE_REQUEST_TIMEOUT_MS,
  caseRouteWrite,
  nextSaveGeneration,
  retryCatchUp,
  runCaseWrite,
  savePositionQueuedOutcome,
  saveWithRetryUnlessSuperseded,
  stageGenerations,
  startCatchUp,
  trackPositionWork,
  type PositionGenerations,
} from "./_components/positionSave";
import { updateMasterResult } from "@/src/lib/case-system/updateCaseRecord";
import type { ServiceMethod } from "@/src/lib/case-system/deadlines/serviceEffectiveDate";
import { mapGuidedIntakeToSmallClaimsInput } from "./_components/guidedIntakeToSmallClaimsInput";
import StatementOfClaimSurface from "./_components/StatementOfClaimSurface";
import { COURT_DOCUMENT_DRAFTING_ENABLED } from "@/src/lib/case-system/policy/courtDocumentDrafting";
import type { SmallClaimsIntelligenceInput } from "@/src/lib/case-system/intelligence/smallClaimsIntelligenceEngine";
import type { ElementStateMap } from "@/src/lib/case-system/intake/depth/elementStateMap";
import CivilIntake from "./_components/CivilIntake";
import FamilyStatusTriage, {
  existingFamilyOrder,
  respondingInFamilyStory,
  emptyTriageState,
  triageStateFromStored,
  type FamilyTriageState,
} from "./_components/FamilyStatusTriage";
import CourtAssistantChat from "./_components/CourtAssistantChat";
import IntelligenceOverviewPanel from "./_components/IntelligenceOverviewPanel";
import CaseReviewPanel from "./_components/CaseReviewPanel";
import EvidenceUploadCard from "./_components/EvidenceUploadCard";
import ScopePreviewNotice from "./_components/ScopePreviewNotice";
import ProcedureAuthorityDisplay from "./_components/ProcedureAuthorityDisplay";
import EventCandidateSurface from "./_components/EventCandidateSurface";
import { buildDerivedFrom } from "../../src/lib/case-system/events/caseAnalysisFreshness";
import { filingFactsFromDocuments } from "../../src/lib/case-system/intelligence/answeredQuestions";
import type { CaseEventRow } from "../../src/lib/case-system/events/caseEventAdapter";

import {
  AnalysisResult,
  CourtPath,
  StoredCaseData,
  UniversalStage,
  getPathLabel,
} from "./_components/builderTypes";
import StageConfirmation from "./_components/StageConfirmation";
import { officialUrl, sourceName } from "@/src/lib/case-system/stage-map/citations";
import MotionToChangeRoute from "./_components/MotionToChangeRoute";
import {
  MOTION_TO_CHANGE_START_SAY,
  TEMPORARY_MOTION_FOLD_LABEL,
  motionToChangeLead,
  motionToChangeStartRules,
  routeShown,
  stageFromMotionAnswer,
  stageQuestionWaits,
  standingChoice,
  temporaryMotionCardMode,
  type MotionToChangeKind,
  type ReadingChoice,
} from "./_components/motionToChange";
import { personAnswersFromGuided, personAnswersOf, stageRecordedFromAnswers, type StageFromAnswers } from "./_components/stageFromAnswers";
import StageAnswerPanel from "./_components/StageAnswerPanel";
import { respondingDocumentDraft, respondingDocumentTitle, type RespondingDocumentIntake } from "../../src/lib/case-system/drafts/respondingDocumentDraft";
import { movingOnMotionToChange, originatingDocumentRecorded, respondingDocumentStillDue, userIsResponding } from "./_components/respondingSide";
import { readCasePosition, storyHintsForDates, storyWithTimeline, suggestedDatesFromAnswers, type SuggestedDate } from "../../src/lib/case-system/casePosition";
import { suggestedNoticeStep } from "../../src/lib/case-system/claim-types/noticeStep";
import { caseTitleFromIntake, isGeneratedTitle } from "../../src/lib/case-system/caseTitle";
import { userWordsOf } from "../../src/lib/content-library/forms/formsInText";
import { type CaseDraft } from "../../src/lib/case-system/drafts/caseDrafts";
import { startingDocumentDraft } from "../../src/lib/case-system/drafts/startingDocumentDraft";
import AiUseNotice from "../_components/AiUseNotice";
import PathwayUnavailable from "../_components/PathwayUnavailable";
import { FORM_COMPLETION_PAUSED, isPathwayAvailable, type KnownPathway } from "../../src/lib/content-library/phaseScope";
import FirstUseAcknowledgement from "../_components/FirstUseAcknowledgement";
import LegalInformationNotice from "../_components/LegalInformationNotice";

import { supabase } from "../../src/lib/supabase/client";
import { consumeGuestIntakeSession } from "../../src/lib/case-system/builderDraftStorage";
import { BUILDER_LAST_CASE_KEY, COURT_PATH_FINDER_KEY, SHARED_STORAGE_KEYS } from "../../src/lib/case-system/storage/intakeStorageKeys";
import { userStory } from "@/src/lib/case-system/userStory";

/** The UniversalStage codes, for validating a resolved stage before use. */
const STAGE_CODES = [
  "starting-case",
  "responding",
  "already-started",
  "conference",
  "motion",
  "trial",
  "enforcement",
  "urgent",
  "not-sure",
] as const;

/**
 * Where the case stands, or an admission that we do not know.
 *
 * *** THE DEFAULT USED TO BE "starting-case", AND THAT WAS THE BUG ***
 *
 * docs/accuracy-diagnosis.md traced ten realistic stories through this code.
 * Eight received the same guidance. The proximate cause was a
 * `text.includes("defendant")` elsewhere, but this line was the more dangerous
 * half: when the three real signals were all absent, it asserted that the case
 * was at the beginning.
 *
 * A default is a confident answer given without evidence. This one told a
 * defendant who already had default judgment signed against them how to start
 * a claim — because nothing had recorded a stage, and "nothing recorded" was
 * being read as "nothing has happened".
 *
 * "not-sure" is a real position with its own content: `next:small-claims:not-sure`
 * directs to the referral resources rather than guessing at a procedural step.
 * Saying we cannot tell costs one more question. Guessing costs somebody the
 * step they were actually due to take.
 *
 * The richer form of this — a model reading the full case context and
 * returning a stage from the 37-position map, with UNKNOWN and a clarifying
 * question when it cannot tell — is in
 * src/lib/case-system/stage-map/resolveStage.ts. This function stays on the
 * nine-value builder taxonomy until that is wired through the builder.
 */
function getStageForPersistence(
  analysis: AnalysisResult | null,
  caseData: StoredCaseData | null,
) {
  return (
    analysis?.intelligence?.proceduralPosture?.stage ||
    caseData?.caseStage ||
    analysis?.caseStage ||
    "not-sure"
  );
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

  /*
   * WAS a hand-written list of ten keys, one of three such lists in the
   * codebase (the others in dashboard/page.tsx's logout and
   * caseContextStorage.ts). There are twenty-six keys. A list maintained in
   * three places is a list that is wrong in at least one of them.
   *
   * Now driven from the registry, so a key added there is cleared here.
   */
  for (const entry of SHARED_STORAGE_KEYS) {
    if (entry.area !== "local") continue;
    if (entry.matches === "exact") {
      localStorage.removeItem(entry.key);
      continue;
    }
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const name = localStorage.key(index);
      if (name && name.startsWith(entry.key)) localStorage.removeItem(name);
    }
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
  const recovery = useIntakeRecovery();
  const reviewView = useIntakeReviewView();
  const prepareCaseGuidance = usePrepareCaseGuidance();
  const intakeConfirmed = Boolean(reviewView && reviewPhase(reviewView.workflowStatus, reviewView.checkpoint) === "user-confirmed");
  const analysisInputRevision = useRef<string | null>(null);
  const beforeIntakeAI = useBeforeIntakeAI();
  const validateIntakeResponse = useValidateIntakeResponse();
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

  /**
   * Whether the first-use acknowledgement is still outstanding. null until the
   * component has read storage -- see the gate below the hooks.
   */
  const [acknowledgementOutstanding, setAcknowledgementOutstanding] = useState<boolean | null>(null);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  /**
   * The stage the USER confirmed, which is the only one that drives next-step
   * content. Null until they confirm, which is what gates the overview below.
   * Reset whenever a new analysis arrives, so a fresh run is re-confirmed
   * rather than inheriting the previous case's answer.
   */
  const [confirmedStage, setConfirmedStage] = useState<UniversalStage | null>(null);
  // The stage the person confirmed for the case being worked on this visit, so
  // re-running the analysis after Back or an edit does not ask it again
  // (held-back walkthrough, 2026-10-09). Cleared with a new case.
  const lastConfirmedRef = useRef<{ caseId: string | null; stage: UniversalStage } | null>(null);
  // The person's own intake answer the stage was recorded from, shown beside
  // it (stageFromAnswers.ts); only while that stage is the one recorded.
  const [stageBasis, setStageBasis] = useState<StageFromAnswers | null>(null);
  // The motion-to-change reading the person said yes to, when that answer recorded the stage.
  const [motionStageBasis, setMotionStageBasis] = useState<string | null>(null);
  /*
   * A stage from earlier answers sits on the case (marked "answers"), and the
   * answers given now settle none: it is replaced with "not sure", still
   * marked, so no stale stage stays on the case and the person is asked
   * (re-check 2026-10-14). Set per run in handleComplete.
   */
  const [clearAnswersStage, setClearAnswersStage] = useState(false);
  /*
   * The person's answer to the motion-to-change reading this visit (null
   * after Change); undefined until they answer, when a saved one stands
   * (standingChoice). Saved to the case position (re-review 2026-10-14).
   */
  const [motionAnswerThisVisit, setMotionAnswerThisVisit] = useState<{ answer: ReadingChoice; readingKind: MotionToChangeKind } | undefined>(undefined);
  /** The case a stage from answers was saved to on this visit, if any. */
  const answersStageSavedRef = useRef<string | null>(null);
  const [caseData, setCaseData] = useState<StoredCaseData | null>(null);

  /**
   * The stage the model detected, normalised to a UniversalStage code.
   *
   * `getStageForPersistence` already resolves this from the same three
   * sources, so the suggestion the user is asked to confirm is exactly the
   * value the rest of the app would have used silently.
   */
  const detectedStage = useMemo<UniversalStage>(() => {
    const raw = getStageForPersistence(analysis, caseData);
    return (STAGE_CODES as readonly string[]).includes(raw)
      ? (raw as UniversalStage)
      : "not-sure";
  }, [analysis, caseData]);
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
  const [triageState, setTriageState] = useIntakeState<FamilyTriageState>("builder", "triageState", emptyTriageState);
  // Issues and side from the family intake (or the saved case). Decides
  // whether the child-support draft fits this case at all.
  const [familyScope, setFamilyScope] = useState<FamilyScope | null>(null);
  // The family intake's questions are finished: the person pressed Continue
  // (FamilyIntake's onQuestionsDone). Until then the family triage and the
  // child-support builder wait, so one thing is asked at a time (walkthrough
  // 2026-10-13, V1: the marriage question sat beside the one-at-a-time chat).
  // A saved case reopened (queryCaseId) is past its intake, so they show.
  const [familyQuestionsDone, setFamilyQuestionsDone] = useIntakeState("builder", "familyQuestionsDone", false);
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
  /**
   * Whether `confirmedLocation` came from the loaded case rather than from the
   * user answering the gate in this session.
   *
   * Drives the "recorded when you started this case / change it" line below.
   * A location restored from a case is a FACT ABOUT THE CASE, and a user who
   * has moved since needs to be able to say so — before this, the gate
   * re-appearing was accidentally the only way to change it.
   */
  const [locationRestoredFromCase, setLocationRestoredFromCase] = useState(false);

  // The one copy of the story and location (intakeStory.ts), shared with the home
  // page and every intake form. A location counts as confirmed once it names a city.
  const [caseLocation, setConfirmedLocation] = useCaseLocation();
  const confirmedLocation = caseLocation?.city.trim() ? { province: "Ontario" as const, city: caseLocation.city } : null;
  const [homeStory, setHomeStory] = useStory();
  const [safetyCheckUnavailable] = useIntakeState("safety", "checkUnavailable", false, true);
  // Ontario only, for now (CLAUDE.md: Ontario beta). See HomeLocationGate for the same fix.
  const intakeProvince = "Ontario";
  const [intakeCity, setIntakeCity] = useIntakeState("builder", "intakeCity", "");
  /*
   * `intakeStory` was removed on 2026-09-17. See the gate below.
   *
   * THE RULE THIS NOW FOLLOWS: the gate establishes WHERE the case is. Each
   * path's intake collects WHAT HAPPENED, because each of them already does —
   * GuidedSmallClaimsIntake asks for it as its opening turn, and FamilyIntake
   * and CivilIntake each hold their own `facts` field, prefilled from
   * `initialStory` and validated in their own submit path
   * (FamilyIntake.tsx:224 and :434).
   *
   * The gate used to collect a story too, for every path except Small Claims,
   * because the exclusion was written as `courtPath !== "small-claims"` — a
   * condition that names one path instead of stating a rule. Small Claims was
   * reasoned about; Family and Civil kept the old behaviour by default. The
   * result was a second, required, duplicate story box on two paths, and a
   * Continue button that silently would not enable until it was filled.
   */
  const [hydrated, setHydrated] = useState(false);
  /*
   * Set the moment this mount loads a fresh story hand-off -- either the
   * court-path finder's COURT_PATH_FINDER_KEY or the home page's
   * GUEST_INTAKE_SESSION_STORAGE_KEY (both below) -- so the stale-case
   * recovery effect (search caseIdRecoveryDecidedRef) knows not to clobber it.
   * Found 2026-10-16 from the site owner's own live test: starting a brand
   * new Small Claims case, right after finishing an earlier one, landed on
   * the OLD case with its OLD story, because that recovery effect reads
   * BUILDER_LAST_CASE_KEY and injects its caseId into the URL whenever the
   * court path matches -- with no way to tell "this tab lost its place and
   * should resume" from "this is an intentional new case of the same type".
   * A hand-off that just set a fresh story IS that distinction.
   */
  const freshStoryHandoffRef = useRef(Boolean(recovery));
  /*
   * EACH BUILDER STEP IS A BACK STOP (2026-10-06).
   *
   * The mode chooser, the intake and the results were all React state on one
   * URL, so the browser's Back skipped every one of them and left the
   * builder; the site owner pressed Back after a live test and landed on a
   * fresh intake. Each step is now `?step=` in the URL, written with
   * history.pushState, which Next keeps in step with useSearchParams without
   * a navigation -- so the page stays mounted and nothing typed is lost.
   * Intakes already started stay mounted while hidden, so going Back to one
   * shows it exactly as it was.
   */
  const stepParam = searchParams.get("step");
  const visibleMode: "choose" | "form" | "guided" | null =
    stepParam === "form" || stepParam === "guided" ? stepParam : stepParam === "results" ? null : "choose";
  const smallClaimsMode = visibleMode ?? "choose";
  const [startedModes, setStartedModes] = useIntakeState<{ form: boolean; guided: boolean }>("builder", "startedModes", { form: false, guided: false });
  if ((visibleMode === "form" || visibleMode === "guided") && !startedModes[visibleMode]) {
    setStartedModes({ ...startedModes, [visibleMode]: true });
  }
  // Session 29: guided intake's completion result is now mapped into
  // SmallClaimsIntelligenceInput and run through the same
  // /api/small-claims/analyze -> handleComplete pipeline the form uses --
  // see guidedIntakeToSmallClaimsInput.ts for exactly which fields are
  // real versus left empty. These two only cover the brief window between
  // "conversation complete" and the analysis call resolving; once it
  // succeeds, handleComplete's own analysis/canonicalIntakeSaved state
  // takes over rendering, same as the form path.
  const [guidedAnalyzing, setGuidedAnalyzing] = useState(false);
  const guidedRequest = useRef(new IntakeRequest());
  useEffect(() => {
    const request = guidedRequest.current;
    return () => request.cancel();
  }, [queryCaseId, courtPath]);
  const [guidedAnalysisError, setGuidedAnalysisError] = useState("");
  // Dates confirmed in the guided intake, offered on the next-steps panel.
  const [guidedDates, setGuidedDates] = useState<Record<string, SuggestedDate>>({});
  /*
   * Dates the user confirmed in the guided intake are THEIR answers, so they
   * are saved to the case's position with it and counted straight away
   * (page review, 2026-10-07: the injury and service dates were confirmed in
   * the intake and the next-steps panel and case page asked for them again).
   * A ref, because the save runs after the state update that sets them.
   */
  const guidedDatesRef = useRef<Record<string, string>>({});
  /** Every answer the person confirmed in the guided intake, kept with the case (Phase 1). */
  const guidedAnswersRef = useRef<{ questionId: string; answerText: string }[]>([]);
  /** What the panel saved this visit, so Back then Forward shows it (page review, 2026-10-07). */
  // The case reader's checked reading of what the person wrote (CASE_READER).
  const [casePicture, setCasePicture] = useState<CasePicture | null>(null);
  // A press of "Try saving again" re-runs the case save below.
  const [saveAttempt, setSaveAttempt] = useState(0);
  const [positionThisVisit, setPositionThisVisit] = useState<{
    stepId?: string | null;
    dateAnswers?: Record<string, string>;
    service?: Record<string, { method: ServiceMethod; enteredOn: string } | null>;
  }>({});

  /*
   * Picking a mode is an internal state change, not a URL change, so
   * ScrollToTopOnNavigation.tsx's pathname/search-based effect never fires
   * for it. Without this, the browser is left wherever it scrolled to
   * click the mode card, not at the top of the destination screen the app
   * otherwise guarantees on every real navigation.
   */
  /*
   * The review panel's Continue (re-test 2026-10-18: after confirming there was no
   * Continue to press). The guided route turns its confirmed answers into guidance
   * here; from the Small Claims chooser it opens the form, whose own action runs
   * as soon as it mounts. Neither changes a fact, so neither un-confirms.
   */
  useContinueHandler("guided", () => {
    const saved = recovery?.getReview().checkpoint.sections.guided ?? {};
    void handleGuidedComplete({ facts: (saved.facts ?? {}) as GuidedIntakeCompletionResult["facts"], answeredIds: Array.isArray(saved.answeredIds) ? saved.answeredIds as string[] : [], matchedClaimType: (saved.matchedClaimType ?? null) as GuidedIntakeCompletionResult["matchedClaimType"], storyText: homeStory, answers: (Array.isArray(saved.earlierAnswers) ? saved.earlierAnswers : []) as NonNullable<GuidedIntakeCompletionResult["answers"]> });
  });
  useContinueHandler("choose", () => {
    pushStep("form");
    recovery?.continueToGuidance();
  });

  function pushStep(step: "form" | "guided" | "results") {
    const url = new URL(window.location.href);
    if (url.searchParams.get("step") === step) return;
    if (step !== "results") recovery?.put("builder", "step", step);
    url.searchParams.set("step", step);
    window.history.pushState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
  }

  useEffect(() => {
    if (stepParam === "form" || stepParam === "guided") recovery?.put("builder", "step", stepParam);
  }, [recovery, stepParam]);

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
    // SUPPRESSED DELIBERATELY, and this is a false positive rather than an
    // accepted risk.
    //
    // The rule warns about effects that SYNCHRONISE state, where each change
    // schedules another render. This flips one boolean once: the dependency
    // array is empty, nothing in the effect reads `hydrated`, and a second
    // call would set `true` over `true`, which React bails out of. There is
    // no feedback path and no loop — one extra render, at mount, by design.
    //
    // It is also load-bearing. See the comment above and the consumer below:
    // while `!hydrated` the intake form is not rendered at all, which is what
    // stops a selection made before hydration from being silently discarded.
    //
    // NOT converted to useSyncExternalStore, which would satisfy the rule
    // without a suppression. HomeLocationGate.tsx uses this identical pattern
    // and the comment above cites it as the same defence; converting one and
    // not the other would leave two shapes for one problem on a file that is
    // on every path. Worth doing to both, deliberately, rather than as a side
    // effect of clearing a lint line.
    //
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one boolean, once, at mount; see above
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (queryCaseId) return;
    let active = true;
    async function loadUserDraft() {
      /*
       * THE FINDER HAND-OFF IS CONSUMED UNCONDITIONALLY.
       *
       * This used to remove the key only inside the success branch, so a
       * payload that parsed but failed the province/city/facts guard — or any
       * visit where `initialPath` was absent — left the story in sessionStorage
       * for the life of the tab. A later /builder?path=… then picked it up and,
       * because it also set `confirmedLocation`, skipped the location gate and
       * fed the previous story into the intake. Every other field was fresh
       * React state, which is why the story was the only thing that survived.
       *
       * Read once, remove immediately, then decide whether to use it. The
       * remove must not be conditional on the value being usable: a payload we
       * will not use is still a story we should not keep.
       */
      const temporaryGuide = sessionStorage.getItem(COURT_PATH_FINDER_KEY);
      if (temporaryGuide) sessionStorage.removeItem(COURT_PATH_FINDER_KEY);

      if (initialPath && temporaryGuide) {
        try {
          const guide = JSON.parse(temporaryGuide) as { province?: string; city?: string; facts?: string };
          if (guide.province === "Ontario" && guide.city?.trim() && guide.facts?.trim()) {
            freshStoryHandoffRef.current = true;
            setConfirmedLocation({ province: "Ontario", city: guide.city.trim() });
            setHomeStory(guide.facts.trim());
            return;
          }
        } catch {
          // Already removed above. Nothing to clean up.
        }
      }
      /*
       * The home page's hand-off, read once and deleted, for signed-in and
       * anonymous users alike. There is deliberately NO fallback to a stored
       * draft: an intake opened without a caseId starts empty. Saved work is
       * opened from the workspace (?caseId=...), which loads it from the
       * account. (2026-09-28: a per-user localStorage draft was restored here
       * on every visit, so an old test story reappeared after signing in.)
       */
      if (!active) return;
      const draft = consumeGuestIntakeSession(sessionStorage);
      if (initialPath && draft?.courtPath === courtPath && draft.province === "Ontario" && draft.city.trim() && draft.facts.trim()) {
        freshStoryHandoffRef.current = true;
        setConfirmedLocation({ province: "Ontario", city: draft.city.trim() });
        setHomeStory(draft.facts.trim());
        return;
      }
      return;
    }
    void loadUserDraft();
    return () => { active = false; };
  }, [courtPath, initialPath, queryCaseId, router, setConfirmedLocation, setHomeStory]);
  /*
   * Important:
   * A case is active here only when:
   * 1. the URL supplied a real caseId; or
   * 2. this builder session created a new case.
   *
   * We intentionally do not fall back to the last active case stored in
   * localStorage. That fallback caused unrelated court paths to share cases.
   */
  /**
   * What the gate is still waiting on, named in the order the fields appear.
   *
   * Derived rather than duplicated: the button's `disabled` and the message
   * shown to the user read the same list, so they cannot disagree. A button
   * disabled for a reason the message does not mention is the defect this
   * replaced.
   */
  const gateBlockers = [
    !intakeCity.trim() ? "a city or municipality" : "",
  ].filter(Boolean);

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
    // A cleared analysis means the stage must be confirmed again rather than
    // inheriting the previous case's answer.
    setConfirmedStage(null);
    setCaseData(null);
    setMasterCaseId(null);
    setExistingMasterResult({});
    setExistingCaseStage("");
    setCaseLoadError("");
    setLoadingExistingCase(false);
    setSaveError("");
    setLastSavedAt("");
    setChatSessionId(createChatSessionId(courtPath));
  }, [courtPath, initialPath, queryCaseId]);

  /*
   * LEAVING A CASE CLEARS ITS STORY (2026-09-30).
   *
   * The site owner finished an intake, pressed Back, chose "AI questions", and
   * his story from two days earlier was sitting in the box. The builder is one
   * mounted page: /builder?caseId=A and /builder?path=small-claims are the same
   * component, so React state survives the navigation. The reset effect above
   * cleared the case, the analysis and the stage when caseId went away, but
   * not `homeStory` or the location loaded FROM that case -- and homeStory is
   * what prefills both Small Claims intakes. Whatever case the page last
   * opened came back as "your" story on a fresh intake.
   *
   * This runs only on a change of caseId, never on first mount, so the home
   * page's read-once hand-off (which sets homeStory on mount) is untouched.
   */
  const previousCaseIdRef = useRef<string | null>(queryCaseId);
  useEffect(() => {
    const previous = previousCaseIdRef.current;
    previousCaseIdRef.current = queryCaseId;
    if (previous === queryCaseId) return;
    if (previous && !queryCaseId) {
      setHomeStory("");
      setConfirmedLocation(null);
      setLocationRestoredFromCase(false);
    }
  }, [queryCaseId, setConfirmedLocation, setHomeStory]);

  useEffect(() => {
    let active = true;

    async function loadExistingCase() {
      if (!queryCaseId) return;

      // A case opens with ITS story or none -- never the previous case's.
      if (!storyOf(recovery?.getReview().checkpoint.sections ?? {}).trim()) setHomeStory("");
      setCaseLoadError("");
      setLoadingExistingCase(true);

      const data = recovery?.row?.id === queryCaseId ? recovery.row : null;
      const error = !data;


      if (!active) return;

      if (error || !data) {
        setExistingMasterResult({});
        setExistingCaseStage("");
        setCaseLoadError(
          "The selected case could not be loaded.",
        );
        setLoadingExistingCase(false);
        return;
      }

      const loadedMasterResult = asRecord(data.master_result);

      setMasterCaseId(data.id);
      setExistingMasterResult(loadedMasterResult);
      setCasePicture(readStoredPicture(loadedMasterResult.casePicture));
      setTriageState(triageStateFromStored(loadedMasterResult.familyStatus));

      /*
       * RESTORE THE LOCATION THIS CASE RECORDED. Section 0d.
       *
       * Without this, a returning user met the intake location gate again —
       * province, city, and "tell us what happened in your own words" — having
       * done all of it when they created the case. Everything behind that gate
       * was unreachable for them: the family triage and intake, the child
       * support screen and table card, the Small Claims mode chooser and both
       * its intakes, the civil intake.
       *
       * `setConfirmedLocation` had exactly three callers — the not-sure guide
       * hand-off, a matching local draft, and the gate's own Continue button.
       * The existing-case load was not one of them.
       *
       * WHERE IT COMES FROM. `master_result.intakeData.extra` — the
       * StoredCaseData the run saved. smallClaimsIntelligenceEngine spreads the
       * whole input into `payload.extra`, and the intake sets yourProvince and
       * yourCity from the confirmed location, so a case analysed on this path
       * already carries them. Two keys, already present, already loaded here.
       *
       * IT IS WHAT THE CASE RECORDED, NOT WHERE THE USER IS NOW. Someone who
       * has moved should be able to change it, so this fills the gate's answer
       * in rather than freezing it — see the "change the location" control
       * below, which is what keeps the gate reachable once this is set.
       *
       * NO GUESSING. Not from the user's profile, not from a sibling case, not
       * from a local draft belonging to a different case. Where the keys are
       * absent — a shell created but never analysed, or an older schema — this
       * does nothing and the gate renders, which is correct: there is no
       * recorded location, and inventing one attaches a wrong city to a court
       * document. The failure mode is today's behaviour.
       */
      const storedLocation = asRecord(asRecord(loadedMasterResult.intakeData).extra);
      const storedCity =
        typeof storedLocation.yourCity === "string" ? storedLocation.yourCity.trim() : "";
      const storedProvince =
        typeof storedLocation.yourProvince === "string"
          ? storedLocation.yourProvince.trim()
          : "";

      if (storedProvince === "Ontario" && storedCity && !confirmedLocationOf(recovery?.getReview().checkpoint.sections ?? {})) {
        setConfirmedLocation({ province: "Ontario", city: storedCity });
        setLocationRestoredFromCase(true);

        /*
         * THE STORY TOO, or this is a half-restore.
         *
         * The gate collects three things: province, city, and — on every path
         * but Small Claims — "tell us what happened in your own words", which
         * becomes `homeStory` and prefills the path's intake. Restoring the
         * location alone would skip the gate while leaving that prefill empty,
         * so a returning family user would land on an intake with a blank
         * story field, having written one when they started the case.
         *
         * Same source, same rule: `intakeData.facts` is the StoredCaseData
         * field, absent on an unanalysed shell, and absent means empty rather
         * than invented.
         */
        const storedFacts = asRecord(loadedMasterResult.intakeData).facts;
        if (typeof storedFacts === "string" && storedFacts.trim()) {
          setHomeStory(storedFacts.trim());
        }
      }
      setExistingCaseStage(
        typeof data.current_stage === "string" ? data.current_stage : "",
      );

      setLoadingExistingCase(false);
    }

    loadExistingCase();

    return () => {
      active = false;
    };
  }, [queryCaseId, recovery, setConfirmedLocation, setHomeStory, setTriageState]);

  /*
   * ONE SAVE AT A TIME (walkthrough, 2026-10-09). Saving the case set its id,
   * which re-ran this effect, so the same large record was written two or
   * three times at once -- more with the retries -- and the database cancelled
   * them ("canceling statement due to statement timeout", 57014): five of
   * twenty runs stopped on "Saving your case". Now a re-run caused only by the
   * id being set is skipped, and saves run one after another, never together.
   * The case id is read from a ref, so a save that waits never inserts a
   * second case.
   */
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const lastSavedInputsRef = useRef<{ analysis: unknown; caseData: unknown; courtPath: string; attempt: number } | null>(null);
  const masterCaseIdRef = useRef<string | null>(masterCaseId);
  useEffect(() => {
    masterCaseIdRef.current = masterCaseId;
  }, [masterCaseId]);

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

      let finalCaseId = queryCaseId || recovery?.getCaseId() || masterCaseIdRef.current || masterCaseId || "";
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

      /*
       * The master-case orchestrator used to run here: buildMasterCaseFromIntake
       * (masterCaseOrchestrator.ts) called into caseContextEngine, which ran a
       * "legal theory" engine and a civil evidence/strategy/workflow/form-routing
       * chain, to produce a `caseContext` and a `masterCaseFile`. Retired
       * 2026-10-15, MASTER_PLAN build order 6B ("the older engine chain retired
       * as the stage map replaces it"): confirmed nothing reads
       * master_result.caseContext or master_result.masterCaseFile anywhere in
       * the product -- every page that needs procedure reads the stage map
       * (CLAUDE.md s.2a is the one-copy rule this chain was the leftover other
       * copy of). The only two fields anything outside the orchestrator ever
       * read off its PersistedCaseRecord were its id and its title
       * (app/api/cases/route.ts's fallback title; the exhibit book's case
       * title, app/api/workspace/exhibit-book/route.ts). Those two survive as
       * plain values below; the engine chain itself is deleted with this
       * change (masterCaseOrchestrator.ts, caseContextEngine.ts,
       * legalTheoryEngine.ts, civilEvidenceEngine.ts, civilFormRoutingEngine.ts,
       * civilStrategyEngine.ts, civilWorkflowEngine.ts, civilMasterCaseEngine.ts,
       * casePersistenceEngine.ts).
       */
      const recordId = finalCaseId || crypto.randomUUID();
      const recordSummary = (analysis.summary || "").trim();
      const recordTitle = recordSummary
        ? recordSummary.slice(0, 80)
        : courtPath === "family"
          ? "Family Case"
          : courtPath === "civil"
            ? "Civil Litigation Case"
            : "Small Claims Case";

      const intelligenceMasterPatch =
        caseData.masterResultPatch &&
        typeof caseData.masterResultPatch === "object"
          ? caseData.masterResultPatch
          : {};

      const masterPayload = {
        ...intelligenceMasterPatch,

        masterCaseFile: (intelligenceMasterPatch as any).masterCaseFile || null,

        courtSimplifiedIntelligence:
          caseData.intelligence ||
          analysis.intelligence ||
          (intelligenceMasterPatch as any).courtSimplifiedIntelligence ||
          null,

        persistedRecord: {
          id: recordId,
          title: recordTitle,
          casePath: courtPath,
          stage,
          status: "ready-for-sync",
          evidencePackages: [],
          workspaceDocuments: [],
          syncNotes: ["Built from completed intake analysis."],
        },
        intakeAnalysis: analysis,
        intakeData: caseData,

        source: "builder-intake",
        lifecycleStage: "intake-analyzed",

        updatedSubsystems: {
          intake: now,
          analysis: now,
          masterCase: now,
          intelligence: now,
        },

        guidanceInputRevision: analysisInputRevision.current,
        workflowStatus: {
          // Completion is written only by the explicit review action.
          intakeCompleted: false,
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

      const activeId = finalCaseId || recordId;

      // The full case stays in the account. Only the active intake checkpoint
      // and pending UI text use the existing tab-scoped session slot.

      masterCaseIdRef.current = activeId || null;
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
        // The documents list lives in `extra` (filedDocuments, or documents
        // for civil). This read a top-level key that does not exist, so
        // form-intake cases saved no filing facts and the timeline said
        // "not enough recorded" (Phase 1 inventory, 2026-10-07).
        // An order or agreement on record is not a filing in this matter (FM: a
        // motion to change not yet brought read "a claim has been filed").
        const filingFacts = filingFactsFromDocuments(documentsOf(caseData), { orderIsNotAFiling: true });

        const intakeFacts: Record<string, unknown> = {
          ...(filingFacts.anythingFiled ? { claimFiled: true } : {}),
          ...(filingFacts.anythingServed ? { claimServed: true } : {}),
          ...(filingFacts.defenceOnRecord ? { defenceFiled: true } : {}),
          // Guided facts last: they are the user's direct answer, so they
          // override anything read back out of document selections.
          ...(draftIntakeFacts || {}),
        };

        /*
         * KEEP WHAT THE USER MADE ON THE CASE PAGE. master_result is rebuilt
         * whole here, and two of its keys are written separately, possibly
         * after this page loaded: `position` (the stage they confirmed, the step
         * they picked, the dates they gave; /api/cases/position) and `drafts`
         * (their working drafts; /api/cases/drafts). Read them now, not from the
         * copy loaded at mount, or a re-save would quietly erase work done since.
         */
        /*
         * Write only over what was just read (2026-10-13): a stage, date,
         * forms answer or reading saved between this read and this write was
         * erased. If anything wrote in between, read again and rebuild on top
         * (the same rule as updateCaseRecord.ts on the server).
         *
         * In the case's one write queue (positionSave.ts runCaseWrite,
         * 2026-10-14, run 38525903567): the position saves had a queue of
         * their own and wrote this same row while this write was going, and
         * the database cancelled both (57014). Read, write and retries all
         * run inside the queue, so no other write to the case starts until
         * this one has finished, and the case page waits for it.
         */
        const outcome = await runCaseWrite(activeId, async () => {
        const buildAndWrite = async (): Promise<{ error: { message: string } | null; conflict: boolean }> => {
        const { data: userOwnedRow, error: readError } = await supabase
          .from("cases")
          .select("master_result,updated_at")
          .eq("id", activeId)
          .eq("user_id", user!.id).eq("court_path", courtPath)
          // Given up after a time, so a read that never answers cannot hold
          // the case's write queue (review 2026-10-14).
          .abortSignal(AbortSignal.timeout(CASE_REQUEST_TIMEOUT_MS))
          .maybeSingle();
        if (readError) return { error: readError, conflict: false };
        const storedMaster = asRecord(userOwnedRow?.master_result);
        if (analysisInputRevision.current && asRecord(storedMaster.intakeCheckpoint).inputRevision !== analysisInputRevision.current) return { error: { message: "Initial information changed. Please analyze the current information again." }, conflict: false };
        const userOwned: Record<string, unknown> = Object.fromEntries(
          // formApplicability (the Forms page answers) and intakeAnswers (the
          // guided answers) are the user's too; a re-save erased them.
          // casePicture (the case reader's checked reading, /api/case/read) too.
          (["position", "drafts", "formApplicability", "intakeAnswers", "casePicture"] as const)
            .filter((key) => storedMaster[key] !== undefined && storedMaster[key] !== null)
            .map((key) => [key, storedMaster[key]]),
        );
        if (storedMaster.guidanceInputRevision !== analysisInputRevision.current) {
          // Old procedural choices/readings cannot be relabelled as guidance
          // for corrected facts. Preserve the person's recorded dates/service.
          if (storedMaster.position) userOwned.position = { ...asRecord(storedMaster.position), confirmedStage: null, confirmedStageAt: null, confirmedStageFrom: null, stepId: null, stepChosenAt: null };
          userOwned.casePicture = null;
        }
        // Dates confirmed in the guided intake join the position; a date the
        // user gave on the case page since wins.
        if (guidedAnswersRef.current.length) userOwned.intakeAnswers = guidedAnswersRef.current;
        if (Object.keys(guidedDatesRef.current).length) {
          const storedPosition = asRecord(userOwned.position);
          userOwned.position = {
            ...storedPosition,
            dateAnswers: { ...guidedDatesRef.current, ...asRecord(storedPosition.dateAnswers) },
          };
          setPositionThisVisit((current) => ({
            ...current,
            dateAnswers: { ...guidedDatesRef.current, ...(current.dateAnswers ?? {}) },
          }));
        }

        let write = supabase
          .from("cases")
          .update({
            // Named for who the case is with, not the engine's summary.
            title: isGeneratedTitle(recordTitle) ? caseTitleFromIntake(caseData.otherParty, courtPath) : recordTitle,
            court_path: courtPath,
            status: "active",
            current_stage: stage,
            master_result: {
              ...storedMaster,
              ...masterPayload,
              workflowStatus: { ...asRecord(masterPayload.workflowStatus), ...asRecord(storedMaster.workflowStatus) },
              derivedFrom,
              intakeFacts,
              familyStatus: triageState,
              ...userOwned,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", activeId).eq("user_id", user!.id).eq("court_path", courtPath);
        if (userOwnedRow?.updated_at) write = write.eq("updated_at", userOwnedRow.updated_at);
        const { data: written, error: writeError } = await write.abortSignal(AbortSignal.timeout(CASE_REQUEST_TIMEOUT_MS)).select("id");
        if (writeError) return { error: writeError, conflict: false };
        return { error: null, conflict: !(Array.isArray(written) && written.length > 0) };
        };
        /*
         * A write that lost to another save (a route's) is rebuilt on top of
         * it after a short pause, up to three times. A failed one (an error,
         * 57014 included, or a request given up) is tried ONCE more after a
         * jittered pause: each try holds the case's write queue, and four
         * tries with their pauses could hold it for over a minute and a half
         * against a database already behind (review 2026-10-14). The slowest
         * run -- two failed tries, each a read and a write given up at
         * CASE_REQUEST_TIMEOUT_MS -- stays inside the queue's work cap.
         */
        let outcome = await buildAndWrite();
        let errorRetries = 0;
        for (let attempt = 1; (outcome.error || outcome.conflict) && attempt <= 3; attempt += 1) {
          if (outcome.error && errorRetries >= 1) break;
          if (outcome.error) errorRetries += 1;
          await new Promise((resolve) => setTimeout(resolve, (outcome.error ? 1_500 : 150 * attempt) + Math.floor(Math.random() * 300)));
          outcome = await buildAndWrite();
        }
        return outcome;
        });
        const error = outcome.error ?? (outcome.conflict ? { message: "Your case changed while it was saving. Please try again." } : null);

        if (error) {
          setSaveError(error.message);
          setSavingMaster(false);
          return;
        }
      }

      setLastSavedAt(user && activeId ? now : "");
      setCanonicalIntakeSaved(true);
      setSavingMaster(false);

      // With the case saved, the case reader reads everything the person
      // wrote on it (master plan Phase 3). Off unless switched on; when it is
      // off or fails, nothing changes.
      if (process.env.NEXT_PUBLIC_CASE_READER !== "off" && user && activeId) {
        // Awaited, so the reading's write is done before any next case save.
        /*
         * THE PICTURE IS WRITTEN HERE, IN THE CASE'S QUEUE (2026-10-14). The
         * route used to write it itself, from the server, outside the page's
         * one write queue, while the page's position saves ran. It now only
         * reads (saveOnServer: false) and returns the picture as it would have
         * stored it; this page writes that, through runCaseWrite, so the
         * reading's AI wait never holds the queue and its write never
         * overlaps another.
         *
         * Known gap, accepted: if the person leaves the page during the
         * reading, the picture is not stored (the route no longer stores it
         * itself). Nothing else is lost: the picture only feeds suggestions,
         * and it is read again after the case's next save.
         */
        await (async () => {
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (!session?.access_token) return;
            const readerRevision = analysisInputRevision.current;
            const response = await fetch("/api/case/read", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ caseId: activeId, saveOnServer: false }),
            });
            const result = (await response.json()) as { picture?: unknown; storedPicture?: unknown };
            if (analysisInputRevision.current !== readerRevision || recovery?.getReview().checkpoint.inputRevision !== readerRevision) return;
            const picture = readStoredPicture(result.picture);
            if (picture) setCasePicture(picture);
            const stored = result.storedPicture;
            if (picture && stored && typeof stored === "object" && !Array.isArray(stored)) {
              await runCaseWrite(activeId, () =>
                updateMasterResult(supabase, { caseId: activeId }, (current) => asRecord(current.intakeCheckpoint).inputRevision !== readerRevision ? { reject: "stale-intake" } : ({ ...current, casePicture: stored }), 4, {
                  requestTimeoutMs: CASE_REQUEST_TIMEOUT_MS,
                }),
              ).catch(() => undefined);
            }
          } catch {
            // The page carries on as before.
          }
        })();
      }
    }

    // Skip a re-run that changes nothing but the case id this save just set.
    const last = lastSavedInputsRef.current;
    if (last && last.analysis === analysis && last.caseData === caseData && last.courtPath === courtPath && last.attempt === saveAttempt) {
      return;
    }
    if (analysis && caseData) lastSavedInputsRef.current = { analysis, caseData, courtPath, attempt: saveAttempt };
    saveChainRef.current = saveChainRef.current.then(saveMasterCase).catch(() => undefined);
  }, [analysis, caseData, courtPath, draftIntakeFacts, masterCaseId, queryCaseId, recovery, saveAttempt, triageState]);

  /*
   * Family questions answered AFTER the case was saved were never saved: the
   * save above runs on the analysis, not on these answers (master plan
   * Phase 1, 2026-10-07). Only `familyStatus` is written, read fresh so
   * nothing else on the case is touched.
   */
  useEffect(() => {
    if (courtPath !== "family" || !canonicalIntakeSaved) return;
    const id = savedCaseId();
    if (!id) return;
    const timer = setTimeout(() => {
      void (async () => {
        // Only over what was read (updateCaseRecord.ts), so a stage or date
        // saved at the same moment is kept; and in the case's one write
        // queue, so it never writes while another save of the case is going
        // (run 38525903567: this write was in no queue at all).
        // Each read and write is given up after a time, so it cannot hold
        // the queue (review 2026-10-14).
        await runCaseWrite(id, () =>
          updateMasterResult(
            supabase,
            { caseId: id },
            (stored) =>
              JSON.stringify(stored.familyStatus) === JSON.stringify(triageState) ? { reject: "unchanged" } : { ...stored, familyStatus: triageState },
            4,
            { requestTimeoutMs: CASE_REQUEST_TIMEOUT_MS },
          ),
        ).catch(() => undefined);
      })();
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triageState, canonicalIntakeSaved, courtPath]);

  /*
   * Session 29: reshapes guided intake's result into
   * SmallClaimsIntelligenceInput (guidedIntakeToSmallClaimsInput.ts),
   * calls the exact same requestSmallClaimsAnalysis() the form path uses,
   * then calls the exact same handleComplete() with the result -- no new
   * save logic, no new destination. confirmedLocation is guaranteed set
   * here (guided mode only ever renders once it is).
   */
  async function handleGuidedComplete(result: GuidedIntakeCompletionResult) {
    if (!confirmedLocation || guidedRequest.current.pending) return;
    // The same rule as the Small Claims form ("Session 19"): its analysis needs the
    // AI safety check first, and that check needs an account. The review panel's
    // Continue made this reachable by a guest (2026-10-18), so it is checked here too.
    if (recovery && !recovery.ownerId) {
      setGuidedAnalysisError("Please sign in to continue. Small Claims intake requires a signed-in account so CourtSimplified can run its safety check before analyzing your case.");
      return;
    }

    setGuidedAnalyzing(true);
    setGuidedAnalysisError("");

    try {
      await guidedRequest.current.run(async (signal) => {
        await beforeIntakeAI(signal);
        if (!(await prepareCaseGuidance())) return;
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
      guidedAnswersRef.current = (result.answers ?? []);
      const confirmedDates = suggestedDatesFromAnswers(result.answers ?? []);
      setGuidedDates(confirmedDates);
      // Only dates the person gave in full are kept as their answers; a date
      // whose year we guessed is offered on the card for them to choose.
      guidedDatesRef.current = Object.fromEntries(
        Object.entries(confirmedDates)
          .filter(([, suggestion]) => !suggestion.yearAssumed)
          .map(([questionId, suggestion]) => [questionId, suggestion.value]),
      );

      // The active case, so the run sees the events the user confirmed.
      const response = await requestSmallClaimsAnalysis(
        mappedInput,
        recovery?.getCaseId() ?? getActiveCaseId(),
        signal,
        intakeGuidanceHeaders(recovery),
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
          // 2026-09-28. The claim type MATCHED for this case, or null when
          // none was. The overview reads this instead of re-matching the
          // story, so its cards follow this match rather than a separate
          // keyword match that can disagree with it.
          confirmedClaimTypeId: result.matchedClaimType?.claimTypeId ?? null,
          // 2026-10-16 live bug: the field above is named "confirmed" but an
          // exact-phrase story match reaches it with the person never having
          // seen or been asked about the claim type -- no card, no message,
          // nothing names it before the results page. True only when the
          // person clicked "that's right" on the suggestion card
          // (GuidedSmallClaimsIntake.tsx's resolveSuggestion). The overview
          // panel reads this to word its label honestly either way.
          claimTypeUserConfirmed: result.matchedClaimType?.userConfirmed === true,
          // Follow-up answers, kept with the case so a return visit doesn't ask them again (Step 2A).
          ...(result.sourcedAnswers?.length ? { sourcedAnswers: result.sourcedAnswers } : {}),
          // The side and filing answers the person gave or confirmed in the
          // conversation itself (stageFromAnswers.ts), never the story alone.
          personAnswers: personAnswersFromGuided(result.answers ?? [], (result.facts ?? {}) as Record<string, unknown>),
        },
      };
      await validateIntakeResponse(signal);
      signal.throwIfAborted();
      handleComplete(analysisResult.analysis, payload);
      });
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
    const previousRevision = analysisInputRevision.current;
    analysisInputRevision.current = recovery?.getReview().checkpoint.inputRevision ?? null;
    const sameInitialInformation = previousRevision === analysisInputRevision.current || asRecord(existingMasterResult).guidanceInputRevision === analysisInputRevision.current;
    if (recovery) {
      const view = recovery.getReview();
      if (reviewPhase(view.workflowStatus, view.checkpoint) === "collecting") void recovery.transition("review", view.checkpoint.inputRevision ?? view.checkpoint.revision).catch(() => {});
    }
    setCanonicalIntakeSaved(false);
    const masterResultPatch = mergeMasterResult(
      queryCaseId ? existingMasterResult : {},
      payload.masterResultPatch,
    );

    setAnalysis(result);
    pushStep("results");
    // A fresh analysis is a fresh stage suggestion, so it is re-confirmed --
    // unless this case already has a stage the person confirmed, which stays
    // theirs and can still be changed (Phase 1: a returning user was asked
    // to confirm their stage again on every re-run).
    const storedPositionOnCase = queryCaseId && sameInitialInformation ? readCasePosition(existingMasterResult, courtPath) : null;
    // A stage recorded from earlier answers is not one the person chose: it
    // is worked out again from the answers given now (review 2026-10-14: Back,
    // a changed side, and the old "responding" stayed).
    const storedOnCase =
      storedPositionOnCase?.confirmedStage && storedPositionOnCase.confirmedStageFrom !== "answers" ? storedPositionOnCase.confirmedStage : null;
    // Only a Confirm or Change click this visit (never a stage read from answers).
    const thisVisit = sameInitialInformation ? lastConfirmedRef.current : null;
    const sameCase = Boolean(thisVisit && (queryCaseId || masterCaseIdRef.current) && thisVisit.caseId === (queryCaseId || masterCaseIdRef.current));
    const stored = storedOnCase && storedOnCase !== "not-sure" ? storedOnCase : sameCase ? thisVisit!.stage : null;
    /*
     * THE PERSON'S OWN ANSWER IS THEIR CONFIRMATION (2026-10-14, walkthrough
     * SW and RN). "What has been filed: Nothing filed yet" in the intake,
     * then "From what you told us: I have not filed anything yet. Yes, that is
     * right" on the results asked the same thing twice. Where the side and
     * filing answers the person gave themselves settle a stage beyond doubt,
     * and it is the stage the site suggests, it is recorded from them, shown
     * with that answer and a Change. Never from the story alone, and never
     * over a stage already on the case (stageFromAnswers.ts).
     */
    const rawSuggested = getStageForPersistence(result, payload);
    const suggested = ((STAGE_CODES as readonly string[]).includes(rawSuggested) ? rawSuggested : "not-sure") as UniversalStage;
    // Any stage the person set -- "I am not sure" included -- is theirs and
    // is never replaced by one read from answers (review 2026-10-14).
    const personSetStage = storedOnCase || (sameCase ? thisVisit!.stage : null);
    const fromAnswers = personSetStage ? null : stageRecordedFromAnswers(courtPath, personAnswersOf(payload.extra), suggested);
    // Kept apart from lastConfirmedRef, and saved marked as from the answers,
    // so the next run reads the answers afresh.
    setStageBasis(fromAnswers);
    const storedFromAnswers = storedPositionOnCase?.confirmedStageFrom === "answers" && storedPositionOnCase.confirmedStage !== "not-sure";
    setClearAnswersStage(!personSetStage && !fromAnswers && (storedFromAnswers || (answersStageSavedRef.current !== null && answersStageSavedRef.current === (queryCaseId || masterCaseIdRef.current))));
    const settledStage = stored ?? fromAnswers?.stage ?? null;
    setConfirmedStage(settledStage && settledStage !== "not-sure" ? (settledStage as UniversalStage) : null);
    setCaseData({
      ...payload,
      masterResultPatch,
    });
  }

  /*
   * The results show only on the results step, so Back from them returns to
   * the intake as it was, and Forward brings them back.
   */
  const resultsVisible = intakeConfirmed && Boolean(analysis) && analysisInputRevision.current === reviewView?.checkpoint.inputRevision && stepParam === "results";

  // The case this tab last saved, so a reload of the results step reopens it.
  useEffect(() => {
    const id = savedCaseId();
    if (!id) return;
    try {
      sessionStorage.setItem(BUILDER_LAST_CASE_KEY, JSON.stringify({ caseId: id, courtPath }));
    } catch {
      // Storage unavailable: a reload then starts a fresh intake, as before.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masterCaseId, queryCaseId, courtPath]);

  /*
   * A reload (or a Forward after the tab forgot its state) lands on
   * ?step=results with nothing in memory. Open the case that was saved
   * instead of showing an empty page; without one, start the intake.
   */
  useEffect(() => {
    if (!hydrated || stepParam !== "results" || analysis || queryCaseId) return;
    // Same guard as the guided/form recovery below: a fresh story hand-off
    // landing on this mount is an intentional new case and must never be
    // overwritten with an old one of the same court type, even though this
    // exact effect was not the one the 2026-10-16 live test happened to hit
    // (it only fires on ?step=results). It shares the same flaw and the
    // same fix belongs in both places.
    if (freshStoryHandoffRef.current) return;
    let last: { caseId?: string; courtPath?: string } | null = null;
    try {
      last = JSON.parse(sessionStorage.getItem(BUILDER_LAST_CASE_KEY) || "null");
    } catch {
      last = null;
    }
    if (last?.caseId && last.courtPath === courtPath) {
      router.replace(`/cases/${encodeURIComponent(last.caseId)}`);
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("step");
    window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
  }, [hydrated, stepParam, analysis, queryCaseId, courtPath, router]);

  /*
   * The same "tab forgot its state" problem as the results-step recovery
   * above, but for the guided intake step, which had no recovery at all: a
   * reload, or any full remount of this page (not just a reload -- leaving
   * and coming back without the SPA navigation pushStep() uses), on
   * ?step=guided with no caseId in the URL starts the intake completely from
   * scratch, even when this tab already saved answers for this exact case.
   * GuidedSmallClaimsIntake only resumes what's already answered (the
   * `previous` prop) when `queryCaseId` is set, and nothing writes caseId
   * into this page's own URL during intake -- only when navigating away to
   * /cases/<id>.
   *
   * Covers both "guided" and "form": GuidedSmallClaimsIntake already has a
   * late-arriving-`previous` effect (`previousTaken` ref, gated on
   * `!started`) built for exactly this kind of async backfill, so adding
   * caseId to the URL after mount is enough to make it resume correctly.
   * SmallClaimsIntake (the "form" step) originally read `storedValues` only
   * in its initial useState initializer, with no such backfill -- extending
   * this effect to "form" without that would have updated the URL without
   * fixing what's on screen until the next reload. Gave it the matching
   * `storedValuesTaken`/`userEditedRef` backfill (2026-10-15) before
   * extending this effect, so both steps now resume correctly.
   *
   * Found 2026-10-15 from live testing: finishing the guided intake, then
   * reopening "Answer questions one at a time with AI help" re-asked
   * everything, including the opening story, from zero.
   */
  /*
   * This must act on a fresh mount of this page only, never on an in-session
   * Browser Back/Forward -- a Page Walkthrough run on 2026-10-15 found every
   * Small Claims persona failing at exactly Browser Forward after Back: a
   * first attempt tried to detect Back/Forward with a `popstate` listener,
   * but that lost a race against Next's own router (which also reacts to
   * the same `popstate` and, on this evidence, finishes updating the URL and
   * re-running this effect before the listener's flag was set), so it still
   * fired. The intake panels already "stay mounted while hidden" (see the
   * comment above), so an in-session Back/Forward never remounts this page
   * -- only leaving the builder entirely and coming back (the real bug this
   * exists for) does. Deciding once per mount, rather than per Back/Forward,
   * sidesteps the race instead of trying to win it.
   */
  const caseIdRecoveryDecidedRef = useRef(false);
  /*
   * THE STEP THIS PAGE MOUNTED ON, WHICH IS NOT THE STEP IT IS SHOWING.
   *
   * *** WHY THE "DECIDE ONCE PER MOUNT" REF ABOVE WAS NOT ENOUGH (2026-10-16) ***
   *
   * `caseIdRecoveryDecidedRef` is only set on the first run that gets PAST the
   * guided/form guard. Mount on the chooser -- `/builder?path=small-claims`, which
   * the dashboard's "Start a new case" opens -- and `stepParam` is null, so this
   * effect returns at that guard having decided nothing. The moment the person
   * enters a city and picks "Answer questions one at a time with AI help",
   * `stepParam` becomes "guided", the effect runs for real, finds the previous
   * case in BUILDER_LAST_CASE_KEY, and injects its caseId into the URL.
   *
   * So the person asked for a new case and got the old one's story and location
   * back. `freshStoryHandoffRef` did not save them: it is only set by the home
   * page's and the court-path finder's hand-offs, and arriving at the chooser
   * from the dashboard is neither.
   *
   * The distinction that actually matters is WHERE THE PAGE CAME IN. A tab that
   * lost its place and should resume re-enters directly on ?step=guided or
   * ?step=form. Somebody starting a new case enters on the chooser and walks
   * forward to guided/form. Both end up with the same `stepParam`, so the step
   * being shown cannot tell them apart -- only the step it mounted on can.
   */
  const mountedStepRef = useRef<string | null>(null);
  const mountedStepDecidedRef = useRef(false);
  if (!mountedStepDecidedRef.current) {
    mountedStepDecidedRef.current = true;
    mountedStepRef.current = stepParam;
  }

  /*
   * A new case started from the chooser forgets the last one.
   *
   * The second half of the same fix. Without this, the stale caseId sits in
   * sessionStorage for the rest of the tab's life, so the NEXT thing that reads it
   * -- a reload of the results step, or any future recovery path -- still reopens
   * the finished case. Arriving at the chooser with no caseId is an intentional
   * new case, and the whole purpose of that key is "this tab lost its place";
   * a tab that is deliberately starting over has not lost its place.
   *
   * Only on a mount that is BOTH on the chooser and without a caseId. Opening a
   * saved case (?caseId=...) must leave the key alone.
   */
  useEffect(() => {
    if (!hydrated || queryCaseId) return;
    if (mountedStepRef.current === "guided" || mountedStepRef.current === "form") return;
    try {
      sessionStorage.removeItem(BUILDER_LAST_CASE_KEY);
    } catch {
      // Storage unavailable: nothing was stored to clear.
    }
    /*
     * `hydrated` and `queryCaseId` are the complete dependency list: the step this
     * mount came in on is read from a ref, so it deliberately does not appear here
     * and does not re-trigger when the person walks forward to guided or form.
     * That is the whole point — an eslint-disable was added here at first and was
     * unnecessary, which lint caught.
     */
  }, [hydrated, queryCaseId]);

  useEffect(() => {
    if (!hydrated || queryCaseId) return;
    if (stepParam !== "guided" && stepParam !== "form") return;
    /*
     * Recovery is for a tab that RE-ENTERED on the intake, not one that walked
     * here from the chooser. See mountedStepRef above.
     */
    if (mountedStepRef.current !== "guided" && mountedStepRef.current !== "form") return;
    if (caseIdRecoveryDecidedRef.current) return;
    caseIdRecoveryDecidedRef.current = true;
    // A fresh story hand-off just landed on this mount (the home page or the
    // court-path finder) -- that is an intentional new case, not a tab that
    // lost its place, so it must never be overwritten with an old one of the
    // same court type. See freshStoryHandoffRef above for the live-test bug
    // this guards against (2026-10-16).
    if (freshStoryHandoffRef.current) return;
    let last: { caseId?: string; courtPath?: string } | null = null;
    try {
      last = JSON.parse(sessionStorage.getItem(BUILDER_LAST_CASE_KEY) || "null");
    } catch {
      last = null;
    }
    if (!last?.caseId || last.courtPath !== courtPath) return;
    const url = new URL(window.location.href);
    url.searchParams.set("caseId", last.caseId);
    router.replace(`${url.pathname}?${url.searchParams.toString()}`);
  }, [hydrated, stepParam, queryCaseId, courtPath, router]);

  const respondingSide = userIsResponding({
    confirmedStage,
    caseData,
    intakeFacts: draftIntakeFacts,
  });
  // With an order already in place, the support-table card moves below the
  // step panel, folded -- but only once that panel is on screen, so the card
  // is never hidden in one place before it shows in the other (review 2026-10-13).
  const supportTableAfterStep =
    courtPath === "family" &&
    existingFamilyOrder(homeStory || userStory(caseData)) &&
    resultsVisible &&
    Boolean(analysis) &&
    canonicalIntakeSaved &&
    Boolean(confirmedStage);
  // An order already in place and words asking to change it ("how do i get
  // it lowered"): the results lead with the motion-to-change route, quoted
  // from r. 15 (5) and (2), instead of a temporary-motion rule card
  // (walkthrough MC, 2026-10-14; motionToChange.ts).
  const familyStory = homeStory || userStory(caseData);
  const motionLead =
    courtPath === "family"
      ? motionToChangeLead(
          courtPath,
          // The urgent answer counts only when it says something is urgent.
          [familyStory, caseData?.goal, /^\s*(?:no|none|nothing|not|n\/a)\b/i.test(caseData?.urgent ?? "") ? "" : caseData?.urgent].filter(Boolean).join("\n"),
          existingFamilyOrder(familyStory),
          respondingInFamilyStory(familyStory),
        )
      : null;
  // The answer that stands for this reading: given this visit, else saved on
  // the case while the reading is the same kind.
  const motionChoice = standingChoice(motionLead, motionAnswerThisVisit, readCasePosition(existingMasterResult, courtPath).motionToChange);
  // The ordinary response is offered only while it is still their next
  // document: the step they chose or, before they choose, the one their
  // words name (case reader first, then the phrase lists).
  const respondingStep =
    (courtPath === "small-claims" || courtPath === "civil" || courtPath === "family"
      ? positionThisVisit.stepId ||
        readCasePosition(existingMasterResult, courtPath).stepId ||
        stepFromPicture(courtPath, casePicture, respondingSide) ||
        stepNamedInStory(courtPath, respondingSide, [userStory(caseData), caseData?.goal, caseData?.urgent].filter(Boolean).join("\n"))
      : "") || "";
  const offerRespondingDraft = respondingSide && respondingDocumentStillDue(respondingStep);
  // The motion-to-change route confirmed, or the reading not yet answered.
  const motionToChangeStart = motionToChangeStartRules();
  const motionRouteKind = motionLead ? (motionChoice === null ? motionLead.kind : (routeShown(motionLead, motionChoice)?.kind ?? null)) : null;
  // The moving party on a motion to change: its starting document is Form 15
  // (r. 15 (5)), not the original case's (walkthrough run 38525903567, FM).
  const motionToChangeMover = movingOnMotionToChange({ courtPath, responding: respondingSide, routeKind: motionRouteKind, stepId: respondingStep });
  const originatingDocumentFiled = originatingDocumentRecorded({
    courtPath,
    caseData,
    intakeFacts: draftIntakeFacts,
    confirmedStage,
    motionToChangeMover,
  });
  // The document that STARTS a case is offered only to the side that starts it.
  // Someone with a family order already changes it by a motion to change, not
  // a new application (walkthrough run 38475320722).
  const offerOriginatingDraft =
    !originatingDocumentFiled && !respondingSide && !(courtPath === "family" && existingFamilyOrder(homeStory || userStory(caseData)));

  function getActiveCaseId() {
    return masterCaseId || queryCaseId || recovery?.getCaseId() || null;
  }

  /**
   * The case id only when it is a case saved to the user's account (a UUID
   * from the cases table). A visitor who is not signed in gets a local id
   * ("case_…") that no server route or case page can open, so every control
   * that leads into the saved case reads this rather than getActiveCaseId()
   * (page walkthrough, 2026-10-04: "Open your case page" led to "This case
   * could not be opened").
   */
  function savedCaseId(): string | null {
    // A guest has no saved case, whatever id an analysis result carries
    // (re-test 2026-10-18: a guest's step panel sent one and was refused).
    if (recovery && !recovery.ownerId) return null;
    const id = getActiveCaseId();
    return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
  }

  const storedPosition = readCasePosition(existingMasterResult, courtPath);
  // Follow-up answers this case already holds, for a return visit (Step 2A).
  const earlierSourcedAnswers = useMemo(
    () => (queryCaseId ? readSourcedAnswers(asRecord(asRecord(asRecord(existingMasterResult).intakeData).extra).sourcedAnswers) : []),
    [queryCaseId, existingMasterResult],
  );
  const savedPosition = {
    ...storedPosition,
    stepId: positionThisVisit.stepId !== undefined ? positionThisVisit.stepId : storedPosition.stepId,
    dateAnswers: { ...storedPosition.dateAnswers, ...(positionThisVisit.dateAnswers ?? {}) },
  };

  async function saveConfirmedStage(caseId: string, stage: UniversalStage) {
    // One save at a time with the deadline box's own saves (positionSave.ts);
    // tried once more if it fails, so the case page does not ask again.
    // Tracked with its retry, so the case page waits for it before reading (R4).
    // Tried again only when it failed (a refused stage would be refused
    // again), and not at all once a newer save has started: its retry would
    // put this older stage over the newer choice (review 2026-10-14).
    // A click supersedes only the stage of an earlier save's retry; a
    // catch-up's dates still go (positionSave.ts, review 2026-10-14).
    const stageCounter = stageGenerations(saveGenerationsRef.current);
    const mine = nextSaveGeneration(stageCounter);
    await trackPositionWork(
      caseId,
      saveWithRetryUnlessSuperseded(stageCounter, mine, () => savePositionQueuedOutcome(caseId, { confirmedStage: stage })),
    );
  }

  /**
   * Every run of position saves on this page takes numbers; a retry is
   * dropped, or sent without its stage, once a newer save has started
   * (positionSave.ts): a newer catch-up supersedes all of an older one, a
   * newer stage save only the stage.
   */
  const saveGenerationsRef = useRef<PositionGenerations>({ stage: 0, catchUp: 0 });


  /*
   * WHAT WAS DECIDED ON THIS PAGE REACHES THE CASE, WHENEVER THE CASE EXISTS
   * (2026-10-13, walkthrough: 17 of 17 cases failed "never asks twice"; the
   * commonest cause was the case page asking again for the stage and dates
   * confirmed here). A stage confirmed, a step picked or a date given while
   * the case was still being saved (or the case reader was still reading)
   * was kept only on this page, because there was no saved case id to send it
   * to yet. Once the case is saved, anything not yet on it is sent now. Only
   * what the person chose here is sent (/api/cases/position validates it).
   */
  const sentPositionRef = useRef("");
  useEffect(() => {
    if (!canonicalIntakeSaved) return;
    const caseId = savedCaseId();
    if (!caseId) return;
    /*
     * EACH PART ITS OWN SAVE (2026-10-13, walkthrough run 38470954003: the
     * stage confirmed on this page was missing on the case page, on 3 of 5
     * cases). The position route accepts or rejects a save whole, so one date
     * it could not read took the confirmed stage down with it. The parts now
     * go together in one write, and one by one only if that write is refused
     * (2026-10-14, below), so a bad date still never takes the stage down.
     */
    const parts: Record<string, unknown>[] = [];
    // A stage read from the answers is saved marked as such; one the person
    // clicked is saved without the marker, which clears it (casePosition.ts).
    if (confirmedStage) {
      const fromAnswers = Boolean(stageBasis && stageBasis.stage === confirmedStage);
      if (fromAnswers) answersStageSavedRef.current = caseId;
      parts.push(fromAnswers ? { confirmedStage, confirmedStageFrom: "answers" } : { confirmedStage });
    } else if (clearAnswersStage) {
      // The answers given now settle no stage: the one from earlier answers
      // does not stay on the case. "Not sure", still marked, means: ask.
      parts.push({ confirmedStage: "not-sure", confirmedStageFrom: "answers" });
    }
    // The answer to the motion-to-change reading (null after Change removes it).
    if (motionAnswerThisVisit) {
      parts.push({
        motionToChange: motionAnswerThisVisit.answer ? { answer: motionAnswerThisVisit.answer, readingKind: motionAnswerThisVisit.readingKind } : null,
      });
    }
    if (positionThisVisit.stepId !== undefined) parts.push({ stepId: positionThisVisit.stepId });
    if (positionThisVisit.dateAnswers && Object.keys(positionThisVisit.dateAnswers).length) parts.push({ dateAnswers: positionThisVisit.dateAnswers });
    if (positionThisVisit.service && Object.keys(positionThisVisit.service).length) parts.push({ service: positionThisVisit.service });
    if (parts.length === 0) return;
    const key = JSON.stringify({ caseId, parts });
    if (sentPositionRef.current === key) return;
    sentPositionRef.current = key;
    // Tracked, retries and all: "Open your case page" can be pressed while
    // these are still going, and the case page waits for them before it reads
    // (positionSave.ts, walkthrough 2026-10-13 R4).
    /*
     * ONLY WHAT IS NOT YET ON THE CASE, IN ONE WRITE (2026-10-14, run
     * 38525903567). This re-sent every part each time any one changed, on top
     * of the deadline box's own save of the same thing, one full rewrite of
     * the case per part: the stage again with each date, the dates again with
     * each step. Now the parts this page already saved are left out
     * (unsavedPositionPatch), the rest go together in one write, and they go
     * one by one only if that write is refused (so a date the case cannot
     * take still never takes the stage down with it). One retry, after a
     * growing pause, for a write that failed.
     */
    // A retry is dropped once a newer catch-up has started, and sent without
    // its stage once only a newer stage save has (positionSave.ts).
    const mine = startCatchUp(saveGenerationsRef.current, parts.some((part) => part.confirmedStage !== undefined));
    const saveWithRetry = (patch: Record<string, unknown>) =>
      retryCatchUp(saveGenerationsRef.current, mine, patch, (retry) => savePositionQueuedOutcome(caseId, retry, { onlyUnsaved: true }));
    void trackPositionWork(caseId, (async () => {
      let allSaved = true;
      const together = await saveWithRetry(Object.assign({}, ...parts));
      if (together === "refused" && parts.length > 1) {
        for (const part of parts) {
          const outcome = await saveWithRetry(part);
          if (outcome === "superseded") continue;
          if (outcome !== "saved") allSaved = false;
        }
      } else if (together === "failed" || together === "refused") {
        allSaved = false;
      }
      if (!allSaved) sentPositionRef.current = "";
    })());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonicalIntakeSaved, confirmedStage, stageBasis, clearAnswersStage, motionAnswerThisVisit, positionThisVisit, masterCaseId]);

  function createSmallClaimsClaimDraft() {
    if (FORM_COMPLETION_PAUSED) return; // paused: see phaseScope.ts
    const caseId = savedCaseId();
    if (!caseData || !caseId || courtPath !== "small-claims") {
      setSaveError("Save the selected Small Claims case before creating a working claim draft.");
      return;
    }

    const draft = startingDocumentDraft("small-claims", caseData, new Date());
    if (draft) void saveDraftAndOpen(caseId, draft);
  }

  function createCourtAreaWorkingDraft(court: "civil" | "family") {
    if (FORM_COMPLETION_PAUSED) return; // paused: see phaseScope.ts
    const caseId = savedCaseId();
    if (!caseData || !caseId) {
      setSaveError("Save the selected case before creating a working draft.");
      return;
    }
    const draft = startingDocumentDraft(court, caseData, new Date());
    if (draft) void saveDraftAndOpen(caseId, draft);
  }

  function createRespondingDraft() {
    if (FORM_COMPLETION_PAUSED) return; // paused: see phaseScope.ts
    const caseId = savedCaseId();
    if (!caseData || !caseId) {
      setSaveError("Save the selected case before creating a working draft.");
      return;
    }
    const draft = respondingDocumentDraft(courtPath, caseData as RespondingDocumentIntake, new Date());
    if (draft) void saveDraftAndOpen(caseId, draft);
  }

  /** Saves a working draft to the case and opens it on the case page's Drafts tab. */
  async function saveDraftAndOpen(caseId: string, draft: CaseDraft) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setSaveError("Sign in to save a draft to your case.");
        return;
      }
      // The route writes the case's row: sent from inside the case's one
      // write queue (positionSave.ts), never beside another save of it.
      const response = await caseRouteWrite(caseId, "/api/cases/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ caseId, draft }),
      });
      if (!response?.ok) {
        setSaveError("The draft could not be saved to your case. Please try again.");
        return;
      }
      router.push(`/cases/${encodeURIComponent(caseId)}/drafts?open=${encodeURIComponent(draft.id)}`);
    } catch {
      setSaveError("The draft could not be saved to your case. Please try again.");
    }
  }

  function goToDashboardCase() {
    const targetCaseId = savedCaseId();

    if (!targetCaseId) {
      return;
    }

    router.push(`/cases/${encodeURIComponent(targetCaseId)}`);
  }

  function goToCaseSection(section: "documents" | "forms" | "timeline") {
    const targetCaseId = savedCaseId();
    if (!targetCaseId) return;
    router.push(`/cases/${encodeURIComponent(targetCaseId)}/${section}`);
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
    // A cleared analysis means the stage must be confirmed again rather than
    // inheriting the previous case's answer.
    setConfirmedStage(null);
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
    // A cleared analysis means the stage must be confirmed again rather than
    // inheriting the previous case's answer.
    setConfirmedStage(null);
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
    // A new case starts with no story: the previous case's must not prefill it.
    setHomeStory("");

    router.replace(`/builder?path=${courtPath}`);
  }

  /*
   * PHASE 1 IS SMALL CLAIMS ONLY (see src/lib/content-library/phaseScope.ts).
   *
   * Gated HERE and not only at the home gate, because `/builder?path=family`
   * is reachable by URL and from a saved draft — gating the front door alone
   * would leave the side door open.
   *
   * Before every hook has run? No: this sits after all of them, so the hook
   * order is unchanged whichever branch is taken. An early return above the
   * hooks would break the rules of hooks the moment someone added one.
   */
  if (!isPathwayAvailable(courtPath)) {
    return (
      <main className="min-h-screen bg-[#f8faf8] px-6 py-10 text-[#16302b]">
        <div className="mx-auto max-w-3xl">
          <PathwayUnavailable pathway={courtPath as KnownPathway} />
        </div>
      </main>
    );
  }

  /*
   * THE ACKNOWLEDGEMENT NOW ACTUALLY GATES (2026-09-23).
   *
   * It used to render as one item in a stack of notices with the entire intake
   * below it, so a user could scroll past and complete a whole case without
   * ticking the box. Its own header described it as "one screen, one checkbox,
   * shown once, before a user starts a case" — independent review found it was
   * none of those things structurally.
   *
   * `null` means the answer is not known yet and is treated the same as
   * outstanding, so the intake is never flashed and then withdrawn.
   *
   * An early return rather than wrapping the JSX below, for the same reason as
   * the pathway gate above: it sits after every hook, so the hook order does
   * not depend on the branch.
   */
  if (acknowledgementOutstanding !== false) {
    return (
      <main className="min-h-screen bg-[#f8faf8] px-6 py-10 text-[#16302b]">
        <div className="mx-auto max-w-3xl space-y-4">
          <FirstUseAcknowledgement onStatus={setAcknowledgementOutstanding} />
          {acknowledgementOutstanding === null && (
            <p className="text-sm text-[#4d675f]" aria-live="polite">
              Loading…
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8faf8] px-6 py-10 text-[#16302b]">
      <div className="mx-auto max-w-6xl">
        {/*
          DISCLOSURES ON THE MAIN AI SURFACE (LSO Step 6).

          The audit found the "legal information, not legal advice" notice on
          six pages and NOT on this one -- the builder, which is the main intake
          and where every model call in a user flow originates. And no AI-use
          disclosure existed anywhere in the product at all.

          The acknowledgement renders first and returns null once given, so a
          returning user sees the two notices instead of the gate.

          IT NOW ACTUALLY GATES (2026-09-23). It used to be one item in this
          stack with the intake rendered below it, so a user could scroll past
          and complete a whole case without ticking the box. Its own header
          called it a gate; independent review found it was a notice. While the
          acknowledgement is outstanding, nothing below this block renders.
        */}
        <div className="mb-8 space-y-4">
          <LegalInformationNotice />
          <AiUseNotice activity="read what you write, pull out dates and names, and suggest which court path and stage fit" />
        </div>

        

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

        {!loadingExistingCase && !caseLoadError && !resultsVisible && !confirmedLocation && (
          <section className="mx-auto max-w-3xl rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#2f7d67]">{pathLabel} intake</p>
            <h1 className="mt-2 text-3xl font-bold text-[#10231f]">{pathLabel} structured intake</h1>
            {!hydrated ? (
              <p className="mt-6 text-sm font-semibold text-[#4d675f]" aria-live="polite">Preparing a private case start…</p>
            ) : (
              <>
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  {/*
                    Ontario only, for now: a single fixed option, not a real
                    choice (see the comment on `intakeProvince` above). A
                    no-op onChange, not `readOnly`: React's <select> typing
                    has no `readOnly` prop (only input/textarea do in the
                    HTML spec). With one option there is nothing else to
                    select anyway.
                  */}
                  <label><span className="font-semibold">Province or territory</span><select aria-label="Province or territory" value={intakeProvince} onChange={() => {}} className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-[#f3f8f5] px-4 py-3"><option value="Ontario">Ontario (beta — other provinces are added later)</option></select></label>
                  <label><span className="font-semibold">City or municipality</span><input aria-label="City or municipality" value={intakeCity} onChange={(event) => setIntakeCity(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3" /></label>
                </div>
                {/*
                  A DISABLED BUTTON THAT DOES NOT SAY WHY IS A BROKEN BUTTON.
                  Someone who knows this codebase read a correctly-disabled
                  Continue as a dead end and concluded the Civil path could not
                  be used at all. A self-represented user would have no better
                  chance. The rule: whenever the button is disabled, name every
                  field still needed.
                */}
                {gateBlockers.length > 0 && (
                  <p
                    id="gate-blockers"
                    aria-live="polite"
                    className="mt-5 rounded-2xl border border-[#f0c88a] bg-[#fffaf2] px-4 py-3 text-sm leading-6 text-[#7a4b12]"
                  >
                    {gateBlockers.length === 1
                      ? `Still needed: ${gateBlockers[0]}.`
                      : `Still needed: ${gateBlockers.slice(0, -1).join(", ")} and ${gateBlockers[gateBlockers.length - 1]}.`}
                  </p>
                )}
                <button
                  type="button"
                  disabled={gateBlockers.length > 0}
                  aria-describedby={gateBlockers.length > 0 ? "gate-blockers" : undefined}
                  onClick={() => {
                    setConfirmedLocation({ province: "Ontario", city: intakeCity.trim() });
                  }}
                  className="mt-6 rounded-xl bg-[#2f7d67] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {courtPath === "small-claims" ? "Continue" : `Continue with ${pathLabel} questions`}
                </button>
              </>
            )}
          </section>
        )}

        {/*
          ABOVE the structured-intake section and NOT blocking it. The routing
          question does come before the claim question in family law — that is
          the module's premise — but statusTriage RECORDS FACTS and gates
          nothing downstream, so putting a multi-step form in front of a user
          who wants to look around costs something and buys nothing. Both
          render; the user chooses.

          OUTSIDE that section as of 2026-09-14, having been inside it. The
          section is gated on `!analysis`, so the triage disappeared the moment
          a family analysis completed — and that contradicted the module's own
          design in the sharpest possible way. Its header states that dismissal
          NEVER EXPIRES: a user who puts it away has chosen to, and sees it
          again only if they ask. A user who had simply not answered yet lost it
          outright, with the record still saying those facts are unrecorded.

          Which is the EventCandidateSurface defect almost word for word:
          unanswered items designed never to expire, made invisible instead,
          while the record says they are still open.

          It takes `triageState` and `setTriageState` and nothing else. No part
          of the analysis pipeline reaches it.

          AFTER THE QUESTIONS, NOT BESIDE THEM (walkthrough 2026-10-13, V1).
          "Were you and the other person married to each other?" sat above the
          one-question-at-a-time chat, so two question systems asked at once.
          It now waits until the family intake's questions are finished
          (familyQuestionsDone, set when the person presses Continue) or a
          saved case is reopened. That is not pipeline state: it is set before
          any analysis runs and never cleared, so the triage still never
          vanishes once shown. Answers given after the case is saved are
          written by the familyStatus effect above, so nothing is lost by
          asking later.
        */}
        {/* Before every Family question and step on the results page (2026-10-18). */}
        {resultsVisible && courtPath === "family" && safetyCheckUnavailable && <SafetyCheckUnavailable />}
        {courtPath === "family" && confirmedLocation && !loadingExistingCase && !caseLoadError && (familyQuestionsDone || Boolean(queryCaseId)) && (
          <FamilyStatusTriage
            state={triageState}
            onChange={setTriageState}
            homeCity={confirmedLocation.city}
            story={homeStory || userStory(caseData)}
          />
        )}

        {!loadingExistingCase && !caseLoadError && confirmedLocation && (
          <section hidden={resultsVisible} className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <div className="mb-6">
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-[#2f7d67]">
                Structured intake
              </p>

              <h2 className="text-2xl font-bold text-[#10231f]">
                Add details when you are ready
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#4d675f]">
                {/*
                  2026-10-16 live bug: this said "saved" the instant the
                  location gate's Continue button was clicked -- purely
                  client-side (setConfirmedLocation above), with nothing
                  written to the database yet. The real write only happens
                  later, in the saveMasterCase effect below, after the whole
                  structured intake and its AI analysis complete. Someone who
                  closed the tab here lost everything despite being told it
                  was saved. Worded to promise only what has actually
                  happened.
                */}
                Location noted. It will be saved with the rest of your case once you finish the details below.
              </p>

              {/*
                KEEPS THE GATE REACHABLE. Section 0d.
                A location restored from a loaded case is a fact about the
                CASE — where it was started — not about where the user is now.
                Before the restore, the gate re-appearing on every load was the
                only way to change it, which was accidentally the right outcome
                for someone who had moved and the wrong one for everyone else.
                Shown only when the location was restored rather than answered
                in this session: a user who just went through the gate does not
                need to be told they can go through it again.
              */}
              {locationRestoredFromCase && confirmedLocation ? (
                <p
                  data-testid="location-restored-notice"
                  className="mt-3 text-sm leading-6 text-[#4d675f]"
                >
                  Location recorded when you started this case:{" "}
                  <strong>{confirmedLocation.city}, {confirmedLocation.province}</strong>.{" "}
                  <button
                    type="button"
                    data-testid="change-recorded-location"
                    onClick={() => {
                      setIntakeCity(confirmedLocation.city);
                      setConfirmedLocation(null);
                      setLocationRestoredFromCase(false);
                    }}
                    className="font-semibold text-[#2f7d67] underline"
                  >
                    Change it
                  </button>
                </p>
              ) : null}
            </div>

            {courtPath === "family" && (
              <FamilyIntake
                onComplete={handleComplete}
                earlierSourcedAnswers={earlierSourcedAnswers}
                storedIntake={queryCaseId ? asRecord(existingMasterResult).intakeData : undefined}
                onScopeChange={setFamilyScope}
                onQuestionsDone={() => setFamilyQuestionsDone(true)}
                location={confirmedLocation}
                initialStory={homeStory}
              />
            )}

            {courtPath === "small-claims" && smallClaimsMode === "choose" && (
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => pushStep("form")}
                  className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-6 text-left transition hover:border-[#2f7d67]"
                >
                  <h3 className="text-lg font-bold text-[#10231f]">Fill in the form yourself</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                    Work through the structured intake form at your own pace, filling in each section directly.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => pushStep("guided")}
                  className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-6 text-left transition hover:border-[#2f7d67]"
                >
                  <h3 className="text-lg font-bold text-[#10231f]">Answer questions one at a time with AI help</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                    Describe what happened in your own words and answer follow-up questions one at a time.
                  </p>
                </button>
              </div>
            )}

            {courtPath === "small-claims" && startedModes.form && (
              <div hidden={visibleMode !== "form"}>
                <SmallClaimsIntake
                  onComplete={handleComplete}
                  location={confirmedLocation}
                  initialStory={homeStory}
                  storedValues={queryCaseId ? storedIntakeValues(existingMasterResult) : undefined}
                />
              </div>
            )}

            {courtPath === "small-claims" && startedModes.guided && (
              <div hidden={visibleMode !== "guided"}>
                <GuidedSmallClaimsIntake
                  location={confirmedLocation}
                  initialStory={homeStory}
                  onComplete={handleGuidedComplete}
                  // Coming back to a saved case: start from what it holds,
                  // so nothing already answered is asked again (Step 2A).
                  previous={
                    queryCaseId && Array.isArray(asRecord(existingMasterResult).intakeAnswers)
                      ? {
                          answers: asRecord(existingMasterResult).intakeAnswers as { questionId: string; answerText: string }[],
                          facts: asRecord(asRecord(existingMasterResult).intakeFacts),
                          sourcedAnswers: earlierSourcedAnswers,
                        }
                      : undefined
                  }
                />
                {guidedAnalyzing ? (
                  <AnalyzingNote />
                ) : null}
                {guidedAnalysisError ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {guidedAnalysisError}
                  </div>
                ) : null}
              </div>
            )}

            {courtPath === "civil" && (
              <CivilIntake
                onComplete={handleComplete}
                earlierSourcedAnswers={earlierSourcedAnswers}
                caseId={queryCaseId || masterCaseId}
                location={confirmedLocation}
                initialStory={homeStory}
                storedValues={queryCaseId ? storedIntakeValues(existingMasterResult) : undefined}
              />
            )}
          </section>
        )}

        {/*
          OUTSIDE the `!analysis` section, deliberately, and this is the third
          instance of one defect shape.

          Both were inside it until 2026-09-14, which meant they VANISHED the
          moment a family analysis completed — `handleComplete` sets `analysis`,
          and the section above is gated on `!analysis`. Neither component reads
          `analysis`, takes it as a prop, or derives anything from it. They hold
          their own state and build their own draft.

          The same shape as EventCandidateSurface, which was mounted behind
          `analysis && canonicalIntakeSaved` and was therefore invisible to any
          user not mid-analysis; and as statusTriage, which had no screen at
          all. Each time: a surface whose visibility was tied to state that had
          nothing to do with it, inherited from the block it was laid out in.

          What they actually need is both here and nothing more: the family
          path, and a confirmed location so there is a case context to sit in.
        */}
        {/*
          AND ONLY FOR THE CASES IT FITS (2026-10-04). It was shown on every
          family case: a father who had been served, asking about decision-
          making and parenting time, was given a child-support Application
          (Form 8) draft written as if he were starting the case, and a lecture
          on the support tables. The draft is an applicant's document, so it
          needs both: child support among the chosen issues, and the user not
          the respondent. The table card is general information about support,
          so it needs only the issue.
        */}
        {intakeConfirmed && courtPath === "family" && confirmedLocation && !loadingExistingCase && !caseLoadError && (() => {
          const savedExtra = (caseData as (StoredCaseData & { extra?: Record<string, unknown> }) | null)?.extra;
          const issues: string[] =
            familyScope?.issues ?? (Array.isArray(savedExtra?.issues) ? (savedExtra.issues as string[]) : []);
          const role = familyScope?.role ?? (typeof savedExtra?.yourRole === "string" ? savedExtra.yourRole : "not-sure");
          if (!issues.includes("child-support")) return null;
          return (
            <div className="mt-8" data-testid="child-support-surfaces">
              {/* The application builder is for a new case. Someone changing an
                  order they already have makes a motion to change instead
                  (walkthrough run 38475320722: a father lowering a 2022 support
                  order was offered "This produces your application"). */}
              {/* After the intake's questions, not beside them (V1), and
                  starting from what the intake recorded, as suggestions the
                  person can change (R3).
                  ONLY WHILE THE INTAKE IS OFF SCREEN (review 2026-10-13): Back
                  after Continue shows the guided chat again, and the builder
                  reappeared beside it. So, in a fresh session, it shows with
                  the results (resultsVisible, the same value that hides the
                  intake section), not merely once the questions are done.
                  Trade-off, accepted: if the analysis fails, the builder waits
                  until it succeeds. The triage keeps its never-disappears rule
                  and is NOT gated this way. A reopened saved case still shows
                  it. Its draft never reads the analysis. */}
              {role !== "respondent" && !existingFamilyOrder(homeStory || userStory(caseData)) && intakeConfirmed && ((familyQuestionsDone && resultsVisible) || Boolean(queryCaseId)) && (
                <ChildSupportIntake
                  recorded={childSupportPrefill(
                    familyScope?.recorded ?? {
                      yourName: typeof caseData?.yourName === "string" ? caseData.yourName : "",
                      otherParty: typeof caseData?.otherParty === "string" ? caseData.otherParty : "",
                      childrenInfo: typeof savedExtra?.childrenInfo === "string" ? savedExtra.childrenInfo : "",
                      currentLivingSituation:
                        typeof savedExtra?.currentLivingSituation === "string" ? savedExtra.currentLivingSituation : "",
                      evidence: typeof caseData?.evidence === "string" ? caseData.evidence : "",
                      story: homeStory || userStory(caseData),
                    },
                  )}
                />
              )}
              {/* With an order already in place, the table card is folded
                  under the next-step guidance instead (walkthrough run
                  38500825561, MC). */}
              {intakeConfirmed && !supportTableAfterStep ? <ChildSupportTableCard /> : null}
            </div>
          );
        })()}

        {resultsVisible && !loadingExistingCase && !caseLoadError && !canonicalIntakeSaved && (
          <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm" aria-live="polite">
            <h2 className="text-xl font-bold text-[#10231f]">Saving your case</h2>
            <p className="mt-2 text-sm leading-6 text-[#4d675f]">
              We are saving what you told us to your case, so every page can use it.
            </p>
            {saveError && (
              <p data-testid="save-error" className="mt-3 text-sm font-semibold text-[#a63b3b]">
                Your case could not be saved just now. Nothing you entered is lost.
                {/* The database's own reason, for support and the walkthrough (2026-10-08: two runs stopped here and the cause could not be seen). */}
                <span className="mt-1 block text-xs font-normal text-[#7a5418]">Details: {saveError.slice(0, 200)}</span>
              </p>
            )}
            {saveError && (
              <button
                type="button"
                data-testid="save-retry"
                onClick={() => setSaveAttempt((attempt) => attempt + 1)}
                className="mt-3 rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
              >
                Try saving again
              </button>
            )}
            {saveError && (
              <GetHelp
                heading="Need help while this is fixed?"
                why="Your answers are still on this page. You can try again in a moment, or reach a person through these services."
              />
            )}
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
        {/* Small Claims only: the event vocabulary and table are Small Claims (see CaseTimeline canRecord). */}
        {savedCaseId() && courtPath === "small-claims" && !loadingExistingCase && !caseLoadError ? (
          <div className="mt-8">
            <EventCandidateSurface
              caseId={savedCaseId() as string}
              recordedDates={savedPosition.dateAnswers}
              // The step they confirmed, as on the case Timeline: a sentence
              // naming its event is offered as that step, not asked cold
              // (walkthrough R6/R17, the builder's copy still asked).
              confirmedStep={
                confirmedStage && savedPosition.stepId && findStage(savedPosition.stepId)
                  ? { id: savedPosition.stepId, title: findStage(savedPosition.stepId)!.title, chosen: true }
                  : null
              }
            />
          </div>
        ) : null}

        {resultsVisible && analysis && canonicalIntakeSaved && (
          <section ref={completedOverviewRef} className="mt-8 space-y-6" data-testid="completed-case-overview" tabIndex={-1}>
            {/*
              SUGGEST THEN CONFIRM, BEFORE ANY NEXT STEPS RENDER.
              The stage is detected by a model from what the user wrote. It
              decides which next steps they are shown, so the user confirms it
              or picks another before the overview appears. No next-step
              content renders until they have.
            */}
            {motionLead ? (
              <MotionToChangeRoute
                lead={motionLead}
                choice={motionChoice}
                onChoose={(choice) => {
                  setMotionAnswerThisVisit({ answer: choice, readingKind: motionLead.kind });
                  // A confirmed motion-to-change route is the motion stage: the
                  // answer records it, so the stage is not asked again
                  // (walkthrough run 38525903567, FM). Never over a stage the
                  // person already set.
                  const stage = stageFromMotionAnswer(motionLead, choice);
                  if (stage && !confirmedStage) {
                    setConfirmedStage(stage);
                    setStageBasis(null);
                    setMotionStageBasis(routeShown(motionLead, choice)?.reading ?? null);
                    lastConfirmedRef.current = { caseId: savedCaseId() || masterCaseIdRef.current, stage };
                    const id = savedCaseId();
                    if (id) void saveConfirmedStage(id, stage);
                  }
                }}
              />
            ) : null}
            {stageQuestionWaits(motionLead, motionChoice, confirmedStage) ? null : (
            <StageConfirmation
              suggestedStage={detectedStage}
              pathway={courtPath === "family" ? "family" : courtPath === "civil" ? "civil" : "small-claims"}
              confirmedStage={confirmedStage}
              basis={
                stageBasis && stageBasis.stage === confirmedStage
                  ? stageBasis.because
                  : motionStageBasis && confirmedStage === "motion"
                    ? `Yes: ${motionStageBasis}`
                    : null
              }
              onConfirm={(stage) => {
                setConfirmedStage(stage);
                setStageBasis(null);
                setMotionStageBasis(null);
                lastConfirmedRef.current = { caseId: savedCaseId() || masterCaseIdRef.current, stage };
                // Recorded on the case so the case page shows the same stage.
                const id = savedCaseId();
                if (id) void saveConfirmedStage(id, stage);
              }}
            />
            )}

            {/* Civil and family: the stage's written overview first, then the exact step with its deadlines and rules. */}
            {/* The stage overview (NextStepsCard) repeated what the step answer
                below says, for civil and family (page review, 2026-10-06). */}
            {confirmedStage ? (
              <StageAnswerPanel
                courtPath={courtPath}
                confirmedStage={confirmedStage}
                responding={respondingSide}
                caseId={savedCaseId()}
                initialStepId={savedPosition.stepId}
                initialDateAnswers={savedPosition.dateAnswers}
                initialService={savedPosition.service}
                onSaved={(saved) =>
                  setPositionThisVisit((current) => ({
                    stepId: saved.stepId !== undefined ? saved.stepId : current.stepId,
                    dateAnswers: saved.dateAnswers ? { ...(current.dateAnswers ?? {}), ...saved.dateAnswers } : current.dateAnswers,
                    service: saved.service ? { ...(current.service ?? {}), ...saved.service } : current.service,
                  }))
                }
                storyHints={storyHintsForDates(storyWithTimeline(userStory(caseData), caseData?.timeline))}
                storyText={[userStory(caseData), caseData?.goal, caseData?.urgent].filter(Boolean).join("\n")}
                suggestedDates={guidedDates}
                userWords={userWordsOf(caseData)}
                recordedAmount={recordedAmountOf(caseData)}
                city={confirmedLocation?.city ?? ""}
                picture={casePicture}
                motionToChange={motionLead && motionChoice ? { answer: motionChoice, readingKind: motionLead.kind } : null}
                noticeStepId={suggestedNoticeStep({
                  claimTypeId:
                    draftClaimTypeId ||
                    (typeof asRecord(caseData?.extra).confirmedClaimTypeId === "string"
                      ? (asRecord(caseData?.extra).confirmedClaimTypeId as string)
                      : null),
                  story: userStory(caseData),
                  courtPath,
                })}
              />
            ) : null}
            {/* A support order already exists (motion to change): the table
                card comes after the step's guidance, folded (walkthrough run
                38500825561, MC: "it depends on where the other parent lives"
                led his results, before the motion-to-change step). */}
            {supportTableAfterStep &&
            (familyScope?.issues ?? (Array.isArray(asRecord(caseData?.extra).issues) ? (asRecord(caseData?.extra).issues as string[]) : [])).includes(
              "child-support",
            ) ? (
              <details data-testid="child-support-table-folded" className="rounded-2xl border border-[#d8e6df] bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[#2f7d67]">How the child support table works</summary>
                <ChildSupportTableCard />
              </details>
            ) : null}
            {confirmedStage && (
              <IntelligenceOverviewPanel analysis={analysis} intake={caseData} confirmedStage={confirmedStage} />
            )}
            {confirmedStage ? <EvidenceUploadCard caseId={savedCaseId()} /> : null}
            {confirmedStage ? <CaseReviewPanel caseId={savedCaseId()} /> : null}
            {/*
              The Statement of Claim stays gated, and not by oversight — see
              the note in the spec. It needs `draftInput`, a
              SmallClaimsIntelligenceInput built during the run, which no load
              path reconstructs.
            */}
            {/* Paused with official-form completion: see FORM_COMPLETION_PAUSED in phaseScope.ts. */}
            {/* Never for a defendant: a served person was shown "Preparing your
                Plaintiff's Claim (Form 7A)" (page review, 2026-10-06). */}
            {draftInput && !FORM_COMPLETION_PAUSED && !respondingSide ? (
              <StatementOfClaimSurface
                matchedClaimTypeId={draftClaimTypeId}
                initialElementStateMap={draftElementStateMap}
                mappedInput={draftInput}
                onStateMapChange={setDraftElementStateMap}
              />
            ) : null}
            {/* The step answer above already cites its rules; this repeated them
                once the stage was confirmed (page review, 2026-10-06). */}
            {/* With the motion-to-change route on top, the catalogue's
                temporary-motion card ("Family Rule 14 governs motions for
                temporary orders") is not shown (walkthrough MC, 2026-10-14). */}
            {/* While the reading is unanswered, the temporary-motion card is
                folded under its condition (walkthrough run 38525903567, FM);
                on "Not sure" or "No" it is shown as before. */}
            {!confirmedStage && temporaryMotionCardMode(motionLead, motionChoice) === "shown" ? (
              <ProcedureAuthorityDisplay
                caseId={savedCaseId()}
                courtArea={courtPath}
                procedureStage={getStageForPersistence(analysis, caseData)}
              />
            ) : !confirmedStage && temporaryMotionCardMode(motionLead, motionChoice) === "folded" ? (
              <details data-testid="temporary-motion-folded" className="rounded-2xl border border-[#d8e6df] bg-white p-4">
                <summary className="cursor-pointer text-sm font-semibold text-[#2f7d67]">{TEMPORARY_MOTION_FOLD_LABEL}</summary>
                <ProcedureAuthorityDisplay
                  caseId={savedCaseId()}
                  courtArea={courtPath}
                  procedureStage={getStageForPersistence(analysis, caseData)}
                />
              </details>
            ) : null}
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
              {motionToChangeMover && !originatingDocumentFiled && motionToChangeStart ? (
                // The moving party's own starting document (walkthrough run
                // 38525903567, FM): never "already filed" for a motion not yet
                // brought. No Form 15 draft exists yet, so none is offered.
                <div className="mt-3 text-sm leading-6 text-[#4d675f]" data-testid="motion-to-change-start">
                  <p>{MOTION_TO_CHANGE_START_SAY}</p>
                  {motionToChangeStart.map((rule) => (
                    <p key={rule.pinpoint} className="mt-1 text-xs">
                      <a href={officialUrl(rule)} target="_blank" rel="noreferrer" className="underline">
                        {sourceName(rule)}
                      </a>
                      , {rule.pinpoint}: &ldquo;{rule.quote}&rdquo;
                    </p>
                  ))}
                </div>
              ) : null}
              {respondingSide && !originatingDocumentFiled ? (
                <p className="mt-3 text-sm leading-6 text-[#4d675f]" data-testid="responding-side-no-originating-draft">
                  You are responding to a case the other side started, so a draft of the document
                  that starts a case is not offered here. A draft of your response is.
                </p>
              ) : null}
              {COURT_DOCUMENT_DRAFTING_ENABLED ? (
                <div className="mt-3">
                  <ScopePreviewNotice scope="formCompletion" />
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                {COURT_DOCUMENT_DRAFTING_ENABLED && !FORM_COMPLETION_PAUSED && courtPath === "small-claims" && savedCaseId() && offerOriginatingDraft ? (
                  <button type="button" onClick={createSmallClaimsClaimDraft} className="rounded-xl bg-[#16302b] px-5 py-3 text-sm font-semibold text-white">
                    Create Plaintiff&apos;s Claim draft (Form 7A)
                  </button>
                ) : null}
                {COURT_DOCUMENT_DRAFTING_ENABLED && !FORM_COMPLETION_PAUSED && courtPath === "civil" && savedCaseId() && offerOriginatingDraft ? (
                  <button type="button" onClick={() => createCourtAreaWorkingDraft("civil")} className="rounded-xl bg-[#16302b] px-5 py-3 text-sm font-semibold text-white">
                    Create Statement of Claim draft (Form 14A)
                  </button>
                ) : null}
                {COURT_DOCUMENT_DRAFTING_ENABLED && !FORM_COMPLETION_PAUSED && courtPath === "family" && savedCaseId() && offerOriginatingDraft ? (
                  <button type="button" onClick={() => createCourtAreaWorkingDraft("family")} className="rounded-xl bg-[#16302b] px-5 py-3 text-sm font-semibold text-white">
                    Create Family Application draft (Form 8)
                  </button>
                ) : null}
                {COURT_DOCUMENT_DRAFTING_ENABLED && !FORM_COMPLETION_PAUSED && offerRespondingDraft && savedCaseId() && respondingDocumentTitle(courtPath) ? (
                  <button type="button" data-testid="create-responding-draft" onClick={createRespondingDraft} className="rounded-xl bg-[#16302b] px-5 py-3 text-sm font-semibold text-white">
                    Create {respondingDocumentTitle(courtPath)?.replace(/^Draft /, "")} draft
                  </button>
                ) : null}
                {/*
                  The case page is where the case lives after intake: its stage
                  and next step, timeline, documents, forms, drafts and export
                  (2026-10-04). "Organize evidence" went to /evidence, which
                  read browser storage nothing writes and was always empty.
                */}
                <button type="button" data-testid="open-case-home" onClick={goToDashboardCase} disabled={savingMaster || !savedCaseId()} className="rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Open your case page</button>
                <button type="button" onClick={() => goToCaseSection("documents")} disabled={savingMaster || !savedCaseId()} className="rounded-xl border border-[#2f7d67] bg-white px-5 py-3 text-sm font-semibold text-[#2f7d67] disabled:opacity-50">Add documents and evidence</button>
                <button type="button" onClick={() => goToCaseSection("forms")} disabled={savingMaster || !savedCaseId()} className="rounded-xl border border-[#2f7d67] bg-white px-5 py-3 text-sm font-semibold text-[#2f7d67] disabled:opacity-50">Check official forms</button>
              </div>
              {confirmedStage && COURT_DOCUMENT_DRAFTING_ENABLED && !FORM_COMPLETION_PAUSED && offerRespondingDraft && savedCaseId() && respondingDocumentTitle(courtPath) ? (
                /* Page walkthrough, 2026-10-06: the draft button sat far below
                   the deadline, so a served person could start drafting without
                   seeing when their response is due. */
                <p className="mt-3 text-sm leading-6 text-[#4d675f]" data-testid="responding-draft-deadline-note">
                  Your response has a deadline. Before you draft, check it under{" "}
                  <a href="#work-out-your-dates" className="font-semibold text-[#2f7d67] underline">
                    Work out your dates
                  </a>{" "}
                  above: give the date you were served and it is counted for you.
                </p>
              ) : null}
              {!savingMaster && !savedCaseId() ? (
                <p className="mt-3 text-sm leading-6 text-[#4d675f]" data-testid="case-not-saved">
                  This case is not saved to an account, so it has no case page yet and will not be here
                  when you come back.{" "}
                  <Link href="/login" className="font-semibold text-[#2f7d67] underline">
                    Sign in or create an account
                  </Link>{" "}
                  before you start, and your case, its next steps, documents and drafts are kept for you.
                </p>
              ) : null}
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
              strategyData={
                /*
                 * `risks: analysis.intelligence.litigationRisks` was here until
                 * 2026-09-23. It is MODEL OUTPUT, and it was POSTed into the
                 * assistant route inside caseMemory.
                 *
                 * Independent review traced it and found no path that renders
                 * it: the orchestrator reads caseMemory only for courtArea. So
                 * it was a latent risk, not a live leak -- and exactly one
                 * getNestedValue(caseMemory, ["strategyData", "risks"]) away
                 * from becoming one, in a file whose job is reading nested
                 * values out of caseMemory.
                 *
                 * Removed rather than guarded. Data that is never sent cannot
                 * leak, and nothing has to stay correct for that to hold.
                 *
                 * nextBestActions stays: catalogue text since Step 2, not model
                 * output.
                 */
                { nextBestActions: analysis?.nextBestActions }
              }
              onMasterResultUpdate={handleChatMasterResultUpdate}
              onDashboardUpdate={handleChatDashboardUpdate}
              onRecommendedRoute={handleRecommendedRoute}
            />}
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
      <IntakeRecoveryBoundary><BuilderPageContent /></IntakeRecoveryBoundary>
    </Suspense>
  );
}

/**
 * What a person sees while their answers are analysed. The analysis researches
 * the law before it writes and can take a few minutes; a bare "Analyzing..."
 * read as frozen after 30 seconds (outside test, 2026-10-10). This says how
 * long to expect and counts the time, so it is plainly still working.
 */
function AnalyzingNote() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const minutes = Math.floor(seconds / 60);
  const elapsed = minutes > 0 ? `${minutes} min ${seconds % 60} s` : `${seconds} s`;
  return (
    <p data-testid="guided-analyzing" className="mt-4 text-sm font-semibold text-[#4d675f]" aria-live="polite">
      Working out your next steps from the court rules. This usually takes one to three minutes; please keep this page
      open. ({elapsed})
    </p>
  );
}
