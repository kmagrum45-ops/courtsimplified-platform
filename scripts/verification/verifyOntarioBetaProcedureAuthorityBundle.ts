import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  resolveBetaProcedureAuthority,
  type BetaProcedureAuthorityMetadata,
} from "../../src/lib/case-system/authority-intelligence/betaProcedureAuthority";
import { getProcedureAuthorityDisplayItems } from "../../app/builder/_components/ProcedureAuthorityDisplay";

const AS_OF = new Date("2026-08-09T00:00:00.000Z");

function reviewedProcedure(
  courtArea: "small-claims" | "family" | "civil",
  procedureStage: string,
): BetaProcedureAuthorityMetadata {
  return {
    authority_source_id: `authority-${courtArea}-${procedureStage}`,
    authority_source_type: "primary-procedural-rule",
    official_source_url: "https://www.ontario.ca/laws/regulation/example",
    authority_citation: "Ontario procedural rule",
    authority_pinpoint: "r. 1",
    authority_issuing_body: "Ontario e-Laws",
    authority_checked_at: "2026-08-09",
    authority_review_status: "verified-for-workflow",
    authority_court_area: courtArea,
    authority_topic: "reviewed-topic",
    authority_stage_applicability: [procedureStage],
  };
}

function reviewedWorkflowGuidance(
  courtArea: "small-claims" | "family" | "civil",
  procedureStage: string,
): BetaProcedureAuthorityMetadata {
  return {
    authority_review_status: "review-required",
    workflow_guidance: ["Narrow source-linked workflow boundary."],
    workflow_guidance_review_status: "verified-for-workflow",
    workflow_guidance_restricted_fields: [
      "required_forms",
      "deadline_risks",
      "evidence_needed",
      "urgency",
      "service_and_filing_deadlines",
    ],
    workflow_guidance_source_id: `workflow-${courtArea}-${procedureStage}`,
    workflow_guidance_source_type: "primary-procedural-rule",
    workflow_guidance_official_source_url: "https://www.ontario.ca/laws/regulation/example",
    workflow_guidance_citation: "Ontario procedural rule",
    workflow_guidance_pinpoint: "r. 1",
    workflow_guidance_issuing_body: "Ontario e-Laws",
    workflow_guidance_checked_at: "2026-08-09",
    workflow_guidance_court_area: courtArea,
    workflow_guidance_stage_applicability: [procedureStage],
  };
}

for (const courtArea of ["small-claims", "family", "civil"] as const) {
  for (const procedureStage of ["starting-case", "responding", "service"]) {
    const resolved = resolveBetaProcedureAuthority(
      reviewedProcedure(courtArea, procedureStage),
      { courtArea, procedureStage, asOf: AS_OF },
    );

    assert.equal(resolved.displayState, "verified-source-linked-workflow");
    assert.equal(resolved.courtArea, courtArea);
    assert.deepEqual(resolved.stageApplicability, [procedureStage]);
  }

  const fullProcedureDisplay = getProcedureAuthorityDisplayItems(
    [reviewedProcedure(courtArea, "starting-case")],
    { courtArea, procedureStage: "starting-case", asOf: AS_OF },
  );
  // The full-procedure state carries real workflow text only when that field
  // is separately verified. reviewedProcedure sets no workflow guidance, so the
  // list is empty and the citation line stands alone. It no longer restates
  // that the record is verified, which told the reader nothing. The real Small
  // Claims starting-case row behaves the same way: workflow_guidance is null.
  assert.deepEqual(fullProcedureDisplay, [{
    state: "verified-full-procedure",
    guidance: [],
    officialSourceUrl: "https://www.ontario.ca/laws/regulation/example",
    citation: "Ontario procedural rule",
    pinpoint: "r. 1",
  }], `${courtArea} must display only its verified full procedure state`);

  const fieldGuidanceDisplay = getProcedureAuthorityDisplayItems(
    [reviewedWorkflowGuidance(courtArea, "motion")],
    { courtArea, procedureStage: "motion", asOf: AS_OF },
  );
  assert.equal(fieldGuidanceDisplay[0].state, "verified-field-guidance");
  assert.deepEqual(fieldGuidanceDisplay[0].guidance, ["Narrow source-linked workflow boundary."]);
  assert.equal(fieldGuidanceDisplay[0].guidance.some((item) => /form|deadline|service|urgency/i.test(item)), false);
}

