import type {
  CaseFormNeed,
  CaseReadiness,
  CaseRisk,
  CaseTimelineEvent,
} from "./caseContextEngine";

import type { EvidenceItem } from "./evidenceEngine";

import {
  runCivilWorkflowEngine,
  type CivilWorkflowInput,
  type CivilWorkflowResult,
} from "./civilWorkflowEngine";

import {
  runCivilEvidenceEngine,
  type CivilEvidenceInput,
  type CivilEvidenceResult,
} from "./civilEvidenceEngine";

import {
  runCivilNarrativeEngine,
  type CivilNarrativeInput,
  type CivilNarrativeResult,
} from "./civilNarrativeEngine";

import {
  runCivilFormRoutingEngine,
  type CivilFormRoutingResult,
} from "./civilFormRoutingEngine";

import { runCivilCaseFileCatalogEngine } from "./civilCaseFileCatalogEngine";

import {
  runCivilStrategyEngine,
  type CivilStrategyResult,
} from "./civilStrategyEngine";

import type {
  CivilCaseData,
  CivilCaseType,
  CivilLiabilityTheory,
} from "./types/civil-case";

export type CivilMasterCaseInput = {
  caseId?: string;
  title?: string;
  summary?: string;
  facts?: string[];
  stage?: string;
  selectedIssues?: string[];
  requestedRemedies?: string[];
  evidenceItems?: EvidenceItem[];
  timeline?: CaseTimelineEvent[];
  liabilityTheories?: CivilLiabilityTheory[];
  existingRisks?: CaseRisk[];
  existingForms?: CaseFormNeed[];
};

