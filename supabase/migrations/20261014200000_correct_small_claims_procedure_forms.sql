-- Corrects two wrong form numbers in public.legal_procedure_rules (found in the
-- 2026-10-14 audit for CLAUDE.md s. 2a, "one copy of procedure").
--
--   id 1, small-claims, starting-case  "Form 1B – Plaintiff’s Claim"  ->  "Form 7A – Plaintiff’s Claim"
--   id 2, small-claims, responding     "Form 7A – Defence"            ->  "Form 9A – Defence"
--
-- The stage map is the source for forms (src/lib/content-library/
-- nextStepPractical.ts: the starting step names 7A, the defence step 9A, both
-- checked against the Rules of the Small Claims Court in docs/sources/corpus).
-- Small Claims Form 1B is the Request to Change Attendance Method and Form 7A is
-- the Plaintiff's Claim (src/lib/content-library/forms/formRuleIndex.json, from
-- the official forms site), so these rows named the wrong form twice.
--
-- No page shows required_forms today (ProcedureAuthorityDisplay renders only
-- the verified workflow guidance), so this is a data correction, not a fix to
-- anything a user saw. Each UPDATE is guarded on the row's identity AND the old
-- value, so a row already changed in production is skipped, not overwritten.
--
-- Applied by the site owner (CLAUDE.md s. 6): staging first, then production.

UPDATE public.legal_procedure_rules
SET required_forms = '{"Form 7A – Plaintiff’s Claim"}'
WHERE id = 1
  AND court_area = 'small-claims'
  AND procedure_stage = 'starting-case'
  AND required_forms = '{"Form 1B – Plaintiff’s Claim"}';

UPDATE public.legal_procedure_rules
SET required_forms = '{"Form 9A – Defence"}'
WHERE id = 2
  AND court_area = 'small-claims'
  AND procedure_stage = 'responding'
  AND required_forms = '{"Form 7A – Defence"}';
