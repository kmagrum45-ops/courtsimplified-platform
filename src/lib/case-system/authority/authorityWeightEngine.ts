import {
  AuthorityBindingLevel,
  AuthorityCourtLevel,
  AuthorityJurisdiction,
  AuthorityMetadata,
  AuthoritySourceType,
} from "./authoritySourceSchema";

import {
  AuthorityVerificationResult,
  verifyAuthorities,
} from "./authorityVerificationEngine";

export type AuthorityWeightGrade =
  | "controlling"
  | "strong"
  | "moderate"
  | "limited"
  | "unsafe";

export type AuthorityWeightResult = {
  authorityId: string;
  weightScore: number;
  weightGrade: AuthorityWeightGrade;
  bindingLevel: AuthorityBindingLevel;
  jurisdictionFit: "exact" | "federal" | "related" | "mismatch" | "unknown";
  courtLevelFit:
    | "highest"
    | "appeal"
    | "trial"
    | "tribunal"
    | "non-court"
    | "unknown";
  citationSafe: boolean;
  verified: boolean;
  requiresManualReview: boolean;
  useRecommendation: string;
  warnings: string[];
};

export type AuthorityWeightEngineInput = {
  authorities: AuthorityMetadata[];
  targetJurisdiction?: AuthorityJurisdiction;
};

export type AuthorityWeightEngineOutput = {
  results: AuthorityWeightResult[];
  strongestAuthorityIds: string[];
  unsafeAuthorityIds: string[];
  warnings: string[];
};

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function gradeFromScore(score: number): AuthorityWeightGrade {
  if (score >= 90) return "controlling";
  if (score >= 75) return "strong";
  if (score >= 55) return "moderate";
  if (score >= 25) return "limited";
  return "unsafe";
}

function scoreBindingLevel(bindingLevel: AuthorityBindingLevel): number {
  if (bindingLevel === "constitutional") return 100;
  if (bindingLevel === "binding") return 92;
  if (bindingLevel === "highly-persuasive") return 78;
  if (bindingLevel === "persuasive") return 62;
  if (bindingLevel === "limited") return 40;
  if (bindingLevel === "not-authoritative") return 10;
  return 20;
}

function scoreSourceType(sourceType: AuthoritySourceType): number {
  if (sourceType === "constitution") return 100;
  if (sourceType === "charter") return 100;
  if (sourceType === "statute") return 95;
  if (sourceType === "regulation") return 90;
  if (sourceType === "rule-of-court") return 88;
  if (sourceType === "practice-direction") return 78;
  if (sourceType === "official-form") return 75;
  if (sourceType === "official-guide") return 65;
  if (sourceType === "case-law") return 75;
  if (sourceType === "tribunal-decision") return 45;
  if (sourceType === "policy") return 25;
  if (sourceType === "secondary-source") return 15;
  return 10;
}

function scoreCourtLevel(courtLevel?: AuthorityCourtLevel): number {
  if (courtLevel === "supreme-court-of-canada") return 100;
  if (courtLevel === "federal-court-of-appeal") return 90;
  if (courtLevel === "provincial-court-of-appeal") return 90;
  if (courtLevel === "federal-court") return 78;
  if (courtLevel === "superior-court") return 75;
  if (courtLevel === "provincial-court") return 55;
  if (courtLevel === "tribunal") return 40;
  if (courtLevel === "unknown") return 20;
  return 50;
}

function jurisdictionFit(args: {
  authority: AuthorityMetadata;
  targetJurisdiction?: AuthorityJurisdiction;
}): AuthorityWeightResult["jurisdictionFit"] {
  const target = args.targetJurisdiction;
  const authorityJurisdiction = args.authority.jurisdiction;

  if (!target || target === "Unknown") return "unknown";

  if (authorityJurisdiction === target) return "exact";

  if (authorityJurisdiction === "Canada" || authorityJurisdiction === "Federal") {
    return "federal";
  }

  if (authorityJurisdiction === "Unknown") return "unknown";

  return "mismatch";
}

function scoreJurisdictionFit(
  fit: AuthorityWeightResult["jurisdictionFit"],
): number {
  if (fit === "exact") return 100;
  if (fit === "federal") return 92;
  if (fit === "related") return 65;
  if (fit === "unknown") return 45;
  return 15;
}

function courtLevelFit(
  courtLevel?: AuthorityCourtLevel,
): AuthorityWeightResult["courtLevelFit"] {
  if (courtLevel === "supreme-court-of-canada") return "highest";

  if (
    courtLevel === "federal-court-of-appeal" ||
    courtLevel === "provincial-court-of-appeal"
  ) {
    return "appeal";
  }

  if (
    courtLevel === "federal-court" ||
    courtLevel === "superior-court" ||
    courtLevel === "provincial-court"
  ) {
    return "trial";
  }

  if (courtLevel === "tribunal") return "tribunal";
  if (!courtLevel) return "non-court";
  return "unknown";
}