export type CivilMasterCaseResult = {
  masterCase: CivilCaseData;
  workflow: CivilWorkflowResult;
  evidence: CivilEvidenceResult;
  narrative: CivilNarrativeResult;
  formRouting: CivilFormRoutingResult;
  strategy: CivilStrategyResult;
  dashboardSummary: {
    strongestTheories: string[];
    biggestRisks: string[];
    immediateNextSteps: string[];
    readinessWarnings: string[];
    proceduralTrack: string;
    strategyReadiness: string[];
  };
  summary: string;
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function normalize(value: unknown): string {
  return clean(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function cleanList(items: Array<string | null | undefined | false>): string[] {
  return Array.from(new Set(items.map(clean).filter(Boolean)));
}

function includesAny(text: string, terms: string[]): boolean {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function uniqueCaseTypes(items: CivilCaseType[]): CivilCaseType[] {
  return Array.from(new Set(items));
}

function createCaseId(): string {
  return `civil_case_${Date.now()}`;
}

function makeRisk(params: {
  id: string;
  title: string;
  description: string;
  severity: CaseRisk["severity"];
  source: CaseRisk["source"];
  suggestedFix: string;
}): CaseRisk {
  return params;
}

function makeFormNeed(params: {
  title: string;
  reason: string;
  stage: CaseFormNeed["stage"];
  status?: CaseFormNeed["status"];
  formNumber?: string;
}): CaseFormNeed {
  return {
    formNumber: params.formNumber,
    title: params.title,
    reason: params.reason,
    stage: params.stage,
    status: params.status || "needed-now",
    linkedIssueIds: [],
    linkedEvidenceIds: [],
  };
}

function mergeRisks(...groups: CaseRisk[][]): CaseRisk[] {
  const map = new Map<string, CaseRisk>();

  groups.flat().forEach((risk) => {
    map.set(risk.id, risk);
  });

  return Array.from(map.values());
}

function mergeForms(...groups: CaseFormNeed[][]): CaseFormNeed[] {
  const map = new Map<string, CaseFormNeed>();

  groups.flat().forEach((form) => {
    const key = `${form.formNumber || ""}_${form.title}`;
    map.set(key, form);
  });

  return Array.from(map.values());
}

function combinedCivilText(input: CivilMasterCaseInput): string {
  return normalize(
    [
      input.title,
      input.summary,
      input.stage,
      input.selectedIssues?.join(" "),
      input.requestedRemedies?.join(" "),
      input.facts?.join(" "),
      input.timeline?.map((event) => JSON.stringify(event)).join(" "),
      input.evidenceItems
        ?.map((item) =>
          [
            item.title,
            item.description,
            item.relevance,
            item.relatedIssue,
            item.relatedLegalElement,
            item.category,
            item.content,
            item.source,
            item.date,
          ].join(" "),
        )
        .join(" "),
    ].join(" "),
  );
}

function detectSupplementalCaseTypes(
  input: CivilMasterCaseInput,
  existing: CivilCaseType[],
): CivilCaseType[] {
  const text = combinedCivilText(input);
  const next: CivilCaseType[] = [...existing];

  if (
    includesAny(text, [
      "crown",
      "police",
      "government",
      "public authority",
      "ministry",
      "bail",
      "charter",
      "section 7",
      "section 15",
    ])
  ) {
    next.push("charter");
  }

  if (
    includesAny(text, [
      "crown",
      "police",
      "public office",
      "public authority",
      "reckless",
      "abuse of authority",
      "misfeasance",
    ])
  ) {
    next.push("misfeasance");
  }

  if (
    includesAny(text, [
      "negligence",
      "failed",
      "failure",
      "omission",
      "investigate",
      "system failure",
      "institutional",
    ])
  ) {
    next.push("negligence");
  }

  if (next.length > 1) {
    next.push("mixed-civil");
  }

  return uniqueCaseTypes(next);
}

function buildSupplementalLiabilityTheories(
  input: CivilMasterCaseInput,
  caseTypes: CivilCaseType[],
): CivilLiabilityTheory[] {
  const text = combinedCivilText(input);
  const theories: CivilLiabilityTheory[] = [...(input.liabilityTheories || [])];

  if (
    caseTypes.includes("charter") &&
    includesAny(text, ["crown", "police", "bail", "public authority", "government"])
  ) {
    theories.push({
      id: "civil_theory_charter_public_authority_process_failure",
      title: "Charter / public-authority process-failure theory",
      description:
        "The facts suggest a possible Charter/public-authority theory requiring proof of state conduct, known or foreseeable risk, a process failure, causal connection to harm, and an available remedy.",
      requiredElements: [
        "State action or public authority conduct",
        "Protected interest affected",
        "Operational/process failure rather than disagreement with a judicial outcome",
        "Causation between state conduct and harm",
        "Available remedy and correct procedural route",
      ],
      linkedEvidenceIds: [],
      linkedTimelineEventIds: [],
      strengths: [
        "The intake identifies Crown/police/public authority involvement.",
        "The intake describes serious harm following a bail/public-safety process.",
        "The intake identifies prior-system knowledge and documentary history as possible proof.",
      ],
      weaknesses: [
        "Public-authority claims face immunity, justiciability, causation, and pleading threshold arguments.",
        "The theory must avoid attacking the judge’s decision and focus on operational state conduct.",
      ],
      proofGaps: [
        "Bail transcript or hearing record",
        "Recognizance/release conditions",
        "Prior court records and warnings",
        "Police investigative records",
        "Risk assessment or institutional records",
        "Documents showing what the Crown/police knew or should have synthesized",
      ],
      likelyDefences: [
        "Judicial independence / collateral attack",
        "Crown immunity or prosecutorial discretion",
        "No duty/private law proximity",
        "No causation",
        "Limitation delay",
        "Failure to meet Charter damages threshold",
      ],
      causationConcerns: [
        "The pleading must connect the process failure to materially increased risk, not merely rely on the later harm.",
      ],
      damagesConcerns: [
        "Damages must be separated into documented losses, non-pecuniary harm, Charter/public-law remedy, and any aggravated/punitive theory if available.",
      ],
      confidence: "moderate",
    });
  }

  if (
    caseTypes.includes("misfeasance") &&
    includesAny(text, ["reckless", "known", "history", "failed", "public office", "crown", "police"])
  ) {
    theories.push({
      id: "civil_theory_category_b_misfeasance",
      title: "Category B misfeasance / reckless misuse of public authority",
      description:
        "The facts may support an alternative misfeasance framing if the record can show public authority conduct with knowledge of likely harm or reckless disregard of a known risk.",
      requiredElements: [
        "Public officer or public authority",
        "Exercise or misuse of public power",
        "Knowledge or reckless disregard of likely harm",
        "Causation",
        "Compensable loss",
      ],
      linkedEvidenceIds: [],
      linkedTimelineEventIds: [],
      strengths: [
        "The intake alleges known history and institutional awareness.",
        "The intake alleges process failures by Crown/police.",
      ],
      weaknesses: [
        "Misfeasance has a high threshold and should remain secondary/alternative to Charter framing where appropriate.",
      ],
      proofGaps: [
        "Records proving actual knowledge or reckless disregard",
        "Institutional records showing available risk information",
        "Documents showing failure to synthesize or communicate risk",
      ],
      likelyDefences: [
        "No bad faith or recklessness",
        "Core discretion immunity",
        "No causation",
        "Limitation delay",
      ],
      causationConcerns: [
        "Must show more than a bad outcome; must show state conduct materially contributed to unmanaged risk.",
      ],
      damagesConcerns: [
        "Damages require proof and careful separation from the underlying criminal act.",
      ],
      confidence: "moderate",
    });
  }

  return theories;
}

function buildSupplementalRisks(input: CivilMasterCaseInput): CaseRisk[] {
  const text = combinedCivilText(input);
  const risks: CaseRisk[] = [];

  if (includesAny(text, ["2007", "late discovery", "ptsd", "limitation", "deadline"])) {
    risks.push(
      makeRisk({
        id: "civil_risk_limitation_delay_and_discoverability",
        title: "Limitation and discoverability risk",
        description:
          "The intake suggests an old event with possible late discovery. Limitation, discoverability, incapacity, trauma-related delay, and notice requirements must be analyzed before pleading.",
        severity: "high",
        source: "procedure",
        suggestedFix:
          "Build a limitation chronology showing incident date, discovery date, when material facts became known, medical/trauma barriers, records obtained, and why the claim is not statute-barred.",
      }),
    );
  }

  if (includesAny(text, ["crown", "police", "bail", "public authority", "government"])) {
    risks.push(
      makeRisk({
        id: "civil_risk_public_authority_immunity_and_leave",
        title: "Public-authority immunity / leave-screening risk",
        description:
          "Claims against Crown, police, or public authorities may require leave, notice, correct defendant naming, and careful separation between operational conduct and protected discretion.",
        severity: "high",
        source: "procedure",
        suggestedFix:
          "Screen for CLPA leave, statutory notice, Crown naming, police defendant structure, limitation rules, immunity arguments, and whether the pleading targets operational conduct rather than judicial/prosecutorial core discretion.",
      }),
    );

    risks.push(
      makeRisk({
        id: "civil_risk_judicial_independence_collateral_attack",
        title: "Judicial-independence / collateral-attack risk",
        description:
          "A bail-related civil claim must avoid framing the judge’s release decision as the legal wrong. The safer theory targets what state actors failed to investigate, synthesize, disclose, or present before the decision.",
        severity: "high",
        source: "strategy",
        suggestedFix:
          "Frame the claim as process failure and material contribution to unmanaged risk, not hindsight disagreement with the release order.",
      }),
    );
  }

  if (includesAny(text, ["bail", "released", "known offender", "history", "risk"])) {
    risks.push(
      makeRisk({
        id: "civil_risk_foreseeability_and_causation",
        title: "Foreseeability and causation pressure",
        description:
          "The case depends on showing the later harm was a foreseeable consequence of unmanaged risk and that state process failures materially contributed to that risk.",
        severity: "high",
        source: "evidence",
        suggestedFix:
          "Collect prior offence history, bail transcript, recognizances, psychiatric/risk records, exclusion-zone facts, police records, and documents showing what was known before release.",
      }),
    );
  }

  if (includesAny(text, ["sexual assault", "assault", "crime"])) {
    risks.push(
      makeRisk({
        id: "civil_risk_underlying_third_party_criminal_act",
        title: "Third-party criminal act causation defence",
        description:
          "Defendants may argue the harm was caused by the offender’s independent criminal act rather than by state conduct.",
        severity: "high",
        source: "strategy",
        suggestedFix:
          "Prepare a causation theory focused on material contribution to risk, foreseeability, supervision/release-process failures, and why the harm fell within the known risk.",
      }),
    );
  }

  if (includesAny(text, ["ptsd", "loss of opportunity", "loss wages", "education", "enjoyment"])) {
    risks.push(
      makeRisk({
        id: "civil_risk_damages_proof_and_medical_causation",
        title: "Damages proof and medical causation risk",
        description:
          "Serious psychological, income, education, and life-impact damages require proof, chronology, and causation evidence.",
        severity: "medium",
        source: "evidence",
        suggestedFix:
          "Organize medical records, treatment history, income/education records, functional impact evidence, and damages calculations.",
      }),
    );
  }

  return risks;
}

function buildSupplementalForms(input: CivilMasterCaseInput): CaseFormNeed[] {
  const text = combinedCivilText(input);
  const forms: CaseFormNeed[] = [];

  if (includesAny(text, ["crown", "public authority", "police", "bail", "clpa"])) {
    forms.push(
      makeFormNeed({
        title: "Motion for leave / CLPA public-authority screening package",
        reason:
          "A Crown/public-authority claim may require leave or a preliminary screening motion before the claim can proceed.",
        stage: "motion",
        status: "needed-now",
      }),
    );

    forms.push(
      makeFormNeed({
        title: "Draft Statement of Claim — Charter/public-authority process-failure theory",
        reason:
          "The claim should be drafted only after the leave, limitation, immunity, defendant-naming, and operational-conduct theory are structured.",
        stage: "starting-case",
        status: "needed-now",
      }),
    );

    forms.push(
      makeFormNeed({
        title: "Evidence chronology and record-compendium package",
        reason:
          "A complex public-authority claim needs a dated record showing knowledge, risk, process failure, causation, and damages.",
        stage: "starting-case",
        status: "needed-now",
      }),
    );
  }

  return forms;
}

function hasRequestedRemedy(input: CivilMasterCaseInput): boolean {
  return Boolean(
    input.requestedRemedies?.length ||
      includesAny(combinedCivilText(input), [
        "damages",
        "declaration",
        "injunction",
        "costs",
        "remedy",
        "order",
        "money",
      ]),
  );
}

function buildSupplementalMissingInformation(input: CivilMasterCaseInput): string[] {
  const text = combinedCivilText(input);

  return cleanList([
    includesAny(text, ["crown", "police", "bail"])
      ? "Exact Crown/police/public-authority records relied on, including bail transcript, recognizance, police notes, prior offence records, and risk records."
      : "",
    includesAny(text, ["2007", "late discovery", "ptsd"])
      ? "Detailed limitation/discoverability chronology explaining when the claim became discoverable and why delay should be excused or extended."
      : "",
    includesAny(text, ["sexual assault", "assault"])
      ? "Damages proof, treatment records, income/education impact proof, and causation evidence."
      : "",
    !hasRequestedRemedy(input)
      ? "Precise relief sought, including damages, declarations, Charter remedies, leave relief, injunctions, costs, or other orders."
      : "",
  ]);
}

function buildSupplementalNextSteps(input: CivilMasterCaseInput): string[] {
  const text = combinedCivilText(input);

  return cleanList([
    includesAny(text, ["crown", "police", "bail", "public authority"])
      ? "Prepare a leave/threshold analysis before generating final pleadings."
      : "",
    includesAny(text, ["2007", "late discovery", "ptsd"])
      ? "Build a limitation and discoverability timeline with supporting medical and records-discovery evidence."
      : "",
    includesAny(text, ["bail", "released", "history", "risk"])
      ? "Create a bail-risk chronology showing what was known, what was omitted, and how the process allegedly increased risk."
      : "",
    includesAny(text, ["crown", "police"])
      ? "Separate claims against Crown, police, and any other public body by role, legal theory, evidence, and remedy."
      : "",
    includesAny(text, ["charter", "section 7", "section 15", "public authority"])
      ? "Draft Charter theory first, then misfeasance only as alternative/supporting theory if the facts justify it."
      : "",
    "Map each allegation to a document, witness, record, transcript, or admissible evidence source.",
  ]);
}

function buildReadiness(args: {
  risks: CaseRisk[];
  blockers: string[];
  evidenceCount: number;
  factsCount: number;
  formsCount: number;
}): CaseReadiness {
  const highRiskCount = args.risks.filter((risk) => risk.severity === "high").length;

  const blockers = cleanList([
    ...args.blockers,
    highRiskCount > 0 ? `${highRiskCount} high-risk issue(s) remain.` : "",
    args.factsCount === 0 ? "Civil facts have not been entered." : "",
    args.evidenceCount === 0 ? "Civil evidence has not been added." : "",
    args.formsCount === 0 ? "Civil procedural documents have not been confirmed." : "",
  ]);

  const reasons = cleanList([
    args.factsCount > 0 ? "Civil facts have been started." : "",
    args.evidenceCount > 0 ? "Civil evidence has been started." : "",
    args.formsCount > 0 ? "Civil form/document routing has been started." : "",
    highRiskCount === 0 ? "No high-risk civil blockers are currently detected." : "",
  ]);

  const score = Math.max(
    0,
    Math.min(
      100,
      100 -
        highRiskCount * 18 -
        blockers.length * 6 +
        Math.min(args.evidenceCount, 5) * 3 +
        Math.min(args.factsCount, 5) * 2,
    ),
  );

  const level: CaseReadiness["level"] =
    score >= 80
      ? "hearing-ready"
      : score >= 65
        ? "filing-ready"
        : score >= 45
          ? "organized"
          : score >= 25
            ? "developing"
            : "not-ready";

  return {
    level,
    score,
    reasons,
    blockers,
  };
}

export function runCivilMasterCaseEngine(
  input: CivilMasterCaseInput,
): CivilMasterCaseResult {
  const workflowInput: CivilWorkflowInput = {
    caseId: input.caseId,
    stage: input.stage,
    rawFacts: input.facts?.join(" "),
    summary: input.summary,
    selectedIssues: input.selectedIssues,
    requestedRemedies: input.requestedRemedies,
    timeline: input.timeline,
    evidenceItems: input.evidenceItems,
    formNeeds: input.existingForms,
    risks: input.existingRisks,
    liabilityTheories: input.liabilityTheories,
  };

  const workflow = runCivilWorkflowEngine(workflowInput);

  const detectedCaseTypes = detectSupplementalCaseTypes(
    input,
    workflow.detectedCivilCaseTypes,
  );

  const liabilityTheories = buildSupplementalLiabilityTheories(
    input,
    detectedCaseTypes,
  );

  const evidenceInput: CivilEvidenceInput = {
    caseTypes: detectedCaseTypes,
    evidenceItems: input.evidenceItems,
    timeline: input.timeline,
    summary: input.summary,
  };

  const evidence = runCivilEvidenceEngine(evidenceInput);

  const narrativeInput: CivilNarrativeInput = {
    title: input.title,
    summary: input.summary,
    facts: input.facts,
    requestedRemedies: input.requestedRemedies,
    caseTypes: detectedCaseTypes,
    liabilityTheories,
    workflow,
    evidence,
  };

  const narrative = runCivilNarrativeEngine(narrativeInput);

  const formRouting = runCivilFormRoutingEngine({
    workflow,
    existingFormNeeds: input.existingForms,
  });

  const fileCatalogResult = runCivilCaseFileCatalogEngine({
    evidenceItems: input.evidenceItems,
  });

  const supplementalRisks = buildSupplementalRisks(input);
  const supplementalForms = buildSupplementalForms(input);

  const mergedRisks = mergeRisks(
    workflow.risks,
    evidence.risks,
    supplementalRisks,
    input.existingRisks || [],
  );

  const mergedForms = mergeForms(
    workflow.requiredFormsNow,
    formRouting.formNeedsForMasterCase,
    supplementalForms,
    input.existingForms || [],
  );

  const supplementalMissingInformation = buildSupplementalMissingInformation(input);
  const supplementalNextSteps = buildSupplementalNextSteps(input);

  const readinessBlockers = cleanList([
    ...workflow.blockersBeforeDrafting,
    ...formRouting.blockersBeforeGeneration,
    ...evidence.missingEvidence.map((item) => item.title),
    ...fileCatalogResult.catalog.missingCriticalDocuments,
    ...supplementalMissingInformation,
    ...supplementalRisks
      .filter((risk) => risk.severity === "high")
      .map((risk) => risk.title),
  ]);

  const readiness = buildReadiness({
    risks: mergedRisks,
    blockers: readinessBlockers,
    evidenceCount: input.evidenceItems?.length || 0,
    factsCount: input.facts?.length || 0,
    formsCount: mergedForms.length,
  });

  const preliminaryCase: CivilCaseData = {
    caseId: input.caseId || createCaseId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    title: clean(input.title) || "Civil Case",
    summary:
      clean(input.summary) || narrative.narrativeProfile.coreTheoryNarrative,

    civilCaseTypes: detectedCaseTypes,
    facts: input.facts || [],
    timeline: input.timeline || [],
    liabilityTheories,

    damagesProfile: workflow.damagesProfile,
    procedureProfile: workflow.procedureProfile,
    evidenceProfile: evidence.evidenceProfile,
    narrativeProfile: narrative.narrativeProfile,
    strategicProfile: workflow.strategicProfile,
    caseFileCatalog: fileCatalogResult.catalog,

    formNeeds: mergedForms,
    risks: mergedRisks,
    readiness,

    missingInformation: cleanList([
      ...evidence.missingEvidence.map((item) => item.title),
      ...workflow.procedureProfile.readinessWarnings,
      ...fileCatalogResult.catalog.missingCriticalDocuments,
      ...supplementalMissingInformation,
    ]),

    nextSteps: cleanList([
      ...workflow.nextBestActions,
      ...narrative.draftingNextSteps,
      ...fileCatalogResult.catalog.nextDocumentActions,
      ...supplementalNextSteps,
    ]),

    litigationGoals: cleanList([...(input.requestedRemedies || [])]),
    requestedRemedies: cleanList([...(input.requestedRemedies || [])]),
  };

  const strategy = runCivilStrategyEngine({
    caseData: preliminaryCase,
  });

  const masterCase: CivilCaseData = {
    ...preliminaryCase,
    strategicProfile: strategy.strategicProfile,
    nextSteps: cleanList([
      ...preliminaryCase.nextSteps,
      ...strategy.tacticalNextMoves,
    ]),
  };

  return {
    masterCase,
    workflow,
    evidence,
    narrative,
    formRouting,
    strategy,

    dashboardSummary: {
      strongestTheories: strategy.strongestTheories,
      biggestRisks: mergedRisks
        .filter((risk) => risk.severity === "high")
        .map((risk) => risk.title),
      immediateNextSteps: masterCase.nextSteps.slice(0, 8),
      readinessWarnings: masterCase.readiness.blockers,
      proceduralTrack: workflow.proceduralTrack,
      strategyReadiness: strategy.readinessStrategy,
    },

    summary: cleanList([
      workflow.summary,
      evidence.summary,
      narrative.summary,
      formRouting.summary,
      fileCatalogResult.summary,
      strategy.summary,
    ]).join(" "),
  };
}