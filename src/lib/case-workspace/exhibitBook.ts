/**
 * The exhibit book: a cover page, an index, and the documents behind them.
 *
 * WHAT THIS CATCHES: an index that does not match the pages it indexes.
 *
 * *** THE ONE THING THIS MUST NEVER GET WRONG ***
 *
 * An exhibit book is used by pointing at it. "Exhibit 4, page 2" is said out loud,
 * written in a claim, and relied on by a judge who has the book open. If the index
 * says exhibit 4 starts on page 7 and it starts on page 8, every reference after
 * that point is wrong, and the person who looks least competent is the litigant.
 *
 * So page numbers are not calculated in advance and then hoped for. The book is
 * assembled first, each document's real starting page is recorded AS IT IS ADDED,
 * and the index is written afterwards from those recorded positions. That is why
 * `buildExhibitBook` is one function rather than a builder plus a formatter: the two
 * halves cannot be allowed to disagree, so they are not separable.
 *
 * *** WHAT GOES IN THE INDEX, AND WHAT MAY NOT ***
 *
 * Exhibit label, date, what the document is, and its page. Nothing about weight,
 * relevance, or what any of it shows — CLAUDE.md §3. The index is a finding aid.
 *
 * The description is the USER'S label, or failing that the document's own file name.
 * It is never generated: a description of a document is a statement about evidence,
 * and the user is the one who knows what their document is.
 *
 * *** WHAT CANNOT BE MERGED, AND WHY THAT IS SAID OUT LOUD ***
 *
 * PDFs and images can be placed into the book. A .docx cannot — there is no pure-JS
 * way to render one to a page, and the alternative is a third-party converter, which
 * was refused for the same residency reason as Adobe (DATA_FLOW_INVENTORY §3.6).
 *
 * Those documents still get an exhibit number and an index entry, marked as supplied
 * separately. Leaving them out of the index entirely would be worse: the numbering
 * would skip, and a reader would assume a document was missing rather than printed
 * on its own.
 *
 * NO MODEL IS CALLED HERE.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { exhibitLabel } from "./exhibitNumbering";
import { formatForCourt, type DatePrecision } from "./parseDate";
import { documentTypeById } from "./documentTypes";

export type ExhibitBookDocument = {
  id: string;
  exhibitNumber: number;
  exhibitSuffix: string | null;
  /** The user's label. Never generated. */
  userLabel: string | null;
  originalName: string;
  userType: string | null;
  userDate: string | null;
  userDatePrecision?: DatePrecision;
  mime: string;
  /**
   * The file itself, for a document that can be placed in the book. Omitted for an
   * index-only build — the preview the user sees before committing to a full render.
   */
  bytes?: Uint8Array;
};

export type ExhibitBookCase = {
  /** As the user has recorded it. Not generated, and not "improved". */
  title: string;
  courtFileNumber: string | null;
  courtName: string | null;
  plaintiff: string | null;
  defendant: string | null;
};

export type ExhibitIndexEntry = {
  label: string;
  description: string;
  typeLabel: string | null;
  displayDate: string | null;
  /** The real page in the assembled book, or null where the document is not in it. */
  page: number | null;
  /** Set where the document could not be placed. Shown in the index. */
  suppliedSeparately: string | null;
};

export type ExhibitBook = {
  /** The whole PDF. Cover, index, then the documents. */
  bytes: Uint8Array;
  index: ExhibitIndexEntry[];
  pageCount: number;
  /** Documents that could not be placed, so the UI can say so before printing. */
  separateCount: number;
};

const PAGE_WIDTH = 612; // US Letter, which is what Ontario courts use.
const PAGE_HEIGHT = 792;
const MARGIN = 72;

const MERGEABLE_IMAGES = new Set(["image/jpeg", "image/png"]);

function describe(document: ExhibitBookDocument): string {
  const label = document.userLabel?.trim();
  return label && label.length > 0 ? label : document.originalName;
}

function reasonCannotPlace(mime: string): string | null {
  if (mime === "application/pdf") return null;
  if (MERGEABLE_IMAGES.has(mime)) return null;

  if (mime === "image/heic" || mime === "image/tiff" || mime === "image/webp") {
    return "Supplied separately — save this image as a JPEG or PNG to include it in the book.";
  }
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/msword" ||
    mime === "application/rtf"
  ) {
    return "Supplied separately — print this document, or save it as a PDF to include it in the book.";
  }
  return "Supplied separately — print this document to include it in the book.";
}

