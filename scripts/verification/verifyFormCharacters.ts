/**
 * FRENCH TEXT IN THE DOWNLOADED FORMS (site owner, 15 Nov 2026: "French text prints correctly in the attached pages and
 * in the filled boxes: accents (é è ê à â ç î ï ô û ù ü œ æ and capitals), curly quotes, en and em dashes, the
 * apostrophe ’, and the euro sign … For characters no font here covers (for example Chinese), keep refusing with the
 * clear message; the message must say which characters and never blame the person"). Runs as part of test:form-maps.
 *
 * What it asserts, reading the downloaded PDF itself (filledFormPdf, what POST /api/cases/forms/filled sends), with no
 * browser, model, database or network:
 *   1. every character of the French sample, as printed (printableText.ts forPrinting: every kind of space as a space,
 *      the no-break hyphen as a hyphen), is measured with its real Helvetica width (helveticaWidths.json), so lines
 *      with French are wrapped by their true width, never by the "unknown: widest" guess;
 *   2. a Form 7A whose reasons end in French overflowing to the attached pages: the pages hold every French word exactly,
 *      in order, including French spacing (no-break, narrow no-break and thin spaces, a tab) printed as spaces;
 *   3. every text box of each form, filled with the site owner's real French values ("Gagné", "Élève", "Saint-Jérôme",
 *      "François-Xavier", "œuvre", "€"; fillReadable, what the download uses): pdf.js saves a drawing that reads back as
 *      the French exactly, no box is left for viewers to draw (NeedAppearances), MuPDF reads the same back (when
 *      MUPDF_MODULE points at a copy outside the project; skipped and said otherwise), and the court's protection is
 *      unchanged. Also a Form 7A filled from a real record with French names, company and city. A form whose boxes
 *      cannot yet is listed in FRENCH_IN_BOXES_PENDING with the reason; an entry must still be needed (at least one box
 *      still fails), so it is deleted when the cause is fixed (the list is empty since the fifth round);
 *   4. Chinese in the overflow, or in a box: the download is refused with UnprintableText, which names each character
 *      (as written and as U+ code), and the message the person sees names them and does not say they did anything wrong;
 *   5. NEGATIVE CONTROL: the read-back comparison catches a French word printed without its accent;
 *   6. a download whose words need no character map is byte for byte the court's file filled by pdf.js (clock stopped),
 *      for every form: nothing is appended, the protection is as before;
 *   7. NEGATIVE CONTROL: a file with one box font left without its map fails check 3's read-back.
 *
 * WHAT FAILURE THIS CATCHES: French that is dropped, garbled, refused, or measured as unknown (and so wrapped wrongly),
 * in the attached pages or in the boxes; a refusal that does not say which characters, or blames the person.
 *
 * Run: npm run test:form-maps
 */
import assert from "node:assert/strict";
import { FORM_7A } from "../../src/lib/case-system/forms/maps/form7A";
import { FORM_MAPS } from "../../src/lib/case-system/forms/maps";
import { formContextOf } from "../../src/lib/case-system/forms/formContext";
import { pathToFileURL } from "node:url";
import { fillOfficialPdf, fillReadable, filledFormPdf, officialPdfBytes, pdfBoxes } from "../../src/lib/case-system/forms/officialPdf";
import { fillForm, pdfValues } from "../../src/lib/case-system/forms/formMap";
import { fitValue } from "../../src/lib/case-system/forms/textFit";
import { FONT_MAPS, leftBoxesToViewers, withCharacterMaps } from "../../src/lib/case-system/forms/fontMaps";
import { UnprintableText, forPrinting, unprintableMessage } from "../../src/lib/case-system/forms/printableText";
import widths from "../../src/lib/case-system/forms/helveticaWidths.json";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { drawnText } from "./pdfDrawnText";

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
const ID = "00000000-0000-4000-8000-000000000618";

