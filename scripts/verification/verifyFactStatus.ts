/**
 * THE ONE FUNCTION THAT SAYS WHETHER A FACT IS KNOWN (site owner, 11 Nov 2026, design slice 1; caseFile/factStatus.ts).
 *
 * Every fact is one of: known (the person's answer, typed or a story value they said Yes to), offer (stated in the
 * story, not yet decided: shown once with Yes / No, that's not right / I'm not sure), ask (unknown, or the person said
 * the story's value was not right: asked once), settled ("I'm not sure", a skip, or removed: never asked again, shown
 * as "add it when you know"). Checks:
 *   1. each state of a slot gives its status (answered, unsure, removed, a story value, a story value said "No");
 *   2. the two gates that disagreed (asker.ts askOf / mayAsk and caseFile.ts chatMayAsk / nextQuestion) now give the
 *      same answer for every fact in every state, both from factStatus: a question may be shown for ask and offer;
 *   3. the story reader offers a quote or estimate as the amount ("I got a quote for 1500"), while the automatic amount
 *      reader still skips it (claimAmountFromStory); it offers a full date as when it happened;
 *   4. stillNeeded lists every fact not known, with settled ones marked "add it when you know";
 *   5. a value the person typed is known, never an offer, even when the story states another.
 *
 * WHAT FAILURE THIS CATCHES: a screen asking a fact the case knows, or not offering one the story states.
 *
 * Run: npm run test:fact-status
 */
export {};

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};

async function main() {
  const status = (await import("../../src/lib/case-system/caseFile/factStatus").catch(() => null)) as Record<string, unknown> | null;
  check("setup: caseFile/factStatus.ts exists with factStatus, questionStatus and stillNeeded", Boolean(status && typeof status.factStatus === "function" && typeof status.questionStatus === "function" && typeof status.stillNeeded === "function"));
  const review = (await import("../../src/lib/case-system/intakeReview")) as Record<string, unknown>;
  check("setup: intakeReview.ts exports the one story reader (statedInStory)", typeof review.statedInStory === "function");
  if (failures) return finish();

  const { factStatus, questionStatus, stillNeeded } = status as {
    factStatus: (file: unknown, fact: string, stated?: Record<string, string>) => string;
    questionStatus: (file: unknown, questionId: string, stated?: Record<string, string>) => string;
    stillNeeded: (file: unknown, facts: readonly string[], stated?: Record<string, string>) => { fact: string; status: string; addWhenYouKnow: boolean }[];
  };
  const { emptyCaseFile, chatMayAsk, SLOT_FACTS } = await import("../../src/lib/case-system/caseFile/caseFile");
  const { mayAsk } = await import("../../src/lib/case-system/intake/asker");
  const { claimAmountFromStory } = await import("../../src/lib/case-system/claimAmount");
  const statedInStory = review.statedInStory as (story: string) => Record<string, string>;

  type AnySlot = Record<string, unknown>;
  const fileWith = (fact: string, slot: AnySlot) => ({ ...emptyCaseFile(), [fact]: slot });
  const STATES: [string, AnySlot, string][] = [
    ["answered by the person", { state: "answered", value: "1500", confirmed: true, source: { kind: "answer", question: "x" } }, "known"],
    ["not sure", { state: "unsure", confirmed: true, source: { kind: "answer", question: "x" } }, "settled"],
    ["removed", { state: "not-asked", confirmed: true, removed: true }, "settled"],
    ["stated in the story, not decided", { state: "answered", value: "1500", confirmed: false, source: { kind: "story", quote: "a quote for 1500" } }, "offer"],
    ["the story's value said not right", { state: "not-asked", confirmed: false, declined: true }, "ask"],
    ["never given", { state: "not-asked", confirmed: false }, "ask"],
  ];
  for (const [name, slot, want] of STATES) check(`1. ${name}: ${want}`, factStatus(fileWith("amount", slot), "amount") === want, factStatus(fileWith("amount", slot), "amount"));
  check("1. a value only in the story (the reader's) is an offer", factStatus(emptyCaseFile(), "amount", { amount: "1500" }) === "offer");

  const disagree: string[] = [];
  for (const fact of SLOT_FACTS) for (const [name, slot] of STATES) {
    const file = fileWith(fact, slot) as never;
    const question = { amount: "sc-amount-claimed", whenHappened: "sc-orient-when-happened", otherParty: "sc-defendant-name", wants: "sc-remedy-sought" }[fact as string];
    if (!question) continue;
    const one = mayAsk(file, question);
    const two = chatMayAsk(file, question);
    const should = ["ask", "offer"].includes(questionStatus(file, question));
    if (one !== should || two !== should) disagree.push(`${fact} ${name}: askOf ${one}, chatMayAsk ${two}, factStatus ${should}`);
  }
  check("2. the two gates and factStatus agree for every fact in every state", disagree.length === 0, disagree.slice(0, 6).join("\n      "));

  const tree = "my neighbor cut down a tree on my property withoiut my permission. i want the tree replaced and i got a quote for 1500 to do the work and supply the tree";
  check("3. a quote is offered as the amount (the tree story)", statedInStory(tree).amount === "1500", JSON.stringify(statedInStory(tree)));
  check("3. the automatic amount reader still skips a quote", claimAmountFromStory(tree) === null, JSON.stringify(claimAmountFromStory(tree)));
  const slip = "On March 14, 2026 I slipped on an icy step outside Testmart Grocery and broke my wrist. I am claiming $5,000 for pain and suffering, $450 for physiotherapy and $18.45 for a wrist brace.";
  check("3. a full date is offered as when it happened", statedInStory(slip).whenHappened === "2026-03-14", JSON.stringify(statedInStory(slip)));
  check("3. an estimate is offered as the amount", statedInStory("The repair estimate was $2,300 and he refuses to pay.").amount === "2300", JSON.stringify(statedInStory("The repair estimate was $2,300 and he refuses to pay.")));

  const needed = stillNeeded(fileWith("whenHappened", STATES[1][1]), ["amount", "whenHappened", "otherParty"], { amount: "1500" });
  check("4. stillNeeded lists the facts not known, with their status", JSON.stringify(needed.map((item) => [item.fact, item.status])) === JSON.stringify([["amount", "offer"], ["whenHappened", "settled"], ["otherParty", "ask"]]), JSON.stringify(needed));
  check("4. a settled fact is marked add it when you know", needed.find((item) => item.fact === "whenHappened")?.addWhenYouKnow === true);

  check("5. a typed value is known even when the story states another", factStatus(fileWith("amount", STATES[0][1]), "amount", { amount: "9999" }) === "known");
  finish();
}
function finish() {
  console.log(failures ? `\n${failures} check(s) failed.` : "\nThe one function: all checks pass.");
  process.exit(failures ? 1 : 0);
}
void main();
