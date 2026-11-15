/**
 * THE ATTACHED PAGES: WHEN THE PERSON'S WORDS OVERFLOW A FORM'S BOXES, THE DOWNLOAD CARRIES THEM (site owner, 15 Nov
 * 2026: "a person who sees 'pages attached' ticked must always get the pages, and no pages may exist when nothing
 * overflowed"). Runs as the fourth part of test:form-maps.
 *
 * Until this, Forms 7A and 9A ticked "ADDITIONAL PAGES ARE ATTACHED BECAUSE MORE ROOM WAS NEEDED" and the PDF had none:
 * the overflow was lost.
 *
 * What it asserts, reading the downloaded PDF itself (filledFormPdf, what POST /api/cases/forms/filled sends), with no
 * browser, model, database or network:
 *   1. reasons longer than the boxes (7A starting a claim; 9A defending): the tick is on, pages follow the official
 *      form's own pages, and they hold every word of the overflow, in order, under the form's own heading with
 *      "(continued)", and nothing else (no word of the site's own but each page's "Attached page N of M"); the boxes and
 *      the pages together hold every word of the reasons once, in order;
 *   2. none of it is cut off: every line on an attached page sits inside the page's margins;
 *   3. the official form's boxes are still filled in the download (read back after the pages are added);
 *   4. reasons that fit: no tick and no extra page (7A; 9A); 9A when the record does not say the person is the defendant:
 *      no reasons, no tick, no pages;
 *   5. NEGATIVE CONTROL: the comparison catches pages that lose the last word of the overflow, and a tick with no pages.
 *
 * WHAT FAILURE THIS CATCHES: a ticked "pages attached" with no pages, pages with words missing or cut off, or pages that
 * hold words that are not the person's.
 *
 * Run: npm run test:form-maps
 */
import assert from "node:assert/strict";
import { FORM_7A } from "../../src/lib/case-system/forms/maps/form7A";
import { FORM_9A } from "../../src/lib/case-system/forms/maps/form9A";
import { fillForm, type FormMapDefinition } from "../../src/lib/case-system/forms/formMap";
import { formContextOf } from "../../src/lib/case-system/forms/formContext";
import { filledFormPdf, officialPdfBytes, pdfBoxes } from "../../src/lib/case-system/forms/officialPdf";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
const ID = "00000000-0000-4000-8000-000000000615";
const SENTENCE = (n: number) => `On day ${n} the contractor left the kitchen unfinished and did not return any of my calls or messages. `;
const LONG = Array.from({ length: 150 }, (_, index) => SENTENCE(index + 1)).join("").trim();
const SHORT = "On October 4, 2026 the contractor left the kitchen unfinished. I paid $2,000 up front.";
const record = (where: "starting" | "served" | null, story: string): Checkpoint => ({
  version: 1, flowId: ID, courtPath: "small-claims", revision: ID,
  sections: {
    situation: { record: where ? { where, court: "small-claims", ...(where === "starting" ? { filed: "nothing" } : {}) } : { court: "small-claims" } },
    story: { text: story },
    caseFile: { parties: { version: 1, declined: [], list: [
      { id: "you", you: true, side: "yours", kind: "person", details: { firstName: "Test", lastName: "Person", street: "1 Example Street", city: "Ottawa", province: "ON", postalCode: "K1A 0A1", phone: "613-555-0100", email: "test@example.com" }, unsure: [] },
      { id: "o1", side: "other", kind: "company", details: { companyName: "Example Renovations Inc.", street: "2 Example Road", city: "Ottawa", province: "ON", postalCode: "K2P 0A5" }, unsure: [] },
    ] } },
  } as never,
});

/** What each form's attached pages are headed with: the official form's own words, written out by hand. */
const HEADINGS: Record<string, string[]> = {
  [FORM_7A.id]: ["Form 7A, Plaintiff's Claim", "REASONS FOR CLAIM AND DETAILS (continued)"],
  [FORM_9A.id]: ["Form 9A, Defence", "REASONS FOR DISPUTING THE CLAIM AND DETAILS (continued)"],
};
const TICK = "Additional pages attached because more room was needed";
const words = (text: string) => text.split(/\s+/).filter(Boolean);

type Line = { text: string; x: number; y: number; right: number; page: number };
/** The text on each page of a PDF, line by line, with where it sits. */
async function pageLines(bytes: Uint8Array): Promise<{ pages: number; width: number; height: number; lines: Line[] }> {
  const lib = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as PdfJs;
  const task = lib.getDocument({ data: bytes.slice(), disableFontFace: true, verbosity: lib.VerbosityLevel.ERRORS });
  const doc = await task.promise;
  const lines: Line[] = [];
  let width = 0, height = 0;
  for (let page = 1; page <= doc.numPages; page++) {
    const p = await doc.getPage(page);
    [, , width, height] = p.view;
    for (const item of (await p.getTextContent()).items) {
      if (!("str" in item) || !item.str.trim()) continue;
      lines.push({ text: item.str, x: item.transform[4], y: item.transform[5], right: item.transform[4] + item.width, page });
    }
  }
  const pages = doc.numPages;
  await task.destroy();
  return { pages, width, height, lines };
}

