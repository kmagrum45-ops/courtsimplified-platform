export type TrialReadinessInvestigatorVersion = "2.0.0";

export type TrialReadinessSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type TrialReadinessConfidence =
  | "very-low"
  | "low"
  | "medium"
  | "high"
  | "very-high";

export type TrialReadinessLevel =
  | "not-ready"
  | "early-preparation"
  | "partially-ready"
  | "mostly-ready"
  | "trial-ready";

export type TrialReadinessCategory =
  | "pleadings-readiness"
  | "issue-readiness"
  | "proof-readiness"
  | "evidence-readiness"
  | "witness-readiness"
  | "exhibit-readiness"
  | "timeline-readiness"
  | "damages-readiness"
  | "authority-readiness"
  | "procedure-readiness"
  | "credibility-readiness"
  | "contradiction-readiness"
  | "opponent-attack-readiness"
  | "settlement-history"
  | "trial-materials"
  | "court-order-compliance"
  | "unknown";

export type TrialReadinessInput = {
  caseId?: string;
  courtPath?: string;
  province?: string;
  stage?: string;
  rawNarrative?: string;
  desiredOutcome?: string;
  claimAmount?: number;

  evidenceFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    linkedEvidenceIds?: string[];
  }>;

  burdenFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    linkedClaimIds?: string[];
    linkedEvidenceIds?: string[];
  }>;

  proceduralFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    recommendedAction?: string;
    applicableRuleCodes?: string[];
    authorityRegistryIds?: string[];
  }>;

  credibilityFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    linkedClaimIds?: string[];
    linkedEvidenceIds?: string[];
  }>;

  contradictionFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    linkedClaimIds?: string[];
    linkedEvidenceIds?: string[];
  }>;

  authorityFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    authorityRegistryIds?: string[];
    applicableRuleCodes?: string[];
  }>;

  judgePerspectiveFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    likelyJudgeQuestion?: string;
  }>;

  opponentStrategyFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    likelyOpponentArgument?: string;
    recommendedResponse?: string;
  }>;

  settlementFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    recommendedAction?: string;
  }>;

  litigationReasoning?: {
    readinessScore?: number;
    readinessLevel?: string;
    strongestCasePoints?: string[];
    weakestCasePoints?: string[];
    judicialConcerns?: string[];
    opposingArguments?: string[];
    missingWork?: string[];
    nextActions?: string[];
    warnings?: string[];
  };

  workflowReadiness?: {
    blockers?: string[];
    nextActions?: string[];
    recommendedRoute?: string;
  };

  trialMaterials?: {
    pleadingsReady?: boolean;
    issueListReady?: boolean;
    witnessListReady?: boolean;
    exhibitListReady?: boolean;
    chronologyReady?: boolean;
    damagesCalculationReady?: boolean;
    authoritiesReady?: boolean;
    trialBriefReady?: boolean;
    draftOrderReady?: boolean;
    serviceProofReady?: boolean;
    settlementHistoryReady?: boolean;
  };

  witnesses?: Array<{
    id?: string;
    name?: string;
    role?: string;
    expectedEvidence?: string;
    confirmed?: boolean;
    credibilityRisk?: string;
    linkedEvidenceIds?: string[];
  }>;

  exhibits?: Array<{
    id?: string;
    label?: string;
    title?: string;
    description?: string;
    source?: string;
    date?: string;
    authenticated?: boolean;
    linkedIssue?: string;
    linkedClaimIds?: string[];
  }>;

  warnings?: string[];
};

export type TrialReadinessFinding = {
  id: string;
  category: TrialReadinessCategory;
  severity: TrialReadinessSeverity;
  confidence: TrialReadinessConfidence;
  title: string;
  explanation: string;
  trialImpact: string;
  judgeConcern: string;
  opponentAttack: string;
  recommendedQuestion: string;
  recommendedAction: string;
  requiredBeforeTrial: string[];
  materialsToPrepare: string[];
  linkedClaimIds: string[];
  linkedEvidenceIds: string[];
  applicableRuleCodes: string[];
  authorityRegistryIds: string[];
  source: string;
};

export type TrialReadinessIntelligence = {
  trialReadinessScore: number;
  evidenceReadinessScore: number;
  witnessReadinessScore: number;
  procedureReadinessScore: number;
  proofReadinessScore: number;
  credibilityReadinessScore: number;
  authorityReadinessScore: number;
  overallReadinessLevel: TrialReadinessLevel;
  confidence: TrialReadinessConfidence;
};

