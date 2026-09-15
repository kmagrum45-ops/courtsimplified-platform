-- 01b — Every policy, and which roles it applies to.
--
-- READ-ONLY. Safe against production.
--
-- *** THIS IS THE QUERY THAT FINDS FINDING 1. Run it before the remediation
-- *** and again after.
--
-- WHAT IT REPORTS
--   Every RLS policy in the public schema: the table, the policy name, the
--   roles it applies to, which command it covers, and its USING and WITH CHECK
--   expressions.
--   Sorted so anything applying to {public} appears first.
--
-- WHAT TO LOOK FOR — the roles column
--   roles = {public}   A policy written with NO "TO" clause. Postgres defaults
--                      it to PUBLIC, which INCLUDES anon. This is how twelve
--                      dev_full_access_* policies gave anonymous callers full
--                      write and DELETE on the legal content tables: nothing
--                      in the policy text said who held the permission.
--   roles = {anon}     Explicit anonymous access. Legitimate for a public
--                      read; never correct on a case_* table.
--   roles = {authenticated}  The correct shape for anything user-owned.
--
-- EXPECTED BEFORE REMEDIATION
--   Roughly a dozen rows with roles = {public} and cmd = ALL, on:
--     civil_form_lookup, court_form_sources, court_forms, form_rules, forms,
--     legal_element_rules, legal_evidence_rules, legal_form_mapping_rules,
--     legal_issue_rules, legal_procedure_rules, legal_question_rules,
--     legal_risk_rules, small_claims_form_lookup
--   Plus {public} SELECT/INSERT/UPDATE rows on pdf_field_mappings,
--   pdf_form_inventory, pdf_overlay_fields and court_form_fields.
--
-- EXPECTED AFTER REMEDIATION
--   NO row where roles = {public} AND cmd = 'ALL'.
--   The only surviving {public} rows should be on pdf_field_mappings and
--   pdf_form_inventory, which are the two declared known holes — they stay
--   until app/admin/pdf-field-mapper and app/api/admin/scan-pdf-fields get
--   authentication.
--
-- ALSO CHECK
--   Every case_* row reads TO {authenticated} with
--   (auth.uid() = user_id) in BOTH using_expression and with_check_expression.
--   A policy with a USING but no WITH CHECK permits a user to write a row
--   belonging to someone else.

SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual       AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY
  (roles::text = '{public}') DESC,
  tablename,
  policyname;
