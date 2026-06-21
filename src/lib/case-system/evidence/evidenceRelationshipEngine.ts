import {
  CaseConfidence,
  CaseEvidenceLifecycleStatus,
  CaseEvidenceType,
  CaseSeverity,
} from "../architecture/masterCaseSchema";

import {
  EvidenceConcern,
  EvidenceGraphBuildInput,
  EvidenceGraphBuildOutput,
  EvidenceGroup,
  EvidenceNode,
  EvidenceReadinessLevel,
  EvidenceRelationshipGraph,
} from "./evidenceRelationshipArchitecture";

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function confidenceRank(value: CaseConfidence): number {
  const ranks: Record<CaseConfidence, number> = {
    "very-low": 1,
    low: 2,
    medium: 3,
    high: 4,
    "very-high": 5,
  };

  return ranks[value] || 1;
}

function confidenceFromRank(rank: number): CaseConfidence {
  if (rank >= 4.5) return "very-high";
  if (rank >= 3.5) return "high";
  if (rank >= 2.5) return "medium";
  if (rank >= 1.5) return "low";
  return "very-low";
}

function averageConfidence(values: CaseConfidence[]): CaseConfidence {
  if (values.length === 0) return "very-low";

  const average =
    values.reduce((total, value) => total + confidenceRank(value), 0) /
    values.length;

  return confidenceFromRank(average);
}

function isDigitalEvidence(type: CaseEvidenceType): boolean {
  return (
    type === "screenshot" ||
    type === "text-message" ||
    type === "email" ||
    type === "social-media" ||
    type === "audio" ||
    type === "video"
  );
}

function inferLifecycleStatus(args: {
  linkedClaimCount: number;
  linkedTimelineCount: number;
}): CaseEvidenceLifecycleStatus {
  if (args.linkedClaimCount > 0 || args.linkedTimelineCount > 0) {
    return "mapped";
  }

  return "categorized";
}

function buildConcern(args: {
  concernType: EvidenceConcern["concernType"];
  severity: CaseSeverity;
  explanation: string;
  suggestedFix: string;
}): EvidenceConcern {
  return {
    id: createId("evidence_concern"),
    concernType: args.concernType,
    severity: args.severity,
    explanation: args.explanation,
    suggestedFix: args.suggestedFix,
  };
}

function inferConcerns(
  candidate: EvidenceGraphBuildInput["evidenceCandidates"][number],
): EvidenceConcern[] {
  const concerns: EvidenceConcern[] = [];

  if (isDigitalEvidence(candidate.type)) {
    concerns.push(
      buildConcern({
        concernType: "authenticity",
        severity: "medium",
        explanation:
          "Digital evidence may need proof of sender, recipient, date, platform, and completeness.",
        suggestedFix:
          "Preserve the original thread or file, visible dates, sender/recipient details, and surrounding context.",
      }),
    );

    concerns.push(
      buildConcern({
        concernType: "missing-context",
        severity: "medium",
        explanation:
          "Digital evidence can be attacked if only a cropped or isolated portion is preserved.",
        suggestedFix:
          "Keep the full conversation or surrounding records before and after the key evidence.",
      }),
    );
  }

  if (!candidate.description || candidate.description.trim().length < 20) {
    concerns.push(
      buildConcern({
        concernType: "incomplete-record",
        severity: "low",
        explanation:
          "The evidence description is thin, so the system may not know what this item proves.",
        suggestedFix:
          "Describe what the evidence shows, who is involved, when it happened, and which issue it supports.",
      }),
    );
  }

  if (
    (candidate.linkedClaimDomains || []).length === 0 &&
    (candidate.linkedTimelineEventIds || []).length === 0
  ) {
    concerns.push(
      buildConcern({
        concernType: "unsupported-link",
        severity: "low",
        explanation:
          "This evidence is not yet linked to a claim, timeline event, burden, or document.",
        suggestedFix:
          "Connect this item to the fact, issue, claim element, event, or document it supports.",
      }),
    );
  }

  return concerns;
}

function readinessFromNode(args: {
  concerns: EvidenceConcern[];
  linkedClaimCount: number;
  linkedTimelineCount: number;
}): EvidenceReadinessLevel {
  const seriousConcern = args.concerns.some(
    (concern) => concern.severity === "high" || concern.severity === "critical",
  );

  if (seriousConcern) return "early";

  if (args.linkedClaimCount > 0 && args.linkedTimelineCount > 0) {
    return "mapped";
  }

  if (args.linkedClaimCount > 0 || args.linkedTimelineCount > 0) {
    return "early";
  }

  return "unreviewed";
}

function confidenceFromReadiness(readiness: EvidenceReadinessLevel): CaseConfidence {
  if (readiness === "court-ready") return "very-high";
  if (readiness === "usable") return "high";
  if (readiness === "mapped") return "medium";
  if (readiness === "early") return "low";
  if (readiness === "excluded") return "very-low";
  return "very-low";
}

