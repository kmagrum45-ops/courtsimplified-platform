-- 01c — What the anon role has been GRANTED, table by table.
--
-- READ-ONLY. Safe against production.
--
-- WHAT IT REPORTS
--   One row per table where the anon role holds any privilege, with the
--   privileges aggregated.
--   Sorted so anything including INSERT appears first.
--
-- GRANT AND POLICY ARE TWO DIFFERENT LAYERS, and the distinction matters for
-- how you describe this to anyone.
--
--   A GRANT is the table privilege: may this role attempt the operation.
--   A POLICY is the row filter: which rows may it touch.
--
--   With RLS enabled and no matching policy, Postgres DENIES — so a grant
--   alone exposes nothing. That is exactly the case on the case_* tables
--   today: anon holds ALL, and reads zero rows, because every policy on them
--   is TO authenticated.
--
--   The grant is still worth removing. It means RLS is the ONLY layer. One
--   mistaken permissive policy, or one ALTER TABLE ... DISABLE ROW LEVEL
--   SECURITY, converts it to full exposure of every user's case file with
--   nothing else in the way.
--
-- EXPECTED BEFORE REMEDIATION
--   Around 27 tables with anon_privileges containing INSERT, UPDATE, DELETE,
--   TRUNCATE — the result of GRANT ALL.
--
-- EXPECTED AFTER REMEDIATION
--   anon holds SELECT only, and only on tables the app genuinely reads without
--   a session:
--     court_form_library      read by app/forms/page.tsx, no session
--     pdf_overlay_fields      read by app/forms/page.tsx, no session
--     court_form_fields       public read
--     court_forms             scoped anon SELECT, family/ontario rows
--     the two views           court_form_master_view, court_form_clean_view
--
--   Plus pdf_field_mappings and pdf_form_inventory, which KEEP write as the
--   two declared known holes.
--
-- WHAT A BAD RESULT LOOKS LIKE AFTER REMEDIATION
--   Any case_* table appearing at all — see 01d, which asks that directly.

SELECT
  table_name,
  string_agg(DISTINCT privilege_type, ', ' ORDER BY privilege_type) AS anon_privileges
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
  AND table_schema = 'public'
GROUP BY table_name
ORDER BY
  (string_agg(DISTINCT privilege_type, ',') LIKE '%INSERT%') DESC,
  table_name;
