-- Per-visitor limits on the AI routes that need no sign-in, a daily ceiling on
-- them, and a built-in error log (2026-10-14 audit; MASTER_PLAN build order 6C).
--
-- WHY. The front door and several intake routes call the model before anyone
-- signs in. Nothing limited how often: the site password was the only
-- protection against someone running up the OpenAI bill, and server errors went
-- only to Vercel's console, where nobody sees them unless they go looking.
--
-- WHAT. Two server-only tables (RLS on, no policies, no client grants;
-- rlsManifest.mjs serverOnly), the same pattern as canlii_api_state:
--
--   ai_rate_limits  one row per (bucket, window start). A bucket is a hashed
--                   visitor id plus the route group, or "global:<day>" for the
--                   daily ceiling. No IP address is stored, only a salted hash.
--   server_errors   one row per server error: route, method, a short message
--                   and digest, the time. No request body, no story text, no
--                   names: the error message is cut to 500 characters and
--                   scrubbed of email addresses and long digit runs in code.
--
-- ai_rate_limit_take() counts a hit and says whether it is allowed, in one
-- statement, so two server instances can never both pass the last slot.
--
-- SAFE BEFORE AND AFTER. The code treats a missing table or function as
-- "no shared limit yet" and keeps an in-memory limit per server instance, so
-- the site works the same whether or not this has been applied. Old rows are
-- removed by ai_rate_limits_prune(), which the limiter calls now and then.

CREATE TABLE IF NOT EXISTS "public"."ai_rate_limits" (
    "bucket" "text" NOT NULL,
    "window_start" timestamp with time zone NOT NULL,
    "hits" integer NOT NULL DEFAULT 0,
    PRIMARY KEY ("bucket", "window_start")
);

ALTER TABLE "public"."ai_rate_limits" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."ai_rate_limits" FROM "anon", "authenticated";
GRANT ALL ON TABLE "public"."ai_rate_limits" TO "service_role";

-- Adds `cost` hits to the bucket's current window and returns true when the
-- total is still within `max_hits`. A refused hit is not counted, so a visitor
-- who waits gets their allowance back when the window turns over.
CREATE OR REPLACE FUNCTION "public"."ai_rate_limit_take"("p_bucket" "text", "p_window_seconds" integer, "p_max_hits" integer, "p_cost" integer)
RETURNS boolean
LANGUAGE "plpgsql"
SET "search_path" TO 'public'
AS $$
DECLARE
    win timestamp with time zone := to_timestamp(floor(extract(epoch FROM clock_timestamp()) / p_window_seconds) * p_window_seconds);
    taken integer;
BEGIN
    INSERT INTO "public"."ai_rate_limits" ("bucket", "window_start", "hits")
    VALUES (p_bucket, win, 0)
    ON CONFLICT ("bucket", "window_start") DO NOTHING;
    UPDATE "public"."ai_rate_limits"
       SET "hits" = "hits" + p_cost
     WHERE "bucket" = p_bucket AND "window_start" = win AND "hits" + p_cost <= p_max_hits;
    GET DIAGNOSTICS taken = ROW_COUNT;
    RETURN taken = 1;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."ai_rate_limits_prune"()
RETURNS void
LANGUAGE "sql"
SET "search_path" TO 'public'
AS $$
    DELETE FROM "public"."ai_rate_limits" WHERE "window_start" < clock_timestamp() - interval '2 days';
$$;

REVOKE ALL ON FUNCTION "public"."ai_rate_limit_take"("text", integer, integer, integer) FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."ai_rate_limits_prune"() FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."ai_rate_limit_take"("text", integer, integer, integer) TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."ai_rate_limits_prune"() TO "service_role";

CREATE TABLE IF NOT EXISTS "public"."server_errors" (
    "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "occurred_at" timestamp with time zone NOT NULL DEFAULT now(),
    "route" "text",
    "method" "text",
    "kind" "text",
    "message" "text",
    "digest" "text",
    "environment" "text"
);

CREATE INDEX IF NOT EXISTS "server_errors_occurred_at_idx" ON "public"."server_errors" ("occurred_at" DESC);

ALTER TABLE "public"."server_errors" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."server_errors" FROM "anon", "authenticated";
GRANT ALL ON TABLE "public"."server_errors" TO "service_role";
