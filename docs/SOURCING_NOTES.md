# Sourcing Notes — read before starting any sourcing work

**What this is:** operational knowledge for a session doing CLAUDE.md section 2
sourcing work (a new `ClaimType`, `EducationTopic`, `JurisdictionRoute`, defence
concept, or any other legal-fact citation). Techniques that work, dead ends
already ruled out, and negative findings that cost real tool-call effort to
establish. **Not** user-facing content, **not** a sourced registry itself —
nothing here needs a citation the way `claimTypes.ts` does, because nothing
here is a legal fact CourtSimplified asserts to a user.

**Why this file exists:** this knowledge used to live scattered across commit
messages and file-header comments, where it got independently rediscovered —
at real tool-call cost — more than once. The Fault Determination Rules dead
end below was chased twice before commit `3bd2667` found the actual answer.
Check here first; it's faster than re-running the search.

**Keep this current.** When a sourcing session establishes a new technique, a
new dead end, or confirms something doesn't exist, add it here in the same
session — a one-line addition now is cheaper than a future session
re-discovering the same wall.

**Related, more detailed documents** (this file is the fast pre-check, not a
replacement for these):
- `docs/INTAKE_STATUS.md` §4 — the fuller, currently-maintained list of what's
  permanently closed vs. still open and re-attemptable for intake content
  specifically.
- `docs/PROCEDURAL_RULES_INVENTORY.md` — a full audit of every procedural rule
  the codebase currently depends on, classified SOURCED / CITED-UNVERIFIED /
  STATED-WITHOUT-CITATION / KNOWN-GAP.
- `docs/sources/README.md` — the provenance log for manually-downloaded
  primary sources.

---

## Techniques that work

### Cutting judgments into citable passages: what is the Court's and what is not (2026-10-05)

`src/lib/case-system/retrieval/decisionChunker.ts` makes the saved judgments
searchable. A judgment is mostly not quotable as law, and each of these was
found by looking at the output:

- **S.C.R. PDFs number paragraphs three ways**: "[28]" (from about 2005),
  a bare number on its own line at the inner margin, and -- on left-hand
  pages -- a bare number in the OUTER margin, past the French column, either
  alone or at the end of a text line. Keeping only the English column drops
  the outer-margin numbers, and one lost number folded the rest of Garland
  into one paragraph. `deriveDecisionText.ts` moves them into the English
  column; the chunker also accepts a small forward jump in the sequence.
