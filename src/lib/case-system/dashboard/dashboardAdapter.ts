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
    elementsWithNothingRecorded: string[];
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

// clampScore() and scoreFromConfidence() removed with buildReadinessScore().
//
// scoreFromConfidence() was the mechanism that turned an ordinal grade into a
// number, and it is the reason this formula went unnoticed: a search for
// "score" formulas found the other four, and this one was reached through a
// field named "confidence". Nothing converts a confidence ladder into a
// number in this file any more, and nothing should.

// readinessLevelFromScore() removed with buildReadinessScore(): an ordinal
// ladder derived from a case score is the same grading as the score.

function labelFromRoute(route: string): string {
  const cleaned = route.replace("/", "").split("-").join(" ");
  return cleaned.length > 0 ? cleaned : "Dashboard";
}

function makeRisk(args: DashboardRisk): DashboardRisk {
  return args;
}

/*
 * proceduralReadinessLabels() was here and it is deleted, not renamed.
 *
 * It emitted TEN user-facing strings, not the one that was first reported:
 *
 *   "Overall procedural readiness: medium."   "Motion readiness: low."
 *   "Deadline readiness: low."                "Discovery readiness: low."
 *   "Service readiness: high."                "Settlement readiness: low."
 *   "Filing readiness: medium."               "Pre-trial readiness: low."
 *                                             "Costs readiness: low."
 *                                             "Assessment readiness: low."
 *
 * Every value is a CaseConfidence — "very-low" | "low" | "medium" | "high" |
 * "very-high" — so each line is an ordinal grade of the user's case printed
 * as a sentence, and they reached the user through pathwayWarnings, exportNotes
 * and readiness.reasons.
 *
 * A comment at the exportNotes call site argued these were kept because they
 * state "which procedural steps are ready, which is a fact about the case file
 * rather than a grading of the case". That was wrong: "ready" here is not a
 * record status, it is a confidence level, and the comment is the reason ten
 * grades survived a sweep that was looking for exactly this shape.
 *
 * The factual replacement already existed on the same object and is used
 * below: blockers and nextActions, which say what is outstanding and what to
 * do, item by item, without ranking anything.
 */
function proceduralOutstandingNotes(assembly: CaseSystemAssemblyLike): string[] {
  const readiness = assembly.proceduralState?.readiness;

  if (!readiness) return [];

  return uniqueStrings([...(readiness.blockers || []), ...(readiness.nextActions || [])]);
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

// buildReadinessScore() removed entirely (Session 48).
//
// An earlier pass deleted only its risk PENALTY, on the grounds that CLAUDE.md
// section 3 forbids a readiness score that weights risk. That was half the
// problem. The score itself averaged nine ordinal grades -- including
// proofReadiness, credibilityReadiness and contradictionReadiness, which grade
// the merits -- and fed a number the user saw. It survived the earlier removal
// of the four score formulas purely because it was spelled "confidence"
// rather than "score".
//
// Nothing replaces it. `readiness.reasons` and `readiness.blockers` already
// state, factually, what is and is not recorded; the dashboard now counts
// outstanding items instead of grading them.

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
      // `strengths` stood here, built from proofStrengths plus "N strong
      // authority source(s) identified." Nothing rendered it, and both halves
      // grade the case rather than describe the record.
      //
      // `weaknesses` is renamed to `proofGaps` — the name the dashboard's own
      // section heading already used for it. Its contents were already factual:
      // which elements have nothing recorded, plus warnings. The rename brings
      // the field into line with both what it holds and what the UI calls it.
      //
      // likelyOtherSideArguments and likelyJudgeConcerns were hardcoded empty
      // here with a comment explaining why they were never generated. The
      // fields are now off StrategyProfile entirely.
      proofGaps: uniqueStrings([
        ...assembly.proofReadiness.elementsWithNothingRecorded,
        ...assembly.authorityReadiness.warnings,
        ...assembly.contradictionReadiness.warnings,
        ...assembly.credibilityIntelligence.warnings,
        ...(assembly.proceduralState?.warnings || []),
      ]),
      suggestedWordingImprovements: assembly.credibilityIntelligence.nextActions,
      // `settlementConsiderations` was emitted here, and it is gone from
      // DashboardMaster entirely — see the note on the type. It carried
      // `Settlement pressure score: ${n}.` as literal user-facing text, was
      // emptied to `[]`, and has now lost its slot as well.
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
        ...proceduralOutstandingNotes(assembly),
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
      // Three credibilityIntelligence strings were removed here (Session 48).
      // All three came from credibilityRiskEngine and graded the user's case:
      //   `Judge concern score: ${judgeConcernScore}`        -- a prediction
      //     about a judge, the exact category d1fa87c was written to remove.
      //   `Cross-examination risk score: ${...RiskScore}`    -- a risk score.
      //   `Document readiness impact: ${...}`                -- a severity
      //     grading ("none" | "minor" | "moderate" | "major" | "severe").
      // The first two were the ones flagged; the third is identical in kind
      // and came from the same object, so removing only the named two would
      // have left the same defect behind under a different label.
      //
      // They rendered nowhere -- exportNotes is parsed into the dashboard
      // model (dashboardEngine.ts) and typed (types/case.ts), but the only
      // .tsx reference sets it to [] -- so this removes latent content, not
      // anything a user was seeing. Latent is not the same as harmless: it
      // is one `.map()` away from being displayed.
      //
      // exportNotes and its type are KEPT, now carrying the outstanding
      // procedural items rather than ten confidence grades. See the note on
      // proceduralOutstandingNotes.
      exportNotes: uniqueStrings([...proceduralOutstandingNotes(assembly)]),
    },

    readiness: {
      reasons: uniqueStrings([
        assembly.authorityReadiness.summary,
        assembly.contradictionReadiness.summary,
        assembly.credibilityIntelligence.summary,
        ...proceduralOutstandingNotes(assembly),
      ]),
      blockers: uniqueStrings([
        ...assembly.workflow.readiness.blockers,
        ...proceduralBlockers,
      ]),
    },
  };
}