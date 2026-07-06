import {
  CaseConfidence,
  CaseCredibilityRiskLevel,
  CaseSeverity,
} from "../architecture/masterCaseSchema";

import {
  WorkflowBlocker,
  WorkflowGate,
  WorkflowNextAction,
  WorkflowOrchestrationBuildInput,
  WorkflowOrchestrationBuildOutput,
  WorkflowOrchestrationModel,
  WorkflowReadinessState,
  WorkflowRoute,
  WorkflowRouteAssessment,
} from "./workflowOrchestrationArchitecture";

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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

function isLowReadiness(value?: CaseConfidence): boolean {
  return value === "very-low" || value === "low";
}

function hasProofAnalysis(input: WorkflowOrchestrationBuildInput): boolean {
  return Boolean(input.proof?.hasProofAnalysis);
}

function hasProofWeakness(input: WorkflowOrchestrationBuildInput): boolean {
  return (input.proof?.proofWeaknesses || []).length > 0;
}

function weakClaimProofCount(input: WorkflowOrchestrationBuildInput): number {
  return input.proof?.weakClaimProofCount || 0;
}

function missingElementProofCount(input: WorkflowOrchestrationBuildInput): number {
  return input.proof?.missingElementProofCount || 0;
}

function contradictedElementProofCount(
  input: WorkflowOrchestrationBuildInput,
): number {
  return input.proof?.contradictedElementProofCount || 0;
}

function hasAuthorityAnalysis(input: WorkflowOrchestrationBuildInput): boolean {
  return Boolean(input.authority?.hasAuthorityAnalysis);
}

function unsafeAuthorityCount(input: WorkflowOrchestrationBuildInput): number {
  return input.authority?.unsafeAuthorityCount || 0;
}

function wrongJurisdictionAuthorityCount(
  input: WorkflowOrchestrationBuildInput,
): number {
  return input.authority?.wrongJurisdictionAuthorityCount || 0;
}

function hasAuthorityWarnings(input: WorkflowOrchestrationBuildInput): boolean {
  return (
    (input.authority?.authorityWarnings || []).length > 0 ||
    (input.authorityWarnings || []).length > 0
  );
}

function hasContradictionAnalysis(input: WorkflowOrchestrationBuildInput): boolean {
  return Boolean(input.contradictions?.hasContradictionAnalysis);
}

function contradictionTotal(input: WorkflowOrchestrationBuildInput): number {
  return input.contradictions?.totalFindings || 0;
}

function contradictionCritical(input: WorkflowOrchestrationBuildInput): number {
  return input.contradictions?.criticalFindings || 0;
}

function contradictionHigh(input: WorkflowOrchestrationBuildInput): number {
  return input.contradictions?.highFindings || 0;
}

function hasContradictionWarnings(input: WorkflowOrchestrationBuildInput): boolean {
  return (
    (input.contradictions?.warnings || []).length > 0 ||
    (input.contradictionWarnings || []).length > 0
  );
}

function credibilityLevel(
  input: WorkflowOrchestrationBuildInput,
): CaseCredibilityRiskLevel {
  return input.credibility?.overallLevel || "manageable";
}

function hasCredibilityWarnings(input: WorkflowOrchestrationBuildInput): boolean {
  return (
    (input.credibility?.warnings || []).length > 0 ||
    (input.credibilityWarnings || []).length > 0
  );
}

function proofSeverity(input: WorkflowOrchestrationBuildInput): CaseSeverity {
  if (contradictedElementProofCount(input) > 0) return "critical";
  if (missingElementProofCount(input) > 0) return "high";
  if (weakClaimProofCount(input) > 0) return "medium";
  if (hasProofWeakness(input)) return "medium";
  return "info";
}

function proofReadiness(input: WorkflowOrchestrationBuildInput): CaseConfidence {
  if (!hasProofAnalysis(input)) return "low";
  if (contradictedElementProofCount(input) > 0) return "very-low";
  if (missingElementProofCount(input) > 0) return "low";
  if (weakClaimProofCount(input) > 0 || hasProofWeakness(input)) return "medium";
  if ((input.proof?.proofStrengths || []).length > 0) return "high";
  return "medium";
}

function authorityReadiness(input: WorkflowOrchestrationBuildInput): CaseConfidence {
  if (!hasAuthorityAnalysis(input)) return "low";
  if (unsafeAuthorityCount(input) > 0) return "very-low";
  if (wrongJurisdictionAuthorityCount(input) > 0) return "low";
  if (hasAuthorityWarnings(input)) return "medium";
  if ((input.authority?.strongestAuthorityCount || 0) > 0) return "high";
  return "medium";
}

function citationReadiness(input: WorkflowOrchestrationBuildInput): CaseConfidence {
  if (!hasAuthorityAnalysis(input)) return "low";
  if (unsafeAuthorityCount(input) > 0) return "very-low";
  if (hasAuthorityWarnings(input)) return "medium";
  return "high";
}

function jurisdictionReadiness(
  input: WorkflowOrchestrationBuildInput,
): CaseConfidence {
  if (!hasAuthorityAnalysis(input)) return "low";
  if (wrongJurisdictionAuthorityCount(input) > 0) return "low";
  return "high";
}

function contradictionReadiness(
  input: WorkflowOrchestrationBuildInput,
): CaseConfidence {
  if (!hasContradictionAnalysis(input)) return "low";
  if (contradictionCritical(input) > 0) return "very-low";
  if (contradictionHigh(input) > 0) return "low";
  if (contradictionTotal(input) > 0 || hasContradictionWarnings(input)) {
    return "medium";
  }
  return "high";
}

function credibilityReadiness(
  input: WorkflowOrchestrationBuildInput,
): CaseConfidence {
  const level = credibilityLevel(input);

  if (level === "critical") return "very-low";
  if (level === "serious") return "low";
  if (level === "elevated") return "medium";
  if (hasCredibilityWarnings(input)) return "medium";
  return "high";
}

function documentImpactReadiness(
  input: WorkflowOrchestrationBuildInput,
): CaseConfidence {
  const impact = input.credibility?.documentReadinessImpact || "none";

  if (impact === "severe") return "very-low";
  if (impact === "major") return "low";
  if (impact === "moderate") return "medium";
  if (impact === "minor") return "high";
  return "very-high";
}

function hasProceduralAnalysis(input: WorkflowOrchestrationBuildInput): boolean {
  return Boolean(input.procedural?.hasProceduralAnalysis);
}

function proceduralWarnings(input: WorkflowOrchestrationBuildInput): string[] {
  return uniqueStrings([
    ...(input.proceduralWarnings || []),
    ...(input.procedural?.warnings || []),
  ]);
}

function proceduralBlockerTitles(input: WorkflowOrchestrationBuildInput): string[] {
  return uniqueStrings(input.procedural?.blockers || []);
}

function proceduralNextActionTitles(input: WorkflowOrchestrationBuildInput): string[] {
  return uniqueStrings(input.procedural?.nextActions || []);
}

function proceduralOverallReadiness(
  input: WorkflowOrchestrationBuildInput,
): CaseConfidence {
  return (
    input.procedural?.overallProceduralReadiness ||
    input.procedural?.complianceReadiness ||
    ((input.proceduralWarnings || []).length === 0 ? "medium" : "low")
  );
}

function proceduralSeverity(input: WorkflowOrchestrationBuildInput): CaseSeverity {
  if ((input.procedural?.criticalRiskCount || 0) > 0) return "critical";

  if (
    (input.procedural?.highRiskCount || 0) > 0 ||
    isLowReadiness(input.procedural?.deadlineReadiness) ||
    isLowReadiness(input.procedural?.serviceReadiness) ||
    isLowReadiness(input.procedural?.filingReadiness)
  ) {
    return "high";
  }

  if (
    (input.procedural?.riskCount || 0) > 0 ||
    (input.procedural?.blockerCount || 0) > 0 ||
    proceduralWarnings(input).length > 0 ||
    isLowReadiness(input.procedural?.motionReadiness) ||
    isLowReadiness(input.procedural?.discoveryReadiness) ||
    isLowReadiness(input.procedural?.settlementReadiness) ||
    isLowReadiness(input.procedural?.preTrialReadiness) ||
    isLowReadiness(input.procedural?.trialReadiness) ||
    isLowReadiness(input.procedural?.costsReadiness) ||
    isLowReadiness(input.procedural?.assessmentReadiness)
  ) {
    return "medium";
  }

  return "info";
}

function hasHighProceduralRisk(input: WorkflowOrchestrationBuildInput): boolean {
  return (
    (input.procedural?.criticalRiskCount || 0) > 0 ||
    (input.procedural?.highRiskCount || 0) > 0 ||
    proceduralBlockerTitles(input).length > 0 ||
    isLowReadiness(input.procedural?.deadlineReadiness) ||
    isLowReadiness(input.procedural?.serviceReadiness) ||
    isLowReadiness(input.procedural?.filingReadiness)
  );
}