- **Soft hyphens (U+00AD)** are embedded in some judgments (Sattva, and the
  SCC's HTML pages). Invisible, and they stop a quote matching.
- **Only the majority's reasons.** Split at each "The judgment of ... was
  delivered by" / "The reasons of ... were delivered by" / "The following are
  the reasons delivered by"; keep the set signed by the most judges. The
  majority's own heading can sit in the French column and be lost (Southcott):
  then the reasons from [1] are the majority's. A block whose first paragraph
  names its author "(dissenting)" is a dissent whatever its heading says
  (Honda [81], Pecore [77], Southcott [64]).
- **Not the courts below.** Inside the majority, sections headed Facts,
  Background, Judgments / Decisions Below, Judicial History, The Trial
  Decision are dropped. Machtinger's "II. Judgments Below" reports the Court
  of Appeal holding employees "limited to the benefits conferred by the Act"
  -- the holding the Supreme Court reversed.
- **Court of Appeal decisions** have no "delivered by" heading: reasons run
  from [1], headings are capitals at the margin (BACKGROUND, THE TRIAL
  DECISION), and a dissent starts at a line naming its author "(dissenting)".
- **Concurrences are left out** (Machtinger, McLachlin J.): a separate
  judge's reasoning is not the Court's. Queen v. Cognos is the hard case --
  La Forest J.'s three-judge block agrees with Iacobucci J., so the
  most-judges rule keeps La Forest J.'s short reasons and loses Iacobucci
  J.'s. Recorded rather than special-cased.

### Cutting e-Laws text into citable passages: what the structure really is (2026-10-05)

`src/lib/case-system/retrieval/corpusChunker.ts` cuts the corpus into
passages for meaning-based retrieval, each labelled with its provision. What
it took to make the label true, measured on all 206 vendored files:

- **Three section styles, one of them ambiguous.** "46 (1)  On application"
  (statutes), "1.03  (1)  The" (rules), and the older "3.  In any action"
  (Negligence Act, most regulations) -- which looks exactly like a numbered
  paragraph ("2.    The date a divorce is granted"). They differ by
  layout: a paragraph's text is aligned to a fixed column, so its number is
  followed by 3+ spaces; a section's by 2.
- **The first amendment-history citation after a section names it** when the
  section is unamended ("R.S.O. 1990, c. N.1, s. 3"). An amended section's
  history names the AMENDING act ("2009, c. 11, s. 35" after FLA s. 46 (1)),
  so history can confirm a section but not deny one -- unless it is a
  citation of the instrument's own chapter naming a different number, which
  means the candidate is a wrapped cross-reference ("20.10 (7).  O. Reg.
  258/98, r. 20.03." is the END of r. 20.03).
- **"Next number must be greater" fails greedily.** One stray accepted number
  blocked Insurance Act ss. 100-109 (sections 67-99 are repealed, so the gap
  is real) and Small Claims rr. 20.04-20.09. Use the heaviest increasing run
  of candidates instead, weighting history-confirmed ones.
- **Rule numbers sort by the two-digit subrule**: "24.1.01" is rule 24.1,
  subrule 1, and comes after "24.05"; "1.03.1" is rule 1, subrule 3.1.
- **A partly revoked section still starts on its revoked line**: civil
  "20.04  (1)  Revoked: ..." is followed by (2), the summary judgment test.
  Drop only lines where the WHOLE provision is gone.
- **Not-in-force replacements have no end marker.** After "Note: On a day to
  be named ... the following substituted: (See: 2025, c. 6, Sched. 6,
  s. 1 (1))" the replacement runs until the amending act's own citation
  reappears -- for a substituted subsection. A substituted PARAGRAPH carries
  no citation; it ends where the next paragraph starts. The "(See: ...)"
  reference itself can wrap onto the next line.
- Justice Laws (federal) text has no numbered-paragraph ambiguity
  (paragraphs are "(a)") and its history cites amending acts only.

The `test:corpus-retrieval` suite keeps each of these as a reference case.

### Courthouse addresses: the Superior Court's own location pages (2026-09-30)

`https://www.ontariocourts.ca/scj/court-locations/all-court-locations/` links
65 location pages (`/scj/locations/<slug>/`); the Fetch Decisions workflow
fetches them (ontariocourts.ca is an allowed host). Each page has the address
under `<h2 class="red-font">`, then Bootstrap tabs (`#ex1-tabs-N`) per court
type, each with a table of event / email / phone. Traps: nine small-claims-only
locations have no address under the heading, only inside the Small Claims tab;
the LAST tab pane on a page is followed by a `<script>`, not another pane, so
a pattern that stops only at the next pane misses it. **The Ontario Court of
Justice location list** (`/ocj/court-locations/`) is a search box over an
embedded `ontariocourtlocations = [...]` array of NAMES only. The per-location
pages (`/ocj/locations/<slug>/`) exist, but the address block on them sits
inside an HTML comment, so it is not reliably what the page displays. What is
clean: `/ocj/courthouse-email-addresses/` (58 courthouses by region, city,
email, some with separate criminal and family addresses). The directory uses
that and points to the ministry for addresses, as the page itself does.

### Writing the in-depth guides: what the independent read found (2026-09-30)

Ten guides (`src/lib/content-library/guides/`) were written from the corpus
only, then each paragraph was read against its cited provision by a second
reader. **84 of 322 paragraphs needed a fix, and almost none were misquotes**
(quotes are machine-checked). The errors were paraphrase that dropped a
condition or exception the source states: r. 61.04 (1.1) service exceptions,
r. 24 (5) child protection costs, r. 76.12.1 (2) applying only to actions
started on or after January 1, 2020, s. 5 (1) (a) (iv) "having regard to the
nature of the injury", "must be below" an income limit. Lesson: a verbatim-
quote check is necessary and nowhere near sufficient. Every paraphrase needs a
read against the provision, and the reader has to look for what is MISSING.

Source-format traps hit while writing them:
- e-Laws rule files use straight apostrophes; ontario.ca guide pages use
  curly ones. A quote of "party's" must match the file it came from.
- A line break inside a hyphenated word ("cross-\nexamine") collapses to
  "cross- examine"; reword rather than quote across it.
- Three Steps to Justice pages in the corpus were last reviewed on February
  23, 2017 (including the 20% wage-garnishment figure and "only a lawyer can
  represent you in Superior Court"); the guides state that date wherever they
  rely on one alone.

Second batch (family and civil guides, same day): 54 corrections in about 300
paragraphs, the same kind (dropped "unless the court orders otherwise", "in
itself", "at the time the application is made", scope clauses like "under
section 9 or 10"). Family-source traps:
- FLA s. 46 and CLRA s. 35 print the NOT-in-force 2025, c. 6 replacement text
  inline after a "Note: On a day to be named..." line, and para. 1 of s. 46 (3)
  / s. 35 (2) appears twice (old wording, then new). Quote only the first.
  Other not-in-force FLA provisions: ss. 10.1 (7), 56.1 (4), 59.4.1 (4).
- The Divorce Act file repeats each defined term ("court court , in respect
  of a province, means"); do not quote across the start of a definition.
- Which child support guidelines apply in an Ontario divorce still turns on
  the Divorce Act s. 2 (5) designation, which is not vendored; the Spousal
  Support Advisory Guidelines are not vendored either. The guides say so.

Not in the corpus, so the guides say so instead of covering it: duty counsel,
Family Law Information Centres, Legal Aid Ontario's services, requesting a
disability accommodation from a court, the Wages Act and Execution Act,
Family Law Rules 28-31 in detail, a civil test for setting aside default.

### The glossary comes from the definitions provisions (2026-09-30)

`npm run glossary:index` (`scripts/glossary/buildGlossary.ts`) reads only the
definitions provisions: Small Claims r. 1.02 (1), civil r. 1.03 (1), family
r. 2 (1), CJA s. 1 (1), Limitations Act s. 1, FLA ss. 1 (1), 4 (1), 17 and 29.
96 terms. Each provision starts at a line matched exactly ("1.02  (1)  In these
rules,") and ends at the next subsection marker or blank line; the French
equivalent in brackets after each definition is dropped. The same word is
often defined differently by different instruments ("court", "spouse",
"document", "property"), so a term keeps every definition with its pinpoint.
Words the site uses constantly but no instrument defines ("service", "noted
in default", "affidavit") are NOT in it: they would need a source that
defines them, and none of these provisions do.

### Every form explained from the rule that names it (2026-09-30)

The explanation of a court form is in the regulation itself: the rule that
calls for "a defence (Form 9A)" says what Form 9A is for. `npm run forms:index`
(`scripts/forms/buildFormRuleIndex.ts`) reads each regulation's own TABLE OF
FORMS (the LAST "table of forms" heading in the file -- the first one is the
contents page) and quotes up to three provisions naming each form.

- **Coverage:** Small Claims 46/46 forms named in a rule, Family 144/144,
  Civil 236/240. The four civil forms no rule names by number are 4B, 59C,
  74B.1 and 74H; they are explained from their titles and say so.
- **Forms are named in lists**, not one at a time: "application (Form 8, 8A,
  8B, 8B.1 ...)", and **"Forms 64B to 64D" is a range** (64C included). A
  search for `Form 8A` alone finds only 118 of 144 family forms.
- **Rule numbers only go forward.** A numbered paragraph inside a rule ("1.1
  The notice of motion shall be in Form 37A." inside r. 68.01) looks exactly
  like a rule heading; the generator rejects a "rule number" that jumps
  backwards or more than six rules ahead.
- **Cutting a long sentence can cut the form number off** ("... immediate
  foreclosure (Form"). The quote window must contain the whole mention; the
  first version lost it in 14 quotes, and only the "names its form" check
  noticed.
- **Summaries** (`src/lib/content-library/forms/formSummaries.json`) were
  written from the title and quotes alone, then re-read independently against
  them: 32 of 430 corrected for detail the quote did not support ("bailiff",
  "sworn statement" for a statutory declaration, who signs). The suite can
  check numbers and advice words mechanically; it cannot check meaning, so a
  change to a summary needs the same re-read.
- **Not used as explanations:** the database's `purpose` column (the title
  again for every form), `court_forms`/`forms` (placeholder descriptions, no
  readers), `formKnowledgeBase.ts` (12 forms, unsourced). `src/lib/content-library/forms/formGuide.ts` is now
  the one place a form is explained.

### Court of Appeal for Ontario and SCC decisions: the Fetch Decisions workflow (2026-09-30)

**This closes the "no Ontario appellate law at all" gap recorded under Noting up.**
The Court of Appeal publishes its own decisions database at
`coadecisions.ontariocourts.ca` (Lexum/Decisia, the same software as
`decisions.scc-csc.ca`). The cloud workspace cannot reach it (the shell's proxy
refuses the CONNECT; WebFetch gets 403 on the Lexum pages, and asks for approval
on others). **GitHub's runners reach both, first time, HTTP 200.**

- **Run it:** dispatch **CourtSimplified Fetch Decisions**
  (`.github/workflows/courtsimplified-fetch-decisions.yml`) with a
  space-separated `urls` input:
  `POST .../actions/workflows/courtsimplified-fetch-decisions.yml/dispatches`,
  body `{"ref":"main","inputs":{"urls":"..."}}`. It publishes raw bytes plus
  extracted text (PDF via `pdftotext -layout`; HTML with links kept as
  `[LINK href]`) to `sources-vendor-decisions-<run>` (Vercel-excluded by
  `sources-vendor-*`). About a minute for 20 documents.
- **Allowed hosts only:** `coadecisions.ontariocourts.ca`,
  `decisions.scc-csc.ca`, `ontariocourts.ca`. The script refuses any URL
  containing `canlii`, whatever it looks like.
- **URL shapes (ONCA):** full text PDF `/coa/coa/en/{id}/1/document.do`;
  case page `/coa/coa/en/item/{id}/index.do` (cite this one as the
  `officialUrl`); **search is `/coa/en/d/s/index.do?cont=<query>&ref=&d=&p=&col=1&or=&iframe=true`**
  -- note ONE `coa`, not two. `/coa/coa/en/d/s/index.do` returns a JSON 404,
  which cost a run. SCC search: `/scc-csc/en/d/s/index.do?cont=...`. The RSS
  feed (`/coa/coa/en/rss.do`) and year pages (`/coa/coa/en/{year}/nav_date.do`)
  also work. Search results list `item/{id}` links with the citation and date,
  so a search run followed by a document run is the whole workflow.
- **Search result ids are not citations.** One file came back named after a
  case cited inside it (the first `ONCA` citation in the text): the file for
  item 17952 is Dawe v. The Equitable Life Insurance Company of Canada, 2019
  ONCA 512, not 2016 ONCA 79. Take the citation from the header.
- **Bilingual SCC judgments:** the English and French columns interleave line
  by line, so a quote longer than one line never matches the raw text. Keep the
  original and save a derived English-column copy beside it
  (`*.english.txt`: each line cut at the first run of 3+ spaces, lines that
  start in the right column dropped). Words hyphenated across lines
  ("cre-\nate") need joining before comparing.
- **What was fetched and read on 2026-09-30** (23 decisions, for how
  multi-part disputes divide between forums): the six cited are saved in
  `docs/sources/decisions/` and listed in `docs/sources/README.md`. Read and
  NOT used, with the reason, so nobody re-reads them for the same purpose:
  Spirleanu 2015 ONCA 187 (endorsement, rests on re-litigation); Kiselman v.
  Klerer 2022 ONCA 489 (former RTA ss. 87(1), 89(1), since repealed; footnote 3
  says the 2020 amendments may change the result -- the current RTA must be
  read before saying anything about landlord claims against former tenants);
  Schram 2025 ONCA 337 (single-judge extension motion); Partridge 2015 ONCA 836
  (fact-specific); Holland 2015 ONCA 762, Wood 2018 ONCA 758, Dawe 2019 ONCA
  512, Wigdor 2026 ONCA 572 (termination-clause and notice law, not forum --
  Wigdor paras. 30-31 and 91 are good general statements for a future
  termination-clause topic); Davis v. Amazon 2025 ONCA 421 (arbitration stay,
  merits expressly left open at para. 4); Kondaj 2026 ONCA 636 (footnote 1
  paraphrases ESA ss. 97-98; cite the statute instead); Strudwick 2016 ONCA 520
  (s. 46.1 damages follow Tribunal principles, paras. 55-60, not used yet);
  Kempf 2015 ONCA 114, Kovach 2010 ONCA 126, Rider 2007 ONCA 687 (not about
  Small Claims despite the search hit); Kelava 2021 ONCA 428 (Small Claims
  pleadings read liberally, para. 22; a union is sued by representation order,
  para. 37 -- the $35,000 figure at para. 15 is historical); Theberge-Lindsay
  2019 ONCA 550 (costs endorsement; cite r. 57.05(1) itself); Elkins 2023 ONCA
  789 (LTB own-use bad faith; purchaser named as a respondent, paras. 52, 60).
- **Still not found:** an appellate statement on splitting a claim to fit the
  Small Claims limit, a counterclaim above the limit, or several defendants in
  Small Claims. None of the six Small Claims search hits was about those. The
  rules (r. 6.02) and the Negligence Act s. 1 are cited instead.

### ontario.ca e-Laws pages are JS-rendered — use the `.doc` fallback instead

`ontario.ca/laws/statute/<id>` and `ontario.ca/laws/regulation/<id>` (the
e-Laws viewer) return an empty HTML shell to a direct, non-browser fetch —
confirmed directly, repeatedly, across sessions. The same statutory text is
also published as a static, non-JS `.doc` document at
`ontario.ca/laws/docs/<id>.doc`, on the same domain, which fetches cleanly.
This is not a workaround around the sourcing rule — it's the identical
statutory text, the same `ontario.ca` domain, just a fetchable rendering path.

**How to get the text out once fetched:** the `.doc` files are old-format
binary (OLE Compound Document), not modern `.docx`. `antiword <file>`
extracts plain text cleanly — confirmed available in this environment
(`/mingw64/bin/antiword`) and used directly, e.g. to pull Insurance Act
s.263's full text for commit `3bd2667`.

**The id-naming pattern is not fully consistent — don't assume, check what
actually resolves.** Confirmed real examples, most commonly `<2-digit
year><chapter letter><2-digit chapter number>_e.doc`:
- `90i08_e.doc` — Insurance Act, R.S.O. 1990, c. I.8
- `90d16_e.doc` — Dog Owners' Liability Act, R.S.O. 1990, c. D.16
- ~~`90n01_e.doc` — Negligence Act~~ — **WRONG, and this line contradicted the
  entry further down this same file.** `90n01_e.doc` is an **HTTP 403**; the
  Negligence Act resolves only as `elaws_statutes_90n01_e.doc`. Re-confirmed
  2026-09-26. See "the `elaws_statutes_` prefix cuts both ways" below.
- `90s01_e.doc` — Sale of Goods Act, R.S.O. 1990, c. S.1
- `90l12_e.doc` — Libel and Slander Act, R.S.O. 1990, c. L.12
- `98c19_e.doc` — Condominium Act, 1998, S.O. 1998, c. 19

### Four more id rules, from resolving 27 statutes in one pass (2026-09-26)

26 of 27 resolved. Everything below was established by fetching the document and
reading its own title and citation, which is the only method that works.

**1. S.O. statutes use BOTH forms. There is no rule.** `98c19` (Condominium Act,
1998) uses `<yy>c<chapter>`, but these use the chapter-LETTER form, exactly like
an R.S.O. statute:

| File | Statute |
|---|---|
| `00p04_e.doc` | Parental Responsibility Act, 2000, S.O. 2000, c. 4 |
| `06r17_e.doc` | Residential Tenancies Act, 2006, S.O. 2006, c. 17 |
| `02m30_e.doc` | Motor Vehicle Dealers Act, 2002, S.O. 2002, c. 30, Sched. B |

Try both spellings; neither is the default.

**2. THE SCHEDULE TRAP — the one that can put the wrong Act in a citation.**
Several statutes share a chapter and are published as separate schedule
documents. The bare chapter id returns whichever schedule e-Laws treats as
primary, **with HTTP 200 and a valid consolidation header**, so nothing looks
wrong:

| File | What it actually is |
|---|---|
| `02c30_e.doc` | Consumer Protection Act, 2002 — **Schedule A** |
| `02m30_e.doc` | Motor Vehicle Dealers Act, 2002 — **Schedule B**, same chapter |

A profile meaning to cite the dealer statute that derived `02c30` would quote the
consumer statute instead and pass every check. **Put the schedule marker in
`mustContain` for any schedule statute.**

**3. The schedule suffix is a SEQUENCE POSITION, not the schedule number.** The
Crown Liability and Proceedings Act, 2019 is S.O. 2019, c. 7, **Schedule 17**, and
lives at **`19c07c_e.doc`**. Deriving `19c07s17` finds nothing. Sweeping suffixes
`a`–`t` found it at `c`, alongside `19c07` (Cannabis Taxation Coordination Act,
2019) and `19c07b` (Combative Sports Act, 2019).

**4. An id can be frozen at a statute's FORMER name.** The Ontario Career
Colleges Act, 2005 is at **`05p28_e.doc`** — `p` for *Private* Career Colleges
Act, 2005, its name when the file was created. `05o28` does not exist. So when a
statute has been renamed, try the old name's letter.

### RUN `rules:check` BEFORE `rules:fetch`, never after — the wrong order destroys the evidence (2026-09-26)

`rules:fetch` re-fetches every source and overwrites the vendored copy.
`rules:check` re-fetches and diffs against the vendored copy. So running fetch
first **silently absorbs any drift**, and the check that follows reports
"No source changed" — truthfully, because by then nothing does.

That happened here. Adding 26 sources meant a full `rules:fetch`, which quietly
updated `ontario-file-small-claims-online.txt` along with everything else.
`rules:check` then reported all 49 sources unchanged. The drift was only found by
diffing the manifest's `sha256` values against the previous commit:

```
git show HEAD:docs/sources/corpus/manifest.json     # compare sha256 per id
```

**So: `npm run rules:check` first, read it, then `rules:fetch`.** And after any
fetch, diff the manifest against `HEAD` — that is the only record of what moved.
What drifted this time mattered (see below), which is how the gap was noticed at
all rather than by design.

### Provincial court offices are closed 30 September 2026, and the deadline engine does not know it (2026-09-26)

The drift above was this, newly added to
`https://www.ontario.ca/page/file-small-claims-court-documents-online` (now
vendored, so it is citable):

> Provincial court offices will be closed on Wednesday, September 30, 2026 in
> honour of the National Day for Truth and Reconciliation. The ministry's online
> filing services will remain available 24 hours a day, 7 days a week, including
> on September 30, 2026. However, any documents submitted that day through the
> ministry's online portals or by email, will be marked as filed/issued on the
> next business day, October 1, 2026.

**The engine is right and still incomplete.** 30 September is not in
`deadlines/holidays.ts`, and it should not be: r. 1.02 does not name it and it is
not an Ontario statutory holiday. The engine models *holidays that extend a
deadline*. This is a different thing — **a day the counter is shut** — and the
two are not the same:

- A deadline computed as falling on 30 September 2026 is, on the rules, a valid
  date. The engine will say so.
- The office is closed, and a filing made online that day is **stamped 1 October**.

So someone told "your deadline is 30 September" who files that day may hold a
document stamped after their deadline. **This is a real gap, live in the same week
it was found, and it is recorded rather than fixed** — closing it means modelling
court-office closures as their own concept, separate from r. 1.02 holidays, which
is a design decision and not a patch. See `docs/ACCURACY_ENGINE.md`.

The general lesson is bigger than one date: **the holiday list answers "does the
clock move?", and nothing in the system yet answers "is the counter open?"**

### Negative finding: the Towing and Storage Safety and Enforcement Act, 2021 has no fetchable e-Laws `.doc` (2026-09-26)

Tried and all absent: `21t04`, `21t01`–`21t08`, `21c04`, `21c4`,
`elaws_statutes_21t04`, schedule suffixes `a`–`t`, and numeric suffixes `s1`–`s20`.
`https://www.ontario.ca/page/towing-and-storage-industry-oversight` is also a 404.

**Don't re-run that sweep.** For towing and vehicle-storage content, the
Consumer Protection Act, 2002 and the **Repair and Storage Liens Act** are
vendored and do cover the lien-and-charges questions users actually ask. The
towing-specific statute is recorded as a content gap rather than written from
memory.

### A version suffix (`_eV006`, `_ev005`, `_eV015`) means a HISTORICAL snapshot — not the current law

**Correction (Session 46), and the most consequential one recorded in this
file so far.** This entry previously listed three "filename pattern
exceptions" — `90o02_eV006.doc`, `elaws_statutes_90c43_ev005.doc`,
`02l24_eV015.doc` — as though the version suffix were a harmless naming
quirk. It isn't. **A `_eV<nnn>`/`_ev<nnn>` suffix identifies a frozen
historical consolidation of that statute**, and the document itself says so
in its own header. All three were being cited as if they were current law.
Checked directly:

| Cited URL | What it actually is |
|---|---|
| `90o02_eV006.doc` | "HISTORICAL VERSION FOR THE PERIOD DECEMBER 8, 2020 TO JANUARY 28, 2021" |
| `elaws_statutes_90c43_ev005.doc` | "HISTORICAL VERSION FOR THE PERIOD JUNE 22, 2006 TO OCTOBER 18, 2006" |
| `02l24_eV015.doc` | "HISTORICAL VERSION FOR THE PERIOD JUNE 4, 2015 TO MARCH 7, 2016" |

**The current consolidation is the plain `_e.doc` form** — its header reads
"CONSOLIDATION PERIOD: FROM <date> TO THE E-LAWS CURRENCY DATE" instead:
`90o02_e.doc` (from 2021-01-29), `90c43_e.doc` (from 2025-12-11 — note this
is a *different filename* from the `elaws_statutes_`-prefixed one, which is
its own separate, older-consolidation document), `02l24_e.doc` (from
2024-12-04).

**This produced a real error, not a hypothetical one.** The Occupiers'
Liability Act snapshot predated s.6.1 by seven weeks — it carries that
section marked "not in force," when s.6.1 has been in force since
2021-01-29. s.6.1 imposes a **60-day written notice requirement** for
personal injury caused by snow or ice, and no action may be brought without
it. The slip-and-fall claim type — whose own signals are almost entirely
snow/ice fact patterns — told users only about the ordinary 2-year
limitation period, because the cited version of the Act did not contain the
60-day rule. Fixed in the same session this note was written; the other two
were checked provision-by-provision against their current text and their
cited propositions happened to be unchanged, so those were URL-only fixes.

**The `elaws_statutes_` PREFIX is not itself a historical marker — only the
`_eV<nnn>` SUFFIX is.** Clarified 2026-09-13, because the entry above reads as
though the prefixed form were suspect and it is not. Checked directly:

| Form | Result |
|---|---|
| `elaws_statutes_90n01_e.doc` | **HTTP 200**, header "CONSOLIDATION PERIOD: FROM JANUARY 1, 2004 TO THE E-LAWS CURRENCY DATE" — **current** |
| `90n01_e.doc` | **HTTP 403** — does not exist |

For the Negligence Act the prefixed form is the *only* one that resolves, and it
is the current consolidation. Its 2004 start date looks alarming and is correct:
the Act's last amendment was 2002, c. 24, Sched. B, s. 25. What made
`elaws_statutes_90c43_ev005.doc` historical was the `_ev005`, not the prefix.

**Practical rule:** always open the fetched `.doc` and read its first
header line before citing from it. "CONSOLIDATION PERIOD ... TO THE E-LAWS
CURRENCY DATE" means current; "HISTORICAL VERSION FOR THE PERIOD ..." means
you are reading law as it stood on a past date, and anything enacted since
is either missing or marked "not in force." Treat any filename carrying a
version suffix as historical until that header proves otherwise. The plain
`_e.doc` form is the one to cite; treat the rest of the filename pattern as
a starting guess to try, not a template to construct blindly.

### CJA s.23(1.1) — leave IS required to start a within-jurisdiction claim in the Superior Court. CONFIRMED, not a rumour

Recorded because it entered the register as *"secondhand and unsourced — verify against the CJA before acting"* (from an Annual Practice extraction), and a future session should not have to re-verify it from scratch.

**Confirmed directly** (Session 48) against `ontario.ca/laws/docs/90c43_e.doc`, consolidation from 2025-12-11:

> **s.23(1.1)** — "An action that is within the Small Claims Court's jurisdiction shall not, despite subsection 11 (2), be commenced in the Superior Court of Justice except with leave of the Superior Court of Justice as provided in the rules of court."

Added by **2023, c. 12, Sched. 3, s. 1**, and the Act's own section-amendments table gives the in-force date as **01/07/2024** — exactly as the secondhand report claimed, including the date. The statute is the *Strengthening Safety and Modernizing Justice Act, 2023*.

**The exception matters as much as the rule. s.23(1.2):** the restriction does not apply to a counterclaim, crossclaim, or third or subsequent party claim where the main action was already commenced in the Superior Court.

**What it means for content:** a claim under $50,000 is *not* a free election between Small Claims and the Superior Court. Note what s.23(1.1) displaces — s.11(2), the Superior Court's inherent "all the jurisdiction, power and authority historically exercised by courts of common law and equity." That is why the subsection is phrased "despite subsection 11 (2)".

**Checked and found clean:** `courtPathClassifier.ts` does not mention the Superior Court at all, and the two places that route users there (`sc-route-exceeds-jurisdiction-superior-court`, and `sc-topic-monetary-limit`'s "if a claim is worth more than that") both concern claims *over* the limit, which s.23(1.1) does not touch. **So nothing asserted a free election — the defect was omission, not error.** Now stated in `sc-topic-monetary-limit`.

### Limitations Act, 2002 — two provisions worth knowing before re-deriving them

Read directly (`ontario.ca/laws/docs/02l24_e.doc`, extracted with
antiword) while sourcing the "personal loan between individuals" claim type
(commit — see git log for the claim-type addition following this note).
Both are narrow, precise, and easy to re-find by accident rather than by
design if a future session doesn't know to look for them:

- **s.5(3)-(4), demand obligations:** for a debt with no fixed repayment
  date (repayable "on demand" — common for informal personal loans, but not
  unique to them), the 2-year limitation clock starts on the first day the
  debtor fails to pay **after a demand is made**, not on the day the debt
  arose. Only applies to demand obligations created on or after
  **January 1, 2004**.
- **s.13(1)/(10)/(11), acknowledgment and part payment:** a **written,
  signed** acknowledgment of a liquidated-sum debt, or a **partial
  payment**, is treated as restarting the limitation clock from that date.
  An oral acknowledgment alone, with no signed writing and no payment, does
  **not** have this effect.

Both are general Limitations Act rules, not loan-specific — worth checking
before re-deriving the limitation period from scratch for any other
debt-shaped claim type (unpaid invoices, NSF cheques, anything where a
partial payment or an informal "I'll pay you back" is a realistic fact
pattern).

**Update (Session 46): the regulation `.doc` fallback DOES exist and works.**
`ontario.ca/laws/docs/980258_e.doc` returns the full Rules of the Small
Claims Court (O. Reg. 258/98), current consolidation ("FROM OCTOBER 14, 2025
TO THE E-LAWS CURRENCY DATE," including the O. Reg. 3/25 amendments), and
extracts cleanly with antiword exactly like a statute `.doc`. It is now
cited in `claimTypes.ts` (r. 20.05, enforcement of an order for delivery of
personal property). So the same `<id>_e.doc` convention that works for
statutes works for regulations too — the paragraph below was written before
anyone tried it. Same version-suffix caution applies: check the header line.

Regulation-level e-Laws pages (`ontario.ca/laws/regulation/<id>`, e.g. O. Reg.
258/98's `980258`) have the same JS-shell problem — verified as SOURCED at the
regulation-as-a-whole level (`docs/PROCEDURAL_RULES_INVENTORY.md` §5), but a
`.doc` fallback for a *regulation* (as opposed to a statute) hadn't actually
been located and used by any citation in this codebase yet — don't assume the
same `<id>_e.doc` pattern works there without checking.

### CanLII (and Ontario court decisions) block automated fetching — the `docs/sources/` manual-download route

**Correction (Session 40):** this section originally said the Supreme Court
of Canada's own site also blocks automated fetching, the same as CanLII.
That was wrong — see "The Supreme Court of Canada's own site is directly
fetchable" below, confirmed directly this session. What's actually true:
**CanLII** (`canlii.org`) blocks automated fetching outright — a live
`WebFetch` against a `canlii.org` URL will not work — and so, as far as
every attempt this codebase has made so far, does `canlii.org`-hosted access
to **Ontario court decisions** specifically (Ferguson v. Birchmount, below,
confirmed HTTP 403). This does **not** mean CanLII can't be cited:
`canlii.org` is already an allowed citation domain
(`verifyIntakeCoverage.ts`'s `ALLOWED_SOURCE_DOMAINS`), and a case's live
CanLII URL is the right thing to put in a citation's `officialUrl` for a
user to actually visit. What CLAUDE.md section 2's `docs/sources/` route
solves is a different, narrower problem: satisfying "actually retrieved and
read" for a source this tool can't fetch live, not "cited from a domain
this tool can reach."

**The actual mechanic** (confirmed by reading how the one real example does
it, `Mustapha v. Culligan, 2008 SCC 27`, sourced for commit `e77d9c6`):
1. Manually download the decision (a human, or a session with a working
   fetch path other than this tool) and save it under `docs/sources/` as a
   file.
2. Add an entry to `docs/sources/README.md` recording what it is, its
   neutral citation, the URL it came from, and the date downloaded.
3. Read the local file directly (this tool's `Read` handles PDFs) — that
   read satisfies "retrieved and read" the same way a live fetch does.
4. The citation's `officialUrl` in the actual content file (`claimTypes.ts`/
   `educationTopics.ts`) still points to the **live** `canlii.org` URL, not
   to the local `docs/sources/` path — no citation in this codebase
   currently uses a `docs/sources/`-prefixed `officialUrl`.
   `verifyIntakeCoverage.ts`'s `isResolvableSourceUrl()` does special-case a
   value starting with `docs/sources/` (checking the file exists on disk
   instead of parsing it as a URL) for a source with no live public page at
   all — that path exists in the verification script but isn't exercised by
   any citation yet, so don't assume it's the normal route; for CanLII, the
   live URL is what actually gets cited.

### The Supreme Court of Canada's own site is directly fetchable — no `docs/sources/` detour needed

Confirmed directly this session (Session 40), not taken on trust: **`decisions.scc-csc.ca`**, the SCC's own official decisions database, is reachable and serves full judgment text. Verified by retrieving **Clements v. Clements, 2012 SCC 32** in full — paragraphs `[1]` through `[63]`, majority and dissent both present, matching the real, known structure of that judgment — and by confirming (via search, resolving to a real `decisions.scc-csc.ca` URL for each) that the same site also holds Garland v. Consumers' Gas, Kerr v. Baranow, C.M. Callow Inc. v. Zollinger, Pecore v. Pecore, and Bhasin v. Hrynew. This means an SCC judgment needs **no manual download and no `docs/sources/` entry at all** — fetch and cite it live, the same as an ontario.ca statute. Only CanLII/Ontario-court-decision access (above) needs the `docs/sources/` workaround.

**Two things worth knowing precisely before relying on this:**

- **This session's own `WebFetch` tool got HTTP 403 from `decisions.scc-csc.ca` on every attempt** (three different URL variations tried). The site itself is NOT blocking automated access, though — a direct HTTP request via `curl` with an ordinary browser User-Agent string returned HTTP 200 and the real document every time. If `WebFetch` alone returns 403 here, that's this tool's own infrastructure, not proof the source is unreachable — try a direct fetch (e.g. `curl -A "Mozilla/5.0 ..." <url>`) before concluding it's blocked.
- **The URL shape is `/scc-csc/scc-csc/en/item/{id}/index.do` (a case-overview page) and `/scc-csc/scc-csc/en/{id}/1/document.do` (the full judgment).** `{id}` is an internal, non-sequential number (Clements was `9992`; Pecore, `2355`; Kerr v. Baranow, `7922`; Bhasin, `14438`; Callow, `18613`) with **no derivable relationship to the case name, SCC number, or year** — it cannot be guessed or constructed, only found by searching for the case name first and reading off the real URL. Same discipline the e-Laws `.doc`-filename entry above already warns about, for the same underlying reason: don't construct a citation URL from a pattern without confirming the fetch actually returned the right document. **Correction (Session 41):** this entry originally also listed Garland v. Consumers' Gas at id `1660` as a confirmed example — that id is wrong; it resolves to a different, earlier 1998 SCC decision in the same litigation, not 2004 SCC 25. The correct id for 2004 SCC 25 is `2138`, found only by searching with the year/citation added. See `docs/sources/README.md`'s Garland entry for the full story — left here as the canonical illustration of why an id must always be verified against the fetched document's own text, not trusted from a single search result.
- **`document.do` serves a PDF, not an HTML page** — `pdftotext` (already used for Mustapha) extracts it cleanly; a tool expecting HTML will mishandle it.
- **Judgments render bilingually, English and French, both under the same paragraph numbers** — a plain top-to-bottom text extraction produces a full English pass followed by a full French pass of the same paragraph range (consistent with a two-column source layout), not one language throughout. Concretely: searching extracted text for `[3]` returns **two different paragraph 3's**, one in each language. Quote carefully — it's easy to pull a French sentence into an English-language citation, or vice versa, if the extraction isn't checked for which block you're actually reading from.

### Older SCC judgments (pre-digital, scanned) have no PDF text layer — use the HTML case page instead of `pdftotext`

Confirmed directly (Session 42, a 22-case bulk retrieval — see `docs/sources/README.md`): older SCC decisions (roughly pre-1996-2000, before the Court's digital-native publishing era) are served at `document.do` as **scanned page images with no embedded text layer** — `pdftotext` returns nothing at all, not an error, not garbled text, just empty output. This happened for 6 of 22 cases in one retrieval pass (Waldick v. Malcolm, 1991; Myers v. Peel County Board of Education, 1981; Queen v. Cognos Inc., 1993; Red Deer College v. Michaels, 1976; Machtinger v. HOJ Industries, 1992; Hill v. Church of Scientology, 1995) — common enough to expect routinely for anything from that era, not a one-off.

**No OCR or PDF-rendering tool (`pdfimages`, `pdftoppm`, `tesseract`, ImageMagick) was available in this environment** to extract or visually inspect these scanned pages directly.

**The fix, confirmed working for all 6 cases above:** fetch the case's own overview page with `?iframe=true` appended — `https://decisions.scc-csc.ca/scc-csc/scc-csc/en/item/{id}/index.do?iframe=true` (same `{id}` as the PDF) — via the same `curl` + browser User-Agent approach. This returns an HTML page with the **full judgment text embedded directly in the markup** (`<p class="MsoNormal">`/`<p class="Para">` paragraphs), independent of whether the PDF has a text layer. Strip tags (`sed -e 's/<[^>]*>//g'` or equivalent) and read it directly — this is a genuine, complete read of the judgment, not a summary or metadata page; confirmed by finding real substantive paragraph content (party names, facts, holdings), not just the `<title>` tag, for all 6 cases. **One caution learned while doing this:** a crude tag-strip can jumble paragraph order relative to other on-page elements (a "cited by" list, navigation), which briefly looked like two of these cases had resolved to the wrong party names before closer reading showed they were just other parties/co-appellants named correctly within the same real case — don't conclude a wrong-case match from a single out-of-context name; check the surrounding paragraph.

### SCC decisions before 2001 have no neutral citation — expect an S.C.R. citation only

The Supreme Court's neutral-citation system ("20XX SCC ##") only started in 2001 — confirmed directly across the Session 42 bulk retrieval: 7 of 22 cases (Ryan v. Victoria (City), 1999; Waldick v. Malcolm, 1991; Myers v. Peel County Board of Education, 1981; Queen v. Cognos Inc., 1993; Red Deer College v. Michaels, 1976; Machtinger v. HOJ Industries, 1992; Hill v. Church of Scientology, 1995) genuinely have no "SCC ##" number anywhere in the judgment — their only real citation is the S.C.R. volume/page (e.g. `[1991] 2 S.C.R. 456`). Don't search for or invent an SCC number for an older case; check the judgment text itself (or its absence) before assuming one exists. `docs/sources/README.md`'s naming convention now accounts for this: `<case-name>-<year>-<volume>-SCR-<page>.pdf` for a case with no neutral citation, `<case-name>-<year>-SCC-<number>.pdf` for one that has it.

### Read the section the entry claims, not the page that summarizes it — the limits live in the statute

The Session 46 audit-fix pass re-sourced a dozen entries that had been written from an ontario.ca overview page. In **every single case** where the primary source was read instead, the statute or regulation contained a material limit, condition or exception the overview page omitted. Not one entry came back unchanged. A representative sample:

- **Used-vehicle non-disclosure.** The overview page describes a "90-day cancellation right." O. Reg. 333/08 s.50(5) runs those 90 days from when the buyer **actually received the vehicle**, not from discovery — and s.50(1) confines the whole regime to sales by a **registered** dealer to a non-dealer. Neither limit is on the page.
- **Consumer Protection Act misrepresentation.** The page says giving "false information" is illegal. s.14(1) is "false, **misleading or deceptive**," and s.14(2) lists 17 examples — para. 14 (exaggeration, innuendo, ambiguity, or failing to state a material fact) is the one that actually carries the other two prongs.
- **CPA withdrawal.** The page says "withdraw within 1 year." s.18 gives rescission **plus any remedy available in law including damages**, a fallback measure where rescission has become impossible, and notice mechanics (any wording, any delivery method, deemed given when sent).
- **Condominium lien priority.** s.86's priority is **conditional on notice** to every registered encumbrancer; without it the lien loses priority, and late notice preserves it for only three months of arrears. An entry written from a summary had the priority rule and none of the condition.
- **Wrongful dismissal.** ESA s.97(2) bars a civil wrongful-dismissal action once an ESA complaint for termination or severance pay is filed (s.97(4): two weeks to withdraw). That is a trap with permanent consequences and it is not on the ESA guide pages.

**The pattern to expect:** government overview pages are written to describe the *typical* case and systematically omit scope fences, trigger conditions, and election/waiver traps. Those omissions are exactly what an entry needs, because a user whose situation is atypical is the one at risk. An ontario.ca page is fine for orienting yourself; it is not fine as the only source for an element that states a rule. When an entry states a legal rule, go to the statute, regulation or judgment and read the section.

### A non-obvious corollary: read the sections *around* the one you came for

Several of the most useful additions in that pass were provisions nobody had gone looking for, found because the surrounding text was on screen: Libel and Slander Act **s.8(1)** (a newspaper defendant loses the benefit of the shortened ss.5-6 deadlines unless proprietor and publisher are named) was found while reading s.7; **ESA s.97(2)** was found while reading s.8(1)'s "subject to section 97"; Waldick's **s.4(1) volenti** holding was found while reading its s.3(1) duty analysis. Cross-references (`subject to section X`, `despite section Y`) are the cheapest leads available — follow them before closing the document.

### Search the codebase before building on a claimed-existing feature

`docs/COURTHOUSE_TRACKING_DESIGN.md` was scoped as "pairing with the 'Find
your courthouse' link just added" — a grep for `courthouse`, `court-location`,
`ocj/court`, and `ontariocourts.ca/ocj` across the whole repo found no such
link anywhere. Cheap to check, expensive to design around a feature that
doesn't exist. Worth doing before any task premised on "the X that already
exists" — the premise itself is sometimes the thing to verify first.

---

### Family law sources — what retrieves, and how (verified 2026-09-13)

**Ontario statutes and rules: the existing `.doc` route works, all current.**
Fetched, `antiword`-extracted and read:

| id | What | Consolidation |
|---|---|---|
| `990114_e.doc` | **O. Reg. 114/99, Family Law Rules** (header reads "Courts of Justice Act" — it is the parent Act, this *is* the Rules) | from 2026-05-01 |
| `90f03_e.doc` | Family Law Act | from 2026-05-01 |
| `90c12_e.doc` | Children's Law Reform Act | from 2025-12-11 |
| `90c43_e.doc` | Courts of Justice Act | from 2025-12-11 |
| `17c14_e.doc` | **Child, Youth and Family Services Act, 2017** — added 2026-09-13. Note the id drops the schedule: the Act is S.O. 2017, c. 14, **Sched. 1**, but `17c14s1_e.doc` returns **HTTP 403**. Use the bare `17c14`. | retrieved 2026-09-13 |
| `970391_e.doc` | **Child Support Guidelines (Ontario), O. Reg. 391/97** — added 2026-09-13. The provincial table regulation, distinct from the federal SOR/97-175. | from 2024-07-26 |
| `000626_e.doc` | **O. Reg. 626/00 (Courts of Justice Act)** — added 2026-09-13. **Where the $50,000 Small Claims limit actually lives.** CJA s. 23 (1) says only "the prescribed amount"; s. 1 (1) of this regulation is what prescribes $50,000, and s. 1 (2) caps what a deputy judge may preside over at the same figure. Anything in the codebase citing `90c43_e.doc` for the *number* is citing the wrong half of the pair — see OUTSTANDING_ISSUES.md section 13 (a). The amount has been amended repeatedly (O. Reg. 439/08, 343/19, 42/25), so re-check it rather than trusting a remembered figure. | from 2025-10-01 |

**Two Ontario family statutes print NOT-YET-IN-FORCE text inline, and it is easy
to cite by mistake.** `90f03_e.doc` s. 46(1)–(2) and `90c12_e.doc` s. 35(1)–(2)
(restraining orders) each show the in-force provision immediately followed by a
block beginning *"Note: On a day to be named by order of the Lieutenant Governor
in Council, subsection … is repealed and the following substituted"* — then the
replacement text, which reads exactly like ordinary statutory text. Both point at
2025, c. 6 (Sched. 6 for the FLA, Sched. 2 for the CLRA) and would broaden who
may apply. This is a different trap from the historical-version one above: the
document header says CONSOLIDATION PERIOD and is current, but individual sections
still carry future law. **Grep for "On a day to be named" in any e-Laws `.doc`
before quoting a section from it.**

**Federal sources: the e-Laws technique does NOT apply, and a different one does.** `laws-lois.justice.gc.ca/eng/acts/<id>/FullText.html` returns real, parseable HTML to a plain fetch — no JS shell, no `.doc` detour. Verified:

- **Divorce Act** — `acts/D-3.4/FullText.html`, HTTP 200, *current to 2026-07-21*.
- **Federal Child Support Guidelines** — `regulations/SOR-97-175/FullText.html`, HTTP 200, *current to 2026-07-21*.

**The child support TABLES are not in the Guidelines' FullText.** `SCHEDULE I — Federal Child Support Tables` appears there as a **heading only**. The table data lives on the paginated view: **`regulations/SOR-97-175/page-5.html`** carries the Ontario table, retrieved and read.

**The table is a formula, not a lookup cell.** Its real columns are `From | To | Basic Amount | Plus (%) | Of Income Over` — e.g. income 17,000–17,999 for one child gives *Basic Amount 95, plus 1.14% of income over 17,000*. Anyone assuming "find the row, read the number" is wrong about the source.

**Spousal Support Advisory Guidelines** — `justice.gc.ca/eng/rp-pr/fl-lf/spousal-epoux/spag/p1.html` (HTTP 200). Note the path: `/eng/fl-df/spousal-epoux/ssag-ldfpae.html` returns a JS shell with no text, and `/eng/fl-df/spousal-epoux/spag/index.html` **302s**. Use the `rp-pr/fl-lf` path. The document describes itself as *"informal guidelines"*, *"advisory"*, and *"developed for use under the federal Divorce Act"*.

**ontariocourtforms.on.ca does NOT yield a form list to a plain fetch — CONFIRMED, don't retry the obvious routes.** `/en/family-law-rules-forms/` returns HTTP 200 but the page body contains navigation and analytics only; zero `Form N` strings and no form links. Two guessed patterns both 404:
`/static/media/uploads/courtforms/family/8/fl-8-e.pdf` and `/en/family-law-rules-forms/superior-court-of-justice/`. **The correct per-form URL pattern is UNKNOWN and was not determined.** Do not invent one.

**Update 2026-10-04 — the index pages DO yield form rows to the WebFetch tool.** An audit read all four index pages through WebFetch (not the shell, which the proxy blocks): Small Claims `/en/rules-of-the-small-claims-court-forms/`, civil `/en/rules-of-civil-procedure-forms/`, civil ESTATES on their own page `/en/rules-of-civil-procedure-forms/pre-formatted-fillable-estates-forms/` (Rules 74/75 — easy to miss; all 54 were missing from the catalogue), and family `/en/family-law-rules-forms/`. Each form is a `<tr>` with number, title, date, and PDF/Word links. **The per-form file names are dated and not guessable** — e.g. `/static/media/uploads/courtforms/scc/07a/scr-7a-aug22-en-fil.pdf`, `/scc/01a1/rscc-1a-1-e.pdf` — so links must be READ from the index, never constructed. WebFetch summarises through a model, so for a complete list use `scripts/forms/fetchOfficialFormLinks.ts` on a GitHub runner (`courtsimplified-change-watch.yml`); if a plain fetch of the family page again returns navigation only, that script reports "no form rows recognised" rather than an empty list.

**The workaround that does work: O. Reg. 114/99 names its own forms.** `990114_e.doc` contains **97 distinct `Form N` references** (Form 4, 6, 6A–6C, 8, 8.0, 8D.1–8D.3, 10, 10A, 12, 13, 13A–13C, 13.1, 14, 14A–14D, 15, 15B–15D, 17, 17C, 17E, 17F, 20.2, 22, 23, 23C, 25, 25A, 25E, 25F, 25H, …). So **form numbers and the rule that requires each are sourceable from the Rules alone**, without the forms site. What that route does *not* give is the form's official title or its PDF.

**The jurisdiction map is in two places, both retrieved:**
- **CJA s. 21.8 + its Schedule** — the Family Court branch's exclusive subject-matter list.
- **FLR r. 1(2)** — the same list, expressed as which cases the Rules apply to, plus paragraphs (b)–(f) covering domestic contracts, unjust enrichment between cohabitees, annulment, family-arbitration appeals, and First Nation land laws.
- **FLR r. 1(3)** — the **24 named municipalities** where the Family Court branch has jurisdiction. This is the by-location answer; it is a closed list in the regulation, not something to infer from a court-locator page.

**Two carve-outs worth knowing before designing around them**, both verified by reading the Acts:
- *Children's Law Reform Act, **except ss. 59 and 60***.
- *Family Law Act, **except Part V***. Part V is headed **"DEPENDANTS' CLAIM FOR DAMAGES — RIGHT OF DEPENDANTS TO SUE IN TORT"** — a tort claim, which is why it sits outside the family list.

---

### lso.ca returns HTTP 403 to automated fetches — by-laws need the `docs/sources/` route (2026-09-14)

The Law Society of Ontario's site blocks automated requests, including with a
browser user-agent. Verified on the by-law index and on a direct PDF guess:

| URL | Result |
|---|---|
| `https://lso.ca/about-lso/legislation-rules/by-laws/by-law-4` | **403** |
| `https://lso.ca/getmedia/by-law-4.pdf` | 404 |

Same class as CanLII. The route is a manual download saved under
`docs/sources/` with its URL and retrieval date recorded in the README.

**This blocks a high-value question.** The Law Society Act delegates the
entire non-licensee exemption power to the by-laws — s. 1(8)5, s. 26.1(5) and
s. 62(0.1)3.1 all point there — so the by-laws decide what unlicensed software
may do. See `docs/REGULATORY_POSITION.md`.

### Ontario court practice directions ARE fetchable from ontariocourts.ca (2026-09-14)

Unlike lso.ca and CanLII, `ontariocourts.ca` serves plain HTML to a normal
fetch. Strip tags with `sed 's/<[^>]*>/ /g'` and read directly.

The four provincial consolidated directions live at
`https://www.ontariocourts.ca/scj/filing-procedures/provincial/`:
`consolidated-civil-provincial-practice-direction/`,
`consolidated-provincial-practice-direction-for-family-proceedings/`,
`…-for-criminal-proceedings/`, and
`consolidated-practice-direction-for-divisional-court-proceedings/`.

**There is no Small Claims consolidated provincial practice direction at that
index** — four are listed and Small Claims is not among them. Treat as
not-found rather than non-existent.

### The Federal Court publishes its AI notice as a fetchable PDF (2026-09-14)

`https://www.fct-cf.gc.ca/Content/assets/pdf/base/FC-Updated-AI-Notice-EN.pdf`
fetches cleanly. `pdftotext` is NOT installed in this environment; a small
node script that inflates the PDF's Flate streams and pulls the `(...)`
text-showing operands extracts it adequately for quoting.

### Statute filename check, again: the `elaws_statutes_` prefix cuts both ways

For the **Law Society Act** the plain form is current and the prefixed form is
stale — the reverse of the Negligence Act already recorded above:

| File | Consolidation |
|---|---|
| `90l08_e.doc` | **FROM DECEMBER 4, 2024** — current |
| `elaws_statutes_90l08_e.doc` | FROM APRIL 7, 2014 — stale |

Both return HTTP 200. The header is the only reliable discriminator; there is
no filename rule in either direction.

### Consolidations current as of 2026-09-14, for anything relying on them

| Instrument | File | Consolidation |
|---|---|---|
| Law Society Act, R.S.O. 1990, c. L.8 | `90l08_e.doc` | Dec 4, 2024 |
| Rules of Civil Procedure, R.R.O. 1990, Reg. 194 | `900194_e.doc` | **Sept 1, 2026** |
| Rules of the Small Claims Court, O. Reg. 258/98 | `980258_e.doc` | Oct 14, 2025 |
| Family Law Rules, O. Reg. 114/99 | `990114_e.doc` | May 1, 2026 |

The Rules of Civil Procedure date is recent enough that anything recorded
about Superior Court procedure from an earlier reading should be re-checked
rather than assumed.

---

### Child support: TWO INSTRUMENTS, ONE TABLE — and a vocabulary difference that will catch a matcher (2026-09-15, corrected 2026-09-14)

**CORRECTED.** This note previously read "Two child support tables" and cited
"separate consolidation dates (federal current to 2026-07-21; Ontario from
2024-07-26), separate amendment histories" as proof. That was backwards.
**O. Reg. 303/24 revoked Schedule I of O. Reg. 391/97** — Ontario's own table —
and rewrote its s. 2 (1) so that **"table" means the table set out in the
Federal Child Support Guidelines**. The 2024-07-26 consolidation date *is* that
amendment. It was the strongest available evidence against the two-table
conclusion and it was read as evidence for it. See `OUTSTANDING_ISSUES.md`
section 0, which records this alongside two other instances of the same failure
and the rule the three of them produce.

**SOR/97-175 (federal)** governs the **Divorce Act** path — parties married to
each other, s. 15.1. **O. Reg. 391/97 (Ontario)** governs the **Family Law Act**
path — parties never married to each other, FLA s. 33 (11). They remain
separate instruments for income determination (ss. 15 to 20), s. 7 expenses,
Schedule III and s. 21 disclosure. `statusTriage.marriedToOtherParty` decides
which instrument governs. **It does not decide which table** — there is only
one.

**Which PROVINCE'S table is the live question, and it turns on residence.**
O. Reg. 391/97 s. 2 (1) selects the federal table for the province where the
**parent or spouse against whom the order is sought ordinarily resides** — not
where the case is filed, not where the child lives. Paragraphs (c) and (d) let
a court use another province's table where that residence has changed since the
application, or will change in the near future.

**The vocabulary differs, and this is the trap for a signal list.** O. Reg.
391/97 says **"parent or spouse"** wherever SOR/97-175 says **"spouse"**. A
matcher signal built by reading one instrument will miss stories written in the
other's language — and `spouse` is also the word a never-married parent is
least likely to use about themselves, so a `spouse`-heavy signal list fails
precisely the population the Ontario regulation serves. Recorded in
`claimTypeMatcher.ts` as well, because that is where a signal author is
actually working.

**The table is a formula, not a lookup cell.** Retrieved and read from
`page-5.html` on 2026-09-14: two tiers of headings, `Income ($)` over
`From | To`, and `Monthly Award ($)` over `Basic Amount | Plus (%) | Of Income
Over`. The award is the basic amount **plus** a percentage of income above the
band floor, so "find the row, read the number" is wrong for every income that
is not exactly on a floor. The structure — and deliberately not the amounts —
is vendored in `docs/sources/federal-child-support-table-structure.txt`.

---


### The holidays are named everywhere and dated almost nowhere (2026-09-23)

`r. 1.02 (1)` and `Legislation Act s. 88 (2)` both list the holidays **by name**
and neither says when any of them falls. Anything computing a deadline needs
those dates, so this was chased properly. What came back:

| Holiday | Dated by | Notes |
|---|---|---|
| Victoria Day | **Holidays Act (Canada) s. 4** | "The first Monday immediately preceding May 25". The only text anywhere that fixes it. |
| Canada Day | **Holidays Act (Canada) s. 2** | s. 2(2) handles July 1 on a Sunday; `Leg. Act s. 88 (4)` expressly defers to this Act |
| Remembrance Day | **Holidays Act (Canada) s. 3** | November 11 |
| Family Day | **ESA, 2000 s. 1 (1)** | "Family Day, being the third Monday in February" — the only Ontario statutory text that dates it |
| New Year's, Christmas, Boxing Day | the rules themselves | fixed calendar dates, stated directly |

**CONFIRMED NOT TO EXIST — five holidays no statute dates.** Checked the
Legislation Act, the ESA (statute *and* guide), the Retail Business Holidays
Act and the federal Holidays Act:

- **Good Friday, Easter Monday** — ecclesiastical computation, no statutory date
- **Labour Day, Thanksgiving Day** — proclamation and long practice. Both are
  *named* by the ESA and the Retail Business Holidays Act; neither dates them
- **Civic Holiday** — not a statutory holiday in Ontario at all. Declared
  municipally and not observed everywhere. `r. 1.02 (g)` names it; the
  Legislation Act does not include it

Do not go looking for these again, and do not fill them in from memory. The
deadline engine marks them `settled-practice` and flags any deadline whose
answer turns on one.

### The two holiday definitions differ, and the difference bars claims

Worth stating separately because it is the single most consequential fact in
the deadline work:

- **r. 1.02 (a)**: "any Saturday or Sunday" is a holiday. Plus Civic Holiday.
- **Leg. Act s. 88 (2)**: Sunday. **Saturday is not on the list.** No Civic Holiday.

The Small Claims rules count periods the *rules* set. The Legislation Act counts
*statutory* periods — which is what the `Municipal Act s. 44 (10)`,
`City of Toronto Act s. 42 (6)` and `Occupiers' Liability Act s. 6.1 (1)` notice
deadlines are. `Leg. Act s. 46` puts this beyond doubt: "Every provision of this
Part applies to every Act and regulation."

So the same ten days from the same event ends on a Saturday under the Act and on
the Monday under the rules. Assuming the friendlier rule on a 10-day notice
period loses the claim.

### laws-lois.justice.gc.ca serves plain fetchable HTML (2026-09-23)

`https://laws-lois.justice.gc.ca/eng/acts/<chapter>/FullText.html` returns
server-rendered HTML — no JS, no 403, no `docs/sources/` detour. The Holidays
Act extracts to about **1,250 characters**, which is not an error: the whole Act
is four sections. A minimum-length guard set at a round number will reject it.

### Go to the ESA statute, not the ESA guide page

`ontario.ca/document/your-guide-employment-standards-act-0/public-holidays` is
~147 KB of entitlement worked examples and states no date rules. The statute
(`00e41_e.doc`, the ordinary e-Laws `.doc` route) has the definition in s. 1 (1).
`ontario.ca/page/ontario-public-holidays` is a **404**.

### Findings from the 2026-09-30 catalogue verification (all 146 Small Claims entries)

Recorded so the next pass does not rediscover them. The per-entry evidence is in
`docs/sources/catalogue-verification.json`.

- **Scanned SCC PDFs: OCR them locally.** `pdftotext` gives an empty file for
  Waldick, Machtinger, Hill, Red Deer, Myers and Cognos. `pdftoppm -r 200 -gray`
  then `tesseract` per page works in the workspace and takes a few minutes per
  decision. Page numbers come out as bare four-digit lines ("1187"), which is
  how to pinpoint a pre-2001 decision that has no paragraph numbers. Watch for
  the headnote: Waldick's headnote paraphrases the "general community
  compliance" sentence without the judgment's quotation marks, and a quote
  taken from the headnote is not the Court's words.
- **Text-layer SCC PDFs are two columns, English left.** A quote that runs over
  a line break will not match a plain substring search of `pdftotext` output,
  because the French column is interleaved. Read it by eye, or cut the left
  column.
- **`decisions.scc-csc.ca` returned 403 to WebFetch this session.** Earlier notes
  say it was fetchable; treat it as intermittent and use the saved PDFs.
- **O. Reg. 333/08 (Motor Vehicle Dealers Act general regulation) is
  unreachable from here.** Not in the corpus (`motor-vehicle-dealers-act-2002.txt`
  is the Act, not the regulation); `ontario.ca/laws/docs/080333_e.doc` is refused
  to WebFetch (search never surfaces that URL) and blocked to the shell; the
  viewer is a JS shell; search surfaces CanLII, which may not be scraped. The
  two catalogue entries resting on it are undated. The route is a manual
  download into `docs/sources/`.
- **WebFetch only fetches a URL that search has surfaced** for many ontario.ca
  addresses. Search for the page first, then fetch the exact URL search returned.
- **The Superior Court's "Steps to a civil case" page still says Small Claims is
  "$35,000 or less".** It is stale (O. Reg. 626/00 s. 1(1): $50,000 from
  October 1, 2025). Cite it only for its burden-of-proof sentence, never for the
  limit.
- **Several ontario.ca pages say two years "after the claim was discovered"**,
  and the catalogue had turned that into "after the incident was discovered".
  They are not the same: Limitations Act s. 5(1) defines when a *claim* is
  discovered, and s. 5(2) presumes knowledge on the day of the act or omission
  unless the contrary is proved. Cite ss. 4, 5(1) and 5(2) directly.
- **The Consumer Protection Act, 2002 is "repealed on a day to be named by
  proclamation" (2023, c. 23, Sched. 1, s. 110).** Still in force at the
  consolidation read, so the catalogue's CPA entries are dated, but every one
  must be re-checked when the Consumer Protection Act, 2023 is proclaimed.
- **The Libel and Slander Act's notice and three-month rules have two limits
  besides s. 7:** s. 8(1) (a newspaper that does not print its proprietor,
  publisher and address cannot rely on ss. 5–6) and s. 8(3) (a broadcaster that
  does not answer a registered-letter request). The notice under s. 5(1) must be
  *served* like a statement of claim or delivered at the chief office.
- **Limitations Act s. 13(11): a part payment of a liquidated sum stands in for
  the written, signed acknowledgment; it does not itself have to be written.**
  An earlier draft got this backwards.

### Vendoring a new source from here: the Vendor Sources workflow (2026-09-30)

The cloud workspace's shell cannot reach ontario.ca or laws-lois.justice.gc.ca
(the egress proxy refuses the CONNECT), and WebFetch returns a summary, not
text. GitHub's runners can reach both. So: declare the source in
`scripts/rules/*Sources.ts`, merge, then dispatch **CourtSimplified Vendor
Sources** with the ids (`POST .../actions/workflows/courtsimplified-vendor-sources.yml/dispatches`
with `{"ref":"main","inputs":{"only":"id1,id2"}}` works from the workspace). It
runs `rules:fetch --only`, which merges just those ids into the manifest, and
pushes a `sources-vendor-<run>` branch (Vercel-excluded). Fetch that branch
and check out `docs/sources/corpus/` from it. First used for the Family Law
Act, Family Law Rules, CLRA, both Child Support Guidelines, FRSAEA and the
Divorce Act -- all seven fetched first time. Justice Laws pages carry no
e-Laws "CONSOLIDATION PERIOD" line, so the manifest shows "(none stated)" for
them.

### Reading SCC decisions for the civil library (2026-09-30)

- **Say who said it.** Tercon paras. 121-123 (the exclusion-clause framework) are
  Binnie J.'s reasons, which dissented in the result; the majority's agreement is
  Cromwell J. at para. 62. Queen v. Cognos is Iacobucci J. for two judges, so
  "the Court said" is wrong for it. Clements is a majority (LeBel and Rothstein
  JJ. dissented). Check the reasons' authorship before writing "the Court".
- **Cognos needs OCR and parallel pages** (59 pages; run tesseract with
  `xargs -P 8`). Its printed page = PDF page + 86; Myers = PDF page + 20.
- **A text-layer PDF can drop paragraph numbers at page tops.** Fidler 44/47 and
  Whiten 78 were placed by counting, then confirmed from margin numbers.

### Family-law gaps recorded, not guessed (2026-09-30)

- **Which child support guidelines apply in an Ontario divorce** turns on the
  federal designation order under Divorce Act s. 2(5), which is not vendored. The
  library quotes the "applicable guidelines" definition and says no more.
- **Breach of an FLA s. 46 / CLRA s. 35 restraining order:** the in-force text
  carries no offence provision, and FLA s. 49(1) / CLRA s. 38(1) exclude these
  orders from the Ontario Court of Justice's contempt power. The consequence is
  not in the corpus, so nothing is said about it. Both sections print 2025, c. 6
  replacement text that is NOT in force -- quote only the current wording.
- **Not vendored:** the Age of Majority and Accountability Act, the Spousal
  Support Advisory Guidelines, the Real Property Limitations Act, O. Reg. 285/01
  (minimum wage).
- **Paralegals in the Superior Court and family cases:** whether a paralegal may
  act there depends on Law Society rules not in the corpus. The civil and family
  "not sure" next steps quote only the Small Claims guide's own sentence.

### Two neighbour claim types that the statutes do not support (2026-09-30)

Drafted and deliberately NOT shipped, so nobody re-derives them:

- **Trespass to Property Act, R.S.O. 1990, c. T.21 (`90t21_e.doc`): no Small
  Claims money claim.** Damages appear only in s. 12, and every part depends on a
  conviction under s. 2: the convicting court awards them on the prosecutor's
  request with the victim's consent (s. 12(1)); that judgment extinguishes a civil
  action on the same facts (s. 12(4)); not asking does not (s. 12(5)); Small Claims
  appears only as the place to file the award for enforcement (s. 12(6)). The Act
  does not say what a civil trespass claim must show. Needs case law.
- **Forestry Act s. 10: a boundary tree is common property (s. 10(2)) and injuring
  it without consent is an offence (s. 10(3), s. 19(1)).** No civil right to money
  is created, and nothing in the corpus says a co-owner can recover damages. A
  claim type built on it would imply a right the source does not give. The Line
  Fences Act routes fence and fallen-tree-on-fence disputes to fence-viewers
  (ss. 4, 22(5)); Small Claims appears only for filing a fence-viewers' certificate
  (s. 12(9)). Needs a reported decision on boundary trees saved to docs/sources/.
- **Repair and Storage Liens Act s. 24: the owner's route IS in Small Claims**
  (s. 25 "any court of appropriate monetary jurisdiction"; s. 23(3) names it), but it
  is an application "in the prescribed form", not a Plaintiff's Claim, and that
  form's regulation is not in the corpus.

## Dead ends already ruled out

### Ontario Fault Determination Rules ≠ a route to sue the other driver

Chased twice for a vehicle-accident claim type (Session 2, and implicitly
again before commit `3bd2667`) as "two wrong-regulation dead ends." The Fault
Determination Rules only govern a dispute with your **own** insurer under
Insurance Act **s.263(4)**, after a direct-compensation claim has already
been made — they say nothing about, and don't apply to, a claim against the
other driver directly. The right source for that different question was
Insurance Act **s.263** itself (specifically s.263(1)(c) and s.263(5)(a)),
read directly via the `.doc` fallback above. If a future session finds itself
reading the Fault Determination Rules while trying to source "how does a
driver sue another driver directly," that's the same wrong turn — stop and
go back to Insurance Act s.263.

### "General negligence elements" on ontario.ca/ontariocourts.ca alone — genuinely doesn't exist, but the CanLII route reopened it

Two education topics ("negligence elements," "breach of contract elements")
were cut early on: neither ontario.ca nor ontariocourts.ca has a self-help
page stating a general legal-elements framework — what exists there is
individual Court of Appeal decisions discussing the concepts case-by-case,
and synthesizing a general rule from reading case law is exactly what
CLAUDE.md's sourcing rule excludes. `docs/INTAKE_STATUS.md` logged this as
**"permanently closed... not 'not found yet' — this kind of source doesn't
exist on these domains."**

That specific closure turned out to be closure of the wrong door: CLAUDE.md
section 2 was later rewritten from a fixed 3-domain allowlist to a
verifiability standard that accepts a primary source (a real case, read
directly) saved under `docs/sources/`. Under that rule, `Mustapha v.
Culligan, 2008 SCC 27` — a Supreme Court decision restating the settled
general negligence test, not case-law synthesis — sourced the negligence-
elements topic (commit `e77d9c6`), which then unblocked the vehicle-accident
`ClaimType` that general-negligence-elements gap had blocked twice (commit
`3bd2667`). **"Breach of contract elements" is still genuinely unsourced** —
no equivalent primary source has been found for it yet; that door is still
shut.

**The lesson, not just the specific fact:** a "permanently closed, doesn't
exist on these domains" note is only as permanent as the sourcing *rule* that
produced it. When the rule itself changes (as it did here), re-check closures
that were closed specifically because of the rule's old boundary, not because
the underlying fact was unknowable.

### Bailment's reversed onus — real, named authorities exist, but were unreachable this session

While sourcing "property damaged/lost while left in a business's care"
(Session 39): bailment's defining feature — a reversed onus, where a bailee
unable to explain a loss may be found liable without the owner having to
prove exactly what went wrong — is common law, not stated on any approved-
domain self-help page. Two real, on-point, named authorities were found via
search: **Punch v. Savoy's Jewellers Ltd.** (Ontario Court of Appeal, 1986)
and **Ferguson v. Birchmount Boarding Kennels Ltd., 2006 CanLII 2049 (ON
SCDC)** (the latter literally a pet-boarding Small Claims case on appeal —
about as on-point as it gets). **Both are Ontario court decisions, not SCC
judgments** — neither could actually be retrieved: CanLII returned **HTTP
403 on both the `.html` and `.pdf` URL paths** for the Ferguson decision
(confirmed directly this session, not assumed), and unlike Mustapha, **no
copy already existed under `docs/sources/`** to read instead.

**Correction (Session 40): the boundary below is narrower than it was first
recorded.** This was originally written as a general CanLII/SCC boundary. It
isn't — see "The Supreme Court of Canada's own site is directly fetchable"
above. `decisions.scc-csc.ca` is reachable directly and would have needed no
`docs/sources/` detour at all *if* either Punch or Ferguson had been an SCC
case. They aren't (Ontario Court of Appeal and Ontario Divisional Court,
respectively) — Ontario court decisions don't have an equivalent directly-
fetchable official site the way SCC judgments do, at least none found so
far, so the boundary below still holds for **CanLII and Ontario court
decisions specifically**, just not for the Supreme Court of Canada:

That route only works when a copy of the source already exists locally (as
Mustapha's did, placed there by some means outside this session's own
tools) — a session's own tools cannot themselves get past CanLII's block to
*create* that local copy from scratch. If a future session needs a specific
CanLII-only or Ontario-court case that isn't already under `docs/sources/`,
getting a copy there (asking the user to supply one, or whatever channel
actually got Mustapha's PDF in) is a precondition. An **SCC** case doesn't
have this problem at all — try `decisions.scc-csc.ca` directly first.

**What was built instead, and why that's an honest outcome, not a
workaround:** rather than cite either case from secondary case-brief
summaries (exactly the case-law-synthesis-from-a-secondary-source risk the
entry above already rules out), the claim type was built narrower —
ordinary negligence using the already-sourced Mustapha elements, with an
explicit proceduralNote stating plainly that bailment's reversed onus is
NOT asserted. See `claimTypes.ts`'s own header (Session 39) for the full
reasoning. If a future session gets a retrievable copy of either case (or
finds a different, retrievable leading bailment authority), the reversed-
onus doctrine could be added as a real enhancement to that same claim type
rather than built from scratch.

---

## Noting up — the open gap, and why it is open

**Nothing in these registries has ever been noted up.** As of 2026-09-11, `npm run test:intake-coverage` reports `44 of 44 case-law citation(s) have NEVER been checked for subsequent treatment`. That number is printed on every run deliberately — see "Making the gap visible" below.

### What the gap actually is

`verifiedAt` and "still good law" are two different claims, and only the first one is being made anywhere in this repo:

| Field | What it asserts | How it is established here |
|---|---|---|
| `verifiedAt` | The source was retrieved and read, and the pinpoint says what we claim it says. | Fetch the judgment, read the paragraph. Done for all 44. |
| `notedUpAt` | The holding has not since been overruled, narrowed, distinguished into irrelevance, or overtaken by legislation. | **Not done for any of them.** |

A citation can be impeccably `verifiedAt` and still be wrong to rely on, because the case was overturned a decade after it was decided and the PDF on disk says nothing about that. Reading a judgment tells you what that court said on that day; it cannot tell you what happened to it afterwards. This is not a theoretical worry for old authorities — three of the cases in use are 30+ years old (Waldick 1991, Machtinger 1992, Hill 1995).

### Why there is no route yet

The standard noting-up tool is CanLII's, and **CLAUDE.md section 2 forbids scraping CanLII**. `decisions.scc-csc.ca` serves judgment text (see the technique above) but does not expose subsequent-treatment data. So this is not a "nobody got around to it" gap — there is no permitted automated path, and inventing one by scraping is off the table. Do not spend a session rediscovering that.

**Do NOT close this gap from model knowledge.** Asserting that a case is still good law without checking is precisely the recall-based sourcing CLAUDE.md section 2 prohibits, and it is worse than the ordinary version because it *reads* as verified — a `notedUpAt` date is a positive claim that someone checked. An honest `null` beats a fabricated date.

### Making the gap visible

The problem with an unrecorded gap is that absence looks identical to completeness. Two mechanisms now prevent that:

- **`notedUpAt?: string | null` on `EducationCitation`** (`educationTopics.ts`). Statute and regulation citations leave it undefined — currency there is the e-Laws consolidation date carried in the fetched `.doc` itself, a different mechanism handled a different way.
- **A count in `verifyIntakeCoverage.ts`**, printed on every run. It **reports rather than fails**: failing the build on a gap with no available route just trains people to ignore the failure. A number that is in front of you every run, and visibly moves when it changes, does more work than a red X nobody can action.

Case law is identified **structurally**, not from a hand-maintained list that would drift: a citation is case law if its `officialUrl` is a `docs/sources/` PDF or a CanLII `/doc/` path. Confirmed 2026-09-11 that no statute or regulation citation uses either route (those are `ontario.ca/laws/docs/*.doc`), so the classifier has no false positives today. **If that ever stops being true, the count silently becomes wrong** — re-check the assumption before trusting the number.

One trap worth knowing, because the first version of the check fell into it: `DEFENCE_CONCEPTS` carry a bare `sourceUrl` instead of a `citations` tuple, so they are not in `allTopics` and were silently skipped — the count read 43 when the real answer was 44 (`defence-failure-to-mitigate`, sourced to Red Deer College v. Michaels). A coverage check that quietly omits a registry is the same invisible-by-omission failure it exists to catch. **Any new registry needs adding to this count explicitly.**

### The adjacent gap: no Ontario appellate law at all

Separate from noting up, and worth stating in the same breath: **every case in these registries is a Supreme Court of Canada decision. There are zero Ontario Court of Appeal decisions.** SCC decisions bind all Canadian courts, so nothing cited is *wrong* on hierarchy — but ONCA binds Ontario courts and is where most Ontario-specific doctrine actually gets worked out. The termination-clause content in `sc-claim-wrongful-dismissal` is the sharpest example: Machtinger sets the framework, but when a *specific* clause is valid has been developed extensively at the Ontario appellate level since 1992, and that entry deliberately says the question "is not something this content can answer" rather than pretending otherwise.

ONCA decisions are not on `decisions.scc-csc.ca`, and CanLII is off-limits for scraping. ~~Finding a permitted retrieval route for Ontario appellate decisions is an unsolved, one-time infrastructure question.~~ **Solved 2026-09-30:** the Court of Appeal's own database, through the Fetch Decisions workflow -- see "Court of Appeal for Ontario and SCC decisions" under Techniques that work. The first six ONCA/SCC decisions from that route are cited in `src/lib/content-library/crossForumNotes.ts`.

---

## Negative findings — confirmed not to exist, don't re-search

- **`mitigation` defence concept — CLOSED (Session 43), no longer a confirmed
  absence.** Originally: no source found across the (then-current) three
  approved domains after a real attempt, left open rather than permanently
  closed for a future session using the wider sourcing rule to re-try (see
  the CanLII-reopening lesson above) — exactly what happened. Sourced from
  **Red Deer College v. Michaels, [1976] 2 S.C.R. 324**
  (`docs/sources/red-deer-college-v-michaels-1976-2-SCR-324.pdf`, retrieved
  in commit `eb976a6`, read via the HTML-fallback technique above since the
  PDF has no text layer): the burden of proving a failure to mitigate rests
  on the DEFENDANT, not the plaintiff, and the defendant must prove both
  that the plaintiff failed to take reasonable steps AND that those steps
  would actually have reduced the loss (majority at pp. 330-332; de
  Grandpré J. concurring at pp. 346-347, answering the certified question
  directly: "the onus … is on the defaulting employer"). Now
  `defence-failure-to-mitigate` in `claimTypes.ts`'s `DEFENCE_CONCEPTS`.
- **No single province-wide phone number for the Family Court Support Worker
  Program or the Family Law Information Centre (FLIC)** — both are delivered
  locally per court location, not centrally (commit `d8232ce`). Confirmed via
  `ontario.ca/page/family-court-support-workers` ("Visit the service
  provider's website for the court location your case is in") and
  `ontario.ca/document/guide-procedures-family-court` (FLICs "available in
  all family courts," no central number given).
- **`ontario.ca/locations/courts/` shows addresses only in its index; a real
  phone number lives on each individual courthouse's own page** — confirmed
  by fetching the Alexandria courthouse page directly and finding a live
  number alongside the address and hours (commit `d8232ce`). Don't assume the
  index page itself carries contact details.
- **Neither Ontario court locator exposes a public API:**
  `ontariocourts.ca/ocj/court-locations/` is informational/navigational only
  (no search tool, no data endpoint); `ontario.ca/locations/courts/` is a
  real, working search UI (postal code / address / city / courthouse name,
  with a court-type filter) but not a programmatically callable API
  (`docs/COURTHOUSE_TRACKING_DESIGN.md` §2). Anything needing courthouse data
  has to be a user-confirmed answer captured after they do the lookup
  themselves, not a live call this codebase makes.
- **The landlord vs. former-residential-tenant LTB/Small-Claims timing
  boundary** — confirmed unsourceable from ontario.ca/ontariocourts.ca/
  ontariocourtforms.on.ca in an earlier session (`courtPathClassifier.ts`'s
  own header). Not permanently closed like the vehicle-accident item above —
  no session has declared a stop on re-attempting this one, and the CanLII/
  `docs/sources/` route hasn't been tried against it yet.
- **A general/national (988-style) crisis line** for `safetyPass.ts`'s
  `IMMEDIATE_DANGER_MESSAGE` — checked directly against
  `ontario.ca/page/find-mental-health-support`, which doesn't mention 988 or
  a national line anywhere in its fetched content. Not treated as
  permanently closed — crisis-line offerings can change, worth a periodic
  re-check rather than a one-time no.
- **"20 calendar days" for filing a Defence is confirmed, but two adjacent
  counting-method questions are not:** `ontariocourts.ca/scj/areas-of-law/
  small-claims-court/default-proceedings/` and `.../how-to-respond-to-a-case/`
  both directly confirm the Defence deadline is 20 **calendar** days (not
  business days) from service — already cited in `questionBank.ts`'s
  `sc-defence-filed`. Neither page states whether the count starts the day of
  service or the day after, or whether statutory holidays are excluded — both
  still open questions for `docs/DEADLINE_TRACKING_DESIGN.md`'s counting-
  method work, not yet answered by anything sourced in this codebase.

---

## A miscategorization worth knowing, not a sourcing gap

**"Debt collection agency harassment" has real, directly-confirmed ontario.ca
sourcing** (`ontario.ca/page/stop-collection-agency-calls`) — it was still
left out of `CLAIM_TYPES` not for lack of a source but because it describes a
regulatory complaint against a collector, not an independent Small Claims
Court money claim a plaintiff would bring on its own. It's logged as a
defendant consideration on the existing unpaid-debt claim type instead. If
this surfaces again, the fix isn't more sourcing — it's deciding whether a
regulatory-complaint-shaped fact belongs as its own `ClaimType` at all.

### O. Reg. 42/25 has no standalone `.doc` — verify it inside O. Reg. 626/00

Confirmed 2026-09-13. The amending regulation that most recently changed the
Small Claims monetary limit has no retrievable standalone text on the e-Laws
`.doc` route. Four id forms tried, all **HTTP 403**: `25042`, `250042`,
`r25042`, `042025`.

**What works instead:** the amendment is recorded inside the CONSOLIDATED
`000626_e.doc`, whose own header reads *"Last amendment: 42/25"* and
*"Legislative History: 439/08, 244/10, 317/11, 343/19, 42/25"*, with s. 1's
credits carrying *"O. Reg. 42/25, s. 1"*. Cite the consolidation and pinpoint
the credit line. This is likely the general pattern for recent amending
regulations — check the consolidation before hunting for a standalone document.

---

## The generic "serving your documents" block: rules verified, block NOT published (2026-09-27)

**Read this before attempting it again. The sources are fine; the blocker is readability.**

### What the two rule citations actually verified to

Both read out of `docs/sources/corpus/oreg-258-98-small-claims-rules.txt`, rule
numbers confirmed against the regulation's own table of contents in the same file.

| Cited as | Actually is | Status |
|---|---|---|
| r. 13.03 (2) | "Disclosure" under RULE 13 SETTLEMENT CONFERENCES. "At least 14 days before the date of the settlement conference, each party **shall** serve on every other party and file with the court, (a) a copy of any document to be relied on at the trial, including an expert report, not attached to the party's claim or defence; and (b) a list of proposed witnesses (Form 13A)…" | **Correct as given.** A genuine mandatory duty |
| r. 18.02 | "WRITTEN STATEMENTS, DOCUMENTS AND RECORDS" under RULE 18 EVIDENCE AT TRIAL | **Rule number correct.** The *description* was not — see below |

**r. 18.02 (1) IS NOT A SERVICE REQUIREMENT, and describing it as one invents an
obligation.** It reads: "A document or written statement or an audio or visual record
that has been served, at least 30 days before the trial date, on all parties who were
served with the notice of trial, **shall be received in evidence, unless the trial
judge orders otherwise.**" That is a route to admissibility a party may take, not a
duty to serve. r. 18.02 (3) *is* mandatory, but only once a party chooses to serve
under 18.02: they "shall append to or include in" the name, telephone number and
address for service, plus a summary of qualifications for an expert.

Three provisions, two different kinds of obligation. A block has to keep them apart.

### Why it is not published

Seven drafter/verifier runs (gpt-4o-mini then gpt-4o, ~$1.40). The best run reached
**11 of 11 sentences verified** with every accuracy gate clear, and failed readability
at grade 8.2 against the grade 8 target. Runs landed 8.1–9.8 and never cleared both at
once.

**The readability target is structurally tight for this topic, and it was measured
rather than assumed:**

- `"Serve your documents 14 days before the settlement conference."` scores **9.66 on
  its own**. "settlement conference" is six syllables across two words and is not
  optional — it is the name of the event the 14-day period runs from.
- Drop the term and the same sentence scores 7.19.
- The 16 published stage blocks top out at **7.98**, median 6.61, because their
  vocabulary is shorter: notice, clerk, claim, defence.

So this is not a drafting failure that more attempts will fix reliably. Raising
attempts within a run from 4 to 7 made it *worse* (grade 9.8) — accumulated feedback
makes the drafter overcorrect between padding and verbatim quotation.

**The decision it needs is the site owner's:** allow a documented per-topic readability
allowance for blocks whose mandatory vocabulary forces it, keep iterating runs, or
leave the panel absent. Nothing was published in the meantime and nothing was
hand-written.

### Two dead ends, so they are not repeated

- **Legislation-only source material does not work here.** The first version passed
  pinpoint-quoted rules and no guide pages, on the reasoning that a guide page carries
  one case-position's assumptions. The regulation says "shall"; grade 8 prose says
  "must"; drafter rule 4a instructs exactly that — and with no text saying "must"
  available, the verifier rejected every obligation sentence with "the source does not
  use the word 'must'". The 16 stage blocks never hit this because `sourceMaterial`
  hands them guide pages that do say "must". `guide-serving-documents` (ontario.ca
  *Guide to Procedures in Small Claims Court: Serving documents*) is the right second
  source: its whole subject is service, so it is not scoped to a point in a case.
- **`makesAClaim` is not a filler detector.** I used it to enforce drafter rule 8a and
  it rejected "This includes expert reports not attached to your claim or defence." —
  a particular straight out of r. 13.03 (2) (a). Its marker list is tuned for "is this
  verifiable" and contains no document nouns. Removed.

---

## PIPELINE RULE: the term-of-art readability exception (2026-09-27)

**This is a rule of the content pipeline, alongside drafter rules 4a (split a long
requirement), 5c (do not gloss how service is made) and 8a (filler names no new
particular). It is not a per-block override and there is no way to grant one.**

`src/lib/content-library/readabilityExceptions.ts`.

### The rule

A block over `TARGET_GRADE` still passes **if and only if** the excess is attributable
to an allowlisted legal term of art — a named proceeding, a statutory phrase, a form
number — with no accurate plain-language substitute.

### How that is decided, which is the part that stops it becoming a relaxation

The term is replaced with a placeholder of the **same word count** and the **minimum
possible syllable count** (one per word), and the block is measured again. It passes
only if the substituted block meets the target.

Flesch-Kincaid is a function of words, sentences and syllables, so holding word and
sentence counts constant isolates the term's syllable cost and changes nothing else.
The question the test asks is deliberately hostile to itself: *if this term were as
easy as any English phrase could possibly be, would this block pass?* If not, the
excess is not the term's fault.

**What therefore still fails, exactly as before:** padding, long sentences, awkward
constructions, ordinary long vocabulary, and any combination of them. All four are
checked by `test:generic-library` against fixed synthetic cases, so the mechanism
cannot drift into permissiveness without a red suite.

### The repetition guard

Each term carries `maxOccurrences` (2 for "settlement conference"). Beyond that the
excess is repetition the drafter can fix — and the drafter is already told to name the
term once and then refer back to it. Without this guard the mechanism would excuse
precisely the padding the readability gate exists to catch.

### Every entry must cite a source using the term as a name

`definedAt` is a pinpoint into the vendored corpus, and the suite checks the passage is
really there *and* that it contains the term. So an entry cannot be added on an
assertion that some rule probably uses the phrase.

### The allowlist

| Term | Where the source uses it | Why no plain substitute is accurate |
|---|---|---|
| settlement conference | r. 13.01 (1), O. Reg. 258/98 — "A settlement conference shall be held in every defended action." | The name of a specific proceeding the Rules require and fix a date for. "Meeting" or "hearing" is inaccurate — it is neither a trial nor an informal meeting, and it is the event r. 13.03 (2) counts 14 days back from. A reader told to serve documents before a "meeting" cannot identify which event that is on the notice the clerk sends them |

### A granted exception is recorded on the block, not just logged

`GenericAnswer.readabilityException` carries the term, the occurrence count, the grade
with and without, and the pinpoint. It therefore appears in the review packet where a
reviewer can disagree with it, and `test:generic-library` re-derives it from the
block's own text — a stored grant that the mechanism would no longer give fails.
Promotion re-derives it too, so a block cannot publish on a grant that has expired.

### Two things measured while building this

- **The exception is not always needed.** "Serve your documents 14 days before the
  settlement conference." scores 9.66 alone and 6.13 beside two plain sentences.
  Dilution works, and a tightly written block containing the term can meet grade 8
  outright — one draft did, at 7.82.
- **More attempts per run make things worse.** Feedback is replaced each attempt rather
  than accumulated into understanding, so a long run accumulates contradictory
  corrections: the drafter shortens until the verifier rejects the sentence as not what
  the source says, restores the source wording until readability fails, and by attempt
  seven reproduces generalities it was told twice to avoid. Measured: 4-attempt runs
  landed grade 7.8–8.4, 7-attempt runs landed 9.4–9.9. `MAX_ATTEMPTS` is 4. Fresh runs
  beat long ones.

## PIPELINE RULE: a duty stated by halves (2026-09-27)

`dutyCompletenessProblems` in `scripts/content/blockGates.ts`. Same family as the
bar-exceptions gate and the admissibility-discretion gate: a proposition whose second
half or qualifier must travel with it.

**Found by reading a draft that had passed everything.** A serving-documents block
reached 11 of 11 verified verdicts at grade 7.82 and never told the reader to file
anything. r. 13.03 (2) reads "each party shall serve on every other party **and file
with the court**" — two obligations in one breath. Every sentence was true, and a
litigant following it exactly would have served their documents and not filed them,
which is not compliance.

**The verifier cannot catch this and it is not a defect that it cannot.** It checks
each sentence against the sources, so it catches a sentence saying something no source
states. An omission is not a sentence.

The gate now requires: where a cited quote imposes serving **and** filing, the block
mentions filing; and where a cited quote says "at least N days", the block does not
state "N days" without the floor — "14 days before" turns a minimum into a single
permitted day, and a reader who cannot manage that exact day does not learn that
earlier is fine.

No existing published block cites a serve-and-file duty, so adding this changed nothing
for the 16.

## Vendored ontario.ca / SCJ pages and recorded quotes (2026-09-30)

Eight pages that the catalogue cited but that had no local copy were vendored
through the Vendor Sources workflow (ids in `scripts/rules/practicalSources.ts`
and `corpusSources.ts`): `scj-steps-to-a-civil-case`,
`ontario-renting-commercial-property`, `ontario-towing-rights`,
`ontario-cpa-rights`, `esa-guide-overtime-pay`, `esa-guide-termination`,
`esa-guide-vacation`, and **O. Reg. 333/08** (`oreg-333-08-motor-vehicle-dealers-general`,
`https://www.ontario.ca/laws/docs/080333_e.doc`). O. Reg. 333/08 was the last
regulation the catalogue could not check; the workflow route works for it, so
it is no longer a dead end. With it, **all 325 catalogue entries are verified,
0 unverifiable.**

What broke the moment those pages became checkable, so it is not rediscovered:

- **HTML-derived text keeps markup artefacts.** Link text is padded with spaces
  (`( CTA )`, `business .`) and a few entities survive (`&#8217;`). A quote
  copied from the rendered page has neither. `normalizeForQuote` in
  `scripts/content/catalogueVerification.ts` now decodes those entities and
  removes the space after `(`/`[` and before `)`/`]`/`,`/`;` -- **but not before
  `.`**, because `" ... "` is the skipped-material marker and stripping that
  space silently turned 40 multi-part quotes into single runs that could not
  match.
- **Recorded quotes had been flattened.** Several records joined separate
  sentences as `"A." "B."` or turned a bulleted list into one sentence with
  semicolons. Those are rewritten with `" ... "` between verbatim runs. A
  record's own wrapping quotation marks are stripped by `stripWrappingQuotes`.
- **The live page had drifted from the recorded quote** in two places (the CPA
  rights page now splits the cooling-off sentence across a list; the
  commercial-renting sentence begins "You should be aware that a signed...").
  The meaning was unchanged; the quotes were re-taken from the vendored text.

## Findings from the third audit round (2026-09-30)

- **Small Claims r. 13.07 exists and gives a 30-day trial-request notice**
  after the settlement conference. An earlier audit pass called a card line
  about it invented; it was a loose paraphrase. Read r. 13.07 before
  concluding anything about trial requests.
- **r. 13.02(1) now says parties "participate" in the settlement conference**
  (O. Reg. 3/25), not "attend". The ontario.ca guide still says "attend", so
  anything drafted from the guide carries the old word.
- **Periods in months:** the Small Claims Rules do not say how months are
  counted, but the Legislation Act, 2006 (s. 89(6)) does, and s. 46 applies it
  to regulations. "The Rules are silent" is true; "nothing says" is not.
- **Forms table parsing:** dotted form numbers (11.2A, 11.3A) need
  `\d{1,2}(?:\.\d)?[A-Z]?` -- the older pattern dropped them, and a title that
  wraps onto a second line (20O) is still cut short by the line-based parser.
- **The Family Court branch sits only in Hamilton and proclaimed areas**
  (CJA s. 21.1(4)); elsewhere family cases are in the Superior Court of Justice
  or the Ontario Court of Justice. "Family Court" as a single forum is wrong.
- **Human Rights Code claims cannot be started in court on their own**
  (s. 46.1(2)); don't list "human rights" as a civil claim type.

## Whole-corpus re-fetch and comparison (2026-09-30)

All 203 sources were re-fetched (Vendor Sources run 36792894579) and each was
compared word by word with the committed copy after normalising typography.
**No English legal text had changed.** Differences were: French equivalents
now decoded with accents; curly quotes and dashes; non-breaking spaces; page
notices (CAT platform outage, HRTO new forms). Findings worth keeping:

- **The fetcher now returns curly apostrophes**, so a required marker written
  with a straight one fails: `municipal-act-2001` ("not liable for a") and
  `occupiers-liability-act` ("Occupiers' Liability Act") were reported FAILED
  for that reason alone. Their committed copies are unaffected.
- **Adopting the re-fetched files is not free**: with curly quotes, 4 suites
  (form index, glossary, published library, generic library) fail their
  verbatim checks. The committed copies were kept; the manifest hashes, which
  had been overwritten by an earlier re-fetch whose files were never
  committed, were reset to the committed files (each entry carries a
  `hashNote`). `test:rules-corpus` passes again and is now in CI.
- **Known defect in the committed Rules of Civil Procedure**: r. 53.10's
  discount rate reads "less per cent" where the source says "less 1½ per
  cent" -- the ½ was lost to encoding. No content quotes it; do not quote it
  from this copy.
- Hashing: the suite hashes the file as read, **with CRLF intact**. Python's
  default newline translation produced wrong hashes for three CRLF files
  (divorce-act, federal guidelines, SCJ steps); use `newline=''`.

### An injury from a vehicle: the notice is Insurance Act s. 258.3, not Municipal Act s. 44 (10) (2026-10-05)

Found from a live run (a pedestrian hit by a city bus). The obvious guess is
the municipal 10-day notice, and it is wrong for this: Municipal Act
s. 44 (10) applies to "damages under subsection (2)", which is a municipality
failing to keep a highway or bridge in repair. A bus being driven into someone
is not that claim.

What does apply, already in the vendored corpus (`insurance-act`):
- **s. 258.3 (1):** an action "for loss or damage from bodily injury or death
  arising directly or indirectly from the use or operation of an automobile"
  is not to be commenced unless the plaintiff has applied for statutory
  accident benefits, served written notice of the intention to sue on the
  defendant **within 120 days after the incident** (a court may extend it), and
  done (c)-(f) (prescribed information; examinations, statutory declaration and
  identity only if the defendant asks).
- **s. 258.3 (9):** it is NOT a bar. The action may be started anyway; the
  court considers the non-compliance in costs. **s. 258.3 (8):** no
  prejudgment interest under CJA s. 128 for the time before the notice.
- **s. 224 (1):** "public transit" is fare service by automobiles operated by
  or on behalf of a municipality; "automobile" includes a motor vehicle
  required to be insured.
- **s. 267.5:** limits what may be recovered from an automobile's owner,
  occupants and anyone present (income loss, health care, non-pecuniary
  threshold and deduction). **s. 267.5 (6.1)** removes that protection for the
  owner or driver of a public transit vehicle "if it did not collide with
  another automobile or any other object". Whether a pedestrian is an "object"
  is not answered by the text -- do not state an answer.

Not in the corpus yet: the **Highway Traffic Act** (no source id) and
Insurance Act **s. 33** (service of the notice -- the block only points to it).
The deadline engine counts the 120 days under the Legislation Act; the
published block is `answer:before-filing:notice-vehicle-injury` (run-15).

### Highway Traffic Act vendored (2026-10-05)

`highway-traffic-act` (R.S.O. 1990, c. H.8, e-Laws `90h08`), declared in
`scripts/rules/claimTypeSources.ts`, fetched first time by Vendor Sources run
37362135117 from the research-step branch (dispatching on a branch works), and
indexed by Corpus Index run 37362973715 (919 passages). Consolidation period
from July 1, 2026. s. 193 (onus of proof in a motor-vehicle loss) and ss. 140,
144 (7) (yielding to pedestrians) are cut as their own passages.
