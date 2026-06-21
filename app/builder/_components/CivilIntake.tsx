"use client";

import { useState } from "react";
import {
  AnalysisResult,
  StoredCaseData,
  UniversalStage,
  cleanList,
  getStageLabel,
  hasMeaningfulText,
} from "./builderTypes";

import {
  runCivilMasterCaseEngine,
  type CivilMasterCaseResult,
} from "../../../src/lib/case-system/civilMasterCaseEngine";

import type { EvidenceItem } from "../../../src/lib/case-system/evidenceEngine";

type EvidenceFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  title: string;
  description: string;
  relatedIssue: string;
  evidenceDate: string;
  createdBy: string;
  whyItMatters: string;
};

type Props = {
  onComplete: (analysis: AnalysisResult, payload: StoredCaseData) => void;
};

type CivilIssue =
  | "contract"
  | "negligence"
  | "institutional-negligence"
  | "professional-negligence"
  | "human-rights"
  | "disability-accommodation"
  | "employment-human-rights"
  | "housing-human-rights"
  | "education-human-rights"
  | "charter"
  | "government-public-authority"
  | "police-conduct"
  | "judicial-review"
  | "tribunal-overlap"
  | "defamation"
  | "privacy"
  | "property"
  | "debt"
  | "employment"
  | "fraud-misrepresentation"
  | "intentional-tort"
  | "injunction"
  | "estate"
  | "motion"
  | "appeal"
  | "enforcement"
  | "other";

type CivilDocument =
  | "statement-claim"
  | "statement-defence"
  | "notice-application"
  | "notice-motion"
  | "affidavit-service"
  | "affidavit"
  | "order"
  | "judgment"
  | "tribunal-application"
  | "human-rights-application"
  | "judicial-review-materials"
  | "demand-letter"
  | "discovery"
  | "trial-record"
  | "nothing"
  | "not-sure";

type CivilInput = {
  caseStage: UniversalStage;
  issues: CivilIssue[];
  documents: CivilDocument[];
  uploadedEvidenceFiles: EvidenceFile[];
  yourName: string;
  otherParty: string;
  yourRole: string;
  courtLocation: string;
  courtFileNumber: string;
  amountClaimed: string;
  limitationDeadline: string;
  facts: string;
  timeline: string;
  evidence: string;
  missingEvidence: string;
  damagesBreakdown: string;
  legalRemedy: string;
  settlementEfforts: string;
  serviceDetails: string;
  urgent: string;
  humanRightsGrounds: string;
  discriminationFacts: string;
  accommodationRequests: string;
  governmentActor: string;
  publicDecisionOrConduct: string;
  institutionalFacts: string;
  privacyRecordsFacts: string;
};

const defaultInput: CivilInput = {
  caseStage: "not-sure",
  issues: [],
  documents: [],
  uploadedEvidenceFiles: [],
  yourName: "",
  otherParty: "",
  yourRole: "",
  courtLocation: "",
  courtFileNumber: "",
  amountClaimed: "",
  limitationDeadline: "",
  facts: "",
  timeline: "",
  evidence: "",
  missingEvidence: "",
  damagesBreakdown: "",
  legalRemedy: "",
  settlementEfforts: "",
  serviceDetails: "",
  urgent: "",
  humanRightsGrounds: "",
  discriminationFacts: "",
  accommodationRequests: "",
  governmentActor: "",
  publicDecisionOrConduct: "",
  institutionalFacts: "",
  privacyRecordsFacts: "",
};

