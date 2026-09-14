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
  "cja-cited-sections.txt",
  "cyfsa-cited-sections.txt",
  "oreg-258-98-cited-rules.txt",
  "insurance-act-s263.txt",
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

export type StatutoryProvision = {
  /** Statute short name, as used in the vendored file's header. */
  statute: string;
  /** Section label exactly as it heads the block in the vendored file. */
  section: string;
  sourceUrl: string;
  /** The vendored file carrying this provision's verbatim text. */
  vendoredIn: (typeof VENDORED_SOURCES)[number];
  /** When WE last retrieved and read it. */
  verifiedAt: string;
  /**
   * What the document says about ITSELF — the date its own header declares.
   *
   * This is a different fact from `verifiedAt` and the difference has already
   * caused a real error. e-Laws publishes both current consolidations
   * ("CONSOLIDATION PERIOD: FROM <date> TO THE E-LAWS CURRENCY DATE") and frozen
   * historical ones ("HISTORICAL VERSION FOR THE PERIOD ..."), and the filenames
   * barely differ. An Occupiers' Liability Act snapshot cited here predated
   * s. 6.1 by seven weeks — perfectly `verifiedAt`, and missing a 60-day notice
   * requirement that had been in force for years. See SOURCING_NOTES.md.
   *
   * Format: the ISO start date of the consolidation period. A provision whose
   * source is a historical version should not be cited at all rather than
   * recorded here.
   */
  consolidationPeriod: string;
  /**
   * Present ONLY where the source prints a not-yet-in-force replacement for
   * this provision. The check below fails if the vendored text contains "On a
   * day to be named" within a provision that does not declare one.
   */
  pendingReplacement?: PendingReplacement;
};

