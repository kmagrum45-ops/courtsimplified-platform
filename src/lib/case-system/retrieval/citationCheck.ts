/**
 * EVERY CITATION SAYS EXACTLY WHAT IT CITES (Charter re-test, 27 Oct, root cause 5).
 *
 * Three faults found by sampling, each now a rule here, used where a citation is made and run over
 * the whole library by test:citations:
 *   - the subsection cited must hold the words quoted: "Community Safety and Policing Act ...,
 *     s. 49 (1)-(2)" was cited for "can be sued in its own name", which only s. 49 (1) says. A
 *     passage is cut by the chunker as a range of subsections; a citation names only the
 *     subsections the quote is in (pinpointForQuote).
 *   - a statement may not add a reason the rule it cites does not give: "Ottawa is an appropriate
 *     location because the events occurred there" beside r. 13.1.01, which says no such thing
 *     (addsReason).
 *   - an Act is named by its own short title, year included: "Community Safety and Policing Act,
 *     2019", not "Community Safety and Policing Act" (shortTitleIn reads the title the Act gives
 *     itself, from the saved text).
 *
 * Pure. States no law.
 */

const SPACES = /\s+/g;
const QUOTE_MARKS = /[“”‘’"']/g;
const plain = (text: string) => text.replace(QUOTE_MARKS, "").replace(SPACES, " ").trim().toLowerCase();

const PINPOINT = /^(.*?\b(?:ss?|rr?|para)\.\s*[\w.]+)\s*\((\d+(?:\.\d+)?)\)(?:\s*-\s*\((\d+(?:\.\d+)?)\))?\s*$/;
const MARKER = /\((\d+(?:\.\d+)?)\)\s/g;
/**
 * A reference to a subsection, not its start: "subrule (2)", "subsections (1), (2) and (3)",
 * "13.1.02 (2)", "clause (a) or (b)". A subsection starts after a heading or the end of a sentence.
 */
const REFERENCE_BEFORE = /(?:\b(?:subrules?|subsections?|clauses?|paragraphs?)(?:\s+[\d.]+)?|\b(?:rules?|sections?)\s+[\d.]+|,|\band|\bor|\bto)\s*$/i;

/**
 * The subsections of a passage, where each starts: the markers "(1)", "(2)", ... in the cited range,
 * read in increasing order only, so a cross-reference inside the text ("under subsections (1), (2)
 * and (3)") is never taken for one.
 */
export function subsectionStarts(pinpoint: string, text: string): { label: string; at: number }[] {
  const range = PINPOINT.exec(pinpoint.trim());
  if (!range) return [];
  const from = Number(range[2]);
  const to = range[3] === undefined ? from : Number(range[3]);
  const starts: { label: string; at: number }[] = [];
  for (const match of text.matchAll(MARKER)) {
    if (REFERENCE_BEFORE.test(text.slice(Math.max(0, (match.index ?? 0) - 24), match.index))) continue;
    const value = Number(match[1]);
    if (value < from || value > to) continue;
    if (starts.length && value <= Number(starts[starts.length - 1].label)) continue;
    starts.push({ label: match[1], at: match.index ?? 0 });
  }
  // A passage cut partway through a subsection starts with the rest of the first one in its range
  // ("r. 13 (3.1)-(3.2)" opening on paragraph 3. of (3.1), its marker in the passage before).
  if (starts.length && Number(starts[0].label) > from && text.slice(0, starts[0].at).trim()) starts.unshift({ label: range[2], at: 0 });
  return starts;
}

/**
 * The pinpoint naming only the subsections the quoted words are in ("s. 49 (1)-(2)" for words in
 * (1) only is "s. 49 (1)"). Unchanged when the passage has no subsections, the quote is not found,
 * or the quote spans the whole range.
 */
export function pinpointForQuote(pinpoint: string, text: string, quote: string): string {
  const range = PINPOINT.exec(pinpoint.trim());
  const starts = subsectionStarts(pinpoint, text);
  if (!range || starts.length < 2) return pinpoint;
  // Find the quote in the passage, by a map from the plain text back to the passage.
  const map: number[] = [];
  let flat = "";
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (QUOTE_MARKS.test(char)) { QUOTE_MARKS.lastIndex = 0; continue; }
    QUOTE_MARKS.lastIndex = 0;
    if (/\s/.test(char)) { if (flat.endsWith(" ")) continue; flat += " "; map.push(index); continue; }
    flat += char.toLowerCase();
    map.push(index);
  }
  const wanted = plain(quote);
  const found = wanted ? flat.indexOf(wanted) : -1;
  if (found < 0) return pinpoint;
  const begin = map[found];
  const end = map[found + wanted.length - 1];
  const within = starts.filter((start, index) => {
    const next = starts[index + 1]?.at ?? Infinity;
    return start.at <= end && next > begin;
  });
  if (!within.length || within.length === starts.length) return pinpoint;
  const first = within[0].label;
  const last = within[within.length - 1].label;
  return `${range[1]} (${first})${last !== first ? `-(${last})` : ""}`;
}

/** A citation string ("Act, S.O. 2019, c. 1, Sched. 1, s. 49 (1)-(2)") with its pinpoint narrowed to the quote. */
export function citationForQuote(citation: string, pinpoint: string, text: string, quote: string): string {
  const narrowed = pinpointForQuote(pinpoint, text, quote);
  return narrowed !== pinpoint && citation.endsWith(pinpoint) ? citation.slice(0, citation.length - pinpoint.length) + narrowed : citation;
}

const STOP = new Set(["the", "a", "an", "of", "to", "in", "on", "at", "and", "or", "is", "are", "was", "were", "be", "it", "its", "that", "this", "there", "their", "they", "them", "for", "by", "with", "as", "from", "your", "you", "has", "have", "had", "which", "who", "where", "when"]);
const words = (text: string) => plain(text).replace(/[^a-z0-9 ]/g, " ").split(" ").filter((word) => word.length > 2 && !STOP.has(word));

/**
 * The reason a statement gives that none of its quotes gives: the words after "because" (or "since",
 * "as a result of", "so that", "which means"), when fewer than half of them are in any quote beside
 * it. Null when the statement gives no reason, or its quotes give it.
 */
export function addsReason(statement: string, quotes: string[]): string | null {
  const clause = /\b(?:because|since|as a result of|so that|which means)\b(.+)$/i.exec(statement)?.[1];
  if (!clause) return null;
  const said = words(clause);
  if (!said.length) return null;
  const quoted = new Set(quotes.flatMap(words));
  const found = said.filter((word) => quoted.has(word)).length;
  return found * 2 >= said.length ? null : clause.trim();
}

/**
 * The name an Act gives itself, from the saved text's own heading: the line above its chapter
 * ("Community Safety and Policing Act, 2019" above "S.O. 2019, chapter 1"). e-Laws' consolidated
 * text omits the short-title section itself ("Omitted (enacts short title of this Act)"), so the
 * heading is where the Act's name, year included, is printed. Null when the text has no such heading.
 */
export function shortTitleIn(text: string): string | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 12);
  // Statutes only: a regulation's heading names its parent Act ("Courts of Justice Act" above "R.R.O. 1990, Regulation 194").
  const chapter = lines.findIndex((line) => /^(?:R\.S\.O\.|S\.O\.)\s/i.test(line));
  const title = chapter > 0 ? lines[chapter - 1] : null;
  return title && !/^fran/i.test(title) ? title.replace(SPACES, " ") : null;
}
