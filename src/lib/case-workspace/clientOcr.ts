/**
 * OCR in the user's own browser. The image never leaves their device to be read.
 *
 * *** WHY IN THE BROWSER, WHICH IS THE HARDER PLACE TO PUT IT ***
 *
 * A large share of what a self-represented litigant uploads is a photograph: a
 * receipt on a kitchen table, a letter held up to a phone. Without OCR those are
 * documents with no searchable text at all, and Part 2 correctly reports them as
 * such rather than storing an empty success — but "correctly reported as unreadable"
 * is not the same as useful.
 *
 * The easy answer is to send the image to a service that reads it. That was refused
 * on data-residency grounds, recorded in
 * `docs/security/DATA_FLOW_INVENTORY.md` §3.6. Running tesseract in the browser
 * means the bytes of a medical record are never transmitted anywhere for the purpose
 * of reading them — not to us, not to a third party. What reaches the server is the
 * text, which the user can see before it is sent.
 *
 * *** WHAT IS SENT IS A SUGGESTION, AND IT IS LABELLED AS ONE ***
 *
 * OCR of a phone photo is frequently half-right. So the result carries its mean
 * confidence and is tagged `client-ocr`, and the server stores it as such rather
 * than as text it read itself. Below LOW_CONFIDENCE the document is put in
 * `needs-details`, which asks the user to type the date and a description.
 *
 * It must never become a silent empty success, and it must never be treated as
 * reliably read. CLAUDE.md §4: the user confirms or overrides.
 *
 * *** WHY THIS FILE CANNOT BE TRUSTED BY THE SERVER, AND SAYS SO ***
 *
 * Everything here runs on the client, so everything here is under the control of
 * whoever is using the browser. The text and the confidence score that arrive at
 * the extract route are ordinary untrusted request input. The route length-limits
 * them, range-checks the confidence, and runs its own personal-data scan over the
 * text rather than trusting any claim made here. This module is a convenience for
 * the honest user, not a security boundary.
 *
 * *** ENGLISH AND FRENCH ***
 *
 * Both, because Ontario documents are in both and a French letter read with an
 * English-only model loses exactly the accented characters that carry its dates.
 * The repository has already been bitten by de-accenting once, recorded in the RTF
 * check in `test:workspace-extraction`.
 *
 * NO MODEL IS CALLED HERE. tesseract is a local recogniser, not a model API. A
 * future option to read document images with a multimodal model is recorded in
 * ACCURACY_ENGINE.md as deliberately NOT built, pending confirmation that OpenAI
 * image inputs carry the same retention terms as text.
 */

/** Below this mean confidence, the user is asked for the details themselves. */
export const LOW_CONFIDENCE = 70;

/**
 * Pages OCR'd from one PDF. A 40-page scanned exhibit would take minutes and pin a
 * phone's CPU; the user is told when this limit truncates a document.
 */
export const MAX_OCR_PAGES = 15;

/** Rendered page width in pixels. Tesseract wants roughly 300 dpi of a letter page. */
const RENDER_WIDTH = 2000;

export type OcrProgress = {
  /** 0 to 1 across the whole job, pages included. */
  fraction: number;
  /** Shown to the user. Plain language, no jargon. */
  message: string;
};

export type ClientOcrResult = {
  source: "client-ocr";
  text: string;
  /** Mean confidence, 0 to 100. */
  confidence: number;
  /** "eng+fra". Recorded so a later re-run can be compared. */
  language: string;
  pagesRead: number;
  /** True when the document had more pages than MAX_OCR_PAGES. */
  truncated: boolean;
  /** True when confidence is below LOW_CONFIDENCE, so the user must fill in details. */
  needsDetails: boolean;
};

export type ClientOcrFailure = {
  source: "client-ocr";
  failed: true;
  /**
   * Why it could not run. Shown to the user, and the reason the server-side
   * `skipped` path stays as the fallback: an old browser, no WebAssembly, a
   * blocked worker, or a device that ran out of memory on a large scan.
   */
  reason: string;
};

export type ClientOcrOutcome = ClientOcrResult | ClientOcrFailure;

/**
 * Whether this browser can run it at all.
 *
 * Checked before offering OCR rather than after failing at it, because the
 * fallback — the server reporting `skipped` with a reason — is a perfectly good
 * outcome and the user should not watch a progress bar to reach it.
 */
export function browserCanRunOcr(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      typeof WebAssembly === "object" &&
      typeof Worker === "function" &&
      typeof document.createElement("canvas").getContext === "function"
    );
  } catch {
    return false;
  }
}

function failure(reason: string): ClientOcrFailure {
  return { source: "client-ocr", failed: true, reason };
}

const CANNOT_RUN_REASON =
  "This browser cannot read text out of images. The document has been stored and " +
  "you can give it a label, a date and an exhibit number yourself.";

/**
 * Renders each page of a PDF to a canvas and returns the bitmaps.
 *
 * Only called for a PDF whose text layer is empty, which is what a scan looks
 * like. A PDF with real text is read by the server, far faster and exactly.
 */
