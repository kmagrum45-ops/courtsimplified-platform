"use client";

import React, { useMemo, useState } from "react";
import {
  AnalysisResult,
  StoredCaseData,
  UniversalStage,
  cleanList,
  getStageLabel,
  hasMeaningfulText,
} from "@/app/builder/_components/builderTypes";

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

export default function FamilyIntake({ onComplete }: Props) {
  const [caseStage, setCaseStage] = useState<UniversalStage>("not-sure");
  const [filedDocuments, setFiledDocuments] = useState<FiledDocument[]>([]);
  const [issues, setIssues] = useState<FamilyIssue[]>([]);

  const [yourName, setYourName] = useState("");
  const [otherParty, setOtherParty] = useState("");
  const [childrenInfo, setChildrenInfo] = useState("");
  const [currentLivingSituation, setCurrentLivingSituation] = useState("");
  const [pastLivingHistory, setPastLivingHistory] = useState("");
  const [facts, setFacts] = useState("");
  const [timeline, setTimeline] = useState("");
  const [evidence, setEvidence] = useState("");
  const [missingEvidence, setMissingEvidence] = useState("");
  const [goal, setGoal] = useState("");
  const [urgent, setUrgent] = useState("");
  const [safetyConcerns, setSafetyConcerns] = useState("");
  const [propertyHomeDetails, setPropertyHomeDetails] = useState("");
  const [upcomingCourtDate, setUpcomingCourtDate] = useState("");

  const [uploadedEvidenceFiles, setUploadedEvidenceFiles] =
    useState<EvidenceFile[]>([]);

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
        label: "Full family-law story",
        value: facts,
        setter: setFacts,
        placeholder:
          "Explain what happened in your own words. Include separation, conflict, missed parenting time, support, property, safety, disclosure, agreements, and what changed.",
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
        file.id === fileId
          ? {
              ...file,
              [field]: value,
            }
          : file,
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
        ? `Family issue signals selected by user: ${issues.map(labelForIssue).join("; ")}`
        : "",
      childrenInfo ? `Children and parenting details: ${childrenInfo}` : "",
      currentLivingSituation
        ? `Current living situation: ${currentLivingSituation}`
        : "",
      pastLivingHistory
        ? `Past caregiving and living history: ${pastLivingHistory}`
        : "",
      facts ? `Full family-law story: ${facts}` : "",
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

  function buildIntakeAnalysis(): AnalysisResult {
    const missingInformation: string[] = [];
    const risksAndGaps: string[] = [];
    const inferredFacts: string[] = [];
    const guidance: string[] = [];
    const suggestedFocus: string[] = [];
    const documentUploadRequests: string[] = [];

    if (!hasMeaningfulText(yourName)) missingInformation.push("Your full legal name.");
    if (!hasMeaningfulText(otherParty)) missingInformation.push("The other party’s full legal name.");
    if (!hasMeaningfulText(facts)) missingInformation.push("The full family-law story.");
    if (!hasMeaningfulText(timeline)) missingInformation.push("A timeline with important dates.");
    if (!hasMeaningfulText(goal)) missingInformation.push("The exact order or outcome requested.");

    if (
      issues.includes("decision-making-responsibility") ||
      issues.includes("parenting-time")
    ) {
      inferredFacts.push("Parenting or decision-making issues are flagged for unified analysis.");
      suggestedFocus.push(
        "Parenting facts should be organized around the child’s best interests, stability, caregiving history, safety, school/daycare, and practical schedule terms.",
      );
      if (!hasMeaningfulText(childrenInfo)) {
        missingInformation.push("Children’s names, ages, schools/daycare, living arrangements, and current parenting schedule.");
      }
      documentUploadRequests.push(
        "Parenting evidence: parenting calendars, messages about exchanges, school/daycare records, medical communication, attendance records, photos, and proof of missed or denied parenting time.",
      );
    }

    if (
      issues.includes("child-support") ||
      issues.includes("spousal-support") ||
      issues.includes("disclosure")
    ) {
      inferredFacts.push("Support, disclosure, or financial issues are flagged for unified analysis.");
      suggestedFocus.push(
        "Financial issues should be organized by income, tax records, support history, expenses, disclosure requested, disclosure received, and what remains missing.",
      );
      documentUploadRequests.push(
        "Financial evidence: pay stubs, tax returns, Notices of Assessment, bank records, benefit records, childcare/special expenses, support payment history, and disclosure requests.",
      );
    }

    if (
      issues.includes("property-division") ||
      issues.includes("matrimonial-home")
    ) {
      inferredFacts.push("Property, equalization, or matrimonial-home issues are flagged for unified analysis.");
      suggestedFocus.push(
        "Property issues should identify assets, debts, ownership, date-of-marriage values, separation-date values, home possession issues, and disclosure gaps.",
      );
      documentUploadRequests.push(
        "Property evidence: mortgage records, title/deed documents, bank records, pension information, debt statements, vehicle records, business records, appraisals, and home expense records.",
      );
    }

    if (issues.includes("safety-concerns") || hasMeaningfulText(safetyConcerns)) {
      inferredFacts.push("Safety or urgency concerns are flagged for unified analysis.");
      risksAndGaps.push(
        "Safety concerns must be separated from general conflict and supported with dates, incidents, records, witnesses, police involvement, messages, or other proof where available.",
      );
      suggestedFocus.push(
        "Safety facts should be organized by incident date, what happened, who was present, what evidence exists, and what protective or temporary order is requested.",
      );
      documentUploadRequests.push(
        "Safety evidence: police occurrence numbers, threatening messages, photos, medical records, witness names, prior orders, CAS/agency records where applicable, and incident timelines.",
      );
    }

    if (issues.includes("relocation")) {
      inferredFacts.push("Relocation is flagged for unified analysis.");
      suggestedFocus.push(
        "Relocation issues need the proposed move details, reason for moving, school plan, housing plan, transportation plan, effect on parenting time, and proposed revised schedule.",
      );
    }

    if (uploadedEvidenceFiles.length === 0 && !hasMeaningfulText(evidence)) {
      risksAndGaps.push("No evidence has been listed or uploaded yet.");
    }

    if (uploadedEvidenceFiles.length > 0) {
      inferredFacts.push(
        `${uploadedEvidenceFiles.length} evidence file${
          uploadedEvidenceFiles.length === 1 ? "" : "s"
        } selected for later evidence mapping.`,
      );

      const incompleteFiles = uploadedEvidenceFiles.filter(
        (file) =>
          !hasMeaningfulText(file.title) ||
          !hasMeaningfulText(file.description) ||
          !hasMeaningfulText(file.relevance),
      );

      if (incompleteFiles.length > 0) {
        risksAndGaps.push(
          `${incompleteFiles.length} evidence file${
            incompleteFiles.length === 1 ? "" : "s"
          } need stronger description, title, or relevance notes before court-package assembly.`,
        );
      }
    }

    guidance.push(
      "This is a lawyer-grade structured family intake handoff, not a separate family reasoning engine.",
      "Final issue detection, forms, judge concerns, procedural steps, evidence mapping, risks, and document recommendations must come from courtSimplifiedBrain and the unified assembly layer.",
      "This component preserves rich family facts, document posture, evidence metadata, support/property/safety signals, and requested relief for centralized reasoning.",
    );

    return {
      courtPath: "family",
      caseStage: getStageLabel(caseStage),
      completedForms: [],
      receivedForms: [],
      requiredNextForms: [],
      notNeededNow: [],
      detectedIssues: cleanList(issues.map(labelForIssue)),
      inferredFacts: cleanList(inferredFacts),
      missingInformation: cleanList(missingInformation),
      risksAndGaps: cleanList(risksAndGaps),
      guidance: cleanList(guidance),
      summary: [
        "Family Intake Handoff",
        "",
        `Stage: ${getStageLabel(caseStage)}`,
        "",
        "Selected issues:",
        issues.length ? issues.map((issue) => `- ${labelForIssue(issue)}`).join("\n") : "- None selected",
        "",
        "Existing documents:",
        filedDocuments.length
          ? filedDocuments.map((doc) => `- ${labelForFiledDocument(doc)}`).join("\n")
          : "- None selected",
        "",
        "Missing intake information:",
        missingInformation.length
          ? cleanList(missingInformation).map((item) => `- ${item}`).join("\n")
          : "- No major intake gaps detected",
      ].join("\n"),
      proceduralRisks: [],
      damagesIssues: [],
      defenceAttacks: [],
      judgeConcerns: [],
      suggestedFocus: cleanList(suggestedFocus),
      documentUploadRequests: cleanList(documentUploadRequests),
    };
  }

  function handleAnalyze() {
    const analysis = buildIntakeAnalysis();
    const narrative = buildNarrative();

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
      extra: {
        architectureMode: "unified-brain-handoff",
        sourceOfTruth: "courtSimplifiedBrain",
        filedDocuments,
        issues,
        childrenInfo,
        currentLivingSituation,
        pastLivingHistory,
        safetyConcerns,
        propertyHomeDetails,
        upcomingCourtDate,
        uploadedEvidenceFiles,
      },
    };

    localStorage.setItem("caseData", JSON.stringify(payload));
    localStorage.setItem("courtSimplifiedCase", JSON.stringify(payload));
    onComplete(analysis, payload);
  }

  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-2xl font-bold text-[#10231f]">Family Intake</h2>

      <p className="mt-3 text-[#4d675f]">
        Build a complete family-law case record. This intake captures parenting,
        support, property, disclosure, safety, urgency, evidence, and procedural
        posture for the unified CourtSimplified legal brain.
      </p>

      <div className="mt-6 grid gap-5">
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
          className="rounded-2xl bg-[#2f7d67] px-6 py-3 font-semibold text-white"
        >
          Continue to Unified Analysis
        </button>
      </div>
    </section>
  );
}