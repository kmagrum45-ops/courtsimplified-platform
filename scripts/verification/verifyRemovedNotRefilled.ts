/**
 * A FACT THE PERSON REMOVED IS NEVER REFILLED FROM THE STORY ON THE CASE PAGE (item 3, 6 Nov 2026).
 *
 * Founder's Chrome check of #543 (5 Nov), steps 5 and 6: in Civil and Family the other party's name was removed
 * on the review and confirmed; every screen showed it removed except the case page's "What we have so far",
 * which showed "The other party / Your neighbour (Paul Brown) (from your story)". Cause: the case page lists
 * from the story any fact with no answer (storyLines.ts), and a removal leaves the fact unanswered and marked
 * removed (caseFile.ts applyOne), a mark storyLines did not read. The amount line had the same gap.
 *
 * What this asserts, with no browser, model or database, in all three courts:
 *   1. The other party, removed, is not listed from the story (Small Claims, civil, Family).
 *   2. The amount, removed, is not listed from the story (Small Claims and civil, the claimant's side; the
 *      responding side's "The claim against you" too).
 *   3. The property holds both ways: the same facts never answered, and not removed, are still listed from the
 *      story, so this cannot pass by listing nothing from the story.
 *
 * What failure it catches: a removed answer coming back on the case page in the story's words.
 *
 * Run: npm run test:removed-not-refilled
 */
import assert from "node:assert/strict";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";
import { caseFileOf } from "../../src/lib/case-system/caseFile/caseFile";
import { storyLines } from "../../src/lib/case-system/caseFile/storyLines";

const STORIES = {
  "small-claims": "I hired Test Decks Ltd. in March 2026 to build a deck for $8,000. I paid $2,000 and $6,000 is still owed.",
  civil: "My neighbour Paul Brown's contractor damaged the foundation of my house on June 3, 2025 while digging next door. Repairs are quoted at $80,000 and Paul Brown refuses to pay.",
  family: "My ex-husband Mark Lee and I separated on January 10, 2025. Our son lives with me and Mark Lee pays no child support.",
} as const;
const RESPONDING = "Sam Taylor is suing me in Small Claims Court for $2,650. I was served with the claim last week.";

function checkpoint(court: keyof typeof STORIES, story: string, removed: string[]): Checkpoint {
  const changes = Object.fromEntries(removed.map((fact, index) => [fact, { state: "removed", at: "2026-11-05T21:30:00.000Z", seq: index + 1 }]));
  return { version: 1, flowId: "11111111-1111-4111-8111-111111111111", courtPath: court, revision: "22222222-2222-4222-8222-222222222222",
    sections: { story: { text: story, location: { province: "Ontario", city: "Ottawa" } }, builder: {}, ...(removed.length ? { caseFile: { changes } } : {}) } } as unknown as Checkpoint;
}
const listed = (court: keyof typeof STORIES, story: string, removed: string[], responding = false) =>
  storyLines(story, caseFileOf(checkpoint(court, story, removed)), responding).map((line) => line.fact);

let failures = 0;
function check(name: string, run: () => void) {
  try { run(); console.log(`PASS   ${name}`); } catch (error) { failures += 1; console.log(`FAIL   ${name}\n       ${error instanceof Error ? error.message : String(error)}`); }
}

for (const court of ["small-claims", "civil", "family"] as const) {
  check(`${court}: the other party, never answered, is listed from the story`, () => {
    assert(listed(court, STORIES[court], []).includes("otherParty"), "the story's other party is not listed when nothing was answered");
  });
  check(`${court}: the other party, removed, is not refilled from the story`, () => {
    assert(!listed(court, STORIES[court], ["otherParty"]).includes("otherParty"), "the removed other party came back from the story");
  });
}
for (const court of ["small-claims", "civil"] as const) {
  check(`${court}: the amount, never answered, is listed from the story`, () => {
    assert(listed(court, STORIES[court], []).includes("amount"), "the story's amount is not listed when nothing was answered");
  });
  check(`${court}: the amount, removed, is not refilled from the story`, () => {
    assert(!listed(court, STORIES[court], ["amount"]).includes("amount"), "the removed amount came back from the story");
  });
}
check("small-claims, responding: the claim against them, never answered, is listed from the story", () => {
  assert(listed("small-claims", RESPONDING, [], true).includes("amountAgainst"), "the claim against them is not listed when nothing was answered");
});
check("small-claims, responding: the claim against them, removed, is not refilled from the story", () => {
  assert(!listed("small-claims", RESPONDING, ["amount"], true).includes("amountAgainst"), "the removed amount came back as the claim against them");
});

console.log(failures ? `\n${failures} check(s) failed.` : "\nA removed fact is never refilled from the story on the case page; an unanswered one still is.");
process.exit(failures ? 1 : 0);
