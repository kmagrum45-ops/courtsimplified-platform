import {
  analyzeEvidenceBundle,
  type EvidenceBundleAnalysis,
  type EvidenceItem,
} from "./evidenceEngine";

import {
  runLegalTheoryEngine,
  type LegalTheoryInput,
  type LegalTheoryResult,
} from "./legalTheoryEngine";

import {
  createEmptyCaseFile,
  type CaseFile,
  type CourtSimplifiedCasePath,
  type EvidenceStrength,
  type LitigationStage,
  type PartyRole,
  type RiskSeverity,
} from "./types";

export type CasePath = "family" | "small-claims" | "civil" | "unknown";

export type CaseStage =
  | "starting-case"
  | "responding"
  | "already-started"
  | "conference"
  | "motion"
  | "trial"
  | "enforcement"
  | "urgent"
  | "not-sure";

export type CasePartyRole =
  | "applicant"
  | "respondent"
  | "plaintiff"
  | "defendant"
  | "moving-party"
  | "responding-party"
  | "unknown";

export type CaseIssue = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  legalElements: string[];
  linkedEvidenceIds: Array<string | number>;
  linkedFormIds: string[];
  unresolvedGaps: string[];
  risks: string[];
};

export type CaseTimelineEvent = {
  id: string;
  date?: string;
  title: string;
  description?: string;
  linkedEvidenceIds: Array<string | number>;
  linkedIssueIds: string[];
  confidence: EvidenceStrength;
};

export type CaseFormNeed = {
  formId?: string;
  formNumber?: string;
  title: string;
  reason: string;
  stage: CaseStage | "general";
  status: "needed-now" | "not-needed-yet" | "already-completed" | "unknown";
  linkedIssueIds: string[];
  linkedEvidenceIds: Array<string | number>;
};

export type CaseRisk = {
  id: string;
  title: string;
  description: string;
  severity: Exclude<RiskSeverity, "critical">;
  source:
    | "intake"
    | "forms"
    | "evidence"
    | "timeline"
    | "procedure"
    | "strategy";
  suggestedFix?: string;
};

export type CaseReadinessLevel =
  | "not-ready"
  | "developing"
  | "organized"
  | "filing-ready"
  | "hearing-ready";

export type CaseProceduralIntelligence = {
  likelyForumIssues: string[];
  limitationConcerns: string[];
  urgencyConcerns: string[];
  serviceConcerns: string[];
  disclosureConcerns: string[];
  nextProceduralFocus: string[];
  pathwayWarnings: string[];
};

export type CaseReadiness = {
  level: CaseReadinessLevel;
  score: number;
  reasons: string[];
  blockers: string[];
};

export type CaseContext = {
  caseId: string;
  userId?: string;

  createdAt: string;
  updatedAt: string;

  casePath: CasePath;
  stage: CaseStage;
  partyRole: CasePartyRole;

  title: string;
  summary: string;

  facts: string[];
  issues: CaseIssue[];
  timeline: CaseTimelineEvent[];
  evidenceItems: EvidenceItem[];
  evidenceAnalysis: EvidenceBundleAnalysis;
  legalTheoryAnalysis: LegalTheoryResult;
  proceduralIntelligence: CaseProceduralIntelligence;
  readiness: CaseReadiness;

  formNeeds: CaseFormNeed[];
  risks: CaseRisk[];

  strengths: string[];
  weaknesses: string[];
  missingInformation: string[];
  nextSteps: string[];

  strategyNotes: string[];
  courtPackageNotes: string[];

  masterCaseFile: CaseFile;
};

export type BuildCaseContextInput = {
  caseId?: string;
  userId?: string;

  casePath?: CasePath | string | null;
  stage?: CaseStage | string | null;
  partyRole?: CasePartyRole | string | null;

  title?: string;
  summary?: string;

  facts?: string[];
  evidenceItems?: EvidenceItem[];
  formNeeds?: CaseFormNeed[];
};

const VALID_CASE_PATHS: CasePath[] = [
  "family",
  "small-claims",
  "civil",
  "unknown",
];

const VALID_CASE_STAGES: CaseStage[] = [
  "starting-case",
  "responding",
  "already-started",
  "conference",
  "motion",
  "trial",
  "enforcement",
  "urgent",
  "not-sure",
];

const VALID_PARTY_ROLES: CasePartyRole[] = [
  "applicant",
  "respondent",
  "plaintiff",
  "defendant",
  "moving-party",
  "responding-party",
  "unknown",
];

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function clean(value: unknown) {
  return String(value || "").trim();
}

function cleanList(items: string[]) {
  return Array.from(new Set(items.map(clean).filter(Boolean)));
}

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeToken(value: unknown) {
  return normalize(value).replace(/_/g, "-");
}

