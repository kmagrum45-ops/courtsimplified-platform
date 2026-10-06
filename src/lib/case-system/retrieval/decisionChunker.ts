/**
 * Cuts a court judgment into passages that can be retrieved and quoted as
 * what the court decided -- and leaves out the parts that are not.
 *
 * WHY (2026-10-05). Without case law, retrieval answered "I was fired after
 * eleven years with two weeks' pay" with the Employment Standards Act
 * minimums alone. The common-law entitlement to reasonable notice, which is
 * what such a person most needs to know about, comes from the courts. 34
 * judgments were already retrieved and read under docs/sources/; this makes
 * them searchable.
 *
 * A judgment is not all law. Quoting the wrong part would put words in a
 * court's mouth, so only the reasons of the majority are kept, and inside
 * them, not the narrative sections:
 *
 *   - The headnote and catchwords come before paragraph 1 / the first
 *     "delivered by" line. They are the reporter's summary, not the court's
 *     words. Dropped.
 *   - Reasons are split at each "The judgment of ... was delivered by" /
 *     "The reasons of ... were delivered by" / "The following are the reasons
 *     delivered by" heading. Only the set signed by the most judges is kept
 *     ("The judgment of the Court" counts as all). Dissents and separate
 *     concurrences are dropped: a concurrence's reasoning is not the Court's.
 *   - Inside the majority, top-level sections about the facts, the courts
 *     below and the parties' positions are dropped. A lower court's view the
 *     Supreme Court reversed (Machtinger: the Court of Appeal "held that ...
 *     limited to the benefits conferred by the Act") must never be quoted as
 *     the law.
 *
 * Passages are paragraph groups with their pinpoint ("paras. 28-29") where
 * the judgment numbers its paragraphs, and the section heading where it does
 * not (judgments from before numbered paragraphs, read from the Court's HTML).
 *
 * Pure. Asserted by `npm run test:corpus-retrieval`.
 */

import { collapse, type ChunkSource, type CorpusChunk } from "./corpusChunker";

const MAX_CHARS = 1600;
const MIN_CHARS = 80;

/** Running heads and page furniture left by the PDF extraction. */
const FURNITURE = [
  /^\s*\[\d{4}\]\s+\d\s+(S\.C\.R\.|R\.C\.S\.)\s*$/,
  /^\s*\d{1,4}\s*$/, // page numbers (paragraph numbers are handled first)
  /^\s*(<|-?\d+(\.\d+)?pt|line-height|style=|text-indent|margin-)/,
  /^\s*Page:\s*\d+\s*$/, // Court of Appeal page header
];

const REASONS_HEADING = /(was|were|are the reasons) delivered by\s*$/;

/** Sections of a judgment that are not its reasoning. */
const NARRATIVE_SECTION =
  /^(?:[IVX]+\.?\s+)?(facts?|the facts|background|judgments? below|decisions? below|the decisions? below|judicial history|history of (the )?proceedings|proceedings below|courts? below|prior proceedings|positions? of the parties|the parties'? positions|arguments?|submissions|the (trial|motion|application|appeal) (decision|judgment)|the (trial|motion|application) judge['’]?s? (decision|reasons|findings))\b/i;