/** Every character the site owner listed, lower case and capitals, then real French sentences using them. */
export const FRENCH_CHARACTERS = "é è ê à â ç î ï ô û ù ü œ æ É È Ê À Â Ç Î Ï Ô Û Ù Ü Œ Æ “ ” ‘ ’ – — €";
const FRENCH =
  `Le 3 février, l’entrepreneur a quitté le chantier. « Il reste à poser le plâtre », a‑t‑il écrit — sans préciser la date. ` +
  `Coût : 1 250 € ; reçu nº 12.\tOù ? À Hull, près de l’Œuvre Saint‑Jean ; « naïve » Noël, Ève, Ôter, Ïle, Ûn, Ùn. ` +
  `“Citation” et ‘citation’ – fin. ${FRENCH_CHARACTERS}`;
/** The French as the pages should hold it: every kind of space printed as a space. */
const words = (text: string) => text.split(/[\s   ]+/).filter(Boolean);

const SENTENCE = (n: number) => `On day ${n} the contractor left the kitchen unfinished and did not return any of my calls or messages. `;
const LONG = Array.from({ length: 150 }, (_, index) => SENTENCE(index + 1)).join("").trim();
const record = (story: string): Checkpoint => ({
  version: 1, flowId: ID, courtPath: "small-claims", revision: ID,
  sections: {
    situation: { record: { where: "starting", court: "small-claims", filed: "nothing" } },
    story: { text: story },
    caseFile: { parties: { version: 1, declined: [], list: [
      { id: "you", you: true, side: "yours", kind: "person", details: { firstName: "Test", lastName: "Person", street: "1 Example Street", city: "Ottawa", province: "ON", postalCode: "K1A 0A1" }, unsure: [] },
      { id: "o1", side: "other", kind: "company", details: { companyName: "Example Renovations Inc.", street: "2 Example Road", city: "Ottawa", province: "ON", postalCode: "K2P 0A5" }, unsure: [] },
    ] } },
  } as never,
});

/**
 * Forms whose boxes cannot yet hold French as drawn by pdf.js, with the reason. An entry must still be needed (at least
 * one box still fails), so it is deleted when the cause is fixed. Empty since 15 Nov 2026 (fifth round): the boxes whose
 * own Helvetica had no character map are given the form's main map when a value needs it (fontMaps.ts). Until then all 8
 * forms were listed.
 */
const FRENCH_IN_BOXES_PENDING: Record<string, string> = {};
/** The site owner's real French values (15 Nov 2026), together in every box. */
const REAL_FRENCH = ["Gagné", "Élève", "Saint-Jérôme", "François-Xavier", "œuvre", "€"];
const BOX_SAMPLE = REAL_FRENCH.join(" ");
const ASCII_SAMPLE = "Test Person 1 Example Street";

/** The boxes of `bytes` whose drawing (pdf.js's operator list) does not read back as `want`. */
async function wrongInPdfJs(bytes: Uint8Array, names: readonly string[], want: string): Promise<string[]> {
  const right = new Set((await drawnText(bytes)).filter((box) => box.lines.map((line) => line.text).join(" ").replace(/\s+/g, " ").trim() === want).map((box) => box.name));
  return names.filter((name) => !right.has(name));
}

/**
 * The same, read by MuPDF from each box's drawing. MuPDF is AGPL and not a dependency of the site: this runs only when
 * MUPDF_MODULE points at a copy installed outside the project (null otherwise, and the check says it was skipped).
 */
async function wrongInMupdf(bytes: Uint8Array, names: readonly string[], want: string, each?: Readonly<Record<string, string>>): Promise<string[] | null> {
  if (!process.env.MUPDF_MODULE) return null;
  const mupdf = await import(pathToFileURL(process.env.MUPDF_MODULE).href);
  const doc = mupdf.Document.openDocument(bytes, "application/pdf");
  const read = new Map<string, string[]>();
  for (let page = 0; page < doc.countPages(); page++) for (const widget of doc.loadPage(page).getWidgets()) {
    const text = String(widget.toDisplayList().toStructuredText("preserve-whitespace").asText()).replace(/\s+/g, " ").trim();
    read.set(widget.getName(), [...(read.get(widget.getName()) ?? []), text]);
  }
  const expected = (name: string) => (each ? each[name] : want).replace(/\s+/g, " ").trim();
  return names.filter((name) => !(read.get(name) ?? []).every((text) => text === expected(name))).map((name) => `${name}: ${expected(name)} read as ${JSON.stringify(read.get(name))}`);
}

