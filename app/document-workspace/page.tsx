"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { supabase } from "../../src/lib/supabase/client";

import {
  getActiveCaseContextLocal,
  setActiveCaseContextLocal,
  type CaseContext,
} from "../../src/lib/case-system/caseContextStorage";

import {
  generateCaseDocument,
  type GeneratedDocumentType,
} from "../../src/lib/case-system/documentGenerationEngine";

import {
  buildPlainTextFromWorkspaceDocument,
  buildWorkspaceDocument,
  getWorkspaceDocumentNextSteps,
  getWorkspaceDocumentWarnings,
  updateWorkspaceSection,
  updateWorkspaceStatus,
  updateWorkspaceTitle,
  type WorkspaceDocument,
  type WorkspaceDocumentStatus,
} from "../../src/lib/case-system/documentWorkspaceEngine";

type DocumentModeOption = {
  value: GeneratedDocumentType;
  label: string;
  description: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

type WorkspaceDiagnostic = {
  label: string;
  value: string;
  detail: string;
};

const WORKSPACE_STORAGE_KEY = "courtSimplifiedWorkspaceDocument";

const DOCUMENT_MODE_OPTIONS: DocumentModeOption[] = [
  {
    value: "general-litigation-package",
    label: "General litigation package",
    description:
      "Creates a broad working draft package from the full active case context.",
  },
  {
    value: "case-summary",
    label: "Case summary",
    description:
      "Summarizes parties, issues, facts, procedural posture, and next steps.",
  },
  {
    value: "chronology",
    label: "Chronology",
    description:
      "Builds a date-driven timeline to expose gaps, sequencing issues, and proof needs.",
  },
  {
    value: "evidence-summary",
    label: "Evidence summary",
    description:
      "Organizes uploaded and recorded evidence into court-useful proof sections.",
  },
  {
    value: "affidavit-outline",
    label: "Affidavit outline",
    description:
      "Creates a sworn-statement structure with facts, exhibits, and missing details.",
  },
  {
    value: "settlement-conference-brief",
    label: "Settlement conference brief prep",
    description:
      "Builds settlement-focused facts, issues, risks, requested outcome, and evidence.",
  },
  {
    value: "trial-preparation-outline",
    label: "Trial preparation outline",
    description:
      "Organizes proof, witnesses, exhibits, disputed issues, and courtroom preparation.",
  },
  {
    value: "issue-proof-chart",
    label: "Issue proof chart",
    description:
      "Maps each issue to the facts and evidence needed to prove it.",
  },
];

function WorkspaceBox({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-[#10231f]">{title}</h3>

      {items.length > 0 ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[#6b8078]">Nothing recorded yet.</p>
      )}
    </div>
  );
}

function buildWorkflowHref(route: string, caseId?: string, path?: string) {
  const params = new URLSearchParams();

  if (caseId) params.set("caseId", caseId);
  if (path && path !== "unknown") params.set("path", path);

  const query = params.toString();
  return query ? `${route}?${query}` : route;
}

function getPathLabel(path: string | undefined) {
  if (path === "family") return "Family";
  if (path === "small-claims") return "Small Claims";
  if (path === "civil") return "Civil";
  return "Unknown";
}

function getStatusTone(status: WorkspaceDocumentStatus) {
  if (status === "ready-for-export") {
    return "border-[#b7e4cf] bg-[#f0fdf4] text-[#166534]";
  }

  if (status === "in-review") {
    return "border-[#f3d6a2] bg-[#fff7ed] text-[#92400e]";
  }

  if (status === "archived") {
    return "border-[#d1d5db] bg-[#f3f4f6] text-[#374151]";
  }

  return "border-[#d8e6df] bg-[#f8fcfa] text-[#24463d]";
}

function getWorkspaceHealth(workspaceDocument: WorkspaceDocument | null) {
  if (!workspaceDocument) {
    return {
      lockedSections: 0,
      editableSections: 0,
      warningSections: 0,
      sectionsWithEvidence: 0,
      totalSections: 0,
      exportReady: false,
      completionPercent: 0,
    };
  }

  const totalSections = workspaceDocument.sections.length;

  const lockedSections = workspaceDocument.sections.filter(
    (section) => section.locked,
  ).length;

  const warningSections = workspaceDocument.sections.filter(
    (section) => section.warnings.length > 0,
  ).length;

  const sectionsWithEvidence = workspaceDocument.sections.filter(
    (section) => section.exhibitLabels.length > 0,
  ).length;

  const completionPercent =
    totalSections === 0 ? 0 : Math.round((lockedSections / totalSections) * 100);

  return {
    lockedSections,
    editableSections: totalSections - lockedSections,
    warningSections,
    sectionsWithEvidence,
    totalSections,
    exportReady: workspaceDocument.status === "ready-for-export",
    completionPercent,
  };
}

function getSaveStatusLabel(status: SaveStatus) {
  if (status === "saving") return "Saving workspace...";
  if (status === "saved") return "Workspace saved";
  if (status === "error") return "Save issue";
  return "Ready";
}

function getSaveStatusTone(status: SaveStatus) {
  if (status === "saved") return "bg-[#f0fdf4] text-[#166534]";
  if (status === "saving") return "bg-[#fff7ed] text-[#92400e]";
  if (status === "error") return "bg-red-50 text-red-700";
  return "bg-[#f8fcfa] text-[#24463d]";
}

function buildDiagnostics(
  workspaceDocument: WorkspaceDocument | null,
  context: CaseContext | null,
): WorkspaceDiagnostic[] {
  const health = getWorkspaceHealth(workspaceDocument);

  return [
    {
      label: "Case context",
      value: context ? "Loaded" : "Missing",
      detail: context
        ? "The drafting workspace is connected to the active litigation context."
        : "The workspace needs an active case context before drafting can begin.",
    },
    {
      label: "Draft sections",
      value: String(health.totalSections),
      detail:
        health.totalSections > 0
          ? "Sections are available for editing, review, locking, and export."
          : "No drafting sections have been generated yet.",
    },
    {
      label: "Locked review",
      value: `${health.completionPercent}%`,
      detail:
        health.lockedSections > 0
          ? "Reviewed sections are locked so later edits do not overwrite them."
          : "Lock each section after review to protect important wording.",
    },
    {
      label: "Evidence linkage",
      value: `${health.sectionsWithEvidence} section(s)`,
      detail:
        health.sectionsWithEvidence > 0
          ? "Some sections are connected to exhibit labels."
          : "Evidence links should be added or reviewed before court package export.",
    },
  ];
}

function getSystemWarnings(
  workspaceDocument: WorkspaceDocument | null,
  context: CaseContext | null,
) {
  const warnings: string[] = [];

  if (!context) {
    warnings.push("No active case context is loaded.");
  }

  if (!workspaceDocument) {
    warnings.push("No editable workspace has been generated yet.");
    return warnings;
  }

  const health = getWorkspaceHealth(workspaceDocument);

  if (health.warningSections > 0) {
    warnings.push(
      `${health.warningSections} section(s) contain drafting warnings that should be reviewed.`,
    );
  }

  if (health.lockedSections === 0) {
    warnings.push("No sections have been locked after review yet.");
  }

  if (!workspaceDocument.title.trim()) {
    warnings.push("The workspace title is blank.");
  }

  if (workspaceDocument.status === "ready-for-export" && health.warningSections > 0) {
    warnings.push(
      "The workspace is marked ready for export but still contains section warnings.",
    );
  }

  return warnings;
}

function DocumentWorkspacePageContent() {
  const searchParams = useSearchParams();

  const caseId = searchParams.get("caseId") || "";
  const path = searchParams.get("path") || "unknown";

  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<CaseContext | null>(null);
  const [loadError, setLoadError] = useState("");

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState("");

  const [documentType, setDocumentType] =
    useState<GeneratedDocumentType>("general-litigation-package");

  const [workspaceDocument, setWorkspaceDocument] =
    useState<WorkspaceDocument | null>(null);

  useEffect(() => {
    async function loadContext() {
      setLoading(true);
      setLoadError("");

      try {
        const existingWorkspace = localStorage.getItem(WORKSPACE_STORAGE_KEY);

        if (existingWorkspace) {
          try {
            setWorkspaceDocument(JSON.parse(existingWorkspace));
          } catch {
            localStorage.removeItem(WORKSPACE_STORAGE_KEY);
          }
        }

        if (caseId) {
          const { data, error } = await supabase
            .from("cases")
            .select("master_result")
            .eq("id", caseId)
            .single();

          if (!error && data?.master_result) {
            const result = data.master_result as any;

            const caseContext =
              result?.caseContext ||
              result?.persistedRecord?.caseContext ||
              result?.masterCaseFile ||
              null;

            if (caseContext) {
              localStorage.setItem("courtSimplifiedActiveCaseId", caseId);
              localStorage.setItem(
                "courtSimplifiedLoadedCaseContext",
                JSON.stringify(caseContext),
              );

              setContext(caseContext);
              setLoading(false);
              return;
            }
          }
        }

        const loadedContext = getActiveCaseContextLocal();

        if (loadedContext) {
          setContext(loadedContext);
          setLoading(false);
          return;
        }

        const localRaw = localStorage.getItem(
          "courtSimplifiedLoadedCaseContext",
        );

        if (localRaw) {
          try {
            const parsed = JSON.parse(localRaw);
            setContext(parsed);
            setLoading(false);
            return;
          } catch {
            localStorage.removeItem("courtSimplifiedLoadedCaseContext");
          }
        }

        const activeCaseId = localStorage.getItem(
          "courtSimplifiedActiveCaseId",
        );

        if (activeCaseId) {
          const restored = setActiveCaseContextLocal(activeCaseId);

          if (restored) {
            setContext(restored);
            setLoading(false);
            return;
          }
        }

        setLoadError("No active litigation case context could be loaded.");
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unknown workspace loading error.",
        );
      }

      setLoading(false);
    }

    loadContext();
  }, [caseId]);

  const selectedMode = useMemo(() => {
    return (
      DOCUMENT_MODE_OPTIONS.find((option) => option.value === documentType) ||
      DOCUMENT_MODE_OPTIONS[0]
    );
  }, [documentType]);

  const warnings = useMemo(() => {
    if (!workspaceDocument) return [];
    return getWorkspaceDocumentWarnings(workspaceDocument);
  }, [workspaceDocument]);

  const nextSteps = useMemo(() => {
    if (!workspaceDocument) return [];
    return getWorkspaceDocumentNextSteps(workspaceDocument);
  }, [workspaceDocument]);

  const plainTextPreview = useMemo(() => {
    if (!workspaceDocument) return "";
    return buildPlainTextFromWorkspaceDocument(workspaceDocument);
  }, [workspaceDocument]);

  const workspaceHealth = useMemo(() => {
    return getWorkspaceHealth(workspaceDocument);
  }, [workspaceDocument]);

  const diagnostics = useMemo(() => {
    return buildDiagnostics(workspaceDocument, context);
  }, [workspaceDocument, context]);

  const systemWarnings = useMemo(() => {
    return getSystemWarnings(workspaceDocument, context);
  }, [workspaceDocument, context]);

  const workspaceHref = caseId ? `/dashboard/cases/${caseId}` : "/dashboard";
  const builderHref = buildWorkflowHref("/builder", caseId, path);
  const evidenceHref = buildWorkflowHref("/evidence", caseId, path);
  const formsHref = buildWorkflowHref("/forms", caseId, path);
  const strategyHref = buildWorkflowHref("/litigation-strategy", caseId, path);
  const courtPackageHref = buildWorkflowHref("/court-package", caseId, path);
  const trialPackageHref = buildWorkflowHref("/trial-package", caseId, path);
  const assistantHref = buildWorkflowHref("/ai-drafting-assistant", caseId, path);
  const exportHref = buildWorkflowHref("/document-export", caseId, path);

  function persistWorkspace(updated: WorkspaceDocument) {
    try {
      setSaveStatus("saving");
      setWorkspaceDocument(updated);

      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(updated));

      const savedTime = new Date().toLocaleString();
      setLastSavedAt(savedTime);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }

  function createWorkspace() {
    if (!context) return;

    const generatedDocument = generateCaseDocument(context, documentType);

    const workspace = buildWorkspaceDocument({
      generatedDocument,
    });

    persistWorkspace(workspace);
  }

  function updateTitle(title: string) {
    if (!workspaceDocument) return;

    const updated = updateWorkspaceTitle(workspaceDocument, title);
    persistWorkspace(updated);
  }

  function updateStatus(status: WorkspaceDocumentStatus) {
    if (!workspaceDocument) return;

    const updated = updateWorkspaceStatus(workspaceDocument, status);
    persistWorkspace(updated);
  }

  function updateSectionText(
    sectionId: string,
    field: "heading" | "purpose" | "paragraphs" | "bulletPoints",
    value: string,
  ) {
    if (!workspaceDocument) return;

    const updated = updateWorkspaceSection(
      workspaceDocument,
      sectionId,
      field === "paragraphs"
        ? {
            paragraphs: value
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean),
          }
        : field === "bulletPoints"
          ? {
              bulletPoints: value
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean),
            }
          : {
              [field]: value,
            },
      "user-edited",
    );

    persistWorkspace(updated);
  }

  function toggleSectionLock(sectionId: string) {
    if (!workspaceDocument) return;

    const section = workspaceDocument.sections.find(
      (item) => item.id === sectionId,
    );

    if (!section) return;

    const updated = updateWorkspaceSection(
      workspaceDocument,
      sectionId,
      {
        locked: !section.locked,
      },
      "user-edited",
    );

    persistWorkspace(updated);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8faf8] text-[#16302b]">
        Loading litigation workspace...
      </main>
    );
  }

  if (!context) {
    return (
      <main className="min-h-screen bg-[#f8faf8] p-6 text-[#16302b]">
        <div className="mx-auto max-w-6xl">
          <section className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
              Document Workspace
            </p>

            <h1 className="mt-2 text-3xl font-bold text-red-700">
              No active case context found
            </h1>

            <p className="mt-3 text-[#4d675f]">
              {loadError || "No active case context could be loaded."}
            </p>

            <p className="mt-3 text-[#4d675f]">
              Complete intake first so CourtSimplified can generate drafting
              workspaces, litigation documents, evidence summaries, proof charts,
              and court packages.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={workspaceHref}
                className="rounded-full border border-[#2f7d67] bg-white px-5 py-2 text-sm font-semibold text-[#2f7d67]"
              >
                Back to Workspace
              </Link>

              <Link
                href={builderHref}
                className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
              >
                Continue Intake
              </Link>

              <Link
                href={evidenceHref}
                className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
              >
                Evidence
              </Link>

              <Link
                href={formsHref}
                className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
              >
                Forms
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8faf8] p-6 text-[#16302b]">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
                Editable Document Workspace
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Litigation Drafting Workspace
              </h1>

              <p className="mt-3 max-w-3xl text-[#4d675f]">
                Generate structured litigation drafts from the active case
                context, then review, edit, lock, and prepare sections for
                strategy, court package assembly, trial preparation, and export.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm">
              <p className="font-semibold text-[#10231f]">
                {context.title || "CourtSimplified Case"}
              </p>

              <p className="mt-1 text-[#4d675f]">
                Case ID: {caseId || context.caseId || "draft-case"}
              </p>

              <p className="mt-1 text-[#4d675f]">
                Stage: {context.stage || "not-sure"}
              </p>

              <p className="mt-1 text-[#4d675f]">
                Path:{" "}
                {getPathLabel(path !== "unknown" ? path : context.casePath)}
              </p>

              <p
                className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getSaveStatusTone(
                  saveStatus,
                )}`}
              >
                {getSaveStatusLabel(saveStatus)}
              </p>

              {lastSavedAt && (
                <p className="mt-2 text-xs text-[#6b8078]">
                  Last saved: {lastSavedAt}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={workspaceHref}
              className="rounded-full border border-[#2f7d67] bg-white px-5 py-2 text-sm font-semibold text-[#2f7d67]"
            >
              Case Workspace
            </Link>

            <Link
              href={evidenceHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Evidence
            </Link>

            <Link
              href={formsHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Forms
            </Link>

            <Link
              href={assistantHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              AI Drafting Assistant
            </Link>

            <Link
              href={courtPackageHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Court Package
            </Link>

            <Link
              href={strategyHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Strategy
            </Link>
          </div>

          <div className="mt-6 rounded-3xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
            <div className="grid gap-4 md:grid-cols-[1fr_240px]">
              <div>
                <label className="text-sm font-semibold text-[#10231f]">
                  Document mode
                </label>

                <select
                  value={documentType}
                  onChange={(event) =>
                    setDocumentType(event.target.value as GeneratedDocumentType)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white p-3 text-sm"
                >
                  {DOCUMENT_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <p className="mt-3 text-sm leading-6 text-[#4d675f]">
                  {selectedMode.description}
                </p>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={createWorkspace}
                  className="w-full rounded-2xl bg-[#2f7d67] px-6 py-3 font-semibold text-white"
                >
                  Generate Editable Workspace
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {diagnostics.map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-[#d8e6df] bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                {item.label}
              </p>

              <p className="mt-2 text-xl font-bold text-[#10231f]">
                {item.value}
              </p>

              <p className="mt-2 text-sm leading-6 text-[#4d675f]">
                {item.detail}
              </p>
            </div>
          ))}
        </section>

        {systemWarnings.length > 0 && (
          <section className="mt-8 rounded-3xl border border-[#f3d6a2] bg-[#fffaf0] p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#92400e]">
              Workspace review flags
            </h2>

            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
              {systemWarnings.map((warning, index) => (
                <li key={`system-warning-${index}`}>{warning}</li>
              ))}
            </ul>
          </section>
        )}

        {!workspaceDocument && (
          <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">No workspace created yet</h2>

            <p className="mt-3 max-w-3xl text-[#4d675f]">
              Generate a drafting workspace from the litigation context to begin
              editing, proofing, locking, and preparing court-ready materials.
            </p>
          </section>
        )}

        {workspaceDocument && (
          <>
            <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
              <div className="grid gap-4 md:grid-cols-4">
                <div
                  className={`rounded-2xl border p-4 ${getStatusTone(
                    workspaceDocument.status,
                  )}`}
                >
                  <p className="text-xs font-semibold uppercase">Status</p>
                  <p className="mt-1 font-semibold">
                    {workspaceDocument.status}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8fcfa] p-4">
                  <p className="text-xs font-semibold uppercase text-[#6b8078]">
                    Sections
                  </p>
                  <p className="mt-1 font-semibold">
                    {workspaceDocument.sections.length}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8fcfa] p-4">
                  <p className="text-xs font-semibold uppercase text-[#6b8078]">
                    Locked sections
                  </p>
                  <p className="mt-1 font-semibold">
                    {workspaceHealth.lockedSections}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#f8fcfa] p-4">
                  <p className="text-xs font-semibold uppercase text-[#6b8078]">
                    Revisions
                  </p>
                  <p className="mt-1 font-semibold">
                    {workspaceDocument.revisionHistory.length}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#10231f]">
                      Draft readiness
                    </p>
                    <p className="mt-1 text-sm text-[#4d675f]">
                      {workspaceHealth.completionPercent}% of sections are
                      locked after review.
                    </p>
                  </div>

                  <div className="h-3 w-full rounded-full bg-white md:w-64">
                    <div
                      className="h-3 rounded-full bg-[#2f7d67]"
                      style={{
                        width: `${workspaceHealth.completionPercent}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-[#10231f]">
                    Document title
                  </label>

                  <input
                    value={workspaceDocument.title}
                    onChange={(event) => updateTitle(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#d8e6df] p-3"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#10231f]">
                    Document status
                  </label>

                  <select
                    value={workspaceDocument.status}
                    onChange={(event) =>
                      updateStatus(event.target.value as WorkspaceDocumentStatus)
                    }
                    className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white p-3"
                  >
                    <option value="draft">Draft</option>
                    <option value="in-review">In review</option>
                    <option value="ready-for-export">Ready for export</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="mt-8 grid gap-5 md:grid-cols-3">
              <WorkspaceBox title="Workspace warnings" items={warnings} />
              <WorkspaceBox title="Next steps" items={nextSteps} />
              <WorkspaceBox
                title="Drafting readiness"
                items={[
                  `${workspaceHealth.lockedSections} locked section(s).`,
                  `${workspaceHealth.editableSections} editable section(s).`,
                  `${workspaceHealth.warningSections} section(s) with warnings.`,
                  `${workspaceHealth.sectionsWithEvidence} section(s) linked to exhibit labels.`,
                  workspaceHealth.exportReady
                    ? "Workspace is marked ready for export."
                    : "Workspace is not marked ready for export yet.",
                ]}
              />
            </section>

            <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Editable sections</h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d675f]">
                Edit each section carefully. Lock sections once reviewed so later
                drafting work does not accidentally overwrite important wording.
              </p>

              <div className="mt-5 space-y-6">
                {workspaceDocument.sections.map((section) => (
                  <div
                    key={section.id}
                    className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase text-[#2f7d67]">
                          {section.editSource}
                        </p>

                        <h3 className="mt-1 text-lg font-bold">
                          {section.heading || "Untitled section"}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleSectionLock(section.id)}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                          section.locked
                            ? "bg-green-100 text-green-700"
                            : "bg-white text-[#2f7d67]"
                        }`}
                      >
                        {section.locked ? "Locked" : "Lock section"}
                      </button>
                    </div>

                    <div className="mt-5 grid gap-4">
                      <div>
                        <label className="text-sm font-semibold text-[#10231f]">
                          Heading
                        </label>

                        <input
                          value={section.heading}
                          disabled={section.locked}
                          onChange={(event) =>
                            updateSectionText(
                              section.id,
                              "heading",
                              event.target.value,
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white p-3 disabled:bg-[#edf3f1]"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-[#10231f]">
                          Purpose
                        </label>

                        <textarea
                          value={section.purpose}
                          disabled={section.locked}
                          onChange={(event) =>
                            updateSectionText(
                              section.id,
                              "purpose",
                              event.target.value,
                            )
                          }
                          className="mt-2 min-h-20 w-full rounded-2xl border border-[#d8e6df] bg-white p-3 disabled:bg-[#edf3f1]"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-[#10231f]">
                          Paragraphs
                        </label>

                        <textarea
                          value={section.paragraphs.join("\n")}
                          disabled={section.locked}
                          onChange={(event) =>
                            updateSectionText(
                              section.id,
                              "paragraphs",
                              event.target.value,
                            )
                          }
                          className="mt-2 min-h-32 w-full rounded-2xl border border-[#d8e6df] bg-white p-3 disabled:bg-[#edf3f1]"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-[#10231f]">
                          Bullet points
                        </label>

                        <textarea
                          value={section.bulletPoints.join("\n")}
                          disabled={section.locked}
                          onChange={(event) =>
                            updateSectionText(
                              section.id,
                              "bulletPoints",
                              event.target.value,
                            )
                          }
                          className="mt-2 min-h-40 w-full rounded-2xl border border-[#d8e6df] bg-white p-3 disabled:bg-[#edf3f1]"
                        />
                      </div>
                    </div>

                    {section.exhibitLabels.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {section.exhibitLabels.map((label, index) => (
                          <span
                            key={`${section.id}-${label}-${index}`}
                            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2f7d67]"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}

                    {section.warnings.length > 0 && (
                      <div className="mt-5 rounded-2xl border border-[#f3d6a2] bg-white p-4">
                        <h4 className="font-semibold text-[#92400e]">
                          Section warnings
                        </h4>

                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
                          {section.warnings.map((warning, index) => (
                            <li key={`${section.id}-warning-${index}`}>
                              {warning}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Plain text preview</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d675f]">
                    Use this preview to review the document as one continuous
                    draft before exporting or moving it into a court package.
                  </p>
                </div>

                <Link
                  href={exportHref}
                  className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
                >
                  Continue to Export
                </Link>
              </div>

              <pre className="mt-5 max-h-[500px] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5 text-sm text-[#24463d]">
                {plainTextPreview}
              </pre>
            </section>

            <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Revision history</h2>

              <div className="mt-5 space-y-3">
                {workspaceDocument.revisionHistory.map((revision) => (
                  <div
                    key={revision.id}
                    className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4"
                  >
                    <p className="text-sm font-semibold text-[#2f7d67]">
                      {revision.action}
                    </p>

                    <p className="mt-1 text-sm text-[#49635c]">
                      {revision.description}
                    </p>

                    <p className="mt-2 text-xs text-[#6b8078]">
                      {revision.createdAt}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">
                Connected litigation workflow
              </h2>

              <p className="mt-3 max-w-3xl text-[#4d675f]">
                Drafting workspaces connect directly into evidence, forms,
                litigation strategy, court package assembly, trial preparation,
                AI drafting assistance, and export-ready litigation packages.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={assistantHref}
                  className="rounded-full border border-[#2f7d67] bg-white px-5 py-2 text-sm font-semibold text-[#2f7d67]"
                >
                  AI Drafting Assistant
                </Link>

                <Link
                  href={strategyHref}
                  className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
                >
                  Litigation Strategy
                </Link>

                <Link
                  href={courtPackageHref}
                  className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
                >
                  Court Package
                </Link>

                <Link
                  href={trialPackageHref}
                  className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
                >
                  Trial Package
                </Link>

                <Link
                  href={exportHref}
                  className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
                >
                  Export Workspace
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default function DocumentWorkspacePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f8faf8] text-[#16302b]">
          Loading document workspace...
        </main>
      }
    >
      <DocumentWorkspacePageContent />
    </Suspense>
  );
}