function applyVerificationPenalty(args: {
  baseScore: number;
  verification: AuthorityVerificationResult;
}): number {
  let score = args.baseScore;

  if (!args.verification.verified) score -= 20;
  if (!args.verification.citationSafe) score -= 25;
  if (args.verification.requiresManualReview) score -= 10;

  return clampScore(score);
}

function buildUseRecommendation(result: {
  grade: AuthorityWeightGrade;
  verified: boolean;
  citationSafe: boolean;
  requiresManualReview: boolean;
}): string {
  if (!result.citationSafe) {
    return "Do not cite until the source is reviewed and citation safety is restored.";
  }

  if (!result.verified) {
    return "Use only as a research lead until verified.";
  }

  if (result.requiresManualReview) {
    return "Use cautiously and review before including in generated legal documents.";
  }

  if (result.grade === "controlling") {
    return "High-priority authority. Prefer this authority where factually and procedurally applicable.";
  }

  if (result.grade === "strong") {
    return "Strong authority. Useful for legal analysis and drafting if applicable.";
  }

  if (result.grade === "moderate") {
    return "Moderate authority. Use as support, not as the central authority if stronger sources exist.";
  }

  if (result.grade === "limited") {
    return "Limited authority. Use cautiously and avoid relying on it alone.";
  }

  return "Unsafe authority. Do not rely on it.";
}

function weightSingleAuthority(args: {
  authority: AuthorityMetadata;
  verification: AuthorityVerificationResult;
  targetJurisdiction?: AuthorityJurisdiction;
}): AuthorityWeightResult {
  const fit = jurisdictionFit({
    authority: args.authority,
    targetJurisdiction: args.targetJurisdiction,
  });

  const baseScore = Math.round(
    scoreBindingLevel(args.verification.bindingLevel) * 0.35 +
      scoreSourceType(args.authority.sourceType) * 0.2 +
      scoreCourtLevel(args.authority.courtLevel) * 0.25 +
      scoreJurisdictionFit(fit) * 0.2,
  );

  const finalScore = applyVerificationPenalty({
    baseScore,
    verification: args.verification,
  });

  const grade = gradeFromScore(finalScore);

  const warnings = uniqueStrings([
    ...args.verification.warnings,
    fit === "mismatch"
      ? "Authority jurisdiction does not match the target jurisdiction."
      : "",
    fit === "unknown" ? "Jurisdiction fit could not be confirmed." : "",
    finalScore < 55 ? "Authority has limited or unsafe litigation weight." : "",
  ]);

  return {
    authorityId: args.authority.id,
    weightScore: finalScore,
    weightGrade: grade,
    bindingLevel: args.verification.bindingLevel,
    jurisdictionFit: fit,
    courtLevelFit: courtLevelFit(args.authority.courtLevel),
    citationSafe: args.verification.citationSafe,
    verified: args.verification.verified,
    requiresManualReview: args.verification.requiresManualReview,
    useRecommendation: buildUseRecommendation({
      grade,
      verified: args.verification.verified,
      citationSafe: args.verification.citationSafe,
      requiresManualReview: args.verification.requiresManualReview,
    }),
    warnings,
  };
}

export function weighAuthorities(
  input: AuthorityWeightEngineInput,
): AuthorityWeightEngineOutput {
  const verificationOutput = verifyAuthorities(input.authorities);

  const verificationById = new Map(
    verificationOutput.results.map((result) => [result.authorityId, result]),
  );

  const results = input.authorities.map((authority) => {
    const verification = verificationById.get(authority.id);

    if (!verification) {
      return {
        authorityId: authority.id,
        weightScore: 0,
        weightGrade: "unsafe" as AuthorityWeightGrade,
        bindingLevel: authority.bindingLevel,
        jurisdictionFit: "unknown" as const,
        courtLevelFit: "unknown" as const,
        citationSafe: false,
        verified: false,
        requiresManualReview: true,
        useRecommendation:
          "Do not rely on this authority because verification failed.",
        warnings: ["Authority verification result was missing."],
      };
    }

    return weightSingleAuthority({
      authority,
      verification,
      targetJurisdiction: input.targetJurisdiction,
    });
  });

  const strongestAuthorityIds = results
    .filter(
      (result) =>
        result.weightGrade === "controlling" || result.weightGrade === "strong",
    )
    .sort((a, b) => b.weightScore - a.weightScore)
    .map((result) => result.authorityId);

  const unsafeAuthorityIds = results
    .filter((result) => result.weightGrade === "unsafe" || !result.citationSafe)
    .map((result) => result.authorityId);

  return {
    results,
    strongestAuthorityIds,
    unsafeAuthorityIds,
    warnings: uniqueStrings(results.flatMap((result) => result.warnings)),
  };
}