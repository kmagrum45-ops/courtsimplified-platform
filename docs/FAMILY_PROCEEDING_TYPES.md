# Family Proceeding Types — the scope map

**Status: a map, not content.** No elements, no questions, no user-facing text.
This is the family equivalent of the 22 Small Claims `ClaimType`s: the list of
things a person can actually start in an Ontario family court, what each one
arises under, and where it goes.

**Everything below was retrieved and read on 2026-09-13.** Nothing here is
written from recall. Sources, with the consolidation each document declares in
its own header:

| Source | Route | Currency |
|---|---|---|
| Courts of Justice Act, R.S.O. 1990, c. C.43 | `ontario.ca/laws/docs/90c43_e.doc` | from 2025-12-11 |
| Family Law Act, R.S.O. 1990, c. F.3 | `ontario.ca/laws/docs/90f03_e.doc` | from 2026-05-01 |
| Children's Law Reform Act, R.S.O. 1990, c. C.12 | `ontario.ca/laws/docs/90c12_e.doc` | from 2025-12-11 |
| Child, Youth and Family Services Act, 2017, S.O. 2017, c. 14, Sched. 1 | `ontario.ca/laws/docs/17c14_e.doc` | retrieved 2026-09-13 |
| O. Reg. 114/99, Family Law Rules | `ontario.ca/laws/docs/990114_e.doc` | from 2026-05-01 |
| O. Reg. 391/97, Child Support Guidelines (Ontario) | `ontario.ca/laws/docs/970391_e.doc` | from 2024-07-26 |
| Divorce Act, R.S.C. 1985, c. 3 (2nd Supp.) | `laws-lois.justice.gc.ca/eng/acts/D-3.4/FullText.html` | current to 2026-07-21 |
| Federal Child Support Guidelines, SOR/97-175 | `laws-lois.justice.gc.ca/eng/regulations/SOR-97-175/` | current to 2026-07-21 |

`17c14_e.doc` and `970391_e.doc` are new routes this session — neither was in
`SOURCING_NOTES.md`. Both are recorded there now.

---

## 1. The jurisdiction spine

### 1.1 What counts as a family proceeding at all

**CJA s. 21.8 Schedule** and **FLR r. 1(2)** are the same list said twice — one
as the Family Court's subject matter, one as the Rules' scope. Read together
they are the outer boundary of this build. The Schedule, quoted:

> **1.** PROCEEDINGS UNDER THE FOLLOWING STATUTORY PROVISIONS: Change of Name
> Act; Child, Youth and Family Services Act, 2017, Parts V, VII and VIII;
> Children's Law Reform Act, except sections 59 and 60; Civil Marriage Act
> (Canada); Divorce Act (Canada); Family Homes on Reserves and Matrimonial
> Interests or Rights Act (Canada); Family Law Act, except Part V; Family
> Responsibility and Support Arrears Enforcement Act, 1996; International
> Recovery of Child Support and Family Maintenance Convention Act, 2023;
> Interjurisdictional Support Orders Act, 2002; Marriage Act, section 6.
> **2.** Proceedings for the interpretation, enforcement or variation of a
> marriage contract, cohabitation agreement, separation agreement, paternity
> agreement, family arbitration agreement or family arbitration award.
> **3.** Proceedings for relief by way of constructive or resulting trust or a
> monetary award as compensation for unjust enrichment between persons who have
> cohabited. **4.** Proceedings for annulment of a marriage or for a declaration
> of validity or invalidity of a marriage. **5.** Appeals of family arbitration
> awards under the Arbitration Act, 1991. **6.** Proceedings under First Nation
> laws made under [FHRMIRA or the First Nations Land Management Act], with
> respect to the effect of relationship breakdown on matrimonial real property.
> **7.** Any other family law proceedings that may be prescribed by the
> regulations.

Item 7 is an empty hook — no prescribing regulation was located, and I did not
search exhaustively for one. Treat item 7 as "nothing to build" and re-check
before relying on that.

### 1.2 The two carve-outs, now closed

