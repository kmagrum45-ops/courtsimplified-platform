"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type CourtPath = "family" | "small-claims" | "civil";

type CleanFormItem = {
  court_type: CourtPath;
  form_number: string;
  official_title: string;
  pdf_path: string | null;
  word_path: string | null;
  form_group: string | null;
  procedure_stage: string | null;
  purpose: string | null;
  version_count: number | null;
};

type OverlaySupportRow = {
  file_path: string;
};

type CaseRecord = {
  id: string;
  case_type?: CourtPath | string | null;
  path?: CourtPath | string | null;
  master_result?: unknown;
};

type WorkflowReadiness = {
  recommendedRoute?: string;
  recommendedNextRoute?: string;
  nextBestRoute?: string;
  stage?: string;
  status?: string;
};

type AssemblyLike = {
  workflow?: {
    readiness?: WorkflowReadiness;
  };
  proceduralState?: {
    stage?: string;
    currentStage?: string;
    warnings?: string[];
  };
  warnings?: string[];
};

type MasterCaseLike = {
  readiness?: unknown;
  systemWarnings?: string[];
};

type MasterResult = {
  caseId?: string;
  path?: CourtPath;
  courtPath?: CourtPath;
  requiredForms?: unknown[];
  requiredNextForms?: unknown[];
  recommendedForms?: unknown[];
  completedForms?: unknown[];
  receivedForms?: unknown[];
  notNeededNow?: unknown[];
  missingInformation?: unknown[];
  risksAndGaps?: unknown[];
  guidance?: unknown[];
  summary?: unknown;
  proceduralStage?: string;
  currentStage?: string;
  stage?: string;
  caseSystemAssembly?: AssemblyLike;
  assembly?: AssemblyLike;
  masterCase?: MasterCaseLike;
  courtSimplifiedArchitecture?: {
    sourceOfTruth?: string;
    architectureMode?: string;
    active?: boolean;
    legacyReasoningIsolated?: boolean;
    warnings?: string[];
  };
  workflowReadiness?: WorkflowReadiness;
  architectureWarnings?: string[];
};

type FormMatchStatus = "required" | "recommended" | "completed" | "library";

type UnifiedFormSignals = {
  requiredLabels: string[];
  recommendedLabels: string[];
  completedLabels: string[];
  missingInformation: string[];
  risksAndGaps: string[];
  guidance: string[];
  architectureWarnings: string[];
  workflowStage: string;
  sourceOfTruth: string;
};

