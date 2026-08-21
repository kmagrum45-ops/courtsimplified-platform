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

import type {
  AuthorityBindingLevel,
  AuthorityCourtLevel as LegacyAuthorityCourtLevel,
  AuthorityDomain,
  AuthorityMetadata,
  AuthoritySourceType,
} from "../authority/authoritySourceSchema";
import { verifyAuthorities } from "../authority/authorityVerificationEngine";
import { weighAuthorities } from "../authority/authorityWeightEngine";
import { evaluateCitationSafety } from "../authority/citationSafetyEngine";
import { evaluateJurisdictionAuthority } from "../authority/jurisdictionAuthorityEngine";
import type {
  LegalKnowledgePacket,
  LegalSourceReference,
  IntelligenceStage,
  OfficialGuidanceReference,
  PrecedentReference,
  ProceduralRuleReference,
  StatutoryReference,
} from "../intelligence/intelligenceTypes";

export type ProductionAuthorityCandidate = Omit<
  VerifiedAuthorityEntry,
  "sourceReferences"
> & {
  sourceReferences: Array<
    VerifiedAuthorityEntry["sourceReferences"][number] & { sourceUrl?: string }
  >;
  effectiveFrom?: string;
  effectiveTo?: string;
  supersededBy?: string[];
};

export type ProductionAuthorityReadinessResult = {
  context: AuthorityRegistrySearchContext;
  authorities: ProductionAuthorityCandidate[];
  rejected: Array<{ authorityId: string; reasons: string[] }>;
  warnings: string[];
};

type ProductionAuthoritySearchResult = Omit<
  AuthorityRegistrySearchResult,
  "authorities"
> & { authorities: ProductionAuthorityCandidate[] };

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

  if (!entry.appliesAcrossIssueDomains && !includesAny(entry.legalDomains, context.legalDomains)) {
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
  candidateEntries?: ProductionAuthorityCandidate[],
): ProductionAuthoritySearchResult {
  if (candidateEntries && process.env.NODE_ENV === "production") {
    throw new Error("Candidate authority injection is unavailable in production.");
  }
  const registry = getVerifiedAuthoritySeedRegistry();

  const filtered = (candidateEntries || registry.entries).filter((entry) =>
    matchesContext(entry, context),
  );

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
    warnings: uniqueStrings([
      ...(candidateEntries ? [] : registry.warnings),
      ...warnings,
    ]),
  };
}

function sourceTypeFor(entry: VerifiedAuthorityEntry): AuthoritySourceType | undefined {
  if (entry.kind === "case-law") return "case-law";
  if (entry.kind === "statute") return "statute";
  if (entry.kind === "regulation") return "regulation";
  if (entry.kind === "rule") return "rule-of-court";
  if (entry.kind === "practice-direction") return "practice-direction";
  if (entry.kind === "official-guide") return "official-guide";
  return undefined;
}

function courtLevelFor(entry: VerifiedAuthorityEntry): LegacyAuthorityCourtLevel | undefined {
  const levels: Partial<Record<AuthorityCourtLevel, LegacyAuthorityCourtLevel>> = {
    "supreme-court-of-canada": "supreme-court-of-canada",
    "federal-court-of-appeal": "federal-court-of-appeal",
    "federal-court": "federal-court",
    "ontario-court-of-appeal": "provincial-court-of-appeal",
    "ontario-superior-court": "superior-court",
    "ontario-divisional-court": "superior-court",
    "ontario-court-of-justice": "provincial-court",
    "small-claims-court": "provincial-court",
    tribunal: "tribunal",
  };
  return levels[entry.courtLevel];
}

function bindingLevelFor(entry: VerifiedAuthorityEntry): AuthorityBindingLevel {
  if (entry.bindingWeight === "binding") return "binding";
  if (entry.bindingWeight === "highly-persuasive") return "highly-persuasive";
  if (entry.bindingWeight === "persuasive" || entry.bindingWeight === "procedural-guidance") {
    return "persuasive";
  }
  if (entry.bindingWeight === "background") return "limited";
  return "unknown";
}