for (const [id, courtArea, procedureStage] of [
  [3, "small-claims", "settlement-conference"],
  [17, "small-claims", "trial-preparation"],
  [6, "family", "conference"],
  [24, "family", "case-conference"],
  [25, "family", "settlement-conference"],
  [26, "family", "trial-management-conference"],
  [49, "civil", "pre-trial-conference"],
  [50, "civil", "trial-preparation"],
] as const) {
  const resolved = resolveBetaProcedureAuthority(
    reviewedWorkflowGuidance(courtArea, procedureStage),
    { courtArea, procedureStage, asOf: AS_OF },
  );

  assert.equal(resolved.displayState, "review-required", `raw row ${id} must remain review-required`);
  assert.equal(resolved.reviewStatus, "review-required", `raw row ${id} must retain review-required status`);
  assert.equal(
    resolved.permittedWorkflowGuidance.displayState,
    "verified-source-linked-workflow",
    `only permitted workflow guidance may be verified for row ${id}`,
  );
  assert.deepEqual(
    resolved.permittedWorkflowGuidance.guidance,
    ["Narrow source-linked workflow boundary."],
  );
  assert.ok(resolved.permittedWorkflowGuidance.restrictedFields.includes("required_forms"));
  assert.equal(resolved.canonicalFormId, null, "workflow guidance must not certify a form");
}

for (const [id, courtArea] of [
  [10, "civil"],
  [27, "family"],
  [15, "small-claims"],
] as const) {
  const resolved = resolveBetaProcedureAuthority(
    reviewedWorkflowGuidance(courtArea, "motion"),
    { courtArea, procedureStage: "motion", asOf: AS_OF },
  );
  assert.equal(resolved.displayState, "review-required", `raw motion row ${id} must remain review-required`);
  assert.equal(resolved.permittedWorkflowGuidance.displayState, "verified-source-linked-workflow");
  assert.ok(resolved.permittedWorkflowGuidance.restrictedFields.includes("urgency"));
  assert.ok(resolved.permittedWorkflowGuidance.restrictedFields.includes("service_and_filing_deadlines"));
}

for (const [description, patch] of [
  [
    "Markdown-formatted URL",
    {
      workflow_guidance_official_source_url:
        "[https://www.ontario.ca/laws/regulation/980258](https://www.ontario.ca/laws/regulation/980258)",
    },
  ],
  ["malformed URL", { workflow_guidance_official_source_url: "https://" }],
  ["non-HTTPS URL", { workflow_guidance_official_source_url: "http://www.ontario.ca/laws/regulation/980258" }],
  ["stale source", { workflow_guidance_checked_at: "2024-01-01" }],
  ["cross-area source", { workflow_guidance_court_area: "family" }],
  ["stage mismatch", { workflow_guidance_stage_applicability: ["motion"] }],
  ["missing provenance", { workflow_guidance_source_id: "" }],
  ["missing restricted field declaration", { workflow_guidance_restricted_fields: [] }],
  ["certified form content", { workflow_guidance: ["Use Form 37A for this motion."] }],
  ["certified deadline content", { workflow_guidance: ["The filing deadline is tomorrow."] }],
  ["certified urgency content", { workflow_guidance: ["Urgent relief is available."] }],
] as const) {
  const resolved = resolveBetaProcedureAuthority(
    {
      ...reviewedWorkflowGuidance("small-claims", "settlement-conference"),
      ...patch,
    },
    { courtArea: "small-claims", procedureStage: "settlement-conference", asOf: AS_OF },
  );
  assert.equal(resolved.displayState, "review-required");
  assert.equal(
    resolved.permittedWorkflowGuidance.displayState,
    "review-required",
    `${description} must fail closed`,
  );
  assert.deepEqual(resolved.permittedWorkflowGuidance.guidance, []);
  assert.deepEqual(
    getProcedureAuthorityDisplayItems(
      [{ ...reviewedWorkflowGuidance("small-claims", "settlement-conference"), ...patch }],
      { courtArea: "small-claims", procedureStage: "settlement-conference", asOf: AS_OF },
    ),
    [{ state: "review-required", guidance: [], officialSourceUrl: null, citation: null, pinpoint: null }],
    `${description} must not reach the procedure display as verified`,
  );
}

