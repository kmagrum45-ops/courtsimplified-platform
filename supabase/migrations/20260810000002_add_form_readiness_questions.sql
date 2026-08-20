-- Form Readiness question metadata for already verified exact mapping rows.
-- This metadata collects answers only; applicability_conditions remain the
-- resolver-controlled authority for an official-form-linked recommendation.

ALTER TABLE public.legal_form_mapping_rules
  ADD COLUMN IF NOT EXISTS applicability_questions jsonb;

UPDATE public.legal_form_mapping_rules AS mapping
SET applicability_questions = source.applicability_questions
FROM (
  VALUES
    (6::bigint, 'small-claims'::text, '[{"field_path":"formApplicability.smallClaims.eligibilityConfirmed","question":"Have you confirmed this is an eligible Ontario Small Claims Court matter?","value_type":"boolean","choices":[{"value":true,"label":"Yes"},{"value":false,"label":"No"},{"value":"not-sure","label":"Not sure"}]},{"field_path":"formApplicability.smallClaims.requestedRemedyType","question":"What ordinary claim are you starting?","value_type":"string","choices":[{"value":"ordinary-money-claim","label":"Money claim"},{"value":"ordinary-property-claim","label":"Property claim"},{"value":"not-sure","label":"Not sure"}]}]'::jsonb),
    (7::bigint, 'small-claims'::text, '[{"field_path":"formApplicability.smallClaims.respondingToPlaintiffsClaim","question":"Are you responding to a Plaintiff’s Claim?","value_type":"boolean","choices":[{"value":true,"label":"Yes"},{"value":false,"label":"No"},{"value":"not-sure","label":"Not sure"}]}]'::jsonb),
    (1::bigint, 'family'::text, '[{"field_path":"formApplicability.family.isGeneralApplication","question":"Is this a general Family Application?","value_type":"boolean","choices":[{"value":true,"label":"Yes"},{"value":false,"label":"No"},{"value":"not-sure","label":"Not sure"}]},{"field_path":"formApplicability.family.isDivorceApplication","question":"Is this a divorce application?","value_type":"boolean","choices":[{"value":true,"label":"Yes"},{"value":false,"label":"No"},{"value":"not-sure","label":"Not sure"}]}]'::jsonb),
    (2::bigint, 'family'::text, '[{"field_path":"formApplicability.family.respondingToFamilyApplication","question":"Are you responding to a Family Application?","value_type":"boolean","choices":[{"value":true,"label":"Yes"},{"value":false,"label":"No"},{"value":"not-sure","label":"Not sure"}]}]'::jsonb),
    (9::bigint, 'civil'::text, '[{"field_path":"formApplicability.civil.isGeneralAction","question":"Is this a general civil action?","value_type":"boolean","choices":[{"value":true,"label":"Yes"},{"value":false,"label":"No"},{"value":"not-sure","label":"Not sure"}]},{"field_path":"formApplicability.civil.isApplication","question":"Is this an application?","value_type":"boolean","choices":[{"value":true,"label":"Yes"},{"value":false,"label":"No"},{"value":"not-sure","label":"Not sure"}]},{"field_path":"formApplicability.civil.isMortgageForeclosure","question":"Is this a mortgage foreclosure case?","value_type":"boolean","choices":[{"value":true,"label":"Yes"},{"value":false,"label":"No"},{"value":"not-sure","label":"Not sure"}]},{"field_path":"formApplicability.civil.isCommencedByNoticeOfAction","question":"Was this case started by Notice of Action?","value_type":"boolean","choices":[{"value":true,"label":"Yes"},{"value":false,"label":"No"},{"value":"not-sure","label":"Not sure"}]}]'::jsonb)
) AS source(mapping_id, court_area, applicability_questions)
WHERE mapping.id = source.mapping_id
  AND mapping.court_area = source.court_area
  AND mapping.is_active = true
  AND mapping.authority_review_status = 'verified-for-workflow'
  AND mapping.form_review_status = 'verified-for-workflow'
  AND mapping.authority_bundle_version = 'ontario-beta-form-mapping-v1';

COMMENT ON COLUMN public.legal_form_mapping_rules.applicability_questions IS
  'Form Readiness question metadata: field_path, question, value_type, labelled choices, and optional explanation. This metadata collects facts only and never certifies form eligibility.';
