/**
 * THE KIND OF DISPUTE A STORY SUPPORTS, IN ALL THREE COURTS: one shared reader, offered to tick
 * (owner, 30 Oct; rule 4 of the fact conversion).
 *
 * What it checks: storyAnswers.ts kindsFromStory -- the one reader every court uses, each with its own
 * cue table (Small Claims through intakeReview.ts suggestInitialAnswers, civil and Family through
 * civilIssuesFromStory / familyIssuesFromStory, which the questions one at a time and the review offer
 * as "From what you told us ... Is that right?") -- against fabricated stories, at least ten per court:
 * each kind the court offers, several phrasings of the same kind, and negative cases that must NOT get a
 * given suggestion (a truck merely parked outside is no vehicle dispute, "broke the lease" is not
 * property damage, a question or a "no" names nothing, a story naming no kind gets no suggestion).
 * And that each court reads through the same function (no court keeps its own copy of the reader).
 *
 * Failure it exists to catch: a story that names its kind asked from scratch, or offered a kind it
 * does not name (carry run 41137395354: Family "dividing the house" asked from scratch; Small Claims
 * "broke my dining table ... truck parked outside" offered a vehicle dispute; civil "a supplier never
 * delivered the machine I ordered" asked from scratch).
 *
 * Fabricated stories only. Run: npm run test:kind-from-story
 */
import { readFileSync } from "node:fs";
import { civilIssuesFromStory, familyIssuesFromStory } from "../../app/builder/_components/storyAnswers";
import { suggestInitialAnswers } from "../../src/lib/case-system/intakeReview";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

/** A story, the kind it must be offered (null: none), and kinds it must never be offered. */
type Case = { story: string; offered: string | null; never?: string[] };

const smallClaims = (story: string) =>
  suggestInitialAnswers({ version: 1, flowId: "00000000-0000-4000-8000-0000000000f1", courtPath: "small-claims", revision: "00000000-0000-4000-8000-0000000000f2", sections: { story: { text: story } } } as unknown as Checkpoint)["sc-orient-dispute-category"] ?? null;

const SMALL_CLAIMS: Case[] = [
  { story: "Synthetic: I hired a contractor to redo my kitchen and he left it half done.", offered: "Work or a service you paid for (e.g. a contractor)" },
  { story: "Synthetic: The roofer took my money and the roof still leaks.", offered: "Work or a service you paid for (e.g. a contractor)" },
  { story: "Synthetic: My landlord kept my deposit when I moved out.", offered: "A deposit that wasn't returned" },
  { story: "Synthetic: I lent my cousin $2,000 and she never paid it back.", offered: "A loan or debt" },
  { story: "Synthetic: I slipped on their icy steps and hurt my back.", offered: "A personal injury (a fall, an animal bite, or similar)" },
  { story: "Synthetic: My neighbour's dog bit my son in the park.", offered: "A personal injury (a fall, an animal bite, or similar)" },
  { story: "Synthetic: A former friend posted about me online saying I steal from customers.", offered: "Something said about you (defamation)" },
  { story: "Synthetic: A delivery truck rear-ended my car at a red light.", offered: "A vehicle-related dispute" },
  { story: "Synthetic: My car was damaged in their parking lot by a falling sign.", offered: "A vehicle-related dispute" },
  { story: "Synthetic: A moving company broke my dining table in May 2026. Their truck was parked outside.", offered: "Property damage", never: ["A vehicle-related dispute"] },
  { story: "Synthetic: The tenant smashed the front window and left.", offered: "Property damage" },
  { story: "Synthetic: I bought a sofa that fell apart in a week and the store refuses a refund.", offered: "A consumer purchase problem" },
  { story: "Synthetic: They signed an agreement to supply 40 chairs and sent 12.", offered: "A contract or agreement dispute" },
  { story: "Synthetic: I sent an invoice for my design work and it is still unpaid.", offered: "Unpaid money owed to you" },
  // Negatives.
  { story: "Synthetic: My landlord broke the lease and changed the locks.", offered: null, never: ["Property damage"] },
  { story: "Synthetic: My car broke down on the highway right after their repair shop returned it.", offered: "Work or a service you paid for (e.g. a contractor)", never: ["Property damage"] },
  { story: "Synthetic: The plumber's van was parked outside while he fixed the sink badly.", offered: "Work or a service you paid for (e.g. a contractor)", never: ["A vehicle-related dispute"] },
  { story: "Synthetic: I need some help understanding what to do next.", offered: null },
];

