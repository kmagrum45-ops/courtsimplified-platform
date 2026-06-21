import type {
  FamilyCaseType,
  FamilyEvidenceCategory,
  ParentingIssueType,
  PropertyIssueType,
  SafetyConcernType,
  SupportIssueType,
} from "./types/family-case.ts";

import type { FamilyNormalizedIntake } from "./familyAiIntakeNormalizer";
import type { FamilyStrategyResult } from "./familyStrategyEngine";
import type { FamilyWorkflowResult } from "./familyWorkflowEngine";
import type { FamilyFormRoutingResult } from "./familyFormRoutingEngine";

export type FamilyEvidenceRawItem = {
  id?: string;
  title?: string;
  fileName?: string;
  description?: string;
  category?: string;
  date?: string;
  source?: string;
  relevance?: string;
  notes?: string;
  uploadedPath?: string;
  mimeType?: string;
};

export type FamilyEvidenceStrength =
  | "strong"
  | "useful"
  | "needs-context"
  | "weak"
  | "risky"
  | "unknown";

export type FamilyEvidenceIssueLink =
  | FamilyCaseType
  | ParentingIssueType
  | SupportIssueType
  | SafetyConcernType
  | PropertyIssueType
  | "procedure"
  | "credibility"
  | "service"
  | "disclosure"
  | "settlement"
  | "timeline";

export type FamilyEvidenceAnalysisItem = {
  id: string;
  title: string;
  fileName: string;
  category: FamilyEvidenceCategory;
  date: string;
  source: string;
  description: string;
  relevance: string;
  linkedIssues: FamilyEvidenceIssueLink[];
  strength: FamilyEvidenceStrength;
  strengthScore: number;
  exhibitGroup: string;
  affidavitUse: string[];
  judgeImpact: string[];
  weaknesses: string[];
  followUpQuestions: string[];
};

export type FamilyEvidenceGap = {
  issue: string;
  missingEvidence: string[];
  whyItMatters: string;
  priority: "critical" | "important" | "helpful";
};

export type FamilyEvidencePackage = {
  packageTitle: string;
  purpose: string;
  items: FamilyEvidenceAnalysisItem[];
  preparationNotes: string[];
};

export type FamilyEvidenceEngineInput = {
  normalized: FamilyNormalizedIntake;
  strategy: FamilyStrategyResult;
  workflow: FamilyWorkflowResult;
  formRouting: FamilyFormRoutingResult;
  rawEvidence?: FamilyEvidenceRawItem[];
};

