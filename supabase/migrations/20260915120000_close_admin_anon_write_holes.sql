-- Close the two declared anon-write holes, and restore the mapper's write to
-- authenticated only.
--
-- NOT APPLIED BY CLAUDE TO PRODUCTION without an explicit go-ahead
-- (CLAUDE.md section 6). Apply with:
--   npm run audit:apply -- --project legacy --confirm
--
-- WHY THESE WERE LEFT OPEN, AND WHY THEY CAN CLOSE NOW
--
-- The 2026-09-15 remediation deliberately left anon write on
-- pdf_form_inventory and pdf_field_mappings, because two unauthenticated
-- surfaces depended on it: /api/admin/scan-pdf-fields and
-- app/admin/pdf-field-mapper. Revoking then would have closed a hole and
-- broken the tool in the same statement.
--
-- Both surfaces have now been dealt with:
--
--   /api/scan-form-fields        DELETED -> scripts/forms/scanFormFields.ts
--                                It built a client with the SERVICE ROLE key,
--                                bypassing RLS, with no authentication, and
--                                had no caller anywhere.
--   /api/admin/scan-pdf-fields   DELETED -> scripts/forms/scanPdfInventory.ts
--                                Unauthenticated, upserted on a bare GET, and
--                                also had no caller.
--   app/admin/pdf-field-mapper   NOW REQUIRES A SESSION. It reads
--                                pdf_form_inventory and pdf_overlay_fields and
--                                WRITES pdf_overlay_fields.
--
-- Both scanners now run locally with credentials from .env.local, so the
-- privilege sits on a machine an operator is at rather than on a URL.

BEGIN;

-- =====================================================================
-- pdf_field_mappings — CLOSED COMPLETELY. Nothing reads or writes it.
-- =====================================================================
--
-- Checked before removing: no caller in app/, src/ or scripts/. Not the
-- mapper, which uses pdf_overlay_fields, and not either deleted route. Its
-- three PUBLIC policies and its anon write grant existed for code that does
-- not exist.
--
-- The policies are dropped rather than narrowed. There is no reader to keep
-- working, so a SELECT policy would be inventing a permission for nobody.

DROP POLICY IF EXISTS "Allow insert field mappings"      ON "public"."pdf_field_mappings";
DROP POLICY IF EXISTS "Allow update field mappings"      ON "public"."pdf_field_mappings";
DROP POLICY IF EXISTS "Allow public read field mappings" ON "public"."pdf_field_mappings";

REVOKE ALL ON TABLE "public"."pdf_field_mappings" FROM "anon";

-- =====================================================================
-- pdf_form_inventory — read stays, write goes.
-- =====================================================================
--
-- The mapper reads this to list the forms it can work on. That read now
-- happens with a session, so the policy is scoped to authenticated: there is
-- no anonymous reader left to serve.
--
-- Writes came only from the deleted route. scripts/forms/scanPdfInventory.ts
-- replaces it and runs as the service role, which bypasses RLS and needs no
-- policy.

DROP POLICY IF EXISTS "Allow scanner insert pdf form inventory" ON "public"."pdf_form_inventory";
DROP POLICY IF EXISTS "Allow scanner update pdf form inventory" ON "public"."pdf_form_inventory";
DROP POLICY IF EXISTS "Allow public read pdf form inventory"    ON "public"."pdf_form_inventory";

DROP POLICY IF EXISTS "pdf_form_inventory_read_authenticated" ON "public"."pdf_form_inventory";
CREATE POLICY "pdf_form_inventory_read_authenticated"
  ON "public"."pdf_form_inventory"
  FOR SELECT
  TO "authenticated"
  USING (true);

REVOKE ALL ON TABLE "public"."pdf_form_inventory" FROM "anon";

-- =====================================================================
-- pdf_overlay_fields — the mapper's write, restored for authenticated only.
-- =====================================================================
--
-- The earlier remediation revoked anon write here and dropped the insert and
-- update policies. That was right, and it broke the mapper's save, because the
-- mapper used the anon key with no session. The mapper now signs in, so the
-- write comes back scoped to `authenticated`.
--
-- THE ANONYMOUS READ STAYS. app/forms/page.tsx reads this table with a bare
-- anon client and no session to position overlays on the public form preview.
-- That is a genuine anonymous read of non-personal data and closing it would
-- break the public forms page.

DROP POLICY IF EXISTS "pdf_overlay_fields_write_authenticated" ON "public"."pdf_overlay_fields";
CREATE POLICY "pdf_overlay_fields_write_authenticated"
  ON "public"."pdf_overlay_fields"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

GRANT INSERT, UPDATE ON TABLE "public"."pdf_overlay_fields" TO "authenticated";

COMMIT;

-- =====================================================================
-- AFTER RUNNING
--
-- 01b: pdf_field_mappings should not appear at all. pdf_form_inventory should
--      show one {authenticated} SELECT policy. pdf_overlay_fields should show
--      its {anon,authenticated} SELECT and a {authenticated} ALL.
-- 01c: neither pdf_ table should appear for anon except pdf_overlay_fields
--      with SELECT.
--
-- KNOWN_ANON_WRITE in verifyAnonGrants should now be EMPTY.
-- =====================================================================