function buildEvidenceNode(
  candidate: EvidenceGraphBuildInput["evidenceCandidates"][number],
): EvidenceNode {
  const linkedClaimDomains = candidate.linkedClaimDomains || [];
  const linkedTimelineEventIds = candidate.linkedTimelineEventIds || [];
  const concerns = inferConcerns(candidate);

  const readinessLevel = readinessFromNode({
    concerns,
    linkedClaimCount: linkedClaimDomains.length,
    linkedTimelineCount: linkedTimelineEventIds.length,
  });

  const lifecycleStatus = inferLifecycleStatus({
    linkedClaimCount: linkedClaimDomains.length,
    linkedTimelineCount: linkedTimelineEventIds.length,
  });

  return {
    id: candidate.id || createId("evidence"),
    version: "1.0.0",

    type: candidate.type,
    title: candidate.title,
    description: candidate.description,

    lifecycleStatus,
    readinessLevel,

    storagePath: candidate.storagePath,
    fileName: candidate.fileName,
    sourceText: candidate.sourceText,

    relationships: [],
    concerns,
    burdenLinks: [],
    documentReferences: [],
    exhibit: {
      childExhibitIds: [],
      filingReady: false,
      notes: [],
    },

    linkedClaimDomains,
    linkedTimelineEventIds,
    linkedPartyIds: candidate.linkedPartyIds || [],

    lifecycleHistory: [
      {
        id: createId("evidence_lifecycle"),
        status: lifecycleStatus,
        changedAt: nowIso(),
        changedBy: "system",
        reason: "Evidence node created by evidence relationship engine.",
      },
    ],

    tags: candidate.tags || [],
    confidence: confidenceFromReadiness(readinessLevel),
  };
}

function groupTypeForEvidence(type: CaseEvidenceType): EvidenceGroup["groupType"] {
  if (
    type === "screenshot" ||
    type === "text-message" ||
    type === "email" ||
    type === "social-media"
  ) {
    return "message-thread";
  }

  if (type === "photo" || type === "video") return "photo-set";

  if (type === "invoice" || type === "receipt" || type === "financial-record") {
    return "financial-record-set";
  }

  if (type === "court-form" || type === "court-order" || type === "official-record") {
    return "procedural-record-set";
  }

  if (type === "witness") return "witness-set";

  return "document-set";
}

function buildEvidenceGroups(nodes: EvidenceNode[]): EvidenceGroup[] {
  const groupsByType = new Map<EvidenceGroup["groupType"], EvidenceNode[]>();

  for (const node of nodes) {
    const groupType = groupTypeForEvidence(node.type);
    groupsByType.set(groupType, [...(groupsByType.get(groupType) || []), node]);
  }

  return Array.from(groupsByType.entries()).map(([groupType, groupNodes]) => ({
    id: createId("evidence_group"),
    title: groupType
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    groupType,
    evidenceIds: groupNodes.map((node) => node.id),
    representativeEvidenceId: groupNodes[0]?.id,
    readinessLevel: groupNodes.some((node) => node.readinessLevel === "mapped")
      ? "mapped"
      : "early",
    concerns: groupNodes.flatMap((node) => node.concerns),
  }));
}

function buildGraphIssues(nodes: EvidenceNode[]) {
  return nodes.flatMap((node) =>
    node.concerns.map((concern) => ({
      id: createId("evidence_graph_issue"),
      severity: concern.severity,
      title: concern.concernType,
      explanation: concern.explanation,
      affectedEvidenceIds: [node.id],
      suggestedFix: concern.suggestedFix,
    })),
  );
}

function buildReadiness(nodes: EvidenceNode[], groups: EvidenceGroup[]) {
  const nodeConfidence = averageConfidence(nodes.map((node) => node.confidence));

  const authenticityReadiness = averageConfidence(
    nodes.map((node) =>
      node.concerns.some((concern) => concern.concernType === "authenticity")
        ? "low"
        : "medium",
    ),
  );

  const exhibitReadiness: CaseConfidence = groups.length > 0 ? "low" : "very-low";

  const burdenLinkingReadiness = averageConfidence(
    nodes.map((node) => (node.burdenLinks.length > 0 ? "medium" : "low")),
  );

  const blockers = nodes
    .flatMap((node) => node.concerns)
    .filter((concern) => concern.severity === "high" || concern.severity === "critical")
    .map((concern) => concern.explanation);

  const nextEvidenceActions = uniqueStrings([
    ...nodes
      .flatMap((node) => node.concerns)
      .slice(0, 6)
      .map((concern) => concern.suggestedFix),
    "Link each important evidence item to a fact, timeline event, claim element, or document.",
    "Prepare exhibit labels once evidence grouping is confirmed.",
  ]);

  return {
    overallReadiness: nodeConfidence,
    admissibilityReadiness: nodeConfidence,
    authenticityReadiness,
    exhibitReadiness,
    burdenLinkingReadiness,
    affidavitReadiness: "low" as CaseConfidence,
    hearingReadiness: "low" as CaseConfidence,
    blockers,
    nextEvidenceActions,
  };
}

export function buildEvidenceRelationshipGraph(
  input: EvidenceGraphBuildInput,
): EvidenceGraphBuildOutput {
  const timestamp = nowIso();

  const nodes = input.evidenceCandidates.map(buildEvidenceNode);
  const groups = buildEvidenceGroups(nodes);
  const issues = buildGraphIssues(nodes);
  const readiness = buildReadiness(nodes, groups);

  const warnings = uniqueStrings([
    ...issues.map((issue) => issue.title),
    ...(nodes.length === 0 ? ["No evidence was available to build an evidence graph."] : []),
  ]);

  const graph: EvidenceRelationshipGraph = {
    id: createId("evidence_graph"),
    version: "1.0.0",
    createdAt: timestamp,
    updatedAt: timestamp,

    caseId: input.caseId,
    stage: input.stage,

    nodes,
    groups,
    issues,

    readiness,

    warnings,
    confidence: readiness.overallReadiness,
  };

  return {
    graph,
    warnings,
  };
}