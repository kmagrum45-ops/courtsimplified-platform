// src/lib/case-system/authority-intelligence/authorityNavigator.ts

export type AuthorityNavigatorVersion = "1.0.0";

export type AuthorityNavigationCourtPath =
  | "small-claims"
  | "civil"
  | "family"
  | "criminal"
  | "tribunal"
  | "appeal"
  | "unknown";

export type AuthorityNavigationStage =
  | "intake"
  | "pleadings"
  | "service"
  | "disclosure"
  | "conference"
  | "motion"
  | "settlement"
  | "trial"
  | "appeal"
  | "enforcement"
  | "unknown";

export type AuthorityNavigationDomain =
  | "civil-procedure"
  | "small-claims"
  | "family-law"
  | "evidence"
  | "charter"
  | "administrative-law"
  | "torts"
  | "contract"
  | "defamation"
  | "damages"
  | "criminal"
  | "unknown";

export type AuthorityNavigationPurpose =
  | "legal-principles"
  | "case-law"
  | "ai-case-partner"
  | "litigation-strategy"
  | "judge-perspective"
  | "court-package"
  | "trial-package"
  | "workflow"
  | "annual-practice"
  | "citation-check"
  | "unknown";

export type AuthorityNavigationSeverity = "info" | "low" | "medium" | "high" | "critical";

export type AuthorityNavigationSource =
  | "registry"
  | "retrieval-engine"
  | "display-engine"
  | "annual-practice"
  | "canlii"
  | "workflow"
  | "brain"
  | "database"
  | "unknown";

export interface AuthorityNavigatorCaseContext {
  caseId?: string;
  userId?: string;
  courtPath?: AuthorityNavigationCourtPath | string;
  province?: string;
  jurisdiction?: string;
  stage?: AuthorityNavigationStage | string;
  proceduralPosture?: string;
  legalDomains?: Array<AuthorityNavigationDomain | string>;
  issues?: string[];
  facts?: string[];
  claims?: string[];
  remedies?: string[];
  evidenceIssues?: string[];
  risks?: string[];
  deadlines?: string[];
  workflowRoute?: string;
  workflowBlockers?: string[];
  litigationReasoning?: unknown;
  aiCasePartnerContext?: unknown;
  brainMigrationContext?: unknown;
  masterCaseSchemaContext?: unknown;
}

export interface AuthorityNavigatorRequest {
  purpose?: AuthorityNavigationPurpose;
  query?: string;
  topics?: string[];
  courtPath?: AuthorityNavigationCourtPath | string;
  jurisdiction?: string;
  province?: string;
  stage?: AuthorityNavigationStage | string;
  legalDomains?: Array<AuthorityNavigationDomain | string>;
  requireVerified?: boolean;
  includeNeedsReview?: boolean;
  maxAuthorities?: number;
  caseContext?: AuthorityNavigatorCaseContext;
  explanationMode?: "none" | "short" | "detailed";
  citationMode?: "none" | "safe" | "full";
  annualPracticeMode?: "off" | "hooks-only" | "required";
  canliiMode?: "off" | "hooks-only" | "required";
  cacheMode?: "off" | "read" | "read-write";
  extensionData?: Record<string, unknown>;
}

export interface AuthorityNavigatorAdapterResult {
  authorities?: AuthorityNavigatorAuthority[];
  displayGroups?: AuthorityNavigatorDisplayGroup[];
  warnings?: string[];
  diagnostics?: AuthorityNavigatorDiagnostic[];
  raw?: unknown;
}

export interface AuthorityNavigatorAdapters {
  retrieveAuthorities?: (request: AuthorityNavigatorRequest) => AuthorityNavigatorAdapterResult;
  displayAuthorities?: (authorities: AuthorityNavigatorAuthority[], request: AuthorityNavigatorRequest) => AuthorityNavigatorAdapterResult;
  readCache?: (cacheKey: string) => AuthorityNavigatorResult | undefined;
  writeCache?: (cacheKey: string, result: AuthorityNavigatorResult) => void;
  annualPracticeLookup?: (request: AuthorityNavigatorRequest) => AuthorityNavigatorAdapterResult;
  canliiLookup?: (request: AuthorityNavigatorRequest) => AuthorityNavigatorAdapterResult;
  databaseLookup?: (request: AuthorityNavigatorRequest) => AuthorityNavigatorAdapterResult;
  extensionHook?: (event: AuthorityNavigatorExtensionEvent) => void;
}

