-- CourtSimplified — remediation for the two database findings.
--
-- *** NOT RUN BY CLAUDE. CLAUDE.md section 6: production is never modified
-- *** without an explicit go-ahead. This is written to be read first, run by
-- *** a person, and run against courtsimplified-dev before production.
--
-- RUN 01a THROUGH 01e FIRST — see README.md for the order. Those five
-- queries only read, and they tell you whether the live database matches the
-- migration file this remediation was written from. Only three migrations exist for twenty-four tables, so
-- most of the schema was created through the dashboard and the file is a
-- snapshot rather than a guaranteed record.
--
-- Every statement below is idempotent and uses IF EXISTS, so drift does not
-- turn a rerun into an error.
--
-- =====================================================================
-- WHAT WAS CHECKED BEFORE WRITING THIS — the readers, table by table
-- =====================================================================
--
-- The instruction was not to fix a security hole by breaking the site, so
-- every affected table was traced to its callers first. Grepped across app/,
-- src/ and scripts/ for `.from("<table>")`:
--
--   legal_form_mapping_rules   app/api/cases/form-applicability/route.ts,
--                              which builds its client with the USER'S TOKEN
--                              (line 156: Authorization: Bearer ${token}), so
--                              it runs as `authenticated`.
--                              -> NEEDS a replacement policy.
--
--   legal_procedure_rules      app/api/rules/procedures/route.ts, which builds
--                              its client with SUPABASE_SERVICE_ROLE_KEY
--                              (line 59). Service role BYPASSES RLS entirely.
--                              -> needs NO policy.
--
--   civil_form_lookup          NO CALLERS ANYWHERE.
--   court_form_sources         NO CALLERS.
--   court_forms                NO CALLERS.
--   form_rules                 NO CALLERS.
--   forms                      NO CALLERS.
--   legal_element_rules        NO CALLERS.
--   legal_evidence_rules       NO CALLERS.
--   legal_issue_rules          NO CALLERS.
--   legal_question_rules       NO CALLERS.
--   legal_risk_rules           NO CALLERS.
--                              -> drop, no replacement. Ten of the twelve.
--
--   pdf_overlay_fields         READ anonymously by app/forms/page.tsx (line
--                              578) with a bare anon client and no session,
--                              and by app/api/generate-form/route.ts.
--                              -> KEEP the SELECT policy. Drop INSERT/UPDATE.
--
--   pdf_form_inventory         Read/written by app/admin/pdf-field-mapper and
--                              app/api/admin/scan-pdf-fields — neither
--                              authenticated. Left alone here and raised
--                              separately; locking it down without fixing
--                              those routes would break the admin tool.
--
--   pdf_field_mappings         NO READERS found.
--
--   court_form_library         Already correct — "Allow public read court form
--                              library" is FOR SELECT TO authenticated, anon.
--                              Read anonymously by app/forms/page.tsx.
--                              -> NOT TOUCHED.
--
-- =====================================================================
-- FINDING 1 — dev_full_access_* policies apply to PUBLIC, including anon
-- =====================================================================
--
-- A policy written as `CREATE POLICY x ON t USING (true) WITH CHECK (true)`
-- with no TO clause defaults to TO PUBLIC. Combined with GRANT ALL TO anon,
-- an anonymous caller holding the public anon key has full read, write AND
-- DELETE on these tables.
--
-- No personal data lives in them. The exposure is LEGAL CONTENT INTEGRITY:
-- someone could alter the legal rules and form data the platform serves to
-- self-represented users. For this product that is the more serious of the
-- two failure modes.

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
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."civil_form_lookup"        FROM "anon";
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."court_form_sources"       FROM "anon";
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."court_forms"              FROM "anon";
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."form_rules"               FROM "anon";
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."forms"                    FROM "anon";
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."legal_element_rules"      FROM "anon";
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."legal_evidence_rules"     FROM "anon";
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."legal_issue_rules"        FROM "anon";
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."legal_question_rules"     FROM "anon";
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."legal_risk_rules"         FROM "anon";
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."legal_procedure_rules"    FROM "anon";
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."legal_form_mapping_rules" FROM "anon";
REVOKE INSERT, UPDATE, DELETE ON TABLE "public"."pdf_overlay_fields"       FROM "anon";

COMMIT;

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
-- AFTER RUNNING: re-run 01b and 01d.
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
