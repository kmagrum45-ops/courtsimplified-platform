import type {
  FamilyCaseType,
  ParentingIssueType,
  PropertyIssueType,
  SafetyConcernType,
  SupportIssueType,
} from "./types/family-case.ts";

import type { FamilyNormalizedIntake } from "./familyAiIntakeNormalizer";
import type { FamilyStrategyResult } from "./familyStrategyEngine";
import type { FamilyWorkflowResult } from "./familyWorkflowEngine";
import type { FamilyFormRoutingResult } from "./familyFormRoutingEngine";
import type { FamilyEvidenceEngineResult } from "./familyEvidenceEngine";

export type FamilyNarrativeTone =
  | "court-ready"
  | "plain-language"
  | "urgent"
  | "conference"
  | "affidavit";

export type FamilyNarrativeInput = {
  normalized: FamilyNormalizedIntake;
  strategy: FamilyStrategyResult;
  workflow: FamilyWorkflowResult;
  formRouting: FamilyFormRoutingResult;
  evidence: FamilyEvidenceEngineResult;
  rawFacts?: string;
  rawTimeline?: string;
  rawGoal?: string;
  rawUrgent?: string;
  tone?: FamilyNarrativeTone;
};

export type FamilyNarrativeSectionType =
  | "overview"
  | "procedural-history"
  | "children"
  | "parenting"
  | "best-interests"
  | "safety"
  | "support-disclosure"
  | "property"
  | "evidence-summary"
  | "requested-orders"
  | "conference-position"
  | "affidavit-paragraphs"
  | "weaknesses"
  | "next-steps";

export type FamilyNarrativeSource =
  | "user-facts"
  | "engine-analysis"
  | "strategy"
  | "evidence"
  | "workflow"
  | "form-routing";

export type FamilyNarrativeIssueLink =
  | FamilyCaseType
  | ParentingIssueType
  | SupportIssueType
  | SafetyConcernType
  | PropertyIssueType
  | "procedure"
  | "evidence"
  | "credibility";

export type FamilyNarrativeParagraph = {
  id: string;
  section: FamilyNarrativeSectionType;
  text: string;
  source: FamilyNarrativeSource;
  supportLevel: "supported" | "partially-supported" | "unsupported" | "needs-review";
  linkedIssues: FamilyNarrativeIssueLink[];
  evidenceReferences: string[];
  warnings: string[];
};

export type FamilyNarrativeSection = {
  type: FamilyNarrativeSectionType;
  title: string;
  purpose: string;
  paragraphs: FamilyNarrativeParagraph[];
  draftingNotes: string[];
};

export type FamilyNarrativeRisk = {
  issue: string;
  originalConcern: string;
  saferWording: string;
  whyItMatters: string;
  severity: "high" | "medium" | "low";
};

export type FamilyNarrativeResult = {
  sections: FamilyNarrativeSection[];
  affidavitParagraphs: FamilyNarrativeParagraph[];
  conferenceSummary: string[];
  requestedOrderDrafts: string[];
  saferWordingSuggestions: FamilyNarrativeRisk[];
  unsupportedAllegations: string[];
  evidenceLinkingNotes: string[];
  judgeReadySummary: string;
  draftingWarnings: string[];
  nextDraftingActions: string[];
};

function clean(value: unknown): string {
  return String(value || "").trim();
}

