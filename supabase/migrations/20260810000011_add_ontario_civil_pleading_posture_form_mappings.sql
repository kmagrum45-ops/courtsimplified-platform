-- Ontario Civil pleading-posture mappings. Runtime selection remains exact
-- canonical_form_id plus court type; no catalogue labels or paths are used.
-- This bundle does not certify pleading deadlines, service, filing readiness,
-- evidence, remedies, merits, or any pleading outside these exact records.

DO $$
BEGIN
  IF (
    SELECT count(DISTINCT canonical_form_id)
    FROM public.court_form_library
    WHERE (canonical_form_id, court_type) IN (
      ('92121753-d5a5-45e5-9cb6-21b837de7c13'::uuid, 'civil'),
      ('8135da24-53f9-4360-a7c4-81d66fe8530a'::uuid, 'civil'),
      ('a73f2f4c-8dc7-4bb6-a10b-a50e17a7d185'::uuid, 'civil'),
      ('ce2bebe1-9c12-469f-bcca-ebb4d7968216'::uuid, 'civil'),
      ('b2cc9170-cb22-4087-843e-1b4ca4eb2620'::uuid, 'civil')
    ) AND is_active = true
  ) <> 5 OR EXISTS (
    SELECT 1
    FROM public.court_form_library AS form
    JOIN (
      VALUES
        ('92121753-d5a5-45e5-9cb6-21b837de7c13'::uuid, 'responding'::text, 'starting-case'::text),
        ('8135da24-53f9-4360-a7c4-81d66fe8530a'::uuid, 'responding'::text, 'starting-case'::text),
        ('a73f2f4c-8dc7-4bb6-a10b-a50e17a7d185'::uuid, 'already-started'::text, 'starting-case'::text),
        ('ce2bebe1-9c12-469f-bcca-ebb4d7968216'::uuid, 'responding'::text, 'starting-case'::text),
        ('b2cc9170-cb22-4087-843e-1b4ca4eb2620'::uuid, 'already-started'::text, 'starting-case'::text),
        ('79f07cdf-6f02-4857-8402-1b77addfa7f6'::uuid, 'responding'::text, 'responding'::text)
    ) AS source(canonical_form_id, expected_stage, prior_stage)
      ON form.canonical_form_id = source.canonical_form_id
    WHERE form.court_type = 'civil'
      AND form.is_active = true
      AND form.procedure_stage IS DISTINCT FROM source.expected_stage
      AND form.procedure_stage IS DISTINCT FROM source.prior_stage
  ) THEN
    RAISE EXCEPTION 'Expected active Civil pleading catalogue records at their verified prior or repaired stages';
  END IF;
END
$$;

UPDATE public.court_form_library AS form
SET
  procedure_stage = source.procedure_stage,
  form_source_id = source.form_source_id,
  form_source_type = 'official-ontario-court-forms-catalog',
  official_source_url = source.official_source_url,
  form_source_title = source.form_source_title,
  form_issuing_body = 'Ontario Ministry of the Attorney General, Ontario Court Services',
  form_revision_or_effective_at = 'Version: July 1, 2007; effective: July 1, 2008',
  form_checked_at = DATE '2026-08-11',
  form_review_status = 'verified-catalog-source'
