"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  getCanonicalFormLookup,
  resolveSelectedFormsCase,
  SELECTED_CASE_UNAVAILABLE_MESSAGE,
  UNLINKED_FORM_RECOMMENDATION_MESSAGE,
  type FormsCourtPath,
} from "../../src/lib/case-system/formsSelectedCase";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type CourtPath = FormsCourtPath;

type CleanFormItem = {
  canonical_form_id: string | null;
  court_type: CourtPath;
  form_number: string;
  official_title: string;
  pdf_path: string | null;
  word_path: string | null;
  form_group: string | null;
  procedure_stage: string | null;
  purpose: string | null;
  version_count: number | null;
  form_source_id?: string | null;
  official_source_url?: string | null;
  form_revision_or_effective_at?: string | null;
  form_checked_at?: string | null;
  form_review_status?: string | null;
};

type OverlaySupportRow = {
  file_path: string;
};

type CaseRecord = {
  id: string;
  court_path?: CourtPath | string | null;
  current_stage?: string | null;
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
  formApplicability?: FormApplicability;
};

type FormApplicability = Record<string, unknown>;
type ApplicabilityQuestion = {
  field_path: string;
  question: string;
  value_type: "boolean" | "string";
  choices: Array<{ value: boolean | string; label: string }>;
  explanation?: string;
};

type VerifiedFormRecommendation = {
  canonicalFormId: string;
  courtType: CourtPath;
  officialTitle: string | null;
  officialSourceUrl: string;
  revisionOrEffectiveAt: string;
  verifiedUseDescription?: string;
};

type FormMatchStatus = "library" | "verified" | "review";

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

function getFormStatus(form: CleanFormItem, verified: Map<string, VerifiedFormRecommendation>): FormMatchStatus {
  return form.canonical_form_id && verified.has(form.canonical_form_id)
    ? "verified"
    : form.form_review_status === "verified-catalog-source"
      ? "review"
      : "library";
}

function getStatusLabel(status: FormMatchStatus) {
  if (status === "verified") return "Verified for this case";
  if (status === "review") return "May require review";
  return "Official catalogue record â€” routing not yet verified";
}

