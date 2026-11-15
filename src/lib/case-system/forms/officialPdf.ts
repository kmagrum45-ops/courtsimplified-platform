/**
 * FILLING THE OFFICIAL PDF'S OWN BOXES (site owner, 14 Nov 2026, rule 4: "the OFFICIAL Form 7A as published; same layout;
 * do not redraw it"). Server only.
 *
 * The official Small Claims PDFs are encrypted (owner-password protection; they open without a password). pdf-lib cannot
 * read them ("Invalid object ref", then no catalog); pdf.js reads them, fills their fields through its annotation
 * storage, and saves the result as an update of the same file, so the layout, fonts and wording are the court's own.
 * Found 14 Nov 2026 (docs/SOURCING_NOTES.md, "Official form PDFs").
 *
 * The values come from the form map (formMap.ts pdfValues) and nowhere else. No model is involved.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { attachedSections, fillForm, pdfValues, type BoxValue, type FormContext, type FormMapDefinition } from "./formMap";
import { attachedPagesPdf } from "./attachedPages";
import { UnprintableText, forPrinting, unprintableCharacters } from "./printableText";
import { leftBoxesToViewers, withCharacterMaps } from "./fontMaps";

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

async function pdfjs(): Promise<PdfJs> {
  return (await import("pdfjs-dist/legacy/build/pdf.mjs")) as PdfJs;
}

/** The official PDF saved under docs/sources/forms/, as bytes. */
export function officialPdfBytes(file: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), file)));
}

async function open(bytes: Uint8Array) {
  const lib = await pdfjs();
  const task = lib.getDocument({ data: bytes, disableFontFace: true, verbosity: lib.VerbosityLevel.ERRORS });
  const doc = await task.promise;
  return Object.assign(doc, { close: () => task.destroy() });
}

/** One box of the PDF: its name, kind, page, value, and the size and font size its text is drawn at (0: fitted to the box). */
export type PdfBox = { name: string; type: string; checkBox: boolean; radio: boolean; page: number; value: unknown; width: number; height: number; fontSize: number; multiLine: boolean };

/** Every box the PDF holds (a name used twice is listed twice). */
export async function pdfBoxes(bytes: Uint8Array): Promise<PdfBox[]> {
  const doc = await open(bytes.slice());
  const out: PdfBox[] = [];
  for (let page = 1; page <= doc.numPages; page++) {
    for (const annotation of await (await doc.getPage(page)).getAnnotations()) {
      const [x1, y1, x2, y2] = annotation.rect as number[];
      if (annotation.subtype === "Widget" && annotation.fieldName) out.push({
        name: annotation.fieldName, type: annotation.fieldType, checkBox: Boolean(annotation.checkBox), radio: Boolean(annotation.radioButton), page, value: annotation.fieldValue,
        width: x2 - x1, height: y2 - y1, fontSize: Number(annotation.defaultAppearanceData?.fontSize ?? 0), multiLine: Boolean(annotation.multiLine),
      });
    }
  }
  await doc.close();
  return out;
}

/** The official PDF with these boxes filled (a box not named is left as published). Throws on a name the PDF lacks. */
export async function fillOfficialPdf(bytes: Uint8Array, values: Readonly<Record<string, BoxValue>>): Promise<Uint8Array> {
  const doc = await open(bytes.slice());
  const found = new Set<string>();
  for (let page = 1; page <= doc.numPages; page++) {
    for (const annotation of await (await doc.getPage(page)).getAnnotations()) {
      if (annotation.subtype !== "Widget" || !annotation.fieldName || !(annotation.fieldName in values)) continue;
      const value = values[annotation.fieldName];
      found.add(annotation.fieldName);
      // A radio button (Family Form 13's Yes/No pairs) is not filled by any map yet: refuse rather than write text into it.
      if (annotation.radioButton) { await doc.close(); throw new Error(`a radio button is not filled by a map yet: ${annotation.fieldName}`); }
      if (annotation.checkBox) doc.annotationStorage.setValue(annotation.id, { value: value === true });
      else doc.annotationStorage.setValue(annotation.id, { value: typeof value === "string" ? value : "" });
    }
  }
  const unknown = Object.keys(values).filter((name) => !found.has(name));
  if (unknown.length) { await doc.close(); throw new Error(`not a box of this form: ${unknown.join(", ")}`); }
  const saved = await doc.saveDocument();
  await doc.close();
  return saved;
}

/**
 * The official PDF `pdfFile` filled with these values so that every box is drawn as written (15 Nov 2026, option 2).
 * Filled as published first; only when pdf.js could not write some box's text in that box's font (French in a box whose
 * own Helvetica has no character map) is it filled again on the court's file with those fonts given the form's own
 * character map (fontMaps.ts, an update appended to the file; its protection is kept). So a download that needs no map
 * is byte for byte what it was before.
 */
export async function fillReadable(pdfFile: string, values: Readonly<Record<string, BoxValue>>): Promise<Uint8Array> {
  const official = officialPdfBytes(pdfFile);
  const filled = await fillOfficialPdf(official, values);
  if (!leftBoxesToViewers(official, filled)) return filled;
  return fillOfficialPdf(withCharacterMaps(pdfFile, official), values);
}

/**
 * The download: the official form filled from the case record, followed by the attached pages when the person's words
 * overflowed its boxes (attachedPages.ts), and by nothing when they did not. The form's "pages attached" tick reads the
 * same sections (formMap.ts attachedSections), so a ticked form always has its pages.
 *
 * The pages are added with pdf.js's own page assembly (`extractPages`), from the filled form as saved, so every box keeps
 * its value (assembling from the open document instead dropped them: 15 Nov 2026). pdf.js writes the result as a new
 * file, without the official file's owner-password protection; the pages, fonts and boxes are the court's own.
 * Throws UnprintableText (printableText.ts) when a value or the overflow has a character no font here can print.
 */
export async function filledFormPdf(map: FormMapDefinition, ctx: FormContext): Promise<Uint8Array> {
  // Every kind of space prints as a space; a character none of the form's fonts covers (Chinese, for example) stops the
  // download, naming it, rather than leaving the box to each viewer to draw or garble (printableText.ts, 15 Nov 2026).
  const values = Object.fromEntries(Object.entries(pdfValues(fillForm(map, ctx))).map(([box, value]) => [box, typeof value === "string" ? forPrinting(value) : value]));
  const unprintable = unprintableCharacters(Object.values(values).filter((value): value is string => typeof value === "string"), "boxes");
  if (unprintable.length) throw new UnprintableText(unprintable);
  const filled = await fillReadable(map.pdf.file, values);
  const pages = await attachedPagesPdf(attachedSections(map, ctx));
  if (!pages) return filled;
  const doc = await open(filled);
  try {
    const assembled = await doc.extractPages([{ document: null }, { document: pages }]);
    if (!assembled) throw new Error("the attached pages could not be added");
    return assembled;
  } finally {
    await doc.close();
  }
}
