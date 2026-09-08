/**
 * Session 32 -- deterministic education/remedy surfacing. Given a matched
 * ClaimType (see claimTypeMatcher.ts) and the facts gathered so far, picks
 * out which educationTopics.ts/remedyTypes.ts entries are relevant right
 * now. No AI, no network -- same posture as evidenceGapDetector.ts, and
 * exactly the wiring point claimTypeMatcher.ts's own file header already
 * called out ("for surfacing education/remedy content later (not built
 * yet)").
 *
 * Matching logic, and why:
 *
 * REMEDIES: claimTypes.ts already links each ClaimType to specific
 * RemedyTopic ids via its own `remedies` field (a deliberate editorial
 * choice made when each claim type was written, verified referentially
 * intact by verifyIntakeCoverage.ts). Reused directly, not re-derived --
 * inventing a second, independent way to decide "which remedies fit this
 * claim type" would risk disagreeing with the one that already exists.
 *
 * EDUCATION TOPICS: unlike remedies, nothing in claimTypes.ts links a
 * ClaimType to specific EducationTopic ids -- that cross-reference simply
 * doesn't exist yet as a data field on either registry, and inventing one
 * here (rather than as a deliberate content decision on educationTopics.ts
 * itself) would mean guessing at an editorial call this session wasn't
 * asked to make. So education topics are matched by the two signals that
 * DO already exist on every topic: `courtArea` (must match the claim
 * type's own courtArea -- the same domain-scoping every other registry in
 * this directory uses) and `surfacedWhen` (the exact FactCondition
 * mechanism questionBank.ts already uses to gate a question on the facts
 * gathered so far, reused via selectQuestions.ts's evaluateFactCondition
 * rather than reimplemented). A topic with no `surfacedWhen` is, per its
 * own type comment, "generally relevant and not fact-gated" -- always
 * included once a claim type in that court area is matched. A topic WITH
 * a `surfacedWhen` (e.g. sc-topic-filing-form-7a, gated on claimFiled
 * `notExists`) is included only while that condition currently holds,
 * exactly like a gated question would be. This is coarser than a direct
 * per-claim-type link would be -- every matched claim type in the same
 * court area currently sees the same generally-relevant topics -- but it's
 * the honest signal available without fabricating a new relationship.
 *
 * Both lists are filtered to `status === "reviewed"`, same structural gate
 * selectQuestions.ts enforces for questions -- nothing draft reaches a
 * user through this path either.
 */

import type { ClaimType } from "./claimTypes";
import { EDUCATION_TOPICS, type EducationTopic } from "./educationTopics";
import { REMEDY_TYPES, type RemedyTopic } from "./remedyTypes";
import { evaluateFactCondition, type IntakeFacts } from "./selectQuestions";

export type ClaimGuidance = {
  claimTypeId: string;
  claimTypeName: string;
  educationTopics: EducationTopic[];
  remedies: RemedyTopic[];
};

function isCurrentlyRelevant(topic: Pick<EducationTopic | RemedyTopic, "surfacedWhen">, facts: IntakeFacts): boolean {
  if (!topic.surfacedWhen) return true;
  return evaluateFactCondition(topic.surfacedWhen, facts);
}

/**
 * Pure function: (matched claim type, facts gathered so far) -> the
 * education topics and remedies relevant right now. Same "caller supplies
 * exactly what it has, nothing from outside the arguments" philosophy as
 * detectEvidenceGaps() and selectQuestions().
 */
export function buildClaimGuidance(claimType: ClaimType, facts: IntakeFacts): ClaimGuidance {
  const educationTopics = EDUCATION_TOPICS.filter(
    (topic) =>
      topic.courtArea === claimType.courtArea &&
      topic.status === "reviewed" &&
      isCurrentlyRelevant(topic, facts),
  );

  const remedyIds = new Set(claimType.remedies);
  const remedies = REMEDY_TYPES.filter(
    (remedy) => remedyIds.has(remedy.id) && remedy.status === "reviewed" && isCurrentlyRelevant(remedy, facts),
  );

  return {
    claimTypeId: claimType.id,
    claimTypeName: claimType.name,
    educationTopics,
    remedies,
  };
}
