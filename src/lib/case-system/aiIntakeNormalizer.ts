export type CourtSimplifiedCasePath =
  | "small-claims"
  | "family"
  | "civil"
  | "not-sure";

export type IntakeStage =
  | "starting-case"
  | "responding"
  | "already-started"
  | "conference"
  | "motion"
  | "trial"
  | "enforcement"
  | "urgent"
  | "not-sure";

export type ClaimFamily =
  | "debt-unpaid-money"
  | "loan-repayment"
  | "deposit-refund"
  | "contract-breach"
  | "services-work-dispute"
  | "consumer-goods"
  | "property-damage"
  | "vehicle-dispute"
  | "defamation-reputation"
  | "privacy-or-harassment-civil"
  | "negligence-financial-loss"
  | "personal-injury"
  | "employment-wages"
  | "return-of-property"
  | "fraud-misrepresentation"
  | "enforcement-after-judgment"
  | "responding-defence"
  | "settlement-conference-prep"
  | "trial-prep"
  | "jurisdiction-warning"
  | "family-parenting"
  | "family-support"
  | "family-property"
  | "civil-charter"
  | "civil-institutional-liability"
  | "unknown";

export type DamageCategory =
  | "money-owed"
  | "refund"
  | "contract-loss"
  | "repair-replacement"
  | "property-loss"
  | "vehicle-loss"
  | "reputational-harm"
  | "business-reputation-loss"
  | "emotional-distress"
  | "lost-income"
  | "out-of-pocket-expense"
  | "personal-injury"
  | "privacy-harm"
  | "punitive-or-aggravated"
  | "interest-costs"
  | "unclear";

export type EvidenceCategory =
  | "contract-agreement"
  | "invoice-payment"
  | "receipt-expense"
  | "bank-transfer"
  | "text-email-message"
  | "social-media-post"
  | "screenshot"
  | "photo-video"
  | "repair-estimate"
  | "witness"
  | "publication-recipient"
  | "retraction-apology"
  | "medical"
  | "employment-income"
  | "court-document"
  | "service-proof"
  | "settlement-communication"
  | "judgment-enforcement"
  | "ownership-property"
  | "expert-inspection"
  | "other";

export type LegalElementStatus =
  | "supported"
  | "partially-supported"
  | "missing"
  | "unclear"
  | "not-applicable";

export type NormalizedLegalElement = {
  id: string;
  label: string;
  status: LegalElementStatus;
  userFacingNeed?: string;
  internalReason?: string;
  linkedEvidenceCategories: EvidenceCategory[];
};

export type NormalizedEvidenceItem = {
  id: string;
  title: string;
  description: string;
  category: EvidenceCategory;
  date?: string;
  source?: string;
  relevance?: string;
  fileName?: string;
  confidence: number;
};

export type NormalizedTimelineEvent = {
  id: string;
  date?: string;
  title: string;
  description: string;
  linkedEvidenceIds: string[];
  confidence: number;
};

export type ClaimFamilyScore = {
  family: ClaimFamily;
  label: string;
  score: number;
  confidence: number;
  reasons: string[];
  negativeReasons: string[];
};

export type SuppressionDecision = {
  suppressedFamily: ClaimFamily;
  reason: string;
  hiddenFromUser: true;
};

export type IntakeQualityIssue = {
  id: string;
  field:
    | "facts"
    | "timeline"
    | "evidence"
    | "damages"
    | "parties"
    | "stage"
    | "role"
    | "goal"
    | "jurisdiction"
    | "documents";
  severity: "low" | "moderate" | "high";
  message: string;
};

export type NormalizedCaseData = {
  id: string;
  casePath: CourtSimplifiedCasePath;
  stage: IntakeStage;
  role: string;

  primaryClaimFamily: ClaimFamily;
  primaryClaimLabel: string;
  primaryConfidence: number;

  secondaryClaimFamilies: ClaimFamilyScore[];
  possibleUnconfirmedFamilies: ClaimFamilyScore[];
  suppressedFamilies: SuppressionDecision[];

  parties: {
    userName?: string;
    otherParty?: string;
    userAddress?: string;
    otherPartyAddress?: string;
    courtLocation?: string;
    claimNumber?: string;
  };

  money: {
    amountClaimed?: string;
    damagesBreakdown?: string;
    hasAmount: boolean;
    hasDamagesBreakdown: boolean;
    parsedAmounts: number[];
    withinOntarioSmallClaimsLimit?: boolean;
  };

  userGoal: {
    rawGoal?: string;
    wantsMoney: boolean;
    wantsDismissal: boolean;
    wantsReturnOfProperty: boolean;
    wantsApologyRetraction: boolean;
    wantsPaymentPlan: boolean;
    wantsEnforcement: boolean;
    hasGoal: boolean;
  };

  damages: {
    categories: DamageCategory[];
    notes: string[];
  };

  evidence: {
    items: NormalizedEvidenceItem[];
    categories: EvidenceCategory[];
    hasEvidence: boolean;
    evidenceReadiness: "strong" | "partial" | "weak" | "unknown";
  };

  timeline: {
    rawTimeline?: string;
    events: NormalizedTimelineEvent[];
    hasTimeline: boolean;
  };

  legalElements: NormalizedLegalElement[];

  procedural: {
    filedDocuments: string[];
    completedForms: string[];
    receivedForms: string[];
    isStarting: boolean;
    isResponding: boolean;
    isConference: boolean;
    isTrial: boolean;
    isEnforcement: boolean;
    isUrgent: boolean;
  };

  intakeQuality: IntakeQualityIssue[];

  internal: {
    allScores: ClaimFamilyScore[];
    normalizedTextBuckets: Record<string, string>;
    suppressionApplied: boolean;
  };
};

