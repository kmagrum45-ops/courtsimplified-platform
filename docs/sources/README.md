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

### `flr-cited-rules.txt`

- **What it is:** the rules of **O. Reg. 114/99 (Family Law Rules)** that
  CourtSimplified cites — r. 1 (scope, and the closed list of 24 Family
  Court municipalities in r. 1(3)), r. 13 (financial statements), and
  r. 35.1 (the affidavit, police records check and CAS records search
  required with a decision-making, parenting time or contact claim).
  Machine-read by `verifyCitedProvisions.ts` and `verifyStatusTriage.ts`,
  the latter checking all 24 municipality names against it rather than
  against the TypeScript copy.
- **Citation:** O. Reg. 114/99, made under the Courts of Justice Act
- **Retrieved from:** https://www.ontario.ca/laws/docs/990114_e.doc,
  extracted with `antiword`
- **Consolidation period:** from 2026-05-01 to the e-Laws currency date
- **Downloaded:** 2026-09-13
- **Refreshing it:** same procedure as the other vendored sources — keep
  the provenance header and the rule lines, which the parsers split on.

### `insurance-act-s263.txt`

- **What it is:** section 263 of the **Insurance Act, R.S.O. 1990, c. I.8**,
  the provision creating Ontario's direct-compensation scheme for property
  damage. Consolidation from 2026-01-01, retrieved 2026-09-14 via the e-Laws
  `.doc` route and `antiword`.
- **Why this section:** the claim-type element `dcpd-bar-does-not-apply`
  asserts the bar does not apply, which is a legal conclusion no user can
  answer. The depth question asks the underlying fact — was the other driver
  insured — and cites this section so the reader can see the rule rather than
  be told the answer.
- **The limbs that matter:** s. 263 (1) (c) applies the section only where at
  least one **other** automobile involved was insured; s. 263 (5) (a) is what
  removes the right of action against anyone but the insured's own insurer;
  s. 263 (2.2) allows an election not to recover from one's own insurer, which
  does not by itself restore a right of action against the other driver.

### `rcp-cited-rules.txt`

- **What it is:** the rules of **R.R.O. 1990, Reg. 194 (Rules of Civil
  Procedure)** that CourtSimplified's Superior Court content depends on —
  r. 16.09 (proof of service), r. 29.1.03 (discovery plan), r. 30.03
  (affidavit of documents), r. 31.05.1 (seven-hour examination limit),
  r. 48.02 (setting down), r. 48.14 (dismissal for delay), r. 50.02
  (pre-trial timing).
- **Why these:** the stage-completeness audit found the Superior Court
  stages state forms and deadlines but not service, filing or proof of
  service. These are the provisions that say what is actually required,
  and none of it could be written without them.
- **The citation form matters.** This regulation is correctly cited
  **R.R.O. 1990, Reg. 194**. "Ontario Regulation 194" and "O. Reg. 194/90"
  are common but imprecise; `app/legal-principles/page.tsx` currently uses
  the first of those.
- **The finding that most changes existing content:** r. 16.09 (1.1) gives
  a **lawyer's** certificate of service (Form 16B.1) — *lawyer only*. That
  is narrower than the Small Claims equivalent (O. Reg. 258/98, r. 8.09.1
  (3)), which covers a lawyer **or paralegal** (Form 8B). The two must not
  be described in the same words.
- **Citation:** R.R.O. 1990, Reg. 194, made under the Courts of Justice Act
- **Retrieved from:** https://www.ontario.ca/laws/docs/900194_e.doc,
  extracted with `antiword`
- **Consolidation period:** from 2026-09-01 to the e-Laws currency date
  (last amendment 275/26)
- **Downloaded:** 2026-09-17
- **Note:** sourcing only. No content has been written from it yet.

### `flr-stage-rules.txt`

- **What it is:** the procedural-stage rules of **O. Reg. 114/99 (Family
  Law Rules)** — r. 2 (1) (the definition of "file"), r. 6 (19) (proof of
  service), r. 8 (1) (starting a case), r. 10 (answering, and reply),
  r. 14 (motions for temporary orders), r. 17 (1) (conferences).
