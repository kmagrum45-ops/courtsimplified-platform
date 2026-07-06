import {
  AuthorityNavigatorAdapters,
  AuthorityNavigatorCaseContext,
  AuthorityNavigatorRequest,
  AuthorityNavigatorResult,
  AuthorityNavigatorAuthority,
  AuthorityNavigatorDisplayGroup,
  createAuthorityNavigator,
  buildAuthorityNavigationRequestFromCaseContext,
} from "./authorityNavigator";

export type AuthorityIntegrationHubVersion = "1.0.0";

export type AuthorityIntegrationConsumer =
  | "legal-principles"
  | "case-law"
  | "ai-case-partner"
  | "litigation-strategy"
  | "judge-perspective"
  | "court-package"
  | "trial-package"
  | "workflow"
  | "brain-migration-layer"
  | "case-system-assembly"
  | "future-conversation-ai";

export type AuthorityIntegrationStatus =
  | "ready"
  | "partial"
  | "blocked"
  | "needs-review";

export type AuthorityIntegrationSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export interface AuthorityIntegrationHubInput {
  consumer: AuthorityIntegrationConsumer;
  caseContext?: AuthorityNavigatorCaseContext;
  request?: AuthorityNavigatorRequest;
  adapters?: AuthorityNavigatorAdapters;
  sourceSystem?: string;
  workflowRoute?: string;
  litigationReasoningContext?: unknown;
  brainMigrationContext?: unknown;
  caseSystemAssemblyContext?: unknown;
  aiCasePartnerContext?: unknown;
  extensionData?: Record<string, unknown>;
}

export interface AuthorityIntegrationConsumerProfile {
  consumer: AuthorityIntegrationConsumer;
  requiresVerifiedAuthorities: boolean;
  allowsNeedsReview: boolean;
  requiresCitationHooks: boolean;
  requiresAnnualPracticeHooks: boolean;
  requiresCanliiHooks: boolean;
  preferredMaxAuthorities: number;
  explanationMode: "none" | "short" | "detailed";
  defaultPurpose: AuthorityNavigatorRequest["purpose"];
}

export interface AuthorityIntegrationDiagnostic {
  code: string;
  severity: AuthorityIntegrationSeverity;
  message: string;
  source: string;
  detail?: string;
}

export interface AuthorityIntegrationHubResult {
  version: AuthorityIntegrationHubVersion;
  status: AuthorityIntegrationStatus;
  consumer: AuthorityIntegrationConsumer;
  generatedAt: string;
  navigation: AuthorityNavigatorResult;
  authorities: AuthorityNavigatorAuthority[];
  displayGroups: AuthorityNavigatorDisplayGroup[];
  diagnostics: AuthorityIntegrationDiagnostic[];
  warnings: string[];
  integrationSummary: {
    sourceOfTruthPreserved: boolean;
    retrievalIntegrated: boolean;
    displayIntegrated: boolean;
    workflowAware: boolean;
    brainAware: boolean;
    litigationReasoningAware: boolean;
    citationReady: boolean;
    annualPracticeReady: boolean;
    canliiReady: boolean;
  };
  nextActions: string[];
  extensionData: Record<string, unknown>;
}

const VERSION: AuthorityIntegrationHubVersion = "1.0.0";

const CONSUMER_PROFILES: Record<
  AuthorityIntegrationConsumer,
  AuthorityIntegrationConsumerProfile