export type AiIntakeNormalizerInput = {
  casePath?: string;
  stage?: string;
  role?: string;

  facts?: string;
  timeline?: string;
  evidence?: string;
  missingEvidence?: string;
  goal?: string;
  urgent?: string;

  issues?: string[];
  filedDocuments?: string[];
  completedForms?: string[];
  receivedForms?: string[];
  availableEvidence?: string[];

  userData?: Record<string, unknown>;
  uploadedEvidenceFiles?: Array<Record<string, unknown>>;

  conversationText?: string;
};

const ONTARIO_SMALL_CLAIMS_LIMIT = 50000;

function nowId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function clean(value: unknown) {
  return String(value || "").trim();
}

function normalize(value: unknown) {
  return clean(value)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function cleanList<T extends string>(items: T[]) {
  return Array.from(new Set(items.map((item) => clean(item) as T).filter(Boolean)));
}

function includesAny(text: string, terms: string[]) {
  const value = normalize(text);
  return terms.some((term) => value.includes(normalize(term)));
}

function countMatches(text: string, terms: string[]) {
  const value = normalize(text);
  return terms.filter((term) => value.includes(normalize(term))).length;
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    const cleaned = clean(value);
    if (cleaned) return cleaned;
  }

  return "";
}

function getUserDataString(userData: Record<string, unknown> | undefined, keys: string[]) {
  if (!userData) return "";

  for (const key of keys) {
    const value = userData[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function normalizeCasePath(value: unknown): CourtSimplifiedCasePath {
  const text = normalize(value);

  if (text.includes("small")) return "small-claims";
  if (text.includes("family")) return "family";
  if (text.includes("civil")) return "civil";

  return "not-sure";
}

function normalizeStage(value: unknown, fullText: string): IntakeStage {
  const text = normalize(`${value || ""} ${fullText}`);

  if (
    includesAny(text, [
      "settlement conference",
      "conference scheduled",
      "case conference",
      "conference",
    ])
  ) {
    return "conference";
  }

  if (
    includesAny(text, [
      "responding",
      "defence",
      "defense",
      "served with a claim",
      "being sued",
      "claim against me",
    ])
  ) {
    return "responding";
  }

  if (
    includesAny(text, [
      "trial",
      "trial date",
      "trial preparation",
      "witness list",
    ])
  ) {
    return "trial";
  }

  if (
    includesAny(text, [
      "enforcement",
      "enforce judgment",
      "garnish",
      "garnishment",
      "collect judgment",
      "judgment debtor",
    ])
  ) {
    return "enforcement";
  }

  if (
    includesAny(text, [
      "motion",
      "urgent motion",
      "bring a motion",
    ])
  ) {
    return "motion";
  }

  if (
    includesAny(text, [
      "urgent",
      "emergency",
      "deadline tomorrow",
      "default",
      "limitation",
    ])
  ) {
    return "urgent";
  }

  if (
    includesAny(text, [
      "already filed",
      "already started",
      "claim number",
      "court file",
    ])
  ) {
    return "already-started";
  }

  if (
    includesAny(text, [
      "starting",
      "start a claim",
      "start my claim",
      "nothing filed",
      "not filed",
      "new case",
      "want to sue",
    ])
  ) {
    return "starting-case";
  }

  return "not-sure";
}

function extractDollarAmounts(text: string) {
  const matches = normalize(text).match(/\$?\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\$?\s?\d+(?:\.\d{2})?/g);

  if (!matches) return [];

  return matches
    .map((match) => Number(match.replace(/[$,\s]/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0);
}

function scoreFamily(params: {
  family: ClaimFamily;
  label: string;
  buckets: Record<string, string>;
  strong: string[];
  support: string[];
  weak?: string[];
  negative?: string[];
  selectedIssueBoost?: boolean;
  stageBoost?: boolean;
}): ClaimFamilyScore {
  const {
    family,
    label,
    buckets,
    strong,
    support,
    weak = [],
    negative = [],
    selectedIssueBoost = false,
    stageBoost = false,
  } = params;

  const factText = buckets.facts || "";
  const issueText = buckets.issues || "";
  const evidenceText = buckets.evidence || "";
  const goalText = buckets.goal || "";
  const stageText = buckets.stage || "";
  const allText = buckets.all || "";

  let score = 0;
  const reasons: string[] = [];
  const negativeReasons: string[] = [];

  const strongFacts = countMatches(factText, strong);
  const strongIssues = countMatches(issueText, strong);
  const strongEvidence = countMatches(evidenceText, strong);
  const supportFacts = countMatches(factText, support);
  const supportEvidence = countMatches(evidenceText, support);
  const weakMatches = countMatches(allText, weak);
  const negativeMatches = countMatches(allText, negative);

  if (selectedIssueBoost) {
    score += 45;
    reasons.push("User selected an issue matching this claim family.");
  }

  if (stageBoost) {
    score += 25;
    reasons.push("Procedural stage strongly supports this family.");
  }

  if (strongIssues > 0) {
    score += strongIssues * 35;
    reasons.push(`Issue selection/label strongly supports this family.`);
  }

  if (strongFacts > 0) {
    score += strongFacts * 30;
    reasons.push(`Facts contain strong claim-family indicators.`);
  }

  if (strongEvidence > 0) {
    score += strongEvidence * 18;
    reasons.push(`Evidence description contains strong supporting indicators.`);
  }

  if (supportFacts > 0) {
    score += supportFacts * 12;
    reasons.push(`Facts contain supporting indicators.`);
  }

  if (supportEvidence > 0) {
    score += supportEvidence * 8;
    reasons.push(`Evidence contains supporting indicators.`);
  }

  if (weakMatches > 0) {
    score += weakMatches * 3;
    reasons.push(`Weak contextual indicators are present.`);
  }

  if (negativeMatches > 0) {
    score -= negativeMatches * 25;
    negativeReasons.push("Contrary indicators suggest this family may not fit.");
  }

  if (goalText && family === "enforcement-after-judgment" && includesAny(goalText, ["collect", "garnish", "enforce"])) {
    score += 25;
    reasons.push("Requested result supports enforcement.");
  }

  if (stageText && family === "settlement-conference-prep" && includesAny(stageText, ["conference", "settlement"])) {
    score += 35;
    reasons.push("Stage supports settlement conference preparation.");
  }

  const boundedScore = Math.max(0, Math.min(100, score));

  return {
    family,
    label,
    score: boundedScore,
    confidence: boundedScore,
    reasons: cleanList(reasons),
    negativeReasons: cleanList(negativeReasons),
  };
}

function detectClaimFamilies(input: AiIntakeNormalizerInput, buckets: Record<string, string>) {
  const selectedIssues = normalize((input.issues || []).join(" "));
  const stage = normalize(input.stage || "");
  const filedDocs = normalize((input.filedDocuments || []).join(" "));

  const selected = (terms: string[]) => includesAny(selectedIssues, terms);

  const scores: ClaimFamilyScore[] = [
    scoreFamily({
      family: "debt-unpaid-money",
      label: "Unpaid money / invoice",
      buckets,
      strong: ["unpaid invoice", "unpaid", "owes me", "owe me", "did not pay", "didn't pay", "balance owing", "amount owing"],
      support: ["invoice", "bill", "payment", "paid", "e-transfer", "etransfer", "account statement"],
      negative: ["defamation", "slander", "libel", "reputation"],
      selectedIssueBoost: selected(["unpaid", "invoice", "money"]),
    }),
    scoreFamily({
      family: "loan-repayment",
      label: "Loan repayment",
      buckets,
      strong: ["loan", "borrowed", "repay", "lent", "loan agreement"],
      support: ["payment", "etransfer", "e-transfer", "money back", "installment"],
      negative: ["defamation", "slander", "property damage"],
      selectedIssueBoost: selected(["loan", "debt"]),
    }),
    scoreFamily({
      family: "deposit-refund",
      label: "Deposit / refund",
      buckets,
      strong: ["deposit", "refund", "kept my deposit", "return my deposit", "money back"],
      support: ["cancelled", "canceled", "return", "purchase", "booking", "seller"],
      negative: ["defamation", "slander", "libel"],
      selectedIssueBoost: selected(["deposit", "refund"]),
    }),
    scoreFamily({
      family: "contract-breach",
      label: "Contract / agreement breach",
      buckets,
      strong: ["contract", "agreement", "breach", "written agreement", "terms of agreement"],
      support: ["quote", "estimate", "scope", "promise", "terms", "deal"],
      negative: ["defamation", "slander", "libel", "custody", "parenting"],
      selectedIssueBoost: selected(["contract", "agreement"]),
    }),
    scoreFamily({
      family: "services-work-dispute",
      label: "Services / work dispute",
      buckets,
      strong: ["unfinished work", "poor work", "bad work", "contractor", "renovation", "services not completed"],
      support: ["job", "work", "service", "quote", "estimate", "materials"],
      negative: ["defamation", "slander", "libel", "reputation", "emotional damage"],
      selectedIssueBoost: selected(["work", "services", "renovation"]),
    }),
    scoreFamily({
      family: "consumer-goods",
      label: "Consumer goods / defective product",
      buckets,
      strong: ["defective product", "faulty product", "bought", "purchase", "consumer"],
      support: ["seller", "store", "warranty", "return", "receipt"],
      negative: ["defamation", "slander", "libel"],
      selectedIssueBoost: selected(["consumer", "purchase"]),
    }),
    scoreFamily({
      family: "property-damage",
      label: "Property damage",
      buckets,
      strong: ["property damage", "damaged my property", "damaged vehicle", "broken property", "destroyed property"],
      support: ["before and after", "repair estimate", "repair invoice", "inspection", "replacement cost"],
      weak: ["damage", "repair", "broken"],
      negative: ["reputation damage", "reputational damage", "emotional damage", "defamation", "slander", "libel"],
      selectedIssueBoost: selected(["property damage"]),
    }),
    scoreFamily({
      family: "vehicle-dispute",
      label: "Vehicle dispute",
      buckets,
      strong: ["vehicle", "car", "auto repair", "mechanic", "dealership", "vehicle damage"],
      support: ["repair estimate", "repair invoice", "tow", "parts", "inspection"],
      negative: ["defamation", "slander", "reputation"],
      selectedIssueBoost: selected(["vehicle"]),
    }),
    scoreFamily({
      family: "defamation-reputation",
      label: "Defamation / reputational harm",
      buckets,
      strong: ["defamation", "slander", "libel", "false statement", "lied about me", "reputation", "reputational harm", "reputation damage"],
      support: [
        "accused me",
        "posted",
        "facebook",
        "instagram",
        "tiktok",
        "messages to",
        "told my",
        "told people",
        "third party",
        "screenshots",
        "apology",
        "retraction",
        "false accusation",
        "called me",
      ],
      weak: ["rumour", "harassment", "credibility", "embarrassed"],
      negative: ["broken property", "repair estimate", "vehicle damage"],
      selectedIssueBoost: selected(["defamation", "slander", "libel", "reputation"]),
    }),
    scoreFamily({
      family: "privacy-or-harassment-civil",
      label: "Privacy / harassment-style civil harm",
      buckets,
      strong: ["harassment", "private information", "shared private", "dox", "doxxing", "privacy"],
      support: ["messages", "repeated", "posted", "threatened", "humiliated"],
      negative: ["invoice", "loan", "refund"],
    }),
    scoreFamily({
      family: "negligence-financial-loss",
      label: "Negligence / financial loss",
      buckets,
      strong: ["negligence", "careless", "failed to", "duty of care", "unsafe"],
      support: ["loss", "harm", "damage", "ignored", "warning"],
      negative: ["defamation", "slander", "libel"],
    }),
    scoreFamily({
      family: "personal-injury",
      label: "Personal injury",
      buckets,
      strong: ["injury", "hurt", "medical", "pain", "accident"],
      support: ["doctor", "hospital", "physio", "treatment", "lost wages"],
      negative: ["defamation", "invoice", "refund"],
    }),
    scoreFamily({
      family: "employment-wages",
      label: "Employment / wages",
      buckets,
      strong: ["unpaid wages", "wages", "paycheque", "paycheck", "termination pay", "vacation pay"],
      support: ["employer", "employee", "hours worked", "shift", "pay stub"],
      negative: ["defamation", "consumer", "vehicle"],
    }),
    scoreFamily({
      family: "return-of-property",
      label: "Return of personal property",
      buckets,
      strong: ["return my property", "won't return", "kept my property", "personal property"],
      support: ["belongings", "items", "possession", "owned"],
      negative: ["defamation", "slander"],
    }),
    scoreFamily({
      family: "fraud-misrepresentation",
      label: "Fraud / misrepresentation",
      buckets,
      strong: ["fraud", "misrepresentation", "lied to get money", "false promise", "scam"],
      support: ["trusted", "deceived", "fake", "dishonest", "sent money"],
      negative: ["defamation", "slander"],
    }),
    scoreFamily({
      family: "enforcement-after-judgment",
      label: "Enforcement after judgment",
      buckets,
      strong: ["judgment not paid", "enforce judgment", "garnishment", "collect judgment"],
      support: ["debtor", "writ", "examination hearing", "bank account", "employer"],
      negative: ["starting a claim"],
      selectedIssueBoost: selected(["enforcement"]) || includesAny(filedDocs, ["enforcement"]),
      stageBoost: includesAny(stage, ["enforcement"]),
    }),
    scoreFamily({
      family: "responding-defence",
      label: "Responding to a claim",
      buckets,
      strong: ["being sued", "served with a claim", "claim against me", "i am defendant", "defence"],
      support: ["admit", "deny", "dispute", "counterclaim", "set-off", "setoff"],
      selectedIssueBoost: selected(["defending"]) || includesAny(stage, ["responding"]),
      stageBoost: includesAny(stage, ["responding"]),
    }),
    scoreFamily({
      family: "settlement-conference-prep",
      label: "Settlement conference preparation",
      buckets,
      strong: ["settlement conference", "conference scheduled", "conference brief"],
      support: ["offer to settle", "settlement", "proposal", "resolution"],
      selectedIssueBoost: selected(["settlement"]),
      stageBoost: includesAny(stage, ["conference"]),
    }),
    scoreFamily({
      family: "trial-prep",
      label: "Trial preparation",
      buckets,
      strong: ["trial", "trial date", "witness list", "trial preparation"],
      support: ["witness", "evidence list", "questions", "exhibits"],
      stageBoost: includesAny(stage, ["trial"]),
    }),
  ];

  return scores.sort((a, b) => b.score - a.score);
}

function applySuppression(scores: ClaimFamilyScore[]) {
  const primary = scores[0];
  const suppressed: SuppressionDecision[] = [];
  let filtered = scores.slice();

  if (!primary) {
    return {
      primary,
      secondary: [],
      possible: [],
      suppressed,
      filtered,
    };
  }

  const suppress = (family: ClaimFamily, reason: string) => {
    const target = filtered.find((score) => score.family === family);

    if (!target) return;

    suppressed.push({
      suppressedFamily: family,
      reason,
      hiddenFromUser: true,
    });

    filtered = filtered.filter((score) => score.family !== family);
  };

  if (primary.family === "defamation-reputation") {
    suppress("property-damage", "Reputational harm controls the analysis; physical property damage logic is irrelevant unless separately and strongly established.");
    suppress("vehicle-dispute", "Vehicle/property repair logic is unrelated to the dominant reputational harm claim.");
    suppress("services-work-dispute", "Work/repair-service logic is not part of the dominant reputational harm claim.");
    suppress("consumer-goods", "Consumer goods logic is not part of the dominant reputational harm claim.");
  }

  if (primary.family === "property-damage") {
    suppress("defamation-reputation", "Physical property damage controls the analysis; reputational harm logic is not dominant.");
  }

  if (primary.family === "enforcement-after-judgment") {
    suppress("debt-unpaid-money", "The case is in enforcement posture; analysis should focus on collecting judgment, not proving the original debt again.");
    suppress("contract-breach", "The case is in enforcement posture; originating claim logic is not dominant.");
    suppress("property-damage", "The case is in enforcement posture; originating claim logic is not dominant.");
  }

  if (primary.family === "responding-defence") {
    suppress("settlement-conference-prep", "Response/defence posture controls until conference stage is confirmed.");
  }

  return {
    primary: filtered[0],
    secondary: filtered.filter((score) => score.score >= 55).slice(1, 4),
    possible: filtered.filter((score) => score.score >= 25 && score.score < 55).slice(0, 6),
    suppressed,
    filtered,
  };
}

function classifyDamageCategories(buckets: Record<string, string>, primary: ClaimFamily | undefined): DamageCategory[] {
  const text = buckets.all || "";
  const categories: DamageCategory[] = [];

  if (includesAny(text, ["unpaid", "owe", "owed", "invoice", "debt", "loan"])) {
    categories.push("money-owed");
  }

  if (includesAny(text, ["refund", "deposit", "money back"])) {
    categories.push("refund");
  }

  if (includesAny(text, ["contract", "agreement", "breach", "services", "work"])) {
    categories.push("contract-loss");
  }

  if (
    primary === "property-damage" ||
    includesAny(text, ["repair estimate", "replacement cost", "damaged property", "broken property"])
  ) {
    categories.push("repair-replacement", "property-loss");
  }

  if (primary === "vehicle-dispute") {
    categories.push("vehicle-loss");
  }

  if (
    primary === "defamation-reputation" ||
    includesAny(text, ["reputation", "defamation", "slander", "libel"])
  ) {
    categories.push("reputational-harm");
  }

  if (includesAny(text, ["business", "clients", "lost client", "lost work", "word of mouth"])) {
    categories.push("business-reputation-loss", "lost-income");
  }

  if (includesAny(text, ["stress", "distress", "humiliated", "embarrassed", "emotional"])) {
    categories.push("emotional-distress");
  }

  if (includesAny(text, ["expense", "out of pocket", "paid for", "cost me"])) {
    categories.push("out-of-pocket-expense");
  }

  if (includesAny(text, ["punitive", "aggravated", "punish"])) {
    categories.push("punitive-or-aggravated");
  }

  if (includesAny(text, ["interest", "costs", "court costs"])) {
    categories.push("interest-costs");
  }

  return cleanList(categories.length > 0 ? categories : ["unclear"]);
}

function classifyEvidenceCategories(text: string): EvidenceCategory[] {
  const categories: EvidenceCategory[] = [];

  if (includesAny(text, ["contract", "agreement", "quote", "terms"])) categories.push("contract-agreement");
  if (includesAny(text, ["invoice", "payment", "receipt", "paid", "balance"])) categories.push("invoice-payment");
  if (includesAny(text, ["receipt", "expense", "cost"])) categories.push("receipt-expense");
  if (includesAny(text, ["bank", "etransfer", "e-transfer"])) categories.push("bank-transfer");
  if (includesAny(text, ["text", "email", "message", "messages", "chat"])) categories.push("text-email-message");
  if (includesAny(text, ["facebook", "instagram", "tiktok", "post", "posted"])) categories.push("social-media-post");
  if (includesAny(text, ["screenshot", "screenshots"])) categories.push("screenshot");
  if (includesAny(text, ["photo", "video", "picture"])) categories.push("photo-video");
  if (includesAny(text, ["repair estimate", "estimate", "inspection"])) categories.push("repair-estimate");
  if (includesAny(text, ["witness", "saw", "heard", "recipient"])) categories.push("witness");
  if (includesAny(text, ["third party", "publication", "told my", "sent to"])) categories.push("publication-recipient");
  if (includesAny(text, ["apology", "retraction", "take it down"])) categories.push("retraction-apology");
  if (includesAny(text, ["court", "claim", "defence", "order", "judgment"])) categories.push("court-document");
  if (includesAny(text, ["served", "service", "affidavit of service"])) categories.push("service-proof");
  if (includesAny(text, ["settlement", "offer"])) categories.push("settlement-communication");
  if (includesAny(text, ["judgment", "garnish", "debtor"])) categories.push("judgment-enforcement");

  return cleanList(categories);
}

function normalizeEvidenceItems(input: AiIntakeNormalizerInput, buckets: Record<string, string>): NormalizedEvidenceItem[] {
  const uploaded = input.uploadedEvidenceFiles || [];
  const items: NormalizedEvidenceItem[] = uploaded.map((file) => {
    const title = pickString(file.title, file.name, "Evidence item");
    const description = pickString(file.description, file.relevance, "");
    const fileText = normalize(
      [
        file.name,
        file.title,
        file.description,
        file.category,
        file.evidenceDate,
        file.source,
        file.relevance,
      ].join(" ")
    );

    const categories = classifyEvidenceCategories(fileText);

    return {
      id: pickString(file.id, nowId("evidence")),
      title,
      description,
      category: categories[0] || "other",
      date: pickString(file.evidenceDate),
      source: pickString(file.source),
      relevance: pickString(file.relevance),
      fileName: pickString(file.name),
      confidence: description ? 80 : 45,
    };
  });

  if (items.length === 0 && buckets.evidence) {
    const categories = classifyEvidenceCategories(buckets.evidence);

    if (categories.length > 0) {
      items.push({
        id: nowId("evidence_text"),
        title: "Evidence described in intake",
        description: buckets.evidence,
        category: categories[0],
        confidence: 55,
      });
    }
  }

  return items;
}

function buildLegalElements(primary: ClaimFamily | undefined, normalized: {
  evidenceCategories: EvidenceCategory[];
  hasAmount: boolean;
  hasDamagesBreakdown: boolean;
  hasTimeline: boolean;
  hasGoal: boolean;
  buckets: Record<string, string>;
}): NormalizedLegalElement[] {
  const evidence = normalized.evidenceCategories;
  const text = normalized.buckets.all || "";

  const hasEvidence = (categories: EvidenceCategory[]) =>
    categories.some((category) => evidence.includes(category));

  const element = (
    id: string,
    label: string,
    requiredEvidence: EvidenceCategory[],
    condition: boolean,
    userFacingNeed: string
  ): NormalizedLegalElement => ({
    id,
    label,
    status: condition
      ? "supported"
      : hasEvidence(requiredEvidence)
        ? "partially-supported"
        : "missing",
    userFacingNeed: condition ? undefined : userFacingNeed,
    linkedEvidenceCategories: requiredEvidence,
  });

  if (primary === "defamation-reputation") {
    return [
      element(
        "exact-words",
        "Exact words or statement",
        ["text-email-message", "screenshot", "social-media-post"],
        includesAny(text, ["said", "wrote", "message", "posted", "called me", "accused me", "screenshot"]),
        "Add the exact words used and preserve the screenshot/message/post if available."
      ),
      element(
        "publication",
        "Publication to someone other than the claimant",
        ["publication-recipient", "witness", "text-email-message", "social-media-post"],
        includesAny(text, ["told my", "sent to", "posted", "public", "third party", "brother", "sister", "employer", "client"]),
        "Identify who received, saw, heard, or was sent the statement."
      ),
      element(
        "falsity-context",
        "Why the statement is false or misleading",
        ["text-email-message", "witness", "court-document"],
        includesAny(text, ["false", "lied", "not true", "untrue", "proof it was false"]),
        "Explain clearly why the statement is false or misleading and what evidence supports that."
      ),
      element(
        "harm",
        "Resulting harm",
        ["witness", "employment-income", "settlement-communication"],
        includesAny(text, ["reputation", "lost work", "lost client", "business", "humiliated", "distress", "credibility"]),
        "Describe the practical harm: reputation, business, work, relationships, distress, or credibility impact."
      ),
      element(
        "damages",
        "Amount or damages explanation",
        ["receipt-expense", "employment-income", "witness"],
        normalized.hasAmount || normalized.hasDamagesBreakdown,
        "Connect the amount claimed to reputational, emotional, business, or financial harm."
      ),
    ];
  }

  if (primary === "debt-unpaid-money" || primary === "loan-repayment") {
    return [
      element("amount", "Amount owing", ["invoice-payment", "bank-transfer"], normalized.hasAmount, "Add the exact amount claimed or disputed."),
      element("basis", "Why the money is owed", ["contract-agreement", "invoice-payment"], includesAny(text, ["owed", "loan", "invoice", "agreed", "balance"]), "Explain why the other party legally owes the money."),
      element("payment-history", "Payment history", ["bank-transfer", "invoice-payment"], hasEvidence(["bank-transfer", "invoice-payment"]) || includesAny(text, ["paid", "partial", "balance", "etransfer"]), "Add payment records, partial payments, invoices, or account statements."),
      element("demand", "Demand or request for payment", ["text-email-message", "settlement-communication"], includesAny(text, ["asked", "demand", "requested", "followed up"]), "Add messages or letters asking for payment."),
    ];
  }

  if (primary === "contract-breach" || primary === "services-work-dispute") {
    return [
      element("terms", "Agreement terms", ["contract-agreement", "text-email-message"], includesAny(text, ["contract", "agreement", "quote", "terms", "agreed"]), "Add the contract, quote, messages, or details of the agreement."),
      element("performance", "What each side did", ["text-email-message", "photo-video", "invoice-payment"], includesAny(text, ["performed", "completed", "worked", "paid", "delivered"]), "Explain what work/payment/performance happened."),
      element("breach", "What was not done or done wrong", ["photo-video", "text-email-message", "expert-inspection"], includesAny(text, ["breach", "failed", "unfinished", "poor work", "not completed"]), "Explain exactly what obligation was breached."),
      element("loss", "Loss caused by breach", ["receipt-expense", "repair-estimate", "invoice-payment"], normalized.hasAmount || normalized.hasDamagesBreakdown, "Show how the breach caused the amount claimed."),
    ];
  }

  if (primary === "property-damage" || primary === "vehicle-dispute") {
    return [
      element("ownership", "Ownership or responsibility for property", ["ownership-property", "receipt-expense"], includesAny(text, ["my property", "my car", "owned", "belong"]), "Show the property belongs to the claimant or the claimant had legal responsibility for it."),
      element("damage", "Damage occurred", ["photo-video", "expert-inspection"], hasEvidence(["photo-video"]) || includesAny(text, ["damaged", "broken", "destroyed"]), "Add photos/videos/inspection notes showing the damage."),
      element("causation", "Who caused the damage", ["witness", "text-email-message", "expert-inspection"], includesAny(text, ["caused", "because", "admitted", "responsible"]), "Explain how the other party caused the damage."),
      element("repair-cost", "Repair/replacement cost", ["repair-estimate", "receipt-expense"], normalized.hasAmount || hasEvidence(["repair-estimate"]), "Add repair estimates, receipts, replacement costs, or inspection notes."),
    ];
  }

  if (primary === "enforcement-after-judgment") {
    return [
      element("judgment", "Judgment/order exists", ["court-document", "judgment-enforcement"], includesAny(text, ["judgment", "order"]), "Add the judgment or order being enforced."),
      element("amount-unpaid", "Amount still unpaid", ["invoice-payment", "judgment-enforcement"], normalized.hasAmount || includesAny(text, ["unpaid", "balance"]), "Show the remaining unpaid balance."),
      element("debtor-info", "Debtor information", ["judgment-enforcement"], includesAny(text, ["employer", "bank", "assets", "income", "debtor"]), "Add information about debtor income, bank, employer, assets, or location."),
    ];
  }

  return [
    element("facts", "Clear facts", ["text-email-message", "court-document"], clean(normalized.buckets.facts).length > 25, "Add a clear factual story."),
    element("timeline", "Timeline", ["court-document", "text-email-message"], normalized.hasTimeline, "Add key dates in order."),
    element("evidence", "Evidence", evidence, evidence.length > 0, "Add evidence connected to the issue."),
    element("goal", "Requested result", [], normalized.hasGoal, "Explain what result is requested."),
  ];
}

function buildTimelineEvents(rawTimeline: string, evidenceItems: NormalizedEvidenceItem[]): NormalizedTimelineEvent[] {
  const events: NormalizedTimelineEvent[] = [];

  const lines = clean(rawTimeline)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const dateMatch = line.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}/i);

    events.push({
      id: nowId("timeline"),
      date: dateMatch?.[0],
      title: dateMatch ? line.replace(dateMatch[0], "").trim() || line : line.slice(0, 80),
      description: line,
      linkedEvidenceIds: evidenceItems
        .filter((item) => item.date && line.includes(item.date))
        .map((item) => item.id),
      confidence: dateMatch ? 75 : 40,
    });
  }

  return events;
}

function buildQualityIssues(params: {
  input: AiIntakeNormalizerInput;
  primary: ClaimFamily | undefined;
  elements: NormalizedLegalElement[];
  hasAmount: boolean;
  hasGoal: boolean;
  hasTimeline: boolean;
  hasEvidence: boolean;
  stage: IntakeStage;
}): IntakeQualityIssue[] {
  const issues: IntakeQualityIssue[] = [];

  if (!clean(params.input.facts)) {
    issues.push({
      id: nowId("quality"),
      field: "facts",
      severity: "high",
      message: "The story facts are missing.",
    });
  }

  if (!params.hasTimeline) {
    issues.push({
      id: nowId("quality"),
      field: "timeline",
      severity: "moderate",
      message: "A timeline with key dates is needed.",
    });
  }

  if (!params.hasEvidence) {
    issues.push({
      id: nowId("quality"),
      field: "evidence",
      severity: "high",
      message: "Evidence has not been listed or uploaded yet.",
    });
  }

  if (!params.hasAmount && params.stage !== "responding") {
    issues.push({
      id: nowId("quality"),
      field: "damages",
      severity: "moderate",
      message: "The amount claimed or disputed should be added.",
    });
  }

  if (!params.hasGoal) {
    issues.push({
      id: nowId("quality"),
      field: "goal",
      severity: "moderate",
      message: "The requested court result should be stated.",
    });
  }

  for (const element of params.elements) {
    if (element.status === "missing" && element.userFacingNeed) {
      issues.push({
        id: nowId("quality"),
        field: "evidence",
        severity: "moderate",
        message: element.userFacingNeed,
      });
    }
  }

  return issues;
}

export function normalizeAiIntake(input: AiIntakeNormalizerInput): NormalizedCaseData {
  const userData = input.userData || {};

  const amountClaimed = pickString(
    input.userData?.amountClaimed,
    getUserDataString(userData, ["amountClaimed", "claimAmount", "amount", "amountDisputed"])
  );

  const damagesBreakdown = pickString(
    input.userData?.damagesBreakdown,
    getUserDataString(userData, ["damagesBreakdown", "damages", "lossBreakdown"])
  );

  const goal = pickString(
    input.goal,
    input.userData?.goal,
    getUserDataString(userData, ["goal", "desiredOutcome", "remedyRequested", "reliefRequested", "whatYouWant"])
  );

  const evidenceText = cleanList([
    input.evidence || "",
    input.missingEvidence || "",
    ...(input.availableEvidence || []),
    ...((input.uploadedEvidenceFiles || []).map((file) =>
      [
        file.name,
        file.title,
        file.description,
        file.category,
        file.evidenceDate,
        file.source,
        file.relevance,
      ].join(" ")
    )),
  ]);

  const buckets: Record<string, string> = {
    casePath: normalize(input.casePath),
    stage: normalize(input.stage),
    role: normalize(input.role || input.userData?.yourRole),
    issues: normalize((input.issues || []).join(" ")),
    facts: normalize(input.facts),
    timeline: normalize(input.timeline),
    evidence: normalize(evidenceText.join(" ")),
    missingEvidence: normalize(input.missingEvidence),
    goal: normalize(goal),
    urgent: normalize(input.urgent),
    documents: normalize([
      ...(input.filedDocuments || []),
      ...(input.completedForms || []),
      ...(input.receivedForms || []),
    ].join(" ")),
    conversation: normalize(input.conversationText),
    all: "",
  };

  buckets.all = normalize(Object.values(buckets).join(" "));

  const casePath = normalizeCasePath(input.casePath);
  const stage = normalizeStage(input.stage, buckets.all);
  const scores = detectClaimFamilies(input, buckets);
  const suppressedResult = applySuppression(scores);
  const primary = suppressedResult.primary || scores[0];

  const parsedAmounts = extractDollarAmounts(`${amountClaimed} ${damagesBreakdown}`);
  const hasAmount = clean(amountClaimed).length > 0 || parsedAmounts.length > 0;
  const hasDamagesBreakdown = clean(damagesBreakdown).length > 0;
  const evidenceItems = normalizeEvidenceItems(input, buckets);
  const evidenceCategories = cleanList([
    ...classifyEvidenceCategories(buckets.evidence),
    ...evidenceItems.map((item) => item.category),
  ]);

  const hasEvidence = evidenceItems.length > 0 || clean(input.evidence).length > 0;
  const hasTimeline = clean(input.timeline).length > 0;
  const hasGoal = clean(goal).length > 0;

  const damages = classifyDamageCategories(buckets, primary?.family);

  const legalElements = buildLegalElements(primary?.family, {
    evidenceCategories,
    hasAmount,
    hasDamagesBreakdown,
    hasTimeline,
    hasGoal,
    buckets,
  });

  const timelineEvents = buildTimelineEvents(input.timeline || "", evidenceItems);

  const qualityIssues = buildQualityIssues({
    input,
    primary: primary?.family,
    elements: legalElements,
    hasAmount,
    hasGoal,
    hasTimeline,
    hasEvidence,
    stage,
  });

  const goalText = normalize(goal);

  return {
    id: nowId("normalized_case"),
    casePath,
    stage,
    role: pickString(input.role, input.userData?.yourRole, "not-sure"),

    primaryClaimFamily: primary?.family || "unknown",
    primaryClaimLabel: primary?.label || "Unknown claim family",
    primaryConfidence: primary?.confidence || 0,

    secondaryClaimFamilies: suppressedResult.secondary || [],
    possibleUnconfirmedFamilies: suppressedResult.possible || [],
    suppressedFamilies: suppressedResult.suppressed || [],

    parties: {
      userName: pickString(input.userData?.yourName),
      otherParty: pickString(input.userData?.otherParty),
      userAddress: pickString(input.userData?.yourAddress),
      otherPartyAddress: pickString(input.userData?.defendantAddress),
      courtLocation: pickString(input.userData?.courtLocation),
      claimNumber: pickString(input.userData?.claimNumber),
    },

    money: {
      amountClaimed,
      damagesBreakdown,
      hasAmount,
      hasDamagesBreakdown,
      parsedAmounts,
      withinOntarioSmallClaimsLimit:
        parsedAmounts.length > 0
          ? Math.max(...parsedAmounts) <= ONTARIO_SMALL_CLAIMS_LIMIT
          : undefined,
    },

    userGoal: {
      rawGoal: goal,
      wantsMoney: includesAny(goalText, ["money", "$", "damages", "pay", "payment"]),
      wantsDismissal: includesAny(goalText, ["dismiss", "dismissal"]),
      wantsReturnOfProperty: includesAny(goalText, ["return property", "return my property", "give back"]),
      wantsApologyRetraction: includesAny(goalText, ["apology", "retraction", "take down", "remove"]),
      wantsPaymentPlan: includesAny(goalText, ["payment plan", "installments", "instalments"]),
      wantsEnforcement: includesAny(goalText, ["enforce", "collect", "garnish"]),
      hasGoal,
    },

    damages: {
      categories: damages,
      notes: damages.map((category) => `Detected damages category: ${category}.`),
    },

    evidence: {
      items: evidenceItems,
      categories: evidenceCategories,
      hasEvidence,
      evidenceReadiness:
        evidenceItems.length >= 5
          ? "strong"
          : evidenceItems.length >= 2 || evidenceCategories.length >= 2
            ? "partial"
            : hasEvidence
              ? "weak"
              : "unknown",
    },

    timeline: {
      rawTimeline: input.timeline,
      events: timelineEvents,
      hasTimeline,
    },

    legalElements,

    procedural: {
      filedDocuments: cleanList(input.filedDocuments || []),
      completedForms: cleanList(input.completedForms || []),
      receivedForms: cleanList(input.receivedForms || []),
      isStarting: stage === "starting-case",
      isResponding: stage === "responding",
      isConference: stage === "conference",
      isTrial: stage === "trial",
      isEnforcement: stage === "enforcement",
      isUrgent: stage === "urgent",
    },

    intakeQuality: qualityIssues,

    internal: {
      allScores: scores,
      normalizedTextBuckets: buckets,
      suppressionApplied: (suppressedResult.suppressed || []).length > 0,
    },
  };
}