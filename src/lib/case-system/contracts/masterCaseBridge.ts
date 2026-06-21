import {
  MasterCaseSchema,
  CaseAuditEvent,
  CaseAuthorityAnalysis,
  CaseAuthorityVerificationFinding,
  CaseAuthorityWeightFinding,
  CaseCitationSafetyFinding,
  CaseClaim,
  CaseConfidence,
  CaseContradictionAnalysis,
  CaseContradictionFinding,
  CaseContradictionNode,
  CaseCourtPath,
  CaseCredibilityAnalysis,
  CaseCredibilityRiskFinding,
  CaseElementProofFinding,
  CaseEvidenceItem,
  CaseJudicialConcern,
  CaseJurisdictionAuthorityFinding,
  CaseKnowledgeAuthorityLevel,
  CaseKnowledgeVerificationStatus,
  CaseLegalDomain,
  CaseLegalKnowledgeReference,
  CaseMemorySnapshot,
  CaseOpposingArgument,
  CaseParty,
  CaseProofAnalysis,
  CaseProvince,
  CaseReadinessState,
  CaseRisk,
  CaseSeverity,
  CaseStage,
  CaseTimelineEvent,
  CaseWorkflowState,
} from "../architecture/masterCaseSchema";

import {
  ClaimClassification,
  ElementProofEngineResult,
  ExtractedEvidence,
  ExtractedParty,
  ExtractedEvent,
  IntelligenceSeverity,
  LegalAuthorityLevel,
  LegalDomain,
  LegalIntelligenceResult,
} from "../intelligence/intelligenceTypes";

import {
  AuthorityBindingLevel,
  AuthorityCourtLevel,
  AuthorityDomain,
  AuthorityJurisdiction,
  AuthorityMetadata,
  AuthoritySourceType,
  AuthorityStatus,
  AuthorityVerificationStatus,
} from "../authority/authoritySourceSchema";

import { verifyAuthorities } from "../authority/authorityVerificationEngine";
import { weighAuthorities } from "../authority/authorityWeightEngine";
import { evaluateCitationSafety } from "../authority/citationSafetyEngine";

import { detectContradictions } from "../contradictions/contradictionDetectionEngine";
import { assessCredibilityRisk } from "../contradictions/credibilityRiskEngine";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function asCaseConfidence(value: string | undefined): CaseConfidence {
  if (
    value === "very-low" ||
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "very-high"
  ) {
    return value;
  }

  return "low";
}

function asCaseSeverity(value: IntelligenceSeverity | undefined): CaseSeverity {
  if (
    value === "info" ||
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "critical"
  ) {
    return value;
  }

  return "medium";
}

