/**
 * The in-depth guides quote their sources exactly, cite every paragraph, and
 * never read as advice.
 *
 * COSTS NOTHING. Reads the guides and the vendored corpus; no model call.
 *
 * WHAT FAILURE THIS CATCHES:
 *   - a phrase in curly quotes that is not word for word in one of the
 *     guide's listed sources (a misquote, or a quote from memory);
 *   - a paragraph that does not end with a bracketed citation;
 *   - a listed source whose file is missing, or with no official URL to send
 *     a reader to (it must be in docs/sources/corpus/manifest.json);
 *   - advice or grading words outside quotations ("you should", "best",
 *     "strong case"), or a paragraph over 90 words;
 *   - a guide with no section for a court it says it covers;
 *   - guide text missing from the content inventory (the output guard would
 *     blank it).
 * It cannot check that a paraphrase means what the source means: an edit to
 * a guide needs a read against the cited provision (see topicGuides.ts).
 *
 * Run: node --import tsx scripts/verification/verifyTopicGuides.ts
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { TOPIC_GUIDES } from "../../src/lib/content-library/guides/topicGuides";
import { checkUserContent } from "../../src/lib/content-library/outputGuard";

let failures = 0;
function check(name: string, ok: boolean, detail?: string): void {
  if (ok) console.log(`pass  ${name}`);
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const normalize = (text: string) =>
  text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

// "best interests" (of a child) is the statutes' own legal test, not advice.
const ADVICE = /\b(you should|you must|we recommend|recommend|advisable|best(?![- ]interests?)|strong case|weak case|chance of|likely to win|likely to lose)\b/i;

for (const guide of TOPIC_GUIDES) {
  const texts: string[] = [];
  for (const source of guide.sources) {
    const file = path.join(process.cwd(), source.localText);
    const present = existsSync(file);
    check(`${guide.id}: source file exists — ${source.localText}`, present);
    check(`${guide.id}: source has an official URL — ${source.sourceName}`, Boolean(source.officialUrl?.startsWith("https://")));
    if (present) texts.push(normalize(readFileSync(file, "utf8")));
  }

  let quoteProblems = 0;
  let paragraphProblems = 0;
  guide.sections.forEach((section) => {
    for (const paragraph of section.paragraphs) {
      for (const match of paragraph.matchAll(/“([^”]+)”/g)) {
        const wanted = normalize(match[1]);
        if (!texts.some((text) => text.includes(wanted))) {
          quoteProblems += 1;
          console.log(`      ${guide.id} "${section.heading}": not in a source — “${match[1].slice(0, 80)}”`);
        }
      }
      const outsideQuotes = paragraph.replace(/“[^”]*”/g, "");
      const words = paragraph.split(/\s+/).filter(Boolean).length;
      const problem = !/\([^()]*(?:\([^()]*\)[^()]*)*\)\.?\s*$/.test(paragraph.trim())
        ? "no closing citation"
        : ADVICE.test(outsideQuotes)
          ? `advice wording: ${outsideQuotes.match(ADVICE)![0]}`
          : words > 90
            ? `${words} words`
            : !checkUserContent(paragraph).allowed
              ? "not in the content inventory"
              : null;
      if (problem) {
        paragraphProblems += 1;
        console.log(`      ${guide.id} "${section.heading}": ${problem}`);
      }
    }
  });
  check(`${guide.id}: every quote is verbatim in a listed source`, quoteProblems === 0, `${quoteProblems} problem(s)`);
  check(`${guide.id}: every paragraph is cited, plain and in the inventory`, paragraphProblems === 0, `${paragraphProblems} problem(s)`);

  const covered = new Set(guide.sections.map((section) => section.court));
  const missing = guide.courts.filter((court) => court !== "all" && !covered.has(court) && !covered.has("all"));
  check(`${guide.id}: a section for every court it covers`, missing.length === 0, missing.join(", "));
  check(`${guide.id}: title and intro are approved content`, checkUserContent(guide.title).allowed && checkUserContent(guide.intro).allowed);
}

check("guide ids are unique", new Set(TOPIC_GUIDES.map((guide) => guide.id)).size === TOPIC_GUIDES.length);

console.log("");
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`);
process.exitCode = failures === 0 ? 0 : 1;
