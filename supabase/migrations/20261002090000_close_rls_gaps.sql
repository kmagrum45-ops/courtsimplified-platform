-- ===========================================================================
-- CLOSE THE FIVE RLS GAPS FOUND BY test:rls-matrix (2026-10-02)
--
-- Each finding was reproduced against a database built from these migrations
-- before this file was written; docs/security/RLS_GAP_ANALYSIS.md has the
-- evidence. `npm run test:rls-matrix` proves each fix, and fails if any of them
-- is undone.
--
--   F1  family_form_lookup let any signed-in user write court_forms past RLS
--   F2  pdf_overlay_fields was writable by every signed-in account
--   F3  rows could be attached to another user's case or document
--   F4  a workspace document row could point at another user's stored file
--   F5  signed-in users held TRUNCATE (which ignores RLS) on every table
--
-- *** WHAT THIS CHANGES FOR USERS: NOTHING THEY SHOULD NOTICE ***
--
-- Reads are untouched: both form views read only court_form_library, which anon
-- and authenticated may already read. Every write to the four workspace tables
-- already goes through server routes using the service role, which these grants
-- do not affect. The one visible change: the overlay mapper at
-- /admin/pdf-field-mapper saves only for an account listed in
-- public.site_operators — see F2 for the one line that adds yours.
--
-- *** EXISTING ROWS ***
--
-- The new ownership rules (F3, F4) are added NOT VALID, which enforces them on
-- every new or changed row immediately, then validated against existing rows.
-- If an existing row breaks a rule, validation is skipped with a NOTICE naming
-- the constraint rather than failing the migration — the rule still guards
-- every write from now on, and the NOTICE tells you which old rows to look at.
--
-- Requires PostgreSQL 15+ (security_invoker views, ON DELETE SET NULL (col)).
-- Take a backup before applying to production: CLAUDE.md §6.
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- F1 — views run as the caller, and no client can write through them
-- ---------------------------------------------------------------------------
-- A view runs with its OWNER's rights unless it is security_invoker. These are
-- owned by postgres, which owns the tables beneath, so RLS did not apply to
-- anything read or written through them. family_form_lookup is a plain filtered
-- SELECT, so Postgres made it writable, and authenticated still held GRANT ALL.

