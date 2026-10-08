/**
 * THE DECLARED CATALOGUE — every claim type recognised as real, most not yet written.
 *
 * *** WHY DECLARE WHAT IS NOT WRITTEN ***
 *
 * Because the alternative is a library that looks finished. Sixteen published stage
 * blocks and seven authored claim types is genuine progress and is nowhere near the
 * shape of what people actually bring to this court. A catalogue that listed only
 * the finished work would make the gap invisible to everyone, including whoever
 * decides what to build next.
 *
 * So the breadth is recorded as data. `contentStatus: "declared"` means the type is
 * real and nothing may render for it. `verifyClaimTypeCatalogue` asserts that a
 * declared profile carries no user-facing fields — no forum verdict, no notices, no
 * gather list — so a declaration can never be mistaken for coverage, and
 * `npm run claim-types:coverage` prints the counts per family.
 *
 * This is the shape `verifyDepthQuestions` settled on for unauthored questions, and
 * for the reason CLAUDE.md §5 gives: a list that must be maintained is fine, and a
 * check that punishes the maintenance is not. Promoting a type from declared to
 * authored should make a number go up, never turn a suite red.
 *
 * *** WHAT A DECLARATION COMMITS TO ***
 *
 * Only that a real person brings this and that it is distinguishable from its
 * neighbours. It does NOT assert the forum, the deadline, or that this court can
 * help — every one of those needs a source, and supplying them is what promotes a
 * type to authored.
 *
 * Ids follow the existing `sc-claim-` convention, and where an entry matches one of
 * the intake claim types the SAME id is used so nothing forks.
 */

import type { ClaimFamily, ClaimTypeProfile } from "./claimTypeProfile";

/** A declared type: recognised, unwritten, and unable to render. */
const d = (family: ClaimFamily, id: string, name: string): ClaimTypeProfile => ({
  id,
  family,
  name,
  contentStatus: "declared",
});

/** Marked so the safety pass runs first if and when it is authored. */
const sensitive = (family: ClaimFamily, id: string, name: string): ClaimTypeProfile => ({
  ...d(family, id, name),
  sensitive: true,
});

