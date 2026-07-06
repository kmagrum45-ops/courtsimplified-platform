// src/lib/case-system/authority-intelligence/authorityWorkflowBridge.ts

import type {
  WorkflowBlockerType,
  WorkflowGateType,
  WorkflowOrchestrationModel,
  WorkflowReadinessState,
  WorkflowRoute,
} from "../workflow/workflowOrchestrationArchitecture";

import type { LitigationReasoningResult } from "../litigation-intelligence/litigationReasoningEngine";

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

export type AuthorityWorkflowBridgeVersion = "1.0.0";

export type AuthorityWorkflowBridgeStatus =
  | "ready"
  | "partial"
  | "blocked"
  | "needs-review";

export type AuthorityWorkflowBridgeSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type AuthorityWorkflowTrigger =
  | "workflow-gate"
  | "workflow-blocker"
  | "workflow-next-action"
  | "workflow-readiness"
  | "recommended-route"
  | "litigation-reasoning"
  | "citation-safety"
  | "jurisdiction-fit"
  | "annual-practice";

export interface AuthorityWorkflowBridgeInput {
  workflow: WorkflowOrchestrationModel;
  caseContext?: AuthorityNavigatorCaseContext;
  litigationReasoning?: LitigationReasoningResult;
  adapters?: AuthorityNavigatorAdapters;
  maxRequests?: number;
  includeNonBlockingSignals?: boolean;
  extensionData?: Record<string, unknown>;
}

export interface AuthorityWorkflowAuthorityNeed {
  id: string;
  trigger: AuthorityWorkflowTrigger;
  severity: AuthorityWorkflowBridgeSeverity;
  title: string;
  explanation: string;
  route: WorkflowRoute;
  topics: string[];
  domains: string[];
  proceduralStage?: string;
  blockerIds: string[];
  gateIds: string[];
  actionIds: string[];
  requiresAnnualPractice: boolean;
  requiresCanlii: boolean;
  requiresCitationSafety: boolean;
  request: AuthorityNavigatorRequest;
}

export interface AuthorityWorkflowBridgeDiagnostic {
  code: string;
  severity: AuthorityWorkflowBridgeSeverity;
  message: string;
  detail?: string;
}

export interface AuthorityWorkflowBridgeResult {
  version: AuthorityWorkflowBridgeVersion;
  generatedAt: string;
  status: AuthorityWorkflowBridgeStatus;
  workflowId: string;
  caseId?: string;
  authorityNeeds: AuthorityWorkflowAuthorityNeed[];
  integrations: AuthorityIntegrationHubResult[];
  diagnostics: AuthorityWorkflowBridgeDiagnostic[];
  warnings: string[];
  workflowAuthoritySummary: {
    recommendedRoute?: WorkflowRoute;
    authorityReadiness?: string;
    citationReadiness?: string;
    jurisdictionReadiness?: string;
    proceduralReadiness?: string;
    totalNeeds: number;
    blockingNeeds: number;
    courtFacingBlocked: boolean;
  };
  nextActions: string[];
  extensionData: Record<string, unknown>;
}

const VERSION: AuthorityWorkflowBridgeVersion = "1.0.0";

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

