import {
  CasePartnerConfidence,
  CasePartnerCourtArea,
  CasePartnerFact,
  CasePartnerLegalSignal,
  CasePartnerProceduralStage,
  ConversationIntelligenceResult,
} from "./conversationIntelligenceEngine";

import {
  ConversationMemoryResult,
  ConversationMemoryState,
} from "./conversationMemoryEngine";

import { CoordinatedReasoningPackage } from "../knowledge/legalReasoningCoordinator";

export type CaseInvestigationVersion = "1.1.0";

export type InvestigationSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type InvestigationPriority =
  | "critical"
  | "high"
  | "medium"
  | "low";

export type InvestigationConfidence = CasePartnerConfidence;

export type InvestigationCategory =
  | "facts"
  | "timeline"
  | "parties"
  | "evidence"
  | "proof"
  | "procedure"
  | "authority"
  | "credibility"
  | "contradiction"
  | "damages"
  | "remedy"
  | "judge-concern"
  | "opponent-argument"
  | "next-question"
  | "unknown";

export type CaseInvestigationInput = {
  caseId?: string;
  message: string;
  intelligence: ConversationIntelligenceResult;
  memory: ConversationMemoryResult;
  legalReasoning?: CoordinatedReasoningPackage;
};

export type InvestigationFinding = {
  id: string;
  category: InvestigationCategory;
  severity: InvestigationSeverity;
  confidence: InvestigationConfidence;
  title: string;
  explanation: string;
  whyItMatters: string;
  suggestedAction: string;
  linkedFacts: string[];
  linkedEvidence: string[];
  relatedQuestions: string[];
};

export type InvestigatedIssue = {
  id: string;
  label: string;
  explanation: string;
  confidence: InvestigationConfidence;
  needsLegalVerification: boolean;
  relatedFacts: string[];
  missingProof: string[];
  likelyNextQuestions: string[];
};

export type InvestigationTimelineItem = {
  id: string;
  description: string;
  dateText: string;
  confidence: InvestigationConfidence;
  source: "message" | "memory" | "conversation-intelligence";
  needsClarification: boolean;
};

export type InvestigationParty = {
  id: string;
  label: string;
  role: string;
  confidence: InvestigationConfidence;
  needsClarification: boolean;
};

export type InvestigationEvidenceNeed = {
  id: string;
  label: string;
  reason: string;
  priority: InvestigationPriority;
  connectedIssue?: string;
};

export type CaseInvestigationResult = {
  version: CaseInvestigationVersion;
  generatedAt: string;
  caseId?: string;

  investigationSummary: string;

  courtArea: CasePartnerCourtArea;
  proceduralStage: CasePartnerProceduralStage;
  confidence: InvestigationConfidence;

  legalReasoning?: CoordinatedReasoningPackage;

  issues: InvestigatedIssue[];
  timeline: InvestigationTimelineItem[];
  parties: InvestigationParty[];
  evidenceNeeded: InvestigationEvidenceNeed[];
  findings: InvestigationFinding[];

  strengths: string[];
  weaknesses: string[];
  missingInformation: string[];
  judgeConcerns: string[];
  possibleOpponentArguments: string[];
  nextInvestigativeActions: string[];

  masterInvestigationPatch: {
    issuesToReview: string[];
    timelineToReview: string[];
    partiesToReview: string[];
    evidenceToRequest: string[];
    proofGaps: string[];
    risks: string[];
    questionsToAsk: string[];
  };

  validation: {
    safeToUseForWorkflow: boolean;
    safeToUseForDocuments: boolean;
    requiresHumanReview: boolean;
    warnings: string[];
  };
};

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown): string {
  return clean(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(values.map((value) => clean(value)).filter(Boolean)),
  );
}

function confidenceFromCount(count: number): InvestigationConfidence {
  if (count >= 6) return "high";
  if (count >= 3) return "medium";
  return "low";
}

