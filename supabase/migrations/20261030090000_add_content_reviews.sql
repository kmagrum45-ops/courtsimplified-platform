-- Content reviews: an append-only, hash-chained record of every review of a
-- piece of content shown on the site (review lane, piece 2; site owner, 2026-10-29).
--
-- *** NOT APPLIED BY ANYTHING IN THIS REPOSITORY ***
--
-- CLAUDE.md section 6: the site owner applies it, staging
-- (icpvzwxyjsdgyqfkwycw) before production (fddlpnibovkkkgboabqb), through
-- scripts/db/applyMigrations.ts, after a backup. Nothing reads the table yet,
-- so the site works the same before and after it is applied.
--
-- *** WHAT THE OWNER ASKED FOR, AND WHERE EACH PART IS ENFORCED ***
--
--   Only site operators add rows.
--     The INSERT policy asks is_site_operator() (20261002090000), and the
--     BEFORE INSERT trigger asks it again and refuses everyone else -- the
--     service role and the table owner included, because the trigger does not
--     depend on RLS. Rows are written with the operator's own sign-in, never
--     the service key, so the database itself records who reviewed.
--
--   The database sets the date; it is never typed and never backdated.
--     reviewed_at is overwritten by the trigger with clock_timestamp(), read
--     after the chain lock is taken (see below), so a row's date is never
--     earlier than the row before it in the ordinary course. reviewer_id is
--     overwritten with auth.uid(). Neither column is in the INSERT grant, so a
--     client cannot even name them.
--
--   Rows are never edited or deleted.
--     No UPDATE or DELETE policy, no UPDATE/DELETE/TRUNCATE grant to anon,
--     authenticated or service_role, and triggers that raise on UPDATE, DELETE
--     and TRUNCATE for every role, the service role and table owner included.
--     The triggers are ENABLE ALWAYS, so session_replication_role = replica
--     does not silence them either.
--
--   Each row is chained to the one before.
--     row_hash = sha256 of a canonical serialisation of the row's fields plus
--     prev_row_hash, which is the previous row's row_hash. The first row's
--     prev_row_hash is 64 zeros. The trigger takes a transaction-scoped
--     advisory lock before reading the previous row, and assigns id itself
--     (previous id + 1) under that lock, so two concurrent inserts cannot both
--     chain onto the same row, and ids have no gaps: a missing id in the
--     outside copy is a deleted row.
--
--   A copy of the chain is kept outside the database.
--     Proposed, not built: docs/infra/content-review-ledger.md.
--
-- *** THE HONEST LIMIT ***
--
-- The database owner (the postgres role, or anyone with the dashboard) can
-- still drop or disable these triggers and rewrite rows; nothing inside a
-- database can stop its owner. What this migration does is make a rewrite
-- DETECTABLE: changing any field of any row changes its row_hash, which breaks
-- the next row's prev_row_hash, and the outside copy holds the hashes as they
-- were. Detectable, not impossible.
--
-- *** THE CANONICAL SERIALISATION (the outside verifier recomputes this) ***
--
--   'content_reviews.v1' || field || field || ... (no separators)
--   field = '~' for NULL, else octet_length(value) || ':' || value   (UTF-8)
--
-- in this order: id, item_id, item_hash, reviewer_id, reviewed_at,
-- source_ref, source_retrieved_at, source_sha256, quote_check, result,
-- before_text, after_text, note, prev_row_hash. Timestamps are written UTC to
-- the millisecond, 'YYYY-MM-DDTHH:MM:SS.mmmZ' (what JavaScript's toISOString
-- gives), and the trigger truncates both stored timestamps to the millisecond
-- so the stored value and the hashed value are the same instant. Length
-- prefixes make the encoding unambiguous without escaping anything.
-- row_hash = lower-case hex sha256 of that string's UTF-8 bytes.
--
-- *** "NEEDS REVIEW" IS COMPUTED, NEVER STORED ***
--
-- item_hash is the sha256 (hex, UTF-8) of before_text -- the exact text the
-- reviewer read -- and the trigger computes it; a client-supplied value that
-- disagrees is refused. after_hash is the same for after_text. An item is
-- reviewed when some row has result 'approved' and item_hash = sha256 of the
-- item's current text, or result 'changed' and after_hash = sha256 of its
-- current text. Anything else needs review, including text edited after its
-- review. 'removed' records that the reviewer took an item out; it never
-- makes an item reviewed.
--
-- *** WHO READS IT ***
--
-- Site operators (SELECT policy) and the server (service_role, SELECT only).
-- The public site does not read it: content is served from the code
-- catalogues by the server, which can read reviews with the service role. So
-- no view or function exposes any of it to anon or ordinary users, and
-- reviewer ids and notes stay with operators.
--
-- Concurrency note: the chain lock relies on READ COMMITTED, where each query
-- in the trigger sees rows committed before it ran. Under REPEATABLE READ or
-- SERIALIZABLE the trigger could read a stale "previous row", so it refuses
-- to run at those levels.

