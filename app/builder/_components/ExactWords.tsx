"use client";

import { useId, useState } from "react";

/**
 * "Exact words": beside each sentence of a published answer, one click that
 * shows the official words the sentence was checked against and their
 * citation (site owner, 2026-10-29: every legal statement shown has a plain
 * sentence plus the exact words of the official source one click away, with
 * the citation).
 *
 * The words are the release's own checked quote, as stored with the
 * sentence's verdict (stageAnswerView.ts `exactWords`), never re-worded here.
 * The section or rule number beside each part was placed in the saved text at
 * build time (buildVerdictSources.ts); where it could not be placed, the
 * source is named without one. A sentence with no checked quote gets nothing.
 *
 * The panel is in the page from the start, hidden until the button is
 * pressed, so the words are there for a screen reader's "controls" link and
 * for test:exact-words, which reads the server-rendered markup.
 */

export type ExactWordsEntry = {
  sentence: string;
  quotes: { sourceId: string; name: string; url: string; checkedOn: string; parts: { text: string; pinpoint: string | null }[] }[];
};

export type TextSegment = { text: string; entry?: ExactWordsEntry };

/**
 * The text cut into plain runs and the sentences that have exact words.
 * `shownAs` gives the ways a published sentence can read on this screen (the
 * court's own words for a lawsuit, etc.); a sentence is matched only where it
 * stands whole (start of text or after a space, and ending the text or
 * followed by a space), longest first, never overlapping another.
 */
export function exactWordsSegments(text: string, entries: ReadonlyArray<ExactWordsEntry>, shownAs: (sentence: string) => string[] = (sentence) => [sentence]): TextSegment[] {
  const found: { start: number; end: number; entry: ExactWordsEntry }[] = [];
  for (const entry of entries) {
    for (const shown of new Set(shownAs(entry.sentence).filter(Boolean))) {
      for (let at = text.indexOf(shown); at !== -1; at = text.indexOf(shown, at + 1)) {
        const end = at + shown.length;
        if ((at === 0 || /\s/.test(text[at - 1])) && (end === text.length || /\s/.test(text[end]))) found.push({ start: at, end, entry });
      }
    }
  }
  found.sort((a, b) => a.start - b.start || b.end - a.end);
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const match of found) {
    if (match.start < cursor) continue;
    if (match.start > cursor) segments.push({ text: text.slice(cursor, match.start) });
    segments.push({ text: text.slice(match.start, match.end), entry: match.entry });
    cursor = match.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

/** The text, each sentence that has exact words followed by its control. Phrasing content only, so it sits inside a <p>. */
export function TextWithExactWords({ text, entries, shownAs }: { text: string; entries?: ReadonlyArray<ExactWordsEntry>; shownAs?: (sentence: string) => string[] }) {
  if (!entries || entries.length === 0) return <>{text}</>;
  return (
    <>
      {exactWordsSegments(text, entries, shownAs).map((segment, index) =>
        segment.entry ? (
          <span key={index} data-testid="exact-words-sentence">
            {segment.text}
            <ExactWordsControl entry={segment.entry} />
          </span>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

function ExactWordsControl({ entry }: { entry: ExactWordsEntry }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span data-testid="exact-words" className="whitespace-normal">
      {" "}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((was) => !was)}
        className="align-baseline text-xs font-semibold text-[#2f7d67] underline"
      >
        {open ? "Hide exact words" : "Exact words"}
      </button>
      {/* No display class while closed: a utility "block" would override the hidden attribute. */}
      <span
        id={id}
        hidden={!open}
        data-testid="exact-words-panel"
        className={open ? "my-1 block rounded-lg border border-[#d8e6df] bg-[#f8fcfa] px-3 py-2 text-xs leading-5 text-[#2b4640]" : undefined}
      >
        {entry.quotes.map((quote, quoteIndex) => (
          <span key={quoteIndex} data-testid="exact-words-source" data-source-id={quote.sourceId} className="block">
            {quote.parts.map((part, partIndex) => (
              <span key={partIndex} className="mt-1 block">
                <span data-testid="exact-words-quote" className="italic">
                  “{part.text}”
                </span>
                <span className="block">
                  <a href={quote.url} target="_blank" rel="noreferrer" className="underline">
                    {quote.name}
                  </a>
                  {part.pinpoint ? <span data-testid="exact-words-pinpoint">, {part.pinpoint}</span> : null}
                  {` · checked ${quote.checkedOn}`}
                </span>
              </span>
            ))}
          </span>
        ))}
      </span>
    </span>
  );
}
