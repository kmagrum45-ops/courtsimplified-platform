-- case_events — step 1 of the case lifecycle.
--
-- WHAT THIS IS FOR. Today a case file is a snapshot recomputed from intake:
-- `cases.master_result` is written with a wholesale UPDATE, and procedural
-- events reach the engines only by being parsed out of the intake narrative on
-- each run. A user who comes back and says "I was served with a motion on the
-- 4th" has nowhere to put that where it survives. This table is that place.
--
-- SIX DESIGN DECISIONS ARE ENCODED HERE. They were settled before this
-- migration was written and the schema enforces them rather than relying on
-- callers to remember:
--
--   1. Events are FACTS about what happened, never derivations. "Defence filed
--      on March 4" is an event. "The case is at the defended stage" is not, and
--      is never stored — deriveCaseStage() computes it from events at read time
--      and shows its basis[] so the user can see why.
--
--   2. Narrative-derived events are CANDIDATES, not events. `source` has no
--      'system-inference' value, deliberately: an AI parse of the intake story
--      is an inference, and only a user-confirmed candidate becomes a row. The
--      sentence it came from is kept in narrative_basis.
--
--   3. Append-only with supersession. A correction NEVER updates the original —
--      it writes a new row carrying supersedes_event_id. The site showed the
--      user things based on the original, so the original stays auditable.
--      There is no updated_at and no set_updated_at trigger, breaking the
--      `cases` convention on purpose: an updated_at on an append-only table is
--      an invitation to UPDATE.
--
--   4. occurred_at and scheduled_for are DIFFERENT fields. "Notice of trial
--      received March 1, trial set for June 15" is one event with both.
--
--   5. Dates may be absent or approximate and that must be representable
--      without guessing. *_raw holds the user's own words, *_normalized is
--      NULLABLE, *_certainty records which. "I was served but I don't remember
--      when" is a valid, complete event.
--
--   6. master_result becomes a derived CACHE, not the source of truth. Events
--      plus intake are the truth. Staleness is surfaced to the user, never
--      silently recomputed — recomputation costs API calls.
--
-- ENVIRONMENT: dev (courtsimplified-dev, fddlpnibovkkkgboabqb, ca-central-1).
-- Production (courtsimplified, ffymjxjcnwakgdmldpne) is a separate decision
-- under CLAUDE.md section 6 and is NOT covered by this migration.

CREATE TABLE IF NOT EXISTS "public"."case_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,

    -- Sourced vocabulary. Every value except 'other-user-described' cites a
    -- provision of O. Reg. 258/98; see caseEventTypes.ts for the rule and the
    -- quoted text. 'other-user-described' is FIRST-CLASS, not a fallback:
    -- forcing a real event into a wrong type corrupts every derivation
    -- downstream, so recording it untyped is the correct answer whenever the
    -- user's event does not map cleanly.
    "event_type" "text" NOT NULL,
    "court_path" "text" NOT NULL,

    "title" "text" NOT NULL,
    "description" "text",

    -- Decision 5. occurred_at_normalized is nullable by design.
    "occurred_at_raw" "text",
    "occurred_at_normalized" "date",
    "date_certainty" "text" DEFAULT 'unknown'::"text" NOT NULL,

    -- Decision 4. A date the event SET, not a date it happened on.
    -- This is a fact about the event, not a tracked deadline — deadlines are a
    -- different table with different semantics (an event happened; a deadline
    -- has not).
    "scheduled_for_raw" "text",
    "scheduled_for_normalized" "date",
    "scheduled_for_certainty" "text" DEFAULT 'unknown'::"text" NOT NULL,

    -- Decision 2. No 'system-inference'. An unconfirmed parse is a candidate
    -- and candidates are not rows in this table.
    "source" "text" NOT NULL,
    "narrative_basis" "text",

    -- Populated when a document is recognised as evidencing the event.
    -- Nothing populates it yet; document recognition is a later step.
    "related_document_id" "uuid",

    -- Decision 3.
    "supersedes_event_id" "uuid",
    "retracted_at" timestamp with time zone,
    "retraction_reason" "text",

    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,

    CONSTRAINT "case_events_court_path_check"
        CHECK (("court_path" = 'small-claims'::"text")),

    CONSTRAINT "case_events_date_certainty_check"
        CHECK (("date_certainty" = ANY (ARRAY['exact'::"text", 'approximate'::"text", 'unknown'::"text"]))),

    CONSTRAINT "case_events_scheduled_for_certainty_check"
        CHECK (("scheduled_for_certainty" = ANY (ARRAY['exact'::"text", 'approximate'::"text", 'unknown'::"text"]))),

    -- Decision 2 enforced at the storage layer.
    CONSTRAINT "case_events_source_check"
        CHECK (("source" = ANY (ARRAY[
            'user-stated'::"text",
            'confirmed-from-narrative'::"text",
            'confirmed-from-document'::"text"
        ]))),

    -- A confirmed narrative candidate must keep the sentence it came from, so
    -- a user can see what was read into their story.
    CONSTRAINT "case_events_narrative_basis_present"
        CHECK (("source" <> 'confirmed-from-narrative'::"text") OR ("narrative_basis" IS NOT NULL)),

    -- A normalized date without the user's own words cannot be checked back
    -- against what they actually said.
    CONSTRAINT "case_events_occurred_raw_present"
        CHECK (("occurred_at_normalized" IS NULL) OR ("occurred_at_raw" IS NOT NULL)),

    CONSTRAINT "case_events_scheduled_raw_present"
        CHECK (("scheduled_for_normalized" IS NULL) OR ("scheduled_for_raw" IS NOT NULL)),

    -- 'exact' and 'approximate' both assert something about a date. Neither is
    -- meaningful with no date recorded.
    CONSTRAINT "case_events_certainty_needs_date"
        CHECK (("date_certainty" = 'unknown'::"text") OR ("occurred_at_raw" IS NOT NULL)),

    CONSTRAINT "case_events_retraction_reason_present"
        CHECK (("retracted_at" IS NULL) OR ("retraction_reason" IS NOT NULL)),

    -- An event cannot supersede itself.
    CONSTRAINT "case_events_no_self_supersede"
        CHECK (("supersedes_event_id" IS NULL) OR ("supersedes_event_id" <> "id"))
);


