/**
 * The labelled set retrieval is measured against: stories written the way
 * people write them, each with the provisions a lawyer would open first.
 *
 * Every label is checked against the law itself, not taken on trust:
 * `phrase` must appear in the labelled provision's own text in the corpus
 * (test:corpus-retrieval asserts it, no network needed). A label that says
 * "RTA s. 106" for a deposit story therefore cannot point at a section that
 * says something else, and a re-vendored statute that renumbers a section
 * turns the check red instead of silently corrupting the measurement.
 *
 * A story is a HIT when any one of its provisions is retrieved; provision
 * recall counts every labelled provision. Decisions are labelled by case
 * (no section): any passage of the majority's reasons counts.
 *
 * Fabricated stories only. Measured by `npm run eval:retrieval-recall`.
 */

import type { RetrievalCourt } from "../../src/lib/case-system/retrieval/storyRetrieval";

export type RecallLabel = {
  /** Corpus source id or decision id ("decision-honda"). */
  source: string;
  /** "106", "9.01", "16.9"; omitted for a decision. */
  section?: string;
  /** Words the labelled provision itself contains. */
  phrase: string;
};

export type RecallStory = {
  id: string;
  court: RetrievalCourt;
  stage?: string;
  side?: "plaintiff" | "defendant";
  story: string;
  expect: RecallLabel[];
};

const SC = "oreg-258-98-small-claims-rules";

