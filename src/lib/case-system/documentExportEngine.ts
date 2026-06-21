import type {
  WorkspaceDocument,
  WorkspaceSection,
} from "./documentWorkspaceEngine";

export type ExportFormat =
  | "plain-text"
  | "markdown"
  | "court-outline";

export type ExportReadiness =
  | "ready"
  | "needs-review"
  | "blocked";

export type ExportCategory =
  | "core-document"
  | "evidence"
  | "strategy"
  | "court-package"
  | "trial-preparation"
  | "settlement"
  | "export-review";

export type ExportDiagnosticLevel =
  | "info"
  | "warning"
  | "error";

export type ExportDiagnostic = {
  id: string;
  level: ExportDiagnosticLevel;
  message: string;
  category: ExportCategory;
};

export type ExportSection = {
  id: string;
  heading: string;
  category: ExportCategory;
  formattedContent: string;
  exhibitLabels: string[];
  warnings: string[];
  locked: boolean;
  hasContent: boolean;
};

export type LitigationExportPackageInput = {
  workspaceDocument?: WorkspaceDocument | null;
  caseSummary?: string[];
  chronology?: string[];
  evidenceItems?: string[];
  strategyItems?: string[];
  opposingArguments?: string[];
  judgeConcerns?: string[];
  exportChecklist?: string[];
  title?: string;
  caseId?: string;
  casePath?: string;
  format?: ExportFormat;
};

export type DocumentExportResult = {
  id: string;
  format: ExportFormat;
  fileName: string;
  title: string;
  readiness: ExportReadiness;
  readinessScore: number;
  content: string;
  sections: ExportSection[];
  warnings: string[];
  diagnostics: ExportDiagnostic[];
  nextSteps: string[];
  createdAt: string;
  metadata: {
    caseId?: string;
    casePath?: string;
    sectionCount: number;
    lockedSectionCount: number;
    warningCount: number;
    exhibitReferenceCount: number;
    packageMode: "workspace-document" | "litigation-package";
    futurePdfReady: boolean;
    futureDocxReady: boolean;
  };
};

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function clean(value: unknown) {
  return String(value || "").trim();
}

function cleanList(items: unknown[]) {
  return Array.from(
    new Set(items.map((item) => clean(item)).filter(Boolean)),
  );
}

function safeFileName(value: string) {
  return (
    clean(value)
      .replace(/[^a-z0-9_\- ]/gi, "")
      .replace(/\s+/g, "_")
      .toLowerCase() || "courtsimplified_document"
  );
}

function createDiagnostic(
  level: ExportDiagnosticLevel,
  message: string,
  category: ExportCategory,
): ExportDiagnostic {
  return {
    id: createId("export_diagnostic"),
    level,
    message,
    category,
  };
}

function formatList(items: string[], format: ExportFormat) {
  if (items.length === 0) return "";

  return items
    .map((item, index) => {
      if (format === "court-outline") {
        return `${index + 1}. ${item}`;
      }

      return `- ${item}`;
    })
    .join("\n");
}

function formatSectionPlainText(section: WorkspaceSection) {
  const lines: string[] = [];

  lines.push(section.heading);
  lines.push("-".repeat(section.heading.length));

  if (section.purpose) {
    lines.push("");
    lines.push(`Purpose: ${section.purpose}`);
  }

  for (const paragraph of section.paragraphs) {
    lines.push("");
    lines.push(paragraph);
  }

  if (section.bulletPoints.length > 0) {
    lines.push("");

    for (const bullet of section.bulletPoints) {
      lines.push(`- ${bullet}`);
    }
  }

  if (section.exhibitLabels.length > 0) {
    lines.push("");
    lines.push(`Linked exhibits: ${section.exhibitLabels.join(", ")}`);
  }

  return lines.join("\n");
}

function formatSectionMarkdown(section: WorkspaceSection) {
  const lines: string[] = [];

  lines.push(`## ${section.heading}`);

  if (section.purpose) {
    lines.push("");
    lines.push(`**Purpose:** ${section.purpose}`);
  }

  for (const paragraph of section.paragraphs) {
    lines.push("");
    lines.push(paragraph);
  }

  if (section.bulletPoints.length > 0) {
    lines.push("");

    for (const bullet of section.bulletPoints) {
      lines.push(`- ${bullet}`);
    }
  }

  if (section.exhibitLabels.length > 0) {
    lines.push("");
    lines.push(`**Linked exhibits:** ${section.exhibitLabels.join(", ")}`);
  }

  return lines.join("\n");
}

