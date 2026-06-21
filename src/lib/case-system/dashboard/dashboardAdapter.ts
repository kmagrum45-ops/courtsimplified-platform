import type {
  DashboardMasterView,
  DashboardRisk,
  DashboardWorkflowStep,
} from "../dashboardEngine";

type AssemblyConfidence = "very-low" | "low" | "medium" | "high" | "very-high";

type AssemblySeverity = "critical" | "high" | "medium" | "low" | "info";

type AssemblyRouteAssessment = {
  route: string;
  available: boolean;
  confidence: AssemblyConfidence;
  reason: string;
};

type AssemblyWorkflowAction = {
  title: string;
};

type AssemblyProceduralRisk = {
  id?: string;
  type?: string;
  severity: AssemblySeverity;
  title: string;
  explanation: string;
  suggestedFix: string;
};

type AssemblyProceduralDeadline = {
  title: string;
  dateRaw?: string;
  dateNormalized?: string;
  riskLevel?: AssemblySeverity;
};

type CaseSystemAssemblyLike = {
  warnings: string[];

  claimTheory: unknown;
  timeline: unknown;
  evidenceGraph: unknown;

  proceduralState?: {
    warnings: string[];
    risks: AssemblyProceduralRisk[];
    deadlines: AssemblyProceduralDeadline[];
    readiness: {
      overallReadiness: AssemblyConfidence;
      deadlineReadiness: AssemblyConfidence;
      serviceReadiness: AssemblyConfidence;
      filingReadiness: AssemblyConfidence;
      motionReadiness?: AssemblyConfidence;
      discoveryReadiness?: AssemblyConfidence;
      settlementReadiness?: AssemblyConfidence;
      preTrialReadiness?: AssemblyConfidence;
      costsReadiness?: AssemblyConfidence;
      assessmentReadiness?: AssemblyConfidence;
      blockers: string[];
      nextActions: string[];
    };
  };

  formReadiness: {
    requiredLabels: string[];
    recommendedLabels: string[];
    missingFormInformation: string[];
    formWarnings: string[];
  };

  proofReadiness: {
    proofReadiness: AssemblyConfidence;
    proofWeaknesses: string[];
    proofStrengths: string[];
    proofNextActions: string[];
    missingElementProofCount: number;
    contradictedElementProofCount: number;
  };

  authorityReadiness: {
    authorityReadiness: AssemblyConfidence;
    strongestAuthorityCount: number;
    unsafeAuthorityCount: number;
    wrongJurisdictionAuthorityCount: number;
    warnings: string[];
    summary: string;
  };

  contradictionReadiness: {
    contradictionReadiness: AssemblyConfidence;
    criticalFindings: number;
    highFindings: number;
    warnings: string[];
    summary: string;
  };

  credibilityIntelligence: {
    credibilityReadiness: AssemblyConfidence;
    overallLevel: string;
    judgeConcernScore: number;
    crossExaminationRiskScore: number;
    settlementPressureScore: number;
    documentReadinessImpact: string;
    warnings: string[];
    nextActions: string[];
    summary: string;
  };

  workflow: {
    confidence: AssemblyConfidence;
    warnings: string[];
    blockers: unknown[];
    routeAssessments: AssemblyRouteAssessment[];
    nextActions: AssemblyWorkflowAction[];
    readiness: {
      blockers: string[];
    };
  };
};

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function scoreFromConfidence(value: AssemblyConfidence | undefined): number {
  if (value === "very-high") return 95;
  if (value === "high") return 80;
  if (value === "medium") return 60;
  if (value === "low") return 35;
  if (value === "very-low") return 15;
  return 0;
}

function readinessLevelFromScore(score: number): string {
  if (score >= 85) return "ready";
  if (score >= 70) return "near-ready";
  if (score >= 45) return "developing";
  if (score >= 20) return "early";
  return "not-ready";
}

function labelFromRoute(route: string): string {
  const cleaned = route.replace("/", "").split("-").join(" ");
  return cleaned.length > 0 ? cleaned : "Dashboard";
}

function makeRisk(args: DashboardRisk): DashboardRisk {
  return args;
}

