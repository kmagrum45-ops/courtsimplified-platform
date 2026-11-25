/**
 * THE NEWEST ANSWER SHOWS ON EVERY SCREEN, NEVER A SCREEN'S OWN OLDER COPY (Chrome check of #544, 6 Nov 2026, F1).
 *
 * Chrome, Small Claims, the questions one at a time: the chat answered the amount $6,400; the whole form then held
 * $9,400 (the newest). The review's amount box showed $6,400, also after a reload, while the whole form showed $9,400.
 * Cause: the review draws each of its boxes from that box's own section (the chat's copy, `guided.facts.amountClaimedText`,
 * intakeReview.ts reviewEntries) and switched to the case record's value only when the record marked the fact as
 * changed with "Change" (IntakeReviewPanel changedFact) or the box was empty (reviewBoxState "held"). An answer given
 * in another place without "Change" (the whole form's box, typed over the copy the form was filled with) left the
 * review showing its own older copy.
 *
 * The rule checked: a review box whose own copy differs from the answer the case record holds (caseFileOf, the newest
 * answer from any place) shows the record's answer (reviewBoxState "held": the answer with "Change"), never its own
 * copy; a box that holds the same answer as the record, or holds the answer the record took from it, stays a box.
 * Checked through the real functions on synthetic checkpoints (no screen, no database).
 *
 * WHAT FAILURE THIS CATCHES: a screen showing its own older copy of an answer after the person gave a newer one elsewhere.
 *
 * Run: npm run test:newest-every-screen
 */
import { readFileSync } from "node:fs";
import * as caseFileModule from "../../src/lib/case-system/caseFile/caseFile";
import { answerNow, caseFileOf } from "../../src/lib/case-system/caseFile/caseFile";
import { reviewBoxState, reviewEntries } from "../../src/lib/case-system/intakeReview";
import type { Checkpoint } from "../../src/lib/case-system/intakeCheckpoint";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
type Sections = Record<string, Record<string, unknown>>;
const ID = "00000000-0000-4000-8000-000000000544";
const STORY = "Synthetic: I hired a deck builder in March 2026 to build a deck at my home. They never finished it and kept the money I paid.";
const cp = (sections: Sections): Checkpoint => ({ version: 1, flowId: ID, courtPath: "small-claims", revision: ID, sections: { story: { text: STORY, location: { province: "Ontario", city: "Kingston" } }, builder: { step: "guided" }, ...sections } } as unknown as Checkpoint);

/** What the review's amount box on the chat route does: its state, and the words it shows. */
function amountBox(sections: Sections) {
  const checkpoint = cp(sections);
  const file = caseFileOf(checkpoint);
  const entry = reviewEntries(checkpoint).find((item) => item.section === "guided" && item.field === "amountClaimedText");
  if (!entry) return { state: "missing", shows: "(no box)", record: file.amount.value };
  const state = reviewBoxState(entry, file);
  return { state, shows: state === "held" ? String(file.amount.value) : String(entry.value), record: file.amount.value };
}

const chat = { guided: { facts: { amountClaimedText: "$6,400" }, earlierAnswers: [{ questionId: "sc-amount-claimed", answerText: "$6,400" }], answeredIds: ["sc-amount-claimed"] } };

// 1. Chrome's case: the chat's $6,400, then the whole form's $9,400 (its own answer, no "Change").
{
  const box = amountBox({ ...chat, "small-claims": { input: { amountClaimed: "$9,400" } } });
  check("the record holds the whole form's newest amount", box.record === 9400, JSON.stringify(box));
  check("F1: the review's amount box shows the record's $9,400, never the chat's own $6,400", box.state === "held" && /9,?400/.test(box.shows), JSON.stringify(box));
}
// 2. The same, with the newer amount saved as a numbered answer from the form's own place (not a "Change").
{
  const box = amountBox({ ...chat, caseFile: { facts: { amount: { seq: 1, at: "2026-11-06T21:40:00Z", state: "answered", value: 9400, source: "person", question: "small-claims:amountClaimed" } } } });
  check("F1: a numbered answer from another place: the review shows it, never the chat's $6,400", box.state === "held" && /9,?400/.test(box.shows), JSON.stringify(box));
}
// 3. The box and the record agree: it stays a box (the person can type in it).
{
  const box = amountBox({ guided: { facts: { amountClaimedText: "$9,400" } }, "small-claims": { input: { amountClaimed: "$9,400" } } });
  check("the box holding the record's own answer stays a box", box.state === "given", JSON.stringify(box));
}
// 4. The chat's answer is the only one: it stays a box.
{
  const box = amountBox(chat);
  check("the chat's answer, the only one, stays a box", box.state === "given" && /6,?400/.test(box.shows), JSON.stringify(box));
}

