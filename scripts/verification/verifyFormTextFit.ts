/**
 * NO TEXT IS CUT OFF ON A FILLED OFFICIAL FORM (Lane B, 15 Nov 2026; the 18B lesson: a name and an address printed on
 * top of each other). Runs as the third part of test:form-maps.
 *
 * The judge is pdf.js's own drawing of each filled box (pdfDrawnText.ts): the font size it used and where every line
 * ends. Found 15 Nov 2026 with a full test record of long values: on Form 9A, four boxes ran past their right edge
 * (two emails, a representative's name, "also known as": fixed 10pt boxes cannot shrink); on Form 7A, the reasons
 * boxes lost the last lines below the bottom and cut letters at the right edge (pdf.js 6.3's line splitting skips the
 * first glyph of each new line when it measures, and its auto size counts lines at the font size, not the line height).
 *
 * What it asserts, with no browser, model, database or network:
 *   1. filled from a record of long values (long names, a long address, long emails, reasons longer than both boxes), on
 *      every form the site fills: no line of any box runs past its right edge or below its bottom, and no box is drawn
 *      under 6pt;
 *   2. nothing is lost instead: a value too long for its box is left blank on the form with the reason, which holds the
 *      whole value to write by hand; the reasons keep every word across the first box, the continued box and the
 *      attached pages;
 *   3. NEGATIVE CONTROL: the same long values written straight into Form 9A, with no fitting, are caught as cut off;
 *   4. the box sizes the site fits text to (boxGeometry.json) are the ones in the official PDFs today.
 *
 * WHAT FAILURE THIS CATCHES: a filled form that prints part of a name, address or the reasons, or prints it too small to
 * read, while the screen says it is filled.
 *
 * Run: npm run test:form-maps
 */
import assert from "node:assert/strict";
import { FORM_MAPS } from "../../src/lib/case-system/forms/maps";
import { FORM_9A } from "../../src/lib/case-system/forms/maps/form9A";
import { FORM_7A } from "../../src/lib/case-system/forms/maps/form7A";
import { FORM_1A, additionalParties, form1ACopies } from "../../src/lib/case-system/forms/maps/form1A";
import { fillForm, pdfValues, type FormContext, type FormMapDefinition } from "../../src/lib/case-system/forms/formMap";
import { formContextOf } from "../../src/lib/case-system/forms/formContext";
import { fillOfficialPdf, officialPdfBytes, pdfBoxes } from "../../src/lib/case-system/forms/officialPdf";
import { BOX_GEOMETRY, MIN_FONT_SIZE } from "../../src/lib/case-system/forms/textFit";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { cutOff, drawnText } from "./pdfDrawnText";

const ID = "00000000-0000-4000-8000-000000000614";
const at = (street: string, city: string, postalCode: string) => ({ street, city, province: "ON", postalCode });
const LONG_CO = "Example Renovations and General Contracting Services of Eastern Ontario Incorporated";
const LONG_STREET = "Unit 1205, 1234567 Example Boulevard West, Building C, Rear Entrance";
const SENTENCE = "The contractor left the kitchen unfinished and did not return any of my calls or messages for six weeks. ";
const STORY = Array.from({ length: 140 }, (_, index) => SENTENCE.replace("six weeks", `${index + 2} weeks`)).join("");
const PARTIES = {
  version: 1, declined: [],
  list: [
    { id: "you", you: true, side: "yours", kind: "person", details: { firstName: "Maximiliana-Josephine", secondName: "Alexandrina", lastName: "Featherstonehaugh-Wolfeschlegel", alsoKnownAs: "Maxi Featherstonehaugh, M. J. A. Wolfeschlegel", ...at(LONG_STREET, "Whitchurch-Stouffville", "L4A 0A1"), phone: "905-555-0123 ext. 4567", email: "maximiliana.featherstonehaugh-wolfeschlegel@example-long-domain.com" }, unsure: [] },
    { id: "y2", side: "yours", kind: "company", details: { companyName: `Second ${LONG_CO}`, ...at(LONG_STREET, "Whitchurch-Stouffville", "L4A 0A2") }, unsure: [] },
    { id: "o1", side: "other", kind: "company", details: { companyName: LONG_CO, ...at(LONG_STREET, "Clarington", "L1C 0A1"), phone: "905-555-0199", email: "accounts.receivable.department@example-renovations-eastern-ontario.com", repName: "Bartholomew Montgomery-Fitzwilliam Paralegal Professional Corporation", repLso: "P1234567", repStreet: LONG_STREET, repCity: "Clarington", repProvince: "ON", repPostalCode: "L1C 0A2", repPhone: "905-555-0198", repEmail: "bartholomew@montgomery-fitzwilliam-paralegal.example.com" }, unsure: [] },
    { id: "o2", side: "other", kind: "person", details: { firstName: "Pat", lastName: "Owner", ...at("50 Example Road", "Ottawa", "K2P 0A5") }, unsure: [] },
  ],
};
const record = (court: "small-claims" | "family", where: "starting" | "served"): Checkpoint => ({
  version: 1, flowId: ID, courtPath: court, revision: ID,
  sections: {
    situation: { record: { where, court, ...(where === "starting" ? { filed: "nothing" } : {}) } },
    story: { text: STORY },
    "small-claims": { input: { amountClaimed: "34999.99" } },
    builder: { triageState: { record: { marriedToOtherParty: "yes", caseInvolvesChildren: "yes" } } },
    caseFile: { parties: PARTIES },
  } as never,
});

