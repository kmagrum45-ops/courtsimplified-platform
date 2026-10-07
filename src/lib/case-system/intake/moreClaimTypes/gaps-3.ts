/**
 * Case types, batch "gaps-3" (small-claims): types first left out for want of saved law,
 * written once the law was saved (2026-10-07). Sources are recorded in
 * docs/sources/catalogue-verification/gaps-3.json and held by test:catalogue-verified.
 *
 *   sc-claim-minor-assault-or-battery -- Being hit or attacked by someone
 *   sc-claim-harassment-or-cyberbullying -- Harassment or cyberbullying
 *
 * Both were left out of sc-injury-2 / sc-other because nothing saved stated
 * what the civil claims require. Now saved and read for this batch:
 *   - Non-Marine Underwriters, Lloyd's of London v. Scalera, 2000 SCC 24 --
 *     battery and trespass to the person. The rules on what the plaintiff
 *     shows and on consent come from the reasons of McLachlin J. for four of
 *     the seven judges; the definition of "assault and battery" and the
 *     "punching, shooting, stabbing" passage come from the reasons of
 *     Iacobucci J. for the other three, and are labelled as such.
 *   - Merrifield v. Canada (Attorney General), 2019 ONCA 205 -- the Court of
 *     Appeal held the trial judge erred in finding a tort of harassment exists
 *     in Ontario, did not foreclose a properly conceived one in future, and
 *     named intentional infliction of mental suffering (IIMS) as an existing
 *     remedy. The harassment entry states exactly that, then lists the other
 *     saved routes (IIMS, intrusion upon seclusion from Jones v. Tsige,
 *     defamation from Grant v. Torstar, and the Human Rights Code for
 *     harassment at work or in housing on a protected ground).
 *
 * Deliberately left out: self-defence (nothing saved states it as a civil
 * defence); whether an online post is a "newspaper" or "broadcast" under the
 * Libel and Slander Act (nothing saved decides it, so its notice rules are
 * not described here); the Criminal Code offences, which are not this
 * court's business. Merrifield's discussion of IIMS arose in the employment
 * context; the entry says so.
 */

import type { ClaimType } from "../claimTypes";

const V = "2026-10-07";

const LIMITATIONS = "https://www.ontario.ca/laws/docs/02l24_e.doc";
const LIMITATIONS_FROM = "2024-12-04";
const CJA = "https://www.ontario.ca/laws/docs/90c43_e.doc";
const CJA_FROM = "2025-12-11";
const OREG_626 = "https://www.ontario.ca/laws/docs/000626_e.doc";
const HRC = "https://www.ontario.ca/laws/docs/90h19_e.doc";
const HRC_FROM = "2025-07-01";
const SC_SUING = "https://www.ontario.ca/page/suing-someone-small-claims-court";
const SC_GUIDE = "https://www.ontario.ca/document/guide-procedures-small-claims-court/making-claim";
const SUPPORTS = "https://www.ontario.ca/page/connect-supports-survivors-violence";

const SCALERA = "docs/sources/decisions/non-marine-underwriters-v-scalera-2000-SCC-24.html.txt";
const MERRIFIELD = "docs/sources/decisions/merrifield-v-canada-2019-ONCA-205.txt";
const JONES = "docs/sources/decisions/jones-v-tsige-2012-ONCA-32.txt";
const GRANT = "docs/sources/decisions/grant-v-torstar-2009-SCC-61.english.txt";

const SCALERA_NAME = "Non-Marine Underwriters, Lloyd's of London v. Scalera, 2000 SCC 24";
const SCALERA_CASE =
  "In Non-Marine Underwriters, Lloyd's of London v. Scalera, 2000 SCC 24, the Supreme Court of Canada";
const MERRIFIELD_CASE =
  "In Merrifield v. Canada (Attorney General), 2019 ONCA 205, the Court of Appeal for Ontario";

// ---------------------------------------------------------------------------
// Shared procedural notes.