const CIVIL: Case[] = [
  { story: "Synthetic: a supplier never delivered the machine I ordered in April 2026.", offered: "contract" },
  { story: "Synthetic: We signed a contract for a warehouse lease and they backed out.", offered: "contract" },
  { story: "Synthetic: The builder abandoned the job in June and kept the money.", offered: "contract" },
  { story: "Synthetic: My former business partner owes me $80,000 from our last project.", offered: "debt" },
  { story: "Synthetic: Police officers pushed me to the ground during a protest.", offered: "police-conduct" },
  { story: "Synthetic: My Charter rights were breached when I was searched without a warrant.", offered: "charter" },
  { story: "Synthetic: A newspaper published a column that defamed me.", offered: "defamation" },
  { story: "Synthetic: I was refused an apartment because of my disability and that is discrimination.", offered: "human-rights" },
  { story: "Synthetic: The mall was negligent and never salted the walkway where I fell.", offered: "negligence" },
  // Never negligence read from an injury, never a professional from a doctor merely seen (verifyCharterRetest).
  { story: "Synthetic: I was injured when I slipped at the mall.", offered: null, never: ["negligence"] },
  { story: "Synthetic: I saw a doctor on June 5 and missed 2 weeks of work.", offered: null, never: ["professional-negligence"] },
  { story: "Synthetic: My lawyer missed the deadline to file my appeal.", offered: "professional-negligence" },
  { story: "Synthetic: I was fired without notice after eleven years.", offered: "employment" },
  { story: "Synthetic: The seller lied to us about the flooding in the basement.", offered: "fraud-misrepresentation" },
  { story: "Synthetic: My neighbour built his fence across the property line.", offered: "property" },
  { story: "Synthetic: My brother is the executor and will not share our mother's estate.", offered: "estate" },
  // Negatives.
  { story: "Synthetic: I bought a real estate listing service subscription.", offered: null, never: ["estate"] },
  { story: "Synthetic: Can I sue the police?", offered: null, never: ["police-conduct"] },
  { story: "Synthetic: I need help with my court case.", offered: null },
];

const FAMILY: Case[] = [
  { story: "Synthetic: I want a divorce after twelve years.", offered: "divorce" },
  { story: "Synthetic: We need to sell the house and split what is left.", offered: "sale-of-home" },
  { story: "Synthetic: He stopped paying child support in March.", offered: "child-support" },
  { story: "Synthetic: I am asking for spousal support while I retrain.", offered: "spousal-support" },
  { story: "Synthetic: We disagree about parenting time for our daughter.", offered: "parenting-time" },
  { story: "Synthetic: I want more time with the kids on weekends.", offered: "parenting-time" },
  { story: "Synthetic: I want custody of our son.", offered: "decision-making-responsibility" },
  { story: "Synthetic: We separated in May 2026 and cannot agree on dividing the house.", offered: "property-division" },
  { story: "Synthetic: I want a divorce and we need to split the house.", offered: "property-division" },
  { story: "Synthetic: We are arguing over the equalization payment.", offered: "property-division" },
  { story: "Synthetic: She wants to move to Calgary with the children.", offered: "relocation" },
  { story: "Synthetic: My husband and I want to adopt his daughter.", offered: "adoption" },
  // Negatives.
  { story: "Synthetic: Who keeps the house?", offered: null },
  { story: "Synthetic: We are not getting a divorce.", offered: null, never: ["divorce"] },
  { story: "Synthetic: We separated last year and I am not sure what comes next.", offered: null },
];

for (const item of SMALL_CLAIMS) {
  const got = smallClaims(item.story);
  check(`Small Claims: ${item.offered ? `offered "${item.offered}"` : "no suggestion"} -- ${item.story.slice(11, 70)}`, item.offered === null ? got === null : got === item.offered, String(got));
  for (const never of item.never ?? []) check(`Small Claims: never "${never}" -- ${item.story.slice(11, 70)}`, got !== never, String(got));
}
for (const [court, cases, read] of [["civil", CIVIL, civilIssuesFromStory], ["Family", FAMILY, familyIssuesFromStory]] as const) {
  for (const item of cases) {
    const got = read(item.story);
    check(`${court}: ${item.offered ? `offered "${item.offered}"` : "no suggestion"} -- ${item.story.slice(11, 70)}`, item.offered === null ? got === null : Boolean(got?.value.includes(item.offered) && got.quote.length > 0), JSON.stringify(got));
    for (const never of item.never ?? []) check(`${court}: never "${never}" -- ${item.story.slice(11, 70)}`, !(got?.value ?? []).includes(never), JSON.stringify(got));
  }
}
check("at least ten stories per court", SMALL_CLAIMS.length >= 10 && CIVIL.length >= 10 && FAMILY.length >= 10);

// One reader: every court reads through kindsFromStory, none keeps its own loop over a cue table.
const answers = readFileSync("app/builder/_components/storyAnswers.ts", "utf8");
const review = readFileSync("src/lib/case-system/intakeReview.ts", "utf8");
check("civil and Family read through kindsFromStory, and only one loop over a cue table exists", answers.includes("return kindsFromStory(story, FAMILY_KIND_CUES);") && answers.includes("return kindsFromStory(story, CIVIL_KIND_CUES);") && (answers.match(/for \(const \[value, words\] of /g) ?? []).length === 1);
check("Small Claims reads through kindsFromStory with its own cue table", /kindsFromStory\(story, SMALL_CLAIMS_KIND_CUES, \{ first: true \}\)/.test(review) && !/CATEGORY_CUES\.find/.test(review));

if (failures) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nKind from story: every court offers what its story supports, through one reader.");
