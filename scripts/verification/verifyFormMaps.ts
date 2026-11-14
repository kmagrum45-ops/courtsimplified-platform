/**
 * EVERY BOX OF EVERY FORM THE SITE FILLS IS MAPPED, AND FILLS FROM THE CASE RECORD (site owner, 14 Nov 2026, rules 2, 4,
 * 5, 8; Chrome forms test on #550: no filled PDF existed, the parties were "not entered", a second defendant was merged).
 *
 * What it asserts, with no browser, model, database or network (the official PDFs are read from docs/sources/forms/):
 *   1. each official PDF is the file the map names (its sha256), and every box in it has a map entry; every entry names a
 *      box the PDF has (no box unmapped, none stale);
 *   2. filled from a full test record (two plaintiffs, four defendants, representatives, Chrome's story and amounts),
 *      Form 7A and both copies of Form 1A are written into the official PDFs, and EVERY box read back from the saved
 *      PDFs holds what the record says (the expected values are written out here by hand, box by box, not taken from
 *      the map);
 *   3. each party after the first on its side is its own entry on Form 1A, never part of another party's name, and the
 *      "listed on attached Form 1A" boxes are ticked;
 *   4. the amount box holds the record's total ($5,468.45) and the reasons keep the person's $5,000, $450 and $18.45;
 *   5. with nothing recorded, every box that is not optional or blank on purpose says what is missing and where to add
 *      it, and no box anywhere says "not entered";
 *   6. the reasons hold the person's own words only: no site question, no sentence that only gives party details;
 *   7. the built site loads pdf.js unbundled (next.config.ts serverExternalPackages), so the filled form works there too.
 *
 * WHAT FAILURE THIS CATCHES: a box added to an official form and not mapped, a box filled from anything but the record,
 * a merged party, or a box that hides what is missing.
 *
 * Run: npm run test:form-maps
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { FORM_MAPS } from "../../src/lib/case-system/forms/maps";
import { FORM_7A } from "../../src/lib/case-system/forms/maps/form7A";
import { FORM_1A, additionalParties, form1ACopies } from "../../src/lib/case-system/forms/maps/form1A";
import { fillForm, pdfValues, type FormContext } from "../../src/lib/case-system/forms/formMap";
import { formContextOf } from "../../src/lib/case-system/forms/formContext";
import { fillOfficialPdf, officialPdfBytes, pdfBoxes } from "../../src/lib/case-system/forms/officialPdf";
import type { PartiesRecord } from "../../src/lib/case-system/parties/parties";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

const ID = "00000000-0000-4000-8000-000000000612";
const STORY =
  "On October 4, 2026 I slipped on a wet floor at the Circle K on Sample Road in Ottawa and fell. I want to claim $5,000 for pain and suffering, $450 in lost wages and $18.45 for medicine.\n\n" +
  "What injuries did the fall cause? A bruised hip and a sore back.\n\n" +
  "My name is Test Plaintiff, 12 Example Street, Ottawa ON K1A 0A1, phone 613-555-0100, email test.plaintiff@example.com. " +
  "I am suing Circle K Convenience Stores Ltd., 100 Sample Road, Ottawa ON K1B 0B1, and also the store manager, Test Manager, at the same address.";

const at = (street: string, city = "Ottawa", postalCode = "K1B 0B1") => ({ street, city, province: "ON", postalCode });
const PARTIES: PartiesRecord = {
  version: 1,
  declined: [],
  list: [
    { id: "you", you: true, side: "yours", kind: "person", details: { firstName: "Test", secondName: "Quinn", lastName: "Plaintiff", ...at("12 Example Street", "Ottawa", "K1A 0A1"), phone: "613-555-0100", email: "test.plaintiff@example.com", repName: "Rita Agent", repLso: "P12345", repStreet: "1 Rep Road", repCity: "Ottawa", repProvince: "ON", repPostalCode: "K1C 0C1", repPhone: "613-555-0111", repEmail: "rita@example.com" }, unsure: [] },
    { id: "p2", side: "yours", kind: "company", details: { companyName: "Second Plaintiff Inc.", ...at("2 Plaintiff Way", "Kanata", "K2K 2K2") }, unsure: [] },
    { id: "d1", side: "other", kind: "company", details: { companyName: "Circle K Convenience Stores Ltd.", ...at("100 Sample Road"), phone: "613-555-0199", email: "store@example.com", repName: "Dana Counsel", repLso: "L54321", repStreet: "9 Counsel Court", repCity: "Toronto", repProvince: "ON", repPostalCode: "M5V 1A1", repPhone: "416-555-0123", repEmail: "dana@example.com" }, unsure: [] },
    { id: "d2", side: "other", kind: "person", details: { firstName: "Test", lastName: "Manager", ...at("100 Sample Road"), phone: "613-555-0177" }, unsure: [] },
    { id: "d3", side: "other", kind: "person", details: { firstName: "Third", lastName: "Defendant", ...at("3 Third Lane", "Nepean", "K2G 3C3") }, unsure: [] },
    { id: "d4", side: "other", kind: "company", details: { companyName: "Fourth Co Ltd.", ...at("4 Fourth Ave", "Orleans", "K1E 4D4") }, unsure: [] },
  ],
};
const checkpoint = (sections: Record<string, unknown>): Checkpoint => ({ version: 1, flowId: ID, courtPath: "small-claims", revision: ID, sections: sections as never });
const FULL = checkpoint({
  situation: { record: { where: "starting", filed: "nothing", court: "small-claims" } },
  story: { text: STORY },
  // The home page asked this (Chrome forms test, round 1); the case records it as asked, as the real save does.
  home: { understoodAnswers: [{ question: "What injuries did the fall cause?", answer: "A bruised hip and a sore back." }] },
  "small-claims": { input: { amountClaimed: "5468.45" } },
  caseFile: { parties: PARTIES },
});

/** Form 7A, every box, as the full record should fill it (written out by hand). "" is an empty box; true/false a tick. */
const EXPECTED_7A: Record<string, string | boolean> = {
  "Claim Number page 1": "", "Claim Number page 2": "", "Claim Number page 3": "",
  "Small Claims Court": "", "Small Claims Court Address": "", "Small Claims Court Phone number": "",
  "Additional plaintiff(s) listed on attached Form 1A": true, "Plaintiff under 18 years of age": false,
  "Plaintiff's last name or the company's name": "Plaintiff", "First name of the Plaintiff": "Test", "Second name of the Plaintiff": "Quinn", "Any other names the plaintiff is known by": "",
  "Plaintiff's address (street number, apartment, unit number)": "12 Example Street", "Plaintiff's City/Town": "Ottawa", "Plaintiff's province": "ON", "Plaintiff's phone number": "613-555-0100", "Plaintiff's postal code": "K1A 0A1", "Plaintiff's email address": "test.plaintiff@example.com",
  "Plaintiff's representative's name": "Rita Agent", "Plaintiff's representative's Law Society of Ontario number": "P12345", "Plaintiff's representative's Address (street number, apartment, unit)": "1 Rep Road", "Plaintiff's representative's City/Town": "Ottawa", "Plaintiff's representative's province": "ON", "Plaintiff's representative's phone number": "613-555-0111", "Paintiff's representative's postal code": "K1C 0C1", "Plaintiff's representative's email address": "rita@example.com",
  "Additional defendant(s) listed on attached Form 1A": true, "Defendant under 18 years of age": false,
  "Defendant's last name or company's name": "Circle K Convenience Stores Ltd.", "Defendant's first name": "", "Defendant's second name": "",
  "Defendant's address (street number, apartment, unit number)": "100 Sample Road", "Defendant's City/Town": "Ottawa", "Defendant's province": "ON", "Defendant's phone number": "613-555-0199", "Defendant's postal code": "K1B 0B1", "Defendant's email address": "store@example.com",
  "Defendant's representative's name": "Dana Counsel", "Defendant's representative's Law Society of Ontario number": "L54321", "Defendant's representative's address (street number, apartment, unit number)": "9 Counsel Court", "Defendant's representative's City/Town": "Toronto", "Defendant's representative's province": "ON", "Defendant's representative's phone number": "416-555-0123", "Defendant's representative's postal code": "M5V 1A1", "Defendant's representative's email address": "dana@example.com",
  "Reasons for claim and details": "On October 4, 2026 I slipped on a wet floor at the Circle K on Sample Road in Ottawa and fell. I want to claim $5,000 for pain and suffering, $450 in lost wages and $18.45 for medicine. A bruised hip and a sore back.",
  "Reasons for claim and details_continued": "", "Additional pages attached because more room was needed": false,
  "Principal amount claimed": "5,468.45",
  "Start date for accruing prejudgement interest": "", "the Courts of Justice Act": false, "an agreement at the rate of": false, "Percentage": "",
  "Day and month prepared": "", "Year prepared (yy)": "", "Signature of plaintiff or representative": "", "Day and month issued": "", "Year issued (yy)": "", "Signature of clerk": "",
};

