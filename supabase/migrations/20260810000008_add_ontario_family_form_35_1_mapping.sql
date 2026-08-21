-- Ontario Family Form 35.1 exact mapping bundle.
-- Catalogue repair/provenance is established by the immediately preceding
-- migration. This mapping remains fail-closed for every fact not declared here.
-- It does not assess parenting merits, safety, evidence, schedules, deadlines,
-- service, filing readiness, or any additional form.

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
  'family',
  'parenting-affidavit',
  true,
  'on-family-parenting-affidavit-r35-1-01',
  'primary-procedural-rule',
  'https://www.ontario.ca/laws/regulation/990114',
  'O. Reg. 114/99, Family Law Rules',
  'r. 35.1 (1)',
  'Ontario e-Laws',
  DATE '2026-08-10',
  'verified-for-workflow',
  'family',
  'parenting-affidavit',
  ARRAY['parenting-affidavit'],
  '501395c9-f7a4-4214-b13b-30b38ce5d85c'::uuid,
  'family',
  'Version: Sept. 1, 2021; effective: Dec. 1, 2021',
  'verified-for-workflow',
  'ontario-beta-form-mapping-v1',
  '{"all":[{"path":"courtPath","equals":"family"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"parenting-affidavit"},{"path":"formApplicability.family.hasDecisionMakingParentingTimeOrContactClaim","equals":true}]}'::jsonb,
  '[{"field_path":"formApplicability.family.hasDecisionMakingParentingTimeOrContactClaim","question":"Are you making a Family claim about decision-making responsibility, parenting time, or contact with a child?","value_type":"boolean","choices":[{"value":true,"label":"Yes"},{"value":false,"label":"No"},{"value":"not-sure","label":"Not sure"}],"explanation":"This does not assess parenting merits, safety, evidence, schedules, service, filing readiness, or other forms."}]'::jsonb
WHERE NOT EXISTS (
  SELECT 1
  FROM public.legal_form_mapping_rules AS existing
  WHERE existing.is_active = true
    AND existing.canonical_form_id = '501395c9-f7a4-4214-b13b-30b38ce5d85c'::uuid
    AND existing.canonical_form_court_type = 'family'
);
