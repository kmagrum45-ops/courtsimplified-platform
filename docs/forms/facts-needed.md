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
- **Family, Ontario Court of Justice:** **the 4 family offices the site uses now have an address, from the
  Ministry's own courthouse pages (15 Nov 2026).**
  - `ocjCourthouses.json` (https://www.ontariocourts.ca/ocj/courthouse-email-addresses/, saved as
    `docs/sources/court-locations/ocj-courthouse-email-addresses.txt`) lists 58 courthouses with **emails only**. The
    site treats 4 as family offices, the ones the list marks family (`nextStepPractical.ts` `ocjFamilyEmails`):
    Milton, Thunder Bay, 311 Jarvis Family and 47 Sheppard Family.
  - **Saved 15 Nov 2026:** all 144 courthouse pages of the Ministry's directory (`docs/sources/court-locations/ontario-ca/`,
    rows in `docs/sources/README.md`), read into `src/lib/content-library/courts/ministryCourthouses.json`: each
    courthouse's name, address and types of court, each with its `.txt` line (`test:form-maps`,
    `verifyMinistryCourthouses.ts`).
  - **Correction to my report of 15 Nov (third round):** I wrote that each courthouse's page says which court sits
    there. It does not. A page lists types of court ("Family", "Small claims", "Civil" …) but almost never whether the
    Ontario Court of Justice or the Superior Court of Justice runs them: only 3 of 144 mention the Ontario Court of
    Justice, none the Superior Court. My one checked page (10 Armoury Street) is the exception: its own name is
    "Ontario Court of Justice – Toronto".
  - So each office is matched by evidence, and the method is recorded in the data file:

    | Office (the OCJ list's name) | Method | Address (the Ministry page) |
    |---|---|---|
    | 311 Jarvis Family | street: "311 Jarvis" begins exactly one page's address | 311 Jarvis St., Toronto, Ontario M5B 2C4 |
    | 47 Sheppard Family | street | 47 Sheppard Ave. East, Toronto, Ontario M2N 5N1 |
    | Milton | the only courthouse in Milton the Ministry lists with Family | 491 Steeles Ave E., Milton, Ontario L9T 1Y7 |
    | Thunder Bay | the only courthouse in Thunder Bay with Family | 125 Brodie Street North, Thunder Bay, Ontario P7C 0A3 |

    - 311 Jarvis's page lists **no** types of court; that a family office is there comes from the OCJ list's own name
      for it ("311 Jarvis Family").
    - A "city" match is two sources put together (the OCJ hears family cases in Milton; the Ministry lists one
      family courthouse in Milton), not one page saying both.
    - **Site owner's decision (15 Nov 2026, fifth round):** when the Family forms get screens, wire **only the
      street-matched offices** (311 Jarvis Family, 47 Sheppard Family) into the court office address box. **Milton and
      Thunder Bay stay name-only**, the address box blank with its reason. Nothing is wired yet: no screen offers the
      Family forms.
    - The pages write the city line as "Milton , Ontario" (a space before the comma, from the page's markup). The data
      keeps the line as on the page; a box would need it written "Milton, Ontario".
  - Beyond the 4: of the 58 courthouses on the OCJ list, 46 are in a city where the Ministry lists exactly one family
    courthouse, 10 in a city with several (Toronto, Sudbury, Timmins, Brantford, Napanee, Stratford, Windsor), and 2
    find none only because the names differ ("Durham (Oshawa)"; "L’Orignal" with a different apostrophe). The site
    does not use them as family offices.
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

Form 1A has no under-18 box; a party listed there is shown on the form as listed. Form 4A (consent to act as litigation
guardian) is now saved for reference (`docs/sources/forms-reference/scr-4a-jan21-en-fil.pdf`); the site does not fill it.

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
| `party.addressForBox` (optional, second round) | text, the person's own shorter version of an address, for one box only | Family 10 "Address - Applicant(s)" (one line at a fixed 12pt: about 28 characters fit) | "This address is too long for its box on the form. If you want, type a shorter version for this box; otherwise write it by hand." Offered only when the full address does not fit. | Beside the box on the form screen | Yes: skipping leaves the box blank, as now. **Weak:** a full Ontario address with its province and postal code does not fit (see `wording-needed.md` s. 9) |

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

## Printing French in the official boxes (decided and built, 15 Nov 2026)

Not a fact to collect, but it decides whether facts already collected print correctly.

- **The cause.** Many of the court's boxes carry their own copy of Helvetica with **no character map** (no
  `/Encoding`), so only the font's standard set is available, which has no é, è, ç or €. The form's main Helvetica
  (PDFDocEncoding) and its Arial (WinAnsiEncoding) have them. When a value had a character the box's font could not
  encode, pdf.js saved **no drawing** for that box and set `NeedAppearances`, leaving every viewer to draw every box.
  Before the fix, French drew correctly in: 7A 6 of 50 boxes; 1A 60 of 61; 9A 55 of 57; 8A 3 of 62; Family 8 79 of 90;
  Family 10 22 of 41; Family 13 221 of 296; Family 13.1 20 of 302.
- **Site owner's decision (fifth round): option 2**, applied only when the person's words need it. Built as
  `fontMaps.ts`, used by `officialPdf.ts` `fillReadable`:
  - The form is filled as published. Only if pdf.js left a box for viewers to draw is it filled again, on the court's
    file with an **update appended** (as PDF allows) that redefines only the map-less box fonts, adding the character
    map the form's main Helvetica already uses (the court's own map object). Same font, same size, nothing visible
    changes.
  - **The court's protection is kept**, even when the update is added: a font object holds no text, so nothing in the
    update needs encrypting, and every byte of the court's file stays as it was (check 3: same permissions as the
    official file). So nothing was "rebuilt" in the sense of option 2 as first described; the protection question
    did not arise.
  - A download whose words need no map is byte for byte what pdf.js makes of the court's file (check 6, clock and
    randomness fixed: pdf.js encrypts every string it writes with a random starting block, so no two fills are alike
    otherwise).
  - Which fonts, and which map, come from `fontMaps.json` (33 fonts across the 8 forms), built by
    `npm run forms:font-maps` with MuPDF from outside the project (AGPL, build time only), keyed by each PDF's sha256.
    A changed court PDF is refused until the table is rebuilt.
- **Result:** every text box of the 8 forms reads back each of the owner's values ("Gagné", "Élève", "Saint-Jérôme",
  "François-Xavier", "œuvre", "€") exactly, in pdf.js and in MuPDF. **No box still cannot draw French.** The only
  values left out are ones too long for their box (two-digit year boxes, age boxes and the like), which the site leaves
  blank with the whole value to write by hand, as for any text.
- MuPDF is not a dependency of the site, so CI reads back with pdf.js only and says the MuPDF part was skipped. Run
  with `MUPDF_MODULE=<path to mupdf/dist/mupdf.js>` to include it.
- Downloads with **attached pages** are still rebuilt by pdf.js and have no protection, as before (unchanged by this).
- **Trap for later:** pdf.js's page assembly (`extractPages`) splits a box name at a full stop. Family 13's 75 boxes
  named like "Value or Amount (0.00) 2" come out as "00) 2". No form with such names has attached pages today; if one
  gets them, that must be solved first.
- Characters no font here covers (Chinese, for example) are still refused, in the boxes and the attached pages, with
  the same message.
