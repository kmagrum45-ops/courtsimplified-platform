export type AuthorityInvestigatorVersion = "2.0.0";

export type AuthoritySeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type AuthorityConfidence =
  | "very-low"
  | "low"
  | "medium"
  | "high"
  | "very-high";

export type AuthorityRiskLevel =
  | "minimal"
  | "manageable"
  | "elevated"
  | "serious"
  | "critical";

export type AuthorityFindingCategory =
  | "missing-authority"
  | "unverified-authority"
  | "wrong-jurisdiction"
  | "outdated-authority"
  | "unsafe-authority"
  | "weak-authority-fit"
  | "directly-applicable-authority"
  | "procedural-rule"
  | "form-rule"
  | "statutory-test"
  | "case-law-principle"
  | "burden-authority"
  | "evidence-authority"
  | "remedy-authority"
  | "court-discretion"
  | "authority-registry-gap"
  | "unknown";

export type AuthorityType =
  | "rule"
  | "statute"
  | "regulation"
  | "case-law"
  | "form"
  | "practice-direction"
  | "annual-practice"
  | "court-policy"
  | "unknown";

export type AuthoritySignal = {
  id?: string;
  authorityRegistryId?: string;
  title?: string;
  citation?: string;
  authorityType?: AuthorityType;
  jurisdiction?: string;
  courtPath?: string;
  ruleCode?: string;
  summary?: string;
  issueTags?: string[];
  appliesToStages?: string[];
  directlyApplicable?: boolean;
  verified?: boolean;
  unsafe?: boolean;
  outdated?: boolean;
  wrongJurisdiction?: boolean;
  warnings?: string[];
  linkedClaimIds?: string[];
  linkedEvidenceIds?: string[];
};

export type AuthorityInvestigationInput = {
  caseId?: string;
  courtPath?: string;
  province?: string;
  stage?: string;
  legalDomains?: string[];

  authorities?: AuthoritySignal[];

  authorityAnalysis?: {
    verifiedAuthorityIds?: string[];
    strongestAuthorityIds?: string[];
    unsafeAuthorityIds?: string[];
    directlyApplicableAuthorityIds?: string[];
    wrongJurisdictionAuthorityIds?: string[];
    warnings?: string[];
    summary?: string;
  };

  proceduralFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    applicableRuleCodes?: string[];
    authorityRegistryIds?: string[];
  }>;

  burdenFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    linkedClaimIds?: string[];
  }>;

  evidenceFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
    linkedEvidenceIds?: string[];
  }>;

  credibilityFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
  }>;

  contradictionFindings?: Array<{
    title?: string;
    category?: string;
    severity?: string;
    explanation?: string;
  }>;

  litigationReasoning?: {
    weakestCasePoints?: string[];
    strongestCasePoints?: string[];
    judicialConcerns?: string[];
    opposingArguments?: string[];
    missingWork?: string[];
    warnings?: string[];
  };

  proceduralWarnings?: string[];
  evidenceWarnings?: string[];
  burdenWarnings?: string[];
  credibilityWarnings?: string[];
  contradictionWarnings?: string[];
};

export type AuthorityInvestigationFinding = {
  id: string;
  category: AuthorityFindingCategory;
  severity: AuthoritySeverity;
  confidence: AuthorityConfidence;
  title: string;
  explanation: string;
  whyItMatters: string;
  litigationImpact: string;
  recommendedQuestion: string;
  recommendedAction: string;
  authorityType: AuthorityType;
  citationSignals: string[];
  applicableRuleCodes: string[];
  authorityRegistryIds: string[];
  linkedClaimIds: string[];
  linkedEvidenceIds: string[];
  missingAuthorityNeeded: string[];
  validationSteps: string[];
  risksIfIgnored: string[];
  source: string;
};

export type AuthorityInvestigatorIntelligence = {
  authorityReadinessScore: number;
  verificationScore: number;
  jurisdictionFitScore: number;
  authorityFitScore: number;
  unsafeAuthorityRiskScore: number;
  registryCoverageScore: number;
  overallRiskLevel: AuthorityRiskLevel;
  confidence: AuthorityConfidence;
};