const COURT_NOTE =
  "Which court, and where. Under s. 23(1)(a) of the Courts of Justice Act, the Small Claims Court has " +
  "jurisdiction in any action for the payment of money where the amount claimed does not exceed the " +
  "prescribed amount, not counting interest and costs; under s. 1(1) of O. Reg. 626/00, the maximum " +
  "amount of a claim in the Small Claims Court is $50,000. Ontario's guide to making a claim says a " +
  "Plaintiff's Claim (Form 7A) starts the action, and that it can be filed in the court for the area " +
  "where the event took place, or the area where the defendant (or any one of the defendants) lives or " +
  "carries on business, or at the court's place of sitting nearest to where the defendant lives or " +
  "carries on business. A claim can also be filed online.";

const LIMITATION_TEXT =
  "Time limit. Under s. 4 of the Limitations Act, 2002, unless the Act provides otherwise, a proceeding " +
  "cannot be started after the second anniversary of the day the claim was discovered. Under s. 5(1), a " +
  "claim is discovered on the earlier of the day the person first knew that the injury, loss or damage " +
  "had occurred, that it was caused or contributed to by an act or omission, that the act or omission " +
  "was that of the person the claim is against, and that a proceeding would be an appropriate means to " +
  "seek to remedy it -- and the day a reasonable person with their abilities and in their circumstances " +
  "first ought to have known those things. Under s. 5(2), a person is presumed to have known those " +
  "things on the day the act or omission took place, unless the contrary is proved.";

const ASSAULT_LIMITATION_NOTE =
  LIMITATION_TEXT +
  " Some assault claims have no time limit at all. Under s. 1, \"assault\" includes a battery. Under " +
  "s. 16(1)(h), there is no limitation period for a proceeding based on a sexual assault. Under " +
  "s. 16(1)(h.2), there is no limitation period for a proceeding based on an assault if, at the time, " +
  "the person with the claim was a minor, or the two people had an intimate relationship, or the person " +
  "with the claim was financially, emotionally, physically or otherwise dependent on the other person. " +
  "Under s. 16(1.1), these apply whenever the act occurred, regardless of the expiry of any previously " +
  "applicable limitation period.";

const SUPPORTS_NOTE =
  "Safety and support come first. Ontario's page on supports for survivors of violence says: if you are " +
  "in danger, call 911 or your local police immediately. If there is no immediate danger, free and " +
  "confidential helplines are available 24 hours a day, including the Victim Support Line, which gives " +
  "information and referrals for victims of crime across Ontario. The page also says a victim of sexual " +
  "assault living in Ontario may be eligible for up to 4 hours of free, confidential legal advice by " +
  "phone or video.";

const COURT = {
  note: COURT_NOTE,
  sourceUrl: CJA,
  verifiedAt: V,
  consolidationPeriod: CJA_FROM,
  alsoCites: [
    { sourceUrl: OREG_626, pinpoint: "O. Reg. 626/00, s. 1(1)" },
    { sourceUrl: SC_GUIDE, pinpoint: "Making a claim -- Plaintiff's claim; What Small Claims Court office you should file your claim in" },
  ],
};

// ---------------------------------------------------------------------------
// Shared evidence.

const INJURY_RECORDS = {
  name: "Records of the injury",
  why: "Shows what the injury was, when it was first treated and how long it has lasted.",
  examples: [
    "Emergency, hospital or clinic records",
    "Notes from a family doctor, counsellor or therapist",
    "Photos of visible injuries taken over time",
  ],
};

const LOSS_RECORDS = {
  name: "Records of what it cost",
  why: "Shows the money and other losses that followed.",
  examples: [
    "Receipts for treatment, medication and travel to appointments",
    "Pay stubs or an employer letter showing time missed from work",
    "Receipts for damaged clothing, glasses or a phone",
  ],
};

const CONDUCT_LOG = {
  name: "A record of what happened",
  why: "Shows each thing that was done or said, when, and by whom.",
  examples: [
    "A dated list of each incident, written as close to the time as possible",
    "Screenshots that show the date, the account name and the web address",
    "Saved texts, emails, voicemails or direct messages",
  ],
};

// ---------------------------------------------------------------------------
// Citations.

