import { cleanList, includesAny, normalize } from "./utils";

export type CourtPath = "family" | "small-claims" | "civil" | "not-sure";

export type ScenarioStage =
  | "starting-case"
  | "responding"
  | "already-started"
  | "conference"
  | "motion"
  | "trial"
  | "enforcement"
  | "urgent"
  | "not-sure";

export type ScenarioRole =
  | "plaintiff"
  | "defendant"
  | "applicant"
  | "respondent"
  | "moving-party"
  | "other-party"
  | "not-sure";

export type ScenarioIssue = {
  id: string;
  label: string;
  confidence: number;
  reasons: string[];
};

export type ScenarioResult = {
  courtPath: CourtPath;
  stage: ScenarioStage;
  role: ScenarioRole;

  primaryIssue?: ScenarioIssue;
  secondaryIssues: ScenarioIssue[];
  possibleUnconfirmedIssues: ScenarioIssue[];
  excludedIssues: ScenarioIssue[];

  urgencyFlags: string[];
  evidenceReadiness: "strong" | "partial" | "weak" | "unknown";
  evidenceNotes: string[];

  formRoutingNotes: string[];
  strategyNotes: string[];
};

export type ScenarioInput = {
  courtPath: CourtPath | string;
  stage?: string;
  role?: string;
  issues?: string[];
  facts?: string;
  timeline?: string;
  evidence?: string;
  missingEvidence?: string;
  goal?: string;
  urgent?: string;
  filedDocuments?: string[];
  completedForms?: string[];
  receivedForms?: string[];
};

function scoreIssue(
  id: string,
  label: string,
  text: string,
  strongTriggers: string[],
  supportingTriggers: string[],
  exclusionTriggers: string[] = []
): ScenarioIssue {
  let confidence = 0;
  const reasons: string[] = [];

  const strongMatches = strongTriggers.filter((term) => includesAny(text, [term]));
  const supportMatches = supportingTriggers.filter((term) => includesAny(text, [term]));
  const exclusionMatches = exclusionTriggers.filter((term) => includesAny(text, [term]));

  confidence += strongMatches.length * 30;
  confidence += supportMatches.length * 12;
  confidence -= exclusionMatches.length * 35;

  if (strongMatches.length >= 2) confidence += 15;
  if (supportMatches.length >= 3) confidence += 10;

  if (strongMatches.length > 0) {
    reasons.push(`Strong trigger matched: ${strongMatches.join(", ")}`);
  }

  if (supportMatches.length > 0) {
    reasons.push(`Supporting trigger matched: ${supportMatches.join(", ")}`);
  }

  if (exclusionMatches.length > 0) {
    reasons.push(`Possible exclusion: ${exclusionMatches.join(", ")}`);
  }

  return {
    id,
    label,
    confidence: Math.max(0, Math.min(100, confidence)),
    reasons: cleanList(reasons),
  };
}

function normalizeCourtPath(path: string): CourtPath {
  const value = normalize(path);

  if (value.includes("small")) return "small-claims";
  if (value.includes("family")) return "family";
  if (value.includes("civil")) return "civil";

  return "not-sure";
}

function normalizeStageValue(text: string): ScenarioStage {
  const value = normalize(text);

  if (
    value.includes("start") ||
    value.includes("new case") ||
    value.includes("nothing filed")
  ) {
    return "starting-case";
  }

  if (
    value.includes("respond") ||
    value.includes("defence") ||
    value.includes("defense") ||
    value.includes("served with")
  ) {
    return "responding";
  }

  if (value.includes("conference") || value.includes("settlement conference")) {
    return "conference";
  }

  if (value.includes("motion")) return "motion";
  if (value.includes("trial")) return "trial";

  if (
    value.includes("enforce") ||
    value.includes("garnish") ||
    value.includes("judgment not paid")
  ) {
    return "enforcement";
  }

  if (
    value.includes("urgent") ||
    value.includes("emergency") ||
    value.includes("deadline")
  ) {
    return "urgent";
  }

  if (value.includes("filed") || value.includes("already started")) {
    return "already-started";
  }

  return "not-sure";
}