- **Why it is a SEPARATE file from `flr-cited-rules.txt`:** that file is
  machine-read by `verifyCitedProvisions.ts` and `verifyStatusTriage.ts`,
  which split on its rule lines. Appending to it for an editorial need
  risks breaking two parsers for no benefit. A second file costs nothing.
- **Two findings worth carrying forward:**
  - **r. 6 (19) (f)** gives a **lawyer or paralegal's** certificate of
    service (**Form 6C**) on the same condition as Small Claims 8B —
    served it or caused it to be served, and satisfied service was
    effected. So Family matches Small Claims here and Superior Court does
    not.
  - **r. 2 (1) defines "file" as "to file, WITH PROOF OF SERVICE where
    service is required"**. Family content that says "serve and file"
    is therefore already accurate as a matter of law — but a
    self-represented reader has no way to know that, which is an argument
    for stating it rather than for leaving it implied.
- **Citation:** O. Reg. 114/99, made under the Courts of Justice Act
- **Retrieved from:** https://www.ontario.ca/laws/docs/990114_e.doc,
  extracted with `antiword`
- **Consolidation period:** from 2026-05-01 to the e-Laws currency date
  (last amendment 228/25)
- **Downloaded:** 2026-09-17
- **Note:** sourcing only. No content has been written from it yet.

### `oreg-258-98-cited-rules.txt`

> **Updated 2026-09-17: rr. 8.09.1, 9.01, 10.03, 15.01 and 1.06 (3)
> appended.** Same document, same consolidation (from 2025-10-14),
> extracted the same way. Retrieved because the stage-completeness audit
> found proof of service missing from four stages that discuss service, and
> none of the underlying rules were vendored.
>
> - **r. 8.09.1** — how service is proved: affidavit of service (Form 8A)
>   by the person who served it, or a **lawyer or paralegal's** certificate
>   of service (Form 8B) where that licensee served it or caused it to be
>   served *and is satisfied service was effected*. The condition is part
>   of the rule; "for licensees" alone understates it.
> - **r. 9.01 / r. 10.03** — a defence is served on every other party and
>   **filed with proof of service**.
> - **r. 15.01 (3)–(5)** — a notice of motion is served at least 7 days
>   before the hearing and **filed, with proof of service**, at least 3
>   days before; responding and supplementary affidavits at least 2 days.
> - **r. 1.06 (3)** — **Form 1A is a continuation sheet** for listing
>   parties that do not fit on a form's first page. It is not a mechanism
>   for adding a party, which is how `app/legal-principles/page.tsx`
>   currently reads.

> **Updated 2026-09-14: rr. 11.01–11.06 (default proceedings) appended.**
> Same document, same consolidation (from 2025-10-14), extracted the same
> way. Retrieved because a user who records a default needs to know what the
> rule provides, and nothing in the repo stated it.
>
> **Forms rule 11 names:** Form 9B (request to note a defendant in default —
> "may be made in", not required; also the form a request for an assessment
> hearing "may be in"), Form 11A (affidavit for jurisdiction, needed before
> the clerk may note anyone in default where ALL defendants were served
> outside the territorial division), Form 11B (default judgment, signed by
> the clerk), Form 15A (notice of motion and supporting affidavit, for a
> motion in writing for an assessment of damages).

- **What it is:** the trial and enforcement rules of **O. Reg. 258/98
  (Rules of the Small Claims Court)** — rr. 16–18 (trial scheduling,
  trial management conference, trial) and r. 20 (enforcement of orders).
- **Why these:** they are the two `legal_form_mapping_rules` stages that
  have zero coverage today AND can be sourced. A user at trial or in
  enforcement currently gets an empty form list. The other two uncovered
  stages, `urgent` and `not-sure`, are not procedural stages in the rules
  and have no provision to cite.
- **Forms these rules name:** r. 16.01(1) — request to the clerk to fix a
  date for trial (Form 9B); r. 20 — affidavit for enforcement request
  (Form 20P), certificate of judgment (Form 20A), writ of delivery
  (Form 20B), writs of seizure and sale (Forms 20C, 20D), renewal
  (Form 20N).
