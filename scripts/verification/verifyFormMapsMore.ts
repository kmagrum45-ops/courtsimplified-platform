/**
 * THE FORMS AFTER 7A: SMALL CLAIMS 9A (DEFENCE), 10A (DEFENDANT'S CLAIM) AND 8A (AFFIDAVIT OF SERVICE), FAMILY 8 (APPLICATION), 10 (ANSWER), 13
 * AND 13.1 (FINANCIAL STATEMENTS), each filled from the case record and read back box by box (Lane B, 15 Nov 2026; the
 * same method and strength as Form 7A in verifyFormMaps.ts). Runs as the second half of test:form-maps.
 *
 * What it asserts, with no browser, model, database or network (the official PDFs are read from docs/sources/forms/):
 *   1. BUILD CHECK: every official PDF saved under docs/sources/forms/ has a map in FORM_MAPS (a form saved and not
 *      mapped fails here; verifyFormMaps.ts check 1 then fails on any box of a mapped form with no entry). Self-test: a
 *      map with one box taken out is reported as unmapped;
 *   2. each form, filled from a test record (a defence with two parties a side; a Family application and the answer to
 *      it, the person married and with children), written into the official PDF and EVERY box read back: a box listed
 *      in the hand-written table holds exactly that, every box not listed is empty (text "" or an unticked box). The
 *      tables are written out here by hand, not taken from the maps;
 *   3. NEGATIVE CONTROLS: one wrong value written into the filled 9A (a postal code) is caught by the read-back; a 9A
 *      map with the plaintiff and defendant name boxes swapped is caught; a Family 8 table missing one filled box is
 *      caught;
 *   4. every filled text value comes from the record: each piece of it is in the test record's own words (no site
 *      wording, no model); a box that needs wording or a fact the record lacks is blank, with a reason;
 *   5. with nothing recorded, every box to fill says what is missing and where to add it; none says "not entered";
 *   6. the defence's reasons are the person's own words: no site question, no party-detail sentence;
 *   10. Form 10A (26 Nov 2026): the person's own details only when the record says they are the defendant, and no value
 *      of the other side's in any box (the record does not say who the claim is against). Negative control: a 10A map
 *      that fills a "Defendant" box from the other side is caught by the table.
 *
 * WHAT FAILURE THIS CATCHES: a saved official form with no map, a box filled from anything but the record, a party on the
 * wrong side of a form, or a map whose box names drifted from the PDF.
 *
 * Run: npm run test:form-maps (this file runs after verifyFormMaps.ts)
 */
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { FORM_MAPS } from "../../src/lib/case-system/forms/maps";
import { FORM_9A } from "../../src/lib/case-system/forms/maps/form9A";
import { FORM_10A } from "../../src/lib/case-system/forms/maps/form10A";
import { FORM_8A } from "../../src/lib/case-system/forms/maps/form8A";
import { FORM_1A, additionalParties, form1ACopies } from "../../src/lib/case-system/forms/maps/form1A";
import { FAMILY_FORM_8 } from "../../src/lib/case-system/forms/maps/familyForm8";
import { FAMILY_FORM_10 } from "../../src/lib/case-system/forms/maps/familyForm10";
import { FAMILY_FORM_13 } from "../../src/lib/case-system/forms/maps/familyForm13";
import { FAMILY_FORM_13_1 } from "../../src/lib/case-system/forms/maps/familyForm13_1";
import { fillForm, pdfValues, type BoxValue, type FormMapDefinition, type FormContext } from "../../src/lib/case-system/forms/formMap";
import { formContextOf } from "../../src/lib/case-system/forms/formContext";
import { fillOfficialPdf, officialPdfBytes, pdfBoxes } from "../../src/lib/case-system/forms/officialPdf";
import type { PartiesRecord } from "../../src/lib/case-system/parties/parties";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { siteQuestions } from "../../src/lib/case-system/siteQuestions";
import { sourcedAnswerListText } from "../../app/builder/_components/sourcedAnswers";