export type FamilyEvidenceEngineResult = {
  analyzedEvidence: FamilyEvidenceAnalysisItem[];
  evidenceGaps: FamilyEvidenceGap[];
  evidencePackages: FamilyEvidencePackage[];
  exhibitOrder: FamilyEvidenceAnalysisItem[];
  strongestEvidence: FamilyEvidenceAnalysisItem[];
  riskyEvidence: FamilyEvidenceAnalysisItem[];
  affidavitSupportPoints: string[];
  judgeEvidenceConcerns: string[];
  evidenceUploadRequests: string[];
  contradictionWarnings: string[];
  timelineRecommendations: string[];
  summary: string;
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

function cleanList<T extends string>(items: Array<T | string | null | undefined | false>): T[] {
  return Array.from(
    new Set(
      items
        .map((item) => clean(item) as T)
        .filter((item) => item.length > 0),
    ),
  );
}

function includesAny(text: string, terms: string[]): boolean {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function makeId(prefix: string, index: number): string {
  return `${prefix}_${index + 1}`;
}

function detectCategory(item: FamilyEvidenceRawItem): FamilyEvidenceCategory {
  const text = normalize([
    item.title,
    item.fileName,
    item.description,
    item.category,
    item.source,
    item.relevance,
    item.notes,
    item.mimeType,
  ].join(" "));

  if (includesAny(text, ["order", "endorsement", "judgment", "court order"])) return "court-order";
  if (includesAny(text, ["application", "answer", "reply", "motion", "brief", "conference"])) return "court-application-answer-reply";
  if (includesAny(text, ["schedule", "calendar", "parenting time", "access log", "missed visit"])) return "parenting-schedule";
  if (includesAny(text, ["text", "email", "message", "screenshot", "chat", "sms", "messenger", "whatsapp"])) return "message-email-text";
  if (includesAny(text, ["police", "occurrence", "911", "charge", "incident report"])) return "police-report";
  if (includesAny(text, ["cas", "children's aid", "child protection", "society", "worker"])) return "child-protection-record";
  if (includesAny(text, ["school", "teacher", "report card", "attendance", "daycare", "education"])) return "school-record";
  if (includesAny(text, ["medical", "doctor", "hospital", "clinic", "diagnosis", "treatment"])) return "medical-record";
  if (includesAny(text, ["therapy", "counselling", "counseling", "therapist", "psychologist"])) return "therapy-counselling-record";
  if (includesAny(text, ["financial statement", "disclosure", "tax", "income", "noa", "notice of assessment"])) return "financial-disclosure";
  if (includesAny(text, ["tax return", "t1", "tax filing"])) return "income-tax-return";
  if (includesAny(text, ["notice of assessment", "noa"])) return "notice-of-assessment";
  if (includesAny(text, ["paystub", "pay stub", "payroll", "employment income"])) return "paystub";
  if (includesAny(text, ["bank", "account statement", "etransfer", "e-transfer", "transaction"])) return "bank-statement";
  if (includesAny(text, ["receipt", "expense", "invoice", "childcare", "activity", "daycare cost"])) return "expense-receipt";
  if (includesAny(text, ["section 7", "special expense", "extraordinary expense"])) return "section-7-expense-proof";
  if (includesAny(text, ["property", "asset", "debt", "pension", "vehicle", "valuation"])) return "property-document";
  if (includesAny(text, ["mortgage", "lease", "rent", "landlord", "home"])) return "mortgage-or-lease";
  if (includesAny(text, ["photo", "video", "image", "picture", "recording"])) return "photo-video";
  if (includesAny(text, ["witness", "statement", "saw", "heard"])) return "witness";
  if (includesAny(text, ["affidavit", "sworn"])) return "affidavit";
  if (includesAny(text, ["served", "service", "affidavit of service", "delivery"])) return "service-proof";
  if (includesAny(text, ["settlement", "offer", "proposal", "without prejudice"])) return "settlement-offer";

  return "other";
}

function linkIssues(
  category: FamilyEvidenceCategory,
  text: string,
  normalized: FamilyNormalizedIntake,
): FamilyEvidenceIssueLink[] {
  const links: FamilyEvidenceIssueLink[] = [];

  if (
    category === "parenting-schedule" ||
    category === "school-record" ||
    category === "medical-record" ||
    includesAny(text, ["parenting", "schedule", "custody", "decision", "access", "withholding"])
  ) {
    links.push("parenting-time", "decision-making", "parenting-schedule");
  }

  if (
    category === "financial-disclosure" ||
    category === "income-tax-return" ||
    category === "notice-of-assessment" ||
    category === "paystub" ||
    category === "bank-statement" ||
    category === "expense-receipt" ||
    category === "section-7-expense-proof" ||
    includesAny(text, ["support", "income", "expense", "arrears", "section 7"])
  ) {
    links.push("child-support", "table-child-support", "financial-disclosure-missing", "disclosure");
  }

  if (
    category === "police-report" ||
    category === "child-protection-record" ||
    category === "medical-record" ||
    category === "therapy-counselling-record" ||
    includesAny(text, ["violence", "threat", "abuse", "unsafe", "police", "harassment", "stalking"])
  ) {
    links.push("restraining-order", "family-violence", "police-involvement", "safety" as FamilyEvidenceIssueLink);
  }

  if (
    category === "property-document" ||
    category === "mortgage-or-lease" ||
    includesAny(text, ["home", "property", "equalization", "mortgage", "debt", "asset", "pension"])
  ) {
    links.push("property-division", "matrimonial-home", "equalization");
  }

  if (category === "court-order" || category === "court-application-answer-reply") {
    links.push("procedure");
  }

  if (category === "service-proof") {
    links.push("service");
  }

  if (category === "settlement-offer") {
    links.push("settlement");
  }

  if (includesAny(text, ["timeline", "date", "chronology"])) {
    links.push("timeline");
  }

  for (const issue of normalized.detectedCaseTypes) links.push(issue.issue);

  return cleanList(links);
}

function scoreEvidence(params: {
  category: FamilyEvidenceCategory;
  text: string;
  date: string;
  source: string;
  fileName: string;
  relevance: string;
  linkedIssues: FamilyEvidenceIssueLink[];
}): { strength: FamilyEvidenceStrength; score: number; weaknesses: string[] } {
  let score = 20;
  const weaknesses: string[] = [];

  if (params.fileName) score += 10;
  if (params.date) score += 15;
  if (params.source) score += 10;
  if (params.relevance) score += 10;
  if (params.linkedIssues.length > 0) score += 10;

  if (
    [
      "court-order",
      "court-application-answer-reply",
      "police-report",
      "child-protection-record",
      "school-record",
      "medical-record",
      "financial-disclosure",
      "income-tax-return",
      "notice-of-assessment",
      "paystub",
      "bank-statement",
      "mortgage-or-lease",
      "service-proof",
    ].includes(params.category)
  ) {
    score += 20;
  }

  if (["message-email-text", "photo-video", "witness", "settlement-offer"].includes(params.category)) {
    score += 10;
  }

  if (!params.date) weaknesses.push("Date is missing or unclear.");
  if (!params.source) weaknesses.push("Source is missing or unclear.");
  if (!params.relevance) weaknesses.push("Relevance to the court issue is not explained yet.");
  if (params.category === "other") weaknesses.push("Evidence category is unclear.");
  if (includesAny(params.text, ["maybe", "i think", "not sure", "heard from someone"])) {
    score -= 15;
    weaknesses.push("The description sounds uncertain or second-hand.");
  }

  const bounded = Math.max(0, Math.min(100, score));

  if (bounded >= 80) return { strength: "strong", score: bounded, weaknesses };
  if (bounded >= 60) return { strength: "useful", score: bounded, weaknesses };
  if (bounded >= 40) return { strength: "needs-context", score: bounded, weaknesses };
  if (weaknesses.length >= 3) return { strength: "weak", score: bounded, weaknesses };

  return { strength: "unknown", score: bounded, weaknesses };
}

function exhibitGroup(category: FamilyEvidenceCategory, links: FamilyEvidenceIssueLink[]): string {
  if (links.includes("family-violence") || links.includes("restraining-order")) return "Safety and protection evidence";
  if (links.includes("parenting-time") || links.includes("decision-making")) return "Parenting and best-interests evidence";
  if (links.includes("child-support") || links.includes("table-child-support") || links.includes("disclosure")) return "Support and financial disclosure evidence";
  if (links.includes("property-division") || links.includes("matrimonial-home") || links.includes("equalization")) return "Property and equalization evidence";
  if (category === "court-order" || category === "court-application-answer-reply") return "Court documents and procedural history";
  if (category === "service-proof") return "Service and filing evidence";
  if (category === "settlement-offer") return "Settlement and negotiation history";
  return "General family evidence";
}

function buildAffidavitUse(category: FamilyEvidenceCategory, links: FamilyEvidenceIssueLink[]): string[] {
  const uses: string[] = [];

  if (links.includes("parenting-time") || links.includes("decision-making")) {
    uses.push("Use to support the parenting schedule, caregiving history, or best-interests analysis.");
  }

  if (links.includes("family-violence") || links.includes("restraining-order")) {
    uses.push("Use to support specific safety incidents, urgency, supervision, or protective terms.");
  }

  if (links.includes("child-support") || links.includes("disclosure")) {
    uses.push("Use to support income, disclosure, expenses, arrears, or support calculations.");
  }

  if (links.includes("property-division")) {
    uses.push("Use to support property, debt, asset, or matrimonial-home claims.");
  }

  if (category === "court-order") {
    uses.push("Use to prove the current order, past terms, or procedural history.");
  }

  if (category === "service-proof") {
    uses.push("Use to prove service or delivery of court documents.");
  }

  return cleanList(uses.length > 0 ? uses : ["Use only if it is directly connected to a requested order or disputed fact."]);
}

function buildJudgeImpact(category: FamilyEvidenceCategory, links: FamilyEvidenceIssueLink[]): string[] {
  const impacts: string[] = [];

  if (category === "court-order") impacts.push("Helps the judge understand what orders already exist.");
  if (category === "parenting-schedule") impacts.push("Helps the judge compare the current routine against the proposed schedule.");
  if (category === "message-email-text") impacts.push("Can show communication patterns, admissions, denials, conflict, or missed parenting time.");
  if (category === "financial-disclosure") impacts.push("Helps the judge assess support, disclosure compliance, and financial credibility.");
  if (category === "police-report") impacts.push("Can support safety concerns if tied to specific incidents and requested orders.");
  if (category === "school-record") impacts.push("Can support stability, attendance, school needs, or relocation impacts.");
  if (category === "medical-record") impacts.push("Can support child needs, safety concerns, or health-related decision-making issues.");

  if (links.includes("family-violence")) impacts.push("May affect best-interests analysis and safety planning.");
  if (links.includes("disclosure")) impacts.push("May affect support calculations and procedural fairness.");

  return cleanList(impacts.length > 0 ? impacts : ["Judge impact depends on how clearly this evidence connects to a disputed issue."]);
}

function buildFollowUps(item: FamilyEvidenceRawItem, category: FamilyEvidenceCategory): string[] {
  const questions: string[] = [];

  if (!item.date) questions.push("What is the date of this evidence?");
  if (!item.source) questions.push("Who created or sent this evidence?");
  if (!item.relevance) questions.push("Which court issue does this evidence prove?");
  if (category === "message-email-text") questions.push("Does the screenshot show sender, recipient, date, and full context?");
  if (category === "police-report") questions.push("Is there an occurrence number or official report copy?");
  if (category === "financial-disclosure") questions.push("What time period does this financial document cover?");

  return cleanList(questions);
}

function analyzeItem(item: FamilyEvidenceRawItem, index: number, normalized: FamilyNormalizedIntake): FamilyEvidenceAnalysisItem {
  const category = detectCategory(item);
  const text = normalize([
    item.title,
    item.fileName,
    item.description,
    item.category,
    item.date,
    item.source,
    item.relevance,
    item.notes,
  ].join(" "));

  const linkedIssues = linkIssues(category, text, normalized);
  const scored = scoreEvidence({
    category,
    text,
    date: clean(item.date),
    source: clean(item.source),
    fileName: clean(item.fileName),
    relevance: clean(item.relevance),
    linkedIssues,
  });

  return {
    id: clean(item.id) || makeId("family_evidence", index),
    title: clean(item.title) || clean(item.fileName) || `Evidence item ${index + 1}`,
    fileName: clean(item.fileName),
    category,
    date: clean(item.date),
    source: clean(item.source),
    description: clean(item.description || item.notes),
    relevance: clean(item.relevance),
    linkedIssues,
    strength: scored.strength,
    strengthScore: scored.score,
    exhibitGroup: exhibitGroup(category, linkedIssues),
    affidavitUse: buildAffidavitUse(category, linkedIssues),
    judgeImpact: buildJudgeImpact(category, linkedIssues),
    weaknesses: scored.weaknesses,
    followUpQuestions: buildFollowUps(item, category),
  };
}

function buildEvidenceGaps(
  normalized: FamilyNormalizedIntake,
  workflow: FamilyWorkflowResult,
  formRouting: FamilyFormRoutingResult,
  analyzed: FamilyEvidenceAnalysisItem[],
): FamilyEvidenceGap[] {
  const gaps: FamilyEvidenceGap[] = [];
  const categories = analyzed.map((item) => item.category);
  const has = (category: FamilyEvidenceCategory) => categories.includes(category);

  if (workflow.parentingIssues.length > 0 && !has("parenting-schedule")) {
    gaps.push({
      issue: "Parenting schedule",
      missingEvidence: ["Current schedule", "Proposed schedule", "Calendar or parenting log"],
      whyItMatters: "Parenting requests are harder to assess without a clear current and proposed schedule.",
      priority: "critical",
    });
  }

  if (workflow.parentingIssues.length > 0 && !has("school-record")) {
    gaps.push({
      issue: "Child stability and school/daycare",
      missingEvidence: ["School/daycare information", "Attendance or teacher records if relevant"],
      whyItMatters: "School and routine evidence can support best-interests analysis.",
      priority: "important",
    });
  }

  if (workflow.supportIssues.length > 0 && !normalized.evidence.hasFinancialDisclosure) {
    gaps.push({
      issue: "Support disclosure",
      missingEvidence: ["Tax returns", "Notices of Assessment", "Pay stubs", "Proof of expenses"],
      whyItMatters: "Support claims require reliable income and expense information.",
      priority: "critical",
    });
  }

  if (workflow.safetyIssues.length > 0 && !normalized.evidence.hasPoliceOrSafetyRecords) {
    gaps.push({
      issue: "Safety allegations",
      missingEvidence: ["Dated incident list", "Messages", "Police records", "Witness names", "Medical or support records if applicable"],
      whyItMatters: "Safety concerns must be tied to specific facts and evidence, especially for urgent or protective orders.",
      priority: "critical",
    });
  }

  if (workflow.propertyIssues.length > 0 && !has("property-document") && !has("mortgage-or-lease")) {
    gaps.push({
      issue: "Property and equalization",
      missingEvidence: ["Property documents", "Mortgage/lease records", "Asset/debt statements", "Valuation records"],
      whyItMatters: "Property claims need organized disclosure before reliable form generation or settlement analysis.",
      priority: "important",
    });
  }

  if (formRouting.blockersBeforeGeneration.length > 0) {
    gaps.push({
      issue: "Form generation blockers",
      missingEvidence: formRouting.blockersBeforeGeneration,
      whyItMatters: "The form-routing engine identified missing information that should be fixed before final document generation.",
      priority: "critical",
    });
  }

  return gaps;
}

function buildPackages(analyzed: FamilyEvidenceAnalysisItem[]): FamilyEvidencePackage[] {
  const groups = new Map<string, FamilyEvidenceAnalysisItem[]>();

  for (const item of analyzed) {
    const current = groups.get(item.exhibitGroup) || [];
    current.push(item);
    groups.set(item.exhibitGroup, current);
  }

  return Array.from(groups.entries()).map(([packageTitle, items]) => ({
    packageTitle,
    purpose: `Organizes evidence for ${packageTitle.toLowerCase()}.`,
    items: items.sort((a, b) => b.strengthScore - a.strengthScore),
    preparationNotes: cleanList([
      "Place strongest and clearest evidence first.",
      "Add dates and source information before using this evidence in affidavits or briefs.",
      "Connect each item to a requested order or disputed fact.",
    ]),
  }));
}

export function runFamilyEvidenceEngine(input: FamilyEvidenceEngineInput): FamilyEvidenceEngineResult {
  const rawEvidence = input.rawEvidence || [];
  const analyzedEvidence = rawEvidence.map((item, index) => analyzeItem(item, index, input.normalized));

  const evidenceGaps = buildEvidenceGaps(
    input.normalized,
    input.workflow,
    input.formRouting,
    analyzedEvidence,
  );

  const evidencePackages = buildPackages(analyzedEvidence);
  const exhibitOrder = [...analyzedEvidence].sort((a, b) => {
    if (a.exhibitGroup !== b.exhibitGroup) return a.exhibitGroup.localeCompare(b.exhibitGroup);
    return b.strengthScore - a.strengthScore;
  });

  const strongestEvidence = analyzedEvidence
    .filter((item) => item.strength === "strong" || item.strength === "useful")
    .sort((a, b) => b.strengthScore - a.strengthScore);

  const riskyEvidence = analyzedEvidence
    .filter((item) => item.strength === "risky" || item.strength === "weak" || item.weaknesses.length >= 2)
    .sort((a, b) => a.strengthScore - b.strengthScore);

  const affidavitSupportPoints = cleanList(
    analyzedEvidence.flatMap((item) => item.affidavitUse.map((use) => `${item.title}: ${use}`)),
  );

  const judgeEvidenceConcerns = cleanList([
    ...evidenceGaps.map((gap) => `${gap.issue}: ${gap.whyItMatters}`),
    ...riskyEvidence.flatMap((item) => item.weaknesses.map((weakness) => `${item.title}: ${weakness}`)),
  ]);

  const evidenceUploadRequests = cleanList([
    ...evidenceGaps.flatMap((gap) => gap.missingEvidence),
    ...input.strategy.recommendedEvidence,
    ...input.workflow.evidenceNeededNow,
  ]);

  const contradictionWarnings = cleanList([
    ...analyzedEvidence
      .filter((item) => includesAny(`${item.description}`, ["contradict", "inconsistent", "different story", "does not match"]))
      .map((item) => `${item.title} may contain or reveal an inconsistency that should be explained before filing.`),
  ]);

  const timelineRecommendations = cleanList([
    input.normalized.evidence.hasTimeline ? "Timeline evidence exists but should be matched to exhibits." : "Create a dated timeline before affidavit or conference brief generation.",
    ...analyzedEvidence
      .filter((item) => !item.date)
      .map((item) => `Add a date or date range for ${item.title}.`),
  ]);

  const summary = cleanList([
    `${analyzedEvidence.length} evidence item(s) analyzed.`,
    `${evidenceGaps.length} evidence gap(s) detected.`,
    strongestEvidence.length > 0
      ? `${strongestEvidence.length} item(s) appear strong or useful.`
      : "No strong evidence items have been identified yet.",
    riskyEvidence.length > 0
      ? `${riskyEvidence.length} item(s) need context before being used.`
      : "No high-risk evidence items detected from the current evidence list.",
  ]).join(" ");

  return {
    analyzedEvidence,
    evidenceGaps,
    evidencePackages,
    exhibitOrder,
    strongestEvidence,
    riskyEvidence,
    affidavitSupportPoints,
    judgeEvidenceConcerns,
    evidenceUploadRequests,
    contradictionWarnings,
    timelineRecommendations,
    summary,
  };
}
