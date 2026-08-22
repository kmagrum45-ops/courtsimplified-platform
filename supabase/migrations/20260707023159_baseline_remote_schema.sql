-- Baseline schema for the linked hosted project (ffymjxjcnwakgdmldpne).
--
-- WHAT THIS IS
-- A faithful, pg_dump-generated snapshot of the live remote `public` schema as
-- it actually existed on 2026-08-22. It was produced read-only with
-- `supabase db dump --linked` and has NOT been applied anywhere.
--
-- WHY IT EXISTS
-- The real database was created outside of migrations. The two earlier
-- `*_remote_schema.sql` files are 0 bytes, so no migration in the chain ever
-- created `court_form_library`, `legal_procedure_rules`,
-- `legal_form_mapping_rules`, or any other table that later migrations ALTER
-- and INSERT into. The chain therefore cannot be replayed from scratch. This
-- file documents the real structure so future migrations build on it.
--
-- ORDERING
-- Deliberately versioned 20260707023159 so it sorts FIRST among migrations that
-- actually create objects, immediately after the 0-byte 20260707023158
-- placeholder it supersedes, and before the 2026-08-08..2026-08-10 bundles that
-- ALTER and INSERT into these tables. Do not renumber it above those bundles.
--
-- APPLYING IT
-- This file is NOT idempotent as a whole: CREATE TABLE/VIEW/FUNCTION use
-- IF NOT EXISTS or OR REPLACE, but the CREATE POLICY, CREATE INDEX, and
-- ADD CONSTRAINT statements do not. It replays cleanly onto an EMPTY database
-- (`supabase db reset`), and must never be executed against the existing remote,
-- where these objects already exist. On the remote it is recorded as applied via
-- `supabase migration repair --status applied 20260707023159`.
--
-- SCOPE
-- Structure only: extensions, one function, 24 tables, 3 views, constraints,
-- indexes, 1 trigger, RLS policies, and grants. It contains NO data. The
-- catalogue rows that live in the remote database today (court_form_library
-- ~723 rows, legal_procedure_rules ~55, legal_form_mapping_rules ~31) are
-- seeded by the existing INSERT migrations, not by this file.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."case_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "document_kind" "text",
    "form_number" "text",
    "status" "text" DEFAULT 'uploaded'::"text",
    "storage_path" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."case_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."case_evidence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "category" "text",
    "linked_issues" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "storage_path" "text",
    "analysis" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."case_evidence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."case_generated_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "document_type" "text",
    "storage_path" "text",
    "generation_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."case_generated_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."case_intakes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "case_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "intake_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "normalized_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."case_intakes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "court_path" "text" NOT NULL,
    "title" "text" DEFAULT 'Untitled Case'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "current_stage" "text",
    "master_result" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cases_court_path_check" CHECK (("court_path" = ANY (ARRAY['family'::"text", 'small-claims'::"text", 'civil'::"text"])))
);


ALTER TABLE "public"."cases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."civil_form_lookup" (
    "id" bigint NOT NULL,
    "form_number" "text" NOT NULL,
    "official_title" "text",
    "purpose" "text",
    "procedure_stage" "text",
    "form_group" "text",
    "file_path" "text"
);


ALTER TABLE "public"."civil_form_lookup" OWNER TO "postgres";


ALTER TABLE "public"."civil_form_lookup" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."civil_form_lookup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."court_form_library" (
    "id" "uuid",
    "file_path" "text",
    "court_type" "text",
    "file_type" "text",
    "form_number" "text",
    "official_title" "text",
    "is_active" boolean,
    "form_group" "text",
    "procedure_stage" "text",
    "purpose" "text",
    "canonical_form_id" "uuid",
    "form_source_id" "text",
    "form_source_type" "text",
    "official_source_url" "text",
    "form_source_title" "text",
    "form_issuing_body" "text",
    "form_revision_or_effective_at" "text",
    "form_checked_at" "date",
    "form_review_status" "text"
);


ALTER TABLE "public"."court_form_library" OWNER TO "postgres";


COMMENT ON COLUMN "public"."court_form_library"."canonical_form_id" IS 'Catalog identity only; it does not establish legal verification, currentness, filing readiness, or recommendation mapping.';



COMMENT ON COLUMN "public"."court_form_library"."form_review_status" IS 'Catalog-source review only. It does not certify a mapping, recommendation, generation path, filing readiness, or legal advice.';



