import {
  CaseConfidence,
  CaseSeverity,
} from "../architecture/masterCaseSchema";

import {
  ProceduralArea,
  ProceduralAreaReadinessState,
  ProceduralDeadline,
  ProceduralDependency,
  ProceduralEvent,
  ProceduralNextAction,
  ProceduralRisk,
  ProceduralStateBuildInput,
  ProceduralStateBuildOutput,
  ProceduralStateModel,
  ProceduralReadinessState,
} from "./proceduralStateArchitecture";

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

function hasText(text: string | undefined, terms: string[]): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

function severityForDeadline(dateKnown: boolean): CaseSeverity {
  return dateKnown ? "low" : "high";
}

function areaForEventType(type: ProceduralEvent["type"]): ProceduralArea {
  if (
    type === "claim-prepared" ||
    type === "claim-filed" ||
    type === "claim-issued" ||
    type === "notice-of-action-issued" ||
    type === "application-issued"
  ) {
    return "commencement";
  }

  if (type === "claim-served") return "service";

  if (
    type === "response-served" ||
    type === "response-filed" ||
    type === "defence-due" ||
    type === "notice-of-intent-filed"
  ) {
    return "response";
  }

  if (
    type === "default-noted" ||
    type === "default-judgment-requested" ||
    type === "default-judgment-issued"
  ) {
    return "default";
  }

  if (type === "pleading-delivered") return "pleadings";
  if (type === "pleading-amended") return "amendments";

  if (
    type === "affidavit-of-documents-served" ||
    type === "disclosure-requested" ||
    type === "disclosure-served" ||
    type === "discovery-scheduled" ||
    type === "discovery-completed" ||
    type === "undertaking-given" ||
    type === "undertaking-due"
  ) {
    return "discovery";
  }

  if (
    type === "motion-contemplated" ||
    type === "motion-filed" ||
    type === "motion-served" ||
    type === "motion-confirmation-due" ||
    type === "motion-heard" ||
    type === "motion-abandoned"
  ) {
    return "motion";
  }

  if (
    type === "affidavit-served" ||
    type === "cross-examination-scheduled"
  ) {
    return "motion-evidence";
  }

  if (
    type === "settlement-offer-made" ||
    type === "settlement-offer-withdrawn" ||
    type === "settlement-offer-expired" ||
    type === "settlement-reached"
  ) {
    return "settlement";
  }

  if (
    type === "conference-scheduled" ||
    type === "conference-materials-due" ||
    type === "conference-completed" ||
    type === "pre-trial-scheduled" ||
    type === "certificate-of-readiness-due" ||
    type === "pre-trial-brief-due" ||
    type === "pre-trial-report-issued"
  ) {
    return "pre-trial";
  }

  if (
    type === "trial-scheduled" ||
    type === "trial-materials-due" ||
    type === "trial-completed"
  ) {
    return "trial";
  }

  if (type === "costs-awarded") return "costs";

  if (
    type === "costs-assessment-requested" ||
    type === "bill-of-costs-served" ||
    type === "assessment-hearing-scheduled" ||
    type === "certificate-of-assessment-issued"
  ) {
    return "assessment";
  }

  if (type === "enforcement-started") return "enforcement";

  if (type === "appeal-contemplated" || type === "appeal-started") {
    return "appeal";
  }

  return "unknown";
}

function buildProceduralEvents(input: ProceduralStateBuildInput): ProceduralEvent[] {
  return (input.knownEvents || []).map((event) => {
    const type = event.type || "unknown";

    return {
      id: event.id || createId("procedural_event"),
      type,
      area: event.area || areaForEventType(type),
      title: event.title,
      description: event.description,
      occurredAtRaw: event.dateRaw,
      occurredAtNormalized: event.dateNormalized,
      source: event.source || "system-inference",
      rule: event.rule,
      subrule: event.subrule,
      relatedAuthorityIds: event.relatedAuthorityIds || [],
      relatedDocumentIds: event.relatedDocumentIds || [],
      relatedEvidenceIds: event.relatedEvidenceIds || [],
      relatedDeadlineIds: [],
      confidence: event.dateNormalized || event.dateRaw ? "medium" : "low",
    };
  });
}

