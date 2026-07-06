import {
  AuthorityRegistryRankingResult,
  AuthorityRegistrySearchContext,
  AuthorityRegistrySearchResult,
  VerifiedAuthorityEntry,
} from "./authorityRegistryArchitecture";

import {
  retrieveVerifiedAuthorities,
  retrieveTopVerifiedAuthorities,
  getAuthorityTopicGroups,
} from "./authorityRetrievalEngine";

export type AuthorityDisplayEngineVersion = "1.0.0";

export type AuthorityDisplayCard = {
  id: string;
  authorityId: string;
  title: string;
  shortTitle: string;
  citation: string;
  courtLevel: string;
  year?: number;
  jurisdiction: string;
  importanceScore: number;
  rankingScore: number;
  bindingWeight: string;
  verificationStatus: string;
  displayMode: "collapsed" | "summary" | "expanded";
  corePrinciple: string;
  plainLanguageSummary: string;
  legalTestSummary: string;
  practicalUse: string[];
  howCourtsUseIt: string[];
  commonMistakes: string[];
  limitsAndWarnings: string[];
  evidenceNeeded: string[];
  workflowActions: string[];
  suggestedQuestions: string[];
  reasons: string[];
  warnings: string[];
};

export type AuthorityDisplayGroup = {
  id: string;
  label: string;
  description: string;
  defaultCollapsed: boolean;
  cards: AuthorityDisplayCard[];
  warnings: string[];
};

export type AuthorityDisplayResult = {
  version: AuthorityDisplayEngineVersion;
  context: AuthorityRegistrySearchContext;
  groups: AuthorityDisplayGroup[];
  allCards: AuthorityDisplayCard[];
  warnings: string[];
};

function uniqueStrings(items: unknown[]): string[] {
  return Array.from(new Set(items.map((item) => String(item || "").trim()).filter(Boolean)));
}

function rankingFor(
  entry: VerifiedAuthorityEntry,
  rankings: AuthorityRegistryRankingResult[],
): AuthorityRegistryRankingResult | undefined {
  return rankings.find((ranking) => ranking.authorityId === entry.id);
}

function evidenceNeeded(entry: VerifiedAuthorityEntry): string[] {
  return uniqueStrings(
    entry.evidenceImplications.flatMap((item) => item.evidenceUsuallyNeeded),
  );
}

function workflowActions(entry: VerifiedAuthorityEntry): string[] {
  return uniqueStrings([
    ...entry.workflowLinks.map((link) => `${link.route}: ${link.reason}`),
    ...entry.suggestedWorkflowActions,
  ]);
}

function toDisplayCard(
  entry: VerifiedAuthorityEntry,
  rankings: AuthorityRegistryRankingResult[],
): AuthorityDisplayCard {
  const ranking = rankingFor(entry, rankings);

  return {
    id: `authority_display_${entry.id}`,
    authorityId: entry.id,
    title: entry.title,
    shortTitle: entry.shortTitle,
    citation: entry.citation,
    courtLevel: entry.courtLevel,
    year: entry.year,
    jurisdiction: entry.jurisdiction,
    importanceScore: entry.importanceScore,
    rankingScore: ranking?.score || 0,
    bindingWeight: entry.bindingWeight,
    verificationStatus: entry.verificationStatus,
    displayMode:
      entry.displayMode === "expanded" || entry.displayMode === "summary"
        ? entry.displayMode
        : "collapsed",
    corePrinciple: entry.corePrinciple,
    plainLanguageSummary: entry.plainLanguageSummary,
    legalTestSummary: entry.legalTestSummary,
    practicalUse: entry.practicalUse,
    howCourtsUseIt: entry.howCourtsUseIt,
    commonMistakes: entry.commonMistakes,
    limitsAndWarnings: entry.limitsAndWarnings,
    evidenceNeeded: evidenceNeeded(entry),
    workflowActions: workflowActions(entry),
    suggestedQuestions: uniqueStrings([
      ...entry.suggestedAiQuestions,
      ...entry.suggestedEvidenceQuestions,
    ]),
    reasons: ranking?.reasons || [],
    warnings: uniqueStrings([
      ...(ranking?.warnings || []),
      ...entry.limitsAndWarnings,
      ...entry.sourceReferences.length === 0
        ? ["No source reference is attached to this authority."]
        : [],
    ]),
  };
}

function buildGroupsFromSearch(
  searchResult: AuthorityRegistrySearchResult,
): AuthorityDisplayGroup[] {
  const topicGroups = getAuthorityTopicGroups();
  const cards = searchResult.authorities.map((entry) =>
    toDisplayCard(entry, searchResult.rankings),
  );

  const grouped: AuthorityDisplayGroup[] = topicGroups
    .map((topic) => {
      const topicCards = cards.filter((card) => topic.authorityIds.includes(card.authorityId));

      return {
        id: topic.id,
        label: topic.label,
        description: topic.description,
        defaultCollapsed: topic.defaultCollapsed,
        cards: topicCards,
        warnings: topicCards.length === 0 ? [`No authorities matched ${topic.label}.`] : [],
      };
    })
    .filter((group) => group.cards.length > 0);

  const groupedIds = new Set(grouped.flatMap((group) => group.cards.map((card) => card.id)));
  const ungroupedCards = cards.filter((card) => !groupedIds.has(card.id));

  if (ungroupedCards.length > 0) {
    grouped.push({
      id: "topic_other_verified_authorities",
      label: "Other Verified Authorities",
      description: "Verified authorities that matched the search but do not belong to a configured topic group yet.",
      defaultCollapsed: true,
      cards: ungroupedCards,
      warnings: [],
    });
  }

  return grouped;
}

export function buildAuthorityDisplayResult(
  context: AuthorityRegistrySearchContext,
): AuthorityDisplayResult {
  const searchResult = retrieveVerifiedAuthorities(context);
  const groups = buildGroupsFromSearch(searchResult);
  const allCards = groups.flatMap((group) => group.cards);

  return {
    version: "1.0.0",
    context,
    groups,
    allCards,
    warnings: uniqueStrings([
      ...searchResult.warnings,
      ...groups.flatMap((group) => group.warnings),
    ]),
  };
}

export function buildTopAuthorityDisplayResult(
  context: AuthorityRegistrySearchContext,
  limit = 5,
): AuthorityDisplayResult {
  const searchResult = retrieveTopVerifiedAuthorities(context, limit);
  const groups = buildGroupsFromSearch(searchResult);
  const allCards = groups.flatMap((group) => group.cards);

  return {
    version: "1.0.0",
    context,
    groups,
    allCards,
    warnings: uniqueStrings([
      ...searchResult.warnings,
      ...groups.flatMap((group) => group.warnings),
    ]),
  };
}

export function buildAuthorityCardsForTopic(
  topicTag: string,
  context: Omit<AuthorityRegistrySearchContext, "topicTags"> = {},
): AuthorityDisplayResult {
  return buildAuthorityDisplayResult({
    ...context,
    topicTags: [topicTag],
    requireVerified: context.requireVerified ?? true,
  });
}