- **Citation:** O. Reg. 258/98, made under the Courts of Justice Act
- **Retrieved from:** https://www.ontario.ca/laws/docs/980258_e.doc,
  extracted with `antiword`
- **Consolidation period:** from 2025-10-14 to the e-Laws currency date
- **Downloaded:** 2026-09-13
- **Note:** sourcing only. No `legal_form_mapping_rules` row has been
  written from this; that is a separate decision under CLAUDE.md §6.

## Decisions from the courts' own databases (2026-09-30)

Fetched by the **CourtSimplified Fetch Decisions** workflow on a GitHub runner
(run 36752823868, branch `sources-vendor-decisions-36752823868`), text
extracted with `pdftotext -layout`, saved under `docs/sources/decisions/`.
Downloaded 2026-09-30. Cited in `src/lib/content-library/crossForumNotes.ts`;
`npm run test:cross-forum-notes` checks every quote against these files.

| File | Neutral citation | Retrieved from |
|---|---|---|
| `decisions/kaiman-v-graham-2009-ONCA-77.txt` | Kaiman v. Graham, 2009 ONCA 77 | https://coadecisions.ontariocourts.ca/coa/coa/en/8644/1/document.do |
| `decisions/letestu-estate-v-ritlyn-2017-ONCA-442.txt` | Letestu Estate v. Ritlyn Investments Limited, 2017 ONCA 442 | https://coadecisions.ontariocourts.ca/coa/coa/en/15837/1/document.do |
| `decisions/jesan-real-estate-v-doyle-2020-ONCA-714.txt` | Jesan Real Estate Ltd. v. Doyle, 2020 ONCA 714 | https://coadecisions.ontariocourts.ca/coa/coa/en/19170/1/document.do |
| `decisions/jaffer-v-york-university-2010-ONCA-654.txt` | Jaffer v. York University, 2010 ONCA 654 | https://coadecisions.ontariocourts.ca/coa/coa/en/9970/1/document.do |
| `decisions/brake-v-pj-m2r-restaurant-2017-ONCA-402.txt` | Brake v. PJ-M2R Restaurant Inc., 2017 ONCA 402 | https://coadecisions.ontariocourts.ca/coa/coa/en/15800/1/document.do |
| `decisions/danyluk-v-ainsworth-2001-SCC-44.txt` | Danyluk v. Ainsworth Technologies Inc., 2001 SCC 44 | https://decisions.scc-csc.ca/scc-csc/scc-csc/en/1882/1/document.do |
| `decisions/danyluk-v-ainsworth-2001-SCC-44.english.txt` | (derived: English column of the above) | -- |
| `decisions/kerr-v-baranow-2011-SCC-10.english.txt` | (derived: English column of `kerr-v-baranow-2011-SCC-10.pdf`, above; Kerr v. Baranow, 2011 SCC 10) | derived 2026-09-30; cited to users as https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/7922/index.do (id confirmed by a search of that site the same day) |

The case page cited to users is `.../en/item/{id}/index.do` with the same id.
None of these has been noted up (see "Noting up" in docs/SOURCING_NOTES.md).

## Derived text of the saved judgments, for retrieval (2026-10-05)

Text files derived from the judgments above, so retrieval
(`src/lib/case-system/retrieval/decisionChunker.ts`) can search and quote
them. Nothing new was retrieved for these except where stated; each is the
same judgment as the file it is derived from, and the registry that names
them is `scripts/retrieval/decisionSources.ts`.

- `decisions/<name>.english.txt` for each S.C.R. PDF above that has a text
  layer (19 files): the English column of `pdftotext -layout`, by
  `npm run sources:decisions-text` (`scripts/sources/deriveDecisionText.ts`).
  Paragraph numbers printed in the outer margin are kept; soft hyphens
  removed; a word broken across lines joined only when the joined word
  appears elsewhere in the same judgment. The two `.english.txt` files that
  already existed (Kerr, Danyluk) were left as they were.
