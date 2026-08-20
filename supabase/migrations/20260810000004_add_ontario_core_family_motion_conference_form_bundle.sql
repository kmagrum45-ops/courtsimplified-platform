-- Ontario core family conference, financial-disclosure, and motion Form Mapping Bundle 4.
-- Each update is limited to an existing exact mapping row. The one additional
-- Form 14A row uses the table identity default and an exact active-ID guard.
-- Nothing here certifies deadlines, urgency, relief, evidence, service, filing
-- readiness, or merits.

-- Verified catalogue provenance for only the supplied canonical ID and court
-- type pairs. No title, form-number, path, or text matching selects a row.
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
    ('b2b46bcf-97ae-42e4-9d01-4a962ea83a2a'::uuid, 'family'::text, 'on-court-forms-family-17a'::text, 'Case Conference Brief - General'::text, 'Version: Sept. 1, 2023; effective: Nov. 27, 2023'::text, 'https://ontariocourtforms.on.ca/en/family-law-rules-forms/'::text),
    ('e6fdaf6d-9aca-4193-853a-0fec07bc84c4'::uuid, 'family'::text, 'on-court-forms-family-14'::text, 'Notice of Motion'::text, 'Version: March 1, 2018; effective: July 1, 2018'::text, 'https://ontariocourtforms.on.ca/en/family-law-rules-forms/'::text),
    ('faaf5ef0-e3c0-426a-ae2a-9e966feb499a'::uuid, 'family'::text, 'on-court-forms-family-14a'::text, 'Affidavit (General)'::text, 'Version: Sept. 1, 2005; effective: May 1, 2006'::text, 'https://ontariocourtforms.on.ca/en/family-law-rules-forms/'::text),
    ('bf8fb6c7-ad37-4f04-98fa-4638ec6f2c9b'::uuid, 'family'::text, 'on-court-forms-family-13'::text, 'Financial Statement (Support Claims)'::text, 'Version: May 1, 2021; effective: Sept. 1, 2021'::text, 'https://ontariocourtforms.on.ca/en/family-law-rules-forms/'::text),
    ('1e9b6788-cb57-42d6-a732-fd8cef53d623'::uuid, 'civil'::text, 'on-court-forms-civil-37a'::text, 'Notice of Motion'::text, 'Version: Sept. 1, 2020; effective: Jan. 1, 2021'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/'::text)
) AS source(canonical_form_id, court_type, form_source_id, form_source_title, form_revision_or_effective_at, official_source_url)
WHERE form.canonical_form_id = source.canonical_form_id
  AND form.court_type = source.court_type;

-- Existing reviewed mapping rows: Form 17A, Form 14, Form 13, and Form 37A.
-- The `procedure_stage` guard preserves the canonical case-stage contract.
UPDATE public.legal_form_mapping_rules AS mapping
SET
  authority_source_id = source.authority_source_id,
  authority_source_type = 'primary-procedural-rule',
  official_source_url = source.official_source_url,
  authority_citation = source.authority_citation,
  authority_pinpoint = source.authority_pinpoint,
  authority_issuing_body = 'Ontario e-Laws',
  authority_checked_at = DATE '2026-08-10',
  authority_review_status = 'verified-for-workflow',
  authority_court_area = source.court_area,
  authority_topic = source.authority_topic,
  authority_stage_applicability = ARRAY[source.case_stage],
  canonical_form_id = source.canonical_form_id,
  canonical_form_court_type = source.court_area,
  form_revision_or_effective_at = source.form_revision_or_effective_at,
  form_review_status = 'verified-for-workflow',
  applicability_conditions = source.applicability_conditions,
  applicability_questions = source.applicability_questions,
  authority_bundle_version = 'ontario-beta-form-mapping-v1'
