# Rules of the Small Claims Court — Structural Map

**O. Reg. 258/98, made under the Courts of Justice Act.**

| | |
|---|---|
| **Source** | `https://www.ontario.ca/laws/docs/980258_e.doc` (e-Laws `.doc` fallback per `docs/SOURCING_NOTES.md`) |
| **Consolidation period** | **FROM OCTOBER 14, 2025 TO THE E-LAWS CURRENCY DATE** — current, not a historical snapshot |
| **Last amendment** | O. Reg. 227/25 |
| **Retrieved and read** | 2026-09-12 |
| **Extraction** | `antiword`, full text, 3,468 lines |

Currency was verified by reading the document's own first header line, per the
version-suffix correction recorded in `SOURCING_NOTES.md`. The header reads
`CONSOLIDATION PERIOD: ... TO THE E-LAWS CURRENCY DATE`, not
`HISTORICAL VERSION FOR THE PERIOD ...`.

**Scope of this document.** This is a read-and-map artifact only. It builds no
claim-type content, no education topics and no deadline features. Nothing here
is user-facing. Where the regulation cross-references another instrument (the
Courts of Justice Act, a form, a tariff), the reference is noted and **not
followed** — following those is a separate session.

**Nothing below asserts anything the regulation does not say.** Where the
regulation is silent, the silence is recorded as silence.

---

## PART 1 — The counting rule (read this before using any deadline)

Every period in Part 2 is governed by **r. 3.01**, which provides that where
the rules or a court order prescribe a period of time for taking a step in a
proceeding, the time is counted by **excluding the first day and including the
last day**; and if the last day falls on a holiday, the period ends on the next
day that is not a holiday.

Two consequences follow directly from the text:

1. **The clock starts the day after the triggering event**, not on the day of
   it. The triggering day is excluded.
2. **The last day rolls forward off a holiday** — but only the last day.

**"Holiday" is defined in r. 1.02 and expressly includes "any Saturday or
Sunday"**, alongside New Year's Day, Family Day, Good Friday, Easter Monday,
Victoria Day, Canada Day, Civic Holiday, Labour Day, Thanksgiving Day,
Remembrance Day, Christmas Day, Boxing Day, and any special holiday proclaimed
by the Governor General or the Lieutenant Governor. The definition also carries
its own substitution rules: where New Year's Day, Canada Day or Remembrance Day
falls on a Saturday or Sunday the following Monday is a holiday; where Christmas
Day falls on a Saturday or Sunday the following Monday and Tuesday are holidays;
and where Christmas Day falls on a Friday the following Monday is a holiday.

**Therefore these are calendar-day periods with a holiday rollover on the end
date only.** Intervening weekends and holidays are counted; they do not extend
the period. This is not a business-day count. That distinction is the single
most consequential thing in this document.

**r. 3.02** provides that the court may lengthen or shorten any time prescribed
by the rules or an order, on such terms as are just; and that a time prescribed
for **serving or filing a document** may be lengthened or shortened by filing
the **consent of the parties**. So no period below is immovable.

### Where the regulation is SILENT on counting

Recorded explicitly, because `docs/DEADLINE_TRACKING_DESIGN.md` flags
counting-method verification as the specific question needing licensee review,
and knowing exactly where the text is silent is what makes that review
efficient:

- **r. 3.01 applies by its terms to "a period of time for the taking of a step
  in a proceeding."** The regulation does not define "step in a proceeding," and
  does not state whether periods that are not obviously a party's procedural
  step — for example the six-month service period in r. 8.01(2), the two-year
  dismissal-for-delay trigger in r. 11.1.01(1), or the six-year enforcement
  thresholds in Rule 20 — are within that phrase. **Whether r. 3.01 governs
  those is not resolved by the text.**
- **Periods expressed in months and years** (six months, one year, six years,
  12 months, two years) have **no counting method stated anywhere in the
  regulation**. r. 3.01 speaks to days falling on holidays; it says nothing
  about how to compute a month or a year, or what happens where there is no
  corresponding calendar date.
- **The "second anniversary" formulation in r. 11.1.01(1)** is not expressed as
  a period at all but as a date. The regulation does not say how it interacts
  with r. 3.01.