// F3. The Small Claims chat keeps the person's typed reply ("$6,400") in their words and says the newest under it
// ("You changed this answer: $7,250", GuidedSmallClaimsIntake shownMessages through answerNow). Chrome: the amount changed
// in the whole form to $7,250 (its own answer, no "Change") showed no such line.
{
  const file = caseFileOf(cp({ ...chat, "small-claims": { input: { amountClaimed: "$7,250" } } }));
  const now = answerNow(file, "sc-amount-claimed", "$6,400");
  check("F3: the chat's typed $6,400, with $7,250 newer from the whole form: the chat says it changed, to $7,250", now.changed && !now.removed && /7,?250/.test(String(now.value)), JSON.stringify(now));
  const same = answerNow(caseFileOf(cp(chat)), "sc-amount-claimed", "$6,400");
  check("F3: the chat's reply that is still the answer says nothing", !same.changed, JSON.stringify(same));
  const removed = answerNow(caseFileOf(cp({ ...chat, caseFile: { facts: { amount: { seq: 1, at: "2026-11-06T21:40:00Z", state: "removed", source: "person", question: "small-claims:amountClaimed" } } } })), "sc-amount-claimed", "$6,400");
  check("F3: the answer removed since: the chat says it was removed", removed.changed && removed.removed, JSON.stringify(removed));
  const day = answerNow(caseFileOf(cp({ guided: { facts: { timelineText: "March 3, 2026" }, earlierAnswers: [{ questionId: "sc-orient-when-happened", answerText: "March 3, 2026" }] }, caseFile: { facts: { whenHappened: { seq: 1, at: "2026-11-06T21:40:00Z", state: "answered", value: "2026-03-03", source: "person", question: "position:case-date-act-or-omission" } } } })), "sc-orient-when-happened", "March 3, 2026");
  check("F3: the same day written another way is not a change", !day.changed, JSON.stringify(day));
}

// The overview (sweep A17): its amount, parties and outcome read the analysis copy unless the record marked the fact as
// changed with "Change". The record's own answer from any place is what it shows (caseFile.ts recordWords).
{
  const words = (caseFileModule as unknown as { recordWords?: (file: unknown, fact: string) => string | null | undefined }).recordWords;
  const file = caseFileOf(cp({ ...chat, "small-claims": { input: { amountClaimed: "$7,250", goal: "The money back" } }, caseFile: { facts: { otherParty: { seq: 1, at: "2026-11-06T21:40:00Z", state: "removed", source: "person", question: "small-claims:otherParty" } } } }));
  check("overview: the amount is the record's $7,250 (from the whole form), not the analysis copy", Boolean(words) && /7,250/.test(String(words?.(file, "amount"))), String(words?.(file, "amount")));
  check("overview: a removed other party shows nothing", Boolean(words) && words?.(file, "otherParty") === null, String(words?.(file, "otherParty")));
  check("overview: the outcome is the record's answer", Boolean(words) && /The money back/.test(String(words?.(file, "wants"))), String(words?.(file, "wants")));
  check("overview: no answer of the person's in the record: the screen keeps its copy (undefined)", Boolean(words) && words?.(caseFileOf(cp({})), "amount") === undefined, String(words?.(caseFileOf(cp({})), "amount")));
  const panel = readFileSync("app/builder/_components/IntelligenceOverviewPanel.tsx", "utf8");
  check("overview: its amount, outcome and other party read recordWords", ["amount", "wants", "otherParty"].every((fact) => panel.includes(`recordWords(caseFile, "${fact}"`)));
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nThe review shows the newest answer, never its own older copy.");
process.exit(failures ? 1 : 0);
