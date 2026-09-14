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
 * No general defamation-elements framework is sourced or asserted here,
 * consistent with why "negligence elements"/"breach of contract
 * elements" were already cut from educationTopics.ts -- this entry's
 * plaintiffElements are scoped to only the generic proof-burden framing
 * (reused, as elsewhere) plus these two specifically-sourced procedural
 * facts, not invented substantive defamation law.
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

export type EvidenceCategory = {
  name: string;
  why: string;
  examples: string[];
};

export type PlaintiffElement = {
  id: string;
  name: string;
  plainExplanation: string;
  sourceUrl: string;
  evidenceCategories: EvidenceCategory[];
  /**
   * OPTIONAL, and the optionality is the point.
   *
   * 146 sub-entries across this file carry a sourceUrl and no date, so nothing
   * tracks whether any of them has gone stale. Making these required would
   * force 146 dates to be invented in one commit; a verifiedAt that was not
   * verified is worse than none, because it converts an unknown into a false
   * assurance.
   *
   * Optional means NEW entries carry them and old ones are VISIBLY absent.
   * verifyIntakeCoverage reports the count the way it reports noting-up --
   * the gap stays in the data instead of being invisible by omission. The
   * backfill plan is in OUTSTANDING_ISSUES.md.
   *
   * consolidationPeriod is what the SOURCE says about itself, not when we
   * looked. See docs/SOURCED_FACT_CONVENTIONS.md.
   */
  verifiedAt?: string;
  consolidationPeriod?: string;
};

export type DefendantConsideration = {
  id: string;
  name: string;
  plainExplanation: string;
  whenThisComesUp: string;
  sourceUrl: string;
  verifiedAt?: string;
  consolidationPeriod?: string;
};

export type ProceduralNote = {
  note: string;
  sourceUrl: string;
  verifiedAt?: string;
  consolidationPeriod?: string;
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
};

