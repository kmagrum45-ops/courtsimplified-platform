# Regulatory position — Ontario legal services licensing, and AI disclosure in filings

> **This is retrieved information, not legal advice.** Every quotation below was
> fetched and read from a primary source, and each carries its URL and the
> consolidation date of the document it came from. Nothing here is an opinion
> about whether this platform complies with anything. **A regulatory lawyer
> must confirm the application before any of it is relied on.** Where the
> sources do not reach a question, this document says so rather than reasoning
> to an answer.
>
> Retrieved 2026-09-14.

---

## The short version

Three findings matter more than the rest.

1. **The Law Society Act does not define "practice of law".** It defines
   "provision of legal services" in detail (s. 1(5)–(7)) and then prohibits
   both. Confirmed by searching the full current consolidation for
   `"practice of law" means` — no definition exists.

2. **The statutory test reaches two things CLAUDE.md §3 and §4 do not address
   at all**: selecting or drafting a document for use in a proceeding
   (s. 1(6)2.vii), and *determining what documents to file* (s. 1(7)1). Those
   are named in the Act as providing legal services and as representing a
   person. Neither is a merits assessment, so neither is caught by §3, and
   both survive §4's "suggest, never decide" framing.

3. **Ontario does not require AI disclosure in filings. The Federal Court
   does.** The user's premise — that Canadian courts have begun requiring
   parties to disclose AI use — is true federally and **not** true in the
   Ontario Superior Court, which imposes a *verification* duty instead. These
   are different obligations and the difference matters operationally.

---

## 1. Law Society Act, R.S.O. 1990, c. L.8

**Source:** `https://www.ontario.ca/laws/docs/90l08_e.doc`
**Consolidation period:** from December 4, 2024 to the e-Laws currency date.
**Last amendment:** 2024, c. 28, Sched. 14.
Retrieved 2026-09-14 via the e-Laws `.doc` route, extracted with `antiword`.

> **Filename note for the next person.** `elaws_statutes_90l08_e.doc` also
> returns HTTP 200 but is a **2014 consolidation** ("FROM APRIL 7, 2014"). The
> plain `90l08_e.doc` is current. This is the reverse of the Negligence Act,
> where the prefixed form is the current one — consistent with
> `SOURCING_NOTES.md`: the prefix is not a version marker either way, and the
> header must be read every time.

### 1.1 What "providing legal services" means — s. 1(5)

> **Provision of legal services**
> (5) For the purposes of this Act, a person provides legal services if the
> person engages in conduct that involves the application of legal principles
> and legal judgment with regard to the circumstances or objectives of a
> person. 2006, c. 21, Sched. C, s. 2 (10).

Two elements, both required: **application of legal principles and legal
judgment**, and **with regard to the circumstances or objectives of a person**
— i.e. applied to someone's particular situation, not stated generally.

This is the same axis as the "who does the applying" test already in
CLAUDE.md §2, and it is the one place where the repo's existing standard maps
cleanly onto the statute.

### 1.2 The non-exhaustive list — s. 1(6)

> **Same**
> (6) Without limiting the generality of subsection (5), a person provides
> legal services if the person does any of the following:
> 1. Gives a person advice with respect to the legal interests, rights or
>    responsibilities of the person or of another person.
> 2. Selects, drafts, completes or revises, on behalf of a person,
>    i. a document that affects a person's interests in or rights to or in
>    real or personal property,
>    […]
>    vi. a document that affects the legal interests, rights or
>    responsibilities of a person, other than the legal interests, rights or
>    responsibilities referred to in subparagraphs i to v, or
>    **vii. a document for use in a proceeding before an adjudicative body.**
> 3. Represents a person in a proceeding before an adjudicative body.
> 4. Negotiates the legal interests, rights or responsibilities of a person.
> 2006, c. 21, Sched. C, s. 2 (10).

Note the verbs in paragraph 2: **selects, drafts, completes or revises**. A
Statement of Claim is a document for use in a proceeding before an
adjudicative body, so subparagraph vii is squarely engaged by anything that
selects, drafts, completes or revises one *on behalf of a person*.

### 1.3 What counts as representing someone — s. 1(7)

