import { familyFormLabel } from "./family/familyFormsRegistry";
import type {
  FamilyCaseType,
  ParentingIssueType,
  SafetyConcernType,
  SupportIssueType,
} from "./types/family-case.ts";

export type FamilyStrategyInput = {
  caseStage?: string;
  issues?: string[];
  filedDocuments?: string[];

  yourName?: string;
  otherParty?: string;

  childrenInfo?: string;
  currentLivingSituation?: string;
  pastLivingHistory?: string;
  facts?: string;
  timeline?: string;
  evidence?: string;
  missingEvidence?: string;
  goal?: string;
  urgent?: string;
  safetyConcerns?: string;
  propertyHomeDetails?: string;
  upcomingCourtDate?: string;

  financialDisclosure?: string;
  parentingSchedule?: string;
  communicationHistory?: string;
  policeInvolvement?: string;
  childProtectionInvolvement?: string;
  schoolIssues?: string;
  medicalIssues?: string;
  relocationDetails?: string;
  existingOrders?: string;
  settlementHistory?: string;
};

export type FamilyStrategyResult = {
  detectedFamilyIssues: string[];
  detectedClaimTypes: FamilyCaseType[];
  detectedParentingIssues: ParentingIssueType[];
  detectedSupportIssues: SupportIssueType[];
  detectedSafetyIssues: SafetyConcernType[];

  bestInterestsFactors: string[];
  /**
   * Parenting details the intake has recorded, and details it has not.
   *
   * These were `parentingStrengths` / `parentingWeaknesses`. The names were the
   * whole defect: the content was already factual and always had been —
   * "Children's information has been partially provided", "A clear timeline has
   * not been organized yet". Statements about what the record contains, never
   * about the merits of anyone's parenting. Renamed into the same
   * recorded-vs-not shape used by `completeEvidence` / `incompleteEvidence` and
   * `missingDetails`, so the names stop inviting merit content into them.
   *
   * NOT the same thing as the Small Claims `strategy.{strengths, weaknesses}`,
   * which share the old names and nothing else: those are built in
   * courtSimplifiedBrain from claim classifications, fact-pattern strength and
   * evidence strength, and are genuine merit assessments. That pair is still
   * open — see OUTSTANDING_ISSUES.md.
   */
  parentingDetailsRecorded: string[];
  parentingDetailsNotYetRecorded: string[];
  missingParentingInfo: string[];

  safetyFlags: string[];
  supportFinancialIssues: string[];


  recommendedEvidence: string[];
  recommendedNextSteps: string[];
  suggestedWordingImprovements: string[];

  proceduralWarnings: string[];
  settlementStrategy: string[];
  evidenceGaps: string[];
  urgentActionFlags: string[];

  recommendedForms: string[];
  summary: string;
};

/**
 * The best-interests factors, quoted from the statute.
 *
 * SOURCE. Children's Law Reform Act, R.S.O. 1990, c. C.12, s. 24, retrieved
 * 2026-09-13 via `ontario.ca/laws/docs/90c12_e.doc` (consolidation from
 * 2025-12-11) and vendored verbatim at docs/sources/clra-cited-sections.txt.
 *
 * This is legal INFORMATION: it states what the section says, generally. It
 * does not apply any factor to a particular family, and nothing downstream may.
 *
 * WHY IT IS A LIST OF QUOTES RATHER THAN A SUMMARY. The sentence that stood
 * here was written from memory, and comparing it to s. 24 (3) showed the drift
 * a paraphrase invites: it named "routine" and "education" as things the court
 * focuses on, and neither is in the section. Quoting removes the failure mode.
 */
export const CLRA_BEST_INTERESTS_SOURCE_URL = "https://www.ontario.ca/laws/docs/90c12_e.doc";
export const CLRA_BEST_INTERESTS_CITATION =
  "Children's Law Reform Act, R.S.O. 1990, c. C.12, s. 24";
export const CLRA_BEST_INTERESTS_VERIFIED_AT = "2026-09-13";

