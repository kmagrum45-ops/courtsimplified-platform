-- Repair legal_procedure_rules id=1 (small-claims/starting-case)'s
-- required_forms: "Form 1B" corrected to "Form 7A". Investigated 2026-08-23.
--
-- The row paired the correct title ("Plaintiff's Claim") with the wrong form
-- number ("Form 1B"). Verified wrong from four independent angles before
-- writing this, not assumed from a single source:
--
--   1. Every tested engine in this codebase that names this form agrees on
--      Form 7A: smallClaimsIntelligenceEngine.ts, smallClaimsEngine.ts,
--      caseSystemAssembly.ts, and the passing verifySmallClaimsEngine.ts suite.
--   2. Two independent external sources (a legal-process explainer site and a
--      web search summary of the governing rule) both confirm Form 7A.
--   3. The project's own court_form_library catalogue -- the authoritative
--      form-number source, not this table -- has "Form 7A" titled exactly
--      "Plaintiff's Claim" with procedure_stage "starting-case": an exact
--      match for what this row needs.
--   4. "Form 1B" is not a fabricated number: court_form_library has a real
--      "Form 01B", titled "Request to Change Attendance Method" -- a genuine,
--      different Small Claims form for a different purpose. This row's value
--      paired that number with the wrong title, rather than referencing a
--      form that does not exist. It is not a legitimate alternate form for
--      some edge case; it is simply wrong.
--
-- The row's own procedure_stage ("starting-case"), rule_name ("Starting a
-- Small Claims lawsuit"), and authority_citation (O. Reg. 258/98, r. 7.01,
-- already verified-for-workflow) are unaffected -- only required_forms is
-- corrected here.
--
-- Formatting matches this table's own convention (en dash, curly apostrophe),
-- confirmed against row id=2's "Form 7A – Defence" in the same table, not
-- against the app code's em-dash style used elsewhere for the same form.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.legal_procedure_rules
    WHERE id = 1
      AND court_area = 'small-claims'
      AND procedure_stage = 'starting-case'
      AND required_forms = ARRAY['Form 1B – Plaintiff’s Claim']
  ) THEN
    RAISE EXCEPTION 'Expected row id=1 to still hold the incorrect Form 1B value before repairing it';
  END IF;
END
$$;

UPDATE public.legal_procedure_rules
SET required_forms = ARRAY['Form 7A – Plaintiff’s Claim']
WHERE id = 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.legal_procedure_rules
    WHERE id = 1 AND required_forms = ARRAY['Form 7A – Plaintiff’s Claim']
  ) THEN
    RAISE EXCEPTION 'Expected row id=1 to hold the corrected Form 7A value after the update';
  END IF;
END
$$;
