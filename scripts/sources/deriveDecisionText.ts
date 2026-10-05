/**
 * Derives the English text of each saved Supreme Court judgment PDF, for
 * retrieval and quoting.
 *
 *   npm run sources:decisions-text
 *
 * The S.C.R. PDFs are printed in two columns, English left and French right,
 * under the same paragraph numbers. A plain extraction interleaves the two
 * line by line, so a quote longer than a line never matches
 * (SOURCING_NOTES.md, "Bilingual SCC judgments"). This keeps the English
 * column of `pdftotext -layout`: each line cut at the first run of three or
 * more spaces after its text begins, lines that begin in the right column
 * dropped, and a word broken across lines ("employ-" / "ment") joined only
 * when the joined word appears unbroken elsewhere in the same judgment (so
 * "cross-examine" keeps its hyphen).
 *
 * Writes docs/sources/decisions/<name>.english.txt beside the existing
 * derived copies. Never overwrites one that exists: the cross-forum notes
 * quote from kerr-v-baranow-2011-SCC-10.english.txt as it is. Scanned PDFs
 * with no text layer produce nothing and are reported; their text comes
 * from the Court's own HTML page instead (Fetch Decisions workflow).
 *
 * Needs `pdftotext` (poppler-utils).
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SOURCES = path.join(ROOT, "docs", "sources");
const OUT = path.join(SOURCES, "decisions");

export function englishColumn(layout: string): string {
  const lines = layout.split(/\r?\n/);
  // Where the right column starts: the most common start of text after a
  // wide gap, across the document.
  const starts = new Map<number, number>();
  for (const line of lines) {
    const match = /^(\s*\S.*?\s{3,})(\S)/.exec(line);
    if (match) starts.set(match[1].length, (starts.get(match[1].length) ?? 0) + 1);
  }
  const rightColumn = [...starts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 60;
  const kept: string[] = [];
  for (const line of lines) {
    const firstText = line.search(/\S/);
    if (firstText < 0) {
      kept.push("");
      continue;
    }
    // A paragraph number alone in the outer margin. On a left-hand page the
    // outer margin is on the right, past the French column, so the number
    // would be dropped with it; it numbers both columns, so keep it.
    const marginNumber = /^\s+(\d{1,3})\s*$/.exec(line);
    if (marginNumber && firstText >= rightColumn) {
      kept.push(marginNumber[1]);
      continue;
    }
    // ...or at the end of a line of text, past the French column.
    let text = line;
    const trailing = /^(.*\S)\s{2,}(\d{1,3})\s*$/.exec(line);
    if (trailing && line.lastIndexOf(trailing[2]) >= rightColumn + 30) {
      kept.push(trailing[2]);
      text = trailing[1];
    }
    if (firstText >= rightColumn - 8) continue; // a line of the French column only
    const cut = /^(\s*\S.*?)\s{3,}\S/.exec(text);
    kept.push((cut ? cut[1] : text).trimEnd());
  }
  // Soft hyphens (U+00AD) mark where the typesetter may break a word; one at
  // the end of a line is a break to undo, any other is invisible noise that
  // stops a quote matching.
  const text = kept.join("\n").replace(/\u00AD\s*\n\s*/g, "").replace(/\u00AD\s?/g, "");
  const words = new Set(text.toLowerCase().match(/[a-zà-ÿ]+/g) ?? []);
  // Join "employ-\nment" when "employment" appears unbroken elsewhere.
  return text.replace(/([A-Za-zÀ-ÿ]+)-\n(\s*)([a-zà-ÿ]+)/g, (whole, head: string, space: string, tail: string) =>
    words.has(`${head}${tail}`.toLowerCase()) ? `${head}${tail}\n${space}` : whole,
  );
}

/**
 * Cleans the text of a judgment page from the Court's own site (the Fetch
 * Decisions workflow strips tags line by line, so a tag that spans lines
 * leaves its attributes behind, and the page's CSS and scripts come too).
 * Keeps the judgment from its "Indexed as" line to the end of the reasons.
 */
export function cleanCourtHtmlText(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const start = Math.max(0, lines.findIndex((line) => /Indexed as:/.test(line)));
  let end = lines.findIndex((line, index) => index > start && /_paq\.push|^\s*\(function\(\)|window\.modalClose|You are being directed to the most recent|jQueryDecisia/.test(line));
  if (end < 0) end = lines.length;
  return lines
    .slice(start, end)
    .map((line) =>
      line
        .replace(/<[^>]*>/g, "")
        .replace(/^[^"<>]*"\s*>/, "") // the tail of a tag that began on the line before
        .replace(/&nbsp;/g, " ")
        .replace(/\u00AD/g, "")
        .trimEnd(),
    )
    .filter((line) => !/^\s*<p\b/.test(line) && !/^\s*-?\d+(\.\d+)?pt[;"]/.test(line))
    .join("\n");
}

function main() {
  const htmlAt = process.argv.indexOf("--html");
  if (htmlAt > 0) {
    // npm run sources:decisions-text -- --html <fetched .txt> <name>
    const [input, name] = process.argv.slice(htmlAt + 1, htmlAt + 3);
    const out = path.join(OUT, `${name}.html.txt`);
    writeFileSync(out, cleanCourtHtmlText(readFileSync(input, "utf8")) + "\n");
    console.log(`wrote     ${path.relative(ROOT, out)}`);
    return;
  }
  const pdfs = readdirSync(SOURCES).filter((file) => /-(SCC-\d+|\d-SCR-\d+)\.pdf$/.test(file));
  for (const pdf of pdfs) {
    const out = path.join(OUT, pdf.replace(/\.pdf$/, ".english.txt"));
    if (existsSync(out)) {
      console.log(`kept      ${path.relative(ROOT, out)} (exists)`);
      continue;
    }
    const layout = execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", path.join(SOURCES, pdf), "-"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    if (layout.replace(/\s+/g, "").length < 500) {
      console.log(`no text   ${pdf} (scanned; use the Court's HTML page)`);
      continue;
    }
    writeFileSync(out, englishColumn(layout));
    console.log(`wrote     ${path.relative(ROOT, out)}`);
  }
}

if (process.argv[1] && /deriveDecisionText/.test(process.argv[1])) main();
