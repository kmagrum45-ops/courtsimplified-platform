/**
 * Small Claims claim-type registry -- Phase 0 content foundation, the
 * unifying structure over the eventual Small Claims taxonomy (see
 * docs/AI_INTAKE_DESIGN.md). No AI reads or surfaces these yet; this is
 * sourced content only. Reuses `EducationCitation` from educationTopics.ts
 * rather than redefining it, and references `remedyTypes.ts` entries by id
 * rather than duplicating remedy content here.
 *
 * DRAFT wording -- every `plainExplanation` below is pending lawyer/
 * paralegal review before it ships, same convention as the rest of this
 * directory.
 *
 * `plaintiffElements` and `defendantConsiderations` describe what a person
 * bringing (or defending against) this kind of claim generally must show,
 * and what courts typically expect documented -- never "your facts meet
 * this." See docs/AI_INTAKE_DESIGN.md, "who does the applying" test.
 *
 * 3 claim types were built in the first session, to prove the schema
 * against real, verified sourcing:
 *   - Unpaid debt / non-payment for services (highest real-world volume)
 *   - Slip and fall / occupier's liability (business-defendant profile,
 *     Occupiers' Liability Act sourcing)
 *   - Improper or unauthorized towing (Towing and Storage Safety and
 *     Enforcement Act, 2021 -- a regulatory complaint path that runs
 *     alongside, not instead of, a Small Claims case)
 *
 * A second session added 5 more (still not the full ~20-entry taxonomy --
 * more is Session 3+):
 *   - Breach of contract -- goods (Sale of Goods Act implied conditions)
 *   - Non-payment for goods sold
 *   - Consumer Protection Act issue (misleading practices, withdrawal rights)
 *   - Damage caused by a contractor's work
 *   - Wrongful dismissal (within Small Claims' monetary jurisdiction)
 *
 * "Vehicle accident -- property damage only" was scoped for the second
 * session and cut. Ontario's direct-compensation property-damage (DC-PD)
 * insurance scheme is well documented in general terms, but the specific
 * angle a ClaimType needs -- how a not-at-fault driver recovers an
 * uninsured amount (like a deductible) from the at-fault driver directly,
 * in Small Claims Court -- wasn't confirmed after 5 tool calls (2 searches,
 * 3 fetches, including two wrong-regulation dead ends chasing the Fault
 * Determination Rules). Per this session's own stop condition, cut rather
 * than forced. Worth a fresh, narrower attempt in a later session.
 *
 * Session 18 ("batch 2") added 6 more, marked `status: "reviewed"` directly
 * (the site owner's own decision for this pre-launch product, same as
 * Session 13's questionBank.ts status flip -- not a claim that a licensee
 * has reviewed this wording):
 *   - Dog bite or attack (Dog Owners' Liability Act -- strict liability,
 *     avoids needing a general negligence-elements source the way slip-
 *     and-fall relies on the Occupiers' Liability Act instead)
 *   - Breach of contract -- services not performed or substandard (the
 *     reverse direction of the existing unpaid-debt/services entry: the
 *     customer suing over undone or substandard work, not the provider
 *     suing for non-payment)
 *   - Recovery of personal property wrongfully held by another (not a
 *     goods purchase or a tenancy -- e.g. a roommate or acquaintance
 *     refusing to return belongings)
 *   - Cancelled contract, deposit/payment not refunded (Consumer
 *     Protection Act cooling-off categories: door-to-door sales, gym/
 *     fitness memberships, new condos, payday loans, time shares)
 *   - Commercial (non-residential) tenancy dispute -- deliberately scoped
 *     to commercial leases, governed by the Commercial Tenancies Act, not
 *     the Residential Tenancies Act. This doesn't resolve
 *     docs/AI_INTAKE_DESIGN.md's still-open "LTB keyword matching" question
 *     (that's specifically about a *residential* tenancy that's ended),
 *     but it's the first content in this file giving the system a
 *     correctly-sourced way to recognize a tenancy dispute that
 *     unambiguously belongs in Small Claims rather than at the LTB.
 *   - Dishonoured (NSF) cheque -- named explicitly as its own example on
 *     ontario.ca's Small Claims Court overview, not folded into the
 *     existing unpaid-debt entry, since it's called out as its own
 *     category on the source itself.
 * No candidate was cut this session -- every one attempted was confirmed
 * with a direct fetch within 1-2 tool calls. A commercial-tenancy angle
 * was chosen specifically because it sidesteps the still-open residential/
 * LTB question rather than re-attempting the exact sourcing wall that
 * question already hit.
 *
 * Session 20 ("final batch") added 4 more, same `status: "reviewed"`
 * site-owner decision:
 *   - Unpaid overtime or vacation pay (Employment Standards Act) --
 *     scoped narrowly to overtime and vacation pay specifically, both
 *     directly confirmed, rather than a broader "unpaid wages" claim
 *     type whose general wage-payment page 404'd this session.
 *   - Vehicle repair dispute -- overcharge beyond the required estimate,
 *     or a repair failing within the minimum warranty (Consumer
 *     Protection Act's car-repair-shop rules).
 *   - Used vehicle purchase -- non-disclosure by a dealer (odometer,
 *     salvage/rebuilt status, prior use as a taxi/rental/police vehicle),
 *     with its 90-day cancellation right.
 *   - Unpaid condominium common expenses (Condominium Act, 1998, s.85 --
 *     fetched via the .doc fallback, same as the Dog Owners' Liability
 *     Act in the prior session).
 *
 * One candidate was cut, not for a failed search but a structural
 * mismatch: "debt collection agency harassment" has real, directly
 * confirmed ontario.ca sourcing (ontario.ca/page/stop-collection-agency-calls),
 * but describes a regulatory complaint against a collector, not an
 * independent Small Claims Court money claim a plaintiff would bring --
 * the same category of problem as the towing claim type's separate
 * regulatory-complaint note, except here there's no underlying monetary
 * claim to attach it to. A future session could still add it as a
 * defendant consideration on the existing unpaid-debt claim type, not as
 * its own ClaimType.
 *
 * Vehicle accident property damage was not re-attempted a third time.
 * Both prior cuts (Session 2's deductible-recovery angle, and the
 * reasoning above for why a residential-tenancy angle was avoided in
 * Session 18) trace to the same underlying wall: a car-to-car collision
 * claim needs general negligence elements to state who's at fault, and
 * neither ontario.ca nor ontariocourts.ca states those in the way
 * Occupiers' Liability or Dog Owners' Liability state a specific
 * statutory duty. Re-attempting would rediscover the identical wall, not
 * a new one -- logged here instead of spending tool calls confirming it
 * a third time.
 *
 * Session 37 re-attempted vehicle accident property damage, the one cut
 * this file just said would not be re-attempted a third time -- but the
 * thing that unblocked it wasn't a driving-specific duty-of-care source
 * (none was found; none exists in the way Occupiers' Liability states
 * one). It was reading Insurance Act s.263 directly (fetched
 * ontario.ca/laws/docs/90i08_e.doc, extracted with antiword since the
 * e-Laws viewer is JS-rendered) and finding the ORIGINAL blocking
 * question had a different answer than assumed. Session 2 was chasing
 * "how does a not-at-fault driver recover an uninsured amount (like a
 * deductible) from the at-fault driver directly" -- s.263(5)(a) says
 * that route doesn't exist: when BOTH vehicles are insured under a
 * DCPD-bound policy, an insured has NO right of action against the other
 * driver for vehicle damage at all, full stop -- the remedy is a
 * fault-based claim against their OWN insurer instead. The two prior
 * "wrong-regulation dead ends chasing the Fault Determination Rules"
 * make sense in hindsight: those rules only govern a dispute with your
 * own insurer under s.263(4), not a claim against the other driver.
 * The narrower route that IS real: s.263(1)(c) requires BOTH vehicles
 * insured for the bar to apply, so when the at-fault driver's vehicle
 * wasn't insured that way, s.263 never engages and the ordinary
 * negligence right of action against them survives. Built as
 * `sc-claim-vehicle-accident-uninsured-driver-property-damage`,
 * deliberately scoped to that situation, not "any car accident" --
 * asserting Small Claims as the normal route for vehicle collision
 * property damage generally would be false; s.263 is what most such
 * claims actually go through, and that's stated plainly in the entry's
 * own procedural notes rather than left implied. Also directly confirmed
 * and cited: since 2021, c. 40, Sched. 14, s. 4 (in force 01/01/2024),
 * an insured may elect not to claim direct compensation from their own
 * insurer -- but that election does not restore a right to sue the other
 * driver when s.263 otherwise applies, a distinction the entry states
 * explicitly rather than leaving room to misread the 2024 change as
 * reopening a route to the other driver.
 * Mustapha v. Culligan (educationTopics.ts's general-negligence-elements
 * topic, sourced this same session) supplies the general duty/breach/
 * damage/causation framework this entry's negligence elements reuse --
 * cited only for the GENERAL elements (paras 3, 4-5, 7, 11-13), never
 * stretched into a vehicle-specific duty or standard-of-care assertion,
 * consistent with that topic's own general-only scope limit.
 *
 * Session 26 sourced defamation, previously believed cut (no record of
 * that earlier attempt was actually found in this repo -- flagged, not
 * assumed -- but the two underlying questions were open regardless):
 *   1. Courts of Justice Act, R.S.O. 1990, c. C.43, s.23(1) grants Small
 *      Claims Court jurisdiction "in any action for the payment of
 *      money" up to the prescribed amount -- no cause-of-action carve-out
 *      for defamation. Jurisdiction here is remedy-based (money sought),
 *      not subject-matter-based, so a defamation claim within the $50,000
 *      limit is in scope.
 *   2. The Libel and Slander Act, R.S.O. 1990, c. L.12, ss.5-7 impose a
 *      6-week pre-action notice and a 3-month limitation period -- but
 *      only for libel "in a newspaper or in a broadcast" (both narrowly
 *      defined in s.1). This is NOT a general defamation-elements
 *      statute and doesn't apply to defamation generally (e.g. spoken
 *      slander, a private message, an ordinary social media post) --
 *      that falls back to the ordinary 2-year limitation period, same as
 *      every other claim type here. Whether any particular modern medium
 *      (a single social media post, a podcast, a blog) meets this Act's
 *      "newspaper" (published periodically, 12+ times a year) or
 *      "broadcast" (wireless/cable/fibre-optic dissemination) definition
 *      is a real interpretive question this content deliberately does
 *      NOT resolve -- stating the definitions and letting the reader (or
 *      a professional) apply them is the "who does the applying" line,
 *      not something to cross by asserting an answer.
 * The defamation elements come from Grant v. Torstar Corp., 2009 SCC 61,
 * para. 28 (vendored at docs/sources/grant-v-torstar-2009-SCC-61.pdf):
 * defamatory words, referring to the plaintiff, published to at least one
 * other person -- one plaintiffElement each, mirroring
 * civil-claim-defamation -- plus the two Libel and Slander Act procedural
 * facts above. (This replaced an earlier note that no elements framework
 * was sourced; the audit found Grant already vendored and cited here.)
 *
 * Sourcing note on statutes whose e-Laws page won't render (Occupiers'
 * Liability Act, Negligence Act, Sale of Goods Act all hit this): ontario.ca's
 * e-Laws statute viewer (ontario.ca/laws/statute/...) is a JS-rendered page
 * that returns an empty shell to a direct fetch. The same statutes are also
 * published as static, non-JS documents at ontario.ca/laws/docs/<id>.doc
 * (still the ontario.ca domain, just a different rendering path), which
 * fetch cleanly -- used for every citation to one of these three statutes
 * below. This isn't a workaround -- it's the same statutory text, the same
 * domain, a fetchable format instead of one this tooling can't render.
 *
 * Session 38 sourced "personal loan between individuals" (docs/
 * SMALL_CLAIMS_TAXONOMY_ROADMAP.md's Batch 1 item 2), per docs/
 * SOURCING_NOTES.md's now-standing instruction to check it first --
 * nothing there was specific to loans, but the .doc-fallback technique it
 * records applied directly again here. The generic "agreement existed" /
 * "amount owed" proof-burden framing already reused across this file
 * covers enforceability of an informal or oral loan without needing new
 * sourcing. The two genuinely distinct wrinkles worth sourcing precisely,
 * both read directly from the Limitations Act, 2002 (fetched
 * ontario.ca/laws/docs/02l24_e.doc, extracted with antiword):
 *   1. s.5(3)-(4): for a loan with no fixed repayment date (one repayable
 *      "on demand," the common shape for an informal loan between
 *      individuals), the 2-year clock starts on the first day the
 *      borrower fails to repay AFTER a demand is made -- not on the day
 *      the money was originally lent. Applies only to demand obligations
 *      created on or after January 1, 2004; not asserted for anything
 *      older than that.
 *   2. s.13(1)/(10)/(11): a written, SIGNED acknowledgment of the debt,
 *      or a partial payment toward it, restarts the limitation clock as
 *      of that date -- an oral acknowledgment alone does not. Directly
 *      relevant to informal loans, where a partial repayment years later
 *      is common and easy to overlook as a limitation-relevant fact.
 * "Gift vs. loan" (flagged in the taxonomy roadmap as a related, separate
 * scenario) was deliberately NOT given its own sourced legal test --
 * that distinction is equity/case-law territory (presumption of
 * advancement, resulting trust), not stated plainly on any approved
 * domain. Handled instead, honestly, as exactly what it structurally is:
 * a dispute about whether a repayment obligation existed at all, already
 * covered by the existing generic `defence-no-agreement-existed` concept
 * and this entry's own `argues-it-was-a-gift` defendantConsideration,
 * neither of which asserts a legal test for telling a gift from a loan.
 *
 * Session 39 attempted bailment (Batch 1 item 3) and deliberately built a
 * NARROWER thing instead. Bailment's defining feature -- a reversed onus,
 * where a bailee who can't explain how a loss happened may be found
 * liable without the owner having to prove exactly what went wrong -- is
 * genuinely common-law, not stated on any approved-domain self-help page.
 * Two real, on-point, named authorities were found (Punch v. Savoy's
 * Jewellers Ltd., ONCA 1986, and Ferguson v. Birchmount Boarding Kennels
 * Ltd., 2006 CanLII 2049 (ON SCDC) -- the latter literally a pet-boarding
 * Small Claims case on appeal), but neither could be retrieved: CanLII
 * returned HTTP 403 on both the `.html` and `.pdf` paths (confirmed
 * directly, not assumed), and unlike Mustapha, no copy already existed
 * under docs/sources/ to read instead. Citing either from the secondary
 * case-brief summaries that DID return is exactly the case-law-synthesis-
 * from-a-secondary-source risk docs/SOURCING_NOTES.md already flags as
 * excluded -- not done. `sc-claim-property-damaged-lost-in-business-care`
 * is the honest fallback: the same fact pattern (property left with a
 * business, comes back damaged or doesn't come back), framed as ORDINARY
 * negligence using Mustapha's already-sourced general elements (same
 * citations, same paragraphs, as the vehicle-accident and personal-loan
 * entries), with NO reversed onus asserted -- a proceduralNote says so
 * explicitly, naming bailment as a distinct, real, unsourced-here doctrine
 * a professional could speak to, rather than silently omitting it. This
 * is deliberately not named "bailment" anywhere in the entry's id or
 * name, to avoid the wording itself implying a doctrine this content
 * doesn't actually assert.
 *
 * Session 43 closed the `DEFENCE_CONCEPTS` "mitigation" gap this file
 * used to log as cut (see that array's own doc comment) -- sourced from
 * Red Deer College v. Michaels, [1976] 2 S.C.R. 324. Wired into 14 of
 * the 22 claim types' `applicableDefenceConceptIds` -- every one whose
 * remedy is genuinely DAMAGES for a loss (personal injury, property
 * damage, cost of substitute performance), where a plaintiff's duty to
 * take reasonable steps to limit that loss is a real, applicable
 * concept. Deliberately left off the other 8, all of which seek a fixed,
 * already-quantified DEBT rather than damages for a loss -- an unpaid
 * invoice or the agreed price for goods already delivered
 * (unpaid-debt-services, non-payment-goods-sold), a specific refund or
 * deposit (consumer-cancellation-refund), the face amount of a bounced
 * cheque (dishonoured-nsf-cheque), a statutory wage entitlement
 * (unpaid-overtime-vacation-pay), a lien for a fixed common-expense
 * arrears amount (unpaid-condo-common-expenses), a loan's outstanding
 * principal (personal-loan-between-individuals), or the return of a
 * specific item rather than compensation for its loss (recovery-of-
 * personal-property) -- mitigation doctrine doesn't attach to a debt
 * claim the way it attaches to a damages claim; there is no "loss" for
 * the plaintiff to have mitigated, only a sum already owed. Not a
 * blanket application -- a genuine, claim-type-by-claim-type judgment
 * call, recorded here so a future session doesn't have to re-derive it.
 */

import type { EducationCitation } from "./educationTopics";
import type { CourtArea } from "./questionBank";

import { MORE_SMALL_CLAIMS_TYPES } from "./moreClaimTypes";

export type EvidenceCategory = {
  name: string;
  why: string;
  examples: string[];
};

/**
 * A further source for part of an entry's text, beside its main sourceUrl.
 * Added 2026-09-30 for entries whose wording rests on two instruments -- the
 * Small Claims guide for the $50,000 limit AND O. Reg. 626/00 that prescribes
 * it, or Clements for factual causation AND Mustapha for remoteness. The
 * pinpoint is also named inline in the text, so a user sees it wherever the
 * text is shown; this field is what a check can read.
 */
export type SourceRef = {
  sourceUrl: string;
  pinpoint: string;
};

export type PlaintiffElement = {
  id: string;
  name: string;
  plainExplanation: string;
  sourceUrl: string;
  evidenceCategories: EvidenceCategory[];
  /**
   * OPTIONAL, and the optionality is the point: a verifiedAt that was not
   * verified is worse than none, because it converts an unknown into a false
   * assurance.
   *
   * Since 2026-09-30 a date means something checkable. All 146 entries were
   * read against their sources that day (86 corrected); each dated entry has a
   * record in docs/sources/catalogue-verification.json with the passages it
   * rests on and a fingerprint of the verified text, and
   * `npm run test:catalogue-verified` fails if the text changes without being
   * re-verified. The two entries that could not be checked are undated and
   * listed there as unverifiable. See scripts/content/catalogueVerification.ts.
   *
   * consolidationPeriod is what the SOURCE says about itself, not when we
   * looked. See docs/SOURCED_FACT_CONVENTIONS.md.
   */
  verifiedAt?: string;
  consolidationPeriod?: string;
  alsoCites?: SourceRef[];
};

export type DefendantConsideration = {
  id: string;
  name: string;
  plainExplanation: string;
  whenThisComesUp: string;
  sourceUrl: string;
  verifiedAt?: string;
  consolidationPeriod?: string;
  alsoCites?: SourceRef[];
};

export type ProceduralNote = {
  note: string;
  sourceUrl: string;
  verifiedAt?: string;
  consolidationPeriod?: string;
  alsoCites?: SourceRef[];
};

/**
 * A defence concept that applies across multiple claim types -- defined
 * once here, referenced by ClaimType.applicableDefenceConceptIds, never
 * duplicated per claim type. Same non-duplication principle as
 * remedyTypes.ts.
 *
 * All 6 originally-scoped concepts are now here. "Mitigation" (`defence-
 * failure-to-mitigate`) was the last one -- cut early on (no page on
 * ontario.ca/ontariocourts.ca/ontariocourtforms.on.ca states a mitigation-
 * duty rule; every source found back then was case-law synthesis, which
 * CLAUDE.md's sourcing rule excluded under the old 3-domain-only
 * standard). Closed in Session 43 the same way the negligence-elements
 * and unjust-enrichment gaps were: a real SCC decision, read directly,
 * under CLAUDE.md's rewritten verifiability standard -- Red Deer College
 * v. Michaels, [1976] 2 S.C.R. 324 (docs/sources/, retrieved via the
 * decisions.scc-csc.ca HTML-fallback route since the PDF has no text
 * layer). See that entry's own inline comment for the exact holding and
 * pinpoints.
 */
export type DefenceConcept = {
  id: string;
  name: string;
  plainExplanation: string;
  sourceUrl: string;
  reviewedAt: string | null;
  status: "draft" | "reviewed";
  verifiedAt?: string;
  consolidationPeriod?: string;
  alsoCites?: SourceRef[];
};

export const DEFENCE_CONCEPTS: DefenceConcept[] = [
  {
    id: "defence-limitation-period-expired",
    name: "Limitation period expired",
    plainExplanation:
      "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding cannot " +
      "be started after the second anniversary of the day the claim was discovered. Section 5(1) says " +
      "when a claim is discovered: the earlier of the day the person first knew that the injury, loss " +
      "or damage had occurred, that it was caused or contributed to by an act or omission, that the act " +
      "or omission was that of the person the claim is against, and that, having regard to the nature " +
      "of the injury, loss or damage, a proceeding would be an appropriate means to seek to remedy it " +
      "-- and the day a reasonable person with their abilities and in their circumstances first ought " +
      "to have known those things. Under s. 5(2), a person with a claim is presumed to have known of " +
      "those matters on the day the act or omission the claim is based on took place, unless the " +
      "contrary is proved.",
    sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
    verifiedAt: "2026-09-30",
    consolidationPeriod: "2024-12-04",
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "defence-no-agreement-existed",
    name: "No agreement existed",
    plainExplanation:
      "The person bringing a claim generally has the burden of proving their allegations on a " +
      "balance of probabilities -- including that an agreement or understanding actually existed " +
      "in the first place. If that's disputed, it becomes one of the facts the plaintiff has to " +
      "establish with evidence, not something assumed true by default.",
    sourceUrl:
      "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
    verifiedAt: "2026-09-30",
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "defence-set-off-or-counterclaim",
    name: "Set-off or counterclaim",
    plainExplanation:
      "SET-OFF: under s. 111 of the Courts of Justice Act, in an action for payment of a debt, the " +
      "defendant may, by way of defence, claim the right to set off against the plaintiff's claim a " +
      "debt owed by the plaintiff to the defendant. Mutual debts may be set off against each other " +
      "even if they are of a different nature, and if a larger sum is found due from the plaintiff to " +
      "the defendant, the defendant is entitled to judgment for the balance. COUNTERCLAIM: separately, " +
      "a defendant can bring their own claim as part of the same case, called a Defendant's Claim " +
      "(Form 10A). Under rule 10.01(1) it may be made against the plaintiff, or against another person " +
      "where the claim arises out of the transaction or occurrence relied on by the plaintiff or is " +
      "related to the plaintiff's claim. The Rules say it may be ISSUED within 20 days after the day " +
      "the defence is filed. Issuing and filing are different steps: a claim is issued by the court, " +
      "and the 20 days runs from the day the defence was filed, not from when it was served or " +
      "received. Missing that window does not end it. After those 20 days a Defendant's Claim may " +
      "still be issued WITH LEAVE OF THE COURT -- permission the court gives -- at any point before " +
      "trial or default judgment. After trial or default judgment, that route is no longer available. " +
      "Once issued, it still has to be served on every person it is made against, and the same " +
      "six-month service window that applies to a plaintiff's claim applies to it -- although the " +
      "court may extend the time for service, before or after the six months has elapsed (rule " +
      "8.01(2)). How the 20 days is counted: the Rules count time by excluding the first day and " +
      "including the last, and if the last day falls on a holiday the period ends on the next day that " +
      "is not a holiday. \"Holiday\" is defined to include any Saturday or Sunday, so intervening " +
      "weekends are counted and do not extend the period -- only the last day moves.",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
    verifiedAt: "2026-09-30",
    consolidationPeriod: "2025-10-14",
    alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/90c43_e.doc", "pinpoint": "Courts of Justice Act, s. 111"}],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "defence-waiver-release-assumption-of-risk",
    name: "Waiver, release, or assumption of risk",
    plainExplanation:
      "Under the Occupiers' Liability Act, an occupier's duty to take reasonable care to see that " +
      "people entering the premises, and property they bring, are reasonably safe (s. 3(1)) does not " +
      "apply to risks willingly assumed by the person who enters on the premises (s. 4(1)) -- but in " +
      "that case the occupier still owes a duty not to create a danger with the deliberate intent of " +
      "doing harm or damage to the person or their property, and not to act with reckless disregard of " +
      "the presence of the person or their property. Separately, under s. 3(3) the duty applies except " +
      "so far as the occupier is free to and does restrict, modify or exclude it, and under s. 5(3) an " +
      "occupier who is free to do so must take reasonable steps to bring the restriction, modification " +
      "or exclusion to the person's attention. Section 4 also DEEMS some people to have willingly " +
      "assumed all risks, so that only that lower duty is owed to them: a person on premises intending " +
      "to commit, or committing, a criminal act (s. 4(2)); and a person entering premises listed in s. " +
      "4(4) -- rural premises used for agriculture, vacant or undeveloped, or forested or wilderness; " +
      "golf courses when not open for playing; utility rights-of-way and corridors; unopened road " +
      "allowances; private roads and recreational trails reasonably marked by notice as such; and " +
      "portage routes -- where entry is prohibited under the Trespass to Property Act, where the " +
      "occupier has posted no notice about entry and has not otherwise expressly permitted it, or " +
      "where entry is for a recreational activity, no fee is paid (apart from listed exceptions) and " +
      "the occupier is not providing the person with living accommodation (s. 4(3)). These provisions " +
      "concern occupiers of premises.",
    sourceUrl: "https://www.ontario.ca/laws/docs/90o02_e.doc",
    verifiedAt: "2026-09-30",
    consolidationPeriod: "2021-01-29",
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "defence-contributory-negligence",
    name: "Contributory negligence",
    plainExplanation:
      "Under s. 3 of Ontario's Negligence Act, in an action for damages that is founded on the fault " +
      "or negligence of the defendant, if fault or negligence is found on the part of the plaintiff " +
      "that contributed to the damages, the court apportions (divides) the damages in proportion to " +
      "the degree of fault or negligence found against each party. For a dog bite or attack, the Dog " +
      "Owners' Liability Act has its own rule: the owner's liability does not depend on the owner's " +
      "fault or negligence, but the court reduces the damages in proportion to the degree, if any, to " +
      "which the plaintiff's fault or negligence caused or contributed to them (s. 2(3)).",
    sourceUrl: "https://www.ontario.ca/laws/docs/elaws_statutes_90n01_e.doc",
    verifiedAt: "2026-09-30",
    consolidationPeriod: "2004-01-01",
    alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/90d16_e.doc", "pinpoint": "Dog Owners' Liability Act, s. 2(3)"}],
    reviewedAt: null,
    status: "draft",
  },
  {
    // Session 43. Sourced from Red Deer College v. Michaels, [1976] 2
    // S.C.R. 324 (docs/sources/red-deer-college-v-michaels-1976-2-SCR-324.pdf,
    // a scanned PDF with no text layer -- read via the HTML-fallback
    // route per docs/SOURCING_NOTES.md, at
    // decisions.scc-csc.ca/scc-csc/scc-csc/en/item/2693/index.do?iframe=true).
    // The 6-judge majority (Laskin C.J., Martland, Spence, Beetz JJ.)
    // states the general rule at pp. 330-332: it is for the defendant to
    // carry the burden of showing the plaintiff could reasonably have
    // avoided part of the loss, quoting Williston on Contracts with
    // approval that the defendant must show the plaintiff "either found,
    // or, by the exercise of proper industry in the search, could have
    // procured other employment ... reasonably adapted to his abilities"
    // -- both prongs (failure to act reasonably, AND that acting
    // reasonably would actually have reduced the loss) are the
    // defendant's to prove, and that burden "is by no means a light
    // one." De Grandpré J., concurring in the result, answers the
    // certified question directly at pp. 346-347: "the onus ... is on
    // the defaulting employer." This is a wrongful-dismissal case, but
    // the rule it states -- who bears the burden on an alleged failure
    // to mitigate -- is the general contract-damages principle, not
    // limited to employment; stated generally below, not tied to that
    // one fact pattern.
    id: "defence-failure-to-mitigate",
    name: "Failure to mitigate",
    plainExplanation:
      "A plaintiff generally cannot recover for a loss they could reasonably have avoided -- but the " +
      "burden of proving a failure to do so rests on the defendant, not the plaintiff. A defendant " +
      "who argues the plaintiff should have taken steps to reduce their losses generally has to prove " +
      "both that the plaintiff failed to take those reasonable steps, and that taking them would " +
      "actually have reduced the loss. " +
      "A note on where this comes from: the case this is sourced to is a wrongful-dismissal case, and " +
      "the Supreme Court of Canada stated the rule there in employment terms -- whether the dismissed " +
      "employee could, with proper effort, have found other suitable work. The burden principle it " +
      "sets out is a general contract-damages one, but how mitigation applies outside employment (to " +
      "damaged property, for instance, or to reputation) is not something that case decides, and is " +
      "not stated here.",
    sourceUrl: "https://www.canlii.org/en/ca/scc/doc/1975/1975canlii15/1975canlii15.html",
    verifiedAt: "2026-09-30",
    reviewedAt: null,
    status: "draft",
  },
];

export type ClaimType = {
  id: string;
  name: string;
  courtArea: CourtArea;
  plaintiffElements: PlaintiffElement[];
  defendantConsiderations: DefendantConsideration[];
  /** DefenceConcept ids from DEFENCE_CONCEPTS above -- referenced, not duplicated. */
  applicableDefenceConceptIds: string[];
  /** RemedyTopic ids from remedyTypes.ts -- referenced, not duplicated. */
  remedies: string[];
  proceduralNotes: ProceduralNote[];
  /** Fact-pattern cues for later extraction matching. No AI here -- just data. */
  signals: string[];
  /**
   * 2026-09-28. Plain words for WHICH SIDE brings this claim -- the customer
   * or the provider, the buyer or the seller, the lender, the employee. Not a
   * legal statement: it says who is typically the plaintiff, so the
   * classifier can tell a customer suing a contractor apart from a contractor
   * suing for payment. Those two share almost every word ("hired", "work",
   * "paid", "finish"), and without this a customer's story about a contractor
   * who quit was classified as the contractor's unpaid-debt claim.
   */
  broughtBy: string;
  typicalDefendantProfile: "individual" | "business" | "either";
  /** Non-empty tuple, compile-time enforced -- same pattern as educationTopics.ts. */
  citations: [EducationCitation, ...EducationCitation[]];
  reviewedAt: string | null;
  status: "draft" | "reviewed";
};

