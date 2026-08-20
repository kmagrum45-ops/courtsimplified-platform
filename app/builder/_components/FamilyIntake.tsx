"use client";

import React, { useMemo, useRef, useState } from "react";
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
import {
  consumeNarrativePrefill,
  directPrefillValues,
  type NarrativePrefillFact,
  type NarrativePrefill,
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

type FamilyIssue =
  | "decision-making-responsibility"
  | "parenting-time"
  | "child-support"
  | "spousal-support"
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
  name: string;
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

type Props = {
  onComplete: (analysis: AnalysisResult, payload: StoredCaseData) => void;
  location: { province: "Ontario"; city: string };
  initialStory: string;
};

type TextareaField = {
  label: string;
  value: string;
  setter: React.Dispatch<React.SetStateAction<string>>;
  placeholder: string;
};

const filedOptions: { value: FiledDocument; label: string }[] = [
  { value: "application", label: "Application already filed / served" },
  { value: "answer", label: "Answer / response already filed" },
  { value: "financial-statement", label: "Financial statement already completed" },
  { value: "affidavit", label: "Affidavit already prepared" },
  { value: "motion-materials", label: "Motion materials already filed" },
  { value: "conference-brief", label: "Conference brief already filed" },
  { value: "order-agreement", label: "Existing court order or agreement" },
  { value: "nothing", label: "Nothing filed yet" },
  { value: "not-sure", label: "Not sure" },
];

const issueOptions: { value: FamilyIssue; label: string }[] = [
  { value: "decision-making-responsibility", label: "Decision-making responsibility / custody" },
  { value: "parenting-time", label: "Parenting time / access" },
  { value: "child-support", label: "Child support" },
  { value: "spousal-support", label: "Spousal support" },
  { value: "property-division", label: "Property / equalization" },
  { value: "matrimonial-home", label: "Matrimonial home / exclusive possession" },
  { value: "safety-concerns", label: "Safety concerns" },
  { value: "relocation", label: "Relocation / moving with child" },
  { value: "disclosure", label: "Disclosure problems" },
  { value: "enforcement", label: "Enforcement / arrears" },
  { value: "adoption", label: "Adoption — step-parent, relative, or adult adoption" },
  { value: "other", label: "Other family issue" },
];

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


function isQuotaExceededError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;

  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22 ||
    error.code === 1014
  );
}

function safelyStoreJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.warn(
        `CourtSimplified browser storage is full. The key "${key}" was not saved.`,
      );
      return false;
    }

    throw error;
  }
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

