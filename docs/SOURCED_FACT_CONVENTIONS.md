# Where verified facts live

**What this is:** the rule for deciding whether a fact you have just verified
belongs in a registry or in prose, and which registry shape to use. Written
after an audit found four parallel conventions that cannot see each other, and
one report that erased properly-sourced work because it searched only one of
them.

**Related:** `docs/SOURCING_NOTES.md` is how to *retrieve* a source. This file is
where the result *goes*.

---

## 1. The rule

> **A fact belongs in a registry when the product asserts it to a user, when
> code branches on it, or when a check must read it. Otherwise prose is fine.**
>
> **Prose is for reasoning about facts — why a design is shaped this way, what
> was ruled out, what could not be sourced. Prose may quote a registry entry. It
> must never be the only home of a fact the product asserts.**

### The corollary, which is the part that gets missed

**When a design doc verifies facts a planned build will assert, the registry
entries land with the doc, not with the build.**

The three tests above are about the *present*. A design doc is about the future,
so its facts fail all three tests on the day they are written and pass all three
a week later. Waiting means the build is authored against prose — and prose
carries no `verifiedAt`, so "authored against prose" means either re-verifying
every fact or, more likely, trusting a paragraph nobody can date.

This is not hypothetical. `docs/FAMILY_PROCEEDING_TYPES.md` verified roughly
twenty statutory provisions in one session — the CJA s. 21.8 Schedule, the
allocation between courts, the two Family Law Act definitions of "spouse" — and
recorded all of them as prose, because nothing read them yet. The registry
entries were added afterwards, in a separate pass, which is the cost this
corollary exists to avoid.

### What this rule does NOT say

It does not say every verified fact needs a registry entry. A fact established
only to rule something out — "CanLII blocks scraping", "no prescribing
regulation was located for Schedule item 7" — belongs in `SOURCING_NOTES.md` or
in the design doc's own "could not verify" section. Negative findings are prose.

---

## 2. The shapes, and which to use

There are four conventions in the repo today. Three are legitimate and serve
different jobs; the fourth is drift.

### `StatutoryProvision` — the TEXT of a provision

`src/lib/case-system/sources/statutoryProvisions.ts`.

Use when the product needs the provision's own words, or when a check must read
them. Carries `quote`, so nothing downstream can paraphrase; carries
`consolidationPeriod`, so a historical version cannot masquerade as current; and
carries `pendingReplacement`, so not-yet-in-force text cannot be cited by
mistake.

### `EducationCitation` — a POINTER to a source

`src/lib/case-system/intake/educationTopics.ts`.

`sourceName`, `officialUrl`, `verifiedAt`, optional `pinpoint`, optional
`notedUpAt`. Use when content needs a footnote rather than the words. This is
the repo's most widely adopted convention and the one `verifyIntakeCoverage`
enforces.

**These two compose; they do not compete.** A `StatutoryProvision` can yield an
`EducationCitation` for content that needs a footnote. Content that needs the
words takes the provision.

### `AuthorityMetadata` — a legal authority as an OBJECT

`src/lib/case-system/authority/authoritySourceSchema.ts`. Richer: binding level,
jurisdiction, court level, relationships between authorities. Legitimate for
what it does.

### Flat `sourceUrl: string` — drift, do not extend

`PlaintiffElement`, `DefendantConsideration`, `ProceduralNote`,
`DefenceConcept`, `questionBank`. A bare URL and nothing else — **no
`verifiedAt`**, so these cannot go stale because nothing tracks staleness. About
150 instances. New code should not use this shape; see OUTSTANDING_ISSUES.md for
what fixing the existing ones would take.

---

## 3. Rules that apply to every shape

**a. One name per concept.** `EducationCitation` calls it `officialUrl`;
everything else calls it `sourceUrl`. Same field, two names, so no single check
can see both. New code uses `sourceUrl`.

**b. Cite a URL that resolves to text.** `ontario.ca/laws/statute/<id>` and
`ontario.ca/laws/regulation/<id>` are the e-Laws viewer and return a JS shell
with no readable content. The fetching route is `ontario.ca/laws/docs/<id>_e.doc`
— see `SOURCING_NOTES.md`. `verifyIntakeCoverage.ts` rejects the viewer route.

**c. `verifiedAt` is not currency.** It records when *we* looked. What the
document says about *itself* — "CONSOLIDATION PERIOD: FROM ... TO THE E-LAWS
CURRENCY DATE" versus "HISTORICAL VERSION FOR THE PERIOD ..." — is a different
fact and belongs in `consolidationPeriod`. A correct `verifiedAt` on a
historical version is exactly how the Occupiers' Liability Act s. 6.1 error
happened.

**d. Vendor what a check must read.** A verification suite must not depend on a
live fetch: a network-dependent check passes silently when the network fails.
Copy the provision verbatim under `docs/sources/`, record provenance in that
folder's README, and point `vendoredIn` at it.

**e. Quote, never paraphrase, in a field typed as the source's own words.**
Form 35.1 shipped as "Parenting Time **and** Contact" against a regulation
saying "PARENTING TIME, CONTACT" because the field held a summary rather than a
quote.

---

## 4. Why parallel conventions are a correctness problem, not a tidiness one

A grep that finds *a* bad instance is not evidence there is no good one.

A report in this repo stated that mitigation was unsourced. The search matched
`mitigationIssues` in `doctrineSeedLibrary.ts`, found an unsourced sentence
there, and stopped. `DEFENCE_CONCEPTS` in `claimTypes.ts` — a different registry,
a different shape — held `defence-failure-to-mitigate`, properly sourced to
*Red Deer College v. Michaels* with a careful note about the limits of applying
an employment case outside employment. The report erased that work.

The same session reported that the repo did not cite O. Reg. 626/00 for the
$50,000 Small Claims limit. It does, in `verifiedAuthoritySeedRegistry.ts` — a
third registry, a fourth shape. That citation happens to use the non-resolving
viewer URL, so the finding survived in a narrower form, but the reasoning that
produced it was wrong.

Two errors, same cause: **a fact can be properly sourced in a registry the
search did not know to look in.** Converging the shapes is how that stops.

---

## 5. Checklist when you have just verified something

1. Will the product assert it, branch on it, or check it — now or in the build
   this doc is for? If no to all, prose.
2. Does anything need the provision's own **words**? → `StatutoryProvision`.
   Only a footnote? → `EducationCitation`.
3. Will a verification suite read it? → vendor it under `docs/sources/`, record
   provenance, set `vendoredIn`.
4. Record `verifiedAt` **and** `consolidationPeriod`. They are different facts.
5. Grep the source for `"On a day to be named"` before quoting. If present,
   declare `pendingReplacement`.
6. Use a `docs/` URL, not a viewer URL.
7. Before writing "X is not sourced", search every registry — not the first one
   that matches the word.
