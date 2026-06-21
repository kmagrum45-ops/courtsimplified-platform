import {
  ClaimClassification,
  ClaimElementAssessment,
  ExtractedEvidence,
  IntelligenceConfidence,
  IntelligenceSeverity,
  LegalDomain,
  NormalizedIntake,
} from "./intelligenceTypes";

export type ElementProofStatus =
  | "proven"
  | "partly-proven"
  | "missing-proof"
  | "contradicted"
  | "not-applicable";

export type ElementProofFinding = {
  id: string;
  claimId: string;
  claimType: LegalDomain;
  elementId: string;
  elementKey: string;
  elementLabel: string;
  status: ElementProofStatus;
  proofStrength: IntelligenceConfidence;
  burdenRisk: IntelligenceSeverity;
  supportingEvidenceIds: string[];
  supportingEvidenceTitles: string[];
  missingEvidence: string[];
  judgeConcern: string;
  opposingArgument: string;
  nextAction: string;
  explanation: string;
};

export type ClaimProofMap = {
  id: string;
  claimId: string;
  claimType: LegalDomain;
  claimTitle: string;
  overallProofStrength: IntelligenceConfidence;
  weakestElements: string[];
  strongestElements: string[];
  missingEvidence: string[];
  judgeConcerns: string[];
  opposingArguments: string[];
  nextActions: string[];
  elementFindings: ElementProofFinding[];
};