function hasLegalReasoning(input: WorkflowOrchestrationBuildInput): boolean {
  return Boolean(input.legalReasoning?.hasLegalReasoning);
}

function legalReasoningWarnings(input: WorkflowOrchestrationBuildInput): string[] {
  return uniqueStrings([
    ...(input.legalReasoningWarnings || []),
    ...(input.legalReasoning?.warnings || []),
  ]);
}

function legalReasoningReadiness(
  input: WorkflowOrchestrationBuildInput,
): CaseConfidence {
  const reasoning = input.legalReasoning;

  if (!reasoning?.hasLegalReasoning) return "low";
  if ((reasoning.blockedObjects || []).length > 0) return "low";
  if (legalReasoningWarnings(input).length > 0) return "medium";
  if (
    (reasoning.profileCount || 0) > 0 &&
    (reasoning.evidencePriorities || []).length > 0 &&
    (reasoning.burdenPriorities || []).length > 0
  ) {
    return "high";
  }

  return "medium";
}

function hasLegalReasoningRisk(input: WorkflowOrchestrationBuildInput): boolean {
  const reasoning = input.legalReasoning;

  return (
    !reasoning?.hasLegalReasoning ||
    legalReasoningWarnings(input).length > 0 ||
    (reasoning?.blockedObjects || []).length > 0 ||
    (reasoning?.proceduralWatchPoints || []).length > 0
  );
}

function legalReasoningSeverity(
  input: WorkflowOrchestrationBuildInput,
): CaseSeverity {
  const warnings = legalReasoningWarnings(input);
  const blocked = input.legalReasoning?.blockedObjects || [];
  const proceduralWatchPoints = input.legalReasoning?.proceduralWatchPoints || [];

  if (blocked.length > 0) return "high";
  if (warnings.some((warning) => severityFromWarning(warning) === "critical")) {
    return "critical";
  }
  if (warnings.some((warning) => severityFromWarning(warning) === "high")) {
    return "high";
  }
  if (proceduralWatchPoints.length > 0 || warnings.length > 0) return "medium";

  return "info";
}

function buildGate(args: {
  gateType: WorkflowGate["gateType"];
  title: string;
  explanation: string;
  status: WorkflowGate["status"];
  severity: CaseSeverity;
  requiredBeforeRoutes: WorkflowRoute[];
  suggestedFix: string;
}): WorkflowGate {
  return {
    id: createId("workflow_gate"),
    gateType: args.gateType,
    title: args.title,
    explanation: args.explanation,
    status: args.status,
    severity: args.severity,
    requiredBeforeRoutes: args.requiredBeforeRoutes,
    suggestedFix: args.suggestedFix,
  };
}

function buildBlocker(args: {
  blockerType: WorkflowBlocker["blockerType"];
  severity: CaseSeverity;
  title: string;
  explanation: string;
  suggestedFix: string;
  affectedRoutes: WorkflowRoute[];
}): WorkflowBlocker {
  return {
    id: createId("workflow_blocker"),
    blockerType: args.blockerType,
    severity: args.severity,
    title: args.title,
    explanation: args.explanation,
    suggestedFix: args.suggestedFix,
    affectedRoutes: args.affectedRoutes,
  };
}

function buildAction(args: {
  kind: WorkflowNextAction["kind"];
  title: string;
  explanation: string;
  priority: WorkflowNextAction["priority"];
  route: WorkflowRoute;
  blockedBy?: string[];
  unlocks?: WorkflowRoute[];
}): WorkflowNextAction {
  return {
    id: createId("workflow_action"),
    kind: args.kind,
    title: args.title,
    explanation: args.explanation,
    priority: args.priority,
    route: args.route,
    blockedBy: args.blockedBy || [],
    unlocks: args.unlocks || [],
  };
}

function buildGates(input: WorkflowOrchestrationBuildInput): WorkflowGate[] {
  const gates: WorkflowGate[] = [];

  gates.push(
    buildGate({
      gateType: "court-path",
      title: "Court path confirmed",
      explanation:
        "Forms, procedure, routing, and document generation depend on knowing the correct court path.",
      status: input.courtPath === "unknown" ? "blocked" : "satisfied",
      severity: input.courtPath === "unknown" ? "high" : "info",
      requiredBeforeRoutes: ["/forms", "/documents", "/court-package"],
      suggestedFix:
        "Confirm whether this is family, small claims, civil, tribunal, LTB, immigration, or another path.",
    }),
  );

  gates.push(
    buildGate({
      gateType: "stage",
      title: "Procedural stage confirmed",
      explanation:
        "The system must know whether the user is starting, responding, in conference, motion, trial, enforcement, appeal, or another stage.",
      status: input.stage === "not-sure" ? "blocked" : "satisfied",
      severity: input.stage === "not-sure" ? "high" : "info",
      requiredBeforeRoutes: ["/forms", "/documents", "/court-package"],
      suggestedFix:
        "Confirm what has already been filed, served, scheduled, or ordered.",
    }),
  );

  gates.push(
    buildGate({
      gateType: "legal-reasoning",
      title: "Legal reasoning package reviewed",
      explanation:
        "Workflow routing should consider the shared Legal Reasoning Coordinator package before sending the user to forms, documents, court packages, settlement materials, or trial preparation.",
      status: !hasLegalReasoning(input)
        ? "open"
        : (input.legalReasoning?.blockedObjects || []).length > 0
          ? "blocked"
          : legalReasoningWarnings(input).length > 0 ||
              (input.legalReasoning?.proceduralWatchPoints || []).length > 0
            ? "open"
            : "satisfied",
      severity: legalReasoningSeverity(input),
      requiredBeforeRoutes: [
        "/documents",
        "/forms",
        "/court-package",
        "/settlement-conference",
        "/trial-package",
      ],
      suggestedFix:
        "Review legal reasoning priorities, proof priorities, procedural watch points, authority warnings, and first questions before moving to final workflow outputs.",
    }),
  );

  gates.push(
    buildGate({
      gateType: "procedure",
      title: "Procedural readiness reviewed",
      explanation:
        "Workflow decisions must consider deadlines, service, filing, motion readiness, discovery, settlement, pre-trial, costs, and assessment readiness.",
      status: !hasProceduralAnalysis(input)
        ? "open"
        : hasHighProceduralRisk(input)
          ? "blocked"
          : proceduralWarnings(input).length > 0
            ? "open"
            : "satisfied",
      severity: proceduralSeverity(input),
      requiredBeforeRoutes: [
        "/forms",
        "/documents",
        "/court-package",
        "/settlement-conference",
        "/trial-package",
      ],
      suggestedFix:
        "Review procedural blockers, deadlines, service, filing, and stage-specific requirements before generating final workflow outputs.",
    }),
  );

  gates.push(
    buildGate({
      gateType: "claims",
      title: "Dominant claim theory confirmed",
      explanation:
        "The platform needs a dominant or active claim theory before generating litigation documents or court packages.",
      status: input.hasDominantClaim ? "satisfied" : "blocked",
      severity: input.hasDominantClaim ? "info" : "high",
      requiredBeforeRoutes: [
        "/documents",
        "/forms",
        "/court-package",
        "/litigation-strategy",
      ],
      suggestedFix: "Review the case facts and confirm the dominant claim theory.",
    }),
  );

  gates.push(
    buildGate({
      gateType: "proof",
      title: "Element proof analysis completed",
      explanation:
        "Court-ready documents should not be generated until each claim is checked against its required elements, missing proof, burden risk, and contradictions.",
      status: !hasProofAnalysis(input)
        ? "blocked"
        : contradictedElementProofCount(input) > 0 ||
            missingElementProofCount(input) > 0
          ? "blocked"
          : weakClaimProofCount(input) > 0 || hasProofWeakness(input)
            ? "open"
            : "satisfied",
      severity: !hasProofAnalysis(input) ? "high" : proofSeverity(input),
      requiredBeforeRoutes: [
        "/documents",
        "/forms",
        "/court-package",
        "/trial-package",
        "/settlement-conference",
      ],
      suggestedFix:
        "Review the proof map, address missing or contradicted elements, and connect evidence to each required legal element.",
    }),
  );

  gates.push(
    buildGate({
      gateType: "authority",
      title: "Legal authority verified",
      explanation:
        "CourtSimplified should not rely on unsafe, unverified, outdated, or wrong-jurisdiction authorities in litigation documents.",
      status: !hasAuthorityAnalysis(input)
        ? "open"
        : unsafeAuthorityCount(input) > 0 ||
            wrongJurisdictionAuthorityCount(input) > 0
          ? "blocked"
          : hasAuthorityWarnings(input)
            ? "open"
            : "satisfied",
      severity:
        unsafeAuthorityCount(input) > 0
          ? "high"
          : wrongJurisdictionAuthorityCount(input) > 0
            ? "medium"
            : hasAuthorityWarnings(input)
              ? "medium"
              : "info",
      requiredBeforeRoutes: ["/legal-principles", "/documents", "/court-package"],
      suggestedFix:
        "Review authority verification, citation safety, jurisdiction fit, and prefer binding or directly applicable sources.",
    }),
  );

  gates.push(
    buildGate({
      gateType: "contradictions",
      title: "Contradictions reviewed",
      explanation:
        "Contradictions can affect pleadings, affidavits, settlement posture, trial preparation, and judicial confidence.",
      status: !hasContradictionAnalysis(input)
        ? "open"
        : contradictionCritical(input) > 0 || contradictionHigh(input) > 0
          ? "blocked"
          : contradictionTotal(input) > 0
            ? "open"
            : "satisfied",
      severity:
        contradictionCritical(input) > 0
          ? "critical"
          : contradictionHigh(input) > 0
            ? "high"
            : contradictionTotal(input) > 0
              ? "medium"
              : "info",
      requiredBeforeRoutes: [
        "/documents",
        "/court-package",
        "/trial-package",
        "/settlement-conference",
      ],
      suggestedFix:
        "Resolve factual, timeline, amount, location, evidence, or statement contradictions before finalizing court materials.",
    }),
  );

  gates.push(
    buildGate({
      gateType: "credibility",
      title: "Credibility risk reviewed",
      explanation:
        "Credibility risk affects judge concerns, cross-examination exposure, settlement pressure, and document readiness.",
      status:
        credibilityLevel(input) === "critical" ||
        credibilityLevel(input) === "serious"
          ? "blocked"
          : credibilityLevel(input) === "elevated" || hasCredibilityWarnings(input)
            ? "open"
            : "satisfied",
      severity:
        credibilityLevel(input) === "critical"
          ? "critical"
          : credibilityLevel(input) === "serious"
            ? "high"
            : credibilityLevel(input) === "elevated"
              ? "medium"
              : "info",
      requiredBeforeRoutes: [
        "/documents",
        "/court-package",
        "/trial-package",
        "/settlement-conference",
      ],
      suggestedFix:
        "Review credibility findings, judge concerns, cross-examination risks, and document-readiness impact.",
    }),
  );

  gates.push(
    buildGate({
      gateType: "evidence",
      title: "Evidence started",
      explanation:
        "Evidence should be available before court packages, affidavits, settlement materials, or trial materials are generated.",
      status: input.hasEvidence ? "satisfied" : "blocked",
      severity: input.hasEvidence ? "info" : "medium",
      requiredBeforeRoutes: [
        "/court-package",
        "/trial-package",
        "/settlement-conference",
      ],
      suggestedFix: "Add and organize evidence before generating court-ready materials.",
    }),
  );

  gates.push(
    buildGate({
      gateType: "timeline",
      title: "Timeline started",
      explanation:
        "Chronology helps with causation, procedural timing, credibility, and evidence organization.",
      status: input.hasTimeline ? "satisfied" : "blocked",
      severity: input.hasTimeline ? "info" : "medium",
      requiredBeforeRoutes: [
        "/court-package",
        "/trial-package",
        "/litigation-strategy",
      ],
      suggestedFix: "Build a timeline of important factual and procedural events.",
    }),
  );

  gates.push(
    buildGate({
      gateType: "damages",
      title: "Damages/remedy model started",
      explanation:
        "Requested remedies and damages must be connected to facts, proof, causation, and forum fit.",
      status: input.hasDamagesModel ? "satisfied" : "open",
      severity: input.hasDamagesModel ? "info" : "medium",
      requiredBeforeRoutes: [
        "/documents",
        "/court-package",
        "/settlement-conference",
      ],
      suggestedFix: "Confirm requested remedy, damages amount, calculation, and proof.",
    }),
  );

  if (input.hasLegalKnowledgeWarnings) {
    gates.push(
      buildGate({
        gateType: "knowledge",
        title: "Legal authority review required",
        explanation:
          "Some legal knowledge or source material requires verification before being relied on in documents or guidance.",
        status: "blocked",
        severity: "medium",
        requiredBeforeRoutes: ["/legal-principles", "/documents", "/court-package"],
        suggestedFix:
          "Review source warnings and verify legal authority before relying on it.",
      }),
    );
  }

  return gates;
}

