/**
 * pdf.js on the server: the one way server code loads it (officialPdf.ts fills the court's forms, extractText.ts reads
 * an uploaded PDF).
 *
 * pdf.js runs its work in a "worker". On the server it loads that worker itself, with an import of a path it works out
 * at run time ("./pdf.worker.mjs"), which the build cannot follow, so Vercel did not ship the file. Every filled form
 * then failed on the preview with "Setting up fake worker failed: Cannot find module ... pdf.worker.mjs" (PR #550,
 * 17 Nov 2026: the filled-form download route answered 500 on Vercel; every local run passed, because locally node_modules is
 * whole). Here the worker is imported by name, so the build ships it, and handed to pdf.js as `globalThis.pdfjsWorker`,
 * which pdf.js uses before it tries any path of its own. test:runtime-files-shipped checks the build ships it.
 */
type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let loading: Promise<PdfJs> | null = null;

export function pdfjsServer(): Promise<PdfJs> {
  loading ??= (async () => {
    const [lib, worker] = await Promise.all([
      import("pdfjs-dist/legacy/build/pdf.mjs") as Promise<PdfJs>,
      // @ts-expect-error pdf.js publishes no types for its worker module
      import("pdfjs-dist/legacy/build/pdf.worker.mjs") as Promise<{ WorkerMessageHandler: unknown }>,
    ]);
    (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker ??= worker;
    return lib;
  })();
  return loading.catch((error) => { loading = null; throw error; });
}
