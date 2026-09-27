-- When a document was last analysed by a model, and what came back.
--
-- *** THE FEATURE THIS SUPPORTS IS OFF AND STAYS OFF ***
--
-- `AI_DOCUMENT_ANALYSIS_ENABLED` is false everywhere including staging, and
-- `ZDR_CONFIRMED_AT` in src/lib/case-workspace/aiAnalysis.ts is null: OpenAI has not
-- confirmed that zero data retention and modified abuse monitoring cover uploaded
-- documents, and as of 2026-09-27 the request has not been sent.
--
-- So every column below will hold NULL for every row until that changes. That is the
-- intended state, not an incomplete migration.
--
-- *** WHY ADD THEM NOW RATHER THAN WITH THE FEATURE ***
--
-- The daily cap counts rows by `analysed_at`. Without the column the cap cannot be
-- counted, so the code that enforces it would fail the first time it ran — which is
-- the moment the flag is switched on, against real documents, by someone who has just
-- been told the feature is ready.
--
-- A feature that is off should be off and CORRECT, not off and quietly broken. The
-- alternative is a migration written under pressure on the day, which is how the cap
-- ends up being the thing that gets dropped to make the deploy work.
--
-- *** WHAT IS DELIBERATELY NOT STORED ***
--
-- Not the prompt, not the raw response, and not the extracted text that was sent. The
-- suggestion the model returned is stored so a user can see what they were offered and
-- a reviewer can see what was suggested versus what the user confirmed — that is the
-- audit that matters for §4.
--
-- Storing the payload would mean keeping a second copy of the document text in a
-- column nobody reads, in a table with a different retention story from
-- workspace_document_text. The call itself is recorded by ai_call_log, which is where
-- a regulator would look.
--
-- *** ADDITIVE ONLY ***
--
-- Two ADD COLUMN IF NOT EXISTS, both nullable. No DROP, no DELETE, no TRUNCATE, no
-- change to any existing column or constraint. Applied to STAGING ONLY via the gated
-- runner; production is Jason's to apply with the rest of the workspace migrations.
-- CLAUDE.md §6.

ALTER TABLE "public"."workspace_documents"
    ADD COLUMN IF NOT EXISTS "analysed_at" timestamp with time zone;

ALTER TABLE "public"."workspace_documents"
    ADD COLUMN IF NOT EXISTS "analysis_suggestion" "jsonb";

CREATE INDEX IF NOT EXISTS "workspace_documents_case_analysed_idx"
    ON "public"."workspace_documents" ("case_id", "analysed_at");

COMMENT ON COLUMN "public"."workspace_documents"."analysed_at" IS
    'When a model last suggested what this document is. NULL for every row while AI_DOCUMENT_ANALYSIS_ENABLED is false, which is its state. Counted for the per-case daily cap.';

COMMENT ON COLUMN "public"."workspace_documents"."analysis_suggestion" IS
    'The suggestion offered, so a user can see what they were offered and a reviewer can compare it with what the user confirmed. Never the prompt, the raw response, or the text that was sent.';
