/**
 * Saves the official sources the forms' wording list needs (docs/forms/wording-needed.md), from a FIXED list of URLs on
 * a FIXED list of official government hosts (site owner, 15 Nov 2026). Never CanLII: every URL goes through
 * refuseCanliiContent first, and any host not declared below is refused too. Writes the bytes as served, plus a plain
 * text copy of an HTML page for reading, and prints each file's sha256 for docs/sources/README.md. Writes no wording.
 *
 * Run: node --import tsx scripts/sources/fetchFormSources.ts
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { refuseCanliiContent } from "../../src/lib/canlii/canliiCore";
import { pageText } from "./pageText";

/** The only hosts this script fetches from: Ontario's and Canada's own sites. */
export const HOSTS = new Set(["www.ontario.ca", "laws-lois.justice.gc.ca", "ontariocourtforms.on.ca"]);

const SOURCES: { url: string; file: string }[] = [
  { url: "https://www.ontario.ca/page/prejudgment-and-postjudgment-interest-rates", file: "docs/sources/interest-rates/ontario-prejudgment-postjudgment-interest-rates.html" },
  { url: "https://laws-lois.justice.gc.ca/eng/acts/I-15/FullText.html", file: "docs/sources/federal/interest-act-I-15.html" },
  { url: "https://ontariocourtforms.on.ca/static/media/uploads/courtforms/scc/04a/scr-4a-jan21-en-fil.pdf", file: "docs/sources/forms-reference/scr-4a-jan21-en-fil.pdf" },
  { url: "https://www.ontario.ca/locations/courts/", file: "docs/sources/court-locations/ontario-ca-court-locations.html" },
];

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  for (const { url, file } of SOURCES) {
    refuseCanliiContent(url);
    const host = new URL(url).host;
    if (!HOSTS.has(host)) throw new Error(`Refused: ${host} is not on the declared list of official hosts`);
    const response = await fetch(url, { headers: { "User-Agent": "CourtSimplified source vendoring" }, redirect: "follow" });
    const finalHost = new URL(response.url).host;
    if (!HOSTS.has(finalHost)) throw new Error(`Refused: ${url} redirected to ${finalHost}`);
    refuseCanliiContent(response.url);
    if (!response.ok) { console.log(`NOT SAVED  ${url}: HTTP ${response.status}`); continue; }
    const bytes = new Uint8Array(await response.arrayBuffer());
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
    const sha = createHash("sha256").update(bytes).digest("hex");
    if (/html/i.test(response.headers.get("content-type") ?? "")) writeFileSync(file.replace(/\.html$/, ".txt"), `${pageText(Buffer.from(bytes).toString("utf8"))}\n`);
    console.log(`SAVED  ${file}  ${bytes.length} bytes  ${today}  sha256 ${sha}  (${response.headers.get("content-type")}, from ${response.url})`);
  }
}

void main();
