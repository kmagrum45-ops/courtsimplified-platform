import {
  ClaimClassification,
  ClaimElementAssessment,
  ExtractedEvidence,
  IntelligenceConfidence,
  IntelligenceSeverity,
  LegalDomain,
  NormalizedIntake,
} from "./intelligenceTypes";

import { sanitizeTextArray } from "./caseStrengthLanguageValidator";

export type ElementProofStatus =
  | "evidence-recorded"
  | "some-evidence-recorded"
  | "no-evidence-recorded"
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
  nextAction: string;
  explanation: string;
};

/**
 * Elements partitioned by what is on record, in place of the previous
 * weakest/strongest ordering.
 *
 * Session 48: `weakestElements` / `strongestElements` / `overallProofStrength`
 * ranked the user's case by how well each element was doing, which CLAUDE.md
 * section 3 forbids. This says only which elements have evidence recorded
 * against them, which have some, and which have none — a factual partition of
 * the file. Each group is sorted alphabetically so the order carries no
 * ranking either.
 */
export type ElementsByRecordStatus = {
  recorded: string[];
  partlyRecorded: string[];
  nothingRecorded: string[];
  contradicted: string[];
};

export type ClaimProofMap = {
  id: string;
  claimId: string;
  claimType: LegalDomain;
  claimTitle: string;
  elementsByRecordStatus: ElementsByRecordStatus;
  missingEvidence: string[];
  nextActions: string[];
  elementFindings: ElementProofFinding[];
};

export type ElementProofEngineResult = {
  version: "1.0.0";
  claimProofMaps: ClaimProofMap[];
  /**
   * Every element, across all claims, with nothing recorded against it.
   * Replaces globalWeaknesses/globalStrengths, which named the case's strong
   * and weak points.
   */
  globalNothingRecorded: string[];
  globalNextActions: string[];
  summary: string;
};

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
  // Session 48: ClaimElementStatus now records what the user SUPPLIED
  // (documented / partially-documented / not-documented) rather than whether
  // an element is legally made out. ElementProofStatus keeps its old
  // vocabulary for now — see the note on its declaration in
  // intelligenceTypes.ts for why renaming it is a separate, wider pass.
  if (element.status === "documented") return "evidence-recorded";
  if (element.status === "partially-documented") return "some-evidence-recorded";
  if (element.status === "not-documented") return "no-evidence-recorded";
  if (element.status === "conflicting-information") return "contradicted";
  return "not-applicable";
}

// scoreConfidence() and confidenceFromScore() removed with
// overallProofStrength. They were the ordinal-to-number-and-back pair that
// made the penalty arithmetic possible.

function burdenRiskFor(status: ElementProofStatus): IntelligenceSeverity {
  if (status === "contradicted") return "critical";
  if (status === "no-evidence-recorded") return "high";
  if (status === "some-evidence-recorded") return "medium";
  if (status === "evidence-recorded") return "low";
  return "info";
}

function buildNextAction(args: {
  element: ClaimElementAssessment;
  status: ElementProofStatus;
  supportingEvidenceTitles: string[];
}): string {
  if (args.status === "evidence-recorded") {
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

  const missingEvidence = sanitizeTextArray(
    unique([...args.element.missingFacts, ...args.element.risks]),
    "elementProofFinding.missingEvidence",
  );

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

  // Alphabetical within each group: the partition says what is on record, and
  // nothing about the order should imply a ranking.
  const labelsWithStatus = (status: ElementProofStatus): string[] =>
    unique(
      elementFindings
        .filter((item) => item.status === status)
        .map((item) => item.elementLabel),
    ).sort((a, b) => a.localeCompare(b));

  const elementsByRecordStatus: ElementsByRecordStatus = {
    recorded: labelsWithStatus("evidence-recorded"),
    partlyRecorded: labelsWithStatus("some-evidence-recorded"),
    nothingRecorded: labelsWithStatus("no-evidence-recorded"),
    contradicted: labelsWithStatus("contradicted"),
  };

  const missingEvidence = unique(
    elementFindings.flatMap((item) => item.missingEvidence),
  );

  const nextActions = unique(
    elementFindings.map((item) => item.nextAction),
  );

  // `overallProofStrength` is removed, and with it the score behind it:
  //
  //     confidenceFromScore(averageScore - penalty)
  //
  // where penalty weighted each not-recorded element by 12 and each
  // contradiction by 20. That is a risk-weighted readiness score over the
  // user's own case — the exact construct CLAUDE.md section 3 names — and it
  // was a sixth scoring formula, unnoticed until this pass.
  return {
    id: createId("claim_proof_map"),
    claimId: args.claim.id,
    claimType: args.claim.claimType,
    claimTitle: args.claim.claimType.replace(/-/g, " "),
    elementsByRecordStatus,
    missingEvidence,
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

  const globalNothingRecorded = unique(
    claimProofMaps.flatMap((map) =>
      map.elementsByRecordStatus.nothingRecorded.map(
        (element) => `${map.claimTitle}: ${element}`,
      ),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const globalNextActions = unique(
    claimProofMaps.flatMap((map) => map.nextActions),
  );

  const summary =
    claimProofMaps.length === 0
      ? "No active claim proof map was created because no active claim classifications were available."
      : `Element proof analysis created ${claimProofMaps.length} claim proof map(s). ${globalNothingRecorded.length} element(s) have nothing recorded against them yet.`;

  return {
    version: "1.0.0",
    claimProofMaps,
    globalNothingRecorded,
    globalNextActions,
    summary,
  };
}