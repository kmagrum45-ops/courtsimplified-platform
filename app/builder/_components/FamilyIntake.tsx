"use client";

import { usePrepareCaseGuidance, intakeGuidanceHeaders, useIntakeRecovery, useIntakeState, useStory, useContinueHandler, useBeforeIntakeAI, useValidateIntakeResponse, useSituation } from "../../_components/IntakeRecovery";
import { situationAnswers, stageWords } from "../../../src/lib/case-system/situation/situation";
import { formatForCourt } from "../../../src/lib/case-system/dates";
import AnalysisProgress, { ANALYSIS_TIMEOUT_MS } from "./AnalysisProgress";
import StoryChangedNotice, { useStoryAnswersOutdated } from "../../_components/StoryChangedNotice";
import ReviewNeededNotice from "../../_components/ReviewNeededNotice";
import StoryEditor from "./StoryEditor";
import SignInForSafetyCheck from "./SignInForSafetyCheck";

import { IntakeRequest } from "../../_components/intakeRequest";

import { buildFamilyAnalysis } from "./familyAnalysis";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AnalysisResult,
  StoredCaseData,
  UniversalStage,
  cleanList,
  getStageLabel,
} from "@/app/builder/_components/builderTypes";
import type { FamilyMasterCaseInput } from "@/src/lib/case-system/familyMasterCaseEngine";
import type { FamilyCanonicalIntakeResult } from "@/src/lib/case-system/orchestration/familyIntakeCanonicalAdapter";
import { supabase } from "@/src/lib/supabase/client";
import { userStory } from "@/src/lib/case-system/userStory";
import {
  ensureSafetyChecked,
  safetyConcernFromAnalysis,
  type ClientSafetyClassification,
} from "@/src/lib/case-system/intake/clientSafetyCheck";
import LegalAdviceDeflection from "../../_components/LegalAdviceDeflection";
import {
  assignReferences,
  describeFileType,
  evidenceFileId,
  readSelectedFiles,
} from "../../../src/lib/case-system/evidence/evidenceReference";
import EvidenceFileNotice from "../../_components/EvidenceFileNotice";
import TidyWordingReview from "./TidyWordingReview";
import GuidedFormChat, { type GuidedValues } from "./GuidedFormChat";
import { FAMILY_FILED_OPTIONS, FAMILY_ISSUE_OPTIONS, familyGuidedFields, familyTimelineAnswer, familyTimelineValues } from "./guidedFields";
import { chatClosingFor } from "./motionToChange";
import { existingFamilyOrder, respondingInFamilyStory } from "./FamilyStatusTriage";
import type { PersonAnswers } from "./stageFromAnswers";
import { SourcedQuestionsCard, useSourcedQuestions, withSourcedAnswerList, type SourcedAnswer } from "./SourcedQuestions";
import {
  type NarrativePrefillFact,
} from "@/src/lib/case-system/intelligence/narrativePrefill";

type FiledDocument =
  | "application"
  | "answer"
  | "financial-statement"
  | "affidavit"
  | "motion-materials"
  | "conference-brief"
  | "order-agreement"
  | "nothing"
  | "not-sure";

export type FamilyIssue =
  | "decision-making-responsibility"
  | "parenting-time"
  | "child-support"
  | "spousal-support"
  | "divorce"
  | "sale-of-home"
  | "property-division"
  | "matrimonial-home"
  | "safety-concerns"
  | "relocation"
  | "disclosure"
  | "enforcement"
  | "adoption"
  | "other";

type EvidenceFile = {
  id: string;
  /**
   * A NEUTRAL HANDLE, NEVER THE FILE NAME. "Document 1", "Document 2".
   *
   * The file name used to live here and was sent to OpenAI as part of the
   * case description. A file name is a disclosure nobody decides to make:
   * "restraining-order-application-2025.pdf" and "hiv-results-march.pdf"
   * both say something the user never chose to say, because nobody thinks
   * of a file name as content.
   *
   * The name is not scrubbed on the way out; it is never captured. There is
   * no field on this type that can hold one, which is what makes
   * verifyNoFilenamesToModel able to assert the property rather than test a
   * sample of payloads.
   */
  reference: string;
  size: number;
  type: string;
  lastModified: number;
  title: string;
  description: string;
  category: string;
  evidenceDate: string;
  source: string;
  relevance: string;
};

export type FamilyRole = "applicant" | "respondent" | "not-sure";

/**
 * What the rest of the builder needs to know about this case before analysis:
 * which issues the user chose, and which side they are on. Lifted to the page
 * so surfaces outside this component (the child-support draft) show only for
 * the cases they fit. Added 2026-10-04: the child-support Form 8 draft was
 * shown on every family case, including a served father's custody case.
 */
export type FamilyScope = {
  issues: FamilyIssue[];
  role: FamilyRole;
  /**
   * What the person has told the intake so far, for screens that ask about
   * the same things (the child-support builder prefills from it as a
   * suggestion; walkthrough 2026-10-13, R3).
   */
  recorded?: FamilyRecorded;
};

export type FamilyRecorded = {
  yourName: string;
  otherParty: string;
  childrenInfo: string;
  currentLivingSituation: string;
  evidence: string;
  story: string;
};

type Props = {
  onComplete: (analysis: AnalysisResult, payload: StoredCaseData) => void;
  /** Follow-up answers this case already holds (intakeData.extra.sourcedAnswers; Step 2A). */
  earlierSourcedAnswers?: SourcedAnswer[];
  /**
   * The saved case's intake (master_result.intakeData), when the person comes
   * back through "Update your story". The form starts from what they entered
   * instead of opening blank (build order Step 2A, 2026-10-12; civil and
   * Small Claims already refilled, family did not).
   */
  storedIntake?: unknown;
  onScopeChange?: (scope: FamilyScope) => void;
  /**
   * Called when the person finishes the questions and presses Continue (the
   * one-at-a-time chat's or the whole form's). The page waits for it before
   * asking anything else (walkthrough 2026-10-13, V1).
   */
  onQuestionsDone?: () => void;
  location: { province: "Ontario"; city: string };
  initialStory: string;
};

type TextareaField = {
  label: string;
  value: string;
  setter: React.Dispatch<React.SetStateAction<string>>;
  placeholder: string;
};

const filedOptions = FAMILY_FILED_OPTIONS as { value: FiledDocument; label: string }[];

const issueOptions = FAMILY_ISSUE_OPTIONS as { value: FamilyIssue; label: string }[];

