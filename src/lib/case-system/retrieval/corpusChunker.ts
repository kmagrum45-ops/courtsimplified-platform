/**
 * Cuts the vendored corpus (docs/sources/corpus/) into passages that can be
 * retrieved by meaning and cited exactly.
 *
 * WHY (2026-10-05). The analysis could only cite what buildSourcePack handed
 * it: the catalogue entry for the claim type the user picked, and the stage
 * map's rules. A story that did not fit a catalogue entry -- or raised an issue
 * the entry does not cover -- reached the model with no law at all, while 206
 * retrieved and read sources sat unused on disk. Word search over them was
 * tried and rejected (site owner, 2026-10-05: "word searches dont work because
 * to many variables"): a person writes "my landlord kept my deposit", the
 * statute says "rent deposit", and no keyword joins the two. So the passages
 * are embedded and searched by meaning (corpusIndex.ts, storyRetrieval.ts).
 *
 * WHAT THIS FILE GUARANTEES, because the citation is only as good as the cut:
 *
 *   - A passage's text is the source's own words. Whitespace is collapsed (the
 *     quote gate collapses it too) and nothing else is changed.
 *   - Legislation is cut on its own section and subsection boundaries, so the
 *     pinpoint on a passage ("s. 46 (1)", "r. 9.01 (1)-(3)") is the provision
 *     the words come from.
 *   - Text that is NOT in force is left out. e-Laws prints a replacement that
 *     is still waiting for proclamation inline, straight after a
 *     "Note: On a day to be named ..." line (SOURCING_NOTES.md, "Family-source
 *     traps"). Quoting it would state law that does not apply yet. The note
 *     and the substituted text are dropped; where the end of the substituted
 *     text cannot be found, the rest of the section is dropped. Losing a
 *     passage costs recall; keeping a wrong one costs a user.
 *   - Page furniture (cookie notices, feedback forms, navigation) is dropped,
 *     so a search for a person's problem does not land on "Was this
 *     information helpful?".
 *
 * Pure: no file system, no network. The index builder and the runtime both
 * call it on the same files, and every indexed passage carries a hash of its
 * text, so a corpus file that changed after the index was built cannot be
 * served under a stale vector (corpusIndex.ts drops it).
 *
 * Asserted by `npm run test:corpus-retrieval`.
 */

import { createHash } from "node:crypto";

export type ChunkSource = {
  id: string;
  title: string;
  citation?: string;
  /** The URL the text was retrieved from (the manifest's). */
  url: string;
};

export type CorpusChunk = {
  /** `corpus:<sourceId>:<n>` -- stable while the source text is unchanged. */
  id: string;
  sourceId: string;
  /** "s. 46 (1)", "r. 9.01 (1)-(3)", or "" for a web page. */
  pinpoint: string;
  /** The heading the passage sits under, when the source gives one. */
  heading: string;
  /** Verbatim, whitespace collapsed. */
  text: string;
};

const MAX_CHARS = 1600;
const MIN_CHARS = 60;

export function chunkHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
}

export function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** e-Laws (.doc) or the federal Justice Laws site. */
export function isLegislation(source: ChunkSource): boolean {
  return /ontario\.ca\/laws\/docs\//.test(source.url) || /laws-lois\.justice\.gc\.ca/.test(source.url);
}

/** The page a person opens to read the source (not the .doc download). */
export function readableUrl(source: ChunkSource): string {
  const elaws = /ontario\.ca\/laws\/docs\/(?:elaws_statutes_)?([0-9a-z]+)_e\.doc$/i.exec(source.url);
  if (elaws) {
    const code = elaws[1].toLowerCase();
    if (/^\d{6}$/.test(code)) return `https://www.ontario.ca/laws/regulation/${code}`;
    const statute = /^(\d\d[a-z]\d\d)/.exec(code);
    if (statute) return `https://www.ontario.ca/laws/statute/${statute[1]}`;
  }
  return source.url.replace(/FullText\.html$/, "");
}

