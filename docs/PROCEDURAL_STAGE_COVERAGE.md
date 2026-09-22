# Procedural stage coverage — which stages state which categories of requirement

**What this is:** an audit of `app/legal-principles/page.tsx`, asking of every
procedural stage not *"is this fact correct"* but *"does this stage answer the
same questions its neighbours answer"*.

**Why it exists:** a missing proof-of-service line was found in the Small Claims
"Filing a Claim" stage. Checking the other direction — every stage, every
category — showed it was not one omission but a pattern. A stage that names a
form and never says to serve it, or says to serve and never says how service is
proved, has the same shape of defect, and there were several.

**For anyone adding a stage:** this table is the shape you are expected to fill.
If a category is genuinely not applicable — a fee stage does not state service —
that is fine, and saying so is better than leaving the reader to guess.

Audit date: **2026-09-17**. 19 stages at audit, **21 after the repairs below**.

> **Status: the Small Claims gaps and the two "Serving Documents" gaps are
> closed.** The matrix below is kept as the AUDIT — what was found — with the
> repairs marked, because the point of the document is the shape of the defect,
> not a snapshot of one afternoon. Items still open are listed at the end.

---

## The categories

| Category | The question it answers |
|---|---|
| **Form** | Which document, by its form number |
| **Serve** | Who it goes to, and by when |
| **Proof** | How service is proved, and on which form |
| **File** | That it goes to the court, and by when |
| **Deadline** | The time limit attaching to any of the above |
| **Fee** | What it costs |

---

## The matrix

| Stage | Form | Serve | Proof | File | Deadline | Fee |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| **SMALL CLAIMS** | | | | | | |
| Monetary Jurisdiction | – | – | – | – | ✓ | ✓ |
| Filing a Claim | ✓ | ✓ | **✗→✓** | **✗→✓** | ✓ | – |
| Responding to a Claim | ✓ | ✓ | ✓¹→✓ | ✓ | ✓ | – |
| If a Defence Is Not Filed | **✗→✓** | **✗→✓** | **✗→✓** | ✓ | **✗** | – |
| Serving Documents | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| Evidence and Witnesses for Trial | ✓ | ✓ | **✗→✓** | ✓ | ✓ | – |
| Case Timeline | –→✓ | ✓ | **✗→✓** | ✓ | ✓ | – |
| Filing Fees | – | – | – | ✓ | ✓ | ✓ |
| **SUPERIOR COURT (CIVIL)** | | | | | | |
| Starting a Claim | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| Defending a Claim | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| **Serving Documents** *(added)* | ✓ | ✓ | ✓ | ✓ | – | – |
| Discovery | ✓ | **✗** | **✗** | **✗** | ✓ | – |
| Mandatory Mediation | – | – | – | ✓ | ✓ | – |
| Setting Down for Trial | **✗** | **✗** | **✗** | **✗** | ✓ | – |
| Forms | – | – | – | ✓ | – | – |
| **FAMILY COURT** | | | | | | |
| Starting a Case | **✗** | **✗** | **✗** | **✗** | **✗** | – |
| Responding to an Application | ✓ | ✓ | **✗**² | ✓ | ✓ | – |
| **Serving Documents** *(added)* | ✓ | ✓ | ✓ | ✓ | – | – |
| Conferences | **✗** | ✓ | **✗**² | **✗** | ✓ | – |
| Motions | **✗** | **✗** | **✗**² | **✗** | ✓ | – |
| Forms | ✓ | – | – | ✓ | – | – |

✓ stated · **✗** expected but absent · **✗→✓** repaired 2026-09-17 · – not
applicable to this stage

¹ Named Form 8A only. Before the repair, Form 8B appeared **once in the entire
codebase**, in the Small Claims Serving Documents stage.

² Not a correctness defect. Family Law Rules **r. 2 (1)** defines "file" as "to
file, *with proof of service where service is required*", so these stages are
already legally complete. The new Family Serving Documents stage says so
explicitly, because a requirement that reaches the reader only through a defined
term has not reached the reader.

---

## The structural finding — and what was done about it

**At audit, "Serving Documents" existed only for Small Claims.** It was the one
complete stage — form, service, proof, filing, deadlines, and both 8A and 8B —
and it was the fallback that made the other Small Claims omissions survivable: a
reader who missed proof of service under "Filing a Claim" could still find it.

**Superior Court and Family had no equivalent stage at all**, so their per-stage
omissions had nothing to fall back to.

**Both were added on 2026-09-17**, each written from its own regulation. They
are deliberately *not* three versions of one text — see the table below.

Still true, and not addressed: **Small Claims has a Filing Fees stage and the
other two paths have none**, and **there is no enforcement stage on any path**
though O. Reg. 258/98 r. 20 covers it and is vendored.

---

## Still open

| Item | Blocked on | Now unblocked? |
|---|---|---|
| Superior **Discovery** — form named, no verb | r. 30.03, r. 29.1.03 | Yes, vendored |
| Superior **Setting Down** — nothing stated | r. 48.02 (serve the trial record, file with proof of service) | Yes, vendored |
| Family **Starting a Case** — names no document | r. 8 (1) | Yes, vendored |
| Family **Motions**, **Conferences** — timing only | r. 14, r. 17 | Yes, vendored |
| **Enforcement stage** on any path | O. Reg. 258/98 r. 20 | Yes, vendored |
| **Fees** for Superior and Family | not retrieved | No |

---

## Sources

Every gap above that is marked for repair is traceable to a vendored primary
source in `docs/sources/`:

| Path | Regulation | Vendored as |
|---|---|---|
| Small Claims | O. Reg. 258/98 | `oreg-258-98-cited-rules.txt` |
| Superior (Civil) | R.R.O. 1990, Reg. 194 | `rcp-cited-rules.txt` |
| Family | O. Reg. 114/99 | `flr-stage-rules.txt` |

**Proof of service is not the same rule in the three paths, and must not be
described in the same words:**

| Path | Affidavit | Licensee certificate | Who may certify |
|---|---|---|---|
| Small Claims — r. 8.09.1 | Form 8A | Form 8B | lawyer **or paralegal** |
| Superior — r. 16.09 | Form 16B | Form 16B.1 | **lawyer only** |
| Family — r. 6 (19) | Form 6B | Form 6C | lawyer **or paralegal** |

Each certificate carries the same condition: the licensee served the document or
caused it to be served, **and is satisfied that service was effected**.

Family additionally defines the term: **r. 2 (1) — "file" means to file, *with
proof of service where service is required*.** So Family content saying "serve
and file" is legally complete already. It is still worth stating, because a
self-represented reader cannot be expected to know a definition does that work.

---

## How this audit was produced, and its limits

A scan classified each stage's `keyFacts` against the six categories with
keyword patterns, then flagged asymmetries (names a form but never serves it;
serves but never files; serves but never proves).

**It produced 14 flags, of which 5 were false positives** — Filing Fees,
Superior Forms and Family Forms were flagged for "says to file, never says to
serve", which is not their job, and two more were stages with no document
handling at all.

**So this is a drafting aid, not a check, and it is deliberately not wired into
the verification suite.** A check that cries wolf on a third of its output gets
ignored, and an ignored check is worse than no check — the same reasoning
recorded in `CLAUDE.md` §5 about pinning values instead of properties. The
judgment about which flags are real is human and stays human.

What *could* become a mechanical check, if this recurs: a stage that names a
form must state at least one verb for it. That property has no obvious false
positives. It has not been written.
