"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  analyzeEvidenceBundle,
  analyzeEvidenceItem,
  type EvidenceItem,
} from "../../src/lib/case-system/evidenceEngine";

import {
  assembleEvidencePackage,
  type AssembledExhibit,
} from "../../src/lib/case-system/evidenceAssemblyEngine";

import { getRawEvidenceReadyForAssemblyLocal } from "../../src/lib/case-system/rawEvidenceStorage";
import { saveEvidencePackageLocal } from "../../src/lib/case-system/evidenceStorage";
import { saveCaseContextLocal } from "../../src/lib/case-system/caseContextStorage";
import { supabase } from "../../src/lib/supabase/client";

type CourtPath = "family" | "small-claims" | "civil" | "unknown";

type ParsedMessage = {
  date: string;
  time: string;
  sender: string;
  message: string;
};

type CaseSnapshot = {
  id: string;
  title: string;
  court_path: CourtPath;
  current_stage: string | null;
  master_result: unknown;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeCourtPath(value: unknown): CourtPath {
  if (value === "family" || value === "small-claims" || value === "civil") {
    return value;
  }

  return "unknown";
}

function buildWorkflowHref(route: string, caseId?: string, path?: CourtPath) {
  const params = new URLSearchParams();

  if (caseId) {
    params.set("caseId", caseId);
  }

  if (path && path !== "unknown") {
    params.set("path", path);
  }

  const query = params.toString();

  return query ? `${route}?${query}` : route;
}

function AnalysisBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-[#d8e6df] bg-white p-4">
      <h4 className="font-semibold text-[#10231f]">{title}</h4>

      {items.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#24463d]">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[#6b8078]">No issues detected yet.</p>
      )}
    </div>
  );
}