/** "r." for a body of court rules, "s." for everything else. */
function pinpointPrefix(source: ChunkSource): string {
  return /\brules\b/i.test(source.title) ? "r." : "s.";
}

// ------------------------------------------------------------ not in force

/**
 * Removes "Note: On <date or a day to be named> ..." blocks and any
 * replacement text printed after them. Works on lines; returns the lines kept.
 */
export function dropNotInForce(lines: string[]): string[] {
  const kept: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!/^\s*Note:\s+On\s/.test(line)) {
      kept.push(line);
      index += 1;
      continue;
    }
    // The note runs to the line carrying its "(See: ...)" reference.
    let end = index;
    while (end < lines.length - 1 && !/\(See:/.test(lines[end]) && end - index < 12) end += 1;
    // The reference itself can wrap onto the next line: run to its ")".
    const closed = () => {
      const tail = collapse(lines.slice(index, end + 1).join(" ")).split("(See:")[1] ?? "";
      return (tail.match(/\(/g) ?? []).length < (tail.match(/\)/g) ?? []).length;
    };
    while (end < lines.length - 1 && /\(See:/.test(lines.slice(index, end + 1).join(" ")) && !closed() && end - index < 14) end += 1;
    const note = collapse(lines.slice(index, end + 1).join(" "));
    index = end + 1;
    if (!/following (substituted|added)|adding the following|re-enacted/i.test(note)) continue;

    // Substituted or added text follows, with no marker where it ends. Two
    // ways to find the end: the amending act's own citation, which e-Laws
    // prints after a substituted subsection ("... 2025, c. 6, Sched. 6,
    // s. 1 (1)."), and the structure of what was substituted (one paragraph
    // ends where the next paragraph starts). The earlier of the two wins, so
    // a citation that recurs further down cannot take in-force text with it.
    const structural = structuralEnd(lines, index, note);
    const reference = /\(See:\s*(.*)\)\s*$/.exec(note)?.[1]?.trim() ?? "";
    let stop = structural;
    if (reference) {
      for (let scan = index; scan < structural; scan += 1) {
        if (collapse(lines.slice(index, scan + 1).join(" ")).includes(reference)) {
          stop = scan + 1;
          break;
        }
      }
    }
    index = stop;
  }
  return kept;
}

const PARAGRAPH_START = /^\s*\d+(?:\.\d+)?\.\s{2,}\S/;
const CLAUSE_START = /^\s*\([a-z]+(?:\.\d+)?\)\s/;

/** The first line after the substituted text, judged by what was substituted. */
function structuralEnd(lines: string[], from: number, note: string): number {
  let index = from;
  while (index < lines.length && !lines[index].trim()) index += 1;
  const first = index;
  const isNote = (line: string) => /^\s*Note:\s+On\s/.test(line);
  const blank = (line: string) => !line.trim();
  let stopAt: (line: string, position: number) => boolean;
  if (/\bparagraphs?\s+\d/i.test(note)) {
    stopAt = (line, position) => position > first && (PARAGRAPH_START.test(line) || SUBSECTION_LINE.test(line) || blank(line));
  } else if (/\bclauses?\s+/i.test(note)) {
    stopAt = (line, position) => position > first && (CLAUSE_START.test(line) || SUBSECTION_LINE.test(line) || blank(line));
  } else if (/\bsubsections?\s+\d/i.test(note)) {
    let seen = 0;
    stopAt = (line, position) => {
      if (SUBSECTION_LINE.test(line)) seen += 1;
      return position > first && (seen > 1 || blank(line));
    };
  } else if (/\b(sections?|rules?)\s+\d/i.test(note)) {
    stopAt = (line, position) =>
      position > first && ((SECTION_LINE.test(line) && !PARAGRAPH_START.test(line)) || /Amendments with date in force/.test(line));
  } else {
    stopAt = (line, position) => position > first && blank(line);
  }
  while (index < lines.length && !isNote(lines[index]) && !stopAt(lines[index], index)) index += 1;
  return index;
}

