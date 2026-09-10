/**
 * Session 34 -- closes the wiring gap Session 33's audit found in
 * IntelligenceOverviewPanel.tsx: for Small Claims cases, the "Evidence and
 * proof to organize" and "Points the court may need clarified" cards used
 * to fall back to either hand-written, unsourced duplicates (defamation)
 * or the AI's own free-form missingEvidence/judgeConcerns output, which
 * could come back empty for a real scenario (the $700k+ wrongful dismissal
 * case that motivated this fix). claimTypes.ts already has fuller, sourced
 * content for both -- this module is the wiring, not new content.
 *
 * MATCHING APPROACH, and why: reuses claimTypeMatcher.ts's existing
 * deterministic matchClaimType() against the case's own story text
 * (intake.facts), rather than a curated LegalDomain -> ClaimType id alias
 * table. A LegalDomain value like "contract" or "consumer" could
 * legitimately correspond to several different CLAIM_TYPES entries (e.g.
 * "contract" could mean sc-claim-breach-of-contract-goods,
 * sc-claim-breach-of-contract-services, or sc-claim-consumer-cancellation-
 * refund) -- a single alias per domain would be a lossy, arbitrary
 * editorial guess where the story's own text can disambiguate via the same
 * `signals` keyword matching already curated per claim type. Reusing
 * matchClaimType() also keeps ONE source of truth for "which claim type
 * does this text resemble" across the whole intake system (already used
 * this same way in orchestrateIntakeTurn.ts, evidenceGapDetector.ts, and
 * claimGuidance.ts) rather than adding a second, independent mapping that
 * could disagree with it for the same facts.
 *
 * No status: "reviewed" gate on the matched ClaimType itself, deliberately
 * -- claimTypeMatcher.ts's own file header flags this as an open decision
 * ("if matched claim-type content is ever shown directly to a user, a
 * future session should decide whether this needs the same structural
 * gate selectQuestions.ts has"). This session decides it the same way
 * claimGuidance.ts (Session 32) already did for guided intake: no gate.
 * Two reasons. First, precedent -- claimGuidance.ts already surfaces
 * matched-claim-type-derived remedies/education content to users
 * regardless of the claim type's own draft/reviewed status, and adding an
 * inconsistent rule here (gated in one surface, not the other) would be
 * worse than picking one and documenting it. Second, and more load-
 * bearing: verifyIntakeCoverage.ts's check 4 already makes sourceUrl
 * MANDATORY on every ClaimType sub-entry regardless of draft status ("a
 * bad or missing value in a required field is a content bug on its own
 * terms") -- unlike questionBank.ts/educationTopics.ts/remedyTypes.ts,
 * where "draft" can mean genuinely unsourced, a "draft" ClaimType here
 * only means the site owner hasn't done a final administrative read-
 * through yet, not that the content is unverified. sc-claim-wrongful-
 * dismissal (draft) is exactly this case -- fully sourced, not yet
 * marked reviewed.
 */

import { matchClaimType } from "./claimTypeMatcher";
import { collectEvidenceCategories } from "./evidenceGapDetector";
import { CLAIM_TYPES, DEFENCE_CONCEPTS, type ClaimType } from "./claimTypes";

export type SourcedListItem = {
  text: string;
  sourceUrl?: string;
};

