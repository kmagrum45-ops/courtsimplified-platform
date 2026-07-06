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
    judicialConcerns: string[];
    opposingArguments: string[];
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

  return {
    version: "1.0.0",
    profiles,
    knowledge,
    authorities,
    reasoningSummary: {
      primaryDomains: input.legalDomains,
      investigationPriorities: unique(
        profiles.flatMap((profile) => profile.investigationOrder),
      ),
      evidencePriorities: unique(
        profiles.flatMap((profile) => profile.evidencePriorities),
      ),
      burdenPriorities: unique(
        profiles.flatMap((profile) => profile.burdenFocus),
      ),
      proceduralWatchPoints: unique(
        profiles.flatMap((profile) => profile.proceduralWatchPoints),
      ),
      judicialConcerns: unique(
        profiles.flatMap((profile) => profile.judicialConcerns),
      ),
      opposingArguments: unique(
        profiles.flatMap((profile) => profile.opposingArguments),
      ),
      firstQuestions: unique(
        profiles.flatMap((profile) => profile.firstQuestions),
      ),
    },
  };
}