// src/lib/case-system/authority-intelligence/authorityCaseSystemBridge.ts

import type { MasterCaseSchema } from "../architecture/masterCaseSchema";
import type { CourtSimplifiedBrainOutput } from "../intelligence/intelligenceTypes";

import {
  buildAuthorityBrainBridge,
  type AuthorityBrainBridgeResult,
} from "./authorityBrainBridge";

import {
  buildAuthorityWorkflowBridge,
  type AuthorityWorkflowBridgeResult,
} from "./authorityWorkflowBridge";

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

export type AuthorityCaseSystemBridgeVersion = "1.0.0";

export type AuthorityCaseSystemBridgeStatus =
  | "ready"
  | "partial"
  | "blocked"
  | "needs-review";

export type AuthorityCaseSystemBridgeSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type AuthorityCaseSystemSignalType =
  | "master-case-schema"
  | "authority-analysis"
  | "proof-analysis"
  | "contradiction-analysis"
  | "credibility-analysis"
  | "document-readiness";

export interface AuthorityCaseSystemBridgeInput {
  masterCase?: MasterCaseSchema;
  brainOutput?: CourtSimplifiedBrainOutput;
  workflowModel?: Parameters<typeof buildAuthorityWorkflowBridge>[0]["workflow"];
  caseSystemAssemblyContext?: unknown;
  brainMigrationContext?: unknown;
  litigationReasoningContext?: unknown;
  aiCasePartnerContext?: unknown;
  adapters?: AuthorityNavigatorAdapters;
  consumer?: AuthorityIntegrationConsumer;
  maxRequests?: number;
  includeNonBlockingSignals?: boolean;
  extensionData?: Record<string, unknown>;
}