CREATE OR REPLACE VIEW "public"."court_form_master_view" AS
 SELECT "court_type",
    COALESCE("form_number", ''::"text") AS "form_number",
    "official_title",
    "max"(
        CASE
            WHEN ("file_path" ~~* '%.pdf'::"text") THEN "file_path"
            ELSE NULL::"text"
        END) AS "pdf_path",
    "max"(
        CASE
            WHEN ("file_path" ~~* '%.doc%'::"text") THEN "file_path"
            ELSE NULL::"text"
        END) AS "word_path",
    "max"("form_group") AS "form_group",
    "max"("procedure_stage") AS "procedure_stage",
    "max"("purpose") AS "purpose",
    "count"(*) AS "version_count",
        CASE
            WHEN (("count"(*) FILTER (WHERE ("canonical_form_id" IS NULL)) = 0) AND ("count"(DISTINCT "canonical_form_id") = 1)) THEN ("array_agg"("canonical_form_id") FILTER (WHERE ("canonical_form_id" IS NOT NULL)))[1]
            ELSE NULL::"uuid"
        END AS "canonical_form_id"
   FROM "public"."court_form_library"
  WHERE ("is_active" = true)
  GROUP BY "court_type", COALESCE("form_number", ''::"text"), "official_title";


ALTER VIEW "public"."court_form_master_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."court_form_master_view" IS 'Catalog read model. Null or conflicting canonical_form_id values are review-required for future consumers.';



CREATE OR REPLACE VIEW "public"."court_form_clean_view" AS
 SELECT "court_type",
    "form_number",
    "official_title",
    "pdf_path",
    "word_path",
    "form_group",
    "procedure_stage",
    "purpose",
    "version_count",
    "canonical_form_id"
   FROM "public"."court_form_master_view"
  WHERE (("form_number" <> ''::"text") AND ("official_title" !~~* '%notice to profession%'::"text") AND ("official_title" !~~* '%practice direction%'::"text") AND ("official_title" !~~* '%law society%'::"text"));


ALTER VIEW "public"."court_form_clean_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."court_form_clean_view" IS 'Catalog read model. Null or conflicting canonical_form_id values are review-required for future consumers.';



CREATE TABLE IF NOT EXISTS "public"."court_form_fields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "form_id" "text",
    "court_type" "text",
    "form_number" "text",
    "official_title" "text",
    "file_path" "text",
    "file_type" "text",
    "is_fillable" boolean DEFAULT false,
    "field_name" "text",
    "field_type" "text",
    "field_index" integer,
    "scan_status" "text" DEFAULT 'pending'::"text",
    "scan_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."court_form_fields" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."court_form_overlays" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "form_id" "text",
    "court_type" "text",
    "form_number" "text",
    "official_title" "text",
    "field_key" "text" NOT NULL,
    "field_label" "text",
    "page_number" integer DEFAULT 1 NOT NULL,
    "x" numeric NOT NULL,
    "y" numeric NOT NULL,
    "width" numeric,
    "height" numeric,
    "font_size" numeric DEFAULT 10,
    "font_name" "text" DEFAULT 'Helvetica'::"text",
    "is_multiline" boolean DEFAULT false,
    "text_align" "text" DEFAULT 'left'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."court_form_overlays" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."court_form_sources" (
    "id" bigint NOT NULL,
    "jurisdiction" "text" DEFAULT 'Ontario'::"text" NOT NULL,
    "court_area" "text" NOT NULL,
    "source_name" "text" NOT NULL,
    "source_url" "text" NOT NULL,
    "source_type" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."court_form_sources" OWNER TO "postgres";


ALTER TABLE "public"."court_form_sources" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."court_form_sources_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."court_forms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "form_number" "text",
    "category" "text",
    "province" "text",
    "file_path" "text",
    "description" "text",
    "triggers" "text"[],
    "created_at" timestamp without time zone DEFAULT "now"(),
    "use_cases" "text"[],
    "official_title" "text",
    "purpose" "text",
    "procedure_stage" "text",
    "form_group" "text",
    "keywords" "text"[],
    "user_search_terms" "text"[],
    "ai_triggers" "text"[],
    "required_when" "text",
    "verified_source" "text",
    "verified_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."court_forms" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."family_form_lookup" AS
 SELECT "form_number",
    "official_title",
    "purpose",
    "procedure_stage",
    "form_group",
    "keywords",
    "user_search_terms",
    "ai_triggers",
    "required_when",
    "file_path",
    "verified_source",
    "verified_at"
   FROM "public"."court_forms"
  WHERE (("category" = 'family'::"text") AND ("province" = 'ontario'::"text"));


ALTER VIEW "public"."family_form_lookup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."form_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "case_type" "text" NOT NULL,
    "province" "text" DEFAULT 'Ontario'::"text" NOT NULL,
    "situation" "text" NOT NULL,
    "trigger_words" "text" NOT NULL,
    "required_forms" "text" NOT NULL,
    "optional_forms" "text",
    "explanation" "text" NOT NULL,
    "priority" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."form_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text",
    "form_number" "text",
    "category" "text",
    "description" "text",
    "file_url" "text",
    "use_case" "text"
);


