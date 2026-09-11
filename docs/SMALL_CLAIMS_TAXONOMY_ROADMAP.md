# Ontario Small Claims Court — Dispute Taxonomy Roadmap

**Purpose:** a working map of the kinds of disputes Ontario Small Claims Court hears, marked against CourtSimplified's existing 19 sourced claim types, so taxonomy expansion is driven by a real inventory rather than guesswork.

**Status of this document:** this is a *scoping* artifact, not sourced legal content. Nothing here is verified against an official source. Every item marked `NOT BUILT` still requires the full sourcing process — real Ontario source, read and cited, `sourceUrl` + `verifiedAt`, before it becomes a `ClaimType` entry.

**Critical caveat:** I have identified categories of dispute that exist in the world. I have **not** confirmed which fall within Small Claims jurisdiction versus belonging to the LTB, HRTO, WSIB, CAT, LAT, Superior Court, or a federal body. Several items below are flagged as jurisdictionally uncertain. Resolving that is part of the sourcing work for each one, not something this document settles.

**Legend:**
- ✅ = covered by an existing sourced claim type (id noted)
- 🔶 = partially covered — an existing claim type touches it but doesn't squarely address it
- ⬜ = NOT BUILT
- ⚠️ = jurisdiction uncertain / likely belongs to another forum — verify before building

---

## Current coverage: the existing 19

| # | Claim type id | Category |
|---|---|---|
| 1 | `sc-claim-unpaid-debt-services` | Contract / money owed |
| 2 | `sc-claim-slip-and-fall-occupier-liability` | Injury |
| 3 | `sc-claim-improper-unauthorized-towing` | Vehicle |
| 4 | `sc-claim-breach-of-contract-goods` | Contract / goods |
| 5 | `sc-claim-non-payment-goods-sold` | Contract / goods |
| 6 | `sc-claim-consumer-protection-act-issue` | Consumer |
| 7 | `sc-claim-contractor-damage` | Property damage |
| 8 | `sc-claim-wrongful-dismissal` | Employment |
| 9 | `sc-claim-dog-bite-animal-injury` | Injury |
| 10 | `sc-claim-breach-of-contract-services` | Contract / services |
| 11 | `sc-claim-recovery-of-personal-property` | Property / possession |
| 12 | `sc-claim-consumer-cancellation-refund` | Consumer |
| 13 | `sc-claim-commercial-tenancy-dispute` | Tenancy (commercial) |
| 14 | `sc-claim-dishonoured-nsf-cheque` | Financial |
| 15 | `sc-claim-unpaid-overtime-vacation-pay` | Employment |
| 16 | `sc-claim-vehicle-repair-dispute` | Vehicle |
| 17 | `sc-claim-used-vehicle-nondisclosure` | Vehicle |
| 18 | `sc-claim-unpaid-condo-common-expenses` | Condo |
| 19 | `sc-claim-defamation-libel-slander` | Reputation |

**Observation on the shape of current coverage:** heavily weighted toward money-owed and consumer-purchase disputes. Thin on injury (2 of 19), property damage (1), and possession/bailment (1). Almost nothing on neighbour disputes, professional negligence, or interpersonal financial disputes — all common self-represented matters.

---

## 1. CONTRACT — GOODS

| Scenario | Status |
|---|---|
| Goods paid for, never delivered | ✅ `breach-of-contract-goods` |
| Wrong item delivered | ✅ `breach-of-contract-goods` |
| Defective or damaged goods received | ✅ `breach-of-contract-goods` |
| Goods sold, buyer never paid | ✅ `non-payment-goods-sold` |
| Deposit paid on a goods order, order cancelled by seller | ⬜ |
| Custom/bespoke goods not made to specification | ⬜ |
| Online marketplace private sale dispute (Facebook Marketplace, Kijiji, eBay) | ⬜ — very common, no dealer/CPA protections |
| Goods damaged in shipping — claim against shipper vs seller | ⬜ |
| Counterfeit or materially misrepresented goods | ⬜ |
| Prepaid/special-order goods, business closed before delivery | ⬜ |
| Goods sold "as is" — scope of that disclaimer | ⬜ |
| Buyer refuses delivery after custom work begun | ⬜ |