assert.equal(
  resolveBetaProcedureAuthority(
    {
      ...reviewedProcedure("small-claims", "starting-case"),
      authority_checked_at: "2024-01-01",
    },
    { courtArea: "small-claims", procedureStage: "starting-case", asOf: AS_OF },
  ).displayState,
  "review-required",
  "Stale raw provenance must fail closed",
);

assert.deepEqual(
  getProcedureAuthorityDisplayItems(
    [{ ...reviewedProcedure("civil", "starting-case"), authority_court_area: "family" }],
    { courtArea: "civil", procedureStage: "starting-case", asOf: AS_OF },
  ),
  [{ state: "review-required", guidance: [], officialSourceUrl: null, citation: null, pinpoint: null }],
  "Cross-area full procedure authority must not reach the Civil display as verified",
);

assert.equal(
  resolveBetaProcedureAuthority(
    {
      ...reviewedProcedure("family", "responding"),
      authority_review_status: "review-required",
    },
    { courtArea: "family", procedureStage: "responding", asOf: AS_OF },
  ).displayState,
  "review-required",
  "Unreviewed raw provenance must fail closed",
);

assert.equal(
  resolveBetaProcedureAuthority(
    {
      ...reviewedProcedure("civil", "starting-case"),
      canonical_form_id: "33333333-3333-4333-8333-333333333333",
      canonical_form_court_type: "civil",
    },
    { courtArea: "civil", procedureStage: "starting-case", asOf: AS_OF },
  ).displayState,
  "review-required",
  "A canonical ID alone must not certify a form",
);

assert.deepEqual(
  getProcedureAuthorityDisplayItems(
    [{
      ...reviewedProcedure("civil", "starting-case"),
      canonical_form_id: "33333333-3333-4333-8333-333333333333",
      canonical_form_court_type: "civil",
    }],
    { courtArea: "civil", procedureStage: "starting-case", asOf: AS_OF },
  ),
  [{ state: "review-required", guidance: [], officialSourceUrl: null, citation: null, pinpoint: null }],
  "A canonical form ID must not create a verified form recommendation or display state",
);

const bundleOneMigration = readFileSync(
  "supabase/migrations/20260809000000_add_ontario_beta_procedure_authority_bundle.sql",
  "utf8",
);
for (const [id, sourceId] of [
  [1, "on-scc-start-r7-01"],
  [2, "on-scc-respond-r9-01"],
  [11, "on-scc-service-r8"],
  [4, "on-family-start-r8"],
  [5, "on-family-respond-r10-01"],
  [21, "on-family-service-r6"],
  [7, "on-civil-action-start-r14"],
  [8, "on-civil-application-boundary-r14"],
  [9, "on-civil-respond-r18"],
  [38, "on-civil-service-rr16-17"],
] as const) {
  assert.match(bundleOneMigration, new RegExp(`\\(${id}::bigint, [^\\n]+${sourceId}`));
}