function buildDeadlines(input: ProceduralStateBuildInput): ProceduralDeadline[] {
  return (input.knownDeadlines || []).map((deadline) => ({
    id: deadline.id || createId("procedural_deadline"),
    title: deadline.title,
    dateRaw: deadline.dateRaw,
    dateNormalized: deadline.dateNormalized,
    certainty: deadline.dateNormalized
      ? "exact"
      : deadline.dateRaw
        ? "approximate"
        : "unknown",
    source: deadline.source || "system-inference",
    rule: deadline.rule,
    subrule: deadline.subrule,
    triggerEvent: deadline.triggerEvent,
    timeAmount: deadline.timeAmount,
    timeUnit: deadline.timeUnit,
    countingRuleNeeded: deadline.countingRuleNeeded,
    relatedAuthorityIds: deadline.relatedAuthorityIds || [],
    relatedEventIds: [],
    relatedDocumentIds: [],
    relatedFormIds: [],
    riskLevel: severityForDeadline(Boolean(deadline.dateNormalized || deadline.dateRaw)),
    confidence: deadline.dateNormalized ? "high" : deadline.dateRaw ? "medium" : "low",
  }));
}

function buildDependency(args: {
  type: ProceduralDependency["type"];
  title: string;
  explanation: string;
  prerequisite: string;
  currentStatus: ProceduralDependency["currentStatus"];
  suggestedFix: string;
  severity: CaseSeverity;
  input: ProceduralStateBuildInput;
  relatedAuthorityIds?: string[];
}): ProceduralDependency {
  return {
    id: createId("procedural_dependency"),
    type: args.type,
    title: args.title,
    explanation: args.explanation,
    prerequisite: args.prerequisite,
    currentStatus: args.currentStatus,
    affectedStages: [args.input.stage],
    affectedCourtPaths: [args.input.courtPath],
    relatedAuthorityIds: args.relatedAuthorityIds || [],
    suggestedFix: args.suggestedFix,
    severity: args.severity,
  };
}

function buildDependencies(
  input: ProceduralStateBuildInput,
  events: ProceduralEvent[],
  deadlines: ProceduralDeadline[],
): ProceduralDependency[] {
  const dependencies: ProceduralDependency[] = [];

  if (input.courtPath === "unknown") {
    dependencies.push(
      buildDependency({
        type: "must-confirm-forum",
        title: "Court path must be confirmed",
        explanation:
          "The system cannot safely recommend final forms or procedural steps without knowing the court, tribunal, or process.",
        prerequisite: "Confirm the forum/court path.",
        currentStatus: "not-satisfied",
        suggestedFix: "Ask which court, tribunal, or legal process applies.",
        severity: "high",
        input,
      }),
    );
  }

  if (input.stage === "not-sure") {
    dependencies.push(
      buildDependency({
        type: "must-confirm-stage",
        title: "Procedural stage must be confirmed",
        explanation:
          "The system needs to know what has already been filed, served, scheduled, or ordered.",
        prerequisite: "Confirm procedural stage.",
        currentStatus: "not-satisfied",
        suggestedFix: "Ask what documents exist and whether any dates or deadlines are scheduled.",
        severity: "high",
        input,
      }),
    );
  }

  if (input.stage === "responding") {
    const hasServiceEvent = events.some((event) => event.type === "claim-served");

    dependencies.push(
      buildDependency({
        type: "must-serve-before-response",
        title: "Served document and response deadline must be confirmed",
        explanation:
          "A responding workflow depends on what document was served and when the response is due.",
        prerequisite: "Identify served document and deadline.",
        currentStatus: hasServiceEvent ? "unclear" : "not-satisfied",
        suggestedFix:
          "Ask what document was served, when it was served, and what deadline applies.",
        severity: "high",
        input,
      }),
    );
  }

  if (input.stage === "enforcement") {
    const hasOrder = events.some(
      (event) => event.type === "order-issued" || event.type === "judgment-issued",
    );

    dependencies.push(
      buildDependency({
        type: "must-have-order-before-enforcement",
        title: "Order or judgment must exist before enforcement",
        explanation:
          "Enforcement generally depends on an existing order, judgment, or enforceable obligation.",
        prerequisite: "Confirm the order, judgment, or enforceable document.",
        currentStatus: hasOrder ? "satisfied" : "unclear",
        suggestedFix: "Ask for the order/judgment date and document.",
        severity: hasOrder ? "low" : "high",
        input,
      }),
    );
  }

  if (deadlines.length === 0) {
    dependencies.push(
      buildDependency({
        type: "must-confirm-deadline",
        title: "Deadlines must be checked",
        explanation:
          "No procedural deadline is currently captured, which may affect filing, service, response, appeal, or conference obligations.",
        prerequisite: "Identify known deadlines.",
        currentStatus: "unclear",
        suggestedFix:
          "Ask whether any deadline, hearing date, service date, or filing due date exists.",
        severity: "medium",
        input,
      }),
    );
  }

  return dependencies;
}