const issueOptions: { value: CivilIssue; label: string }[] = [
  { value: "contract", label: "Contract / agreement dispute" },
  { value: "negligence", label: "Negligence / harm / damages" },
  { value: "institutional-negligence", label: "Institutional negligence / system failure" },
  { value: "professional-negligence", label: "Professional negligence" },
  { value: "human-rights", label: "Human Rights / discrimination" },
  { value: "disability-accommodation", label: "Disability accommodation issue" },
  { value: "employment-human-rights", label: "Employment discrimination / accommodation" },
  { value: "housing-human-rights", label: "Housing discrimination" },
  { value: "education-human-rights", label: "School / education discrimination" },
  { value: "charter", label: "Charter / constitutional issue" },
  { value: "government-public-authority", label: "Government / public authority conduct" },
  { value: "police-conduct", label: "Police / law enforcement conduct" },
  { value: "judicial-review", label: "Judicial review / review of decision" },
  { value: "tribunal-overlap", label: "Tribunal and court overlap" },
  { value: "defamation", label: "Defamation / reputational harm" },
  { value: "privacy", label: "Privacy / records / disclosure issue" },
  { value: "property", label: "Property / land / possession issue" },
  { value: "debt", label: "Debt / money owed" },
  { value: "employment", label: "Employment-related civil issue" },
  { value: "fraud-misrepresentation", label: "Fraud / misrepresentation" },
  { value: "intentional-tort", label: "Intentional harm / harassment / assault-related civil issue" },
  { value: "injunction", label: "Injunction / urgent court order" },
  { value: "estate", label: "Estate / probate / trust issue" },
  { value: "motion", label: "Motion in an existing case" },
  { value: "appeal", label: "Appeal / leave to appeal" },
  { value: "enforcement", label: "Enforcement / collection after judgment" },
  { value: "other", label: "Other civil issue" },
];