> = {
  "legal-principles": {
    consumer: "legal-principles",
    requiresVerifiedAuthorities: true,
    allowsNeedsReview: false,
    requiresCitationHooks: true,
    requiresAnnualPracticeHooks: true,
    requiresCanliiHooks: false,
    preferredMaxAuthorities: 12,
    explanationMode: "detailed",
    defaultPurpose: "legal-principles",
  },
  "case-law": {
    consumer: "case-law",
    requiresVerifiedAuthorities: true,
    allowsNeedsReview: false,
    requiresCitationHooks: true,
    requiresAnnualPracticeHooks: false,
    requiresCanliiHooks: true,
    preferredMaxAuthorities: 20,
    explanationMode: "detailed",
    defaultPurpose: "case-law",
  },
  "ai-case-partner": {
    consumer: "ai-case-partner",
    requiresVerifiedAuthorities: true,
    allowsNeedsReview: false,
    requiresCitationHooks: true,
    requiresAnnualPracticeHooks: true,
    requiresCanliiHooks: false,
    preferredMaxAuthorities: 10,
    explanationMode: "detailed",
    defaultPurpose: "ai-case-partner",
  },
  "litigation-strategy": {
    consumer: "litigation-strategy",
    requiresVerifiedAuthorities: true,
    allowsNeedsReview: false,
    requiresCitationHooks: true,
    requiresAnnualPracticeHooks: true,
    requiresCanliiHooks: true,
    preferredMaxAuthorities: 15,
    explanationMode: "detailed",
    defaultPurpose: "litigation-strategy",
  },
  "judge-perspective": {
    consumer: "judge-perspective",
    requiresVerifiedAuthorities: true,
    allowsNeedsReview: false,
    requiresCitationHooks: true,
    requiresAnnualPracticeHooks: true,
    requiresCanliiHooks: true,
    preferredMaxAuthorities: 12,
    explanationMode: "detailed",
    defaultPurpose: "judge-perspective",
  },
  "court-package": {
    consumer: "court-package",
    requiresVerifiedAuthorities: true,
    allowsNeedsReview: false,
    requiresCitationHooks: true,
    requiresAnnualPracticeHooks: true,
    requiresCanliiHooks: true,
    preferredMaxAuthorities: 18,
    explanationMode: "detailed",
    defaultPurpose: "court-package",
  },
  "trial-package": {
    consumer: "trial-package",
    requiresVerifiedAuthorities: true,
    allowsNeedsReview: false,
    requiresCitationHooks: true,
    requiresAnnualPracticeHooks: true,
    requiresCanliiHooks: true,
    preferredMaxAuthorities: 25,
    explanationMode: "detailed",
    defaultPurpose: "trial-package",
  },
  workflow: {
    consumer: "workflow",
    requiresVerifiedAuthorities: true,
    allowsNeedsReview: false,
    requiresCitationHooks: false,
    requiresAnnualPracticeHooks: true,
    requiresCanliiHooks: false,
    preferredMaxAuthorities: 8,
    explanationMode: "short",
    defaultPurpose: "workflow",
  },
  "brain-migration-layer": {
    consumer: "brain-migration-layer",
    requiresVerifiedAuthorities: true,
    allowsNeedsReview: false,
    requiresCitationHooks: true,
    requiresAnnualPracticeHooks: true,
    requiresCanliiHooks: false,
    preferredMaxAuthorities: 12,
    explanationMode: "detailed",
    defaultPurpose: "ai-case-partner",
  },
  "case-system-assembly": {
    consumer: "case-system-assembly",
    requiresVerifiedAuthorities: true,
    allowsNeedsReview: false,
    requiresCitationHooks: true,
    requiresAnnualPracticeHooks: true,
    requiresCanliiHooks: false,
    preferredMaxAuthorities: 15,
    explanationMode: "detailed",
    defaultPurpose: "workflow",
  },
  "future-conversation-ai": {
    consumer: "future-conversation-ai",
    requiresVerifiedAuthorities: true,
    allowsNeedsReview: false,
    requiresCitationHooks: true,
    requiresAnnualPracticeHooks: true,
    requiresCanliiHooks: true,
    preferredMaxAuthorities: 12,
    explanationMode: "detailed",
    defaultPurpose: "ai-case-partner",
  },
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getConsumerProfile(
  consumer: AuthorityIntegrationConsumer,
): AuthorityIntegrationConsumerProfile {
  return CONSUMER_PROFILES[consumer] ?? CONSUMER_PROFILES["ai-case-partner"];
}

function mergeRequestWithProfile(
  input: AuthorityIntegrationHubInput,
  profile: AuthorityIntegrationConsumerProfile,
): AuthorityNavigatorRequest {
  const baseRequest = input.caseContext
    ? buildAuthorityNavigationRequestFromCaseContext(input.caseContext)
    : {};

  const request: AuthorityNavigatorRequest = {
    ...baseRequest,
    ...input.request,
    purpose: input.request?.purpose ?? profile.defaultPurpose,
    requireVerified:
      input.request?.requireVerified ?? profile.requiresVerifiedAuthorities,
    includeNeedsReview:
      input.request?.includeNeedsReview ?? profile.allowsNeedsReview,
    maxAuthorities:
      input.request?.maxAuthorities ?? profile.preferredMaxAuthorities,
    explanationMode:
      input.request?.explanationMode ?? profile.explanationMode,
    citationMode:
      input.request?.citationMode ??
      (profile.requiresCitationHooks ? "safe" : "none"),
    annualPracticeMode:
      input.request?.annualPracticeMode ??
      (profile.requiresAnnualPracticeHooks ? "hooks-only" : "off"),
    canliiMode:
      input.request?.canliiMode ??
      (profile.requiresCanliiHooks ? "hooks-only" : "off"),
    cacheMode: input.request?.cacheMode ?? "read-write",
    caseContext: {
      ...(input.caseContext ?? {}),
      ...(input.request?.caseContext ?? {}),
      workflowRoute:
        input.request?.caseContext?.workflowRoute ??
        input.workflowRoute ??
        input.caseContext?.workflowRoute,
      litigationReasoning:
        input.request?.caseContext?.litigationReasoning ??
        input.litigationReasoningContext ??
        input.caseContext?.litigationReasoning,
      aiCasePartnerContext:
        input.request?.caseContext?.aiCasePartnerContext ??
        input.aiCasePartnerContext ??
        input.caseContext?.aiCasePartnerContext,
      brainMigrationContext:
        input.request?.caseContext?.brainMigrationContext ??
        input.brainMigrationContext ??
        input.caseContext?.brainMigrationContext,
      masterCaseSchemaContext:
        input.request?.caseContext?.masterCaseSchemaContext ??
        input.caseSystemAssemblyContext ??
        input.caseContext?.masterCaseSchemaContext,
    },
    extensionData: {
      ...(input.extensionData ?? {}),
      ...(input.request?.extensionData ?? {}),
      consumer: input.consumer,
      sourceSystem: input.sourceSystem,
      workflowRoute: input.workflowRoute,
    },
  };

  return request;
}

function createIntegrationDiagnostics(
  input: AuthorityIntegrationHubInput,
  navigation: AuthorityNavigatorResult,
  profile: AuthorityIntegrationConsumerProfile,
): AuthorityIntegrationDiagnostic[] {
  const diagnostics: AuthorityIntegrationDiagnostic[] = [];

  if (!input.caseContext && !input.request) {
    diagnostics.push({
      code: "AUTH_HUB_EMPTY_INPUT",
      severity: "high",
      source: "authorityIntegrationHub",
      message:
        "Authority Integration Hub received no case context and no authority request.",
      detail:
        "A consumer should pass either MasterCaseSchema-derived case context or a direct AuthorityNavigatorRequest.",
    });
  }

  if (!navigation.authorities.length) {
    diagnostics.push({
      code: "AUTH_HUB_NO_AUTHORITIES",
      severity: "high",
      source: "authorityIntegrationHub",
      message:
        "No authorities were returned for the requesting consumer.",
      detail:
        "This may mean the registry needs more coverage, the filters are too strict, or the court path/stage/domain is missing.",
    });
  }

  if (
    profile.requiresCitationHooks &&
    !navigation.citationHooks.some((hook) => hook.safeToCite)
  ) {
    diagnostics.push({
      code: "AUTH_HUB_NO_SAFE_CITATIONS",
      severity: "medium",
      source: "authorityIntegrationHub",
      message:
        "The consumer requires citation hooks, but no safe citation hook was available.",
      detail:
        "Court-facing packages should not cite authorities unless citation safety is confirmed.",
    });
  }

  if (
    profile.requiresAnnualPracticeHooks &&
    navigation.annualPracticeHooks.length === 0
  ) {
    diagnostics.push({
      code: "AUTH_HUB_NO_ANNUAL_PRACTICE_HOOKS",
      severity: "low",
      source: "authorityIntegrationHub",
      message:
        "The consumer prefers Annual Practice hooks, but none were generated.",
      detail:
        "This may be acceptable for non-procedural issues, but procedural workflow should usually connect to Annual Practice intelligence.",
    });
  }

  if (
    navigation.normalized.courtPath === "unknown" ||
    navigation.normalized.stage === "unknown"
  ) {
    diagnostics.push({
      code: "AUTH_HUB_INCOMPLETE_PROCEDURAL_CONTEXT",
      severity: "medium",
      source: "authorityIntegrationHub",
      message:
        "Authority routing has incomplete procedural context.",
      detail:
        "Court path and stage should be confirmed before court-facing authority output is relied on.",
    });
  }

  for (const diagnostic of navigation.diagnostics) {
    diagnostics.push({
      code: diagnostic.code,
      severity: diagnostic.severity,
      source: `authorityNavigator:${diagnostic.source}`,
      message: diagnostic.message,
      detail: diagnostic.detail,
    });
  }

  return diagnostics;
}

function determineStatus(
  diagnostics: AuthorityIntegrationDiagnostic[],
  navigation: AuthorityNavigatorResult,
): AuthorityIntegrationStatus {
  if (
    diagnostics.some((diagnostic) => diagnostic.severity === "critical") ||
    diagnostics.some((diagnostic) => diagnostic.code === "AUTH_HUB_EMPTY_INPUT")
  ) {
    return "blocked";
  }

  if (!navigation.authorities.length) return "blocked";

  if (diagnostics.some((diagnostic) => diagnostic.severity === "high")) {
    return "needs-review";
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "medium")) {
    return "partial";
  }

  return "ready";
}

