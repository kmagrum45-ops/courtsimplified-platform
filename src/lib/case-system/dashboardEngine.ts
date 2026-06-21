import type { CaseFile, CourtSimplifiedCasePath } from "./types/case";

import {
  buildDashboardMasterFromAssembly,
  buildDashboardWorkflowCardsFromAssembly,
} from "./dashboard/dashboardAdapter";

export type DashboardCourtPath =
  | CourtSimplifiedCasePath
  | "family"
  | "small-claims"
  | "civil"
  | "unknown";

export type DashboardRisk = {
  id?: string;
  severity?: string;
  title?: string;
  description?: string;
  source?: string;
  suggestedFix?: string;
};

export type DashboardAuthorityReadiness = {
  authorityReadiness: string;
  strongestAuthorityCount: number;
  unsafeAuthorityCount: number;
  wrongJurisdictionAuthorityCount: number;
  warnings: string[];
  summary: string;
};

export type DashboardContradictionReadiness = {
  contradictionReadiness: string;
  criticalFindings: number;
  highFindings: number;
  warnings: string[];
  summary: string;
};

export type DashboardCredibilityIntelligence = {
  credibilityReadiness: string;
  overallLevel: string;
  judgeConcernScore: number;
  crossExaminationRiskScore: number;
  settlementPressureScore: number;
  documentReadinessImpact: string;
  warnings: string[];
  nextActions: string[];
  summary: string;
};

export type DashboardMasterView = {
  parties: unknown[];
  facts: unknown[];
  issues: unknown[];
  timeline: unknown[];
  evidence: unknown[];
  proofMap: unknown[];
  formNeeds: unknown[];
  risks: DashboardRisk[];

  authorityReadiness?: DashboardAuthorityReadiness;
  contradictionReadiness?: DashboardContradictionReadiness;
  credibilityIntelligence?: DashboardCredibilityIntelligence;

  aiMemory: {
    plainLanguageSummary: string;
    structuredSummary: string;
    userGoals: string[];
    importantFacts: string[];
    unresolvedQuestions: string[];
    warningsForAi: string[];
    lastUpdatedByEngine: string;
  };

  strategy: {
    strengths: string[];
    weaknesses: string[];
    likelyOtherSideArguments: string[];
    likelyJudgeConcerns: string[];
    suggestedWordingImprovements: string[];
    settlementConsiderations: string[];
    nextStrategicSteps: string[];
  };

  proceduralIntelligence: {
    likelyForumIssues: string[];
    limitationConcerns: string[];
    urgencyConcerns: string[];
    serviceConcerns: string[];
    disclosureConcerns: string[];
    pathwayWarnings: string[];
    nextProceduralFocus: string[];
  };

  courtPackage: {
    packageSections: unknown[];
    exhibitOrder: unknown[];
    missingPackageItems: string[];
    filingNotes: string[];
    serviceNotes: string[];
    exportNotes: string[];
  };

  readiness: {
    level: string;
    score: number;
    reasons: string[];
    blockers: string[];
  };
};

export type DashboardCaseShell = {
  id: string;
  title: string;
  court_path: DashboardCourtPath;
  status: string;
  current_stage: string | null;
  created_at?: string;
  updated_at?: string;
  master_result?: unknown;
};

export type DashboardWorkflowStep = {
  key: string;
  title: string;
  href: string;
  text: string;
  complete: boolean;
  warning: boolean;
  priority: number;
};

export type DashboardNextAction = {
  title: string;
  text: string;
  href: string;
};

export type DashboardSummary = {
  master: DashboardMasterView;
  highRisks: DashboardRisk[];
  masterHasData: boolean;
  systemScore: number;
  readinessScore: number;
  readinessLevel: string;
  operationalWarnings: string[];
  nextAction: DashboardNextAction;
  workflowCards: DashboardWorkflowStep[];
};

type DashboardAssemblyAdapterInput = Parameters<
  typeof buildDashboardMasterFromAssembly
>[0];

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function isAssemblyLike(value: unknown): value is DashboardAssemblyAdapterInput {
  const object = asObject(value);

  return Boolean(
    object.warnings &&
      object.claimTheory &&
      object.timeline &&
      object.evidenceGraph &&
      object.formReadiness &&
      object.proofReadiness &&
      object.authorityReadiness &&
      object.contradictionReadiness &&
      object.credibilityIntelligence &&
      object.workflow,
  );
}