function blockerTypeForGate(gate: WorkflowGate): WorkflowBlocker["blockerType"] {
  if (gate.gateType === "court-path") return "missing-court-path";
  if (gate.gateType === "stage") return "missing-stage";
  if (gate.gateType === "claims") return "missing-claim-theory";
  if (gate.gateType === "procedure") return "procedural-risk";
  if (gate.gateType === "legal-reasoning") return "legal-reasoning-risk";
  if (gate.gateType === "evidence") return "missing-evidence";
  if (gate.gateType === "proof") return "proof-risk";
  if (gate.gateType === "timeline") return "missing-timeline";
  if (gate.gateType === "damages") return "missing-damages-proof";
  if (gate.gateType === "knowledge") return "legal-authority-risk";
  if (gate.gateType === "authority") return "legal-authority-risk";
  if (gate.gateType === "contradictions") return "contradiction-risk";
  if (gate.gateType === "credibility") return "credibility-risk";
  return "unknown";
}

function buildProofBlockers(input: WorkflowOrchestrationBuildInput): WorkflowBlocker[] {
  const blockers: WorkflowBlocker[] = [];

  if (!hasProofAnalysis(input)) {
    blockers.push(
      buildBlocker({
        blockerType: "missing-proof-analysis",
        severity: "high",
        title: "Element proof analysis is missing",
        explanation:
          "Workflow cannot safely assess document readiness until the claim elements, proof gaps, and burden risks are mapped.",
        suggestedFix:
          "Run element proof analysis and connect facts/evidence to the required elements before generating final materials.",
        affectedRoutes: [
          "/documents",
          "/forms",
          "/court-package",
          "/trial-package",
          "/settlement-conference",
        ],
      }),
    );
  }

  if (contradictedElementProofCount(input) > 0) {
    blockers.push(
      buildBlocker({
        blockerType: "proof-risk",
        severity: "critical",
        title: "Contradicted element proof requires review",
        explanation: `${contradictedElementProofCount(
          input,
        )} required element(s) appear contradicted. This can seriously weaken or defeat a claim if not addressed.`,
        suggestedFix:
          "Review contradicted proof findings, resolve contradictions, and decide whether the claim should be revised, narrowed, or supported with better evidence.",
        affectedRoutes: [
          "/documents",
          "/forms",
          "/court-package",
          "/trial-package",
          "/settlement-conference",
        ],
      }),
    );
  }

  if (missingElementProofCount(input) > 0) {
    blockers.push(
      buildBlocker({
        blockerType: "proof-risk",
        severity: "high",
        title: "Required element proof is missing",
        explanation: `${missingElementProofCount(
          input,
        )} required element(s) are missing proof. Filing or generating court materials before fixing this may create avoidable weakness.`,
        suggestedFix:
          "Add evidence, facts, dates, witnesses, documents, or admissions that prove the missing elements.",
        affectedRoutes: [
          "/documents",
          "/forms",
          "/court-package",
          "/trial-package",
          "/settlement-conference",
        ],
      }),
    );
  }

  if (weakClaimProofCount(input) > 0) {
    blockers.push(
      buildBlocker({
        blockerType: "proof-risk",
        severity: "medium",
        title: "Weak claim proof map",
        explanation: `${weakClaimProofCount(
          input,
        )} claim proof map(s) are weak. The case may need stronger evidence before strategy, settlement, or court package generation.`,
        suggestedFix:
          "Review the weakest elements and strengthen the evidence map before preparing final documents.",
        affectedRoutes: [
          "/documents",
          "/court-package",
          "/trial-package",
          "/settlement-conference",
        ],
      }),
    );
  }

  for (const weakness of input.proof?.proofWeaknesses || []) {
    blockers.push(
      buildBlocker({
        blockerType: "proof-risk",
        severity: proofSeverity(input),
        title: `Proof weakness: ${weakness}`,
        explanation: weakness,
        suggestedFix:
          "Address this proof weakness by linking stronger evidence, adding missing facts, or revising the claim theory.",
        affectedRoutes: [
          "/documents",
          "/court-package",
          "/trial-package",
          "/settlement-conference",
        ],
      }),
    );
  }

  return blockers;
}

