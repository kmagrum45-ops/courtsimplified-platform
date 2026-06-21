import type {
  WorkspaceDocument,
  WorkspaceSection,
} from "./documentWorkspaceEngine";

export type DraftingAssistantAction =
  | "rewrite-for-clarity"
  | "make-more-formal"
  | "make-plainer-language"
  | "shorten"
  | "expand"
  | "organize-chronology"
  | "strengthen-evidence-links"
  | "identify-weaknesses"
  | "prepare-opposing-arguments"
  | "court-tone-review"
  | "custom";

export type DraftingAssistantInput = {
  document: WorkspaceDocument;
  sectionId?: string;
  action: DraftingAssistantAction;
  customInstruction?: string;
};

export type DraftingAssistantSuggestion = {
  id: string;
  action: DraftingAssistantAction;
  targetSectionId?: string;
  title: string;
  explanation: string;
  proposedHeading?: string;
  proposedParagraphs: string[];
  proposedBulletPoints: string[];
  warnings: string[];
  userMustReview: boolean;
};

export type DraftingAssistantResult = {
  id: string;
  createdAt: string;
  action: DraftingAssistantAction;
  targetSectionId?: string;
  documentTitle: string;
  suggestions: DraftingAssistantSuggestion[];
  globalWarnings: string[];
  nextSteps: string[];
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

function getTargetSections(
  document: WorkspaceDocument,
  sectionId?: string
): WorkspaceSection[] {
  if (!sectionId) return document.sections;

  return document.sections.filter((section) => section.id === sectionId);
}

function sectionText(section: WorkspaceSection) {
  return cleanList([
    section.heading,
    section.purpose,
    ...section.paragraphs,
    ...section.bulletPoints,
  ]).join("\n");
}

function splitLongText(text: string) {
  return clean(text)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function rewriteForClarity(section: WorkspaceSection) {
  const paragraphs = section.paragraphs.length
    ? section.paragraphs.map((paragraph) =>
        paragraph
          .replace(/\s+/g, " ")
          .replace(/\butilize\b/gi, "use")
          .replace(/\bprior to\b/gi, "before")
          .replace(/\bin the event that\b/gi, "if")
          .trim()
      )
    : [
        `This section explains ${section.heading.toLowerCase()} in a clearer structure. The user should review the facts, dates, and exhibit references before using it.`,
      ];

  return {
    proposedParagraphs: paragraphs,
    proposedBulletPoints: section.bulletPoints,
  };
}

function makeMoreFormal(section: WorkspaceSection) {
  const paragraphs = section.paragraphs.length
    ? section.paragraphs.map((paragraph) =>
        paragraph
          .replace(/\bI think\b/gi, "The available information suggests")
          .replace(/\bstuff\b/gi, "materials")
          .replace(/\bthings\b/gi, "issues")
          .replace(/\bgot\b/gi, "received")
          .trim()
      )
    : [
        `This section should be drafted in a neutral, court-appropriate tone and tied to the evidence and issues identified in the case record.`,
      ];

  return {
    proposedParagraphs: paragraphs,
    proposedBulletPoints: section.bulletPoints,
  };
}

function makePlainerLanguage(section: WorkspaceSection) {
  const paragraphs = section.paragraphs.length
    ? section.paragraphs.map((paragraph) =>
        paragraph
          .replace(/\bnotwithstanding\b/gi, "even though")
          .replace(/\bsubsequent to\b/gi, "after")
          .replace(/\bapproximately\b/gi, "about")
          .replace(/\bpursuant to\b/gi, "under")
          .trim()
      )
    : [
        `This section explains the point in plain language so the user can understand and review it before deciding how it should appear in a court document.`,
      ];

  return {
    proposedParagraphs: paragraphs,
    proposedBulletPoints: section.bulletPoints,
  };
}

function shortenSection(section: WorkspaceSection) {
  const paragraphs = section.paragraphs.map((paragraph) => {
    const sentences = paragraph
      .split(/(?<=[.!?])\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

    return sentences.slice(0, 2).join(" ");
  });

  const bulletPoints = section.bulletPoints.slice(0, 8);

  return {
    proposedParagraphs:
      paragraphs.length > 0
        ? paragraphs
        : [`Short summary of ${section.heading}: review the key facts and evidence.`],
    proposedBulletPoints: bulletPoints,
  };
}

function expandSection(section: WorkspaceSection) {
  const paragraphs =
    section.paragraphs.length > 0
      ? section.paragraphs
      : [
          `This section addresses ${section.heading}. The user should confirm the facts, dates, sources, and exhibit references before relying on this draft.`,
        ];

  const addedPoints: string[] = [];

  if (section.exhibitLabels.length > 0) {
    addedPoints.push(
      `Review linked exhibits: ${section.exhibitLabels.join(", ")}.`
    );
  }

  if (section.warnings.length > 0) {
    addedPoints.push(
      "Address the section warnings before finalizing this part of the document."
    );
  }

  addedPoints.push(
    "Confirm whether this section should include dates, parties, documents, payments, communications, or court steps."
  );

  return {
    proposedParagraphs: paragraphs,
    proposedBulletPoints: cleanList([...section.bulletPoints, ...addedPoints]),
  };
}

function organizeChronology(section: WorkspaceSection) {
  const allPoints = cleanList([
    ...section.paragraphs,
    ...section.bulletPoints,
  ]);

  const dated = allPoints
    .filter((item) => /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(item))
    .sort((a, b) => a.localeCompare(b));

  const undated = allPoints.filter((item) => !dated.includes(item));

  return {
    proposedParagraphs: [
      "The chronology should be reviewed for date accuracy, source information, and exhibit references before use.",
    ],
    proposedBulletPoints: cleanList([...dated, ...undated]),
  };
}

function strengthenEvidenceLinks(section: WorkspaceSection) {
  const points = [...section.bulletPoints];

  if (section.exhibitLabels.length > 0) {
    points.push(
      `This section should be cross-checked against exhibit(s): ${section.exhibitLabels.join(
        ", "
      )}.`
    );
  } else {
    points.push(
      "No exhibit is currently linked to this section. Add the evidence that supports this point."
    );
  }

  points.push(
    "For each factual statement, confirm what document, message, photo, receipt, witness, or court record proves it."
  );

  return {
    proposedParagraphs:
      section.paragraphs.length > 0
        ? section.paragraphs
        : [
            "This section should clearly connect each factual claim to the supporting evidence.",
          ],
    proposedBulletPoints: cleanList(points),
  };
}

function identifyWeaknesses(section: WorkspaceSection) {
  const warnings = cleanList([
    ...section.warnings,
    section.exhibitLabels.length === 0
      ? "This section has no linked exhibit references."
      : "",
    section.paragraphs.length === 0 && section.bulletPoints.length === 0
      ? "This section has no draft content."
      : "",
    section.locked
      ? ""
      : "This section is not locked/reviewed yet.",
  ]);

  return {
    proposedParagraphs: [
      `Potential weaknesses for "${section.heading}" should be reviewed before the document is finalized.`,
    ],
    proposedBulletPoints:
      warnings.length > 0
        ? warnings
        : ["No obvious section-level weakness was detected by this rule-based review."],
  };
}

function prepareOpposingArguments(section: WorkspaceSection) {
  const points = [
    "The opposing side may argue that this section is incomplete if dates, sources, or exhibit links are missing.",
    "The opposing side may challenge reliability if the evidence is a screenshot, message, or second-hand statement without context.",
    "The opposing side may argue the section is argument rather than evidence if it contains conclusions without supporting facts.",
  ];

  if (section.exhibitLabels.length === 0) {
    points.push(
      "A likely attack is that this section is unsupported because no exhibit is linked."
    );
  }

  if (section.warnings.length > 0) {
    points.push(...section.warnings.map((warning) => `Known warning: ${warning}`));
  }

  return {
    proposedParagraphs: [
      `Possible opposing arguments for "${section.heading}" are listed below so the user can strengthen the draft before final use.`,
    ],
    proposedBulletPoints: cleanList(points),
  };
}

function courtToneReview(section: WorkspaceSection) {
  const text = sectionText(section);

  const warnings: string[] = [];

  if (/\bclearly\b|\bobviously\b|\bliar\b|\bfake\b|\bcrazy\b/i.test(text)) {
    warnings.push(
      "This section may contain argumentative or emotionally loaded wording. Consider neutral factual wording."
    );
  }

  if (/\bi think\b|\bi feel\b|\beveryone knows\b/i.test(text)) {
    warnings.push(
      "This section may sound speculative. Replace opinions with facts, dates, and evidence."
    );
  }

  return {
    proposedParagraphs:
      section.paragraphs.length > 0
        ? section.paragraphs
        : [
            "Use neutral, factual wording. Avoid exaggeration, insults, speculation, or unsupported conclusions.",
          ],
    proposedBulletPoints: cleanList([
      ...section.bulletPoints,
      ...warnings,
      "Use dates, names, documents, and exhibit references where possible.",
      "Separate facts from requests, opinions, and legal argument.",
    ]),
  };
}

function customSuggestion(section: WorkspaceSection, instruction?: string) {
  return {
    proposedParagraphs: [
      `Custom instruction received: ${instruction || "No custom instruction provided."}`,
      "This is a placeholder structured response. A future OpenAI-backed assistant can use this same architecture to rewrite only this section safely.",
    ],
    proposedBulletPoints: cleanList([
      ...section.bulletPoints,
      "User must review all AI-assisted changes for accuracy before use.",
    ]),
  };
}

function buildSuggestionForSection(
  section: WorkspaceSection,
  action: DraftingAssistantAction,
  customInstruction?: string
): DraftingAssistantSuggestion {
  const result =
    action === "rewrite-for-clarity"
      ? rewriteForClarity(section)
      : action === "make-more-formal"
        ? makeMoreFormal(section)
        : action === "make-plainer-language"
          ? makePlainerLanguage(section)
          : action === "shorten"
            ? shortenSection(section)
            : action === "expand"
              ? expandSection(section)
              : action === "organize-chronology"
                ? organizeChronology(section)
                : action === "strengthen-evidence-links"
                  ? strengthenEvidenceLinks(section)
                  : action === "identify-weaknesses"
                    ? identifyWeaknesses(section)
                    : action === "prepare-opposing-arguments"
                      ? prepareOpposingArguments(section)
                      : action === "court-tone-review"
                        ? courtToneReview(section)
                        : customSuggestion(section, customInstruction);

  const warnings = cleanList([
    ...section.warnings,
    section.locked
      ? "This section is locked. Unlock it before applying changes."
      : "",
    "This is drafting assistance only. The user must review all facts, dates, evidence references, and procedural fit before use.",
  ]);

  return {
    id: createId("drafting_suggestion"),
    action,
    targetSectionId: section.id,
    title: `Suggested update for ${section.heading}`,
    explanation:
      "This suggestion was generated from the current workspace section using structured drafting rules. Future AI integration can replace or enhance this logic while preserving the same safe workflow.",
    proposedHeading: section.heading,
    proposedParagraphs: result.proposedParagraphs,
    proposedBulletPoints: result.proposedBulletPoints,
    warnings,
    userMustReview: true,
  };
}

export function runDraftingAssistant(
  input: DraftingAssistantInput
): DraftingAssistantResult {
  const targetSections = getTargetSections(input.document, input.sectionId);

  const suggestions = targetSections.map((section) =>
    buildSuggestionForSection(
      section,
      input.action,
      input.customInstruction
    )
  );

  const globalWarnings = cleanList([
    input.document.status === "ready-for-export"
      ? "This document is marked ready for export. Be careful before changing reviewed content."
      : "",
    targetSections.length === 0
      ? "No matching section was found for the requested drafting action."
      : "",
    "Drafting assistant output must be reviewed by the user before use.",
  ]);

  const nextSteps = cleanList([
    "Review the proposed changes.",
    "Apply only the sections that are accurate and useful.",
    "Check exhibit references, dates, parties, and procedural fit.",
    "Lock the section again after review if it is ready.",
  ]);

  return {
    id: createId("drafting_result"),
    createdAt: nowIso(),
    action: input.action,
    targetSectionId: input.sectionId,
    documentTitle: input.document.title,
    suggestions,
    globalWarnings,
    nextSteps,
  };
}