const CITE_SCALERA = (pinpoint: string) => ({ sourceName: SCALERA_NAME, officialUrl: SCALERA, verifiedAt: V, pinpoint });
const CITE_MERRIFIELD = (pinpoint: string) => ({
  sourceName: "Merrifield v. Canada (Attorney General), 2019 ONCA 205",
  officialUrl: MERRIFIELD,
  verifiedAt: V,
  pinpoint,
});
const CITE_LIM = (pinpoint: string) => ({
  sourceName: "Limitations Act, 2002, S.O. 2002, c. 24, Sched. B",
  officialUrl: LIMITATIONS,
  verifiedAt: V,
  pinpoint,
});
const CITE_CJA = (pinpoint: string) => ({
  sourceName: "Courts of Justice Act, R.S.O. 1990, c. C.43",
  officialUrl: CJA,
  verifiedAt: V,
  pinpoint,
});
const CITE_626 = { sourceName: "O. Reg. 626/00 (Small Claims Court jurisdiction)", officialUrl: OREG_626, verifiedAt: V, pinpoint: "s. 1(1)" };
const CITE_GUIDE = {
  sourceName: "Ontario.ca -- Guide to Procedures in Small Claims Court: Making a Claim",
  officialUrl: SC_GUIDE,
  verifiedAt: V,
  pinpoint: "Plaintiff's claim; What Small Claims Court office you should file your claim in",
};

