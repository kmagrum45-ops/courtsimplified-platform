/**
 * Getting the text out of an uploaded document, in pure JavaScript.
 *
 * WHAT THIS CATCHES: nothing by itself — it is the thing the checks are about. The
 * failure it exists to avoid is a document whose text nobody can search, date or
 * put in a chronology.
 *
 * *** WHY NOTHING HERE SHELLS OUT TO A BINARY, THOUGH THE REPOSITORY DOES ***
 *
 * `scripts/rules/extractText.ts` calls `pdftotext` and `antiword`, and does it
 * well. It CANNOT be reused here. That script runs at build time on a developer's
 * machine; this runs in a Node serverless function, where neither binary exists.
 * Checked before writing any of this: no route in this codebase shells out to a
 * binary, and on the development machine `tesseract` and `pdftoppm` are not
 * installed either.
 *
 * Reaching for the corpus extractor is the obvious move and it fails in production
 * only, which is the worst place to find out. Hence this second implementation, and
 * hence this paragraph.
 *
 * *** WHY NOT THE ADOBE SDK THAT IS ALREADY A DEPENDENCY ***
 *
 * `@adobe/pdfservices-node-sdk` is in package.json and, as of 2026-09-27, is
 * imported by nothing — zero hits across app/, src/ and scripts/. So it is not an
 * existing approved data flow; it is unused weight.
 *
 * Using it would mean sending litigants' medical records, bank statements and
 * lawyers' letters to a third-party processor outside Canada. Production sits in
 * ca-central-1 specifically for data residency (ARCHITECTURE.md), and adding a
 * cross-border processor for the most sensitive data this product holds is the site
 * owner's decision, not an implementation detail. It is therefore NOT used, and
 * that is recorded here so nobody adopts it as a convenience.
 *
 * *** WHAT CANNOT BE EXTRACTED, STATED PLAINLY ***
 *
 * Two formats have no pure-JS route and return `none`:
 *
 *   - a scanned image, or a PDF that is a picture of paper with no text layer.
 *     That needs OCR, which is a separate decision (size, cost and where it runs).
 *   - a legacy `.doc` OLE compound file. `antiword` reads them and is build-time
 *     only; no maintained pure-JS reader exists that is worth trusting with this.
 *
 * These are reported as `skipped` with a reason the user can read, NOT as `failed`
 * and never as an empty success. A document with no extracted text is still a
 * document: the user can label it, date it and give it an exhibit number by hand,
 * and everything in Part 3 works from those fields rather than from the text.
 * Silently storing "" would make an un-OCRable scan indistinguishable from a blank
 * page.
 *
 * NO MODEL IS CALLED ANYWHERE IN THIS FILE.
 */

import { unzipSync } from "fflate";

/** Matches `workspace_document_text.extraction_method`. */
export type ExtractionMethod = "pdf-text-layer" | "docx" | "plain" | "rtf" | "ocr" | "none";

export type ExtractionOutcome =
  | { status: "done"; method: ExtractionMethod; text: string; charCount: number }
  | {
      status: "skipped";
      method: "none";
      /** Shown to the user. Says what happened and what they can still do. */
      reason: string;
    }
  | { status: "failed"; method: ExtractionMethod; reason: string };

/**
 * Collapses the whitespace an extractor produces without destroying paragraphs.
 *
 * *** WHY NORMALISE AT ALL ***
 *
 * ACCURACY_ENGINE records that antiword's whitespace cost real time in the corpus
 * work. The same class of problem applies here for a different reason: a PDF text
 * layer arrives as positioned fragments, so a sentence can come back with a space
 * inside every word or none between words. Text nobody normalises is text nobody
 * can search, and a date parser handed "3  March  2026" and "3 March 2026" as
 * different strings will read one and miss the other.
 *
 * Blank lines are preserved as paragraph breaks because the chronology and the
 * communication log both read structure out of them.
 */
export function normaliseExtractedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    // A soft hyphen, and a hyphen at a line break, both split a word in two.
    .replace(/­/g, "")
    .replace(/(\w)-\n(\w)/g, "$1$2")
    .replace(/[ \t  - ]+/g, " ")
    .replace(/ *\n */g, "\n")
    // Three or more newlines is never meaningful structure; two is a paragraph.
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * True when an extractor "succeeded" but produced nothing a human could read.
 *
 * *** THIS IS THE CHECK THAT MATTERS MOST ***
 *
 * A scanned PDF has a text layer in the technical sense — it is just empty, or it
 * is a handful of stray characters from a header stamp. pdfjs returns that without
 * error, so the extraction looks like a success and stores nothing. The user is
 * then told the document was processed, searches for a word they can plainly see on
 * it, and finds nothing, with no explanation available anywhere.
 *
 * So a near-empty result is treated as "this needs OCR", not as done.
 */
