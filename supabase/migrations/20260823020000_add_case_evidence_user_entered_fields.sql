-- Phase 0 of the evidence-intelligence build-out. case_evidence already has
-- correct RLS (auth.uid() = user_id, TO authenticated) and a storage_path
-- column, but no field for the user-entered description/date/source/
-- relevance text the intake UI already collects into `uploadedEvidenceFiles`.
-- `analysis` jsonb is reserved for computed output (from evidenceEngine.ts's
-- tagging), not user input -- these are added as plain columns instead of
-- folded into that jsonb, because timelineEngine.ts's chronological sort
-- needs to order on evidence_date directly.
--
-- Table mapping confirmed as part of this change, not altered by it:
-- case_evidence = user-uploaded evidence, case_documents = filed/received
-- court documents, case_generated_documents = AI-drafted output. No changes
-- to case_documents or case_generated_documents in this migration.

ALTER TABLE public.case_evidence
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS evidence_date date,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS relevance text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'case_evidence'
      AND column_name IN ('description', 'evidence_date', 'source', 'relevance')
    HAVING COUNT(*) = 4
  ) THEN
    RAISE EXCEPTION 'Expected case_evidence to have all four new columns after this migration';
  END IF;
END
$$;
