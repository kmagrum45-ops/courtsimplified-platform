/**
 * The coverage set: fabricated stories across every kind of matter people
 * bring to the three courts, both sides, many stages, plus matters that
 * belong to a tribunal. Used by `npm run eval:coverage`
 * (scripts/eval/coverageProbe.ts) to find where the site falls short.
 *
 * `expect` lists every court path that would be a right answer. A
 * human-rights story can belong to the Human Rights Tribunal or, joined to
 * another claim, to a court (Human Rights Code s. 46.1), so it accepts both.
 *
 * Fabricated stories only. No real person, case or place beyond a city name.
 */

export type CoverageExpect = "small-claims" | "civil" | "family" | `out-of-scope:${string}`;

export type CoverageStory = {
  id: string;
  /** The court path the intake would be on, for research. */
  court: "small-claims" | "civil" | "family";
  side?: "plaintiff" | "defendant";
  /** Right answers for the court-path classifier. */
  expect: CoverageExpect[];
  /** A short area label for the report. */
  area: string;
  story: string;
};

const sc = (id: string, area: string, story: string, side: "plaintiff" | "defendant" = "plaintiff", expect: CoverageExpect[] = ["small-claims"]): CoverageStory =>
  ({ id: `sc-${id}`, court: "small-claims", side, expect, area, story });
const cv = (id: string, area: string, story: string, side: "plaintiff" | "defendant" = "plaintiff", expect: CoverageExpect[] = ["civil"]): CoverageStory =>
  ({ id: `cv-${id}`, court: "civil", side, expect, area, story });
const fm = (id: string, area: string, story: string, side: "plaintiff" | "defendant" = "plaintiff", expect: CoverageExpect[] = ["family"]): CoverageStory =>
  ({ id: `fm-${id}`, court: "family", side, expect, area, story });

