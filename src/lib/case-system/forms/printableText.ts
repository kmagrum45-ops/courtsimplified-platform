/**
 * Which characters the downloaded forms can print, and what the person is told when some cannot be (site owner,
 * 15 Nov 2026: French must print; "for characters no font here covers (for example Chinese), keep refusing with the
 * clear message; the message must say which characters and never blame the person").
 *
 * - The attached pages are drawn by pdf-lib in its standard Helvetica, which writes WinAnsiEncoding (Windows-1252):
 *   the characters in helveticaWidths.json, which covers French (accents, œ, æ, « », curly quotes, dashes, €).
 * - The official forms' boxes use the form's own Helvetica (PDFDocEncoding) or Arial (WinAnsiEncoding); together those
 *   cover the same characters plus a few more (Ł, ł, ı, ﬁ, ﬂ, ⁄, −).
 *
 * Nothing is dropped or swapped for a different letter. Only what prints identically is mapped: every kind of space
 * (no-break, narrow no-break, thin, a tab) prints as a space, and the no-break hyphen as a hyphen (Helvetica has one
 * hyphen mark for both). Anything else outside the set stops the download, naming the characters. States no law.
 */
import widths from "./helveticaWidths.json";

const WIN_ANSI = new Set(Object.keys(widths));
/** PDFDocEncoding's characters beyond WinAnsi (the court forms' own Helvetica /Differences, 128-160). */
const PDF_DOC_EXTRA = new Set([..."Łłıﬁﬂ⁄−"]);

/** The person's text as it is printed: the same characters, with spaces and the no-break hyphen as the font draws them. */
export function forPrinting(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(/[^\S\n]/g, (space) => (WIN_ANSI.has(space) ? space : " ")).replace(/‑/g, "-");
}

/** The characters (each once, in order) that cannot be printed: on the attached pages, or in the form's boxes. */
export function unprintableCharacters(texts: readonly string[], where: "pages" | "boxes"): string[] {
  const out: string[] = [];
  for (const char of forPrinting(texts.join("\n"))) {
    if (char === "\n" || WIN_ANSI.has(char) || (where === "boxes" && PDF_DOC_EXTRA.has(char))) continue;
    if (!out.includes(char)) out.push(char);
  }
  return out;
}

/**
 * These values as they are printed (every string through forPrinting; anything else as it is), or UnprintableText when
 * some string has a character that cannot be printed `where`. The one gate every form download passes its values
 * through (officialPdf.ts filledFormPdf, app/api/generate-form; verifyPrintableEverywhere.ts holds any new place to it).
 */
export function printableValues<T extends object>(values: T, where: "pages" | "boxes"): T {
  const printed = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === "string" ? forPrinting(value) : value])) as T;
  const unprintable = unprintableCharacters(Object.values(printed).filter((value): value is string => typeof value === "string"), where);
  if (unprintable.length) throw new UnprintableText(unprintable);
  return printed;
}

/** The download cannot be made: these characters cannot be printed. Never logged with its characters (the route logs the name). */
export class UnprintableText extends Error {
  constructor(readonly characters: string[]) {
    super(`cannot print: ${characters.map((char) => `${char} U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`).join(", ")}`);
    this.name = "UnprintableText";
  }
}

/**
 * What the person is told when the exhibit book is refused for these characters (app/api/workspace/exhibit-book).
 * Decided by the product owner, 16 Nov 2026: a plain product message, not legal wording.
 */
export function exhibitBookUnprintableMessage(characters: readonly string[]): string {
  return `The exhibit book could not be made, because the site cannot yet print these characters in a PDF: ${characters.join(" ")}. This is a limit of the site, not a problem with what you wrote. For now, you can use a version of the name or title without them.`;
}

/** What the person is told when the download is refused for these characters (shown by the download route). */
export function unprintableMessage(characters: readonly string[]): string {
  return `The form could not be made, because the site cannot yet print these characters in a PDF: ${characters.join(" ")}. This is a limit of the site. You could write them by hand on the printed form.`;
}
