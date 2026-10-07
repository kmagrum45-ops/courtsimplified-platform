-- Court decisions a person uploads to their own case, and the CanLII API's
-- cache and rate-limit state (2026-10-07).
--
-- WHY. A person may download a decision from CanLII and keep it with their
-- case. CanLII's Terms of Use (2026) s. 4.2 allow that use provided CanLII is
-- identified as the source; s. 5.1 forbids masking the source, systematic
-- downloading, and use beyond the person's own legal research. So a decision
-- is an ordinary private upload (owner-only, like every workspace document)
-- with the details needed to show its attribution: the case name and citation
-- the person entered or confirmed. The source itself is always "CanLII" and is
-- written by code (courtDecision.ts), never stored as a value that could be
-- blanked.
--
-- The API is metadata only (titles, citations, courts, dates, the citator).
-- `canlii_cache` keeps every answer so a repeat lookup does not call CanLII
-- again. `canlii_api_state` is one row that every server instance must take a
-- short, token-held lease on before a call, so across ALL instances there is
-- at most one call at a time, at least 500 ms apart (2 a second), and a daily
-- cap well under CanLII's 5,000. `canlii_user_usage` gives each person a
-- daily allowance of lookups that reach CanLII. All three tables are
-- server-only: RLS on, no policies, no client grants (rlsManifest.mjs
-- serverOnly).
--
-- SAFE BEFORE AND AFTER. The site reads the new columns in a separate query
-- and ignores a failure (courtDecisionStore.ts), and the CanLII client treats
-- a missing table or function as "CanLII is off", so the site works the same
-- whether or not this has been applied.

-- 1. The document type ------------------------------------------------------
-- Redefines the CHECK last defined in 20260927090000_case_workspace_documents.sql,
-- with 'court-decision' added. documentTypes.ts must list the same values
-- (test:workspace-catalogue reads the latest migration that defines it).

ALTER TABLE "public"."workspace_documents"
    DROP CONSTRAINT IF EXISTS "workspace_documents_type_in_catalogue";

ALTER TABLE "public"."workspace_documents"
    ADD CONSTRAINT "workspace_documents_type_in_catalogue" CHECK (
        "user_type" IS NULL OR "user_type" = ANY (ARRAY[
            'contract-agreement',
            'invoice-receipt',
            'bank-or-transfer-record',
            'letter-demand-letter',
            'email-or-text-message',
            'photo-or-video',
            'court-form',
            'court-order-endorsement',
            'proof-of-service',
            'witness-statement',
            'estimate-quote',
            'insurance-document',
            'court-decision',
            'other'
        ]::"text"[])
    );

ALTER TABLE "public"."workspace_documents"
    ADD COLUMN IF NOT EXISTS "decision_case_name" "text",
    ADD COLUMN IF NOT EXISTS "decision_citation" "text",
    ADD COLUMN IF NOT EXISTS "decision_court" "text",
    ADD COLUMN IF NOT EXISTS "decision_date" "date";

ALTER TABLE "public"."workspace_documents"
    DROP CONSTRAINT IF EXISTS "workspace_documents_decision_fields_short";

ALTER TABLE "public"."workspace_documents"
    ADD CONSTRAINT "workspace_documents_decision_fields_short" CHECK (
        coalesce(length("decision_case_name"), 0) <= 300
        AND coalesce(length("decision_citation"), 0) <= 200
        AND coalesce(length("decision_court"), 0) <= 200
    );

-- 2. The CanLII API cache (metadata answers only) ----------------------------

CREATE TABLE IF NOT EXISTS "public"."canlii_cache" (
    "key" "text" PRIMARY KEY,
    "payload" "jsonb" NOT NULL,
    "fetched_at" timestamp with time zone NOT NULL DEFAULT "now"()
);

ALTER TABLE "public"."canlii_cache" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."canlii_cache" FROM "anon", "authenticated";
GRANT ALL ON TABLE "public"."canlii_cache" TO "service_role";

-- 3. The CanLII API rate-limit state: one row, one lease ----------------------
-- The row is created by canlii_acquire on first use rather than seeded here.

CREATE TABLE IF NOT EXISTS "public"."canlii_api_state" (
    "id" integer PRIMARY KEY CHECK ("id" = 1),
    "day" "date" NOT NULL DEFAULT CURRENT_DATE,
    "day_count" integer NOT NULL DEFAULT 0,
    "last_call_at" timestamp with time zone,
    "lease_token" "uuid",
    "lease_until" timestamp with time zone
);

ALTER TABLE "public"."canlii_api_state" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."canlii_api_state" FROM "anon", "authenticated";
GRANT ALL ON TABLE "public"."canlii_api_state" TO "service_role";