Both gaps that blocked this list are resolved, and both resolve the same way —
the excluded provisions are **not family disputes at all**.

**CLRA ss. 59 and 60** — read directly. s. 59(1) lets *"the Superior Court of
Justice by order … require or approve … the disposition or encumbrance of all
or part of the interest of the child in land [or] the sale of the interest of
the child in personal property"*, on notice to the Children's Lawyer, and only
where the court thinks it *"necessary or proper for the support or education of
the child or will substantially benefit the child"* (s. 59(2)). s. 60(1) lets
the Superior Court order that proceeds of property held under a life estate
*"with power to devise or appoint the property to one or more of his or her
children"* be used for those children's support. **These are estate and
property-administration matters about a child's assets**, they name the
Superior Court of Justice in the section text itself, and that is why they sit
outside the Family Court's list. Nothing here belongs in this build.

**FLA Part V** is headed *"DEPENDANTS' CLAIM FOR DAMAGES"* — a tort action. Out
for the same reason.

### 1.3 Which court — the answer is in each statute's definition of "court"

This is the whole allocation, and it is not in the CJA. Each statute defines
its own "court", and the differences are the routing rules:

| Statute | "court" means | Verified at |
|---|---|---|
| **Divorce Act** | *"for the Province of Ontario, the Superior Court of Justice"* | s. 2(1) |
| **FLA generally** | OCJ, Family Court of the SCJ, **or** SCJ | s. 1(1) |
| **FLA Part I (Family Property)** | as s. 1(1) *"but does not include the Ontario Court of Justice"* | s. 4(1) |
| **FLA Part II (Matrimonial Home)** | as s. 1(1) *"but does not include the Ontario Court of Justice"* | s. 17 |
| **CLRA** | OCJ, Family Court, **or** SCJ | s. 18 |
| **CYFSA** | *"the Ontario Court of Justice or the Family Court of the Superior Court of Justice"* | s. 2(1) |

Four consequences, each load-bearing for routing:

1. **No Divorce Act relief ever sits in the Ontario Court of Justice.** Divorce,
   and every corollary order (parenting, contact, child support, spousal
   support, variation), is Superior Court / Family Court only.
2. **No property claim ever sits in the OCJ.** Equalization and matrimonial-home
   relief are excluded from the OCJ by the Part I and Part II definitions.
3. **Child protection never sits in the plain Superior Court** — the CYFSA
   definition names only the OCJ and the Family Court.
4. **Support and parenting can go either way** outside the 24 municipalities.
   That is the only genuinely ambiguous routing decision a user faces, and it is
   where the build has to ask rather than assume.

### 1.4 Inside vs outside the 24 municipalities

**CJA s. 21.8(1):** *"In the parts of Ontario where the Family Court has
jurisdiction, proceedings referred to in the Schedule to this section, except
appeals and prosecutions, shall be commenced, heard and determined in the Family
Court."* Inside those municipalities the three-way choice collapses: one court,
everything together.

**FLR r. 1(3)** names them, a closed list of 24 — Durham, Elgin, Frontenac,
Haldimand-Norfolk, Haliburton, Hamilton, Hastings, Kawartha Lakes, Lanark, Leeds
and Grenville, Lennox and Addington, Middlesex, Muskoka, Niagara, Northumberland,
Ottawa, Peterborough, Prescott and Russell, Prince Edward, Renfrew, Simcoe,
Stormont Dundas and Glengarry, Waterloo, York. **Toronto is not on it.**

Three more rules that matter for a self-represented person:

- **s. 21.11(1)** — a Family Court case may be commenced there if *either* the
  applicant *or* the respondent resides in one of the 24.
- **s. 21.9** — a related matter **not** in the Schedule can be heard with the
  family case only **with leave of the judge**. This is the route for the
  ordinary civil claim tangled into a separation.
- **s. 21.11(3)–(4)** — transfers both ways on motion, where *"the preponderance
  of convenience"* favours it.

---

## 2. The proceeding types

Grouped by the statute that governs, because that is what the user's situation
actually determines. **"Table-driven / discretionary / mixed"** below means: is
the outcome computed from inputs, or judged?

