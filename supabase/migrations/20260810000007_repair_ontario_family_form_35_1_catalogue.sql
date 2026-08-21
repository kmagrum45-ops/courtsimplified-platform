-- Repair provenance and display metadata only for the active canonical Family
-- Form 35.1 variants. This migration creates no mapping or recommendation.
-- The exact canonical stage needed for a fail-closed mapping is not certified
-- by this repair and therefore remains review-required.

UPDATE public.court_form_library AS form
SET
  form_number = 'Form 35.1',
  official_title = 'Affidavit (decision-making responsibility, parenting time, contact)',
  form_source_id = 'on-court-forms-family-35-1',
  form_source_type = 'official-ontario-court-forms-catalog',
  official_source_url = 'https://ontariocourtforms.on.ca/en/family-law-rules-forms/',
  form_source_title = 'Affidavit (decision-making responsibility, parenting time, contact)',
  form_issuing_body = 'Ontario Ministry of the Attorney General, Ontario Court Services',
  form_revision_or_effective_at = 'Version: Sept. 1, 2021; effective: Dec. 1, 2021',
  form_checked_at = DATE '2026-08-10',
  form_review_status = 'verified-catalog-source'
WHERE form.canonical_form_id = '501395c9-f7a4-4214-b13b-30b38ce5d85c'::uuid
  AND form.court_type = 'family'
  AND form.is_active = true;
