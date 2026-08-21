-- canonical_form_id is catalog identity only. It does not establish legal
-- verification, currentness, filing readiness, or recommendation mapping.
ALTER TABLE public.court_form_library
  ADD COLUMN IF NOT EXISTS canonical_form_id uuid;

DO $$
DECLARE
  form_group_record record;
  resolved_canonical_form_id uuid;
BEGIN
  FOR form_group_record IN
    SELECT
      court_type,
      COALESCE(form_number, ''::text) AS grouped_form_number,
      official_title,
      count(DISTINCT canonical_form_id)
        FILTER (WHERE canonical_form_id IS NOT NULL) AS non_null_id_count,
      (array_agg(DISTINCT canonical_form_id)
        FILTER (WHERE canonical_form_id IS NOT NULL))[1] AS existing_canonical_form_id
    FROM public.court_form_library
    WHERE is_active = true
    GROUP BY court_type, COALESCE(form_number, ''::text), official_title
  LOOP
    IF form_group_record.non_null_id_count = 1 THEN
      resolved_canonical_form_id := form_group_record.existing_canonical_form_id;
    ELSIF form_group_record.non_null_id_count = 0 THEN
      resolved_canonical_form_id := gen_random_uuid();
    ELSE
      -- Conflicting IDs are intentionally left unchanged for future review.
      CONTINUE;
    END IF;

    UPDATE public.court_form_library
    SET canonical_form_id = resolved_canonical_form_id
    WHERE is_active = true
      AND canonical_form_id IS NULL
      AND court_type IS NOT DISTINCT FROM form_group_record.court_type
      AND COALESCE(form_number, ''::text) = form_group_record.grouped_form_number
      AND official_title IS NOT DISTINCT FROM form_group_record.official_title;
  END LOOP;
END $$;

CREATE OR REPLACE VIEW public.court_form_master_view AS
SELECT
  court_type,
  COALESCE(form_number, ''::text) AS form_number,
  official_title,
  max(
    CASE
      WHEN file_path ~~* '%.pdf'::text THEN file_path
      ELSE NULL::text
    END) AS pdf_path,
  max(
    CASE
      WHEN file_path ~~* '%.doc%'::text THEN file_path
      ELSE NULL::text
    END) AS word_path,
  max(form_group) AS form_group,
  max(procedure_stage) AS procedure_stage,
  max(purpose) AS purpose,
  count(*) AS version_count,
  CASE
    WHEN count(*) FILTER (WHERE canonical_form_id IS NULL) = 0
      AND count(DISTINCT canonical_form_id) = 1
    THEN (array_agg(canonical_form_id)
      FILTER (WHERE canonical_form_id IS NOT NULL))[1]
    ELSE NULL::uuid
  END AS canonical_form_id
FROM public.court_form_library
WHERE is_active = true
GROUP BY court_type, COALESCE(form_number, ''::text), official_title;

CREATE OR REPLACE VIEW public.court_form_clean_view AS
SELECT
  court_type,
  form_number,
  official_title,
  pdf_path,
  word_path,
  form_group,
  procedure_stage,
  purpose,
  version_count,
  canonical_form_id
FROM public.court_form_master_view
WHERE form_number <> ''::text
  AND official_title !~~* '%notice to profession%'::text
  AND official_title !~~* '%practice direction%'::text
  AND official_title !~~* '%law society%'::text;

COMMENT ON COLUMN public.court_form_library.canonical_form_id IS
  'Catalog identity only; it does not establish legal verification, currentness, filing readiness, or recommendation mapping.';
COMMENT ON VIEW public.court_form_master_view IS
  'Catalog read model. Null or conflicting canonical_form_id values are review-required for future consumers.';
COMMENT ON VIEW public.court_form_clean_view IS
  'Catalog read model. Null or conflicting canonical_form_id values are review-required for future consumers.';