function buildLegalReasoningBlockers(
  input: WorkflowOrchestrationBuildInput,
): WorkflowBlocker[] {
  const blockers: WorkflowBlocker[] = [];
  const reasoning = input.legalReasoning;

  if (!reasoning?.hasLegalReasoning) {
    return blockers;
  }

  for (const blockedObject of reasoning.blockedObjects || []) {
    blockers.push(
      buildBlocker({
        blockerType: "legal-reasoning-risk",
        severity: "high",
        title: `Blocked legal knowledge object: ${blockedObject}`,
        explanation:
          "The Legal Reasoning Coordinator blocked a knowledge object from use. Workflow should not treat legal reasoning as document-ready until this is reviewed.",
        suggestedFix:
          "Review the blocked knowledge object, verification status, jurisdiction fit, and source warnings before relying on it.",
        affectedRoutes: ["/legal-principles", "/documents", "/court-package"],
      }),
    );
  }

  for (const warning of legalReasoningWarnings(input)) {
    blockers.push(
      buildBlocker({
        blockerType: "legal-reasoning-risk",
        severity: severityFromWarning(warning),
        title: warning,
        explanation: warning,
        suggestedFix:
          "Review the coordinated legal reasoning warning before relying on downstream workflow outputs.",
        affectedRoutes: ["/legal-principles", "/documents", "/court-package"],
      }),
    );
  }

  for (const watchPoint of reasoning.proceduralWatchPoints || []) {
    blockers.push(
      buildBlocker({
        blockerType: "legal-reasoning-risk",
        severity: severityFromWarning(watchPoint),
        title: `Legal reasoning procedural watch point: ${watchPoint}`,
        explanation:
          "The Legal Reasoning Coordinator identified a procedural watch point that may affect routing, document readiness, or court-package preparation.",
        suggestedFix:
          "Review this procedural watch point with the procedural state before moving to final forms, documents, or court packages.",
        affectedRoutes: ["/forms", "/documents", "/court-package"],
      }),
    );
  }

  return blockers;
}

function buildProceduralBlockers(
  input: WorkflowOrchestrationBuildInput,
): WorkflowBlocker[] {
  const blockers: WorkflowBlocker[] = [];
  const procedural = input.procedural;

  if (!procedural?.hasProceduralAnalysis) {
    if (proceduralWarnings(input).length > 0) {
      blockers.push(
        buildBlocker({
          blockerType: "procedural-risk",
          severity: "medium",
          title: "Procedural review required",
          explanation:
            "Procedural warnings exist, but structured procedural readiness is not fully available.",
          suggestedFix:
            "Review procedural warnings, deadlines, service, filing, and stage before relying on downstream outputs.",
          affectedRoutes: ["/forms", "/documents", "/court-package"],
        }),
      );
    }

    return blockers;
  }

  if ((procedural.criticalRiskCount || 0) > 0) {
    blockers.push(
      buildBlocker({
        blockerType: "procedural-risk",
        severity: "critical",
        title: "Critical procedural risk requires review",
        explanation:
          "ProceduralState identified one or more critical procedural risks that may affect filings, deadlines, service, or court readiness.",
        suggestedFix:
          "Resolve critical procedural blockers before preparing final forms, documents, court packages, settlement materials, or trial materials.",
        affectedRoutes: [
          "/forms",
          "/documents",
          "/court-package",
          "/settlement-conference",
          "/trial-package",
        ],
      }),
    );
  }

  if ((procedural.highRiskCount || 0) > 0) {
    blockers.push(
      buildBlocker({
        blockerType: "procedural-risk",
        severity: "high",
        title: "High procedural risk requires review",
        explanation:
          "ProceduralState identified high-risk procedural issues that may affect the next step.",
        suggestedFix:
          "Review procedural risks and confirm the correct filing, service, deadline, or stage requirement.",
        affectedRoutes: ["/forms", "/documents", "/court-package"],
      }),
    );
  }

  if (isLowReadiness(procedural.deadlineReadiness)) {
    blockers.push(
      buildBlocker({
        blockerType: "procedural-deadline-risk",
        severity: "high",
        title: "Procedural deadlines need confirmation",
        explanation:
          "Deadline readiness is low. Workflow cannot safely route final documents or packages without deadline clarity.",
        suggestedFix:
          "Confirm all filing, service, response, motion, conference, pre-trial, appeal, costs, or assessment deadlines.",
        affectedRoutes: ["/forms", "/documents", "/court-package", "/trial-package"],
      }),
    );
  }

  if (isLowReadiness(procedural.serviceReadiness)) {
    blockers.push(
      buildBlocker({
        blockerType: "procedural-compliance-risk",
        severity: "high",
        title: "Service readiness needs review",
        explanation:
          "Service readiness is low. The system should not treat the case as procedurally ready until service issues are clarified.",
        suggestedFix:
          "Confirm what was served, who was served, how service was completed, when it occurred, and whether proof of service exists.",
        affectedRoutes: ["/forms", "/documents", "/court-package"],
      }),
    );
  }

  if (isLowReadiness(procedural.filingReadiness)) {
    blockers.push(
      buildBlocker({
        blockerType: "procedural-compliance-risk",
        severity: "high",
        title: "Filing readiness needs review",
        explanation:
          "Filing readiness is low. Final forms or court packages may be premature until filing requirements are confirmed.",
        suggestedFix:
          "Confirm the required filing step, court office, online filing path, supporting documents, and filing status.",
        affectedRoutes: ["/forms", "/documents", "/court-package"],
      }),
    );
  }

  if (
    (input.stage === "motion" || input.stage === "urgent") &&
    isLowReadiness(procedural.motionReadiness)
  ) {
    blockers.push(
      buildBlocker({
        blockerType: "procedural-motion-risk",
        severity: "high",
        title: "Motion readiness needs review",
        explanation:
          "The case is in a motion or urgent stage, but motion procedural readiness is low.",
        suggestedFix:
          "Confirm motion relief, supporting affidavit evidence, service, deadlines, confirmation, draft order, and required materials.",
        affectedRoutes: ["/documents", "/court-package"],
      }),
    );
  }

  if (isLowReadiness(procedural.discoveryReadiness)) {
    blockers.push(
      buildBlocker({
        blockerType: "procedural-discovery-risk",
        severity: "medium",
        title: "Discovery readiness needs review",
        explanation:
          "Discovery readiness is low. This can affect settlement, pre-trial, trial, and court-package readiness.",
        suggestedFix:
          "Review disclosure, affidavits of documents, undertakings, refusals, admissions, and missing discovery steps.",
        affectedRoutes: ["/settlement-conference", "/trial-package", "/court-package"],
      }),
    );
  }

  if (
    input.stage === "conference" &&
    isLowReadiness(procedural.settlementReadiness)
  ) {
    blockers.push(
      buildBlocker({
        blockerType: "procedural-settlement-risk",
        severity: "medium",
        title: "Settlement readiness needs review",
        explanation:
          "The case is in a conference stage, but settlement readiness is low.",
        suggestedFix:
          "Review settlement position, offers, proof gaps, costs exposure, and conference materials.",
        affectedRoutes: ["/settlement-conference"],
      }),
    );
  }

  if (
    (input.stage === "conference" || input.stage === "trial") &&
    (isLowReadiness(procedural.preTrialReadiness) ||
      isLowReadiness(procedural.trialReadiness))
  ) {
    blockers.push(
      buildBlocker({
        blockerType: "procedural-trial-risk",
        severity: "high",
        title: "Pre-trial or trial readiness needs review",
        explanation:
          "Pre-trial or trial procedural readiness is low. Trial materials should not be treated as ready until procedural readiness improves.",
        suggestedFix:
          "Confirm pre-trial conference status, certificate/readiness issues, experts, witnesses, trial documents, and remaining procedural steps.",
        affectedRoutes: ["/trial-package", "/court-package"],
      }),
    );
  }

  for (const blocker of proceduralBlockerTitles(input)) {
    blockers.push(
      buildBlocker({
        blockerType: "procedural-risk",
        severity: severityFromWarning(blocker),
        title: blocker,
        explanation: blocker,
        suggestedFix:
          "Review this procedural blocker in ProceduralState before relying on workflow outputs.",
        affectedRoutes: ["/forms", "/documents", "/court-package"],
      }),
    );
  }

  return blockers;
}

function buildAuthorityBlockers(
  input: WorkflowOrchestrationBuildInput,
): WorkflowBlocker[] {
  const blockers: WorkflowBlocker[] = [];

  if (unsafeAuthorityCount(input) > 0) {
    blockers.push(
      buildBlocker({
        blockerType: "citation-safety-risk",
        severity: "high",
        title: "Unsafe legal authorities require review",
        explanation: `${unsafeAuthorityCount(
          input,
        )} legal authority source(s) are not currently safe to cite or rely on.`,
        suggestedFix:
          "Review citation safety, verification status, source status, and replace unsafe authorities with verified sources.",
        affectedRoutes: ["/legal-principles", "/documents", "/court-package"],
      }),
    );
  }

  if (wrongJurisdictionAuthorityCount(input) > 0) {
    blockers.push(
      buildBlocker({
        blockerType: "wrong-jurisdiction-authority",
        severity: "medium",
        title: "Wrong-jurisdiction authorities require review",
        explanation: `${wrongJurisdictionAuthorityCount(
          input,
        )} authority source(s) may be from the wrong jurisdiction.`,
        suggestedFix:
          "Prefer binding, local, or directly applicable authority before relying on the source in documents.",
        affectedRoutes: ["/legal-principles", "/documents", "/court-package"],
      }),
    );
  }

  for (const warning of [
    ...(input.authority?.authorityWarnings || []),
    ...(input.authorityWarnings || []),
  ]) {
    blockers.push(
      buildBlocker({
        blockerType: "legal-authority-risk",
        severity: severityFromWarning(warning),
        title: warning,
        explanation: warning,
        suggestedFix:
          "Review authority verification, citation safety, jurisdiction fit, and legal use limits.",
        affectedRoutes: ["/legal-principles", "/documents", "/court-package"],
      }),
    );
  }

  return blockers;
}

