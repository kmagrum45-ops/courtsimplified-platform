-- The law shown with a chat answer is kept with it (Chrome, 2026-10-28).
--
-- A reopened conversation showed each answer's words but not the law sections and
-- citations shown live: the checked answer for each question was held only in the
-- page. It is now saved with the question it answers, in a new nullable column, and
-- written once its lookup finishes (app/api/cases/chat/route.ts, PATCH).
--
-- *** NOT APPLIED BY ANYTHING IN THIS REPOSITORY ***
--
-- CLAUDE.md section 6: the site owner applies it, staging
-- (icpvzwxyjsdgyqfkwycw) before production (fddlpnibovkkkgboabqb), through
-- scripts/db/applyMigrations.ts, after a backup. Until it is applied the site keeps
-- working: the route saves and reads the messages without the column, and the law
-- stays in the browser's copy of the conversation, as before.

ALTER TABLE "public"."case_chat_messages"
    ADD COLUMN IF NOT EXISTS "law" "jsonb";

-- The page sends at most 200 KB for one question's law; the database holds the line too.
ALTER TABLE "public"."case_chat_messages"
    DROP CONSTRAINT IF EXISTS "case_chat_messages_law_size";
ALTER TABLE "public"."case_chat_messages"
    ADD CONSTRAINT "case_chat_messages_law_size" CHECK ("law" IS NULL OR (jsonb_typeof("law") = 'object' AND octet_length("law"::"text") <= 200000));

-- The owner may fill in the law of their own messages, and nothing else: the existing
-- policy "Users manage own case chat" (owner only, USING and WITH CHECK) covers UPDATE,
-- and the grant names the one column.
GRANT UPDATE ("law") ON TABLE "public"."case_chat_messages" TO "authenticated";
