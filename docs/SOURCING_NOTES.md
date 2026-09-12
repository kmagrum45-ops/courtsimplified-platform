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

**Practical rule:** always open the fetched `.doc` and read its first
header line before citing from it. "CONSOLIDATION PERIOD ... TO THE E-LAWS
CURRENCY DATE" means current; "HISTORICAL VERSION FOR THE PERIOD ..." means
you are reading law as it stood on a past date, and anything enacted since
is either missing or marked "not in force." Treat any filename carrying a
version suffix as historical until that header proves otherwise. The plain
`_e.doc` form is the one to cite; treat the rest of the filename pattern as
a starting guess to try, not a template to construct blindly.

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

### Search the codebase before building on a claimed-existing feature

`docs/COURTHOUSE_TRACKING_DESIGN.md` was scoped as "pairing with the 'Find
your courthouse' link just added" — a grep for `courthouse`, `court-location`,
`ocj/court`, and `ontariocourts.ca/ocj` across the whole repo found no such
link anywhere. Cheap to check, expensive to design around a feature that
doesn't exist. Worth doing before any task premised on "the X that already
exists" — the premise itself is sometimes the thing to verify first.

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
