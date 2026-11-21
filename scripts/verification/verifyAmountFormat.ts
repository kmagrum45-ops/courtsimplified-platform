/**
 * AN AMOUNT IS SHOWN THE SAME WAY EVERYWHERE (Chrome check of #550, finding 2.6; site owner, 14 Nov 2026).
 *
 * Chrome's tree story ("I got a quote for $1500") showed "$1,500.00" on the case page but "$1500" in the chat's offer,
 * the chat's summary, the review and the Plaintiff's Claim draft: the story's raw text reached every screen that did
 * not go through the site's one amount formatter (format/recordedAmount.ts formatRecordedAmount, "$1,500.00", the
 * format the case page, the review's held lines (caseFile.ts slotText) and the analysis already use).
 *
 * What it asserts, with no browser, model or database:
 *   1. every offer the chat makes for the amount (the AI's own proposal and the one read from the story) shows it as
 *      "$1,500.00" (statedProposals.ts withStatedProposals, the one function every chat offer goes through);
 *   2. the chat's "Confirmed from the story" summary shows a held amount the same way (proposalCard.ts answerWords);
 *   3. the Plaintiff's Claim draft says "The Plaintiff claims $1,500.00." (claimDraftEngine.ts);
 *   4. an amount that is not a plain sum ("about $500 plus storage") is shown as the person wrote it, never changed.
 *
 * WHAT FAILURE THIS CATCHES: a screen that shows the story's raw amount ("$1500") where the rest of the site shows
 * "$1,500.00".
 *
 * Run: npm run test:amount-format
 */
import assert from "node:assert/strict";
import { withStatedProposals } from "../../src/lib/case-system/intake/statedProposals";
import { QUESTION_BANK } from "../../src/lib/case-system/intake/questionBank";
import { draftSmallClaimsPlaintiffClaim } from "../../src/lib/case-system/claimDraftEngine";

type Card = { answerWords?: (questionId: string, value: unknown) => string };

const STORY = "My neighbour cut down my maple tree on October 4, 2026. I got a quote for $1500 to do the work and supply the tree.";

async function main() {
  const card = await import("../../app/builder/_components/proposalCard").catch(() => ({})) as Card;
  let failed = 0;
  const check = (name: string, run: () => void) => { try { run(); console.log(`PASS  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n")[0]}`); } };
  const amountQuestion = QUESTION_BANK.find((question) => question.id === "sc-amount-claimed")!;

  check("1a. the amount offer read from the story shows $1,500.00", () => {
    const offers = withStatedProposals(STORY, [amountQuestion], []);
    assert.equal(offers.find((offer) => offer.questionId === "sc-amount-claimed")?.answer, "$1,500.00");
  });

  check("1b. the AI's own amount proposal shows $1,500.00", () => {
    const offers = withStatedProposals(STORY, [amountQuestion], [{ questionId: "sc-amount-claimed", questionText: amountQuestion.text, answer: "$1500", storyQuote: "I got a quote for $1500" }]);
    assert.equal(offers.find((offer) => offer.questionId === "sc-amount-claimed")?.answer, "$1,500.00");
  });

  check("2. the chat's summary shows a held amount as $1,500.00", () => {
    assert.equal(typeof card.answerWords, "function", "proposalCard.ts answerWords does not exist");
    assert.equal(card.answerWords!("sc-amount-claimed", 1500), "$1,500.00");
    assert.equal(card.answerWords!("sc-amount-claimed", "$1500"), "$1,500.00");
    assert.equal(card.answerWords!("sc-orient-dispute-category", "Property damage"), "Property damage");
  });

  check("3. the Plaintiff's Claim draft says the amount as $1,500.00", () => {
    const draft = draftSmallClaimsPlaintiffClaim({ facts: STORY, extra: { amountClaimed: "$1500" } });
    const text = JSON.stringify(draft);
    assert.ok(text.includes("The Plaintiff claims $1,500.00."), `draft: ${text.match(/The Plaintiff claims[^"]*/)?.[0]}`);
  });

  check("4. an amount that is not a plain sum is shown as written", () => {
    const words = "about $500 plus storage";
    assert.equal(card.answerWords?.("sc-amount-claimed", words), words);
    const draft = JSON.stringify(draftSmallClaimsPlaintiffClaim({ facts: STORY, extra: { amountClaimed: words } }));
    assert.ok(draft.includes(`The Plaintiff claims ${words}.`));
  });

  if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
  console.log("\nAll checks passed");
}

void main();
