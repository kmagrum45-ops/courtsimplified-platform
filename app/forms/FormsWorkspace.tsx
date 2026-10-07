"use client";

/**
 * The court forms tool: the official catalogue for a court, and — for a saved
 * case — the confirmation questions and verified recommendations.
 *
 * Moved here from app/forms/page.tsx on 2026-10-04 so the same tool renders in
 * two places: /forms (the catalogue, no case) and the Forms section of the case
 * page (/cases/[id]/forms), where `embedded` drops this page's own header and
 * the case page's header and section tabs take its place.
 */

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FORM_COMPLETION_PAUSED,
  FORM_COMPLETION_PAUSED_MESSAGE,
  OFFICIAL_COURT_FORMS_URL,
} from "../../src/lib/content-library/phaseScope";
import { createClient } from "@supabase/supabase-js";

import { supabasePublic, isSessionTokenError } from "@/src/lib/supabase/client";

import {
  getCanonicalFormLookup,
  resolveSelectedFormsCase,
  SELECTED_CASE_UNAVAILABLE_MESSAGE,
  UNLINKED_CATALOGUE_ROW_MESSAGE,
  UNLINKED_FORM_RECOMMENDATION_MESSAGE,
  type FormsCourtPath,
} from "../../src/lib/case-system/formsSelectedCase";
import { formSummaryFor } from "../../src/lib/content-library/forms/formSummaries";
import { OFFICIAL_FORMS_FETCHED_AT, officialFormFor } from "../../src/lib/content-library/forms/officialFormLink";
import { assertApprovedUserContent } from "../../src/lib/content-library/outputGuard";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/*
 * The catalogue is read through a client with no session attached, so a
 * rejected login cannot blank public reference data. See the import.
 */

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
  // Plain words (page review, 2026-10-06: "routing not yet verified" on every
  // row was internal status, not something a user can act on).
  if (status === "verified") return "Checked against your case";
  if (status === "review") return "Official form";
  return "Official form";
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

type FormsWorkspaceProps = {
  /** The case to verify forms against. Without it, the query string's caseId is used. */
  caseId?: string;
  courtPath?: string | null;
  /** Rendered inside the case page: no page header, no outer page frame. */
  embedded?: boolean;
};

