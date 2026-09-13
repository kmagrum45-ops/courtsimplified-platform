import {
  extractDollarAmounts,
  ONTARIO_SMALL_CLAIMS_LIMIT,
} from "../utils";

import {
  filingFactsFromNarrative,
  withoutAnsweredQuestions,
} from "./answeredQuestions";

import {
  ClaimClassification,
  ClaimElementAssessment,
  ClaimElementStatus,
  ClaimClassificationStatus,
  ContradictionFinding,
  CourtSimplifiedBrainInput,
  CourtSimplifiedBrainOutput,
  DesiredOutcome,
  ElementProofEngineResult,
  EvidenceIssueLink,
  FormRecommendation,
  IntelligenceConfidence,
  IntelligenceCourtPath,
  IntelligenceProvince,
  IntelligenceSeverity,
  IntelligenceStage,
  LegalDomain,
  LegalIntelligenceResult,
  LegalKnowledgePacket,
  LimitationPeriodAssessment,
  LitigationRisk,
  MissingInformationFinding,
  NormalizedIntake,
  ProceduralPostureAssessment,
  RemedyFitAssessment,
} from "./intelligenceTypes";

import { normalizeIntake } from "./intakeNormalizationEngine";
import { buildElementProofAnalysis } from "./elementProofEngine";
import { buildBrainMigrationLayer } from "../orchestration/brainMigrationLayer";
import { buildEvidenceIntelligenceAnalysis } from "../evidence/evidenceIntelligenceEngine";

import {
  buildKnowledgeRetrievalContext,
  retrieveKnowledgeObjects,
} from "../knowledge/knowledgeRetrievalEngine";

import { getDoctrineSeedLibrary } from "../knowledge/doctrineSeedLibrary";
import { buildProductionReadyLegalKnowledge } from "../authority-intelligence/authorityRetrievalEngine";
import { sanitizeCognitionOutput, sanitizeSummaryText, sanitizeTextArray, validateCaseStrengthLanguage } from "./caseStrengthLanguageValidator";

type GptCognitionClaim = {
  claimType?: string;
  status?: string;
  score?: number;
  confidence?: string;
  explanation?: string;
  elements?: {
    elementKey?: string;
    label?: string;
    status?: string;
    explanation?: string;
    missingFacts?: string[];
    risks?: string[];
  }[];
};

type GptCognitionOutput = {
  courtPath?: string;
  province?: string;
  stage?: string;
  confidence?: string;
  primaryClaimTypes?: string[];
  rejectedFalsePositives?: GptCognitionClaim[];
  claimClassifications?: GptCognitionClaim[];
  missingInformation?: {
    field?: string;
    question?: string;
    reason?: string;
    requiredFor?: string;
    severity?: string;
  }[];
  evidenceIssueLinks?: {
    issueLabel?: string;
    claimType?: string;
    requiredProof?: string;
    missingEvidence?: string[];
    explanation?: string;
  }[];
  litigationRisks?: {
    title?: string;
    explanation?: string;
    severity?: string;
    source?: string;
    claimType?: string;
    suggestedFix?: string;
  }[];
  formRecommendations?: {
    formNumber?: string;
    title?: string;
    courtPath?: string;
    stage?: string;
    reason?: string;
    confidence?: string;
    notRecommendedForms?: string[];
    warnings?: string[];
  }[];
  // Session 48: the model no longer writes either summary as free text. It
  // supplies these two arrays and composeCaseFileSummary() assembles both.
  // plainLanguageSummary/structuredCaseSummary remain declared because saved
  // records and older responses carry them; nothing reads them any more.
  caseFileRecorded?: string[];
  caseFileNotRecorded?: string[];
  plainLanguageSummary?: string;
  structuredCaseSummary?: string;
  nextBestActions?: string[];
  systemWarnings?: string[];
};

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function clean(value: unknown): string {
  return String(value || "").trim();
}

