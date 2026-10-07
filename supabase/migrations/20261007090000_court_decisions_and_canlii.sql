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
-- shown by code, never stored as an editable value that could be blanked.
--
-- The API is metadata only (titles, citations, courts, dates, the citator).
-- `canlii_cache` keeps every answer so a repeat lookup does not call CanLII
-- again; `canlii_api_state` is the one row every server instance takes a
-- short lease on before a call, so across all instances there is at most one
-- call at a time, at least 500 ms apart, and a daily cap well under CanLII's
-- 5,000. Both tables are server-only: RLS on, no policies, no grants.

-- 1. The document type ------------------------------------------------------

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
    ADD CONSTRAINT "workspace_documents_decision_fields_short" CHECK (
        coalesce(length("decision_case_name"), 0) <= 300
        AND coalesce(length("decision_citation"), 0) <= 200
        AND coalesce(length("decision_court"), 0) <= 200
    );

-- 2. The CanLII API cache ------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."canlii_cache" (
    "key" "text" PRIMARY KEY,
    "payload" "jsonb" NOT NULL,
    "fetched_at" timestamp with time zone NOT NULL DEFAULT "now"()
);

ALTER TABLE "public"."canlii_cache" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."canlii_cache" FROM "anon", "authenticated";

-- 3. The CanLII API rate-limit state --------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."canlii_api_state" (
    "id" integer PRIMARY KEY CHECK ("id" = 1),
    "day" "date" NOT NULL DEFAULT CURRENT_DATE,
    "day_count" integer NOT NULL DEFAULT 0,
    "last_call_at" timestamp with time zone,
    "lease_until" timestamp with time zone
);

INSERT INTO "public"."canlii_api_state" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "public"."canlii_api_state" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."canlii_api_state" FROM "anon", "authenticated";

-- Takes the single lease if no call is in flight, the last call was at least
-- `min_gap_ms` ago, and today's count is under `max_per_day`. Atomic: one
-- UPDATE, so two instances can never both get it. Returns true when taken.
CREATE OR REPLACE FUNCTION "public"."canlii_acquire"("max_per_day" integer, "min_gap_ms" integer, "lease_ms" integer)
RETURNS boolean
LANGUAGE "plpgsql"
SET "search_path" TO 'public'
AS $$
DECLARE
    taken integer;
BEGIN
    UPDATE "public"."canlii_api_state"
       SET "day" = CURRENT_DATE,
           "day_count" = CASE WHEN "day" = CURRENT_DATE THEN "day_count" + 1 ELSE 1 END,
           "last_call_at" = "now"(),
           "lease_until" = "now"() + make_interval(secs => "lease_ms" / 1000.0)
     WHERE "id" = 1
       AND ("lease_until" IS NULL OR "lease_until" < "now"())
       AND ("last_call_at" IS NULL OR "last_call_at" <= "now"() - make_interval(secs => "min_gap_ms" / 1000.0))
       AND (CASE WHEN "day" = CURRENT_DATE THEN "day_count" ELSE 0 END) < "max_per_day";
    GET DIAGNOSTICS taken = ROW_COUNT;
    RETURN taken = 1;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."canlii_release"()
RETURNS void
LANGUAGE "sql"
SET "search_path" TO 'public'
AS $$
    UPDATE "public"."canlii_api_state" SET "lease_until" = NULL WHERE "id" = 1;
$$;

REVOKE ALL ON FUNCTION "public"."canlii_acquire"(integer, integer, integer) FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."canlii_release"() FROM PUBLIC, "anon", "authenticated";

-- 4. The audit log's call type for help with an uploaded decision --------------

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