> **Representation in a proceeding**
> (7) Without limiting the generality of paragraph 3 of subsection (6), doing
> any of the following shall be considered to be representing a person in a
> proceeding:
> 1. **Determining what documents to serve or file in relation to the
>    proceeding**, determining on or with whom to serve or file a document, or
>    determining when, where or how to serve or file a document.
> 2. Conducting an examination for discovery.
> 3. Engaging in any other conduct necessary to the conduct of the
>    proceeding. 2006, c. 21, Sched. C, s. 2 (10).

**This is the provision most directly relevant to this platform and it was not
in the paraphrase.** Paragraph 1 makes *determining what to file, on whom to
serve it, and when* into representation — not merely legal services, but
representation in a proceeding.

### 1.4 Who is deemed NOT to be doing either — s. 1(8)

> **Not practising law or providing legal services**
> (8) For the purposes of this Act, the following persons shall be deemed not
> to be practising law or providing legal services:
> 1. A person who is acting in the normal course of carrying on a profession
>    or occupation governed by another Act of the Legislature, or an Act of
>    Parliament, that regulates specifically the activities of persons engaged
>    in that profession or occupation.
> 2. An employee or officer of a corporation who selects, drafts, completes or
>    revises a document for the use of the corporation or to which the
>    corporation is a party.
> 3. **An individual who is acting on his or her own behalf**, whether in
>    relation to a document, a proceeding or otherwise.
> 4. An employee or a volunteer representative of a trade union […]
> 5. **A person or a member of a class of persons prescribed by the by-laws,
>    in the circumstances prescribed by the by-laws.**
> 2006, c. 21, Sched. C, s. 2 (10).

**Paragraph 3 exempts the self-represented litigant. It does not, on its face,
exempt a person who supplies that litigant with a tool.** The exemption
attaches to "an individual who is acting on his or her own behalf" — the user,
not the vendor. Whether a vendor's conduct is nonetheless outside s. 1(5)
because the *user* is the one applying the law to their own facts is a
question this section does not answer either way.

### 1.5 The prohibition and the penalty — ss. 26.1, 26.2

> **Non-licensee practising law or providing legal services**
> 26.1 (1) Subject to subsection (5), no person, other than a licensee whose
> licence is not suspended, shall practise law in Ontario or provide legal
> services in Ontario. 2006, c. 21, Sched. C, s. 22.
>
> **(2)** … no person … shall hold themself out as, or represent themself to
> be, a person who may practise law in Ontario or a person who may provide
> legal services in Ontario.
>
> **Exception, non-licensee practising law or providing legal services**
> **(5)** A person who is not a licensee may practise law or provide legal
> services in Ontario **if and to the extent permitted by the by-laws**.
>
> **Agent**
> **(8)** This section applies to a person, even if the person is acting as
> agent under the authority of an Act of the Legislature or an Act of
> Parliament.

> **Contravening s. 26.1**
> 26.2 (1) Every person who contravenes section 26.1 is guilty of an offence
> and on conviction is liable to a fine of,
> (a) not more than $25,000 for a first offence; and
> (b) not more than $50,000 for each subsequent offence.

**s. 26.1(2) is worth separating out.** Holding out is prohibited
independently of doing. Marketing copy can breach s. 26.1(2) even where the
product does not breach s. 26.1(1).

### 1.6 What the Act delegates to by-laws — s. 62(0.1)3.1

> 62 (0.1) Convocation may make by-laws,
> […]
> **3.1 for the purposes of paragraph 5 of subsection 1 (8), prescribing
> persons or classes of persons who shall be deemed not to be practising law
> or providing legal services and the circumstances in which each such person
> or class of persons shall be deemed not to be practising law or providing
> legal services;**

So the exemption power is real and it sits in the by-laws, not the Act. **What
the by-laws actually say is therefore decisive, and I could not retrieve
them — see §2.**

---

## 2. By-Law 4 — NOT RETRIEVED

**I could not retrieve By-Law 4 or any other LSO by-law.** `lso.ca` returns
**HTTP 403** to an automated request, including with a browser user-agent:

| URL | Result |
|---|---|
| `https://lso.ca/about-lso/legislation-rules/by-laws/by-law-4` | **403** |
| `https://lso.ca/getmedia/by-law-4.pdf` | 404 |

This is the same class of obstacle as CanLII, and under CLAUDE.md §2 the
answer is not to work around it. **A by-law retrieved by hand and saved under
`docs/sources/` would be a first-class citation** — that is the route this
repo already uses for blocked sources, and it is what should happen here.

