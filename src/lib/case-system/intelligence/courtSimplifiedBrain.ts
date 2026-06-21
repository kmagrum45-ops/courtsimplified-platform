import {
  ClaimClassification,
  ClaimElementAssessment,
  ClaimClassificationStatus,
  ContradictionFinding,
  CourtSimplifiedBrainInput,
  CourtSimplifiedBrainOutput,
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
  OpposingArgument,
  JudgeConcern,
  ProceduralPostureAssessment,
  RemedyFitAssessment,
  RemedyType,
} from "./intelligenceTypes";

import { normalizeIntake } from "./intakeNormalizationEngine";
import { buildElementProofAnalysis } from "./elementProofEngine";
import { buildBrainMigrationLayer } from "../orchestration/brainMigrationLayer";

import {
  buildKnowledgeRetrievalContext,
  retrieveKnowledgeObjects,
} from "../knowledge/knowledgeRetrievalEngine";

import { getDoctrineSeedLibrary } from "../knowledge/doctrineSeedLibrary";

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
    strength?: string;
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
  opposingArguments?: {
    claimType?: string;
    argument?: string;
    whyItMatters?: string;
    responseStrategy?: string;
    evidenceNeeded?: string[];
  }[];
  judgeConcerns?: {
    claimType?: string;
    concern?: string;
    whyJudgeMayCare?: string;
    howToAddress?: string;
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

function buildLegalKnowledge(args: {
  courtPath: IntelligenceCourtPath;
  province: IntelligenceProvince;
  stage: IntelligenceStage;
  primaryClaimTypes: LegalDomain[];
}): LegalKnowledgePacket {
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

  const retrievedObjectWarnings = retrieval.objects.map((object) => {
    return `${object.title}: ${object.plainLanguageExplanation}`;
  });

  const blockedWarnings = retrieval.blockedObjects.map((blocked) => {
    return `Knowledge object blocked: ${blocked.objectId} — ${blocked.reason}`;
  });

  return {
    statutes: [],
    proceduralRules: [],
    precedents: [],
    precedentMatches: [],
    sourceWarnings: cleanList([
      "Verified legal authority layer is connected in safe-guidance mode, but verified statutes, rules, deadlines, official forms, and precedents are not yet populated.",
      "Retrieved knowledge objects are operational guidance only unless separately verified.",
      "Do not cite operational guidance as law.",
      "Do not cite cases, statutes, court rules, deadlines, or official form requirements until verified against official sources.",
      ...retrieval.warnings,
      ...retrievedObjectWarnings,
      ...blockedWarnings,
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

  const stage = asStage(
    args.cognition?.stage,
    args.normalizedIntake.stage,
  );

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
    nextProceduralQuestions: cleanList([
      "Has anything already been filed?",
      "Has anything already been served?",
      "Are there court dates, limitation dates, or urgent deadlines?",
      includesAny(rawText, ["crown", "police", "government", "public authority"])
        ? "Does this claim require leave, notice, or a public-authority screening step?"
        : "",
    ]),
    warnings: cleanList([
      courtPath === "unknown" ? "Court path requires confirmation." : "",
      stage === "not-sure" ? "Procedural stage requires confirmation." : "",
    ]),
    ruleReferences: [],
  };
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
        status:
          status === "satisfied" ||
          status === "partially-satisfied" ||
          status === "missing" ||
          status === "contradicted" ||
          status === "not-applicable"
            ? status
            : "partially-satisfied",
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
          ? "partially-satisfied"
          : "missing",
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
    strength: asConfidence(item.strength),
    explanation:
      clean(item.explanation) ||
      "Evidence must be reviewed, organized, and linked to proof points.",
  }));
}