function buildRisk(args: {
  area: ProceduralArea;
  type: ProceduralRisk["type"];
  severity: CaseSeverity;
  title: string;
  explanation: string;
  suggestedFix: string;
  relatedAuthorityIds?: string[];
  relatedDeadlineIds?: string[];
  relatedEventIds?: string[];
}): ProceduralRisk {
  return {
    id: createId("procedural_risk"),
    area: args.area,
    type: args.type,
    severity: args.severity,
    title: args.title,
    explanation: args.explanation,
    suggestedFix: args.suggestedFix,
    relatedAuthorityIds: args.relatedAuthorityIds || [],
    relatedDeadlineIds: args.relatedDeadlineIds || [],
    relatedEventIds: args.relatedEventIds || [],
  };
}

function buildRisks(
  input: ProceduralStateBuildInput,
  events: ProceduralEvent[],
  deadlines: ProceduralDeadline[],
  dependencies: ProceduralDependency[],
): ProceduralRisk[] {
  const risks: ProceduralRisk[] = [];

  if (input.courtPath === "unknown") {
    risks.push(
      buildRisk({
        area: "unknown",
        type: "wrong-forum-risk",
        severity: "high",
        title: "Court path is uncertain",
        explanation:
          "Wrong forum or court path can cause wrong forms, wrong deadlines, or wrong workflow.",
        suggestedFix:
          "Confirm the court, tribunal, or legal process before generating final forms.",
      }),
    );
  }

  if (input.stage === "not-sure") {
    risks.push(
      buildRisk({
        area: "unknown",
        type: "procedural-confusion",
        severity: "high",
        title: "Procedural stage is uncertain",
        explanation:
          "The system does not yet know whether the user is starting, responding, attending conference, moving, enforcing, appealing, or preparing for trial.",
        suggestedFix: "Confirm what has already happened procedurally.",
      }),
    );
  }

  for (const deadline of deadlines) {
    if (deadline.certainty === "unknown") {
      risks.push(
        buildRisk({
          area: "unknown",
          type: "deadline-risk",
          severity: "high",
          title: `Deadline unclear: ${deadline.title}`,
          explanation: "A deadline was identified but the date is unclear.",
          suggestedFix: "Confirm the deadline date and source.",
          relatedAuthorityIds: deadline.relatedAuthorityIds,
          relatedDeadlineIds: [deadline.id],
        }),
      );
    }
  }

  if (
    hasText(input.rawNarrative, ["served", "service"]) &&
    !events.some(
      (event) => event.type === "claim-served" || event.type === "motion-served",
    )
  ) {
    risks.push(
      buildRisk({
        area: "service",
        type: "service-risk",
        severity: "medium",
        title: "Service issue may need clarification",
        explanation:
          "The narrative mentions service, but no structured service event has been captured.",
        suggestedFix: "Identify what was served, when, how, and by whom.",
      }),
    );
  }

  for (const dependency of dependencies) {
    if (dependency.currentStatus === "not-satisfied") {
      risks.push(
        buildRisk({
          area: "unknown",
          type: "missing-material-risk",
          severity: dependency.severity,
          title: dependency.title,
          explanation: dependency.explanation,
          suggestedFix: dependency.suggestedFix,
          relatedAuthorityIds: dependency.relatedAuthorityIds,
        }),
      );
    }
  }

  return risks;
}

function buildNextAction(args: {
  kind: ProceduralNextAction["kind"];
  title: string;
  explanation: string;
  priority: ProceduralNextAction["priority"];
  blockedBy?: string[];
  unlocks?: string[];
  relatedAuthorityIds?: string[];
}): ProceduralNextAction {
  return {
    id: createId("procedural_action"),
    kind: args.kind,
    title: args.title,
    explanation: args.explanation,
    priority: args.priority,
    blockedBy: args.blockedBy || [],
    unlocks: args.unlocks || [],
    relatedAuthorityIds: args.relatedAuthorityIds || [],
  };
}

