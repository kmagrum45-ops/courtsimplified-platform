# Wording the forms need (list for the legal review chat)

Kept by Lane B (forms), 15 Nov 2026. Lane B writes no legal wording. Each item names:

- the form and box;
- what it must say;
- the saved source it should come from, and whether that source is saved.

Generated in part from the maps: `neededWording()` in `src/lib/case-system/forms/maps/index.ts` lists every box marked
`needsWording`.

**A correction to my report of 15 Nov (first round).** I said the Courts of Justice Act was not saved under
`docs/sources/`. It is: `docs/sources/corpus/cja-courts-of-justice-act.txt`.

- It is the e-Laws consolidation "from December 11, 2025 to the e-Laws currency date", vendored by `npm run rules:fetch`
  from https://www.ontario.ca/laws/statute/90c43.
- It is already a first-class citation for the stage map (`stage-map/citations.ts`).
- It holds ss. 127 (definitions), 128 (prejudgment interest), 129 (postjudgment interest) and 130 (discretion), at
  lines 6066–6193.

## 1. Form 7A, the interest boxes (4 boxes)

**Boxes:** "Start date for accruing prejudgement interest", "the Courts of Justice Act", "an agreement at the rate of",
"Percentage".

**What it must say.** One plain sentence for each choice, shown with the three questions in
`docs/forms/facts-needed.md` (c):

- that interest must be asked for in the claim;
- that an agreed rate is written as a yearly rate;
- that without an agreed rate the claim asks for interest at the rate the Courts of Justice Act sets.

No rate, amount or "you will get" is to be stated.

**Sources, saved:**

- `docs/sources/corpus/cja-courts-of-justice-act.txt`, ss. 127–129: the verbatim passages, selected by the legal chat.
- `docs/sources/corpus/guide-making-a-claim.txt`, the ontario.ca "Guide to procedures in small claims court: Making a
  claim". Lines 58–60 and 120–127 cover exactly these boxes, including a sample sentence and the yearly-rate rule.

**Saved 15 Nov 2026 (second round)** by `scripts/sources/fetchFormSources.ts`; README rows in `docs/sources/README.md`,
"Sources for the forms' wording list". Line numbers are in the `.txt` copy beside each file.