export const COVERAGE_SET: CoverageStory[] = [
  // ------------------------------------------------------------ Small Claims, bringing a claim
  sc("unpaid-invoice", "debt", "I did graphic design work for a restaurant in March and sent an invoice for $4,200. They keep saying they'll pay next week but it's been five months."),
  sc("loan-friend", "debt", "I lent my friend $6,000 to fix his truck. We texted about it and he promised to pay me back by Christmas. Now he won't answer me."),
  sc("nsf-cheque", "debt", "A customer paid me with a cheque for $2,750 for a used motorcycle and it bounced. He has the bike."),
  sc("contractor-quit", "contract", "We paid a contractor a $9,000 deposit to redo our basement. He did about two days of work, then stopped showing up and won't return calls."),
  sc("bad-roof", "contract", "A roofer replaced my roof last fall for $14,000 and it started leaking in three places this spring. He says it's not his problem."),
  sc("online-order", "consumer", "I ordered a $1,300 sectional online from a Canadian company. It never came and they stopped answering emails. My credit card company won't help."),
  sc("used-car-dealer", "consumer", "I bought a used car from a dealer in Hamilton for $11,000. Two weeks later my mechanic said it had been in a major accident and the frame was repaired. Nobody told me."),
  sc("private-car-sale", "contract", "I bought a car from a guy on Kijiji. He said the engine was rebuilt. It died a week later and my mechanic says it was never rebuilt."),
  sc("door-to-door", "consumer", "A salesman came to my door and signed me up for a water heater rental. I cancelled two days later in writing but they still charged me $3,400 to remove it."),
  sc("gym-contract", "consumer", "I cancelled my gym membership after I moved and they sent me to collections for $900 in fees."),
  sc("deposit-wedding", "contract", "Our wedding venue cancelled our booking three months before the date and won't give back our $8,500 deposit."),
  sc("dog-bite", "injury", "My neighbour's dog bit my 10 year old son on the arm while he was walking past their yard. He needed stitches and we missed work."),
  sc("slip-store", "injury", "I slipped on a wet floor at a grocery store. There was no sign. I broke my wrist and couldn't work for six weeks."),
  sc("slip-sidewalk-city", "injury", "I fell on an icy city sidewalk in Ottawa in January and tore a ligament in my knee. The sidewalk hadn't been salted for days."),
  sc("car-accident-property", "vehicle", "A driver rear-ended my car at a red light. His insurance is fighting it and my repair bill was $7,800. I want to sue him."),
  sc("bus-injury", "vehicle", "i was hit by an OC transpo bus when i was waiting to cross at a cross walk. the bus made a right turn and drove over the curb and knocked me down and i dislocated my shoulder. i want to sue"),
  sc("cyclist-dooring", "vehicle", "A parked driver opened his door into me while I was cycling. I broke my collarbone and my bike was destroyed."),
  sc("wrongful-dismissal-short", "employment", "I was fired after 14 months at a call centre with no reason and no pay in lieu of notice. I want to sue for what I'm owed."),
  sc("unpaid-wages", "employment", "My boss at a landscaping company didn't pay my last three weeks of wages before I quit. It's about $3,100."),
  sc("overtime", "employment", "I worked 55 hours most weeks at a warehouse and they never paid overtime, just straight time."),
  sc("towing", "consumer", "My car was towed from a plaza parking lot where I was a customer, and the towing company charged me $600 before they'd release it. There were no signs."),
  sc("mechanic-overcharge", "consumer", "The garage quoted $600 for brakes and then charged $1,400 and wouldn't give me my car back until I paid."),
  sc("dry-cleaner", "bailment", "A dry cleaner lost my wedding dress. They offered me $100 and it cost $2,800."),
  sc("roommate-bills", "debt", "My former roommate left owing me half the hydro and internet for a year, about $1,900."),
  sc("defamation-facebook", "defamation", "My ex-business partner posted on Facebook that I'm a thief and stole from customers. I lost two contracts because of it."),
  sc("property-return", "property", "My ex-boyfriend still has my grandmother's ring and my laptop and refuses to give them back."),
  sc("condo-fees", "condo", "I'm a condo board treasurer. A unit owner hasn't paid common expenses for 8 months, about $4,600."),
  sc("damage-by-child", "injury", "A neighbour's teenager threw rocks and broke two windows in my car. The parents say it's not their problem."),
  sc("tree-fell", "property", "My neighbour's dead tree fell on my garage in a storm. I had told him in writing it was dying. Repairs are $12,000."),
  sc("water-damage-upstairs", "property", "Water from the unit above me in our condo leaked into my kitchen and ruined my cabinets. The upstairs owner won't pay."),
  sc("landlord-commercial", "commercial-tenancy", "I rented a small shop. When I moved out the landlord kept my $5,000 deposit and says I owe more for cleaning."),
  sc("bad-tattoo", "contract", "A tattoo artist misspelled my daughter's name on my arm. Laser removal will cost about $3,000."),
  sc("vet-negligence", "negligence", "My dog died after a routine surgery at a vet clinic. Another vet said they gave the wrong dose of anesthetic."),
  sc("renovation-damage", "contract", "A plumber we hired flooded our basement when he didn't cap a pipe properly. Damage was $16,000."),
  sc("over-limit", "jurisdiction", "My business partner took about $70,000 out of our company account and disappeared. Can I sue him in small claims?", "plaintiff", ["small-claims", "civil"]),
  sc("judgment-unpaid", "enforcement", "I won a Small Claims judgment for $8,000 against a contractor last year and he still hasn't paid anything. How do I collect?"),
  sc("claim-not-served", "procedure", "I filed my claim against a former tenant of my rental unit for damage six months ago but I can't find her to serve her."),
  sc("settlement-conference", "procedure", "My settlement conference is in three weeks. The defendant never filed a defence. What do I need to do?"),
  // ------------------------------------------------------------ Small Claims, defending
  sc("served-debt", "defence", "I got served with a Small Claims claim saying I owe a credit card company $7,000. I think it's past the time limit, the last payment was in 2021.", "defendant"),
  sc("served-contractor", "defence", "A customer is suing me for $12,000 saying my renovation was bad. I'm the contractor. He still owes me $4,000 on the job.", "defendant"),
  sc("served-landlord", "defence", "My old commercial landlord is suing me for unpaid rent after I left early, but they rented it to someone else a month later.", "defendant"),
  sc("served-roommate", "defence", "My former roommate is suing me for $3,000 saying I damaged furniture. It was already worn and I have photos from the first day.", "defendant"),
  sc("noted-default", "default", "I didn't file a defence on time because I was in the hospital and now I've been noted in default. Can I fix this?", "defendant"),
  sc("default-judgment", "default", "There's a default judgment against me for $9,000 for a claim I was never served with. I found out when my wages were garnished.", "defendant"),
  sc("served-defamation", "defence", "My neighbour is suing me for defamation over a Google review I wrote about her dog grooming business. Everything I wrote was true.", "defendant"),
  sc("served-car-accident", "defence", "I'm being sued over a fender bender in a parking lot. The other driver says I backed into her, but she was the one moving.", "defendant"),
  sc("served-loan", "defence", "My brother is suing me for $5,000 he says he lent me. It was a gift for my wedding.", "defendant"),
  sc("served-employer", "defence", "I run a small bakery and a former employee is suing me for wrongful dismissal. I fired her for stealing from the till.", "defendant"),
  sc("defendants-claim", "defence", "I'm being sued by a supplier for an unpaid invoice, but their late delivery cost me a big order. I want to claim my losses back from them.", "defendant"),
  sc("trial-coming", "procedure", "My Small Claims trial is next month. I'm the defendant. What do I need to bring and how does it work?", "defendant"),
  sc("lost-trial-appeal", "appeal", "I lost my Small Claims trial for $20,000 and I think the judge got it wrong. Can I appeal?", "defendant"),
  sc("missed-trial", "default", "I missed my Small Claims trial because I had the wrong date. The judge ruled against me.", "defendant"),
  sc("garnishment", "enforcement", "My bank account was frozen because of a Small Claims judgment. I need that money for rent. What can I do?", "defendant"),
  sc("served-wrong-name", "defence", "I was served with a claim against my company but they named me personally. The contract was with my corporation.", "defendant"),
  sc("served-tenant-damage", "defence", "My former landlord sued me in Small Claims for $6,000 for damage after I moved out of my apartment. The damage was there before.", "defendant", ["small-claims", "out-of-scope:ltb"]),

  // ------------------------------------------------------------ Civil (Superior Court)
  cv("charter-search", "charter", "Two police officers came into my apartment last spring without a warrant and searched my bedroom. They said they were looking for someone else. Nothing was found and no charges were laid. I want to sue the police service for violating my rights."),
  cv("charter-wrongful-arrest", "charter", "I was arrested at a protest, held for 30 hours, and released without charges. The officers used force and my wrist was broken. I want to sue the police and the province.", "plaintiff", ["civil", "small-claims"]),
  cv("malicious-prosecution", "tort", "I was charged with fraud, spent a year fighting it and the Crown withdrew everything right before trial. The investigator ignored evidence that cleared me. I lost my job."),
  cv("human-rights-employment", "human-rights", "I was fired from my warehouse job three weeks after I told my manager I was pregnant. They said it was restructuring but they hired someone for my position a month later. I want to sue for wrongful dismissal and discrimination.", "plaintiff", ["civil", "small-claims", "out-of-scope:hrto"]),
  cv("wrongful-dismissal-senior", "employment", "I was a manager for 22 years at a manufacturing company. They let me go with 8 weeks pay. I'm 58 and can't find work."),
  cv("constructive-dismissal", "employment", "My employer cut my salary by 30% and took away my team. I feel forced out. I've been there 12 years."),
  cv("termination-clause", "employment", "I was terminated without cause after 6 years and given only the minimum under the ESA because of a clause in my contract. Is that clause valid?"),
  cv("medical-malpractice", "negligence", "My father died after a hospital sent him home with what they said was indigestion. It was a heart attack. We want to sue the hospital and the doctor."),
  cv("serious-car-accident", "vehicle", "I was badly injured in a highway collision last year when another driver crossed the centre line. I have a spinal injury and can't work. The other driver was insured."),
  cv("motorcycle-pothole", "municipal", "I crashed my motorcycle because of a huge pothole on a regional road. I broke my leg in two places and missed six months of work."),
  cv("defamation-newspaper", "defamation", "A local newspaper published an article saying my restaurant was shut down for rats. It was a different restaurant. Business has dropped by half."),
  cv("online-defamation-big", "defamation", "A former employee created a website saying my accounting firm commits fraud. We've lost clients worth hundreds of thousands of dollars."),
  cv("served-slapp", "defamation", "A developer is suing me for $500,000 for defamation because I spoke against his project at a city council meeting.", "defendant"),
  cv("contract-commercial", "contract", "A supplier breached a three-year contract to supply parts to my factory. We had to buy elsewhere at a much higher price. Our losses are about $400,000."),
  cv("real-estate-deal-collapsed", "real-estate", "The buyers of our house backed out two days before closing. We had to resell for $120,000 less. We kept their $50,000 deposit."),
  cv("served-real-estate-deposit", "real-estate", "We backed out of buying a house because we lost financing. The sellers are suing us for the difference on resale and keeping our deposit.", "defendant"),
  cv("unjust-enrichment-partner", "unjust-enrichment", "I lived with my boyfriend for 9 years in his house. I paid for the renovations and half the mortgage. We split up and he says I get nothing.", "plaintiff", ["civil", "family"]),
  cv("estate-dispute", "estates", "My brother was the executor of my mother's will and he won't tell us what's in the estate. It's been two years. He's living in her house."),
  cv("will-challenge", "estates", "My father changed his will three weeks before he died to leave everything to his new caregiver. He had dementia."),
  cv("power-of-attorney", "estates", "My sister has power of attorney for our mother and has been taking money from her account. Mom is in a care home."),
  cv("partnership-dispute", "business", "My business partner and I own a company 50/50. He locked me out of the bank accounts and is running it without me."),
  cv("shareholder-oppression", "business", "I'm a minority shareholder in a family company. The majority stopped paying dividends and pays themselves huge salaries instead."),
  cv("construction-lien", "construction", "I'm a subcontractor. The general contractor didn't pay me $85,000 for drywall on a new building. The project finished last month."),
  cv("construction-lien-owner", "construction", "A subcontractor registered a lien on my house for $60,000 but I paid my general contractor in full.", "defendant"),
  cv("injunction-neighbour", "property", "My neighbour is building a fence and a shed partly on my land. I want it stopped before it's finished."),
  cv("boundary-dispute", "property", "My neighbour says the strip of land along our driveway is his based on a new survey. My family has used it for 40 years."),
  cv("mortgage-power-of-sale", "real-estate", "My lender sent me a notice of sale under mortgage. I'm behind three payments. I want to stop them from selling my house.", "defendant"),
  cv("insurance-denial", "insurance", "My house burned down and my insurance company denied the claim, saying I didn't disclose a home business. Losses are over $600,000."),
  cv("disability-insurance", "insurance", "My long-term disability insurer cut off my benefits after two years, saying I can do some other job. My doctors say I can't work at all."),
  cv("fraud-investment", "fraud", "A financial advisor convinced me to put $150,000 into an investment that turned out to be fake. He's gone and the money is gone."),
  cv("served-civil-claim", "defence", "I was served with a statement of claim from a former business partner for $300,000. What do I do and how long do I have?", "defendant"),
  cv("summary-judgment", "procedure", "The other side brought a motion for summary judgment against me in my lawsuit. I'm representing myself.", "defendant"),
  cv("discovery", "procedure", "My examination for discovery is scheduled next month in my lawsuit against my former employer. I don't know what to expect.", "plaintiff"),
  cv("mandatory-mediation", "procedure", "We got a notice that mediation is required in our Toronto lawsuit. Who pays for it and what happens if I don't go?"),
  cv("dismissed-for-delay", "procedure", "My lawsuit was dismissed for delay because I didn't set it down for trial. I didn't know there was a deadline."),
  cv("costs-award", "procedure", "I lost a motion and the judge ordered me to pay $15,000 in costs. Can they do that to someone without a lawyer?"),
  cv("judgment-enforcement-civil", "enforcement", "I have a Superior Court judgment for $180,000 against a former business partner who is hiding his assets."),
  cv("appeal-civil", "appeal", "I lost my civil trial and I want to appeal to the Court of Appeal. When is the deadline?", "defendant"),
  cv("privacy-intrusion", "privacy", "My ex-employer installed spyware on my personal phone and read my messages for months."),
  cv("nuisance-noise", "property", "A new concrete plant next to my farm runs all night and the dust and noise are making my family sick."),
  cv("school-injury", "negligence", "My son was seriously injured in gym class when an unsupervised student dropped a weight on him. He has a brain injury."),
  cv("class-action-question", "procedure", "Thousands of customers were overcharged by the same company. Can we sue together?"),
  cv("government-negligence", "crown", "A provincial inspector approved a daycare that later burned down. My child was hurt. I want to sue the province."),
  cv("crown-notice", "crown", "I want to sue the Ontario government because a provincial highway maintenance crew damaged my car. Is there anything I need to do first?", "plaintiff", ["civil", "small-claims"]),

  // ------------------------------------------------------------ Family
  fm("separation-parenting", "parenting", "We separated last month. We have two kids aged 4 and 7. We can't agree on who they live with during the week."),
  fm("relocation-objecting", "relocation", "My ex wants to move with our 8 year old to Alberta for a new job. We have a court order for shared parenting. I don't want my son moved so far away.", "defendant"),
  fm("relocation-moving", "relocation", "I got a job offer in Halifax and want to move with my daughter. Her father sees her every second weekend. What do I have to do?"),
  fm("child-support-start", "child-support", "My ex moved out and isn't paying anything for our three kids. He makes about $90,000 a year."),
  fm("child-support-retroactive", "child-support", "My ex has been paying $400 a month in child support for five years but I just found out he's been making twice what he told me."),
  fm("child-support-decrease", "child-support", "I lost my job and can't afford the child support in my court order anymore. I'm falling behind.", "defendant"),
  fm("spousal-support", "spousal-support", "I was a stay-at-home mom for 18 years. My husband left and says I should just get a job. I have no income."),
  fm("spousal-support-end", "spousal-support", "I've been paying spousal support to my ex-wife for 10 years under a separation agreement. She's remarried. Can I stop?", "defendant"),
  fm("property-equalization", "property", "We were married 15 years. The house is in my husband's name. He says it's his because his parents gave him the down payment."),
  fm("matrimonial-home", "property", "My wife changed the locks on our house after I moved out for a few days. My name is on the deed too."),
  fm("divorce-uncontested", "divorce", "We've been separated for two years and both want a divorce. We have no kids and no property. How do we do it?"),
  fm("divorce-served", "divorce", "I was just served with an application for divorce, custody and support. I have 30 days?", "defendant"),
  fm("motion-to-change", "variation", "My ex filed a motion to change our parenting order so he gets the kids more. I was served yesterday.", "defendant"),
  fm("contempt", "enforcement", "My ex keeps denying me my parenting time even though we have a court order. This has happened six times.", "plaintiff"),
  fm("family-violence", "safety", "My husband pushed me and threatened me in front of the kids. I left with the children and I'm staying with my sister. I need custody and for him to stay away."),
  fm("restraining-order", "safety", "My ex-boyfriend keeps showing up at my work and texting threats. We have a child together. I want a restraining order."),
  fm("grandparent-access", "parenting", "My son passed away and my daughter-in-law won't let me see my grandchildren anymore."),
  fm("cohabitation-property", "property", "We lived together for 7 years but never married. We bought a house together. Now we're splitting and he wants to keep it.", "plaintiff", ["family", "civil"]),
  fm("separation-agreement", "agreement", "We want to sign a separation agreement without going to court. What does it need to include to be valid?"),
  fm("agreement-unfair", "agreement", "I signed a separation agreement under pressure without a lawyer. He hid his business income. Can I set it aside?"),
  fm("disclosure-missing", "procedure", "My ex won't give me his financial statements or tax returns in our support case. Our case conference is next month."),
  fm("case-conference", "procedure", "I have my first case conference in family court in three weeks. What do I need to file before then?"),
  fm("settlement-conference-family", "procedure", "We have a settlement conference in our custody case next month. I'm representing myself."),
  fm("temporary-motion", "procedure", "I need an urgent order to stop my ex from taking the kids out of the country on a trip next week."),
  fm("child-abduction", "safety", "My ex took our son to another province and won't bring him back. There's no court order yet.", "plaintiff"),
  fm("decision-making-school", "parenting", "We share custody but can't agree on which school our daughter should go to. My ex enrolled her without telling me."),
  fm("support-arrears-fro", "enforcement", "The Family Responsibility Office says I owe $22,000 in arrears and they suspended my driver's licence. I need my licence for work.", "defendant"),
  fm("not-getting-support-fro", "enforcement", "My ex is supposed to pay child support through the Family Responsibility Office but hasn't paid in a year."),
  fm("pension-division", "property", "My husband has a big pension from his government job. We're divorcing after 25 years. Do I get part of it?"),
  fm("children's-lawyer", "parenting", "The judge said she might ask the Office of the Children's Lawyer to get involved in our custody case. What does that mean?"),
  fm("parenting-plan", "parenting", "My ex and I get along okay and want to write our own parenting plan for our two kids. What should it cover?"),
  fm("appeal-family", "appeal", "The judge gave my ex primary residence of our children after a trial. I think he ignored the evidence. Can I appeal?", "defendant"),
  fm("final-order-change-support", "variation", "Our final order set child support when my ex made $50,000. He now makes $120,000. Can I get more?"),
  fm("adoption-step", "adoption", "I want to adopt my wife's son from her first relationship. His biological father hasn't been involved in 8 years."),
  fm("parentage", "parentage", "My ex says I'm not the father of her baby and won't let me see him. I want to be declared his father."),
  fm("hague-international", "safety", "My wife took our daughter to her home country in Europe for a vacation and says she isn't coming back."),
  fm("same-sex-separation", "property", "My wife and I are separating after 6 years of marriage. We have a condo and two cars. How is property divided?"),
  fm("serve-abroad", "procedure", "I need to serve divorce papers on my husband who lives in India. How do I do that?"),
  fm("default-family", "default", "I never answered my ex's family court application because I didn't understand it. Now there's a final order for support I can't afford.", "defendant"),

  // ------------------------------------------------------------ belong elsewhere
  sc("tenant-repairs", "tribunal", "There's been no heat in my apartment since November and the landlord ignores my texts. Can I do anything?", "plaintiff", ["out-of-scope:ltb", "small-claims"]),
  sc("eviction", "tribunal", "My landlord gave me an N12 saying his son is moving in. I don't believe him.", "defendant", ["out-of-scope:ltb"]),
  sc("hrto-only", "tribunal", "My landlord refused to rent to me because I have kids. I want to file a human rights complaint.", "plaintiff", ["out-of-scope:hrto"]),
  sc("wsib", "tribunal", "I got hurt at work and WSIB denied my claim. I want to appeal.", "plaintiff", ["out-of-scope:wsiat"]),
  sc("criminal-charge", "tribunal", "I was charged with assault after a bar fight. When is my court date and do I need a lawyer?", "defendant", ["out-of-scope:criminal-related"]),
  sc("ticket", "tribunal", "I got a speeding ticket for going 30 over. Should I fight it?", "defendant", ["out-of-scope:criminal-related"]),
  sc("condo-tribunal", "tribunal", "My condo neighbour's dog barks all day and the condo board won't enforce the rules.", "plaintiff", ["out-of-scope:cat", "small-claims"]),
  sc("odsp", "tribunal", "My ODSP application was denied. How do I appeal?", "plaintiff", ["out-of-scope:social-benefits-tribunal"]),
  sc("accident-benefits", "tribunal", "My insurance company cut off my accident benefits after my car crash. I need physio.", "plaintiff", ["out-of-scope:lat"]),
  sc("immigration", "tribunal", "My refugee claim was refused. What can I do?", "plaintiff", ["out-of-scope:immigration"]),
];
