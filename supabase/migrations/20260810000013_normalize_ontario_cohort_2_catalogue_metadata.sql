-- Normalize only exact, source-proven active catalogue metadata. This migration
-- creates no legal_form_mapping_rules rows and does not change physical assets.

DO $$
BEGIN
  IF (
    SELECT count(DISTINCT (canonical_form_id, court_type))
    FROM public.court_form_library
    WHERE is_active = true
      AND (canonical_form_id, court_type) IN (
        ('4300c97c-a430-45b4-b7cb-da90f0d9be20'::uuid, 'small-claims'),
        ('f7ba6b3f-ad58-49f2-8c1d-affc12835d2f'::uuid, 'small-claims'),
        ('78946826-4c9a-4a4d-907b-3cda465d7869'::uuid, 'small-claims'),
        ('49b1171a-5a50-4067-9035-59c8626fade8'::uuid, 'small-claims'),
        ('ebb42456-5262-487b-aa9e-a3e4d766e332'::uuid, 'family')
      )
  ) <> 5 THEN
    RAISE EXCEPTION 'Expected five exact active Cohort 2 catalogue repair identities';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.court_form_library
    WHERE is_active = true
      AND (
        (canonical_form_id = '4300c97c-a430-45b4-b7cb-da90f0d9be20'::uuid AND court_type = 'small-claims' AND procedure_stage IS DISTINCT FROM 'starting-case') OR
        (canonical_form_id = 'f7ba6b3f-ad58-49f2-8c1d-affc12835d2f'::uuid AND court_type = 'small-claims' AND procedure_stage IS DISTINCT FROM 'enforcement') OR
        (canonical_form_id = '78946826-4c9a-4a4d-907b-3cda465d7869'::uuid AND court_type = 'small-claims' AND procedure_stage IS DISTINCT FROM 'enforcement') OR
        (canonical_form_id = '49b1171a-5a50-4067-9035-59c8626fade8'::uuid AND court_type = 'small-claims' AND procedure_stage IS DISTINCT FROM 'enforcement') OR
        (canonical_form_id = 'ebb42456-5262-487b-aa9e-a3e4d766e332'::uuid AND court_type = 'family' AND procedure_stage IS DISTINCT FROM 'starting-case')
      )
  ) THEN
    RAISE EXCEPTION 'Cohort 2 catalogue repair target has an unexpected pre-update stage';
  END IF;
END
$$;

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
    ('4300c97c-a430-45b4-b7cb-da90f0d9be20'::uuid, 'small-claims'::text, 'Form 11.3A'::text, 'Notice of Discontinued Claim'::text, 'already-started'::text, 'on-court-forms-small-claims-11-3a'::text, 'https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/113a/'::text, 'Version: Jan. 23, 2014; effective: July 18, 2014'::text),
    ('f7ba6b3f-ad58-49f2-8c1d-affc12835d2f'::uuid, 'small-claims'::text, 'Form 20A'::text, 'Certificate of Judgment'::text, 'enforcement'::text, 'on-court-forms-small-claims-20a'::text, 'https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/20a/'::text, 'Version: Jan. 23, 2014; effective: July 18, 2014'::text),
    ('78946826-4c9a-4a4d-907b-3cda465d7869'::uuid, 'small-claims'::text, 'Form 20D'::text, 'Writ of Seizure and Sale of Land'::text, 'enforcement'::text, 'on-court-forms-small-claims-20d'::text, 'https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/20d/'::text, 'Version: May 1, 2025; effective: Oct. 6, 2025'::text),
    ('49b1171a-5a50-4067-9035-59c8626fade8'::uuid, 'small-claims'::text, 'Form 20E'::text, 'Notice of Garnishment'::text, 'enforcement'::text, 'on-court-forms-small-claims-20e'::text, 'https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/20e/'::text, 'Version: Jan. 1, 2021; effective: March 1, 2021'::text),
    ('ebb42456-5262-487b-aa9e-a3e4d766e332'::uuid, 'family'::text, 'Form 17D'::text, 'Settlement conference brief for protection application or status review'::text, 'conference'::text, 'on-court-forms-family-17d'::text, 'https://ontariocourtforms.on.ca/en/family-law-rules-forms/17d/'::text, 'Version: Sept. 1, 2023; effective: Nov. 27, 2023'::text)
) AS source(canonical_form_id, court_type, form_number, official_title, procedure_stage, form_source_id, official_source_url, form_revision_or_effective_at)
WHERE form.canonical_form_id = source.canonical_form_id
  AND form.court_type = source.court_type
  AND form.is_active = true;
