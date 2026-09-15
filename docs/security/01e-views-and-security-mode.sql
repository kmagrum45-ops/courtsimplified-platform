-- 01e — Views, and whether they bypass the RLS of the tables beneath them.
--
-- READ-ONLY. Safe against production.
--
-- WHY A VIEW IS ITS OWN QUESTION
--   A view does NOT automatically enforce the RLS of the tables it selects
--   from. By default a view runs with the privileges of its OWNER, which in
--   Supabase is a privileged role — so the owner's access applies, not the
--   caller's, and the underlying table's policies are not consulted.
--
--   That means a view granted to anon can return rows that a direct SELECT by
--   anon on the same table would have been denied. It is the most common way
--   an otherwise-correct RLS setup leaks.
--
--   `security_invoker = true` reverses this: the view runs as the CALLER, and
--   the underlying policies apply. It is the safe mode.
--
-- WHAT IT REPORTS
--   Every view in the public schema, whether it is security_invoker, and its
--   full definition.
--
-- WHAT TO CHECK, in order
--   1. WHICH TABLES DOES THE DEFINITION SELECT FROM?
--      Read the definition column. If any view selects from cases,
--      case_intakes, case_documents, case_evidence, case_generated_documents,
--      case_events or case_event_candidate_dismissals, stop and treat it as a
--      finding — a definer-mode view over a case table exposes other users'
--      rows to anyone who can select from the view.
--
--   2. IS IT security_invoker?
--      If it selects only from form and content tables, definer mode is not a
--      personal-data problem.
--
-- EXPECTED
--   Two views, court_form_master_view and court_form_clean_view, both selecting
--   from the court form tables only. Both are granted to anon and are read by
--   app/forms/page.tsx with no session, which is intended — /forms is a public
--   directory of court forms.
--
--   Neither should touch a case_* table. If one does, that was not found by
--   the 2026-09-15 audit, which read the migration file rather than the live
--   database.
--
-- WHAT A BAD RESULT LOOKS LIKE
--   A view not named above — the migration file lists only two, so a third is
--   drift created through the dashboard and nobody has reviewed what it
--   exposes.

SELECT
  c.relname AS view_name,
  CASE
    WHEN c.reloptions::text LIKE '%security_invoker=true%'
      THEN 'security_invoker (caller''s RLS applies — safe)'
    ELSE 'definer (runs as owner — underlying RLS NOT applied)'
  END AS security_mode,
  pg_get_viewdef(c.oid, true) AS definition
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('v', 'm')
ORDER BY c.relname;
