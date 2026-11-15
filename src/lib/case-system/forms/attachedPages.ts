/**
 * THE ATTACHED PAGES (site owner, 15 Nov 2026): the person's words that did not fit a form's boxes, on plain pages added
 * after the official form, so a form that says "ADDITIONAL PAGES ARE ATTACHED BECAUSE MORE ROOM WAS NEEDED" always
 * has them. The form's own words head each page (its number and title, the box's printed heading with "(continued)"),
 * then only the person's words, then "Attached page N of M". No wording of the site's own, no law.
 *
 * Laid out with Helvetica at 11pt inside 1-inch margins, broken into lines with the same widths textFit.ts measures with
 * (helveticaWidths.json, pdf-lib's standard metrics), so no line is cut off. A character Helvetica cannot print is not
 * changed or dropped: the pages are not made, and the error names it (printableText.ts). Server only (officialPdf.ts filledFormPdf).
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { AttachedSection } from "./formMap";
import { textWidth, wrapLines } from "./textFit";
import { UnprintableText, forPrinting, unprintableCharacters } from "./printableText";

export const PAGE = { width: 612, height: 792, margin: 72 };
const BODY = 11;
const LINE = BODY * 1.35;
const TITLE = 10;
const HEADING = 11;
const LABEL = 9;

export { UnprintableText, unprintableMessage } from "./printableText";

/** The pages for these sections, in order, each section starting a new page; null when there is nothing to attach. */
export async function attachedPagesPdf(sections: readonly AttachedSection[]): Promise<Uint8Array | null> {
  const withText = sections.filter((section) => section.text.trim()).map((section) => ({ ...section, text: forPrinting(section.text) }));
  if (!withText.length) return null;
  const unprintable = unprintableCharacters(withText.flatMap((section) => [section.title, section.heading, section.text]), "pages");
  if (unprintable.length) throw new UnprintableText(unprintable);

  const room = PAGE.width - 2 * PAGE.margin;
  const top = PAGE.height - PAGE.margin;
  const bodyTop = top - TITLE * 1.5 - HEADING * 2;
  // Whole lines between the heading and the bottom margin (the page label sits below the margin).
  const perPage = Math.floor((bodyTop - PAGE.margin) / LINE);
  const pages: { section: AttachedSection; lines: string[] }[] = [];
  for (const section of withText) {
    const lines = wrapLines(section.text.trim(), BODY, room);
    for (let at = 0; at < lines.length; at += perPage) pages.push({ section, lines: lines.slice(at, at + perPage) });
  }

  const doc = await PDFDocument.create();
  const regular = doc.embedStandardFont(StandardFonts.Helvetica);
  const bold = doc.embedStandardFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  pages.forEach(({ section, lines }, index) => {
    const page = doc.addPage([PAGE.width, PAGE.height]);
    page.drawText(section.title, { x: PAGE.margin, y: top, size: TITLE, font: regular, color: black });
    page.drawText(section.heading, { x: PAGE.margin, y: top - TITLE * 1.5 - HEADING, size: HEADING, font: bold, color: black });
    lines.forEach((line, row) => { if (line) page.drawText(line, { x: PAGE.margin, y: bodyTop - LINE * (row + 1), size: BODY, font: regular, color: black }); });
    const label = `Attached page ${index + 1} of ${pages.length}`;
    page.drawText(label, { x: PAGE.width - PAGE.margin - textWidth(label, LABEL), y: PAGE.margin - LABEL * 2, size: LABEL, font: regular, color: black });
  });
  doc.setTitle(withText[0].title);
  return doc.save();
}
