/**
 * WORDS BUILT FROM AMOUNTS FOLLOW THE AMOUNT THE CASE HOLDS (Chrome check of #550, 1.7; site owner, 14 Nov 2026:
 * "text built from amounts must be built from the record when it is shown, never saved as text").
 *
 * Chrome changed the slip-and-fall's amount to $5,100 after Continue. The amount showed $5,100 everywhere, but "What
 * you want" still read "Payment of $5,000 for pain and suffering, $450 for lost wages and $18.45 for medicine." in the
 * review, the case page and the draft: words written once from the old amounts and kept as text.
 *
 * The rule: when the case is read (caseFile.ts caseFileOf), "what you want" words that name amounts the case no
 * longer holds are shown built from the held amount: one amount is replaced where it stands; a breakdown that no
 * longer adds up gives way to the held amount. Nothing saved is changed.
 *
 * What it asserts, with no browser, model or database:
 *   1. after the amount is changed, every reader of "what you want" shows $5,100.00 and none of the old amounts: the
 *      review's and the case page's line (slotText), the draft panel (heldWordsOf), the Form 7A draft (form7ADraftFields)
 *      and the case file panel as rendered;
 *   2. with the amount unchanged (the breakdown still adds up to it), the words are shown as given;
 *   3. one amount in the person's words is replaced where it stands ("I want my $2,500.00 back");
 *   4. with no amount held, or no amount in the words, the words are shown as given;
 *   5. nothing saved is changed (the checkpoint is the same after reading).
 *
 * WHAT FAILURE THIS CATCHES: a screen showing amounts in "what you want" that the case no longer holds.
 *
 * Run: npm run test:wants-follow-amount
 */
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { caseFileOf, form7ADraftFields, slotText } from "../../src/lib/case-system/caseFile/caseFile";
import { heldWordsOf } from "../../src/lib/case-system/caseFile/caseFileOfMaster";
import { reviewBoxState, reviewEntries } from "../../src/lib/case-system/intakeReview";
import CaseFilePanel from "../../app/cases/_components/CaseFilePanel";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

const ID = "00000000-0000-4000-8000-000000000515";
const BREAKDOWN = "Payment of $5,000 for pain and suffering, $450 for lost wages and $18.45 for medicine.";
const checkpoint = (answers: Record<string, string>, changes?: Record<string, unknown>): Checkpoint => ({
  version: 1, flowId: ID, courtPath: "small-claims", revision: ID,
  sections: { story: { text: "Synthetic: I slipped at a store on October 4, 2026." }, builder: { step: "guided", initialAnswers: answers }, ...(changes ? { caseFile: { changes } } : {}) },
} as Checkpoint);
const answered = (value: unknown) => ({ state: "answered", value, at: "2026-11-14T12:00:00.000Z", seq: 1 });
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const OLD = /\$5,000\b|\$450\b|\$18\.45\b/;

let failed = 0;
const check = (name: string, run: () => void) => { try { run(); console.log(`PASS  ${name}`); } catch (error) { failed++; console.log(`FAIL  ${name}\n      ${(error as Error).message.split("\n")[0]}`); } };

check("setup: the amount and what you want are held from the review's answers", () => {
  const file = caseFileOf(checkpoint({ "sc-amount-claimed": "$5,468.45", "sc-remedy-sought": BREAKDOWN }));
  assert.equal(file.amount.state, "answered");
  assert.equal(file.wants.state, "answered");
});

check("1. amount changed to $5,100: every reader of what you want shows $5,100.00 and none of the old amounts", () => {
  const stored = checkpoint({ "sc-amount-claimed": "$5,468.45", "sc-remedy-sought": BREAKDOWN }, { amount: answered(5100) });
  const file = caseFileOf(stored);
  assert.equal(slotText(file.amount, (iso) => iso), "$5,100.00", "the amount itself is not the changed one");
  const places: [string, string][] = [
    ["review and case page line (slotText)", slotText(file.wants, (iso) => iso)],
    ["draft panel (heldWordsOf)", heldWordsOf(file, "wants").held ? (heldWordsOf(file, "wants") as { words: string }).words : ""],
    ["Form 7A draft (form7ADraftFields)", String(form7ADraftFields(file, (iso) => iso).goal ?? "")],
    ["case file panel", text(renderToStaticMarkup(createElement(CaseFilePanel, { file, changeHref: "/b", situationHref: "/s", stepHref: "/t" } as never)))],
  ];
  // The review's own box for it shows the record's words, not its older copy (intakeReview.ts reviewBoxState "held").
  const box = reviewEntries(stored).find((entry) => entry.field === "remedySoughtText" || entry.field === "sc-remedy-sought");
  assert.ok(box, "the review has no line for what you want");
  assert.equal(reviewBoxState(box, file), "held", "the review shows its own older copy of what you want");
  for (const [where, words] of places) {
    assert.ok(!OLD.test(words), `${where} still shows an old amount: ${words.match(/.{0,40}\$5,000.{0,60}|.{0,40}\$450.{0,40}/)?.[0] ?? words.slice(0, 120)}`);
    assert.ok(words.includes("$5,100.00"), `${where} does not show the held amount: ${words.slice(0, 160)}`);
  }
});

check("2. amount unchanged (the breakdown adds up to it): the words are shown as given", () => {
  const file = caseFileOf(checkpoint({ "sc-amount-claimed": "$5,468.45", "sc-remedy-sought": BREAKDOWN }));
  assert.equal(slotText(file.wants, (iso) => iso), BREAKDOWN);
});

check("3. one amount in the person's words is replaced where it stands", () => {
  const file = caseFileOf(checkpoint({ "sc-amount-claimed": "$2,000", "sc-remedy-sought": "I want my $2,000 back and an apology" }, { amount: answered(2500) }));
  assert.equal(slotText(file.wants, (iso) => iso), "I want my $2,500.00 back and an apology");
});

check("4. no amount held, or no amount in the words: the words are shown as given", () => {
  const noAmount = caseFileOf(checkpoint({ "sc-remedy-sought": BREAKDOWN }));
  assert.equal(slotText(noAmount.wants, (iso) => iso), BREAKDOWN);
  const noMoney = caseFileOf(checkpoint({ "sc-amount-claimed": "$900", "sc-remedy-sought": "I want the fence repaired" }, { amount: answered(1200) }));
  assert.equal(slotText(noMoney.wants, (iso) => iso), "I want the fence repaired");
});

check("5. nothing saved is changed", () => {
  const stored = checkpoint({ "sc-amount-claimed": "$5,468.45", "sc-remedy-sought": BREAKDOWN }, { amount: answered(5100) });
  const before = JSON.stringify(stored);
  caseFileOf(stored);
  assert.equal(JSON.stringify(stored), before);
});

if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
console.log("\nAll checks passed");
