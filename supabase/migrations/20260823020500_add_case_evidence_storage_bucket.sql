-- Phase 1 of the evidence-intelligence build-out: a private Storage bucket
-- for real user-uploaded evidence files, with RLS on storage.objects mirroring
-- the row-level pattern already proven correct on case_evidence itself
-- (auth.uid() = user_id, TO authenticated).
--
-- Path convention: {user_id}/{case_id}/{evidence_id}/{filename}. The policies
-- below check only the first path segment against auth.uid() -- ownership is
-- enforced at that segment, case_id/evidence_id underneath are free-form so
-- the upload API can name objects however it needs to.
--
-- A pre-existing bucket named "case-files" (private, created 2026-05-14) was
-- found during Phase 1 planning but is unreferenced anywhere in the
-- codebase and has no objects in it -- its original purpose is unknown, so a
-- new, purpose-named bucket is created here instead of repurposing it.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('case-evidence', 'case-evidence', false, 52428800) -- 50 MiB, matches supabase/config.toml's local storage limit
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "case_evidence_storage_select_own"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'case-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "case_evidence_storage_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'case-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "case_evidence_storage_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'case-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'case-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "case_evidence_storage_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'case-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'case-evidence' AND public = false
  ) THEN
    RAISE EXCEPTION 'Expected a private case-evidence bucket to exist after this migration';
  END IF;

  IF (
    SELECT COUNT(*) FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname LIKE 'case_evidence_storage_%'
  ) != 4 THEN
    RAISE EXCEPTION 'Expected exactly 4 case_evidence storage policies (select/insert/update/delete)';
  END IF;
END
$$;
