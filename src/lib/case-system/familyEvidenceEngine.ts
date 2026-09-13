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
  exhibitGroup: string;
  affidavitUse: string[];
  // A `judgeImpact: string[]` field was computed for every item and read by
  // nothing. Its entries predicted what a judge would take from a document
  // ("Helps the judge assess support, disclosure compliance, and financial
  // credibility"), and its fallback asserted "Judge impact depends on...".
  // Predicting a decision-maker's reaction is prohibited by CLAUDE.md section 3
  // whether or not anything renders it; dead code that makes a prediction is
  // still a prediction waiting for a consumer.
  /**
   * What this item does not yet record — a missing date, an unnamed source, no
   * stated connection to a court issue. Each entry is a fact about the record,
   * not a judgment about the evidence. This replaces the `strength` /
   * `strengthScore` pair, which graded each item on a 0-100 scale and then
   * bucketed it strong / useful / needs-context / weak / risky (CLAUDE.md
   * section 3).
   */
  missingDetails: string[];
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
  /** Items whose date, source, category and relevance are all recorded. */
  completeEvidence: FamilyEvidenceAnalysisItem[];
  /** Items still missing one or more of those details. */
  incompleteEvidence: FamilyEvidenceAnalysisItem[];
  affidavitSupportPoints: string[];
  evidenceDetailsToConfirm: string[];
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

/**
 * What an item does not yet record.
 *
 * This replaces `scoreEvidence`, which started every item at 20, added points
 * for a filename, a date, a source, a relevance note and a linked issue, added
 * 20 more for a "good" document category and 10 for a lesser one, subtracted 15
 * if the user's own description contained "maybe" or "i think", clamped the
 * result to 0-100 and bucketed it strong / useful / needs-context / weak /
 * risky. That is a grade of the user's evidence, which CLAUDE.md section 3
 * prohibits, and the number and the ladder both reached the user — the ladder
 * through `recommendedEvidence` and `analysis.summary`.
 *
 * The partition that replaces it is the one `elementProofEngine` uses for
 * claim elements: recorded versus not recorded. Each entry below is a checkable
 * fact about the record ("no date is recorded"), never a judgment about the
 * evidence ("this is weak"). The category weighting is gone: no document type
 * is worth more points than another here, because ranking document types is
 * grading. The hedging penalty is gone with no replacement — reading
 * uncertainty into a user's phrasing is a credibility judgment and there is no
 * factual restatement of it.
 */
function missingDetailsFor(params: {
  category: FamilyEvidenceCategory;
  date: string;
  source: string;
  relevance: string;
}): string[] {
  const missing: string[] = [];

  if (!params.date) missing.push("No date is recorded for this item.");
  if (!params.source) missing.push("No source is recorded — who created or sent it.");
  if (!params.relevance) missing.push("No court issue is recorded for this item yet.");
  if (params.category === "other") missing.push("No evidence category is recorded.");

  return missing;
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
  const missingDetails = missingDetailsFor({
    category,
    date: clean(item.date),
    source: clean(item.source),
    relevance: clean(item.relevance),
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
    exhibitGroup: exhibitGroup(category, linkedIssues),
    affidavitUse: buildAffidavitUse(category, linkedIssues),
    missingDetails,
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
    // Input order. Sorting by a computed grade is what `strengthScore` did.
    items,
    preparationNotes: cleanList([
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
  // Grouped for the exhibit brief, and within a group left in the order the
  // user entered them. The old secondary sort was by strengthScore.
  const exhibitOrder = [...analyzedEvidence].sort((a, b) =>
    a.exhibitGroup.localeCompare(b.exhibitGroup),
  );

  // The recorded-vs-not partition, replacing strongestEvidence / riskyEvidence.
  // Membership is decided entirely by whether details are recorded, so a user
  // can move an item across the line by supplying a date or a source — which is
  // not true of a grade.
  const completeEvidence = analyzedEvidence.filter((item) => item.missingDetails.length === 0);
  const incompleteEvidence = analyzedEvidence.filter((item) => item.missingDetails.length > 0);

  const affidavitSupportPoints = cleanList(
    analyzedEvidence.flatMap((item) => item.affidavitUse.map((use) => `${item.title}: ${use}`)),
  );

  // Was `judgeEvidenceConcerns`, built from `riskyEvidence`. The name asserted
  // what a judge would be concerned by; the content is a list of details the
  // record does not yet hold.
  const evidenceDetailsToConfirm = cleanList([
    ...evidenceGaps.map((gap) => `${gap.issue}: ${gap.whyItMatters}`),
    ...incompleteEvidence.flatMap((item) =>
      item.missingDetails.map((detail) => `${item.title}: ${detail}`),
    ),
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
    `${completeEvidence.length} item(s) have a date, a source, a category and a court issue recorded.`,
    incompleteEvidence.length > 0
      ? `${incompleteEvidence.length} item(s) are still missing one or more of those details.`
      : "No item is missing those details.",
  ]).join(" ");

  return {
    analyzedEvidence,
    evidenceGaps,
    evidencePackages,
    exhibitOrder,
    completeEvidence,
    incompleteEvidence,
    affidavitSupportPoints,
    evidenceDetailsToConfirm,
    evidenceUploadRequests,
    contradictionWarnings,
    timelineRecommendations,
    summary,
  };
}