export const TYPES_GAPS_3: ClaimType[] = [
  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-minor-assault-or-battery",
    name: "Being hit or attacked by someone",
    courtArea: "small-claims",
    broughtBy:
      "A person who was hit, pushed, grabbed, spat on or otherwise touched against their will by another " +
      "person, suing that person for the harm and what it cost.",
    typicalDefendantProfile: "individual",
    plaintiffElements: [
      {
        id: "direct-contact-batt",
        name: "The other person made direct physical contact with you by their own deliberate act",
        plainExplanation:
          SCALERA_CASE +
          " (reasons of McLachlin J. for four of the seven judges) said the tort of battery is a form of " +
          "trespass to the person and is aimed at protecting the personal autonomy of the individual: its " +
          "purpose is to recognize the right of each person to control his or her body and who touches it, " +
          "and to permit damages where this right is violated (para. 15). The settled rule requires the " +
          "plaintiff in a battery case to show only contact through a direct, intentional act of the " +
          "defendant (para. 7). Interference is direct if it is the immediate consequence of a force set in " +
          "motion by an act of the defendant (para. 8). It is not up to the plaintiff to prove that, in " +
          "addition to directly interfering with her body, the defendant was also at fault (para. 15). In " +
          "the same case, Iacobucci J. (for the other three judges) noted the Court's earlier definition of " +
          "assault and battery as causing another person to apprehend the infliction of immediate harmful " +
          "or offensive force on her person coupled with the actual infliction of that harmful or offensive " +
          "force (para. 96).",
        sourceUrl: SCALERA,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "What happened, and who did it",
            why: "Shows the contact, that it came from the other person's own act, and who that person is.",
            examples: [
              "Your own written account, made as soon as you could",
              "Names and contact details of people who saw it",
              "Video from a phone, doorbell or security camera",
            ],
          },
          {
            name: "Reports made at the time",
            why: "Shows when and how the incident was first reported.",
            examples: ["A police report or occurrence number", "An incident report from a store, school or workplace"],
          },
        ],
      },
      {
        id: "beyond-ordinary-contact-batt",
        name: "The contact was more than the ordinary contact of everyday life",
        plainExplanation:
          SCALERA_CASE +
          " (reasons of McLachlin J.) said not every physical contact constitutes a battery: the tort " +
          "requires contact \"plus\" something else, and the case law tends to support the view that the " +
          "\"plus\" refers merely to non-trivial contact, and generally does not require actual physical or " +
          "psychological injury (para. 16). Not every trivial contact is a battery; the classic example is " +
          "being jostled in a crowd (para. 19). The contact the cases have in mind is the inevitable contact " +
          "that goes with ordinary human activity, like brushing someone's hand while exchanging a gift, a " +
          "handshake, or being jostled in a crowd (para. 21). Iacobucci J. (for the other three judges) " +
          "said punching, shooting, stabbing, or otherwise attempting to injure another person is clearly " +
          "offensive, and we would not expect someone to consent to it (para. 101).",
        sourceUrl: SCALERA,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "What kind of contact it was",
            why: "Shows the contact was not the everyday kind of contact people expect in ordinary life.",
            examples: [
              "A description of the blow, push or grab, and where on your body",
              "What the person said or did just before and after",
              "Witness statements describing the contact",
            ],
          },
        ],
      },
      {
        id: "harm-and-loss-batt",
        name: "What the contact did to you, and what it cost",
        plainExplanation:
          SCALERA_CASE +
          " (reasons of McLachlin J.) said the case law generally does not require actual physical or " +
          "psychological injury for a battery (para. 16), and repeated the Court's earlier statement in " +
          "Reibl v. Hughes that the tort of battery does not require proof of causation (para. 6). " +
          "Iacobucci J. (for the other three judges) said that if a tort is intended, it will not matter " +
          "that the result was more harmful than the actor should, or even could have foreseen (para. 99). " +
          "This part of the checklist is about what the contact did to you -- the injury, the time off, the " +
          "costs -- so the amount claimed can be explained.",
        sourceUrl: SCALERA,
        verifiedAt: V,
        evidenceCategories: [INJURY_RECORDS, LOSS_RECORDS],
      },
    ],
    defendantConsiderations: [
      {
        id: "consent-or-excuse-batt",
        name: "The other person says you agreed to the contact, or that it was not their fault",
        plainExplanation:
          SCALERA_CASE +
          " (reasons of McLachlin J. for four of the seven judges) said that once the plaintiff shows direct " +
          "interference, the burden is then on the defendant to allege and prove his defence, and consent " +
          "is one such defence (para. 8). The settled rule places the onus on the defendant of showing " +
          "consent or lawful excuse (para. 7). A defendant can also exonerate himself by proving a lack of " +
          "intention or negligence (para. 10). If he can show that he acted with consent, the prima facie " +
          "violation is negated (para. 15). Iacobucci J. (for the other three judges) said that in all " +
          "cases one must look to the context to understand the role of consent, giving the example of " +
          "certain sports, where physical contact is expected and even encouraged (para. 104).",
        whenThisComesUp:
          "When the Defence says you agreed to the contact -- for example, in a sport or game -- or that it " +
          "happened by accident and without carelessness.",
        sourceUrl: SCALERA,
        verifiedAt: V,
      },
      {
        id: "everyday-contact-batt",
        name: "The other person says it was only the ordinary contact of everyday life",
        plainExplanation:
          SCALERA_CASE +
          " (reasons of McLachlin J.) described two explanations for why trivial contact, such as being " +
          "jostled in a crowd, is not a battery: implied consent, or a general exception for physical " +
          "contact which is generally acceptable in the ordinary conduct of everyday life (para. 19). Both " +
          "refer to the sort of everyday physical contact which one must be expected to tolerate, even if " +
          "one does not actually consent to it (para. 20).",
        whenThisComesUp:
          "When the Defence says the contact was a brush, a bump in a crowd, or a touch of the kind that " +
          "happens in ordinary life.",
        sourceUrl: SCALERA,
        verifiedAt: V,
      },
    ],
    applicableDefenceConceptIds: [
      "defence-limitation-period-expired",
      "defence-waiver-release-assumption-of-risk",
      "defence-set-off-or-counterclaim",
    ],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs", "sc-remedy-outside-jurisdiction"],
    proceduralNotes: [
      {
        note: SUPPORTS_NOTE,
        sourceUrl: SUPPORTS,
        verifiedAt: V,
      },
      {
        ...COURT,
        alsoCites: [
          ...COURT.alsoCites,
          { sourceUrl: SC_SUING, pinpoint: "Small claims court: suing someone -- What you can sue for" },
        ],
        note:
          COURT_NOTE +
          " Ontario's page on suing someone in Small Claims Court lists personal injuries among the claims " +
          "for damages that can be brought there.",
      },
      {
        note: ASSAULT_LIMITATION_NOTE,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_FROM,
      },
    ],
    signals: [
      "he hit me",
      "she punched me",
      "someone attacked me",
      "I was assaulted",
      "pushed me to the ground",
      "grabbed me",
      "spat on me",
      "beat me up",
      "battery",
      "slapped me",
      "got into a fight and was hurt",
    ],
    citations: [
      CITE_SCALERA("paras. 6-8, 10, 15-16, 19-21 (McLachlin J.); paras. 96, 99, 101, 104 (Iacobucci J.)"),
      CITE_LIM("ss. 1 (\"assault\"), 4, 5(1)-(2), 16(1)(h), (h.2), 16(1.1)"),
      CITE_CJA("s. 23(1)"),
      CITE_626,
      CITE_GUIDE,
      {
        sourceName: "Ontario.ca -- Connect with supports for survivors of violence",
        officialUrl: SUPPORTS,
        verifiedAt: V,
        pinpoint: "Talk to someone; Helplines; Legal advice",
      },
    ],
    reviewedAt: null,
    status: "draft",
  },

  // ---------------------------------------------------------------------------
  {
    id: "sc-claim-harassment-or-cyberbullying",
    name: "Harassment or cyberbullying",
    courtArea: "small-claims",
    broughtBy:
      "A person who has been targeted again and again -- in person, by messages, or online through posts, " +
      "fake accounts or shared private information -- suing the person responsible for the harm it caused.",
    typicalDefendantProfile: "either",
    plaintiffElements: [
      {
        id: "recognized-claim-har",
        name: "Which recognized claim the conduct fits -- Ontario has not recognized a separate claim called \"harassment\"",
        plainExplanation:
          MERRIFIELD_CASE +
          " was the first Canadian appeal court asked whether a common law tort of harassment exists " +
          "(para. 19). It held that the trial judge erred in concluding that the tort of harassment exists " +
          "in Ontario, and said it was not persuaded that the tort should be recognized (para. 105). It also " +
          "said it did not foreclose the development of a properly conceived tort of harassment that might " +
          "apply in appropriate contexts (para. 53), and that there are legal remedies available to redress " +
          "conduct that is alleged to constitute harassment -- the tort of intentional infliction of mental " +
          "suffering is one of them (para. 42). The rest of this checklist sets out that claim and the other " +
          "recognized claims in the saved decisions that can cover conduct of this kind: an intrusion into " +
          "private affairs, and untrue statements posted or published about a person.",
        sourceUrl: MERRIFIELD,
        verifiedAt: V,
        evidenceCategories: [
          CONDUCT_LOG,
          {
            name: "Who is behind it",
            why: "Shows which person or business the claim is against.",
            examples: [
              "Account names, profile links and phone numbers used",
              "Messages where the person names themselves or admits it",
              "Names of people who saw or received the messages or posts",
            ],
          },
        ],
      },
      {
        id: "mental-suffering-har",
        name: "Intentional infliction of mental suffering: flagrant conduct, meant to harm, that made you ill",
        plainExplanation:
          MERRIFIELD_CASE +
          " said the tort of intentional infliction of mental suffering is well established in Ontario and " +
          "may be asserted as a basis for claiming damages for mental suffering in the employment context " +
          "(para. 44). Its test is met where the plaintiff establishes conduct that is (1) flagrant and " +
          "outrageous, (2) calculated to produce harm, and which (3) results in visible and provable illness " +
          "(para. 45). It is an intentional tort, requiring an intention to cause the kind of harm that " +
          "occurred or knowledge that it was almost certain to occur, and that is a purely subjective test " +
          "(para. 47).",
        sourceUrl: MERRIFIELD,
        verifiedAt: V,
        evidenceCategories: [
          CONDUCT_LOG,
          {
            name: "What the person meant or knew",
            why: "The test asks whether the person meant to cause this kind of harm or knew it was almost certain.",
            examples: [
              "Messages saying what they wanted to happen to you",
              "Carrying on after being asked to stop",
              "Messages showing they knew how it was affecting you",
            ],
          },
          {
            name: "The illness",
            why: "The test needs a visible and provable illness.",
            examples: [
              "Records from a doctor, psychologist or counsellor",
              "A diagnosis and treatment plan",
              "Time off work or school on medical advice",
            ],
          },
        ],
      },
      {
        id: "intrusion-har",
        name: "Intrusion upon seclusion: someone deliberately got into your private affairs",
        plainExplanation:
          "In Jones v. Tsige, 2012 ONCA 32, the Court of Appeal for Ontario said the key features of the " +
          "action for intrusion upon seclusion are, first, that the defendant's conduct must be " +
          "intentional, which includes reckless; second, that the defendant must have invaded, without " +
          "lawful justification, the plaintiff's private affairs or concerns; and third, that a reasonable " +
          "person would regard the invasion as highly offensive causing distress, humiliation or anguish. " +
          "Proof of harm to a recognized economic interest is not an element (para. 71). It is only " +
          "intrusions into matters such as one's financial or health records, sexual practices and " +
          "orientation, employment, diary or private correspondence that, viewed objectively, can be " +
          "described as highly offensive (para. 72). Where there is no money loss, the Court fixed the range " +
          "of damages at up to $20,000 (para. 87).",
        sourceUrl: JONES,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "What was got into, and how",
            why: "Shows what private information or accounts were reached, and that it was done on purpose.",
            examples: [
              "Login alerts or account activity showing access you did not give",
              "Messages showing the person knew private details",
              "A letter from a bank, clinic or employer about the access",
            ],
          },
          {
            name: "How it affected you",
            why: "The test asks whether a reasonable person would find it highly offensive, causing distress.",
            examples: ["Notes of how it affected sleep, work or relationships", "Any counselling or doctor's records"],
          },
        ],
      },
      {
        id: "untrue-posts-har",
        name: "Defamation: untrue things posted or said about you to others",
        plainExplanation:
          "In Grant v. Torstar Corp., 2009 SCC 61, the Supreme Court of Canada said a plaintiff in a " +
          "defamation action is required to prove three things: that the words were defamatory, in the sense " +
          "that they would tend to lower the plaintiff's reputation in the eyes of a reasonable person; that " +
          "the words in fact referred to the plaintiff; and that they were published, meaning communicated " +
          "to at least one person other than the plaintiff. If these elements are established on a balance " +
          "of probabilities, falsity and damage are presumed (para. 28).",
        sourceUrl: GRANT,
        verifiedAt: V,
        evidenceCategories: [
          {
            name: "The exact words or images",
            why: "Shows what was posted or said, where and when.",
            examples: ["Screenshots showing the date, account and web address", "A saved copy of the page or group chat"],
          },
          {
            name: "Who saw them",
            why: "Shows the words reached people other than you.",
            examples: ["Likes, shares, comments or view counts", "Messages from people who saw it"],
          },
        ],
      },
    ],
    defendantConsiderations: [
      {
        id: "no-intent-har",
        name: "The other person says they did not mean to cause harm",
        plainExplanation:
          MERRIFIELD_CASE +
          " said intentional infliction of mental suffering is an intentional tort, requiring an intention " +
          "to cause the kind of harm that occurred or knowledge that it was almost certain to occur; this is " +
          "a purely subjective test (para. 47). The test is met where the plaintiff establishes conduct " +
          "that is flagrant and outrageous, calculated to produce harm, and which results in visible and " +
          "provable illness (para. 45).",
        whenThisComesUp: "When the Defence says the messages or posts were a joke, venting, or not aimed at causing harm.",
        sourceUrl: MERRIFIELD,
        verifiedAt: V,
      },
      {
        id: "truth-har",
        name: "The other person says what they posted was true",
        plainExplanation:
          "In Grant v. Torstar Corp., 2009 SCC 61, the Supreme Court of Canada said that if the plaintiff " +
          "proves the required elements, the onus then shifts to the defendant to advance a defence " +
          "(para. 29). Where statements of fact are at issue, usually only two defences are available: that " +
          "the statement was substantially true (justification), and that it was made in a protected " +
          "context (privilege) (para. 32). For justification, a defendant must adduce evidence showing that " +
          "the statement was substantially true (para. 33).",
        whenThisComesUp: "When the Defence says the posts or messages stated facts that are true.",
        sourceUrl: GRANT,
        verifiedAt: V,
      },
      {
        id: "public-interest-motion-har",
        name: "The other person asks the court to dismiss the claim as being about public interest expression",
        plainExplanation:
          "Under s. 137.1(3) of the Courts of Justice Act, on motion by a person against whom a proceeding " +
          "is brought, a judge shall, subject to s. 137.1(4), dismiss the proceeding if the person satisfies " +
          "the judge that the proceeding arises from an expression made by the person that relates to a " +
          "matter of public interest. Under s. 137.1(4), a judge shall not dismiss it if the responding " +
          "party satisfies the judge that there are grounds to believe the proceeding has substantial merit " +
          "and the moving party has no valid defence, and that the harm likely to be or have been suffered by " +
          "the responding party as a result of the expression is sufficiently serious that the public interest in permitting the " +
          "proceeding to continue outweighs the public interest in protecting that expression. Under " +
          "s. 137.1(7), if a judge dismisses a proceeding under the section, the moving party is entitled " +
          "to costs on the motion and in the proceeding on a full indemnity basis, unless the judge " +
          "determines that such an award is not appropriate.",
        whenThisComesUp:
          "When the claim is about posts or comments and the person sued brings a motion saying they were " +
          "about a matter of public interest.",
        sourceUrl: CJA,
        verifiedAt: V,
        consolidationPeriod: CJA_FROM,
      },
    ],
    applicableDefenceConceptIds: ["defence-limitation-period-expired"],
    remedies: ["sc-remedy-monetary-judgment", "sc-remedy-interest-and-costs", "sc-remedy-outside-jurisdiction"],
    proceduralNotes: [
      {
        note:
          "Harassment at work or where you live, because of a protected ground, can go to the Human Rights " +
          "Tribunal of Ontario. Under s. 10(1) of the Human Rights Code, \"harassment\" means engaging in a " +
          "course of vexatious comment or conduct that is known or ought reasonably to be known to be " +
          "unwelcome. Under s. 2(2), a person who occupies accommodation has a right to freedom from " +
          "harassment by the landlord, the landlord's agent or an occupant of the same building because of " +
          "listed grounds such as race, creed, disability or age; under s. 5(2), an employee has a right to " +
          "freedom from harassment in the workplace by the employer, its agent or another employee because " +
          "of listed grounds; and s. 7(1) and (2) cover harassment because of sex, sexual orientation, " +
          "gender identity or gender expression in those places. Under s. 34(1), a person who believes " +
          "these rights were infringed may apply to the Tribunal within one year after the incident, or " +
          "after the last incident in a series; under s. 34(2), a later application may be allowed if the " +
          "Tribunal is satisfied the delay was in good faith and causes no substantial prejudice. Under " +
          "s. 46.1, a court in a civil proceeding may order compensation for an infringement of these " +
          "rights, but a person cannot start a court action based solely on such an infringement.",
        sourceUrl: HRC,
        verifiedAt: V,
        consolidationPeriod: HRC_FROM,
      },
      COURT,
      {
        note: LIMITATION_TEXT,
        sourceUrl: LIMITATIONS,
        verifiedAt: V,
        consolidationPeriod: LIMITATIONS_FROM,
      },
    ],
    signals: [
      "harassing me",
      "cyberbullying",
      "won't stop messaging me",
      "bullying me online",
      "harassment",
      "fake account about me",
      "keeps posting about me",
      "threatening messages",
      "online harassment",
      "stalking me online",
      "hacked my account and posted",
    ],
    citations: [
      CITE_MERRIFIELD("paras. 19, 42, 44-45, 47, 53, 105"),
      {
        sourceName: "Jones v. Tsige, 2012 ONCA 32",
        officialUrl: JONES,
        verifiedAt: V,
        pinpoint: "paras. 71-72, 87: intrusion upon seclusion and its damages",
      },
      {
        sourceName: "Grant v. Torstar Corp., 2009 SCC 61",
        officialUrl: GRANT,
        verifiedAt: V,
        pinpoint: "paras. 28-29, 32-33: elements of defamation; justification and privilege",
      },
      {
        sourceName: "Human Rights Code, R.S.O. 1990, c. H.19",
        officialUrl: HRC,
        verifiedAt: V,
        pinpoint: "ss. 2(2), 5(2), 7(1)-(2), 10(1) (\"harassment\"), 34(1)-(2), 46.1",
      },
      CITE_CJA("ss. 23(1), 137.1(3), (4), (7)"),
      CITE_626,
      CITE_GUIDE,
      CITE_LIM("ss. 4, 5(1)-(2)"),
    ],
    reviewedAt: null,
    status: "draft",
  },
];