async function renderPdfPages(
  bytes: Uint8Array,
  onProgress: (progress: OcrProgress) => void,
): Promise<{ canvases: HTMLCanvasElement[]; truncated: boolean }> {
  const pdfjs = await import("pdfjs-dist");

  /*
   * pdfjs needs to be told where its worker is, and this is the line that is wrong
   * in most examples.
   *
   * `import "pdfjs-dist/build/pdf.worker.mjs?url"` is the form every Vite guide
   * uses, and it does not compile here: the `?url` suffix is a Vite feature, and TS
   * reports `Cannot find module`. Next.js resolves an asset with `new URL(…,
   * import.meta.url)`, which webpack and turbopack both understand and which is
   * plain standards-compliant code besides.
   *
   * `.min.mjs` deliberately: the unminified worker is shipped too, and loading it
   * costs the user a much larger download for output they never read.
   */
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const loading = pdfjs.getDocument({
    data: bytes,
    disableFontFace: true,
    useSystemFonts: false,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
  });

  const pdf = await loading.promise;
  const pageCount = Math.min(pdf.numPages, MAX_OCR_PAGES);
  const canvases: HTMLCanvasElement[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    onProgress({
      fraction: (pageNumber - 1) / (pageCount * 2),
      message: `Preparing page ${pageNumber} of ${pageCount}…`,
    });

    const page = await pdf.getPage(pageNumber);
    const unscaled = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: RENDER_WIDTH / unscaled.width });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const context = canvas.getContext("2d");
    if (!context) throw new Error("no-canvas-context");

    await page.render({ canvas, canvasContext: context, viewport }).promise;
    page.cleanup();
    canvases.push(canvas);
  }

  await loading.destroy();

  return { canvases, truncated: pdf.numPages > MAX_OCR_PAGES };
}

/**
 * Reads an image or a text-less PDF.
 *
 * `onProgress` is called often enough to drive a progress bar. OCR of a full page
 * takes seconds, and a user watching a still screen assumes it has hung.
 */
export async function runClientOcr(
  file: Blob,
  storedMime: string,
  onProgress: (progress: OcrProgress) => void = () => {},
): Promise<ClientOcrOutcome> {
  if (!browserCanRunOcr()) return failure(CANNOT_RUN_REASON);

  let worker: Awaited<ReturnType<typeof import("tesseract.js").createWorker>> | null = null;

  try {
    onProgress({ fraction: 0, message: "Getting ready to read this document…" });

    const { createWorker } = await import("tesseract.js");

    /*
     * Loaded on demand. The language data is a several-megabyte download, and a
     * user who never uploads a photograph should never fetch it.
     */
    worker = await createWorker("eng+fra", undefined, {
      logger: (message: { status: string; progress: number }) => {
        if (message.status === "recognizing text") {
          onProgress({
            fraction: 0.5 + message.progress * 0.5,
            message: `Reading the text… ${Math.round(message.progress * 100)}%`,
          });
        }
      },
    });

    const targets: (HTMLCanvasElement | Blob)[] = [];
    let truncated = false;

    if (storedMime === "application/pdf") {
      const rendered = await renderPdfPages(
        new Uint8Array(await file.arrayBuffer()),
        onProgress,
      );
      targets.push(...rendered.canvases);
      truncated = rendered.truncated;
    } else {
      targets.push(file);
    }

    if (targets.length === 0) {
      return failure(CANNOT_RUN_REASON);
    }

    const texts: string[] = [];
    const confidences: number[] = [];

    for (const [index, target] of targets.entries()) {
      onProgress({
        fraction: 0.5 + index / (targets.length * 2),
        message:
          targets.length > 1
            ? `Reading page ${index + 1} of ${targets.length}…`
            : "Reading the text…",
      });

      const { data } = await worker.recognize(target);
      texts.push(data.text || "");
      /*
       * A page that produced nothing contributes no confidence. Including a 0 for a
       * blank back-of-page would drag a well-read document under the threshold and
       * ask the user for details they had already been given correctly.
       */
      if ((data.text || "").trim().length > 0 && typeof data.confidence === "number") {
        confidences.push(data.confidence);
      }
    }

    const text = texts.join("\n\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

    /*
     * No text at all is a FAILURE of OCR, not a low-confidence result. Returning
     * `needsDetails` with an empty string would be the empty-success bug wearing a
     * different name: the server would store "" and the user would be told it was
     * read.
     */
    if (text.length === 0) {
      return failure(
        "There was no text CourtSimplified could read in this image. You can give " +
          "the document a label, a date and an exhibit number yourself.",
      );
    }

    const confidence =
      confidences.length > 0
        ? confidences.reduce((total, value) => total + value, 0) / confidences.length
        : 0;

    onProgress({ fraction: 1, message: "Finished reading." });

    return {
      source: "client-ocr",
      text,
      confidence: Math.round(confidence * 100) / 100,
      language: "eng+fra",
      pagesRead: targets.length,
      truncated,
      needsDetails: confidence < LOW_CONFIDENCE,
    };
  } catch (error) {
    /*
     * The thrown message is not passed through. A decoder's error can quote bytes
     * from the file, and those bytes are the user's document — the same rule the
     * server-side extractor follows.
     */
    void error;
    return failure(
      "CourtSimplified could not read this image on this device. It may be too " +
        "large, or the browser may have run out of memory. The document has been " +
        "stored and you can label and date it yourself.",
    );
  } finally {
    /*
     * Terminated in `finally`, because a tesseract worker holds tens of megabytes
     * and an abandoned one on a phone is the thing that makes the NEXT upload fail
     * with an out-of-memory error that looks unrelated.
     */
    try {
      await worker?.terminate();
    } catch {
      // Nothing useful to do; the page is about to move on regardless.
    }
  }
}
