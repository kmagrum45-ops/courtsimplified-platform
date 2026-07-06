import { LegalIntelligenceResult } from "../intelligence/intelligenceTypes";

import {
  CaseCourtPath,
  CaseLegalDomain,
  CaseProvince,
  CaseStage,
  MasterCaseSchema,
} from "../architecture/masterCaseSchema";

import { buildMasterCaseFromIntelligence } from "../contracts/masterCaseBridge";

import {
  buildCaseSystemAssembly,
  CaseSystemAssemblyModel,
} from "./caseSystemAssembly";

export type CourtSimplifiedBrainBridgeVersion = "1.2.0";

export type CourtSimplifiedBrainBridgeOutput = {
  version: CourtSimplifiedBrainBridgeVersion;
  masterCase: MasterCaseSchema;
  assembly: CaseSystemAssemblyModel;
  recommendedNextRoute?: string;
  warnings: string[];
};

type AssemblyRemedyCategory =
  | "money"
  | "apology"
  | "retraction"
  | "injunction"
  | "parenting-order"
  | "support-order"
  | "property-order"
  | "dismissal"
  | "settlement"
  | "unknown";

const COURT_PATHS: CaseCourtPath[] = [
  "family",
  "small-claims",
  "civil",
  "tribunal",
  "ltb",
  "immigration",
  "criminal-related",
  "unknown",
];

const PROVINCES: CaseProvince[] = [
  "Ontario",
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
  "Federal",
  "Unknown",
];

const STAGES: CaseStage[] = [
  "pre-litigation",
  "starting-case",
  "responding",
  "already-started",
  "conference",
  "motion",
  "trial",
  "settlement",
  "enforcement",
  "appeal",
  "urgent",
  "closed",
  "not-sure",
];

const DOMAINS: CaseLegalDomain[] = [
  "defamation",
  "contract",
  "property-damage",
  "negligence",
  "personal-injury",
  "harassment",
  "employment",
  "debt",
  "consumer",
  "family-parenting",
  "family-support",
  "family-property",
  "family-safety",
  "civil-charter",
  "civil-human-rights",
  "civil-institutional-liability",
  "landlord-tenant",
  "immigration",
  "procedural",
  "unknown",
];

function clean(value: unknown): string {
  return String(value || "").trim();
}

function normalizeKey(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .trim();
}

function uniqueStrings(items: unknown[]): string[] {
  return Array.from(new Set(items.map(clean).filter(Boolean)));
}

function asCourtPath(value: unknown): CaseCourtPath {
  const normalized = normalizeKey(value);

  if (normalized === "smallclaims" || normalized === "small-claim") {
    return "small-claims";
  }

  if (normalized === "criminal") return "criminal-related";
  if (normalized === "landlord-tenant") return "ltb";

  return COURT_PATHS.includes(normalized as CaseCourtPath)
    ? (normalized as CaseCourtPath)
    : "unknown";
}

function asProvince(value: unknown): CaseProvince {
  const cleaned = clean(value);

  const match = PROVINCES.find(
    (province) => province.toLowerCase() === cleaned.toLowerCase(),
  );

  return match || "Unknown";
}

function asStage(value: unknown): CaseStage {
  const normalized = normalizeKey(value);

  if (normalized === "not-started") return "pre-litigation";
  if (normalized === "already-filed") return "already-started";
  if (normalized === "trial-preparation") return "trial";
  if (normalized === "appeal-or-review") return "appeal";

  return STAGES.includes(normalized as CaseStage)
    ? (normalized as CaseStage)
    : "not-sure";
}

function asDomain(value: unknown): CaseLegalDomain {
  const normalized = normalizeKey(value);

  if (normalized === "contracts") return "contract";
  if (normalized === "property") return "property-damage";
  if (normalized === "support") return "family-support";
  if (normalized === "parenting") return "family-parenting";
  if (normalized === "charter") return "civil-charter";
  if (normalized === "human-rights") return "civil-human-rights";
  if (normalized === "institutional-liability") {
    return "civil-institutional-liability";
  }

  return DOMAINS.includes(normalized as CaseLegalDomain)
    ? (normalized as CaseLegalDomain)
    : "unknown";
}

