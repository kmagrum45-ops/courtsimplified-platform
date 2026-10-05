/**
 * Vendors the authoritative sources, with provenance.
 *
 *   npm run rules:fetch
 *
 * *** WHAT "PROVENANCE" MEANS HERE ***
 *
 * For every source: the URL it came from, the moment it was retrieved, a
 * sha256 of the extracted text, and the consolidation line the document states
 * about itself. All four go in `docs/sources/corpus/manifest.json` and the
 * manifest is committed.
 *
 * The hash is what makes `rules:check` possible: a re-fetch that produces a
 * different hash means the law moved, and every content block citing a changed
 * rule needs re-verification. Without it the watcher could only say "something
 * is different", which is not actionable.
 *
 * *** IT REFUSES RATHER THAN GUESSES ***
 *
 * A fetch that 403s, an extraction that yields little text, or a document
 * whose header does not carry its declared marker all stop that source with a
 * reason. Part 1 of the brief is explicit: if a source cannot be fetched,
 * STOP and list it — never reconstruct rule text from memory.
 *
 * A partial run writes what it got and exits non-zero with the list, so the
 * report can say exactly which sources are missing rather than implying a full
 * corpus.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

import { extract, keepSection } from "./extractText";

import { CORPUS_SOURCES, type CorpusSource } from "./corpusSources";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CORPUS_DIR = path.join(ROOT, "docs", "sources", "corpus");
const MANIFEST = path.join(CORPUS_DIR, "manifest.json");

export type CorpusEntry = {
  id: string;
  title: string;
  citation: string;
  url: string;
  retrievedAt: string;
  sha256: string;
  /** The line the document states about its own currency. */
  consolidation: string;
  characters: number;
  lines: number;
  file: string;
};

export type CorpusManifest = {
  generatedAt: string;
  entries: CorpusEntry[];
  /** Sources that could not be vendored, and why. Never silently empty. */
  failures: Array<{ id: string; url: string; reason: string }>;
};

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * The consolidation line a document states about itself.
 *
 * "CONSOLIDATION PERIOD: FROM ... TO THE E-LAWS CURRENCY DATE" means current.
 * "HISTORICAL VERSION FOR THE PERIOD ..." means frozen, and citing one is how
 * a claim type came to be sourced against law that predated the section it
 * relied on.
 */
export function consolidationLine(text: string): string {
  const match =
    /^.*(?:CONSOLIDATION PERIOD|HISTORICAL VERSION FOR THE PERIOD).*$/im.exec(text);
  return match ? match[0].trim().replace(/\s+/g, " ") : "(none stated)";
}





/**
 * Default backstop against an error page served with HTTP 200.
 *
 * A source may override it. See CorpusSource.minCharacters for why a fixed
 * threshold was the wrong shape.
 */
const DEFAULT_MIN_CHARACTERS = 2_000;

async function fetchOne(
  source: CorpusSource,
): Promise<{ entry?: CorpusEntry; failure?: { id: string; url: string; reason: string } }> {
  let buffer: Buffer;

  /*
   * *** A HUMAN-SUPPLIED SNAPSHOT IS READ FROM DISK, NEVER FETCHED ***
   *
   * These exist precisely because the URL does not yield the page -- a 403, a
   * cookie banner, a JavaScript notice. Fetching would either fail or vendor the
   * banner, which is the failure the length floor catches for ordinary sources.
   *
   * The URL is still recorded in the manifest: a reader must be able to open the
   * page for themselves. It just is not what we read.
   *
   * Everything after this branch is shared with fetched sources on purpose --
   * same markers, same length floor, same hash, same manifest entry. A snapshot
   * is second-tier in what it may support, not in how carefully it is checked.
   */
  if (source.format === "human-snapshot") {
    const snapshot = source.snapshot;
    if (!snapshot) {
      return {
        failure: {
          id: source.id,
          url: source.url,
          reason: "format is human-snapshot but no snapshot provenance is declared",
        },
      };
    }
    const saved = path.join(ROOT, snapshot.localPath);
    if (!existsSync(saved)) {
      return {
        failure: {
          id: source.id,
          url: source.url,
          reason: `saved file missing: ${snapshot.localPath} -- see docs/infra/human-list.md`,
        },
      };
    }
    buffer = readFileSync(saved);
  } else {

  try {
    const response = await fetch(source.url, {
      headers: {
        // e-Laws and ontariocourtforms both serve a plain agent fine; this is
        // identification, not evasion.
        "User-Agent": "CourtSimplified-rules-corpus (compliance vendoring)",
      },
    });

    if (!response.ok) {
      return { failure: { id: source.id, url: source.url, reason: `HTTP ${response.status}` } };
    }

    buffer = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    return {
      failure: {
        id: source.id,
        url: source.url,
        reason: `fetch failed: ${error instanceof Error ? error.name : "unknown"}`,
      },
    };
  }

  }

  let text: string;
  try {
    text = extract(source.format, buffer, source.snapshot?.localPath);
  } catch (error) {
    return {
      failure: {
        id: source.id,
        url: source.url,
        reason: `extraction failed: ${error instanceof Error ? error.message.slice(0, 120) : "unknown"}`,
      },
    };
  }

  if (source.section) {
    const kept = keepSection(text, source.section);
    if (kept === null) {
      return {
        failure: { id: source.id, url: source.url, reason: `section markers not found: "${source.section.from}" .. "${source.section.to}"` },
      };
    }
    text = kept;
  }

  const minimum = source.minCharacters ?? DEFAULT_MIN_CHARACTERS;
  if (text.length < minimum) {
    return {
      failure: {
        id: source.id,
        url: source.url,
        reason: `extracted only ${text.length} characters, below this source's minimum of ${minimum}`,
      },
    };
  }

  const missing = source.mustContain.filter(
    (marker) => !text.toUpperCase().includes(marker.toUpperCase()),
  );
  if (missing.length > 0) {
    return {
      failure: {
        id: source.id,
        url: source.url,
        reason: `missing required marker(s): ${missing.join("; ")}`,
      },
    };
  }

  const file = `${source.id}.txt`;
  writeFileSync(path.join(CORPUS_DIR, file), text, "utf8");

  return {
    entry: {
      id: source.id,
      title: source.title,
      citation: source.citation,
      url: source.url,
      retrievedAt: new Date().toISOString(),
      sha256: sha256(text),
      consolidation: consolidationLine(text),
      characters: text.length,
      lines: text.split("\n").length,
      file,
    },
  };
}

