import {
  AuthorityBindingWeight,
  AuthorityCourtLevel,
  AuthorityRegistryRankingResult,
  AuthorityRegistrySearchContext,
  AuthorityRegistrySearchResult,
  AuthorityVerificationStatus,
  VerifiedAuthorityEntry,
} from "./authorityRegistryArchitecture";

import {
  getVerifiedAuthoritySeedRegistry,
} from "./verifiedAuthoritySeedRegistry";

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function includesAny<T extends string>(source: T[] | undefined, targets: T[] | undefined): boolean {
  if (!targets || targets.length === 0) return true;
  if (!source || source.length === 0) return false;
  return targets.some((target) => source.includes(target));
}

function statusRank(status: AuthorityVerificationStatus): number {
  const ranks: Record<AuthorityVerificationStatus, number> = {
    verified: 100,
    "needs-review": 70,
    "limited-use": 55,
    "source-pending": 40,
    "outdated-risk": 25,
    "overruled-risk": 10,
    "do-not-use": 0,
  };

  return ranks[status] ?? 0;
}

function bindingRank(weight: AuthorityBindingWeight): number {
  const ranks: Record<AuthorityBindingWeight, number> = {
    binding: 100,
    "highly-persuasive": 80,
    persuasive: 60,
    "procedural-guidance": 55,
    background: 30,
    unknown: 10,
  };

  return ranks[weight] ?? 0;
}

function courtLevelRank(level: AuthorityCourtLevel): number {
  const ranks: Record<AuthorityCourtLevel, number> = {
    "supreme-court-of-canada": 100,
    "ontario-court-of-appeal": 90,
    "ontario-divisional-court": 75,
    "ontario-superior-court": 70,
    "small-claims-court": 60,
    "ontario-court-of-justice": 55,
    "federal-court-of-appeal": 80,
    "federal-court": 65,
    tribunal: 45,
    other: 25,
    unknown: 10,
  };

  return ranks[level] ?? 0;
}

function isUnsafe(entry: VerifiedAuthorityEntry): boolean {
  return (
    entry.verificationStatus === "do-not-use" ||
    entry.displayMode === "do-not-display" ||
    entry.aiUseRules.canShowToUser === false ||
    entry.aiUseRules.canUseForReasoning === false
  );
}

function matchesContext(
  entry: VerifiedAuthorityEntry,
  context: AuthorityRegistrySearchContext,
): boolean {
  if (context.requireVerified && entry.verificationStatus !== "verified") {
    return false;
  }

  if (!context.includeUnverified && entry.verificationStatus !== "verified") {
    return false;
  }

  if (!context.includeInternalOnly && entry.displayMode === "internal-only") {
    return false;
  }

  if (isUnsafe(entry)) {
    return false;
  }

  if (
    context.courtPath &&
    entry.courtPaths.length > 0 &&
    !entry.courtPaths.includes(context.courtPath)
  ) {
    return false;
  }

  if (
    context.stage &&
    entry.proceduralStages.length > 0 &&
    !entry.proceduralStages.includes(context.stage)
  ) {
    return false;
  }

  if (
    context.jurisdiction &&
    context.jurisdiction !== "Unknown" &&
    entry.jurisdiction !== "Canada" &&
    entry.jurisdiction !== context.jurisdiction
  ) {
    return false;
  }

  if (!includesAny(entry.legalDomains, context.legalDomains)) {
    return false;
  }

  if (context.topicTags && context.topicTags.length > 0) {
    const allTags = [
      ...entry.topicTags,
      ...entry.doctrineTags,
      ...entry.ruleReferences,
      ...entry.statuteReferences,
      ...entry.formReferences,
    ].map((item) => item.toLowerCase());

    const hasTag = context.topicTags.some((tag) =>
      allTags.some((existingTag) => existingTag.includes(tag.toLowerCase())),
    );

    if (!hasTag) return false;
  }

  return true;
}