1. **The Ministry's prejudgment and postjudgment interest rate page**:
   `docs/sources/interest-rates/ontario-prejudgment-postjudgment-interest-rates.txt`
   (https://www.ontario.ca/page/prejudgment-and-postjudgment-interest-rates, "Updated: September 02, 2026").
   - **Lines 80–92: what the four boxes are about.** That interest must be mentioned in the claim to be included
     (line 85); an agreed rate is stated in the claim (line 87); a rate set by another source, for example the rule for
     non-pecuniary loss in personal injury (line 89); otherwise the Courts of Justice Act rate (line 91).
   - **Lines 99–106 and 107–132:** how each kind of interest is worked out, with examples. Lines 134–135: the page is
     where the Ministry publishes the rates "under the Courts of Justice Act".
   - **Line 136 on:** the prejudgment table, by year and quarter, for causes of action arising after October 23, 1989.
   - **Line 332 on:** the postjudgment table (and prejudgment for causes of action arising on or before October 23,
     1989).
   - The four boxes need only the person's choice and dates. A rate from the tables is stated only if the site ever
     shows one, and then with the page's date.
2. **The Interest Act (Canada), s. 4**: `docs/sources/federal/interest-act-I-15.txt`
   (https://laws-lois.justice.gc.ca/eng/acts/I-15/FullText.html, "Act current to 2026-10-19").
   - **Line 59 is s. 4 as in force** (marginal note "When per annum rate not stipulated", line 58).
   - **Trap:** lines 102 and 115 hold two *other* texts of s. 4. They sit under "AMENDMENTS NOT IN FORCE" (1996, c. 17,
     s. 17; 2001, c. 4, s. 175) and are not the law. Quote only line 59.
   - Line 56 is s. 3 (the rate where none is fixed), which the guide does not mention.

## 2. Form 7A, the court office (3 boxes, currently marked needsWording)

**Boxes:** "Small Claims Court", "Small Claims Court Address", "Small Claims Court Phone number".

**What it must say.** No wording is needed. These hold a fact, the court office, from the verified directory
(`courtLocations.json`, `test:court-locations`).

**Request:** reclassify them from `needsWording` to `needsFact` when Lane A adds `courtOffice`
(`facts-needed.md` (a)). Lane B can make the change once the fact exists.

## 3. Family Form 8 and Form 10: "Details of the order that you want the court to make"

**What it must say.** One checked sentence per claim box the person ticks (the claim names are the form's own),
describing in general terms what that claim asks the court for. The person's own words for the details stay theirs.

**Sources, saved:**

- `docs/sources/corpus/family-law-rules.txt`, O. Reg. 114/99 (r. 8 for the application, r. 10 for the answer);
- `docs/sources/corpus/divorce-act.txt` (s. 8, breakdown of marriage, for the divorce claim and its grounds);
- the forms themselves: `docs/sources/forms/flr-8-jun25-en.pdf` and `flr-10-jun25-en-fil.pdf`.

## 4. Form 8A: how the papers were served

**What it must say.** For each method the form lists, the form's own description is already its wording. What needs
checked wording is the explanation of which methods may be used for which papers, and anything said about when service
by mail or courier counts as made.

**Source, saved:** `docs/sources/corpus/oreg-258-98-small-claims-rules.txt`, rr. 8.01–8.04, 8.07, 8.07.1, 8.08 and
8.09.1 (lines 953–1320).

## 5. Forms 7A and 9A: "under 18 years of age"

**What it must say.** If a party is under 18, a short checked statement of what the rules then require: a litigation
guardian, and their consent on Form 4A. The next step comes from the stage map, never the asker.

**Sources:**

- Saved: `docs/sources/corpus/oreg-258-98-small-claims-rules.txt`, rr. 4.01–4.02 (from line 660).
- **Saved 15 Nov 2026:** Form 4A itself, `docs/sources/forms-reference/scr-4a-jan21-en-fil.pdf` (Jan. 1, 2021, from
  ontariocourtforms.on.ca). It is kept apart from `forms/` because the site does not fill it. Its own text is the
  wording of the consent; the rules say when it is needed.

## 6. Form 9A: admitting the claim, and terms of payment

**What it must say.** The form's own caution to the plaintiff (page 3: a proposal of terms is taken as accepted unless
the plaintiff asks for a terms of payment hearing within 20 days, citing r. 9.03(3)), shown when the person chooses to
admit any of the claim, in checked words.

**Sources, saved:** the form (`docs/sources/forms/scr-9a-aug22-en-fil.pdf`, page 3) and
`docs/sources/corpus/oreg-258-98-small-claims-rules.txt`, r. 9.03 (from line 1352).

## 7. Family Forms 13 and 13.1: which form, and what may be skipped

**What it must say.**

- Which of Form 13 or Form 13.1 applies to the person's claims.
- That a person only responding to a table-amount child support claim, and agreeing with it, completes only Parts 1, 2
  and 3. Those are Form 10's own instructions, page 1.

**Sources, saved:** `docs/sources/forms/flr-10-jun25-en-fil.pdf` (page 1, "INSTRUCTIONS: Financial Statement") and
`docs/sources/corpus/family-law-rules.txt` (r. 13).

## 8. Text I added that a reviewer should see (no law is meant; please confirm)

These are the reasons shown beside blank boxes. Most only describe the form itself. Some describe a step of
procedure, and those need a source or a rewording.

**Describes the form only (lower risk):**

- "Signed by hand."
- "Signed and dated by hand."
- "Written by hand on the day you sign."
- "Tick by hand if you attach a separate sheet."
- "Too long for this box on the official form: it would be cut off or printed too small to read. Write it by hand:
  "…"" (`formMap.ts`).

**Describes procedure. Each needs the form's own words, or a source:**

- Form 8A: "Filled in when the affidavit is sworn or affirmed before a commissioner."
  - Should come from the form's own jurat text (page 3, "Sworn/Affirmed before me").
- Form 8A: "Only when a summons to witness was served. Tick and fill in by hand if it applies."
  - Should come from the form's own words: "I paid or tendered the witness … attendance money".
- Family Form 8: "Not filled by the site: completed when the application is issued (the first court date, its place,
  and the case track)."
  - Who completes these boxes is procedure. Source: the Family Law Rules (r. 8; r. 39 for case tracks) or the form's
    own notice text. Until reviewed, the safe wording is "Not filled by the site."
- Family Form 8: "Signature - clerk of the court: For the court office." (and the same on Form 7A's issue boxes, from
  #550)
  - These are the form's own labels ("Signature of clerk"). Low risk, but listed.
- Family Forms 13 and 13.1: "Filled in when the statement is sworn or affirmed before a commissioner."
  - Should come from the form's own jurat text.

**Added with the attached pages (15 Nov 2026, second round):**

- Each attached page's own words: the form's number and title ("Form 7A, Plaintiff's Claim"; "Form 9A, Defence"), the
  box's printed heading with "(continued)" ("REASONS FOR CLAIM AND DETAILS (continued)"; "REASONS FOR DISPUTING THE
  CLAIM AND DETAILS (continued)"), and "Attached page N of M". The headings are the forms' own words; "(continued)"
  and the page label are the site's.
- The download's error when a character cannot be printed. **Replaced 15 Nov 2026 (fourth round)**, because the owner
  asked that it name the characters and never blame the person. The first version ("Some of your words use a character
  the attached pages cannot print, so the form was not made. Please write those words by hand on a page you attach.")
  did neither. Now (`printableText.ts` `unprintableMessage`, shown by `app/api/cases/forms/filled/route.ts`):
  "The form could not be made, because the site cannot yet print these characters in a PDF: 你 好. This is a limit of
  the site. You could write them by hand on the printed form." It now covers the boxes as well as the attached pages.
- **How some characters are printed (please confirm):** every kind of space (no-break, narrow no-break, thin, a tab)
  prints as a space, and the no-break hyphen (U+2011) as a hyphen. Helvetica draws each with the same mark. No letter is
  ever swapped or dropped (`printableText.ts` `forPrinting`).

## 9. Family Form 10: the applicant's address (question for the legal chat)

**What the box allows.** The official PDF's "Address - Applicant(s)", and the applicant's name, phone and email boxes
beside it, are:

- 200.08 × 14.4 points;
- Helvetica at a **fixed 12pt**, with the PDF's own "multi-line" and **"do not scroll"** flags.

That leaves about 195pt for one line at 12pt. An ordinary address does not fit: "44 Example Drive, Sudbury ON, P3B 2B2"
is 37 characters and 221pt; it would need 10.6pt. About 28 characters fit. Because of "do not scroll", a person typing
into the box in Acrobat or Reader cannot enter more than fits either.

The respondent's boxes, the same size, are set to fit (0). Only the applicant's are fixed.

**What the site cannot do.** pdf.js offers no way to set a box's font size when filling it. Changing the box's own size
or font in the PDF would be editing the court's form, which the site does not do (rule: the official form, as
published). So the box stays blank with the whole address to write by hand. That is the standing rule, unchanged.

**Two possible ways forward, neither built.**

1. **The person's own shorter version**, typed by the person for this box only. It is their own words, and the box
   fills only if it fits. No legal wording is needed; it is a request to Lane A (`facts-needed.md` (d)).
   - **It is weak.** Measured: "44 Example Dr, Sudbury ON P3B 2B2" (33 characters, 203pt) still does not fit.
     "44 Example Dr, Sudbury P3B 2B2" (30 characters, 181pt) fits only by leaving out the province.
   - Whether an address without its province, or without its postal code, is acceptable on the form is not for the site
     to say.
2. **An attached page.** The full address on an attached page, under the box's own label "Address - Applicant(s)".
   - Form 10 has no "additional pages attached" tick, and nothing in the box would tell a reader to look for the page.
     Writing "see attached" in the box would be the site's own wording, on a court form.
   - **Question for the legal chat:** does any saved source (the Family Law Rules, `docs/sources/corpus/family-law-rules.txt`,
     or the form's own instructions) say whether, and how, a party may continue a Form 10 box on an attached page?
     Until it is answered from a source, the site does not attach a page for it.

## 10. The exhibit book: a message when a name or title cannot be printed (decided 16 Nov 2026)

**Status: decided by the product owner: a plain product message, not legal wording.** Built.

**Where.** The exhibit book (`src/lib/case-workspace/exhibitBook.ts`, `GET /api/workspace/exhibit-book`) prints the
parties' names, the case title and each document's title in pdf-lib's Helvetica. French prints. A character outside it
(Chinese, for example) now stops the book before anything is drawn, through the same check as the forms
(`printableText.ts` `printableValues`), and the person is told (`exhibitBookUnprintableMessage`):

> The exhibit book could not be made, because the site cannot yet print these characters in a PDF: [characters]. This
> is a limit of the site, not a problem with what you wrote. For now, you can use a version of the name or title
> without them.

The person sees it in the exhibit book panel, where the book's index is built: the preview goes through the same check,
and "Build the book" stays unavailable until the index loads. Tested in `verifyPrintableEverywhere.ts` (checks 7-9).
