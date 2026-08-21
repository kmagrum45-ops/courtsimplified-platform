-- Ontario exact form-mapping applicability bundle. This migration only adds
-- fail-closed mapping conditions to existing, explicitly reviewed mapping rows.
-- It neither changes source catalog records nor creates a recommendation path.

ALTER TABLE public.legal_form_mapping_rules
  ADD COLUMN IF NOT EXISTS applicability_conditions jsonb;

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
  authority_bundle_version = 'ontario-beta-form-mapping-v1'
FROM (
  VALUES
    (6::bigint, 'small-claims'::text, 'on-scc-start-r7-01'::text, 'start'::text, 'starting-case'::text, 'https://www.ontario.ca/laws/regulation/980258'::text, 'O. Reg. 258/98, Rules of the Small Claims Court'::text, 'r. 7.01'::text, 'a289d2a2-a691-45eb-a625-15c42c6da695'::uuid, 'Version: Aug. 1, 2022; effective: Jan. 30, 2023'::text, '{"all":[{"path":"courtPath","equals":"small-claims"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"starting-case"},{"path":"formApplicability.smallClaims.eligibilityConfirmed","equals":true},{"path":"formApplicability.smallClaims.requestedRemedyType","oneOf":["ordinary-money-claim","ordinary-property-claim"]}]}'::jsonb),
    (7::bigint, 'small-claims'::text, 'on-scc-respond-r9-01'::text, 'respond'::text, 'responding'::text, 'https://www.ontario.ca/laws/regulation/980258'::text, 'O. Reg. 258/98, Rules of the Small Claims Court'::text, 'r. 9.01'::text, 'b429d68c-e1d4-4eb0-b7a2-4a0069e173d6'::uuid, 'Version: Aug. 1, 2022; effective: Jan. 30, 2023'::text, '{"all":[{"path":"courtPath","equals":"small-claims"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"responding"},{"path":"formApplicability.smallClaims.respondingToPlaintiffsClaim","equals":true}]}'::jsonb),
    (1::bigint, 'family'::text, 'on-family-start-r8'::text, 'start'::text, 'starting-case'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'r. 8'::text, '82d885fe-4f0e-4e37-adce-6c1ff331f3f1'::uuid, 'Version: June 13, 2025; effective: Aug. 8, 2025'::text, '{"all":[{"path":"courtPath","equals":"family"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"starting-case"},{"path":"formApplicability.family.isGeneralApplication","equals":true},{"path":"formApplicability.family.isDivorceApplication","equals":false}]}'::jsonb),
    (2::bigint, 'family'::text, 'on-family-respond-r10-01'::text, 'respond'::text, 'responding'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'r. 10 (1)'::text, '4894de57-6511-45b1-a71a-967c884510f5'::uuid, 'Version: June 13, 2025; effective: Aug. 8, 2025'::text, '{"all":[{"path":"courtPath","equals":"family"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"responding"},{"path":"formApplicability.family.respondingToFamilyApplication","equals":true}]}'::jsonb),
    (9::bigint, 'civil'::text, 'on-civil-action-start-r14'::text, 'action-start'::text, 'starting-case'::text, 'https://www.ontario.ca/laws/regulation/900194'::text, 'R.R.O. 1990, Reg. 194, Rules of Civil Procedure'::text, 'r. 14'::text, '1fead613-b24b-4797-b73c-0edfeb2af3d7'::uuid, 'Version: June 9, 2014; effective: Jan. 1, 2015'::text, '{"all":[{"path":"courtPath","equals":"civil"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"starting-case"},{"path":"formApplicability.civil.isGeneralAction","equals":true},{"path":"formApplicability.civil.isApplication","equals":false},{"path":"formApplicability.civil.isMortgageForeclosure","equals":false},{"path":"formApplicability.civil.isCommencedByNoticeOfAction","equals":false}]}'::jsonb)
) AS source(mapping_id, court_area, authority_source_id, authority_topic, case_stage, official_source_url, authority_citation, authority_pinpoint, canonical_form_id, form_revision_or_effective_at, applicability_conditions)
WHERE mapping.id = source.mapping_id
  AND mapping.court_area = source.court_area
  AND mapping.is_active = true
  AND mapping.authority_review_status = 'review-required'
  AND mapping.form_review_status = 'review-required';

COMMENT ON COLUMN public.legal_form_mapping_rules.applicability_conditions IS
  'Structured, fail-closed mapping prerequisites. Missing, false, ambiguous, or mismatched facts must remain review-required.';