function includesAny(text: string, terms: string[]) {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function hasMeaningfulText(value: unknown) {
  return clean(value).length > 6;
}

function normalizeCasePath(value: unknown): CasePath {
  const normalized = normalizeToken(value);

  if (VALID_CASE_PATHS.includes(normalized as CasePath)) {
    return normalized as CasePath;
  }

  if (
    normalized === "smallclaims" ||
    normalized === "small claims" ||
    normalized === "small-claim" ||
    normalized === "small claim"
  ) {
    return "small-claims";
  }

  if (normalized.includes("family")) return "family";
  if (normalized.includes("civil")) return "civil";

  return "unknown";
}

function normalizeCaseStage(value: unknown): CaseStage {
  const normalized = normalizeToken(value);

  if (VALID_CASE_STAGES.includes(normalized as CaseStage)) {
    return normalized as CaseStage;
  }

  if (
    normalized === "start" ||
    normalized === "new" ||
    normalized === "starting" ||
    normalized === "starting case"
  ) {
    return "starting-case";
  }

  if (
    normalized === "already started" ||
    normalized === "active" ||
    normalized === "in-progress" ||
    normalized === "in progress"
  ) {
    return "already-started";
  }

  if (
    normalized === "case conference" ||
    normalized === "settlement-conference" ||
    normalized === "settlement conference"
  ) {
    return "conference";
  }

  if (normalized === "urgent-motion" || normalized === "emergency") {
    return "urgent";
  }

  return "not-sure";
}

function normalizePartyRole(value: unknown): CasePartyRole {
  const normalized = normalizeToken(value);

  if (VALID_PARTY_ROLES.includes(normalized as CasePartyRole)) {
    return normalized as CasePartyRole;
  }

  if (normalized === "claimant") return "plaintiff";
  if (normalized === "appellant") return "applicant";
  if (normalized === "opposing-party") return "respondent";

  return "unknown";
}

function evidenceId(item: EvidenceItem) {
  return String(
    item.id ||
      item.label ||
      item.exhibitNumber ||
      item.title ||
      createId("evidence"),
  );
}

function issueSlug(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-") || "uncategorized-issue";
}

function mapCasePathToMaster(path: CasePath): CourtSimplifiedCasePath {
  if (path === "family" || path === "small-claims" || path === "civil") {
    return path;
  }

  return "unknown";
}

function mapStageToMaster(stage: CaseStage): LitigationStage {
  const stageMap: Record<CaseStage, LitigationStage> = {
    "starting-case": "starting-case",
    responding: "responding",
    "already-started": "already-started",
    conference: "conference",
    motion: "motion",
    trial: "trial",
    enforcement: "enforcement",
    urgent: "urgent-motion",
    "not-sure": "not-sure",
  };

  return stageMap[stage] || "not-sure";
}

function mapPartyRoleToMaster(role: CasePartyRole): PartyRole {
  if (
    role === "applicant" ||
    role === "respondent" ||
    role === "plaintiff" ||
    role === "defendant" ||
    role === "moving-party" ||
    role === "responding-party"
  ) {
    return role;
  }

  return "unknown";
}

function safeTheoryCourtPath(path: CasePath): LegalTheoryInput["courtPath"] {
  if (path === "family" || path === "small-claims" || path === "civil") {
    return path;
  }

  return "civil";
}

function evidenceText(evidenceItems: EvidenceItem[]) {
  return evidenceItems
    .map((item) =>
      [
        item.label,
        item.exhibitNumber,
        item.title,
        item.description,
        item.relevance,
        item.content,
        item.relatedIssue,
        item.relatedLegalElement,
        item.category,
        item.source,
        item.date,
      ].join(" "),
    )
    .join(" ");
}

function fullCaseText(input: BuildCaseContextInput, evidenceItems: EvidenceItem[]) {
  return normalize(
    [
      input.title,
      input.summary,
      ...(input.facts || []),
      evidenceText(evidenceItems),
    ].join(" "),
  );
}

function buildLegalTheoryInput(
  input: BuildCaseContextInput,
  evidenceItems: EvidenceItem[],
): LegalTheoryInput {
  const normalizedCasePath = normalizeCasePath(input.casePath);

  return {
    courtPath: safeTheoryCourtPath(normalizedCasePath),
    facts: cleanList(input.facts || []).join(" "),
    issues: cleanList(evidenceItems.map((item) => clean(item.relatedIssue))),
    evidence: evidenceText(evidenceItems),
    timeline: evidenceItems
      .map((item) => [item.date, item.title, item.description].join(" "))
      .join(" "),
    damagesBreakdown: "",
    goal: input.summary || "",
  };
}

function buildIssuesFromIntake(
  input: BuildCaseContextInput,
  evidenceItems: EvidenceItem[],
): CaseIssue[] {
  const text = fullCaseText(input, evidenceItems);
  const issues: CaseIssue[] = [];

  function addIssue(
    title: string,
    category: string,
    description: string,
    legalElements: string[],
    unresolvedGaps: string[],
    risks: string[] = [],
  ) {
    const id = issueSlug(title);

    if (issues.some((issue) => issue.id === id)) return;

    issues.push({
      id,
      title,
      category,
      description,
      legalElements: cleanList(legalElements),
      linkedEvidenceIds: [],
      linkedFormIds: [],
      unresolvedGaps: cleanList(unresolvedGaps),
      risks: cleanList(risks),
    });
  }

  if (
    includesAny(text, [
      "custody",
      "parenting",
      "parenting time",
      "decision making",
      "decision-making",
      "access",
      "child",
      "children",
    ])
  ) {
    addIssue(
      "Parenting and decision-making",
      "family",
      "The intake suggests parenting, decision-making, contact, or child-related issues.",
      [
        "Best interests of the child",
        "Parenting history",
        "Child's needs",
        "Safety and stability",
        "Existing arrangements",
      ],
      [
        "Specific schedule requested",
        "Current parenting arrangement",
        "Important dates and incidents",
        "Evidence supporting the child's best interests",
      ],
      ["Avoid vague parenting requests without concrete facts and schedule details."],
    );
  }

  if (
    includesAny(text, [
      "child support",
      "spousal support",
      "support",
      "income",
      "financial statement",
      "expenses",
    ])
  ) {
    addIssue(
      "Support and financial disclosure",
      "family",
      "The intake suggests support, income, expense, or disclosure issues.",
      [
        "Income information",
        "Support entitlement or obligation",
        "Disclosure completeness",
        "Needs and means",
      ],
      [
        "Income documents",
        "Expense details",
        "Disclosure status",
        "Support amount requested or disputed",
      ],
      ["Support issues usually require clear financial disclosure and current numbers."],
    );
  }

  if (
    includesAny(text, [
      "contract",
      "agreement",
      "invoice",
      "quote",
      "payment",
      "unpaid",
      "breach",
      "deposit",
      "refund",
    ])
  ) {
    addIssue(
      "Contract or payment dispute",
      "small-claims",
      "The intake suggests a dispute about an agreement, payment, invoice, refund, or breach.",
      [
        "Agreement terms",
        "Performance or breach",
        "Loss or amount owed",
        "Causation between breach and loss",
      ],
      [
        "Contract or written agreement",
        "Invoices or receipts",
        "Payment history",
        "Proof of loss",
      ],
      [
        "The claim should explain what was promised, what happened, and how the amount is calculated.",
      ],
    );
  }

  if (
    includesAny(text, [
      "defamation",
      "slander",
      "libel",
      "rumour",
      "rumor",
      "false statement",
      "reputation",
      "called me",
      "posted",
    ])
  ) {
    addIssue(
      "Defamation and reputational harm",
      "civil",
      "The intake suggests false statements, reputational harm, or publication to other people.",
      [
        "Specific words used",
        "Publication to someone else",
        "Identification of the person defamed",
        "Harm or presumed harm",
        "Available defences",
      ],
      [
        "Exact words used",
        "Who heard or received the statement",
        "Date and place of publication",
        "Screenshots or witnesses",
        "Retraction request or response",
      ],
      [
        "Defamation claims are vulnerable if the exact words, audience, and publication details are unclear.",
      ],
    );
  }
   if (
    includesAny(text, [
      "negligence",
      "careless",
      "injury",
      "damage",
      "property damage",
      "accident",
      "failed to",
      "duty",
      "harm",
    ])
  ) {
    addIssue(
      "Negligence or failure to take reasonable care",
      "civil",
      "The intake suggests harm caused by careless conduct or failure to take reasonable care.",
      [
        "Duty of care",
        "Breach of standard of care",
        "Causation",
        "Damages",
      ],
      [
        "What duty was owed",
        "What was done wrong",
        "How the conduct caused the harm",
        "Documents proving damages",
      ],
      ["Causation must be explained clearly and not assumed."],
    );
  }

  if (
    includesAny(text, [
      "charter",
      "section 7",
      "section 15",
      "constitutional",
      "government",
      "police",
      "crown",
      "state",
      "public authority",
      "institutional",
    ])
  ) {
    addIssue(
      "Charter or public authority process failure",
      "civil",
      "The intake suggests possible state action, institutional conduct, or public-authority decision-making.",
      [
        "State action",
        "Protected Charter interest or legal duty",
        "Unlawful process or arbitrary action",
        "Connection between state conduct and harm",
        "Appropriate remedy",
      ],
      [
        "Identify the state actor",
        "Identify the decision or process failure",
        "Identify the right affected",
        "Connect the process failure to the harm",
      ],
      [
        "Public-authority claims must avoid vague blame and clearly identify the legal process failure.",
      ],
    );
  }

  if (
    includesAny(text, [
      "human rights",
      "discrimination",
      "harassment",
      "disability",
      "race",
      "sex",
      "gender",
      "religion",
      "family status",
      "accommodation",
    ])
  ) {
    addIssue(
      "Human rights or discrimination",
      "civil",
      "The intake suggests discrimination, accommodation, harassment, or unequal treatment.",
      [
        "Protected ground",
        "Adverse treatment",
        "Connection between ground and treatment",
        "Remedy sought",
      ],
      [
        "Protected ground involved",
        "Specific adverse treatment",
        "Dates and people involved",
        "Documents or witnesses",
      ],
      [
        "Forum choice may need review because some human-rights issues belong before a tribunal.",
      ],
    );
  }

  return issues;
}

function buildIssuesFromEvidence(
  evidenceItems: EvidenceItem[],
  legalTheoryAnalysis: LegalTheoryResult,
  intakeIssues: CaseIssue[],
): CaseIssue[] {
  const issueMap = new Map<string, CaseIssue>();

  for (const issue of intakeIssues) {
    issueMap.set(issue.id, issue);
  }

  for (const item of evidenceItems) {
    const issueTitle =
      item.relatedIssue || item.category || "Uncategorized issue";

    const issueId = issueSlug(issueTitle);

    const existing = issueMap.get(issueId);

    const legalElement = item.relatedLegalElement || "";

    const itemId = evidenceId(item);

    if (existing) {
      issueMap.set(issueId, {
        ...existing,
        legalElements: cleanList([
          ...existing.legalElements,
          legalElement,
        ]),
        linkedEvidenceIds: Array.from(
          new Set([...existing.linkedEvidenceIds, itemId]),
        ),
      });
    } else {
      issueMap.set(issueId, {
        id: issueId,
        title: issueTitle,
        description: item.relevance || item.description || "",
        category: item.category,
        legalElements: cleanList([legalElement]),
        linkedEvidenceIds: [itemId],
        linkedFormIds: [],
        unresolvedGaps: [],
        risks: [],
      });
    }
  }

  for (const theory of legalTheoryAnalysis.matchedTheories.slice(0, 5)) {
    const issueId = issueSlug(theory.theoryName);

    const existing = issueMap.get(issueId);

    if (existing) {
      issueMap.set(issueId, {
        ...existing,
        legalElements: cleanList([
          ...existing.legalElements,
          ...theory.requiredElements,
        ]),
        unresolvedGaps: cleanList([
          ...existing.unresolvedGaps,
          ...theory.missingElements,
        ]),
        risks: cleanList([
          ...existing.risks,
          ...theory.likelyDefenceAttacks,
        ]),
      });
    } else {
      issueMap.set(issueId, {
        id: issueId,
        title: theory.theoryName,
        description: theory.plainLanguageMeaning,
        category: "legal-theory",
        legalElements: theory.requiredElements,
        linkedEvidenceIds: [],
        linkedFormIds: [],
        unresolvedGaps: theory.missingElements,
        risks: theory.likelyDefenceAttacks,
      });
    }
  }

  return Array.from(issueMap.values());
}

function buildTimelineFromEvidence(
  evidenceItems: EvidenceItem[],
  facts: string[],
): CaseTimelineEvent[] {
  const evidenceEvents: CaseTimelineEvent[] = evidenceItems
    .filter((item) => hasMeaningfulText(item.date))
    .map((item) => ({
      id: createId("timeline"),
      date: item.date,
      title: item.title || item.label || "Evidence event",
      description: item.description || item.relevance || item.content || "",
      linkedEvidenceIds: [evidenceId(item)],
      linkedIssueIds: item.relatedIssue
        ? [issueSlug(item.relatedIssue)]
        : [],
      confidence:
        hasMeaningfulText(item.source) &&
        hasMeaningfulText(item.description)
          ? ("strong" as EvidenceStrength)
          : ("moderate" as EvidenceStrength),
    }));

  const factEvents: CaseTimelineEvent[] = cleanList(facts)
    .filter((fact) =>
      /\b(19|20)\d{2}\b|\bjan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\byesterday\b|\btoday\b|\blast\b|\bnext\b/i.test(
        fact,
      ),
    )
    .map((fact) => ({
      id: createId("timeline_fact"),
      date: "",
      title: "Fact timeline marker",
      description: fact,
      linkedEvidenceIds: [],
      linkedIssueIds: [],
      confidence: "moderate" as EvidenceStrength,
    }));

  return [...evidenceEvents, ...factEvents];
}

function buildProceduralIntelligence(
  input: BuildCaseContextInput,
  evidenceItems: EvidenceItem[],
  legalTheoryAnalysis: LegalTheoryResult,
): CaseProceduralIntelligence {
  const normalizedStage = normalizeCaseStage(input.stage);

  const normalizedPath = normalizeCasePath(input.casePath);

  const text = normalize(
    [
      input.summary,
      ...(input.facts || []),
      evidenceText(evidenceItems),
      legalTheoryAnalysis.matchedTheories
        .map((theory) => theory.theoryName)
        .join(" "),
    ].join(" "),
  );

  const likelyForumIssues = cleanList([
    includesAny(text, [
      "human rights",
      "discrimination",
      "accommodation",
      "hrto",
    ])
      ? "Human rights issues may require tribunal-pathway review before court forms are generated."
      : "",
    includesAny(text, ["tribunal", "board", "commission", "ltb", "wsib"])
      ? "A tribunal or administrative forum may be involved."
      : "",
    includesAny(text, [
      "judicial review",
      "decision letter",
      "reconsideration",
      "appeal",
    ])
      ? "Judicial review, reconsideration, or appeal deadlines may need review."
      : "",
    normalizedPath === "family" &&
    includesAny(text, ["cas", "child protection", "children's aid"])
      ? "Child protection or agency involvement may require a different family-law pathway."
      : "",
  ]);

  const limitationConcerns = cleanList([
    includesAny(text, [
      "limitation",
      "deadline",
      "late",
      "expired",
      "years ago",
    ])
      ? "A limitation period or procedural deadline may affect the case."
      : "",
    normalizedPath === "small-claims" &&
    includesAny(text, ["more than two years", "2 years", "two years"])
      ? "Small Claims limitation timing should be reviewed before filing."
      : "",
  ]);

  const urgencyConcerns = cleanList([
    normalizedStage === "urgent"
      ? "The case has been marked urgent."
      : "",
    includesAny(text, [
      "injunction",
      "urgent",
      "ongoing harm",
      "irreparable",
    ])
      ? "Urgent relief may require strong evidence, exact dates, and a clear requested order."
      : "",
    normalizedPath === "family" &&
    includesAny(text, ["safety", "violence", "abuse", "withholding child"])
      ? "Family safety or urgent parenting concerns may require urgent-motion review."
      : "",
  ]);

  const serviceConcerns = cleanList([
    includesAny(text, ["served", "service", "affidavit of service"])
      ? "Service history should be tracked carefully, including who served, when, where, and how."
      : "",
    normalizedStage === "responding"
      ? "Response deadlines and service dates should be confirmed before drafting."
      : "",
  ]);

  const disclosureConcerns = cleanList([
    includesAny(text, [
      "disclosure",
      "bank statement",
      "tax",
      "income",
      "records",
    ])
      ? "Disclosure issues should be organized so missing documents are separated from disputed facts."
      : "",
    normalizedPath === "family" &&
    includesAny(text, ["financial statement"])
      ? "Family financial disclosure may affect support, property, and conference readiness."
      : "",
  ]);

  const nextProceduralFocus = cleanList([
    normalizedStage === "starting-case"
      ? "Confirm correct legal path, forum, limitation date, parties, remedy, and evidence before filing."
      : "",
    normalizedStage === "responding"
      ? "Identify response deadline, documents received, admissions/denials, and evidence needed to answer the claim."
      : "",
    normalizedStage === "motion"
      ? "Define the exact order requested, evidence relied on, urgency, and procedural history."
      : "",
    normalizedStage === "trial"
      ? "Build trial record, exhibit list, witness list, chronology, and issue-by-issue evidence map."
      : "",
    normalizedStage === "conference"
      ? "Prepare conference issues, evidence summary, settlement position, and disclosure gaps."
      : "",
    normalizedPath === "small-claims"
      ? "Track claim, defence, settlement conference, service, evidence, settlement position, and trial readiness."
      : "",
    normalizedPath === "family"
      ? "Track current order status, parenting/support/property issues, disclosure, conference materials, and requested orders."
      : "",
    normalizedPath === "civil"
      ? "Track cause of action, limitation period, parties, remedies, pleadings, evidence, and procedural path."
      : "",
  ]);

  const pathwayWarnings = cleanList([
    likelyForumIssues.length > 0
      ? "This case may not be a simple court-claim pathway. Forum and remedy must be checked first."
      : "",
    limitationConcerns.length > 0
      ? "Deadline risk should be handled before drafting final forms."
      : "",
    normalizedPath === "unknown"
      ? "Case path is unknown. The platform should not recommend final forms until the path is confirmed."
      : "",
  ]);

  return {
    likelyForumIssues,
    limitationConcerns,
    urgencyConcerns,
    serviceConcerns,
    disclosureConcerns,
    nextProceduralFocus,
    pathwayWarnings,
  };
}
function buildRisksFromEvidence(
  evidenceAnalysis: EvidenceBundleAnalysis,
  legalTheoryAnalysis: LegalTheoryResult,
  proceduralIntelligence: CaseProceduralIntelligence,
  input: BuildCaseContextInput,
  issues: CaseIssue[],
): CaseRisk[] {
  const risks: CaseRisk[] = [];

  if (cleanList(input.facts || []).length === 0) {
    risks.push({
      id: createId("risk"),
      title: "Missing core facts",
      description:
        "The case does not yet have structured facts. The system should not produce final drafting or court packages until facts are added.",
      severity: "high",
      source: "intake",
      suggestedFix:
        "Add the story in dated, factual points: who did what, when it happened, what documents exist, and what result is requested.",
    });
  }

  if (issues.length === 0) {
    risks.push({
      id: createId("risk"),
      title: "No issue structure",
      description:
        "The system has not identified the legal or factual issues that must be proven or answered.",
      severity: "high",
      source: "strategy",
      suggestedFix:
        "Add facts and evidence so the platform can map claims, defences, proof targets, and missing information.",
    });
  }

  for (const warning of evidenceAnalysis.bundleWarnings) {
    risks.push({
      id: createId("risk"),
      title: "Evidence package warning",
      description: warning,
      severity: "medium",
      source: "evidence",
      suggestedFix:
        "Review the evidence package and complete the missing information before relying on it in a court document.",
    });
  }

  for (const gap of evidenceAnalysis.proofGaps || []) {
    risks.push({
      id: createId("risk"),
      title: "Proof gap",
      description: gap,
      severity: "high",
      source: "evidence",
      suggestedFix:
        "Add documents, screenshots, receipts, witness details, timeline entries, or explanation connecting the proof to the issue.",
    });
  }

  for (const contradiction of evidenceAnalysis.contradictionNotes || []) {
    risks.push({
      id: createId("risk"),
      title: "Possible contradiction",
      description: contradiction,
      severity: "high",
      source: "evidence",
      suggestedFix:
        "Compare exact wording, dates, source, and context before using both exhibits together.",
    });
  }

  for (const concern of evidenceAnalysis.credibilityConcerns || []) {
    risks.push({
      id: createId("risk"),
      title: "Credibility concern",
      description: concern,
      severity: "high",
      source: "strategy",
      suggestedFix:
        "Prepare a clear explanation and avoid overstating evidence that could be attacked.",
    });
  }

  for (const missingProof of legalTheoryAnalysis.allMissingProof.slice(0, 8)) {
    risks.push({
      id: createId("risk"),
      title: "Legal theory proof gap",
      description: missingProof,
      severity: "high",
      source: "strategy",
      suggestedFix:
        "Connect this proof target to evidence, facts, witness information, or a drafting explanation before relying on the theory.",
    });
  }

  for (const warning of proceduralIntelligence.pathwayWarnings) {
    risks.push({
      id: createId("risk"),
      title: "Pathway warning",
      description: warning,
      severity: "high",
      source: "procedure",
      suggestedFix:
        "Confirm the correct court, tribunal, review, appeal, or procedural path before generating final documents.",
    });
  }

  for (const concern of proceduralIntelligence.serviceConcerns) {
    risks.push({
      id: createId("risk"),
      title: "Service concern",
      description: concern,
      severity: "medium",
      source: "procedure",
      suggestedFix:
        "Record service dates, method, person served, proof of service, and any response deadline.",
    });
  }

  for (const concern of proceduralIntelligence.disclosureConcerns) {
    risks.push({
      id: createId("risk"),
      title: "Disclosure concern",
      description: concern,
      severity: "medium",
      source: "procedure",
      suggestedFix:
        "Separate missing disclosure from disputed facts and identify what documents are still needed.",
    });
  }

  return risks;
}

function buildMissingInformation(
  evidenceAnalysis: EvidenceBundleAnalysis,
  issues: CaseIssue[],
  timeline: CaseTimelineEvent[],
  legalTheoryAnalysis: LegalTheoryResult,
  proceduralIntelligence: CaseProceduralIntelligence,
  input: BuildCaseContextInput,
) {
  const missing: string[] = [];

  missing.push(...evidenceAnalysis.missingInformation);

  if (cleanList(input.facts || []).length === 0) {
    missing.push("The case needs structured facts.");
  }

  if (!hasMeaningfulText(input.summary)) {
    missing.push("The case needs a short plain-language summary.");
  }

  if (issues.length === 0) {
    missing.push("No legal or factual issues have been identified yet.");
  }

  if (timeline.length === 0) {
    missing.push("No dated timeline events have been created yet.");
  }

  if ((evidenceAnalysis.proofGaps || []).length > 0) {
    missing.push(
      "Some evidence is not yet connected to foundation, causation, damages, or authenticity proof.",
    );
  }

  missing.push(...legalTheoryAnalysis.allMissingProof.slice(0, 10));
  missing.push(...proceduralIntelligence.likelyForumIssues);
  missing.push(...proceduralIntelligence.limitationConcerns);
  missing.push(...proceduralIntelligence.serviceConcerns);
  missing.push(...proceduralIntelligence.disclosureConcerns);

  return cleanList(missing);
}

function buildReadiness(
  context: Pick<
    CaseContext,
    | "facts"
    | "summary"
    | "issues"
    | "timeline"
    | "evidenceItems"
    | "formNeeds"
    | "risks"
    | "legalTheoryAnalysis"
    | "proceduralIntelligence"
  >,
): CaseReadiness {
  let score = 0;
  const reasons: string[] = [];
  const blockers: string[] = [];

  if (context.summary.trim().length > 20) {
    score += 10;
    reasons.push("Case has a plain-language summary.");
  } else {
    blockers.push("Case summary is missing or too thin.");
  }

  if (context.facts.length >= 3) {
    score += 15;
    reasons.push("Core facts have been started.");
  } else {
    blockers.push("More structured facts are needed.");
  }

  if (context.evidenceItems.length >= 5) {
    score += 20;
    reasons.push("Evidence package has multiple items.");
  } else if (context.evidenceItems.length > 0) {
    score += 10;
    reasons.push("Some evidence has been added.");
    blockers.push("Evidence package still needs more support.");
  } else {
    blockers.push("Evidence package is still empty.");
  }

  if (context.timeline.length >= 3) {
    score += 15;
    reasons.push("Timeline contains multiple dated events.");
  } else if (context.timeline.length > 0) {
    score += 7;
    blockers.push("Timeline needs more dated events.");
  } else {
    blockers.push("Timeline needs dated events.");
  }

  if (context.issues.length >= 2) {
    score += 15;
    reasons.push("Issues are identified and can be mapped.");
  } else if (context.issues.length > 0) {
    score += 8;
    reasons.push("Initial issue structure has been detected.");
    blockers.push("Issue structure needs more development.");
  } else {
    blockers.push("Legal/factual issue structure needs more work.");
  }

  if (context.legalTheoryAnalysis.strongestTheory) {
    score += 15;
    reasons.push(
      `Strongest detected theory: ${context.legalTheoryAnalysis.strongestTheory.theoryName}.`,
    );
  } else {
    blockers.push("No strong legal theory detected yet.");
  }

  if (context.formNeeds.some((form) => form.status === "needed-now")) {
    score += 10;
    reasons.push("Next document needs have been identified.");
  } else {
    blockers.push("Form needs have not been confirmed yet.");
  }

  if (context.risks.some((risk) => risk.severity === "high")) {
    score -= 15;
    blockers.push(
      "High-risk proof, evidence, procedure, or strategy issues remain.",
    );
  }

  if (context.proceduralIntelligence.pathwayWarnings.length > 0) {
    score -= 10;
    blockers.push("Forum/pathway warnings must be resolved.");
  }

  const normalizedScore = Math.max(0, Math.min(100, score));

  let level: CaseReadinessLevel = "not-ready";

  if (normalizedScore >= 80) level = "hearing-ready";
  else if (normalizedScore >= 65) level = "filing-ready";
  else if (normalizedScore >= 45) level = "organized";
  else if (normalizedScore >= 25) level = "developing";

  return {
    level,
    score: normalizedScore,
    reasons: cleanList(reasons),
    blockers: cleanList(blockers),
  };
}

function buildNextSteps(
  context: Pick<
    CaseContext,
    | "stage"
    | "casePath"
    | "facts"
    | "issues"
    | "timeline"
    | "evidenceItems"
    | "formNeeds"
    | "risks"
    | "legalTheoryAnalysis"
    | "proceduralIntelligence"
    | "readiness"
  >,
) {
  const steps: string[] = [];

  if (context.facts.length === 0) {
    steps.push("Add the core facts before relying on forms or package output.");
  }

  if (context.evidenceItems.length === 0) {
    steps.push("Add and organize evidence before building court materials.");
  }

  if (context.issues.length === 0) {
    steps.push("Identify the main issues the court or tribunal needs to decide.");
  }

  if (context.timeline.length === 0) {
    steps.push("Create a dated timeline of key events.");
  }

  if (context.legalTheoryAnalysis.strongestTheory) {
    steps.push(
      `Build the case around the strongest detected theory: ${context.legalTheoryAnalysis.strongestTheory.theoryName}.`,
    );
  }

  const neededForms = context.formNeeds.filter(
    (form) => form.status === "needed-now",
  );

  if (neededForms.length > 0) {
    steps.push(
      "Review the forms marked as needed now and connect them to the case stage.",
    );
  } else {
    steps.push("Review likely court forms after facts, issues, and stage are confirmed.");
  }

  const highRisks = context.risks.filter((risk) => risk.severity === "high");

  if (highRisks.length > 0) {
    steps.push(
      "Resolve high-risk proof, credibility, contradiction, procedure, or pathway issues before generating court packages.",
    );
  }

  if (context.proceduralIntelligence.pathwayWarnings.length > 0) {
    steps.push("Resolve forum/pathway warnings before generating final documents.");
  }

  if (context.stage === "conference") {
    steps.push(
      "Prepare a conference-focused package: issues, offers, evidence summary, missing disclosure, and settlement position.",
    );
  }

  if (context.stage === "trial") {
    steps.push(
      "Prepare trial materials: exhibit list, witness list, chronology, proof chart, and issue-by-issue evidence map.",
    );
  }

  if (context.readiness.level === "not-ready") {
    steps.push(
      "Do not export final documents yet. Build evidence, timeline, issues, and proof mapping first.",
    );
  }

  return cleanList(steps);
}

function buildStrategyNotes(
  evidenceAnalysis: EvidenceBundleAnalysis,
  risks: CaseRisk[],
  legalTheoryAnalysis: LegalTheoryResult,
  proceduralIntelligence: CaseProceduralIntelligence,
  issues: CaseIssue[],
) {
  const notes: string[] = [];

  if (issues.length > 0) {
    notes.push(
      "Keep drafting organized by issue: facts, proof, risk, and remedy should be separated for each issue.",
    );
  }

  if ((evidenceAnalysis.corroborationNotes || []).length > 0) {
    notes.push(
      "Some exhibits appear to corroborate each other. These should be grouped or cross-referenced in the court package.",
    );
  }

  if ((evidenceAnalysis.contradictionNotes || []).length > 0) {
    notes.push(
      "Possible contradictions should be addressed directly before relying on the affected exhibits.",
    );
  }

  if (risks.some((risk) => risk.title.includes("Proof gap"))) {
    notes.push(
      "Do not rely on a claim or defence point unless the related evidence actually proves the required fact.",
    );
  }

  if (legalTheoryAnalysis.strongestTheory) {
    notes.push(
      `Strategy should be organized around: ${legalTheoryAnalysis.strongestTheory.theoryName}.`,
    );
  }

  if (legalTheoryAnalysis.allDefenceAttacks.length > 0) {
    notes.push(
      "Anticipate defence attacks before drafting. The platform should help users answer weaknesses before finalizing documents.",
    );
  }

  if (proceduralIntelligence.pathwayWarnings.length > 0) {
    notes.push(
      "Procedural pathway must be confirmed before form generation because this case may involve court, tribunal, review, appeal, or mixed jurisdiction.",
    );
  }

  return cleanList(notes);
}

function buildMasterCaseFile(context: Omit<CaseContext, "masterCaseFile">): CaseFile {
  return createEmptyCaseFile({
    id: context.caseId,
    userId: context.userId,
    createdAt: context.createdAt,
    updatedAt: context.updatedAt,
    casePath: mapCasePathToMaster(context.casePath),
    province: "Ontario",
    jurisdiction: "",
    courtOrTribunal: "",
    stage: mapStageToMaster(context.stage),
    userRole: mapPartyRoleToMaster(context.partyRole),
    title: context.title,
    summary: context.summary,
    facts: context.facts,
    issues: context.issues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      legalTheory:
        issue.category === "legal-theory" ? issue.title : issue.category || "",
      legalElements: issue.legalElements,
      linkedEvidenceIds: issue.linkedEvidenceIds.map(String),
      linkedTimelineEventIds: context.timeline
        .filter((event) => event.linkedIssueIds.includes(issue.id))
        .map((event) => event.id),
      linkedFormIds: issue.linkedFormIds,
      unresolvedGaps: issue.unresolvedGaps,
      risks: issue.risks,
    })),
    timeline: context.timeline.map((event) => ({
      id: event.id,
      date: event.date,
      title: event.title,
      description: event.description,
      linkedEvidenceIds: event.linkedEvidenceIds.map(String),
      linkedIssueIds: event.linkedIssueIds,
      confidence: event.confidence,
    })),
    evidence: context.evidenceItems.map((item) => ({
      id: evidenceId(item),
      title: item.title || item.label || "Untitled evidence",
      type: includesAny(item.fileType || item.category || item.title || "", [
        "screenshot",
        "image",
      ])
        ? "screenshot"
        : includesAny(item.fileType || item.category || item.title || "", [
              "email",
            ])
          ? "email"
          : includesAny(item.fileType || item.category || item.title || "", [
                "photo",
                "picture",
              ])
            ? "photo"
            : "other",
      description: item.description,
      date: item.date,
      source: item.source,
      fileName: item.fileName,
      filePath: item.storagePath,
      contentText: item.content,
      relevance: item.relevance,
      linkedIssueIds: item.relatedIssue ? [issueSlug(item.relatedIssue)] : [],
      linkedTimelineEventIds: item.linkedTimelineEvents || [],
      proves: cleanList([item.relatedLegalElement || "", item.relevance || ""]),
      doesNotProve: [],
      weaknesses: [],
      contradictions: [],
      strength: "unknown",
    })),
    proofMap: context.issues.flatMap((issue) =>
      issue.legalElements.map((element) => ({
        id: createId("proof_map"),
        issueId: issue.id,
        element,
        requiredProof: element,
        supportingEvidenceIds: issue.linkedEvidenceIds.map(String),
        missingProof: issue.unresolvedGaps,
        riskLevel: issue.unresolvedGaps.length > 0 ? "high" : "medium",
        notes:
          issue.unresolvedGaps.length > 0
            ? "This proof point still needs more evidence or explanation."
            : "This proof point has some linked evidence but should still be reviewed.",
      })),
    ),
    formNeeds: context.formNeeds.map((form) => ({
      id: form.formId || createId("form_need"),
      formNumber: form.formNumber,
      title: form.title,
      reason: form.reason,
      stage: form.stage === "general" ? "not-sure" : mapStageToMaster(form.stage),
      status:
        form.status === "unknown"
          ? "unknown"
          : form.status === "needed-now"
            ? "needed-now"
            : form.status === "not-needed-yet"
              ? "not-needed-yet"
              : "already-completed",
      linkedIssueIds: form.linkedIssueIds,
      linkedEvidenceIds: form.linkedEvidenceIds.map(String),
    })),
    risks: context.risks.map((risk) => ({
      id: risk.id,
      title: risk.title,
      description: risk.description,
      severity: risk.severity,
      source:
        risk.source === "forms"
          ? "forms"
          : risk.source === "timeline"
            ? "timeline"
            : risk.source === "procedure"
              ? "procedure"
              : risk.source === "strategy"
                ? "strategy"
                : risk.source === "evidence"
                  ? "evidence"
                  : "intake",
      suggestedFix: risk.suggestedFix,
    })),
    proceduralIntelligence: {
      likelyForumIssues: context.proceduralIntelligence.likelyForumIssues,
      limitationConcerns: context.proceduralIntelligence.limitationConcerns,
      urgencyConcerns: context.proceduralIntelligence.urgencyConcerns,
      serviceConcerns: context.proceduralIntelligence.serviceConcerns,
      disclosureConcerns: context.proceduralIntelligence.disclosureConcerns,
      nextProceduralFocus: context.proceduralIntelligence.nextProceduralFocus,
      pathwayWarnings: context.proceduralIntelligence.pathwayWarnings,
    },
    strategy: {
      strengths: context.strengths,
      weaknesses: context.weaknesses,
      likelyOtherSideArguments:
        context.legalTheoryAnalysis.allDefenceAttacks || [],
      likelyJudgeConcerns: context.risks
        .filter((risk) => risk.severity === "high")
        .map((risk) => risk.description),
      suggestedWordingImprovements: cleanList([
        "Use dates, actors, documents, and requested remedies rather than broad conclusions.",
        "Separate facts from assumptions and legal conclusions.",
        "Explain causation and proof links issue by issue.",
      ]),
      settlementConsiderations: cleanList([
        context.casePath === "small-claims"
          ? "Prepare settlement position, damages calculation, weaknesses, and proof summary."
          : "",
        context.casePath === "family"
          ? "Separate child-focused outcomes, financial disclosure, safety concerns, and practical schedules."
          : "",
      ]),
      nextStrategicSteps: context.strategyNotes,
    },
    courtPackage: {
      packageSections: context.evidenceAnalysis.packageOrder || [],
      exhibitOrder: context.evidenceAnalysis.packageOrder || [],
      missingPackageItems: context.missingInformation,
      filingNotes: context.proceduralIntelligence.nextProceduralFocus,
      serviceNotes: context.proceduralIntelligence.serviceConcerns,
      exportNotes: context.courtPackageNotes,
    },
    readiness: {
      level:
        context.readiness.level === "hearing-ready"
          ? "hearing-ready"
          : context.readiness.level,
      score: context.readiness.score,
      reasons: context.readiness.reasons,
      blockers: context.readiness.blockers,
    },
    aiMemory: {
      plainLanguageSummary: context.summary,
      structuredSummary: [
        context.title,
        context.summary,
        context.facts.join(" "),
        context.issues.map((issue) => issue.title).join(", "),
        context.nextSteps.join(" "),
      ]
        .filter(Boolean)
        .join("\n\n"),
      userGoals: [],
      importantFacts: context.facts,
      unresolvedQuestions: context.missingInformation,
      warningsForAi: [
        "Do not provide guaranteed legal advice.",
        "Do not invent case law, deadlines, forms, or procedural rules.",
        "Ask clarifying questions when the evidence does not support a conclusion.",
        "Separate facts, assumptions, missing proof, and strategy.",
        "Do not recommend final forms unless case path, stage, parties, and procedural posture are clear.",
      ],
      lastUpdatedByEngine: "caseContextEngine",
    },
    domainData: {},
  });
}

