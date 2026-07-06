export type ProceduralInvestigatorVersion = "2.0.0";

export type ProceduralSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type ProceduralConfidence =
  | "very-low"
  | "low"
  | "medium"
  | "high"
  | "very-high";

export type ProceduralCaseStage =
  | "pre-litigation"
  | "starting-case"
  | "responding"
  | "already-started"
  | "conference"
  | "motion"
  | "trial"
  | "settlement"
  | "enforcement"
  | "appeal"
  | "urgent"
  | "closed"
  | "not-sure"
  | string;

export type ProceduralCourtPath =
  | "family"
  | "small-claims"
  | "civil"
  | "tribunal"
  | "ltb"
  | "immigration"
  | "criminal-related"
  | "unknown"
  | string;

export type ProceduralFindingCategory =
  | "stage-unclear"
  | "wrong-court-path-risk"
  | "missing-filing"
  | "missing-service"
  | "missing-proof-of-service"
  | "missed-or-unclear-deadline"
  | "mandatory-step-missing"
  | "procedural-blocker"
  | "available-option"
  | "judicial-discretion"
  | "rule-reference-needed"
  | "authority-registry-gap"
  | "urgent-procedure"
  | "settlement-step"
  | "trial-readiness"
  | "appeal-or-review"
  | "enforcement-step"
  | "unknown";

export type ProceduralSimulationState =
  | "intake-only"
  | "claim-or-application-not-started"
  | "originating-process-needed"
  | "awaiting-issuance-or-filing"
  | "awaiting-service"
  | "awaiting-proof-of-service"
  | "awaiting-response"
  | "response-period-active"
  | "default-or-uncontested-risk"
  | "conference-needed"
  | "motion-path"
  | "disclosure-or-discovery-needed"
  | "settlement-step-needed"
  | "trial-preparation"
  | "trial-ready-review"
  | "judgment-or-order-issued"
  | "enforcement-needed"
  | "appeal-review-needed"
  | "closed"
  | "unknown";

export type ProceduralRuleReference = {
  id: string;
  jurisdiction?: string;
  courtPath?: ProceduralCourtPath;
  ruleCode?: string;
  ruleTitle?: string;
  source?: string;
  summary?: string;
  appliesAtStages?: ProceduralCaseStage[];
  requiredActions?: string[];
  deadlines?: string[];
  serviceRequirements?: string[];
  filingRequirements?: string[];
  courtPowers?: string[];
  risks?: string[];
  authorityRegistryId?: string;
};

export type ProceduralKnownEvent = {
  id?: string;
  title?: string;
  description?: string;
  date?: string;
  eventType?: string;
  relatedEvidenceIds?: string[];
  source?: string;
};

export type ProceduralKnownDeadline = {
  id?: string;
  title?: string;
  dueDate?: string;
  source?: string;
  ruleCode?: string;
  consequence?: string;
  completed?: boolean;
};

export type ProceduralRequirement = {
  id?: string;
  label?: string;
  requiredAtStage?: ProceduralCaseStage;
  completed?: boolean;
  blockedBy?: string[];
  relatedRuleCodes?: string[];
  requiredEvidenceIds?: string[];
  explanation?: string;
};

export type ProceduralInvestigationInput = {
  caseId?: string;
  courtPath?: ProceduralCourtPath;
  province?: string;
  stage?: ProceduralCaseStage;
  rawNarrative?: string;

  knownEvents?: ProceduralKnownEvent[];
  knownDeadlines?: ProceduralKnownDeadline[];
  requirements?: ProceduralRequirement[];
  authorityReferences?: ProceduralRuleReference[];

  proceduralState?: {
    currentState?: string;
    readiness?: {
      overallReadiness?: ProceduralConfidence;
      serviceReadiness?: ProceduralConfidence;
      filingReadiness?: ProceduralConfidence;
      motionReadiness?: ProceduralConfidence;
      discoveryReadiness?: ProceduralConfidence;
      settlementReadiness?: ProceduralConfidence;
      preTrialReadiness?: ProceduralConfidence;
      costsReadiness?: ProceduralConfidence;
      assessmentReadiness?: ProceduralConfidence;
      deadlineReadiness?: ProceduralConfidence;
      blockers?: string[];
      nextActions?: string[];
    };
    warnings?: string[];
    risks?: Array<{
      id?: string;
      title?: string;
      severity?: string;
      explanation?: string;
      relatedRuleCodes?: string[];
    }>;
    dependencies?: Array<{
      id?: string;
      label?: string;
      dependsOn?: string[];
      blocked?: boolean;
      explanation?: string;
    }>;
    deadlines?: ProceduralKnownDeadline[];
  };

  workflowReadiness?: {
    blockers?: string[];
    nextActions?: string[];
    recommendedRoute?: string;
  };

  authorityWarnings?: string[];
  evidenceWarnings?: string[];
  burdenWarnings?: string[];
  litigationReasoningWarnings?: string[];
};

