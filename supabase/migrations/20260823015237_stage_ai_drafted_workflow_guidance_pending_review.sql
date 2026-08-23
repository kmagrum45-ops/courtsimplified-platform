-- First real test of a new workflow_guidance_review_status value,
-- "ai-drafted-pending-review", distinct from the two values in live use
-- ("verified-for-workflow", "review-required"). Investigated 2026-08-23.
--
-- Why this value is safe to introduce without a schema change:
-- workflow_guidance_review_status is a plain text column, no CHECK
-- constraint, no enum type -- confirmed against the baseline schema. The sole
-- consumer, resolveWorkflowGuidance() in betaProcedureAuthority.ts, already
-- normalizes any value other than the four literals its
-- BetaProcedureReviewStatus type knows ("verified-for-workflow",
-- "review-required", "stale", "withdrawn") down to "review-required" via
-- reviewStatus(). "ai-drafted-pending-review" is not one of those four, so it
-- is already, today, treated identically to "review-required" by every
-- consumer that exists -- this migration writes real draft content under a
-- status that is provably inert without any code change alongside it.
--
-- Populates the draft researched for id=1 (small-claims/starting-case),
-- staged in docs/PROJECT_STATE/WORKFLOW_GUIDANCE_DRAFTS.md, cross-checked
-- across three independent sources before being written down. Restates only
-- what O. Reg. 258/98, r. 7.01 requires -- no commentary, no advice -- in the
-- same terse style already confirmed clean across the 11 live
-- verified-for-workflow entries.
--
-- Deliberately NOT set to verified-for-workflow. That promotion is a manual
-- decision reserved for a human reviewing the citation against the primary
-- source (CanLII blocked automated fetches throughout this session's
-- research, so the primary text was never directly read -- only
-- cross-checked secondary sources). This migration's own postcondition guard
-- below enforces that it cannot silently promote itself.
--
-- Predicted outcome, to be confirmed live rather than assumed: this row's
-- authority_review_status is already verified-for-workflow independently of
-- workflow_guidance (its citation was verified before this draft existed), so
-- the Procedure Authority panel will keep showing the citation-only card
-- exactly as it does today -- this draft's text will not surface anywhere,
-- because permittedWorkflowGuidance.displayState resolves to review-required
-- (storedStatus !== "verified-for-workflow") and
-- getProcedureAuthorityDisplayItems only uses that text when
-- permittedWorkflowGuidance.displayState is verified-source-linked-workflow.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.legal_procedure_rules
    WHERE id = 1 AND workflow_guidance IS NULL
  ) THEN
    RAISE EXCEPTION 'Expected row id=1 to have no workflow_guidance before staging the draft';
  END IF;
END
$$;

UPDATE public.legal_procedure_rules
SET
  workflow_guidance = ARRAY['A Small Claims Court action starts with a plaintiff’s claim stating the parties, the nature of the claim, and the amount and relief sought.'],
  workflow_guidance_review_status = 'ai-drafted-pending-review',
  workflow_guidance_restricted_fields = ARRAY[
    'rule_name', 'trigger_facts', 'required_forms', 'optional_forms',
    'documents_to_upload', 'missing_info_questions', 'evidence_needed',
    'deadline_risks', 'common_user_mistakes', 'judge_or_court_concerns',
    'notes', 'procedure_stage'
  ],
  workflow_guidance_source_id = 'on-scc-start-r7-01',
  workflow_guidance_source_type = 'primary-procedural-rule',
  workflow_guidance_official_source_url = 'https://www.ontario.ca/laws/regulation/980258',
  workflow_guidance_citation = 'O. Reg. 258/98, Rules of the Small Claims Court',
  workflow_guidance_pinpoint = 'r. 7.01',
  workflow_guidance_issuing_body = 'Ontario e-Laws',
  workflow_guidance_checked_at = '2026-08-23',
  workflow_guidance_court_area = 'small-claims',
  workflow_guidance_stage_applicability = ARRAY['starting-case']
WHERE id = 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.legal_procedure_rules
    WHERE id = 1
      AND workflow_guidance IS NOT NULL
      AND workflow_guidance_review_status = 'ai-drafted-pending-review'
  ) THEN
    RAISE EXCEPTION 'Expected row id=1 to hold the staged draft under ai-drafted-pending-review';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.legal_procedure_rules
    WHERE id = 1 AND workflow_guidance_review_status = 'verified-for-workflow'
  ) THEN
    RAISE EXCEPTION 'This migration must never promote id=1 to verified-for-workflow; that is a manual decision';
  END IF;
END
$$;
