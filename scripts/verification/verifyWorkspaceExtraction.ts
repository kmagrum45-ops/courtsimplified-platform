/**
 * Text comes out of every format the upload route accepts, and a document with no
 * readable text is reported as such rather than stored as an empty success.
 *
 * WHAT THIS CATCHES: two failures, and the second is the dangerous one.
 *
 *   1. A format the register route accepts that the extractor has no branch for.
 *      The two allowlists are written in different files and would drift silently,
 *      leaving uploads that succeed and then never extract.
 *
 *   2. A scan stored as a SUCCESSFUL extraction of "". A scanned PDF has a text
 *      layer in the technical sense — it is just empty — so pdfjs returns no error.
 *      The user is told the document was processed, searches for a word printed
 *      plainly on it, finds nothing, and no screen anywhere can explain why. That
 *      must come back as `skipped` with a reason, never as `done`.
 *
 * *** WHY THE FIXTURES ARE MOSTLY REAL FILES ***
 *
 * The PDF is a real Supreme Court of Canada decision already vendored under
 * docs/sources/. A PDF hand-built by a test is a PDF built by someone who already
 * believes they understand PDF, and it exercises the happy path they imagined. The
 * small-caps artefact below was found because the fixture was real.
 *
 * COSTS NOTHING in money. Takes a few seconds: parsing a real 500 KB PDF is
 * genuinely slow, which is itself a finding the extraction route depends on.
 *
 * Run: node --import tsx scripts/verification/verifyWorkspaceExtraction.ts
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { zipSync, strToU8 } from "fflate";

import {
  extractDocumentText,
  normaliseExtractedText,
  type ExtractionOutcome,
} from "../../src/lib/case-workspace/extractText";
import { allowedMimeTypes } from "../../src/lib/case-workspace/fileValidation";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

let failures = 0;
const pass = (m: string) => console.log(`pass  ${m}`);
const fail = (m: string, d?: string) => {
  failures += 1;
  console.log(`FAIL  ${m}`);
  if (d) for (const line of d.split("\n")) console.log(`      ${line}`);
};

console.log("");
console.log("WORKSPACE EXTRACTION");
console.log("");

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function buildDocx(bodyXml: string): Uint8Array {
  return zipSync({
    "[Content_Types].xml": strToU8('<?xml version="1.0"?><Types/>'),
    "word/document.xml": strToU8(
      `<?xml version="1.0"?><w:document xmlns:w="x"><w:body>${bodyXml}</w:body></w:document>`,
    ),
  });
}

/*
 * Everything is inside an async main because tsx runs this repository's .ts files
 * as CJS, where top-level await is a transform error. `measureInterceptionRate.ts`
 * uses the same shape.
 */