export interface AuthorityNavigatorAuthority {
  id: string;
  title: string;
  citation?: string;
  authorityType?: string;
  jurisdiction?: string;
  courtLevel?: string;
  legalDomains?: string[];
  topics?: string[];
  courtPaths?: string[];
  stages?: string[];
  verified?: boolean;
  needsReview?: boolean;
  importanceScore?: number;
  bindingWeight?: number;
  summary?: string;
  principle?: string;
  sourceUrl?: string;
  sourceReferences?: string[];
  annualPracticeReferences?: string[];
  canliiReferences?: string[];
  displayMode?: string;
  rankingReasons?: string[];
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

export interface AuthorityNavigatorRoute {
  routeId: string;
  label: string;
  purpose: AuthorityNavigationPurpose;
  recommendedPage: string;
  courtPath: string;
  stage: string;
  legalDomains: string[];
  topics: string[];
  reason: string;
  priority: number;
  blocked: boolean;
  blockers: string[];
}

export interface AuthorityNavigatorDisplayGroup {
  groupId: string;
  title: string;
  purpose: AuthorityNavigationPurpose;
  authorities: AuthorityNavigatorAuthority[];
  explanation?: string;
  citationNotes?: string[];
  warnings?: string[];
}

export interface AuthorityNavigatorExplanation {
  summary: string;
  routingReasons: string[];
  rankingReasons: string[];
  proceduralAwareness: string[];
  workflowAwareness: string[];
  courtPathAwareness: string[];
  legalDomainAwareness: string[];
  authoritySafetyNotes: string[];
  nextQuestions: string[];
}

export interface AuthorityNavigatorCitationHook {
  hookId: string;
  authorityId: string;
  label: string;
  citation?: string;
  safeToCite: boolean;
  reason: string;
  sourceReferences: string[];
}

export interface AuthorityNavigatorAnnualPracticeHook {
  hookId: string;
  topic: string;
  courtPath: string;
  stage: string;
  ruleReferences: string[];
  required: boolean;
  reason: string;
}

export interface AuthorityNavigatorCanliiHook {
  hookId: string;
  query: string;
  jurisdiction: string;
  required: boolean;
  reason: string;
}

export interface AuthorityNavigatorDiagnostic {
  code: string;
  severity: AuthorityNavigationSeverity;
  source: AuthorityNavigationSource;
  message: string;
  detail?: string;
}

export interface AuthorityNavigatorExtensionEvent {
  event:
    | "navigation-started"
    | "cache-hit"
    | "cache-write"
    | "retrieval-complete"
    | "display-complete"
    | "annual-practice-hook"
    | "canlii-hook"
    | "database-hook"
    | "navigation-complete";
  request: AuthorityNavigatorRequest;
  result?: Partial<AuthorityNavigatorResult>;
}

export interface AuthorityNavigatorResult {
  version: AuthorityNavigatorVersion;
  cacheKey: string;
  generatedAt: string;
  request: AuthorityNavigatorRequest;
  normalized: Required<
    Pick<
      AuthorityNavigatorRequest,
      | "purpose"
      | "query"
      | "topics"
      | "courtPath"
      | "jurisdiction"
      | "province"
      | "stage"
      | "legalDomains"
      | "requireVerified"
      | "includeNeedsReview"
      | "maxAuthorities"
      | "explanationMode"
      | "citationMode"
      | "annualPracticeMode"
      | "canliiMode"
      | "cacheMode"
    >
  >;
  routes: AuthorityNavigatorRoute[];
  authorities: AuthorityNavigatorAuthority[];
  displayGroups: AuthorityNavigatorDisplayGroup[];
  explanation: AuthorityNavigatorExplanation;
  citationHooks: AuthorityNavigatorCitationHook[];
  annualPracticeHooks: AuthorityNavigatorAnnualPracticeHook[];
  canliiHooks: AuthorityNavigatorCanliiHook[];
  diagnostics: AuthorityNavigatorDiagnostic[];
  warnings: string[];
  nextWorkflowActions: string[];
  extensionData: Record<string, unknown>;
}

const VERSION: AuthorityNavigatorVersion = "1.0.0";

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => cleanText(v)).filter(Boolean)));
}