function createIntegrationSummary(
  input: AuthorityIntegrationHubInput,
  navigation: AuthorityNavigatorResult,
): AuthorityIntegrationHubResult["integrationSummary"] {
  return {
    sourceOfTruthPreserved: true,
    retrievalIntegrated: navigation.authorities.length > 0,
    displayIntegrated: navigation.displayGroups.length > 0,
    workflowAware:
      Boolean(input.workflowRoute) ||
      Boolean(input.caseContext?.workflowRoute) ||
      navigation.routes.length > 0,
    brainAware:
      Boolean(input.brainMigrationContext) ||
      Boolean(input.caseContext?.brainMigrationContext),
    litigationReasoningAware:
      Boolean(input.litigationReasoningContext) ||
      Boolean(input.caseContext?.litigationReasoning),
    citationReady: navigation.citationHooks.some((hook) => hook.safeToCite),
    annualPracticeReady: navigation.annualPracticeHooks.length > 0,
    canliiReady: navigation.canliiHooks.length > 0,
  };
}

function createNextActions(
  status: AuthorityIntegrationStatus,
  navigation: AuthorityNavigatorResult,
  diagnostics: AuthorityIntegrationDiagnostic[],
): string[] {
  const actions: string[] = [];

  if (status === "blocked") {
    actions.push(
      "Do not show court-facing authority output until blocking authority diagnostics are resolved.",
    );
  }

  if (!navigation.authorities.length) {
    actions.push(
      "Add or verify registry coverage for the requested topic, court path, stage, or legal domain.",
    );
  }

  if (!navigation.citationHooks.some((hook) => hook.safeToCite)) {
    actions.push(
      "Run citation verification before using authorities in court packages, trial packages, or filed materials.",
    );
  }

  if (
    navigation.normalized.courtPath === "unknown" ||
    navigation.normalized.stage === "unknown"
  ) {
    actions.push(
      "Confirm court path and procedural stage through Workflow or AI Case Partner before final authority guidance.",
    );
  }

  if (
    diagnostics.some(
      (diagnostic) =>
        diagnostic.code === "AUTH_HUB_NO_ANNUAL_PRACTICE_HOOKS",
    )
  ) {
    actions.push(
      "Connect procedural topics to Annual Practice registry hooks as coverage expands.",
    );
  }

  actions.push(
    "Keep pages connected to Authority Intelligence through this hub or downstream adapters; do not hard-code authority cards in UI pages.",
  );

  actions.push(...navigation.nextWorkflowActions);

  return unique(actions);
}

