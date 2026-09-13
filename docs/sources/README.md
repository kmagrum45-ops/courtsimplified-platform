# Primary legal sources — saved locally

This folder holds primary legal sources (statutes, regulations, and
court decisions) retrieved manually and saved here as files, rather than
linked to and fetched live.

**Why:** CanLII blocks automated fetching (and so does `canlii.org`-hosted
access to Ontario court decisions specifically — see
`docs/SOURCING_NOTES.md` for the confirmed cases). The Supreme Court of
Canada's own decisions database, `decisions.scc-csc.ca`, is directly
fetchable via a plain `curl` request with an ordinary browser User-Agent
(also recorded in `docs/SOURCING_NOTES.md`) and doesn't strictly need this
folder — but SCC judgments are still saved here too, for the same reason
statutes get saved as `.doc` fallbacks: a durable, locally-readable copy
of the exact text a citation is based on, independent of whether a live
fetch happens to work in some future session. The earliest four SCC
judgments here (Mustapha, Garland, Kerr, Moore) predate the
`decisions.scc-csc.ca` finding and were retrieved via CanLII manually;
everything added afterward was fetched directly from
`decisions.scc-csc.ca`. The sourcing rule in `CLAUDE.md` section 2
requires that any source cited from this codebase be actually retrieved
and read, not cited from memory or approximation — saving a copy here,
however it was retrieved, is how "retrieved" stays durably true and how
"read" gets recorded.

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

---

