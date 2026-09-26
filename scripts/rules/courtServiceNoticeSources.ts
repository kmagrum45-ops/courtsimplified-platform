/**
 * COURT SERVICE NOTICES — the pages that say when the counter is shut.
 *
 * *** NOT THE SAME THING AS noticeSources.ts, DESPITE THE NAME ***
 *
 * `noticeSources.ts` holds PRE-SUIT NOTICE statutes: the 10-day municipal
 * notice, the 60-day snow-and-ice notice. Those bar an action outright and they
 * are law.
 *
 * This file holds something with a completely different character: ministry and
 * court announcements that an office is CLOSED on a given day, or that a filing
 * made on a given day will be stamped later. They are not law, they are not in
 * any statute, they appear and disappear, and they are published per occasion.
 *
 * *** WHY THIS LAYER EXISTS AT ALL ***
 *
 * `deadlines/holidays.ts` answers one question correctly: does a deadline
 * landing on this date MOVE? That is r. 1.02 and the Legislation Act, and the
 * answer for 30 September is no, because it is not a named holiday.
 *
 * Nothing answered the other question: is the counter OPEN? On 2026-09-26 the
 * online-filing page began saying provincial court offices are closed on
 * Wednesday 30 September 2026 and that anything filed online that day is marked
 * filed on 1 October. So a user told "your deadline is 30 September" could file
 * that day, on time by the rules, and hold a document stamped after it.
 *
 * The two questions need separate provenance because they have separate
 * failure modes. A holiday is wrong forever if wrong. A closure is right for one
 * week and then stale, which is why these sources are checked WEEKLY and the
 * rest monthly.
 *
 * *** NOTHING HERE IS TYPED FROM MEMORY ***
 *
 * These entries fetch and hash the pages. The closure DATES are then extracted
 * from the vendored text by `scripts/rules/extractServiceNotices.ts`, which
 * records the sentence it took each date from. A date with no quote behind it
 * does not exist as far as the renderer is concerned.
 */

import type { CorpusSource } from "./corpusSources";

export const COURT_SERVICE_NOTICE_SOURCES: CorpusSource[] = [
  {
    id: "ontario-file-civil-claim-online",
    title: "File civil claim documents online",
    citation: "ontario.ca, Ministry of the Attorney General",
    url: "https://www.ontario.ca/page/file-civil-claim-online",
    format: "html",
    tier: "practical",
    mustContain: ["online"],
    minCharacters: 2000,
    why:
      "Carries the same ministry closure banner as the Small Claims filing page, " +
      "confirmed 2026-09-26. Two pages carrying it independently is what lets the " +
      "extractor cross-check a closure date rather than trusting one page.",
  },
  {
    id: "scj-news",
    title: "News — Ontario Superior Court of Justice",
    citation: "ontariocourts.ca",
    url: "https://www.ontariocourts.ca/scj/news/",
    format: "html",
    tier: "practical",
    mustContain: ["Superior Court"],
    minCharacters: 1000,
    why:
      "Where the court itself announces closures and suspensions, as distinct " +
      "from the ministry's filing pages. Included so a closure announced by the " +
      "court and not by the ministry is still seen. Fetches with HTTP 200; " +
      "ontariocourts.ca/scj/notices/ is a 404 and is NOT a route.",
  },
];
