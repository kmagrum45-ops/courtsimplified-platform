-- Seed preamble for `supabase db reset`.
--
-- KNOWN LIMITATION (upstream of this file)
-- `db reset` from scratch currently fails at migration 20260810000010 due to
-- one-shot repair migrations with pre-repair guards that can't be satisfied on
-- replay. This is a structural issue in the historical migration chain, not the
-- seed mechanism. The fix requires either `supabase migration squash` or making
-- the three repair migrations idempotent -- both deferred as a deliberate
-- decision, not urgent since this does not affect production or CI.
--
-- The seed mechanism itself is verified against real data: loaded into a live
-- local Postgres, all 17 tables match the remote row-for-row (1371 rows) and
-- all 10 identity sequences restore with last_value = max(id).
--
-- This file does NOT contain data. It clears the tables that the catalogue
-- snapshot is authoritative for, and the snapshot itself is loaded immediately
-- afterwards. Both files are listed, in order, under [db.seed] sql_paths in
-- supabase/config.toml:
--
--     sql_paths = ["./seed.sql", "./snapshots/20260822_catalogue_data_snapshot.sql"]
--
-- Two files rather than one because the snapshot is a point-in-time artifact
-- regenerated wholesale from the remote; keeping it free of hand-written
-- statements means it can be replaced without re-adding them. The CLI executes
-- seed files over a normal connection, not through psql, so the psql \i include
-- meta-command is unavailable and ordering has to come from sql_paths.
--
-- WHY THE TRUNCATE IS REQUIRED
-- Seeds run after migrations. The 2026-08-10 bundles INSERT into
-- legal_form_mapping_rules, so that table is already populated by the time the
-- snapshot loads, and the snapshot supplies explicit "id" values with no
-- ON CONFLICT clause. Without this reset the seed fails on a duplicate key.
--
-- RESTART IDENTITY resets the identity sequences to 1; the snapshot's trailing
-- setval() calls then restore the real high-water marks, so the first insert
-- after a reset does not collide.
--
-- No CASCADE: none of these tables is the target of a foreign key (all nine in
-- the schema belong to the case_* family), so a plain TRUNCATE succeeds and
-- cannot reach beyond this list.

TRUNCATE TABLE
  public.civil_form_lookup,
  public.court_form_fields,
  public.court_form_library,
  public.court_form_sources,
  public.court_forms,
  public.form_rules,
  public.forms,
  public.legal_element_rules,
  public.legal_evidence_rules,
  public.legal_form_mapping_rules,
  public.legal_issue_rules,
  public.legal_procedure_rules,
  public.legal_question_rules,
  public.legal_risk_rules,
  public.pdf_form_inventory,
  public.pdf_overlay_fields,
  public.small_claims_form_lookup
RESTART IDENTITY;
