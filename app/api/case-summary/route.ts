import { NextResponse } from "next/server";

import { runCourtSimplifiedBrain } from "../../../src/lib/case-system/intelligence/courtSimplifiedBrain";

import type {
  CourtSimplifiedBrainInput,
  CourtSimplifiedBrainOutput,
  IntelligenceCourtPath,
  IntelligenceProvince,
  IntelligenceStage,
  LegalIntelligenceResult,
} from "../../../src/lib/case-system/intelligence/intelligenceTypes";

type LegacyCourtPath = "family" | "small-claims" | "civil" | "not-sure";

type EmotionalTone = "standard" | "supportive" | "urgent" | "simplified";

type ComplexityLevel =
  | "simple"
  | "moderate"
  | "complex"
  | "high-risk"
  | "not-sure";

type CourtSimplifiedAnalysis = {
  summary: string;
  plainLanguageSummary: string;
  nextStepMessage: string;

  courtPath: LegacyCourtPath;
  province: string;
  caseType: string;
  currentStage: string;
  userRole: string;

  detectedLegalPaths: string[];
  factualThemes: string[];
  complexityLevel: ComplexityLevel;

  completedForms: string[];
  receivedForms: string[];
  requiredNextForms: string[];
  laterForms: string[];
  notNeededNow: string[];

  missingInformation: string[];
  evidenceMentioned: string[];
  evidenceNeeded: string[];

  legalIssues: string[];
  timelineAnalysis: string[];
  proceduralStageReasoning: string[];

  risks: string[];
  urgencyFlags: string[];
  emotionalTone: EmotionalTone;

  contradictions: string[];

  evidenceStrengths: string[];
  evidenceWeaknesses: string[];
  missingEvidence: string[];

  deadlineRisks: string[];
  serviceRisks: string[];
  limitationRisks: string[];

  opposingArguments: string[];
  courtConcerns: string[];

  recommendedQuestions: string[];
  caseStrategy: string[];
  casePackageItems: string[];

  nextSteps: string[];
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function cleanList(items: unknown[]): string[] {
  return Array.from(new Set(items.map(clean).filter(Boolean)));
}

function normalizeBrainCourtPath(value: unknown): IntelligenceCourtPath {
  if (
    value === "family" ||
    value === "small-claims" ||
    value === "civil" ||
    value === "tribunal" ||
    value === "ltb" ||
    value === "immigration" ||
    value === "criminal-related" ||
    value === "unknown"
  ) {
    return value;
  }

  if (value === "not-sure") return "unknown";

  return "unknown";
}

function normalizeLegacyCourtPath(value: unknown): LegacyCourtPath {
  if (value === "family" || value === "small-claims" || value === "civil") {
    return value;
  }

  return "not-sure";
}

function normalizeProvince(value: unknown): IntelligenceProvince {
  if (
    value === "Ontario" ||
    value === "Alberta" ||
    value === "British Columbia" ||
    value === "Manitoba" ||
    value === "New Brunswick" ||
    value === "Newfoundland and Labrador" ||
    value === "Northwest Territories" ||
    value === "Nova Scotia" ||
    value === "Nunavut" ||
    value === "Prince Edward Island" ||
    value === "Quebec" ||
    value === "Saskatchewan" ||
    value === "Yukon" ||
    value === "Federal" ||
    value === "Unknown"
  ) {
    return value;
  }

  return "Ontario";
}

function normalizeStage(value: unknown): IntelligenceStage {
  if (
    value === "starting-case" ||
    value === "responding" ||
    value === "already-started" ||
    value === "conference" ||
    value === "motion" ||
    value === "trial" ||
    value === "enforcement" ||
    value === "appeal" ||
    value === "urgent" ||
    value === "settlement" ||
    value === "not-sure"
  ) {
    return value;
  }

  return "not-sure";
}

function extractRawUserText(data: Record<string, unknown>): string {
  const possibleFields = [
    data.rawUserText,
    data.facts,
    data.story,
    data.message,
    data.summary,
    data.description,
    data.caseSummary,
    data.intakeNarrative,
    data.currentSituation,
    data.details,
  ];

  const directText = possibleFields.map(clean).find(Boolean);

  if (directText) return directText;

  return JSON.stringify(data, null, 2);
}

function fallbackAnalysis(message: string): CourtSimplifiedAnalysis {
  return {
    summary: message,
    plainLanguageSummary: message,
    nextStepMessage: "That’s okay — we’ll guide you through this step by step.",

    courtPath: "not-sure",
    province: "Ontario",
    caseType: "Unknown",
    currentStage: "Unknown",
    userRole: "not-sure",

    detectedLegalPaths: [],
    factualThemes: [],
    complexityLevel: "not-sure",

    completedForms: [],
    receivedForms: [],
    requiredNextForms: [],
    laterForms: [],
    notNeededNow: [],

    missingInformation: [],
    evidenceMentioned: [],
    evidenceNeeded: [],

    legalIssues: [],
    timelineAnalysis: [],
    proceduralStageReasoning: [],

    risks: [],
    urgencyFlags: [],
    emotionalTone: "supportive",

    contradictions: [],

    evidenceStrengths: [],
    evidenceWeaknesses: [],
    missingEvidence: [],

    deadlineRisks: [],
    serviceRisks: [],
    limitationRisks: [],

    opposingArguments: [],
    courtConcerns: [],

    recommendedQuestions: [],
    caseStrategy: [],
    casePackageItems: [],

    nextSteps: [],
  };
}

function buildFormLabel(form: LegalIntelligenceResult["formRecommendations"][number]) {
  return cleanList([form.formNumber ? `Form ${form.formNumber}` : "", form.title]).join(
    " - ",
  );
}

function mapIntelligenceToAnalysis(
  intelligence: LegalIntelligenceResult,
): CourtSimplifiedAnalysis {
  const proof = intelligence.elementProofAnalysis;

  const missingEvidence = cleanList([
    ...intelligence.evidenceIssueLinks.flatMap((item) => item.missingEvidence),
    ...(proof?.claimProofMaps.flatMap((map) => map.missingEvidence) || []),
  ]);

  const evidenceWeaknesses = cleanList([
    ...(proof?.globalWeaknesses || []),
    ...intelligence.evidenceIssueLinks
      .filter((item) => item.strength === "low" || item.strength === "very-low")
      .map((item) => item.explanation),
  ]);

  const evidenceStrengths = cleanList([
    ...(proof?.globalStrengths || []),
    ...intelligence.evidenceIssueLinks
      .filter((item) => item.strength === "high" || item.strength === "very-high")
      .map((item) => item.explanation),
  ]);

  const limitationRisks = cleanList([
    ...intelligence.limitationAssessments
      .filter(
        (item) => item.status === "possible-risk" || item.status === "likely-risk",
      )
      .flatMap((item) => item.reasons),
    ...intelligence.litigationRisks
      .filter((risk) => risk.source === "limitations")
      .map((risk) => risk.explanation),
  ]);

  const serviceRisks = cleanList(
    intelligence.litigationRisks
      .filter((risk) => /service/i.test(`${risk.title} ${risk.explanation}`))
      .map((risk) => risk.explanation),
  );

  const deadlineRisks = cleanList([
    ...limitationRisks,
    ...intelligence.proceduralPosture.missingProcedureInfo.filter((item) =>
      /deadline|date|served|court date/i.test(item),
    ),
  ]);

  return {
    summary: intelligence.structuredCaseSummary || intelligence.plainLanguageSummary,
    plainLanguageSummary: intelligence.plainLanguageSummary,
    nextStepMessage:
      intelligence.nextBestActions[0] ||
      "Continue through the guided CourtSimplified workflow.",

    courtPath: normalizeLegacyCourtPath(intelligence.proceduralPosture.courtPath),
    province: intelligence.proceduralPosture.province,
    caseType: intelligence.primaryClaimTypes.join(", ") || "Unknown",
    currentStage: intelligence.proceduralPosture.stage,
    userRole: "not-sure",

    detectedLegalPaths: intelligence.primaryClaimTypes,
    factualThemes: intelligence.normalizedIntake.events.map((event) => event.title),
    complexityLevel:
      intelligence.litigationRisks.some((risk) => risk.severity === "critical")
        ? "high-risk"
        : intelligence.litigationRisks.some((risk) => risk.severity === "high")
          ? "complex"
          : "moderate",

    completedForms: [],
    receivedForms: [],
    requiredNextForms: cleanList(
      intelligence.formRecommendations.map(buildFormLabel),
    ),
    laterForms: [],
    notNeededNow: cleanList(
      intelligence.formRecommendations.flatMap((form) => form.notRecommendedForms),
    ),

    missingInformation: intelligence.missingInformation.map((item) => item.question),
    evidenceMentioned: intelligence.normalizedIntake.evidence.map((item) => item.title),
    evidenceNeeded: missingEvidence,

    legalIssues: intelligence.claimClassifications.map((claim) => claim.explanation),
    timelineAnalysis: intelligence.normalizedIntake.events.map(
      (event) => event.description,
    ),
    proceduralStageReasoning: [
      ...intelligence.proceduralPosture.reasons,
      ...intelligence.proceduralPosture.missingProcedureInfo,
    ],

    risks: intelligence.litigationRisks.map((risk) => risk.explanation),
    urgencyFlags: intelligence.litigationRisks
      .filter((risk) => risk.severity === "critical" || risk.severity === "high")
      .map((risk) => risk.title),
    emotionalTone: intelligence.proceduralPosture.stage === "urgent" ? "urgent" : "supportive",

    contradictions: intelligence.contradictions.map(
      (item) => `${item.title}: ${item.description}`,
    ),

    evidenceStrengths,
    evidenceWeaknesses,
    missingEvidence,

    deadlineRisks,
    serviceRisks,
    limitationRisks,

    opposingArguments: intelligence.opposingArguments.map((item) => item.argument),
    courtConcerns: intelligence.judgeConcerns.map((item) => item.concern),

    recommendedQuestions: [
      ...intelligence.missingInformation.map((item) => item.question),
      ...intelligence.proceduralPosture.nextProceduralQuestions,
    ],
    caseStrategy: [
      ...intelligence.opposingArguments.map((item) => item.responseStrategy),
      ...intelligence.judgeConcerns.map((item) => item.howToAddress),
    ],
    casePackageItems: cleanList([
      "Timeline",
      "Evidence summary",
      "Proof map",
      "Form review",
      "Risk review",
      "Court package review",
    ]),

    nextSteps: intelligence.nextBestActions,
  };
}

function buildBrainInput(data: Record<string, unknown>): CourtSimplifiedBrainInput {
  return {
    caseId: clean(data.caseId) || undefined,
    courtPath: normalizeBrainCourtPath(data.courtPath || data.path),
    province: normalizeProvince(data.province),
    stage: normalizeStage(data.stage || data.caseStage || data.currentStage),
    rawUserText: extractRawUserText(data),
    existingMasterResult: data.existingMasterResult,
    sourceType: "user-intake",
  };
}

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as Record<string, unknown>;

    const brainInput = buildBrainInput(data);
    const brainOutput: CourtSimplifiedBrainOutput =
      await runCourtSimplifiedBrain(brainInput);

    const analysis = mapIntelligenceToAnalysis(brainOutput.intelligence);

    return NextResponse.json(
      {
        ...analysis,
        analysis,

        intelligence: brainOutput.intelligence,
        masterResultPatch: brainOutput.masterResultPatch,
        dashboardPatch: brainOutput.dashboardPatch,
        recommendedNextRoute: brainOutput.recommendedNextRoute,

        sourceRoute: "case-summary",
        sourceEngine: "courtSimplifiedBrain",
        architectureMode: "master-case-source-of-truth",
        sanitized: true,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("CourtSimplified case-summary route error:", error);

    return NextResponse.json(
      {
        ...fallbackAnalysis("Server error during CourtSimplified Brain analysis."),
        sourceRoute: "case-summary",
        sourceEngine: "fallback",
        sanitized: true,
      },
      { status: 500 },
    );
  }
}