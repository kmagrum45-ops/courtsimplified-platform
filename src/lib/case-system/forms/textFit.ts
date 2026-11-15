/**
 * WHAT FITS IN A BOX OF THE OFFICIAL FORM, worked out the way pdf.js draws it (Lane B, 15 Nov 2026), so no filled form
 * prints part of a value, or prints it too small to read, while the screen says it is filled.
 *
 * Found with pdf.js 6.3's own drawing of filled forms (scripts/verification/pdfDrawnText.ts):
 *   - a box with a fixed font size (most of Form 9A and Form 1A, 10pt) cannot shrink: a long email ran 30pt past it;
 *   - a box sized to fit (font size 0) shrinks a long value until it cannot be read (1pt on Family Form 8);
 *   - in a box of several lines, pdf.js's own line breaking skips the first letter of each new line when it measures,
 *     so a line can run one letter past the box (the "t" of "not" was cut), and its auto size counts the lines at the
 *     font size, not the line height, so the last lines fell below the box.
 * The fix, from outside pdf.js: a value of several lines is given to it already broken into lines that fit at the size
 * pdf.js will use (so it never breaks a line itself), and a value that cannot fit at a readable size is not put in the
 * box at all: the box is left blank with the whole value to write by hand.
 *
 * The box sizes are the official PDFs' own (boxGeometry.json, from npm run forms:geometry); the letter widths are
 * Helvetica's (helveticaWidths.json), the widths pdf.js draws these boxes with. Pure: no PDF is opened. States no law.
 */
import geometry from "./boxGeometry.json";
import widths from "./helveticaWidths.json";

/** [width, height, font size (0: fitted), multi-line (1)], in points. */
export type BoxSize = [number, number, number, number];
/** Each official PDF's text boxes, by name: every distinct box a name has (a value must fit them all). */
export const BOX_GEOMETRY = geometry as unknown as Record<string, Record<string, BoxSize[]>>;
/** The smallest size a box's text may be drawn at and still be read on the printed form. */
export const MIN_FONT_SIZE = 6;
/** The smallest size for several lines of the person's own words (the reasons): a page of 6pt prose is not read; past this, the rest goes on attached pages. */
export const MIN_LINES_FONT_SIZE = 8;

const WIDTHS = widths as Record<string, number>;
/** pdf.js's own constants: line height is 1.35 times the font size; 2pt of room left and right, 1pt above and below. */
const LINE_FACTOR = 1.35;
const H_PAD = 2;
const V_PAD = 1;
/** Room kept spare at the right of each line, against rounding. */
const SPARE = 1;
/** The size pdf.js starts a fitted box of several lines from. */
const START_SIZE = 12;

/** The width of text at a font size, in points (a letter Helvetica lacks counts as the widest). */
export function textWidth(text: string, size: number): number {
  let units = 0;
  for (const char of text) units += WIDTHS[char] ?? 1000;
  return (units * size) / 1000;
}

const floor2 = (n: number) => Math.floor(n * 100) / 100;

/** The text broken into lines no wider than `width` at `size`: at spaces, and inside a word only when it is wider alone. */
export function wrapLines(text: string, size: number, width: number): string[] {
  const lines: string[] = [];
  const space = textWidth(" ", size);
  for (const paragraph of text.split(/\r\n?|\n/)) {
    let line = "";
    let lineWidth = 0;
    for (const word of paragraph.split(/ +/).filter(Boolean)) {
      const wordWidth = textWidth(word, size);
      const candidateWidth = line ? lineWidth + space + wordWidth : wordWidth;
      if (candidateWidth <= width) { line = line ? `${line} ${word}` : word; lineWidth = candidateWidth; continue; }
      if (line) lines.push(line);
      let rest = word;
      let restWidth = wordWidth;
      while (restWidth > width) {
        let cut = rest.length - 1;
        while (cut > 1 && textWidth(rest.slice(0, cut), size) > width) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
        restWidth = textWidth(rest, size);
      }
      line = rest;
      lineWidth = restWidth;
    }
    lines.push(line);
  }
  while (lines.length > 1 && !lines[lines.length - 1]) lines.pop();
  return lines;
}

export type Fit = { fits: true; value: string; fontSize: number } | { fits: false; fontSize: number };

