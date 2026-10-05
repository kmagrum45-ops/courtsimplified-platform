/**
 * Can the site fill each official court form automatically, without mapping it
 * by hand? Downloads every official PDF and Word file listed in
 * officialFormLinks.json and records what each one offers a filler.
 *
 *   node --import tsx scripts/forms/probeOfficialForms.ts
 *
 * WHY (2026-10-04). Form filling was tried before and stalled: the filler
 * (app/api/generate-form) fills AcroForm fields or draws text at hand-mapped
 * positions, and gives up on XFA PDFs, which many Ontario forms are. The site
 * owner asked whether forms can be filled without mapping each one. A form
 * that names its own fields can be matched to the case automatically; this
 * measures, for all 430 forms, which files do.
 *
 * For each PDF: AcroForm field count, whether it carries XFA, field names,
 * types and tooltips (the human description of a field, /TU).
 * For each Word file: content controls (<w:sdt>, with their tag/alias) and
 * legacy form fields (FORMTEXT / FORMCHECKBOX, with their names and help text).
 *
 * Runs on GitHub's runners (courtsimplified-forms-probe.yml): the cloud
 * workspaces cannot reach ontariocourtforms.on.ca. Writes forms-probe.json and
 * forms-probe-report.md. Nothing is stored but blank official forms' structure.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { PDFDocument, PDFName } from "pdf-lib";

type Official = { court: string; number: string; title: string; date: string; pdf: string | null; docx: string | null };

type PdfProbe = {
  ok: boolean;
  error?: string;
  pages?: number;
  xfa?: boolean;
  fields?: number;
  withTooltip?: number;
  sample?: { name: string; type: string; tooltip: string }[];
};

type DocxProbe = {
  ok: boolean;
  error?: string;
  contentControls?: number;
  namedControls?: number;
  legacyFields?: number;
  namedLegacy?: number;
  checkboxes?: number;
  sample?: { kind: string; name: string; help: string }[];
};

const ROOT = process.cwd();
const LINKS = path.join(ROOT, "src", "lib", "content-library", "forms", "officialFormLinks.json");
const UA = { "User-Agent": "CourtSimplified form probe (contact@courtsimplified.com)" };

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url, { headers: UA });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function probePdf(bytes: Buffer): Promise<PdfProbe> {
  const raw = bytes.toString("latin1");
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  let xfa = /\/XFA\s*[\[\d]/.test(raw);
  try {
    const acro = doc.catalog.lookup(PDFName.of("AcroForm"));
    if (acro && "get" in (acro as object)) {
      xfa = xfa || Boolean((acro as unknown as { get(n: PDFName): unknown }).get(PDFName.of("XFA")));
    }
  } catch {
    // keep the raw-text answer
  }
  const fields = doc.getForm().getFields();
  const described = fields.map((field) => {
    const dict = field.acroField.dict;
    const tu = dict.get(PDFName.of("TU"));
    const tooltip = tu ? String((tu as unknown as { decodeText?: () => string }).decodeText?.() ?? tu.toString()) : "";
    return { name: field.getName(), type: field.constructor.name.replace(/^PDF/, ""), tooltip };
  });
  return {
    ok: true,
    pages: doc.getPageCount(),
    xfa,
    fields: fields.length,
    withTooltip: described.filter((f) => f.tooltip.trim()).length,
    sample: described.slice(0, 8),
  };
}

function probeDocx(bytes: Buffer): DocxProbe {
  const dir = mkdtempSync(path.join(os.tmpdir(), "probe-"));
  const file = path.join(dir, "f.docx");
  writeFileSync(file, bytes);
  const xml = execFileSync("unzip", ["-p", file, "word/document.xml"], { maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
  const sdts = xml.match(/<w:sdt>[\s\S]*?<\/w:sdt>|<w:sdt [\s\S]*?<\/w:sdt>/g) ?? [];
  const named = sdts.filter((s) => /<w:(tag|alias) w:val="[^"]+"/.test(s));
  const ff = xml.match(/<w:ffData>[\s\S]*?<\/w:ffData>/g) ?? [];
  const namedFf = ff.filter((f) => /<w:name w:val="[^"]+"/.test(f));
  const checkboxes = ff.filter((f) => /<w:checkBox/.test(f)).length + sdts.filter((s) => /w14:checkbox/.test(s)).length;
  const sample = [
    ...named.slice(0, 5).map((s) => ({
      kind: "content-control",
      name: (s.match(/<w:alias w:val="([^"]+)"/)?.[1] ?? s.match(/<w:tag w:val="([^"]+)"/)?.[1] ?? "").slice(0, 80),
      help: "",
    })),
    ...namedFf.slice(0, 5).map((f) => ({
      kind: /<w:checkBox/.test(f) ? "checkbox" : "text",
      name: (f.match(/<w:name w:val="([^"]+)"/)?.[1] ?? "").slice(0, 80),
      help: (f.match(/<w:statusText[^>]*w:val="([^"]+)"/)?.[1] ?? f.match(/<w:helpText[^>]*w:val="([^"]+)"/)?.[1] ?? "").slice(0, 120),
    })),
  ];
  return {
    ok: true,
    contentControls: sdts.length,
    namedControls: named.length,
    legacyFields: ff.length,
    namedLegacy: namedFf.length,
    checkboxes,
    sample,
  };
}

/** How a filler could handle this form, best route first. */
function route(pdf: PdfProbe | null, docx: DocxProbe | null): string {
  if (pdf?.ok && (pdf.fields ?? 0) > 0) return pdf.xfa ? "pdf-acroform (hybrid XFA: drop XFA, fill AcroForm)" : "pdf-acroform";
  if (docx?.ok && ((docx.contentControls ?? 0) > 0 || (docx.legacyFields ?? 0) > 0)) return "word-fields";
  if (pdf?.ok && pdf.xfa) return "xfa-only (no AcroForm; Word has no fields either)";
  if (docx?.ok) return "word-no-fields (plain document)";
  return "unreadable";
}

