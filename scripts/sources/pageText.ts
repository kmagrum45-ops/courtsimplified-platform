/**
 * The text a reader sees on a saved HTML page: scripts, styles and comments removed, tags turned to line breaks,
 * character references decoded. Used by the source-saving scripts for the `.txt` copy beside each saved page, and by
 * the data files built from those pages (each value carries the `.txt` line it came from). Fetches nothing.
 *
 * Numeric references (&#x27; &#8217;) are decoded to the character itself, and `&amp;` last, so text is decoded once
 * (15 Nov 2026: the courthouse pages write apostrophes as &#x27;, which the first version left in place).
 */
const NAMED: Record<string, string> = { nbsp: " ", lt: "<", gt: ">", quot: "\"", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", ndash: "–", mdash: "—" };

export function pageText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/td|\/th)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => NAMED[name.toLowerCase()] ?? whole)
    .replace(/&amp;/g, "&")
    .split("\n").map((line) => line.replace(/[ \t ]+/g, " ").trim()).filter(Boolean).join("\n");
}