/** Draws wrapped text and returns the y position after it. */
function drawWrapped(
  page: PDFPage,
  text: string,
  options: { x: number; y: number; size: number; font: PDFFont; maxWidth: number; lineGap?: number },
): number {
  const words = text.split(/\s+/).filter(Boolean);
  const lineGap = options.lineGap ?? 4;
  let line = "";
  let y = options.y;

  const flush = () => {
    if (line.length === 0) return;
    page.drawText(line, { x: options.x, y, size: options.size, font: options.font });
    y -= options.size + lineGap;
    line = "";
  };

  for (const word of words) {
    const candidate = line.length === 0 ? word : `${line} ${word}`;
    if (options.font.widthOfTextAtSize(candidate, options.size) > options.maxWidth) {
      flush();
      line = word;
    } else {
      line = candidate;
    }
  }
  flush();

  return y;
}

export async function buildExhibitBook(
  caseDetails: ExhibitBookCase,
  documents: readonly ExhibitBookDocument[],
  options: { preparedOn?: string } = {},
): Promise<ExhibitBook> {
  const pdf = await PDFDocument.create();

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  /*
   * Ordered by exhibit label, not by date. The book follows its own numbering —
   * whatever order the exhibits were assigned in is the order a reader expects, and
   * re-sorting by date here would put exhibit 5 before exhibit 4A.
   */
  const ordered = [...documents].sort((a, b) => {
    if (a.exhibitNumber !== b.exhibitNumber) return a.exhibitNumber - b.exhibitNumber;
    return (a.exhibitSuffix ?? "").localeCompare(b.exhibitSuffix ?? "");
  });

  // ---- 1. the cover ----

  const cover = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  if (caseDetails.courtName) {
    cover.drawText(caseDetails.courtName.toUpperCase(), {
      x: MARGIN,
      y,
      size: 11,
      font: bold,
    });
    y -= 28;
  }

  if (caseDetails.courtFileNumber) {
    cover.drawText(`Court File No. ${caseDetails.courtFileNumber}`, {
      x: MARGIN,
      y,
      size: 11,
      font: regular,
    });
    y -= 36;
  }

  if (caseDetails.plaintiff || caseDetails.defendant) {
    y = drawWrapped(cover, `BETWEEN: ${caseDetails.plaintiff ?? ""}`.trim(), {
      x: MARGIN,
      y,
      size: 11,
      font: regular,
      maxWidth: PAGE_WIDTH - MARGIN * 2,
    });
    y -= 6;
    cover.drawText("Plaintiff", { x: PAGE_WIDTH - MARGIN - 60, y: y + 15, size: 10, font: regular });
    y -= 14;
    cover.drawText("- and -", { x: MARGIN, y, size: 10, font: regular });
    y -= 20;
    y = drawWrapped(cover, caseDetails.defendant ?? "", {
      x: MARGIN,
      y,
      size: 11,
      font: regular,
      maxWidth: PAGE_WIDTH - MARGIN * 2,
    });
    cover.drawText("Defendant", { x: PAGE_WIDTH - MARGIN - 62, y: y + 15, size: 10, font: regular });
    y -= 40;
  }

  cover.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  y -= 42;

  cover.drawText("EXHIBIT BOOK", { x: MARGIN, y, size: 20, font: bold });
  y -= 30;

  y = drawWrapped(cover, caseDetails.title, {
    x: MARGIN,
    y,
    size: 12,
    font: regular,
    maxWidth: PAGE_WIDTH - MARGIN * 2,
  });

  const preparedOn = options.preparedOn ?? new Date().toISOString().slice(0, 10);
  cover.drawText(`Prepared ${formatForCourt(preparedOn, "day")}`, {
    x: MARGIN,
    y: MARGIN,
    size: 10,
    font: regular,
  });

  /*
   * *** THE INDEX PAGES ARE RESERVED NOW AND WRITTEN LAST ***
   *
   * The index has to state the page each exhibit starts on, and those pages are not
   * known until the documents have been added. But the index must PRINT before the
   * documents, or it is not an index.
   *
   * So blank pages are inserted here to hold its place, the documents are added after
   * them, and the reserved pages are filled in at the end from the positions actually
   * recorded. Guessing the page numbers first and adding documents afterwards is how
   * an index comes to disagree with its book.
   */
  const rowsPerPage = 22;
  const indexPageCount = Math.max(1, Math.ceil(ordered.length / rowsPerPage));
  const indexPages: PDFPage[] = [];
  for (let n = 0; n < indexPageCount; n += 1) {
    indexPages.push(pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]));
  }

  // ---- 2. the documents, recording where each one really starts ----

  const index: ExhibitIndexEntry[] = [];

  for (const document of ordered) {
    const cannotPlace = reasonCannotPlace(document.mime);
    const label = exhibitLabel(document.exhibitNumber, document.exhibitSuffix);

    const entry: ExhibitIndexEntry = {
      label,
      description: describe(document),
      typeLabel: document.userType ? documentTypeById(document.userType)?.label ?? null : null,
      displayDate: document.userDate
        ? formatForCourt(document.userDate, document.userDatePrecision ?? "day")
        : null,
      page: null,
      suppliedSeparately: cannotPlace,
    };

    if (cannotPlace !== null || !document.bytes) {
      index.push(entry);
      continue;
    }

    /*
     * pdf-lib page indices are 0-based and the reader counts from 1. The page
     * recorded is the one the exhibit's first page lands on, taken AFTER it has been
     * added, from the document's own count.
     */
    const pageBefore = pdf.getPageCount();

    try {
      if (document.mime === "application/pdf") {
        const source = await PDFDocument.load(document.bytes, { ignoreEncryption: true });
        const copied = await pdf.copyPages(source, source.getPageIndices());
        for (const page of copied) pdf.addPage(page);
      } else {
        const image =
          document.mime === "image/png"
            ? await pdf.embedPng(document.bytes)
            : await pdf.embedJpg(document.bytes);

        const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        // Fitted inside the margins, aspect ratio kept. A stretched exhibit is a
        // document that no longer looks like the original.
        const available = { width: PAGE_WIDTH - MARGIN, height: PAGE_HEIGHT - MARGIN * 1.5 };
        const scale = Math.min(available.width / image.width, available.height / image.height, 1);
        page.drawImage(image, {
          x: (PAGE_WIDTH - image.width * scale) / 2,
          y: (PAGE_HEIGHT - image.height * scale) / 2,
          width: image.width * scale,
          height: image.height * scale,
        });
      }

      if (pdf.getPageCount() > pageBefore) {
        entry.page = pageBefore + 1;
      } else {
        /*
         * A source PDF with zero pages. It loaded without error and contributed
         * nothing, so it is marked as separate rather than indexed at a page that
         * holds a different exhibit.
         */
        entry.suppliedSeparately =
          "Supplied separately — CourtSimplified could not read any pages from this file.";
      }
    } catch {
      /*
       * An encrypted or damaged PDF, or an image pdf-lib will not decode. The
       * exhibit keeps its number and is marked separate. The parser's message is not
       * passed through: it can quote bytes from the user's document.
       */
      entry.suppliedSeparately =
        "Supplied separately — CourtSimplified could not add this file to the book. " +
        "Printing it and placing it behind this tab will work.";
    }

    index.push(entry);
  }

  // ---- 3. fill the reserved index pages from the recorded positions ----

  const totalPages = pdf.getPageCount();

  index.forEach((entry, position) => {
    const page = indexPages[Math.floor(position / rowsPerPage)];
    const row = position % rowsPerPage;

    if (row === 0) {
      page.drawText("INDEX", { x: MARGIN, y: PAGE_HEIGHT - MARGIN, size: 14, font: bold });
      page.drawText("Exhibit", { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 28, size: 9, font: bold });
      page.drawText("Document", { x: MARGIN + 60, y: PAGE_HEIGHT - MARGIN - 28, size: 9, font: bold });
      page.drawText("Date", { x: PAGE_WIDTH - MARGIN - 150, y: PAGE_HEIGHT - MARGIN - 28, size: 9, font: bold });
      page.drawText("Page", { x: PAGE_WIDTH - MARGIN - 34, y: PAGE_HEIGHT - MARGIN - 28, size: 9, font: bold });
    }

    const rowY = PAGE_HEIGHT - MARGIN - 48 - row * 26;

    page.drawText(entry.label, { x: MARGIN, y: rowY, size: 10, font: bold });

    const description =
      entry.typeLabel && !entry.description.toLowerCase().includes(entry.typeLabel.toLowerCase())
        ? `${entry.description} (${entry.typeLabel})`
        : entry.description;

    drawWrapped(page, description, {
      x: MARGIN + 60,
      y: rowY,
      size: 9,
      font: regular,
      maxWidth: PAGE_WIDTH - MARGIN * 2 - 220,
      lineGap: 2,
    });

    if (entry.displayDate) {
      page.drawText(entry.displayDate, {
        x: PAGE_WIDTH - MARGIN - 150,
        y: rowY,
        size: 9,
        font: regular,
      });
    }

    page.drawText(entry.page !== null ? String(entry.page) : "—", {
      x: PAGE_WIDTH - MARGIN - 30,
      y: rowY,
      size: 9,
      font: regular,
    });

    if (entry.suppliedSeparately) {
      page.drawText("supplied separately", {
        x: MARGIN + 60,
        y: rowY - 11,
        size: 7.5,
        font: regular,
        color: rgb(0.35, 0.35, 0.35),
      });
    }
  });

  return {
    bytes: await pdf.save(),
    index,
    pageCount: totalPages,
    separateCount: index.filter((entry) => entry.suppliedSeparately !== null).length,
  };
}
