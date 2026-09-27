-- THE CASE WORKSPACE — where a user's own documents live.
--
-- *** THIS IS THE MOST SENSITIVE DATA THIS PRODUCT WILL EVER HOLD ***
--
-- Until now nothing was ever uploaded. The intake screens listed evidence by
-- description only, and as of 2026-09-23 they stopped capturing even the file
-- name (docs/lso-fixes-report.md, Step 8). So this migration is the first time
-- the product stores a user's documents at all, and everything below is written
-- on the assumption that a single cross-user read would be the worst incident
-- available to us: these are litigants' medical records, bank statements and
-- lawyers' letters.
--
-- *** WHY NEW TABLES AND NOT THE TWO THAT ALREADY EXIST ***
--
-- `case_documents` and `case_evidence` exist, are empty, and NOTHING reads them:
-- zero hits across app/ and src/ for either table name or for the `case-evidence`
-- bucket. `case_documents` is even the name one would want.
--
-- They are still left alone. Their columns describe something else — `title` NOT
-- NULL, `document_kind`, `form_number`, `status` — which reads as court documents
-- filed or generated in a case, a job `case_generated_documents` already has. A
-- workspace document is the user's own upload, with an exhibit number and an
-- extraction status, and retrofitting fourteen columns onto a table whose existing
-- five mean something different produces exactly the ambiguity that costs the next
-- person an afternoon. This repository has been bitten by near-duplicate
-- registries before.
--
-- The two unused tables are recorded in docs/case-workspace-report.md as dead
-- weight for a separate decision. Deleting them is not this migration's business.
--
-- *** THE BUCKET ALREADY HAS THE RIGHT SHAPE ***
--
-- `case-evidence` is private (public = false, asserted by
-- 20260926120000_case_evidence_bucket_private.sql) and already carries four
-- policies on storage.objects scoped to `foldername(name)[1] = auth.uid()`. That
-- is the user-scoped path requirement, already enforced, so this migration adds no
-- storage policy and relies on those. Object paths are
-- `{user_id}/{case_id}/{document_id}` and the first segment is what the policy
-- checks.
--
-- *** NO DROP, NO DELETE, NO TRUNCATE ***
--
-- Every statement is additive. Applied to STAGING ONLY via the gated runner;
-- production is Jason's to apply. CLAUDE.md §6.