## 2. CONTRACT — SERVICES (largest gap area)

| Scenario | Status |
|---|---|
| Service paid for, never performed | ✅ `breach-of-contract-services` |
| Service performed poorly or abandoned mid-job | ✅ `breach-of-contract-services` |
| Services performed, client never paid | ✅ `unpaid-debt-services` |
| **Event vendors** — photographer, caterer, DJ, florist, venue no-show or failure | ⬜ high frequency, high emotional stakes |
| Wedding cancellation — deposit forfeiture disputes | ⬜ |
| **Moving companies** — damaged goods, lost goods, overcharging, goods held hostage | ⬜ notoriously common |
| Storage facility — lost, damaged, or improperly sold contents | ⬜ (bailment — see §8) |
| Dry cleaner / tailor — garment ruined or lost | ⬜ (bailment) |
| Appliance repair — made worse, not fixed, overcharged | ⬜ |
| Roofing / siding / window installation defects | ⬜ |
| HVAC installation or service failure | ⬜ |
| Plumbing work causing later failure | 🔶 `contractor-damage` if damage resulted |
| Electrical work defects | 🔶 |
| Pool installation / servicing disputes | ⬜ |
| Landscaping / snow removal contract failures | ⬜ |
| Pest control — failure to resolve, recurring infestation | ⬜ |
| Cleaning service — property damaged or theft alleged | ⬜ |
| Home inspection — missed defects | ⬜ (also professional negligence, §11) |
| **Salon / spa** — hair damage, chemical burns, botched treatment | ⬜ injury + service overlap |
| Tattoo / piercing — botched work, infection | ⬜ |
| **Veterinary** — malpractice, fee disputes, animal death | ⬜ emotionally significant |
| Pet grooming injury | ⬜ |
| Pet boarding / daycare — injury, escape, death | ⬜ |
| Childcare / daycare — injury, fee disputes | ⬜ ⚠️ some regulatory overlap |
| Tutoring, music lessons, coaching — prepaid, not delivered | ⬜ |
| Personal training / fitness contracts | 🔶 `consumer-cancellation-refund` |
| Freelance creative/web/IT work disputes (either direction) | 🔶 `unpaid-debt-services` |
| IT services — data loss, system damage | ⬜ |
| Photography — failure to deliver, files lost | ⬜ |
| Restaurant/caterer food poisoning | ⬜ (injury + service) |
| Subscription auto-renewal disputes | 🔶 `consumer-cancellation-refund` |

## 3. PROPERTY DAMAGE

| Scenario | Status |
|---|---|
| Contractor damaged property during work | ✅ `contractor-damage` |
| **Vehicle accident — property damage only** | ⬜ **KNOWN GAP** — previously attempted twice and cut for lack of a sourceable general-negligence statement. Mustapha sourcing (2026-09-09) may now unblock this. High priority. |
| Neighbour's tree / roots damaged your property | ⬜ |
| Fence disputes — cost sharing, damage | ⬜ ⚠️ Line Fences Act may route elsewhere |
| Water damage from a neighbouring unit (condo/apartment) | ⬜ ⚠️ check CAT jurisdiction |
| Water runoff / drainage from neighbouring land | ⬜ |
| Damage caused by a neighbour's contractor | 🔶 `contractor-damage` (different defendant relationship) |
| Snow/ice falling from adjacent property | ⬜ |
| Vandalism — identified individual defendant | ⬜ |
| Damage to rented/borrowed equipment | ⬜ |
| Landlord claim against former tenant for damage | ⬜ ⚠️ LTB vs Small Claims boundary is timing-dependent — must be sourced carefully |
| Damage by livestock or non-dog animals | 🔶 `dog-bite-animal-injury` covers injury, not property |
| Construction dust/debris damage from adjacent site | ⬜ |

## 4. PERSONAL INJURY (under $50,000)