export type AuthorityInvestigationResult = {
  version: AuthorityInvestigatorVersion;
  generatedAt: string;
  caseId?: string;

  intelligence: AuthorityInvestigatorIntelligence;
  findings: AuthorityInvestigationFinding[];

  verifiedAuthorities: string[];
  strongestAuthorities: string[];
  missingAuthorityRequests: string[];
  unsafeAuthorityWarnings: string[];
  wrongJurisdictionWarnings: string[];
  ruleReferenceRequests: string[];
  statutoryTestRequests: string[];
  caseLawRequests: string[];
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

function includesAny(value: unknown, terms: string[]): boolean {
  const text = normalize(value);
  return terms.some((term) => text.includes(normalize(term)));
}

function severityRank(value: AuthoritySeverity): number {
  if (value === "critical") return 5;
  if (value === "high") return 4;
  if (value === "medium") return 3;
  if (value === "low") return 2;
  return 1;
}

function confidenceFromScore(score: number): AuthorityConfidence {
  if (score >= 85) return "very-high";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  if (score >= 25) return "low";
  return "very-low";
}

function riskLevelFromReadiness(score: number): AuthorityRiskLevel {
  if (score >= 85) return "minimal";
  if (score >= 70) return "manageable";
  if (score >= 45) return "elevated";
  if (score >= 25) return "serious";
  return "critical";
}

function severityFromText(value: unknown): AuthoritySeverity {
  const text = normalize(value);

  if (includesAny(text, ["critical", "unsafe", "wrong jurisdiction", "outdated"])) {
    return "critical";
  }

  if (includesAny(text, ["missing", "unverified", "no authority", "high"])) {
    return "high";
  }

  if (includesAny(text, ["warning", "weak", "unclear", "review", "gap"])) {
    return "medium";
  }

  if (includesAny(text, ["minor", "low"])) return "low";

  return "medium";
}

function categoryFromText(value: unknown): AuthorityFindingCategory {
  const text = normalize(value);

  if (includesAny(text, ["wrong jurisdiction", "not ontario", "different province"])) {
    return "wrong-jurisdiction";
  }

  if (includesAny(text, ["outdated", "overruled", "no longer good law"])) {
    return "outdated-authority";
  }

  if (includesAny(text, ["unsafe", "unverified", "hallucinated"])) {
    return "unsafe-authority";
  }

  if (includesAny(text, ["rule", "service", "filing", "deadline", "procedure"])) {
    return "procedural-rule";
  }

  if (includesAny(text, ["form"])) return "form-rule";

  if (includesAny(text, ["statute", "section", "test"])) {
    return "statutory-test";
  }

  if (includesAny(text, ["case law", "authority", "principle"])) {
    return "case-law-principle";
  }

  if (includesAny(text, ["burden", "onus", "prove"])) {
    return "burden-authority";
  }

  if (includesAny(text, ["evidence", "admissible", "hearsay", "authenticity"])) {
    return "evidence-authority";
  }

  if (includesAny(text, ["remedy", "damages", "injunction", "order"])) {
    return "remedy-authority";
  }

  if (includesAny(text, ["discretion", "may order", "court power"])) {
    return "court-discretion";
  }

  if (includesAny(text, ["missing", "no authority", "authority needed"])) {
    return "missing-authority";
  }

  return "unknown";
}

function authorityTypeFromText(value: unknown): AuthorityType {
  const text = normalize(value);

  if (includesAny(text, ["rule"])) return "rule";
  if (includesAny(text, ["statute", "section", "act"])) return "statute";
  if (includesAny(text, ["regulation"])) return "regulation";
  if (includesAny(text, ["case", "v.", "v "])) return "case-law";
  if (includesAny(text, ["form"])) return "form";
  if (includesAny(text, ["practice direction"])) return "practice-direction";
  if (includesAny(text, ["annual practice"])) return "annual-practice";
  if (includesAny(text, ["policy"])) return "court-policy";

  return "unknown";
}

function createFinding(args: {
  category: AuthorityFindingCategory;
  severity: AuthoritySeverity;
  confidence: AuthorityConfidence;
  title: string;
  explanation: string;
  whyItMatters: string;
  litigationImpact: string;
  recommendedQuestion: string;
  recommendedAction: string;
  authorityType: AuthorityType;
  citationSignals?: string[];
  applicableRuleCodes?: string[];
  authorityRegistryIds?: string[];
  linkedClaimIds?: string[];
  linkedEvidenceIds?: string[];
  missingAuthorityNeeded?: string[];
  validationSteps?: string[];
  risksIfIgnored?: string[];
  source: string;
}): AuthorityInvestigationFinding {
  return {
    id: createId("authority_investigation"),
    category: args.category,
    severity: args.severity,
    confidence: args.confidence,
    title: args.title,
    explanation: args.explanation,
    whyItMatters: args.whyItMatters,
    litigationImpact: args.litigationImpact,
    recommendedQuestion: args.recommendedQuestion,
    recommendedAction: args.recommendedAction,
    authorityType: args.authorityType,
    citationSignals: uniqueStrings(args.citationSignals || []),
    applicableRuleCodes: uniqueStrings(args.applicableRuleCodes || []),
    authorityRegistryIds: uniqueStrings(args.authorityRegistryIds || []),
    linkedClaimIds: uniqueStrings(args.linkedClaimIds || []),
    linkedEvidenceIds: uniqueStrings(args.linkedEvidenceIds || []),
    missingAuthorityNeeded: uniqueStrings(args.missingAuthorityNeeded || []),
    validationSteps: uniqueStrings(args.validationSteps || []),
    risksIfIgnored: uniqueStrings(args.risksIfIgnored || []),
    source: args.source,
  };
}

function buildAuthoritySignalFindings(
  input: AuthorityInvestigationInput,
): AuthorityInvestigationFinding[] {
  const findings: AuthorityInvestigationFinding[] = [];

  for (const authority of input.authorities || []) {
    const title = clean(authority.title) || clean(authority.citation) || "Authority";
    const text = `${title} ${authority.summary || ""} ${authority.ruleCode || ""}`;

    if (
      authority.unsafe ||
      authority.outdated ||
      authority.wrongJurisdiction ||
      !authority.verified
    ) {
      findings.push(
        createFinding({
          category: authority.unsafe
            ? "unsafe-authority"
            : authority.outdated
              ? "outdated-authority"
              : authority.wrongJurisdiction
                ? "wrong-jurisdiction"
                : "unverified-authority",
          severity:
            authority.unsafe || authority.outdated || authority.wrongJurisdiction
              ? "critical"
              : "high",
          confidence: "high",
          title: `${title}: authority validation issue`,
          explanation:
            "This authority has a validation problem and should not be used as final legal support until reviewed.",
          whyItMatters:
            "Unsafe, outdated, unverified, or wrong-jurisdiction authority can damage trust and may mislead the user or court materials.",
          litigationImpact:
            "This authority should be isolated from final court materials until verified.",
          recommendedQuestion:
            "Is this authority verified, current, applicable in this jurisdiction, and directly connected to the issue?",
          recommendedAction:
            "Verify the authority source, jurisdiction, currency, and legal relevance before relying on it.",
          authorityType: authority.authorityType || authorityTypeFromText(text),
          citationSignals: [authority.citation || "", title],
          applicableRuleCodes: authority.ruleCode ? [authority.ruleCode] : [],
          authorityRegistryIds: authority.authorityRegistryId
            ? [authority.authorityRegistryId]
            : [],
          linkedClaimIds: authority.linkedClaimIds || [],
          linkedEvidenceIds: authority.linkedEvidenceIds || [],
          validationSteps: [
            "Confirm official source",
            "Confirm jurisdiction",
            "Confirm current law",
            "Confirm issue match",
            "Confirm citation format",
          ],
          risksIfIgnored: [
            "Wrong authority may be relied on",
            "Court materials may contain unsafe legal support",
            "User may be misled about legal strength",
          ],
          source: "authorities.validation",
        }),
      );
    }

    if (authority.directlyApplicable && authority.verified && !authority.unsafe) {
      findings.push(
        createFinding({
          category: "directly-applicable-authority",
          severity: "info",
          confidence: "high",
          title: `${title}: directly applicable authority`,
          explanation:
            authority.summary ||
            "This authority appears verified and directly applicable.",
          whyItMatters:
            "Directly applicable authority strengthens procedural guidance, legal reasoning, forms, and strategy.",
          litigationImpact:
            "This authority may support reasoning or court materials if properly cited and applied.",
          recommendedQuestion:
            "What exact issue does this authority support, and where should it appear in the case analysis?",
          recommendedAction:
            "Link this authority to the issue, claim element, procedure step, or court package section it supports.",
          authorityType: authority.authorityType || authorityTypeFromText(text),
          citationSignals: [authority.citation || "", title],
          applicableRuleCodes: authority.ruleCode ? [authority.ruleCode] : [],
          authorityRegistryIds: authority.authorityRegistryId
            ? [authority.authorityRegistryId]
            : [],
          linkedClaimIds: authority.linkedClaimIds || [],
          linkedEvidenceIds: authority.linkedEvidenceIds || [],
          validationSteps: [
            "Confirm issue match",
            "Confirm current law",
            "Confirm proper citation",
          ],
          source: "authorities.directFit",
        }),
      );
    }

    for (const warning of authority.warnings || []) {
      findings.push(
        createFinding({
          category: categoryFromText(warning),
          severity: severityFromText(warning),
          confidence: "medium",
          title: `${title}: authority warning`,
          explanation: warning,
          whyItMatters:
            "Authority warnings show where legal support may be incomplete, unsafe, or poorly matched.",
          litigationImpact:
            "This may affect whether the authority should support reasoning, forms, strategy, or court materials.",
          recommendedQuestion:
            "What must be checked before this authority is relied on?",
          recommendedAction:
            "Resolve the authority warning before using the authority in generated materials.",
          authorityType: authority.authorityType || authorityTypeFromText(text),
          citationSignals: [authority.citation || "", title],
          applicableRuleCodes: authority.ruleCode ? [authority.ruleCode] : [],
          authorityRegistryIds: authority.authorityRegistryId
            ? [authority.authorityRegistryId]
            : [],
          linkedClaimIds: authority.linkedClaimIds || [],
          linkedEvidenceIds: authority.linkedEvidenceIds || [],
          validationSteps: [
            "Verify source",
            "Verify jurisdiction",
            "Verify currency",
            "Verify legal relevance",
          ],
          source: "authorities.warnings",
        }),
      );
    }
  }

  return findings;
}

function buildAnalysisFindings(
  input: AuthorityInvestigationInput,
): AuthorityInvestigationFinding[] {
  const findings: AuthorityInvestigationFinding[] = [];
  const analysis = input.authorityAnalysis;

  if (!analysis) {
    findings.push(
      createFinding({
        category: "authority-registry-gap",
        severity: "high",
        confidence: "medium",
        title: "No authority analysis supplied",
        explanation:
          "The Authority Investigator did not receive a structured authority analysis object.",
        whyItMatters:
          "CourtSimplified should not treat legal conclusions as court-ready unless they are supported by verified authority.",
        litigationImpact:
          "Legal reasoning may remain generic until verified authority is connected.",
        recommendedQuestion:
          "What verified rule, statute, form requirement, case law, or registry entry supports this issue?",
        recommendedAction:
          "Connect the case issue to verified authority before finalizing legal reasoning or court materials.",
        authorityType: "unknown",
        missingAuthorityNeeded: [
          "Applicable rule",
          "Applicable statute",
          "Applicable form requirement",
          "Applicable case law if needed",
          "Authority registry entry",
        ],
        validationSteps: [
          "Identify legal issue",
          "Find applicable authority",
          "Verify jurisdiction",
          "Verify currency",
          "Link authority to issue",
        ],
        risksIfIgnored: [
          "Unsupported legal conclusion",
          "Weak court materials",
          "Unsafe legal guidance",
        ],
        source: "authorityAnalysis",
      }),
    );

    return findings;
  }

  for (const warning of analysis.warnings || []) {
    findings.push(
      createFinding({
        category: categoryFromText(warning),
        severity: severityFromText(warning),
        confidence: "medium",
        title: "Authority analysis warning",
        explanation: warning,
        whyItMatters:
          "Authority-analysis warnings show where legal support may be missing, unsafe, outdated, or poorly matched.",
        litigationImpact:
          "This warning should be resolved before relying on the legal conclusion.",
        recommendedQuestion:
          "What verified authority resolves this warning?",
        recommendedAction:
          "Verify and link the correct authority before generating final court materials.",
        authorityType: authorityTypeFromText(warning),
        missingAuthorityNeeded: [
          "Verified source",
          "Current rule or statute",
          "Current case authority if needed",
          "Official form or procedural source",
        ],
        validationSteps: [
          "Verify source",
          "Verify jurisdiction",
          "Verify currency",
          "Verify issue fit",
        ],
        risksIfIgnored: [
          "Unsupported legal position",
          "Wrong authority",
          "Weak or unsafe generated materials",
        ],
        source: "authorityAnalysis.warnings",
      }),
    );
  }

  for (const id of analysis.unsafeAuthorityIds || []) {
    findings.push(
      createFinding({
        category: "unsafe-authority",
        severity: "critical",
        confidence: "high",
        title: "Unsafe authority flagged",
        explanation:
          "An authority was flagged as unsafe and should not be relied on until reviewed.",
        whyItMatters:
          "Unsafe authority can corrupt legal reasoning and court-ready materials.",
        litigationImpact:
          "This authority should be removed from final outputs unless verified.",
        recommendedQuestion:
          "Why was this authority flagged as unsafe, and what verified authority should replace it?",
        recommendedAction:
          "Isolate, review, verify, replace, or remove the unsafe authority.",
        authorityType: "unknown",
        authorityRegistryIds: [id],
        validationSteps: [
          "Check source",
          "Check jurisdiction",
          "Check currency",
          "Check whether the authority exists",
          "Replace if unsafe",
        ],
        risksIfIgnored: [
          "Hallucinated or unsafe law may be used",
          "Court materials may become unreliable",
        ],
        source: "authorityAnalysis.unsafeAuthorityIds",
      }),
    );
  }

  for (const id of analysis.wrongJurisdictionAuthorityIds || []) {
    findings.push(
      createFinding({
        category: "wrong-jurisdiction",
        severity: "critical",
        confidence: "high",
        title: "Wrong-jurisdiction authority flagged",
        explanation:
          "An authority appears to come from the wrong jurisdiction or procedural system.",
        whyItMatters:
          "Wrong-jurisdiction authority may not apply and can mislead the user.",
        litigationImpact:
          "This authority should not support the final case theory unless its relevance is clearly explained.",
        recommendedQuestion:
          "What Ontario or applicable-jurisdiction authority should be used instead?",
        recommendedAction:
          "Replace or qualify the authority with a correct jurisdictional source.",
        authorityType: "unknown",
        authorityRegistryIds: [id],
        validationSteps: [
          "Confirm jurisdiction",
          "Confirm court path",
          "Find local equivalent authority",
          "Explain relevance if still used",
        ],
        risksIfIgnored: [
          "Wrong legal framework",
          "Unsafe court materials",
          "Incorrect procedural advice",
        ],
        source: "authorityAnalysis.wrongJurisdictionAuthorityIds",
      }),
    );
  }

  return findings;
}

function buildImportedFindingSignals(
  input: AuthorityInvestigationInput,
): AuthorityInvestigationFinding[] {
  const findings: AuthorityInvestigationFinding[] = [];

  for (const finding of input.proceduralFindings || []) {
    const text = `${finding.title || ""} ${finding.category || ""} ${
      finding.explanation || ""
    }`;

    findings.push(
      createFinding({
        category: categoryFromText(text),
        severity: severityFromText(finding.severity || text),
        confidence: "medium",
        title: finding.title || "Procedural authority signal",
        explanation:
          finding.explanation ||
          "A procedural finding may require rule or authority support.",
        whyItMatters:
          "Procedural recommendations should be grounded in the correct rule, deadline, form, or court power.",
        litigationImpact:
          "Unsupported procedural guidance can lead to wrong steps, missed deadlines, or rejected materials.",
        recommendedQuestion:
          "Which rule, form, deadline, or registry entry supports this procedural step?",
        recommendedAction:
          "Link this procedural finding to verified procedural authority.",
        authorityType: "rule",
        applicableRuleCodes: finding.applicableRuleCodes || [],
        authorityRegistryIds: finding.authorityRegistryIds || [],
        missingAuthorityNeeded: [
          "Procedural rule",
          "Form rule",
          "Deadline rule",
          "Service rule",
          "Court power",
        ],
        validationSteps: [
          "Verify rule code",
          "Verify stage",
          "Verify court path",
          "Verify deadline if any",
        ],
        risksIfIgnored: [
          "Unsupported procedural recommendation",
          "Wrong next step",
        ],
        source: "proceduralFindings",
      }),
    );
  }

  const genericSignals = [
    ...(input.burdenFindings || []).map((item) => ({
      source: "burdenFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedClaimIds: item.linkedClaimIds || [],
      linkedEvidenceIds: [] as string[],
    })),
    ...(input.evidenceFindings || []).map((item) => ({
      source: "evidenceFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedClaimIds: [] as string[],
      linkedEvidenceIds: item.linkedEvidenceIds || [],
    })),
    ...(input.credibilityFindings || []).map((item) => ({
      source: "credibilityFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedClaimIds: [] as string[],
      linkedEvidenceIds: [] as string[],
    })),
    ...(input.contradictionFindings || []).map((item) => ({
      source: "contradictionFindings",
      title: item.title,
      category: item.category,
      severity: item.severity,
      explanation: item.explanation,
      linkedClaimIds: [] as string[],
      linkedEvidenceIds: [] as string[],
    })),
  ];

  for (const signal of genericSignals) {
    const text = `${signal.title || ""} ${signal.category || ""} ${
      signal.explanation || ""
    }`;

    if (
      !includesAny(text, [
        "authority",
        "rule",
        "statute",
        "case law",
        "onus",
        "burden",
        "evidence",
        "procedure",
        "remedy",
        "court",
      ])
    ) {
      continue;
    }

    findings.push(
      createFinding({
        category: categoryFromText(text),
        severity: severityFromText(signal.severity || text),
        confidence: "medium",
        title: signal.title || "Authority support needed",
        explanation:
          signal.explanation ||
          "This imported finding may need verified authority support.",
        whyItMatters:
          "Specialist investigator findings should be connected to authority before they drive final legal outputs.",
        litigationImpact:
          "If no authority supports this point, the final reasoning may be weaker or unsafe.",
        recommendedQuestion:
          "What verified authority supports this imported finding?",
        recommendedAction:
          "Find and attach the correct authority or mark this point as non-authority-based factual reasoning.",
        authorityType: authorityTypeFromText(text),
        linkedClaimIds: signal.linkedClaimIds,
        linkedEvidenceIds: signal.linkedEvidenceIds,
        missingAuthorityNeeded: [
          "Verified authority",
          "Issue match",
          "Jurisdiction match",
          "Currency check",
        ],
        validationSteps: [
          "Identify exact issue",
          "Find authority",
          "Verify authority",
          "Link authority to issue",
        ],
        risksIfIgnored: [
          "Unsupported legal reasoning",
          "Weak court materials",
        ],
        source: signal.source,
      }),
    );
  }

  return findings;
}

function buildWarningFindings(
  input: AuthorityInvestigationInput,
): AuthorityInvestigationFinding[] {
  const warnings = [
    ...(input.proceduralWarnings || []),
    ...(input.evidenceWarnings || []),
    ...(input.burdenWarnings || []),
    ...(input.credibilityWarnings || []),
    ...(input.contradictionWarnings || []),
    ...(input.litigationReasoning?.warnings || []),
    ...(input.litigationReasoning?.missingWork || []),
    ...(input.litigationReasoning?.judicialConcerns || []),
    ...(input.litigationReasoning?.opposingArguments || []),
  ];

  return warnings.map((warning) =>
    createFinding({
      category: categoryFromText(warning),
      severity: severityFromText(warning),
      confidence: "medium",
      title: "Authority-related warning",
      explanation: warning,
      whyItMatters:
        "This warning may require legal authority, procedural authority, or verification before the system can safely rely on it.",
      litigationImpact:
        "If unresolved, the warning may weaken final reasoning, forms, strategy, or court materials.",
      recommendedQuestion:
        "What verified authority, rule, statute, case law, or registry entry addresses this warning?",
      recommendedAction:
        "Verify and attach authority or mark this as a factual/non-authority warning.",
      authorityType: authorityTypeFromText(warning),
      missingAuthorityNeeded: [
        "Rule",
        "Statute",
        "Case law",
        "Form rule",
        "Practice direction",
        "Authority registry entry",
      ],
      validationSteps: [
        "Identify issue",
        "Find authority",
        "Verify jurisdiction",
        "Verify currency",
        "Confirm fit",
      ],
      risksIfIgnored: [
        "Unsupported conclusion",
        "Unsafe legal output",
        "Weak court materials",
      ],
      source: "crossSystemWarnings",
    }),
  );
}

function calculateIntelligence(
  findings: AuthorityInvestigationFinding[],
  input: AuthorityInvestigationInput,
): AuthorityInvestigatorIntelligence {
  let authorityReadinessScore = 80;
  let verificationScore = 70;
  let jurisdictionFitScore = 75;
  let authorityFitScore = 70;
  let unsafeAuthorityRiskScore = 0;
  let registryCoverageScore = 40;

  const authorities = input.authorities || [];

  if (authorities.length === 0) {
    authorityReadinessScore -= 25;
    verificationScore -= 20;
    authorityFitScore -= 20;
    registryCoverageScore -= 20;
  }

  for (const authority of authorities) {
    if (authority.verified) verificationScore += 5;
    else verificationScore -= 8;

    if (authority.authorityRegistryId) registryCoverageScore += 8;
    else registryCoverageScore -= 4;

    if (authority.directlyApplicable) authorityFitScore += 7;
    if (authority.wrongJurisdiction) jurisdictionFitScore -= 20;
    if (authority.unsafe || authority.outdated) unsafeAuthorityRiskScore += 20;
  }

  for (const finding of findings) {
    if (finding.severity === "critical") {
      authorityReadinessScore -= 16;
      verificationScore -= 10;
      unsafeAuthorityRiskScore += 16;
    } else if (finding.severity === "high") {
      authorityReadinessScore -= 10;
      verificationScore -= 6;
      unsafeAuthorityRiskScore += 8;
    } else if (finding.severity === "medium") {
      authorityReadinessScore -= 5;
      unsafeAuthorityRiskScore += 3;
    }

    if (finding.category === "directly-applicable-authority") {
      authorityReadinessScore += 8;
      verificationScore += 8;
      authorityFitScore += 8;
    }

    if (finding.category === "wrong-jurisdiction") {
      jurisdictionFitScore -= 15;
    }

    if (finding.authorityRegistryIds.length > 0) {
      registryCoverageScore += 4;
    }
  }

  authorityReadinessScore = Math.max(
    0,
    Math.min(100, Math.round(authorityReadinessScore)),
  );

  return {
    authorityReadinessScore,
    verificationScore: Math.max(0, Math.min(100, Math.round(verificationScore))),
    jurisdictionFitScore: Math.max(
      0,
      Math.min(100, Math.round(jurisdictionFitScore)),
    ),
    authorityFitScore: Math.max(0, Math.min(100, Math.round(authorityFitScore))),
    unsafeAuthorityRiskScore: Math.max(
      0,
      Math.min(100, Math.round(unsafeAuthorityRiskScore)),
    ),
    registryCoverageScore: Math.max(
      0,
      Math.min(100, Math.round(registryCoverageScore)),
    ),
    overallRiskLevel: riskLevelFromReadiness(authorityReadinessScore),
    confidence: confidenceFromScore(authorityReadinessScore),
  };
}

function findingsByCategory(
  findings: AuthorityInvestigationFinding[],
  category: AuthorityFindingCategory,
): AuthorityInvestigationFinding[] {
  return findings.filter((finding) => finding.category === category);
}

function questionsFromFindings(
  findings: AuthorityInvestigationFinding[],
): string[] {
  return uniqueStrings(
    findings
      .slice()
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((finding) => finding.recommendedQuestion),
  );
}

function actionsFromFindings(
  findings: AuthorityInvestigationFinding[],
): string[] {
  return uniqueStrings(
    findings
      .slice()
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((finding) => finding.recommendedAction),
  );
}

function collectionFromFindings(
  findings: AuthorityInvestigationFinding[],
  selector: (finding: AuthorityInvestigationFinding) => string[],
): string[] {
  return uniqueStrings(findings.flatMap(selector));
}

export function buildAuthorityInvestigation(
  input: AuthorityInvestigationInput,
): AuthorityInvestigationResult {
  const findings = [
    ...buildAuthoritySignalFindings(input),
    ...buildAnalysisFindings(input),
    ...buildImportedFindingSignals(input),
    ...buildWarningFindings(input),
  ].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const intelligence = calculateIntelligence(findings, input);
  const topQuestions = questionsFromFindings(findings).slice(0, 14);

  const verifiedAuthorities = uniqueStrings([
    ...(input.authorityAnalysis?.verifiedAuthorityIds || []),
    ...(input.authorities || [])
      .filter((authority) => authority.verified)
      .map(
        (authority) =>
          authority.authorityRegistryId ||
          authority.citation ||
          authority.title ||
          "",
      ),
  ]);

  const strongestAuthorities = uniqueStrings([
    ...(input.authorityAnalysis?.strongestAuthorityIds || []),
    ...(input.authorities || [])
      .filter((authority) => authority.directlyApplicable && authority.verified)
      .map(
        (authority) =>
          authority.authorityRegistryId ||
          authority.citation ||
          authority.title ||
          "",
      ),
  ]);

  const warnings = uniqueStrings([
    ...(input.authorityAnalysis?.warnings || []),
    ...findings
      .filter((finding) => severityRank(finding.severity) >= 4)
      .map((finding) => finding.title),
  ]);

  return {
    version: "2.0.0",
    generatedAt: nowIso(),
    caseId: input.caseId,

    intelligence,
    findings,

    verifiedAuthorities,
    strongestAuthorities,
    missingAuthorityRequests: collectionFromFindings(
      findings,
      (finding) => finding.missingAuthorityNeeded,
    ),
    unsafeAuthorityWarnings: findingsByCategory(findings, "unsafe-authority").map(
      (finding) => finding.explanation,
    ),
    wrongJurisdictionWarnings: findingsByCategory(
      findings,
      "wrong-jurisdiction",
    ).map((finding) => finding.explanation),
    ruleReferenceRequests: questionsFromFindings(
      findings.filter((finding) =>
        ["procedural-rule", "form-rule"].includes(finding.category),
      ),
    ),
    statutoryTestRequests: questionsFromFindings(
      findingsByCategory(findings, "statutory-test"),
    ),
    caseLawRequests: questionsFromFindings(
      findingsByCategory(findings, "case-law-principle"),
    ),
    authorityRegistryRequests: collectionFromFindings(
      findings,
      (finding) => finding.authorityRegistryIds,
    ),

    topQuestions,
    nextActions: uniqueStrings([
      ...actionsFromFindings(findings).slice(0, 12),
      "Do not use unverified, unsafe, outdated, or wrong-jurisdiction authority in final court materials.",
      "Connect every legal conclusion to a verified authority source or mark it as factual reasoning only.",
      "Prefer authority registry entries as the source of truth for procedural rules, deadlines, forms, and court powers.",
    ]).slice(0, 18),

    warnings,

    summary:
      findings.length > 0
        ? `Authority Investigator assessed authority readiness as ${intelligence.confidence} (${intelligence.authorityReadinessScore}/100) and found ${findings.length} authority issue(s), support point(s), or warning(s).`
        : `Authority Investigator assessed authority readiness as ${intelligence.confidence} (${intelligence.authorityReadinessScore}/100) and found no major authority issues.`,
  };
}