-- ===========================================================================
-- 1. The documents themselves
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "public"."workspace_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,

    "case_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,

    -- The object path in the case-evidence bucket. Unique so two rows can never
    -- claim the same object, which would make deletion ambiguous.
    "storage_path" "text" NOT NULL,

    /*
     * The name as it arrived. STORED, AND NEVER SENT TO A MODEL.
     *
     * A file name is a disclosure in its own right —
     * `restraining-order-application.pdf` tells you something the user never
     * decided to tell you. Step 8 of the LSO report records that file names used
     * to reach OpenAI and no longer do. It is kept here because the user needs to
     * recognise their own document, and the AI payload is built from extracted
     * text only. `test:workspace-ai-flag` asserts it never appears in a payload.
     */
    "original_name" "text" NOT NULL,

    "mime" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,

    /*
     * sha256 of the file bytes. Two jobs: exact-duplicate detection without a
     * model, and proof that the object in storage is the object that was
     * registered.
     */
    "sha256" "text" NOT NULL,

    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,

    -- ---- what the USER says it is. Their confirmed values are the record. ----

    /*
     * From the fixed catalogue in src/lib/case-workspace/documentTypes.ts.
     * Constrained here as well as in code: a type outside the catalogue would
     * break the exhibit index and the type filter, and a CHECK is the only thing
     * that stops a bad write from any client.
     */
    "user_type" "text",
    "user_date" "date",

    /*
     * How precise `user_date` is. A document dated "March 2026" is not the same
     * claim as one dated 3 March 2026, and storing the first as 2026-03-01 and
     * forgetting would put it in the wrong place in a chronology and state a day
     * the document never gave. Part 3A.
     */
    "user_date_precision" "text" DEFAULT 'day'::"text",

    "user_label" "text",

    -- Exhibit 1, 2, 3 …, with an optional suffix for a document that has
    -- attachments: 1, 1A, 1B.
    "exhibit_number" integer,
    "exhibit_suffix" "text",

    "parties" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "amount" numeric(12, 2),
    "notes" "text",

    "extraction_status" "text" DEFAULT 'pending'::"text" NOT NULL,

    /*
     * Soft delete, so a mistaken tap is recoverable for as long as the row lives.
     *
     * *** THIS IS NOT THE DELETION THE USER IS PROMISED ***
     *
     * A real delete removes the storage OBJECT, the extracted text and the row.
     * `deleted_at` exists only for the short window between a user tapping delete
     * and the object being removed, and for making a failed hard delete visible
     * rather than silent. A row carrying deleted_at with its object still present
     * is a BUG, and test:workspace-deletion asserts nothing is left behind.
     */
    "deleted_at" timestamp with time zone,

    CONSTRAINT "workspace_documents_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workspace_documents_storage_path_key" UNIQUE ("storage_path"),

    CONSTRAINT "workspace_documents_case_fk"
        FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE CASCADE,
    CONSTRAINT "workspace_documents_user_fk"
        FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,

    CONSTRAINT "workspace_documents_size_positive"
        CHECK ("size_bytes" > 0),

    CONSTRAINT "workspace_documents_type_in_catalogue" CHECK (
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
            'other'
        ]::"text"[])
    ),

    CONSTRAINT "workspace_documents_date_precision" CHECK (
        "user_date_precision" = ANY (ARRAY['day', 'month', 'year']::"text"[])
    ),

    CONSTRAINT "workspace_documents_extraction_status" CHECK (
        "extraction_status" = ANY (ARRAY[
            'pending', 'running', 'done', 'failed', 'skipped'
        ]::"text"[])
    ),

    /*
     * A precision of month or year must not carry a day the document never said.
     * Enforced here because the chronology reads this column directly, and a
     * silently wrong day is the kind of error nobody notices until a judge does.
     */
    CONSTRAINT "workspace_documents_month_precision_is_first"
        CHECK (
            "user_date" IS NULL
            OR "user_date_precision" = 'day'
            OR ("user_date_precision" = 'month' AND EXTRACT(DAY FROM "user_date") = 1)
            OR (
                "user_date_precision" = 'year'
                AND EXTRACT(DAY FROM "user_date") = 1
                AND EXTRACT(MONTH FROM "user_date") = 1
            )
        )
);

CREATE INDEX IF NOT EXISTS "workspace_documents_case_idx"
    ON "public"."workspace_documents" ("case_id", "uploaded_at" DESC);

-- Chronological order is the default everywhere, so the index that serves it is
-- the one that matters. Nulls last: undated documents are shown in their own
-- "date needed" group, never silently sorted to an end.
CREATE INDEX IF NOT EXISTS "workspace_documents_case_date_idx"
    ON "public"."workspace_documents" ("case_id", "user_date" NULLS LAST);

CREATE INDEX IF NOT EXISTS "workspace_documents_case_exhibit_idx"
    ON "public"."workspace_documents" ("case_id", "exhibit_number" NULLS LAST);

-- Duplicate detection by hash, per user.
CREATE INDEX IF NOT EXISTS "workspace_documents_user_sha_idx"
    ON "public"."workspace_documents" ("user_id", "sha256");

COMMENT ON TABLE "public"."workspace_documents" IS
    'A user''s own uploaded case documents. original_name is never sent to a model.';

-- ===========================================================================
-- 2. Extracted text — a separate table on purpose
-- ===========================================================================