function buildFinding(args: {
  category: InvestigationCategory;
  severity: InvestigationSeverity;
  confidence: InvestigationConfidence;
  title: string;
  explanation: string;
  whyItMatters: string;
  suggestedAction: string;
  linkedFacts?: string[];
  linkedEvidence?: string[];
  relatedQuestions?: string[];
}): InvestigationFinding {
  return {
    id: createId("investigation_finding"),
    category: args.category,
    severity: args.severity,
    confidence: args.confidence,
    title: args.title,
    explanation: args.explanation,
    whyItMatters: args.whyItMatters,
    suggestedAction: args.suggestedAction,
    linkedFacts: uniqueStrings(args.linkedFacts || []),
    linkedEvidence: uniqueStrings(args.linkedEvidence || []),
    relatedQuestions: uniqueStrings(args.relatedQuestions || []),
  };
}

function buildIssues(
  intelligence: ConversationIntelligenceResult,
  memory: ConversationMemoryState,
  legalReasoning?: CoordinatedReasoningPackage,
): InvestigatedIssue[] {
  const signals = intelligence.legalSignals;
  const rememberedIssues = memory.legalIssues.map((item) => item.value);
  const reasoningDomains = legalReasoning?.reasoningSummary.primaryDomains || [];

  const issueLabels = uniqueStrings([
    ...signals.map((signal: CasePartnerLegalSignal) => signal.label),
    ...rememberedIssues,
    ...reasoningDomains.map((domain) => `Reasoning domain: ${domain}`),
  ]);

  return issueLabels.map((label) => {
    const signal = signals.find((item) => item.label === label);
    const domain = reasoningDomains.find((item) => label.includes(item));

    const relatedFacts = uniqueStrings([
      ...intelligence.extractedFacts.map((fact: CasePartnerFact) => fact.text),
      ...memory.facts.slice(-8).map((fact) => fact.value),
    ]);

    const reasoningQuestions =
      legalReasoning?.reasoningSummary.firstQuestions || [];

    const reasoningProof = uniqueStrings([
      ...(legalReasoning?.reasoningSummary.evidencePriorities || []),
      ...(legalReasoning?.reasoningSummary.burdenPriorities || []),
    ]);

    return {
      id: createId("issue"),
      label,
      explanation:
        signal?.explanation ||
        (domain
          ? `This issue is connected to the coordinated legal reasoning domain: ${domain}.`
          : "This issue has been identified from the conversation or case memory and should be reviewed as the case develops."),
      confidence: signal?.confidence || (domain ? "high" : "medium"),
      needsLegalVerification: signal?.needsVerification ?? true,
      relatedFacts,
      missingProof: uniqueStrings([
        ...memory.missingInformation.map((item) => item.value),
        ...intelligence.missingInformation,
        ...reasoningProof.map((item) => `Reasoning proof priority: ${item}`),
      ]),
      likelyNextQuestions: uniqueStrings([
        ...reasoningQuestions,
        ...intelligence.questions.map((question) => question.question),
        ...memory.outstandingQuestions.map((question) => question.value),
      ]).slice(0, 12),
    };
  });
}

function buildTimeline(
  intelligence: ConversationIntelligenceResult,
  memory: ConversationMemoryState,
): InvestigationTimelineItem[] {
  const currentTimeline: InvestigationTimelineItem[] = intelligence.extractedFacts
    .filter((fact) => fact.category === "date" || fact.category === "event")
    .map((fact) => ({
      id: createId("timeline"),
      description: fact.text,
      dateText: fact.category === "date" ? fact.text : "date unclear",
      confidence: fact.confidence,
      source: "conversation-intelligence",
      needsClarification: fact.confidence === "low",
    }));

  const rememberedTimeline: InvestigationTimelineItem[] =
    memory.timelineItems.map((item) => ({
      id: createId("timeline"),
      description: item.value,
      dateText: item.value.toLowerCase().includes("date")
        ? item.value
        : "date unclear",
      confidence: item.confidence,
      source: "memory",
      needsClarification: item.confidence === "low",
    }));

  return [...currentTimeline, ...rememberedTimeline].slice(-20);
}