ALTER TABLE "public"."forms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."legal_element_rules" (
    "id" bigint NOT NULL,
    "jurisdiction" "text" DEFAULT 'Ontario'::"text" NOT NULL,
    "court_area" "text" NOT NULL,
    "issue_name" "text" NOT NULL,
    "issue_category" "text",
    "legal_elements" "text"[] DEFAULT '{}'::"text"[],
    "plain_language_explanation" "text"[] DEFAULT '{}'::"text"[],
    "facts_needed" "text"[] DEFAULT '{}'::"text"[],
    "evidence_needed" "text"[] DEFAULT '{}'::"text"[],
    "defence_or_response_risks" "text"[] DEFAULT '{}'::"text"[],
    "judge_focus_points" "text"[] DEFAULT '{}'::"text"[],
    "drafting_guidance" "text"[] DEFAULT '{}'::"text"[],
    "official_source_name" "text",
    "official_source_url" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."legal_element_rules" OWNER TO "postgres";


ALTER TABLE "public"."legal_element_rules" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."legal_element_rules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."legal_evidence_rules" (
    "id" bigint NOT NULL,
    "jurisdiction" "text" DEFAULT 'Ontario'::"text" NOT NULL,
    "court_area" "text" NOT NULL,
    "issue_name" "text" NOT NULL,
    "evidence_category" "text" NOT NULL,
    "evidence_needed" "text"[] DEFAULT '{}'::"text"[],
    "weak_evidence_warnings" "text"[] DEFAULT '{}'::"text"[],
    "upload_prompts" "text"[] DEFAULT '{}'::"text"[],
    "evidence_labels" "text"[] DEFAULT '{}'::"text"[],
    "connects_to_forms" "text"[] DEFAULT '{}'::"text"[],
    "court_use_notes" "text"[] DEFAULT '{}'::"text"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."legal_evidence_rules" OWNER TO "postgres";


ALTER TABLE "public"."legal_evidence_rules" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."legal_evidence_rules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."legal_form_mapping_rules" (
    "id" bigint NOT NULL,
    "jurisdiction" "text" DEFAULT 'Ontario'::"text" NOT NULL,
    "court_area" "text" NOT NULL,
    "procedure_stage" "text" NOT NULL,
    "issue_name" "text",
    "already_completed_triggers" "text"[] DEFAULT '{}'::"text"[],
    "required_forms" "text"[] DEFAULT '{}'::"text"[],
    "optional_forms" "text"[] DEFAULT '{}'::"text"[],
    "not_needed_if_completed" "text"[] DEFAULT '{}'::"text"[],
    "missing_info_before_generation" "text"[] DEFAULT '{}'::"text"[],
    "form_purpose" "text",
    "generation_priority" "text" DEFAULT 'medium'::"text",
    "user_facing_next_step" "text",
    "court_use_notes" "text"[] DEFAULT '{}'::"text"[],
    "official_source_name" "text",
    "official_source_url" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "authority_source_id" "text",
    "authority_source_type" "text",
    "authority_citation" "text",
    "authority_pinpoint" "text",
    "authority_issuing_body" "text",
    "authority_checked_at" "date",
    "authority_review_status" "text",
    "authority_court_area" "text",
    "authority_topic" "text",
    "authority_stage_applicability" "text"[],
    "canonical_form_id" "uuid",
    "canonical_form_court_type" "text",
    "form_revision_or_effective_at" "text",
    "form_review_status" "text",
    "authority_bundle_version" "text",
    "applicability_conditions" "jsonb",
    "applicability_questions" "jsonb"
);


ALTER TABLE "public"."legal_form_mapping_rules" OWNER TO "postgres";


COMMENT ON COLUMN "public"."legal_form_mapping_rules"."applicability_conditions" IS 'Structured, fail-closed mapping prerequisites. Missing, false, ambiguous, or mismatched facts must remain review-required.';



COMMENT ON COLUMN "public"."legal_form_mapping_rules"."applicability_questions" IS 'Form Readiness question metadata: field_path, question, value_type, labelled choices, and optional explanation. This metadata collects facts only and never certifies form eligibility.';



