# Content Audit — Session 45

**Read-and-report only. Nothing in this audit was fixed.** Triage and fix in a
follow-up session, prioritized by severity group below.

## Why this exists

Commit `ec5a3e6` found that `sc-claim-vehicle-accident-uninsured-driver-property-damage`
and `sc-claim-property-damaged-lost-in-business-care` each had a `plaintiffElement`
named "caused, in fact and in law" whose `plainExplanation` only ever described
the legal (remoteness) branch — the factual "but for" branch was promised by
the name and never delivered, and the cited source (Mustapha v. Culligan)
didn't cover it either. Three distinct failures in one entry: the name
promised more than the text delivered, the text itself was incomplete, and
the citation didn't support the full claim. It was found by accident, weeks
after it was created.

This audit systematically checked every sourced entry in the intake
registries against that same failure shape, plus two more: a missing scope
limit (the fence Mustapha's own entry states — what it is and isn't authority
for), and whether a better primary source is now available given the 26 SCC
judgments bulk-retrieved into `docs/sources/` in commit `eb976a6`.

**Scope covered:** every `plaintiffElement`, `defendantConsideration`, and
`proceduralNote` in all 22 `CLAIM_TYPES`; all 6 `DEFENCE_CONCEPTS`; all 8
`EDUCATION_TOPICS`; all 4 `REMEDY_TYPES`; all 3 `JURISDICTION_ROUTES`; every
`questionBank.ts` question carrying both a `why` and a `sourceUrl` (6
questions). Six parallel audits, each verifying claims against the actual
fetched primary source (statute `.doc` fallbacks, or the 26 SCC judgments in
`docs/sources/` — read via `pdftotext` where a text layer exists, via the
`decisions.scc-csc.ca` HTML-fallback technique where it doesn't), not against
this codebase's own description of what those sources say.

**The good news first:** `sc-topic-general-negligence-elements` and
`sc-topic-general-unjust-enrichment-elements` in `educationTopics.ts` — the
two entries built the same way as the defective causation elements (sourced
paragraph-by-paragraph from a full SCC judgment) — were independently
re-verified pinpoint-by-pinpoint (24 citations total) and found **fully
clean**. The Clements fix (commit `ec5a3e6`) resolved the originating defect
completely in the one place it was already known to exist.

---

## (a) Entries that state something the source doesn't support

### `src/lib/case-system/intake/claimTypes.ts`

**`sc-claim-breach-of-contract-goods` → plaintiffElement `goods-not-as-agreed`**
Name promises three fact patterns ("defective, not as described, or never
arrived"); citation is Sale of Goods Act s.15 (merchantable quality/fitness)
only. Confirmed by reading the Act directly: "not as described" is actually
s.14 ("goods will correspond with the description"), never mentioned;
"never arrived" (non-delivery) is s.26 ("duty of the seller to deliver the
goods"), never mentioned or cited. Two of three named scenarios have no
textual or citation support. (Also a name-vs-text mismatch — see (b).)

**`sc-claim-slip-and-fall-occupier-liability` → plaintiffElement `injury-and-connection`**
Asserts a causation-connection proposition, cited to the Occupiers' Liability
Act. Confirmed by reading the full Act text: it contains no causation
provision anywhere (only duty of care, assumption of risk, contractual
restriction, independent-contractor liability, landlord obligations). The
OLA does not cover this element at all.

**`sc-claim-slip-and-fall-occupier-liability` — the Occupiers' Liability Act citation itself is a stale snapshot.**
`officialUrl: https://www.ontario.ca/laws/docs/90o02_eV006.doc`, `verifiedAt:
2026-09-07`. The fetched document is headed *"HISTORICAL VERSION FOR THE
PERIOD DECEMBER 8, 2020 TO JANUARY 28, 2021"* and shows s.6.1 (the 60-day
snow/ice notice requirement) marked "not in force" — but s.6.1 has been in
force since January 29, 2021 (over 5 years). The cited version is superseded,
not the currently-controlling text, despite being "verified" only 4 days
before this audit.

**`sc-claim-consumer-protection-act-issue` → plaintiffElement `false-misleading-representation`**
Name asserts three disjunctive categories ("false, misleading, or
deceptive"). The cited page (`ontario.ca/page/your-rights-under-consumer-protection-act`),
fetched directly, states only that false information is illegal, with
examples that are all straightforward falsity. Nothing on the page addresses
"misleading" or "deceptive" as distinct from outright false. Citation
supports one of three named prongs.

**`sc-claim-recovery-of-personal-property` → plaintiffElement `value-within-jurisdiction-property`**
Text states the $50,000 cap "excluding interest and costs," cited to
`ontario.ca/page/suing-someone-small-claims-court`. That exact phrase is not
on that page — confirmed by direct fetch. The matching language is on a
different page (`ontario.ca/document/guide-procedures-small-claims-court/making-claim`),
which this same codebase already cites correctly for the identical
proposition elsewhere (`remedyTypes.ts`'s `sc-remedy-return-of-property`).

**`sc-claim-recovery-of-personal-property` → `proceduralNotes[0]`**
States the court "can order either the return of the property itself or
payment of its value in money," same citation as above. That page never
states this either/or remedy framing — the closest text describes what a
plaintiff should be ready to *prove*, not what a court may *order*. Not
supported anywhere in this codebase's own sourced material, including
`remedyTypes.ts`'s own entry on the identical topic.

**`sc-claim-commercial-tenancy-dispute` → plaintiffElement `amount-owing-commercial`**
Same "excluding interest and costs" citation defect as the personal-property
entry above — same wrong page cited for the same unsupported phrase.

**`sc-claim-used-vehicle-nondisclosure` → plaintiffElement `cancelled-within-90-days`**
Name implies the 90-day cancellation window is discovery-triggered ("within
the required window **after discovering the issue**"). Confirmed by reading
the actual regulation (O. Reg. 333/08 under the Motor Vehicle Dealers Act,
2002, s.50(5)): the clock runs from **vehicle delivery**, not discovery — a
buyer who discovers non-disclosure on day 95 is barred even if that was the
first reasonable opportunity to discover it. Neither the cited ontario.ca
overview page nor the actual rule supports a discovery trigger. (Also a
name-vs-text mismatch — see (b).)

**`sc-claim-unpaid-condo-common-expenses` → `proceduralNotes[0]`**
States the corporation's lien has priority "after the condominium was
created" — confirmed by reading Condominium Act s.86 directly: there is no
such temporal test. The actual rule is priority over every encumbrance
"even though the encumbrance existed before the lien arose," subject to
three named exceptions and conditioned on the corporation giving notice
(s.86(3)-(6)) — the note's framing doesn't match the actual mechanism.

**`sc-claim-defamation-libel-slander` → citations array, Libel and Slander Act pinpoint**
Pinpoint reads "s.7 scope limited to newspaper/broadcast." Confirmed by
reading the Act directly: s.7 actually reads "Subsection 5(1) and section 6
apply only to newspapers **printed and published in Ontario** and to
broadcasts **from a station in Ontario**" — a geographic limit, not a
newspaper/broadcast category limit (that's already established by ss.1/5/6).
The pinpoint mischaracterizes what the section does.

### `src/lib/case-system/intake/jurisdictionRoutes.ts`

**`sc-route-residential-tenancy-ltb`**
`whyNotSmallClaims`/`whereItGoes` assert residential tenancies "generally
belong at the Landlord and Tenant Board rather than Small Claims Court." The
cited page, fetched directly, establishes only two narrower things: that the
CTA governs commercial leases and the RTA governs residential ones, and that
a party can ask the LTB to determine *which* regime applies when that's
disputed. It says nothing about the LTB having general/primary jurisdiction
over residential tenancy money disputes to the exclusion of Small Claims —
the actual routing claim this entry exists to make has no citation
supporting it.

---

## (b) Entries incomplete against their own name

### `src/lib/case-system/intake/claimTypes.ts`

**`sc-claim-non-payment-goods-sold` → plaintiffElement `amount-unpaid-goods`**
Name: "The amount claimed is accurate and remains unpaid." Text: entirely
about how interest and costs are handled separately from the claimed
amount — a different topic. Neither accuracy nor non-payment is ever stated.

**`sc-claim-consumer-protection-act-issue` → plaintiffElement `loss-amount-cpa`**
Name: "A specific loss resulted." Text: the $50,000 jurisdiction cap. The
causal "a loss resulted" proposition the name asserts is never stated.

**`sc-claim-contractor-damage` → plaintiffElement `loss-amount-contractor`**
Name: "The amount claimed reflects the cost of repair or loss." Text: the
$50,000 jurisdiction cap. Same substitution — the name's substantive claim
(that the amount reflects real cost) is never stated.

**`sc-claim-non-payment-goods-sold` → plaintiffElement `goods-delivered`**
Name: "The goods were delivered or made available as agreed." Text opens
with an irrelevant jurisdictional sentence, then only thinly restates the
element name without substantively explaining "delivered" or "made
available as agreed." Milder version of the same pattern as the three
findings above — worth noting this is a **recurring pattern**, not isolated:
four instances of a jurisdiction-cap/interest-handling sentence standing in
for a substantively different named element, across three different claim
types built in the same session.

**`sc-claim-breach-of-contract-goods` → plaintiffElement `goods-not-as-agreed`**
(Listed fully under (a) above — the name-vs-text and citation defects are
the same finding, viewed from two sides.)

**`sc-claim-used-vehicle-nondisclosure` → plaintiffElement `cancelled-within-90-days`**
(Listed fully under (a) above — same dual defect.)

**`sc-claim-vehicle-accident-uninsured-driver-property-damage` → plaintiffElement `causation-vehicle-accident`**
The originating defect. Name: "The damage was caused, **in fact and in
law**, by the other driver's breach." Text states only the "in law"
(remoteness) branch. Citation is Mustapha v. Culligan, which doesn't cover
the "in fact" branch either. Not yet fixed — the Clements extension
(commit `ec5a3e6`) fixed the *education topic*, not this claim type's own
element, which still cites Mustapha alone.

**`sc-claim-property-damaged-lost-in-business-care` → plaintiffElement `causation-property-in-care`**
Identical defect, same shape: name "caused, in fact and in law," text only
states the legal branch, citation is Mustapha alone. Not yet fixed.

---

## (c) Entries missing a scope limit

### `src/lib/case-system/intake/claimTypes.ts`

**`sc-claim-slip-and-fall-occupier-liability` → `proceduralNotes[0]`**
States, unqualified, that claims are "generally subject to Ontario's
standard 2-year limitation period." No fence flags that Occupiers' Liability
Act s.6.1 requires **written notice within 60 days** for a personal-injury
claim caused by snow or ice, or the action is barred (subject to narrow
exceptions) — directly relevant given this claim type's own `signals` are
heavily ice/snow-weighted ("fell on ice," "never cleared the snow and I
fell," "took a bad fall on their property"). A user relying on the blanket
2-year statement for exactly this claim type's dominant fact pattern could
miss a deadline that permanently bars the claim.

**`sc-claim-consumer-cancellation-refund`** (claim-type-level, not one element)
The claim type's own **name** is "Cancelled contract — deposit or payment
not refunded **(Consumer Protection Act)**," scoping the whole entry to the
CPA. But the entry's own cited source states that 2 of the 5 listed
cooling-off categories (new-build condos, payday loans) are actually
governed by *other* statutes (Condominium Act, Payday Loans Act) with their
own, possibly different mechanics — never flagged anywhere in the entry.

**`sc-claim-used-vehicle-nondisclosure` → plaintiffElement `dealer-failed-to-disclose`**
Stated as a blanket rule ("a dealer must give the most accurate information
available"). The governing regulation (O. Reg. 333/08 s.50(1)) scopes this
disclosure/cancellation regime to sales by a **registered** motor vehicle
dealer only. The entry's own `proceduralNotes[0]` correctly scopes the
Compensation Fund note to "a registered dealer," but the disclosure element
itself carries no equivalent warning that a private-sale or unregistered
"curbsider" transaction isn't covered — even though the cited source page
has its own "Avoid curbsiders" section making exactly this point.

**`sc-claim-unpaid-overtime-vacation-pay` → plaintiffElement `vacation-pay-not-paid`**
States a blanket "at least 4%" entitlement with no exemption hedge. The
cited source states some jobs are exempt from the ESA's vacation-pay
provisions. The sibling element in the same claim type (`overtime-not-paid`)
correctly hedges with "For most employees…" for the equivalent
overtime-exemption issue — this element doesn't apply the same convention.

**`sc-claim-defamation-libel-slander` → plaintiffElements `notice-if-newspaper-or-broadcast` and `limitation-if-newspaper-or-broadcast`**
Both explain the newspaper/broadcast *category* definitions but omit the Act's
own s.7 *geographic* limit (the shortened 6-week notice/3-month limitation
regime applies only to Ontario-printed newspapers and Ontario-based
broadcast stations — see (a) above). A user dealing with an out-of-province
or national publisher/broadcaster has no way to know from this entry that
s.7 changes the analysis.

**`DEFENCE_CONCEPTS` → `defence-failure-to-mitigate`**
Written as a fully general damages-mitigation rule. The only source read for
it, Red Deer College v. Michaels, is an **employment/wrongful-dismissal**
case, and its holding is stated entirely in employment terms (whether the
plaintiff could have "procured other employment," entitlement to "the
salary fixed by the contract," onus "on the defaulting employer"). Nothing
in the judgment extends the rule to property-damage or reputational-damage
contexts — that generalization is this codebase's own inference (candidly
stated in the inline code comment, but not fenced anywhere in the
user-facing `plainExplanation`). This matters concretely: the concept is
wired into `sc-claim-defamation-libel-slander`,
`sc-claim-vehicle-accident-uninsured-driver-property-damage`, and
`sc-claim-property-damaged-lost-in-business-care` — none of them employment
claims — with no indication the only primary source is an employment case.

### `src/lib/case-system/intake/jurisdictionRoutes.ts`

**`sc-route-residential-tenancy-ltb`**
The file's own module header explicitly distinguishes this entry's question
(residential-vs-commercial classification) from a separate, still-open
question it names directly: the landlord-vs-**former**-tenant LTB/Small
Claims timing boundary, which `courtPathClassifier.ts`'s header calls
"confirmed unsourceable." That fence exists only in the header comment —
none of the entry's own fields (`matterDescription`, `whyNotSmallClaims`,
`whereItGoes`, or the `signals` array, which includes generic cues like "my
landlord" and "my apartment") state that this entry doesn't resolve the
former-tenant scenario. A reader — or any future logic keyed off `signals`
— has no way to know that from the entry itself.

---

## (d) Entries citable to a better source now available

### Confirmed real improvements

**`sc-claim-slip-and-fall-occupier-liability` → plaintiffElement `premises-not-reasonably-safe`**
Add **Waldick v. Malcolm, [1991] 2 S.C.R. 456** (`docs/sources/waldick-v-malcolm-1991-2-SCR-456.pdf`)
as a supplementary citation (not a replacement — the statute remains the
source of the duty itself). Read in full: it's an SCC decision squarely on
this Act's standard of care in exactly this claim type's dominant fact
pattern (icy, unsalted parking area), holding concretely that doing nothing
about known icy conditions is not reasonable care where inexpensive
precautions are available, that a residential/rural occupier gets no lower
standard than a commercial one, and that a claimed local custom of not
salting doesn't excuse the statutory duty. The bare statutory text states
only the abstract duty; Waldick is the primary authority for what it
concretely requires for snow/ice.

**`sc-claim-slip-and-fall-occupier-liability` → plaintiffElement `injury-and-connection`**
Replace the Occupiers' Liability Act citation (which doesn't cover causation
at all — see (a)) with Mustapha/Clements, already used elsewhere in this
same codebase (`educationTopics.ts`) for exactly this concept.

**`sc-claim-wrongful-dismissal` → plaintiffElement `notice-or-pay-not-given`**
Add **Machtinger v. HOJ Industries, [1992] 1 S.C.R. 986** and **Honda Canada
Inc. v. Keays, 2008 SCC 39**. Confirmed as a material gap, not a marginal
one: the element currently states only the ESA statutory-minimum notice
scale, but "wrongful dismissal" is a common-law cause of action for
reasonable notice, which is often far larger than the ESA floor. Honda
states the cause of action directly ("an action for wrongful dismissal is
based on an implied obligation... to give reasonable notice") and the
Bardal reasonable-notice factors; Machtinger holds a termination clause
providing less than the ESA minimum is void, entitling the employee to the
common-law reasonable-notice presumption instead. Any addition would need
its own Mustapha-style scope limit (general reasonable-notice concept and
factors only, not a computation the system performs, not authority on
aggravated/punitive damages per CLAUDE.md §3, and not a replacement for the
ESA-minimum floor, which still applies regardless).

**`sc-claim-consumer-protection-act-issue`**
Add **Uber Technologies Inc. v. Heller, 2020 SCC 16** for unconscionability.
The claim type's own `signals` array already includes "unconscionable
contract" — meaning the system already treats that fact pattern as
belonging here — but no element addresses unconscionability as a legal
concept at all. Uber v. Heller (gross inequality of bargaining power plus an
improvident bargain) is a real, currently-missing fit for a gap this entry's
own signal list already implies it covers.

**`sc-claim-used-vehicle-nondisclosure`**
Replace the general ontario.ca overview-page citation with **O. Reg. 333/08
(General) under the Motor Vehicle Dealers Act, 2002**, fetched directly via
the `.doc` fallback (`ontario.ca/laws/docs/080333_e.doc`). More precise than
the overview page and resolves both (a)/(c) findings above: s.42 lists the
specific disclosure items, s.50 states the cancellation mechanics precisely
including the delivery-triggered 90-day deadline and the registered-dealer
scope limit.

**`sc-claim-defamation-libel-slander`**
Add **Grant v. Torstar Corp., 2009 SCC 61** (the "responsible communication
on matters of public interest" defence — confirmed to extend to "blog
postings and other online media," not just journalists) as a new
`defendantConsideration`; the entry's only current defendantConsideration is
disputing the statement was made/false, and the claim type's own `signals`
include things like "posted a false review about me" that squarely raise
this defence. Add **Hill v. Church of Scientology of Toronto, [1995] 2
S.C.R. 1130** for the presumed-general-damages holding ("general damages...
are presumed from the very publication... and are awarded at large") and
its rejection of the U.S. "actual malice" standard — currently unstated
anywhere, and directly relevant to a possible misreading of the
`amount-within-jurisdiction-defamation` element's evidence framing, which
could otherwise be read as implying a plaintiff must document specific
financial loss to recover.

### Checked and rejected (confirmed NOT a fit — do not use)

**`sc-claim-personal-loan-between-individuals` → defendantConsideration `argues-it-was-a-gift`**
**Pecore v. Pecore does not close this gap.** Read in full. Pecore states a
genuinely general presumption-of-resulting-trust rule for gratuitous
transfers, but it answers a different question than this claim type turns
on: gift vs. resulting trust (who holds beneficial title to *transferred
property*), not gift vs. loan (whether a *repayment obligation* exists at
all). A loan is neither a gift nor a resulting trust — it's a debt created
by agreement. Pecore's own stated rationale also matters most when the
transferor is deceased or otherwise unable to testify to intent, the
opposite of the inter vivos, both-parties-available scenario this claim
type's own header already reasoned through. The claim type's header
reasoning for leaving gift-vs-loan unsourced still holds; do not cite Pecore
here.

Also checked and rejected as poor fits, with reasoning already recorded at
the point they were checked (see the underlying audit transcripts if the
reasoning needs to be re-examined): Sattva Capital and Tercon Contractors for
`sc-claim-contractor-damage`; Bhasin/Callow and Fidler for
`sc-claim-contractor-damage`; Sattva/Tercon/Bhasin/Callow/Fidler for
`sc-claim-consumer-protection-act-issue` (Uber v. Heller was the one fit
found there — see above); Fidler and Tercon for
`sc-claim-breach-of-contract-services`; Southcott Estates for
`sc-claim-consumer-cancellation-refund`; Sattva and Queen v. Cognos Inc. for
`sc-claim-vehicle-repair-dispute` and `sc-claim-used-vehicle-nondisclosure`.

### No stronger source found

No criterion-4 candidates were found for: `sc-claim-unpaid-debt-services`,
`sc-claim-improper-unauthorized-towing`, `sc-claim-dog-bite-animal-injury`,
`sc-claim-breach-of-contract-services`, `sc-claim-recovery-of-personal-property`,
`sc-claim-commercial-tenancy-dispute`, `sc-claim-dishonoured-nsf-cheque`,
`sc-claim-unpaid-overtime-vacation-pay`, `sc-claim-vehicle-repair-dispute`,
`sc-claim-unpaid-condo-common-expenses`, any `DEFENCE_CONCEPTS` entry other
than the mitigation scope-limit finding above, `remedyTypes.ts`, or two of
the three `jurisdictionRoutes.ts` entries. None of the 26 bulk-retrieved SCC
judgments (negligence, contract, damages, property/employment/defamation/
limitations) bear on these entries' actual subject matter (statutory
disclosure/pricing rules, strict-liability regimes, generic procedural
facts) more precisely than what's already cited.

---

## Entries confirmed clean (no defects found)

For completeness, so a future session doesn't re-audit these: `sc-claim-unpaid-debt-services`
(fully clean); `sc-claim-improper-unauthorized-towing` (fully clean);
`sc-claim-dog-bite-animal-injury` (fully clean — Dog Owners' Liability Act
text confirmed verbatim against every element); `sc-claim-dishonoured-nsf-cheque`
(fully clean); `sc-claim-vehicle-repair-dispute` (fully clean — every figure
confirmed word-for-word); `sc-claim-unpaid-overtime-vacation-pay`'s
`overtime-not-paid` and jurisdiction elements (44-hour/1.5x figures
confirmed word-for-word); `sc-claim-unpaid-condo-common-expenses`'s other
three sub-entries; `sc-claim-vehicle-accident-uninsured-driver-property-damage`'s
Insurance Act s.263 elements (confirmed word-for-word) and non-causation
content; `sc-claim-property-damaged-lost-in-business-care`'s non-causation
content, including its bailment-scope proceduralNote, called out by the
auditor as a good example of the scope-limit pattern done correctly;
`sc-claim-personal-loan-between-individuals`'s Limitations Act elements
(confirmed word-for-word); 5 of 6 `DEFENCE_CONCEPTS` (`defence-limitation-period-expired`,
`defence-no-agreement-existed`, `defence-set-off-or-counterclaim`,
`defence-waiver-release-assumption-of-risk`, `defence-contributory-negligence`
— all confirmed word-for-word against their sources); `sc-topic-general-negligence-elements`
and `sc-topic-general-unjust-enrichment-elements` in full (24 citations,
all confirmed); all 4 `remedyTypes.ts` entries; 2 of 3 `jurisdictionRoutes.ts`
entries (`sc-route-vehicle-property-damage-dcpd`, `sc-route-exceeds-jurisdiction-superior-court`);
all 6 sourced `questionBank.ts` questions.

---

## Suggested triage order

1. **The two known causation elements** (`causation-vehicle-accident`,
   `causation-property-in-care`) — the originating defect, still unfixed at
   the claim-type level even though the education topic is now correct.
2. **The four jurisdiction-cap-text-substitution entries** (`amount-unpaid-goods`,
   `loss-amount-cpa`, `loss-amount-contractor`, `goods-delivered`) — one
   mechanical fix pattern, same root cause, four instances.
3. **The stale Occupiers' Liability Act snapshot** — a live legal fact
   (s.6.1's 60-day notice requirement) is currently invisible to users of
   exactly the claim type whose own signals are ice/snow-heavy; also feeds
   the missing-scope-limit finding on the same claim type's limitation-period
   note.
4. **The "excluding interest and costs" wrong-citation pair** (`sc-claim-recovery-of-personal-property`,
   `sc-claim-commercial-tenancy-dispute`) — trivial fix, correct source
   already used elsewhere in the same codebase.
5. Everything else, roughly in the order listed above.