function scoreAuthority(
  entry: VerifiedAuthorityEntry,
  context: AuthorityRegistrySearchContext,
): AuthorityRegistryRankingResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  let score = 0;

  const verificationScore = statusRank(entry.verificationStatus);
  score += verificationScore * 0.3;

  if (entry.verificationStatus === "verified") {
    reasons.push("Verified authority.");
  } else {
    warnings.push(`${entry.shortTitle} is not fully verified.`);
  }

  const bindingScore = bindingRank(entry.bindingWeight);
  score += bindingScore * 0.2;

  if (entry.bindingWeight === "binding") {
    reasons.push("Binding authority for applicable Canadian/Ontario context.");
  }

  const courtScore = courtLevelRank(entry.courtLevel);
  score += courtScore * 0.15;

  if (entry.courtLevel === "supreme-court-of-canada") {
    reasons.push("Supreme Court of Canada authority.");
  }

  score += Math.min(Math.max(entry.importanceScore, 0), 100) * 0.2;

  if (context.legalDomains && includesAny(entry.legalDomains, context.legalDomains)) {
    score += 10;
    reasons.push("Matches requested legal domain.");
  }

  if (context.courtPath && entry.courtPaths.includes(context.courtPath)) {
    score += 6;
    reasons.push("Matches court path.");
  }

  if (context.stage && entry.proceduralStages.includes(context.stage)) {
    score += 5;
    reasons.push("Matches procedural stage.");
  }

  if (
    context.jurisdiction &&
    (entry.jurisdiction === context.jurisdiction || entry.jurisdiction === "Canada")
  ) {
    score += 5;
    reasons.push("Matches jurisdiction or is Canada-wide binding authority.");
  }

  if (context.topicTags && context.topicTags.length > 0) {
    const lowerTags = [
      ...entry.topicTags,
      ...entry.doctrineTags,
      ...entry.ruleReferences,
      ...entry.statuteReferences,
      ...entry.formReferences,
    ].map((item) => item.toLowerCase());

    const matchedTags = context.topicTags.filter((tag) =>
      lowerTags.some((existingTag) => existingTag.includes(tag.toLowerCase())),
    );

    if (matchedTags.length > 0) {
      score += matchedTags.length * 4;
      reasons.push(`Matches topic tag(s): ${matchedTags.join(", ")}.`);
    }
  }

  if (entry.aiUseRules.mustExplainLimits) {
    warnings.push(`${entry.shortTitle}: explain limits before relying on it.`);
  }

  if (entry.aiUseRules.mustAskContextQuestions) {
    warnings.push(`${entry.shortTitle}: ask context questions before applying it.`);
  }

  if (entry.aiUseRules.mustVerifyBeforeCitation) {
    warnings.push(`${entry.shortTitle}: verify source before citation.`);
  }

  return {
    authorityId: entry.id,
    score: Math.round(score),
    reasons: uniqueStrings(reasons),
    warnings: uniqueStrings(warnings),
    displayRecommended:
      entry.displayMode !== "do-not-display" &&
      entry.displayMode !== "internal-only" &&
      entry.aiUseRules.canShowToUser &&
      entry.verificationStatus === "verified",
  };
}

function buildGlobalWarnings(args: {
  context: AuthorityRegistrySearchContext;
  results: VerifiedAuthorityEntry[];
  rankings: AuthorityRegistryRankingResult[];
}): string[] {
  const warnings: string[] = [];

  if (!args.context.legalDomains || args.context.legalDomains.length === 0) {
    warnings.push("Authority retrieval warning: no legal domain was provided.");
  }

  if (!args.context.jurisdiction || args.context.jurisdiction === "Unknown") {
    warnings.push(
      "Authority retrieval warning: jurisdiction is unknown, so authority relevance may be incomplete.",
    );
  }

  if (args.results.length === 0) {
    warnings.push("No verified authorities matched the current retrieval context.");
  }

  const rankingWarnings = args.rankings.flatMap((ranking) => ranking.warnings);

  return uniqueStrings([...warnings, ...rankingWarnings]);
}

export function retrieveVerifiedAuthorities(
  context: AuthorityRegistrySearchContext,
): AuthorityRegistrySearchResult {
  const registry = getVerifiedAuthoritySeedRegistry();

  const filtered = registry.entries.filter((entry) => matchesContext(entry, context));

  const rankings = filtered
    .map((entry) => scoreAuthority(entry, context))
    .sort((a, b) => b.score - a.score);

  const rankingMap = new Map(rankings.map((ranking) => [ranking.authorityId, ranking]));

  const authorities = filtered.sort((a, b) => {
    const aScore = rankingMap.get(a.id)?.score ?? 0;
    const bScore = rankingMap.get(b.id)?.score ?? 0;
    return bScore - aScore;
  });

  const warnings = buildGlobalWarnings({
    context,
    results: authorities,
    rankings,
  });

  return {
    context,
    authorities,
    rankings,
    warnings: uniqueStrings([...registry.warnings, ...warnings]),
  };
}

export function retrieveTopVerifiedAuthorities(
  context: AuthorityRegistrySearchContext,
  limit = 5,
): AuthorityRegistrySearchResult {
  const result = retrieveVerifiedAuthorities(context);

  const allowedIds = new Set(
    result.rankings
      .filter((ranking) => ranking.displayRecommended)
      .slice(0, limit)
      .map((ranking) => ranking.authorityId),
  );

  return {
    ...result,
    authorities: result.authorities.filter((entry) => allowedIds.has(entry.id)),
    rankings: result.rankings.filter((ranking) => allowedIds.has(ranking.authorityId)),
  };
}

export function getAuthorityById(id: string): VerifiedAuthorityEntry | undefined {
  const registry = getVerifiedAuthoritySeedRegistry();
  return registry.entries.find((entry) => entry.id === id);
}

export function getAuthorityTopicGroups() {
  return getVerifiedAuthoritySeedRegistry().topicGroups;
}