export const CLRA_BEST_INTERESTS_FACTORS: string[] = [
  "Children's Law Reform Act s. 24 (1): in making a parenting order or contact order with respect to a child, \"the court shall only take into account the best interests of the child in accordance with this section\".",
  "s. 24 (2): the court \"shall consider all factors related to the circumstances of the child, and, in doing so, shall give primary consideration to the child's physical, emotional and psychological safety, security and well-being\".",
  "s. 24 (3) (a): \"the child's needs, given the child's age and stage of development, such as the child's need for stability\".",
  "s. 24 (3) (b): \"the nature and strength of the child's relationship with each parent, each of the child's siblings and grandparents and any other person who plays an important role in the child's life\".",
  "s. 24 (3) (c): \"each parent's willingness to support the development and maintenance of the child's relationship with the other parent\".",
  "s. 24 (3) (d): \"the history of care of the child\".",
  "s. 24 (3) (e): \"the child's views and preferences, giving due weight to the child's age and maturity, unless they cannot be ascertained\".",
  "s. 24 (3) (f): \"the child's cultural, linguistic, religious and spiritual upbringing and heritage, including Indigenous upbringing and heritage\".",
  "s. 24 (3) (g): \"any plans for the child's care\".",
  "s. 24 (3) (h): \"the ability and willingness of each person in respect of whom the order would apply to care for and meet the needs of the child\".",
  "s. 24 (3) (i): \"the ability and willingness of each person in respect of whom the order would apply to communicate and co-operate, in particular with one another, on matters affecting the child\".",
  "s. 24 (3) (j): \"any family violence and its impact\", including on a person's ability and willingness to care for the child and on whether an order requiring co-operation is appropriate. s. 24 (4) sets out what the court takes into account in considering that impact.",
  "s. 24 (3) (k): \"any civil or criminal proceeding, order, condition or measure that is relevant to the safety, security and well-being of the child\".",
];

function cleanList(items: Array<string | null | undefined | false>): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => String(item || "").trim())
        .filter((item) => item.length > 0),
    ),
  );
}

function normalize(value?: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, terms: string[]): boolean {
  const normalizedText = normalize(text);
  return terms.some((term) => normalizedText.includes(normalize(term)));
}

function hasText(value?: string): boolean {
  return normalize(value).length > 8;
}

function pushIf(list: string[], condition: boolean, value: string): void {
  if (condition) {
    list.push(value);
  }
}