const ID = "00000000-0000-4000-8000-000000000613";
const checkpoint = (court: "small-claims" | "family", sections: Record<string, unknown>): Checkpoint => ({ version: 1, flowId: ID, courtPath: court, revision: ID, sections: sections as never });
const at = (street: string, city: string, postalCode: string) => ({ street, city, province: "ON", postalCode });

// ---- The defence: the person is sued, with a second defendant; two plaintiffs, the first with a representative ----
const DEFENCE_STORY =
  "I hired Example Renovations Inc. in June 2026 to redo my kitchen. They left in August 2026 with the cabinets unfinished and the sink not connected. I paid $2,000 up front and I do not agree that I owe the $3,200 they claim.\n\n" +
  "What did you pay them with? An e-transfer on June 3, 2026.\n\n" +
  "My name is Test Avery Defendant, 7 Sample Crescent, Kingston ON K7L 1A1, phone 613-555-0142.";
const DEFENCE_PARTIES: PartiesRecord = {
  version: 1,
  declined: [],
  list: [
    { id: "you", you: true, side: "yours", kind: "person", details: { firstName: "Test", secondName: "Avery", lastName: "Defendant", alsoKnownAs: "T. A. Defendant", ...at("7 Sample Crescent", "Kingston", "K7L 1A1"), phone: "613-555-0142", email: "test.defendant@example.com" }, unsure: [] },
    { id: "d2", side: "yours", kind: "company", details: { companyName: "Second Defendant Ltd.", ...at("8 Sample Crescent", "Kingston", "K7L 1A2") }, unsure: [] },
    { id: "p1", side: "other", kind: "company", details: { companyName: "Example Renovations Inc.", ...at("50 Example Road", "Ottawa", "K2P 0A5"), phone: "613-555-0190", email: "office@example.com", repName: "Rowan Paralegal", repLso: "P99887", repStreet: "3 Rep Street", repCity: "Ottawa", repProvince: "ON", repPostalCode: "K2P 1B1", repPhone: "613-555-0191", repEmail: "rowan@example.com" }, unsure: [] },
    { id: "p2", side: "other", kind: "person", details: { firstName: "Pat", lastName: "Owner", ...at("50 Example Road", "Ottawa", "K2P 0A5") }, unsure: [] },
  ],
};
const DEFENCE = checkpoint("small-claims", {
  situation: { record: { where: "served", court: "small-claims" } },
  story: { text: DEFENCE_STORY },
  home: { understoodAnswers: [{ question: "What did you pay them with?", answer: "An e-transfer on June 3, 2026." }] },
  "small-claims": { input: { amountClaimed: "3200" } },
  caseFile: { parties: DEFENCE_PARTIES },
});

// ---- Family: the same two people; the person starts the case (Form 8) or answers it (Forms 10, 13, 13.1) ----
const FAMILY_PARTIES: PartiesRecord = {
  version: 1,
  declined: [],
  list: [
    { id: "you", you: true, side: "yours", kind: "person", details: { firstName: "Test", lastName: "Person", ...at("21 Example Avenue", "Sudbury", "P3A 1A1"), phone: "705-555-0101", email: "test.person@example.com" }, unsure: [] },
    { id: "o1", side: "other", kind: "person", details: { firstName: "Test", secondName: "Rae", lastName: "Other", ...at("44 Example Drive", "Sudbury", "P3B 2B2"), phone: "705-555-0144", repName: "Lee Counsel", repStreet: "9 Law Lane", repCity: "Sudbury", repProvince: "ON", repPostalCode: "P3C 3C3", repPhone: "705-555-0199", repEmail: "lee@example.com" }, unsure: [] },
  ],
};
const family = (where: "starting" | "served") => checkpoint("family", {
  situation: { record: { where, court: "family", ...(where === "starting" ? { filed: "nothing" } : {}) } },
  story: { text: "We separated on March 1, 2026. Our two children live with me." },
  builder: { triageState: { record: { marriedToOtherParty: "yes", caseInvolvesChildren: "yes" } } },
  caseFile: { parties: FAMILY_PARTIES },
});
const FAMILY_APPLICANT = family("starting");
const FAMILY_RESPONDENT = family("served");