function getLegalDomains(intelligence: LegalIntelligenceResult): CaseLegalDomain[] {
  const fromPrimary = intelligence.primaryClaimTypes
    .map(asDomain)
    .filter((domain) => domain !== "unknown");

  const fromClassifications = intelligence.claimClassifications
    .filter(
      (claim) =>
        claim.status === "detected" ||
        claim.status === "possible" ||
        claim.status === "insufficient-facts",
    )
    .map((claim) => asDomain(claim.claimType))
    .filter((domain) => domain !== "unknown");

  const merged = Array.from(new Set([...fromPrimary, ...fromClassifications]));

  return merged.length > 0 ? merged : ["unknown"];
}

function getClaimStatus(
  status: LegalIntelligenceResult["claimClassifications"][number]["status"],
) {
  if (status === "detected") return "dominant";
  if (status === "possible") return "possible";
  if (status === "insufficient-facts") return "secondary";
  if (status === "rejected-false-positive") return "rejected";
  if (status === "conflicting-signals") return "rejected";
  return "unknown";
}

function getClaimSuppressionReason(
  claim: LegalIntelligenceResult["claimClassifications"][number],
): string | undefined {
  if (
    claim.status === "rejected-false-positive" ||
    claim.status === "conflicting-signals"
  ) {
    return claim.rejectedBecause[0];
  }

  return undefined;
}

function getFormLabels(intelligence: LegalIntelligenceResult): string[] {
  return uniqueStrings(
    intelligence.formRecommendations.map((form) => {
      if (form.formNumber && form.title) {
        return `Form ${form.formNumber} — ${form.title}`;
      }

      if (form.formNumber) return `Form ${form.formNumber}`;

      return form.title;
    }),
  );
}

function mapRemedyCategory(value: unknown): AssemblyRemedyCategory {
  const type = normalizeKey(value);

  if (type === "money") return "money";
  if (type === "costs") return "money";
  if (type === "interest") return "money";
  if (type === "damages") return "money";
  if (type === "apology") return "apology";
  if (type === "retraction") return "retraction";
  if (type === "injunction") return "injunction";
  if (type === "parenting-order") return "parenting-order";
  if (type === "support-order") return "support-order";
  if (type === "property-order") return "property-order";
  if (type === "dismissal") return "dismissal";
  if (type === "settlement") return "settlement";

  return "unknown";
}

function getEvidenceLinkedTimelineEventIds(args: {
  evidenceId: string;
  linkedFactIds: string[];
  events: LegalIntelligenceResult["normalizedIntake"]["events"];
}): string[] {
  const fromEvents = args.events
    .filter((event) => event.evidenceIds.includes(args.evidenceId))
    .map((event) => event.id);

  return uniqueStrings([...fromEvents, ...args.linkedFactIds]);
}

function getRecommendedRoute(args: {
  intelligence: LegalIntelligenceResult;
  assembly: CaseSystemAssemblyModel;
  existingRoute?: string;
}): string | undefined {
  if (args.assembly.workflow.readiness.recommendedRoute) {
    return args.assembly.workflow.readiness.recommendedRoute;
  }

  if (args.existingRoute) return args.existingRoute;

  const stage = asStage(args.intelligence.proceduralPosture.stage);

  if (stage === "urgent") return "/dashboard";
  if (args.intelligence.missingInformation.length > 0) return "/builder";
  if (args.intelligence.normalizedIntake.evidence.length === 0) return "/evidence";
  if (args.intelligence.formRecommendations.length > 0) return "/forms";

  return "/dashboard";
}

function buildBridgeWarnings(args: {
  intelligence: LegalIntelligenceResult;
  assemblyWarnings: string[];
  masterCase: MasterCaseSchema;
  courtPath: CaseCourtPath;
  province: CaseProvince;
  stage: CaseStage;
  legalDomains: CaseLegalDomain[];
}): string[] {
  return uniqueStrings([
    ...args.assemblyWarnings,
    ...args.masterCase.systemWarnings,
    ...args.intelligence.systemWarnings,
    ...args.intelligence.legalKnowledge.sourceWarnings,

    args.courtPath === "unknown"
      ? "Court path could not be confidently normalized."
      : "",

    args.province === "Unknown"
      ? "Province could not be confidently normalized."
      : "",

    args.stage === "not-sure"
      ? "Procedural stage could not be confidently normalized."
      : "",

    args.legalDomains.includes("unknown")
      ? "Legal domain could not be confidently normalized."
      : "",

    args.intelligence.claimClassifications.length === 0
      ? "No claim classifications were available for bridge mapping."
      : "",

    args.intelligence.normalizedIntake.evidence.length === 0
      ? "No evidence items were available for bridge mapping."
      : "",
  ]);
}

