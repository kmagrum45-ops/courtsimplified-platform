# Annual Practice extraction — consolidated sourcing map

**548 files tracked across 4 batches.** 275 primary law, 273 editorial commentary (§ sections). 26 duplicates detected.

**What this is:** a map of which statutory provisions and procedural rules the *Ontario Annual Practice* covers, extracted as reference data only. No commentary prose was captured — § sections are recorded by number and title so you know they exist, nothing more. Every item below is public law available free on e-Laws with a citable URL.

**What this is not:** content for the site. Each item here is a pointer. The actual text gets sourced from e-Laws directly, cited with a real URL, and verified by a session reading it — the same process that produced everything currently in `claimTypes.ts`.

---

## Coverage summary

| Body of law | Coverage | Relevance to CourtSimplified |
|---|---|---|
| **Courts of Justice Act** | 117 sections (1 through 90) | Mixed — ss. 22-33 are directly relevant |
| **Rules of Civil Procedure** | 15 rules, 145 subsections | Civil path only (unbuilt) |
| **Small Claims Court Rules (O. Reg. 258/98)** | **ZERO** | **Your actual jurisdiction — entirely absent** |

The single most important finding: **nothing in 548 files covers the Small Claims Court Rules.** That regulation governs everything your site currently does, and it isn't in this extraction at all.

---

## TIER 1 — Directly relevant, source these first

### Courts of Justice Act, ss. 22–33 (Small Claims Court)

These are the statutory foundation of the court your site serves. All public, all on e-Laws.

| Section | Title | Why it matters |
|---|---|---|
| **23** | Jurisdiction | What Small Claims can hear and award. Underpins every claim type. |
| **25** | Summary hearings | How trials actually work — relevant to what a user prepares for. |
| **26** | Representation | Who may appear. Directly relevant to self-represented parties and paralegals. |
| **27** | Evidence | Small Claims does not apply strict evidence rules. Changes what a user needs to bring. |
| **28** | Instalment orders | Payment terms after judgment — a common post-judgment question. |
| **29** | **Limit on costs** | A statutory cost cap. "What does this cost me if I lose" is the question self-represented people most need answered, and this is a real sourceable answer. |
| **30** | Contempt for failure to attend examination | Enforcement. |
| **31** | Appeals | Where a Small Claims appeal goes and on what terms. |
| **32** | Deputy judges | Who presides. |
| 22 | Small Claims Court (constitution) | Structural. |
| 24 | Composition of court for hearings | Structural. |
| 33, 33.1 | Deputy Judges Council, complaints | Low relevance. |

### Other CJA sections worth sourcing

| Section | Title | Why |
|---|---|---|
| **17** | Appeals to Superior Court of Justice | Appeal routing. |
| **19** | Divisional Court jurisdiction | Appeal routing — where appeals actually go. |
| **21.11** | Place where proceeding commenced | Venue. Connects to `COURTHOUSE_TRACKING_DESIGN.md`. |
| **21.8** | Proceedings in Family Court | Family path jurisdiction. |
| **21.9** | Other jurisdiction | Family path. |
| **23** *(see above)* | — | — |

### The leave requirement — flagged separately

The book's "Overview of Recent Developments" records that the *Strengthening Safety and Modernizing Justice Act, 2023*, c. 12, Sched. 3, s. 1 **requires leave to commence an action in the Superior Court of Justice where the action is within Small Claims Court jurisdiction**, in force **July 1, 2024**.

This is unverified secondhand and needs sourcing from the CJA directly. If accurate, it affects `courtPathClassifier.ts`: a claim under $50,000 is not a free election between Small Claims and Superior Court. Possibly also a `jurisdictionRoutes.ts` entry.

---

## TIER 2 — Rules of Civil Procedure (Civil path, currently unbuilt)

R.R.O. 1990, Reg. 194. Free on e-Laws. Your Civil path has no ClaimType registry, no classifier, and no evidence engine — so these become useful when that machinery is built, not before.

| Rule | Subsections captured | Subject |
|---|---|---|
| 16 | 11 | Service of documents |
| 18 | 3 | Time for delivery of statement of defence |
| 19 | 9 | Default proceedings — noting default, default judgment, setting aside |
| 20 | 9 | Summary judgment |
| 25 | 11 | Pleadings |
| 26 | 6 | Amendment of pleadings |
| 30 | 12 | Documentary discovery, affidavit of documents |
| 31 | 12 | Examination for discovery |
| 37 | 19 | Motions |
| 39 | 4 | Evidence on motions and applications |
| 40 | 1 | Interlocutory injunctions |
| **49** | 14 | **Offers to settle** |
| 50 | 14 | Pre-trial conference |
| **57** | 7 | **Costs — general principles** |
| 58 | 13 | Assessment of costs |

**Rules 49, 57, and 58 deserve attention beyond the Civil path.** Offers to settle and costs are the mechanisms self-represented litigants most commonly misunderstand — a party can win and still lose money by mishandling a settlement offer. Whether Small Claims has parallel provisions is worth checking when O. Reg. 258/98 gets sourced.

**Rule 19 (default proceedings)** is also structurally interesting: it's the Civil analogue of what happens when a defendant doesn't respond, which your Small Claims content touches.

---

## TIER 3 — Covered but low relevance

CJA sections 1–21.7 (court structure, judicial appointments, composition of courts, assignment of judges) and 34–90 (Ontario Court of Justice, provincial judges, judicial council, procedural miscellany). These govern how Ontario's courts are constituted and staffed. Almost none of it affects what a self-represented litigant does.

Exceptions already promoted to Tier 1: ss. 17, 19, 21.8, 21.9, 21.11.

---

## The gap this extraction exposes

**O. Reg. 258/98 — the Rules of the Small Claims Court — appears nowhere in 548 files.**

That regulation governs: service, defence deadlines, default proceedings, settlement conferences, motions, trial procedure, costs, and enforcement — in the court your entire product serves. `PROCEDURAL_RULES_INVENTORY.md` already found the deadline layer completely absent from the codebase. This is the source that closes it.

It is one document, free on e-Laws, and a session can read it end to end in a single pass using the `.doc` route recorded in `SOURCING_NOTES.md`.

**That is the highest-value sourcing work available**, and it doesn't depend on anything in this extraction.

---

## Suggested order

1. **O. Reg. 258/98, read end to end** — closes the deadline gap, not covered by this extraction at all
2. **CJA ss. 23, 26, 27, 29, 31** — the Small Claims statutory foundation, especially s. 29 (costs)
3. **The leave requirement** — verify against the CJA, correct `courtPathClassifier.ts` if confirmed
4. **CJA ss. 17, 19, 21.11** — appeal routing and venue
5. **RCP rules** — when the Civil path has machinery to hold them

---

## Method note

Extraction captured: filename, section identifier, primary-vs-commentary classification (using the book's own § convention, documented in its Users' Guide), page count, title, and every rule/section/regulation reference appearing in the text.

Commentary prose was never captured. The § sections are recorded as existing — by number and title — which is a fact about the book's structure, not its content.