export type ClaimTypeOverviewContent = {
  claimTypeId: string;
  claimTypeName: string;
  /** From the matched claim type's evidenceCategories, deduplicated -- see collectEvidenceCategories(). */
  evidenceToOrganize: SourcedListItem[];
  /** One per plaintiffElement -- its plainExplanation is the "why the court needs this established" text. */
  courtPoints: SourcedListItem[];
  /**
   * From the matched claim type's applicableDefenceConceptIds, resolved
   * against DEFENCE_CONCEPTS and deduplicated -- see buildCommonDefences().
   * General information about what defences commonly arise for this TYPE of
   * claim, sourced the same way courtPoints is -- never a prediction about
   * what a specific opponent will argue. All 5 DEFENCE_CONCEPTS entries are
   * currently status: "draft" (checked 2026-09-12) -- unlike a "draft"
   * ClaimType (see the file-header note above), no session has confirmed
   * these went through the site owner's final administrative read-through
   * yet. They are surfaced anyway, on the same no-status-gate basis
   * claimGuidance.ts and this file already use for ClaimType content,
   * because each entry's sourceUrl was independently fetched and confirmed
   * resolving this session -- draft here tracks an editorial sign-off step,
   * not unverified sourcing. Promoting these to "reviewed" is the site
   * owner's call, not done here.
   */
  commonDefences: SourcedListItem[];
};

/**
 * The sourceUrl for a deduplicated evidence category comes from whichever
 * plaintiffElement first introduced it -- same order collectEvidenceCategories()
 * itself dedupes in, so the attribution matches the item actually shown.
 */
function buildSourceUrlByCategoryName(claimType: ClaimType): Map<string, string> {
  const sourceUrlByCategoryName = new Map<string, string>();
  for (const element of claimType.plaintiffElements) {
    for (const category of element.evidenceCategories) {
      if (!sourceUrlByCategoryName.has(category.name)) {
        sourceUrlByCategoryName.set(category.name, element.sourceUrl);
      }
    }
  }
  return sourceUrlByCategoryName;
}

const DEFENCE_CONCEPTS_BY_ID = new Map(
  DEFENCE_CONCEPTS.map((concept) => [concept.id, concept] as const),
);

/**
 * Resolves a claim type's applicableDefenceConceptIds against
 * DEFENCE_CONCEPTS, deduplicated by id (same defensive posture
 * buildSourceUrlByCategoryName above uses for evidence categories). Skips
 * any id that doesn't resolve to a real entry, and any entry without a
 * sourceUrl -- the same sourcing bar every other list built in this file
 * already enforces on its own content.
 */
function buildCommonDefences(claimType: ClaimType): SourcedListItem[] {
  const seenIds = new Set<string>();
  const items: SourcedListItem[] = [];

  for (const id of claimType.applicableDefenceConceptIds) {
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const concept = DEFENCE_CONCEPTS_BY_ID.get(id);
    if (!concept || !concept.sourceUrl) continue;

    items.push({ text: concept.plainExplanation, sourceUrl: concept.sourceUrl });
  }

  return items;
}

/**
 * Pure function: (a Small Claims case's story text) -> the matched claim
 * type's real, sourced evidence/court-points content, or null when nothing
 * matches. Null is the honest, structural answer for every Family/Civil
 * case (CLAIM_TYPES is Small-Claims-only) and for any Small Claims story
 * that doesn't resemble one of the 19 entries yet -- this function never
 * fabricates a fallback of its own; the caller keeps its existing generic
 * path for that case.
 */
export function buildClaimTypeOverviewContent(
  storyText: string,
  claimTypes: readonly ClaimType[] = CLAIM_TYPES,
): ClaimTypeOverviewContent | null {
  const match = matchClaimType(storyText, claimTypes);
  if (!match) return null;

  const { claimType } = match;
  const sourceUrlByCategoryName = buildSourceUrlByCategoryName(claimType);

  const evidenceToOrganize: SourcedListItem[] = collectEvidenceCategories(claimType).map((category) => ({
    text: category.name,
    sourceUrl: sourceUrlByCategoryName.get(category.name),
  }));

  const courtPoints: SourcedListItem[] = claimType.plaintiffElements.map((element) => ({
    text: element.plainExplanation,
    sourceUrl: element.sourceUrl,
  }));

  const commonDefences = buildCommonDefences(claimType);

  return {
    claimTypeId: claimType.id,
    claimTypeName: claimType.name,
    evidenceToOrganize,
    courtPoints,
    commonDefences,
  };
}