| Scenario | Status |
|---|---|
| Slip/trip and fall on premises | ✅ `slip-and-fall-occupier-liability` |
| Dog bite / animal attack | ✅ `dog-bite-animal-injury` |
| **School / childcare supervision failure** | ⬜ personally relevant; requires its own duty-of-care sourcing beyond Mustapha |
| Injury from falling object / defective fixture in a business | 🔶 `slip-and-fall` (occupier's liability, different mechanism) |
| Gym equipment injury — and waiver enforceability | ⬜ |
| Trampoline park / recreation facility injury | ⬜ |
| Sports / recreational injury between participants | ⬜ |
| Injury from a defective product | ⬜ |
| Food poisoning | ⬜ |
| Cosmetic / aesthetic procedure injury | ⬜ |
| Injury on a rental property (tenant or guest) | ⬜ ⚠️ LTB overlap possible |
| Minor motor vehicle injury under $50k | ⬜ ⚠️ likely LAT/accident benefits territory — verify carefully |
| Civil assault / battery | ⬜ ⚠️ overlaps criminal; civil claim is separate |
| Psychological injury alone | 🔶 Mustapha threshold sourced — but no claim type built on it |

## 5. CONSUMER

| Scenario | Status |
|---|---|
| CPA violations — misrepresentation, unfair practice | ✅ `consumer-protection-act-issue` |
| Cancellation within cooling-off, refund refused | ✅ `consumer-cancellation-refund` |
| Door-to-door sales contract | 🔶 CPA has specific rules worth their own entry |
| Gym membership — cancellation, auto-renewal | 🔶 `consumer-cancellation-refund` |
| Timeshare / vacation club | ⬜ |
| Home renovation contract (CPA-specific provisions) | 🔶 |
| Prepaid funeral / cemetery services | ⬜ ⚠️ separate regulator (BAO) |
| Travel agency / tour operator failure | ⬜ ⚠️ TICO compensation fund may apply first |
| Airline delay/cancellation compensation | ⬜ ⚠️ **federal (APPR/CTA)** — likely out of scope, worth an explicit "not us" route |
| Event ticket resale disputes | ⬜ |
| Warranty denial — manufacturer or extended | ⬜ |
| Negative option / unauthorized billing | ⬜ |
| Unauthorized credit card charges | ⬜ ⚠️ bank complaint process first |
| Cell phone / internet contract disputes | ⬜ ⚠️ CCTS ombudsman first |
| Bait-and-switch advertising | 🔶 `consumer-protection-act-issue` |
| Debt collection agency harassment | ⬜ previously scoped, logged as a defendant consideration rather than standalone claim |

## 6. VEHICLE

| Scenario | Status |
|---|---|
| Repair overcharge / repeat failure | ✅ `vehicle-repair-dispute` |
| Used vehicle — undisclosed history | ✅ `used-vehicle-nondisclosure` |
| Improper / unauthorized towing | ✅ `improper-unauthorized-towing` |
| **Accident — property damage only** | ⬜ see §3, high priority |
| Curbsiding — unregistered dealer posing as private seller | ⬜ |
| Lease-end excess wear/mileage charges | ⬜ |
| Rental car damage charges disputed | ⬜ |
| Vehicle storage / impound fee disputes | 🔶 `improper-unauthorized-towing` |
| Safety certification issued improperly | ⬜ |
| Vehicle sold with an undisclosed lien | ⬜ |
| Private "as is" sale disputes | 🔶 `used-vehicle-nondisclosure` |
| Auto body work — quality disputes | 🔶 `vehicle-repair-dispute` |

## 7. EMPLOYMENT ⚠️

*Note: employment matters have significant forum-choice complexity — ESA claims filed with the Ministry of Labour cannot generally be pursued simultaneously in court; discrimination goes to HRTO; workplace injury to WSIB. Every entry here needs that boundary sourced.*

| Scenario | Status |
|---|---|
| Dismissal without notice/severance | ✅ `wrongful-dismissal` |
| Unpaid overtime / vacation pay | ✅ `unpaid-overtime-vacation-pay` |
| Unpaid final wages | 🔶 |
| Unpaid commissions | ⬜ |
| Unpaid or disputed bonus | ⬜ |
| Constructive dismissal | ⬜ |
| Breach of specific employment contract terms | ⬜ |
| Expense reimbursement refused | ⬜ |
| Training-cost clawback on resignation | ⬜ |
| Independent contractor non-payment | 🔶 `unpaid-debt-services` |

## 8. POSSESSION, BAILMENT & CONVERSION

*Meaningful gap area — your only entry is recovery of personal property. "I gave my thing to someone and it came back damaged/lost/never" is an extremely common self-represented matter.*

| Scenario | Status |
|---|---|
| Someone won't return your property | ✅ `recovery-of-personal-property` |
| **Bailment — goods left with a business, lost or damaged** (repair shop, storage, dry cleaner, valet) | ⬜ |
| Conversion — someone sold or disposed of your property | ⬜ |
| Storage facility sold contents improperly | ⬜ |
| Pawn shop disputes | ⬜ |
| Consignment — goods sold, not paid; or goods lost | ⬜ |
| Property held by former partner / roommate | 🔶 `recovery-of-personal-property` |
| Return of an engagement ring | ⬜ |

## 9. TENANCY (non-RTA only) ⚠️

*The LTB has exclusive jurisdiction over most residential tenancies. Everything here needs the boundary sourced explicitly before building.*

| Scenario | Status |
|---|---|
| Commercial lease disputes | ✅ `commercial-tenancy-dispute` |
| Landlord vs **former** tenant after tenancy ended | ⬜ ⚠️ timing-dependent boundary |
| Roommate disputes (no landlord-tenant relationship under RTA) | ⬜ |
| Sublet disputes between tenants | ⬜ ⚠️ |
| Student housing outside RTA coverage | ⬜ ⚠️ |
| Short-term rental (Airbnb) host/guest disputes | ⬜ ⚠️ |
| Commercial illegal lockout damages | 🔶 `commercial-tenancy-dispute` |

## 10. FINANCIAL & INTERPERSONAL MONEY

| Scenario | Status |
|---|---|
| NSF / dishonoured cheque | ✅ `dishonoured-nsf-cheque` |
| Unpaid invoice (B2B or B2C) | ✅ `unpaid-debt-services` |
| **Personal loan between individuals** — friends, family | ⬜ very common, often no written agreement |
| Gift vs loan disputes | ⬜ |
| Co-signer / guarantor liability | ⬜ |
| E-transfer sent to wrong recipient | ⬜ |
| Shared expenses between former cohabiting partners | ⬜ ⚠️ property division → Family Court |
| Joint account disputes | ⬜ |
| Cryptocurrency transaction disputes | ⬜ |
| Breach of a settlement agreement | ⬜ |
| Unjust enrichment / quantum meruit (work done, no formal contract) | ⬜ foundational — supports many others |

## 11. PROFESSIONAL NEGLIGENCE (under $50k)

| Scenario | Status |
|---|---|
| Accountant — filing errors, penalties incurred | ⬜ |
| Real estate agent — negligence, non-disclosure | ⬜ |
| Home inspector — missed defects | ⬜ |
| Insurance broker — failed to obtain/maintain coverage | ⬜ |
| Mortgage broker | ⬜ |
| Paralegal / lawyer negligence | ⬜ ⚠️ LSO complaint process parallel |
| Travel agent | ⬜ |
| Contractor design error (vs workmanship) | 🔶 `contractor-damage` |

## 12. NEIGHBOUR DISPUTES

| Scenario | Status |
|---|---|
| Tree / branch / root damage | ⬜ |
| Fence cost sharing or damage | ⬜ ⚠️ Line Fences Act |
| Drainage / water runoff | ⬜ |
| Shared driveway disputes | ⬜ |
| Boundary disputes | ⚠️ **title to land → Superior Court, not Small Claims** |
| Noise / nuisance | ⬜ ⚠️ usually municipal bylaw |

## 13. CONDO ⚠️

*The Condominium Authority Tribunal (CAT) has jurisdiction over records, pets, parking, storage, and noise. That boundary must be sourced before building anything here.*

| Scenario | Status |
|---|---|
| Unpaid common expenses | ✅ `unpaid-condo-common-expenses` |
| Damage between units | ⬜ ⚠️ |
| Disputed chargebacks to an owner | ⬜ ⚠️ |

## 14. REPUTATION & DIGNITARY

| Scenario | Status |
|---|---|
| Defamation — libel and slander | ✅ `defamation-libel-slander` |
| Online reviews / social media posts | 🔶 `defamation-libel-slander` |
| **False detention / shoplifting accusation by a retailer** | ⬜ |
| Breach of privacy / intrusion upon seclusion | ⬜ |
| Malicious prosecution | ⬜ rare |

## 15. BUSINESS-TO-BUSINESS

| Scenario | Status |
|---|---|
| Unpaid B2B invoices | 🔶 `unpaid-debt-services` |
| Breach of supply agreement | ⬜ |
| Trade debt / account disputes | 🔶 |
| Partnership dissolution accounting | ⬜ ⚠️ may exceed Small Claims scope |
| Franchise disputes | ⬜ ⚠️ often arbitration clauses |

---

## Explicitly OUT OF SCOPE — worth building as routing, not claim types

These should be recognized and redirected, never silently misrouted into a Small Claims path. The classifier returning "none" is correct but unhelpful; an honest "this belongs at [forum]" is far better.

| Matter | Correct forum |
|---|---|
| Residential tenancy (most) | Landlord and Tenant Board |
| Discrimination / harassment (protected grounds) | Human Rights Tribunal of Ontario |
| Workplace injury | WSIB |
| Employment standards complaint (if filed) | Ministry of Labour |
| Condo records, pets, parking, storage, noise | Condominium Authority Tribunal |
| Auto accident benefits | Licence Appeal Tribunal |
| Title to land, boundaries | Superior Court of Justice |
| Injunctions, specific performance, declarations | Superior Court of Justice |
| Claims over $50,000 | Superior Court of Justice |
| Family law — support, parenting, property division | Family Court |
| Wills and estates administration | Superior Court of Justice |
| Municipal bylaw / provincial offences | POA Court |
| Professional misconduct | The relevant regulator |
| Airline compensation | CTA (federal) |
| Telecom disputes | CCTS |
| Bank complaints | Internal → OBSI/ADRBO |

---

## Suggested build order

Sequenced by a rough combination of how often the matter arises, how clearly sourceable it is, and whether it unblocks other entries.

**Batch 1 — unblocks the most, clearest sourcing**
1. Vehicle accident — property damage only *(known gap; Mustapha may now unblock)*
2. Personal loan between individuals
3. Bailment — goods left with a business, lost or damaged
4. Unpaid wages / final pay / commissions
5. Moving company disputes

**Batch 2 — high frequency, moderate sourcing complexity**
6. Event vendor failure (photographer/caterer/venue)
7. Private marketplace sale disputes
8. Unjust enrichment / quantum meruit *(foundational)*
9. Neighbour tree / root damage
10. Landlord vs former tenant *(needs LTB boundary sourced first)*

**Batch 3 — needs careful jurisdiction work first**
11. Professional negligence cluster (accountant, agent, inspector, broker)
12. School / childcare supervision failure
13. Gym / recreation injury and waiver enforceability
14. False detention by a retailer
15. Roommate / sublet disputes

**Batch 4 — routing, not claim types**
16. Build honest "this belongs at [forum]" recognition for every out-of-scope matter listed above

---

## Two structural notes worth acting on

**1. "None of these" should be logged, not just returned.** The AI classifier (commit `42274b3`) correctly returns `none` when nothing fits. If every `none` is logged with the user's story, that log becomes the real evidence for what to source next — replacing this document's educated guesses with actual demand data from real users. This is the single highest-value instrumentation you could add.

**2. Out-of-scope routing is nearly as valuable as new claim types.** A user with an LTB matter who gets "we don't have a match" learns nothing. The same user told "this looks like a Landlord and Tenant Board matter — here's where to go" has been genuinely helped, with no legal advice given and no new claim type built. Cheap to build relative to its value.
