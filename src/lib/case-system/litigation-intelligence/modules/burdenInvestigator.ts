export type BurdenInvestigatorVersion = "1.0.0";

export type BurdenInvestigationSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export type BurdenInvestigationCategory =
  | "missing-burden"
  | "user-burden"
  | "opposing-party-burden"
  | "shared-burden"
  | "missing-element-proof"
  | "weak-element-proof"
  | "contradicted-element-proof"
  | "standard-of-proof"
  | "burden-shift"
  | "judge-concern"
  | "unknown";

export type BurdenInvestigationFinding = {
  id: string;
  category: BurdenInvestigationCategory;
  severity: BurdenInvestigationSeverity;
  title: string;
  explanation: string;
  whyItMatters: string;
  recommendedQuestion: string;
  whatToProve: string[];
  whatToCollect: string[];
  linkedClaimIds: string[];
  linkedEvidenceIds: string[];
  source: string;
};

export type BurdenInvestigationInput = {
  caseId?: string;

  claimTheories?: Array<{
    id?: string;
    title?: string;
    status?: string;
    confidence?: string;
    linkedEvidenceIds?: string[];
    burdens?: Array<{
      issueLabel?: string;
      burdenHolder?: "user" | "other-side" | "shared" | "unknown";
      standard?: string;
      whatMustBeProven?: string[];
      currentProofStrength?: string;
      missingProof?: string[];
      linkedEvidenceIds?: string[];
      explanation?: string;
    }>;
    elements?: Array<{
      id?: string;
      label?: string;
      status?: string;
      missingFacts?: string[];
      missingEvidence?: string[];
      supportingEvidenceIds?: string[];
      risks?: string[];
      confidence?: string;
    }>;
    risks?: Array<{
      title?: string;
      severity?: string;
      explanation?: string;
    }>;
  }>;

  proofAnalysis?: {
    hasProofAnalysis?: boolean;
    proofWeaknesses?: string[];
    proofStrengths?: string[];
    proofNextActions?: string[];
    weakClaimProofCount?: number;
    missingElementProofCount?: number;
    contradictedElementProofCount?: number;
    warnings?: string[];
  };

  litigationReasoning?: {
    weakestCasePoints?: string[];
    judicialConcerns?: string[];
    opposingArguments?: string[];
    missingWork?: string[];
    warnings?: string[];
  };

  evidenceWarnings?: string[];
  proceduralWarnings?: string[];
  credibilityWarnings?: string[];
  contradictionWarnings?: string[];
};