export function buildCaseContext(input: BuildCaseContextInput): CaseContext {
  const casePath = normalizeCasePath(input.casePath);
  const stage = normalizeCaseStage(input.stage);
  const partyRole = normalizePartyRole(input.partyRole);

  const evidenceItems = input.evidenceItems || [];
  const facts = cleanList(input.facts || []);
  const evidenceAnalysis = analyzeEvidenceBundle(evidenceItems);
  const legalTheoryAnalysis = runLegalTheoryEngine(
    buildLegalTheoryInput({ ...input, casePath, stage, partyRole }, evidenceItems),
  );
  const proceduralIntelligence = buildProceduralIntelligence(
    { ...input, casePath, stage, partyRole },
    evidenceItems,
    legalTheoryAnalysis,
  );

  const intakeIssues = buildIssuesFromIntake(
    { ...input, casePath, stage, partyRole },
    evidenceItems,
  );

  const issues = buildIssuesFromEvidence(
    evidenceItems,
    legalTheoryAnalysis,
    intakeIssues,
  );

  const timeline = buildTimelineFromEvidence(evidenceItems, facts);
  const formNeeds = input.formNeeds || [];

  const risks = buildRisksFromEvidence(
    evidenceAnalysis,
    legalTheoryAnalysis,
    proceduralIntelligence,
    { ...input, casePath, stage, partyRole },
    issues,
  );

  const baseContextWithoutReadiness = {
    facts,
    summary: input.summary || "",
    issues,
    timeline,
    evidenceItems,
    formNeeds,
    risks,
    legalTheoryAnalysis,
    proceduralIntelligence,
  };

  const readiness = buildReadiness(baseContextWithoutReadiness);

  const contextWithoutMaster: Omit<CaseContext, "masterCaseFile"> = {
    caseId: input.caseId || createId("case"),
    userId: input.userId,

    createdAt: nowIso(),
    updatedAt: nowIso(),

    casePath,
    stage,
    partyRole,

    title: input.title || "Untitled case",
    summary: input.summary || "",

    facts,
    issues,
    timeline,
    evidenceItems,
    evidenceAnalysis,
    legalTheoryAnalysis,
    proceduralIntelligence,
    readiness,

    formNeeds,
    risks,

    strengths: cleanList([
      ...evidenceAnalysis.strengths,
      ...evidenceAnalysis.corroborationNotes,
      ...(legalTheoryAnalysis.strongestTheory
        ? [
            `Detected legal theory: ${legalTheoryAnalysis.strongestTheory.theoryName}.`,
          ]
        : []),
      ...readiness.reasons,
    ]),

    weaknesses: cleanList([
      ...evidenceAnalysis.weaknesses,
      ...evidenceAnalysis.contradictionNotes,
      ...evidenceAnalysis.credibilityConcerns,
      ...legalTheoryAnalysis.allMissingProof,
      ...readiness.blockers,
    ]),

    missingInformation: [],
    nextSteps: [],

    strategyNotes: [],
    courtPackageNotes: cleanList([
      ...evidenceAnalysis.courtPackageNotes,
      ...evidenceAnalysis.packageOrder.map(
        (group) => `Suggested package section: ${group}.`,
      ),
    ]),
  };

  const missingInformation = buildMissingInformation(
    evidenceAnalysis,
    issues,
    timeline,
    legalTheoryAnalysis,
    proceduralIntelligence,
    { ...input, casePath, stage, partyRole },
  );

  const nextSteps = buildNextSteps({
    stage: contextWithoutMaster.stage,
    casePath: contextWithoutMaster.casePath,
    facts: contextWithoutMaster.facts,
    issues: contextWithoutMaster.issues,
    timeline: contextWithoutMaster.timeline,
    evidenceItems: contextWithoutMaster.evidenceItems,
    formNeeds: contextWithoutMaster.formNeeds,
    risks: contextWithoutMaster.risks,
    legalTheoryAnalysis: contextWithoutMaster.legalTheoryAnalysis,
    proceduralIntelligence: contextWithoutMaster.proceduralIntelligence,
    readiness: contextWithoutMaster.readiness,
  });

  const strategyNotes = buildStrategyNotes(
    evidenceAnalysis,
    risks,
    legalTheoryAnalysis,
    proceduralIntelligence,
    issues,
  );

  const completedContextWithoutMaster: Omit<CaseContext, "masterCaseFile"> = {
    ...contextWithoutMaster,
    missingInformation,
    nextSteps,
    strategyNotes,
  };

  return {
    ...completedContextWithoutMaster,
    masterCaseFile: buildMasterCaseFile(completedContextWithoutMaster),
  };
}

