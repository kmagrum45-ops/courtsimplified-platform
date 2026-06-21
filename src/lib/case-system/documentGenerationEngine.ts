import type { CaseContext } from "./caseContextEngine";
import type { EvidenceItem } from "./evidenceEngine";
import {
  assembleCourtPackage,
  type CourtPackageType,
} from "./courtPackageAssemblyEngine";
import { buildTimelineFromEvidence } from "./timelineEngine";

export type GeneratedDocumentType =
  | "case-summary"
  | "chronology"
  | "evidence-summary"
  | "affidavit-outline"
  | "settlement-conference-brief"
  | "trial-preparation-outline"
  | "issue-proof-chart"
  | "general-litigation-package";

export type GeneratedDocumentSection = {
  id: string;
  heading: string;
  purpose: string;
  paragraphs: string[];
  bulletPoints: string[];
  linkedEvidenceIds: Array<string | number>;
  exhibitLabels: string[];
  warnings: string[];
};

export type GeneratedDocument = {
  id: string;
  documentType: GeneratedDocumentType;
  title: string;
  subtitle: string;
  generatedAt: string;
  readiness: "draft" | "needs-review" | "court-ready-review-required";
  sections: GeneratedDocumentSection[];
  warnings: string[];
  nextSteps: string[];
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function cleanList(items: string[]) {
  return Array.from(
    new Set(items.map((item) => clean(item)).filter(Boolean))
  );
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function evidenceId(item: EvidenceItem) {
  return (
    item.id ||
    item.label ||
    item.exhibitNumber ||
    item.title ||
    createId("evidence")
  );
}

function exhibitLabel(item: EvidenceItem) {
  return String(
    item.label ||
      item.exhibitNumber ||
      item.title ||
      "Unlabelled exhibit"
  );
}

function evidenceTitle(item: EvidenceItem) {
  return clean(item.title) || exhibitLabel(item);
}

function evidenceExplanation(item: EvidenceItem) {
  if (clean(item.relevance)) return clean(item.relevance);
  if (clean(item.description)) return clean(item.description);
  if (clean(item.content)) return clean(item.content);

  return "This evidence needs a clearer explanation before it is used in a court document.";
}

function baseWarnings(context: CaseContext) {
  return cleanList([
    ...context.missingInformation,
    ...(context.evidenceAnalysis?.proofGaps || []),
    ...(context.evidenceAnalysis?.contradictionNotes || []),
    ...(context.evidenceAnalysis?.credibilityConcerns || []),
  ]);
}

function buildIntroSection(context: CaseContext): GeneratedDocumentSection {
  const paragraphs: string[] = [];

  paragraphs.push(
    `This draft was generated from the current CourtSimplified case context for ${context.title}.`
  );

  if (clean(context.summary)) {
    paragraphs.push(context.summary);
  }

  paragraphs.push(
    `Current case path: ${context.casePath}. Current stage: ${context.stage}. Current party role: ${context.partyRole}.`
  );

  return {
    id: createId("section"),
    heading: "Overview",
    purpose:
      "Introduces the current case context and summarizes the procedural position.",
    paragraphs,
    bulletPoints: context.facts.map((fact) => `Fact: ${fact}`),
    linkedEvidenceIds: [],
    exhibitLabels: [],
    warnings:
      context.facts.length === 0
        ? ["No core facts have been added to the case context yet."]
        : [],
  };
}

function buildChronologyDocumentSection(
  context: CaseContext
): GeneratedDocumentSection {
  const timeline = buildTimelineFromEvidence(context.evidenceItems || []);

  const bulletPoints = [
    ...timeline.orderedEvents.map((event) => {
      const exhibits =
        event.exhibitLabels.length > 0
          ? ` Evidence: ${event.exhibitLabels.join(", ")}.`
          : "";

      return `${event.date || "No date"} — ${event.title}: ${
        event.description
      }.${exhibits}`;
    }),
    ...timeline.undatedEvents.map((event) => {
      const exhibits =
        event.exhibitLabels.length > 0
          ? ` Evidence: ${event.exhibitLabels.join(", ")}.`
          : "";

      return `Undated — ${event.title}: ${event.description}.${exhibits}`;
    }),
  ];

  return {
    id: createId("section"),
    heading: "Chronology",
    purpose:
      "Creates a date-ordered chronology from the evidence currently saved in the case.",
    paragraphs: [
      "The chronology below is generated from dated and undated evidence items. Dates and source information should be reviewed before court use.",
    ],
    bulletPoints,
    linkedEvidenceIds: timeline.events.flatMap(
      (event) => event.linkedEvidenceIds
    ),
    exhibitLabels: timeline.events.flatMap((event) => event.exhibitLabels),
    warnings: cleanList([
      ...timeline.chronologyWarnings,
      ...timeline.chronologyGaps,
      ...timeline.contradictionRisks,
    ]),
  };
}

function buildEvidenceSummarySection(
  context: CaseContext
): GeneratedDocumentSection {
  const bulletPoints = context.evidenceItems.map((item) => {
    return `${exhibitLabel(item)} — ${evidenceTitle(item)}: ${evidenceExplanation(
      item
    )}`;
  });

  return {
    id: createId("section"),
    heading: "Evidence Summary",
    purpose:
      "Summarizes each exhibit and explains what it currently appears to support.",
    paragraphs: [
      "The following evidence summary is generated from the reviewed exhibit package.",
    ],
    bulletPoints,
    linkedEvidenceIds: context.evidenceItems.map(evidenceId),
    exhibitLabels: context.evidenceItems.map(exhibitLabel),
    warnings:
      context.evidenceItems.length === 0
        ? ["No evidence has been saved yet."]
        : [],
  };
}

function buildIssuesProofChartSection(
  context: CaseContext
): GeneratedDocumentSection {
  const bulletPoints: string[] = [];

  for (const issue of context.issues) {
    bulletPoints.push(`Issue: ${issue.title}`);

    if (issue.description) {
      bulletPoints.push(`Description: ${issue.description}`);
    }

    if (issue.legalElements.length > 0) {
      bulletPoints.push(`Proof points: ${issue.legalElements.join(", ")}`);
    }

    const linkedEvidence = context.evidenceItems.filter((item) =>
      issue.linkedEvidenceIds.map(String).includes(String(evidenceId(item)))
    );

    if (linkedEvidence.length > 0) {
      for (const item of linkedEvidence) {
        bulletPoints.push(
          `Evidence for ${issue.title}: ${exhibitLabel(item)} — ${evidenceTitle(
            item
          )}: ${evidenceExplanation(item)}`
        );
      }
    } else {
      bulletPoints.push(
        `No evidence is currently linked to the issue "${issue.title}".`
      );
    }
  }

  return {
    id: createId("section"),
    heading: "Issue and Proof Chart",
    purpose:
      "Maps each issue to available evidence and proof points so the user can see what is supported and what is missing.",
    paragraphs: [
      "This section organizes the case by issue and connects each issue to the evidence currently available.",
    ],
    bulletPoints,
    linkedEvidenceIds: context.issues.flatMap((issue) => issue.linkedEvidenceIds),
    exhibitLabels: [],
    warnings:
      context.issues.length === 0
        ? ["No issues have been detected yet."]
        : [],
  };
}

function buildAffidavitOutlineSection(
  context: CaseContext
): GeneratedDocumentSection {
  const timeline = buildTimelineFromEvidence(context.evidenceItems || []);

  const bulletPoints: string[] = [];

  bulletPoints.push(
    "Use first-person wording only after the user reviews and confirms the facts."
  );

  for (const event of timeline.orderedEvents) {
    const exhibitReference =
      event.exhibitLabels.length > 0
        ? ` Possible exhibit reference: ${event.exhibitLabels.join(", ")}.`
        : "";

    bulletPoints.push(
      `${event.date || "No date"} — ${event.description}.${exhibitReference}`
    );
  }

  for (const event of timeline.undatedEvents) {
    const exhibitReference =
      event.exhibitLabels.length > 0
        ? ` Possible exhibit reference: ${event.exhibitLabels.join(", ")}.`
        : "";

    bulletPoints.push(
      `Undated fact needing review — ${event.description}.${exhibitReference}`
    );
  }

  return {
    id: createId("section"),
    heading: "Affidavit Outline",
    purpose:
      "Provides a fact-first affidavit outline based on chronology and evidence. It is not a sworn affidavit until reviewed, corrected, and sworn/affirmed properly.",
    paragraphs: [
      "This is a draft affidavit outline. It should be reviewed carefully for accuracy, dates, personal knowledge, and exhibit references.",
    ],
    bulletPoints,
    linkedEvidenceIds: timeline.events.flatMap(
      (event) => event.linkedEvidenceIds
    ),
    exhibitLabels: timeline.events.flatMap((event) => event.exhibitLabels),
    warnings: cleanList([
      ...timeline.chronologyWarnings,
      ...timeline.chronologyGaps,
      "Affidavit wording must be based on the user’s personal knowledge unless clearly identified otherwise.",
    ]),
  };
}

function buildSettlementConferenceSection(
  context: CaseContext
): GeneratedDocumentSection {
  const courtPackage = assembleCourtPackage(
    context,
    "settlement-conference"
  );

  const bulletPoints: string[] = [];

  for (const section of courtPackage.sections) {
    bulletPoints.push(`${section.title}: ${section.purpose}`);
    bulletPoints.push(...section.content);
  }

  return {
    id: createId("section"),
    heading: "Settlement Conference Brief Preparation",
    purpose:
      "Organizes issues, evidence, strengths, weaknesses, and gaps for settlement conference preparation.",
    paragraphs: [
      "This is a structured preparation draft for settlement conference use. It should be reviewed against the required court form and local filing rules before use.",
    ],
    bulletPoints: cleanList(bulletPoints),
    linkedEvidenceIds: courtPackage.sections.flatMap(
      (section) => section.linkedEvidenceIds
    ),
    exhibitLabels: courtPackage.sections.flatMap(
      (section) => section.exhibitLabels
    ),
    warnings: cleanList([
      ...courtPackage.courtWarnings,
      ...courtPackage.evidenceGaps,
    ]),
  };
}

function buildTrialPreparationSection(
  context: CaseContext
): GeneratedDocumentSection {
  const courtPackage = assembleCourtPackage(context, "trial-binder");

  const bulletPoints: string[] = [];

  for (const section of courtPackage.sections) {
    bulletPoints.push(`${section.title}: ${section.purpose}`);
    bulletPoints.push(...section.content);
  }

  return {
    id: createId("section"),
    heading: "Trial Preparation Outline",
    purpose:
      "Creates a trial-preparation structure organized by evidence, chronology, issues, and proof gaps.",
    paragraphs: [
      "This trial preparation outline is a planning document. It should be reviewed before any trial binder or final trial materials are generated.",
    ],
    bulletPoints: cleanList(bulletPoints),
    linkedEvidenceIds: courtPackage.sections.flatMap(
      (section) => section.linkedEvidenceIds
    ),
    exhibitLabels: courtPackage.sections.flatMap(
      (section) => section.exhibitLabels
    ),
    warnings: cleanList([
      ...courtPackage.courtWarnings,
      ...courtPackage.evidenceGaps,
    ]),
  };
}

function readinessFor(
  sections: GeneratedDocumentSection[],
  warnings: string[]
): GeneratedDocument["readiness"] {
  const sectionWarnings = sections.flatMap((section) => section.warnings);

  if (warnings.length === 0 && sectionWarnings.length === 0) {
    return "court-ready-review-required";
  }

  if (warnings.length > 0 || sectionWarnings.length > 0) {
    return "needs-review";
  }

  return "draft";
}

function nextStepsFor(
  documentType: GeneratedDocumentType,
  warnings: string[]
) {
  const steps: string[] = [];

  if (warnings.length > 0) {
    steps.push(
      "Review and fix warnings before relying on this document in court materials."
    );
  }

  if (documentType === "affidavit-outline") {
    steps.push(
      "Convert the outline into accurate first-person evidence and confirm every statement is true before swearing or affirming."
    );
  }

  if (documentType === "settlement-conference-brief") {
    steps.push(
      "Compare this draft to the required court form or conference brief format before filing or serving."
    );
  }

  if (documentType === "chronology") {
    steps.push(
      "Confirm all dates, sources, and exhibit references before using the chronology."
    );
  }

  if (documentType === "trial-preparation-outline") {
    steps.push(
      "Confirm witnesses, exhibit order, and issue-by-issue proof before trial preparation is finalized."
    );
  }

  if (steps.length === 0) {
    steps.push(
      "Review the generated document for accuracy, completeness, tone, and procedural fit."
    );
  }

  return cleanList(steps);
}

function documentTitle(context: CaseContext, documentType: GeneratedDocumentType) {
  if (documentType === "chronology") return `${context.title} — Chronology`;
  if (documentType === "evidence-summary") {
    return `${context.title} — Evidence Summary`;
  }
  if (documentType === "affidavit-outline") {
    return `${context.title} — Affidavit Outline`;
  }
  if (documentType === "settlement-conference-brief") {
    return `${context.title} — Settlement Conference Preparation Draft`;
  }
  if (documentType === "trial-preparation-outline") {
    return `${context.title} — Trial Preparation Outline`;
  }
  if (documentType === "issue-proof-chart") {
    return `${context.title} — Issue and Proof Chart`;
  }
  if (documentType === "case-summary") {
    return `${context.title} — Case Summary`;
  }

  return `${context.title} — Litigation Package`;
}

export function generateCaseDocument(
  context: CaseContext,
  documentType: GeneratedDocumentType = "general-litigation-package"
): GeneratedDocument {
  const sections: GeneratedDocumentSection[] = [];

  sections.push(buildIntroSection(context));

  if (
    documentType === "chronology" ||
    documentType === "general-litigation-package"
  ) {
    sections.push(buildChronologyDocumentSection(context));
  }

  if (
    documentType === "evidence-summary" ||
    documentType === "general-litigation-package"
  ) {
    sections.push(buildEvidenceSummarySection(context));
  }

  if (
    documentType === "issue-proof-chart" ||
    documentType === "general-litigation-package"
  ) {
    sections.push(buildIssuesProofChartSection(context));
  }

  if (
    documentType === "affidavit-outline" ||
    documentType === "general-litigation-package"
  ) {
    sections.push(buildAffidavitOutlineSection(context));
  }

  if (documentType === "settlement-conference-brief") {
    sections.push(buildSettlementConferenceSection(context));
  }

  if (documentType === "trial-preparation-outline") {
    sections.push(buildTrialPreparationSection(context));
  }

  if (documentType === "case-summary") {
    sections.push(buildIssuesProofChartSection(context));
    sections.push(buildEvidenceSummarySection(context));
  }

  const warnings = cleanList([
    ...baseWarnings(context),
    ...sections.flatMap((section) => section.warnings),
  ]);

  return {
    id: createId("generated_document"),
    documentType,
    title: documentTitle(context, documentType),
    subtitle:
      "Generated by CourtSimplified from the active case context, evidence package, chronology, and litigation intelligence.",
    generatedAt: new Date().toISOString(),
    readiness: readinessFor(sections, warnings),
    sections,
    warnings,
    nextSteps: nextStepsFor(documentType, warnings),
  };
}