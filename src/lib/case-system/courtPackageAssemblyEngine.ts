import type { CaseContext } from "./caseContextEngine";
import type { EvidenceItem } from "./evidenceEngine";
import {
  buildTimelineFromEvidence,
  type TimelineAnalysis,
} from "./timelineEngine";

export type CourtPackageType =
  | "case-overview"
  | "settlement-conference"
  | "affidavit-outline"
  | "trial-binder"
  | "chronology"
  | "evidence-brief"
  | "motion-record"
  | "general";

export type CourtPackageReadiness =
  | "ready"
  | "needs-review"
  | "incomplete";

export type CourtPackageSection = {
  id: string;
  title: string;
  purpose: string;
  content: string[];
  linkedEvidenceIds: Array<string | number>;
  exhibitLabels: string[];
  warnings: string[];
  suggestedFixes: string[];
};

export type CourtPackageAssemblyResult = {
  packageId: string;
  packageType: CourtPackageType;
  title: string;
  summary: string;
  readiness: CourtPackageReadiness;
  sections: CourtPackageSection[];
  chronology: CourtPackageSection;
  issueEvidenceMap: CourtPackageSection[];
  evidenceGaps: string[];
  courtWarnings: string[];
  nextSteps: string[];
  timelineAnalysis: TimelineAnalysis;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function normalize(value: unknown) {
  return clean(value)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ");
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

function evidenceSummary(item: EvidenceItem) {
  if (clean(item.relevance)) return clean(item.relevance);
  if (clean(item.description)) return clean(item.description);
  if (clean(item.content)) return clean(item.content);

  return "This exhibit should be reviewed and connected to a specific issue or proof point.";
}

function buildPackageTitle(
  context: CaseContext,
  packageType: CourtPackageType
) {
  if (packageType === "settlement-conference") {
    return `${context.title} — Settlement Conference Preparation Package`;
  }

  if (packageType === "affidavit-outline") {
    return `${context.title} — Affidavit Evidence Outline`;
  }

  if (packageType === "trial-binder") {
    return `${context.title} — Trial Binder Structure`;
  }

  if (packageType === "chronology") {
    return `${context.title} — Chronology Package`;
  }

  if (packageType === "evidence-brief") {
    return `${context.title} — Evidence Brief`;
  }

  if (packageType === "motion-record") {
    return `${context.title} — Motion Record Preparation Package`;
  }

  return `${context.title} — Court Package`;
}

function buildOverviewSection(context: CaseContext): CourtPackageSection {
  const content: string[] = [];

  content.push(`Case path: ${context.casePath}.`);
  content.push(`Current stage: ${context.stage}.`);
  content.push(`Party role: ${context.partyRole}.`);

  if (clean(context.summary)) {
    content.push(`Case summary: ${context.summary}`);
  }

  if (context.facts.length > 0) {
    content.push(...context.facts.map((fact) => `Fact: ${fact}`));
  }

  return {
    id: createId("section"),
    title: "Case overview",
    purpose:
      "Provides a short working overview of the case, stage, role, and core factual background.",
    content: cleanList(content),
    linkedEvidenceIds: [],
    exhibitLabels: [],
    warnings:
      context.facts.length === 0
        ? ["No case facts have been recorded yet."]
        : [],
    suggestedFixes:
      context.facts.length === 0
        ? ["Add core facts from intake before generating final court materials."]
        : [],
  };
}

function buildIssuesSection(context: CaseContext): CourtPackageSection {
  const content = context.issues.map((issue) => {
    const parts: string[] = [];

    parts.push(`Issue: ${issue.title}`);

    if (issue.description) {
      parts.push(`Description: ${issue.description}`);
    }

    if (issue.legalElements.length > 0) {
      parts.push(`Proof points: ${issue.legalElements.join(", ")}`);
    }

    parts.push(`Linked evidence items: ${issue.linkedEvidenceIds.length}`);

    return parts.join(" | ");
  });

  return {
    id: createId("section"),
    title: "Issues for the court",
    purpose:
      "Identifies the issues currently detected and the proof points connected to them.",
    content: cleanList(content),
    linkedEvidenceIds: context.issues.flatMap(
      (issue) => issue.linkedEvidenceIds
    ),
    exhibitLabels: [],
    warnings:
      context.issues.length === 0
        ? ["No issues have been detected yet."]
        : [],
    suggestedFixes:
      context.issues.length === 0
        ? ["Connect evidence and intake facts to the issues the court must decide."]
        : [],
  };
}

function buildEvidenceSummarySection(
  context: CaseContext
): CourtPackageSection {
  const content = context.evidenceItems.map((item) => {
    return `${exhibitLabel(item)} — ${evidenceTitle(item)}: ${evidenceSummary(
      item
    )}`;
  });

  return {
    id: createId("section"),
    title: "Evidence summary",
    purpose:
      "Summarizes the exhibits and explains what each exhibit currently appears to support.",
    content: cleanList(content),
    linkedEvidenceIds: context.evidenceItems.map(evidenceId),
    exhibitLabels: context.evidenceItems.map(exhibitLabel),
    warnings:
      context.evidenceItems.length === 0
        ? ["No evidence has been saved to the case context yet."]
        : [],
    suggestedFixes:
      context.evidenceItems.length === 0
        ? ["Save reviewed exhibits from the Evidence Builder before assembling this package."]
        : [],
  };
}

function buildChronologySection(
  timelineAnalysis: TimelineAnalysis
): CourtPackageSection {
  const content = timelineAnalysis.orderedEvents.map((event) => {
    return `${event.date || "No date"} — ${event.title}: ${
      event.description
    }`;
  });

  const undatedContent = timelineAnalysis.undatedEvents.map((event) => {
    return `Undated — ${event.title}: ${event.description}`;
  });

  return {
    id: createId("section"),
    title: "Chronology",
    purpose:
      "Provides a date-ordered chronology of events connected to the evidence package.",
    content: cleanList([...content, ...undatedContent]),
    linkedEvidenceIds: timelineAnalysis.events.flatMap(
      (event) => event.linkedEvidenceIds
    ),
    exhibitLabels: timelineAnalysis.events.flatMap(
      (event) => event.exhibitLabels
    ),
    warnings: cleanList([
      ...timelineAnalysis.chronologyWarnings,
      ...timelineAnalysis.chronologyGaps,
      ...timelineAnalysis.contradictionRisks,
    ]),
    suggestedFixes: timelineAnalysis.nextSteps,
  };
}

function buildIssueEvidenceMap(
  context: CaseContext
): CourtPackageSection[] {
  return context.issues.map((issue) => {
    const linkedEvidence = context.evidenceItems.filter((item) =>
      issue.linkedEvidenceIds
        .map(String)
        .includes(String(evidenceId(item)))
    );

    const content = linkedEvidence.map((item) => {
      return `${exhibitLabel(item)} — ${evidenceTitle(item)}: ${evidenceSummary(
        item
      )}`;
    });

    return {
      id: createId("section"),
      title: `Evidence map — ${issue.title}`,
      purpose:
        "Connects this issue to the exhibits and proof points currently available.",
      content: cleanList(content),
      linkedEvidenceIds: linkedEvidence.map(evidenceId),
      exhibitLabels: linkedEvidence.map(exhibitLabel),
      warnings:
        linkedEvidence.length === 0
          ? [`No evidence is currently linked to the issue "${issue.title}".`]
          : [],
      suggestedFixes:
        linkedEvidence.length === 0
          ? ["Add or link evidence to this issue before relying on it in court materials."]
          : [],
    };
  });
}

function buildSettlementSection(
  context: CaseContext
): CourtPackageSection {
  const content: string[] = [];

  if (context.strengths.length > 0) {
    content.push(
      `Strengths to consider for settlement: ${context.strengths.join("; ")}`
    );
  }

  if (context.weaknesses.length > 0) {
    content.push(
      `Weaknesses or risks to address before settlement conference: ${context.weaknesses.join(
        "; "
      )}`
    );
  }

  if (context.evidenceAnalysis.settlementUse.length > 0) {
    content.push(...context.evidenceAnalysis.settlementUse);
  }

  return {
    id: createId("section"),
    title: "Settlement conference preparation",
    purpose:
      "Organizes issues, strengths, weaknesses, evidence, and resolution points for settlement conference preparation.",
    content: cleanList(content),
    linkedEvidenceIds: context.evidenceItems.map(evidenceId),
    exhibitLabels: context.evidenceItems.map(exhibitLabel),
    warnings:
      content.length === 0
        ? ["No settlement-specific evidence or notes have been identified yet."]
        : [],
    suggestedFixes:
      content.length === 0
        ? ["Add settlement offers, payment proposals, refusals, apologies, retractions, or resolution history if relevant."]
        : [],
  };
}

function buildAffidavitOutlineSection(
  context: CaseContext,
  timelineAnalysis: TimelineAnalysis
): CourtPackageSection {
  const content: string[] = [];

  content.push(
    "Affidavit outline should be written in first person and organized by dated facts, not argument."
  );

  for (const event of timelineAnalysis.orderedEvents) {
    content.push(
      `${event.date || "No date"}: ${event.description} ${
        event.exhibitLabels.length > 0
          ? `(Potential exhibit reference: ${event.exhibitLabels.join(", ")})`
          : ""
      }`
    );
  }

  for (const event of timelineAnalysis.undatedEvents) {
    content.push(
      `Undated event requiring review: ${event.description} ${
        event.exhibitLabels.length > 0
          ? `(Potential exhibit reference: ${event.exhibitLabels.join(", ")})`
          : ""
      }`
    );
  }

  return {
    id: createId("section"),
    title: "Affidavit outline",
    purpose:
      "Creates a fact-first affidavit outline using timeline events and exhibit references.",
    content: cleanList(content),
    linkedEvidenceIds: timelineAnalysis.events.flatMap(
      (event) => event.linkedEvidenceIds
    ),
    exhibitLabels: timelineAnalysis.events.flatMap(
      (event) => event.exhibitLabels
    ),
    warnings:
      timelineAnalysis.undatedEvents.length > 0
        ? ["Some affidavit events are undated and should be fixed before drafting."]
        : [],
    suggestedFixes:
      timelineAnalysis.undatedEvents.length > 0
        ? ["Add dates or approximate dates before generating a final affidavit."]
        : [],
  };
}

function buildTrialBinderSection(
  context: CaseContext
): CourtPackageSection {
  const grouped = new Map<string, EvidenceItem[]>();

  for (const item of context.evidenceItems) {
    const group = item.exhibitGroup || "Other evidence";
    const existing = grouped.get(group) || [];
    grouped.set(group, [...existing, item]);
  }

  const content: string[] = [];

  for (const [group, items] of grouped.entries()) {
    content.push(`${group}: ${items.map(exhibitLabel).join(", ")}`);
  }

  return {
    id: createId("section"),
    title: "Trial binder structure",
    purpose:
      "Groups exhibits into a trial-binder-style structure for later package generation.",
    content: cleanList(content),
    linkedEvidenceIds: context.evidenceItems.map(evidenceId),
    exhibitLabels: context.evidenceItems.map(exhibitLabel),
    warnings:
      context.evidenceItems.length === 0
        ? ["No exhibits are available for a trial binder."]
        : [],
    suggestedFixes:
      context.evidenceItems.length === 0
        ? ["Review and save exhibits before building a trial binder."]
        : [],
  };
}

function collectEvidenceGaps(context: CaseContext) {
  return cleanList([
    ...context.missingInformation,
    ...(context.evidenceAnalysis.proofGaps || []),
    ...(context.evidenceAnalysis.missingFoundation || []),
    ...(context.evidenceAnalysis.authenticityRisks || []),
    ...(context.evidenceAnalysis.hearsayRisks || []),
  ]);
}

function collectCourtWarnings(
  context: CaseContext,
  timelineAnalysis: TimelineAnalysis
) {
  return cleanList([
    ...context.weaknesses,
    ...context.risks.map((risk) => risk.description),
    ...timelineAnalysis.chronologyWarnings,
    ...timelineAnalysis.chronologyGaps,
    ...timelineAnalysis.contradictionRisks,
  ]);
}

function determineReadiness(
  evidenceGaps: string[],
  courtWarnings: string[],
  timelineAnalysis: TimelineAnalysis
): CourtPackageReadiness {
  if (evidenceGaps.length === 0 && courtWarnings.length === 0) {
    return "ready";
  }

  if (
    evidenceGaps.length > 0 ||
    timelineAnalysis.undatedEvents.length > 0
  ) {
    return "incomplete";
  }

  return "needs-review";
}

function buildNextSteps(
  packageType: CourtPackageType,
  readiness: CourtPackageReadiness,
  evidenceGaps: string[],
  courtWarnings: string[]
) {
  const steps: string[] = [];

  if (readiness === "incomplete") {
    steps.push("Fix missing evidence, dates, foundation, or proof gaps before generating final court materials.");
  }

  if (readiness === "needs-review") {
    steps.push("Review warnings, chronology issues, and strategy concerns before finalizing the package.");
  }

  if (evidenceGaps.length > 0) {
    steps.push("Complete missing evidence information and confirm every exhibit has a purpose.");
  }

  if (courtWarnings.length > 0) {
    steps.push("Review litigation risks and prepare responses before using this package.");
  }

  if (packageType === "settlement-conference") {
    steps.push("Prepare a concise settlement position and identify what documents support each issue.");
  }

  if (packageType === "affidavit-outline") {
    steps.push("Convert the outline into first-person sworn evidence and remove argument-style wording.");
  }

  if (packageType === "trial-binder") {
    steps.push("Confirm final exhibit order, witness links, and issue-by-issue proof mapping.");
  }

  if (steps.length === 0) {
    steps.push("Package is ready for review and document generation.");
  }

  return cleanList(steps);
}

export function assembleCourtPackage(
  context: CaseContext,
  packageType: CourtPackageType = "general"
): CourtPackageAssemblyResult {
  const timelineAnalysis = buildTimelineFromEvidence(
    context.evidenceItems || []
  );

  const overviewSection = buildOverviewSection(context);
  const issuesSection = buildIssuesSection(context);
  const evidenceSummarySection = buildEvidenceSummarySection(context);
  const chronology = buildChronologySection(timelineAnalysis);
  const issueEvidenceMap = buildIssueEvidenceMap(context);

  const sections: CourtPackageSection[] = [
    overviewSection,
    issuesSection,
    evidenceSummarySection,
    chronology,
  ];

  if (packageType === "settlement-conference") {
    sections.push(buildSettlementSection(context));
  }

  if (packageType === "affidavit-outline") {
    sections.push(buildAffidavitOutlineSection(context, timelineAnalysis));
  }

  if (packageType === "trial-binder") {
    sections.push(buildTrialBinderSection(context));
  }

  if (packageType === "chronology") {
    sections.push(chronology);
  }

  sections.push(...issueEvidenceMap);

  const evidenceGaps = collectEvidenceGaps(context);
  const courtWarnings = collectCourtWarnings(context, timelineAnalysis);
  const readiness = determineReadiness(
    evidenceGaps,
    courtWarnings,
    timelineAnalysis
  );

  const nextSteps = buildNextSteps(
    packageType,
    readiness,
    evidenceGaps,
    courtWarnings
  );

  return {
    packageId: createId("court_package"),
    packageType,
    title: buildPackageTitle(context, packageType),
    summary:
      "CourtSimplified assembled this package from the active case context, evidence package, chronology, issue map, and litigation-risk analysis.",
    readiness,
    sections,
    chronology,
    issueEvidenceMap,
    evidenceGaps,
    courtWarnings,
    nextSteps,
    timelineAnalysis,
  };
}