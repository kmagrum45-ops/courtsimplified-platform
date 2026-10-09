-- The case reader's audit call type, and the case's chat conversation saved
-- with the case (master plan Phase 1 and 3, 2026-10-08).
--
-- *** WHY ***
--
-- 1. 'case-reader' (intake/caseReader.ts): the AI reads the person's whole
--    account and reports, with checked quotes, their side, the procedural
--    events and the dates they describe. Like every model call it is logged
--    to ai_call_log; the CHECK below would otherwise reject its rows
--    (test:ai-call-logging compares the code's AiCallType with this list).
--
-- 2. case_chat_messages: the assistant conversation was kept only in the
--    browser (localStorage), so a person returning on another device, or
--    after clearing their browser, found it gone -- "like starting over"
--    (site owner, 2026-10-08). Saved here, it follows the case. Each row
--    belongs to the case's owner, enforced by the owner foreign key and RLS,
--    the same pattern as case_events (20261002090000_close_rls_gaps.sql).
--
-- *** NOT APPLIED BY ANYTHING IN THIS REPOSITORY ***
--
-- CLAUDE.md section 6: the site owner applies it, staging
-- (icpvzwxyjsdgyqfkwycw) before production (fddlpnibovkkkgboabqb), through
-- scripts/db/applyMigrations.ts, after a backup. Until it is applied the site
-- keeps working: the chat falls back to the browser copy, and case-reader
-- log rows are rejected and reported, as the logger already handles.

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
        'decision-help',
        'case-reader'
    ));

CREATE TABLE IF NOT EXISTS "public"."case_chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "case_chat_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "case_chat_messages_role_check" CHECK ("role" IN ('user', 'assistant')),
    CONSTRAINT "case_chat_messages_content_length" CHECK (char_length("content") BETWEEN 1 AND 8000)
);

ALTER TABLE "public"."case_chat_messages" OWNER TO "postgres";

-- The message belongs to the case's owner: (case_id, user_id) must be a case
-- that user owns, so a row cannot be attached to someone else's case.
ALTER TABLE ONLY "public"."case_chat_messages"
    ADD CONSTRAINT "case_chat_messages_case_owner_fk"
    FOREIGN KEY ("case_id", "user_id") REFERENCES "public"."cases"("id", "user_id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "case_chat_messages_case_id_created_at_idx"
    ON "public"."case_chat_messages" ("case_id", "created_at");

ALTER TABLE "public"."case_chat_messages" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own case chat" ON "public"."case_chat_messages"
    TO "authenticated"
    USING (("auth"."uid"() = "user_id"))
    WITH CHECK (("auth"."uid"() = "user_id"));

REVOKE ALL ON TABLE "public"."case_chat_messages" FROM "anon";
GRANT SELECT, INSERT, DELETE ON TABLE "public"."case_chat_messages" TO "authenticated";
