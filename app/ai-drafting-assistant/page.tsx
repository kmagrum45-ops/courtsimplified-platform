"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  runDraftingAssistant,
  type DraftingAssistantAction,
  type DraftingAssistantResult,
} from "../../src/lib/case-system/aiDraftingAssistantEngine";

import {
  updateWorkspaceSection,
  updateWorkspaceStatus,
  type WorkspaceDocument,
} from "../../src/lib/case-system/documentWorkspaceEngine";

type AssistantModeOption = {
  value: DraftingAssistantAction;
  label: string;
  description: string;
};

const ASSISTANT_MODE_OPTIONS: AssistantModeOption[] = [
  {
    value: "rewrite-for-clarity",
    label: "Rewrite for clarity",
    description:
      "Make the selected section easier to understand without changing its meaning.",
  },
  {
    value: "make-more-formal",
    label: "Make more formal",
    description:
      "Adjust wording so it sounds more appropriate for court documents.",
  },
  {
    value: "make-plainer-language",
    label: "Make plainer language",
    description: "Simplify the wording while keeping the legal point intact.",
  },
  {
    value: "shorten",
    label: "Shorten",
    description: "Reduce repetition and make the section more direct.",
  },
  {
    value: "expand",
    label: "Expand",
    description: "Add structure and detail where the section is too thin.",
  },
  {
    value: "organize-chronology",
    label: "Organize chronology",
    description: "Improve the order of events and timeline clarity.",
  },
  {
    value: "strengthen-evidence-links",
    label: "Strengthen evidence links",
    description: "Connect the section more clearly to exhibits and proof.",
  },
  {
    value: "identify-weaknesses",
    label: "Identify weaknesses",
    description: "Find weak wording, missing proof, or unclear claims.",
  },
  {
    value: "prepare-opposing-arguments",
    label: "Prepare opposing arguments",
    description: "Check how the other side may attack this section.",
  },
  {
    value: "court-tone-review",
    label: "Court tone review",
    description:
      "Remove wording that may sound emotional, speculative, or unfocused.",
  },
  {
    value: "custom",
    label: "Custom instruction",
    description: "Use your own instruction for this section.",
  },
];

