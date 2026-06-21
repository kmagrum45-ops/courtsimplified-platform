import {
  KnowledgeAuditMetadata,
  KnowledgeSourceMetadata,
  KnowledgeUseRules,
  LegalKnowledgeObject,
} from "./legalKnowledgeObjects";

function nowIso(): string {
  return new Date().toISOString();
}

const createdAt = nowIso();

const operationalUseRules: KnowledgeUseRules = {
  mayUseFor: ["may-use-for-guidance", "internal-only"],
  mustNotUseFor: [
    "Do not cite as law.",
    "Do not present as verified legal authority.",
  ],
  requiresVerificationBeforeCitation: true,
  requiresCurrentnessCheck: true,
  requiresJurisdictionCheck: true,
  requiresContextCheck: true,
  requiresHumanReviewBeforeFiling: true,
};

function operationalSource(args: {
  sourceId: string;
  title: string;
}): KnowledgeSourceMetadata {
  return {
    sourceId: args.sourceId,
    title: args.title,
    sourceKind: "operational-guidance",
    authorityLevel: "operational-guidance",
    reliabilityTier: "operational",
    verificationStatus: "not-verified",
    extractionStatus: "human-reviewed",
    jurisdiction: "Unknown",
    retrievedAt: createdAt,
  };
}

function operationalAudit(args: {
  notes: string[];
  limitations: string[];
  riskLevel: "low" | "medium" | "high";
}): KnowledgeAuditMetadata {
  return {
    createdAt,
    updatedAt: createdAt,
    createdBy: "human",
    updatedBy: "human",
    reviewNotes: args.notes,
    knownLimitations: args.limitations,
    riskLevel: args.riskLevel,
  };
}