function normalizeCourtPath(value: unknown): AuthorityNavigationCourtPath {
  const text = cleanText(value).toLowerCase();
  if (["small-claims", "small claims", "ontario-smallclaims"].includes(text)) return "small-claims";
  if (["civil", "ontario-civil", "simplified-procedure"].includes(text)) return "civil";
  if (["family", "family-law"].includes(text)) return "family";
  if (["criminal"].includes(text)) return "criminal";
  if (["tribunal", "ltb", "hrto", "lat"].includes(text)) return "tribunal";
  if (["appeal", "appellate"].includes(text)) return "appeal";
  return "unknown";
}

function normalizeStage(value: unknown): AuthorityNavigationStage {
  const text = cleanText(value).toLowerCase();
  if (["intake", "start", "opening"].includes(text)) return "intake";
  if (["pleadings", "claim", "defence", "reply"].includes(text)) return "pleadings";
  if (["service", "serve", "served"].includes(text)) return "service";
  if (["disclosure", "discovery", "documents"].includes(text)) return "disclosure";
  if (["conference", "case conference", "settlement conference"].includes(text)) return "conference";
  if (["motion", "motions"].includes(text)) return "motion";
  if (["settlement"].includes(text)) return "settlement";
  if (["trial"].includes(text)) return "trial";
  if (["appeal"].includes(text)) return "appeal";
  if (["enforcement"].includes(text)) return "enforcement";
  return "unknown";
}

function normalizePurpose(value: unknown): AuthorityNavigationPurpose {
  const text = cleanText(value).toLowerCase();
  const allowed: AuthorityNavigationPurpose[] = [
    "legal-principles",
    "case-law",
    "ai-case-partner",
    "litigation-strategy",
    "judge-perspective",
    "court-package",
    "trial-package",
    "workflow",
    "annual-practice",
    "citation-check",
    "unknown",
  ];
  return allowed.includes(text as AuthorityNavigationPurpose) ? (text as AuthorityNavigationPurpose) : "unknown";
}

function normalizeDomain(value: unknown): AuthorityNavigationDomain {
  const text = cleanText(value).toLowerCase();
  if (["civil procedure", "civil-procedure", "procedure"].includes(text)) return "civil-procedure";
  if (["small claims", "small-claims"].includes(text)) return "small-claims";
  if (["family", "family law", "family-law"].includes(text)) return "family-law";
  if (["evidence"].includes(text)) return "evidence";
  if (["charter", "constitutional"].includes(text)) return "charter";
  if (["administrative", "administrative-law", "judicial review"].includes(text)) return "administrative-law";
  if (["tort", "torts", "negligence"].includes(text)) return "torts";
  if (["contract"].includes(text)) return "contract";
  if (["defamation"].includes(text)) return "defamation";
  if (["damages"].includes(text)) return "damages";
  if (["criminal"].includes(text)) return "criminal";
  return "unknown";
}

function normalizeRequest(request: AuthorityNavigatorRequest): AuthorityNavigatorResult["normalized"] {
  const caseContext = request.caseContext;
  const courtPath = normalizeCourtPath(request.courtPath || caseContext?.courtPath);
  const stage = normalizeStage(request.stage || caseContext?.stage);
  const legalDomains = unique([
    ...(request.legalDomains || []).map(String),
    ...(caseContext?.legalDomains || []).map(String),
  ]).map(normalizeDomain);

  return {
    purpose: normalizePurpose(request.purpose),
    query: cleanText(request.query),
    topics: unique([...(request.topics || []), ...(caseContext?.issues || []), ...(caseContext?.claims || [])]),
    courtPath,
    jurisdiction: cleanText(request.jurisdiction || caseContext?.jurisdiction || "Ontario"),
    province: cleanText(request.province || caseContext?.province || "Ontario"),
    stage,
    legalDomains: unique(legalDomains),
    requireVerified: request.requireVerified !== false,
    includeNeedsReview: request.includeNeedsReview === true,
    maxAuthorities: Math.max(1, Math.min(request.maxAuthorities || 12, 50)),
    explanationMode: request.explanationMode || "detailed",
    citationMode: request.citationMode || "safe",
    annualPracticeMode: request.annualPracticeMode || "hooks-only",
    canliiMode: request.canliiMode || "hooks-only",
    cacheMode: request.cacheMode || "read-write",
  };
}

function createCacheKey(normalized: AuthorityNavigatorResult["normalized"]): string {
  return [
    "authority-navigator",
    VERSION,
    normalized.purpose,
    normalized.courtPath,
    normalized.stage,
    normalized.jurisdiction,
    normalized.legalDomains.join(","),
    normalized.topics.join(","),
    normalized.query,
    normalized.requireVerified ? "verified" : "mixed",
    normalized.includeNeedsReview ? "review-ok" : "review-blocked",
  ].join("|");
}