-- Takes the single lease when no call is in flight (or the last holder's lease
-- has run out), the last call began at least `min_gap_ms` ago, and today's
-- count is under `max_per_day`. One UPDATE, so two instances can never both
-- take it. Returns the lease token, or NULL when it was not taken.
CREATE OR REPLACE FUNCTION "public"."canlii_acquire"("max_per_day" integer, "min_gap_ms" integer, "lease_ms" integer)
RETURNS "uuid"
LANGUAGE "plpgsql"
SET "search_path" TO 'public'
AS $$
DECLARE
    token uuid := gen_random_uuid();
    taken integer;
BEGIN
    INSERT INTO "public"."canlii_api_state" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
    UPDATE "public"."canlii_api_state"
       SET "day_count" = CASE WHEN "day" = CURRENT_DATE THEN "day_count" + 1 ELSE 1 END,
           "day" = CURRENT_DATE,
           "last_call_at" = clock_timestamp(),
           "lease_token" = token,
           "lease_until" = clock_timestamp() + make_interval(secs => "lease_ms" / 1000.0)
     WHERE "id" = 1
       AND ("lease_until" IS NULL OR "lease_until" < clock_timestamp())
       AND ("last_call_at" IS NULL OR "last_call_at" <= clock_timestamp() - make_interval(secs => "min_gap_ms" / 1000.0))
       AND (CASE WHEN "day" = CURRENT_DATE THEN "day_count" ELSE 0 END) < "max_per_day";
    GET DIAGNOSTICS taken = ROW_COUNT;
    IF taken = 1 THEN
        RETURN token;
    END IF;
    RETURN NULL;
END;
$$;

-- Gives the lease back, only if this caller still holds it.
CREATE OR REPLACE FUNCTION "public"."canlii_release"("token" "uuid")
RETURNS void
LANGUAGE "sql"
SET "search_path" TO 'public'
AS $$
    UPDATE "public"."canlii_api_state"
       SET "lease_token" = NULL, "lease_until" = NULL
     WHERE "id" = 1 AND "lease_token" = "token";
$$;

REVOKE ALL ON FUNCTION "public"."canlii_acquire"(integer, integer, integer) FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."canlii_release"("uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."canlii_acquire"(integer, integer, integer) TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."canlii_release"("uuid") TO "service_role";

-- 3b. Each person's own daily allowance of lookups that reach CanLII ----------
-- Without it, one account could step through citations and spend the whole
-- day's cap (and use our key to harvest metadata, Terms s. 5.1). Lookups the
-- cache already answers are free and not counted (app/api/canlii/case).

CREATE TABLE IF NOT EXISTS "public"."canlii_user_usage" (
    "user_id" "uuid" NOT NULL,
    "day" "date" NOT NULL DEFAULT CURRENT_DATE,
    "lookups" integer NOT NULL DEFAULT 0,
    PRIMARY KEY ("user_id", "day")
);

ALTER TABLE "public"."canlii_user_usage" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."canlii_user_usage" FROM "anon", "authenticated";
GRANT ALL ON TABLE "public"."canlii_user_usage" TO "service_role";

-- Counts one lookup for this person today and says whether it is within
-- `max_per_day`. Atomic: the upsert takes the row lock.
CREATE OR REPLACE FUNCTION "public"."canlii_user_allow"("person" "uuid", "max_per_day" integer)
RETURNS boolean
LANGUAGE "plpgsql"
SET "search_path" TO 'public'
AS $$
DECLARE
    used integer;
BEGIN
    INSERT INTO "public"."canlii_user_usage" ("user_id", "day", "lookups")
    VALUES ("person", CURRENT_DATE, 1)
    ON CONFLICT ("user_id", "day") DO UPDATE
        SET "lookups" = "canlii_user_usage"."lookups" + 1
    RETURNING "lookups" INTO used;
    RETURN used <= "max_per_day";
END;
$$;

REVOKE ALL ON FUNCTION "public"."canlii_user_allow"("uuid", integer) FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."canlii_user_allow"("uuid", integer) TO "service_role";

-- 4. The audit log's call type for help with an uploaded decision --------------
-- Redefines the CHECK last defined in 20261004120000_ai_call_log_tidy_wording.sql,
-- with 'decision-help' added (aiCallLog.ts AiCallType; test:ai-call-logging).

ALTER TABLE "public"."ai_call_log"
    DROP CONSTRAINT IF EXISTS "ai_call_log_call_type_check";

ALTER TABLE "public"."ai_call_log"
    ADD CONSTRAINT "ai_call_log_call_type_check" CHECK ("call_type" IN (
        'safety-pass',
        'court-path-classifier',
        'extract-intake-facts',
        'extract-intake-facts-confidence',
        'claim-type-classifier',
        'small-claims-analysis',
        'stage-resolver',
        'library-chat',
        'propose-story-answers',
        'case-review',
        'tidy-wording',
        'decision-help'
    ));