**What this gap means.** The Act's exemption power is delegated entirely to
the by-laws (s. 1(8)5, s. 26.1(5), s. 62(0.1)3.1). Without them:

- I cannot say whether any class of person is prescribed as exempt in a way
  that reaches software-assisted self-help.
- I cannot describe the scope of the paralegal (P1) licence, which is
  by-law-defined and which bounds what a licensed paralegal may do in Small
  Claims and family matters.
- **Any statement that this platform is or is not within an exemption would be
  unsourced.** I am not making one.

**Everything in §6 below is therefore conditional on the by-laws not saying
something that changes it.**

---

## 3. LSO guidance and innovation programmes — NOT RETRIEVED

Same 403 obstacle. I could not retrieve LSO's unauthorized-practice guidance,
and I could not confirm or exclude the existence of an LSO sandbox, pilot or
innovation programme for technology-enabled legal services.

**One item is confirmed to exist, by reference from a primary source.** The
Ontario Superior Court's civil practice direction (quoted in full in §5)
states:

> The LSO Futures Committee's **White Paper (April 2024)** on licensees' use of
> generative AI offers guidance on how the Rules of Professional Conduct apply
> when legal services are delivered with the assistance of AI.

That tells us the White Paper exists and is dated April 2024. **I have not
read it.** Note also that it addresses *licensees*' use of AI — it is guidance
for lawyers and paralegals, not a statement about whether unlicensed software
may do something.

**"Whether LSO operates a sandbox" is unanswered, not answered in the
negative.** Absence of retrieval is not evidence of absence.

---

## 4. Item 5 — the Form 14A claim, corrected

The unsourced summary said "the Ontario Statement of Claim is Form 14A". That
is **right for one court and wrong for two**, and the unqualified version is
the dangerous part.

| Court | Originating document | Form | Authority | Consolidation |
|---|---|---|---|---|
| **Small Claims** | Plaintiff's Claim | **Form 7A** | O. Reg. 258/98, r. 7.01(1) | Oct 14, 2025 |
| **Superior Court (civil)** | Statement of Claim | **Form 14A** (general), 14B (mortgage actions) | R.R.O. 1990, Reg. 194, r. 14.03(1) | **Sept 1, 2026** |
| **Family** | — | **Form 14A is an *affidavit*** | O. Reg. 114/99 | May 1, 2026 |

**Small Claims** — `https://www.ontario.ca/laws/docs/980258_e.doc`:

> 7.01 (1) An action shall be commenced by filing a plaintiff's claim
> (**Form 7A**) with the clerk, together with a copy of the claim for each
> defendant. O. Reg. 258/98, r. 7.01 (1).

**Superior Court** — `https://www.ontario.ca/laws/docs/900194_e.doc`:

> **Statement of Claim**
> 14.03 (1) The originating process for the commencement of an action is a
> statement of claim (**Form 14A (general) or 14B (mortgage actions)**), except
> as provided by,
> (a) subrule (2) (notice of action); […]

**Family** — `https://www.ontario.ca/laws/docs/990114_e.doc`. Form 14A appears
throughout as an affidavit, e.g.:

> (b) an **affidavit (Form 14A)** may be included, but is not required […]
> (a) the person files an **affidavit (Form 14A)** confirming, […]

**Two things to carry forward.** First, a form number is meaningless without
its court — the same number is a statement of claim in one and an affidavit in
another. Second, **the Rules of Civil Procedure consolidation is dated
1 September 2026**, which is recent; anything previously recorded about
Superior Court procedure from an older reading should be re-checked against
that consolidation rather than assumed.

---

## 5. AI disclosure in filings — Ontario and Federal differ

### 5.1 Federal Court — a Declaration IS required

**Source:** `https://www.fct-cf.gc.ca/Content/assets/pdf/base/FC-Updated-AI-Notice-EN.pdf`
**NOTICE TO THE PARTIES AND THE PROFESSION — The Use of Artificial Intelligence
in Court Proceedings, May 7, 2024.**

> The Court expects parties to proceedings before the Court to inform it, and
> each other, if documents they submit to the Court, that have been prepared
> for the purposes of litigation, include content created or [generated by]
> AI. **This shall be done by a Declaration in the first paragraph stating that
> AI was used in preparing the document**, either in its entirety or only for
> specifically identified paragraphs.

Scope, and the limit that matters most here:

