import type {
  FamilyCaseType,
  ParentingIssueType,
  SafetyConcernType,
  SupportIssueType,
} from "./types/family-case.ts";

export type FamilyStrategyInput = {
  caseStage?: string;
  issues?: string[];
  filedDocuments?: string[];

  yourName?: string;
  otherParty?: string;

  childrenInfo?: string;
  currentLivingSituation?: string;
  pastLivingHistory?: string;
  facts?: string;
  timeline?: string;
  evidence?: string;
  missingEvidence?: string;
  goal?: string;
  urgent?: string;
  safetyConcerns?: string;
  propertyHomeDetails?: string;
  upcomingCourtDate?: string;

  financialDisclosure?: string;
  parentingSchedule?: string;
  communicationHistory?: string;
  policeInvolvement?: string;
  childProtectionInvolvement?: string;
  schoolIssues?: string;
  medicalIssues?: string;
  relocationDetails?: string;
  existingOrders?: string;
  settlementHistory?: string;
};

export type FamilyStrategyResult = {
  detectedFamilyIssues: string[];
  detectedClaimTypes: FamilyCaseType[];
  detectedParentingIssues: ParentingIssueType[];
  detectedSupportIssues: SupportIssueType[];
  detectedSafetyIssues: SafetyConcernType[];

  bestInterestsFactors: string[];
  parentingStrengths: string[];
  parentingWeaknesses: string[];
  missingParentingInfo: string[];

  safetyFlags: string[];
  supportFinancialIssues: string[];

  likelyOtherSideArguments: string[];
  likelyJudgeConcerns: string[];

  recommendedEvidence: string[];
  recommendedNextSteps: string[];
  suggestedWordingImprovements: string[];

  proceduralWarnings: string[];
  settlementStrategy: string[];
  credibilityRisks: string[];
  evidenceGaps: string[];
  urgentActionFlags: string[];

  recommendedForms: string[];
  summary: string;
};

function cleanList(items: Array<string | null | undefined | false>): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => String(item || "").trim())
        .filter((item) => item.length > 0),
    ),
  );
}

function normalize(value?: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, terms: string[]): boolean {
  const normalizedText = normalize(text);
  return terms.some((term) => normalizedText.includes(normalize(term)));
}

function hasText(value?: string): boolean {
  return normalize(value).length > 8;
}

function pushIf(list: string[], condition: boolean, value: string): void {
  if (condition) {
    list.push(value);
  }
}