/** One Form 1A entry: its tick, its number on its side, and the party's boxes. */
function entry1A(n: number, side: "plaintiff" | "defendant" | null, number: string, p: Partial<Record<"last" | "first" | "street" | "city" | "postal" | "phone", string>>): Record<string, string | boolean> {
  return {
    [`Plaintiff ${n}`]: side === "plaintiff", [`Defendant ${n}`]: side === "defendant",
    [`Plaintiff number ${n}`]: side === "plaintiff" ? number : "", [`Defendant number ${n}`]: side === "defendant" ? number : "",
    [`Last name or name of company ${n}`]: p.last ?? "", [`First name ${n}`]: p.first ?? "", [`Second name ${n}`]: "", [`Also known as ${n}`]: "",
    [`Address (street number, apartment, unit) ${n}`]: p.street ?? "", [`City/Town ${n}`]: p.city ?? "", [`Province ${n}`]: side ? "ON" : "", [`Phone number ${n}`]: p.phone ?? "", [`Postal code ${n}`]: p.postal ?? "", [`Email address ${n}`]: "",
  };
}
const EXPECTED_1A: Record<string, string | boolean>[] = [
  { "Claim Number": "", ...entry1A(1, "plaintiff", "2", { last: "Second Plaintiff Inc.", street: "2 Plaintiff Way", city: "Kanata", postal: "K2K 2K2" }), ...entry1A(2, "defendant", "2", { last: "Manager", first: "Test", street: "100 Sample Road", city: "Ottawa", postal: "K1B 0B1", phone: "613-555-0177" }), ...entry1A(3, "defendant", "3", { last: "Defendant", first: "Third", street: "3 Third Lane", city: "Nepean", postal: "K2G 3C3" }) },
  { "Claim Number": "", ...entry1A(1, "defendant", "4", { last: "Fourth Co Ltd.", street: "4 Fourth Ave", city: "Orleans", postal: "K1E 4D4" }), ...entry1A(2, null, "", {}), ...entry1A(3, null, "", {}) },
];

