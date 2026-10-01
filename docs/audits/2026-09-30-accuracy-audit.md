# CourtSimplified accuracy audit — 30 September 2026

Prepared for the site owners and for review by a licensed Ontario lawyer or
paralegal. It records what was checked, how, what was wrong, what was done,
and what is still open. Every finding below was checked against a saved copy
of the source under `docs/sources/` (the "corpus"), not from memory.

## Bottom line

| Independent random sample | Statements | Correct | Minor | Errors | Error rate |
|---|---|---|---|---|---|
| 1 — after the first full pass | 252 | 222 | 23 | **6** | 2.4% |
| 2 — after fixing sample 1 and auditing every remaining surface | 347 | 319 | 23 | **4** | 1.2% |
| 3 — after fixing sample 2 | 342 | 332 | 10 | **0** | 0% (95% upper bound ≈ 0.9%) |

Every finding from all three samples has been fixed. Each sample was drawn
with a new random seed, stratified across every kind of content, and checked
by four reviewers who had not seen the content being written or any earlier
review.

**"Error"** means a reader relying on the statement could be misled in
substance (a wrong deadline, a dropped condition, a quote not in the source, a
wrong decision-maker). **"Minor"** means imprecise wording that would not
mislead a reader about what they must do or can get.

This is not a claim of 100% accuracy. Zero errors in 342 randomly chosen
statements means the true error rate is very probably below 1%, not that it is
zero. No licensed professional has reviewed the content yet; this audit is the
preparation for that review, not a substitute for it.

## What was covered

About 2,030 user-facing statements across every surface:

| Surface | Units | How it was checked |
|---|---|---|
| Topic guides | ~1,020 paragraphs | Every claim read against its cited source (three passes) |
| Court forms explanations | 430 | Every explanation against the rule that names the form (two passes) |
| Case-type catalogue (Small Claims, civil, family) | 325 entries | Every entry re-read; verbatim quotes and a fingerprint recorded in `docs/sources/catalogue-verification.json` |
| Glossary | 96 terms | Every explanation against the statutory definition |
| Procedure cards (`/legal-principles`) | 84 statements | Every statement against the rule |
| Connection notes, next steps, education topics, question explanations, depth questions, checklists, assistant blocks, court pages | ~250 | Line by line in round 3 |
| AI-drafted stage answers | 16 | Line by line; most withdrawn (below) |
| Crisis helpline numbers | 4 numbers | Against the saved ontario.ca pages |
| The corpus itself | 203 sources | All re-fetched from the official sites and compared word by word |

## What was wrong, by kind

The dominant error was **a rule stated more broadly than it applies**: a
dropped condition or exception. Examples now fixed:

- Family motions: "at least 1 day's notice". Family Law Rules r. 14(11): serve
  6 days before, file 4 days before, confirmation (Form 14C) by 2 p.m. three
  days before.
- Examinations for discovery: "about 7 hours per examination". r. 31.05.1(1):
  7 hours **total** per party, however many people are examined.
- Form 72B and Small Claims Form 4B described as the affidavit for any payment
  out of court; the rules limit them to money held for a person under
  disability.
- Form 53B: "a witness who does not attend may be arrested" — r. 53.04(7)
  requires materiality, service and attendance money.
- Limitation periods described as running "from the incident"; the Limitations
  Act, 2002 runs from discovery (s. 4) with a presumption (s. 5(2)).
- Courts of Justice Act s. 23(1.1): since 1 July 2024 a claim within Small
  Claims limits needs leave to be started in the Superior Court. Several pages
  presented the Superior Court as a free alternative.
- "Family Court" described as one court hearing all family matters; the Family
  Court branch sits only in Hamilton and proclaimed areas (CJA s. 21.1(4)).
- Human rights listed as a civil claim type; a Code claim cannot be started in
  court on its own (Human Rights Code s. 46.1(2)).
- Consumer Protection Act cancellation periods given without their start
  points, the $50 thresholds, or the advance-payment condition.

Other kinds: wrong decision-maker (the clerk, not "the court", notes a
defendant in default); wrong pinpoints (17 form rule labels, then 9 more from
a parser that read a wrapped cross-reference as a subrule); "you"-form
wording that applied the law to the reader; and one statement that crossed
into advice.

## Things done beyond correcting text

- **AI-drafted stage answers withdrawn.** Of 16 published "what happens next"
  answers drafted by the content pipeline, 14 were withdrawn after reviews
  found errors or advice (e.g. "You have 90 days" presented as a defendant's
  deadline when it is the court's scheduling window). They cannot be corrected
  by hand by design; they return only after a new gated pipeline run. Two
  remain, each confirmed by independent reviews. The one generic answer was
  also withdrawn.
- **Source links fixed.** 49 catalogue entries linked readers to a repository
  path that is a 404 on the live site, and many linked to e-Laws `.doc`
  downloads. Links now open the court's decision page or the law's e-Laws page.
- **Crisis numbers verified.** The three ontario.ca pages behind the helpline
  numbers are now saved; every number matches.
- **The corpus re-checked.** All 203 sources were re-fetched and compared:
  no English legal text had changed since it was saved.
- **Eight missing sources saved**, including O. Reg. 333/08 (motor vehicle
  dealers), the last regulation the catalogue could not check.
- **New automatic checks in CI**, so these cannot silently return:
  `test:source-links`, `test:crisis-numbers`, `test:rules-corpus`,
  `test:published-library`, `test:generic-library`,
  `test:inventory-coverage`. Several of these existed but were not run in CI
  and had been failing unnoticed.

## A mistake made during the audit

The first pass reported that a procedure card's "30 days after the settlement
conference" trial-request line was in no rule. That was wrong: Small Claims
r. 13.07 has the clerk give a notice that a party must request a trial date if
the action is not disposed of within 30 days. The cross-site consistency check
caught it; the card now states r. 13.07 as written and the code comment records
the correction.

## Still open

1. **No licensed review yet.** Every statement is sourced and has been checked
   by independent reviewers, but none by a lawyer or paralegal.
2. **Stage answers: resolved 1 October 2026.** All 35 Small Claims stages now
   have a published answer (run-13), written from the saved sources and passed
   through six rounds of independent review: 10, 9, 4, 0 and 0 errors per
   round, then one error in the final check of edited sentences, fixed. One
   known gap is recorded in `docs/ACCURACY_ENGINE.md` (periodic-payment
   orders on the unpaid-judgment answer).
3. **Moore v. Sweet, 2018 SCC 52** is cited without a link: no verified public
   address was recorded when it was saved.
4. **The saved Rules of Civil Procedure lost "½" in r. 53.10** ("less per
   cent" where the source says "less 1½ per cent") through an encoding fault.
   Nothing quotes it; it should not be quoted from this copy.
5. **The Superior Court's family "steps in a case" page is not saved**; the
   one card that cites it was rewritten against the Family Law Rules instead.
6. **Accuracy decays.** Laws and court pages change. The weekly and monthly
   source checks flag changes; content citing a changed source should be
   re-read when they do.

## Reproducing this

Samples, reviewer outputs and patch sets were kept in the working session.
The method is in this document; the verification records are in
`docs/sources/catalogue-verification.json`; findings that cost effort to
establish are in `docs/SOURCING_NOTES.md`. The relevant changes are pull
requests #44–#50.
