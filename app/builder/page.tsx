"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import FamilyIntake, { type FamilyScope } from "./_components/FamilyIntake";
import { ChildSupportTableCard } from "./_components/ChildSupportTableCard";
import ChildSupportIntake from "./_components/ChildSupportIntake";
import SmallClaimsIntake, {
  requestSmallClaimsAnalysis,
} from "./_components/SmallClaimsIntake";
import GuidedSmallClaimsIntake, {
  type GuidedIntakeCompletionResult,
} from "./_components/GuidedSmallClaimsIntake";
import { mapGuidedIntakeToSmallClaimsInput } from "./_components/guidedIntakeToSmallClaimsInput";
import StatementOfClaimSurface from "./_components/StatementOfClaimSurface";
import { COURT_DOCUMENT_DRAFTING_ENABLED } from "@/src/lib/case-system/policy/courtDocumentDrafting";
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
import StageAnswerPanel from "./_components/StageAnswerPanel";
import NextStepsCard from "./_components/NextStepsCard";
import { userIsResponding } from "./_components/respondingSide";
import { readCasePosition } from "../../src/lib/case-system/casePosition";
import { newId, type CaseDraft } from "../../src/lib/case-system/drafts/caseDrafts";
import AiUseNotice from "../_components/AiUseNotice";
import PathwayUnavailable from "../_components/PathwayUnavailable";
import { FORM_COMPLETION_PAUSED, isPathwayAvailable, type KnownPathway } from "../../src/lib/content-library/phaseScope";
import FirstUseAcknowledgement from "../_components/FirstUseAcknowledgement";
import LegalInformationNotice from "../_components/LegalInformationNotice";

