import {
  CaseCourtPath,
  CaseKnowledgeVerificationStatus,
  CaseLegalDomain,
  CaseProvince,
  CaseStage,
} from "../architecture/masterCaseSchema";

import {
  getAuthorityEntriesForContext,
  authorityRequiresWarning,
  buildAuthorityWarning,
  LegalAuthorityRegistryEntry,
} from "./legalAuthorityRegistry";

import {
  KnowledgeRetrievalContext,
  KnowledgeRetrievalResult,
  LegalKnowledgeObject,
  knowledgeObjectMatchesContext,
} from "./legalKnowledgeObjects";

export type KnowledgeRetrievalMode =
  | "verified-only"
  | "safe-guidance"
  | "operational"
  | "internal-diagnostic";

export type KnowledgeRetrievalDecision = {
  objectId: string;
  allowed: boolean;
  reason: string;
  warnings: string[];
};

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function verificationRank(status: CaseKnowledgeVerificationStatus): number {
  const ranks: Record<CaseKnowledgeVerificationStatus, number> = {
    verified: 5,
    "needs-review": 3,
    "outdated-risk": 2,
    "overruled-risk": 1,
    "not-verified": 1,
    "do-not-use": 0,
  };

  return ranks[status] || 0;
}

function normalizeContext(
  context: KnowledgeRetrievalContext,
): Required<
  Pick<
    KnowledgeRetrievalContext,
    "includeOperationalGuidance" | "includeAiInference" | "requiresVerifiedOnly"
  >
> &
  KnowledgeRetrievalContext {
  return {
    ...context,
    includeOperationalGuidance: Boolean(context.includeOperationalGuidance),
    includeAiInference: Boolean(context.includeAiInference),
    requiresVerifiedOnly: Boolean(context.requiresVerifiedOnly),
  };
}

function buildContextWarnings(context: KnowledgeRetrievalContext): string[] {
  const warnings: string[] = [];

  if (!context.jurisdiction || context.jurisdiction === "Unknown") {
    warnings.push(
      "Knowledge retrieval warning: jurisdiction is unknown, so legal sources must not be treated as final.",
    );
  }

  if (!context.courtPath || context.courtPath === "unknown") {
    warnings.push(
      "Knowledge retrieval warning: court path is unknown, so procedural knowledge must remain provisional.",
    );
  }

  if (!context.stage || context.stage === "not-sure") {
    warnings.push(
      "Knowledge retrieval warning: procedural stage is uncertain, so workflow guidance must remain provisional.",
    );
  }

  if (!context.legalDomains || context.legalDomains.length === 0) {
    warnings.push(
      "Knowledge retrieval warning: no active legal domain was provided, so doctrine retrieval may be incomplete.",
    );
  }

  return warnings;
}

function decideObjectAccess(args: {
  object: LegalKnowledgeObject;
  context: KnowledgeRetrievalContext;
  mode: KnowledgeRetrievalMode;
}): KnowledgeRetrievalDecision {
  const { object, context, mode } = args;
  const warnings: string[] = [];

  if (!knowledgeObjectMatchesContext(object, context)) {
    return {
      objectId: object.id,
      allowed: false,
      reason: "Object does not match the retrieval context.",
      warnings: [],
    };
  }

  if (object.source.verificationStatus === "do-not-use") {
    return {
      objectId: object.id,
      allowed: false,
      reason: "Object is marked do-not-use.",
      warnings: object.systemWarnings,
    };
  }

  if (mode === "verified-only" && object.source.verificationStatus !== "verified") {
    return {
      objectId: object.id,
      allowed: false,
      reason: "Verified-only mode blocks unverified knowledge objects.",
      warnings: [
        `${object.title}: blocked because it is not verified.`,
        ...object.systemWarnings,
      ],
    };
  }

  if (
    object.useRules.requiresVerificationBeforeCitation &&
    object.source.verificationStatus !== "verified"
  ) {
    warnings.push(
      `${object.title}: must not be cited until verification is complete.`,
    );
  }

  if (object.useRules.requiresCurrentnessCheck) {
    warnings.push(`${object.title}: requires currentness check.`);
  }

  if (object.useRules.requiresJurisdictionCheck) {
    warnings.push(`${object.title}: requires jurisdiction check.`);
  }

  if (object.useRules.requiresContextCheck) {
    warnings.push(`${object.title}: requires factual/procedural context check.`);
  }

  if (
    object.source.reliabilityTier === "operational" &&
    mode !== "operational" &&
    mode !== "internal-diagnostic"
  ) {
    return {
      objectId: object.id,
      allowed: false,
      reason:
        "Operational guidance is blocked unless operational or internal-diagnostic mode is used.",
      warnings,
    };
  }

  if (
    object.source.reliabilityTier === "inferred" &&
    mode !== "internal-diagnostic"
  ) {
    return {
      objectId: object.id,
      allowed: false,
      reason:
        "AI inference knowledge is blocked unless internal-diagnostic mode is used.",
      warnings,
    };
  }

  return {
    objectId: object.id,
    allowed: true,
    reason: "Object allowed for retrieval context.",
    warnings: uniqueStrings([...warnings, ...object.systemWarnings]),
  };
}

