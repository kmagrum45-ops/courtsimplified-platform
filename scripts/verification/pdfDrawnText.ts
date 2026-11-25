/**
 * What pdf.js actually draws in each filled box of a PDF, from its own operator list (the same drawing the rendered page
 * shows): the box's size, the font size it used, and where each line of text ends. A test helper, not site code: the
 * ground truth test:form-maps checks text fitting against (verifyFormTextFit.ts). No model, no network.
 *
 * A line is cut off when it runs past the box's right edge, or sits below its bottom edge: pdf.js clips the text to the
 * box, so what is past the edge is not printed. Widths are pdf.js's own glyph widths (thousandths of the font size).
 */
type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

export type DrawnBox = {
  /** pdf.js's id for the widget; only text boxes (not ticks) are kept. */
  id: string;
  name: string;
  page: number;
  width: number;
  height: number;
  fontSize: number | null;
  lines: { text: string; x: number; y: number; right: number }[];
};

/** Every widget pdf.js draws text in, with its lines. */
export async function drawnText(bytes: Uint8Array): Promise<DrawnBox[]> {
  const lib = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as PdfJs;
  const task = lib.getDocument({ data: bytes.slice(), disableFontFace: true, verbosity: lib.VerbosityLevel.ERRORS });
  const doc = await task.promise;
  const op = Object.fromEntries(Object.entries(lib.OPS).map(([key, value]) => [value, key]));
  const out: DrawnBox[] = [];
  try {
    for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
      const page = await doc.getPage(pageNo);
      const names = new Map((await page.getAnnotations()).filter((a) => a.subtype === "Widget" && a.fieldType === "Tx").map((a) => [a.id as string, a.fieldName as string]));
      const list = await page.getOperatorList({ annotationMode: lib.AnnotationMode.ENABLE_STORAGE, intent: "print" });
      let box: DrawnBox | null = null;
      let x = 0, y = 0, size = 0;
      for (let i = 0; i < list.fnArray.length; i++) {
        const name = op[list.fnArray[i]];
        const args = list.argsArray[i] as unknown[];
        if (name === "beginAnnotation") {
          const [id, rect] = args as [string, number[]];
          box = { id, name: names.get(id) ?? id, page: pageNo, width: rect[2] - rect[0], height: rect[3] - rect[1], fontSize: null, lines: [] };
          x = 0; y = 0; size = 0;
        } else if (name === "endAnnotation") {
          if (box && box.lines.length && names.has(box.id)) out.push(box);
          box = null;
        } else if (box && name === "setFont") {
          size = (args as [string, number])[1];
          box.fontSize = size;
        } else if (box && name === "setTextMatrix") {
          // A multi-line box starts its text at the top: the matrix's translation is where the first line is measured from.
          const matrix = (args as [ArrayLike<number>])[0];
          x = matrix[4]; y = matrix[5];
        } else if (box && name === "moveText") {
          const [tx, ty] = args as [number, number];
          x += tx; y += ty;
        } else if (box && name === "showText") {
          const glyphs = (args as [({ unicode: string; width: number } | number | null)[]])[0];
          // A line's ink ends at its last glyph that is not a space: a wrapped line's trailing space prints nothing.
          let advance = 0, inked = 0, text = "";
          for (const glyph of glyphs) if (glyph && typeof glyph === "object") { advance += (glyph.width * size) / 1000; text += glyph.unicode; if (glyph.unicode.trim()) inked = advance; }
          box.lines.push({ text, x, y, right: x + inked });
        }
      }
    }
  } finally {
    await task.destroy();
  }
  return out;
}

/** The boxes whose text is cut off (past the right edge, or below the bottom), each with what is lost. Half a point of slack. */
export function cutOff(boxes: readonly DrawnBox[]): { name: string; page: number; why: string }[] {
  const out: { name: string; page: number; why: string }[] = [];
  for (const box of boxes) {
    const wide = box.lines.filter((line) => line.right > box.width + 0.5);
    const low = box.lines.filter((line) => line.y < -0.5);
    if (wide.length) out.push({ name: box.name, page: box.page, why: `runs ${Math.round(Math.max(...wide.map((line) => line.right)) - box.width)}pt past the right edge at ${box.fontSize}pt` });
    if (low.length) out.push({ name: box.name, page: box.page, why: `${low.length} line(s) below the bottom edge at ${box.fontSize}pt` });
  }
  return out;
}
