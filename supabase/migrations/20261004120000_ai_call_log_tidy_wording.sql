-- Adds one call type to ai_call_log.call_type:
--
--   'tidy-wording' -- suggests spelling, punctuation and grammar fixes to what
--                     the user typed. Code drops any suggestion that changes a
--                     number or a quoted passage, adds a name, or adds a legal
--                     term. The user accepts each suggestion or keeps their own
--                     words. See src/lib/case-system/intake/tidyWording.ts.
--
-- Until this is applied the feature still works; its audit rows are refused by
-- the old CHECK constraint and reported to the server console (aiCallLog.ts
-- insertRow is fire and forget).
--
-- *** NOT APPLIED BY ANYTHING IN THIS REPOSITORY ***
--
-- CLAUDE.md section 6: the file is written, the site owner applies it, staging
-- (icpvzwxyjsdgyqfkwycw) before production (fddlpnibovkkkgboabqb). Apply AFTER
-- 20260928120000.

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
        'tidy-wording'
    ));