export function createAuthorityIntegrationHub(
  defaultAdapters: AuthorityNavigatorAdapters = {},
) {
  return {
    resolve(input: AuthorityIntegrationHubInput): AuthorityIntegrationHubResult {
      const profile = getConsumerProfile(input.consumer);
      const request = mergeRequestWithProfile(input, profile);
      const adapters = input.adapters ?? defaultAdapters;

      const navigator = createAuthorityNavigator(adapters);
      const navigation = navigator.navigate(request);

      const diagnostics = createIntegrationDiagnostics(
        input,
        navigation,
        profile,
      );

      const status = determineStatus(diagnostics, navigation);

      return {
        version: VERSION,
        status,
        consumer: input.consumer,
        generatedAt: new Date().toISOString(),
        navigation,
        authorities: navigation.authorities,
        displayGroups: navigation.displayGroups,
        diagnostics,
        warnings: unique([
          ...navigation.warnings,
          ...diagnostics
            .filter(
              (diagnostic) =>
                diagnostic.severity === "medium" ||
                diagnostic.severity === "high" ||
                diagnostic.severity === "critical",
            )
            .map((diagnostic) => diagnostic.message),
        ]),
        integrationSummary: createIntegrationSummary(input, navigation),
        nextActions: createNextActions(status, navigation, diagnostics),
        extensionData: {
          ...(input.extensionData ?? {}),
          consumerProfile: profile,
        },
      };
    },

    resolveForLegalPrinciples(
      caseContext: AuthorityNavigatorCaseContext,
      request: Partial<AuthorityNavigatorRequest> = {},
    ): AuthorityIntegrationHubResult {
      return this.resolve({
        consumer: "legal-principles",
        caseContext,
        request,
        sourceSystem: "legal-principles-page",
      });
    },

    resolveForCaseLaw(
      caseContext: AuthorityNavigatorCaseContext,
      request: Partial<AuthorityNavigatorRequest> = {},
    ): AuthorityIntegrationHubResult {
      return this.resolve({
        consumer: "case-law",
        caseContext,
        request,
        sourceSystem: "case-law-page",
      });
    },

    resolveForAiCasePartner(
      caseContext: AuthorityNavigatorCaseContext,
      request: Partial<AuthorityNavigatorRequest> = {},
    ): AuthorityIntegrationHubResult {
      return this.resolve({
        consumer: "ai-case-partner",
        caseContext,
        request,
        sourceSystem: "ai-case-partner",
      });
    },

    resolveForLitigationStrategy(
      caseContext: AuthorityNavigatorCaseContext,
      request: Partial<AuthorityNavigatorRequest> = {},
    ): AuthorityIntegrationHubResult {
      return this.resolve({
        consumer: "litigation-strategy",
        caseContext,
        request,
        sourceSystem: "litigation-strategy",
      });
    },

    resolveForJudgePerspective(
      caseContext: AuthorityNavigatorCaseContext,
      request: Partial<AuthorityNavigatorRequest> = {},
    ): AuthorityIntegrationHubResult {
      return this.resolve({
        consumer: "judge-perspective",
        caseContext,
        request,
        sourceSystem: "judge-perspective",
      });
    },

    resolveForCourtPackage(
      caseContext: AuthorityNavigatorCaseContext,
      request: Partial<AuthorityNavigatorRequest> = {},
    ): AuthorityIntegrationHubResult {
      return this.resolve({
        consumer: "court-package",
        caseContext,
        request,
        sourceSystem: "court-package",
      });
    },

    resolveForTrialPackage(
      caseContext: AuthorityNavigatorCaseContext,
      request: Partial<AuthorityNavigatorRequest> = {},
    ): AuthorityIntegrationHubResult {
      return this.resolve({
        consumer: "trial-package",
        caseContext,
        request,
        sourceSystem: "trial-package",
      });
    },

    resolveForWorkflow(
      caseContext: AuthorityNavigatorCaseContext,
      request: Partial<AuthorityNavigatorRequest> = {},
    ): AuthorityIntegrationHubResult {
      return this.resolve({
        consumer: "workflow",
        caseContext,
        request,
        sourceSystem: "workflow",
        workflowRoute: caseContext.workflowRoute,
      });
    },

    resolveForBrainMigrationLayer(
      caseContext: AuthorityNavigatorCaseContext,
      request: Partial<AuthorityNavigatorRequest> = {},
      brainMigrationContext?: unknown,
    ): AuthorityIntegrationHubResult {
      return this.resolve({
        consumer: "brain-migration-layer",
        caseContext,
        request,
        sourceSystem: "BrainMigrationLayer",
        brainMigrationContext,
      });
    },

    resolveForCaseSystemAssembly(
      caseContext: AuthorityNavigatorCaseContext,
      request: Partial<AuthorityNavigatorRequest> = {},
      caseSystemAssemblyContext?: unknown,
    ): AuthorityIntegrationHubResult {
      return this.resolve({
        consumer: "case-system-assembly",
        caseContext,
        request,
        sourceSystem: "CaseSystemAssembly",
        caseSystemAssemblyContext,
      });
    },
  };
}

export function resolveAuthorityIntegration(
  input: AuthorityIntegrationHubInput,
): AuthorityIntegrationHubResult {
  return createAuthorityIntegrationHub(input.adapters).resolve(input);
}

export function getAuthorityIntegrationConsumerProfile(
  consumer: AuthorityIntegrationConsumer,
): AuthorityIntegrationConsumerProfile {
  return getConsumerProfile(consumer);
}

export function isAuthorityIntegrationCourtReady(
  result: AuthorityIntegrationHubResult,
): boolean {
  return (
    result.status === "ready" &&
    result.integrationSummary.citationReady &&
    result.authorities.length > 0 &&
    !result.diagnostics.some(
      (diagnostic) =>
        diagnostic.severity === "high" ||
        diagnostic.severity === "critical",
    )
  );
}

export function getAuthorityIntegrationWarnings(
  result: AuthorityIntegrationHubResult,
): string[] {
  return result.warnings;
}

export const authorityIntegrationHub = createAuthorityIntegrationHub();