function buildAuthorityContextWarnings(args: {
  courtPath?: CaseCourtPath;
  jurisdiction?: CaseProvince | "Canada" | "Unknown";
  legalDomains?: CaseLegalDomain[];
  stage?: CaseStage;
}): string[] {
  const warnings: string[] = [];

  const authorityEntries: LegalAuthorityRegistryEntry[] =
    getAuthorityEntriesForContext({
      courtPath: args.courtPath,
      jurisdiction: args.jurisdiction,
      legalDomain: args.legalDomains?.[0],
      stage: args.stage,
    });

  for (const entry of authorityEntries) {
    if (authorityRequiresWarning(entry)) {
      warnings.push(buildAuthorityWarning(entry));
    }
  }

  return uniqueStrings(warnings);
}

export function retrieveKnowledgeObjects(args: {
  objects: LegalKnowledgeObject[];
  context: KnowledgeRetrievalContext;
  mode?: KnowledgeRetrievalMode;
}): KnowledgeRetrievalResult {
  const mode = args.mode || "safe-guidance";
  const context = normalizeContext(args.context);

  const decisions = args.objects.map((object) =>
    decideObjectAccess({
      object,
      context,
      mode,
    }),
  );

  const allowedIds = new Set(
    decisions.filter((decision) => decision.allowed).map((decision) => decision.objectId),
  );

  const allowedObjects = args.objects
    .filter((object) => allowedIds.has(object.id))
    .sort(
      (a, b) =>
        verificationRank(b.source.verificationStatus) -
        verificationRank(a.source.verificationStatus),
    );

  const blockedObjects = decisions
    .filter((decision) => !decision.allowed)
    .map((decision) => ({
      objectId: decision.objectId,
      reason: decision.reason,
    }));

  const warnings = uniqueStrings([
    ...buildContextWarnings(context),
    ...buildAuthorityContextWarnings({
      courtPath: context.courtPath,
      jurisdiction: context.jurisdiction,
      legalDomains: context.legalDomains,
      stage: context.stage,
    }),
    ...decisions.flatMap((decision) => decision.warnings),
  ]);

  return {
    context,
    objects: allowedObjects,
    warnings,
    blockedObjects,
  };
}

export function buildKnowledgeRetrievalContext(args: {
  courtPath?: CaseCourtPath;
  jurisdiction?: CaseProvince | "Canada" | "Unknown";
  stage?: CaseStage;
  legalDomains?: CaseLegalDomain[];
  requiresVerifiedOnly?: boolean;
  includeOperationalGuidance?: boolean;
  includeAiInference?: boolean;
}): KnowledgeRetrievalContext {
  return {
    courtPath: args.courtPath,
    jurisdiction: args.jurisdiction,
    stage: args.stage,
    legalDomains: args.legalDomains,
    requiresVerifiedOnly: args.requiresVerifiedOnly,
    includeOperationalGuidance: args.includeOperationalGuidance,
    includeAiInference: args.includeAiInference,
  };
}