- **Periods counted backwards from a future event** ("at least 10 days before
  the trial date", "at least 14 days before the settlement conference", "at
  least 30 days before the trial date", "at least seven days before the trial
  commences", "at least two days before the hearing date") are stated as minima
  before a date. r. 3.01 is drafted for a period running forward from a trigger
  ("excluding the first day and including the last day"). **The regulation does
  not state how the exclude-first/include-last rule maps onto a backwards
  count**, nor whether the holiday rollover operates in that direction — and
  note that rolling forward off a holiday would *shorten* notice rather than
  extend it. Not resolved by the text.
- **Deemed-service provisions interact with these periods but the regulation
  does not spell the interaction out.** See Part 3.

---

## PART 2 — Every deadline and time period in the regulation

Grouped by function. "Trigger" is what the regulation says the period runs
from. Where the regulation attaches a consequence, it is noted.

### Commencement and service

| Period | Trigger | Rule | Notes |
|---|---|---|---|
| **Six months** to serve a claim | The date the claim **is issued** | **r. 8.01(2)** | Court may extend, **before or after** the six months has elapsed. Months — no counting method stated. |
| **Seven days** to serve notice of change of address for service | The date the change **takes place** | **r. 8.09(1)** | On the court and the other parties. |

### Defence and defendant's claim

| Period | Trigger | Rule | Notes |
|---|---|---|---|
| **20 days** to serve and file a defence (Form 9A) | **Being served** with the claim | **r. 9.01** | Requires both service on every other party **and** filing with the clerk, with proof of service. |
| **20 days** within which a defendant's claim (Form 10A) **may be issued** | The **day on which the defence is filed** | **r. 10.01(2)(a)** | After that time it may still be issued before trial or default judgment **with leave of the court** — r. 10.01(2)(b). Note the rule speaks to *issuing*, not filing. |
| **20 days** for the plaintiff to dispute a proposal of terms of payment | **After** the proposal (r. 9.03 admission of liability) | **r. 9.03(3)** | |
| **15 days** must have passed since service of a notice of default of payment | Service of that notice | **r. 9.03(2)(c)(iii)** | A precondition to the clerk signing judgment for the unpaid balance, sworn in an affidavit of default (Form 20M). |

### Default and dismissal

| Period | Trigger | Rule | Notes |
|---|---|---|---|
| Noting in default available where defence not filed **within the prescribed time** | Expiry of the r. 9.01 period | **r. 11.01(1)** | The rule cross-refers to "the prescribed time" rather than restating 20 days. Requires a request (Form 9B) and proof the claim was served within the court's territorial division. |
| **Second anniversary** of commencement — clerk shall dismiss for delay | **Commencement of the action** | **r. 11.1.01(1)** | Applies unless the action has been disposed of by order, or a step has been taken under r. 11.03 to obtain judgment, or a trial date has been requested. Exceptions in r. 11.1.01(2). Expressed as an anniversary date, not a period. |
| **60 days** — defendant's claim deemed dismissed | **Service** of the r. 11.1.01(1) dismissal order | **r. 11.1.02** | Unless the court orders otherwise **during** the 60-day period. |
| **20 days** to file a written submission (max four pages) opposing a proposed order | **Receiving** the clerk's mailed notice | **r. 12.02(4) para. 2** | If no complying submission is filed, the court may make the order without further notice. |

### Settlement conference and amendment

| Period | Trigger | Rule | Notes |
|---|---|---|---|
| **90 days** — settlement conference shall be held | The **first defence is filed** | **r. 13.01(3)** | Exception where the defence contains an admission of liability with a proposal of terms of payment — r. 13.01(4). |
| **14 days** before the settlement conference — disclosure | The settlement conference **date** | **r. 13.03(2)** | Serve on every other party and file: documents to be relied on at trial including expert reports not already attached, and a list of proposed witnesses (Form 13A). Backwards count. |
| **10 days** after a judge signs an order made at a settlement conference | The judge **signs** the order | **r. 13.05(5)** | |
| **30 days** before the originally scheduled trial date — filing and service of an amended claim or defence | The **originally scheduled trial date** | **r. 12.01(3)** | Unless the court on motion allows shorter notice, or a clerk's order permitting amendment is obtained under r. 11.2.01(1). Backwards count. |

### Offer to settle, motions, trial

| Period | Trigger | Rule | Notes |
|---|---|---|---|
| An offer to settle may be made **at any time** | — | **r. 14.02(1)** | No deadline. |
| **Seven days** before trial commences — service of an offer, for costs consequences to apply | **Commencement of trial** | **r. 14.02(2)** | The costs consequences in r. 14.07 apply *only if* served at least seven days before. Backwards count. |
| Offer deemed withdrawn the **day after** a specified expiry date | The date specified in the offer | **r. 14.03(2)** | Applies where the offer specifies a date after which it is no longer available and has not been accepted on or before that date. |
| **Seven days** before the hearing date — service of notice of motion and supporting affidavit | The motion **hearing date** | **r. 15.01** | On every party affected, and on a defendant not noted in default. Backwards count. |
| **Two days** before the hearing date — filing with proof of service | The motion **hearing date** | **r. 15.01** | Backwards count. |
| **10 days** before the trial date — personal service of a summons to witness (Form 18A) | The **trial date** | **r. 18.03** | Attendance money calculated under the regulations made under the Administration of Justice Act must be paid or tendered at the time of service — cross-reference, not followed this session. Backwards count. |
| **30 days** before the trial date — service of a document, written statement, or audio/visual record | The **trial date** | **r. 18.02(1)** | If so served on all parties served with the notice of trial, it **shall be received in evidence** unless the trial judge orders otherwise. Backwards count. |
| **30 days** to move to set aside or vary a judgment against a party who failed to attend trial | **Becoming aware of the judgment** | **r. 17.01(5)(a)** | Extension available under r. 17.01(5)(b) where the court is satisfied there are special circumstances. Discovery-based trigger, unusual in this regulation. |
| **30 days** to make a motion for a new trial | A **final order is made** | **r. 17.04(1)** | |
| **10 days** after a judge signs an order made at a trial management conference | The judge **signs** the order | **r. 16.1.04(2)** | |

### Enforcement (Rule 20)

| Period | Trigger | Rule | Notes |
|---|---|---|---|
| **Six years** — leave required to issue a writ of seizure and sale of **personal property** | The **order was made** | **r. 20.06(1.1)** | Years — no counting method stated. |
| **One year** — order granting leave ceases to have effect if the writ is not issued | The date the **leave order is made** | **r. 20.06(1.2)** | Thereafter only with leave on a subsequent motion. |
| **Six years** — leave required to issue a writ of seizure and sale of **land** | The **order was made** | **r. 20.07(1.1)** | |
| **Six years** — leave required to issue a **notice of garnishment** | The **order was made** | **r. 20.08(2.1)** | Also where enforcement is subject to a condition. |
| **One year** — leave order for garnishment ceases to have effect if the notice is not issued | The date the **leave order is made** | **r. 20.08(2.2)** | |
| **10 days** — garnishee liable to pay the clerk | **Service of the notice** on the garnishee, **or** the debt becoming payable — **whichever is later** | **r. 20.08(7)** | Two competing triggers; the later governs. |
| **Six years** — period within which the garnishee's liability runs | After the notice **is served** | **r. 20.08(7)–(8) area** | Stated in the same provision group; see r. 20.08 for the full mechanism. |
| **30 days** to request a garnishment hearing | The **notice is served** | **r. 20.08(16)** | |
| **30 days** — notice of garnishment period from receipt | The date the notice **is received** | **r. 20.08(17) area** | |
| **30 days** after expiry of the time to request a garnishment hearing — creditor may file proof of service and an affidavit | **Expiry** of the r. 20.08(16) period | **r. 20.08(21)** | Applies where a debt is jointly owned and no hearing was requested. |
| **10 days** before the sale — notice mailed | The **sale** | **r. 20.07 area** | Backwards count. |
| **21 days** in default — consolidation order terminates **immediately** | The debtor being **in default** under the order for 21 days | **r. 20.09(10)** | Self-executing; no order required. |
| **12 months** — a warrant issued under r. 20.11 remains in force | **Issue** of the warrant | **r. 20.11(10)** | Renewable for 12 months at each renewal on the creditor's motion, unless the court orders otherwise. |

---

## PART 3 — Deemed service, and why it compounds every deadline above

The regulation sets out when service is **deemed effective**, which determines
when a service-triggered clock starts. These are not deadlines themselves; they
move the trigger.

| Method | Deemed effective | Rule |
|---|---|---|
| **Mail** | The **fifth day** following the date of mailing | **r. 8.07(2)** |
| **Courier** | The **fifth day** following the date the courier verifies delivery | **r. 8.07.1** |
| **Email** | The **day the email is sent**; but if sent **between 4 p.m. and midnight**, the **following day** | **r. 8.08(4)** |
| Mailed notice under r. 12.02 | Deemed received on the **fifth day** after mailing | **r. 12.02 area** |

**Silence to record:** the regulation states these deeming rules and separately
states the r. 3.01 counting rule, but **does not state how they compose**. It
does not say whether the deemed-effective day is itself the "first day" that
r. 3.01 excludes, nor whether the five-day deeming period is itself computed
under r. 3.01 (and so rolls off holidays) or is a raw calendar count. For a
claim served by mail this is the difference of **several days** on the r. 9.01
defence deadline. **Not resolved by the text — this is a licensee-review
question, not an inference to make here.**

---

## PART 4 — Alignment with the Courts of Justice Act

CJA sections previously identified as relevant, mapped to where this regulation
touches them. Cross-references are noted, **not followed** this session.

| CJA s. | Where the regulation engages it |
|---|---|
| **s. 23** | Not cited by name in the regulation. It is the monetary-jurisdiction section; the regulation's Rule 6 (Forum and Jurisdiction) governs *place* of commencement and trial, and r. 6.02 provides there is no division for jurisdictional purposes. The two layers are complementary, not overlapping. |
| **s. 25** | **r. 1.03(1)** — the primary objective of the rules is to enable the court to secure the just, most expeditious and least expensive determination of every proceeding on its merits **in accordance with s. 25**. r. 1.03(2) requires the court to apply the rules liberally to promote that objective. |
| **s. 26** | Not cited by name. |
| **s. 27** | Not cited by name. The regulation's Rule 18 (Evidence at Trial) is the procedural counterpart. |
| **s. 28** | Not cited by name. |
| **s. 29** | **r. 19.06** — the penalty power for a party or representative who has unduly complicated or prolonged an action or otherwise acted unreasonably is exercised **as provided by s. 29**. **r. 19.07** makes any power under Rule 19 to award costs subject to s. 29, which limits the amount of costs that may be awarded. |
| **s. 31** | Not cited by name. |

**Other CJA sections the regulation does cite**, recorded because they were not
on the list and matter procedurally:

- **s. 140(1)** — **r. 12.03(1)**: stay or dismissal where a person subject to a
  vexatious-litigant order has instituted or continued an action without the
  order being rescinded or leave granted.
- **s. 30(1)–(2)** — **r. 20.11**: contempt hearings, including where a person
  served with a notice of examination under r. 20.10 fails to attend.
- **s. 73(2)** — **r. 21.01 area**: references a person acting under that
  subsection.

---

## PART 5 — Flags against existing repo content

Read-only observations. **No code was changed in this session.**

### 1. `defence-set-off-or-counterclaim` — wrong verb, and an unstated limit

`src/lib/case-system/intake/claimTypes.ts:372` states the Defendant's Claim
"must generally be filed within 20 days of filing a Defence."

**r. 10.01(2)(a) says the defendant's claim "may be issued ... within 20 days
after the day on which the defence is filed."** Two gaps:

- **Issued, not filed.** Issuing and filing are distinct acts under this
  regulation (Rule 7.02 governs issuing). The entry names the wrong step.
- The entry says "unless the court allows it later," which is directionally
  right, but **r. 10.01(2)(b)** is more specific: after that time it may be
  issued **before trial or default judgment, with leave of the court**. The
  outer boundary — trial or default judgment — is not stated in the entry.

The entry is `status: "draft"` and cited to an ontario.ca guide page rather than
the regulation, which is consistent with the Session 46 finding that overview
pages omit limits. **Re-sourcing it to r. 10.01 would close both gaps.**

### 2. `twentyDaysElapsed` — the counting rule makes a naive calculation unsafe

`questionBank.ts:39` and `:272` gate the `sc-defendant-noted-in-default`
question on `twentyDaysElapsed`, and `extractIntakeFacts.ts:33` and `:115`
instruct the extractor to set it from whether "20 days have passed since
service."

The **substance is correct** — r. 9.01 does run 20 days from being served. But
three things in the regulation make a plain "20 days since service" arithmetic
unreliable:

- **r. 3.01 excludes the day of service.** A count that includes it is one day
  early.
- **If day 20 falls on a holiday — including any Saturday or Sunday — the
  period ends on the next non-holiday day.** Roughly two days in seven, a
  correct count lands on a weekend and extends.
- **Where the claim was served by mail or courier, service is not effective
  until the fifth day after mailing or verified delivery** (r. 8.07(2),
  r. 8.07.1). The clock has not started when the user thinks it has.

**Direction of the error matters:** every one of these makes the true deadline
*later* than a naive count. A user told the defendant can be noted in default
could act before the defendant's time has actually run.

This is a fact-gate for surfacing a question, not a computed date shown to a
user, so the current exposure is limited. But it is exactly the counting-method
question `DEADLINE_TRACKING_DESIGN.md` reserves for licensee review, and the
regulation's silence on how deeming composes with r. 3.01 (Part 3) means it
**cannot be closed by reading the regulation alone.**

### 3. The six-month service deadline is absent from the repo entirely

**r. 8.01(2)** — a claim must be served within six months after issuance,
subject to extension. A grep of `src/lib/case-system/intake/` for `258/98`
returns a single citation, on an unrelated entry. **Nothing in the intake
registries mentions this deadline.** It is a hard procedural gate between
issuing a claim and everything downstream, and a user who issues a claim and
waits has no way to learn of it from current content.

### 4. Forms named in the regulation, against the form catalogue

The regulation names forms inline throughout: 7A and 10A (claims), 9A
(defence), 9B (request to note in default), 10A (defendant's claim), 11A
(affidavit for jurisdiction), 13A (list of proposed witnesses), 18A (summons to
witness), 20C (writ of seizure and sale of personal property), 20M (affidavit
of default of payment), among others. The regulation also carries its own
**Table of Forms** with effective dates (lines 3,430–3,457 of the extracted
text), which is the authoritative list of form numbers, titles and the date
each took effect.

**Not cross-checked against `legal_form_mapping_rules` or the form catalogue
this session** — that comparison is its own task and was out of scope here. The
Table of Forms is the right starting point for it, and it carries effective
dates, which is what a staleness check needs.

---

## PART 6 — Complete rule-by-rule index

Every rule and sub-rule heading in the regulation, in order, with one line on
what it governs. Headings are as they appear in the regulation's own Contents.

### RULE 1 — GENERAL
| Rule | Heading | Governs |
|---|---|---|
| 1.01 | Citation | How the rules are cited. |
| 1.02 | Definitions | Defined terms, including **"holiday"** (central to r. 3.01), "order", "paralegal", "proof of service", "representative", "self-represented", "territorial division". |
| 1.03 | Primary objective | Just, most expeditious and least expensive determination on the merits, in accordance with **CJA s. 25**; duty to apply the rules liberally. |
| 1.03.1 | Matters not covered in rules | What happens where the rules do not cover a matter. |
| 1.04 | Orders on terms | The court's power to impose terms on an order. |
| 1.05 | Standards for documents | Document form requirements. |
| 1.05.1 | Electronic filing, issuance of documents | Electronic filing and issuance. |
| 1.05.2 | Electronic court documents, communications, signatures | Electronic documents and signatures. |
| 1.05.4 | Small Claims Court Submissions Online portal | The online submissions portal. |
| 1.05.5 | Ontario Courts public portal | The public portal. |
| 1.05.6 | Case Center | The Case Center platform. |
| 1.06 | Forms | Use of the prescribed forms. |
| 1.07 | Hearing methods | In-person, telephone and video hearing methods. |
| 1.08 | Representation | Who may represent a party. |
| 1.09 | Ceasing to be a representative | How a representative comes off the record. |

### RULE 2 — NON-COMPLIANCE WITH THE RULES
| Rule | Heading | Governs |
|---|---|---|
| 2.01 | Effect of non-compliance | Consequence of failing to comply. |
| 2.02 | Court may dispense with compliance | The court's power to dispense with compliance at any time. |

### RULE 3 — TIME
| Rule | Heading | Governs |
|---|---|---|
| 3.01 | Computation | **The master counting rule** — exclude the first day, include the last; last day on a holiday rolls to the next non-holiday day. |
| 3.02 | Powers of court | Court may lengthen or shorten any time; service/filing times may be varied by filed consent of the parties. |

### RULE 4 — PARTIES UNDER DISABILITY
| Rule | Heading | Governs |
|---|---|---|
| 4.01 | Plaintiff's litigation guardian | Action by a person under disability requires a litigation guardian; **a minor may sue for up to $500 as if of full age**. |
| 4.02 | Defendant's litigation guardian | Litigation guardian for a defendant under disability. |
| 4.03 | Who may be litigation guardian | Eligibility. |
| 4.04 | Duties of litigation guardian | Duties owed. |
| 4.05 | Power of court | Court's powers over litigation guardians. |
| 4.06 | Setting aside judgment, etc. | Relief from judgment involving a person under disability. |
| 4.07 | Settlement requires court's approval | Settlement on behalf of a person under disability needs approval. |
| 4.08 | Money to be paid into court | Payment into court of money for a person under disability. |

### RULE 5 — PARTNERSHIPS AND SOLE PROPRIETORSHIPS
| Rule | Heading | Governs |
|---|---|---|
| 5.01 | Partnerships | Suing and being sued in a firm name. |
| 5.02 | Defence | Defence by a partnership. |
| 5.03 | Notice to alleged partner | Notice alleging partner status. |
| 5.04 | Disclosure of partners | Compelling disclosure of partners. |
| 5.05 | Enforcement of order | Enforcing against partners and partnership property. |
| 5.06 | Sole proprietorships | Application to sole proprietorships. |

### RULE 6 — FORUM AND JURISDICTION
| Rule | Heading | Governs |
|---|---|---|
| 6.01 | Place of commencement and trial | Which territorial division an action is brought and tried in. |
| 6.02 | No division for jurisdictional purposes | A claim may not be divided to bring it within the court's jurisdiction. |

### RULE 7 — COMMENCEMENT OF PROCEEDINGS
| Rule | Heading | Governs |
|---|---|---|
| 7.01 | Plaintiff's claim | Form and content of the plaintiff's claim (Form 7A). |
| 7.02 | Issuing claim | How a claim is issued by the clerk. |

### RULE 8 — SERVICE
| Rule | Heading | Governs |
|---|---|---|
| 8.01 | Service of particular documents | Claims served personally or by an alternative; **six-month service deadline, r. 8.01(2)**. |
| 8.02 | Personal service | How personal service is effected. |
| 8.03 | Alternatives to personal service | Permitted alternatives. |
| 8.04 | Substituted service | Court-ordered substituted service. |
| 8.05 | Service outside Ontario | Service beyond the province. |
| 8.07 | Service by mail | **Deemed effective the fifth day following mailing.** |
| 8.07.1 | Service by courier | **Deemed effective the fifth day following courier verification.** |
| 8.08 | Service by email | Requirements; **deemed effective the day sent, or the following day if sent between 4 p.m. and midnight**. |
| 8.09 | Notice of change of address | **Seven days** to serve notice of a change of address for service. |
| 8.09.1 | Proof of service | How service is proved. |
| 8.10 | Failure to receive document | Relief where a document was not received. |

### RULE 9 — DEFENCE
| Rule | Heading | Governs |
|---|---|---|
| 9.01 | Defence | **20 days from being served** to serve on every other party and file with the clerk a defence (Form 9A) with proof of service. |
| 9.02 | Contents of defence, attachments | What the defence must contain and attach. |
| 9.03 | Admission of liability and proposal of terms of payment | Proposal of payment terms; **plaintiff's 20 days to dispute**; **15 days since service of a notice of default** before the clerk signs judgment on an affidavit of default (Form 20M). |

### RULE 10 — DEFENDANT'S CLAIM
| Rule | Heading | Governs |
|---|---|---|
| 10.01 | Defendant's claim | Who may be claimed against; **20 days after the day the defence is filed to issue** (Form 10A), later only with leave, before trial or default judgment. |
| 10.02 | Service | Serving the defendant's claim. |
| 10.03 | Defence | Defending a defendant's claim. |
| 10.04 | Defendant's claim to be tried with main action | Joint trial. |
| 10.05 | Application of rules to defendant's claim | Which rules carry over. |

### RULE 11 — DEFAULT PROCEEDINGS
| Rule | Heading | Governs |
|---|---|---|
| 11.01 | Noting defendant in default | Clerk may note in default where no defence is filed **within the prescribed time**, on a request (Form 9B) and proof of service within the territorial division; leave required for a person under disability; special proof (Form 11A) where all defendants served outside the division. |
| 11.02 | Default judgment, plaintiff's claim, debt or liquidated demand | Default judgment for a liquidated sum. |
| 11.03 | Default judgment, plaintiff's claim, unliquidated demand | Default judgment where damages are unliquidated. |
| 11.04 | Default judgment, defendant's claim | Default judgment on a defendant's claim. |
| 11.05 | Consequences of noting in default | Effect of being noted in default. |
| 11.06 | Setting aside noting of default by court on motion | Relief from noting in default. |

### RULE 11.1 — DISMISSAL BY CLERK
| Rule | Heading | Governs |
|---|---|---|
| 11.1.01 | Dismissal | Clerk shall dismiss for delay by the **second anniversary of commencement** where the action is undisposed of and no r. 11.03 step or trial-date request has been made; exceptions for accepted offers, admissions with payment proposals, and plaintiffs under disability. |
| 11.1.02 | Effect of dismissal on defendant's claim | Defendant's claim deemed dismissed **60 days after** the dismissal order is served, unless the court orders otherwise within that period. |

### RULE 11.2 — REQUEST FOR CLERK'S ORDER ON CONSENT
| Rule | Heading | Governs |
|---|---|---|
| 11.2.01 | Consent order | Orders the clerk may make on consent. |

### RULE 11.3 — DISCONTINUANCE
| Rule | Heading | Governs |
|---|---|---|
| 11.3.01 | Discontinuance by plaintiff in undefended action | Discontinuing where no defence has been filed. |
| 11.3.02 | Effect of discontinuance on subsequent action | Consequence for a later action. |

### RULE 12 — AMENDMENT, STRIKING OUT, STAY AND DISMISSAL
| Rule | Heading | Governs |
|---|---|---|
| 12.01 | Right to amend | Amending a claim or defence; **filing and service at least 30 days before the originally scheduled trial date**, subject to a shorter period on motion or a clerk's order. |
| 12.02 | Motion to strike out or amend a document | Striking out; orders on written submissions where a document is inflammatory, a waste of time, a nuisance or an abuse of process, with **20 days from receipt of notice** to file a submission of no more than four pages; mailed notice deemed received the **fifth day** after mailing. |
| 12.03 | Stay or dismissal if no leave under Courts of Justice Act | Stay or dismissal where a person subject to a **CJA s. 140(1)** order proceeds without leave. |

### RULE 13 — SETTLEMENT CONFERENCES
| Rule | Heading | Governs |
|---|---|---|
| 13.01 | Settlement conference required in defended action | Clerk fixes and serves notice with Form 13A; **held within 90 days after the first defence is filed**; exception where the defence admits liability with a payment proposal. |
| 13.02 | Participation | Who must participate. |
| 13.03 | Purposes of settlement conference | Purposes; **disclosure at least 14 days before** the conference — documents relied on including expert reports, and a witness list (Form 13A). |
| 13.04 | Recommendations to parties | Recommendations the judge may make. |
| 13.05 | Orders at settlement conference | Orders available; **10 days after the judge signs** an order. |
| 13.06 | Memorandum | The conference memorandum. |
| 13.07 | Notice to set action down for trial | Setting the action down. |
| 13.08 | Judge not to preside at trial | The settlement conference judge does not try the action. |
| 13.09 | Withdrawal of claim | Withdrawing at the conference stage. |
| 13.10 | Costs | Costs of the settlement conference. |

### RULE 14 — OFFER TO SETTLE
| Rule | Heading | Governs |
|---|---|---|
| 14.01 | Offer to settle | Making an offer. |
| 14.01.1 | Written documents | Written-document requirements. |
| 14.02 | Time for making offer | **Any time**; costs consequences under r. 14.07 apply only if served **at least seven days before trial commences**. |
| 14.03 | Withdrawal | Withdrawal any time before acceptance by serving notice; **deemed withdrawn the day after** a specified expiry date passes unaccepted. |
| 14.04 | No disclosure to trial judge | The offer is not disclosed to the trial judge. |
| 14.05 | Acceptance of an offer to settle | How acceptance works. |
| 14.06 | Failure to comply with accepted offer | Remedy where an accepted offer is not honoured. |
| 14.07 | Costs consequences of failure to accept | The costs consequences, subject to r. 14.02(2). |

### RULE 15 — MOTIONS
| Rule | Heading | Governs |
|---|---|---|
| 15.01 | Notice of motion and supporting affidavit | Service **at least seven days before the hearing date** on every affected party and any defendant not noted in default; filing with proof of service **at least two days before**. |
| 15.02 | Motion hearings | How motions are heard. |
| 15.03 | Motion without notice | When notice may be dispensed with. |
| 15.04 | No further motions without leave | Restriction on repeat motions. |
| 15.05 | Adjournment of motion | Adjournments. |
| 15.06 | Withdrawal of motion | Withdrawing a motion. |
| 15.07 | Costs | Costs on motions. |

### RULE 16 — TRIAL SCHEDULING
| Rule | Heading | Governs |
|---|---|---|
| 16.01 | Clerk fixes date and serves notice | Trial date and notice of trial. |

### RULE 16.1 — TRIAL MANAGEMENT CONFERENCE
| Rule | Heading | Governs |
|---|---|---|
| 16.1.01 | Court may require | When a trial management conference is required. |
| 16.1.02 | Purposes of trial management conference | Purposes. |
| 16.1.03 | Recommendations to parties | Recommendations available. |
| 16.1.04 | Orders at trial management conference | Orders; **10 days after the judge signs** an order. |
| 16.1.05 | Memorandum | The conference memorandum. |
| 16.1.06 | Judge not to preside at trial | The conference judge does not try the action. |
| 16.1.07 | Costs | Costs. |

### RULE 17 — TRIAL
| Rule | Heading | Governs |
|---|---|---|
| 17.01 | Failure to attend | Consequences of non-attendance; setting aside a judgment against an absent party on motion **within 30 days after becoming aware of the judgment**, extendable for special circumstances. |
| 17.02 | Adjournment | Adjourning a trial. |
| 17.03 | Inspection | Judge may inspect property in the parties' presence. |
| 17.04 | Motion for new trial | **30 days after a final order is made**; transcript requirements. |

### RULE 18 — EVIDENCE AT TRIAL
| Rule | Heading | Governs |
|---|---|---|
| 18.01 | Affidavit | In an undefended action the plaintiff's case may be proved by affidavit unless the judge orders otherwise. |
| 18.02 | Written statements, documents and records | A document, written statement or audio/visual record served **at least 30 days before the trial date** on all parties served with the notice of trial **shall be received in evidence** unless the judge orders otherwise. |
| 18.03 | Summons to witness | Form 18A served personally **at least 10 days before the trial date**, with attendance money under the Administration of Justice Act regulations paid or tendered at service. |

### RULE 19 — COSTS
| Rule | Heading | Governs |
|---|---|---|
| 19.01 | Disbursements | Recoverable disbursements. |
| 19.04 | Representation fee | The representation fee. |
| 19.05 | Compensation for inconvenience and expense | Compensation to a party. |
| 19.06 | Penalty | Penalty for unduly complicating or prolonging an action or acting unreasonably, **as provided by CJA s. 29**. |
| 19.07 | Limitation | Any costs power under Rule 19 is **subject to CJA s. 29**, which limits the amount awardable. |

### RULE 20 — ENFORCEMENT OF ORDERS
| Rule | Heading | Governs |
|---|---|---|
| 20.01 | Definitions | Enforcement definitions. |
| 20.02 | Power of court | The court's enforcement powers. |
| 20.03 | General | General enforcement provisions. |
| 20.04 | Certificate of judgment | Obtaining a certificate of judgment. |
| 20.05 | Delivery of personal property | Writ of delivery and related mechanics. |
| 20.06 | Writ of seizure and sale of personal property | Form 20C; **leave required after six years**; **leave order lapses if the writ is not issued within one year**. |
| 20.07 | Writ of seizure and sale of land | **Leave required after six years**; notice **mailed at least 10 days before the sale**. |
| 20.08 | Garnishment | **Leave required after six years** or where enforcement is conditional; **leave order lapses after one year**; garnishee liable **within 10 days** of service or of the debt becoming payable, whichever is later; **30 days** to request a garnishment hearing; **30 days** after that expiry for a creditor to file on a jointly-owned debt. |
| 20.09 | Consolidation order | Consolidation orders; **terminates immediately if the debtor is in default for 21 days**. |
| 20.10 | Examination of debtor or other person | Notice of examination and attendance. |
| 20.11 | Contempt hearing | Contempt under **CJA s. 30(1)–(2)**, including failure to attend an examination; **warrant in force 12 months**, renewable for 12 months. |
| 20.12 | Satisfaction of order | Recording satisfaction. |

### RULE 21 — REFEREE
| Rule | Heading | Governs |
|---|---|---|
| 21.01 | Referee | Powers and role of a referee; references **CJA s. 73(2)**. |

### RULE 22 — PAYMENT INTO AND OUT OF COURT
| Rule | Heading | Governs |
|---|---|---|
| 22.01 | Definitions | Definitions for the rule. |
| 22.02 | Non-application of rule | Where the rule does not apply. |
| 22.03 | Payment into court | Paying money into court. |
| 22.04 | Payment out of court | Obtaining money out of court. |
| 22.05 | Transition | Transitional provision. |

### TABLE OF FORMS
The regulation ends with a Table of Forms listing each form number, its title
and its effective date (extracted text lines ~3,430–3,457). **This is the
authoritative list for any form-catalogue staleness check**, and the effective
dates are what such a check needs. Not cross-referenced this session.

---

## What this map does NOT do

- It does not follow any cross-reference out of the regulation — the Courts of
  Justice Act, the Administration of Justice Act regulations on attendance
  money, or any tariff.
- It does not compare the Table of Forms against `legal_form_mapping_rules` or
  the form catalogue.
- It does not resolve any counting-method question the regulation leaves open.
  Part 1 and Part 3 record those silences precisely so a licensee review can be
  targeted rather than open-ended.
- It builds no user-facing content. Every deadline above still needs the
  "who does the applying" test applied before any of it reaches a user.