function findAssemblyCandidate(
  value: unknown,
): DashboardAssemblyAdapterInput | undefined {
  const root = asObject(value);
  const persistedRecord = asObject(root.persistedRecord);
  const caseContext = asObject(root.caseContext || persistedRecord.case_context);

  const candidates: unknown[] = [
    root.assembly,
    root.caseSystemAssembly,
    root.case_system_assembly,
    root.caseSystemAssemblyModel,
    root.case_system_assembly_model,
    root.masterAssembly,
    root.master_assembly,
    caseContext.assembly,
    caseContext.caseSystemAssembly,
    caseContext.case_system_assembly,
    persistedRecord.assembly,
    persistedRecord.caseSystemAssembly,
    persistedRecord.case_system_assembly,
    root,
  ];

  return candidates.find(isAssemblyLike);
}

function extractAuthorityReadiness(
  value: unknown,
): DashboardAuthorityReadiness | undefined {
  const authority = asObject(value);

  if (Object.keys(authority).length === 0) return undefined;

  return {
    authorityReadiness: safeString(authority.authorityReadiness),
    strongestAuthorityCount: safeNumber(authority.strongestAuthorityCount),
    unsafeAuthorityCount: safeNumber(authority.unsafeAuthorityCount),
    wrongJurisdictionAuthorityCount: safeNumber(
      authority.wrongJurisdictionAuthorityCount,
    ),
    warnings: asStringArray(authority.warnings),
    summary: safeString(authority.summary),
  };
}

function extractContradictionReadiness(
  value: unknown,
): DashboardContradictionReadiness | undefined {
  const contradiction = asObject(value);

  if (Object.keys(contradiction).length === 0) return undefined;

  return {
    contradictionReadiness: safeString(contradiction.contradictionReadiness),
    criticalFindings: safeNumber(contradiction.criticalFindings),
    highFindings: safeNumber(contradiction.highFindings),
    warnings: asStringArray(contradiction.warnings),
    summary: safeString(contradiction.summary),
  };
}

function extractCredibilityIntelligence(
  value: unknown,
): DashboardCredibilityIntelligence | undefined {
  const credibility = asObject(value);

  if (Object.keys(credibility).length === 0) return undefined;

  return {
    credibilityReadiness: safeString(credibility.credibilityReadiness),
    overallLevel: safeString(credibility.overallLevel),
    judgeConcernScore: safeNumber(credibility.judgeConcernScore),
    crossExaminationRiskScore: safeNumber(
      credibility.crossExaminationRiskScore,
    ),
    settlementPressureScore: safeNumber(credibility.settlementPressureScore),
    documentReadinessImpact: safeString(credibility.documentReadinessImpact),
    warnings: asStringArray(credibility.warnings),
    nextActions: asStringArray(credibility.nextActions),
    summary: safeString(credibility.summary),
  };
}

export function labelDashboardPath(path: DashboardCourtPath): string {
  if (path === "small-claims") return "Small Claims";
  if (path === "family") return "Family";
  if (path === "civil") return "Civil";
  if (path === "tribunal") return "Tribunal";
  if (path === "ltb") return "Landlord and Tenant Board";
  if (path === "immigration") return "Immigration";
  if (path === "criminal-related") return "Criminal-related";
  return "Unknown";
}

export function buildDashboardWorkflowHref(
  route: string,
  caseFile: Pick<DashboardCaseShell, "id" | "court_path">,
): string {
  const params = new URLSearchParams();

  params.set("caseId", caseFile.id);

  if (caseFile.court_path && caseFile.court_path !== "unknown") {
    params.set("path", String(caseFile.court_path));
  }

  return `${route}?${params.toString()}`;
}