/** Each form with the record it is filled from: the claim and Family 8 by the person starting, the rest answering. */
function contexts(map: FormMapDefinition): FormContext[] {
  const ctx = formContextOf(record(map.court === "family" ? "family" : "small-claims", map.id === "small-claims/7A" || map.id === "family/8" ? "starting" : "served"));
  if (map.id !== FORM_1A.id) return [ctx];
  return form1ACopies(additionalParties(ctx.plaintiffs, ctx.defendants)).map((copy) => ({ ...ctx, additional: copy }));
}

let failed = 0;
const check = async (name: string, run: () => void | Promise<void>) => { try { await run(); console.log(`PASS  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n").slice(0, 10).join("\n      ")}`); } };
const words = (text: string) => text.split(/\s+/).filter(Boolean);

async function main() {
  for (const map of FORM_MAPS) {
    await check(`1. ${map.id}, long values: no box is cut off or drawn under ${MIN_FONT_SIZE}pt`, async () => {
      const problems: string[] = [];
      for (const ctx of contexts(map)) {
        const boxes = await drawnText(await fillOfficialPdf(officialPdfBytes(map.pdf.file), pdfValues(fillForm(map, ctx))));
        for (const cut of cutOff(boxes)) problems.push(`p${cut.page} [${cut.name}] ${cut.why}`);
        for (const box of boxes) if (box.fontSize !== null && box.fontSize < MIN_FONT_SIZE - 0.01) problems.push(`p${box.page} [${box.name}] drawn at ${box.fontSize}pt`);
      }
      assert.deepEqual(problems, []);
    });
  }

  await check("2. Form 9A, long values: each value too long for its box is left blank, and the reason holds the whole value", () => {
    const results = fillForm(FORM_9A, contexts(FORM_9A)[0]);
    const tooLong = results.filter((result) => result.state === "blank" && /too long/i.test(result.why));
    assert.ok(tooLong.length >= 3, `only ${tooLong.length} box(es) said to be too long`);
    for (const value of ["accounts.receivable.department@example-renovations-eastern-ontario.com", "maximiliana.featherstonehaugh-wolfeschlegel@example-long-domain.com", "Maxi Featherstonehaugh, M. J. A. Wolfeschlegel"]) {
      assert.ok(tooLong.some((result) => result.state === "blank" && result.why.includes(value)), `"${value}" is neither on the form nor in a reason`);
    }
  });
  for (const map of [FORM_7A, FORM_9A]) {
    await check(`2. ${map.id}, reasons longer than both boxes: every word of the person's reasons is kept, in order, across the boxes and the attached pages`, () => {
      const ctx = contexts(map)[0];
      const results = fillForm(map, ctx);
      const text = results.filter((result) => result.state === "filled" && typeof result.value === "string" && /^Reasons for/.test(result.box)).map((result) => String((result as { value: string }).value)).join(" ");
      const attached = results.find((result) => result.box === "Additional pages attached because more room was needed");
      assert.ok(attached?.state === "filled" && attached.value === true, "the attached-pages box is not ticked");
      const onForm = words(text);
      const all = words(ctx.reasons);
      assert.deepEqual(onForm, all.slice(0, onForm.length), "the boxes do not hold the start of the reasons, in order");
      assert.ok(onForm.length > 200 && onForm.length < all.length, `${onForm.length} of ${all.length} words in the boxes`);
    });
  }

  await check("3. negative control: the long values written straight into Form 9A (no fitting) are caught as cut off", async () => {
    const ctx = contexts(FORM_9A)[0];
    const raw: Record<string, string> = {
      "Plaintiff's email address": "accounts.receivable.department@example-renovations-eastern-ontario.com",
      "Defendant also known as": "Maxi Featherstonehaugh, M. J. A. Wolfeschlegel",
      "Reasons for disputing the claim and details": ctx.reasons,
    };
    const cut = cutOff(await drawnText(await fillOfficialPdf(officialPdfBytes(FORM_9A.pdf.file), raw))).map((item) => item.name);
    assert.deepEqual([...new Set(cut)].sort(), Object.keys(raw).sort());
  });

  await check("4. the box sizes the site fits text to are the official PDFs' own", async () => {
    const wrong: string[] = [];
    for (const map of FORM_MAPS) {
      const saved = BOX_GEOMETRY[map.pdf.file];
      if (!saved) { wrong.push(`${map.pdf.file}: no sizes saved`); continue; }
      const fromPdf: Record<string, string[]> = {};
      for (const box of await pdfBoxes(officialPdfBytes(map.pdf.file))) {
        if (box.type !== "Tx") continue;
        const have = [box.width, box.height, box.fontSize, box.multiLine ? 1 : 0].map((n) => Math.round(n * 100) / 100).join();
        if (!(fromPdf[box.name] ??= []).includes(have)) fromPdf[box.name].push(have);
      }
      for (const name of new Set([...Object.keys(fromPdf), ...Object.keys(saved)])) {
        const want = (saved[name] ?? []).map((size) => size.join()).sort().join(" | ");
        const have = (fromPdf[name] ?? []).sort().join(" | ");
        if (want !== have) wrong.push(`${map.id} [${name}]: saved ${want}, PDF ${have}`);
      }
    }
    assert.deepEqual(wrong.slice(0, 8), [], `${wrong.length} box size(s) differ: run npm run forms:geometry`);
  });

  if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}

void main();
