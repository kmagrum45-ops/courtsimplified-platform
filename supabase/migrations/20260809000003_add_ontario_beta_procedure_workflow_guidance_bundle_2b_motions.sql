-- Ontario beta procedure authority Bundle 2B: field-level motion guidance.
-- Existing raw procedure content remains review-required and is not modified.
UPDATE public.legal_procedure_rules AS rule
SET
  workflow_guidance = ARRAY[source.workflow_guidance],
  workflow_guidance_review_status = 'verified-for-workflow',
  workflow_guidance_restricted_fields = ARRAY[
    'rule_name', 'trigger_facts', 'required_forms', 'optional_forms',
    'documents_to_upload', 'missing_info_questions', 'evidence_needed',
    'deadline_risks', 'common_user_mistakes', 'judge_or_court_concerns',
    'notes', 'procedure_stage', 'affidavits', 'urgency',
    'service_and_filing_deadlines', 'set_aside_default_relief',
    'extension_of_time_relief', 'requested_orders', 'evidence_sufficiency'
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
  workflow_guidance_bundle_version = 'ontario-beta-v2b'
FROM (
  VALUES
    (10::bigint, 'civil'::text, 'on-civil-motion-r37'::text, 'https://www.ontario.ca/laws/regulation/900194'::text, 'R.R.O. 1990, Reg. 194, Rules of Civil Procedure'::text, 'Rule 37'::text, 'Civil Rule 37 governs motion jurisdiction and procedure.'::text),
    (27::bigint, 'family'::text, 'on-family-motion-r14'::text, 'https://www.ontario.ca/laws/regulation/990114'::text, 'O. Reg. 114/99, Family Law Rules'::text, 'Rule 14'::text, 'Family Rule 14 governs motions for temporary orders.'::text),
    (15::bigint, 'small-claims'::text, 'on-scc-motion-r15'::text, 'https://www.ontario.ca/laws/regulation/980258'::text, 'O. Reg. 258/98, Rules of the Small Claims Court'::text, 'Rule 15'::text, 'Small Claims Rule 15 governs motions.'::text)
) AS source(id, court_area, workflow_guidance_source_id, workflow_guidance_official_source_url, workflow_guidance_citation, workflow_guidance_pinpoint, workflow_guidance)
WHERE rule.id = source.id
  AND rule.court_area = source.court_area
  AND rule.is_active = true
  AND rule.authority_review_status = 'review-required';

-- No form, affidavit, urgency, service, filing deadline, set-aside-default,
-- extension-of-time, requested-order, evidence-sufficiency, or other raw
-- procedure content is certified by this migration.