ALTER VIEW "public"."family_form_lookup"     SET (security_invoker = true);
ALTER VIEW "public"."court_form_master_view" SET (security_invoker = true);
ALTER VIEW "public"."court_form_clean_view"  SET (security_invoker = true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE "public"."family_form_lookup", "public"."court_form_master_view", "public"."court_form_clean_view"
  FROM "anon", "authenticated";

-- ---------------------------------------------------------------------------
-- F2 — only a named operator may edit the overlay map
-- ---------------------------------------------------------------------------
-- 20260915120000 let every signed-in account write pdf_overlay_fields so the
-- mapper page could save, on the reasoning that there is one operator. But
-- "signed in" is every person who registers, and generate-form reads these rows
-- to decide where each answer is printed on a court form.
--
-- The operator list lives in the database so the database can enforce it: no
-- client role can read or change it, and the policy asks is_site_operator().
--
-- TO MAKE YOURSELF THE OPERATOR, run once in the Supabase SQL editor of each
-- project, with the email you sign in to the site with:
--
--   INSERT INTO public.site_operators (user_id)
--   SELECT id FROM auth.users WHERE email = 'you@example.com'
--   ON CONFLICT DO NOTHING;
--
-- Until then nobody can edit the overlay map from the browser, which is the safe
-- default: reads, and form generation, are unaffected.

CREATE TABLE IF NOT EXISTS "public"."site_operators" (
    "user_id" "uuid" NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "site_operators_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "site_operators_user_fk"
        FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."site_operators" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."site_operators" FROM "anon", "authenticated";
GRANT ALL ON TABLE "public"."site_operators" TO "service_role";

-- SECURITY DEFINER so it can read site_operators, which the caller cannot. It
-- answers one question about the caller only, takes no arguments, and pins its
-- search_path, so it cannot be steered at anything else.
CREATE OR REPLACE FUNCTION "public"."is_site_operator"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" = ''
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.site_operators WHERE user_id = (SELECT auth.uid())
  );
$$;

ALTER FUNCTION "public"."is_site_operator"() OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."is_site_operator"() FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."is_site_operator"() TO "authenticated", "service_role";

DROP POLICY IF EXISTS "pdf_overlay_fields_write_authenticated" ON "public"."pdf_overlay_fields";
DROP POLICY IF EXISTS "pdf_overlay_fields_insert_operator" ON "public"."pdf_overlay_fields";
DROP POLICY IF EXISTS "pdf_overlay_fields_update_operator" ON "public"."pdf_overlay_fields";
DROP POLICY IF EXISTS "pdf_overlay_fields_delete_operator" ON "public"."pdf_overlay_fields";

CREATE POLICY "pdf_overlay_fields_insert_operator" ON "public"."pdf_overlay_fields"
    FOR INSERT TO "authenticated" WITH CHECK ((SELECT "public"."is_site_operator"()));
CREATE POLICY "pdf_overlay_fields_update_operator" ON "public"."pdf_overlay_fields"
    FOR UPDATE TO "authenticated" USING ((SELECT "public"."is_site_operator"()))
    WITH CHECK ((SELECT "public"."is_site_operator"()));
CREATE POLICY "pdf_overlay_fields_delete_operator" ON "public"."pdf_overlay_fields"
    FOR DELETE TO "authenticated" USING ((SELECT "public"."is_site_operator"()));

-- ---------------------------------------------------------------------------
-- F3 — a row's parent must belong to the row's owner
-- ---------------------------------------------------------------------------
-- The policies check user_id = auth.uid(); the foreign keys checked only that
-- the case existed. So a user could write a row in their own name under
-- somebody else's case. Harmless while every read is scoped by user_id, which it
-- is today; not harmless the day a shared, two-party case space reads by case.
--
-- A composite foreign key makes Postgres itself refuse it, for every role,
-- including the service role. The existing single-column keys stay.

-- The (id, user_id) keys the composite foreign keys point at. Added only if
-- missing: once the foreign keys exist they depend on these, so re-running this
-- file must leave them alone rather than drop and re-add them.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cases', 'workspace_documents', 'case_documents', 'case_events'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = format('public.%I', t)::regclass AND conname = t || '_id_user_id_key'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (id, user_id)', t, t || '_id_user_id_key');
    END IF;
  END LOOP;
END
$$;