/** The permissions a protected PDF grants (pdf.js), or null when it has no protection. */
async function permissions(bytes: Uint8Array): Promise<number[] | null> {
  const lib = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as PdfJs;
  const task = lib.getDocument({ data: bytes.slice(), verbosity: lib.VerbosityLevel.ERRORS });
  const granted = await (await task.promise).getPermissions();
  await task.destroy();
  return granted ? [...granted].sort((a, b) => a - b) : null;
}

/**
 * Runs `work` with the clock stopped and pdf.js's randomness seeded, so two fills of the same values can be compared
 * byte for byte. pdf.js encrypts each string it writes into a protected file with AES and a fresh random starting block
 * (crypto.getRandomValues), so without this no two fills are alike, even of the same file and values (15 Nov 2026).
 */
async function repeatable<T>(work: () => Promise<T>): Promise<T> {
  const RealDate = Date;
  const fixed = new RealDate("2026-11-15T12:00:00Z").getTime();
  class FixedDate extends RealDate { constructor(...args: unknown[]) { if (args.length) super(...(args as [number])); else super(fixed); } static now() { return fixed; } }
  let seed = 0;
  Object.defineProperty(globalThis.crypto, "getRandomValues", { configurable: true, value: <A extends ArrayBufferView>(array: A) => { const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength); for (let i = 0; i < view.length; i++) view[i] = (seed++ * 37 + 11) & 255; return array; } });
  globalThis.Date = FixedDate as DateConstructor;
  try { return await work(); } finally { globalThis.Date = RealDate; delete (globalThis.crypto as unknown as Record<string, unknown>).getRandomValues; }
}

let failed = 0;
const check = async (name: string, run: () => void | Promise<void>) => { try { await run(); console.log(`PASS  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n").slice(0, 8).join("\n      ")}`); } };

/** The text on the pages after the official form's own pages. */
async function attachedText(bytes: Uint8Array, formPages: number): Promise<string[]> {
  const lib = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as PdfJs;
  const task = lib.getDocument({ data: bytes.slice(), disableFontFace: true, verbosity: lib.VerbosityLevel.ERRORS });
  const doc = await task.promise;
  const out: string[] = [];
  for (let page = formPages + 1; page <= doc.numPages; page++) for (const item of (await (await doc.getPage(page)).getTextContent()).items) if ("str" in item && item.str.trim()) out.push(item.str);
  await task.destroy();
  return out;
}

/** The French words missing or changed in `got`, in order. */
function frenchProblems(got: readonly string[]): string[] {
  // The French as printed: the no-break hyphen drawn as a hyphen (printableText.ts); every letter as written.
  const want = words(forPrinting(FRENCH));
  const all = words(got.join(" "));
  const at = all.indexOf(want[0]);
  const found = at === -1 ? [] : all.slice(at, at + want.length);
  return want.flatMap((word, index) => (found[index] === word ? [] : [`word ${index}: "${word}" printed as "${found[index] ?? "(nothing)"}"`])).slice(0, 6);
}