export const DECLARED_PROFILES: ClaimTypeProfile[] = [
  // ---------------------------------------------------------------------------
  // MONEY OWED / DEBT
  // ---------------------------------------------------------------------------
  d("money-owed", "sc-claim-personal-loan-between-individuals", "Money lent to a friend or family member"),
  d("money-owed", "sc-claim-guarantor-or-cosigner-pursued", "Being chased for a loan you co-signed"),
  d("money-owed", "sc-claim-unpaid-debt-services", "An unpaid invoice for work you did"),
  d("money-owed", "sc-claim-dishonoured-nsf-cheque", "A cheque that bounced or a payment stopped"),
  d("money-owed", "sc-claim-etransfer-sent-in-error", "An e-transfer sent to the wrong person"),
  d("money-owed", "sc-claim-deposit-not-returned", "A deposit nobody gave back"),
  d("money-owed", "sc-claim-overpayment-not-refunded", "An overpayment or duplicate payment not refunded"),
  d("money-owed", "sc-claim-unpaid-commission-or-expenses", "Unpaid commission, bonus or expenses"),
  d("money-owed", "sc-claim-settlement-agreement-unpaid", "Money owed under a settlement or repayment agreement"),
  d("money-owed", "sc-claim-promissory-note-unpaid", "An unpaid promissory note"),
  d("money-owed", "sc-claim-joint-expense-share", "Someone's share of a shared cost"),
  d("money-owed", "sc-claim-group-prize-dispute", "A lottery pool or group prize dispute"),
  d("money-owed", "sc-claim-unpaid-lesson-or-childcare-fees", "Unpaid lesson, tutoring or child-care fees"),
  d("money-owed", "sc-claim-unpaid-clinic-invoice", "An unpaid clinic, dental or vet invoice"),
  d("money-owed", "sc-claim-business-to-business-invoice", "One business owed money by another"),
  d("money-owed", "sc-claim-investment-in-a-friends-business", "Money put into a friend's business and not returned"),
  d("money-owed", "sc-claim-unpaid-commercial-rent", "Unpaid commercial rent"),
  d("money-owed", "sc-claim-club-or-association-dues", "Unpaid club, league or association dues"),
  d("money-owed", "sc-claim-non-payment-goods-sold", "Goods delivered and never paid for"),

  // ---------------------------------------------------------------------------
  // GOODS AND SERVICES / CONSUMER
  // ---------------------------------------------------------------------------
  d("goods-and-services", "sc-claim-contractor-poor-or-incomplete-work", "A contractor did poor or unfinished work"),
  d("goods-and-services", "sc-claim-contractor-took-deposit-and-left", "A contractor took a deposit and disappeared"),
  d("goods-and-services", "sc-claim-homeowner-wont-pay-contractor", "A homeowner will not pay the contractor"),
  d("goods-and-services", "sc-claim-breach-of-contract-goods", "Goods that were not what was agreed"),
  d("goods-and-services", "sc-claim-breach-of-contract-services", "A service that was not what was agreed"),
  d("goods-and-services", "sc-claim-defective-product", "Something bought that does not work"),
  d("goods-and-services", "sc-claim-used-vehicle-private-sale", "A used car bought privately"),
  d("goods-and-services", "sc-claim-used-vehicle-nondisclosure", "A used car from a dealer with something undisclosed"),
  d("goods-and-services", "sc-claim-new-vehicle-defects", "Defects in a new vehicle"),
  d("goods-and-services", "sc-claim-new-home-defects", "Defects in a newly built home"),
  d("goods-and-services", "sc-claim-home-inspector-missed-defects", "A home inspector who missed something"),
  d("goods-and-services", "sc-claim-undisclosed-defects-after-purchase", "Problems found after buying a house"),
  d("goods-and-services", "sc-claim-real-estate-deposit-dispute", "A real estate deposit in dispute"),
  d("goods-and-services", "sc-claim-real-estate-agent-conduct", "A real estate agent's commission or conduct"),
  d("goods-and-services", "sc-claim-moving-company-damage-or-loss", "A moving company that damaged or lost things"),
  d("goods-and-services", "sc-claim-storage-company-dispute", "A dispute with a storage company"),
  d("goods-and-services", "sc-claim-repairer-or-storer-holding-property", "A garage, repair shop or storage business keeping your item for its bill"),
  d("goods-and-services", "sc-claim-wedding-or-event-vendor-failure", "A wedding or event supplier who let you down"),
  d("goods-and-services", "sc-claim-travel-agent-or-tour-operator", "A travel agent or tour operator"),
  d("goods-and-services", "sc-claim-airline-delay-or-cancellation", "A flight delayed, cancelled, or boarding denied"),
  d("goods-and-services", "sc-claim-airline-baggage-lost-or-damaged", "Baggage lost or damaged by an airline"),
  d("goods-and-services", "sc-claim-gym-or-personal-development-contract", "Cancelling a gym or class membership"),
  d("goods-and-services", "sc-claim-subscription-cancellation", "A subscription that will not cancel"),
  d("goods-and-services", "sc-claim-online-purchase-not-delivered", "An online order that never came or was wrong"),
  d("goods-and-services", "sc-claim-marketplace-private-sale", "A Marketplace or Kijiji sale that went wrong"),
  d("goods-and-services", "sc-claim-warranty-refused", "A warranty the seller will not honour"),
  d("goods-and-services", "sc-claim-private-career-college-refund", "A private career college refund"),
  d("goods-and-services", "sc-claim-college-or-university-fee-dispute", "A college or university fee dispute"),
  d("goods-and-services", "sc-claim-driving-school", "A driving school or lessons"),
  d("goods-and-services", "sc-claim-vehicle-repair-dispute", "A repair bill or repair that did not fix it"),
  d("goods-and-services", "sc-claim-improper-unauthorized-towing", "A tow you did not authorise, or charges for it"),
  d("goods-and-services", "sc-claim-item-damaged-by-a-service", "Something damaged by a cleaner, tailor or repairer"),
  d("goods-and-services", "sc-claim-courier-lost-or-damaged-parcel", "A parcel lost or damaged by a courier"),
  d("goods-and-services", "sc-claim-phone-internet-or-tv-billing", "A phone, internet or TV bill"),
  d("goods-and-services", "sc-claim-electricity-or-gas-billing", "An electricity or gas bill"),
  d("goods-and-services", "sc-claim-water-heater-or-hvac-rental", "A water heater or furnace rental contract"),
  d("goods-and-services", "sc-claim-solar-or-energy-efficiency-contract", "A solar or energy-efficiency contract"),
  d("goods-and-services", "sc-claim-door-to-door-sale", "Something bought at the door"),
  d("goods-and-services", "sc-claim-furniture-or-appliance-delivery", "Furniture or an appliance damaged or never delivered"),
  d("goods-and-services", "sc-claim-home-services-not-performed", "Cleaning, lawn, snow or pool work not done"),
  d("goods-and-services", "sc-claim-salon-spa-or-tattoo-result", "A salon, spa or tattoo that went wrong"),
  d("goods-and-services", "sc-claim-pet-grooming-or-boarding", "A pet hurt or lost at grooming or boarding"),
  d("goods-and-services", "sc-claim-daycare-or-camp-fees", "A daycare or camp fee dispute"),
  d("goods-and-services", "sc-claim-funeral-or-cemetery-dispute", "A funeral home or cemetery dispute"),
  d("goods-and-services", "sc-claim-ticket-resale-or-cancelled-event", "A resold ticket or a cancelled event"),
  d("goods-and-services", "sc-claim-gift-card-refused", "A gift card or prepaid card refused"),
  d("goods-and-services", "sc-claim-timeshare-or-vacation-club", "A timeshare or vacation club"),
  d("goods-and-services", "sc-claim-website-app-or-software-build", "A website, app or software not delivered"),
  d("goods-and-services", "sc-claim-hosting-or-saas-billing", "Domain, hosting or software billing"),
  d("goods-and-services", "sc-claim-influencer-or-brand-deal-unpaid", "An unpaid brand or influencer deal"),
  d("goods-and-services", "sc-claim-immigration-consultant-or-paralegal-fee", "A lawyer's or paralegal's fee"),
  d("goods-and-services", "sc-claim-financial-advisor-or-mortgage-broker", "A financial advisor or mortgage broker"),
  d("goods-and-services", "sc-claim-insurance-claim-denied", "An insurance claim refused"),
  d("goods-and-services", "sc-claim-bank-error-or-unauthorized-transaction", "A bank error or a transaction you did not make"),
  d("goods-and-services", "sc-claim-credit-report-error", "A mistake on your credit report"),
  d("goods-and-services", "sc-claim-consumer-protection-act-issue", "A consumer contract you want out of"),
  d("goods-and-services", "sc-claim-consumer-cancellation-refund", "A cancellation the seller will not refund"),

  // ---------------------------------------------------------------------------
  // PROPERTY DAMAGE
  // ---------------------------------------------------------------------------
  d("property-damage", "sc-claim-neighbours-tree-fell", "A neighbour's tree or branch came down"),
  d("property-damage", "sc-claim-tree-roots-damage", "Tree roots damaging foundation, pipes or driveway"),
  d("property-damage", "sc-claim-water-from-neighbouring-property", "Water or flooding from next door or upstairs"),
  d("property-damage", "sc-claim-fence-dispute", "A fence on the boundary"),
  d("property-damage", "sc-claim-retaining-wall-failure", "A retaining wall that failed"),
  d("property-damage", "sc-claim-damage-caused-by-a-child", "Damage done by a child"),
  d("property-damage", "sc-claim-damage-caused-by-a-dog", "Damage done by a dog"),
  d("property-damage", "sc-claim-livestock-or-animals-at-large", "Livestock or animals loose on your land"),
  d("property-damage", "sc-claim-contractor-damage", "A contractor, mover or driver damaged your property"),
  d("property-damage", "sc-claim-vehicle-accident-uninsured-driver-property-damage", "Vehicle damage insurance is not covering"),
  d("property-damage", "sc-claim-damage-to-a-parked-vehicle", "A parked car damaged in a lot, by a valet or at a garage"),
  d("property-damage", "sc-claim-damage-by-tenant-guest-or-roommate", "Damage by a tenant's guest or a roommate"),
  d("property-damage", "sc-claim-construction-or-excavation-next-door", "Damage from building work next door"),
  d("property-damage", "sc-claim-vandalism-known-person", "Vandalism where you know who did it"),
  d("property-damage", "sc-claim-property-damaged-lost-in-business-care", "Something damaged or lost while in a business's care"),
  d("property-damage", "sc-claim-borrowed-item-not-returned", "Something lent and not returned, or returned broken"),
  d("property-damage", "sc-claim-recovery-of-personal-property", "Getting your belongings back"),
  d("property-damage", "sc-claim-landlord-disposed-of-belongings", "A landlord who got rid of your things"),
  d("property-damage", "sc-claim-towing-damage", "Damage done by a tow truck"),
  d("property-damage", "sc-claim-snow-plow-or-municipal-works-damage", "Damage by a plough or municipal works"),
  d("property-damage", "sc-claim-utility-work-damage", "Damage by utility or hydro work"),
  d("property-damage", "sc-claim-fire-or-smoke-from-next-door", "Fire or smoke spreading from next door"),
  d("property-damage", "sc-claim-drone-ball-or-sports-equipment", "Damage by a drone, ball or sports equipment"),
  d("property-damage", "sc-claim-short-term-rental-guest-damage", "Damage by a short-term rental guest"),

  // ---------------------------------------------------------------------------
  // INJURY
  // ---------------------------------------------------------------------------
  d("injury", "sc-claim-slip-and-fall-occupier-liability", "A fall on someone else's property"),
  d("injury", "sc-claim-fall-in-a-parking-lot-or-plaza", "A fall in a parking lot or plaza"),
  d("injury", "sc-claim-fall-at-a-rental-property", "A fall where you rent"),
  d("injury", "sc-claim-fall-at-a-municipal-facility", "A fall at an arena, pool or park"),
  d("injury", "sc-claim-dog-bite-animal-injury", "A dog bite or attack"),
  d("injury", "sc-claim-injury-at-a-business-or-event", "An injury at a shop, restaurant or event"),
  d("injury", "sc-claim-food-poisoning", "Food poisoning"),
  d("injury", "sc-claim-injury-at-a-gym-or-sport", "An injury at a gym or playing sport"),
  d("injury", "sc-claim-injury-from-a-defective-product", "An injury caused by a product"),
  d("injury", "sc-claim-injury-from-a-falling-object", "An injury from a falling object or a building site"),
  d("injury", "sc-claim-injury-at-school-or-daycare", "An injury at school or daycare"),
  d("injury", "sc-claim-injury-on-public-transit", "An injury on public transit"),
  d("injury", "sc-claim-escooter-bicycle-or-pedestrian-collision", "An e-scooter, bicycle or pedestrian collision"),
  // sc-claim-motor-vehicle-injury: authored 2026-10-05, see noticeProfiles.ts.
  sensitive("injury", "sc-claim-minor-assault-or-battery", "Being hit or attacked by someone"),
  d("injury", "sc-claim-injury-from-a-cosmetic-procedure", "An injury from a salon, spa or cosmetic procedure"),
  d("injury", "sc-claim-professional-negligence-medical-or-dental", "Harm from medical, dental or other professional care"),

  // ---------------------------------------------------------------------------
  // NEIGHBOURS
  // ---------------------------------------------------------------------------
  d("neighbours", "sc-claim-noise-and-nuisance", "Noise or a persistent nuisance"),
  d("neighbours", "sc-claim-smoke-odours-or-cannabis", "Smoke, smells or cannabis drifting over"),
  d("neighbours", "sc-claim-cameras-or-lights-aimed-at-you", "Cameras or lights pointed at your property"),
  d("neighbours", "sc-claim-trespass-by-people-or-pets", "People, pets or children coming onto your land"),
  d("neighbours", "sc-claim-shared-driveway-or-right-of-way", "A shared driveway or right of way"),
  d("neighbours", "sc-claim-encroachment-or-boundary", "An encroachment or a boundary in dispute"),
  d("neighbours", "sc-claim-overhanging-branches", "Overhanging branches and roots"),
  d("neighbours", "sc-claim-snow-or-leaves-dumped", "Snow or leaves dumped on your property"),
  d("neighbours", "sc-claim-drainage-and-grading", "Drainage and grading between properties"),
  d("neighbours", "sc-claim-shared-well-or-septic", "A shared well, septic or rural service"),
  d("neighbours", "sc-claim-construction-noise-and-debris", "Construction noise and debris"),
  sensitive("neighbours", "sc-claim-harassment-by-a-neighbour", "A neighbour who is harassing you"),

  // ---------------------------------------------------------------------------
  // WORK
  // ---------------------------------------------------------------------------
  d("work", "sc-claim-wrongful-dismissal", "Being let go without proper notice or pay"),
  d("work", "sc-claim-unpaid-overtime-vacation-pay", "Unpaid overtime or vacation pay"),
  d("work", "sc-claim-unpaid-wages", "Unpaid regular wages or final pay"),
  d("work", "sc-claim-unpaid-tips", "Unpaid tips"),
  d("work", "sc-claim-unpaid-severance", "Unpaid severance or termination pay"),
  d("work", "sc-claim-unpaid-bonus-after-termination", "A bonus or commission unpaid after leaving"),
  d("work", "sc-claim-contractor-misclassification", "Being treated as a contractor when you were not"),
  d("work", "sc-claim-gig-platform-payment", "A gig platform that will not pay"),
  d("work", "sc-claim-caregiver-or-domestic-worker-unpaid", "A nanny, caregiver or domestic worker unpaid"),
  d("work", "sc-claim-employer-suing-former-employee", "An employer suing a former employee"),
  d("work", "sc-claim-bad-reference-or-employer-defamation", "Something untrue said by an employer"),
  d("work", "sc-claim-non-compete-or-non-solicit", "A non-compete or non-solicit clause"),

  // ---------------------------------------------------------------------------
  // HOUSING
  // ---------------------------------------------------------------------------
  d("housing", "sc-claim-landlord-against-former-tenant", "A landlord claiming against a former tenant"),
  d("housing", "sc-claim-tenant-against-former-landlord", "A tenant claiming against a former landlord"),
  d("housing", "sc-claim-roommate-or-shared-house", "A roommate or shared-house dispute"),
  d("housing", "sc-claim-subletter-not-paying", "A subletter or roommate not paying their share"),
  d("housing", "sc-claim-condo-owner-against-corporation", "A condo owner against the condo corporation"),
  d("housing", "sc-claim-unpaid-condo-common-expenses", "Unpaid condo common expenses"),
  d("housing", "sc-claim-condo-water-or-noise-damage", "Water or noise damage between condo units"),
  d("housing", "sc-claim-co-owner-dispute", "A dispute between co-owners"),
  d("housing", "sc-claim-short-term-rental-dispute", "A short-term rental dispute"),
  d("housing", "sc-claim-rooming-or-boarding-house", "A rooming or boarding house"),
  d("housing", "sc-claim-student-residence", "A student residence"),
  d("housing", "sc-claim-mobile-home-park", "A mobile home park"),
  d("housing", "sc-claim-commercial-tenancy-dispute", "A commercial landlord or tenant dispute"),
  d("housing", "sc-claim-home-purchase-closing-dispute", "A home purchase deposit or closing dispute"),
  d("housing", "sc-claim-contractor-lien-on-a-home", "A contractor's lien registered against a home"),

  // ---------------------------------------------------------------------------
  // FAMILY-ADJACENT — never family law advice
  // ---------------------------------------------------------------------------
  d("family-adjacent", "sc-claim-gift-or-loan-between-former-partners", "Money between former partners: a gift or a loan"),
  d("family-adjacent", "sc-claim-engagement-ring-and-wedding-gifts", "An engagement ring or wedding gifts"),
  d("family-adjacent", "sc-claim-pet-ownership-on-breakup", "Who keeps the pet after a breakup"),
  d("family-adjacent", "sc-claim-return-of-belongings-after-breakup", "Getting belongings back after a breakup"),
  d("family-adjacent", "sc-claim-jointly-bought-items-on-breakup", "Things bought together during a relationship"),

  // ---------------------------------------------------------------------------
  // OTHER
  // ---------------------------------------------------------------------------
  d("other", "sc-claim-sick-or-misrepresented-pet", "A sick pet from a breeder or seller"),
  d("other", "sc-claim-vet-negligence", "Harm caused by veterinary care"),
  sensitive("other", "sc-claim-scam-or-fraud-recovery", "Money lost to a scam or fraud"),
  sensitive("other", "sc-claim-romance-or-investment-scam", "A romance or investment scam"),
  d("other", "sc-claim-cryptocurrency-or-exchange-loss", "Cryptocurrency or an online exchange loss"),
  d("other", "sc-claim-defamation-online-or-in-print", "Something untrue posted about you online"),
  sensitive("other", "sc-claim-privacy-breach-or-intrusion", "A privacy breach"),
  sensitive("other", "sc-claim-intimate-image-abuse", "Intimate images shared without consent"),
  sensitive("other", "sc-claim-harassment-or-cyberbullying", "Harassment or cyberbullying"),
  d("other", "sc-claim-against-a-school-board", "A claim against a school board"),
  d("other", "sc-claim-against-a-municipality-other", "A claim against a municipality, other than roads and sidewalks"),
  d("other", "sc-claim-against-police", "A claim about police conduct"),
  d("other", "sc-claim-against-a-lawyer-or-paralegal", "A claim about a lawyer or paralegal"),
  d("other", "sc-claim-against-another-professional", "A claim about an accountant, advisor or other professional"),
  d("other", "sc-claim-against-a-hospital-or-clinic", "A claim against a hospital or clinic"),
  d("other", "sc-claim-over-the-monetary-limit", "A claim worth more than this court can award"),
  d("other", "sc-claim-franchise-dispute", "A franchise dispute"),
  d("other", "sc-claim-partnership-or-joint-venture-breakup", "A small partnership or joint venture breaking up"),
  d("other", "sc-claim-sports-league-or-camp-fees", "Sports league, club or camp fees"),
  d("other", "sc-claim-charity-or-fundraising-dispute", "A charity or fundraising dispute"),
  sensitive("other", "sc-claim-elder-financial-abuse", "Money taken from an older person"),
  d("other", "sc-claim-parking-traffic-or-bylaw-charge", "A parking ticket, traffic or by-law charge"),
  d("other", "sc-claim-government-benefits-dispute", "An Ontario Works or ODSP decision"),
  d("other", "sc-claim-copyright-or-intellectual-property", "Copyright or intellectual property"),
  d("other", "sc-claim-hit-and-run-or-uninsured-driver", "A hit and run, or a driver with no insurance"),

  // ---------------------------------------------------------------------------
  // DEFENDANT-SIDE, cross-cutting
  // ---------------------------------------------------------------------------
  d("defendant-side", "sc-defence-served-and-confused", "Being served and not understanding the papers"),
  d("defendant-side", "sc-defence-sued-for-something-you-did-not-do", "Being sued for something you did not do"),
  d("defendant-side", "sc-defence-sued-for-more-than-owed", "Being sued for more than you owe"),
  d("defendant-side", "sc-defence-want-to-claim-back", "Wanting to claim back against the person suing you"),
  d("defendant-side", "sc-defence-sued-in-the-wrong-place", "Being sued in the wrong court or place"),
  d("defendant-side", "sc-defence-default-judgment-against-you", "A judgment made without you there"),
  d("defendant-side", "sc-defence-wages-or-bank-account-garnished", "Wages or a bank account being taken"),
  d("defendant-side", "sc-defence-writ-against-property", "A writ registered against your property"),
  d("defendant-side", "sc-defence-examination-hearing-summons", "A summons to an examination hearing"),
  d("defendant-side", "sc-defence-sued-by-a-collection-agency", "Being sued by a collection agency or debt buyer"),
  d("defendant-side", "sc-defence-sued-by-a-bank-or-lender", "Being sued by a bank or lender"),
  d("defendant-side", "sc-defence-debt-already-paid-or-not-yours", "Being sued for a debt paid, or not yours"),
  d("defendant-side", "sc-defence-sued-as-guarantor", "Being sued as a guarantor or co-signer"),
  d("defendant-side", "sc-defence-sued-by-an-insurer", "Being sued by an insurance company"),
  d("defendant-side", "sc-defence-sued-as-parent-owner-or-employer", "Being sued as a parent, dog owner, occupier or employer"),
  d("defendant-side", "sc-defence-sued-by-a-contractor", "Being sued by a contractor over work you dispute"),
  d("defendant-side", "sc-defence-sued-by-a-former-partner", "Being sued by a former partner over money or property"),
  d("defendant-side", "sc-defence-money-you-say-was-a-gift", "Being sued over money you say was a gift"),

  // ---------------------------------------------------------------------------
  // OUT OF SCOPE — forum-check profiles that route, never instruct
  // ---------------------------------------------------------------------------
  d("out-of-scope", "oos-tenancy-during-a-tenancy", "A rental problem while the tenancy is running"),
  d("out-of-scope", "oos-human-rights", "Discrimination or harassment on a protected ground"),
  d("out-of-scope", "oos-workplace-injury", "An injury at work"),
  d("out-of-scope", "oos-family-law", "Custody, support or dividing family property"),
  d("out-of-scope", "oos-title-to-land", "Title to land, easements or an order declaring rights"),
  sensitive("out-of-scope", "oos-criminal", "Wanting someone charged or punished"),
  d("out-of-scope", "oos-federal-matter", "A federal matter"),
  d("out-of-scope", "oos-immigration-or-refugee", "An immigration or refugee matter"),
  d("out-of-scope", "oos-needs-an-order-to-stop-someone", "Needing an order making someone stop"),
  d("out-of-scope", "oos-provincial-offence", "A ticket or provincial charge"),
  d("out-of-scope", "oos-tax-or-benefits-appeal", "A tax or government benefits appeal"),
  d("out-of-scope", "oos-auto-insurance-accident-benefits", "Accident benefits from your own insurer"),
  d("out-of-scope", "oos-professional-discipline", "Wanting a professional disciplined"),
];
