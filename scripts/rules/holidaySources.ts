/**
 * HOLIDAY SOURCES — because a deadline engine that cannot say when Victoria
 * Day is cannot say when a deadline falls.
 *
 * *** WHY THIS IS NOT AS SIMPLE AS IT SOUNDS ***
 *
 * r. 3.01 says a period ending on a holiday runs to the next non-holiday day,
 * and r. 1.02 lists which days are holidays — BY NAME. It says "Victoria Day",
 * "Family Day", "Thanksgiving Day". It does not say which dates those are. The
 * Legislation Act s. 88 (2) does the same thing for statutory periods.
 *
 * So the rule that decides whether a 10-day notice expires on the 17th or the
 * 18th depends on a fact neither instrument states. Somebody has to say when
 * Victoria Day is, and if that somebody is a language model working from
 * memory, every date this product produces rests on recall.
 *
 * *** WHAT IS ACTUALLY SOURCEABLE, AND WHAT IS NOT ***
 *
 * These two statutes between them fix the dates of six of the named holidays:
 *
 *   Holidays Act (Canada)     Canada Day, Remembrance Day, Victoria Day
 *   Employment Standards Act  Family Day, December 26
 *
 * plus the fixed-calendar ones nobody disputes (New Year's Day, Christmas
 * Day), and the substitution rules, which r. 1.02 and s. 88 state themselves.
 *
 * FIVE ARE NOT SOURCEABLE FROM ANY STATUTE TEXT WE COULD FIND:
 *
 *   Good Friday, Easter Monday   movable, by ecclesiastical computation
 *   Labour Day, Thanksgiving Day settled by proclamation and long practice
 *   Civic Holiday                not a statutory holiday at all in Ontario;
 *                                declared municipally, and r. 1.02 names it
 *                                while the Legislation Act does not
 *
 * Ontario's Employment Standards Act omits Easter Monday, the first Monday in
 * August and Remembrance Day from its nine public holidays. The Retail
 * Business Holidays Act names Good Friday, Labour Day and Thanksgiving Day but
 * likewise gives no date for any of them.
 *
 * *** WHAT THE ENGINE DOES ABOUT IT ***
 *
 * It does not pretend. Each holiday carries how its date was established, and
 * where that is settled practice rather than a text we can quote, a deadline
 * whose answer TURNS ON that holiday comes back marked for confirmation with
 * the court rather than stated as fact. See deadlineEngine.ts.
 *
 * That is the design principle applied literally: reason privately, answer
 * only from verified content, and let "we are not certain" be a real outcome.
 */

import type { CorpusSource } from "./corpusSources";

export const HOLIDAY_SOURCES: CorpusSource[] = [
  {
    id: "holidays-act-canada",
    title: "Holidays Act (Canada)",
    citation: "R.S.C. 1985, c. H-5",
    url: "https://laws-lois.justice.gc.ca/eng/acts/H-5/FullText.html",
    format: "html",
    tier: "legislation",
    mustContain: [
      // s. 4 — the only text anywhere that fixes Victoria Day.
      "The first Monday immediately preceding May 25",
      // s. 2 (2) — matches Legislation Act s. 88 (4), which defers to this Act.
      "When July 1 is a Sunday",
      // s. 3 — Remembrance Day, which r. 1.02 lists and the ESA does not.
      "November 11",
    ],
    // A four-section Act: the whole text is about 1,250 characters, which is
    // BELOW the default "probably an error page" floor. The floor exists to
    // catch a 404 body, so it is set just under the real length rather than at
    // a round number that happens to pass today. The three mustContain markers
    // are what actually prove the content arrived.
    minCharacters: 1_000,
    why:
      "Fixes the dates of Victoria Day, Canada Day and Remembrance Day, which " +
      "r. 1.02 and Legislation Act s. 88 (2) name without dating. Without it the " +
      "deadline engine cannot say whether a period ending in late May expires on " +
      "the Monday or the Tuesday.",
  },
  {
    id: "esa-2000-ontario",
    title: "Employment Standards Act, 2000",
    citation: "S.O. 2000, c. 41",
    url: "https://www.ontario.ca/laws/docs/00e41_e.doc",
    format: "elaws-doc",
    tier: "legislation",
    mustContain: [
      "Employment Standards Act, 2000",
      "CONSOLIDATION PERIOD",
      // s. 1 (1) — the only Ontario statutory text that dates Family Day.
      "Family Day, being the third Monday in February",
    ],
    why:
      "Dates Family Day, which r. 1.02 names as a holiday without saying when it " +
      "is. Vendored for that definition alone — nothing in this product turns on " +
      "employment standards themselves.",
  },
];
