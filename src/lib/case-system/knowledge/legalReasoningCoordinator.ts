import {
  LegalReasoningProfile,
  getReasoningProfilesForDomain,
} from "./legalReasoningProfiles";

import {
  buildKnowledgeRetrievalContext,
  retrieveKnowledgeObjects,
  KnowledgeRetrievalMode,
} from "./knowledgeRetrievalEngine";

import { LegalKnowledgeObject } from "./legalKnowledgeObjects";

import {
  getAuthorityEntriesForContext,
  LegalAuthorityRegistryEntry,
} from "./legalAuthorityRegistry";

import {
  CaseCourtPath,
  CaseLegalDomain,
  CaseProvince,
  CaseStage,
} from "../architecture/masterCaseSchema";

export type LegalReasoningCoordinatorVersion = "1.0.0";

export type LegalReasoningCoordinatorInput = {
  courtPath?: CaseCourtPath;
  jurisdiction?: CaseProvince | "Canada" | "Unknown";
  stage?: CaseStage;
  legalDomains: CaseLegalDomain[];
  knowledgeObjects: LegalKnowledgeObject[];
  mode?: KnowledgeRetrievalMode;
};

export type CoordinatedReasoningPackage = {
  version: LegalReasoningCoordinatorVersion;
  profiles: LegalReasoningProfile[];
  knowledge: ReturnType<typeof retrieveKnowledgeObjects>;
  authorities: LegalAuthorityRegistryEntry[];
  reasoningSummary: {
    primaryDomains: CaseLegalDomain[];
    investigationPriorities: string[];
    evidencePriorities: string[];
    burdenPriorities: string[];
    proceduralWatchPoints: string[];
    firstQuestions: string[];
  };
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function buildLegalReasoningCoordinator(
  input: LegalReasoningCoordinatorInput,
): CoordinatedReasoningPackage {
  const profiles = input.legalDomains.flatMap((domain) =>
    getReasoningProfilesForDomain(domain),
  );

  const retrievalContext = buildKnowledgeRetrievalContext({
    courtPath: input.courtPath,
    jurisdiction: input.jurisdiction,
    stage: input.stage,
    legalDomains: input.legalDomains,
    requiresVerifiedOnly: input.mode === "verified-only",
    includeOperationalGuidance:
      input.mode === "operational" ||
      input.mode === "internal-diagnostic",
    includeAiInference: input.mode === "internal-diagnostic",
  });

  const knowledge = retrieveKnowledgeObjects({
    objects: input.knowledgeObjects,
    context: retrievalContext,
    mode: input.mode,
  });

  const authorities = getAuthorityEntriesForContext({
    courtPath: input.courtPath,
    jurisdiction: input.jurisdiction,
    legalDomain: input.legalDomains[0],
    stage: input.stage,
  });

  /*
   * *** THE FIVE PROSE ARRAYS ARE EMPTY UNLESS A DIAGNOSTIC ASKED ***
   *
   * Every string in them comes from `legalReasoningProfiles.ts`: five profiles
   * carrying NO verificationStatus and NO citations at all. The doctrine seed
   * library at least declares itself "not-verified"; these declare nothing. They
   * state what a claim requires and what evidence matters, which is legal content,
   * and CLAUDE.md §2 forbids shipping it unsourced.
   *
   * What the trace found: `caseSystemAssembly` spreads these strings — wrapped as
   * "Legal reasoning burden priority: …" — into `evidenceWarnings`,
   * `procedureWarnings`, `proof.elementsWithNothingRecorded` and `proofNextActions`,
   * in about twenty places, and that assembly is consumed by `app/forms/page.tsx`,
   * the dashboard adapter and the brain bridge. There was no verification gate
   * anywhere on that path.
   *
   * They are non-empty in practice: for `defamation` this returned 6 burden
   * priorities and 7 evidence priorities. Whether they reach a rendered screen was
   * NOT established either way, which is exactly why the gate sits here — at the
   * point of production, covering every consumer including untraced ones.
   *
   * When these profiles are sourced through the content pipeline, the right change
   * is to give each profile a citation and release on THAT, not to add a flag here.
   */
  const releasable = reasoningTextIsReleasable(input.mode);
  const text = (values: string[]): string[] => (releasable ? unique(values) : []);

  return {
    version: "1.0.0",
    profiles,
    knowledge,
    authorities,
    reasoningSummary: {
      primaryDomains: input.legalDomains,
      investigationPriorities: text(
        profiles.flatMap((profile) => profile.investigationOrder),
      ),
      evidencePriorities: text(
        profiles.flatMap((profile) => profile.evidencePriorities),
      ),
      burdenPriorities: text(
        profiles.flatMap((profile) => profile.burdenFocus),
      ),
      proceduralWatchPoints: text(
        profiles.flatMap((profile) => profile.proceduralWatchPoints),
      ),
      firstQuestions: text(
        profiles.flatMap((profile) => profile.firstQuestions),
      ),
    },
  };
}

/**
 * Whether the unsourced reasoning prose may leave this module.
 *
 * Only for `internal-diagnostic`, because a diagnostic is not a user. Exported so
 * `test:reasoning-text-gate` can assert the rule directly rather than inferring it
 * from whichever mode a caller happens to pass today.
 *
 * *** A SEPARATE BUG THIS ALSO CLOSES ***
 *
 * `guidedAssistantOrchestrator` renders the burden priority gated on
 * `DOCTRINE_VERIFICATION_STATUS`, computed from `doctrineSeedLibrary`. The burden
 * priority does not come from that library — it comes from
 * `legalReasoningProfiles.ts`. The gate was keyed to the wrong library, and its
 * comment asserted a provenance the code does not have, so verifying the doctrine
 * library would have released text from a file that was never verified at all.
 */
export function reasoningTextIsReleasable(
  mode: KnowledgeRetrievalMode | undefined,
): boolean {
  return mode === "internal-diagnostic";
}