const urlRepairMigration = readFileSync(
  "supabase/migrations/20260809000001_repair_ontario_beta_authority_urls.sql",
  "utf8",
);
assert.doesNotMatch(urlRepairMigration, /\[[^\]]+\]\(https?:\/\//);
assert.doesNotMatch(urlRepairMigration, /\b(?:ALTER|INSERT|DELETE)\b/i);
assert.match(urlRepairMigration, /SET official_source_url = source\.official_source_url/);

const bundleTwoMigration = readFileSync(
  "supabase/migrations/20260809000002_add_ontario_beta_procedure_workflow_guidance_bundle_2a.sql",
  "utf8",
);
assert.doesNotMatch(bundleTwoMigration, /\[[^\]]+\]\(https?:\/\//);
assert.doesNotMatch(bundleTwoMigration, /ILIKE|to_jsonb\(|information_schema|legal_form_mapping_rules/);
const bundleTwoSetClause = bundleTwoMigration.match(
  /UPDATE public\.legal_procedure_rules AS rule\s+SET([\s\S]*?)\s+FROM \(/,
);
assert.ok(bundleTwoSetClause, "Bundle 2A must have one bounded UPDATE SET clause");
assert.doesNotMatch(bundleTwoSetClause[1], /authority_review_status\s*=/);
assert.match(bundleTwoMigration, /rule\.authority_review_status = 'review-required'/);
assert.match(bundleTwoMigration, /workflow_guidance_restricted_fields/);
assert.match(bundleTwoMigration, /No form, deadline, filing-readiness, service, evidence, merits, enforcement,/);
for (const [id, courtArea, sourceId] of [
  [3, "small-claims", "on-scc-settlement-conference-r13-01"],
  [17, "small-claims", "on-scc-trial-management-r16-1-02"],
  [6, "family", "on-family-case-conference-r17-04"],
  [24, "family", "on-family-case-conference-r17-04"],
  [25, "family", "on-family-settlement-conference-r17-05"],
  [26, "family", "on-family-trial-management-r17-06"],
  [49, "civil", "on-civil-pretrial-conference-r50-01"],
  [50, "civil", "on-civil-trial-rr52-53"],
] as const) {
  assert.match(
    bundleTwoMigration,
    new RegExp(`\\(${id}::bigint, '${courtArea}'::text, '${sourceId}'::text`),
  );
}

const bundleTwoBMigraton = readFileSync(
  "supabase/migrations/20260809000003_add_ontario_beta_procedure_workflow_guidance_bundle_2b_motions.sql",
  "utf8",
);
assert.doesNotMatch(bundleTwoBMigraton, /\[[^\]]+\]\(https?:\/\//);
assert.doesNotMatch(bundleTwoBMigraton, /ILIKE|to_jsonb\(|information_schema|legal_form_mapping_rules/);
assert.match(bundleTwoBMigraton, /rule\.authority_review_status = 'review-required'/);
assert.match(bundleTwoBMigraton, /service_and_filing_deadlines/);
for (const [id, courtArea, sourceId] of [
  [10, "civil", "on-civil-motion-r37"],
  [27, "family", "on-family-motion-r14"],
  [15, "small-claims", "on-scc-motion-r15"],
] as const) {
  assert.match(
    bundleTwoBMigraton,
    new RegExp(`\\(${id}::bigint, '${courtArea}'::text, '${sourceId}'::text`),
  );
}

const formRulesRoute = readFileSync("app/api/form-rules/route.ts", "utf8");
assert.match(
  formRulesRoute,
  /\.eq\("court_type", courtType\)[\s\S]*\.in\("canonical_form_id", canonicalFormIds\)/,
);
assert.doesNotMatch(formRulesRoute, /matchesRequestedLabel|formSearchText|extractFormNumber|requestedLabels/);

console.log(
  "Ontario beta Bundle 2A verification passed: raw rows remain review-required, only complete source-linked workflow guidance is verified, restricted raw fields and forms remain unverified, and court areas remain isolated.",
);
