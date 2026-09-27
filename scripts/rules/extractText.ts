/**
 * Turning a fetched source into the text that gets vendored and hashed.
 *
 * *** WHY THIS IS SHARED ***
 *
 * `rules:fetch` vendors, `rules:check` re-fetches and compares. If they
 * extracted differently by even a space, every check would report every source
 * as changed — the watch would be permanently red and therefore ignored. One
 * implementation is not tidiness; it is the thing that makes the comparison
 * mean anything.
 */

import { writeFileSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

/**
 * e-Laws documents are old-format OLE compound files, not .docx, so a
 * zip-based parser sees nothing. `antiword` reads them; it is available in
 * this environment at /mingw64/bin/antiword.
 */
export function extractDoc(buffer: Buffer): string {
  const temporary = path.join(os.tmpdir(), `corpus-${process.pid}-${Date.now()}.doc`);
  writeFileSync(temporary, buffer);
  try {
    return execFileSync("antiword", [temporary], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } finally {
    try {
      unlinkSync(temporary);
    } catch {
      // A leftover temp file is not worth failing a corpus fetch over.
    }
  }
}

/**
 * HTML to text, with navigation removed.
 *
 * *** WHY THE STRIPPING MATTERS TO THE CHANGE WATCH ***
 *
 * A practical source is a live web page. Its nav, cookie banner, breadcrumbs
 * and footer change for reasons that have nothing to do with court procedure,
 * and each of those moves the content hash — so `rules:check` would report
 * "the fee page changed" in a week when a menu item was renamed. A watch that
 * cries wolf is a watch people stop reading.
 *
 * IT FAILS SAFE. If a site restructures and these rules stop matching, MORE
 * text survives, not less: the hash moves, the watch reports a change, a person
 * looks. The opposite failure — silently stripping real content — could hide a
 * fee change, so the rules are deliberately conservative. Element names only,
 * no class-name guessing.
 */
export function extractHtml(buffer: Buffer): string {
  return buffer
    .toString("utf8")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    // Table cells become tab-separated, so the forms table survives as a table.
    .replace(/<\/t[dh]>\s*/gi, "\t")
    .replace(/<\/tr>\s*/gi, "\n")
    // Block elements become line breaks, so a heading does not run into the
    // paragraph beneath it — which matters when a verifier has to quote one.
    .replace(/<\/(p|h[1-6]|li|div|section|article)>\s*/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&[a-z]+;/gi, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}


/**
 * A PDF saved by hand from a browser.
 *
 * `pdftotext -layout` keeps the column structure, which matters because these
 * are guidance pages with tables in them, and a table flattened into one column
 * reads as gibberish and would be quoted as gibberish.
 *
 * Available here as pdftotext 4.00. A snapshot that cannot be extracted fails the
 * fetch rather than vendoring an empty file — same rule as every other format.
 */
export function extractPdf(buffer: Buffer): string {
  const temporary = path.join(os.tmpdir(), `corpus-${process.pid}-${Date.now()}.pdf`);
  writeFileSync(temporary, buffer);
  try {
    return execFileSync("pdftotext", ["-layout", temporary, "-"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } finally {
    try {
      unlinkSync(temporary);
    } catch {
      // A leftover temp file is not worth failing a vendor run over.
    }
  }
}

/**
 * A human-supplied snapshot carries no format of its own — it is whatever the
 * person saved. So the caller passes the SAVED FILE'S extension, and this decides
 * from that. An unknown extension is a hard failure: silently treating a .docx as
 * HTML would vendor tag soup and hash it as though it were text.
 */
export function extractSnapshot(localPath: string, buffer: Buffer): string {
  const lower = localPath.toLowerCase();
  if (lower.endsWith(".pdf")) return extractPdf(buffer);
  if (lower.endsWith(".html") || lower.endsWith(".htm") || lower.endsWith(".mhtml")) {
    return extractHtml(buffer);
  }
  throw new Error(
    `snapshot ${localPath} has an extension this pipeline cannot extract. ` +
      `Save the page as HTML ("Web page, complete" or "Web page, HTML only") or as PDF.`,
  );
}

export function extract(
  format: "elaws-doc" | "html" | "human-snapshot",
  buffer: Buffer,
  localPath?: string,
): string {
  if (format === "human-snapshot") {
    if (!localPath) throw new Error("a human-snapshot needs the saved file's path to know how to read it");
    return extractSnapshot(localPath, buffer);
  }
  return format === "elaws-doc" ? extractDoc(buffer) : extractHtml(buffer);
}