### Group A — Divorce Act (married spouses; SCJ or Family Court only)

The Divorce Act applies only where a divorce is sought or has been granted. A
married couple who separate and never divorce use Group B.

**A1. Divorce**
- *Divorce Act* s. 8(1); grounds exhaustively in s. 8(2) — one year separate and
  apart, **or** adultery, **or** physical/mental cruelty.
- Court: SCJ; Family Court inside the 24. Never OCJ.
- Forms: **8A** Application (Divorce); **36** Affidavit for Divorce; **25A**
  Divorce Order; **36A** Certificate of Clerk (Divorce); **36B** Certificate of
  Divorce.
- Facts needed: marriage particulars and proof; separation date; whether
  arrangements for any children's support are reasonable; which ground.
- **Threshold, not discretionary** — s. 8(2) says breakdown *"is established
  only if"*. The uncontested one-year route is closer to a procedural checklist
  than a judgment call. This is the single most self-serviceable family
  proceeding there is.

**A2. Parenting order** (decision-making responsibility and/or parenting time)
- *Divorce Act* s. 16.1(1); interim under s. 16.1(2). Applicant: either spouse,
  or a non-spouse who is a parent / stands in the place of a parent.
- Court: as A1.
- Forms: **8** or **8A**, plus **35.1** — required by **FLR r. 8(3.1)**, which
  makes the r. 35.1 documents mandatory for *any* application containing a
  decision-making / parenting-time / contact claim.
- Facts needed: the children; the current arrangement and how it arose; the
  proposed arrangement; each parent's role and availability; anything bearing on
  the child's circumstances.
- **Discretionary**, on best interests.

**A3. Contact order (non-spouse)**
- *Divorce Act* s. 16.5(1) — *"on application by a person other than a spouse"*.
- Forms: as A2 (r. 8(3.1) catches contact claims too).
- Facts needed: the applicant's relationship to the child; the history of
  contact; what is now sought.
- **Discretionary.**

**A4. Child support order**
- *Divorce Act* s. 15.1(1); interim s. 15.1(2). Amount governed by the **Federal
  Child Support Guidelines, SOR/97-175**.
- Forms: **8**/**8A** + **13** Financial Statement (Support Claims) per FLR
  r. 13(1.1), or **13.1** if there is also a property claim (r. 13(1.2)).
- Facts needed: the children and their status as children of the marriage;
  payor's income and its source; parenting-time split; s. 7 expenses.
- **Table-driven, with named discretionary doors.** The Guidelines table is a
  formula, not a lookup — its columns are *From / To / Basic Amount / Plus (%) /
  Of Income Over*. Doors off the table: incomes over $150,000, special or
  extraordinary expenses, split and shared parenting time, undue hardship.

**A5. Spousal support order**
- *Divorce Act* s. 15.2(1) — *"such lump sum or periodic sums … as the court
  thinks reasonable"*.
- Forms: as A4.
- Facts needed: length of cohabitation; roles during it; each spouse's income,
  earning capacity and needs; career impact; any agreement.
- **Discretionary.** The Spousal Support Advisory Guidelines are, in their own
  words, *"informal"* and *"advisory"* — they are not the Federal Child Support
  Guidelines and must never be presented as producing an entitlement or a
  number the court will apply.

**A6. Variation, rescission or suspension**
- *Divorce Act* s. 17(1) — reaches a support order, a parenting order, or a
  contact order. Note s. 17(2): a person other than a former spouse needs
  **leave** to vary a parenting order.
- Forms: **15** Motion to Change, **15B** Response, **15C** Consent Motion to
  Change, **15D** Consent Motion to Change Child Support. Financial statement
  required with the motion (**13**/**13.1**) except where **15D** applies. Note
  **FLR r. 8(2)**: changing a final order is *"only by a motion under rule 15"*,
  not a fresh application.
- Facts needed: the existing order; what changed and when.
- **Mixed** — child support variation lands back on the table; parenting and
  spousal variation are discretionary.