ALTER TABLE "public"."legal_form_mapping_rules" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."legal_form_mapping_rules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."legal_issue_rules" (
    "id" bigint NOT NULL,
    "jurisdiction" "text" DEFAULT 'Ontario'::"text" NOT NULL,
    "court_area" "text" NOT NULL,
    "issue_name" "text" NOT NULL,
    "issue_category" "text",
    "plain_language_triggers" "text"[] DEFAULT '{}'::"text"[],
    "legal_elements" "text"[] DEFAULT '{}'::"text"[],
    "missing_info_questions" "text"[] DEFAULT '{}'::"text"[],
    "evidence_needed" "text"[] DEFAULT '{}'::"text"[],
    "risk_flags" "text"[] DEFAULT '{}'::"text"[],
    "possible_forms" "text"[] DEFAULT '{}'::"text"[],
    "judge_or_court_concerns" "text"[] DEFAULT '{}'::"text"[],
    "official_source_name" "text",
    "official_source_url" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."legal_issue_rules" OWNER TO "postgres";


ALTER TABLE "public"."legal_issue_rules" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."legal_issue_rules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."legal_procedure_rules" (
    "id" bigint NOT NULL,
    "jurisdiction" "text" DEFAULT 'Ontario'::"text" NOT NULL,
    "court_area" "text" NOT NULL,
    "procedure_stage" "text" NOT NULL,
    "rule_name" "text" NOT NULL,
    "trigger_facts" "text"[] DEFAULT '{}'::"text"[],
    "required_forms" "text"[] DEFAULT '{}'::"text"[],
    "optional_forms" "text"[] DEFAULT '{}'::"text"[],
    "documents_to_upload" "text"[] DEFAULT '{}'::"text"[],
    "missing_info_questions" "text"[] DEFAULT '{}'::"text"[],
    "evidence_needed" "text"[] DEFAULT '{}'::"text"[],
    "deadline_risks" "text"[] DEFAULT '{}'::"text"[],
    "common_user_mistakes" "text"[] DEFAULT '{}'::"text"[],
    "judge_or_court_concerns" "text"[] DEFAULT '{}'::"text"[],
    "official_source_name" "text",
    "official_source_url" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "authority_source_id" "text",
    "authority_source_type" "text",
    "authority_citation" "text",
    "authority_pinpoint" "text",
    "authority_issuing_body" "text",
    "authority_checked_at" "date",
    "authority_review_status" "text",
    "authority_court_area" "text",
    "authority_topic" "text",
    "authority_stage_applicability" "text"[],
    "authority_bundle_version" "text",
    "workflow_guidance" "text"[],
    "workflow_guidance_review_status" "text",
    "workflow_guidance_restricted_fields" "text"[],
    "workflow_guidance_source_id" "text",
    "workflow_guidance_source_type" "text",
    "workflow_guidance_official_source_url" "text",
    "workflow_guidance_citation" "text",
    "workflow_guidance_pinpoint" "text",
    "workflow_guidance_issuing_body" "text",
    "workflow_guidance_checked_at" "date",
    "workflow_guidance_court_area" "text",
    "workflow_guidance_stage_applicability" "text"[],
    "workflow_guidance_bundle_version" "text"
);


ALTER TABLE "public"."legal_procedure_rules" OWNER TO "postgres";


ALTER TABLE "public"."legal_procedure_rules" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."legal_procedure_rules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."legal_question_rules" (
    "id" bigint NOT NULL,
    "jurisdiction" "text" DEFAULT 'Ontario'::"text" NOT NULL,
    "court_area" "text" NOT NULL,
    "issue_name" "text",
    "procedure_stage" "text",
    "question_category" "text" NOT NULL,
    "trigger_when_missing" "text"[] DEFAULT '{}'::"text"[],
    "smart_questions" "text"[] DEFAULT '{}'::"text"[],
    "why_it_matters" "text"[] DEFAULT '{}'::"text"[],
    "answer_used_for" "text"[] DEFAULT '{}'::"text"[],
    "priority" "text" DEFAULT 'medium'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."legal_question_rules" OWNER TO "postgres";


ALTER TABLE "public"."legal_question_rules" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."legal_question_rules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."legal_risk_rules" (
    "id" bigint NOT NULL,
    "jurisdiction" "text" DEFAULT 'Ontario'::"text" NOT NULL,
    "court_area" "text" NOT NULL,
    "risk_name" "text" NOT NULL,
    "risk_category" "text",
    "plain_language_triggers" "text"[] DEFAULT '{}'::"text"[],
    "risk_explanation" "text"[] DEFAULT '{}'::"text"[],
    "facts_to_check" "text"[] DEFAULT '{}'::"text"[],
    "evidence_to_check" "text"[] DEFAULT '{}'::"text"[],
    "warning_message" "text",
    "severity" "text" DEFAULT 'medium'::"text",
    "related_forms" "text"[] DEFAULT '{}'::"text"[],
    "suggested_next_steps" "text"[] DEFAULT '{}'::"text"[],
    "judge_or_court_concerns" "text"[] DEFAULT '{}'::"text"[],
    "official_source_name" "text",
    "official_source_url" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."legal_risk_rules" OWNER TO "postgres";


