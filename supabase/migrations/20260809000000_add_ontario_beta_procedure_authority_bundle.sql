-- Ontario beta procedure-authority bundle, exact reviewed rows only.
-- This migration is additive. It does not insert, delete, rename, or alter
-- existing procedure-stage, catalog, PDF, Word, or canonical-form values.

ALTER TABLE public.legal_procedure_rules
  ADD COLUMN IF NOT EXISTS authority_source_id text,
  ADD COLUMN IF NOT EXISTS authority_source_type text,
  ADD COLUMN IF NOT EXISTS official_source_url text,
  ADD COLUMN IF NOT EXISTS authority_citation text,
  ADD COLUMN IF NOT EXISTS authority_pinpoint text,
  ADD COLUMN IF NOT EXISTS authority_issuing_body text,
  ADD COLUMN IF NOT EXISTS authority_checked_at date,
  ADD COLUMN IF NOT EXISTS authority_review_status text,
  ADD COLUMN IF NOT EXISTS authority_court_area text,
  ADD COLUMN IF NOT EXISTS authority_topic text,
  ADD COLUMN IF NOT EXISTS authority_stage_applicability text[],
  ADD COLUMN IF NOT EXISTS authority_bundle_version text;

ALTER TABLE public.legal_form_mapping_rules
  ADD COLUMN IF NOT EXISTS authority_source_id text,
  ADD COLUMN IF NOT EXISTS authority_source_type text,
  ADD COLUMN IF NOT EXISTS official_source_url text,
  ADD COLUMN IF NOT EXISTS authority_citation text,
  ADD COLUMN IF NOT EXISTS authority_pinpoint text,
  ADD COLUMN IF NOT EXISTS authority_issuing_body text,
  ADD COLUMN IF NOT EXISTS authority_checked_at date,
  ADD COLUMN IF NOT EXISTS authority_review_status text,
  ADD COLUMN IF NOT EXISTS authority_court_area text,
  ADD COLUMN IF NOT EXISTS authority_topic text,
  ADD COLUMN IF NOT EXISTS authority_stage_applicability text[],
  ADD COLUMN IF NOT EXISTS canonical_form_id uuid,
  ADD COLUMN IF NOT EXISTS canonical_form_court_type text,
  ADD COLUMN IF NOT EXISTS form_revision_or_effective_at text,
  ADD COLUMN IF NOT EXISTS form_review_status text,
  ADD COLUMN IF NOT EXISTS authority_bundle_version text;

-- Existing nullable procedure records fail closed until individually reviewed.
UPDATE public.legal_procedure_rules
SET authority_review_status = 'review-required'
WHERE authority_review_status IS NULL;

-- No form mapping is certified in this migration, including one with existing
-- catalog identity or historical provenance fields.
UPDATE public.legal_form_mapping_rules
SET
  authority_review_status = 'review-required',
  form_review_status = 'review-required';

-- Exact reviewed procedure rows. The existing procedure_stage remains intact.
-- authority_topic identifies the source subject; stage applicability records the
-- row's actual UI stage without deriving facts from free text.
UPDATE public.legal_procedure_rules AS rule
SET
  authority_source_id = source.authority_source_id,
  authority_source_type = 'primary-procedural-rule',
  official_source_url = source.official_source_url,
  authority_citation = source.authority_citation,
  authority_pinpoint = source.authority_pinpoint,
  authority_issuing_body = 'Ontario e-Laws',
  authority_checked_at = CURRENT_DATE,
  authority_review_status = 'verified-for-workflow',
  authority_court_area = source.court_area,
  authority_topic = source.authority_topic,
  authority_stage_applicability = ARRAY[rule.procedure_stage],
  authority_bundle_version = 'ontario-beta-v1'
FROM (
  VALUES
    (1::bigint, 'small-claims'::text, 'on-scc-start-r7-01'::text, 'start'::text, 'https://www.ontario.ca/laws/regulation/980258'::text, 'O. Reg. 258/98, Rules of the Small Claims Court'::text, 'r. 7.01'::text),
    (2::bigint, 'small-claims'::text, 'on-scc-respond-r9-01'::text, 'respond'::text, 'https://www.ontario.ca/laws/regulation/980258'::text, 'O. Reg. 258/98, Rules of the Small Claims Court'::text, 'r. 9.01'::text),
    (11::bigint, 'small-claims'::text, 'on-scc-service-r8'::text, 'service'::text, 'https://www.ontario.ca/laws/regulation/980258'::text, 'O. Reg. 258/98, Rules of the Small Claims Court'::text, 'r. 8'::text),
    (4::bigint, 'family'::text, 'on-family-start-r8'::text, 'start'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'r. 8'::text),
    (5::bigint, 'family'::text, 'on-family-respond-r10-01'::text, 'respond'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'r. 10 (1)'::text),
    (21::bigint, 'family'::text, 'on-family-service-r6'::text, 'service'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'r. 6'::text),
    (7::bigint, 'civil'::text, 'on-civil-action-start-r14'::text, 'action-start'::text, 'https://www.ontario.ca/laws/regulation/900194'::text, 'R.R.O. 1990, Reg. 194, Rules of Civil Procedure'::text, 'r. 14'::text),
    (8::bigint, 'civil'::text, 'on-civil-application-boundary-r14'::text, 'application-boundary'::text, 'https://www.ontario.ca/laws/regulation/900194'::text, 'R.R.O. 1990, Reg. 194, Rules of Civil Procedure'::text, 'r. 14'::text),
    (9::bigint, 'civil'::text, 'on-civil-respond-r18'::text, 'respond'::text, 'https://www.ontario.ca/laws/regulation/900194'::text, 'R.R.O. 1990, Reg. 194, Rules of Civil Procedure'::text, 'r. 18'::text),
    (38::bigint, 'civil'::text, 'on-civil-service-rr16-17'::text, 'service'::text, 'https://www.ontario.ca/laws/regulation/900194'::text, 'R.R.O. 1990, Reg. 194, Rules of Civil Procedure'::text, 'rr. 16-17'::text)
) AS source(id, court_area, authority_source_id, authority_topic, official_source_url, authority_citation, authority_pinpoint)
WHERE rule.id = source.id
  AND rule.court_area = source.court_area
  AND rule.is_active = true;

-- No form record or form-mapping record is certified by this migration.
-- A future approved batch may populate canonical_form_id only after a
-- deterministic reviewed catalog record supplies version/effective evidence,
-- issuing body, official URL, checked-at date, and explicit review status.

-- Reversal plan for an approved follow-up migration:
-- UPDATE public.legal_procedure_rules
-- SET authority_source_id = NULL, authority_source_type = NULL,
-- official_source_url = NULL, authority_citation = NULL,
-- authority_pinpoint = NULL, authority_issuing_body = NULL,
-- authority_checked_at = NULL, authority_review_status = 'review-required',
-- authority_court_area = NULL, authority_topic = NULL,
-- authority_stage_applicability = NULL, authority_bundle_version = NULL
-- WHERE authority_bundle_version = 'ontario-beta-v1';
