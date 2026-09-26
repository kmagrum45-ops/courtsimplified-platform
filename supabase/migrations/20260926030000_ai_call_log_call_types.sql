-- Brings ai_call_log.call_type into line with the call types the code emits.
--
-- Adds two: 'stage-resolver' (Part 5) and 'library-chat' (chat item 6).
--
-- *** WHY THIS EXISTS: THE TABLE WOULD HAVE REJECTED EVERY STAGE-RESOLVER ROW ***
--
-- 20260922120000_add_ai_call_log.sql constrains call_type to six values. Part 5
-- then added a seventh call type in the code — 'stage-resolver', the model call
-- that decides where a case stands — and did not extend the constraint.
--
-- Neither half was visibly broken, because the table does not exist in any
-- project yet. The moment the original migration is applied, every stage-resolver
-- insert fails its CHECK and the audit log silently has no record of the most
-- consequential model call in the product: the one whose reasoning is captured
-- precisely SO a regulator can read why a person was placed where they were.
--
-- Found by `npm run test:ai-call-logging`, which compares the code's AiCallType
-- union against this constraint in both directions. It had been reporting this
-- for as long as the call type has existed.
--
-- *** NOT APPLIED BY ANYTHING IN THIS REPOSITORY ***
--
-- CLAUDE.md section 6: the file is written, the site owner applies it, staging
-- before production, identified by REF and never by name. Apply it WITH or AFTER
-- 20260922120000, never before — this alters a table that one creates. See the
-- migration checklist in docs/lso-fixes-report.md.

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
        -- Part 5. The stage resolver reasons privately and answers only from
        -- verified content; this is where the private half lands.
        'stage-resolver',
        -- Chat item 6. Selects published blocks by id; writes no prose.
        'library-chat'
    ));