> This Notice applies to all materials that are (i) submitted to the Court, and
> (ii) prepared for the purpose of litigation.

> **However, a Declaration is not required if AI was used to merely suggest
> changes, provide recommendations, or critique content already created by a
> human** who could then consider and manually implement the changes. **A
> Declaration is required when the role AI plays in the preparation of
> materials for the purpose of litigation resembles that of a co-author.**

### 5.2 Ontario Superior Court — verification, NOT disclosure

**Source:** Consolidated Civil Provincial Practice Direction,
`https://www.ontariocourts.ca/scj/filing-procedures/provincial/consolidated-civil-provincial-practice-direction/`,
Part J, s. 12, **dated March 17, 2026**, Geoffrey B. Morawetz, Chief Justice.

> **12. The Use of Artificial Intelligence (AI) for Court Proceedings**
> Maintaining the integrity of the justice system is the shared responsibility
> of all justice sector participants. […] **it is the responsibility of all
> counsel and litigants to guarantee accuracy when preparing materials for use
> in court proceedings, and particularly when using AI, regardless of whether
> they directly interacted with the technology.** […] Most often, it occurs
> when counsel or litigants carelessly rely on fictitious authorities
> generated by AI, commonly referred to as "hallucinations". […] **The court
> will not tolerate inadvertence in this regard.**
>
> **For Counsel and Litigants**
> **Counsel and litigants must use authoritative sources to verify citations.**
> AI-generated references may include incorrect or fictitious legal
> authorities. **All legal information obtained using the assistance of AI must
> be verified against trusted and authoritative sources.**

Sanctions:

> the court's powers include, but are not limited to, public reprimand of the
> counsel or litigant, the imposition of cost orders, adjourning a hearing or
> dismissing the matter, the initiation of contempt proceedings, and in regards
> to counsel, referral to the Law Society of Ontario.

**There is no Declaration requirement in the Ontario civil practice
direction.** I read the whole of section 12 and the obligation is verification
and accuracy, not disclosure.

### 5.3 Ontario Family — same section, same absence of a disclosure duty

Consolidated Provincial Practice Direction for Family Proceedings
(`…/consolidated-provincial-practice-direction-for-family-proceedings/`)
carries the same AI material, extended to **FLSPs** (family legal services
providers) alongside counsel and litigants, with the same sanctions paragraph.

### 5.4 Small Claims — NOT FOUND

The Superior Court's provincial practice direction index lists four
consolidated directions: **Civil, Divisional Court, Criminal, Family**. There
is no Small Claims consolidated provincial practice direction at that index,
and the URLs I tried for one returned 404.

**This is "not found where it should be", not "does not exist."** Small Claims
Court is a branch of the Superior Court; whether the civil direction applies to
it, or whether a separate Small Claims direction exists elsewhere, is
unresolved and needs a human check.

### 5.5 What this means operationally for this platform

Stated as facts about the sources, not as a conclusion about compliance:

- **The platform's own outputs cite authorities.** The Ontario verification
  duty falls on the *litigant* — but it is a duty they cannot discharge if the
  platform hands them citations they cannot check. The repo's existing §2
  requirement (every citation verified to resolve before it ships) is the
  thing that makes the user's duty dischargeable. It is not merely an internal
  quality rule; it maps onto an obligation the court places on the user.
- **The Federal Court's co-author test is the one to reason about**, if
  Federal Court filings ever become in scope. The intake uses a model for
  extraction and classification; the drafting engine is deterministic and
  assembles the user's own recorded words. Whether that is "merely suggest
  changes" or "resembles a co-author" is a judgment call on facts, and the
  Notice does not resolve it for a pipeline of this shape.
- **Nothing retrieved requires this platform to disclose AI use in an Ontario
  filing.** Nothing retrieved prohibits doing so voluntarily.

---

## 6. Application to what this platform does

For each activity: what the sources say, and where the sources stop.

### 6.1 Publishing sourced rules, forms, deadlines and education topics

**Addressed, and comfortably outside the test.** s. 1(5) requires application
of legal principles and judgment **with regard to the circumstances or
objectives of a person**. Publishing a rule as a rule, with its citation, is
not applied to anyone's circumstances.

Nothing in s. 1(6) or s. 1(7) reaches general publication. This is the
clearest case in the list.

**Caveat from s. 26.1(2):** how it is *described* is separately regulated.
Holding out is prohibited independently of doing.