ALTER TABLE "public"."legal_risk_rules" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."legal_risk_rules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pdf_field_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "form_id" "uuid",
    "file_path" "text" NOT NULL,
    "pdf_field_name" "text" NOT NULL,
    "mapped_key" "text" NOT NULL,
    "field_type" "text" DEFAULT 'text'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pdf_field_mappings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pdf_form_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "form_id" "uuid",
    "form_number" "text",
    "official_title" "text",
    "court_type" "text",
    "file_path" "text" NOT NULL,
    "page_count" integer DEFAULT 0,
    "field_count" integer DEFAULT 0,
    "has_acroform" boolean DEFAULT false,
    "likely_xfa" boolean DEFAULT false,
    "strategy" "text",
    "usable_for_autofill" boolean DEFAULT false,
    "fields" "jsonb" DEFAULT '[]'::"jsonb",
    "scan_error" "text",
    "scanned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pdf_form_inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pdf_overlay_fields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "form_id" "uuid",
    "file_path" "text" NOT NULL,
    "field_key" "text" NOT NULL,
    "field_label" "text",
    "page_number" integer DEFAULT 1 NOT NULL,
    "x_position" numeric NOT NULL,
    "y_position" numeric NOT NULL,
    "font_size" numeric DEFAULT 11,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pdf_overlay_fields" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."small_claims_form_lookup" (
    "id" bigint NOT NULL,
    "form_number" "text" NOT NULL,
    "official_title" "text",
    "purpose" "text",
    "procedure_stage" "text",
    "form_group" "text",
    "file_path" "text"
);


ALTER TABLE "public"."small_claims_form_lookup" OWNER TO "postgres";


ALTER TABLE "public"."small_claims_form_lookup" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."small_claims_form_lookup_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."case_documents"
    ADD CONSTRAINT "case_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."case_evidence"
    ADD CONSTRAINT "case_evidence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."case_generated_documents"
    ADD CONSTRAINT "case_generated_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."case_intakes"
    ADD CONSTRAINT "case_intakes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cases"
    ADD CONSTRAINT "cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."civil_form_lookup"
    ADD CONSTRAINT "civil_form_lookup_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."court_form_fields"
    ADD CONSTRAINT "court_form_fields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."court_form_library"
    ADD CONSTRAINT "court_form_library_file_path_unique" UNIQUE ("file_path");



ALTER TABLE ONLY "public"."court_form_overlays"
    ADD CONSTRAINT "court_form_overlays_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."court_form_sources"
    ADD CONSTRAINT "court_form_sources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."court_forms"
    ADD CONSTRAINT "court_forms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_rules"
    ADD CONSTRAINT "form_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "formscourt forms database_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legal_element_rules"
    ADD CONSTRAINT "legal_element_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legal_evidence_rules"
    ADD CONSTRAINT "legal_evidence_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legal_form_mapping_rules"
    ADD CONSTRAINT "legal_form_mapping_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legal_issue_rules"
    ADD CONSTRAINT "legal_issue_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legal_procedure_rules"
    ADD CONSTRAINT "legal_procedure_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legal_question_rules"
    ADD CONSTRAINT "legal_question_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."legal_risk_rules"
    ADD CONSTRAINT "legal_risk_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pdf_field_mappings"
    ADD CONSTRAINT "pdf_field_mappings_file_path_pdf_field_name_key" UNIQUE ("file_path", "pdf_field_name");



ALTER TABLE ONLY "public"."pdf_field_mappings"
    ADD CONSTRAINT "pdf_field_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pdf_form_inventory"
    ADD CONSTRAINT "pdf_form_inventory_file_path_key" UNIQUE ("file_path");



ALTER TABLE ONLY "public"."pdf_form_inventory"
    ADD CONSTRAINT "pdf_form_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pdf_overlay_fields"
    ADD CONSTRAINT "pdf_overlay_fields_file_path_field_key_key" UNIQUE ("file_path", "field_key");