function buildNextActions(
  input: ProceduralStateBuildInput,
  dependencies: ProceduralDependency[],
  risks: ProceduralRisk[],
): ProceduralNextAction[] {
  const actions: ProceduralNextAction[] = [];

  if (input.courtPath === "unknown") {
    actions.push(
      buildNextAction({
        kind: "confirm-forum",
        title: "Confirm court path",
        explanation:
          "Before forms or filing steps are recommended, confirm the court, tribunal, or process.",
        priority: "high",
      }),
    );
  }

  if (input.stage === "not-sure") {
    actions.push(
      buildNextAction({
        kind: "confirm-stage",
        title: "Confirm procedural stage",
        explanation:
          "Identify what has already been filed, served, scheduled, or ordered.",
        priority: "high",
      }),
    );
  }

  if (risks.some((risk) => risk.type === "deadline-risk")) {
    actions.push(
      buildNextAction({
        kind: "confirm-deadline",
        title: "Confirm deadlines",
        explanation:
          "Deadlines affect filing, service, response, appeal, and conference requirements.",
        priority: "critical",
      }),
    );
  }

  if (input.stage === "conference") {
    actions.push(
      buildNextAction({
        kind: "prepare-conference",
        title: "Prepare conference materials",
        explanation:
          "Conference stage requires issue organization, evidence review, settlement position, and procedural compliance.",
        priority: "high",
      }),
    );
  }

  if (input.stage === "motion" || input.stage === "urgent") {
    actions.push(
      buildNextAction({
        kind: "prepare-motion",
        title: "Prepare motion or urgent relief workflow",
        explanation:
          "Motion workflows require requested relief, evidence, service analysis, urgency facts, and procedural prerequisites.",
        priority: input.stage === "urgent" ? "critical" : "high",
      }),
    );
  }

  if (input.stage === "trial") {
    actions.push(
      buildNextAction({
        kind: "prepare-trial",
        title: "Prepare trial materials",
        explanation:
          "Trial readiness requires witness planning, exhibit organization, chronology, issue mapping, and proof review.",
        priority: "high",
      }),
    );
  }

  if (dependencies.length === 0 && actions.length === 0) {
    actions.push(
      buildNextAction({
        kind: "review-forms",
        title: "Review form and document readiness",
        explanation:
          "The procedural state has no major blockers, so the next step is to review forms, evidence, and document readiness.",
        priority: "medium",
      }),
    );
  }

  return actions;
}

function buildAreaReadiness(args: {
  risks: ProceduralRisk[];
  actions: ProceduralNextAction[];
}): ProceduralAreaReadinessState[] {
  const areas: ProceduralArea[] = [
    "commencement",
    "service",
    "response",
    "default",
    "pleadings",
    "amendments",
    "discovery",
    "motion",
    "motion-evidence",
    "settlement",
    "pre-trial",
    "trial",
    "costs",
    "assessment",
    "enforcement",
    "appeal",
  ];

  return areas.map((area) => {
    const areaRisks = args.risks.filter((risk) => risk.area === area);

    const readiness: CaseConfidence =
      areaRisks.some((risk) => risk.severity === "critical")
        ? "very-low"
        : areaRisks.some((risk) => risk.severity === "high")
          ? "low"
          : areaRisks.some((risk) => risk.severity === "medium")
            ? "medium"
            : "medium";

    return {
      area,
      readiness,
      blockers: uniqueStrings(
        areaRisks
          .filter((risk) => risk.severity === "high" || risk.severity === "critical")
          .map((risk) => risk.title),
      ),
      nextActions: args.actions.map((action) => action.title),
      relatedAuthorityIds: uniqueStrings(
        areaRisks.flatMap((risk) => risk.relatedAuthorityIds),
      ),
    };
  });
}

