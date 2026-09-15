-- CourtSimplified — READ-ONLY audit of the live RLS and grant state.
--
-- RUN THIS FIRST, BEFORE THE REMEDIATION SCRIPT.
--
-- *** THIS SCRIPT ONLY READS. It contains no DDL, no DML, no GRANT, no
-- *** REVOKE, no DROP. It is safe to run against production.
--
-- WHY IT EXISTS, AND WHY THE ANSWER MATTERS
--
-- The audit that produced 02-remediation.sql was performed against
-- supabase/migrations/20260823020500_add_case_evidence_storage_bucket.sql —
-- a file, not the database. Only THREE migrations exist for twenty-four
-- tables, so most of this schema was created through the Supabase dashboard
-- and the migration is a snapshot of one moment, not a guaranteed record of
-- the live state.
--
-- The live database may therefore differ from what the audit describes:
-- policies added or dropped by hand, grants changed, RLS toggled. Everything
-- in the remediation script is written to be safe under drift (IF EXISTS,
-- idempotent), but the REPORT should be checked against reality before it is
-- relied on in a meeting.
--
-- Run each query in the Supabase SQL editor and compare against the expected
-- column. Anything that does not match is drift and should be looked at
-- before remediating.

-- =====================================================================
-- 1. Which tables have RLS enabled.
--    EXPECTED: rowsecurity = true for all 24 public tables.
-- =====================================================================
SELECT
  c.relname        AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relrowsecurity ASC, c.relname;

-- =====================================================================
-- 2. Every policy, and which roles it applies to.
--
--    THE FINDING TO LOOK FOR: roles = {public}. A policy with no TO clause
--    applies to PUBLIC, which INCLUDES anon. Twelve dev_full_access_*
--    policies are in this state in the migration file.
--
--    EXPECTED AFTER REMEDIATION: no row where roles = {public} and cmd = 'ALL'.
-- =====================================================================
SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual        AS using_expression,
  with_check  AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY
  (roles::text = '{public}') DESC,
  tablename,
  policyname;

-- =====================================================================
-- 3. What the anon role has been GRANTED, table by table.
--
--    THE FINDING TO LOOK FOR: INSERT / UPDATE / DELETE for anon on any
--    case_* table, or on the legal_* and form content tables.
--
--    A grant alone is not access — RLS still has to permit the row. But it
--    is the second layer, and section 16 of OUTSTANDING_ISSUES records that
--    every case table currently grants ALL to anon and survives on RLS
--    alone.
--
--    EXPECTED AFTER REMEDIATION: anon holds SELECT only, and holds nothing
--    at all on the five case tables.
-- =====================================================================
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

-- =====================================================================
-- 4. The five case tables specifically, since they hold personal data.
--
--    EXPECTED NOW:    anon has ALL (the section 16 finding)
--    EXPECTED AFTER:  anon appears zero times
-- =====================================================================
SELECT
  table_name,
  grantee,
  string_agg(DISTINCT privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'cases',
    'case_intakes',
    'case_documents',
    'case_evidence',
    'case_generated_documents',
    'case_events',
    'case_event_candidate_dismissals'
  )
  AND grantee IN ('anon', 'authenticated', 'service_role')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;

-- =====================================================================
-- 5. Views. A view is not covered by the underlying table's RLS unless it
--    is declared security_invoker, so a view granted to anon can expose
--    rows the table's policies would have denied.
--
--    court_form_master_view and court_form_clean_view are both granted to
--    anon and are read by app/forms/page.tsx without a session.
--
--    EXPECTED: these two only, and neither selecting from a case_* table.
-- =====================================================================
SELECT
  c.relname AS view_name,
  CASE
    WHEN c.reloptions::text LIKE '%security_invoker=true%' THEN 'security_invoker'
    ELSE 'definer (runs as owner — RLS of underlying tables NOT applied)'
  END AS security_mode,
  pg_get_viewdef(c.oid, true) AS definition
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'v'
ORDER BY c.relname;