ALTER TABLE ONLY "public"."pdf_overlay_fields"
    ADD CONSTRAINT "pdf_overlay_fields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."small_claims_form_lookup"
    ADD CONSTRAINT "small_claims_form_lookup_pkey" PRIMARY KEY ("id");



CREATE INDEX "court_form_fields_court_type_idx" ON "public"."court_form_fields" USING "btree" ("court_type");



CREATE INDEX "court_form_fields_file_path_idx" ON "public"."court_form_fields" USING "btree" ("file_path");



CREATE INDEX "court_form_fields_form_id_idx" ON "public"."court_form_fields" USING "btree" ("form_id");



CREATE INDEX "court_form_fields_form_number_idx" ON "public"."court_form_fields" USING "btree" ("form_number");



CREATE INDEX "court_form_overlays_court_type_idx" ON "public"."court_form_overlays" USING "btree" ("court_type");



CREATE INDEX "court_form_overlays_form_number_idx" ON "public"."court_form_overlays" USING "btree" ("form_number");



CREATE INDEX "legal_element_rules_court_area_idx" ON "public"."legal_element_rules" USING "btree" ("court_area");



CREATE INDEX "legal_element_rules_issue_name_idx" ON "public"."legal_element_rules" USING "btree" ("issue_name");



CREATE INDEX "legal_evidence_rules_court_area_idx" ON "public"."legal_evidence_rules" USING "btree" ("court_area");



CREATE INDEX "legal_evidence_rules_issue_name_idx" ON "public"."legal_evidence_rules" USING "btree" ("issue_name");



CREATE INDEX "legal_form_mapping_rules_court_area_idx" ON "public"."legal_form_mapping_rules" USING "btree" ("court_area");



CREATE INDEX "legal_form_mapping_rules_issue_idx" ON "public"."legal_form_mapping_rules" USING "btree" ("issue_name");



CREATE INDEX "legal_form_mapping_rules_stage_idx" ON "public"."legal_form_mapping_rules" USING "btree" ("procedure_stage");



CREATE INDEX "legal_issue_rules_court_area_idx" ON "public"."legal_issue_rules" USING "btree" ("court_area");



CREATE INDEX "legal_issue_rules_issue_name_idx" ON "public"."legal_issue_rules" USING "btree" ("issue_name");



CREATE INDEX "legal_procedure_rules_court_area_idx" ON "public"."legal_procedure_rules" USING "btree" ("court_area");



CREATE INDEX "legal_procedure_rules_stage_idx" ON "public"."legal_procedure_rules" USING "btree" ("procedure_stage");



CREATE INDEX "legal_question_rules_court_area_idx" ON "public"."legal_question_rules" USING "btree" ("court_area");



CREATE INDEX "legal_question_rules_issue_idx" ON "public"."legal_question_rules" USING "btree" ("issue_name");



CREATE INDEX "legal_question_rules_stage_idx" ON "public"."legal_question_rules" USING "btree" ("procedure_stage");



CREATE INDEX "legal_risk_rules_court_area_idx" ON "public"."legal_risk_rules" USING "btree" ("court_area");



CREATE INDEX "legal_risk_rules_risk_name_idx" ON "public"."legal_risk_rules" USING "btree" ("risk_name");



CREATE INDEX "legal_risk_rules_severity_idx" ON "public"."legal_risk_rules" USING "btree" ("severity");



CREATE OR REPLACE TRIGGER "set_cases_updated_at" BEFORE UPDATE ON "public"."cases" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."case_documents"
    ADD CONSTRAINT "case_documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."case_documents"
    ADD CONSTRAINT "case_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."case_evidence"
    ADD CONSTRAINT "case_evidence_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."case_evidence"
    ADD CONSTRAINT "case_evidence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."case_generated_documents"
    ADD CONSTRAINT "case_generated_documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."case_generated_documents"
    ADD CONSTRAINT "case_generated_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."case_intakes"
    ADD CONSTRAINT "case_intakes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."case_intakes"
    ADD CONSTRAINT "case_intakes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cases"
    ADD CONSTRAINT "cases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow insert field mappings" ON "public"."pdf_field_mappings" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow insert overlay fields" ON "public"."pdf_overlay_fields" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public read court form fields" ON "public"."court_form_fields" FOR SELECT USING (true);



CREATE POLICY "Allow public read court form library" ON "public"."court_form_library" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read field mappings" ON "public"."pdf_field_mappings" FOR SELECT USING (true);



CREATE POLICY "Allow public read pdf form inventory" ON "public"."pdf_form_inventory" FOR SELECT USING (true);



CREATE POLICY "Allow read overlay fields" ON "public"."pdf_overlay_fields" FOR SELECT USING (true);



