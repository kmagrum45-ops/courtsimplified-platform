import type {
  GeneratedDocument,
  GeneratedDocumentSection,
  GeneratedDocumentType,
} from "./documentGenerationEngine";

export type WorkspaceDocumentStatus =
  | "draft"
  | "in-review"
  | "ready-for-export"
  | "archived";

export type WorkspaceEditSource =
  | "system-generated"
  | "user-edited"
  | "ai-assisted"
  | "imported";

export type WorkspaceSection = {
  id: string;
  originalSectionId?: string;
  heading: string;
  purpose: string;
  paragraphs: string[];
  bulletPoints: string[];
  linkedEvidenceIds: Array<string | number>;
  exhibitLabels: string[];
  warnings: string[];

  editSource: WorkspaceEditSource;
  userEdited: boolean;
  aiEdited: boolean;
  locked: boolean;
  notes: string[];
  updatedAt: string;
};

export type WorkspaceDocument = {
  id: string;
  sourceDocumentId: string;
  documentType: GeneratedDocumentType;
  title: string;
  subtitle: string;
  status: WorkspaceDocumentStatus;
  createdAt: string;
  updatedAt: string;

  sections: WorkspaceSection[];
  warnings: string[];
  nextSteps: string[];

  revisionHistory: WorkspaceRevision[];
};

export type WorkspaceRevision = {
  id: string;
  createdAt: string;
  action:
    | "created"
    | "section-updated"
    | "section-added"
    | "section-removed"
    | "section-reordered"
    | "status-changed"
    | "document-title-updated";
  description: string;
};

