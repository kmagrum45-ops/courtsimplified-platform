-- 01a — Is Row Level Security actually on?
--
-- READ-ONLY. No DDL, no DML, no GRANT, no REVOKE. Safe against production.
--
-- WHAT IT REPORTS
--   One row per table in the public schema, with whether RLS is enabled and
--   whether it is FORCED.
--   Sorted so any table WITHOUT RLS appears first.
--
-- WHAT TO EXPECT
--   rls_enabled = true for all 24 tables. The migration file says so; this is
--   the only thing that can confirm production agrees.
--
-- WHAT A BAD RESULT LOOKS LIKE
--   Any row with rls_enabled = false. On a case_* table that is an open door:
--   anon already holds ALL on those, so RLS is the only thing denying access.
--   On a content table it means anyone with the public key can read and write
--   the legal rules the platform serves.
--
-- ON rls_forced
--   Expect false, and that is fine. FORCE applies RLS to the table OWNER as
--   well, which Supabase's service_role deliberately bypasses. It is not a
--   finding.

SELECT
  c.relname             AS table_name,
  c.relrowsecurity      AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relrowsecurity ASC, c.relname;
