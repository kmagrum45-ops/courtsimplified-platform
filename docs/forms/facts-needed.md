# Facts the case record needs for the official forms (spec for Lane A)

Written 15 Nov 2026 by Lane B (forms), from the form maps in `src/lib/case-system/forms/maps/`. Every box on the
official forms that stays blank today because the record does not hold its fact is listed by
`neededFacts()` (`forms/maps/index.ts`); this spec groups them into facts, in the owner's priority order.

**How to read it.**

- **Fact**: a proposed record name (Lane A owns the record and decides the final name).
- **Type**: what the value is.
- **Forms**: which forms the fact fills.
- **Question**: one question in plain English. It uses the form's own words, quoted from the saved official PDF, and
  states no law.
- **Where**: where the question is asked.
- **Not sure?**: whether "I'm not sure" is offered. Where it is, the box stays blank and says so, and the question is
  never asked again (the standing rule).

Nothing here is built. The forms side reads a fact only once the case file (`caseFileOf`) holds it. No form reads the
fact record or any other store directly.

Questions marked **(needs checked wording)** may not be asked until the legal review chat has given the explanation
that goes with them; see `docs/forms/wording-needed.md`.

---

## (a) First priority: court file number and court office

| Fact | Type | Forms | Question | Where | Not sure? |
|---|---|---|---|---|---|
| `courtFileNumber` | text (as printed, e.g. "SC-26-00001234"); never a number type | 9A, 8A, 1A (claim no.); Family 10, 13, 13.1 (court file number); later 7A/8 once issued | "What is the claim number (court file number) on the papers you were served with? It is at the top right of the first page." | It already exists as a fact (`FACT_IDS`) with a question id `courtFileNumber` (`factsOfQuestion.ts`), but **the case file does not expose it**. Request: add it to `caseFileOf`, so forms read `file.courtFileNumber`. Ask it on the step page for anyone served or with a case going; never for someone starting a case (the office gives it then). | Yes: "I don't have it yet" |
| `courtOffice` | an id from the verified court directory (below), never free text | 9A, 8A (Small Claims Court, address, phone); Family 8, 10, 13, 13.1 (name of court, court office address); 7A (where it will be filed) | Served: "Which court office is named at the top of the papers you were served with?" Starting: "Which court office will you file at?" Both are a choice from the list, searchable by city. | Step page, as a list from the directory, never typed. | Yes: "I don't know yet" |

**Where the court offices come from: verified court data only.**

- **Small Claims:** `src/lib/content-library/courts/courtLocations.json` (`COURT_LOCATIONS`). It is built from the
  Superior Court of Justice location pages (https://www.ontariocourts.ca/scj/court-locations/all-court-locations/),
  fetched 2026-09-30. The page text is saved under `docs/sources/court-locations/<slug>.txt`, and
  `npm run test:court-locations` checks every value against it. **59 locations list a Small Claims service. All 59
  have an address; 58 have a phone.** "47 Sheppard – Small Claims Courthouse" has emails only, so its phone box stays
  blank.
- **Family, Superior Court of Justice (including the Family Court branch):** the same directory. **50 locations list
  a family service, all with an address.** Only 30 of them carry a phone on the page.
- **Family, Ontario Court of Justice:** **there is no saved source with addresses.**
  - `ocjCourthouses.json`, from https://www.ontariocourts.ca/ocj/courthouse-email-addresses/ (saved as
    `docs/sources/court-locations/ocj-courthouse-email-addresses.txt`), lists 58 courthouses by region with **emails
    only**.
  - The OCJ location pages carry the address inside an HTML comment, so it is not reliably what the page shows
    (`courtLocations.ts` header).
  - Until an OCJ address source is retrieved and saved, an OCJ family office fills **the name only** and leaves the
    address blank with the reason.
- Which court (OCJ or SCJ) a Family case belongs in is not decided here. That is the court-and-process rule in
  CLAUDE.md s. 2a.

---

## (b) Second priority: Form 8A, service facts (the person served the other side)

**Not the same fact as the one asked today.** `sc-defendant-service-method` records how the person *was* served.
Form 8A needs how the person (or whoever they used) *served* someone. That is a new set of facts, one set per service
(a case can have several: the claim on each defendant, later a motion).

