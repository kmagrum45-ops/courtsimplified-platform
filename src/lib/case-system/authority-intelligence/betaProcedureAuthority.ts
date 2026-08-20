import type { FormsCourtPath } from "../formsSelectedCase";

export type BetaProcedureReviewStatus =
  | "verified-for-workflow"
  | "review-required"
  | "stale"
  | "withdrawn";

export type BetaProcedureDisplayState =
  | "verified-source-linked-workflow"
  | "official-form-linked-recommendation"
  | "review-required";

export type BetaProcedureAuthorityMetadata = {
  authority_source_id?: unknown;
  authority_source_type?: unknown;
  official_source_url?: unknown;
  authority_citation?: unknown;
  authority_pinpoint?: unknown;
  authority_issuing_body?: unknown;
  authority_checked_at?: unknown;
  authority_review_status?: unknown;
  authority_court_area?: unknown;
  authority_topic?: unknown;
  authority_stage_applicability?: unknown;
  canonical_form_id?: unknown;
  canonical_form_court_type?: unknown;
  form_revision_or_effective_at?: unknown;
  form_review_status?: unknown;
  applicability_conditions?: unknown;
  workflow_guidance?: unknown;
  workflow_guidance_review_status?: unknown;
  workflow_guidance_restricted_fields?: unknown;
  workflow_guidance_source_id?: unknown;
  workflow_guidance_source_type?: unknown;
  workflow_guidance_official_source_url?: unknown;
  workflow_guidance_citation?: unknown;
  workflow_guidance_pinpoint?: unknown;
  workflow_guidance_issuing_body?: unknown;
  workflow_guidance_checked_at?: unknown;
  workflow_guidance_court_area?: unknown;
  workflow_guidance_stage_applicability?: unknown;
};

export type ResolvedWorkflowGuidance = {
  displayState: "verified-source-linked-workflow" | "review-required";
  guidance: string[];
  sourceId: string | null;
  sourceType: string | null;
  officialSourceUrl: string | null;
  citation: string | null;
  pinpoint: string | null;
  issuingBody: string | null;
  checkedAt: string | null;
  courtArea: FormsCourtPath | null;
  stageApplicability: string[];
  restrictedFields: string[];
  reviewRequiredReason: string | null;
};

export type ResolvedBetaProcedureAuthority = {
  displayState: BetaProcedureDisplayState;
  authoritySourceId: string | null;
  sourceType: string | null;
  officialSourceUrl: string | null;
  citation: string | null;
  pinpoint: string | null;
  issuingBody: string | null;
  checkedAt: string | null;
  reviewStatus: BetaProcedureReviewStatus;
  courtArea: FormsCourtPath | null;
  topic: string | null;
  stageApplicability: string[];
  canonicalFormId: string | null;
  canonicalFormCourtType: FormsCourtPath | null;
  reviewRequiredReason: string | null;
  permittedWorkflowGuidance: ResolvedWorkflowGuidance;
};

type ExactFormApplicabilityCondition = {
  path: string;
  equals?: string | boolean;
  oneOf?: string[];
};

export type ResolvedExactFormMapping = {
  displayState: "official-form-linked-recommendation" | "review-required";
  canonicalFormId: string | null;
  canonicalFormCourtType: FormsCourtPath | null;
  reviewRequiredReason: string | null;
};

export type ExactCatalogFormProvenance = {
  canonical_form_id?: unknown;
  court_type?: unknown;
  form_source_id?: unknown;
  official_source_url?: unknown;
  form_revision_or_effective_at?: unknown;
  form_checked_at?: unknown;
  form_review_status?: unknown;
};

const CANONICAL_FORM_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RESTRICTED_WORKFLOW_GUIDANCE_CONTENT =
  /\b(?:forms?|affidavits?|deadlines?|urgent|urgency|service|filing|set[- ]aside|extension[- ]of[- ]time)\b/i;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? Array.from(new Set(value.map(text).filter((item): item is string => Boolean(item))))
    : [];
}