CREATE POLICY "Allow scanner insert pdf form inventory" ON "public"."pdf_form_inventory" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow scanner update pdf form inventory" ON "public"."pdf_form_inventory" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Allow update field mappings" ON "public"."pdf_field_mappings" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Allow update overlay fields" ON "public"."pdf_overlay_fields" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Users manage own cases" ON "public"."cases" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own documents" ON "public"."case_documents" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own evidence" ON "public"."case_evidence" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own generated documents" ON "public"."case_generated_documents" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users manage own intakes" ON "public"."case_intakes" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."case_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."case_evidence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."case_generated_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."case_intakes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cases" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cases_delete_own" ON "public"."cases" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "cases_insert_own" ON "public"."cases" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "cases_select_own" ON "public"."cases" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "cases_update_own" ON "public"."cases" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."civil_form_lookup" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."court_form_fields" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."court_form_library" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."court_form_overlays" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."court_form_sources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."court_forms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dev_full_access_civil_form_lookup" ON "public"."civil_form_lookup" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access_court_form_sources" ON "public"."court_form_sources" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access_court_forms" ON "public"."court_forms" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access_form_rules" ON "public"."form_rules" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access_forms" ON "public"."forms" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access_legal_element_rules" ON "public"."legal_element_rules" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access_legal_evidence_rules" ON "public"."legal_evidence_rules" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access_legal_form_mapping_rules" ON "public"."legal_form_mapping_rules" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access_legal_issue_rules" ON "public"."legal_issue_rules" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access_legal_procedure_rules" ON "public"."legal_procedure_rules" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access_legal_question_rules" ON "public"."legal_question_rules" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access_legal_risk_rules" ON "public"."legal_risk_rules" USING (true) WITH CHECK (true);



CREATE POLICY "dev_full_access_small_claims_form_lookup" ON "public"."small_claims_form_lookup" USING (true) WITH CHECK (true);



ALTER TABLE "public"."form_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."legal_element_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."legal_evidence_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."legal_form_mapping_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."legal_issue_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."legal_procedure_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."legal_question_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."legal_risk_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pdf_field_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pdf_form_inventory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pdf_overlay_fields" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public read court forms" ON "public"."court_forms" FOR SELECT TO "anon" USING ((("category" = 'family'::"text") AND ("province" = 'ontario'::"text")));



ALTER TABLE "public"."small_claims_form_lookup" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."case_documents" TO "anon";
GRANT ALL ON TABLE "public"."case_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."case_documents" TO "service_role";



GRANT ALL ON TABLE "public"."case_evidence" TO "anon";
GRANT ALL ON TABLE "public"."case_evidence" TO "authenticated";
GRANT ALL ON TABLE "public"."case_evidence" TO "service_role";



GRANT ALL ON TABLE "public"."case_generated_documents" TO "anon";
GRANT ALL ON TABLE "public"."case_generated_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."case_generated_documents" TO "service_role";



GRANT ALL ON TABLE "public"."case_intakes" TO "anon";
GRANT ALL ON TABLE "public"."case_intakes" TO "authenticated";
GRANT ALL ON TABLE "public"."case_intakes" TO "service_role";



GRANT ALL ON TABLE "public"."cases" TO "anon";
GRANT ALL ON TABLE "public"."cases" TO "authenticated";
GRANT ALL ON TABLE "public"."cases" TO "service_role";



GRANT ALL ON TABLE "public"."civil_form_lookup" TO "anon";
GRANT ALL ON TABLE "public"."civil_form_lookup" TO "authenticated";
GRANT ALL ON TABLE "public"."civil_form_lookup" TO "service_role";



GRANT ALL ON SEQUENCE "public"."civil_form_lookup_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."civil_form_lookup_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."civil_form_lookup_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."court_form_library" TO "anon";
GRANT ALL ON TABLE "public"."court_form_library" TO "authenticated";
GRANT ALL ON TABLE "public"."court_form_library" TO "service_role";



GRANT ALL ON TABLE "public"."court_form_master_view" TO "anon";
GRANT ALL ON TABLE "public"."court_form_master_view" TO "authenticated";
GRANT ALL ON TABLE "public"."court_form_master_view" TO "service_role";



GRANT ALL ON TABLE "public"."court_form_clean_view" TO "anon";
GRANT ALL ON TABLE "public"."court_form_clean_view" TO "authenticated";
GRANT ALL ON TABLE "public"."court_form_clean_view" TO "service_role";



GRANT ALL ON TABLE "public"."court_form_fields" TO "anon";
GRANT ALL ON TABLE "public"."court_form_fields" TO "authenticated";
GRANT ALL ON TABLE "public"."court_form_fields" TO "service_role";