const documentOptions: { value: CivilDocument; label: string }[] = [
  { value: "statement-claim", label: "Statement of Claim already filed / served" },
  { value: "statement-defence", label: "Statement of Defence already filed / received" },
  { value: "notice-application", label: "Notice of Application already filed / received" },
  { value: "notice-motion", label: "Notice of Motion already filed / received" },
  { value: "affidavit-service", label: "Affidavit of Service completed" },
  { value: "affidavit", label: "Affidavit already prepared" },
  { value: "tribunal-application", label: "Tribunal application already started" },
  { value: "human-rights-application", label: "Human Rights application already started" },
  { value: "judicial-review-materials", label: "Judicial review materials started" },
  { value: "demand-letter", label: "Demand letter / warning letter sent" },
  { value: "order", label: "Order already made" },
  { value: "judgment", label: "Judgment already obtained" },
  { value: "discovery", label: "Discovery / Affidavit of Documents started" },
  { value: "trial-record", label: "Trial record / trial materials started" },
  { value: "nothing", label: "Nothing filed yet" },
  { value: "not-sure", label: "Not sure" },
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

function labelsFromValues<T extends string>(
  selected: T[],
  options: { value: T; label: string }[],
): string[] {
  return cleanList(
    selected.map((value) => options.find((option) => option.value === value)?.label || value),
  );
}

function buildCivilNarrative(input: CivilInput): string {
  return cleanList([
    `Court path: Civil`,
    `Stage: ${getStageLabel(input.caseStage)}`,
    input.yourName ? `User / party name: ${input.yourName}` : "",
    input.otherParty ? `Other party: ${input.otherParty}` : "",
    input.yourRole ? `User role: ${input.yourRole}` : "",
    input.courtLocation ? `Court or tribunal location: ${input.courtLocation}` : "",
    input.courtFileNumber ? `File number: ${input.courtFileNumber}` : "",
    input.amountClaimed ? `Amount claimed or disputed: ${input.amountClaimed}` : "",
    input.limitationDeadline ? `Limitation or deadline concern: ${input.limitationDeadline}` : "",
    input.issues.length ? `Selected issue signals: ${labelsFromValues(input.issues, issueOptions).join("; ")}` : "",
    input.documents.length ? `Existing document signals: ${labelsFromValues(input.documents, documentOptions).join("; ")}` : "",
    input.facts ? `Main story: ${input.facts}` : "",
    input.timeline ? `Timeline: ${input.timeline}` : "",
    input.evidence ? `Known evidence: ${input.evidence}` : "",
    input.missingEvidence ? `Missing evidence: ${input.missingEvidence}` : "",
    input.damagesBreakdown ? `Damages / impact: ${input.damagesBreakdown}` : "",
    input.legalRemedy ? `Requested remedy: ${input.legalRemedy}` : "",
    input.settlementEfforts ? `Settlement efforts: ${input.settlementEfforts}` : "",
    input.serviceDetails ? `Service details: ${input.serviceDetails}` : "",
    input.urgent ? `Urgent concerns: ${input.urgent}` : "",
    input.humanRightsGrounds ? `Human Rights ground: ${input.humanRightsGrounds}` : "",
    input.discriminationFacts ? `Discrimination facts: ${input.discriminationFacts}` : "",
    input.accommodationRequests ? `Accommodation requests: ${input.accommodationRequests}` : "",
    input.governmentActor ? `Government / public actor: ${input.governmentActor}` : "",
    input.publicDecisionOrConduct ? `Public decision or conduct: ${input.publicDecisionOrConduct}` : "",
    input.institutionalFacts ? `Institutional / professional facts: ${input.institutionalFacts}` : "",
    input.privacyRecordsFacts ? `Privacy / records facts: ${input.privacyRecordsFacts}` : "",
    input.uploadedEvidenceFiles.length
      ? `Uploaded evidence files: ${input.uploadedEvidenceFiles
          .map((file) =>
            cleanList([
              file.name,
              file.title,
              file.description,
              file.relatedIssue,
              file.evidenceDate,
              file.createdBy,
              file.whyItMatters,
            ]).join(" | "),
          )
          .join("; ")}`
      : "",
  ]).join("\n");
}

function buildCivilFacts(input: CivilInput): string[] {
  return cleanList([
    input.facts,
    input.timeline ? `Timeline: ${input.timeline}` : "",
    input.evidence ? `Known evidence: ${input.evidence}` : "",
    input.missingEvidence ? `Missing evidence: ${input.missingEvidence}` : "",
    input.damagesBreakdown ? `Damages / impact: ${input.damagesBreakdown}` : "",
    input.settlementEfforts ? `Settlement efforts: ${input.settlementEfforts}` : "",
    input.serviceDetails ? `Service details: ${input.serviceDetails}` : "",
    input.urgent ? `Urgency: ${input.urgent}` : "",
    input.humanRightsGrounds ? `Human Rights ground: ${input.humanRightsGrounds}` : "",
    input.discriminationFacts ? `Discrimination facts: ${input.discriminationFacts}` : "",
    input.accommodationRequests ? `Accommodation requests: ${input.accommodationRequests}` : "",
    input.governmentActor ? `Government/public actor: ${input.governmentActor}` : "",
    input.publicDecisionOrConduct ? `Public decision/conduct: ${input.publicDecisionOrConduct}` : "",
    input.institutionalFacts ? `Institutional/professional facts: ${input.institutionalFacts}` : "",
    input.privacyRecordsFacts ? `Privacy/records facts: ${input.privacyRecordsFacts}` : "",
  ]);
}

function buildCivilEvidenceItems(input: CivilInput): EvidenceItem[] {
  const uploadedItems = input.uploadedEvidenceFiles.map((file, index) => ({
    id: file.id || `civil_uploaded_${index + 1}`,
    title: file.title || file.name,
    description: cleanList([
      file.description,
      file.whyItMatters ? `Why it matters: ${file.whyItMatters}` : "",
      file.createdBy ? `Created/provided by: ${file.createdBy}` : "",
      file.type ? `File type: ${file.type}` : "",
      file.size ? `File size: ${formatFileSize(file.size)}` : "",
    ]).join(" "),
    category: "uploaded-civil-evidence",
    relevance: file.whyItMatters,
    relatedIssue: file.relatedIssue,
    relatedLegalElement: file.relatedIssue,
    source: file.createdBy || file.name,
    date: file.evidenceDate,
    content: file.description || file.whyItMatters || file.name,
    label: file.title || file.name,
    fileName: file.name,
    fileType: file.type,
  }));

  const describedEvidence = hasMeaningfulText(input.evidence)
    ? [
        {
          id: "civil_described_evidence",
          title: "Described civil evidence",
          description: input.evidence,
          category: "described-evidence",
          relevance: "User described this as known evidence.",
          relatedIssue: labelsFromValues(input.issues, issueOptions).join(", "),
          relatedLegalElement: "general proof",
          source: "intake",
          date: "",
          content: input.evidence,
          label: "Described civil evidence",
          fileName: "",
          fileType: "text",
        },
      ]
    : [];

  return [...uploadedItems, ...describedEvidence] as EvidenceItem[];
}

function buildCivilMasterResult(input: CivilInput): CivilMasterCaseResult {
  const issueLabels = labelsFromValues(input.issues, issueOptions);
  const documentLabels = labelsFromValues(input.documents, documentOptions);

  return runCivilMasterCaseEngine({
    title: cleanList([input.yourName, input.otherParty, "Civil Case"]).join(" v. "),
    summary: buildCivilNarrative(input),
    stage: getStageLabel(input.caseStage),
    selectedIssues: issueLabels,
    requestedRemedies: cleanList([input.legalRemedy, input.amountClaimed]),
    facts: buildCivilFacts(input),
    evidenceItems: buildCivilEvidenceItems(input),
    timeline: [] as never,
    liabilityTheories: [],
    existingRisks: [],
    existingForms: [],
  });
}

function buildCivilAnalysisFromMaster(
  input: CivilInput,
  masterResult: CivilMasterCaseResult,
): AnalysisResult {
  const masterCase = masterResult.masterCase;

  const completedForms = labelsFromValues(
    input.documents.filter((doc) => doc !== "nothing" && doc !== "not-sure"),
    documentOptions,
  );

  const receivedForms = completedForms;

  const requiredNextForms = cleanList([
    ...masterCase.formNeeds.map((form) => form.title),
    ...masterResult.formRouting.requiredNow.map((form) => form.title),
    ...masterResult.formRouting.recommendedNow.map((form) => form.title),
  ]);

  const risksAndGaps = cleanList([
    ...masterCase.risks.map((risk) => `${risk.title}: ${risk.description}`),
    ...masterCase.missingInformation,
    ...masterResult.strategy.weakestAreas,
  ]);

  const proceduralRisks = cleanList([
    ...masterCase.risks
      .filter((risk) => risk.source === "procedure")
      .map((risk) => `${risk.title}: ${risk.description}`),
    ...masterCase.procedureProfile.limitationConcerns,
    ...masterCase.procedureProfile.jurisdictionConcerns,
    ...masterCase.procedureProfile.readinessWarnings,
  ]);

  const damagesIssues = cleanList([
    ...masterCase.damagesProfile.financialLosses,
    ...masterCase.damagesProfile.emotionalHarms,
    ...masterCase.damagesProfile.reputationalHarms,
    ...masterCase.damagesProfile.physicalHarms,
    ...masterCase.damagesProfile.causationConcerns,
    ...masterCase.damagesProfile.damagesProofMissing,
  ]);

  const defenceAttacks = cleanList([
    ...masterResult.strategy.likelyDefenceArguments,
    ...masterCase.narrativeProfile.defenceVulnerabilities,
  ]);

  const judgeConcerns = cleanList([
    ...masterResult.strategy.likelyJudgeConcerns,
    ...masterCase.narrativeProfile.judicialConcerns,
    ...masterCase.readiness.blockers,
  ]);

  const suggestedFocus = cleanList([
    ...masterResult.dashboardSummary.immediateNextSteps,
    ...masterResult.strategy.tacticalNextMoves,
    ...masterResult.strategy.readinessStrategy,
  ]);

  const documentUploadRequests = cleanList([
    ...masterCase.caseFileCatalog.missingCriticalDocuments,
    ...masterCase.evidenceProfile.missingEvidence,
    ...masterCase.caseFileCatalog.nextDocumentActions,
  ]);

  const inferredFacts = cleanList([
    `Readiness level: ${masterCase.readiness.level} (${masterCase.readiness.score}/100).`,
    `Procedural track: ${masterCase.procedureProfile.proceduralTrack}.`,
    masterCase.civilCaseTypes.length
      ? `Detected civil path: ${masterCase.civilCaseTypes.join(", ")}.`
      : "",
    masterResult.strategy.strongestTheories.length
      ? `Strongest theories: ${masterResult.strategy.strongestTheories.join(", ")}.`
      : "",
    input.amountClaimed ? `Amount claimed or disputed: ${input.amountClaimed}.` : "",
    input.limitationDeadline ? `Limitation/deadline issue: ${input.limitationDeadline}.` : "",
    input.uploadedEvidenceFiles.length
      ? `${input.uploadedEvidenceFiles.length} uploaded evidence file(s) captured.`
      : "",
  ]);

  const guidance = cleanList([
    ...masterCase.nextSteps,
    ...masterResult.strategy.readinessStrategy,
    ...masterResult.strategy.draftingWarnings,
  ]);

  const summary = [
    "Civil Litigation Analysis",
    "",
    `Readiness: ${masterCase.readiness.level} (${masterCase.readiness.score}/100)`,
    `Procedural track: ${masterCase.procedureProfile.proceduralTrack}`,
    "",
    "Strongest theories:",
    masterResult.strategy.strongestTheories.map((item) => `- ${item}`).join("\n") ||
      "- No strongest theory identified yet",
    "",
    "Immediate risks:",
    risksAndGaps.slice(0, 10).map((item) => `- ${item}`).join("\n") ||
      "- No major risks detected",
    "",
    "Likely defence attacks:",
    defenceAttacks.slice(0, 10).map((item) => `- ${item}`).join("\n") ||
      "- No defence attacks generated",
    "",
    "Judge concerns:",
    judgeConcerns.slice(0, 10).map((item) => `- ${item}`).join("\n") ||
      "- No judge concerns generated",
    "",
    "Recommended next documents / packages:",
    requiredNextForms.slice(0, 10).map((item) => `- ${item}`).join("\n") ||
      "- No form recommendations generated",
    "",
    "Next focus:",
    suggestedFocus.slice(0, 10).map((item) => `- ${item}`).join("\n") ||
      "- No next focus generated",
  ].join("\n");

  return {
    courtPath: "civil",
    caseStage: getStageLabel(input.caseStage),
    completedForms,
    receivedForms,
    requiredNextForms,
    notNeededNow: masterResult.formRouting.notNeededNow.map((form) => form.title),
    detectedIssues: cleanList([
      ...labelsFromValues(input.issues, issueOptions),
      ...masterCase.civilCaseTypes,
    ]),
    inferredFacts,
    missingInformation: masterCase.missingInformation,
    risksAndGaps,
    guidance,
    summary,
    proceduralRisks,
    damagesIssues,
    defenceAttacks,
    judgeConcerns,
    suggestedFocus,
    documentUploadRequests,
  };
}

export default function CivilIntake({ onComplete }: Props) {
  const [input, setInput] = useState<CivilInput>(defaultInput);

  function updateField<K extends keyof CivilInput>(field: K, value: CivilInput[K]) {
    setInput((current) => ({ ...current, [field]: value }));
  }

  function updateEvidenceFile(fileId: string, field: keyof EvidenceFile, value: string) {
    setInput((current) => ({
      ...current,
      uploadedEvidenceFiles: current.uploadedEvidenceFiles.map((file) =>
        file.id === fileId ? { ...file, [field]: value } : file,
      ),
    }));
  }

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
      relatedIssue: "",
      evidenceDate: "",
      createdBy: "",
      whyItMatters: "",
    }));

    setInput((current) => {
      const existingIds = new Set(current.uploadedEvidenceFiles.map((file) => file.id));
      const newUniqueFiles = nextFiles.filter((file) => !existingIds.has(file.id));

      return {
        ...current,
        uploadedEvidenceFiles: [...current.uploadedEvidenceFiles, ...newUniqueFiles],
      };
    });
  }

  function removeEvidenceFile(fileId: string) {
    setInput((current) => ({
      ...current,
      uploadedEvidenceFiles: current.uploadedEvidenceFiles.filter((file) => file.id !== fileId),
    }));
  }

  function handleAnalyze() {
    const masterResult = buildCivilMasterResult(input);
    const analysis = buildCivilAnalysisFromMaster(input, masterResult);
    const narrative = buildCivilNarrative(input);

    const payload: StoredCaseData = {
      courtPath: "civil",
      pathLabel: "Civil",
      caseStage: input.caseStage,
      yourName: input.yourName,
      otherParty: input.otherParty,
      facts: narrative,
      timeline: input.timeline,
      evidence: input.evidence,
      missingEvidence: input.missingEvidence,
      goal: input.legalRemedy,
      urgent: input.urgent,
      analysis,
      extra: {
        architectureMode: "civil-master-engine-connected",
        sourceOfTruth: "civilMasterCaseEngine",
        civilInput: input,
        civilMasterResult: masterResult,
        civilMasterCase: masterResult.masterCase,
        civilDashboardSummary: masterResult.dashboardSummary,
        civilStrategy: masterResult.strategy,
        civilWorkflow: masterResult.workflow,
        civilEvidence: masterResult.evidence,
        civilNarrative: masterResult.narrative,
        civilFormRouting: masterResult.formRouting,
        issues: input.issues,
        documents: input.documents,
        uploadedEvidenceFiles: input.uploadedEvidenceFiles,
        yourRole: input.yourRole,
        courtLocation: input.courtLocation,
        courtFileNumber: input.courtFileNumber,
        amountClaimed: input.amountClaimed,
        limitationDeadline: input.limitationDeadline,
        damagesBreakdown: input.damagesBreakdown,
        legalRemedy: input.legalRemedy,
        settlementEfforts: input.settlementEfforts,
        serviceDetails: input.serviceDetails,
        humanRightsGrounds: input.humanRightsGrounds,
        discriminationFacts: input.discriminationFacts,
        accommodationRequests: input.accommodationRequests,
        governmentActor: input.governmentActor,
        publicDecisionOrConduct: input.publicDecisionOrConduct,
        institutionalFacts: input.institutionalFacts,
        privacyRecordsFacts: input.privacyRecordsFacts,
      },
    };

    localStorage.setItem("caseData", JSON.stringify(payload));
    localStorage.setItem("courtSimplifiedCase", JSON.stringify(payload));
    onComplete(analysis, payload);
  }

  return (
    <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-2xl font-bold text-[#10231f]">Civil Intake</h2>

      <p className="mt-3 text-[#4d675f]">
        Tell the full civil case story once. CourtSimplified will preserve the
        facts for the unified legal brain so the system can analyze issues,
        evidence, procedure, documents, risks, and next steps from one source of
        truth.
      </p>

      <div className="mt-6 grid gap-5">
        <label className="block">
          <span className="font-semibold text-[#16302b]">Case stage</span>
          <select
            value={input.caseStage}
            onChange={(e) => updateField("caseStage", e.target.value as UniversalStage)}
            className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white px-4 py-3"
          >
            <option value="not-sure">Not sure</option>
            <option value="starting-case">Starting a new civil case</option>
            <option value="responding">Responding to a civil case</option>
            <option value="already-started">Case already started</option>
            <option value="conference">Conference / case management</option>
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
              value={input.yourName}
              onChange={(e) => updateField("yourName", e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Full legal name or business name"
            />
          </label>

          <label className="block">
            <span className="font-semibold text-[#16302b]">Other party</span>
            <input
              value={input.otherParty}
              onChange={(e) => updateField("otherParty", e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder="Person, business, institution, employer, landlord, school, police, government body"
            />
          </label>
        </div>

        <label className="block">
          <span className="font-semibold text-[#16302b]">Your role</span>
          <input
            value={input.yourRole}
            onChange={(e) => updateField("yourRole", e.target.value)}
            className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
            placeholder="Example: plaintiff, defendant, applicant, respondent, moving party"
          />
        </label>

        <div>
          <h3 className="font-semibold text-[#16302b]">What documents already exist?</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {documentOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  updateField("documents", toggleArrayValue(input.documents, option.value))
                }
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  input.documents.includes(option.value)
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
          <h3 className="font-semibold text-[#16302b]">What issues may be involved?</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {issueOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  updateField("issues", toggleArrayValue(input.issues, option.value))
                }
                className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                  input.issues.includes(option.value)
                    ? "border-[#2f7d67] bg-[#e9f7f2] text-[#16302b]"
                    : "border-[#d8e6df] bg-white text-[#4d675f]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {[
          ["courtLocation", "Court or tribunal location", "Example: Ottawa Superior Court, HRTO, Divisional Court, tribunal location"],
          ["courtFileNumber", "Court / tribunal file number, if already started", "Example: CV-25-00000000 or tribunal file number"],
          ["amountClaimed", "Amount claimed or disputed", "Example: $75,000 plus costs"],
          ["limitationDeadline", "Limitation/deadline concerns", "When did the issue happen? Any filing deadline?"],
          ["humanRightsGrounds", "Human Rights ground, if any", "Example: disability, race, sex, family status, age, creed, reprisal, accommodation"],
          ["discriminationFacts", "Discrimination / Human Rights facts", "What unequal treatment, denial, harassment, reprisal, or failure to accommodate happened?"],
          ["accommodationRequests", "Accommodation requests or responses", "What was requested, when, from whom, and what response was received?"],
          ["governmentActor", "Government / public authority involved", "Police, Crown, ministry, school board, hospital, tribunal, municipality, public institution"],
          ["publicDecisionOrConduct", "Government decision, policy, omission, or conduct", "What decision, process, omission, failure, or action is being challenged?"],
          ["institutionalFacts", "Institutional / professional failure facts", "What did the organization or professional know, fail to do, fail to record, or fail to communicate?"],
          ["privacyRecordsFacts", "Privacy / records facts", "What record was accessed, disclosed, withheld, misused, altered, or requested?"],
          ["facts", "What happened?", "Explain the full story in your own words."],
          ["timeline", "Timeline", "Important dates in order."],
          ["evidence", "Evidence you have", "Contracts, texts, emails, photos, records, receipts, witnesses, policies, reports, decisions."],
          ["missingEvidence", "Evidence still missing", "Documents, records, witnesses, disclosure, policies, recordings, or proof still needed."],
          ["damagesBreakdown", "Damages / loss / impact breakdown", "Money loss, harm, expenses, discrimination impacts, reputational harm, emotional impact, lost opportunity, records harm."],
          ["legalRemedy", "What do you want ordered?", "Money, declaration, injunction, accommodation, correction of records, dismissal, order, costs, tribunal remedy."],
          ["settlementEfforts", "Settlement efforts", "Offers, letters, discussions, refusals, payment proposals, accommodation discussions."],
          ["serviceDetails", "Service details", "Who was served, when, where, how, and by whom?"],
          ["urgent", "Anything urgent?", "Deadlines, injunction, ongoing harm, limitation issue, enforcement urgency, accommodation urgency."],
        ].map(([field, label, placeholder]) => (
          <label key={field} className="block">
            <span className="font-semibold text-[#16302b]">{label}</span>
            <textarea
              value={String(input[field as keyof CivilInput])}
              onChange={(e) =>
                updateField(field as keyof CivilInput, e.target.value as never)
              }
              className="mt-2 min-h-24 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
              placeholder={placeholder}
            />
          </label>
        ))}

        <div className="rounded-3xl border border-dashed border-[#b8d8cc] bg-[#f8fcfa] p-5">
          <h3 className="text-lg font-bold text-[#10231f]">
            Upload civil evidence files
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#4d675f]">
            Add contracts, screenshots, emails, PDFs, court documents, invoices,
            receipts, photos, government records, accommodation records, policies,
            medical records, police records, school records, tribunal documents,
            or other civil evidence.
          </p>

          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-[#d8e6df] bg-white px-4 py-6 text-center hover:bg-[#f4fbf8]">
            <span className="font-semibold text-[#2f7d67]">
              Choose civil evidence files
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

          {input.uploadedEvidenceFiles.length > 0 && (
            <div className="mt-5">
              <h4 className="font-semibold text-[#16302b]">
                Selected evidence files
              </h4>

              <div className="mt-3 grid gap-4">
                {input.uploadedEvidenceFiles.map((file) => (
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

                    <div className="mt-4 grid gap-4">
                      <label className="block">
                        <span className="text-sm font-semibold text-[#16302b]">
                          Evidence title
                        </span>
                        <input
                          value={file.title}
                          onChange={(e) => updateEvidenceFile(file.id, "title", e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
                          placeholder="Example: Accommodation denial email"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-semibold text-[#16302b]">
                          Description
                        </span>
                        <textarea
                          value={file.description}
                          onChange={(e) => updateEvidenceFile(file.id, "description", e.target.value)}
                          className="mt-2 min-h-20 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
                          placeholder="What is this file? What does it show?"
                        />
                      </label>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="text-sm font-semibold text-[#16302b]">
                            Related issue
                          </span>
                          <input
                            value={file.relatedIssue}
                            onChange={(e) => updateEvidenceFile(file.id, "relatedIssue", e.target.value)}
                            className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
                            placeholder="Example: Human Rights, contract, negligence, damages, privacy"
                          />
                        </label>

                        <label className="block">
                          <span className="text-sm font-semibold text-[#16302b]">
                            Date or event connected to this file
                          </span>
                          <input
                            value={file.evidenceDate}
                            onChange={(e) => updateEvidenceFile(file.id, "evidenceDate", e.target.value)}
                            className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
                            placeholder="Example: March 12, 2026"
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span className="text-sm font-semibold text-[#16302b]">
                          Who created, sent, or provided it?
                        </span>
                        <input
                          value={file.createdBy}
                          onChange={(e) => updateEvidenceFile(file.id, "createdBy", e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
                          placeholder="Example: defendant, plaintiff, employer, school, tribunal, police, doctor"
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-semibold text-[#16302b]">
                          Why does it matter?
                        </span>
                        <textarea
                          value={file.whyItMatters}
                          onChange={(e) => updateEvidenceFile(file.id, "whyItMatters", e.target.value)}
                          className="mt-2 min-h-20 w-full rounded-2xl border border-[#d8e6df] px-4 py-3"
                          placeholder="Explain what this helps prove or why the court/tribunal may need to see it."
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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