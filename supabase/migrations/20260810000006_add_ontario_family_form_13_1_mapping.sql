-- Ontario Family Form 13.1 mapping bundle.
-- This migration is restricted to one exact canonical catalogue identity and
-- does not certify filing, service, disclosure completeness, evidence, relief,
-- urgency, deadlines, or legal conclusions.

-- Exact official catalogue provenance only. The stored importer form-number
-- formatting is not used to select or resolve this catalogue record.
UPDATE public.court_form_library AS form
SET
  form_source_id = 'on-court-forms-family-13-1',
  form_source_type = 'official-ontario-court-forms-catalog',
  official_source_url = 'https://ontariocourtforms.on.ca/en/family-law-rules-forms/',
  form_source_title = 'Financial Statement (Property and Support Claims)',
  form_issuing_body = 'Ontario Ministry of the Attorney General, Ontario Court Services',
  form_revision_or_effective_at = 'Version: May 1, 2021; effective: Sept. 1, 2021',
  form_checked_at = DATE '2026-08-10',
  form_review_status = 'verified-catalog-source'
WHERE form.canonical_form_id = '497ac7b5-7ed7-4303-9c9a-621402b06a28'::uuid
  AND form.court_type = 'family';

-- Identity allocation is left to legal_form_mapping_rules.id. The exact active
-- canonical-ID/court-type guard prevents duplicate recommendations.
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
  'starting-case',
  true,
  'on-family-financial-disclosure-r13-01-2',
  'primary-procedural-rule',
  'https://www.ontario.ca/laws/regulation/990114',
  'O. Reg. 114/99, Family Law Rules',
  'r. 13 (1.2)',
  'Ontario e-Laws',
  DATE '2026-08-10',
  'verified-for-workflow',
  'family',
  'financial-disclosure',
  ARRAY['starting-case'],
  '497ac7b5-7ed7-4303-9c9a-621402b06a28'::uuid,
  'family',
  'Version: May 1, 2021; effective: Sept. 1, 2021',
  'verified-for-workflow',
  'ontario-beta-form-mapping-v1',
  '{"all":[{"path":"courtPath","equals":"family"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"starting-case"},{"path":"formApplicability.family.needsPropertyAndSupportFinancialStatement","equals":true}]}'::jsonb,
  '[{"field_path":"formApplicability.family.needsPropertyAndSupportFinancialStatement","question":"Do you need the Financial Statement (Property and Support Claims) for a Family case starting in Ontario?","value_type":"boolean","choices":[{"value":true,"label":"Yes"},{"value":false,"label":"No"},{"value":"not-sure","label":"Not sure"}],"explanation":"Support-only and other claim combinations remain review-required."}]'::jsonb
WHERE NOT EXISTS (
  SELECT 1
  FROM public.legal_form_mapping_rules AS existing
  WHERE existing.is_active = true
    AND existing.canonical_form_id = '497ac7b5-7ed7-4303-9c9a-621402b06a28'::uuid
    AND existing.canonical_form_court_type = 'family'
);
