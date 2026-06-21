import {
  CaseCourtPath,
  CaseKnowledgeAuthorityLevel,
  CaseKnowledgeVerificationStatus,
  CaseLegalDomain,
  CaseProvince,
  CaseStage,
} from "../architecture/masterCaseSchema";

export type LegalAuthoritySourceKind =
  | "constitution"
  | "statute"
  | "regulation"
  | "rule"
  | "practice-direction"
  | "official-form"
  | "official-guide"
  | "case-law"
  | "tribunal-decision"
  | "secondary-source"
  | "operational-guidance"
  | "ai-inference"
  | "unknown";

export type LegalAuthorityReliabilityTier =
  | "binding"
  | "official"
  | "persuasive"
  | "operational"
  | "inferred"
  | "unknown";

export type LegalAuthorityUsePermission =
  | "may-cite"
  | "may-explain"
  | "may-use-for-guidance"
  | "internal-only"
  | "do-not-use";

export type LegalAuthorityRegistryEntry = {
  id: string;
  title: string;
  sourceKind: LegalAuthoritySourceKind;
  authorityLevel: CaseKnowledgeAuthorityLevel;
  reliabilityTier: LegalAuthorityReliabilityTier;
  verificationStatus: CaseKnowledgeVerificationStatus;

  jurisdiction: CaseProvince | "Canada" | "Unknown";
  courtPaths: CaseCourtPath[];
  legalDomains: CaseLegalDomain[];
  proceduralStages: CaseStage[];

  mayUseFor: LegalAuthorityUsePermission[];
  mustNotUseFor: string[];

  requiresVerificationBeforeUse: boolean;
  requiresCurrentnessCheck: boolean;
  requiresJurisdictionCheck: boolean;
  requiresContextCheck: boolean;

  explanation: string;
};