function buildContradictionBlockers(
  input: WorkflowOrchestrationBuildInput,
): WorkflowBlocker[] {
  const blockers: WorkflowBlocker[] = [];

  if (contradictionCritical(input) > 0) {
    blockers.push(
      buildBlocker({
        blockerType: "contradiction-risk",
        severity: "critical",
        title: "Critical contradictions require review",
        explanation: `${contradictionCritical(
          input,
        )} critical contradiction(s) may seriously affect pleadings, credibility, or trial readiness.`,
        suggestedFix:
          "Resolve critical contradictions before generating final court documents or trial materials.",
        affectedRoutes: [
          "/documents",
          "/court-package",
          "/trial-package",
          "/settlement-conference",
        ],
      }),
    );
  }

  if (contradictionHigh(input) > 0) {
    blockers.push(
      buildBlocker({
        blockerType: "contradiction-risk",
        severity: "high",
        title: "High-risk contradictions require review",
        explanation: `${contradictionHigh(
          input,
        )} high-risk contradiction(s) should be resolved before relying on the case summary or documents.`,
        suggestedFix:
          "Clarify inconsistent dates, amounts, events, locations, statements, evidence, or claim facts.",
        affectedRoutes: [
          "/documents",
          "/court-package",
          "/trial-package",
          "/settlement-conference",
        ],
      }),
    );
  }

  for (const warning of [
    ...(input.contradictions?.warnings || []),
    ...(input.contradictionWarnings || []),
  ]) {
    blockers.push(
      buildBlocker({
        blockerType: "contradiction-risk",
        severity: severityFromWarning(warning),
        title: warning,
        explanation: warning,
        suggestedFix:
          "Review contradiction findings and resolve inconsistencies before finalizing downstream outputs.",
        affectedRoutes: [
          "/documents",
          "/court-package",
          "/trial-package",
          "/settlement-conference",
        ],
      }),
    );
  }

  return blockers;
}

function buildCredibilityBlockers(
  input: WorkflowOrchestrationBuildInput,
): WorkflowBlocker[] {
  const blockers: WorkflowBlocker[] = [];
  const level = credibilityLevel(input);

  if (level === "critical" || level === "serious") {
    blockers.push(
      buildBlocker({
        blockerType: "credibility-risk",
        severity: level === "critical" ? "critical" : "high",
        title: `${level} credibility risk`,
        explanation:
          "Credibility analysis shows elevated risk affecting judge concerns, cross-examination exposure, settlement pressure, or document readiness.",
        suggestedFix:
          "Review credibility findings, fix inconsistencies, strengthen evidence, and narrow unsupported claims before preparing final materials.",
        affectedRoutes: [
          "/litigation-strategy",
          "/documents",
          "/court-package",
          "/trial-package",
          "/settlement-conference",
        ],
      }),
    );
  }

  if (
    input.credibility?.documentReadinessImpact === "major" ||
    input.credibility?.documentReadinessImpact === "severe"
  ) {
    blockers.push(
      buildBlocker({
        blockerType: "document-risk",
        severity:
          input.credibility.documentReadinessImpact === "severe"
            ? "critical"
            : "high",
        title: "Credibility issues affect document readiness",
        explanation:
          "The credibility layer indicates that documents may be unsafe or premature until the issues are reviewed.",
        suggestedFix:
          "Resolve credibility and contradiction issues before generating final pleadings, affidavits, briefs, or packages.",
        affectedRoutes: ["/documents", "/court-package", "/trial-package"],
      }),
    );
  }

  for (const warning of [
    ...(input.credibility?.warnings || []),
    ...(input.credibilityWarnings || []),
  ]) {
    blockers.push(
      buildBlocker({
        blockerType: "credibility-risk",
        severity: severityFromWarning(warning),
        title: warning,
        explanation: warning,
        suggestedFix:
          "Review credibility risk and address judge concerns before relying on downstream materials.",
        affectedRoutes: ["/litigation-strategy", "/court-package", "/trial-package"],
      }),
    );
  }

  return blockers;
}

function severityFromWarning(warning: string): CaseSeverity {
  const text = warning.toLowerCase();

  if (
    text.includes("critical") ||
    text.includes("contradicted") ||
    text.includes("defeat") ||
    text.includes("unsafe") ||
    text.includes("blocked")
  ) {
    return "critical";
  }

  if (
    text.includes("deadline") ||
    text.includes("urgent") ||
    text.includes("missing proof") ||
    text.includes("limitation") ||
    text.includes("wrong jurisdiction") ||
    text.includes("service") ||
    text.includes("filing") ||
    text.includes("procedural")
  ) {
    return "high";
  }

  if (
    text.includes("weak") ||
    text.includes("risk") ||
    text.includes("warning") ||
    text.includes("review") ||
    text.includes("watch point")
  ) {
    return "medium";
  }

  return "medium";
}

function buildBlockers(
  input: WorkflowOrchestrationBuildInput,
  gates: WorkflowGate[],
): WorkflowBlocker[] {
  const blockers: WorkflowBlocker[] = [];

  for (const gate of gates) {
    if (gate.status === "blocked") {
      blockers.push(
        buildBlocker({
          blockerType: blockerTypeForGate(gate),
          severity: gate.severity,
          title: gate.title,
          explanation: gate.explanation,
          suggestedFix: gate.suggestedFix,
          affectedRoutes: gate.requiredBeforeRoutes,
        }),
      );
    }
  }

  blockers.push(...buildLegalReasoningBlockers(input));
  blockers.push(...buildProceduralBlockers(input));
  blockers.push(...buildProofBlockers(input));
  blockers.push(...buildAuthorityBlockers(input));
  blockers.push(...buildContradictionBlockers(input));
  blockers.push(...buildCredibilityBlockers(input));

  const warningGroups: Array<{
    type: WorkflowBlocker["blockerType"];
    warnings?: string[];
    affectedRoutes: WorkflowRoute[];
  }> = [
    {
      type: "legal-reasoning-risk",
      warnings: legalReasoningWarnings(input),
      affectedRoutes: ["/legal-principles", "/documents", "/court-package"],
    },
    {
      type: "procedural-risk",
      warnings: proceduralWarnings(input),
      affectedRoutes: ["/forms", "/documents", "/court-package"],
    },
    {
      type: "missing-evidence",
      warnings: input.evidenceWarnings,
      affectedRoutes: ["/evidence", "/court-package", "/trial-package"],
    },
    {
      type: "missing-timeline",
      warnings: input.timelineWarnings,
      affectedRoutes: ["/litigation-strategy", "/court-package", "/trial-package"],
    },
    {
      type: "missing-damages-proof",
      warnings: input.damagesWarnings,
      affectedRoutes: ["/documents", "/settlement-conference", "/court-package"],
    },
    {
      type: "legal-authority-risk",
      warnings: input.knowledgeWarnings,
      affectedRoutes: ["/legal-principles", "/documents", "/court-package"],
    },
  ];

  for (const group of warningGroups) {
    for (const warning of group.warnings || []) {
      blockers.push(
        buildBlocker({
          blockerType: group.type,
          severity: severityFromWarning(warning),
          title: warning,
          explanation: warning,
          suggestedFix:
            "Review and resolve this issue before relying on downstream outputs.",
          affectedRoutes: group.affectedRoutes,
        }),
      );
    }
  }

  return blockers;
}

function isRouteBlocked(route: WorkflowRoute, blockers: WorkflowBlocker[]): boolean {
  return blockers.some((blocker) => blocker.affectedRoutes.includes(route));
}

function confidenceForRoute(
  route: WorkflowRoute,
  blockers: WorkflowBlocker[],
): CaseConfidence {
  const routeBlockers = blockers.filter((blocker) =>
    blocker.affectedRoutes.includes(route),
  );

  if (routeBlockers.some((blocker) => blocker.severity === "critical")) {
    return "very-low";
  }

  if (routeBlockers.some((blocker) => blocker.severity === "high")) {
    return "low";
  }

  if (routeBlockers.some((blocker) => blocker.severity === "medium")) {
    return "medium";
  }

  if (routeBlockers.some((blocker) => blocker.severity === "low")) {
    return "high";
  }

  return "very-high";
}