FROM (
  VALUES
    (3::bigint, 'family'::text, 'conference'::text, 'on-family-case-conference-r17-13'::text, 'conference'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'r. 17 (13) 1'::text, 'b2b46bcf-97ae-42e4-9d01-4a962ea83a2a'::uuid, 'Version: Sept. 1, 2023; effective: Nov. 27, 2023'::text, '{"all":[{"path":"courtPath","equals":"family"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"conference"},{"path":"formApplicability.family.conferenceBriefType","equals":"case-conference-brief-general"}]}'::jsonb, '[{"field_path":"formApplicability.family.conferenceBriefType","question":"Which Family Law Rules conference brief are you preparing?","value_type":"string","choices":[{"value":"case-conference-brief-general","label":"Case Conference Brief - General (Form 17A)"},{"value":"child-protection-or-status-review","label":"Child protection or status-review case conference brief"},{"value":"settlement-conference-brief","label":"Settlement conference brief"},{"value":"trial-management-conference-brief","label":"Trial management conference brief"},{"value":"not-sure","label":"Not sure"}],"explanation":"This does not decide conference requirements, deadlines, or filing readiness."}]'::jsonb),
    (4::bigint, 'family'::text, 'motion'::text, 'on-family-motion-r14-09'::text, 'motion'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'r. 14 (9)'::text, 'e6fdaf6d-9aca-4193-853a-0fec07bc84c4'::uuid, 'Version: March 1, 2018; effective: July 1, 2018'::text, '{"all":[{"path":"courtPath","equals":"family"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"motion"},{"path":"formApplicability.family.motionDocumentSet","equals":"notice-of-motion-and-general-affidavit"}]}'::jsonb, '[{"field_path":"formApplicability.family.motionDocumentSet","question":"Which Family Law Rules motion document set are you preparing?","value_type":"string","choices":[{"value":"notice-of-motion-and-general-affidavit","label":"Notice of Motion (Form 14) and Affidavit (General) (Form 14A)"},{"value":"procedural-or-unopposed-motion","label":"Procedural or uncomplicated/unopposed motion"},{"value":"without-notice-or-urgent-motion","label":"Without-notice or urgent motion"},{"value":"another-motion-document","label":"Another motion document"},{"value":"not-sure","label":"Not sure"}],"explanation":"This does not assess urgency, relief, evidence, deadlines, service, or filing readiness."}]'::jsonb),
    (5::bigint, 'family'::text, 'conference'::text, 'on-family-financial-disclosure-r13-01-1'::text, 'financial-disclosure'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'r. 13 (1.1)'::text, 'bf8fb6c7-ad37-4f04-98fa-4638ec6f2c9b'::uuid, 'Version: May 1, 2021; effective: Sept. 1, 2021'::text, '{"all":[{"path":"courtPath","equals":"family"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"conference"},{"path":"formApplicability.family.financialStatementType","equals":"support-claim-without-property-or-exclusive-possession"}]}'::jsonb, '[{"field_path":"formApplicability.family.financialStatementType","question":"Which Family financial-statement situation applies to the document you are preparing?","value_type":"string","choices":[{"value":"support-claim-without-property-or-exclusive-possession","label":"Support claim without a property claim or exclusive-possession claim"},{"value":"property-or-exclusive-possession-claim","label":"Property or exclusive-possession claim"},{"value":"child-support-table-amount-only","label":"Only table child support amount"},{"value":"not-sure","label":"Not sure"}],"explanation":"This does not decide whether a financial statement is required or filing-ready."}]'::jsonb),
    (10::bigint, 'civil'::text, 'motion'::text, 'on-civil-motion-r37-01'::text, 'motion'::text, 'https://www.ontario.ca/laws/regulation/900194'::text, 'R.R.O. 1990, Reg. 194, Rules of Civil Procedure'::text, 'r. 37.01'::text, '1e9b6788-cb57-42d6-a732-fd8cef53d623'::uuid, 'Version: Sept. 1, 2020; effective: Jan. 1, 2021'::text, '{"all":[{"path":"courtPath","equals":"civil"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"motion"},{"path":"formApplicability.civil.motionDocument","equals":"notice-of-motion-form-37a"}]}'::jsonb, '[{"field_path":"formApplicability.civil.motionDocument","question":"Which civil motion document are you preparing?","value_type":"string","choices":[{"value":"notice-of-motion-form-37a","label":"Notice of Motion (Form 37A)"},{"value":"motion-document-not-form-37a","label":"Another motion document or circumstance where notice may be unnecessary"},{"value":"not-sure","label":"Not sure"}],"explanation":"This does not assess urgency, relief, evidence, deadlines, service, or filing readiness."}]'::jsonb)
) AS source(mapping_id, court_area, case_stage, authority_source_id, authority_topic, official_source_url, authority_citation, authority_pinpoint, canonical_form_id, form_revision_or_effective_at, applicability_conditions, applicability_questions)
WHERE mapping.id = source.mapping_id
  AND mapping.court_area = source.court_area
  AND mapping.procedure_stage = source.case_stage
  AND mapping.is_active = true
  AND mapping.authority_review_status = 'review-required'
  AND mapping.form_review_status = 'review-required';

-- Form 14A is a separate exact canonical recommendation. The shared structured
-- condition deliberately produces no recommendation for Forms 14B-14D or any
-- uncertain, urgent, without-notice, procedural, or other motion path.
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
  'motion',
  true,
  'on-family-motion-r14-09',
  'primary-procedural-rule',
  'https://www.ontario.ca/laws/regulation/990114',
  'O. Reg. 114/99, Family Law Rules',
  'r. 14 (9)',
  'Ontario e-Laws',
  DATE '2026-08-10',
  'verified-for-workflow',
  'family',
  'motion',
  ARRAY['motion'],
  'faaf5ef0-e3c0-426a-ae2a-9e966feb499a'::uuid,
  'family',
  'Version: Sept. 1, 2005; effective: May 1, 2006',
  'verified-for-workflow',
  'ontario-beta-form-mapping-v1',
  '{"all":[{"path":"courtPath","equals":"family"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"motion"},{"path":"formApplicability.family.motionDocumentSet","equals":"notice-of-motion-and-general-affidavit"}]}'::jsonb,
  '[{"field_path":"formApplicability.family.motionDocumentSet","question":"Which Family Law Rules motion document set are you preparing?","value_type":"string","choices":[{"value":"notice-of-motion-and-general-affidavit","label":"Notice of Motion (Form 14) and Affidavit (General) (Form 14A)"},{"value":"procedural-or-unopposed-motion","label":"Procedural or uncomplicated/unopposed motion"},{"value":"without-notice-or-urgent-motion","label":"Without-notice or urgent motion"},{"value":"another-motion-document","label":"Another motion document"},{"value":"not-sure","label":"Not sure"}],"explanation":"This does not assess urgency, relief, evidence, deadlines, service, or filing readiness."}]'::jsonb
WHERE NOT EXISTS (
  SELECT 1
  FROM public.legal_form_mapping_rules AS existing
  WHERE existing.is_active = true
    AND existing.canonical_form_id = 'faaf5ef0-e3c0-426a-ae2a-9e966feb499a'::uuid
    AND existing.canonical_form_court_type = 'family'
);