function courtPath(value: unknown): FormsCourtPath | null {
  return value === "small-claims" || value === "family" || value === "civil"
    ? value
    : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function valueAtPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    const currentRecord = record(current);
    return currentRecord ? currentRecord[segment] : undefined;
  }, value);
}

function applicabilityConditions(value: unknown): ExactFormApplicabilityCondition[] | null {
  const source = record(value);
  const all = source && Array.isArray(source.all) ? source.all : null;
  if (!all || all.length === 0) return null;

  const conditions = all.map((item) => record(item));
  if (conditions.some((item) => !item)) return null;

  const parsed = conditions.map((item) => {
    const path = text(item!.path);
    const equals = item!.equals;
    const oneOf = item!.oneOf;
    const validEquals = typeof equals === "string" || typeof equals === "boolean";
    const validOneOf = Array.isArray(oneOf) && oneOf.length > 0 &&
      oneOf.every((entry) => typeof entry === "string" && Boolean(entry.trim()));

    if (!path || (validEquals === validOneOf)) return null;

    return validEquals
      ? { path, equals: equals as string | boolean }
      : { path, oneOf: Array.from(new Set(oneOf as string[])) };
  });

  return parsed.some((item) => !item)
    ? null
    : (parsed as ExactFormApplicabilityCondition[]);
}

