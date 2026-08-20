-- Repair the verified catalogue stages and official provenance for the exact
-- postures prepared for a later, separate mapping migration.  This migration
-- deliberately creates no legal_form_mapping_rules rows and changes no
-- applicability metadata.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.court_form_library
    WHERE canonical_form_id = '4300c97c-a430-45b4-b7cb-da90f0d9be20'::uuid
      AND court_type = 'small-claims' AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.court_form_library
    WHERE canonical_form_id = '4300c97c-a430-45b4-b7cb-da90f0d9be20'::uuid
      AND court_type = 'small-claims' AND is_active = true
      AND procedure_stage IS DISTINCT FROM 'starting-case'
  ) THEN
    RAISE EXCEPTION 'Expected active Small Claims Form 11.3A records at starting-case';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.court_form_library
    WHERE canonical_form_id = 'ff396301-b97f-4e0e-84fa-6d1fd4995d1f'::uuid
      AND court_type = 'family' AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.court_form_library
    WHERE canonical_form_id = 'ff396301-b97f-4e0e-84fa-6d1fd4995d1f'::uuid
      AND court_type = 'family' AND is_active = true
      AND procedure_stage IS DISTINCT FROM 'general'
  ) THEN
    RAISE EXCEPTION 'Expected active Family Form 10A records at general';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.court_form_library
    WHERE (canonical_form_id, court_type) IN (
      ('92121753-d5a5-45e5-9cb6-21b837de7c13'::uuid, 'civil'),
      ('a4c3343d-1ed5-4da3-b247-8460b5d27b3c'::uuid, 'civil'),
      ('8135da24-53f9-4360-a7c4-81d66fe8530a'::uuid, 'civil'),
      ('a73f2f4c-8dc7-4bb6-a10b-a50e17a7d185'::uuid, 'civil'),
      ('ce2bebe1-9c12-469f-bcca-ebb4d7968216'::uuid, 'civil'),
      ('b2cc9170-cb22-4087-843e-1b4ca4eb2620'::uuid, 'civil')
    )
      AND is_active = true
      AND procedure_stage IS DISTINCT FROM 'starting-case'
  ) OR (
    SELECT count(DISTINCT canonical_form_id)
    FROM public.court_form_library
    WHERE (canonical_form_id, court_type) IN (
      ('92121753-d5a5-45e5-9cb6-21b837de7c13'::uuid, 'civil'),
      ('a4c3343d-1ed5-4da3-b247-8460b5d27b3c'::uuid, 'civil'),
      ('8135da24-53f9-4360-a7c4-81d66fe8530a'::uuid, 'civil'),
      ('a73f2f4c-8dc7-4bb6-a10b-a50e17a7d185'::uuid, 'civil'),
      ('ce2bebe1-9c12-469f-bcca-ebb4d7968216'::uuid, 'civil'),
      ('b2cc9170-cb22-4087-843e-1b4ca4eb2620'::uuid, 'civil')
    ) AND is_active = true
  ) <> 6 THEN
    RAISE EXCEPTION 'Expected six active Civil Form 27A-28C repair targets at starting-case';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.court_form_library
    WHERE canonical_form_id = '79f07cdf-6f02-4857-8402-1b77addfa7f6'::uuid
      AND court_type = 'civil' AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.court_form_library
    WHERE canonical_form_id = '79f07cdf-6f02-4857-8402-1b77addfa7f6'::uuid
      AND court_type = 'civil' AND is_active = true
      AND procedure_stage IS DISTINCT FROM 'responding'
  ) THEN
    RAISE EXCEPTION 'Expected active Civil Form 29C records at responding';
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
  form_revision_or_effective_at = source.form_revision_or_effective_at,
  form_checked_at = DATE '2026-08-11',
  form_review_status = 'verified-catalog-source'
FROM (
  VALUES
    ('4300c97c-a430-45b4-b7cb-da90f0d9be20'::uuid, 'small-claims'::text, 'already-started'::text, 'on-court-forms-small-claims-11-3a'::text, 'Notice of Discontinued Claim'::text, 'Version: Jan. 23, 2014; effective: July 18, 2014'::text, 'https://ontariocourtforms.on.ca/en/rules-of-small-claims-court-forms/113a/'::text),
    ('ff396301-b97f-4e0e-84fa-6d1fd4995d1f'::uuid, 'family'::text, 'already-started'::text, 'on-court-forms-family-10a'::text, 'Reply'::text, 'Version: Sept. 1, 2005; effective: May 1, 2006'::text, 'https://ontariocourtforms.on.ca/en/family-law-rules-forms/10a/'::text),
    ('92121753-d5a5-45e5-9cb6-21b837de7c13'::uuid, 'civil'::text, 'responding'::text, 'on-court-forms-civil-27a'::text, 'Counterclaim (Against Parties to Main Action Only)'::text, 'Version: July 1, 2007; effective: July 1, 2008'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/27a/'::text),
    ('a4c3343d-1ed5-4da3-b247-8460b5d27b3c'::uuid, 'civil'::text, 'responding'::text, 'on-court-forms-civil-27b'::text, 'Counterclaim (Against Plaintiff and Person not Already Party to Main Action)'::text, 'Version: July 1, 2007; effective: July 1, 2008'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/27b/'::text),
    ('8135da24-53f9-4360-a7c4-81d66fe8530a'::uuid, 'civil'::text, 'responding'::text, 'on-court-forms-civil-27c'::text, 'Defence to Counterclaim'::text, 'Version: July 1, 2007; effective: July 1, 2008'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/27c/'::text),
    ('a73f2f4c-8dc7-4bb6-a10b-a50e17a7d185'::uuid, 'civil'::text, 'already-started'::text, 'on-court-forms-civil-27d'::text, 'Reply to Defence to Counterclaim'::text, 'Version: July 1, 2007; effective: July 1, 2008'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/27d/'::text),
    ('ce2bebe1-9c12-469f-bcca-ebb4d7968216'::uuid, 'civil'::text, 'responding'::text, 'on-court-forms-civil-28a'::text, 'Crossclaim'::text, 'Version: July 1, 2007; effective: July 1, 2008'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/28a/'::text),
    ('b2cc9170-cb22-4087-843e-1b4ca4eb2620'::uuid, 'civil'::text, 'already-started'::text, 'on-court-forms-civil-28c'::text, 'Reply to Defence to Crossclaim'::text, 'Version: July 1, 2007; effective: July 1, 2008'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/28c/'::text),
    ('79f07cdf-6f02-4857-8402-1b77addfa7f6'::uuid, 'civil'::text, 'responding'::text, 'on-court-forms-civil-29c'::text, 'Reply to Third Party Defence'::text, 'Version: July 1, 2007; effective: July 1, 2008'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/29c/'::text)
) AS source(canonical_form_id, court_type, procedure_stage, form_source_id, form_source_title, form_revision_or_effective_at, official_source_url)
WHERE form.canonical_form_id = source.canonical_form_id
  AND form.court_type = source.court_type
  AND form.is_active = true;