function inferPartyRole(text: string): string {
  const value = normalize(text);

  if (value.includes("crown")) return "possible Crown/prosecutor actor";
  if (value.includes("police")) return "possible police actor";
  if (value.includes("judge")) return "court decision-maker";
  if (value.includes("landlord")) return "possible landlord";
  if (value.includes("tenant")) return "possible tenant";
  if (value.includes("child")) return "child/minor";
  if (value.includes("ex")) return "opposing party or related party";

  return "role requires clarification";
}

function buildParties(
  intelligence: ConversationIntelligenceResult,
  memory: ConversationMemoryState,
): InvestigationParty[] {
  const partyText = uniqueStrings([
    ...intelligence.extractedFacts
      .filter((fact) => fact.category === "party")
      .map((fact) => fact.text),
    ...memory.parties.map((party) => party.value),
  ]);

  return partyText.map((text) => ({
    id: createId("party"),
    label: text,
    role: inferPartyRole(text),
    confidence: "low",
    needsClarification: true,
  }));
}

function priorityFromIndex(index: number): InvestigationPriority {
  if (index === 0) return "critical";
  if (index <= 2) return "high";
  if (index <= 5) return "medium";
  return "low";
}

function buildEvidenceNeeds(
  intelligence: ConversationIntelligenceResult,
  memory: ConversationMemoryState,
  issues: InvestigatedIssue[],
  legalReasoning?: CoordinatedReasoningPackage,
): InvestigationEvidenceNeed[] {
  const directEvidenceQuestions = uniqueStrings([
    ...(legalReasoning?.reasoningSummary.evidencePriorities || []),
    ...(legalReasoning?.reasoningSummary.burdenPriorities || []).map(
      (item) => `Proof needed for burden point: ${item}`,
    ),
    ...intelligence.caseMemoryPatch.evidenceToRequest,
    ...memory.evidence.map((item) => item.value),
  ]);

  const needs: InvestigationEvidenceNeed[] = directEvidenceQuestions.map(
    (label, index) => ({
      id: createId("evidence_need"),
      label,
      reason:
        index === 0 && legalReasoning
          ? "This evidence priority comes from the coordinated legal reasoning package and should be addressed before the case is treated as court-ready."
          : "This evidence may help connect the user's facts to proof instead of leaving the issue as an allegation.",
      priority: priorityFromIndex(index),
    }),
  );

  for (const issue of issues) {
    const issueLabel = issue.label.toLowerCase();

    if (issueLabel.includes("limitation")) {
      needs.push({
        id: createId("evidence_need"),
        label:
          "Documents or facts showing when the user first knew or should have known about the claim",
        reason:
          "Limitation analysis often depends on the date of the event and the date of discovery.",
        priority: "critical",
        connectedIssue: issue.label,
      });
    }

    if (issueLabel.includes("crown")) {
      needs.push({
        id: createId("evidence_need"),
        label: "Records identifying the government actor, decision, date, and harm",
        reason:
          "Crown/government liability analysis depends on the actor involved, the conduct alleged, the governing statute, and procedural notice requirements.",
        priority: "critical",
        connectedIssue: issue.label,
      });
    }

    if (issueLabel.includes("bail")) {
      needs.push({
        id: createId("evidence_need"),
        label:
          "Bail transcript, audio, endorsement, release order, detention/release reasons, and any missing-record correspondence",
        reason:
          "Bail/procedural fairness issues usually depend heavily on the actual record of what happened at the hearing.",
        priority: "critical",
        connectedIssue: issue.label,
      });
    }
  }

  const seen = new Set<string>();

  return needs
    .filter((need) => {
      const key = normalize(need.label);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 25);
}

function buildFindings(args: {
  intelligence: ConversationIntelligenceResult;
  memory: ConversationMemoryState;
  legalReasoning?: CoordinatedReasoningPackage;
  issues: InvestigatedIssue[];
  timeline: InvestigationTimelineItem[];
  parties: InvestigationParty[];
  evidenceNeeded: InvestigationEvidenceNeed[];
}): InvestigationFinding[] {
  const findings: InvestigationFinding[] = [];

  if (args.legalReasoning) {
    findings.push(
      buildFinding({
        category: "authority",
        severity: "high",
        confidence: "high",
        title: "Coordinated legal reasoning package applied",
        explanation:
          "The investigation is now using the Legal Reasoning Coordinator instead of relying only on local investigation heuristics.",
        whyItMatters:
          "This allows issue profiles, knowledge objects, authority warnings, burden priorities, evidence priorities, procedural watch points, judicial concerns, and opposing arguments to influence the investigation in one coordinated flow.",
        suggestedAction:
          "Use the coordinated reasoning priorities to guide the next questions, evidence requests, and court-readiness review.",
        linkedEvidence: args.legalReasoning.reasoningSummary.evidencePriorities,
        relatedQuestions: args.legalReasoning.reasoningSummary.firstQuestions,
      }),
    );
  }

  if (args.issues.length > 0) {
    findings.push(
      buildFinding({
        category: "proof",
        severity: "high",
        confidence: confidenceFromCount(args.issues.length),
        title: "Legal issues identified for investigation",
        explanation:
          "The conversation contains legal signals that should be investigated before the system gives strong procedural, document, or deadline guidance.",
        whyItMatters:
          "CourtSimplified must understand the issue before it can safely choose forms, evidence needs, authorities, workflow, or documents.",
        suggestedAction:
          "Confirm jurisdiction, dates, parties, evidence, procedural stage, and desired outcome before advancing to document generation.",
        linkedFacts: args.intelligence.extractedFacts.map((fact) => fact.text),
        relatedQuestions: args.intelligence.questions.map(
          (question) => question.question,
        ),
      }),
    );
  }

  if (args.timeline.length === 0) {
    findings.push(
      buildFinding({
        category: "timeline",
        severity: "high",
        confidence: "high",
        title: "Timeline is not developed yet",
        explanation:
          "The system does not yet have a reliable timeline of the key events.",
        whyItMatters:
          "Timeline affects limitation issues, procedural sequence, credibility, causation, evidence organization, and next steps.",
        suggestedAction:
          "Ask for the main dates and create a chronology before drafting documents or giving deadline guidance.",
        relatedQuestions: [
          "What are the main dates, including when the problem happened and when you first found out about it?",
        ],
      }),
    );
  }

  if (args.evidenceNeeded.length > 0) {
    findings.push(
      buildFinding({
        category: "evidence",
        severity: "high",
        confidence: "medium",
        title: "Evidence needs have been identified",
        explanation:
          "The case needs evidence connected to the issues before it can become court-ready.",
        whyItMatters:
          "Evidence connects the user's story to proof. Without it, the system risks producing documents that make unsupported allegations.",
        suggestedAction:
          "Request and organize the evidence listed in the investigation result.",
        linkedEvidence: args.evidenceNeeded.map((item) => item.label),
      }),
    );
  }

  if (args.legalReasoning?.reasoningSummary.proceduralWatchPoints.length) {
    findings.push(
      buildFinding({
        category: "procedure",
        severity: "high",
        confidence: "high",
        title: "Procedural watch points identified",
        explanation:
          "The coordinated legal reasoning package identified procedural issues that must be checked before workflow or document generation.",
        whyItMatters:
          "Procedural mistakes can affect filing, service, limitation periods, jurisdiction, deadlines, form selection, and court-readiness.",
        suggestedAction:
          "Review the procedural watch points before recommending forms, deadlines, or filing steps.",
        linkedFacts: args.legalReasoning.reasoningSummary.proceduralWatchPoints,
      }),
    );
  }

  if (args.intelligence.missingInformation.includes("province or jurisdiction")) {
    findings.push(
      buildFinding({
        category: "authority",
        severity: "critical",
        confidence: "high",
        title: "Jurisdiction is missing",
        explanation: "The province or territory is not clear.",
        whyItMatters:
          "Jurisdiction affects limitation periods, court procedure, forms, Crown/government liability rules, and authority selection.",
        suggestedAction:
          "Ask the user what province or territory the events happened in before giving jurisdiction-specific guidance.",
        relatedQuestions: ["What province or territory did this happen in?"],
      }),
    );
  }

  if (args.parties.length === 0) {
    findings.push(
      buildFinding({
        category: "parties",
        severity: "medium",
        confidence: "medium",
        title: "Parties are not clearly classified",
        explanation:
          "The system does not yet know the legal roles of the people or institutions involved.",
        whyItMatters:
          "Party roles affect court path, defendant/respondent naming, evidence needs, service, and legal tests.",
        suggestedAction:
          "Ask who the parties are and what role each person or institution played.",
      }),
    );
  }

  return findings;
}

function buildStrengths(
  intelligence: ConversationIntelligenceResult,
  memory: ConversationMemoryState,
  legalReasoning?: CoordinatedReasoningPackage,
): string[] {
  return uniqueStrings([
    ...(intelligence.extractedFacts.length > 0
      ? ["The user has provided enough information to begin structured investigation."]
      : []),
    ...(intelligence.legalSignals.length > 0
      ? ["The system identified legal signals that can guide focused follow-up questions."]
      : []),
    ...(memory.conversationCount > 0
      ? ["The case memory is now active and can preserve information across the conversation."]
      : []),
    ...(legalReasoning
      ? ["The investigation is now supported by a coordinated legal reasoning package."]
      : []),
    ...(legalReasoning?.profiles.length
      ? [
          `Matched reasoning profile(s): ${legalReasoning.profiles
            .map((profile) => profile.label)
            .join(", ")}.`,
        ]
      : []),
  ]);
}

function buildWeaknesses(args: {
  intelligence: ConversationIntelligenceResult;
  timeline: InvestigationTimelineItem[];
  evidenceNeeded: InvestigationEvidenceNeed[];
  legalReasoning?: CoordinatedReasoningPackage;
}): string[] {
  return uniqueStrings([
    ...args.intelligence.missingInformation.map(
      (item) => `Missing information: ${item}`,
    ),
    ...(args.timeline.length === 0 ? ["No reliable timeline yet."] : []),
    ...(args.evidenceNeeded.length > 0
      ? ["Evidence still needs to be connected to the issues."]
      : []),
    ...(args.legalReasoning?.knowledge.warnings || []),
  ]);
}

function buildJudgeConcerns(args: {
  issues: InvestigatedIssue[];
  timeline: InvestigationTimelineItem[];
  evidenceNeeded: InvestigationEvidenceNeed[];
  legalReasoning?: CoordinatedReasoningPackage;
}): string[] {
  return uniqueStrings([
    ...(args.legalReasoning?.reasoningSummary.judicialConcerns || []),
    ...(args.timeline.length === 0
      ? ["The judge may ask when the key events happened."]
      : []),
    ...(args.evidenceNeeded.length > 0
      ? ["The judge may ask what evidence supports the user's allegations."]
      : []),
    ...args.issues
      .filter((issue) => issue.needsLegalVerification)
      .map(
        (issue) =>
          `The judge may need a legally verified basis for the issue: ${issue.label}.`,
      ),
  ]);
}

function buildOpponentArguments(args: {
  issues: InvestigatedIssue[];
  evidenceNeeded: InvestigationEvidenceNeed[];
  legalReasoning?: CoordinatedReasoningPackage;
}): string[] {
  return uniqueStrings([
    ...(args.legalReasoning?.reasoningSummary.opposingArguments || []),
    ...(args.evidenceNeeded.length > 0
      ? ["The other side may argue the user's allegations are unsupported by reliable evidence."]
      : []),
    ...args.issues.map(
      (issue) =>
        `The other side may argue that ${issue.label.toLowerCase()} does not apply unless the missing facts and proof are established.`,
    ),
  ]).slice(0, 15);
}

function buildNextActions(args: {
  findings: InvestigationFinding[];
  evidenceNeeded: InvestigationEvidenceNeed[];
  issues: InvestigatedIssue[];
  intelligence: ConversationIntelligenceResult;
  legalReasoning?: CoordinatedReasoningPackage;
}): string[] {
  return uniqueStrings([
    ...(args.legalReasoning?.reasoningSummary.firstQuestions || []),
    ...(args.legalReasoning?.reasoningSummary.investigationPriorities || []).map(
      (item) => `Investigate: ${item}`,
    ),
    ...(args.legalReasoning?.reasoningSummary.proceduralWatchPoints || []).map(
      (item) => `Check procedural issue: ${item}`,
    ),
    ...args.findings.map((finding) => finding.suggestedAction),
    ...args.evidenceNeeded.map((need) => `Collect or identify: ${need.label}`),
    ...args.issues.flatMap((issue) => issue.likelyNextQuestions),
    ...args.intelligence.questions.map((question) => question.question),
  ]).slice(0, 20);
}

export function buildCaseInvestigation(
  input: CaseInvestigationInput,
): CaseInvestigationResult {
  const intelligence = input.intelligence;
  const memory = input.memory.memory;
  const legalReasoning = input.legalReasoning;

  const issues = buildIssues(intelligence, memory, legalReasoning);
  const timeline = buildTimeline(intelligence, memory);
  const parties = buildParties(intelligence, memory);
  const evidenceNeeded = buildEvidenceNeeds(
    intelligence,
    memory,
    issues,
    legalReasoning,
  );

  const findings = buildFindings({
    intelligence,
    memory,
    legalReasoning,
    issues,
    timeline,
    parties,
    evidenceNeeded,
  });

  const strengths = buildStrengths(intelligence, memory, legalReasoning);

  const weaknesses = buildWeaknesses({
    intelligence,
    timeline,
    evidenceNeeded,
    legalReasoning,
  });

  const judgeConcerns = buildJudgeConcerns({
    issues,
    timeline,
    evidenceNeeded,
    legalReasoning,
  });

  const possibleOpponentArguments = buildOpponentArguments({
    issues,
    evidenceNeeded,
    legalReasoning,
  });

  const nextInvestigativeActions = buildNextActions({
    findings,
    evidenceNeeded,
    issues,
    intelligence,
    legalReasoning,
  });

  const warnings = uniqueStrings([
    ...memory.warnings,
    ...(legalReasoning?.knowledge.warnings || []),
    ...findings
      .filter((finding) => finding.severity === "critical")
      .map((finding) => finding.title),
    ...issues
      .filter((issue) => issue.needsLegalVerification)
      .map((issue) => `Legal verification needed: ${issue.label}`),
  ]);

  return {
    version: "1.1.0",
    generatedAt: nowIso(),
    caseId: input.caseId,

    investigationSummary:
      issues.length > 0
        ? `The case investigation identified ${issues.length} issue(s), ${evidenceNeeded.length} evidence need(s), ${findings.length} investigation finding(s), and ${
            legalReasoning ? "a coordinated legal reasoning package" : "no coordinated reasoning package"
          }.`
        : "The case investigation needs more information before identifying legal issues with confidence.",

    courtArea: intelligence.conversationFocus.courtArea,
    proceduralStage: intelligence.conversationFocus.proceduralStage,
    confidence: confidenceFromCount(
      issues.length +
        timeline.length +
        evidenceNeeded.length +
        (legalReasoning?.profiles.length || 0),
    ),

    legalReasoning,

    issues,
    timeline,
    parties,
    evidenceNeeded,
    findings,

    strengths,
    weaknesses,
    missingInformation: intelligence.missingInformation,
    judgeConcerns,
    possibleOpponentArguments,
    nextInvestigativeActions,

    masterInvestigationPatch: {
      issuesToReview: issues.map((issue) => issue.label),
      timelineToReview: timeline.map((item) => item.description),
      partiesToReview: parties.map((party) => party.label),
      evidenceToRequest: evidenceNeeded.map((need) => need.label),
      proofGaps: weaknesses,
      risks: warnings,
      questionsToAsk: nextInvestigativeActions.filter((item) =>
        item.endsWith("?"),
      ),
    },

    validation: {
      safeToUseForWorkflow:
        intelligence.conversationFocus.courtArea !== "unknown" &&
        intelligence.conversationFocus.proceduralStage !== "unknown",
      safeToUseForDocuments: false,
      requiresHumanReview: warnings.length > 0,
      warnings,
    },
  };
}