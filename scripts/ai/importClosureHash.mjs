#!/usr/bin/env node
/**
 * Prints one hash of every file the given entry files import, followed
 * transitively (relative imports and the "@/" alias; packages are skipped).
 *
 * WHY (2026-10-08). CI's billed safety suite was keyed on hashFiles('src/**'),
 * so a change to any file under src -- a fee table, a citation -- re-ran 14
 * real OpenAI calls, and with the OpenAI balance empty it failed the build of
 * a change the suite never reads. Keyed on this hash, the suite re-runs exactly
 * when code it actually executes changes, and never otherwise.
 *
 * Usage: [CLOSURE_ROOT=<checkout>] node scripts/ai/importClosureHash.mjs <entry> [<entry> ...]
 * Prints: <sha256>  (and, with --list, the files hashed, to stderr)
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// CLOSURE_ROOT hashes another checkout (CI compares the pull request with main).
const ROOT = path.resolve(process.env.CLOSURE_ROOT || path.join(import.meta.dirname, "..", ".."));
const EXTENSIONS = ["", ".ts", ".tsx", ".mjs", ".js", ".json", "/index.ts", "/index.tsx", "/index.js"];
const IMPORT = /(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g;

export function resolveImport(fromFile, specifier) {
  let base;
  if (specifier.startsWith("@/")) base = path.join(ROOT, specifier.slice(2));
  else if (specifier.startsWith(".")) base = path.resolve(path.dirname(fromFile), specifier);
  else return null;
  for (const extension of EXTENSIONS) {
    const candidate = base + extension;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export function importClosure(entries) {
  const seen = new Set();
  const queue = entries.map((entry) => path.resolve(ROOT, entry));
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (file.endsWith(".json")) continue;
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(IMPORT)) {
      const resolved = resolveImport(file, match[1] ?? match[2] ?? match[3]);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return [...seen].sort();
}

export function closureHash(entries) {
  const hash = createHash("sha256");
  for (const file of importClosure(entries)) {
    hash.update(path.relative(ROOT, file));
    hash.update("\0");
    hash.update(readFileSync(file));
  }
  return hash.digest("hex");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const entries = process.argv.slice(2).filter((arg) => arg !== "--list");
  if (!entries.length) {
    console.error("usage: importClosureHash.mjs <entry> [<entry> ...]");
    process.exit(2);
  }
  if (process.argv.includes("--list")) for (const file of importClosure(entries)) console.error(path.relative(ROOT, file));
  console.log(closureHash(entries));
}