async function main(): Promise<void> {
  const { forms } = JSON.parse(readFileSync(LINKS, "utf8")) as { forms: Official[] };
  const results: Array<Official & { pdfProbe: PdfProbe | null; docxProbe: DocxProbe | null; route: string }> = [];

  for (const form of forms) {
    let pdfProbe: PdfProbe | null = null;
    let docxProbe: DocxProbe | null = null;
    if (form.pdf) {
      try {
        pdfProbe = await probePdf(await download(form.pdf));
      } catch (error) {
        pdfProbe = { ok: false, error: error instanceof Error ? error.message.slice(0, 160) : String(error) };
      }
    }
    if (form.docx) {
      try {
        docxProbe = probeDocx(await download(form.docx));
      } catch (error) {
        docxProbe = { ok: false, error: error instanceof Error ? error.message.slice(0, 160) : String(error) };
      }
    }
    const r = route(pdfProbe, docxProbe);
    results.push({ ...form, pdfProbe, docxProbe, route: r });
    console.log(`${form.court.padEnd(12)} ${form.number.padEnd(7)} ${r}`);
  }

  writeFileSync(path.join(ROOT, "forms-probe.json"), JSON.stringify(results, null, 1));

  const courts = [...new Set(results.map((r) => r.court))];
  const lines = ["# Can each official form be filled automatically?", "", `Probed ${results.length} forms on ${new Date().toISOString().slice(0, 10)}.`, ""];
  lines.push("| Court | Forms | Fillable PDF | of which hybrid XFA | Word with fields | XFA-only | Word, no fields | Unreadable |", "|---|---|---|---|---|---|---|---|");
  for (const court of courts) {
    const rs = results.filter((r) => r.court === court);
    const n = (p: (r: (typeof rs)[number]) => boolean) => rs.filter(p).length;
    lines.push(
      `| ${court} | ${rs.length} | ${n((r) => r.route.startsWith("pdf-acroform"))} | ${n((r) => r.route.includes("hybrid"))} | ${n((r) => r.route === "word-fields")} | ${n((r) => r.route.startsWith("xfa-only"))} | ${n((r) => r.route.startsWith("word-no-fields"))} | ${n((r) => r.route === "unreadable")} |`,
    );
  }
  const pdfFillable = results.filter((r) => r.pdfProbe?.ok && (r.pdfProbe.fields ?? 0) > 0);
  const tooltipShare = pdfFillable.length
    ? Math.round((100 * pdfFillable.reduce((s, r) => s + (r.pdfProbe!.withTooltip ?? 0), 0)) / Math.max(1, pdfFillable.reduce((s, r) => s + (r.pdfProbe!.fields ?? 0), 0)))
    : 0;
  lines.push("", `Of the fields in fillable PDFs, ${tooltipShare}% carry a human description (tooltip).`, "", "## Examples", "");
  for (const court of courts) {
    const example = results.find((r) => r.court === court && r.route.startsWith("pdf-acroform"));
    if (example?.pdfProbe?.sample) {
      lines.push(`### ${court} Form ${example.number} — ${example.title}`, "");
      for (const f of example.pdfProbe.sample) lines.push(`- \`${f.name}\` (${f.type})${f.tooltip ? ` — "${f.tooltip}"` : ""}`);
      lines.push("");
    }
    const wordExample = results.find((r) => r.court === court && r.route === "word-fields");
    if (wordExample?.docxProbe?.sample) {
      lines.push(`### ${court} Form ${wordExample.number} (Word) — ${wordExample.title}`, "");
      for (const f of wordExample.docxProbe.sample) lines.push(`- ${f.kind}: \`${f.name}\`${f.help ? ` — "${f.help}"` : ""}`);
      lines.push("");
    }
  }
  lines.push("## Every form", "", "| Court | Form | Route | PDF fields (tooltips) | Word fields |", "|---|---|---|---|---|");
  for (const r of results) {
    const p = r.pdfProbe?.ok ? `${r.pdfProbe.fields} (${r.pdfProbe.withTooltip})${r.pdfProbe.xfa ? " XFA" : ""}` : r.pdfProbe ? "error" : "—";
    const d = r.docxProbe?.ok ? `${(r.docxProbe.contentControls ?? 0) + (r.docxProbe.legacyFields ?? 0)}` : r.docxProbe ? "error" : "—";
    lines.push(`| ${r.court} | ${r.number} | ${r.route} | ${p} | ${d} |`);
  }
  writeFileSync(path.join(ROOT, "forms-probe-report.md"), `${lines.join("\n")}\n`);
  console.log(lines.slice(0, 12).join("\n"));
}

void main();