export const LEGAL_AUTHORITY_REGISTRY: LegalAuthorityRegistryEntry[] = [
  {
    id: "AUTH_CONSTITUTION_001",
    title: "Constitutional and Charter authority",
    sourceKind: "constitution",
    authorityLevel: "constitutional",
    reliabilityTier: "binding",
    verificationStatus: "needs-review",
    jurisdiction: "Canada",
    courtPaths: ["civil", "criminal-related", "unknown"],
    legalDomains: ["civil-charter", "civil-human-rights", "procedural"],
    proceduralStages: [
      "pre-litigation",
      "starting-case",
      "responding",
      "already-started",
      "motion",
      "trial",
      "appeal",
      "urgent",
      "not-sure",
    ],
    mayUseFor: ["may-explain", "may-use-for-guidance"],
    mustNotUseFor: [
      "Do not cite or rely on Charter provisions without verifying the exact section, remedy, jurisdiction, and procedural vehicle.",
    ],
    requiresVerificationBeforeUse: true,
    requiresCurrentnessCheck: true,
    requiresJurisdictionCheck: true,
    requiresContextCheck: true,
    explanation:
      "Constitutional material is high authority but must be tied to the correct procedural vehicle and remedy.",
  },
  {
    id: "AUTH_STATUTE_001",
    title: "Statutes and legislation",
    sourceKind: "statute",
    authorityLevel: "statute",
    reliabilityTier: "binding",
    verificationStatus: "needs-review",
    jurisdiction: "Unknown",
    courtPaths: [
      "family",
      "small-claims",
      "civil",
      "tribunal",
      "ltb",
      "immigration",
      "criminal-related",
      "unknown",
    ],
    legalDomains: [
      "defamation",
      "contract",
      "property-damage",
      "negligence",
      "personal-injury",
      "harassment",
      "employment",
      "debt",
      "consumer",
      "family-parenting",
      "family-support",
      "family-property",
      "family-safety",
      "civil-charter",
      "civil-human-rights",
      "civil-institutional-liability",
      "landlord-tenant",
      "immigration",
      "procedural",
      "unknown",
    ],
    proceduralStages: [
      "pre-litigation",
      "starting-case",
      "responding",
      "already-started",
      "conference",
      "motion",
      "trial",
      "settlement",
      "enforcement",
      "appeal",
      "urgent",
      "closed",
      "not-sure",
    ],
    mayUseFor: ["may-explain", "may-use-for-guidance"],
    mustNotUseFor: [
      "Do not cite a statute unless the text, jurisdiction, version, and applicability have been verified.",
    ],
    requiresVerificationBeforeUse: true,
    requiresCurrentnessCheck: true,
    requiresJurisdictionCheck: true,
    requiresContextCheck: true,
    explanation:
      "Statutes are binding only when the correct jurisdiction, current version, and factual/legal context are confirmed.",
  },
  {
    id: "AUTH_RULE_001",
    title: "Rules of court and tribunal procedure",
    sourceKind: "rule",
    authorityLevel: "rule-of-court",
    reliabilityTier: "binding",
    verificationStatus: "needs-review",
    jurisdiction: "Unknown",
    courtPaths: ["family", "small-claims", "civil", "tribunal", "ltb", "immigration", "unknown"],
    legalDomains: ["procedural"],
    proceduralStages: [
      "starting-case",
      "responding",
      "already-started",
      "conference",
      "motion",
      "trial",
      "settlement",
      "enforcement",
      "appeal",
      "urgent",
      "not-sure",
    ],
    mayUseFor: ["may-explain", "may-use-for-guidance"],
    mustNotUseFor: [
      "Do not recommend procedural steps until the current rule, forum, deadline, and filing/service context are verified.",
    ],
    requiresVerificationBeforeUse: true,
    requiresCurrentnessCheck: true,
    requiresJurisdictionCheck: true,
    requiresContextCheck: true,
    explanation:
      "Procedural rules control sequencing, filing, service, deadlines, and hearing preparation.",
  },
  {
    id: "AUTH_OFFICIAL_FORM_001",
    title: "Official court and tribunal forms",
    sourceKind: "official-form",
    authorityLevel: "official-form",
    reliabilityTier: "official",
    verificationStatus: "needs-review",
    jurisdiction: "Unknown",
    courtPaths: ["family", "small-claims", "civil", "tribunal", "ltb", "immigration", "unknown"],
    legalDomains: ["procedural"],
    proceduralStages: [
      "starting-case",
      "responding",
      "already-started",
      "conference",
      "motion",
      "trial",
      "settlement",
      "enforcement",
      "appeal",
      "urgent",
      "not-sure",
    ],
    mayUseFor: ["may-use-for-guidance"],
    mustNotUseFor: [
      "Do not let forms determine claim theory. Forms are downstream outputs of procedural and litigation cognition.",
    ],
    requiresVerificationBeforeUse: true,
    requiresCurrentnessCheck: true,
    requiresJurisdictionCheck: true,
    requiresContextCheck: true,
    explanation:
      "Official forms are procedural tools and must be selected only after court path, stage, relief, and claim model are confirmed.",
  },
  {
    id: "AUTH_CASELAW_001",
    title: "Case law and precedent",
    sourceKind: "case-law",
    authorityLevel: "superior-court-persuasive",
    reliabilityTier: "persuasive",
    verificationStatus: "needs-review",
    jurisdiction: "Unknown",
    courtPaths: ["family", "small-claims", "civil", "tribunal", "ltb", "immigration", "criminal-related", "unknown"],
    legalDomains: [
      "defamation",
      "contract",
      "property-damage",
      "negligence",
      "personal-injury",
      "harassment",
      "employment",
      "debt",
      "consumer",
      "family-parenting",
      "family-support",
      "family-property",
      "family-safety",
      "civil-charter",
      "civil-human-rights",
      "civil-institutional-liability",
      "landlord-tenant",
      "immigration",
      "procedural",
      "unknown",
    ],
    proceduralStages: [
      "pre-litigation",
      "starting-case",
      "responding",
      "already-started",
      "conference",
      "motion",
      "trial",
      "settlement",
      "enforcement",
      "appeal",
      "urgent",
      "not-sure",
    ],
    mayUseFor: ["may-explain", "may-use-for-guidance"],
    mustNotUseFor: [
      "Do not cite a case unless citation, court level, jurisdiction, facts, legal issue, and current treatment are verified.",
    ],
    requiresVerificationBeforeUse: true,
    requiresCurrentnessCheck: true,
    requiresJurisdictionCheck: true,
    requiresContextCheck: true,
    explanation:
      "Case law must be fact-matched and authority-ranked before being used for legal support.",
  },
  {
    id: "AUTH_OPERATIONAL_001",
    title: "Operational litigation guidance",
    sourceKind: "operational-guidance",
    authorityLevel: "operational-guidance",
    reliabilityTier: "operational",
    verificationStatus: "not-verified",
    jurisdiction: "Unknown",
    courtPaths: [
      "family",
      "small-claims",
      "civil",
      "tribunal",
      "ltb",
      "immigration",
      "criminal-related",
      "unknown",
    ],
    legalDomains: [
      "defamation",
      "contract",
      "property-damage",
      "negligence",
      "personal-injury",
      "harassment",
      "employment",
      "debt",
      "consumer",
      "family-parenting",
      "family-support",
      "family-property",
      "family-safety",
      "civil-charter",
      "civil-human-rights",
      "civil-institutional-liability",
      "landlord-tenant",
      "immigration",
      "procedural",
      "unknown",
    ],
    proceduralStages: [
      "pre-litigation",
      "starting-case",
      "responding",
      "already-started",
      "conference",
      "motion",
      "trial",
      "settlement",
      "enforcement",
      "appeal",
      "urgent",
      "closed",
      "not-sure",
    ],
    mayUseFor: ["may-use-for-guidance", "internal-only"],
    mustNotUseFor: [
      "Do not present operational guidance as binding law or verified authority.",
    ],
    requiresVerificationBeforeUse: false,
    requiresCurrentnessCheck: true,
    requiresJurisdictionCheck: true,
    requiresContextCheck: true,
    explanation:
      "Operational guidance helps users understand practical litigation risks but is not legal authority.",
  },
  {
    id: "AUTH_AI_INFERENCE_001",
    title: "AI inference and generated reasoning",
    sourceKind: "ai-inference",
    authorityLevel: "ai-inference",
    reliabilityTier: "inferred",
    verificationStatus: "not-verified",
    jurisdiction: "Unknown",
    courtPaths: [
      "family",
      "small-claims",
      "civil",
      "tribunal",
      "ltb",
      "immigration",
      "criminal-related",
      "unknown",
    ],
    legalDomains: [
      "defamation",
      "contract",
      "property-damage",
      "negligence",
      "personal-injury",
      "harassment",
      "employment",
      "debt",
      "consumer",
      "family-parenting",
      "family-support",
      "family-property",
      "family-safety",
      "civil-charter",
      "civil-human-rights",
      "civil-institutional-liability",
      "landlord-tenant",
      "immigration",
      "procedural",
      "unknown",
    ],
    proceduralStages: [
      "pre-litigation",
      "starting-case",
      "responding",
      "already-started",
      "conference",
      "motion",
      "trial",
      "settlement",
      "enforcement",
      "appeal",
      "urgent",
      "closed",
      "not-sure",
    ],
    mayUseFor: ["internal-only"],
    mustNotUseFor: [
      "Do not cite AI inference as authority.",
      "Do not present AI inference as verified law.",
      "Do not allow AI inference to override verified authority.",
    ],
    requiresVerificationBeforeUse: true,
    requiresCurrentnessCheck: true,
    requiresJurisdictionCheck: true,
    requiresContextCheck: true,
    explanation:
      "AI inference is the lowest authority layer and must remain clearly separated from verified legal sources.",
  },
];