function FormsPageContent({ caseId: caseIdProp, courtPath: courtPathProp, embedded = false }: FormsWorkspaceProps) {
  const searchParams = useSearchParams();

  const initialPath = getCourtPath(courtPathProp ?? searchParams.get("path"));
  const initialCaseId = caseIdProp ?? (searchParams.get("caseId") || "");

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
  /**
   * Answers the case already holds, pre-selected with where they came from
   * (applicabilitySuggestions.ts, master plan Phase 1). Saved only when the
   * person presses Save.
   */
  const [suggestedAnswers, setSuggestedAnswers] = useState<{ fieldPath: string; value: boolean | string; reason: string }[]>([]);
  const [verifiedRecommendations, setVerifiedRecommendations] = useState<
    VerifiedFormRecommendation[]
  >([]);
  const [applicabilitySaving, setApplicabilitySaving] = useState(false);
  const [applicabilityError, setApplicabilityError] = useState("");

  /**
   * Whether ANY form-routing rule covers this case's procedural stage.
   *
   * The silent-rejection blocker: `authority_stage_applicability` matching is
   * exact membership, so a stage no row lists produced zero forms with no
   * error and no explanation. A user at trial, enforcement, urgent or not-sure
   * saw an empty list and could not tell it apart from "nothing applies to
   * you". The API has computed this since the blocker was found; it was never
   * sent to the client, so the user still could not tell.
   *
   * This states the true thing — no rules cover the stage yet — rather than
   * inventing coverage. Only four of nine UniversalStage values have rows, and
   * two of the four gaps (urgent, not-sure) have no rule behind them and never
   * will: "not-sure" means the user has not told us their stage, and no rule
   * says which form to file then.
   */
  const [stageSupport, setStageSupport] = useState<
    { supported: true } | { supported: false; reason: string; stage: string } | null
  >(null);


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
      setSuggestedAnswers(Array.isArray(result.suggestedApplicability) ? result.suggestedApplicability : []);
      setVerifiedRecommendations(Array.isArray(result.recommendations) ? result.recommendations : []);
      setStageSupport(
        result.stageSupport && typeof result.stageSupport === "object"
          ? (result.stageSupport as typeof stageSupport)
          : null,
      );
    }

    loadVerifiedRecommendations();
  }, [caseId, caseLoading, caseUnavailable]);

  useEffect(() => {
    async function loadForms() {
      setLoading(true);
      setLoadError("");

      /*
       * Read the catalogue through the SESSION-FREE client.
       *
       * The form library is public reference data and needs no session. Read
       * through the signed-in client it inherited the session's access token,
       * so a rejected token ("JWT issued in the future" — clock skew) blanked
       * the whole page with an error that looked like the catalogue was gone.
       * See src/lib/supabase/client.ts.
       */
      const [{ data, error }, provenanceResult] = await Promise.all([
        supabasePublic
        .from("court_form_master_view")
        .select(
          "canonical_form_id, court_type, form_number, official_title, pdf_path, word_path, form_group, procedure_stage, purpose, version_count",
        )
        .eq("court_type", path)
        .order("form_number", { ascending: true })
        .order("official_title", { ascending: true }),
        supabasePublic
          .from("court_form_library")
          .select("canonical_form_id,court_type,form_source_id,official_source_url,form_revision_or_effective_at,form_checked_at,form_review_status")
          .eq("court_type", path)
          .eq("is_active", true),
      ]);

      if (error) {
        /*
         * Say which kind of failure this is.
         *
         * "Could not load forms — JWT issued in the future" told a user the
         * catalogue was broken when the catalogue was fine and the sign-in was
         * stale. Reading without a session should make that impossible here,
         * but if a token error ever does surface, it should read as a sign-in
         * problem rather than as missing data.
         */
        setLoadError(
          isSessionTokenError(error.message)
            ? "Your sign-in could not be verified, so this did not load. Signing out " +
              "and back in usually fixes it. If it keeps happening, the clock on this " +
              `device may be out of step with the server. (${error.message})`
            : error.message,
        );
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
      // Also public reference data — which fields a form PDF supports.
      const { data, error } = await supabasePublic
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
    return {
      total: forms.length,
    };
  }, [forms]);

  const unlinkedRecommendationLabels = useMemo(
    () =>
      uniqueStrings([
        ...unifiedSignals.requiredLabels,
        ...unifiedSignals.recommendedLabels,
      ]),
    [unifiedSignals],
  );

  const mappingStage = applicableStage(masterResult);

  function savedAnswerFor(question: ApplicabilityQuestion): unknown {
    return question.field_path.split(".").reduce<unknown>((value, part) => asRecord(value)?.[part], formApplicability);
  }

  function suggestionFor(question: ApplicabilityQuestion) {
    return savedAnswerFor(question) === undefined
      ? suggestedAnswers.find((suggestion) => suggestion.fieldPath === question.field_path)
      : undefined;
  }

  function answerFor(question: ApplicabilityQuestion): unknown {
    const saved = savedAnswerFor(question);
    return saved === undefined ? suggestionFor(question)?.value : saved;
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
    setSuggestedAnswers(Array.isArray(result.suggestedApplicability) ? result.suggestedApplicability : []);
    setVerifiedRecommendations(Array.isArray(result.recommendations) ? result.recommendations : []);
    setStageSupport(
      result.stageSupport && typeof result.stageSupport === "object"
        ? (result.stageSupport as typeof stageSupport)
        : null,
    );
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
        alert(UNLINKED_CATALOGUE_ROW_MESSAGE);
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

  const Frame = embedded ? "div" : "main";

  return (
    <Frame className={embedded ? "text-[#16302b]" : "min-h-screen bg-[#f8faf8] px-6 py-10 text-[#16302b]"}>
      <div className={embedded ? "" : "mx-auto max-w-7xl"}>
        <section className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              {embedded ? (
                <h2 className="text-2xl font-bold text-[#10231f]">Court forms for this case</h2>
              ) : (
                <>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#2f7d67]">
                    {getPageTitle(path)}
                  </p>
                  <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#10231f] md:text-5xl">
                    Court forms
                  </h1>
                </>
              )}

              <p className="mt-3 max-w-3xl leading-7 text-[#4f685f]">
                {caseId
                  ? "Answer the questions below and we will show which official forms apply to your case, each with its official source. You can also browse every official form for your court."
                  : "Every official form for this court, with its official source and date. Sign in and open a case to see which forms apply to you."}
              </p>

              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-4 py-2 font-semibold">
                  {getPathLabel(path)}
                </span>
                <span className="rounded-full border border-[#d8e6df] bg-[#f8fcfa] px-4 py-2 font-semibold">
                  {stats.total} official form(s)
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-5 text-sm">
              <p className="font-bold text-[#10231f]">Forms for this case</p>
              <p className="mt-2 text-[#4f685f]">
                Available official forms: {stats.total}
              </p>
              {/* Page review 2026-10-07: "Checked against your case: 0" sat
                  beside the form the step names, reading as a contradiction. */}
              {verifiedRecommendations.length ? (
                <p className="mt-1 text-[#4f685f]">
                  Checked against your case: {verifiedRecommendations.length}
                </p>
              ) : null}

              {/*
                States the true reason the list is empty. Without this a user at
                trial, enforcement, or with no stage recorded saw "Verified for
                this case: 0" and had no way to tell "no rules cover your stage"
                apart from "rules were checked and none applied to you".

                It deliberately does NOT suggest a form. Four of nine stages
                have no mapping rows, and two of those gaps have no rule behind
                them to source one from.
              */}
              {stageSupport && !stageSupport.supported ? (
                <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-950">
                  {stageSupport.reason === "no-stage-supplied"
                    ? "No stage is recorded for this case yet, so no form-routing rules have been checked. Recording where the case is up to in Intake will let this list be checked."
                    : `No form-routing rules cover the "${stageSupport.stage}" stage yet. That is a gap in our routing data, not a finding that no forms apply to you — the full official catalogue below is still available to browse.`}
                </p>
              ) : null}
            </div>
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
            <h2 className="text-xl font-bold text-[#10231f]">Check which forms apply</h2>
            <p className="mt-2 text-sm leading-6 text-[#4f685f]">
              Answer these and we will show the official forms that match your answers.
            </p>

            {applicabilityQuestions.length ? (
              <div className="mt-4 space-y-4 text-sm">
                {applicabilityQuestions.map((question) => {
                  const answer = answerFor(question);
                  const selectedValue = question.choices.find((choice) => choice.value === answer)?.value;
                  return <label key={question.field_path} className="block font-semibold">{question.question}{question.explanation ? <span className="mt-1 block font-normal text-[#4f685f]">{question.explanation}</span> : null}{suggestionFor(question) ? <span className="mt-1 block font-normal text-[#2f7d67]">From your case: {suggestionFor(question)!.reason} Change it if that is not right, then save.</span> : null}<select className="mt-2 block w-full rounded-xl border border-[#d8e6df] p-3" value={selectedValue === undefined ? "" : JSON.stringify(selectedValue)} onChange={(event) => { const choice = question.choices.find((item) => JSON.stringify(item.value) === event.target.value); if (choice) updateApplicability(question, choice.value); }}><option value="" disabled>Select an answer</option>{question.choices.map((choice) => <option key={`${typeof choice.value}:${choice.value}`} value={JSON.stringify(choice.value)}>{choice.label}</option>)}</select></label>;
                })}
              </div>
            ) : null}

            {applicabilityQuestions.length ? <button type="button" onClick={saveApplicability} disabled={applicabilitySaving} className="mt-5 rounded-full bg-[#2f7d67] px-5 py-3 text-sm font-bold text-white disabled:opacity-70">{applicabilitySaving ? "Saving..." : "Save confirmations"}</button> : null}
            {applicabilityError ? <p className="mt-3 text-sm font-semibold text-red-700">{applicabilityError}</p> : null}

            {verifiedRecommendations.length ? (
              <div className="mt-5 space-y-3">
                {verifiedRecommendations.map((recommendation) => {
                  const recommendedForm = forms.find(
                    (form) =>
                      form.canonical_form_id === recommendation.canonicalFormId &&
                      form.court_type === recommendation.courtType,
                  );
                  const recommendedFormOverlayReady = Boolean(
                    recommendedForm?.pdf_path &&
                      overlaySupportedPaths.has(recommendedForm.pdf_path),
                  );

                  return (
                    <article
                      key={recommendation.canonicalFormId}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"
                    >
                      <p className="font-bold">{recommendation.officialTitle || "Official court form"}</p>
                      <p className="mt-1 inline-block rounded-full border border-emerald-300 bg-white px-3 py-1 font-semibold">
                        Official source verified
                      </p>
                      <p className="mt-2">{recommendation.revisionOrEffectiveAt}</p>
                      <a
                        className="mt-2 inline-block font-semibold underline"
                        href={recommendation.officialSourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Official source
                      </a>
                      <p className="mt-2">Review before filing; current court requirements may differ.</p>

                      <div className="mt-3 flex flex-wrap gap-3">
                        {recommendedForm?.pdf_path ? (
                          <button
                            type="button"
                            onClick={() => window.open(getPublicUrl(recommendedForm.pdf_path!), "_blank")}
                            className="rounded-full bg-[#163d35] px-4 py-2 font-bold text-white"
                          >
                            Open PDF
                          </button>
                        ) : null}

                        {recommendedForm && recommendedFormOverlayReady ? (
                          <button
                            type="button"
                            onClick={() => generateFilledForm(recommendedForm)}
                            disabled={generatingKey === recommendation.canonicalFormId}
                            className="rounded-full border border-[#163d35] bg-white px-4 py-2 font-bold text-[#163d35] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {generatingKey === recommendation.canonicalFormId
                              ? "Generating..."
                              : "Try auto-filled version (available for this form)"}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : mappingStage === "starting-case" || mappingStage === "responding" ? <p className="mt-5 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm text-[#4f685f]">Answer the questions above and save them to see the forms that match.</p> : <p className="mt-5 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm text-[#4f685f]">We can match forms to your answers only when you are starting a case or responding to one. Every official form is listed below.</p>}
          </section>
        ) : null}

        {/*
          "Architecture warnings" were listed here: internal engine notes
          ("authenticity", "missing-context", "Event is not linked to
          evidence") shown to users as a warning box (page walkthrough,
          2026-10-04). They describe the engine, not the user's forms.
        */}

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          {/* Shown only when the first analysis named forms (page review
              2026-10-07: "did not flag a form" sat under the step's own forms). */}
          {unifiedSignals.requiredLabels.length ? (
          <div className="rounded-3xl border border-[#d8e6df] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#10231f]">
              Required next forms
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#4f685f]">
              Forms your case record points to.
            </p>

            <div className="mt-4 space-y-2 text-sm">
              {(
                unifiedSignals.requiredLabels.map((label) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-[#f3d6a2] bg-[#fff7ed] px-4 py-3 text-[#92400e]"
                  >
                    <p className="font-semibold">{label}</p>
                    <p className="mt-1">{UNLINKED_FORM_RECOMMENDATION_MESSAGE}</p>
                  </div>
                ))
              )}
            </div>
          </div>
          ) : null}

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
            <h2 className="text-xl font-bold text-[#10231f]">To check before filing</h2>
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
                  Nothing about these forms is flagged for you to check yet.
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
                Show
              </label>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as FormMatchStatus | "all")
                }
                className="mt-3 w-full rounded-2xl border border-[#d8e6df] bg-white p-4 text-base outline-none focus:border-[#2f7d67]"
              >
                <option value="all">All forms</option>
                <option value="verified">Checked against your case</option>
              </select>
            </div>
          </div>

          <p className="mt-3 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm leading-6 text-[#4f685f]">
            These are the official Ontario court forms. A form marked &ldquo;checked against your case&rdquo; matches
            the answers you confirmed; the rest are listed so you can find them. The deadline for your step is on
            your Overview. Drafts you start on this site are suggestions for you to edit: review every field
            before filing.
          </p>
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

                      {/*
                        2026-10-04: 63 family rows (and two Small Claims) carried
                        a generic or wrong title in the catalogue ("Child
                        Protection Form" on Form 29A). The official site's own
                        title wins wherever it lists the form.
                      */}
                      <h2 className="mt-2 text-2xl font-bold text-[#10231f]">
                        {officialFormFor(form.court_type, cleanSpaces(form.form_number))?.title ||
                          cleanSpaces(form.official_title)}
                      </h2>

                      {/*
                        2026-09-30. The catalogue's purpose column repeats the
                        title for every form, so the explanation now comes
                        from the forms guide (src/lib/content-library/forms),
                        written from the rule that names the form. A form the
                        guide does not know keeps the old line.
                      */}
                      <p className="mt-3 max-w-4xl text-sm leading-7 text-[#4f685f]">
                        {(() => {
                          const guide = formSummaryFor(form.court_type, cleanSpaces(form.form_number));
                          const explained = guide ? assertApprovedUserContent(guide.summary, "FormsPage:form-guide") : "";
                          return explained || cleanSpaces(form.purpose) || cleanSpaces(form.official_title);
                        })()}
                      </p>
                      {formSummaryFor(form.court_type, cleanSpaces(form.form_number)) ? (
                        <a
                          href={`/forms/guide?court=${form.court_type}#form-${formSummaryFor(form.court_type, cleanSpaces(form.form_number))!.number}`}
                          className="mt-1 inline-block text-sm font-semibold text-[#2f7d67] underline"
                        >
                          What the rules say about this form
                        </a>
                      ) : null}

                      {/* The "Family • already-started • Service" line showed raw
                          catalogue keys (page review, 2026-10-07); the page is
                          already one court's list. */}
                    </div>

                    <div className="rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] px-4 py-3 text-sm">
                      <p className="font-bold text-[#10231f]">Available</p>
                      <p className="mt-1 text-[#4f685f]">
                        {[hasPdf ? "PDF" : "", hasWord ? "Word" : ""]
                          .filter(Boolean)
                          .join(" + ") || "No file connected"}
                      </p>
                      {!catalogLookup ? (
                        <p className="mt-2 text-[#4f685f]">
                          {UNLINKED_CATALOGUE_ROW_MESSAGE}
                        </p>
                      ) : null}
                    </div>
                   </div>

                   <div className="mt-5 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm text-[#4f685f]">
                     {/*
                       The two caveats that sat here on every card (catalogue
                       status, "has not assessed deadlines...") are said once,
                       above the list (page walkthrough, 2026-10-04: repeated on
                       every card, they buried what told the forms apart).
                     */}
                     {recommendation?.verifiedUseDescription ? (
                       <p className="font-semibold text-[#24463d]">{recommendation.verifiedUseDescription}</p>
                     ) : null}
                     {form.official_source_url ? <a className="mt-2 inline-block font-semibold underline" href={form.official_source_url} target="_blank" rel="noreferrer">Official catalogue source</a> : null}
                     {form.form_revision_or_effective_at ? <p className="mt-2">{form.form_revision_or_effective_at}</p> : null}
                   </div>

                   <div className="mt-5 rounded-2xl border border-[#d8e6df] bg-[#f8fcfa] p-4 text-sm text-[#4f685f]">
                    {hasPdf
                      ? "Download the official form and fill it in yourself."
                      : "No official PDF is connected in the library. Use the Word version if available."}
                    {hasPdf && overlayReady ? (
                      <span className="mt-2 block font-semibold text-[#0f766e]">
                        An experimental auto-filled version is also available
                        for this specific form only — always double-check
                        every field before filing.
                      </span>
                    ) : null}
                  </div>

                  {(() => {
                    // The current official file, straight from
                    // ontariocourtforms.on.ca (2026-10-04). A stored copy can
                    // fall behind a new version; this link cannot.
                    const official = officialFormFor(form.court_type, cleanSpaces(form.form_number));
                    if (!official || (!official.pdf && !official.docx)) return null;
                    return (
                      <div className="mt-5 flex flex-wrap items-center gap-3" data-testid="official-form-links">
                        {official.pdf ? (
                          <a href={official.pdf} target="_blank" rel="noreferrer" className="rounded-full bg-[#16302b] px-5 py-3 text-sm font-bold text-white">
                            Current official PDF
                          </a>
                        ) : null}
                        {official.docx ? (
                          <a href={official.docx} target="_blank" rel="noreferrer" className="rounded-full border border-[#16302b] px-5 py-3 text-sm font-bold text-[#16302b]">
                            Current official Word file
                          </a>
                        ) : null}
                        <span className="text-xs text-[#4f685f]">
                          Version {official.date || "not stated"}, checked {OFFICIAL_FORMS_FETCHED_AT} on ontariocourtforms.on.ca
                        </span>
                      </div>
                    );
                  })()}

                  <div className="mt-5 flex flex-wrap gap-3">
                    {form.pdf_path ? (
                      <button
                        type="button"
                        onClick={() => window.open(getPublicUrl(form.pdf_path!), "_blank")}
                        className="rounded-full bg-[#2f7d67] px-5 py-3 text-sm font-bold text-white"
                      >
                        Open PDF
                      </button>
                    ) : null}

                    {form.pdf_path && overlayReady ? (
                      <button
                        type="button"
                        onClick={() => generateFilledForm(form)}
                        disabled={
                          isGenerating ||
                          !catalogLookup ||
                          (Boolean(caseId) && (caseLoading || caseUnavailable))
                        }
                        className={`rounded-full border border-[#2f7d67] bg-white px-5 py-3 text-sm font-bold text-[#2f7d67] ${
                          isGenerating ||
                          !catalogLookup ||
                          (caseId && (caseLoading || caseUnavailable))
                            ? "cursor-not-allowed opacity-70"
                            : ""
                        }`}
                      >
                        {isGenerating
                          ? "Generating..."
                          : "Try auto-filled version (available for this form)"}
                      </button>
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

                    {/* No per-card "write a draft" link: it appeared on clerk-issued forms and on the
                        other side's starting document (walkthrough, 2026-10-04). Drafts is a tab away. */}
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}

      </div>
    </Frame>
  );
}

function FormsPausedNotice() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8faf8] px-6 text-[#16302b]">
      <section className="max-w-xl rounded-2xl border border-[#d8e6df] bg-white p-8">
        <h1 className="text-2xl font-bold">Court forms</h1>
        <p className="mt-4 leading-7">{FORM_COMPLETION_PAUSED_MESSAGE}</p>
        <a
          href={OFFICIAL_COURT_FORMS_URL}
          className="mt-6 inline-block rounded-xl bg-[#2f7d67] px-5 py-3 text-sm font-semibold text-white"
        >
          Go to Ontario Court Forms
        </a>
        <p className="mt-6">
          <Link href="/builder" className="text-sm font-semibold text-[#2f7d67] underline">
            Back to my case
          </Link>
        </p>
      </section>
    </main>
  );
}

export default function FormsWorkspace(props: FormsWorkspaceProps = {}) {
  // Paused: see FORM_COMPLETION_PAUSED in phaseScope.ts.
  if (FORM_COMPLETION_PAUSED) return <FormsPausedNotice />;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-[#16302b]">
          Loading forms...
        </div>
      }
    >
      <FormsPageContent {...props} />
    </Suspense>
  );
}

function applicableStage(masterResult: MasterResult | null): string {
  // The user's confirmed stage first, as the form-applicability route does.
  const confirmed = asRecord(asRecord(masterResult)?.position)?.confirmedStage;
  if (confirmed === "starting-case" || confirmed === "responding") return confirmed;
  for (const value of [masterResult?.stage, masterResult?.proceduralStage, masterResult?.currentStage]) {
    if (value === "starting-case" || value === "responding") return value;
  }
  return "";
}