function asCaseCourtPath(value: string): CaseCourtPath {
  if (
    value === "family" ||
    value === "small-claims" ||
    value === "civil" ||
    value === "tribunal" ||
    value === "ltb" ||
    value === "immigration" ||
    value === "criminal-related" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function asCaseProvince(value: string): CaseProvince {
  if (
    value === "Ontario" ||
    value === "Alberta" ||
    value === "British Columbia" ||
    value === "Manitoba" ||
    value === "New Brunswick" ||
    value === "Newfoundland and Labrador" ||
    value === "Northwest Territories" ||
    value === "Nova Scotia" ||
    value === "Nunavut" ||
    value === "Prince Edward Island" ||
    value === "Quebec" ||
    value === "Saskatchewan" ||
    value === "Yukon" ||
    value === "Federal" ||
    value === "Unknown"
  ) {
    return value;
  }

  return "Unknown";
}

function asCaseStage(value: string): CaseStage {
  if (
    value === "pre-litigation" ||
    value === "starting-case" ||
    value === "responding" ||
    value === "already-started" ||
    value === "conference" ||
    value === "motion" ||
    value === "trial" ||
    value === "settlement" ||
    value === "enforcement" ||
    value === "appeal" ||
    value === "urgent" ||
    value === "closed" ||
    value === "not-sure"
  ) {
    return value;
  }

  return "not-sure";
}

function asCaseLegalDomain(value: LegalDomain): CaseLegalDomain {
  return value;
}

function asCaseAuthorityLevel(
  value: LegalAuthorityLevel,
): CaseKnowledgeAuthorityLevel {
  if (
    value === "constitutional" ||
    value === "statute" ||
    value === "regulation" ||
    value === "rule-of-court" ||
    value === "scc-binding" ||
    value === "court-of-appeal-binding" ||
    value === "superior-court-persuasive" ||
    value === "tribunal-persuasive" ||
    value === "official-guide" ||
    value === "secondary-source" ||
    value === "unknown"
  ) {
    return value;
  }

  if (value === "provincial-court-persuasive") {
    return "superior-court-persuasive";
  }

  return "unknown";
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function claimStatusFromClassification(
  claim: ClaimClassification,
): CaseClaim["status"] {
  if (claim.status === "detected") return "dominant";
  if (claim.status === "possible") return "possible";
  if (claim.status === "insufficient-facts") return "secondary";

  if (
    claim.status === "rejected-false-positive" ||
    claim.status === "conflicting-signals"
  ) {
    return "rejected";
  }

  return "unknown";
}

function mapParty(party: ExtractedParty): CaseParty {
  return {
    id: party.id,
    name: party.name,
    role: party.role,
    isUser: party.isUser,
    description: party.description,
    confidence: asCaseConfidence(party.confidence),
    sourceText: party.sourceText,
  };
}

function mapEvent(event: ExtractedEvent): CaseTimelineEvent {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    dateRaw: undefined,
    dateNormalized: undefined,
    dateConfidence: "low",
    partyIds: event.partyIds,
    evidenceIds: event.evidenceIds,
    claimIds: [],
    proceduralRelevance: [],
    contradictionFlags: [],
    sourceText: event.sourceText,
    confidence: asCaseConfidence(event.confidence),
  };
}

function mapClaim(claim: ClaimClassification): CaseClaim {
  return {
    id: claim.id,
    domain: asCaseLegalDomain(claim.claimType),
    status: claimStatusFromClassification(claim),
    title: claim.claimType,
    explanation: claim.explanation,
    score: claim.score,
    confidence: asCaseConfidence(claim.confidence),
    supportingFactIds: [],
    supportingEvidenceIds: claim.requiredElements.flatMap(
      (element) => element.supportingEvidenceIds,
    ),
    missingFacts: claim.requiredElements.flatMap((element) => element.missingFacts),
    burdenIssues: claim.burdenOfProof.flatMap((burden) => burden.missingProof),
    remedyIssues: claim.remedyFit.flatMap((remedy) => [
      ...remedy.reasons,
      ...remedy.warnings,
    ]),
    suppressionReason: claim.rejectedBecause[0],
    arbitrationNotes: [
      ...claim.supportingSignals.map((signal) => signal.explanation),
      ...claim.weakeningSignals.map((signal) => signal.explanation),
      ...claim.rejectedBecause,
    ],
  };
}

function mapEvidence(evidence: ExtractedEvidence): CaseEvidenceItem {
  return {
    id: evidence.id,
    type: evidence.type,
    title: evidence.title,
    description: evidence.description,
    lifecycleStatus:
      evidence.linkedIssueIds.length > 0 ? "linked-to-issue" : "categorized",
    linkedEventIds: evidence.linkedFactIds,
    linkedClaimIds: [],
    linkedIssueIds: evidence.linkedIssueIds,
    linkedDocumentIds: [],
    linkedBurdenLabels: [],
    admissibilityConcerns: evidence.admissibilityConcerns.map(
      (concern) => concern.explanation,
    ),
    authenticityConcerns: evidence.admissibilityConcerns
      .filter((concern) => concern.concern === "authenticity")
      .map((concern) => concern.explanation),
    missingContext: evidence.gaps,
    readiness: asCaseConfidence(evidence.strength),
    confidence: asCaseConfidence(evidence.strength),
  };
}

function mapRisks(intelligence: LegalIntelligenceResult): CaseRisk[] {
  return intelligence.litigationRisks.map((risk) => ({
    id: risk.id,
    severity: risk.severity,
    title: risk.title,
    explanation: risk.explanation,
    source: risk.source,
    suggestedFix: risk.suggestedFix,
  }));
}

function mapJudicialConcerns(
  intelligence: LegalIntelligenceResult,
): CaseJudicialConcern[] {
  return intelligence.judgeConcerns.map((concern) => ({
    id: concern.id,
    concern: concern.concern,
    whyCourtMayCare: concern.whyJudgeMayCare,
    howToAddress: concern.howToAddress,
    linkedClaimIds: [],
    linkedEvidenceIds: [],
    severity: "medium",
  }));
}

function mapOpposingArguments(
  intelligence: LegalIntelligenceResult,
): CaseOpposingArgument[] {
  return intelligence.opposingArguments.map((argument) => ({
    id: argument.id,
    argument: argument.argument,
    whyItMatters: argument.whyItMatters,
    responseStrategy: argument.responseStrategy,
    evidenceNeeded: argument.evidenceNeeded,
    linkedClaimIds: [],
  }));
}

function mapLegalKnowledge(
  intelligence: LegalIntelligenceResult,
): CaseLegalKnowledgeReference[] {
  return [
    ...intelligence.legalKnowledge.statutes,
    ...intelligence.legalKnowledge.proceduralRules,
    ...intelligence.legalKnowledge.precedents,
  ].map((source) => ({
    id: source.id,
    title: source.title,
    citation: source.citation,
    sourceUrl: source.sourceUrl,
    jurisdiction:
      source.jurisdiction === "Canada"
        ? "Federal"
        : asCaseProvince(source.jurisdiction),
    authorityLevel: asCaseAuthorityLevel(source.authorityLevel),
    verificationStatus: source.verificationStatus,
    legalDomains: source.legalDomains.map(asCaseLegalDomain),
    proceduralStages: [],
    principleSummary: source.summary,
    proceduralEffect: "practicalEffect" in source ? source.practicalEffect : [],
    evidenceEffect: [],
    burdenEffect: [],
    strategicEffect: [],
    useLimits: source.useLimits,
    doNotUseFor: source.doNotUseFor,
    lastVerifiedAt: source.lastVerifiedAt,
  }));
}

function emptyProofAnalysis(): CaseProofAnalysis {
  return {
    version: "1.0.0",
    claimProofMaps: [],
    globalWeaknesses: [],
    globalStrengths: [],
    globalNextActions: [],
    summary: "No proof analysis was available for this case state.",
  };
}

function emptyAuthorityAnalysis(): CaseAuthorityAnalysis {
  return {
    version: "1.0.0",
    generatedAt: nowIso(),
    verificationResults: [],
    weightResults: [],
    citationSafetyResults: [],
    jurisdictionResults: [],
    verifiedAuthorityIds: [],
    strongestAuthorityIds: [],
    unsafeAuthorityIds: [],
    directlyApplicableAuthorityIds: [],
    wrongJurisdictionAuthorityIds: [],
    warnings: [],
    summary: "No legal authorities were available for authority analysis.",
  };
}

function emptyContradictionAnalysis(): CaseContradictionAnalysis {
  return {
    version: "1.0.0",
    generatedAt: nowIso(),
    findings: [],
    totalFindings: 0,
    criticalFindings: 0,
    highFindings: 0,
    moderateFindings: 0,
    lowFindings: 0,
    credibilityRiskScore: 0,
    overallRisk: "minimal",
    warnings: [],
    summary: "No contradiction analysis has been generated.",
  };
}

function emptyCredibilityAnalysis(): CaseCredibilityAnalysis {
  return {
    version: "1.0.0",
    generatedAt: nowIso(),
    overallScore: 0,
    overallLevel: "minimal",
    findings: [],
    judgeConcernScore: 0,
    crossExaminationRiskScore: 0,
    settlementPressureScore: 0,
    documentReadinessImpact: "none",
    warnings: [],
    nextActions: [],
    summary: "No credibility risk analysis has been generated.",
  };
}

function mapProofFinding(
  finding: ElementProofEngineResult["claimProofMaps"][number]["elementFindings"][number],
): CaseElementProofFinding {
  return {
    id: finding.id,
    claimId: finding.claimId,
    claimDomain: asCaseLegalDomain(finding.claimType),
    elementId: finding.elementId,
    elementKey: finding.elementKey,
    elementLabel: finding.elementLabel,
    status: finding.status,
    proofStrength: asCaseConfidence(finding.proofStrength),
    burdenRisk: asCaseSeverity(finding.burdenRisk),
    supportingEvidenceIds: finding.supportingEvidenceIds,
    supportingEvidenceTitles: finding.supportingEvidenceTitles,
    missingEvidence: finding.missingEvidence,
    judgeConcern: finding.judgeConcern,
    opposingArgument: finding.opposingArgument,
    nextAction: finding.nextAction,
    explanation: finding.explanation,
  };
}

function mapProofAnalysis(intelligence: LegalIntelligenceResult): CaseProofAnalysis {
  const proof = intelligence.elementProofAnalysis;

  if (!proof) {
    return emptyProofAnalysis();
  }

  return {
    version: proof.version,
    claimProofMaps: proof.claimProofMaps.map((proofMap) => ({
      id: proofMap.id,
      claimId: proofMap.claimId,
      claimDomain: asCaseLegalDomain(proofMap.claimType),
      claimTitle: proofMap.claimTitle,
      overallProofStrength: asCaseConfidence(proofMap.overallProofStrength),
      weakestElements: proofMap.weakestElements,
      strongestElements: proofMap.strongestElements,
      missingEvidence: proofMap.missingEvidence,
      judgeConcerns: proofMap.judgeConcerns,
      opposingArguments: proofMap.opposingArguments,
      nextActions: proofMap.nextActions,
      elementFindings: proofMap.elementFindings.map(mapProofFinding),
    })),
    globalWeaknesses: proof.globalWeaknesses,
    globalStrengths: proof.globalStrengths,
    globalNextActions: proof.globalNextActions,
    summary: proof.summary,
  };
}

function authoritySourceTypeFromLevel(
  authorityLevel: CaseKnowledgeAuthorityLevel,
): AuthoritySourceType {
  if (authorityLevel === "constitutional") return "constitution";
  if (authorityLevel === "statute") return "statute";
  if (authorityLevel === "regulation") return "regulation";
  if (authorityLevel === "rule-of-court") return "rule-of-court";
  if (authorityLevel === "practice-direction") return "practice-direction";
  if (authorityLevel === "official-form") return "official-form";
  if (authorityLevel === "official-guide") return "official-guide";
  if (
    authorityLevel === "scc-binding" ||
    authorityLevel === "court-of-appeal-binding" ||
    authorityLevel === "superior-court-persuasive" ||
    authorityLevel === "tribunal-persuasive"
  ) {
    return authorityLevel === "tribunal-persuasive"
      ? "tribunal-decision"
      : "case-law";
  }

  if (authorityLevel === "secondary-source") return "secondary-source";

  return "unknown";
}

function authorityCourtLevelFromLevel(
  authorityLevel: CaseKnowledgeAuthorityLevel,
): AuthorityCourtLevel | undefined {
  if (authorityLevel === "scc-binding") return "supreme-court-of-canada";
  if (authorityLevel === "court-of-appeal-binding") {
    return "provincial-court-of-appeal";
  }
  if (authorityLevel === "superior-court-persuasive") return "superior-court";
  if (authorityLevel === "tribunal-persuasive") return "tribunal";
  return undefined;
}

function authorityBindingLevelFromCaseLevel(
  authorityLevel: CaseKnowledgeAuthorityLevel,
): AuthorityBindingLevel {
  if (authorityLevel === "constitutional") return "constitutional";
  if (
    authorityLevel === "statute" ||
    authorityLevel === "regulation" ||
    authorityLevel === "rule-of-court" ||
    authorityLevel === "official-form" ||
    authorityLevel === "scc-binding" ||
    authorityLevel === "court-of-appeal-binding"
  ) {
    return "binding";
  }

  if (
    authorityLevel === "practice-direction" ||
    authorityLevel === "superior-court-persuasive"
  ) {
    return "highly-persuasive";
  }

  if (authorityLevel === "official-guide") return "persuasive";
  if (authorityLevel === "tribunal-persuasive") return "limited";
  if (authorityLevel === "secondary-source") return "not-authoritative";

  return "unknown";
}

function authorityVerificationStatusFromCaseStatus(
  status: CaseKnowledgeVerificationStatus,
): AuthorityVerificationStatus {
  if (status === "verified") return "verified";
  if (status === "needs-review") return "needs-review";
  if (status === "outdated-risk") return "outdated-risk";
  if (status === "overruled-risk") return "overruled-risk";
  if (status === "not-verified") return "unverified";
  if (status === "do-not-use") return "questionable";
  return "needs-review";
}

function authorityJurisdictionFromCaseJurisdiction(
  jurisdiction: CaseLegalKnowledgeReference["jurisdiction"],
): AuthorityJurisdiction {
  if (jurisdiction === "Canada") return "Canada";
  if (jurisdiction === "Federal") return "Federal";
  if (
    jurisdiction === "Ontario" ||
    jurisdiction === "Alberta" ||
    jurisdiction === "British Columbia" ||
    jurisdiction === "Manitoba" ||
    jurisdiction === "New Brunswick" ||
    jurisdiction === "Newfoundland and Labrador" ||
    jurisdiction === "Northwest Territories" ||
    jurisdiction === "Nova Scotia" ||
    jurisdiction === "Nunavut" ||
    jurisdiction === "Prince Edward Island" ||
    jurisdiction === "Quebec" ||
    jurisdiction === "Saskatchewan" ||
    jurisdiction === "Yukon"
  ) {
    return jurisdiction;
  }

  return "Unknown";
}

function authorityDomainFromCaseDomain(domain: CaseLegalDomain): AuthorityDomain {
  if (domain === "family-parenting") return "family";
  if (domain === "family-support") return "family";
  if (domain === "family-property") return "family";
  if (domain === "family-safety") return "family";
  if (domain === "civil-charter") return "charter";
  if (domain === "civil-human-rights") return "human-rights";
  if (domain === "civil-institutional-liability") {
    return "institutional-liability";
  }
  if (domain === "landlord-tenant") return "landlord-tenant";
  if (domain === "immigration") return "immigration";
  if (domain === "defamation") return "defamation";
  if (domain === "negligence") return "negligence";
  if (domain === "contract") return "contracts";
  if (domain === "property-damage") return "property";
  if (domain === "employment") return "employment";
  if (domain === "procedural") return "procedure";

  return "unknown";
}

function authorityStatusFromReference(
  reference: CaseLegalKnowledgeReference,
): AuthorityStatus {
  if (reference.verificationStatus === "outdated-risk") return "superseded";
  if (reference.verificationStatus === "overruled-risk") return "overruled";
  return "active";
}

function buildAuthorityMetadata(
  legalKnowledge: CaseLegalKnowledgeReference[],
): AuthorityMetadata[] {
  return legalKnowledge.map((reference) => ({
    id: reference.id,
    title: reference.title,
    sourceType: authoritySourceTypeFromLevel(reference.authorityLevel),
    jurisdiction: authorityJurisdictionFromCaseJurisdiction(reference.jurisdiction),
    courtLevel: authorityCourtLevelFromLevel(reference.authorityLevel),
    bindingLevel: authorityBindingLevelFromCaseLevel(reference.authorityLevel),
    verificationStatus: authorityVerificationStatusFromCaseStatus(
      reference.verificationStatus,
    ),
    status: authorityStatusFromReference(reference),
    citation: reference.citation
      ? {
          citation: reference.citation,
        }
      : undefined,
    sourceUrl: reference.sourceUrl,
    domains: reference.legalDomains.map(authorityDomainFromCaseDomain),
    keywords: [],
    summary: reference.principleSummary,
    practicalMeaning: reference.principleSummary,
    proceduralImpact: reference.proceduralEffect,
    evidenceImpact: reference.evidenceEffect,
    burdenImpact: reference.burdenEffect,
    strategicImpact: reference.strategicEffect,
    limitations: reference.useLimits,
    warnings: reference.doNotUseFor,
    relatedAuthorities: [],
    confidence: reference.verificationStatus === "verified" ? 85 : 45,
  }));
}

function jurisdictionFit(args: {
  authorityJurisdiction: AuthorityJurisdiction;
  targetJurisdiction: AuthorityJurisdiction;
}): CaseJurisdictionAuthorityFinding["jurisdictionFit"] {
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

function buildJurisdictionResults(args: {
  authorities: AuthorityMetadata[];
  targetJurisdiction: AuthorityJurisdiction;
  weightResults: CaseAuthorityWeightFinding[];
  citationResults: CaseCitationSafetyFinding[];
}): CaseJurisdictionAuthorityFinding[] {
  const weightById = new Map(
    args.weightResults.map((result) => [result.authorityId, result]),
  );

  const citationById = new Map(
    args.citationResults.map((result) => [result.authorityId, result]),
  );

  return args.authorities.map((authority) => {
    const fit = jurisdictionFit({
      authorityJurisdiction: authority.jurisdiction,
      targetJurisdiction: args.targetJurisdiction,
    });

    const weight = weightById.get(authority.id);
    const citation = citationById.get(authority.id);

    const safeToCite = Boolean(citation?.safeToCite);
    const citationSafe = Boolean(citation?.citationSafe);

    const warnings = uniqueStrings([
      ...(weight?.warnings || []),
      ...(citation?.warnings || []),
      fit === "wrong-jurisdiction"
        ? "Authority is not from the target jurisdiction."
        : "",
      fit === "unknown" ? "Jurisdiction fit could not be confirmed." : "",
      !safeToCite ? "Authority is not currently safe to cite." : "",
    ]);

    return {
      authorityId: authority.id,
      targetJurisdiction: args.targetJurisdiction,
      authorityJurisdiction: authority.jurisdiction,
      jurisdictionFit: fit,
      usableInTargetJurisdiction:
        fit === "directly-applicable" || fit === "federal-applicable",
      shouldPreferLocalAuthority:
        fit !== "directly-applicable" && fit !== "federal-applicable",
      weightScore: weight?.weightScore || 0,
      citationSafe,
      safeToCite,
      warnings,
      recommendation:
        !safeToCite
          ? "Do not cite until citation safety and jurisdiction fit are reviewed."
          : fit === "directly-applicable"
            ? "Authority is directly applicable in the target jurisdiction."
            : fit === "federal-applicable"
              ? "Authority may apply nationally or federally, but confirm procedural fit."
              : fit === "wrong-jurisdiction"
                ? "Authority is from a different jurisdiction. Prefer local or binding authority."
                : "Jurisdiction fit is unknown and requires review.",
    };
  });
}

function buildAuthorityAnalysis(
  legalKnowledge: CaseLegalKnowledgeReference[],
  province: CaseProvince,
): CaseAuthorityAnalysis {
  const authorities = buildAuthorityMetadata(legalKnowledge);

  if (authorities.length === 0) {
    return emptyAuthorityAnalysis();
  }

  const targetJurisdiction: AuthorityJurisdiction =
    province === "Federal" ? "Federal" : province === "Unknown" ? "Unknown" : province;

  const verificationOutput = verifyAuthorities(authorities);
  const weightOutput = weighAuthorities({
    authorities,
    targetJurisdiction,
  });
  const citationOutput = evaluateCitationSafety({
    authorities,
    context: "legal-analysis",
  });

  const verificationResults: CaseAuthorityVerificationFinding[] =
    verificationOutput.results.map((result) => ({
      authorityId: result.authorityId,
      verified: result.verified,
      citationSafe: result.citationSafe,
      requiresManualReview: result.requiresManualReview,
      authorityWeight: result.authorityWeight,
      bindingLevel: result.bindingLevel,
      verificationStatus: result.verificationStatus,
      warnings: result.warnings,
      explanation: result.explanation,
    }));

  const weightResults: CaseAuthorityWeightFinding[] = weightOutput.results.map(
    (result) => ({
      authorityId: result.authorityId,
      weightScore: result.weightScore,
      weightGrade: result.weightGrade,
      bindingLevel: result.bindingLevel,
      jurisdictionFit: result.jurisdictionFit,
      courtLevelFit: result.courtLevelFit,
      citationSafe: result.citationSafe,
      verified: result.verified,
      requiresManualReview: result.requiresManualReview,
      useRecommendation: result.useRecommendation,
      warnings: result.warnings,
    }),
  );

  const citationSafetyResults: CaseCitationSafetyFinding[] =
    citationOutput.results.map((result) => ({
      authorityId: result.authorityId,
      safeToCite: result.safeToCite,
      safetyLevel: result.safetyLevel,
      useContext: result.useContext,
      citationSafe: result.citationSafe,
      verified: result.verified,
      authorityWeight: result.authorityWeight,
      requiresManualReview: result.requiresManualReview,
      reasons: result.reasons,
      warnings: result.warnings,
      recommendation: result.recommendation,
    }));

  const jurisdictionResults = buildJurisdictionResults({
    authorities,
    targetJurisdiction,
    weightResults,
    citationResults: citationSafetyResults,
  });

  const warnings = uniqueStrings([
    ...verificationOutput.warnings,
    ...weightOutput.warnings,
    ...citationOutput.warnings,
    ...jurisdictionResults.flatMap((result) => result.warnings),
  ]);

  return {
    version: "1.0.0",
    generatedAt: nowIso(),
    verificationResults,
    weightResults,
    citationSafetyResults,
    jurisdictionResults,
    verifiedAuthorityIds: verificationOutput.results
      .filter((result) => result.verified)
      .map((result) => result.authorityId),
    strongestAuthorityIds: weightOutput.strongestAuthorityIds,
    unsafeAuthorityIds: uniqueStrings([
      ...weightOutput.unsafeAuthorityIds,
      ...citationOutput.unsafeAuthorityIds,
    ]),
    directlyApplicableAuthorityIds: jurisdictionResults
      .filter((result) => result.jurisdictionFit === "directly-applicable")
      .map((result) => result.authorityId),
    wrongJurisdictionAuthorityIds: jurisdictionResults
      .filter((result) => result.jurisdictionFit === "wrong-jurisdiction")
      .map((result) => result.authorityId),
    warnings,
    summary:
      warnings.length > 0
        ? "Authority analysis found sources requiring verification, citation review, or jurisdiction review."
        : "Authority analysis found no major authority safety issues.",
  };
}

function mapContradictionNode(node: {
  id: string;
  sourceType: string;
  sourceId: string;
  title: string;
  content: string;
  confidence: string;
}): CaseContradictionNode {
  return {
    id: node.id,
    sourceType: node.sourceType,
    sourceId: node.sourceId,
    title: node.title,
    content: node.content,
    confidence: asCaseConfidence(node.confidence),
  };
}

function buildContradictionAnalysis(
  caseFile: MasterCaseSchema,
): CaseContradictionAnalysis {
  const contradictionResult = detectContradictions({
    caseFile,
  });

  const findings: CaseContradictionFinding[] = contradictionResult.findings.map(
    (finding) => ({
      id: finding.id,
      category: finding.category,
      severity: finding.severity,
      confidence: asCaseConfidence(finding.confidence),
      leftNode: mapContradictionNode(finding.leftNode),
      rightNode: mapContradictionNode(finding.rightNode),
      explanation: finding.explanation,
      whyItMatters: finding.whyItMatters,
      possibleResolutions: finding.possibleResolutions,
      judicialConcern: finding.judicialConcern,
      litigationRisk: finding.litigationRisk,
      requiresHumanReview: finding.requiresHumanReview,
    }),
  );

  return {
    version: "1.0.0",
    generatedAt: contradictionResult.createdAt,
    findings,
    totalFindings: contradictionResult.summary.totalFindings,
    criticalFindings: contradictionResult.summary.criticalFindings,
    highFindings: contradictionResult.summary.highFindings,
    moderateFindings: contradictionResult.summary.moderateFindings,
    lowFindings: contradictionResult.summary.lowFindings,
    credibilityRiskScore: contradictionResult.summary.credibilityRiskScore,
    overallRisk: contradictionResult.summary.overallRisk,
    warnings: contradictionResult.warnings,
    summary:
      contradictionResult.summary.totalFindings > 0
        ? "Contradiction analysis found factual, evidentiary, or credibility issues requiring review."
        : "Contradiction analysis found no major conflicts.",
  };
}

function buildCredibilityAnalysis(
  caseFile: MasterCaseSchema,
): CaseCredibilityAnalysis {
  const credibilityResult = assessCredibilityRisk({
    caseFile,
  });

  const findings: CaseCredibilityRiskFinding[] = credibilityResult.findings.map(
    (finding) => ({
      id: finding.id,
      category: finding.category,
      level: finding.level,
      score: finding.score,
      title: finding.title,
      explanation: finding.explanation,
      linkedContradictionIds: finding.linkedContradictionIds,
      judgeConcern: finding.judgeConcern,
      opposingCounselUse: finding.opposingCounselUse,
      recommendedFix: finding.recommendedFix,
    }),
  );

  return {
    version: "1.0.0",
    generatedAt: credibilityResult.generatedAt,
    overallScore: credibilityResult.overallScore,
    overallLevel: credibilityResult.overallLevel,
    findings,
    judgeConcernScore: credibilityResult.judgeConcernScore,
    crossExaminationRiskScore: credibilityResult.crossExaminationRiskScore,
    settlementPressureScore: credibilityResult.settlementPressureScore,
    documentReadinessImpact: credibilityResult.documentReadinessImpact,
    warnings: credibilityResult.warnings,
    nextActions: credibilityResult.nextActions,
    summary:
      credibilityResult.findings.length > 0
        ? "Credibility analysis found issues that may affect judge confidence, cross-examination, settlement posture, or document readiness."
        : "Credibility analysis found no major credibility risks.",
  };
}

function buildWorkflowState(
  intelligence: LegalIntelligenceResult,
  recommendedNextRoute: string | undefined,
  authorityAnalysis: CaseAuthorityAnalysis,
  contradictionAnalysis: CaseContradictionAnalysis,
  credibilityAnalysis: CaseCredibilityAnalysis,
): CaseWorkflowState {
  const proofActions = intelligence.elementProofAnalysis?.globalNextActions || [];

  return {
    currentRoute: undefined,
    recommendedNextRoute,
    activeStage: asCaseStage(intelligence.proceduralPosture.stage),
    courtPath: asCaseCourtPath(intelligence.proceduralPosture.courtPath),
    province: asCaseProvince(intelligence.proceduralPosture.province),
    blockers: uniqueStrings([
      ...intelligence.systemWarnings,
      ...intelligence.legalKnowledge.sourceWarnings,
      ...(intelligence.elementProofAnalysis?.globalWeaknesses || []),
      ...authorityAnalysis.warnings,
      ...contradictionAnalysis.warnings,
      ...credibilityAnalysis.warnings,
    ]),
    nextActions: uniqueStrings([
      ...intelligence.nextBestActions,
      ...proofActions,
      ...credibilityAnalysis.nextActions,
    ]),
    dependencyWarnings: uniqueStrings([
      ...intelligence.proceduralPosture.warnings,
      ...authorityAnalysis.warnings,
      ...contradictionAnalysis.warnings,
    ]),
    missingInformation: intelligence.missingInformation.map((item) => item.question),
  };
}

function buildReadinessState(
  intelligence: LegalIntelligenceResult,
  authorityAnalysis: CaseAuthorityAnalysis,
  contradictionAnalysis: CaseContradictionAnalysis,
  credibilityAnalysis: CaseCredibilityAnalysis,
): CaseReadinessState {
  const proofMaps = intelligence.elementProofAnalysis?.claimProofMaps || [];

  const weakProofCount = proofMaps.filter(
    (map) =>
      map.overallProofStrength === "low" ||
      map.overallProofStrength === "very-low",
  ).length;

  const blockerCount =
    intelligence.systemWarnings.length +
    intelligence.missingInformation.length +
    intelligence.litigationRisks.filter(
      (risk) => risk.severity === "high" || risk.severity === "critical",
    ).length +
    weakProofCount +
    authorityAnalysis.warnings.length +
    contradictionAnalysis.highFindings +
    contradictionAnalysis.criticalFindings * 2 +
    (credibilityAnalysis.overallLevel === "critical"
      ? 4
      : credibilityAnalysis.overallLevel === "serious"
        ? 3
        : credibilityAnalysis.overallLevel === "elevated"
          ? 2
          : 0);

  const base =
    intelligence.confidence === "very-high"
      ? 85
      : intelligence.confidence === "high"
        ? 70
        : intelligence.confidence === "medium"
          ? 50
          : intelligence.confidence === "low"
            ? 30
            : 15;

  const overallScore = Math.max(0, Math.min(100, base - blockerCount * 5));

  return {
    overallScore,
    overallLevel:
      overallScore >= 85
        ? "ready"
        : overallScore >= 70
          ? "near-ready"
          : overallScore >= 45
            ? "developing"
            : overallScore >= 20
              ? "early"
              : "not-ready",
    pleadingReadiness: asCaseConfidence(intelligence.confidence),
    evidenceReadiness:
      proofMaps.length > 0
        ? proofMaps.some(
            (map) =>
              map.overallProofStrength === "low" ||
              map.overallProofStrength === "very-low",
          )
          ? "low"
          : "medium"
        : intelligence.evidenceIssueLinks.length > 0
          ? "medium"
          : "low",
    proceduralReadiness: asCaseConfidence(intelligence.proceduralPosture.confidence),
    courtroomReadiness:
      credibilityAnalysis.overallLevel === "critical" ||
      credibilityAnalysis.overallLevel === "serious"
        ? "low"
        : proofMaps.length > 0
          ? "medium"
          : "low",
    settlementReadiness:
      credibilityAnalysis.settlementPressureScore >= 60 ? "low" : "medium",
    blockers: uniqueStrings([
      ...intelligence.systemWarnings,
      ...intelligence.missingInformation.map((item) => item.question),
      ...(intelligence.elementProofAnalysis?.globalWeaknesses || []),
      ...authorityAnalysis.warnings,
      ...contradictionAnalysis.warnings,
      ...credibilityAnalysis.warnings,
    ]),
    reasons: uniqueStrings([
      ...intelligence.nextBestActions,
      ...(intelligence.elementProofAnalysis?.globalNextActions || []),
      ...credibilityAnalysis.nextActions,
    ]),
  };
}

function buildAuditEvent(intelligence: LegalIntelligenceResult): CaseAuditEvent {
  return {
    id: createId("audit"),
    createdAt: nowIso(),
    authorityLayer: "court-simplified-brain",
    action: "Mapped LegalIntelligenceResult into MasterCaseSchema",
    explanation:
      "The bridge converted intelligence into the persistent case-state schema while preserving claims, warnings, evidence mapping, procedural posture, proof analysis, authority analysis, contradiction analysis, and credibility analysis.",
    affectedIds: [intelligence.id],
  };
}

function buildMemorySnapshot(masterCase: MasterCaseSchema): CaseMemorySnapshot {
  return {
    id: createId("snapshot"),
    createdAt: nowIso(),
    summary: masterCase.plainLanguageSummary,
    dominantClaimIds: masterCase.claims
      .filter((claim) => claim.status === "dominant")
      .map((claim) => claim.id),
    activeClaimIds: masterCase.claims
      .filter((claim) => claim.status === "active" || claim.status === "possible")
      .map((claim) => claim.id),
    rejectedClaimIds: masterCase.claims
      .filter((claim) => claim.status === "rejected" || claim.status === "suppressed")
      .map((claim) => claim.id),
    evidenceCount: masterCase.evidence.length,
    documentCount: masterCase.documents.length,
    stage: masterCase.stage,
    courtPath: masterCase.courtPath,
    warnings: masterCase.systemWarnings,
    proofWeaknessCount: masterCase.proofAnalysis.globalWeaknesses.length,
    proofStrengthCount: masterCase.proofAnalysis.globalStrengths.length,
    authorityWarningCount: masterCase.authorityAnalysis.warnings.length,
    contradictionCount: masterCase.contradictionAnalysis.totalFindings,
    credibilityRiskLevel: masterCase.credibilityAnalysis.overallLevel,
  };
}

export function buildMasterCaseFromIntelligence(args: {
  intelligence: LegalIntelligenceResult;
  existingCase?: MasterCaseSchema;
  recommendedNextRoute?: string;
}): MasterCaseSchema {
  const { intelligence, existingCase } = args;
  const now = nowIso();
  const proofAnalysis = mapProofAnalysis(intelligence);
  const legalKnowledge = mapLegalKnowledge(intelligence);

  const emptyAuthority = emptyAuthorityAnalysis();
  const emptyContradiction = emptyContradictionAnalysis();
  const emptyCredibility = emptyCredibilityAnalysis();

  const provisionalCase: MasterCaseSchema = {
    id:
      existingCase?.id ||
      intelligence.normalizedIntake.caseId ||
      createId("master_case"),
    version: "1.0.0",
    createdAt: existingCase?.createdAt || now,
    updatedAt: now,

    title: existingCase?.title,
    userId: existingCase?.userId,

    courtPath: asCaseCourtPath(intelligence.proceduralPosture.courtPath),
    province: asCaseProvince(intelligence.proceduralPosture.province),
    stage: asCaseStage(intelligence.proceduralPosture.stage),
    status: existingCase?.status || "active",

    plainLanguageSummary: intelligence.plainLanguageSummary,
    structuredSummary: intelligence.structuredCaseSummary,

    parties: intelligence.normalizedIntake.parties.map(mapParty),
    claims: intelligence.claimClassifications.map(mapClaim),
    timeline: intelligence.normalizedIntake.events.map(mapEvent),
    evidence: intelligence.normalizedIntake.evidence.map(mapEvidence),
    documents: existingCase?.documents || [],
    legalKnowledge,

    risks: mapRisks(intelligence),
    judicialConcerns: mapJudicialConcerns(intelligence),
    opposingArguments: mapOpposingArguments(intelligence),

    proofAnalysis,
    authorityAnalysis: emptyAuthority,
    contradictionAnalysis: emptyContradiction,
    credibilityAnalysis: emptyCredibility,

    workflow: buildWorkflowState(
      intelligence,
      args.recommendedNextRoute,
      emptyAuthority,
      emptyContradiction,
      emptyCredibility,
    ),
    readiness: {
      overallScore: 0,
      overallLevel: "not-ready",
      pleadingReadiness: "low",
      evidenceReadiness: "low",
      proceduralReadiness: "low",
      courtroomReadiness: "low",
      settlementReadiness: "low",
      blockers: [],
      reasons: [],
    },

    memorySnapshots: existingCase?.memorySnapshots || [],
    auditTrail: [
      ...(existingCase?.auditTrail || []),
      buildAuditEvent(intelligence),
    ],

    systemWarnings: intelligence.systemWarnings,
    confidence: asCaseConfidence(intelligence.confidence),
  };

  const authorityAnalysis = buildAuthorityAnalysis(
    legalKnowledge,
    provisionalCase.province,
  );

  const caseWithAuthority: MasterCaseSchema = {
    ...provisionalCase,
    authorityAnalysis,
  };

  const contradictionAnalysis = buildContradictionAnalysis(caseWithAuthority);

  const caseWithContradictions: MasterCaseSchema = {
    ...caseWithAuthority,
    contradictionAnalysis,
  };

  const credibilityAnalysis = buildCredibilityAnalysis(caseWithContradictions);

  const finalCase: MasterCaseSchema = {
    ...caseWithContradictions,
    credibilityAnalysis,
    workflow: buildWorkflowState(
      intelligence,
      args.recommendedNextRoute,
      authorityAnalysis,
      contradictionAnalysis,
      credibilityAnalysis,
    ),
    readiness: buildReadinessState(
      intelligence,
      authorityAnalysis,
      contradictionAnalysis,
      credibilityAnalysis,
    ),
  };

  return {
    ...finalCase,
    memorySnapshots: [
      ...finalCase.memorySnapshots,
      buildMemorySnapshot(finalCase),
    ],
  };
}