export const STATUTORY_PROVISIONS: StatutoryProvision[] = [
  // ---- The direct-compensation bar ----
  //
  // Retrieved 2026-09-14 because the claim-type element
  // `dcpd-bar-does-not-apply` asserts the bar does NOT apply — a legal
  // conclusion no user can answer. Rather than paraphrase it from the
  // element name, the provision is vendored and quoted.
  //
  //   s. 263 (1) (c)  the section applies only where at least one OTHER
  //                   automobile involved was insured. This is the limb that
  //                   usually decides it, and whether the other driver was
  //                   insured is a FACT a user may know.
  //   s. 263 (5) (a)  where it applies, an insured "has no right of action
  //                   against any person involved in the incident other than
  //                   the insured's insurer" for damage to their own
  //                   automobile, its contents, or loss of use.
  //   s. 263 (2.2)    an insured may elect not to recover from their own
  //                   insurer. The election does not by itself restore a
  //                   right of action against the other driver.
  {
    statute: "Insurance Act",
    section: "s. 263",
    sourceUrl: "https://www.ontario.ca/laws/docs/90i08_e.doc",
    vendoredIn: "insurance-act-s263.txt",
    verifiedAt: "2026-09-14",
    consolidationPeriod: "2026-01-01",
  },
  // ---- Small Claims default proceedings ----
  //
  // Retrieved 2026-09-14. Two routes after a defendant is noted in default,
  // and WHICH ROUTE A CLAIM TAKES IS NOT SOMETHING THIS SITE DECIDES — the
  // rule states the distinction and the user applies it to their own claim.
  //
  //   r. 11.02 (1)  clerk MAY sign default judgment (Form 11B) for the part
  //                 of the claim that is a debt or liquidated demand in
  //                 money, including interest if claimed.
  //   r. 11.03      everything r. 11.02 does not cover, and only if ALL
  //                 defendants are noted in default. Either a motion in
  //                 writing for an assessment of damages (Form 15A) or a
  //                 request for an assessment hearing (may be Form 9B).
  //
  // r. 11.03 (7) is a third route the two-way framing misses: where any
  // defendant HAS filed a defence, a plaintiff needing an assessment goes to
  // a settlement conference under r. 13 and then trial under r. 17.
  {
    statute: "O. Reg. 258/98 (Rules of the Small Claims Court)",
    section: "rr. 11.01 to 11.06",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
    vendoredIn: "oreg-258-98-cited-rules.txt",
    verifiedAt: "2026-09-14",
    consolidationPeriod: "2025-10-14",
  },
  // ---- The family jurisdiction spine ----
  //
  // These were verified on 2026-09-13 while writing FAMILY_PROCEEDING_TYPES.md
  // and recorded there as prose only, because nothing read them yet. That is
  // exactly the gap docs/SOURCED_FACT_CONVENTIONS.md's corollary describes: a
  // design doc's facts fail the three registry tests on the day they are
  // written and pass them as soon as the build starts. They belong here.
  {
    statute: "Courts of Justice Act",
    section: "ss. 21.8 to 21.11",
    sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
    vendoredIn: "cja-cited-sections.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2025-12-11",
  },
  {
    statute: "Children's Law Reform Act",
    section: "s. 18",
    sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
    vendoredIn: "clra-cited-sections.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2025-12-11",
  },
  {
    statute: "Children's Law Reform Act",
    section: "ss. 59-60",
    sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
    vendoredIn: "clra-cited-sections.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2025-12-11",
  },
  {
    statute: "Child, Youth and Family Services Act, 2017",
    section: "s. 2 (1)",
    sourceUrl: "https://www.ontario.ca/laws/docs/17c14_e.doc",
    vendoredIn: "cyfsa-cited-sections.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2026-07-01",
  },

  // ---- Trial and enforcement ----
  //
  // Retrieved 2026-09-13 for the two legal_form_mapping_rules stages that have
  // NO coverage today and CAN be sourced. A user at trial or in enforcement
  // currently receives an empty form list. The other two uncovered stages,
  // "urgent" and "not-sure", are deliberately absent: neither is a procedural
  // stage in the rules, so there is no provision to cite. "not-sure" means the
  // user has not told us their stage, and no rule says which form to file then.
  //
  // Sourcing only. No mapping row is written from this; that is a separate
  // decision under CLAUDE.md section 6.
  {
    statute: "O. Reg. 258/98 (Rules of the Small Claims Court)",
    section: "rr. 16 to 18",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
    vendoredIn: "oreg-258-98-cited-rules.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2025-10-14",
  },
  {
    statute: "O. Reg. 258/98 (Rules of the Small Claims Court)",
    section: "r. 20",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
    vendoredIn: "oreg-258-98-cited-rules.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2025-10-14",
  },
  {
    statute: "O. Reg. 114/99 (Family Law Rules)",
    section: "rr. 26 to 32",
    sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
    vendoredIn: "flr-cited-rules.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2026-05-01",
  },

  // ---- Family Law Act ----
  {
    statute: "Family Law Act",
    section: "s. 1 (1)",
    sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
    vendoredIn: "fla-cited-sections.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2026-05-01",
  },
  {
    statute: "Family Law Act",
    section: "s. 4 (1)",
    sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
    vendoredIn: "fla-cited-sections.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2026-05-01",
  },
  {
    statute: "Family Law Act",
    section: "s. 5",
    sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
    vendoredIn: "fla-cited-sections.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2026-05-01",
  },
  {
    statute: "Family Law Act",
    section: "s. 7",
    sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
    vendoredIn: "fla-cited-sections.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2026-05-01",
  },
  {
    statute: "Family Law Act",
    section: "s. 17",
    sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
    vendoredIn: "fla-cited-sections.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2026-05-01",
  },
  {
    statute: "Family Law Act",
    section: "s. 29",
    sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
    vendoredIn: "fla-cited-sections.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2026-05-01",
  },
  {
    statute: "Family Law Act",
    section: "s. 46",
    sourceUrl: "https://www.ontario.ca/laws/docs/90f03_e.doc",
    vendoredIn: "fla-cited-sections.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2026-05-01",
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
    consolidationPeriod: "2026-05-01",
  },
  {
    statute: "O. Reg. 114/99 (Family Law Rules)",
    section: "r. 13",
    sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
    vendoredIn: "flr-cited-rules.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2026-05-01",
  },
  {
    statute: "O. Reg. 114/99 (Family Law Rules)",
    section: "r. 35.1",
    sourceUrl: "https://www.ontario.ca/laws/docs/990114_e.doc",
    vendoredIn: "flr-cited-rules.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2026-05-01",
  },
  {
    statute: "Children's Law Reform Act",
    section: "s. 21.2",
    sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
    vendoredIn: "clra-cited-sections.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2025-12-11",
  },
  {
    statute: "Children's Law Reform Act",
    section: "s. 24",
    sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
    vendoredIn: "clra-cited-sections.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2025-12-11",
  },
  {
    statute: "Children's Law Reform Act",
    section: "s. 35",
    sourceUrl: "https://www.ontario.ca/laws/docs/90c12_e.doc",
    vendoredIn: "clra-cited-sections.txt",
    verifiedAt: "2026-09-13",
    consolidationPeriod: "2025-12-11",
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

export function provisionsWithPendingReplacement(): StatutoryProvision[] {
  return STATUTORY_PROVISIONS.filter((provision) => provision.pendingReplacement);
}

/**
 * Days since a pending replacement was last checked against the live source.
 * Returns null for a provision with no pending replacement.
 */
export function daysSinceLastChecked(provision: StatutoryProvision, now: Date): number | null {
  if (!provision.pendingReplacement) return null;

  const checked = Date.parse(`${provision.pendingReplacement.lastChecked}T00:00:00Z`);
  if (Number.isNaN(checked)) return Number.POSITIVE_INFINITY;

  return Math.floor((now.getTime() - checked) / 86_400_000);
}
