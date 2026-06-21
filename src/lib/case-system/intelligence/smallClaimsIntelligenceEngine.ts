import {
  AnalysisResult,
  StoredCaseData,
  UniversalStage,
  cleanList,
  getStageLabel,
  mapIntelligenceToAnalysisPatch,
} from "../../../../app/builder/_components/builderTypes";

import { runCourtSimplifiedBrain } from "./courtSimplifiedBrain";

export type SmallClaimsIssue =
  | "unpaid-money"
  | "contract-dispute"
  | "property-damage"
  | "loan-or-debt"
  | "work-or-services"
  | "deposit-refund"
  | "consumer-purchase"
  | "vehicle-dispute"
  | "defamation-reputation"
  | "harassment-communications"
  | "defending-claim"
  | "settlement"
  | "enforcement"
  | "other";

export type SmallClaimsFiledDocument =
  | "plaintiffs-claim"
  | "defence"
  | "affidavit-service"
  | "offer-settle"
  | "settlement-conference"
  | "default-judgment"
  | "witness-list"
  | "enforcement-documents"
  | "nothing"
  | "not-sure";

export type SmallClaimsEvidenceFile = {
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

export type SmallClaimsIntelligenceInput = {
  caseStage: UniversalStage;
  issues: SmallClaimsIssue[];
  filedDocuments: SmallClaimsFiledDocument[];
  uploadedEvidenceFiles: SmallClaimsEvidenceFile[];

  yourName: string;
  yourAddress: string;
  yourCity: string;
  yourProvince: string;
  yourPostalCode: string;
  yourPhone: string;
  yourEmail: string;

  otherParty: string;
  otherPartyPhone: string;
  otherPartyEmail: string;

  yourRole: string;
  courtLocation: string;
  claimNumber: string;
  amountClaimed: string;
  defendantAddress: string;
  agreementDetails: string;
  paymentHistory: string;
  damagesBreakdown: string;
  serviceDetails: string;
  deadlineDetails: string;
  facts: string;
  timeline: string;
  evidence: string;
  missingEvidence: string;
  settlementEfforts: string;
  defenceResponse: string;
  goal: string;
  urgent: string;
};

type SmallClaimsIntelligenceOutput = {
  analysis: AnalysisResult;
  payload: StoredCaseData;
  masterResultPatch: Record<string, unknown>;
  dashboardPatch: Record<string, unknown>;
  recommendedNextRoute?: string;
};

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function issueLabel(issue: SmallClaimsIssue): string {
  const labels: Record<SmallClaimsIssue, string> = {
    "unpaid-money": "Unpaid money / invoice",
    "contract-dispute": "Contract or agreement dispute",
    "property-damage": "Physical property damage",
    "loan-or-debt": "Loan or debt",
    "work-or-services": "Work, services, or renovation dispute",
    "deposit-refund": "Deposit or refund dispute",
    "consumer-purchase": "Consumer purchase issue",
    "vehicle-dispute": "Vehicle-related dispute",
    "defamation-reputation": "Defamation / reputational harm",
    "harassment-communications": "Harassment or harmful communications",
    "defending-claim": "Defending a Small Claims case",
    settlement: "Settlement / offer to settle",
    enforcement: "Enforcement / collecting judgment",
    other: "Other Small Claims issue",
  };

  return labels[issue];
}

function filedDocumentLabel(document: SmallClaimsFiledDocument): string {
  const labels: Record<SmallClaimsFiledDocument, string> = {
    "plaintiffs-claim": "Form 7A — Plaintiff's Claim",
    defence: "Form 9A — Defence",
    "affidavit-service": "Form 8A — Affidavit of Service",
    "offer-settle": "Form 14A — Offer to Settle",
    "settlement-conference": "Settlement conference scheduled or completed",
    "default-judgment": "Default judgment step started",
    "witness-list": "Witness list prepared",
    "enforcement-documents": "Enforcement documents started",
    nothing: "Nothing filed yet",
    "not-sure": "Not sure what has been filed",
  };

  return labels[document];
}

function userIsResponding(input: SmallClaimsIntelligenceInput): boolean {
  const role = normalizeText(input.yourRole);
  const facts = normalizeText(
    [
      input.facts,
      input.defenceResponse,
      input.serviceDetails,
      input.deadlineDetails,
      input.goal,
    ].join(" "),
  );

  if (input.caseStage === "responding") return true;
  if (input.issues.includes("defending-claim")) return true;
  if (input.filedDocuments.includes("defence")) return false;

  return (
    role.includes("defendant") ||
    role.includes("respondent") ||
    role.includes("responding") ||
    role.includes("defending") ||
    facts.includes("i was served") ||
    facts.includes("served with a claim") ||
    facts.includes("defend the claim") ||
    facts.includes("defending a claim")
  );
}

function userIsPlaintiffStarting(input: SmallClaimsIntelligenceInput): boolean {
  if (userIsResponding(input)) return false;

  const role = normalizeText(input.yourRole);
  const facts = normalizeText([input.facts, input.goal].join(" "));

  return (
    input.caseStage === "starting-case" ||
    role.includes("plaintiff") ||
    role.includes("claimant") ||
    facts.includes("i want to sue") ||
    facts.includes("i am suing") ||
    facts.includes("start a claim") ||
    facts.includes("file a claim")
  );
}

function determineProceduralStage(input: SmallClaimsIntelligenceInput): UniversalStage {
  if (input.caseStage !== "not-sure") return input.caseStage;

  if (input.filedDocuments.includes("enforcement-documents")) return "enforcement";
  if (input.issues.includes("enforcement")) return "enforcement";
  if (input.filedDocuments.includes("settlement-conference")) return "conference";
  if (userIsResponding(input)) return "responding";
  if (input.filedDocuments.includes("plaintiffs-claim")) return "already-started";

  return "starting-case";
}

function buildRawUserText(input: SmallClaimsIntelligenceInput): string {
  const evidenceFiles = input.uploadedEvidenceFiles.map((file) =>
    [
      `Evidence file: ${file.name}`,
      file.title ? `Title: ${file.title}` : "",
      file.category ? `Category: ${file.category}` : "",
      file.evidenceDate ? `Date: ${file.evidenceDate}` : "",
      file.source ? `Source: ${file.source}` : "",
      file.description ? `Description: ${file.description}` : "",
      file.relevance ? `Relevance: ${file.relevance}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    "Small Claims Ontario intake",
    `Stage selected: ${getStageLabel(input.caseStage)}`,
    `Selected issue hints: ${input.issues.map(issueLabel).join(", ") || "None selected"}`,
    `Filed or received documents: ${
      input.filedDocuments.map(filedDocumentLabel).join(", ") || "None selected"
    }`,
    `User role: ${input.yourRole || "not entered"}`,
    `User name: ${input.yourName}`,
    `Other party: ${input.otherParty}`,
    `Court location: ${input.courtLocation}`,
    `Claim number: ${input.claimNumber}`,
    `Amount claimed or disputed: ${input.amountClaimed}`,
    `Damages breakdown: ${input.damagesBreakdown}`,
    `Agreement details, only if relevant: ${input.agreementDetails}`,
    `Payment history, only if relevant: ${input.paymentHistory}`,
    `Service details: ${input.serviceDetails}`,
    `Deadline details: ${input.deadlineDetails}`,
    `Facts: ${input.facts}`,
    `Timeline: ${input.timeline}`,
    `Evidence described: ${input.evidence}`,
    `Missing evidence: ${input.missingEvidence}`,
    `Settlement efforts: ${input.settlementEfforts}`,
    `Defence response, only if this is a responding/defence case: ${input.defenceResponse}`,
    `Goal / requested outcome: ${input.goal}`,
    `Urgent concerns: ${input.urgent}`,
    ...evidenceFiles,
  ]
    .filter((line) => line.trim().length > 0)
    .join("\n\n");
}

function buildCompletedForms(input: SmallClaimsIntelligenceInput): string[] {
  return cleanList(
    input.filedDocuments
      .filter((item) =>
        ["plaintiffs-claim", "affidavit-service", "offer-settle", "witness-list"].includes(item),
      )
      .map(filedDocumentLabel),
  );
}

function buildReceivedForms(input: SmallClaimsIntelligenceInput): string[] {
  return cleanList(
    input.filedDocuments.filter((item) => item === "defence").map(filedDocumentLabel),
  );
}

function buildNotNeededNow(
  input: SmallClaimsIntelligenceInput,
  stage: UniversalStage,
): string[] {
  const notNeeded: string[] = [];
  const responding = userIsResponding(input);

  if (responding) {
    notNeeded.push("Form 7A — Plaintiff's Claim unless you are starting your own separate claim");
  }

  if (!responding) {
    notNeeded.push("Form 9A — Defence unless you were served with someone else's claim");
  }

  if (stage === "conference" || stage === "trial" || stage === "enforcement") {
    notNeeded.push("New starting claim forms unless the case has not already been started");
  }

  if (stage === "enforcement") {
    notNeeded.push("Starting forms unless there is a separate new claim");
  }

  return cleanList(notNeeded);
}

function buildAuthoritativeRequiredForms(
  input: SmallClaimsIntelligenceInput,
  stage: UniversalStage,
): string[] {
  const forms: string[] = [];
  const responding = userIsResponding(input);
  const plaintiffStarting = userIsPlaintiffStarting(input);

  const claimAlreadyStarted =
    input.filedDocuments.includes("plaintiffs-claim") || hasText(input.claimNumber);

  const plaintiffClaimFiled = input.filedDocuments.includes("plaintiffs-claim");
  const affidavitFiled = input.filedDocuments.includes("affidavit-service");
  const defenceFiledOrReceived = input.filedDocuments.includes("defence");

  if (!responding && (stage === "starting-case" || plaintiffStarting) && !plaintiffClaimFiled) {
    forms.push("Form 7A — Plaintiff's Claim");
  }

  if (!responding && (claimAlreadyStarted || plaintiffClaimFiled) && !affidavitFiled) {
    forms.push("Form 8A — Affidavit of Service");
  }

  if (responding && !defenceFiledOrReceived) {
    forms.push("Form 9A — Defence");
  }

  if (stage === "conference") {
    forms.push(
      "Settlement conference preparation package",
      "Evidence list or document bundle",
      "Settlement position summary",
    );
  }

  if (stage === "trial") {
    forms.push("Trial evidence package", "Witness and exhibit preparation");
  }

  if (stage === "enforcement") {
    forms.push("Enforcement information package");
  }

  if (
    hasText(input.settlementEfforts) ||
    input.issues.includes("settlement") ||
    normalizeText(input.goal).includes("settle")
  ) {
    forms.push("Form 14A — Offer to Settle, if making a formal offer");
  }

  return cleanList(forms);
}

function buildDetectedIssuesFromIntelligence(primaryClaims: string[]): string[] {
  return cleanList(primaryClaims);
}

function buildInferredFacts(input: SmallClaimsIntelligenceInput): string[] {
  const facts: string[] = [];

  if (hasText(input.amountClaimed)) {
    facts.push(`Amount claimed or disputed was provided: ${input.amountClaimed}.`);
  }

  if (hasText(input.damagesBreakdown)) {
    facts.push("Damages breakdown or calculation was provided.");
  }

  if (hasText(input.facts)) {
    facts.push("Narrative facts were provided.");
  }

  if (hasText(input.timeline)) {
    facts.push("Timeline information was provided.");
  }

  if (input.uploadedEvidenceFiles.length > 0) {
    facts.push(
      `${input.uploadedEvidenceFiles.length} evidence file${
        input.uploadedEvidenceFiles.length === 1 ? "" : "s"
      } selected for evidence mapping.`,
    );
  }

  if (hasText(input.goal)) {
    facts.push("Requested outcome or goal was provided.");
  }

  return cleanList(facts);
}

function buildContactMissingInfo(
  input: SmallClaimsIntelligenceInput,
  stage: UniversalStage,
): string[] {
  const missing: string[] = [];

  if (!hasText(input.yourName)) missing.push("Your legal name or business name.");
  if (!hasText(input.otherParty)) missing.push("Other party name.");

  if (stage === "starting-case" && !userIsResponding(input)) {
    if (!hasText(input.yourAddress)) missing.push("Your address for court forms.");
    if (!hasText(input.defendantAddress)) missing.push("Other party address for service.");
  }

  return missing;
}

function buildEvidenceFromFiles(input: SmallClaimsIntelligenceInput) {
  return input.uploadedEvidenceFiles.map((file) => ({
    id: file.id,
    name: file.name,
    title: file.title || file.name,
    description: file.description,
    category: file.category,
    evidenceDate: file.evidenceDate,
    source: file.source,
    relevance: file.relevance,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  }));
}

function buildSummary(args: {
  input: SmallClaimsIntelligenceInput;
  stage: UniversalStage;
  analysis: AnalysisResult;
}): string {
  const { input, stage, analysis } = args;

  return [
    "Small Claims Intelligence Summary",
    "",
    `Stage: ${getStageLabel(stage)}`,
    `Primary claim types: ${analysis.detectedClaimTypes?.join(", ") || "not confirmed"}`,
    `Amount claimed/disputed: ${input.amountClaimed || "not entered"}`,
    "",
    "Parties",
    `- User: ${input.yourName || "not entered"}`,
    `- Other party: ${input.otherParty || "not entered"}`,
    "",
    "Core facts",
    input.facts || "No detailed facts entered yet.",
    "",
    "Timeline",
    input.timeline || "No timeline entered yet.",
    "",
    "Evidence",
    analysis.missingEvidence?.length
      ? `Missing proof: ${analysis.missingEvidence.join("; ")}`
      : input.evidence || "No evidence details entered yet.",
    "",
    "Next actions",
    analysis.nextBestActions?.length
      ? analysis.nextBestActions.map((item) => `- ${item}`).join("\n")
      : "- Continue organizing the case record.",
  ].join("\n");
}

function filterContaminatedGuidance(items: string[]): string[] {
  return cleanList(
    items.filter((item) => {
      const text = normalizeText(item);

      if (text.includes("property damage")) return false;
      if (text.includes("repair cost")) return false;
      if (text.includes("contract") && text.includes("agreement") && text.includes("not")) return false;
      if (text.includes("defence") && text.includes("served") && text.includes("claim")) return false;

      return true;
    }),
  );
}

export async function analyzeSmallClaimsWithBrain(
  input: SmallClaimsIntelligenceInput,
): Promise<SmallClaimsIntelligenceOutput> {
  const stage = determineProceduralStage(input);
  const rawUserText = buildRawUserText(input);

  const brain = await runCourtSimplifiedBrain({
    courtPath: "small-claims",
    province: "Ontario",
    stage,
    rawUserText,
    existingMasterResult: {},
    sourceType: "user-intake",
  });

  const intelligence = brain.intelligence;

  const intelligencePatch = mapIntelligenceToAnalysisPatch({
    id: intelligence.id,
    confidence: intelligence.confidence,
    primaryClaimTypes: intelligence.primaryClaimTypes,
    rejectedFalsePositives: intelligence.rejectedFalsePositives,
    claimClassifications: intelligence.claimClassifications,
    proceduralPosture: intelligence.proceduralPosture,
    evidenceIssueLinks: intelligence.evidenceIssueLinks,
    contradictions: intelligence.contradictions,
    missingInformation: intelligence.missingInformation,
    litigationRisks: intelligence.litigationRisks,
    opposingArguments: intelligence.opposingArguments,
    judgeConcerns: intelligence.judgeConcerns,
    formRecommendations: intelligence.formRecommendations,
    plainLanguageSummary: intelligence.plainLanguageSummary,
    structuredCaseSummary: intelligence.structuredCaseSummary,
    nextBestActions: intelligence.nextBestActions,
    systemWarnings: intelligence.systemWarnings,
    normalizedIntake: intelligence.normalizedIntake,
    legalKnowledge: intelligence.legalKnowledge,
  });

  const completedForms = buildCompletedForms(input);
  const receivedForms = buildReceivedForms(input);
  const notNeededNow = buildNotNeededNow(input, stage);
  const requiredNextForms = buildAuthoritativeRequiredForms(input, stage);

  const analysis: AnalysisResult = {
    courtPath: "small-claims",
    caseStage: getStageLabel(stage),

    completedForms,
    receivedForms,
    notNeededNow,
    requiredNextForms,

    detectedIssues: buildDetectedIssuesFromIntelligence(intelligence.primaryClaimTypes),
    inferredFacts: buildInferredFacts(input),

    missingInformation: cleanList([
      ...buildContactMissingInfo(input, stage),
      ...(intelligencePatch.missingInformation || []),
    ]),

    risksAndGaps: filterContaminatedGuidance(intelligencePatch.risksAndGaps || []),

    guidance: filterContaminatedGuidance([
      ...(intelligence.nextBestActions || []),
      "Use the evidence step to connect each fact to proof before generating final documents.",
      "Verify current court filing and service requirements before filing anything.",
    ]),

    summary: "",

    detectedClaimTypes: intelligence.primaryClaimTypes,
    missingEvidence: cleanList(intelligencePatch.missingEvidence || []),
    evidenceWeaknesses: cleanList(intelligencePatch.evidenceWeaknesses || []),
    opposingArguments: cleanList(intelligencePatch.opposingArguments || []),
    defenceAttacks: cleanList(intelligencePatch.defenceAttacks || []),
    judgeConcerns: cleanList(intelligencePatch.judgeConcerns || []),
    courtConcerns: cleanList(intelligencePatch.courtConcerns || []),
    nextBestActions: filterContaminatedGuidance(intelligence.nextBestActions || []),
    userWarnings: filterContaminatedGuidance(intelligence.systemWarnings || []),
    proceduralRisks: filterContaminatedGuidance(intelligence.proceduralPosture.warnings || []),
    suggestedFocus: filterContaminatedGuidance(intelligence.nextBestActions || []),

    damagesIssues: hasText(input.amountClaimed)
      ? ["Amount was captured. The next step is explaining the calculation and connecting it to proof."]
      : ["Amount claimed or disputed still needs to be entered."],

    intelligence: intelligencePatch.intelligence,
    intelligenceSummary: intelligence.plainLanguageSummary,
    structuredIntelligenceSummary: intelligence.structuredCaseSummary,
    intelligenceWarnings: filterContaminatedGuidance(intelligence.systemWarnings),
    intelligenceNextActions: filterContaminatedGuidance(intelligence.nextBestActions),
    intelligenceEvidenceIssues: intelligence.evidenceIssueLinks,
    intelligenceFormRecommendations: intelligence.formRecommendations,
  };

  const finalAnalysis: AnalysisResult = {
    ...analysis,
    summary: buildSummary({
      input,
      stage,
      analysis,
    }),
  };

  const payload: StoredCaseData = {
    courtPath: "small-claims",
    pathLabel: "Small Claims",
    caseStage: stage,
    yourName: input.yourName,
    otherParty: input.otherParty,
    facts: input.facts,
    timeline: input.timeline,
    evidence: input.evidence,
    missingEvidence: input.missingEvidence,
    goal: input.goal,
    urgent: input.urgent,
    analysis: finalAnalysis,
    intelligence,
    masterResultPatch: brain.masterResultPatch,
    dashboardPatch: brain.dashboardPatch,
    recommendedNextRoute: brain.recommendedNextRoute,
    extra: {
      ...input,
      uploadedEvidenceFiles: buildEvidenceFromFiles(input),
      intelligence,
      brainDashboardPatch: brain.dashboardPatch,
      recommendedNextRoute: brain.recommendedNextRoute,
    },
  };

  return {
    analysis: finalAnalysis,
    payload,
    masterResultPatch: brain.masterResultPatch,
    dashboardPatch: brain.dashboardPatch,
    recommendedNextRoute: brain.recommendedNextRoute,
  };
}