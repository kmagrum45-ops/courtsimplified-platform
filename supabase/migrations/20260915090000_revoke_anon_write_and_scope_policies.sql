-- Revoke anonymous write access, and scope the policies that applied to PUBLIC.
--
-- Companion to docs/security/02-remediation.sql, which carries the full
-- reasoning and the reader-by-reader analysis behind every line here.
--
-- NOT APPLIED BY CLAUDE. CLAUDE.md section 6: production is never modified
-- without an explicit go-ahead. Run against courtsimplified-dev first, then
-- production, after running docs/security/01a-01e (see docs/security/README.md) to
-- confirm the live schema matches what this was written from.
--
-- TWO FINDINGS:
--   1. Twelve dev_full_access_* policies had no TO clause, so they applied to
--      PUBLIC including anon. With GRANT ALL that gave anonymous callers full
--      write and DELETE on the legal content served to self-represented users.
--   2. anon held ALL on the five case tables. RLS denied by default so nothing
--      was exposed, but it left RLS as the only layer rather than the second.

BEGIN;

-- --- The ten with no callers: drop outright. ---
DROP POLICY IF EXISTS "dev_full_access_civil_form_lookup"        ON "public"."civil_form_lookup";
DROP POLICY IF EXISTS "dev_full_access_court_form_sources"       ON "public"."court_form_sources";
DROP POLICY IF EXISTS "dev_full_access_court_forms"              ON "public"."court_forms";
DROP POLICY IF EXISTS "dev_full_access_form_rules"               ON "public"."form_rules";
DROP POLICY IF EXISTS "dev_full_access_forms"                    ON "public"."forms";
DROP POLICY IF EXISTS "dev_full_access_legal_element_rules"      ON "public"."legal_element_rules";
DROP POLICY IF EXISTS "dev_full_access_legal_evidence_rules"     ON "public"."legal_evidence_rules";
DROP POLICY IF EXISTS "dev_full_access_legal_issue_rules"        ON "public"."legal_issue_rules";
DROP POLICY IF EXISTS "dev_full_access_legal_question_rules"     ON "public"."legal_question_rules";
DROP POLICY IF EXISTS "dev_full_access_legal_risk_rules"         ON "public"."legal_risk_rules";

-- --- legal_procedure_rules: read only via service role, which bypasses RLS. ---
DROP POLICY IF EXISTS "dev_full_access_legal_procedure_rules"    ON "public"."legal_procedure_rules";

-- --- legal_form_mapping_rules: read by an authenticated route. Replace. ---
DROP POLICY IF EXISTS "dev_full_access_legal_form_mapping_rules" ON "public"."legal_form_mapping_rules";

CREATE POLICY "legal_form_mapping_rules_read_authenticated"
  ON "public"."legal_form_mapping_rules"
  FOR SELECT
  TO "authenticated"
  USING (true);

-- --- pdf_overlay_fields: keep the anonymous read the forms page makes,
-- --- remove the anonymous write.
DROP POLICY IF EXISTS "Allow insert overlay fields" ON "public"."pdf_overlay_fields";
DROP POLICY IF EXISTS "Allow update overlay fields" ON "public"."pdf_overlay_fields";
-- "Allow read overlay fields" (FOR SELECT USING (true)) is DELIBERATELY KEPT:
-- app/forms/page.tsx reads it with no session.

-- --- Write privileges follow. A dropped policy still leaves the GRANT. ---
--
-- REFERENCES AND TRIGGER ARE INCLUDED, and they were missed in the first draft
-- of this file. Running 01c against the live dev database showed what GRANT ALL
-- actually expands to:
--
--   DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
--
-- Seven privileges, not four. The migration file said "GRANT ALL" and the
-- expansion is only visible from the database — which is the point of running
-- 01a-01e before this, and an example of why the file is a snapshot rather
-- than a record.
--
-- Both are low-risk on a content table and neither is nothing: REFERENCES
-- permits creating a foreign key against the table, which can block later
-- schema changes; TRIGGER permits attaching a trigger. Leaving two of seven
-- behind would mean this had to be done twice.
--
-- SELECT is deliberately retained on the content tables. Those reads are what
-- /forms and the form pipeline depend on.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."civil_form_lookup"        FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."court_form_sources"       FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."court_forms"              FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."form_rules"               FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."forms"                    FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."legal_element_rules"      FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."legal_evidence_rules"     FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."legal_issue_rules"        FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."legal_question_rules"     FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."legal_risk_rules"         FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."legal_procedure_rules"    FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."legal_form_mapping_rules" FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."pdf_overlay_fields"       FROM "anon";

-- --- The remaining content tables, found by verifyAnonGrants rather than by
-- --- the manual audit. None has a caller that writes as anon.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."court_form_fields"        FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."court_form_library"       FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."court_form_overlays"      FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."family_form_lookup"       FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."small_claims_form_lookup" FROM "anon";