/** The attached pages' text, checked against the headings and the overflow: what is wrong, if anything. */
function attachedProblems(map: FormMapDefinition, lines: readonly Line[], firstAttached: number, pageCount: number, overflow: string): string[] {
  const problems: string[] = [];
  const attachedCount = pageCount - firstAttached + 1;
  const body: string[] = [];
  for (let page = firstAttached; page <= pageCount; page++) {
    const own = lines.filter((line) => line.page === page);
    const texts = own.map((line) => line.text.trim());
    for (const heading of HEADINGS[map.id]) if (!texts.includes(heading)) problems.push(`page ${page}: heading "${heading}" missing`);
    const label = `Attached page ${page - firstAttached + 1} of ${attachedCount}`;
    if (!texts.includes(label)) problems.push(`page ${page}: "${label}" missing`);
    body.push(...own.map((line) => line.text.trim()).filter((text) => text !== label && !HEADINGS[map.id].includes(text)));
  }
  const got = words(body.join(" "));
  const want = words(overflow);
  if (got.join(" ") !== want.join(" ")) {
    const at = got.findIndex((word, index) => word !== want[index]);
    problems.push(`the pages hold ${got.length} words, the overflow ${want.length}; first difference at word ${at === -1 ? Math.min(got.length, want.length) : at}: "${got[at] ?? ""}" vs "${want[at] ?? ""}"`);
  }
  return problems;
}

let failed = 0;
const check = async (name: string, run: () => void | Promise<void>) => { try { await run(); console.log(`PASS  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n").slice(0, 6).join("\n      ")}`); } };

async function officialPages(map: FormMapDefinition): Promise<number> {
  return (await pageLines(officialPdfBytes(map.pdf.file))).pages;
}

async function main() {
  const cases = [
    { map: FORM_7A, record: record("starting", LONG), reasons: ["Reasons for claim and details", "Reasons for claim and details_continued"] },
    { map: FORM_9A, record: record("served", LONG), reasons: ["Reasons for disputing the claim and details", "Reasons for disputing the claim and details, continued"] },
  ];
  for (const { map, record: rec, reasons } of cases) {
    const ctx = formContextOf(rec);
    const results = fillForm(map, ctx);
    const inBoxes = reasons.map((box) => results.find((result) => result.box === box)).map((result) => (result?.state === "filled" ? String(result.value) : "")).join(" ");
    const overflow = words(ctx.reasons).slice(words(inBoxes).length).join(" ");
    const bytes = await filledFormPdf(map, ctx);
    const { pages, width, height, lines } = await pageLines(bytes);
    const formPages = await officialPages(map);

    await check(`1. ${map.id}, reasons longer than the boxes: ticked, and the pages after the form hold every word of the overflow under the form's own heading, and nothing else`, async () => {
      assert.ok(overflow.length > 0, "the test story does not overflow");
      const tick = (await pdfBoxes(bytes)).find((box) => box.name === TICK);
      assert.ok(tick && tick.value && tick.value !== "Off", "the tick is not on");
      assert.ok(pages > formPages, `the download has ${pages} pages, the official form ${formPages}: no pages attached`);
      assert.deepEqual(attachedProblems(map, lines, formPages + 1, pages, overflow), []);
      assert.equal(words(`${inBoxes} ${overflow}`).join(" "), words(ctx.reasons).join(" "), "the boxes and the pages do not hold the reasons once, in order");
    });
    await check(`2. ${map.id}: every line on the attached pages is inside the page's margins (nothing cut off)`, () => {
      const outside = lines.filter((line) => line.page > formPages && (line.x < 35 || line.right > width - 35 || line.y < 35 || line.y > height - 35));
      assert.deepEqual(outside.map((line) => `p${line.page} "${line.text.slice(0, 30)}" x=${line.x.toFixed(0)}..${line.right.toFixed(0)} y=${line.y.toFixed(0)}`), []);
    });
    await check(`3. ${map.id}: the official form's boxes are still filled in the download`, async () => {
      const boxes = await pdfBoxes(bytes);
      const first = boxes.find((box) => box.name === reasons[0]);
      assert.ok(typeof first?.value === "string" && first.value.length > 100, "the first reasons box is empty in the download");
      assert.ok(boxes.some((box) => box.value === "Example Renovations Inc."), "the other party's name is not in the download");
    });
    if (map === FORM_7A) {
      await check("5. negative control: pages that lose the last word of the overflow are caught", () => {
        const shortened = lines.filter((line) => !(line.page === pages && line === lines.filter((l) => l.page === pages).at(-1)));
        assert.ok(attachedProblems(map, shortened, formPages + 1, pages, overflow).length > 0, "a missing last line was not caught");
      });
    }
  }

  for (const { map, rec, label } of [
    { map: FORM_7A, rec: record("starting", SHORT), label: "reasons that fit" },
    { map: FORM_9A, rec: record("served", SHORT), label: "reasons that fit" },
    { map: FORM_9A, rec: record("starting", LONG), label: "long reasons, but the person is not the defendant" },
    { map: FORM_9A, rec: record(null, LONG), label: "long reasons, side not recorded" },
  ]) {
    await check(`4. ${map.id}, ${label}: no tick, and no page after the official form`, async () => {
      const bytes = await filledFormPdf(map, formContextOf(rec));
      const tick = (await pdfBoxes(bytes)).find((box) => box.name === TICK);
      assert.ok(!tick?.value || tick.value === "Off", "the tick is on");
      assert.equal((await pageLines(bytes)).pages, await officialPages(map));
    });
  }

  await check("6. a character Helvetica cannot print in the overflow stops the download with UnprintableText; it is never changed or dropped", async () => {
    const story = `${LONG} The builder wrote 你好 on the invoice.`;
    await assert.rejects(filledFormPdf(FORM_7A, formContextOf(record("starting", story))), (error: Error) => error.name === "UnprintableText" && /U\+4F60/.test(error.message));
  });
  await check("5. negative control: a download with the tick on and no pages is caught", async () => {
    const bytes = officialPdfBytes(FORM_7A.pdf.file);
    const { pages } = await pageLines(bytes);
    assert.ok(!(pages > (await officialPages(FORM_7A))), "an official form with no pages attached passed as having pages");
  });

  if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}

void main();
