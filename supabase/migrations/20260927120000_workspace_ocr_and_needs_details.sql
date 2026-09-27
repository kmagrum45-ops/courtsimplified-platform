-- Client-side OCR: a confidence score, and a status that asks the user for help.
--
-- ############################################################################
-- ## THIS MIGRATION CONTAINS A `DROP CONSTRAINT`. READ THIS BEFORE APPLYING. ##
-- ############################################################################
--
-- CLAUDE.md §6 says a migration containing DROP must be flagged rather than
-- applied quietly, so here is exactly what it drops and why there is no way
-- around it.
--
-- `workspace_documents_extraction_status` is a CHECK restricting extraction_status
-- to pending | running | done | failed | skipped. A new value, 'needs-details', has
-- to be allowed. **Postgres has no way to widen a CHECK constraint in place** —
-- there is no ALTER CONSTRAINT for the expression — so the only route is to drop it
-- and add the wider one back. Adding a second CHECK would not work, because the old
-- one would still reject the new value; CHECKs are ANDed.
--
-- What that means for safety:
--
--   * It is a WIDENING. Every value the old constraint permitted, the new one
--     permits. No existing row can be made invalid by it, so nothing needs
--     backfilling and nothing can be rejected on the way in.
--   * It drops a CONSTRAINT, not a table, a column or a row. No data is touched.
--     There is no DELETE and no TRUNCATE anywhere in this file.
--   * The window between the two statements is inside one transaction, because
--     `supabase db push` runs each migration in one. There is no moment when the
--     table is live with no constraint.
--   * The reverse is a one-line re-add of the original expression, which is
--     recorded above in case it is ever wanted.
--
-- The alternative considered and rejected: leave the CHECK alone and add a
-- `needs_user_details boolean` column instead. That avoids the DROP entirely, and
-- it was rejected because it creates two sources of truth for one question. A row
-- could then say extraction_status = 'done' and needs_user_details = true, and
-- every screen and every query would have to know which one wins. A status column
-- whose values do not cover the real states is the actual defect; working around it
-- with a second column preserves the defect and adds a way to disagree with itself.
--
-- *** WHY 'needs-details' IS A STATE AND NOT A KIND OF FAILURE ***
--
-- OCR of a photograph of a receipt often half-works: it returns text, and some of
-- it is wrong. A confidence of 42 is not a failure — the file is fine and the
-- document is real — but it is not something to hand to a chronology as though it
-- were read reliably.
--
-- The three existing outcomes all misdescribe it. 'done' asserts the text is good.
-- 'failed' asserts something went wrong, and nothing did. 'skipped' asserts nothing
-- was attempted, when in fact a great deal was. So 'needs-details' says the true
-- thing: there is text, it is not trustworthy enough to rely on, and the person who
-- owns the document should type the date and a description themselves.
--
-- That is also the only honest answer available under CLAUDE.md §4. Low-confidence
-- OCR is a suggestion, and a suggestion the user confirms or overrides is the
-- product's whole shape. Silently storing it as fact would be deciding for them.
--
-- *** THE CONFIDENCE COLUMN ***
--
-- tesseract reports a mean confidence from 0 to 100. Stored as numeric(5,2) and
-- range-checked, NULL for every method that is not OCR — a text layer read out of a
-- PDF is not "100% confident", it is simply not a guess, and recording 100 would
-- make the two indistinguishable in a query.
--
-- *** ADDITIVE APART FROM THE WIDENING ***
--
-- Applied to STAGING ONLY via the gated runner; production is Jason's to apply, in
-- one pass with the other workspace migrations. CLAUDE.md §6.

-- The original expression, for the record and for a reversal:
--   CHECK (extraction_status = ANY (ARRAY['pending','running','done','failed','skipped']))

ALTER TABLE "public"."workspace_documents"
    DROP CONSTRAINT IF EXISTS "workspace_documents_extraction_status";

ALTER TABLE "public"."workspace_documents"
    ADD CONSTRAINT "workspace_documents_extraction_status" CHECK (
        "extraction_status" = ANY (ARRAY[
            'pending',
            'running',
            'done',
            'failed',
            'skipped',
            -- There is text, it is not reliable enough to depend on, and the user
            -- is being asked for the date and description themselves.
            'needs-details'
        ]::"text"[])
    );

ALTER TABLE "public"."workspace_document_text"
    ADD COLUMN IF NOT EXISTS "extraction_confidence" numeric(5, 2);

ALTER TABLE "public"."workspace_document_text"
    DROP CONSTRAINT IF EXISTS "workspace_document_text_confidence_range";

ALTER TABLE "public"."workspace_document_text"
    ADD CONSTRAINT "workspace_document_text_confidence_range" CHECK (
        "extraction_confidence" IS NULL
        OR ("extraction_confidence" >= 0 AND "extraction_confidence" <= 100)
    );

COMMENT ON COLUMN "public"."workspace_document_text"."extraction_confidence" IS
    'Mean OCR confidence, 0-100. NULL for every method that is not OCR: a PDF text layer is not a guess, and recording 100 would make the two indistinguishable.';
