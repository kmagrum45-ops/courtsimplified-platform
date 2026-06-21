import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ExportRequestBody = {
  caseId?: string;
  path?: string;
  master_result?: any;
  caseData?: any;
  workspaceDocument?: any;
  evidencePackage?: any;
  strategyData?: any;
  courtPackage?: any;
  trialPackage?: any;
  settlementPackage?: any;
  exportFormat?: "json" | "text" | "package";
};

type ExportSection = {
  id: string;
  title: string;
  category: string;
  ready: boolean;
  warnings: string[];
  content: string[];
};

function safeArray(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string") return [value];
  return [];
}

function safeText(value: any): string {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function getCaseSummary(source: any): string[] {
  const items: string[] = [];

  const summary =
    source?.analysis?.summary ||
    source?.summary ||
    source?.caseSummary ||
    source?.master_result?.analysis?.summary;

  if (summary) items.push(safeText(summary));

  const facts = source?.facts || source?.caseFacts || source?.master_result?.facts;
  if (facts) items.push(`Facts: ${safeText(facts)}`);

  const goal = source?.goal || source?.requestedOutcome || source?.master_result?.goal;
  if (goal) items.push(`Goal / requested outcome: ${safeText(goal)}`);

  return items;
}

function buildWorkspaceContent(workspaceDocument: any): string[] {
  if (!workspaceDocument?.sections?.length) return [];

  return workspaceDocument.sections.map((section: any) => {
    const paragraphs = safeArray(section.paragraphs).join("\n");
    const bullets = safeArray(section.bulletPoints)
      .map((item) => `- ${item}`)
      .join("\n");

    return [
      section.heading || "Untitled section",
      section.purpose ? `Purpose: ${section.purpose}` : "",
      paragraphs,
      bullets,
    ]
      .filter(Boolean)
      .join("\n");
  });
}

function buildEvidenceContent(evidencePackage: any): string[] {
  const exhibits = evidencePackage?.exhibits || [];

  if (!Array.isArray(exhibits) || exhibits.length === 0) return [];

  return exhibits.map((exhibit: any) => {
    return `Exhibit ${exhibit.label || "?"}: ${
      exhibit.title || "Untitled exhibit"
    } — ${exhibit.confirmed ? "confirmed" : "needs review"}`;
  });
}

function calculateReadiness(sections: ExportSection[]) {
  const total = sections.length || 1;
  const ready = sections.filter((section) => section.ready).length;
  const warnings = sections.flatMap((section) => section.warnings);

  return {
    score: Math.round((ready / total) * 100),
    ready,
    missing: total - ready,
    total,
    warnings,
    status:
      ready === total
        ? "ready-for-final-review"
        : ready >= Math.ceil(total / 2)
          ? "needs-review"
          : "needs-repair",
  };
}

function buildExportSections(body: ExportRequestBody): ExportSection[] {
  const source = body.master_result || body.caseData || {};

  const caseSummary = getCaseSummary(source);
  const workspaceContent = buildWorkspaceContent(body.workspaceDocument);
  const evidenceContent = buildEvidenceContent(body.evidencePackage);

  const timeline =
    source?.timeline ||
    source?.chronology ||
    body.caseData?.timeline ||
    body.master_result?.timeline;

  const strategy =
    source?.analysis?.caseStrategy ||
    source?.caseStrategy ||
    body.strategyData?.caseStrategy ||
    body.strategyData?.strengths;

  const risks =
    source?.analysis?.risksAndGaps ||
    source?.risksAndGaps ||
    body.strategyData?.risks ||
    body.strategyData?.weaknesses;

  const opposing =
    source?.analysis?.opposingArguments ||
    body.strategyData?.opposingArguments ||
    body.strategyData?.likelyOpposition;

  const courtConcerns =
    source?.analysis?.courtConcerns ||
    body.strategyData?.courtConcerns ||
    body.trialPackage?.judgeConcerns;

  return [
    {
      id: "case-summary",
      title: "Case Summary",
      category: "Core Litigation",
      ready: caseSummary.length > 0,
      warnings:
        caseSummary.length > 0
          ? []
          : ["No case summary or facts were available for export."],
      content: caseSummary,
    },
    {
      id: "workspace-document",
      title: "Workspace Draft",
      category: "Drafting",
      ready: workspaceContent.length > 0,
      warnings:
        workspaceContent.length > 0
          ? []
          : ["No workspace document sections were provided."],
      content: workspaceContent,
    },
    {
      id: "chronology",
      title: "Chronology",
      category: "Timeline",
      ready: !!timeline,
      warnings: timeline ? [] : ["No chronology or timeline was available."],
      content: safeArray(timeline),
    },
    {
      id: "evidence-package",
      title: "Evidence Package",
      category: "Evidence",
      ready: evidenceContent.length > 0,
      warnings:
        evidenceContent.length > 0
          ? []
          : ["No evidence package or exhibit list was provided."],
      content: evidenceContent,
    },
    {
      id: "litigation-strategy",
      title: "Litigation Strategy",
      category: "Strategy",
      ready: safeArray(strategy).length > 0,
      warnings:
        safeArray(strategy).length > 0
          ? []
          : ["No litigation strategy points were available."],
      content: safeArray(strategy),
    },
    {
      id: "risks-and-gaps",
      title: "Risks and Proof Gaps",
      category: "Risk Review",
      ready: safeArray(risks).length > 0,
      warnings:
        safeArray(risks).length > 0
          ? []
          : ["No risks or proof gaps were available."],
      content: safeArray(risks),
    },
    {
      id: "opposing-arguments",
      title: "Likely Opposing Arguments",
      category: "Opposition",
      ready: safeArray(opposing).length > 0,
      warnings:
        safeArray(opposing).length > 0
          ? []
          : ["No likely opposing arguments were available."],
      content: safeArray(opposing),
    },
    {
      id: "court-concerns",
      title: "Judge-Facing Concerns",
      category: "Court Readiness",
      ready: safeArray(courtConcerns).length > 0,
      warnings:
        safeArray(courtConcerns).length > 0
          ? []
          : ["No judge-facing concerns were available."],
      content: safeArray(courtConcerns),
    },
  ];
}

function buildPlainTextPackage(args: {
  caseId?: string;
  path?: string;
  sections: ExportSection[];
  readiness: ReturnType<typeof calculateReadiness>;
}) {
  const header = [
    "CourtSimplified Export Package",
    `Case ID: ${args.caseId || "Not provided"}`,
    `Path: ${args.path || "unknown"}`,
    `Readiness: ${args.readiness.score}%`,
    `Status: ${args.readiness.status}`,
    `Generated: ${new Date().toISOString()}`,
  ].join("\n");

  const body = args.sections
    .map((section) => {
      const warnings =
        section.warnings.length > 0
          ? `\nWarnings:\n${section.warnings.map((item) => `- ${item}`).join("\n")}`
          : "";

      const content =
        section.content.length > 0
          ? section.content.join("\n\n")
          : "No content available.";

      return [
        `\n\n==============================`,
        section.title,
        `Category: ${section.category}`,
        `Ready: ${section.ready ? "Yes" : "No"}`,
        warnings,
        "\nContent:",
        content,
      ].join("\n");
    })
    .join("");

  return `${header}${body}`;
}

export async function POST(req: NextRequest) {
  try {
    const body: ExportRequestBody = await req.json();

    const sections = buildExportSections(body);
    const readiness = calculateReadiness(sections);

    const plainText = buildPlainTextPackage({
      caseId: body.caseId,
      path: body.path,
      sections,
      readiness,
    });

    const exportPackage = {
      id: `export-${Date.now()}`,
      caseId: body.caseId || null,
      path: body.path || "unknown",
      createdAt: new Date().toISOString(),
      format: body.exportFormat || "package",
      readiness,
      sections,
      plainText,
      nextActions: [
        readiness.score < 80
          ? "Review missing sections before relying on the export package."
          : "Review the final package carefully before filing or sharing.",
        "Confirm exhibit labels match the evidence package.",
        "Confirm chronology dates match source evidence.",
        "Confirm court forms match the current procedural stage.",
        "Use official court filing systems or court staff to verify filing requirements.",
      ],
      futureExportSupport: {
        pdf: "Prepared for later PDF generation.",
        docx: "Prepared for later DOCX generation.",
        zipBundle: "Prepared for later bundle export.",
        supabaseSave: "Prepared for later saved export records.",
      },
    };

    return NextResponse.json({
      success: true,
      exportPackage,
    });
  } catch (error) {
    console.error("document-export route error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "CourtSimplified could not generate the export package right now.",
      },
      { status: 500 },
    );
  }
}