| Fact | Type | Forms | Question | Where | Not sure? |
|---|---|---|---|---|---|
| `services[]` | list; each entry is the rows below | 8A (one copy per service) | (a list, built one service at a time) | A "Service" step, offered once the claim or defence is issued | — |
| `service.server` | "me" or another person's full name and municipality/province | 8A "My name is", "I live in", deponent names | "Who served the papers? You, or someone else (their full name and the city or town they live in)?" | Service step | No. The affidavit is sworn by the person who served; if they don't know, the affidavit can't be made yet. |
| `service.servedOn` | a party id (from the parties record), or a named person at a company (name and office or position) | 8A "Full name of person/corporation/etc who was served", "Name 1", "Office or position" | "Who did you serve: which party? If a company, which person did you give it to, and what is their job there?" | Service step, choosing from the parties already recorded | No |
| `service.date` | date | 8A date of service (day, month, year) | "On what day were the papers served?" | Service step | No (the day is sworn to) |
| `service.where` | an address, or an email address; plus which kind of address it was | 8A street/mailing address or email; the six "address of …" ticks | "Where were they served? Give the address (or the email address), and tell us what that address is: their home, their place of business, their representative's address, the address on their last court document, the company's attorney for service, or another address." | Service step | No |
| `service.documents` | list of document names (from the papers the record holds, plus free text) | 8A "Name(s) of document(s) served" | "Which papers did you serve?" | Service step | No |
| `service.method` | one of the methods the form lists | 8A method ticks and their details (mail, courier, email with its time, leaving a copy at home, with a lawyer or paralegal, directors' addresses, substituted service and its order date) | "How were the papers served?" A choice from the form's own list, then only the details that method needs. **(needs checked wording)** Each method's description is the form's own words; which methods are allowed for which papers is law (O. Reg. 258/98 rr. 8.01–8.04, 8.07–8.07.1, saved in `docs/sources/corpus/oreg-258-98-small-claims-rules.txt`) and must come from the checked answer, not the asker. | Service step | No |
| `service.attendanceMoney` | amount, only if a summons to witness was served | 8A "I paid or tendered the witness" | "Was this a summons to witness? If so, how much attendance money did you pay?" | Service step, only when the documents include a summons | Yes |

---

## (c) Third priority: Form 7A interest and under-18

| Fact | Type | Forms | Question | Where | Not sure? |
|---|---|---|---|---|---|
| `interest.claimed` | yes / no | 7A interest section | "Do you want to ask for interest on the money you are claiming?" **(needs checked wording)** | Small Claims amount step, after the amount | Yes (box left blank; the person can decide later) |
| `interest.agreedRate` | yes (with the annual rate as a percentage) / no | 7A "an agreement at the rate of … %" or "the Courts of Justice Act" | "Is there a written agreement (for example a contract you both signed) that sets an interest rate? If so, what is the yearly rate?" **(needs checked wording)** The guide says the rate is given per year, and a monthly rate needs explaining. | Same step | Yes |
| `interest.fromDate` | date | 7A "Start date for accruing prejudgment interest" | "From what date are you asking for interest?" **(needs checked wording)** | Same step | Yes |
| `party.under18` | yes / no, for each party who is a person | 7A "Plaintiff under 18 years of age", "Defendant under 18 years of age"; 9A the same two boxes | For the person: "Are you under 18?" For each other party: "Is [name] under 18, as far as you know?" **(needs checked wording)** If anyone is under 18, rules 4.01–4.02 apply (litigation guardian; saved in `docs/sources/corpus/oreg-258-98-small-claims-rules.txt`), and the next step must come from the map, not the asker. | Parties step, one line per person (a company has no age) | Yes for the other side; no for the person themselves |

Form 1A has no under-18 box; a party listed there is shown on the form as listed.

---

## (d) Fourth priority: Family

| Fact | Type | Forms | Question | Where | Not sure? |
|---|---|---|---|---|---|
| `relationship.marriedOn` | date | Family 8 "Date - Married on" | "On what date were you married?" | Family step, only when `married` is yes | Yes |
| `relationship.livedTogetherOn` | date | Family 8 "Started living together on" | "On what date did you start living together?" | Family step | Yes |
| `relationship.separatedOn` | date, or "never lived together", or "still living together" | Family 8 "Separated on", "Never lived together", "Still living together" | "Have you separated? If so, on what date? (Or: you never lived together / you still live together.)" | Family step | Yes |
| `children[]` | list: full legal name, birthdate, municipality and province where they live, whom they live with and that person's relationship to the child | Family 8, the children table (up to 6 rows; age is worked out from the birthdate, never asked) | "For each child: their full legal name, their date of birth, where they live, and who they live with now." | Family step, only when `children` is yes. Names are sent to no model (`test:parties-never-to-ai` and the label layer must cover them before this is built). | Yes, for each field |
| `party.familyDetails` | for each party: birthdate, municipality and province, date they began living there, first and last name just before the marriage, gender, previous divorce (place and date) | Family 8 page 3 | "For you and the other party: date of birth, where you live and since when, your names just before the marriage, gender, and whether either of you was divorced before (where and when)." | Parties step, Family only | Yes for the other party; the person may skip gender |
| `family.claims` | list of the claim ticks on Family 8 p. 4–5 / Family 10 p. 4 | Family 8 claims, Family 10 own claims | "Which orders are you asking the court for?" A list of the form's own claim names. **(needs checked wording)** It needs one checked sentence per claim; the choice is the person's (s. 4), never suggested by the model. | Family "what you want" step (`wants` stays the person's own words, separate) | Yes ("not decided yet": the boxes stay blank) |
| `family.earlierCases` | yes/no and details: earlier court cases, written agreements, child support (re)calculations, arbitration awards, each with its date | Family 8 "No/Yes 1–5" and their details | "Has there been an earlier court case, a written agreement, a child support recalculation or a family arbitration award between you and the other party? If so, when, and what is in dispute?" | Family step | Yes |
| `family.divorceGround` | separation (date, and any time living together again) / adultery (details) / cruelty (details) | Family 8 p. 5 | "If you are asking for a divorce, on what basis?" **(needs checked wording)** The grounds are law: Divorce Act s. 8, saved in `docs/sources/corpus/divorce-act.txt` ("Breakdown of marriage"). | Family step, only when "a divorce" is among the claims | Yes |
| `family.answer.position` | which of the applicant's claims the person agrees with and which they do not (by the application's numbers) | Family 10 para. 1–2 | "Which of the applicant's claims do you agree with, and which do you not? (Use the numbers beside the boxes on page 4 of their application.)" | Family respondent step | Yes |
| `family.answer.historyCorrect` | yes / no | Family 10 "The FAMILY HISTORY … is correct / is not correct" | "Is the family history in the application correct?" | Family respondent step | Yes |
| `family.addedParties` | list: full legal name and address of any added respondent or party | Family 8 / 10 "AND TO", added party; the Children's Lawyer agent box | "Is anyone else a party to this case (an added respondent)? Their full legal name and address." | Parties step, Family | Yes |

---

## (e) Fifth priority: the defence on Form 9A (the being-sued side is hidden in the beta)

| Fact | Type | Forms | Question | Where | Not sure? |
|---|---|---|---|---|---|
| `defence.response` | dispute / admit all / admit part (with the amount admitted); any mix the form allows ("check as many as apply") | 9A p. 2 ticks, "Admit part … in the amount of $" | "What do you say about the claim against you: you dispute it, you agree you owe all of it, or you agree you owe part of it (how much)?" **(needs checked wording)** Admitting has consequences set out on the form itself (the caution about terms of payment, r. 9.03, saved) that must be shown in checked words. | Defendant step | No ("not decided yet" leaves the boxes blank but is not "not sure") |
| `defence.paymentTerms` | amount, per week or month, first payment date | 9A both "$ … per … commencing" rows | "If you agree you owe some of it, how would you pay: how much, how often, starting when?" | Defendant step, only after an admission | Yes |
| `defence.whyDisagree` | the person's own words | 9A "Why I/we disagree with all or part of the claim" | "In your own words, why do you disagree with the claim?" | Defendant step | Yes (the box stays blank; the story already fills "what happened" when the record says the person is the defendant) |

---

## Family Forms 13 and 13.1: the financial statements are their own feature

No code. A design sketch only, from the saved official forms (`docs/sources/forms/flr-13-may21-en-fil.pdf`,
`flr-13-1-may21-en-fil.pdf`: 344 and 327 boxes; the record holds none of their figures today).

**Why it is its own feature.** It is a sworn statement of the person's whole financial life: around 300 figures, each
of which may need proof. It is not a handful of facts to add to the case file. It needs its own record section, its
own save, and its own screen that can be left and resumed, with figures that add up.

**What to ask, in this order (the order of the form itself):**

1. **Who and where** (already filled: page 1 header, "My name is", "I live in").
2. **Work** (page 1): employed (employer's name and address), self-employed (business name and address), or
   unemployed since (date).
3. **Income** (page 2): the yearly amount for each line the form lists, then which proof documents are attached.
   Form 13.1's page 10 is the extra income sources.
4. **Other benefits** (page 3, item 14).
5. **Expenses** (page 3 on): monthly, line by line as the form groups them. Offer "I'll fill this by hand" per group.
6. **Household** (Form 13.1 page 4): who the person lives with.
7. **Assets, then debts** (Form 13 pages 4–6; Form 13.1 pages 5–7): what is owned, by kind, with its value. Form 13.1
   asks for each value on the valuation date and on the date of marriage.
8. **Form 13.1 only:** property on the date of marriage (page 8), excluded and disposed-of property (page 9), and the
   net family property total.
9. **Schedules** (Form 13 pages 7–8; Form 13.1 page 10): other income in the household; special or extraordinary
   expenses for each child.

**What can be skipped, and how.**

- The site never decides it. When a part may be skipped is law. Form 10's own instructions (saved PDF, page 1) say
  that a person "ONLY responding to a claim for child support in the table amount … AND [who] agree[s] with the claim"
  completes only Parts 1, 2 and 3 of Form 13.
- That sentence, and which of Form 13 or 13.1 applies, must come through the checked answer from the saved forms and
  the Family Law Rules (r. 13, `docs/sources/corpus/family-law-rules.txt`). Never from the asker.
- Every figure can be left for the person to write by hand; a skipped group is said, never filled with 0.
- Totals are added up by code from the person's figures, never by a model.
- **Privacy:** figures, employers and account details are sent to no model. The same build check as the parties
  (`test:parties-never-to-ai`) must cover the new section before anything is asked.
