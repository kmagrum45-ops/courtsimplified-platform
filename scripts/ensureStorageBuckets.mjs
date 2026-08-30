#!/usr/bin/env node
/**
 * Idempotently ensures the Storage buckets this app depends on exist on a
 * given Supabase project. Safe to run against any project, any number of
 * times.
 *
 * Why this exists: `supabase migration squash` produces a schema-only dump —
 * it correctly omits DML, and a bucket row in storage.buckets is DML, not
 * DDL. That means every environment rebuilt from the squashed migration
 * (supabase/migrations/*.sql) is missing its buckets by construction, not by
 * accident. A raw `INSERT INTO storage.buckets` in a migration doesn't fix
 * this either: on a hosted project, `db push` runs as a role that RLS on
 * storage.buckets silently blocks from inserting (no error, no row) — this
 * was confirmed directly against courtsimplified-dev, where the migration
 * reported success but the row never landed. Bucket creation has to go
 * through the Storage API, which is what this script does.
 *
 * `case-files` is deliberately NOT in REQUIRED_BUCKETS. It exists in
 * production, is empty, and is unreferenced anywhere in this codebase (see
 * docs/ARCHITECTURE.md) -- an orphaned bucket of unknown origin. Recreating
 * it in every future environment would just propagate the mystery. If it
 * turns out to be needed, add it here deliberately, with a reason.
 *
 * Usage:
 *   node --import tsx scripts/ensureStorageBuckets.mjs --project-ref <ref>
 *
 * The project's secret key is fetched via `supabase projects api-keys
 * --reveal` for the given ref (requires the Supabase CLI to be authenticated
 * against that project's organization) and used only in-process -- it is
 * never printed, logged, or written to disk.
 *
 * The `supabase` binary is called directly below, not via `npx`: it's a
 * global install in this project (not a package.json devDependency), and
 * `npx supabase ...` tries to resolve/install it from the registry instead
 * of using the one already on PATH -- confirmed to hang indefinitely rather
 * than error, while running `supabase` directly resolves immediately.
 */

import { execSync } from "node:child_process";

const REQUIRED_BUCKETS = [
  { id: "case-evidence", public: false, fileSizeLimit: 50 * 1024 * 1024 },
  {
    id: "court-forms",
    public: true,
    // No original migration or tracked source ever set this bucket's limit
    // (it was created directly via the dashboard on production). Defaulting
    // to the same 50 MiB used elsewhere in this project for consistency --
    // not a verified production value.
    fileSizeLimit: 50 * 1024 * 1024,
  },
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--project-ref") args.projectRef = argv[i + 1];
  }
  return args;
}

function fetchSecretKey(projectRef) {
  const raw = execSync(
    `supabase projects api-keys --project-ref ${projectRef} --reveal --output json`,
    { encoding: "utf8" },
  );
  const keys = JSON.parse(raw);
  const key =
    keys.find((k) => k.name === "default" && k.type === "secret") ||
    keys.find((k) => k.name === "service_role" && k.type === "legacy");
  if (!key) {
    throw new Error(
      `No secret or legacy service_role key found for project ${projectRef}.`,
    );
  }
  return key.api_key;
}

async function listBuckets(base, headers) {
  const res = await fetch(`${base}/storage/v1/bucket`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to list buckets: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function createBucket(base, headers, bucket) {
  const res = await fetch(`${base}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      id: bucket.id,
      name: bucket.id,
      public: bucket.public,
      file_size_limit: bucket.fileSizeLimit,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to create bucket "${bucket.id}": ${res.status} ${await res.text()}`,
    );
  }
}

async function main() {
  const { projectRef } = parseArgs(process.argv.slice(2));
  if (!projectRef) {
    console.error("Usage: ensureStorageBuckets.mjs --project-ref <ref>");
    process.exitCode = 1;
    return;
  }

  const secretKey = fetchSecretKey(projectRef);
  const base = `https://${projectRef}.supabase.co`;
  const headers = { apikey: secretKey, Authorization: `Bearer ${secretKey}` };

  const existing = await listBuckets(base, headers);
  const existingIds = new Set(existing.map((b) => b.id));

  console.log(`Project ${projectRef}: ${existing.length} bucket(s) currently exist.`);

  for (const bucket of REQUIRED_BUCKETS) {
    if (existingIds.has(bucket.id)) {
      const current = existing.find((b) => b.id === bucket.id);
      const mismatch = current.public !== bucket.public;
      console.log(
        `  [present] ${bucket.id} (public=${current.public})` +
          (mismatch ? `  WARNING: expected public=${bucket.public}` : ""),
      );
      continue;
    }
    await createBucket(base, headers, bucket);
    console.log(`  [created] ${bucket.id} (public=${bucket.public})`);
  }

  console.log(
    "\nNote: storage.objects RLS policies are managed by supabase/migrations/, " +
      "not this script -- run migrations first, then this script.",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