ALTER TABLE "public"."case_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."case_events" IS
    'Append-only record of procedural events a user has confirmed. Facts only, never derivations: stage is computed from these at read time by deriveCaseStage(). Corrections write a new row carrying supersedes_event_id rather than updating the original, so what the user was previously shown stays auditable.';

COMMENT ON COLUMN "public"."case_events"."event_type" IS
    'Sourced vocabulary. Every value except other-user-described cites a provision of O. Reg. 258/98 (see caseEventTypes.ts). other-user-described is first-class and must stay equally easy to choose: forcing a real event into a wrong type corrupts every derivation downstream.';

COMMENT ON COLUMN "public"."case_events"."occurred_at_normalized" IS
    'NULLABLE by design. A user who was served but does not remember when has recorded a valid, complete event. Never inferred from surrounding events.';

COMMENT ON COLUMN "public"."case_events"."scheduled_for_normalized" IS
    'A date this event SET, e.g. a notice of trial fixing a trial date. A fact about the event, not a tracked deadline — deadlines are a separate table with different semantics.';

COMMENT ON COLUMN "public"."case_events"."source" IS
    'No system-inference value, deliberately. An AI parse of the intake narrative is an inference; only a user-confirmed candidate becomes a row here.';

COMMENT ON COLUMN "public"."case_events"."supersedes_event_id" IS
    'Set on a CORRECTION, pointing at the row it replaces. Live events are those not superseded by any live row and not retracted. ON DELETE RESTRICT: deleting a superseded event would orphan its correction and destroy the audit trail.';


ALTER TABLE ONLY "public"."case_events"
    ADD CONSTRAINT "case_events_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."case_events"
    ADD CONSTRAINT "case_events_case_id_fkey"
    FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."case_events"
    ADD CONSTRAINT "case_events_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- SET NULL, not CASCADE: deleting a document must not destroy the record that
-- the event happened. The event is the user's statement; the document was only
-- evidence of it.
ALTER TABLE ONLY "public"."case_events"
    ADD CONSTRAINT "case_events_related_document_id_fkey"
    FOREIGN KEY ("related_document_id") REFERENCES "public"."case_documents"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."case_events"
    ADD CONSTRAINT "case_events_supersedes_event_id_fkey"
    FOREIGN KEY ("supersedes_event_id") REFERENCES "public"."case_events"("id") ON DELETE RESTRICT;


-- Indexes. A deliberate divergence from the existing case_* tables, which carry
-- none: unlike documents or evidence, every read of this table is "the live
-- events for this case", and that predicate is compound.

CREATE INDEX "case_events_case_id_created_at_idx"
    ON "public"."case_events" USING "btree" ("case_id", "created_at" DESC);

CREATE INDEX "case_events_case_id_live_idx"
    ON "public"."case_events" USING "btree" ("case_id")
    WHERE ("retracted_at" IS NULL);

CREATE INDEX "case_events_supersedes_idx"
    ON "public"."case_events" USING "btree" ("supersedes_event_id")
    WHERE ("supersedes_event_id" IS NOT NULL);


-- RLS, matching case_documents / case_evidence / case_generated_documents
-- exactly. One policy, ownership by auth.uid() = user_id.
ALTER TABLE "public"."case_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own events" ON "public"."case_events"
    TO "authenticated"
    USING (("auth"."uid"() = "user_id"))
    WITH CHECK (("auth"."uid"() = "user_id"));


-- Grants match the existing case_* convention. NOTE: that convention grants ALL
-- to anon and relies entirely on RLS to hold the line. Matched here for
-- consistency rather than diverging in a single table, and recorded as an open
-- item in docs/OUTSTANDING_ISSUES.md rather than inherited silently.
GRANT ALL ON TABLE "public"."case_events" TO "anon";
GRANT ALL ON TABLE "public"."case_events" TO "authenticated";
GRANT ALL ON TABLE "public"."case_events" TO "service_role";