function chooseRecommendedRoute(
  input: WorkflowOrchestrationBuildInput,
  blockers: WorkflowBlocker[],
): WorkflowRoute {
  if (
    input.courtPath === "unknown" ||
    input.stage === "not-sure" ||
    !input.hasDominantClaim
  ) {
    return "/builder";
  }

  if (
    hasLegalReasoningRisk(input) &&
    ((input.legalReasoning?.blockedObjects || []).length > 0 ||
      legalReasoningWarnings(input).length > 0)
  ) {
    return "/legal-principles";
  }

  if (!hasProofAnalysis(input)) return "/builder";

  if (hasHighProceduralRisk(input)) {
    if (input.stage === "motion" || input.stage === "urgent") return "/court-package";
    if (input.stage === "conference") return "/settlement-conference";
    if (input.stage === "trial") return "/trial-package";
    if (!isRouteBlocked("/forms", blockers)) return "/forms";
    return "/case-dashboard";
  }

  if (
    unsafeAuthorityCount(input) > 0 ||
    wrongJurisdictionAuthorityCount(input) > 0 ||
    hasAuthorityWarnings(input) ||
    (input.knowledgeWarnings || []).length > 0
  ) {
    return "/legal-principles";
  }

  if (
    contradictionCritical(input) > 0 ||
    contradictionHigh(input) > 0 ||
    hasContradictionWarnings(input)
  ) {
    return "/litigation-strategy";
  }

  if (
    credibilityLevel(input) === "critical" ||
    credibilityLevel(input) === "serious" ||
    hasCredibilityWarnings(input)
  ) {
    return "/litigation-strategy";
  }

  if (
    contradictedElementProofCount(input) > 0 ||
    missingElementProofCount(input) > 0 ||
    !input.hasEvidence ||
    (input.evidenceWarnings || []).length > 0
  ) {
    return "/evidence";
  }

  if (
    weakClaimProofCount(input) > 0 ||
    hasProofWeakness(input) ||
    (input.claimWarnings || []).length > 0 ||
    (input.legalReasoning?.judicialConcerns || []).length > 0 ||
    (input.legalReasoning?.opposingArguments || []).length > 0
  ) {
    return "/litigation-strategy";
  }

  if (input.stage === "conference") return "/settlement-conference";
  if (input.stage === "trial") return "/trial-package";

  if (!isRouteBlocked("/forms", blockers)) return "/forms";
  if (!isRouteBlocked("/documents", blockers)) return "/documents";

  return "/case-dashboard";
}

function buildRouteAssessments(
  input: WorkflowOrchestrationBuildInput,
  blockers: WorkflowBlocker[],
): WorkflowRouteAssessment[] {
  const recommendedRoute = chooseRecommendedRoute(input, blockers);

  const routes: WorkflowRoute[] = [
    "/builder",
    "/case-dashboard",
    "/evidence",
    "/documents",
    "/forms",
    "/court-package",
    "/settlement-conference",
    "/trial-package",
    "/generated-documents",
    "/litigation-strategy",
    "/legal-principles",
    "/dashboard",
  ];

  return routes.map((route) => {
    const blocked = isRouteBlocked(route, blockers);
    const routeConfidence = confidenceForRoute(route, blockers);

    return {
      route,
      available: !blocked || route === "/builder" || route === "/case-dashboard",
      recommended: route === recommendedRoute,
      reason:
        route === recommendedRoute
          ? "Recommended based on workflow gates, legal reasoning readiness, procedural readiness, proof readiness, authority safety, contradiction risk, credibility risk, evidence, stage, and next best action."
          : blocked
            ? "Route has unresolved blockers."
            : "Route is available but not the best next step.",
      blockedBy: blockers
        .filter((blocker) => blocker.affectedRoutes.includes(route))
        .map((blocker) => blocker.id),
      confidence: routeConfidence,
    };
  });
}

function proofPriority(
  input: WorkflowOrchestrationBuildInput,
): WorkflowNextAction["priority"] {
  if (contradictedElementProofCount(input) > 0) return "critical";
  if (missingElementProofCount(input) > 0) return "high";
  if (weakClaimProofCount(input) > 0 || hasProofWeakness(input)) return "high";
  return "medium";
}

function buildLegalReasoningActions(
  input: WorkflowOrchestrationBuildInput,
): WorkflowNextAction[] {
  const actions: WorkflowNextAction[] = [];
  const reasoning = input.legalReasoning;

  if (!reasoning?.hasLegalReasoning) {
    return actions;
  }

  if (
    legalReasoningWarnings(input).length > 0 ||
    (reasoning.blockedObjects || []).length > 0
  ) {
    actions.push(
      buildAction({
        kind: "review-legal-reasoning",
        title: "Review legal reasoning warnings",
        explanation:
          "The Legal Reasoning Coordinator identified warnings or blocked knowledge objects that should be reviewed before relying on final documents or court packages.",
        priority: (reasoning.blockedObjects || []).length > 0 ? "high" : "medium",
        route: "/legal-principles",
        unlocks: ["/documents", "/court-package"],
      }),
    );
  }

  for (const question of reasoning.firstQuestions || []) {
    actions.push(
      buildAction({
        kind: "review-legal-reasoning",
        title: question,
        explanation:
          "This question comes from the coordinated legal reasoning profile and should be answered before treating the case as workflow-ready.",
        priority: "high",
        route: "/builder",
        unlocks: ["/evidence", "/litigation-strategy"],
      }),
    );
  }

  for (const evidencePriority of reasoning.evidencePriorities || []) {
    actions.push(
      buildAction({
        kind: "add-evidence",
        title: `Collect legal reasoning evidence priority: ${evidencePriority}`,
        explanation:
          "This evidence priority comes from the Legal Reasoning Coordinator and should be connected to the proof map.",
        priority: "high",
        route: "/evidence",
        unlocks: ["/documents", "/court-package"],
      }),
    );
  }

  for (const burdenPriority of reasoning.burdenPriorities || []) {
    actions.push(
      buildAction({
        kind: "strengthen-proof",
        title: `Address burden priority: ${burdenPriority}`,
        explanation:
          "This burden priority comes from the Legal Reasoning Coordinator and should be reviewed before finalizing documents.",
        priority: "high",
        route: "/evidence",
        unlocks: ["/documents", "/court-package"],
      }),
    );
  }

  for (const watchPoint of reasoning.proceduralWatchPoints || []) {
    actions.push(
      buildAction({
        kind: "review-procedure",
        title: `Review legal reasoning procedural watch point: ${watchPoint}`,
        explanation:
          "This procedural watch point comes from the Legal Reasoning Coordinator and should be checked before routing to forms, documents, or court packages.",
        priority: "high",
        route: "/case-dashboard",
        unlocks: ["/forms", "/documents", "/court-package"],
      }),
    );
  }

  return actions.slice(0, 20);
}

function buildProofActions(input: WorkflowOrchestrationBuildInput): WorkflowNextAction[] {
  const actions: WorkflowNextAction[] = [];

  if (!hasProofAnalysis(input)) {
    actions.push(
      buildAction({
        kind: "review-proof",
        title: "Run element proof analysis",
        explanation:
          "The case needs an element-by-element proof map before the system can safely assess document, form, settlement, or trial readiness.",
        priority: "high",
        route: "/builder",
        unlocks: ["/evidence", "/litigation-strategy"],
      }),
    );
  }

  if (
    contradictedElementProofCount(input) > 0 ||
    missingElementProofCount(input) > 0 ||
    weakClaimProofCount(input) > 0 ||
    hasProofWeakness(input)
  ) {
    actions.push(
      buildAction({
        kind: "strengthen-proof",
        title: "Strengthen missing or weak proof",
        explanation:
          "Address missing, weak, or contradicted elements before preparing final pleadings, forms, affidavits, settlement materials, or trial materials.",
        priority: proofPriority(input),
        route: "/evidence",
        unlocks: ["/documents", "/forms", "/court-package"],
      }),
    );
  }

  for (const nextAction of input.proof?.proofNextActions || []) {
    actions.push(
      buildAction({
        kind: "review-proof",
        title: nextAction,
        explanation:
          "This action comes from the element proof analysis and should be addressed before relying on final litigation materials.",
        priority: proofPriority(input),
        route:
          contradictedElementProofCount(input) > 0 ||
          missingElementProofCount(input) > 0
            ? "/evidence"
            : "/litigation-strategy",
        unlocks: ["/documents", "/forms", "/court-package"],
      }),
    );
  }

  return actions;
}

