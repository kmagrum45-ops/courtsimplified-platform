/**
 * verifyPrintableEverywhere — every place that writes the person's words into a PDF goes through the one printing gate
 * (printableText.ts printableValues / unprintableCharacters), or is declared here with the reason it does not yet.
 *
 * Why (site owner, 16 Nov 2026: "a fix is not done until it works everywhere the same behaviour appears"): the French
 * and unprintable-character fix of 15 Nov reached the official-form download only. The older form filler
 * (app/api/generate-form, every court, pdf-lib's Helvetica) still left a box blank on a character it could not write,
 * or showed the person a raw "WinAnsi cannot encode" error. A new PDF writer must not repeat that unnoticed.
 *
 * What it asserts:
 *   1. Search: every source file under app/, src/ and components/ that writes text into a PDF (pdf-lib `drawText(` or
 *      `setText(`, pdf.js `annotationStorage.setValue(`) calls the gate, or is in DECLARED with a reason.
 *   2. A declared file still writes text into a PDF and still does not call the gate (a stale entry fails: delete it).
 *   3. The official-form fillers (fillOfficialPdf, fillReadable) are called only inside officialPdf.ts, so no route
 *      fills a court form around filledFormPdf's gate.
 *   4. Negative control: a synthetic writer with no gate is caught by the same classifier.
 *   5. Every court (Small Claims, Civil, Family), through generate-form's own getCaseValues: French names pass unchanged,
 *      a narrow no-break space prints as a space, Chinese is refused naming its characters with the existing message.
 *   6. generate-form's pdf-lib path on an unprotected court form (Family 13): the French values draw (appearances are
 *      built without error), where before the gate a Chinese value threw inside updateFieldAppearances, was swallowed,
 *      and the form was saved with no drawing for its boxes.
 *   7. The exhibit book (Small Claims, Civil, Family): French names, titles and file names print and read back.
 *   8. The exhibit book refuses a character no font here covers, naming them all at once, with the owner's message
 *      (decided 16 Nov 2026), instead of a raw encoding error midway through.
 *   9. The exhibit-book route answers that refusal with that message.
 *
 * No network, no model. Env: NEXT_PUBLIC_SUPABASE_URL / ANON_KEY placeholders only (the route module reads them).
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { PDFDocument, PDFTextField } from "pdf-lib";
import { UnprintableText, exhibitBookUnprintableMessage, printableValues, unprintableMessage } from "../../src/lib/case-system/forms/printableText";
import { buildExhibitBook, type ExhibitBookDocument } from "../../src/lib/case-workspace/exhibitBook";

/** Every piece of text pdf.js reads on the PDF's pages, joined. */
async function pdfText(bytes: Uint8Array): Promise<string> {
  const lib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = lib.getDocument({ data: bytes.slice(), disableFontFace: true, verbosity: lib.VerbosityLevel.ERRORS });
  const doc = await task.promise;
  const out: string[] = [];
  for (let page = 1; page <= doc.numPages; page++) for (const item of (await (await doc.getPage(page)).getTextContent()).items) if ("str" in item) out.push(item.str);
  await task.destroy();
  return out.join(" ");
}

