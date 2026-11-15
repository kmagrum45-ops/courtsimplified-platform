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

**Still needed before any rate is shown (not saved):**

1. The Ministry's published **prejudgment and postjudgment interest rate table**. The guide (line 126) says the rates
   are "available in the court office and on the Ministry's website at: www.ontario.ca/attorneygeneral". Retrieve the
   current table page from ontario.ca, save it under `docs/sources/`, and add a README row (URL, date, sha256). It is
   needed only if the site ever states a rate. The four boxes themselves need only the person's choice and dates.
2. The **Interest Act (Canada), s. 4**, which the guide paraphrases on line 127 (the 5% rule where a contract gives no
   yearly rate). Retrieve it from laws-lois.justice.gc.ca and save it in `docs/sources/corpus/` (via `rules:fetch` if
   it is added to the source list) before any sentence relies on it.

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
- **Not saved:** Form 4A itself (`scr-4a-…-fil.pdf`). The library only links to it. Save it under
  `docs/sources/forms/` if the site will ever fill it.

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