function formatSectionCourtOutline(
  section: WorkspaceSection,
  index: number,
) {
  const lines: string[] = [];

  lines.push(`${index + 1}. ${section.heading.toUpperCase()}`);

  if (section.purpose) {
    lines.push("");
    lines.push(`Purpose: ${section.purpose}`);
  }

  if (section.paragraphs.length > 0) {
    lines.push("");

    section.paragraphs.forEach((paragraph, paragraphIndex) => {
      lines.push(`${index + 1}.${paragraphIndex + 1} ${paragraph}`);
    });
  }

  if (section.bulletPoints.length > 0) {
    lines.push("");

    section.bulletPoints.forEach((bullet, bulletIndex) => {
      lines.push(`(${bulletIndex + 1}) ${bullet}`);
    });
  }

  if (section.exhibitLabels.length > 0) {
    lines.push("");
    lines.push(`Exhibit references: ${section.exhibitLabels.join(", ")}`);
  }

  return lines.join("\n");
}

function buildExportSection(
  section: WorkspaceSection,
  format: ExportFormat,
  index: number,
): ExportSection {
  const formattedContent =
    format === "markdown"
      ? formatSectionMarkdown(section)
      : format === "court-outline"
        ? formatSectionCourtOutline(section, index)
        : formatSectionPlainText(section);

  return {
    id: section.id,
    heading: section.heading,
    category: "core-document",
    formattedContent,
    exhibitLabels: section.exhibitLabels,
    warnings: section.warnings,
    locked: section.locked,
    hasContent:
      section.paragraphs.length > 0 ||
      section.bulletPoints.length > 0 ||
      clean(section.purpose).length > 0,
  };
}

function buildManualExportSection(args: {
  id: string;
  heading: string;
  category: ExportCategory;
  items: string[];
  format: ExportFormat;
  warningIfEmpty: string;
}): ExportSection {
  const cleanItems = cleanList(args.items);

  const heading =
    args.format === "markdown"
      ? `## ${args.heading}`
      : args.format === "court-outline"
        ? args.heading.toUpperCase()
        : args.heading;

  const formattedContent =
    cleanItems.length > 0
      ? [heading, "", formatList(cleanItems, args.format)].join("\n")
      : [heading, "", "No content available."].join("\n");

  return {
    id: args.id,
    heading: args.heading,
    category: args.category,
    formattedContent,
    exhibitLabels: [],
    warnings: cleanItems.length > 0 ? [] : [args.warningIfEmpty],
    locked: true,
    hasContent: cleanItems.length > 0,
  };
}

function buildHeader(args: {
  title: string;
  format: ExportFormat;
  status?: string;
  caseId?: string;
  casePath?: string;
  packageMode: "workspace-document" | "litigation-package";
}) {
  const lines: string[] = [];

  if (args.format === "markdown") {
    lines.push(`# ${args.title}`);
    lines.push("");
    lines.push(`**Package mode:** ${args.packageMode}`);
    lines.push(`**Status:** ${args.status || "export-review"}`);
    lines.push(`**Generated:** ${nowIso()}`);

    if (args.caseId) lines.push(`**Case ID:** ${args.caseId}`);
    if (args.casePath) lines.push(`**Case path:** ${args.casePath}`);

    return lines.join("\n");
  }

  lines.push(args.title);

  lines.push("");
  lines.push(`Package mode: ${args.packageMode}`);
  lines.push(`Status: ${args.status || "export-review"}`);
  lines.push(`Generated: ${nowIso()}`);

  if (args.caseId) lines.push(`Case ID: ${args.caseId}`);
  if (args.casePath) lines.push(`Case path: ${args.casePath}`);

  if (args.format === "court-outline") {
    lines.push("");
    lines.push("COURT-STYLE WORKING OUTLINE");
    lines.push(
      "This working draft must be reviewed for accuracy, filing requirements, formatting, and procedural fit before use.",
    );
  }

  return lines.join("\n");
}

function buildWarningsFromSections(sections: ExportSection[]) {
  const warnings: string[] = [];

  for (const section of sections) {
    warnings.push(...section.warnings);

    if (!section.locked) {
      warnings.push(`Section "${section.heading}" is not locked/reviewed.`);
    }

    if (!section.hasContent) {
      warnings.push(`Section "${section.heading}" has no draft content.`);
    }
  }

  return cleanList(warnings);
}

function buildDiagnosticsFromSections(
  sections: ExportSection[],
): ExportDiagnostic[] {
  const diagnostics: ExportDiagnostic[] = [];

  for (const section of sections) {
    if (!section.hasContent) {
      diagnostics.push(
        createDiagnostic(
          "warning",
          `Section "${section.heading}" has no content.`,
          section.category,
        ),
      );
    }

    if (!section.locked) {
      diagnostics.push(
        createDiagnostic(
          "warning",
          `Section "${section.heading}" has not been locked after review.`,
          section.category,
        ),
      );
    }

    for (const warning of section.warnings) {
      diagnostics.push(
        createDiagnostic("warning", warning, section.category),
      );
    }
  }

  if (sections.length === 0) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "No export sections were available.",
        "export-review",
      ),
    );
  }

  return diagnostics;
}