// ---- The hand-written tables: every box that should hold something. Every other box must read back empty. ----
const EXPECTED_9A: Record<string, BoxValue> = {
  "Additional plaintiff(s) listed on attached Form 1A": true,
  "Last name or name of company for plaintiff": "Example Renovations Inc.",
  "Plaintiff's Address (street number, apartment, unit)": "50 Example Road", "Plaintiff's city/town": "Ottawa", "Plaintiff's province": "ON", "Plaintiff's Phone number": "613-555-0190", "Plaintiff's postal code": "K2P 0A5", "Plaintiff's email address": "office@example.com",
  "Plaintiff's representative's name": "Rowan Paralegal", "Plaintiff's representative's Law Society of Ontario number": "P99887", "Plaintiff's Representative's address (street number, apartment. unit)": "3 Rep Street", "Plaintiff's representative's city/town": "Ottawa", "Plaintiff's representative's province": "ON", "Plaintiff's representative's phone number": "613-555-0191", "Plaintiff's representative's postal code": "K2P 1B1", "Plaintiff's representative's email address": "rowan@example.com",
  "Additional defendant(s) listed on attached Form 1A": true,
  "Last name or name of company for defendant": "Defendant", "First name of defendant": "Test", "Second name of defendant": "Avery", "Defendant also known as": "T. A. Defendant",
  "Defendant's address (street number, apartment, unit)": "7 Sample Crescent", "Defendant's city/town": "Kingston", "Defendant's province": "ON", "Defendant's phone number": "613-555-0142", "Defendant's postal code": "K7L 1A1", "Defendant's email address": "test.defendant@example.com",
  "Name(s) of defendant(s)": "Test Avery Defendant; Second Defendant Ltd.",
  "Reasons for disputing the claim and details": "I hired Example Renovations Inc. in June 2026 to redo my kitchen. They left in August 2026 with the cabinets unfinished and the sink not connected. I paid $2,000 up front and I do not agree that I owe the $3,200 they claim.",
};
/**
 * Form 10A for the same defence (26 Nov 2026): only the person's own details, in the "Plaintiff by Defendant's Claim"
 * boxes. The record names the other side, but not who a defendant's claim is against, so every "Defendant" box stays
 * empty; and it holds no reasons or amount for the person's own claim (the story and amount are the plaintiff's claim).
 */