export function readManifest(): CorpusManifest | null {
  if (!existsSync(MANIFEST)) return null;
  return JSON.parse(readFileSync(MANIFEST, "utf8")) as CorpusManifest;
}

/**
 * `--only id1,id2` fetches just those sources and MERGES them into the existing
 * manifest, leaving every other vendored file and entry untouched. Added
 * 2026-09-30 for adding new sources (the vendor-sources workflow): a full
 * re-fetch overwrites every vendored copy, which is exactly the evidence
 * `rules:check` needs to see what changed -- SOURCING_NOTES.md, "run rules:check
 * BEFORE rules:fetch". Adding a source should not re-vendor the other 180.
 */
function onlyIds(): string[] | null {
  const index = process.argv.indexOf("--only");
  if (index === -1) return null;
  return (process.argv[index + 1] || "").split(",").map((id) => id.trim()).filter(Boolean);
}

async function main(): Promise<void> {
  mkdirSync(CORPUS_DIR, { recursive: true });

  const only = onlyIds();
  const previous = only ? readManifest() : null;
  const entries: CorpusEntry[] = previous ? previous.entries.filter((entry) => !only!.includes(entry.id)) : [];
  const failures: CorpusManifest["failures"] = previous
    ? previous.failures.filter((failure) => !only!.includes(failure.id))
    : [];

  const unknown = (only ?? []).filter((id) => !CORPUS_SOURCES.some((source) => source.id === id));
  if (unknown.length > 0) {
    console.log(`Unknown source id(s): ${unknown.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  for (const source of CORPUS_SOURCES.filter((item) => !only || only.includes(item.id))) {
    process.stdout.write(`${source.id.padEnd(38)} `);
    const { entry, failure } = await fetchOne(source);

    if (entry) {
      entries.push(entry);
      console.log(`ok  ${String(entry.characters).padStart(8)} chars  ${entry.sha256.slice(0, 12)}`);
      console.log(`${" ".repeat(39)}${entry.consolidation.slice(0, 96)}`);
    } else if (failure) {
      failures.push(failure);
      console.log(`FAILED  ${failure.reason}`);
    }
  }

  const manifest: CorpusManifest = {
    generatedAt: previous ? previous.generatedAt : new Date().toISOString(),
    entries,
    failures,
  };
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log("");
  console.log(`${entries.length} vendored, ${failures.length} failed.`);
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST)}`);

  if (failures.length > 0) {
    console.log("");
    console.log("SOURCES MISSING FROM THE CORPUS:");
    for (const failure of failures) console.log(`  ${failure.id} — ${failure.reason}`);
    console.log("");
    console.log("Nothing may be written from memory to fill these. Record them in the");
    console.log("report and leave the content that would have cited them unwritten.");
    process.exitCode = 1;
  }
}

if (process.argv[1] && process.argv[1].endsWith("fetchCorpus.ts")) {
  void main();
}