function authorityDomainFor(domain: string): AuthorityDomain {
  if (domain === "defamation") return "defamation";
  if (domain === "negligence" || domain === "personal-injury") return "negligence";
  if (domain === "contract" || domain === "debt" || domain === "consumer") return "contracts";
  if (domain.startsWith("family-")) return "family";
  if (domain === "civil-charter") return "charter";
  if (domain === "civil-human-rights") return "human-rights";
  if (domain === "civil-institutional-liability") return "institutional-liability";
  if (domain === "employment") return "employment";
  if (domain === "property-damage") return "property";
  if (domain === "procedural") return "procedure";
  return "unknown";
}

function toAuthorityMetadata(entry: ProductionAuthorityCandidate): AuthorityMetadata | undefined {
  const sourceType = sourceTypeFor(entry);
  if (!sourceType) return undefined;

  return {
    id: entry.id,
    title: entry.title,
    sourceType,
    jurisdiction: entry.jurisdiction === "Canada" ? "Canada" : entry.jurisdiction,
    courtLevel: courtLevelFor(entry),
    bindingLevel: bindingLevelFor(entry),
    verificationStatus: entry.verificationStatus === "verified" ? "verified" : "unverified",
    status: "active",
    citation: { citation: entry.citation, neutralCitation: entry.neutralCitation },
    sourceUrl: entry.sourceReferences.find((source) => source.sourceUrl)?.sourceUrl,
    decisionDate: entry.year ? `${entry.year}-01-01` : undefined,
    domains: entry.legalDomains.map(authorityDomainFor),
    keywords: uniqueStrings([...entry.topicTags, ...entry.doctrineTags]),
    summary: entry.corePrinciple,
    practicalMeaning: entry.plainLanguageSummary,
    proceduralImpact: entry.workflowLinks.map((link) => link.reason),
    evidenceImpact: entry.evidenceImplications.flatMap((item) => item.evidenceUsuallyNeeded),
    burdenImpact: entry.legalTestElements.map((item) => item.burdenRelevance),
    strategicImpact: entry.practicalUse,
    limitations: entry.limitsAndWarnings,
    warnings: entry.limitsAndWarnings,
    relatedAuthorities: [],
    confidence: entry.confidence === "high" ? 0.9 : entry.confidence === "medium" ? 0.7 : 0.5,
  };
}

function isHttpsUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function parsedDate(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function readinessReasons(
  entry: ProductionAuthorityCandidate,
  context: AuthorityRegistrySearchContext,
  asOf: Date,
): string[] {
  const reasons: string[] = [];
  const source = entry.sourceReferences.find((item) => isHttpsUrl(item.sourceUrl));
  const metadata = toAuthorityMetadata(entry);
  const lastVerifiedAt = parsedDate(entry.lastVerifiedAt);
  const effectiveFrom = parsedDate(entry.effectiveFrom);
  const effectiveTo = parsedDate(entry.effectiveTo);

  if (entry.verificationStatus !== "verified") reasons.push("Authority is not verified.");
  if (entry.displayMode === "internal-only" || entry.displayMode === "do-not-display") reasons.push("Authority is not display-safe.");
  if (!entry.aiUseRules.canShowToUser || !entry.aiUseRules.canUseForReasoning) reasons.push("Authority use rules block production use.");
  if (!source) reasons.push("A direct resolvable HTTPS source URL is missing.");
  if (!source?.pinpoint?.trim()) reasons.push("A supporting pinpoint, rule, section, or paragraph is missing.");
  if (!entry.citation.trim()) reasons.push("A non-empty citation is missing.");
  if (lastVerifiedAt === undefined) reasons.push("A valid last-verification date is missing.");
  else if (lastVerifiedAt > asOf.getTime()) reasons.push("The last-verification date is in the future.");
  if (!metadata || metadata.bindingLevel === "unknown") reasons.push("Authority type or weight is not recognized.");
  if (entry.verificationStatus === "limited-use" || entry.verificationStatus === "outdated-risk" || entry.verificationStatus === "overruled-risk") reasons.push("Authority status is limited or unsafe.");
  if (entry.relatedAuthorities.overruledBy.length || entry.relatedAuthorities.limitedBy.length) reasons.push("Authority has negative or limiting treatment recorded.");
  if (entry.supersededBy?.length) reasons.push("Authority is superseded.");
  if (entry.effectiveFrom && effectiveFrom === undefined) reasons.push("The effective-from date is invalid.");
  else if (effectiveFrom !== undefined && effectiveFrom > asOf.getTime()) reasons.push("Authority is not yet effective.");
  if (entry.effectiveTo && effectiveTo === undefined) reasons.push("The effective-to date is invalid.");
  else if (effectiveTo !== undefined && effectiveTo < asOf.getTime()) reasons.push("Authority is expired.");

  if (metadata) {
    const verification = verifyAuthorities([metadata]).results[0];
    const weight = weighAuthorities({ authorities: [metadata], targetJurisdiction: context.jurisdiction === "Ontario" ? "Ontario" : "Unknown" }).results[0];
    const citation = evaluateCitationSafety({ authorities: [metadata], context: "legal-analysis" }).results[0];
    const jurisdiction = evaluateJurisdictionAuthority({ authorities: [metadata], targetJurisdiction: context.jurisdiction === "Ontario" ? "Ontario" : "Unknown" }).results[0];
    if (!verification?.verified || !verification.citationSafe) reasons.push("Existing authority verification gate did not pass.");
    if (!weight || weight.weightGrade === "unsafe" || !weight.citationSafe) reasons.push("Existing authority-weight gate did not pass.");
    if (!citation?.safeToCite || citation.safetyLevel !== "safe") reasons.push("Existing citation-safety gate did not pass.");
    if (!jurisdiction?.usableInTargetJurisdiction || jurisdiction.jurisdictionFit === "wrong-jurisdiction") reasons.push("Existing jurisdiction gate did not pass.");
  }

  return uniqueStrings(reasons);
}

export function retrieveProductionReadyAuthorities(args: {
  context: AuthorityRegistrySearchContext;
  candidateEntries?: ProductionAuthorityCandidate[];
  asOf?: Date;
}): ProductionAuthorityReadinessResult {
  const context = { ...args.context, requireVerified: true, includeUnverified: false, includeInternalOnly: false };
  const retrieval = retrieveVerifiedAuthorities(context, args.candidateEntries);
  const rejected: ProductionAuthorityReadinessResult["rejected"] = [];
  const accepted: ProductionAuthorityCandidate[] = [];
  const seen = new Set<string>();

  for (const entry of retrieval.authorities) {
    const reasons = readinessReasons(entry, context, args.asOf || new Date());
    const source = entry.sourceReferences.find((item) => isHttpsUrl(item.sourceUrl));
    const key = `${entry.citation.trim().toLowerCase()}|${source?.pinpoint?.trim().toLowerCase() || ""}|${entry.corePrinciple.trim().toLowerCase()}`;
    if (seen.has(key)) reasons.push("Duplicate authority proposition.");
    if (reasons.length) rejected.push({ authorityId: entry.id, reasons: uniqueStrings(reasons) });
    else { seen.add(key); accepted.push(entry); }
  }

  return {
    context,
    authorities: accepted,
    rejected,
    warnings: accepted.length
      ? []
      : ["No production-ready verified authority was available for the current Ontario case context."],
  };
}

function sourceName(entry: VerifiedAuthorityEntry): LegalSourceReference["sourceName"] {
  const type = entry.sourceReferences[0]?.sourceType;
  if (type === "canlii") return "CanLII";
  if (type === "scc") return "Court Website";
  if (type === "ontario-elaws") return "Statute Database";
  if (type === "official-court" || type === "practice-direction" || type === "court-form") return "Court Website";
  return "Unknown";
}

function authorityLevel(entry: VerifiedAuthorityEntry): LegalSourceReference["authorityLevel"] {
  if (entry.kind === "statute") return "statute";
  if (entry.kind === "regulation") return "regulation";
  if (entry.kind === "rule") return "rule-of-court";
  if (entry.kind === "practice-direction") return "rule-of-court";
  if (entry.kind === "official-guide") return "official-guide";
  if (entry.courtLevel === "supreme-court-of-canada") return "scc-binding";
  if (entry.courtLevel === "ontario-court-of-appeal") return "court-of-appeal-binding";
  if (entry.courtLevel === "tribunal") return "tribunal-persuasive";
  return "superior-court-persuasive";
}

function intelligenceStages(entry: VerifiedAuthorityEntry): IntelligenceStage[] {
  const supported = new Set<IntelligenceStage>([
    "starting-case", "responding", "already-started", "conference", "motion",
    "trial", "enforcement", "appeal", "urgent", "settlement", "not-sure",
  ]);
  return entry.proceduralStages.filter(
    (stage): stage is IntelligenceStage => supported.has(stage as IntelligenceStage),
  );
}

function commonReference(entry: ProductionAuthorityCandidate): LegalSourceReference {
  const source = entry.sourceReferences.find((item) => isHttpsUrl(item.sourceUrl))!;
  return {
    id: entry.id,
    title: entry.title,
    citation: `${entry.citation}, ${source.pinpoint}`,
    sourceUrl: source.sourceUrl,
    sourceName: sourceName(entry),
    jurisdiction: entry.jurisdiction,
    authorityLevel: authorityLevel(entry),
    verificationStatus: "verified",
    lastVerifiedAt: entry.lastVerifiedAt,
    legalDomains: entry.legalDomains,
    summary: entry.corePrinciple,
    useLimits: entry.limitsAndWarnings,
    doNotUseFor: entry.aiUseRules.prohibitedUses,
  };
}

export function buildProductionReadyLegalKnowledge(args: {
  context: AuthorityRegistrySearchContext;
  candidateEntries?: ProductionAuthorityCandidate[];
  asOf?: Date;
}): LegalKnowledgePacket {
  const ready = retrieveProductionReadyAuthorities(args);
  const statutes: StatutoryReference[] = [];
  const proceduralRules: ProceduralRuleReference[] = [];
  const precedents: PrecedentReference[] = [];
  const officialGuidance: OfficialGuidanceReference[] = [];

  for (const entry of ready.authorities) {
    const common = commonReference(entry);
    if (entry.kind === "case-law") {
      precedents.push({ ...common, neutralCitation: entry.neutralCitation, court: entry.courtLevel, year: entry.year, coreHolding: entry.corePrinciple, materialFacts: [], legalTest: entry.legalTestElements.map((item) => item.label), supports: entry.howCourtsUseIt, limits: entry.limitsAndWarnings, distinguishingFactors: [], requiredFactPattern: entry.legalTestElements.flatMap((item) => item.proofNeeded), riskIfMisused: entry.commonMistakes });
    } else if (entry.kind === "statute" || entry.kind === "regulation") {
      statutes.push({ ...common, statuteName: entry.title, section: entry.sourceReferences[0]?.pinpoint, provisionTextSummary: entry.corePrinciple, requiredConditions: entry.legalTestElements.map((item) => item.label), proceduralEffect: entry.workflowLinks.map((item) => item.reason), remediesAffected: [] });
    } else if (entry.kind === "rule" || entry.kind === "practice-direction") {
      proceduralRules.push({ ...common, ruleSetName: entry.title, ruleNumber: entry.sourceReferences[0]?.pinpoint, appliesToStages: intelligenceStages(entry), deadlineRelated: entry.topicTags.some((tag) => tag.toLowerCase().includes("deadline")), serviceRelated: entry.topicTags.some((tag) => tag.toLowerCase().includes("service")), filingRelated: entry.topicTags.some((tag) => tag.toLowerCase().includes("filing")), evidenceRelated: entry.legalDomains.includes("procedural"), practicalEffect: entry.workflowLinks.map((item) => item.reason) });
    } else if (entry.kind === "official-guide") {
      officialGuidance.push({ ...common, guidanceClassification: "official-guidance", isBinding: false, canShowToUser: entry.aiUseRules.canShowToUser, canUseForReasoning: entry.aiUseRules.canUseForReasoning, appliesToStages: intelligenceStages(entry), practicalEffect: entry.workflowLinks.map((item) => item.reason) });
    }
  }

  return { statutes, proceduralRules, precedents, officialGuidance, precedentMatches: [], sourceWarnings: ready.warnings };
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
