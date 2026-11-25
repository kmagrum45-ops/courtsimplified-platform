/**
 * French in the official boxes (site owner, 15 Nov 2026, option 2). Many of the court's boxes carry their own Helvetica
 * with no character map, so é, ç, € cannot be written in them, and pdf.js then saves no drawing for the box. This gives
 * each such font the character map the form's main Helvetica already uses (the court's own map object, in the same
 * file): same font, same size, nothing visible changes.
 *
 * How: an update appended to the court's file, as PDF allows (an incremental update), redefining only those font
 * objects with an /Encoding entry, and a new cross-reference section pointing to them. Every byte of the court's file
 * stays as it was, and so does its protection: a font object holds no text, so nothing in the update needs encrypting.
 * Which fonts, and which map, come from fontMaps.json (scripts/forms/buildFontMaps.ts), keyed by the PDF's sha256.
 *
 * Used only when a box needs it (officialPdf.ts fillReadable): a download that needs no map stays byte for byte what
 * pdf.js makes of the court's file. Server only. States no law.
 */
import { createHash } from "node:crypto";
import table from "./fontMaps.json";

type Entry = { sha256: string; fonts: { object: number; name: string; dict: string; encoding: string }[] };
export const FONT_MAPS = table as Record<string, Entry>;

const latin1 = (bytes: Uint8Array) => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("latin1");

/** The court's file with its map-less box fonts given the main font's character map. `only` limits the fonts (tests). */
export function withCharacterMaps(pdfFile: string, bytes: Uint8Array, only?: (object: number) => boolean): Uint8Array {
  const entry = FONT_MAPS[pdfFile];
  if (!entry) throw new Error(`${pdfFile} is not in fontMaps.json: run scripts/forms/buildFontMaps.ts`);
  if (createHash("sha256").update(bytes).digest("hex") !== entry.sha256) throw new Error(`${pdfFile} is not the file fontMaps.json was built from: run scripts/forms/buildFontMaps.ts`);
  const fonts = entry.fonts.filter((font) => !only || only(font.object));
  if (!fonts.length) return bytes;

  // The file's last cross-reference section: where the update chains from, and the trailer values it must repeat.
  const text = latin1(bytes);
  const startxref = Number(/startxref\s+(\d+)\s+%%EOF\s*$/.exec(text)?.[1]);
  const dict = /^\s*\d+\s+\d+\s+obj\s*(<<[\s\S]*?>>)\s*stream/.exec(text.slice(startxref, startxref + 4096))?.[1] ?? /trailer\s*(<<[\s\S]*?>>)\s*startxref/.exec(text)?.[1];
  if (!Number.isFinite(startxref) || !dict) throw new Error(`${pdfFile}: its cross-reference section could not be read`);
  const field = (name: string, pattern: string) => new RegExp(`/${name}\\s*(${pattern})`).exec(dict)?.[1];
  const size = Number(field("Size", "\\d+"));
  const ref = "\\d+\\s+\\d+\\s+R";
  const keep = [["Root", field("Root", ref)], ["Encrypt", field("Encrypt", ref)], ["Info", field("Info", ref)], ["ID", field("ID", "\\[[^\\]]*\\]")]].filter(([, value]) => value);
  if (!size || !keep.some(([name]) => name === "Root")) throw new Error(`${pdfFile}: its trailer has no /Size or /Root`);

  // The redefined font objects, then a cross-reference stream for them (never encrypted, by the PDF standard).
  const chunks: string[] = ["\n"];
  let at = bytes.length + 1;
  const offsets = new Map<number, number>();
  for (const font of fonts) {
    if (!/^<<[\s\S]*>>$/.test(font.dict) || /\/Encoding/.test(font.dict)) throw new Error(`${pdfFile}: font ${font.object} is not a map-less font dictionary`);
    const object = `${font.object} 0 obj\n${font.dict.replace(/>>$/, `/Encoding ${font.encoding}>>`)}\nendobj\n`;
    offsets.set(font.object, at);
    chunks.push(object);
    at += object.length;
  }
  const xrefObject = size;
  offsets.set(xrefObject, at);
  const objects = [...offsets.keys()].sort((a, b) => a - b);
  const rows = Buffer.alloc(objects.length * 7);
  objects.forEach((object, index) => { rows.writeUInt8(1, index * 7); rows.writeUInt32BE(offsets.get(object)!, index * 7 + 1); rows.writeUInt16BE(0, index * 7 + 5); });
  const head = `${xrefObject} 0 obj\n<</Type/XRef/Size ${size + 1}${keep.map(([name, value]) => `/${name} ${value}`).join("")}/Prev ${startxref}/Index[${objects.map((object) => `${object} 1`).join(" ")}]/W[1 4 2]/Length ${rows.length}>>\nstream\n`;
  const tail = `\nendstream\nendobj\nstartxref\n${at}\n%%EOF\n`;
  return new Uint8Array(Buffer.concat([Buffer.from(bytes), Buffer.from(chunks.join(""), "latin1"), Buffer.from(head, "latin1"), rows, Buffer.from(tail, "latin1")]));
}

/** Whether pdf.js, filling `original` into `filled`, left a box for each viewer to draw (it could not encode its text). */
export function leftBoxesToViewers(original: Uint8Array, filled: Uint8Array): boolean {
  return /\/NeedAppearances\s*true/.test(latin1(filled.subarray(original.length)));
}
