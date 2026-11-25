/**
 * THE JOURNEY MATRIX'S STORIES (site owner, Round 6, 25 Nov 2026): one for every starting point of the stage map
 * (stage-map/stageSequence.ts STARTING_POINTS), each in its court and side, plus Chrome's two stories from its test of
 * #563 word for word. Every story is made up; every name in it is listed in `names` (never to reach the AI as typed:
 * the recorder refuses to send a prompt holding one, aiFixtures.ts), and every fact the story states is listed in
 * `facts` (plain words), each to be offered once from the story (check 6).
 *
 * test:matrix-stories checks that every starting point has exactly one story here, in a court and side that fit it,
 * and that each story's listed names and facts appear in its own words.
 *
 * `situation`: how the person answers the start ("Where are you with this?"), as harness/situation.ts takes it.
 */
import type { SituationAnswers } from "../harness/situation";
import type { MatrixStory } from "./matrixChecks";

export type MatrixStoryWithStart = MatrixStory & { situation: SituationAnswers };

const starting = (court: "small-claims" | "civil" | "family"): SituationAnswers => ({ where: "starting", filed: "nothing", court });
const served = (court: "small-claims" | "civil" | "family", papers: string, receivedOn: string): SituationAnswers => ({ where: "served", papers, receivedOn, court });
/** A case already going: who started it (the person, or the other side, whose papers are then "not sure" and the day unknown). */
const going = (court: "small-claims" | "civil" | "family", stage: string, started: "me" | "them" = "me"): SituationAnswers => ({ where: "going", started, stage, court, ...(started === "them" ? { papers: "not-sure", receivedOn: "unknown" } : {}) });