function buildProceduralActions(
  input: WorkflowOrchestrationBuildInput,
): WorkflowNextAction[] {
  const actions: WorkflowNextAction[] = [];
  const procedural = input.procedural;

  if (!procedural?.hasProceduralAnalysis && proceduralWarnings(input).length > 0) {
    actions.push(
      buildAction({
        kind: "review-procedure",
        title: "Review procedural warnings",
        explanation:
          "Procedural warnings exist, but structured procedural readiness is incomplete.",
        priority: "high",
        route: "/case-dashboard",
        unlocks: ["/forms", "/documents", "/court-package"],
      }),
    );
  }

  if (isLowReadiness(procedural?.deadlineReadiness)) {
    actions.push(
      buildAction({
        kind: "confirm-deadline",
        title: "Confirm procedural deadlines",
        explanation:
          "Deadline readiness is low. Confirm filing, service, response, motion, conference, pre-trial, appeal, costs, or assessment deadlines.",
        priority: "critical",
        route: "/case-dashboard",
        unlocks: ["/forms", "/documents", "/court-package"],
      }),
    );
  }

  if (
    isLowReadiness(procedural?.serviceReadiness) ||
    isLowReadiness(procedural?.filingReadiness)
  ) {
    actions.push(
      buildAction({
        kind: "review-procedure",
        title: "Review service and filing readiness",
        explanation:
          "Service or filing readiness is low. Confirm what has been filed, what has been served, and what proof exists.",
        priority: "high",
        route: "/forms",
        unlocks: ["/documents", "/court-package"],
      }),
    );
  }

  if (
    (input.stage === "motion" || input.stage === "urgent") &&
    isLowReadiness(procedural?.motionReadiness)
  ) {
    actions.push(
      buildAction({
        kind: "review-procedure",
        title: "Review motion procedural readiness",
        explanation:
          "Motion readiness is low. Confirm motion materials, supporting evidence, service, deadlines, confirmation, and draft order requirements.",
        priority: input.stage === "urgent" ? "critical" : "high",
        route: "/court-package",
        unlocks: ["/documents"],
      }),
    );
  }

  if (isLowReadiness(procedural?.discoveryReadiness)) {
    actions.push(
      buildAction({
        kind: "review-procedure",
        title: "Review discovery readiness",
        explanation:
          "Discovery readiness is low. Review disclosure, document discovery, undertakings, refusals, and admissions.",
        priority: "medium",
        route: "/litigation-strategy",
        unlocks: ["/settlement-conference", "/trial-package"],
      }),
    );
  }

  if (
    input.stage === "conference" &&
    isLowReadiness(procedural?.settlementReadiness)
  ) {
    actions.push(
      buildAction({
        kind: "prepare-settlement",
        title: "Prepare settlement and conference readiness",
        explanation:
          "Settlement readiness is low. Review offers, proof gaps, costs exposure, and conference materials.",
        priority: "high",
        route: "/settlement-conference",
        unlocks: ["/documents", "/court-package"],
      }),
    );
  }

  if (
    (input.stage === "conference" || input.stage === "trial") &&
    (isLowReadiness(procedural?.preTrialReadiness) ||
      isLowReadiness(procedural?.trialReadiness))
  ) {
    actions.push(
      buildAction({
        kind: "prepare-trial",
        title: "Review pre-trial and trial procedural readiness",
        explanation:
          "Pre-trial or trial readiness is low. Confirm remaining procedural steps, experts, witnesses, trial documents, and readiness obligations.",
        priority: "high",
        route: "/trial-package",
        unlocks: ["/court-package"],
      }),
    );
  }

  if (
    isLowReadiness(procedural?.costsReadiness) ||
    isLowReadiness(procedural?.assessmentReadiness)
  ) {
    actions.push(
      buildAction({
        kind: "prepare-settlement",
        title: "Review costs and assessment readiness",
        explanation:
          "Costs or assessment readiness is low. Review settlement exposure, conduct risks, costs entitlement, or assessment steps.",
        priority: "medium",
        route: "/litigation-strategy",
        unlocks: ["/settlement-conference"],
      }),
    );
  }

  for (const nextAction of proceduralNextActionTitles(input)) {
    actions.push(
      buildAction({
        kind: "review-procedure",
        title: nextAction,
        explanation:
          "This action comes from the procedural state and should be reviewed before relying on downstream workflow outputs.",
        priority: severityFromWarning(nextAction) === "critical" ? "critical" : "high",
        route: "/case-dashboard",
        unlocks: ["/forms", "/documents", "/court-package"],
      }),
    );
  }

  return actions;
}

function buildAuthorityActions(
  input: WorkflowOrchestrationBuildInput,
): WorkflowNextAction[] {
  const actions: WorkflowNextAction[] = [];

  if (unsafeAuthorityCount(input) > 0) {
    actions.push(
      buildAction({
        kind: "review-citation-safety",
        title: "Review unsafe citations",
        explanation:
          "One or more authorities are not safe to cite or rely on until reviewed.",
        priority: "high",
        route: "/legal-principles",
        unlocks: ["/documents", "/court-package"],
      }),
    );
  }

  if (wrongJurisdictionAuthorityCount(input) > 0) {
    actions.push(
      buildAction({
        kind: "review-jurisdiction-fit",
        title: "Review jurisdiction fit",
        explanation:
          "One or more authorities may be from the wrong jurisdiction. Prefer binding or directly applicable authority.",
        priority: "medium",
        route: "/legal-principles",
        unlocks: ["/documents", "/court-package"],
      }),
    );
  }

  if (hasAuthorityWarnings(input)) {
    actions.push(
      buildAction({
        kind: "review-authorities",
        title: "Review authority warnings",
        explanation:
          "Authority warnings should be resolved before relying on legal analysis in final documents.",
        priority: "medium",
        route: "/legal-principles",
        unlocks: ["/documents", "/court-package"],
      }),
    );
  }

  return actions;
}

function buildContradictionActions(
  input: WorkflowOrchestrationBuildInput,
): WorkflowNextAction[] {
  const actions: WorkflowNextAction[] = [];

  if (
    contradictionCritical(input) > 0 ||
    contradictionHigh(input) > 0 ||
    hasContradictionWarnings(input)
  ) {
    actions.push(
      buildAction({
        kind: "resolve-contradictions",
        title: "Resolve contradictions",
        explanation:
          "Contradictions can weaken pleadings, affidavits, timelines, settlement materials, or trial preparation.",
        priority: contradictionCritical(input) > 0 ? "critical" : "high",
        route: "/litigation-strategy",
        unlocks: ["/documents", "/court-package", "/trial-package"],
      }),
    );
  }

  return actions;
}

function buildCredibilityActions(
  input: WorkflowOrchestrationBuildInput,
): WorkflowNextAction[] {
  const actions: WorkflowNextAction[] = [];
  const level = credibilityLevel(input);

  if (level === "critical" || level === "serious" || hasCredibilityWarnings(input)) {
    actions.push(
      buildAction({
        kind: "review-credibility",
        title: "Review credibility risk",
        explanation:
          "Credibility findings may affect judge concerns, cross-examination risk, settlement pressure, and document readiness.",
        priority: level === "critical" ? "critical" : "high",
        route: "/litigation-strategy",
        unlocks: ["/documents", "/court-package", "/trial-package"],
      }),
    );
  }

  for (const nextAction of input.credibility?.nextActions || []) {
    actions.push(
      buildAction({
        kind: "review-credibility",
        title: nextAction,
        explanation:
          "This action comes from the credibility analysis and should be addressed before relying on final litigation materials.",
        priority: level === "critical" || level === "serious" ? "high" : "medium",
        route: "/litigation-strategy",
        unlocks: ["/documents", "/court-package"],
      }),
    );
  }

  return actions;
}