function buildRoutes(normalized: AuthorityNavigatorResult["normalized"], request: AuthorityNavigatorRequest): AuthorityNavigatorRoute[] {
  const blockers = unique([...(request.caseContext?.workflowBlockers || [])]);
  const topics = normalized.topics.length ? normalized.topics : normalized.legalDomains;

  const baseRoute: AuthorityNavigatorRoute = {
    routeId: "authority-primary-route",
    label: "Primary Authority Route",
    purpose: normalized.purpose === "unknown" ? "legal-principles" : normalized.purpose,
    recommendedPage: routePageForPurpose(normalized.purpose),
    courtPath: normalized.courtPath,
    stage: normalized.stage,
    legalDomains: normalized.legalDomains,
    topics,
    reason: "Authorities must be retrieved through Authority Intelligence instead of hard-coded into pages.",
    priority: 100,
    blocked: blockers.length > 0,
    blockers,
  };

  const routes = [baseRoute];

  if (normalized.stage === "service") {
    routes.push({
      ...baseRoute,
      routeId: "procedural-service-route",
      label: "Service Procedure Authority Route",
      purpose: "annual-practice",
      recommendedPage: "/legal-principles",
      topics: unique([...topics, "service", "Rule 16"]),
      reason: "Service issues require procedural authority and Annual Practice hooks before user-facing guidance is shown.",
      priority: 95,
    });
  }

  if (normalized.purpose === "trial-package") {
    routes.push({
      ...baseRoute,
      routeId: "trial-authority-route",
      label: "Trial Package Authority Route",
      recommendedPage: "/trial-package",
      reason: "Trial packages require verified authorities, citation safety, and proof-aware explanation hooks.",
      priority: 90,
    });
  }

  return routes.sort((a, b) => b.priority - a.priority);
}

function routePageForPurpose(purpose: AuthorityNavigationPurpose): string {
  if (purpose === "case-law") return "/case-law";
  if (purpose === "litigation-strategy") return "/litigation-strategy";
  if (purpose === "court-package") return "/court-package";
  if (purpose === "trial-package") return "/trial-package";
  if (purpose === "ai-case-partner") return "/builder";
  if (purpose === "workflow") return "/case-dashboard";
  return "/legal-principles";
}

function rankAuthorities(
  authorities: AuthorityNavigatorAuthority[],
  normalized: AuthorityNavigatorResult["normalized"],
): AuthorityNavigatorAuthority[] {
  return [...authorities]
    .filter((authority) => {
      if (normalized.requireVerified && authority.verified === false) return false;
      if (!normalized.includeNeedsReview && authority.needsReview) return false;
      return true;
    })
    .map((authority) => {
      const topicHits = (authority.topics || []).filter((topic) =>
        normalized.topics.some((wanted) => topic.toLowerCase().includes(wanted.toLowerCase())),
      ).length;

      const domainHits = (authority.legalDomains || []).filter((domain) =>
        normalized.legalDomains.some((wanted) => domain.toLowerCase().includes(wanted.toLowerCase())),
      ).length;

      const courtPathHit = (authority.courtPaths || []).includes(normalized.courtPath) ? 1 : 0;
      const stageHit = (authority.stages || []).includes(normalized.stage) ? 1 : 0;
      const verifiedBoost = authority.verified ? 20 : 0;
      const base = authority.importanceScore || 0;
      const binding = authority.bindingWeight || 0;

      return {
        ...authority,
        importanceScore: base + binding + verifiedBoost + topicHits * 8 + domainHits * 7 + courtPathHit * 5 + stageHit * 5,
        rankingReasons: unique([
          ...(authority.rankingReasons || []),
          topicHits ? "Matched requested authority topics." : "",
          domainHits ? "Matched requested legal domains." : "",
          courtPathHit ? "Matched court path." : "",
          stageHit ? "Matched procedural stage." : "",
          authority.verified ? "Verified authority preferred." : "",
        ]),
      };
    })
    .sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0))
    .slice(0, normalized.maxAuthorities);
}