export type ElementProofEngineResult = {
  version: "1.0.0";
  claimProofMaps: ClaimProofMap[];
  globalWeaknesses: string[];
  globalStrengths: string[];
  globalNextActions: string[];
  summary: string;
};

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function clean(value: unknown): string {
  return String(value || "").trim();
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function isActiveClaim(claim: ClaimClassification): boolean {
  return claim.status === "detected" || claim.status === "possible";
}

function evidenceById(
  evidence: ExtractedEvidence[],
): Map<string, ExtractedEvidence> {
  const map = new Map<string, ExtractedEvidence>();

  for (const item of evidence) {
    map.set(item.id, item);
  }

  return map;
}

function mapElementStatus(
  element: ClaimElementAssessment,
): ElementProofStatus {
  if (element.status === "satisfied") return "proven";
  if (element.status === "partially-satisfied") return "partly-proven";
  if (element.status === "missing") return "missing-proof";
  if (element.status === "contradicted") return "contradicted";
  return "not-applicable";
}

function scoreConfidence(value: IntelligenceConfidence): number {
  if (value === "very-high") return 90;
  if (value === "high") return 75;
  if (value === "medium") return 55;
  if (value === "low") return 30;
  return 10;
}

function confidenceFromScore(score: number): IntelligenceConfidence {
  if (score >= 85) return "very-high";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  if (score >= 20) return "low";
  return "very-low";
}

function burdenRiskFor(status: ElementProofStatus): IntelligenceSeverity {
  if (status === "contradicted") return "critical";
  if (status === "missing-proof") return "high";
  if (status === "partly-proven") return "medium";
  if (status === "proven") return "low";
  return "info";
}

function buildJudgeConcern(args: {
  claimType: LegalDomain;
  element: ClaimElementAssessment;
  status: ElementProofStatus;
}): string {
  if (args.status === "proven") {
    return `The court may accept this element more easily if the evidence is organized and authenticated.`;
  }

  if (args.status === "partly-proven") {
    return `The court may ask whether the evidence actually proves "${args.element.label}" or only suggests it.`;
  }

  if (args.status === "contradicted") {
    return `The court may be concerned that the evidence or facts contradict this required element.`;
  }

  if (args.claimType === "defamation" && args.element.elementKey === "publication") {
    return "The court may require clear proof that the statement was communicated to someone other than the claimant.";
  }

  if (args.claimType === "defamation" && args.element.elementKey === "statement") {
    return "The court may require the exact words, full context, date, platform, and recipient before assessing defamation.";
  }

  if (
    args.claimType === "negligence" &&
    args.element.elementKey === "causation"
  ) {
    return "The court may focus on whether the alleged failure actually caused or materially contributed to the harm.";
  }

  if (
    args.claimType === "civil-institutional-liability" &&
    args.element.elementKey === "actionable-conduct"
  ) {
    return "The court may ask whether the claim targets actionable operational conduct rather than protected discretion or a protected decision.";
  }

  return `The court may require clearer proof for "${args.element.label}" before this claim can safely support drafting or filing.`;
}

function buildOpposingArgument(args: {
  claimType: LegalDomain;
  element: ClaimElementAssessment;
  status: ElementProofStatus;
}): string {
  if (args.status === "proven") {
    return `The other side may still attack the reliability, context, admissibility, or weight of the evidence.`;
  }

  if (args.status === "partly-proven") {
    return `The other side may argue the user has some facts, but not enough proof to establish this element.`;
  }

  if (args.status === "contradicted") {
    return `The other side may argue this contradiction defeats or seriously weakens the claim.`;
  }

  if (args.claimType === "defamation") {
    return "The other side may argue the statement was not made, was not published, was true, was opinion, was privileged, or caused no proven harm.";
  }

  if (args.claimType === "contract") {
    return "The other side may argue there was no enforceable agreement, no breach, payment was made, or damages are unsupported.";
  }

  if (args.claimType === "property-damage") {
    return "The other side may argue they did not cause the damage or the repair/replacement value is unsupported.";
  }

  if (
    args.claimType === "civil-institutional-liability" ||
    args.claimType === "civil-charter"
  ) {
    return "The other side may argue immunity, protected discretion, wrong forum, no causation, no actionable conduct, or no available remedy.";
  }

  return `The other side may argue the user has not proven "${args.element.label}".`;
}

function buildNextAction(args: {
  element: ClaimElementAssessment;
  status: ElementProofStatus;
  supportingEvidenceTitles: string[];
}): string {
  if (args.status === "proven") {
    return `Keep the evidence for "${args.element.label}" organized, dated, and linked to the claim.`;
  }

  if (args.supportingEvidenceTitles.length > 0) {
    return `Strengthen "${args.element.label}" by adding missing context, dates, witnesses, records, or authentication for the existing evidence.`;
  }

  const missing = args.element.missingFacts[0];

  if (missing) {
    return `Add proof for "${args.element.label}": ${missing}`;
  }

  return `Add facts and evidence proving "${args.element.label}".`;
}

function buildElementFinding(args: {
  claim: ClaimClassification;
  element: ClaimElementAssessment;
  evidenceMap: Map<string, ExtractedEvidence>;
}): ElementProofFinding {
  const status = mapElementStatus(args.element);

  const supportingEvidence = args.element.supportingEvidenceIds
    .map((id) => args.evidenceMap.get(id))
    .filter((item): item is ExtractedEvidence => Boolean(item));

  const supportingEvidenceTitles = unique(
    supportingEvidence.map((item) => item.title),
  );

  const missingEvidence = unique([
    ...args.element.missingFacts,
    ...args.element.risks,
  ]);

  return {
    id: createId("element_proof"),
    claimId: args.claim.id,
    claimType: args.claim.claimType,
    elementId: args.element.id,
    elementKey: args.element.elementKey,
    elementLabel: args.element.label,
    status,
    proofStrength: args.element.confidence,
    burdenRisk: burdenRiskFor(status),
    supportingEvidenceIds: args.element.supportingEvidenceIds,
    supportingEvidenceTitles,
    missingEvidence,
    judgeConcern: buildJudgeConcern({
      claimType: args.claim.claimType,
      element: args.element,
      status,
    }),
    opposingArgument: buildOpposingArgument({
      claimType: args.claim.claimType,
      element: args.element,
      status,
    }),
    nextAction: buildNextAction({
      element: args.element,
      status,
      supportingEvidenceTitles,
    }),
    explanation: args.element.explanation,
  };
}

function buildClaimProofMap(args: {
  claim: ClaimClassification;
  intake: NormalizedIntake;
}): ClaimProofMap {
  const map = evidenceById(args.intake.evidence);

  const elementFindings = args.claim.requiredElements.map((element) =>
    buildElementFinding({
      claim: args.claim,
      element,
      evidenceMap: map,
    }),
  );

  const weakestElements = unique(
    elementFindings
      .filter(
        (item) =>
          item.status === "missing-proof" ||
          item.status === "contradicted" ||
          item.status === "partly-proven",
      )
      .map((item) => item.elementLabel),
  );

  const strongestElements = unique(
    elementFindings
      .filter((item) => item.status === "proven")
      .map((item) => item.elementLabel),
  );

  const missingEvidence = unique(
    elementFindings.flatMap((item) => item.missingEvidence),
  );

  const judgeConcerns = unique(
    elementFindings
      .filter((item) => item.status !== "proven")
      .map((item) => item.judgeConcern),
  );

  const opposingArguments = unique(
    elementFindings.map((item) => item.opposingArgument),
  );

  const nextActions = unique(
    elementFindings.map((item) => item.nextAction),
  );

  const averageScore =
    elementFindings.length > 0
      ? elementFindings.reduce(
          (total, item) => total + scoreConfidence(item.proofStrength),
          0,
        ) / elementFindings.length
      : 0;

  const penalty =
    elementFindings.filter((item) => item.status === "missing-proof").length * 12 +
    elementFindings.filter((item) => item.status === "contradicted").length * 20;

  return {
    id: createId("claim_proof_map"),
    claimId: args.claim.id,
    claimType: args.claim.claimType,
    claimTitle: args.claim.claimType.replace(/-/g, " "),
    overallProofStrength: confidenceFromScore(averageScore - penalty),
    weakestElements,
    strongestElements,
    missingEvidence,
    judgeConcerns,
    opposingArguments,
    nextActions,
    elementFindings,
  };
}

export function buildElementProofAnalysis(args: {
  intake: NormalizedIntake;
  classifications: ClaimClassification[];
}): ElementProofEngineResult {
  const activeClaims = args.classifications.filter(isActiveClaim);

  const claimProofMaps = activeClaims.map((claim) =>
    buildClaimProofMap({
      claim,
      intake: args.intake,
    }),
  );

  const globalWeaknesses = unique(
    claimProofMaps.flatMap((map) => [
      ...map.weakestElements.map(
        (element) => `${map.claimTitle}: ${element}`,
      ),
      ...map.missingEvidence,
    ]),
  );

  const globalStrengths = unique(
    claimProofMaps.flatMap((map) =>
      map.strongestElements.map(
        (element) => `${map.claimTitle}: ${element}`,
      ),
    ),
  );

  const globalNextActions = unique(
    claimProofMaps.flatMap((map) => map.nextActions),
  );

  const summary =
    claimProofMaps.length === 0
      ? "No active claim proof map was created because no active claim classifications were available."
      : `Element proof analysis created ${claimProofMaps.length} claim proof map(s), with ${globalWeaknesses.length} weakness item(s) and ${globalStrengths.length} strength item(s).`;

  return {
    version: "1.0.0",
    claimProofMaps,
    globalWeaknesses,
    globalStrengths,
    globalNextActions,
    summary,
  };
}