-- ---------------------------------------------------------------------------
-- The table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."content_reviews" (
    -- Position in the chain, assigned by the trigger under the chain lock.
    "id" bigint NOT NULL,
    "item_id" text NOT NULL,
    "item_hash" text NOT NULL,
    "reviewer_id" uuid NOT NULL DEFAULT "auth"."uid"(),
    "reviewed_at" timestamp with time zone NOT NULL DEFAULT "now"(),
    "source_ref" text,
    "source_retrieved_at" timestamp with time zone,
    "source_sha256" text,
    "quote_check" text NOT NULL,
    "result" text NOT NULL,
    "before_text" text NOT NULL,
    "after_text" text,
    "after_hash" text,
    "note" text,
    "prev_row_hash" text NOT NULL,
    "row_hash" text NOT NULL,
    CONSTRAINT "content_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "content_reviews_id_positive" CHECK ("id" >= 1),
    CONSTRAINT "content_reviews_row_hash_key" UNIQUE ("row_hash"),
    CONSTRAINT "content_reviews_prev_row_hash_key" UNIQUE ("prev_row_hash"),
    CONSTRAINT "content_reviews_item_id_shape" CHECK (char_length("item_id") BETWEEN 1 AND 300),
    CONSTRAINT "content_reviews_item_hash_hex" CHECK ("item_hash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "content_reviews_after_hash_hex" CHECK ("after_hash" IS NULL OR "after_hash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "content_reviews_source_sha256_hex" CHECK ("source_sha256" IS NULL OR "source_sha256" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "content_reviews_prev_row_hash_hex" CHECK ("prev_row_hash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "content_reviews_row_hash_hex" CHECK ("row_hash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "content_reviews_source_ref_size" CHECK ("source_ref" IS NULL OR char_length("source_ref") BETWEEN 1 AND 2000),
    CONSTRAINT "content_reviews_quote_check_values" CHECK ("quote_check" IN ('match', 'match-elided', 'no-match', 'no-quote')),
    CONSTRAINT "content_reviews_result_values" CHECK ("result" IN ('approved', 'changed', 'removed')),
    CONSTRAINT "content_reviews_before_text_size" CHECK (char_length("before_text") BETWEEN 1 AND 100000),
    -- 'changed' carries the new wording, which must differ; nothing else does.
    CONSTRAINT "content_reviews_after_text_iff_changed" CHECK (
        ("result" = 'changed' AND "after_text" IS NOT NULL AND "after_text" <> "before_text"
            AND char_length("after_text") BETWEEN 1 AND 100000)
        OR ("result" <> 'changed' AND "after_text" IS NULL)
    ),
    CONSTRAINT "content_reviews_after_hash_iff_after_text" CHECK (("after_text" IS NULL) = ("after_hash" IS NULL)),
    CONSTRAINT "content_reviews_note_size" CHECK ("note" IS NULL OR char_length("note") <= 4000)
);

-- No foreign key from reviewer_id to auth.users, on purpose: ON DELETE CASCADE
-- would try to delete history (and the trigger would then block deleting the
-- account), and the record of who reviewed must outlive the account.

CREATE INDEX IF NOT EXISTS "content_reviews_item_hash_idx" ON "public"."content_reviews" ("item_hash");
CREATE INDEX IF NOT EXISTS "content_reviews_after_hash_idx" ON "public"."content_reviews" ("after_hash") WHERE "after_hash" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "content_reviews_item_id_idx" ON "public"."content_reviews" ("item_id");

-- ---------------------------------------------------------------------------
-- Access: operators insert and read; the server reads; nobody changes
-- ---------------------------------------------------------------------------

ALTER TABLE "public"."content_reviews" ENABLE ROW LEVEL SECURITY;

-- Supabase's default privileges grant every new table to anon, authenticated
-- and service_role; take all of it back first, then grant only what is needed.
REVOKE ALL ON TABLE "public"."content_reviews" FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "public"."content_reviews" FROM "anon", "authenticated", "service_role";

-- Only the columns a reviewer supplies. id, reviewer_id, reviewed_at,
-- after_hash, prev_row_hash and row_hash are the database's to set.
GRANT INSERT ("item_id", "item_hash", "source_ref", "source_retrieved_at", "source_sha256",
              "quote_check", "result", "before_text", "after_text", "note")
    ON TABLE "public"."content_reviews" TO "authenticated";
GRANT SELECT ON TABLE "public"."content_reviews" TO "authenticated";
GRANT SELECT ON TABLE "public"."content_reviews" TO "service_role";

DROP POLICY IF EXISTS "content_reviews_insert_operator" ON "public"."content_reviews";
DROP POLICY IF EXISTS "content_reviews_select_operator" ON "public"."content_reviews";

CREATE POLICY "content_reviews_insert_operator" ON "public"."content_reviews"
    FOR INSERT TO "authenticated" WITH CHECK ((SELECT "public"."is_site_operator"()));
CREATE POLICY "content_reviews_select_operator" ON "public"."content_reviews"
    FOR SELECT TO "authenticated" USING ((SELECT "public"."is_site_operator"()));
-- No UPDATE policy and no DELETE policy: with RLS on, none means none.

-- ---------------------------------------------------------------------------
-- The chain: one trigger sets every field the database owns
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER so reading the previous row does not depend on the caller's
-- SELECT policy (a narrower policy one day must not fork the chain). Pinned
-- search_path, no arguments, callable only as a trigger: EXECUTE is revoked
-- from every client role below, and a trigger function's EXECUTE right is not
-- checked when the trigger fires.
CREATE OR REPLACE FUNCTION "public"."content_reviews_before_insert"() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET "search_path" = ''
    AS $$
DECLARE
  prev record;
  supplied_hash text := NEW.item_hash;
  ts_format constant text := 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"';
  canonical text;
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'content_reviews: insert under READ COMMITTED only (the chain lock depends on it)'
      USING ERRCODE = '25001';
  END IF;

  IF auth.uid() IS NULL OR NOT public.is_site_operator() THEN
    RAISE EXCEPTION 'content_reviews: only a signed-in site operator can add a review'
      USING ERRCODE = '42501';
  END IF;

  -- Serialise every insert into this table until its transaction ends. The
  -- key is fixed; 0x636f6e74656e7472 is 'contentr' in ASCII.
  PERFORM pg_advisory_xact_lock(7165066978366747762);

  SELECT r.id, r.row_hash INTO prev
    FROM public.content_reviews r
    ORDER BY r.id DESC
    LIMIT 1;

  NEW.id := coalesce(prev.id, 0) + 1;
  NEW.prev_row_hash := coalesce(prev.row_hash, repeat('0', 64));
  NEW.reviewer_id := auth.uid();
  NEW.reviewed_at := date_trunc('milliseconds', clock_timestamp());
  NEW.source_retrieved_at := date_trunc('milliseconds', NEW.source_retrieved_at);

  NEW.item_hash := encode(sha256(convert_to(NEW.before_text, 'UTF8')), 'hex');
  IF supplied_hash IS NOT NULL AND supplied_hash <> NEW.item_hash THEN
    RAISE EXCEPTION 'content_reviews: item_hash is not the sha256 of before_text'
      USING ERRCODE = '22000';
  END IF;
  NEW.after_hash := CASE WHEN NEW.after_text IS NULL THEN NULL
                         ELSE encode(sha256(convert_to(NEW.after_text, 'UTF8')), 'hex') END;

  canonical := 'content_reviews.v1'
    || public.content_reviews_field(NEW.id::text)
    || public.content_reviews_field(NEW.item_id)
    || public.content_reviews_field(NEW.item_hash)
    || public.content_reviews_field(NEW.reviewer_id::text)
    || public.content_reviews_field(to_char(NEW.reviewed_at AT TIME ZONE 'UTC', ts_format))
    || public.content_reviews_field(NEW.source_ref)
    || public.content_reviews_field(to_char(NEW.source_retrieved_at AT TIME ZONE 'UTC', ts_format))
    || public.content_reviews_field(NEW.source_sha256)
    || public.content_reviews_field(NEW.quote_check)
    || public.content_reviews_field(NEW.result)
    || public.content_reviews_field(NEW.before_text)
    || public.content_reviews_field(NEW.after_text)
    || public.content_reviews_field(NEW.note)
    || public.content_reviews_field(NEW.prev_row_hash);

  NEW.row_hash := encode(sha256(convert_to(canonical, 'UTF8')), 'hex');
  RETURN NEW;
END
$$;

-- One field of the canonical serialisation: '~' for NULL, else byte length ':' value.
-- Created before it is first called (plpgsql resolves at run time).
CREATE OR REPLACE FUNCTION "public"."content_reviews_field"("value" text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET "search_path" = ''
    AS $$
  SELECT CASE WHEN value IS NULL THEN '~'
              ELSE octet_length(value)::text || ':' || value END;
$$;

CREATE OR REPLACE FUNCTION "public"."content_reviews_refuse_change"() RETURNS trigger
    LANGUAGE plpgsql
    SET "search_path" = ''
    AS $$
BEGIN
  RAISE EXCEPTION 'content_reviews is append-only: % refused', TG_OP
    USING ERRCODE = '42501';
END
$$;

ALTER FUNCTION "public"."content_reviews_before_insert"() OWNER TO "postgres";
ALTER FUNCTION "public"."content_reviews_field"(text) OWNER TO "postgres";
ALTER FUNCTION "public"."content_reviews_refuse_change"() OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."content_reviews_before_insert"() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public"."content_reviews_refuse_change"() FROM PUBLIC, "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public"."content_reviews_field"(text) FROM PUBLIC, "anon", "authenticated", "service_role";

DROP TRIGGER IF EXISTS "content_reviews_before_insert" ON "public"."content_reviews";
DROP TRIGGER IF EXISTS "content_reviews_refuse_update_delete" ON "public"."content_reviews";
DROP TRIGGER IF EXISTS "content_reviews_refuse_truncate" ON "public"."content_reviews";

CREATE TRIGGER "content_reviews_before_insert"
    BEFORE INSERT ON "public"."content_reviews"
    FOR EACH ROW EXECUTE FUNCTION "public"."content_reviews_before_insert"();

-- Row triggers do not fire on TRUNCATE, so it has its own statement trigger.
CREATE TRIGGER "content_reviews_refuse_update_delete"
    BEFORE UPDATE OR DELETE ON "public"."content_reviews"
    FOR EACH ROW EXECUTE FUNCTION "public"."content_reviews_refuse_change"();
CREATE TRIGGER "content_reviews_refuse_truncate"
    BEFORE TRUNCATE ON "public"."content_reviews"
    FOR EACH STATEMENT EXECUTE FUNCTION "public"."content_reviews_refuse_change"();

-- Fire even under session_replication_role = replica.
ALTER TABLE "public"."content_reviews" ENABLE ALWAYS TRIGGER "content_reviews_before_insert";
ALTER TABLE "public"."content_reviews" ENABLE ALWAYS TRIGGER "content_reviews_refuse_update_delete";
ALTER TABLE "public"."content_reviews" ENABLE ALWAYS TRIGGER "content_reviews_refuse_truncate";