function EvidencePageContent() {
  const searchParams = useSearchParams();

  const caseIdFromUrl = searchParams.get("caseId") || "";
  const pathFromUrl = normalizeCourtPath(searchParams.get("path"));
  const activeCaseId = caseIdFromUrl || "draft-case";

  const [parsedMessages, setParsedMessages] = useState<ParsedMessage[]>([]);
  const [assembledExhibits, setAssembledExhibits] = useState<
    AssembledExhibit[]
  >([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [caseSnapshot, setCaseSnapshot] = useState<CaseSnapshot | null>(null);
  const [loadingCase, setLoadingCase] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [saveError, setSaveError] = useState("");

  const casePath = normalizeCourtPath(caseSnapshot?.court_path || pathFromUrl);

  useEffect(() => {
    const rawMessages = localStorage.getItem("courtsimplified_parsed_messages");

    if (rawMessages) {
      try {
        const parsed = JSON.parse(rawMessages);
        setParsedMessages(Array.isArray(parsed) ? parsed : []);
      } catch {
        setParsedMessages([]);
      }
    }

    const rawEvidence = getRawEvidenceReadyForAssemblyLocal(activeCaseId);
    const fallbackRawEvidence =
      activeCaseId !== "draft-case"
        ? getRawEvidenceReadyForAssemblyLocal("draft-case")
        : [];

    const evidenceSource =
      rawEvidence.length > 0 ? rawEvidence : fallbackRawEvidence;

    if (evidenceSource.length > 0) {
      const assembled = assembleEvidencePackage(evidenceSource);
      setAssembledExhibits(assembled.exhibits);
    }
  }, [activeCaseId]);

  useEffect(() => {
    async function loadCaseSnapshot() {
      if (!caseIdFromUrl) return;

      setLoadingCase(true);

      const { data, error } = await supabase
        .from("cases")
        .select("id,title,court_path,current_stage,master_result")
        .eq("id", caseIdFromUrl)
        .single();

      if (!error && data) {
        setCaseSnapshot(data as CaseSnapshot);
      }

      setLoadingCase(false);
    }

    loadCaseSnapshot();
  }, [caseIdFromUrl]);

  function toggleSelect(index: number) {
    setSelectedIndexes((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index],
    );
  }

  function buildManualExhibitFromMessages() {
    if (selectedIndexes.length === 0) return;

    const selectedMessages = selectedIndexes
      .map((index) => parsedMessages[index])
      .filter(Boolean);

    if (selectedMessages.length === 0) return;

    const label = `A${assembledExhibits.length + 1}`;

    const content = selectedMessages
      .map((message) => {
        return `${message.date} ${message.time} — ${message.sender}: ${message.message}`;
      })
      .join("\n");

    const manualExhibit: AssembledExhibit = {
      id: `manual-${Date.now()}`,
      label,
      title: `Communication evidence ${assembledExhibits.length + 1}`,
      description: "Messages manually grouped by the user.",
      relevance:
        "This exhibit may support chronology, notice, admissions, denials, credibility, or communication patterns.",
      category: "Messages / communications",
      date: selectedMessages[0]?.date || "",
      source: selectedMessages
        .map((message) => message.sender)
        .filter(Boolean)
        .join(", "),
      relatedIssue: "",
      relatedLegalElement: "",
      exhibitGroup: "A — Messages and communications",
      exhibitNumber: label,
      content,
      assembledBySystem: true,
      userReviewed: false,
      userEdited: false,
      assemblyConfidence: "moderate",
      assemblyNotes: [
        "This exhibit was manually assembled from selected parsed messages.",
        "User should confirm sender, date, context, completeness, and whether surrounding messages are needed.",
      ],
    };

    setAssembledExhibits((current) => [...current, manualExhibit]);
    setSelectedIndexes([]);
  }

  function updateExhibit(
    id: string | number | undefined,
    field:
      | "title"
      | "description"
      | "relevance"
      | "date"
      | "source"
      | "relatedIssue"
      | "relatedLegalElement",
    value: string,
  ) {
    setAssembledExhibits((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
              userEdited: true,
            }
          : item,
      ),
    );
  }

  function confirmExhibit(id: string | number | undefined) {
    setAssembledExhibits((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              userReviewed: true,
            }
          : item,
      ),
    );
  }

  const evidenceItems: EvidenceItem[] = useMemo(
    () =>
      assembledExhibits.map((item) => ({
        id: item.id,
        label: item.label,
        title: item.title,
        description: item.description,
        relevance: item.relevance,
        category: item.category,
        date: item.date,
        source: item.source,
        content: item.content,
        fileName: item.fileName,
        fileType: item.fileType,
        storagePath: item.storagePath,
        relatedIssue: item.relatedIssue,
        relatedLegalElement: item.relatedLegalElement,
        exhibitGroup: item.exhibitGroup,
        exhibitNumber: item.exhibitNumber,
        supportsClaim: item.supportsClaim,
        supportsDefence: item.supportsDefence,
        linkedForms: item.linkedForms,
        linkedTimelineEvents: item.linkedTimelineEvents,
      })),
    [assembledExhibits],
  );

  const bundleAnalysis = useMemo(
    () => analyzeEvidenceBundle(evidenceItems),
    [evidenceItems],
  );

  async function saveEvidencePackage() {
    setSaveStatus("");
    setSaveError("");

    const reviewedItems = assembledExhibits.filter((item) => item.userReviewed);

    if (reviewedItems.length === 0) {
      setSaveError("Review and confirm at least one exhibit before saving.");
      return;
    }

    const subsystemTimestamp = new Date().toISOString();

    const savedPackage = saveEvidencePackageLocal({
      caseId: activeCaseId,
      title: "CourtSimplified Evidence Package",
      description: "Reviewed evidence package prepared for litigation workflow.",
      evidenceItems: reviewedItems,
      status: "draft",
    });

    saveCaseContextLocal({
      caseId: activeCaseId,
      casePath,
      stage: caseSnapshot?.current_stage || "not-sure",
      partyRole: "unknown",
      title: caseSnapshot?.title || "CourtSimplified Draft Case",
      summary: "Litigation context updated from reviewed evidence package.",
      facts: reviewedItems.map((item) => `${item.label}: ${item.title}`),
      evidenceItems: reviewedItems,
      formNeeds: [],
    });

    localStorage.setItem(
      "courtSimplifiedEvidencePackage",
      JSON.stringify(savedPackage),
    );

    if (caseIdFromUrl) {
      const currentMaster = asObject(caseSnapshot?.master_result);
      const currentMasterCaseFile = asObject(
        currentMaster.masterCaseFile ||
          currentMaster.master_case_file ||
          currentMaster,
      );

      const mergedMasterCaseFile = {
        ...currentMasterCaseFile,
        evidence: reviewedItems,
        evidencePackage: savedPackage,
        evidenceIntelligence: {
          strengths: bundleAnalysis.strengths,
          weaknesses: bundleAnalysis.weaknesses,
          missingInformation: bundleAnalysis.missingInformation,
          risks: bundleAnalysis.risks,
          proofGaps: bundleAnalysis.proofGaps,
          corroborationNotes: bundleAnalysis.corroborationNotes,
          contradictionNotes: bundleAnalysis.contradictionNotes,
          chronologyConcerns: bundleAnalysis.chronologyConcerns,
          credibilityConcerns: bundleAnalysis.credibilityConcerns,
          relationships: bundleAnalysis.relationships,
          exhibitGroups: bundleAnalysis.exhibitGroups,
          packageOrder: bundleAnalysis.packageOrder,
          bundleWarnings: bundleAnalysis.bundleWarnings,
        },
        updatedSubsystems: {
          ...asObject(currentMasterCaseFile.updatedSubsystems),
          evidence: subsystemTimestamp,
          proofMapping: subsystemTimestamp,
          packageAssembly: subsystemTimestamp,
        },
      };

      const mergedMasterResult = {
        ...currentMaster,
        masterCaseFile: mergedMasterCaseFile,
      };

      const { error } = await supabase
        .from("cases")
        .update({
          master_result: mergedMasterResult,
          updated_at: subsystemTimestamp,
        })
        .eq("id", caseIdFromUrl);

      if (error) {
        setSaveError(error.message);
        return;
      }

      setCaseSnapshot((current) =>
        current
          ? {
              ...current,
              master_result: mergedMasterResult,
            }
          : current,
      );
    }

    setSaveStatus(
      `${reviewedItems.length} reviewed exhibit(s) saved into the litigation system.`,
    );
  }

  const workspaceHref = caseIdFromUrl
    ? `/dashboard/cases/${caseIdFromUrl}`
    : "/dashboard";

  const builderHref = buildWorkflowHref("/builder", caseIdFromUrl, casePath);
  const formsHref = buildWorkflowHref("/forms", caseIdFromUrl, casePath);
  const courtPackageHref = buildWorkflowHref(
    "/court-package",
    caseIdFromUrl,
    casePath,
  );
  const strategyHref = buildWorkflowHref(
    "/litigation-strategy",
    caseIdFromUrl,
    casePath,
  );
  const trialPackageHref = buildWorkflowHref(
    "/trial-package",
    caseIdFromUrl,
    casePath,
  );
  const exportHref = buildWorkflowHref(
    "/document-export",
    caseIdFromUrl,
    casePath,
  );

  const reviewedCount = assembledExhibits.filter(
    (item) => item.userReviewed,
  ).length;

  const unreviewedCount = assembledExhibits.length - reviewedCount;

  return (
    <main className="min-h-screen bg-[#f8faf8] p-6 text-[#16302b]">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#2f7d67]">
                Evidence Intelligence
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Evidence Builder and Proof Mapping
              </h1>

              <p className="mt-3 max-w-3xl text-[#4d675f]">
                CourtSimplified auto-assembles exhibits from raw evidence, then
                lets the user review, refine, and confirm them before evidence
                feeds the case workspace, strategy engine, document workspace,
                court package, trial package, and export pipeline.
              </p>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm">
              <p className="font-semibold text-[#10231f]">
                {caseSnapshot?.title || "Draft Evidence Workspace"}
              </p>

              <p className="mt-1 text-[#4d675f]">
                Case ID: {caseIdFromUrl || "draft-case"}
              </p>

              <p className="mt-1 text-[#4d675f]">
                Path: {asString(casePath, "unknown")}
              </p>

              <p className="mt-1 text-[#4d675f]">
                Reviewed: {reviewedCount} / {assembledExhibits.length}
              </p>

              {unreviewedCount > 0 ? (
                <p className="mt-1 text-amber-700">
                  {unreviewedCount} exhibit(s) still need review.
                </p>
              ) : null}

              {loadingCase ? (
                <p className="mt-2 text-[#2f7d67]">Loading case context...</p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={workspaceHref}
              className="rounded-full border border-[#2f7d67] bg-white px-5 py-2 text-sm font-semibold text-[#2f7d67]"
            >
              Back to Case Workspace
            </Link>

            <Link
              href={builderHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Continue Intake
            </Link>

            <Link
              href={formsHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Forms
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
        </section>

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Auto-assembled exhibits</h2>

              <p className="mt-2 text-sm text-[#4d675f]">
                These exhibits are assembled from raw evidence saved through the
                intake and evidence pipeline.
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8fcfa] px-4 py-3 text-sm font-semibold text-[#2f7d67]">
              {assembledExhibits.length} exhibit(s)
            </div>
          </div>
        </section>

        {assembledExhibits.length === 0 && (
          <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              No auto-assembled exhibits yet
            </h2>

            <p className="mt-3 text-[#4d675f]">
              Add raw evidence through the intake/upload flow first, or use the
              manual parsed-message fallback below if message data exists.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
                <h3 className="font-semibold text-[#10231f]">
                  Recommended next step
                </h3>

                <p className="mt-2 text-sm text-[#49635c]">
                  Continue intake or upload raw evidence so the litigation system
                  can begin proof mapping, chronology analysis, contradiction
                  detection, and exhibit assembly.
                </p>

                <Link
                  href={builderHref}
                  className="mt-4 inline-block rounded-full bg-[#2f7d67] px-5 py-2 text-sm font-semibold text-white"
                >
                  Continue Intake →
                </Link>
              </div>

              <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
                <h3 className="font-semibold text-[#10231f]">
                  Evidence intelligence target
                </h3>

                <p className="mt-2 text-sm text-[#49635c]">
                  Evidence should connect directly to legal elements, credibility,
                  damages, procedural risks, affidavits, settlement material,
                  trial preparation, and court package assembly.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              A production evidence system should eventually support upload
              status, exhibit source files, chain-of-custody notes, authenticity
              concerns, missing surrounding context, and whether each item proves
              a specific legal element.
            </div>
          </section>
        )}

        {assembledExhibits.map((group) => {
          const analysis = analyzeEvidenceItem(group);

          return (
            <section
              key={String(group.id)}
              className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#2f7d67]">
                    {group.exhibitGroup}
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    Exhibit {group.label}
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#e6f3ee] px-3 py-1 text-xs font-semibold uppercase text-[#2f7d67]">
                    {group.assemblyConfidence} confidence
                  </span>

                  {group.userEdited && (
                    <span className="rounded-full bg-[#fff4d6] px-3 py-1 text-xs font-semibold uppercase text-[#775b00]">
                      edited
                    </span>
                  )}

                  {group.userReviewed && (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold uppercase text-green-700">
                      reviewed
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <input
                  placeholder="Exhibit title"
                  value={group.title || ""}
                  onChange={(event) =>
                    updateExhibit(group.id, "title", event.target.value)
                  }
                  className="rounded-2xl border border-[#d8e6df] p-3"
                />

                <input
                  placeholder="Date or event reference"
                  value={group.date || ""}
                  onChange={(event) =>
                    updateExhibit(group.id, "date", event.target.value)
                  }
                  className="rounded-2xl border border-[#d8e6df] p-3"
                />

                <input
                  placeholder="Source"
                  value={group.source || ""}
                  onChange={(event) =>
                    updateExhibit(group.id, "source", event.target.value)
                  }
                  className="rounded-2xl border border-[#d8e6df] p-3"
                />

                <input
                  placeholder="Related issue"
                  value={group.relatedIssue || ""}
                  onChange={(event) =>
                    updateExhibit(group.id, "relatedIssue", event.target.value)
                  }
                  className="rounded-2xl border border-[#d8e6df] p-3"
                />

                <input
                  placeholder="Legal proof point"
                  value={group.relatedLegalElement || ""}
                  onChange={(event) =>
                    updateExhibit(
                      group.id,
                      "relatedLegalElement",
                      event.target.value,
                    )
                  }
                  className="rounded-2xl border border-[#d8e6df] p-3 md:col-span-2"
                />
              </div>

              <textarea
                placeholder="What does this evidence show?"
                value={group.description || ""}
                onChange={(event) =>
                  updateExhibit(group.id, "description", event.target.value)
                }
                className="mt-4 min-h-24 w-full rounded-2xl border border-[#d8e6df] p-3"
              />

              <textarea
                placeholder="Why does this evidence matter?"
                value={group.relevance || ""}
                onChange={(event) =>
                  updateExhibit(group.id, "relevance", event.target.value)
                }
                className="mt-4 min-h-24 w-full rounded-2xl border border-[#d8e6df] p-3"
              />

              <div className="mt-5 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
                <p className="text-sm font-semibold text-[#10231f]">
                  Exhibit content
                </p>

                <pre className="mt-3 whitespace-pre-wrap text-sm text-[#24463d]">
                  {group.content || "No content recorded."}
                </pre>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <AnalysisBox
                  title="Proof points"
                  items={analysis.relatedLegalElements}
                />

                <AnalysisBox
                  title="Related issues"
                  items={analysis.relatedIssues}
                />

                <AnalysisBox title="Strengths" items={analysis.strengths} />

                <AnalysisBox
                  title="Missing information"
                  items={analysis.missingInformation}
                />

                <AnalysisBox
                  title="Authenticity/context risks"
                  items={analysis.authenticityRisks}
                />

                <AnalysisBox
                  title="Hearsay/source risks"
                  items={analysis.hearsayRisks}
                />

                <AnalysisBox
                  title="Missing foundation"
                  items={analysis.missingFoundation}
                />

                <AnalysisBox
                  title="Suggested fixes"
                  items={analysis.suggestedFixes}
                />

                <AnalysisBox
                  title="Settlement use"
                  items={analysis.settlementUse}
                />

                <AnalysisBox title="Trial use" items={analysis.trialUse} />
              </div>

              {group.assemblyNotes.length > 0 && (
                <div className="mt-6 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4">
                  <h3 className="font-semibold text-[#10231f]">
                    Assembly notes
                  </h3>

                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[#24463d]">
                    {group.assemblyNotes.map((note, index) => (
                      <li key={`${group.id}-${index}`}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                onClick={() => confirmExhibit(group.id)}
                className="mt-6 rounded-2xl bg-[#2f7d67] px-4 py-2 font-semibold text-white"
              >
                Confirm Exhibit
              </button>
            </section>
          );
        })}

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Manual message grouping fallback
          </h2>

          <p className="mt-3 text-[#4d675f]">
            Users can manually group parsed messages if message evidence exists
            but has not been assembled into exhibits yet.
          </p>

          <div className="mt-5 max-h-[400px] space-y-3 overflow-y-auto">
            {parsedMessages.length === 0 && (
              <p className="text-[#4d675f]">No parsed messages found yet.</p>
            )}

            {parsedMessages.map((msg, index) => (
              <div
                key={`${msg.date}-${msg.time}-${index}`}
                onClick={() => toggleSelect(index)}
                className={`cursor-pointer rounded-2xl border p-3 ${
                  selectedIndexes.includes(index)
                    ? "border-[#2f7d67] bg-[#e9f7f2]"
                    : "border-[#d8e6df] bg-white"
                }`}
              >
                <p className="text-sm font-semibold">
                  {msg.date} {msg.time} — {msg.sender}
                </p>

                <p className="mt-1 text-sm">{msg.message}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={buildManualExhibitFromMessages}
            className="mt-5 rounded-2xl bg-[#2f7d67] px-4 py-2 font-semibold text-white"
          >
            Create Manual Exhibit
          </button>
        </section>

        {assembledExhibits.length > 0 && (
          <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              Bundle-level litigation intelligence
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <AnalysisBox
                title="Bundle strengths"
                items={bundleAnalysis.strengths}
              />

              <AnalysisBox
                title="Bundle weaknesses"
                items={bundleAnalysis.weaknesses}
              />

              <AnalysisBox
                title="Missing information"
                items={bundleAnalysis.missingInformation}
              />

              <AnalysisBox title="Evidence risks" items={bundleAnalysis.risks} />

              <AnalysisBox
                title="Package order"
                items={bundleAnalysis.packageOrder}
              />

              <AnalysisBox
                title="Bundle warnings"
                items={bundleAnalysis.bundleWarnings}
              />
            </div>
          </section>
        )}

        {bundleAnalysis.relationships.length > 0 && (
          <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              Evidence relationship intelligence
            </h2>

            <div className="mt-5 space-y-4">
              {bundleAnalysis.relationships.map((relationship, index) => (
                <div
                  key={`${relationship.type}-${index}`}
                  className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#e6f3ee] px-3 py-1 text-xs font-semibold uppercase text-[#2f7d67]">
                      {relationship.type.replaceAll("_", " ")}
                    </span>

                    <span className="rounded-full bg-[#f0f4f2] px-3 py-1 text-xs font-semibold text-[#49635c]">
                      Severity: {relationship.severity}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-[#24463d]">
                    {relationship.explanation}
                  </p>

                  {relationship.suggestedFix && (
                    <div className="mt-3 rounded-2xl border border-[#d8e6df] bg-white p-3">
                      <p className="text-sm font-semibold text-[#10231f]">
                        Suggested fix
                      </p>

                      <p className="mt-1 text-sm text-[#49635c]">
                        {relationship.suggestedFix}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {assembledExhibits.length > 0 && (
          <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              Litigation intelligence summary
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <AnalysisBox
                title="Corroboration detected"
                items={bundleAnalysis.corroborationNotes}
              />

              <AnalysisBox
                title="Possible contradictions"
                items={bundleAnalysis.contradictionNotes}
              />

              <AnalysisBox
                title="Chronology concerns"
                items={bundleAnalysis.chronologyConcerns}
              />

              <AnalysisBox
                title="Credibility concerns"
                items={bundleAnalysis.credibilityConcerns}
              />

              <AnalysisBox title="Proof gaps" items={bundleAnalysis.proofGaps} />
            </div>
          </section>
        )}

        {bundleAnalysis.exhibitGroups.length > 0 && (
          <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Exhibit group preview</h2>

            <div className="mt-5 space-y-4">
              {bundleAnalysis.exhibitGroups.map((group) => (
                <div
                  key={group.groupTitle}
                  className="rounded-2xl border border-[#d8e6df] p-4"
                >
                  <h3 className="font-bold">{group.groupTitle}</h3>

                  <p className="mt-1 text-sm text-[#49635c]">
                    {group.purpose}
                  </p>

                  <p className="mt-2 text-sm font-semibold text-[#2f7d67]">
                    {group.items.length} item(s)
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {assembledExhibits.length > 0 && (
          <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Save evidence package</h2>

            <p className="mt-3 max-w-3xl text-[#4d675f]">
              Save reviewed exhibits into the litigation memory system so they
              can feed timelines, affidavits, conference briefs, trial binders,
              litigation strategy, and court-ready packages.
            </p>

            {saveError && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {saveError}
              </div>
            )}

            {saveStatus && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                {saveStatus}
              </div>
            )}

            <button
              type="button"
              onClick={saveEvidencePackage}
              className="mt-5 rounded-2xl bg-[#2f7d67] px-6 py-3 font-semibold text-white"
            >
              Save Evidence Package
            </button>
          </section>
        )}

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Connected litigation workflow
          </h2>

          <p className="mt-3 max-w-3xl text-[#4d675f]">
            Evidence should continuously feed the broader litigation system,
            including proof mapping, timeline analysis, drafting assistance,
            affidavits, litigation strategy, court package assembly, trial
            preparation, and export.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={workspaceHref}
              className="rounded-full border border-[#2f7d67] bg-white px-5 py-2 text-sm font-semibold text-[#2f7d67]"
            >
              Case Workspace
            </Link>

            <Link
              href={formsHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Forms
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
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Export
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function EvidencePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f8faf8] text-[#16302b]">
          Loading evidence workspace...
        </main>
      }
    >
      <EvidencePageContent />
    </Suspense>
  );
}