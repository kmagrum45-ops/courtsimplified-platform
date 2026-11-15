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
import type { BoxValue } from "./formMap";

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

/** Every box the PDF holds: its name, kind and page (a name used twice is listed twice). */
export async function pdfBoxes(bytes: Uint8Array): Promise<{ name: string; type: string; checkBox: boolean; radio: boolean; page: number; value: unknown }[]> {
  const doc = await open(bytes.slice());
  const out: { name: string; type: string; checkBox: boolean; radio: boolean; page: number; value: unknown }[] = [];
  for (let page = 1; page <= doc.numPages; page++) {
    for (const annotation of await (await doc.getPage(page)).getAnnotations()) {
      if (annotation.subtype === "Widget" && annotation.fieldName) out.push({ name: annotation.fieldName, type: annotation.fieldType, checkBox: Boolean(annotation.checkBox), radio: Boolean(annotation.radioButton), page, value: annotation.fieldValue });
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
