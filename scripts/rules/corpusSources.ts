/**
 * The authoritative sources the accuracy engine draws on, and how to fetch them.
 *
 * *** WHY THIS FILE IS DATA AND NOT A SCRIPT ***
 *
 * Two commands read it: `rules:fetch` vendors the text, and `rules:check`
 * re-fetches and diffs. If the list lived inside the fetcher, the watcher
 * would need its own copy, and a source added to one would silently not be
 * watched by the other. That is the failure this shape prevents.
 *
 * *** THE FETCH ROUTE, AND WHY IT LOOKS ODD ***
 *
 * `ontario.ca/laws/statute/<id>` and `/laws/regulation/<id>` are JS-rendered
 * and return an empty shell to a non-browser fetch. The SAME text is published
 * as a static `.doc` at `ontario.ca/laws/docs/<id>.doc`, on the same domain.
 * That is not a workaround around the sourcing rule — it is the identical
 * consolidated text by a fetchable path. See docs/SOURCING_NOTES.md.
 *
 * *** THE CONSOLIDATION CHECK IS NOT OPTIONAL ***
 *
 * A `_eV006`-style suffix means a FROZEN HISTORICAL snapshot, and the document
 * says so in its own first lines. Citing one is how the Occupiers' Liability
 * Act came to be cited without s. 6.1's 60-day notice requirement — a real
 * error that reached a live claim type. Every entry below declares the header
 * it must carry, and the fetcher refuses a document whose header does not
 * match.
 */

export type CorpusFormat = "elaws-doc" | "html";

/**
 * What KIND of authority a source is.
 *
 *   "legislation" — what the law requires. Rule numbers are stable, the text
 *                   changes rarely, and a change is always significant.
 *   "practical"   — what happens at the counter: fees, online filing, what to
 *                   bring. None of it is derivable from the regulation, and a
 *                   change is a content update rather than an emergency.
 *
 * rules:check reports the two separately, because treating a fee revision with
 * the same urgency as a rule amendment trains people to ignore both.
 */
export type CorpusTier = "legislation" | "practical";

export type CorpusSource = {
  /** Stable id. Also the vendored filename. */
  id: string;
  title: string;
  /** The citation a user would check. */
  citation: string;
  url: string;
  format: CorpusFormat;
  /** Defaults to "legislation" when omitted. */
  tier?: CorpusTier;
  /**
   * A string the extracted text MUST contain, proving the fetch landed on the
   * right document and the current consolidation.
   *
   * For e-Laws documents this is "CONSOLIDATION PERIOD" — a historical
   * snapshot says "HISTORICAL VERSION FOR THE PERIOD" instead, so the check
   * fails closed on exactly the mistake that matters.
   */
  mustContain: string[];
  /** What the accuracy engine needs from it. */
  why: string;
  /**
   * The shortest plausible extraction, when the default is wrong.
   *
   * The default backstop is 2,000 characters, which catches an error page
   * served with a 200. O. Reg. 626/00 is a genuinely complete regulation of
   * about 1,300 characters -- two sections, a jurisdiction amount and an
   * appeal threshold -- and the first version of this fetcher rejected it as
   * "probably an error page".
   *
   * That was a check asserting a current VALUE (documents are long) rather
   * than a property. The markers in mustContain are what actually prove the
   * fetch landed on the right document; this is only a crude guard against a
   * 200-with-an-error-body, so it is per-source where the default is wrong.
   */
  minCharacters?: number;
};

import { PRACTICAL_SOURCES } from "./practicalSources";
import { NOTICE_SOURCES } from "./noticeSources";
import { HOLIDAY_SOURCES } from "./holidaySources";

