/**
 * Builds src/lib/case-system/forms/fontMaps.json: for each official PDF the site fills, the box fonts that have no
 * character map, and the map the form's main font uses (site owner, 15 Nov 2026, option 2: "give boxes whose own font
 * has no character map the map the form's main font already uses (same font and size, nothing visible changes)").
 *
 * Why a table: the court's PDFs keep their widgets and fonts inside encrypted object streams, which neither pdf.js's API
 * nor pdf-lib can read. MuPDF can, but it is AGPL and not a dependency of the site, so it runs only here, at build time,
 * from a copy installed outside the project: MUPDF_MODULE=<path to mupdf/dist/mupdf.js>. The PDFs are fixed files: each
 * entry carries the PDF's sha256, and fontMaps.ts refuses a PDF whose sha256 differs, so a new court form must be run
 * through this again. test:form-maps (verifyFormCharacters.ts) proves the table right with pdf.js: every box draws French.
 *
 * Run: MUPDF_MODULE=/path/to/node_modules/mupdf/dist/mupdf.js node --import tsx scripts/forms/buildFontMaps.ts
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { FORM_MAPS } from "../../src/lib/case-system/forms/maps";

export type FontMapEntry = { sha256: string; fonts: { object: number; name: string; dict: string; encoding: string }[] };

async function main() {
  const modulePath = process.env.MUPDF_MODULE;
  if (!modulePath) throw new Error("Set MUPDF_MODULE to mupdf's dist/mupdf.js (installed outside the project; AGPL, build-time only)");
  const mupdf = await import(pathToFileURL(modulePath).href);
  const table: Record<string, FontMapEntry> = {};
  for (const file of [...new Set(FORM_MAPS.map((map) => map.pdf.file))]) {
    const bytes = readFileSync(file);
    const pdf = mupdf.Document.openDocument(bytes, "application/pdf").asPDF();
    const resolve = (ref: { asIndirect(): number }) => pdf.newIndirect(ref.asIndirect(), 0).resolve();
    const mainFonts = pdf.getTrailer().get("Root").get("AcroForm").get("DR").get("Font");
    const fonts = new Map<number, FontMapEntry["fonts"][number]>();
    for (let page = 0; page < pdf.countPages(); page++) {
      const annots = pdf.findPage(page).get("Annots");
      for (let index = 0; index < annots.length; index++) {
        for (let node = annots.get(index); node && !node.isNull(); node = node.get("Parent")) {
          const dr = node.get("DR");
          const own = dr.isNull() ? dr : dr.get("Font");
          if (own.isNull()) continue;
          own.forEach((ref: { isIndirect(): boolean; asIndirect(): number }, name: string) => {
            if (!ref.isIndirect()) throw new Error(`${file}: a box font written inline (${name}); fontMaps.ts handles only font objects`);
            const font = resolve(ref);
            if (!font.get("Encoding").isNull()) return;
            const main = mainFonts.get(name);
            const encoding = main.isNull() ? main : (main.isIndirect() ? resolve(main) : main).get("Encoding");
            if (encoding.isNull() || !encoding.isIndirect()) throw new Error(`${file}: the form's main ${name} has no character map object to share`);
            fonts.set(ref.asIndirect(), { object: ref.asIndirect(), name, dict: String(font), encoding: `${encoding.asIndirect()} 0 R` });
          });
        }
      }
    }
    table[file] = { sha256: createHash("sha256").update(bytes).digest("hex"), fonts: [...fonts.values()].sort((a, b) => a.object - b.object) };
    console.log(`${file}: ${fonts.size} box font(s) without a character map`);
  }
  writeFileSync("src/lib/case-system/forms/fontMaps.json", `${JSON.stringify(table, null, 1)}\n`);
}

void main();