function validHttpsUrl(value: string | null): boolean {
  if (!value) return false;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function currentCheckedAt(value: string | null, asOf: Date): boolean {
  if (!value) return false;
  const checkedAt = Date.parse(value);
  if (!Number.isFinite(checkedAt) || checkedAt > asOf.getTime()) return false;

  return asOf.getTime() - checkedAt <= 366 * 24 * 60 * 60 * 1000;
}

function reviewStatus(value: string | null): BetaProcedureReviewStatus {
  return value === "verified-for-workflow" ||
    value === "review-required" ||
    value === "stale" ||
    value === "withdrawn"
    ? value
    : "review-required";
}

function containsRestrictedWorkflowGuidanceContent(guidance: string[]): boolean {
  return guidance.some((item) => RESTRICTED_WORKFLOW_GUIDANCE_CONTENT.test(item));
}

function resolveWorkflowGuidance(
  record: BetaProcedureAuthorityMetadata,
  context: { courtArea: FormsCourtPath; procedureStage: string; asOf: Date },
): ResolvedWorkflowGuidance {
  const guidance = stringArray(record.workflow_guidance);
  const sourceId = text(record.workflow_guidance_source_id);
  const sourceType = text(record.workflow_guidance_source_type);
  const officialSourceUrl = text(record.workflow_guidance_official_source_url);
  const citation = text(record.workflow_guidance_citation);
  const pinpoint = text(record.workflow_guidance_pinpoint);
  const issuingBody = text(record.workflow_guidance_issuing_body);
  const checkedAt = text(record.workflow_guidance_checked_at);
  const storedStatus = reviewStatus(text(record.workflow_guidance_review_status));
  const courtArea = courtPath(record.workflow_guidance_court_area);
  const stageApplicability = stringArray(record.workflow_guidance_stage_applicability);
  const restrictedFields = stringArray(record.workflow_guidance_restricted_fields);
  const missing = [
    !guidance.length ? "missing permitted workflow guidance" : "",
    !sourceId ? "missing workflow guidance source ID" : "",
    !sourceType ? "missing workflow guidance source type" : "",
    !validHttpsUrl(officialSourceUrl) ? "missing official HTTPS workflow guidance URL" : "",
    !citation ? "missing workflow guidance citation" : "",
    !pinpoint ? "missing workflow guidance pinpoint" : "",
    !issuingBody ? "missing workflow guidance issuing body" : "",
    !currentCheckedAt(checkedAt, context.asOf) ? "missing or stale workflow guidance checked-at date" : "",
    storedStatus !== "verified-for-workflow"
      ? "workflow guidance is not verified for workflow"
      : "",
    courtArea !== context.courtArea ? "workflow guidance court-area applicability mismatch" : "",
    !stageApplicability.includes(context.procedureStage)
      ? "workflow guidance stage applicability mismatch"
      : "",
    !restrictedFields.length ? "missing restricted raw fields declaration" : "",
    containsRestrictedWorkflowGuidanceContent(guidance)
      ? "workflow guidance contains restricted raw content"
      : "",
  ].filter(Boolean);

  return {
    displayState: missing.length === 0 ? "verified-source-linked-workflow" : "review-required",
    guidance: missing.length === 0 ? guidance : [],
    sourceId,
    sourceType,
    officialSourceUrl,
    citation,
    pinpoint,
    issuingBody,
    checkedAt,
    courtArea,
    stageApplicability,
    restrictedFields,
    reviewRequiredReason: missing.length === 0 ? null : missing.join("; "),
  };
}

export function resolveBetaProcedureAuthority(
  record: BetaProcedureAuthorityMetadata,
  context: { courtArea: FormsCourtPath; procedureStage: string; asOf?: Date },
): ResolvedBetaProcedureAuthority {
  const authoritySourceId = text(record.authority_source_id);
  const sourceType = text(record.authority_source_type);
  const officialSourceUrl = text(record.official_source_url);
  const citation = text(record.authority_citation);
  const pinpoint = text(record.authority_pinpoint);
  const issuingBody = text(record.authority_issuing_body);
  const checkedAt = text(record.authority_checked_at);
  const storedStatus = reviewStatus(text(record.authority_review_status));
  const courtArea = courtPath(record.authority_court_area);
  const topic = text(record.authority_topic);
  const stageApplicability = stringArray(record.authority_stage_applicability);
  const canonicalFormId = text(record.canonical_form_id);
  const canonicalFormCourtType = courtPath(record.canonical_form_court_type);
  const formRevisionOrEffectiveAt = text(record.form_revision_or_effective_at);
  const formReviewStatus = text(record.form_review_status);
  const asOf = context.asOf || new Date();
  const permittedWorkflowGuidance = resolveWorkflowGuidance(record, {
    ...context,
    asOf,
  });
  const hasCanonicalFormId = Boolean(
    canonicalFormId && CANONICAL_FORM_ID_PATTERN.test(canonicalFormId),
  );
  const commonMissing = [
    !authoritySourceId ? "missing authority/source ID" : "",
    !sourceType ? "missing source type" : "",
    !validHttpsUrl(officialSourceUrl) ? "missing official HTTPS source URL" : "",
    !citation ? "missing citation" : "",
    !pinpoint ? "missing pinpoint" : "",
    !issuingBody ? "missing issuing body" : "",
    !topic ? "missing authority topic" : "",
    !currentCheckedAt(checkedAt, asOf) ? "missing or stale checked-at date" : "",
    storedStatus !== "verified-for-workflow" ? "record is not verified for workflow" : "",
    courtArea !== context.courtArea ? "court-area applicability mismatch" : "",
    !stageApplicability.includes(context.procedureStage)
      ? "stage applicability mismatch"
      : "",
    canonicalFormId && !hasCanonicalFormId ? "invalid canonical form ID" : "",
    hasCanonicalFormId && canonicalFormCourtType !== context.courtArea
      ? "canonical form court-area mismatch"
      : "",
  ].filter(Boolean);
  const formMissing = hasCanonicalFormId
    ? [
        !formRevisionOrEffectiveAt ? "missing reviewed form revision/effective information" : "",
        formReviewStatus !== "verified-for-workflow"
          ? "form is not independently verified for workflow"
          : "",
      ].filter(Boolean)
    : [];
  const missing = [...commonMissing, ...formMissing];

  if (missing.length > 0) {
    return {
      displayState: "review-required",
      authoritySourceId,
      sourceType,
      officialSourceUrl,
      citation,
      pinpoint,
      issuingBody,
      checkedAt,
      reviewStatus: storedStatus,
      courtArea,
      topic,
      stageApplicability,
      canonicalFormId: hasCanonicalFormId ? canonicalFormId : null,
      canonicalFormCourtType,
      reviewRequiredReason: missing.join("; "),
      permittedWorkflowGuidance,
    };
  }

  return {
    displayState: hasCanonicalFormId
      ? "official-form-linked-recommendation"
      : "verified-source-linked-workflow",
    authoritySourceId,
    sourceType,
    officialSourceUrl,
    citation,
    pinpoint,
    issuingBody,
    checkedAt,
    reviewStatus: storedStatus,
    courtArea,
    topic,
    stageApplicability,
    canonicalFormId: hasCanonicalFormId ? canonicalFormId : null,
    canonicalFormCourtType,
    reviewRequiredReason: null,
    permittedWorkflowGuidance,
  };
}

export function resolveExactFormMapping(
  record: BetaProcedureAuthorityMetadata,
  context: {
    courtArea: FormsCourtPath;
    procedureStage: string;
    caseFacts: unknown;
    catalogRecord: ExactCatalogFormProvenance | null;
    asOf?: Date;
  },
): ResolvedExactFormMapping {
  const authority = resolveBetaProcedureAuthority(record, context);
  const conditions = applicabilityConditions(record.applicability_conditions);
  const catalogRecord = context.catalogRecord;
  const catalogMissing = [
    !catalogRecord ? "missing canonical catalog record" : "",
    catalogRecord && text(catalogRecord.canonical_form_id) !== authority.canonicalFormId
      ? "canonical catalog ID mismatch"
      : "",
    catalogRecord && courtPath(catalogRecord.court_type) !== authority.canonicalFormCourtType
      ? "canonical catalog court-area mismatch"
      : "",
    catalogRecord && !text(catalogRecord.form_source_id)
      ? "missing canonical catalog source ID"
      : "",
    catalogRecord && !validHttpsUrl(text(catalogRecord.official_source_url))
      ? "missing canonical catalog HTTPS source URL"
      : "",
    catalogRecord && !text(catalogRecord.form_revision_or_effective_at)
      ? "missing canonical catalog revision/effective information"
      : "",
    catalogRecord && !currentCheckedAt(text(catalogRecord.form_checked_at), context.asOf || new Date())
      ? "missing or stale canonical catalog checked-at date"
      : "",
    catalogRecord && text(catalogRecord.form_review_status) !== "verified-catalog-source"
      ? "canonical catalog provenance is not verified"
      : "",
  ].filter(Boolean);
  const failedConditions = !conditions
    ? ["missing or invalid structured applicability conditions"]
    : conditions.filter((condition) => {
      const actual = valueAtPath(context.caseFacts, condition.path);
      return condition.oneOf
        ? typeof actual !== "string" || !condition.oneOf.includes(actual)
        : actual !== condition.equals;
    }).map((condition) => `unconfirmed applicability fact: ${condition.path}`);

  if (
    authority.displayState !== "official-form-linked-recommendation" ||
    catalogMissing.length > 0 ||
    failedConditions.length > 0
  ) {
    return {
      displayState: "review-required",
      canonicalFormId: null,
      canonicalFormCourtType: null,
      reviewRequiredReason: [
        authority.reviewRequiredReason,
        ...catalogMissing,
        ...failedConditions,
      ]
        .filter(Boolean)
        .join("; ") || "form mapping requires review",
    };
  }

  return {
    displayState: "official-form-linked-recommendation",
    canonicalFormId: authority.canonicalFormId,
    canonicalFormCourtType: authority.canonicalFormCourtType,
    reviewRequiredReason: null,
  };
}