**A7. Relocation**
- *Divorce Act* ss. 16.9–16.96 — a notice regime, then authorization.
- Forms: within a parenting application/motion; **35.1** engaged.
- Facts needed: proposed move and date; notice given; the reason; the effect on
  the other parent's time; proposals to preserve it.
- **Mixed** — the notice steps are procedural and checkable; authorization is
  discretionary.

### Group B — Provincial (FLA / CLRA)

The route for unmarried partners, and for married spouses not seeking divorce.

**B1. Parenting order, application by a parent**
- *CLRA* s. 21(1) — decision-making responsibility (a) and/or parenting time (b).
  Court's powers: s. 28(1), which includes non-removal and non-relocation terms
  and passport delivery.
- Court: OCJ, Family Court, or SCJ (s. 18).
- Forms: **8** + **35.1** (r. 8(3.1)); s. 21(4) separately requires an affidavit.
- **Discretionary.**

**B2. Parenting order, application by a non-parent**
- *CLRA* s. 21(2) — *"Any person other than the parent of a child, including a
  grandparent"*, and **only decision-making responsibility**, not parenting time.
  The asymmetry is in the statute and is easy to get wrong.
- **Discretionary.**

**B3. Contact order**
- *CLRA* s. 21(3) — non-parents, including grandparents. Granted under s. 28(1)(a)(iii).
- **Discretionary.**

**B4. Variation of a parenting or contact order**
- *CLRA* s. 29(1) — bars variation *"unless there has been a material change in
  circumstances that affects or is likely to affect the best interests of the
  child"*. s. 29(2): a relocation under s. 39.4 **is** a material change, unless
  the relocation had been prohibited.
- Forms: **15** family.
- **Discretionary**, behind a threshold.

**B5. Relocation**
- *CLRA* ss. 39.1–39.4 — s. 39.3 relocation, s. 39.4 authorization; s. 39.2
  covers a change of residence by a person with contact. A 60-day notice
  requirement appears in the Part.
- **Mixed**, as A7.

**B6. Child support**
- *FLA* s. 31(1) (obligation), s. 33(1) (order), and **s. 33(11): a court making
  a child support order _"shall do so in accordance with the child support
  guidelines"_** — **O. Reg. 391/97**, whose s. 3(1) sets the presumptive rule as
  the table amount plus any s. 7 amount.
- Court: OCJ, Family Court, or SCJ.
- Forms: **8** + **13** (or **13.1**).
- **Table-driven**, with two statutory exits: s. 33(12) special provisions making
  the table amount inequitable (reasons required, s. 33(13)), and s. 33(14)
  consent orders meeting the reasonable-arrangements test.
- Note the age rule: s. 31(1) covers an unmarried child who is a minor, **or** is
  *"enrolled in a full-time program of education"*, **or** cannot withdraw from
  parental charge by reason of illness or disability. s. 31(2) excludes a child
  16 or over who has withdrawn from parental control.

**B7. Spousal support**
- *FLA* s. 30 (obligation *"in accordance with need"*), s. 33(1) (order), and the
  factor list in **s. 33(9)** — twelve enumerated circumstances, from current
  assets and means through *"a contribution by the dependant to the realization
  of the respondent's career potential"* and, for spouses, length of cohabitation
  and the effect on earning capacity.
- **Discretionary.** Same SSAG caution as A5.

**B8. Parent support by an adult child**
- *FLA* s. 32 — *"Every child who is not a minor has an obligation to provide
  support, in accordance with need, for his or her parent who has cared for or
  provided support for the child"*. Real, rarely used, and it belongs on the list
  because people arrive asking about it.
- **Discretionary** (s. 33(9) governs).

**B9. Variation of a support order**
- *FLA* s. 37 — s. 37(2) for spouse/parent support on a material change or newly
  available evidence, with power to relieve arrears and interest; s. 37(2.1) for
  child support.
- Forms: **15** family.
- **Mixed**, as A6.

