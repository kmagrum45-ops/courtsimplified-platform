-- Ontario exact Family motion-to-change response and Civil third-party defence.
-- The Small Claims Form 11.3A candidate is deliberately excluded: the canonical
-- catalogue stage is starting-case, not a distinct discontinuance stage.
-- Nothing in this migration certifies deadlines, service, filing readiness,
-- merits, remedies, evidence, urgency, or any additional form.

-- Exact official catalogue provenance.  Runtime resolution remains canonical ID
-- plus court type only; no title, form number, or file path is used to select rows.
UPDATE public.court_form_library AS form
SET
  form_source_id = source.form_source_id,
  form_source_type = 'official-ontario-court-forms-catalog',
  official_source_url = source.official_source_url,
  form_source_title = source.form_source_title,
  form_issuing_body = 'Ontario Ministry of the Attorney General, Ontario Court Services',
  form_revision_or_effective_at = source.form_revision_or_effective_at,
  form_checked_at = DATE '2026-08-10',
  form_review_status = 'verified-catalog-source'
FROM (
  VALUES
    ('ac3d1227-0c45-4f8d-8428-b291f5b3d437'::uuid, 'family'::text, 'on-court-forms-family-15'::text, 'Motion to Change'::text, 'Version: Sept. 1, 2021; effective: Dec. 1, 2021'::text, 'https://ontariocourtforms.on.ca/en/family-law-rules-forms/15-2/'::text),
    ('f38325dc-0a6a-40ec-bb01-75293f7d68b5'::uuid, 'family'::text, 'on-court-forms-family-15b'::text, 'Response to Motion to Change'::text, 'Version: Dec. 1, 2020; effective: March 1, 2021'::text, 'https://ontariocourtforms.on.ca/en/family-law-rules-forms/15b/'::text),
    ('dc9f6b2e-ef9b-45b8-9ee5-7fe2c9aa697d'::uuid, 'family'::text, 'on-court-forms-family-15c'::text, 'Consent Motion to Change'::text, 'Version: Dec. 1, 2020; effective: March 1, 2021'::text, 'https://ontariocourtforms.on.ca/en/family-law-rules-forms/15c-1/'::text),
    ('cdba6867-648f-40be-ac57-8094d5f0db7d'::uuid, 'civil'::text, 'on-court-forms-civil-29b'::text, 'Third Party Defence'::text, 'Version: July 1, 2007; effective: July 1, 2008'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/29b/'::text)
) AS source(canonical_form_id, court_type, form_source_id, form_source_title, form_revision_or_effective_at, official_source_url)
WHERE form.canonical_form_id = source.canonical_form_id
  AND form.court_type = source.court_type
  AND form.is_active = true;

-- Shared question metadata must be identical for all active mappings at a
-- court-area/stage.  These exact-ID updates add only the new mutually exclusive
-- response choices; existing recommendation conditions are unchanged.
UPDATE public.legal_form_mapping_rules AS mapping
SET applicability_questions = source.applicability_questions
FROM (
  VALUES
    ('e6fdaf6d-9aca-4193-853a-0fec07bc84c4'::uuid, 'family'::text, '[{"field_path":"formApplicability.family.motionDocumentSet","question":"Which Family Law Rules motion document set are you preparing?","value_type":"string","choices":[{"value":"notice-of-motion-and-general-affidavit","label":"Notice of Motion (Form 14) and Affidavit (General) (Form 14A)"},{"value":"motion-to-change","label":"I am asking to change a final order or support agreement (Form 15)"},{"value":"response-to-motion-to-change","label":"I am responding to a Motion to Change a final order or support agreement and do not agree with the change or seek a different or additional change (Form 15B)"},{"value":"consent-motion-to-change","label":"I agree with the change or the parties agree on a different change (Form 15C)"},{"value":"procedural-or-unopposed-motion","label":"Procedural or uncomplicated/unopposed motion"},{"value":"without-notice-or-urgent-motion","label":"Without-notice or urgent motion"},{"value":"another-motion-document","label":"Another motion document"},{"value":"not-sure","label":"Not sure"}],"explanation":"This does not assess urgency, relief, evidence, deadlines, service, or filing readiness."}]'::jsonb),
    ('faaf5ef0-e3c0-426a-ae2a-9e966feb499a'::uuid, 'family'::text, '[{"field_path":"formApplicability.family.motionDocumentSet","question":"Which Family Law Rules motion document set are you preparing?","value_type":"string","choices":[{"value":"notice-of-motion-and-general-affidavit","label":"Notice of Motion (Form 14) and Affidavit (General) (Form 14A)"},{"value":"motion-to-change","label":"I am asking to change a final order or support agreement (Form 15)"},{"value":"response-to-motion-to-change","label":"I am responding to a Motion to Change a final order or support agreement and do not agree with the change or seek a different or additional change (Form 15B)"},{"value":"consent-motion-to-change","label":"I agree with the change or the parties agree on a different change (Form 15C)"},{"value":"procedural-or-unopposed-motion","label":"Procedural or uncomplicated/unopposed motion"},{"value":"without-notice-or-urgent-motion","label":"Without-notice or urgent motion"},{"value":"another-motion-document","label":"Another motion document"},{"value":"not-sure","label":"Not sure"}],"explanation":"This does not assess urgency, relief, evidence, deadlines, service, or filing readiness."}]'::jsonb),
    ('502cd465-720a-4d71-8b6c-a7eefe788657'::uuid, 'civil'::text, '[{"field_path":"formApplicability.civil.responseDocument","question":"Which civil response document are you preparing?","value_type":"string","choices":[{"value":"statement-of-defence","label":"I am preparing a Statement of Defence in response to a civil Statement of Claim."},{"value":"notice-of-intent-to-defend","label":"Notice of Intent to Defend"},{"value":"third-party-defence","label":"I am preparing a Third Party Defence in response to a Civil Third Party Claim (Form 29B)"},{"value":"application","label":"Application"},{"value":"motion","label":"Motion"},{"value":"appeal","label":"Appeal"},{"value":"not-sure","label":"Not sure"}]}]'::jsonb),
    ('38ecdb74-266d-4b46-908e-ddccfb3030df'::uuid, 'civil'::text, '[{"field_path":"formApplicability.civil.responseDocument","question":"Which civil response document are you preparing?","value_type":"string","choices":[{"value":"statement-of-defence","label":"I am preparing a Statement of Defence in response to a civil Statement of Claim."},{"value":"notice-of-intent-to-defend","label":"Notice of Intent to Defend"},{"value":"third-party-defence","label":"I am preparing a Third Party Defence in response to a Civil Third Party Claim (Form 29B)"},{"value":"application","label":"Application"},{"value":"motion","label":"Motion"},{"value":"appeal","label":"Appeal"},{"value":"not-sure","label":"Not sure"}]}]'::jsonb)
) AS source(canonical_form_id, canonical_form_court_type, applicability_questions)
WHERE mapping.canonical_form_id = source.canonical_form_id
  AND mapping.canonical_form_court_type = source.canonical_form_court_type
  AND mapping.is_active = true
  AND mapping.authority_review_status = 'verified-for-workflow'
  AND mapping.form_review_status = 'verified-for-workflow'
  AND mapping.authority_bundle_version = 'ontario-beta-form-mapping-v1';

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
    ('family'::text, 'motion'::text, 'on-family-motion-change-r15-05'::text, 'motion-to-change'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'r. 15 (5)'::text, 'ac3d1227-0c45-4f8d-8428-b291f5b3d437'::uuid, 'Version: Sept. 1, 2021; effective: Dec. 1, 2021'::text, '{"all":[{"path":"courtPath","equals":"family"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"motion"},{"path":"formApplicability.family.motionDocumentSet","equals":"motion-to-change"}]}'::jsonb, '[{"field_path":"formApplicability.family.motionDocumentSet","question":"Which Family Law Rules motion document set are you preparing?","value_type":"string","choices":[{"value":"notice-of-motion-and-general-affidavit","label":"Notice of Motion (Form 14) and Affidavit (General) (Form 14A)"},{"value":"motion-to-change","label":"I am asking to change a final order or support agreement (Form 15)"},{"value":"response-to-motion-to-change","label":"I am responding to a Motion to Change a final order or support agreement and do not agree with the change or seek a different or additional change (Form 15B)"},{"value":"consent-motion-to-change","label":"I agree with the change or the parties agree on a different change (Form 15C)"},{"value":"procedural-or-unopposed-motion","label":"Procedural or uncomplicated/unopposed motion"},{"value":"without-notice-or-urgent-motion","label":"Without-notice or urgent motion"},{"value":"another-motion-document","label":"Another motion document"},{"value":"not-sure","label":"Not sure"}],"explanation":"This does not assess urgency, relief, evidence, deadlines, service, or filing readiness."}]'::jsonb),
    ('family'::text, 'motion'::text, 'on-family-response-motion-change-r15-9-1'::text, 'response-to-motion-to-change'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'r. 15 (9) 1'::text, 'f38325dc-0a6a-40ec-bb01-75293f7d68b5'::uuid, 'Version: Dec. 1, 2020; effective: March 1, 2021'::text, '{"all":[{"path":"courtPath","equals":"family"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"motion"},{"path":"formApplicability.family.motionDocumentSet","equals":"response-to-motion-to-change"}]}'::jsonb, '[{"field_path":"formApplicability.family.motionDocumentSet","question":"Which Family Law Rules motion document set are you preparing?","value_type":"string","choices":[{"value":"notice-of-motion-and-general-affidavit","label":"Notice of Motion (Form 14) and Affidavit (General) (Form 14A)"},{"value":"motion-to-change","label":"I am asking to change a final order or support agreement (Form 15)"},{"value":"response-to-motion-to-change","label":"I am responding to a Motion to Change a final order or support agreement and do not agree with the change or seek a different or additional change (Form 15B)"},{"value":"consent-motion-to-change","label":"I agree with the change or the parties agree on a different change (Form 15C)"},{"value":"procedural-or-unopposed-motion","label":"Procedural or uncomplicated/unopposed motion"},{"value":"without-notice-or-urgent-motion","label":"Without-notice or urgent motion"},{"value":"another-motion-document","label":"Another motion document"},{"value":"not-sure","label":"Not sure"}],"explanation":"This does not assess urgency, relief, evidence, deadlines, service, or filing readiness."}]'::jsonb),
    ('family'::text, 'motion'::text, 'on-family-consent-motion-change-r15-9-2'::text, 'consent-motion-to-change'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'r. 15 (9) 2'::text, 'dc9f6b2e-ef9b-45b8-9ee5-7fe2c9aa697d'::uuid, 'Version: Dec. 1, 2020; effective: March 1, 2021'::text, '{"all":[{"path":"courtPath","equals":"family"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"motion"},{"path":"formApplicability.family.motionDocumentSet","equals":"consent-motion-to-change"}]}'::jsonb, '[{"field_path":"formApplicability.family.motionDocumentSet","question":"Which Family Law Rules motion document set are you preparing?","value_type":"string","choices":[{"value":"notice-of-motion-and-general-affidavit","label":"Notice of Motion (Form 14) and Affidavit (General) (Form 14A)"},{"value":"motion-to-change","label":"I am asking to change a final order or support agreement (Form 15)"},{"value":"response-to-motion-to-change","label":"I am responding to a Motion to Change a final order or support agreement and do not agree with the change or seek a different or additional change (Form 15B)"},{"value":"consent-motion-to-change","label":"I agree with the change or the parties agree on a different change (Form 15C)"},{"value":"procedural-or-unopposed-motion","label":"Procedural or uncomplicated/unopposed motion"},{"value":"without-notice-or-urgent-motion","label":"Without-notice or urgent motion"},{"value":"another-motion-document","label":"Another motion document"},{"value":"not-sure","label":"Not sure"}],"explanation":"This does not assess urgency, relief, evidence, deadlines, service, or filing readiness."}]'::jsonb),
    ('civil'::text, 'responding'::text, 'on-civil-third-party-defence-r29-03'::text, 'third-party-defence'::text, 'https://www.ontario.ca/laws/regulation/900194'::text, 'R.R.O. 1990, Reg. 194, Rules of Civil Procedure'::text, 'r. 29.03'::text, 'cdba6867-648f-40be-ac57-8094d5f0db7d'::uuid, 'Version: July 1, 2007; effective: July 1, 2008'::text, '{"all":[{"path":"courtPath","equals":"civil"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"responding"},{"path":"formApplicability.civil.responseDocument","equals":"third-party-defence"}]}'::jsonb, '[{"field_path":"formApplicability.civil.responseDocument","question":"Which civil response document are you preparing?","value_type":"string","choices":[{"value":"statement-of-defence","label":"I am preparing a Statement of Defence in response to a civil Statement of Claim."},{"value":"notice-of-intent-to-defend","label":"Notice of Intent to Defend"},{"value":"third-party-defence","label":"I am preparing a Third Party Defence in response to a Civil Third Party Claim (Form 29B)"},{"value":"application","label":"Application"},{"value":"motion","label":"Motion"},{"value":"appeal","label":"Appeal"},{"value":"not-sure","label":"Not sure"}]}]'::jsonb)
) AS source(court_area, case_stage, authority_source_id, authority_topic, official_source_url, authority_citation, authority_pinpoint, canonical_form_id, form_revision_or_effective_at, applicability_conditions, applicability_questions)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.legal_form_mapping_rules AS existing
  WHERE existing.is_active = true
    AND existing.canonical_form_id = source.canonical_form_id
    AND existing.canonical_form_court_type = source.court_area
);
