-- Atomic Civil pleading-posture expansion. This migration changes only the
-- shared question metadata for the six exact Bundle 11 mappings and adds
-- exact Form 27B provenance, stage, and mapping. It does not change existing
-- applicability conditions, deadlines, service, filing readiness, merits, or remedies.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.court_form_library
    WHERE canonical_form_id = 'a4c3343d-1ed5-4da3-b247-8460b5d27b3c'::uuid
      AND court_type = 'civil' AND is_active = true
      AND procedure_stage IN ('starting-case', 'responding')
  ) OR EXISTS (
    SELECT 1 FROM public.court_form_library
    WHERE canonical_form_id = 'a4c3343d-1ed5-4da3-b247-8460b5d27b3c'::uuid
      AND court_type = 'civil' AND is_active = true
      AND procedure_stage NOT IN ('starting-case', 'responding')
  ) THEN
    RAISE EXCEPTION 'Expected active Civil Form 27B at verified prior or repaired stage';
  END IF;
END
$$;

UPDATE public.court_form_library AS form
SET
  procedure_stage = 'responding',
  form_source_id = 'on-court-forms-civil-27b',
  form_source_type = 'official-ontario-court-forms-catalog',
  official_source_url = 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/27b/',
  form_source_title = 'Counterclaim (Against Plaintiff and Person not Already Party to Main Action)',
  form_issuing_body = 'Ontario Ministry of the Attorney General, Ontario Court Services',
  form_revision_or_effective_at = 'Version: July 1, 2007; effective: July 1, 2008',
  form_checked_at = DATE '2026-08-12',
  form_review_status = 'verified-catalog-source'
WHERE form.canonical_form_id = 'a4c3343d-1ed5-4da3-b247-8460b5d27b3c'::uuid
  AND form.court_type = 'civil'
  AND form.is_active = true;

UPDATE public.legal_form_mapping_rules AS mapping
SET applicability_questions = source.applicability_questions
FROM (
  SELECT '[{"field_path":"formApplicability.civil.pleadingPosture","question":"Which Civil Rules pleading are you preparing?","value_type":"string","choices":[{"value":"counterclaim-existing-parties","label":"Counterclaim against parties already in the main action (Form 27A)"},{"value":"counterclaim-new-party","label":"Counterclaim against the plaintiff and a person not already a party to the main action (Form 27B)"},{"value":"defence-to-counterclaim","label":"Defence to Counterclaim (Form 27C)"},{"value":"reply-to-defence-to-counterclaim","label":"Reply to Defence to Counterclaim (Form 27D)"},{"value":"crossclaim","label":"Crossclaim (Form 28A)"},{"value":"reply-to-defence-to-crossclaim","label":"Reply to Defence to Crossclaim (Form 28C)"},{"value":"reply-to-third-party-defence","label":"Reply to Third Party Defence (Form 29C)"}],"explanation":"This does not assess deadlines, service, filing readiness, evidence, remedies, or merits."}]'::jsonb AS applicability_questions
) AS source
WHERE mapping.canonical_form_id IN (
  '92121753-d5a5-45e5-9cb6-21b837de7c13'::uuid,
  '8135da24-53f9-4360-a7c4-81d66fe8530a'::uuid,
  'a73f2f4c-8dc7-4bb6-a10b-a50e17a7d185'::uuid,
  'ce2bebe1-9c12-469f-bcca-ebb4d7968216'::uuid,
  'b2cc9170-cb22-4087-843e-1b4ca4eb2620'::uuid,
  '79f07cdf-6f02-4857-8402-1b77addfa7f6'::uuid
)
  AND mapping.canonical_form_court_type = 'civil'
  AND mapping.is_active = true
  AND mapping.authority_topic = 'civil-pleading-posture';

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
  'civil',
  'responding',
  true,
  'on-civil-counterclaim-new-party-r27-02-03',
  'primary-procedural-rule',
  'https://www.ontario.ca/laws/regulation/900194',
  'R.R.O. 1990, Reg. 194, Rules of Civil Procedure',
  'rr. 27.02-27.03',
  'Ontario e-Laws',
  DATE '2026-08-12',
  'verified-for-workflow',
  'civil',
  'civil-pleading-posture',
  ARRAY['responding'],
  'a4c3343d-1ed5-4da3-b247-8460b5d27b3c'::uuid,
  'civil',
  'Version: July 1, 2007; effective: July 1, 2008',
  'verified-for-workflow',
  'ontario-beta-form-mapping-v1',
  '{"all":[{"path":"courtPath","equals":"civil"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"responding"},{"path":"formApplicability.civil.pleadingPosture","equals":"counterclaim-new-party"}]}'::jsonb,
  '[{"field_path":"formApplicability.civil.pleadingPosture","question":"Which Civil Rules pleading are you preparing?","value_type":"string","choices":[{"value":"counterclaim-existing-parties","label":"Counterclaim against parties already in the main action (Form 27A)"},{"value":"counterclaim-new-party","label":"Counterclaim against the plaintiff and a person not already a party to the main action (Form 27B)"},{"value":"defence-to-counterclaim","label":"Defence to Counterclaim (Form 27C)"},{"value":"reply-to-defence-to-counterclaim","label":"Reply to Defence to Counterclaim (Form 27D)"},{"value":"crossclaim","label":"Crossclaim (Form 28A)"},{"value":"reply-to-defence-to-crossclaim","label":"Reply to Defence to Crossclaim (Form 28C)"},{"value":"reply-to-third-party-defence","label":"Reply to Third Party Defence (Form 29C)"}],"explanation":"This does not assess deadlines, service, filing readiness, evidence, remedies, or merits."}]'::jsonb
WHERE NOT EXISTS (
  SELECT 1
  FROM public.legal_form_mapping_rules AS existing
  WHERE existing.is_active = true
    AND existing.canonical_form_id = 'a4c3343d-1ed5-4da3-b247-8460b5d27b3c'::uuid
    AND existing.canonical_form_court_type = 'civil'
);