export type ProceduralInvestigationFinding = {
  id: string;
  category: ProceduralFindingCategory;
  severity: ProceduralSeverity;
  confidence: ProceduralConfidence;
  title: string;
  explanation: string;
  whyItMatters: string;
  recommendedQuestion: string;
  recommendedAction: string;
  proceduralState: ProceduralSimulationState;
  applicableRuleCodes: string[];
  authorityRegistryIds: string[];
  requiredUserInputs: string[];
  requiredDocuments: string[];
  requiredEvidenceIds: string[];
  deadlineSignals: string[];
  blockedNextSteps: string[];
  courtPowers: string[];
  risksIfIgnored: string[];
  source: string;
};

export type ProceduralInvestigationResult = {
  version: ProceduralInvestigatorVersion;
  generatedAt: string;
  caseId?: string;

  simulatedState: ProceduralSimulationState;
  proceduralReadinessScore: number;
  proceduralReadinessLevel: ProceduralConfidence;

  findings: ProceduralInvestigationFinding[];

  blockers: string[];
  mandatoryNextSteps: string[];
  availableOptions: string[];
  deadlineQuestions: string[];
  serviceQuestions: string[];
  filingQuestions: string[];
  courtPowerQuestions: string[];
  ruleReferenceQuestions: string[];
  authorityRegistryRequests: string[];

  topQuestions: string[];
  nextActions: string[];
  warnings: string[];

  summary: string;
};

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function clean(value: unknown): string {
  return String(value || "").trim();
}