function getCourtPath(value: string | null | undefined): CourtPath {
  if (value === "civil") return "civil";
  if (value === "small-claims") return "small-claims";
  return "family";
}

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/&#39;/g, "'")
    .replace(/[^\w\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSpaces(value: unknown) {
  return String(value || "")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringArray(value: unknown): string[] {
  return safeArray(value)
    .map((item) => cleanSpaces(item))
    .filter(Boolean);
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.map(cleanSpaces).filter(Boolean)));
}

function getPageTitle(path: CourtPath) {
  if (path === "civil") return "Ontario Civil Court Forms";
  if (path === "small-claims") return "Ontario Small Claims Court Forms";
  return "Ontario Family Court Forms";
}

function getPathLabel(path: CourtPath) {
  if (path === "civil") return "Civil";
  if (path === "small-claims") return "Small Claims";
  return "Family";
}

function getPublicUrl(filePath: string) {
  const { data } = supabase.storage.from("court-forms").getPublicUrl(filePath);
  return data.publicUrl;
}

function getFormKey(form: CleanFormItem) {
  return `${form.court_type}-${form.form_number}-${form.official_title}`;
}

function buildWorkflowHref(route: string, caseId: string, path: CourtPath) {
  const params = new URLSearchParams();

  if (caseId) params.set("caseId", caseId);
  params.set("path", path);

  return `${route}?${params.toString()}`;
}

function getSearchText(form: CleanFormItem) {
  return normalize(
    [
      form.form_number,
      form.official_title,
      form.purpose,
      form.form_group,
      form.procedure_stage,
      form.pdf_path,
      form.word_path,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function sortByFormNumber(a: CleanFormItem, b: CleanFormItem) {
  return cleanSpaces(a.form_number).localeCompare(
    cleanSpaces(b.form_number),
    undefined,
    {
      numeric: true,
      sensitivity: "base",
    },
  );
}

function formLabelText(value: unknown): string {
  if (typeof value === "string") return cleanSpaces(value);

  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;

    return cleanSpaces(
      item.form_number ||
        item.formNumber ||
        item.number ||
        item.label ||
        item.title ||
        item.official_title ||
        item.name ||
        "",
    );
  }

  return "";
}

function buildFormNeedSet(values: string[]) {
  return new Set(values.map(normalize).filter(Boolean));
}

function formMatchesNeed(form: CleanFormItem, needSet: Set<string>) {
  const formNumber = normalize(form.form_number);
  const title = normalize(form.official_title);
  const combined = normalize(`${form.form_number} ${form.official_title}`);

  for (const need of needSet) {
    if (!need) continue;
    if (formNumber && need.includes(formNumber)) return true;
    if (formNumber && formNumber.includes(need)) return true;
    if (title && title.includes(need)) return true;
    if (combined && combined.includes(need)) return true;
  }

  return false;
}

function getFormStatus(
  form: CleanFormItem,
  requiredSet: Set<string>,
  recommendedSet: Set<string>,
  completedSet: Set<string>,
): FormMatchStatus {
  if (formMatchesNeed(form, completedSet)) return "completed";
  if (formMatchesNeed(form, requiredSet)) return "required";
  if (formMatchesNeed(form, recommendedSet)) return "recommended";
  return "library";
}

function getStatusLabel(status: FormMatchStatus) {
  if (status === "required") return "Required next form";
  if (status === "recommended") return "Recommended";
  if (status === "completed") return "Already completed";
  return "Official library";
}

function getStatusClass(status: FormMatchStatus) {
  if (status === "required") {
    return "border-[#b45309] bg-[#fff7ed] text-[#92400e]";
  }

  if (status === "recommended") {
    return "border-[#2f7d67] bg-[#f0fdfa] text-[#0f766e]";
  }

  if (status === "completed") {
    return "border-[#4b5563] bg-[#f3f4f6] text-[#374151]";
  }

  return "border-[#d8e6df] bg-[#f8fcfa] text-[#24463d]";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function extractMasterResult(value: unknown): MasterResult | null {
  const record = asRecord(value);

  if (record.master_result && typeof record.master_result === "object") {
    return record.master_result as MasterResult;
  }

  if (record.masterResult && typeof record.masterResult === "object") {
    return record.masterResult as MasterResult;
  }

  if (record.analysis && typeof record.analysis === "object") {
    return {
      ...record,
      ...(record.analysis as Record<string, unknown>),
    } as MasterResult;
  }

  if (Object.keys(record).length > 0) return record as MasterResult;

  return null;
}

function parseStoredMasterResult(): MasterResult | null {
  const keys = [
    "courtSimplifiedMasterResult",
    "master_result",
    "courtSimplifiedCase",
    "caseData",
  ];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const result = extractMasterResult(parsed);

      if (result) return result;
    } catch {
      continue;
    }
  }

  return null;
}

function extractUnifiedFormSignals(
  masterResult: MasterResult | null,
): UnifiedFormSignals {
  const assembly = masterResult?.caseSystemAssembly || masterResult?.assembly || null;

  const workflowReadiness =
    masterResult?.workflowReadiness || assembly?.workflow?.readiness || null;

  const workflowStage =
    cleanSpaces(masterResult?.proceduralStage) ||
    cleanSpaces(masterResult?.currentStage) ||
    cleanSpaces(masterResult?.stage) ||
    cleanSpaces(assembly?.proceduralState?.currentStage) ||
    cleanSpaces(assembly?.proceduralState?.stage) ||
    cleanSpaces(workflowReadiness?.stage) ||
    "Case preparation";

  const requiredLabels = uniqueStrings([
    ...safeArray(masterResult?.requiredNextForms).map(formLabelText),
    ...safeArray(masterResult?.requiredForms).map(formLabelText),
  ]);

  const recommendedLabels = uniqueStrings([
    ...safeArray(masterResult?.recommendedForms).map(formLabelText),
  ]);

  const completedLabels = uniqueStrings([
    ...safeArray(masterResult?.completedForms).map(formLabelText),
    ...safeArray(masterResult?.receivedForms).map(formLabelText),
  ]);

  const architectureWarnings = uniqueStrings([
    ...stringArray(masterResult?.architectureWarnings),
    ...stringArray(masterResult?.courtSimplifiedArchitecture?.warnings),
    ...stringArray(masterResult?.masterCase?.systemWarnings),
    ...stringArray(assembly?.warnings),
  ]);

  return {
    requiredLabels,
    recommendedLabels,
    completedLabels,
    missingInformation: uniqueStrings(stringArray(masterResult?.missingInformation)),
    risksAndGaps: uniqueStrings(stringArray(masterResult?.risksAndGaps)),
    guidance: uniqueStrings(stringArray(masterResult?.guidance)),
    architectureWarnings,
    workflowStage,
    sourceOfTruth:
      cleanSpaces(masterResult?.courtSimplifiedArchitecture?.sourceOfTruth) ||
      "courtSimplifiedBrain",
  };
}

function FormsPageContent() {
  const searchParams = useSearchParams();

  const initialPath = getCourtPath(searchParams.get("path"));
  const initialCaseId = searchParams.get("caseId") || "";

  const [path, setPath] = useState<CourtPath>(initialPath);
  const [caseId] = useState(initialCaseId);
  const [forms, setForms] = useState<CleanFormItem[]>([]);
  const [masterResult, setMasterResult] = useState<MasterResult | null>(null);
  const [overlaySupportedPaths, setOverlaySupportedPaths] = useState<Set<string>>(
    new Set(),
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FormMatchStatus | "all">(
    "all",
  );
  const [loading, setLoading] = useState(true);
  const [caseLoading, setCaseLoading] = useState(Boolean(initialCaseId));
  const [loadError, setLoadError] = useState("");
  const [caseError, setCaseError] = useState("");
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);

  const workspaceHref = caseId ? `/dashboard/cases/${caseId}` : "/dashboard";
  const builderHref = buildWorkflowHref("/builder", caseId, path);
  const evidenceHref = buildWorkflowHref("/evidence", caseId, path);
  const documentWorkspaceHref = buildWorkflowHref(
    "/document-workspace",
    caseId,
    path,
  );
  const strategyHref = buildWorkflowHref("/litigation-strategy", caseId, path);
  const courtPackageHref = buildWorkflowHref("/court-package", caseId, path);
  const trialPackageHref = buildWorkflowHref("/trial-package", caseId, path);
  const exportHref = buildWorkflowHref("/document-export", caseId, path);

  useEffect(() => {
    async function loadCaseContext() {
      setCaseError("");

      if (!caseId) {
        setMasterResult(parseStoredMasterResult());
        setCaseLoading(false);
        return;
      }

      setCaseLoading(true);

      const { data, error } = await supabase
        .from("cases")
        .select("id, case_type, path, master_result")
        .eq("id", caseId)
        .maybeSingle();

      if (error) {
        setCaseError(error.message);
        setMasterResult(parseStoredMasterResult());
        setCaseLoading(false);
        return;
      }

      const record = data as CaseRecord | null;
      const loaded = extractMasterResult(record?.master_result);

      if (loaded) {
        setMasterResult(loaded);
        setPath(
          getCourtPath(
            loaded.path ||
              loaded.courtPath ||
              record?.case_type ||
              record?.path ||
              initialPath,
          ),
        );
      } else {
        setMasterResult(parseStoredMasterResult());
        setPath(getCourtPath(record?.case_type || record?.path || initialPath));
      }

      setCaseLoading(false);
    }

    loadCaseContext();
  }, [caseId, initialPath]);

  useEffect(() => {
    async function loadForms() {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("court_form_clean_view")
        .select(
          "court_type, form_number, official_title, pdf_path, word_path, form_group, procedure_stage, purpose, version_count",
        )
        .eq("court_type", path)
        .order("form_number", { ascending: true })
        .order("official_title", { ascending: true });

      if (error) {
        setLoadError(error.message);
        setForms([]);
        setLoading(false);
        return;
      }

      setForms(((data || []) as CleanFormItem[]).sort(sortByFormNumber));
      setLoading(false);
    }

    loadForms();
  }, [path]);

  useEffect(() => {
    async function loadOverlaySupport() {
      const { data, error } = await supabase
        .from("pdf_overlay_fields")
        .select("file_path");

      if (error) {
        console.warn("Could not load overlay support:", error.message);
        setOverlaySupportedPaths(new Set());
        return;
      }

      setOverlaySupportedPaths(
        new Set(
          ((data || []) as OverlaySupportRow[])
            .map((row) => row.file_path)
            .filter(Boolean),
        ),
      );
    }

    loadOverlaySupport();
  }, []);

  const unifiedSignals = useMemo(
    () => extractUnifiedFormSignals(masterResult),
    [masterResult],
  );

  const formNeedSets = useMemo(() => {
    return {
      requiredSet: buildFormNeedSet(unifiedSignals.requiredLabels),
      recommendedSet: buildFormNeedSet(unifiedSignals.recommendedLabels),
      completedSet: buildFormNeedSet(unifiedSignals.completedLabels),
    };
  }, [unifiedSignals]);

  const enrichedForms = useMemo(() => {
    return forms.map((form) => ({
      form,
      status: getFormStatus(
        form,
        formNeedSets.requiredSet,
        formNeedSets.recommendedSet,
        formNeedSets.completedSet,
      ),
      overlayReady: Boolean(
        form.pdf_path && overlaySupportedPaths.has(form.pdf_path),
      ),
    }));
  }, [forms, formNeedSets, overlaySupportedPaths]);

  const filteredForms = useMemo(() => {
    const q = normalize(search);

    return enrichedForms.filter(({ form, status }) => {
      const searchMatch = !q || getSearchText(form).includes(q);
      const statusMatch = statusFilter === "all" || status === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [enrichedForms, search, statusFilter]);

  const stats = useMemo(() => {
    const overlayCount = forms.filter(
      (form) => form.pdf_path && overlaySupportedPaths.has(form.pdf_path),
    ).length;

    return {
      requiredCount: enrichedForms.filter((item) => item.status === "required")
        .length,
      recommendedCount: enrichedForms.filter(
        (item) => item.status === "recommended",
      ).length,
      completedCount: enrichedForms.filter((item) => item.status === "completed")
        .length,
      overlayCount,
      total: forms.length,
    };
  }, [forms, overlaySupportedPaths, enrichedForms]);

  const unmatchedNeeds = useMemo(() => {
    const labels = [
      ...unifiedSignals.requiredLabels,
      ...unifiedSignals.recommendedLabels,
    ];

    return labels.filter((label) => {
      const labelNorm = normalize(label);
      return !forms.some((form) =>
        formMatchesNeed(form, new Set([labelNorm])),
      );
    });
  }, [unifiedSignals, forms]);

  async function generateFilledForm(form: CleanFormItem) {
    try {
      if (!form.pdf_path) {
        alert("No official PDF version is connected for this form.");
        return;
      }

      const stored =
        localStorage.getItem("courtSimplifiedCase") ||
        localStorage.getItem("caseData") ||
        localStorage.getItem("courtSimplifiedMasterResult") ||
        "{}";

      setGeneratingKey(getFormKey(form));

      let caseData: Record<string, unknown> = {};

      try {
        caseData = JSON.parse(stored);
      } catch {
        caseData = {};
      }

      const response = await fetch("/api/generate-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formId: null,
          formPath: form.pdf_path,
          formType: form.form_number,
          courtPath: form.court_type,
          caseId: caseId || null,
          master_result: masterResult,
          ...caseData,
        }),
      });

      if (!response.ok) {
        let message = "Could not generate form.";

        try {
          const error = await response.json();
          message = error.error || message;
        } catch {
          // keep default
        }

        alert(message);
        setGeneratingKey(null);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${cleanSpaces(form.form_number).replace(/\s+/g, "_")}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
      setGeneratingKey(null);
    } catch (error) {
      console.error(error);
      setGeneratingKey(null);
      alert("Failed to generate filled PDF.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f8faf8] px-6 py-10 text-[#16302b]">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-3xl border border-[#d8e6df] bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#2f7d67]">
                {getPageTitle(path)}
              </p>

              <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#10231f] md:text-5xl">
                Forms command center
              </h1>

              <p className="mt-4 max-w-4xl text-lg leading-8 text-[#4f685f]">
                Review official Ontario court forms through the unified
                CourtSimplified case result. This page renders form status and
                workflow readiness; it does not create a separate legal brain.
              </p>

              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-4 py-2 font-semibold">
                  Path: {getPathLabel(path)}
                </span>

                <span className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-4 py-2 font-semibold">
                  Case ID: {caseId || "draft-case"}
                </span>

                <span className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-4 py-2 font-semibold">
                  Stage: {unifiedSignals.workflowStage}
                </span>

                <span className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-4 py-2 font-semibold">
                  Source: {unifiedSignals.sourceOfTruth}
                </span>

                <span className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-4 py-2 font-semibold">
                  {stats.total} official form(s)
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5 text-sm">
              <p className="font-bold text-[#10231f]">Case form readiness</p>
              <p className="mt-2 text-[#4f685f]">
                Required matched: {stats.requiredCount}
              </p>
              <p className="mt-1 text-[#4f685f]">
                Recommended matched: {stats.recommendedCount}
              </p>
              <p className="mt-1 text-[#4f685f]">
                Completed matched: {stats.completedCount}
              </p>
              <p className="mt-1 text-[#4f685f]">
                Overlay-ready: {stats.overlayCount}
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
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
              Intake
            </Link>

            <Link
              href={evidenceHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Evidence
            </Link>

            <Link
              href={documentWorkspaceHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Document Workspace
            </Link>

            <Link
              href={courtPackageHref}
              className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-2 text-sm font-semibold text-[#24463d]"
            >
              Court Package
            </Link>
          </div>
        </section>

        {caseError ? (
          <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Case context could not be loaded from Supabase, so this page is using
            local draft data where available: {caseError}
          </section>
        ) : null}

        {unifiedSignals.architectureWarnings.length ? (
          <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <h2 className="text-xl font-bold">Architecture warnings</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {unifiedSignals.architectureWarnings.slice(0, 6).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#10231f]">
              Required next forms
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#4f685f]">
              Rendered from unified brain / assembly output.
            </p>

            <div className="mt-4 space-y-2 text-sm">
              {unifiedSignals.requiredLabels.length ? (
                unifiedSignals.requiredLabels.map((label) => (
                  <p
                    key={label}
                    className="rounded-2xl border border-[#f3d6a2] bg-[#fff7ed] px-4 py-3 font-semibold text-[#92400e]"
                  >
                    {label}
                  </p>
                ))
              ) : (
                <p className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] px-4 py-3 text-[#4f685f]">
                  No required next forms were found in the unified case result.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#10231f]">
              Missing information
            </h2>
            <div className="mt-4 space-y-2 text-sm">
              {unifiedSignals.missingInformation.length ? (
                unifiedSignals.missingInformation.slice(0, 6).map((item) => (
                  <p
                    key={item}
                    className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] px-4 py-3 text-[#4f685f]"
                  >
                    {item}
                  </p>
                ))
              ) : (
                <p className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] px-4 py-3 text-[#4f685f]">
                  No missing form information is currently flagged.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#10231f]">Filing risks</h2>
            <div className="mt-4 space-y-2 text-sm">
              {unifiedSignals.risksAndGaps.length ? (
                unifiedSignals.risksAndGaps.slice(0, 6).map((item) => (
                  <p
                    key={item}
                    className="rounded-2xl border border-[#f3d6a2] bg-[#fff7ed] px-4 py-3 text-[#7c4a03]"
                  >
                    {item}
                  </p>
                ))
              ) : (
                <p className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] px-4 py-3 text-[#4f685f]">
                  No form-specific filing risks are currently flagged.
                </p>
              )}
            </div>
          </div>
        </section>

        {unmatchedNeeds.length ? (
          <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="text-xl font-bold">
              Recommended forms needing review
            </h2>
            <p className="mt-2 text-sm leading-6">
              These unified-result labels did not cleanly match a form in the
              official library.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {unmatchedNeeds.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-amber-300 bg-white px-4 py-2 font-semibold"
                >
                  {label}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
            <div>
              <label className="block font-bold text-[#10231f]">
                Search forms
              </label>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by form number, title, purpose, procedure stage, or file type..."
                className="mt-3 w-full rounded-2xl border border-[#d8e6df] bg-white p-4 text-base outline-none focus:border-[#2f7d67]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#10231f]">
                Workflow filter
              </label>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as FormMatchStatus | "all")
                }
                className="mt-3 w-full rounded-2xl border border-[#d8e6df] bg-white p-4 text-base outline-none focus:border-[#2f7d67]"
              >
                <option value="all">All forms</option>
                <option value="required">Required next forms</option>
                <option value="recommended">Recommended forms</option>
                <option value="completed">Completed forms</option>
                <option value="library">Official library only</option>
              </select>
            </div>
          </div>

          <p className="mt-4 text-sm text-[#4f685f]">
            Showing {filteredForms.length} of {forms.length} forms.
          </p>
        </section>

        {loadError ? (
          <section className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
            <h2 className="text-xl font-bold">Could not load forms</h2>
            <p className="mt-2 text-sm">{loadError}</p>
          </section>
        ) : null}

        {(loading || caseLoading) && (
          <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            Loading forms and unified case workflow...
          </section>
        )}

        {!loading && !loadError && filteredForms.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="text-xl font-bold">No matching forms found</h2>
            <p className="mt-2 text-sm">
              Try searching by a shorter form number, document title, procedure
              stage, or issue type.
            </p>
          </section>
        ) : null}

        {!loading && !loadError && filteredForms.length > 0 ? (
          <section className="mt-8 grid gap-5">
            {filteredForms.map(({ form, status, overlayReady }) => {
              const isGenerating = generatingKey === getFormKey(form);
              const hasPdf = Boolean(form.pdf_path);
              const hasWord = Boolean(form.word_path);

              return (
                <article
                  key={getFormKey(form)}
                  className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#2f7d67]">
                          {cleanSpaces(form.form_number)}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(
                            status,
                          )}`}
                        >
                          {getStatusLabel(status)}
                        </span>
                      </div>

                      <h2 className="mt-2 text-2xl font-bold text-[#10231f]">
                        {cleanSpaces(form.official_title)}
                      </h2>

                      <p className="mt-3 max-w-4xl text-sm leading-7 text-[#4f685f]">
                        {cleanSpaces(form.purpose) ||
                          cleanSpaces(form.official_title)}
                      </p>

                      <p className="mt-3 text-sm font-semibold text-[#557168]">
                        {[form.procedure_stage, form.form_group]
                          .map(cleanSpaces)
                          .filter(Boolean)
                          .join(" • ") || "General form"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] px-4 py-3 text-sm">
                      <p className="font-bold text-[#10231f]">Available</p>
                      <p className="mt-1 text-[#4f685f]">
                        {[hasPdf ? "PDF" : "", hasWord ? "Word" : ""]
                          .filter(Boolean)
                          .join(" + ") || "No file connected"}
                      </p>
                      <p
                        className={`mt-2 font-bold ${
                          overlayReady ? "text-[#0f766e]" : "text-[#8a6d1d]"
                        }`}
                      >
                        {overlayReady ? "Overlay-ready" : "Guided/manual review"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm text-[#4f685f]">
                    {hasPdf
                      ? overlayReady
                        ? "CourtSimplified overlay generation is enabled for this form. Review the generated result before filing."
                        : "Official PDF is available. Automatic generation may require field mapping or guided review before it is filing-ready."
                      : "No official PDF is connected in the library. Use the Word version if available, or continue through the document workspace."}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {form.pdf_path ? (
                      <>
                        <button
                          type="button"
                          onClick={() => window.open(getPublicUrl(form.pdf_path!), "_blank")}
                          className="rounded-full bg-[#2f7d67] px-5 py-3 text-sm font-bold text-white"
                        >
                          Open PDF
                        </button>

                        <button
                          type="button"
                          onClick={() => generateFilledForm(form)}
                          disabled={isGenerating}
                          className={`rounded-full px-5 py-3 text-sm font-bold text-white ${
                            overlayReady ? "bg-[#163d35]" : "bg-[#5f6f6a]"
                          } ${isGenerating ? "cursor-not-allowed opacity-70" : ""}`}
                        >
                          {isGenerating
                            ? "Generating..."
                            : overlayReady
                              ? "Generate Filled PDF"
                              : "Try Generate PDF"}
                        </button>
                      </>
                    ) : null}

                    {form.word_path ? (
                      <button
                        type="button"
                        onClick={() => window.open(getPublicUrl(form.word_path!), "_blank")}
                        className="rounded-full border border-[#2f7d67] bg-white px-5 py-3 text-sm font-bold text-[#2f7d67]"
                      >
                        Download Word Form
                      </button>
                    ) : null}

                    <Link
                      href={documentWorkspaceHref}
                      className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-5 py-3 text-sm font-bold text-[#24463d]"
                    >
                      Use in Document Workspace
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}

        <section className="mt-8 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Connected litigation workflow</h2>
          <p className="mt-3 max-w-3xl text-[#4d675f]">
            Forms are rendered from the unified case result and connected to
            evidence, document drafting, litigation strategy, court package
            assembly, trial preparation, and export.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={workspaceHref}
              className="rounded-full border border-[#2f7d67] bg-white px-5 py-2 text-sm font-semibold text-[#2f7d67]"
            >
              Case Workspace
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

export default function FormsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f8faf8] text-[#16302b]">
          Loading forms...
        </main>
      }
    >
      <FormsPageContent />
    </Suspense>
  );
}