function buildNextActions(
  input: WorkflowOrchestrationBuildInput,
  blockers: WorkflowBlocker[],
  recommendedRoute: WorkflowRoute,
): WorkflowNextAction[] {
  const actions: WorkflowNextAction[] = [];

  if (input.courtPath === "unknown") {
    actions.push(
      buildAction({
        kind: "confirm-court-path",
        title: "Confirm court path",
        explanation:
          "Confirm the correct court, tribunal, or process before forms or documents are generated.",
        priority: "high",
        route: "/builder",
        unlocks: ["/forms", "/documents", "/court-package"],
      }),
    );
  }

  if (input.stage === "not-sure") {
    actions.push(
      buildAction({
        kind: "confirm-stage",
        title: "Confirm procedural stage",
        explanation:
          "Confirm what has already been filed, served, scheduled, or ordered.",
        priority: "high",
        route: "/builder",
        unlocks: ["/forms", "/documents", "/court-package"],
      }),
    );
  }

  if (!input.hasDominantClaim) {
    actions.push(
      buildAction({
        kind: "review-claims",
        title: "Confirm dominant claim theory",
        explanation:
          "The system needs a dominant legal theory before court documents or forms should be generated.",
        priority: "high",
        route: "/builder",
        unlocks: ["/documents", "/forms", "/litigation-strategy"],
      }),
    );
  }

  actions.push(...buildLegalReasoningActions(input));
  actions.push(...buildProceduralActions(input));
  actions.push(...buildProofActions(input));
  actions.push(...buildAuthorityActions(input));
  actions.push(...buildContradictionActions(input));
  actions.push(...buildCredibilityActions(input));

  if (!input.hasEvidence || (input.evidenceWarnings || []).length > 0) {
    actions.push(
      buildAction({
        kind: "add-evidence",
        title: "Add or organize evidence",
        explanation:
          "Evidence should be connected to facts, claims, timeline, proof requirements, burden issues, and reasoning-profile priorities.",
        priority: "high",
        route: "/evidence",
        unlocks: ["/court-package", "/trial-package", "/settlement-conference"],
      }),
    );
  }

  if (!input.hasTimeline || (input.timelineWarnings || []).length > 0) {
    actions.push(
      buildAction({
        kind: "add-facts",
        title: "Build or clarify timeline",
        explanation:
          "The timeline supports chronology, causation, credibility, procedural timing, and evidence organization.",
        priority: "medium",
        route: "/builder",
        unlocks: ["/litigation-strategy", "/court-package"],
      }),
    );
  }

  if (!input.hasDamagesModel || (input.damagesWarnings || []).length > 0) {
    actions.push(
      buildAction({
        kind: "review-damages",
        title: "Review damages and remedy",
        explanation:
          "Requested remedies should be connected to proof, causation, calculation, and forum fit.",
        priority: "medium",
        route: "/litigation-strategy",
        unlocks: ["/documents", "/settlement-conference"],
      }),
    );
  }

  if ((input.knowledgeWarnings || []).length > 0) {
    actions.push(
      buildAction({
        kind: "review-legal-knowledge",
        title: "Review legal authority warnings",
        explanation:
          "Legal sources should be verified before being relied on in documents or guidance.",
        priority: "medium",
        route: "/legal-principles",
        unlocks: ["/documents", "/court-package"],
      }),
    );
  }

  if (actions.length === 0) {
    actions.push(
      buildAction({
        kind: "prepare-forms",
        title: "Prepare next court forms",
        explanation:
          "Core workflow gates, legal reasoning readiness, procedural readiness, and proof-readiness checks are satisfied enough to review recommended forms.",
        priority: "medium",
        route: recommendedRoute,
        unlocks: ["/documents", "/court-package"],
      }),
    );
  }

  return actions;
}

function buildReadiness(
  input: WorkflowOrchestrationBuildInput,
  blockers: WorkflowBlocker[],
  recommendedRoute: WorkflowRoute,
): WorkflowReadinessState {
  const intakeReadiness: CaseConfidence =
    input.courtPath !== "unknown" && input.stage !== "not-sure" ? "medium" : "low";

  const claimReadiness: CaseConfidence = input.hasDominantClaim ? "medium" : "low";
  const procedureReadiness: CaseConfidence = proceduralOverallReadiness(input);
  const legalReasoningReady = legalReasoningReadiness(input);

  const evidenceReadiness: CaseConfidence =
    input.hasEvidence &&
    (input.evidenceWarnings || []).length === 0 &&
    missingElementProofCount(input) === 0 &&
    contradictedElementProofCount(input) === 0
      ? "medium"
      : "low";

  const proofReady = proofReadiness(input);
  const authorityReady = authorityReadiness(input);
  const contradictionReady = contradictionReadiness(input);
  const citationReady = citationReadiness(input);
  const jurisdictionReady = jurisdictionReadiness(input);
  const credibilityReady = credibilityReadiness(input);

  const timelineReadiness: CaseConfidence =
    input.hasTimeline && (input.timelineWarnings || []).length === 0
      ? "medium"
      : "low";

  const damagesReadiness: CaseConfidence =
    input.hasDamagesModel && (input.damagesWarnings || []).length === 0
      ? "medium"
      : "low";

  const documentReadiness: CaseConfidence = averageConfidence([
    blockers.some(
      (blocker) =>
        blocker.affectedRoutes.includes("/documents") &&
        (blocker.severity === "critical" || blocker.severity === "high"),
    )
      ? "low"
      : "medium",
    legalReasoningReady,
    procedureReadiness,
    proofReady,
    authorityReady,
    contradictionReady,
    citationReady,
    jurisdictionReady,
    credibilityReady,
    documentImpactReadiness(input),
  ]);

  return {
    overallReadiness: averageConfidence([
      intakeReadiness,
      claimReadiness,
      legalReasoningReady,
      procedureReadiness,
      input.procedural?.deadlineReadiness || "low",
      input.procedural?.serviceReadiness || "low",
      input.procedural?.filingReadiness || "low",
      input.procedural?.motionReadiness || "low",
      input.procedural?.discoveryReadiness || "low",
      input.procedural?.settlementReadiness || "low",
      input.procedural?.preTrialReadiness || "low",
      input.procedural?.trialReadiness || "low",
      input.procedural?.costsReadiness || "low",
      input.procedural?.assessmentReadiness || "low",
      evidenceReadiness,
      proofReady,
      timelineReadiness,
      damagesReadiness,
      credibilityReady,
      authorityReady,
      contradictionReady,
      citationReady,
      jurisdictionReady,
      documentReadiness,
    ]),
    intakeReadiness,
    claimReadiness,

    procedureReadiness,
    proceduralDeadlineReadiness: input.procedural?.deadlineReadiness,
    proceduralComplianceReadiness: input.procedural?.complianceReadiness,
    proceduralMotionReadiness: input.procedural?.motionReadiness,
    proceduralDiscoveryReadiness: input.procedural?.discoveryReadiness,
    proceduralSettlementReadiness: input.procedural?.settlementReadiness,
    proceduralTrialReadiness:
      input.procedural?.trialReadiness || input.procedural?.preTrialReadiness,
    proceduralCostsReadiness: input.procedural?.costsReadiness,
    proceduralAssessmentReadiness: input.procedural?.assessmentReadiness,

    legalReasoningReadiness: legalReasoningReady,
    evidenceReadiness,
    proofReadiness: proofReady,
    timelineReadiness,
    damagesReadiness,
    credibilityReadiness: credibilityReady,
    authorityReadiness: authorityReady,
    contradictionReadiness: contradictionReady,
    citationReadiness: citationReady,
    jurisdictionReadiness: jurisdictionReady,
    documentReadiness,
    blockers: blockers.map((blocker) => blocker.title),
    recommendedRoute,
  };
}

export function buildWorkflowOrchestration(
  input: WorkflowOrchestrationBuildInput,
): WorkflowOrchestrationBuildOutput {
  const timestamp = nowIso();

  const gates = buildGates(input);
  const blockers = buildBlockers(input, gates);
  const recommendedRoute = chooseRecommendedRoute(input, blockers);
  const routeAssessments = buildRouteAssessments(input, blockers);
  const nextActions = buildNextActions(input, blockers, recommendedRoute);
  const readiness = buildReadiness(input, blockers, recommendedRoute);

  const warnings = uniqueStrings([
    ...blockers.map((blocker) => blocker.title),
    ...(input.claimWarnings || []),
    ...legalReasoningWarnings(input),
    ...(input.legalReasoning?.blockedObjects || []),
    ...(input.legalReasoning?.proceduralWatchPoints || []),
    ...(input.legalReasoning?.judicialConcerns || []),
    ...proceduralWarnings(input),
    ...(input.evidenceWarnings || []),
    ...(input.timelineWarnings || []),
    ...(input.damagesWarnings || []),
    ...(input.credibilityWarnings || []),
    ...(input.credibility?.warnings || []),
    ...(input.authorityWarnings || []),
    ...(input.authority?.authorityWarnings || []),
    ...(input.contradictionWarnings || []),
    ...(input.contradictions?.warnings || []),
    ...(input.knowledgeWarnings || []),
    ...(input.proof?.proofWeaknesses || []),
    ...proceduralBlockerTitles(input),
    ...proceduralNextActionTitles(input),
  ]);

  const confidence = averageConfidence([
    readiness.intakeReadiness,
    readiness.claimReadiness,
    readiness.legalReasoningReadiness || "low",
    readiness.procedureReadiness,
    readiness.proceduralDeadlineReadiness || "low",
    readiness.proceduralComplianceReadiness || "low",
    readiness.proceduralMotionReadiness || "low",
    readiness.proceduralDiscoveryReadiness || "low",
    readiness.proceduralSettlementReadiness || "low",
    readiness.proceduralTrialReadiness || "low",
    readiness.proceduralCostsReadiness || "low",
    readiness.proceduralAssessmentReadiness || "low",
    readiness.evidenceReadiness,
    readiness.proofReadiness || "low",
    readiness.timelineReadiness,
    readiness.damagesReadiness,
    readiness.credibilityReadiness,
    readiness.authorityReadiness || "low",
    readiness.contradictionReadiness || "low",
    readiness.citationReadiness || "low",
    readiness.jurisdictionReadiness || "low",
    readiness.documentReadiness,
  ]);

  const model: WorkflowOrchestrationModel = {
    id: createId("workflow_orchestration"),
    version: "1.2.0",
    createdAt: timestamp,
    updatedAt: timestamp,

    caseId: input.caseId,

    courtPath: input.courtPath,
    province: input.province,
    stage: input.stage,

    gates,
    blockers,
    nextActions,
    routeAssessments,

    readiness,

    warnings,
    confidence,
  };

  return {
    model,
    warnings,
  };
}