-- Views. GRANT ALL was applied to these too, and a view can be written through
-- when it is simple enough to be auto-updatable.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."court_form_clean_view"  FROM "anon";
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."court_form_master_view" FROM "anon";

-- --- One more dev_full_access_*, found by the check rather than the audit. ---
DROP POLICY IF EXISTS "dev_full_access_small_claims_form_lookup"
  ON "public"."small_claims_form_lookup";

-- --- Make the surviving read policies say who they are for. ---
--
-- BEHAVIOUR-PRESERVING. These were already effectively public reads; writing
-- the TO clause changes nothing about who can read and everything about
-- whether the next reader can tell at a glance. An implicit TO PUBLIC is how
-- the twelve dev_full_access_* policies hid — the danger was never the
-- permission, it was that nothing in the text said who held it.

DROP POLICY IF EXISTS "Allow public read court form fields" ON "public"."court_form_fields";
CREATE POLICY "court_form_fields_read_public"
  ON "public"."court_form_fields"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);

DROP POLICY IF EXISTS "Allow read overlay fields" ON "public"."pdf_overlay_fields";
CREATE POLICY "pdf_overlay_fields_read_public"
  ON "public"."pdf_overlay_fields"
  FOR SELECT
  TO "anon", "authenticated"
  USING (true);
-- app/forms/page.tsx reads this with no session. Keeping it is deliberate.

COMMIT;

-- =====================================================================
-- DELIBERATELY NOT REVOKED — pdf_form_inventory, pdf_field_mappings
-- =====================================================================
--
-- These keep anon write, and it is a known hole rather than an oversight.
--
-- app/admin/pdf-field-mapper/page.tsx and app/api/admin/scan-pdf-fields build
-- their clients with the ANON key and have NO AUTHENTICATION. Revoking anon
-- write here would close the hole and break the admin tool in the same
-- statement.
--
-- The right order is: authenticate those two surfaces (or drop them from the
-- deployed build), then revoke. Doing it the other way round trades a security
-- finding for an outage, and the instruction behind this work was not to fix a
-- hole by breaking something.
--
-- They are declared in verifyAnonGrants's KNOWN_ANON_WRITE list with this
-- reason, so the check passes while still naming them on every run rather than
-- letting them disappear.
--
-- Severity note for the meeting: these hold PDF field coordinates and form
-- inventory. No personal data. The exposure is the same integrity class as the
-- legal content tables, one step further from the user.

-- =====================================================================
-- FINDING 2 — anon holds ALL on the five case tables
-- =====================================================================
--
-- These hold personal data: intake narratives, party names and addresses,
-- uploaded evidence metadata, generated documents.
--
-- TODAY THIS IS NOT AN OPEN DOOR. RLS is enabled on every one, and every
-- policy on them is TO "authenticated" — there is no anon policy, and RLS
-- denies by default when no policy matches. An anonymous caller currently
-- reads zero rows.
--
-- IT IS A MISSING SECOND LAYER. The grant means that one permissive policy
-- added by mistake, or one ALTER TABLE ... DISABLE ROW LEVEL SECURITY,
-- converts immediately to total exposure of every user's case file with
-- nothing else in the way. Revoking the grant makes RLS the second line
-- rather than the only one.
--
-- SAFE BECAUSE NOTHING READS THESE AS ANON. Every case-table access in the
-- app goes through either a session-bearing client or the service role:
-- src/lib/supabase/serverAuth.ts for the routes, and the browser client only
-- after sign-in. Service role is unaffected by REVOKE on anon.

BEGIN;

REVOKE ALL ON TABLE "public"."cases"                          FROM "anon";
REVOKE ALL ON TABLE "public"."case_intakes"                   FROM "anon";
REVOKE ALL ON TABLE "public"."case_documents"                 FROM "anon";
REVOKE ALL ON TABLE "public"."case_evidence"                  FROM "anon";
REVOKE ALL ON TABLE "public"."case_generated_documents"       FROM "anon";

-- Added 2026-09-13, matched to the same convention and carrying the same
-- issue. Included so the fix does not leave two of seven behind.
REVOKE ALL ON TABLE "public"."case_events"                    FROM "anon";
REVOKE ALL ON TABLE "public"."case_event_candidate_dismissals" FROM "anon";

COMMIT;

-- =====================================================================
-- AFTER RUNNING: re-run 01a-01e (see README.md).
--
-- Query 2 should return no row where roles = {public} and cmd = 'ALL'.
-- Query 4 should return no row where grantee = 'anon'.
--
-- THEN EXERCISE THE APP, signed out, and confirm these still work:
--   /forms                      reads court_form_master_view,
--                               court_form_library, pdf_overlay_fields
--   the court-path classifier   reads nothing in this set
--
-- And signed in:
--   form applicability          reads legal_form_mapping_rules,
--                               court_form_library
--   procedure rules             service role, unaffected
--
-- npm run test:anon-grants checks the migration files stay correct; it cannot
-- see the live database. The queries above are the only thing that can.
-- =====================================================================