export function getAuthorityRegistry(): LegalAuthorityRegistryEntry[] {
  return LEGAL_AUTHORITY_REGISTRY;
}

export function getAuthorityEntriesForContext(args: {
  courtPath?: CaseCourtPath;
  jurisdiction?: CaseProvince | "Canada" | "Unknown";
  legalDomain?: CaseLegalDomain;
  stage?: CaseStage;
}): LegalAuthorityRegistryEntry[] {
  return LEGAL_AUTHORITY_REGISTRY.filter((entry) => {
    const courtPathOk =
      !args.courtPath ||
      entry.courtPaths.includes(args.courtPath) ||
      entry.courtPaths.includes("unknown");

    const jurisdictionOk =
      !args.jurisdiction ||
      entry.jurisdiction === args.jurisdiction ||
      entry.jurisdiction === "Unknown" ||
      args.jurisdiction === "Unknown";

    const domainOk =
      !args.legalDomain ||
      entry.legalDomains.includes(args.legalDomain) ||
      entry.legalDomains.includes("unknown");

    const stageOk =
      !args.stage ||
      entry.proceduralStages.includes(args.stage) ||
      entry.proceduralStages.includes("not-sure");

    return courtPathOk && jurisdictionOk && domainOk && stageOk;
  });
}

export function mayUseAuthorityForCitation(
  entry: LegalAuthorityRegistryEntry,
): boolean {
  return (
    entry.mayUseFor.includes("may-cite") &&
    entry.verificationStatus === "verified" &&
    !entry.requiresVerificationBeforeUse
  );
}

export function authorityRequiresWarning(
  entry: LegalAuthorityRegistryEntry,
): boolean {
  return (
    entry.verificationStatus !== "verified" ||
    entry.requiresVerificationBeforeUse ||
    entry.requiresCurrentnessCheck ||
    entry.requiresJurisdictionCheck ||
    entry.requiresContextCheck
  );
}

export function buildAuthorityWarning(entry: LegalAuthorityRegistryEntry): string {
  return `${entry.title}: verify source, jurisdiction, currentness, and context before relying on this authority.`;
}