export function updateCaseContextEvidence(
  context: CaseContext,
  evidenceItems: EvidenceItem[],
): CaseContext {
  return buildCaseContext({
    caseId: context.caseId,
    userId: context.userId,
    casePath: context.casePath,
    stage: context.stage,
    partyRole: context.partyRole,
    title: context.title,
    summary: context.summary,
    facts: context.facts,
    evidenceItems,
    formNeeds: context.formNeeds,
  });
}

export function addCaseFact(context: CaseContext, fact: string): CaseContext {
  return buildCaseContext({
    caseId: context.caseId,
    userId: context.userId,
    casePath: context.casePath,
    stage: context.stage,
    partyRole: context.partyRole,
    title: context.title,
    summary: context.summary,
    facts: cleanList([...context.facts, fact]),
    evidenceItems: context.evidenceItems,
    formNeeds: context.formNeeds,
  });
}

export function addCaseFormNeed(
  context: CaseContext,
  formNeed: CaseFormNeed,
): CaseContext {
  return buildCaseContext({
    caseId: context.caseId,
    userId: context.userId,
    casePath: context.casePath,
    stage: context.stage,
    partyRole: context.partyRole,
    title: context.title,
    summary: context.summary,
    facts: context.facts,
    evidenceItems: context.evidenceItems,
    formNeeds: [...context.formNeeds, formNeed],
  });
}