const EXPECTED_10A: Record<string, BoxValue> = {
  "Last name, or name of company - Plaintiff": "Defendant", "First name - Plaintiff": "Test", "Second name - Plaintiff": "Avery", "Also known as - Plaintiff": "T. A. Defendant",
  "Address (street number, apt., unit) - Plaintiff": "7 Sample Crescent", "City/Town - Plaintiff": "Kingston", "Province - Paintiff": "ON", "Phone number - Plaintiff": "613-555-0142", "Postal code  - Plaintiff": "K7L 1A1", "Email address  - Plaintiff": "test.defendant@example.com",
};
/** Form 1A for the defence (one copy): entry 1 the plaintiffs' second party, entry 2 the person's co-defendant; entry 3 empty. */
const EXPECTED_1A_DEFENCE: Record<string, BoxValue> = {
  "Plaintiff 1": true, "Plaintiff number 1": "2",
  "Last name or name of company 1": "Owner", "First name 1": "Pat", "Address (street number, apartment, unit) 1": "50 Example Road", "City/Town 1": "Ottawa", "Province 1": "ON", "Postal code 1": "K2P 0A5",
  "Defendant 2": true, "Defendant number 2": "2",
  "Last name or name of company 2": "Second Defendant Ltd.", "Address (street number, apartment, unit) 2": "8 Sample Crescent", "City/Town 2": "Kingston", "Province 2": "ON", "Postal code 2": "K7L 1A2",
};
const EXPECTED_8A: Record<string, BoxValue> = {
  "Plaintiff(s)": "Example Renovations Inc.; Pat Owner",
  "Defendant(s)": "Test Avery Defendant; Second Defendant Ltd.",
};
const EXPECTED_F8: Record<string, BoxValue> = {
  "Applicant(s) - Full legal name": "Test Person", "Applicant(s) - Address": "21 Example Avenue, Sudbury ON, P3A 1A1", "Applicant(s) - Phone & fax": "705-555-0101", "Applicant(s) - Email": "test.person@example.com",
  "Respondent(s) - Full legal name": "Test Rae Other", "Respondent(s) - Address": "44 Example Drive, Sudbury ON, P3B 2B2", "Respondent(s) - Phone & fax": "705-555-0144",
  "Respondent(s) Lawyer - Full legal name": "Lee Counsel", "Respondent(s) Lawyer - Address": "9 Law Lane, Sudbury ON, P3C 3C3", "Respondent(s) Lawyer - Phone & fax": "705-555-0199", "Respondent(s) Lawyer - Email": "lee@example.com",
  "Municipality & province - applicant": "Sudbury, ON", "Municipality & province - respondent": "Sudbury, ON",
  "Married on": true,
};
const EXPECTED_F10: Record<string, BoxValue> = {
  // The applicant's address box on the official Form 10 is one line at a fixed 12pt, 200pt wide: this ordinary address
  // does not fit (pdf.js printed "44 Example Drive, Sudbury ON," and lost the postal code below the box, 15 Nov 2026).
  // It is left blank and the screen gives the whole address to write by hand (check 9).
  "Full legal name - Applicant(s)": "Test Rae Other", "Phone & fax - Applicant(s)": "705-555-0144",
  "Name - Applicant(s) Lawyer": "Lee Counsel", "Address - Applicant(s) Lawyer": "9 Law Lane, Sudbury ON, P3C 3C3", "Phone & fax - Applicant(s) Lawyer": "705-555-0199", "Email - Applicant(s) Lawyer": "lee@example.com",
  "Full legal name - Respondent(s)": "Test Person", "Address - Respondent(s)": "21 Example Avenue, Sudbury ON, P3A 1A1", "Phone & fax - Respondent(s)": "705-555-0101", "Email - Respondent(s)": "test.person@example.com",
  "Full legal name": "Test Person",
  // The official PDF itself starts this box with "1. " (its own numbering); the site leaves it as published.
  "Facts that form the legal basis for my position in paragraph 2": "1. ",
};
const EXPECTED_F13: Record<string, BoxValue> = {
  "Full legal name - Applicant(s)": "Test Rae Other", "Address - Applicant(s)": "44 Example Drive, Sudbury ON, P3B 2B2", "Phone & fax - Applicant(s)": "705-555-0144",
  "Full legal name - Applicant(s) Lawyer": "Lee Counsel", "Address - Applicant(s) Lawyer": "9 Law Lane, Sudbury ON, P3C 3C3", "Phone & fax - Applicant(s) Lawyer": "705-555-0199", "Email - Applicant(s) Lawyer": "lee@example.com",
  "Full legal name - Respondent(s)": "Test Person", "Address - Respondent(s)": "21 Example Avenue, Sudbury ON, P3A 1A1", "Phone & fax - Respondent(s)": "705-555-0101", "Email - Respondent(s)": "test.person@example.com",
  "Full legal name": "Test Person", "Municipality & province": "Sudbury, ON",
};
const EXPECTED_F13_1: Record<string, BoxValue> = {
  "Applicant(s) — Full legal name": "Test Rae Other", "Applicant(s) — Address": "44 Example Drive, Sudbury ON, P3B 2B2", "Applicant(s) — Phone & fax": "705-555-0144",
  "Applicant(s) — Lawyer Full legal name": "Lee Counsel", "Applicant(s) — Lawyer Address": "9 Law Lane, Sudbury ON, P3C 3C3", "Applicant(s) — Lawyer Phone & fax": "705-555-0199", "Applicant(s) — Lawyer Email": "lee@example.com",
  "Respondent(s) — Full legal name": "Test Person", "Respondent(s) — Address": "21 Example Avenue, Sudbury ON, P3A 1A1", "Respondent(s) — Phone & fax": "705-555-0101", "Respondent(s) — Email": "test.person@example.com",
  "This form is filed by the respondent": true,
  "full legal name": "Test Person", "municipality & province": "Sudbury, ON",
};