**B10. Equalization of net family property**
- *FLA* s. 5(1) — on divorce, nullity, or separation with no reasonable prospect
  of resuming cohabitation, *"the spouse whose net family property is the lesser
  … is entitled to one-half the difference"*. s. 5(2) on death; s. 5(3)
  improvident depletion. Application under s. 7(1).
- Court: **not the OCJ** (s. 4(1)). **Married spouses only** — this is the single
  hardest boundary in family law for a self-represented person, because a
  long-cohabiting unmarried partner has no equalization claim at all and must use
  B14 instead.
- Forms: **8** + **13.1** (r. 13(1.2)) + **13B** Net Family Property Statement +
  **13C** Comparison of Net Family Property Statements. s. 8 separately requires
  a sworn statement of property.
- **Limitation, and it is short: s. 7(3)** — no application after the earliest of
  two years from divorce or nullity, six years from separation, or six months
  after the first spouse's death.
- **Table-driven in form, evidence-heavy in substance.** The arithmetic is fixed;
  everything contestable sits in valuation and in the s. 4(2) exclusions.

**B11. Exclusive possession of the matrimonial home**
- *FLA* s. 24(1) — possession orders *"[r]egardless of the ownership"*, plus
  contents, periodic payments, and repairs.
- Court: **not the OCJ** (s. 17). Married spouses only (the Part II definition of
  matrimonial home).
- Forms: **8** + **13.1**.
- **Discretionary.**

**B12. Questions of title between spouses**
- *FLA* s. 10.
- Court: not the OCJ.
- **Discretionary.**

**B13. Restraining order**
- Two separate powers, and the difference decides which one a person can use:
  - ***FLA* s. 46(1)** — applicant must have *"reasonable grounds to fear for his
    or her own safety or for the safety of any child in his or her lawful
    custody"*, and by **s. 46(2)** the order may only be made against a **spouse,
    former spouse, or someone who is or has cohabited with the applicant**.
  - ***CLRA* s. 35(1)** — the same fear test but **"against any person"**, with no
    relationship requirement.
- Forms: **25F** Restraining Order; **25G** Restraining Order on Motion Without
  Notice; **25H** Order Terminating Restraining Order.
- **Discretionary.**
- ⚠️ **Both sections carry a not-yet-in-force amendment** (2025, c. 6, Sched. 6,
  s. 1(1) for the FLA; 2025, c. 6, Sched. 2, s. 1(1) for the CLRA), each marked
  *"On a day to be named by order of the Lieutenant Governor in Council"*. The
  pending version would let a prescribed person apply on behalf of the person at
  risk, or anyone with leave. **Build to the in-force text**; the e-Laws document
  prints both, and reading the wrong one is an easy and consequential error.

**B14. Unjust enrichment / constructive or resulting trust between cohabitees**
- **CJA Schedule item 3**; **FLR r. 1(2)(c)**. Not an FLA claim — the FLA
  property scheme does not reach unmarried partners, which is exactly why this
  route exists.
- Court: it is in the Schedule, so Family Court inside the 24. Whether the OCJ
  can hear it is **not resolved below** — see §5.
- Forms: **8**; **13.1** where a property claim is advanced.
- **Discretionary**, and the most doctrinally demanding thing on this list.

**B15. Domestic contracts — interpretation, enforcement, or variation**
- **CJA Schedule item 2**; **FLR r. 1(2)(b)**. Covers a marriage contract,
  cohabitation agreement, separation agreement, paternity agreement, family
  arbitration agreement, or family arbitration award. The contract types are
  defined at *FLA* ss. 52 (marriage contracts), 53 (cohabitation agreements), 54
  (separation agreements), with form requirements at s. 55.
- Forms: **8**; **26B** Affidavit for Filing Domestic Contract with Court.
- **Discretionary.**

**B16. Setting aside a domestic contract**
- ***FLA* s. 56(4)** — a court may set aside a contract or a provision **(a)** for
  failure *"to disclose … significant assets, or significant debts or other
  liabilities, existing when the domestic contract was made"*, **(b)** where a
  party *"did not understand the nature or consequences"*, or **(c)** *"otherwise
  in accordance with the law of contract"*. s. 56(5) separately addresses
  barriers to remarriage.
