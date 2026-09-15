-- 01d — The seven case tables specifically. These hold the personal data.
--
-- READ-ONLY. Safe against production.
--
-- *** THIS IS THE QUERY THAT FINDS FINDING 2, and the one to re-run after
-- *** remediation to prove it closed.
--
-- WHAT IT REPORTS
--   For each table holding personal data, which of anon / authenticated /
--   service_role holds which privileges.
--
-- WHAT THESE TABLES CONTAIN
--   cases                            master_result: the intake narrative,
--                                    party names, the analysis
--   case_intakes                     intake responses
--   case_documents                   generated and uploaded documents
--   case_evidence                    evidence metadata, storage paths
--   case_generated_documents         assembled court documents
--   case_events                      the case lifecycle record
--   case_event_candidate_dismissals  which suggestions a user declined
--
-- EXPECTED BEFORE REMEDIATION
--   anon appears on every one, with DELETE, INSERT, SELECT, TRUNCATE, UPDATE
--   (the expansion of GRANT ALL). This is the section 16 finding.
--
-- EXPECTED AFTER REMEDIATION
--   *** anon appears ZERO times. ***
--   authenticated and service_role remain — both are required. authenticated
--   is how a signed-in user reaches their own rows under RLS; service_role is
--   how the server routes read them after verifying the bearer token.
--
-- IF anon STILL APPEARS AFTER RUNNING THE REMEDIATION
--   The REVOKE did not take. Most likely causes, in order:
--     1. The remediation was run against courtsimplified-dev, not production.
--     2. A later GRANT re-applied it — check for dashboard changes.
--     3. The table is owned by a role the running user cannot revoke for.
--
-- NOTE ON WHAT THIS DOES NOT PROVE
--   No anon grant is not the same as no anon access. A SECURITY DEFINER
--   function, or a view owned by a privileged role, can still expose rows.
--   01e covers the views.

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
ORDER BY
  (grantee = 'anon') DESC,
  table_name,
  grantee;