const CASES: { map: FormMapDefinition; record: Checkpoint; expected: Record<string, BoxValue>; label: string }[] = [
  { map: FORM_9A, record: DEFENCE, expected: EXPECTED_9A, label: "Small Claims 9A, the person defending (two parties a side)" },
  { map: FORM_10A, record: DEFENCE, expected: EXPECTED_10A, label: "Small Claims 10A, the same defendant making their own claim" },
  { map: FORM_8A, record: DEFENCE, expected: EXPECTED_8A, label: "Small Claims 8A, the same case" },
  { map: FAMILY_FORM_8, record: FAMILY_APPLICANT, expected: EXPECTED_F8, label: "Family 8, the person applying (married, children)" },
  { map: FAMILY_FORM_10, record: FAMILY_RESPONDENT, expected: EXPECTED_F10, label: "Family 10, the person answering" },
  { map: FAMILY_FORM_13, record: FAMILY_RESPONDENT, expected: EXPECTED_F13, label: "Family 13, the person answering" },
  { map: FAMILY_FORM_13_1, record: FAMILY_RESPONDENT, expected: EXPECTED_F13_1, label: "Family 13.1, the person answering" },
];

let failed = 0;
const check = async (name: string, run: () => void | Promise<void>) => { try { await run(); console.log(`PASS  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n").slice(0, 8).join("\n      ")}`); } };

/** What a saved PDF's box reads back as: a tick (check box or radio) as true/false, text as its words. */
async function readBack(bytes: Uint8Array): Promise<Map<string, BoxValue>> {
  const out = new Map<string, BoxValue>();
  for (const box of await pdfBoxes(bytes)) {
    const ticked = box.value !== undefined && box.value !== null && box.value !== "Off" && box.value !== "";
    const value: BoxValue = box.checkBox || box.radio ? ticked : typeof box.value === "string" ? box.value : "";
    if (!out.has(box.name) || value) out.set(box.name, value);
  }
  return out;
}

/** The boxes that differ from the table (a box not in the table must be empty). */
function differences(read: Map<string, BoxValue>, expected: Record<string, BoxValue>): string[] {
  const wrong: string[] = [];
  for (const [box, value] of read) {
    const want = box in expected ? expected[box] : typeof value === "boolean" ? false : "";
    // A box of several lines holds the line breaks the site puts in so pdf.js never breaks a line itself (textFit.ts):
    // where they fall is layout, checked by verifyFormTextFit.ts against pdf.js; here a line break reads as a space.
    const words = (item: string | boolean) => (typeof item === "string" ? item.replace(/[ \t]*\n[ \t]*/g, " ") : item);
    if (words(value) !== words(want)) wrong.push(`${box}: ${JSON.stringify(value)} (expected ${JSON.stringify(want)})`);
  }
  for (const box of Object.keys(expected)) if (!read.has(box)) wrong.push(`${box}: not a box of the PDF`);
  return wrong;
}

async function filledPdf(map: FormMapDefinition, ctx: FormContext): Promise<Uint8Array> {
  return fillOfficialPdf(officialPdfBytes(map.pdf.file), pdfValues(fillForm(map, ctx)));
}

/** Boxes of the PDF with no entry in the map (the build check verifyFormMaps.ts makes for every map). */
async function unmappedBoxes(map: FormMapDefinition): Promise<string[]> {
  const names = new Set((await pdfBoxes(officialPdfBytes(map.pdf.file))).map((box) => box.name));
  return [...names].filter((name) => !(name in map.boxes));
}

/** Every piece of a filled value ("a; b", "Name: x", "street, city ON, postal") is in the record's own words. */
function piecesNotInRecord(value: string, record: string): string[] {
  return value.split(/;\s|:\s|,\s/).map((piece) => piece.trim()).filter(Boolean).filter((piece) => !record.includes(piece) && !piece.split(/\s+/).every((word) => record.includes(word)));
}