/*
 * *** WHY NOT A COLUMN ON workspace_documents ***
 *
 * Three reasons, and the first is the one that matters:
 *
 * 1. A `SELECT *` on the documents table is the normal way to list documents.
 *    If the full text of every document rode along, it would be read into memory,
 *    serialised into responses and quite possibly logged, on every page load. In a
 *    separate table it has to be asked for.
 * 2. It can be deleted on its own — for a user who wants extraction undone
 *    without losing the document.
 * 3. Extraction is asynchronous and rewrites this row repeatedly; the document
 *    row stays still.
 *
 * The text is encrypted at rest by Supabase's own disk encryption, is covered by
 * RLS here, and is never written to a log.
 */
CREATE TABLE IF NOT EXISTS "public"."workspace_document_text" (
    "document_id" "uuid" NOT NULL,

    -- Denormalised so the RLS policy needs no join. A policy that joins is a
    -- policy that can be defeated by a view.
    "user_id" "uuid" NOT NULL,

    "extracted_text" "text",
    "char_count" integer,
    "extracted_at" timestamp with time zone,

    -- 'pdftotext' | 'docx' | 'plain' | 'ocr-tesseract' | 'none'
    "extraction_method" "text",

    /*
     * What the PII scan found, as flag names only — never the matched text.
     * Recording the match would put a SIN in the table that exists to warn about
     * SINs.
     */
    "pii_flags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "pii_acknowledged_at" timestamp with time zone,

    CONSTRAINT "workspace_document_text_pkey" PRIMARY KEY ("document_id"),
    CONSTRAINT "workspace_document_text_document_fk"
        FOREIGN KEY ("document_id")
        REFERENCES "public"."workspace_documents"("id") ON DELETE CASCADE,
    CONSTRAINT "workspace_document_text_user_fk"
        FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

COMMENT ON TABLE "public"."workspace_document_text" IS
    'Extracted document text. Separate from workspace_documents so a document list never reads it.';

-- ===========================================================================
-- 3. Timeline events
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "public"."workspace_timeline_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,

    "event_date" "date" NOT NULL,
    "date_precision" "text" DEFAULT 'day'::"text" NOT NULL,

    -- From the fixed list in src/lib/case-workspace/timelineEventTypes.ts.
    "event_type" "text" NOT NULL,

    -- The user's own words. Never model prose: a chronology that goes to a court
    -- says what the user says happened.
    "description" "text" NOT NULL,

    /*
     * Where this came from, so every row on the timeline can show its source.
     * 'deadline-engine' rows are computed and are not editable as text.
     */
    "source" "text" NOT NULL,
    "document_id" "uuid",

    -- Suggested rows are unconfirmed until the user says so. Suggest, never
    -- decide (CLAUDE.md §4).
    "confirmed_at" timestamp with time zone,

    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,

    CONSTRAINT "workspace_timeline_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workspace_timeline_events_case_fk"
        FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE CASCADE,
    CONSTRAINT "workspace_timeline_events_user_fk"
        FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "workspace_timeline_events_document_fk"
        FOREIGN KEY ("document_id")
        REFERENCES "public"."workspace_documents"("id") ON DELETE SET NULL,

    CONSTRAINT "workspace_timeline_events_source" CHECK (
        "source" = ANY (ARRAY['user', 'document', 'intake', 'deadline-engine']::"text"[])
    ),
    CONSTRAINT "workspace_timeline_events_precision" CHECK (
        "date_precision" = ANY (ARRAY['day', 'month', 'year']::"text"[])
    )
);

CREATE INDEX IF NOT EXISTS "workspace_timeline_events_case_date_idx"
    ON "public"."workspace_timeline_events" ("case_id", "event_date");

