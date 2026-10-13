/**
 * Fills each glossary source's title, citation and public url from the corpus
 * manifest, so authors write only the corpus id, a pinpoint and the quote.
 *
 *   node --import tsx scripts/glossary/fillSources.ts   (npm run glossary:sources)
 *
 * The manifest is not imported by the site itself: it is 230 KB and the
 * glossary module sits under the output guard, which is imported widely.
 * test:glossary re-derives every value here and fails if one is stale.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { publicSourceUrl } from "../../src/lib/content-library/publicSourceUrl";

export const ENTRIES_FILE = "src/lib/content-library/glossary/glossaryEntries.json";

type ManifestEntry = { id: string; title: string; citation: string; url: string; file?: string };

export function manifestEntries(root = process.cwd()): ManifestEntry[] {
  return JSON.parse(readFileSync(path.join(root, "docs/sources/corpus/manifest.json"), "utf8")).entries;
}

export function sourceMeta(id: string, manifest: ManifestEntry[]): { title: string; citation: string; url: string } | null {
  const found = manifest.find((entry) => entry.id === id);
  if (!found) return null;
  return { title: found.title, citation: found.citation, url: publicSourceUrl(found.url) ?? found.url };
}

if (process.argv[1] && process.argv[1].endsWith("fillSources.ts")) {
  const file = path.join(process.cwd(), ENTRIES_FILE);
  const data = JSON.parse(readFileSync(file, "utf8"));
  const manifest = manifestEntries();
  const missing = new Set<string>();
  for (const entry of data.entries) {
    entry.sources = entry.sources.map((source: { id: string; pinpoint: string; quote: string }) => {
      const meta = sourceMeta(source.id, manifest);
      if (!meta) missing.add(source.id);
      return { id: source.id, ...(meta ?? { title: "", citation: "", url: "" }), pinpoint: source.pinpoint, quote: source.quote };
    });
  }
  writeFileSync(file, JSON.stringify(data, null, 1) + "\n");
  console.log(`${data.entries.length} entries filled${missing.size ? `; NOT IN MANIFEST: ${[...missing].join(", ")}` : ""}`);
}