export type TrialReadinessResult = {
  version: TrialReadinessInvestigatorVersion;
  generatedAt: string;
  caseId?: string;

  intelligence: TrialReadinessIntelligence;
  findings: TrialReadinessFinding[];

  trialBlockers: string[];
  requiredBeforeTrial: string[];
  missingTrialMaterials: string[];
  witnessPreparationTasks: string[];
  exhibitPreparationTasks: string[];
  proofPreparationTasks: string[];
  authorityPreparationTasks: string[];
  credibilityPreparationTasks: string[];
  contradictionPreparationTasks: string[];
  opponentAttackPreparationTasks: string[];
  judgeQuestionPreparationTasks: string[];

  trialStrengths: string[];
  trialWeaknesses: string[];
  nextActions: string[];
  warnings: string[];
  summary: string;
};

type ImportedTrialSignal = {
  source: string;
  title?: string;
  category?: string;
  severity?: string;
  explanation?: string;
  linkedClaimIds: string[];
  linkedEvidenceIds: string[];
  applicableRuleCodes: string[];
  authorityRegistryIds: string[];
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

function includesAny(value: unknown, terms: string[]): boolean {
  const text = normalize(value);
  return terms.some((term) => text.includes(normalize(term)));
}

function severityRank(value: TrialReadinessSeverity): number {
  if (value === "critical") return 5;
  if (value === "high") return 4;
  if (value === "medium") return 3;
  if (value === "low") return 2;
  return 1;
}

function confidenceFromScore(score: number): TrialReadinessConfidence {
  if (score >= 85) return "very-high";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  if (score >= 25) return "low";
  return "very-low";
}

function readinessLevelFromScore(score: number): TrialReadinessLevel {
  if (score >= 85) return "trial-ready";
  if (score >= 70) return "mostly-ready";
  if (score >= 45) return "partially-ready";
  if (score >= 25) return "early-preparation";
  return "not-ready";
}

function severityFromText(value: unknown): TrialReadinessSeverity {
  const text = normalize(value);

  if (includesAny(text, ["critical", "blocked", "unsafe", "contradicted"])) {
    return "critical";
  }

  if (
    includesAny(text, [
      "high",
      "missing",
      "weak",
      "no proof",
      "deadline",
      "not ready",
    ])
  ) {
    return "high";
  }

  if (includesAny(text, ["concern", "unclear", "review", "gap", "risk"])) {
    return "medium";
  }

  if (includesAny(text, ["minor", "low"])) return "low";

  return "medium";
}

function categoryFromText(value: unknown): TrialReadinessCategory {
  const text = normalize(value);

  if (includesAny(text, ["pleading", "claim", "defence", "application"])) {
    return "pleadings-readiness";
  }

  if (includesAny(text, ["issue", "dispute", "question for trial"])) {
    return "issue-readiness";
  }

  if (includesAny(text, ["burden", "proof", "onus", "element"])) {
    return "proof-readiness";
  }

  if (
    includesAny(text, [
      "evidence",
      "document",
      "screenshot",
      "record",
      "authentic",
      "foundation",
    ])
  ) {
    return "evidence-readiness";
  }

  if (includesAny(text, ["witness", "testify", "cross-examination"])) {
    return "witness-readiness";
  }

  if (includesAny(text, ["exhibit", "exhibit list", "bundle"])) {
    return "exhibit-readiness";
  }

  if (includesAny(text, ["timeline", "chronology", "date", "sequence"])) {
    return "timeline-readiness";
  }

  if (includesAny(text, ["damage", "amount", "money", "remedy", "order"])) {
    return "damages-readiness";
  }

  if (includesAny(text, ["authority", "rule", "statute", "case law"])) {
    return "authority-readiness";
  }

  if (
    includesAny(text, ["procedure", "served", "filed", "deadline", "conference"])
  ) {
    return "procedure-readiness";
  }

  if (includesAny(text, ["credibility", "believe", "reliable"])) {
    return "credibility-readiness";
  }

  if (includesAny(text, ["contradiction", "inconsistent", "conflict"])) {
    return "contradiction-readiness";
  }

  if (includesAny(text, ["opponent", "other side", "attack"])) {
    return "opponent-attack-readiness";
  }

  if (includesAny(text, ["settlement", "offer", "conference"])) {
    return "settlement-history";
  }

  if (includesAny(text, ["trial brief", "trial record", "draft order"])) {
    return "trial-materials";
  }

  if (includesAny(text, ["order", "direction", "compliance"])) {
    return "court-order-compliance";
  }

  return "unknown";
}

function createFinding(args: {
  category: TrialReadinessCategory;
  severity: TrialReadinessSeverity;
  confidence: TrialReadinessConfidence;
  title: string;
  explanation: string;
  trialImpact: string;
  judgeConcern: string;
  opponentAttack: string;
  recommendedQuestion: string;
  recommendedAction: string;
  requiredBeforeTrial: string[];
  materialsToPrepare: string[];
  linkedClaimIds?: string[];
  linkedEvidenceIds?: string[];
  applicableRuleCodes?: string[];
  authorityRegistryIds?: string[];
  source: string;
}): TrialReadinessFinding {
  return {
    id: createId("trial_readiness"),
    category: args.category,
    severity: args.severity,
    confidence: args.confidence,
    title: args.title,
    explanation: args.explanation,
    trialImpact: args.trialImpact,
    judgeConcern: args.judgeConcern,
    opponentAttack: args.opponentAttack,
    recommendedQuestion: args.recommendedQuestion,
    recommendedAction: args.recommendedAction,
    requiredBeforeTrial: uniqueStrings(args.requiredBeforeTrial),
    materialsToPrepare: uniqueStrings(args.materialsToPrepare),
    linkedClaimIds: uniqueStrings(args.linkedClaimIds || []),
    linkedEvidenceIds: uniqueStrings(args.linkedEvidenceIds || []),
    applicableRuleCodes: uniqueStrings(args.applicableRuleCodes || []),
    authorityRegistryIds: uniqueStrings(args.authorityRegistryIds || []),
    source: args.source,
  };
}

function normalizeImportedSignals(input: TrialReadinessInput): ImportedTrialSignal[] {
  return [
    ...(input.evidenceFindings || []).map((item) => ({
      source: "evidenceFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedClaimIds: [],
      linkedEvidenceIds: item.linkedEvidenceIds || [],
      applicableRuleCodes: [],
      authorityRegistryIds: [],
    })),
    ...(input.burdenFindings || []).map((item) => ({
      source: "burdenFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedClaimIds: item.linkedClaimIds || [],
      linkedEvidenceIds: item.linkedEvidenceIds || [],
      applicableRuleCodes: [],
      authorityRegistryIds: [],
    })),
    ...(input.proceduralFindings || []).map((item) => ({
      source: "proceduralFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation || item.recommendedAction,
      linkedClaimIds: [],
      linkedEvidenceIds: [],
      applicableRuleCodes: item.applicableRuleCodes || [],
      authorityRegistryIds: item.authorityRegistryIds || [],
    })),
    ...(input.credibilityFindings || []).map((item) => ({
      source: "credibilityFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedClaimIds: item.linkedClaimIds || [],
      linkedEvidenceIds: item.linkedEvidenceIds || [],
      applicableRuleCodes: [],
      authorityRegistryIds: [],
    })),
    ...(input.contradictionFindings || []).map((item) => ({
      source: "contradictionFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedClaimIds: item.linkedClaimIds || [],
      linkedEvidenceIds: item.linkedEvidenceIds || [],
      applicableRuleCodes: [],
      authorityRegistryIds: [],
    })),
    ...(input.authorityFindings || []).map((item) => ({
      source: "authorityFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedClaimIds: [],
      linkedEvidenceIds: [],
      applicableRuleCodes: item.applicableRuleCodes || [],
      authorityRegistryIds: item.authorityRegistryIds || [],
    })),
    ...(input.judgePerspectiveFindings || []).map((item) => ({
      source: "judgePerspectiveFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation || item.likelyJudgeQuestion,
      linkedClaimIds: [],
      linkedEvidenceIds: [],
      applicableRuleCodes: [],
      authorityRegistryIds: [],
    })),
    ...(input.opponentStrategyFindings || []).map((item) => ({
      source: "opponentStrategyFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation:
        item.explanation ||
        item.likelyOpponentArgument ||
        item.recommendedResponse,
      linkedClaimIds: [],
      linkedEvidenceIds: [],
      applicableRuleCodes: [],
      authorityRegistryIds: [],
    })),
    ...(input.settlementFindings || []).map((item) => ({
      source: "settlementFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation || item.recommendedAction,
      linkedClaimIds: [],
      linkedEvidenceIds: [],
      applicableRuleCodes: [],
      authorityRegistryIds: [],
    })),
  ];
}

function buildImportedFindings(input: TrialReadinessInput): TrialReadinessFinding[] {
  return normalizeImportedSignals(input).map((item) => {
    const text = `${item.title || ""} ${item.category || ""} ${
      item.explanation || ""
    }`;
    const category = categoryFromText(text);
    const severity = severityFromText(item.severity || text);

    return createFinding({
      category,
      severity,
      confidence: "medium",
      title: item.title || "Trial readiness issue",
      explanation:
        item.explanation ||
        "This imported issue may affect trial readiness.",
      trialImpact:
        "This factor may affect whether the case is ready to be presented at a hearing or trial.",
      judgeConcern:
        "A judge may ask whether this issue has been resolved, supported, disclosed, or organized before trial.",
      opponentAttack:
        "The opposing party may use this issue to attack proof, credibility, procedure, remedy, or readiness.",
      recommendedQuestion:
        "What must be fixed, prepared, organized, or proven before this point is trial-ready?",
      recommendedAction:
        "Resolve this issue or prepare a clear trial-ready answer with evidence, witnesses, procedure, and authority where needed.",
      requiredBeforeTrial: [
        "Clear issue",
        "Supporting evidence",
        "Witness or document foundation",
        "Trial-ready explanation",
      ],
      materialsToPrepare: [
        "Trial issue list",
        "Evidence bundle",
        "Witness notes",
        "Chronology",
        "Proof map",
      ],
      linkedClaimIds: item.linkedClaimIds,
      linkedEvidenceIds: item.linkedEvidenceIds,
      applicableRuleCodes: item.applicableRuleCodes,
      authorityRegistryIds: item.authorityRegistryIds,
      source: item.source,
    });
  });
}

function buildTrialMaterialFindings(
  input: TrialReadinessInput,
): TrialReadinessFinding[] {
  const materials = input.trialMaterials;
  const findings: TrialReadinessFinding[] = [];

  if (!materials) {
    return [
      createFinding({
        category: "trial-materials",
        severity: "high",
        confidence: "high",
        title: "No trial materials status supplied",
        explanation:
          "The system does not yet know whether trial materials have been prepared.",
        trialImpact:
          "Trial materials are needed to organize issues, evidence, witnesses, remedies, and authority.",
        judgeConcern:
          "The court may expect organized materials and clear identification of issues and evidence.",
        opponentAttack:
          "The other side may argue the user is not prepared or has not organized the record properly.",
        recommendedQuestion:
          "Are pleadings, issue list, witnesses, exhibits, chronology, damages calculation, authorities, draft order, and settlement history ready?",
        recommendedAction:
          "Create a trial materials checklist and mark each item as ready, missing, or not applicable.",
        requiredBeforeTrial: [
          "Pleadings reviewed",
          "Issue list",
          "Witness list",
          "Exhibit list",
          "Chronology",
          "Damages/remedy calculation",
          "Authorities if needed",
        ],
        materialsToPrepare: [
          "Trial checklist",
          "Trial brief or notes",
          "Exhibit list",
          "Witness list",
          "Chronology",
        ],
        source: "trialMaterials",
      }),
    ];
  }

  const requiredMaterials: Array<{
    key: keyof NonNullable<TrialReadinessInput["trialMaterials"]>;
    label: string;
    category: TrialReadinessCategory;
    prepare: string[];
  }> = [
    {
      key: "pleadingsReady",
      label: "Pleadings",
      category: "pleadings-readiness",
      prepare: ["Statement of claim/application", "Defence/response", "Reply if any"],
    },
    {
      key: "issueListReady",
      label: "Issue list",
      category: "issue-readiness",
      prepare: ["List of live issues", "What each side disputes", "What is admitted"],
    },
    {
      key: "witnessListReady",
      label: "Witness list",
      category: "witness-readiness",
      prepare: ["Witness names", "What each witness proves", "Contact/availability"],
    },
    {
      key: "exhibitListReady",
      label: "Exhibit list",
      category: "exhibit-readiness",
      prepare: ["Exhibit labels", "Descriptions", "Issue links", "Source/date"],
    },
    {
      key: "chronologyReady",
      label: "Chronology",
      category: "timeline-readiness",
      prepare: ["Dated event list", "Source for each event", "Timeline gaps"],
    },
    {
      key: "damagesCalculationReady",
      label: "Damages or remedy calculation",
      category: "damages-readiness",
      prepare: ["Amount table", "Receipts/invoices", "Requested order"],
    },
    {
      key: "authoritiesReady",
      label: "Authorities",
      category: "authority-readiness",
      prepare: ["Rules", "Statutes", "Cases if needed", "Registry references"],
    },
    {
      key: "trialBriefReady",
      label: "Trial brief or trial notes",
      category: "trial-materials",
      prepare: ["Opening outline", "Issue/proof map", "Questions", "Closing points"],
    },
    {
      key: "draftOrderReady",
      label: "Draft order",
      category: "damages-readiness",
      prepare: ["Requested terms", "Amounts", "Deadlines", "Dismissal/release terms"],
    },
    {
      key: "serviceProofReady",
      label: "Proof of service",
      category: "procedure-readiness",
      prepare: ["Affidavit/proof of service", "Service date", "Method", "Served documents"],
    },
    {
      key: "settlementHistoryReady",
      label: "Settlement history",
      category: "settlement-history",
      prepare: ["Offers", "Responses", "Dates", "Remaining issues"],
    },
  ];

  for (const material of requiredMaterials) {
    if (!materials[material.key]) {
      findings.push(
        createFinding({
          category: material.category,
          severity: "high",
          confidence: "high",
          title: `${material.label} not ready`,
          explanation: `${material.label} has not been marked ready for trial.`,
          trialImpact:
            "Missing trial materials can make the case harder to present and may create procedural or evidentiary problems.",
          judgeConcern:
            "The judge may need clear materials to understand the issues, evidence, witnesses, and requested order.",
          opponentAttack:
            "The other side may argue the user is unprepared or has not proven the required points.",
          recommendedQuestion: `What is still needed to make ${material.label} trial-ready?`,
          recommendedAction: `Prepare and review ${material.label} before trial.`,
          requiredBeforeTrial: material.prepare,
          materialsToPrepare: material.prepare,
          source: "trialMaterials.checklist",
        }),
      );
    }
  }

  return findings;
}

function buildWitnessFindings(input: TrialReadinessInput): TrialReadinessFinding[] {
  const witnesses = input.witnesses || [];

  if (witnesses.length === 0) {
    return [
      createFinding({
        category: "witness-readiness",
        severity: "medium",
        confidence: "medium",
        title: "No witnesses identified",
        explanation:
          "No witnesses have been supplied to the Trial Readiness Investigator.",
        trialImpact:
          "Some issues may require direct testimony or witness confirmation.",
        judgeConcern:
          "The judge may ask who can prove disputed events beyond documents alone.",
        opponentAttack:
          "The other side may argue the user's version is unsupported by witnesses.",
        recommendedQuestion:
          "Who needs to testify, what will each witness prove, and are they available?",
        recommendedAction:
          "Create a witness list and connect each witness to issues, events, and evidence.",
        requiredBeforeTrial: [
          "Witness names",
          "Expected evidence",
          "Availability",
          "Linked issues",
        ],
        materialsToPrepare: ["Witness list", "Witness notes", "Question outline"],
        source: "witnesses",
      }),
    ];
  }

  const findings: TrialReadinessFinding[] = [];

  for (const witness of witnesses) {
    const name = clean(witness.name) || "Witness";

    if (!witness.confirmed) {
      findings.push(
        createFinding({
          category: "witness-readiness",
          severity: "high",
          confidence: "high",
          title: `${name} not confirmed`,
          explanation:
            "This witness has not been confirmed as available or ready.",
          trialImpact:
            "Unconfirmed witnesses can create proof gaps at trial.",
          judgeConcern:
            "The judge may need admissible evidence from someone with direct knowledge.",
          opponentAttack:
            "The other side may argue the evidence is unsupported if the witness does not appear.",
          recommendedQuestion:
            "Is this witness available, willing, and prepared to give evidence?",
          recommendedAction:
            "Confirm witness availability and prepare a witness evidence summary.",
          requiredBeforeTrial: [
            "Availability",
            "Expected evidence",
            "Direct knowledge",
            "Linked exhibits",
          ],
          materialsToPrepare: ["Witness summary", "Question outline"],
          linkedEvidenceIds: witness.linkedEvidenceIds || [],
          source: "witnesses.confirmed",
        }),
      );
    }

    if (!clean(witness.expectedEvidence)) {
      findings.push(
        createFinding({
          category: "witness-readiness",
          severity: "medium",
          confidence: "medium",
          title: `${name} has no expected evidence summary`,
          explanation:
            "The system does not know what this witness is expected to prove.",
          trialImpact:
            "Witnesses should be tied to specific issues and facts.",
          judgeConcern:
            "The judge may ask why the witness is relevant.",
          opponentAttack:
            "The other side may object to irrelevant or unclear witness evidence.",
          recommendedQuestion:
            "What exact facts will this witness prove from personal knowledge?",
          recommendedAction:
            "Write a short expected evidence summary for this witness.",
          requiredBeforeTrial: ["Expected evidence summary", "Linked issues"],
          materialsToPrepare: ["Witness proof summary"],
          linkedEvidenceIds: witness.linkedEvidenceIds || [],
          source: "witnesses.expectedEvidence",
        }),
      );
    }

    if (clean(witness.credibilityRisk)) {
      findings.push(
        createFinding({
          category: "credibility-readiness",
          severity: severityFromText(witness.credibilityRisk),
          confidence: "medium",
          title: `${name} credibility risk`,
          explanation: witness.credibilityRisk || "Witness credibility risk.",
          trialImpact:
            "Witness credibility problems can affect whether evidence is accepted.",
          judgeConcern:
            "The judge may question reliability, bias, memory, or consistency.",
          opponentAttack:
            "The other side may cross-examine this witness on credibility.",
          recommendedQuestion:
            "How will this witness credibility risk be answered at trial?",
          recommendedAction:
            "Prepare a credibility response and corroborating evidence.",
          requiredBeforeTrial: ["Credibility explanation", "Corroboration"],
          materialsToPrepare: ["Credibility notes", "Cross-examination prep"],
          linkedEvidenceIds: witness.linkedEvidenceIds || [],
          source: "witnesses.credibilityRisk",
        }),
      );
    }
  }

  return findings;
}

function buildExhibitFindings(input: TrialReadinessInput): TrialReadinessFinding[] {
  const exhibits = input.exhibits || [];

  if (exhibits.length === 0) {
    return [
      createFinding({
        category: "exhibit-readiness",
        severity: "high",
        confidence: "high",
        title: "No exhibits identified",
        explanation:
          "No exhibits have been supplied to the Trial Readiness Investigator.",
        trialImpact:
          "Trial presentation usually requires organized documents, screenshots, records, or other exhibits.",
        judgeConcern:
          "The judge may need evidence connected to each issue.",
        opponentAttack:
          "The other side may argue the user has no organized proof.",
        recommendedQuestion:
          "What exhibits will be used, and what issue does each exhibit prove?",
        recommendedAction:
          "Create an exhibit list with labels, dates, sources, and issue links.",
        requiredBeforeTrial: [
          "Exhibit list",
          "Labels",
          "Dates",
          "Sources",
          "Issue links",
        ],
        materialsToPrepare: ["Exhibit list", "Exhibit bundle"],
        source: "exhibits",
      }),
    ];
  }

  const findings: TrialReadinessFinding[] = [];

  for (const exhibit of exhibits) {
    const title = clean(exhibit.title) || clean(exhibit.label) || "Exhibit";

    if (!exhibit.authenticated) {
      findings.push(
        createFinding({
          category: "evidence-readiness",
          severity: "high",
          confidence: "high",
          title: `${title} not authenticated`,
          explanation:
            "This exhibit is not marked as authenticated or foundation-ready.",
          trialImpact:
            "Unauthenticated exhibits may be challenged or given less weight.",
          judgeConcern:
            "The judge may ask who created the exhibit, when, how it was preserved, and why it is reliable.",
          opponentAttack:
            "The other side may challenge authenticity, context, or reliability.",
          recommendedQuestion:
            "Who can explain what this exhibit is, where it came from, and why it is reliable?",
          recommendedAction:
            "Add source, date, context, and witness/foundation support for this exhibit.",
          requiredBeforeTrial: [
            "Source",
            "Date",
            "Context",
            "Foundation witness or explanation",
          ],
          materialsToPrepare: ["Exhibit foundation note"],
          linkedClaimIds: exhibit.linkedClaimIds || [],
          source: "exhibits.authenticated",
        }),
      );
    }

    if (!clean(exhibit.date)) {
      findings.push(
        createFinding({
          category: "timeline-readiness",
          severity: "medium",
          confidence: "medium",
          title: `${title} missing date`,
          explanation:
            "This exhibit does not have a date or timeline anchor.",
          trialImpact:
            "Undated exhibits are harder to connect to the sequence of events.",
          judgeConcern:
            "The judge may ask when the exhibit was created or what event it proves.",
          opponentAttack:
            "The other side may argue the exhibit is out of context.",
          recommendedQuestion:
            "What date or event does this exhibit connect to?",
          recommendedAction:
            "Add a date, approximate date, or event reference to the exhibit list.",
          requiredBeforeTrial: ["Date or timeline reference"],
          materialsToPrepare: ["Updated exhibit list", "Chronology"],
          linkedClaimIds: exhibit.linkedClaimIds || [],
          source: "exhibits.date",
        }),
      );
    }

    if (!clean(exhibit.linkedIssue)) {
      findings.push(
        createFinding({
          category: "issue-readiness",
          severity: "medium",
          confidence: "medium",
          title: `${title} not linked to an issue`,
          explanation:
            "This exhibit is not connected to a live issue or proof point.",
          trialImpact:
            "Every exhibit should have a clear purpose at trial.",
          judgeConcern:
            "The judge may ask why the exhibit matters.",
          opponentAttack:
            "The other side may argue the exhibit is irrelevant or repetitive.",
          recommendedQuestion:
            "What issue or proof point does this exhibit support?",
          recommendedAction:
            "Link the exhibit to a specific issue, element, burden, or remedy.",
          requiredBeforeTrial: ["Issue link", "Proof point"],
          materialsToPrepare: ["Exhibit-purpose chart"],
          linkedClaimIds: exhibit.linkedClaimIds || [],
          source: "exhibits.linkedIssue",
        }),
      );
    }
  }

  return findings;
}

function buildReasoningFindings(input: TrialReadinessInput): TrialReadinessFinding[] {
  const signals = [
    ...(input.litigationReasoning?.weakestCasePoints || []).map((value) => ({
      source: "litigationReasoning.weakestCasePoints",
      value,
    })),
    ...(input.litigationReasoning?.judicialConcerns || []).map((value) => ({
      source: "litigationReasoning.judicialConcerns",
      value,
    })),
    ...(input.litigationReasoning?.opposingArguments || []).map((value) => ({
      source: "litigationReasoning.opposingArguments",
      value,
    })),
    ...(input.litigationReasoning?.missingWork || []).map((value) => ({
      source: "litigationReasoning.missingWork",
      value,
    })),
    ...(input.workflowReadiness?.blockers || []).map((value) => ({
      source: "workflowReadiness.blockers",
      value,
    })),
    ...(input.warnings || []).map((value) => ({
      source: "warnings",
      value,
    })),
  ];

  return signals.map((signal) => {
    const category = categoryFromText(signal.value);

    return createFinding({
      category,
      severity: severityFromText(signal.value),
      confidence: "medium",
      title: "Trial readiness signal",
      explanation: signal.value,
      trialImpact:
        "This issue may affect whether the case can be presented clearly and safely at trial.",
      judgeConcern:
        "A judge may ask for a clear answer, proof, procedure, or authority.",
      opponentAttack:
        "The opposing party may use this point as a trial attack.",
      recommendedQuestion:
        "How will this issue be answered if raised at trial?",
      recommendedAction:
        "Prepare a trial-ready answer supported by evidence, witnesses, timeline, and authority where needed.",
      requiredBeforeTrial: [
        "Clear explanation",
        "Supporting proof",
        "Trial materials",
      ],
      materialsToPrepare: ["Trial note", "Proof chart", "Evidence reference"],
      source: signal.source,
    });
  });
}

function calculateIntelligence(
  findings: TrialReadinessFinding[],
  input: TrialReadinessInput,
): TrialReadinessIntelligence {
  let trialReadinessScore = 85;
  let evidenceReadinessScore = 80;
  let witnessReadinessScore = 80;
  let procedureReadinessScore = 80;
  let proofReadinessScore = 80;
  let credibilityReadinessScore = 80;
  let authorityReadinessScore = 80;

  const materials = input.trialMaterials;

  if (!materials) {
    trialReadinessScore -= 18;
  } else {
    const materialValues = Object.values(materials);
    const readyCount = materialValues.filter(Boolean).length;
    const totalCount = materialValues.length || 1;
    const materialScore = Math.round((readyCount / totalCount) * 100);
    trialReadinessScore = Math.round((trialReadinessScore + materialScore) / 2);
  }

  if ((input.witnesses || []).length === 0) witnessReadinessScore -= 25;
  if ((input.exhibits || []).length === 0) evidenceReadinessScore -= 25;

  for (const finding of findings) {
    const penalty =
      finding.severity === "critical"
        ? 18
        : finding.severity === "high"
          ? 10
          : finding.severity === "medium"
            ? 5
            : finding.severity === "low"
              ? 1
              : 0;

    trialReadinessScore -= penalty;

    if (
      ["evidence-readiness", "exhibit-readiness"].includes(finding.category)
    ) {
      evidenceReadinessScore -= penalty;
    }

    if (finding.category === "witness-readiness") {
      witnessReadinessScore -= penalty;
    }

    if (finding.category === "procedure-readiness") {
      procedureReadinessScore -= penalty;
    }

    if (finding.category === "proof-readiness") {
      proofReadinessScore -= penalty;
    }

    if (
      ["credibility-readiness", "contradiction-readiness"].includes(
        finding.category,
      )
    ) {
      credibilityReadinessScore -= penalty;
    }

    if (finding.category === "authority-readiness") {
      authorityReadinessScore -= penalty;
    }
  }

  trialReadinessScore = Math.max(0, Math.min(100, Math.round(trialReadinessScore)));

  return {
    trialReadinessScore,
    evidenceReadinessScore: Math.max(
      0,
      Math.min(100, Math.round(evidenceReadinessScore)),
    ),
    witnessReadinessScore: Math.max(
      0,
      Math.min(100, Math.round(witnessReadinessScore)),
    ),
    procedureReadinessScore: Math.max(
      0,
      Math.min(100, Math.round(procedureReadinessScore)),
    ),
    proofReadinessScore: Math.max(
      0,
      Math.min(100, Math.round(proofReadinessScore)),
    ),
    credibilityReadinessScore: Math.max(
      0,
      Math.min(100, Math.round(credibilityReadinessScore)),
    ),
    authorityReadinessScore: Math.max(
      0,
      Math.min(100, Math.round(authorityReadinessScore)),
    ),
    overallReadinessLevel: readinessLevelFromScore(trialReadinessScore),
    confidence: confidenceFromScore(trialReadinessScore),
  };
}

function findingsByCategory(
  findings: TrialReadinessFinding[],
  category: TrialReadinessCategory,
): TrialReadinessFinding[] {
  return findings.filter((finding) => finding.category === category);
}

function collectionFromFindings(
  findings: TrialReadinessFinding[],
  selector: (finding: TrialReadinessFinding) => string[],
): string[] {
  return uniqueStrings(findings.flatMap(selector));
}

function actionsFromFindings(findings: TrialReadinessFinding[]): string[] {
  return uniqueStrings(
    findings
      .slice()
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((finding) => finding.recommendedAction),
  );
}

export function buildTrialReadinessInvestigation(
  input: TrialReadinessInput,
): TrialReadinessResult {
  const findings = [
    ...buildImportedFindings(input),
    ...buildTrialMaterialFindings(input),
    ...buildWitnessFindings(input),
    ...buildExhibitFindings(input),
    ...buildReasoningFindings(input),
  ].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const intelligence = calculateIntelligence(findings, input);

  const trialBlockers = uniqueStrings(
    findings
      .filter((finding) => severityRank(finding.severity) >= 4)
      .map((finding) => finding.title),
  );

  const warnings = uniqueStrings([
    ...(input.litigationReasoning?.warnings || []),
    ...(input.warnings || []),
    ...trialBlockers,
  ]);

  return {
    version: "2.0.0",
    generatedAt: nowIso(),
    caseId: input.caseId,

    intelligence,
    findings,

    trialBlockers,
    requiredBeforeTrial: collectionFromFindings(
      findings,
      (finding) => finding.requiredBeforeTrial,
    ),
    missingTrialMaterials: collectionFromFindings(
      findings.filter((finding) => finding.category === "trial-materials"),
      (finding) => finding.materialsToPrepare,
    ),
    witnessPreparationTasks: collectionFromFindings(
      findingsByCategory(findings, "witness-readiness"),
      (finding) => finding.materialsToPrepare,
    ),
    exhibitPreparationTasks: collectionFromFindings(
      findings.filter((finding) =>
        ["exhibit-readiness", "evidence-readiness"].includes(finding.category),
      ),
      (finding) => finding.materialsToPrepare,
    ),
    proofPreparationTasks: collectionFromFindings(
      findingsByCategory(findings, "proof-readiness"),
      (finding) => finding.materialsToPrepare,
    ),
    authorityPreparationTasks: collectionFromFindings(
      findingsByCategory(findings, "authority-readiness"),
      (finding) => finding.materialsToPrepare,
    ),
    credibilityPreparationTasks: collectionFromFindings(
      findingsByCategory(findings, "credibility-readiness"),
      (finding) => finding.materialsToPrepare,
    ),
    contradictionPreparationTasks: collectionFromFindings(
      findingsByCategory(findings, "contradiction-readiness"),
      (finding) => finding.materialsToPrepare,
    ),
    opponentAttackPreparationTasks: collectionFromFindings(
      findingsByCategory(findings, "opponent-attack-readiness"),
      (finding) => finding.materialsToPrepare,
    ),
    judgeQuestionPreparationTasks: uniqueStrings(
      findings.map((finding) => finding.judgeConcern),
    ),

    trialStrengths: uniqueStrings(input.litigationReasoning?.strongestCasePoints || []),
    trialWeaknesses: uniqueStrings([
      ...(input.litigationReasoning?.weakestCasePoints || []),
      ...findings
        .filter((finding) => severityRank(finding.severity) >= 3)
        .map((finding) => finding.explanation),
    ]),
    nextActions: uniqueStrings([
      ...actionsFromFindings(findings).slice(0, 14),
      ...(input.workflowReadiness?.nextActions || []),
      "Do not treat the case as trial-ready until witnesses, exhibits, proof map, chronology, remedies, authority, and procedural compliance are confirmed.",
      "Prepare judge questions and opponent attacks before final trial materials are generated.",
    ]).slice(0, 20),

    warnings,

    summary:
      findings.length > 0
        ? `Trial Readiness Investigator assessed readiness as ${intelligence.overallReadinessLevel} with score ${intelligence.trialReadinessScore}/100 and found ${findings.length} trial readiness issue(s).`
        : `Trial Readiness Investigator assessed readiness as ${intelligence.overallReadinessLevel} with score ${intelligence.trialReadinessScore}/100 and found no major trial readiness issues.`,
  };
}