### 6.2 Asking structured questions and recording the user's own answers

**Addressed, and outside the test on its face.** Recording what a person says
is not the application of legal principles to their circumstances. The user
supplies the facts; the system stores them.

**Where it gets closer, and the sources do not resolve it:** the *selection*
of which questions to ask is driven by claim type, and claim type is
determined from the user's narrative. A question bank that asks about
consideration because it has classified the matter as a contract dispute is
applying a legal framework to choose what to ask. Whether question *selection*
is "conduct that involves the application of legal principles and legal
judgment with regard to the circumstances of a person" is **not addressed by
anything retrieved**. It is arguable both ways on the text and I am not going
to resolve it here.

### 6.3 Partitioning recorded facts against claim elements, and a readiness gate

**The sources do not address software that does this.** That is the honest
finding and it is the most useful one in this section.

What can be said from the text:

- The partition itself — "this element has something recorded, this one does
  not" — is a statement about the contents of a file. It does not assert that
  a legal test is met.
- But **the element list is a legal framework**, and mapping a person's facts
  onto it is closer to s. 1(5) than anything in 6.1 or 6.2. The Act does not
  distinguish between "applying law to facts to reach a conclusion" and
  "applying law to facts to organise them". Its words are "application of legal
  principles and legal judgment with regard to the circumstances or objectives
  of a person", which does not obviously require a conclusion.
- The readiness gate decides *when there is enough to draft*. That is a
  judgment about the user's material, made by the system.

**No provision retrieved addresses fact-to-element mapping by software, and
none addresses a gate of this kind.** A regulatory lawyer should look at this
one first; it is the activity where the gap between what the repo assumes and
what the statute says is widest.

### 6.4 Producing a Statement of Claim from the user's own words

**Addressed directly, and this is the sharpest item.**

s. 1(6)2.vii: providing legal services includes **"selects, drafts, completes
or revises, on behalf of a person … a document for use in a proceeding before
an adjudicative body."** A Statement of Claim is exactly that.

The determinism does not obviously help: the provision names the *acts*
(selects, drafts, completes, revises) and says nothing about how the acts are
performed. A deterministic template that completes a court document on behalf
of a person is still completing a court document on behalf of a person, on the
face of the words.

**What might take it outside, and what the sources actually say:**

- s. 1(8)3 deems **"an individual who is acting on his or her own behalf"** not
  to be practising law or providing legal services. If the user is the one
  drafting, using a tool, the *user* is exempt. **The provision exempts the
  individual. It says nothing about the supplier of the tool.**
- Whether "on behalf of a person" in s. 1(6)2 is satisfied when the person
  operates the tool themselves is **not addressed by the Act**.
- s. 26.1(5) permits non-licensees to provide legal services **to the extent
  permitted by the by-laws** — and I could not retrieve the by-laws.

**So: the activity is named in the statute, and whether the platform is the
actor is unresolved on the retrieved sources.** Placeholders where nothing is
recorded are a good honesty property, and they are not a provision of the Act.

### 6.5 Naming which form a rule requires, given what the user recorded

**Addressed, and by the provision the paraphrase missed.**

s. 1(7)1: **"Determining what documents to serve or file in relation to the
proceeding, determining on or with whom to serve or file a document, or
determining when, where or how to serve or file a document"** is *representing
a person in a proceeding* — s. 1(6)3, the most serious category in the list.

Two readings, and the text supports both:

- **Narrow:** stating that r. 7.01(1) requires Form 7A to start a Small Claims
  action is publishing a rule (6.1). The rule says it; the system repeats it.
- **Broad:** doing it *given what the user recorded* — selecting the applicable
  rule from their facts and naming the form that follows — is "determining what
  documents to … file in relation to the proceeding."

**The difference is whether the user's facts are an input.** A static table of
"here is what each rule requires" sits in the first reading. A routing engine
that reads the user's recorded stage and returns the form for it sits much
closer to the second. This repo does the second.

**Nothing retrieved resolves which reading applies to software.**

---

## 7. Are CLAUDE.md §3 and §4 consistent with the retrieved position?

Short answer: **they are consistent, but they are not the statutory test, and
they were drawn on a different axis from the one the Act uses.** The user's
instinct — that these read as a boundary reasoned to rather than traced — is
borne out.

### 7.1 §3 (never assess case strength) is not traceable to the Act

