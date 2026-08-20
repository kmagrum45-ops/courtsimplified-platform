import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

const provenanceMigrationPath =
  "supabase/migrations/20260810000000_add_ontario_core_form_provenance_bundle.sql";
const provenanceMigration = readFileSync(provenanceMigrationPath, "utf8");
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

assert.match(
  provenanceMigration,
  /WHERE form\.canonical_form_id = source\.canonical_form_id\s+AND form\.court_type = source\.court_type;/,
  "Catalog provenance must update only exact canonical ID and court-area pairs",
);
assert.doesNotMatch(
  provenanceMigration,
  /official_title|form_number|file_path|ILIKE|~~\*|LIKE/i,
  "Catalog provenance must not select records by title, number, path, or text",
);
assert.equal(
  (provenanceMigration.match(/::uuid/g) || []).length,
  certifiedCatalogRecords.length,
  "Only the approved canonical catalog records may be certified",
);

for (const [canonicalFormId, courtType] of certifiedCatalogRecords) {
  assert.match(
    provenanceMigration,
    new RegExp(`'${canonicalFormId}'::uuid, '${courtType}'::text`),
    `Certified record ${canonicalFormId} must retain its exact court area`,
  );
}

function isExactCertifiedCatalogRecord(input: {
  canonicalFormId?: string;
  courtType?: string;
  title?: string;
}): boolean {
  return certifiedCatalogRecords.some(
    ([canonicalFormId, courtType]) =>
      input.canonicalFormId === canonicalFormId && input.courtType === courtType,
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

for (const forbiddenValue of [
  "Form 14B",
  "Mortgage Action",
  "Lawyer's Certificate of Service",
  "16b-1",
  "Automatic Order",
  "8.01",
]) {
  assert.doesNotMatch(
    provenanceMigration,
    new RegExp(forbiddenValue, "i"),
    `${forbiddenValue} must remain uncertified`,
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

assert.doesNotMatch(provenanceMigration, /\[https:\/\/|\]\(https:\/\//, "Migration source URLs must remain bare HTTPS URLs");
assert.doesNotMatch(provenanceMigration, /legal_form_mapping_rules|canonical_form_court_type|official-form-linked-recommendation/, "Catalog provenance must not certify form mappings or recommendations");

const mappingMigrationPath =
  "supabase/migrations/20260810000001_add_exact_form_mapping_applicability_bundle.sql";
const mappingMigration = readFileSync(mappingMigrationPath, "utf8");
const readinessMigrationPath =
  "supabase/migrations/20260810000002_add_form_readiness_questions.sql";
const readinessMigration = readFileSync(readinessMigrationPath, "utf8");
const mappingAsOf = new Date("2026-08-10T12:00:00Z");

assert.match(mappingMigration, /ADD COLUMN IF NOT EXISTS applicability_conditions jsonb;/);
assert.match(readinessMigration, /ADD COLUMN IF NOT EXISTS applicability_questions jsonb;/);
assert.match(readinessMigration, /mapping\.id = source\.mapping_id[\s\S]*mapping\.court_area = source\.court_area[\s\S]*mapping\.is_active = true[\s\S]*authority_bundle_version = 'ontario-beta-form-mapping-v1';/);
assert.equal((readinessMigration.match(/::bigint/g) || []).length, 5, "Only the five approved mapping IDs may receive Form Readiness questions");
for (const mappingId of [1, 2, 6, 7, 9]) assert.match(readinessMigration, new RegExp(`\\(${mappingId}::bigint`), `Approved mapping ${mappingId} must receive metadata`);
assert.doesNotMatch(readinessMigration, /"(?:courtPath|province|stage)"/, "Question metadata must not collect resolver-controlled case facts");
assert.match(
  mappingMigration,
  /mapping\.id = source\.mapping_id[\s\S]*mapping\.court_area = source\.court_area[\s\S]*mapping\.is_active = true[\s\S]*mapping\.authority_review_status = 'review-required'[\s\S]*mapping\.form_review_status = 'review-required';/,
  "Exact mapping rows must retain ID, court-area, active, and expected-status guards",
);
assert.doesNotMatch(mappingMigration, /ILIKE|LIKE|official_title|form_number|file_path|Form 14B|16B\.1|Automatic Order|settlement conference|notice of motion/i);

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

for (const mapping of exactMappings) {
  assert.match(mappingMigration, new RegExp(`\\(${mapping.id}::bigint, '${mapping.courtArea}'::text[\\s\\S]*?'${mapping.canonicalFormId}'::uuid`));
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

const bundleThreeMigration = readFileSync(
  "supabase/migrations/20260810000003_add_ontario_core_response_service_form_mappings.sql",
  "utf8",
);
assert.match(bundleThreeMigration, /INSERT INTO public\.legal_form_mapping_rules \(\s*court_area,/);
assert.doesNotMatch(bundleThreeMigration, /\b(?:id|mapping_id)\s*,|::bigint/, "Bundle 3 must use the mapping-table identity default, never an explicit numeric ID");
assert.match(bundleThreeMigration, /WHERE NOT EXISTS \([\s\S]*existing\.is_active = true[\s\S]*existing\.canonical_form_id = source\.canonical_form_id[\s\S]*existing\.canonical_form_court_type = source\.court_area/);
assert.doesNotMatch(bundleThreeMigration, /16B\.1|Lawyer.?s Certificate|official_title|form_number|file_path|ILIKE|LIKE/i, "Bundle 3 must never map the civil lawyer certificate or use text matching");

const bundleThreeMappings = [
  { courtArea: "civil" as const, stage: "responding", canonicalFormId: "502cd465-720a-4d71-8b6c-a7eefe788657", sourceId: "on-civil-respond-r18", pinpoint: "r. 18", conditions: { all: [{ path: "courtPath", equals: "civil" }, { path: "province", equals: "Ontario" }, { path: "stage", equals: "responding" }, { path: "formApplicability.civil.responseDocument", equals: "statement-of-defence" }] }, facts: { courtPath: "civil", province: "Ontario", stage: "responding", formApplicability: { civil: { responseDocument: "statement-of-defence" } } } },
  { courtArea: "small-claims" as const, stage: "already-started", canonicalFormId: "a576815d-2bc8-4a13-9502-348eec5819e2", sourceId: "on-scc-service-r8", pinpoint: "r. 8", conditions: { all: [{ path: "courtPath", equals: "small-claims" }, { path: "province", equals: "Ontario" }, { path: "stage", equals: "already-started" }, { path: "formApplicability.smallClaims.hasCompletedServiceAndPreparingProof", equals: true }] }, facts: { courtPath: "small-claims", province: "Ontario", stage: "already-started", formApplicability: { smallClaims: { hasCompletedServiceAndPreparingProof: true } } } },
  { courtArea: "family" as const, stage: "already-started", canonicalFormId: "21fd1fd2-2d0f-486d-abbf-41faab3d488c", sourceId: "on-family-service-r6", pinpoint: "r. 6", conditions: { all: [{ path: "courtPath", equals: "family" }, { path: "province", equals: "Ontario" }, { path: "stage", equals: "already-started" }, { path: "formApplicability.family.hasCompletedServiceAndPreparingProof", equals: true }] }, facts: { courtPath: "family", province: "Ontario", stage: "already-started", formApplicability: { family: { hasCompletedServiceAndPreparingProof: true } } } },
  { courtArea: "civil" as const, stage: "already-started", canonicalFormId: "952b0ad2-1599-4815-be23-d2dfb5aee75d", sourceId: "on-civil-service-rr16-17", pinpoint: "rr. 16-17", conditions: { all: [{ path: "courtPath", equals: "civil" }, { path: "province", equals: "Ontario" }, { path: "stage", equals: "already-started" }, { path: "formApplicability.civil.hasCompletedServiceAndPreparingProof", equals: true }] }, facts: { courtPath: "civil", province: "Ontario", stage: "already-started", formApplicability: { civil: { hasCompletedServiceAndPreparingProof: true } } } },
] as const;

for (const mapping of bundleThreeMappings) {
  assert.match(bundleThreeMigration, new RegExp(`'${mapping.canonicalFormId}'::uuid`), `Bundle 3 must retain the exact canonical form ID ${mapping.canonicalFormId}`);
  assert.match(bundleThreeMigration, new RegExp(`'${mapping.sourceId}'::text`), `Bundle 3 must retain source ${mapping.sourceId}`);
  assert.match(bundleThreeMigration, new RegExp(`'${mapping.pinpoint.replace(".", "\\.")}'::text`), `Bundle 3 must retain pinpoint ${mapping.pinpoint}`);
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

const bundleFourMigration = readFileSync(
  "supabase/migrations/20260810000004_add_ontario_core_family_motion_conference_form_bundle.sql",
  "utf8",
);
assert.match(bundleFourMigration, /UPDATE public\.court_form_library AS form[\s\S]*canonical_form_id = source\.canonical_form_id[\s\S]*form\.court_type = source\.court_type/, "Bundle 4 catalogue provenance must use only exact canonical ID and court type");
assert.match(bundleFourMigration, /INSERT INTO public\.legal_form_mapping_rules \(\s*court_area,[\s\S]*?\)\s*SELECT[\s\S]*?WHERE NOT EXISTS \([\s\S]*existing\.is_active = true[\s\S]*existing\.canonical_form_id = 'faaf5ef0-e3c0-426a-ae2a-9e966feb499a'::uuid[\s\S]*existing\.canonical_form_court_type = 'family'/, "Form 14A must use the identity default and an exact active mapping guard");
const bundleFourApprovedCanonicalIds = new Set([
  "b2b46bcf-97ae-42e4-9d01-4a962ea83a2a",
  "e6fdaf6d-9aca-4193-853a-0fec07bc84c4",
  "faaf5ef0-e3c0-426a-ae2a-9e966feb499a",
  "bf8fb6c7-ad37-4f04-98fa-4638ec6f2c9b",
  "1e9b6788-cb57-42d6-a732-fd8cef53d623",
]);
const bundleFourCanonicalIds = [...bundleFourMigration.matchAll(/'([0-9a-f-]{36})'::uuid/g)].map((match) => match[1]);
assert.ok(bundleFourCanonicalIds.length > 0 && bundleFourCanonicalIds.every((id) => bundleFourApprovedCanonicalIds.has(id)), "Bundle 4 may certify only the five approved canonical identities; explanatory text about excluded paths is not a mapping identity");

const bundleFourMappings = [
  { courtArea: "family" as const, stage: "conference", canonicalFormId: "b2b46bcf-97ae-42e4-9d01-4a962ea83a2a", sourceId: "on-family-case-conference-r17-13", catalogSourceId: "on-court-forms-family-17a", revision: "Version: Sept. 1, 2023; effective: Nov. 27, 2023", pinpoint: "r. 17 (13) 1", facts: { courtPath: "family", province: "Ontario", stage: "conference", formApplicability: { family: { conferenceBriefType: "case-conference-brief-general" } } }, condition: { path: "formApplicability.family.conferenceBriefType", equals: "case-conference-brief-general" } },
  { courtArea: "family" as const, stage: "motion", canonicalFormId: "e6fdaf6d-9aca-4193-853a-0fec07bc84c4", sourceId: "on-family-motion-r14-09", catalogSourceId: "on-court-forms-family-14", revision: "Version: March 1, 2018; effective: July 1, 2018", pinpoint: "r. 14 (9)", facts: { courtPath: "family", province: "Ontario", stage: "motion", formApplicability: { family: { motionDocumentSet: "notice-of-motion-and-general-affidavit" } } }, condition: { path: "formApplicability.family.motionDocumentSet", equals: "notice-of-motion-and-general-affidavit" } },
  { courtArea: "family" as const, stage: "motion", canonicalFormId: "faaf5ef0-e3c0-426a-ae2a-9e966feb499a", sourceId: "on-family-motion-r14-09", catalogSourceId: "on-court-forms-family-14a", revision: "Version: Sept. 1, 2005; effective: May 1, 2006", pinpoint: "r. 14 (9)", facts: { courtPath: "family", province: "Ontario", stage: "motion", formApplicability: { family: { motionDocumentSet: "notice-of-motion-and-general-affidavit" } } }, condition: { path: "formApplicability.family.motionDocumentSet", equals: "notice-of-motion-and-general-affidavit" } },
  { courtArea: "family" as const, stage: "conference", canonicalFormId: "bf8fb6c7-ad37-4f04-98fa-4638ec6f2c9b", sourceId: "on-family-financial-disclosure-r13-01-1", catalogSourceId: "on-court-forms-family-13", revision: "Version: May 1, 2021; effective: Sept. 1, 2021", pinpoint: "r. 13 (1.1)", facts: { courtPath: "family", province: "Ontario", stage: "conference", formApplicability: { family: { financialStatementType: "support-claim-without-property-or-exclusive-possession" } } }, condition: { path: "formApplicability.family.financialStatementType", equals: "support-claim-without-property-or-exclusive-possession" } },
  { courtArea: "civil" as const, stage: "motion", canonicalFormId: "1e9b6788-cb57-42d6-a732-fd8cef53d623", sourceId: "on-civil-motion-r37-01", catalogSourceId: "on-court-forms-civil-37a", revision: "Version: Sept. 1, 2020; effective: Jan. 1, 2021", pinpoint: "r. 37.01", facts: { courtPath: "civil", province: "Ontario", stage: "motion", formApplicability: { civil: { motionDocument: "notice-of-motion-form-37a" } } }, condition: { path: "formApplicability.civil.motionDocument", equals: "notice-of-motion-form-37a" } },
] as const;

for (const mapping of bundleFourMappings) {
  assert.match(bundleFourMigration, new RegExp(`'${mapping.canonicalFormId}'::uuid`), `Bundle 4 must retain exact canonical ID ${mapping.canonicalFormId}`);
  assert.match(bundleFourMigration, new RegExp(`'${mapping.sourceId}'::text`), `Bundle 4 must retain the source identifier ${mapping.sourceId}`);
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

const continuousCoverageMigration = readFileSync(
  "supabase/migrations/20260810000009_add_ontario_family_motion_change_and_civil_third_party_defence_bundle.sql",
  "utf8",
);
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

assert.doesNotMatch(continuousCoverageMigration, /ILIKE|LIKE|official_title|form_number|file_path/i, "Continuous coverage mappings must not use catalogue text matching at runtime");
assert.match(continuousCoverageMigration, /WHERE NOT EXISTS \([\s\S]*existing\.is_active = true[\s\S]*existing\.canonical_form_id = source\.canonical_form_id[\s\S]*existing\.canonical_form_court_type = source\.court_area/, "Continuous coverage mappings must have an exact active canonical identity guard");
for (const mapping of continuousCoverageMappings) {
  assert.match(continuousCoverageMigration, new RegExp(`'${mapping.canonicalFormId}'::uuid`), `Continuous coverage must retain ${mapping.canonicalFormId}`);
  assert.match(continuousCoverageMigration, new RegExp(`'${mapping.sourceId}'::text`), `Continuous coverage must retain source ${mapping.sourceId}`);
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

const civilPleadingPostureMigration = readFileSync(
  "supabase/migrations/20260810000012_add_ontario_civil_counterclaim_new_party_mapping.sql",
  "utf8",
);
const civilPleadingManifest = civilPleadingContract();
const civilPleadingPostureMappings = civilPleadingManifest.items.map((item: {
  allowedStage: string; canonicalFormId: string; mappingSourceId: string; governingRulePinpoint: string; requiredFact: { equals: string };
}) => ({ item, stage: item.allowedStage, canonicalFormId: item.canonicalFormId, sourceId: item.mappingSourceId, pinpoint: item.governingRulePinpoint, posture: item.requiredFact.equals }));
const civilPleadingPostureValues = civilPleadingPostureMappings.map((mapping) => mapping.posture);
const declaredCivilPleadingPostures = [
  ...civilPleadingPostureMigration.matchAll(
    /"path":"formApplicability\.civil\.pleadingPosture","equals":"([^"]+)"/g,
  ),
].map((match) => match[1]);
const declaredCivilPleadingQuestionChoices = [
  ...civilPleadingPostureMigration.matchAll(/"value":"([^"]+)"/g),
].map((match) => match[1]);

assert.doesNotMatch(civilPleadingPostureMigration, /ILIKE|LIKE|official_title.*(?:=|ILIKE|LIKE)|form_number.*(?:=|ILIKE|LIKE)|file_path/i, "Civil pleading routing must not use catalogue text matching at runtime");
assert.match(civilPleadingPostureMigration, /WHERE NOT EXISTS \([\s\S]*existing\.is_active = true[\s\S]*existing\.canonical_form_id = 'a4c3343d-1ed5-4da3-b247-8460b5d27b3c'::uuid[\s\S]*existing\.canonical_form_court_type = 'civil'/, "Civil Form 27B must use an exact active canonical identity guard");
assert.match(civilPleadingPostureMigration, /UPDATE public\.legal_form_mapping_rules AS mapping[\s\S]*mapping\.canonical_form_id IN \([\s\S]*'92121753-d5a5-45e5-9cb6-21b837de7c13'::uuid[\s\S]*'8135da24-53f9-4360-a7c4-81d66fe8530a'::uuid[\s\S]*'a73f2f4c-8dc7-4bb6-a10b-a50e17a7d185'::uuid[\s\S]*'ce2bebe1-9c12-469f-bcca-ebb4d7968216'::uuid[\s\S]*'b2cc9170-cb22-4087-843e-1b4ca4eb2620'::uuid[\s\S]*'79f07cdf-6f02-4857-8402-1b77addfa7f6'::uuid/, "Bundle 12 must update shared question metadata only on the six exact Bundle 11 identities");
assert.doesNotMatch(civilPleadingPostureMigration, /SET\s+applicability_conditions/i, "Bundle 12 must preserve every existing applicability condition");
assert.doesNotMatch(civilPleadingPostureMigration, /2ed14ff3-cec2-4c95-baa7-54c94b923c3a|b8d28c25-2b10-4450-a1f3-2d22f5ce2a8a/, "Civil pleading bundle must not add excluded Form 28B or 29A identities");
assert.deepEqual(
  [...new Set(declaredCivilPleadingQuestionChoices)].sort(),
  [...civilPleadingPostureValues].sort(),
  "Bundle 12 may accept only the seven approved Civil pleading-posture condition values",
);
assert.deepEqual(declaredCivilPleadingPostures, ["counterclaim-new-party"], "Bundle 12 must add only Form 27B's new applicability condition");
for (const mapping of civilPleadingPostureMappings) {
  assert.match(civilPleadingPostureMigration, new RegExp(`'${mapping.canonicalFormId}'::uuid`), `Civil pleading bundle must retain ${mapping.canonicalFormId}`);
  if (mapping.canonicalFormId === "a4c3343d-1ed5-4da3-b247-8460b5d27b3c") assert.match(civilPleadingPostureMigration, new RegExp(`'${mapping.sourceId}'`), `Civil pleading bundle must retain source ${mapping.sourceId}`);
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
