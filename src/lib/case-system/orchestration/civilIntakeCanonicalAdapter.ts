import {
  runCivilMasterCaseEngine,
  type CivilMasterCaseResult,
} from "../civilMasterCaseEngine";
import type { EvidenceItem } from "../evidenceEngine";
import { runCourtSimplifiedBrain } from "../intelligence/courtSimplifiedBrain";
import type { CourtSimplifiedBrainOutput } from "../intelligence/intelligenceTypes";

export type CivilCanonicalStage =
  | "starting-case"
  | "responding"
  | "already-started"
  | "conference"
  | "motion"
  | "trial"
  | "enforcement"
  | "urgent"
  | "not-sure";

export type CivilCanonicalEvidenceFile = {
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

export type CivilCanonicalIntakeInput = {
  caseId?: string;
  caseStage: CivilCanonicalStage;
  issues: string[];
  documents: string[];
  uploadedEvidenceFiles: CivilCanonicalEvidenceFile[];
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

export type CivilCanonicalIntakeResult = {
  courtPath: "civil";
  province: "Ontario";
  stage: CivilCanonicalStage;
  role: string;
  civilMasterResult: CivilMasterCaseResult;
  brain: CourtSimplifiedBrainOutput;
  masterResultPatch: Record<string, unknown>;
  dashboardPatch: Record<string, unknown>;
  recommendedNextRoute?: string;
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function cleanList(values: unknown[]): string[] {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

const issueLabels: Record<string, string> = {
  contract: "Contract / agreement dispute",
  negligence: "Negligence / harm / damages",
  "institutional-negligence": "Institutional negligence / system failure",
  "professional-negligence": "Professional negligence",
  "human-rights": "Human Rights / discrimination",
  "disability-accommodation": "Disability accommodation issue",
  "employment-human-rights": "Employment discrimination / accommodation",
  "housing-human-rights": "Housing discrimination",
  "education-human-rights": "School / education discrimination",
  charter: "Charter / constitutional issue",
  "government-public-authority": "Government / public authority conduct",
  "police-conduct": "Police / law enforcement conduct",
  "judicial-review": "Judicial review / review of decision",
  "tribunal-overlap": "Tribunal and court overlap",
  defamation: "Defamation / reputational harm",
  privacy: "Privacy / records / disclosure issue",
  property: "Property / land / possession issue",
  debt: "Debt / money owed",
  employment: "Employment-related civil issue",
  "fraud-misrepresentation": "Fraud / misrepresentation",
  "intentional-tort": "Intentional harm / harassment / assault-related civil issue",
  injunction: "Injunction / urgent court order",
  estate: "Estate / probate / trust issue",
  motion: "Motion in an existing case",
  appeal: "Appeal / leave to appeal",
  enforcement: "Enforcement / collection after judgment",
  other: "Other civil issue",
};

const documentLabels: Record<string, string> = {
  "statement-claim": "Statement of Claim already filed / served",
  "statement-defence": "Statement of Defence already filed / received",
  "notice-application": "Notice of Application already filed / received",
  "notice-motion": "Notice of Motion already filed / received",
  "affidavit-service": "Affidavit of Service completed",
  affidavit: "Affidavit already prepared",
  "tribunal-application": "Tribunal application already started",
  "human-rights-application": "Human Rights application already started",
  "judicial-review-materials": "Judicial review materials started",
  "demand-letter": "Demand letter / warning letter sent",
  order: "Order already made",
  judgment: "Judgment already obtained",
  discovery: "Discovery / Affidavit of Documents started",
  "trial-record": "Trial record / trial materials started",
  nothing: "Nothing filed yet",
  "not-sure": "Not sure",
};

function labels(values: string[], mapping: Record<string, string>): string[] {
  return values.map((value) => mapping[value] || value);
}

function buildUploadNarrative(input: CivilCanonicalIntakeInput): string {
  return input.uploadedEvidenceFiles
    .map((file) =>
      cleanList([
        `id=${file.id}`,
        `name=${file.name}`,
        `size=${file.size}`,
        `type=${file.type}`,
        `lastModified=${file.lastModified}`,
        `title=${file.title}`,
        `description=${file.description}`,
        `relatedIssue=${file.relatedIssue}`,
        `evidenceDate=${file.evidenceDate}`,
        `createdBy=${file.createdBy}`,
        `whyItMatters=${file.whyItMatters}`,
      ]).join(" | "),
    )
    .join("; ");
}

function buildNarrative(input: CivilCanonicalIntakeInput): string {
  return cleanList([
    "Court path: Civil",
    "Jurisdiction: Ontario",
    `Stage: ${input.caseStage}`,
    `User role: ${input.yourRole}`,
    input.yourName && `User / party name: ${input.yourName}`,
    input.otherParty && `Other party: ${input.otherParty}`,
    input.courtLocation && `Court location: ${input.courtLocation}`,
    input.courtFileNumber && `Court file number: ${input.courtFileNumber}`,
    input.amountClaimed && `Amount claimed or disputed: ${input.amountClaimed}`,
    input.limitationDeadline && `Limitation or deadline concern: ${input.limitationDeadline}`,
    input.issues.length && `Selected issues: ${labels(input.issues, issueLabels).join("; ")}`,
    input.documents.length &&
      `Existing documents: ${labels(input.documents, documentLabels).join("; ")}`,
    input.facts && `Facts: ${input.facts}`,
    input.timeline && `Timeline: ${input.timeline}`,
    input.evidence && `Known evidence: ${input.evidence}`,
    input.missingEvidence && `Missing evidence: ${input.missingEvidence}`,
    input.damagesBreakdown && `Damages / impact: ${input.damagesBreakdown}`,
    input.legalRemedy && `Requested remedy: ${input.legalRemedy}`,
    input.settlementEfforts && `Settlement efforts: ${input.settlementEfforts}`,
    input.serviceDetails && `Service details: ${input.serviceDetails}`,
    input.urgent && `Urgent concerns: ${input.urgent}`,
    input.humanRightsGrounds && `Human Rights ground: ${input.humanRightsGrounds}`,
    input.discriminationFacts && `Discrimination facts: ${input.discriminationFacts}`,
    input.accommodationRequests && `Accommodation requests: ${input.accommodationRequests}`,
    input.governmentActor && `Government / public actor: ${input.governmentActor}`,
    input.publicDecisionOrConduct && `Public decision or conduct: ${input.publicDecisionOrConduct}`,
    input.institutionalFacts && `Institutional / professional facts: ${input.institutionalFacts}`,
    input.privacyRecordsFacts && `Privacy / records facts: ${input.privacyRecordsFacts}`,
    input.uploadedEvidenceFiles.length &&
      `Uploaded evidence metadata: ${buildUploadNarrative(input)}`,
  ]).join("\n");
}

function buildEvidenceItems(input: CivilCanonicalIntakeInput): EvidenceItem[] {
  const uploaded = input.uploadedEvidenceFiles.map((file, index) => ({
    id: file.id || `civil_uploaded_${index + 1}`,
    title: file.title || file.name,
    description: cleanList([
      file.description,
      file.whyItMatters && `Why it matters: ${file.whyItMatters}`,
      file.createdBy && `Created/provided by: ${file.createdBy}`,
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

  if (!clean(input.evidence)) return uploaded as EvidenceItem[];
  return [
    ...uploaded,
    {
      id: "civil_described_evidence",
      title: "Described civil evidence",
      description: input.evidence,
      category: "described-evidence",
      relevance: "User described this as known evidence.",
      relatedIssue: input.issues.join(", "),
      relatedLegalElement: "general proof",
      source: "intake",
      date: "",
      content: input.evidence,
      label: "Described civil evidence",
      fileName: "",
      fileType: "text",
    } as EvidenceItem,
  ];
}

export async function runCivilIntakeCanonicalIntegration(
  input: CivilCanonicalIntakeInput,
  options: {
    allowExternalCognition?: boolean;
    existingMasterResult?: unknown;
  } = {},
): Promise<CivilCanonicalIntakeResult> {
  const narrative = buildNarrative(input);
  const civilMasterResult = runCivilMasterCaseEngine({
    caseId: input.caseId,
    title: cleanList([input.yourName, input.otherParty, "Civil Case"]).join(" v. "),
    summary: narrative,
    stage: input.caseStage,
    selectedIssues: labels(input.issues, issueLabels),
    requestedRemedies: cleanList([input.legalRemedy, input.amountClaimed]),
    facts: cleanList([input.facts, input.timeline, input.evidence, input.missingEvidence, input.damagesBreakdown]),
    evidenceItems: buildEvidenceItems(input),
    timeline: [],
    liabilityTheories: [],
    existingRisks: [],
    existingForms: [],
  });

  const brain = await runCourtSimplifiedBrain({
    caseId: input.caseId,
    courtPath: "civil",
    province: "Ontario",
    stage: input.caseStage,
    rawUserText: narrative,
    existingMasterResult: options.existingMasterResult || {},
    sourceType: "user-intake",
    allowExternalCognition: options.allowExternalCognition,
  });

  const masterResultPatch = {
    ...brain.masterResultPatch,
    civilMasterResult,
    civilMasterCase: civilMasterResult.masterCase,
    civilWorkflow: civilMasterResult.workflow,
    civilEvidence: civilMasterResult.evidence,
    civilFormRouting: civilMasterResult.formRouting,
    civilStrategy: civilMasterResult.strategy,
    civilNarrative: civilMasterResult.narrative,
    civilCaseFileCatalog: civilMasterResult.masterCase.caseFileCatalog,
    civilIntegration: {
      source: "civilIntakeCanonicalAdapter",
      specializedSource: "civilMasterCaseEngine",
      canonicalSource: "CourtSimplifiedBrain",
      courtPath: "civil",
      province: "Ontario",
      stage: input.caseStage,
      role: input.yourRole,
    },
  };

  return {
    courtPath: "civil",
    province: "Ontario",
    stage: input.caseStage,
    role: input.yourRole,
    civilMasterResult,
    brain,
    masterResultPatch,
    dashboardPatch: brain.dashboardPatch,
    recommendedNextRoute: brain.recommendedNextRoute,
  };
}
