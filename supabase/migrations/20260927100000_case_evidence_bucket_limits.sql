-- The case-evidence bucket carries a size limit and a type allowlist of its own.
--
-- *** WHY: THE ROUTE IS NOT ON A PATH THE CLIENT HAS TO TAKE ***
--
-- 20260823020500 grants authenticated users INSERT on storage.objects for this
-- bucket wherever (storage.foldername(name))[1] = auth.uid()::text. That is the
-- right rule, and it also means a user holding their own valid JWT can upload
-- straight to Supabase Storage without ever calling our route. So every check in
-- src/lib/case-workspace/fileValidation.ts — size, and type read from the file's
-- own bytes — is advisory: it runs on a path the client can simply not use.
--
-- Read on staging (icpvzwxyjsdgyqfkwycw) on 2026-09-27:
--
--     bucket case-evidence  public=false  file_size_limit=null  allowed_mime_types=null
--
-- Private, correctly. But unbounded in size and open to any content type, so a
-- direct upload had no ceiling at all.
--
-- *** WHAT THIS ACTUALLY BUYS, STATED HONESTLY ***
--
-- `file_size_limit` is real enforcement. Storage rejects an object over the limit
-- whatever the client says, because it counts the bytes.
--
-- `allowed_mime_types` is WEAKER THAN IT LOOKS, and it matters that the next
-- person knows this. Storage compares it against the content type the CLIENT
-- DECLARES on the upload. It does not read the file. So a direct uploader who
-- declares `application/pdf` can still store any bytes they like.
--
-- That residual is accepted, for a reason worth writing down rather than
-- discovering later:
--
--   * The bucket is private and the policies are owner-scoped, so whatever a user
--     stores this way lands in their own folder and only they can read it. It is
--     not a route to another litigant's documents, which is the incident that
--     matters.
--   * Nothing in this product executes or renders a stored object. Objects are
--     served through short-lived signed URLs.
--   * Therefore the byte-level check is the real type control, and it is the
--     reason nothing downstream may trust the stored mime. Extraction and any AI
--     payload re-read the bytes.
--
-- So the two layers are not redundant copies of one check. The bucket stops
-- unbounded size on a path we do not control; the route decides type from bytes on
-- the path the app uses. Neither one alone is the answer.
--
-- *** THE LIMIT IS STATED IN TWO PLACES, SO A CHECK TIES THEM TOGETHER ***
--
-- 26214400 bytes is 25 MB, and it is also MAX_DOCUMENT_BYTES in
-- src/lib/case-workspace/fileValidation.ts. Two copies of a number drift.
-- `npm run test:workspace-upload` parses this file and asserts the two agree, so
-- changing one alone fails rather than producing a route that accepts a file
-- storage will refuse.
--
-- *** ADDITIVE ONLY ***
--
-- No DROP, no DELETE, no TRUNCATE. Idempotent: re-running it changes nothing.
-- Both values are TIGHTENINGS from null. Nothing in this repository has uploaded
-- to this bucket yet — the workspace is the first thing that will — so no existing
-- object can be affected. Applied to STAGING ONLY via the gated runner;
-- production is Jason's to apply. CLAUDE.md §6.

INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES (
    'case-evidence',
    'case-evidence',
    false,
    26214400,
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/tiff',
        'image/webp',
        'image/heic',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/rtf',
        'text/plain'
    ]::"text"[]
)
ON CONFLICT ("id") DO UPDATE
    SET "public" = false,
        "file_size_limit" = 26214400,
        "allowed_mime_types" = EXCLUDED."allowed_mime_types";