function fallbackDisplayGroups(
  authorities: AuthorityNavigatorAuthority[],
  normalized: AuthorityNavigatorResult["normalized"],
): AuthorityNavigatorDisplayGroup[] {
  return [
    {
      groupId: "authority-navigation-results",
      title: "Authority Intelligence Results",
      purpose: normalized.purpose === "unknown" ? "legal-principles" : normalized.purpose,
      authorities,
      explanation: "Authorities are grouped by the navigator for UI display and future page integration.",
      citationNotes: authorities.map((authority) =>
        authority.citation ? `${authority.title}: ${authority.citation}` : `${authority.title}: citation requires review`,
      ),
      warnings: authorities.flatMap((authority) => authority.warnings || []),
    },
  ];
}

function buildCitationHooks(
  authorities: AuthorityNavigatorAuthority[],
  normalized: AuthorityNavigatorResult["normalized"],
): AuthorityNavigatorCitationHook[] {
  if (normalized.citationMode === "none") return [];

  return authorities.map((authority) => ({
    hookId: `citation-${authority.id}`,
    authorityId: authority.id,
    label: authority.title,
    citation: authority.citation,
    safeToCite: Boolean(authority.verified && authority.citation && !authority.needsReview),
    reason:
      authority.verified && authority.citation && !authority.needsReview
        ? "Authority is verified and has a citation."
        : "Authority requires citation verification before court-facing use.",
    sourceReferences: unique([...(authority.sourceReferences || []), ...(authority.canliiReferences || [])]),
  }));
}

function buildAnnualPracticeHooks(
  normalized: AuthorityNavigatorResult["normalized"],
): AuthorityNavigatorAnnualPracticeHook[] {
  if (normalized.annualPracticeMode === "off") return [];

  const hooks: AuthorityNavigatorAnnualPracticeHook[] = [];

  if (normalized.courtPath === "civil" || normalized.courtPath === "small-claims") {
    hooks.push({
      hookId: "annual-practice-civil-procedure",
      topic: "Civil procedure authority",
      courtPath: normalized.courtPath,
      stage: normalized.stage,
      ruleReferences: [],
      required: normalized.annualPracticeMode === "required",
      reason: "Civil and Small Claims procedural answers should connect to Annual Practice rule intelligence when available.",
    });
  }

  if (normalized.stage === "service") {
    hooks.push({
      hookId: "annual-practice-rule-16-service",
      topic: "Service of documents",
      courtPath: normalized.courtPath,
      stage: normalized.stage,
      ruleReferences: ["Rule 16"],
      required: true,
      reason: "Service questions require exact procedural validation before user-facing workflow guidance.",
    });
  }

  return hooks;
}

function buildCanliiHooks(normalized: AuthorityNavigatorResult["normalized"]): AuthorityNavigatorCanliiHook[] {
  if (normalized.canliiMode === "off") return [];

  const queryParts = unique([
    normalized.query,
    ...normalized.topics,
    ...normalized.legalDomains,
    normalized.jurisdiction,
  ]);

  return [
    {
      hookId: "canlii-authority-verification",
      query: queryParts.join(" "),
      jurisdiction: normalized.jurisdiction,
      required: normalized.canliiMode === "required",
      reason: "CanLII lookup hook is reserved for future live authority verification and citation enrichment.",
    },
  ];
}

function buildExplanation(
  normalized: AuthorityNavigatorResult["normalized"],
  routes: AuthorityNavigatorRoute[],
  authorities: AuthorityNavigatorAuthority[],
  diagnostics: AuthorityNavigatorDiagnostic[],
): AuthorityNavigatorExplanation {
  if (normalized.explanationMode === "none") {
    return {
      summary: "",
      routingReasons: [],
      rankingReasons: [],
      proceduralAwareness: [],
      workflowAwareness: [],
      courtPathAwareness: [],
      legalDomainAwareness: [],
      authoritySafetyNotes: [],
      nextQuestions: [],
    };
  }

  return {
    summary: `Authority Navigator selected ${authorities.length} authority result(s) for ${normalized.purpose}.`,
    routingReasons: routes.map((route) => route.reason),
    rankingReasons: unique(authorities.flatMap((authority) => authority.rankingReasons || [])),
    proceduralAwareness: [
      normalized.stage !== "unknown"
        ? `Procedural stage recognized: ${normalized.stage}.`
        : "Procedural stage is unknown and should be confirmed.",
    ],
    workflowAwareness: routes.some((route) => route.blocked)
      ? ["Workflow blockers exist and should be resolved before court-facing output."]
      : ["No workflow blockers were passed into Authority Navigator."],
    courtPathAwareness: [
      normalized.courtPath !== "unknown"
        ? `Court path recognized: ${normalized.courtPath}.`
        : "Court path is unknown and should be confirmed.",
    ],
    legalDomainAwareness: normalized.legalDomains.length
      ? normalized.legalDomains.map((domain) => `Legal domain recognized: ${domain}.`)
      : ["No legal domain was provided."],
    authoritySafetyNotes: [
      normalized.requireVerified
        ? "Verified authority mode is active."
        : "Mixed verification mode is active; review warnings before display.",
      ...diagnostics.filter((d) => d.severity === "high" || d.severity === "critical").map((d) => d.message),
    ],
    nextQuestions: [
      normalized.courtPath === "unknown" ? "Confirm the court path." : "",
      normalized.stage === "unknown" ? "Confirm the procedural stage." : "",
      normalized.legalDomains.length === 0 ? "Confirm the legal domain." : "",
    ].filter(Boolean),
  };
}

