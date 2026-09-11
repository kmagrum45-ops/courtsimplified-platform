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

But at least two entries already cited in this codebase don't follow that
exact pattern — `90o02_eV006.doc` (Occupiers' Liability Act, capital `V` plus
a version number) and `elaws_statutes_90c43_ev005.doc` (Courts of Justice
Act, a completely different `elaws_statutes_` prefix). Treat the plain
pattern as a starting guess to try, not a template to construct blindly and
cite without confirming the fetch actually returned the right document.

Regulation-level e-Laws pages (`ontario.ca/laws/regulation/<id>`, e.g. O. Reg.
258/98's `980258`) have the same JS-shell problem — verified as SOURCED at the
regulation-as-a-whole level (`docs/PROCEDURAL_RULES_INVENTORY.md` §5), but a
`.doc` fallback for a *regulation* (as opposed to a statute) hasn't actually
been located and used by any citation in this codebase yet — don't assume the
same `<id>_e.doc` pattern works there without checking.

### CanLII / SCC block automated fetching — the `docs/sources/` manual-download route

CanLII and the Supreme Court of Canada's own site both block automated
fetching outright — a live `WebFetch` against a `canlii.org` URL will not
work. This does **not** mean CanLII can't be cited: `canlii.org` is already
an allowed citation domain (`verifyIntakeCoverage.ts`'s `ALLOWED_SOURCE_DOMAINS`),
and a case's live CanLII URL is the right thing to put in a citation's
`officialUrl` for a user to actually visit. What CLAUDE.md section 2's
`docs/sources/` route solves is a different, narrower problem: satisfying
"actually retrieved and read," not "cited from a domain this tool can reach."

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

---

## Negative findings — confirmed not to exist, don't re-search

- **`mitigation` defence concept:** no source found across the (then-current)
  three approved domains after a real attempt. `claimTypes.ts`'s own header
  logs this. Not marked permanently closed — explicitly left open for a
  future session using the wider sourcing rule (see the CanLII-reopening
  lesson above) to re-try.
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
