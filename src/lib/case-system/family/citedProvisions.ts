/**
 * Statutory provisions CourtSimplified cites, and whether any of them is about
 * to be replaced.
 *
 * WHY THIS EXISTS. e-Laws prints not-yet-in-force text INLINE, in the same
 * document, formatted exactly like law that is in force. The only marker is a
 * prose sentence:
 *
 *     Note: On a day to be named by order of the Lieutenant Governor in
 *     Council, subsection 46 (1) of the Act is repealed and the following
 *     substituted: (See: 2025, c. 6, Sched. 6, s. 1 (1))
 *
 * ...followed by the replacement, which reads like ordinary statutory text.
 * This is a different trap from the historical-version one in SOURCING_NOTES.md:
 * the document header says CONSOLIDATION PERIOD and IS current, but individual
 * sections still carry future law. Two of the provisions below carry one, and
 * both are restraining-order powers — the highest-stakes content on the family
 * path.
 *
 * WHAT THE SITE SHOWS: the in-force text, always. Never the replacement. This
 * registry exists so that "never the replacement" is enforced by a check rather
 * than remembered by a person.
 *
 * `inForceDate: null` is load-bearing. "On a day to be named" means no date has
 * been set. A field typed as a date invites someone to invent one; the absence
 * has to be representable.
 */

/** The vendored sources the check reads. Provenance: docs/sources/README.md. */
export const VENDORED_SOURCES = [
  "fla-cited-sections.txt",
  "clra-cited-sections.txt",
  "flr-cited-rules.txt",
] as const;

/**
 * How long a pending replacement may go unchecked before the suite FAILS.
 *
 * Ninety days, and it fails rather than warns. The reasoning: a named-day
 * provision comes into force by proclamation, silently — nothing notifies this
 * repo. The failure mode being defended against is the day it comes into force
 * while every check still passes and the site quietly cites repealed law. A
 * warning in that scenario is indistinguishable from no check at all, because
 * the whole problem is that nobody is looking.
 *
 * Ninety days is a deliberate compromise. Shorter (30) turns a real signal into
 * routine noise that gets suppressed, which is the same failure with more steps.
 * Longer (a year) is most of a legislative cycle — long enough for a
 * proclamation to land and be missed entirely. Ninety days means the question
 * is asked four times a year, which is about the cadence at which someone will
 * still take it seriously.
 *
 * Re-checking is cheap: re-fetch the `.doc` and look for whether the "On a day
 * to be named" note is still there. If it is gone, the amendment is in force and
 * the vendored section must be refreshed.
 */
export const PENDING_REPLACEMENT_RECHECK_DAYS = 90;

export type PendingReplacement = {
  /** The amending provision, as e-Laws cites it in the "(See: ...)" note. */
  amendingCitation: string;
  /**
   * null means "on a day to be named" — no date has been proclaimed. A string
   * date means one has, and the vendored text needs refreshing on or before it.
   */
  inForceDate: string | null;
  /** What would change, in plain terms. Not shown to users; for maintainers. */
  whatWouldChange: string;
  /** ISO date this was last checked against the live source. */
  lastChecked: string;
};

export type CitedProvision = {
  /** Statute short name, as used in the vendored file's header. */
  statute: string;
  /** Section label exactly as it heads the block in the vendored file. */
  section: string;
  sourceUrl: string;
  /** The vendored file carrying this provision's verbatim text. */
  vendoredIn: (typeof VENDORED_SOURCES)[number];
  verifiedAt: string;
  /**
   * Present ONLY where the source prints a not-yet-in-force replacement for
   * this provision. The check below fails if the vendored text contains "On a
   * day to be named" within a provision that does not declare one.
   */
  pendingReplacement?: PendingReplacement;
};