export function buildCaseContextStoragePayload(context: CaseContext) {
  return {
    id: context.caseId,
    user_id: context.userId || null,
    case_path: context.casePath,
    stage: context.stage,
    party_role: context.partyRole,
    title: context.title,
    summary: context.summary,
    facts: context.facts,
    issues: context.issues,
    timeline: context.timeline,
    evidence_items: context.evidenceItems,
    evidence_analysis: context.evidenceAnalysis,
    legal_theory_analysis: context.legalTheoryAnalysis,
    procedural_intelligence: context.proceduralIntelligence,
    readiness: context.readiness,
    form_needs: context.formNeeds,
    risks: context.risks,
    strengths: context.strengths,
    weaknesses: context.weaknesses,
    missing_information: context.missingInformation,
    next_steps: context.nextSteps,
    strategy_notes: context.strategyNotes,
    court_package_notes: context.courtPackageNotes,
    master_case_file: context.masterCaseFile,
    created_at: context.createdAt,
    updated_at: context.updatedAt,
  };
}

export function restoreCaseContextFromPayload(payload: any): CaseContext {
  const evidenceItems = payload?.evidence_items || [];
  const evidenceAnalysis =
    payload?.evidence_analysis || analyzeEvidenceBundle(evidenceItems);

  const restoredInput: BuildCaseContextInput = {
    caseId: String(payload?.id || createId("case")),
    userId: payload?.user_id || undefined,
    casePath: normalizeCasePath(payload?.case_path),
    stage: normalizeCaseStage(payload?.stage),
    partyRole: normalizePartyRole(payload?.party_role),
    title: payload?.title || "Untitled case",
    summary: payload?.summary || "",
    facts: Array.isArray(payload?.facts) ? payload.facts : [],
    evidenceItems,
    formNeeds: Array.isArray(payload?.form_needs) ? payload.form_needs : [],
  };

  const rebuilt = buildCaseContext(restoredInput);

  const restoredWithoutMaster: Omit<CaseContext, "masterCaseFile"> = {
    ...rebuilt,
    createdAt: payload?.created_at || rebuilt.createdAt,
    updatedAt: payload?.updated_at || rebuilt.updatedAt,
    casePath: normalizeCasePath(payload?.case_path || rebuilt.casePath),
    stage: normalizeCaseStage(payload?.stage || rebuilt.stage),
    partyRole: normalizePartyRole(payload?.party_role || rebuilt.partyRole),
    evidenceAnalysis,
    issues: Array.isArray(payload?.issues) ? payload.issues : rebuilt.issues,
    timeline: Array.isArray(payload?.timeline)
      ? payload.timeline
      : rebuilt.timeline,
    risks: Array.isArray(payload?.risks) ? payload.risks : rebuilt.risks,
    strengths: Array.isArray(payload?.strengths)
      ? payload.strengths
      : rebuilt.strengths,
    weaknesses: Array.isArray(payload?.weaknesses)
      ? payload.weaknesses
      : rebuilt.weaknesses,
    missingInformation: Array.isArray(payload?.missing_information)
      ? payload.missing_information
      : rebuilt.missingInformation,
    nextSteps: Array.isArray(payload?.next_steps)
      ? payload.next_steps
      : rebuilt.nextSteps,
    strategyNotes: Array.isArray(payload?.strategy_notes)
      ? payload.strategy_notes
      : rebuilt.strategyNotes,
    courtPackageNotes: Array.isArray(payload?.court_package_notes)
      ? payload.court_package_notes
      : rebuilt.courtPackageNotes,
    legalTheoryAnalysis:
      payload?.legal_theory_analysis || rebuilt.legalTheoryAnalysis,
    proceduralIntelligence:
      payload?.procedural_intelligence || rebuilt.proceduralIntelligence,
    readiness: payload?.readiness || rebuilt.readiness,
  };

  return {
    ...restoredWithoutMaster,
    masterCaseFile:
      payload?.master_case_file || buildMasterCaseFile(restoredWithoutMaster),
  };
}