function determineReadiness(
  sections: ExportSection[],
  warnings: string[],
  status?: string,
): ExportReadiness {
  if (sections.length === 0) return "blocked";

  const hasCoreContent = sections.some(
    (section) => section.category === "core-document" && section.hasContent,
  );

  if (!hasCoreContent) return "blocked";

  if (warnings.length > 0) return "needs-review";

  if (status && status !== "ready-for-export") return "needs-review";

  return "ready";
}

function calculateReadinessScore(
  sections: ExportSection[],
  readiness: ExportReadiness,
) {
  if (readiness === "blocked") return 0;

  if (sections.length === 0) return 0;

  const contentScore =
    sections.filter((section) => section.hasContent).length / sections.length;

  const lockedScore =
    sections.filter((section) => section.locked).length / sections.length;

  const warningPenalty =
    sections.filter((section) => section.warnings.length > 0).length /
    sections.length;

  const score = Math.round(
    contentScore * 55 + lockedScore * 35 + (1 - warningPenalty) * 10,
  );

  if (readiness === "ready") return Math.max(score, 90);

  return Math.min(score, 89);
}

function buildNextSteps(
  sections: ExportSection[],
  readiness: ExportReadiness,
  warnings: string[],
  status?: string,
) {
  const steps: string[] = [];

  if (readiness === "blocked") {
    steps.push("Add core document content before exporting.");
  }

  if (warnings.length > 0) {
    steps.push("Review and resolve export warnings before filing or serving.");
  }

  const unlockedSections = sections.filter((section) => !section.locked);

  if (unlockedSections.length > 0) {
    steps.push("Lock reviewed sections before final export.");
  }

  if (status && status !== "ready-for-export") {
    steps.push("Set document status to ready-for-export once review is complete.");
  }

  steps.push("Confirm exhibit labels match the evidence package.");
  steps.push("Confirm chronology dates match source evidence.");
  steps.push("Confirm court forms match the current procedural stage.");
  steps.push("Review the export carefully before filing, serving, or sharing.");

  if (readiness === "ready") {
    steps.push("Export is ready for final user review in the selected format.");
  }

  return cleanList(steps);
}

function joinSections(
  header: string,
  sections: ExportSection[],
  format: ExportFormat,
  warnings: string[],
  diagnostics: ExportDiagnostic[],
) {
  const lines: string[] = [];

  lines.push(header);

  if (warnings.length > 0) {
    lines.push("");
    lines.push(format === "markdown" ? "## Export Warnings" : "EXPORT WARNINGS");

    for (const warning of warnings) {
      lines.push(`- ${warning}`);
    }
  }

  if (diagnostics.length > 0) {
    lines.push("");
    lines.push(
      format === "markdown" ? "## Export Diagnostics" : "EXPORT DIAGNOSTICS",
    );

    for (const diagnostic of diagnostics) {
      lines.push(
        `- [${diagnostic.level.toUpperCase()}] ${diagnostic.message}`,
      );
    }
  }

  for (const section of sections) {
    lines.push("");
    lines.push("");
    lines.push(section.formattedContent);
  }

  return lines.join("\n");
}

function buildMetadata(args: {
  caseId?: string;
  casePath?: string;
  sections: ExportSection[];
  packageMode: "workspace-document" | "litigation-package";
}) {
  const exhibitReferenceCount = args.sections.reduce(
    (total, section) => total + section.exhibitLabels.length,
    0,
  );

  return {
    caseId: args.caseId,
    casePath: args.casePath,
    sectionCount: args.sections.length,
    lockedSectionCount: args.sections.filter((section) => section.locked)
      .length,
    warningCount: args.sections.reduce(
      (total, section) => total + section.warnings.length,
      0,
    ),
    exhibitReferenceCount,
    packageMode: args.packageMode,
    futurePdfReady: true,
    futureDocxReady: true,
  };
}