GRANT ALL ON TABLE "public"."court_form_overlays" TO "anon";
GRANT ALL ON TABLE "public"."court_form_overlays" TO "authenticated";
GRANT ALL ON TABLE "public"."court_form_overlays" TO "service_role";



GRANT ALL ON TABLE "public"."court_form_sources" TO "anon";
GRANT ALL ON TABLE "public"."court_form_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."court_form_sources" TO "service_role";



GRANT ALL ON SEQUENCE "public"."court_form_sources_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."court_form_sources_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."court_form_sources_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."court_forms" TO "anon";
GRANT ALL ON TABLE "public"."court_forms" TO "authenticated";
GRANT ALL ON TABLE "public"."court_forms" TO "service_role";



GRANT ALL ON TABLE "public"."family_form_lookup" TO "anon";
GRANT ALL ON TABLE "public"."family_form_lookup" TO "authenticated";
GRANT ALL ON TABLE "public"."family_form_lookup" TO "service_role";



GRANT ALL ON TABLE "public"."form_rules" TO "anon";
GRANT ALL ON TABLE "public"."form_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."form_rules" TO "service_role";



GRANT ALL ON TABLE "public"."forms" TO "anon";
GRANT ALL ON TABLE "public"."forms" TO "authenticated";
GRANT ALL ON TABLE "public"."forms" TO "service_role";



GRANT ALL ON TABLE "public"."legal_element_rules" TO "anon";
GRANT ALL ON TABLE "public"."legal_element_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."legal_element_rules" TO "service_role";



GRANT ALL ON SEQUENCE "public"."legal_element_rules_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."legal_element_rules_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."legal_element_rules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."legal_evidence_rules" TO "anon";
GRANT ALL ON TABLE "public"."legal_evidence_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."legal_evidence_rules" TO "service_role";



GRANT ALL ON SEQUENCE "public"."legal_evidence_rules_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."legal_evidence_rules_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."legal_evidence_rules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."legal_form_mapping_rules" TO "anon";
GRANT ALL ON TABLE "public"."legal_form_mapping_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."legal_form_mapping_rules" TO "service_role";



GRANT ALL ON SEQUENCE "public"."legal_form_mapping_rules_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."legal_form_mapping_rules_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."legal_form_mapping_rules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."legal_issue_rules" TO "anon";
GRANT ALL ON TABLE "public"."legal_issue_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."legal_issue_rules" TO "service_role";



GRANT ALL ON SEQUENCE "public"."legal_issue_rules_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."legal_issue_rules_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."legal_issue_rules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."legal_procedure_rules" TO "anon";
GRANT ALL ON TABLE "public"."legal_procedure_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."legal_procedure_rules" TO "service_role";



GRANT ALL ON SEQUENCE "public"."legal_procedure_rules_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."legal_procedure_rules_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."legal_procedure_rules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."legal_question_rules" TO "anon";
GRANT ALL ON TABLE "public"."legal_question_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."legal_question_rules" TO "service_role";



GRANT ALL ON SEQUENCE "public"."legal_question_rules_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."legal_question_rules_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."legal_question_rules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."legal_risk_rules" TO "anon";
GRANT ALL ON TABLE "public"."legal_risk_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."legal_risk_rules" TO "service_role";



GRANT ALL ON SEQUENCE "public"."legal_risk_rules_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."legal_risk_rules_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."legal_risk_rules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pdf_field_mappings" TO "anon";
GRANT ALL ON TABLE "public"."pdf_field_mappings" TO "authenticated";
GRANT ALL ON TABLE "public"."pdf_field_mappings" TO "service_role";



GRANT ALL ON TABLE "public"."pdf_form_inventory" TO "anon";
GRANT ALL ON TABLE "public"."pdf_form_inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."pdf_form_inventory" TO "service_role";



GRANT ALL ON TABLE "public"."pdf_overlay_fields" TO "anon";
GRANT ALL ON TABLE "public"."pdf_overlay_fields" TO "authenticated";
GRANT ALL ON TABLE "public"."pdf_overlay_fields" TO "service_role";



GRANT ALL ON TABLE "public"."small_claims_form_lookup" TO "anon";
GRANT ALL ON TABLE "public"."small_claims_form_lookup" TO "authenticated";
GRANT ALL ON TABLE "public"."small_claims_form_lookup" TO "service_role";



GRANT ALL ON SEQUENCE "public"."small_claims_form_lookup_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."small_claims_form_lookup_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."small_claims_form_lookup_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































