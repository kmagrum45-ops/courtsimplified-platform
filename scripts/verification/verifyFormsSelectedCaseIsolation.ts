import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

import {
  getCanonicalFormLookup,
  resolveSelectedFormsCase,
  SELECTED_CASE_UNAVAILABLE_MESSAGE,
  UNLINKED_FORM_RECOMMENDATION_MESSAGE,
} from "../../src/lib/case-system/formsSelectedCase";
import {
  resolveExactFormMapping,
  type BetaProcedureAuthorityMetadata,
  type ExactCatalogFormProvenance,
} from "../../src/lib/case-system/authority-intelligence/betaProcedureAuthority";
import {
  mergeFormApplicability,
  parseApplicabilityQuestions,
  parseFormApplicability,
} from "../../app/api/cases/form-applicability/route";
import { civilPleadingContract } from "../form-certification/bundle11Contract.mjs";

/**
 * The catalogue-provenance and form-mapping certification checks below used
 * to read specific historical migration files and regex-match their SQL
 * text: "this migration's UPDATE/INSERT used only exact canonical_form_id +
 * court_type matching, never a fuzzy/title match, and touched only this
 * approved allowlist." `supabase migration squash` (2026-08-27) collapsed
 * all 26 migrations into one file and, correctly, produced a schema-only
 * dump -- the DML that performed these one-time certifications is gone from
 * every migration file, along with the specific files these checks used to
 * read by path.
 *
 * These checks now verify the same intent against the live database
 * instead: the approved records are certified with the expected identity,
 * and specific known-adjacent/confusable forms are not. One thing does NOT
 * translate: "verified-catalog-source" and similar review-status markers
 * are reused across many bundles over time (39 distinct canonical_form_ids
 * carry "verified-catalog-source" today, not the 9 any single bundle
 * contributed), so "exactly N records in the whole table" is not a safe
 * assertion post-squash -- it would fail for reasons that have nothing to
 * do with a bug. What IS safe, and preserves the original intent, is a
 * two-part check per bundle: (1) every approved record is certified with
 * its expected identity, and (2) specific known-wrong/adjacent forms are
 * confirmed NOT certified -- verified directly against courtsimplified-dev
 * before this rewrite (docs note: 2026-08-27).
 */