export function exportWorkspaceDocument(
  document: WorkspaceDocument,
  format: ExportFormat = "plain-text",
): DocumentExportResult {
  const sections = document.sections.map((section, index) =>
    buildExportSection(section, format, index),
  );

  const warnings = cleanList([
    ...(document.warnings || []),
    ...buildWarningsFromSections(sections),
  ]);

  const diagnostics = buildDiagnosticsFromSections(sections);

  const readiness = determineReadiness(
    sections,
    warnings,
    document.status,
  );

  const readinessScore = calculateReadinessScore(sections, readiness);

  const header = buildHeader({
    title: document.title,
    format,
    status: document.status,
    packageMode: "workspace-document",
  });

  const content = joinSections(
    header,
    sections,
    format,
    warnings,
    diagnostics,
  );

  return {
    id: createId("document_export"),
    format,
    fileName: `${safeFileName(document.title)}.${
      format === "markdown" ? "md" : "txt"
    }`,
    title: document.title,
    readiness,
    readinessScore,
    content,
    sections,
    warnings,
    diagnostics,
    nextSteps: buildNextSteps(
      sections,
      readiness,
      warnings,
      document.status,
    ),
    createdAt: nowIso(),
    metadata: buildMetadata({
      sections,
      packageMode: "workspace-document",
    }),
  };
}

export function exportLitigationPackage(
  input: LitigationExportPackageInput,
): DocumentExportResult {
  const format = input.format || "plain-text";

  const workspaceSections =
    input.workspaceDocument?.sections.map((section, index) =>
      buildExportSection(section, format, index),
    ) || [];

  const manualSections: ExportSection[] = [
    buildManualExportSection({
      id: "case-summary",
      heading: "Case Summary",
      category: "core-document",
      items: input.caseSummary || [],
      format,
      warningIfEmpty: "No case summary was provided.",
    }),
    buildManualExportSection({
      id: "chronology",
      heading: "Chronology",
      category: "court-package",
      items: input.chronology || [],
      format,
      warningIfEmpty: "No chronology was provided.",
    }),
    buildManualExportSection({
      id: "evidence",
      heading: "Evidence Review",
      category: "evidence",
      items: input.evidenceItems || [],
      format,
      warningIfEmpty: "No evidence items were provided.",
    }),
    buildManualExportSection({
      id: "strategy",
      heading: "Litigation Strategy",
      category: "strategy",
      items: input.strategyItems || [],
      format,
      warningIfEmpty: "No strategy items were provided.",
    }),
    buildManualExportSection({
      id: "opposing-arguments",
      heading: "Likely Opposing Arguments",
      category: "strategy",
      items: input.opposingArguments || [],
      format,
      warningIfEmpty: "No likely opposing arguments were provided.",
    }),
    buildManualExportSection({
      id: "judge-concerns",
      heading: "Judge-Facing Concerns",
      category: "trial-preparation",
      items: input.judgeConcerns || [],
      format,
      warningIfEmpty: "No judge-facing concerns were provided.",
    }),
    buildManualExportSection({
      id: "export-checklist",
      heading: "Final Export Checklist",
      category: "export-review",
      items: input.exportChecklist || [],
      format,
      warningIfEmpty: "No export checklist was provided.",
    }),
  ];

  const sections = [...workspaceSections, ...manualSections];

  const warnings = cleanList([
    ...(input.workspaceDocument?.warnings || []),
    ...buildWarningsFromSections(sections),
  ]);

  const diagnostics = buildDiagnosticsFromSections(sections);

  const readiness = determineReadiness(
    sections,
    warnings,
    input.workspaceDocument?.status,
  );

  const readinessScore = calculateReadinessScore(sections, readiness);

  const title =
    input.title ||
    input.workspaceDocument?.title ||
    "CourtSimplified Litigation Export Package";

  const header = buildHeader({
    title,
    format,
    status: input.workspaceDocument?.status || "export-review",
    caseId: input.caseId,
    casePath: input.casePath,
    packageMode: "litigation-package",
  });

  const content = joinSections(
    header,
    sections,
    format,
    warnings,
    diagnostics,
  );

  return {
    id: createId("litigation_export"),
    format,
    fileName: `${safeFileName(title)}.${format === "markdown" ? "md" : "txt"}`,
    title,
    readiness,
    readinessScore,
    content,
    sections,
    warnings,
    diagnostics,
    nextSteps: buildNextSteps(
      sections,
      readiness,
      warnings,
      input.workspaceDocument?.status,
    ),
    createdAt: nowIso(),
    metadata: buildMetadata({
      caseId: input.caseId,
      casePath: input.casePath,
      sections,
      packageMode: "litigation-package",
    }),
  };
}

export function buildDownloadableTextBlob(
  exportResult: DocumentExportResult,
): Blob {
  return new Blob([exportResult.content], {
    type:
      exportResult.format === "markdown"
        ? "text/markdown;charset=utf-8"
        : "text/plain;charset=utf-8",
  });
}

export function buildExportFileLabel(exportResult: DocumentExportResult) {
  return exportResult.fileName;
}