export function buildCourtSimplifiedBrainBridge(args: {
  intelligence: LegalIntelligenceResult;
  existingCase?: MasterCaseSchema;
  recommendedNextRoute?: string;
}): CourtSimplifiedBrainBridgeOutput {
  const { intelligence } = args;

  const courtPath = asCourtPath(intelligence.proceduralPosture.courtPath);
  const province = asProvince(intelligence.proceduralPosture.province);
  const stage = asStage(intelligence.proceduralPosture.stage);
  const legalDomains = getLegalDomains(intelligence);
  const formLabels = getFormLabels(intelligence);

  const assemblyOutput = buildCaseSystemAssembly({
    caseId: intelligence.normalizedIntake.caseId,
    courtPath,
    province,
    stage,
    rawNarrative: intelligence.normalizedIntake.rawUserText,
    legalDomains,

    timeline: {
      eventCandidates: intelligence.normalizedIntake.events.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        sourceText: event.sourceText,
        partyIds: event.partyIds,
        evidenceIds: event.evidenceIds,
        legalDomains: event.legalDomainSignals
          .map((signal) => asDomain(signal.domain))
          .filter((domain) => domain !== "unknown"),
      })),
    },

    evidence: {
      evidenceCandidates: intelligence.normalizedIntake.evidence.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        sourceText: item.sourceText,
        linkedClaimDomains: legalDomains,
        linkedTimelineEventIds: getEvidenceLinkedTimelineEventIds({
          evidenceId: item.id,
          linkedFactIds: item.linkedFactIds,
          events: intelligence.normalizedIntake.events,
        }),
        tags: uniqueStrings([
          ...item.gaps,
          ...item.admissibilityConcerns.map((concern) => concern.concern),
        ]),
      })),
    },

    procedure: {
      knownEvents: intelligence.normalizedIntake.events.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        relatedEvidenceIds: event.evidenceIds,
      })),
      knownDeadlines: [],
    },

    claims: {
      claimCandidates: intelligence.claimClassifications.map((claim) => ({
        id: claim.id,
        domain: asDomain(claim.claimType),
        title: claim.claimType,
        status: getClaimStatus(claim.status),
        explanation: claim.explanation,
        score: claim.score,
        confidence: claim.confidence,
        supportingEvidenceIds: uniqueStrings(
          claim.requiredElements.flatMap(
            (element) => element.supportingEvidenceIds,
          ),
        ),
        missingFacts: uniqueStrings(
          claim.requiredElements.flatMap((element) => element.missingFacts),
        ),
        risks: uniqueStrings(
          claim.requiredElements.flatMap((element) => element.risks),
        ),
        suppressionReason: getClaimSuppressionReason(claim),
      })),
    },

    damages: {
      requestedAmounts: intelligence.normalizedIntake.moneyAmounts.map((amount) => ({
        id: amount.id,
        label: amount.label,
        amount: amount.amount,
        currency: amount.currency,
        rawText: amount.rawText,
      })),
      requestedRemedies: intelligence.normalizedIntake.desiredOutcomes.map(
        (outcome) => ({
          id: outcome.id,
          remedyCategory: mapRemedyCategory(outcome.type),
          label: outcome.description,
        }),
      ),
      linkedEvidenceIds: intelligence.normalizedIntake.evidence.map(
        (item) => item.id,
      ),
      linkedTimelineEventIds: intelligence.normalizedIntake.events.map(
        (event) => event.id,
      ),
    },

    forms: {
      requiredLabels: formLabels,
      recommendedLabels: [],
      completedLabels: [],
      missingFormInformation: intelligence.missingInformation
        .filter((item) => item.requiredFor === "forms")
        .map((item) => item.question),
      formWarnings: intelligence.formRecommendations.flatMap(
        (form) => form.warnings,
      ),
    },

    knowledgeWarnings: intelligence.legalKnowledge.sourceWarnings,
  });

  const recommendedNextRoute = getRecommendedRoute({
    intelligence,
    assembly: assemblyOutput.assembly,
    existingRoute: args.recommendedNextRoute,
  });

  const masterCase = buildMasterCaseFromIntelligence({
    intelligence,
    existingCase: args.existingCase,
    recommendedNextRoute,
  });

  return {
    version: "1.2.0",
    masterCase,
    assembly: assemblyOutput.assembly,
    recommendedNextRoute,
    warnings: buildBridgeWarnings({
      intelligence,
      assemblyWarnings: assemblyOutput.warnings,
      masterCase,
      courtPath,
      province,
      stage,
      legalDomains,
    }),
  };
}