function getStatusClass(status: FormMatchStatus) {
  if (status === "verified") return "border-emerald-300 bg-emerald-50 text-emerald-950";
  if (status === "review") return "border-amber-300 bg-amber-50 text-amber-950";
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
  const [caseUnavailable, setCaseUnavailable] = useState(false);
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [formApplicability, setFormApplicability] = useState<FormApplicability>({});
  const [applicabilityQuestions, setApplicabilityQuestions] = useState<ApplicabilityQuestion[]>([]);
  const [verifiedRecommendations, setVerifiedRecommendations] = useState<
    VerifiedFormRecommendation[]
  >([]);
  const [applicabilitySaving, setApplicabilitySaving] = useState(false);
  const [applicabilityError, setApplicabilityError] = useState("");

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
      setCaseUnavailable(false);

      if (!caseId) {
        setMasterResult(parseStoredMasterResult());
        setFormApplicability({});
        setApplicabilityQuestions([]);
        setVerifiedRecommendations([]);
        setCaseLoading(false);
        return;
      }

      setCaseLoading(true);

      const { data, error } = await supabase
        .from("cases")
        .select("id, court_path, current_stage, master_result")
        .eq("id", caseId)
        .maybeSingle();

      if (error) {
        setMasterResult(null);
        setCaseUnavailable(true);
        setCaseLoading(false);
        return;
      }

      const record = data as CaseRecord | null;
      const loaded = extractMasterResult(record?.master_result);
      const selectedCase = resolveSelectedFormsCase({
        caseId,
        record,
        masterResult: loaded,
      });

      if (!selectedCase) {
        setMasterResult(null);
        setCaseUnavailable(true);
        setCaseLoading(false);
        return;
      }

      setMasterResult(selectedCase.masterResult);
      setFormApplicability(selectedCase.masterResult?.formApplicability || {});
      setPath(selectedCase.courtPath);
      setCaseLoading(false);
    }

    loadCaseContext();
  }, [caseId, initialPath]);

  useEffect(() => {
    async function loadVerifiedRecommendations() {
      setApplicabilityError("");

      if (!caseId || caseLoading || caseUnavailable) {
        setVerifiedRecommendations([]);
        setApplicabilityQuestions([]);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setVerifiedRecommendations([]);
        return;
      }

      const response = await fetch(
        `/api/cases/form-applicability?caseId=${encodeURIComponent(caseId)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (!response.ok) {
        setVerifiedRecommendations([]);
        return;
      }

      const result = await response.json();
      setFormApplicability(result.formApplicability || {});
      setApplicabilityQuestions(Array.isArray(result.applicabilityQuestions) ? result.applicabilityQuestions : []);
      setVerifiedRecommendations(Array.isArray(result.recommendations) ? result.recommendations : []);
    }

    loadVerifiedRecommendations();
  }, [caseId, caseLoading, caseUnavailable]);

  useEffect(() => {
    async function loadForms() {
      setLoading(true);
      setLoadError("");

      const [{ data, error }, provenanceResult] = await Promise.all([
        supabase
        .from("court_form_master_view")
        .select(
          "canonical_form_id, court_type, form_number, official_title, pdf_path, word_path, form_group, procedure_stage, purpose, version_count",
        )
        .eq("court_type", path)
        .order("form_number", { ascending: true })
        .order("official_title", { ascending: true }),
        supabase
          .from("court_form_library")
          .select("canonical_form_id,court_type,form_source_id,official_source_url,form_revision_or_effective_at,form_checked_at,form_review_status")
          .eq("court_type", path)
          .eq("is_active", true),
      ]);

      if (error) {
        setLoadError(error.message);
        setForms([]);
        setLoading(false);
        return;
      }

      const provenanceByCanonicalId = new Map<string, CleanFormItem>();
      if (!provenanceResult.error) for (const item of (provenanceResult.data || []) as CleanFormItem[]) {
        if (item.canonical_form_id && item.form_review_status === "verified-catalog-source" && !provenanceByCanonicalId.has(item.canonical_form_id)) {
          provenanceByCanonicalId.set(item.canonical_form_id, item);
        }
      }
      setForms(((data || []) as CleanFormItem[]).map((form) => ({ ...form, ...(form.canonical_form_id ? provenanceByCanonicalId.get(form.canonical_form_id) : {}) })).sort(sortByFormNumber));
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

  const enrichedForms = useMemo(() => {
    const verifiedByCanonicalId = new Map(verifiedRecommendations.map((item) => [item.canonicalFormId, item]));
    return forms.map((form) => ({
      form,
      status: getFormStatus(form, verifiedByCanonicalId),
      recommendation: form.canonical_form_id ? verifiedByCanonicalId.get(form.canonical_form_id) : undefined,
      overlayReady: Boolean(
        form.pdf_path && overlaySupportedPaths.has(form.pdf_path),
      ),
    }));
  }, [forms, overlaySupportedPaths, verifiedRecommendations]);

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
      overlayCount,
      total: forms.length,
    };
  }, [forms, overlaySupportedPaths]);

  const unlinkedRecommendationLabels = useMemo(
    () =>
      uniqueStrings([
        ...unifiedSignals.requiredLabels,
        ...unifiedSignals.recommendedLabels,
      ]),
    [unifiedSignals],
  );

  const mappingStage = applicableStage(masterResult);

  function answerFor(question: ApplicabilityQuestion): unknown {
    return question.field_path.split(".").reduce<unknown>((value, part) => asRecord(value)?.[part], formApplicability);
  }

  function updateApplicability(question: ApplicabilityQuestion, value: boolean | string) {
    const [, group, field] = question.field_path.split(".");
    setFormApplicability((current) => ({ ...current, [group]: { ...(asRecord(current[group]) || {}), [field]: value } }));
  }

  function applicabilityPatch(): FormApplicability {
    return applicabilityQuestions.reduce<FormApplicability>((patch, question) => {
      const [, group, field] = question.field_path.split(".");
      const answer = answerFor(question);
      if (typeof answer === "boolean" || typeof answer === "string") patch[group] = { ...(asRecord(patch[group]) || {}), [field]: answer };
      return patch;
    }, {});
  }

  async function saveApplicability() {
    if (!caseId || caseLoading || caseUnavailable) return;
    setApplicabilitySaving(true);
    setApplicabilityError("");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setApplicabilitySaving(false);
      setApplicabilityError("Sign in to save form confirmations for this case.");
      return;
    }
    const patch = applicabilityPatch();
    const response = await fetch("/api/cases/form-applicability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ caseId, formApplicability: patch }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setApplicabilityError(result.error || "Could not save form confirmations.");
      setApplicabilitySaving(false);
      return;
    }
    setFormApplicability(result.formApplicability || {});
    setApplicabilityQuestions(Array.isArray(result.applicabilityQuestions) ? result.applicabilityQuestions : []);
    setVerifiedRecommendations(Array.isArray(result.recommendations) ? result.recommendations : []);
    setApplicabilitySaving(false);
  }

  async function generateFilledForm(form: CleanFormItem) {
    try {
      if (caseId && (caseLoading || caseUnavailable)) {
        return;
      }

      const catalogLookup = getCanonicalFormLookup({
        canonicalFormId: form.canonical_form_id,
        courtType: form.court_type,
      });

      if (!catalogLookup) {
        alert(UNLINKED_FORM_RECOMMENDATION_MESSAGE);
        return;
      }

      if (!form.pdf_path) {
        alert("No official PDF version is connected for this form.");
        return;
      }

      setGeneratingKey(catalogLookup.canonicalFormId);

      const {
        data: { session },
      } = caseId ? await supabase.auth.getSession() : { data: { session: null } };

      const response = await fetch("/api/generate-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          canonicalFormId: catalogLookup.canonicalFormId,
          courtType: catalogLookup.courtType,
          ...(caseId ? { caseId } : {}),
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
                Available official forms: {stats.total}
              </p>
              <p className="mt-1 text-[#4f685f]">
                Verified for this case: {verifiedRecommendations.length}
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

        {caseUnavailable ? (
          <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            {SELECTED_CASE_UNAVAILABLE_MESSAGE}
          </section>
        ) : null}

        {!caseId ? (
          <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            <h2 className="text-xl font-bold">Save a case to verify a form recommendation</h2>
            <p className="mt-2">Official forms can be browsed here, but a verified recommendation needs an authenticated selected case and explicit confirmations.</p>
          </section>
        ) : null}

        {caseId && !caseLoading && !caseUnavailable ? (
          <section className="mt-6 rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#10231f]">Verified form confirmation</h2>
            <p className="mt-2 text-sm leading-6 text-[#4f685f]">
              We only show a recommendation after every applicable answer is explicit and verified against the selected case.
            </p>

            {applicabilityQuestions.length ? (
              <div className="mt-4 space-y-4 text-sm">
                {applicabilityQuestions.map((question) => {
                  const answer = answerFor(question);
                  const selectedValue = question.choices.find((choice) => choice.value === answer)?.value;
                  return <label key={question.field_path} className="block font-semibold">{question.question}{question.explanation ? <span className="mt-1 block font-normal text-[#4f685f]">{question.explanation}</span> : null}<select className="mt-2 block w-full rounded-xl border border-[#d8e6df] p-3" value={selectedValue === undefined ? "" : JSON.stringify(selectedValue)} onChange={(event) => { const choice = question.choices.find((item) => JSON.stringify(item.value) === event.target.value); if (choice) updateApplicability(question, choice.value); }}><option value="" disabled>Select an answer</option>{question.choices.map((choice) => <option key={`${typeof choice.value}:${choice.value}`} value={JSON.stringify(choice.value)}>{choice.label}</option>)}</select></label>;
                })}
              </div>
            ) : null}

            {applicabilityQuestions.length ? <button type="button" onClick={saveApplicability} disabled={applicabilitySaving} className="mt-5 rounded-full bg-[#2f7d67] px-5 py-3 text-sm font-bold text-white disabled:opacity-70">{applicabilitySaving ? "Saving..." : "Save confirmations"}</button> : null}
            {applicabilityError ? <p className="mt-3 text-sm font-semibold text-red-700">{applicabilityError}</p> : null}

            {verifiedRecommendations.length ? (
              <div className="mt-5 space-y-3">
                {verifiedRecommendations.map((recommendation) => {
                  const recommendedForm = forms.find((form) => form.canonical_form_id === recommendation.canonicalFormId && form.court_type === recommendation.courtType);
                  return <article key={recommendation.canonicalFormId} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><p className="font-bold">{recommendation.officialTitle || "Official court form"}</p><p className="mt-1 inline-block rounded-full border border-emerald-300 bg-white px-3 py-1 font-semibold">Official source verified</p><p className="mt-2">{recommendation.revisionOrEffectiveAt}</p><a className="mt-2 inline-block font-semibold underline" href={recommendation.officialSourceUrl} target="_blank" rel="noreferrer">Official source</a><p className="mt-2">Review before filing; current court requirements may differ.</p>{recommendedForm ? <button type="button" onClick={() => generateFilledForm(recommendedForm)} disabled={generatingKey === recommendation.canonicalFormId} className="mt-3 rounded-full bg-[#163d35] px-4 py-2 font-bold text-white">Generate this verified form</button> : null}</article>;
                })}
              </div>
            ) : mappingStage === "starting-case" || mappingStage === "responding" ? <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Review required — a verified form recommendation is unavailable until every applicable fact is explicitly confirmed and matches the selected case.</p> : <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Review required — this verified mapping bundle applies only to selected starting or responding stages.</p>}
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
                  <div
                    key={label}
                    className="rounded-2xl border border-[#f3d6a2] bg-[#fff7ed] px-4 py-3 text-[#92400e]"
                  >
                    <p className="font-semibold">{label}</p>
                    <p className="mt-1">{UNLINKED_FORM_RECOMMENDATION_MESSAGE}</p>
                  </div>
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

        {unlinkedRecommendationLabels.length ? (
          <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
            <h2 className="text-xl font-bold">
              Recommended forms needing review
            </h2>
            <p className="mt-2 text-sm leading-6">
              {UNLINKED_FORM_RECOMMENDATION_MESSAGE}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {unlinkedRecommendationLabels.map((label) => (
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
                <option value="library">Official catalogue record</option>
                <option value="verified">Verified for this case</option>
                <option value="review">May require review</option>
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
            {filteredForms.map(({ form, overlayReady, status, recommendation }, index) => {
              const catalogLookup = getCanonicalFormLookup({
                canonicalFormId: form.canonical_form_id,
                courtType: form.court_type,
              });
              const isGenerating =
                generatingKey === catalogLookup?.canonicalFormId;
              const hasPdf = Boolean(form.pdf_path);
              const hasWord = Boolean(form.word_path);

              return (
                <article
                  key={catalogLookup?.canonicalFormId || `unresolved-${form.court_type}-${index}`}
                  className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#2f7d67]">
                          {cleanSpaces(form.form_number)}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusClass(status)}`}
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
                         {[getPathLabel(form.court_type), form.procedure_stage, form.form_group]
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
                      {!catalogLookup ? (
                        <p className="mt-2 font-bold text-[#8a6d1d]">
                          {UNLINKED_FORM_RECOMMENDATION_MESSAGE}
                        </p>
                      ) : null}
                    </div>
                   </div>

                   <div className="mt-5 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm text-[#4f685f]">
                     {recommendation?.verifiedUseDescription ? (
                       <p className="font-semibold text-[#24463d]">{recommendation.verifiedUseDescription}</p>
                     ) : (
                       <p>This official form is listed in the catalogue. Its use has not yet been verified for your case.</p>
                     )}
                     <p className="mt-2">CourtSimplified has not assessed deadlines, service, evidence, eligibility, filing readiness, or whether filing is appropriate.</p>
                     {form.official_source_url ? <a className="mt-2 inline-block font-semibold underline" href={form.official_source_url} target="_blank" rel="noreferrer">Official catalogue source</a> : null}
                     {form.form_revision_or_effective_at ? <p className="mt-2">{form.form_revision_or_effective_at}</p> : null}
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
                          disabled={
                            isGenerating ||
                            !catalogLookup ||
                            (Boolean(caseId) && (caseLoading || caseUnavailable))
                          }
                          className={`rounded-full px-5 py-3 text-sm font-bold text-white ${
                            overlayReady ? "bg-[#163d35]" : "bg-[#5f6f6a]"
                          } ${
                            isGenerating ||
                            !catalogLookup ||
                            (caseId && (caseLoading || caseUnavailable))
                              ? "cursor-not-allowed opacity-70"
                              : ""
                          }`}
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

function applicableStage(masterResult: MasterResult | null): string {
  for (const value of [masterResult?.stage, masterResult?.proceduralStage, masterResult?.currentStage]) {
    if (value === "starting-case" || value === "responding") return value;
  }
  return "";
}