function buildDiagnostics(
  normalized: AuthorityNavigatorResult["normalized"],
  authorities: AuthorityNavigatorAuthority[],
  adapterWarnings: string[],
): AuthorityNavigatorDiagnostic[] {
  const diagnostics: AuthorityNavigatorDiagnostic[] = [];

  if (normalized.courtPath === "unknown") {
    diagnostics.push({
      code: "AUTH_NAV_UNKNOWN_COURT_PATH",
      severity: "medium",
      source: "workflow",
      message: "Court path is unknown.",
      detail: "Authority routing is safer when court path is known.",
    });
  }

  if (normalized.stage === "unknown") {
    diagnostics.push({
      code: "AUTH_NAV_UNKNOWN_STAGE",
      severity: "medium",
      source: "workflow",
      message: "Procedural stage is unknown.",
      detail: "Procedural authority ranking may be incomplete.",
    });
  }

  if (!authorities.length) {
    diagnostics.push({
      code: "AUTH_NAV_NO_AUTHORITIES",
      severity: "high",
      source: "retrieval-engine",
      message: "No authority results were returned.",
      detail: "Check registry coverage, query terms, legal domains, and verification filters.",
    });
  }

  for (const warning of adapterWarnings) {
    diagnostics.push({
      code: "AUTH_NAV_ADAPTER_WARNING",
      severity: "medium",
      source: "unknown",
      message: warning,
    });
  }

  return diagnostics;
}

function buildNextWorkflowActions(result: Pick<AuthorityNavigatorResult, "normalized" | "authorities" | "diagnostics">): string[] {
  const actions: string[] = [];

  if (result.normalized.courtPath === "unknown") actions.push("Confirm court path before relying on authority output.");
  if (result.normalized.stage === "unknown") actions.push("Confirm procedural stage before generating workflow guidance.");
  if (!result.authorities.length) actions.push("Expand authority registry coverage or run external authority verification.");
  if (result.diagnostics.some((d) => d.severity === "high" || d.severity === "critical")) {
    actions.push("Review Authority Navigator diagnostics before showing court-facing output.");
  }

  actions.push("Keep authority display connected to Authority Intelligence; do not hard-code authority cards in pages.");

  return unique(actions);
}