export const RECALL_SET: RecallStory[] = [
  // ---------------------------------------------------------------- Small Claims procedure
  {
    id: "defend-served-claim",
    court: "small-claims",
    stage: "responding",
    side: "defendant",
    story: "Someone handed me court papers yesterday saying I owe my old roommate $2,800 for bills. I don't think I owe it. How long do I have to answer?",
    expect: [{ source: SC, section: "9.01", phrase: "within 20 days of being served" }],
  },
  {
    id: "they-never-answered",
    court: "small-claims",
    stage: "already-started",
    story: "I sued a contractor in small claims and had him served at his house five weeks ago. He never filed anything back. What happens now, can I just win?",
    expect: [
      { source: SC, section: "11.01", phrase: "noted in default" },
      { source: SC, section: "11.02", phrase: "default judgment" },
    ],
  },
  {
    id: "default-judgment-against-me",
    court: "small-claims",
    side: "defendant",
    story: "I just found out there's a judgment against me from small claims. I never got any papers, I moved last year. Can I get it cancelled?",
    expect: [{ source: SC, section: "11.06", phrase: "set aside the noting in default or default judgment" }],
  },
  {
    id: "claim-not-served-yet",
    court: "small-claims",
    stage: "already-started",
    story: "I filed my claim online in March but I still haven't managed to give it to the guy, he keeps dodging me. Is there a deadline for that?",
    expect: [{ source: SC, section: "8.01", phrase: "within six months after the date it is issued" }],
  },
  {
    id: "which-courthouse",
    court: "small-claims",
    story: "The company I'm suing is in Mississauga but I live in Ottawa and the work was done at my place in Ottawa. Where do I file?",
    expect: [{ source: SC, section: "6.01", phrase: "in which the cause of action arose" }],
  },
  {
    id: "conference-coming",
    court: "small-claims",
    stage: "conference",
    story: "I got a notice for a settlement conference next month in my small claims case. What is that meeting and do I have to go?",
    expect: [{ source: SC, section: "13.01", phrase: "settlement conference shall be held in every defended action" }],
  },
  {
    id: "won-but-not-paid",
    court: "small-claims",
    stage: "enforcement",
    story: "I won my case three months ago, $6,000, and the guy still hasn't paid a cent. I know where he works. How do I actually get the money?",
    expect: [{ source: SC, section: "20.08", phrase: "notice of garnishment" }],
  },
  {
    id: "too-much-for-small-claims",
    court: "small-claims",
    story: "My business partner took about $70,000 out of our company account and disappeared. Can I sue him in small claims?",
    expect: [{ source: "oreg-626-00-monetary-jurisdiction", section: "1", phrase: "$50,000" }],
  },
  {
    id: "appeal-small-claims",
    court: "small-claims",
    stage: "trial",
    story: "The deputy judge ruled against me for $12,000 and I think he got it completely wrong. Can I appeal?",
    expect: [{ source: "cja-courts-of-justice-act", section: "31", phrase: "appeal lies to the Divisional Court from a final order of the Small Claims Court" }],
  },
  {
    id: "cannot-afford-fees",
    court: "small-claims",
    story: "I'm on ODSP and I can't afford the filing fee to sue my old landlord. Is there anything I can do?",
    expect: [{ source: "ontario-fee-waiver", phrase: "fee waiver" }],
  },

  // ---------------------------------------------------------------- time limits
  {
    id: "old-loan",
    court: "small-claims",
    story: "I lent my cousin $4,000 back in 2022. He promised to pay me back by the end of that year and never did. Is it too late to sue him?",
    expect: [
      { source: "limitations-act-2002", section: "4", phrase: "second anniversary of the day on which the claim was discovered" },
      { source: "limitations-act-2002", section: "5", phrase: "ought to have known" },
    ],
  },
  {
    id: "found-out-late",
    court: "small-claims",
    story: "The roofer did my roof four years ago but I only found out last month that he never put in the underlayment, when it started leaking. Can I still go after him?",
    expect: [{ source: "limitations-act-2002", section: "5", phrase: "ought to have known" }],
  },

  // ---------------------------------------------------------------- consumer
  {
    id: "door-to-door",
    court: "small-claims",
    story: "A salesman came to my door and talked my mom into signing for a water heater rental. That was 6 days ago. She wants out. Can she cancel?",
    expect: [{ source: "consumer-protection-act-2002", section: "43", phrase: "cancel a direct agreement" }],
  },
  {
    id: "estimate-blown",
    court: "small-claims",
    story: "The renovation company quoted $8,000 in writing and then billed me $11,500 without asking. Do I have to pay the extra?",
    expect: [{ source: "consumer-protection-act-2002", section: "10", phrase: "exceeds the estimate by more than 10 per cent" }],
  },
  {
    id: "mechanic-holding-car",
    court: "small-claims",
    story: "The garage said it would be around $600 for brakes and now wants $1,400 and won't give my car back until I pay.",
    expect: [
      { source: "consumer-protection-act-2002", section: "56", phrase: "estimate" },
      { source: "repair-and-storage-liens-act", section: "3", phrase: "lien" },
    ],
  },
  {
    id: "lied-to-at-sale",
    court: "small-claims",
    story: "The salesperson swore the used laptop had a brand-new battery. It's the original battery and dies in 20 minutes. They refuse a refund.",
    expect: [
      { source: "consumer-protection-act-2002", section: "14", phrase: "false, misleading or deceptive representation" },
      { source: "consumer-protection-act-2002", section: "18", phrase: "rescinded" },
    ],
  },
  {
    id: "product-not-fit",
    court: "small-claims",
    story: "I told the store I needed a pump that could handle my 30-foot well and they sold me one. It can't pull water up that far. They say all sales final.",
    expect: [{ source: "sale-of-goods-act", section: "15", phrase: "reasonably fit for such purpose" }],
  },
  {
    id: "collection-calls",
    court: "small-claims",
    side: "defendant",
    story: "A collection agency keeps calling me at work about a cell phone bill from years ago. Do I have to talk to them?",
    expect: [{ source: "cleo-debt-and-consumer-rights-collection-agency-called-me-do-i-have-talk-them", phrase: "collection agency" }],
  },
  {
    id: "credit-report-wrong",
    court: "small-claims",
    story: "My credit report shows a loan I never took out and it's stopping me from getting a mortgage. The credit bureau won't fix it.",
    expect: [{ source: "consumer-reporting-act", section: "13", phrase: "correct, supplement or delete the information" }],
  },

  // ---------------------------------------------------------------- tenancy
  {
    id: "deposit-kept",
    court: "small-claims",
    story: "I rented a basement for two years and moved out in June. I paid first and last when I moved in. The landlord never gave back the last month.",
    expect: [{ source: "residential-tenancies-act-2006", section: "106", phrase: "rent deposit" }],
  },
  {
    id: "landlord-walks-in",
    court: "small-claims",
    story: "My landlord keeps coming into my apartment when I'm at work without telling me. He says it's his property.",
    expect: [{ source: "residential-tenancies-act-2006", section: "27", phrase: "24 hours" }],
  },
  {
    id: "repairs-ignored",
    court: "small-claims",
    story: "There's been no heat in my unit since November and the landlord ignores my texts. Can I do anything?",
    expect: [{ source: "residential-tenancies-act-2006", section: "20", phrase: "good state of repair" }],
  },
  {
    id: "own-use-eviction",
    court: "small-claims",
    story: "My landlord gave me a notice saying his son is moving into my unit so I have to leave in 60 days. I think he just wants to raise the rent.",
    expect: [{ source: "residential-tenancies-act-2006", section: "48", phrase: "for the purpose of residential occupation" }],
  },

  // ---------------------------------------------------------------- injuries and property
  {
    id: "dog-bite",
    court: "small-claims",
    story: "My neighbour's dog got out and bit my son on the leg. He needed stitches. The neighbour says the gate was broken so it's not his fault.",
    expect: [{ source: "dog-owners-liability-act", section: "2", phrase: "liable for damages resulting from a bite or attack" }],
  },
  {
    id: "store-slip",
    court: "small-claims",
    story: "I slipped on a puddle of spilled juice in a grocery store aisle. Nobody had put up a sign. I hurt my back and missed two weeks of work.",
    expect: [{ source: "occupiers-liability-act", section: "3", phrase: "duty to take such care" }],
  },
  {
    id: "city-sidewalk",
    court: "small-claims",
    story: "I fell on an unsalted city sidewalk in Kingston two weeks ago and broke my wrist. I want the city to pay.",
    expect: [{ source: "municipal-act-2001", section: "44", phrase: "within 10 days after the occurrence of the injury" }],
  },
  {
    id: "toronto-sidewalk",
    court: "small-claims",
    story: "I tripped on a broken sidewalk slab on Queen Street in Toronto last week and chipped my teeth. Can I claim against the City of Toronto?",
    expect: [{ source: "city-of-toronto-act-2006", section: "42", phrase: "within 10 days after the occurrence of the injury" }],
  },
  {
    id: "newspaper-lie",
    court: "small-claims",
    story: "The local newspaper printed that my restaurant failed a health inspection. It's false. I've lost customers. What do I need to do?",
    expect: [{ source: "libel-and-slander-act", section: "5", phrase: "within six weeks after the alleged libel" }],
  },
  {
    id: "both-at-fault-fence",
    court: "small-claims",
    story: "A guy backed into my fence with his truck. He says I'm partly to blame because my fence was over the property line a bit.",
    expect: [{ source: "negligence-act", section: "3", phrase: "apportion the damages" }],
  },
  {
    id: "kid-vandalism",
    court: "small-claims",
    story: "The 14-year-old next door smashed my car windows with a bat. His parents say they can't control him. Can I make them pay?",
    expect: [{ source: "parental-responsibility-act-2000", section: "2", phrase: "liable for the damages" }],
  },
  {
    id: "neighbour-trespass",
    court: "small-claims",
    story: "My neighbour keeps cutting across my backyard and parking his trailer on my lawn even after I told him to stop.",
    expect: [{ source: "trespass-to-property-act", section: "2", phrase: "guilty of an offence" }],
  },

  // ---------------------------------------------------------------- employment
  {
    id: "fired-no-notice",
    court: "small-claims",
    story: "I was a cook at the same restaurant for six years. They fired me on the spot last week, no reason, no pay in lieu.",
    expect: [
      { source: "esa-2000-ontario", section: "54", phrase: "written notice of termination" },
      { source: "esa-2000-ontario", section: "57", phrase: "notice of termination" },
    ],
  },
  {
    id: "common-law-notice",
    court: "civil",
    story: "I managed a branch for 16 years. They restructured, let me go and paid me only the government minimum. I'm 59 and nobody is hiring for my kind of job.",
    expect: [
      { source: "decision-honda", phrase: "character of the employment" },
      { source: "decision-machtinger", phrase: "reasonable notice" },
      { source: "decision-brake", phrase: "reasonable notice" },
    ],
  },
  {
    id: "severance",
    court: "civil",
    story: "The factory where I worked 12 years is closing and laying off everyone. The company has hundreds of employees across Canada. Am I owed severance?",
    expect: [{ source: "esa-2000-ontario", section: "64", phrase: "shall pay severance pay" }],
  },
  {
    id: "vacation-pay",
    court: "small-claims",
    story: "I quit my job in August and they never paid out my vacation pay. It's been two months.",
    expect: [
      { source: "esa-2000-ontario", section: "35.2", phrase: "vacation pay" },
      { source: "esa-2000-ontario", section: "36", phrase: "vacation pay" },
    ],
  },
  {
    id: "overtime",
    court: "small-claims",
    story: "I worked 55 hours most weeks at the warehouse and they never paid overtime, just straight time.",
    expect: [{ source: "esa-2000-ontario", section: "22", phrase: "44 hours" }],
  },
  {
    id: "fired-pregnant",
    court: "civil",
    story: "Two weeks after I told my boss I was pregnant she said my position was being cut. Nobody else was let go.",
    expect: [{ source: "human-rights-code", section: "5", phrase: "equal treatment with respect to employment" }],
  },

  // ---------------------------------------------------------------- family
  {
    id: "move-away",
    court: "family",
    story: "My ex and I share our daughter week about. He just told me he's moving three hours away with her next month. I don't agree.",
    expect: [
      { source: "childrens-law-reform-act", section: "39.3", phrase: "relocation" },
      { source: "divorce-act", section: "16.9", phrase: "relocation" },
    ],
  },
  {
    id: "afraid-of-ex",
    court: "family",
    story: "My ex-boyfriend keeps showing up at my apartment and my work and threatened me last week. We lived together for four years.",
    expect: [
      { source: "family-law-act", section: "46", phrase: "restraining order" },
      { source: "childrens-law-reform-act", section: "35", phrase: "restraining order" },
    ],
  },
  {
    id: "child-support-amount",
    court: "family",
    story: "We just separated. The kids live with me full-time. How much child support should their father pay? He makes about $70,000.",
    expect: [{ source: "ontario-child-support-guidelines-full", section: "3", phrase: "amount set out in the applicable table" }],
  },
  {
    id: "common-law-support",
    court: "family",
    story: "I lived with my partner for nine years, we never married. I stayed home with our son. Now he's left. Can I get support for myself?",
    expect: [
      { source: "family-law-act", section: "29", phrase: "cohabited" },
      { source: "family-law-act", section: "30", phrase: "obligation to provide support" },
    ],
  },
  {
    id: "dividing-property",
    court: "family",
    story: "My husband and I are divorcing after 15 years. The house is in his name only. Do I get anything?",
    expect: [{ source: "family-law-act", section: "5", phrase: "net family property" }],
  },
  {
    id: "parenting-decisions",
    court: "family",
    story: "We can't agree on who the kids should live with after the separation. What does the court look at?",
    expect: [{ source: "childrens-law-reform-act", section: "24", phrase: "best interests" }],
  },
  {
    id: "divorce-grounds",
    court: "family",
    story: "We've been living apart for a year and a half and I want a divorce. He won't sign anything. Can I still get divorced?",
    expect: [{ source: "divorce-act", section: "8", phrase: "breakdown of their marriage" }],
  },
  {
    id: "urgent-family-motion",
    court: "family",
    stage: "urgent",
    story: "My ex is refusing to return our kids after his weekend and won't answer. I need the court to make him bring them back now.",
    expect: [{ source: "family-law-rules", section: "14", phrase: "MOTIONS FOR TEMPORARY ORDERS" }],
  },

  // ---------------------------------------------------------------- civil and commercial
  {
    id: "summary-judgment",
    court: "civil",
    stage: "already-started",
    story: "The other side's defence is obviously nonsense. Is there a way to get judgment without going through a whole trial?",
    expect: [{ source: "rules-of-civil-procedure", section: "20.04", phrase: "genuine issue requiring a trial" }],
  },
  {
    id: "contractor-holdback",
    court: "civil",
    story: "I'm a homeowner, my contractor's subcontractor says he wasn't paid and might put a lien on my house. Should I be holding money back?",
    expect: [{ source: "construction-act", section: "22", phrase: "holdback" }],
  },
  {
    id: "money-paid-by-mistake",
    court: "small-claims",
    story: "I e-transferred $3,500 to the wrong person by mistake, a typo in the email. He won't send it back and says it's his now.",
    expect: [{ source: "decision-garland", phrase: "juristic reason" }],
  },
  {
    id: "insurer-bad-faith",
    court: "civil",
    story: "My house burned down and the insurance company has refused to pay for two years, accusing me of arson with no evidence. The fire department said it was electrical.",
    expect: [
      { source: "decision-whiten", phrase: "punitive damages" },
      { source: "decision-fidler", phrase: "insur" },
    ],
  },
  {
    id: "business-partner-lied",
    court: "civil",
    story: "The company I supplied for ten years kept telling me the contract would be renewed while secretly lining up my replacement. Then they dropped me.",
    expect: [
      { source: "decision-bhasin", phrase: "honest performance" },
      { source: "decision-callow", phrase: "honest" },
    ],
  },
];
