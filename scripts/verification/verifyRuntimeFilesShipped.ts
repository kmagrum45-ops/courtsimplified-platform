/**
 * Every file a route opens at run time ships with that route on Vercel.
 *
 * WHAT IT CATCHES. Vercel runs each route with only the files Next.js traced for it (route.js.nft.json), plus what
 * next.config.ts adds in outputFileTracingIncludes. A file opened by a name the tracer cannot follow is not shipped, and
 * on Vercel the route fails while every local run passes, because locally the whole repository and node_modules are
 * there. That happened on PR #550 (17 Nov 2026): POST /api/cases/forms/filled answered 500 for every form on the preview,
 * because pdf.js loads its worker (pdf.worker.mjs) with an import the tracer cannot see, and the trace held pdf.mjs only.
 * Every local test passed.
 *
 * HOW. 1. Every file in app/ and src/ that reads files at run time (fs reads, or pdf.js) must be in READERS below, with
 * the files it opens. A new reader that is not declared fails here. 2. For every route and page whose import closure
 * reaches a reader, the build's own trace must hold every file that reader opens. It reads what ships, not what the
 * config says.
 *
 * Runs after `npm run build` (CI runs it after the build). Without a build it fails, because a check that cannot look
 * must not pass.
 *
 * Run: npm run test:runtime-files-shipped
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { resolveImport } from "../ai/importClosureHash.mjs";
import { FORM_MAPS } from "../../src/lib/case-system/forms/maps";

const ROOT = process.cwd();
const PDFJS = ["node_modules/pdfjs-dist/legacy/build/pdf.mjs", "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"];

/** Every run-time reader, and the files it opens. `browser`: runs only in the person's browser, so nothing ships. */
const READERS: Record<string, { opens: string[]; why: string; browser?: true }> = {
  // Through it: officialPdf.ts (filled forms) and extractText.ts (an uploaded PDF's text).
  "src/lib/pdf/pdfjsServer.ts": { opens: PDFJS, why: "pdf.js and its worker, loaded on the server" },
  "src/lib/case-system/forms/officialPdf.ts": {
    opens: [...new Set(FORM_MAPS.map((map) => map.pdf.file)), ...PDFJS],
    why: "the official form PDFs the site fills (every form map's file), with pdf.js",
  },
  "src/lib/case-system/retrieval/corpusIndex.ts": {
    opens: ["docs/sources/retrieval/corpus-index.json", "docs/sources/retrieval/corpus-vectors.bin", "docs/sources/corpus/residential-tenancies-act-2006.txt"],
    why: "the retrieval index and corpus (test:retrieval-bundled checks the same files)",
  },
  "src/lib/content-library/smallClaimsForms.ts": { opens: ["docs/sources/corpus/small-claims-forms-table.txt"], why: "the forms table" },
  "src/lib/case-workspace/clientOcr.ts": { opens: [], why: "OCR in the person's browser", browser: true },
};

const READS = /\b(readFileSync|readFile|readdirSync|existsSync|createReadStream|opendir)\s*\(|from\s+["'](?:node:)?fs\/promises["']|import\s*\(\s*["']pdfjs-dist|from\s+["']pdfjs-dist/;

/**
 * The files a module runs, following its imports. A type-only import (`import type`, `export type`) is left out: it is
 * erased in the build and runs nothing (the builder page reached the retrieval index only through `import type`).
 */
const IMPORT = /(?:import|export)\s+(?!type\s)[^'"]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g;
function runClosure(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (file.endsWith(".json")) continue;
    for (const match of readFileSync(file, "utf8").matchAll(IMPORT)) {
      const resolved = resolveImport(file, match[1] ?? match[2] ?? match[3]) as string | null;
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return new Set([...seen].map(rel));
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mjs|js)$/.test(entry) && !/\.test\.|\.d\.ts$/.test(entry)) out.push(full);
  }
  return out;
}
const rel = (file: string) => path.relative(ROOT, file).split(path.sep).join("/");
/** A trace entry, from the repository root; node_modules entries from their last node_modules/ (it may be a link). */
const shipped = (file: string) => {
  const at = file.lastIndexOf("node_modules/");
  return at >= 0 ? file.slice(at) : file;
};

let failures = 0;
const fail = (message: string) => { failures += 1; console.log(`FAIL  ${message}`); };

// 1. Every run-time reader is declared, and every declared one still reads.
const sources = [...walk(path.join(ROOT, "app")), ...walk(path.join(ROOT, "src"))];
const readers = sources.filter((file) => READS.test(readFileSync(file, "utf8").replace(/^\s*(\/\/|\*).*$/gm, ""))).map(rel);
for (const file of readers) if (!READERS[file]) fail(`${file} reads files at run time and is not declared in READERS (say which files it opens)`);
for (const file of Object.keys(READERS)) if (!readers.includes(file)) fail(`${file} is declared in READERS but no longer reads files: remove it`);
for (const [file, reader] of Object.entries(READERS)) for (const opened of reader.opens) if (!existsSync(path.join(ROOT, opened))) fail(`${file} opens ${opened}, which does not exist`);
if (!failures) console.log(`pass  ${readers.length} run-time readers, each declared with the files it opens`);

// 2. Every route and page that reaches a server reader ships what it opens.
const entries = sources.filter((file) => /[\\/]app[\\/].*[\\/](route\.ts|page\.tsx)$/.test(file));
let checked = 0;
for (const entry of entries) {
  const closure = runClosure(entry);
  const reached = Object.entries(READERS).filter(([file, reader]) => !reader.browser && closure.has(file));
  if (!reached.length) continue;
  const dir = path.dirname(rel(entry)).replace(/^app\/?/, "");
  const trace = path.join(ROOT, ".next", "server", "app", ...dir.split("/").filter(Boolean), `${path.basename(entry).replace(/\.tsx?$/, "")}.js.nft.json`);
  if (!existsSync(trace)) { fail(`${rel(entry)}: no trace at ${rel(trace)} (run npm run build first)`); continue; }
  const files = new Set((JSON.parse(readFileSync(trace, "utf8")) as { files: string[] }).files.map((file) => shipped(path.resolve(path.dirname(trace), file).split(path.sep).join("/").replace(`${ROOT.split(path.sep).join("/")}/`, ""))));
  checked += 1;
  const missing = [...new Set(reached.flatMap(([, reader]) => reader.opens))].filter((file) => !files.has(file));
  if (missing.length) fail(`/${dir} (${path.basename(entry)}) reaches ${reached.map(([file]) => path.basename(file)).join(", ")} but does not ship: ${missing.join(", ")}`);
  else console.log(`pass  /${dir} ships every file it opens (${reached.map(([file]) => path.basename(file)).join(", ")})`);
}
if (!checked) fail("no route or page reaches a run-time reader: the check found nothing to check");

console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