async function main() {
  await check("1. every French character is measured with its real Helvetica width", () => {
    const unmeasured = [...new Set(forPrinting(FRENCH).replace(/\s/g, ""))].filter((char) => !(char in widths));
    assert.deepEqual(unmeasured, [], `measured as the widest, unknown: ${unmeasured.join(" ")}`);
  });

  const formPages = (await pdfBoxes(officialPdfBytes(FORM_7A.pdf.file))).reduce((most, box) => Math.max(most, box.page), 0);
  await check("2. Form 7A, French in the overflow: the attached pages hold every French word exactly", async () => {
    const bytes = await filledFormPdf(FORM_7A, formContextOf(record(`${LONG} ${FRENCH}`)));
    assert.deepEqual(frenchProblems(await attachedText(bytes, formPages)), []);
  });

  for (const map of FORM_MAPS) {
    await check(`3. ${map.id}: every text box, given each real French value that fits it (${REAL_FRENCH.join(", ")}), draws it exactly in pdf.js and MuPDF, with the court's protection kept${FRENCH_IN_BOXES_PENDING[map.id] ? " (pending: the entry must still be needed)" : ""}`, async () => {
      const official = officialPdfBytes(map.pdf.file);
      const names = [...new Set((await pdfBoxes(official)).filter((box) => box.type === "Tx").map((box) => box.name))];
      // Six passes: each box gets each real value once, as the site would put it there (textFit fitValue: only a value
      // that fits; a value too long for the box is left out, as fillForm leaves it blank, and counted).
      const wrongPdfJs: string[] = [], wrongMupdf: string[] = [], tooLong: string[] = [];
      let mupdfRan = false, viewers = false, protection = true;
      for (let pass = 0; pass < REAL_FRENCH.length; pass++) {
        const values: Record<string, string> = {};
        names.forEach((name, index) => {
          const value = REAL_FRENCH[(index + pass) % REAL_FRENCH.length];
          const fit = fitValue(map.pdf.file, name, value);
          if (fit && !fit.fits) tooLong.push(`${name}: ${value}`); else values[name] = fit?.fits ? fit.value : value;
        });
        const filled = await fillReadable(map.pdf.file, values);
        viewers ||= leftBoxesToViewers(official, filled);
        if (JSON.stringify(await permissions(filled)) !== JSON.stringify(await permissions(official))) protection = false;
        const drawn = await drawnText(filled);
        for (const [name, value] of Object.entries(values)) {
          const boxes = drawn.filter((box) => box.name === name).map((box) => box.lines.map((line) => line.text).join(" ").replace(/\s+/g, " ").trim());
          if (!boxes.length || boxes.some((text) => text !== value.replace(/\s+/g, " ").trim())) wrongPdfJs.push(`${name}: ${value} drawn as ${JSON.stringify(boxes)}`);
        }
        const mupdf = await wrongInMupdf(filled, Object.keys(values), "", values);
        if (mupdf) { mupdfRan = true; wrongMupdf.push(...mupdf); }
      }
      if (FRENCH_IN_BOXES_PENDING[map.id]) {
        assert.ok(wrongPdfJs.length > 0, `every box now draws French: delete "${map.id}" from FRENCH_IN_BOXES_PENDING`);
        console.log(`      ${wrongPdfJs.length} box values cannot draw French yet: ${FRENCH_IN_BOXES_PENDING[map.id]}`);
        return;
      }
      assert.deepEqual(wrongPdfJs.slice(0, 5), [], `pdf.js: ${wrongPdfJs.length} of ${names.length * REAL_FRENCH.length} box values do not draw exactly`);
      assert.equal(viewers, false, "a box was still left for each viewer to draw (NeedAppearances)");
      if (!mupdfRan) console.log("      MuPDF read-back skipped: MUPDF_MODULE is not set (MuPDF is not a dependency of the site)");
      else assert.deepEqual(wrongMupdf.slice(0, 5), [], `MuPDF: ${wrongMupdf.length} box values do not read back exactly`);
      assert.ok(protection, "the court's protection changed");
      console.log(`      ${names.length} boxes x ${REAL_FRENCH.length} values${mupdfRan ? ", pdf.js and MuPDF" : ", pdf.js"}; ${tooLong.length} value(s) too long for their box, left out as the site would${tooLong.length ? `: ${[...new Set(tooLong.map((entry) => entry.split(": ")[0]))].slice(0, 6).join(" / ")}` : ""}`);
    });
  }

  await check("3. Form 7A from a real record (names, company, city in French): every filled box reads back as recorded", async () => {
    const rec = record("A short story.");
    const parties = (rec.sections as unknown as { caseFile: { parties: { list: { details: Record<string, string> }[] } } }).caseFile.parties.list;
    Object.assign(parties[0].details, { firstName: "François-Xavier", lastName: "Gagné", city: "Saint-Jérôme", street: "12 rue de l’Église" });
    Object.assign(parties[1].details, { companyName: "Œuvre Élève Rénovations Inc.", city: "Montréal" });
    const ctx = formContextOf(rec);
    const want = Object.entries(pdfValues(fillForm(FORM_7A, ctx))).filter((entry): entry is [string, string] => typeof entry[1] === "string" && /[^\x20-\x7e]/.test(entry[1]));
    assert.ok(want.length >= 4, "the record's French did not reach the form");
    const drawn = await drawnText(await filledFormPdf(FORM_7A, ctx));
    const wrong = want.filter(([name, value]) => drawn.find((box) => box.name === name)?.lines.map((line) => line.text).join(" ").replace(/\s+/g, " ").trim() !== value.replace(/\s+/g, " ").trim());
    assert.deepEqual(wrong.map(([name, value]) => `${name}: ${value}`), []);
  });

  await check("6. a download whose words need no character map is byte for byte the court's file filled by pdf.js (nothing added)", async () => {
    for (const map of FORM_MAPS) {
      const official = officialPdfBytes(map.pdf.file);
      const names = [...new Set((await pdfBoxes(official)).filter((box) => box.type === "Tx").map((box) => box.name))];
      const values = Object.fromEntries(names.map((name) => [name, ASCII_SAMPLE]));
      const now = await repeatable(() => fillReadable(map.pdf.file, values));
      const plain = await repeatable(() => fillOfficialPdf(official, values));
      assert.ok(Buffer.from(now).equals(Buffer.from(plain)), `${map.id}: the download changed although no box needed a map`);
    }
    // Control: the same comparison does see the map update when French needs it.
    const official = officialPdfBytes(FORM_7A.pdf.file);
    const french = { "Defendant's last name or company's name": "Gagné" };
    const [mapped, plain] = [await repeatable(() => fillReadable(FORM_7A.pdf.file, french)), await repeatable(() => fillOfficialPdf(official, french))];
    assert.ok(!Buffer.from(mapped).equals(Buffer.from(plain)), "the comparison cannot tell a mapped download from a plain one");
  });

  await check("7. NEGATIVE CONTROL: with one box font left without its map, some box no longer draws French", async () => {
    const official = officialPdfBytes(FORM_7A.pdf.file);
    const names = [...new Set((await pdfBoxes(official)).filter((box) => box.type === "Tx").map((box) => box.name))];
    const left = FONT_MAPS[FORM_7A.pdf.file].fonts[0].object;
    const partial = await fillOfficialPdf(withCharacterMaps(FORM_7A.pdf.file, official, (object) => object !== left), Object.fromEntries(names.map((name) => [name, BOX_SAMPLE])));
    assert.ok((await wrongInPdfJs(partial, names, BOX_SAMPLE)).length > 0, "leaving a font without its map was not caught");
  });

  await check("4. Chinese in the overflow: refused, the characters named, and the message does not blame the person", async () => {
    const story = `${LONG} The builder wrote 你好 on the invoice.`;
    let error: unknown = null;
    try { await filledFormPdf(FORM_7A, formContextOf(record(story))); } catch (caught) { error = caught; }
    assert.ok(error instanceof UnprintableText, `not refused with UnprintableText: ${String(error)}`);
    assert.deepEqual(error.characters, ["你", "好"]);
    assert.match(error.message, /U\+4F60/);
    const message = unprintableMessage(error.characters);
    for (const char of ["你", "好"]) assert.ok(message.includes(char), `the message does not name ${char}: ${message}`);
    assert.doesNotMatch(message, /\byour (words|text|writing)\b|\byou (used|wrote|typed|entered)\b|invalid|not allowed|wrong/i, `the message blames the person: ${message}`);
  });

  await check("4. Chinese in a box (the other party's name): refused, the characters named", async () => {
    const rec = record("A short story.");
    const parties = (rec.sections as unknown as { caseFile: { parties: { list: { details: Record<string, string> }[] } } }).caseFile.parties.list;
    parties[1].details.companyName = "北京 Renovations Inc.";
    await assert.rejects(filledFormPdf(FORM_7A, formContextOf(rec)), (error: Error) => error instanceof UnprintableText && error.characters.join("") === "北京");
  });

  await check("5. negative control: a French word printed without its accent is caught", () => {
    const unaccented = words(forPrinting(FRENCH)).map((word) => (word === "février," ? "fevrier," : word));
    assert.ok(frenchProblems(unaccented).some((problem) => problem.includes("février")), "a missing accent was not caught");
  });

  if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}

void main();
