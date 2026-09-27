/**
 * The Rules of Civil Procedure — public rule text for the Civil (Phase 2) work.
 *
 * *** WHY THIS IS VENDORED NOW, BEFORE ANY CIVIL CONTENT EXISTS ***
 *
 * `docs/reference/civil-annual-practice/` preserves a planning package that maps
 * the Rules of Civil Procedure rule by rule. Parts of it are derived from the
 * Ontario Annual Practice, a commercial publication that is **not** an acceptable
 * source under CLAUDE.md §2.
 *
 * The rules themselves are public, and they are the thing that planning package is
 * about. Vendoring them is what makes it possible to tell the two apart: anything a
 * Civil profile ever says about Rule 39 must be quotable from THIS text, and if it
 * cannot be, it does not ship. Without the public text in the corpus there is no
 * way to separate "the rule says" from "the book says", and the only safe answer
 * would have been to discard the package entirely.
 *
 * *** IT IS LARGE, AND THAT IS THE POINT ***
 *
 * About 1.06 million characters — the biggest single source in the corpus, a third
 * again the Insurance Act. It covers the whole of civil procedure in the Superior
 * Court, most of which this product does not touch. It is vendored whole anyway,
 * because the alternative is choosing in advance which rules a future Civil stage
 * map will need, and `docs/SOURCING_NOTES.md` records what that cost last time:
 * `oreg-258-98-cited-rules.txt` held only the rules something already cited, which
 * is the wrong shape for a stage map that has to cover positions nothing cites yet.
 *
 * *** NOT A COMMITMENT TO BUILD CIVIL ***
 *
 * Vendoring a source is not a decision to ship anything from it. Nothing reads this
 * yet. `rules:check` will watch it, which is the only ongoing cost, and a rule
 * change that lands before the Civil work starts will be visible rather than
 * discovered later.
 */

import type { CorpusSource } from "./corpusSources";

export const CIVIL_PROCEDURE_SOURCES: CorpusSource[] = [
  {
    id: "rules-of-civil-procedure",
    title: "Rules of Civil Procedure",
    citation: "R.R.O. 1990, Reg. 194",
    url: "https://www.ontario.ca/laws/docs/900194_e.doc",
    format: "elaws-doc",
    mustContain: ["RULES OF CIVIL PROCEDURE", "REGULATION 194", "CONSOLIDATION PERIOD"],
    why:
      "Phase 2 groundwork, and the control that lets the preserved Annual Practice " +
      "planning package be used safely: a Civil statement is publishable only if it " +
      "can be quoted from here. Consolidation read as FROM SEPTEMBER 1, 2026 when " +
      "vendored — recent enough that anything recorded about Superior Court " +
      "procedure from an earlier reading should be re-checked rather than assumed " +
      "(docs/SOURCING_NOTES.md).",
  },
];