import { supabase } from "../../src/lib/supabase/client";
import { buildMasterCaseFromIntake } from "../../src/lib/case-system/masterCaseOrchestrator";
import { buildCaseContextStoragePayload } from "../../src/lib/case-system/caseContextEngine";
import { consumeGuestIntakeSession } from "../../src/lib/case-system/builderDraftStorage";
import { COURT_PATH_FINDER_KEY, SHARED_STORAGE_KEYS } from "../../src/lib/case-system/storage/intakeStorageKeys";
import { draftSmallClaimsPlaintiffClaim } from "../../src/lib/case-system/claimDraftEngine";

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
  const [triageState, setTriageState] = useState<FamilyTriageState>(emptyTriageState);
  // Issues and side from the family intake (or the saved case). Decides
  // whether the child-support draft fits this case at all.
  const [familyScope, setFamilyScope] = useState<FamilyScope | null>(null);
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

  const [confirmedLocation, setConfirmedLocation] = useState<{
    province: "Ontario";
    city: string;
  } | null>(null);
  const [homeStory, setHomeStory] = useState("");
  const [intakeProvince, setIntakeProvince] = useState("");
  const [intakeCity, setIntakeCity] = useState("");
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
  /**
   * What the gate is still waiting on, named in the order the fields appear.
   *
   * Derived rather than duplicated: the button's `disabled` and the message
   * shown to the user read the same list, so they cannot disagree. A button
   * disabled for a reason the message does not mention is the defect this
   * replaced.
   */
  const gateBlockers = [
    intakeProvince !== "Ontario" ? "a province or territory" : "",
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
  }, [initialPath, queryCaseId]);

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
  }, [queryCaseId]);

  useEffect(() => {
    let active = true;

    async function loadExistingCase() {
      if (!queryCaseId) return;

      // A case opens with ITS story or none -- never the previous case's.
      setHomeStory("");
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

      if (storedProvince === "Ontario" && storedCity) {
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

      // No browser copy of the case is kept: it is saved to the account below.

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

        /*
         * KEEP WHAT THE USER MADE ON THE CASE PAGE. master_result is rebuilt
         * whole here, and two of its keys are written separately, possibly
         * after this page loaded: `position` (the stage they confirmed, the step
         * they picked, the dates they gave; /api/cases/position) and `drafts`
         * (their working drafts; /api/cases/drafts). Read them now, not from the
         * copy loaded at mount, or a re-save would quietly erase work done since.
         */
        const { data: userOwnedRow } = await supabase
          .from("cases")
          .select("master_result")
          .eq("id", activeId)
          .maybeSingle();
        const storedMaster = asRecord(userOwnedRow?.master_result);
        const userOwned = Object.fromEntries(
          (["position", "drafts"] as const)
            .filter((key) => storedMaster[key] !== undefined && storedMaster[key] !== null)
            .map((key) => [key, storedMaster[key]]),
        );

        const { error } = await supabase
          .from("cases")
          .update({
            title: record.title,
            court_path: courtPath,
            status: "active",
            current_stage: stage,
            master_result: {
              ...masterPayload,
              derivedFrom,
              intakeFacts,
              familyStatus: triageState,
              ...userOwned,
            },
            updated_at: now,
          })
          .eq("id", activeId);

        if (error) {
          setSaveError(error.message);
          setSavingMaster(false);
          return;
        }
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
          // 2026-09-28. The claim type the USER confirmed, or null when none
          // was. The overview reads this instead of re-matching the story, so
          // its cards follow the user's confirmation rather than a separate
          // keyword match that can disagree with it.
          confirmedClaimTypeId: result.matchedClaimType?.claimTypeId ?? null,
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
    // A fresh analysis is a fresh stage suggestion, so it is re-confirmed.
    setConfirmedStage(null);
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
  const respondingSide = userIsResponding({
    confirmedStage,
    caseData,
    intakeFacts: draftIntakeFacts,
  });
  // The document that STARTS a case is offered only to the side that starts it.
  const offerOriginatingDraft = !originatingDocumentFiled && !respondingSide;

  function getActiveCaseId() {
    return masterCaseId || queryCaseId || null;
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
    const id = getActiveCaseId();
    return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
  }

  const savedPosition = readCasePosition(existingMasterResult, courtPath);

  async function saveConfirmedStage(caseId: string, stage: UniversalStage) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      await fetch("/api/cases/position", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ caseId, confirmedStage: stage }),
      });
    } catch {
      // The stage still applies on this page; the case page will ask again.
    }
  }

  function createSmallClaimsClaimDraft() {
    if (FORM_COMPLETION_PAUSED) return; // paused: see phaseScope.ts
    const caseId = savedCaseId();
    if (!caseData || !caseId || courtPath !== "small-claims") {
      setSaveError("Save the selected Small Claims case before creating a working claim draft.");
      return;
    }

    const claim = draftSmallClaimsPlaintiffClaim(caseData);
    const part = (heading: string, lines: string[]) => ({
      id: newId("part"),
      heading,
      text: lines.join("\n\n"),
      reviewed: false,
    });
    const stamp = new Date().toISOString();
    void saveDraftAndOpen(caseId, {
      id: newId("draft"),
      title: "Draft Plaintiff’s Claim (Form 7A)",
      kind: "starting-document",
      createdAt: stamp,
      updatedAt: stamp,
      sections: [
        part("Parties", claim.partySection),
        part("What you are asking for", claim.claimOverview),
        part("Facts", claim.numberedClaimFacts),
        part("Amount claimed", claim.damagesSection),
        part("Evidence to review", claim.evidenceSection),
      ],
    });
  }

  function createCourtAreaWorkingDraft(title: string, factsHeading: string) {
    if (FORM_COMPLETION_PAUSED) return; // paused: see phaseScope.ts
    const caseId = savedCaseId();
    if (!caseData || !caseId) {
      setSaveError("Save the selected case before creating a working draft.");
      return;
    }

    const extra = asRecord(caseData.extra);
    const amount = String(extra.amountClaimed || extra.damagesBreakdown || "").trim();
    const part = (heading: string, lines: string[]) => ({
      id: newId("part"),
      heading,
      text: lines.join("\n\n"),
      reviewed: false,
    });
    const stamp = new Date().toISOString();
    void saveDraftAndOpen(caseId, {
      id: newId("draft"),
      title,
      kind: "starting-document",
      createdAt: stamp,
      updatedAt: stamp,
      sections: [
        part("Parties", [`Applicant/Plaintiff: ${caseData.yourName || "Not entered"}`, `Other party: ${caseData.otherParty || "Not entered"}`]),
        part(factsHeading, [caseData.facts || "No facts entered yet."]),
        part("Requested outcome", [caseData.goal || "No requested outcome entered yet."]),
        part("Amount and timeline", [amount ? `Amount entered: ${amount}` : "No amount entered.", caseData.timeline || "No timeline entered yet."]),
        part("Evidence to review", [caseData.evidence || "No evidence description entered yet."]),
      ],
    });
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
      const response = await fetch("/api/cases/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ caseId, draft }),
      });
      if (!response.ok) {
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
        */}
        {courtPath === "family" && confirmedLocation && !loadingExistingCase && !caseLoadError && (
          <FamilyStatusTriage state={triageState} onChange={setTriageState} />
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
                      setIntakeProvince(confirmedLocation.province);
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
                onScopeChange={setFamilyScope}
                location={confirmedLocation}
                initialStory={homeStory}
              />
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
        {courtPath === "family" && confirmedLocation && !loadingExistingCase && !caseLoadError && (() => {
          const savedExtra = (caseData as (StoredCaseData & { extra?: Record<string, unknown> }) | null)?.extra;
          const issues: string[] =
            familyScope?.issues ?? (Array.isArray(savedExtra?.issues) ? (savedExtra.issues as string[]) : []);
          const role = familyScope?.role ?? (typeof savedExtra?.yourRole === "string" ? savedExtra.yourRole : "not-sure");
          if (!issues.includes("child-support")) return null;
          return (
            <div className="mt-8" data-testid="child-support-surfaces">
              {role !== "respondent" && <ChildSupportIntake />}
              <ChildSupportTableCard />
            </div>
          );
        })()}

        {analysis && !loadingExistingCase && !caseLoadError && !canonicalIntakeSaved && (
          <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm" aria-live="polite">
            <h2 className="text-xl font-bold text-[#10231f]">Saving core intake</h2>
            <p className="mt-2 text-sm leading-6 text-[#4d675f]">
              CourtSimplified is saving this area&apos;s structured intake to the canonical case record before opening guided assistant.
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
        {savedCaseId() && !loadingExistingCase && !caseLoadError ? (
          <div className="mt-8">
            <EventCandidateSurface caseId={savedCaseId() as string} />
          </div>
        ) : null}

        {analysis && canonicalIntakeSaved && (
          <section ref={completedOverviewRef} className="mt-8 space-y-6" data-testid="completed-case-overview" tabIndex={-1}>
            {/*
              SUGGEST THEN CONFIRM, BEFORE ANY NEXT STEPS RENDER.
              The stage is detected by a model from what the user wrote. It
              decides which next steps they are shown, so the user confirms it
              or picks another before the overview appears. No next-step
              content renders until they have.
            */}
            <StageConfirmation
              suggestedStage={detectedStage}
              pathway={courtPath === "family" ? "family" : courtPath === "civil" ? "civil" : "small-claims"}
              confirmedStage={confirmedStage}
              onConfirm={(stage) => {
                setConfirmedStage(stage);
                // Recorded on the case so the case page shows the same stage.
                const id = savedCaseId();
                if (id) void saveConfirmedStage(id, stage);
              }}
            />

            {/* Civil and family join once their reviewed answers are published. */}
            {confirmedStage && courtPath === "small-claims" ? (
              <StageAnswerPanel
                courtPath={courtPath}
                confirmedStage={confirmedStage}
                responding={respondingSide}
                caseId={savedCaseId()}
                initialStepId={savedPosition.stepId}
                initialDateAnswers={savedPosition.dateAnswers}
              />
            ) : null}
            {confirmedStage && (courtPath === "family" || courtPath === "civil") ? (
              <NextStepsCard pathway={courtPath} stage={confirmedStage} />
            ) : null}
            {confirmedStage && (
              <IntelligenceOverviewPanel analysis={analysis} intake={caseData} />
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
            {draftInput && !FORM_COMPLETION_PAUSED ? (
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
              {respondingSide && !originatingDocumentFiled ? (
                <p className="mt-3 text-sm leading-6 text-[#4d675f]" data-testid="responding-side-no-originating-draft">
                  You are responding to a case the other side started, so a draft of the document
                  that starts a case is not offered here.
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
                  <button type="button" onClick={() => createCourtAreaWorkingDraft("Draft Statement of Claim (Form 14A)", "Material facts")} className="rounded-xl bg-[#16302b] px-5 py-3 text-sm font-semibold text-white">
                    Create Statement of Claim draft (Form 14A)
                  </button>
                ) : null}
                {COURT_DOCUMENT_DRAFTING_ENABLED && !FORM_COMPLETION_PAUSED && courtPath === "family" && savedCaseId() && offerOriginatingDraft ? (
                  <button type="button" onClick={() => createCourtAreaWorkingDraft("Draft Family Application (Form 8)", "Facts for review")} className="rounded-xl bg-[#16302b] px-5 py-3 text-sm font-semibold text-white">
                    Create Family Application draft (Form 8)
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
      <BuilderPageContent />
    </Suspense>
  );
}