export default function FamilyIntake({ onComplete, location, initialStory }: Props) {
  const [editingStory, setEditingStory] = useState(false);
  const [initialPrefill] = useState<NarrativePrefill | null>(() =>
    consumeNarrativePrefill({
      courtPath: "family",
      caseId: new URLSearchParams(window.location.search).get("caseId"),
    }),
  );
  const initialValues = initialPrefill
    ? directPrefillValues(initialPrefill)
    : {};
  const [caseStage, setCaseStage] = useState<UniversalStage>(
    () => initialValues.caseStage ? initialValues.caseStage as UniversalStage : "not-sure",
  );
  const [filedDocuments, setFiledDocuments] = useState<FiledDocument[]>(
    () => Array.isArray(initialValues.documentStatus) ? ["application"] : [],
  );
  const [issues, setIssues] = useState<FamilyIssue[]>([]);

  const [yourName, setYourName] = useState(() => String(initialValues.yourName || ""));
  const province = location.province;
  const city = location.city;
  const [otherParty, setOtherParty] = useState(() => String(initialValues.otherParty || ""));
  const [childrenInfo, setChildrenInfo] = useState("");
  const [currentLivingSituation, setCurrentLivingSituation] = useState("");
  const [pastLivingHistory, setPastLivingHistory] = useState("");
  const [facts, setFacts] = useState(() => String(initialValues.facts || initialStory || ""));
  const [timeline, setTimeline] = useState(() => String(initialValues.timeline || initialValues.enforcementDetails || ""));
  const [evidence, setEvidence] = useState(() => String(initialValues.evidence || ""));
  const [missingEvidence, setMissingEvidence] = useState("");
  const [goal, setGoal] = useState(() => String(initialValues.goal || ""));
  const [urgent, setUrgent] = useState(() => String(initialValues.urgent || ""));
  const [safetyConcerns, setSafetyConcerns] = useState("");
  const [propertyHomeDetails, setPropertyHomeDetails] = useState(() => String(initialValues.addressDetails || initialValues.existingOrderDetails || ""));
  const [upcomingCourtDate, setUpcomingCourtDate] = useState("");
  const [adoptionDetails, setAdoptionDetails] = useState("");

  const [uploadedEvidenceFiles, setUploadedEvidenceFiles] =
    useState<EvidenceFile[]>([]);
  const [storageWarning, setStorageWarning] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedFacts] = useState<NarrativePrefillFact[]>(
    () => initialPrefill?.facts.filter((fact) => fact.state === "direct") || [],
  );
  const submissionInFlight = useRef(false);

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
          "Upcoming court date, deadline, missed service, urgent motion need, safety issue, missed support, withheld child, eviction/home issue, or financial emergency.",
      },
    ],
    [
      childrenInfo,
      currentLivingSituation,
      pastLivingHistory,
      facts,
      timeline,
      evidence,
      missingEvidence,
      safetyConcerns,
      propertyHomeDetails,
      goal,
      urgent,
    ],
  );

  function handleEvidenceFilesSelected(files: FileList | null) {
    if (!files) return;

    const nextFiles: EvidenceFile[] = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      type: file.type || "Unknown file type",
      lastModified: file.lastModified,
      title: "",
      description: "",
      category: "",
      evidenceDate: "",
      source: "",
      relevance: "",
    }));

    setUploadedEvidenceFiles((current) => {
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
                `File: ${file.name}`,
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

  function buildFamilyAnalysis(
    narrative: string,
    result: FamilyCanonicalIntakeResult,
  ): AnalysisResult {
    const family = result.familyMasterResult;

    return {
      courtPath: "family",
      caseStage: getStageLabel(result.stage),
      completedForms: family.documentsPage.completedFormLabels,
      receivedForms: family.documentsPage.receivedFormLabels,
      requiredNextForms: cleanList([
        ...family.documentsPage.requiredFormLabels,
        ...family.documentsPage.recommendedFormLabels,
      ]),
      notNeededNow: family.documentsPage.notNeededNowLabels,
      detectedIssues: family.chatContext.detectedIssues,
      inferredFacts: [],
      missingInformation: family.normalized.missingInformation,
      risksAndGaps: family.builderSummary.blockers,
      guidance: family.builderSummary.nextBestActions,
      summary: family.builderSummary.judgeReadySummary || narrative,
      proceduralRisks: family.builderSummary.warnings,
      damagesIssues: [],
      defenceAttacks: [],
      judgeConcerns: [],
      suggestedFocus: family.builderSummary.nextBestActions,
      documentUploadRequests: family.evidencePage.uploadRequests,
      detectedFamilyIssues: family.chatContext.detectedIssues,
      recommendedEvidence: cleanList([
        ...family.evidencePage.strongestEvidenceTitles,
        ...family.evidencePage.uploadRequests,
      ]),
      recommendedFamilyNextSteps: family.builderSummary.nextBestActions,
      intelligence: result.brain.intelligence,
      intelligenceSummary: result.brain.intelligence.plainLanguageSummary,
      structuredIntelligenceSummary:
        result.brain.intelligence.structuredCaseSummary,
      intelligenceWarnings: result.brain.intelligence.systemWarnings,
      intelligenceNextActions: result.brain.intelligence.nextBestActions,
    };
  }

  async function handleAnalyze() {
    if (submissionInFlight.current) return;
    if (!facts.trim()) {
      setAnalysisError("Add a short description of what happened before continuing the core intake.");
      return;
    }
    submissionInFlight.current = true;
    setStorageWarning("");
    setAnalysisError("");
    setIsAnalyzing(true);

    try {
      const narrative = buildNarrative();
      const familyInput: FamilyMasterCaseInput = {
        caseStage,
        issues: issues.map(labelForIssue),
        filedDocuments: filedDocuments.map(labelForFiledDocument),
        yourName,
        otherParty,
        childrenInfo,
        currentLivingSituation,
        pastLivingHistory,
        facts,
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
          fileName: file.name,
          originalName: file.name,
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
      const response = await fetch("/api/family/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
        filedDocuments,
        filedDocumentLabels: filedDocuments.map(labelForFiledDocument),
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

      onComplete(analysis, payload);
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Family analysis could not be completed.",
      );
    } finally {
      submissionInFlight.current = false;
      setIsAnalyzing(false);
    }
  }

  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-2xl font-bold text-[#10231f]">Family Intake</h2>

      <p className="mt-3 text-[#4d675f]">
        Build a complete family-law case record. This intake captures parenting,
        support, property, disclosure, safety, urgency, evidence, and procedural
        posture for the unified CourtSimplified legal brain.
      </p>


      {storageWarning && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {storageWarning}
        </div>
      )}

      {analysisError && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {analysisError}
        </div>
      )}

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
        <div className="rounded-3xl border border-[#cde7dc] bg-[#f8fcfa] p-5">
          <h3 className="text-lg font-bold text-[#10231f]">Location confirmed on Home</h3>
          <p className="mt-2 text-sm text-[#4d675f]">Canonical intake context: {province}, {city}.</p>
        </div>
        <label className="block">
          <span className="font-semibold text-[#16302b]">Case stage</span>
          <select
            value={caseStage}
            onChange={(e) => setCaseStage(e.target.value as UniversalStage)}
            className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white px-4 py-3"
          >
            <option value="not-sure">Not sure</option>
            <option value="starting-case">Starting a new case</option>
            <option value="responding">Responding to a case</option>
            <option value="already-started">Case already started</option>
            <option value="conference">Conference / settlement step</option>
            <option value="motion">Motion stage</option>
            <option value="trial">Trial preparation</option>
            <option value="enforcement">Enforcement</option>
            <option value="urgent">Urgent issue</option>
          </select>
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
            {filedOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setFiledDocuments((current) =>
                    toggleArrayValue(current, option.value),
                  )
                }
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

        <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5"><h3 className="font-semibold text-[#16302b]">Case story</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4d675f]">{facts}</p><button type="button" onClick={() => setEditingStory((current) => !current)} className="mt-3 text-sm font-semibold text-[#2f7d67]">Edit case story</button>{editingStory && <textarea aria-label="Case story" value={facts} onChange={(event) => setFacts(event.target.value)} className="mt-3 min-h-32 w-full rounded-2xl border border-[#d8e6df] px-4 py-3" />}</div>

        <div className="rounded-3xl border border-dashed border-[#b8d8cc] bg-[#f8fcfa] p-5">
          <h3 className="text-lg font-bold text-[#10231f]">
            Upload and describe family-law evidence
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#4d675f]">
            Add screenshots, PDFs, photos, parenting calendars, school records,
            financial disclosure, police records, agreements, orders, or other
            documents. Each file should explain what it proves.
          </p>

          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-[#d8e6df] bg-white px-4 py-6 text-center hover:bg-[#f4fbf8]">
            <span className="font-semibold text-[#2f7d67]">
              Choose evidence files
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
                        <p className="font-semibold text-[#16302b]">{file.name}</p>
                        <p className="mt-1 text-sm text-[#6b8078]">
                          {formatFileSize(file.size)} · {file.type}
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
                          Evidence title
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
            Upcoming court date or deadline
          </span>
          <input
            value={upcomingCourtDate}
            onChange={(e) => setUpcomingCourtDate(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
            placeholder="Example: Case conference on June 15, 2026"
          />
        </label>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="rounded-2xl bg-[#2f7d67] px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isAnalyzing ? "Running Unified Analysis..." : "Continue to Unified Analysis"}
        </button>
      </div>
    </section>
  );
}
