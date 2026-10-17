/**
 * How every saved source is shown to a reader: its name, the page a person
 * opens, and the date its text was saved and checked (walkthrough run
 * 38525903567, senior-lawyer review, 2026-10-14).
 *
 * WHY. CLAUDE.md s. 2: every card, claim or assertion carries its source and
 * the date it was verified. Two surfaces broke it:
 *   - the full answer's Sources list dropped every source that is not one of
 *     the stage map's own (citations.ts SOURCE_NAMES): sentences proved from
 *     the Small Claims guides ("guide-after-judgment", "guide-replying-to-a-
 *     claim") showed no source at all;
 *   - no Sources list and no "What we looked into" passage showed a date.
 * The names and URLs for the stage map's own sources stay in citations.ts;
 * every other source takes its name, page and date from the corpus manifest
 * (docs/sources/corpus/manifest.json), and a court decision from the retrieval
 * index and the date docs/sources/README.md records for its file.
 *
 * Writes src/lib/content-library/published/sourceDisplay.generated.json.
 * test:published-library checks it is current and that every source a
 * published answer cites resolves to a name, a page and a date.
 *
 * Run: npx tsx scripts/content/buildSourceDisplay.ts            (writes)
 *      npx tsx scripts/content/buildSourceDisplay.ts --check    (fails if stale)
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { OFFICIAL_URLS, SOURCE_NAMES } from "../../src/lib/case-system/stage-map/citations";
import { readableUrl } from "../../src/lib/case-system/retrieval/corpusChunker";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const SOURCE_DISPLAY_FILE = path.join(ROOT, "src/lib/content-library/published/sourceDisplay.generated.json");

type ManifestEntry = { id: string; title: string; citation?: string; url: string; retrievedAt: string };
type IndexSource = { id: string; title: string; citation?: string; url: string; readableUrl?: string; tier: string; file?: string; path?: string };
export type SourceDisplayRow = { name: string; url: string; checkedOn: string };
export type SourceDisplayFile = { note: string; sources: Record<string, SourceDisplayRow> };

const isLegislationUrl = (url: string) => /ontario\.ca\/laws\/docs\//.test(url) || /laws-lois\.justice\.gc\.ca/.test(url);

/** A saved page or Act as a reader sees it named. */
function nameFor(entry: ManifestEntry): string {
  if (entry.id in SOURCE_NAMES) return SOURCE_NAMES[entry.id as keyof typeof SOURCE_NAMES];
  const citation = (entry.citation ?? "").trim();
  if (!citation) return entry.title;
  if (isLegislationUrl(entry.url)) return `${entry.title}, ${citation}`;
  // "ontario.ca — Guide to Procedures in Small Claims Court" + "...: After judgment".
  const publisher = citation.split(" — ")[0].trim();
  return `${publisher}, ${entry.title}`;
}

/**
 * The date docs/sources/README.md records for a decision's file: the
 * "Downloaded" (or retrieved) date of the entry headed by the file, or of the
 * section whose table lists it. Null when the README gives none.
 */