function isEffectivelyEmpty(text: string): boolean {
  const letters = text.replace(/[^\p{L}\p{N}]/gu, "");
  return letters.length < 24;
}

const NEEDS_OCR_REASON =
  "This looks like a scan or a photo rather than a file with text in it, so there " +
  "is no text to read out of it. You can still give it a label, a date and an " +
  "exhibit number yourself, and it will appear in your document list and your " +
  "chronology like any other document.";

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

async function extractPdf(bytes: Uint8Array): Promise<ExtractionOutcome> {
  try {
    /*
     * The legacy build is the one that runs under Node without a DOM. Imported
     * dynamically so a PDF-parsing dependency is not loaded on a request that is
     * only listing documents.
     */
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    /*
     * A document is a hostile input until proven otherwise, so the parts of PDF
     * that fetch or render anything are turned off: no font conversion, and no
     * reaching out to the system for a substitute font.
     *
     * There is deliberately no `isEvalSupported: false` here. That option existed
     * in earlier pdfjs versions and was REMOVED in v6 — it is not in
     * DocumentInitParameters and passing it is a type error. Its absence is not an
     * oversight: pdfjs no longer evaluates font programs that way, so there is
     * nothing left for the flag to switch off. Worth saying, because every
     * hardening example written against pdfjs v3 or v4 includes it.
     */
    const loading = pdfjs.getDocument({
      data: bytes,
      disableFontFace: true,
      useSystemFonts: false,
      /*
       * *** WHY THE LOGGING IS TURNED DOWN, AND IT IS NOT FOR TIDINESS ***
       *
       * pdfjs writes warnings straight to the console. Running it over a real
       * decision produced five copies of "Ensure that the `standardFontDataUrl`
       * API parameter is provided" and, on a second file, "Indexing all PDF
       * objects" — the first being pdfjs correctly declining to fetch font data,
       * which is what disableFontFace and useSystemFonts asked for.
       *
       * The noise is harmless. What is not harmless is that a PDF parser's
       * warnings can quote the structure and contents of the file it is parsing,
       * and this file is a litigant's medical record. In a serverless function
       * console output goes to a platform log we do not control the retention of.
       * So the parser is set to ERRORS only, to keep documents out of the logs.
       *
       * `VerbosityLevel.ERRORS` is 0. Written as the constant so it reads as a
       * level rather than a magic number.
       */
      verbosity: pdfjs.VerbosityLevel.ERRORS,
    });

    const document = await loading.promise;

    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      pages.push(pageText);
      page.cleanup();
    }

    /*
     * `destroy()` is on the LOADING TASK, not on the document proxy — the proxy has
     * no such method in v6. Destroying the task is what releases the worker; the
     * document alone would leave it running.
     */
    await loading.destroy();

    const text = normaliseExtractedText(pages.join("\n\n"));

    if (isEffectivelyEmpty(text)) {
      return { status: "skipped", method: "none", reason: NEEDS_OCR_REASON };
    }

    return {
      status: "done",
      method: "pdf-text-layer",
      text,
      charCount: text.length,
    };
  } catch (error) {
    return {
      status: "failed",
      method: "pdf-text-layer",
      /*
       * The error's own message is not passed through. A parser's message can echo
       * bytes from the file, and those bytes are the user's document.
       */
      reason:
        "CourtSimplified could not read this PDF. It may be password-protected or " +
        "damaged. You can still label and date it yourself." +
        (error instanceof Error ? "" : ""),
    };
  }
}

// ---------------------------------------------------------------------------
// DOCX — a ZIP holding XML. fflate is already a dependency.
// ---------------------------------------------------------------------------