DO $$
DECLARE
  spec record;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      -- table, constraint, child columns, parent, parent columns, on delete
      ('case_intakes',                    'case_intakes_case_owner_fk',                    '"case_id", "user_id"', 'cases',               '"id", "user_id"', 'CASCADE'),
      ('case_documents',                  'case_documents_case_owner_fk',                  '"case_id", "user_id"', 'cases',               '"id", "user_id"', 'CASCADE'),
      ('case_evidence',                   'case_evidence_case_owner_fk',                   '"case_id", "user_id"', 'cases',               '"id", "user_id"', 'CASCADE'),
      ('case_generated_documents',        'case_generated_documents_case_owner_fk',        '"case_id", "user_id"', 'cases',               '"id", "user_id"', 'CASCADE'),
      ('case_events',                     'case_events_case_owner_fk',                     '"case_id", "user_id"', 'cases',               '"id", "user_id"', 'CASCADE'),
      ('case_events',                     'case_events_related_document_owner_fk',         '"related_document_id", "user_id"', 'case_documents', '"id", "user_id"', 'SET NULL ("related_document_id")'),
      ('case_events',                     'case_events_supersedes_owner_fk',               '"supersedes_event_id", "user_id"', 'case_events',    '"id", "user_id"', 'RESTRICT'),
      ('case_event_candidate_dismissals', 'case_event_candidate_dismissals_case_owner_fk', '"case_id", "user_id"', 'cases',               '"id", "user_id"', 'CASCADE'),
      ('workspace_documents',             'workspace_documents_case_owner_fk',             '"case_id", "user_id"', 'cases',               '"id", "user_id"', 'CASCADE'),
      ('workspace_document_text',         'workspace_document_text_document_owner_fk',     '"document_id", "user_id"', 'workspace_documents', '"id", "user_id"', 'CASCADE'),
      ('workspace_timeline_events',       'workspace_timeline_events_case_owner_fk',       '"case_id", "user_id"', 'cases',               '"id", "user_id"', 'CASCADE'),
      ('workspace_timeline_events',       'workspace_timeline_events_document_owner_fk',   '"document_id", "user_id"', 'workspace_documents', '"id", "user_id"', 'SET NULL ("document_id")'),
      ('workspace_communications',        'workspace_communications_case_owner_fk',        '"case_id", "user_id"', 'cases',               '"id", "user_id"', 'CASCADE'),
      ('workspace_communications',        'workspace_communications_document_owner_fk',    '"document_id", "user_id"', 'workspace_documents', '"id", "user_id"', 'SET NULL ("document_id")')
    ) AS t(tbl, con, cols, parent, pcols, on_delete)
  LOOP
    -- A column a later migration removed simply has nothing to protect.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = spec.tbl
        AND column_name = trim(both '"' from split_part(spec.cols, ',', 1))
    ) THEN
      RAISE NOTICE 'skipped %: %.% does not exist', spec.con, spec.tbl, split_part(spec.cols, ',', 1);
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', spec.tbl, spec.con);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES public.%I (%s) ON DELETE %s NOT VALID',
      spec.tbl, spec.con, spec.cols, spec.parent, spec.pcols, spec.on_delete);
    BEGIN
      EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', spec.tbl, spec.con);
    EXCEPTION WHEN foreign_key_violation THEN
      RAISE NOTICE 'NOT VALIDATED: % — some existing rows in % point at a parent owned by someone else. New writes are enforced; review the old rows.', spec.con, spec.tbl;
    END;
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- F4 — a document row can only name a file in its owner's own folder
-- ---------------------------------------------------------------------------
-- The export, exhibit-book and extract routes sign or download whatever
-- storage_path the caller's row holds, with the service role. The upload route
-- always builds `{user_id}/{case_id}/{document_id}`, but the row itself was
-- writable through the API, so the path was whatever the caller said it was.
--
-- Two layers. The constraint binds every writer, the service role included. And
-- signed-in users lose direct write on the four workspace tables, because every
-- write already goes through a server route; they keep SELECT.

ALTER TABLE "public"."workspace_documents"
    DROP CONSTRAINT IF EXISTS "workspace_documents_storage_path_owner_check";
ALTER TABLE "public"."workspace_documents"
    ADD CONSTRAINT "workspace_documents_storage_path_owner_check" CHECK (
        split_part("storage_path", '/', 1) = "user_id"::text
        AND split_part("storage_path", '/', 2) = "case_id"::text
        AND split_part("storage_path", '/', 3) <> ''
        AND position('..' in "storage_path") = 0
    ) NOT VALID;

DO $$
BEGIN
  ALTER TABLE "public"."workspace_documents" VALIDATE CONSTRAINT "workspace_documents_storage_path_owner_check";
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'NOT VALIDATED: workspace_documents_storage_path_owner_check — some existing rows name a path outside their owner''s folder. New writes are enforced; review the old rows.';
END
$$;

REVOKE INSERT, UPDATE, DELETE ON TABLE
    "public"."workspace_documents",
    "public"."workspace_document_text",
    "public"."workspace_timeline_events",
    "public"."workspace_communications"
  FROM "authenticated";

-- ---------------------------------------------------------------------------
-- F5 — no client role holds TRUNCATE, REFERENCES or TRIGGER
-- ---------------------------------------------------------------------------
-- TRUNCATE is not subject to RLS at all. Nothing exposes it to a client today,
-- but it came from the baseline's GRANT ALL and from default privileges, so every
-- new table would have received it too. REFERENCES and TRIGGER have no client use.

REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA "public" FROM "anon", "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public"
    REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM "anon", "authenticated";

COMMIT;