-- ===========================================================================
-- 4. Communication log
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "public"."workspace_communications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,

    "occurred_on" "date" NOT NULL,
    "occurred_at_time" "text",

    "direction" "text" NOT NULL,
    "other_party" "text",
    "method" "text" NOT NULL,

    -- The user's summary, in their words.
    "summary" "text" NOT NULL,
    "document_id" "uuid",

    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,

    CONSTRAINT "workspace_communications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workspace_communications_case_fk"
        FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE CASCADE,
    CONSTRAINT "workspace_communications_user_fk"
        FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "workspace_communications_document_fk"
        FOREIGN KEY ("document_id")
        REFERENCES "public"."workspace_documents"("id") ON DELETE SET NULL,

    CONSTRAINT "workspace_communications_direction" CHECK (
        "direction" = ANY (ARRAY['sent', 'received']::"text"[])
    ),
    CONSTRAINT "workspace_communications_method" CHECK (
        "method" = ANY (ARRAY[
            'email', 'text-message', 'phone', 'letter', 'in-person', 'other'
        ]::"text"[])
    )
);

CREATE INDEX IF NOT EXISTS "workspace_communications_case_date_idx"
    ON "public"."workspace_communications" ("case_id", "occurred_on");

-- ===========================================================================
-- 5. RLS — own rows only, on every table
-- ===========================================================================

/*
 * Four policies per table rather than one FOR ALL, matching the `cases_*_own`
 * pattern already in this schema. Separate policies make a missing one visible in
 * a policy listing; a single FOR ALL hides which verb is actually covered.
 *
 * anon is REVOKED as well as unpolicied. RLS with no policy is already deny-all,
 * but a grant left in place is a grant somebody can write a policy against
 * later without noticing what it opens.
 */

ALTER TABLE "public"."workspace_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workspace_document_text" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workspace_timeline_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workspace_communications" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_documents_select_own" ON "public"."workspace_documents"
    FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
CREATE POLICY "workspace_documents_insert_own" ON "public"."workspace_documents"
    FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "workspace_documents_update_own" ON "public"."workspace_documents"
    FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()))
    WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "workspace_documents_delete_own" ON "public"."workspace_documents"
    FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));

CREATE POLICY "workspace_document_text_select_own" ON "public"."workspace_document_text"
    FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
CREATE POLICY "workspace_document_text_insert_own" ON "public"."workspace_document_text"
    FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "workspace_document_text_update_own" ON "public"."workspace_document_text"
    FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()))
    WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "workspace_document_text_delete_own" ON "public"."workspace_document_text"
    FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));

CREATE POLICY "workspace_timeline_events_select_own" ON "public"."workspace_timeline_events"
    FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
CREATE POLICY "workspace_timeline_events_insert_own" ON "public"."workspace_timeline_events"
    FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "workspace_timeline_events_update_own" ON "public"."workspace_timeline_events"
    FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()))
    WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "workspace_timeline_events_delete_own" ON "public"."workspace_timeline_events"
    FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));

CREATE POLICY "workspace_communications_select_own" ON "public"."workspace_communications"
    FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
CREATE POLICY "workspace_communications_insert_own" ON "public"."workspace_communications"
    FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "workspace_communications_update_own" ON "public"."workspace_communications"
    FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()))
    WITH CHECK (("user_id" = "auth"."uid"()));
CREATE POLICY "workspace_communications_delete_own" ON "public"."workspace_communications"
    FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));

REVOKE ALL ON TABLE "public"."workspace_documents" FROM "anon";
REVOKE ALL ON TABLE "public"."workspace_document_text" FROM "anon";
REVOKE ALL ON TABLE "public"."workspace_timeline_events" FROM "anon";
REVOKE ALL ON TABLE "public"."workspace_communications" FROM "anon";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."workspace_documents" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."workspace_document_text" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."workspace_timeline_events" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."workspace_communications" TO "authenticated";

GRANT ALL ON TABLE "public"."workspace_documents" TO "service_role";
GRANT ALL ON TABLE "public"."workspace_document_text" TO "service_role";
GRANT ALL ON TABLE "public"."workspace_timeline_events" TO "service_role";
GRANT ALL ON TABLE "public"."workspace_communications" TO "service_role";