const LEGISLATION_SOURCES: CorpusSource[] = [
  {
    id: "oreg-258-98-small-claims-rules",
    title: "Rules of the Small Claims Court",
    citation: "O. Reg. 258/98",
    url: "https://www.ontario.ca/laws/docs/980258_e.doc",
    format: "elaws-doc",
    mustContain: ["RULES OF THE SMALL CLAIMS COURT", "CONSOLIDATION PERIOD"],
    why:
      "The whole regulation, every rule and the table of forms. The existing " +
      "docs/sources/oreg-258-98-cited-rules.txt holds only the rules already " +
      "cited somewhere, which is the wrong shape for a stage map that has to " +
      "cover positions nothing cites yet.",
  },
  {
    id: "cja-courts-of-justice-act",
    title: "Courts of Justice Act",
    citation: "R.S.O. 1990, c. C.43",
    url: "https://www.ontario.ca/laws/docs/90c43_e.doc",
    format: "elaws-doc",
    mustContain: ["Courts of Justice Act", "CONSOLIDATION PERIOD"],
    why:
      "Constitutes the Small Claims Court and sets its monetary jurisdiction " +
      "(s. 23), the leave requirement for within-jurisdiction Superior Court " +
      "claims (s. 23(1.1)), appeals (s. 31) and the costs cap (s. 29).",
  },
  {
    id: "oreg-626-00-monetary-jurisdiction",
    title: "Small Claims Court Jurisdiction and Appeal Limit",
    citation: "O. Reg. 626/00",
    url: "https://www.ontario.ca/laws/docs/000626_e.doc",
    format: "elaws-doc",
    mustContain: [
      "SMALL CLAIMS COURT JURISDICTION AND APPEAL LIMIT",
      "CONSOLIDATION PERIOD",
    ],
    minCharacters: 800,
    why:
      "The $50,000 monetary limit and the $5,000 appeal threshold. O. Reg. " +
      "42/25 made the October 2025 increase and has NO standalone document on " +
      "the .doc route — four id forms return 403 — so the amendment is cited " +
      "through this consolidation's credit lines. See docs/SOURCING_NOTES.md.",
  },
  {
    id: "limitations-act-2002",
    title: "Limitations Act, 2002",
    citation: "S.O. 2002, c. 24, Sched. B",
    url: "https://www.ontario.ca/laws/docs/02l24_e.doc",
    format: "elaws-doc",
    mustContain: ["Limitations Act, 2002", "CONSOLIDATION PERIOD"],
    why:
      "The basic two-year period (s. 4) and discoverability (s. 5), including " +
      "the demand-obligation rule in s. 5(3)-(4). INFORMATION ONLY: the engine " +
      "never computes whether a user's claim is out of time.",
  },
  {
    id: "legislation-act-2006",
    title: "Legislation Act, 2006",
    citation: "S.O. 2006, c. 21, Sched. F",
    url: "https://www.ontario.ca/laws/docs/06l21_e.doc",
    format: "elaws-doc",
    mustContain: ["Legislation Act, 2006", "CONSOLIDATION PERIOD"],
    why:
      "Day counting. Part VI holds the rules for computing time — how the " +
      "first and last day count, and what happens when a deadline falls on a " +
      "holiday. The deadline engine cites this, not its own arithmetic.",
  },
  {
    id: "small-claims-forms-table",
    title: "Rules of the Small Claims Court Forms",
    citation: "ontariocourtforms.on.ca",
    url: "https://ontariocourtforms.on.ca/en/rules-of-the-small-claims-court-forms/",
    format: "html",
    mustContain: ["Rules of the Small Claims Court Forms", "Additional Parties"],
    why:
      "The official list of form numbers, names and effective dates. A block " +
      "naming a form must name it exactly as this table does, and a form that " +
      "has been withdrawn must stop being recommended.",
  },
];

/**
 * Everything the corpus vendors, both tiers.
 *
 * Legislation first so the fetch log reads in order of authority, and so a
 * partial run gets the rules before the guides.
 */
export const CORPUS_SOURCES: CorpusSource[] = [
  ...LEGISLATION_SOURCES,
  ...NOTICE_SOURCES,
  ...HOLIDAY_SOURCES,
  ...PRACTICAL_SOURCES,
];

export function sourceTier(source: CorpusSource): CorpusTier {
  return source.tier ?? "legislation";
}