export function analyzeFamilyStrategy(
  input: FamilyStrategyInput,
): FamilyStrategyResult {
  const selectedIssues = input.issues ?? [];

  const combinedText = normalize(
    [
      input.caseStage,
      selectedIssues.join(" "),
      input.filedDocuments?.join(" "),
      input.childrenInfo,
      input.currentLivingSituation,
      input.pastLivingHistory,
      input.facts,
      input.timeline,
      input.evidence,
      input.missingEvidence,
      input.goal,
      input.urgent,
      input.safetyConcerns,
      input.propertyHomeDetails,
      input.upcomingCourtDate,
      input.financialDisclosure,
      input.parentingSchedule,
      input.communicationHistory,
      input.policeInvolvement,
      input.childProtectionInvolvement,
      input.schoolIssues,
      input.medicalIssues,
      input.relocationDetails,
      input.existingOrders,
      input.settlementHistory,
    ].join(" "),
  );

  const detectedFamilyIssues: string[] = [];
  const detectedClaimTypes: FamilyCaseType[] = [];
  const detectedParentingIssues: ParentingIssueType[] = [];
  const detectedSupportIssues: SupportIssueType[] = [];
  const detectedSafetyIssues: SafetyConcernType[] = [];

  const bestInterestsFactors: string[] = [];
  const parentingDetailsRecorded: string[] = [];
  const parentingDetailsNotYetRecorded: string[] = [];
  const missingParentingInfo: string[] = [];

  const safetyFlags: string[] = [];
  const supportFinancialIssues: string[] = [];


  const recommendedEvidence: string[] = [];
  const recommendedNextSteps: string[] = [];
  const suggestedWordingImprovements: string[] = [];

  const proceduralWarnings: string[] = [];
  const settlementStrategy: string[] = [];
  const evidenceGaps: string[] = [];
  const urgentActionFlags: string[] = [];

  const recommendedForms: string[] = [];

  const parentingIssue: boolean =
    includesAny(combinedText, [
      "parenting",
      "custody",
      "access",
      "decision-making",
      "decision making",
      "parenting time",
      "schedule",
      "child lives",
      "children live",
      "withholding",
      "pick up",
      "drop off",
    ]) ||
    selectedIssues.includes("decision-making-responsibility") ||
    selectedIssues.includes("parenting-time");

  const supportIssue: boolean =
    includesAny(combinedText, [
      "child support",
      "spousal support",
      "income",
      "pay stub",
      "tax return",
      "notice of assessment",
      "financial disclosure",
      "section 7",
      "special expense",
    ]) ||
    selectedIssues.includes("child-support") ||
    selectedIssues.includes("spousal-support");

  const safetyIssue: boolean =
    includesAny(combinedText, [
      "violence",
      "abuse",
      "fear",
      "unsafe",
      "threat",
      "police",
      "harassment",
      "restraining",
      "supervised",
      "protection",
    ]) || selectedIssues.includes("restraining-order");

  const relocationIssue: boolean = includesAny(combinedText, [
    "move",
    "moving",
    "relocation",
    "different city",
    "different province",
    "school change",
  ]);

  const propertyIssue: boolean = includesAny(combinedText, [
    "matrimonial home",
    "house",
    "equity",
    "equalization",
    "property division",
    "mortgage",
    "debt",
  ]);

  if (parentingIssue) {
    detectedFamilyIssues.push(
      "Decision-making responsibility and parenting time issues detected.",
    );

    detectedClaimTypes.push(
      "decision-making-responsibility",
      "parenting-time",
    );

    detectedParentingIssues.push(
      "decision-making",
      "parenting-schedule",
    );

    // Sourced to CLRA s. 24, retrieved 2026-09-13 and vendored at
    // docs/sources/clra-cited-sections.txt.
    //
    // The sentence this replaces was an unsourced paraphrase, and checking it
    // against the section showed the paraphrase had drifted: it listed
    // "routine" and "education", neither of which appears in s. 24 (3). The
    // factors below are the statute's own words, in the statute's own order.
    bestInterestsFactors.push(...CLRA_BEST_INTERESTS_FACTORS);

    recommendedEvidence.push(
      "Parenting schedules, school records, daycare records, calendars, messages, missed exchanges, and caregiving history.",
    );

    recommendedForms.push(
      familyFormLabel("8"),
      familyFormLabel("35.1"),
    );
  }

  if (supportIssue) {
    detectedFamilyIssues.push("Support and financial disclosure issues detected.");

    detectedClaimTypes.push("child-support");
    detectedSupportIssues.push(
      "table-child-support",
      "financial-disclosure-missing",
    );

    supportFinancialIssues.push(
      "Income disclosure, tax returns, and support calculations are likely important.",
    );

    recommendedEvidence.push(
      "Tax returns, Notices of Assessment, pay stubs, bank records, childcare costs, and section 7 expense proof.",
    );

    recommendedForms.push(familyFormLabel("13"));
  }

  if (safetyIssue) {
    detectedFamilyIssues.push("Safety concerns or urgency detected.");

    detectedClaimTypes.push("restraining-order");
    detectedSafetyIssues.push(
      "family-violence",
      "harassment",
    );

    safetyFlags.push(
      "Safety allegations should be organized by incident, date, evidence, witnesses, and police involvement.",
    );

    recommendedEvidence.push(
      "Police occurrence numbers, screenshots, recordings if legally obtained, medical records if relevant, witness names, and prior orders.",
    );

    urgentActionFlags.push(
      "Urgent safety issues may require immediate legal attention or emergency court steps.",
    );

    recommendedForms.push(
      familyFormLabel("14"),
      familyFormLabel("14A"),
    );
  }

  if (relocationIssue) {
    detectedFamilyIssues.push("Possible relocation issue detected.");
    detectedClaimTypes.push("mobility-relocation");
    detectedParentingIssues.push("mobility-relocation");

    recommendedEvidence.push(
      "School information, transportation plans, housing plans, employment reasons, and support network information.",
    );
  }

  if (propertyIssue) {
    detectedFamilyIssues.push("Property or equalization issue detected.");
    detectedClaimTypes.push("property-division");

    recommendedEvidence.push(
      "Mortgage documents, property values, debts, account statements, and ownership records.",
    );

    recommendedForms.push(
      familyFormLabel("13.1"),
    );
  }

  pushIf(
    parentingDetailsRecorded,
    hasText(input.childrenInfo),
    "Children's information has been partially provided.",
  );

  pushIf(
    parentingDetailsRecorded,
    hasText(input.currentLivingSituation),
    "Current living arrangement has been described.",
  );

  pushIf(
    parentingDetailsNotYetRecorded,
    !hasText(input.timeline),
    "A clear timeline has not been organized yet.",
  );

  pushIf(
    parentingDetailsNotYetRecorded,
    !hasText(input.evidence),
    "Evidence has not been clearly organized yet.",
  );

  pushIf(
    missingParentingInfo,
    parentingIssue && !hasText(input.childrenInfo),
    "Children's ages, schools, schedules, and current residence are still needed.",
  );

  pushIf(
    missingParentingInfo,
    parentingIssue && !hasText(input.goal),
    "The exact parenting order being requested is still unclear.",
  );

  pushIf(
    evidenceGaps,
    !hasText(input.evidence),
    "Messages, calendars, records, and supporting documents still need to be organized.",
  );

  if (
    includesAny(combinedText, [
      "crazy",
      "evil",
      "narcissist",
      "always lies",
      "bad mother",
      "bad father",
    ])
  ) {
    // A credibilityRisks entry fired here too — "Emotionally charged wording
    // may reduce credibility if not tied to specific evidence." It predicted
    // how a reader would receive the user's material, and added nothing the
    // drafting suggestion below does not already carry. The guidance stays; the
    // prediction is gone, and with it the field, which had no other writer.
    suggestedWordingImprovements.push(
      "Replace emotional labels with dated incidents, messages, conduct, and child-focused impacts.",
    );
  }

  settlementStrategy.push(
    "Focus on child stability, practical scheduling, and evidence-backed proposals.",
    "Separate emotional conflict from the actual court orders being requested.",
    "Organize settlement offers around realistic parenting and financial outcomes.",
  );

  recommendedNextSteps.push(
    "Prepare a clear parenting proposal.",
    "Build a chronological timeline.",
    "Organize evidence by category and date.",
    "Separate parenting, safety, support, and property issues.",
    "Connect every requested order to evidence and child-focused reasoning.",
  );

  suggestedWordingImprovements.push(
    "Use calm, factual, child-focused language.",
    "Describe what happened, when it happened, how it affected the child, and what order is requested.",
    "Avoid exaggeration and focus on evidence-supported facts.",
  );

  proceduralWarnings.push(
    "Court forms, service rules, financial disclosure rules, and filing deadlines must be followed carefully.",
  );

  const summary = cleanList([
    parentingIssue ? "Parenting issues detected." : null,
    supportIssue ? "Support or disclosure issues detected." : null,
    safetyIssue ? "Safety concerns detected." : null,
    relocationIssue ? "Relocation concerns detected." : null,
    propertyIssue ? "Property or equalization concerns detected." : null,
  ]).join(" ");

  return {
    detectedFamilyIssues: cleanList(detectedFamilyIssues),
    detectedClaimTypes,
    detectedParentingIssues,
    detectedSupportIssues,
    detectedSafetyIssues,

    bestInterestsFactors: cleanList(bestInterestsFactors),
    parentingDetailsRecorded: cleanList(parentingDetailsRecorded),
    parentingDetailsNotYetRecorded: cleanList(parentingDetailsNotYetRecorded),
    missingParentingInfo: cleanList(missingParentingInfo),

    safetyFlags: cleanList(safetyFlags),
    supportFinancialIssues: cleanList(supportFinancialIssues),


    recommendedEvidence: cleanList(recommendedEvidence),
    recommendedNextSteps: cleanList(recommendedNextSteps),
    suggestedWordingImprovements: cleanList(suggestedWordingImprovements),

    proceduralWarnings: cleanList(proceduralWarnings),
    settlementStrategy: cleanList(settlementStrategy),
    evidenceGaps: cleanList(evidenceGaps),
    urgentActionFlags: cleanList(urgentActionFlags),

    recommendedForms: cleanList(recommendedForms),
    summary,
  };
}