export type BurdenInvestigationResult = {
  version: BurdenInvestigatorVersion;
  generatedAt: string;
  caseId?: string;

  findings: BurdenInvestigationFinding[];

  userBurdenQuestions: string[];
  opposingBurdenQuestions: string[];
  sharedBurdenQuestions: string[];
  missingProofQuestions: string[];
  weakProofQuestions: string[];
  contradictedProofQuestions: string[];
  judgeBurdenQuestions: string[];

  proofCollectionRequests: string[];
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

function includesAny(text: string, terms: string[]): boolean {
  const normalizedText = normalize(text);

  return terms.some((term) => normalizedText.includes(normalize(term)));
}

function severityRank(value: BurdenInvestigationSeverity): number {
  if (value === "critical") return 5;
  if (value === "high") return 4;
  if (value === "medium") return 3;
  if (value === "low") return 2;
  return 1;
}

function severityFromText(value: unknown): BurdenInvestigationSeverity {
  const text = normalize(value);

  if (includesAny(text, ["critical", "contradicted", "blocked"])) return "critical";
  if (includesAny(text, ["high", "missing", "no proof", "unsupported"])) return "high";
  if (includesAny(text, ["medium", "weak", "concern", "review"])) return "medium";
  if (includesAny(text, ["low", "minor"])) return "low";

  return "medium";
}

function createFinding(args: {
  category: BurdenInvestigationCategory;
  severity: BurdenInvestigationSeverity;
  title: string;
  explanation: string;
  whyItMatters: string;
  recommendedQuestion: string;
  whatToProve: string[];
  whatToCollect: string[];
  linkedClaimIds?: string[];
  linkedEvidenceIds?: string[];
  source: string;
}): BurdenInvestigationFinding {
  return {
    id: createId("burden_investigation"),
    category: args.category,
    severity: args.severity,
    title: args.title,
    explanation: args.explanation,
    whyItMatters: args.whyItMatters,
    recommendedQuestion: args.recommendedQuestion,
    whatToProve: uniqueStrings(args.whatToProve),
    whatToCollect: uniqueStrings(args.whatToCollect),
    linkedClaimIds: args.linkedClaimIds || [],
    linkedEvidenceIds: args.linkedEvidenceIds || [],
    source: args.source,
  };
}

function categoryFromBurdenHolder(
  holder: string | undefined,
): BurdenInvestigationCategory {
  if (holder === "user") return "user-burden";
  if (holder === "other-side") return "opposing-party-burden";
  if (holder === "shared") return "shared-burden";
  return "missing-burden";
}

function buildBaselineFindings(
  input: BurdenInvestigationInput,
): BurdenInvestigationFinding[] {
  const findings: BurdenInvestigationFinding[] = [];
  const claimTheories = input.claimTheories || [];

  if (claimTheories.length === 0) {
    findings.push(
      createFinding({
        category: "missing-burden",
        severity: "critical",
        title: "No claim theories available for burden analysis",
        explanation:
          "The Burden Investigator did not receive claim theories or legal issues to analyze.",
        whyItMatters:
          "CourtSimplified cannot assess who must prove what unless the claim, response, issue, or requested order is identified.",
        recommendedQuestion:
          "What claim, response, issue, or court order is the user trying to prove or defend against?",
        whatToProve: [
          "Legal issue",
          "Claim or defence theory",
          "Requested outcome",
          "Who is asking the court to do something",
        ],
        whatToCollect: [
          "Pleadings or draft pleadings",
          "Court forms",
          "User narrative",
          "Opposing party allegations",
          "Desired outcome",
        ],
        source: "claimTheories",
      }),
    );
  }

  if (input.proofAnalysis && !input.proofAnalysis.hasProofAnalysis) {
    findings.push(
      createFinding({
        category: "missing-element-proof",
        severity: "high",
        title: "Proof analysis has not been completed",
        explanation:
          "The system has burden-related signals but no confirmed element-by-element proof analysis.",
        whyItMatters:
          "A case can have a valid legal theory but still fail if each required element is not proven.",
        recommendedQuestion:
          "Which facts and evidence prove each required part of the claim, defence, or requested order?",
        whatToProve: [
          "Each required legal element",
          "Connection between facts and evidence",
          "Requested remedy or order",
        ],
        whatToCollect: [
          "Documents",
          "Screenshots",
          "Witnesses",
          "Timeline events",
          "Legal elements list",
        ],
        source: "proofAnalysis.hasProofAnalysis",
      }),
    );
  }

  return findings;
}

function buildClaimBurdenFindings(
  input: BurdenInvestigationInput,
): BurdenInvestigationFinding[] {
  const findings: BurdenInvestigationFinding[] = [];

  for (const claim of input.claimTheories || []) {
    const claimId = clean(claim.id);
    const claimTitle = clean(claim.title) || "Claim theory";
    const burdens = claim.burdens || [];

    if (burdens.length === 0) {
      findings.push(
        createFinding({
          category: "missing-burden",
          severity: "high",
          title: `${claimTitle}: burden not mapped`,
          explanation:
            "This claim theory does not yet have a structured burden of proof analysis.",
          whyItMatters:
            "The user needs to know what must be proven, who must prove it, and what evidence is required.",
          recommendedQuestion:
            "For this issue, who has to prove what, and what evidence would satisfy that burden?",
          whatToProve: [
            "Who holds the burden",
            "What legal or factual issue must be proven",
            "Applicable standard of proof",
            "Evidence needed",
          ],
          whatToCollect: [
            "Claim elements",
            "Court form requirements",
            "Rule or statute",
            "Evidence linked to each element",
          ],
          linkedClaimIds: claimId ? [claimId] : [],
          linkedEvidenceIds: claim.linkedEvidenceIds || [],
          source: "claimTheories.burdens",
        }),
      );
    }

    for (const burden of burdens) {
      const burdenHolder = burden.burdenHolder || "unknown";
      const category = categoryFromBurdenHolder(burdenHolder);
      const issueLabel = clean(burden.issueLabel) || claimTitle;
      const missingProof = burden.missingProof || [];
      const proofStrength = normalize(burden.currentProofStrength);
      const linkedEvidenceIds = uniqueStrings([
        ...(claim.linkedEvidenceIds || []),
        ...(burden.linkedEvidenceIds || []),
      ]);

      findings.push(
        createFinding({
          category,
          severity:
            missingProof.length > 0
              ? "high"
              : proofStrength === "low" || proofStrength === "very-low"
                ? "medium"
                : "info",
          title: `${issueLabel}: burden mapped`,
          explanation:
            burden.explanation ||
            `The burden holder is ${burdenHolder}, with standard ${
              burden.standard || "unknown"
            }.`,
          whyItMatters:
            "Burden mapping tells the user what must be proven before the system treats the point as litigation-ready.",
          recommendedQuestion:
            burdenHolder === "other-side"
              ? "What must the other side prove, and what evidence shows they have or have not proven it?"
              : burdenHolder === "shared"
                ? "What must each side prove, and what evidence supports or weakens each side?"
                : "What evidence proves this issue well enough for the court to rely on it?",
          whatToProve: burden.whatMustBeProven || [
            "Facts supporting the issue",
            "Evidence linked to those facts",
            "Relief or result connected to the proof",
          ],
          whatToCollect:
            missingProof.length > 0
              ? missingProof
              : [
                  "Linked documents",
                  "Witness evidence",
                  "Timeline support",
                  "Legal authority",
                ],
          linkedClaimIds: claimId ? [claimId] : [],
          linkedEvidenceIds,
          source: "claimTheories.burdens",
        }),
      );

      if (missingProof.length > 0) {
        findings.push(
          createFinding({
            category: "missing-element-proof",
            severity: "high",
            title: `${issueLabel}: missing proof`,
            explanation: missingProof.join("; "),
            whyItMatters:
              "Missing proof can block a claim, defence, motion, or requested order even when the story sounds persuasive.",
            recommendedQuestion:
              "What evidence can fill the missing proof for this issue?",
            whatToProve: burden.whatMustBeProven || [issueLabel],
            whatToCollect: missingProof,
            linkedClaimIds: claimId ? [claimId] : [],
            linkedEvidenceIds,
            source: "claimTheories.burdens.missingProof",
          }),
        );
      }
    }
  }

  return findings;
}

function buildElementProofFindings(
  input: BurdenInvestigationInput,
): BurdenInvestigationFinding[] {
  const findings: BurdenInvestigationFinding[] = [];

  for (const claim of input.claimTheories || []) {
    const claimId = clean(claim.id);
    const claimTitle = clean(claim.title) || "Claim theory";

    for (const element of claim.elements || []) {
      const status = normalize(element.status);
      const elementLabel = clean(element.label) || "Claim element";
      const linkedEvidenceIds = uniqueStrings(element.supportingEvidenceIds || []);

      if (status === "missing") {
        findings.push(
          createFinding({
            category: "missing-element-proof",
            severity: "high",
            title: `${claimTitle}: missing proof for ${elementLabel}`,
            explanation:
              "A required or important element appears to be missing proof.",
            whyItMatters:
              "A missing element may prevent the court from granting the requested relief.",
            recommendedQuestion:
              "What facts, documents, witnesses, or records prove this missing element?",
            whatToProve: [elementLabel],
            whatToCollect: uniqueStrings([
              ...(element.missingFacts || []),
              ...(element.missingEvidence || []),
              "Documents",
              "Witnesses",
              "Timeline events",
            ]),
            linkedClaimIds: claimId ? [claimId] : [],
            linkedEvidenceIds,
            source: "claimTheories.elements.status",
          }),
        );
      }

      if (status === "partially-satisfied") {
        findings.push(
          createFinding({
            category: "weak-element-proof",
            severity: "medium",
            title: `${claimTitle}: weak proof for ${elementLabel}`,
            explanation:
              "This element has some support, but it may not yet be strong enough for court-ready analysis.",
            whyItMatters:
              "Partially proven elements are common attack points for judges and opposing parties.",
            recommendedQuestion:
              "What additional evidence would make this element stronger?",
            whatToProve: [elementLabel],
            whatToCollect: uniqueStrings([
              ...(element.missingFacts || []),
              ...(element.missingEvidence || []),
              "Corroborating evidence",
              "Source records",
              "Witness confirmation",
            ]),
            linkedClaimIds: claimId ? [claimId] : [],
            linkedEvidenceIds,
            source: "claimTheories.elements.status",
          }),
        );
      }

      if (status === "contradicted") {
        findings.push(
          createFinding({
            category: "contradicted-element-proof",
            severity: "critical",
            title: `${claimTitle}: contradicted proof for ${elementLabel}`,
            explanation:
              "This element appears to have contradictory proof or conflicting signals.",
            whyItMatters:
              "Contradicted proof can seriously affect credibility, legal strength, and whether the claim should be advanced as drafted.",
            recommendedQuestion:
              "What explains the contradiction, and which evidence is most reliable?",
            whatToProve: [elementLabel],
            whatToCollect: [
              "Side-by-side contradiction chart",
              "Original records",
              "Dates",
              "Context",
              "Explanation for inconsistency",
            ],
            linkedClaimIds: claimId ? [claimId] : [],
            linkedEvidenceIds,
            source: "claimTheories.elements.status",
          }),
        );
      }

      for (const risk of element.risks || []) {
        findings.push(
          createFinding({
            category: includesAny(risk, ["contradict", "inconsistent"])
              ? "contradicted-element-proof"
              : includesAny(risk, ["missing", "no proof"])
                ? "missing-element-proof"
                : "weak-element-proof",
            severity: severityFromText(risk),
            title: `${claimTitle}: element risk`,
            explanation: risk,
            whyItMatters:
              "Element risks show where the legal burden may not be met yet.",
            recommendedQuestion:
              "What evidence or clarification addresses this element risk?",
            whatToProve: [elementLabel],
            whatToCollect: [
              "Better facts",
              "Documents",
              "Witnesses",
              "Timeline support",
              "Legal authority",
            ],
            linkedClaimIds: claimId ? [claimId] : [],
            linkedEvidenceIds,
            source: "claimTheories.elements.risks",
          }),
        );
      }
    }
  }

  return findings;
}

function buildCrossSystemFindings(
  input: BurdenInvestigationInput,
): BurdenInvestigationFinding[] {
  const findings: BurdenInvestigationFinding[] = [];

  const warnings = [
    ...(input.proofAnalysis?.warnings || []),
    ...(input.proofAnalysis?.proofWeaknesses || []),
    ...(input.litigationReasoning?.weakestCasePoints || []),
    ...(input.litigationReasoning?.judicialConcerns || []),
    ...(input.litigationReasoning?.missingWork || []),
    ...(input.evidenceWarnings || []),
    ...(input.proceduralWarnings || []),
    ...(input.credibilityWarnings || []),
    ...(input.contradictionWarnings || []),
  ];

  for (const warning of warnings) {
    findings.push(
      createFinding({
        category: includesAny(warning, ["judge", "court"])
          ? "judge-concern"
          : includesAny(warning, ["contradict", "inconsistent"])
            ? "contradicted-element-proof"
            : includesAny(warning, ["standard", "balance", "prove"])
              ? "standard-of-proof"
              : includesAny(warning, ["other side", "opposing", "onus"])
                ? "opposing-party-burden"
                : includesAny(warning, ["missing", "gap"])
                  ? "missing-element-proof"
                  : "weak-element-proof",
        severity: severityFromText(warning),
        title: "Burden-related warning",
        explanation: warning,
        whyItMatters:
          "This warning may affect whether the burden of proof is met or whether the court can safely rely on the point.",
        recommendedQuestion:
          "What must be proven here, who has to prove it, and what evidence currently supports or weakens it?",
        whatToProve: [
          "Burden holder",
          "Standard of proof",
          "Required facts",
          "Evidence supporting each required fact",
        ],
        whatToCollect: [
          "Proof map",
          "Evidence records",
          "Timeline support",
          "Witness confirmation",
          "Authority or rule",
        ],
        source: "crossSystemWarnings",
      }),
    );
  }

  return findings;
}

function findingsByCategory(
  findings: BurdenInvestigationFinding[],
  category: BurdenInvestigationCategory,
): BurdenInvestigationFinding[] {
  return findings.filter((finding) => finding.category === category);
}

function questionsFromFindings(
  findings: BurdenInvestigationFinding[],
): string[] {
  return uniqueStrings(
    findings
      .slice()
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .map((finding) => finding.recommendedQuestion),
  );
}

function collectionFromFindings(
  findings: BurdenInvestigationFinding[],
): string[] {
  return uniqueStrings(findings.flatMap((finding) => finding.whatToCollect));
}

export function buildBurdenInvestigation(
  input: BurdenInvestigationInput,
): BurdenInvestigationResult {
  const findings = [
    ...buildBaselineFindings(input),
    ...buildClaimBurdenFindings(input),
    ...buildElementProofFindings(input),
    ...buildCrossSystemFindings(input),
  ].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  const topQuestions = questionsFromFindings(findings).slice(0, 14);

  const warnings = uniqueStrings([
    ...(input.proofAnalysis?.warnings || []),
    ...(input.litigationReasoning?.warnings || []),
    ...findings
      .filter((finding) => severityRank(finding.severity) >= 4)
      .map((finding) => finding.title),
  ]);

  return {
    version: "1.0.0",
    generatedAt: nowIso(),
    caseId: input.caseId,

    findings,

    userBurdenQuestions: findingsByCategory(findings, "user-burden").map(
      (finding) => finding.recommendedQuestion,
    ),
    opposingBurdenQuestions: findingsByCategory(
      findings,
      "opposing-party-burden",
    ).map((finding) => finding.recommendedQuestion),
    sharedBurdenQuestions: findingsByCategory(findings, "shared-burden").map(
      (finding) => finding.recommendedQuestion,
    ),
    missingProofQuestions: findingsByCategory(
      findings,
      "missing-element-proof",
    ).map((finding) => finding.recommendedQuestion),
    weakProofQuestions: findingsByCategory(findings, "weak-element-proof").map(
      (finding) => finding.recommendedQuestion,
    ),
    contradictedProofQuestions: findingsByCategory(
      findings,
      "contradicted-element-proof",
    ).map((finding) => finding.recommendedQuestion),
    judgeBurdenQuestions: findingsByCategory(findings, "judge-concern").map(
      (finding) => finding.recommendedQuestion,
    ),

    proofCollectionRequests: collectionFromFindings(findings),

    nextActions: uniqueStrings([
      ...topQuestions,
      "Map every claim or requested order to who has the burden of proof.",
      "Connect every required element to specific evidence.",
      "Separate what the user must prove from what the opposing party must prove.",
      "Do not treat a claim as court-ready until missing or contradicted proof is resolved.",
    ]).slice(0, 16),

    warnings,

    summary:
      findings.length > 0
        ? `Burden investigation found ${findings.length} burden, proof, or onus issue(s).`
        : "Burden investigation did not identify major burden of proof issues from the available record.",
  };
}