- **Discretionary**, but (a) is unusually fact-checkable — non-disclosure of a
  specific asset is close to a recorded-or-not question.

**B17. Annulment / declaration of validity or invalidity of marriage**
- **CJA Schedule item 4**; **FLR r. 1(2)(d)**.
- Court: SCJ / Family Court.
- **Discretionary**, and rare.

**B18. Family arbitration — enforcement, and appeal**
- Enforcement: **FLR r. 8(1.1)** routes it to **Form 32.1** Request to Enforce a
  Family Arbitration Award under *FLA* s. 59.8 — *not* an application. But
  **r. 8(1.2)**: if a case between the same parties already exists in the SCJ or
  Family Court, it must be a **motion** in that case instead.
- Appeal: **CJA Schedule item 5**, under the *Arbitration Act, 1991*.
- Forms: **32.1**; **32.1A** Dispute of Request for Enforcement; **26D** for
  filing a support award. **FLR r. 8(3.2)** requires the certificates of
  independent legal advice and the arbitration agreement to accompany any
  application involving a family arbitration.
- **Mixed.**

**B19. Enforcement of a support order or of arrears**
- **FRSAEA, 1996**, in the Schedule. Court enforcement machinery in the Rules.
- Forms: **26** Statement of Money Owed; **26A** Affidavit of Enforcement
  Expenses; **28**/**28A** writ of seizure and sale; **29**–**29J** garnishment;
  **30**/**30A**/**30B** default hearing; **31** contempt motion; **32B** warrant
  for arrest; **32D** warrant of committal.
- **Mixed** — arrears arithmetic is computable; the relief is discretionary.
- See §4: most support enforcement runs through the Family Responsibility Office
  administratively, not through a user-started court proceeding.

---

## 3. Matters in the Schedule a self-represented person would rarely start alone

These are in scope for *routing* — a user may land on them and needs to be told
where they are — but they are not candidates for a guided build.

- **CYFSA Part V — child protection.** Form **8B** Application (Child Protection
  and Status Review); **8B.1** for extended society care status review; **33B**
  Plan of Care (society); **33B.1** Answer and Plan of Care (non-society parties);
  **33C**/**33D** Statements of Agreed Facts; **17B**/**17D** protection
  conference briefs. **A parent almost never starts one of these — they respond
  to one.** Responding to a protection application is common, high-stakes, and is
  a real build question the Small Claims model does not answer.
- **CYFSA Part VII — extraordinary measures** (secure treatment). Form **8C**;
  **25B**; **33E**/**33F** consents.
