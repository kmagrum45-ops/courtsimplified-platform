/**
 * PRE-SUIT NOTICE PROVISIONS — the deadlines that bar an action outright.
 *
 * *** WHY THESE ARE SEPARATED FROM THE REST OF THE LEGISLATION ***
 *
 * Every other deadline in this product changes what you can do NEXT. Miss the
 * defence window and you can be noted in default — recoverable, by motion.
 * Miss one of these and, subject to narrow exceptions, **there is no action at
 * all**. A person who slipped on ice outside a shop on 1 December and comes to
 * this site on 15 February has already lost their claim, and nothing anywhere
 * in the product would have told them.
 *
 * They are also the deadlines a self-represented person is least likely to
 * know exists. Nobody expects a 10-day clock on a fall.
 *
 * *** THIS IS NOT A HYPOTHETICAL GAP ***
 *
 * `docs/SOURCING_NOTES.md` records it happening. The Occupiers' Liability Act
 * was cited from `90o02_eV006.doc` — a HISTORICAL snapshot frozen seven weeks
 * before s. 6.1 came into force — so the slip-and-fall claim type, whose own
 * signals are almost entirely snow-and-ice fact patterns, told users about the
 * two-year limitation period and said nothing about the 60-day notice that
 * bars the action without it.
 *
 * Every document here is the plain `_e.doc` current consolidation, and the
 * Occupiers' Liability Act's header reads "FROM JANUARY 29, 2021" — the date
 * s. 6.1 came into force.
 *
 * *** WHAT THE BLOCKS BUILT ON THESE MUST SAY ***
 *
 * The exceptions are as load-bearing as the deadlines, and a block that gives
 * the number without them would frighten someone out of a claim they still
 * have. All three provisions say failure is NOT a bar where the injured person
 * died, and NOT a bar where a judge finds a reasonable excuse and no prejudice
 * to the defendant.
 *
 * And the scope is narrower than "I fell". Municipal notice attaches to the
 * non-repair duty in s. 44(2) — not to every municipal injury. There is also a
 * near-immunity that cuts the other way: s. 44(9) says that except in cases of
 * gross negligence, a municipality is NOT liable for personal injury caused by
 * snow or ice on a SIDEWALK. Telling someone to serve notice in 10 days
 * without that is telling them half of what decides their case.
 */

import type { CorpusSource } from "./corpusSources";

export const NOTICE_SOURCES: CorpusSource[] = [
  {
    id: "municipal-act-2001",
    title: "Municipal Act, 2001",
    citation: "S.O. 2001, c. 25",
    url: "https://www.ontario.ca/laws/docs/01m25_e.doc",
    format: "elaws-doc",
    tier: "legislation",
    mustContain: [
      "Municipal Act, 2001",
      "CONSOLIDATION PERIOD",
      // s. 44(10): the notice itself.
      "within 10 days after the occurrence",
      // s. 44(9): the sidewalk snow-and-ice immunity, which decides more
      // slip cases than the notice does.
      "not liable for a",
    ],
    why:
      "s. 44 — the duty to keep a highway or bridge in repair, the 10-day " +
      "written notice to the clerk that a non-repair claim depends on, the " +
      "death and reasonable-excuse exceptions, and the s. 44(9) near-immunity " +
      "for snow or ice on a sidewalk absent gross negligence.",
  },
  {
    id: "city-of-toronto-act-2006",
    title: "City of Toronto Act, 2006",
    citation: "S.O. 2006, c. 11, Sched. A",
    url: "https://www.ontario.ca/laws/docs/06c11_e.doc",
    format: "elaws-doc",
    tier: "legislation",
    mustContain: [
      "City of Toronto Act, 2006",
      "CONSOLIDATION PERIOD",
      "within 10 days after the occurrence",
    ],
    why:
      "s. 42 — the same 10-day notice, for claims against the City of Toronto. " +
      "Toronto is governed by its own Act rather than the Municipal Act, so a " +
      "block that cited only the Municipal Act would be citing the wrong " +
      "statute for the province's largest city.",
  },
  {
    id: "occupiers-liability-act",
    title: "Occupiers' Liability Act",
    citation: "R.S.O. 1990, c. O.2",
    url: "https://www.ontario.ca/laws/docs/90o02_e.doc",
    format: "elaws-doc",
    tier: "legislation",
    mustContain: [
      "Occupiers' Liability Act",
      "CONSOLIDATION PERIOD",
      // s. 6.1(1). Its presence proves this is NOT the pre-2021 snapshot.
      "within 60 days after the occurrence",
    ],
    // The plain _e.doc form. See the module header: the _eV006 form is a
    // frozen snapshot predating s. 6.1 and citing it produced a real error.
    minCharacters: 8_000,
    why:
      "s. 6.1 — the 60-day written notice for personal injury caused by snow " +
      "or ice, served on an occupier or the snow-removal contractor, with the " +
      "death and reasonable-excuse exceptions. This is the provision a " +
      "historical consolidation hid.",
  },
];