function proceduralReadinessLabels(assembly: CaseSystemAssemblyLike): string[] {
  const readiness = assembly.proceduralState?.readiness;

  if (!readiness) return [];

  return uniqueStrings([
    `Overall procedural readiness: ${readiness.overallReadiness}.`,
    `Deadline readiness: ${readiness.deadlineReadiness}.`,
    `Service readiness: ${readiness.serviceReadiness}.`,
    `Filing readiness: ${readiness.filingReadiness}.`,
    readiness.motionReadiness ? `Motion readiness: ${readiness.motionReadiness}.` : "",
    readiness.discoveryReadiness
      ? `Discovery readiness: ${readiness.discoveryReadiness}.`
      : "",
    readiness.settlementReadiness
      ? `Settlement readiness: ${readiness.settlementReadiness}.`
      : "",
    readiness.preTrialReadiness
      ? `Pre-trial readiness: ${readiness.preTrialReadiness}.`
      : "",
    readiness.costsReadiness ? `Costs readiness: ${readiness.costsReadiness}.` : "",
    readiness.assessmentReadiness
      ? `Assessment readiness: ${readiness.assessmentReadiness}.`
      : "",
  ]);
}

function proceduralDeadlineNotes(assembly: CaseSystemAssemblyLike): string[] {
  return uniqueStrings(
    (assembly.proceduralState?.deadlines || []).map((deadline) => {
      const date = deadline.dateNormalized || deadline.dateRaw || "date not confirmed";
      return `${deadline.title} — ${date}`;
    }),
  );
}

function buildProceduralRisks(assembly: CaseSystemAssemblyLike): DashboardRisk[] {
  const proceduralRisks = assembly.proceduralState?.risks || [];

  return proceduralRisks
    .filter(
      (risk) =>
        risk.severity === "critical" ||
        risk.severity === "high" ||
        risk.severity === "medium",
    )
    .map((risk) =>
      makeRisk({
        id: risk.id || `dashboard_procedural_${risk.title}`,
        severity: risk.severity,
        title: risk.title,
        description: risk.explanation,
        source: risk.type || "procedural-state",
        suggestedFix: risk.suggestedFix,
      }),
    );
}

function buildAssemblyRisks(assembly: CaseSystemAssemblyLike): DashboardRisk[] {
  const risks: DashboardRisk[] = [...buildProceduralRisks(assembly)];

  if (assembly.proofReadiness.missingElementProofCount > 0) {
    risks.push(
      makeRisk({
        id: "dashboard_proof_missing_elements",
        severity: "high",
        title: "Missing element proof",
        description: `${assembly.proofReadiness.missingElementProofCount} required element(s) are missing proof.`,
        source: "proof-readiness",
        suggestedFix:
          "Add evidence, facts, dates, witnesses, documents, or admissions that prove the missing legal elements.",
      }),
    );
  }

  if (assembly.proofReadiness.contradictedElementProofCount > 0) {
    risks.push(
      makeRisk({
        id: "dashboard_proof_contradicted_elements",
        severity: "critical",
        title: "Contradicted element proof",
        description: `${assembly.proofReadiness.contradictedElementProofCount} required element(s) appear contradicted.`,
        source: "proof-readiness",
        suggestedFix:
          "Resolve contradicted proof before relying on pleadings, affidavits, briefs, or court packages.",
      }),
    );
  }

  if (assembly.authorityReadiness.unsafeAuthorityCount > 0) {
    risks.push(
      makeRisk({
        id: "dashboard_unsafe_authorities",
        severity: "high",
        title: "Unsafe legal authorities",
        description: `${assembly.authorityReadiness.unsafeAuthorityCount} authority source(s) are not safe to cite or rely on.`,
        source: "authority-readiness",
        suggestedFix:
          "Review citation safety and replace unsafe sources with verified, binding, or directly applicable authority.",
      }),
    );
  }

  if (assembly.authorityReadiness.wrongJurisdictionAuthorityCount > 0) {
    risks.push(
      makeRisk({
        id: "dashboard_wrong_jurisdiction_authorities",
        severity: "medium",
        title: "Wrong-jurisdiction authorities",
        description: `${assembly.authorityReadiness.wrongJurisdictionAuthorityCount} authority source(s) may be from the wrong jurisdiction.`,
        source: "authority-readiness",
        suggestedFix:
          "Prefer local, binding, federal-applicable, or directly applicable authority before using the source.",
      }),
    );
  }

  if (assembly.contradictionReadiness.criticalFindings > 0) {
    risks.push(
      makeRisk({
        id: "dashboard_critical_contradictions",
        severity: "critical",
        title: "Critical contradictions",
        description: `${assembly.contradictionReadiness.criticalFindings} critical contradiction(s) require review.`,
        source: "contradiction-readiness",
        suggestedFix:
          "Resolve critical contradictions before finalizing documents, affidavits, settlement materials, or trial materials.",
      }),
    );
  }

  if (assembly.contradictionReadiness.highFindings > 0) {
    risks.push(
      makeRisk({
        id: "dashboard_high_contradictions",
        severity: "high",
        title: "High-risk contradictions",
        description: `${assembly.contradictionReadiness.highFindings} high-risk contradiction(s) require review.`,
        source: "contradiction-readiness",
        suggestedFix:
          "Clarify inconsistent dates, amounts, locations, events, evidence, statements, or claim facts.",
      }),
    );
  }

  if (
    assembly.credibilityIntelligence.overallLevel === "serious" ||
    assembly.credibilityIntelligence.overallLevel === "critical"
  ) {
    risks.push(
      makeRisk({
        id: "dashboard_credibility_risk",
        severity:
          assembly.credibilityIntelligence.overallLevel === "critical"
            ? "critical"
            : "high",
        title: "Credibility risk",
        description:
          "Credibility analysis shows risk affecting judge concerns, cross-examination, settlement pressure, or document readiness.",
        source: "credibility-intelligence",
        suggestedFix:
          "Review credibility findings, resolve inconsistencies, strengthen proof, and narrow unsupported claims.",
      }),
    );
  }

  return risks;
}

