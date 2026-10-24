/**
 * Pictures of the top of the first page of each document that starts a case, for the
 * situation questions' "which papers did you get?" list (step 2).
 *
 *   node --import tsx scripts/forms/captureFirstPageTops.ts
 *
 * For each form in FIRST_PAGE_FORMS it downloads the official PDF named in
 * officialFormLinks.json (ontariocourtforms.on.ca, recorded there with its title and
 * date), renders page 1 in a headless browser with pdfjs, keeps the top part, and
 * writes public/form-tops/<court>-<number>.png. firstPageTops.json records, for each
 * picture, the official title, form date, PDF address and the day it was taken, so a
 * picture is never shown without its source (CLAUDE.md s. 2).
 *
 * Nothing is drawn or typed: each picture is the court's own page.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import { refuseCanliiContent } from "../../src/lib/canlii/canliiCore";
import { FIRST_PAGE_FORMS } from "../../src/lib/case-system/situation/firstPageForms";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const LINKS = JSON.parse(readFileSync(path.join(ROOT, "src/lib/content-library/forms/officialFormLinks.json"), "utf8")) as {
  forms: { court: string; number: string; title: string; date: string; pdf: string }[];
};
const OUT_DIR = path.join(ROOT, "public", "form-tops");
const MANIFEST = path.join(ROOT, "src", "lib", "case-system", "situation", "firstPageTops.json");
const PDFJS = path.join(ROOT, "node_modules", "pdfjs-dist", "legacy", "build");

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pdfs = new Map<string, Buffer>();
  await page.route("http://pdf.local/**", async (route) => {
    const name = new URL(route.request().url()).pathname.slice(1);
    if (name === "pdf.mjs" || name === "pdf.worker.mjs") {
      await route.fulfill({ body: readFileSync(path.join(PDFJS, name)), contentType: "text/javascript" });
    } else if (pdfs.has(name)) {
      await route.fulfill({ body: pdfs.get(name)!, contentType: "application/pdf" });
    } else if (name === "") {
      await route.fulfill({ body: "<!doctype html><html><body></body></html>", contentType: "text/html" });
    } else await route.fulfill({ status: 404, body: "" });
  });
  await page.goto("http://pdf.local/");

  const today = new Date().toISOString().slice(0, 10);
  const records = [];
  for (const form of FIRST_PAGE_FORMS) {
    const official = LINKS.forms.find((item) => item.court === form.court && item.number === form.number);
    if (!official) throw new Error(`${form.court} ${form.number} is not in officialFormLinks.json`);
    refuseCanliiContent(official.pdf);
    const response = await fetch(official.pdf);
    if (!response.ok) throw new Error(`${official.pdf}: HTTP ${response.status}`);
    const name = `${form.court}-${form.number}.pdf`;
    pdfs.set(name, Buffer.from(await response.arrayBuffer()));

    const dataUrl = await page.evaluate(async ({ name, keep }) => {
      const pdfjs = await import("http://pdf.local/pdf.mjs" as string);
      pdfjs.GlobalWorkerOptions.workerSrc = "http://pdf.local/pdf.worker.mjs";
      const doc = await pdfjs.getDocument({ url: `http://pdf.local/${name}` }).promise;
      const first = await doc.getPage(1);
      const viewport = first.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await first.render({ canvasContext: context, viewport, canvas }).promise;
      const top = document.createElement("canvas");
      top.width = canvas.width;
      top.height = Math.round(canvas.height * keep);
      top.getContext("2d")!.drawImage(canvas, 0, 0);
      return top.toDataURL("image/png");
    }, { name, keep: form.keep });

    const image = `form-tops/${form.court}-${form.number}.png`;
    await sharp(Buffer.from(dataUrl.split(",")[1], "base64")).resize({ width: 640 }).png({ compressionLevel: 9, palette: true }).toFile(path.join(ROOT, "public", image));
    records.push({ court: form.court, number: form.number, title: official.title, date: official.date, pdf: official.pdf, image, retrievedOn: today });
    console.log(`  ${form.court} ${form.number}: ${official.title}`);
  }
  await browser.close();
  writeFileSync(MANIFEST, JSON.stringify({ source: "https://ontariocourtforms.on.ca/en/", forms: records }, null, 2) + "\n");
  console.log(`wrote ${records.length} pictures and ${path.relative(ROOT, MANIFEST)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