function normalize(value: unknown): string {
  return clean(value).toLowerCase();
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function includesAny(text: unknown, terms: string[]): boolean {
  const normalizedText = normalize(text);
  return terms.some((term) => normalizedText.includes(normalize(term)));
}

function severityRank(value: ProceduralSeverity): number {
  if (value === "critical") return 5;
  if (value === "high") return 4;
  if (value === "medium") return 3;
  if (value === "low") return 2;
  return 1;
}

function confidenceRank(value: ProceduralConfidence): number {
  if (value === "very-high") return 5;
  if (value === "high") return 4;
  if (value === "medium") return 3;
  if (value === "low") return 2;
  return 1;
}

function confidenceFromScore(score: number): ProceduralConfidence {
  if (score >= 85) return "very-high";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  if (score >= 25) return "low";
  return "very-low";
}

function severityFromText(value: unknown): ProceduralSeverity {
  const text = normalize(value);

  if (includesAny(text, ["critical", "urgent", "expired", "barred", "blocked"])) {
    return "critical";
  }

  if (includesAny(text, ["high", "missing", "failed", "not served", "deadline"])) {
    return "high";
  }

  if (includesAny(text, ["warning", "concern", "unclear", "review", "risk"])) {
    return "medium";
  }

  if (includesAny(text, ["minor", "low"])) {
    return "low";
  }

  return "medium";
}

function inferSimulatedState(
  input: ProceduralInvestigationInput,
): ProceduralSimulationState {
  const stage = normalize(input.stage);
  const narrative = normalize(input.rawNarrative);
  const eventText = normalize(
    (input.knownEvents || [])
      .map((event) => `${event.title || ""} ${event.description || ""}`)
      .join(" "),
  );

  const combined = `${stage} ${narrative} ${eventText}`;

  if (stage === "closed" || includesAny(combined, ["closed", "resolved"])) {
    return "closed";
  }

  if (stage === "appeal" || includesAny(combined, ["appeal", "review"])) {
    return "appeal-review-needed";
  }

  if (stage === "enforcement" || includesAny(combined, ["enforce", "garnish", "writ"])) {
    return "enforcement-needed";
  }

  if (stage === "trial" || includesAny(combined, ["trial", "trial record"])) {
    return "trial-preparation";
  }

  if (stage === "motion" || stage === "urgent" || includesAny(combined, ["motion", "urgent"])) {
    return "motion-path";
  }

  if (stage === "conference" || includesAny(combined, ["conference"])) {
    return "conference-needed";
  }

  if (includesAny(combined, ["served"]) && includesAny(combined, ["defence", "answer", "response"])) {
    return "response-period-active";
  }

  if (includesAny(combined, ["issued", "filed"]) && !includesAny(combined, ["served"])) {
    return "awaiting-service";
  }

  if (includesAny(combined, ["served"]) && !includesAny(combined, ["affidavit of service", "proof of service"])) {
    return "awaiting-proof-of-service";
  }

  if (stage === "starting-case") return "originating-process-needed";
  if (stage === "responding") return "awaiting-response";
  if (stage === "pre-litigation") return "claim-or-application-not-started";
  if (stage === "not-sure" || !stage) return "unknown";

  return "intake-only";
}

function createFinding(args: {
  category: ProceduralFindingCategory;
  severity: ProceduralSeverity;
  confidence: ProceduralConfidence;
  title: string;
  explanation: string;
  whyItMatters: string;
  recommendedQuestion: string;
  recommendedAction: string;
  proceduralState: ProceduralSimulationState;
  applicableRuleCodes?: string[];
  authorityRegistryIds?: string[];
  requiredUserInputs?: string[];
  requiredDocuments?: string[];
  requiredEvidenceIds?: string[];
  deadlineSignals?: string[];
  blockedNextSteps?: string[];
  courtPowers?: string[];
  risksIfIgnored?: string[];
  source: string;
}): ProceduralInvestigationFinding {
  return {
    id: createId("procedural_investigation"),
    category: args.category,
    severity: args.severity,
    confidence: args.confidence,
    title: args.title,
    explanation: args.explanation,
    whyItMatters: args.whyItMatters,
    recommendedQuestion: args.recommendedQuestion,
    recommendedAction: args.recommendedAction,
    proceduralState: args.proceduralState,
    applicableRuleCodes: uniqueStrings(args.applicableRuleCodes || []),
    authorityRegistryIds: uniqueStrings(args.authorityRegistryIds || []),
    requiredUserInputs: uniqueStrings(args.requiredUserInputs || []),
    requiredDocuments: uniqueStrings(args.requiredDocuments || []),
    requiredEvidenceIds: uniqueStrings(args.requiredEvidenceIds || []),
    deadlineSignals: uniqueStrings(args.deadlineSignals || []),
    blockedNextSteps: uniqueStrings(args.blockedNextSteps || []),
    courtPowers: uniqueStrings(args.courtPowers || []),
    risksIfIgnored: uniqueStrings(args.risksIfIgnored || []),
    source: args.source,
  };
}

function buildStageFindings(
  input: ProceduralInvestigationInput,
  simulatedState: ProceduralSimulationState,
): ProceduralInvestigationFinding[] {
  const findings: ProceduralInvestigationFinding[] = [];
  const stage = normalize(input.stage);
  const courtPath = normalize(input.courtPath);

  if (!stage || stage === "not-sure") {
    findings.push(
      createFinding({
        category: "stage-unclear",
        severity: "high",
        confidence: "high",
        title: "Procedural stage is unclear",
        explanation:
          "The system cannot confidently determine where the case is in the court process.",
        whyItMatters:
          "Procedural stage controls deadlines, forms, service requirements, available motions, conference steps, settlement requirements, and trial readiness.",
        recommendedQuestion:
          "Is the user starting a case, responding to one, already in court, preparing for a conference, bringing a motion, going to trial, enforcing an order, or appealing?",
        recommendedAction:
          "Clarify the current procedural stage before generating court-ready forms or next-step instructions.",
        proceduralState: simulatedState,
        requiredUserInputs: [
          "Current stage",
          "Court file number if any",
          "What has been filed",
          "What has been served",
          "Next court date",
        ],
        risksIfIgnored: [
          "Wrong form selection",
          "Missed deadline",
          "Improper service",
          "Incorrect workflow route",
        ],
        source: "stage",
      }),
    );
  }

  if (!courtPath || courtPath === "unknown") {
    findings.push(
      createFinding({
        category: "wrong-court-path-risk",
        severity: "high",
        confidence: "high",
        title: "Court path is unclear",
        explanation:
          "The system does not yet know which court, tribunal, or procedural track applies.",
        whyItMatters:
          "Court path determines which rules apply, what forms are available, how service works, deadlines, filing method, and remedies.",
        recommendedQuestion:
          "Which court or tribunal is this for: Small Claims, Superior Court civil, family court, LTB, tribunal, immigration, criminal-related, or another path?",
        recommendedAction:
          "Confirm the court path before applying procedural rules or preparing materials.",
        proceduralState: simulatedState,
        requiredUserInputs: [
          "Court or tribunal",
          "Province",
          "Claim amount if relevant",
          "Type of legal issue",
        ],
        risksIfIgnored: [
          "Wrong forum",
          "Wrong rules",
          "Wrong forms",
          "Filing rejection",
        ],
        source: "courtPath",
      }),
    );
  }

  return findings;
}

function buildStateMachineFindings(
  input: ProceduralInvestigationInput,
  simulatedState: ProceduralSimulationState,
): ProceduralInvestigationFinding[] {
  const findings: ProceduralInvestigationFinding[] = [];

  if (simulatedState === "originating-process-needed") {
    findings.push(
      createFinding({
        category: "missing-filing",
        severity: "high",
        confidence: "medium",
        title: "Originating process appears needed",
        explanation:
          "The user appears to be starting a case, but the filing/issuing step is not confirmed.",
        whyItMatters:
          "A case usually cannot move through the court workflow until the correct originating document is prepared, issued, filed, and served.",
        recommendedQuestion:
          "What document starts this case, and has it been prepared, issued, filed, or served yet?",
        recommendedAction:
          "Identify the correct originating document and confirm whether it has been filed or issued.",
        proceduralState: simulatedState,
        requiredDocuments: [
          "Claim, application, or other originating process",
          "Court heading",
          "Backsheet if required",
          "Supporting affidavit if required",
        ],
        requiredUserInputs: [
          "Court path",
          "Stage",
          "Relief requested",
          "Defendant/respondent information",
        ],
        risksIfIgnored: [
          "Wrong starting document",
          "Filing rejection",
          "Service problems",
          "Deadline confusion",
        ],
        source: "proceduralStateSimulation",
      }),
    );
  }

  if (simulatedState === "awaiting-service") {
    findings.push(
      createFinding({
        category: "missing-service",
        severity: "critical",
        confidence: "high",
        title: "Service appears outstanding",
        explanation:
          "The case appears to have been filed or issued, but service has not been confirmed.",
        whyItMatters:
          "Many court steps cannot proceed properly until the other party is served in the required manner.",
        recommendedQuestion:
          "Who needs to be served, what document must be served, how will service be completed, and what deadline applies?",
        recommendedAction:
          "Confirm the service method, service deadline, service target, and proof-of-service requirement.",
        proceduralState: simulatedState,
        applicableRuleCodes: ["Rule 16"],
        requiredDocuments: [
          "Document to be served",
          "Affidavit of Service or proof of service",
        ],
        requiredUserInputs: [
          "Name of person/entity to be served",
          "Address for service",
          "Service method",
          "Service date or planned service date",
        ],
        courtPowers: [
          "Substituted service may be available where ordinary service is not possible, depending on the applicable rules.",
        ],
        risksIfIgnored: [
          "Case cannot proceed properly",
          "Default may be unavailable",
          "Steps may be set aside",
          "Deadline may be missed",
        ],
        source: "proceduralStateSimulation.service",
      }),
    );
  }

  if (simulatedState === "awaiting-proof-of-service") {
    findings.push(
      createFinding({
        category: "missing-proof-of-service",
        severity: "high",
        confidence: "high",
        title: "Proof of service is not confirmed",
        explanation:
          "The record suggests service may have occurred, but proof of service has not been confirmed.",
        whyItMatters:
          "Courts often require proof of service before allowing the next procedural step.",
        recommendedQuestion:
          "Was an Affidavit of Service or other proof of service completed, sworn/affirmed if required, and filed?",
        recommendedAction:
          "Prepare and file proof of service if service has been completed.",
        proceduralState: simulatedState,
        applicableRuleCodes: ["Rule 16"],
        requiredDocuments: ["Affidavit of Service", "Service details"],
        requiredUserInputs: [
          "Who served",
          "Who was served",
          "Date/time of service",
          "Address/location of service",
          "Method of service",
        ],
        risksIfIgnored: [
          "Court may not accept that service was completed",
          "Default or next procedural step may be delayed",
        ],
        source: "proceduralStateSimulation.proofOfService",
      }),
    );
  }

  if (simulatedState === "awaiting-response" || simulatedState === "response-period-active") {
    findings.push(
      createFinding({
        category: "missed-or-unclear-deadline",
        severity: "medium",
        confidence: "medium",
        title: "Response deadline should be calculated",
        explanation:
          "The case appears to be waiting for a response, but the response deadline is not confirmed.",
        whyItMatters:
          "Response deadlines affect default, next steps, scheduling, and whether the matter is defended.",
        recommendedQuestion:
          "When was the document served, and what deadline does the other side have to respond?",
        recommendedAction:
          "Calculate the response deadline from the service date using the applicable rules.",
        proceduralState: simulatedState,
        requiredUserInputs: [
          "Date of service",
          "Method of service",
          "Document served",
          "Court path",
        ],
        deadlineSignals: ["Response deadline depends on service date and applicable rules."],
        risksIfIgnored: [
          "Premature default step",
          "Missed response opportunity",
          "Incorrect next action",
        ],
        source: "proceduralStateSimulation.response",
      }),
    );
  }

  if (simulatedState === "conference-needed") {
    findings.push(
      createFinding({
        category: "mandatory-step-missing",
        severity: "medium",
        confidence: "medium",
        title: "Conference step requires preparation",
        explanation:
          "The case appears to be at or approaching a conference stage.",
        whyItMatters:
          "Conference steps often require briefs, disclosure, issue narrowing, settlement discussion, and compliance with court directions.",
        recommendedQuestion:
          "What conference is scheduled, what materials are due, and what issues must be addressed?",
        recommendedAction:
          "Identify conference type, due dates, required materials, and settlement/disclosure obligations.",
        proceduralState: simulatedState,
        requiredDocuments: [
          "Conference brief if required",
          "Updated financial/evidence disclosure if required",
          "Draft order or issue list if useful",
        ],
        requiredUserInputs: [
          "Conference date",
          "Conference type",
          "Materials deadline",
          "Issues in dispute",
        ],
        risksIfIgnored: [
          "Late materials",
          "Unprepared settlement discussion",
          "Court criticism",
          "Adjournment or cost risk",
        ],
        source: "proceduralStateSimulation.conference",
      }),
    );
  }

  if (simulatedState === "motion-path") {
    findings.push(
      createFinding({
        category: "urgent-procedure",
        severity: "high",
        confidence: "medium",
        title: "Motion or urgent procedure requires validation",
        explanation:
          "The case appears to involve a motion or urgent request.",
        whyItMatters:
          "Motions require proper procedural authority, evidence, service, deadlines, and requested relief.",
        recommendedQuestion:
          "What order is being requested, why is it needed now, what evidence supports it, and what rule allows this motion?",
        recommendedAction:
          "Confirm motion availability, evidence, service requirements, notice requirements, and proposed order.",
        proceduralState: simulatedState,
        requiredDocuments: [
          "Notice of motion if required",
          "Supporting affidavit",
          "Draft order",
          "Evidence exhibits",
          "Proof of service",
        ],
        requiredUserInputs: [
          "Requested order",
          "Urgency explanation",
          "Supporting evidence",
          "Opposing party notice status",
        ],
        courtPowers: [
          "Court may grant, dismiss, adjourn, impose terms, require service, or require further evidence depending on the motion and rules.",
        ],
        risksIfIgnored: [
          "Motion dismissed or adjourned",
          "Insufficient evidence",
          "Improper notice",
          "Costs risk",
        ],
        source: "proceduralStateSimulation.motion",
      }),
    );
  }

  if (simulatedState === "trial-preparation") {
    findings.push(
      createFinding({
        category: "trial-readiness",
        severity: "high",
        confidence: "medium",
        title: "Trial readiness must be assessed",
        explanation:
          "The case appears to be in or near trial preparation.",
        whyItMatters:
          "Trial readiness requires evidence organization, witness planning, exhibits, issue lists, procedural compliance, and final proof review.",
        recommendedQuestion:
          "Are pleadings closed, evidence organized, witnesses identified, trial materials prepared, and deadlines confirmed?",
        recommendedAction:
          "Run trial readiness review before generating final trial materials.",
        proceduralState: simulatedState,
        requiredDocuments: [
          "Trial record or trial materials if required",
          "Exhibit list",
          "Witness list",
          "Chronology",
          "Opening outline",
          "Authorities if needed",
        ],
        risksIfIgnored: [
          "Missing evidence at trial",
          "Witness problems",
          "Non-compliant materials",
          "Weak presentation",
        ],
        source: "proceduralStateSimulation.trial",
      }),
    );
  }

  return findings;
}

function buildDeadlineFindings(
  input: ProceduralInvestigationInput,
  simulatedState: ProceduralSimulationState,
): ProceduralInvestigationFinding[] {
  const findings: ProceduralInvestigationFinding[] = [];
  const deadlines = [
    ...(input.knownDeadlines || []),
    ...(input.proceduralState?.deadlines || []),
  ];

  if (deadlines.length === 0) {
    findings.push(
      createFinding({
        category: "missed-or-unclear-deadline",
        severity: "medium",
        confidence: "medium",
        title: "No procedural deadlines are recorded",
        explanation:
          "The case does not yet have structured procedural deadlines.",
        whyItMatters:
          "Deadlines control service, responses, motions, conferences, disclosure, trial materials, appeals, and enforcement steps.",
        recommendedQuestion:
          "What deadlines, court dates, service dates, filing dates, or response deadlines apply right now?",
        recommendedAction:
          "Add all known deadlines and calculate any missing procedural deadlines from the applicable rules.",
        proceduralState: simulatedState,
        requiredUserInputs: [
          "Service date",
          "Filing date",
          "Court date",
          "Response deadline",
          "Material deadline",
        ],
        risksIfIgnored: [
          "Missed deadline",
          "Late filing",
          "Lost procedural option",
          "Adjournment or costs",
        ],
        source: "deadlines",
      }),
    );

    return findings;
  }

  for (const deadline of deadlines) {
    if (!clean(deadline.dueDate)) {
      findings.push(
        createFinding({
          category: "missed-or-unclear-deadline",
          severity: "high",
          confidence: "high",
          title: `${clean(deadline.title) || "Deadline"} has no due date`,
          explanation:
            "A deadline item exists, but the actual due date is not recorded.",
          whyItMatters:
            "A deadline without a due date cannot reliably drive workflow or warnings.",
          recommendedQuestion:
            "What is the exact due date, and what event or rule creates that deadline?",
          recommendedAction:
            "Confirm and record the due date, source rule, and consequence.",
          proceduralState: simulatedState,
          applicableRuleCodes: deadline.ruleCode ? [deadline.ruleCode] : [],
          deadlineSignals: [deadline.title || "Unspecified deadline"],
          risksIfIgnored: [
            "Deadline may be missed",
            "Workflow may recommend the wrong next step",
          ],
          source: "knownDeadlines.missingDueDate",
        }),
      );
    }

    if (!deadline.completed && clean(deadline.consequence)) {
      findings.push(
        createFinding({
          category: "missed-or-unclear-deadline",
          severity: severityFromText(deadline.consequence),
          confidence: "medium",
          title: `${clean(deadline.title) || "Deadline"} may have consequences`,
          explanation: deadline.consequence || "Deadline consequence requires review.",
          whyItMatters:
            "Procedural deadlines can affect rights, default, admissibility, appeals, enforcement, and court discretion.",
          recommendedQuestion:
            "Has this deadline been met, extended, waived, or missed?",
          recommendedAction:
            "Confirm completion status and whether relief from the deadline is needed.",
          proceduralState: simulatedState,
          applicableRuleCodes: deadline.ruleCode ? [deadline.ruleCode] : [],
          deadlineSignals: [deadline.dueDate || "", deadline.consequence || ""],
          courtPowers: [
            "Court may have discretion to extend or abridge time depending on the applicable rule and context.",
          ],
          risksIfIgnored: [deadline.consequence || "Procedural consequence unknown."],
          source: "knownDeadlines.consequence",
        }),
      );
    }
  }

  return findings;
}

function buildRequirementFindings(
  input: ProceduralInvestigationInput,
  simulatedState: ProceduralSimulationState,
): ProceduralInvestigationFinding[] {
  const findings: ProceduralInvestigationFinding[] = [];

  for (const requirement of input.requirements || []) {
    if (requirement.completed) continue;

    findings.push(
      createFinding({
        category:
          (requirement.blockedBy || []).length > 0
            ? "procedural-blocker"
            : "mandatory-step-missing",
        severity: (requirement.blockedBy || []).length > 0 ? "high" : "medium",
        confidence: "medium",
        title: `${clean(requirement.label) || "Procedural requirement"} is incomplete`,
        explanation:
          requirement.explanation ||
          "A procedural requirement has not yet been completed.",
        whyItMatters:
          "Incomplete procedural requirements may block the next workflow step or create court compliance risk.",
        recommendedQuestion:
          "What is needed to complete this procedural requirement?",
        recommendedAction:
          "Complete the requirement or identify what rule, document, evidence, or court direction controls it.",
        proceduralState: simulatedState,
        applicableRuleCodes: requirement.relatedRuleCodes || [],
        requiredEvidenceIds: requirement.requiredEvidenceIds || [],
        blockedNextSteps: requirement.blockedBy || [],
        risksIfIgnored: [
          "Next workflow step may be blocked",
          "Court materials may be incomplete",
          "Compliance risk may increase",
        ],
        source: "requirements",
      }),
    );
  }

  return findings;
}

function buildRuleReferenceFindings(
  input: ProceduralInvestigationInput,
  simulatedState: ProceduralSimulationState,
): ProceduralInvestigationFinding[] {
  const findings: ProceduralInvestigationFinding[] = [];
  const references = input.authorityReferences || [];

  if (references.length === 0) {
    findings.push(
      createFinding({
        category: "authority-registry-gap",
        severity: "medium",
        confidence: "medium",
        title: "No procedural rule references supplied",
        explanation:
          "The Procedural Investigator did not receive rule or authority registry references.",
        whyItMatters:
          "Procedural recommendations are stronger when linked to verified rules, forms, deadlines, service requirements, and court powers.",
        recommendedQuestion:
          "Which procedural rules, forms, deadlines, service rules, or Annual Practice registry entries apply to this step?",
        recommendedAction:
          "Connect the current procedural state to the Authority Registry before relying on rule-specific recommendations.",
        proceduralState: simulatedState,
        authorityRegistryIds: [],
        risksIfIgnored: [
          "Procedural recommendation may be generic",
          "Rule-specific deadline or form may be missed",
        ],
        source: "authorityReferences",
      }),
    );

    return findings;
  }

  for (const reference of references) {
    const ruleCode = clean(reference.ruleCode);
    const registryId = clean(reference.authorityRegistryId);

    findings.push(
      createFinding({
        category: "rule-reference-needed",
        severity: "info",
        confidence: "medium",
        title: `${ruleCode || "Procedural rule"} connected`,
        explanation:
          reference.summary ||
          "A procedural authority reference is connected to this case.",
        whyItMatters:
          "Rule references help CourtSimplified avoid generic procedural guidance and connect steps to verified authority.",
        recommendedQuestion:
          "Does this rule create a deadline, service requirement, filing requirement, court power, or required next step?",
        recommendedAction:
          "Use this rule reference to validate the next procedural step.",
        proceduralState: simulatedState,
        applicableRuleCodes: ruleCode ? [ruleCode] : [],
        authorityRegistryIds: registryId ? [registryId] : [],
        requiredDocuments: [
          ...(reference.requiredActions || []),
          ...(reference.filingRequirements || []),
        ],
        deadlineSignals: reference.deadlines || [],
        courtPowers: reference.courtPowers || [],
        risksIfIgnored: reference.risks || [],
        source: "authorityReferences.rule",
      }),
    );

    for (const requirement of reference.serviceRequirements || []) {
      findings.push(
        createFinding({
          category: "missing-service",
          severity: "medium",
          confidence: "medium",
          title: `${ruleCode || "Rule"} service requirement`,
          explanation: requirement,
          whyItMatters:
            "Service rules affect whether the other party has proper notice and whether the case can proceed.",
          recommendedQuestion:
            "Has this service requirement been satisfied and documented?",
          recommendedAction:
            "Confirm method of service and proof of service.",
          proceduralState: simulatedState,
          applicableRuleCodes: ruleCode ? [ruleCode] : [],
          authorityRegistryIds: registryId ? [registryId] : [],
          requiredDocuments: ["Proof of service"],
          risksIfIgnored: [
            "Service may be challenged",
            "Next step may be delayed or set aside",
          ],
          source: "authorityReferences.service",
        }),
      );
    }
  }

  return findings;
}

function buildWarningFindings(
  input: ProceduralInvestigationInput,
  simulatedState: ProceduralSimulationState,
): ProceduralInvestigationFinding[] {
  const warnings = [
    ...(input.proceduralState?.warnings || []),
    ...(input.proceduralState?.readiness?.blockers || []),
    ...(input.workflowReadiness?.blockers || []),
    ...(input.authorityWarnings || []),
    ...(input.evidenceWarnings || []),
    ...(input.burdenWarnings || []),
    ...(input.litigationReasoningWarnings || []),
  ];

  return warnings.map((warning) =>
    createFinding({
      category: includesAny(warning, ["serve", "service"])
        ? "missing-service"
        : includesAny(warning, ["file", "filing", "issued"])
          ? "missing-filing"
          : includesAny(warning, ["deadline", "late", "expired"])
            ? "missed-or-unclear-deadline"
            : includesAny(warning, ["rule", "authority"])
              ? "rule-reference-needed"
              : includesAny(warning, ["block", "cannot", "missing"])
                ? "procedural-blocker"
                : "unknown",
      severity: severityFromText(warning),
      confidence: "medium",
      title: "Procedural warning",
      explanation: warning,
      whyItMatters:
        "Procedural warnings can affect whether the case can safely move to the next step.",
      recommendedQuestion:
        "What procedural fact, document, rule, date, service proof, or court direction resolves this warning?",
      recommendedAction:
        "Resolve the warning before relying on the next workflow recommendation.",
      proceduralState: simulatedState,
      requiredUserInputs: [
        "Current procedural fact",
        "Relevant date",
        "Document status",
        "Service or filing status",
      ],
      risksIfIgnored: [
        "Incorrect next step",
        "Deadline risk",
        "Court compliance issue",
      ],
      source: "crossSystemWarnings",
    }),
  );
}

function calculateReadinessScore(findings: ProceduralInvestigationFinding[]): number {
  let score = 90;

  for (const finding of findings) {
    if (finding.severity === "critical") score -= 20;
    else if (finding.severity === "high") score -= 12;
    else if (finding.severity === "medium") score -= 6;
    else if (finding.severity === "low") score -= 2;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function findingsByCategory(
  findings: ProceduralInvestigationFinding[],
  category: ProceduralFindingCategory,
): ProceduralInvestigationFinding[] {
  return findings.filter((finding) => finding.category === category);
}

function questionsFromFindings(
  findings: ProceduralInvestigationFinding[],
): string[] {
  return uniqueStrings(
    findings
      .slice()
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((finding) => finding.recommendedQuestion),
  );
}

function actionsFromFindings(
  findings: ProceduralInvestigationFinding[],
): string[] {
  return uniqueStrings(
    findings
      .slice()
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((finding) => finding.recommendedAction),
  );
}

function collectionFromFindings(
  findings: ProceduralInvestigationFinding[],
  selector: (finding: ProceduralInvestigationFinding) => string[],
): string[] {
  return uniqueStrings(findings.flatMap(selector));
}

export function buildProceduralInvestigation(
  input: ProceduralInvestigationInput,
): ProceduralInvestigationResult {
  const simulatedState = inferSimulatedState(input);

  const findings = [
    ...buildStageFindings(input, simulatedState),
    ...buildStateMachineFindings(input, simulatedState),
    ...buildDeadlineFindings(input, simulatedState),
    ...buildRequirementFindings(input, simulatedState),
    ...buildRuleReferenceFindings(input, simulatedState),
    ...buildWarningFindings(input, simulatedState),
  ].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const proceduralReadinessScore = calculateReadinessScore(findings);
  const proceduralReadinessLevel = confidenceFromScore(proceduralReadinessScore);

  const blockers = collectionFromFindings(findings, (finding) => [
    ...finding.blockedNextSteps,
    ...(finding.category === "procedural-blocker" ? [finding.title] : []),
  ]);

  const topQuestions = questionsFromFindings(findings).slice(0, 14);

  const warnings = uniqueStrings([
    ...(input.proceduralState?.warnings || []),
    ...(input.proceduralState?.readiness?.blockers || []),
    ...(input.workflowReadiness?.blockers || []),
    ...findings
      .filter((finding) => severityRank(finding.severity) >= 4)
      .map((finding) => finding.title),
  ]);

  return {
    version: "2.0.0",
    generatedAt: nowIso(),
    caseId: input.caseId,

    simulatedState,
    proceduralReadinessScore,
    proceduralReadinessLevel,

    findings,

    blockers,
    mandatoryNextSteps: actionsFromFindings(
      findings.filter((finding) =>
        ["mandatory-step-missing", "missing-filing", "missing-service"].includes(
          finding.category,
        ),
      ),
    ),
    availableOptions: actionsFromFindings(
      findings.filter((finding) => finding.category === "available-option"),
    ),
    deadlineQuestions: questionsFromFindings(
      findingsByCategory(findings, "missed-or-unclear-deadline"),
    ),
    serviceQuestions: questionsFromFindings(
      findings.filter((finding) =>
        ["missing-service", "missing-proof-of-service"].includes(finding.category),
      ),
    ),
    filingQuestions: questionsFromFindings(
      findingsByCategory(findings, "missing-filing"),
    ),
    courtPowerQuestions: collectionFromFindings(
      findings,
      (finding) => finding.courtPowers,
    ),
    ruleReferenceQuestions: questionsFromFindings(
      findings.filter((finding) =>
        ["rule-reference-needed", "authority-registry-gap"].includes(
          finding.category,
        ),
      ),
    ),
    authorityRegistryRequests: collectionFromFindings(
      findings,
      (finding) => finding.authorityRegistryIds,
    ),

    topQuestions,
    nextActions: uniqueStrings([
      ...actionsFromFindings(findings).slice(0, 12),
      ...(input.proceduralState?.readiness?.nextActions || []),
      ...(input.workflowReadiness?.nextActions || []),
      "Confirm the procedural stage, court path, filing status, service status, and next deadline before generating court-ready materials.",
    ]).slice(0, 18),

    warnings,

    summary:
      findings.length > 0
        ? `Procedural Investigator simulated state "${simulatedState}" with readiness ${proceduralReadinessLevel} (${proceduralReadinessScore}/100) and found ${findings.length} procedural issue(s), option(s), or warning(s).`
        : `Procedural Investigator simulated state "${simulatedState}" with readiness ${proceduralReadinessLevel} (${proceduralReadinessScore}/100) and found no major procedural issues.`,
  };
}