dotenv.config({ path: ".env.local", quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and an anon/publishable key are required " +
      "(environment or .env.local) to verify live catalogue and mapping data.",
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

type CourtFormLibraryRow = {
  canonical_form_id: string;
  court_type: string;
  form_review_status: string | null;
  official_source_url: string | null;
  official_title: string | null;
  form_number: string | null;
};

async function fetchCourtFormLibraryByCanonicalId(
  canonicalFormIds: readonly string[],
): Promise<CourtFormLibraryRow[]> {
  const { data, error } = await supabase
    .from("court_form_library")
    .select(
      "canonical_form_id, court_type, form_review_status, official_source_url, official_title, form_number",
    )
    .in("canonical_form_id", canonicalFormIds);
  if (error) {
    throw new Error(`court_form_library query failed: ${error.message}`);
  }
  return data || [];
}

async function fetchCourtFormLibraryByTitleOrNumber(
  needles: readonly string[],
): Promise<CourtFormLibraryRow[]> {
  const rows: CourtFormLibraryRow[] = [];
  for (const needle of needles) {
    const { data, error } = await supabase
      .from("court_form_library")
      .select(
        "canonical_form_id, court_type, form_review_status, official_source_url, official_title, form_number",
      )
      .or(`official_title.ilike.%${needle}%,form_number.ilike.%${needle}%`);
    if (error) {
      throw new Error(`court_form_library query failed: ${error.message}`);
    }
    rows.push(...(data || []));
  }
  return rows;
}

type MappingRuleRow = {
  id: number;
  canonical_form_id: string | null;
  canonical_form_court_type: string | null;
  authority_source_id: string | null;
  authority_bundle_version: string | null;
  applicability_conditions: unknown;
  applicability_questions: unknown;
  is_active: boolean | null;
};

async function fetchActiveMappingRowsByCanonicalId(
  canonicalFormIds: readonly string[],
): Promise<MappingRuleRow[]> {
  const { data, error } = await supabase
    .from("legal_form_mapping_rules")
    .select(
      "id, canonical_form_id, canonical_form_court_type, authority_source_id, authority_bundle_version, applicability_conditions, applicability_questions, is_active",
    )
    .in("canonical_form_id", canonicalFormIds)
    .eq("is_active", true);
  if (error) {
    throw new Error(`legal_form_mapping_rules query failed: ${error.message}`);
  }
  return data || [];
}

async function fetchMappingRowsById(ids: readonly number[]): Promise<MappingRuleRow[]> {
  const { data, error } = await supabase
    .from("legal_form_mapping_rules")
    .select(
      "id, canonical_form_id, canonical_form_court_type, authority_source_id, authority_bundle_version, applicability_conditions, applicability_questions, is_active",
    )
    .in("id", ids);
  if (error) {
    throw new Error(`legal_form_mapping_rules query failed: ${error.message}`);
  }
  return data || [];
}

/** Every expected canonical (form, court area, source) must exist as exactly one active mapping row -- no duplicates, no substitutions. */
async function assertExactActiveMappings(
  label: string,
  expected: readonly { canonicalFormId: string; courtArea: string; sourceId: string }[],
): Promise<void> {
  const rows = await fetchActiveMappingRowsByCanonicalId(
    expected.map((mapping) => mapping.canonicalFormId),
  );
  assert.equal(
    rows.length,
    expected.length,
    `${label}: expected exactly ${expected.length} active mapping row(s), found ${rows.length} ` +
      `(duplicate or missing certification)`,
  );
  for (const mapping of expected) {
    const row = rows.find((candidate) => candidate.canonical_form_id === mapping.canonicalFormId);
    assert.ok(row, `${label}: ${mapping.canonicalFormId} must have an active mapping row`);
    assert.equal(
      row!.canonical_form_court_type,
      mapping.courtArea,
      `${label}: ${mapping.canonicalFormId} must retain its exact court area`,
    );
    assert.equal(
      row!.authority_source_id,
      mapping.sourceId,
      `${label}: ${mapping.canonicalFormId} must retain source ${mapping.sourceId}`,
    );
  }
}

async function main() {

assert.equal(
  SELECTED_CASE_UNAVAILABLE_MESSAGE,
  "This case could not be loaded. Please return to your case dashboard and try again.",
);
assert.equal(
  UNLINKED_FORM_RECOMMENDATION_MESSAGE,
  "Review required — no verified canonical form record is linked.",
);

const canonicalFormId = "550e8400-e29b-41d4-a716-446655440000";

assert.deepEqual(
  getCanonicalFormLookup({ canonicalFormId, courtType: "family" }),
  { canonicalFormId, courtType: "family" },
  "A valid canonical form ID and matching court area must reach catalog lookup",
);
assert.equal(
  getCanonicalFormLookup({ canonicalFormId: "not-a-uuid", courtType: "family" }),
  null,
  "Invalid canonical form IDs must not resolve through alternate metadata",
);
assert.equal(
  getCanonicalFormLookup({ canonicalFormId, courtType: "unknown" }),
  null,
  "A missing or invalid court area must not resolve a canonical form ID",
);

const authorizedCase = resolveSelectedFormsCase({
  caseId: "case-family",
  record: { id: "case-family", court_path: "family" },
  masterResult: { caseId: "case-family", courtPath: "family", summary: "Own case" },
});

assert.deepEqual(authorizedCase, {
  courtPath: "family",
  masterResult: { caseId: "case-family", courtPath: "family", summary: "Own case" },
});

assert.equal(
  resolveSelectedFormsCase({
    caseId: "case-family",
    record: null,
    masterResult: { summary: "Local draft must not be substituted" },
  }),
  null,
  "A failed selected-case read must not resolve local draft data",
);

assert.equal(
  resolveSelectedFormsCase({
    caseId: "case-family",
    record: { id: "another-case", court_path: "family" },
    masterResult: { summary: "Unauthorized case" },
  }),
  null,
  "A missing or unauthorized selected case must not resolve",
);

assert.equal(
  resolveSelectedFormsCase({
    caseId: "case-family",
    record: { id: "case-family", court_path: "family" },
    masterResult: { courtPath: "civil", summary: "Different court area" },
  }),
  null,
  "A selected case must not resolve through a different court area",
);

assert.equal(
  resolveSelectedFormsCase({
    caseId: "",
    record: null,
    masterResult: null,
  }),
  null,
  "Draft-mode handling remains outside selected-case resolution",
);

const formsPageSource = readFileSync("app/forms/page.tsx", "utf8");
const caseLoaderSource = formsPageSource.slice(
  formsPageSource.indexOf("async function loadCaseContext()"),
  formsPageSource.indexOf("async function loadForms()"),
);

assert.match(
  caseLoaderSource,
  /if \(!caseId\) \{\s*setMasterResult\(parseStoredMasterResult\(\)\);/,
  "Draft fallback must remain available only when there is no selected case ID",
);
assert.equal(
  (caseLoaderSource.match(/parseStoredMasterResult\(\)/g) || []).length,
  1,
  "Selected-case failure paths must not substitute local draft data",
);

const formRouteSource = readFileSync("app/api/generate-form/route.ts", "utf8");
const formResolverSource = formRouteSource.slice(
  formRouteSource.indexOf("async function findFormFromCleanView"),
  formRouteSource.indexOf("function getCaseValues"),
);

assert.match(
  formResolverSource,
  /\.eq\("canonical_form_id", lookup\.canonicalFormId\)[\s\S]*\.eq\("court_type", lookup\.courtType\)/,
  "The generation route must resolve the canonical ID in the requested court area",
);
assert.doesNotMatch(
  formResolverSource,
  /formType|formId|formPath|requestedLabel|requestedPath|formSearchText/,
  "The generation route must not fall back to title, form number, path, or label resolution",
);

assert.match(
  formsPageSource,
  /canonicalFormId: catalogLookup\.canonicalFormId,[\s\S]*courtType: catalogLookup\.courtType/,
  "The Forms page must send canonical identity and court area to generation",
);
assert.doesNotMatch(
  formsPageSource,
  /formMatchesNeed|buildFormNeedSet|unmatchedNeeds/,
  "The Forms page must not string-match recommendations to catalog rows",
);

// ---- Bundle 1: catalogue provenance (9 records, court_form_library) ------
const certifiedCatalogRecords = [
  ["a289d2a2-a691-45eb-a625-15c42c6da695", "small-claims"],
  ["a576815d-2bc8-4a13-9502-348eec5819e2", "small-claims"],
  ["b429d68c-e1d4-4eb0-b7a2-4a0069e173d6", "small-claims"],
  ["82d885fe-4f0e-4e37-adce-6c1ff331f3f1", "family"],
  ["4894de57-6511-45b1-a71a-967c884510f5", "family"],
  ["21fd1fd2-2d0f-486d-abbf-41faab3d488c", "family"],
  ["1fead613-b24b-4797-b73c-0edfeb2af3d7", "civil"],
  ["502cd465-720a-4d71-8b6c-a7eefe788657", "civil"],
  ["952b0ad2-1599-4815-be23-d2dfb5aee75d", "civil"],
] as const;

const provenanceRows = await fetchCourtFormLibraryByCanonicalId(
  certifiedCatalogRecords.map(([id]) => id),
);

for (const [certifiedId, courtType] of certifiedCatalogRecords) {
  const matches = provenanceRows.filter(
    (row) => row.canonical_form_id === certifiedId && row.court_type === courtType,
  );
  assert.ok(
    matches.length > 0,
    `Certified record ${certifiedId} must be present in court_form_library for ${courtType}`,
  );
  for (const row of matches) {
    assert.equal(
      row.form_review_status,
      "verified-catalog-source",
      `Certified record ${certifiedId} must carry verified-catalog-source`,
    );
    assert.match(
      row.official_source_url || "",
      /^https:\/\/[^\s]+$/i,
      `Certified record ${certifiedId} must have a bare HTTPS source URL, not Markdown or empty`,
    );
  }
}

function isExactCertifiedCatalogRecord(input: {
  canonicalFormId?: string;
  courtType?: string;
  title?: string;
}): boolean {
  return certifiedCatalogRecords.some(
    ([recordCanonicalFormId, recordCourtType]) =>
      input.canonicalFormId === recordCanonicalFormId && input.courtType === recordCourtType,
  );
}

assert.equal(
  isExactCertifiedCatalogRecord({
    canonicalFormId: "1fead613-b24b-4797-b73c-0edfeb2af3d7",
    courtType: "civil",
  }),
  true,
  "An approved canonical ID is certified only in its exact court area",
);
assert.equal(
  isExactCertifiedCatalogRecord({
    canonicalFormId: "1fead613-b24b-4797-b73c-0edfeb2af3d7",
    courtType: "family",
  }),
  false,
  "Cross-area canonical IDs must be rejected",
);
assert.equal(
  isExactCertifiedCatalogRecord({
    courtType: "civil",
    title: "Statement of Claim (General)",
  }),
  false,
  "A title match without an approved canonical ID must be rejected",
);

// Known-adjacent/confusable forms that must never have been fuzzy-matched
// into certification. Confirmed against courtsimplified-dev (2026-08-27):
// each of these exists as a real, uncertified row (form_review_status is
// null), distinct from the approved canonical IDs above.
const uncertifiedAdjacentForms = [
  "Form 14B",
  "Mortgage Action",
  "Lawyer's Certificate of Service",
  "16b-1",
  "Automatic Order",
  "8.01",
];

const adjacentRows = await fetchCourtFormLibraryByTitleOrNumber(uncertifiedAdjacentForms);
for (const row of adjacentRows) {
  const isApproved = certifiedCatalogRecords.some(
    ([id, courtType]) => id === row.canonical_form_id && courtType === row.court_type,
  );
  assert.equal(
    isApproved || row.form_review_status !== "verified-catalog-source",
    true,
    `${row.official_title || row.form_number} (${row.canonical_form_id}) must remain uncertified unless it is an approved canonical record`,
  );
}

function validCatalogProvenance(record: {
  sourceUrl?: string;
  revisionOrEffectiveAt?: string;
  checkedAt?: string;
  reviewStatus?: string;
}, asOf = new Date("2026-08-10T12:00:00Z")): boolean {
  if (!record.sourceUrl || !/^https:\/\/[^\s]+$/i.test(record.sourceUrl)) return false;
  if (!record.revisionOrEffectiveAt || !record.checkedAt) return false;
  if (record.reviewStatus !== "verified-catalog-source") return false;
  const checkedAt = Date.parse(record.checkedAt);
  return Number.isFinite(checkedAt) && checkedAt <= asOf.getTime() &&
    asOf.getTime() - checkedAt <= 366 * 24 * 60 * 60 * 1000;
}

assert.equal(
  validCatalogProvenance({
    sourceUrl: "https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/",
    revisionOrEffectiveAt: "Version: Feb. 1, 2021; effective: April 6, 2021",
    checkedAt: "2026-08-10",
    reviewStatus: "verified-catalog-source",
  }),
  true,
  "Bare official HTTPS provenance with revision, check date, and review status must pass",
);
for (const invalidRecord of [
  { sourceUrl: "[Ontario](https://ontariocourtforms.on.ca/)" },
  { sourceUrl: "http://ontariocourtforms.on.ca/" },
  { sourceUrl: "https://ontariocourtforms.on.ca/", checkedAt: "2026-08-10", reviewStatus: "verified-catalog-source" },
  { sourceUrl: "https://ontariocourtforms.on.ca/", revisionOrEffectiveAt: "Version: known", reviewStatus: "verified-catalog-source" },
  { sourceUrl: "https://ontariocourtforms.on.ca/", revisionOrEffectiveAt: "Version: known", checkedAt: "2024-08-08", reviewStatus: "review-required" },
]) {
  assert.equal(validCatalogProvenance(invalidRecord), false, "Incomplete, non-HTTPS, Markdown, stale, or unreviewed provenance must fail closed");
}

// ---- Bundle 2: mapping applicability (5 mapping rows, by stable id) ------
const exactMappings = [
  {
    id: 6,
    courtArea: "small-claims" as const,
    stage: "starting-case",
    canonicalFormId: "a289d2a2-a691-45eb-a625-15c42c6da695",
    conditions: {
      all: [
        { path: "courtPath", equals: "small-claims" },
        { path: "province", equals: "Ontario" },
        { path: "stage", equals: "starting-case" },
        { path: "formApplicability.smallClaims.eligibilityConfirmed", equals: true },
        { path: "formApplicability.smallClaims.requestedRemedyType", oneOf: ["ordinary-money-claim", "ordinary-property-claim"] },
      ],
    },
    facts: { courtPath: "small-claims", province: "Ontario", stage: "starting-case", formApplicability: { smallClaims: { eligibilityConfirmed: true, requestedRemedyType: "ordinary-money-claim" } } },
  },
  {
    id: 7,
    courtArea: "small-claims" as const,
    stage: "responding",
    canonicalFormId: "b429d68c-e1d4-4eb0-b7a2-4a0069e173d6",
    conditions: { all: [{ path: "courtPath", equals: "small-claims" }, { path: "province", equals: "Ontario" }, { path: "stage", equals: "responding" }, { path: "formApplicability.smallClaims.respondingToPlaintiffsClaim", equals: true }] },
    facts: { courtPath: "small-claims", province: "Ontario", stage: "responding", formApplicability: { smallClaims: { respondingToPlaintiffsClaim: true } } },
  },
  {
    id: 1,
    courtArea: "family" as const,
    stage: "starting-case",
    canonicalFormId: "82d885fe-4f0e-4e37-adce-6c1ff331f3f1",
    conditions: { all: [{ path: "courtPath", equals: "family" }, { path: "province", equals: "Ontario" }, { path: "stage", equals: "starting-case" }, { path: "formApplicability.family.isGeneralApplication", equals: true }, { path: "formApplicability.family.isDivorceApplication", equals: false }] },
    facts: { courtPath: "family", province: "Ontario", stage: "starting-case", formApplicability: { family: { isGeneralApplication: true, isDivorceApplication: false } } },
  },
  {
    id: 2,
    courtArea: "family" as const,
    stage: "responding",
    canonicalFormId: "4894de57-6511-45b1-a71a-967c884510f5",
    conditions: { all: [{ path: "courtPath", equals: "family" }, { path: "province", equals: "Ontario" }, { path: "stage", equals: "responding" }, { path: "formApplicability.family.respondingToFamilyApplication", equals: true }] },
    facts: { courtPath: "family", province: "Ontario", stage: "responding", formApplicability: { family: { respondingToFamilyApplication: true } } },
  },
  {
    id: 9,
    courtArea: "civil" as const,
    stage: "starting-case",
    canonicalFormId: "1fead613-b24b-4797-b73c-0edfeb2af3d7",
    conditions: { all: [{ path: "courtPath", equals: "civil" }, { path: "province", equals: "Ontario" }, { path: "stage", equals: "starting-case" }, { path: "formApplicability.civil.isGeneralAction", equals: true }, { path: "formApplicability.civil.isApplication", equals: false }, { path: "formApplicability.civil.isMortgageForeclosure", equals: false }, { path: "formApplicability.civil.isCommencedByNoticeOfAction", equals: false }] },
    facts: { courtPath: "civil", province: "Ontario", stage: "starting-case", formApplicability: { civil: { isGeneralAction: true, isApplication: false, isMortgageForeclosure: false, isCommencedByNoticeOfAction: false } } },
  },
] as const;

const mappingApplicabilityRows = await fetchMappingRowsById(exactMappings.map((mapping) => mapping.id));
for (const mapping of exactMappings) {
  const row = mappingApplicabilityRows.find((candidate) => candidate.id === mapping.id);
  assert.ok(row, `Mapping row ${mapping.id} must exist`);
  assert.equal(row!.is_active, true, `Mapping row ${mapping.id} must be active`);
  assert.equal(row!.canonical_form_id, mapping.canonicalFormId, `Mapping row ${mapping.id} must retain its exact canonical form ID`);
  assert.equal(row!.canonical_form_court_type, mapping.courtArea, `Mapping row ${mapping.id} must retain its exact court area`);
  assert.equal(row!.authority_bundle_version, "ontario-beta-form-mapping-v1", `Mapping row ${mapping.id} must carry the Form Readiness bundle version`);
  assert.ok(row!.applicability_conditions, `Mapping row ${mapping.id} must have applicability_conditions`);
  assert.ok(row!.applicability_questions, `Mapping row ${mapping.id} must have applicability_questions`);
}
assert.equal(
  mappingApplicabilityRows.length,
  exactMappings.length,
  "Only the five approved mapping rows may carry the Form Readiness bundle version at these IDs",
);

function reviewedExactMapping(mapping: (typeof exactMappings)[number]): BetaProcedureAuthorityMetadata {
  return {
    authority_source_id: `verified-${mapping.id}`,
    authority_source_type: "primary-procedural-rule",
    official_source_url: "https://www.ontario.ca/laws/regulation/example",
    authority_citation: "Ontario procedural rule",
    authority_pinpoint: "r. 1",
    authority_issuing_body: "Ontario e-Laws",
    authority_checked_at: "2026-08-10",
    authority_review_status: "verified-for-workflow",
    authority_court_area: mapping.courtArea,
    authority_topic: "exact-form-mapping",
    authority_stage_applicability: [mapping.stage],
    canonical_form_id: mapping.canonicalFormId,
    canonical_form_court_type: mapping.courtArea,
    form_revision_or_effective_at: "Verified catalogue revision",
    form_review_status: "verified-for-workflow",
    applicability_conditions: mapping.conditions,
  };
}

function catalogRecord(mapping: (typeof exactMappings)[number]): ExactCatalogFormProvenance {
  return {
    canonical_form_id: mapping.canonicalFormId,
    court_type: mapping.courtArea,
    form_source_id: `catalog-${mapping.id}`,
    official_source_url: "https://ontariocourtforms.on.ca/en/official-forms/",
    form_revision_or_effective_at: "Verified catalogue revision",
    form_checked_at: "2026-08-10",
    form_review_status: "verified-catalog-source",
  };
}

const mappingAsOf = new Date("2026-08-10T12:00:00Z");

for (const mapping of exactMappings) {
  const resolved = resolveExactFormMapping(reviewedExactMapping(mapping), {
    courtArea: mapping.courtArea,
    procedureStage: mapping.stage,
    caseFacts: mapping.facts,
    catalogRecord: catalogRecord(mapping),
    asOf: mappingAsOf,
  });
  assert.deepEqual(resolved, {
    displayState: "official-form-linked-recommendation",
    canonicalFormId: mapping.canonicalFormId,
    canonicalFormCourtType: mapping.courtArea,
    reviewRequiredReason: null,
  }, `Mapping row ${mapping.id} must require every approved structured condition`);

  assert.equal(resolveExactFormMapping(reviewedExactMapping(mapping), {
    courtArea: mapping.courtArea,
    procedureStage: mapping.stage,
    caseFacts: {},
    catalogRecord: catalogRecord(mapping),
    asOf: mappingAsOf,
  }).displayState, "review-required", `Mapping row ${mapping.id} must fail closed for missing facts`);
}

const civil = exactMappings.find((mapping) => mapping.id === 9)!;
for (const facts of [
  { ...civil.facts, formApplicability: { civil: { isGeneralAction: true, isApplication: true, isMortgageForeclosure: false, isCommencedByNoticeOfAction: false } } },
  { ...civil.facts, formApplicability: { civil: { isGeneralAction: true, isApplication: false, isMortgageForeclosure: true, isCommencedByNoticeOfAction: false } } },
  { ...civil.facts, formApplicability: { civil: { isGeneralAction: true, isApplication: false, isMortgageForeclosure: false, isCommencedByNoticeOfAction: true } } },
]) {
  assert.equal(resolveExactFormMapping(reviewedExactMapping(civil), { courtArea: "civil", procedureStage: "starting-case", caseFacts: facts, catalogRecord: catalogRecord(civil), asOf: mappingAsOf }).displayState, "review-required");
}

const family = exactMappings.find((mapping) => mapping.id === 1)!;
assert.equal(resolveExactFormMapping(reviewedExactMapping(family), { courtArea: "family", procedureStage: "starting-case", caseFacts: { ...family.facts, formApplicability: { family: { isGeneralApplication: true, isDivorceApplication: true } } }, catalogRecord: catalogRecord(family), asOf: mappingAsOf }).displayState, "review-required");
assert.equal(resolveExactFormMapping(reviewedExactMapping(civil), { courtArea: "family", procedureStage: "starting-case", caseFacts: civil.facts, catalogRecord: catalogRecord(civil), asOf: mappingAsOf }).displayState, "review-required", "Cross-area mappings must fail closed");
assert.equal(resolveExactFormMapping({ ...reviewedExactMapping(civil), canonical_form_id: "1fead613-b24b-4797-b73c-0edfeb2af3d7", canonical_form_court_type: "civil" }, { courtArea: "civil", procedureStage: "starting-case", caseFacts: civil.facts, catalogRecord: { ...catalogRecord(civil), canonical_form_id: "wrong-title-match" }, asOf: mappingAsOf }).displayState, "review-required", "Title-like or wrong canonical catalog IDs must not resolve");
assert.equal(resolveExactFormMapping(reviewedExactMapping(civil), { courtArea: "civil", procedureStage: "starting-case", caseFacts: civil.facts, catalogRecord: { ...catalogRecord(civil), form_checked_at: "2024-01-01" }, asOf: mappingAsOf }).displayState, "review-required", "Stale canonical provenance must fail closed");

// ---- Bundle 3: response/service form mappings (4 records) ----------------
const bundleThreeMappings = [
  { courtArea: "civil" as const, stage: "responding", canonicalFormId: "502cd465-720a-4d71-8b6c-a7eefe788657", sourceId: "on-civil-respond-r18", pinpoint: "r. 18", conditions: { all: [{ path: "courtPath", equals: "civil" }, { path: "province", equals: "Ontario" }, { path: "stage", equals: "responding" }, { path: "formApplicability.civil.responseDocument", equals: "statement-of-defence" }] }, facts: { courtPath: "civil", province: "Ontario", stage: "responding", formApplicability: { civil: { responseDocument: "statement-of-defence" } } } },
  { courtArea: "small-claims" as const, stage: "already-started", canonicalFormId: "a576815d-2bc8-4a13-9502-348eec5819e2", sourceId: "on-scc-service-r8", pinpoint: "r. 8", conditions: { all: [{ path: "courtPath", equals: "small-claims" }, { path: "province", equals: "Ontario" }, { path: "stage", equals: "already-started" }, { path: "formApplicability.smallClaims.hasCompletedServiceAndPreparingProof", equals: true }] }, facts: { courtPath: "small-claims", province: "Ontario", stage: "already-started", formApplicability: { smallClaims: { hasCompletedServiceAndPreparingProof: true } } } },
  { courtArea: "family" as const, stage: "already-started", canonicalFormId: "21fd1fd2-2d0f-486d-abbf-41faab3d488c", sourceId: "on-family-service-r6", pinpoint: "r. 6", conditions: { all: [{ path: "courtPath", equals: "family" }, { path: "province", equals: "Ontario" }, { path: "stage", equals: "already-started" }, { path: "formApplicability.family.hasCompletedServiceAndPreparingProof", equals: true }] }, facts: { courtPath: "family", province: "Ontario", stage: "already-started", formApplicability: { family: { hasCompletedServiceAndPreparingProof: true } } } },
  { courtArea: "civil" as const, stage: "already-started", canonicalFormId: "952b0ad2-1599-4815-be23-d2dfb5aee75d", sourceId: "on-civil-service-rr16-17", pinpoint: "rr. 16-17", conditions: { all: [{ path: "courtPath", equals: "civil" }, { path: "province", equals: "Ontario" }, { path: "stage", equals: "already-started" }, { path: "formApplicability.civil.hasCompletedServiceAndPreparingProof", equals: true }] }, facts: { courtPath: "civil", province: "Ontario", stage: "already-started", formApplicability: { civil: { hasCompletedServiceAndPreparingProof: true } } } },
] as const;

await assertExactActiveMappings("Bundle 3", bundleThreeMappings);

for (const mapping of bundleThreeMappings) {
  const record: BetaProcedureAuthorityMetadata = {
    authority_source_id: mapping.sourceId, authority_source_type: "primary-procedural-rule", official_source_url: "https://www.ontario.ca/laws/regulation/example", authority_citation: "Ontario procedural rule", authority_pinpoint: mapping.pinpoint, authority_issuing_body: "Ontario e-Laws", authority_checked_at: "2026-08-10", authority_review_status: "verified-for-workflow", authority_court_area: mapping.courtArea, authority_topic: "bundle-three", authority_stage_applicability: [mapping.stage], canonical_form_id: mapping.canonicalFormId, canonical_form_court_type: mapping.courtArea, form_revision_or_effective_at: "Verified catalogue revision", form_review_status: "verified-for-workflow", applicability_conditions: mapping.conditions,
  };
  const catalog: ExactCatalogFormProvenance = { canonical_form_id: mapping.canonicalFormId, court_type: mapping.courtArea, form_source_id: `catalog-${mapping.sourceId}`, official_source_url: "https://ontariocourtforms.on.ca/en/official-forms/", form_revision_or_effective_at: "Verified catalogue revision", form_checked_at: "2026-08-10", form_review_status: "verified-catalog-source" };
  assert.equal(resolveExactFormMapping(record, { courtArea: mapping.courtArea, procedureStage: mapping.stage, caseFacts: mapping.facts, catalogRecord: catalog, asOf: mappingAsOf }).displayState, "official-form-linked-recommendation", `Bundle 3 ${mapping.canonicalFormId} must resolve only with every exact condition`);
  assert.equal(resolveExactFormMapping(record, { courtArea: mapping.courtArea, procedureStage: mapping.stage, caseFacts: { ...mapping.facts, formApplicability: {} }, catalogRecord: catalog, asOf: mappingAsOf }).displayState, "review-required", `Bundle 3 ${mapping.canonicalFormId} must reject missing confirmation`);
  assert.equal(resolveExactFormMapping(record, { courtArea: mapping.courtArea, procedureStage: "starting-case", caseFacts: mapping.facts, catalogRecord: catalog, asOf: mappingAsOf }).displayState, "review-required", `Bundle 3 ${mapping.canonicalFormId} must reject the wrong canonical stage`);
}

const defence = bundleThreeMappings[0];
const defenceRecord: BetaProcedureAuthorityMetadata = { authority_source_id: defence.sourceId, authority_source_type: "primary-procedural-rule", official_source_url: "https://www.ontario.ca/laws/regulation/example", authority_citation: "Ontario procedural rule", authority_pinpoint: defence.pinpoint, authority_issuing_body: "Ontario e-Laws", authority_checked_at: "2026-08-10", authority_review_status: "verified-for-workflow", authority_court_area: "civil", authority_topic: "bundle-three", authority_stage_applicability: ["responding"], canonical_form_id: defence.canonicalFormId, canonical_form_court_type: "civil", form_revision_or_effective_at: "Verified catalogue revision", form_review_status: "verified-for-workflow", applicability_conditions: defence.conditions };
const defenceCatalog: ExactCatalogFormProvenance = { canonical_form_id: defence.canonicalFormId, court_type: "civil", form_source_id: "catalog-defence", official_source_url: "https://ontariocourtforms.on.ca/en/official-forms/", form_revision_or_effective_at: "Verified catalogue revision", form_checked_at: "2026-08-10", form_review_status: "verified-catalog-source" };
for (const response of ["notice-of-intent-to-defend", "application", "motion", "appeal", "not-sure", undefined]) assert.equal(resolveExactFormMapping(defenceRecord, { courtArea: "civil", procedureStage: "responding", caseFacts: { ...defence.facts, formApplicability: { civil: { responseDocument: response } } }, catalogRecord: defenceCatalog, asOf: mappingAsOf }).displayState, "review-required", "Notice of Intent, application, motion, appeal, uncertainty, or another response must not resolve as Form 18A");
assert.equal(resolveExactFormMapping(defenceRecord, { courtArea: "family", procedureStage: "responding", caseFacts: defence.facts, catalogRecord: defenceCatalog, asOf: mappingAsOf }).displayState, "review-required", "Civil Form 18A must reject cross-area inputs");

const familyReadinessQuestions = [
  { field_path: "formApplicability.family.isGeneralApplication", question: "General application?", value_type: "boolean" as const, choices: [{ value: true, label: "Yes" }, { value: false, label: "No" }, { value: "not-sure", label: "Not sure" }] },
  { field_path: "formApplicability.family.isDivorceApplication", question: "Divorce application?", value_type: "boolean" as const, choices: [{ value: true, label: "Yes" }, { value: false, label: "No" }, { value: "not-sure", label: "Not sure" }] },
];
const parsedFamilyQuestions = parseApplicabilityQuestions(familyReadinessQuestions, "family");
assert.deepEqual(parsedFamilyQuestions, familyReadinessQuestions, "Valid Form Readiness question metadata must be accepted without form-specific code");
const futureBundleQuestions = parseApplicabilityQuestions([
  { field_path: "formApplicability.family.futureVerifiedFact", question: "Future verified bundle fact?", value_type: "string" as const, choices: [{ value: "confirmed", label: "Confirmed" }, { value: "not-sure", label: "Not sure" }] },
], "family");
assert.deepEqual(parseFormApplicability({ family: { futureVerifiedFact: "confirmed" } }, "family", futureBundleQuestions!), { family: { futureVerifiedFact: "confirmed" } }, "A simulated future mapping question must be renderable and savable without Forms-page code changes");
assert.equal(parseApplicabilityQuestions([{ ...familyReadinessQuestions[0], field_path: "formApplicability.civil.isGeneralAction" }], "family"), null, "Cross-area question paths must be denied");
assert.equal(parseApplicabilityQuestions([{ ...familyReadinessQuestions[0], choices: [{ value: "yes", label: "Yes" }] }], "family"), null, "Invalid question values must be denied");

assert.deepEqual(
  parseFormApplicability({
    family: {
      isGeneralApplication: true,
      isDivorceApplication: "not-sure",
    },
  }, "family", parsedFamilyQuestions!),
  {
    family: {
      isGeneralApplication: true,
      isDivorceApplication: "not-sure",
    },
  },
  "Only metadata-declared fields and values may be saved",
);
assert.equal(
  parseFormApplicability({ civil: { isGeneralAction: true } }, "family", parsedFamilyQuestions!),
  null,
  "A cross-area applicability update must be denied",
);
assert.equal(
  parseFormApplicability({ family: { undeclared: true } }, "family", parsedFamilyQuestions!),
  null,
  "Undeclared fields must be denied",
);
assert.equal(
  parseFormApplicability({ family: { isGeneralApplication: "yes" } }, "family", parsedFamilyQuestions!),
  null,
  "Values outside declared labelled choices must be denied",
);
assert.deepEqual(
  mergeFormApplicability(
    { courtPath: "family", preserved: { evidence: "keep" }, formApplicability: { family: { isDivorceApplication: "not-sure" } } },
    { family: { respondingToFamilyApplication: true } },
  ),
  {
    courtPath: "family",
    preserved: { evidence: "keep" },
    formApplicability: { family: { isDivorceApplication: "not-sure", respondingToFamilyApplication: true } },
  },
  "Saving applicability must preserve unrelated canonical master-result fields",
);

const applicabilityRouteSource = readFileSync("app/api/cases/form-applicability/route.ts", "utf8");
assert.match(applicabilityRouteSource, /getAuthenticatedUser\(request\)[\s\S]*getAuthenticatedOwnedCase\(request, user, caseId\)/, "Form applicability must load the authenticated owner case before update");
assert.match(applicabilityRouteSource, /\.update\(\{ master_result: masterResult \}\)[\s\S]*\.eq\("id", caseId\)/, "Only the merged canonical master_result may be updated for the selected case");
assert.match(applicabilityRouteSource, /resolveExactFormMapping\(/, "Live recommendations must use the exact mapping resolver");
assert.match(applicabilityRouteSource, /\.eq\("authority_bundle_version", "ontario-beta-form-mapping-v1"\)/, "The live journey must be limited to the verified exact core-form bundle");
assert.match(applicabilityRouteSource, /getCanonicalFormLookup\(\{ canonicalFormId: resolved\.canonicalFormId, courtType: resolved\.canonicalFormCourtType \}\)/, "Live recommendations must retain exact canonical ID and court type");
assert.match(applicabilityRouteSource, /questionsForMappings\(activeMappings, area, stage\)/, "The server must load active mapping questions for the owned case's court area and stage");
assert.match(applicabilityRouteSource, /parseFormApplicability\(raw\.formApplicability, current\.area, current\.applicabilityQuestions\)/, "Writes must validate only server-loaded declared fields and values");
assert.doesNotMatch(applicabilityRouteSource, /ALLOWED_(?:FIELDS|VALUES)|eligibilityConfirmed|requestedRemedyType|respondingToPlaintiffsClaim|isGeneralApplication|isDivorceApplication|isGeneralAction/, "The route must not retain form-specific write allowlists");
assert.doesNotMatch(applicabilityRouteSource, /localStorage|official_title.*(?:ILIKE|LIKE)|form_number.*(?:ILIKE|LIKE)|Form 14B|16B\.1|Automatic Order/i);

assert.match(formsPageSource, /\/api\/cases\/form-applicability\?caseId=/, "The selected-case Forms journey must load server-verified recommendations");
assert.match(formsPageSource, /method: "PATCH"[\s\S]*formApplicability: patch/, "The Forms page must save only applicability confirmations through the server path");
assert.match(formsPageSource, /applicabilityQuestions\.map\(\(question\)/, "The Forms page must render mapping question metadata generically");
assert.match(formsPageSource, /setApplicabilityQuestions\(Array\.isArray\(result\.applicabilityQuestions\)/, "The Forms page must use only server-provided question metadata");
assert.doesNotMatch(formsPageSource, /needsSmallClaims|needsFamily|needsCivil|eligibilityConfirmed|requestedRemedyType|respondingToPlaintiffsClaim|isGeneralApplication|isDivorceApplication|isGeneralAction/, "No form-specific confirmation UI branches may remain");
assert.match(formsPageSource, /Official source verified[\s\S]*Review before filing; current court requirements may differ\./, "Verified recommendations must show the required source and filing-review language");
assert.match(formsPageSource, /!caseId[\s\S]*Save a case to verify a form recommendation/, "No-case mode must not receive a form recommendation");
assert.doesNotMatch(formsPageSource, /stats\.(?:requiredCount|recommendedCount|completedCount)/, "Forms readiness must not read unsupported matched or completed counters");
assert.match(formsPageSource, /Available official forms: \{stats\.total\}[\s\S]*Verified for this case: \{verifiedRecommendations\.length\}[\s\S]*Overlay-ready: \{stats\.overlayCount\}/, "Every displayed readiness count must come from current library, resolver, or overlay state");

// ---- Bundle 4: family conference/motion + civil motion (5 records) -------
const bundleFourMappings = [
  { courtArea: "family" as const, stage: "conference", canonicalFormId: "b2b46bcf-97ae-42e4-9d01-4a962ea83a2a", sourceId: "on-family-case-conference-r17-13", catalogSourceId: "on-court-forms-family-17a", revision: "Version: Sept. 1, 2023; effective: Nov. 27, 2023", pinpoint: "r. 17 (13) 1", facts: { courtPath: "family", province: "Ontario", stage: "conference", formApplicability: { family: { conferenceBriefType: "case-conference-brief-general" } } }, condition: { path: "formApplicability.family.conferenceBriefType", equals: "case-conference-brief-general" } },
  { courtArea: "family" as const, stage: "motion", canonicalFormId: "e6fdaf6d-9aca-4193-853a-0fec07bc84c4", sourceId: "on-family-motion-r14-09", catalogSourceId: "on-court-forms-family-14", revision: "Version: March 1, 2018; effective: July 1, 2018", pinpoint: "r. 14 (9)", facts: { courtPath: "family", province: "Ontario", stage: "motion", formApplicability: { family: { motionDocumentSet: "notice-of-motion-and-general-affidavit" } } }, condition: { path: "formApplicability.family.motionDocumentSet", equals: "notice-of-motion-and-general-affidavit" } },
  { courtArea: "family" as const, stage: "motion", canonicalFormId: "faaf5ef0-e3c0-426a-ae2a-9e966feb499a", sourceId: "on-family-motion-r14-09", catalogSourceId: "on-court-forms-family-14a", revision: "Version: Sept. 1, 2005; effective: May 1, 2006", pinpoint: "r. 14 (9)", facts: { courtPath: "family", province: "Ontario", stage: "motion", formApplicability: { family: { motionDocumentSet: "notice-of-motion-and-general-affidavit" } } }, condition: { path: "formApplicability.family.motionDocumentSet", equals: "notice-of-motion-and-general-affidavit" } },
  { courtArea: "family" as const, stage: "conference", canonicalFormId: "bf8fb6c7-ad37-4f04-98fa-4638ec6f2c9b", sourceId: "on-family-financial-disclosure-r13-01-1", catalogSourceId: "on-court-forms-family-13", revision: "Version: May 1, 2021; effective: Sept. 1, 2021", pinpoint: "r. 13 (1.1)", facts: { courtPath: "family", province: "Ontario", stage: "conference", formApplicability: { family: { financialStatementType: "support-claim-without-property-or-exclusive-possession" } } }, condition: { path: "formApplicability.family.financialStatementType", equals: "support-claim-without-property-or-exclusive-possession" } },
  { courtArea: "civil" as const, stage: "motion", canonicalFormId: "1e9b6788-cb57-42d6-a732-fd8cef53d623", sourceId: "on-civil-motion-r37-01", catalogSourceId: "on-court-forms-civil-37a", revision: "Version: Sept. 1, 2020; effective: Jan. 1, 2021", pinpoint: "r. 37.01", facts: { courtPath: "civil", province: "Ontario", stage: "motion", formApplicability: { civil: { motionDocument: "notice-of-motion-form-37a" } } }, condition: { path: "formApplicability.civil.motionDocument", equals: "notice-of-motion-form-37a" } },
] as const;

// Two of the five (e6fdaf6d and faaf5ef0) legitimately share the same
// authority_source_id ("on-family-motion-r14-09") -- both forms are
// governed by the same rule -- so the shared assertExactActiveMappings
// helper can't be reused verbatim here (it assumes a unique source per
// canonical ID, which holds everywhere else). Checked individually instead.
const bundleFourRows = await fetchActiveMappingRowsByCanonicalId(
  bundleFourMappings.map((mapping) => mapping.canonicalFormId),
);
assert.equal(bundleFourRows.length, bundleFourMappings.length, "Bundle 4 must certify exactly its five approved canonical identities, no more");
for (const mapping of bundleFourMappings) {
  const row = bundleFourRows.find((candidate) => candidate.canonical_form_id === mapping.canonicalFormId);
  assert.ok(row, `Bundle 4 must retain exact canonical ID ${mapping.canonicalFormId}`);
  assert.equal(row!.canonical_form_court_type, mapping.courtArea, `Bundle 4 ${mapping.canonicalFormId} must retain its exact court area`);
  assert.equal(row!.authority_source_id, mapping.sourceId, `Bundle 4 must retain the source identifier ${mapping.sourceId} for ${mapping.canonicalFormId}`);
}

for (const mapping of bundleFourMappings) {
  const conditions = { all: [{ path: "courtPath", equals: mapping.courtArea }, { path: "province", equals: "Ontario" }, { path: "stage", equals: mapping.stage }, mapping.condition] };
  const authority: BetaProcedureAuthorityMetadata = { authority_source_id: mapping.sourceId, authority_source_type: "primary-procedural-rule", official_source_url: "https://www.ontario.ca/laws/regulation/example", authority_citation: "Ontario procedural rule", authority_pinpoint: mapping.pinpoint, authority_issuing_body: "Ontario e-Laws", authority_checked_at: "2026-08-10", authority_review_status: "verified-for-workflow", authority_court_area: mapping.courtArea, authority_topic: "bundle-four", authority_stage_applicability: [mapping.stage], canonical_form_id: mapping.canonicalFormId, canonical_form_court_type: mapping.courtArea, form_revision_or_effective_at: mapping.revision, form_review_status: "verified-for-workflow", applicability_conditions: conditions };
  const catalog: ExactCatalogFormProvenance = { canonical_form_id: mapping.canonicalFormId, court_type: mapping.courtArea, form_source_id: mapping.catalogSourceId, official_source_url: "https://ontariocourtforms.on.ca/en/official-forms/", form_revision_or_effective_at: mapping.revision, form_checked_at: "2026-08-10", form_review_status: "verified-catalog-source" };
  assert.equal(resolveExactFormMapping(authority, { courtArea: mapping.courtArea, procedureStage: mapping.stage, caseFacts: mapping.facts, catalogRecord: catalog, asOf: mappingAsOf }).displayState, "official-form-linked-recommendation", `Bundle 4 ${mapping.canonicalFormId} must resolve only after every exact condition`);
  assert.equal(resolveExactFormMapping(authority, { courtArea: mapping.courtArea, procedureStage: mapping.stage, caseFacts: { ...mapping.facts, formApplicability: {} }, catalogRecord: catalog, asOf: mappingAsOf }).displayState, "review-required", `Bundle 4 ${mapping.canonicalFormId} must reject missing confirmation`);
  assert.equal(resolveExactFormMapping(authority, { courtArea: mapping.courtArea, procedureStage: mapping.stage, caseFacts: { ...mapping.facts, province: "Quebec" }, catalogRecord: catalog, asOf: mappingAsOf }).displayState, "review-required", `Bundle 4 ${mapping.canonicalFormId} must reject a non-Ontario case`);
  assert.equal(resolveExactFormMapping(authority, { courtArea: mapping.courtArea === "family" ? "civil" : "family", procedureStage: mapping.stage, caseFacts: mapping.facts, catalogRecord: catalog, asOf: mappingAsOf }).displayState, "review-required", `Bundle 4 ${mapping.canonicalFormId} must reject a cross-area case`);
  assert.equal(resolveExactFormMapping({ ...authority, authority_review_status: "review-required" }, { courtArea: mapping.courtArea, procedureStage: mapping.stage, caseFacts: mapping.facts, catalogRecord: catalog, asOf: mappingAsOf }).displayState, "review-required", `Bundle 4 ${mapping.canonicalFormId} must reject unverified authority`);
  assert.equal(resolveExactFormMapping(authority, { courtArea: mapping.courtArea, procedureStage: mapping.stage, caseFacts: mapping.facts, catalogRecord: { ...catalog, form_checked_at: "2024-01-01" }, asOf: mappingAsOf }).displayState, "review-required", `Bundle 4 ${mapping.canonicalFormId} must reject stale catalogue provenance`);
  assert.equal(resolveExactFormMapping(authority, { courtArea: mapping.courtArea, procedureStage: mapping.stage, caseFacts: mapping.facts, catalogRecord: { ...catalog, canonical_form_id: "00000000-0000-4000-8000-000000000000" }, asOf: mappingAsOf }).displayState, "review-required", `Bundle 4 ${mapping.canonicalFormId} must reject mismatched catalogue provenance`);
}

const familyMotion = bundleFourMappings[1];
const familyMotionAuthority: BetaProcedureAuthorityMetadata = { authority_source_id: familyMotion.sourceId, authority_source_type: "primary-procedural-rule", official_source_url: "https://www.ontario.ca/laws/regulation/example", authority_citation: "Ontario procedural rule", authority_pinpoint: familyMotion.pinpoint, authority_issuing_body: "Ontario e-Laws", authority_checked_at: "2026-08-10", authority_review_status: "verified-for-workflow", authority_court_area: "family", authority_topic: "bundle-four", authority_stage_applicability: ["motion"], canonical_form_id: familyMotion.canonicalFormId, canonical_form_court_type: "family", form_revision_or_effective_at: "Verified catalogue revision", form_review_status: "verified-for-workflow", applicability_conditions: { all: [{ path: "courtPath", equals: "family" }, { path: "province", equals: "Ontario" }, { path: "stage", equals: "motion" }, familyMotion.condition] } };
const familyMotionCatalog: ExactCatalogFormProvenance = { canonical_form_id: familyMotion.canonicalFormId, court_type: "family", form_source_id: "catalog-family-motion", official_source_url: "https://ontariocourtforms.on.ca/en/official-forms/", form_revision_or_effective_at: "Verified catalogue revision", form_checked_at: "2026-08-10", form_review_status: "verified-catalog-source" };
for (const motionDocumentSet of ["procedural-or-unopposed-motion", "without-notice-or-urgent-motion", "another-motion-document", "not-sure", undefined]) assert.equal(resolveExactFormMapping(familyMotionAuthority, { courtArea: "family", procedureStage: "motion", caseFacts: { ...familyMotion.facts, formApplicability: { family: { motionDocumentSet } } }, catalogRecord: familyMotionCatalog, asOf: mappingAsOf }).displayState, "review-required", "Excluded Family motion paths must fail closed");

// ---- Continuous coverage: family motion-to-change + civil third-party defence (4 records) ----
const continuousCoverageMappings = [
  {
    courtArea: "family" as const,
    stage: "motion",
    canonicalFormId: "ac3d1227-0c45-4f8d-8428-b291f5b3d437",
    sourceId: "on-family-motion-change-r15-05",
    pinpoint: "r. 15 (5)",
    facts: { courtPath: "family", province: "Ontario", stage: "motion", formApplicability: { family: { motionDocumentSet: "motion-to-change" } } },
    conditions: { all: [{ path: "courtPath", equals: "family" }, { path: "province", equals: "Ontario" }, { path: "stage", equals: "motion" }, { path: "formApplicability.family.motionDocumentSet", equals: "motion-to-change" }] },
  },
  {
    courtArea: "family" as const,
    stage: "motion",
    canonicalFormId: "f38325dc-0a6a-40ec-bb01-75293f7d68b5",
    sourceId: "on-family-response-motion-change-r15-9-1",
    pinpoint: "r. 15 (9) 1",
    facts: { courtPath: "family", province: "Ontario", stage: "motion", formApplicability: { family: { motionDocumentSet: "response-to-motion-to-change" } } },
    conditions: { all: [{ path: "courtPath", equals: "family" }, { path: "province", equals: "Ontario" }, { path: "stage", equals: "motion" }, { path: "formApplicability.family.motionDocumentSet", equals: "response-to-motion-to-change" }] },
  },
  {
    courtArea: "family" as const,
    stage: "motion",
    canonicalFormId: "dc9f6b2e-ef9b-45b8-9ee5-7fe2c9aa697d",
    sourceId: "on-family-consent-motion-change-r15-9-2",
    pinpoint: "r. 15 (9) 2",
    facts: { courtPath: "family", province: "Ontario", stage: "motion", formApplicability: { family: { motionDocumentSet: "consent-motion-to-change" } } },
    conditions: { all: [{ path: "courtPath", equals: "family" }, { path: "province", equals: "Ontario" }, { path: "stage", equals: "motion" }, { path: "formApplicability.family.motionDocumentSet", equals: "consent-motion-to-change" }] },
  },
  {
    courtArea: "civil" as const,
    stage: "responding",
    canonicalFormId: "cdba6867-648f-40be-ac57-8094d5f0db7d",
    sourceId: "on-civil-third-party-defence-r29-03",
    pinpoint: "r. 29.03",
    facts: { courtPath: "civil", province: "Ontario", stage: "responding", formApplicability: { civil: { responseDocument: "third-party-defence" } } },
    conditions: { all: [{ path: "courtPath", equals: "civil" }, { path: "province", equals: "Ontario" }, { path: "stage", equals: "responding" }, { path: "formApplicability.civil.responseDocument", equals: "third-party-defence" }] },
  },
] as const;

await assertExactActiveMappings("Continuous coverage", continuousCoverageMappings);

for (const mapping of continuousCoverageMappings) {
  const record: BetaProcedureAuthorityMetadata = {
    authority_source_id: mapping.sourceId,
    authority_source_type: "primary-procedural-rule",
    official_source_url: "https://www.ontario.ca/laws/regulation/example",
    authority_citation: "Ontario procedural rule",
    authority_pinpoint: mapping.pinpoint,
    authority_issuing_body: "Ontario e-Laws",
    authority_checked_at: "2026-08-10",
    authority_review_status: "verified-for-workflow",
    authority_court_area: mapping.courtArea,
    authority_topic: "continuous-coverage",
    authority_stage_applicability: [mapping.stage],
    canonical_form_id: mapping.canonicalFormId,
    canonical_form_court_type: mapping.courtArea,
    form_revision_or_effective_at: "Verified catalogue revision",
    form_review_status: "verified-for-workflow",
    applicability_conditions: mapping.conditions,
  };
  const catalog: ExactCatalogFormProvenance = {
    canonical_form_id: mapping.canonicalFormId,
    court_type: mapping.courtArea,
    form_source_id: `catalog-${mapping.sourceId}`,
    official_source_url: "https://ontariocourtforms.on.ca/en/official-forms/",
    form_revision_or_effective_at: "Verified catalogue revision",
    form_checked_at: "2026-08-10",
    form_review_status: "verified-catalog-source",
  };
  assert.equal(resolveExactFormMapping(record, { courtArea: mapping.courtArea, procedureStage: mapping.stage, caseFacts: mapping.facts, catalogRecord: catalog, asOf: mappingAsOf }).displayState, "official-form-linked-recommendation", `Continuous coverage ${mapping.canonicalFormId} must resolve after every exact condition`);
  for (const context of [
    { courtArea: mapping.courtArea, procedureStage: mapping.stage, caseFacts: {} },
    { courtArea: mapping.courtArea, procedureStage: "wrong-stage", caseFacts: mapping.facts },
    { courtArea: mapping.courtArea === "family" ? "civil" : "family", procedureStage: mapping.stage, caseFacts: mapping.facts },
  ] as const) {
    assert.equal(resolveExactFormMapping(record, { ...context, catalogRecord: catalog, asOf: mappingAsOf }).displayState, "review-required", `Continuous coverage ${mapping.canonicalFormId} must fail closed for missing, cross-area, or wrong-stage context`);
  }
  assert.equal(resolveExactFormMapping(record, { courtArea: mapping.courtArea, procedureStage: mapping.stage, caseFacts: mapping.facts, catalogRecord: { ...catalog, form_checked_at: "2024-01-01" }, asOf: mappingAsOf }).displayState, "review-required", `Continuous coverage ${mapping.canonicalFormId} must reject stale catalogue provenance`);
}

// ---- Bundle 11/12: civil pleading posture (6-7 records, from the shared contract) ----
// bundle11Contract is an untyped .mjs module, so the manifest arrives as any.
// Naming both shapes here keeps every value derived from it typed.
type CivilPleadingManifestItem = {
  allowedStage: string;
  canonicalFormId: string;
  mappingSourceId: string;
  governingRulePinpoint: string;
  requiredFact: { equals: string };
};

type CivilPleadingPostureMapping = {
  item: CivilPleadingManifestItem;
  stage: string;
  canonicalFormId: string;
  sourceId: string;
  pinpoint: string;
  posture: string;
};

const civilPleadingManifest = civilPleadingContract();
const civilPleadingPostureMappings: CivilPleadingPostureMapping[] = civilPleadingManifest.items.map((item: CivilPleadingManifestItem) => ({ item, stage: item.allowedStage, canonicalFormId: item.canonicalFormId, sourceId: item.mappingSourceId, pinpoint: item.governingRulePinpoint, posture: item.requiredFact.equals }));
const civilPleadingPostureValues = civilPleadingPostureMappings.map((mapping) => mapping.posture);

const civilPleadingRows = await fetchActiveMappingRowsByCanonicalId(
  civilPleadingPostureMappings.map((mapping) => mapping.canonicalFormId),
);
for (const mapping of civilPleadingPostureMappings) {
  const row = civilPleadingRows.find((candidate) => candidate.canonical_form_id === mapping.canonicalFormId);
  assert.ok(row, `Civil pleading bundle must retain ${mapping.canonicalFormId}`);
  assert.equal(row!.canonical_form_court_type, "civil", `Civil pleading ${mapping.canonicalFormId} must be in civil`);
  assert.equal(row!.authority_source_id, mapping.sourceId, `Civil pleading bundle must retain source ${mapping.sourceId} for ${mapping.canonicalFormId}`);
  assert.ok(row!.applicability_conditions, `Civil pleading ${mapping.canonicalFormId} must have applicability_conditions`);
}
// Excluded identities that must never have been added by this bundle (Form
// 28B and 29A) -- confirmed against courtsimplified-dev as either absent or
// inactive for this canonical/court-area combination.
for (const excludedId of ["2ed14ff3-cec2-4c95-baa7-54c94b923c3a", "b8d28c25-2b10-4450-a1f3-2d22f5ce2a8a"]) {
  const excludedRows = await fetchActiveMappingRowsByCanonicalId([excludedId]);
  assert.equal(
    excludedRows.filter((row) => row.canonical_form_court_type === "civil").length,
    0,
    `Excluded Form identity ${excludedId} must not be an active civil mapping row`,
  );
}

for (const mapping of civilPleadingPostureMappings) {
  const fixture = civilPleadingManifest.buildFixture(mapping.item);
  const authority = fixture.authority as BetaProcedureAuthorityMetadata;
  const catalog = fixture.catalog as ExactCatalogFormProvenance;
  const facts = fixture.facts;
  const positiveResolution = resolveExactFormMapping(authority, { courtArea: "civil", procedureStage: mapping.stage, caseFacts: facts, catalogRecord: catalog, asOf: civilPleadingManifest.asOf });
  assert.equal(positiveResolution.displayState, "official-form-linked-recommendation", `Civil pleading ${mapping.canonicalFormId} must resolve only for its exact posture; resolver reason: ${positiveResolution.reviewRequiredReason || "none"}`);
  for (const posture of civilPleadingPostureValues.filter((value) => value !== mapping.posture)) {
    assert.equal(resolveExactFormMapping(authority, { courtArea: "civil", procedureStage: mapping.stage, caseFacts: { ...facts, formApplicability: { civil: { pleadingPosture: posture } } }, catalogRecord: catalog, asOf: civilPleadingManifest.asOf }).displayState, "review-required", `Civil pleading ${mapping.canonicalFormId} must reject ${posture}`);
  }
  assert.equal(resolveExactFormMapping(authority, { courtArea: "civil", procedureStage: mapping.stage, caseFacts: { ...facts, formApplicability: {} }, catalogRecord: catalog, asOf: civilPleadingManifest.asOf }).displayState, "review-required", `Civil pleading ${mapping.canonicalFormId} must reject a missing posture`);
  assert.equal(resolveExactFormMapping(authority, { courtArea: "family", procedureStage: mapping.stage, caseFacts: facts, catalogRecord: catalog, asOf: civilPleadingManifest.asOf }).displayState, "review-required", `Civil pleading ${mapping.canonicalFormId} must reject a cross-area case`);
  assert.equal(resolveExactFormMapping(authority, { courtArea: "civil", procedureStage: mapping.stage, caseFacts: facts, catalogRecord: { ...catalog, form_checked_at: "2024-01-01" }, asOf: civilPleadingManifest.asOf }).displayState, "review-required", `Civil pleading ${mapping.canonicalFormId} must reject stale catalogue provenance`);
}

console.log(
  "Forms canonical identity, selected-case isolation, and core catalog provenance verification passed.",
);

}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