function normalize(value: unknown): string {
  return clean(value)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function cleanList<T extends string>(items: Array<T | string | null | undefined | false>): T[] {
  return Array.from(
    new Set(
      items
        .map((item) => clean(item) as T)
        .filter((item) => item.length > 0),
    ),
  );
}

function includesAny(text: string, terms: string[]): boolean {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function splitSentences(text: string): string[] {
  return cleanList(
    clean(text)
      .split(/(?<=[.!?])\s+|\n+/g)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 0),
  );
}

function paragraphId(section: FamilyNarrativeSectionType, index: number): string {
  return `${section}_${index + 1}`;
}

function issueLabels(input: FamilyNarrativeInput): string[] {
  return cleanList([
    ...input.workflow.detectedCaseTypes,
    ...input.workflow.parentingIssues,
    ...input.workflow.supportIssues,
    ...input.workflow.safetyIssues,
    ...input.workflow.propertyIssues,
  ]);
}

function evidenceTitles(input: FamilyNarrativeInput): string[] {
  return cleanList(input.evidence.strongestEvidence.map((item) => item.title));
}

function supportLevelForText(
  text: string,
  input: FamilyNarrativeInput,
): FamilyNarrativeParagraph["supportLevel"] {
  const normalizedText = normalize(text);

  const hasEvidenceMatch = input.evidence.analyzedEvidence.some((item) => {
    const evidenceText = normalize(
      `${item.title} ${item.description} ${item.relevance} ${item.category}`,
    );

    if (!evidenceText) return false;

    return evidenceText
      .split(" ")
      .some((word) => word.length > 5 && normalizedText.includes(word));
  });

  if (hasEvidenceMatch) return "supported";
  if (includesAny(normalizedText, ["i think", "maybe", "probably", "i believe", "not sure", "heard"])) {
    return "needs-review";
  }
  if (input.evidence.analyzedEvidence.length > 0) return "partially-supported";
  return "unsupported";
}

function warningsForText(text: string): string[] {
  const warnings: string[] = [];
  const normalizedText = normalize(text);

  if (includesAny(normalizedText, ["crazy", "evil", "narcissist", "liar", "deadbeat", "bad mother", "bad father"])) {
    warnings.push("Replace labels or insults with specific facts, dates, conduct, and evidence.");
  }

  if (includesAny(normalizedText, ["always", "never", "every time", "constantly"])) {
    warnings.push("Absolute wording may be challenged unless examples and dates are provided.");
  }

  if (includesAny(normalizedText, ["i think", "maybe", "probably", "not sure", "heard from"])) {
    warnings.push("Uncertain or second-hand wording should be clarified before filing.");
  }

  if (text.length > 700) {
    warnings.push("This paragraph may be too long and should be broken into smaller dated facts.");
  }

  return cleanList(warnings);
}

function makeParagraph(params: {
  section: FamilyNarrativeSectionType;
  index: number;
  text: string;
  source: FamilyNarrativeSource;
  input: FamilyNarrativeInput;
  linkedIssues?: FamilyNarrativeIssueLink[];
  evidenceReferences?: string[];
}): FamilyNarrativeParagraph {
  return {
    id: paragraphId(params.section, params.index),
    section: params.section,
    text: clean(params.text),
    source: params.source,
    supportLevel: supportLevelForText(params.text, params.input),
    linkedIssues: params.linkedIssues || [],
    evidenceReferences: cleanList(params.evidenceReferences || []),
    warnings: warningsForText(params.text),
  };
}

function makeSection(params: {
  type: FamilyNarrativeSectionType;
  title: string;
  purpose: string;
  paragraphs: FamilyNarrativeParagraph[];
  draftingNotes?: string[];
}): FamilyNarrativeSection {
  return {
    type: params.type,
    title: params.title,
    purpose: params.purpose,
    paragraphs: params.paragraphs.filter((paragraph) => paragraph.text.length > 0),
    draftingNotes: cleanList(params.draftingNotes || []),
  };
}

function saferWordingRisks(input: FamilyNarrativeInput): FamilyNarrativeRisk[] {
  const risks: FamilyNarrativeRisk[] = [];
  const raw = clean(`${input.rawFacts || ""}\n${input.rawTimeline || ""}\n${input.rawUrgent || ""}`);
  const normalizedRaw = normalize(raw);

  if (includesAny(normalizedRaw, ["crazy", "evil", "narcissist", "liar", "deadbeat", "bad mother", "bad father"])) {
    risks.push({
      issue: "Emotionally charged wording",
      originalConcern: "The intake appears to use labels or character attacks.",
      saferWording: "Describe the specific conduct, date, evidence, and impact on the child or requested order.",
      whyItMatters: "Court materials are stronger when they are factual, specific, and tied to evidence rather than labels.",
      severity: "high",
    });
  }

  if (includesAny(normalizedRaw, ["always", "never", "constantly", "every time"])) {
    risks.push({
      issue: "Absolute wording",
      originalConcern: "The intake appears to use broad absolute statements.",
      saferWording: "Use examples with dates, frequency, and supporting records instead of absolute wording.",
      whyItMatters: "Absolute statements are easy to attack if even one exception exists.",
      severity: "medium",
    });
  }

  if (includesAny(normalizedRaw, ["i think", "maybe", "probably", "not sure", "heard from"])) {
    risks.push({
      issue: "Uncertain or second-hand facts",
      originalConcern: "Some facts appear uncertain or based on what someone else said.",
      saferWording: "Clarify whether the fact is personally known, supported by a document, or should be described as information received.",
      whyItMatters: "Affidavit evidence should distinguish personal knowledge from belief or second-hand information.",
      severity: "medium",
    });
  }

  return risks;
}

function buildOverviewSection(input: FamilyNarrativeInput): FamilyNarrativeSection {
  const issues = issueLabels(input);
  const paragraphs: FamilyNarrativeParagraph[] = [];

  paragraphs.push(
    makeParagraph({
      section: "overview",
      index: 0,
      source: "engine-analysis",
      input,
      text:
        issues.length > 0
          ? `This family matter currently involves ${issues.join(", ")}. The primary workflow priority is ${input.workflow.primaryPriority}.`
          : "This family matter requires further clarification before the court issues can be safely summarized.",
      linkedIssues: input.workflow.detectedCaseTypes,
    }),
  );

  paragraphs.push(
    makeParagraph({
      section: "overview",
      index: 1,
      source: "workflow",
      input,
      text: input.workflow.summary,
      linkedIssues: input.workflow.detectedCaseTypes,
    }),
  );

  return makeSection({
    type: "overview",
    title: "Overview",
    purpose: "Summarize the matter without overarguing or adding unsupported facts.",
    paragraphs,
    draftingNotes: [
      "Keep the overview short.",
      "Do not include every fact here; save details for dated sections.",
    ],
  });
}

function buildProceduralSection(input: FamilyNarrativeInput): FamilyNarrativeSection {
  const p = input.normalized.procedural;
  const paragraphs: FamilyNarrativeParagraph[] = [];

  paragraphs.push(
    makeParagraph({
      section: "procedural-history",
      index: 0,
      source: "workflow",
      input,
      text: `The detected procedural stage is ${input.normalized.stage}.`,
      linkedIssues: ["procedure"],
    }),
  );

  if (p.hasExistingCourtFile || p.hasExistingOrder) {
    paragraphs.push(
      makeParagraph({
        section: "procedural-history",
        index: 1,
        source: "engine-analysis",
        input,
        text: "The file appears to involve an existing court file, order, agreement, or prior court step. Any existing order should be uploaded and summarized before final drafting.",
        linkedIssues: ["procedure"],
      }),
    );
  }

  if (p.isResponding) {
    paragraphs.push(
      makeParagraph({
        section: "procedural-history",
        index: 2,
        source: "workflow",
        input,
        text: "The user appears to be responding to an application. The response should address what is admitted, what is denied, and what orders the responding party asks the court to make.",
        linkedIssues: ["procedure"],
      }),
    );
  }

  return makeSection({
    type: "procedural-history",
    title: "Procedural History",
    purpose: "Explain where the case is in the court process and what document path applies.",
    paragraphs,
    draftingNotes: ["Confirm filed/received forms before generating final documents."],
  });
}

function buildParentingSection(input: FamilyNarrativeInput): FamilyNarrativeSection {
  const paragraphs: FamilyNarrativeParagraph[] = [];

  if (input.workflow.parentingIssues.length === 0) {
    return makeSection({
      type: "parenting",
      title: "Parenting Issues",
      purpose: "No parenting section is generated unless parenting issues are detected.",
      paragraphs: [],
    });
  }

  paragraphs.push(
    makeParagraph({
      section: "parenting",
      index: 0,
      source: "engine-analysis",
      input,
      text: `The parenting issues detected include ${input.workflow.parentingIssues.join(", ")}. The parenting narrative should focus on the child's routine, stability, caregiving history, school/daycare, exchanges, and the proposed schedule.`,
      linkedIssues: input.workflow.parentingIssues,
      evidenceReferences: evidenceTitles(input),
    }),
  );

  for (const sentence of splitSentences(input.rawFacts || "").slice(0, 6)) {
    if (includesAny(sentence, ["parenting", "child", "children", "custody", "access", "schedule", "school", "daycare", "pickup", "drop off", "decision"])) {
      paragraphs.push(
        makeParagraph({
          section: "parenting",
          index: paragraphs.length,
          source: "user-facts",
          input,
          text: sentence,
          linkedIssues: input.workflow.parentingIssues,
        }),
      );
    }
  }

  return makeSection({
    type: "parenting",
    title: "Parenting Facts",
    purpose: "Organize parenting facts around the child's best interests and requested parenting order.",
    paragraphs,
    draftingNotes: [
      "Separate decision-making from parenting-time schedule.",
      "Use child-focused language instead of adult-conflict language.",    ],
  });
}

function buildBestInterestsSection(input: FamilyNarrativeInput): FamilyNarrativeSection {
  const paragraphs: FamilyNarrativeParagraph[] = [];

  if (input.workflow.parentingIssues.length === 0) {
    return makeSection({
      type: "best-interests",
      title: "Best Interests Analysis",
      purpose: "Best-interests analysis is only generated when parenting issues are detected.",
      paragraphs: [],
    });
  }

  const bestInterests = cleanList([
    ...input.strategy.bestInterestsFactors,
    ...input.workflow.judgeFocus.filter((item) => includesAny(item, ["child", "schedule", "parent", "stability", "relationship"])),
  ]);

  bestInterests.forEach((item, index) => {
    paragraphs.push(
      makeParagraph({
        section: "best-interests",
        index,
        source: "strategy",
        input,
        text: item,
        linkedIssues: input.workflow.parentingIssues,
        evidenceReferences: evidenceTitles(input),
      }),
    );
  });

  return makeSection({
    type: "best-interests",
    title: "Best Interests of the Child",
    purpose: "Frame the parenting request around child-focused factors, not adult conflict alone.",
    paragraphs,
    draftingNotes: [
      "Every parenting request should connect to stability, safety, routine, caregiving, communication, or the child's needs.",
    ],
  });
}

function buildSafetySection(input: FamilyNarrativeInput): FamilyNarrativeSection {
  const paragraphs: FamilyNarrativeParagraph[] = [];

  if (input.workflow.safetyIssues.length === 0 && input.normalized.risks.urgencyFlags.length === 0) {
    return makeSection({
      type: "safety",
      title: "Safety and Urgency",
      purpose: "Safety section is only generated when safety or urgency is detected.",
      paragraphs: [],
    });
  }

  cleanList([
    ...input.strategy.safetyFlags,
    ...input.workflow.proceduralWarnings.filter((item) => includesAny(item, ["safety", "urgent", "risk", "protect"])),
    ...input.normalized.risks.urgencyFlags,
  ]).forEach((item, index) => {
    paragraphs.push(
      makeParagraph({
        section: "safety",
        index,
        source: "strategy",
        input,
        text: item,
        linkedIssues: input.workflow.safetyIssues,
        evidenceReferences: evidenceTitles(input),
      }),
    );
  });

  for (const sentence of splitSentences(`${input.rawUrgent || ""}\n${input.rawFacts || ""}`).slice(0, 8)) {
    if (includesAny(sentence, ["unsafe", "fear", "threat", "police", "violence", "abuse", "harass", "stalk", "urgent", "danger"])) {
      paragraphs.push(
        makeParagraph({
          section: "safety",
          index: paragraphs.length,
          source: "user-facts",
          input,
          text: sentence,
          linkedIssues: input.workflow.safetyIssues,
        }),
      );
    }
  }

  return makeSection({
    type: "safety",
    title: "Safety and Urgency",
    purpose: "Convert safety concerns into specific incidents, evidence, urgency, and requested protective terms.",
    paragraphs,
    draftingNotes: [
      "Use dates and specific incidents.",
      "Do not mix general relationship conflict with urgent safety facts.",
    ],
  });
}

function buildSupportSection(input: FamilyNarrativeInput): FamilyNarrativeSection {
  const paragraphs: FamilyNarrativeParagraph[] = [];

  if (input.workflow.supportIssues.length === 0) {
    return makeSection({
      type: "support-disclosure",
      title: "Support and Disclosure",
      purpose: "Support section is only generated when support or disclosure issues are detected.",
      paragraphs: [],
    });
  }

  cleanList([
    ...input.strategy.supportFinancialIssues,
    ...input.workflow.evidenceNeededNow.filter((item) => includesAny(item, ["tax", "income", "pay", "support", "expense", "financial", "disclosure"])),
  ]).forEach((item, index) => {
    paragraphs.push(
      makeParagraph({
        section: "support-disclosure",
        index,
        source: "strategy",
        input,
        text: item,
        linkedIssues: input.workflow.supportIssues,
      }),
    );
  });

  return makeSection({
    type: "support-disclosure",
    title: "Support and Financial Disclosure",
    purpose: "Organize child support, spousal support, income, expenses, arrears, and disclosure issues.",
    paragraphs,
    draftingNotes: ["Support facts should be tied to income documents and expense proof."],
  });
}

function buildPropertySection(input: FamilyNarrativeInput): FamilyNarrativeSection {
  const paragraphs: FamilyNarrativeParagraph[] = [];

  if (input.workflow.propertyIssues.length === 0) {
    return makeSection({
      type: "property",
      title: "Property Issues",
      purpose: "Property section is only generated when property issues are detected.",
      paragraphs: [],
    });
  }

  cleanList([
    ...input.workflow.evidenceNeededNow.filter((item) => includesAny(item, ["property", "home", "mortgage", "asset", "debt", "pension", "valuation"])),
    ...input.workflow.judgeFocus.filter((item) => includesAny(item, ["property", "debt", "asset", "disclosure"])),
  ]).forEach((item, index) => {
    paragraphs.push(
      makeParagraph({
        section: "property",
        index,
        source: "workflow",
        input,
        text: item,
        linkedIssues: input.workflow.propertyIssues,
      }),
    );
  });

  return makeSection({
    type: "property",
    title: "Property, Debts, and Equalization",
    purpose: "Separate property/equalization facts from parenting and support facts.",
    paragraphs,
    draftingNotes: ["Property claims require structured financial disclosure and asset/debt evidence."],
  });
}

function buildEvidenceSummarySection(input: FamilyNarrativeInput): FamilyNarrativeSection {
  const paragraphs: FamilyNarrativeParagraph[] = [];

  input.evidence.strongestEvidence.slice(0, 10).forEach((item, index) => {
    paragraphs.push(
      makeParagraph({
        section: "evidence-summary",
        index,
        source: "evidence",
        input,
        text: `${item.title} is categorized as ${item.category}. It may be used for: ${item.affidavitUse.join(" ")}`,
        linkedIssues: item.linkedIssues as FamilyNarrativeIssueLink[],
        evidenceReferences: [item.title],
      }),
    );
  });

  return makeSection({
    type: "evidence-summary",
    title: "Evidence Summary",
    purpose: "Identify the strongest evidence and how it should support the narrative.",
    paragraphs,
    draftingNotes: [
      "Do not attach every document automatically.",
      "Use the strongest evidence first and explain relevance clearly.",
    ],
  });
}

function buildRequestedOrders(input: FamilyNarrativeInput): string[] {
  const orders: string[] = [];

  if (input.workflow.parentingIssues.length > 0) {
    orders.push("A parenting order setting out decision-making responsibility, parenting time, exchange details, and any communication terms required for the child's best interests.");
  }

  if (input.workflow.supportIssues.length > 0) {
    orders.push("An order addressing child support, spousal support if claimed, financial disclosure, arrears, or section 7 expenses as applicable.");
  }

  if (input.workflow.safetyIssues.length > 0) {
    orders.push("Temporary or protective terms addressing safety, contact, supervision, or communication if supported by specific evidence.");
  }

  if (input.workflow.propertyIssues.length > 0) {
    orders.push("Property, disclosure, preservation, sale, equalization, or matrimonial-home terms as applicable.");
  }

  if (input.rawGoal) {
    orders.push(`User-stated goal to review and convert into precise order terms: ${clean(input.rawGoal)}`);
  }

  return cleanList(orders);
}

function buildRequestedOrdersSection(input: FamilyNarrativeInput): FamilyNarrativeSection {
  const orders = buildRequestedOrders(input);
  const paragraphs = orders.map((order, index) =>
    makeParagraph({
      section: "requested-orders",
      index,
      source: "workflow",
      input,
      text: order,
      linkedIssues: input.workflow.detectedCaseTypes,
    }),
  );

  return makeSection({
    type: "requested-orders",
    title: "Requested Orders",
    purpose: "Convert the user's goal into precise court-order categories.",
    paragraphs,
    draftingNotes: ["Final order wording must be specific enough to be enforceable."],
  });
}

function buildConferenceSummary(input: FamilyNarrativeInput): string[] {
  return cleanList([
    `Primary workflow priority: ${input.workflow.primaryPriority}.`,
    input.workflow.detectedCaseTypes.length > 0
      ? `Issues: ${input.workflow.detectedCaseTypes.join(", ")}.`
      : "Issues still need clarification.",
    input.workflow.blockersBeforeForms.length > 0
      ? `Items to fix before final documents: ${input.workflow.blockersBeforeForms.slice(0, 5).join("; ")}.`
      : "No major workflow blockers detected.",
    input.evidence.evidenceGaps.length > 0
      ? `Evidence gaps: ${input.evidence.evidenceGaps.map((gap) => gap.issue).join(", ")}.`
      : "No major evidence gaps detected from the current evidence list.",
  ]);
}

export function runFamilyAffidavitNarrativeEngine(input: FamilyNarrativeInput): FamilyNarrativeResult {
  const sections = [
    buildOverviewSection(input),
    buildProceduralSection(input),
    buildParentingSection(input),
    buildBestInterestsSection(input),
    buildSafetySection(input),
    buildSupportSection(input),
    buildPropertySection(input),
    buildEvidenceSummarySection(input),
    buildRequestedOrdersSection(input),
  ].filter((section) => section.paragraphs.length > 0);

  const affidavitParagraphs = sections.flatMap((section) => section.paragraphs);
  const saferWordingSuggestions = saferWordingRisks(input);
  const unsupportedAllegations = cleanList(
    affidavitParagraphs
      .filter((paragraph) => paragraph.supportLevel === "unsupported" || paragraph.supportLevel === "needs-review")
      .map((paragraph) => paragraph.text),
  );

  const evidenceLinkingNotes = cleanList([
    ...input.evidence.affidavitSupportPoints,
    ...input.evidence.judgeEvidenceConcerns,
    ...affidavitParagraphs
      .filter((paragraph) => paragraph.evidenceReferences.length === 0 && paragraph.supportLevel !== "supported")
      .map((paragraph) => `Review evidence support for paragraph: ${paragraph.text}`),
  ]);

  const draftingWarnings = cleanList([
    ...input.strategy.credibilityRisks,
    ...input.strategy.suggestedWordingImprovements,
    ...input.evidence.contradictionWarnings,
    ...saferWordingSuggestions.map((risk) => `${risk.issue}: ${risk.whyItMatters}`),
    ...affidavitParagraphs.flatMap((paragraph) => paragraph.warnings),
  ]);

  const nextDraftingActions = cleanList([
    "Review unsupported allegations before finalizing any affidavit or brief.",
    "Attach or link evidence to each important factual paragraph.",
    "Convert broad goals into precise requested order terms.",
    "Use dated facts instead of emotional labels.",
    ...input.workflow.nextBestActions,
    ...input.formRouting.blockersBeforeGeneration,
  ]);

  const judgeReadySummary = cleanList([
    `This matter is currently routed as ${input.workflow.primaryPriority}.`,
    input.workflow.detectedCaseTypes.length > 0
      ? `The detected issue set includes ${input.workflow.detectedCaseTypes.join(", ")}.`
      : "The issue set requires further clarification.",
    input.evidence.strongestEvidence.length > 0
      ? `The strongest current evidence includes ${input.evidence.strongestEvidence.map((item) => item.title).slice(0, 5).join(", ")}.`
      : "The evidence record still needs stronger supporting documents.",
    unsupportedAllegations.length > 0
      ? "Some allegations need evidence support or safer wording before filing."
      : "The current narrative has no major unsupported allegation flags from this engine pass.",
  ]).join(" ");

  return {
    sections,
    affidavitParagraphs,
    conferenceSummary: buildConferenceSummary(input),
    requestedOrderDrafts: buildRequestedOrders(input),
    saferWordingSuggestions,
    unsupportedAllegations,
    evidenceLinkingNotes,
    judgeReadySummary,
    draftingWarnings,
    nextDraftingActions,
  };
}