const CORE_CLAIM_TYPES: ClaimType[] = [
  {
    id: "sc-claim-unpaid-debt-services",
    name: "Unpaid debt or non-payment for services",
    broughtBy: "The person or business that did the work, provided the service, or is owed the money, and has not been paid. Not the customer who paid for work that went wrong.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "existed-agreement-or-understanding",
        name: "An agreement or understanding for payment existed",
        plainExplanation:
          "The Superior Court of Justice's guide to the steps in a civil case says that in every civil " +
          "case the plaintiff has the burden of proof to establish, on a balance of probabilities, the " +
          "allegations in their claim -- evidence showing that, more likely than not, it would be " +
          "correct to rule in their favour. This part of the checklist is about what was agreed about " +
          "payment, and the records that show it.",
        sourceUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Written agreement or contract",
            why: "Directly shows what was agreed to.",
            examples: ["Signed contract", "Email or text agreeing to terms", "Invoice with accepted terms"],
          },
          {
            name: "Communication showing the understanding",
            why: "Supports an unwritten or informal agreement.",
            examples: ["Text messages", "Emails", "Messaging app conversations"],
          },
        ],
      },
      {
        id: "services-or-money-provided",
        name: "Services were provided, or money was loaned or is owed",
        plainExplanation:
          "Ontario's Small Claims Court guide says the court \"can handle any action for the payment of " +
          "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
          "excluding interest and costs such as court fees\", and that the reasons for a claim should " +
          "\"give a full explanation of what happened, including the dates and places and nature of the " +
          "occurrences involved.\" This part of the checklist is about the work or service that was " +
          "done, or the money that was advanced, and the records that show it.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Proof the work or service happened",
            why: "Shows the basis for the amount claimed.",
            examples: ["Photos of completed work", "Delivery confirmation", "Sign-off or acceptance message"],
          },
          {
            name: "Proof money changed hands (for a loan)",
            why: "Shows the amount was actually advanced.",
            examples: ["Bank transfer records", "E-transfer confirmation", "Receipt"],
          },
        ],
      },
      {
        id: "amount-unpaid",
        name: "The amount claimed is accurate and remains unpaid",
        // Session 48: was "...part of what the court will expect to see
        // documented...". Two problems, surfaced when the readiness gate ran
        // the case-strength validator over the element text it forwards:
        //   1. "court will expect" is a judge prediction. CLAUDE.md section 3
        //      bars those and BLOCKED_TERMS already catches the phrase. This
        //      was the ONLY plaintiffElement in the repo tripping it. Note it
        //      survived earlier passes because the phrase is split across two
        //      concatenated source lines, so a grep for it finds nothing --
        //      only the runtime string trips the validator.
        //   2. The cited source does not support it. Re-read 2026-09-12: the
        //      guide says "Fill in the amount that you are claiming", and that
        //      the $50,000 limit excludes "interest and costs such as court
        //      fees". It describes what a claim sets out, not what a court
        //      will expect.
        // Reworded to what the source actually says. The legal proposition is
        // unchanged; only the predictive framing is removed.
        plainExplanation:
          "Ontario's Small Claims Court guide says to \"fill in the amount that you are claiming\" and, " +
          "in the reasons, to \"calculate and explain the amount of money and any interest you are " +
          "claiming.\" Interest is asked for in the claim itself: the claim form has a place for the " +
          "pre-judgment interest rate claimed and the amount due up to the date the claim is filed. The " +
          "$50,000 limit does not count interest and costs such as court fees. This part of the " +
          "checklist is about the amount owed, how it is calculated, and what has not been paid.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Invoice or statement of account",
            why: "Shows exactly how the amount was calculated.",
            examples: ["Itemized invoice", "Statement of account", "Payment history/ledger"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-quality-or-completion",
        name: "The defendant disputes the work was completed or done properly",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a defendant who wishes to dispute the claim serves " +
          "the Defence on every other party and files it, with proof of service, within 20 days of " +
          "being served with the claim. This topic is about a Defence whose reasons dispute that the " +
          "work was finished, or that it was done as agreed.",
        whenThisComesUp: "When the defendant has filed a Defence (Form 9A) raising quality or completion issues.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: "This kind of claim is started with a Plaintiff's Claim (Form 7A).",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
      },
    ],
    signals: [
      "didn't pay for services",
      "unpaid invoice",
      "hired someone and they didn't finish",
      "owes me money",
      "non-payment",
      "invoice not paid",
      // Session 48: "loan not repaid" and "won't pay me back for the loan"
      // removed from here. They are loan wording, and they SHADOWED
      // sc-claim-personal-loan-between-individuals: a story using either
      // phrase matched this claim type instead of the personal-loan one,
      // even though personal-loan is the apter fit and carries its own
      // sourced elements. Measured before removal:
      //   "The loan not repaid is now six months overdue."  -> debt/services
      //   "He won't pay me back for the loan I gave him."   -> debt/services
      // Personal-loan keeps "never repaid the loan" and
      // "won't pay back the money i lent", which cover the same ground.
      "haven't paid me for the work",
      "still hasn't paid me for the job",
      "refuses to settle the balance",
      "won't pay me what they owe for the work",
      "hasn't paid me a cent",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a Claim",
        officialUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-08-31",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-claim-slip-and-fall-occupier-liability",
    name: "Slip and fall / occupier's liability",
    broughtBy: "The person who was hurt on someone else's property.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "defendant-was-occupier",
        name: "The defendant was the occupier of the premises",
        plainExplanation:
          "Under the Occupiers' Liability Act, the duty of care is owed by the \"occupier\" of the " +
          "premises. Section 1 says an occupier includes a person in physical possession of the " +
          "premises, or a person who has responsibility for and control over the condition of the " +
          "premises or the activities carried on there, or control over the persons allowed to enter -- " +
          "even where there is more than one occupier of the same premises.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90o02_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2021-01-29",
        evidenceCategories: [
          {
            name: "Proof of who controls the property",
            why: "Establishes who the correct defendant is.",
            examples: ["Business name/signage at the location", "Lease or ownership record", "Website or receipt showing the business name"],
          },
        ],
      },
      {
        id: "premises-not-reasonably-safe",
        name: "The premises were not kept reasonably safe",
        plainExplanation:
          "Under s. 3(1) of the Occupiers' Liability Act, an occupier owes a duty to take such care as " +
          "in all the circumstances is reasonable to see that people entering the premises, and their " +
          "property, are reasonably safe. Under s. 3(2), this applies whether the danger is caused by " +
          "the condition of the premises or by an activity carried on there. The statute states the " +
          "duty in the abstract; the Supreme Court of Canada, in Waldick v. Malcolm, [1991] 2 S.C.R. " +
          "456, considered what it required in one case about snow and ice. There, a visitor fell on an " +
          "icy, unsanded parking area. The Court agreed with the lower courts that the occupiers " +
          "breached s. 3(1) by doing nothing to make the parking area entrance less slippery. The lower " +
          "courts had said the Act did not require salting or sanding \"every square inch\" of the " +
          "parking area, only the part next to the entrance that the occupiers knew visitors would use, " +
          "and had stressed that sand and salt are not expensive and are readily available. The Court " +
          "said local custom is one circumstance that can inform what is reasonable, but that a " +
          "customary practice which is unreasonable in itself does not oust the duty: \"no amount of " +
          "general community compliance will render negligent conduct 'reasonable ... in all the " +
          "circumstances'.\" What reasonable care required there is not a rule about what it requires " +
          "everywhere -- the statutory test is what is reasonable in all the circumstances of the " +
          "particular case.",
        sourceUrl: "docs/sources/waldick-v-malcolm-1991-2-SCR-456.pdf",
        verifiedAt: "2026-09-30",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/90o02_e.doc", "pinpoint": "Occupiers' Liability Act, s. 3(1)-(2)"}],
        evidenceCategories: [
          {
            name: "Photos or video of the condition",
            why: "Directly documents the hazard.",
            examples: ["Photo of the ice, spill, or defect", "Security or phone video", "Photos taken shortly after the incident"],
          },
          {
            name: "Records of the condition being known or reported",
            why: "Speaks to whether the hazard was something the occupier could have addressed.",
            examples: ["Incident report filed with the business", "Prior complaints", "Maintenance/inspection logs, if obtainable"],
          },
        ],
      },
      {
        id: "injury-and-connection",
        name: "The unsafe condition caused an injury or loss",
        plainExplanation:
          "In negligence cases generally, the Supreme Court of Canada has said a plaintiff must show " +
          "that the damage was caused, in fact and in law, by the defendant's breach (Mustapha v. " +
          "Culligan of Canada Ltd., 2008 SCC 27, para. 3). The Occupiers' Liability Act sets out the " +
          "occupier's duty of care (s. 3(1)) but does not itself set out a test for causation, and " +
          "neither decision described here was an occupiers' liability case. In Clements v. Clements, " +
          "2012 SCC 32 (paras. 8-9), the Court said the factual part is generally tested with the \"but " +
          "for\" test -- the plaintiff must show, on a balance of probabilities, that the injury would " +
          "not have occurred but for the defendant's negligent act. That is a factual inquiry, applied " +
          "in a robust, common-sense way: scientific evidence of precisely how much the defendant's " +
          "negligence contributed is not required. The legal part -- remoteness -- asks, in the words " +
          "of Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, whether \"the harm [is] too unrelated to " +
          "the wrongful conduct to hold the defendant fairly liable\"; a harm is reasonably foreseeable " +
          "if it is a \"real risk\" -- one that would occur to the mind of a reasonable person in the " +
          "defendant's position and that they would not \"brush aside as far-fetched\" (paras. 12-13). " +
          "See \"The elements of a negligence claim\" for the fuller general framework this draws from.",
        sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2012/2012scc32/2012scc32.html",
        verifiedAt: "2026-09-30",
        alsoCites: [{"sourceUrl": "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html", "pinpoint": "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, paras. 11-13"}, {"sourceUrl": "https://www.ontario.ca/laws/docs/90o02_e.doc", "pinpoint": "Occupiers' Liability Act, s. 3(1)"}],
        evidenceCategories: [
          {
            name: "Medical records",
            why: "Documents the injury and when it was first treated.",
            examples: ["Emergency room or clinic records", "Physiotherapy or specialist records", "Photos of visible injuries"],
          },
          {
            name: "Witness accounts",
            why: "Supports that the fall happened at that location, in that way.",
            examples: ["Names/contact info of anyone who saw it happen", "Written witness statements"],
          },
        ],
      },
      // Page review, 2026-10-06: the site owner's own ice-slip story was never
      // asked whether written notice had gone to the store, though the claim
      // cannot be brought without it (subject to s. 6.1 (5)-(6)).
      {
        id: "notice-if-snow-or-ice",
        name: "If the injury was caused by snow or ice, written notice was given within 60 days after the injury",
        plainExplanation:
          "Under s. 6.1(1) of the Occupiers' Liability Act, no action for damages for personal injury " +
          "caused by snow or ice can be brought against an occupier, or an independent contractor the " +
          "occupier hired to remove snow or ice on the premises during the period when the injury " +
          "happened (s. 6.1(2)), unless written notice of " +
          "the claim, including the date, time and location of the occurrence, was personally served on " +
          "or sent by registered mail to at least one of them within 60 days after the injury. Under " +
          "s. 6.1(6), failing to give the notice, or giving one that is insufficient, is not a bar to the " +
          "action if a judge finds there is a reasonable excuse and that the defendant is not prejudiced " +
          "in its defence. Under s. 6.1(5), failing to give the notice is not a bar to the action where the " +
          "injured person died as a result of the injury.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90o02_e.doc",
        verifiedAt: "2026-10-06",
        consolidationPeriod: "2021-01-29",
        evidenceCategories: [
          {
            name: "Copy of the written notice sent",
            why: "Shows the notice step was taken, when, and how it was delivered, if this notice requirement applies.",
            examples: ["Copy of the notice letter", "Registered mail receipt", "Record of who it was handed to and when"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "duty-restricted-by-contract",
        name: "The occupier's duty was restricted or excluded by contract",
        plainExplanation:
          "Under s. 3(3) of the Occupiers' Liability Act, the occupier's duty of care applies except so " +
          "far as the occupier is free to, and does, restrict, modify or exclude it. The Act adds two " +
          "limits: under s. 5(1), the duty cannot be restricted or excluded by a contract the injured " +
          "person was not a party to, and under s. 5(3), an occupier who is free to restrict the duty " +
          "must take reasonable steps to bring that restriction to the person's attention.",
        whenThisComesUp: "When the plaintiff signed a waiver, release, or contract with the occupier before the incident.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90o02_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2021-01-29",
      },
      {
        id: "risk-willingly-assumed",
        name: "The occupier argues the person willingly assumed the risk",
        plainExplanation:
          "Section 4(1) of the Occupiers' Liability Act lowers the duty owed to a person who willingly " +
          "assumes the risks of entering the premises. The Supreme Court of Canada has held that this " +
          "phrase carries the volenti non fit injuria doctrine, not a looser \"they knew it was icy\" " +
          "standard: it requires not only knowledge of the risk, but consent to the LEGAL risk -- a " +
          "waiver of the legal rights that might arise from the harm. Simply being aware of a hazard " +
          "and walking on anyway is not, on its own, willing assumption of risk under this section. " +
          "Separately, the Act DEEMS some entrants to have willingly assumed all risks: under s. 4(2), " +
          "a person on premises with the intention of committing, or in the commission of, a criminal " +
          "act; and under s. 4(3)-(4), a person entering certain listed premises (such as agricultural, " +
          "vacant or forested rural premises, golf courses when not open for playing, utility " +
          "rights-of-way, unopened road allowances, private roads and recreational trails reasonably " +
          "marked by notice as such, and portage routes) where the entry is prohibited under the " +
          "Trespass to Property Act, where the occupier has posted no notice about entry and has not " +
          "otherwise expressly permitted it, or where the entry is for a recreational activity, no fee " +
          "is paid for it and the occupier is not providing living accommodation. In each of those " +
          "cases the reduced duty in s. 4(1) applies: not to create a danger with the deliberate " +
          "intent of doing harm, and not to act with reckless disregard of the person's presence.",
        whenThisComesUp: "When the Defence says the person could see the hazard and chose to proceed anyway, or that the person was on the premises in one of the situations s. 4(2)-(4) describes.",
        sourceUrl: "docs/sources/waldick-v-malcolm-1991-2-SCR-456.pdf",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/90o02_e.doc", "pinpoint": "Occupiers' Liability Act, s. 4(1)-(4)"}],
        verifiedAt: "2026-09-30",
      },
    ],
    applicableDefenceConceptIds: [
      "defence-failure-to-mitigate",
      "defence-waiver-release-assumption-of-risk",
      "defence-contributory-negligence",
      "defence-limitation-period-expired",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "cannot be started after the second anniversary of the day the claim was discovered. Section " +
          "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
          "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
          "omission, that the act or omission was that of the person the claim is against, and that, " +
          "having regard to the nature of the injury, loss or damage, a proceeding would be an " +
          "appropriate means to seek to remedy it -- and the day a reasonable " +
          "person with their abilities and in their circumstances first ought to have known those " +
          "things. Under s. 5(2), a person with a claim is presumed to have known of those matters on " +
          "the day the act or omission the claim is based on took place, unless the contrary is proved. " +
          "For an injury caused by snow or ice, the Occupiers' Liability Act adds a much shorter " +
          "written-notice requirement -- see the next note.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
      {
        note:
          "Under s. 6.1 of the Occupiers' Liability Act, where personal injury was caused by snow or " +
          "ice, no action for damages may be brought against an occupier, or an independent contractor " +
          "the occupier employed to remove snow or ice on the premises during the relevant period, " +
          "unless written notice of the claim -- including the date, time and location -- was " +
          "personally served on, or sent by registered mail to, at least one of them within 60 days " +
          "after the injury. Notice is not required if the injured person died as a result of the " +
          "injury, and missing or insufficient notice is not a bar to the action if a judge finds " +
          "that there is a reasonable excuse for it and that the defendant is not prejudiced in its " +
          "defence. Notice to any one of those " +
          "persons is enough, even if the action is later brought against someone who did not " +
          "originally receive it. This notice is separate from the Limitations Act, 2002's two-year " +
          "period in the note above.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90o02_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2021-01-29",
      },
    ],
    signals: [
      "slipped and fell",
      "fell on ice",
      "wet floor",
      "tripped",
      "injured on someone's property",
      "fell in a parking lot",
      "fell in a store",
      "lost my footing and fell",
      "hurt myself after slipping",
      "went down hard on the ice",
      "never cleared the snow and I fell",
      "took a bad fall on their property",
    ],
    // "business" reflects the most common real-world defendant for this claim
    // type (a store, restaurant, or commercial landlord as occupier) -- a
    // private homeowner can also be an occupier under the Act, this field
    // names the typical case, not an exclusive one.
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Occupiers' Liability Act, R.S.O. 1990, c. O.2",
        officialUrl: "https://www.ontario.ca/laws/docs/90o02_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "s.3(1)-(3): occupier's duty to take reasonable care that premises are reasonably safe",
      },
      {
        sourceName: "Occupiers' Liability Act, R.S.O. 1990, c. O.2",
        officialUrl: "https://www.ontario.ca/laws/docs/90o02_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "s.6.1(1)-(2): 60-day written notice requirement for personal injury caused by snow or ice, served on an occupier or the snow/ice-removal contractor; s.6.1(5)-(6): exceptions for death of the injured person, and for reasonable excuse where the defendant is not prejudiced; s.6.1(7): notice to any one listed person suffices. In force 29/01/2021 (2020, c. 33, s. 1)",
      },
      {
        sourceName: "Supreme Court of Canada — Waldick v. Malcolm, [1991] 2 S.C.R. 456",
        officialUrl: "docs/sources/waldick-v-malcolm-1991-2-SCR-456.pdf",
        verifiedAt: "2026-09-11",
        pinpoint:
          "Issue 1 (breach of the s.3(1) duty): the Court agreed the occupiers breached s.3(1) by doing nothing to render a treacherous icy parking area less slippery, where sand and salt \"are not expensive and are readily available\", the duty extending only to the part visitors were known to use; and on local custom, \"the existence of customary practices which are unreasonable in themselves ... in no way ousts the duty of care owed by occupiers under s. 3(1)\" -- \"no amount of general community compliance will render negligent conduct 'reasonable ... in all the circumstances'\"",
      },
      {
        sourceName: "Supreme Court of Canada — Waldick v. Malcolm, [1991] 2 S.C.R. 456",
        officialUrl: "docs/sources/waldick-v-malcolm-1991-2-SCR-456.pdf",
        verifiedAt: "2026-09-11",
        pinpoint:
          "Issue 2 (s.4(1) \"risks willingly assumed\"): \"s. 4(1) of the Act was intended to embody and preserve the volenti doctrine\" -- requiring not merely knowledge of the risk but consent to the legal risk, i.e. a waiver of the legal rights that may arise from the harm, as distinct from mere \"sciens\"",
      },
      {
        sourceName: "Supreme Court of Canada — Clements v. Clements, 2012 SCC 32",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2012/2012scc32/2012scc32.html",
        verifiedAt: "2026-09-11",
        pinpoint: "para. 8 -- the factual branch of causation: the \"but for\" test, which the plaintiff must prove on a balance of probabilities",
      },
      {
        sourceName: "Supreme Court of Canada — Clements v. Clements, 2012 SCC 32",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2012/2012scc32/2012scc32.html",
        verifiedAt: "2026-09-11",
        pinpoint: "para. 9 -- the \"but for\" test is applied in a robust common-sense fashion; no scientific evidence of the precise contribution the negligence made is required",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-11",
        pinpoint: "para. 11 -- causation has both a factual and a legal (remoteness) branch; paras. 12-13 -- remoteness turns on reasonable foreseeability, i.e. a \"real risk,\" not mere possibility",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-claim-improper-unauthorized-towing",
    name: "Improper or unauthorized towing",
    broughtBy: "The vehicle owner whose vehicle was towed.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "towed-without-consent",
        name: "The vehicle was towed without required consent",
        plainExplanation:
          "Ontario's page on towing rights says that, unless a tow is initiated by the police or an " +
          "authorized official, consent is required to tow a vehicle, and that a tow operator who did " +
          "not get consent cannot charge for towing services. Consent-to-tow requirements do not " +
          "apply to towing that is free of charge or prepaid (for example, through an automobile " +
          "club membership).",
        sourceUrl: "https://www.ontario.ca/page/know-your-rights-when-getting-tow",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Records showing no consent was given",
            why: "Shows whether consent to the tow was asked for or given.",
            examples: ["Timeline of events", "Witness account of the tow happening", "Any communication with the towing company"],
          },
        ],
      },
      {
        id: "no-rate-disclosure",
        name: "Required rate or cost disclosure was not given",
        plainExplanation:
          "Tow truck drivers, towing companies, and vehicle storage providers must give their rates " +
          "before providing services, and must hold a towing or vehicle storage certificate unless " +
          "they are exempt.",
        sourceUrl: "https://www.ontario.ca/page/know-your-rights-when-getting-tow",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Invoice or receipt",
            why: "Shows what, if anything, was disclosed and charged.",
            examples: ["Final invoice", "Any rate sheet provided", "Photos of posted (or missing) rate/certificate signage"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "tow-authorized-by-police",
        name: "The tow was initiated by police or another authorized official",
        plainExplanation:
          "Vehicle-owner consent is not required when a tow is initiated by police or another " +
          "authorized official -- this is a recognized exception to the general consent " +
          "requirement.",
        whenThisComesUp: "When the towing company says the tow was requested by police or a similar authority, not by choice.",
        sourceUrl: "https://www.ontario.ca/page/know-your-rights-when-getting-tow",
        verifiedAt: "2026-09-30",
      },
    ],
    applicableDefenceConceptIds: ["defence-set-off-or-counterclaim", "defence-limitation-period-expired", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-return-of-property", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Separately from a Small Claims case, a complaint about a tow truck driver, towing " +
          "company, or vehicle storage service's conduct can be filed with the Ministry of " +
          "Transportation online -- this is a regulatory complaint path, not a substitute for " +
          "recovering money through the court.",
        sourceUrl: "https://www.ontario.ca/page/know-your-rights-when-getting-tow",
        verifiedAt: "2026-09-30",
      },
      {
        note:
          "The Ministry's oversight under this Act only covers events on or after January 1, 2024.",
        sourceUrl: "https://www.ontario.ca/page/know-your-rights-when-getting-tow",
        verifiedAt: "2026-09-30",
      },
    ],
    signals: [
      "car towed",
      "vehicle towed without permission",
      "towing company",
      "tow truck",
      "didn't consent to tow",
      "storage fees",
      "impound lot",
      "towed without my permission",
      "towed from a private lot",
      "towed from my driveway",
      "car was hauled away",
      "took my vehicle without my okay",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Ontario.ca — Know Your Rights When Getting a Tow",
        officialUrl: "https://www.ontario.ca/page/know-your-rights-when-getting-tow",
        verifiedAt: "2026-09-07",
        pinpoint: "Towing and Storage Safety and Enforcement Act, 2021; consent, rate disclosure, certification requirements",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-claim-breach-of-contract-goods",
    name: "Breach of contract — goods (wrong item, non-delivery, defective goods)",
    broughtBy: "The buyer who paid for goods that were wrong, never delivered, or defective.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "goods-not-as-agreed",
        name: "The goods delivered were defective, not as described, or never arrived",
        plainExplanation:
          "Ontario's Sale of Goods Act addresses each of these three situations separately. NOT AS " +
          "DESCRIBED: where goods are sold by description, there is an implied condition that the goods " +
          "will correspond with the description. DEFECTIVE: subject to the Act and any statute in that " +
          "behalf, the Act starts from the position that there is NO implied condition as to quality or " +
          "fitness, subject to listed exceptions -- two of which are that goods bought by description from " +
          "a seller who deals in goods of that description carry an implied condition of merchantable " +
          "quality (though not as to defects an examination the buyer actually made ought to have " +
          "revealed), and that goods are reasonably fit for a particular purpose the buyer made known to " +
          "the seller so as to show reliance on the seller's skill or judgment, where the goods are of a " +
          "description that it is in the course of the seller's business to supply (though not where a " +
          "specified article is bought under its patent or other trade name). NEVER ARRIVED: separately " +
          "from any question of quality, it is the duty of the seller to deliver the goods, and of the " +
          "buyer to accept and pay for them, in accordance with the terms of the contract. Under s. 53, a " +
          "right, duty or liability that would arise under a contract of sale by implication of law may be " +
          "negatived or varied by express agreement, by the course of dealing between the parties, or by a " +
          "usage that binds both parties -- but for goods supplied under a consumer agreement, s. 9(3) of " +
          "the Consumer Protection Act, 2002 makes void any term or acknowledgement that purports to " +
          "negate or vary an implied condition or warranty under the Sale of Goods Act. Which of these " +
          "applies depends on what was agreed and what happened.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90s01_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "1994-12-09",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/02c30_e.doc", "pinpoint": "Consumer Protection Act, 2002, s. 9(2)-(3)"}],
        evidenceCategories: [
          {
            name: "Description of what was ordered vs. what arrived",
            why: "Shows the gap between what was agreed and what was delivered.",
            examples: ["Order confirmation or listing", "Photos of the item received", "Delivery tracking or lack of delivery"],
          },
        ],
      },
      {
        id: "existed-agreement-goods",
        name: "An agreement existed for the purchase",
        plainExplanation:
          "The buyer generally has to show, on a balance of probabilities, that an agreement for the " +
          "purchase existed on the terms claimed.",
        sourceUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Purchase records",
            why: "Establishes the terms of the sale.",
            examples: ["Receipt or invoice", "Order confirmation email", "Payment record"],
          },
        ],
      },
      {
        id: "loss-amount-goods",
        name: "The amount claimed reflects the actual loss",
        plainExplanation:
          "Ontario's Small Claims Court guide says the court \"can handle any action for the payment of " +
          "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
          "excluding interest and costs such as court fees.\" The $50,000 figure is the amount " +
          "prescribed by O. Reg. 626/00, s. 1(1), for the court's jurisdiction under s. 23(1) of the " +
          "Courts of Justice Act. Ontario's Small Claims Court guide says the reasons for a claim " +
          "should \"calculate and explain the amount of money and any interest you are claiming\", with " +
          "copies of supporting documents attached to the claim. This part of the checklist is about " +
          "the amount claimed and how it is calculated.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/000626_e.doc", "pinpoint": "O. Reg. 626/00, s. 1(1)"}, {"sourceUrl": "https://www.ontario.ca/laws/docs/90c43_e.doc", "pinpoint": "Courts of Justice Act, s. 23(1)"}],
        evidenceCategories: [
          {
            name: "Cost documentation",
            why: "Supports the specific dollar amount claimed.",
            examples: ["Original purchase price", "Cost to replace or repair", "Refund request correspondence"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "buyer-examined-goods",
        name: "The buyer examined the goods before or at purchase",
        plainExplanation:
          "If the buyer examined the goods, the implied condition of merchantable quality doesn't " +
          "extend to defects that examination ought to have revealed.",
        whenThisComesUp: "When the defendant says the defect was visible and the buyer inspected the goods before buying.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90s01_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "1994-12-09",
      },
    ],
    applicableDefenceConceptIds: [
      "defence-failure-to-mitigate",
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-return-of-property", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: "This kind of claim is started with a Plaintiff's Claim (Form 7A).",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
      },
    ],
    signals: [
      "wrong item delivered",
      "goods never arrived",
      "product defective",
      "not as described",
      "never delivered",
      "damaged goods on arrival",
      "showed up broken",
      "arrived damaged",
      "nothing like the picture online",
      "isn't the item I ordered",
      "wrong model shipped",
      "package never showed up",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Sale of Goods Act, R.S.O. 1990, c. S.1",
        officialUrl: "https://www.ontario.ca/laws/docs/90s01_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "s.14 (sale by description): implied condition that the goods will correspond with the description",
      },
      {
        sourceName: "Sale of Goods Act, R.S.O. 1990, c. S.1",
        officialUrl: "https://www.ontario.ca/laws/docs/90s01_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint:
          "s.15: there is NO implied warranty or condition as to quality or fitness except as listed -- para. 1 (fitness for a particular purpose made known, where the buyer relies on the seller's skill or judgment; not for a specified article bought under its patent or trade name), para. 2 (merchantable quality where goods are bought by description from a seller dealing in goods of that description; not as to defects an examination the buyer made ought to have revealed)",
      },
      {
        sourceName: "Sale of Goods Act, R.S.O. 1990, c. S.1",
        officialUrl: "https://www.ontario.ca/laws/docs/90s01_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "s.26: it is the duty of the seller to deliver the goods and of the buyer to accept and pay for them in accordance with the terms of the contract of sale",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-claim-non-payment-goods-sold",
    name: "Non-payment for goods sold",
    broughtBy: "The seller who delivered goods and was not paid.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "existed-agreement-sale",
        name: "An agreement existed for the sale of goods",
        plainExplanation:
          "The Superior Court of Justice's guide to the steps in a civil case says that in every civil " +
          "case the plaintiff has the burden of proof to establish, on a balance of probabilities, the " +
          "allegations in their claim -- evidence showing that, more likely than not, it would be " +
          "correct to rule in their favour. This part of the checklist is about the agreement for the " +
          "sale -- what was being sold, and on what terms.",
        sourceUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Sale records",
            why: "Establishes the terms of the sale and price.",
            examples: ["Invoice", "Purchase order", "Written or messaged agreement on price"],
          },
        ],
      },
      {
        id: "goods-delivered",
        name: "The goods were delivered or made available as agreed",
        plainExplanation:
          "The Superior Court of Justice's guide to the steps in a civil case says that in every civil " +
          "case the plaintiff has the burden of proof to establish, on a balance of probabilities, the " +
          "allegations in their claim -- evidence showing that, more likely than not, it would be " +
          "correct to rule in their favour. This part of the checklist is about delivery -- when and " +
          "how the goods were delivered or made available, and the records that show it.",
        sourceUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Proof of delivery",
            why: "Shows when and how the goods were delivered or made available.",
            examples: ["Delivery confirmation", "Sign-off or pickup confirmation", "Photos at time of handoff"],
          },
        ],
      },
      {
        id: "amount-unpaid-goods",
        name: "The amount claimed is accurate and remains unpaid",
        plainExplanation:
          "Ontario's Small Claims Court guide says the reasons for a claim should \"calculate and " +
          "explain the amount of money and any interest you are claiming\", with copies of supporting " +
          "documents attached to the claim. This part of the checklist is about the price agreed, " +
          "anything already paid, and what remains outstanding.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Invoice or statement of account",
            why: "Shows exactly how the unpaid amount was calculated.",
            examples: ["Itemized invoice", "Payment history", "Outstanding balance statement"],
          },
        ],
      },
      {
        id: "amount-within-jurisdiction-goods-sold",
        name: "The amount claimed falls within Small Claims Court's jurisdiction",
        plainExplanation:
          "Ontario's Small Claims Court guide says the court \"can handle any action for the payment of " +
          "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
          "excluding interest and costs such as court fees.\" The $50,000 figure is the amount " +
          "prescribed by O. Reg. 626/00, s. 1(1), for the court's jurisdiction under s. 23(1) of the " +
          "Courts of Justice Act.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/000626_e.doc", "pinpoint": "O. Reg. 626/00, s. 1(1)"}, {"sourceUrl": "https://www.ontario.ca/laws/docs/90c43_e.doc", "pinpoint": "Courts of Justice Act, s. 23(1)"}],
        evidenceCategories: [
          {
            name: "Cost documentation",
            why: "Supports the specific dollar amount claimed.",
            examples: ["Invoice or record of the agreed price", "Running total of what remains unpaid"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-goods-matched-agreement",
        name: "The buyer disputes the goods matched what was agreed",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a defendant who wishes to dispute the claim serves " +
          "the Defence on every other party and files it, with proof of service, within 20 days of " +
          "being served with the claim. This topic is about a Defence whose reasons dispute that the " +
          "goods matched what was agreed.",
        whenThisComesUp: "When the defendant has filed a Defence (Form 9A) disputing the goods themselves, not just non-payment.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: "This kind of claim is started with a Plaintiff's Claim (Form 7A).",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
      },
    ],
    // Original 4 signals were exact-substring specific enough that a
    // realistically-phrased real story ("the buyer never paid for the
    // product... payment for the merchandise") landed zero hits against
    // any of them -- confirmed directly this session by running such a
    // story through matchClaimType() (see docs/PROCEDURAL_RULES-adjacent
    // survey in scripts/verification/fixtures/smallClaimsFullSurvey.md).
    // The 8 phrasings below are alternate wordings of the exact same
    // existing, already-sourced claim type -- no new legal content, no new
    // citation needed, same as the original 4 needed none (signals are
    // plain keyword data, not a legal assertion -- see claimTypeMatcher.ts's
    // own header). Kept tied to "goods"/"product"/"merchandise"/"what they
    // bought" rather than a bare "never paid" fragment, to avoid false-
    // positive overlap with unpaid-debt-services or other money-claim types.
    signals: [
      "sold goods and wasn't paid",
      "buyer didn't pay for product",
      "unpaid for merchandise",
      "payment never received for goods",
      "never paid for the goods",
      "never paid for the product",
      "never paid me for the goods",
      "didn't pay me for the goods",
      "wouldn't pay for the goods",
      "refused to pay for the goods",
      "buyer never paid",
      "customer never paid",
      "took the goods but never paid",
      "never sent any payment for",
      "picked up the merchandise and never paid",
      "accepted the goods without paying",
      "took delivery and didn't pay",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a Claim",
        officialUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-08-31",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "s.23(1)(a): Small Claims Court has jurisdiction in any action for the payment of money where the amount claimed does not exceed the prescribed amount, exclusive of interest and costs",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-claim-consumer-protection-act-issue",
    name: "Consumer Protection Act issue (defective goods, misleading practices)",
    broughtBy: "An individual who bought goods or services from a business for personal, family or household purposes (not for business purposes), where the individual or the business was in Ontario at the time.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "false-misleading-representation",
        name: "The business made a false, misleading, or deceptive representation",
        plainExplanation:
          "Under Ontario's Consumer Protection Act, 2002 it is an unfair practice to make a false, " +
          "MISLEADING or DECEPTIVE representation -- all three, not only outright falsity. The Act " +
          "gives a non-exhaustive list of 17 examples, which includes representing that goods or " +
          "services have qualities, benefits, uses or performance characteristics they do not have; " +
          "that they are of a particular standard, quality, grade, style or model when they are not; " +
          "that goods are new or unused when they are not; that a repair or replacement is needed when " +
          "it is not; that a specific price advantage exists when it does not; and -- squarely " +
          "covering the \"misleading\" and \"deceptive\" prongs -- using exaggeration, innuendo or " +
          "ambiguity as to a material fact, or failing to state a material fact, where doing so " +
          "deceives or tends to deceive. " +
          "No person may engage in an unfair practice, and performing even one of these acts is deemed " +
          "to be engaging in one. There is an exception for someone who, on another's behalf, prints, " +
          "publishes, distributes or broadcasts a representation accepted in good faith in the " +
          "ordinary course of business.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        evidenceCategories: [
          {
            name: "The representation itself",
            why: "Documents exactly what was said or advertised.",
            examples: ["Advertisement or listing", "Sales conversation notes or messages", "Marketing materials"],
          },
        ],
      },
      {
        id: "withdrawal-notice-timely",
        name:
          "Notice to rescind for an unfair practice (if relied on) was given within the required time",
        plainExplanation:
          "Under s. 18(1) of the Consumer Protection Act, 2002, an agreement entered into by a consumer " +
          "after or while a person has engaged in an unfair practice may be rescinded by the consumer, who " +
          "is entitled to any remedy available in law, including damages. Where rescission is no longer " +
          "possible -- because the goods or services can no longer be returned, or because rescission " +
          "would deprive a good-faith third party of a right acquired for value -- the consumer may " +
          "instead recover the amount by which their payment exceeds the value the goods or services have " +
          "to them, or damages, or both (s. 18(2)). Either way, under s. 18(3), the consumer must give " +
          "notice within ONE YEAR after entering into the agreement -- although under s. 18(15) a court " +
          "may disregard the notice requirement if it is in the interest of justice to do so. The notice " +
          "may be expressed in any way that indicates the intention to rescind or to seek recovery and the " +
          "reasons for it (and meets any prescribed requirements), may be delivered by any means, and " +
          "(except by personal service) is deemed given when sent. Under s. 18(8), a consumer who has " +
          "delivered notice and has not received a satisfactory response within the prescribed period may " +
          "start an action; O. Reg. 17/05, s. 22 sets that period at 30 days after the day the consumer " +
          "gives the notice. This is the notice for an unfair practice; the cooling-off cancellation " +
          "rights for particular kinds of contracts are separate and have their own time limits.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/050017_e.doc", "pinpoint": "O. Reg. 17/05, s. 22"}],
        evidenceCategories: [
          {
            name: "Notice to rescind or seek recovery",
            why: "Shows the notice to rescind (or to seek recovery) was given, and when.",
            examples: ["Copy of the notice sent to the business", "Date-stamped email or letter"],
          },
        ],
      },
      {
        id: "loss-amount-cpa",
        name: "A specific loss resulted",
        plainExplanation:
          "Ontario's Small Claims Court guide says the reasons for a claim should \"calculate and " +
          "explain the amount of money and any interest you are claiming\", with copies of supporting " +
          "documents attached to the claim. This part of the checklist is about the loss claimed and " +
          "how it is calculated.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Payment and cost records",
            why: "Supports the dollar amount lost.",
            examples: ["Receipt or invoice", "Bank or credit card statement", "Refund correspondence"],
          },
        ],
      },
      {
        id: "amount-within-jurisdiction-cpa",
        name: "The amount claimed falls within Small Claims Court's jurisdiction",
        plainExplanation:
          "Ontario's Small Claims Court guide says the court \"can handle any action for the payment of " +
          "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
          "excluding interest and costs such as court fees.\" The $50,000 figure is the amount " +
          "prescribed by O. Reg. 626/00, s. 1(1), for the court's jurisdiction under s. 23(1) of the " +
          "Courts of Justice Act.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/000626_e.doc", "pinpoint": "O. Reg. 626/00, s. 1(1)"}, {"sourceUrl": "https://www.ontario.ca/laws/docs/90c43_e.doc", "pinpoint": "Courts of Justice Act, s. 23(1)"}],
        evidenceCategories: [
          {
            name: "Cost documentation",
            why: "Supports the specific dollar amount claimed.",
            examples: ["Receipt or invoice showing what was paid", "Records documenting the loss claimed"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-representation-false",
        name: "The business disputes that any representation was false or misleading",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a defendant who wishes to dispute the claim serves " +
          "the Defence on every other party and files it, with proof of service, within 20 days of " +
          "being served with the claim. This topic is about a Defence whose reasons deny making the " +
          "representation, or say it was accurate.",
        whenThisComesUp: "When the defendant's Defence denies making the representation, or says it was accurate.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 18 of the Consumer Protection Act, 2002, notice to rescind (or to seek recovery where " +
          "rescission is not possible) must be given within one year after entering into the agreement, " +
          "although under s. 18(15) a court may disregard the notice requirement if it is in the interest " +
          "of justice to do so. Under s. 18(8) and O. Reg. 17/05, s. 22, a consumer who has given notice " +
          "may start an action if they have not received a satisfactory response within 30 days after the " +
          "day the notice was given. This notice is separate from the time limit for starting a court " +
          "action: under s. 4 of the Limitations Act, 2002, unless that Act provides otherwise, a " +
          "proceeding cannot be started after the second anniversary of the day the claim was discovered.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/050017_e.doc", "pinpoint": "O. Reg. 17/05, s. 22"}, {"sourceUrl": "https://www.ontario.ca/laws/docs/02l24_e.doc", "pinpoint": "Limitations Act, 2002, s. 4"}],
      },
    ],
    signals: [
      "misled by a seller",
      "false advertising",
      "deceptive sales practice",
      "scammed by a business",
      "product not as advertised",
      "unconscionable contract",
      "misled about the product",
      "wasn't explained properly before I signed",
      "advertised something different from what I got",
      "tricked into signing a contract",
      "told me things about the product that weren't true",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Ontario.ca — Your Rights Under the Consumer Protection Act",
        officialUrl: "https://www.ontario.ca/page/your-rights-under-consumer-protection-act",
        verifiedAt: "2026-09-07",
        pinpoint: "false/misleading/deceptive representations; 1-year withdrawal notice period",
      },
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint:
          "s.14(1): \"It is an unfair practice for a person to make a false, misleading or deceptive representation\"; s.14(2): 17 non-exhaustive examples, incl. paras. 1, 3, 4, 10, 11 and 14 (exaggeration, innuendo or ambiguity as to a material fact, or failing to state one, where this deceives or tends to deceive)",
      },
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint:
          "s.17(1): no person shall engage in an unfair practice; s.17(2): performing one act under s.14, 15 or 16 is deemed to be engaging in an unfair practice; s.17(3): exception for a person who, on another's behalf, prints/publishes/distributes/broadcasts a representation accepted in good faith in the ordinary course of business",
      },
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint:
          "s.18(1): rescission plus any remedy available in law including damages; s.18(2): where rescission is not possible, recovery of the excess of payment over value, or damages, or both; s.18(3): notice within one year after entering into the agreement; s.18(4)-(6): any wording showing the intention and reasons, delivered by any means, deemed given when sent unless personally served. (Consolidation from 2025-12-11; the Act is repealed on a day to be named by proclamation under 2023, c. 23, Sched. 1, s. 110 -- not yet proclaimed as at the verification date.)",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "s.23(1)(a): Small Claims Court has jurisdiction in any action for the payment of money where the amount claimed does not exceed the prescribed amount, exclusive of interest and costs",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-claim-contractor-damage",
    name: "Damage caused by a contractor's work",
    broughtBy: "The property owner or customer whose property was damaged by a contractor's work.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "existed-agreement-contractor",
        name: "An agreement existed describing the work to be done",
        plainExplanation:
          "The Superior Court of Justice's guide to the steps in a civil case says that in every civil " +
          "case the plaintiff has the burden of proof to establish, on a balance of probabilities, the " +
          "allegations in their claim -- evidence showing that, more likely than not, it would be " +
          "correct to rule in their favour. This part of the checklist is about what the contractor was " +
          "engaged to do, and the records that show it.",
        sourceUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Agreement or scope of work",
            why: "Shows what was actually agreed to be done.",
            examples: ["Written estimate or quote", "Contract", "Messages describing the job"],
          },
        ],
      },
      {
        id: "work-caused-damage",
        name: "The contractor's work caused damage, or did not match what was agreed",
        plainExplanation:
          "This is a factual allegation the plaintiff has to establish with evidence, on a balance of " +
          "probabilities, like any other element of the claim.",
        sourceUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Photos or video of the damage",
            why: "Directly documents the condition and the harm.",
            examples: ["Before/after photos", "Video of the affected area", "Photos of the completed work"],
          },
          {
            name: "A second opinion or repair estimate",
            why: "Supports both that something went wrong and the cost to fix it.",
            examples: ["Estimate from another contractor", "Inspection report"],
          },
        ],
      },
      {
        id: "loss-amount-contractor",
        name: "The amount claimed reflects the cost of repair or loss",
        plainExplanation:
          "Ontario's Small Claims Court guide says the reasons for a claim should \"calculate and " +
          "explain the amount of money and any interest you are claiming\", with copies of supporting " +
          "documents attached to the claim. This part of the checklist is about the cost of repair or " +
          "replacement claimed, and the quotes, invoices or receipts it comes from.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Repair cost documentation",
            why: "Supports the specific dollar amount claimed.",
            examples: ["Repair invoice", "Replacement cost quote", "Amount already paid to the original contractor"],
          },
        ],
      },
      {
        id: "amount-within-jurisdiction-contractor",
        name: "The amount claimed falls within Small Claims Court's jurisdiction",
        plainExplanation:
          "Ontario's Small Claims Court guide says the court \"can handle any action for the payment of " +
          "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
          "excluding interest and costs such as court fees.\" The $50,000 figure is the amount " +
          "prescribed by O. Reg. 626/00, s. 1(1), for the court's jurisdiction under s. 23(1) of the " +
          "Courts of Justice Act.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/000626_e.doc", "pinpoint": "O. Reg. 626/00, s. 1(1)"}, {"sourceUrl": "https://www.ontario.ca/laws/docs/90c43_e.doc", "pinpoint": "Courts of Justice Act, s. 23(1)"}],
        evidenceCategories: [
          {
            name: "Cost documentation",
            why: "Supports the specific dollar amount claimed.",
            examples: ["Repair invoice or quote", "Replacement cost quote"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-causation-contractor",
        name: "The contractor disputes causing the damage",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a defendant who wishes to dispute the claim serves " +
          "the Defence on every other party and files it, with proof of service, within 20 days of " +
          "being served with the claim. This topic is about a Defence whose reasons dispute that the " +
          "contractor's work caused the damage claimed.",
        whenThisComesUp: "When the defendant's Defence denies responsibility for the specific damage claimed.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    applicableDefenceConceptIds: [
      "defence-failure-to-mitigate",
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
      "defence-contributory-negligence",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: "This kind of claim is started with a Plaintiff's Claim (Form 7A).",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
      },
    ],
    signals: [
      "contractor damaged my property",
      "renovation went wrong",
      "contractor caused water damage",
      "botched repair job",
      "workmanship damaged floor",
      "left my basement flooded",
      "damaged my ceiling",
      "damaged my floors during the renovation",
      "botched the installation",
      "renovation crew caused damage",
      // Third-person framings. Every signal above requires the word "damage"
      // or "damaged". People describe the damage instead of naming it —
      // cracked, hole, broke — and name the room or material, which the
      // vocabulary did not cover.
      "contractor cracked the tile",
      "contractor put a hole in the drywall",
      "cracked or broke something while doing the work",
      "denies causing the damage",
      "damage to another part of the house during the job",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a Claim",
        officialUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-08-31",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "s.23(1)(a): Small Claims Court has jurisdiction in any action for the payment of money where the amount claimed does not exceed the prescribed amount, exclusive of interest and costs",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-claim-wrongful-dismissal",
    name: "Wrongful dismissal (within Small Claims monetary jurisdiction)",
    broughtBy: "The employee who was dismissed.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "minimum-employment-length",
        name: "Length of continuous employment (the Employment Standards Act three-month threshold)",
        plainExplanation:
          "Under s. 54 of the Employment Standards Act, 2000, the Act's minimum written notice of " +
          "termination (or termination pay instead) applies to an employee who has been continuously " +
          "employed for three months or more; under s. 55, prescribed employees are not entitled to it. " +
          "That three-month threshold belongs to the Act's minimum standard. Under s. 8(1), subject to " +
          "s. 97, no civil remedy of an employee against their employer is affected by the Act, and the " +
          "common-law claim for reasonable notice described elsewhere in this claim type is a separate " +
          "route that s. 54 does not set a minimum length of service for.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-01-01",
        evidenceCategories: [
          {
            name: "Employment start date records",
            why: "Establishes the length of continuous employment.",
            examples: ["Offer letter or contract", "Pay stubs showing employment dates", "T4 slips"],
          },
        ],
      },
      {
        id: "notice-or-pay-not-given",
        name: "Termination notice or termination pay was not given as required",
        plainExplanation:
          "Under ss. 54, 57 and 61 of the Employment Standards Act, 2000, an employer may not end the " +
          "employment of an employee continuously employed for three months or more without giving " +
          "written notice of termination, or termination pay instead. Section 57 sets the notice by " +
          "length of employment, from at least one week (less than one year) up to at least eight weeks " +
          "(eight years or more). Under s. 58, a different, prescribed notice applies where the " +
          "employer terminates 50 or more employees at an establishment in the same four-week period. " +
          "Under s. 55, prescribed employees are not entitled to notice of termination or termination " +
          "pay under this Part. IMPORTANT: that Employment Standards Act scale is a minimum, not the " +
          "whole picture: under s. 5(2), where a provision in an employment contract that directly " +
          "relates to the same subject matter as an employment standard gives a greater benefit, the " +
          "contract provision applies instead, and under s. 8(1), subject to section 97, the Act does " +
          "not affect an employee's civil remedies against their employer. \"Wrongful dismissal\" is a " +
          "common-law action, and the Supreme Court of Canada, in Honda Canada Inc. v. Keays, 2008 SCC " +
          "39, has described it as based on an implied obligation in the employment contract to give " +
          "REASONABLE notice of an intention to end the relationship where there is no just cause. " +
          "Reasonable notice at common law is assessed case by case. The Court has applied four factors " +
          "from the Bardal case: the character of the employment, the length of service, the employee's " +
          "age, and the availability of similar employment having regard to the employee's experience, " +
          "training and qualifications. The Court has been explicit there can be \"no catalogue laid " +
          "down\" of what is reasonable for particular classes of case -- it depends on the individual's " +
          "particular circumstances. Working out what notice period a given situation calls for is " +
          "exactly the kind of assessment this platform does not do; it is a question for a licensed " +
          "paralegal or lawyer.",
        sourceUrl: "docs/sources/honda-canada-v-keays-2008-SCC-39.pdf",
        verifiedAt: "2026-09-30",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/00e41_e.doc", "pinpoint": "Employment Standards Act, 2000, ss. 5(2), 8(1), 54, 55, 57, 58, 61"}],
        evidenceCategories: [
          {
            name: "Termination correspondence",
            why: "Shows what, if anything, the employer provided at termination.",
            examples: ["Termination letter", "Final pay statement", "Records of notice period (if any) given"],
          },
        ],
      },
      {
        id: "amount-within-jurisdiction",
        name: "The amount owing falls within Small Claims Court's monetary jurisdiction",
        plainExplanation:
          "Small Claims Court handles actions for the payment of money where the amount claimed does " +
          "not exceed $50,000, excluding interest and costs. Ontario's page on suing someone in Small " +
          "Claims Court says a claim for more than $50,000 goes to the Superior Court of Justice, or can " +
          "still be filed in Small Claims Court by someone willing to waive the amount over $50,000.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/page/suing-someone-small-claims-court", "pinpoint": "Suing someone in Small Claims Court -- Overview"}],
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Wage and pay records",
            why: "Supports the calculation of the amount owing.",
            examples: ["Pay stubs", "Salary or wage rate confirmation", "Records of hours/schedule"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-length-or-calculation",
        name: "The employer disputes the length of employment or the notice calculation",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a defendant who wishes to dispute the claim serves " +
          "the Defence on every other party and files it, with proof of service, within 20 days of " +
          "being served with the claim. This topic is about a Defence whose reasons dispute the length " +
          "of employment, or how notice or termination pay was calculated.",
        whenThisComesUp: "When the employer's Defence disputes the employment dates or how notice was calculated, not just whether any is owed.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
      {
        id: "employer-relies-on-termination-clause",
        name: "The employer relies on a termination clause in the employment contract",
        plainExplanation:
          "The common-law presumption of reasonable notice can be rebutted, but only by an agreement " +
          "that clearly specifies some other notice period. Where an employer points to a termination " +
          "clause, the Supreme Court of Canada, in Machtinger v. HOJ Industries Ltd., [1992] 1 S.C.R. " +
          "986, has held that a clause providing LESS than the statutory minimum is null and void -- " +
          "the Employment Standards Act then in force made any contracting out of or waiver of an " +
          "employment standard void (s. 5(1) of the current Employment Standards Act, 2000 says the " +
          "same) -- and that such a clause cannot then be used even as evidence of what the parties " +
          "intended. The result is that the presumption of reasonable notice is not rebutted and the " +
          "common-law entitlement applies. Whether a particular clause is valid is a legal question " +
          "about that specific wording, and is not something this content can answer.",
        whenThisComesUp: "When the Defence says the contract already set out what was owed on termination and that amount was paid.",
        sourceUrl: "docs/sources/machtinger-v-hoj-industries-1992-1-SCR-986.pdf",
        verifiedAt: "2026-09-30",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/00e41_e.doc", "pinpoint": "Employment Standards Act, 2000, s. 5(1)"}],
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Ontario's page on suing someone in Small Claims Court says the court hears claims of $50,000 " +
          "or less; for anything over $50,000 a claim goes to the Superior Court of Justice, or can " +
          "still be filed in Small Claims Court by someone willing to waive the amount over $50,000.",
        sourceUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
        verifiedAt: "2026-09-30",
      },
      {
        note:
          "CHOOSING BETWEEN THE TWO ROUTES MATTERS, AND THE CHOICE CAN BE FINAL. Under s. 97(2) of the " +
          "Employment Standards Act, 2000, an employee who files a complaint under the Act alleging an " +
          "entitlement to termination pay or severance pay MAY NOT commence a civil proceeding for " +
          "wrongful dismissal if the complaint and the proceeding would relate to the same termination " +
          "or severance of employment. There is one way back: under s. 97(4), an employee who withdraws " +
          "the complaint within two weeks after it is filed may then commence a civil proceeding (this " +
          "also applies to the wages bar below). The reverse also applies: under s. 98(2), an employee " +
          "who starts a civil proceeding for wrongful dismissal may not file a complaint alleging an " +
          "entitlement to termination pay or severance pay about the same termination or severance. The " +
          "same pattern applies to wages: under s. 97(1), an employee who files a complaint about an " +
          "alleged failure to pay wages or to comply with Part XIII (Benefit Plans) may not commence a " +
          "civil proceeding about the same matter, and under s. 98(1) an employee who starts a civil " +
          "proceeding about that may not file a complaint about the same matter. Under s. 8(1), subject " +
          "to section 97, no civil remedy of an employee against their employer is affected by the Act. " +
          "Because the choice can be final, which route to take is a decision worth taking to a " +
          "licensed paralegal or lawyer before filing anything.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-01-01",
      },
      {
        note:
          "The Employment Standards Act, 2000 also states that where a provision of an employment " +
          "contract (or another Act) directly relating to the same subject matter as an employment " +
          "standard gives the employee a GREATER benefit, that provision applies and the employment " +
          "standard does not. The statutory scale is a floor that a contract can improve on, not a " +
          "ceiling.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-01-01",
      },
    ],
    signals: [
      "fired without notice",
      "wrongful dismissal",
      "let go without severance",
      "terminated without cause",
      "no termination pay",
      "employer didn't give notice",
      "let go without any warning",
      "position was eliminated with no notice",
      "walked me out the door",
      "ended my job without cause",
      "dismissed on the spot",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Ontario.ca — Your Guide to the Employment Standards Act: Termination of Employment",
        officialUrl: "https://www.ontario.ca/document/your-guide-employment-standards-act-0/termination-employment",
        verifiedAt: "2026-09-07",
        pinpoint: "3-month minimum employment; 1-8 week notice period by length of service",
      },
      {
        sourceName: "Supreme Court of Canada — Honda Canada Inc. v. Keays, 2008 SCC 39",
        officialUrl: "docs/sources/honda-canada-v-keays-2008-SCC-39.pdf",
        verifiedAt: "2026-09-11",
        pinpoint:
          "para. 50 -- \"An action for wrongful dismissal is based on an implied obligation in the employment contract to give reasonable notice of an intention to terminate the relationship in the absence of just cause\"; paras. 28-31 -- the four Bardal factors (character of the employment, length of service, age, availability of similar employment having regard to experience, training and qualifications), adopted by the Court in Machtinger, determinable only case by case, with \"no catalogue laid down as to what is reasonable notice in particular classes of cases\"",
      },
      {
        sourceName: "Supreme Court of Canada — Machtinger v. HOJ Industries Ltd., [1992] 1 S.C.R. 986",
        officialUrl: "docs/sources/machtinger-v-hoj-industries-1992-1-SCR-986.pdf",
        verifiedAt: "2026-09-11",
        pinpoint:
          "Reasons of Iacobucci J. (La Forest, L'Heureux-Dube, Sopinka, Gonthier and Cory JJ. concurring) -- termination on reasonable notice is a presumption, rebuttable only if the contract clearly specifies some other notice period; a termination clause providing less than the statutory minimum is null and void and \"cannot be used as evidence of the parties' intention\", so the presumption of reasonable notice is not rebutted; the statutory minimum notice periods do not themselves displace the common-law presumption. (Scanned PDF with no text layer -- read via the decisions.scc-csc.ca HTML-fallback route per docs/SOURCING_NOTES.md.)",
      },
      {
        sourceName: "Employment Standards Act, 2000, S.O. 2000, c. 41",
        officialUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint:
          "s.5(1): no contracting out of or waiver of an employment standard -- any such contracting out or waiver is void; s.5(2): a contract or other Act giving a greater benefit on the same subject matter applies instead of the employment standard; s.8(1): subject to s.97, no civil remedy of an employee against their employer is affected by the Act",
      },
      {
        sourceName: "Employment Standards Act, 2000, S.O. 2000, c. 41",
        officialUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint:
          "s.97(2): an employee who files a complaint under the Act alleging an entitlement to termination pay or severance pay may not commence a civil proceeding for wrongful dismissal relating to the same termination or severance; s.97(4): unless the complaint is withdrawn within two weeks after it is filed",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-claim-dog-bite-animal-injury",
    name: "Dog bite or attack (Dog Owners' Liability Act)",
    broughtBy: "The person bitten or attacked, or the owner of a domestic animal the dog bit or attacked.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "dog-caused-bite-or-attack",
        name: "The dog bit or attacked the person (or another domestic animal)",
        plainExplanation:
          "The owner of a dog is liable for damages resulting from a bite or attack by the dog on " +
          "another person or domestic animal.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90d16_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-06-06",
        evidenceCategories: [
          {
            name: "Medical or veterinary records",
            why: "Documents the injury and when it was first treated.",
            examples: ["Emergency room or clinic records", "Veterinary records for an injured pet", "Photos of visible injuries"],
          },
          {
            name: "Witness accounts",
            why: "Supports that the dog bit or attacked at that time and place.",
            examples: ["Names/contact info of anyone who saw it happen", "Written witness statements", "Any video or photos from the scene"],
          },
        ],
      },
      {
        id: "defendant-is-owner",
        name: "The defendant is the dog's owner",
        plainExplanation:
          "\"Owner\", for this Act, includes a person who possesses or harbours the dog, and, where " +
          "the owner is a minor, the person responsible for the minor's custody.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90d16_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-06-06",
        evidenceCategories: [
          {
            name: "Proof of who owns or keeps the dog",
            why: "Establishes who the correct defendant is.",
            examples: ["Municipal dog licence or registration", "Veterinary records naming the owner", "Witness confirmation of who the dog belongs to"],
          },
        ],
      },
      {
        id: "loss-amount-dog-bite",
        name: "The amount claimed reflects the injury or damage",
        plainExplanation:
          "Small Claims Court's jurisdiction covers claims for money, up to $50,000, not counting " +
          "interest and costs.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Cost documentation",
            why: "Supports the specific dollar amount claimed.",
            examples: ["Medical or veterinary bills", "Lost income records, if applicable", "Cost of damaged clothing or property"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "plaintiff-fault-reduces-damages",
        name: "The injured person's own fault contributed to what happened",
        plainExplanation:
          "Liability does not depend on the owner knowing the dog was prone to this or on the owner's " +
          "own negligence -- but the court reduces the damages awarded in proportion to any degree to " +
          "which the injured person's own fault or negligence caused or contributed to the damages.",
        whenThisComesUp: "When the defendant says the injured person provoked the dog or otherwise contributed to the incident.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90d16_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-06-06",
      },
      {
        id: "criminal-act-on-premises-exception",
        name: "The injured person was on the premises intending to commit, or committing, a criminal act there",
        plainExplanation:
          "Under s. 3(1) of the Dog Owners' Liability Act, where damage is caused by being bitten or " +
          "attacked by a dog on the owner's premises, the owner's liability is decided under that Act " +
          "and not under the Occupiers' Liability Act. Under s. 3(2), where a person is on premises " +
          "intending to commit, or committing, a criminal act on the premises and is bitten or attacked " +
          "by a dog, the owner is not liable under section 2 unless keeping the dog on the premises was " +
          "unreasonable for the purpose of protecting persons or property.",
        whenThisComesUp: "When the owner says the injured person was on the premises intending to commit, or committing, a criminal act there.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90d16_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-06-06",
      },
    ],
    applicableDefenceConceptIds: ["defence-contributory-negligence", "defence-limitation-period-expired", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "cannot be started after the second anniversary of the day the claim was discovered. Section " +
          "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
          "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
          "omission, that the act or omission was that of the person the claim is against, and that, " +
          "having regard to the nature of the injury, loss or damage, a proceeding would be an " +
          "appropriate means to seek to remedy it -- and the day a reasonable " +
          "person with their abilities and in their circumstances first ought to have known those " +
          "things. Under s. 5(2), a person with a claim is presumed to have known of those matters on " +
          "the day the act or omission the claim is based on took place, unless the contrary is proved.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
    ],
    signals: [
      "dog bit me",
      "bitten by a dog",
      "attacked by a dog",
      "dog attack injury",
      "my dog bit someone",
      "dog attacked my pet",
      "dog got loose and bit",
      "pet attacked me",
      "dog charged at me and bit",
      "bitten while walking by",
      "animal attacked my child",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Dog Owners' Liability Act, R.S.O. 1990, c. D.16",
        officialUrl: "https://www.ontario.ca/laws/docs/90d16_e.doc",
        verifiedAt: "2026-09-07",
        pinpoint: "s.2(1) owner liability; s.2(3) liability not dependent on knowledge/negligence, fault apportionment; s.3 premises rule and criminal-act exception",
      },
    ],
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    id: "sc-claim-breach-of-contract-services",
    name: "Breach of contract — services not performed or substandard",
    broughtBy: "The customer who paid or hired someone for work or a service that was not done, was abandoned partway, or was not done as agreed.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "existed-agreement-services",
        name: "An agreement existed for the service to be performed",
        plainExplanation:
          "The Superior Court of Justice's guide to the steps in a civil case says that in every civil " +
          "case the plaintiff has the burden of proof to establish, on a balance of probabilities, the " +
          "allegations in their claim -- evidence showing that, more likely than not, it would be " +
          "correct to rule in their favour. This part of the checklist is about what the other party " +
          "was engaged to do, and the records that show it.",
        sourceUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Agreement or scope of work",
            why: "Shows what was actually agreed to be done.",
            examples: ["Written estimate or quote", "Contract or booking confirmation", "Messages describing the job"],
          },
        ],
      },
      {
        id: "service-not-performed-or-substandard",
        name: "The service was never performed, was abandoned partway, or did not match what was agreed",
        plainExplanation:
          "This is a factual allegation the plaintiff has to establish with evidence, on a balance of " +
          "probabilities, like any other element of the claim.",
        sourceUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Records of what was and wasn't done",
            why: "Documents the gap between what was agreed and what happened.",
            examples: ["Photos of unfinished or substandard work", "Communication about the missed appointment or abandoned job", "A second opinion or assessment"],
          },
        ],
      },
      {
        id: "loss-amount-services",
        name: "The amount claimed reflects the loss",
        plainExplanation:
          "Ontario's Small Claims Court guide says the court \"can handle any action for the payment of " +
          "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
          "excluding interest and costs such as court fees.\" The $50,000 figure is the amount " +
          "prescribed by O. Reg. 626/00, s. 1(1), for the court's jurisdiction under s. 23(1) of the " +
          "Courts of Justice Act. Ontario's Small Claims Court guide says the reasons for a claim " +
          "should \"calculate and explain the amount of money and any interest you are claiming\", with " +
          "copies of supporting documents attached to the claim. This part of the checklist is about " +
          "the amount claimed and how it is calculated.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/000626_e.doc", "pinpoint": "O. Reg. 626/00, s. 1(1)"}, {"sourceUrl": "https://www.ontario.ca/laws/docs/90c43_e.doc", "pinpoint": "Courts of Justice Act, s. 23(1)"}],
        evidenceCategories: [
          {
            name: "Cost documentation",
            why: "Supports the specific dollar amount claimed.",
            examples: ["Amount already paid", "Cost to hire someone else to finish or redo the work", "Refund request correspondence"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-service-was-completed",
        name: "The provider disputes that the service was left unfinished or substandard",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a defendant who wishes to dispute the claim serves " +
          "the Defence on every other party and files it, with proof of service, within 20 days of " +
          "being served with the claim. This topic is about a Defence whose reasons dispute that the " +
          "service was left unfinished or below what was agreed.",
        whenThisComesUp: "When the defendant has filed a Defence (Form 9A) disputing the quality or completion of the service.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    applicableDefenceConceptIds: [
      "defence-failure-to-mitigate",
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: "This kind of claim is started with a Plaintiff's Claim (Form 7A).",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
      },
    ],
    signals: [
      "never finished the job",
      "paid for a service that wasn't done",
      "service provider walked off the job",
      "no-show for a booked service",
      "didn't deliver the service",
      "abandoned the project",
      "never showed up for the job",
      "hired them and they never came",
      "took my deposit and disappeared",
      "walked off the job halfway through",
      "never came to do the work",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a Claim",
        officialUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-07",
      },
    ],
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    id: "sc-claim-recovery-of-personal-property",
    name: "Recovery of personal property wrongfully held by another",
    broughtBy: "The owner who wants their belongings back from someone holding them.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "plaintiff-owns-or-has-right-to-property",
        name: "The plaintiff owns the property or has a right to its possession",
        plainExplanation:
          "The Superior Court of Justice's guide to the steps in a civil case says that in every civil " +
          "case the plaintiff has the burden of proof to establish, on a balance of probabilities, the " +
          "allegations in their claim -- evidence showing that, more likely than not, it would be " +
          "correct to rule in their favour. This part of the checklist is about who owns the property, " +
          "or why it should be returned, and the records that show it.",
        sourceUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Proof of ownership or right to possession",
            why: "Establishes the plaintiff's claim to the property itself.",
            examples: ["Purchase receipt", "Photos of the property in the plaintiff's possession before it was taken/lent", "Messages acknowledging whose property it is"],
          },
        ],
      },
      {
        id: "defendant-possesses-and-wont-return",
        name: "The defendant has the property and has not returned it",
        plainExplanation:
          "Ontario's page on suing someone in Small Claims Court says you can sue in Small Claims Court " +
          "for the return of personal property, for $50,000 or less. This part of the checklist is " +
          "about where the property is now, and the requests to return it that went unanswered or were " +
          "refused.",
        sourceUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Requests for return",
            why: "Shows the property was asked for and not returned.",
            examples: ["Messages asking for the property back", "Timeline of when it was lent/taken and requests made since"],
          },
        ],
      },
      {
        id: "value-within-jurisdiction-property",
        name: "The property's value falls within Small Claims Court's jurisdiction",
        plainExplanation:
          "Small Claims Court can decide claims for money or the return of personal property up to " +
          "$50,000, excluding interest and costs.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Value documentation",
            why: "Supports the property's value if return isn't possible.",
            examples: ["Original purchase price", "Replacement cost", "Appraisal, if available"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-ownership-or-right",
        name: "The defendant disputes that the plaintiff owns or has a right to the property",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a defendant who wishes to dispute the claim serves " +
          "the Defence on every other party and files it, with proof of service, within 20 days of " +
          "being served with the claim. This topic is about a Defence whose reasons dispute who owns " +
          "the property, or that it should be returned.",
        whenThisComesUp: "When the defendant's Defence claims the property is theirs, or that it was a gift rather than something lent.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-return-of-property", "sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 23(1) of the Courts of Justice Act, Small Claims Court has jurisdiction in an action " +
          "for the recovery of possession of personal property where the value of the property does " +
          "not exceed the prescribed amount, and in an action for the payment of money where the " +
          "amount claimed does not exceed the prescribed amount, exclusive of interest and costs.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
      },
      {
        note:
          "Under rule 20.05 of the Rules of the Small Claims Court, an order for the delivery of " +
          "personal property may be enforced by a writ of delivery (Form 20B), which the clerk issues " +
          "to a bailiff when the person who obtained the order asks, with an affidavit that the " +
          "property has not been delivered. If the bailiff cannot find or take the property, the person " +
          "who obtained the order can bring a motion for an order directing the bailiff to seize any " +
          "other personal property of the person the order was made against. The person who obtained " +
          "the order must pay the bailiff's storage expenses in advance and from time to time; if they " +
          "do not, the seizure is treated as abandoned.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    signals: [
      "won't give my property back",
      "keeping my belongings",
      "refuses to return my property",
      "borrowed and never returned",
      "won't return what I lent them",
      "still has my furniture and won't give it back",
      "keeps making excuses not to return",
      "holding onto my equipment",
      "won't hand back what I lent them",
      // Third-person framings. 7 of the 9 signals above are first-person, and
      // the rest enumerate specific objects (furniture, equipment) rather than
      // the relationship. A story naming power tools and a ring matches none.
      "moved out and will not give them back",
      "still has things that belong to someone else",
      "will not give back property that belongs to another person",
      "holding property belonging to someone else",
      "keeping items that are not theirs",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Ontario.ca — Suing Someone in Small Claims Court",
        officialUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
        verifiedAt: "2026-09-07",
        pinpoint: "Court hears claims for money or the return of personal property up to $50,000",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "s.23(1)(b): Small Claims Court has jurisdiction in any action for the recovery of possession of personal property where the value does not exceed the prescribed amount",
      },
      {
        sourceName: "Rules of the Small Claims Court, O. Reg. 258/98",
        officialUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "r. 20.05(1)-(4): an order for delivery of personal property is enforced by a writ of delivery; if the bailiff cannot find or take that property, the party may move for an order to seize other personal property instead; the party pays storage costs in advance or the seizure is deemed abandoned",
      },
    ],
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    id: "sc-claim-consumer-cancellation-refund",
    name: "Cancelled contract — deposit or payment not refunded (Consumer Protection Act)",
    broughtBy: "The consumer who cancelled a contract with a business and did not get their deposit or payment back.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "contract-covered-by-cooling-off",
        name: "The agreement falls into a category with a cancellation right",
        plainExplanation:
          "Ontario law gives a cooling-off period -- a specific number of days to cancel an agreement " +
          "without reason or penalty -- for certain contracts: a product or service bought from a " +
          "door-to-door salesperson, paying in advance to join a fitness club or gym, buying a " +
          "newly-built condo, getting a payday loan, or purchasing a time share. The same page shows " +
          "the rules are not identical across these contracts: a payday lender has 2 days to refund, " +
          "where for most contracts a business has 15. For a new-build condo or a payday loan, the " +
          "specific rules that apply are worth checking on their own terms.",
        sourceUrl: "https://www.ontario.ca/page/your-rights-under-consumer-protection-act",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "The original agreement",
            why: "Shows what kind of contract this is and whether a cancellation right applies.",
            examples: ["Signed contract or membership agreement", "Sales receipt", "Condo purchase agreement"],
          },
        ],
      },
      {
        id: "cancellation-given",
        name: "Notice of cancellation was given",
        plainExplanation:
          "Ontario's page on your rights under the Consumer Protection Act says the cooling-off right " +
          "is used by writing a cancellation letter to the business within the cooling-off period, and " +
          "that no reason needs to be given.",
        sourceUrl: "https://www.ontario.ca/page/your-rights-under-consumer-protection-act",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Proof of cancellation",
            why: "Shows the cancellation step was taken and when.",
            examples: ["Copy of the cancellation notice sent", "Date-stamped email or letter", "Confirmation from the seller"],
          },
        ],
      },
      {
        id: "refund-not-received-in-time",
        name: "The refund was not issued within the required timeframe",
        plainExplanation:
          "After a valid cancellation, the company generally has 15 days to return the money paid, or " +
          "2 days in the specific case of a payday loan.",
        sourceUrl: "https://www.ontario.ca/page/your-rights-under-consumer-protection-act",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Payment records",
            why: "Supports the amount paid and the date, to measure against the refund deadline.",
            examples: ["Receipt or invoice", "Bank or credit card statement", "Any partial refund already received"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-cancellation-validity",
        name: "The business disputes that a valid cancellation right applied, or that proper notice was given",
        plainExplanation:
          "A defendant can file a Defence disputing that the contract falls into a category with a " +
          "cooling-off right, or that cancellation notice was given within the required period.",
        whenThisComesUp: "When the business's Defence says the contract type isn't covered, or the cancellation was late.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
        verifiedAt: "2026-09-30",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "For most contracts covered by this cancellation right, the business has 15 days to refund " +
          "what was paid; for a payday loan specifically, the refund must be given within 2 days.",
        sourceUrl: "https://www.ontario.ca/page/your-rights-under-consumer-protection-act",
        verifiedAt: "2026-09-30",
      },
    ],
    signals: [
      "deposit not refunded after cancelling",
      "cancelled but no refund",
      "gym membership refund",
      "cooling off period refund",
      "cancelled condo purchase deposit",
      "payday loan refund",
      "cancelled a time share",
      "cancelled within the cooling-off period",
      "refusing to give my money back after I cancelled",
      "backed out and they won't refund",
      "cancelled but they kept my deposit",
      "refusing a refund after I cancelled",
      // Third-person framings. The signals above assume a DEPOSIT was kept or
      // that the story uses the phrase "cooling-off". A cancellation followed
      // by CONTINUED CHARGING had no entry, and none of them survive a story
      // that never uses the word "refund".
      "cancelled and they kept charging",
      "kept charging the card after the cancellation",
      "cancelled within the window and the charges continued",
      "will not return the money after a cancellation",
      "cancelled the membership and the payments did not stop",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Ontario.ca — Your Rights Under the Consumer Protection Act",
        officialUrl: "https://www.ontario.ca/page/your-rights-under-consumer-protection-act",
        verifiedAt: "2026-09-07",
        pinpoint: "Cooling-off/cancellation periods for door-to-door sales, gym memberships, new condos, payday loans, time shares; 15-day (2-day for payday loans) refund requirement after cancellation",
      },
    ],
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    id: "sc-claim-commercial-tenancy-dispute",
    name: "Commercial (non-residential) tenancy dispute",
    broughtBy: "A landlord or tenant of commercial (non-residential) premises.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "tenancy-is-commercial-not-residential",
        name: "The tenancy is a commercial/business tenancy, not a residential one",
        plainExplanation:
          "Ontario's page on renting commercial property says the Commercial Tenancies Act outlines the " +
          "relationship, rights and obligations between commercial landlords and tenants. Residential " +
          "tenancies are covered separately, on Ontario's residential tenancy pages.",
        sourceUrl: "https://www.ontario.ca/page/renting-commercial-property-ontario",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Proof the space was used for business",
            why: "Supports that this is a commercial, not residential, tenancy.",
            examples: ["Commercial lease agreement", "Business registration at that address", "Zoning or use description in the lease"],
          },
        ],
      },
      {
        id: "existed-agreement-commercial-lease",
        name: "A lease or tenancy agreement existed on the terms claimed",
        plainExplanation:
          "Ontario's page on renting commercial property says a signed commercial lease agreement " +
          "between the landlord and tenant may take precedence over the Commercial Tenancies Act. This " +
          "part of the checklist is about the lease or tenancy agreement and its terms, and the records " +
          "that show them.",
        sourceUrl: "https://www.ontario.ca/page/renting-commercial-property-ontario",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "The lease itself",
            why: "Establishes the agreed terms, rent, and obligations.",
            examples: ["Signed commercial lease", "Amendments or renewal agreements", "Correspondence confirming terms"],
          },
        ],
      },
      {
        id: "amount-owing-commercial",
        name: "The amount owing falls within Small Claims Court's jurisdiction",
        plainExplanation:
          "Ontario's Small Claims Court guide says the court \"can handle any action for the payment of " +
          "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
          "excluding interest and costs such as court fees.\"",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/000626_e.doc", "pinpoint": "O. Reg. 626/00, s. 1(1)"}, {"sourceUrl": "https://www.ontario.ca/laws/docs/90c43_e.doc", "pinpoint": "Courts of Justice Act, s. 23(1)"}],
        evidenceCategories: [
          {
            name: "Rent and account records",
            why: "Supports the amount claimed as owing.",
            examples: ["Rent ledger or statement of account", "Lease showing the rent amount", "Records of any partial payments"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-commercial-classification",
        name: "The other party disputes that the tenancy is commercial rather than residential",
        plainExplanation:
          "If there's a genuine question about whether a tenancy is residential or commercial, either " +
          "party can apply to the Landlord and Tenant Board for a determination of whether the " +
          "Residential Tenancies Act applies.",
        whenThisComesUp: "When there is a real dispute about whether the tenancy is residential or commercial.",
        sourceUrl: "https://www.ontario.ca/page/renting-commercial-property-ontario",
        verifiedAt: "2026-09-30",
      },
      {
        id: "lease-terms-govern",
        name: "The signed lease's own terms may override the default rules",
        plainExplanation:
          "Ontario's page on renting commercial property says a signed commercial lease agreement " +
          "between the landlord and tenant may take precedence over the Commercial Tenancies Act.",
        whenThisComesUp: "When the dispute is about which rule applies -- the Act's default rule or a specific term the lease itself sets out.",
        sourceUrl: "https://www.ontario.ca/page/renting-commercial-property-ontario",
        verifiedAt: "2026-09-30",
      },
    ],
    applicableDefenceConceptIds: [
      "defence-failure-to-mitigate",
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Ontario's page on renting commercial property says that if there is a question about whether " +
          "a tenancy is residential or commercial, a landlord or tenant can apply to the Landlord and " +
          "Tenant Board for a determination of whether the Residential Tenancies Act applies.",
        sourceUrl: "https://www.ontario.ca/page/renting-commercial-property-ontario",
        verifiedAt: "2026-09-30",
      },
    ],
    signals: [
      "commercial lease dispute",
      "business tenant",
      "unpaid commercial rent",
      "office lease dispute",
      "retail lease",
      "commercial landlord",
      "business premises lease",
      "landlord for my shop",
      "landlord for my store",
      "tenant in my commercial unit hasn't paid",
      "trying to evict me from my shop",
      "dispute with my office lease",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Ontario.ca — Renting Commercial Property in Ontario",
        officialUrl: "https://www.ontario.ca/page/renting-commercial-property-ontario",
        verifiedAt: "2026-09-07",
        pinpoint: "Commercial Tenancies Act governs commercial leases, not the Residential Tenancies Act; LTB determines residential-vs-commercial disputes",
      },
    ],
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    id: "sc-claim-dishonoured-nsf-cheque",
    name: "Dishonoured (NSF) cheque",
    broughtBy: "The person or business that received a cheque that bounced.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "payment-made-by-cheque",
        name: "Payment was made (or attempted) by cheque",
        plainExplanation:
          "Ontario's page on suing someone in Small Claims Court lists NSF (non-sufficient funds) cheques " +
          "among the claims for money owed under an agreement that can be sued for there.",
        sourceUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "The cheque and related records",
            why: "Shows the payment attempt and its terms.",
            examples: ["Copy of the cheque", "Bank statement showing the returned item", "Invoice or agreement the cheque was meant to satisfy"],
          },
        ],
      },
      {
        id: "cheque-returned-nsf",
        name: "The cheque was returned for non-sufficient funds (or otherwise dishonoured)",
        plainExplanation:
          "Ontario's page on suing someone in Small Claims Court lists NSF (non-sufficient funds) " +
          "cheques among the kinds of claims that can be brought there. This part of the checklist is " +
          "about the returned cheque itself, and the bank's record that it did not clear.",
        sourceUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Bank notice of dishonour",
            why: "Directly documents that the cheque did not clear and why.",
            examples: ["Bank statement showing the NSF return", "NSF fee notice", "Returned cheque itself, if available"],
          },
        ],
      },
      {
        id: "amount-unpaid-nsf",
        name: "The amount remains unpaid",
        plainExplanation:
          "Interest and costs are handled separately from, and in addition to, the amount claimed " +
          "itself.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Statement of account",
            why: "Shows the amount still owing after the cheque failed to clear.",
            examples: ["Invoice or statement of account", "Record of any partial payment since"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-nsf-underlying-debt",
        name: "The defendant disputes owing the underlying amount",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is based " +
          "on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a defendant who " +
          "wishes to dispute the claim serves the Defence on every other party and files it, with proof of " +
          "service, within 20 days of being served with the claim. This topic is about a Defence whose " +
          "reasons dispute the debt the cheque was meant to pay, not only the cheque.",
        whenThisComesUp: "When the defendant's Defence disputes the underlying agreement or amount, not just the payment method.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: "This kind of claim is started with a Plaintiff's Claim (Form 7A).",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
      },
    ],
    signals: [
      "NSF cheque",
      "bounced cheque",
      "cheque bounced",
      "non-sufficient funds",
      "cheque returned",
      "insufficient funds cheque",
      "cheque bounced when I deposited it",
      "paid me with a cheque that came back",
      "bank rejected the cheque",
      "cheque came back for insufficient funds",
      "the cheque didn't clear",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Ontario.ca — Suing Someone in Small Claims Court",
        officialUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
        verifiedAt: "2026-09-07",
        pinpoint: "NSF cheques explicitly listed as an example of a Small Claims Court matter",
      },
    ],
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    id: "sc-claim-unpaid-overtime-vacation-pay",
    name: "Unpaid overtime or vacation pay",
    broughtBy: "The employee who was not paid overtime or vacation pay.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "overtime-not-paid",
        name: "Overtime pay owed was not paid",
        plainExplanation:
          "For most employees, overtime begins after 44 hours worked in a work week, paid at 1½ " +
          "times the employee's regular rate of pay.",
        sourceUrl: "https://www.ontario.ca/document/your-guide-employment-standards-act-0/overtime-pay",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Hours and pay records",
            why: "Shows the hours actually worked and what was paid for them.",
            examples: ["Timesheets or schedules", "Pay stubs", "Text/email records confirming hours worked"],
          },
        ],
      },
      {
        id: "vacation-pay-not-paid",
        name: "Vacation pay owed was not paid",
        plainExplanation:
          "Ontario's guide to the Employment Standards Act says vacation pay must be at least 4% of the " +
          "gross wages (not counting vacation pay) earned in the 12-month vacation entitlement year or " +
          "stub period, or at least 6% for employees with five or more years of employment at the end " +
          "of that year or stub period. Some jobs are exempt from the ESA's vacation with pay " +
          "provisions; Ontario's special rule tool lists them. An employment contract or collective " +
          "agreement may give a greater right or benefit. When employment ends, vacation pay that has " +
          "not been paid must be paid within seven days of the employment ending or on what would have " +
          "been the employee's next pay day, whichever is later.",
        sourceUrl: "https://www.ontario.ca/document/your-guide-employment-standards-act-0/vacation",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Pay and employment records",
            why: "Supports the vacation pay calculation and whether it was paid.",
            examples: ["Pay stubs", "Final pay statement", "Records of gross wages earned in the vacation year"],
          },
        ],
      },
      {
        id: "amount-within-jurisdiction-wages",
        name: "The amount owing falls within Small Claims Court's jurisdiction",
        plainExplanation:
          "Small Claims Court can only hear claims up to $50,000, excluding interest and costs.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Wage calculation",
            why: "Supports the specific dollar amount claimed.",
            examples: ["Pay rate confirmation", "Hours/schedule records", "Calculation showing how the amount owing was reached"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-hours-or-entitlement",
        name: "The employer disputes the hours worked or the vacation pay entitlement calculation",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a defendant who wishes to dispute the claim serves " +
          "the Defence on every other party and files it, with proof of service, within 20 days of " +
          "being served with the claim. This topic is about a Defence whose reasons dispute the hours " +
          "worked, the length of employment, or how vacation pay was calculated.",
        whenThisComesUp: "When the employer's Defence disputes the underlying hours or calculation, not just whether anything is owed at all.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Ontario's page on suing someone in Small Claims Court says the court hears claims of $50,000 " +
          "or less; for anything over $50,000 a claim goes to the Superior Court of Justice, or can " +
          "still be filed in Small Claims Court by someone willing to waive the amount over $50,000.",
        sourceUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
        verifiedAt: "2026-09-30",
      },
      {
        note:
          "CHOOSING BETWEEN AN EMPLOYMENT STANDARDS COMPLAINT AND A COURT CLAIM MATTERS, AND THE CHOICE " +
          "CAN BE FINAL. Under s. 1(1) of the Employment Standards Act, 2000, \"wages\" includes any " +
          "payment an employer is required to make to an employee under the Act. Under s. 97(1), an " +
          "employee who files a complaint under the Act about an alleged failure to pay wages (or to " +
          "comply with Part XIII, Benefit Plans) may not commence a civil proceeding about the same " +
          "matter. There is one way back: under s. 97(4), an employee who withdraws the complaint within " +
          "two weeks after it is filed may then commence a civil proceeding. The reverse also applies: " +
          "under s. 98(1), an employee who commences a civil proceeding about an alleged failure to pay " +
          "wages may not file a complaint about the same matter or have one investigated. Under s. 8(1), " +
          "subject to s. 97, no civil remedy of an employee against their employer is affected by the " +
          "Act. Separately, under s. 96(3), a complaint about a contravention that occurred more than two " +
          "years before the complaint was filed is deemed not to have been filed. Because the choice can " +
          "be final, which route to take is a decision worth taking to a licensed paralegal or lawyer " +
          "before filing anything.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-01-01",
      },
      {
        note:
          "Under s. 8(2) of the Employment Standards Act, 2000, where an employee commences a civil " +
          "proceeding against their employer under the Act, notice of the proceeding shall be served on " +
          "the Director of Employment Standards, on a form approved by the Director, on or before the " +
          "date the civil proceeding is set down for trial.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-01-01",
      },
    ],
    signals: [
      "unpaid overtime",
      "overtime not paid",
      "vacation pay not paid",
      "employer didn't pay vacation pay",
      "worked over 44 hours no overtime",
      "final paycheque missing vacation pay",
      "never paid me for the extra hours",
      "never paid out my vacation time",
      "overtime never showed up on my paycheque",
      "didn't pay me for hours over 44",
      "accumulated vacation time never paid",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Ontario.ca — Your Guide to the Employment Standards Act: Overtime Pay",
        officialUrl: "https://www.ontario.ca/document/your-guide-employment-standards-act-0/overtime-pay",
        verifiedAt: "2026-09-07",
        pinpoint: "Overtime begins after 44 hours/week, paid at 1.5x regular rate",
      },
      {
        sourceName: "Ontario.ca — Your Guide to the Employment Standards Act: Vacation",
        officialUrl: "https://www.ontario.ca/document/your-guide-employment-standards-act-0/vacation",
        verifiedAt: "2026-09-07",
        pinpoint: "Minimum 4% (6% after five years) vacation pay; owed within 7 days of employment ending or the next pay day, whichever is later",
      },
    ],
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    id: "sc-claim-vehicle-repair-dispute",
    name: "Vehicle repair dispute (overcharge or warranty)",
    broughtBy: "The vehicle owner in a dispute with a repair shop over a charge or warranty.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "estimate-or-max-agreed",
        name: "A written estimate was required, or a maximum amount was agreed instead",
        plainExplanation:
          "Under s. 56 of the Consumer Protection Act, 2002, a repairer may not charge a consumer for work " +
          "or repairs unless it first gives an estimate, except where the repairer offered an estimate and " +
          "the consumer declined it, the consumer specifically authorized the maximum amount they will pay, " +
          "and the amount charged does not exceed that maximum.",
        sourceUrl: "https://www.ontario.ca/page/car-repair-shops-your-rights",
        alsoCites: [{ sourceUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc", pinpoint: "Consumer Protection Act, 2002, s. 56 (1)-(2)" }],
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "The estimate or agreement on cost",
            why: "Establishes what was quoted or agreed before the work started.",
            examples: ["Written estimate", "Work order", "Text/email agreeing to a maximum amount"],
          },
        ],
      },
      {
        id: "charged-over-permitted-limit",
        name: "The final amount charged exceeded what the law allows",
        plainExplanation:
          "The final cost charged cannot be more than 10% above the estimate, or, if an estimate was " +
          "declined, more than the agreed maximum amount.",
        sourceUrl: "https://www.ontario.ca/page/car-repair-shops-your-rights",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Final invoice",
            why: "Shows the amount actually charged, to compare against the estimate or agreed maximum.",
            examples: ["Final invoice or receipt", "Payment record", "Any communication about additional charges"],
          },
        ],
      },
      {
        id: "amount-claimed-repair",
        name: "The amount claimed reflects the overcharge or repair loss",
        plainExplanation:
          "Small Claims Court's jurisdiction covers claims for money, up to $50,000, not counting " +
          "interest and costs.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Cost documentation",
            why: "Supports the specific dollar amount claimed.",
            examples: ["Amount overcharged", "Cost to have the repair redone elsewhere", "Repair invoice"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-overcharge",
        name: "The repair shop disputes that the final charge exceeded the permitted limit",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a " +
          "defendant who wishes to dispute the claim serves the Defence on every other party and files " +
          "it, with proof of service, within 20 days of being served with the claim. This topic is " +
          "about a Defence whose reasons dispute that the final charge went over the estimate or the " +
          "agreed maximum, or say the extra work was authorized. The rules such reasons relate to are " +
          "in the Consumer Protection Act, 2002: under s. 58(1), a repairer may not charge for work or " +
          "repairs unless the consumer authorizes them; under s. 58(2), a charge for work for which an " +
          "estimate was given may not exceed the estimate by more than 10 per cent; under s. 56(2), " +
          "where the consumer declined an estimate, the charge may not exceed the maximum amount the " +
          "consumer authorized; and under s. 59, an authorization not given in writing is not " +
          "effective unless it is recorded in a manner that meets the prescribed requirements.",
        whenThisComesUp: "When the shop's Defence says the extra charges were separately authorized, or that the original estimate covered the final amount.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
            pinpoint: "Consumer Protection Act, 2002, ss. 56(2), 58(1)-(2), 59",
          },
        ],
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: "Parts and labour generally carry a minimum warranty of 90 days or 5,000 km, whichever comes first.",
        sourceUrl: "https://www.ontario.ca/page/car-repair-shops-your-rights",
        verifiedAt: "2026-09-30",
      },
    ],
    signals: [
      "repair shop overcharged",
      "charged more than estimate",
      "mechanic overcharged",
      "car repair warranty",
      "repair not fixed within warranty",
      "auto repair dispute",
      "charged more than the quote",
      "billed me for work not on the estimate",
      "want to charge me again for the same issue",
      "shop overcharged me for repairs",
      "repair still under warranty and they want more money",
      // Third-person framings. Every signal above assumes the complaint is
      // OVERCHARGING or a WARRANTY. The commonest repair dispute is neither:
      // the repair did not fix the fault. The vocabulary had no entry for
      // that at all, and none for "garage" as a word for the shop.
      "refuse to look at it again",
      "garage did not fix the fault",
      "same fault after the repair",
      "paid for a repair that did not work",
      "still not working after the garage charged for the job",
      "shop will not re-examine the work",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Ontario.ca — Car Repair Shops: Your Rights",
        officialUrl: "https://www.ontario.ca/page/car-repair-shops-your-rights",
        verifiedAt: "2026-09-07",
        pinpoint: "Written estimate requirement; final cost cannot exceed the estimate (or agreed maximum) by more than 10%; minimum 90-day/5,000 km warranty on parts and labour",
      },
    ],
    reviewedAt: "2026-09-07",
    status: "reviewed",
  },
  {
    id: "sc-claim-used-vehicle-nondisclosure",
    name: "Used vehicle purchase — non-disclosure by a dealer",
    broughtBy: "The buyer of a used vehicle from a dealer.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "dealer-failed-to-disclose",
        name: "The dealer failed to give accurate required information about the vehicle",
        plainExplanation:
          "Where a REGISTERED motor vehicle dealer sells or leases a vehicle to someone who is not " +
          "themselves a registered dealer, the regulation under the Motor Vehicle Dealers Act, 2002 " +
          "requires the contract to include specific information (O. Reg. 333/08, ss. 39(2), 41(1), 42). For a used " +
          "vehicle that includes the total distance it has been driven (or, where the dealer can't " +
          "determine that, the distance as of a stated past date), the make, model and model year, " +
          "how it was last classified if it has been classified as irreparable, salvage or rebuilt, and certain past uses: " +
          "leased on a daily basis (with an exception), used as a police cruiser or to provide emergency services, or used as a taxi or limousine. " +
          "This regime applies to registered dealers. A genuinely private sale is not covered by it, " +
          "and neither is a sale by someone selling vehicles as a business without being registered.",
        sourceUrl: "https://www.ontario.ca/laws/docs/080333_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-01-01",
        evidenceCategories: [
          {
            name: "Purchase and vehicle history records",
            why: "Shows what the dealer said or provided versus the vehicle's actual history.",
            examples: ["Bill of sale or contract", "Vehicle history report", "Any written disclosure given at the time of sale"],
          },
        ],
      },
      {
        id: "cancelled-within-90-days",
        name: "The contract was cancelled within 90 days of actually receiving the vehicle",
        plainExplanation:
          "Where this cancellation right applies, the regulation gives 90 days to cancel -- but the " +
          "clock runs from when the buyer ACTUALLY RECEIVED the vehicle, not from when they " +
          "discovered the problem. Discovering an undisclosed issue on day 95 does not extend it. " +
          "The right is also narrower than the disclosure list as a whole: it attaches to inaccurate " +
          "disclosure of the distance driven, certain past uses, the make/model/model year, and the " +
          "irreparable/salvage/rebuilt classification -- not to every item a dealer must disclose. " +
          "It is available even if the dealer did not know the information was inaccurate or honestly " +
          "believed it was correct. Notice of cancellation has to be in writing and given to the " +
          "dealer, and can be worded in any way that shows an intention to cancel. A distance " +
          "disclosure counts as accurate if it is within the lesser of 5 per cent or 1,000 kilometres " +
          "of the correct figure. A person who leased the vehicle and then bought it from the dealer " +
          "cannot use this right to cancel the purchase (O. Reg. 333/08, s. 50).",
        sourceUrl: "https://www.ontario.ca/laws/docs/080333_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-01-01",
        evidenceCategories: [
          {
            name: "Proof of cancellation",
            why: "Shows the cancellation step was taken in writing, and when, relative to the date the vehicle was actually received.",
            examples: ["Copy of the written cancellation notice sent to the dealer", "Date-stamped email or letter", "Delivery record showing when the vehicle was actually received"],
          },
        ],
      },
      {
        id: "amount-claimed-vehicle",
        name: "The amount claimed reflects the loss",
        plainExplanation:
          "Ontario's Small Claims Court guide says the reasons for a claim should \"calculate and " +
          "explain the amount of money and any interest you are claiming\", with copies of supporting " +
          "documents attached to the claim. This part of the checklist is about the loss claimed and " +
          "how it is calculated.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Cost documentation",
            why: "Supports the specific dollar amount claimed.",
            examples: ["Purchase price", "Amount paid before cancelling", "Repair or diminished-value estimate, if relevant"],
          },
        ],
      },
      {
        id: "amount-within-jurisdiction-vehicle",
        name: "The amount claimed falls within Small Claims Court's jurisdiction",
        plainExplanation:
          "Ontario's Small Claims Court guide says the court \"can handle any action for the payment of " +
          "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
          "excluding interest and costs such as court fees.\" The $50,000 figure is the amount " +
          "prescribed by O. Reg. 626/00, s. 1(1), for the court's jurisdiction under s. 23(1) of the " +
          "Courts of Justice Act.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/000626_e.doc", "pinpoint": "O. Reg. 626/00, s. 1(1)"}, {"sourceUrl": "https://www.ontario.ca/laws/docs/90c43_e.doc", "pinpoint": "Courts of Justice Act, s. 23(1)"}],
        evidenceCategories: [
          {
            name: "Cost documentation",
            why: "Supports the specific dollar amount claimed.",
            examples: ["Bill of sale showing the purchase price", "Records documenting the loss claimed"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-nondisclosure",
        name: "The dealer disputes that required information was withheld or inaccurate",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a defendant who wishes to dispute the claim serves " +
          "the Defence on every other party and files it, with proof of service, within 20 days of " +
          "being served with the claim. This topic is about a Defence whose reasons dispute that " +
          "required information was missing or inaccurate.",
        whenThisComesUp: "When the dealer's Defence says the information provided was accurate and complete.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under O. Reg. 333/08, a customer of a registered motor vehicle dealer may be entitled to " +
          "compensation from the Motor Vehicle Dealers Compensation Fund for a pecuniary loss arising " +
          "from a trade with the dealer, where the conditions in s. 79 are met -- including that the " +
          "customer acted as a consumer, and gave the dealer a written demand for payment that the " +
          "dealer refused or was unable to pay. Written notice of the claim goes to the registrar " +
          "within two years after the claim first meets the requirements of s. 79(3), and the Board " +
          "may extend that time (s. 80). Total compensation for a claim cannot exceed $45,000 " +
          "(s. 83(5)).",
        sourceUrl: "https://www.ontario.ca/laws/docs/080333_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-01-01",
      },
    ],
    signals: [
      "dealer didn't disclose",
      "used car dealer lied",
      "odometer rolled back",
      "salvage title not disclosed",
      "sold as taxi not disclosed",
      "vehicle history hidden",
      "rebuilt vehicle not disclosed",
      "never told me it had been in an accident",
      "odometer had been tampered with",
      "used to be a rental and they hid that",
      "hid the vehicle's history",
      "didn't tell me about the accident before I bought it",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Ontario.ca — Buying a New or Used Vehicle: Your Rights",
        officialUrl: "https://www.ontario.ca/page/buying-new-or-used-vehicle-your-rights",
        verifiedAt: "2026-09-07",
        pinpoint: "Dealer disclosure obligations; 90-day cancellation right for inaccurate disclosure; Motor Vehicle Dealers Compensation Fund",
      },
      {
        sourceName: "O. Reg. 333/08 (General) under the Motor Vehicle Dealers Act, 2002",
        officialUrl: "https://www.ontario.ca/laws/docs/080333_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint:
          "s.50(1): cancellation right arises where a registered motor vehicle dealer contracted with another person who was NOT a registered dealer, and disclosure under s.42 paras. 3, 4, 7, 17 or 23 was inaccurate",
      },
      {
        sourceName: "O. Reg. 333/08 (General) under the Motor Vehicle Dealers Act, 2002",
        officialUrl: "https://www.ontario.ca/laws/docs/080333_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint:
          "s.50(5): a person may not cancel a contract under s.50(1) more than 90 days after actually receiving the motor vehicle",
      },
      {
        sourceName: "O. Reg. 333/08 (General) under the Motor Vehicle Dealers Act, 2002",
        officialUrl: "https://www.ontario.ca/laws/docs/080333_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint:
          "s.50(2): the right applies even if the dealer did not know the information was inaccurate or believed it to be accurate; s.50(4): a distance disclosure is deemed accurate if within the lesser of 5 per cent or 1,000 km; s.50(6): notice of cancellation must be in writing, in any words showing an intention to cancel, given to the dealer",
      },
      {
        sourceName: "O. Reg. 333/08 (General) under the Motor Vehicle Dealers Act, 2002",
        officialUrl: "https://www.ontario.ca/laws/docs/080333_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint:
          "s.42 paras. 3 and 4 (total distance driven, or distance as of a stated past date), 7 (past use as a daily rental, police cruiser or emergency-services vehicle), 17 (make, model and model year), 23 (classification as irreparable, salvage or rebuilt)",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "s.23(1)(a): Small Claims Court has jurisdiction in any action for the payment of money where the amount claimed does not exceed the prescribed amount, exclusive of interest and costs",
      },
      {
        sourceName: "Ontario Superior Court of Justice — Steps in a Civil Case",
        officialUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-11",
        pinpoint: "The plaintiff must prove their case on a balance of probabilities",
      },
    ],
    reviewedAt: "2026-09-11",
    status: "reviewed",
  },
  {
    id: "sc-claim-unpaid-condo-common-expenses",
    name: "Unpaid condominium common expenses",
    broughtBy: "The condominium corporation owed common expenses by a unit owner.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "plaintiff-is-condo-corp",
        name: "The plaintiff is the condominium corporation and the defendant is a unit owner",
        plainExplanation:
          "The Condominium Act, 1998 governs the relationship between a condominium corporation and " +
          "its unit owners, including the corporation's right to collect common expenses.",
        sourceUrl: "https://www.ontario.ca/laws/docs/98c19_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-31",
        evidenceCategories: [
          {
            name: "Condominium records",
            why: "Establishes the corporation's status and the defendant's ownership of the unit.",
            examples: ["Status certificate", "Declaration or registration records", "Ownership record for the unit"],
          },
        ],
      },
      {
        id: "owner-defaulted-common-expenses",
        name: "The owner defaulted in paying common expenses owed to the corporation",
        plainExplanation:
          "When an owner fails to pay common expenses owed to the corporation, a lien arises against " +
          "that owner's unit for the unpaid amount, including interest and the corporation's " +
          "reasonable costs of collecting it.",
        sourceUrl: "https://www.ontario.ca/laws/docs/98c19_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-31",
        evidenceCategories: [
          {
            name: "Common-expense records",
            why: "Shows the amount assessed, billed, and unpaid.",
            examples: ["Common-expense/maintenance fee statements", "Payment history", "Board or property-management correspondence about the arrears"],
          },
        ],
      },
      {
        id: "amount-within-jurisdiction-condo",
        name: "The amount owing falls within Small Claims Court's jurisdiction",
        plainExplanation:
          "Small Claims Court can only hear claims up to $50,000, excluding interest and costs.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Arrears calculation",
            why: "Supports the specific dollar amount claimed.",
            examples: ["Statement of the account in arrears", "Interest calculation", "Records of any partial payments"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-amount-assessed",
        name: "The owner disputes that the common-expense amount was properly assessed or owing",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a defendant who wishes to dispute the claim serves " +
          "the Defence on every other party and files it, with proof of service, within 20 days of " +
          "being served with the claim. This topic is about a Defence whose reasons dispute how the " +
          "common-expense amount was assessed or calculated.",
        whenThisComesUp: "When the owner's Defence disputes the calculation or validity of the amount claimed, not just an inability to pay.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "A condominium corporation's lien for unpaid common expenses has priority over every " +
          "registered and unregistered encumbrance EVEN THOUGH the encumbrance existed before the " +
          "lien arose -- the test is not when the encumbrance was registered. It does not have " +
          "priority over a Crown claim other than by way of mortgage, over taxes, charges, rates or " +
          "assessments under the Municipal Act, 2001, the City of Toronto Act, 2006, the Education Act " +
          "or the Local Roads Boards Act, or over a prescribed lien or claim. These rules are in s. 86(1) " +
          "of the Condominium Act, 1998, which is subject to s. 86(2): a lien in respect of a unit for " +
          "non-residential purposes does not have this priority for amounts the owner defaulted on " +
          "before the section came into force.",
        sourceUrl: "https://www.ontario.ca/laws/docs/98c19_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-31",
      },
      {
        note:
          "That priority is conditional on notice. The corporation must give written notice of the " +
          "lien to every encumbrancer whose encumbrance is registered against the unit's title, on or " +
          "before the day the certificate of lien is registered, by personal service or registered " +
          "prepaid mail to the encumbrancer's last known address. Without that notice the lien LOSES " +
          "its priority over that encumbrance. Where notice is given late, the lien keeps priority " +
          "only to the extent of the common-expense arrears that accrued in the three months before " +
          "notice was given and continue to accrue after, plus interest and reasonable legal costs " +
          "and expenses on those arrears.",
        sourceUrl: "https://www.ontario.ca/laws/docs/98c19_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-31",
      },
      {
        note:
          "Under s. 85 of the Condominium Act, 1998, the lien expires three months after the default " +
          "that gave rise to it unless the corporation registers a certificate of lien within that " +
          "time. At least 10 days before registering the certificate, the corporation must give the " +
          "affected owner written notice of the lien. Under s. 85(6), the lien may be enforced in the " +
          "same manner as a mortgage. Small Claims Court's jurisdiction under s. 23(1) of the Courts " +
          "of Justice Act is over actions for the payment of money and for the recovery of possession " +
          "of personal property; enforcing the lien against the unit itself is not among them.",
        sourceUrl: "https://www.ontario.ca/laws/docs/98c19_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-31",
      },
    ],
    signals: [
      "condo fees unpaid",
      "unpaid common expenses",
      "condo corporation suing owner",
      "maintenance fees not paid",
      "condo arrears",
      "behind on my monthly fees",
      "haven't paid my maintenance dues",
      "corporation is coming after me for expenses",
      "condo board says I owe",
      "behind on condo fees",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Condominium Act, 1998, S.O. 1998, c. 19",
        officialUrl: "https://www.ontario.ca/laws/docs/98c19_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint:
          "s.85(1): lien for unpaid common expenses, covering the unpaid amount plus all interest owing and reasonable legal costs and expenses of collection; s.85(2): the lien expires 3 months after the default unless a certificate of lien is registered; s.85(4): at least 10 days' written notice to the owner before registration; s.85(6): a registered lien may be enforced in the same manner as a mortgage",
      },
      {
        sourceName: "Condominium Act, 1998, S.O. 1998, c. 19",
        officialUrl: "https://www.ontario.ca/laws/docs/98c19_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint:
          "s.86(1): the lien \"has priority over every registered and unregistered encumbrance even though the encumbrance existed before the lien arose\", but not over (a) a Crown claim other than by way of mortgage, (b) taxes/charges/rates/assessments under the Municipal Act, 2001, the City of Toronto Act, 2006, the Education Act or the Local Roads Boards Act, or (c) a prescribed lien or claim",
      },
      {
        sourceName: "Condominium Act, 1998, S.O. 1998, c. 19",
        officialUrl: "https://www.ontario.ca/laws/docs/98c19_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint:
          "s.86(3)-(4): written notice of the lien to every registered encumbrancer, on or before the day the certificate is registered, by personal service or registered prepaid mail; s.86(5): without that notice the lien loses its priority over the encumbrance; s.86(6): where notice is late, priority is kept only for arrears accruing in the 3 months before notice and continuing after, plus interest and reasonable legal costs and expenses",
      },
    ],
    reviewedAt: "2026-09-11",
    status: "reviewed",
  },
  {
    id: "sc-claim-defamation-libel-slander",
    name: "Defamation (libel or slander)",
    broughtBy: "The person or business who says words that would tend to lower their reputation were said or written about them and communicated to someone else.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "words-defamatory-scdefam",
        name: "The words were defamatory",
        plainExplanation:
          "In Grant v. Torstar Corp., 2009 SCC 61, the Supreme Court of Canada said a plaintiff in a " +
          "defamation action is required to prove three things to obtain judgment and an award of damages. " +
          "The first is \"that the impugned words were defamatory, in the sense that they would tend to " +
          "lower the plaintiff's reputation in the eyes of a reasonable person\" (para. 28). The other two " +
          "-- that the words referred to the plaintiff, and that they were published -- are the next parts " +
          "of this checklist. The Court said that if the plaintiff proves the required elements, \"the " +
          "onus then shifts to the defendant to advance a defence in order to escape liability\" (para. " +
          "29).",
        sourceUrl: "docs/sources/grant-v-torstar-2009-SCC-61.pdf",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "The exact words",
            why: "Records precisely what was said or written.",
            examples: ["Screenshot, printout or copy of the post, message or publication", "Recording or transcript of what was said", "Date and place it appeared"],
          },
          {
            name: "The full context",
            why: "Shows the statement as a reader or listener would have met it.",
            examples: ["The whole post, thread or conversation, not just the sentence", "Headlines, photos or captions that went with it"],
          },
        ],
      },
      {
        id: "words-refer-to-plaintiff-scdefam",
        name: "The words referred to the plaintiff",
        plainExplanation:
          "The second thing the Supreme Court of Canada listed in Grant v. Torstar Corp., 2009 SCC 61, is " +
          "\"that the words in fact referred to the plaintiff\" (para. 28). This part of the checklist is " +
          "about how the statement identifies the person or business it is about.",
        sourceUrl: "docs/sources/grant-v-torstar-2009-SCC-61.pdf",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "How the plaintiff is identified",
            why: "Shows who the statement is about.",
            examples: ["Name, photo, tag, username or business name used in the statement", "Details in the statement that point to the plaintiff"],
          },
        ],
      },
      {
        id: "statement-made-and-communicated",
        name:
          "The words were published -- communicated to at least one person other than the plaintiff",
        plainExplanation:
          "The third thing the Supreme Court of Canada listed in Grant v. Torstar Corp., 2009 SCC 61, as " +
          "something a plaintiff in a defamation action must prove is \"that the words were published, " +
          "meaning that they were communicated to at least one person other than the plaintiff\" (para. " +
          "28). The Court went on: \"If these elements are established on a balance of probabilities, " +
          "falsity and damage are presumed\", with one exception: slander requires proof of special " +
          "damages, unless the words were slanderous per se (para. 28). This part of the checklist is " +
          "about what was said or written, and who it reached besides the person it was about.",
        sourceUrl: "docs/sources/grant-v-torstar-2009-SCC-61.pdf",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "The statement itself",
            why: "Documents exactly what was said or written and where.",
            examples: ["Screenshot or copy of the post, message, or publication", "Recording or transcript of what was said", "Witness names for anything spoken"],
          },
          {
            name: "Proof it was seen or heard by someone else",
            why: "Shows the statement reached a third party, not just the plaintiff.",
            examples: ["Comments or reactions from others", "Witness account of who else saw or heard it", "Share/view counts or forwarded copies"],
          },
        ],
      },
      {
        id: "amount-within-jurisdiction-defamation",
        name: "The amount claimed falls within Small Claims Court's jurisdiction",
        plainExplanation:
          "Ontario's Small Claims Court guide says the court \"can handle any action for the payment of " +
          "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
          "excluding interest and costs such as court fees.\" The $50,000 figure is the amount " +
          "prescribed by O. Reg. 626/00, s. 1(1), for the court's jurisdiction under s. 23(1) of the " +
          "Courts of Justice Act.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/000626_e.doc", "pinpoint": "O. Reg. 626/00, s. 1(1)"}, {"sourceUrl": "https://www.ontario.ca/laws/docs/90c43_e.doc", "pinpoint": "Courts of Justice Act, s. 23(1)"}],
        evidenceCategories: [
          {
            name: "Cost/harm documentation",
            why: "Supports the specific dollar amount claimed.",
            examples: ["Lost income or business records, if claiming financial loss", "Costs incurred responding to the statement", "Any other documented financial impact"],
          },
        ],
      },
      {
        id: "notice-if-newspaper-or-broadcast",
        name: "If this involved a newspaper or broadcast specifically, written notice was given within 6 weeks",
        plainExplanation:
          "Under s. 5(1) of the Libel and Slander Act, no action for libel in a newspaper or in a " +
          "broadcast lies unless the plaintiff gave the defendant written notice, specifying the matter " +
          "complained of, within six weeks after the alleged libel came to the plaintiff's knowledge. " +
          "The notice must be served in the same manner as a statement of claim, or by delivering it to " +
          "a grown-up person at the defendant's chief office. Section 1(1) defines \"newspaper\" and " +
          "\"broadcasting\", and s. 7 says this applies only to newspapers printed and published in " +
          "Ontario and to broadcasts from a station in Ontario. Section 8 also limits who can rely on " +
          "ss. 5 and 6: a newspaper defendant is not entitled to their benefit unless the names of the " +
          "proprietor and publisher and the address of publication are stated at the head of the " +
          "editorials or on the front page (s. 8(1)), and for a broadcast they do not apply if, after a " +
          "registered-letter request, the station's owner or operator does not supply the requested " +
          "names and addresses within the time s. 8(3) allows. Whether a particular publication fits " +
          "those definitions is a question to check, not something this content assumes.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90l12_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2015-11-03",
        evidenceCategories: [
          {
            name: "Copy of the written notice sent",
            why: "Shows the notice step was taken and when, if this Act's notice requirement applies.",
            examples: ["Copy of the notice letter", "Date-stamped delivery or service record", "Confirmation the defendant received it"],
          },
        ],
      },
      {
        id: "limitation-if-newspaper-or-broadcast",
        name: "If this involved a newspaper or broadcast specifically, the action was started within 3 months",
        plainExplanation:
          "Under s. 6 of the Libel and Slander Act, an action for a libel in a newspaper or in a " +
          "broadcast must be started within three months after the libel came to the knowledge of the " +
          "person defamed. Section 7 says this applies only to newspapers printed and published in " +
          "Ontario and to broadcasts from a station in Ontario. If the action is started within the " +
          "three months, it may also include a claim for any other libel against the plaintiff by the " +
          "same defendant in the same newspaper or from the same broadcasting station within the year " +
          "before the action started. Section 8 also limits who can rely on ss. 5 and 6: a newspaper " +
          "defendant is not entitled to their benefit unless the names of the proprietor and publisher " +
          "and the address of publication are stated at the head of the editorials or on the front page " +
          "(s. 8(1)), and for a broadcast they do not apply if, after a registered-letter request, the " +
          "station's owner or operator does not supply the requested names and addresses within the " +
          "time s. 8(3) allows.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90l12_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2015-11-03",
        evidenceCategories: [
          {
            name: "Records establishing when the statement was discovered",
            why: "Supports when the 6-week notice and 3-month limitation clocks started, if this Act's provisions apply.",
            examples: ["Date the post/broadcast was first seen or heard", "Message or email showing when it was brought to your attention"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-statement-made-or-false",
        name: "The defendant disputes making the statement, disputes that it was defamatory or about the plaintiff, or says it was true",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is based " +
          "on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a defendant who " +
          "wishes to dispute the claim serves the Defence on every other party and files it, with proof of " +
          "service, within 20 days of being served with the claim. In Grant v. Torstar Corp., 2009 SCC 61, " +
          "the Supreme Court of Canada said that once the plaintiff proves the required elements, falsity " +
          "and damage are presumed and the onus shifts to the defendant to advance a defence (paras. " +
          "28-29); to succeed on the defence of justification, a defendant must show the statement was " +
          "substantially true (para. 33). This topic is about a Defence whose reasons dispute that the " +
          "statement was made, that it was defamatory, or that it referred to the plaintiff, or that say " +
          "it was substantially true.",
        whenThisComesUp: "When the defendant has filed a Defence (Form 9A) disputing the statement itself, not just the amount claimed.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
        alsoCites: [{"sourceUrl": "docs/sources/grant-v-torstar-2009-SCC-61.pdf", "pinpoint": "Grant v. Torstar Corp., 2009 SCC 61, paras. 28-29, 33"}],
      },
      {
        id: "responsible-communication-public-interest",
        name: "The defendant argues the statement was responsible communication on a matter of public interest",
        plainExplanation:
          "In Grant v. Torstar Corp., 2009 SCC 61, the Supreme Court of Canada recognized a defence of " +
          "responsible communication on matters of public interest. It applies where the publication is " +
          "on a matter of public interest and the publisher was diligent in trying to verify the " +
          "allegation, having regard to factors including the seriousness of the allegation, the public " +
          "importance of the matter, its urgency, the status and reliability of the source, whether the " +
          "plaintiff's side was sought and accurately reported, whether including the defamatory " +
          "statement was justifiable, whether its public interest lay in the fact that it was made " +
          "rather than in its truth, and any other relevant circumstances (para. 126). The Court said " +
          "the defence is available to anyone who publishes material of public interest in any medium " +
          "(para. 96), noting that many defamation actions now concern blog postings and other online " +
          "media (para. 97).",
        whenThisComesUp: "When the statement was published rather than said privately -- an online review, a post, a blog, or any other publication -- and the defendant says it concerned a matter the public had a genuine stake in.",
        sourceUrl: "docs/sources/grant-v-torstar-2009-SCC-61.pdf",
        verifiedAt: "2026-09-30",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "The Libel and Slander Act's shortened notice and limitation regime is also conditional on " +
          "the publisher identifying itself: a defendant in an action for libel in a newspaper is not " +
          "entitled to the benefit of sections 5 and 6 unless the names of the proprietor and publisher " +
          "and the address of publication are stated either at the head of the editorials or on the " +
          "front page. Where that information is absent, the shortened deadlines do not protect the " +
          "defendant.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90l12_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2015-11-03",
      },
      {
        note:
          "In Hill v. Church of Scientology of Toronto, [1995] 2 S.C.R. 1130, the Supreme Court of " +
          "Canada said that general damages in defamation cases are presumed from the very publication " +
          "of the false statement and are awarded at large (at p. 1196). The Court also saw no reason " +
          "to adopt the United States \"actual malice\" rule from New York Times v. Sullivan in Canada in " +
          "an action between private litigants (at p. 1187).",
        sourceUrl: "docs/sources/hill-v-church-of-scientology-1995-2-SCR-1130.pdf",
        verifiedAt: "2026-09-30",
      },
      {
        note:
          "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "cannot be started after the second anniversary of the day the claim was discovered. Section " +
          "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
          "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
          "omission, that the act or omission was that of the person the claim is against, and that, " +
          "having regard to the nature of the injury, loss or damage, a proceeding would be an " +
          "appropriate means to seek to remedy it -- and the day a reasonable " +
          "person with their abilities and in their circumstances first ought to have known those " +
          "things. Under s. 5(2), a person with a claim is presumed to have known of those matters on " +
          "the day the act or omission the claim is based on took place, unless the contrary is proved. " +
          "The Libel and Slander Act sets a shorter three-month period for libel in an Ontario " +
          "newspaper or broadcast -- see that entry.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
    ],
    signals: [
      "defamation",
      "defamed me",
      "slander",
      "libel",
      "spread lies about me",
      "false statements about me",
      "posted false things about me",
      "damaged my reputation",
      "telling people lies about me",
      "posted a false review about me",
      "spreading rumors that aren't true",
      "saying things about me that aren't true",
      "made up claims about me",
      // Added after a walkthrough: a defamation story reading "she told the
      // school that I had been charged with fraud, none of it is true"
      // matched NONE of the signals above, because every one of them is a
      // first-person phrase ("about me", "my reputation") and the story was
      // not written that way. These cover the plain framings people use.
      "told people something that was not true",
      "said untrue things",
      "untrue statements",
      "harmed my reputation",
      "hurt my reputation",
      "accused me of something i did not do",
      "lied to others about me",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "s.23(1): Small Claims Court jurisdiction is any action for payment of money up to the prescribed amount, with no cause-of-action exclusion",
      },
      {
        sourceName: "Libel and Slander Act, R.S.O. 1990, c. L.12",
        officialUrl: "https://www.ontario.ca/laws/docs/90l12_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "s.1 definitions of newspaper/broadcasting; s.5(1) 6-week pre-action notice; s.6 3-month limitation period, including same-defendant libels in the preceding year",
      },
      {
        sourceName: "Libel and Slander Act, R.S.O. 1990, c. L.12",
        officialUrl: "https://www.ontario.ca/laws/docs/90l12_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint:
          "s.7: \"Subsection 5 (1) and section 6 apply only to newspapers printed and published in Ontario and to broadcasts from a station in Ontario\" -- a geographic limit on the shortened notice/limitation regime, not a restatement of the newspaper/broadcast category limit",
      },
      {
        sourceName: "Libel and Slander Act, R.S.O. 1990, c. L.12",
        officialUrl: "https://www.ontario.ca/laws/docs/90l12_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint:
          "s.8(1): no defendant in an action for a libel in a newspaper is entitled to the benefit of ss.5 and 6 unless the names of the proprietor and publisher and the address of publication are stated at the head of the editorials or on the front page",
      },
      {
        sourceName: "Supreme Court of Canada — Grant v. Torstar Corp., 2009 SCC 61",
        officialUrl: "docs/sources/grant-v-torstar-2009-SCC-61.pdf",
        verifiedAt: "2026-09-11",
        pinpoint:
          "paras. 96-98 and 126 -- the two-element test for responsible communication on matters of public interest (public interest; diligence in verification, assessed against the listed factors), and its availability to \"anyone who publishes material of public interest in any medium\", expressly including blog postings and other online media",
      },
      {
        sourceName: "Supreme Court of Canada — Hill v. Church of Scientology of Toronto, [1995] 2 S.C.R. 1130",
        officialUrl: "docs/sources/hill-v-church-of-scientology-1995-2-SCR-1130.pdf",
        verifiedAt: "2026-09-11",
        pinpoint:
          "para. 164 -- \"general damages in defamation cases are presumed from the very publication of the false statement and are awarded at large\"; para. 137 -- declining to adopt the New York Times v. Sullivan \"actual malice\" standard in an action between private litigants",
      },
    ],
    reviewedAt: "2026-09-11",
    status: "reviewed",
  },
  {
    id: "sc-claim-vehicle-accident-uninsured-driver-property-damage",
    name: "Vehicle accident property damage -- direct claim against an uninsured at-fault driver",
    broughtBy: "The owner of a vehicle (or other property) damaged in a collision where section 263 of the " +
      "Insurance Act does not apply -- for example, because no other automobile involved was insured " +
      "under a motor vehicle liability policy as s. 263(1)(c) describes, or the damaged automobile " +
      "itself was not (s. 263(1)(b)).",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "dcpd-bar-does-not-apply",
        name: "Ontario's direct-compensation insurance bar does not apply to this claim",
        plainExplanation:
          "Under section 263 of the Insurance Act, when a vehicle is damaged by one or more other " +
          "vehicles and BOTH the damaged vehicle and at least one other vehicle involved are insured " +
          "under a motor vehicle liability policy issued by an insurer licensed to undertake automobile " +
          "insurance in Ontario (or one that has filed an undertaking to be bound by this section), the " +
          "owner generally has no right of action against the other driver for damage to their vehicle " +
          "or its contents -- they must instead claim from their own insurer, with recovery based on " +
          "fault as determined under the Fault Determination Rules. Section 263 applies only if the " +
          "damaged vehicle AND at least one other vehicle involved in the accident are insured under " +
          "such a policy (s. 263(1)(b)-(c)), or, under s. 263(1.1), where a vehicle is exempt from " +
          "compulsory insurance and the organization financially responsible for it has filed an " +
          "undertaking to be bound. In a multi-vehicle accident, the section can apply even if the " +
          "at-fault vehicle itself was uninsured, as long as another vehicle involved was insured. " +
          "Since January 1, 2024, an insured may also elect not to claim from their own insurer under " +
          "this section, but that election on its own does not restore a right to sue the other driver " +
          "directly if section 263 otherwise applies (both vehicles insured). Confirming which " +
          "situation applies here is essential and not something this content assumes.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90i08_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-01-01",
        evidenceCategories: [
          {
            name: "Proof the other driver's vehicle was not insured",
            why: "Supports that section 263 does not apply, so the s. 263(5)(a) bar on suing the other driver would not apply either.",
            examples: ["Police collision report noting no valid insurance", "A denial or confirmation letter from your own insurer explaining why this isn't a direct-compensation claim", "Any correspondence with the other driver about their insurance status"],
          },
        ],
      },
      {
        id: "duty-of-care-negligence",
        name: "The other driver owed a duty of care",
        plainExplanation:
          "A negligence claim generally requires showing the defendant owed the plaintiff a duty of " +
          "care -- whether the relationship between the parties is close enough that one may " +
          "reasonably be said to owe the other a duty not to cause injury or loss, a question of " +
          "foreseeability moderated by policy considerations. See \"The elements of a negligence " +
          "claim\" for the fuller general framework this draws from.",
        sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Records identifying both drivers and vehicles",
            why: "Establishes who was involved and their relationship as road users.",
            examples: ["Police collision report", "Exchanged driver's licence and insurance information", "Photos of both vehicles at the scene"],
          },
        ],
      },
      {
        id: "breach-of-standard-of-care",
        name: "The other driver's conduct breached the standard of care",
        plainExplanation:
          "Conduct is negligent if it creates an unreasonable risk of harm. What specifically counted " +
          "as unreasonable driving conduct in a given situation is a further, fact-specific question " +
          "this general standard doesn't itself resolve -- it isn't a statement of particular traffic " +
          "rules.",
        sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Evidence of how the accident happened",
            why: "Supports what the other driver did that created the risk of harm.",
            examples: ["Police collision report", "Photos or video of the scene", "Dashcam or nearby security camera footage", "Witness accounts"],
          },
        ],
      },
      {
        id: "damage-to-vehicle",
        name: "The plaintiff sustained damage",
        plainExplanation: "A negligence claim generally requires that the plaintiff sustained damage -- here, damage to the vehicle or its contents.",
        sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Proof of the damage and its cost",
            why: "Supports the dollar amount claimed.",
            examples: ["Repair estimate or invoice", "Photos of the damage", "Proof of the vehicle's ownership or value"],
          },
        ],
      },
      {
        id: "causation-vehicle-accident",
        name: "The damage was caused, in fact and in law, by the other driver's breach",
        plainExplanation:
          "Causation has two parts (Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, para. 11): " +
          "whether the breach caused the harm in fact, and whether it also caused the harm in law. The " +
          "Supreme Court of Canada, in Clements v. Clements, 2012 SCC 32, said the factual part is " +
          "generally tested with the \"but for\" test -- the plaintiff must show, on a balance of " +
          "probabilities, that the injury would not have occurred but for the defendant's negligent " +
          "act. That is a factual inquiry, applied in a robust, common-sense way: scientific evidence " +
          "of precisely how much the defendant's negligence contributed is not required. (There is a " +
          "narrow exception where multiple possible wrongdoers are involved -- see \"The elements of a " +
          "negligence claim\" for the fuller general framework, including when that exception applies.) " +
          "The legal part -- remoteness -- asks, in the words of Mustapha v. Culligan of Canada Ltd., " +
          "2008 SCC 27, whether \"the harm [is] too unrelated to the wrongful conduct to hold the " +
          "defendant fairly liable\"; a harm is reasonably foreseeable if it is a \"real risk\" that a " +
          "reasonable person in the defendant's position would not \"brush aside as far-fetched\" (paras. " +
          "12-13).",
        sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2012/2012scc32/2012scc32.html",
        verifiedAt: "2026-09-30",
        alsoCites: [{"sourceUrl": "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html", "pinpoint": "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, paras. 11-13"}],
        evidenceCategories: [
          {
            name: "Evidence connecting the damage to this specific incident",
            why: "Shows the damage resulted from this collision, not a pre-existing or separate cause.",
            examples: ["Photos taken at or soon after the scene", "A repair shop assessment tying the damage to this collision", "Police report"],
          },
        ],
      },
      {
        id: "amount-within-jurisdiction-vehicle-accident",
        name: "The amount claimed falls within Small Claims Court's jurisdiction",
        plainExplanation:
          "Ontario's Small Claims Court guide says the court \"can handle any action for the payment of " +
          "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
          "excluding interest and costs such as court fees.\" The $50,000 figure is the amount " +
          "prescribed by O. Reg. 626/00, s. 1(1), for the court's jurisdiction under s. 23(1) of the " +
          "Courts of Justice Act.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/000626_e.doc", "pinpoint": "O. Reg. 626/00, s. 1(1)"}, {"sourceUrl": "https://www.ontario.ca/laws/docs/90c43_e.doc", "pinpoint": "Courts of Justice Act, s. 23(1)"}],
        evidenceCategories: [
          {
            name: "Cost documentation",
            why: "Supports the specific dollar amount claimed.",
            examples: ["Repair estimate or invoice", "Total cost of replacement, if the vehicle was written off"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "defendant-was-actually-insured",
        name: "The defendant says their vehicle was insured, or that section 263 applies after all",
        plainExplanation:
          "If the defendant shows their vehicle was insured under a motor vehicle liability policy " +
          "bound by section 263 of the Insurance Act at the time of the accident, section 263 may " +
          "apply after all -- meaning the plaintiff's ordinary remedy is a claim against their own " +
          "insurer, not a direct action against this defendant.",
        whenThisComesUp: "When the defendant's Defence disputes the premise that their vehicle was uninsured, or says section 263 applies for another reason.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90i08_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-01-01",
      },
      {
        id: "dispute-fault-or-causation-vehicle-accident",
        name: "The defendant disputes being at fault, or that their vehicle caused the damage",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a defendant who wishes to dispute the claim serves " +
          "the Defence on every other party and files it, with proof of service, within 20 days of " +
          "being served with the claim. This topic is about a Defence whose reasons dispute fault, or " +
          "that the defendant's vehicle caused the damage.",
        whenThisComesUp: "When the defendant has filed a Defence (Form 9A) disputing fault or causation, not just the amount claimed.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    applicableDefenceConceptIds: ["defence-contributory-negligence", "defence-limitation-period-expired", "defence-set-off-or-counterclaim", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Whether Small Claims Court is the right forum at all for a claim like this depends first on " +
          "whether section 263 of the Insurance Act applies (see the plaintiff element above) -- if it " +
          "does, the route s. 263(2) provides is a claim by the insured against their own insurer, and " +
          "s. 263(5)(a) removes the right of action against any other person involved for damage to " +
          "the automobile or its contents or for loss of use. An insured who elects under s. 263(2.2) " +
          "not to recover from their own insurer has, under s. 263(2.3)(a), no right of action against " +
          "that insurer under s. 263(2) either, in addition to the s. 263(5) restrictions.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90i08_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-01-01",
      },
      {
        note:
          "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "cannot be started after the second anniversary of the day the claim was discovered. Section " +
          "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
          "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
          "omission, that the act or omission was that of the person the claim is against, and that, " +
          "having regard to the nature of the injury, loss or damage, a proceeding would be an " +
          "appropriate means to seek to remedy it -- and the day a reasonable " +
          "person with their abilities and in their circumstances first ought to have known those " +
          "things. Under s. 5(2), a person with a claim is presumed to have known of those matters on " +
          "the day the act or omission the claim is based on took place, unless the contrary is proved.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
    ],
    signals: [
      "other driver had no insurance",
      "hit by an uninsured driver",
      "uninsured driver damaged my car",
      "car accident with an uninsured driver",
      "the other driver wasn't insured",
      "no insurance and hit my car",
      "collision with someone who had no insurance",
      "other driver's vehicle wasn't insured",
      "accident with an uninsured motorist",
      "driver who hit me had no insurance",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Insurance Act, R.S.O. 1990, c. I.8",
        officialUrl: "https://www.ontario.ca/laws/docs/90i08_e.doc",
        verifiedAt: "2026-09-10",
        pinpoint: "s.263(1): the direct-compensation section applies only when the damaged vehicle AND at least one other vehicle involved are each insured under a motor vehicle liability policy from an insurer bound by the section",
      },
      {
        sourceName: "Insurance Act, R.S.O. 1990, c. I.8",
        officialUrl: "https://www.ontario.ca/laws/docs/90i08_e.doc",
        verifiedAt: "2026-09-10",
        pinpoint: "s.263(5)(a): where the section applies, an insured has no right of action against any other person involved for damage to the insured's automobile, its contents, or loss of use",
      },
      {
        sourceName: "Insurance Act, R.S.O. 1990, c. I.8",
        officialUrl: "https://www.ontario.ca/laws/docs/90i08_e.doc",
        verifiedAt: "2026-09-10",
        pinpoint: "s.263(2)-(2.3): where the section applies, the insured recovers from their own insurer (fault-based); since 2021, c. 40, Sched. 14, s. 4 (in force 01/01/2024), an insured may elect not to make that claim, but the election does not restore a right of action against the other driver",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "para. 3 -- the four elements of a negligence claim (duty, breach, damage, causation)",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "paras. 4-5 -- duty of care: the proximity question",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "para. 7 -- standard of care: conduct is negligent if it creates an unreasonable risk of harm",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "paras. 11-13 -- causation has both a factual and a legal (remoteness) branch, judged by reasonable foreseeability",
      },
      {
        sourceName: "Supreme Court of Canada — Clements v. Clements, 2012 SCC 32",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2012/2012scc32/2012scc32.html",
        verifiedAt: "2026-09-11",
        pinpoint: "para. 8 -- the factual branch of causation: the \"but for\" test, which the plaintiff must prove on a balance of probabilities",
      },
      {
        sourceName: "Supreme Court of Canada — Clements v. Clements, 2012 SCC 32",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2012/2012scc32/2012scc32.html",
        verifiedAt: "2026-09-11",
        pinpoint: "para. 9 -- the \"but for\" test is applied in a robust common-sense fashion; no scientific evidence of the precise contribution the negligence made is required",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "s.23(1): Small Claims Court jurisdiction is any action for payment of money up to the prescribed amount, with no cause-of-action exclusion",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-claim-personal-loan-between-individuals",
    name: "Personal loan between individuals -- borrower hasn't repaid",
    broughtBy: "The person who lent money to another individual and was not repaid.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "loan-agreement-existed",
        name: "An agreement to lend money existed",
        plainExplanation:
          "The Superior Court of Justice's guide to the steps in a civil case says that in every civil " +
          "case the plaintiff has the burden of proof to establish, on a balance of probabilities, the " +
          "allegations in their claim -- evidence showing that, more likely than not, it would be " +
          "correct to rule in their favour. This part of the checklist is about the loan itself -- the " +
          "amount lent, what was said or written about repayment, and the records that show it.",
        sourceUrl: "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Proof the money was actually transferred",
            why: "Establishes that a loan, not just a conversation about one, actually happened.",
            examples: ["E-transfer or bank transfer record", "Cheque or deposit record", "Cash withdrawal matched to a message about the loan"],
          },
          {
            name: "Proof of the agreed terms",
            why: "Supports what was actually agreed to, especially where nothing was signed.",
            examples: ["A written note or IOU, if one exists", "Text messages or emails discussing the loan and repayment", "Witness account of the agreement being made"],
          },
        ],
      },
      {
        id: "amount-remains-unpaid-personal-loan",
        name: "The amount lent (or part of it) remains unpaid",
        plainExplanation:
          "Ontario's Small Claims Court guide says the reasons for a claim should \"calculate and " +
          "explain the amount of money and any interest you are claiming\", with copies of supporting " +
          "documents attached to the claim. This part of the checklist is about the amount lent, " +
          "anything repaid, and what remains outstanding.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Records of any repayment",
            why: "Shows what's already been paid back, so the outstanding balance can be calculated.",
            examples: ["Bank or e-transfer records of partial repayment", "Receipts", "A running record of payments made"],
          },
          {
            name: "Communication acknowledging the balance",
            why: "Can support both the amount owed and, separately, the limitation period (see the procedural notes below).",
            examples: ["Messages where the borrower acknowledges owing money", "A repayment plan discussed but not followed through on"],
          },
        ],
      },
      {
        id: "amount-within-jurisdiction-personal-loan",
        name: "The amount claimed falls within Small Claims Court's jurisdiction",
        plainExplanation:
          "Ontario's Small Claims Court guide says the court \"can handle any action for the payment of " +
          "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
          "excluding interest and costs such as court fees.\" The $50,000 figure is the amount " +
          "prescribed by O. Reg. 626/00, s. 1(1), for the court's jurisdiction under s. 23(1) of the " +
          "Courts of Justice Act.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/000626_e.doc", "pinpoint": "O. Reg. 626/00, s. 1(1)"}, {"sourceUrl": "https://www.ontario.ca/laws/docs/90c43_e.doc", "pinpoint": "Courts of Justice Act, s. 23(1)"}],
        evidenceCategories: [
          {
            name: "Cost documentation",
            why: "Supports the specific dollar amount claimed.",
            examples: ["A record of the amount lent", "A running record of repayments and the outstanding balance"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "argues-it-was-a-gift",
        name: "The defendant argues the money was a gift, not a loan",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a defendant who wishes to dispute the claim serves " +
          "the Defence on every other party and files it, with proof of service, within 20 days of " +
          "being served with the claim. This topic is about a Defence whose reasons say the money was a " +
          "gift and was never meant to be repaid.",
        whenThisComesUp: "When the defendant's Defence disputes that the money was ever meant to be repaid, not just the amount or the timing.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
      {
        id: "dispute-amount-still-owed-personal-loan",
        name: "The defendant disputes the amount still owed",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a defendant who wishes to dispute the claim serves " +
          "the Defence on every other party and files it, with proof of service, within 20 days of " +
          "being served with the claim. This topic is about a Defence whose reasons dispute how much is " +
          "still owed -- for example, saying some or all of it was repaid.",
        whenThisComesUp: "When the defendant's Defence disputes the outstanding balance, not whether a loan existed at all.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    applicableDefenceConceptIds: ["defence-no-agreement-existed", "defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: "Claims like this are generally subject to Ontario's standard 2-year limitation period, running from when the claim was discovered.",
        sourceUrl: "https://www.ontario.ca/page/civil-claims-suing-and-being-sued",
        verifiedAt: "2026-09-30",
      },
      {
        note:
          "Under s. 5(3) of the Limitations Act, 2002, for a demand obligation -- such as a loan " +
          "repayable on demand -- the day the loss occurs is the first day there is a failure to repay " +
          "once a demand for repayment is made, not the day the money was lent. The two-year period in " +
          "s. 4 runs from the day the claim is discovered, which depends on that and on the other " +
          "matters in s. 5(1). Under s. 5(4), this applies to every demand obligation created on or " +
          "after January 1, 2004.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
      {
        note:
          "Under s. 13 of the Limitations Act, 2002, if a person acknowledges liability for a claim for " +
          "payment of a liquidated (set) sum, the act or omission the claim is based on is treated as " +
          "having taken place on the day of the acknowledgment (s. 13(1)). The acknowledgment must be " +
          "in writing and signed by the person making it or their agent (s. 13(10)); for a liquidated " +
          "sum, a part payment of the sum by the debtor or the debtor's agent has the same effect as " +
          "that written, signed acknowledgment (s. 13(11)). Either way, it must be made to the person " +
          "with the claim or their agent (or an official receiver or trustee in bankruptcy) before the " +
          "limitation period expires (s. 13(9)).",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
    ],
    signals: [
      "lent money to a friend",
      "loaned money to my",
      "never paid me back",
      "borrowed money from me and hasn't paid",
      "money i lent him",
      "money i lent her",
      "won't pay back the money i lent",
      "personal loan between",
      "never repaid the loan",
      "friend owes me money he borrowed",
      "family member borrowed money",
      "loaned my cousin",
      // Session 48: moved here from sc-claim-unpaid-debt-services, where they
      // shadowed this claim type. Removing them from there alone left both
      // phrases matching nothing, which fell through to the AI classifier;
      // holding them here routes them to the claim type they describe.
      "loan not repaid",
      "won't pay me back for the loan",
      // Third-person framings. The 14 signals above include 9 built around a
      // first-person pronoun, and all of them assume the word "money" or
      // "loan" appears. A story saying "I lent my cousin $6,000 ... he has
      // paid nothing" contains neither.
      "agreed to pay it back and has paid nothing",
      "paid nothing back",
      "lent cash and was not paid back",
      "borrowed and has not repaid",
      "loan has not been repaid",
      "has not paid back what was lent",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "s.4 and s.5(1)-(2): basic 2-year limitation period, running from discovery of the claim",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "s.5(3)-(4): for a demand obligation, the claim is discovered on the first day of a failure to perform after a demand is made -- applies to demand obligations created on or after January 1, 2004",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "s.13(1): a written, signed acknowledgment of a liquidated-sum debt deems the claim to have arisen again on the day of the acknowledgment; s.13(10): the acknowledgment must be in writing and signed; s.13(11): part payment has the same effect as a written acknowledgment",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "s.23(1): Small Claims Court jurisdiction is any action for payment of money up to the prescribed amount, with no cause-of-action exclusion",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "sc-claim-property-damaged-lost-in-business-care",
    name: "Property damaged, lost, or not returned while left in a business's care",
    broughtBy: "The owner whose belongings were damaged, lost, or not returned by a business that had them.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "duty-of-care-property-in-business-care",
        name: "The business owed a duty of care (general negligence framework)",
        plainExplanation:
          "A negligence claim generally requires showing the defendant owed the plaintiff a duty of " +
          "care -- whether the relationship between the parties is close enough that one may " +
          "reasonably be said to owe the other a duty not to cause injury or loss, a question of " +
          "foreseeability moderated by policy considerations. See \"The elements of a negligence " +
          "claim\" for the fuller general framework this draws from.",
        sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Proof the business had possession of the property",
            why: "Establishes the relationship the duty of care is said to arise from.",
            examples: ["Drop-off receipt, ticket, or work order", "Photos or messages showing the item was left with the business", "Staff correspondence confirming they had it"],
          },
        ],
      },
      {
        id: "breach-of-standard-of-care-property-in-care",
        name: "The business's conduct breached the standard of care",
        plainExplanation:
          "Conduct is negligent if it creates an unreasonable risk of harm. What specifically counted " +
          "as unreasonable handling or safekeeping in a given situation is a further, fact-specific " +
          "question this general standard doesn't itself resolve.",
        sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Evidence of how the loss or damage happened, if known",
            why: "Supports what the business did (or failed to do) that created the risk.",
            examples: ["Any explanation the business gave for what happened", "Photos of the condition of the premises or storage area, if available", "Witness accounts"],
          },
        ],
      },
      {
        id: "damage-or-loss-to-property-in-care",
        name: "The plaintiff sustained damage",
        plainExplanation: "A negligence claim generally requires that the plaintiff sustained damage -- here, damage to, or loss of, the property left with the business.",
        sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "Proof of the property's condition and value",
            why: "Supports the dollar amount claimed.",
            examples: ["Photos of the item before it was left with the business, if available", "A receipt or appraisal showing its value", "A repair or replacement estimate"],
          },
        ],
      },
      {
        id: "causation-property-in-care",
        name: "The damage or loss was caused, in fact and in law, by the business's breach",
        plainExplanation:
          "Causation has two parts (Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, para. 11): " +
          "whether the breach caused the harm in fact, and whether it also caused the harm in law. The " +
          "Supreme Court of Canada, in Clements v. Clements, 2012 SCC 32, said the factual part is " +
          "generally tested with the \"but for\" test -- the plaintiff must show, on a balance of " +
          "probabilities, that the damage or loss would not have occurred but for the defendant's " +
          "negligent act. That is a factual inquiry, applied in a robust, common-sense way: scientific " +
          "evidence of precisely how much the defendant's negligence contributed is not required. " +
          "(There is a narrow exception where multiple possible wrongdoers are involved -- see \"The " +
          "elements of a negligence claim\" for the fuller general framework, including when that " +
          "exception applies.) The legal part -- remoteness -- asks, in the words of Mustapha v. " +
          "Culligan of Canada Ltd., 2008 SCC 27, whether \"the harm [is] too unrelated to the wrongful " +
          "conduct to hold the defendant fairly liable\"; a harm is reasonably foreseeable if it is a " +
          "\"real risk\" that a reasonable person in the defendant's position would not \"brush aside as " +
          "far-fetched\" (paras. 12-13).",
        sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2012/2012scc32/2012scc32.html",
        verifiedAt: "2026-09-30",
        alsoCites: [{"sourceUrl": "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html", "pinpoint": "Mustapha v. Culligan of Canada Ltd., 2008 SCC 27, paras. 11-13"}],
        evidenceCategories: [
          {
            name: "Evidence connecting the damage or loss to the time the property was with the business",
            why: "Shows the property was in the condition claimed when it was dropped off, and not in that condition (or missing) only after being left with the business.",
            examples: ["Photos or description of the item's condition at drop-off", "The gap in time between drop-off and discovering the damage or loss", "Any admission from the business"],
          },
        ],
      },
      {
        id: "amount-within-jurisdiction-property-in-care",
        name: "The amount claimed falls within Small Claims Court's jurisdiction",
        plainExplanation:
          "Ontario's Small Claims Court guide says the court \"can handle any action for the payment of " +
          "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
          "excluding interest and costs such as court fees.\" The $50,000 figure is the amount " +
          "prescribed by O. Reg. 626/00, s. 1(1), for the court's jurisdiction under s. 23(1) of the " +
          "Courts of Justice Act.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        alsoCites: [{"sourceUrl": "https://www.ontario.ca/laws/docs/000626_e.doc", "pinpoint": "O. Reg. 626/00, s. 1(1)"}, {"sourceUrl": "https://www.ontario.ca/laws/docs/90c43_e.doc", "pinpoint": "Courts of Justice Act, s. 23(1)"}],
        evidenceCategories: [
          {
            name: "Cost documentation",
            why: "Supports the specific dollar amount claimed.",
            examples: ["Repair or replacement estimate", "Receipt or appraisal of the item's value"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "disputes-possession-or-timing",
        name: "The business disputes having possession of the property, or that anything happened to it while in their care",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a defendant who wishes to dispute the claim serves " +
          "the Defence on every other party and files it, with proof of service, within 20 days of " +
          "being served with the claim. This topic is about a Defence whose reasons dispute that the " +
          "property was left with the business, or that anything happened to it while it was there.",
        whenThisComesUp: "When the defendant's Defence disputes possession or timing, not just the amount claimed.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
      {
        id: "dispute-cause-of-damage-property-in-care",
        name: "The business disputes that its own conduct caused the damage or loss",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a defendant who wishes to dispute the claim serves " +
          "the Defence on every other party and files it, with proof of service, within 20 days of " +
          "being served with the claim. This topic is about a Defence whose reasons dispute that the " +
          "business's own conduct caused the damage or loss.",
        whenThisComesUp: "When the defendant's Defence disputes causation rather than possession or amount.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    applicableDefenceConceptIds: ["defence-contributory-negligence", "defence-limitation-period-expired", "defence-set-off-or-counterclaim", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "cannot be started after the second anniversary of the day the claim was discovered. Section " +
          "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
          "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
          "omission, that the act or omission was that of the person the claim is against, and that, " +
          "having regard to the nature of the injury, loss or damage, a proceeding would be an " +
          "appropriate means to seek to remedy it -- and the day a reasonable " +
          "person with their abilities and in their circumstances first ought to have known those " +
          "things. Under s. 5(2), a person with a claim is presumed to have known of those matters on " +
          "the day the act or omission the claim is based on took place, unless the contrary is proved.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
      {
        note:
          "This content covers the general negligence framework only (Mustapha v. Culligan of Canada " +
          "Ltd., 2008 SCC 27, para. 3). It does not cover bailment, which has not been sourced here. If " +
          "property was left with a business for service, storage or safekeeping, that is a question " +
          "worth taking to a licensed paralegal or lawyer.",
        sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-30",
      },
    ],
    signals: [
      "dry cleaner ruined",
      "dry cleaner lost",
      "repair shop lost my",
      "repair shop damaged my",
      "storage unit damaged my belongings",
      "storage facility lost my",
      "valet damaged my car",
      "boarding kennel lost",
      "kennel lost my dog",
      "left my car with the valet",
      "left it with the business",
      "left my belongings in storage and",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "para. 3 -- the four elements of a negligence claim (duty, breach, damage, causation)",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "paras. 4-5 -- duty of care: the proximity question",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "para. 7 -- standard of care: conduct is negligent if it creates an unreasonable risk of harm",
      },
      {
        sourceName: "Supreme Court of Canada — Mustapha v. Culligan of Canada Ltd., 2008 SCC 27",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
        verifiedAt: "2026-09-09",
        pinpoint: "paras. 11-13 -- causation has both a factual and a legal (remoteness) branch, judged by reasonable foreseeability",
      },
      {
        sourceName: "Supreme Court of Canada — Clements v. Clements, 2012 SCC 32",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2012/2012scc32/2012scc32.html",
        verifiedAt: "2026-09-11",
        pinpoint: "para. 8 -- the factual branch of causation: the \"but for\" test, which the plaintiff must prove on a balance of probabilities",
      },
      {
        sourceName: "Supreme Court of Canada — Clements v. Clements, 2012 SCC 32",
        officialUrl: "https://www.canlii.org/en/ca/scc/doc/2012/2012scc32/2012scc32.html",
        verifiedAt: "2026-09-11",
        pinpoint: "para. 9 -- the \"but for\" test is applied in a robust common-sense fashion; no scientific evidence of the precise contribution the negligence made is required",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-11",
        pinpoint: "s.23(1): Small Claims Court jurisdiction is any action for payment of money up to the prescribed amount, with no cause-of-action exclusion",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },
  // ---------------------------------------------------------------------------
  // 2026-09-30: four types added from the vendored corpus, each entry quoted,
  // re-read by an independent reviewer, and logged in
  // docs/sources/catalogue-verification.json. status "reviewed" is the site
  // owner's pre-launch decision, as for the batches above -- not a licensee
  // review. Ids reuse the declared-profile ids in claim-types/ where one existed.
  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-damage-caused-by-a-child",
    name: "A child took, damaged or destroyed my property (suing the parent)",
    broughtBy:
      "The owner of the property, or a person entitled to possession of it, who sues a parent of " +
      "the child under the Parental Responsibility Act, 2000. Not the child, and not a parent suing " +
      "someone else.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "property-taken-damaged-destroyed-parental",
        name:
          "A child took, damaged or destroyed property that you own or are entitled to possess",
        plainExplanation:
          "Under s. 2(1) of the Parental Responsibility Act, 2000, where a child takes, damages or " +
          "destroys property, an owner or a person entitled to possession of the property may bring an " +
          "action in the Small Claims Court against a parent of the child to recover damages. Ontario's " +
          "Small Claims Court guide also says a claim can be brought in Small Claims Court under this " +
          "Act against a parent of a child (under 18 years of age) \"in certain circumstances where a " +
          "child takes, damages or destroys your property.\"",
        sourceUrl: "https://www.ontario.ca/laws/docs/00p04_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2021-04-19",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
            pinpoint: "Types of claims that are dealt with in Small Claims Court",
          },
        ],
        evidenceCategories: [
          {
            name: "Proof you own or are entitled to possess the property",
            why:
              "Section 2(1) lets an owner or a person entitled to possession bring the action.",
            examples: [
              "Receipt, bill of sale or registration",
              "Lease or rental agreement, if you rent the property",
              "Photos of the property in your possession before the incident",
            ],
          },
          {
            name: "Records of what happened and who did it",
            why: "Shows that the property was taken, damaged or destroyed, and by which child.",
            examples: [
              "Photos or video of the damage or the incident",
              "Names and contact details of witnesses",
              "Written statements, messages or any admission",
              "Any police occurrence number, if a report was made",
            ],
          },
        ],
      },
      {
        id: "defendant-is-parent-of-child-parental",
        name: "The person sued is a \"parent\" of a \"child\" as the Act defines those words",
        plainExplanation:
          "Under s. 1 of the Parental Responsibility Act, 2000, \"child\" means a person who is under the " +
          "age of 18 years. \"Parent\", when used in reference to a child, includes any individual who " +
          "has lawful custody of, or a lawful right of access to, the child. (Section 1 says these " +
          "definitions apply except as otherwise provided in section 10, which covers actions brought " +
          "outside this Act.)",
        sourceUrl: "https://www.ontario.ca/laws/docs/00p04_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2021-04-19",
        evidenceCategories: [
          {
            name: "Information about the child's age",
            why: "The Act applies to a person who is under 18.",
            examples: [
              "Any record or statement showing the child's age or school grade",
              "Witness information about who the child is",
            ],
          },
          {
            name: "Information about who the child's parent is",
            why:
              "The action is brought against a parent, which the Act says includes anyone with lawful " +
              "custody or a lawful right of access.",
            examples: [
              "Messages or conversations with the parent about the incident",
              "The parent's name and address for the claim form",
            ],
          },
        ],
      },
      {
        id: "property-loss-and-economic-loss-parental",
        name: "The loss: the property itself, and money lost because of it",
        plainExplanation:
          "Under s. 2(1) of the Parental Responsibility Act, 2000, the damages that can be recovered " +
          "are (a) for loss of or damage to the property suffered as a result of the activity of the " +
          "child, and (b) for economic loss suffered as a consequence of that loss of or damage to " +
          "property.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00p04_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2021-04-19",
        evidenceCategories: [
          {
            name: "Value of the property or cost of repair",
            why: "Relates to loss of or damage to the property under s. 2(1)(a).",
            examples: [
              "Repair estimates or invoices",
              "Replacement quotes or original receipts",
              "Before-and-after photos",
            ],
          },
          {
            name: "Money lost because of the property loss or damage",
            why: "Relates to economic loss under s. 2(1)(b).",
            examples: [
              "Receipts for a rental or substitute while the item was being repaired",
              "Records of business income lost while property was out of use",
              "Other costs that followed from the loss or damage",
            ],
          },
        ],
      },
      {
        id: "amount-claimed-parental",
        name: "The amount claimed, calculated and explained",
        plainExplanation:
          "Ontario's Small Claims Court guide says the reasons for a claim should \"calculate and " +
          "explain the amount of money and any interest you are claiming\", with copies of supporting " +
          "documents attached to the claim. This part of the checklist is about adding up the property " +
          "loss and any economic loss, and showing how each figure was reached.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        evidenceCategories: [
          {
            name: "A calculation of the total",
            why: "The claim form asks for the amount and how it was worked out.",
            examples: [
              "A simple list of each item of loss and its dollar figure",
              "Copies of the receipts, estimates or invoices behind each figure",
            ],
          },
        ],
      },
      {
        id: "amount-within-jurisdiction-parental",
        name: "The amount claimed falls within Small Claims Court's jurisdiction",
        plainExplanation:
          "Section 2(1) of the Parental Responsibility Act, 2000 sets its own limit: the damages " +
          "recovered in an action under the Act are \"not in excess of the monetary jurisdiction of the " +
          "Small Claims Court\". Ontario's Small Claims Court guide says the court \"can handle any " +
          "action for the payment of money or the recovery of personal property where the amount " +
          "claimed does not exceed $50,000, excluding interest and costs such as court fees.\" The " +
          "$50,000 figure is the amount prescribed by O. Reg. 626/00, s. 1(1), for the court's " +
          "jurisdiction under s. 23(1) of the Courts of Justice Act.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/00p04_e.doc",
            pinpoint: "Parental Responsibility Act, 2000, s. 2(1)",
          },
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/000626_e.doc",
            pinpoint: "O. Reg. 626/00, s. 1(1)",
          },
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
            pinpoint: "Courts of Justice Act, s. 23(1)",
          },
        ],
        evidenceCategories: [
          {
            name: "Cost documentation",
            why: "Supports the specific dollar amount claimed.",
            examples: ["Repair or replacement estimate", "Receipts for economic loss"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "reasonable-supervision-and-efforts-parental",
        name:
          "The parent says they were supervising reasonably and tried to prevent this kind of activity",
        plainExplanation:
          "Under s. 2(2) of the Parental Responsibility Act, 2000, the parent is liable for the damages " +
          "unless the parent satisfies the court of one of two things. The first, in s. 2(2)(a), has " +
          "two parts that must both be shown: that the parent was exercising reasonable supervision " +
          "over the child at the time the child engaged in the activity that caused the loss or damage, " +
          "and that the parent made reasonable efforts to prevent or discourage the child from engaging " +
          "in the kind of activity that resulted in the loss or damage. Section 2(3) lists what the " +
          "court may consider in deciding this: (a) the age of the child; (b) the prior conduct of the " +
          "child; (c) the potential danger of the activity; (d) the physical or mental capacity of the " +
          "child; (e) any psychological or other medical disorders of the child; (f) whether the child " +
          "was under the direct supervision of the parent at the time; (g) if not, whether the parent " +
          "acted unreasonably in failing to make reasonable arrangements for the child's supervision; " +
          "(h) whether the parent has sought to improve their parenting skills by attending parenting " +
          "courses or otherwise; (i) whether the parent has sought professional assistance for the " +
          "child designed to discourage activity of that kind; and (j) any other matter the court " +
          "considers relevant.",
        whenThisComesUp:
          "When the parent's Defence says they were watching the child, had arranged supervision, or " +
          "had tried to stop this kind of behaviour.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00p04_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2021-04-19",
      },
      {
        id: "activity-not-intentional-parental",
        name: "The parent says the child's activity was not intentional",
        plainExplanation:
          "Under s. 2(2)(b) of the Parental Responsibility Act, 2000, the second way a parent can avoid " +
          "liability under the Act is by satisfying the court that the activity that caused the loss or " +
          "damage was not intentional. As with s. 2(2)(a), the Act puts this on the parent: the parent " +
          "is liable \"unless the parent satisfies the court\".",
        whenThisComesUp:
          "When the parent's Defence says the damage was an accident rather than something the child " +
          "meant to do.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00p04_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2021-04-19",
      },
      {
        id: "disputes-child-or-parent-parental",
        name: "The defendant disputes that the child did it, or that they are the child's parent",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a " +
          "defendant who wishes to dispute the claim serves the Defence on every other party and files " +
          "it, with proof of service, within 20 days of being served with the claim. This topic is " +
          "about a Defence whose reasons dispute that this child took, damaged or destroyed the " +
          "property, or that the person sued is the child's parent.",
        whenThisComesUp:
          "When the Defence denies the child was involved, or says the person sued is not a \"parent\" of " +
          "the child as the Act defines it (which includes any individual who has lawful custody of, or " +
          "a lawful right of access to, the child).",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "cannot be started after the second anniversary of the day the claim was discovered. Section " +
          "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
          "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
          "omission, that the act or omission was that of the person the claim is against, and that, " +
          "having regard to the nature of the injury, loss or damage, a proceeding would be an " +
          "appropriate means to seek to remedy it -- and the day a reasonable " +
          "person with their abilities and in their circumstances first ought to have known those " +
          "things. Under s. 5(2), a person with a claim is presumed to have known of those matters on " +
          "the day the act or omission the claim is based on took place, unless the contrary is proved.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
      {
        note:
          "Youth court findings and records. Under s. 3(2) of the Parental Responsibility Act, 2000, in " +
          "an action under the Act, proof that the child has been found guilty of an offence under the " +
          "Young Offenders Act (Canada) or the Youth Criminal Justice Act (Canada) is proof, in the " +
          "absence of evidence to the contrary, that the child committed the offence -- but only if no " +
          "appeal was taken and the time for an appeal has expired, or an appeal was taken but was " +
          "dismissed or abandoned and no further appeal is available. Under s. 3(4), a person who " +
          "presents evidence obtained under the Youth Criminal Justice Act (Canada) in an action under " +
          "the Act must first give the court notice, in the prescribed form. Under s. 3(5), when that " +
          "evidence is presented, the court file may be disclosed only to the court and authorized " +
          "court employees, the claimant and the claimant's representative, and the child, the child's " +
          "parents and their representatives; once the action is finally disposed of, the file is " +
          "sealed and is not disclosed to anyone except those same people. Section 4 says nothing in " +
          "the Act affects any provision of the Youth Criminal Justice Act (Canada) limiting disclosure " +
          "or publication of that information.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00p04_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2021-04-19",
      },
      {
        note:
          "How damages are set and paid under the Act. Under s. 5 of the Parental Responsibility Act, " +
          "2000, in determining the amount of damages the court may take into account any amount " +
          "ordered by a court as restitution or paid voluntarily as restitution. Under s. 6, where more " +
          "than one parent is liable for a child's activity, their liability is joint and several. " +
          "Under s. 7(1), the court may order the damages paid in full on or before a fixed date, or in " +
          "instalments on or before fixed dates if the court considers that a lump sum payment is " +
          "beyond the financial resources of the parent or will otherwise impose an unreasonable " +
          "financial burden on the parent; under s. 7(2), the court may order the parent to provide " +
          "security in any form it considers appropriate. Under s. 8, an insurer who has paid " +
          "compensation to a person in connection with the loss or damage is subrogated to that " +
          "person's rights under the Act to the extent of the amount paid.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00p04_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2021-04-19",
      },
      {
        note:
          "Other remedies and actions outside the Act. Under s. 9 of the Parental Responsibility Act, " +
          "2000, nothing in the Act is to be interpreted to limit remedies otherwise available under " +
          "existing law or to preclude the development of remedies under the law. Section 10 applies to " +
          "any action brought otherwise than under the Act: under s. 10(2), in an action against a " +
          "parent for damage to property or for personal injury or death caused by the fault or neglect " +
          "of a child who is a minor, the onus of establishing that the parent exercised reasonable " +
          "supervision and control over the child rests with the parent. Under s. 10(3), in that " +
          "subsection \"child\" and \"parent\" have the same meaning as in the Family Law Act.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00p04_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2021-04-19",
      },
    ],
    signals: [
      "suing the parents of the kid who damaged my property",
      "neighbour's teenager broke my window and the parents won't pay",
      "kids vandalized my property",
      "teen spray painted my fence",
      "child stole from my store",
      "youth shoplifted from my shop",
      "neighbourhood kids smashed my mailbox",
      "son of my neighbour keyed my car",
      "minor broke into my shed and wrecked things",
      "boy threw a rock through my window",
      "parents refuse to pay for what their child broke",
      "Parental Responsibility Act",
      "young person destroyed my belongings",
      "parents won't pay for the damage",
      "kid broke my",
      "vandalized by a child",
    ],
    typicalDefendantProfile: "individual",
    citations: [
      {
        sourceName: "Parental Responsibility Act, 2000, S.O. 2000, c. 4",
        officialUrl: "https://www.ontario.ca/laws/docs/00p04_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint:
          "s. 1 definitions; s. 2(1) action in Small Claims Court and heads of damages; s. 2(2)-(3) " +
          "parent's defences and factors; ss. 3-4 youth findings and records; ss. 5-8 restitution, " +
          "joint liability, payment, subrogation; ss. 9-10 other remedies and onus outside the Act",
      },
      {
        sourceName: "Guide to Procedures in Small Claims Court: Making a claim",
        officialUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        pinpoint: "Types of claims that are dealt with in Small Claims Court",
      },
      {
        sourceName: "Rules of the Small Claims Court, O. Reg. 258/98",
        officialUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "rr. 9.01-9.02",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 4-5",
      },
    ],
    reviewedAt: "2026-09-30",
    status: "reviewed",
  },
  {
    id: "sc-claim-online-purchase-not-delivered",
    name:
      "Something bought online, by phone or by mail never arrived, or the seller won't refund",
    broughtBy:
      "The consumer -- an individual buying for personal, family or household use -- who ordered " +
      "from a business online, by phone or by mail order. Not a business that bought for business " +
      "purposes, and not the seller.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "consumer-internet-or-remote-agreement-remote",
        name:
          "The purchase was an internet or remote agreement between a consumer and a business",
        plainExplanation:
          "Under s. 1 of the Consumer Protection Act, 2002, a \"consumer\" is an individual acting for " +
          "personal, family or household purposes, and does not include a person acting for business " +
          "purposes. A \"supplier\" is a person in the business of selling, leasing or trading in goods " +
          "or services, or otherwise in the business of supplying them. Under s. 20(1), an \"internet " +
          "agreement\" is a consumer agreement formed by text-based internet communications, and a " +
          "\"remote agreement\" is a consumer agreement entered into when the consumer and supplier are " +
          "not present together. The Act's special rules for these agreements apply only if the " +
          "consumer's total potential payment obligation, excluding the cost of borrowing, exceeds a " +
          "prescribed amount (ss. 37 and 44). O. Reg. 17/05 sets that amount at $50 for both (ss. 31 " +
          "and 36). Under s. 2(1), the Act applies to consumer transactions if the consumer or the " +
          "person dealing with the consumer is located in Ontario when the transaction takes place; s. " +
          "2(2) lists exceptions, such as consumer transactions regulated under the Securities Act. O. " +
          "Reg. 17/05 also turns these rules off for some agreements -- for example, sections 27 to 47 " +
          "of the Act do not apply to a consumer agreement for work on or repairs to a vehicle that is " +
          "also an internet or remote agreement (s. 13).",
        sourceUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/050017_e.doc",
            pinpoint: "O. Reg. 17/05, ss. 13, 31, 36",
          },
        ],
        evidenceCategories: [
          {
            name: "The order itself",
            why: "Shows how the order was placed, with whom, when, and for how much.",
            examples: [
              "Order confirmation email or screenshot",
              "Receipt or invoice",
              "Notes of a phone order (date, time, who took it)",
              "Copy of a mail-order form sent in",
            ],
          },
          {
            name: "Who the seller is",
            why: "Identifies the business the agreement was made with.",
            examples: [
              "Seller's name and contact details from the website or confirmation",
              "Business address shown on the order or invoice",
            ],
          },
        ],
      },
      {
        id: "late-delivery-remote",
        name:
          "The goods were not delivered, or the services not started, within 30 days after the date in " +
          "the agreement (or, if no date was given, within 30 days after the agreement was made)",
        plainExplanation:
          "Under s. 1 of the Consumer Protection Act, 2002, a \"future performance agreement\" is a " +
          "consumer agreement where delivery, performance or payment in full is not made when the " +
          "parties enter the agreement. Under s. 26(1), a consumer may cancel a future performance " +
          "agreement at any time before delivery or the start of performance if the supplier does not " +
          "make delivery within 30 days after the delivery date specified in the agreement (or an " +
          "amended delivery date the consumer agreed to in writing), or does not begin performance " +
          "within 30 days after the commencement date specified in the agreement (or an amended date " +
          "the consumer agreed to in writing). Under s. 26(2), if no delivery or commencement date is " +
          "specified, the consumer may cancel at any time before delivery or commencement if the " +
          "supplier does not deliver or begin within 30 days after the date the agreement is entered " +
          "into. Under s. 26(3), if the consumer agrees to accept delivery or authorize commencement " +
          "after that period has expired, the consumer may not cancel under this section. Under s. " +
          "21(1), these rules apply when the total potential payment obligation, excluding the cost of " +
          "borrowing, exceeds a prescribed amount; O. Reg. 17/05, s. 23.1, sets that at $50 for a " +
          "future performance agreement that is not a gift card agreement to which ss. 25.2 to 25.5 of " +
          "the regulation apply. O. Reg. 17/05, ss. 18 and 19, say that when an internet agreement or a " +
          "remote agreement is also a future performance agreement (and is not a time share, personal " +
          "development services or direct agreement), sections 22 and 23 of the Act do not apply to it " +
          "-- and, for an internet agreement, neither do sections 44 to 47.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/050017_e.doc",
            pinpoint: "O. Reg. 17/05, ss. 18, 19, 23.1",
          },
        ],
        evidenceCategories: [
          {
            name: "The promised delivery or start date",
            why: "Shows the date the 30 days is counted from, or that no date was given.",
            examples: [
              "Order confirmation showing an estimated or promised delivery date",
              "Product listing or checkout page stating delivery timing",
              "Any written agreement to a new delivery date",
            ],
          },
          {
            name: "Delivery history",
            why: "Shows whether and when delivery was attempted or made.",
            examples: [
              "Shipping and tracking records",
              "Messages from the seller about delays",
              "Notes of dates the item did not arrive",
            ],
          },
        ],
      },
      {
        id: "cancellation-right-and-notice-remote",
        name: "A right to cancel applied, and notice of cancellation was given",
        plainExplanation:
          "The Consumer Protection Act, 2002 gives a right to cancel an internet or remote agreement " +
          "when the seller does not follow certain rules. For an internet agreement: under s. 38(1) and " +
          "O. Reg. 17/05, s. 32, before the agreement the supplier shall disclose prescribed " +
          "information, including the supplier's name, telephone number and business address, a fair " +
          "and accurate description of the goods or services, an itemized list of prices including " +
          "taxes and shipping charges, the total amount payable, the delivery dates, and any " +
          "cancellation, return, exchange or refund rights the supplier agrees to. Under s. 38(2), the " +
          "supplier shall provide an express opportunity to accept or decline the agreement and to " +
          "correct errors immediately before entering into it. Under s. 39(1) and O. Reg. 17/05, s. " +
          "33(1), the supplier shall deliver a copy of the agreement in writing within 15 days after " +
          "the consumer enters into it. Under s. 40(1), the consumer may cancel from the date of the " +
          "agreement until seven days after receiving a copy of it if the required information was not " +
          "disclosed or the express opportunity was not given; under s. 40(2), the consumer may cancel " +
          "within 30 days after the date of the agreement if the supplier does not comply with a " +
          "requirement under s. 39. For a remote agreement (for example, by telephone or mail order): " +
          "under s. 45 and O. Reg. 17/05, ss. 37 and 38, the supplier shall disclose similar prescribed " +
          "information (which may be done orally or in writing) and give an express opportunity to " +
          "accept or decline the agreement and to correct errors. Under s. 46(1) and O. Reg. 17/05, s. " +
          "39(1), a written copy must be delivered within a period ending on the earlier of 30 days " +
          "after the supplier bills the consumer and 60 days after the agreement is entered into. Under " +
          "s. 47(1), the consumer may cancel until seven days after receiving a copy if the supplier " +
          "fails to comply with s. 45; under s. 47(2), the consumer may cancel within one year after " +
          "the date of the agreement if the supplier does not comply with a requirement under s. 46. " +
          "Late delivery under s. 26 is a separate right to cancel, described in the part of this " +
          "checklist before this one. How to cancel: under s. 94, a consumer who has a right to cancel " +
          "does so by giving notice under s. 92, and the cancellation takes effect when the notice is " +
          "given. Under s. 92, the notice may be expressed in any way, as long as it indicates the " +
          "intention to seek the remedy; unless the regulations require otherwise it may be oral or in " +
          "writing and given by any means; written notice not given by personal service is deemed given " +
          "when sent; and it may be sent to the address in the agreement or, if there is no written " +
          "copy or no address in it, to any address of the supplier on record with the Government of " +
          "Ontario or of Canada, or known to the consumer.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/050017_e.doc",
            pinpoint: "O. Reg. 17/05, ss. 32, 33, 37, 38, 39",
          },
        ],
        evidenceCategories: [
          {
            name: "What the seller disclosed before the order",
            why: "Shows what information was, or was not, given before the agreement was made.",
            examples: [
              "Screenshots of the product page and checkout screens",
              "Seller's posted terms, return or refund policy",
              "Notes of what was said on a phone order",
            ],
          },
          {
            name: "The copy of the agreement (or its absence)",
            why:
              "Shows whether and when a written copy was received, which is what several of the " +
              "cancellation time limits are counted from.",
            examples: [
              "Confirmation email with the order details and its date",
              "Records showing no copy was ever received",
              "Billing statement showing the date the seller billed",
            ],
          },
          {
            name: "Proof of the cancellation notice",
            why: "Shows that notice was given, how, and on what date.",
            examples: [
              "Copy of the cancellation email, letter or web form",
              "Sent-date record, or registered mail receipt",
              "Notes of a phone call cancelling (date, time, who you spoke to)",
            ],
          },
        ],
      },
      {
        id: "refund-not-made-remote",
        name: "After the cancellation, the seller did not refund the payment",
        plainExplanation:
          "Under s. 96(1) of the Consumer Protection Act, 2002, if a consumer cancels a consumer " +
          "agreement, the supplier shall, in accordance with the prescribed requirements, refund to the " +
          "consumer any payment made under the agreement or any related agreement (and return goods " +
          "delivered under a trade-in arrangement, or refund an amount equal to the trade-in " +
          "allowance). O. Reg. 17/05, s. 79(1), says the supplier shall do so within 15 days after the " +
          "day the consumer gives notice of cancellation under s. 92. Under s. 95, a cancellation under " +
          "the Act cancels, as if they never existed, the consumer agreement, all related agreements, " +
          "and credit agreements and other payment instruments arranged by the supplier or otherwise " +
          "related to the agreement. Under s. 96(6), if a consumer has cancelled a consumer agreement " +
          "and the supplier has not met the supplier's obligations under s. 96(1), the consumer may " +
          "commence an action. Ontario's Small Claims Court guide says the reasons for a claim should " +
          "\"calculate and explain the amount of money and any interest you are claiming\", with copies " +
          "of supporting documents attached to the claim. This part of the checklist is about the " +
          "payment that was not refunded and how the amount claimed is calculated.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/050017_e.doc",
            pinpoint: "O. Reg. 17/05, s. 79(1)",
          },
          {
            sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
            pinpoint: "Guide to Procedures in Small Claims Court: making a claim",
          },
        ],
        evidenceCategories: [
          {
            name: "Payment records",
            why: "Shows what was paid, when and how, to support the amount claimed.",
            examples: [
              "Receipt or order total",
              "Credit card or bank statement showing the charge",
              "Payment app or e-transfer record",
            ],
          },
          {
            name: "Refund requests and replies",
            why: "Shows when the refund was due and what, if anything, was refunded.",
            examples: [
              "Emails or chat messages asking for the refund",
              "The seller's replies",
              "Any partial refund received",
            ],
          },
        ],
      },
      {
        id: "amount-within-jurisdiction-remote",
        name: "The amount claimed falls within Small Claims Court's jurisdiction",
        plainExplanation:
          "Ontario's Small Claims Court guide says the court \"can handle any action for the payment of " +
          "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
          "excluding interest and costs such as court fees.\" The $50,000 figure is the amount " +
          "prescribed by O. Reg. 626/00, s. 1(1), for the court's jurisdiction under s. 23(1) of the " +
          "Courts of Justice Act.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/000626_e.doc",
            pinpoint: "O. Reg. 626/00, s. 1(1)",
          },
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
            pinpoint: "Courts of Justice Act, s. 23(1)",
          },
        ],
        evidenceCategories: [
          {
            name: "Cost documentation",
            why: "Supports the specific dollar amount claimed.",
            examples: [
              "Receipt or order total showing what was paid",
              "Statement showing the charge and any refund",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "seller-says-delivered-or-accepted-remote",
        name: "The seller says delivery was attempted, or that the late delivery was accepted",
        plainExplanation:
          "Under s. 26(4) of the Consumer Protection Act, 2002, for the late-delivery rules a supplier " +
          "is considered to have delivered if delivery was attempted but was refused by the consumer at " +
          "the time, or delivery was attempted but not made because no person was available to accept " +
          "delivery for the consumer on the day for which reasonable notice was given to the consumer " +
          "that there was to be delivery. The same applies to starting services: an attempted " +
          "commencement that was refused, or that did not occur because no one was available on a day " +
          "for which reasonable notice was given, counts as commencement. Under s. 26(3), if, after the " +
          "30-day period has expired, the consumer agrees to accept delivery or authorize commencement, " +
          "the consumer may not cancel the agreement under s. 26.",
        whenThisComesUp:
          "When the seller's Defence says a delivery attempt was made, or that the buyer agreed to wait " +
          "for or accept the late delivery.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
      },
      {
        id: "consumer-return-of-goods-remote",
        name: "The seller says goods that did arrive were not returned, or were not looked after",
        plainExplanation:
          "Under s. 96(2) of the Consumer Protection Act, 2002, on cancelling, the consumer, in " +
          "accordance with the prescribed requirements, shall permit goods that came into their " +
          "possession under the agreement to be repossessed, return them, or deal with them as " +
          "prescribed. For a cancelled internet agreement, remote agreement or future performance " +
          "agreement covered by those sections, O. Reg. 17/05, s. 81(2), says a consumer who has not " +
          "received a written direction to destroy the goods shall return them to the supplier's " +
          "address, by any method that provides confirmation of delivery, within 15 days after the " +
          "later of the day the consumer gives notice of cancellation and the day the goods come into " +
          "the consumer's possession. Under s. 81(3), goods returned other than by personal delivery " +
          "are deemed returned when sent, and under s. 81(4) the supplier is deemed to consent to the " +
          "return and is responsible for the reasonable cost of returning the goods. Under s. 96(3) of " +
          "the Act, the consumer shall take reasonable care of the goods for the prescribed period, " +
          "which O. Reg. 17/05, s. 82, says begins when notice of cancellation is given and ends, for " +
          "these agreements, when the goods are returned or destroyed as directed. Under s. 96(7), if " +
          "the consumer has not met these obligations, the supplier or the person the obligation is " +
          "owed to may commence an action.",
        whenThisComesUp:
          "When the seller's Defence (or its own claim) says the buyer kept goods that arrived, did not " +
          "send them back in time, or damaged them.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/050017_e.doc",
            pinpoint: "O. Reg. 17/05, ss. 81, 82",
          },
        ],
      },
      {
        id: "dispute-coverage-or-notice-remote",
        name:
          "The seller disputes that these rules applied, or that cancellation notice was given in time",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a " +
          "defendant who wishes to dispute the claim serves the Defence on every other party and files " +
          "it, with proof of service, within 20 days of being served with the claim. This topic is " +
          "about a Defence whose reasons dispute that the purchase was an internet or remote agreement " +
          "covered by these rules, or that notice of cancellation was given within the time allowed.",
        whenThisComesUp:
          "When the seller's Defence says the purchase was not covered (for example, the total " +
          "potential payment obligation, excluding the cost of borrowing, was $50 or less, or made for " +
          "a business), or that the cancellation came too late.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Credit card charges. Under s. 99(1) of the Consumer Protection Act, 2002, a consumer who " +
          "charged all or part of a payment to a credit card account may request the credit card issuer " +
          "to cancel or reverse the charge and any associated interest or other charges. Under s. 99(2) " +
          "and (3), this covers, among other things, a payment for a consumer agreement that has been " +
          "cancelled under the Act, where the consumer has cancelled and the supplier has not refunded " +
          "all of the payment within the required period. Under s. 99(4), the request must be in " +
          "writing and given to the issuer within the prescribed period; O. Reg. 17/05, s. 85(1), sets " +
          "that as within 60 days after the end of the period within which the supplier was required to " +
          "refund the payment, and s. 85(2) lists what the signed request must set out. Under s. 99(5) " +
          "and O. Reg. 17/05, s. 85(3) and (4), the issuer shall acknowledge the request within 30 days " +
          "and, if the request meets the requirements of subsection (4), shall, by the date of the " +
          "second statement of account after the request, either cancel or reverse the charge or, after " +
          "an investigation, send a written notice explaining why it is of the opinion the consumer is " +
          "not entitled to cancel or to demand a refund. Under s. 99(6), a consumer may commence an " +
          "action against a credit card issuer to recover a payment and associated interest and other " +
          "charges to which the consumer is entitled under this section. Under s. 99(7), the same " +
          "approach applies with necessary modifications to a charge made to a prescribed payment " +
          "system.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
      },
      {
        note:
          "Where the Act says an action can be brought, and what it says about the result. Under s. 100(1) " +
          "of the Consumer Protection Act, 2002, if a consumer has a right to commence an action under the " +
          "Act, the consumer may commence the action in the Superior Court of Justice. Under s. 22(1) of " +
          "the Courts of Justice Act, the Small Claims Court is continued as a branch of the Superior " +
          "Court of Justice. But under s. 23(1.1) of the Courts of Justice Act, an action that is within " +
          "the Small Claims Court's jurisdiction cannot be started in the Superior Court of Justice except " +
          "with leave of the Superior Court of Justice as provided in the rules of court; an action for " +
          "the payment of money is within that jurisdiction where the amount claimed, exclusive of " +
          "interest and costs, does not exceed the prescribed amount (s. 23(1)(a)), which is $50,000 (O. " +
          "Reg. 626/00, s. 1(1)). Under s. 100(2) of the Consumer Protection Act, 2002, if a consumer is " +
          "successful in an action, unless in the circumstances it would be inequitable to do so, the " +
          "court shall order that the consumer recover the full payment to which they are entitled under " +
          "the Act, and s. 100(3) says the court may in addition order exemplary or punitive damages or " +
          "such other relief as the court considers proper. Under s. 101, if a consumer is required to " +
          "give notice under the Act in order to obtain a remedy, a court may disregard the requirement to " +
          "give the notice, or any requirement relating to it, if it is in the interest of justice to do " +
          "so.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-12-11",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
            pinpoint: "Courts of Justice Act, s. 22(1)",
          },
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
            pinpoint: "Courts of Justice Act, s. 23(1)(a), (1.1)",
          },
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/000626_e.doc",
            pinpoint: "O. Reg. 626/00, s. 1(1)",
          },
        ],
      },
      {
        note:
          "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "cannot be started after the second anniversary of the day the claim was discovered. Section " +
          "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
          "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
          "omission, that the act or omission was that of the person the claim is against, and that, " +
          "having regard to the nature of the injury, loss or damage, a proceeding would be an " +
          "appropriate means to seek to remedy it -- and the day a reasonable " +
          "person with their abilities and in their circumstances first ought to have known those " +
          "things. Under s. 5(2), a person with a claim is presumed to have known of those matters on " +
          "the day the act or omission the claim is based on took place, unless the contrary is proved.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
    ],
    signals: [
      "ordered online and it never arrived",
      "ordered by phone or mail and it was never delivered",
      "paid for an online order that never came",
      "website took my money and never shipped",
      "package never showed up and the seller won't refund",
      "mail order never came",
      "delivery is weeks past the date they promised",
      "seller keeps pushing back the delivery date",
      "cancelled an online order that never arrived",
      "online store won't give my money back for an order I never got",
      "never got a copy of the order confirmation",
      "credit card chargeback for an online purchase",
      "bought it over the phone and never received it",
      "website won't refund",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Consumer Protection Act, 2002, S.O. 2002, c. 30, Sched. A",
        officialUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint:
          "s. 1 (\"consumer\", \"supplier\", \"future performance agreement\"); s. 2(1); s. 20(1) (\"internet " +
          "agreement\", \"remote agreement\"); ss. 21(1), 26; ss. 37-40 (internet agreements); ss. 44-47 " +
          "(remote agreements); ss. 92, 94, 95, 96, 99, 100, 101. Consolidation from 2025-12-11.",
      },
      {
        sourceName: "O. Reg. 17/05 (General), under the Consumer Protection Act, 2002",
        officialUrl: "https://www.ontario.ca/laws/docs/050017_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint:
          "ss. 13, 18, 19, 23.1, 31, 32, 33, 36, 37, 38, 39, 79(1), 81, 82, 85. Consolidation from " +
          "2026-06-10.",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 22(1), 23(1)",
      },
      {
        sourceName: "O. Reg. 626/00 (Small Claims Court Jurisdiction and Appeal Limit)",
        officialUrl: "https://www.ontario.ca/laws/docs/000626_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "s. 1(1)",
      },
      {
        sourceName: "Rules of the Small Claims Court, O. Reg. 258/98",
        officialUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "rr. 9.01, 9.02",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 4, 5(1), 5(2)",
      },
      {
        sourceName: "Ontario.ca -- Guide to procedures in Small Claims Court: making a claim",
        officialUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        pinpoint: "jurisdiction; reasons for claim and supporting documents",
      },
    ],
    reviewedAt: "2026-09-30",
    status: "reviewed",
  },
  {
    id: "sc-claim-repairer-or-storer-holding-property",
    name:
      "A repair shop, garage or storage business is holding my car or other item for its bill (lien " +
      "dispute)",
    broughtBy:
      "The owner of the car or other item, or another person lawfully entitled to it, when a " +
      "repair, towing or storage business is keeping the item and claiming a lien for its charges " +
      "and there is a dispute about the amount of the lien (including the quality of the work), how " +
      "much repair work was authorized, or the business's right to keep the item. Not the business " +
      "trying to collect its bill, and not a simple overcharge or warranty complaint after the item " +
      "has been returned (that is the vehicle repair dispute).",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "business-holding-under-lien-repairlien",
        name:
          "The business is holding the item and claiming a lien for repair or storage charges",
        plainExplanation:
          "Under s. 3(1) of the Repair and Storage Liens Act, in the absence of a written agreement to " +
          "the contrary, a repairer has a lien against an article it has repaired, and may retain " +
          "possession of the article until the amount is paid. The amount is what the person who " +
          "requested the repair agreed to pay; where no amount was agreed, the fair value of the " +
          "repair; and where only part of a repair was completed, the fair value of the part completed " +
          "(fair value being determined in accordance with any applicable regulations). Under s. 4(1), " +
          "subject to s. 4(2), a storer has a lien against an article it has stored, or stored and " +
          "repaired, for the amount agreed for the storage or storage and repair; where no amount was " +
          "agreed, the fair value of the storage or storage and repair; and where only part of a repair " +
          "is completed, the fair value of the storage and the part of the repair completed -- and may " +
          "retain possession until the amount is paid. Section 1(1) defines an \"article\" as an item of " +
          "tangible personal property other than a fixture, and says \"repair\" includes the towing of an " +
          "article. Under s. 28(2), unless otherwise agreed, a lien claimant is entitled to recover the " +
          "commercially reasonable expenses of the custody, preservation and preparation for sale of " +
          "the article, including insurance, and may include them in the amount required to satisfy the " +
          "lien. Under s. 28(3), except as provided in any applicable regulations, a lien claimant is " +
          "not entitled to a lien for interest on the amount owing, but this does not affect any right " +
          "the lien claimant may otherwise have to recover such interest. This part of the checklist is " +
          "about what the business is holding and what it says it is owed.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90r25_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-01-01",
        evidenceCategories: [
          {
            name: "What was agreed",
            why: "Shows what the owner asked for and what price, if any, was agreed.",
            examples: [
              "Work order or repair authorization",
              "Storage agreement or contract",
              "Texts or emails approving work or a price",
            ],
          },
          {
            name: "What the business says is owed",
            why: "Shows the amount the business is holding the item for, and how it is made up.",
            examples: [
              "Invoice or statement of account",
              "Written demand for payment",
              "Any list of daily storage charges",
            ],
          },
          {
            name: "That the business is keeping the item",
            why: "Records the refusal to hand the item back.",
            examples: [
              "Messages refusing release",
              "Notes of calls or visits with dates",
              "Photos showing the item still at the business",
            ],
          },
        ],
      },
      {
        id: "limits-on-lien-repairlien",
        name: "Limits the Act puts on when a lien arises and how much it covers",
        plainExplanation:
          "Under s. 3(2) of the Repair and Storage Liens Act, a repairer's lien arises when the repair " +
          "is commenced, except that no repairer's lien arises if the repairer was required to comply " +
          "with sections 56 and 57, subsection 58(1) and section 59 of the Consumer Protection Act, " +
          "2002, if applicable, and has not done so. Section 4(3) says the same for a storer's lien " +
          "with respect to repair. Under s. 3(2.1), where Part VI of the Consumer Protection Act, 2002 " +
          "applies, the amount of a repairer's lien shall not exceed the amount the repairer is " +
          "authorized to charge under s. 58(2) and s. 64 of that Act, if those provisions apply to the " +
          "repairer, and the maximum amount authorized by the person who requested the repair, if s. 56 " +
          "of that Act applies to the person. Under s. 3(2.0.1) and s. 4(3.0.1), except as otherwise " +
          "provided in the regulations, no lien arises for towing or vehicle storage services regulated " +
          "under the Towing and Storage Safety and Enforcement Act, 2021 if the business fails to " +
          "comply with the prescribed provisions of that Act, if any. Under s. 4(4), where a storer " +
          "knows or has reason to believe the article was received from someone other than its owner or " +
          "a person having the owner's authority, the storer, within 60 days after receiving it, shall " +
          "give written notice of the lien to every person it knows or has reason to believe is the " +
          "owner or has an interest in the article, including every person who has a security interest " +
          "in the article that is perfected by registration under the Personal Property Security Act. " +
          "Under s. 4(6), if it does not, its lien against a person who should have been given notice " +
          "is limited to the unpaid amount owing for the 60 days from the day the article was received, " +
          "and it shall surrender the article to that person where the person proves a right to " +
          "possession and pays that unpaid amount. Under s. 4(4.1) and (6.1), for an article of a " +
          "prescribed class, a prescribed period (set by regulation) replaces the 60 days, and notice " +
          "also goes to any other prescribed classes of persons. This part of the checklist is about " +
          "whether any of these limits is in play.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90r25_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-01-01",
        evidenceCategories: [
          {
            name: "Estimate and authorization records",
            why: "Shows what estimate or maximum amount was given or agreed before the work.",
            examples: [
              "Written estimate",
              "Signed authorization or work order",
              "Messages approving or refusing extra work",
            ],
          },
          {
            name: "How the business got the item",
            why:
              "Shows who left the item with the business, which matters for the storer's notice rule.",
            examples: [
              "Receipt or intake record naming who dropped it off",
              "Any written notice of lien the owner received, with the date",
              "Ownership or registration document",
            ],
          },
        ],
      },
      {
        id: "dispute-of-listed-kind-repairlien",
        name:
          "The owner, or another person entitled to the item, disputes the lien in a way the Act lists",
        plainExplanation:
          "Under s. 24(1) of the Repair and Storage Liens Act, where a claimant claims a possessory " +
          "lien against an article and refuses to surrender it to its owner or any other person " +
          "entitled to it, and one of the circumstances in s. 24(1.2) exists, the owner or other person " +
          "lawfully entitled to the article may apply to the court, using the procedure in s. 24, to " +
          "have the dispute resolved and the article returned. Section 24(1.1) gives the same right " +
          "where a non-possessory lien is claimed and the person who has the article refuses to " +
          "surrender it. Under s. 24(1.2), the circumstances are: (a) a dispute about the amount of the " +
          "lien, including any question about the quality of the repair, storage or storage and repair; " +
          "(b) for a repair, a dispute about the amount of work that was authorized; or (c) a dispute " +
          "about the lien claimant's right to retain possession of the article. Under s. 24(2), the " +
          "application names the lien claimant as a respondent and, for a non-possessory lien, also the " +
          "person who has possession of the article. This part of the checklist is about exactly what " +
          "is disputed and who the application is against.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90r25_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-01-01",
        evidenceCategories: [
          {
            name: "Right to the item",
            why:
              "Shows the applicant is the owner or another person lawfully entitled to the item.",
            examples: [
              "Vehicle ownership or registration",
              "Purchase receipt for the item",
              "Any document giving the applicant authority over the item",
            ],
          },
          {
            name: "What is disputed",
            why: "Shows which of the listed disputes applies.",
            examples: [
              "Work order showing what work was authorized",
              "Report or photos from another shop about the quality of the work",
              "Messages disputing the amount or the right to keep the item",
            ],
          },
        ],
      },
      {
        id: "payment-into-court-repairlien",
        name: "Paying the amount claimed into court so the item is released",
        plainExplanation:
          "Under s. 24(3) of the Repair and Storage Liens Act, the application is in the prescribed " +
          "form and may include an offer of settlement. Under s. 24(4), the applicant shall pay into " +
          "court, or deposit security with the court in the amount of, the full amount claimed by the " +
          "respondent; where the application includes an offer of settlement, the applicant pays the " +
          "amount offered into court and pays into court, or deposits security for, the balance of the " +
          "full amount claimed. Under s. 24(5), the clerk or registrar of the court then issues an " +
          "initial certificate stating what has been paid in or deposited. Under s. 24(6), the " +
          "applicant gives the initial certificate to the respondent, who, within three days of " +
          "receiving it, shall release the article unless, within that three-day period, the respondent " +
          "files a notice of objection with the court. Under s. 24(9) and (10), where the respondent " +
          "does not release the article as required, the applicant may file an affidavit confirming " +
          "that and obtain from the clerk or registrar, without notice to the respondent, a writ of " +
          "seizure directing the sheriff or bailiff to seize the article and return it to the " +
          "applicant. This part of the checklist is about the amount paid in and the certificates.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90r25_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-01-01",
        evidenceCategories: [
          {
            name: "The amount the business claims",
            why:
              "The payment into court is measured against the full amount the respondent claims.",
            examples: [
              "Latest invoice or written demand",
              "Any updated figure including storage charges",
              "Any written settlement offer the applicant is making",
            ],
          },
          {
            name: "Court records of payment and release",
            why: "Shows what was paid in and when the business received the certificate.",
            examples: [
              "Initial certificate",
              "Proof of when the certificate was given to the business",
              "Receipt for money paid into court or security deposited",
            ],
          },
        ],
      },
      {
        id: "amount-within-jurisdiction-repairlien",
        name: "The amount involved is within the Small Claims Court limit and is explained",
        plainExplanation:
          "Under s. 25 of the Repair and Storage Liens Act, an application under Part IV may be brought " +
          "in any court of appropriate monetary jurisdiction, and under s. 24(3) the application is in " +
          "the prescribed form (it is not an ordinary Plaintiff's Claim). Under s. 23(1) of the Courts " +
          "of Justice Act, the Small Claims Court has jurisdiction in any action for the payment of " +
          "money where the amount claimed does not exceed the prescribed amount exclusive of interest " +
          "and costs, and in any action for the recovery of possession of personal property where the " +
          "value of the property does not exceed the prescribed amount; O. Reg. 626/00, s. 1(1), sets " +
          "that amount at $50,000. This part of the checklist is about the amount the business claims, " +
          "the value of the item, and the records that show them.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90r25_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-01-01",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
            pinpoint: "Courts of Justice Act, s. 23(1)",
          },
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/000626_e.doc",
            pinpoint: "O. Reg. 626/00, s. 1(1)",
          },
        ],
        evidenceCategories: [
          {
            name: "The business's bill and the item's value",
            why: "Shows the amount the business claims and what the item is worth.",
            examples: [
              "The business's invoice or demand",
              "Receipts for any amount already paid",
              "A record of what the item is worth, such as a purchase receipt or listing",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "notice-of-objection-repairlien",
        name: "The business files a notice of objection claiming more",
        plainExplanation:
          "Under s. 24(6) of the Repair and Storage Liens Act, a respondent that receives the initial " +
          "certificate may, within three days, file a notice of objection with the court instead of " +
          "releasing the article. Under s. 24(7), where an objection has been filed, the applicant may " +
          "pay the additional amount claimed as owing in the objection into court, or deposit security " +
          "for it, and the clerk or registrar then issues a final certificate. Under s. 24(8), the " +
          "respondent, on receiving the final certificate, shall release the article immediately. This " +
          "topic is about what happens after an objection is filed.",
        whenThisComesUp:
          "When the business, after receiving the initial certificate, files an objection saying more " +
          "is owed instead of releasing the item.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90r25_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-01-01",
      },
      {
        id: "business-sues-for-full-amount-repairlien",
        name: "The business starts an action for the full amount it says is owed",
        plainExplanation:
          "Under s. 24(13) of the Repair and Storage Liens Act, once the article is released or seized, " +
          "the lien is discharged as a right against the article and becomes instead a charge on the " +
          "money paid into court or the security deposited, and where the respondent seeks to recover " +
          "the full amount it claims to be owed, it may commence an action to recover that amount. " +
          "Under s. 24(14), that charge is discharged 90 days after the article was returned or seized " +
          "unless, before the end of the 90 days, the respondent has accepted the applicant's offer of " +
          "settlement or has commenced an action to recover the amount claimed. Under s. 24(15), after " +
          "those 90 days, the clerk or registrar may return the money or security to the applicant if " +
          "the applicant files an affidavit confirming that the respondent has neither accepted an " +
          "offer of settlement nor commenced an action. Under s. 24(16), the respondent is liable for " +
          "the costs of enforcing a writ of seizure, and those costs are set off against the amount " +
          "paid into court. This topic is about what happens to the money in court after the item is " +
          "back.",
        whenThisComesUp:
          "When the item has been returned and the business then starts a court action for its bill, or " +
          "does nothing for 90 days.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90r25_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-01-01",
      },
      {
        id: "business-accepts-settlement-offer-repairlien",
        name: "The business accepts the amount offered in settlement",
        plainExplanation:
          "Under s. 24(11) of the Repair and Storage Liens Act, where the respondent releases the " +
          "article in compliance with an initial or final certificate, or the article is seized under a " +
          "writ of seizure, the respondent may demand a receipt, and on presenting the receipt to the " +
          "clerk or registrar and signing a waiver of further claim in the prescribed form, the " +
          "respondent shall be paid the portion of the money in court that was offered in settlement. " +
          "Under s. 24(12), where the respondent accepts the amount offered in settlement, the clerk or " +
          "registrar shall notify the applicant and, on request, return to the applicant the balance " +
          "deposited into court and deliver up any security for cancellation. This topic is about what " +
          "happens when the business takes the settlement amount.",
        whenThisComesUp:
          "When the application included an offer of settlement and the business collects that amount " +
          "from the court.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90r25_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-01-01",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: [
      "sc-remedy-return-of-property",
      "sc-remedy-monetary-judgment",
      "sc-remedy-interest-and-costs",
      "sc-remedy-outside-jurisdiction",
    ],
    proceduralNotes: [
      {
        note:
          "Which court: under s. 25 of the Repair and Storage Liens Act, an application under Part IV " +
          "(Dispute Resolution, ss. 23 to 25) may be brought in any court of appropriate monetary " +
          "jurisdiction. Section 23(3) says an application under s. 23(1) to the Small Claims Court " +
          "shall be in the prescribed form. Under s. 23(1), any person may apply to a court for a " +
          "determination of the rights of the parties where a question arises about, among other " +
          "things, the sale of an article under Part III, the amount of a lien or the right of any " +
          "person to a lien, or any other matter arising out of the application of the Act; under s. " +
          "23(2), an application about the amount of a lien or the right to a lien shall not be made " +
          "where an application has been made under s. 24. Two other steps in the Act name the Superior " +
          "Court of Justice: s. 13 (an order that the registrar amend its records to show a registered " +
          "claim for lien has been discharged) and s. 17(3) (an application to have an objection to a " +
          "lien claimant's proposal to keep the article declared ineffective).",
        sourceUrl: "https://www.ontario.ca/laws/docs/90r25_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-01-01",
      },
      {
        note:
          "Timing of sale and redemption: under s. 3(3) of the Repair and Storage Liens Act, a repairer " +
          "has the right to sell an article subject to a lien, in accordance with Part III, when the " +
          "60-day period has passed following the day the amount for the repair comes due, or, if no " +
          "due date was stated, the day the repair was completed. Under s. 4(7), a storer has the same " +
          "right when the 60-day period has passed following the day the amount for the storage, or " +
          "storage and repair, becomes due. Under s. 15(1) and (2), the lien claimant shall not sell " +
          "unless it has given written notice of intention to sell at least 15 days before the sale to, " +
          "among others, the person from whom it received the article. Under s. 17(1) and (2), instead " +
          "of selling, a lien claimant may propose in writing to keep the article in satisfaction of " +
          "the lien; where a person entitled to notice gives a written objection within 30 days of " +
          "receiving the proposal, the lien claimant, subject to s. 17(3) and (4), shall sell the " +
          "article under s. 15. Under s. 22, at any time before the lien claimant has sold the article " +
          "or contracted for its sale, is deemed to have elected to keep it under s. 17, or has given " +
          "it to a charity under s. 19, the owner and any person referred to in s. 15(2) may redeem the " +
          "article by paying the amount required to satisfy the lien.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90r25_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-01-01",
      },
      {
        note:
          "Money the Act says a lien claimant is liable for: under s. 21 of the Repair and Storage " +
          "Liens Act, a lien claimant who fails to comply with the requirements of Part III " +
          "(redemption, sale or other disposition) is liable to any person who suffers damages as a " +
          "result and shall pay the person an amount equal to the greater of $200 or the actual " +
          "damages. Under s. 28(1)(a), a lien claimant that has the article must use reasonable care in " +
          "its custody and preservation, unless a higher standard of care is imposed by law, and under " +
          "s. 28(4) it is liable for any loss or damage caused by a failure to meet an obligation in s. " +
          "28, but does not lose the lien by reason only of that failure. Under s. 28(6), where the " +
          "lien claimant uses or deals with the article in a manner the Act does not authorize, it is " +
          "liable for any loss or damage caused by that use or dealing and may be restrained by an " +
          "injunction. Section 28(6) does not name the court that grants that injunction. Under the " +
          "Courts of Justice Act, s. 96(3), only the Court of Appeal and the Superior Court of Justice, " +
          "exclusive of the Small Claims Court, may grant equitable relief, unless otherwise provided; " +
          "and s. 101(1) provides for interlocutory injunctions in the Superior Court of Justice.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90r25_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-01-01",
      },
      {
        note:
          "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "cannot be started after the second anniversary of the day the claim was discovered. Section " +
          "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
          "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
          "omission, that the act or omission was that of the person the claim is against, and that, " +
          "having regard to the nature of the injury, loss or damage, a proceeding would be an " +
          "appropriate means to seek to remedy it -- and the day a reasonable " +
          "person with their abilities and in their circumstances first ought to have known those " +
          "things. Under s. 5(2), a person with a claim is presumed to have known of those matters on " +
          "the day the act or omission the claim is based on took place, unless the contrary is proved.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
    ],
    signals: [
      "garage won't release my car until I pay a bill I dispute",
      "storage company is holding my belongings until I pay their fees",
      "mechanic refuses to give my car back",
      "shop is keeping my vehicle and claiming a lien",
      "they won't hand over my keys until I pay",
      "business says it will sell my car if I don't pay",
      "storage charges keep adding up every day they hold it",
      "holding my boat for storage fees",
      "repair shop kept my item over a disputed invoice",
      "want my car back while I fight the bill",
      "they did work I never authorized and won't return the car",
      "notice of intention to sell my vehicle",
      "pay into court to get my car back",
      "won't give my car back",
      "keeping my car until I pay",
      "storage company is keeping my",
      "keeping my furniture until I pay",
    ],
    typicalDefendantProfile: "business",
    citations: [
      {
        sourceName: "Repair and Storage Liens Act, R.S.O. 1990, c. R.25",
        officialUrl: "https://www.ontario.ca/laws/docs/90r25_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint:
          "s. 1(1) definitions; ss. 3-4 repairer's and storer's liens; s. 13; ss. 15, 17, 21, 22 sale, " +
          "retention, liability, redemption; ss. 23-25 dispute resolution and proper court; s. 28 lien " +
          "claimant's obligations",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 4, 5(1), 5(2)",
      },
      {
        sourceName: "Small Claims Court jurisdiction, O. Reg. 626/00",
        officialUrl: "https://www.ontario.ca/laws/docs/000626_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "s. 1(1)",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "s. 23(1)",
      },
      {
        sourceName: "Ontario.ca — Guide to Procedures in Small Claims Court: Making a Claim",
        officialUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        pinpoint: "Jurisdiction; reasons for claim and supporting documents",
      },
    ],
    reviewedAt: "2026-09-30",
    status: "reviewed",
  },
  {
    id: "sc-claim-unpaid-wages",
    name: "Unpaid wages (regular pay or final pay not paid by an employer)",
    broughtBy:
      "The employee, or former employee, who was not paid wages they earned. Not an employer suing " +
      "a worker, and not a business owed money by a customer.",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "worker-is-employee-unpaidwages",
        name: "The person was an employee of the employer, doing work in Ontario",
        plainExplanation:
          "Under s. 1(1) of the Employment Standards Act, 2000, \"employee\" includes a person, including " +
          "an officer of a corporation, who performs work for an employer for wages, a person who " +
          "supplies services to an employer for wages, certain trainees, and homeworkers -- and " +
          "includes a person who was an employee. \"Employer\" includes an owner, proprietor, manager, " +
          "superintendent, overseer, receiver or trustee of a business or undertaking who has control " +
          "or direction of, or is directly or indirectly responsible for, the employment of a person in " +
          "it, and includes a person who was an employer. Under s. 3(1), subject to s. 3(2) to (5), the " +
          "employment standards apply if the employee's work is to be performed in Ontario, or in and " +
          "outside Ontario where the work outside Ontario is a continuation of work performed in " +
          "Ontario. Under s. 3(2), the Act does not apply where the employment relationship is within " +
          "the legislative jurisdiction of the Parliament of Canada.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-01-01",
        evidenceCategories: [
          {
            name: "Proof of the working relationship",
            why: "Shows who the employer was and that work was done for them.",
            examples: [
              "Offer letter or employment contract",
              "Pay stubs or earlier payments",
              "Schedules, messages assigning shifts, or a work email account",
            ],
          },
          {
            name: "Where the work was done",
            why: "Shows the work was performed in Ontario.",
            examples: ["Workplace address", "Schedules or messages naming job sites"],
          },
        ],
      },
      {
        id: "wages-earned-not-paid-unpaidwages",
        name: "Wages were earned and were not paid by the pay day",
        plainExplanation:
          "Under s. 1(1) of the Employment Standards Act, 2000, \"wages\" means money payable by an " +
          "employer to an employee under the terms of an employment contract, oral or written, express " +
          "or implied; any payment the Act requires an employer to make to an employee; and allowances " +
          "for room or board under an employment contract or prescribed allowances. Wages do not " +
          "include tips or other gratuities, gifts or bonuses that depend on the employer's discretion " +
          "and are not related to hours, production or efficiency, expenses and travelling allowances, " +
          "or (subject to ss. 60(3) and 62(2)) employer contributions to and payments from a benefit " +
          "plan. Under s. 11(1), an employer shall establish a recurring pay period and a recurring pay " +
          "day and shall pay all wages earned during each pay period, other than accruing vacation pay, " +
          "no later than the pay day for that period. Under s. 23(1), an employer shall pay employees " +
          "at least the minimum wage, and under s. 5(1), no employer or employee may contract out of or " +
          "waive an employment standard -- any such contracting out or waiver is void. Under s. 12(1), " +
          "on or before each pay day the employer shall give the employee a written statement setting " +
          "out the pay period, the wage rate (if there is one), the gross amount of wages and, unless " +
          "provided in some other manner, how it was calculated, the amount and purpose of each " +
          "deduction, and the net amount being paid. Under s. 15(1), an employer shall record, among " +
          "other things, the dates and times the employee worked and the number of hours worked in each " +
          "day and each week.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-01-01",
        evidenceCategories: [
          {
            name: "What the pay was supposed to be",
            why: "Shows the agreed rate or salary and the pay schedule.",
            examples: [
              "Offer letter, contract or job posting",
              "Messages confirming the hourly rate",
              "Earlier pay stubs showing the usual rate and pay day",
            ],
          },
          {
            name: "Work actually done",
            why: "Shows the hours or pay periods for which wages were earned.",
            examples: [
              "Timesheets or schedules",
              "Your own dated notes of shifts worked",
              "Texts or emails about shifts",
            ],
          },
          {
            name: "What was actually paid",
            why: "Shows the gap between what was earned and what was received.",
            examples: [
              "Wage statements (pay stubs)",
              "Bank deposits",
              "Record of missed or short pay days",
            ],
          },
        ],
      },
      {
        id: "final-pay-not-paid-unpaidwages",
        name: "When the job ended, the final wages were not paid on time",
        plainExplanation:
          "Under s. 11(5) of the Employment Standards Act, 2000, if an employee's employment ends, the " +
          "employer shall pay any wages the employee is entitled to no later than the later of seven " +
          "days after the employment ends and the day that would have been the employee's next pay day. " +
          "Under s. 12.1, on or before that day, the employer shall give the employee a written " +
          "statement setting out, among other things, the pay period and gross amount of any wages " +
          "being paid and how that amount was calculated (unless the information is provided in some " +
          "other manner), the amount and purpose of each deduction, and the net amount being paid.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-01-01",
        evidenceCategories: [
          {
            name: "When the job ended",
            why: "Sets the date the final-pay deadline is counted from.",
            examples: [
              "Resignation or termination letter or message",
              "Record of the last shift worked",
              "Record of Employment, if issued",
            ],
          },
          {
            name: "Final pay records",
            why: "Shows whether a final payment and statement were given, and when.",
            examples: [
              "Final wage statement (if any)",
              "Bank records around the final pay date",
              "Messages asking for the final pay",
            ],
          },
        ],
      },
      {
        id: "unauthorized-deduction-unpaidwages",
        name: "Money was withheld or deducted from wages without the authority the Act requires",
        plainExplanation:
          "Under s. 13(1) of the Employment Standards Act, 2000, an employer shall not withhold wages " +
          "payable to an employee, make a deduction from an employee's wages, or cause the employee to " +
          "return wages to the employer, unless authorized to do so under that section. Under s. 13(2) " +
          "and (3), it is authorized if a statute of Ontario or Canada or a court order authorizes it, " +
          "or with the employee's written authorization. Under s. 13(4), neither applies if the " +
          "statute, order or authorization requires the employer to send the money to a third person " +
          "and the employer fails to do so. Under s. 13(5), a written authorization does not apply if " +
          "it does not refer to a specific amount or give a formula from which a specific amount may be " +
          "calculated; if the wages were withheld, deducted or required to be returned because of " +
          "faulty work, or because the employer had a cash shortage, lost property or had property " +
          "stolen and a person other than the employee had access to the cash or property (or under " +
          "prescribed conditions); or if the wages required to be returned were the subject of an order " +
          "under the Act. Section 13(6) says the cash-shortage circumstances include a customer of a " +
          "restaurant, gas station or other establishment leaving without paying. This part of the " +
          "checklist only applies where money was taken off or held back from pay.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-01-01",
        evidenceCategories: [
          {
            name: "The deduction",
            why: "Shows what was taken off, when, and the reason given.",
            examples: [
              "Wage statements showing each deduction and its stated purpose",
              "Messages from the employer explaining the deduction",
            ],
          },
          {
            name: "Any authorization",
            why: "Shows whether a written authorization exists and what it says.",
            examples: ["Any signed authorization form or clause", "Records showing there was none"],
          },
        ],
      },
      {
        id: "amount-within-jurisdiction-unpaidwages",
        name: "The amount claimed falls within Small Claims Court's jurisdiction",
        plainExplanation:
          "Ontario's Small Claims Court guide says the court \"can handle any action for the payment of " +
          "money or the recovery of personal property where the amount claimed does not exceed $50,000, " +
          "excluding interest and costs such as court fees.\" The $50,000 figure is the amount " +
          "prescribed by O. Reg. 626/00, s. 1(1), for the court's jurisdiction under s. 23(1) of the " +
          "Courts of Justice Act.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        alsoCites: [
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/000626_e.doc",
            pinpoint: "O. Reg. 626/00, s. 1(1)",
          },
          {
            sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
            pinpoint: "Courts of Justice Act, s. 23(1)",
          },
        ],
        evidenceCategories: [
          {
            name: "Cost documentation",
            why: "Supports the specific dollar amount claimed.",
            examples: [
              "Calculation of the wages owing (hours x rate, or pay periods missed)",
              "Wage statements and bank records supporting the calculation",
            ],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "dispute-hours-rate-amount-unpaidwages",
        name: "The employer disputes the hours worked, the rate of pay, or the amount owing",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a " +
          "defendant who wishes to dispute the claim serves the Defence on every other party and files " +
          "it, with proof of service, within 20 days of being served with the claim. This topic is " +
          "about a Defence whose reasons dispute the hours worked, the agreed rate of pay, or how the " +
          "amount owing was calculated.",
        whenThisComesUp:
          "When the employer's Defence accepts that the person worked there but says fewer hours were " +
          "worked, a lower rate was agreed, or less is owed.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
      {
        id: "dispute-employee-status-unpaidwages",
        name: "The employer says the person was not an employee",
        plainExplanation:
          "Under rule 9.02 of the Rules of the Small Claims Court, a Defence (Form 9A) sets out \"the " +
          "reasons why the defendant disputes the plaintiff's claim, expressed in concise non-technical " +
          "language with a reasonable amount of detail\", and a copy of any document the defence is " +
          "based on is attached (if it is unavailable, the Defence says why). Under rule 9.01, a " +
          "defendant who wishes to dispute the claim serves the Defence on every other party and files " +
          "it, with proof of service, within 20 days of being served with the claim. This topic is " +
          "about a Defence whose reasons dispute that the person was an employee at all -- for example, " +
          "by saying they were an independent contractor, a volunteer, or working for someone else.",
        whenThisComesUp:
          "When the Defence says the person was a contractor, a volunteer, or employed by a different " +
          "company or person.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2025-10-14",
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-no-agreement-existed",
      "defence-set-off-or-counterclaim",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "CHOOSING BETWEEN AN EMPLOYMENT STANDARDS COMPLAINT AND A COURT CLAIM MATTERS, AND THE CHOICE " +
          "CAN BE FINAL. Under s. 97(1) of the Employment Standards Act, 2000, an employee who files a " +
          "complaint under the Act about an alleged failure to pay wages (or to comply with Part XIII, " +
          "Benefit Plans) may not commence a civil proceeding about the same matter. There is one way " +
          "back: under s. 97(4), an employee who withdraws the complaint within two weeks after it is " +
          "filed may then commence a civil proceeding. The reverse also applies: under s. 98(1), an " +
          "employee who commences a civil proceeding about an alleged failure to pay wages may not file " +
          "a complaint about the same matter or have one investigated. Under s. 8(1), subject to s. 97, " +
          "no civil remedy of an employee against their employer is affected by the Act. Separately, " +
          "under s. 96(3), a complaint about a contravention that occurred more than two years before " +
          "the complaint was filed is deemed not to have been filed. Because the choice can be final, " +
          "which route to take is a decision worth taking to a licensed paralegal or lawyer before " +
          "filing anything.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-01-01",
      },
      {
        note:
          "Under s. 8(2) of the Employment Standards Act, 2000, where an employee commences a civil " +
          "proceeding against their employer under the Act, notice of the proceeding shall be served on " +
          "the Director of Employment Standards, on a form approved by the Director, on or before the " +
          "date the civil proceeding is set down for trial.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2026-01-01",
      },
      {
        note:
          "Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
          "cannot be started after the second anniversary of the day the claim was discovered. Section " +
          "5(1) says when a claim is discovered: the earlier of the day the person first knew that the " +
          "injury, loss or damage had occurred, that it was caused or contributed to by an act or " +
          "omission, that the act or omission was that of the person the claim is against, and that, " +
          "having regard to the nature of the injury, loss or damage, a proceeding would be an " +
          "appropriate means to seek to remedy it -- and the day a reasonable " +
          "person with their abilities and in their circumstances first ought to have known those " +
          "things. Under s. 5(2), a person with a claim is presumed to have known of those matters on " +
          "the day the act or omission the claim is based on took place, unless the contrary is proved.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        consolidationPeriod: "2024-12-04",
      },
    ],
    signals: [
      "employer never paid my wages",
      "didn't get my final paycheque",
      "boss stopped paying me but I kept working",
      "worked for two weeks and never got paid",
      "last pay never came after I quit",
      "employer owes me back pay",
      "paid less than minimum wage",
      "employer took money off my pay for a shortage",
      "pay was held back after I left the job",
      "employer deducted from my pay without asking",
      "pay stub doesn't match what I was owed",
      "paycheque is weeks late",
      "my employer won't pay me for the hours I worked",
      "boss never paid me",
      "never paid me for my shifts",
      "didn't pay me for the hours I worked",
    ],
    typicalDefendantProfile: "either",
    citations: [
      {
        sourceName: "Employment Standards Act, 2000, S.O. 2000, c. 41",
        officialUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint:
          "s. 1(1) (\"employee\", \"employer\", \"wages\", \"Director\"); ss. 3(1)-(2), 5(1), 8(1)-(2), 11(1), " +
          "11(5), 12(1), 12.1, 13, 15(1), 23(1), 96(3), 97(1), 97(4), 98(1). Consolidation from " +
          "2026-01-01.",
      },
      {
        sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
        officialUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "s. 23(1)",
      },
      {
        sourceName: "O. Reg. 626/00 (Small Claims Court Jurisdiction and Appeal Limit)",
        officialUrl: "https://www.ontario.ca/laws/docs/000626_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "s. 1(1)",
      },
      {
        sourceName: "Rules of the Small Claims Court, O. Reg. 258/98",
        officialUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "rr. 9.01, 9.02",
      },
      {
        sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
        officialUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
        verifiedAt: "2026-09-30",
        pinpoint: "ss. 4, 5(1), 5(2)",
      },
      {
        sourceName: "Ontario.ca -- Guide to procedures in Small Claims Court: making a claim",
        officialUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
        verifiedAt: "2026-09-30",
        pinpoint: "jurisdiction",
      },
    ],
    reviewedAt: "2026-09-30",
    status: "reviewed",
  },
];

/**
 * The first library above, then every batch written after it
 * (moreClaimTypes/, 2026-10-07: the owner's direction to cover hundreds of
 * case types, each sourced and checked by test:catalogue-verified).
 */
export const CLAIM_TYPES: ClaimType[] = [...CORE_CLAIM_TYPES, ...MORE_SMALL_CLAIMS_TYPES];
