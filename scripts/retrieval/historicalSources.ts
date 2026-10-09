/**
 * Law as it read on a past date: the shelf for "what was the law when this
 * happened?" (owner, 2026-10-09: a matter from 2007, where the law then is not
 * the law now).
 *
 * *** WHY A SEPARATE SHELF ***
 *
 * The corpus (docs/sources/corpus/) refuses historical versions on purpose:
 * test:rules-corpus fails on a "HISTORICAL VERSION FOR THE PERIOD" header,
 * because a frozen version cited as current law once hid a 60-day notice rule
 * from every slip-and-fall claim (SOURCING_NOTES.md). So past versions live
 * here instead, under docs/sources/historical/, and every one carries the
 * period it was in force IN ITS TITLE. The title is what every citation the
 * site shows is built from, so the period travels with each quote: nobody
 * reads one of these as today's law.
 *
 * And a checked answer may use one only in a statement that itself says it is
 * about the past (checkedAnswer.ts, historicalStatementOk).
 *
 * Each is recorded in docs/sources/README.md ("Law as it read on a past date").
 */

import type { IndexedSource } from "../../src/lib/case-system/retrieval/corpusIndex";
import { HISTORICAL_ID_PREFIX } from "../../src/lib/case-system/retrieval/historicalLaw";

export { HISTORICAL_ID_PREFIX, isHistoricalId } from "../../src/lib/case-system/retrieval/historicalLaw";

const paca = (from: string, period: string, file: string, ev: string): IndexedSource => ({
  id: `${HISTORICAL_ID_PREFIX}proceedings-against-the-crown-act-${from}`,
  title: `Proceedings Against the Crown Act (as it read ${period})`,
  citation: "R.S.O. 1990, c. P.27",
  url: `https://www.ontario.ca/laws/docs/elaws_statutes_90p27_${ev}.doc`,
  readableUrl: "https://www.ontario.ca/laws/statute/90p27",
  tier: "legislation",
  file,
  path: `historical/${file}`,
});

export const HISTORICAL_SOURCES: IndexedSource[] = [
  paca("2004-11-04", "November 4, 2004 to October 18, 2006", "proceedings-against-the-crown-act-from-2004-11-04.txt", "ev002"),
  paca("2006-10-19", "October 19, 2006 to May 16, 2007", "proceedings-against-the-crown-act-from-2006-10-19.txt", "ev003"),
  paca("2007-05-17", "May 17, 2007 to July 24, 2007", "proceedings-against-the-crown-act-from-2007-05-17.txt", "ev004"),
  paca("2007-07-25", "July 25, 2007 to November 26, 2008", "proceedings-against-the-crown-act-from-2007-07-25.txt", "ev005"),
  {
    id: `${HISTORICAL_ID_PREFIX}criminal-code-part-xvi-2007`,
    title: "Criminal Code, Part XVI (as it read December 14, 2006 to December 31, 2007)",
    citation: "R.S.C. 1985, c. C-46",
    url: "https://laws-lois.justice.gc.ca/eng/acts/C-46/20070701/P1TT3xt3.html",
    readableUrl: "https://laws-lois.justice.gc.ca/eng/acts/C-46/20070701/P1TT3xt3.html",
    tier: "legislation",
    file: "criminal-code-part-xvi-2006-12-14-to-2007-12-31.txt",
    path: "historical/criminal-code-part-xvi-2006-12-14-to-2007-12-31.txt",
  },
];
