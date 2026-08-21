-- Ontario core-form catalog provenance bundle. This migration is catalog-only:
-- it does not certify a mapping, recommendation, generation path, or filing use.

ALTER TABLE public.court_form_library
  ADD COLUMN IF NOT EXISTS form_source_id text,
  ADD COLUMN IF NOT EXISTS form_source_type text,
  ADD COLUMN IF NOT EXISTS official_source_url text,
  ADD COLUMN IF NOT EXISTS form_source_title text,
  ADD COLUMN IF NOT EXISTS form_issuing_body text,
  ADD COLUMN IF NOT EXISTS form_revision_or_effective_at text,
  ADD COLUMN IF NOT EXISTS form_checked_at date,
  ADD COLUMN IF NOT EXISTS form_review_status text;

-- Only the supplied canonical identity and court area pairs are eligible for
-- source display. NULL provenance on every other catalog record remains
-- review-required by default. No title, form-number, path, or text matching is
-- used to select catalog rows.
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
    ('a289d2a2-a691-45eb-a625-15c42c6da695'::uuid, 'small-claims'::text, 'on-court-forms-small-claims-7a'::text, 'Plaintiff''s Claim'::text, 'Version: Aug. 1, 2022; effective: Jan. 30, 2023'::text, 'https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/'::text),
    ('a576815d-2bc8-4a13-9502-348eec5819e2'::uuid, 'small-claims'::text, 'on-court-forms-small-claims-8a'::text, 'Affidavit of Service'::text, 'Version: Aug. 1, 2022; effective: Jan. 30, 2023'::text, 'https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/'::text),
    ('b429d68c-e1d4-4eb0-b7a2-4a0069e173d6'::uuid, 'small-claims'::text, 'on-court-forms-small-claims-9a'::text, 'Defence'::text, 'Version: Aug. 1, 2022; effective: Jan. 30, 2023'::text, 'https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/'::text),
    ('82d885fe-4f0e-4e37-adce-6c1ff331f3f1'::uuid, 'family'::text, 'on-court-forms-family-8'::text, 'Application (General)'::text, 'Version: June 13, 2025; effective: Aug. 8, 2025'::text, 'https://ontariocourtforms.on.ca/en/family-law-rules-forms/'::text),
    ('4894de57-6511-45b1-a71a-967c884510f5'::uuid, 'family'::text, 'on-court-forms-family-10'::text, 'Answer'::text, 'Version: June 13, 2025; effective: Aug. 8, 2025'::text, 'https://ontariocourtforms.on.ca/en/family-law-rules-forms/'::text),
    ('21fd1fd2-2d0f-486d-abbf-41faab3d488c'::uuid, 'family'::text, 'on-court-forms-family-6b'::text, 'Affidavit of Service'::text, 'Version: April 12, 2016; effective: July 1, 2016'::text, 'https://ontariocourtforms.on.ca/en/family-law-rules-forms/'::text),
    ('1fead613-b24b-4797-b73c-0edfeb2af3d7'::uuid, 'civil'::text, 'on-court-forms-civil-14a'::text, 'Statement of Claim (General)'::text, 'Version: June 9, 2014; effective: Jan. 1, 2015'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/'::text),
    ('502cd465-720a-4d71-8b6c-a7eefe788657'::uuid, 'civil'::text, 'on-court-forms-civil-18a'::text, 'Statement of Defence'::text, 'Version: July 1, 2007; effective: July 1, 2008'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/'::text),
    ('952b0ad2-1599-4815-be23-d2dfb5aee75d'::uuid, 'civil'::text, 'on-court-forms-civil-16b'::text, 'Affidavit of Service'::text, 'Version: Feb. 1, 2021; effective: April 6, 2021'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/'::text)
) AS source(canonical_form_id, court_type, form_source_id, form_source_title, form_revision_or_effective_at, official_source_url)
WHERE form.canonical_form_id = source.canonical_form_id
  AND form.court_type = source.court_type;

COMMENT ON COLUMN public.court_form_library.form_review_status IS
  'Catalog-source review only. It does not certify a mapping, recommendation, generation path, filing readiness, or legal advice.';