export const DEFENCE_CONCEPTS: DefenceConcept[] = [
  {
    id: "defence-limitation-period-expired",
    name: "Limitation period expired",
    plainExplanation:
      "In most cases, a claim generally cannot be started more than 2 years after it was " +
      "discovered (or reasonably should have been discovered). If that window has passed, this is " +
      "often raised as a reason the claim can't proceed at all, separate from whether the " +
      "underlying facts are true.",
    sourceUrl: "https://www.ontario.ca/page/civil-claims-suing-and-being-sued",
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
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "defence-set-off-or-counterclaim",
    name: "Set-off or counterclaim",
    plainExplanation:
      "A defendant can bring their own claim against the plaintiff (or someone else) as part of the " +
      "same case, called a Defendant's Claim (Form 10A) -- for example, if the defendant believes " +
      "the plaintiff owes them money too, or that someone else should be responsible. " +
      "The Rules say it may be ISSUED within 20 days after the day the defence is filed. Issuing and " +
      "filing are different steps: a claim is issued by the court, and the 20 days runs from the day " +
      "the defence was filed, not from when it was served or received. " +
      "Missing that window does not end it. After those 20 days a Defendant's Claim may still be " +
      "issued WITH LEAVE OF THE COURT -- permission the court gives -- at any point before trial or " +
      "default judgment. After trial or default judgment, that route is no longer available. " +
      "Once issued, it still has to be served on every person it is made against, and the same " +
      "six-month service window that applies to a plaintiff's claim applies to it. " +
      "How the 20 days is counted: the Rules count time by excluding the first day and including the " +
      "last, and if the last day falls on a holiday the period ends on the next day that is not a " +
      "holiday. \"Holiday\" is defined to include any Saturday or Sunday, so intervening weekends are " +
      "counted and do not extend the period -- only the last day moves.",
    sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "defence-waiver-release-assumption-of-risk",
    name: "Waiver, release, or assumption of risk",
    plainExplanation:
      "Under the Occupiers' Liability Act, an occupier's general duty to keep premises reasonably " +
      "safe does not apply to risks a person willingly assumed by entering -- though even then, the " +
      "occupier still can't deliberately create a danger or act with reckless disregard for that " +
      "person's safety. A signed waiver or release is often raised in connection with this.",
    sourceUrl: "https://www.ontario.ca/laws/docs/90o02_e.doc",
    reviewedAt: null,
    status: "draft",
  },
  {
    id: "defence-contributory-negligence",
    name: "Contributory negligence",
    plainExplanation:
      "Ontario's Negligence Act says that when a court finds the plaintiff's own fault or " +
      "negligence contributed to their damages, the court apportions (divides) the damages between " +
      "the parties in proportion to their respective degree of fault, rather than an all-or-nothing " +
      "result.",
    sourceUrl: "https://www.ontario.ca/laws/docs/elaws_statutes_90n01_e.doc",
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
  typicalDefendantProfile: "individual" | "business" | "either";
  /** Non-empty tuple, compile-time enforced -- same pattern as educationTopics.ts. */
  citations: [EducationCitation, ...EducationCitation[]];
  reviewedAt: string | null;
  status: "draft" | "reviewed";
};

export const CLAIM_TYPES: ClaimType[] = [
  {
    id: "sc-claim-unpaid-debt-services",
    name: "Unpaid debt or non-payment for services",
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "existed-agreement-or-understanding",
        name: "An agreement or understanding for payment existed",
        plainExplanation:
          "The person bringing the claim generally has to show, on a balance of probabilities, " +
          "that there was an agreement or understanding involving payment -- whether written, " +
          "verbal, or based on the parties' conduct.",
        sourceUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
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
          "Small Claims Court's jurisdiction covers claims for payment of money -- this element is " +
          "about showing the underlying service was actually performed, or the money was actually " +
          "advanced or is owed.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
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
          "The claimed amount, and the fact that it hasn't been paid, are part of what a claim " +
          "sets out -- interest and costs are handled separately from, and in addition to, the " +
          "amount claimed itself.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
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
          "A defendant can file a Defence disputing that the work was finished, or that it met what " +
          "was agreed -- this becomes a fact the court has to weigh alongside the plaintiff's " +
          "evidence, not an automatic bar to the claim.",
        whenThisComesUp: "When the defendant has filed a Defence (Form 9A) raising quality or completion issues.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "defendant-was-occupier",
        name: "The defendant was the occupier of the premises",
        plainExplanation:
          "The Occupiers' Liability Act's duty of care applies to whoever occupies (is in " +
          "possession or control of) the premises where the incident happened -- often, but not " +
          "always, a business.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90o02_e.doc",
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
          "An occupier owes a duty to take reasonable care to see that people entering the premises " +
          "are reasonably safe. This applies whether the danger came from the condition of the " +
          "property itself or from an activity carried on there. " +
          "The statute states the duty in the abstract; the Supreme Court of Canada has considered " +
          "what it concretely requires for snow and ice. In a case about a fall on an icy, unsalted " +
          "parking area, the Court agreed that doing nothing at all to make a treacherous area less " +
          "slippery fell short of reasonable care, in circumstances where sand and salt were " +
          "inexpensive and readily available -- while noting the duty did not extend to salting or " +
          "sanding every square inch, only the part visitors were known to use. The Court also held " +
          "that a local custom of not salting or sanding does not displace the duty: \"no amount of " +
          "general community compliance will render negligent conduct 'reasonable ... in all the " +
          "circumstances'.\" What reasonable care required there is not a rule about what it requires " +
          "everywhere -- the statutory test is what is reasonable in all the circumstances of the " +
          "particular case.",
        sourceUrl: "docs/sources/waldick-v-malcolm-1991-2-SCR-456.pdf",
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
          "There generally needs to be a connection shown between the unsafe condition and the harm " +
          "that resulted -- not just that a condition existed and separately that an injury occurred. " +
          "The Occupiers' Liability Act sets the duty of care but says nothing about causation; that " +
          "comes from the general law of negligence. The factual part is generally tested with the " +
          "\"but for\" test -- the plaintiff must show, on a balance of probabilities, that the injury " +
          "would not have occurred but for the defendant's negligent act. That is a factual inquiry, " +
          "applied in a robust, common-sense way: scientific evidence of precisely how much the " +
          "defendant's negligence contributed is not required. Separately, the damage must not be too " +
          "remote -- it must have been reasonably foreseeable. See \"The elements of a negligence " +
          "claim\" for the fuller general framework this draws from.",
        sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2012/2012scc32/2012scc32.html",
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
    ],
    defendantConsiderations: [
      {
        id: "duty-restricted-by-contract",
        name: "The occupier's duty was restricted or excluded by contract",
        plainExplanation:
          "An occupier's duty of care applies except to the extent the occupier is free to, and " +
          "does, restrict, modify, or exclude that duty -- for example, through a signed waiver in " +
          "some contexts.",
        whenThisComesUp: "When the plaintiff signed a waiver, release, or contract with the occupier before the incident.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90o02_e.doc",
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
          "and walking on anyway is not, on its own, willing assumption of risk under this section.",
        whenThisComesUp: "When the Defence says the person could see the hazard and chose to proceed anyway.",
        sourceUrl: "docs/sources/waldick-v-malcolm-1991-2-SCR-456.pdf",
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
          "Claims like this are generally subject to Ontario's standard 2-year limitation period, " +
          "running from when the incident (or the injury) was discovered -- but for an injury caused " +
          "by snow or ice specifically, a much shorter notice deadline can apply on top of it. See " +
          "the next note.",
        sourceUrl: "https://www.ontario.ca/page/civil-claims-suing-and-being-sued",
      },
      {
        note:
          "Where the personal injury was caused by SNOW OR ICE, the Occupiers' Liability Act requires " +
          "written notice of the claim -- including the date, time, and location -- to be personally " +
          "served on, or sent by registered mail to, an occupier of the premises or an independent " +
          "contractor employed to remove snow or ice there, within 60 days of the injury. No action " +
          "may be brought without that notice. The Act sets out two exceptions: notice is not required " +
          "where the injured person died as a result of the injury, and a judge may excuse missing or " +
          "insufficient notice where there is a reasonable excuse and the defendant is not prejudiced " +
          "in its defence. Notice to any one of the people the Act lists is enough, even if the action " +
          "is later brought against someone who didn't originally receive it. This 60-day requirement " +
          "is separate from, and much shorter than, the ordinary 2-year limitation period.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90o02_e.doc",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "towed-without-consent",
        name: "The vehicle was towed without required consent",
        plainExplanation:
          "Under Ontario's towing rules, a tow truck driver or towing company generally needs the " +
          "vehicle owner's consent to tow a vehicle, unless the tow was initiated by police or " +
          "another authorized official.",
        sourceUrl: "https://www.ontario.ca/page/know-your-rights-when-getting-tow",
        evidenceCategories: [
          {
            name: "Records showing no consent was given",
            why: "Directly supports that the tow was unauthorized.",
            examples: ["Timeline of events", "Witness account of the tow happening", "Any communication with the towing company"],
          },
        ],
      },
      {
        id: "no-rate-disclosure",
        name: "Required rate or cost disclosure was not given",
        plainExplanation:
          "Tow truck drivers, towing companies, and vehicle storage providers must give their rates " +
          "before providing services, and must be certified to operate in Ontario.",
        sourceUrl: "https://www.ontario.ca/page/know-your-rights-when-getting-tow",
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
      },
      {
        note:
          "The Ministry's oversight under this Act only covers events on or after January 1, 2024.",
        sourceUrl: "https://www.ontario.ca/page/know-your-rights-when-getting-tow",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "goods-not-as-agreed",
        name: "The goods delivered were defective, not as described, or never arrived",
        plainExplanation:
          "Ontario's Sale of Goods Act addresses each of these three situations separately. " +
          "NOT AS DESCRIBED: where goods are sold by description, there is an implied condition that " +
          "the goods will correspond with the description. " +
          "DEFECTIVE: the Act starts from the position that there is NO implied condition as to " +
          "quality or fitness, subject to listed exceptions -- two of which are that goods bought by " +
          "description from a seller who deals in goods of that description carry an implied condition " +
          "of merchantable quality (though not as to defects an examination the buyer actually made " +
          "ought to have revealed), and that goods are reasonably fit for a particular purpose the " +
          "buyer made known to the seller so as to show reliance on the seller's skill or judgment " +
          "(though not where a specified article is bought under its patent or other trade name). " +
          "NEVER ARRIVED: separately from any question of quality, it is the duty of the seller to " +
          "deliver the goods, and of the buyer to accept and pay for them, in accordance with the " +
          "terms of the contract. " +
          "Which of these applies depends on what was agreed and what happened.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90s01_e.doc",
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
          "Small Claims Court's money jurisdiction covers this kind of claim (up to $50,000, not " +
          "counting interest and costs) -- the claimed amount should reflect the refund, replacement " +
          "cost, or difference in value involved.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "existed-agreement-sale",
        name: "An agreement existed for the sale of goods",
        plainExplanation:
          "The seller generally has to show, on a balance of probabilities, that an agreement for the " +
          "sale existed on the terms claimed.",
        sourceUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
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
          "The person bringing the claim generally has to show, on a balance of probabilities, that " +
          "the goods were actually delivered to the buyer, or otherwise made available to them in the " +
          "way the agreement provided for.",
        sourceUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
        evidenceCategories: [
          {
            name: "Proof of delivery",
            why: "Shows the seller held up their side of the agreement.",
            examples: ["Delivery confirmation", "Sign-off or pickup confirmation", "Photos at time of handoff"],
          },
        ],
      },
      {
        id: "amount-unpaid-goods",
        name: "The amount claimed is accurate and remains unpaid",
        plainExplanation:
          "The person bringing the claim generally has to show, on a balance of probabilities, what " +
          "price was agreed for the goods, what -- if anything -- the buyer has already paid, and what " +
          "remains outstanding.",
        sourceUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
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
          "The Small Claims Court has jurisdiction in any action for the payment of money where the " +
          "amount claimed does not exceed the prescribed amount ($50,000, excluding interest and " +
          "costs) -- this is a monetary jurisdiction, not a subject-matter one.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
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
          "A defendant can file a Defence disputing that the goods matched the agreed description or " +
          "quality -- this becomes a fact the court weighs alongside the seller's evidence.",
        whenThisComesUp: "When the defendant has filed a Defence (Form 9A) disputing the goods themselves, not just non-payment.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
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
        name: "Notice of withdrawal (if relied on) was given within the required time",
        plainExplanation:
          "An agreement entered into by a consumer after or while a person has engaged in an unfair " +
          "practice may be rescinded by the consumer, who is entitled to any remedy available in law, " +
          "including damages. Where rescission is no longer possible -- because the goods or services " +
          "can no longer be returned, or because rescission would deprive a good-faith third party of " +
          "a right acquired for value -- the consumer may instead recover the amount by which their " +
          "payment exceeds the value the goods or services have to them, or damages, or both. " +
          "Either way the consumer must give notice within ONE YEAR after entering into the agreement. " +
          "The notice may be expressed in any way that indicates the intention to rescind or to seek " +
          "recovery and the reasons for it, may be delivered by any means, and (except by personal " +
          "service) is deemed given when sent.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
        evidenceCategories: [
          {
            name: "Notice of withdrawal",
            why: "Shows the withdrawal step was taken and when.",
            examples: ["Copy of the notice sent to the business", "Date-stamped email or letter"],
          },
        ],
      },
      {
        id: "loss-amount-cpa",
        name: "A specific loss resulted",
        plainExplanation:
          "The person bringing the claim generally has to show, on a balance of probabilities, that " +
          "they actually suffered a loss, and what that loss was -- put in specific terms, not left " +
          "as a general sense of having been treated unfairly.",
        sourceUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
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
          "The Small Claims Court has jurisdiction in any action for the payment of money where the " +
          "amount claimed does not exceed the prescribed amount ($50,000, excluding interest and " +
          "costs) -- this is a monetary jurisdiction, not a subject-matter one.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
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
          "A defendant can file a Defence disputing that a Consumer Protection Act violation " +
          "occurred at all.",
        whenThisComesUp: "When the defendant's Defence denies making the representation, or says it was accurate.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Notice to rescind (or to seek recovery where rescission is not possible) under the " +
          "Consumer Protection Act, 2002 must be given within 1 year after entering into the " +
          "agreement. That 1-year notice period is separate from, and shorter than, Ontario's " +
          "ordinary 2-year limitation period for starting a court action.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02c30_e.doc",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "existed-agreement-contractor",
        name: "An agreement existed describing the work to be done",
        plainExplanation:
          "The person bringing the claim generally has to show, on a balance of probabilities, what " +
          "the contractor was actually engaged to do.",
        sourceUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
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
          "The person bringing the claim generally has to show, on a balance of probabilities, what " +
          "it actually costs to repair or replace what was damaged -- the amount claimed should " +
          "reflect that documented cost, not an estimate of how much the damage felt like it was " +
          "worth.",
        sourceUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
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
          "The Small Claims Court has jurisdiction in any action for the payment of money where the " +
          "amount claimed does not exceed the prescribed amount ($50,000, excluding interest and " +
          "costs) -- this is a monetary jurisdiction, not a subject-matter one.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
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
          "A defendant can file a Defence disputing that their work caused the damage, or pointing to " +
          "a separate cause.",
        whenThisComesUp: "When the defendant's Defence denies responsibility for the specific damage claimed.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "minimum-employment-length",
        name: "The employee was continuously employed for at least 3 months",
        plainExplanation:
          "In most cases, an employee is entitled to notice of termination (or termination pay " +
          "instead of notice) once they've been continuously employed for at least 3 months.",
        sourceUrl: "https://www.ontario.ca/document/your-guide-employment-standards-act-0/termination-employment",
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
          "An employer must provide written notice of termination, termination pay, or a combination " +
          "equal to the required notice period, which ranges from 1 week (under 1 year of employment) " +
          "up to 8 weeks (8 years or more), based on length of service. " +
          "IMPORTANT: that Employment Standards Act scale is a statutory FLOOR, not the whole picture. " +
          "\"Wrongful dismissal\" is a common-law action, and the Supreme Court of Canada has " +
          "described it as based on an implied obligation in the employment contract to give " +
          "REASONABLE notice of an intention to end the relationship where there is no just cause. " +
          "Reasonable notice at common law is frequently longer than the ESA minimum, and is assessed " +
          "case by case. The Court has applied four factors from the Bardal case: the character of " +
          "the employment, the length of service, the employee's age, and the availability of similar " +
          "employment having regard to the employee's experience, training and qualifications. The " +
          "Court has been explicit there can be \"no catalogue laid down\" of what is reasonable for " +
          "particular classes of case -- it depends on the individual's particular circumstances. " +
          "Working out what notice period a given situation calls for is exactly the kind of " +
          "assessment this platform does not do; it is a question for a licensed paralegal or lawyer.",
        sourceUrl: "docs/sources/honda-canada-v-keays-2008-SCC-39.pdf",
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
          "Small Claims Court can only hear claims up to $50,000, excluding interest and costs.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
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
          "A defendant can file a Defence disputing the length of continuous employment used to " +
          "calculate notice, or the notice/termination pay calculation itself.",
        whenThisComesUp: "When the employer's Defence disputes the employment dates or how notice was calculated, not just whether any is owed.",
        sourceUrl: "https://www.ontario.ca/document/your-guide-employment-standards-act-0/termination-employment",
      },
      {
        id: "employer-relies-on-termination-clause",
        name: "The employer relies on a termination clause in the employment contract",
        plainExplanation:
          "The common-law presumption of reasonable notice can be rebutted, but only by an agreement " +
          "that clearly specifies some other notice period. Where an employer points to a termination " +
          "clause, the Supreme Court of Canada has held that a clause providing LESS than the " +
          "statutory minimum is null and void -- the Employment Standards Act, 2000 makes any " +
          "contracting out of or waiver of an employment standard void -- and that such a clause " +
          "cannot then be used even as evidence of what the parties intended. The result is that the " +
          "presumption of reasonable notice is not rebutted and the common-law entitlement applies. " +
          "Whether a particular clause is valid is a legal question about that specific wording, and " +
          "is not something this content can answer.",
        whenThisComesUp: "When the Defence says the contract already set out what was owed on termination and that amount was paid.",
        sourceUrl: "docs/sources/machtinger-v-hoj-industries-1992-1-SCR-986.pdf",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Small Claims Court can only hear this kind of claim if the amount owing is within its " +
          "$50,000 monetary jurisdiction; larger wrongful dismissal claims generally go to a " +
          "different court.",
        sourceUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
      },
      {
        note:
          "CHOOSING BETWEEN THE TWO ROUTES MATTERS, AND THE CHOICE CAN BE FINAL. An employee who " +
          "files a complaint under the Employment Standards Act, 2000 alleging an entitlement to " +
          "termination pay or severance pay MAY NOT commence a civil proceeding for wrongful " +
          "dismissal if the complaint and the proceeding would relate to the same termination or " +
          "severance of employment. There is one way back: an employee who withdraws the complaint " +
          "within two weeks after filing it may then commence a civil proceeding. Otherwise, apart " +
          "from that bar, the Act does not affect an employee's civil remedies against their " +
          "employer. Because the ESA route is capped at the statutory minimum while a civil " +
          "wrongful-dismissal action is for common-law reasonable notice, which route to take is a " +
          "consequential decision worth getting advice on before filing anything.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
      },
      {
        note:
          "The Employment Standards Act, 2000 also states that where a provision of an employment " +
          "contract (or another Act) directly relating to the same subject matter as an employment " +
          "standard gives the employee a GREATER benefit, that provision applies and the employment " +
          "standard does not. The statutory scale is a floor that a contract can improve on, not a " +
          "ceiling.",
        sourceUrl: "https://www.ontario.ca/laws/docs/00e41_e.doc",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "dog-caused-bite-or-attack",
        name: "The dog bit or attacked the person (or another domestic animal)",
        plainExplanation:
          "The owner of a dog is liable for damages resulting from a bite or attack by the dog on " +
          "another person or domestic animal.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90d16_e.doc",
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
      },
      {
        id: "criminal-act-on-premises-exception",
        name: "The incident happened on the owner's premises during a criminal act by the injured person",
        plainExplanation:
          "When a bite or attack happens on the owner's own premises, this Act (not the Occupiers' " +
          "Liability Act) applies, and the Act sets out a narrow exception where the owner is not " +
          "liable if the injured person was committing a criminal act there, unless the dog was kept " +
          "unreasonably for the purpose of protecting persons or property.",
        whenThisComesUp: "When the incident happened at the owner's home or business and the owner says the injured person was committing a crime there at the time.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90d16_e.doc",
      },
    ],
    applicableDefenceConceptIds: ["defence-contributory-negligence", "defence-limitation-period-expired", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Claims like this are generally subject to Ontario's standard 2-year limitation period, " +
          "running from when the incident (or the injury) was discovered.",
        sourceUrl: "https://www.ontario.ca/page/civil-claims-suing-and-being-sued",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "existed-agreement-services",
        name: "An agreement existed for the service to be performed",
        plainExplanation:
          "The person bringing the claim generally has to show, on a balance of probabilities, what " +
          "the other party was actually engaged to do.",
        sourceUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
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
          "Small Claims Court's jurisdiction covers claims for money, up to $50,000, not counting " +
          "interest and costs -- the claimed amount should reflect the refund, or the cost to complete " +
          "or redo the work.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
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
          "A defendant can file a Defence disputing that the service was incomplete or below what was " +
          "agreed -- this becomes a fact the court weighs alongside the plaintiff's evidence.",
        whenThisComesUp: "When the defendant has filed a Defence (Form 9A) disputing the quality or completion of the service.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "plaintiff-owns-or-has-right-to-property",
        name: "The plaintiff owns the property or has a right to its possession",
        plainExplanation:
          "The person bringing the claim generally has to show, on a balance of probabilities, that " +
          "they own the property or otherwise have a right to have it back.",
        sourceUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
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
          "Small Claims Court hears claims for money or the return of personal property -- this " +
          "element is about showing the other party currently has the property and hasn't given it " +
          "back.",
        sourceUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
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
          "A defendant can file a Defence disputing who actually owns the property, or that the " +
          "plaintiff has any right to its return.",
        whenThisComesUp: "When the defendant's Defence claims the property is theirs, or that it was a gift rather than something lent.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-return-of-property", "sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Small Claims Court has jurisdiction over an action for the recovery of possession of " +
          "personal property, as well as over actions for the payment of money, where the value of " +
          "the property does not exceed the prescribed amount.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
      },
      {
        note:
          "An order for the delivery of personal property is enforced by a writ of delivery issued to " +
          "a bailiff. If the bailiff cannot find or take the property named in that writ, the person " +
          "who obtained the order can bring a motion asking the court to direct the bailiff to seize " +
          "other personal property belonging to the person the order was made against instead. That " +
          "person has to pay the bailiff's storage costs in advance as the process goes on -- if they " +
          "don't, the seizure is treated as abandoned.",
        sourceUrl: "https://www.ontario.ca/laws/docs/980258_e.doc",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "contract-covered-by-cooling-off",
        name: "The agreement falls into a category with a cancellation right",
        plainExplanation:
          "Ontario law gives a cooling-off period -- a specific number of days to cancel an agreement " +
          "without reason or penalty -- for certain contracts: a product or service bought from a " +
          "door-to-door salesperson (a direct agreement), paying in advance to join a fitness club or " +
          "gym (a personal development contract), buying a newly-built condo, getting a payday loan, " +
          "or purchasing a time share. " +
          "Two of those five are NOT governed by the Consumer Protection Act at all: the cooling-off " +
          "right for a newly-built condo comes from the Condominium Act, and the one for a payday " +
          "loan from the Payday Loans Act. Each of those statutes has its own mechanics, which may " +
          "differ from the Consumer Protection Act's -- the source relied on here already shows one " +
          "such difference, in that a payday lender has 2 days to refund where for most contracts a " +
          "business has 15. This entry is written around the Consumer Protection Act; for a new-build " +
          "condo or a payday loan, the governing statute is a different one and would need to be " +
          "checked on its own terms.",
        sourceUrl: "https://www.ontario.ca/page/your-rights-under-consumer-protection-act",
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
          "The cooling-off right generally has to be exercised by giving the seller notice of " +
          "cancellation within the applicable period for that type of contract.",
        sourceUrl: "https://www.ontario.ca/page/your-rights-under-consumer-protection-act",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "tenancy-is-commercial-not-residential",
        name: "The tenancy is a commercial/business tenancy, not a residential one",
        plainExplanation:
          "Ontario's Commercial Tenancies Act outlines the relationship, rights, and obligations " +
          "between commercial landlords and tenants -- a different framework from the Residential " +
          "Tenancies Act, which covers residential rental units.",
        sourceUrl: "https://www.ontario.ca/page/renting-commercial-property-ontario",
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
          "The person bringing the claim generally has to show, on a balance of probabilities, that " +
          "an agreement existed on the terms alleged -- and a signed commercial lease's own terms may " +
          "take precedence over the Commercial Tenancies Act's default rules.",
        sourceUrl: "https://www.ontario.ca/page/renting-commercial-property-ontario",
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
          "Small Claims Court can hear claims for money -- including unpaid rent -- up to $50,000, " +
          "excluding interest and costs.",
        sourceUrl: "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim",
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
        whenThisComesUp: "When there's a real dispute about whether the space was used mainly for residential or business purposes.",
        sourceUrl: "https://www.ontario.ca/page/renting-commercial-property-ontario",
      },
      {
        id: "lease-terms-govern",
        name: "The signed lease's own terms may override the default rules",
        plainExplanation:
          "A signed commercial lease agreement between the landlord and tenant may take precedence " +
          "over the Commercial Tenancies Act's default provisions.",
        whenThisComesUp: "When the dispute is about which rule applies -- the Act's default rule or a specific term the lease itself sets out.",
        sourceUrl: "https://www.ontario.ca/page/renting-commercial-property-ontario",
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
          "If there's a genuine dispute about whether a tenancy is residential or commercial, either " +
          "party can ask the Landlord and Tenant Board to determine whether the Residential Tenancies " +
          "Act applies -- a residential tenancy generally belongs at the LTB, not Small Claims Court.",
        sourceUrl: "https://www.ontario.ca/page/renting-commercial-property-ontario",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "payment-made-by-cheque",
        name: "Payment was made (or attempted) by cheque",
        plainExplanation:
          "Small Claims Court's overview of what it hears explicitly lists NSF (non-sufficient funds) " +
          "cheques as an example of a claim it can decide.",
        sourceUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
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
          "This element is about showing the cheque itself failed to clear -- the bank's own record of " +
          "the returned item is typically the most direct proof.",
        sourceUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
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
          "A defendant can file a Defence disputing the debt the cheque was meant to pay, not just the " +
          "fact that the cheque itself didn't clear.",
        whenThisComesUp: "When the defendant's Defence disputes the underlying agreement or amount, not just the payment method.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "overtime-not-paid",
        name: "Overtime pay owed was not paid",
        plainExplanation:
          "For most employees, overtime begins after 44 hours worked in a work week, paid at 1½ " +
          "times the employee's regular rate of pay.",
        sourceUrl: "https://www.ontario.ca/document/your-guide-employment-standards-act-0/overtime-pay",
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
          "For most employees, vacation pay must be at least 4% of the gross wages earned in the " +
          "12-month vacation entitlement year (at least 6% for employees with five or more years of " +
          "employment). Some jobs are exempt from the ESA's vacation-with-pay provisions entirely -- " +
          "Ontario publishes a special rule tool listing the industries and job categories with ESA " +
          "exemptions or special rules, and whether a particular job is one of them is a fact to " +
          "confirm, not something this content assumes. An employment contract or collective " +
          "agreement may also provide a greater right or benefit than the ESA minimum. " +
          "When employment ends, vacation pay already earned but not yet paid is due within 7 days of " +
          "the employment ending or on what would have been the employee's next pay day, whichever is " +
          "later.",
        sourceUrl: "https://www.ontario.ca/document/your-guide-employment-standards-act-0/vacation",
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
          "A defendant can file a Defence disputing the hours claimed, the employee's length of " +
          "service, or how the vacation pay entitlement was calculated.",
        whenThisComesUp: "When the employer's Defence disputes the underlying hours or calculation, not just whether anything is owed at all.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Small Claims Court can only hear this kind of claim if the amount owing is within its " +
          "$50,000 monetary jurisdiction.",
        sourceUrl: "https://www.ontario.ca/page/suing-someone-small-claims-court",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "estimate-or-max-agreed",
        name: "A written estimate was required, or a maximum amount was agreed instead",
        plainExplanation:
          "Before a repair shop can charge you, it generally must have given a written estimate, " +
          "unless the customer declined one and instead agreed on a maximum amount they were willing " +
          "to pay for the repair.",
        sourceUrl: "https://www.ontario.ca/page/car-repair-shops-your-rights",
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
          "A defendant can file a Defence disputing that the charge exceeded the estimate or agreed " +
          "maximum by more than what's allowed, or pointing to additional work the customer separately " +
          "authorized.",
        whenThisComesUp: "When the shop's Defence says the extra charges were separately authorized, or that the original estimate covered the final amount.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: "Parts and labour generally carry a minimum warranty of 90 days or 5,000 km, whichever comes first.",
        sourceUrl: "https://www.ontario.ca/page/car-repair-shops-your-rights",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "dealer-failed-to-disclose",
        name: "The dealer failed to give accurate required information about the vehicle",
        plainExplanation:
          "Where a REGISTERED motor vehicle dealer sells or leases a vehicle to someone who is not " +
          "themselves a registered dealer, the regulation under the Motor Vehicle Dealers Act, 2002 " +
          "requires specific information to be disclosed accurately in the contract. For a used " +
          "vehicle that includes the total distance it has been driven (or, where the dealer can't " +
          "determine that, the distance as of a stated past date), the make, model and model year, " +
          "whether it has been classified as irreparable, salvage or rebuilt, and certain past uses " +
          "such as a daily rental, a police cruiser, or an emergency-services vehicle. " +
          "This regime applies to registered dealers. A genuinely private sale is not covered by it, " +
          "and neither is a sale by someone selling vehicles as a business without being registered.",
        sourceUrl: "https://www.ontario.ca/laws/docs/080333_e.doc",
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
          "of the correct figure.",
        sourceUrl: "https://www.ontario.ca/laws/docs/080333_e.doc",
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
          "The person bringing the claim generally has to show, on a balance of probabilities, that " +
          "they actually suffered a loss, and what that loss was -- put in specific terms, not left " +
          "as a general sense of having overpaid.",
        sourceUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
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
          "The Small Claims Court has jurisdiction in any action for the payment of money where the " +
          "amount claimed does not exceed the prescribed amount ($50,000, excluding interest and " +
          "costs) -- this is a monetary jurisdiction, not a subject-matter one.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
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
          "A defendant can file a Defence disputing that any required disclosure was missing or " +
          "inaccurate at the time of sale.",
        whenThisComesUp: "When the dealer's Defence says the information provided was accurate and complete.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired", "defence-set-off-or-counterclaim", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "For a registered dealer, the Motor Vehicle Dealers Compensation Fund protects deposits and " +
          "payments up to $45,000 if the dealer fails to deliver on a purchase or warranty obligation; " +
          "claims must generally be filed within 2 years of the dealer's refusal or inability to " +
          "return payment. This is a separate path from Small Claims Court, not a substitute step " +
          "required before suing.",
        sourceUrl: "https://www.ontario.ca/page/buying-new-or-used-vehicle-your-rights",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "plaintiff-is-condo-corp",
        name: "The plaintiff is the condominium corporation and the defendant is a unit owner",
        plainExplanation:
          "The Condominium Act, 1998 governs the relationship between a condominium corporation and " +
          "its unit owners, including the corporation's right to collect common expenses.",
        sourceUrl: "https://www.ontario.ca/laws/docs/98c19_e.doc",
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
          "A defendant can file a Defence disputing the amount assessed, billed, or claimed as owing.",
        whenThisComesUp: "When the owner's Defence disputes the calculation or validity of the amount claimed, not just an inability to pay.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
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
          "or the Local Roads Boards Act, or over a prescribed lien or claim.",
        sourceUrl: "https://www.ontario.ca/laws/docs/98c19_e.doc",
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
      },
      {
        note:
          "The lien itself is also time-limited: it expires three months after the default that gave " +
          "rise to it, unless the corporation registers a certificate of lien within that time. At " +
          "least 10 days before registering the certificate, the corporation must give written notice " +
          "of the lien to the affected owner. A registered certificate may be enforced in the same " +
          "manner as a mortgage -- which is a separate path from a Small Claims Court action for the " +
          "money, not a step required before suing.",
        sourceUrl: "https://www.ontario.ca/laws/docs/98c19_e.doc",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "statement-made-and-communicated",
        name: "A statement was made and communicated to someone other than the plaintiff",
        plainExplanation:
          "The person bringing the claim generally has to show, on a balance of probabilities, what " +
          "was said or written and that it reached someone other than the plaintiff.",
        sourceUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
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
          "The Small Claims Court has jurisdiction in any action for the payment of money where the " +
          "amount claimed does not exceed the prescribed amount ($50,000, excluding interest and " +
          "costs) -- this is a monetary jurisdiction, not a subject-matter one, so a claim for money " +
          "arising from a defamatory statement is within it the same as any other money claim.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
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
          "Under the Libel and Slander Act, no action for libel in a newspaper or in a broadcast may " +
          "proceed unless the plaintiff gave the defendant written notice, specifying the matter " +
          "complained of, within 6 weeks after the alleged libel came to the plaintiff's knowledge. " +
          "\"Newspaper\" means a paper containing public news or advertisements, printed for " +
          "distribution to the public and published periodically at least 12 times a year. " +
          "\"Broadcasting\" means dissemination of writing, signs, pictures, or sounds intended for " +
          "the public by wireless radio communication or by cables, wires, fibre-optic linkages, or " +
          "laser beams. This notice requirement applies only when the statement fits one of those two " +
          "specific definitions -- not to defamation generally (for example, something said directly " +
          "to someone, a private message, or an ordinary social media post). " +
          "It is narrower still: section 7 of the Act says subsection 5(1) and section 6 apply ONLY to " +
          "newspapers printed and published in Ontario and to broadcasts from a station in Ontario. A " +
          "newspaper printed and published outside Ontario, or a broadcast from a station outside " +
          "Ontario, falls outside this notice requirement even though it is still a newspaper or a " +
          "broadcast. Whether a particular publisher or broadcaster meets that geographic test is a " +
          "fact to confirm, not something this content assumes.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90l12_e.doc",
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
          "Under the Libel and Slander Act, an action for libel in a newspaper or in a broadcast must " +
          "be commenced within 3 months after the libel came to the knowledge of the person defamed -- " +
          "shorter than the ordinary 2-year limitation period that applies to defamation generally. " +
          "Section 7 limits this the same way it limits the notice requirement: section 6 applies ONLY " +
          "to newspapers printed and published in Ontario and to broadcasts from a station in Ontario. " +
          "Where a national or out-of-province publisher or broadcaster is involved, whether the " +
          "shortened 3-month period applies at all turns on that geographic question. " +
          "Where an action is brought within the 3-month period, it may also include a claim for any " +
          "other libel by the same defendant in the same newspaper or from the same broadcasting " +
          "station within the year before the action started.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90l12_e.doc",
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
        name: "The defendant disputes making the statement, or disputes that it was false or defamatory",
        plainExplanation:
          "A defendant can file a Defence disputing that they made the statement, that it was false, " +
          "or that it was defamatory at all -- this becomes a fact the court weighs alongside the " +
          "plaintiff's evidence.",
        whenThisComesUp: "When the defendant has filed a Defence (Form 9A) disputing the statement itself, not just the amount claimed.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
      },
      {
        id: "responsible-communication-public-interest",
        name: "The defendant argues the statement was responsible communication on a matter of public interest",
        plainExplanation:
          "The Supreme Court of Canada recognized a defence of responsible communication on matters of " +
          "public interest. It has two elements: the publication was on a matter of public interest, " +
          "and the publisher was diligent in trying to verify the allegation, having regard to factors " +
          "including how serious the allegation was, how important and how urgent the matter was, the " +
          "status and reliability of the source, whether the plaintiff's side of the story was sought " +
          "and accurately reported, whether including the defamatory statement was justifiable, and " +
          "whether the public interest lay in the fact that the statement was made rather than in its " +
          "truth. The Court was explicit that this defence is not limited to journalists -- it is " +
          "available to anyone who publishes material of public interest in any medium, expressly " +
          "including blog postings and other online media.",
        whenThisComesUp: "When the statement was published rather than said privately -- an online review, a post, a blog, or any other publication -- and the defendant says it concerned a matter the public had a genuine stake in.",
        sourceUrl: "docs/sources/grant-v-torstar-2009-SCC-61.pdf",
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
      },
      {
        note:
          "In Canadian defamation law, general damages are presumed from the very publication of the " +
          "false statement and are awarded at large -- a plaintiff is not required to document a " +
          "specific financial loss in order to recover them. The Supreme Court of Canada also declined " +
          "to adopt the United States \"actual malice\" standard from New York Times v. Sullivan in " +
          "actions between private litigants. (Separately, in Small Claims Court any amount actually " +
          "awarded is still subject to that court's $50,000 monetary limit.)",
        sourceUrl: "docs/sources/hill-v-church-of-scientology-1995-2-SCR-1130.pdf",
      },
      {
        note:
          "Defamation not involving a newspaper or broadcast (for example, something said directly, a " +
          "private message, or an ordinary social media post) is generally subject to Ontario's " +
          "standard 2-year limitation period instead of the Libel and Slander Act's shortened 3-month " +
          "one -- which of the two applies depends on how the statement was made, not on the amount " +
          "claimed or which court hears it.",
        sourceUrl: "https://www.ontario.ca/page/civil-claims-suing-and-being-sued",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "dcpd-bar-does-not-apply",
        name: "Ontario's direct-compensation insurance bar does not apply to this claim",
        plainExplanation:
          "Under section 263 of the Insurance Act, when a vehicle is damaged by one or more other " +
          "vehicles and BOTH the damaged vehicle and at least one other vehicle involved are insured " +
          "under a motor vehicle liability policy from an insurer bound by this section, the owner " +
          "generally has no right of action against the other driver for damage to their vehicle or " +
          "its contents -- they must instead claim from their own insurer, with recovery based on " +
          "fault as determined under the Fault Determination Rules. That bar does not apply, and an " +
          "ordinary right to sue the at-fault driver directly is preserved, in situations including " +
          "where the at-fault driver's vehicle was not insured under such a policy -- section 263 " +
          "never applies in the first place. Since January 1, 2024, an insured may also elect not to " +
          "claim from their own insurer under this section, but that election on its own does not " +
          "restore a right to sue the other driver directly if section 263 otherwise applies (both " +
          "vehicles insured). Confirming which situation applies here is essential and not something " +
          "this content assumes.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90i08_e.doc",
        evidenceCategories: [
          {
            name: "Proof the other driver's vehicle was not insured",
            why: "Establishes that section 263's bar doesn't apply, so a direct claim against the driver is available.",
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
          "Causation has two parts: whether the breach caused the harm in fact, and whether it also " +
          "caused the harm in law. " +
          "The factual part is generally tested with the \"but for\" test -- the plaintiff must show, " +
          "on a balance of probabilities, that the injury would not have occurred but for the " +
          "defendant's negligent act. That is a factual inquiry, applied in a robust, common-sense " +
          "way: scientific evidence of precisely how much the defendant's negligence contributed is " +
          "not required. (There is a narrow exception where multiple possible wrongdoers are involved " +
          "-- see \"The elements of a negligence claim\" for the fuller general framework, including " +
          "when that exception applies.) " +
          "The legal part asks whether the harm is too remote to fairly hold the defendant liable for " +
          "it, judged by whether it was a real, reasonably foreseeable risk rather than one a " +
          "reasonable person would dismiss as far-fetched.",
        sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2012/2012scc32/2012scc32.html",
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
          "The Small Claims Court has jurisdiction in any action for the payment of money where the " +
          "amount claimed does not exceed the prescribed amount ($50,000, excluding interest and " +
          "costs) -- this is a monetary jurisdiction, not a subject-matter one.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
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
        name: "The defendant disputes not being insured, or shows section 263 applies after all",
        plainExplanation:
          "If the defendant shows their vehicle was insured under a motor vehicle liability policy " +
          "bound by section 263 of the Insurance Act at the time of the accident, section 263 may " +
          "apply after all -- meaning the plaintiff's ordinary remedy is a claim against their own " +
          "insurer, not a direct action against this defendant.",
        whenThisComesUp: "When the defendant's Defence disputes the premise that they were uninsured, or that another exclusion to section 263 applied.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90i08_e.doc",
      },
      {
        id: "dispute-fault-or-causation-vehicle-accident",
        name: "The defendant disputes being at fault, or that their vehicle caused the damage",
        plainExplanation:
          "A defendant can file a Defence disputing that they were at fault, or that their vehicle's " +
          "conduct caused the damage claimed -- this becomes a fact the court weighs alongside the " +
          "plaintiff's evidence.",
        whenThisComesUp: "When the defendant has filed a Defence (Form 9A) disputing fault or causation, not just the amount claimed.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
      },
    ],
    applicableDefenceConceptIds: ["defence-contributory-negligence", "defence-limitation-period-expired", "defence-set-off-or-counterclaim", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note:
          "Whether Small Claims Court is the right forum at all for a claim like this depends first on " +
          "whether section 263 of the Insurance Act applies (see the plaintiff element above) -- if it " +
          "does, the ordinary route is a claim against your own insurer under that section, generally " +
          "not a Small Claims action against the other driver.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90i08_e.doc",
      },
      {
        note: "Claims like this are generally subject to Ontario's standard 2-year limitation period, running from when the incident (or the loss) was discovered.",
        sourceUrl: "https://www.ontario.ca/page/civil-claims-suing-and-being-sued",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "loan-agreement-existed",
        name: "An agreement to lend money existed",
        plainExplanation:
          "The person bringing a claim generally has the burden of proving their allegations on a " +
          "balance of probabilities -- including that an agreement to lend money actually existed, " +
          "whether written or oral, and what its terms were (the amount lent, and when or how it was " +
          "to be repaid).",
        sourceUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
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
          "The person bringing the claim generally has to show, on a balance of probabilities, what " +
          "amount was lent, what -- if anything -- has been repaid, and what remains outstanding.",
        sourceUrl:
          "https://www.ontariocourts.ca/scj/guides-and-service-resources/guide-to-representing-yourself/civil-resources-to-help-self-represented-litigants/steps-to-civil-case/",
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
          "The Small Claims Court has jurisdiction in any action for the payment of money where the " +
          "amount claimed does not exceed the prescribed amount ($50,000, excluding interest and " +
          "costs) -- this is a monetary jurisdiction, not a subject-matter one.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
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
          "A defendant can dispute that there was ever an obligation to repay the money at all -- for " +
          "example, by arguing it was a gift rather than a loan. Since a gift creates no debt to repay, " +
          "this becomes a fact the plaintiff has to prove on a balance of probabilities, the same as any " +
          "other disputed element of the claim.",
        whenThisComesUp: "When the defendant's Defence disputes that the money was ever meant to be repaid, not just the amount or the timing.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
      },
      {
        id: "dispute-amount-still-owed-personal-loan",
        name: "The defendant disputes the amount still owed",
        plainExplanation:
          "A defendant can file a Defence disputing how much of the loan remains unpaid -- for example, " +
          "if they say they already repaid some or all of it.",
        whenThisComesUp: "When the defendant's Defence disputes the outstanding balance, not whether a loan existed at all.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
      },
    ],
    applicableDefenceConceptIds: ["defence-no-agreement-existed", "defence-limitation-period-expired", "defence-set-off-or-counterclaim"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: "Claims like this are generally subject to Ontario's standard 2-year limitation period, running from when the claim was discovered.",
        sourceUrl: "https://www.ontario.ca/page/civil-claims-suing-and-being-sued",
      },
      {
        note:
          "Where the loan has no fixed repayment date -- one repayable \"on demand\" -- the Limitations " +
          "Act, 2002 treats the claim as discovered on the first day the borrower fails to repay AFTER a " +
          "demand for repayment is made, not on the day the money was originally lent. This demand-" +
          "obligation rule applies to demand obligations created on or after January 1, 2004.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
      },
      {
        note:
          "A written, signed acknowledgment of the debt, or a partial payment toward it, is treated as " +
          "having restarted the limitation clock as of the date of that acknowledgment or payment -- an " +
          "oral acknowledgment alone, without a signed writing or a payment, does not have this effect.",
        sourceUrl: "https://www.ontario.ca/laws/docs/02l24_e.doc",
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
    courtArea: "small-claims",
    plaintiffElements: [
      {
        id: "duty-of-care-property-in-business-care",
        name: "The business owed a duty of care while your property was in their possession",
        plainExplanation:
          "A negligence claim generally requires showing the defendant owed the plaintiff a duty of " +
          "care -- whether the relationship between the parties is close enough that one may " +
          "reasonably be said to owe the other a duty not to cause injury or loss, a question of " +
          "foreseeability moderated by policy considerations. See \"The elements of a negligence " +
          "claim\" for the fuller general framework this draws from.",
        sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
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
          "Causation has two parts: whether the breach caused the harm in fact, and whether it also " +
          "caused the harm in law. " +
          "The factual part is generally tested with the \"but for\" test -- the plaintiff must show, " +
          "on a balance of probabilities, that the damage or loss would not have occurred but for the " +
          "defendant's negligent act. That is a factual inquiry, applied in a robust, common-sense " +
          "way: scientific evidence of precisely how much the defendant's negligence contributed is " +
          "not required. (There is a narrow exception where multiple possible wrongdoers are involved " +
          "-- see \"The elements of a negligence claim\" for the fuller general framework, including " +
          "when that exception applies.) " +
          "The legal part asks whether the harm is too remote to fairly hold the defendant liable for " +
          "it, judged by whether it was a real, reasonably foreseeable risk.",
        sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2012/2012scc32/2012scc32.html",
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
          "The Small Claims Court has jurisdiction in any action for the payment of money where the " +
          "amount claimed does not exceed the prescribed amount ($50,000, excluding interest and " +
          "costs) -- this is a monetary jurisdiction, not a subject-matter one.",
        sourceUrl: "https://www.ontario.ca/laws/docs/90c43_e.doc",
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
          "A defendant can file a Defence disputing that the property was ever left with them, or " +
          "that the damage or loss happened while it was in their possession rather than before drop-" +
          "off or after pick-up.",
        whenThisComesUp: "When the defendant's Defence disputes possession or timing, not just the amount claimed.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
      },
      {
        id: "dispute-cause-of-damage-property-in-care",
        name: "The business disputes that its own conduct caused the damage or loss",
        plainExplanation:
          "A defendant can argue the damage or loss resulted from something other than their own " +
          "conduct -- for example, a pre-existing condition of the item, or something the owner " +
          "themselves did or failed to disclose.",
        whenThisComesUp: "When the defendant's Defence disputes causation rather than possession or amount.",
        sourceUrl: "https://www.ontariocourts.ca/scj/areas-of-law/small-claims-court/how-to-respond-to-a-case/",
      },
    ],
    applicableDefenceConceptIds: ["defence-contributory-negligence", "defence-limitation-period-expired", "defence-set-off-or-counterclaim", "defence-failure-to-mitigate"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs"],
    proceduralNotes: [
      {
        note: "Claims like this are generally subject to Ontario's standard 2-year limitation period, running from when the loss or damage was discovered.",
        sourceUrl: "https://www.ontario.ca/page/civil-claims-suing-and-being-sued",
      },
      {
        note:
          "This content states an ordinary negligence framework only -- it deliberately does NOT " +
          "assert anything about bailment, a distinct body of law covering property left in someone " +
          "else's care that in some circumstances may shift the burden onto the business to explain " +
          "what happened, rather than requiring the owner to prove exactly how the loss occurred. That " +
          "doctrine has not been independently sourced for this content (it develops mainly through " +
          "case law, not a self-help government page), so it is not claimed here one way or the other " +
          "-- worth asking a paralegal or lawyer specifically about it if the property was left with a " +
          "business for service, storage, or safekeeping.",
        sourceUrl: "https://www.canlii.org/en/ca/scc/doc/2008/2008scc27/2008scc27.html",
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
];