**The 22 entries below** were bulk-retrieved in one session (Session 42)
against the case-law needs listed in `docs/SMALL_CLAIMS_TAXONOMY_ROADMAP.md`.
Every citation and case name given for that retrieval task was explicitly
UNVERIFIED (someone's recollection) — each entry below reflects what was
actually confirmed from the fetched document itself, not the original
description. This is retrieval and provenance only: none of these are
cited from any application content yet (no `educationTopics.ts` or
`claimTypes.ts` entry references them) — that's separate future work, one
case at a time, with its own scope-limit discipline. All 22 were
successfully retrieved; none failed.

**Naming convention note:** 7 of these predate the Supreme Court's
post-2001 neutral-citation ("20XX SCC ##") system, so there is no SCC
number to use in the filename — those use `<case-name>-<year>-<volume>-SCR-<page>`
instead (e.g. `waldick-v-malcolm-1991-2-SCR-456.pdf`), extending this
folder's naming convention for the first time to cases old enough not to
have a neutral citation at all.

**Verification note:** 6 of these are scanned, image-only PDFs from
before the Court's digital-native era, with no extractable text layer
(`pdftotext` returns nothing, and this environment has no OCR/PDF-
rendering tool). Each was still genuinely read, not just identified by
metadata: `decisions.scc-csc.ca/scc-csc/scc-csc/en/item/{id}/index.do?iframe=true`
(the same `{id}` as the PDF) renders the full judgment text as HTML even
when the PDF itself has none — confirmed case-by-case by reading real
paragraph content (party names, facts, holding) off that HTML page, not
just its `<title>` tag. See `docs/SOURCING_NOTES.md` for this technique
recorded in full. Those 6 are flagged individually below.

### `clements-v-clements-2012-SCC-32.pdf`

- **What it is:** Supreme Court of Canada judgment, *Clements v. Clements*
  — causation in negligence; whether "material contribution to risk" can
  substitute for "but for" causation (a motorcycle passenger's brain
  injury, with an intervening tire-puncture complicating factual
  causation). Already separately verified in an earlier session
  (paragraphs [1]-[63] confirmed present via direct PDF text); saved here
  for the first time in this session.
- **Neutral citation:** 2012 SCC 32
- **Retrieved from:** decisions.scc-csc.ca (id=9992)
- **Downloaded:** 2026-09-11

### `cooper-v-hobart-2001-SCC-79.pdf`

- **What it is:** Supreme Court of Canada judgment, *Cooper v. Hobart* —
  whether a statutory Registrar of Mortgage Brokers owed a private-law
  duty of care to investors for economic loss; reformulates the
  Anns/Kamloops test into the modern Anns-Cooper duty-of-care framework
  (proximity and foreseeability, then residual policy concerns).
- **Neutral citation:** 2001 SCC 79, [2001] 3 S.C.R. 537
- **Retrieved from:** decisions.scc-csc.ca (id=1920)
- **Downloaded:** 2026-09-11

### `ryan-v-victoria-city-1999-1-SCR-201.pdf`

- **What it is:** Supreme Court of Canada judgment, *Ryan v. Victoria
  (City)* — standard of care for a municipality/railway maintaining a
  street with an embedded railway flangeway gap that caught a
  motorcyclist's tire; addresses the statutory-authority defence to
  negligence and nuisance.
- **Citation:** [1999] 1 S.C.R. 201 (predates the neutral-citation system
  — confirmed directly: no "SCC ##"/"CSC ##" string appears anywhere in
  the judgment text).
- **Retrieved from:** decisions.scc-csc.ca (id=1679)
- **Downloaded:** 2026-09-11

### `waldick-v-malcolm-1991-2-SCR-456.pdf`

- **What it is:** Supreme Court of Canada judgment, *Waldick v. Malcolm*
  — occupiers' liability standard of care under Ontario's Occupiers'
  Liability Act (an icy, unsalted farmhouse parking area), and whether a
  claimed local custom of not salting/sanding can excuse an occupier's
  statutory duty of care.
- **Citation:** [1991] 2 S.C.R. 456 (predates the neutral-citation system).
- **Retrieved from:** decisions.scc-csc.ca (id=777). Scanned/image-only
  PDF with no text layer — read via the HTML-fallback route instead (see
  the verification note above); confirmed genuine by reading actual
  paragraph content (party names Waldick/Malcolm/Stainback/Hill, the
  icy-parking-area facts, Iacobucci J.'s reasons), not just page metadata.
- **Downloaded:** 2026-09-11

### `myers-v-peel-county-board-of-education-1981-2-SCR-21.pdf`

- **What it is:** Supreme Court of Canada judgment, *Myers v. Peel County
  Board of Education* — school supervision duty; a student was seriously
  injured attempting a gymnastics rings dismount without a spotter present.
- **Citation:** [1981] 2 S.C.R. 21 (predates the neutral-citation system).
- **Retrieved from:** decisions.scc-csc.ca (id=2521). Scanned/image-only
  PDF with no text layer — read via the HTML-fallback route; confirmed
  genuine by reading actual paragraph content (Gregory Myers, the rings
  dismount, spotter Michael Chilton), not just page metadata.
- **Downloaded:** 2026-09-11

### `sattva-capital-corp-v-creston-moly-corp-2014-SCC-53.pdf`

- **What it is:** Supreme Court of Canada judgment, *Sattva Capital Corp.
  v. Creston Moly Corp.* — the modern approach to contractual
  interpretation (a question of mixed fact and law, entitled to
  deference on appellate/judicial review), from a finance-fee dispute
  over a mining-claim purchase agreement.
- **Neutral citation:** 2014 SCC 53, [2014] 2 S.C.R. 633
- **Retrieved from:** decisions.scc-csc.ca (id=14302)
- **Downloaded:** 2026-09-11

### `bhasin-v-hrynew-2014-SCC-71.pdf`

- **What it is:** Supreme Court of Canada judgment, *Bhasin v. Hrynew* —
  recognizes a general organizing principle of good faith in contract law
  and a new common law duty of honest performance, from a dispute over
  non-renewal of an exclusive dealership agreement.
- **Neutral citation:** 2014 SCC 71, [2014] 3 S.C.R. 494
- **Retrieved from:** decisions.scc-csc.ca (id=14438)
- **Downloaded:** 2026-09-11

### `cm-callow-inc-v-zollinger-2020-SCC-45.pdf`

- **What it is:** Supreme Court of Canada judgment, *C.M. Callow Inc. v.
  Zollinger* — applies Bhasin's duty of honest performance: a party
  breaches it by actively deceiving a counterparty about its intent to
  exercise a termination clause, even where the clause itself is validly
  exercised.
- **Neutral citation:** 2020 SCC 45, [2020] 3 S.C.R. 908
- **Retrieved from:** decisions.scc-csc.ca (id=18613)
- **Downloaded:** 2026-09-11

### `fidler-v-sun-life-assurance-co-2006-SCC-30.pdf`

- **What it is:** Supreme Court of Canada judgment, *Fidler v. Sun Life
  Assurance Co. of Canada* — damages for mental distress caused by
  breach of a disability-insurance contract, where providing peace of
  mind was itself an object of the contract.
- **Neutral citation:** 2006 SCC 30, [2006] 2 S.C.R. 3
- **Retrieved from:** decisions.scc-csc.ca (id=2303)
- **Downloaded:** 2026-09-11

### `tercon-contractors-ltd-v-british-columbia-2010-SCC-4.pdf`

- **What it is:** Supreme Court of Canada judgment, *Tercon Contractors
  Ltd. v. British Columbia* — the modern three-step framework for
  enforcing exclusion-of-liability clauses (whether the clause applies on
  its wording, whether it was unconscionable at formation, and whether an
  overriding public policy should still render it unenforceable), from a
  public tendering dispute.
- **Neutral citation:** 2010 SCC 4, [2010] 1 S.C.R. 69
- **Retrieved from:** decisions.scc-csc.ca (id=7843)
- **Downloaded:** 2026-09-11

### `uber-technologies-inc-v-heller-2020-SCC-16.pdf`

- **What it is:** Supreme Court of Canada judgment, *Uber Technologies
  Inc. v. Heller* — found an arbitration clause in an Uber Eats driver's
  standard-form contract unconscionable and unenforceable given gross
  inequality of bargaining power and an improvident arbitration process,
  allowing the driver's class action to proceed.
- **Neutral citation:** 2020 SCC 16, [2020] 2 S.C.R. 118
- **Retrieved from:** decisions.scc-csc.ca (id=18406)
- **Downloaded:** 2026-09-11

### `queen-v-cognos-inc-1993-1-SCR-87.pdf`

- **What it is:** Supreme Court of Canada judgment, *Queen v. Cognos
  Inc.* — established that actual reliance is a necessary element of
  negligent misrepresentation, from a hiring/recruitment misrepresentation
  claim. (Given to the retrieving session as an unverified, possibly-
  garbled case name — it turned out to be a real, correctly-styled SCC
  case; no correction needed.)
- **Citation:** [1993] 1 S.C.R. 87 (predates the neutral-citation system).
- **Retrieved from:** decisions.scc-csc.ca (id=949). Scanned/image-only
  PDF with no text layer — read via the HTML-fallback route; confirmed
  genuine by reading actual paragraph content (Douglas J. Queen as
  appellant, the citation string itself appearing in the document body),
  not just page metadata.
- **Downloaded:** 2026-09-11

### `red-deer-college-v-michaels-1976-2-SCR-324.pdf`

- **What it is:** Supreme Court of Canada judgment, *Red Deer College v.
  Michaels* — an employer (a college) summarily dismissed instructors
  without cause; addresses the duty to mitigate damages and who bears the
  onus of showing reasonable efforts (or their absence) to find other
  employment.
- **Citation:** [1976] 2 S.C.R. 324 (predates the neutral-citation system).
- **Retrieved from:** decisions.scc-csc.ca (id=2693). Scanned/image-only
  PDF with no text layer — read via the HTML-fallback route; confirmed
  genuine by reading actual paragraph content (party names, "ON APPEAL
  FROM THE SUPREME COURT OF ALBERTA, APPELLATE DIVISION," the mitigation/
  onus subject matter), not just page metadata.
- **Downloaded:** 2026-09-11

### `southcott-estates-v-toronto-catholic-district-school-board-2012-SCC-51.pdf`

- **What it is:** Supreme Court of Canada judgment, *Southcott Estates
  Inc. v. Toronto Catholic District School Board* — a plaintiff seeking
  specific performance still has a duty to mitigate; addresses whether a
  single-purpose company with no other assets can satisfy that duty, in a
  land-sale-agreement breach dispute.
- **Neutral citation:** 2012 SCC 51, [2012] 2 S.C.R. 675
- **Retrieved from:** decisions.scc-csc.ca (id=12612)
- **Downloaded:** 2026-09-11

### `whiten-v-pilot-insurance-2002-SCC-18.pdf`

- **What it is:** Supreme Court of Canada judgment, *Whiten v. Pilot
  Insurance Co.* — the leading Canadian authority on the availability and
  quantum of punitive damages in contract, upholding a $1 million jury
  award after an insurer contested a homeowner's fire-insurance claim in
  bad faith.
- **Neutral citation:** 2002 SCC 18, [2002] 1 S.C.R. 595
- **Retrieved from:** decisions.scc-csc.ca (id=1956)
- **Downloaded:** 2026-09-11

### `pecore-v-pecore-2007-SCC-17.pdf`

- **What it is:** Supreme Court of Canada judgment, *Pecore v. Pecore* —
  presumption of resulting trust vs. presumption of advancement for
  gratuitous transfers into joint bank/investment accounts with right of
  survivorship (a father's transfer to his adult daughter).
- **Neutral citation:** 2007 SCC 17, [2007] 1 S.C.R. 795
- **Retrieved from:** decisions.scc-csc.ca (id=2355)
- **Downloaded:** 2026-09-11

### `machtinger-v-hoj-industries-1992-1-SCR-986.pdf`

- **What it is:** Supreme Court of Canada judgment, *Machtinger v. HOJ
  Industries Ltd.* — a termination clause providing less than the
  statutory minimum notice is null and void, entitling the employee to
  reasonable notice at common law instead of only the statutory minimum.
- **Citation:** [1992] 1 S.C.R. 986 (predates the neutral-citation system).
- **Retrieved from:** decisions.scc-csc.ca (id=872). Scanned/image-only
  PDF with no text layer — read via the HTML-fallback route; confirmed
  genuine by reading actual paragraph content (Machtinger and co-appellant
  Gilles Lefebvre, both dismissed by respondent HOJ Industries Ltd., the
  termination-clause facts), not just page metadata.
- **Downloaded:** 2026-09-11

### `honda-canada-v-keays-2008-SCC-39.pdf`

- **What it is:** Supreme Court of Canada judgment, *Honda Canada Inc. v.
  Keays* — reasonable-notice factors on wrongful dismissal (rejecting any
  presumption based on managerial level), and when aggravated/punitive
  damages are available for the manner of dismissal.
- **Neutral citation:** 2008 SCC 39, [2008] 2 S.C.R. 362
- **Retrieved from:** decisions.scc-csc.ca (id=5667)
- **Downloaded:** 2026-09-11

### `grant-v-torstar-2009-SCC-61.pdf`

- **What it is:** Supreme Court of Canada judgment, *Grant v. Torstar
  Corp.* — recognizes the defence of responsible communication on matters
  of public interest in defamation law, and sets out its elements
  alongside fair comment.
- **Neutral citation:** 2009 SCC 61, [2009] 3 S.C.R. 640
- **Retrieved from:** decisions.scc-csc.ca (id=7837)
- **Downloaded:** 2026-09-11

### `hill-v-church-of-scientology-1995-2-SCR-1130.pdf`

- **What it is:** Supreme Court of Canada judgment, *Hill v. Church of
  Scientology of Toronto* — leading Canadian defamation-damages case; the
  Charter doesn't itself create a cause of action against private
  parties, but common law defamation must be developed consistently with
  Charter values; rejects the U.S. "actual malice" standard.
- **Citation:** [1995] 2 S.C.R. 1130 (predates the neutral-citation system).
- **Retrieved from:** decisions.scc-csc.ca (id=1285). Scanned/image-only
  PDF with no text layer — read via the HTML-fallback route; confirmed
  genuine by reading actual paragraph content (the citation string itself,
  party/counsel names including Morris Manning), not just page metadata.
- **Downloaded:** 2026-09-11

### `grant-thornton-v-new-brunswick-2021-SCC-31.pdf`

- **What it is:** Supreme Court of Canada judgment, *Grant Thornton LLP
  v. New Brunswick* — sets the standard for when a claim is "discovered"
  under a limitations statute (actual or constructive knowledge of
  material facts sufficient to draw a plausible inference of the
  defendant's liability), from an auditor-negligence claim over
  loan-guarantee losses.
- **Neutral citation:** 2021 SCC 31, [2021] 2 S.C.R. 704
- **Retrieved from:** decisions.scc-csc.ca (id=18964)
- **Downloaded:** 2026-09-11

### `pioneer-corp-v-godfrey-2019-SCC-42.pdf`

- **What it is:** Supreme Court of Canada judgment, *Pioneer Corp. v.
  Godfrey* — a class-action price-fixing conspiracy case; addresses
  whether the common-law discoverability rule (or fraudulent concealment)
  extends the 2-year limitation period in Competition Act s. 36(4),
  alongside certification issues for umbrella purchasers.
- **Neutral citation:** 2019 SCC 42, [2019] 3 S.C.R. 295
- **Retrieved from:** decisions.scc-csc.ca (id=17917)
- **Downloaded:** 2026-09-11

### `oreg-114-99-table-of-forms.txt`

- **What it is:** the TABLE OF FORMS from **O. Reg. 114/99 (Family Law
  Rules)** — the regulation's own form numbers and titles, extracted
  verbatim as a pipe-delimited block. Unlike the case PDFs above, this is
  vendored to be *machine-read*, not just cited: `verifyFamilyForms.ts`
  parses it and compares every `officialTitle` in
  `familyFormsRegistry.ts` against it character for character.
- **Why a local copy:** a verification suite must not depend on a live
  fetch of ontario.ca. A network-dependent check is a check that passes
  silently when the network fails, which is worse than no check.
- **Citation:** O. Reg. 114/99, made under the Courts of Justice Act
- **Retrieved from:** https://www.ontario.ca/laws/docs/990114_e.doc,
  extracted with `antiword`
- **Consolidation period:** from 2026-05-01 to the e-Laws currency date
- **Downloaded:** 2026-09-13
- **Refreshing it:** re-run the `.doc` fetch, re-extract the block between
  "TABLE OF FORMS" and the closing "O. REG. 76/06, S. 14" amendment line,
  and keep the four-line provenance header. If a title changes, the suite
  will fail until the registry is updated to match — which is the point.

### `fla-cited-sections.txt` and `clra-cited-sections.txt`

- **What they are:** the *Family Law Act* and *Children's Law Reform Act*
  sections CourtSimplified cites, extracted verbatim — FLA ss. 1(1), 4(1),
  5, 7, 17, 29 and 46; CLRA s. 35. Like the TABLE OF FORMS, these are
  vendored to be *machine-read*: `verifyCitedProvisions.ts` parses them.
- **Why these sections:** they carry the family jurisdiction allocation
  (the "court" definitions in FLA ss. 1(1)/4(1)/17 and the two different
  "spouse" definitions in ss. 1(1)/29), the equalization limitation in
  s. 7(3), and the two restraining-order powers.
- **Why vendored at all:** FLA s. 46 and CLRA s. 35 each print a
  NOT-YET-IN-FORCE replacement inline, marked only by the prose note "On
  a day to be named by order of the Lieutenant Governor in Council". The
  check that catches an undeclared one has to read the text, and a
  verification suite must not depend on a live fetch.
- **Citations:** Family Law Act, R.S.O. 1990, c. F.3; Children's Law
  Reform Act, R.S.O. 1990, c. C.12
- **Retrieved from:** https://www.ontario.ca/laws/docs/90f03_e.doc and
  https://www.ontario.ca/laws/docs/90c12_e.doc, extracted with `antiword`
- **Consolidation periods:** FLA from 2026-05-01; CLRA from 2025-12-11
- **Downloaded:** 2026-09-13
- **Refreshing them:** re-fetch, re-extract the labelled blocks, keep the
  provenance header and the rule lines (the parser splits on them). If a
  refresh introduces a new "On a day to be named" note, the suite fails
  until someone reads the amendment and declares it. If a note DISAPPEARS,
  the amendment is in force and the vendored text is stale law — the suite
  fails for that too.