- `decisions/<name>.html.txt` for the six scanned PDFs with no text layer
  (Hill, Machtinger, Myers, Queen v. Cognos, Red Deer College, Waldick):
  the judgment's HTML page on `decisions.scc-csc.ca`
  (`.../en/item/{id}/index.do?iframe=true`, the ids in
  `src/lib/content-library/publicSourceUrl.ts`), fetched by the Fetch
  Decisions workflow, run 37304655081, on 2026-10-05, and cleaned by
  `scripts/sources/deriveDecisionText.ts --html` (page CSS and scripts
  removed, tag remnants stripped). These judgments have no paragraph
  numbers, so passages from them carry the case citation without a pinpoint.

None of these has been noted up (see "Noting up" in docs/SOURCING_NOTES.md),
and every passage shown to a user from one says so.

## Courthouse location pages (2026-09-30)

`docs/sources/court-locations/<slug>.txt`: the text of each of the 65
Ontario Superior Court of Justice location pages
(`https://www.ontariocourts.ca/scj/locations/<slug>/`, listed at
https://www.ontariocourts.ca/scj/court-locations/all-court-locations/),
fetched 2026-09-30 by the Fetch Decisions workflow (run 36769153083), from the
location heading onward with tags and scripts removed. The directory in
`src/lib/content-library/courts/courtLocations.json` is extracted from the same
pages; `npm run test:court-locations` checks every value against these files.

`docs/sources/court-locations/ocj-courthouse-email-addresses.txt`: the Ontario
Court of Justice's list of courthouse email addresses by region
(https://www.ontariocourts.ca/ocj/courthouse-email-addresses/), fetched
2026-09-30 by the Fetch Decisions workflow (run 36772144591), tags, scripts
and HTML comments removed. 58 courthouses; source of
`src/lib/content-library/courts/ocjCourthouses.json`.

## Decisions added 2026-10-05 for the coverage gaps

Each fetched by the CourtSimplified Fetch Decisions workflow from the court's own
site (never CanLII), and read from the text saved here. Supreme Court judgments
are read from the judgment frame (`index.do?iframe=true`) of the decision's page
and converted to plain text (markup removed; paragraphs and their numbers kept;
older judgments' bare paragraph numbers written as `[n]`, only where they run in
sequence). "Retrieved for" names the question the decision was fetched for, not
what it decides; nothing is said about any of them except in its own words.

### `decisions/vancouver-city-v-ward-2010-SCC-27.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Vancouver (City) v. Ward*.
- **Citation:** 2010 SCC 27, [2010] 2 S.C.R. 28
- **Retrieved for:** damages for a breach of the Charter (s. 24 (1)).
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/7868/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/henry-v-british-columbia-2015-SCC-24.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Henry v. British Columbia (Attorney General)*.
- **Citation:** 2015 SCC 24, [2015] 2 S.C.R. 214
- **Retrieved for:** Charter damages for wrongful non-disclosure by prosecutors.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/15329/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/moore-v-british-columbia-education-2012-SCC-61.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Moore v. British Columbia (Education)*.
- **Citation:** 2012 SCC 61, [2012] 3 S.C.R. 360
- **Retrieved for:** what a discrimination claim must show.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/12680/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/saadati-v-moorhead-2017-SCC-28.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Saadati v. Moorhead*.
- **Citation:** 2017 SCC 28, [2017] 1 S.C.R. 543
- **Retrieved for:** recovery for mental injury in negligence.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/16664/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/rankin-v-jj-2018-SCC-19.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Rankin (Rankin’s Garage & Sales) v. J.J.*.
- **Citation:** 2018 SCC 19, [2018] 1 S.C.R. 587
- **Retrieved for:** whether a duty of care exists.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/17085/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/nelson-city-v-marchi-2021-SCC-41.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Nelson (City) v. Marchi*.
- **Citation:** 2021 SCC 41, [2021] 3 S.C.R. 55
- **Retrieved for:** negligence claims against public authorities.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/19036/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/hryniak-v-mauldin-2014-SCC-7.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Hryniak v. Mauldin*.
- **Citation:** 2014 SCC 7, [2014] 1 S.C.R. 87
- **Retrieved for:** summary judgment in Ontario.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/13427/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/pintea-v-johns-2017-SCC-23.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Pintea v. Johns*.
- **Citation:** 2017 SCC 23, [2017] 1 S.C.R. 470
- **Retrieved for:** self-represented litigants.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/16589/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/andrews-v-grand-and-toy-1978-2-SCR-229.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Andrews v. Grand & Toy Alberta Ltd.*.
- **Citation:** [1978] 2 S.C.R. 229
- **Retrieved for:** damages for personal injury.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/2587/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/snell-v-farrell-1990-2-SCR-311.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Snell v. Farrell*.
- **Citation:** [1990] 2 S.C.R. 311
- **Retrieved for:** proving causation.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/634/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/matthews-v-ocean-nutrition-2020-SCC-26.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Matthews v. Ocean Nutrition Canada Ltd.*.
- **Citation:** 2020 SCC 26, [2020] 3 S.C.R. 64
- **Retrieved for:** damages on dismissal without reasonable notice.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/18496/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/potter-v-nb-legal-aid-2015-SCC-10.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Potter v. New Brunswick Legal Aid Services Commission*.
- **Citation:** 2015 SCC 10, [2015] 1 S.C.R. 500
- **Retrieved for:** constructive dismissal.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/14677/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/dbs-v-srg-2006-SCC-37.html.txt`

- **What it is:** Supreme Court of Canada judgment, *D.B.S. v. S.R.G.; L.J.W. v. T.A.R.; Henry v. Henry; Hiemstra v. Hiemstra*.
- **Citation:** 2006 SCC 37, [2006] 2 S.C.R. 231
- **Retrieved for:** retroactive child support.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/2311/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/michel-v-graydon-2020-SCC-24.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Michel v. Graydon*.
- **Citation:** 2020 SCC 24, [2020] 2 S.C.R. 763
- **Retrieved for:** retroactive child support.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/18460/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/colucci-v-colucci-2021-SCC-24.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Colucci v. Colucci*.
- **Citation:** 2021 SCC 24, [2021] 2 S.C.R. 3
- **Retrieved for:** retroactively changing child support.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/18909/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/barendregt-v-grebliunas-2022-SCC-22.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Barendregt v. Grebliunas*.
- **Citation:** 2022 SCC 22, [2022] 1 S.C.R. 517
- **Retrieved for:** relocation of a child.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/19396/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/bracklow-v-bracklow-1999-1-SCR-420.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Bracklow v. Bracklow*.
- **Citation:** [1999] 1 S.C.R. 420
- **Retrieved for:** the bases of spousal support.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/1688/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/moge-v-moge-1992-3-SCR-813.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Moge v. Moge*.
- **Citation:** [1992] 3 S.C.R. 813
- **Retrieved for:** spousal support.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/946/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/miglin-v-miglin-2003-SCC-24.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Miglin v. Miglin*.
- **Citation:** 2003 SCC 24, [2003] 1 S.C.R. 303
- **Retrieved for:** spousal support where there is a separation agreement.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/2055/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/rick-v-brandsema-2009-SCC-10.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Rick v. Brandsema*.
- **Citation:** 2009 SCC 10, [2009] 1 S.C.R. 295
- **Retrieved for:** disclosure in negotiating separation agreements.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/6396/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/pointes-protection-2020-SCC-22.html.txt`

- **What it is:** Supreme Court of Canada judgment, *1704604 Ontario Ltd. v. Pointes Protection Association*.
- **Citation:** 2020 SCC 22, [2020] 2 S.C.R. 587
- **Retrieved for:** Courts of Justice Act s. 137.1 (motions to dismiss a lawsuit about expression on a matter of public interest).
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/18458/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/wic-radio-v-simpson-2008-SCC-40.html.txt`

- **What it is:** Supreme Court of Canada judgment, *WIC Radio Ltd. v. Simpson*.
- **Citation:** 2008 SCC 40, [2008] 2 S.C.R. 420
- **Retrieved for:** the defence of fair comment in defamation.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/5670/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/bce-v-1976-debentureholders-2008-SCC-69.html.txt`

- **What it is:** Supreme Court of Canada judgment, *BCE Inc. v. 1976 Debentureholders*.
- **Citation:** 2008 SCC 69, [2008] 3 S.C.R. 560
- **Retrieved for:** the oppression remedy.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/6238/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/miazga-v-kvello-estate-2009-SCC-51.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Miazga v. Kvello Estate*.
- **Citation:** 2009 SCC 51, [2009] 3 S.C.R. 339
- **Retrieved for:** malicious prosecution.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/7827/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/nelles-v-ontario-1989-2-SCR-170.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Nelles v. Ontario*.
- **Citation:** [1989] 2 S.C.R. 170
- **Retrieved for:** malicious prosecution and Crown immunity.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/499/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/vout-v-hay-1995-2-SCR-876.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Vout v. Hay*.
- **Citation:** [1995] 2 S.C.R. 876
- **Retrieved for:** proving a will and suspicious circumstances.
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/1273/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-05 (Fetch Decisions runs 37397793266, 37397959991)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/jones-v-tsige-2012-ONCA-32.txt`

- **What it is:** Court of Appeal for Ontario decision, *Jones v. Tsige*.
- **Citation:** 2012 ONCA 32
- **Retrieved for:** a civil claim for invasion of privacy.
- **Retrieved from:** https://coadecisions.ontariocourts.ca/coa/coa/en/10962/1/document.do (case page item/10962); text by `pdftotext -layout`
- **Downloaded:** 2026-10-05 (Fetch Decisions run 37397793266)
- **Noted up:** no

### `decisions/waksdale-v-swegon-2020-ONCA-391.txt`

- **What it is:** Court of Appeal for Ontario decision, *Waksdale v. Swegon North America Inc.*.
- **Citation:** 2020 ONCA 391
- **Retrieved for:** termination clauses in employment contracts.
- **Retrieved from:** https://coadecisions.ontariocourts.ca/coa/coa/en/18855/1/document.do (case page item/18855); text by `pdftotext -layout`
- **Downloaded:** 2026-10-05 (Fetch Decisions run 37397793266)
- **Noted up:** no

### `decisions/antrim-truck-centre-v-ontario-2013-SCC-13.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Antrim Truck Centre Ltd. v. Ontario (Transportation)*.
- **Citation:** 2013 SCC 13, [2013] 1 S.C.R. 594
- **Retrieved for:** private nuisance (noise, smoke, trees, interference with land between neighbours).
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/12887/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-07 (Fetch Decisions run 37702811464)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/non-marine-underwriters-v-scalera-2000-SCC-24.html.txt`

- **What it is:** Supreme Court of Canada judgment, *Non-Marine Underwriters, Lloyd's of London v. Scalera*.
- **Citation:** 2000 SCC 24, [2000] 1 S.C.R. 551
- **Retrieved for:** battery and the trespass torts (a civil claim for assault or battery).
- **Retrieved from:** https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/1786/index.do (judgment frame `?iframe=true`)
- **Downloaded:** 2026-10-07 (Fetch Decisions run 37702811464)
- **Noted up:** no (see SOURCING_NOTES, "Noting up")

### `decisions/merrifield-v-canada-2019-ONCA-205.txt`

- **What it is:** Court of Appeal for Ontario decision, *Merrifield v. Canada (Attorney General)*.
- **Citation:** 2019 ONCA 205
- **Retrieved for:** whether Ontario law has a civil claim for harassment.
- **Retrieved from:** https://www.ontariocourts.ca/decisions/2019/2019ONCA0205.htm
- **Downloaded:** 2026-10-07 (Fetch Decisions run 37702811464)
- **Noted up:** no

### `decisions/tms-lighting-v-kjs-transport-2014-ONCA-1.txt`

- **What it is:** Court of Appeal for Ontario decision, *TMS Lighting Ltd. v. KJS Transport Inc.*.
- **Citation:** 2014 ONCA 1
- **Retrieved for:** proving damages in nuisance and trespass between neighbouring properties.
- **Retrieved from:** https://www.ontariocourts.ca/decisions/2014/2014ONCA0001.htm
- **Downloaded:** 2026-10-07 (Fetch Decisions run 37710019914)
- **Noted up:** no