function normalizeText(value: unknown): string {
  return clean(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function cleanList(items: unknown[]): string[] {
  return Array.from(new Set(items.map(clean).filter(Boolean)));
}

function safeArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function includesAny(text: string, terms: string[]): boolean {
  const normalized = normalizeText(text);
  return terms.some((term) => normalized.includes(normalizeText(term)));
}

function clampScore(value: unknown): number {
  const score = Number(value);
  if (!Number.isFinite(score)) return 50;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function asConfidence(value: unknown): IntelligenceConfidence {
  const text = clean(value);
  if (
    text === "very-low" ||
    text === "low" ||
    text === "medium" ||
    text === "high" ||
    text === "very-high"
  ) {
    return text;
  }

  return "medium";
}

function asSeverity(value: unknown): IntelligenceSeverity {
  const text = clean(value);

  if (
    text === "info" ||
    text === "low" ||
    text === "medium" ||
    text === "high" ||
    text === "critical"
  ) {
    return text;
  }

  return "medium";
}

function asCourtPath(value: unknown, fallback: IntelligenceCourtPath): IntelligenceCourtPath {
  const text = clean(value);

  if (
    text === "family" ||
    text === "small-claims" ||
    text === "civil" ||
    text === "tribunal" ||
    text === "ltb" ||
    text === "immigration" ||
    text === "criminal-related" ||
    text === "unknown"
  ) {
    return text;
  }

  return fallback || "unknown";
}

function asProvince(value: unknown, fallback: IntelligenceProvince): IntelligenceProvince {
  const text = clean(value);

  if (
    text === "Ontario" ||
    text === "Alberta" ||
    text === "British Columbia" ||
    text === "Manitoba" ||
    text === "New Brunswick" ||
    text === "Newfoundland and Labrador" ||
    text === "Northwest Territories" ||
    text === "Nova Scotia" ||
    text === "Nunavut" ||
    text === "Prince Edward Island" ||
    text === "Quebec" ||
    text === "Saskatchewan" ||
    text === "Yukon" ||
    text === "Federal" ||
    text === "Unknown"
  ) {
    return text;
  }

  return fallback || "Ontario";
}

function asStage(value: unknown, fallback: IntelligenceStage): IntelligenceStage {
  const text = clean(value);

  if (
    text === "starting-case" ||
    text === "responding" ||
    text === "already-started" ||
    text === "conference" ||
    text === "motion" ||
    text === "trial" ||
    text === "enforcement" ||
    text === "appeal" ||
    text === "urgent" ||
    text === "settlement" ||
    text === "not-sure"
  ) {
    return text;
  }

  return fallback || "not-sure";
}

function asDomain(value: unknown): LegalDomain {
  const text = clean(value);

  if (
    text === "defamation" ||
    text === "contract" ||
    text === "property-damage" ||
    text === "negligence" ||
    text === "personal-injury" ||
    text === "harassment" ||
    text === "employment" ||
    text === "debt" ||
    text === "consumer" ||
    text === "family-parenting" ||
    text === "family-support" ||
    text === "family-property" ||
    text === "family-safety" ||
    text === "civil-charter" ||
    text === "civil-human-rights" ||
    text === "civil-institutional-liability" ||
    text === "landlord-tenant" ||
    text === "immigration" ||
    text === "procedural" ||
    text === "unknown"
  ) {
    return text;
  }

  return "unknown";
}

function asClaimStatus(value: unknown): ClaimClassificationStatus {
  const text = clean(value);

  if (
    text === "detected" ||
    text === "possible" ||
    text === "insufficient-facts" ||
    text === "rejected-false-positive" ||
    text === "conflicting-signals"
  ) {
    return text;
  }

  return "possible";
}

function confidenceFromScore(score: number): IntelligenceConfidence {
  if (score >= 85) return "high";
  if (score >= 60) return "medium";
  if (score >= 35) return "low";
  return "very-low";
}

type BrainFactPatternCategory =
  | "admission"
  | "denial"
  | "contradiction"
  | "timeline"
  | "motive"
  | "intent"
  | "knowledge"
  | "notice"
  | "credibility"
  | "conduct"
  | "causation"
  | "damages"
  | "procedure"
  | "unknown";

type BrainFactPatternFinding = {
  id: string;
  category: BrainFactPatternCategory;
  title: string;
  description: string;
  supportingFactIds: string[];
  supportingEvidenceIds: string[];
  confidence: IntelligenceConfidence;
  severity: IntelligenceSeverity;
  significance: string;
  litigationImpact: string;
};

type BrainFactPatternAnalysisResult = {
  version: "1.0.0";
  findings: BrainFactPatternFinding[];
  admissions: BrainFactPatternFinding[];
  contradictions: BrainFactPatternFinding[];
  credibilityIssues: BrainFactPatternFinding[];
  knowledgeIndicators: BrainFactPatternFinding[];
  timelineIssues: BrainFactPatternFinding[];
  causationIssues: BrainFactPatternFinding[];
  damagesIndicators: BrainFactPatternFinding[];
  strongestPatterns: string[];
  weakestPatterns: string[];
  nextActions: string[];
  summary: string;
};

function factPatternConfidenceFromCount(count: number): IntelligenceConfidence {
  if (count >= 6) return "high";
  if (count >= 3) return "medium";
  if (count >= 1) return "low";
  return "very-low";
}

function severityForFactPatternCategory(
  category: BrainFactPatternCategory,
): IntelligenceSeverity {
  if (
    category === "contradiction" ||
    category === "credibility" ||
    category === "causation"
  ) {
    return "high";
  }

  if (
    category === "admission" ||
    category === "denial" ||
    category === "timeline" ||
    category === "knowledge" ||
    category === "notice"
  ) {
    return "medium";
  }

  return "low";
}

function buildFactPatternFinding(args: {
  category: BrainFactPatternCategory;
  title: string;
  description: string;
  supportingFactIds?: string[];
  supportingEvidenceIds?: string[];
  confidence?: IntelligenceConfidence;
  significance: string;
  litigationImpact: string;
}): BrainFactPatternFinding {
  return {
    id: createId("fact_pattern"),
    category: args.category,
    title: args.title,
    description: args.description,
    supportingFactIds: args.supportingFactIds || [],
    supportingEvidenceIds: args.supportingEvidenceIds || [],
    confidence: args.confidence || "medium",
    severity: severityForFactPatternCategory(args.category),
    significance: args.significance,
    litigationImpact: args.litigationImpact,
  };
}

function buildFactPatternAnalysis(
  intake: NormalizedIntake,
): BrainFactPatternAnalysisResult {
  const raw = normalizeText(intake.rawUserText);
  const findings: BrainFactPatternFinding[] = [];

  if (
    includesAny(raw, [
      "admitted",
      "admits",
      "said they did",
      "confirmed",
      "acknowledged",
    ])
  ) {
    findings.push(
      buildFactPatternFinding({
        category: "admission",
        title: "Possible admission detected",
        description:
          "The intake contains language suggesting that someone may have admitted or acknowledged an important fact.",
        confidence: "medium",
        significance:
          "Admissions can be important because they may reduce what needs to be proven through other evidence.",
        litigationImpact:
          "The system should preserve the exact words, speaker, date, context, and supporting document before relying on this as an admission.",
      }),
    );
  }

  if (
    includesAny(raw, [
      "denied",
      "denies",
      "never",
      "refused",
      "said it never happened",
    ])
  ) {
    findings.push(
      buildFactPatternFinding({
        category: "denial",
        title: "Possible denial detected",
        description:
          "The intake contains language suggesting that a party denied an important fact.",
        confidence: "medium",
        significance:
          "A denial can create a dispute that must be supported or challenged with records, dates, messages, or witness evidence.",
        litigationImpact:
          "The system should compare the denial against documents, payment records, messages, admissions, and timeline evidence.",
      }),
    );
  }

  if (
    includesAny(raw, [
      "but",
      "however",
      "contradict",
      "doesn't match",
      "does not match",
      "different story",
    ])
  ) {
    findings.push(
      buildFactPatternFinding({
        category: "contradiction",
        title: "Possible factual contradiction detected",
        description:
          "The intake contains signals that two facts, statements, or records may not match.",
        supportingEvidenceIds: intake.evidence.map((item) => item.id),
        confidence: "medium",
        significance:
          "Contradictions can affect credibility, proof strength, settlement pressure, and court readiness.",
        litigationImpact:
          "The system should compare each conflicting statement against the timeline, documents, evidence, and prior admissions.",
      }),
    );
  }

  if (
    intake.dates.length > 0 ||
    includesAny(raw, ["before", "after", "then", "later", "deadline", "late"])
  ) {
    findings.push(
      buildFactPatternFinding({
        category: "timeline",
        title: "Timeline significance detected",
        description:
          "The intake contains date, sequence, delay, or deadline signals.",
        supportingFactIds: intake.events.map((event) => event.id),
        supportingEvidenceIds: intake.evidence.map((item) => item.id),
        confidence: factPatternConfidenceFromCount(
          intake.dates.length + intake.events.length,
        ),
        significance:
          "Timeline order can affect limitation periods, procedural steps, credibility, causation, and proof.",
        litigationImpact:
          "The system should build a date-by-date chronology before generating final court materials.",
      }),
    );
  }

  if (
    includesAny(raw, [
      "knew",
      "known",
      "notice",
      "warned",
      "told",
      "aware",
    ])
  ) {
    findings.push(
      buildFactPatternFinding({
        category:
          raw.includes("notice") || raw.includes("warned") ? "notice" : "knowledge",
        title: "Knowledge or notice signal detected",
        description:
          "The intake contains language suggesting that a party may have known about, been warned about, or received notice of an important fact.",
        confidence: "medium",
        significance:
          "Knowledge and notice can matter to responsibility, foreseeability, credibility, procedural fairness, and causation.",
        litigationImpact:
          "The system should identify who knew what, when they knew it, how they knew it, and what record proves it.",
      }),
    );
  }

  if (
    includesAny(raw, [
      "because",
      "caused",
      "led to",
      "resulted in",
      "due to",
    ])
  ) {
    findings.push(
      buildFactPatternFinding({
        category: "causation",
        title: "Causation signal detected",
        description:
          "The intake contains language connecting one event, act, omission, or decision to a harm or result.",
        confidence: "medium",
        significance:
          "Causation is often one of the hardest parts of a case and usually needs a clear chain of proof.",
        litigationImpact:
          "The system should test whether the evidence proves more than timing or suspicion and actually supports the causal link.",
      }),
    );
  }

  if (intake.moneyAmounts.length > 0 || intake.harms.length > 0) {
    findings.push(
      buildFactPatternFinding({
        category: "damages",
        title: "Damages or harm signal detected",
        description:
          "The intake contains money amounts, losses, expenses, harm, or requested outcomes.",
        supportingFactIds: intake.harms.map((harm) => harm.id),
        supportingEvidenceIds: intake.evidence.map((item) => item.id),
        confidence: factPatternConfidenceFromCount(
          intake.moneyAmounts.length + intake.harms.length,
        ),
        significance:
          "Damages must usually be proven with records, calculations, receipts, testimony, or other reliable evidence.",
        litigationImpact:
          "The system should separate claimed losses from proven losses and identify missing damages evidence.",
      }),
    );
  }

  const evidenceLinkedEvents = intake.events.filter(
    (event) => event.evidenceIds.length > 0,
  );

  if (evidenceLinkedEvents.length > 0) {
    findings.push(
      buildFactPatternFinding({
        category: "conduct",
        title: "Evidence-linked fact pattern detected",
        description:
          "Some extracted facts or events are already connected to evidence.",
        supportingFactIds: evidenceLinkedEvents.map((event) => event.id),
        supportingEvidenceIds: cleanList(
          evidenceLinkedEvents.flatMap((event) => event.evidenceIds),
        ),
        confidence: factPatternConfidenceFromCount(evidenceLinkedEvents.length),
        significance:
          "Facts connected to evidence are more useful for proof mapping than unsupported narrative statements.",
        litigationImpact:
          "The system should prioritize evidence-linked facts when building proof maps and court materials.",
      }),
    );
  }

  const admissions = findings.filter((finding) => finding.category === "admission");
  const contradictions = findings.filter(
    (finding) => finding.category === "contradiction",
  );
  const credibilityIssues = findings.filter(
    (finding) =>
      finding.category === "credibility" ||
      finding.category === "contradiction" ||
      finding.category === "denial",
  );
  const knowledgeIndicators = findings.filter(
    (finding) => finding.category === "knowledge" || finding.category === "notice",
  );
  const timelineIssues = findings.filter(
    (finding) => finding.category === "timeline",
  );
  const causationIssues = findings.filter(
    (finding) => finding.category === "causation",
  );
  const damagesIndicators = findings.filter(
    (finding) => finding.category === "damages",
  );

  const strongestPatterns = findings
    .filter(
      (finding) =>
        finding.confidence === "high" || finding.confidence === "very-high",
    )
    .map((finding) => finding.title);

  const weakestPatterns = findings
    .filter(
      (finding) =>
        finding.confidence === "low" || finding.confidence === "very-low",
    )
    .map((finding) => finding.title);

  const nextActions = cleanList([
    findings.length > 0
      ? "Review detected fact patterns and connect each one to specific evidence."
      : "Collect more facts before relying on fact pattern analysis.",
    admissions.length > 0
      ? "Preserve exact words, dates, speaker, recipient, and context for each possible admission."
      : "",
    contradictions.length > 0
      ? "Compare contradictions against messages, documents, timeline entries, and prior statements."
      : "",
    credibilityIssues.length > 0
      ? "Resolve credibility issues before generating final court materials."
      : "",
    timelineIssues.length > 0
      ? "Build a date-by-date litigation chronology."
      : "",
    causationIssues.length > 0
      ? "Test whether the evidence proves causation, not just timing."
      : "",
    damagesIndicators.length > 0
      ? "Separate claimed damages from proven damages and collect supporting records."
      : "",
  ]);

  return {
    version: "1.0.0",
    findings,
    admissions,
    contradictions,
    credibilityIssues,
    knowledgeIndicators,
    timelineIssues,
    causationIssues,
    damagesIndicators,
    strongestPatterns,
    weakestPatterns,
    nextActions,
    summary:
      findings.length > 0
        ? `Fact pattern analysis detected ${findings.length} litigation pattern(s).`
        : "No major fact patterns were detected from the current intake.",
  };
}
function buildLegalKnowledge(args: {
  courtPath: IntelligenceCourtPath;
  province: IntelligenceProvince;
  stage: IntelligenceStage;
  primaryClaimTypes: LegalDomain[];
}): LegalKnowledgePacket {
  const verifiedAuthorities = buildProductionReadyLegalKnowledge({
    context: {
      courtPath: args.courtPath,
      jurisdiction: args.province,
      stage: args.stage,
      legalDomains: args.primaryClaimTypes.length
        ? args.primaryClaimTypes
        : ["unknown"],
    },
  });
  const context = buildKnowledgeRetrievalContext({
    courtPath: args.courtPath,
    jurisdiction: args.province,
    stage: args.stage,
    legalDomains: args.primaryClaimTypes.length
      ? args.primaryClaimTypes
      : ["unknown"],
    includeOperationalGuidance: true,
    includeAiInference: false,
    requiresVerifiedOnly: false,
  });

  const retrieval = retrieveKnowledgeObjects({
    objects: getDoctrineSeedLibrary(),
    context,
    mode: "operational",
  });

  const contextWarnings = retrieval.warnings.filter((warning) =>
    warning.startsWith("Knowledge retrieval warning:"),
  );

  return {
    statutes: verifiedAuthorities.statutes,
    proceduralRules: verifiedAuthorities.proceduralRules,
    precedents: verifiedAuthorities.precedents,
    officialGuidance: verifiedAuthorities.officialGuidance,
    precedentMatches: verifiedAuthorities.precedentMatches,
    sourceWarnings: cleanList([
      ...verifiedAuthorities.sourceWarnings,
      "Retrieved knowledge objects are operational guidance only unless separately verified.",
      "Do not cite operational guidance as law.",
      "Do not cite cases, statutes, court rules, deadlines, or official form requirements until verified against official sources.",
      ...contextWarnings,
    ]),
  };
}

function buildRemedyFit(
  domain: LegalDomain,
  courtPath: IntelligenceCourtPath,
): RemedyFitAssessment[] {
  return [
    {
      id: createId("remedy_fit"),
      requestedRemedy: "money-damages",
      courtPath,
      fit:
        courtPath === "small-claims" ||
        courtPath === "civil" ||
        courtPath === "family"
          ? "possibly-available"
          : "unknown",
      reasons: [
        "Remedy fit requires verified court-path and forum analysis before final filing guidance.",
      ],
      warnings: [
        "Remedies must be verified against the selected court, tribunal, procedure, and official form requirements.",
      ],
      alternativeRemedies:
        domain === "defamation"
          ? ["apology", "retraction", "costs"]
          : ["costs", "interest"],
    },
  ];
}

function buildProceduralPosture(args: {
  cognition: GptCognitionOutput | null;
  normalizedIntake: NormalizedIntake;
}): ProceduralPostureAssessment {
  const courtPath = asCourtPath(
    args.cognition?.courtPath,
    args.normalizedIntake.courtPath,
  );

  const province = asProvince(
    args.cognition?.province,
    args.normalizedIntake.province,
  );

  const stage = args.normalizedIntake.stage;

  const rawText = args.normalizedIntake.rawUserText;

  return {
    courtPath,
    province,
    stage,
    confidence: asConfidence(args.cognition?.confidence),
    reasons: cleanList([
      "Procedural posture was produced through structured CourtSimplified cognition.",
      `Court path: ${courtPath}.`,
      `Province: ${province}.`,
      `Stage: ${stage}.`,
    ]),
    missingProcedureInfo: cleanList([
      stage === "not-sure"
        ? "Clarify whether the user is starting, responding, at conference, motion, trial, enforcement, appeal, settlement, or urgent stage."
        : "",
      includesAny(rawText, ["deadline", "limitation", "served", "court date"])
        ? "Confirm exact deadlines, service dates, filed documents, and court dates before final filing guidance."
        : "Confirm deadlines, filed documents, served documents, court dates, and limitation concerns before final filing guidance.",
    ]),
    // Questions the recorded documents already answer are dropped here rather
    // than in each court path, so all three inherit the same behaviour.
    nextProceduralQuestions: withoutAnsweredQuestions(
      cleanList([
        "Has anything already been filed?",
        "Has anything already been served?",
        "Are there court dates, limitation dates, or urgent deadlines?",
        includesAny(rawText, ["crown", "police", "government", "public authority"])
          ? "Does this claim require leave, notice, or a public-authority screening step?"
          : "",
      ]),
      filingFactsFromNarrative(rawText),
    ),
    warnings: cleanList([
      courtPath === "unknown" ? "Court path requires confirmation." : "",
      stage === "not-sure" ? "Procedural stage requires confirmation." : "",
    ]),
    ruleReferences: [],
  };
}

/**
 * Session 48. The prompt now asks for documented / partially-documented /
 * not-documented / conflicting-information / not-applicable, which describe
 * what the user SUPPLIED rather than whether a legal element is made out.
 *
 * The old satisfied / partially-satisfied / missing / contradicted values
 * are still accepted and mapped, deliberately. The model is not
 * deterministic and will sometimes reach for the old vocabulary, and a
 * saved case record written before this change carries the old values. A
 * hard rejection would turn either into a defaulted, wrong status; mapping
 * loses nothing and is honest about what the old value meant.
 *
 * Unrecognised input defaults to "partially-documented" rather than
 * "not-documented": the safer error is to say something may have been
 * supplied and let the user correct it, not to tell them their file is
 * empty when the model simply returned an unexpected string.
 */
function normalizeElementStatus(raw: string): ClaimElementStatus {
  switch (raw) {
    case "documented":
    case "partially-documented":
    case "not-documented":
    case "conflicting-information":
    case "not-applicable":
      return raw;
    // Legacy vocabulary, from the model or from a saved record.
    case "satisfied":
      return "documented";
    case "partially-satisfied":
      return "partially-documented";
    case "missing":
      return "not-documented";
    case "contradicted":
      return "conflicting-information";
    default:
      return "partially-documented";
  }
}

/**
 * FIX 1 and FIX 2 (Session 48). Builds both summary strings from structured
 * parts, so neither the model nor this code has a free-text slot where a
 * verdict can go.
 *
 * The measurement that forced this: after 24e47c3 removed the element-status
 * grading, `viability` in structuredCaseSummary went 15 -> 19 across five
 * runs. It concentrated rather than fell, and REQUIRED DEPTH #8/#9 had
 * already quoted the exact failing phrase and said "then STOP". Prohibition
 * was exhausted. What worked for element status was changing what the model
 * is ASKED FOR, and this is the same move applied to the summaries.
 *
 * The model now supplies two arrays -- what is recorded, what is not -- and
 * this function assembles the sentence. It contributes the claim type and
 * stage itself, because it already knows them and they are facts rather than
 * judgments.
 *
 * Both summaries are built from the same parts and differ only in shape:
 * `plain` reads as a sentence, `structured` as labelled lines. That is
 * deliberate -- two independently-written summaries were two independent
 * chances to conclude, which is why intelligenceSummary (fed from
 * plainLanguageSummary) started opening "has a potential case against".
 *
 * Falls back to a fixed, neutral string when the model supplies nothing,
 * rather than to prose.
 */
/**
 * The only part of GptCognitionOutput the composer reads. Narrowed to this so
 * the deterministic self-test can exercise it without constructing a whole
 * cognition object.
 */
export type CaseFileSummaryParts = {
  caseFileRecorded?: string[];
  caseFileNotRecorded?: string[];
};

export function composeCaseFileSummary(
  cognition: CaseFileSummaryParts,
  context: { primaryClaimTypes: string[]; stage: string },
  shape: "plain" | "structured",
): string {
  // The model returns each item as a complete sentence ("A signed agreement
  // dated 3 March exists."). The first version of this composer wrapped those
  // in a sentence frame and produced doubled periods and "It does not yet
  // record No court documents have been filed yet." Items are normalised to
  // bare clauses and joined as a list instead.
  const asItem = (raw: string): string => clean(raw).replace(/\s*\.\s*$/, "");
  const recorded = cleanList(safeArray(cognition.caseFileRecorded).map(asItem));
  const notRecorded = cleanList(safeArray(cognition.caseFileNotRecorded).map(asItem));
  const claimTypes = context.primaryClaimTypes.filter(Boolean);

  if (!recorded.length && !notRecorded.length) {
    return "No case-file details have been recorded yet.";
  }

  if (shape === "structured") {
    const lines: string[] = [];
    if (claimTypes.length) lines.push(`Claim type recorded: ${claimTypes.join(", ")}.`);
    if (context.stage) lines.push(`Stage recorded: ${context.stage}.`);
    lines.push(
      recorded.length
        ? `In the file: ${recorded.join("; ")}.`
        : "Nothing has been recorded in the file yet.",
    );
    lines.push(
      notRecorded.length
        ? `Still to record: ${notRecorded.join("; ")}.`
        : "Nothing is outstanding on the items reviewed.",
    );
    return lines.join(" ");
  }

  const parts: string[] = [];
  if (claimTypes.length) parts.push(`Recorded under ${claimTypes.join(", ")}.`);
  if (recorded.length) parts.push(`In the file: ${recorded.join("; ")}.`);
  // "Still to record:" rather than "It does not yet record ..." — the items
  // are often themselves phrased as absences, and a negative frame around a
  // negative item reads as a double negative.
  if (notRecorded.length) parts.push(`Still to record: ${notRecorded.join("; ")}.`);
  return parts.length ? parts.join(" ") : "No case-file details have been recorded yet.";
}

function buildClaimElements(args: {
  claim: GptCognitionClaim;
  domain: LegalDomain;
  normalizedIntake: NormalizedIntake;
}): ClaimElementAssessment[] {
  const factIds = args.normalizedIntake.events.map((event) => event.id);
  const evidenceIds = args.normalizedIntake.evidence.map((item) => item.id);
  const gptElements = safeArray(args.claim.elements);

  if (gptElements.length > 0) {
    return gptElements.map((element) => {
      const status = clean(element.status);

      return {
        id: createId("claim_element"),
        claimType: args.domain,
        elementKey: clean(element.elementKey) || "element",
        label: clean(element.label) || "Required element",
        status: normalizeElementStatus(status),
        explanation:
          clean(element.explanation) ||
          "This element requires fact and evidence review.",
        supportingFactIds: factIds,
        supportingEvidenceIds: evidenceIds,
        missingFacts: cleanList(element.missingFacts || []),
        risks: cleanList(element.risks || []),
        confidence: asConfidence(args.claim.confidence),
      };
    });
  }

  return [
    {
      id: createId("claim_element"),
      claimType: args.domain,
      elementKey: "core-proof",
      label: "Facts and evidence supporting the legal theory",
      status:
        args.normalizedIntake.rawUserText || args.normalizedIntake.events.length
          ? "partially-documented"
          : "not-documented",
      explanation:
        "The claim needs facts, evidence, procedural fit, remedy fit, and verified-law review before final court use.",
      supportingFactIds: factIds,
      supportingEvidenceIds: evidenceIds,
      missingFacts: [],
      risks: evidenceIds.length ? [] : ["Evidence still needs to be connected."],
      confidence: asConfidence(args.claim.confidence),
    },
  ];
}

function buildClaimClassifications(args: {
  cognition: GptCognitionOutput | null;
  normalizedIntake: NormalizedIntake;
  courtPath: IntelligenceCourtPath;
}): ClaimClassification[] {
  const claims = safeArray(args.cognition?.claimClassifications);

  if (claims.length === 0) {
    return [
      {
        id: createId("claim"),
        claimType: "unknown",
        status: "insufficient-facts",
        score: 20,
        confidence: "low",
        supportingSignals: [],
        weakeningSignals: [],
        rejectedBecause: ["No structured claim classification was returned."],
        requiredElements: buildClaimElements({
          claim: {},
          domain: "unknown",
          normalizedIntake: args.normalizedIntake,
        }),
        burdenOfProof: [],
        remedyFit: buildRemedyFit("unknown", args.courtPath),
        sourceReferences: [],
        explanation:
          "The legal theory is not yet clear enough for reliable claim classification.",
      },
    ];
  }

  return claims.map((claim) => {
    const domain = asDomain(claim.claimType);
    const score = clampScore(claim.score);
    const elements = buildClaimElements({
      claim,
      domain,
      normalizedIntake: args.normalizedIntake,
    });

    return {
      id: createId("claim"),
      claimType: domain,
      status: asClaimStatus(claim.status),
      score,
      confidence: asConfidence(claim.confidence) || confidenceFromScore(score),
      supportingSignals: [],
      weakeningSignals: [],
      rejectedBecause: [],
      requiredElements: elements,
      burdenOfProof: [
        {
          id: createId("burden"),
          claimType: domain,
          issueLabel: `${domain} proof burden`,
          partyWithBurden: "user",
          standard:
            domain === "family-parenting"
              ? "best-interests"
              : "balance-of-probabilities",
          whatMustBeProven: elements.map((item) => item.label),
          currentProofStrength: confidenceFromScore(score),
          missingProof: elements.flatMap((item) => item.missingFacts),
          evidenceIds: args.normalizedIntake.evidence.map((item) => item.id),
          explanation:
            "CourtSimplified must connect facts and evidence to each required issue before generating final litigation materials.",
        },
      ],
      remedyFit: buildRemedyFit(domain, args.courtPath),
      sourceReferences: [],
      explanation:
        clean(claim.explanation) ||
        `The facts may involve ${domain.replace(/-/g, " ")}.`,
    };
  });
}

function buildMissingInformation(
  cognition: GptCognitionOutput | null,
): MissingInformationFinding[] {
  return safeArray(cognition?.missingInformation).map((item) => ({
    id: createId("missing"),
    severity: asSeverity(item.severity),
    field: clean(item.field) || "unknown",
    question: clean(item.question) || "What information is missing?",
    reason:
      clean(item.reason) ||
      "This information is needed for legal analysis or workflow readiness.",
    requiredFor:
      item.requiredFor === "procedure" ||
      item.requiredFor === "evidence" ||
      item.requiredFor === "forms" ||
      item.requiredFor === "export"
        ? item.requiredFor
        : asDomain(item.requiredFor),
  }));
}

function buildEvidenceIssueLinks(args: {
  cognition: GptCognitionOutput | null;
  normalizedIntake: NormalizedIntake;
}): EvidenceIssueLink[] {
  const evidenceIds = args.normalizedIntake.evidence.map((item) => item.id);

  return safeArray(args.cognition?.evidenceIssueLinks).map((item) => ({
    id: createId("evidence_issue"),
    issueLabel: clean(item.issueLabel) || "Evidence issue",
    claimType: asDomain(item.claimType),
    requiredProof:
      clean(item.requiredProof) ||
      "Facts and evidence must be connected to the legal issue.",
    availableEvidenceIds: evidenceIds,
    missingEvidence: cleanList(item.missingEvidence || []),
    admissibilityConcerns: [],
    explanation:
      clean(item.explanation) ||
      "Evidence must be reviewed, organized, and linked to proof points.",
  }));
}

function buildRiskExplanation(rawExplanation: unknown): string {
  const explanation = clean(rawExplanation);
  const fallback = "This risk requires review before relying on final materials.";
  if (!explanation) return fallback;
  const result = validateCaseStrengthLanguage(explanation);
  if (result.valid) return explanation;
  console.error(`[caseStrengthLanguageValidator] rejected litigationRisk.explanation (matched term "${result.matchedTerm}"): ${explanation}`);
  return fallback;
}

function buildRisks(cognition: GptCognitionOutput | null): LitigationRisk[] {
  return safeArray(cognition?.litigationRisks).map((risk) => ({
    id: createId("risk"),
    severity: asSeverity(risk.severity),
    title: clean(risk.title) || "Litigation risk",
    explanation: buildRiskExplanation(risk.explanation),
    claimType: risk.claimType ? asDomain(risk.claimType) : undefined,
    source:
      risk.source === "facts" ||
      risk.source === "evidence" ||
      risk.source === "procedure" ||
      risk.source === "law" ||
      risk.source === "forms" ||
      risk.source === "strategy" ||
      risk.source === "limitations" ||
      risk.source === "remedy-fit"
        ? risk.source
        : "strategy",
    suggestedFix:
      clean(risk.suggestedFix) ||
      "Review and strengthen the facts, evidence, procedure, or remedy before final use.",
  }));
}


function buildForms(args: {
  cognition: GptCognitionOutput | null;
  courtPath: IntelligenceCourtPath;
  stage: IntelligenceStage;
}): FormRecommendation[] {
  return safeArray(args.cognition?.formRecommendations).map((form) => ({
    id: createId("form"),
    formNumber: clean(form.formNumber) || undefined,
    title: clean(form.title) || "Court form",
    courtPath: asCourtPath(form.courtPath, args.courtPath),
    stage: asStage(form.stage, args.stage),
    reason:
      clean(form.reason) ||
      "This form may be relevant based on the structured case analysis.",
    confidence: asConfidence(form.confidence),
    notRecommendedForms: cleanList(form.notRecommendedForms || []),
    warnings: cleanList(form.warnings || []),
  }));
}

function buildContradictions(args: {
  normalizedIntake: NormalizedIntake;
  proceduralPosture: ProceduralPostureAssessment;
  claimClassifications: ClaimClassification[];
  formRecommendations: FormRecommendation[];
}): ContradictionFinding[] {
  const rawText = normalizeText(args.normalizedIntake.rawUserText);
  const contradictions: ContradictionFinding[] = [];

  const structuredStages = Array.from(
    rawText.matchAll(
      /(?:stage selected|stage status|procedural stage)\s*:\s*(starting-case|responding)\b/gi,
    ),
    (match) => match[1].toLowerCase() as "starting-case" | "responding",
  );
  const hasStructuredStageConflict =
    structuredStages.includes("starting-case") &&
    structuredStages.includes("responding");

  if (hasStructuredStageConflict) {
    contradictions.push({
      id: createId("contradiction"),
      severity: "high",
      title: "Stage conflict: starting and responding signals both appear",
      description:
        "The intake contains signals that the user may be starting a claim and also responding to a claim. The correct stage affects forms, deadlines, and next steps.",
      affectedFields: ["stage", "role", "filedDocuments", "facts"],
      suggestedFix:
        "Clarify whether the user is the plaintiff starting a new claim, the defendant responding to someone else’s claim, or both.",
    });
  }

  if (
    args.proceduralPosture.stage === "responding" &&
    args.formRecommendations.some((form) => form.formNumber === "7A")
  ) {
    contradictions.push({
      id: createId("contradiction"),
      severity: "medium",
      title: "Possible form-stage mismatch",
      description:
        "The user appears to be responding, but a starting-claim form may have been recommended.",
      affectedFields: ["stage", "formRecommendations"],
      suggestedFix:
        "Confirm whether the user is actually starting a separate claim or should be preparing a defence/response workflow.",
    });
  }

  const hasDefamation = args.claimClassifications.some(
    (claim) => claim.claimType === "defamation",
  );

  const hasPropertyDamage = args.claimClassifications.some(
    (claim) => claim.claimType === "property-damage",
  );

  if (
    hasDefamation &&
    hasPropertyDamage &&
    !includesAny(rawText, ["repair", "vehicle", "broken", "physical damage"])
  ) {
    contradictions.push({
      id: createId("contradiction"),
      severity: "medium",
      title: "Possible false-positive property damage classification",
      description:
        "The intake appears focused on reputation or communication harm, but property damage is also present without clear physical-damage facts.",
      affectedFields: ["claimClassifications", "facts", "damages"],
      suggestedFix:
        "Separate reputational damages from actual physical property damage and reject property damage unless repair or physical-loss facts exist.",
    });
  }

  if (
    args.proceduralPosture.courtPath === "small-claims" &&
    args.claimClassifications.some((claim) => claim.claimType === "civil-charter")
  ) {
    contradictions.push({
      id: createId("contradiction"),
      severity: "high",
      title: "Possible court-path mismatch for Charter/public-law issue",
      description:
        "The intake contains Charter or public-law signals but the court path is Small Claims. Complex public-law claims may require a different court path or procedural route.",
      affectedFields: ["courtPath", "claimClassifications", "procedure"],
      suggestedFix:
        "Confirm whether this is truly Small Claims or whether the claim belongs in Superior Court, tribunal, judicial review, or another public-law process.",
    });
  }

  return contradictions;
}

function buildLimitationAssessments(args: {
  normalizedIntake: NormalizedIntake;
  claimClassifications: ClaimClassification[];
  proceduralPosture: ProceduralPostureAssessment;
}): LimitationPeriodAssessment[] {
  const rawText = normalizeText(args.normalizedIntake.rawUserText);

  const limitationSignals = includesAny(rawText, [
    "limitation",
    "deadline",
    "late",
    "years ago",
    "discoverability",
    "ptsd",
    "could not file",
    "delay",
    "out of time",
    "expired",
    "2007",
    "2008",
    "2009",
    "2010",
    "2011",
    "2012",
    "2013",
    "2014",
    "2015",
    "2016",
    "2017",
    "2018",
    "2019",
    "2020",
    "2021",
    "2022",
  ]);

  const oldYearMatch = rawText.match(/\b(19[8-9]\d|20[0-1]\d|2020|2021|2022)\b/);

  const activeClaims =
    args.claimClassifications.length > 0
      ? args.claimClassifications
      : [
          {
            claimType: "unknown" as LegalDomain,
          },
        ];

  if (!limitationSignals && !oldYearMatch) {
    return activeClaims.map((claim) => ({
      id: createId("limitation"),
      claimType: claim.claimType,
      jurisdiction: args.proceduralPosture.province,
      triggeringDateId: args.normalizedIntake.dates[0]?.id,
      possibleDeadline: undefined,
      status: "unknown",
      reasons: ["No clear limitation trigger date or deadline facts were extracted."],
      missingDateQuestions: [
        "When did the event happen?",
        "When did the user first know enough facts to connect the harm to the possible defendant?",
        "Has any deadline, service date, appeal date, or statutory notice date already passed?",
      ],
      sourceReferences: [],
    }));
  }

  return activeClaims.map((claim) => ({
    id: createId("limitation"),
    claimType: claim.claimType,
    jurisdiction: args.proceduralPosture.province,
    triggeringDateId: args.normalizedIntake.dates[0]?.id,
    possibleDeadline: undefined,
    status: oldYearMatch ? "likely-risk" : "possible-risk",
    reasons: cleanList([
      oldYearMatch
        ? `The intake references an older year (${oldYearMatch[0]}), so limitation and discoverability must be assessed before drafting.`
        : "",
      includesAny(rawText, ["ptsd", "trauma", "could not file", "incapacity"])
        ? "The intake references possible trauma, incapacity, or delayed ability to act; this may matter to limitation/discoverability analysis but must be proven."
        : "",
      includesAny(rawText, ["discoverability", "late discovery", "found out later"])
        ? "The intake references discoverability or late discovery."
        : "",
      "CourtSimplified is flagging limitation risk only; verified legal authority and jurisdiction-specific limitation rules must be checked before filing.",
    ]),
    missingDateQuestions: [
      "Exact date of the event or loss.",
      "Date the user first discovered the essential facts.",
      "Date the user discovered the identity/role of each proposed defendant.",
      "Date any medical, trauma, disability, or incapacity barrier began and ended.",
      "Date any notice, complaint, application, or prior proceeding was filed.",
    ],
    sourceReferences: [],
  }));
}

function buildProofDrivenRisks(args: {
  elementProofAnalysis: ElementProofEngineResult;
}): LitigationRisk[] {
  return args.elementProofAnalysis.claimProofMaps.flatMap((proofMap) => {
    const risks: LitigationRisk[] = [];

    const highRiskFindings = proofMap.elementFindings.filter(
      (finding) =>
        finding.burdenRisk === "high" ||
        finding.burdenRisk === "critical" ||
        finding.status === "no-evidence-recorded" ||
        finding.status === "contradicted",
    );

    for (const finding of highRiskFindings) {
      risks.push({
        id: createId("risk"),
        severity: finding.burdenRisk,
        title: `Proof risk: ${finding.elementLabel}`,
        explanation:
          finding.explanation ||
          `The ${proofMap.claimTitle} claim has a proof weakness connected to ${finding.elementLabel}.`,
        claimType: finding.claimType,
        source: "evidence",
        suggestedFix:
          finding.nextAction ||
          "Strengthen the evidence connected to this element before generating final litigation materials.",
      });
    }

    // Was: overallProofStrength is low/very-low. Now a factual trigger --
    // this claim has elements with nothing recorded against them.
    if (proofMap.elementsByRecordStatus.nothingRecorded.length > 0) {
      risks.push({
        id: createId("risk"),
        severity: "high",
        title: `Overall proof weakness: ${proofMap.claimTitle}`,
        explanation:
          proofMap.missingEvidence.length > 0
            ? `This claim has weak overall proof because key evidence remains missing: ${proofMap.missingEvidence.slice(0, 5).join("; ")}.`
            : "This claim has weak overall proof and requires further fact and evidence development.",
        claimType: proofMap.claimType,
        source: "evidence",
        suggestedFix:
          "Build a claim-by-claim proof record before drafting pleadings, affidavits, forms, or court packages.",
      });
    }

    return risks;
  });
}

function buildProofDrivenNextActions(args: {
  elementProofAnalysis: ElementProofEngineResult;
}): string[] {
  return cleanList([
    ...args.elementProofAnalysis.globalNextActions,
    ...args.elementProofAnalysis.globalNothingRecorded.map(
      (item) => `Add proof for: ${item}.`,
    ),
  ]);
}

function buildSupplementalRisks(args: {
  normalizedIntake: NormalizedIntake;
  existingRisks: LitigationRisk[];
  contradictions: ContradictionFinding[];
  limitationAssessments: LimitationPeriodAssessment[];
  elementProofAnalysis: ElementProofEngineResult;
}): LitigationRisk[] {
  const rawText = normalizeText(args.normalizedIntake.rawUserText);
  const risks: LitigationRisk[] = [];

  if (args.contradictions.length > 0) {
    risks.push({
      id: createId("risk"),
      severity: "high",
      title: "Contradictions or stage conflicts require review",
      explanation:
        "The intake contains conflicts that may affect forms, deadlines, legal theory, or procedural posture.",
      source: "facts",
      suggestedFix:
        "Resolve contradictions before generating final pleadings, affidavits, or court forms.",
    });
  }

  if (
    args.limitationAssessments.some(
      (assessment) =>
        assessment.status === "possible-risk" ||
        assessment.status === "likely-risk",
    )
  ) {
    risks.push({
      id: createId("risk"),
      severity: "high",
      title: "Limitation or deadline risk",
      explanation:
        "The intake contains timing facts that may create a limitation, deadline, discoverability, or notice issue.",
      source: "limitations",
      suggestedFix:
        "Build a date-by-date limitation chronology and verify the applicable limitation rules before drafting or filing.",
    });
  }

  if (
    includesAny(rawText, [
      "crown",
      "police",
      "public authority",
      "government",
      "ministry",
      "bail",
    ])
  ) {
    risks.push({
      id: createId("risk"),
      severity: "high",
      title: "Public-authority threshold risk",
      explanation:
        "Claims involving Crown, police, government, or public authorities may require screening for immunity, leave, notice, limitation, jurisdiction, and proper defendant naming.",
      claimType: "civil-institutional-liability",
      source: "procedure",
      suggestedFix:
        "Separate operational conduct from protected discretion and verify whether leave, statutory notice, or a threshold motion is required.",
    });
  }

  if (includesAny(rawText, ["sexual assault", "assault", "criminal act", "offender"])) {
    risks.push({
      id: createId("risk"),
      severity: "high",
      title: "Third-party act causation risk",
      explanation:
        "Where harm was directly caused by another person's wrongful act, causation against a public-authority or institutional defendant must still be established.",
      claimType: "negligence",
      source: "strategy",
      suggestedFix:
        "Build a causation theory showing foreseeability, risk creation or risk increase, material contribution, and why the harm fell within the known risk.",
    });
  }

  return [
    ...args.existingRisks,
    ...risks,
    ...buildProofDrivenRisks({
      elementProofAnalysis: args.elementProofAnalysis,
    }),
  ];
}

function buildSupplementalNextActions(args: {
  existingActions: string[];
  contradictions: ContradictionFinding[];
  limitationAssessments: LimitationPeriodAssessment[];
  normalizedIntake: NormalizedIntake;
  elementProofAnalysis: ElementProofEngineResult;
}): string[] {
  const rawText = normalizeText(args.normalizedIntake.rawUserText);

  return cleanList([
    ...args.existingActions,
    ...buildProofDrivenNextActions({
      elementProofAnalysis: args.elementProofAnalysis,
    }),
    args.contradictions.length > 0
      ? "Resolve intake contradictions before generating final documents."
      : "",
    args.limitationAssessments.some(
      (item) => item.status === "possible-risk" || item.status === "likely-risk",
    )
      ? "Create a limitation/discoverability chronology before filing."
      : "",
    includesAny(rawText, ["crown", "police", "public authority", "government"])
      ? "Screen for public-authority threshold issues, including leave, notice, immunity, defendant naming, and operational-conduct framing."
      : "",
    "Link every major fact to evidence before generating final court materials.",
  ]);
}

function calculateReadiness(intelligence: LegalIntelligenceResult): number {
  let score = 0;

  const proofMaps = intelligence.elementProofAnalysis?.claimProofMaps ?? [];

  if (intelligence.primaryClaimTypes.length > 0) score += 20;
  if (intelligence.normalizedIntake.rawUserText.trim()) score += 10;
  if (intelligence.normalizedIntake.events.length > 0) score += 10;
  if (intelligence.normalizedIntake.evidence.length > 0) score += 15;
  if (intelligence.proceduralPosture.courtPath !== "unknown") score += 10;
  if (intelligence.proceduralPosture.stage !== "not-sure") score += 10;
  if (intelligence.formRecommendations.length > 0) score += 10;
  if (intelligence.missingInformation.length === 0) score += 15;

  if (intelligence.factPatternAnalysis?.findings.length) score += 5;
  if (intelligence.evidenceIntelligenceAnalysis?.findings.length) score += 5;

  if (proofMaps.length > 0) {
    score += 10;
  }

  // Six risk-weighted subtractions were removed here (CLAUDE.md section 3,
  // "readiness scores that weight risk"): litigationRisks * 4, contradictions
  // * 8, possible/likely-risk limitationAssessments * 10, low/very-low
  // overallProofStrength proof maps * 8, evidence gaps * 2, and fact-pattern
  // contradictions * 5. Every one of them graded the user's case and moved a
  // displayed number down for it -- the second half of what d1fa87c started
  // when it removed the judge-concern credit from this score and left the
  // penalties in place.
  //
  // Deleted rather than reweighted: a count of which sections have
  // information recorded needs no risk adjustment, and any non-zero weight
  // would still be the system grading the case. What remains above is purely
  // "does this part of the file have anything in it yet", which the user can
  // verify against their own case.
  return Math.max(0, Math.min(100, score));
}

function buildMasterResultPatch(args: {
  input: CourtSimplifiedBrainInput;
  intelligence: LegalIntelligenceResult;
}): Record<string, unknown> {
  const existing = asObject(args.input.existingMasterResult);
  const existingMasterCaseFile = asObject(existing.masterCaseFile);

  return {
    ...existing,
    courtSimplifiedIntelligence: args.intelligence,
    masterCaseFile: {
      ...existingMasterCaseFile,
      id:
        existingMasterCaseFile.id ||
        args.input.caseId ||
        args.intelligence.normalizedIntake.caseId ||
        createId("case"),
      updatedAt: args.intelligence.updatedAt,
      casePath: args.intelligence.proceduralPosture.courtPath,
      province: args.intelligence.proceduralPosture.province,
      stage: args.intelligence.proceduralPosture.stage,
      summary: args.intelligence.plainLanguageSummary,
      facts: args.intelligence.normalizedIntake.events,
      factPatternAnalysis: args.intelligence.factPatternAnalysis,
      issues: args.intelligence.claimClassifications,
      timeline: args.intelligence.normalizedIntake.dates,
      evidence: args.intelligence.normalizedIntake.evidence,
      evidenceIntelligenceAnalysis: args.intelligence.evidenceIntelligenceAnalysis,
      proofMap: args.intelligence.evidenceIssueLinks,
      elementProofAnalysis: args.intelligence.elementProofAnalysis,
      claimProofMaps: args.intelligence.elementProofAnalysis?.claimProofMaps || [],
      formNeeds: args.intelligence.formRecommendations,
      legalKnowledge: args.intelligence.legalKnowledge,
      risks: args.intelligence.litigationRisks,
      contradictions: args.intelligence.contradictions,
      limitationAssessments: args.intelligence.limitationAssessments,
      proceduralIntelligence: args.intelligence.proceduralPosture,
      strategy: {
        // `strengths` and `weaknesses` stood here and are the reason this pair
        // could not simply be renamed the way the family one was. They were
        // assembled from four grading engines:
        //
        //   strengths  <- claimClassifications[].explanation, strongestPatterns,
        //                 strongestEvidence
        //   weaknesses <- litigationRisks[].explanation, weakestPatterns,
        //                 weakestEvidence, gaps[].explanation
        //
        // Everything but the last is a merit assessment — how strong a pattern
        // is, how strong an item of evidence is, what the risks are. That is
        // what the dashboard was rendering under "Proof Gaps".
        //
        // Only the evidence GAPS survive, into the renamed `proofGaps`: a gap
        // is a statement that something is not recorded, which is a fact about
        // the file. Session 38 emptied the sibling prediction fields for the
        // same reason and left these because they were not named as
        // predictions.
        proofGaps:
          args.intelligence.evidenceIntelligenceAnalysis?.gaps.map(
            (gap) => gap.explanation,
          ) || [],
        suggestedWordingImprovements: args.intelligence.missingInformation.map(
          (item) => item.question,
        ),
        nextStrategicSteps: args.intelligence.nextBestActions,
      },
      readiness: {
        level: args.intelligence.confidence === "high" ? "developing" : "needs-review",
        score: calculateReadiness(args.intelligence),
        reasons: args.intelligence.nextBestActions,
        blockers: args.intelligence.systemWarnings,
      },
      aiMemory: {
        plainLanguageSummary: args.intelligence.plainLanguageSummary,
        structuredSummary: args.intelligence.structuredCaseSummary,
        userGoals: args.intelligence.normalizedIntake.desiredOutcomes.map(
          (outcome) => outcome.description,
        ),
        importantFacts: args.intelligence.normalizedIntake.events.map(
          (event) => event.description,
        ),
        detectedFactPatterns:
          args.intelligence.factPatternAnalysis?.findings.map(
            (finding) => finding.title,
          ) || [],
        evidenceGaps:
          args.intelligence.evidenceIntelligenceAnalysis?.gaps.map(
            (gap) => gap.title,
          ) || [],
        unresolvedQuestions: args.intelligence.missingInformation.map(
          (item) => item.question,
        ),
        elementsWithNothingRecorded:
          args.intelligence.elementProofAnalysis?.globalNothingRecorded || [],
        proofStrengths: [],
        warningsForAi: [
          "Use the unified CourtSimplified brain only.",
          "Do not use old issue buckets as final legal classification.",
          "Do not recommend Defence forms unless the user is responding.",
          "Do not treat defamation as property damage or contract unless facts support it.",
          "Use factPatternAnalysis as litigation fact-pattern intelligence only; do not treat it as verified evidence.",
          "Use evidenceIntelligenceAnalysis as evidence triage only; verify admissibility and authenticity before court use.",
          "Use elementProofAnalysis as proof intelligence only; do not treat it as a separate claim classifier.",
          ...args.intelligence.systemWarnings,
        ],
        lastUpdatedByEngine: "courtSimplifiedBrain",
      },
    },
    updatedAt: args.intelligence.updatedAt,
  };
}

function buildDashboardPatch(
  intelligence: LegalIntelligenceResult,
): Record<string, unknown> {
  return {
    courtPath: intelligence.proceduralPosture.courtPath,
    stage: intelligence.proceduralPosture.stage,
    summary: intelligence.plainLanguageSummary,
    readinessScore: calculateReadiness(intelligence),
    primaryClaimTypes: intelligence.primaryClaimTypes,
    rejectedFalsePositives: intelligence.rejectedFalsePositives.map(
      (claim) => claim.claimType,
    ),
    nextBestActions: intelligence.nextBestActions,
    warnings: intelligence.systemWarnings,
    contradictions: intelligence.contradictions,
    limitationAssessments: intelligence.limitationAssessments,
    factPatternAnalysis: {
      summary: intelligence.factPatternAnalysis?.summary || "",
      findings: intelligence.factPatternAnalysis?.findings || [],
      admissions: intelligence.factPatternAnalysis?.admissions || [],
      contradictions: intelligence.factPatternAnalysis?.contradictions || [],
      credibilityIssues: intelligence.factPatternAnalysis?.credibilityIssues || [],
      nextActions: intelligence.factPatternAnalysis?.nextActions || [],
    },
    evidenceIntelligenceAnalysis: {
      summary: intelligence.evidenceIntelligenceAnalysis?.summary || "",
      findings: intelligence.evidenceIntelligenceAnalysis?.findings || [],
      gaps: intelligence.evidenceIntelligenceAnalysis?.gaps || [],
      contradictions: intelligence.evidenceIntelligenceAnalysis?.contradictions || [],
      strongestEvidence: intelligence.evidenceIntelligenceAnalysis?.strongestEvidence || [],
      weakestEvidence: intelligence.evidenceIntelligenceAnalysis?.weakestEvidence || [],
      recommendedEvidenceCollection:
        intelligence.evidenceIntelligenceAnalysis?.recommendedEvidenceCollection || [],
    },
    proofAnalysis: {
      summary: intelligence.elementProofAnalysis?.summary || "",
      claimProofMaps: intelligence.elementProofAnalysis?.claimProofMaps || [],
      globalNothingRecorded:
        intelligence.elementProofAnalysis?.globalNothingRecorded || [],
      globalNextActions: intelligence.elementProofAnalysis?.globalNextActions || [],
    },
    legalKnowledgeStatus: {
      statutes: intelligence.legalKnowledge.statutes.length,
      proceduralRules: intelligence.legalKnowledge.proceduralRules.length,
      precedents: intelligence.legalKnowledge.precedents.length,
      precedentMatches: intelligence.legalKnowledge.precedentMatches.length,
      sourceWarnings: intelligence.legalKnowledge.sourceWarnings,
    },
  };
}

function chooseRoute(intelligence: LegalIntelligenceResult): string {
  const proofMaps = intelligence.elementProofAnalysis?.claimProofMaps ?? [];

  if (intelligence.contradictions.length > 0) return "/builder";

  if (intelligence.factPatternAnalysis?.contradictions.length) {
    return "/builder";
  }

  if (
    intelligence.limitationAssessments.some(
      (item) => item.status === "possible-risk" || item.status === "likely-risk",
    )
  ) {
    return "/builder";
  }

  if (intelligence.missingInformation.length > 0) return "/builder";

  if (
    intelligence.evidenceIntelligenceAnalysis?.gaps.some(
      (gap) => gap.severity === "high" || gap.severity === "critical",
    )
  ) {
    return "/evidence";
  }

  if (
    proofMaps.some((map) =>
      map.elementFindings.some(
        (finding) =>
          finding.status === "no-evidence-recorded" ||
          finding.status === "contradicted" ||
          finding.burdenRisk === "high" ||
          finding.burdenRisk === "critical",
      ),
    )
  ) {
    return "/evidence";
  }

  // Was: some link is graded "low". Now factual -- some link has evidence
  // recorded as missing.
  if (intelligence.evidenceIssueLinks.some((link) => link.missingEvidence.length > 0)) {
    return "/evidence";
  }

  if (intelligence.formRecommendations.length > 0) return "/forms";

  return "/dashboard";
}

function buildCognitionPrompt(
  input: CourtSimplifiedBrainInput,
  normalizedIntake: NormalizedIntake,
): string {
  return `
You are CourtSimplified's elite structured litigation cognition engine.

Return ONLY valid JSON. Do not use markdown. Do not add commentary outside JSON.

You are not a chatbot and you are not a basic legal intake tool. You are the central reasoning layer for a litigation operating system. Your task is to transform the normalized intake into structured litigation intelligence that downstream engines can use for claim theory, evidence mapping, procedural routing, forms, strategy, dashboard readiness, and document generation.

You must think like a careful legal analyst preparing a matter for lawyer review, not like a generic assistant. Be practical, cautious, adversarial, and procedure-aware.

ABSOLUTE SAFETY AND RELIABILITY RULES:
- Do not invent legal citations, case names, statutes, rule numbers, form numbers, deadlines, limitation periods, or official filing requirements.
- You may identify likely legal/procedural issues, but you must label unverified law/forms/deadlines as needing verification.
- Do not create false certainty. Use missingInformation when facts are incomplete.
- Do not recommend a Defence or Answer unless the user is responding to an existing claim/application.
- Do not treat reputational harm as property damage unless physical property damage facts exist.
- Do not treat emotional distress as medical proof unless medical/treatment evidence is identified.
- Do not treat old events as automatically out of time. Flag limitation/discoverability risk without stating a deadline unless verified.
- Do not frame public-authority liability as disagreement with a judge's decision. Separate operational conduct, process failure, knowledge, causation, protected discretion, immunity, notice, leave, limitation, and collateral-attack risk.
- Do not over-recommend forms. Recommend only workflow-level documents/forms that match courtPath and stage, and add verification warnings.
- Never predict, characterize, or speculate about what a judge thinks or is concerned about, and never draft or predict what an opposing party or the other side will argue. This platform organizes facts and identifies gaps; it does not grade the merits of a case. Phrases like "the judge may be concerned," "the court may question," "the defendant may argue," or "the other side may argue" are never acceptable in any field -- reframe as procedural or evidentiary readiness gaps instead (a missing document, an unconfirmed date, an element without documented proof).
- Never state or imply anything about the claim's overall strength, viability, likely outcome, or chances of success, in intelligenceSummary, structuredCaseSummary, or any other field. Describe what facts and evidence are present or absent; do not grade what that means for the case.

CANONICAL VALUES ONLY:
Allowed courtPath: family, small-claims, civil, tribunal, ltb, immigration, criminal-related, unknown
Allowed stage: starting-case, responding, already-started, conference, motion, trial, enforcement, appeal, urgent, settlement, not-sure
Allowed legal domains: defamation, contract, property-damage, negligence, personal-injury, harassment, employment, debt, consumer, family-parenting, family-support, family-property, family-safety, civil-charter, civil-human-rights, civil-institutional-liability, landlord-tenant, immigration, procedural, unknown
Allowed confidence: very-low, low, medium, high, very-high
Allowed claim status: detected, possible, insufficient-facts, rejected-false-positive, conflicting-signals
Allowed element status: documented, partially-documented, not-documented, conflicting-information, not-applicable
These describe WHAT THE USER HAS SUPPLIED for an element, never whether the element is legally made out. "documented" means the person described or provided something addressing it. It does not mean the element is satisfied, proven, or established -- that is a decision for a court, never for this system, and you must not state or imply it in any field.
Allowed severity: info, low, medium, high, critical
Allowed risk source: facts, evidence, procedure, law, forms, strategy, limitations, remedy-fit

REQUIRED DEPTH:
1. Produce at least one claim classification unless the narrative is truly unusable.
2. Identify which legal theory the facts most directly describe, which other theories the facts could also fit, and which are false positives the facts do not support at all. This is about what the facts describe, not about which theory is strongest -- do not rank theories by how well they would do.
3. Each detected/possible claim must include practical claim elements written in plain language.
4. Every element must state status, explanation, missingFacts, and risks.
5. Build evidenceIssueLinks that explain what proof is needed, not just what evidence exists. Before listing anything in missingEvidence, check the "Evidence described" text in the intake -- if the user already described having that item, a close equivalent, or something that would satisfy the same need, do not list it as missing. missingEvidence is for evidence the user has not indicated having at all, never a request for a more complete, original, or better version of something they already described having.
6. Identify litigation risks the user may not realize: limitation, discoverability, jurisdiction, wrong forum, wrong form, leave/notice, causation, credibility, proportionality, remedy-fit, service, deadline, and stage risks.
7. Give ordered nextBestActions that improve court readiness.
8. Do NOT write a narrative summary. There is no summary field to write. Instead fill caseFileRecorded and caseFileNotRecorded: one short item per entry, each a plain statement of what is or is not in the file. "A signed agreement dated 3 March" is an entry. "A signed agreement, which helps" is not -- drop the second half.
9. Those two arrays are the ONLY place summary content goes, and each entry describes the file, never what the file adds up to. Do not add an entry whose purpose is to tell the reader what any of it means. The person reading decides that; you record what is there and what is not.

COURT PATH REASONING:
Family:
- Focus on best interests, parenting, decision-making, support, disclosure, safety, status quo, child-focused facts, evidence quality, urgency, and conference/motion/trial readiness.
- Flag when the user needs parenting details, schedules, school/medical records, police/CAS/safety records, income disclosure, support calculations, or settlement/conference materials.

Small Claims:
- Focus on claim/defence posture, proof of money loss, contract/payment evidence, defamation publication proof, service, settlement conference, trial readiness, damages proof, and limitation/deadline risks.
- Flag when the matter sounds too complex for Small Claims or may need Superior Court, tribunal, family, or another process.

Civil:
- Focus on cause of action, pleading sufficiency, limitation/discoverability, jurisdiction, remedy, public authority thresholds, motion/leave/strike risk, evidence, causation, damages, and procedural posture.
- Flag when the next step may be pleadings, motion, leave/threshold screening, evidence organization, limitation chronology, or human legal review.

PUBLIC AUTHORITY / CROWN / POLICE / GOVERNMENT / HOSPITAL / INSTITUTIONAL CASES:
If the narrative references Crown, Attorney General, police, government, ministry, hospital, public authority, bail, prosecution, court process, institutional failure, or Charter issues, specifically analyze:
- likely domains: civil-charter, negligence, civil-institutional-liability, civil-human-rights, procedural, or unknown
- whether the theory targets operational conduct/process failure rather than protected judicial/prosecutorial/core-policy discretion
- whether leave, notice, limitation, immunity, statutory authority, collateral attack, jurisdiction, or strike-motion risk may arise
- causation: what conduct allegedly increased risk or caused harm, and what proof is missing
- foreseeability/knowledge: what records, warnings, prior events, or communications must be proven
- defendant separation: what each actor did or failed to do
- remedy fit: damages, declaration, injunction, or other relief must be verified
- records needed: transcripts, orders, recognizances, disclosure, medical/clinical records, police records, correspondence, timelines

DEFAMATION / REPUTATION CASES:
Analyze exact words, publication, identification, recipients, falsity/truth risk, opinion/fair comment risk, privilege risk, damages, screenshots/full context, timing, and whether the same facts actually belong to harassment, family, employment, or small claims.

CONTRACT / DEBT / CONSUMER CASES:
Analyze agreement, parties, terms, breach, performance, payment, damages, invoices, receipts, communications, mitigation, limitation, and whether evidence proves the amount claimed.

NEGLIGENCE / PERSONAL INJURY / INSTITUTIONAL HARM:
Analyze duty/proximity, standard of care, breach, causation, foreseeability, damages, third-party act causation, intervening acts, records, expert/medical proof, and limitation/discoverability.

OUTPUT QUALITY REQUIREMENTS:
- Use concrete, case-specific language based on the normalized intake.
- Do not simply repeat the user's story.
- Use plain language that can be shown to a self-represented user, but make the reasoning lawyer-grade.
- Every array should be populated when reasonably possible.
- If information is missing, say what is missing and why it matters.
- Keep formRecommendations practical and cautious. If unsure, recommend a workflow package title instead of a specific form number.
- Always include systemWarnings about verifying legal authorities before filing.

Return JSON with this exact shape and no extra keys:
{
  "courtPath": "civil",
  "province": "Ontario",
  "stage": "starting-case",
  "confidence": "medium",
  "primaryClaimTypes": ["civil-institutional-liability"],
  "rejectedFalsePositives": [
    {
      "claimType": "property-damage",
      "status": "rejected-false-positive",
      "score": 5,
      "confidence": "high",
      "explanation": "Reject only if the facts do not describe physical property damage.",
      "elements": []
    }
  ],
  "claimClassifications": [
    {
      "claimType": "civil-institutional-liability",
      "status": "possible",
      "score": 70,
      "confidence": "medium",
      "explanation": "Explain in plain terms what this legal theory involves and which of the facts described relate to it.",
      "elements": [
        {
          "elementKey": "actionable-conduct",
          "label": "Actionable conduct or legal wrong",
          "status": "partially-documented",
          "explanation": "State which of the facts the person described relate to this element, and which are not in the file.",
          "missingFacts": ["Identify exactly what each actor did or failed to do."],
          "risks": ["No documented proof yet connects this conduct to the alleged wrong."]
        },
        {
          "elementKey": "causation",
          "label": "Causal connection between conduct and harm",
          "status": "missing",
          "explanation": "Explain what causal proof is currently missing.",
          "missingFacts": ["Identify how the conduct caused or materially contributed to the harm."],
          "risks": ["No documented proof yet connects the conduct to the harm claimed."]
        }
      ]
    }
  ],
  "missingInformation": [
    {
      "field": "limitation chronology",
      "question": "What are the exact dates of the event, discovery, records obtained, service, filing, and any court deadlines?",
      "reason": "Needed to assess limitation, discoverability, procedure, and next steps.",
      "requiredFor": "procedure",
      "severity": "high"
    }
  ],
  "evidenceIssueLinks": [
    {
      "issueLabel": "Causation",
      "claimType": "civil-institutional-liability",
      "requiredProof": "Evidence connecting the alleged conduct or process failure to the harm or increased risk.",
      "missingEvidence": ["Chronology", "records showing knowledge", "records showing conduct", "harm evidence"],
      "explanation": "State what proof for this issue is in the file, and what is not. Do not characterize how good it is."
    }
  ],
  "litigationRisks": [
    {
      "title": "Public-authority threshold risk",
      "explanation": "Explain the risk clearly and specifically.",
      "severity": "high",
      "source": "procedure",
      "claimType": "civil-institutional-liability",
      "suggestedFix": "Explain what the user should gather or clarify."
    }
  ],
  "formRecommendations": [
    {
      "formNumber": "",
      "title": "Procedural / threshold screening package",
      "courtPath": "civil",
      "stage": "motion",
      "reason": "May be needed depending on verified procedure, forum, and claim type.",
      "confidence": "medium",
      "notRecommendedForms": [],
      "warnings": ["Verify official forms, rules, deadlines, and procedural requirements before filing."]
    }
  ],
  "caseFileRecorded": ["Each thing the person has described or provided, stated as a fact about the file. No commentary."],
  "caseFileNotRecorded": ["Each thing that has nothing recorded against it yet, stated as a plain absence. No commentary."],
  "nextBestActions": ["First action", "Second action", "Third action"],
  "systemWarnings": ["Verify legal authorities, forms, deadlines, and filing requirements before relying on this output."]
}

USER PROVIDED PATH: ${input.courtPath || "unknown"}
USER PROVIDED PROVINCE: ${input.province || "Ontario"}
USER PROVIDED STAGE: ${input.stage || "not-sure"}

NORMALIZED INTAKE:
${JSON.stringify(normalizedIntake, null, 2)}
`;
}

async function runStructuredGptCognition(
  input: CourtSimplifiedBrainInput,
  normalizedIntake: NormalizedIntake,
): Promise<GptCognitionOutput | null> {
  if (input.allowExternalCognition === false) return null;
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const { createOpenAIClient } = await import("../openaiClient");

    const client = createOpenAIClient();

    const response = await client.chat.completions.create({
      model: process.env.COURTSIMPLIFIED_REASONING_MODEL || "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are CourtSimplified's structured litigation cognition engine. Return only valid JSON matching the requested schema. Analyze deeply but do not invent legal authorities.",
        },
        {
          role: "user",
          content: buildCognitionPrompt(input, normalizedIntake),
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    return sanitizeCognitionOutput(JSON.parse(content) as GptCognitionOutput);
  } catch (error) {
    console.error("CourtSimplified GPT cognition failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return null;
  }
}

function buildFallbackCognition(normalizedIntake: NormalizedIntake): GptCognitionOutput {
  const domains = normalizedIntake.systemDetectedClaimTypes || ["unknown"];
  const firstDomain = domains[0] || "unknown";

  return {
    courtPath: normalizedIntake.courtPath,
    province: normalizedIntake.province || "Ontario",
    stage: normalizedIntake.stage || "not-sure",
    confidence: "low",
    primaryClaimTypes: domains,
    claimClassifications: [
      {
        claimType: firstDomain,
        status: firstDomain === "unknown" ? "insufficient-facts" : "possible",
        score: firstDomain === "unknown" ? 25 : 45,
        confidence: "low",
        explanation:
          "Detailed legal analysis is not available right now, so this classification is based on the intake information alone and needs review.",
        elements: [
          {
            elementKey: "fallback-proof-map",
            label: "Preliminary proof map",
            status: normalizedIntake.evidence.length > 0 ? "partially-documented" : "not-documented",
            explanation:
              "This preliminary review can organize the case but cannot confirm each legal element.",
            missingFacts: [
              "Exact legal theory",
              "Chronology",
              "Evidence for each major allegation",
              "Requested remedy",
              "Procedural posture",
            ],
            risks: ["This preliminary review is not ready to rely on in court."],
          },
        ],
      },
    ],
    missingInformation: [
      {
        field: "evidence-map",
        question: "What evidence proves each major fact?",
        reason:
          "Detailed analysis has not run, so proof cannot be fully mapped from the intake alone.",
        requiredFor: "evidence",
        severity: "medium",
      },
    ],
    evidenceIssueLinks: normalizedIntake.evidence.map((item) => ({
      issueLabel: item.title,
      claimType: firstDomain,
      requiredProof: "Connect this evidence to a fact, legal issue, date, and remedy.",
      missingEvidence: item.gaps,
      explanation:
        "Preliminary evidence mapping based on the information entered.",
    })),
    litigationRisks: [
      {
        title: "Detailed analysis not available",
        explanation:
          "Detailed analysis did not run, so these results should be treated as a saved intake and preliminary review only.",
        severity: "medium",
        source: "strategy",
        suggestedFix:
          "Continue organizing the case, and confirm these results once detailed review is available.",
      },
      {
        title: "Legal theory requires review",
        explanation:
          "This classification is based on the intake information alone, not a full legal analysis.",
        severity: "medium",
        source: "law",
        claimType: firstDomain,
        suggestedFix:
          "Verify the legal theory against the evidence and the procedural rules before filing.",
      },
    ],
    formRecommendations: [],
    plainLanguageSummary:
      "Your intake has been saved and given a preliminary review. Detailed analysis is not available right now, so these results need confirmation.",
    structuredCaseSummary: `Preliminary review based on the saved intake. Issue signals: ${domains.join(", ")}.`,
    nextBestActions: [
      "Build a timeline.",
      "Link each major fact to evidence.",
      "Identify missing proof and deadlines.",
      "Confirm procedure and forum before generating final documents.",
    ],
    systemWarnings: [
      "Detailed analysis is not available right now, so these results are preliminary and need review.",
    ],
  };
}

/**
 * Reads ONLY the labelled claim-amount field out of rawUserText.
 *
 * Small Claims (smallClaimsIntelligenceEngine) and Civil
 * (civilIntakeCanonicalAdapter) both write "Amount claimed or disputed: <value>"
 * into the narrative, so the figure arrives already identified as a claim
 * amount. Family collects no claim-amount field at all, so its narrative is
 * deliberately not scanned: a matrimonial home value, an income figure or a
 * support number would otherwise be read as a claim and tell a Family user
 * their case belongs in Superior Court.
 *
 * Returns the amount only when it exceeds the Small Claims limit.
 */
/**
 * Legal domains that belong to the Family court path.
 */
const FAMILY_LEGAL_DOMAINS: ReadonlySet<LegalDomain> = new Set<LegalDomain>([
  "family-parenting",
  "family-support",
  "family-property",
  "family-safety",
]);

/**
 * Legal domains that belong to Small Claims or Civil. "landlord-tenant",
 * "immigration", "procedural" and "unknown" are deliberately in neither set:
 * they belong to another forum or are non-substantive, and treating them as a
 * conflicting claim would fire this warning on ordinary Family intakes.
 */
const NON_FAMILY_CLAIM_DOMAINS: ReadonlySet<LegalDomain> = new Set<LegalDomain>([
  "defamation",
  "contract",
  "property-damage",
  "negligence",
  "personal-injury",
  "harassment",
  "employment",
  "debt",
  "consumer",
  "civil-charter",
  "civil-human-rights",
  "civil-institutional-liability",
]);

const DOMAIN_LABELS: Partial<Record<LegalDomain, string>> = {
  "family-parenting": "parenting or custody",
  "family-support": "support",
  "family-property": "family property",
  "family-safety": "family safety",
  defamation: "defamation",
  contract: "contract",
  "property-damage": "property damage",
  negligence: "negligence",
  "personal-injury": "personal injury",
  harassment: "harassment",
  employment: "employment",
  debt: "debt",
  consumer: "consumer",
  "civil-charter": "Charter",
  "civil-human-rights": "human rights",
  "civil-institutional-liability": "institutional liability",
};

function domainLabels(domains: LegalDomain[]): string {
  return domains.map((domain) => DOMAIN_LABELS[domain] || String(domain)).join(", ");
}

/**
 * Cross-court-area conflict detection for the builder analyze routes.
 *
 * conversationIntelligenceEngine has had this for the AI Case Partner path,
 * where it resolves a conflict by reporting courtArea "mixed". None of the
 * Family, Civil or Small Claims routes ever had an equivalent, so a story whose
 * relief spans two court paths was silently accepted into whichever path the
 * user clicked.
 *
 * This reports rather than reroutes. courtPath is structural on these routes —
 * it selects the engine, the form registry and the workflow, and both result
 * types declare it as a literal — so the declared path still decides, and the
 * conflict is surfaced for the user to act on.
 */
function detectCrossCourtAreaConflict(
  primaryClaimTypes: LegalDomain[],
): { familyDomains: LegalDomain[]; otherDomains: LegalDomain[] } | null {
  const familyDomains = primaryClaimTypes.filter((domain) =>
    FAMILY_LEGAL_DOMAINS.has(domain),
  );
  const otherDomains = primaryClaimTypes.filter((domain) =>
    NON_FAMILY_CLAIM_DOMAINS.has(domain),
  );

  if (familyDomains.length === 0 || otherDomains.length === 0) return null;

  return { familyDomains, otherDomains };
}

function detectOverLimitClaimAmount(rawUserText: string): number | null {
  const label = "amount claimed or disputed:";

  const line = String(rawUserText || "")
    .split(/\r?\n/)
    .find((entry) => entry.toLowerCase().includes(label));

  if (!line) return null;

  const value = line.slice(line.toLowerCase().indexOf(label) + label.length);
  const amounts = extractDollarAmounts(value);

  if (amounts.length === 0) return null;

  const highest = Math.max(...amounts);

  return highest > ONTARIO_SMALL_CLAIMS_LIMIT ? highest : null;
}

/**
 * True when the intake's desired outcomes include an injunction -- an order
 * requiring someone to do, or stop doing, something.
 *
 * Reuses the shared injunction-outcome detection already computed by
 * normalizeIntake() (extractDesiredOutcomes in intakeNormalizationEngine.ts,
 * triggered by "injunction", "restraining", "stop them", "court order")
 * instead of re-deriving it from raw text a second time. That detection is
 * shared across all three court paths; civilWorkflowEngine.ts has its own,
 * separate injunction-remedy detection, but it runs only on the Civil path's
 * specialized engine and never reaches this shared brain, so it is not what
 * this reuses.
 */
function seeksInjunctiveRelief(desiredOutcomes: DesiredOutcome[]): boolean {
  return desiredOutcomes.some((outcome) => outcome.type === "injunction");
}

export async function runCourtSimplifiedBrain(
  input: CourtSimplifiedBrainInput,
): Promise<CourtSimplifiedBrainOutput> {
  const overLimitClaimAmount = detectOverLimitClaimAmount(input.rawUserText);

  const normalizedIntake = await normalizeIntake(input);

  const factPatternAnalysis = buildFactPatternAnalysis(normalizedIntake);

  const evidenceIntelligenceAnalysis = buildEvidenceIntelligenceAnalysis({
    intake: normalizedIntake,
    factPatternAnalysis,
  });

  const structuredCognition = await runStructuredGptCognition(
    input,
    normalizedIntake,
  );
  const gptCognition = structuredCognition || buildFallbackCognition(normalizedIntake);
  const cognitionMode: "structured" | "fallback" = structuredCognition
    ? "structured"
    : "fallback";

  const proceduralPosture = buildProceduralPosture({
    cognition: gptCognition,
    normalizedIntake,
  });

  const courtPath = proceduralPosture.courtPath;
  const stage = proceduralPosture.stage;

  const claimClassifications = buildClaimClassifications({
    cognition: gptCognition,
    normalizedIntake,
    courtPath,
  });

  const elementProofAnalysis = buildElementProofAnalysis({
    intake: normalizedIntake,
    classifications: claimClassifications,
  });

  const primaryClaimTypes = cleanList([
    ...safeArray(gptCognition.primaryClaimTypes).map(asDomain),
    ...claimClassifications
      .filter((claim) => claim.status === "detected" || claim.status === "possible")
      .map((claim) => claim.claimType),
  ]).map(asDomain);

  const missingInformation = buildMissingInformation(gptCognition);

  const evidenceIssueLinks = buildEvidenceIssueLinks({
    cognition: gptCognition,
    normalizedIntake,
  });

  const baseLitigationRisks = buildRisks(gptCognition);

  const formRecommendations = buildForms({
    cognition: gptCognition,
    courtPath,
    stage,
  });

  const contradictions = buildContradictions({
    normalizedIntake,
    proceduralPosture,
    claimClassifications,
    formRecommendations,
  });

  const limitationAssessments = buildLimitationAssessments({
    normalizedIntake,
    claimClassifications,
    proceduralPosture,
  });

  const litigationRisks = buildSupplementalRisks({
    normalizedIntake,
    existingRisks: baseLitigationRisks,
    contradictions,
    limitationAssessments,
    elementProofAnalysis,
  });

  const legalKnowledge = buildLegalKnowledge({
    courtPath,
    province: proceduralPosture.province,
    stage,
    primaryClaimTypes,
  });

  const nextBestActions = buildSupplementalNextActions({
    existingActions: cleanList([
      ...(gptCognition.nextBestActions || []),
      ...factPatternAnalysis.nextActions,
      ...evidenceIntelligenceAnalysis.recommendedEvidenceCollection,
    ]),
    contradictions,
    limitationAssessments,
    normalizedIntake,
    elementProofAnalysis,
  });

  const timestamp = nowIso();

  const crossCourtAreaConflict = detectCrossCourtAreaConflict(primaryClaimTypes);

  // Distinct from overLimitClaimAmount: that check catches a claim too large in
  // dollar terms for Small Claims. This one catches a remedy Small Claims
  // cannot grant at all, regardless of dollar amount -- the neighbor-dispute
  // case that motivated it sought removal of an encroaching structure and tree
  // roots, with damages of only a few thousand dollars, so the amount check
  // alone would stay silent while the user filed in the wrong court.
  const seeksInjunction = seeksInjunctiveRelief(normalizedIntake.desiredOutcomes);
  const injunctionInSmallClaims = seeksInjunction && courtPath === "small-claims";
  const injunctionInCivil = seeksInjunction && courtPath === "civil";

  const intelligence: LegalIntelligenceResult = {
    id: createId("intelligence"),
    version: "2.0.0",
    createdAt: timestamp,
    updatedAt: timestamp,

    normalizedIntake: {
      ...normalizedIntake,
      courtPath,
      province: proceduralPosture.province,
      stage,
      systemDetectedClaimTypes: primaryClaimTypes,
    },

    claimClassifications,
    primaryClaimTypes,

    rejectedFalsePositives: buildClaimClassifications({
      cognition: {
        ...gptCognition,
        claimClassifications: safeArray(gptCognition.rejectedFalsePositives),
      },
      normalizedIntake,
      courtPath,
    }).filter((claim) => claim.status === "rejected-false-positive"),

    proceduralPosture,
    evidenceIssueLinks,
    contradictions,
    missingInformation,
    limitationAssessments,
    remedyFitAssessments: claimClassifications.flatMap((claim) => claim.remedyFit),
    litigationRisks,
    formRecommendations,
    legalKnowledge,
    factPatternAnalysis,
    evidenceIntelligenceAnalysis,
    elementProofAnalysis,

    // Session 48 — FIX 1 and FIX 2. Both summaries are now COMPOSED from
    // structured parts rather than written by the model as free text.
    //
    // Why, and why the previous approach was exhausted: REQUIRED DEPTH
    // #8/#9 quoted the exact failing phrase and said "then STOP", and
    // viability in structuredCaseSummary went 15 -> 19. It concentrated
    // rather than fell. What DID work for the element status was changing
    // what the model is ASKED for, not what it is forbidden to write.
    //
    // A free-text summary field is an invitation to conclude: the slot
    // exists, so something fills it. These are built by composeCaseFileSummary()
    // from arrays the model fills with recorded/not-recorded items, plus the
    // confirmed claim type and derived stage this code already knows. The
    // model supplies the substance; it never gets a sentence to finish.
    //
    // sanitizeSummaryText still runs over the composed output. It should now
    // never fire on these two -- if it does, the composition is leaking and
    // that is worth knowing.
    plainLanguageSummary: sanitizeSummaryText(
      composeCaseFileSummary(gptCognition, { primaryClaimTypes, stage }, "plain"),
      "plainLanguageSummary",
    ),

    structuredCaseSummary: sanitizeSummaryText(
      composeCaseFileSummary(gptCognition, { primaryClaimTypes, stage }, "structured"),
      "structuredCaseSummary",
    ),

    nextBestActions: sanitizeTextArray(nextBestActions, "nextBestActions"),

    systemWarnings: sanitizeTextArray(cleanList([
      ...safeArray(gptCognition.systemWarnings),
      ...proceduralPosture.warnings,
      ...contradictions.map((item) => item.title),
      ...factPatternAnalysis.contradictions.map(
        (item: BrainFactPatternFinding) =>
          `Fact pattern contradiction requires review: ${item.title}.`,
      ),
      ...evidenceIntelligenceAnalysis.contradictions.map(
        (item) => `Evidence contradiction or context issue requires review: ${item.title}.`,
      ),
      ...evidenceIntelligenceAnalysis.gaps.map(
        (gap) => `Evidence gap requires review: ${gap.title}.`,
      ),
      ...limitationAssessments
        .filter((item) => item.status === "possible-risk" || item.status === "likely-risk")
        .map(() => "Limitation or deadline risk requires review."),
      ...elementProofAnalysis.globalNothingRecorded.map(
        (item) => `No documented proof yet: ${item}.`,
      ),
      ...legalKnowledge.sourceWarnings,
      ...(overLimitClaimAmount !== null
        ? [
            `Claim amount $${overLimitClaimAmount.toLocaleString()} exceeds the Ontario Small Claims Court limit of $${ONTARIO_SMALL_CLAIMS_LIMIT.toLocaleString()}; Small Claims Court may not have jurisdiction and the Superior Court of Justice should be considered.`,
          ]
        : []),
      ...(crossCourtAreaConflict
        ? [
            `Detected issues span more than one court path: family (${domainLabels(crossCourtAreaConflict.familyDomains)}) and non-family (${domainLabels(crossCourtAreaConflict.otherDomains)}). Confirm whether this case belongs in the selected court path, or whether separate matters need to be started in different courts.`,
          ]
        : []),
      ...(injunctionInSmallClaims
        ? [
            "This case asks the court to order someone to do something or stop doing something (an injunction). Small Claims Court generally cannot grant injunctions, regardless of the dollar amount involved; the Superior Court of Justice should be considered.",
          ]
        : []),
      ...(injunctionInCivil
        ? [
            "This case asks for an injunction (an order requiring someone to do something or stop doing something). That kind of order is generally available in Superior Court but not in Small Claims Court.",
          ]
        : []),
    ]), "systemWarnings"),

    cognitionMode,
    confidence: asConfidence(gptCognition.confidence),
  };

  const masterResultPatch = buildMasterResultPatch({
    input,
    intelligence,
  });

  const dashboardPatch = buildDashboardPatch(intelligence);
  const recommendedNextRoute = chooseRoute(intelligence);

  const migration = buildBrainMigrationLayer({
    input,
    intelligence,
    existingMasterResultPatch: masterResultPatch,
    existingDashboardPatch: dashboardPatch,
    existingRecommendedNextRoute: recommendedNextRoute,
  });

  return {
    intelligence,
    masterResultPatch: migration.masterResultPatch,
    dashboardPatch: migration.dashboardPatch,
    recommendedNextRoute:
      migration.recommendedNextRoute || recommendedNextRoute,
  };
}