export function extractDashboardMaster(value: unknown): DashboardMasterView {
  const assemblyCandidate = findAssemblyCandidate(value);

  if (assemblyCandidate) {
    const master = buildDashboardMasterFromAssembly(assemblyCandidate);

    return {
      ...master,
      authorityReadiness: extractAuthorityReadiness(
        assemblyCandidate.authorityReadiness,
      ),
      contradictionReadiness: extractContradictionReadiness(
        assemblyCandidate.contradictionReadiness,
      ),
      credibilityIntelligence: extractCredibilityIntelligence(
        assemblyCandidate.credibilityIntelligence,
      ),
    };
  }

  const root = asObject(value);
  const persistedRecord = asObject(root.persistedRecord);
  const caseContext = asObject(root.caseContext || persistedRecord.case_context);

  const masterCaseFile = asObject(
    root.masterCaseFile ||
      root.master_case_file ||
      caseContext.masterCaseFile ||
      caseContext.master_case_file ||
      root,
  );

  const strategy = asObject(masterCaseFile.strategy);
  const procedure = asObject(masterCaseFile.proceduralIntelligence);
  const readiness = asObject(masterCaseFile.readiness);
  const aiMemory = asObject(masterCaseFile.aiMemory);
  const courtPackage = asObject(masterCaseFile.courtPackage);

  return {
    parties: asArray(masterCaseFile.parties),
    facts: asArray(masterCaseFile.facts),
    issues: asArray(masterCaseFile.issues),
    timeline: asArray(masterCaseFile.timeline),
    evidence: asArray(masterCaseFile.evidence),
    proofMap: asArray(masterCaseFile.proofMap),
    formNeeds: asArray(masterCaseFile.formNeeds),
    risks: asArray(masterCaseFile.risks) as DashboardRisk[],

    authorityReadiness: extractAuthorityReadiness(
      masterCaseFile.authorityReadiness,
    ),
    contradictionReadiness: extractContradictionReadiness(
      masterCaseFile.contradictionReadiness,
    ),
    credibilityIntelligence: extractCredibilityIntelligence(
      masterCaseFile.credibilityIntelligence,
    ),

    aiMemory: {
      plainLanguageSummary:
        typeof aiMemory.plainLanguageSummary === "string"
          ? aiMemory.plainLanguageSummary
          : "",
      structuredSummary:
        typeof aiMemory.structuredSummary === "string"
          ? aiMemory.structuredSummary
          : "",
      userGoals: asStringArray(aiMemory.userGoals),
      importantFacts: asStringArray(aiMemory.importantFacts),
      unresolvedQuestions: asStringArray(aiMemory.unresolvedQuestions),
      warningsForAi: asStringArray(aiMemory.warningsForAi),
      lastUpdatedByEngine:
        typeof aiMemory.lastUpdatedByEngine === "string"
          ? aiMemory.lastUpdatedByEngine
          : "",
    },

    strategy: {
      strengths: asStringArray(strategy.strengths),
      weaknesses: asStringArray(strategy.weaknesses),
      likelyOtherSideArguments: asStringArray(strategy.likelyOtherSideArguments),
      likelyJudgeConcerns: asStringArray(strategy.likelyJudgeConcerns),
      suggestedWordingImprovements: asStringArray(
        strategy.suggestedWordingImprovements,
      ),
      settlementConsiderations: asStringArray(strategy.settlementConsiderations),
      nextStrategicSteps: asStringArray(strategy.nextStrategicSteps),
    },

    proceduralIntelligence: {
      likelyForumIssues: asStringArray(procedure.likelyForumIssues),
      limitationConcerns: asStringArray(procedure.limitationConcerns),
      urgencyConcerns: asStringArray(procedure.urgencyConcerns),
      serviceConcerns: asStringArray(procedure.serviceConcerns),
      disclosureConcerns: asStringArray(procedure.disclosureConcerns),
      pathwayWarnings: asStringArray(procedure.pathwayWarnings),
      nextProceduralFocus: asStringArray(procedure.nextProceduralFocus),
    },

    courtPackage: {
      packageSections: asArray(courtPackage.packageSections),
      exhibitOrder: asArray(courtPackage.exhibitOrder),
      missingPackageItems: asStringArray(courtPackage.missingPackageItems),
      filingNotes: asStringArray(courtPackage.filingNotes),
      serviceNotes: asStringArray(courtPackage.serviceNotes),
      exportNotes: asStringArray(courtPackage.exportNotes),
    },

    readiness: {
      level: typeof readiness.level === "string" ? readiness.level : "not-ready",
      score: safeNumber(readiness.score),
      reasons: asStringArray(readiness.reasons),
      blockers: asStringArray(readiness.blockers),
    },
  };
}

export function extractDashboardMasterFromCaseFile(
  caseFile: CaseFile,
): DashboardMasterView {
  return extractDashboardMaster({
    masterCaseFile: caseFile,
  });
}