let failed = 0;
const check = async (name: string, run: () => void | Promise<void>) => { try { await run(); console.log(`PASS  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n").slice(0, 4).join("\n      ")}`); } };

/** What a saved PDF's box reads back as: a tick as true/false, text as its words (representative boxes not listed here are empty). */
async function readBack(bytes: Uint8Array): Promise<Map<string, string | boolean>> {
  const out = new Map<string, string | boolean>();
  for (const box of await pdfBoxes(bytes)) {
    const value = box.checkBox ? box.value !== undefined && box.value !== null && box.value !== "Off" && box.value !== "" : typeof box.value === "string" ? box.value : "";
    if (!out.has(box.name) || value) out.set(box.name, value);
  }
  return out;
}

function compare(label: string, read: Map<string, string | boolean>, expected: Record<string, string | boolean>) {
  const wrong: string[] = [];
  for (const [box, value] of read) {
    const want = box in expected ? expected[box] : typeof value === "boolean" ? false : "";
    if (value !== want) wrong.push(`${box}: ${JSON.stringify(value)} (expected ${JSON.stringify(want)})`);
  }
  for (const box of Object.keys(expected)) if (!read.has(box)) wrong.push(`${box}: not a box of the PDF`);
  assert.equal(wrong.length, 0, `${label}: ${wrong.length} box(es) wrong:\n${wrong.join("\n")}`);
}

