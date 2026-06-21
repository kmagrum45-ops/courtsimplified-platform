// src/lib/case-system/rulesEngine.ts

import { runSmallClaimsEngine } from "./smallClaimsEngine";
import {
  CourtPath,
  cleanList,
  normalizeText,
  validateProceduralForms,
} from "./proceduralRules";
import {
  runFormTriggerEngine,
  TriggeredFormRecommendation,
} from "./formTriggerEngine";
import { CaseStage } from "./formKnowledgeBase";
import {
  runLegalTheoryEngine,
  LegalTheoryResult,
} from "./legalTheoryEngine";
import { runScenarioEngine, ScenarioResult } from "./scenarioEngine";
import {
  runScenarioConfidenceEngine,
  ScenarioConfidenceResult,
  shouldSuppressTheory,
} from "./scenarioConfidenceEngine";
import {
  analyzeFamilyStrategy,
  FamilyStrategyResult,
} from "./familyStrategyEngine";
import {
  normalizeFamilyAiIntake,
  FamilyNormalizedIntake,
} from "./familyAiIntakeNormalizer";

export type IntakeData = {
  courtPath: CourtPath | string;
  stage: string;
  facts: string;
  issues?: string[];
  timeline?: string;
  evidence?: string;
  missingEvidence?: string;
  amountClaimed?: string;
  damagesBreakdown?: string;
  agreementDetails?: string;
  paymentHistory?: string;
  serviceDetails?: string;
  deadlineDetails?: string;
  settlementEfforts?: string;
  defenceResponse?: string;
  goal?: string;
  urgent?: string;
  filedDocuments?: string[];
  completedForms?: string[];
  receivedForms?: string[];
  requiredNextForms?: string[];
  notNeededNow?: string[];
  availableEvidence?: string[];
  userData?: Record<string, unknown>;
};

type BaselinePathAnalysis = {
  detectedIssues: string[];
  detectedClaimTypes: string[];
  missingEvidence: string[];
  damagesIssues: string[];
  proceduralRisks: string[];
  defenceAttacks: string[];
  judgeConcerns: string[];
  suggestedFocus: string[];
  casePackageItems: string[];
  requiredNextForms: string[];
  notNeededNow: string[];
};