function buildReadiness(args: {
  input: ProceduralStateBuildInput;
  deadlines: ProceduralDeadline[];
  dependencies: ProceduralDependency[];
  risks: ProceduralRisk[];
  actions: ProceduralNextAction[];
}): ProceduralReadinessState {
  const forumReadiness: CaseConfidence =
    args.input.courtPath === "unknown" ? "low" : "medium";

  const stageReadiness: CaseConfidence =
    args.input.stage === "not-sure" ? "low" : "medium";

  const deadlineReadiness: CaseConfidence =
    args.deadlines.length === 0
      ? "low"
      : args.deadlines.some((deadline) => deadline.certainty === "unknown")
        ? "low"
        : "medium";

  const serviceReadiness: CaseConfidence = args.risks.some(
    (risk) => risk.type === "service-risk",
  )
    ? "low"
    : "medium";

  const filingReadiness: CaseConfidence = args.risks.some(
    (risk) => risk.type === "wrong-form-risk" || risk.type === "wrong-forum-risk",
  )
    ? "low"
    : "medium";

  const evidenceProcedureReadiness: CaseConfidence = args.risks.some(
    (risk) =>
      risk.type === "missing-material-risk" ||
      risk.type === "discovery-noncompliance-risk",
  )
    ? "low"
    : "medium";

  const motionReadiness: CaseConfidence =
    args.input.stage === "motion" || args.input.stage === "urgent"
      ? "medium"
      : "low";

  const discoveryReadiness: CaseConfidence = args.risks.some(
    (risk) => risk.type === "discovery-noncompliance-risk",
  )
    ? "low"
    : "medium";

  const settlementReadiness: CaseConfidence = args.risks.some(
    (risk) => risk.type === "settlement-costs-risk",
  )
    ? "low"
    : "medium";

  const preTrialReadiness: CaseConfidence =
    args.input.stage === "conference" || args.input.stage === "trial"
      ? "medium"
      : "low";

  const costsReadiness: CaseConfidence = args.risks.some(
    (risk) => risk.type === "costs-sanction-risk",
  )
    ? "low"
    : "medium";

  const assessmentReadiness: CaseConfidence = args.risks.some(
    (risk) => risk.type === "assessment-risk",
  )
    ? "low"
    : "medium";

  const blockerTitles = [
    ...args.dependencies
      .filter((dependency) => dependency.currentStatus === "not-satisfied")
      .map((dependency) => dependency.title),
    ...args.risks
      .filter((risk) => risk.severity === "high" || risk.severity === "critical")
      .map((risk) => risk.title),
  ];

  return {
    overallReadiness: averageConfidence([
      forumReadiness,
      stageReadiness,
      deadlineReadiness,
      serviceReadiness,
      filingReadiness,
      evidenceProcedureReadiness,
      motionReadiness,
      discoveryReadiness,
      settlementReadiness,
      preTrialReadiness,
      costsReadiness,
      assessmentReadiness,
    ]),
    forumReadiness,
    stageReadiness,
    deadlineReadiness,
    serviceReadiness,
    filingReadiness,
    evidenceProcedureReadiness,
    motionReadiness,
    discoveryReadiness,
    settlementReadiness,
    preTrialReadiness,
    costsReadiness,
    assessmentReadiness,
    areaReadiness: buildAreaReadiness({
      risks: args.risks,
      actions: args.actions,
    }),
    blockers: uniqueStrings(blockerTitles),
    nextActions: args.actions.map((action) => action.title),
  };
}

export function buildProceduralState(
  input: ProceduralStateBuildInput,
): ProceduralStateBuildOutput {
  const timestamp = nowIso();

  const events = buildProceduralEvents(input);
  const deadlines = buildDeadlines(input);
  const dependencies = buildDependencies(input, events, deadlines);
  const risks = buildRisks(input, events, deadlines, dependencies);
  const nextActions = buildNextActions(input, dependencies, risks);

  const readiness = buildReadiness({
    input,
    deadlines,
    dependencies,
    risks,
    actions: nextActions,
  });

  const warnings = uniqueStrings([
    ...dependencies.map((dependency) => dependency.title),
    ...risks.map((risk) => risk.title),
  ]);

  const confidence = averageConfidence([
    readiness.forumReadiness,
    readiness.stageReadiness,
    readiness.deadlineReadiness,
    readiness.serviceReadiness,
    readiness.filingReadiness,
    readiness.evidenceProcedureReadiness,
    readiness.motionReadiness,
    readiness.discoveryReadiness,
    readiness.settlementReadiness,
    readiness.preTrialReadiness,
    readiness.costsReadiness,
    readiness.assessmentReadiness,
  ]);

  const proceduralState: ProceduralStateModel = {
    id: createId("procedural_state"),
    version: "2.0.0",
    createdAt: timestamp,
    updatedAt: timestamp,

    caseId: input.caseId,

    courtPath: input.courtPath,
    province: input.province,
    stage: input.stage,

    authorityReferences: input.authorityReferences || [],
    events,
    deadlines,
    requirements: input.requirements || [],
    courtPowers: input.courtPowers || [],
    dependencies,
    risks,
    nextActions,

    readiness,

    warnings,
    confidence,
  };

  return {
    proceduralState,
    warnings,
  };
}