-- Repair the URL-only formatting defect in the applied Ontario beta authority bundle.
-- This migration deliberately changes no authority metadata, procedure content, or form data.
UPDATE public.legal_procedure_rules AS rule
SET official_source_url = source.official_source_url
FROM (
  VALUES
    (1::bigint, 'small-claims'::text, 'https://www.ontario.ca/laws/regulation/980258'::text),
    (2::bigint, 'small-claims'::text, 'https://www.ontario.ca/laws/regulation/980258'::text),
    (11::bigint, 'small-claims'::text, 'https://www.ontario.ca/laws/regulation/980258'::text),
    (4::bigint, 'family'::text, 'https://www.ontario.ca/laws/regulation/990114'::text),
    (5::bigint, 'family'::text, 'https://www.ontario.ca/laws/regulation/990114'::text),
    (21::bigint, 'family'::text, 'https://www.ontario.ca/laws/regulation/990114'::text),
    (7::bigint, 'civil'::text, 'https://www.ontario.ca/laws/regulation/900194'::text),
    (8::bigint, 'civil'::text, 'https://www.ontario.ca/laws/regulation/900194'::text),
    (9::bigint, 'civil'::text, 'https://www.ontario.ca/laws/regulation/900194'::text),
    (38::bigint, 'civil'::text, 'https://www.ontario.ca/laws/regulation/900194'::text)
) AS source(id, court_area, official_source_url)
WHERE rule.id = source.id
  AND rule.court_area = source.court_area
  AND rule.authority_bundle_version = 'ontario-beta-v1'
  AND rule.is_active = true;