export type RuleMatch = {
  issueMatches: unknown[];
  procedureMatches: unknown[];
  evidenceMatches: unknown[];

  scenario: ScenarioResult;
  scenarioConfidence: ScenarioConfidenceResult;

  detectedIssues: string[];
  detectedClaimTypes: string[];
  missingEvidence: string[];
  damagesIssues: string[];
  proceduralRisks: string[];
  defenceAttacks: string[];
  judgeConcerns: string[];
  suggestedFocus: string[];
  casePackageItems: string[];

  validatedCompletedForms: string[];
  validatedReceivedForms: string[];
  validatedRequiredNextForms: string[];
  validatedNotNeededNow: string[];

  blockedForms: string[];
  duplicateFormsRemoved: string[];
  proceduralWarnings: string[];

  requiredForms: TriggeredFormRecommendation[];
  optionalForms: TriggeredFormRecommendation[];
  laterForms: TriggeredFormRecommendation[];
  blockedFormRecommendations: TriggeredFormRecommendation[];

  legalTheory: LegalTheoryResult;

  familyNormalized?: FamilyNormalizedIntake;
  familyStrategy?: FamilyStrategyResult;

  normalizedCourtPath: CourtPath;
  normalizedStage: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function safeStringArray(items: Array<unknown> | undefined | null): string[] {
  if (!Array.isArray(items)) return [];

  return cleanList(
    items
      .map((item) => asString(item).trim())
      .filter((item) => item.length > 0),
  );
}

function normalizeCourtPath(path: string): CourtPath {
  const value = normalizeText(path);

  if (
    value === "small-claims" ||
    value === "smallclaims" ||
    value === "small_claims" ||
    value.includes("small")
  ) {
    return "small-claims";
  }

  if (value === "family") return "family";
  if (value === "civil") return "civil";

  return "not-sure";
}

function normalizeStage(stage: string): string {
  const value = normalizeText(stage);

  if (!value) return "not-sure";
  if (value.includes("start") || value.includes("new case")) return "starting-case";
  if (value.includes("respond") || value.includes("defence") || value.includes("defense")) return "responding";
  if (value.includes("conference") || value.includes("settlement")) return "conference";
  if (value.includes("motion")) return "motion";
  if (value.includes("trial")) return "trial";
  if (value.includes("enforcement") || value.includes("garnish")) return "enforcement";
  if (value.includes("urgent") || value.includes("emergency")) return "urgent";

  return value;
}

async function safeJsonFetch(url: string, body: unknown): Promise<unknown[]> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function detectGeneralIssues(text: string): string[] {
  const detectedIssues: string[] = [];

  if (text.includes("not pay") || text.includes("owe") || text.includes("unpaid")) {
    detectedIssues.push("Unpaid invoice or unpaid money");
  }

  if (text.includes("contract") || text.includes("agreement") || text.includes("quote")) {
    detectedIssues.push("Breach of contract or agreement");
  }

  if (text.includes("damage") || text.includes("broke") || text.includes("repair")) {
    detectedIssues.push("Property damage");
  }

  if (text.includes("false") || text.includes("lied") || text.includes("reputation")) {
    detectedIssues.push("Defamation / reputational harm");
  }

  if (text.includes("child") || text.includes("parenting") || text.includes("custody")) {
    detectedIssues.push("Parenting / decision-making responsibility");
  }

  if (text.includes("support") || text.includes("income")) {
    detectedIssues.push("Child support");
  }

  if (text.includes("injury") || text.includes("negligence") || text.includes("harm")) {
    detectedIssues.push("Negligence / damages");
  }

  return cleanList(detectedIssues);
}

function isOfficialCourtFormLabel(item: string): boolean {
  const value = normalizeText(item);
  if (!value) return false;

  return /^form\s+[0-9][0-9a-z.\-]*(\s|$|—|-|:)/i.test(item.trim());
}

function isCasePackageItem(item: string): boolean {
  const value = normalizeText(item);
  if (!value) return false;
  if (isOfficialCourtFormLabel(item)) return false;

  return (
    value.includes("package") ||
    value.includes("bundle") ||
    value.includes("summary") ||
    value.includes("evidence list") ||
    value.includes("document list") ||
    value.includes("checklist") ||
    value.includes("preparation") ||
    value.includes("settlement position") ||
    value.includes("trial evidence") ||
    value.includes("key document") ||
    value.includes("enforcement information")
  );
}

function splitOfficialFormsFromCasePackage(items: string[]) {
  const officialForms: string[] = [];
  const casePackageItems: string[] = [];

  for (const item of items) {
    if (isOfficialCourtFormLabel(item)) {
      officialForms.push(item);
    } else {
      casePackageItems.push(item);
    }
  }

  return {
    officialForms: cleanList(officialForms),
    casePackageItems: cleanList(casePackageItems),
  };
}

function filterLegalTheoryByConfidence(
  legalTheory: LegalTheoryResult,
  confidence: ScenarioConfidenceResult,
): LegalTheoryResult {
  const matchedTheories = legalTheory.matchedTheories.filter(
    (theory) => !shouldSuppressTheory(theory.theoryName, confidence),
  );

  return {
    matchedTheories,
    strongestTheory: matchedTheories[0],
    allMissingProof: cleanList(matchedTheories.flatMap((item) => safeStringArray(item.missingProof))),
    allDefenceAttacks: cleanList(matchedTheories.flatMap((item) => safeStringArray(item.likelyDefenceAttacks))),
    allJudgeConcerns: cleanList(matchedTheories.flatMap((item) => safeStringArray(item.judgeConcerns))),
    allRecommendedQuestions: cleanList(matchedTheories.flatMap((item) => safeStringArray(item.recommendedQuestions))),
    allDraftingWarnings: cleanList(matchedTheories.flatMap((item) => safeStringArray(item.draftingWarnings))),
    allStrategicNotes: cleanList(matchedTheories.flatMap((item) => safeStringArray(item.strategicNotes))),
  };
}

function buildBaselinePathAnalysis(text: string): BaselinePathAnalysis {
  return {
    detectedIssues: detectGeneralIssues(text),
    detectedClaimTypes: [],
    missingEvidence: [],
    damagesIssues: [],
    proceduralRisks: [],
    defenceAttacks: [],
    judgeConcerns: [],
    suggestedFocus: [],
    casePackageItems: [],
    requiredNextForms: [],
    notNeededNow: [],
  };
}

function buildFamilyPathAnalysis(
  familyNormalized: FamilyNormalizedIntake,
  familyStrategy: FamilyStrategyResult,
): BaselinePathAnalysis {
  return {
    detectedIssues: cleanList([
      ...safeStringArray(familyStrategy.detectedFamilyIssues),
      ...familyNormalized.detectedCaseTypes.map((item) => item.label),
      ...familyNormalized.parentingIssues.map((item) => item.label),
      ...familyNormalized.supportIssues.map((item) => item.label),
      ...familyNormalized.safetyIssues.map((item) => item.label),
      ...familyNormalized.propertyIssues.map((item) => item.label),
    ]),
    detectedClaimTypes: cleanList([
      ...familyStrategy.detectedClaimTypes.map((item) => asString(item)),
      ...familyNormalized.detectedCaseTypes.map((item) => item.issue),
    ]),
    missingEvidence: cleanList([
      ...safeStringArray(familyStrategy.recommendedEvidence),
      ...safeStringArray(familyStrategy.evidenceGaps),
      ...safeStringArray(familyNormalized.evidence.missingCoreEvidence),
    ]),
    damagesIssues: cleanList([
      ...safeStringArray(familyStrategy.supportFinancialIssues),
      ...familyNormalized.supportIssues.map((item) => item.label),
    ]),
    proceduralRisks: cleanList([
      ...safeStringArray(familyStrategy.proceduralWarnings),
      ...safeStringArray(familyStrategy.urgentActionFlags),
      ...safeStringArray(familyNormalized.risks.proceduralRisks),
      ...safeStringArray(familyNormalized.risks.serviceRisks),
      ...safeStringArray(familyNormalized.risks.urgencyFlags),
    ]),
    defenceAttacks: cleanList([
      ...safeStringArray(familyStrategy.likelyOtherSideArguments),
    ]),
    judgeConcerns: cleanList([
      ...safeStringArray(familyStrategy.likelyJudgeConcerns),
      ...safeStringArray(familyNormalized.risks.childFocusedRisks),
      ...safeStringArray(familyNormalized.risks.credibilityRisks),
      ...safeStringArray(familyNormalized.risks.disclosureRisks),
    ]),
    suggestedFocus: cleanList([
      ...safeStringArray(familyStrategy.recommendedNextSteps),
      ...safeStringArray(familyStrategy.suggestedWordingImprovements),
      ...safeStringArray(familyStrategy.settlementStrategy),
      ...safeStringArray(familyNormalized.suggestedIntakeFocus),
      ...safeStringArray(familyNormalized.recommendedQuestions),
    ]),
    casePackageItems: cleanList([
      "Family timeline",
      "Parenting proposal",
      "Best-interests evidence summary",
      "Evidence list",
      "Financial disclosure checklist",
      "Draft proposed order terms",
      ...safeStringArray(familyStrategy.recommendedForms),
    ]),
    requiredNextForms: safeStringArray(familyStrategy.recommendedForms),
    notNeededNow: [],
  };
}

export async function runRuleEngine(intake: IntakeData): Promise<RuleMatch> {
  const normalizedCourtPath = normalizeCourtPath(asString(intake.courtPath));
  const normalizedStage = normalizeStage(asString(intake.stage));
  const triggerCourtPath = normalizedCourtPath === "not-sure" ? "civil" : normalizedCourtPath;
  const text = normalizeText(asString(intake.facts));

  const completedForms = cleanList([
    ...safeStringArray(intake.completedForms),
    ...safeStringArray(intake.filedDocuments),
  ]);

  const receivedForms = safeStringArray(intake.receivedForms);
  const incomingRequiredForms = safeStringArray(intake.requiredNextForms);
  const incomingNotNeeded = safeStringArray(intake.notNeededNow);

  const isSmallClaims = normalizedCourtPath === "small-claims";
  const isFamily = normalizedCourtPath === "family";

  const familyNormalized = isFamily
    ? normalizeFamilyAiIntake({
        caseStage: normalizedStage,
        role: asString(intake.userData?.yourRole),
        issues: safeStringArray(intake.issues),
        filedDocuments: safeStringArray(intake.filedDocuments),
        completedForms,
        receivedForms,
        yourName: asString(intake.userData?.yourName),
        otherParty: asString(intake.userData?.otherParty),
        childrenInfo: asString(intake.userData?.childrenInfo),
        currentLivingSituation: asString(intake.userData?.currentLivingSituation),
        pastLivingHistory: asString(intake.userData?.pastLivingHistory),
        facts: asString(intake.facts),
        timeline: asString(intake.timeline),
        evidence: asString(intake.evidence),
        missingEvidence: asString(intake.missingEvidence),
        goal: asString(intake.goal),
        urgent: asString(intake.urgent),
        safetyConcerns: asString(intake.userData?.safetyConcerns ?? intake.urgent),
        propertyHomeDetails: asString(intake.userData?.propertyHomeDetails),
        upcomingCourtDate: asString(intake.userData?.upcomingCourtDate),
        financialDisclosure: asString(intake.userData?.financialDisclosure),
        parentingSchedule: asString(intake.userData?.parentingSchedule),
        communicationHistory: asString(intake.userData?.communicationHistory),
        policeInvolvement: asString(intake.userData?.policeInvolvement),
        childProtectionInvolvement: asString(intake.userData?.childProtectionInvolvement),
        schoolIssues: asString(intake.userData?.schoolIssues),
        medicalIssues: asString(intake.userData?.medicalIssues),
        relocationDetails: asString(intake.userData?.relocationDetails),
        existingOrders: asString(intake.userData?.existingOrders),
        settlementHistory: asString(intake.settlementEfforts ?? intake.userData?.settlementHistory),
        userData: intake.userData,
      })
    : undefined;

  const familyStrategy = isFamily
    ? analyzeFamilyStrategy({
        caseStage: normalizedStage,
        issues: safeStringArray(intake.issues),
        filedDocuments: safeStringArray(intake.filedDocuments),
        yourName: asString(intake.userData?.yourName),
        otherParty: asString(intake.userData?.otherParty),
        childrenInfo: asString(intake.userData?.childrenInfo),
        currentLivingSituation: asString(intake.userData?.currentLivingSituation),
        pastLivingHistory: asString(intake.userData?.pastLivingHistory),
        facts: asString(intake.facts),
        timeline: asString(intake.timeline),
        evidence: asString(intake.evidence),
        missingEvidence: asString(intake.missingEvidence),
        goal: asString(intake.goal),
        urgent: asString(intake.urgent),
        safetyConcerns: asString(intake.userData?.safetyConcerns ?? intake.urgent),
        propertyHomeDetails: asString(intake.userData?.propertyHomeDetails),
        upcomingCourtDate: asString(intake.userData?.upcomingCourtDate),
        financialDisclosure: asString(intake.userData?.financialDisclosure),
        parentingSchedule: asString(intake.userData?.parentingSchedule),
        communicationHistory: asString(intake.userData?.communicationHistory),
        policeInvolvement: asString(intake.userData?.policeInvolvement),
        childProtectionInvolvement: asString(intake.userData?.childProtectionInvolvement),
        schoolIssues: asString(intake.userData?.schoolIssues),
        medicalIssues: asString(intake.userData?.medicalIssues),
        relocationDetails: asString(intake.userData?.relocationDetails),
        existingOrders: asString(intake.userData?.existingOrders),
        settlementHistory: asString(intake.settlementEfforts ?? intake.userData?.settlementHistory),
      })
    : undefined;

  const pathAnalysis: BaselinePathAnalysis = isSmallClaims
    ? {
        ...buildBaselinePathAnalysis(text),
        ...runSmallClaimsEngine({
          caseStage: (normalizedStage as any) || "not-sure",
          issues: safeStringArray(intake.issues),
          filedDocuments: safeStringArray(intake.filedDocuments),
          facts: asString(intake.facts),
          timeline: asString(intake.timeline),
          evidence: asString(intake.evidence),
          missingEvidence: asString(intake.missingEvidence),
          amountClaimed: asString(intake.amountClaimed),
          damagesBreakdown: asString(intake.damagesBreakdown),
          agreementDetails: asString(intake.agreementDetails),
          paymentHistory: asString(intake.paymentHistory),
          serviceDetails: asString(intake.serviceDetails),
          deadlineDetails: asString(intake.deadlineDetails),
          settlementEfforts: asString(intake.settlementEfforts),
          defenceResponse: asString(intake.defenceResponse),
          goal: asString(intake.goal),
          urgent: asString(intake.urgent),
          completedForms,
          receivedForms,
          availableEvidence: safeStringArray(intake.availableEvidence),
          userData: intake.userData,
        }),
      }
    : isFamily && familyNormalized && familyStrategy
      ? buildFamilyPathAnalysis(familyNormalized, familyStrategy)
      : buildBaselinePathAnalysis(text);

  const detectedIssues = cleanList([
    ...safeStringArray(intake.issues),
    ...safeStringArray(pathAnalysis.detectedIssues),
  ]);

  const scenario = runScenarioEngine({
    courtPath: triggerCourtPath,
    stage: normalizedStage,
    role: asString(intake.userData?.yourRole),
    issues: detectedIssues,
    facts: asString(intake.facts),
    timeline: asString(intake.timeline),
    evidence: [
      asString(intake.evidence),
      ...safeStringArray(intake.availableEvidence),
    ].join(" "),
    missingEvidence: asString(intake.missingEvidence),
    goal: asString(intake.goal),
    urgent: asString(intake.urgent),
    filedDocuments: safeStringArray(intake.filedDocuments),
    completedForms,
    receivedForms,
  });

  const scenarioConfidence = runScenarioConfidenceEngine(scenario);

  const scenarioFocusedIssues = cleanList([
    ...(scenario.primaryIssue ? [scenario.primaryIssue.label] : []),
    ...scenario.secondaryIssues.map((issue) => issue.label),
    ...detectedIssues,
  ]);

  const rawLegalTheory = runLegalTheoryEngine({
    courtPath: triggerCourtPath,
    facts: [
      asString(intake.facts),
      asString(intake.timeline),
      asString(intake.goal),
      asString(intake.urgent),
    ].join(" "),
    issues: scenarioFocusedIssues,
    evidence: [
      asString(intake.evidence),
      ...safeStringArray(intake.availableEvidence),
    ].join(" "),
    timeline: asString(intake.timeline),
    damagesBreakdown: asString(intake.damagesBreakdown),
    goal: asString(intake.goal),
  });

  const legalTheory = filterLegalTheoryByConfidence(
    rawLegalTheory,
    scenarioConfidence,
  );

  const splitIncomingRequired = splitOfficialFormsFromCasePackage([
    ...incomingRequiredForms,
    ...safeStringArray(pathAnalysis.requiredNextForms),
  ]);

  const proceduralValidation = validateProceduralForms({
    courtPath: normalizedCourtPath,
    stage: normalizedStage,
    requiredNextForms: splitIncomingRequired.officialForms,
    completedForms,
    receivedForms,
    notNeededNow: cleanList([
      ...incomingNotNeeded,
      ...safeStringArray(pathAnalysis.notNeededNow),
    ]),
  });

  const triggerResults = runFormTriggerEngine({
    courtPath: triggerCourtPath,
    stage: (normalizedStage as CaseStage) || "not-sure",
    role: asString(intake.userData?.yourRole),
    issues: cleanList([
      ...scenarioFocusedIssues,
      ...(legalTheory.strongestTheory ? [legalTheory.strongestTheory.theoryName] : []),
    ]),
    facts: [
      asString(intake.facts),
      asString(intake.timeline),
      asString(intake.evidence),
      asString(intake.goal),
    ].join(" "),
    filedDocuments: safeStringArray(intake.filedDocuments),
    completedForms,
    receivedForms,
    availableEvidence: safeStringArray(intake.availableEvidence).length > 0
      ? safeStringArray(intake.availableEvidence)
      : [asString(intake.evidence), asString(intake.missingEvidence)],
    userData: intake.userData || {
      amountClaimed: intake.amountClaimed,
      damagesBreakdown: intake.damagesBreakdown,
      agreementDetails: intake.agreementDetails,
      paymentHistory: intake.paymentHistory,
      serviceDetails: intake.serviceDetails,
      deadlineDetails: intake.deadlineDetails,
      settlementEfforts: intake.settlementEfforts,
      defenceResponse: intake.defenceResponse,
      goal: intake.goal,
    },
  });

  const [issueMatches, procedureMatches, evidenceMatches] = await Promise.all([
    safeJsonFetch("/api/rules/issues", {
      courtPath: normalizedCourtPath,
      issues: scenarioFocusedIssues,
    }),
    safeJsonFetch("/api/rules/procedures", {
      courtPath: normalizedCourtPath,
      stage: normalizedStage,
    }),
    safeJsonFetch("/api/rules/evidence", {
      courtPath: normalizedCourtPath,
      issues: scenarioFocusedIssues,
    }),
  ]);

  const requiredOfficialForms = cleanList([
    ...safeStringArray(proceduralValidation.requiredNextForms),
    ...triggerResults.requiredForms.map(
      (form) => `Form ${asString(form.formNumber)} — ${asString(form.title)}`,
    ),
  ]);

  const casePackageItems = cleanList([
    ...splitIncomingRequired.casePackageItems,
    ...safeStringArray(pathAnalysis.casePackageItems),
    ...(normalizedStage === "conference"
      ? [
          "Settlement conference preparation package",
          "Updated evidence list",
          "Settlement position summary",
          "Key document bundle for conference",
        ]
      : []),
    ...(normalizedStage === "trial"
      ? ["Trial evidence package", "Witness preparation checklist"]
      : []),
    ...(normalizedStage === "enforcement"
      ? ["Enforcement information package"]
      : []),
  ]);

  return {
    issueMatches,
    procedureMatches,
    evidenceMatches,

    scenario,
    scenarioConfidence,

    detectedIssues: scenarioFocusedIssues,

    detectedClaimTypes: cleanList([
      ...safeStringArray(pathAnalysis.detectedClaimTypes),
      ...legalTheory.matchedTheories.map((theory) => asString(theory.theoryName)),
    ]),

    missingEvidence: cleanList([
      ...safeStringArray(pathAnalysis.missingEvidence),
      ...safeStringArray(legalTheory.allMissingProof),
    ]),

    damagesIssues: cleanList(pathAnalysis.damagesIssues),

    proceduralRisks: cleanList([
      ...safeStringArray(pathAnalysis.proceduralRisks),
      ...safeStringArray(proceduralValidation.warnings),
      ...safeStringArray(scenario.urgencyFlags),
    ]),

    defenceAttacks: cleanList([
      ...safeStringArray(pathAnalysis.defenceAttacks),
      ...safeStringArray(legalTheory.allDefenceAttacks),
    ]),

    judgeConcerns: cleanList([
      ...safeStringArray(pathAnalysis.judgeConcerns),
      ...safeStringArray(legalTheory.allJudgeConcerns),
    ]),

    suggestedFocus: cleanList([
      ...safeStringArray(pathAnalysis.suggestedFocus),
      ...safeStringArray(legalTheory.allStrategicNotes),
      ...safeStringArray(scenarioConfidence.focusNotes),
      ...safeStringArray(scenario.strategyNotes),
      ...safeStringArray(scenario.formRoutingNotes),
    ]),

    casePackageItems,

    validatedCompletedForms: completedForms,
    validatedReceivedForms: receivedForms,
    validatedRequiredNextForms: requiredOfficialForms,
    validatedNotNeededNow: safeStringArray(proceduralValidation.notNeededNow),

    blockedForms: safeStringArray(proceduralValidation.blockedForms),
    duplicateFormsRemoved: safeStringArray(proceduralValidation.duplicateFormsRemoved),
    proceduralWarnings: safeStringArray(proceduralValidation.warnings),

    requiredForms: triggerResults.requiredForms,
    optionalForms: triggerResults.optionalForms,
    laterForms: triggerResults.laterForms,
    blockedFormRecommendations: triggerResults.blockedForms,

    legalTheory,

    familyNormalized,
    familyStrategy,

    normalizedCourtPath,
    normalizedStage,
  };
}
