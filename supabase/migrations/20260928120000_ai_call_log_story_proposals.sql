-- Adds two call types to ai_call_log.call_type:
--
--   'propose-story-answers' -- reads the user's opening story and proposes
--                              answers to intake questions it already answers,
--                              each tied to an exact quote from the story that
--                              code verifies. The user confirms, edits or
--                              removes every proposal. See
--                              storyAnswerProposals.ts.
--   'case-review'           -- points at the user's own words that are worth
--                              checking (a document they mention, an
--                              approximate date, two entries that differ). The
--                              model returns a fixed kind and quotes only; the
--                              text shown comes from fixed templates. See
--                              caseReview/caseReviewModel.ts.
--
-- *** NOT APPLIED BY ANYTHING IN THIS REPOSITORY ***
--
-- CLAUDE.md section 6: the file is written, the site owner applies it, staging
-- (icpvzwxyjsdgyqfkwycw) before production (fddlpnibovkkkgboabqb). Apply WITH or
-- AFTER 20260922120000 and 20260926030000.

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
        'case-review'
    ));