const ROOT = process.cwd();
const WRITES_TEXT = /\.drawText\(|\.setText\(|annotationStorage\.setValue\(/;
const CALLS_GATE = /\bprintableValues\(|\bunprintableCharacters\(/;

/** Files that write into a PDF without the gate, each with why. Delete an entry when the file is fixed. */
const DECLARED: Record<string, string> = {};

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx|mts)$/.test(name) && !/\.(test|spec)\./.test(name)) out.push(full);
  }
  return out;
}

const files = ["app", "src", "components"].flatMap((dir) => { try { return sourceFiles(path.join(ROOT, dir)); } catch { return []; } });
const rel = (file: string) => path.relative(ROOT, file).split(path.sep).join("/");
const writers = files.filter((file) => WRITES_TEXT.test(readFileSync(file, "utf8")));
const ungated = (source: string) => WRITES_TEXT.test(source) && !CALLS_GATE.test(source);

let failures = 0;
async function check(name: string, run: () => void | Promise<void>) {
  try { await run(); console.log(`PASS ${name}`); } catch (error) { failures++; console.log(`FAIL ${name}\n  ${(error as Error).message.split("\n").join("\n  ")}`); }
}

(async () => {
  console.log(`Places that write text into a PDF (${writers.length}):`);
  for (const file of writers) console.log(`  ${rel(file)}: ${ungated(readFileSync(file, "utf8")) ? (DECLARED[rel(file)] ? "declared, not gated" : "NOT GATED") : "gated"}`);

  await check("1. every PDF writer calls the printing gate or is declared", () => {
    const missing = writers.map(rel).filter((file) => ungated(readFileSync(path.join(ROOT, file), "utf8")) && !DECLARED[file]);
    assert.deepEqual(missing, [], `write the person's words through printableValues (printableText.ts), or declare why not: ${missing.join(", ")}`);
  });

  await check("2. every declared entry is still needed", () => {
    for (const file of Object.keys(DECLARED)) {
      let source = "";
      try { source = readFileSync(path.join(ROOT, file), "utf8"); } catch { /* gone */ }
      assert.ok(ungated(source), `${file} no longer writes text ungated: delete it from DECLARED`);
    }
  });

  await check("3. the official-form fillers are called only inside officialPdf.ts", () => {
    const outside = files.map(rel).filter((file) => file !== "src/lib/case-system/forms/officialPdf.ts" && /\b(fillOfficialPdf|fillReadable)\(/.test(readFileSync(path.join(ROOT, file), "utf8")));
    assert.deepEqual(outside, [], "fill a court form through filledFormPdf, which passes its values through the gate");
  });

  await check("4. negative control: a writer with no gate is caught", () => {
    assert.equal(ungated(`page.drawText(name, { font });`), true);
    assert.equal(ungated(`const v = printableValues(values, "pages"); page.drawText(v.name, { font });`), false);
  });

  const { getCaseValues } = await import("../../app/api/generate-form/route");
  const french = { plaintiffName: "François-Xavier Gagné", defendantName: "Élève Saint-Jérôme œuvre €" };

  for (const court of ["small-claims", "civil", "family"] as const) {
    await check(`5. ${court}: French prints unchanged, a narrow no-break space prints as a space, Chinese is refused`, () => {
      const printed = printableValues(getCaseValues({ ...french, defendantAddress: "12 rue Principale" }, court), "pages");
      assert.equal(printed.plaintiffName, french.plaintiffName);
      assert.equal(printed.defendantName, french.defendantName);
      assert.equal(printed.defendantAddress, "12 rue Principale");
      let error: unknown;
      try { printableValues(getCaseValues({ ...french, plaintiffName: "王 北京" }, court), "pages"); } catch (caught) { error = caught; }
      assert.ok(error instanceof UnprintableText, "Chinese was not refused");
      assert.deepEqual(error.characters, ["王", "北", "京"]);
      assert.equal(unprintableMessage(error.characters), `The form could not be made, because the site cannot yet print these characters in a PDF: 王 北 京. This is a limit of the site. You could write them by hand on the printed form.`);
    });
  }

  await check("6. generate-form's pdf-lib path draws French in an unprotected court form (Family 13)", async () => {
    const doc = await PDFDocument.load(readFileSync(path.join(ROOT, "docs/sources/forms/flr-13-may21-en-fil.pdf")), { ignoreEncryption: true, throwOnInvalidObject: false, updateMetadata: false });
    const fields = doc.getForm().getFields().filter((field): field is PDFTextField => field instanceof PDFTextField);
    assert.ok(fields.length > 0, "Family 13 has no text boxes pdf-lib can fill");
    const value = printableValues(french, "pages").plaintiffName;
    for (const field of fields) field.setText(value);
    doc.getForm().updateFieldAppearances();
    const reread = await PDFDocument.load(await doc.save({ useObjectStreams: false, addDefaultPage: false, updateFieldAppearances: false }));
    assert.ok(reread.getForm().getFields().filter((field): field is PDFTextField => field instanceof PDFTextField).every((field) => field.getText() === value));
  });

  // The exhibit book has no court branch (exhibitBook.ts); it is built once per court so a future branch is covered.
  const bookDocument = (n: number, userLabel: string | null, originalName: string): ExhibitBookDocument => ({ id: `d${n}`, exhibitNumber: n, exhibitSuffix: null, userLabel, originalName, userType: null, userDate: "2026-03-14", mime: "application/msword" });
  for (const court of ["Small Claims", "Civil", "Family"]) {
    await check(`7. exhibit book (${court}): French names and titles print and read back; a narrow no-break space prints as a space`, async () => {
      const book = await buildExhibitBook(
        { title: `Gagné c. Saint-Jérôme (${court})`, courtFileNumber: "SC-26-0001", courtName: null, plaintiff: "François-Xavier Gagné", defendant: "Élève Inc." },
        [bookDocument(1, "Facture de l’œuvre, 1 200 €", "facture.docx"), bookDocument(2, null, "reçu-Jérôme.docx")],
        { preparedOn: "2026-11-16" },
      );
      const text = await pdfText(book.bytes);
      for (const expected of ["François-Xavier Gagné", "Élève Inc.", `Gagné c. Saint-Jérôme (${court})`, "Facture de l’œuvre, 1 200 €", "reçu-Jérôme.docx"]) {
        assert.ok(text.includes(expected), `not printed: ${expected}`);
      }
    });
    await check(`8. exhibit book (${court}): a character no font here covers is refused, all at once, with the exhibit-book message`, async () => {
      let error: unknown;
      try {
        await buildExhibitBook({ title: "王 v. 北", courtFileNumber: null, courtName: null, plaintiff: "Gagné", defendant: null }, [bookDocument(1, "收据", "x.docx")], { preparedOn: "2026-11-16" });
      } catch (caught) { error = caught; }
      assert.ok(error instanceof UnprintableText, `not refused with UnprintableText: ${error instanceof Error ? error.name : String(error)}`);
      assert.deepEqual(error.characters, ["王", "北", "收", "据"]);
      assert.equal(exhibitBookUnprintableMessage(error.characters), "The exhibit book could not be made, because the site cannot yet print these characters in a PDF: 王 北 收 据. This is a limit of the site, not a problem with what you wrote. For now, you can use a version of the name or title without them.");
    });
  }

  await check("9. the exhibit-book route answers that refusal with the exhibit-book message (422)", () => {
    const route = readFileSync(path.join(ROOT, "app/api/workspace/exhibit-book/route.ts"), "utf8");
    assert.match(route, /error instanceof UnprintableText\) return refuse\(422, exhibitBookUnprintableMessage\(error\.characters\)\)/);
  });

  console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
})();
