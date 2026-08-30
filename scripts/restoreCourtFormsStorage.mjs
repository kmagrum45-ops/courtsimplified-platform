#!/usr/bin/env node
/**
 * Copies every object in one project's `court-forms` bucket to another,
 * preserving exact paths, and verifies the copy byte-for-byte on the
 * destination. Safe to re-run (uploads use x-upsert).
 *
 * Why this exists: `court-forms` holds 700+ real PDF/DOCX files (177 MB+)
 * that no migration or seed file can reproduce -- they're binary assets
 * uploaded directly to Storage, outside git entirely. Recreating a project
 * (a region move, a fresh dev/staging environment, disaster recovery) needs
 * a repeatable way to carry them over, not a one-off manual download/upload.
 *
 * Does NOT use the Storage list API's root-level `list` call directly --
 * that call does not recurse into subfolders (folders come back as
 * `{id: null, metadata: null}` placeholders), which is exactly what made an
 * earlier audit of this bucket wrongly conclude it was empty (see
 * docs/ARCHITECTURE.md, "Storage — corrects an earlier, wrong claim on this
 * page"). This script recurses into every folder placeholder explicitly, so
 * it cannot repeat that mistake.
 *
 * Usage:
 *   node --import tsx scripts/restoreCourtFormsStorage.mjs --from-ref <ref> --to-ref <ref>
 *
 * Both projects' secret keys are fetched via `supabase projects api-keys
 * --reveal` (requires the Supabase CLI authenticated against both projects'
 * organization) and used only in-process -- never printed, logged, or
 * written to disk. File bytes pass through this process's memory only;
 * nothing is written to local disk.
 */

import { execSync } from "node:child_process";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--from-ref") args.fromRef = argv[i + 1];
    if (argv[i] === "--to-ref") args.toRef = argv[i + 1];
    if (argv[i] === "--bucket") args.bucket = argv[i + 1];
  }
  return args;
}

function fetchSecretKey(projectRef) {
  // Calls the `supabase` binary directly, not via `npx`: this CLI is a
  // global install in this project (not a package.json devDependency), and
  // `npx supabase ...` tries to resolve/install it from the registry
  // instead of using the one already on PATH -- observed hanging
  // indefinitely rather than erroring, so it's easy to miss.
  const raw = execSync(
    `supabase projects api-keys --project-ref ${projectRef} --reveal --output json`,
    { encoding: "utf8" },
  );
  const keys = JSON.parse(raw);
  const key =
    keys.find((k) => k.name === "default" && k.type === "secret") ||
    keys.find((k) => k.name === "service_role" && k.type === "legacy");
  if (!key) {
    throw new Error(`No secret or legacy service_role key found for project ${projectRef}.`);
  }
  return key.api_key;
}

// Recurses into every subfolder explicitly -- the list API never does this
// on its own. See the module docstring for why that distinction matters.
async function listAllObjects(base, headers, bucket, prefix = "") {
  const res = await fetch(`${base}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } }),
  });
  if (!res.ok) throw new Error(`list ${bucket}/${prefix}: ${res.status} ${await res.text()}`);
  const entries = await res.json();
  const files = [];
  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) {
      files.push(...(await listAllObjects(base, headers, bucket, path)));
    } else {
      files.push({ path, size: entry.metadata?.size ?? null });
    }
  }
  return files;
}

function mimeFor(name) {
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}

async function main() {
  const { fromRef, toRef, bucket = "court-forms" } = parseArgs(process.argv.slice(2));
  if (!fromRef || !toRef) {
    console.error("Usage: restoreCourtFormsStorage.mjs --from-ref <ref> --to-ref <ref> [--bucket <name>]");
    process.exitCode = 1;
    return;
  }

  const fromKey = fetchSecretKey(fromRef);
  const toKey = fetchSecretKey(toRef);
  const fromBase = `https://${fromRef}.supabase.co`;
  const toBase = `https://${toRef}.supabase.co`;
  const fromHeaders = { apikey: fromKey, Authorization: `Bearer ${fromKey}` };
  const toHeaders = { apikey: toKey, Authorization: `Bearer ${toKey}` };

  console.log(`Listing "${bucket}" on ${fromRef} (recursing into every folder)...`);
  const files = await listAllObjects(fromBase, fromHeaders, bucket);
  console.log(`Found ${files.length} object(s).`);

  let copied = 0, failed = 0;
  const failures = [];
  for (const f of files) {
    try {
      const downloadRes = await fetch(`${fromBase}/storage/v1/object/${bucket}/${encodeURI(f.path)}`, { headers: fromHeaders });
      if (!downloadRes.ok) throw new Error(`download failed: ${downloadRes.status}`);
      const buf = Buffer.from(await downloadRes.arrayBuffer());
      if (f.size != null && buf.length !== f.size) throw new Error(`downloaded size ${buf.length} != expected ${f.size}`);

      const uploadRes = await fetch(`${toBase}/storage/v1/object/${bucket}/${encodeURI(f.path)}`, {
        method: "POST",
        headers: { ...toHeaders, "Content-Type": mimeFor(f.path), "x-upsert": "true" },
        body: buf,
      });
      if (!uploadRes.ok) throw new Error(`upload failed: ${uploadRes.status} ${await uploadRes.text()}`);

      copied += 1;
      if (copied % 100 === 0) console.log(`  ...${copied}/${files.length}`);
    } catch (e) {
      failed += 1;
      failures.push(`${f.path}: ${e.message}`);
    }
  }

  console.log(`Copied: ${copied}, Failed: ${failed}`);
  if (failures.length) {
    console.log("Failures:");
    failures.forEach((f) => console.log("  " + f));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