export function hasDashboardMasterData(master: DashboardMasterView): boolean {
  return (
    master.parties.length > 0 ||
    master.facts.length > 0 ||
    master.issues.length > 0 ||
    master.timeline.length > 0 ||
    master.evidence.length > 0 ||
    master.proofMap.length > 0 ||
    master.formNeeds.length > 0 ||
    master.risks.length > 0 ||
    master.readiness.score > 0 ||
    Boolean(master.aiMemory.plainLanguageSummary) ||
    Boolean(master.aiMemory.structuredSummary)
  );
}

export function calculateDashboardSystemScore(master: DashboardMasterView): number {
  let score = 0;

  if (master.parties.length > 0) score += 10;
  if (master.facts.length > 0) score += 15;
  if (master.issues.length > 0) score += 10;
  if (master.timeline.length > 0) score += 10;
  if (master.evidence.length > 0) score += 15;
  if (master.proofMap.length > 0) score += 15;
  if (master.formNeeds.length > 0) score += 10;
  if (master.strategy.weaknesses.length > 0) score += 5;
  if (master.strategy.likelyOtherSideArguments.length > 0) score += 5;
  if (master.strategy.likelyJudgeConcerns.length > 0) score += 5;
  if (master.courtPackage.packageSections.length > 0) score += 5;
  if (master.courtPackage.exhibitOrder.length > 0) score += 5;

  if (master.authorityReadiness) score += 5;
  if (master.contradictionReadiness) score += 5;
  if (master.credibilityIntelligence) score += 5;

  const highRiskPenalty = master.risks.filter(
    (risk) => risk.severity === "high" || risk.severity === "critical",
  ).length;

  return clampScore(score - highRiskPenalty * 2);
}

export function buildDashboardOperationalWarnings(
  master: DashboardMasterView,
): string[] {
  const warnings: string[] = [];

  if (master.parties.length === 0) {
    warnings.push("Parties have not been mapped yet.");
  }

  if (master.facts.length === 0) {
    warnings.push("Core facts have not been structured yet.");
  }

  if (master.timeline.length === 0) {
    warnings.push("Timeline is missing or not structured yet.");
  }

  if (master.evidence.length === 0) {
    warnings.push("No evidence has been connected to the case yet.");
  }

  if (master.proofMap.length === 0) {
    warnings.push("Proof map has not been built yet.");
  }

  if (master.formNeeds.length === 0) {
    warnings.push("Form needs have not been reviewed yet.");
  }

  if (master.strategy.likelyOtherSideArguments.length === 0) {
    warnings.push("Opposing-side attack analysis has not been generated yet.");
  }

  if (master.strategy.likelyJudgeConcerns.length === 0) {
    warnings.push("Judge-facing concern analysis has not been generated yet.");
  }

  if (master.authorityReadiness?.unsafeAuthorityCount) {
    warnings.push("Unsafe legal authorities require review.");
  }

  if (master.authorityReadiness?.wrongJurisdictionAuthorityCount) {
    warnings.push("Wrong-jurisdiction authorities require review.");
  }

  if (master.contradictionReadiness?.criticalFindings) {
    warnings.push("Critical contradictions require review.");
  }

  if (master.contradictionReadiness?.highFindings) {
    warnings.push("High-risk contradictions require review.");
  }

  if (
    master.credibilityIntelligence?.overallLevel === "serious" ||
    master.credibilityIntelligence?.overallLevel === "critical"
  ) {
    warnings.push("Credibility risk requires review.");
  }

  if (master.proceduralIntelligence.pathwayWarnings.length > 0) {
    warnings.push("Procedural pathway warnings require review.");
  }

  if (master.readiness.blockers.length > 0) {
    warnings.push("Readiness blockers remain before final package or export.");
  }

  return Array.from(new Set(warnings));
}

