# CourtSimplified — outstanding issues register

Everything found and not yet fixed, as of this session. Ordered by what actually matters, not by when it was discovered.

**How to read this:** each item states what's wrong, where it was found, and why it matters. Items marked ⚠️ can produce wrong information for a real user. Items marked 🔒 are security or privacy. Everything else is incomplete rather than broken.

---

## 1. Defects that could mislead a user

### ⚠️ `twentyDaysElapsed` — default judgment timing
**Found:** Small Claims Rules map session.
The fact-gate assumes a naive 20-day count from service. Three separate provisions make the real deadline later: r. 3.01 excludes the service day; day 20 lands on a weekend roughly two times in seven and rolls forward; and mail or courier service isn't effective until the fifth day. **The failure mode is telling a user default judgment is available before the defendant's time has actually run.** Currently only gates whether a question surfaces, so exposure is limited — but it cannot be fixed by reading the regulation harder. The deemed-service interaction is genuinely unresolvable from O. Reg. 258/98 and needs a licensee.

### ⚠️ `defence-set-off-or-counterclaim` — issuing vs. filing
**Found:** Small Claims Rules map session. `claimTypes.ts:372`.
States a Defendant's Claim must be "filed within 20 days of filing a Defence." r. 10.01(2) says it may be *issued* within 20 days after the day the defence is filed — issuing and filing are distinct acts — and sets an outer bound at trial or default judgment with leave, which the entry omits entirely.

### ⚠️ r. 8.01(2) — six-month deadline to serve an issued claim
**Found:** Small Claims Rules map session.
A hard gate between issuing a claim and everything downstream. Appears nowhere in any intake registry. A user could issue a claim and never be told this exists.

### ⚠️ Causation elements promise more than they deliver
**Found:** Clements session, deliberately left for a follow-up.
`sc-claim-vehicle-accident-uninsured-driver-property-damage` and `sc-claim-property-damaged-lost-in-business-care` both name an element "caused, in fact and in law." The explanation only covers the legal branch (remoteness, foreseeability). The factual "but for" branch is promised by the name and never explained, and Mustapha — the cited source — doesn't cover it. Clements is now in `docs/sources/` and does.

### ⚠️ `outOfScopeForums.ts` — zero citations
**Found:** jurisdiction-routes session.
Names HRTO, WSIB, CAT, and LAT in user-facing redirect text with no sourced basis for any of it. The site is telling users where their matter belongs on nobody's verified authority.

### ⚠️ The leave requirement — possibly makes `courtPathClassifier.ts` wrong
**Found:** Annual Practice extraction, unverified.
The *Strengthening Safety and Modernizing Justice Act, 2023* reportedly requires leave to commence a Superior Court action that falls within Small Claims jurisdiction, in force July 1, 2024. If accurate, a claim under $50,000 is not a free election between courts. **Secondhand and unsourced — verify against the CJA before acting.**

---

## 2. Security and privacy

### 🔒 `app/api/ai-case-partner/route.ts` — no auth or ownership check
**Found:** Codex review.
Accepts a `caseId` and sensitive case context with no per-user authentication and no ownership verification. Potential cross-user data exposure. **Highest-urgency item on this list.**

### 🔒 Unbounded request payloads
**Found:** Codex review.
Several public-facing utility routes accept arbitrary uploaded or request payloads with no size or schema limits. `evidence-praser` is the clearest case. Availability and privacy risk.

---

## 3. Safety-boundary violations the §3 cleanup missed

### `app/api/case-summary/route.ts` + dashboard readiness score
**Found:** Codex review. **Never confirmed or fixed.**
Reportedly still emits case-specific "evidence strengths," risk severity, complexity, and limitation-risk labels; the dashboard displays a readiness score. Same category as everything removed in commits `6129abd` and `d1fa87c`, in a spot the sweep didn't reach.

### The content audit was never seen
A read-and-report audit of all sourced content — name-vs-text mismatches, citations that don't cover their claim, missing scope limits, entries now citable to better sources — was commissioned. **The results never arrived** (the paste came through empty). It may have run. Worth re-running or locating.

---

## 4. Content gaps now closeable

26 judgments sit in `docs/sources/`. Three have been used (Garland, Red Deer College, Clements). The rest are retrieved, verified, and idle.

| Gap | Source available | Notes |
|---|---|---|
| Defamation — what must be proven | Grant v. Torstar, Hill v. Church of Scientology | Entry currently rests on the Libel and Slander Act plus a jurisdiction provision only |
| Occupiers' liability — standard of care | Waldick v. Malcolm | Slip-and-fall has the statute's duty, nothing on how courts assess it |
| Gift vs. loan | Pecore v. Pecore | Cut from the personal-loan entry; reopens now |
| Duty of care framework | Cooper v. Hobart | — |
| Standard of care | Ryan v. Victoria | — |
| School supervision | Myers v. Peel | Unbuilt claim type, roadmap Batch 3 |
| Employment — reasonable notice | Bardal, Machtinger, Honda v. Keays | Existing entries source ESA minimums only, which are a floor |
| Contract cluster | Sattva, Bhasin, Callow, Fidler, Tercon, Uber v. Heller, Cognos | Largest category, thinnest foundation |
| Limitations — discoverability | Grant Thornton, Pioneer v. Godfrey | — |