export function createAuthorityNavigator(adapters: AuthorityNavigatorAdapters = {}) {
  return {
    navigate(request: AuthorityNavigatorRequest): AuthorityNavigatorResult {
      adapters.extensionHook?.({ event: "navigation-started", request });

      const normalized = normalizeRequest(request);
      const cacheKey = createCacheKey(normalized);

      if (normalized.cacheMode !== "off") {
        const cached = adapters.readCache?.(cacheKey);
        if (cached) {
          adapters.extensionHook?.({ event: "cache-hit", request, result: cached });
          return cached;
        }
      }

      const routes = buildRoutes(normalized, request);

      const retrievalResult = adapters.retrieveAuthorities?.({ ...request, ...normalized }) || {
        authorities: [],
        warnings: ["No retrieval adapter was provided. Authority Navigator returned routing and hook output only."],
      };

      adapters.extensionHook?.({ event: "retrieval-complete", request });

      const rankedAuthorities = rankAuthorities(retrievalResult.authorities || [], normalized);

      const displayResult = adapters.displayAuthorities?.(rankedAuthorities, { ...request, ...normalized });
      const displayGroups = displayResult?.displayGroups?.length
        ? displayResult.displayGroups
        : fallbackDisplayGroups(rankedAuthorities, normalized);

      adapters.extensionHook?.({ event: "display-complete", request });

      const annualPracticeHooks = buildAnnualPracticeHooks(normalized);
      if (annualPracticeHooks.length) adapters.extensionHook?.({ event: "annual-practice-hook", request });

      const canliiHooks = buildCanliiHooks(normalized);
      if (canliiHooks.length) adapters.extensionHook?.({ event: "canlii-hook", request });

      const adapterWarnings = unique([...(retrievalResult.warnings || []), ...(displayResult?.warnings || [])]);
      const diagnostics = buildDiagnostics(normalized, rankedAuthorities, adapterWarnings);
      const citationHooks = buildCitationHooks(rankedAuthorities, normalized);
      const explanation = buildExplanation(normalized, routes, rankedAuthorities, diagnostics);

      const partial = {
        normalized,
        authorities: rankedAuthorities,
        diagnostics,
      };

      const result: AuthorityNavigatorResult = {
        version: VERSION,
        cacheKey,
        generatedAt: new Date().toISOString(),
        request,
        normalized,
        routes,
        authorities: rankedAuthorities,
        displayGroups,
        explanation,
        citationHooks,
        annualPracticeHooks,
        canliiHooks,
        diagnostics,
        warnings: unique([
          ...adapterWarnings,
          ...rankedAuthorities.flatMap((authority) => authority.warnings || []),
          ...diagnostics.map((diagnostic) => diagnostic.message),
        ]),
        nextWorkflowActions: buildNextWorkflowActions(partial),
        extensionData: request.extensionData || {},
      };

      if (normalized.cacheMode === "read-write") {
        adapters.writeCache?.(cacheKey, result);
        adapters.extensionHook?.({ event: "cache-write", request, result });
      }

      adapters.extensionHook?.({ event: "navigation-complete", request, result });

      return result;
    },
  };
}

export function navigateAuthorities(
  request: AuthorityNavigatorRequest,
  adapters: AuthorityNavigatorAdapters = {},
): AuthorityNavigatorResult {
  return createAuthorityNavigator(adapters).navigate(request);
}

export function buildAuthorityNavigationRequestFromCaseContext(
  caseContext: AuthorityNavigatorCaseContext,
  overrides: Partial<AuthorityNavigatorRequest> = {},
): AuthorityNavigatorRequest {
  return {
    purpose: overrides.purpose || "ai-case-partner",
    query: overrides.query || unique([...(caseContext.issues || []), ...(caseContext.claims || [])]).join(" "),
    topics: overrides.topics || unique([...(caseContext.issues || []), ...(caseContext.claims || [])]),
    courtPath: overrides.courtPath || caseContext.courtPath,
    jurisdiction: overrides.jurisdiction || caseContext.jurisdiction || caseContext.province || "Ontario",
    province: overrides.province || caseContext.province || "Ontario",
    stage: overrides.stage || caseContext.stage,
    legalDomains: overrides.legalDomains || caseContext.legalDomains,
    requireVerified: overrides.requireVerified ?? true,
    includeNeedsReview: overrides.includeNeedsReview ?? false,
    maxAuthorities: overrides.maxAuthorities || 12,
    caseContext,
    explanationMode: overrides.explanationMode || "detailed",
    citationMode: overrides.citationMode || "safe",
    annualPracticeMode: overrides.annualPracticeMode || "hooks-only",
    canliiMode: overrides.canliiMode || "hooks-only",
    cacheMode: overrides.cacheMode || "read-write",
    extensionData: overrides.extensionData || {},
  };
}

export function getAuthorityNavigatorDiagnostics(result: AuthorityNavigatorResult): AuthorityNavigatorDiagnostic[] {
  return result.diagnostics;
}

export function getSafeCitationHooks(result: AuthorityNavigatorResult): AuthorityNavigatorCitationHook[] {
  return result.citationHooks.filter((hook) => hook.safeToCite);
}

export function getRequiredAnnualPracticeHooks(result: AuthorityNavigatorResult): AuthorityNavigatorAnnualPracticeHook[] {
  return result.annualPracticeHooks.filter((hook) => hook.required);
}

export function getRequiredCanliiHooks(result: AuthorityNavigatorResult): AuthorityNavigatorCanliiHook[] {
  return result.canliiHooks.filter((hook) => hook.required);
}

export const authorityNavigator = createAuthorityNavigator();