async function main() {
  await check("1. build check: every official PDF saved under docs/sources/forms/ has a map", () => {
    const saved = readdirSync("docs/sources/forms").filter((file) => file.toLowerCase().endsWith(".pdf"));
    const mapped = new Set(FORM_MAPS.map((map) => map.pdf.file.replace(/^docs\/sources\/forms\//, "")));
    const without = saved.filter((file) => !mapped.has(file));
    assert.deepEqual(without, [], `official PDFs with no map: ${without.join(", ")}`);
  });
  await check("1. self-test: a map with one box taken out is reported as unmapped", async () => {
    const [first, ...rest] = Object.keys(FORM_9A.boxes);
    assert.ok(first, "Form 9A has no boxes mapped");
    const cut: FormMapDefinition = { ...FORM_9A, boxes: Object.fromEntries(rest.map((box) => [box, FORM_9A.boxes[box]])) };
    assert.deepEqual(await unmappedBoxes(cut), [first]);
  });

  for (const { map, record, expected, label } of CASES) {
    await check(`2. ${label}: every box mapped, and every box read back from the filled official PDF is as the table says`, async () => {
      const unmapped = await unmappedBoxes(map);
      assert.equal(unmapped.length, 0, `${unmapped.length} box(es) with no map entry, e.g. ${unmapped.slice(0, 5).join(" | ")}`);
      const wrong = differences(await readBack(await filledPdf(map, formContextOf(record))), expected);
      assert.equal(wrong.length, 0, `${wrong.length} box(es) wrong:\n${wrong.join("\n")}`);
    });
  }

  await check("3. negative control: one wrong value written into the filled 9A is caught", async () => {
    const values = { ...pdfValues(fillForm(FORM_9A, formContextOf(DEFENCE))), "Defendant's postal code": "K7L 9Z9" };
    const wrong = differences(await readBack(await fillOfficialPdf(officialPdfBytes(FORM_9A.pdf.file), values)), EXPECTED_9A);
    assert.deepEqual(wrong, [`Defendant's postal code: "K7L 9Z9" (expected "K7L 1A1")`]);
  });
  await check("3. negative control: a 9A map with the plaintiff and defendant name boxes swapped is caught", async () => {
    const plaintiff = "Last name or name of company for plaintiff";
    const defendant = "Last name or name of company for defendant";
    const swapped: FormMapDefinition = { ...FORM_9A, boxes: { ...FORM_9A.boxes, [plaintiff]: FORM_9A.boxes[defendant], [defendant]: FORM_9A.boxes[plaintiff] } };
    const wrong = differences(await readBack(await filledPdf(swapped, formContextOf(DEFENCE))), EXPECTED_9A);
    assert.equal(wrong.length, 2, wrong.join("\n"));
  });
  await check("3. negative control: a Family 8 table missing one filled box is caught", async () => {
    const { ["Respondent(s) - Full legal name"]: _dropped, ...short } = EXPECTED_F8;
    const wrong = differences(await readBack(await filledPdf(FAMILY_FORM_8, formContextOf(FAMILY_APPLICANT))), short);
    assert.equal(wrong.length, 1, wrong.join("\n"));
  });

  for (const { map, record, label } of CASES) {
    await check(`4. ${label}: every filled value comes from the record; every blank box says why`, () => {
      const words = JSON.stringify(record);
      for (const [box, value] of Object.entries(pdfValues(fillForm(map, formContextOf(record))))) {
        if (typeof value !== "string") continue;
        const foreign = piecesNotInRecord(value, words);
        assert.deepEqual(foreign, [], `${box}: ${JSON.stringify(value)} has words not in the record: ${foreign.join(" | ")}`);
      }
      for (const [box, entry] of Object.entries(map.boxes)) if (entry.kind === "blank") assert.ok(entry.why.trim(), `${box} is blank with no reason`);
    });
  }

  for (const { map, label } of CASES) {
    await check(`5. ${label}, nothing recorded: each box to fill says what is missing and where to add it; none says "not entered"`, () => {
      const empty = formContextOf(checkpoint(map.court === "family" ? "family" : "small-claims", { situation: { record: { where: "served", court: map.court } } }));
      const results = fillForm(map, empty);
      for (const result of results) {
        assert.ok(!/not entered/i.test(JSON.stringify(result)), `${result.box} says "not entered"`);
        if (result.state === "missing") assert.ok(result.what.trim() && result.addAt, `${result.box} does not say what is missing or where to add it`);
      }
      const fills = Object.values(map.boxes).filter((entry) => entry.kind === "fill" && !entry.optional).length;
      assert.ok(fills === 0 || results.some((result) => result.state === "missing"), "nothing is said to be missing");
    });
  }

  await check("6. the defence's reasons are the person's own words: no site question, no party-detail sentence", () => {
    const reasons = String(pdfValues(fillForm(FORM_9A, formContextOf(DEFENCE)))["Reasons for disputing the claim and details"] ?? "");
    assert.ok(reasons.includes("$3,200") && reasons.includes("$2,000"), `the person's amounts are missing: ${reasons}`);
    assert.ok(!/What did you pay them with\?/.test(reasons), `a site question is in the reasons: ${reasons}`);
    assert.ok(!/My name is|613-555-0142/.test(reasons), `a party-detail sentence is in the reasons: ${reasons}`);
  });

  // 7. The defence's reasons only when the record says the person is the defendant (site owner, 15 Nov 2026), and never
  // with site text in them: every fixed question the site asks (siteQuestions.ts) and its follow-up block are checked.
  const REASONS = ["Reasons for disputing the claim and details", "Reasons for disputing the claim and details, continued"];
  const withSide = (where: "starting" | null) => ({ ...DEFENCE, sections: { ...DEFENCE.sections, situation: { record: where ? { where, court: "small-claims", filed: "nothing" } : { court: "small-claims" } } } } as Checkpoint);
  for (const [label, record] of [["the person is bringing the case", withSide("starting")], ["the record does not say which side the person is on", withSide(null)]] as const) {
    await check(`7. 9A when ${label}: the reasons boxes stay empty (the story is not a defence unless the person is the defendant)`, () => {
      const values = pdfValues(fillForm(FORM_9A, formContextOf(record)));
      for (const box of REASONS) assert.ok(!(box in values), `${box} holds ${String(values[box]).slice(0, 80)}`);
    });
  }
  await check("7. 9A as the defendant, with every site question and the follow-up block in the saved story: none of the site's text reaches the reasons", () => {
    const questions = siteQuestions();
    assert.ok(questions.length > 20, `only ${questions.length} site questions found`);
    const story = [DEFENCE_STORY, ...questions.map((question, index) => `${question} My answer ${index + 1}.`), sourcedAnswerListText([{ question: questions[0], answer: "I kept every receipt for the deposit." }, { question: questions[1], answer: "We signed a written contract in June." }, { question: questions[2], answer: "$450 only" }])].join("\n\n");
    const record = { ...DEFENCE, sections: { ...DEFENCE.sections, story: { text: story } } } as Checkpoint;
    const values = pdfValues(fillForm(FORM_9A, formContextOf(record)));
    const text = REASONS.map((box) => String(values[box] ?? "")).join(" ");
    assert.ok(text.includes("I hired Example Renovations Inc."), `the person's story is missing: ${text.slice(0, 120)}`);
    // Changed 19 Nov 2026, second time (site owner, rule 0: the story field only; "not sure" and answers are never story
    // sentences): no answer reaches the reasons, a full sentence or a fragment, from the glued lines or the follow-up block.
    for (const answer of ["My answer 1.", "I kept every receipt for the deposit.", "We signed a written contract in June.", "$450 only"]) assert.ok(!text.includes(answer), `an answer reached the reasons: ${answer}`);
    const found = questions.filter((question) => text.includes(question));
    assert.deepEqual(found.slice(0, 5).map((question) => `${question} <<< ${text.slice(Math.max(0, text.indexOf(question) - 60), text.indexOf(question) + question.length + 30)}`), [], `${found.length} site question(s) in the reasons`);
    assert.ok(!/Answers to follow-up questions|(^|\s)Q:\s/.test(text), "the site's follow-up block is in the reasons");
  });

  // 8. Form 1A with a Defence: the other side's second plaintiff and the person's own second defendant, each its own
  // entry with its number on its side (the same way as with Form 7A), read back from the filled official PDF.
  const defenceCtx = formContextOf(DEFENCE);
  const defenceCopies = form1ACopies(additionalParties(defenceCtx.plaintiffs, defenceCtx.defendants));
  await check("8. Form 1A with 9A: one copy; every box read back as the table says (Plaintiff No. 2, then Defendant No. 2)", async () => {
    assert.equal(defenceCopies.length, 1, `copies: ${defenceCopies.length}`);
    const wrong = differences(await readBack(await filledPdf(FORM_1A, { ...defenceCtx, additional: defenceCopies[0] })), EXPECTED_1A_DEFENCE);
    assert.equal(wrong.length, 0, `${wrong.length} box(es) wrong:\n${wrong.join("\n")}`);
  });
  await check("8. Form 1A with 9A: 9A's two \"listed on attached Form 1A\" ticks match what Form 1A holds", () => {
    const values = pdfValues(fillForm(FORM_9A, defenceCtx));
    const sides = defenceCopies.flat().map((item) => item.side);
    assert.equal(values["Additional plaintiff(s) listed on attached Form 1A"], sides.includes("plaintiff"));
    assert.equal(values["Additional defendant(s) listed on attached Form 1A"], sides.includes("defendant"));
  });
  await check("8. negative control: Form 1A built with the sides swapped (the person taken as the plaintiff) is caught", async () => {
    const swapped = form1ACopies(additionalParties(defenceCtx.defendants, defenceCtx.plaintiffs));
    const wrong = differences(await readBack(await filledPdf(FORM_1A, { ...defenceCtx, additional: swapped[0] })), EXPECTED_1A_DEFENCE);
    assert.ok(wrong.length >= 8, `only ${wrong.length} difference(s): ${wrong.join(" | ")}`);
  });

  // 10. Form 10A: the person's details only when the record says they are the defendant; never the other side's, in
  // either of the form's parties, since the record does not say who the claim is against (site owner, 26 Nov 2026).
  for (const [label, record] of [["the person is bringing the case", withSide("starting")], ["the record does not say which side the person is on", withSide(null)]] as const) {
    await check(`10. 10A when ${label}: nothing is filled (the person is the plaintiff by defendant's claim only as the defendant)`, () => {
      assert.deepEqual(Object.keys(pdfValues(fillForm(FORM_10A, formContextOf(record)))), []);
    });
  }
  await check("10. 10A: no value of the other side's reaches any box (the record does not say who the claim is against)", () => {
    const values = Object.values(pdfValues(fillForm(FORM_10A, formContextOf(DEFENCE)))).map(String);
    for (const theirs of ["Example Renovations", "Pat", "Owner", "50 Example Road", "Ottawa", "K2P 0A5", "613-555-0190", "office@example.com", "Rowan Paralegal", "Second Defendant"]) {
      assert.ok(!values.some((value) => value.includes(theirs)), `${theirs} is on Form 10A`);
    }
  });
  await check("10. negative control: a 10A map that fills the Defendant name box from the other side is caught by the table", async () => {
    const leaky: FormMapDefinition = { ...FORM_10A, boxes: { ...FORM_10A.boxes, "Last name, or name of company - Defendant": { kind: "fill", fact: "plaintiffs[0].companyName", read: (ctx) => ctx.plaintiffs[0]?.details.companyName, missing: { what: "x", addAt: "parties" } } } };
    const wrong = differences(await readBack(await filledPdf(leaky, formContextOf(DEFENCE))), EXPECTED_10A);
    assert.deepEqual(wrong, [`Last name, or name of company - Defendant: "Example Renovations Inc." (expected "")`]);
  });

  await check("9. Family 10: an address too long for the one-line applicant box is left blank, and the screen gives the whole address to write by hand", () => {
    const result = fillForm(FAMILY_FORM_10, formContextOf(FAMILY_RESPONDENT)).find((item) => item.box === "Address - Applicant(s)");
    assert.ok(result?.state === "blank" && /too long/i.test(result.why) && result.why.includes("44 Example Drive, Sudbury ON, P3B 2B2"), JSON.stringify(result));
  });

  if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}

void main();
