import {
  AuthorityJurisdiction,
  AuthorityMetadata,
} from "./authoritySourceSchema";

import {
  AuthorityWeightResult,
  weighAuthorities,
} from "./authorityWeightEngine";

import {
  CitationSafetyResult,
  evaluateCitationSafety,
} from "./citationSafetyEngine";

export type JurisdictionAuthorityFit =
  | "directly-applicable"
  | "federal-applicable"
  | "persuasive-only"
  | "wrong-jurisdiction"
  | "unknown";

export type JurisdictionAuthorityResult = {
  authorityId: string;
  targetJurisdiction: AuthorityJurisdiction;
  authorityJurisdiction: AuthorityJurisdiction;
  jurisdictionFit: JurisdictionAuthorityFit;
  usableInTargetJurisdiction: boolean;
  shouldPreferLocalAuthority: boolean;
  weightScore: number;
  citationSafe: boolean;
  safeToCite: boolean;
  warnings: string[];
  recommendation: string;
};

export type JurisdictionAuthorityEngineInput = {
  authorities: AuthorityMetadata[];
  targetJurisdiction: AuthorityJurisdiction;
};

export type JurisdictionAuthorityEngineOutput = {
  results: JurisdictionAuthorityResult[];
  directlyApplicableAuthorityIds: string[];
  persuasiveOnlyAuthorityIds: string[];
  wrongJurisdictionAuthorityIds: string[];
  warnings: string[];
};

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function determineJurisdictionFit(args: {
  authorityJurisdiction: AuthorityJurisdiction;
  targetJurisdiction: AuthorityJurisdiction;
}): JurisdictionAuthorityFit {
  if (
    args.targetJurisdiction === "Unknown" ||
    args.authorityJurisdiction === "Unknown"
  ) {
    return "unknown";
  }

  if (args.authorityJurisdiction === args.targetJurisdiction) {
    return "directly-applicable";
  }

  if (
    args.authorityJurisdiction === "Canada" ||
    args.authorityJurisdiction === "Federal"
  ) {
    return "federal-applicable";
  }

  return "wrong-jurisdiction";
}

function getRecommendation(args: {
  fit: JurisdictionAuthorityFit;
  authorityJurisdiction: AuthorityJurisdiction;
  targetJurisdiction: AuthorityJurisdiction;
  safeToCite: boolean;
}): string {
  if (!args.safeToCite) {
    return "Do not cite until citation safety and jurisdiction fit are reviewed.";
  }

  if (args.fit === "directly-applicable") {
    return "Authority is directly applicable in the target jurisdiction.";
  }

  if (args.fit === "federal-applicable") {
    return "Authority may apply nationally or federally, but confirm procedural fit.";
  }

  if (args.fit === "persuasive-only") {
    return "Authority may be persuasive only. Prefer direct local authority if available.";
  }

  if (args.fit === "wrong-jurisdiction") {
    return `Authority is from ${args.authorityJurisdiction}, not ${args.targetJurisdiction}. Prefer local or binding authority.`;
  }

  return "Jurisdiction fit is unknown and requires review.";
}

function shouldPreferLocalAuthority(args: {
  fit: JurisdictionAuthorityFit;
  authorityJurisdiction: AuthorityJurisdiction;
  targetJurisdiction: AuthorityJurisdiction;
}): boolean {
  if (args.targetJurisdiction === "Unknown") return true;
  if (args.fit === "directly-applicable") return false;
  if (args.fit === "federal-applicable") return false;
  return true;
}

function buildResult(args: {
  authority: AuthorityMetadata;
  targetJurisdiction: AuthorityJurisdiction;
  weight?: AuthorityWeightResult;
  citation?: CitationSafetyResult;
}): JurisdictionAuthorityResult {
  const fit = determineJurisdictionFit({
    authorityJurisdiction: args.authority.jurisdiction,
    targetJurisdiction: args.targetJurisdiction,
  });

  const safeToCite = Boolean(args.citation?.safeToCite);
  const citationSafe = Boolean(args.citation?.citationSafe);
  const usableInTargetJurisdiction =
    fit === "directly-applicable" || fit === "federal-applicable";

  const warnings = uniqueStrings([
    ...(args.weight?.warnings || []),
    ...(args.citation?.warnings || []),
    fit === "wrong-jurisdiction"
      ? "Authority is not from the target jurisdiction."
      : "",
    fit === "unknown"
      ? "Jurisdiction fit could not be confirmed."
      : "",
    !safeToCite
      ? "Authority is not currently safe to cite."
      : "",
  ]);

  return {
    authorityId: args.authority.id,
    targetJurisdiction: args.targetJurisdiction,
    authorityJurisdiction: args.authority.jurisdiction,
    jurisdictionFit: fit,
    usableInTargetJurisdiction,
    shouldPreferLocalAuthority: shouldPreferLocalAuthority({
      fit,
      authorityJurisdiction: args.authority.jurisdiction,
      targetJurisdiction: args.targetJurisdiction,
    }),
    weightScore: args.weight?.weightScore || 0,
    citationSafe,
    safeToCite,
    warnings,
    recommendation: getRecommendation({
      fit,
      authorityJurisdiction: args.authority.jurisdiction,
      targetJurisdiction: args.targetJurisdiction,
      safeToCite,
    }),
  };
}

export function evaluateJurisdictionAuthority(
  input: JurisdictionAuthorityEngineInput,
): JurisdictionAuthorityEngineOutput {
  const weightOutput = weighAuthorities({
    authorities: input.authorities,
    targetJurisdiction: input.targetJurisdiction,
  });

  const citationOutput = evaluateCitationSafety({
    authorities: input.authorities,
    context: "legal-analysis",
  });

  const weightMap = new Map(
    weightOutput.results.map((result) => [result.authorityId, result]),
  );

  const citationMap = new Map(
    citationOutput.results.map((result) => [result.authorityId, result]),
  );

  const results = input.authorities.map((authority) =>
    buildResult({
      authority,
      targetJurisdiction: input.targetJurisdiction,
      weight: weightMap.get(authority.id),
      citation: citationMap.get(authority.id),
    }),
  );

  return {
    results,
    directlyApplicableAuthorityIds: results
      .filter((result) => result.jurisdictionFit === "directly-applicable")
      .map((result) => result.authorityId),
    persuasiveOnlyAuthorityIds: results
      .filter((result) => result.jurisdictionFit === "persuasive-only")
      .map((result) => result.authorityId),
    wrongJurisdictionAuthorityIds: results
      .filter((result) => result.jurisdictionFit === "wrong-jurisdiction")
      .map((result) => result.authorityId),
    warnings: uniqueStrings(results.flatMap((result) => result.warnings)),
  };
}