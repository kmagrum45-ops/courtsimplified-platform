-- Ontario beta procedure authority Bundle 2A: field-level workflow guidance.
-- Existing raw procedure content remains review-required and is not modified.
ALTER TABLE public.legal_procedure_rules
  ADD COLUMN IF NOT EXISTS workflow_guidance text[],
  ADD COLUMN IF NOT EXISTS workflow_guidance_review_status text,
  ADD COLUMN IF NOT EXISTS workflow_guidance_restricted_fields text[],
  ADD COLUMN IF NOT EXISTS workflow_guidance_source_id text,
  ADD COLUMN IF NOT EXISTS workflow_guidance_source_type text,
  ADD COLUMN IF NOT EXISTS workflow_guidance_official_source_url text,
  ADD COLUMN IF NOT EXISTS workflow_guidance_citation text,
  ADD COLUMN IF NOT EXISTS workflow_guidance_pinpoint text,
  ADD COLUMN IF NOT EXISTS workflow_guidance_issuing_body text,
  ADD COLUMN IF NOT EXISTS workflow_guidance_checked_at date,
  ADD COLUMN IF NOT EXISTS workflow_guidance_court_area text,
  ADD COLUMN IF NOT EXISTS workflow_guidance_stage_applicability text[],
  ADD COLUMN IF NOT EXISTS workflow_guidance_bundle_version text;

-- Exact reviewed conference and trial-preparation rows only. The raw row-level
-- authority status deliberately remains review-required; only this separately
-- stored, source-linked guidance fragment may be displayed as verified.
UPDATE public.legal_procedure_rules AS rule
SET
  workflow_guidance = ARRAY[source.workflow_guidance],
  workflow_guidance_review_status = 'verified-for-workflow',
  workflow_guidance_restricted_fields = ARRAY[
    'rule_name',
    'trigger_facts',
    'required_forms',
    'optional_forms',
    'documents_to_upload',
    'missing_info_questions',
    'evidence_needed',
    'deadline_risks',
    'common_user_mistakes',
    'judge_or_court_concerns',
    'notes',
    'procedure_stage'
  ],
  workflow_guidance_source_id = source.workflow_guidance_source_id,
  workflow_guidance_source_type = 'primary-procedural-rule',
  workflow_guidance_official_source_url = source.workflow_guidance_official_source_url,
  workflow_guidance_citation = source.workflow_guidance_citation,
  workflow_guidance_pinpoint = source.workflow_guidance_pinpoint,
  workflow_guidance_issuing_body = 'Ontario e-Laws',
  workflow_guidance_checked_at = CURRENT_DATE,
  workflow_guidance_court_area = source.court_area,
  workflow_guidance_stage_applicability = ARRAY[rule.procedure_stage],
  workflow_guidance_bundle_version = 'ontario-beta-v2a'
FROM (
  VALUES
    (3::bigint, 'small-claims'::text, 'on-scc-settlement-conference-r13-01'::text, 'https://www.ontario.ca/laws/regulation/980258'::text, 'O. Reg. 258/98, Rules of the Small Claims Court'::text, 'r. 13.01 (1)'::text, 'A settlement conference is held in every defended Small Claims action.'::text),
    (17::bigint, 'small-claims'::text, 'on-scc-trial-management-r16-1-02'::text, 'https://www.ontario.ca/laws/regulation/980258'::text, 'O. Reg. 258/98, Rules of the Small Claims Court'::text, 'r. 16.1.02 (1) (a)-(b)'::text, 'If the court directs a trial management conference, its purposes include assessing readiness and assisting effective trial preparation.'::text),
    (6::bigint, 'family'::text, 'on-family-case-conference-r17-04'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'r. 17 (4) (a)-(c)'::text, 'A case conference may explore settlement, identify disputed and undisputed issues, and explore ways to resolve disputed issues.'::text),
    (24::bigint, 'family'::text, 'on-family-case-conference-r17-04'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'r. 17 (4) (a)-(c)'::text, 'A case conference may explore settlement, identify disputed and undisputed issues, and explore ways to resolve disputed issues.'::text),
    (25::bigint, 'family'::text, 'on-family-settlement-conference-r17-05'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'r. 17 (5) (a)-(b)'::text, 'A settlement conference may explore settlement and settle or narrow the issues in dispute.'::text),
    (26::bigint, 'family'::text, 'on-family-trial-management-r17-06'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'r. 17 (6) (c)-(d)'::text, 'A trial management conference may decide how the trial will proceed and ensure the parties know the witnesses and other evidence to be presented at trial.'::text),
    (49::bigint, 'civil'::text, 'on-civil-pretrial-conference-r50-01'::text, 'https://www.ontario.ca/laws/regulation/900194'::text, 'R.R.O. 1990, Reg. 194, Rules of Civil Procedure'::text, 'r. 50.01'::text, 'A pre-trial conference provides an opportunity to settle issues and obtain directions that assist the just, expeditious, and least expensive disposition of the proceeding.'::text),
    (50::bigint, 'civil'::text, 'on-civil-trial-rr52-53'::text, 'https://www.ontario.ca/laws/regulation/900194'::text, 'R.R.O. 1990, Reg. 194, Rules of Civil Procedure'::text, 'Rules 52-53'::text, 'The Rules of Civil Procedure address trial procedure and evidence at trial in Rules 52 and 53.'::text)
) AS source(id, court_area, workflow_guidance_source_id, workflow_guidance_official_source_url, workflow_guidance_citation, workflow_guidance_pinpoint, workflow_guidance)
WHERE rule.id = source.id
  AND rule.court_area = source.court_area
  AND rule.is_active = true
  AND rule.authority_review_status = 'review-required';

-- No form, deadline, filing-readiness, service, evidence, merits, enforcement,
-- appeal, or other raw procedure content is certified by this migration.