function buildReadinessScore(assembly: CaseSystemAssemblyLike): number {
  const procedural = assembly.proceduralState?.readiness;

  const values = [
    scoreFromConfidence(procedural?.overallReadiness),
    scoreFromConfidence(procedural?.deadlineReadiness),
    scoreFromConfidence(procedural?.serviceReadiness),
    scoreFromConfidence(procedural?.filingReadiness),
    scoreFromConfidence(assembly.proofReadiness.proofReadiness),
    scoreFromConfidence(assembly.authorityReadiness.authorityReadiness),
    scoreFromConfidence(assembly.contradictionReadiness.contradictionReadiness),
    scoreFromConfidence(assembly.credibilityIntelligence.credibilityReadiness),
    scoreFromConfidence(assembly.workflow.confidence),
  ];

  const average =
    values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);

  const proceduralPenalty =
    (assembly.proceduralState?.risks || []).filter(
      (risk) => risk.severity === "critical" || risk.severity === "high",
    ).length * 4;

  return clampScore(
    Math.round(
      average -
        assembly.workflow.blockers.length * 3 -
        assembly.warnings.length -
        proceduralPenalty,
    ),
  );
}

export function buildDashboardWorkflowCardsFromAssembly(
  assembly: CaseSystemAssemblyLike,
): DashboardWorkflowStep[] {
  return assembly.workflow.routeAssessments.map(
    (route: AssemblyRouteAssessment, index: number) => ({
      key: route.route.replace("/", "") || "dashboard",
      title: labelFromRoute(route.route),
      href: route.route,
      text: route.reason,
      complete:
        route.available &&
        route.confidence !== "low" &&
        route.confidence !== "very-low",
      warning:
        !route.available ||
        route.confidence === "low" ||
        route.confidence === "very-low",
      priority: index + 1,
    }),
  );
}

