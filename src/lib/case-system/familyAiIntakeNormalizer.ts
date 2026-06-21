import type {
  FamilyCaseType,
  FamilyLitigationStage,
  FamilyRelationshipStatus,
  FamilyUserRole,
  ParentingIssueType,
  PropertyIssueType,
  SafetyConcernType,
  SupportIssueType,
} from "./types/family-case.ts";

export type FamilyAiIntakeInput = {
  caseStage?: string;
  role?: string;
  relationshipStatus?: string;
  issues?: string[];
  filedDocuments?: string[];
  completedForms?: string[];
  receivedForms?: string[];

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

  userData?: Record<string, unknown>;
};

export type FamilyNormalizedIssueScore<T extends string> = {
  issue: T;
  label: string;
  score: number;
  confidence: number;
  reasons: string[];
};

export type FamilyNormalizedIntake = {
  courtPath: "family";
  stage: FamilyLitigationStage;
  role: FamilyUserRole;
  relationshipStatus: FamilyRelationshipStatus;

  detectedCaseTypes: FamilyNormalizedIssueScore<FamilyCaseType>[];
  parentingIssues: FamilyNormalizedIssueScore<ParentingIssueType>[];
  supportIssues: FamilyNormalizedIssueScore<SupportIssueType>[];
  safetyIssues: FamilyNormalizedIssueScore<SafetyConcernType>[];
  propertyIssues: FamilyNormalizedIssueScore<PropertyIssueType>[];

  primaryCaseType: FamilyCaseType;
  primaryLabel: string;
  primaryConfidence: number;

  procedural: {
    hasExistingCourtFile: boolean;
    hasUpcomingCourtDate: boolean;
    hasExistingOrder: boolean;
    filedDocuments: string[];
    completedForms: string[];
    receivedForms: string[];
    isStarting: boolean;
    isResponding: boolean;
    isConference: boolean;
    isMotion: boolean;
    isUrgent: boolean;
    isTrial: boolean;
    isEnforcement: boolean;
  };

  children: {
    hasChildrenInfo: boolean;
    hasCurrentSchedule: boolean;
    hasCaregivingHistory: boolean;
    hasSchoolInfo: boolean;
    hasMedicalInfo: boolean;
    childCountEstimate?: number;
  };

  evidence: {
    hasEvidence: boolean;
    hasTimeline: boolean;
    hasMessages: boolean;
    hasFinancialDisclosure: boolean;
    hasPoliceOrSafetyRecords: boolean;
    hasSchoolOrMedicalRecords: boolean;
    readiness: "strong" | "partial" | "weak" | "unknown";
    missingCoreEvidence: string[];
  };

  risks: {
    urgencyFlags: string[];
    safetyFlags: string[];
    disclosureRisks: string[];
    serviceRisks: string[];
    credibilityRisks: string[];
    proceduralRisks: string[];
    childFocusedRisks: string[];
  };

  missingInformation: string[];
  recommendedQuestions: string[];
  suggestedIntakeFocus: string[];

  internal: {
    normalizedText: string;
    textBuckets: Record<string, string>;
  };
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function normalize(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function cleanList<T extends string>(items: Array<T | null | undefined | false>): T[] {
  return Array.from(
    new Set(
      items
        .map((item) => clean(item) as T)
        .filter((item) => item.length > 0),
    ),
  );
}

function hasText(value: unknown): boolean {
  return normalize(value).length > 2;
}

function includesAny(text: string, terms: string[]): boolean {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function countMatches(text: string, terms: string[]): number {
  const normalized = normalize(text);
  return terms.filter((term) => normalized.includes(normalize(term))).length;
}

function scoreIssue<T extends string>(params: {
  issue: T;
  label: string;
  text: string;
  strong: string[];
  supporting?: string[];
  selectedIssues?: string[];
  selectedBoostTerms?: string[];
  stageBoost?: boolean;
}): FamilyNormalizedIssueScore<T> {
  const {
    issue,
    label,
    text,
    strong,
    supporting = [],
    selectedIssues = [],
    selectedBoostTerms = [],
    stageBoost = false,
  } = params;

  let score = 0;
  const reasons: string[] = [];

  const selectedText = normalize(selectedIssues.join(" "));
  const strongMatches = countMatches(text, strong);
  const supportMatches = countMatches(text, supporting);
  const selectedMatches = countMatches(selectedText, selectedBoostTerms);

  if (selectedMatches > 0) {
    score += 45;
    reasons.push("The selected issue matches this family-law issue.");
  }

  if (stageBoost) {
    score += 25;
    reasons.push("The procedural stage supports this issue.");
  }

  if (strongMatches > 0) {
    score += strongMatches * 28;
    reasons.push("The intake facts contain strong indicators for this issue.");
  }

  if (supportMatches > 0) {
    score += supportMatches * 10;
    reasons.push("The intake contains supporting context for this issue.");
  }

  const bounded = Math.max(0, Math.min(100, score));

  return {
    issue,
    label,
    score: bounded,
    confidence: bounded,
    reasons: cleanList(reasons),
  };
}

function normalizeRole(value: unknown, text: string): FamilyUserRole {
  const role = normalize(`${value || ""} ${text}`);

  if (includesAny(role, ["respondent", "served", "answer", "responding"])) return "respondent";
  if (includesAny(role, ["joint", "joint applicant"])) return "joint-applicant";
  if (includesAny(role, ["grandparent", "caregiver", "third party", "aunt", "uncle"])) return "third-party-caregiver";
  if (includesAny(role, ["applicant", "starting", "filing", "bringing application"])) return "applicant";

  return "not-sure";
}

function normalizeRelationshipStatus(value: unknown, text: string): FamilyRelationshipStatus {
  const status = normalize(`${value || ""} ${text}`);

  if (includesAny(status, ["divorced", "divorce granted"])) return "divorced";
  if (includesAny(status, ["married", "marriage", "wife", "husband", "spouse"])) return "married";
  if (includesAny(status, ["common law", "common-law", "lived together", "cohabited"])) return "common-law";
  if (includesAny(status, ["dating", "girlfriend", "boyfriend", "ex girlfriend", "ex boyfriend"])) return "dating-relationship";
  if (includesAny(status, ["never married", "not married", "child's mother", "child's father", "co-parent"])) return "never-married-parents";
  if (includesAny(status, ["separated", "separation", "split up", "broke up"])) return "separated";

  return "not-sure";
}

function normalizeStage(value: unknown, text: string): FamilyLitigationStage {
  const stage = normalize(`${value || ""} ${text}`);

  if (includesAny(stage, ["urgent motion", "emergency motion", "without notice", "immediate motion"])) return "urgent-motion";
  if (includesAny(stage, ["motion", "bring a motion", "notice of motion"])) return "motion";
  if (includesAny(stage, ["trial management", "tmc"])) return "trial-management-conference";
  if (includesAny(stage, ["settlement conference", "sc brief"])) return "settlement-conference";
  if (includesAny(stage, ["case conference", "first court date", "conference"])) return "case-conference";
  if (includesAny(stage, ["served", "respond", "answer", "need to respond", "application against me"])) return "responding-to-application";
  if (includesAny(stage, ["answer filed", "filed answer"])) return "answer-filed";
  if (includesAny(stage, ["already filed", "application started", "court file", "file number"])) return "application-started";
  if (includesAny(stage, ["trial", "trial date", "trial record"])) return "trial";
  if (includesAny(stage, ["final order", "order made", "order already made"])) return "final-order-made";
  if (includesAny(stage, ["change order", "variation", "vary", "motion to change"])) return "variation-or-change";
  if (includesAny(stage, ["enforce", "enforcement", "arrears", "froe"])) return "enforcement";
  if (includesAny(stage, ["not started", "nothing filed", "start", "starting", "new case", "application"])) return "not-started";

  return "not-sure";
}

function estimateChildCount(text: string): number | undefined {
  const normalized = normalize(text);

  if (!normalized) return undefined;
  if (includesAny(normalized, ["two children", "2 children", "two kids", "2 kids"])) return 2;
  if (includesAny(normalized, ["three children", "3 children", "three kids", "3 kids"])) return 3;
  if (includesAny(normalized, ["four children", "4 children", "four kids", "4 kids"])) return 4;
  if (includesAny(normalized, ["one child", "1 child", "one kid", "1 kid", "my child", "our child"])) return 1;

  const childMatches = normalized.match(/\bchild\b|\bchildren\b|\bkids?\b/g);
  return childMatches && childMatches.length > 0 ? childMatches.length : undefined;
}

function getTop<T extends string>(scores: FamilyNormalizedIssueScore<T>[], threshold = 35): FamilyNormalizedIssueScore<T>[] {
  return scores
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

export function normalizeFamilyAiIntake(input: FamilyAiIntakeInput): FamilyNormalizedIntake {
  const textBuckets: Record<string, string> = {
    stage: normalize(input.caseStage),
    role: normalize(input.role || input.userData?.yourRole),
    relationship: normalize(input.relationshipStatus || input.userData?.relationshipStatus),
    issues: normalize((input.issues || []).join(" ")),
    documents: normalize([...(input.filedDocuments || []), ...(input.completedForms || []), ...(input.receivedForms || [])].join(" ")),
    children: normalize(input.childrenInfo),
    currentLiving: normalize(input.currentLivingSituation),
    pastLiving: normalize(input.pastLivingHistory),
    facts: normalize(input.facts),
    timeline: normalize(input.timeline),
    evidence: normalize(input.evidence),
    missingEvidence: normalize(input.missingEvidence),
    goal: normalize(input.goal),
    urgent: normalize(input.urgent),
    safety: normalize(input.safetyConcerns),
    property: normalize(input.propertyHomeDetails),
    courtDate: normalize(input.upcomingCourtDate),
    disclosure: normalize(input.financialDisclosure),
    parentingSchedule: normalize(input.parentingSchedule),
    communication: normalize(input.communicationHistory),
    police: normalize(input.policeInvolvement),
    childProtection: normalize(input.childProtectionInvolvement),
    school: normalize(input.schoolIssues),
    medical: normalize(input.medicalIssues),
    relocation: normalize(input.relocationDetails),
    existingOrders: normalize(input.existingOrders),
    settlement: normalize(input.settlementHistory),
  };

  const allText = normalize(Object.values(textBuckets).join(" "));
  const selectedIssues = input.issues || [];
  const stage = normalizeStage(input.caseStage, allText);
  const role = normalizeRole(input.role || input.userData?.yourRole, allText);
  const relationshipStatus = normalizeRelationshipStatus(input.relationshipStatus || input.userData?.relationshipStatus, allText);

  const caseTypeScores = getTop<FamilyCaseType>([
    scoreIssue({
      issue: "decision-making-responsibility",
      label: "Decision-making responsibility",
      text: allText,
      strong: ["decision-making", "decision making", "custody", "major decisions", "school decisions", "medical decisions"],
      supporting: ["parenting", "child", "children", "joint", "sole"],
      selectedIssues,
      selectedBoostTerms: ["decision-making", "custody"],
    }),
    scoreIssue({
      issue: "parenting-time",
      label: "Parenting time",
      text: allText,
      strong: ["parenting time", "access", "schedule", "visits", "withholding", "denied visits"],
      supporting: ["pickup", "pick up", "drop off", "weekends", "holidays", "overnight"],
      selectedIssues,
      selectedBoostTerms: ["parenting-time", "access", "schedule"],
    }),
    scoreIssue({
      issue: "child-support",
      label: "Child support",
      text: allText,
      strong: ["child support", "table support", "support arrears", "section 7", "special expenses"],
      supporting: ["income", "pay stub", "tax", "notice of assessment", "daycare", "activities"],
      selectedIssues,
      selectedBoostTerms: ["child-support", "support"],
    }),
    scoreIssue({
      issue: "spousal-support",
      label: "Spousal support",
      text: allText,
      strong: ["spousal support", "support from spouse", "support for me", "support for my ex"],
      supporting: ["income", "married", "common law", "need", "ability to pay"],
      selectedIssues,
      selectedBoostTerms: ["spousal-support"],
    }),
    scoreIssue({
      issue: "property-division",
      label: "Property division",
      text: allText,
      strong: ["property division", "equalization", "matrimonial home", "house", "mortgage", "pension", "debts"],
      supporting: ["asset", "bank account", "vehicle", "sale of home", "excluded property"],
      selectedIssues,
      selectedBoostTerms: ["property", "equalization"],
    }),
    scoreIssue({
      issue: "restraining-order",
      label: "Restraining order / safety",
      text: allText,
      strong: ["restraining order", "threat", "violence", "abuse", "harassment", "stalking", "unsafe"],
      supporting: ["police", "fear", "supervised", "protection", "no contact"],
      selectedIssues,
      selectedBoostTerms: ["restraining", "safety"],
    }),
    scoreIssue({
      issue: "mobility-relocation",
      label: "Mobility / relocation",
      text: allText,
      strong: ["relocation", "moving", "move away", "different city", "different province", "school change"],
      supporting: ["transportation", "new school", "job", "housing"],
      selectedIssues,
      selectedBoostTerms: ["relocation", "mobility"],
    }),
    scoreIssue({
      issue: "variation-change-existing-order",
      label: "Change existing order",
      text: allText,
      strong: ["change order", "vary order", "variation", "motion to change", "existing order"],
      supporting: ["final order", "material change", "new circumstances"],
      selectedIssues,
      selectedBoostTerms: ["change", "variation"],
      stageBoost: stage === "variation-or-change",
    }),
    scoreIssue({
      issue: "enforcement",
      label: "Enforcement",
      text: allText,
      strong: ["enforce", "not following order", "breach order", "arrears", "froe"],
      supporting: ["final order", "unpaid", "denied", "contempt"],
      selectedIssues,
      selectedBoostTerms: ["enforcement"],
      stageBoost: stage === "enforcement",
    }),
    scoreIssue({
      issue: "urgent-motion",
      label: "Urgent motion",
      text: allText,
      strong: ["urgent", "emergency", "immediate", "without notice", "danger", "abduction"],
      supporting: ["tomorrow", "deadline", "unsafe", "police", "child at risk"],
      selectedIssues,
      selectedBoostTerms: ["urgent"],
      stageBoost: stage === "urgent-motion",
    }),
  ]);

  const parentingScores = getTop<ParentingIssueType>([
    scoreIssue({ issue: "decision-making", label: "Decision-making", text: allText, strong: ["decision-making", "major decisions", "school decisions", "medical decisions"], supporting: ["joint", "sole", "custody"], selectedIssues, selectedBoostTerms: ["decision-making"] }),
    scoreIssue({ issue: "parenting-schedule", label: "Parenting schedule", text: allText, strong: ["schedule", "parenting time", "access", "weekends", "overnight"], supporting: ["exchange", "pickup", "drop off", "holidays"], selectedIssues, selectedBoostTerms: ["parenting-time", "schedule"] }),
    scoreIssue({ issue: "primary-residence", label: "Primary residence", text: allText, strong: ["primary residence", "lives with", "child lives", "reside"], supporting: ["home", "school", "routine"] }),
    scoreIssue({ issue: "supervised-parenting", label: "Supervised parenting", text: allText, strong: ["supervised", "supervision", "supervised access"], supporting: ["safety", "violence", "substance", "risk"] }),
    scoreIssue({ issue: "communication-between-parents", label: "Parent communication", text: allText, strong: ["communication", "won't communicate", "blocked", "messages"], supporting: ["co-parent", "conflict", "email", "text"] }),
    scoreIssue({ issue: "exchange-location", label: "Exchange location", text: allText, strong: ["exchange", "pickup", "drop off", "drop-off", "pick-up"], supporting: ["location", "police station", "school exchange"] }),
    scoreIssue({ issue: "schooling", label: "Schooling", text: allText, strong: ["school", "daycare", "education", "teacher"], supporting: ["report card", "attendance", "school change"] }),
    scoreIssue({ issue: "medical-decisions", label: "Medical decisions", text: allText, strong: ["medical", "doctor", "therapy", "counselling", "medication"], supporting: ["health", "treatment", "diagnosis"] }),
    scoreIssue({ issue: "mobility-relocation", label: "Mobility / relocation", text: allText, strong: ["relocation", "moving", "different city", "move away"], supporting: ["transportation", "new school"] }),
    scoreIssue({ issue: "withholding-parenting-time", label: "Withholding parenting time", text: allText, strong: ["withholding", "denied parenting", "won't let me see", "refuses visits"], supporting: ["missed visits", "cancelled", "blocked"] }),
  ]);

  const supportScores = getTop<SupportIssueType>([
    scoreIssue({ issue: "table-child-support", label: "Table child support", text: allText, strong: ["child support", "table support"], supporting: ["income", "guidelines"] }),
    scoreIssue({ issue: "section-7-expenses", label: "Section 7 / special expenses", text: allText, strong: ["section 7", "special expenses", "daycare", "childcare", "activities"], supporting: ["medical", "school", "receipts"] }),
    scoreIssue({ issue: "income-dispute", label: "Income dispute", text: allText, strong: ["income dispute", "hiding income", "underemployed", "cash income"], supporting: ["pay stub", "tax", "bank"] }),
    scoreIssue({ issue: "self-employment-income", label: "Self-employment income", text: allText, strong: ["self employed", "self-employed", "business income"], supporting: ["cash", "expenses", "corporation"] }),
    scoreIssue({ issue: "arrears", label: "Support arrears", text: allText, strong: ["arrears", "unpaid support", "behind on support"], supporting: ["froe", "enforcement"] }),
    scoreIssue({ issue: "financial-disclosure-missing", label: "Missing financial disclosure", text: allText, strong: ["missing disclosure", "won't provide", "refuses to provide", "financial disclosure"], supporting: ["tax return", "noa", "pay stub", "bank statement"] }),
    scoreIssue({ issue: "spousal-support-entitlement", label: "Spousal support entitlement", text: allText, strong: ["spousal support", "entitled to support"], supporting: ["married", "common law", "need", "income difference"] }),
  ]);

  const safetyScores = getTop<SafetyConcernType>([
    scoreIssue({ issue: "family-violence", label: "Family violence", text: allText, strong: ["family violence", "violence", "abuse", "hit", "assault"], supporting: ["fear", "unsafe", "police"] }),
    scoreIssue({ issue: "coercive-control", label: "Coercive control", text: allText, strong: ["coercive", "controlling", "isolated", "monitors", "controls money"], supporting: ["fear", "threat", "harassment"] }),
    scoreIssue({ issue: "harassment", label: "Harassment", text: allText, strong: ["harassment", "harassing", "constant messages"], supporting: ["blocked", "texts", "calls"] }),
    scoreIssue({ issue: "threats", label: "Threats", text: allText, strong: ["threat", "threatened", "said he would", "said she would"], supporting: ["fear", "police", "unsafe"] }),
    scoreIssue({ issue: "stalking", label: "Stalking", text: allText, strong: ["stalking", "following", "showed up", "tracking"], supporting: ["gps", "outside home", "workplace"] }),
    scoreIssue({ issue: "substance-use", label: "Substance use", text: allText, strong: ["drugs", "alcohol", "substance", "addiction", "intoxicated"], supporting: ["unsafe", "supervised"] }),
    scoreIssue({ issue: "child-abduction-risk", label: "Child abduction risk", text: allText, strong: ["abduct", "take the child", "won't return", "passport"], supporting: ["leave country", "hide child"] }),
    scoreIssue({ issue: "child-protection-involvement", label: "Child protection involvement", text: allText, strong: ["children's aid", "cas", "child protection", "society"], supporting: ["worker", "investigation"] }),
    scoreIssue({ issue: "police-involvement", label: "Police involvement", text: allText, strong: ["police", "occurrence", "911", "charges"], supporting: ["report", "incident"] }),
    scoreIssue({ issue: "restraining-order-needed", label: "Restraining order may be needed", text: allText, strong: ["restraining order", "no contact", "stay away"], supporting: ["threat", "unsafe"] }),
    scoreIssue({ issue: "supervision-needed", label: "Supervision may be needed", text: allText, strong: ["supervised", "supervision needed", "not safe alone"], supporting: ["risk", "violence", "substance"] }),
  ]);

  const propertyScores = getTop<PropertyIssueType>([
    scoreIssue({ issue: "matrimonial-home", label: "Matrimonial home", text: allText, strong: ["matrimonial home", "family home", "house"], supporting: ["mortgage", "sale", "occupy"] }),
    scoreIssue({ issue: "equalization", label: "Equalization", text: allText, strong: ["equalization", "net family property"], supporting: ["assets", "debts", "married"] }),
    scoreIssue({ issue: "debts", label: "Debts", text: allText, strong: ["debt", "credit card", "loan", "line of credit"], supporting: ["joint", "owed"] }),
    scoreIssue({ issue: "pensions", label: "Pensions", text: allText, strong: ["pension", "rrsp", "retirement"], supporting: ["asset", "division"] }),
    scoreIssue({ issue: "business-interest", label: "Business interest", text: allText, strong: ["business", "corporation", "self employed"], supporting: ["shares", "valuation"] }),
    scoreIssue({ issue: "sale-of-home", label: "Sale of home", text: allText, strong: ["sell the home", "sale of home", "force sale"], supporting: ["mortgage", "listing"] }),
  ]);

  const hasExistingOrder = includesAny(`${textBuckets.existingOrders} ${allText}`, ["order", "final order", "temporary order", "endorsement", "agreement"]);
  const hasUpcomingCourtDate = hasText(input.upcomingCourtDate) || includesAny(allText, ["court date", "hearing", "conference date", "motion date"]);
  const hasExistingCourtFile = hasExistingOrder || includesAny(textBuckets.documents, ["form", "application", "answer", "case conference", "court file"]);

  const hasMessages = includesAny(`${textBuckets.evidence} ${allText}`, ["text", "email", "message", "screenshot", "chat"]);
  const hasFinancialDisclosure = includesAny(`${textBuckets.disclosure} ${textBuckets.evidence} ${allText}`, ["tax return", "notice of assessment", "noa", "pay stub", "financial statement", "bank statement"]);
  const hasPoliceOrSafetyRecords = includesAny(`${textBuckets.police} ${textBuckets.safety} ${textBuckets.evidence}`, ["police", "occurrence", "911", "charge", "restraining", "threat"]);
  const hasSchoolOrMedicalRecords = includesAny(`${textBuckets.school} ${textBuckets.medical} ${textBuckets.evidence}`, ["school", "teacher", "daycare", "doctor", "medical", "therapy"]);

  const evidenceFlags = [hasMessages, hasFinancialDisclosure, hasPoliceOrSafetyRecords, hasSchoolOrMedicalRecords, hasText(input.evidence)].filter(Boolean).length;
  const evidenceReadiness = evidenceFlags >= 4 ? "strong" : evidenceFlags >= 2 ? "partial" : evidenceFlags === 1 ? "weak" : "unknown";

  const missingCoreEvidence: string[] = [];
  if (caseTypeScores.some((item) => item.issue === "parenting-time" || item.issue === "decision-making-responsibility") && !hasMessages && !hasText(input.parentingSchedule)) {
    missingCoreEvidence.push("Parenting schedule, messages, calendars, exchange records, and caregiving history are needed.");
  }
  if (caseTypeScores.some((item) => item.issue === "child-support" || item.issue === "spousal-support") && !hasFinancialDisclosure) {
    missingCoreEvidence.push("Financial disclosure is needed: tax returns, Notices of Assessment, pay stubs, and support-expense proof.");
  }
  if (caseTypeScores.some((item) => item.issue === "restraining-order") && !hasPoliceOrSafetyRecords) {
    missingCoreEvidence.push("Safety evidence should be organized: dates, messages, police occurrence numbers, witnesses, or prior orders.");
  }

  const urgencyFlags: string[] = [];
  if (includesAny(allText, ["urgent", "emergency", "immediate", "danger", "abduction", "unsafe", "tomorrow"])) {
    urgencyFlags.push("Urgent language was detected. The system should separate emergency facts from ordinary conflict.");
  }

  const safetyFlags = safetyScores.map((item) => item.label);
  const disclosureRisks: string[] = [];
  if (supportScores.some((item) => item.issue === "financial-disclosure-missing")) {
    disclosureRisks.push("Financial disclosure appears incomplete or disputed.");
  }

  const serviceRisks: string[] = [];
  if (stage === "not-started" || stage === "application-started") {
    serviceRisks.push("After documents are issued, service and proof of service must be tracked carefully.");
  }

  const credibilityRisks: string[] = [];
  if (includesAny(allText, ["crazy", "evil", "narcissist", "always lies", "bad mother", "bad father"])) {
    credibilityRisks.push("Emotionally charged labels should be replaced with specific incidents and evidence.");
  }

  const proceduralRisks: string[] = [];
  if (hasUpcomingCourtDate && !hasText(input.timeline)) {
    proceduralRisks.push("There is an upcoming court step, but the timeline is not organized yet.");
  }
  if (stage === "responding-to-application" && !input.receivedForms?.length) {
    proceduralRisks.push("The user appears to be responding, but received documents/forms have not been listed.");
  }

  const childFocusedRisks: string[] = [];
  if (caseTypeScores.some((item) => item.issue === "parenting-time" || item.issue === "decision-making-responsibility") && !hasText(input.goal)) {
    childFocusedRisks.push("The requested parenting order is not specific enough yet.");
  }

  const missingInformation: string[] = [];
  if (!hasText(input.childrenInfo) && parentingScores.length > 0) missingInformation.push("Children's names, ages, school/daycare, residence, and current schedule.");
  if (!hasText(input.currentLivingSituation) && parentingScores.length > 0) missingInformation.push("Current living arrangement and current parenting schedule.");
  if (!hasText(input.pastLivingHistory) && parentingScores.length > 0) missingInformation.push("Past caregiving history and who handled daily routines.");
  if (!hasText(input.goal)) missingInformation.push("Exact order or outcome requested from the court.");
  if (!hasText(input.timeline)) missingInformation.push("Timeline of major dates, incidents, payments, schedule changes, and court steps.");

  const recommendedQuestions: string[] = [];
  if (parentingScores.length > 0) {
    recommendedQuestions.push(
      "What exact parenting schedule is being requested?",
      "What is the current schedule and how long has it been in place?",
      "What facts show the proposed schedule is in the child's best interests?",
    );
  }
  if (supportScores.length > 0) {
    recommendedQuestions.push(
      "What are both parties' current incomes?",
      "What financial disclosure has been exchanged or refused?",
      "Are there section 7 or special expenses?",
    );
  }
  if (safetyScores.length > 0) {
    recommendedQuestions.push(
      "What specific safety incidents happened, on what dates, and what evidence supports each incident?",
      "Was police, CAS, medical help, or a shelter involved?",
    );
  }

  const suggestedIntakeFocus: string[] = [
    "Separate parenting, support, safety, property, and procedure into different sections.",
    "Turn emotional statements into dated facts, evidence, and requested orders.",
    "Connect every requested court order to a child-focused or evidence-backed reason.",
  ];

  const primary = caseTypeScores[0];

  return {
    courtPath: "family",
    stage,
    role,
    relationshipStatus,

    detectedCaseTypes: caseTypeScores,
    parentingIssues: parentingScores,
    supportIssues: supportScores,
    safetyIssues: safetyScores,
    propertyIssues: propertyScores,

    primaryCaseType: primary?.issue || "other",
    primaryLabel: primary?.label || "Family issue unclear",
    primaryConfidence: primary?.confidence || 0,

    procedural: {
      hasExistingCourtFile,
      hasUpcomingCourtDate,
      hasExistingOrder,
      filedDocuments: cleanList(input.filedDocuments || []),
      completedForms: cleanList(input.completedForms || []),
      receivedForms: cleanList(input.receivedForms || []),
      isStarting: stage === "not-started",
      isResponding: stage === "responding-to-application",
      isConference: stage === "case-conference" || stage === "settlement-conference" || stage === "trial-management-conference",
      isMotion: stage === "motion" || stage === "urgent-motion",
      isUrgent: stage === "urgent-motion" || urgencyFlags.length > 0,
      isTrial: stage === "trial",
      isEnforcement: stage === "enforcement",
    },

    children: {
      hasChildrenInfo: hasText(input.childrenInfo),
      hasCurrentSchedule: hasText(input.parentingSchedule) || hasText(input.currentLivingSituation),
      hasCaregivingHistory: hasText(input.pastLivingHistory),
      hasSchoolInfo: hasText(input.schoolIssues) || includesAny(allText, ["school", "daycare", "teacher"]),
      hasMedicalInfo: hasText(input.medicalIssues) || includesAny(allText, ["medical", "doctor", "therapy", "counselling"]),
      childCountEstimate: estimateChildCount(`${input.childrenInfo || ""} ${allText}`),
    },

    evidence: {
      hasEvidence: hasText(input.evidence),
      hasTimeline: hasText(input.timeline),
      hasMessages,
      hasFinancialDisclosure,
      hasPoliceOrSafetyRecords,
      hasSchoolOrMedicalRecords,
      readiness: evidenceReadiness,
      missingCoreEvidence: cleanList(missingCoreEvidence),
    },

    risks: {
      urgencyFlags: cleanList(urgencyFlags),
      safetyFlags: cleanList(safetyFlags),
      disclosureRisks: cleanList(disclosureRisks),
      serviceRisks: cleanList(serviceRisks),
      credibilityRisks: cleanList(credibilityRisks),
      proceduralRisks: cleanList(proceduralRisks),
      childFocusedRisks: cleanList(childFocusedRisks),
    },

    missingInformation: cleanList(missingInformation),
    recommendedQuestions: cleanList(recommendedQuestions),
    suggestedIntakeFocus: cleanList(suggestedIntakeFocus),

    internal: {
      normalizedText: allText,
      textBuckets,
    },
  };
}
