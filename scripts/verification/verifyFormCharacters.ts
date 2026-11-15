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
 *   3. every text box the site fills, filled with French: pdf.js saves a drawing of it that reads back as the French
 *      exactly (the drawing a viewer shows and prints as saved). A form whose boxes cannot yet is listed in
 *      FRENCH_IN_BOXES_PENDING with the reason; an entry must still be needed (at least one box still fails), so it is
 *      deleted when the cause is fixed;
 *   4. Chinese in the overflow, or in a box: the download is refused with UnprintableText, which names each character
 *      (as written and as U+ code), and the message the person sees names them and does not say they did anything wrong;
 *   5. NEGATIVE CONTROL: the read-back comparison catches a French word printed without its accent.
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
import { fillOfficialPdf, filledFormPdf, officialPdfBytes, pdfBoxes } from "../../src/lib/case-system/forms/officialPdf";
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
 * Forms whose boxes cannot yet hold French as drawn by pdf.js, and why (15 Nov 2026). Many of the court's boxes carry
 * their own copy of Helvetica with no character map (no /Encoding: the font's standard set, which has no é, è, ç, €),
 * unlike the form's main Helvetica (PDFDocEncoding) or Arial (WinAnsiEncoding). pdf.js cannot write é in such a box, so
 * it saves no drawing for it and sets NeedAppearances, leaving each viewer to draw the box itself. Fixing it means
 * changing the court's PDF before filling (giving those boxes the form's own character map) or rebuilding the file
 * without its protection: the site owner's decision. Delete an entry when its form's boxes all pass.
 */
const FRENCH_IN_BOXES_PENDING: Record<string, string> = Object.fromEntries(
  ["small-claims/7A", "small-claims/1A", "small-claims/9A", "small-claims/8A", "family/8", "family/10", "family/13", "family/13.1"].map((id) => [id, "boxes with their own Helvetica without a character map: awaiting the site owner's decision (15 Nov 2026)"]),
);
const BOX_SAMPLE = "Côté Œuvre l’été – 5 € « Ève » “Noël”";

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
    await check(`3. ${map.id}: every text box filled with French draws it exactly${FRENCH_IN_BOXES_PENDING[map.id] ? " (pending: the entry must still be needed)" : ""}`, async () => {
      const bytes = officialPdfBytes(map.pdf.file);
      const names = [...new Set((await pdfBoxes(bytes)).filter((box) => box.type === "Tx").map((box) => box.name))];
      const drawn = await drawnText(await fillOfficialPdf(bytes, Object.fromEntries(names.map((name) => [name, BOX_SAMPLE]))));
      const right = new Set(drawn.filter((box) => box.lines.map((line) => line.text).join(" ").replace(/\s+/g, " ").trim() === BOX_SAMPLE).map((box) => box.name));
      const wrong = names.filter((name) => !right.has(name));
      if (FRENCH_IN_BOXES_PENDING[map.id]) {
        assert.ok(wrong.length > 0, `every box now draws French: delete "${map.id}" from FRENCH_IN_BOXES_PENDING`);
        console.log(`      ${wrong.length} of ${names.length} boxes cannot draw French yet: ${FRENCH_IN_BOXES_PENDING[map.id]}`);
      } else {
        assert.deepEqual(wrong, [], `${wrong.length} of ${names.length} boxes do not draw French exactly`);
      }
    });
  }

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
