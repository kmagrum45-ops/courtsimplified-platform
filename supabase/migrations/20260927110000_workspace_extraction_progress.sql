-- Extraction can say WHEN it started, HOW MANY times it has been tried, and WHY it
-- did not produce text.
--
-- *** WHY 'running' WITHOUT A TIMESTAMP IS A DOCUMENT THAT NEVER EXTRACTS ***
--
-- 20260927090000 gave workspace_documents an extraction_status of
-- pending | running | done | failed | skipped, which is the right set. What it did
-- not give is a way to tell a job that is working from a job that DIED.
--
-- Extraction runs in a serverless function and it is genuinely slow: a real
-- 500 KB Supreme Court decision took 2.1 to 6.4 seconds to parse, measured
-- 2026-09-27 on the development machine. A 25 MB scanned PDF is a different
-- proposition, and a function that is killed mid-parse — timeout, cold-start
-- eviction, a deploy landing — leaves the row saying 'running' with nothing
-- running.
--
-- Without a timestamp, that row is stuck for good. Nothing can retry it, because
-- nothing can distinguish it from a job started half a second ago, and a retry that
-- cannot tell the difference would run two extractions over the same document at
-- once. The user sees a document that says it is being processed, forever, with no
-- way to ask again.
--
-- So `extraction_started_at` is what makes a retry safe: a 'running' older than the
-- route's stale window is a dead job and may be taken over. `extraction_attempts`
-- is what stops that becoming an infinite loop over a document that kills the
-- function every time.
--
-- *** WHY THERE IS A NOTICE COLUMN, AND WHAT MAY NOT GO IN IT ***
--
-- Most documents a litigant uploads are photographs and scans, and there is no
-- pure-JS OCR in this product today. So 'skipped' is not an edge case; it is the
-- expected outcome for a large share of uploads, and the user has to be able to
-- read why. There was nowhere to put that.
--
-- `extraction_notice` holds a sentence written FOR THE USER. It must never hold a
-- parser's error message. A PDF or ZIP parser's message can quote bytes from the
-- file it failed on, and those bytes are the user's document — so storing it would
-- copy fragments of a medical record into a column built for explanations. The
-- extractor in src/lib/case-workspace/extractText.ts deliberately does not pass
-- error.message through, for the same reason.
--
-- *** ADDITIVE ONLY ***
--
-- Three ADD COLUMN IF NOT EXISTS. No DROP, no DELETE, no TRUNCATE, no change to any
-- existing column or constraint. Every new column is nullable or defaulted, so
-- existing rows stay valid and nothing needs backfilling: a row with
-- extraction_status 'pending' and a NULL extraction_started_at is exactly right —
-- it has never been started.
--
-- Applied to STAGING ONLY via the gated runner; production is Jason's to apply.
-- CLAUDE.md §6.

ALTER TABLE "public"."workspace_documents"
    ADD COLUMN IF NOT EXISTS "extraction_started_at" timestamp with time zone;

ALTER TABLE "public"."workspace_documents"
    ADD COLUMN IF NOT EXISTS "extraction_attempts" integer DEFAULT 0 NOT NULL;

ALTER TABLE "public"."workspace_documents"
    ADD COLUMN IF NOT EXISTS "extraction_notice" "text";

COMMENT ON COLUMN "public"."workspace_documents"."extraction_started_at" IS
    'When the current extraction attempt began. A ''running'' row older than the route''s stale window is a dead job and may be retried.';

COMMENT ON COLUMN "public"."workspace_documents"."extraction_attempts" IS
    'Incremented on each attempt, so a document that kills the function cannot be retried forever.';

COMMENT ON COLUMN "public"."workspace_documents"."extraction_notice" IS
    'A sentence for the USER explaining why there is no text. Never a parser error message: those can quote bytes from the document.';