async function main() {
  for (const map of FORM_MAPS) {
    await check(`1. ${map.id}: the official PDF is the saved one, and every box in it has a map entry (none stale)`, async () => {
      const bytes = officialPdfBytes(map.pdf.file);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), map.pdf.sha256, "the PDF is not the one the map was written for");
      const names = new Set((await pdfBoxes(bytes)).map((box) => box.name));
      const unmapped = [...names].filter((name) => !(name in map.boxes));
      const stale = Object.keys(map.boxes).filter((name) => !names.has(name));
      assert.deepEqual(unmapped, [], `boxes with no map entry: ${unmapped.join(" | ")}`);
      assert.deepEqual(stale, [], `map entries the PDF does not have: ${stale.join(" | ")}`);
    });
  }

  const ctx = formContextOf(FULL);
  await check("2. Form 7A from the full record: every box read back from the filled official PDF holds what the record says", async () => {
    const filled = await fillOfficialPdf(officialPdfBytes(FORM_7A.pdf.file), pdfValues(fillForm(FORM_7A, ctx)));
    compare("Form 7A", await readBack(filled), EXPECTED_7A);
  });
  await check("2-3. Form 1A: every party after the first on its side is its own entry, three to a copy, every box as the record says", async () => {
    const copies = form1ACopies(additionalParties(ctx.plaintiffs, ctx.defendants));
    assert.equal(copies.length, 2, `copies: ${copies.length}`);
    for (const [index, copy] of copies.entries()) {
      const copyCtx: FormContext = { ...ctx, additional: copy };
      const filled = await fillOfficialPdf(officialPdfBytes(FORM_1A.pdf.file), pdfValues(fillForm(FORM_1A, copyCtx)));
      compare(`Form 1A copy ${index + 1}`, await readBack(filled), EXPECTED_1A[index]);
    }
  });
  await check("3. no party is part of another party's name on any form", () => {
    const names = ctx.defendants.map((party) => party.details.companyName ?? party.details.lastName ?? "");
    for (const value of Object.values(pdfValues(fillForm(FORM_7A, ctx)))) if (typeof value === "string") for (const name of names.slice(1)) assert.ok(!value.includes(`(${name})`) && !(value.includes(names[0]) && value.includes(name)), `merged: ${value}`);
  });
  await check("4. the amounts: the box holds $5,468.45; the reasons keep $5,000, $450 and $18.45 as the person wrote them", () => {
    const values = pdfValues(fillForm(FORM_7A, ctx));
    assert.equal(values["Principal amount claimed"], "5,468.45");
    for (const amount of ["$5,000", "$450", "$18.45"]) assert.ok(String(values["Reasons for claim and details"]).includes(amount), `${amount} missing from the reasons`);
  });
  await check("5. with nothing recorded, each box says what is missing and where to add it; none says \"not entered\"", () => {
    const empty = formContextOf(checkpoint({ situation: { record: { where: "starting", filed: "nothing", court: "small-claims" } } }));
    const results = fillForm(FORM_7A, empty);
    const missing = results.filter((result) => result.state === "missing");
    assert.ok(missing.length >= 10, `only ${missing.length} box(es) say what is missing`);
    for (const result of missing) assert.ok(result.state === "missing" && result.what.trim() && result.addAt, `${result.box} does not say what is missing or where to add it`);
    for (const result of [...results, ...fillForm(FORM_7A, ctx)]) assert.ok(!/not entered/i.test(JSON.stringify(result)), `${result.box} says "not entered"`);
    assert.ok(missing.some((result) => result.box === "Plaintiff's last name or the company's name" && result.state === "missing" && result.addAt === "parties"));
    assert.ok(missing.some((result) => result.box === "Principal amount claimed" && result.state === "missing" && result.addAt === "amount"));
  });
  await check("6. the reasons are the person's own words: no site question, no party-detail sentence", () => {
    assert.ok(!/What injuries did the fall cause\?/.test(ctx.reasons), `a site question is in the reasons: ${ctx.reasons}`);
    assert.ok(!/My name is|I am suing|613-555-0100/.test(ctx.reasons), `a party-detail sentence is in the reasons: ${ctx.reasons}`);
  });

  await check("7. the built site loads pdf.js from node_modules, not bundled (bundled, its worker is not found and every filled form fails)", () => {
    // Local build, 14 Nov 2026: POST /api/cases/forms/filled answered 500 in the browser test; the terminal checks above
    // passed, because they run pdf.js unbundled. Any server file that imports pdf.js needs it external.
    const config = readFileSync("next.config.ts", "utf8");
    const external = /serverExternalPackages:\s*\[([^\]]*)\]/.exec(config)?.[1] ?? "";
    assert.ok(/["']pdfjs-dist["']/.test(external), `next.config.ts serverExternalPackages does not list "pdfjs-dist": [${external}]`);
  });

  if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}

void main();
