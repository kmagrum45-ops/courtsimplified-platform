// src/lib/case-system/authority-intelligence/authorityBrainBridge.ts

import type {
  CourtSimplifiedBrainOutput,
  LegalIntelligenceResult,
  IntelligenceSeverity,
  IntelligenceConfidence,
  LegalDomain,
  ClaimProofMap,
  ContradictionFinding,
} from "../intelligence/intelligenceTypes";

import {
  createAuthorityIntegrationHub,
  type AuthorityIntegrationConsumer,
  type AuthorityIntegrationHubResult,
} from "./authorityIntegrationHub";

import type {
  AuthorityNavigatorAdapters,
  AuthorityNavigatorCaseContext,
  AuthorityNavigatorRequest,
} from "./authorityNavigator";

export type AuthorityBrainBridgeVersion = "1.0.0";

export type AuthorityBrainBridgeStatus =
  | "ready"
  | "partial"
  | "blocked"
  | "needs-review";

export type AuthorityBrainBridgeSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type AuthorityBrainSignalType =
  | "legal-knowledge-warning"
  | "procedural-posture"
  | "claim-classification"
  | "litigation-risk"
  | "judge-concern"
  | "opposing-argument"
  | "proof-analysis"
  | "evidence-intelligence"
  | "contradiction"
  | "limitation"
  | "form-recommendation"
  | "workflow-route"
  | "system-warning";

export interface AuthorityBrainBridgeInput {
  brainOutput: CourtSimplifiedBrainOutput;
  adapters?: AuthorityNavigatorAdapters;
  consumer?: AuthorityIntegrationConsumer;
  maxRequests?: number;
  includeNonBlockingSignals?: boolean;
  brainMigrationContext?: unknown;
  caseSystemAssemblyContext?: unknown;
  aiCasePartnerContext?: unknown;
  extensionData?: Record<string, unknown>;
}

export interface AuthorityBrainSignal {
  id: string;
  signalType: AuthorityBrainSignalType;
  severity: AuthorityBrainBridgeSeverity;
  title: string;
  explanation: string;
  topics: string[];
  domains: string[];
  route?: string;
  requiresAnnualPractice: boolean;
  requiresCanlii: boolean;
  requiresCitationSafety: boolean;
  sourceIds: string[];
  request: AuthorityNavigatorRequest;
}

export interface AuthorityBrainBridgeDiagnostic {
  code: string;
  severity: AuthorityBrainBridgeSeverity;
  message: string;
  detail?: string;
}

export interface AuthorityBrainBridgeResult {
  version: AuthorityBrainBridgeVersion;
  generatedAt: string;
  status: AuthorityBrainBridgeStatus;
  caseId?: string;
  signals: AuthorityBrainSignal[];
  integrations: AuthorityIntegrationHubResult[];
  diagnostics: AuthorityBrainBridgeDiagnostic[];
  warnings: string[];
  authorityBrainSummary: {
    courtPath: string;
    province: string;
    stage: string;
    recommendedNextRoute?: string;
    primaryClaimTypes: string[];
    totalSignals: number;
    blockingSignals: number;
    citationReady: boolean;
    annualPracticeReady: boolean;
    canliiReady: boolean;
    courtFacingAuthorityBlocked: boolean;
  };
  nextActions: string[];
  extensionData: Record<string, unknown>;
}

const VERSION: AuthorityBrainBridgeVersion = "1.0.0";

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function clean(value: unknown): string {
  return String(value || "").trim();
}

function lower(value: unknown): string {
  return clean(value).toLowerCase();
}

