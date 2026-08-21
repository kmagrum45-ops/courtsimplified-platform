-- Repair only source-proven PDF/DOCX canonical identity splits. No asset is
-- deleted, deactivated, moved, or retitled by path; no mapping is changed.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.court_form_library
    WHERE canonical_form_id = '6cdaec7b-5e8b-4f31-a360-580fc85660d3'::uuid
      AND court_type = 'small-claims' AND file_path = 'ontario/small-claims/scr-15a-aug22-en-fil.pdf' AND file_type = 'pdf' AND is_active = true
  ) OR NOT EXISTS (
    SELECT 1 FROM public.court_form_library
    WHERE canonical_form_id = 'c64b6ee4-f865-4da7-a8e9-6d26762d7098'::uuid
      AND court_type = 'small-claims' AND file_path = 'ontario/small-claims/scr-15a-aug22-en-fil.docx' AND file_type = 'docx' AND is_active = true
  ) OR NOT EXISTS (
    SELECT 1 FROM public.court_form_library
    WHERE canonical_form_id = '2f3b3dbb-0799-4d81-bcc3-03c2116dfe4d'::uuid
      AND court_type = 'small-claims' AND file_path = 'ontario/small-claims/scr-20b-jan21-en-fil.pdf' AND file_type = 'pdf' AND is_active = true
  ) OR NOT EXISTS (
    SELECT 1 FROM public.court_form_library
    WHERE canonical_form_id = '1a170388-b11c-4642-a61a-bb95cb6da8ac'::uuid
      AND court_type = 'small-claims' AND file_path = 'ontario/small-claims/scr-20b-jan21-en-fil.docx' AND file_type = 'docx' AND is_active = true
  ) OR NOT EXISTS (
    SELECT 1 FROM public.court_form_library
    WHERE canonical_form_id = '5ad2929b-c763-4f87-b0cf-cb062835b293'::uuid
      AND court_type = 'small-claims' AND file_path = 'ontario/small-claims/scr-20n-may25-en-fil.pdf' AND file_type = 'pdf' AND is_active = true
  ) OR NOT EXISTS (
    SELECT 1 FROM public.court_form_library
    WHERE canonical_form_id = '29a85a4b-05bb-47e6-ac3a-75c9c614973c'::uuid
      AND court_type = 'small-claims' AND file_path = 'ontario/small-claims/scr-20n-may25-en-fil.docx' AND file_type = 'docx' AND is_active = true
  ) OR NOT EXISTS (
    SELECT 1 FROM public.court_form_library
    WHERE canonical_form_id = 'd2a6b784-5ac5-491e-860c-8b02645d4957'::uuid
      AND court_type = 'family' AND file_path = 'family/form_17b_2018.pdf' AND file_type = 'pdf' AND is_active = true
  ) OR NOT EXISTS (
    SELECT 1 FROM public.court_form_library
    WHERE canonical_form_id = '5310b079-0ede-4b63-8fbc-dbb04319fc66'::uuid
      AND court_type = 'family' AND file_path = 'ontario/family/family-law-rules/form_17b_2018.docx' AND file_type = 'docx' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Expected exact active Cohort 2 split-identity asset rows';
  END IF;
END
$$;

UPDATE public.court_form_library AS form
SET canonical_form_id = source.canonical_form_id
FROM (
  VALUES
    ('6cdaec7b-5e8b-4f31-a360-580fc85660d3'::uuid, 'small-claims'::text, 'ontario/small-claims/scr-15a-aug22-en-fil.pdf'::text, 'pdf'::text, 'c64b6ee4-f865-4da7-a8e9-6d26762d7098'::uuid),
    ('2f3b3dbb-0799-4d81-bcc3-03c2116dfe4d'::uuid, 'small-claims'::text, 'ontario/small-claims/scr-20b-jan21-en-fil.pdf'::text, 'pdf'::text, '1a170388-b11c-4642-a61a-bb95cb6da8ac'::uuid),
    ('5ad2929b-c763-4f87-b0cf-cb062835b293'::uuid, 'small-claims'::text, 'ontario/small-claims/scr-20n-may25-en-fil.pdf'::text, 'pdf'::text, '29a85a4b-05bb-47e6-ac3a-75c9c614973c'::uuid),
    ('d2a6b784-5ac5-491e-860c-8b02645d4957'::uuid, 'family'::text, 'family/form_17b_2018.pdf'::text, 'pdf'::text, '5310b079-0ede-4b63-8fbc-dbb04319fc66'::uuid)
) AS source(previous_canonical_form_id, court_type, file_path, file_type, canonical_form_id)
WHERE form.canonical_form_id = source.previous_canonical_form_id
  AND form.court_type = source.court_type
  AND form.file_path = source.file_path
  AND form.file_type = source.file_type
  AND form.is_active = true;

UPDATE public.court_form_library AS form
SET
  form_number = source.form_number,
  official_title = source.official_title,
  procedure_stage = source.procedure_stage,
  form_source_id = source.form_source_id,
  form_source_type = 'official-ontario-court-forms-catalog',
  official_source_url = source.official_source_url,
  form_source_title = source.official_title,
  form_issuing_body = 'Ontario Ministry of the Attorney General, Ontario Court Services',
  form_revision_or_effective_at = source.form_revision_or_effective_at,
  form_checked_at = DATE '2026-08-12',
  form_review_status = 'verified-catalog-source'
FROM (
  VALUES
    ('c64b6ee4-f865-4da7-a8e9-6d26762d7098'::uuid, 'small-claims'::text, 'Form 15A'::text, 'Notice of Motion and Supporting Affidavit'::text, 'motion'::text, 'on-court-forms-small-claims-15a'::text, 'https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/15a-1/'::text, 'Version: Aug. 1, 2022; effective: Jan. 30, 2023'::text),
    ('1a170388-b11c-4642-a61a-bb95cb6da8ac'::uuid, 'small-claims'::text, 'Form 20B'::text, 'Writ of Delivery'::text, 'enforcement'::text, 'on-court-forms-small-claims-20b'::text, 'https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/20b-1/'::text, 'Version: Jan. 1, 2021; effective: March 1, 2021'::text),
    ('29a85a4b-05bb-47e6-ac3a-75c9c614973c'::uuid, 'small-claims'::text, 'Form 20N'::text, 'Request to Renew Writ of Seizure and Sale'::text, 'enforcement'::text, 'on-court-forms-small-claims-20n'::text, 'https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/20n-1/'::text, 'Version: May 1, 2025; effective: Oct. 6, 2025'::text),
    ('5310b079-0ede-4b63-8fbc-dbb04319fc66'::uuid, 'family'::text, 'Form 17B'::text, 'Case conference brief for protection application or status review'::text, 'conference'::text, 'on-court-forms-family-17b'::text, 'https://ontariocourtforms.on.ca/en/family-law-rules-forms/17b-1/'::text, 'Version: March 1, 2018; effective: April 30, 2018'::text)
) AS source(canonical_form_id, court_type, form_number, official_title, procedure_stage, form_source_id, official_source_url, form_revision_or_effective_at)
WHERE form.canonical_form_id = source.canonical_form_id
  AND form.court_type = source.court_type
  AND form.is_active = true;