/** One box: does the value fit, at what size, and the value to write (broken into lines for a box of several lines). */
export function fitBox(value: string, [width, height, fixed, multi]: BoxSize): Fit {
  const room = width - 2 * H_PAD - SPARE;
  const tall = height - 2 * V_PAD;
  const text = value.trim();
  if (!multi) {
    const single = text.replace(/\s*\r?\n\s*/g, " ");
    if (fixed) return textWidth(single, fixed) <= room ? { fits: true, value: single, fontSize: fixed } : { fits: false, fontSize: fixed };
    const size = floor2(Math.min(tall / LINE_FACTOR, room / Math.max(textWidth(single, 1), 0.001)));
    return size >= MIN_FONT_SIZE ? { fits: true, value: single, fontSize: size } : { fits: false, fontSize: size };
  }
  if (fixed) {
    const lines = wrapLines(text, fixed, room);
    // pdf.js lays out round(room / line height) lines (at least one), each an equal share of the box, from the top: a
    // 12pt box 14.4pt tall takes one line (Family Form 10's top boxes).
    const rows = Math.max(1, Math.round(tall / (fixed * LINE_FACTOR)));
    return lines.length <= rows ? { fits: true, value: lines.join("\n"), fontSize: fixed } : { fits: false, fontSize: fixed };
  }
  // Fitted, several lines: pdf.js draws max(its starting number of lines, the lines given) lines filling the box. Give it
  // exactly that many lines, each fitting at the size it will use, so it neither breaks a line nor runs out of room.
  const startLines = Math.max(1, Math.round(tall / (START_SIZE * LINE_FACTOR)));
  for (let count = startLines; ; count++) {
    const size = floor2(tall / count / LINE_FACTOR);
    if (size < MIN_LINES_FONT_SIZE) return { fits: false, fontSize: size };
    let lines = wrapLines(text, size, room);
    if (lines.length > count) continue;
    if (lines.length < count && count > startLines) {
      // Fewer lines would let pdf.js draw larger, and these lines would no longer fit: narrow them until there are `count`.
      let narrower = room;
      while (lines.length < count && narrower > room / 2) { narrower -= 2; lines = wrapLines(text, size, narrower); }
      if (lines.length !== count) continue;
    }
    return { fits: true, value: lines.join("\n"), fontSize: size };
  }
}

/** The value as it fits every box of this name on this PDF, or why not; a box with no saved size is left as given. */
export function fitValue(pdfFile: string, box: string, value: string): Fit | null {
  const sizes = BOX_GEOMETRY[pdfFile]?.[box];
  if (!sizes?.length) return null;
  let fitted: Fit = { fits: true, value, fontSize: 0 };
  for (const size of sizes) {
    const fit = fitBox(value, size);
    if (!fit.fits) return fit;
    // A name used twice prints one value in both: keep the line breaks of the box of several lines, if any.
    if (size[3] || fitted.value === value) fitted = fit;
  }
  return fitted;
}

/** The last cut (in order) that still fits, or 0: a longer piece never fits where a shorter one does not, so search by halves. */
function lastFitting(cuts: readonly number[], fits: (cut: number) => boolean): number {
  let low = 0, high = cuts.length - 1, best = 0;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (fits(cuts[mid])) { best = cuts[mid]; low = mid + 1; } else high = mid - 1;
  }
  return best;
}

/**
 * The person's words over a run of boxes (a first box, a continued box), each holding as many whole sentences as fit,
 * then the rest, for added pages. A sentence too long for a box alone is cut at a word. Every word is kept, in order.
 */
export function splitToBoxes(pdfFile: string, boxes: readonly string[], text: string): string[] {
  const pieces: string[] = [];
  let rest = text.trim();
  for (const box of boxes) {
    if (!rest) { pieces.push(""); continue; }
    const fits = (candidate: string) => fitValue(pdfFile, box, candidate)?.fits !== false;
    if (fits(rest)) { pieces.push(rest); rest = ""; continue; }
    // Sentence ends first; within the first sentence that does not fit, word ends.
    const ends = [...rest.matchAll(/[.!?]["')\]]?(?=\s)|\n/g)].map((match) => match.index! + match[0].length);
    let best = lastFitting(ends, (end) => fits(rest.slice(0, end)));
    if (!best) best = lastFitting([...rest.matchAll(/\s+/g)].map((match) => match.index!), (end) => fits(rest.slice(0, end)));
    pieces.push(rest.slice(0, best).trimEnd());
    rest = rest.slice(best).trimStart();
  }
  pieces.push(rest);
  return pieces;
}