function unique(values: unknown[]): string[] {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function severityRank(severity: AuthorityBrainBridgeSeverity): number {
  const ranks: Record<AuthorityBrainBridgeSeverity, number> = {
    info: 1,
    low: 2,
    medium: 3,
    high: 4,
    critical: 5,
  };

  return ranks[severity] || 1;
}

function normalizeSeverity(value: IntelligenceSeverity | string | undefined): AuthorityBrainBridgeSeverity {
  const text = lower(value);

  if (text === "critical") return "critical";
  if (text === "high" || text === "serious") return "high";
  if (text === "medium" || text === "moderate" || text === "elevated") return "medium";
  if (text === "low" || text === "manageable") return "low";

  return "info";
}

function confidenceToSeverity(confidence: IntelligenceConfidence): AuthorityBrainBridgeSeverity {
  if (confidence === "very-low" || confidence === "low") return "high";
  if (confidence === "medium") return "medium";
  return "low";
}

function isCourtFacingRoute(route?: string): boolean {
  return [
    "/documents",
    "/forms",
    "/court-package",
    "/settlement-conference",
    "/trial-package",
    "/generated-documents",
  ].includes(clean(route));
}

function consumerForRoute(
  route: string | undefined,
  fallback: AuthorityIntegrationConsumer,
): AuthorityIntegrationConsumer {
  if (route === "/legal-principles") return "legal-principles";
  if (route === "/litigation-strategy") return "litigation-strategy";
  if (route === "/court-package") return "court-package";
  if (route === "/trial-package") return "trial-package";
  if (route === "/settlement-conference") return "litigation-strategy";
  if (route === "/builder") return "ai-case-partner";
  if (route === "/case-dashboard") return "workflow";

  return fallback;
}

function domainFromCourtPath(courtPath: string): string[] {
  if (courtPath === "small-claims") return ["small-claims"];
  if (courtPath === "civil") return ["civil-procedure"];
  if (courtPath === "family") return ["family-law"];
  if (courtPath === "tribunal" || courtPath === "ltb" || courtPath === "immigration") {
    return ["administrative-law"];
  }
  if (courtPath === "criminal-related") return ["criminal"];

  return ["civil-procedure"];
}

function normalizeLegalDomain(domain: LegalDomain | string): string {
  if (domain === "family-parenting") return "family-law";
  if (domain === "family-support") return "family-law";
  if (domain === "family-property") return "family-law";
  if (domain === "family-safety") return "family-law";
  if (domain === "landlord-tenant") return "administrative-law";
  if (domain === "procedural") return "civil-procedure";
  if (domain === "civil-charter") return "charter";
  if (domain === "civil-human-rights") return "administrative-law";
  if (domain === "civil-institutional-liability") return "torts";
  if (domain === "property-damage") return "torts";
  if (domain === "personal-injury") return "torts";
  if (domain === "negligence") return "torts";
  if (domain === "employment") return "contract";
  if (domain === "debt") return "contract";
  if (domain === "consumer") return "contract";
  if (domain === "immigration") return "administrative-law";

  return clean(domain) || "unknown";
}

function requiresAnnualPractice(topics: string[], route?: string): boolean {
  const text = topics.join(" ").toLowerCase();

  return (
    isCourtFacingRoute(route) ||
    text.includes("procedure") ||
    text.includes("deadline") ||
    text.includes("service") ||
    text.includes("filing") ||
    text.includes("motion") ||
    text.includes("conference") ||
    text.includes("trial") ||
    text.includes("forms") ||
    text.includes("limitation")
  );
}

function requiresCanlii(topics: string[], route?: string): boolean {
  const text = topics.join(" ").toLowerCase();

  return (
    route === "/legal-principles" ||
    route === "/litigation-strategy" ||
    route === "/court-package" ||
    route === "/trial-package" ||
    text.includes("case law") ||
    text.includes("authority") ||
    text.includes("binding") ||
    text.includes("judge") ||
    text.includes("precedent") ||
    text.includes("citation")
  );
}

function proofMapExplanation(map: ClaimProofMap): string {
  return unique([
    `Claim: ${map.claimTitle}`,
    `Overall proof strength: ${map.overallProofStrength}`,
    map.weakestElements.length > 0
      ? `Weakest elements: ${map.weakestElements.join("; ")}`
      : "",
    map.missingEvidence.length > 0
      ? `Missing evidence: ${map.missingEvidence.join("; ")}`
      : "",
    map.nextActions.length > 0
      ? `Next actions: ${map.nextActions.join("; ")}`
      : "",
  ]).join(". ");
}

function contradictionExplanation(contradiction: ContradictionFinding): string {
  return unique([
    contradiction.description,
    contradiction.affectedFields.length > 0
      ? `Affected fields: ${contradiction.affectedFields.join("; ")}`
      : "",
    contradiction.suggestedFix,
  ]).join(". ");
}

function buildCaseContext(
  input: AuthorityBrainBridgeInput,
): AuthorityNavigatorCaseContext {
  const intelligence = input.brainOutput.intelligence;
  const posture = intelligence.proceduralPosture;
  const courtPath = posture.courtPath;
  const province = posture.province;
  const stage = posture.stage;

  return {
    caseId: intelligence.normalizedIntake.caseId,
    courtPath,
    province,
    jurisdiction: province,
    stage,
    proceduralPosture: `${courtPath} / ${stage}`,
    legalDomains: unique([
      ...domainFromCourtPath(courtPath),
      ...intelligence.primaryClaimTypes.map(normalizeLegalDomain),
    ]),
    issues: unique([
      ...intelligence.primaryClaimTypes,
      ...intelligence.claimClassifications.map((claim) => claim.claimType),
      ...intelligence.litigationRisks.map((risk) => risk.title),
      ...intelligence.judgeConcerns.map((concern) => concern.concern),
    ]),
    facts: intelligence.normalizedIntake.events.map((event) => event.description),
    claims: intelligence.claimClassifications.map((claim) => claim.explanation),
    remedies: intelligence.remedyFitAssessments.map((remedy) => remedy.requestedRemedy),
    evidenceIssues: unique([
      ...intelligence.evidenceIssueLinks.map((link) => link.issueLabel),
      ...(intelligence.evidenceIntelligenceAnalysis?.gaps || []).map((gap) => gap.title),
    ]),
    risks: intelligence.litigationRisks.map((risk) => risk.title),
    deadlines: intelligence.limitationAssessments.flatMap((assessment) => [
      assessment.possibleDeadline || "",
      ...assessment.missingDateQuestions,
    ]),
    workflowRoute: input.brainOutput.recommendedNextRoute,
    workflowBlockers: intelligence.systemWarnings,
    litigationReasoning: input.extensionData?.litigationReasoning,
    aiCasePartnerContext: input.aiCasePartnerContext,
    brainMigrationContext: input.brainMigrationContext,
    masterCaseSchemaContext: input.caseSystemAssemblyContext,
  };
}

function buildSignal(args: {
  input: AuthorityBrainBridgeInput;
  signalType: AuthorityBrainSignalType;
  severity: AuthorityBrainBridgeSeverity;
  title: string;
  explanation: string;
  topics: string[];
  domains?: string[];
  route?: string;
  sourceIds?: string[];
}): AuthorityBrainSignal {
  const caseContext = buildCaseContext(args.input);
  const topics = unique(args.topics);
  const route = args.route || args.input.brainOutput.recommendedNextRoute;
  const requiresCitationSafety =
    isCourtFacingRoute(route) ||
    topics.some((topic) =>
      ["authority", "citation", "case law", "binding", "precedent"].some((needle) =>
        topic.toLowerCase().includes(needle),
      ),
    );

  const request: AuthorityNavigatorRequest = {
    purpose:
      route === "/trial-package"
        ? "trial-package"
        : route === "/court-package"
          ? "court-package"
          : route === "/litigation-strategy"
            ? "litigation-strategy"
            : route === "/legal-principles"
              ? "legal-principles"
              : "ai-case-partner",
    query: unique([args.title, ...topics]).join(" "),
    topics,
    courtPath: caseContext.courtPath,
    jurisdiction: caseContext.jurisdiction,
    province: caseContext.province,
    stage: caseContext.stage,
    legalDomains: unique([
      ...(args.domains || []),
      ...(caseContext.legalDomains || []),
    ]),
    requireVerified: true,
    includeNeedsReview: false,
    maxAuthorities: isCourtFacingRoute(route) ? 18 : 10,
    caseContext,
    explanationMode: "detailed",
    citationMode: requiresCitationSafety ? "safe" : "none",
    annualPracticeMode: requiresAnnualPractice(topics, route)
      ? "hooks-only"
      : "off",
    canliiMode: requiresCanlii(topics, route) ? "hooks-only" : "off",
    cacheMode: "read-write",
    extensionData: {
      authorityBrainSignalType: args.signalType,
      sourceIds: args.sourceIds || [],
      recommendedRoute: route,
      ...(args.input.extensionData || {}),
    },
  };

  return {
    id: createId("authority_brain_signal"),
    signalType: args.signalType,
    severity: args.severity,
    title: args.title,
    explanation: args.explanation,
    topics,
    domains: request.legalDomains?.map(String) || [],
    route,
    requiresAnnualPractice: request.annualPracticeMode !== "off",
    requiresCanlii: request.canliiMode !== "off",
    requiresCitationSafety,
    sourceIds: args.sourceIds || [],
    request,
  };
}
function signalsFromLegalKnowledge(
  input: AuthorityBrainBridgeInput,
): AuthorityBrainSignal[] {
  const intelligence = input.brainOutput.intelligence;

  return intelligence.legalKnowledge.sourceWarnings.map((warning) =>
    buildSignal({
      input,
      signalType: "legal-knowledge-warning",
      severity: "high",
      title: "Legal authority verification required",
      explanation: warning,
      route: "/legal-principles",
      topics: ["legal authority", "verification", "citation safety", warning],
    }),
  );
}

function signalsFromProceduralPosture(
  input: AuthorityBrainBridgeInput,
): AuthorityBrainSignal[] {
  const posture = input.brainOutput.intelligence.proceduralPosture;
  const signals: AuthorityBrainSignal[] = [];

  if (posture.warnings.length > 0 || posture.missingProcedureInfo.length > 0) {
    signals.push(
      buildSignal({
        input,
        signalType: "procedural-posture",
        severity: "high",
        title: "Procedural posture requires authority support",
        explanation:
          "Court path, stage, filing, service, deadline, or procedural posture needs verification before court-facing output.",
        route: "/case-dashboard",
        topics: unique([
          "procedure",
          "court path",
          "stage",
          "deadlines",
          "service",
          "filing",
          ...posture.warnings,
          ...posture.missingProcedureInfo,
          ...posture.nextProceduralQuestions,
        ]),
      }),
    );
  }

  return signals;
}

function signalsFromClaims(
  input: AuthorityBrainBridgeInput,
): AuthorityBrainSignal[] {
  const intelligence = input.brainOutput.intelligence;

  return intelligence.claimClassifications
    .filter(
      (claim) =>
        input.includeNonBlockingSignals ||
        claim.status === "detected" ||
        claim.status === "possible" ||
        claim.status === "conflicting-signals",
    )
    .map((claim) =>
      buildSignal({
        input,
        signalType: "claim-classification",
        severity:
          claim.status === "conflicting-signals" ||
          claim.status === "insufficient-facts"
            ? "high"
            : "medium",
        title: `Authority support for ${claim.claimType}`,
        explanation: claim.explanation,
        route: "/legal-principles",
        topics: unique([
          claim.claimType,
          claim.status,
          claim.explanation,
          ...claim.requiredElements.map((element) => element.label),
          ...claim.requiredElements.flatMap((element) => element.risks),
        ]),
        domains: [normalizeLegalDomain(claim.claimType)],
        sourceIds: [claim.id],
      }),
    );
}

function signalsFromRisks(
  input: AuthorityBrainBridgeInput,
): AuthorityBrainSignal[] {
  return input.brainOutput.intelligence.litigationRisks.map((risk) =>
    buildSignal({
      input,
      signalType: "litigation-risk",
      severity: normalizeSeverity(risk.severity),
      title: risk.title,
      explanation: risk.explanation,
      route:
        risk.source === "procedure" ||
        risk.source === "limitations" ||
        risk.source === "forms"
          ? "/case-dashboard"
          : "/litigation-strategy",
      topics: unique([
        risk.title,
        risk.explanation,
        risk.suggestedFix,
        risk.source,
        risk.claimType || "",
      ]),
      domains: risk.claimType ? [normalizeLegalDomain(risk.claimType)] : [],
      sourceIds: [risk.id],
    }),
  );
}

function signalsFromJudgeConcerns(
  input: AuthorityBrainBridgeInput,
): AuthorityBrainSignal[] {
  return input.brainOutput.intelligence.judgeConcerns.map((concern) =>
    buildSignal({
      input,
      signalType: "judge-concern",
      severity: "medium",
      title: "Authority support for judge concern",
      explanation: concern.concern,
      route: "/litigation-strategy",
      topics: unique([
        "judge reasoning",
        concern.concern,
        concern.whyJudgeMayCare,
        concern.howToAddress,
        concern.claimType || "",
      ]),
      domains: concern.claimType ? [normalizeLegalDomain(concern.claimType)] : [],
      sourceIds: [concern.id],
    }),
  );
}

function signalsFromOpposingArguments(
  input: AuthorityBrainBridgeInput,
): AuthorityBrainSignal[] {
  return input.brainOutput.intelligence.opposingArguments.map((argument) =>
    buildSignal({
      input,
      signalType: "opposing-argument",
      severity: "medium",
      title: "Authority support for opposing argument",
      explanation: argument.argument,
      route: "/litigation-strategy",
      topics: unique([
        "opposing argument",
        argument.argument,
        argument.whyItMatters,
        argument.responseStrategy,
        argument.claimType || "",
      ]),
      domains: argument.claimType
        ? [normalizeLegalDomain(argument.claimType)]
        : [],
      sourceIds: [argument.id],
    }),
  );
}

function signalsFromProof(
  input: AuthorityBrainBridgeInput,
): AuthorityBrainSignal[] {
  const proof = input.brainOutput.intelligence.elementProofAnalysis;

  if (!proof) return [];

  return proof.claimProofMaps
    .filter(
      (map) =>
        input.includeNonBlockingSignals ||
        map.overallProofStrength === "low" ||
        map.overallProofStrength === "very-low" ||
        map.missingEvidence.length > 0 ||
        map.weakestElements.length > 0 ||
        map.elementFindings.some(
          (finding) =>
            finding.status === "missing-proof" ||
            finding.status === "contradicted" ||
            finding.burdenRisk === "high" ||
            finding.burdenRisk === "critical",
        ),
    )
    .map((map) =>
      buildSignal({
        input,
        signalType: "proof-analysis",
        severity: confidenceToSeverity(map.overallProofStrength),
        title: `Authority support for proof map: ${map.claimTitle}`,
        explanation: proofMapExplanation(map),
        route: "/litigation-strategy",
        topics: unique([
          "burden of proof",
          "legal elements",
          map.claimTitle,
          map.claimType,
          ...map.weakestElements,
          ...map.missingEvidence,
          ...map.judgeConcerns,
          ...map.opposingArguments,
          ...map.nextActions,
          ...map.elementFindings.map((finding) => finding.elementLabel),
          ...map.elementFindings.map((finding) => finding.explanation),
        ]),
        domains: [normalizeLegalDomain(map.claimType)],
        sourceIds: [map.id],
      }),
    );
}

function signalsFromEvidence(
  input: AuthorityBrainBridgeInput,
): AuthorityBrainSignal[] {
  const evidence = input.brainOutput.intelligence.evidenceIntelligenceAnalysis;

  if (!evidence) return [];

  return [
    ...evidence.gaps.map((gap) =>
      buildSignal({
        input,
        signalType: "evidence-intelligence",
        severity: normalizeSeverity(gap.severity),
        title: gap.title,
        explanation: gap.explanation,
        route: "/evidence",
        topics: unique([
          "evidence",
          "proof gap",
          gap.title,
          gap.explanation,
          ...gap.recommendedEvidence,
        ]),
        sourceIds: [gap.id],
      }),
    ),
    ...evidence.contradictions.map((contradiction) =>
      buildSignal({
        input,
        signalType: "evidence-intelligence",
        severity: normalizeSeverity(contradiction.severity),
        title: contradiction.title,
        explanation: contradiction.explanation,
        route: "/litigation-strategy",
        topics: unique([
          "evidence contradiction",
          contradiction.title,
          contradiction.explanation,
        ]),
        sourceIds: [contradiction.id],
      }),
    ),
  ];
}

function signalsFromContradictions(
  input: AuthorityBrainBridgeInput,
): AuthorityBrainSignal[] {
  return input.brainOutput.intelligence.contradictions.map((contradiction) =>
    buildSignal({
      input,
      signalType: "contradiction",
      severity: normalizeSeverity(contradiction.severity),
      title: contradiction.title,
      explanation: contradictionExplanation(contradiction),
      route: "/litigation-strategy",
      topics: unique([
        "contradiction",
        contradiction.title,
        contradiction.description,
        contradiction.suggestedFix,
        ...contradiction.affectedFields,
      ]),
      sourceIds: [contradiction.id],
    }),
  );
}

function signalsFromLimitations(
  input: AuthorityBrainBridgeInput,
): AuthorityBrainSignal[] {
  return input.brainOutput.intelligence.limitationAssessments
    .filter(
      (assessment) =>
        input.includeNonBlockingSignals ||
        assessment.status === "possible-risk" ||
        assessment.status === "likely-risk",
    )
    .map((assessment) =>
      buildSignal({
        input,
        signalType: "limitation",
        severity:
          assessment.status === "likely-risk" ? "high" : "medium",
        title: "Limitation or deadline authority required",
        explanation: assessment.reasons.join(" "),
        route: "/case-dashboard",
        topics: unique([
          "limitation",
          "deadline",
          "discoverability",
          "notice",
          assessment.status,
          assessment.claimType,
          ...assessment.reasons,
          ...assessment.missingDateQuestions,
        ]),
        domains: [normalizeLegalDomain(assessment.claimType)],
        sourceIds: [assessment.id],
      }),
    );
}

function signalsFromForms(
  input: AuthorityBrainBridgeInput,
): AuthorityBrainSignal[] {
  return input.brainOutput.intelligence.formRecommendations.map((form) =>
    buildSignal({
      input,
      signalType: "form-recommendation",
      severity: "medium",
      title: `Authority support for form recommendation: ${form.title}`,
      explanation: form.reason,
      route: "/forms",
      topics: unique([
        "forms",
        "filing requirements",
        form.formNumber || "",
        form.title,
        form.reason,
        ...form.warnings,
      ]),
      sourceIds: [form.id],
    }),
  );
}
function signalsFromWorkflowRoute(
  input: AuthorityBrainBridgeInput,
): AuthorityBrainSignal[] {
  const route = input.brainOutput.recommendedNextRoute;

  if (!route) return [];

  return [
    buildSignal({
      input,
      signalType: "workflow-route",
      severity: isCourtFacingRoute(route) ? "high" : "medium",
      title: `Authority support for recommended route ${route}`,
      explanation:
        "CourtSimplifiedBrain selected this recommended route. Authority Intelligence should prepare verified support before downstream UI relies on it.",
      route,
      topics: unique([
        "recommended route",
        route,
        ...input.brainOutput.intelligence.nextBestActions,
      ]),
    }),
  ];
}

function signalsFromSystemWarnings(
  input: AuthorityBrainBridgeInput,
): AuthorityBrainSignal[] {
  return input.brainOutput.intelligence.systemWarnings.map((warning) =>
    buildSignal({
      input,
      signalType: "system-warning",
      severity: lower(warning).includes("verify") ? "high" : "medium",
      title: "Brain system warning requires authority review",
      explanation: warning,
      route: "/legal-principles",
      topics: ["system warning", "authority review", warning],
    }),
  );
}

function dedupeSignals(
  signals: AuthorityBrainSignal[],
  maxRequests: number,
): AuthorityBrainSignal[] {
  const byKey = new Map<string, AuthorityBrainSignal>();

  for (const signal of signals) {
    const key = [
      signal.signalType,
      signal.route || "",
      signal.title.toLowerCase(),
      signal.topics.slice(0, 4).join("|").toLowerCase(),
    ].join("::");

    const existing = byKey.get(key);

    if (!existing || severityRank(signal.severity) > severityRank(existing.severity)) {
      byKey.set(key, signal);
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => {
      const severityDifference = severityRank(b.severity) - severityRank(a.severity);
      if (severityDifference !== 0) return severityDifference;

      if (isCourtFacingRoute(a.route) && !isCourtFacingRoute(b.route)) return -1;
      if (!isCourtFacingRoute(a.route) && isCourtFacingRoute(b.route)) return 1;

      return a.title.localeCompare(b.title);
    })
    .slice(0, maxRequests);
}

function buildSignals(input: AuthorityBrainBridgeInput): AuthorityBrainSignal[] {
  return dedupeSignals(
    [
      ...signalsFromLegalKnowledge(input),
      ...signalsFromProceduralPosture(input),
      ...signalsFromClaims(input),
      ...signalsFromRisks(input),
      ...signalsFromJudgeConcerns(input),
      ...signalsFromOpposingArguments(input),
      ...signalsFromProof(input),
      ...signalsFromEvidence(input),
      ...signalsFromContradictions(input),
      ...signalsFromLimitations(input),
      ...signalsFromForms(input),
      ...signalsFromWorkflowRoute(input),
      ...signalsFromSystemWarnings(input),
    ],
    input.maxRequests || 25,
  );
}

function buildDiagnostics(
  input: AuthorityBrainBridgeInput,
  signals: AuthorityBrainSignal[],
  integrations: AuthorityIntegrationHubResult[],
): AuthorityBrainBridgeDiagnostic[] {
  const diagnostics: AuthorityBrainBridgeDiagnostic[] = [];
  const intelligence = input.brainOutput.intelligence;

  if (!signals.length) {
    diagnostics.push({
      code: "AUTH_BRAIN_NO_SIGNALS",
      severity: "info",
      message:
        "CourtSimplifiedBrain did not produce authority signals requiring routing.",
    });
  }

  if (intelligence.proceduralPosture.courtPath === "unknown") {
    diagnostics.push({
      code: "AUTH_BRAIN_UNKNOWN_COURT_PATH",
      severity: "medium",
      message: "Court path is unknown.",
      detail:
        "Authority routing is safer when the court path is confirmed before court-facing output.",
    });
  }

  if (intelligence.proceduralPosture.stage === "not-sure") {
    diagnostics.push({
      code: "AUTH_BRAIN_UNKNOWN_STAGE",
      severity: "medium",
      message: "Procedural stage is not confirmed.",
      detail:
        "Authority routing is safer when procedural stage is confirmed before court-facing output.",
    });
  }

  if (intelligence.legalKnowledge.sourceWarnings.length > 0) {
    diagnostics.push({
      code: "AUTH_BRAIN_LEGAL_KNOWLEDGE_WARNINGS",
      severity: "high",
      message: "Legal knowledge warnings require authority verification.",
      detail: intelligence.legalKnowledge.sourceWarnings.join(" "),
    });
  }

  for (const integration of integrations) {
    if (integration.status === "blocked") {
      diagnostics.push({
        code: "AUTH_BRAIN_INTEGRATION_BLOCKED",
        severity: "high",
        message: `Authority integration is blocked for ${integration.consumer}.`,
        detail: integration.warnings.join(" "),
      });
    }
  }

  return diagnostics;
}

function determineStatus(
  diagnostics: AuthorityBrainBridgeDiagnostic[],
  integrations: AuthorityIntegrationHubResult[],
): AuthorityBrainBridgeStatus {
  if (diagnostics.some((diagnostic) => diagnostic.severity === "critical")) {
    return "blocked";
  }

  if (integrations.some((integration) => integration.status === "blocked")) {
    return "blocked";
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "high")) {
    return "needs-review";
  }

  if (integrations.some((integration) => integration.status !== "ready")) {
    return "partial";
  }

  return "ready";
}

function buildSummary(
  intelligence: LegalIntelligenceResult,
  signals: AuthorityBrainSignal[],
  integrations: AuthorityIntegrationHubResult[],
  recommendedNextRoute?: string,
): AuthorityBrainBridgeResult["authorityBrainSummary"] {
  return {
    courtPath: intelligence.proceduralPosture.courtPath,
    province: intelligence.proceduralPosture.province,
    stage: intelligence.proceduralPosture.stage,
    recommendedNextRoute,
    primaryClaimTypes: intelligence.primaryClaimTypes,
    totalSignals: signals.length,
    blockingSignals: signals.filter(
      (signal) =>
        severityRank(signal.severity) >= 4 ||
        signal.requiresCitationSafety ||
        isCourtFacingRoute(signal.route),
    ).length,
    citationReady: integrations.some(
      (integration) => integration.integrationSummary.citationReady,
    ),
    annualPracticeReady: integrations.some(
      (integration) => integration.integrationSummary.annualPracticeReady,
    ),
    canliiReady: integrations.some(
      (integration) => integration.integrationSummary.canliiReady,
    ),
    courtFacingAuthorityBlocked: signals.some(
      (signal) =>
        isCourtFacingRoute(signal.route) &&
        severityRank(signal.severity) >= 4,
    ),
  };
}

function buildNextActions(
  result: Pick<
    AuthorityBrainBridgeResult,
    "status" | "signals" | "integrations" | "authorityBrainSummary"
  >,
): string[] {
  const actions: string[] = [];

  if (result.status === "blocked" || result.status === "needs-review") {
    actions.push(
      "Resolve Authority Brain Bridge warnings before allowing Brain output to become court-facing authority guidance.",
    );
  }

  if (result.authorityBrainSummary.courtFacingAuthorityBlocked) {
    actions.push(
      "Do not treat forms, documents, court packages, or trial packages as authority-ready until citation and jurisdiction checks pass.",
    );
  }

  if (result.signals.some((signal) => signal.requiresAnnualPractice)) {
    actions.push(
      "Use Annual Practice hooks for procedural issues raised by the Brain, including deadlines, service, filing, forms, conferences, motions, and trial readiness.",
    );
  }

  if (result.signals.some((signal) => signal.requiresCanlii)) {
    actions.push(
      "Use CanLII hooks for authority verification, case-law support, jurisdiction fit, and citation enrichment when live lookup is available.",
    );
  }

  actions.push(
    "Keep CourtSimplifiedBrain connected to legal authority only through Authority Intelligence; do not hard-code authorities into Brain, Workflow, or UI pages.",
  );

  for (const integration of result.integrations) {
    actions.push(...integration.nextActions);
  }

  return unique(actions).slice(0, 25);
}

export function buildAuthorityBrainBridge(
  input: AuthorityBrainBridgeInput,
): AuthorityBrainBridgeResult {
  const signals = buildSignals(input);
  const hub = createAuthorityIntegrationHub(input.adapters);
  const caseContext = buildCaseContext(input);
  const fallbackConsumer = input.consumer || "brain-migration-layer";

  const integrations = signals.map((signal) =>
    hub.resolve({
      consumer: consumerForRoute(signal.route, fallbackConsumer),
      caseContext: {
        ...caseContext,
        workflowRoute: signal.route || caseContext.workflowRoute,
        workflowBlockers: unique([
          ...(caseContext.workflowBlockers || []),
          signal.title,
          signal.explanation,
        ]),
      },
      request: signal.request,
      sourceSystem: "AuthorityBrainBridge",
      workflowRoute: signal.route,
      brainMigrationContext: input.brainMigrationContext,
      caseSystemAssemblyContext: input.caseSystemAssemblyContext,
      aiCasePartnerContext: input.aiCasePartnerContext,
      extensionData: {
        ...(input.extensionData || {}),
        authorityBrainSignalId: signal.id,
        authorityBrainSignalType: signal.signalType,
      },
    }),
  );

  const diagnostics = buildDiagnostics(input, signals, integrations);
  const status = determineStatus(diagnostics, integrations);
  const authorityBrainSummary = buildSummary(
    input.brainOutput.intelligence,
    signals,
    integrations,
    input.brainOutput.recommendedNextRoute,
  );

  const partial = {
    status,
    signals,
    integrations,
    authorityBrainSummary,
  };

  return {
    version: VERSION,
    generatedAt: nowIso(),
    status,
    caseId: input.brainOutput.intelligence.normalizedIntake.caseId,
    signals,
    integrations,
    diagnostics,
    warnings: unique([
      ...input.brainOutput.intelligence.systemWarnings,
      ...diagnostics
        .filter((diagnostic) => severityRank(diagnostic.severity) >= 3)
        .map((diagnostic) => diagnostic.message),
      ...integrations.flatMap((integration) => integration.warnings),
    ]),
    authorityBrainSummary,
    nextActions: buildNextActions(partial),
    extensionData: input.extensionData || {},
  };
}

export function getBlockingAuthorityBrainSignals(
  result: AuthorityBrainBridgeResult,
): AuthorityBrainSignal[] {
  return result.signals.filter(
    (signal) =>
      severityRank(signal.severity) >= 4 ||
      signal.requiresCitationSafety ||
      isCourtFacingRoute(signal.route),
  );
}

export function isBrainAuthorityReady(result: AuthorityBrainBridgeResult): boolean {
  return (
    result.status === "ready" &&
    !result.authorityBrainSummary.courtFacingAuthorityBlocked &&
    result.integrations.every((integration) => integration.status === "ready")
  );
}

export function getAuthorityBrainSignalsForRoute(
  result: AuthorityBrainBridgeResult,
  route: string,
): AuthorityBrainSignal[] {
  return result.signals.filter((signal) => signal.route === route);
}

export const authorityBrainBridge = {
  build: buildAuthorityBrainBridge,
  getBlockingSignals: getBlockingAuthorityBrainSignals,
  isReady: isBrainAuthorityReady,
  getSignalsForRoute: getAuthorityBrainSignalsForRoute,
};