function detectRole(text: string, courtPath: CourtPath): ScenarioRole {
  const value = normalize(text);

  if (courtPath === "family") {
    if (
      includesAny(value, [
        "applicant",
        "i filed",
        "i am starting",
        "i brought the application",
      ])
    ) {
      return "applicant";
    }

    if (
      includesAny(value, [
        "respondent",
        "served with application",
        "my ex filed",
        "responding",
      ])
    ) {
      return "respondent";
    }
  }

  if (
    includesAny(value, [
      "plaintiff",
      "i am suing",
      "i want to sue",
      "claimant",
    ])
  ) {
    return "plaintiff";
  }

  if (
    includesAny(value, [
      "defendant",
      "being sued",
      "served with a claim",
      "claim against me",
      "i am defending",
    ])
  ) {
    return "defendant";
  }

  if (
    includesAny(value, [
      "motion",
      "moving party",
      "i need a motion",
    ])
  ) {
    return "moving-party";
  }

  return "not-sure";
}

function assessEvidence(text: string): ScenarioResult["evidenceReadiness"] {
  const evidenceTerms = [
    "screenshot",
    "invoice",
    "receipt",
    "contract",
    "email",
    "text",
    "photo",
    "record",
    "witness",
    "bank",
    "etransfer",
    "e-transfer",
    "quote",
    "estimate",
    "statement",
    "message",
    "messages",
  ];

  const matches = evidenceTerms.filter((term) => includesAny(text, [term])).length;

  if (matches >= 5) return "strong";
  if (matches >= 2) return "partial";
  if (normalize(text).length > 20) return "weak";

  return "unknown";
}

