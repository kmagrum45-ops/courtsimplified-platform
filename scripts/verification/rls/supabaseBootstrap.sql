-- ===========================================================================
-- A STAND-IN FOR THE PARTS OF THE SUPABASE PLATFORM OUR MIGRATIONS LEAN ON.
--
-- Used only by `npm run test:rls-matrix` (scripts/verification/verifyRlsMatrix.mjs),
-- which builds a throwaway local Postgres, runs this file, then runs every file in
-- supabase/migrations/ in order, then attacks the result.
--
-- A real Supabase project creates all of this itself. This file exists so the RLS
-- suite can run in CI and on a laptop with no Supabase project, no Docker, no
-- network and no secrets.
--
-- *** EVERY DEFINITION HERE COPIES SUPABASE'S OWN ***
--
-- The suite is only as good as these stand-ins. If auth.uid() here read the JWT
-- differently from the real one, a policy could pass here and fail there. So each
-- function below is Supabase's published definition, not an approximation:
--
--   auth.uid()            reads request.jwt.claim.sub, falling back to
--                         request.jwt.claims ->> 'sub'  (supabase/auth migrations)
--   auth.role()           same pattern for 'role'
--   auth.jwt()            the whole claims object
--   storage.foldername()  every path segment except the file name
--                         (supabase/storage migrations)
--
-- The roles match too: anon and authenticated are NOLOGIN, NOINHERIT and do NOT
-- bypass RLS; service_role DOES bypass RLS, exactly as on the platform. A test that
-- SET ROLEs to `authenticated` and sets request.jwt.claims is doing what PostgREST
-- does for every API request.
--
-- What is NOT here: GoTrue, PostgREST, the Storage API server. The suite tests the
-- database layer, which is the layer RLS lives in. Things those servers do on top
-- (signed URLs, the bucket's MIME allow-list) are covered by the live staging suite
-- test:workspace-rls, and the gap report says so.
-- ===========================================================================

-- Roles -------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin SUPERUSER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    CREATE ROLE supabase_storage_admin NOLOGIN;
  END IF;
END
$$;

GRANT anon, authenticated, service_role TO authenticator;

-- The baseline dump re-owns the realtime publication; Supabase always has it.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- Schemas the baseline dump expects to exist --------------------------------

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS graphql;
CREATE SCHEMA IF NOT EXISTS vault;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

-- auth --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email text,
  role text,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;

GRANT EXECUTE ON FUNCTION auth.uid(), auth.role(), auth.jwt() TO anon, authenticated, service_role;

-- storage -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  owner uuid,
  public boolean DEFAULT false,
  avif_autodetection boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[],
  owner_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets (id),
  name text,
  owner uuid,
  owner_id text,
  metadata jsonb,
  path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
  version text,
  user_metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  CONSTRAINT bucketid_objname UNIQUE (bucket_id, name)
);

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Supabase grants the API roles full table privileges on storage and leaves the
-- deciding to RLS. Reproduced, because that is what makes the policies the only
-- thing standing between one user and another's files.
GRANT ALL ON storage.buckets TO anon, authenticated, service_role;
GRANT ALL ON storage.objects TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[]
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  _parts text[];
BEGIN
  SELECT string_to_array(name, '/') INTO _parts;
  RETURN _parts[1:array_length(_parts, 1) - 1];
END
$$;

CREATE OR REPLACE FUNCTION storage.filename(name text) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  _parts text[];
BEGIN
  SELECT string_to_array(name, '/') INTO _parts;
  RETURN _parts[array_length(_parts, 1)];
END
$$;

GRANT EXECUTE ON FUNCTION storage.foldername(text), storage.filename(text)
  TO anon, authenticated, service_role;