async function main() {
  // ---------------------------------------------------------------------------
  // 1. A real PDF with a text layer
  // ---------------------------------------------------------------------------

{
  const fixture = path.join(ROOT, "docs", "sources", "bhasin-v-hrynew-2014-SCC-71.pdf");

  if (!existsSync(fixture)) {
    fail(
      "the real-PDF fixture is missing",
      `Expected ${fixture}. Without it nothing here proves a PDF can be read at\n` +
        `all, so this is a failure rather than a skip. Point it at any other\n` +
        `vendored PDF under docs/sources/ if that one has moved.`,
    );
  } else {
    const bytes = new Uint8Array(readFileSync(fixture));
    const started = Date.now();
    const result = await extractDocumentText("application/pdf", bytes);
    const elapsed = Date.now() - started;

    const problems: string[] = [];

    if (result.status !== "done") {
      problems.push(
        `a real text-layer PDF came back "${result.status}" — ` +
          ("reason" in result ? result.reason : ""),
      );
    } else {
      if (result.method !== "pdf-text-layer") {
        problems.push(`method was "${result.method}"`);
      }
      if (result.charCount < 10_000) {
        problems.push(`only ${result.charCount} characters from a 100-page decision`);
      }
      /*
       * A phrase that survives the small-caps artefact. "CITATION" comes back as
       * "C ITATION" because the PDF renders the first letter as a separate text
       * item, so a check for that word would fail for a reason that has nothing to
       * do with extraction working. Asserting on ordinary body text instead.
       */
      if (!/Supreme Court of Canada/i.test(result.text)) {
        problems.push("the text does not contain a phrase the document plainly has");
      }
      if (result.charCount !== result.text.length) {
        problems.push("charCount does not equal the text length");
      }
    }

    if (problems.length === 0) {
      pass(
        `a real 500 KB SCC decision extracted in ${elapsed} ms ` +
          `(${result.status === "done" ? result.charCount : 0} characters) — and that ` +
          `duration is why extraction is not done inside an upload request`,
      );
    } else {
      fail("a real PDF did not extract", problems.join("\n"));
    }
  }
}

// ---------------------------------------------------------------------------
// 2. A PDF with no text layer must be skipped, never a successful ""
// ---------------------------------------------------------------------------

{
  const { PDFDocument, rgb } = await import("pdf-lib");

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([600, 800]);
  // A picture of paper: geometry only, not one character of text.
  page.drawRectangle({ x: 40, y: 60, width: 520, height: 680, color: rgb(0.85, 0.85, 0.85) });
  const scanLike = new Uint8Array(await pdf.save());

  const result = await extractDocumentText("application/pdf", scanLike);
  const problems: string[] = [];

  if (result.status === "done") {
    problems.push(
      `a PDF with no text layer was reported DONE with ${result.charCount} ` +
        `characters. This is the failure the check exists for: the user is told it ` +
        `was processed and can never find out why nothing is searchable.`,
    );
  } else if (result.status !== "skipped") {
    problems.push(`status was "${result.status}" — a scan is not a failure, it is unreadable text`);
  } else {
    /*
     * No assertion that method === "none" here. The ExtractionOutcome type pins it
     * to that literal for a skipped result, so the comparison narrows to `never`
     * and the compiler rejects reading it — which is the type system saying the
     * check cannot fail. A check that cannot fail is decoration, so it is gone
     * rather than cast around.
     */
    if (!/scan|photo/i.test(result.reason)) {
      problems.push("the reason does not tell the user it looks like a scan");
    }
    /*
     * The reason must say what they can still do. A dead end with no next step is
     * where a self-represented litigant gives up.
     */
    if (!/label|date|exhibit/i.test(result.reason)) {
      problems.push("the reason does not say the document can still be labelled and dated by hand");
    }
  }

  if (problems.length === 0) {
    pass("a PDF that is a picture of paper is skipped with a reason, not stored as an empty success");
  } else {
    fail("a text-less PDF was mishandled", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 3. DOCX — structure kept, entities decoded exactly once
// ---------------------------------------------------------------------------

{
  const docx = buildDocx(
    "<w:p><w:r><w:t>Invoice 4471 dated 3 March 2026</w:t></w:r></w:p>" +
      "<w:p><w:r><w:t>Owing: $4,200.00 &amp;amp; unpaid</w:t>" +
      "<w:br/><w:t>Terms: 30 days</w:t></w:r></w:p>",
  );

  const result = await extractDocumentText(DOCX_MIME, docx);
  const problems: string[] = [];

  if (result.status !== "done") {
    problems.push(`a DOCX came back "${result.status}"`);
  } else {
    if (!result.text.includes("Invoice 4471 dated 3 March 2026")) {
      problems.push("the first paragraph's text is not intact");
    }
    if (!result.text.includes("Terms: 30 days")) {
      problems.push("a <w:br/> lost the text after it");
    }
    /*
     * The source XML holds `&amp;amp;`, which is the escaped form of the literal
     * `&amp;`. Decoding once gives `&amp;`. Decoding twice gives `&` — the classic
     * double-decode, and it is why &amp; is replaced LAST in the extractor.
     */
    if (result.text.includes("&amp;amp;")) {
      problems.push("entities were not decoded at all");
    } else if (!result.text.includes("&amp;")) {
      problems.push(
        "entities were DOUBLE-decoded: `&amp;amp;` became `&` instead of `&amp;`",
      );
    }
    if (!/\n\n/.test(result.text)) {
      problems.push("paragraph breaks were lost, so the chronology cannot read structure");
    }
  }

  if (problems.length === 0) {
    pass("a DOCX keeps its paragraphs and line breaks, and decodes entities exactly once");
  } else {
    fail("DOCX extraction is wrong", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 4. RTF — accented characters survive
// ---------------------------------------------------------------------------

{
  /*
   * An accent is not decoration here. The repository has already been bitten once
   * by de-accenting: "15 février 2026" parsed as year precision because the month
   * name was compared de-accented against raw text. A French-language letter is an
   * ordinary document in Ontario, and losing its characters loses its dates.
   */
  const rtf =
    "{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}" +
    "\\par Dear Ms Tremblay,\\par Re the invoice of 3 f\\'e9vrier 2026.\\par Yours,\\line J. Okonkwo\\par}";

  const result = await extractDocumentText(
    "application/rtf",
    new Uint8Array(Buffer.from(rtf, "utf8")),
  );
  const problems: string[] = [];

  if (result.status !== "done") {
    problems.push(`an RTF came back "${result.status}"`);
  } else {
    if (!result.text.includes("février")) {
      problems.push(
        `"février" did not survive — got ${JSON.stringify(result.text.slice(0, 120))}`,
      );
    }
    if (!result.text.includes("Dear Ms Tremblay")) problems.push("body text was lost");
    if (!result.text.includes("J. Okonkwo")) problems.push("text after \\line was lost");
    if (/Arial|fonttbl|\\rtf/.test(result.text)) {
      problems.push("font table markup leaked into the text");
    }
  }

  if (problems.length === 0) {
    pass("an RTF keeps its accented characters and drops its markup");
  } else {
    fail("RTF extraction is wrong", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 5. Normalisation, asserted on its own
// ---------------------------------------------------------------------------

{
  const problems: string[] = [];

  const cases: [string, string, string][] = [
    ["four blank lines collapse to one break", "a\n\n\n\n\nb", "a\n\nb"],
    ["runs of spaces collapse", "a      b", "a b"],
    ["a soft hyphen is removed", "soft­hyphen", "softhyphen"],
    ["a hyphen at a line break rejoins the word", "inter-\nnational", "international"],
    ["CRLF becomes LF", "a\r\nb", "a\nb"],
    ["a non-breaking space becomes a space", "a b", "a b"],
    ["leading and trailing space goes", "  a  ", "a"],
    ["a single paragraph break survives", "a\n\nb", "a\n\nb"],
  ];

  for (const [label, input, expected] of cases) {
    const actual = normaliseExtractedText(input);
    if (actual !== expected) {
      problems.push(`${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    }
  }

  if (problems.length === 0) {
    pass(`whitespace normalisation, ${cases.length} cases, paragraph breaks preserved`);
  } else {
    fail("normalisation is wrong", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 6. Every mime the upload route accepts has a branch here
// ---------------------------------------------------------------------------

{
  /*
   * *** THE DRIFT CHECK ***
   *
   * fileValidation.ts decides what may be uploaded; extractText.ts decides what can
   * be read. They are separate files and the second is easy to forget. This drives
   * every accepted mime through the dispatcher and requires a DELIBERATE answer —
   * either it extracts, or it is skipped with a reason written for that format.
   *
   * It is a property, not a list: adding a format to the allowlist and giving it a
   * branch keeps this green. Adding one without a branch is the regression.
   */
  const problems: string[] = [];

  // Bytes are not valid files for most of these; what is asserted is the ROUTING.
  const sample = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);

  const GENERIC = "CourtSimplified cannot read the text out of this kind of file.";

  for (const mime of allowedMimeTypes()) {
    let outcome: ExtractionOutcome;
    try {
      outcome = await extractDocumentText(mime, sample);
    } catch (error) {
      problems.push(`${mime} THREW: ${error instanceof Error ? error.message : "unknown"}`);
      continue;
    }

    if (outcome.status === "skipped" && outcome.reason === GENERIC) {
      problems.push(
        `${mime} fell through to the generic fallback — the upload allowlist and the ` +
          `extractor have drifted apart. Uploads of this type will succeed and never extract.`,
      );
      continue;
    }

    if ("reason" in outcome && outcome.reason.trim().length === 0) {
      problems.push(`${mime} produced an empty reason, so the user is told nothing`);
    }
  }

  if (problems.length === 0) {
    pass(
      `all ${allowedMimeTypes().length} uploadable types are routed deliberately, none ` +
        `to the generic fallback`,
    );
  } else {
    fail("the upload allowlist and the extractor have drifted", problems.join("\n"));
  }
}

// ---------------------------------------------------------------------------
// 7. A "done" result is never empty or whitespace
// ---------------------------------------------------------------------------

{
  /*
   * The invariant every consumer downstream relies on: status "done" means there is
   * text worth reading. If an extractor can return done with "" then the chronology,
   * the search and the communication log all have to defend against it separately,
   * and one of them will forget.
   */
  const problems: string[] = [];

  const emptyish: [string, Uint8Array][] = [
    ["an empty DOCX body", buildDocx("<w:p><w:r><w:t></w:t></w:r></w:p>")],
    ["a DOCX of only whitespace", buildDocx("<w:p><w:r><w:t>      </w:t></w:r></w:p>")],
    ["an empty text file", new Uint8Array(Buffer.from("", "utf8"))],
    ["a text file of only newlines", new Uint8Array(Buffer.from("\n\n\n\n", "utf8"))],
    ["an RTF with no content", new Uint8Array(Buffer.from("{\\rtf1\\ansi\\par}", "utf8"))],
  ];

  const mimeFor = (label: string) =>
    label.includes("DOCX") ? DOCX_MIME : label.includes("RTF") ? "application/rtf" : "text/plain";

  for (const [label, bytes] of emptyish) {
    const outcome = await extractDocumentText(mimeFor(label), bytes);
    if (outcome.status === "done") {
      if (outcome.text.trim().length === 0) {
        problems.push(`${label} returned status "done" with no readable text`);
      }
      if (outcome.charCount === 0) {
        problems.push(`${label} returned status "done" with charCount 0`);
      }
    }
  }

  if (problems.length === 0) {
    pass(`"done" always means there is text — ${emptyish.length} empty inputs all avoided it`);
  } else {
    fail('"done" was returned with nothing to show', problems.join("\n"));
  }
}

}

void main()
  .catch((error: unknown) => {
    /*
     * A throw is a failure, not a crash to be read as "no output". Counted here so
     * the exit code below is non-zero, because a suite that dies silently is a
     * suite that looks green in a terminal somebody is skimming.
     */
    fail(
      "the extraction suite threw",
      error instanceof Error ? error.message : String(error),
    );
  })
  .finally(() => {
    console.log("");
    if (failures > 0) {
      console.log(`${failures} FAILURE(S).`);
      process.exitCode = 1;
    } else {
      console.log("All checks passed.");
    }
    console.log("");
  });
