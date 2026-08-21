-- Ontario core response-and-service Form Mapping Bundle 3.
-- Identity allocation is intentionally left to legal_form_mapping_rules.id.
-- Catalog provenance remains in court_form_library and is rechecked by the
-- exact-ID resolver before a recommendation can be displayed.

INSERT INTO public.legal_form_mapping_rules (
  court_area,
  procedure_stage,
  is_active,
  authority_source_id,
  authority_source_type,
  official_source_url,
  authority_citation,
  authority_pinpoint,
  authority_issuing_body,
  authority_checked_at,
  authority_review_status,
  authority_court_area,
  authority_topic,
  authority_stage_applicability,
  canonical_form_id,
  canonical_form_court_type,
  form_revision_or_effective_at,
  form_review_status,
  authority_bundle_version,
  applicability_conditions,
  applicability_questions
)
SELECT
  source.court_area,
  source.case_stage,
  true,
  source.authority_source_id,
  'primary-procedural-rule',
  source.official_source_url,
  source.authority_citation,
  source.authority_pinpoint,
  'Ontario e-Laws',
  DATE '2026-08-10',
  'verified-for-workflow',
  source.court_area,
  source.authority_topic,
  ARRAY[source.case_stage],
  source.canonical_form_id,
  source.court_area,
  source.form_revision_or_effective_at,
  'verified-for-workflow',
  'ontario-beta-form-mapping-v1',
  source.applicability_conditions,
  source.applicability_questions
FROM (
  VALUES
    ('civil'::text, 'on-civil-respond-r18'::text, 'respond'::text, 'responding'::text, 'https://www.ontario.ca/laws/regulation/900194'::text, 'R.R.O. 1990, Reg. 194, Rules of Civil Procedure'::text, 'r. 18'::text, '502cd465-720a-4d71-8b6c-a7eefe788657'::uuid, 'Version: July 1, 2007; effective: July 1, 2008'::text, '{"all":[{"path":"courtPath","equals":"civil"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"responding"},{"path":"formApplicability.civil.responseDocument","equals":"statement-of-defence"}]}'::jsonb, '[{"field_path":"formApplicability.civil.responseDocument","question":"Which civil response document are you preparing?","value_type":"string","choices":[{"value":"statement-of-defence","label":"I am preparing a Statement of Defence in response to a civil Statement of Claim."},{"value":"notice-of-intent-to-defend","label":"Notice of Intent to Defend"},{"value":"application","label":"Application"},{"value":"motion","label":"Motion"},{"value":"appeal","label":"Appeal"},{"value":"not-sure","label":"Not sure"}]}]'::jsonb),
    ('small-claims'::text, 'on-scc-service-r8'::text, 'service'::text, 'already-started'::text, 'https://www.ontario.ca/laws/regulation/980258'::text, 'O. Reg. 258/98, Rules of the Small Claims Court'::text, 'r. 8'::text, 'a576815d-2bc8-4a13-9502-348eec5819e2'::uuid, 'Version: Aug. 1, 2022; effective: Jan. 30, 2023'::text, '{"all":[{"path":"courtPath","equals":"small-claims"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"already-started"},{"path":"formApplicability.smallClaims.hasCompletedServiceAndPreparingProof","equals":true}]}'::jsonb, '[{"field_path":"formApplicability.smallClaims.hasCompletedServiceAndPreparingProof","question":"I have completed service and am preparing proof of service for court documents.","value_type":"boolean","choices":[{"value":true,"label":"Yes"},{"value":false,"label":"No"},{"value":"not-sure","label":"Not sure"}],"explanation":"This does not confirm that service was legally valid."}]'::jsonb),
    ('family'::text, 'on-family-service-r6'::text, 'service'::text, 'already-started'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'r. 6'::text, '21fd1fd2-2d0f-486d-abbf-41faab3d488c'::uuid, 'Version: April 12, 2016; effective: July 1, 2016'::text, '{"all":[{"path":"courtPath","equals":"family"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"already-started"},{"path":"formApplicability.family.hasCompletedServiceAndPreparingProof","equals":true}]}'::jsonb, '[{"field_path":"formApplicability.family.hasCompletedServiceAndPreparingProof","question":"I have completed service and am preparing proof of service for court documents.","value_type":"boolean","choices":[{"value":true,"label":"Yes"},{"value":false,"label":"No"},{"value":"not-sure","label":"Not sure"}],"explanation":"This does not confirm that service was legally valid."}]'::jsonb),
    ('civil'::text, 'on-civil-service-rr16-17'::text, 'service'::text, 'already-started'::text, 'https://www.ontario.ca/laws/regulation/900194'::text, 'R.R.O. 1990, Reg. 194, Rules of Civil Procedure'::text, 'rr. 16-17'::text, '952b0ad2-1599-4815-be23-d2dfb5aee75d'::uuid, 'Version: Feb. 1, 2021; effective: April 6, 2021'::text, '{"all":[{"path":"courtPath","equals":"civil"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"already-started"},{"path":"formApplicability.civil.hasCompletedServiceAndPreparingProof","equals":true}]}'::jsonb, '[{"field_path":"formApplicability.civil.hasCompletedServiceAndPreparingProof","question":"I have completed service and am preparing proof of service for court documents.","value_type":"boolean","choices":[{"value":true,"label":"Yes"},{"value":false,"label":"No"},{"value":"not-sure","label":"Not sure"}],"explanation":"This does not confirm that service was legally valid."}]'::jsonb)
) AS source(court_area, authority_source_id, authority_topic, case_stage, official_source_url, authority_citation, authority_pinpoint, canonical_form_id, form_revision_or_effective_at, applicability_conditions, applicability_questions)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.legal_form_mapping_rules AS existing
  WHERE existing.is_active = true
    AND existing.canonical_form_id = source.canonical_form_id
    AND existing.canonical_form_court_type = source.court_area
);
