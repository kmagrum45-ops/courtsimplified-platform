-- The case-evidence bucket exists and is PRIVATE, stated in a migration.
--
-- *** WHY THIS IS NEEDED: THE BUCKET IS NOT IN ANY MIGRATION ***
--
-- 20260823020500 creates four RLS policies on storage.objects scoped to
-- 'case-evidence' — select, insert, update and delete, each restricted to the
-- owner's own folder. It does NOT create the bucket, and nothing anywhere in
-- supabase/migrations touches storage.buckets.
--
-- So the bucket was created by hand in the dashboard, and whether it is public
-- or private is dashboard state that no migration asserts and no check reads.
-- A bucket holding uploaded EVIDENCE is the last place that should be true: if
-- somebody flips it public, nothing in this repository would notice, and the
-- RLS policies on storage.objects do not help — a public bucket serves objects
-- over an unauthenticated URL.
--
-- It also means staging cannot be brought to the same state as production by
-- running migrations, because the thing that differs is not in them.
--
-- *** WHAT THIS DOES ***
--
-- Idempotent and additive. Creates the bucket if it is missing; if it exists,
-- sets public = false and leaves everything else alone. No DROP, no DELETE, no
-- TRUNCATE. Re-running it changes nothing.
--
-- Setting public = false on a bucket that is currently public is a TIGHTENING,
-- and it would break any code relying on unauthenticated object URLs. Nothing
-- in this repository does: every read of case-evidence goes through a signed
-- URL or an authenticated client.
--
-- *** NOT APPLIED BY ANYTHING IN THIS REPOSITORY ***
--
-- CLAUDE.md §6. Staging first, then production, by REF never by name.

INSERT INTO "storage"."buckets" ("id", "name", "public")
VALUES ('case-evidence', 'case-evidence', false)
ON CONFLICT ("id") DO UPDATE
    SET "public" = false;
