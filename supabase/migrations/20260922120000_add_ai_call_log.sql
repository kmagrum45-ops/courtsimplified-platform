-- ai_call_log — the AI audit trail the LSO A2I policy requires.
--
-- *** NOT APPLIED. BY ANYONE. TO ANYTHING. ***
--
-- This file has been written and syntax-checked, and has been run against no
-- database, local or remote. Docker is not installed on this machine, so
-- `supabase start` could not stand up a local Postgres to execute it against;
-- the validation that WAS done is recorded in docs/lso-fixes-report.md. The
-- licensee applies it after review.
--
-- A NOTE ON WHICH PROJECT THAT IS, because the names are backwards and the
-- mistake this invites is applying an audit-log migration to the wrong one:
--
--   fddlpnibovkkkgboabqb  named "courtsimplified-dev"  ca-central-1  <- LIVE
--   ffymjxjcnwakgdmldpne  named "courtsimplified"      us-west-2     <- dormant, paused
--
-- The project named "dev" is the one real users are on. See the report's
-- recommendation that a genuine staging project be created so that sentence
-- stops needing to be written.
--
--
-- WHAT THIS TABLE IS FOR
--
-- The A2I framework requires a licensee to supervise the AI they deploy. You
-- cannot supervise what you cannot see, and until now every model call in this
-- system was invisible the moment it returned: `store: false` is forced on the
-- OpenAI side (openaiClient.ts, and deliberately so — user narratives must not
-- sit in a vendor's logs), which means OpenAI keeps no record we can review,
-- and we kept none either. The privacy decision and the supervision
-- requirement pointed in opposite directions and privacy won by default.
--
-- This table resolves that without reversing the privacy decision. It records
-- what the model was ASKED FOR and what it RETURNED, and not what the user
-- wrote.
--
--
-- DECISION 1: THE USER'S NARRATIVE IS NOT STORED HERE. NOT EVER.
--
-- There is no prompt column and no input_text column, and their absence is the
-- design. The input to these calls is a person's account of their own legal
-- problem — the most sensitive thing the platform touches. Copying it into a
-- second table so that it can be audited would create a new retention surface
-- in the name of oversight, and would be a worse privacy position than the one
-- that exists today.
--
-- What is stored instead is input_sha256 and input_chars. That is enough to
-- answer the questions an audit actually asks — "is this the same input that
-- produced that output", "did the same text get classified two different ways",
-- "how long were the inputs we were failing on" — without holding the text.
--
-- The cost is real and should be stated rather than glossed: you cannot read
-- this log and reconstruct what a user said. If a complaint requires that, it
-- requires the user, who has their own case file.
--
--
-- DECISION 2: THE OUTPUT *IS* STORED, IN FULL, AS JSONB.
--
-- Every user-facing model call in this system now returns structured output
-- under a JSON schema: a classification label, a stage code, a content id, a
-- boolean. That is the whole point of the LSO rewrite — the model selects, it
-- does not write. So structured_output is small, it is non-legal by
-- construction, and it is exactly the thing a reviewer needs to see.
--
-- If a row ever appears here with prose in structured_output, that is not an
-- audit-log problem. That is the finding.
--
--
-- DECISION 3: SERVICE ROLE ONLY. NO POLICIES, AND NO ADMIN ROLE INVENTED.
--
-- RLS is enabled and NO policy is created. That is not an oversight — with RLS
-- on and no policy, `anon` and `authenticated` can read nothing and write
-- nothing, and only the service role (which bypasses RLS) can touch it. The
-- server writes with the service key; a reviewer reads with the reporting
-- script in scripts/compliance/, which also uses it.
--
-- The brief asked for "admin-only". This codebase has no admin role — the
-- one admin page (app/admin/pdf-field-mapper) gates on "is there a session at
-- all", and its own header explains why: a role system for a single user is
-- more machinery than the problem has. Inventing an is_admin column here to
-- satisfy the word "admin" would produce a role that one table uses and
-- nothing else understands. Service-role-only is the same access in practice
-- and does not leave a half-built permission system behind.
--
-- Users cannot read their own rows either. This is a supervision record, not a
-- user-facing history, and a per-user SELECT policy would make every future
-- column a disclosure decision.
--
--
-- DECISION 4: APPEND-ONLY. NO updated_at, NO UPDATE PATH.
--
-- Same reasoning as case_events: an updated_at on an audit table is an
-- invitation to UPDATE, and an audit record that can be edited is not one.
-- Deletion happens only through prune_ai_call_log() below.

BEGIN;

CREATE TABLE IF NOT EXISTS "public"."ai_call_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,

    -- Both nullable. A model call happens before sign-in on the home gate (the
    -- court-path classifier) and before a case exists (the safety pass on the
    -- opening story). NOT NULL here would force a sentinel value, and a
    -- sentinel in an audit log is a lie with a foreign key.
    --
    -- No FK to auth.users: this row must outlive the account. A deleted user's
    -- audit trail is precisely what a complaint six months later needs, and
    -- ON DELETE CASCADE would erase it at the moment it mattered. ON DELETE SET
    -- NULL would keep the row but silently detach it from every other row of
    -- the same session, which is worse than an id pointing at nothing.
    "user_id" "uuid",
    "case_id" "uuid",

    -- Which call site. Matches the AiCallType union in src/lib/audit/aiCallLog.ts;
    -- the CHECK is below so that a new call site cannot log itself under a name
    -- the reporting script does not know about.
    "call_type" "text" NOT NULL,

    "model" "text" NOT NULL,

    -- Identifies the prompt text that produced this row. Derived from the
    -- prompt itself, not hand-maintained — a hand-maintained version number is
    -- a number someone forgets to bump, and a prompt version that lies is worse
    -- than no prompt version.
    "prompt_version" "text" NOT NULL,

    -- Decision 1. The input, described, never held.
    "input_sha256" "text" NOT NULL,
    "input_chars" integer NOT NULL,

    -- Decision 2. NULL when the call failed before returning anything.
    "structured_output" "jsonb",

    -- Did the returned JSON satisfy the schema the caller required?
    --   'valid'    parsed, validated, used
    --   'invalid'  returned, but failed validation -- the caller fell back
    --   'error'    the call threw
    --   'timeout'  the abort ceiling fired
    "validation_result" "text" NOT NULL,
    "validation_detail" "text",

    -- Hoisted out of structured_output because it is the column a reviewer
    -- filters on. "Show me every time someone asked us for legal advice" is the
    -- first question the A2I framework makes you able to answer, and it should
    -- not require a JSON path. NULL for call types that do not set it.
    "requests_legal_advice" boolean,

    -- How many strings the output guard refused to show a user on this call.
    -- Nonzero is a signal worth reading: either content is unreviewed, or
    -- something tried to render text that is not in the library.
    "output_guard_blocked" integer DEFAULT 0 NOT NULL,

    "latency_ms" integer NOT NULL
);