function buildRisks(cognition: GptCognitionOutput | null): LitigationRisk[] {
  return safeArray(cognition?.litigationRisks).map((risk) => ({
    id: createId("risk"),
    severity: asSeverity(risk.severity),
    title: clean(risk.title) || "Litigation risk",
    explanation:
      clean(risk.explanation) ||
      "This risk requires review before relying on final materials.",
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

function buildOpposingArguments(cognition: GptCognitionOutput | null): OpposingArgument[] {
  return safeArray(cognition?.opposingArguments).map((item) => ({
    id: createId("opposing"),
    claimType: item.claimType ? asDomain(item.claimType) : undefined,
    argument: clean(item.argument) || "The other side may dispute the facts or legal basis.",
    whyItMatters:
      clean(item.whyItMatters) ||
      "The user should anticipate this before preparing final materials.",
    responseStrategy:
      clean(item.responseStrategy) ||
      "Connect facts, evidence, dates, and proof to the legal issue.",
    evidenceNeeded: cleanList(item.evidenceNeeded || []),
  }));
}

function buildJudgeConcerns(cognition: GptCognitionOutput | null): JudgeConcern[] {
  return safeArray(cognition?.judgeConcerns).map((item) => ({
    id: createId("judge"),
    claimType: item.claimType ? asDomain(item.claimType) : undefined,
    concern:
      clean(item.concern) ||
      "The court may need clearer facts, evidence, or procedural context.",
    whyJudgeMayCare:
      clean(item.whyJudgeMayCare) ||
      "Courts need clear, relevant, admissible, and procedurally proper material.",
    howToAddress:
      clean(item.howToAddress) ||
      "Organize the facts, evidence, dates, and requested remedy clearly.",
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

  const userSeemsResponding = includesAny(rawText, [
    "served with a claim",
    "i was served",
    "defendant",
    "defence",
    "defense",
    "responding",
  ]);

  const userSeemsStarting = includesAny(rawText, [
    "i want to sue",
    "start a claim",
    "file a claim",
    "plaintiff",
    "claimant",
  ]);

  if (userSeemsResponding && userSeemsStarting) {
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
        finding.status === "missing-proof" ||
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

    if (
      proofMap.overallProofStrength === "very-low" ||
      proofMap.overallProofStrength === "low"
    ) {
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

function buildProofDrivenJudgeConcerns(args: {
  elementProofAnalysis: ElementProofEngineResult;
}): JudgeConcern[] {
  return args.elementProofAnalysis.claimProofMaps.flatMap((proofMap) =>
    proofMap.elementFindings
      .filter((finding) => finding.status !== "proven")
      .map((finding) => ({
        id: createId("judge"),
        claimType: finding.claimType,
        concern:
          finding.judgeConcern ||
          `The court may require clearer proof for ${finding.elementLabel}.`,
        whyJudgeMayCare:
          "A judge must be able to see how the facts and evidence satisfy each required element, not just that the user has a story or documents.",
        howToAddress:
          finding.nextAction ||
            "Connect the evidence to this element with dates, witnesses, documents, and a clear explanation.",
      })),
  );
}

function buildProofDrivenOpposingArguments(args: {
  elementProofAnalysis: ElementProofEngineResult;
}): OpposingArgument[] {
  return args.elementProofAnalysis.claimProofMaps.flatMap((proofMap) =>
    proofMap.elementFindings.map((finding) => ({
      id: createId("opposing"),
      claimType: finding.claimType,
           argument:
        finding.opposingArgument ||
        `The other side may argue the user has not proven ${finding.elementLabel}.`,
      whyItMatters:
        "If the opposing side can break one required element, the claim may be narrowed, delayed, settled for less, or dismissed.",
      responseStrategy:
        finding.nextAction ||
        "Strengthen the proof record and connect the evidence directly to the element.",
      evidenceNeeded: finding.missingEvidence,
    })),
  );
}

function buildProofDrivenNextActions(args: {
  elementProofAnalysis: ElementProofEngineResult;
}): string[] {
  return cleanList([
    ...args.elementProofAnalysis.globalNextActions,
    ...args.elementProofAnalysis.globalWeaknesses.map(
      (weakness) => `Address proof weakness: ${weakness}.`,
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
        "Where harm was directly caused by another person’s wrongful act, public-authority or institutional defendants may argue causation is not proven.",
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

function buildSupplementalJudgeConcerns(args: {
  existingJudgeConcerns: JudgeConcern[];
  contradictions: ContradictionFinding[];
  limitationAssessments: LimitationPeriodAssessment[];
  normalizedIntake: NormalizedIntake;
  elementProofAnalysis: ElementProofEngineResult;
}): JudgeConcern[] {
  const rawText = normalizeText(args.normalizedIntake.rawUserText);
  const concerns: JudgeConcern[] = [...args.existingJudgeConcerns];

  if (args.contradictions.length > 0) {
    concerns.push({
      id: createId("judge"),
      concern: "The court may be concerned that the procedural stage or factual theory is unclear.",
      whyJudgeMayCare:
        "Unclear stage or contradictory facts can cause wrong forms, wrong deadlines, or unclear relief.",
      howToAddress:
        "Clarify party role, filed documents, served documents, and the exact order or remedy requested.",
    });
  }

  if (
    args.limitationAssessments.some(
      (item) => item.status === "possible-risk" || item.status === "likely-risk",
    )
  ) {
    concerns.push({
      id: createId("judge"),
      concern: "The court may question whether the claim is out of time.",
      whyJudgeMayCare:
        "Limitation, discoverability, delay, and statutory notice issues can prevent a claim from proceeding.",
      howToAddress:
        "Prepare a limitation chronology and explain discoverability, incapacity, notice, and delay with evidence.",
    });
  }

  if (includesAny(rawText, ["crown", "police", "bail", "public authority"])) {
    concerns.push({
      id: createId("judge"),
      claimType: "civil-institutional-liability",
      concern:
        "The court may ask whether the claim attacks a protected decision rather than operational conduct.",
      whyJudgeMayCare:
        "Public-authority claims can fail if framed as disagreement with judicial or core discretionary decisions.",
      howToAddress:
        "Frame the theory around operational process failures, record use, risk synthesis, communication, and causation rather than hindsight disagreement with the outcome.",
    });
  }

  return [
    ...concerns,
    ...buildProofDrivenJudgeConcerns({
      elementProofAnalysis: args.elementProofAnalysis,
    }),
  ];
}

function buildSupplementalOpposingArguments(args: {
  existingOpposingArguments: OpposingArgument[];
  normalizedIntake: NormalizedIntake;
  elementProofAnalysis: ElementProofEngineResult;
}): OpposingArgument[] {
  const rawText = normalizeText(args.normalizedIntake.rawUserText);
  const argumentsList: OpposingArgument[] = [...args.existingOpposingArguments];

  if (includesAny(rawText, ["crown", "police", "government", "public authority"])) {
    argumentsList.push({
      id: createId("opposing"),
      claimType: "civil-institutional-liability",
      argument:
        "The public authority may argue immunity, protected discretion, no duty, no proximity, wrong defendant, statutory authority, collateral attack, or no available remedy.",
      whyItMatters:
        "These arguments can stop a claim before trial if the pleadings do not clearly target actionable conduct.",
      responseStrategy:
        "Separate each defendant’s role, identify operational conduct, plead causation carefully, and verify any leave or notice requirements.",
      evidenceNeeded: [
        "Relevant records",
        "Decision/process chronology",
        "Notice or leave materials",
        "Documents showing what each public actor knew or did",
      ],
    });
  }

  if (includesAny(rawText, ["defamation", "false statement", "reputation", "posted", "messages"])) {
    argumentsList.push({
      id: createId("opposing"),
      claimType: "defamation",
      argument:
        "The other side may argue truth, opinion, privilege, no publication, no identification, or no compensable harm.",
      whyItMatters:
        "Defamation and reputational claims often turn on exact words, recipient/publication proof, context, and damages.",
      responseStrategy:
        "Preserve screenshots, identify recipients, record dates, keep full conversation context, and organize harm evidence.",
      evidenceNeeded: [
        "Exact words",
        "Publication/recipient proof",
        "Screenshots with dates",
        "Context",
        "Harm evidence",
      ],
    });
  }

  return [
    ...argumentsList,
    ...buildProofDrivenOpposingArguments({
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

  if (proofMaps.length > 0) {
    score += 10;
  }

  score -= intelligence.litigationRisks.length * 4;
  score -= intelligence.contradictions.length * 8;
  score -= intelligence.limitationAssessments.filter(
    (item) => item.status === "possible-risk" || item.status === "likely-risk",
  ).length * 10;

  score -= proofMaps.filter(
    (map) =>
      map.overallProofStrength === "low" ||
      map.overallProofStrength === "very-low",
  ).length * 8;

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
      issues: args.intelligence.claimClassifications,
      timeline: args.intelligence.normalizedIntake.dates,
      evidence: args.intelligence.normalizedIntake.evidence,
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
        strengths: [
          ...args.intelligence.claimClassifications.map((claim) => claim.explanation),
          ...(args.intelligence.elementProofAnalysis?.globalStrengths || []),
        ],
        weaknesses: [
          ...args.intelligence.litigationRisks.map((risk) => risk.explanation),
          ...(args.intelligence.elementProofAnalysis?.globalWeaknesses || []),
        ],
        likelyOtherSideArguments: args.intelligence.opposingArguments.map(
          (item) => item.argument,
        ),
        likelyJudgeConcerns: args.intelligence.judgeConcerns.map(
          (item) => item.concern,
        ),
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
        unresolvedQuestions: args.intelligence.missingInformation.map(
          (item) => item.question,
        ),
        proofWeaknesses: args.intelligence.elementProofAnalysis?.globalWeaknesses || [],
        proofStrengths: args.intelligence.elementProofAnalysis?.globalStrengths || [],
        warningsForAi: [
          "Use the unified CourtSimplified brain only.",
          "Do not use old issue buckets as final legal classification.",
          "Do not recommend Defence forms unless the user is responding.",
          "Do not treat defamation as property damage or contract unless facts support it.",
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
    proofAnalysis: {
      summary: intelligence.elementProofAnalysis?.summary || "",
      claimProofMaps: intelligence.elementProofAnalysis?.claimProofMaps || [],
      globalWeaknesses: intelligence.elementProofAnalysis?.globalWeaknesses || [],
      globalStrengths: intelligence.elementProofAnalysis?.globalStrengths || [],
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

  if (
    intelligence.limitationAssessments.some(
      (item) => item.status === "possible-risk" || item.status === "likely-risk",
    )
  ) {
    return "/builder";
  }

  if (intelligence.missingInformation.length > 0) return "/builder";

  if (
    proofMaps.some((map) =>
      map.elementFindings.some(
        (finding) =>
          finding.status === "missing-proof" ||
          finding.status === "contradicted" ||
          finding.burdenRisk === "high" ||
          finding.burdenRisk === "critical",
      ),
    )
  ) {
    return "/evidence";
  }

  if (intelligence.evidenceIssueLinks.some((link) => link.strength === "low")) {
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

CANONICAL VALUES ONLY:
Allowed courtPath: family, small-claims, civil, tribunal, ltb, immigration, criminal-related, unknown
Allowed stage: starting-case, responding, already-started, conference, motion, trial, enforcement, appeal, urgent, settlement, not-sure
Allowed legal domains: defamation, contract, property-damage, negligence, personal-injury, harassment, employment, debt, consumer, family-parenting, family-support, family-property, family-safety, civil-charter, civil-human-rights, civil-institutional-liability, landlord-tenant, immigration, procedural, unknown
Allowed confidence: very-low, low, medium, high, very-high
Allowed claim status: detected, possible, insufficient-facts, rejected-false-positive, conflicting-signals
Allowed element status: satisfied, partially-satisfied, missing, contradicted, not-applicable
Allowed severity: info, low, medium, high, critical
Allowed risk source: facts, evidence, procedure, law, forms, strategy, limitations, remedy-fit

REQUIRED DEPTH:
1. Produce at least one claim classification unless the narrative is truly unusable.
2. Identify the strongest primary theory, viable alternatives, weak theories, and false positives.
3. Each detected/possible claim must include practical claim elements written in plain language.
4. Every element must state status, explanation, missingFacts, and risks.
5. Build evidenceIssueLinks that explain what proof is needed, not just what evidence exists.
6. Identify litigation risks the user may not realize: limitation, discoverability, jurisdiction, wrong forum, wrong form, leave/notice, causation, credibility, proportionality, remedy-fit, service, deadline, and stage risks.
7. Identify opposingArguments as if you are preparing the other side's strongest response.
8. Identify judgeConcerns as if screening whether the case is clear, admissible, procedurally proper, and legally coherent.
9. Give ordered nextBestActions that improve court readiness.
10. Keep summaries useful: not just repetition of intake. Explain theory, risk, proof gaps, and next step.

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
      "explanation": "Explain the theory in litigation terms and state why it is or is not court-ready.",
      "elements": [
        {
          "elementKey": "actionable-conduct",
          "label": "Actionable conduct or legal wrong",
          "status": "partially-satisfied",
          "explanation": "Explain what facts support or weaken this element.",
          "missingFacts": ["Identify exactly what each actor did or failed to do."],
          "risks": ["The opposing side may argue the conduct is not legally actionable."]
        },
        {
          "elementKey": "causation",
          "label": "Causal connection between conduct and harm",
          "status": "missing",
          "explanation": "Explain what causal proof is currently missing.",
          "missingFacts": ["Identify how the conduct caused or materially contributed to the harm."],
          "risks": ["The opposing side may argue no causation."]
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
      "strength": "low",
      "explanation": "Explain why the current proof is weak, developing, or stronger."
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
  "opposingArguments": [
    {
      "claimType": "civil-institutional-liability",
      "argument": "State the strongest realistic opposing argument.",
      "whyItMatters": "Explain how this could defeat, narrow, or delay the claim.",
      "responseStrategy": "Explain the evidence or pleading response.",
      "evidenceNeeded": ["records", "chronology", "proof of knowledge", "proof of causation"]
    }
  ],
  "judgeConcerns": [
    {
      "claimType": "civil-institutional-liability",
      "concern": "State what a judge may be concerned about.",
      "whyJudgeMayCare": "Explain why this matters to court readiness.",
      "howToAddress": "Explain the fix."
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
  "plainLanguageSummary": "Short meaningful summary, not a repetition.",
  "structuredCaseSummary": "Structured litigation summary covering theory, procedure, risks, proof gaps, and next step.",
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
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const { default: OpenAI } = await import("openai");

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

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

    return JSON.parse(content) as GptCognitionOutput;
  } catch (error) {
    console.error("CourtSimplified GPT cognition failed:", error);
    return null;
  }
}

function buildFallbackCognition(normalizedIntake: NormalizedIntake): GptCognitionOutput {
  const rawText = normalizedIntake.rawUserText;
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
          "Structured GPT cognition was unavailable, so CourtSimplified used deterministic intake signals and marked the legal theory for review.",
        elements: [
          {
            elementKey: "fallback-proof-map",
            label: "Fallback proof map",
            status: normalizedIntake.evidence.length > 0 ? "partially-satisfied" : "missing",
            explanation:
              "Fallback mode can preserve and triage the case but cannot fully analyze legal elements without structured cognition.",
            missingFacts: [
              "Exact legal theory",
              "Chronology",
              "Evidence for each major allegation",
              "Requested remedy",
              "Procedural posture",
            ],
            risks: ["Fallback cognition is not court-ready."],
          },
        ],
      },
    ],
    missingInformation: [
      {
        field: "legal-analysis",
        question: "Review the story with the AI reasoning layer connected.",
        reason:
          "Structured GPT cognition was unavailable, so final issue spotting could not run.",
        requiredFor: "evidence",
        severity: "medium",
      },
      {
        field: "evidence-map",
        question: "What evidence proves each major fact?",
        reason:
          "The fallback engine can preserve the intake but cannot fully map proof without structured cognition.",
        requiredFor: "evidence",
        severity: "medium",
      },
    ],
    evidenceIssueLinks: normalizedIntake.evidence.map((item) => ({
      issueLabel: item.title,
      claimType: firstDomain,
      requiredProof: "Connect this evidence to a fact, legal issue, date, and remedy.",
      missingEvidence: item.gaps,
      strength: item.strength,
      explanation:
        "Fallback evidence mapping created from normalized intake evidence.",
    })),
    litigationRisks: [
      {
        title: "Structured AI cognition unavailable",
        explanation:
          "The structured reasoning model did not run, so outputs should be treated as draft intake preservation only.",
        severity: "medium",
        source: "strategy",
        suggestedFix: "Confirm OPENAI_API_KEY and rerun analysis.",
      },
      {
        title: "Legal theory requires review",
        explanation:
          "Fallback classification is based on intake signals only, not full legal cognition.",
        severity: "medium",
        source: "law",
        claimType: firstDomain,
        suggestedFix:
          "Rerun with structured cognition and verify the legal theory against evidence and procedure.",
      },
    ],
    opposingArguments: [
      {
        claimType: firstDomain,
        argument:
          "The other side may argue the facts are incomplete, unsupported, out of context, procedurally improper, or legally insufficient.",
        whyItMatters:
          "Fallback mode cannot fully test the opposing side’s strongest arguments.",
        responseStrategy:
          "Organize facts, dates, documents, witnesses, procedure, damages, and evidence before final drafting.",
        evidenceNeeded: [
          "Timeline",
          "Key documents",
          "Witness information",
          "Damages proof",
          "Procedural history",
        ],
      },
    ],
    judgeConcerns: [
      {
        claimType: firstDomain,
        concern:
          "The court may need clearer facts, evidence, procedural posture, and remedy before the case can be assessed.",
        whyJudgeMayCare:
          "Courts need clear, relevant, admissible, and procedurally proper material.",
        howToAddress:
          "Organize chronology, evidence, damages, procedural status, requested remedy, and missing proof.",
      },
    ],
    formRecommendations: [],
    plainLanguageSummary:
      "CourtSimplified preserved the intake and ran fallback legal triage, but structured AI cognition was unavailable.",
    structuredCaseSummary: `Fallback analysis based on normalized intake. Raw issue signals: ${domains.join(", ")}. Raw text length: ${rawText.length}.`,
    nextBestActions: [
      "Confirm OpenAI configuration and rerun the analysis.",
      "Build a timeline.",
      "Link each major fact to evidence.",
      "Identify missing proof and deadlines.",
      "Confirm procedure and forum before generating final documents.",
    ],
    systemWarnings: ["Structured GPT cognition was unavailable."],
  };
}

export async function runCourtSimplifiedBrain(
  input: CourtSimplifiedBrainInput,
): Promise<CourtSimplifiedBrainOutput> {
  const normalizedIntake = await normalizeIntake(input);

  const gptCognition =
    (await runStructuredGptCognition(input, normalizedIntake)) ||
    buildFallbackCognition(normalizedIntake);

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
  const baseOpposingArguments = buildOpposingArguments(gptCognition);
  const baseJudgeConcerns = buildJudgeConcerns(gptCognition);

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

  const opposingArguments = buildSupplementalOpposingArguments({
    existingOpposingArguments: baseOpposingArguments,
    normalizedIntake,
    elementProofAnalysis,
  });

  const judgeConcerns = buildSupplementalJudgeConcerns({
    existingJudgeConcerns: baseJudgeConcerns,
    contradictions,
    limitationAssessments,
    normalizedIntake,
    elementProofAnalysis,
  });

  const legalKnowledge = buildLegalKnowledge({
    courtPath,
    province: proceduralPosture.province,
    stage,
    primaryClaimTypes,
  });

  const nextBestActions = buildSupplementalNextActions({
    existingActions: cleanList(gptCognition.nextBestActions || []),
    contradictions,
    limitationAssessments,
    normalizedIntake,
    elementProofAnalysis,
  });

  const timestamp = nowIso();

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
    opposingArguments,
    judgeConcerns,
    formRecommendations,
    legalKnowledge,
    elementProofAnalysis,

    plainLanguageSummary:
      clean(gptCognition.plainLanguageSummary) ||
      "CourtSimplified produced a structured litigation analysis from the user’s intake.",

    structuredCaseSummary:
      clean(gptCognition.structuredCaseSummary) ||
      "Structured case summary requires further review.",

    nextBestActions,

    systemWarnings: cleanList([
      ...safeArray(gptCognition.systemWarnings),
      ...proceduralPosture.warnings,
      ...contradictions.map((item) => item.title),
      ...limitationAssessments
        .filter((item) => item.status === "possible-risk" || item.status === "likely-risk")
        .map((item) => "Limitation or deadline risk requires review."),
      ...elementProofAnalysis.globalWeaknesses.map(
        (weakness) => `Proof weakness requires review: ${weakness}.`,
      ),
      ...legalKnowledge.sourceWarnings,
    ]),

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