**Not closeable:** bailment's reversed onus. Ferguson and Punch are Ontario decisions; CanLII blocks retrieval and the SCC site doesn't carry them. The claim type correctly says it isn't asserting the doctrine.

**Still unsourced:** breach of contract elements. No single leading case exists — formation is textbook law. This is why it keeps getting cut, and no download fixes it.

### CJA sections identified but not sourced
ss. 23 (jurisdiction), 25 (summary hearings), 26 (representation), 27 (evidence — relaxed in Small Claims), 28 (instalment orders), **29 (limit on costs)**, 31 (appeals). Also 17, 19 (appeal routing), 21.11 (venue).

s. 29 matters most: "what does this cost me if I lose" is the question self-represented people most need answered, and there's a statutory cap.

---

## 5. Built but unreachable

- **Statement of Claim engine** — works, tested, wired to nothing. Two specs now exist (readiness gate, intake depth). Neither built.
- **Defendant-response questions** — committed with uncertain provenance, structurally verified, never run end to end. Every one of the 19 survey stories was a plaintiff.
- **Guided intake collects no name or address** — structurally absent from `IntakeFacts`. Not a gate blocker; is a filing blocker.

---

## 6. Designed, not built

- Deadline tracking, tiers 1 and 2 (`DEADLINE_TRACKING_DESIGN.md`)
- Courthouse tracking (`COURTHOUSE_TRACKING_DESIGN.md`)
- Institutional research guidance / FOI (`RESEARCH_GUIDANCE_DESIGN.md`)
- CanLII research guide (filed in `INTAKE_STATUS.md`)
- Statement of Claim readiness gate
- Claim-type intake depth

---

## 7. Review backlog

**Everything is `status: "draft"`.** 22 claim types, 8 education topics, 6 defence concepts, 3 jurisdiction routes. None reviewed by anyone.

The DEFENCE_CONCEPTS entries are live in front of users and have never had a review pass. `familySafetyResources.ts` is fixed but still draft and still dormant.

This is the item that grows with every session of content work, and the only one that can't be closed by building.

---

## 8. Repo hygiene

- `PROJECT_DOCUMENTATION/` — 31 files of substantive Ontario forms work, gitignored, no version control behind it. Source material, not build output. **Prompt written, never confirmed sent.**
- `repomix-output.xml` — 7.5 MB untracked in repo root, should be gitignored
- `cs-context.txt` — untracked, should be deleted
- Two near-identical ~140K-token JSON snapshots in `scripts/form-import-audit/`
- `/family/ontario` and `/ontario-civil` — orphaned routes, unreachable, still build
- `DEADLINE_TRACKING_DESIGN.md` citations into `app/forms/page.tsx` have drifted since the forms-messaging session edited that file
- **46+ commits unpushed**

---

## 9. Accepted limits — not bugs

- Rule 3 fixture, 1 of 50: "delivered" vs "delivery" token mismatch, non-stemmed matching. Deliberate.
- `HomeLocationGate` story-field duplication. Known, deferred.
- Guest safety check on the static form. Deliberate tradeoff — worth reconfirming before a stranger uses the site.

---

## 10. Coverage

22 claim types against ~150 mapped scenarios. Batch 1 has two remaining: unpaid wages / final pay / commissions, and moving company disputes.

`jurisdictionRoutes.ts` has 3 entries; the roadmap identifies 16 forums that should be recognized. Out-of-scope routing is cheaper than sourced claim types and arguably as valuable — a user told "this belongs at the LTB" has been genuinely helped.

---

## Suggested order

**Before any real user:**
1. `ai-case-partner` auth and ownership (🔒)
2. Confirm and fix `case-summary` case-strength content
3. The three Small Claims Rules defects — `twentyDaysElapsed`, `defence-set-off-or-counterclaim`, r. 8.01(2)
4. `outOfScopeForums.ts` citations — either source them or remove the claims
5. **Walk through the site yourself.** Still hasn't happened. Nothing on this list substitutes for it.
6. Push.

**Then:**
7. Causation gap (Clements is ready)
8. Build the readiness gate and intake depth from the specs
9. Defamation and occupiers' liability from sources already retrieved
10. CJA s. 29 and the Small Claims statutory cluster
11. The leave requirement — verify, then fix the classifier if needed

**Ongoing, in parallel:** coverage expansion, out-of-scope routing, and the licensee conversation.