ALTER TABLE "public"."ai_call_log" OWNER TO "postgres";

ALTER TABLE "public"."ai_call_log"
    ADD CONSTRAINT "ai_call_log_pkey" PRIMARY KEY ("id");

ALTER TABLE "public"."ai_call_log"
    ADD CONSTRAINT "ai_call_log_call_type_check" CHECK ("call_type" IN (
        'safety-pass',
        'court-path-classifier',
        'extract-intake-facts',
        'extract-intake-facts-confidence',
        'claim-type-classifier',
        'small-claims-analysis'
    ));

ALTER TABLE "public"."ai_call_log"
    ADD CONSTRAINT "ai_call_log_validation_result_check" CHECK ("validation_result" IN (
        'valid',
        'invalid',
        'error',
        'timeout'
    ));

ALTER TABLE "public"."ai_call_log"
    ADD CONSTRAINT "ai_call_log_input_chars_check" CHECK ("input_chars" >= 0);

ALTER TABLE "public"."ai_call_log"
    ADD CONSTRAINT "ai_call_log_latency_ms_check" CHECK ("latency_ms" >= 0);

-- The quarterly report reads a date range, grouped by call type. The retention
-- prune reads a date range. Both are this index.
CREATE INDEX "ai_call_log_created_at_idx"
    ON "public"."ai_call_log" USING "btree" ("created_at" DESC);

CREATE INDEX "ai_call_log_call_type_created_at_idx"
    ON "public"."ai_call_log" USING "btree" ("call_type", "created_at" DESC);

-- Partial, because the rows worth finding fast are the rare ones. A full index
-- on a boolean that is false almost always is an index on nothing.
CREATE INDEX "ai_call_log_legal_advice_idx"
    ON "public"."ai_call_log" USING "btree" ("created_at" DESC)
    WHERE "requests_legal_advice" IS TRUE;

CREATE INDEX "ai_call_log_failures_idx"
    ON "public"."ai_call_log" USING "btree" ("created_at" DESC)
    WHERE "validation_result" <> 'valid';

-- Decision 3. Enabled with no policy: nothing but the service role sees this.
ALTER TABLE "public"."ai_call_log" ENABLE ROW LEVEL SECURITY;

-- Belt as well as braces. RLS already blocks these roles, but a future policy
-- written by someone who has not read Decision 3 would silently become
-- effective; without the grant it still cannot.
REVOKE ALL ON TABLE "public"."ai_call_log" FROM "anon";
REVOKE ALL ON TABLE "public"."ai_call_log" FROM "authenticated";
GRANT ALL ON TABLE "public"."ai_call_log" TO "service_role";


-- =====================================================================
-- Retention
-- =====================================================================
--
-- Twelve months by default, and the number is an argument rather than a
-- constant so that changing it is a call, not a migration.
--
-- NOT SCHEDULED HERE. pg_cron is not enabled on this project and enabling an
-- extension is a licensee decision, not a side effect of adding a table. The
-- function is the mechanism; scheduling it is a separate, deliberate step, and
-- the report says so. Until then it is run by hand or by the reporting script,
-- and a log that grows is a recoverable problem in a way that a log that
-- quietly deleted itself early is not.
--
-- Returns the number of rows removed so that a caller can log what it did.

CREATE OR REPLACE FUNCTION "public"."prune_ai_call_log"("retention_months" integer DEFAULT 12)
RETURNS integer
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = "public", "pg_temp"
AS $$
DECLARE
    removed integer;
BEGIN
    IF retention_months IS NULL OR retention_months < 1 THEN
        RAISE EXCEPTION 'retention_months must be at least 1, got %', retention_months;
    END IF;

    DELETE FROM "public"."ai_call_log"
    WHERE "created_at" < "now"() - ("retention_months" * INTERVAL '1 month');

    GET DIAGNOSTICS removed = ROW_COUNT;
    RETURN removed;
END;
$$;

ALTER FUNCTION "public"."prune_ai_call_log"(integer) OWNER TO "postgres";

-- SECURITY DEFINER means this function runs as its owner, so execute rights are
-- the whole access-control story for it. Only the service role gets them.
REVOKE ALL ON FUNCTION "public"."prune_ai_call_log"(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."prune_ai_call_log"(integer) FROM "anon";
REVOKE ALL ON FUNCTION "public"."prune_ai_call_log"(integer) FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."prune_ai_call_log"(integer) TO "service_role";

COMMIT;