/** Lines that are amendment history, not text. */
const HISTORY_LINE =
  /^\s*(Section Amendments with date in force|Rule Amendments with date in force|(\d{4}, c\. |O\. Reg\. |R\.R\.O\. |S\.O\. |SOR\/|CTR ).{0,80} - (\d\d\/\d\d\/\d{4}|not in force|no amendments)\s*$)/i;

// ------------------------------------------------------------ legislation

/**
 * A line that may start a provision: "77 (1)  The ...", "1.03  (1)  The ...",
 * " 16   (1)  The court ...", and the older e-Laws style "3.  In any action".
 * That last style is indistinguishable from a numbered paragraph ("2.  The
 * date a divorce is granted"), so a candidate is only a CANDIDATE until its
 * amendment history confirms it (see confirmedByHistory).
 */
const SECTION_LINE = /^\s{0,8}(\d+(?:\.\d+)*)\.?\s{1,6}(?:\(\d+(?:\.\d+)?\)\s+)?(?=[A-Z"“])/;
/** Family Law Rules: "RULE 24: COSTS". */
const RULE_HEADING = /^\s*RULE\s+(\d+(?:\.\d+)?)\s*:/;
/** "(3)  ..." at the start of a line, optionally after the section number. */
// Text after the marker starts with a capital: a wrapped cross-reference
// ("    (1) (a); or", "20.10 (7).  O. Reg.") does not.
const SUBSECTION_LINE = /^\s{0,8}(?:\d+(?:\.\d+)*\.?\s{1,6})?\((\d+(?:\.\d+)?)\)\s+(?=[A-Z"“])/;
/** A provision that is gone: "79 Repealed: ...", "8.  Repealed: ...", "3.  Omitted (...". */
// Only a WHOLE provision that is gone. "20.04  (1)  Revoked: ..." is kept:
// subrule (1) is gone but (2), the summary judgment test, is not, and the
// line is what starts r. 20.04.
const GONE_LINE = /^\s{0,8}\d+(?:\.\d+)*\.?\s+(?:\(\d+\)(?:\s*(?:-|,)\s*\(\d+\))+\s+)?(Repealed|Revoked|Spent|Omitted)\b/;

/** Removes a gone provision's line and its wrapped continuation lines. */
function dropGone(lines: string[]): string[] {
  const kept: string[] = [];
  let skipping = false;
  for (const line of lines) {
    if (GONE_LINE.test(line)) {
      skipping = true;
      continue;
    }
    if (skipping && (!line.trim() || SECTION_LINE.test(line) || SUBSECTION_LINE.test(line) || isHeadingLine(line))) skipping = false;
    if (!skipping) kept.push(line);
  }
  return kept;
}
/**
 * An amendment-history citation and the provision it names:
 * "R.S.O. 1990, c. F.3, s. 45 (4)", "2002, c. 24, Sched. B, s. 4",
 * "O. Reg. 258/98, r. 1.03", "R.S., c. H-7, s. 2", "SOR/97-175, s. 2".
 */
const HISTORY_CITE =
  /(?:\bc\.\s*[A-Z]?[-.\dA-Z]*\d[A-Z]?|\bSched\.\s*[A-Z0-9.]+|\bReg\.\s*\d+(?:\/\d+)?|SOR\/\d+-\d+),\s*([sr])\.\s*(\d+(?:\.\d+)*)/;

/**
 * A provision number as something that sorts. Rule numbers need care: the
 * subrule is the two-digit part, so "24.1.01" (rule 24.1, subrule 1) comes
 * AFTER "24.05" (rule 24, subrule 5), while "1.03.1" (rule 1, subrule 3.1)
 * comes after "1.03". Plain section numbers ("16.91") sort part by part.
 */
function numberParts(value: string): number[] {
  const raw = value.split(".");
  const subrule = raw.findIndex((part, index) => index > 0 && part.length === 2);
  if (subrule < 1) return raw.map(Number);
  const rule = raw.slice(0, subrule).map(Number);
  // Pad the rule to a fixed depth so the subrule always compares in the same slot.
  while (rule.length < 3) rule.push(-1);
  return [...rule, ...raw.slice(subrule).map(Number)];
}

function greater(next: number[], previous: number[] | null): boolean {
  if (!previous) return true;
  for (let index = 0; index < Math.max(next.length, previous.length); index += 1) {
    const a = next[index] ?? -1;
    const b = previous[index] ?? -1;
    if (a !== b) return a > b;
  }
  return false;
}

type Unit = { number: string; heading: string; lines: string[] };

/** A short title-like line: the heading e-Laws prints above a provision. */
function isHeadingLine(line: string): boolean {
  const text = line.trim();
  return text.length > 0 && text.length < 80 && !/[.;:,]$/.test(text) && !/^\(/.test(text) && !SECTION_LINE.test(line);
}

/**
 * Whether a candidate line really starts a provision.
 *
 * Most styles cannot be confused with anything else: "46 (1)  On application"
 * or "1.03  (1)  The". The older e-Laws style "3.  In any action" can: a
 * numbered paragraph inside a section looks the same ("2.    The date a
 * divorce is granted"). Two signals separate them, both measured on the
 * vendored files (2026-10-05):
 *
 *   - Layout. A paragraph's text is aligned to a fixed column, so its number
 *     is followed by three or more spaces ("1.    ", "10.   "); a section's
 *     number is followed by two ("3.  In", "2.  (1)").
 *   - History. e-Laws ends each provision with its amendment history, and the
 *     first citation after an unamended section names that section
 *     ("R.S.O. 1990, c. N.1, s. 3"). It cannot name a paragraph's number
 *     unless by coincidence.
 *
 * A paragraph-shaped candidate is accepted only when the history confirms it.
 * (An amended section's history cites the amending act -- "2009, c. 11,
 * s. 35" after FLA s. 46 (1) -- so history alone cannot be required.)
 */
function judgeCandidate(
  lines: string[],
  start: number,
  number: string,
  federal: boolean,
  own: RegExp | null,
): { ok: boolean; confirmed: boolean; paragraphShaped?: boolean } {
  // A wrapped history reference: "... in accordance with rule\n8.09.1.  O. Reg.
  // 521/22, s. 4." is the end of r. 8.09, not the start of r. 8.09.1.
  if (/^\s*[\d.]+\.?\s+(O\. Reg\.|R\.S\.O\.|R\.R\.O\.|S\.O\.|R\.S\.,|SOR\/|\d{4}, c\.)/.test(lines[start])) {
    return { ok: false, confirmed: false };
  }
  if (federal) return { ok: true, confirmed: false }; // Justice Laws numbers paragraphs "(a)", never "2."
  const paragraphShaped = /^\s*\d+(?:\.\d+)*\.\s{3,}/.test(lines[start]);
  for (let index = start; index < Math.min(lines.length, start + 400); index += 1) {
    const joined = lines[index] + " " + (lines[index + 1] ?? "");
    const match = HISTORY_CITE.exec(joined);
    if (!match || joined.indexOf(match[0]) >= lines[index].length) continue;
    if (match[2] === number) return { ok: true, confirmed: true, paragraphShaped };
    // The first citation names another provision of THIS instrument: the
    // candidate is a wrapped cross-reference or a paragraph, not a section.
    if (own && own.test(match[0])) return { ok: false, confirmed: false };
    // It names an amending act, which says nothing about the number.
    return { ok: !paragraphShaped, confirmed: false };
  }
  return { ok: !paragraphShaped, confirmed: false };
}

/** The instrument's own chapter in a history citation: "c. F.3", "Reg. 258/98". */
function ownCitation(source: ChunkSource): RegExp | null {
  const token = /(c\.\s*[A-Z0-9.]+(?:,\s*Sched\.\s*[A-Z0-9]+)?|Reg\.\s*\d+(?:\/\d+)?)\s*$/.exec(source.citation ?? "")?.[1];
  if (!token) return null;
  const pattern = token.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&").replace(/\s+/g, "\\s*");
  return new RegExp(`(^|[^\\w])${pattern},`);
}

function splitSections(lines: string[], federal: boolean, own: RegExp | null): Unit[] {
  const familyRules = lines.some((line) => RULE_HEADING.test(line));
  const candidates: { index: number; number: string; parts: number[]; weight: number }[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*\|/.test(line)) continue; // the CONTENTS table
    const match = familyRules ? RULE_HEADING.exec(line) : SECTION_LINE.exec(line);
    if (!match) continue;
    const verdict = familyRules ? { ok: true, confirmed: true } : judgeCandidate(lines, index, match[1], federal, own);
    if (!verdict.ok) continue;
    candidates.push({ index, number: match[1], parts: numberParts(match[1]), weight: verdict.confirmed ? (verdict.paragraphShaped ? 2 : 3) : 1 });
  }

  // Sections run in order. The starts are the heaviest increasing run of
  // candidates, so one stray number (a wrapped "6 (1) ..." in a definition)
  // cannot block every section after it -- a greedy "must be greater than
  // the last one" pass lost Insurance Act ss. 100-109 behind such a stray.
  const best: number[] = candidates.map((candidate) => candidate.weight);
  const previousOf: number[] = candidates.map(() => -1);
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      if (!greater(candidates[i].parts, candidates[j].parts)) continue;
      // An unconfirmed number far ahead of the last section is a stray.
      if (candidates[i].weight < 2 && candidates[i].parts[0] - candidates[j].parts[0] > 40) continue;
      if (best[j] + candidates[i].weight > best[i]) {
        best[i] = best[j] + candidates[i].weight;
        previousOf[i] = j;
      }
    }
  }
  let tail = best.length ? best.indexOf(Math.max(...best)) : -1;
  const starts: { index: number; number: string }[] = [];
  while (tail >= 0) {
    starts.unshift({ index: candidates[tail].index, number: candidates[tail].number });
    tail = previousOf[tail];
  }

  return starts.map((start, position) => {
    const end = starts[position + 1]?.index ?? lines.length;
    let body = lines.slice(start.index, end);
    // A heading line just before the next section belongs to the next one.
    while (body.length > 1 && (isHeadingLine(body[body.length - 1]) || !body[body.length - 1].trim() || /^\s*Marginal note/i.test(body[body.length - 1]))) {
      body = body.slice(0, -1);
    }
    let heading = "";
    for (let back = start.index - 1; back >= Math.max(0, start.index - 3); back -= 1) {
      const candidate = lines[back];
      if (!candidate.trim()) continue;
      const marginal = /^\s*Marginal note:\s*(.*)$/i.exec(candidate);
      if (marginal) heading = collapse(marginal[1]);
      else if (isHeadingLine(candidate)) heading = collapse(candidate);
      break;
    }
    if (familyRules) heading = collapse(lines[start.index]).replace(RULE_HEADING, "").trim();
    return { number: start.number, heading, lines: body };
  });
}

function pinpointFor(prefix: string, number: string, subsections: string[]): string {
  if (subsections.length === 0) return `${prefix} ${number}`;
  const first = subsections[0];
  const last = subsections[subsections.length - 1];
  return first === last ? `${prefix} ${number} (${first})` : `${prefix} ${number} (${first})-(${last})`;
}

function chunkLegislation(source: ChunkSource, text: string): Omit<CorpusChunk, "id">[] {
  const prefix = pinpointPrefix(source);
  const lines = dropGone(dropNotInForce(text.split(/\r?\n/)).filter((line) => !HISTORY_LINE.test(line)));
  const out: Omit<CorpusChunk, "id">[] = [];

  for (const unit of splitSections(lines, /laws-lois\.justice\.gc\.ca/.test(source.url), ownCitation(source))) {
    const whole = collapse(unit.lines.join(" "));
    if (whole.length < MIN_CHARS) continue;

    // Pieces of at most MAX_CHARS, broken at subsection boundaries where the
    // provision has them, else at line boundaries.
    let piece: string[] = [];
    let subs: string[] = [];
    const flush = () => {
      const body = collapse(piece.join(" "));
      if (body.length >= MIN_CHARS) {
        out.push({ sourceId: source.id, pinpoint: pinpointFor(prefix, unit.number, subs), heading: unit.heading, text: body });
      }
      piece = [];
      subs = [];
    };
    for (const line of unit.lines) {
      const sub = SUBSECTION_LINE.exec(line)?.[1];
      const length = collapse(piece.join(" ")).length;
      if (sub && length > MAX_CHARS * 0.6) {
        // The heading printed above this subsection starts the next piece.
        const heading = piece.length > 1 && isHeadingLine(piece[piece.length - 1]) ? piece.pop()! : null;
        flush();
        if (heading) piece.push(heading);
      }
      else if (length + line.length > MAX_CHARS && piece.length) {
        // A long subsection continues in the next piece under the same pinpoint.
        const carry = subs.length ? [subs[subs.length - 1]] : [];
        flush();
        subs = carry;
      }
      if (sub && !subs.includes(sub)) subs.push(sub);
      piece.push(line);
    }
    flush();
  }
  return out;
}

// ------------------------------------------------------------ web pages

const FURNITURE = [
  /^skip to (main )?content/i,
  /needs javascript|enable javascript|go to your browser'?s settings|to have a better experience/i,
  /^log in to continue$|^please log in for full account access/i,
  /^print (this page|all( pages)?)$/i,
  /^(on this page|skip this page navigation|top|share|menu|search|français|english)$/i,
  /^(yes|no|submit)$/i,
  /strongly disagree|strongly agree|^neutral$|^disagree$|^agree$/i,
  /^was the information|^did the information|^will you recommend|^we welcome your feedback|by submitting this form/i,
  /^https?:\/\/\S+$/,
  /&#0?39;|cookie/i,
];

/** Where a page's own content ends and its footer begins. */
const PAGE_END = /^(was this information helpful\?|was this page helpful\?|rate this page|related links?)$/i;

function chunkWebPage(source: ChunkSource, text: string): Omit<CorpusChunk, "id">[] {
  const raw = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const lines: string[] = [];
  for (const line of raw.slice(1)) {
    if (PAGE_END.test(line)) break;
    if (FURNITURE.some((pattern) => pattern.test(line))) continue;
    lines.push(line);
  }
  const out: Omit<CorpusChunk, "id">[] = [];
  let piece: string[] = [];
  let heading = "";
  let pieceHeading = "";
  const flush = () => {
    const body = collapse(piece.join(" "));
    if (body.length >= MIN_CHARS) out.push({ sourceId: source.id, pinpoint: "", heading: pieceHeading, text: body });
    piece = [];
  };
  for (const line of lines) {
    const headingLike = line.length < 90 && !/[.;:,?!]$/.test(line);
    const length = collapse(piece.join(" ")).length;
    if ((headingLike && length > 500) || length + line.length > MAX_CHARS) flush();
    if (headingLike) heading = line;
    if (piece.length === 0) pieceHeading = headingLike ? line : heading;
    piece.push(line);
  }
  flush();
  return out;
}

// ------------------------------------------------------------ entry point

/** Sources that are tables or lists, not prose to retrieve. */
const NOT_PROSE = new Set(["small-claims-forms-table"]);

export function chunkSource(source: ChunkSource, text: string): CorpusChunk[] {
  if (NOT_PROSE.has(source.id)) return [];
  const pieces = isLegislation(source) ? chunkLegislation(source, text) : chunkWebPage(source, text);
  return pieces.map((piece, index) => ({ id: `corpus:${source.id}:${index}`, ...piece }));
}
