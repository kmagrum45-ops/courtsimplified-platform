/**
 * Saves every courthouse page of the Ministry's own court directory, https://www.ontario.ca/locations/courts/ (site
 * owner, 15 Nov 2026: "fetch the 144 Ontario Court of Justice courthouse pages from the Ministry's own directory, same
 * fixed host list, one request at a time with a pause between requests, CanLII guard in place").
 *
 * The list of pages is read from the saved index (docs/sources/court-locations/ontario-ca-court-locations.html), never
 * from the network: only links of the form /locations/courts/<page>/ on www.ontario.ca. Every URL goes through
 * refuseCanliiContent, the host must be on the fixed list (and stay there after redirects), requests run one at a time
 * with PAUSE_MS between them, and a response that is not a courthouse page (for example the site's bot check) is not
 * saved. Writes each page's bytes as served, a `.txt` copy of what a reader sees, and manifest.json (url, date, bytes,
 * sha256) for docs/sources/README.md. Writes no wording. A page already in the manifest is skipped unless --all.
 *
 * Run: node --import tsx scripts/sources/fetchCourthousePages.ts [--all]
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { refuseCanliiContent } from "../../src/lib/canlii/canliiCore";
import { pageText } from "./pageText";

const HOSTS = new Set(["www.ontario.ca"]);
const INDEX = "docs/sources/court-locations/ontario-ca-court-locations.html";
export const PAGES_DIR = "docs/sources/court-locations/ontario-ca";
export const MANIFEST = `${PAGES_DIR}/manifest.json`;
const PAUSE_MS = 3000;

export type ManifestEntry = { slug: string; url: string; retrieved: string; bytes: number; sha256: string };

/** The courthouse pages the saved index links to, in the index's order. */
export function courthouseSlugs(indexHtml: string): string[] {
  const slugs: string[] = [];
  for (const [, slug] of indexHtml.matchAll(/href="\/locations\/courts\/([a-z0-9-]+)\/?"/g)) if (!slugs.includes(slug)) slugs.push(slug);
  return slugs;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const all = process.argv.includes("--all");
  const slugs = courthouseSlugs(readFileSync(INDEX, "utf8"));
  console.log(`${slugs.length} courthouse pages linked from the saved index`);
  mkdirSync(PAGES_DIR, { recursive: true });
  const manifest: ManifestEntry[] = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : [];
  const today = new Date().toISOString().slice(0, 10);
  let first = true;
  for (const slug of slugs) {
    if (!all && manifest.some((entry) => entry.slug === slug)) continue;
    const url = `https://www.ontario.ca/locations/courts/${slug}/`;
    refuseCanliiContent(url);
    if (!HOSTS.has(new URL(url).host)) throw new Error(`Refused: ${url} is not on the declared host list`);
    if (!first) await pause(PAUSE_MS);
    first = false;
    const response = await fetch(url, { headers: { "User-Agent": "CourtSimplified source vendoring" }, redirect: "follow" });
    refuseCanliiContent(response.url);
    if (!HOSTS.has(new URL(response.url).host)) throw new Error(`Refused: ${url} redirected to ${new URL(response.url).host}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const html = Buffer.from(bytes).toString("utf8");
    // A courthouse page is titled "<name> | Courts | ontario.ca"; the site's bot check is not. (Not every courthouse page has a
    // "Types of court and contacts" section: 311 Jarvis St., Toronto has none, 15 Nov 2026.)
    if (!response.ok || !/<title[^>]*>[^<]*\| Courts \| ontario\.ca<\/title>/.test(html)) { console.log(`NOT SAVED  ${url}: HTTP ${response.status}${response.ok ? ", not a courthouse page" : ""}`); continue; }
    writeFileSync(path.join(PAGES_DIR, `${slug}.html`), bytes);
    writeFileSync(path.join(PAGES_DIR, `${slug}.txt`), `${pageText(html)}\n`);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const entry: ManifestEntry = { slug, url, retrieved: today, bytes: bytes.length, sha256 };
    const at = manifest.findIndex((existing) => existing.slug === slug);
    if (at === -1) manifest.push(entry); else manifest[at] = entry;
    writeFileSync(MANIFEST, `${JSON.stringify(manifest.sort((a, b) => slugs.indexOf(a.slug) - slugs.indexOf(b.slug)), null, 1)}\n`);
    console.log(`SAVED  ${slug}  ${bytes.length} bytes  sha256 ${sha256}`);
  }
  console.log(`${manifest.length} of ${slugs.length} saved`);
}

if (process.argv[1]?.endsWith("fetchCourthousePages.ts")) void main();