function AssistantBox({
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

function getWorkspaceHealth(document: WorkspaceDocument | null) {
  if (!document) {
    return {
      sections: 0,
      locked: 0,
      warnings: 0,
      editable: 0,
    };
  }

  const locked = document.sections.filter((section) => section.locked).length;
  const warnings = document.sections.filter(
    (section) => section.warnings.length > 0,
  ).length;

  return {
    sections: document.sections.length,
    locked,
    warnings,
    editable: document.sections.length - locked,
  };
}

function AiDraftingAssistantPageContent() {
  const searchParams = useSearchParams();

  const caseId = searchParams.get("caseId") || "";
  const path = searchParams.get("path") || "unknown";

  const [workspaceDocument, setWorkspaceDocument] =
    useState<WorkspaceDocument | null>(null);

  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [action, setAction] =
    useState<DraftingAssistantAction>("rewrite-for-clarity");
  const [customInstruction, setCustomInstruction] = useState("");
  const [assistantResult, setAssistantResult] =
    useState<DraftingAssistantResult | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("courtSimplifiedWorkspaceDocument");

      if (!raw) {
        setWorkspaceDocument(null);
        return;
      }

      const parsed = JSON.parse(raw) as WorkspaceDocument;

      setWorkspaceDocument(parsed);

      if (parsed.sections.length > 0) {
        setSelectedSectionId(parsed.sections[0].id);
      }
    } catch {
      setWorkspaceDocument(null);
    }
  }, []);

  const selectedMode = useMemo(() => {
    return (
      ASSISTANT_MODE_OPTIONS.find((option) => option.value === action) ||
      ASSISTANT_MODE_OPTIONS[0]
    );
  }, [action]);

  const selectedSection = useMemo(() => {
    if (!workspaceDocument) return null;

    return (
      workspaceDocument.sections.find(
        (section) => section.id === selectedSectionId,
      ) || null
    );
  }, [workspaceDocument, selectedSectionId]);

  const workspaceHealth = useMemo(() => {
    return getWorkspaceHealth(workspaceDocument);
  }, [workspaceDocument]);

  const workspaceHref = caseId ? `/dashboard/cases/${caseId}` : "/dashboard";
  const documentWorkspaceHref = buildWorkflowHref(
    "/document-workspace",
    caseId,
    path,
  );
  const evidenceHref = buildWorkflowHref("/evidence", caseId, path);
  const strategyHref = buildWorkflowHref("/litigation-strategy", caseId, path);
  const courtPackageHref = buildWorkflowHref("/court-package", caseId, path);
  const trialPackageHref = buildWorkflowHref("/trial-package", caseId, path);
  const exportHref = buildWorkflowHref("/document-export", caseId, path);

  function persistWorkspace(updated: WorkspaceDocument) {
    setWorkspaceDocument(updated);

    localStorage.setItem(
      "courtSimplifiedWorkspaceDocument",
      JSON.stringify(updated),
    );
  }

  function runAssistant() {
    if (!workspaceDocument) return;

    const result = runDraftingAssistant({
      document: workspaceDocument,
      sectionId: selectedSectionId || undefined,
      action,
      customInstruction,
    });

    setAssistantResult(result);
    setStatusMessage(
      "Drafting review completed. Review suggestions before applying them.",
    );
  }

  function applySuggestion(suggestionId: string) {
    if (!workspaceDocument || !assistantResult) return;

    const suggestion = assistantResult.suggestions.find(
      (item) => item.id === suggestionId,
    );

    if (!suggestion || !suggestion.targetSectionId) return;

    const targetSection = workspaceDocument.sections.find(
      (section) => section.id === suggestion.targetSectionId,
    );

    if (targetSection?.locked) {
      alert(
        "This section is locked. Unlock it in the Document Workspace before applying changes.",
      );
      return;
    }

    const updatedSectionDocument = updateWorkspaceSection(
      workspaceDocument,
      suggestion.targetSectionId,
      {
        heading: suggestion.proposedHeading || targetSection?.heading || "",
        paragraphs: suggestion.proposedParagraphs,
        bulletPoints: suggestion.proposedBulletPoints,
      },
      "ai-assisted",
    );

    const updated = updateWorkspaceStatus(updatedSectionDocument, "in-review");

    persistWorkspace(updated);
    setStatusMessage("Suggestion applied and workspace marked in review.");
  }

  if (!workspaceDocument) {
    return (
      <main className="min-h-screen bg-[#f8faf8] p-6 text-[#16302b]">
        <div className="mx-auto max-w-6xl">
          <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
              Drafting Intelligence
            </p>

            <h1 className="mt-2 text-3xl font-bold">AI Drafting Assistant</h1>

            <p className="mt-3 max-w-3xl text-[#4d675f]">
              No workspace document was found. Create a document workspace first,
              then return here to improve wording, evidence links, court tone,
              chronology, and opposing-argument readiness.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={workspaceHref}
                className="rounded-full border border-[#2f7d67] bg-white px-5 py-2 text-sm font-semibold text-[#2f7d67]"
              >
                Case Workspace
              </Link>

              <Link
                href={documentWorkspaceHref}
                className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
              >
                Create Document Workspace
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
                Drafting Intelligence
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                AI Drafting Assistant
              </h1>

              <p className="mt-3 max-w-3xl text-[#4d675f]">
                Improve one section at a time while preserving the same workspace
                document used by Document Workspace, Court Package, Trial
                Package, and Export.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm">
              <p className="font-semibold text-[#10231f]">
                {workspaceDocument.title}
              </p>

              <p className="mt-1 text-[#4d675f]">
                Status: {workspaceDocument.status}
              </p>

              <p className="mt-1 text-[#4d675f]">
                Sections: {workspaceDocument.sections.length}
              </p>

              <p className="mt-1 text-[#4d675f]">
                Locked: {workspaceHealth.locked}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={workspaceHref}
              className="rounded-full border border-[#2f7d67] bg-white px-5 py-2 text-sm font-semibold text-[#2f7d67]"
            >
              Case Workspace
            </Link>

            <Link
              href={documentWorkspaceHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Document Workspace
            </Link>

            <Link
              href={evidenceHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Evidence
            </Link>

            <Link
              href={strategyHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Strategy
            </Link>

            <Link
              href={courtPackageHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Court Package
            </Link>

            <Link
              href={exportHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Export
            </Link>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Sections
              </p>
              <p className="mt-1 font-semibold">{workspaceHealth.sections}</p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Editable
              </p>
              <p className="mt-1 font-semibold">{workspaceHealth.editable}</p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Locked
              </p>
              <p className="mt-1 font-semibold">{workspaceHealth.locked}</p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] p-4">
              <p className="text-xs font-semibold uppercase text-[#6b8078]">
                Warning sections
              </p>
              <p className="mt-1 font-semibold">{workspaceHealth.warnings}</p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-[#10231f]">
                  Section to review
                </label>

                <select
                  value={selectedSectionId}
                  onChange={(event) => {
                    setSelectedSectionId(event.target.value);
                    setAssistantResult(null);
                    setStatusMessage("");
                  }}
                  className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white p-3 text-sm"
                >
                  {workspaceDocument.sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.heading || "Untitled section"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#10231f]">
                  Drafting action
                </label>

                <select
                  value={action}
                  onChange={(event) =>
                    setAction(event.target.value as DraftingAssistantAction)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#d8e6df] bg-white p-3 text-sm"
                >
                  {ASSISTANT_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-[#4d675f]">
              {selectedMode.description}
            </p>

            {action === "custom" && (
              <div className="mt-5">
                <label className="text-sm font-semibold text-[#10231f]">
                  Custom instruction
                </label>

                <textarea
                  value={customInstruction}
                  onChange={(event) =>
                    setCustomInstruction(event.target.value)
                  }
                  placeholder="Example: Make this section more direct and connect it to Exhibit A1 and damages."
                  className="mt-2 min-h-28 w-full rounded-2xl border border-[#d8e6df] p-3"
                />
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={runAssistant}
                className="rounded-2xl bg-[#2f7d67] px-6 py-3 font-semibold text-white"
              >
                Run Drafting Assistant
              </button>

              {statusMessage ? (
                <span className="text-sm font-semibold text-[#2f7d67]">
                  {statusMessage}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        {selectedSection && (
          <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Current section preview
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d675f]">
                  This is the section being reviewed. Suggestions apply back to
                  this same workspace document.
                </p>
              </div>

              {selectedSection.locked ? (
                <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                  Locked
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
                  Editable
                </span>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5">
              <p className="text-sm font-semibold uppercase text-[#2f7d67]">
                {selectedSection.editSource}
              </p>

              <h3 className="mt-1 text-lg font-bold">
                {selectedSection.heading || "Untitled section"}
              </h3>

              <p className="mt-3 text-sm leading-6 text-[#49635c]">
                {selectedSection.purpose}
              </p>

              {selectedSection.paragraphs.length > 0 && (
                <div className="mt-4 space-y-3">
                  {selectedSection.paragraphs.map((paragraph, index) => (
                    <p
                      key={`${selectedSection.id}-paragraph-${index}`}
                      className="text-sm leading-6 text-[#24463d]"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}

              {selectedSection.bulletPoints.length > 0 && (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
                  {selectedSection.bulletPoints.map((item, index) => (
                    <li key={`${selectedSection.id}-bullet-${index}`}>
                      {item}
                    </li>
                  ))}
                </ul>
              )}

              {selectedSection.exhibitLabels.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedSection.exhibitLabels.map((label, index) => (
                    <span
                      key={`${selectedSection.id}-${label}-${index}`}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#2f7d67]"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}

              {selectedSection.warnings.length > 0 && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    Section warnings
                  </p>

                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
                    {selectedSection.warnings.map((warning, index) => (
                      <li key={`${selectedSection.id}-warning-${index}`}>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {assistantResult && (
          <>
            <section className="mt-8 grid gap-5 md:grid-cols-2">
              <AssistantBox
                title="Assistant warnings"
                items={assistantResult.globalWarnings}
              />

              <AssistantBox
                title="Next steps"
                items={assistantResult.nextSteps}
              />
            </section>

            <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Drafting suggestions</h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4d675f]">
                Review each suggestion before applying it. Applying a suggestion
                updates the same workspace document used by the rest of the
                litigation workflow.
              </p>

              <div className="mt-5 space-y-6">
                {assistantResult.suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-[#2f7d67]">
                          {suggestion.action}
                        </p>

                        <h3 className="mt-1 text-lg font-bold">
                          {suggestion.title}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-[#49635c]">
                          {suggestion.explanation}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => applySuggestion(suggestion.id)}
                        className="rounded-2xl bg-[#2f7d67] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Apply Suggestion
                      </button>
                    </div>

                    {suggestion.proposedHeading && (
                      <div className="mt-5 rounded-2xl border border-[#d8e6df] bg-white p-4">
                        <p className="text-sm font-semibold text-[#10231f]">
                          Proposed heading
                        </p>

                        <p className="mt-2 text-sm text-[#24463d]">
                          {suggestion.proposedHeading}
                        </p>
                      </div>
                    )}

                    {suggestion.proposedParagraphs.length > 0 && (
                      <div className="mt-5 rounded-2xl border border-[#d8e6df] bg-white p-4">
                        <p className="text-sm font-semibold text-[#10231f]">
                          Proposed paragraphs
                        </p>

                        <div className="mt-3 space-y-3">
                          {suggestion.proposedParagraphs.map(
                            (paragraph, index) => (
                              <p
                                key={`${suggestion.id}-paragraph-${index}`}
                                className="text-sm leading-6 text-[#24463d]"
                              >
                                {paragraph}
                              </p>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {suggestion.proposedBulletPoints.length > 0 && (
                      <div className="mt-5 rounded-2xl border border-[#d8e6df] bg-white p-4">
                        <p className="text-sm font-semibold text-[#10231f]">
                          Proposed bullet points
                        </p>

                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
                          {suggestion.proposedBulletPoints.map(
                            (item, index) => (
                              <li key={`${suggestion.id}-bullet-${index}`}>
                                {item}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}

                    {suggestion.warnings.length > 0 && (
                      <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-4">
                        <p className="text-sm font-semibold text-amber-900">
                          Suggestion warnings
                        </p>

                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#24463d]">
                          {suggestion.warnings.map((warning, index) => (
                            <li key={`${suggestion.id}-warning-${index}`}>
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
          </>
        )}

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Connected litigation workflow
          </h2>

          <p className="mt-3 max-w-3xl text-[#4d675f]">
            Drafting assistance must improve the same workspace document used by
            Document Workspace, Strategy, Court Package, Trial Package, and
            Export.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={documentWorkspaceHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Document Workspace
            </Link>

            <Link
              href={strategyHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Strategy
            </Link>

            <Link
              href={courtPackageHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Court Package
            </Link>

            <Link
              href={trialPackageHref}
              className="rounded-full border border-[#d8e6df] bg-white px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Trial Package
            </Link>

            <Link
              href={exportHref}
              className="rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
            >
              Export
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AiDraftingAssistantPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f8faf8] p-6 text-[#16302b]">
          Loading drafting assistant...
        </main>
      }
    >
      <AiDraftingAssistantPageContent />
    </Suspense>
  );
}