export type WorkspaceBuildInput = {
  generatedDocument: GeneratedDocument;
  status?: WorkspaceDocumentStatus;
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

function cleanList(items: string[]) {
  return Array.from(
    new Set(items.map((item) => clean(item)).filter(Boolean))
  );
}

function createRevision(
  action: WorkspaceRevision["action"],
  description: string
): WorkspaceRevision {
  return {
    id: createId("revision"),
    createdAt: nowIso(),
    action,
    description,
  };
}

function convertGeneratedSection(
  section: GeneratedDocumentSection
): WorkspaceSection {
  return {
    id: createId("workspace_section"),
    originalSectionId: section.id,
    heading: section.heading,
    purpose: section.purpose,
    paragraphs: section.paragraphs,
    bulletPoints: section.bulletPoints,
    linkedEvidenceIds: section.linkedEvidenceIds,
    exhibitLabels: section.exhibitLabels,
    warnings: section.warnings,

    editSource: "system-generated",
    userEdited: false,
    aiEdited: false,
    locked: false,
    notes: [],
    updatedAt: nowIso(),
  };
}

export function buildWorkspaceDocument(
  input: WorkspaceBuildInput
): WorkspaceDocument {
  const generatedDocument = input.generatedDocument;

  return {
    id: createId("workspace_document"),
    sourceDocumentId: generatedDocument.id,
    documentType: generatedDocument.documentType,
    title: generatedDocument.title,
    subtitle: generatedDocument.subtitle,
    status: input.status || "draft",
    createdAt: nowIso(),
    updatedAt: nowIso(),

    sections: generatedDocument.sections.map(convertGeneratedSection),
    warnings: generatedDocument.warnings,
    nextSteps: generatedDocument.nextSteps,

    revisionHistory: [
      createRevision(
        "created",
        "Workspace document created from generated document."
      ),
    ],
  };
}

export function updateWorkspaceTitle(
  document: WorkspaceDocument,
  title: string,
  subtitle?: string
): WorkspaceDocument {
  return {
    ...document,
    title,
    subtitle:
      subtitle === undefined
        ? document.subtitle
        : subtitle,
    updatedAt: nowIso(),
    revisionHistory: [
      createRevision(
        "document-title-updated",
        "Document title or subtitle was updated."
      ),
      ...document.revisionHistory,
    ],
  };
}

export function updateWorkspaceSection(
  document: WorkspaceDocument,
  sectionId: string,
  updates: Partial<
    Pick<
      WorkspaceSection,
      | "heading"
      | "purpose"
      | "paragraphs"
      | "bulletPoints"
      | "warnings"
      | "notes"
      | "locked"
    >
  >,
  editSource: WorkspaceEditSource = "user-edited"
): WorkspaceDocument {
  const updatedSections = document.sections.map((section) => {
    if (section.id !== sectionId) return section;

    return {
      ...section,
      ...updates,
      editSource,
      userEdited:
        editSource === "user-edited"
          ? true
          : section.userEdited,
      aiEdited:
        editSource === "ai-assisted"
          ? true
          : section.aiEdited,
      updatedAt: nowIso(),
    };
  });

  return {
    ...document,
    sections: updatedSections,
    updatedAt: nowIso(),
    revisionHistory: [
      createRevision(
        "section-updated",
        "A document section was updated."
      ),
      ...document.revisionHistory,
    ],
  };
}

export function addWorkspaceSection(
  document: WorkspaceDocument,
  section: Omit<
    WorkspaceSection,
    | "id"
    | "editSource"
    | "userEdited"
    | "aiEdited"
    | "locked"
    | "updatedAt"
  >,
  editSource: WorkspaceEditSource = "user-edited"
): WorkspaceDocument {
  const newSection: WorkspaceSection = {
    ...section,
    id: createId("workspace_section"),
    editSource,
    userEdited: editSource === "user-edited",
    aiEdited: editSource === "ai-assisted",
    locked: false,
    updatedAt: nowIso(),
  };

  return {
    ...document,
    sections: [...document.sections, newSection],
    updatedAt: nowIso(),
    revisionHistory: [
      createRevision(
        "section-added",
        `Section "${newSection.heading}" was added.`
      ),
      ...document.revisionHistory,
    ],
  };
}

export function removeWorkspaceSection(
  document: WorkspaceDocument,
  sectionId: string
): WorkspaceDocument {
  const removed = document.sections.find(
    (section) => section.id === sectionId
  );

  return {
    ...document,
    sections: document.sections.filter(
      (section) => section.id !== sectionId
    ),
    updatedAt: nowIso(),
    revisionHistory: [
      createRevision(
        "section-removed",
        removed
          ? `Section "${removed.heading}" was removed.`
          : "A section was removed."
      ),
      ...document.revisionHistory,
    ],
  };
}

export function reorderWorkspaceSections(
  document: WorkspaceDocument,
  sectionIdsInOrder: string[]
): WorkspaceDocument {
  const orderMap = new Map(
    sectionIdsInOrder.map((id, index) => [id, index])
  );

  const reordered = document.sections
    .slice()
    .sort((a, b) => {
      const aIndex = orderMap.get(a.id);
      const bIndex = orderMap.get(b.id);

      if (aIndex === undefined && bIndex === undefined) return 0;
      if (aIndex === undefined) return 1;
      if (bIndex === undefined) return -1;

      return aIndex - bIndex;
    });

  return {
    ...document,
    sections: reordered,
    updatedAt: nowIso(),
    revisionHistory: [
      createRevision(
        "section-reordered",
        "Document sections were reordered."
      ),
      ...document.revisionHistory,
    ],
  };
}

export function updateWorkspaceStatus(
  document: WorkspaceDocument,
  status: WorkspaceDocumentStatus
): WorkspaceDocument {
  return {
    ...document,
    status,
    updatedAt: nowIso(),
    revisionHistory: [
      createRevision(
        "status-changed",
        `Document status changed to ${status}.`
      ),
      ...document.revisionHistory,
    ],
  };
}

export function getWorkspaceDocumentWarnings(
  document: WorkspaceDocument
): string[] {
  return cleanList([
    ...document.warnings,
    ...document.sections.flatMap((section) => section.warnings),
    ...document.sections.flatMap((section) =>
      section.locked
        ? []
        : section.heading
          ? []
          : ["A section is missing a heading."]
    ),
    ...document.sections.flatMap((section) =>
      section.paragraphs.length === 0 &&
      section.bulletPoints.length === 0
        ? [`Section "${section.heading}" has no draft content.`]
        : []
    ),
  ]);
}

export function getWorkspaceDocumentNextSteps(
  document: WorkspaceDocument
): string[] {
  const warnings = getWorkspaceDocumentWarnings(document);

  const steps: string[] = [];

  if (warnings.length > 0) {
    steps.push(
      "Review and fix document warnings before export or filing."
    );
  }

  const uneditedGeneratedSections = document.sections.filter(
    (section) =>
      section.editSource === "system-generated" &&
      !section.userEdited &&
      !section.aiEdited
  );

  if (uneditedGeneratedSections.length > 0) {
    steps.push(
      `${uneditedGeneratedSections.length} system-generated section(s) still need user review.`
    );
  }

  const unlockedSections = document.sections.filter(
    (section) => !section.locked
  );

  if (unlockedSections.length > 0) {
    steps.push(
      "Lock sections once they are reviewed and ready for export."
    );
  }

  if (document.status === "draft") {
    steps.push(
      "Move the document to review status once the user has checked all sections."
    );
  }

  if (document.status === "ready-for-export") {
    steps.push(
      "Proceed to export only after checking court form requirements, filing rules, and exhibit references."
    );
  }

  return cleanList([...steps, ...document.nextSteps]);
}

export function buildPlainTextFromWorkspaceDocument(
  document: WorkspaceDocument
): string {
  const lines: string[] = [];

  lines.push(document.title);

  if (document.subtitle) {
    lines.push("");
    lines.push(document.subtitle);
  }

  lines.push("");
  lines.push(`Status: ${document.status}`);
  lines.push(`Last updated: ${document.updatedAt}`);

  for (const section of document.sections) {
    lines.push("");
    lines.push(section.heading);
    lines.push("-".repeat(section.heading.length));

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
      lines.push(
        `Linked exhibits: ${section.exhibitLabels.join(", ")}`
      );
    }
  }

  return lines.join("\n");
}