export interface AuthorityCaseSystemSignal {
  id: string;
  signalType: AuthorityCaseSystemSignalType;
  severity: AuthorityCaseSystemBridgeSeverity;
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

export interface AuthorityCaseSystemBridgeDiagnostic {
  code: string;
  severity: AuthorityCaseSystemBridgeSeverity;
  message: string;
  detail?: string;
}

export interface AuthorityCaseSystemBridgeResult {
  version: AuthorityCaseSystemBridgeVersion;
  generatedAt: string;
  status: AuthorityCaseSystemBridgeStatus;
  caseId?: string;
  caseContext: AuthorityNavigatorCaseContext;
  signals: AuthorityCaseSystemSignal[];
  directIntegrations: AuthorityIntegrationHubResult[];
  brainBridge?: AuthorityBrainBridgeResult;
  workflowBridge?: AuthorityWorkflowBridgeResult;
  diagnostics: AuthorityCaseSystemBridgeDiagnostic[];
  warnings: string[];
  authorityCaseSystemSummary: {
    courtPath: string;
    province: string;
    stage: string;
    recommendedRoute?: string;
    totalSignals: number;
    blockingSignals: number;
    directIntegrationCount: number;
    brainBridgeConnected: boolean;
    workflowBridgeConnected: boolean;
    citationReady: boolean;
    annualPracticeReady: boolean;
    canliiReady: boolean;
    courtFacingAuthorityBlocked: boolean;
  };
  nextActions: string[];
  extensionData: Record<string, unknown>;
}

const VERSION: AuthorityCaseSystemBridgeVersion = "1.0.0";

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

function severityRank(severity: AuthorityCaseSystemBridgeSeverity): number {
  const ranks: Record<AuthorityCaseSystemBridgeSeverity, number> = {
    info: 1,
    low: 2,
    medium: 3,
    high: 4,
    critical: 5,
  };

  return ranks[severity] || 1;
}

function normalizeSeverity(value: unknown): AuthorityCaseSystemBridgeSeverity {
  const text = lower(value);

  if (text === "critical") return "critical";
  if (text === "high" || text === "serious") return "high";
  if (text === "medium" || text === "moderate" || text === "elevated") return "medium";
  if (text === "low" || text === "manageable") return "low";

  return "info";
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

function domainFromCourtPath(courtPath?: string): string[] {
  if (courtPath === "small-claims") return ["small-claims"];
  if (courtPath === "civil") return ["civil-procedure"];
  if (courtPath === "family") return ["family-law"];
  if (courtPath === "tribunal" || courtPath === "ltb" || courtPath === "immigration") {
    return ["administrative-law"];
  }
  if (courtPath === "criminal-related") return ["criminal"];

  return ["civil-procedure"];
}

function normalizeLegalDomain(domain: string): string {
  if (domain.startsWith("family-")) return "family-law";
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

  return domain || "unknown";
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

function buildCaseContext(input: AuthorityCaseSystemBridgeInput): AuthorityNavigatorCaseContext {
  const master = input.masterCase;
  const brain = input.brainOutput?.intelligence;
  const workflow = input.workflowModel;

  const courtPath =
    master?.courtPath ||
    brain?.proceduralPosture.courtPath ||
    workflow?.courtPath ||
    "unknown";

  const province =
    master?.province ||
    brain?.proceduralPosture.province ||
    workflow?.province ||
    "Ontario";

  const stage =
    master?.stage ||
    brain?.proceduralPosture.stage ||
    workflow?.stage ||
    "not-sure";

  const recommendedRoute =
    master?.workflow?.recommendedNextRoute ||
    input.brainOutput?.recommendedNextRoute ||
    workflow?.readiness.recommendedRoute;

  return {
    caseId: master?.id || brain?.normalizedIntake.caseId || workflow?.caseId,
    userId: master?.userId,
    courtPath,
    province,
    jurisdiction: province,
    stage,
    proceduralPosture: `${courtPath} / ${stage}`,
    legalDomains: unique([
      ...domainFromCourtPath(courtPath),
      ...(master?.claims || []).map((claim) => normalizeLegalDomain(claim.domain)),
      ...(brain?.primaryClaimTypes || []).map(normalizeLegalDomain),
    ]),
    issues: unique([
      ...(master?.claims || []).map((claim) => claim.title),
      ...(master?.risks || []).map((risk) => risk.title),
      ...(brain?.claimClassifications || []).map((claim) => claim.explanation),
      ...(brain?.litigationRisks || []).map((risk) => risk.title),
    ]),
    facts: unique([
      ...(master?.timeline || []).map((event) => event.description),
      ...(brain?.normalizedIntake.events || []).map((event) => event.description),
    ]),
    claims: unique([
      ...(master?.claims || []).map((claim) => claim.explanation),
      ...(brain?.claimClassifications || []).map((claim) => claim.explanation),
    ]),
    remedies: unique([
      ...(brain?.remedyFitAssessments || []).map((remedy) => remedy.requestedRemedy),
    ]),
    evidenceIssues: unique([
      ...(master?.evidenceIntelligence?.gaps || []).map((gap) => gap.title),
      ...(brain?.evidenceIssueLinks || []).map((link) => link.issueLabel),
      ...(brain?.evidenceIntelligenceAnalysis?.gaps || []).map((gap) => gap.title),
    ]),
    risks: unique([
      ...(master?.risks || []).map((risk) => risk.title),
      ...(brain?.litigationRisks || []).map((risk) => risk.title),
      ...(workflow?.blockers || []).map((blocker) => blocker.title),
    ]),
    deadlines: unique([
      ...(brain?.limitationAssessments || []).flatMap((assessment) => [
        assessment.possibleDeadline || "",
        ...assessment.missingDateQuestions,
      ]),
    ]),
    workflowRoute: recommendedRoute,
    workflowBlockers: unique([
      ...(master?.workflow?.blockers || []),
      ...(brain?.systemWarnings || []),
      ...(workflow?.blockers || []).map((blocker) => blocker.title),
    ]),
    litigationReasoning: input.litigationReasoningContext,
    aiCasePartnerContext: input.aiCasePartnerContext,
    brainMigrationContext: input.brainMigrationContext,
    masterCaseSchemaContext: input.masterCase || input.caseSystemAssemblyContext,
  };
}

function buildSignal(args: {
  input: AuthorityCaseSystemBridgeInput;
  signalType: AuthorityCaseSystemSignalType;
  severity: AuthorityCaseSystemBridgeSeverity;
  title: string;
  explanation: string;
  topics: string[];
  domains?: string[];
  route?: string;
  sourceIds?: string[];
}): AuthorityCaseSystemSignal {
  const caseContext = buildCaseContext(args.input);
  const topics = unique(args.topics);
  const route = args.route || caseContext.workflowRoute;
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
              : "workflow",
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
    annualPracticeMode: requiresAnnualPractice(topics, route) ? "hooks-only" : "off",
    canliiMode: requiresCanlii(topics, route) ? "hooks-only" : "off",
    cacheMode: "read-write",
    extensionData: {
      authorityCaseSystemSignalType: args.signalType,
      sourceIds: args.sourceIds || [],
      route,
      ...(args.input.extensionData || {}),
    },
  };

  return {
    id: createId("authority_case_system_signal"),
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

function signalsFromMasterCase(input: AuthorityCaseSystemBridgeInput): AuthorityCaseSystemSignal[] {
  const master = input.masterCase;
  if (!master) return [];

  const signals: AuthorityCaseSystemSignal[] = [];

  if (master.courtPath === "unknown" || master.stage === "not-sure") {
    signals.push(
      buildSignal({
        input,
        signalType: "master-case-schema",
        severity: "high",
        title: "Master case procedure context requires confirmation",
        explanation:
          "MasterCaseSchema has unknown court path or uncertain stage. Authority routing should not become court-facing until this is confirmed.",
        route: "/builder",
        topics: ["court path", "stage", "procedure", "jurisdiction", master.courtPath, master.stage],
      }),
    );
  }

  for (const risk of master.risks) {
    signals.push(
      buildSignal({
        input,
        signalType: "master-case-schema",
        severity: normalizeSeverity(risk.severity),
        title: risk.title,
        explanation: risk.explanation,
        route:
          risk.source === "procedure" ||
          risk.source === "forms" ||
          risk.source === "limitations"
            ? "/case-dashboard"
            : "/litigation-strategy",
        topics: unique([risk.title, risk.explanation, risk.suggestedFix, risk.source]),
        domains: domainFromCourtPath(master.courtPath),
        sourceIds: [risk.id],
      }),
    );
  }

  for (const concern of master.judicialConcerns) {
    signals.push(
      buildSignal({
        input,
        signalType: "master-case-schema",
        severity: normalizeSeverity(concern.severity),
        title: "Authority support for judicial concern",
        explanation: concern.concern,
        route: "/litigation-strategy",
        topics: unique([
          "judge reasoning",
          concern.concern,
          concern.whyCourtMayCare,
          concern.howToAddress,
        ]),
        sourceIds: [concern.id],
      }),
    );
  }

  return signals;
}

function signalsFromAuthorityAnalysis(input: AuthorityCaseSystemBridgeInput): AuthorityCaseSystemSignal[] {
  const analysis = input.masterCase?.authorityAnalysis;
  if (!analysis) return [];

  const signals: AuthorityCaseSystemSignal[] = [];

  if (analysis.unsafeAuthorityIds.length > 0) {
    signals.push(
      buildSignal({
        input,
        signalType: "authority-analysis",
        severity: "high",
        title: "Unsafe authorities require replacement",
        explanation: analysis.summary,
        route: "/legal-principles",
        topics: unique([
          "unsafe authority",
          "citation safety",
          "authority verification",
          ...analysis.unsafeAuthorityIds,
          ...analysis.warnings,
        ]),
      }),
    );
  }

  if (analysis.wrongJurisdictionAuthorityIds.length > 0) {
    signals.push(
      buildSignal({
        input,
        signalType: "authority-analysis",
        severity: "high",
        title: "Wrong-jurisdiction authorities require review",
        explanation:
          "MasterCaseSchema authority analysis found authorities that may not fit the current jurisdiction.",
        route: "/legal-principles",
        topics: unique([
          "jurisdiction fit",
          "binding authority",
          "Ontario authority",
          ...analysis.wrongJurisdictionAuthorityIds,
        ]),
      }),
    );
  }

  for (const warning of analysis.warnings) {
    signals.push(
      buildSignal({
        input,
        signalType: "authority-analysis",
        severity: lower(warning).includes("unsafe") ? "high" : "medium",
        title: "Authority analysis warning",
        explanation: warning,
        route: "/legal-principles",
        topics: ["authority analysis", "citation safety", warning],
      }),
    );
  }

  return signals;
}

function signalsFromProofAnalysis(input: AuthorityCaseSystemBridgeInput): AuthorityCaseSystemSignal[] {
  const proof = input.masterCase?.proofAnalysis;
  if (!proof) return [];

  return proof.claimProofMaps
    .filter(
      (map) =>
        input.includeNonBlockingSignals ||
        map.overallProofStrength === "low" ||
        map.overallProofStrength === "very-low" ||
        map.missingEvidence.length > 0 ||
        map.weakestElements.length > 0,
    )
    .map((map) =>
      buildSignal({
        input,
        signalType: "proof-analysis",
        severity:
          map.overallProofStrength === "very-low" ||
          map.overallProofStrength === "low"
            ? "high"
            : "medium",
        title: `Authority support for proof map: ${map.claimTitle}`,
        explanation: unique([
          `Claim: ${map.claimTitle}`,
          `Proof strength: ${map.overallProofStrength}`,
          ...map.weakestElements,
          ...map.missingEvidence,
          ...map.nextActions,
        ]).join(". "),
        route: "/litigation-strategy",
        topics: unique([
          "burden of proof",
          "legal elements",
          map.claimTitle,
          map.claimDomain,
          ...map.weakestElements,
          ...map.missingEvidence,
          ...map.judgeConcerns,
          ...map.opposingArguments,
        ]),
        domains: [normalizeLegalDomain(map.claimDomain)],
        sourceIds: [map.id],
      }),
    );
}

function signalsFromContradictions(input: AuthorityCaseSystemBridgeInput): AuthorityCaseSystemSignal[] {
  const contradictions = input.masterCase?.contradictionAnalysis;
  if (!contradictions) return [];

  return contradictions.findings.map((finding) =>
    buildSignal({
      input,
      signalType: "contradiction-analysis",
      severity:
        finding.severity === "critical"
          ? "critical"
          : finding.severity === "high"
            ? "high"
            : "medium",
      title: `Contradiction: ${finding.category}`,
      explanation: finding.explanation,
      route: "/litigation-strategy",
      topics: unique([
        "contradiction",
        finding.category,
        finding.explanation,
        finding.whyItMatters,
        finding.judicialConcern,
        finding.litigationRisk,
      ]),
      sourceIds: [finding.id],
    }),
  );
}

function signalsFromCredibility(input: AuthorityCaseSystemBridgeInput): AuthorityCaseSystemSignal[] {
  const credibility = input.masterCase?.credibilityAnalysis;
  if (!credibility) return [];

  return credibility.findings.map((finding) =>
    buildSignal({
      input,
      signalType: "credibility-analysis",
      severity: normalizeSeverity(finding.level),
      title: finding.title,
      explanation: finding.explanation,
      route: "/litigation-strategy",
      topics: unique([
        "credibility",
        finding.category,
        finding.title,
        finding.explanation,
        finding.judgeConcern,
        finding.opposingCounselUse,
        finding.recommendedFix,
      ]),
      sourceIds: [finding.id],
    }),
  );
}

function signalsFromDocuments(input: AuthorityCaseSystemBridgeInput): AuthorityCaseSystemSignal[] {
  const master = input.masterCase;
  if (!master) return [];

  return master.documents
    .filter(
      (document) =>
        input.includeNonBlockingSignals ||
        document.status === "review-needed" ||
        document.warnings.length > 0,
    )
    .map((document) =>
      buildSignal({
        input,
        signalType: "document-readiness",
        severity:
          document.status === "review-needed" || document.warnings.length > 0
            ? "high"
            : "medium",
        title: `Authority support for document: ${document.title}`,
        explanation:
          document.warnings.length > 0
            ? document.warnings.join(" ")
            : `Document ${document.title} requires authority-safe review before court-facing use.`,
        route:
          document.type === "trial-material"
            ? "/trial-package"
            : document.type === "conference-brief" ||
                document.type === "settlement-material"
              ? "/settlement-conference"
              : "/documents",
        topics: unique([
          "document readiness",
          document.title,
          document.type,
          document.status,
          ...document.warnings,
          ...document.notes,
        ]),
        sourceIds: [document.id],
      }),
    );
}

function buildSignals(input: AuthorityCaseSystemBridgeInput): AuthorityCaseSystemSignal[] {
  const signals = [
    ...signalsFromMasterCase(input),
    ...signalsFromAuthorityAnalysis(input),
    ...signalsFromProofAnalysis(input),
    ...signalsFromContradictions(input),
    ...signalsFromCredibility(input),
    ...signalsFromDocuments(input),
  ];

  const byKey = new Map<string, AuthorityCaseSystemSignal>();

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
    .slice(0, input.maxRequests || 25);
}

function buildDiagnostics(
  input: AuthorityCaseSystemBridgeInput,
  signals: AuthorityCaseSystemSignal[],
  directIntegrations: AuthorityIntegrationHubResult[],
  brainBridge?: AuthorityBrainBridgeResult,
  workflowBridge?: AuthorityWorkflowBridgeResult,
): AuthorityCaseSystemBridgeDiagnostic[] {
  const diagnostics: AuthorityCaseSystemBridgeDiagnostic[] = [];

  if (!input.masterCase && !input.brainOutput && !input.workflowModel) {
    diagnostics.push({
      code: "AUTH_CASE_SYSTEM_NO_INPUT",
      severity: "critical",
      message:
        "AuthorityCaseSystemBridge requires MasterCaseSchema, CourtSimplifiedBrainOutput, or WorkflowOrchestrationModel.",
    });
  }

  if (!signals.length && !brainBridge && !workflowBridge) {
    diagnostics.push({
      code: "AUTH_CASE_SYSTEM_NO_SIGNALS",
      severity: "info",
      message:
        "Case system did not produce direct authority signals requiring routing.",
    });
  }

  if (input.masterCase?.courtPath === "unknown") {
    diagnostics.push({
      code: "AUTH_CASE_SYSTEM_UNKNOWN_COURT_PATH",
      severity: "medium",
      message: "MasterCaseSchema court path is unknown.",
    });
  }

  if (input.masterCase?.stage === "not-sure") {
    diagnostics.push({
      code: "AUTH_CASE_SYSTEM_UNKNOWN_STAGE",
      severity: "medium",
      message: "MasterCaseSchema procedural stage is not confirmed.",
    });
  }

  for (const integration of directIntegrations) {
    if (integration.status === "blocked") {
      diagnostics.push({
        code: "AUTH_CASE_SYSTEM_DIRECT_INTEGRATION_BLOCKED",
        severity: "high",
        message: `Direct authority integration is blocked for ${integration.consumer}.`,
        detail: integration.warnings.join(" "),
      });
    }
  }

  if (brainBridge?.status === "blocked") {
    diagnostics.push({
      code: "AUTH_CASE_SYSTEM_BRAIN_BRIDGE_BLOCKED",
      severity: "high",
      message: "AuthorityBrainBridge is blocked.",
      detail: brainBridge.warnings.join(" "),
    });
  }

  if (workflowBridge?.status === "blocked") {
    diagnostics.push({
      code: "AUTH_CASE_SYSTEM_WORKFLOW_BRIDGE_BLOCKED",
      severity: "high",
      message: "AuthorityWorkflowBridge is blocked.",
      detail: workflowBridge.warnings.join(" "),
    });
  }

  return diagnostics;
}

function determineStatus(
  diagnostics: AuthorityCaseSystemBridgeDiagnostic[],
  directIntegrations: AuthorityIntegrationHubResult[],
  brainBridge?: AuthorityBrainBridgeResult,
  workflowBridge?: AuthorityWorkflowBridgeResult,
): AuthorityCaseSystemBridgeStatus {
  if (diagnostics.some((diagnostic) => diagnostic.severity === "critical")) {
    return "blocked";
  }

  if (
    directIntegrations.some((integration) => integration.status === "blocked") ||
    brainBridge?.status === "blocked" ||
    workflowBridge?.status === "blocked"
  ) {
    return "blocked";
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "high")) {
    return "needs-review";
  }

  if (
    directIntegrations.some((integration) => integration.status !== "ready") ||
    (brainBridge && brainBridge.status !== "ready") ||
    (workflowBridge && workflowBridge.status !== "ready")
  ) {
    return "partial";
  }

  return "ready";
}

function buildSummary(args: {
  caseContext: AuthorityNavigatorCaseContext;
  signals: AuthorityCaseSystemSignal[];
  directIntegrations: AuthorityIntegrationHubResult[];
  brainBridge?: AuthorityBrainBridgeResult;
  workflowBridge?: AuthorityWorkflowBridgeResult;
}): AuthorityCaseSystemBridgeResult["authorityCaseSystemSummary"] {
  const integrations = [
    ...args.directIntegrations,
    ...(args.brainBridge?.integrations || []),
    ...(args.workflowBridge?.integrations || []),
  ];

  return {
    courtPath: clean(args.caseContext.courtPath || "unknown"),
    province: clean(args.caseContext.province || "Ontario"),
    stage: clean(args.caseContext.stage || "not-sure"),
    recommendedRoute: args.caseContext.workflowRoute,
    totalSignals: args.signals.length,
    blockingSignals: args.signals.filter(
      (signal) =>
        severityRank(signal.severity) >= 4 ||
        signal.requiresCitationSafety ||
        isCourtFacingRoute(signal.route),
    ).length,
    directIntegrationCount: args.directIntegrations.length,
    brainBridgeConnected: Boolean(args.brainBridge),
    workflowBridgeConnected: Boolean(args.workflowBridge),
    citationReady: integrations.some(
      (integration) => integration.integrationSummary.citationReady,
    ),
    annualPracticeReady: integrations.some(
      (integration) => integration.integrationSummary.annualPracticeReady,
    ),
    canliiReady: integrations.some(
      (integration) => integration.integrationSummary.canliiReady,
    ),
    courtFacingAuthorityBlocked:
      args.signals.some(
        (signal) => isCourtFacingRoute(signal.route) && severityRank(signal.severity) >= 4,
      ) ||
      Boolean(args.brainBridge?.authorityBrainSummary.courtFacingAuthorityBlocked) ||
      Boolean(args.workflowBridge?.workflowAuthoritySummary.courtFacingBlocked),
  };
}

function buildNextActions(
  result: Pick<
    AuthorityCaseSystemBridgeResult,
    | "status"
    | "signals"
    | "directIntegrations"
    | "brainBridge"
    | "workflowBridge"
    | "authorityCaseSystemSummary"
  >,
): string[] {
  const actions: string[] = [];

  if (result.status === "blocked" || result.status === "needs-review") {
    actions.push(
      "Resolve Authority Case System Bridge warnings before treating the case system as authority-ready.",
    );
  }

  if (result.authorityCaseSystemSummary.courtFacingAuthorityBlocked) {
    actions.push(
      "Do not treat forms, documents, court packages, settlement materials, or trial packages as authority-ready until citation, jurisdiction, and procedural authority checks pass.",
    );
  }

  if (result.signals.some((signal) => signal.requiresAnnualPractice)) {
    actions.push(
      "Use Annual Practice hooks for procedural case-system signals before final workflow or court-package output.",
    );
  }

  if (result.signals.some((signal) => signal.requiresCanlii)) {
    actions.push(
      "Use CanLII hooks for case-law verification and citation enrichment when live lookup is available.",
    );
  }

  actions.push(
    "Keep CaseSystemAssembly connected to authorities only through Authority Intelligence bridges; do not hard-code authority lookup into unrelated subsystems.",
  );

  for (const integration of result.directIntegrations) {
    actions.push(...integration.nextActions);
  }

  if (result.brainBridge) {
    actions.push(...result.brainBridge.nextActions);
  }

  if (result.workflowBridge) {
    actions.push(...result.workflowBridge.nextActions);
  }

  return unique(actions).slice(0, 30);
}

export function buildAuthorityCaseSystemBridge(
  input: AuthorityCaseSystemBridgeInput,
): AuthorityCaseSystemBridgeResult {
  const caseContext = buildCaseContext(input);
  const signals = buildSignals(input);
  const hub = createAuthorityIntegrationHub(input.adapters);
  const fallbackConsumer = input.consumer || "case-system-assembly";

  const directIntegrations = signals.map((signal) =>
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
      sourceSystem: "AuthorityCaseSystemBridge",
      workflowRoute: signal.route,
      brainMigrationContext: input.brainMigrationContext,
      caseSystemAssemblyContext: input.caseSystemAssemblyContext || input.masterCase,
      litigationReasoningContext: input.litigationReasoningContext,
      aiCasePartnerContext: input.aiCasePartnerContext,
      extensionData: {
        ...(input.extensionData || {}),
        authorityCaseSystemSignalId: signal.id,
        authorityCaseSystemSignalType: signal.signalType,
      },
    }),
  );

  const brainBridge = input.brainOutput
    ? buildAuthorityBrainBridge({
        brainOutput: input.brainOutput,
        adapters: input.adapters,
        consumer: "brain-migration-layer",
        includeNonBlockingSignals: input.includeNonBlockingSignals,
        brainMigrationContext: input.brainMigrationContext,
        caseSystemAssemblyContext: input.caseSystemAssemblyContext || input.masterCase,
        aiCasePartnerContext: input.aiCasePartnerContext,
        extensionData: {
          ...(input.extensionData || {}),
          parentBridge: "AuthorityCaseSystemBridge",
        },
      })
    : undefined;

  const workflowBridge = input.workflowModel
    ? buildAuthorityWorkflowBridge({
        workflow: input.workflowModel,
        caseContext,
        litigationReasoning: input.litigationReasoningContext as never,
        adapters: input.adapters,
        includeNonBlockingSignals: input.includeNonBlockingSignals,
        maxRequests: input.maxRequests,
        extensionData: {
          ...(input.extensionData || {}),
          parentBridge: "AuthorityCaseSystemBridge",
        },
      })
    : undefined;

  const diagnostics = buildDiagnostics(
    input,
    signals,
    directIntegrations,
    brainBridge,
    workflowBridge,
  );

  const status = determineStatus(
    diagnostics,
    directIntegrations,
    brainBridge,
    workflowBridge,
  );

  const authorityCaseSystemSummary = buildSummary({
    caseContext,
    signals,
    directIntegrations,
    brainBridge,
    workflowBridge,
  });

  const partial = {
    status,
    signals,
    directIntegrations,
    brainBridge,
    workflowBridge,
    authorityCaseSystemSummary,
  };

  return {
    version: VERSION,
    generatedAt: nowIso(),
    status,
    caseId: caseContext.caseId,
    caseContext,
    signals,
    directIntegrations,
    brainBridge,
    workflowBridge,
    diagnostics,
    warnings: unique([
      ...(input.masterCase?.systemWarnings || []),
      ...(input.brainOutput?.intelligence.systemWarnings || []),
      ...(input.workflowModel?.warnings || []),
      ...diagnostics
        .filter((diagnostic) => severityRank(diagnostic.severity) >= 3)
        .map((diagnostic) => diagnostic.message),
      ...directIntegrations.flatMap((integration) => integration.warnings),
      ...(brainBridge?.warnings || []),
      ...(workflowBridge?.warnings || []),
    ]),
    authorityCaseSystemSummary,
    nextActions: buildNextActions(partial),
    extensionData: input.extensionData || {},
  };
}

export function getBlockingAuthorityCaseSystemSignals(
  result: AuthorityCaseSystemBridgeResult,
): AuthorityCaseSystemSignal[] {
  return result.signals.filter(
    (signal) =>
      severityRank(signal.severity) >= 4 ||
      signal.requiresCitationSafety ||
      isCourtFacingRoute(signal.route),
  );
}

export function isCaseSystemAuthorityReady(
  result: AuthorityCaseSystemBridgeResult,
): boolean {
  return (
    result.status === "ready" &&
    !result.authorityCaseSystemSummary.courtFacingAuthorityBlocked &&
    result.directIntegrations.every((integration) => integration.status === "ready") &&
    (!result.brainBridge || result.brainBridge.status === "ready") &&
    (!result.workflowBridge || result.workflowBridge.status === "ready")
  );
}

export function getAuthorityCaseSystemSignalsForRoute(
  result: AuthorityCaseSystemBridgeResult,
  route: string,
): AuthorityCaseSystemSignal[] {
  return result.signals.filter((signal) => signal.route === route);
}

export const authorityCaseSystemBridge = {
  build: buildAuthorityCaseSystemBridge,
  getBlockingSignals: getBlockingAuthorityCaseSystemSignals,
  isReady: isCaseSystemAuthorityReady,
  getSignalsForRoute: getAuthorityCaseSystemSignalsForRoute,
};