export const MATRIX_STORIES: MatrixStoryWithStart[] = [
  // Chrome's test of #563 (25 Nov 2026), word for word.
  {
    id: "chrome-kitchen", court: "small-claims", side: "plaintiff", startingPoint: "chrome", city: "Ottawa", nothingFiled: true, situation: starting("small-claims"),
    text: "I hired TEST Fakebuild Contracting Inc. to renovate my kitchen in Ottawa. In March 2026 I paid them a $12,500 deposit by e-transfer. They never started the work and stopped answering my calls and emails. On April 20, 2026 I sent them a demand letter by email asking for the deposit back within 14 days, and they never replied. I want my $12,500 deposit back, plus interest and my court costs.",
    facts: { otherParty: "TEST Fakebuild Contracting Inc.", amount: "12,500", whenHappened: "March 2026", wants: "deposit back", paymentHistory: "12,500 deposit by e-transfer", settlementEfforts: "demand letter", agreementTerms: "renovate my kitchen" },
    names: ["TEST Fakebuild Contracting Inc."],
  },
  {
    id: "chrome-alex", court: "small-claims", side: "plaintiff", startingPoint: "chrome", city: "Ottawa", nothingFiled: true, situation: starting("small-claims"),
    text: "In January 2026 I lent my friend Alex $2,000 so he could fix his car. He promised to pay me back by the end of March 2026. He has not paid back anything and now he ignores my texts. I want my $2,000 back.",
    facts: { otherParty: "Alex", amount: "2,000", whenHappened: "January 2026", wants: "$2,000 back" },
    names: ["Alex"],
  },
  // Small Claims.
  {
    id: "sc-deciding-to-sue", court: "small-claims", side: "plaintiff", startingPoint: "before-filing:deciding-whether-to-sue", city: "Kingston", nothingFiled: true, situation: starting("small-claims"),
    text: "In May 2026 I paid Testfix Appliance Repair Ltd. $1,850 to fix my fridge. It broke again two days later and they refuse to come back. I want my $1,850 back.",
    facts: { otherParty: "Testfix Appliance Repair Ltd.", amount: "1,850", whenHappened: "May 2026", wants: "$1,850 back" },
    names: ["Testfix Appliance Repair Ltd."],
  },
  {
    id: "sc-served-defendant", court: "small-claims", side: "defendant", startingPoint: "defendant:served-defence-period-running", city: "Kingston", nothingFiled: false, situation: served("small-claims", "small-claims-7A", "2026-11-10"),
    text: "On November 10, 2026 I was served with a Plaintiff's Claim. My former landlord, Robin Testlandlord, says I owe $3,200 for damage to the apartment. I left it clean and have photos.",
    facts: { otherParty: "Robin Testlandlord", amount: "3,200", servedDate: "November 10, 2026" },
    names: ["Robin Testlandlord"],
  },
  {
    id: "sc-wrong-place", court: "small-claims", side: "plaintiff", startingPoint: "both:filed-in-wrong-place", city: "Kingston", nothingFiled: false, situation: going("small-claims", "both:filed-in-wrong-place"),
    text: "I filed a claim against Testcar Sales Inc. for $4,000 in Ottawa, but the court office told me it should have been filed in Kingston, where the car was sold.",
    facts: { otherParty: "Testcar Sales Inc.", amount: "4,000" },
    names: ["Testcar Sales Inc."],
  },
  // Civil.
  {
    id: "civil-deciding-to-sue", court: "civil", side: "plaintiff", startingPoint: "civil:before-filing:deciding-whether-to-sue", city: "Toronto", nothingFiled: true, situation: starting("civil"),
    text: "In February 2026 I lent my former business partner Dana Testpartner $90,000. She signed a promissory note to repay it by August 1, 2026 and has paid nothing.",
    facts: { otherParty: "Dana Testpartner", amount: "90,000", whenHappened: "February 2026" },
    names: ["Dana Testpartner"],
  },
  {
    id: "civil-served-defendant", court: "civil", side: "defendant", startingPoint: "civil:defendant:served-defence-period-running", city: "Toronto", nothingFiled: false, situation: served("civil", "civil-14A", "2026-11-05"),
    text: "On November 5, 2026 I was served with a Statement of Claim. Testsupply Corp. says I owe $140,000 under a guarantee I signed for my old company.",
    facts: { otherParty: "Testsupply Corp.", amount: "140,000", servedDate: "November 5, 2026" },
    names: ["Testsupply Corp."],
  },
  {
    id: "civil-third-party", court: "civil", side: "defendant", startingPoint: "civil:defendant:served-with-third-party-claim", city: "Toronto", nothingFiled: false, situation: going("civil", "civil:defendant:served-with-third-party-claim", "them"),
    text: "I was served with a third party claim on October 30, 2026. Testbuild Ltd. was sued by a homeowner and now says my plumbing company caused the flood.",
    facts: { otherParty: "Testbuild Ltd." },
    names: ["Testbuild Ltd."],
  },
  {
    id: "civil-counterclaim-new-party", court: "civil", side: "defendant", startingPoint: "civil:defendant:served-with-counterclaim-as-new-party", city: "Toronto", nothingFiled: false, situation: going("civil", "civil:defendant:served-with-counterclaim-as-new-party", "them"),
    text: "I was not part of the lawsuit, but on November 2, 2026 I was served with a counterclaim naming me as a new party. Jordan Testowner says I helped breach a supply contract.",
    facts: { otherParty: "Jordan Testowner" },
    names: ["Jordan Testowner"],
  },
  {
    id: "civil-case-management", court: "civil", side: "plaintiff", startingPoint: "civil:both:case-management", city: "Toronto", nothingFiled: false, situation: going("civil", "civil:both:case-management"),
    text: "My action against Testmedia Inc. for $250,000 was assigned to case management by a court order in October 2026.",
    facts: { otherParty: "Testmedia Inc.", amount: "250,000" },
    names: ["Testmedia Inc."],
  },
  {
    id: "civil-lawyer-removed", court: "civil", side: "plaintiff", startingPoint: "civil:both:lawyer-removed-from-record", city: "Toronto", nothingFiled: false, situation: going("civil", "civil:both:lawyer-removed-from-record"),
    text: "My lawyer was removed from the record in my action against Testcorp Holdings Ltd. in November 2026, and now I have to continue on my own.",
    facts: { otherParty: "Testcorp Holdings Ltd." },
    names: ["Testcorp Holdings Ltd."],
  },
  {
    id: "civil-lien-on-title", court: "civil", side: "defendant", startingPoint: "civil:defendant:lien-registered-on-title", city: "Ottawa", nothingFiled: false, situation: going("civil", "civil:defendant:lien-registered-on-title", "them"),
    text: "Testroof Contracting Inc. registered a claim for lien of $38,000 on the title of my house on October 15, 2026. I say the roof was never finished.",
    facts: { otherParty: "Testroof Contracting Inc.", amount: "38,000" },
    names: ["Testroof Contracting Inc."],
  },
  {
    id: "civil-lien-claimant", court: "civil", side: "plaintiff", startingPoint: "civil:plaintiff:lien-claimant", city: "Ottawa", nothingFiled: true, situation: going("civil", "civil:plaintiff:lien-claimant"),
    text: "I am a drywall contractor. I finished work on Sam Testhome's basement on October 1, 2026 and was never paid the $27,500 invoice.",
    facts: { otherParty: "Sam Testhome", amount: "27,500", whenHappened: "October 1, 2026" },
    names: ["Sam Testhome"],
  },
  // Family.
  {
    id: "family-starting", court: "family", side: "applicant", startingPoint: "family:before-filing:deciding-where-to-start", city: "Ottawa", nothingFiled: true, situation: starting("family"),
    text: "Taylor Testparent and I separated in June 2026 after living together for six years. We were never married. Our son is 5 and lives with me. I want a parenting schedule and child support.",
    facts: { otherParty: "Taylor Testparent", wants: "parenting schedule" },
    names: ["Taylor Testparent"],
  },
  {
    id: "family-served-respondent", court: "family", side: "respondent", startingPoint: "family:respondent:served-time-to-answer-running", city: "Ottawa", nothingFiled: false, situation: served("family", "family-8", "2026-11-08"),
    text: "On November 8, 2026 I was served with an Application by my ex, Morgan Testex. Morgan wants our daughter to live with her full time.",
    facts: { otherParty: "Morgan Testex", servedDate: "November 8, 2026" },
    names: ["Morgan Testex"],
  },
  {
    id: "family-motion-to-change", court: "family", side: "respondent", startingPoint: "family:both:served-with-motion-to-change", city: "Ottawa", nothingFiled: false, situation: going("family", "family:both:served-with-motion-to-change", "them"),
    text: "I was served with a motion to change the child support order on November 3, 2026. My ex, Casey Testformer, says my income went up.",
    facts: { otherParty: "Casey Testformer" },
    names: ["Casey Testformer"],
  },
];