export const CITED_PROVISIONS: CitedProvision[] = [
  {
    statute: "Family Law Act",
    section: "s. 1 (1)",
    sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
    vendoredIn: "fla-cited-sections.txt",
    verifiedAt: "2026-09-13",
  },
  {
    statute: "Family Law Act",
    section: "s. 4 (1)",
    sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
    vendoredIn: "fla-cited-sections.txt",
    verifiedAt: "2026-09-13",
  },
  {
    statute: "Family Law Act",
    section: "s. 5",
    sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
    vendoredIn: "fla-cited-sections.txt",
    verifiedAt: "2026-09-13",
  },
  {
    statute: "Family Law Act",
    section: "s. 7",
    sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
    vendoredIn: "fla-cited-sections.txt",
    verifiedAt: "2026-09-13",
  },
  {
    statute: "Family Law Act",
    section: "s. 17",
    sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
    vendoredIn: "fla-cited-sections.txt",
    verifiedAt: "2026-09-13",
  },
  {
    statute: "Family Law Act",
    section: "s. 29",
    sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
    vendoredIn: "fla-cited-sections.txt",
    verifiedAt: "2026-09-13",
  },
  {
    statute: "Family Law Act",
    section: "s. 46",
    sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
    vendoredIn: "fla-cited-sections.txt",
    verifiedAt: "2026-09-13",
    pendingReplacement: {
      amendingCitation: "2025, c. 6, Sched. 6, s. 1 (1)",
      inForceDate: null,
      whatWouldChange:
        "Widens who may apply for a restraining order: currently only the person " +
        "who fears for their safety. The replacement would also allow a person " +
        "prescribed by regulation to apply on their behalf and with their consent, " +
        "or any person on their behalf with leave of the court.",
      lastChecked: "2026-09-13",
    },
  },
  {
    statute: "O. Reg. 114/99 (Family Law Rules)",
    section: "r. 1",
    sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
    vendoredIn: "flr-cited-rules.txt",
    verifiedAt: "2026-09-13",
  },
  {
    statute: "O. Reg. 114/99 (Family Law Rules)",
    section: "r. 13",
    sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
    vendoredIn: "flr-cited-rules.txt",
    verifiedAt: "2026-09-13",
  },
  {
    statute: "O. Reg. 114/99 (Family Law Rules)",
    section: "r. 35.1",
    sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
    vendoredIn: "flr-cited-rules.txt",
    verifiedAt: "2026-09-13",
  },
  {
    statute: "Children's Law Reform Act",
    section: "s. 21.2",
    sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
    vendoredIn: "clra-cited-sections.txt",
    verifiedAt: "2026-09-13",
  },
  {
    statute: "Children's Law Reform Act",
    section: "s. 35",
    sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
    vendoredIn: "clra-cited-sections.txt",
    verifiedAt: "2026-09-13",
    pendingReplacement: {
      amendingCitation: "2025, c. 6, Sched. 2, s. 1 (1)",
      inForceDate: null,
      whatWouldChange:
        "The same widening as Family Law Act s. 46, applied to the CLRA " +
        "restraining order — which, unlike s. 46, may already be made against " +
        "any person rather than only a spouse, former spouse or cohabitee.",
      lastChecked: "2026-09-13",
    },
  },
];

/** The marker e-Laws uses for a not-yet-in-force replacement. */
export const NOT_IN_FORCE_MARKER = "On a day to be named";

export function provisionsWithPendingReplacement(): CitedProvision[] {
  return CITED_PROVISIONS.filter((provision) => provision.pendingReplacement);
}

/**
 * Days since a pending replacement was last checked against the live source.
 * Returns null for a provision with no pending replacement.
 */
export function daysSinceLastChecked(provision: CitedProvision, now: Date): number | null {
  if (!provision.pendingReplacement) return null;

  const checked = Date.parse(`${provision.pendingReplacement.lastChecked}T00:00:00Z`);
  if (Number.isNaN(checked)) return Number.POSITIVE_INFINITY;

  return Math.floor((now.getTime() - checked) / 86_400_000);
}
