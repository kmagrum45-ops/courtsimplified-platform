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
- `90n01_e.doc` — Negligence Act, R.S.O. 1990, c. N.1
- `90s01_e.doc` — Sale of Goods Act, R.S.O. 1990, c. S.1
- `90l12_e.doc` — Libel and Slander Act, R.S.O. 1990, c. L.12
- `98c19_e.doc` — Condominium Act, 1998, S.O. 1998, c. 19

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

ONCA decisions are not on `decisions.scc-csc.ca`, and CanLII is off-limits for scraping. **Finding a permitted retrieval route for Ontario appellate decisions is an unsolved, one-time infrastructure question** — solve it once rather than per-entry, and record the answer here.

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