export const DOCTRINE_SEED_LIBRARY: LegalKnowledgeObject[] = [
  {
    id: "SEED_EVIDENCE_DIGITAL_CONTEXT_001",
    version: "1.0.0",
    kind: "evidence-principle",
    title: "Digital evidence requires context and authenticity review",
    summary:
      "Screenshots, messages, emails, and social-media evidence should be preserved with sender, recipient, date, platform, surrounding context, and original thread where possible.",
    source: operationalSource({
      sourceId: "SEED_OPERATIONAL_EVIDENCE",
      title: "CourtSimplified operational evidence doctrine",
    }),
    applicability: {
      courtPaths: ["family", "small-claims", "civil", "tribunal", "ltb", "immigration", "unknown"],
      jurisdictions: ["Unknown"],
      legalDomains: [
        "defamation",
        "harassment",
        "family-parenting",
        "family-safety",
        "employment",
        "consumer",
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
        "urgent",
        "not-sure",
      ],
      userPostures: ["starting", "responding", "already-filed", "moving-party", "responding-party", "not-sure"],
    },
    useRules: operationalUseRules,
    audit: operationalAudit({
      notes: ["Seed object for operational evidence guidance only."],
      limitations: ["Must later be connected to verified evidence rules and jurisdiction-specific procedure."],
      riskLevel: "medium",
    }),
    tags: ["digital-evidence", "screenshots", "authenticity", "missing-context"],
    plainLanguageExplanation:
      "Digital evidence is stronger when the full context is preserved, not just one cropped screenshot.",
    systemWarnings: ["Operational guidance only. Verify evidentiary rules before filing or citing."],
    evidenceIssue: "digital-metadata",
    principle:
      "Digital communications should be preserved in a way that supports authorship, timing, context, completeness, and authenticity.",
    proofNeeded: [
      "Full conversation thread",
      "Date and time",
      "Sender and recipient",
      "Platform or app",
      "Original file or export where possible",
      "Context before and after the key message",
    ],
    commonAttacks: [
      "Screenshot is incomplete",
      "Sender identity is unclear",
      "Context is missing",
      "Message may have been edited or selectively captured",
    ],
    strengtheningSteps: [
      "Preserve the full thread",
      "Avoid cropping important context",
      "Keep originals",
      "Identify who received or saw the message",
    ],
    courtReadinessIndicators: [
      "Full conversation available",
      "Sender/recipient visible",
      "Dates visible",
      "Evidence linked to a specific issue or claim element",
    ],
  },

  {
    id: "SEED_DEFAMATION_PATTERN_001",
    version: "1.0.0",
    kind: "litigation-pattern",
    title: "Defamation cases require exact words and publication proof",
    summary:
      "A defamation-style claim is usually weak if the exact words, recipients, context, and harm are unclear.",
    source: operationalSource({
      sourceId: "SEED_OPERATIONAL_DEFAMATION",
      title: "CourtSimplified operational defamation pattern",
    }),
    applicability: {
      courtPaths: ["small-claims", "civil", "unknown"],
      jurisdictions: ["Unknown"],
      legalDomains: ["defamation"],
      proceduralStages: [
        "pre-litigation",
        "starting-case",
        "responding",
        "already-started",
        "conference",
        "trial",
        "settlement",
        "not-sure",
      ],
      userPostures: ["starting", "responding", "already-filed", "not-sure"],
    },
    useRules: operationalUseRules,
    audit: operationalAudit({
      notes: ["Seed pattern for litigation reasoning only."],
      limitations: ["Must later be connected to verified defamation law and jurisdiction-specific authorities."],
      riskLevel: "medium",
    }),
    tags: ["defamation", "publication", "exact-words", "reputation"],
    plainLanguageExplanation:
      "For a defamation-style case, the system should focus on the exact statement, who received it, why it referred to the user, and what harm it caused.",
    systemWarnings: ["Operational guidance only. Not verified legal authority."],
    patternName: "Defamation exact statement and publication pattern",
    patternCategory: "common-evidence-gap",
    patternDescription:
      "Users often describe reputational harm without clearly identifying the exact words or who received them.",
    whyItMatters:
      "Without exact words and publication proof, the claim may be difficult to organize and prove.",
    detectionSignals: [
      "called me",
      "told people",
      "spread rumours",
      "spread rumors",
      "false accusation",
      "reputation",
      "discredit",
    ],
    recommendedResponses: [
      "Ask for the exact words",
      "Ask who heard, saw, or received the statement",
      "Ask for screenshots/messages/witnesses",
      "Ask how the statement caused harm",
    ],
    evidenceNeeded: [
      "Screenshot or message",
      "Recipient or witness names",
      "Dates",
      "Context",
      "Damages explanation",
    ],
    userFacingWarning:
      "The case will be stronger if the exact statement, audience, date, and proof of harm are clearly organized.",
  },

  {
    id: "SEED_DAMAGES_PROPORTIONALITY_001",
    version: "1.0.0",
    kind: "damages-principle",
    title: "Damages require proof, causation, and proportionality",
    summary:
      "A claimed amount should be connected to actual harm, evidence, explanation, causation, and proportionality.",
    source: operationalSource({
      sourceId: "SEED_OPERATIONAL_DAMAGES",
      title: "CourtSimplified operational damages doctrine",
    }),
    applicability: {
      courtPaths: ["family", "small-claims", "civil", "tribunal", "ltb", "unknown"],
      jurisdictions: ["Unknown"],
      legalDomains: [
        "defamation",
        "contract",
        "property-damage",
        "negligence",
        "personal-injury",
        "employment",
        "debt",
        "consumer",
        "family-support",
        "family-property",
        "civil-human-rights",
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
        "not-sure",
      ],
      userPostures: ["starting", "responding", "already-filed", "not-sure"],
    },
    useRules: operationalUseRules,
    audit: operationalAudit({
      notes: ["Seed damages reasoning principle."],
      limitations: ["Must later be connected to verified damages law by claim type and jurisdiction."],
      riskLevel: "medium",
    }),
    tags: ["damages", "causation", "proportionality", "proof"],
    plainLanguageExplanation:
      "A damages number is stronger when the user can explain how it was calculated and what evidence supports it.",
    systemWarnings: ["Operational guidance only. Verify damages law and evidentiary requirements before filing."],
    damagesType: "general",
    causationRequirements: [
      "Connect the harm to the other side’s conduct",
      "Explain why the loss flowed from the event",
    ],
    proofRequirements: [
      "Receipts or records where available",
      "Witness or context evidence where reputational/emotional harm is claimed",
      "Calculation explanation",
      "Timeline connecting event to harm",
    ],
    proportionalityConcerns: [
      "Claimed amount may appear unsupported",
      "Claimed amount may appear excessive without explanation",
    ],
    mitigationIssues: [
      "Whether the user took reasonable steps to reduce loss may become relevant depending on claim type.",
    ],
    calculationGuidance: [
      "Break the amount into categories",
      "Separate proven financial loss from general harm",
      "Explain non-financial harm carefully",
    ],
    warningSignals: [
      "Large amount with no calculation",
      "No evidence of impact",
      "No link between event and loss",
    ],
  },

  {
    id: "SEED_JUDICIAL_CONCERN_ORGANIZATION_001",
    version: "1.0.0",
    kind: "judicial-concern",
    title: "Courts need organized facts, proof, and procedural clarity",
    summary:
      "A court-facing case is stronger when facts, dates, parties, issues, evidence, and requested relief are organized clearly.",
    source: operationalSource({
      sourceId: "SEED_OPERATIONAL_JUDICIAL",
      title: "CourtSimplified operational judicial concern doctrine",
    }),
    applicability: {
      courtPaths: ["family", "small-claims", "civil", "tribunal", "ltb", "immigration", "unknown"],
      jurisdictions: ["Unknown"],
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
      userPostures: ["starting", "responding", "already-filed", "moving-party", "responding-party", "enforcing", "appealing", "not-sure"],
    },
    useRules: operationalUseRules,
    audit: operationalAudit({
      notes: ["Seed judicial concern pattern."],
      limitations: ["General operational guidance only."],
      riskLevel: "low",
    }),
    tags: ["judicial-concern", "organization", "courtroom-readiness"],
    plainLanguageExplanation:
      "A court is more likely to understand the case if the facts, evidence, dates, and requested outcome are organized clearly.",
    systemWarnings: ["Operational guidance only. Not a prediction about any specific judge."],
    concernCategory: "evidence",
    concern:
      "The court may struggle to assess the case if facts, evidence, dates, and relief are not clearly organized.",
    whyCourtMayCare:
      "Courts need concrete facts, proof, and procedural clarity to understand what is being requested and why.",
    howToAddress: [
      "Create a clear timeline",
      "Map evidence to issues",
      "Identify the requested relief",
      "Separate facts from argument",
      "Avoid unsupported conclusions",
    ],
    documentsAffected: [
      "pleadings",
      "affidavits",
      "conference briefs",
      "trial materials",
      "settlement materials",
    ],
    evidenceAffected: [
      "screenshots",
      "messages",
      "witness statements",
      "financial records",
      "documents",
    ],
  },

  {
    id: "SEED_LIMITATION_DISCOVERABILITY_001",
    version: "1.0.0",
    kind: "judicial-concern",
    title: "Older events require limitation and discoverability screening",
    summary:
      "When events happened long ago or dates are unclear, the system must flag limitation, discoverability, notice, delay, and procedural timing risk.",
    source: operationalSource({
      sourceId: "SEED_OPERATIONAL_LIMITATIONS",
      title: "CourtSimplified operational limitation screening doctrine",
    }),
    applicability: {
      courtPaths: ["small-claims", "civil", "family", "tribunal", "ltb", "unknown"],
      jurisdictions: ["Unknown"],
      legalDomains: [
        "defamation",
        "contract",
        "property-damage",
        "negligence",
        "personal-injury",
        "civil-charter",
        "civil-human-rights",
        "civil-institutional-liability",
        "employment",
        "consumer",
        "procedural",
        "unknown",
      ],
      proceduralStages: [
        "pre-litigation",
        "starting-case",
        "responding",
        "already-started",
        "motion",
        "trial",
        "appeal",
        "not-sure",
      ],
      userPostures: ["starting", "responding", "already-filed", "moving-party", "responding-party", "not-sure"],
    },
    useRules: operationalUseRules,
    audit: operationalAudit({
      notes: ["Seed limitation screening object for operational triage."],
      limitations: ["Does not state any limitation period. Must be replaced or supplemented by verified jurisdiction-specific authority."],
      riskLevel: "high",
    }),
    tags: ["limitations", "discoverability", "delay", "notice", "old-events"],
    plainLanguageExplanation:
      "If the events happened a long time ago, the case needs a date-by-date explanation before filing.",
    systemWarnings: [
      "Operational guidance only. Do not state limitation deadlines without verified legal authority.",
    ],
    concernCategory: "limitation",
    concern:
      "The court may question whether the claim, motion, appeal, notice, or procedural step is out of time.",
    whyCourtMayCare:
      "Limitation, discoverability, delay, and notice issues can stop or narrow a case before the facts are fully heard.",
    howToAddress: [
      "Create a date-by-date chronology",
      "Identify the event date",
      "Identify the discovery date",
      "Identify when the user knew the defendant’s role",
      "Identify any incapacity, trauma, concealment, or delayed-record access facts",
      "Verify the applicable limitation, notice, and procedural deadline rules",
    ],
    documentsAffected: [
      "pleadings",
      "motion materials",
      "affidavits",
      "appeal materials",
      "case conference materials",
    ],
    evidenceAffected: [
      "records showing discovery date",
      "medical or incapacity evidence",
      "correspondence",
      "court records",
      "timeline documents",
    ],
  },

  {
    id: "SEED_PUBLIC_AUTHORITY_SCREENING_001",
    version: "1.0.0",
    kind: "litigation-pattern",
    title: "Public authority claims require threshold screening",
    summary:
      "Claims involving Crown, police, government, hospitals, ministries, courts, or public authorities require careful screening for immunity, discretion, notice, leave, jurisdiction, causation, and proper defendant naming.",
    source: operationalSource({
      sourceId: "SEED_OPERATIONAL_PUBLIC_AUTHORITY",
      title: "CourtSimplified operational public authority screening pattern",
    }),
    applicability: {
      courtPaths: ["civil", "tribunal", "criminal-related", "unknown"],
      jurisdictions: ["Unknown"],
      legalDomains: [
        "civil-charter",
        "civil-human-rights",
        "civil-institutional-liability",
        "negligence",
        "personal-injury",
        "procedural",
        "unknown",
      ],
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
      userPostures: ["starting", "responding", "already-filed", "moving-party", "responding-party", "appealing", "not-sure"],
    },
    useRules: operationalUseRules,
    audit: operationalAudit({
      notes: ["Seed pattern for public authority risk screening."],
      limitations: ["Must later be connected to verified Crown liability, police liability, Charter, negligence, immunity, and notice authorities."],
      riskLevel: "high",
    }),
    tags: ["public-authority", "crown", "police", "government", "charter", "immunity", "leave"],
    plainLanguageExplanation:
      "Cases against public actors need careful framing so the claim targets actionable conduct, not protected decisions.",
    systemWarnings: [
      "Operational guidance only. Verify leave, notice, immunity, jurisdiction, and cause-of-action requirements.",
    ],
    patternName: "Public authority threshold screening",
    patternCategory: "common-procedural-error",
    patternDescription:
      "Users often describe harm caused after public decisions or institutional processes without separating protected discretion from operational conduct.",
    whyItMatters:
      "A public authority claim can fail early if it is framed as a collateral attack, hindsight disagreement, or unsupported institutional negligence theory.",
    detectionSignals: [
      "Crown",
      "Attorney General",
      "police",
      "government",
      "ministry",
      "hospital",
      "bail",
      "prosecution",
      "public authority",
      "Charter",
    ],
    recommendedResponses: [
      "Separate each defendant’s role",
      "Identify operational conduct separately from protected discretion",
      "Build a chronology of knowledge, warnings, decisions, and communications",
      "Screen for leave, notice, immunity, jurisdiction, and limitation issues",
      "Identify causation and foreseeability evidence",
    ],
    evidenceNeeded: [
      "Court records",
      "Orders",
      "Transcripts",
      "Recognizances",
      "Police records",
      "Medical or institutional records",
      "Correspondence",
      "Chronology",
      "Proof of knowledge and causation",
    ],
    userFacingWarning:
      "Public authority cases need careful legal screening before drafting because immunity, leave, notice, and causation issues can stop the case early.",
  },

  {
    id: "SEED_FAMILY_PARENTING_BEST_INTERESTS_001",
    version: "1.0.0",
    kind: "litigation-pattern",
    title: "Family parenting cases must stay child-focused",
    summary:
      "Parenting and decision-making disputes should be organized around the child’s needs, stability, safety, history of care, practical schedule, communication, and evidence.",
    source: operationalSource({
      sourceId: "SEED_OPERATIONAL_FAMILY_PARENTING",
      title: "CourtSimplified operational family parenting pattern",
    }),
    applicability: {
      courtPaths: ["family", "unknown"],
      jurisdictions: ["Unknown"],
      legalDomains: ["family-parenting", "family-safety", "family-support", "procedural", "unknown"],
      proceduralStages: [
        "pre-litigation",
        "starting-case",
        "responding",
        "already-started",
        "conference",
        "motion",
        "trial",
        "settlement",
        "urgent",
        "not-sure",
      ],
      userPostures: ["starting", "responding", "already-filed", "moving-party", "responding-party", "not-sure"],
    },
    useRules: operationalUseRules,
    audit: operationalAudit({
      notes: ["Seed object for family parenting litigation organization."],
      limitations: ["Must later be connected to verified Divorce Act, Children’s Law Reform Act, Family Law Rules, and Ontario family procedure sources."],
      riskLevel: "medium",
    }),
    tags: ["family", "parenting", "best-interests", "decision-making", "parenting-time"],
    plainLanguageExplanation:
      "Family parenting material is stronger when it focuses on the child, not just conflict between adults.",
    systemWarnings: [
      "Operational guidance only. Verify family law, forms, disclosure, and procedure before filing.",
    ],
    patternName: "Child-focused parenting organization",
    patternCategory: "common-judge-concern",
    patternDescription:
      "Users often present adult conflict without clearly connecting facts to the child’s best interests and practical parenting plan.",
    whyItMatters:
      "Family courts need concrete child-focused evidence about care, school, health, stability, safety, and practical scheduling.",
    detectionSignals: [
      "custody",
      "decision-making",
      "parenting time",
      "access",
      "child support",
      "school",
      "doctor",
      "status quo",
      "best interests",
    ],
    recommendedResponses: [
      "Organize the child’s schedule",
      "Identify history of care",
      "Separate parenting time from decision-making",
      "Identify school, medical, safety, and communication evidence",
      "Explain why the requested arrangement helps the child",
    ],
    evidenceNeeded: [
      "Current schedule",
      "Proposed schedule",
      "School records",
      "Medical records if relevant",
      "Communication records",
      "Proof of involvement",
      "Safety evidence if alleged",
    ],
    userFacingWarning:
      "The strongest family position explains how the requested order benefits the child with specific facts and evidence.",
  },

  {
    id: "SEED_BURDEN_PROOF_MAPPING_001",
    version: "1.0.0",
    kind: "evidence-principle",
    title: "Every claim needs evidence mapped to each required point",
    summary:
      "The system should not treat a story as court-ready until each major issue is connected to supporting facts, documents, witnesses, dates, and remedy proof.",
    source: operationalSource({
      sourceId: "SEED_OPERATIONAL_PROOF_MAPPING",
      title: "CourtSimplified operational proof mapping doctrine",
    }),
    applicability: {
      courtPaths: ["family", "small-claims", "civil", "tribunal", "ltb", "immigration", "unknown"],
      jurisdictions: ["Unknown"],
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
      userPostures: ["starting", "responding", "already-filed", "moving-party", "responding-party", "enforcing", "appealing", "not-sure"],
    },
    useRules: operationalUseRules,
    audit: operationalAudit({
      notes: ["Seed object for proof mapping and burden awareness."],
      limitations: ["Must later be connected to claim-specific legal elements and verified burdens of proof."],
      riskLevel: "medium",
    }),
    tags: ["proof", "burden", "elements", "evidence-map", "court-readiness"],
    plainLanguageExplanation:
      "A case is stronger when each important point has evidence attached to it.",
    systemWarnings: [
      "Operational guidance only. Verify legal elements and burden of proof before filing.",
    ],
    evidenceIssue: "relevance",
    principle:
      "Evidence should be mapped to the legal or procedural point it proves, not merely uploaded or listed.",
    proofNeeded: [
      "Claim or issue",
      "Required fact",
      "Supporting document or witness",
      "Date",
      "Connection to requested remedy",
    ],
    commonAttacks: [
      "Evidence does not prove the issue",
      "Evidence is missing for a required point",
      "Evidence is not connected to damages or remedy",
      "Evidence is too general",
    ],
    strengtheningSteps: [
      "Create an issue-by-issue proof map",
      "Connect each document to a specific fact",
      "Identify missing witnesses or records",
      "Separate strong evidence from background evidence",
    ],
    courtReadinessIndicators: [
      "Each claim has identified facts",
      "Each fact has supporting evidence",
      "Missing proof is identified",
      "Evidence is connected to requested relief",
    ],
  },

  {
    id: "SEED_CREDIBILITY_INCONSISTENCY_001",
    version: "1.0.0",
    kind: "credibility-principle",
    title: "Inconsistencies and exaggeration can weaken court readiness",
    summary:
      "The system should flag contradictions, unsupported accusations, changing stories, exaggerated damages, and missing context before documents are generated.",
    source: operationalSource({
      sourceId: "SEED_OPERATIONAL_CREDIBILITY",
      title: "CourtSimplified operational credibility doctrine",
    }),
    applicability: {
      courtPaths: ["family", "small-claims", "civil", "tribunal", "ltb", "immigration", "unknown"],
      jurisdictions: ["Unknown"],
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
        "starting-case",
        "responding",
        "already-started",
        "conference",
        "motion",
        "trial",
        "settlement",
        "urgent",
        "not-sure",
      ],
      userPostures: ["starting", "responding", "already-filed", "moving-party", "responding-party", "not-sure"],
    },
    useRules: operationalUseRules,
    audit: operationalAudit({
      notes: ["Seed object for credibility and consistency review."],
      limitations: ["General operational guidance only. Must be connected to facts and evidence, not used as a credibility finding."],
      riskLevel: "medium",
    }),
    tags: ["credibility", "inconsistency", "exaggeration", "unsupported-allegation"],
    plainLanguageExplanation:
      "Court materials are stronger when the story is consistent, supported, and not overstated.",
    systemWarnings: [
      "Operational guidance only. Do not present as a finding about credibility.",
    ],
    credibilityIssue: "inconsistency",
    courtConcern:
      "The court may be concerned if the facts, requested relief, damages, or evidence appear inconsistent or unsupported.",
    detectionSignals: [
      "Different dates for the same event",
      "Large damages with no calculation",
      "Serious allegation with no evidence identified",
      "Conflicting procedural posture",
      "Changing explanation of what happened",
    ],
    correctiveSteps: [
      "Create a single timeline",
      "Separate facts from opinions",
      "Identify evidence for each serious allegation",
      "Explain damages calculations",
      "Remove unsupported exaggeration from court-facing drafts",
    ],
    evidenceToStrengthen: [
      "Documents",
      "Messages",
      "Witnesses",
      "Court records",
      "Financial records",
      "Medical or expert records if relevant",
    ],
  },

  {
    id: "SEED_SETTLEMENT_COST_RISK_001",
    version: "1.0.0",
    kind: "settlement-principle",
    title: "Settlement decisions require risk, proof, cost, and timing analysis",
    summary:
      "The system should help users compare settlement pressure against evidence strength, litigation cost, delay, credibility risk, and likely procedural next steps.",
    source: operationalSource({
      sourceId: "SEED_OPERATIONAL_SETTLEMENT",
      title: "CourtSimplified operational settlement doctrine",
    }),
    applicability: {
      courtPaths: ["family", "small-claims", "civil", "tribunal", "ltb", "unknown"],
      jurisdictions: ["Unknown"],
      legalDomains: [
        "defamation",
        "contract",
        "property-damage",
        "negligence",
        "personal-injury",
        "employment",
        "debt",
        "consumer",
        "family-parenting",
        "family-support",
        "family-property",
        "civil-human-rights",
        "landlord-tenant",
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
        "not-sure",
      ],
      userPostures: ["starting", "responding", "already-filed", "moving-party", "responding-party", "not-sure"],
    },
    useRules: operationalUseRules,
    audit: operationalAudit({
      notes: ["Seed object for settlement and cost-risk triage."],
      limitations: ["Does not calculate legal costs or predict outcomes. Must later be connected to verified cost rules and settlement procedure."],
      riskLevel: "medium",
    }),
    tags: ["settlement", "cost-risk", "offers", "proof-pressure", "litigation-risk"],
    plainLanguageExplanation:
      "A settlement decision should compare the strength of the case against cost, delay, proof problems, and risk.",
    systemWarnings: [
      "Operational guidance only. Verify cost consequences and settlement rules before relying on it.",
    ],
    settlementIssue: "risk-assessment",
    leverageFactors: [
      "Strong documents",
      "Clear timeline",
      "Admissions",
      "Organized damages proof",
      "Procedural readiness",
    ],
    riskFactors: [
      "Weak proof",
      "Contradictions",
      "High cost",
      "Delay",
      "Uncertain damages",
      "Limitation risk",
      "Credibility risk",
    ],
    preparationSteps: [
      "List best facts",
      "List worst facts",
      "Identify missing proof",
      "Calculate damages or support position",
      "Compare settlement value to litigation risk",
    ],
    suggestedUserQuestions: [
      "What is the strongest evidence?",
      "What is the weakest point?",
      "What would the other side argue?",
      "What is the cost of continuing?",
      "What result is acceptable?",
    ],
  },

  {
    id: "SEED_FORM_SELECTION_DISCIPLINE_001",
    version: "1.0.0",
    kind: "form-guidance",
    title: "Forms must follow legal theory and procedural posture",
    summary:
      "Court forms should be recommended only after court path, role, stage, relief, and procedural posture are identified.",
    source: operationalSource({
      sourceId: "SEED_OPERATIONAL_FORMS",
      title: "CourtSimplified operational form-selection doctrine",
    }),
    applicability: {
      courtPaths: ["family", "small-claims", "civil", "tribunal", "ltb", "immigration", "unknown"],
      jurisdictions: ["Unknown"],
      legalDomains: ["procedural", "unknown"],
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
      userPostures: ["starting", "responding", "already-filed", "moving-party", "responding-party", "enforcing", "appealing", "not-sure"],
    },
    useRules: operationalUseRules,
    audit: operationalAudit({
      notes: ["Seed object to prevent premature or wrong form recommendations."],
      limitations: ["Must later be connected to verified official form registry and court rules."],
      riskLevel: "high",
    }),
    tags: ["forms", "procedure", "stage", "court-path", "false-positive-form"],
    plainLanguageExplanation:
      "The right form depends on whether the user is starting, responding, moving, enforcing, appealing, or preparing for a conference or trial.",
    systemWarnings: [
      "Operational guidance only. Verify official forms, rules, filing, and service requirements.",
    ],
    formTitle: "Procedural form selection discipline",
    formPurpose:
      "Prevents the system from recommending forms before the legal theory and procedural posture are clear.",
    whenUsed: [
      "When court path is known",
      "When stage is known",
      "When party role is known",
      "When requested relief is known",
      "When existing filed or served documents are known",
    ],
    whenNotUsed: [
      "Do not recommend defence forms if the user is starting a claim",
      "Do not recommend starting forms if the user is responding",
      "Do not recommend family forms for civil or small claims matters",
      "Do not let forms decide the legal theory",
    ],
    requiredInputs: [
      "Court path",
      "Province or jurisdiction",
      "User role",
      "Stage",
      "Existing filed documents",
      "Existing served documents",
      "Requested relief",
    ],
    relatedForms: [],
    proceduralWarnings: [
      "Verify current official form version",
      "Verify filing method",
      "Verify service method",
      "Verify deadlines",
      "Verify whether attachments, affidavits, financial forms, or conference materials are required",
    ],
  },
];

export function getDoctrineSeedLibrary(): LegalKnowledgeObject[] {
  return DOCTRINE_SEED_LIBRARY;
}