export function buildDashboardNextAction(
  caseFile: DashboardCaseShell,
  master: DashboardMasterView,
): DashboardNextAction {
  if (!hasDashboardMasterData(master)) {
    return {
      title: "Continue AI Intake",
      text: "This case exists, but the master case intelligence is not built yet. Complete intake so the system can build facts, issues, forms, risks, and readiness.",
      href: buildDashboardWorkflowHref("/builder", caseFile),
    };
  }

  if (master.risks.some((risk) => risk.severity === "critical")) {
    return {
      title: "Review Critical Risks",
      text: "Critical proof, contradiction, credibility, or authority risks should be reviewed before relying on final documents.",
      href: buildDashboardWorkflowHref("/litigation-strategy", caseFile),
    };
  }

  if (
    master.authorityReadiness?.unsafeAuthorityCount ||
    master.authorityReadiness?.wrongJurisdictionAuthorityCount
  ) {
    return {
      title: "Review Legal Authorities",
      text: "Authority verification, citation safety, or jurisdiction fit needs review before final documents are relied on.",
      href: buildDashboardWorkflowHref("/legal-principles", caseFile),
    };
  }

  if (
    master.contradictionReadiness?.criticalFindings ||
    master.contradictionReadiness?.highFindings
  ) {
    return {
      title: "Resolve Contradictions",
      text: "Contradictions should be reviewed before preparing final documents, settlement materials, or trial materials.",
      href: buildDashboardWorkflowHref("/litigation-strategy", caseFile),
    };
  }

  if (
    master.credibilityIntelligence?.overallLevel === "serious" ||
    master.credibilityIntelligence?.overallLevel === "critical"
  ) {
    return {
      title: "Review Credibility Risk",
      text: "Credibility, judge concern, cross-examination, and document-readiness risks need review.",
      href: buildDashboardWorkflowHref("/litigation-strategy", caseFile),
    };
  }

  if (master.evidence.length === 0) {
    return {
      title: "Organize Evidence",
      text: "Evidence should be uploaded or described so the system can connect proof to each issue.",
      href: buildDashboardWorkflowHref("/evidence", caseFile),
    };
  }

  if (master.proofMap.length === 0) {
    return {
      title: "Build Proof Map",
      text: "The next priority is connecting facts and evidence to the elements that need to be proven.",
      href: buildDashboardWorkflowHref("/evidence", caseFile),
    };
  }

  if (master.formNeeds.length === 0) {
    return {
      title: "Review Forms",
      text: "The system should now review procedural stage and court path to identify required forms.",
      href: buildDashboardWorkflowHref("/forms", caseFile),
    };
  }

  if (
    master.strategy.likelyOtherSideArguments.length === 0 ||
    master.strategy.likelyJudgeConcerns.length === 0
  ) {
    return {
      title: "Strengthen Litigation Strategy",
      text: "Review proof gaps, likely defences, opposing arguments, and judge-facing concerns before final package assembly.",
      href: buildDashboardWorkflowHref("/litigation-strategy", caseFile),
    };
  }

  if (master.courtPackage.packageSections.length === 0) {
    return {
      title: "Assemble Court Package",
      text: "Move into package assembly once evidence, forms, and strategy have been reviewed.",
      href: buildDashboardWorkflowHref("/court-package", caseFile),
    };
  }

  if (master.readiness.score >= 80) {
    return {
      title: "Export Review",
      text: "The case appears close to export readiness. Review final blockers before generating package outputs.",
      href: buildDashboardWorkflowHref("/document-export", caseFile),
    };
  }

  return {
    title: "Review Command Center",
    text: "Continue reviewing blockers, warnings, strategy issues, and package readiness before export.",
    href: `/dashboard/cases/${caseFile.id}`,
  };
}

