/**
 * The claim-type matcher works on prose a person would actually write.
 *
 * COSTS NOTHING. Pure string matching, no AI, no network.
 *
 * WHY. The matcher required a signal to appear VERBATIM. 250 of the 255
 * signals are multi-word phrases and only 5 are single words, so 19 of the 22
 * claim types could only match a user who happened to type an exact phrase
 * such as "spreading rumors that aren't true". Against the ten plainly-worded
 * stories below — one per claim type, written the way a person writes —
 * **0 of 10 matched, and none matched anything at all.**
 *
 * Nothing failed when that happened. The overview panel fell through to an
 * unsourced model-output fallback, which is where "Pattern of harassment"
 * came from on a defamation story about one custody argument. That fallback
 * is now removed, so a matcher miss shows as an empty list — visible, rather
 * than filled in with something invented.
 *
 * THE FLOOR THIS DEFENDS. A WRONG claim type is worse than no claim type: it
 * drives the evidence checklist, the court points, the common defences, and
 * the elements the Statement of Claim is assembled from. The match count is a
 * floor that must not fall, and the zero-wrong-matches check is the one that
 * matters most.
 *
 * Run: node --import tsx scripts/verification/verifyClaimTypeMatcher.ts
 */

import { pathToFileURL } from "node:url";

import { CLAIM_TYPES } from "../../src/lib/case-system/intake/claimTypes";
import { matchClaimType } from "../../src/lib/case-system/intake/claimTypeMatcher";

/** Plainly-worded stories, one per claim type, written the way a person writes. */
const STORIES: Array<{ expect: string; story: string }> = [
  { expect: "sc-claim-defamation-libel-slander", story: "During a custody argument my ex told her family and our daughter's school that I had been charged with fraud. None of it is true and I have lost work because of it." },
  { expect: "sc-claim-personal-loan-between-individuals", story: "I lent my cousin $6,000 in March 2024 so he could cover rent. He agreed in a text to pay it back by September. He has paid nothing and now will not answer." },
  { expect: "sc-claim-dog-bite-animal-injury", story: "My neighbour's dog got out of their yard and bit my leg while I was walking on the sidewalk. I needed stitches and missed two weeks of work." },
  { expect: "sc-claim-wrongful-dismissal", story: "I worked at the company for six years and was let go without notice or any severance. They said it was restructuring but hired someone into my role a month later." },
  { expect: "sc-claim-vehicle-repair-dispute", story: "I took my car to a garage for a brake job. They charged me $2,400, the brakes still grind, and they refuse to look at it again." },
  { expect: "sc-claim-consumer-cancellation-refund", story: "I cancelled a gym membership within the ten day window and they have kept charging my card for four months. They will not return my money." },
  { expect: "sc-claim-recovery-of-personal-property", story: "My former roommate still has my power tools and my grandmother's ring. He moved out in June and will not give them back." },
  { expect: "sc-claim-dishonoured-nsf-cheque", story: "A customer paid me with a cheque for $3,200 and it bounced. The bank returned it and he has not replaced the funds." },
  { expect: "sc-claim-contractor-damage", story: "A contractor doing my bathroom cracked the tile in the hallway and put a hole in the drywall. He says it was already like that." },
  { expect: "sc-claim-used-vehicle-nondisclosure", story: "I bought a used car privately. The seller said it had never been in a crash. The mechanic found frame repair and the report shows an accident in 2021." },
];

/**
 * The measured floor, not a target. It was 0 before the matcher was rewritten
 * and is 4 now. Raise it as the signal vocabulary improves; the remaining six
 * misses are a vocabulary gap, not an algorithm gap.
 */
const MINIMUM_MATCHES = 4;

let failures = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    console.log(`pass  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

function main(): void {
  let matched = 0;
  const wrong: string[] = [];

  for (const { expect, story } of STORIES) {
    const id = matchClaimType(story, CLAIM_TYPES)?.claimType.id ?? null;
    if (id === expect) matched += 1;
    else if (id !== null) wrong.push(`${expect} -> ${id}`);
  }

  check(
    `at least ${MINIMUM_MATCHES} of ${STORIES.length} plain stories match`,
    matched >= MINIMUM_MATCHES,
    `matched ${matched}`,
  );

  // The one that matters most. A miss is an empty list the user can see. A
  // wrong match is a wrong evidence checklist, wrong court points and wrong
  // draft elements, none of which announces itself.
  check("no story matches the WRONG claim type", wrong.length === 0, wrong.join("; "));

  check(
    "the walkthrough defamation story matches defamation",
    matchClaimType(STORIES[0].story, CLAIM_TYPES)?.claimType.id ===
      "sc-claim-defamation-libel-slander",
  );

  check("an empty story matches nothing", matchClaimType("", CLAIM_TYPES) === null);
  check(
    "unrelated prose matches nothing",
    matchClaimType("I would like to know what the weather is on Tuesday.", CLAIM_TYPES) === null,
  );

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirect) main();