export function runScenarioEngine(input: ScenarioInput): ScenarioResult {
  const text = normalize(
    [
      input.courtPath || "",
      input.stage || "",
      input.role || "",
      (input.issues || []).join(" "),
      input.facts || "",
      input.timeline || "",
      input.evidence || "",
      input.missingEvidence || "",
      input.goal || "",
      input.urgent || "",
      (input.filedDocuments || []).join(" "),
      (input.completedForms || []).join(" "),
      (input.receivedForms || []).join(" "),
    ].join(" ")
  );

  const courtPath = normalizeCourtPath(String(input.courtPath || ""));
  const stage = normalizeStageValue(text);
  const role = detectRole(text, courtPath);

  const scoredIssues = [
    scoreIssue(
      "debt-unpaid-money",
      "Debt / unpaid money",
      text,
      ["owe", "owed", "unpaid", "loan", "debt", "invoice", "did not pay", "didn't pay", "repay"],
      ["payment", "balance", "money back", "e-transfer", "etransfer", "deposit", "refund"],
      ["defamation", "slander", "libel", "custody", "parenting", "injury"]
    ),

    scoreIssue(
      "contract-breach",
      "Contract / agreement dispute",
      text,
      ["contract", "agreement", "breach", "quote", "estimate", "scope"],
      ["services", "work", "renovation", "contractor", "job", "terms", "promise"],
      ["custody", "parenting"]
    ),

    scoreIssue(
      "property-damage",
      "Property damage / defective work",
      text,
      ["property damage", "damaged property", "repair cost", "vehicle damage", "broken", "defective"],
      ["photo", "estimate", "repair", "mechanic", "leak", "crack", "poor work"],
      ["emotional damage", "reputation damage", "defamation", "slander", "libel"]
    ),

    scoreIssue(
      "defamation",
      "Defamation / reputational harm",
      text,
      ["defamation", "slander", "libel", "false statement", "lied about me", "reputation"],
      ["posted", "facebook", "instagram", "accused me", "called me", "rumour", "harassment complaint", "apology", "retraction", "third party", "messages to a third party"],
      ["property damage", "repair", "invoice"]
    ),

    scoreIssue(
      "consumer-refund",
      "Consumer purchase / refund dispute",
      text,
      ["refund", "deposit", "defective product", "consumer", "purchase"],
      ["seller", "store", "bought", "return", "warranty"],
      ["custody", "parenting", "defamation"]
    ),

    scoreIssue(
      "enforcement",
      "Enforcement after judgment",
      text,
      ["judgment not paid", "enforce judgment", "garnishment", "collect judgment"],
      ["debtor", "writ", "payment after judgment", "exam hearing"],
      ["starting a new case", "defamation"]
    ),

    scoreIssue(
      "family-parenting",
      "Parenting / decision-making responsibility",
      text,
      ["custody", "parenting", "decision-making", "access", "parenting time"],
      ["child lives", "schedule", "school", "pickup", "drop off", "denied access"],
      ["invoice", "loan", "business", "defamation"]
    ),

    scoreIssue(
      "family-support",
      "Child or spousal support",
      text,
      ["child support", "spousal support", "income", "financial disclosure"],
      ["pay stubs", "tax return", "notice of assessment", "arrears", "section 7 expenses"],
      ["invoice", "defamation"]
    ),

    scoreIssue(
      "civil-negligence",
      "Negligence",
      text,
      ["negligence", "duty of care", "failed to", "unsafe", "foreseeable"],
      ["injury", "harm", "supervision", "ignored risk", "warning"],
      ["invoice", "loan", "refund", "defamation"]
    ),

    scoreIssue(
      "civil-charter",
      "Charter / government rights claim",
      text,
      ["charter", "section 7", "s.7", "security of the person", "fundamental justice"],
      ["government", "state", "police", "crown", "public authority", "rights"],
      ["private contract", "invoice", "refund", "defamation"]
    ),
  ].sort((a, b) => b.confidence - a.confidence);

  const confirmed = scoredIssues.filter((issue) => issue.confidence >= 55);
  const possible = scoredIssues.filter(
    (issue) => issue.confidence >= 25 && issue.confidence < 55
  );
  const excluded = scoredIssues.filter((issue) => issue.confidence < 25);

  const primaryIssue = confirmed[0];
  const secondaryIssues = confirmed.slice(1, 3);

  const urgencyFlags: string[] = [];

  if (
    includesAny(text, [
      "deadline",
      "tomorrow",
      "urgent",
      "default",
      "trial",
      "conference",
      "served",
      "settlement conference",
    ])
  ) {
    urgencyFlags.push("Possible deadline or procedural timing issue.");
  }

  if (
    includesAny(text, [
      "limitation",
      "two years",
      "2 years",
      "years ago",
      "old claim",
    ])
  ) {
    urgencyFlags.push("Possible limitation-period issue.");
  }

  const evidenceReadiness = assessEvidence(text);
  const evidenceNotes: string[] = [];

  if (evidenceReadiness === "strong") {
    evidenceNotes.push("Evidence appears to include several useful categories.");
  } else if (evidenceReadiness === "partial") {
    evidenceNotes.push("Some evidence is identified, but the system should ask for missing proof tied to each legal element.");
  } else if (evidenceReadiness === "weak") {
    evidenceNotes.push("Facts are present, but evidence support appears thin.");
  } else {
    evidenceNotes.push("Evidence status is unclear.");
  }

  const formRoutingNotes: string[] = [];

  if (primaryIssue) {
    formRoutingNotes.push(`Use ${primaryIssue.label} as the main form-routing issue.`);
  } else {
    formRoutingNotes.push("No primary issue confirmed. Ask clarifying questions before recommending advanced forms.");
  }

  if (stage === "conference") {
    formRoutingNotes.push("Conference-stage tasks should be routed to case package items, not official form matching unless an official form is specifically triggered.");
  }

  if (stage === "starting-case") {
    formRoutingNotes.push("Starting-stage logic should prioritize originating forms only.");
  }

  if (stage === "responding") {
    formRoutingNotes.push("Responding-stage logic should prioritize response/defence forms only.");
  }

  const strategyNotes: string[] = [];

  if (primaryIssue) {
    strategyNotes.push(`Deep legal analysis should focus on ${primaryIssue.label}.`);
  }

  if (possible.length > 0) {
    strategyNotes.push("Possible secondary issues should be shown as questions to confirm, not full recommendations.");
  }

  strategyNotes.push("Do not run full legal-theory output for weak matches.");

  return {
    courtPath,
    stage,
    role,
    primaryIssue,
    secondaryIssues,
    possibleUnconfirmedIssues: possible.slice(0, 5),
    excludedIssues: excluded,
    urgencyFlags: cleanList(urgencyFlags),
    evidenceReadiness,
    evidenceNotes: cleanList(evidenceNotes),
    formRoutingNotes: cleanList(formRoutingNotes),
    strategyNotes: cleanList(strategyNotes),
  };
}