const evidenceCategoryOptions = [
  "Parenting / decision-making",
  "Parenting time / access",
  "Child support",
  "Spousal support",
  "Financial disclosure",
  "Property / home",
  "Safety / urgency",
  "School / child records",
  "Messages / communication",
  "Court document",
  "Agreement / order",
  "Other",
];

function toggleArrayValue<T extends string>(items: T[], value: T): T[] {
  if (value === "nothing") return items.includes(value) ? [] : [value];
  if (value === "not-sure") return items.includes(value) ? [] : [value];

  const cleaned = items.filter((item) => item !== "nothing" && item !== "not-sure");

  return cleaned.includes(value)
    ? cleaned.filter((item) => item !== value)
    : [...cleaned, value];
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function labelForFiledDocument(value: FiledDocument): string {
  return filedOptions.find((option) => option.value === value)?.label || value;
}

function labelForIssue(value: FamilyIssue): string {
  return issueOptions.find((option) => option.value === value)?.label || value;
}


function buildCompactFamilyPayload(
  payload: StoredCaseData,
): Record<string, unknown> {
  const source = payload as StoredCaseData & Record<string, unknown>;
  const extra =
    source.extra && typeof source.extra === "object"
      ? { ...(source.extra as Record<string, unknown>) }
      : {};

  delete extra.uploadedEvidenceFiles;

  return {
    courtPath: source.courtPath,
    pathLabel: source.pathLabel,
    caseStage: source.caseStage,
    yourName: source.yourName,
    otherParty: source.otherParty,
    facts: source.facts,
    timeline: source.timeline,
    evidence: source.evidence,
    missingEvidence: source.missingEvidence,
    goal: source.goal,
    urgent: source.urgent,
    extra,
  };
}


const NO_EARLIER_ANSWERS: SourcedAnswer[] = [];

/** What a saved family case holds, as this form's starting values (Step 2A). */
function savedFamilyValues(stored: unknown) {
  const obj = (value: unknown): Record<string, unknown> =>
    value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const data = obj(stored);
  if (data.courtPath !== "family") return null;
  const extra = obj(data.extra);
  const str = (value: unknown) => (typeof value === "string" ? value : "");
  const list = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
  return {
    caseStage: str(data.caseStage),
    yourRole: str(extra.yourRole),
    filedDocuments: list(extra.filedDocuments).filter((value): value is FiledDocument => filedOptions.some((option) => option.value === value)),
    issues: list(extra.issues).filter((value): value is FamilyIssue => issueOptions.some((option) => option.value === value)),
    yourName: str(data.yourName),
    otherParty: str(data.otherParty),
    // The person's own words (extra.story), not the labelled record in `facts`.
    facts: userStory(data as Parameters<typeof userStory>[0]),
    timeline: str(data.timeline),
    evidence: str(data.evidence),
    missingEvidence: str(data.missingEvidence),
    goal: str(data.goal),
    urgent: str(data.urgent),
    childrenInfo: str(extra.childrenInfo),
    currentLivingSituation: str(extra.currentLivingSituation),
    pastLivingHistory: str(extra.pastLivingHistory),
    safetyConcerns: str(extra.safetyConcerns),
    propertyHomeDetails: str(extra.propertyHomeDetails),
    upcomingCourtDate: str(extra.upcomingCourtDate),
    adoptionDetails: str(extra.adoptionDetails),
  };
}

export default function FamilyIntake({ onComplete, onScopeChange, onQuestionsDone, location, initialStory, earlierSourcedAnswers, storedIntake }: Props) {
  // Read once: what the saved case holds wins over a fresh story hand-off.
  const [saved] = useState(() => savedFamilyValues(storedIntake));
  // One question at a time by default (Step 2C, 2026-10-12); the whole form
  // is one click away and holds exactly the same answers.
  const [mode, setMode] = useIntakeState<"chat" | "form">("family", "mode", "chat");
  // No values handed over from the follow-up chat any more: a second copy of the
  // story outside the version record (Part 3, stale-story audit item 4).
  const initialValues: Record<string, string | string[]> = {};
  const [storedCaseStage, setCaseStage] = useIntakeState<UniversalStage>("family", "caseStage",
    () => (saved?.caseStage || initialValues.caseStage ? (saved?.caseStage || initialValues.caseStage) as UniversalStage : "not-sure"),
  );
  // Which side the user is on, ASKED — never guessed from keywords. A role read
  // from the story ("I was served") only pre-selects the answer the user sees.
  const [storedYourRole, setYourRole] = useIntakeState<FamilyRole>("family", "yourRole", () => {
    const prefilled = String(saved?.yourRole || initialValues.yourRole || "").toLowerCase();
    if (prefilled.includes("respondent")) return "respondent";
    if (prefilled.includes("applicant")) return "applicant";
    return "not-sure";
  });
  const [storedFiledDocuments, setFiledDocuments] = useIntakeState<FiledDocument[]>("family", "filedDocuments",
    () => (saved?.filedDocuments.length ? saved.filedDocuments : Array.isArray(initialValues.documentStatus) ? ["application"] : []),
  );
  // The situation answers, given before the story (situation.ts), answer the side, what
  // was filed and the day they were served: read from there, never asked again (step 2).
  const [situation] = useSituation();
  const fromStart = useMemo(() => situationAnswers("family", situation), [situation]);
  const yourRole: FamilyRole = (fromStart.role as FamilyRole | undefined) ?? storedYourRole;
  const ruledOut = useMemo(() => new Set(fromStart.excludeDocuments ?? []), [fromStart.excludeDocuments]);
  const filedDocuments: FiledDocument[] = useMemo(() => (fromStart.documents as FiledDocument[] | undefined) ?? storedFiledDocuments.filter((item) => !ruledOut.has(item)), [fromStart.documents, storedFiledDocuments, ruledOut]);
  // A stage the situation answers settle; for a case already going, never "starting".
  const caseStage: UniversalStage = fromStart.caseStage ?? (situation.where === "going" && storedCaseStage === "starting-case" ? "already-started" : storedCaseStage);
  // "Nothing filed yet" is not offered once papers exist (they were served, or something was filed).
  const filedChoices = useMemo(() => filedOptions.filter((option) => !ruledOut.has(option.value)), [ruledOut]);
  const [issues, setIssues] = useIntakeState<FamilyIssue[]>("family", "issues", () => saved?.issues ?? []);

  const [yourName, setYourName] = useIntakeState("family", "yourName", () => saved?.yourName || String(initialValues.yourName || ""));
  const province = location.province;
  const city = location.city;
  const [otherParty, setOtherParty] = useIntakeState("family", "otherParty", () => saved?.otherParty || String(initialValues.otherParty || ""));
  const [childrenInfo, setChildrenInfo] = useIntakeState("family", "childrenInfo", () => saved?.childrenInfo ?? "");
  const [currentLivingSituation, setCurrentLivingSituation] = useIntakeState("family", "currentLivingSituation", () => saved?.currentLivingSituation ?? "");
  const [pastLivingHistory, setPastLivingHistory] = useIntakeState("family", "pastLivingHistory", () => saved?.pastLivingHistory ?? "");
  // The one copy of the story (intakeStory.ts). A story read from a saved case fills an empty one once.
  const [facts, setFacts] = useStory();
  const storySeeded = useRef(false);
  useEffect(() => {
    if (storySeeded.current) return;
    storySeeded.current = true;
    const legacy = saved?.facts || String(initialValues.facts || initialStory || "");
    if (!facts.trim() && legacy.trim()) setFacts(legacy);
  }, [facts, initialStory, initialValues.facts, saved?.facts, setFacts]);
  const [timeline, setTimeline] = useIntakeState("family", "timeline", () => saved?.timeline || String(initialValues.timeline || initialValues.enforcementDetails || ""));
  const [evidence, setEvidence] = useIntakeState("family", "evidence", () => saved?.evidence || String(initialValues.evidence || ""));
  const [missingEvidence, setMissingEvidence] = useIntakeState("family", "missingEvidence", () => saved?.missingEvidence ?? "");
  const [goal, setGoal] = useIntakeState("family", "goal", () => saved?.goal || String(initialValues.goal || ""));
  const [urgent, setUrgent] = useIntakeState("family", "urgent", () => saved?.urgent || String(initialValues.urgent || ""));
  const [safetyConcerns, setSafetyConcerns] = useIntakeState("family", "safetyConcerns", () => saved?.safetyConcerns ?? "");
  const [propertyHomeDetails, setPropertyHomeDetails] = useIntakeState("family", "propertyHomeDetails", () => saved?.propertyHomeDetails || String(initialValues.addressDetails || initialValues.existingOrderDetails || ""));
  const [upcomingCourtDate, setUpcomingCourtDate] = useIntakeState("family", "upcomingCourtDate", () => saved?.upcomingCourtDate ?? "");
  const [adoptionDetails, setAdoptionDetails] = useIntakeState("family", "adoptionDetails", () => saved?.adoptionDetails ?? "");

  // Issues, side and what the person has written, reported after a short
  // pause so the whole page does not re-render on every keystroke.
  React.useEffect(() => {
    const recorded = { yourName, otherParty, childrenInfo, currentLivingSituation, evidence, story: facts };
    const timer = setTimeout(() => onScopeChange?.({ issues, role: yourRole, recorded }), 300);
    return () => clearTimeout(timer);
  }, [issues, yourRole, onScopeChange, yourName, otherParty, childrenInfo, currentLivingSituation, evidence, facts]);

  const [uploadedEvidenceFiles, setUploadedEvidenceFiles] =
    useIntakeState<EvidenceFile[]>("family", "uploadedEvidenceFiles", []);
  const [storageWarning, setStorageWarning] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  // Answers based on an earlier version of the story: no next step until the questions start again (storyBasis.ts).
  const storyChanged = useStoryAnswersOutdated();
  // Family: a safety check that could not run puts the safety resources before the guidance (2026-10-18).
  const [, setSafetyUnavailable] = useIntakeState("safety", "checkUnavailable", false, true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisRequest = useRef(new IntakeRequest());
  const requestScope = JSON.stringify([caseStage, yourRole, filedDocuments, issues, yourName, otherParty, childrenInfo, currentLivingSituation, pastLivingHistory, facts, timeline, evidence, missingEvidence, goal, urgent, safetyConcerns, propertyHomeDetails, upcomingCourtDate, adoptionDetails, uploadedEvidenceFiles]);
  useEffect(() => {
    const request = analysisRequest.current;
    return () => request.cancel();
  }, [requestScope]);
  /**
   * Result of the safety pass over `facts`. Drives the resource panel below.
   * Never halts this path — see the comment in handleAnalyze.
   */
  const [safetyClassification, setSafetyClassification] =
    useState<ClientSafetyClassification>("clear");
  const [safetyMessage, setSafetyMessage] = useState("");
  /** Step 6d: set when the safety pass reports the user asked for legal advice. */
  const [asksForAdvice, setAsksForAdvice] = useState(false);
  const [extractedFacts] = useState<NarrativePrefillFact[]>(
    () => [],
  );
  const submissionInFlight = useRef(false);
  /*
   * The side and the filed documents the PERSON set, by answering the chat or
   * choosing on the form -- never a value prefilled from the story or a saved
   * case they have not touched (stageFromAnswers.ts, 2026-10-14). Only these
   * can stand as their confirmation of the stage.
   */
  const recovery = useIntakeRecovery();
  const beforeIntakeAI = useBeforeIntakeAI();
  const prepareCaseGuidance = usePrepareCaseGuidance();
  const validateIntakeResponse = useValidateIntakeResponse();
  const [storedPersonSet] = useIntakeState<Set<"yourRole">>("family", "personSet", new Set());
  const personSet = useRef(new Set(storedPersonSet));
  // Each document item the person chose or cleared themselves; a chat
  // answer sets the whole list. The list counts as theirs only when every
  // item on it is one they chose (review 2026-10-14).
  const [storedPersonDocuments] = useIntakeState<Set<string>>("family", "personDocuments", new Set());
  const personDocuments = useRef(new Set(storedPersonDocuments));
  // A side or filing answered in the review panel is the person's own answer too: taken in
  // when it arrives, before the line below writes these back (#470 re-test: "Nothing filed
  // yet" answered there settled no stage). The panel sets the whole filing list, like a chat answer.
  useEffect(() => { for (const item of storedPersonSet) personSet.current.add(item); }, [storedPersonSet]);
  useEffect(() => { personDocuments.current = new Set(storedPersonDocuments); }, [storedPersonDocuments]);
  useEffect(() => { recovery?.put("family", "personSet", [...personSet.current], false); recovery?.put("family", "personDocuments", [...personDocuments.current], false); });

  const textareaFields: TextareaField[] = useMemo(
    () => [
      {
        label: "Children / parenting details",
        value: childrenInfo,
        setter: setChildrenInfo,
        placeholder:
          "Children’s names, ages, school/daycare, health needs, current parenting schedule, decision-making issues, and who has been doing day-to-day care.",
      },
      {
        label: "Current living situation",
        value: currentLivingSituation,
        setter: setCurrentLivingSituation,
        placeholder:
          "Where everyone lives now, who the children live with, current exchanges, transportation, distance, and any stability concerns.",
      },
      {
        label: "Past caregiving / living history",
        value: pastLivingHistory,
        setter: setPastLivingHistory,
        placeholder:
          "Who handled school, medical appointments, routines, meals, homework, activities, appointments, finances, and caregiving over time.",
      },
      {
        label: "Timeline",
        value: timeline,
        setter: setTimeline,
        placeholder:
          "Important dates in order: separation, moves, agreements, court dates, incidents, missed visits, support changes, disclosure requests, police involvement.",
      },
      {
        label: "Evidence you have",
        value: evidence,
        setter: setEvidence,
        placeholder:
          "Messages, emails, photos, parenting calendars, school records, medical records, financial records, bank records, tax documents, agreements, orders, police records.",
      },
      {
        label: "Evidence still missing",
        value: missingEvidence,
        setter: setMissingEvidence,
        placeholder:
          "Records, witnesses, disclosure, income documents, school records, police records, medical records, messages, or financial documents still needed.",
      },
      {
        label: "Safety or urgent concerns",
        value: safetyConcerns,
        setter: setSafetyConcerns,
        placeholder:
          "Threats, violence, coercive control, police involvement, child-safety concerns, withheld children, urgent financial issues, risk of relocation, or immediate harm.",
      },
      {
        label: "Property / home / financial disclosure details",
        value: propertyHomeDetails,
        setter: setPropertyHomeDetails,
        placeholder:
          "Matrimonial home, possession, debts, bank accounts, pensions, vehicles, business interests, hidden assets, missing disclosure, or equalization/property concerns.",
      },
      {
        label: "What do you want the court to order?",
        value: goal,
        setter: setGoal,
        placeholder:
          "Exact parenting schedule, decision-making terms, support, disclosure, property order, exclusive possession, urgent order, enforcement, costs, or other relief.",
      },
      {
        label: "Anything urgent or deadline-related?",
        value: urgent,
        setter: setUrgent,
        placeholder:
          "Next court date, deadline, missed service, urgent motion need, safety issue, missed support, withheld child, eviction/home issue, or financial emergency.",
      },
    ],
    [childrenInfo, setChildrenInfo, currentLivingSituation, setCurrentLivingSituation, pastLivingHistory, setPastLivingHistory, timeline, setTimeline, evidence, setEvidence, missingEvidence, setMissingEvidence, safetyConcerns, setSafetyConcerns, propertyHomeDetails, setPropertyHomeDetails, goal, setGoal, urgent, setUrgent],
  );

  function handleEvidenceFilesSelected(files: FileList | null) {
    if (!files) return;

    /*
     * The FileList is read by evidenceReference.readSelectedFiles, which
     * touches size, type and lastModified and never `name`. See that module
     * for why the name is not captured rather than scrubbed later.
     *
     * Numbering happens inside the state updater because "Document N"
     * continues from what is already listed, and only the updater can see
     * that without racing another selection.
     */
    const chosen = readSelectedFiles(files);

    setUploadedEvidenceFiles((current) => {
      const nextFiles: EvidenceFile[] = assignReferences(
        current.map((file) => file.reference),
        chosen.filter(
          (facts) => !new Set(current.map((file) => file.id)).has(evidenceFileId(facts)),
        ),
      ).map((file) => ({
        ...file,
        title: "",
        description: "",
        category: "",
        evidenceDate: "",
        source: "",
        relevance: "",
      }));

      const existingIds = new Set(current.map((file) => file.id));
      const uniqueNewFiles = nextFiles.filter((file) => !existingIds.has(file.id));
      return [...current, ...uniqueNewFiles];
    });
  }

  function updateEvidenceFile(
    fileId: string,
    field: keyof Pick<
      EvidenceFile,
      "title" | "description" | "category" | "evidenceDate" | "source" | "relevance"
    >,
    value: string,
  ) {
    setUploadedEvidenceFiles((current) =>
      current.map((file) =>
        file.id === fileId ? { ...file, [field]: value } : file,
      ),
    );
  }

  function removeEvidenceFile(fileId: string) {
    setUploadedEvidenceFiles((current) =>
      current.filter((file) => file.id !== fileId),
    );
  }

  function buildNarrative(): string {
    return cleanList([
      "Court path: Family",
      `Stage: ${getStageLabel(caseStage)}`,
      yourName ? `Your full legal name: ${yourName}` : "",
      otherParty ? `Other party: ${otherParty}` : "",
      filedDocuments.length
        ? `Existing family documents: ${filedDocuments
            .map(labelForFiledDocument)
            .join("; ")}`
        : "",
      issues.length
        ? `Family issue signals selected by user: ${issues
            .map(labelForIssue)
            .join("; ")}`
        : "",
      childrenInfo ? `Children and parenting details: ${childrenInfo}` : "",
      currentLivingSituation
        ? `Current living situation: ${currentLivingSituation}`
        : "",
      pastLivingHistory
        ? `Past caregiving and living history: ${pastLivingHistory}`
        : "",
      facts ? `Case story: ${facts}` : "",
      timeline ? `Timeline: ${timeline}` : "",
      evidence ? `Known evidence: ${evidence}` : "",
      missingEvidence ? `Evidence still missing: ${missingEvidence}` : "",
      goal ? `Requested court order / outcome: ${goal}` : "",
      urgent ? `Urgent or deadline-related concerns: ${urgent}` : "",
      safetyConcerns ? `Safety concerns: ${safetyConcerns}` : "",
      propertyHomeDetails
        ? `Property, home, support, or financial disclosure details: ${propertyHomeDetails}`
        : "",
      upcomingCourtDate ? `Upcoming court date or deadline: ${upcomingCourtDate}` : "",
      adoptionDetails ? `Adoption details: ${adoptionDetails}` : "",
      uploadedEvidenceFiles.length
        ? `Uploaded evidence metadata: ${uploadedEvidenceFiles
            .map((file) =>
              cleanList([
                `Document: ${file.reference}`,
                file.type ? `File type: ${file.type}` : "",
                file.title ? `Title: ${file.title}` : "",
                file.category ? `Category: ${file.category}` : "",
                file.evidenceDate ? `Date/Event: ${file.evidenceDate}` : "",
                file.source ? `Source: ${file.source}` : "",
                file.description ? `Description: ${file.description}` : "",
                file.relevance ? `Why it matters: ${file.relevance}` : "",
              ]).join(" | "),
            )
            .join("; ")}`
        : "",
    ]).join("\n");
  }


  // Questions from the law that applies to the story, asked for as soon as
  // there is a story and again when it is edited. Never blocks the analysis.
  const restoredSourced = useRef(recovery?.read("sourced", "state") !== undefined);
  const sourced = useSourcedQuestions("family", earlierSourcedAnswers ?? NO_EARLIER_ANSWERS);
  const startSourced = sourced.start;
  React.useEffect(() => {
    if (restoredSourced.current) return;
    void startSourced(facts, yourRole !== "not-sure" ? yourRole : undefined);
    // Once, for the story the page opened with; edits ask again on blur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useContinueHandler("family", () => { void handleAnalyze(); });

  async function handleAnalyze() {
    if (analysisRequest.current.pending) return;
    try {
      await analysisRequest.current.run(async (signal) => {
        await beforeIntakeAI(signal);
        if (!(await prepareCaseGuidance("family"))) return;
    if (submissionInFlight.current) return;
    if (!facts.trim()) {
      setAnalysisError("Add a short description of what happened before continuing the core intake.");
      return;
    }
    // Guests sign in first: the AI danger/distress safety check runs before every
    // analysis and needs an account (site owner, 2026-10-18; same rule as Small Claims).
    setAuthRequired(false);
    const { data: { session: signedIn } } = await supabase.auth.getSession();
    if (!signedIn?.access_token) { setAuthRequired(true); return; }
    submissionInFlight.current = true;
    // The questions are finished: the page may now ask its own (V1).
    onQuestionsDone?.();
    setStorageWarning("");
    setAnalysisError("");
    setIsAnalyzing(true);

    /*
     * THE SAFETY PASS RUNS BEFORE EXTRACTION, AND NEVER HALTS THIS PATH.
     *
     * Decision recorded 2026-09-17, by the product owner, on this reasoning:
     * the Small Claims halt stops intake dead and shows crisis resources
     * instead of the next question. That is right where nothing is
     * time-critical. On the family path it is not obviously right — someone
     * completing an urgent motion about a child may need the form AND the
     * resources, and a halt that strands them mid-application could do harm
     * of its own.
     *
     * So family surfaces the resources prominently and lets the intake
     * continue, which is closer to how `distress` already behaves on Small
     * Claims than to how `immediate-danger` does.
     *
     * *** THIS IS A QUESTION FOR THE CLINICAL REVIEWER, NOT A SETTLED
     * ANSWER. *** Nobody with crisis-response or family-violence expertise
     * has reviewed it (OUTSTANDING_ISSUES section 0a). It is a considered
     * product decision made in the absence of that review, and the reviewer
     * should be asked specifically whether continuing is right here, or
     * whether family should halt like Small Claims does.
     */
    // A check that failed twice is "failed", never clear; the route checks again and records it (item N).
    let safetyFailed = true;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const safety = await ensureSafetyChecked(facts, session?.access_token);
      safetyFailed = safety.status === "failed";
      await validateIntakeResponse(signal);
      signal.throwIfAborted();
      setSafetyClassification(safety.classification);
      setSafetyMessage(safety.userMessage || "");
      setAsksForAdvice(safety.requestsLegalAdvice);
      setSafetyUnavailable(Boolean(safety.failed));
    } catch {
      setSafetyUnavailable(true);
      if (signal.aborted) return;
      // Fails open, same as the helper itself. A classifier fault must never
      // stop someone reaching their own case.
    }

    try {
      const narrative = buildNarrative();
      const familyInput: FamilyMasterCaseInput = {
        caseStage,
        role: yourRole,
        issues: issues.map(labelForIssue),
        filedDocuments: filedDocuments.map(labelForFiledDocument),
        yourName,
        otherParty,
        childrenInfo,
        currentLivingSituation,
        pastLivingHistory,
        facts: withSourcedAnswerList(facts, sourced.answeredList()),
        timeline,
        evidence,
        missingEvidence,
        goal,
        urgent,
        safetyConcerns,
        propertyHomeDetails,
        upcomingCourtDate,
        adoptionDetails,
        uploadedFiles: uploadedEvidenceFiles.map((file) => ({
          id: file.id,
          reference: file.reference,
          mimeType: file.type,
          sizeBytes: file.size,
          title: file.title,
          description: file.description,
          category: file.category,
          source: file.source,
          notes: cleanList([file.evidenceDate, file.relevance]).join("; "),
        })),
      };
      const {
        data: { session },
      } = await supabase.auth.getSession();
      signal.throwIfAborted();
      const response = await fetch("/api/family/analyze", {
        signal,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...intakeGuidanceHeaders(recovery),
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ input: familyInput }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        result?: FamilyCanonicalIntakeResult;
        authenticated?: boolean;
        reasoningMode?: "structured-ai" | "deterministic-fallback";
        analysisAvailable?: boolean;
        error?: string;
      };

      if (!response.ok || !body.ok || !body.result) {
        throw new Error(body.error || "Family analysis could not be completed.");
      }
      // The browser's check failed: the route checked the same story itself.
      // Family shows the resources and continues, as it does for its own check.
      const late = safetyFailed ? safetyConcernFromAnalysis(body) : null;
      if (late) {
        setSafetyClassification(late.classification);
        setSafetyMessage(late.userMessage || "");
      }

      const result = body.result;
      const analysis = buildFamilyAnalysis(narrative, result);

      const payload: StoredCaseData = {
      courtPath: "family",
      pathLabel: "Family",
      caseStage,
      yourName,
      otherParty,
      facts: narrative,
      timeline,
      evidence,
      missingEvidence,
      goal,
      urgent,
      analysis,
      intelligence: result.brain.intelligence,
      masterResultPatch: result.masterResultPatch,
      dashboardPatch: result.dashboardPatch,
      recommendedNextRoute: result.recommendedNextRoute,
      extra: {
        architectureMode: "family-canonical-integration",
        sourceOfTruth: "MasterCaseSchema",
        specializedSource: "familyMasterCaseEngine",
        analysisExecution: {
          reasoningMode: body.reasoningMode,
          analysisAvailable: body.analysisAvailable === true,
          authenticated: body.authenticated === true,
          completedAt: new Date().toISOString(),
        },
        // The user's own story, for showing back (userStory.ts); `facts`
        // above is the labelled record the analysis reads.
        story: facts,
        // Follow-up answers, kept with the case so a return visit doesn't ask them again (Step 2A).
        sourcedAnswers: sourced.answeredList(),
        yourRole,
        filedDocuments,
        filedDocumentLabels: filedDocuments.map(labelForFiledDocument),
        // What the person answered themselves about their side and filings
        // (stageFromAnswers.ts): only fields they set, never a prefill.
        personAnswers: {
          ...((fromStart.role || personSet.current.has("yourRole")) && yourRole !== "not-sure" ? { side: yourRole } : {}),
          ...(filedDocuments.length > 0 && (fromStart.documents || filedDocuments.every((item) => personDocuments.current.has(item)))
            ? { filed: [...filedDocuments], filedLabels: filedDocuments.map(labelForFiledDocument) }
            : {}),
        } satisfies PersonAnswers,
        issues,
        issueLabels: issues.map(labelForIssue),
        childrenInfo,
        currentLivingSituation,
        pastLivingHistory,
        safetyConcerns,
        propertyHomeDetails,
        upcomingCourtDate,
        adoptionDetails,
        uploadedEvidenceFiles,
        province,
        city,
      },
    };

      await validateIntakeResponse(signal);

      signal.throwIfAborted();
      onComplete(analysis, payload);
    } catch (error) {
      if (signal.aborted) return;
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Family analysis could not be completed.",
      );
    }
      }, ANALYSIS_TIMEOUT_MS);
    } catch {
      setAnalysisError("That request did not finish. Your answers are still here; please try again.");
    } finally {
      submissionInFlight.current = false;
      setIsAnalyzing(false);
    }
  }

  const guidedFields = familyGuidedFields({ issues: issueOptions, filed: filedChoices });
  const guidedValues: GuidedValues = {
    facts,
    yourRole,
    issues,
    filedDocuments,
    childrenInfo,
    // Kept as a line of the Timeline, which the step page reads for dates; the day given
    // in the situation answers is the person's answer, and is not asked again.
    ...familyTimelineValues(timeline),
    ...(fromStart.servedOn ? { servedDate: formatForCourt(fromStart.servedOn) } : {}),
    upcomingCourtDate,
    goal,
    otherParty,
    urgent,
  };
  function answerGuided(key: string, value: string | string[]) {
    const list = Array.isArray(value) ? value : [value];
    const one = Array.isArray(value) ? value.join(", ") : value;
    switch (key) {
      case "facts": setFacts(one); void sourced.start(one, yourRole !== "not-sure" ? yourRole : undefined); break;
      case "yourRole": personSet.current.add("yourRole"); setYourRole(one === "applicant" || one === "respondent" ? one : "not-sure"); break;
      case "issues": setIssues(list.filter((item): item is FamilyIssue => issueOptions.some((option) => option.value === item))); break;
      case "filedDocuments": personDocuments.current = new Set(list); setFiledDocuments(list.filter((item): item is FiledDocument => filedOptions.some((option) => option.value === item))); break;
      case "childrenInfo": setChildrenInfo(one); break;
      case "servedDate": setTimeline((current) => familyTimelineAnswer(key, one, current) ?? current); break;
      case "upcomingCourtDate": setUpcomingCourtDate(one); break;
      case "goal": setGoal(one); break;
      case "otherParty": setOtherParty(one); break;
      case "urgent": setUrgent(one); break;
    }
  }

  // Answers based on an earlier version of the story are not shown or pre-filled anywhere in
  // this form until the questions start again from the story (storyBasis.ts, re-test 2026-10-18).
  if (storyChanged) {
    return (
      <section data-testid="family-intake-story-changed" className="mt-6 rounded-3xl border border-[#d8e6df] bg-white p-6">
        <h2 className="text-xl font-bold text-[#10231f]">Family intake</h2>
        <StoryChangedNotice where="questions" />
        <button type="button" data-testid="family-intake-continue" disabled className="mt-4 rounded-2xl bg-[#2f7d67] px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">Continue to your next steps</button>
      </section>
    );
  }

  return (
    <section onChangeCapture={() => analysisRequest.current.cancel()} className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-2xl font-bold text-[#10231f]">Family Intake</h2>

      <p className="mt-3 text-[#4d675f]">
        Tell us about your family case. Answer what applies to you; you can
        leave the rest blank.
      </p>


      {/*
        Shown when the safety pass returns anything other than "clear". The
        intake below stays fully usable — this path never halts.

        The wording is NOT generated and NOT assembled here: `safetyMessage` is
        safetyPass.ts's fixed constant. Nothing on this panel is a judgment
        about this user's facts beyond the classification itself.

        ONE SUPPORT BOX (owner's Chrome check, 2026-10-30): the "Support if
        family violence is part of your situation" box is the overview's
        family-safety-resources (IntelligenceOverviewPanel.tsx), on every
        Family case. Its copy here was a second, hidden one: this panel sits in
        the builder's intake section, which is hidden once the results show.
      */}
      {asksForAdvice && (
        <div className="mt-5">
          <LegalAdviceDeflection reason="legal-advice" />
        </div>
      )}

      {safetyClassification !== "clear" && safetyMessage && (
        <div
          role="note"
          aria-live="polite"
          className="mt-5 rounded-2xl border-2 border-[#c2410c] bg-[#fff7ed] p-5"
        >
          <p className="whitespace-pre-line text-[15px] font-semibold leading-7 text-[#7c2d12]">
            {safetyMessage}
          </p>

          <p className="mt-5 text-sm leading-6 text-[#7c2d12]">
            Your intake below is saved and you can carry on with it whenever you
            are ready.
          </p>
        </div>
      )}

      {storageWarning && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {storageWarning}
        </div>
      )}

      {authRequired && <SignInForSafetyCheck area="Family" />}

      {analysisError && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {analysisError}
        </div>
      )}
      <AnalysisProgress reading={isAnalyzing} error={analysisError} onRetry={() => void handleAnalyze()} onStop={() => { analysisRequest.current.cancel(); setAnalysisError("Stopped. Your answers are still here; you can try again."); }} />

      {extractedFacts.length > 0 && (
        <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-[#24463d]">
          <p className="font-semibold">Found in your description — review/edit</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {extractedFacts.map((fact) => (
              <li key={fact.field}>{fact.field}: {Array.isArray(fact.value) ? fact.value.join(", ") : fact.value}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-5">
        {/* In both views once there is a story: in the questions it was hidden (#470 re-test). */}
        {(mode !== "chat" || facts.trim()) ? <StoryEditor section="family" story={facts} onSave={(text) => { setFacts(text); void sourced.start(text, yourRole !== "not-sure" ? yourRole : undefined); }} ids={{ draft: "family-story-draft", save: "family-story-save" }} /> : null}

        {mode === "chat" ? (<>
          <GuidedFormChat
            fields={guidedFields}
            values={guidedValues}
            onAnswer={answerGuided}
            onDone={handleAnalyze}
            onShowForm={() => setMode("form")}
            busy={isAnalyzing || sourced.state === "loading"}
            // "how do i get it lowered" is answered when the questions end
            // (walkthrough run 38525903567, FM; motionToChange.ts chatClosingFor).
            fromStart={[...(fromStart.role ? ["yourRole"] : []), ...(fromStart.documents ? ["filedDocuments"] : []), ...(fromStart.servedOn ? ["servedDate"] : [])]}
            startWords={{ yourRole: fromStart.roleWords }}
            closing={chatClosingFor(
              [facts, goal].filter(Boolean).join("\n"),
              existingFamilyOrder(facts) || filedDocuments.includes("order-agreement"),
              fromStart.role ? fromStart.role === "respondent" : respondingInFamilyStory(facts),
            )}
          />
          {/* The one-at-a-time route too: its Continue says what is missing beside it (#468 re-test). */}
          <ReviewNeededNotice from="family" />
        </>) : (
          <button type="button" onClick={() => setMode("chat")} className="justify-self-start text-sm font-semibold text-[#2f7d67] underline">
            Answer one question at a time instead
          </button>
        )}
        <div hidden={mode === "chat"} className="grid gap-5">
        <div className="rounded-3xl border border-[#cde7dc] bg-[#f8fcfa] p-5">
          <h3 className="text-lg font-bold text-[#10231f]">Location confirmed on Home</h3>
          <p className="mt-2 text-sm text-[#4d675f]">Location: {city}, {province}.</p>
        </div>
        <label className="block">
          <span className="font-semibold text-[#16302b]">Who started the court case?</span>
          {fromStart.role ? (
            <p data-testid="role-from-start" className="mt-2 rounded-2xl border border-[#d8e6df] bg-[#f3f8f5] px-4 py-3">{fromStart.roleWords ?? (fromStart.role === "respondent" ? "The other person started it and I was served (respondent)" : "I started it, or I plan to start it (applicant)")} <span className="text-sm text-[#4d675f]">(from your answers at the start; change them at the top of the page)</span></p>
          ) : (
          <select
            aria-label="Who started the court case?"
            data-testid="family-role-select"
            value={yourRole}
            onChange={(e) => {
              personSet.current.add("yourRole");
              setYourRole(e.target.value as FamilyRole);
            }}
            className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white px-4 py-3"
          >
            <option value="not-sure">Not sure</option>
            <option value="applicant">I started it, or I plan to start it (applicant)</option>
            <option value="respondent">The other person started it and I was served (respondent)</option>
          </select>
          )}
        </label>

        <label className="block">
          <span className="font-semibold text-[#16302b]">Case stage</span>
          {fromStart.caseStage ? (
            <p data-testid="stage-from-start" className="mt-2 rounded-2xl border border-[#d8e6df] bg-[#f3f8f5] px-4 py-3">{stageWords(fromStart)} <span className="text-sm text-[#4d675f]">(from your answers at the start; change them at the top of the page)</span></p>
          ) : (
          <select
            value={caseStage}
            onChange={(e) => setCaseStage(e.target.value as UniversalStage)}
            className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white px-4 py-3"
          >
            <option value="not-sure">Not sure</option>
            <option value="starting-case">Starting a new case</option>
            <option value="responding">Responding to a case</option>
            <option value="already-started">Case already started</option>
            <option value="conference">A case, settlement or trial management conference</option>
            <option value="motion">Motion stage</option>
            <option value="trial">Trial preparation</option>
            <option value="enforcement">Enforcement</option>
            <option value="urgent">Urgent issue</option>
          </select>
          )}
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="font-semibold text-[#16302b]">Your name</span>
            <input
              value={yourName}
              onChange={(e) => setYourName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Full legal name"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-[#16302b]">Other party</span>
            <input
              value={otherParty}
              onChange={(e) => setOtherParty(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Other party’s full legal name"
            />
          </label>
        </div>

        <div>
          <h3 className="font-semibold text-[#16302b]">
            What documents already exist?
          </h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {filedChoices.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  personDocuments.current.add(option.value);
                  setFiledDocuments((current) =>
                    toggleArrayValue(current, option.value),
                  );
                }}
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  filedDocuments.includes(option.value)
                    ? "border-[#2f7d67] bg-[#e9f7f2] text-[#16302b]"
                    : "border-[#d8e6df] bg-white text-[#4d675f]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-[#16302b]">
            What issues may exist?
          </h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {issueOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={issues.includes(option.value)}
                data-testid={`family-issue-${option.value}`}
                onClick={() =>
                  setIssues((current) => toggleArrayValue(current, option.value))
                }
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  issues.includes(option.value)
                    ? "border-[#2f7d67] bg-[#e9f7f2] text-[#16302b]"
                    : "border-[#d8e6df] bg-white text-[#4d675f]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {issues.includes("adoption") && <section className="rounded-2xl border border-[#cde7dc] bg-[#f8fcfa] p-5"><h3 className="font-semibold text-[#16302b]">Adoption details to organize</h3><p className="mt-2 text-sm text-[#4d675f]">Answer only what you know. These questions do not confirm legal requirements.</p><textarea aria-label="Adoption details" value={adoptionDetails} onChange={(event) => setAdoptionDetails(event.target.value)} className="mt-4 min-h-48 w-full rounded-2xl border border-[#d8e6df] px-4 py-3" placeholder="Is the person to be adopted 18 or older? Does the adult person want to be adopted? Is the applicant a step-parent, relative, or another person? Does the adult live in Ontario? Is the biological parent known/contactable, unknown, or location currently unknown? What steps have been taken to locate or contact that parent? Is there an existing adoption, family, child-protection, or court file?" /></section>}

        {textareaFields.map((field) => (
          <label key={field.label} className="block">
            <span className="font-semibold text-[#16302b]">{field.label}</span>
            <textarea
              value={field.value}
              onChange={(e) => field.setter(e.target.value)}
              className="mt-2 min-h-24 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder={field.placeholder}
            />
          </label>
        ))}

        <div className="rounded-3xl border border-dashed border-[#b8d8cc] bg-[#f8fcfa] p-5">
          <h3 className="text-lg font-bold text-[#10231f]">
            List and describe your family-law evidence
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#4d675f]">
            Add screenshots, PDFs, photos, parenting calendars, school records,
            financial disclosure, police records, agreements, orders, or other
            documents. Each file should explain what it proves.
          </p>

          {/*
            LSO Step 8. Sits directly under the heading, before the picker: a
            caution a person reads after choosing is a caution that arrived too
            late. See EvidenceFileNotice.tsx for what actually happens to a file.
          */}
          <EvidenceFileNotice />

          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-[#d8e6df] bg-white px-4 py-6 text-center hover:bg-[#f4fbf8]">
            <span className="font-semibold text-[#2f7d67]">
              Choose files to list
            </span>
            <span className="mt-1 text-sm text-[#6b8078]">
              You can select multiple files
            </span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => handleEvidenceFilesSelected(event.target.files)}
            />
          </label>

          {uploadedEvidenceFiles.length > 0 && (
            <div className="mt-5">
              <h4 className="font-semibold text-[#16302b]">
                Selected evidence files
              </h4>

              <div className="mt-3 grid gap-4">
                {uploadedEvidenceFiles.map((file) => (
                  <div
                    key={file.id}
                    className="rounded-2xl border border-[#d8e6df] bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        {/* File name deliberately absent -- see evidenceReference.ts. */}
                        <p className="font-semibold text-[#16302b]">{file.reference}</p>
                        <p className="mt-1 text-sm text-[#6b8078]">
                          {describeFileType(file.type)} · {formatFileSize(file.size)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeEvidenceFile(file.id)}
                        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-semibold text-[#16302b]">
                          Your label for this document
                        </span>
                        <span
                          data-testid="evidence-label-hint"
                          className="mt-1 block text-xs leading-5 text-[#6b8078]"
                        >
                          Your own label for this document. Optional, and sent to our AI provider along with what you write about it.
                        </span>
                        <input
                          value={file.title}
                          onChange={(event) =>
                            updateEvidenceFile(file.id, "title", event.target.value)
                          }
                          className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
                          placeholder="Example: Missed parenting-time messages"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-semibold text-[#16302b]">
                          Issue this supports
                        </span>
                        <select
                          value={file.category}
                          onChange={(event) =>
                            updateEvidenceFile(file.id, "category", event.target.value)
                          }
                          className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white px-4 py-3 text-sm"
                        >
                          <option value="">Select issue</option>
                          {evidenceCategoryOptions.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-sm font-semibold text-[#16302b]">
                          Date or event this relates to
                        </span>
                        <input
                          value={file.evidenceDate}
                          onChange={(event) =>
                            updateEvidenceFile(
                              file.id,
                              "evidenceDate",
                              event.target.value,
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
                          placeholder="Example: March 12, 2026"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-semibold text-[#16302b]">
                          Who created or sent it?
                        </span>
                        <input
                          value={file.source}
                          onChange={(event) =>
                            updateEvidenceFile(file.id, "source", event.target.value)
                          }
                          className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
                          placeholder="Example: Other parent, school, bank, police"
                        />
                      </label>
                    </div>

                    <label className="mt-4 block">
                      <span className="text-sm font-semibold text-[#16302b]">
                        What does this evidence show?
                      </span>
                      <textarea
                        value={file.description}
                        onChange={(event) =>
                          updateEvidenceFile(
                            file.id,
                            "description",
                            event.target.value,
                          )
                        }
                        className="mt-2 min-h-20 w-full rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
                        placeholder="Briefly describe what the file shows."
                      />
                    </label>

                    <label className="mt-4 block">
                      <span className="text-sm font-semibold text-[#16302b]">
                        Why does it matter to your case?
                      </span>
                      <textarea
                        value={file.relevance}
                        onChange={(event) =>
                          updateEvidenceFile(file.id, "relevance", event.target.value)
                        }
                        className="mt-2 min-h-20 w-full rounded-2xl border border-[#d8e6df] px-4 py-3 text-sm"
                        placeholder="Example: Supports parenting time because it shows repeated cancelled visits."
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <label className="block">
          <span className="font-semibold text-[#16302b]">
            Next court date or deadline
          </span>
          <input
            value={upcomingCourtDate}
            onChange={(e) => setUpcomingCourtDate(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
            placeholder="Example: Case conference on June 15, 2026"
          />
        </label>

        </div>

        <SourcedQuestionsCard
          state={sourced.state}
          questions={sourced.questions}
          answers={sourced.answers}
          setAnswer={sourced.setAnswer}
        />

        <TidyWordingReview
          fields={[
            { key: "facts", label: "Your story", value: facts, setValue: setFacts },
            ...textareaFields.map((field) => ({
              key: field.label,
              label: field.label,
              value: field.value,
              setValue: field.setter,
            })),
          ]}
        />

        {sourced.state === "loading" ? (
          // Page review, 2026-10-06: Continue was pressed before these
          // questions loaded, so on the normal path nobody saw them; they
          // appeared only after pressing Back.
          <p className="text-sm text-[#4d675f]">
            Questions about your situation are loading. They usually take under a minute.{" "}
            <button type="button" onClick={handleAnalyze} disabled={isAnalyzing} className="font-semibold text-[#2f7d67] underline">
              Continue without them
            </button>
          </p>
        ) : null}
        {/* In the one-at-a-time view, its own Continue is the one to press. */}
        {mode === "form" ? (<>
        <button
          type="button"
          data-testid="family-intake-continue"
          onClick={handleAnalyze}
          disabled={isAnalyzing || storyChanged}
          className="rounded-2xl bg-[#2f7d67] px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAnalyzing ? "Reading what you told us..." : sourced.state === "loading" ? "Continue without them" : "Continue to your next steps"}
        </button>
        <StoryChangedNotice where="button" />
        <ReviewNeededNotice from="family" />
        </>) : null}
      </div>
    </section>
  );
}