export function analyzeFamilyStrategy(
  input: FamilyStrategyInput,
): FamilyStrategyResult {
  const selectedIssues = input.issues ?? [];

  const combinedText = normalize(
    [
      input.caseStage,
      selectedIssues.join(" "),
      input.filedDocuments?.join(" "),
      input.childrenInfo,
      input.currentLivingSituation,
      input.pastLivingHistory,
      input.facts,
      input.timeline,
      input.evidence,
      input.missingEvidence,
      input.goal,
      input.urgent,
      input.safetyConcerns,
      input.propertyHomeDetails,
      input.upcomingCourtDate,
      input.financialDisclosure,
      input.parentingSchedule,
      input.communicationHistory,
      input.policeInvolvement,
      input.childProtectionInvolvement,
      input.schoolIssues,
      input.medicalIssues,
      input.relocationDetails,
      input.existingOrders,
      input.settlementHistory,
    ].join(" "),
  );

  const detectedFamilyIssues: string[] = [];
  const detectedClaimTypes: FamilyCaseType[] = [];
  const detectedParentingIssues: ParentingIssueType[] = [];
  const detectedSupportIssues: SupportIssueType[] = [];
  const detectedSafetyIssues: SafetyConcernType[] = [];

  const bestInterestsFactors: string[] = [];
  const parentingStrengths: string[] = [];
  const parentingWeaknesses: string[] = [];
  const missingParentingInfo: string[] = [];

  const safetyFlags: string[] = [];
  const supportFinancialIssues: string[] = [];

  const likelyOtherSideArguments: string[] = [];
  const likelyJudgeConcerns: string[] = [];

  const recommendedEvidence: string[] = [];
  const recommendedNextSteps: string[] = [];
  const suggestedWordingImprovements: string[] = [];

  const proceduralWarnings: string[] = [];
  const settlementStrategy: string[] = [];
  const credibilityRisks: string[] = [];
  const evidenceGaps: string[] = [];
  const urgentActionFlags: string[] = [];

  const recommendedForms: string[] = [];

  const parentingIssue: boolean =
    includesAny(combinedText, [
      "parenting",
      "custody",
      "access",
      "decision-making",
      "decision making",
      "parenting time",
      "schedule",
      "child lives",
      "children live",
      "withholding",
      "pick up",
      "drop off",
    ]) ||
    selectedIssues.includes("decision-making-responsibility") ||
    selectedIssues.includes("parenting-time");

  const supportIssue: boolean =
    includesAny(combinedText, [
      "child support",
      "spousal support",
      "income",
      "pay stub",
      "tax return",
      "notice of assessment",
      "financial disclosure",
      "section 7",
      "special expense",
    ]) ||
    selectedIssues.includes("child-support") ||
    selectedIssues.includes("spousal-support");

  const safetyIssue: boolean =
    includesAny(combinedText, [
      "violence",
      "abuse",
      "fear",
      "unsafe",
      "threat",
      "police",
      "harassment",
      "restraining",
      "supervised",
      "protection",
    ]) || selectedIssues.includes("restraining-order");

  const relocationIssue: boolean = includesAny(combinedText, [
    "move",
    "moving",
    "relocation",
    "different city",
    "different province",
    "school change",
  ]);

  const propertyIssue: boolean = includesAny(combinedText, [
    "matrimonial home",
    "house",
    "equity",
    "equalization",
    "property division",
    "mortgage",
    "debt",
  ]);

  if (parentingIssue) {
    detectedFamilyIssues.push(
      "Decision-making responsibility and parenting time issues detected.",
    );

    detectedClaimTypes.push(
      "decision-making-responsibility",
      "parenting-time",
    );

    detectedParentingIssues.push(
      "decision-making",
      "parenting-schedule",
    );

    bestInterestsFactors.push(
      "The court focuses on the child's best interests, stability, routine, emotional needs, education, safety, and each parent's ability to support the child's relationship with the other parent.",
    );

    recommendedEvidence.push(
      "Parenting schedules, school records, daycare records, calendars, messages, missed exchanges, and caregiving history.",
    );

    recommendedForms.push(
      "Form 8 - Application",
      "Form 35.1 - Parenting Affidavit",
    );

    likelyJudgeConcerns.push(
      "A judge will want a practical and child-focused parenting schedule.",
    );

    likelyOtherSideArguments.push(
      "The other parent may argue the current routine should not change.",
    );
  }

  if (supportIssue) {
    detectedFamilyIssues.push("Support and financial disclosure issues detected.");

    detectedClaimTypes.push("child-support");
    detectedSupportIssues.push(
      "table-child-support",
      "financial-disclosure-missing",
    );

    supportFinancialIssues.push(
      "Income disclosure, tax returns, and support calculations are likely important.",
    );

    recommendedEvidence.push(
      "Tax returns, Notices of Assessment, pay stubs, bank records, childcare costs, and section 7 expense proof.",
    );

    recommendedForms.push("Form 13 - Financial Statement");

    likelyJudgeConcerns.push(
      "Incomplete disclosure may damage credibility and delay the case.",
    );
  }

  if (safetyIssue) {
    detectedFamilyIssues.push("Safety concerns or urgency detected.");

    detectedClaimTypes.push("restraining-order");
    detectedSafetyIssues.push(
      "family-violence",
      "harassment",
    );

    safetyFlags.push(
      "Safety allegations should be organized by incident, date, evidence, witnesses, and police involvement.",
    );

    recommendedEvidence.push(
      "Police occurrence numbers, screenshots, recordings if legally obtained, medical records if relevant, witness names, and prior orders.",
    );

    urgentActionFlags.push(
      "Urgent safety issues may require immediate legal attention or emergency court steps.",
    );

    recommendedForms.push(
      "Form 14 - Notice of Motion",
      "Form 14A - Affidavit",
    );

    likelyJudgeConcerns.push(
      "Broad accusations without dates, evidence, or incidents may weaken credibility.",
    );
  }

  if (relocationIssue) {
    detectedFamilyIssues.push("Possible relocation issue detected.");
    detectedClaimTypes.push("mobility-relocation");
    detectedParentingIssues.push("mobility-relocation");

    likelyJudgeConcerns.push(
      "The court will want a detailed relocation plan and revised parenting proposal.",
    );

    recommendedEvidence.push(
      "School information, transportation plans, housing plans, employment reasons, and support network information.",
    );
  }

  if (propertyIssue) {
    detectedFamilyIssues.push("Property or equalization issue detected.");
    detectedClaimTypes.push("property-division");

    recommendedEvidence.push(
      "Mortgage documents, property values, debts, account statements, and ownership records.",
    );

    recommendedForms.push(
      "Form 13.1 - Financial Statement (Property and Support Claims)",
    );
  }

  pushIf(
    parentingStrengths,
    hasText(input.childrenInfo),
    "Children's information has been partially provided.",
  );

  pushIf(
    parentingStrengths,
    hasText(input.currentLivingSituation),
    "Current living arrangement has been described.",
  );

  pushIf(
    parentingWeaknesses,
    !hasText(input.timeline),
    "A clear timeline has not been organized yet.",
  );

  pushIf(
    parentingWeaknesses,
    !hasText(input.evidence),
    "Evidence has not been clearly organized yet.",
  );

  pushIf(
    missingParentingInfo,
    parentingIssue && !hasText(input.childrenInfo),
    "Children's ages, schools, schedules, and current residence are still needed.",
  );

  pushIf(
    missingParentingInfo,
    parentingIssue && !hasText(input.goal),
    "The exact parenting order being requested is still unclear.",
  );

  pushIf(
    evidenceGaps,
    !hasText(input.evidence),
    "Messages, calendars, records, and supporting documents still need to be organized.",
  );

  if (
    includesAny(combinedText, [
      "crazy",
      "evil",
      "narcissist",
      "always lies",
      "bad mother",
      "bad father",
    ])
  ) {
    credibilityRisks.push(
      "Emotionally charged wording may reduce credibility if not tied to specific evidence.",
    );

    suggestedWordingImprovements.push(
      "Replace emotional labels with dated incidents, messages, conduct, and child-focused impacts.",
    );
  }

  settlementStrategy.push(
    "Focus on child stability, practical scheduling, and evidence-backed proposals.",
    "Separate emotional conflict from the actual court orders being requested.",
    "Organize settlement offers around realistic parenting and financial outcomes.",
  );

  recommendedNextSteps.push(
    "Prepare a clear parenting proposal.",
    "Build a chronological timeline.",
    "Organize evidence by category and date.",
    "Separate parenting, safety, support, and property issues.",
    "Connect every requested order to evidence and child-focused reasoning.",
  );

  suggestedWordingImprovements.push(
    "Use calm, factual, child-focused language.",
    "Describe what happened, when it happened, how it affected the child, and what order is requested.",
    "Avoid exaggeration and focus on evidence-supported facts.",
  );

  proceduralWarnings.push(
    "Court forms, service rules, financial disclosure rules, and filing deadlines must be followed carefully.",
  );

  const summary = cleanList([
    parentingIssue ? "Parenting issues detected." : null,
    supportIssue ? "Support or disclosure issues detected." : null,
    safetyIssue ? "Safety concerns detected." : null,
    relocationIssue ? "Relocation concerns detected." : null,
    propertyIssue ? "Property or equalization concerns detected." : null,
  ]).join(" ");

  return {
    detectedFamilyIssues: cleanList(detectedFamilyIssues),
    detectedClaimTypes,
    detectedParentingIssues,
    detectedSupportIssues,
    detectedSafetyIssues,

    bestInterestsFactors: cleanList(bestInterestsFactors),
    parentingStrengths: cleanList(parentingStrengths),
    parentingWeaknesses: cleanList(parentingWeaknesses),
    missingParentingInfo: cleanList(missingParentingInfo),

    safetyFlags: cleanList(safetyFlags),
    supportFinancialIssues: cleanList(supportFinancialIssues),

    likelyOtherSideArguments: cleanList(likelyOtherSideArguments),
    likelyJudgeConcerns: cleanList(likelyJudgeConcerns),

    recommendedEvidence: cleanList(recommendedEvidence),
    recommendedNextSteps: cleanList(recommendedNextSteps),
    suggestedWordingImprovements: cleanList(suggestedWordingImprovements),

    proceduralWarnings: cleanList(proceduralWarnings),
    settlementStrategy: cleanList(settlementStrategy),
    credibilityRisks: cleanList(credibilityRisks),
    evidenceGaps: cleanList(evidenceGaps),
    urgentActionFlags: cleanList(urgentActionFlags),

    recommendedForms: cleanList(recommendedForms),
    summary,
  };
}
