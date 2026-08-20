-- Ontario core response/divorce Form Mapping Bundle 5.
-- This migration supplies exact catalogue provenance and fail-closed mappings
-- only for the three canonical identities below. It does not certify deadlines,
-- service or filing validity, merits, remedies, urgency, or form completion.

-- Exact official catalogue provenance only. No title, form-number, path, or
-- text matching selects a catalogue record.
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
    ('a9359589-58d6-4255-b07f-5054ef5be3e2'::uuid, 'small-claims'::text, 'on-court-forms-small-claims-10a'::text, 'Defendant''s Claim'::text, 'Version: Aug. 1, 2022; effective: Jan. 30, 2023'::text, 'https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/10a/'::text),
    ('03664f12-87b9-439c-a896-5ffeb0dd738e'::uuid, 'family'::text, 'on-court-forms-family-8a'::text, 'Application (Divorce)'::text, 'Version: April 1, 2024; effective: July 15, 2024'::text, 'https://ontariocourtforms.on.ca/en/family-law-rules-forms/8a/'::text),
    ('38ecdb74-266d-4b46-908e-ddccfb3030df'::uuid, 'civil'::text, 'on-court-forms-civil-18b'::text, 'Notice of Intent to Defend'::text, 'Version: July 1, 2007; effective: July 1, 2008'::text, 'https://ontariocourtforms.on.ca/en/rules-of-civil-procedure-forms/18b/'::text)
) AS source(canonical_form_id, court_type, form_source_id, form_source_title, form_revision_or_effective_at, official_source_url)
WHERE form.canonical_form_id = source.canonical_form_id
  AND form.court_type = source.court_type;

-- Identity allocation is left to legal_form_mapping_rules.id. Every mapping
-- has an exact active canonical-ID/court-type guard.
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
    ('small-claims'::text, 'on-scc-defendant-claim-r10-02'::text, 'defendant-claim'::text, 'responding'::text, 'https://www.ontario.ca/laws/regulation/980258'::text, 'O. Reg. 258/98, Rules of the Small Claims Court'::text, 'r. 10.02'::text, 'a9359589-58d6-4255-b07f-5054ef5be3e2'::uuid, 'Version: Aug. 1, 2022; effective: Jan. 30, 2023'::text, '{"all":[{"path":"courtPath","equals":"small-claims"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"responding"},{"path":"formApplicability.smallClaims.isMakingDefendantsClaim","equals":true}]}'::jsonb, '[{"field_path":"formApplicability.smallClaims.isMakingDefendantsClaim","question":"Are you making a Defendant''s Claim in this Ontario Small Claims Court matter?","value_type":"boolean","choices":[{"value":true,"label":"Yes"},{"value":false,"label":"No"},{"value":"not-sure","label":"Not sure"}],"explanation":"This is not a Defence."}]'::jsonb),
    ('family'::text, 'on-family-divorce-application-r8-01'::text, 'divorce-application'::text, 'starting-case'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'r. 8 (1)'::text, '03664f12-87b9-439c-a896-5ffeb0dd738e'::uuid, 'Version: April 1, 2024; effective: July 15, 2024'::text, '{"all":[{"path":"courtPath","equals":"family"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"starting-case"},{"path":"formApplicability.family.isDivorceApplication","equals":true}]}'::jsonb, '[{"field_path":"formApplicability.family.isDivorceApplication","question":"Is this a divorce application?","value_type":"boolean","choices":[{"value":true,"label":"Yes"},{"value":false,"label":"No"},{"value":"not-sure","label":"Not sure"}]}]'::jsonb),
    ('civil'::text, 'on-civil-notice-intent-r18-02-1'::text, 'notice-of-intent-to-defend'::text, 'responding'::text, 'https://www.ontario.ca/laws/regulation/900194'::text, 'R.R.O. 1990, Reg. 194, Rules of Civil Procedure'::text, 'r. 18.02 (1)'::text, '38ecdb74-266d-4b46-908e-ddccfb3030df'::uuid, 'Version: July 1, 2007; effective: July 1, 2008'::text, '{"all":[{"path":"courtPath","equals":"civil"},{"path":"province","equals":"Ontario"},{"path":"stage","equals":"responding"},{"path":"formApplicability.civil.responseDocument","equals":"notice-of-intent-to-defend"}]}'::jsonb, '[{"field_path":"formApplicability.civil.responseDocument","question":"Which civil response document are you preparing?","value_type":"string","choices":[{"value":"statement-of-defence","label":"I am preparing a Statement of Defence in response to a civil Statement of Claim."},{"value":"notice-of-intent-to-defend","label":"Notice of Intent to Defend"},{"value":"application","label":"Application"},{"value":"motion","label":"Motion"},{"value":"appeal","label":"Appeal"},{"value":"not-sure","label":"Not sure"}]}]'::jsonb)
) AS source(court_area, authority_source_id, authority_topic, case_stage, official_source_url, authority_citation, authority_pinpoint, canonical_form_id, form_revision_or_effective_at, applicability_conditions, applicability_questions)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.legal_form_mapping_rules AS existing
  WHERE existing.is_active = true
    AND existing.canonical_form_id = source.canonical_form_id
    AND existing.canonical_form_court_type = source.court_area
);

-- Family Form 13A is intentionally not selected, updated, mapped, certified,
-- or recommended by this migration.
