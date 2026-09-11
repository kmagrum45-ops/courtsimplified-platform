# Primary legal sources — saved locally

This folder holds primary legal sources (statutes, regulations, and
court decisions) retrieved manually and saved here as files, rather than
linked to and fetched live.

**Why:** CanLII blocks automated fetching (and so does `canlii.org`-hosted
access to Ontario court decisions specifically — see
`docs/SOURCING_NOTES.md` for the confirmed cases). The Supreme Court of
Canada's own decisions database, `decisions.scc-csc.ca`, is directly
fetchable and does not need this folder at all (also recorded in
`docs/SOURCING_NOTES.md`) — the SCC judgments saved here predate that
finding and were retrieved via CanLII before it was made. The sourcing
rule in `CLAUDE.md` section 2 requires that any source cited from this
codebase be actually retrieved and read, not cited from memory or
approximation — for a source on a domain that can't be fetched by the
tools available in a session, saving a manually downloaded copy here is
how that requirement gets satisfied instead.

**Convention:** for every file added to this folder, record an entry
below with:
- What it is (party names, court, short description)
- Its neutral citation
- The URL it was retrieved from
- The date it was downloaded

A file in this folder without an entry here is incomplete — don't add
one without the other.

## Sources

### `mustapha-v-culligan-2008-SCC-27.pdf`

- **What it is:** Supreme Court of Canada judgment, *Mustapha v. Culligan
  of Canada Ltd.* — negligence, duty of care, foreseeability of mental
  injury.
- **Neutral citation:** 2008 SCC 27
- **Retrieved from:** canlii.org
- **Downloaded:** 2026-09-09

### `garland-v-consumers-gas-2004-SCC-25.pdf`

- **What it is:** Supreme Court of Canada judgment, *Garland v. Consumers'
  Gas Co.* — the leading modern statement of the unjust enrichment test:
  the three-element cause of action, the two-stage juristic reason
  analysis, and the change of position defence (including that it is
  unavailable to a defendant enriched through their own wrongdoing). Not
  to be confused with the earlier, separate SCC decision in the same
  litigation, *Garland v. Consumers' Gas Co.*, [1998] 3 S.C.R. 112 (about
  the criminal-interest-rate question, not unjust enrichment) — file
  `id=1660` on `decisions.scc-csc.ca` resolves to that 1998 decision, not
  this one; this 2004 decision is at `id=2138` there instead, confirmed by
  a fresh live fetch during the same session this entry was added.
- **Neutral citation:** 2004 SCC 25
- **Retrieved from:** canlii.org
- **Downloaded:** 2026-09-10

### `kerr-v-baranow-2011-SCC-10.pdf`

- **What it is:** Supreme Court of Canada judgment, *Kerr v. Baranow* —
  unjust enrichment and resulting trust claims between unmarried domestic
  partners on the breakdown of their relationship (the "joint family
  venture" doctrine, and quantum meruit vs. proportionate-share monetary
  remedies). Read in full; not used as a citation source for
  `educationTopics.ts`'s general unjust enrichment topic because its
  substantive content — beyond restating the same general test Garland
  already states more generally — is tightly bound to domestic/family-
  property context, not general Small Claims content. Kept here as a
  genuine primary source in case a future, family-law-scoped session finds
  a use for it.
- **Neutral citation:** 2011 SCC 10
- **Retrieved from:** canlii.org
- **Downloaded:** 2026-09-10

### `moore-v-sweet-2018-SCC-52.pdf`

- **What it is:** Supreme Court of Canada judgment, *Moore v. Sweet* —
  unjust enrichment and constructive trust remedy in a life-insurance
  beneficiary-designation dispute. Read in full; not used as a citation
  source for `educationTopics.ts`'s general unjust enrichment topic
  because its own discussion of the general test mainly cross-references
  and restates Garland's paragraphs (independently confirming this
  codebase's own paragraph-level reading of Garland — see para. 37, citing
  Garland at para. 30; para. 57, citing Garland at para. 44; para. 58,
  citing Garland at paras. 45-46) rather than adding new general doctrine;
  its own substantive holdings are specific to the constructive-trust
  remedy and the Insurance Act's beneficiary-designation provisions. File
  originally saved as `2018-SCC-52.pdf` (citation number unconfirmed at
  the time) — identified from the PDF's own text and renamed to this
  filename once confirmed.
- **Neutral citation:** 2018 SCC 52
- **Retrieved from:** canlii.org
- **Downloaded:** 2026-09-10