FROM (
  VALUES
    ('92121753-d5a5-45e5-9cb6-21b837de7c13'::uuid, 'civil'::text, 'responding'::text, 'on-court-forms-civil-27a'::text, 'Counterclaim (Against Parties to Main Action Only)'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/27a/'::text),
    ('8135da24-53f9-4360-a7c4-81d66fe8530a'::uuid, 'civil'::text, 'responding'::text, 'on-court-forms-civil-27c'::text, 'Defence to Counterclaim'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/27c/'::text),
    ('a73f2f4c-8dc7-4bb6-a10b-a50e17a7d185'::uuid, 'civil'::text, 'already-started'::text, 'on-court-forms-civil-27d'::text, 'Reply to Defence to Counterclaim'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/27d/'::text),
    ('ce2bebe1-9c12-469f-bcca-ebb4d7968216'::uuid, 'civil'::text, 'responding'::text, 'on-court-forms-civil-28a'::text, 'Crossclaim'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/28a/'::text),
    ('b2cc9170-cb22-4087-843e-1b4ca4eb2620'::uuid, 'civil'::text, 'already-started'::text, 'on-court-forms-civil-28c'::text, 'Reply to Defence to Crossclaim'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/28c/'::text),
    ('79f07cdf-6f02-4857-8402-1b77addfa7f6'::uuid, 'civil'::text, 'responding'::text, 'on-court-forms-civil-29c'::text, 'Reply to Third Party Defence'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/29c/'::text)
) AS source(canonical_form_id, court_type, procedure_stage, form_source_id, form_source_title, official_source_url)
WHERE form.canonical_form_id = source.canonical_form_id
  AND form.court_type = source.court_type
  AND form.is_active = true;

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
  source.procedure_stage,
  true,
  source.authority_source_id,
  'primary-procedural-rule',
  'https://www.ontario.ca/laws/regulation/900194',
  'R.R.O. 1990, Reg. 194, Rules of Civil Procedure',
  source.authority_pinpoint,
  'Ontario e-Laws',
  DATE '2026-08-11',
  'verified-for-workflow',
  source.court_area,
  'civil-pleading-posture',
  ARRAY[source.procedure_stage],
  source.canonical_form_id,
  source.court_area,
  'Version: July 1, 2007; effective: July 1, 2008',
  'verified-for-workflow',
  'ontario-beta-form-mapping-v1',
  source.applicability_conditions,
  source.applicability_questions
FROM (
  VALUES
    ('civil'::text, 'responding'::text, 'on-civil-counterclaim-r27-01-02'::text, 'rr. 27.01-27.02'::text, '92121753-d5a5-45e5-9cb6-21b837de7c13'::uuid, '{"all":[{"path":"courtPath","equals":"civil"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"responding"},{"path":"formApplicability.civil.pleadingPosture","equals":"counterclaim-existing-parties"}]}'::jsonb, '[{"field_path":"formApplicability.civil.pleadingPosture","question":"Which Civil Rules pleading are you preparing?","value_type":"string","choices":[{"value":"counterclaim-existing-parties","label":"Counterclaim against parties already in the main action (Form 27A)"},{"value":"defence-to-counterclaim","label":"Defence to Counterclaim (Form 27C)"},{"value":"reply-to-defence-to-counterclaim","label":"Reply to Defence to Counterclaim (Form 27D)"},{"value":"crossclaim","label":"Crossclaim (Form 28A)"},{"value":"reply-to-defence-to-crossclaim","label":"Reply to Defence to Crossclaim (Form 28C)"},{"value":"reply-to-third-party-defence","label":"Reply to Third Party Defence (Form 29C)"}],"explanation":"This does not assess deadlines, service, filing readiness, evidence, remedies, or merits."}]'::jsonb),
    ('civil'::text, 'responding'::text, 'on-civil-defence-counterclaim-r27-05'::text, 'r. 27.05'::text, '8135da24-53f9-4360-a7c4-81d66fe8530a'::uuid, '{"all":[{"path":"courtPath","equals":"civil"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"responding"},{"path":"formApplicability.civil.pleadingPosture","equals":"defence-to-counterclaim"}]}'::jsonb, '[{"field_path":"formApplicability.civil.pleadingPosture","question":"Which Civil Rules pleading are you preparing?","value_type":"string","choices":[{"value":"counterclaim-existing-parties","label":"Counterclaim against parties already in the main action (Form 27A)"},{"value":"defence-to-counterclaim","label":"Defence to Counterclaim (Form 27C)"},{"value":"reply-to-defence-to-counterclaim","label":"Reply to Defence to Counterclaim (Form 27D)"},{"value":"crossclaim","label":"Crossclaim (Form 28A)"},{"value":"reply-to-defence-to-crossclaim","label":"Reply to Defence to Crossclaim (Form 28C)"},{"value":"reply-to-third-party-defence","label":"Reply to Third Party Defence (Form 29C)"}],"explanation":"This does not assess deadlines, service, filing readiness, evidence, remedies, or merits."}]'::jsonb),
    ('civil'::text, 'already-started'::text, 'on-civil-reply-defence-counterclaim-r27-06'::text, 'r. 27.06'::text, 'a73f2f4c-8dc7-4bb6-a10b-a50e17a7d185'::uuid, '{"all":[{"path":"courtPath","equals":"civil"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"already-started"},{"path":"formApplicability.civil.pleadingPosture","equals":"reply-to-defence-to-counterclaim"}]}'::jsonb, '[{"field_path":"formApplicability.civil.pleadingPosture","question":"Which Civil Rules pleading are you preparing?","value_type":"string","choices":[{"value":"counterclaim-existing-parties","label":"Counterclaim against parties already in the main action (Form 27A)"},{"value":"defence-to-counterclaim","label":"Defence to Counterclaim (Form 27C)"},{"value":"reply-to-defence-to-counterclaim","label":"Reply to Defence to Counterclaim (Form 27D)"},{"value":"crossclaim","label":"Crossclaim (Form 28A)"},{"value":"reply-to-defence-to-crossclaim","label":"Reply to Defence to Crossclaim (Form 28C)"},{"value":"reply-to-third-party-defence","label":"Reply to Third Party Defence (Form 29C)"}],"explanation":"This does not assess deadlines, service, filing readiness, evidence, remedies, or merits."}]'::jsonb),
    ('civil'::text, 'responding'::text, 'on-civil-crossclaim-r28-01-02'::text, 'rr. 28.01-28.02'::text, 'ce2bebe1-9c12-469f-bcca-ebb4d7968216'::uuid, '{"all":[{"path":"courtPath","equals":"civil"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"responding"},{"path":"formApplicability.civil.pleadingPosture","equals":"crossclaim"}]}'::jsonb, '[{"field_path":"formApplicability.civil.pleadingPosture","question":"Which Civil Rules pleading are you preparing?","value_type":"string","choices":[{"value":"counterclaim-existing-parties","label":"Counterclaim against parties already in the main action (Form 27A)"},{"value":"defence-to-counterclaim","label":"Defence to Counterclaim (Form 27C)"},{"value":"reply-to-defence-to-counterclaim","label":"Reply to Defence to Counterclaim (Form 27D)"},{"value":"crossclaim","label":"Crossclaim (Form 28A)"},{"value":"reply-to-defence-to-crossclaim","label":"Reply to Defence to Crossclaim (Form 28C)"},{"value":"reply-to-third-party-defence","label":"Reply to Third Party Defence (Form 29C)"}],"explanation":"This does not assess deadlines, service, filing readiness, evidence, remedies, or merits."}]'::jsonb),
    ('civil'::text, 'already-started'::text, 'on-civil-reply-defence-crossclaim-r28-08'::text, 'r. 28.08'::text, 'b2cc9170-cb22-4087-843e-1b4ca4eb2620'::uuid, '{"all":[{"path":"courtPath","equals":"civil"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"already-started"},{"path":"formApplicability.civil.pleadingPosture","equals":"reply-to-defence-to-crossclaim"}]}'::jsonb, '[{"field_path":"formApplicability.civil.pleadingPosture","question":"Which Civil Rules pleading are you preparing?","value_type":"string","choices":[{"value":"counterclaim-existing-parties","label":"Counterclaim against parties already in the main action (Form 27A)"},{"value":"defence-to-counterclaim","label":"Defence to Counterclaim (Form 27C)"},{"value":"reply-to-defence-to-counterclaim","label":"Reply to Defence to Counterclaim (Form 27D)"},{"value":"crossclaim","label":"Crossclaim (Form 28A)"},{"value":"reply-to-defence-to-crossclaim","label":"Reply to Defence to Crossclaim (Form 28C)"},{"value":"reply-to-third-party-defence","label":"Reply to Third Party Defence (Form 29C)"}],"explanation":"This does not assess deadlines, service, filing readiness, evidence, remedies, or merits."}]'::jsonb),
    ('civil'::text, 'responding'::text, 'on-civil-reply-third-party-defence-r29-04'::text, 'r. 29.04'::text, '79f07cdf-6f02-4857-8402-1b77addfa7f6'::uuid, '{"all":[{"path":"courtPath","equals":"civil"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"responding"},{"path":"formApplicability.civil.pleadingPosture","equals":"reply-to-third-party-defence"}]}'::jsonb, '[{"field_path":"formApplicability.civil.pleadingPosture","question":"Which Civil Rules pleading are you preparing?","value_type":"string","choices":[{"value":"counterclaim-existing-parties","label":"Counterclaim against parties already in the main action (Form 27A)"},{"value":"defence-to-counterclaim","label":"Defence to Counterclaim (Form 27C)"},{"value":"reply-to-defence-to-counterclaim","label":"Reply to Defence to Counterclaim (Form 27D)"},{"value":"crossclaim","label":"Crossclaim (Form 28A)"},{"value":"reply-to-defence-to-crossclaim","label":"Reply to Defence to Crossclaim (Form 28C)"},{"value":"reply-to-third-party-defence","label":"Reply to Third Party Defence (Form 29C)"}],"explanation":"This does not assess deadlines, service, filing readiness, evidence, remedies, or merits."}]'::jsonb)
) AS source(court_area, procedure_stage, authority_source_id, authority_pinpoint, canonical_form_id, applicability_conditions, applicability_questions)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.legal_form_mapping_rules AS existing
  WHERE existing.is_active = true
    AND existing.canonical_form_id = source.canonical_form_id
    AND existing.canonical_form_court_type = source.court_area
);