export function readmeDateFor(readme: string, names: string[]): string | null {
  const blocks = readme.split(/\n(?=#{2,4} )/);
  const named = (text: string) => names.some((name) => name.length > 8 && text.includes(name));
  const dated = (block: string) =>
    /\*\*(?:Downloaded|Retrieved|Read|Saved|Fetched)[^*]*:\*\*\s*(\d{4}-\d{2}-\d{2})/i.exec(block)?.[1] ??
    /\bDownloaded:?\s+(\d{4}-\d{2}-\d{2})/i.exec(block)?.[1] ??
    null;
  for (const block of blocks) {
    if (named(block.split("\n")[0]) && dated(block)) return dated(block);
  }
  for (const block of blocks) {
    const row = block.split("\n").find((line) => line.startsWith("|") && named(line));
    if (!row) continue;
    const inRow = /(\d{4}-\d{2}-\d{2})/.exec(row)?.[1];
    if (inRow) return inRow;
    if (dated(block)) return dated(block);
  }
  return null;
}

export function buildSourceDisplay(): SourceDisplayFile {
  const manifest = JSON.parse(readFileSync(path.join(ROOT, "docs/sources/corpus/manifest.json"), "utf8")) as { entries: ManifestEntry[] };
  const index = JSON.parse(readFileSync(path.join(ROOT, "docs/sources/retrieval/corpus-index.json"), "utf8")) as { sources: Record<string, IndexSource> };
  const readme = readFileSync(path.join(ROOT, "docs/sources/README.md"), "utf8");
  const sources: Record<string, SourceDisplayRow> = {};
  for (const entry of [...manifest.entries].sort((a, b) => a.id.localeCompare(b.id))) {
    const url = entry.id in OFFICIAL_URLS ? OFFICIAL_URLS[entry.id as keyof typeof OFFICIAL_URLS] : (index.sources[entry.id]?.readableUrl || readableUrl(entry));
    sources[entry.id] = { name: nameFor(entry), url, checkedOn: entry.retrievedAt.slice(0, 10) };
  }
  // Court decisions and past versions of a law (docs/sources/decisions/, historical/): not in the manifest.
  for (const source of Object.values(index.sources).sort((a, b) => a.id.localeCompare(b.id))) {
    if (sources[source.id]) continue;
    const names = [source.url.replace(/^docs\/sources\//, ""), source.path ?? "", (source.path ?? "").replace(/^(?:decisions|historical)\//, ""), source.file ?? ""]
      .filter(Boolean)
      .flatMap((name) => [name, name.replace(/\.english\.txt$|\.html\.txt$|\.txt$|\.pdf$/, "")]);
    // "(and `-2006-10-19`, ...)": one README entry covering several dated files.
    const dated = /-(\d{4}-\d{2}-\d{2})\.txt$/.exec(source.path ?? "");
    if (dated) names.push(`\`-${dated[1]}\``);
    const checkedOn = readmeDateFor(readme, names);
    // No date, no row: test:published-library then names the decision.
    if (!checkedOn) continue;
    sources[source.id] = { name: `${source.title}, ${source.citation ?? ""}`.replace(/, $/, ""), url: source.readableUrl ?? "", checkedOn };
  }
  return {
    note: "GENERATED by scripts/content/buildSourceDisplay.ts from the corpus manifest, the retrieval index and docs/sources/README.md. Do not edit by hand.",
    sources,
  };
}

function main() {
  const text = `${JSON.stringify(buildSourceDisplay(), null, 2)}\n`;
  if (process.argv.includes("--check")) {
    const saved = readFileSync(SOURCE_DISPLAY_FILE, "utf8");
    if (saved !== text) {
      console.error("sourceDisplay.generated.json is stale: run npx tsx scripts/content/buildSourceDisplay.ts");
      process.exit(1);
    }
    console.log("sourceDisplay.generated.json is current.");
    return;
  }
  writeFileSync(SOURCE_DISPLAY_FILE, text);
  console.log(`wrote ${Object.keys(JSON.parse(text).sources).length} sources to ${path.relative(ROOT, SOURCE_DISPLAY_FILE)}`);
}

/*
 * *** THIS GUARD USED TO NEVER MATCH, AND FAILED SILENTLY ***
 *
 * It compared `import.meta.url` against "file://" + process.argv[1]. When argv[1]
 * is RELATIVE -- which is how npx/tsx passes it -- that compares
 * "file://scripts/content/..." with "file:///C:/Users/.../scripts/content/...", so
 * they never match: main() never ran, nothing was written, and the process exited 0.
 * Running it with --check printed nothing and succeeded, which reads as "the
 * generated file is current" when nothing had been checked at all.
 *
 * Found 2026-10-17: three bot PRs failed CI on "every source in the search index has
 * a checked date" because a newly added Act had no source-display row, and
 * regenerating it locally appeared to do nothing whatsoever.
 *
 * pathToFileURL resolves a relative argv against the working directory and produces
 * the same absolute file: URL that import.meta.url carries.
 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
