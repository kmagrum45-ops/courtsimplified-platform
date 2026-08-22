-- Deactivate legal_procedure_rules id=24 ("case-conference"), an unreachable
-- duplicate of id=6 ("conference"). Investigated 2026-08-22.
--
-- Both rows share the same rule_name ("Preparing for a family case
-- conference"), the same required_forms, and the same regulation citation
-- (O. Reg. 114/99, r. 17 (4) (a)-(c)); the 2026-08-09 workflow-guidance bundle
-- even attached the identical guidance sentence to both, under the same
-- workflow_guidance_source_id. The only functional difference is
-- procedure_stage.
--
-- id=6's value, "conference", is the only one anything in the running app
-- ever queries with. legal_procedure_rules has exactly one consumer,
-- app/api/rules/procedures/route.ts, and the stage value that reaches it comes
-- from FamilyCanonicalStage (defined in familyIntakeCanonicalAdapter.ts) --
-- starting-case | responding | already-started | conference | motion | trial
-- | enforcement | urgent | not-sure. "case-conference" is not a member of
-- that union.
--
-- "case-conference" is a real, distinct value -- but it belongs to a
-- different, deeper vocabulary: familyAiIntakeNormalizer.ts and
-- familyWorkflowEngine.ts use it internally to distinguish conference types
-- for form-routing, and that normalizer maps the raw "conference" input
-- *into* "case-conference" as an implementation detail. That mapped value
-- never round-trips back out to query legal_procedure_rules. So id=24 has
-- been unreachable through any live code path since it was created.
--
-- Deactivated rather than deleted: is_active is a column this table already
-- defines, and the sole consumer already filters on it
-- (.eq("is_active", true)), so this uses an existing, already-respected
-- mechanism instead of removing a row from a live production table. This is a
-- verified no-op for the running app -- nothing queries
-- procedure_stage = 'case-conference', so no query result changes for any
-- user. All 55 rows had is_active = true before this migration; this is the
-- first row to carry false.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.legal_procedure_rules
    WHERE id = 24
      AND court_area = 'family'
      AND procedure_stage = 'case-conference'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Expected an active row id=24 (family/case-conference) before deactivating it';
  END IF;
END
$$;

UPDATE public.legal_procedure_rules
SET
  is_active = false,
  notes = 'DEPRECATED / UNREACHABLE (2026-08-22): duplicate of id=6 (procedure_stage=''conference''), which is the value the app actually queries. This row''s procedure_stage=''case-conference'' matches a different internal vocabulary (familyAiIntakeNormalizer.ts) that never queries this table directly. Deactivated rather than deleted so the historical record is preserved.'
WHERE id = 24;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.legal_procedure_rules WHERE id = 24 AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Expected row id=24 to be inactive after the update';
  END IF;
END
$$;