- **CYFSA Part VIII — adoption and adoption licensing.** Forms **8D**, **8D.1**,
  **8D.2**, **8D.3**, **34**–**34K**, **25C**, and the openness-order set
  **34L**/**34M**/**34M.1**/**34N**.
- **Interjurisdictional Support Orders Act, 2002**, and the **International
  Recovery of Child Support and Family Maintenance Convention Act, 2023** —
  administered largely through a designated authority; forms **37**–**37E**.
- **Family Homes on Reserves and Matrimonial Interests or Rights Act (Canada)**
  and **First Nation laws** (Schedule item 6). In scope, genuinely distinct, and
  not something to approximate.
- **Marriage Act s. 6** — a minor's marriage authorization.
- **Civil Marriage Act (Canada)** and **Change of Name Act** — see §4.

## 4. Matters people believe are family court but are handled elsewhere

- **Dependants' claim for damages — FLA Part V.** Expressly excluded from the
  Schedule. It is a **tort action**, and depending on quantum it may be a Small
  Claims matter — which means it can cross into the existing build.
- **CLRA ss. 59–60** — child property. Superior Court, excluded from the
  Schedule. See §1.2.
- **Support enforcement, day to day** — the **Family Responsibility Office**
  administers support enforcement under FRSAEA. Court steps (B19) exist but are
  the exception; a user's first question about unpaid support usually has an
  administrative answer, not a court one.
- **Most name changes** — the Change of Name Act is in the Schedule, but the
  ordinary adult or child name change is a **ServiceOntario administrative
  application**, not a court proceeding. I did **not** retrieve the Change of
  Name Act to establish exactly where the line falls; flagged in §5.
- **Criminal charges arising from family violence** — assault, criminal
  harassment, breach of a protection order are prosecuted in criminal court. A
  family restraining order (B13) is a separate, parallel civil track.
- **Division of a pension** — governed by the Pension Benefits Act and
  administered by the plan administrator on prescribed forms, downstream of an
  equalization entitlement.
- **Wills and estates** — a spouse's election under FLA s. 6 sits at the border,
  but estate administration is not family court.
- **Child protection complaints** against a society — internal and Ombudsman
  routes, not a proceeding.

## 5. What I could not verify — stated plainly, not filled in

1. **Whether the OCJ can hear a cohabitee unjust-enrichment claim (B14).** It is
   in the CJA Schedule and in FLR r. 1(2)(c), so it is a family proceeding, and
   inside the 24 municipalities s. 21.8(1) sends it to the Family Court. But
   Schedule items 2–6 are not "proceedings under a statute" with a "court"
   definition to consult, so the §1.3 method gives no answer for them. Outside
   the 24, whether such a claim may be started in the OCJ is **unresolved**. My
   working assumption is that it cannot, because the OCJ is a statutory court
   with no inherent equitable jurisdiction — **but that is reasoning, not a
   retrieved source, and it is not good enough to ship.**
2. **The same gap applies to Schedule items 2, 4, 5 and 6** — domestic contracts,
   annulment, arbitration appeals, First Nation laws.
3. **Change of Name Act** — not retrieved. The administrative/court split in §4
   is therefore not sourced.
4. **CJA Schedule item 7** — no prescribing regulation located; I did not search
   exhaustively.
5. **Official form titles beyond the TABLE OF FORMS.** The Rules give form
   numbers and titles; `ontariocourtforms.on.ca` still yields no machine-readable
   form list and the per-form URL pattern remains unknown. **No form PDF has been
   retrieved for any family form.**
6. **Federal Child Support Guidelines s. 21** (income information obligations) —
   still not retrieved; referenced by s. 15(2) and outstanding from the earlier
   Guidelines-income work.
7. **CLRA Part relocation notice period** — s. 39.3 and the 60-day notice appear
   in the text I read, but I did not read the Part end-to-end and the exceptions
   are not mapped.

## 6. The size of what this is

**27 buildable proceeding types** (A1–A7, B1–B19, plus responding to a CYFSA
protection application if that is taken on) against 22 Small Claims claim types
— so comparable in count, but not in shape:

- **Small Claims is one court, one set of rules, one form path.** Family is
  **three courts**, and the routing question comes *before* the claim question.
- **Four types are table-driven** (A4, B6, and B10's arithmetic; A6/B9 partly).
  The rest are discretionary. Small Claims is elements-and-evidence throughout;
  most of family is not, which means the `elementProofEngine` recorded-vs-not
  pattern transfers to the *disclosure* questions but not to the outcome.
- **The married/unmarried split is load-bearing and invisible to users.** B10,
  B11 and B12 simply do not exist for unmarried partners, who get B14 instead.
- **Two not-in-force amendments are already sitting in the source text** (B13).
  Anything that reads e-Laws for family content needs to handle that, and the
  existing form registry does not.

---

## Correction to `21bf8bc`

Reading the TABLE OF FORMS directly turned up an error in the form registry I
committed earlier today. The regulation's own title for Form 35.1 is:

> **AFFIDAVIT (DECISION-MAKING RESPONSIBILITY, PARENTING TIME, CONTACT)**

`familyFormsRegistry.ts` records it as *"Affidavit (Decision-Making
Responsibility, Parenting Time **and** Contact)"*. The inserted "and" is mine,
not the regulation's. `officialTitle` is documented in that file as *"the
regulation's OWN title … Never paraphrased"*, so this is exactly the defect that
field exists to prevent. Not yet fixed.
