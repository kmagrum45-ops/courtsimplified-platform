/**
 * A filled-form failure says which step failed, as a fixed code, and never a value from the case.
 *
 * WHAT IT CATCHES. On PR #550's preview (17 Nov 2026) every filled form answered 500 and the log held only the error's
 * name, "Error", so the cause (pdf.js's worker not shipped) had to be found by rebuilding and reading traces. Now
 * officialPdf.ts tags the error with the step (FILL_STAGES: values, open-pdf, load-pdfjs, fill, font-map, attach-pages,
 * assemble) and the route logs that code beside the name. Also asserts the error thrown is unchanged (UnprintableText
 * still reaches the route as itself), and that pdf.js on the server gets its worker from pdf/pdfjsServer.ts.
 *
 * Run: npm run test:filled-form-stages (also inside test:form-maps)
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FORM_7A } from "../../src/lib/case-system/forms/maps/form7A";
import { formContextOf } from "../../src/lib/case-system/forms/formContext";
import { fillStageOf, filledFormPdf } from "../../src/lib/case-system/forms/officialPdf";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

const ID = "00000000-0000-4000-8000-0000000000aa";
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

let failures = 0;
async function check(name: string, run: () => Promise<void> | void) {
  try { await run(); console.log(`PASS  ${name}`); } catch (error) { failures += 1; console.log(`FAIL  ${name}\n      ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`); }
}

void (async () => {
// Whether the worker came by name is checked from the source in 6: once loaded, the worker module itself sets
// globalThis.pdfjsWorker, so a run here cannot tell the two ways apart.
await check("1. a form that fills: the official file, filled through pdf.js", async () => {
  const bytes = await filledFormPdf(FORM_7A, formContextOf(record("Synthetic: the renovation was not finished.")));
  assert.ok(bytes.length > 10_000, `only ${bytes.length} bytes`);
});

await check("2. the official file missing: the error says open-pdf, and carries none of the case's words", async () => {
  const missing = { ...FORM_7A, pdf: { ...FORM_7A.pdf, file: "docs/sources/forms/not-a-form.pdf" } };
  const error = await filledFormPdf(missing, formContextOf(record("Synthetic: Zebulon Quartz was owed money."))).then(() => null, (caught: unknown) => caught);
  assert.ok(error, "no error");
  assert.equal(fillStageOf(error), "open-pdf");
  assert.ok(!String((error as Error).message).includes("Zebulon"), "the error carries the case's words");
});

await check("3. a character no font prints: still UnprintableText, the same error, tagged values", async () => {
  const error = await filledFormPdf(FORM_7A, formContextOf(record("Synthetic: the builder wrote 你好 on the invoice."))).then(() => null, (caught: unknown) => caught);
  assert.equal((error as Error | null)?.name, "UnprintableText");
  assert.equal(fillStageOf(error), "values");
});

await check("4. an error that is not from a fill step reads unknown", () => {
  assert.equal(fillStageOf(new Error("x")), "unknown");
  assert.equal(fillStageOf(null), "unknown");
});

await check("5. the route logs the error's name and the stage, never the error's message", () => {
  const route = readFileSync("app/api/cases/forms/filled/route.ts", "utf8");
  const logged = /console\.error\([^;]*\);/.exec(route)?.[0] ?? "";
  assert.match(logged, /errorName:/);
  assert.match(logged, /stage: fillStageOf\(error\)/);
  assert.doesNotMatch(logged, /\.message/);
});

await check("6. server code loads pdf.js only through pdf/pdfjsServer.ts (which hands it its worker)", () => {
  for (const file of ["src/lib/case-system/forms/officialPdf.ts", "src/lib/case-workspace/extractText.ts"]) {
    const text = readFileSync(file, "utf8").replace(/^\s*(\/\/|\*).*$/gm, "");
    // A type-only `typeof import(...)` loads nothing.
    assert.doesNotMatch(text, /(?<!typeof )import\(\s*["']pdfjs-dist/, `${file} loads pdf.js itself`);
    assert.match(text, /pdfjsServer\(\)/, `${file} does not use pdfjsServer()`);
  }
  const loader = readFileSync("src/lib/pdf/pdfjsServer.ts", "utf8");
  assert.match(loader, /import\(\s*"pdfjs-dist\/legacy\/build\/pdf\.worker\.mjs"\s*\)/, "the loader imports the worker by name");
  assert.match(loader, /pdfjsWorker \?\?= worker/, "the loader hands the worker to pdf.js");
});

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
})();