function extractDocx(bytes: Uint8Array): ExtractionOutcome {
  try {
    const entries = unzipSync(bytes, { filter: (file) => file.name === "word/document.xml" });
    const documentXml = entries["word/document.xml"];

    if (!documentXml) {
      return {
        status: "failed",
        method: "docx",
        reason:
          "This Word file does not contain a readable document part. You can still " +
          "label and date it yourself.",
      };
    }

    const xml = new TextDecoder("utf-8").decode(documentXml);

    const text = normaliseExtractedText(
      xml
        // Paragraph and line breaks, before tags are stripped and the structure is lost.
        .replace(/<\/w:p>/g, "\n\n")
        .replace(/<w:br\b[^>]*\/?>/g, "\n")
        .replace(/<w:tab\b[^>]*\/?>/g, " ")
        // Everything else is markup.
        .replace(/<[^>]+>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        // Last, so an escaped entity is not double-decoded.
        .replace(/&amp;/g, "&"),
    );

    if (isEffectivelyEmpty(text)) {
      return {
        status: "skipped",
        method: "none",
        reason:
          "This Word file has no text in it — it may contain only images. You can " +
          "still label and date it yourself.",
      };
    }

    return { status: "done", method: "docx", text, charCount: text.length };
  } catch {
    return {
      status: "failed",
      method: "docx",
      reason: "CourtSimplified could not read this Word file. You can still label and date it yourself.",
    };
  }
}

// ---------------------------------------------------------------------------
// RTF — strip control words. Not a full parser, and says so.
// ---------------------------------------------------------------------------

function extractRtf(bytes: Uint8Array): ExtractionOutcome {
  try {
    const raw = new TextDecoder("utf-8").decode(bytes);

    const text = normaliseExtractedText(
      raw
        // \'hh — a byte in the document's codepage. Decoded as Latin-1, which is
        // right for the accented characters an Ontario document actually contains.
        .replace(/\\'([0-9a-fA-F]{2})/g, (_, hex: string) =>
          String.fromCharCode(Number.parseInt(hex, 16)),
        )
        // \uNNNN? — a Unicode character followed by a fallback to discard.
        .replace(/\\u(-?\d+)\??/g, (_, code: string) =>
          String.fromCharCode(Number.parseInt(code, 10) & 0xffff),
        )
        .replace(/\\par[d]?\b/g, "\n\n")
        .replace(/\\line\b/g, "\n")
        .replace(/\\tab\b/g, " ")
        // Groups that hold metadata rather than content.
        .replace(/\{\\\*[^{}]*\}/g, "")
        .replace(/\{\\(?:fonttbl|colortbl|stylesheet|info)[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, "")
        .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
        .replace(/[{}]/g, ""),
    );

    if (isEffectivelyEmpty(text)) {
      return {
        status: "skipped",
        method: "none",
        reason:
          "This file has no text CourtSimplified could read. You can still label and date it yourself.",
      };
    }

    return { status: "done", method: "rtf", text, charCount: text.length };
  } catch {
    return {
      status: "failed",
      method: "rtf",
      reason: "CourtSimplified could not read this file. You can still label and date it yourself.",
    };
  }
}

// ---------------------------------------------------------------------------
// Plain text
// ---------------------------------------------------------------------------

function extractPlain(bytes: Uint8Array): ExtractionOutcome {
  try {
    // Non-fatal: a stray bad byte in a letter should not lose the letter.
    const text = normaliseExtractedText(new TextDecoder("utf-8").decode(bytes));

    if (text.length === 0) {
      return {
        status: "skipped",
        method: "none",
        reason: "This file is empty.",
      };
    }

    return { status: "done", method: "plain", text, charCount: text.length };
  } catch {
    return {
      status: "failed",
      method: "plain",
      reason: "CourtSimplified could not read this file.",
    };
  }
}

// ---------------------------------------------------------------------------
// The dispatcher
// ---------------------------------------------------------------------------

/**
 * Which formats can be read at all. Keyed by the mime the REGISTER route stored,
 * which was decided from the file's bytes — so this never dispatches on a name or
 * on a client's claim.
 */
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/tiff", "image/webp", "image/heic"]);

export async function extractDocumentText(
  storedMime: string,
  bytes: Uint8Array,
): Promise<ExtractionOutcome> {
  if (bytes.byteLength === 0) {
    return { status: "skipped", method: "none", reason: "This file is empty." };
  }

  if (storedMime === "application/pdf") return extractPdf(bytes);

  if (storedMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return extractDocx(bytes);
  }

  if (storedMime === "application/rtf") return extractRtf(bytes);
  if (storedMime === "text/plain") return extractPlain(bytes);

  if (IMAGE_MIMES.has(storedMime)) {
    return { status: "skipped", method: "none", reason: NEEDS_OCR_REASON };
  }

  if (storedMime === "application/msword") {
    return {
      status: "skipped",
      method: "none",
      reason:
        "This is an older Word format that CourtSimplified cannot read the text " +
        "out of. Saving it again as a .docx or a PDF and uploading that would let " +
        "it be searched. You can also just label and date this one yourself.",
    };
  }

  /*
   * Unreachable for anything the register route accepted, because that route's
   * allowlist and the branches above are the same set — asserted by
   * test:workspace-extraction, so this becomes reachable only if the two drift.
   */
  return {
    status: "skipped",
    method: "none",
    reason: "CourtSimplified cannot read the text out of this kind of file.",
  };
}