/** "II. Judgments Below", "2. Decisions Below" (not "2.1 Ontario Superior Court ...", which is inside one). */
// ...and the Court of Appeal's capitals at the margin: "BACKGROUND", "THE TRIAL DECISION".
const TOP_HEADING = /^\s*(?:[IVX]+\.\s+\S.{0,90}|\d{1,2}\.\s+[A-Z][^.;:,]{0,80})$|^[A-Z][A-Z’' ]{3,60}$/;

function judgesIn(heading: string): number {
  if (/judgment of the court/i.test(heading)) return 99;
  if (/the following are the reasons/i.test(heading)) return 1;
  const names = heading
    .replace(/^.*?\b(judgment|reasons) of\s+/i, "")
    .replace(/\s+(was|were) delivered by\s*$/i, "")
    .split(/,|\band\b/)
    .map((part) => part.trim())
    .filter(Boolean);
  return names.length || 1;
}

type Paragraph = { number: number | null; lines: string[]; heading: string };

export function chunkDecision(source: ChunkSource, text: string): CorpusChunk[] {
  const lines = text.split(/\r?\n/);

  // 1. The reasons blocks, and which one is the majority's.
  const headings: { index: number; judges: number }[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!REASONS_HEADING.test(lines[index])) continue;
    const heading = collapse(lines.slice(Math.max(0, index - 3), index + 1).join(" "));
    // The LAST opening in the window: the lines above a heading can end a
    // paragraph that says "the judgment of the Court of Appeal", which read as
    // "The judgment of the Court" (99 judges) and made a one-judge concurrence
    // outrank a seven-judge majority (WIC Radio, Moge, 2026-10-05).
    const openings = [...heading.matchAll(/The (judgment|reasons) of|The following are the reasons/gi)];
    const start = openings.length ? openings[openings.length - 1].index ?? -1 : -1;
    headings.push({ index, judges: judgesIn(start >= 0 ? heading.slice(start) : heading) });
  }
  // The lower court's "judgment ... was delivered by" quoted inside the
  // reasons is not a heading of this judgment: a real heading is followed
  // by the author's line ("Iacobucci J. -- ...", "MCINTYRE J.—").
  const real = headings.filter(({ index }) => {
    const next = lines
      .slice(index + 1, index + 6)
      .filter((line) => line.trim())
      .slice(0, 2)
      .join(" ");
    return (
      /^\s*\[\d+\](\s|$)/.test(next) ||
      /^\s*\d{1,3}\s/.test(next) ||
      // Any letters: "L'Heureux‑Dubé J. ‑‑" has an accent and a non-breaking
      // hyphen, and was not recognised, so Moge's majority lost to a
      // two-judge concurrence (2026-10-05).
      /^\s*(?:<[^>]*>\s*)?(?:[A-Z][\p{L}'’.\-‑ ]{0,40}?(?:C\.J\.|J\.|JJ\.)|The Chief Justice)[^—\n]{0,60}(?:—|--|‑‑)/iu.test(next)
    );
  });
  // A block whose first paragraph names its author "(dissenting)" is a
  // dissent whatever its heading says.
  const opensAsDissent = (index: number) =>
    /\((dissenting|dissident)/.test(lines.slice(index + 1, index + 6).join(" ").slice(0, 200));
  // The majority's own heading can be lost to the extraction (it sits in the
  // French column on some pages). If paragraph [1] comes before the first
  // heading found, the reasons starting there are a block of their own,
  // and being first, the majority's.
  const firstParagraph = lines.findIndex((line) => /^\s*\[1\](\s|$)/.test(line));
  if (real.length > 0 && firstParagraph >= 0 && firstParagraph < real[0].index) {
    real.unshift({ index: firstParagraph - 1, judges: 50 });
  }
  const candidates = real.filter(({ index }) => !opensAsDissent(index));
  let body: string[];
  if (candidates.length > 0) {
    const best = candidates.reduce((top, candidate) => (candidate.judges > top.judges ? candidate : top), candidates[0]);
    const end = real.find((heading) => heading.index > best.index)?.index ?? lines.length;
    body = lines.slice(best.index + 1, end);
  } else if (real.length > 0) {
    return [];
  } else {
    // The Court of Appeal prints no "delivered by" heading: the reasons run
    // from paragraph [1]. A dissent, where there is one, starts at a line
    // naming its author "(dissenting)"; it and everything after are dropped.
    const first = lines.findIndex((line) => /^\s*\[1\](\s|$)/.test(line));
    if (first < 0) return [];
    body = lines.slice(first);
    const dissent = body.findIndex((line) => /\(dissenting\b|^\s*DISSENTING REASONS|^\s*Dissenting reasons/i.test(line));
    if (dissent >= 0) body = body.slice(0, dissent);
    const released = body.findIndex((line) => /^\s*Released:/i.test(line));
    if (released >= 0) body = body.slice(0, released);
  }
  // Stop before the solicitors' list that closes a judgment.
  const solicitors = body.findIndex((line) => /^\s*Solicitors? for the/i.test(line));
  if (solicitors >= 0) body = body.slice(0, solicitors);

  // 2. Paragraphs: "[28] ..." or a bare "28" line, numbered in sequence; or,
  //    with no numbers at all, one per line of the HTML text.
  const numberedAtFirst = body.some((line) => /^\s*\[\d+\](\s|$)/.test(line)) || body.some((line) => /^\s*1\s*$/.test(line));
  const paragraphs = readParagraphs(body, numberedAtFirst);
  // Numbers the extraction lost entirely (a derived text with page numbers
  // but no paragraph numbers) leave almost nothing: read it unnumbered.
  if (numberedAtFirst && paragraphs.length < 5) paragraphs.splice(0, paragraphs.length, ...readParagraphs(body, false));

  // A dissent whose heading the extraction mangled still names itself in
  // its first line: "[81] LeBel J. (dissenting in part on the appeal) --".
  const dissentAt = paragraphs.findIndex((paragraph) =>
    /^\s*(\[\d+\]|\d+)?\s*[A-Z][\p{L}'’.\-‑ ]{0,60}?(C\.J\.|J\.|JJ\.)[^—]{0,10}\((dissenting|dissident)/u.test(paragraph.lines.slice(0, 2).join(" ")),
  );
  if (dissentAt >= 0) paragraphs.length = dissentAt;

  // 3. Passages of whole paragraphs, never across a section boundary.
  const out: CorpusChunk[] = [];
  let group: Paragraph[] = [];
  const flush = () => {
    const kept = group.filter((paragraph) => paragraph.heading !== "__skip__");
    group = [];
    if (kept.length === 0) return;
    const text = collapse(kept.map((paragraph) => paragraph.lines.join(" ")).join(" "));
    if (text.length < MIN_CHARS) return;
    const numbers = kept.map((paragraph) => paragraph.number).filter((value): value is number => value !== null);
    const pinpoint = numbers.length
      ? numbers.length === 1
        ? `para. ${numbers[0]}`
        : `paras. ${numbers[0]}-${numbers[numbers.length - 1]}`
      : "";
    out.push({ id: `corpus:${source.id}:${out.length}`, sourceId: source.id, pinpoint, heading: kept[0].heading, text });
  };
  // A paragraph longer than a passage is split at line boundaries, each piece
  // keeping the paragraph's number.
  const sized: Paragraph[] = [];
  for (const paragraph of paragraphs) {
    let piece: string[] = [];
    for (const line of paragraph.lines) {
      if (piece.length && collapse([...piece, line].join(" ")).length > MAX_CHARS) {
        sized.push({ ...paragraph, lines: piece });
        piece = [];
      }
      piece.push(line);
    }
    sized.push({ ...paragraph, lines: piece });
  }
  for (const paragraph of sized) {
    const length = collapse(group.map((item) => item.lines.join(" ")).join(" ")).length;
    const size = collapse(paragraph.lines.join(" ")).length;
    if (group.length && (paragraph.heading !== group[group.length - 1].heading || length + size > MAX_CHARS)) flush();
    group.push(paragraph);
  }
  flush();
  return out;
}

function readParagraphs(body: string[], numbered: boolean): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let expected = 1;
  let heading = "";
  let skipping = false;
  for (const raw of body) {
    const line = raw.replace(/<[^>]*>/g, "").replace(/^[^"]*">/, "");
    if (TOP_HEADING.test(line)) {
      heading = collapse(line);
      skipping = NARRATIVE_SECTION.test(heading.replace(/^\d{1,2}\.\s*/, ""));
      continue;
    }
    if (!numbered && line.trim() && line.trim().length < 90 && !/[.:;,]$/.test(line.trim()) && /^\s*([A-H]|\d{1,2})\.\s/.test(line)) {
      // A heading of an unnumbered judgment: "1. Facts" opens a section,
      // "A. Supreme Court of Ontario" is inside one.
      if (/^\s*\d{1,2}\.\s/.test(line)) {
        heading = collapse(line);
        skipping = NARRATIVE_SECTION.test(heading.replace(/^\d{1,2}\.\s*/, ""));
      }
      continue;
    }
    const bracket = /^\s*\[(\d+)\](?:\s+(.*))?$/.exec(line);
    const bare = /^\s*(\d+)\s*$/.exec(line);
    // A "[n]" marker may follow a number the extraction lost: accept a small
    // jump forward, or one lost number would fold the rest of the judgment
    // into a single paragraph. A bare number may skip at most four (page
    // numbers run in the hundreds, far from the next paragraph).
    const bracketNumber = bracket ? Number(bracket[1]) : NaN;
    const accept =
      numbered &&
      ((bracket && bracketNumber >= expected && bracketNumber <= expected + 3) ||
        (bare && Number(bare[1]) >= expected && Number(bare[1]) <= expected + 4));
    if (accept) expected = bracket ? bracketNumber : Number(bare![1]);
    if (accept) {
      // The "[28]" stays in the text: it is the judgment's own marker, and it
      // lets a reader see where the paragraph starts in what is quoted.
      paragraphs.push({ number: expected, lines: bracket ? [line] : [`${expected}`], heading: skipping ? "__skip__" : heading });
      expected += 1;
      continue;
    }
    if (FURNITURE.some((pattern) => pattern.test(line))) continue;
    if (!line.trim()) continue;
    if (!numbered) {
      paragraphs.push({ number: null, lines: [line], heading: skipping ? "__skip__" : heading });
      continue;
    }
    if (paragraphs.length) paragraphs[paragraphs.length - 1].lines.push(line);
  }

  return paragraphs;
}
