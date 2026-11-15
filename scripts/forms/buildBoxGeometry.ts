/**
 * Writes the two tables the site fits a form's text with (src/lib/case-system/forms/textFit.ts), so the screen and the
 * filled PDF agree on what fits without opening a PDF:
 *   - boxGeometry.json: for each official PDF in the form maps, each text box's width, height, font size (0: fitted by
 *     the viewer) and whether it takes several lines, read with pdf.js. A name the PDF uses twice lists each distinct box: a value must fit them all.
 *   - helveticaWidths.json: the width of each character in Helvetica (thousandths of the font size), from pdf-lib's
 *     standard font metrics: the widths pdf.js draws the forms' Helv and Arial boxes with.
 * test:form-maps (verifyFormTextFit.ts check 4) fails when a PDF's boxes no longer match the saved table.
 *
 * Run: npm run forms:geometry
 */
import { writeFileSync } from "node:fs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { FORM_MAPS } from "../../src/lib/case-system/forms/maps";
import { officialPdfBytes, pdfBoxes } from "../../src/lib/case-system/forms/officialPdf";

const round = (n: number) => Math.round(n * 100) / 100;

async function main() {
  const geometry: Record<string, Record<string, [number, number, number, number][]>> = {};
  for (const map of FORM_MAPS) {
    const boxes: Record<string, [number, number, number, number][]> = {};
    for (const box of await pdfBoxes(officialPdfBytes(map.pdf.file))) {
      if (box.type !== "Tx") continue;
      const entry: [number, number, number, number] = [round(box.width), round(box.height), round(box.fontSize), box.multiLine ? 1 : 0];
      const held = (boxes[box.name] ??= []);
      if (!held.some((item) => item.join() === entry.join())) held.push(entry);
    }
    geometry[map.pdf.file] = boxes;
  }
  writeFileSync("src/lib/case-system/forms/boxGeometry.json", `${JSON.stringify(geometry, null, 0).replace(/\],"/g, '],\n"').replace(/\},"/g, '},\n"')}\n`);

  const doc = await PDFDocument.create();
  const font = doc.embedStandardFont(StandardFonts.Helvetica);
  const widths: Record<string, number> = {};
  const codePoints = [...Array.from({ length: 95 }, (_, i) => 32 + i), ...Array.from({ length: 96 }, (_, i) => 160 + i), 0x2018, 0x2019, 0x201c, 0x201d, 0x2013, 0x2014, 0x2026, 0x20ac, 0x2022];
  for (const code of codePoints) {
    const char = String.fromCodePoint(code);
    try { widths[char] = Math.round(font.widthOfTextAtSize(char, 1000)); } catch { /* not in WinAnsi: measured as the widest */ }
  }
  writeFileSync("src/lib/case-system/forms/helveticaWidths.json", `${JSON.stringify(widths)}\n`);
  console.log(`boxGeometry.json: ${Object.values(geometry).reduce((n, boxes) => n + Object.keys(boxes).length, 0)} text boxes in ${Object.keys(geometry).length} PDFs; helveticaWidths.json: ${Object.keys(widths).length} characters`);
}

void main();