export function buildDashboardMasterFromAssembly(
  assembly: CaseSystemAssemblyLike,
): DashboardMasterView {
  const risks = buildAssemblyRisks(assembly);
  const readinessScore = buildReadinessScore(assembly);

  const proceduralBlockers = assembly.proceduralState?.readiness.blockers || [];
  const proceduralNextActions =
    assembly.proceduralState?.readiness.nextActions || [];

  return {
    parties: [],
    facts: [],
    issues: [assembly.claimTheory],
    timeline: [assembly.timeline],
    evidence: [assembly.evidenceGraph],
    proofMap: [
      assembly.proofReadiness,
      assembly.authorityReadiness,
      assembly.contradictionReadiness,
      assembly.credibilityIntelligence,
      assembly.proceduralState || {},
    ],
    formNeeds: [
      ...assembly.formReadiness.requiredLabels,
      ...assembly.formReadiness.recommendedLabels,
    ],
    risks,

    aiMemory: {
      plainLanguageSummary:
        "Case intelligence has been assembled from the locked CourtSimplified architecture.",
      structuredSummary: uniqueStrings([
        ...assembly.warnings,
        ...(assembly.proceduralState?.warnings || []),
      ]).join("\n"),
      userGoals: [],
      importantFacts: [],
      unresolvedQuestions: uniqueStrings([
        ...assembly.formReadiness.missingFormInformation,
        ...assembly.workflow.readiness.blockers,
        ...proceduralBlockers,
      ]),
      warningsForAi: uniqueStrings([
        ...assembly.warnings,
        ...(assembly.proceduralState?.warnings || []),
      ]),
      lastUpdatedByEngine: "caseSystemAssembly-v1.3.0",
    },

    strategy: {
      strengths: uniqueStrings([
        ...assembly.proofReadiness.proofStrengths,
        assembly.authorityReadiness.strongestAuthorityCount > 0
          ? `${assembly.authorityReadiness.strongestAuthorityCount} strong authority source(s) identified.`
          : "",
      ]),
      weaknesses: uniqueStrings([
        ...assembly.proofReadiness.proofWeaknesses,
        ...assembly.authorityReadiness.warnings,
        ...assembly.contradictionReadiness.warnings,
        ...assembly.credibilityIntelligence.warnings,
        ...(assembly.proceduralState?.warnings || []),
      ]),
      likelyOtherSideArguments: assembly.proofReadiness.proofWeaknesses,
      likelyJudgeConcerns: uniqueStrings([
        ...assembly.contradictionReadiness.warnings,
        ...assembly.credibilityIntelligence.warnings,
      ]),
      suggestedWordingImprovements: assembly.credibilityIntelligence.nextActions,
      settlementConsiderations: uniqueStrings([
        assembly.credibilityIntelligence.settlementPressureScore > 0
          ? `Settlement pressure score: ${assembly.credibilityIntelligence.settlementPressureScore}.`
          : "",
      ]),
      nextStrategicSteps: uniqueStrings([
        ...assembly.proofReadiness.proofNextActions,
        ...assembly.credibilityIntelligence.nextActions,
        ...proceduralNextActions,
        ...assembly.workflow.nextActions.map(
          (action: AssemblyWorkflowAction) => action.title,
        ),
      ]),
    },

    proceduralIntelligence: {
      likelyForumIssues: [],
      limitationConcerns: proceduralDeadlineNotes(assembly),
      urgencyConcerns: risks
        .filter((risk) => risk.severity === "critical" || risk.severity === "high")
        .map((risk) => risk.title || "")
        .filter(Boolean),
      serviceConcerns: proceduralBlockers.filter((blocker) =>
        blocker.toLowerCase().includes("service"),
      ),
      disclosureConcerns: proceduralBlockers.filter((blocker) =>
        blocker.toLowerCase().includes("disclosure"),
      ),
      pathwayWarnings: uniqueStrings([
        ...assembly.workflow.warnings,
        ...(assembly.proceduralState?.warnings || []),
        ...proceduralReadinessLabels(assembly),
      ]),
      nextProceduralFocus: uniqueStrings([
        ...proceduralNextActions,
        ...assembly.workflow.nextActions.map(
          (action: AssemblyWorkflowAction) => action.title,
        ),
      ]),
    },

    courtPackage: {
      packageSections: [],
      exhibitOrder: [assembly.evidenceGraph],
      missingPackageItems: uniqueStrings([
        ...assembly.formReadiness.missingFormInformation,
        ...assembly.workflow.readiness.blockers,
        ...proceduralBlockers,
      ]),
      filingNotes: uniqueStrings([
        ...assembly.formReadiness.formWarnings,
        ...proceduralDeadlineNotes(assembly),
      ]),
      serviceNotes: proceduralBlockers.filter((blocker) =>
        blocker.toLowerCase().includes("service"),
      ),
      exportNotes: uniqueStrings([
        `Document readiness impact: ${assembly.credibilityIntelligence.documentReadinessImpact}.`,
        `Judge concern score: ${assembly.credibilityIntelligence.judgeConcernScore}.`,
        `Cross-examination risk score: ${assembly.credibilityIntelligence.crossExaminationRiskScore}.`,
        ...proceduralReadinessLabels(assembly),
      ]),
    },

    readiness: {
      level: readinessLevelFromScore(readinessScore),
      score: readinessScore,
      reasons: uniqueStrings([
        assembly.authorityReadiness.summary,
        assembly.contradictionReadiness.summary,
        assembly.credibilityIntelligence.summary,
        ...proceduralReadinessLabels(assembly),
      ]),
      blockers: uniqueStrings([
        ...assembly.workflow.readiness.blockers,
        ...proceduralBlockers,
      ]),
    },
  };
}