function unique(values: unknown[]): string[] {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function severityRank(severity: AuthorityWorkflowBridgeSeverity): number {
  const ranks: Record<AuthorityWorkflowBridgeSeverity, number> = {
    info: 1,
    low: 2,
    medium: 3,
    high: 4,
    critical: 5,
  };

  return ranks[severity] || 1;
}

function normalizeSeverity(value: unknown): AuthorityWorkflowBridgeSeverity {
  const text = clean(value).toLowerCase();

  if (text === "critical") return "critical";
  if (text === "high") return "high";
  if (text === "medium" || text === "moderate") return "medium";
  if (text === "low") return "low";

  return "info";
}

function isCourtFacingRoute(route: WorkflowRoute): boolean {
  return [
    "/documents",
    "/forms",
    "/court-package",
    "/settlement-conference",
    "/trial-package",
    "/generated-documents",
  ].includes(route);
}

function consumerForRoute(route: WorkflowRoute): AuthorityIntegrationConsumer {
  if (route === "/legal-principles") return "legal-principles";
  if (route === "/litigation-strategy") return "litigation-strategy";
  if (route === "/court-package") return "court-package";
  if (route === "/trial-package") return "trial-package";
  if (route === "/settlement-conference") return "litigation-strategy";
  if (route === "/builder") return "ai-case-partner";
  if (route === "/case-dashboard") return "workflow";

  return "workflow";
}

function topicFromGateType(gateType: WorkflowGateType): string[] {
  const map: Partial<Record<WorkflowGateType, string[]>> = {
    "court-path": ["court path", "jurisdiction", "forum"],
    stage: ["procedural stage", "litigation stage"],
    claims: ["claim theory", "cause of action", "legal elements"],
    procedure: ["procedure", "deadlines", "service", "filing"],
    evidence: ["evidence", "admissibility", "proof"],
    proof: ["burden of proof", "legal elements", "proof gaps"],
    timeline: ["limitations", "chronology", "procedural timing"],
    damages: ["damages", "remedies", "causation"],
    credibility: ["credibility", "judge concerns"],
    authority: ["legal authority", "case law", "statutes"],
    contradictions: ["contradictions", "inconsistent evidence"],
    knowledge: ["legal knowledge", "authority verification"],
    "legal-reasoning": ["legal reasoning", "judge reasoning", "burden"],
    forms: ["forms", "court forms", "filing requirements"],
    documents: ["court documents", "drafting requirements"],
    "human-review": ["human review", "legal review"],
    unknown: ["authority review"],
  };

  return map[gateType] || ["authority review"];
}

function topicFromBlockerType(blockerType: WorkflowBlockerType): string[] {
  const map: Partial<Record<WorkflowBlockerType, string[]>> = {
    "missing-court-path": ["court path", "jurisdiction", "forum"],
    "missing-stage": ["procedural stage", "litigation stage"],
    "missing-claim-theory": ["claim theory", "cause of action", "legal elements"],
    "missing-evidence": ["evidence", "proof", "admissibility"],
    "missing-proof-analysis": ["burden of proof", "legal elements", "proof gaps"],
    "proof-risk": ["burden of proof", "proof risk", "legal elements"],
    "missing-timeline": ["limitations", "timeline", "chronology"],
    "missing-damages-proof": ["damages", "remedies", "causation"],
    "procedural-risk": ["procedure", "rules of court", "procedural compliance"],
    "procedural-deadline-risk": ["deadlines", "extensions", "procedural timing"],
    "procedural-compliance-risk": ["service", "filing", "procedural compliance"],
    "procedural-motion-risk": ["motions", "motion materials", "urgent relief"],
    "procedural-discovery-risk": ["discovery", "disclosure", "undertakings"],
    "procedural-settlement-risk": ["settlement conference", "offers", "costs"],
    "procedural-trial-risk": ["trial readiness", "pre-trial", "trial documents"],
    "credibility-risk": ["credibility", "judge concerns"],
    "legal-authority-risk": ["legal authority", "case law", "statutes"],
    "citation-safety-risk": ["citation safety", "authority verification"],
    "wrong-jurisdiction-authority": ["jurisdiction fit", "binding authority"],
    "contradiction-risk": ["contradictions", "inconsistent evidence"],
    "legal-reasoning-risk": ["legal reasoning", "judge reasoning"],
    "form-risk": ["court forms", "form requirements"],
    "document-risk": ["court documents", "drafting requirements"],
    unknown: ["authority review"],
  };

  return map[blockerType] || ["authority review"];
}

function domainFromWorkflow(workflow: WorkflowOrchestrationModel): string[] {
  const courtPath = clean(workflow.courtPath).toLowerCase();
  const domains: string[] = [];

  if (courtPath === "small-claims") domains.push("small-claims");
  if (courtPath === "civil") domains.push("civil-procedure");
  if (courtPath === "family") domains.push("family-law");
  if (courtPath === "tribunal" || courtPath === "ltb") {
    domains.push("administrative-law");
  }
  if (courtPath === "immigration") domains.push("administrative-law");
  if (courtPath === "criminal-related") domains.push("criminal");

  if (!domains.length) domains.push("civil-procedure");

  return unique(domains);
}

function requiresAnnualPractice(topics: string[], route: WorkflowRoute): boolean {
  const text = topics.join(" ").toLowerCase();

  return (
    isCourtFacingRoute(route) ||
    text.includes("procedure") ||
    text.includes("deadline") ||
    text.includes("service") ||
    text.includes("filing") ||
    text.includes("motion") ||
    text.includes("discovery") ||
    text.includes("trial") ||
    text.includes("forms")
  );
}

function requiresCanlii(topics: string[], route: WorkflowRoute): boolean {
  const text = topics.join(" ").toLowerCase();

  return (
    route === "/legal-principles" ||
    route === "/litigation-strategy" ||
    route === "/court-package" ||
    route === "/trial-package" ||
    text.includes("case law") ||
    text.includes("authority") ||
    text.includes("binding") ||
    text.includes("judge")
  );
}

function buildCaseContext(
  input: AuthorityWorkflowBridgeInput,
): AuthorityNavigatorCaseContext {
  return {
    ...(input.caseContext || {}),
    caseId: input.caseContext?.caseId || input.workflow.caseId,
    courtPath: input.caseContext?.courtPath || input.workflow.courtPath,
    province: input.caseContext?.province || input.workflow.province,
    jurisdiction:
      input.caseContext?.jurisdiction || input.workflow.province || "Ontario",
    stage: input.caseContext?.stage || input.workflow.stage,
    workflowRoute:
      input.caseContext?.workflowRoute ||
      input.workflow.readiness.recommendedRoute,
    workflowBlockers: unique([
      ...(input.caseContext?.workflowBlockers || []),
      ...input.workflow.blockers.map((blocker) => blocker.title),
    ]),
    legalDomains: unique([
      ...(input.caseContext?.legalDomains || []),
      ...domainFromWorkflow(input.workflow),
    ]),
    litigationReasoning:
      input.caseContext?.litigationReasoning || input.litigationReasoning,
  };
}

function buildNeed(args: {
  input: AuthorityWorkflowBridgeInput;
  trigger: AuthorityWorkflowTrigger;
  severity: AuthorityWorkflowBridgeSeverity;
  title: string;
  explanation: string;
  route: WorkflowRoute;
  topics: string[];
  domains?: string[];
  blockerIds?: string[];
  gateIds?: string[];
  actionIds?: string[];
}): AuthorityWorkflowAuthorityNeed {
  const caseContext = buildCaseContext(args.input);
  const topics = unique(args.topics);
  const domains = unique([
    ...(args.domains || []),
    ...domainFromWorkflow(args.input.workflow),
  ]);

  const requiresCitationSafety =
    isCourtFacingRoute(args.route) ||
    topics.some((topic) =>
      ["citation", "authority", "case law", "binding"].some((needle) =>
        topic.toLowerCase().includes(needle),
      ),
    );

  const request: AuthorityNavigatorRequest = {
    purpose:
      args.route === "/trial-package"
        ? "trial-package"
        : args.route === "/court-package"
          ? "court-package"
          : args.route === "/litigation-strategy"
            ? "litigation-strategy"
            : args.route === "/legal-principles"
              ? "legal-principles"
              : "workflow",
    query: unique([args.title, ...topics]).join(" "),
    topics,
    courtPath: args.input.workflow.courtPath,
    jurisdiction: args.input.workflow.province,
    province: args.input.workflow.province,
    stage: args.input.workflow.stage,
    legalDomains: domains,
    requireVerified: true,
    includeNeedsReview: false,
    maxAuthorities: isCourtFacingRoute(args.route) ? 15 : 8,
    caseContext,
    explanationMode: "detailed",
    citationMode: requiresCitationSafety ? "safe" : "none",
    annualPracticeMode: requiresAnnualPractice(topics, args.route)
      ? "hooks-only"
      : "off",
    canliiMode: requiresCanlii(topics, args.route) ? "hooks-only" : "off",
    cacheMode: "read-write",
    extensionData: {
      workflowBridgeTrigger: args.trigger,
      workflowRoute: args.route,
      workflowId: args.input.workflow.id,
    },
  };

  return {
    id: createId("authority_workflow_need"),
    trigger: args.trigger,
    severity: args.severity,
    title: args.title,
    explanation: args.explanation,
    route: args.route,
    topics,
    domains,
    proceduralStage: clean(args.input.workflow.stage),
    blockerIds: args.blockerIds || [],
    gateIds: args.gateIds || [],
    actionIds: args.actionIds || [],
    requiresAnnualPractice: request.annualPracticeMode !== "off",
    requiresCanlii: request.canliiMode !== "off",
    requiresCitationSafety,
    request,
  };
}

function needsFromBlockedGates(
  input: AuthorityWorkflowBridgeInput,
): AuthorityWorkflowAuthorityNeed[] {
  return input.workflow.gates
    .filter((gate) => gate.status === "blocked" || gate.status === "open")
    .flatMap((gate) =>
      gate.requiredBeforeRoutes.map((route) =>
        buildNeed({
          input,
          trigger: "workflow-gate",
          severity: normalizeSeverity(gate.severity),
          title: gate.title,
          explanation: gate.explanation,
          route,
          topics: unique([
            ...topicFromGateType(gate.gateType),
            gate.title,
            gate.suggestedFix,
          ]),
          gateIds: [gate.id],
        }),
      ),
    );
}

function needsFromBlockers(
  input: AuthorityWorkflowBridgeInput,
): AuthorityWorkflowAuthorityNeed[] {
  return input.workflow.blockers.flatMap((blocker) =>
    blocker.affectedRoutes.map((route) =>
      buildNeed({
        input,
        trigger: "workflow-blocker",
        severity: normalizeSeverity(blocker.severity),
        title: blocker.title,
        explanation: blocker.explanation,
        route,
        topics: unique([
          ...topicFromBlockerType(blocker.blockerType),
          blocker.title,
          blocker.suggestedFix,
        ]),
        blockerIds: [blocker.id],
      }),
    ),
  );
}

function needsFromNextActions(
  input: AuthorityWorkflowBridgeInput,
): AuthorityWorkflowAuthorityNeed[] {
  return input.workflow.nextActions
    .filter(
      (action) =>
        input.includeNonBlockingSignals ||
        action.kind === "review-authorities" ||
        action.kind === "review-citation-safety" ||
        action.kind === "review-jurisdiction-fit" ||
        action.kind === "review-procedure" ||
        action.kind === "review-legal-reasoning" ||
        isCourtFacingRoute(action.route),
    )
    .map((action) =>
      buildNeed({
        input,
        trigger: "workflow-next-action",
        severity: normalizeSeverity(action.priority),
        title: action.title,
        explanation: action.explanation,
        route: action.route,
        topics: unique([action.kind, action.title, action.explanation]),
        actionIds: [action.id],
      }),
    );
}

function needsFromReadiness(
  input: AuthorityWorkflowBridgeInput,
): AuthorityWorkflowAuthorityNeed[] {
  const readiness: WorkflowReadinessState = input.workflow.readiness;
  const needs: AuthorityWorkflowAuthorityNeed[] = [];

  if (
    readiness.authorityReadiness === "low" ||
    readiness.authorityReadiness === "very-low"
  ) {
    needs.push(
      buildNeed({
        input,
        trigger: "workflow-readiness",
        severity: "high",
        title: "Authority readiness is low",
        explanation:
          "Workflow reports low authority readiness. Verified authorities should be retrieved before court-facing output.",
        route: "/legal-principles",
        topics: ["authority readiness", "verified authorities", "legal principles"],
      }),
    );
  }

  if (
    readiness.citationReadiness === "low" ||
    readiness.citationReadiness === "very-low"
  ) {
    needs.push(
      buildNeed({
        input,
        trigger: "citation-safety",
        severity: "high",
        title: "Citation readiness is low",
        explanation:
          "Workflow reports low citation readiness. Citation safety must be checked before documents, court packages, or trial packages rely on authorities.",
        route: "/legal-principles",
        topics: ["citation safety", "authority verification", "safe citation"],
      }),
    );
  }

  if (
    readiness.jurisdictionReadiness === "low" ||
    readiness.jurisdictionReadiness === "very-low"
  ) {
    needs.push(
      buildNeed({
        input,
        trigger: "jurisdiction-fit",
        severity: "high",
        title: "Jurisdiction fit needs review",
        explanation:
          "Workflow reports low jurisdiction readiness. Authorities should be checked for Ontario and court-path fit.",
        route: "/legal-principles",
        topics: ["jurisdiction fit", "binding authority", "Ontario authority"],
      }),
    );
  }

  if (
    readiness.procedureReadiness === "low" ||
    readiness.procedureReadiness === "very-low" ||
    readiness.proceduralDeadlineReadiness === "low" ||
    readiness.proceduralDeadlineReadiness === "very-low" ||
    readiness.proceduralComplianceReadiness === "low" ||
    readiness.proceduralComplianceReadiness === "very-low"
  ) {
    needs.push(
      buildNeed({
        input,
        trigger: "annual-practice",
        severity: "high",
        title: "Procedural authority needed",
        explanation:
          "Workflow reports low procedural readiness. Annual Practice hooks should support procedure, deadlines, service, filing, and compliance routing.",
        route: "/case-dashboard",
        topics: ["procedure", "deadlines", "service", "filing", "Annual Practice"],
      }),
    );
  }

  return needs;
}

function needsFromRecommendedRoute(
  input: AuthorityWorkflowBridgeInput,
): AuthorityWorkflowAuthorityNeed[] {
  const route = input.workflow.readiness.recommendedRoute;

  if (!route) return [];

  if (
    route === "/legal-principles" ||
    route === "/litigation-strategy" ||
    route === "/court-package" ||
    route === "/trial-package" ||
    route === "/settlement-conference"
  ) {
    return [
      buildNeed({
        input,
        trigger: "recommended-route",
        severity: isCourtFacingRoute(route) ? "high" : "medium",
        title: `Authority support for recommended route ${route}`,
        explanation:
          "Workflow recommended this route. Authority Intelligence should prepare verified authority support before the UI relies on it.",
        route,
        topics: unique([
          "recommended workflow route",
          route,
          ...(input.workflow.warnings || []),
        ]),
      }),
    ];
  }

  return [];
}

function needsFromLitigationReasoning(
  input: AuthorityWorkflowBridgeInput,
): AuthorityWorkflowAuthorityNeed[] {
  const reasoning = input.litigationReasoning;

  if (!reasoning) return [];

  const needs: AuthorityWorkflowAuthorityNeed[] = [];

  for (const finding of reasoning.findings || []) {
    const title = clean(finding.title).toLowerCase();
    const explanation = clean(finding.explanation).toLowerCase();
    const recommendedAction = clean(finding.recommendedAction).toLowerCase();
    const severity = normalizeSeverity(finding.severity);

    if (
      title.includes("authority") ||
      explanation.includes("authority") ||
      recommendedAction.includes("authority") ||
      severity === "high" ||
      severity === "critical"
    ) {
      needs.push(
        buildNeed({
          input,
          trigger: "litigation-reasoning",
          severity,
          title: finding.title,
          explanation: finding.explanation,
          route: "/litigation-strategy",
          topics: unique([
            finding.title,
            finding.whyItMatters,
            finding.recommendedAction,
          ]),
        }),
      );
    }
  }

  for (const concern of reasoning.judicialConcerns || []) {
    needs.push(
      buildNeed({
        input,
        trigger: "litigation-reasoning",
        severity: "medium",
        title: "Authority support for judicial concern",
        explanation: concern,
        route: "/litigation-strategy",
        topics: ["judge reasoning", "judicial concern", concern],
      }),
    );
  }

  return needs;
}

function dedupeNeeds(
  needs: AuthorityWorkflowAuthorityNeed[],
  maxRequests: number,
): AuthorityWorkflowAuthorityNeed[] {
  const byKey = new Map<string, AuthorityWorkflowAuthorityNeed>();

  for (const need of needs) {
    const key = [
      need.trigger,
      need.route,
      need.title.toLowerCase(),
      need.topics.slice(0, 4).join("|").toLowerCase(),
    ].join("::");

    const existing = byKey.get(key);

    if (!existing || severityRank(need.severity) > severityRank(existing.severity)) {
      byKey.set(key, need);
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

function buildAuthorityNeeds(
  input: AuthorityWorkflowBridgeInput,
): AuthorityWorkflowAuthorityNeed[] {
  return dedupeNeeds(
    [
      ...needsFromBlockedGates(input),
      ...needsFromBlockers(input),
      ...needsFromNextActions(input),
      ...needsFromReadiness(input),
      ...needsFromRecommendedRoute(input),
      ...needsFromLitigationReasoning(input),
    ],
    input.maxRequests || 20,
  );
}

function buildDiagnostics(
  input: AuthorityWorkflowBridgeInput,
  needs: AuthorityWorkflowAuthorityNeed[],
  integrations: AuthorityIntegrationHubResult[],
): AuthorityWorkflowBridgeDiagnostic[] {
  const diagnostics: AuthorityWorkflowBridgeDiagnostic[] = [];

  if (!needs.length) {
    diagnostics.push({
      code: "AUTH_WORKFLOW_NO_AUTHORITY_NEEDS",
      severity: "info",
      message:
        "Workflow did not produce authority needs requiring Authority Intelligence routing.",
    });
  }

  if (
    input.workflow.readiness.authorityReadiness === "low" ||
    input.workflow.readiness.authorityReadiness === "very-low"
  ) {
    diagnostics.push({
      code: "AUTH_WORKFLOW_LOW_AUTHORITY_READINESS",
      severity: "high",
      message: "Workflow authority readiness is low.",
      detail:
        "Authority Intelligence should run before legal-principles, documents, court packages, or trial packages are treated as ready.",
    });
  }

  if (
    input.workflow.readiness.citationReadiness === "low" ||
    input.workflow.readiness.citationReadiness === "very-low"
  ) {
    diagnostics.push({
      code: "AUTH_WORKFLOW_LOW_CITATION_READINESS",
      severity: "high",
      message: "Workflow citation readiness is low.",
      detail:
        "Court-facing output should not cite authorities until citation hooks are safe.",
    });
  }

  for (const integration of integrations) {
    if (integration.status === "blocked") {
      diagnostics.push({
        code: "AUTH_WORKFLOW_INTEGRATION_BLOCKED",
        severity: "high",
        message: `Authority integration is blocked for ${integration.consumer}.`,
        detail: integration.warnings.join(" "),
      });
    }
  }

  return diagnostics;
}

function determineStatus(
  diagnostics: AuthorityWorkflowBridgeDiagnostic[],
  integrations: AuthorityIntegrationHubResult[],
): AuthorityWorkflowBridgeStatus {
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
  workflow: WorkflowOrchestrationModel,
  needs: AuthorityWorkflowAuthorityNeed[],
): AuthorityWorkflowBridgeResult["workflowAuthoritySummary"] {
  const blockingNeeds = needs.filter(
    (need) =>
      severityRank(need.severity) >= 4 ||
      isCourtFacingRoute(need.route) ||
      need.requiresCitationSafety,
  ).length;

  return {
    recommendedRoute: workflow.readiness.recommendedRoute,
    authorityReadiness: workflow.readiness.authorityReadiness,
    citationReadiness: workflow.readiness.citationReadiness,
    jurisdictionReadiness: workflow.readiness.jurisdictionReadiness,
    proceduralReadiness: workflow.readiness.procedureReadiness,
    totalNeeds: needs.length,
    blockingNeeds,
    courtFacingBlocked: needs.some(
      (need) => isCourtFacingRoute(need.route) && severityRank(need.severity) >= 4,
    ),
  };
}

function buildNextActions(
  result: Pick<
    AuthorityWorkflowBridgeResult,
    "status" | "authorityNeeds" | "integrations" | "workflowAuthoritySummary"
  >,
): string[] {
  const actions: string[] = [];

  if (result.status === "blocked" || result.status === "needs-review") {
    actions.push(
      "Resolve Authority Workflow Bridge warnings before showing court-facing authority output.",
    );
  }

  if (result.workflowAuthoritySummary.courtFacingBlocked) {
    actions.push(
      "Do not treat court packages, trial packages, forms, or documents as authority-ready until citation and jurisdiction checks pass.",
    );
  }

  if (result.authorityNeeds.some((need) => need.requiresAnnualPractice)) {
    actions.push(
      "Use Annual Practice hooks for procedural workflow needs involving service, filing, deadlines, motions, conferences, or trial readiness.",
    );
  }

  if (result.authorityNeeds.some((need) => need.requiresCanlii)) {
    actions.push(
      "Use CanLII hooks for case-law verification, jurisdiction fit, and citation enrichment when live lookup is available.",
    );
  }

  actions.push(
    "Keep Workflow connected to authorities only through Authority Intelligence; do not hard-code authority cards or rules in Workflow UI.",
  );

  for (const integration of result.integrations) {
    actions.push(...integration.nextActions);
  }

  return unique(actions).slice(0, 20);
}

export function buildAuthorityWorkflowBridge(
  input: AuthorityWorkflowBridgeInput,
): AuthorityWorkflowBridgeResult {
  const authorityNeeds = buildAuthorityNeeds(input);
  const hub = createAuthorityIntegrationHub(input.adapters);
  const caseContext = buildCaseContext(input);

  const integrations = authorityNeeds.map((need) =>
    hub.resolve({
      consumer: consumerForRoute(need.route),
      caseContext: {
        ...caseContext,
        workflowRoute: need.route,
        workflowBlockers: unique([
          ...(caseContext.workflowBlockers || []),
          need.title,
          need.explanation,
        ]),
      },
      request: need.request,
      sourceSystem: "AuthorityWorkflowBridge",
      workflowRoute: need.route,
      litigationReasoningContext: input.litigationReasoning,
      extensionData: {
        ...(input.extensionData || {}),
        authorityWorkflowNeedId: need.id,
        authorityWorkflowTrigger: need.trigger,
      },
    }),
  );

  const diagnostics = buildDiagnostics(input, authorityNeeds, integrations);
  const status = determineStatus(diagnostics, integrations);
  const workflowAuthoritySummary = buildSummary(input.workflow, authorityNeeds);

  const partial = {
    status,
    authorityNeeds,
    integrations,
    workflowAuthoritySummary,
  };

  return {
    version: VERSION,
    generatedAt: nowIso(),
    status,
    workflowId: input.workflow.id,
    caseId: input.workflow.caseId,
    authorityNeeds,
    integrations,
    diagnostics,
    warnings: unique([
      ...input.workflow.warnings,
      ...diagnostics
        .filter((diagnostic) => severityRank(diagnostic.severity) >= 3)
        .map((diagnostic) => diagnostic.message),
      ...integrations.flatMap((integration) => integration.warnings),
    ]),
    workflowAuthoritySummary,
    nextActions: buildNextActions(partial),
    extensionData: input.extensionData || {},
  };
}

export function getBlockingAuthorityWorkflowNeeds(
  result: AuthorityWorkflowBridgeResult,
): AuthorityWorkflowAuthorityNeed[] {
  return result.authorityNeeds.filter(
    (need) =>
      severityRank(need.severity) >= 4 ||
      need.requiresCitationSafety ||
      isCourtFacingRoute(need.route),
  );
}

export function isWorkflowAuthorityReady(
  result: AuthorityWorkflowBridgeResult,
): boolean {
  return (
    result.status === "ready" &&
    !result.workflowAuthoritySummary.courtFacingBlocked &&
    result.integrations.every((integration) => integration.status === "ready")
  );
}

export function getAuthorityNeedsForRoute(
  result: AuthorityWorkflowBridgeResult,
  route: WorkflowRoute,
): AuthorityWorkflowAuthorityNeed[] {
  return result.authorityNeeds.filter((need) => need.route === route);
}

export const authorityWorkflowBridge = {
  build: buildAuthorityWorkflowBridge,
  getBlockingNeeds: getBlockingAuthorityWorkflowNeeds,
  isReady: isWorkflowAuthorityReady,
  getNeedsForRoute: getAuthorityNeedsForRoute,
};