export function buildDashboardWorkflowCards(
  caseFile: DashboardCaseShell,
  master: DashboardMasterView,
): DashboardWorkflowStep[] {
  const readinessScore = clampScore(master.readiness.score);

  return [
    {
      key: "intake",
      title: "AI Intake",
      href: buildDashboardWorkflowHref("/builder", caseFile),
      text: "Continue collecting facts, goals, parties, events, damages, procedural history, and missing information.",
      complete: master.facts.length > 0 && master.parties.length > 0,
      warning: master.facts.length === 0 || master.parties.length === 0,
      priority: 1,
    },
    {
      key: "evidence",
      title: "Evidence Intelligence",
      href: buildDashboardWorkflowHref("/evidence", caseFile),
      text: "Upload and organize exhibits, messages, records, screenshots, photos, and proof links.",
      complete: master.evidence.length > 0,
      warning: master.evidence.length === 0,
      priority: 2,
    },
    {
      key: "proof",
      title: "Proof Mapping",
      href: buildDashboardWorkflowHref("/evidence", caseFile),
      text: "Connect evidence to facts, facts to legal issues, and issues to what must be proven.",
      complete: master.proofMap.length > 0,
      warning: master.evidence.length > 0 && master.proofMap.length === 0,
      priority: 3,
    },
    {
      key: "authority",
      title: "Authority Intelligence",
      href: buildDashboardWorkflowHref("/legal-principles", caseFile),
      text: "Review legal authority verification, citation safety, and jurisdiction fit.",
      complete:
        Boolean(master.authorityReadiness) &&
        !master.authorityReadiness?.unsafeAuthorityCount &&
        !master.authorityReadiness?.wrongJurisdictionAuthorityCount,
      warning:
        Boolean(master.authorityReadiness?.unsafeAuthorityCount) ||
        Boolean(master.authorityReadiness?.wrongJurisdictionAuthorityCount),
      priority: 4,
    },
    {
      key: "credibility",
      title: "Credibility Intelligence",
      href: buildDashboardWorkflowHref("/litigation-strategy", caseFile),
      text: "Review judge concern, cross-examination, settlement pressure, and document-readiness risks.",
      complete:
        Boolean(master.credibilityIntelligence) &&
        master.credibilityIntelligence?.overallLevel !== "serious" &&
        master.credibilityIntelligence?.overallLevel !== "critical",
      warning:
        master.credibilityIntelligence?.overallLevel === "serious" ||
        master.credibilityIntelligence?.overallLevel === "critical",
      priority: 5,
    },
    {
      key: "forms",
      title: "Forms",
      href: buildDashboardWorkflowHref("/forms", caseFile),
      text: "Review recommended forms and connect them to the correct court path and case stage.",
      complete: master.formNeeds.length > 0,
      warning: master.formNeeds.length === 0,
      priority: 6,
    },
    {
      key: "workspace",
      title: "Document Workspace",
      href: buildDashboardWorkflowHref("/document-workspace", caseFile),
      text: "Review, improve, and lock generated document sections before export.",
      complete:
        master.aiMemory.structuredSummary.length > 0 ||
        master.aiMemory.plainLanguageSummary.length > 0,
      warning:
        master.facts.length > 0 && master.aiMemory.structuredSummary.length === 0,
      priority: 7,
    },
    {
      key: "strategy",
      title: "Litigation Strategy",
      href: buildDashboardWorkflowHref("/litigation-strategy", caseFile),
      text: "Review weaknesses, opposing arguments, judge concerns, proof gaps, and next strategic steps.",
      complete:
        master.strategy.likelyOtherSideArguments.length > 0 ||
        master.strategy.likelyJudgeConcerns.length > 0,
      warning:
        master.issues.length > 0 &&
        master.strategy.likelyOtherSideArguments.length === 0,
      priority: 8,
    },
    {
      key: "package",
      title: "Court Package",
      href: buildDashboardWorkflowHref("/court-package", caseFile),
      text: "Assemble exhibits, indexes, summaries, proof charts, filing notes, and service notes.",
      complete: master.courtPackage.packageSections.length > 0,
      warning:
        master.evidence.length > 0 &&
        master.courtPackage.packageSections.length === 0,
      priority: 9,
    },
    {
      key: "trial",
      title: "Trial Package",
      href: buildDashboardWorkflowHref("/trial-package", caseFile),
      text: "Prepare trial-focused materials, witness planning, exhibit order, chronology, and proof structure.",
      complete: master.courtPackage.exhibitOrder.length > 0,
      warning:
        master.courtPackage.packageSections.length > 0 &&
        master.courtPackage.exhibitOrder.length === 0,
      priority: 10,
    },
    {
      key: "export",
      title: "Export",
      href: buildDashboardWorkflowHref("/document-export", caseFile),
      text: "Export court-ready documents and package materials when the case is ready.",
      complete: readinessScore >= 80,
      warning: readinessScore < 80,
      priority: 11,
    },
  ];
}

export function buildDashboardSummary(
  caseFile: DashboardCaseShell,
): DashboardSummary {
  const assemblyCandidate = findAssemblyCandidate(caseFile.master_result);
  const master = extractDashboardMaster(caseFile.master_result);

  const highRisks = master.risks.filter(
    (risk) => risk?.severity === "high" || risk?.severity === "critical",
  );

  return {
    master,
    highRisks,
    masterHasData: hasDashboardMasterData(master),
    systemScore: calculateDashboardSystemScore(master),
    readinessScore: clampScore(master.readiness.score),
    readinessLevel: master.readiness.level || "not-ready",
    operationalWarnings: buildDashboardOperationalWarnings(master),
    nextAction: buildDashboardNextAction(caseFile, master),
    workflowCards: assemblyCandidate
      ? buildDashboardWorkflowCardsFromAssembly(assemblyCandidate)
      : buildDashboardWorkflowCards(caseFile, master),
  };
}