I searched the full current consolidation. **The Law Society Act says nothing
about assessing the strength or merits of a case.** No provision makes
merit-grading the line, and no provision exempts anything because it declines
to grade.

The Act's line is **application of legal principles and legal judgment to a
person's circumstances**. Merit-grading is one instance of that, which is why
§3 is *safe* — everything §3 forbids is on the wrong side of s. 1(5) too. But
the converse does not hold:

> **Complying with §3 in full does not put an activity outside s. 1(5).**

A system that never grades a case can still apply legal principles and legal
judgment to a person's circumstances. §6.3, §6.4 and §6.5 above are all
examples: none of them grades anything, and all of them are closer to the
statutory line than §3 contemplates.

**So §3 is narrower than the statutory test** — it forbids a subset. Treating
it as *the* boundary is the risk, because it produces exactly the reasoning
"we removed the scores, therefore we are on the right side of the line", and
the Act does not say that.

### 7.2 §4 (suggest, never decide) maps onto the Act better, but not cleanly

§4's "every output is a suggestion the user confirms" is a real mitigation
and it points at something the Act cares about: s. 1(8)3 exempts the
individual acting on their own behalf, and the more genuinely the user is the
decider, the more the conduct looks like theirs.

**But the Act does not contain a suggestion exemption.** s. 1(6)1 makes
*giving advice* about a person's legal interests into legal services with no
carve-out for advice the recipient is free to reject — advice is normally
rejectable, and it is still advice. And s. 1(7)1's "determining what documents
to … file" is not obviously undone by presenting the determination as a
suggestion.

So §4 is **directionally right and textually unsupported**. It is a good
design principle. It is not a defence the Act provides.

### 7.3 Where the sourced position is *wider* than the repo assumes

This is the part that matters most.

| Activity | §3 / §4 treat it as | The Act names it as |
|---|---|---|
| Drafting a court document from the user's words | Fine — it is their words, deterministic, placeholders | s. 1(6)2.vii: **selects, drafts, completes or revises … a document for use in a proceeding** |
| Naming the form a rule requires, given recorded facts | Fine — a sourced procedural fact | s. 1(7)1: **determining what documents to … file** = representing a person |
| Mapping facts to claim elements | Fine — recorded vs not recorded, no grade | Not addressed. Closest text is s. 1(5). |

**None of these is caught by §3 or §4.** All three are named in, or sit
adjacent to, the statutory test. The repo's boundary and the statute's
boundary are drawn on different axes, and the repo's is not a superset.

### 7.4 What this does and does not mean

It does **not** mean anything here is unlawful. s. 26.1(5) permits
non-licensees to provide legal services to the extent the by-laws allow, and
**I could not retrieve the by-laws**. The exemption that would resolve most of
this is precisely the document I could not get.

It does mean:

1. **§3 and §4 should not be described, in this repo or anywhere else, as the
   regulatory boundary.** They are product-safety rules that happen to sit
   inside it. Calling them the boundary invites the inference in 7.1.
2. **The by-laws are the highest-value outstanding retrieval in the repo**,
   ahead of anything in OUTSTANDING_ISSUES. They determine whether §6.4 and
   §6.5 are permitted activities.
3. **§2's "who does the applying" test is the one that actually tracks the
   statute** — it is the same distinction as s. 1(5)'s "with regard to the
   circumstances or objectives of a person". If one of the three is load-bearing
   for regulatory purposes, it is §2, not §3 or §4.

---

## 8. What was not retrieved, listed plainly

| Item | Status |
|---|---|
| LSO By-Law 4 and all other by-laws | **Not retrieved** — `lso.ca` returns 403 to automated requests. Needs manual download into `docs/sources/`. |
| LSO unauthorized-practice guidance | **Not retrieved** — same 403. |
| Whether LSO operates a sandbox / innovation programme | **Unanswered.** Not confirmed either way. |
| LSO Futures Committee White Paper (April 2024) | **Confirmed to exist** by reference from the SCJ practice direction. **Not read.** |
| Small Claims AI practice direction | **Not found** at the provincial practice direction index. Not the same as absent. |
| Paralegal (P1) licence scope | **Not retrieved** — by-law defined. |
| Case law on whether software providers provide "legal services" | **Not searched.** CanLII blocks scraping (CLAUDE.md §2); would need manual retrieval. |

Every one of these would change the analysis in §6 and §7. The by-laws would
change it most.
