/**
 * A FIXED HOME QUESTION IS ASKED ONLY WHEN NEITHER THE CASE RECORD NOR THE STORY GIVES ITS ANSWER (site owner, 19 Nov 2026,
 * Chrome pass 3 re-recording on #550).
 *
 * Cause it guards: the home page asked every fixed question for the court and side (factQuestions.ts homeQuestionsFor),
 * whatever the story said. S2 ("kept my $1,200 deposit") was asked "What is the total dollar amount ...?" beside the
 * offer "From your story: $1,200"; S1 and S4 (both dated Oct 4, 2026) were asked "Roughly when ...?", and the answer
 * "I do not know yet" settled the date the story gave, so the case page said "Not answered yet".
 *
 * The rule: a fixed question is asked only if (a) the case record has no answer for its facts, and (b) the story
 * reader the intake uses, with no AI (intakeReview.ts statedInStory, no reading), finds no value for them. A stated value
 * is not asked on the home page; the intake offers it once (Yes / No, that's not right / I'm not sure). The decision
 * reads the story only, so the same story asks the same questions on every reading.
 *
 * What it asserts, table-driven over the one list of facts the story reader can state (STORY_STATED_FACTS), so a fact
 * added to the reader without a row here fails:
 *   1. every fact on that list has a story that states it and one that does not;
 *   2. for every court and side whose home list asks that fact: the stating story does not ask it; the other does;
 *   3. a fact the case record holds (answered, or "not sure") is not asked, story or not;
 *   4. Chrome's stories: S1 and S4 are not asked when, S2 is not asked the amount;
 *   5. the same story gives the same questions three times;
 *   6. build check: the home card asks through homeAsks only, with no offer of its own (the intake offers), and keeps
 *      each answer by its question's id.
 *
 * WHAT FAILURE THIS CATCHES: a home question asked although the story already answers it; a second decider beside the
 * one function.
 *
 * Run: npm run test:home-asks-unstated
 */
import { readFileSync } from "node:fs";
import * as questions from "../../src/lib/case-system/caseFile/factQuestions";
import * as review from "../../src/lib/case-system/intakeReview";
import { factsOfQuestion } from "../../src/lib/case-system/caseFile/factsOfQuestion";
import { mayShowQuestion } from "../../src/lib/case-system/caseFile/factStatus";
import { emptyCaseFile, type CaseFile } from "../../src/lib/case-system/caseFile/caseFile";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed++;
}

type Court = "small-claims" | "civil" | "family";
type Side = "starting" | "responding";
type Decide = (court: Court, side: Side, file: CaseFile | null, story: string) => { id: string; question: string }[];
// The one decider, over the fixed list. Before the change there was none: the card's decision was the list, filtered by
// the record alone (mayShowQuestion), which is what this ran on to fail first.
type HomeAsks = (file: CaseFile | null, id: string, story: string) => boolean;
const homeAsks = (questions as { homeAsks?: HomeAsks }).homeAsks;
const decide: Decide = (court, side, file, story) => questions.homeQuestionsFor(court, side).filter((item) => (homeAsks ? homeAsks(file, item.id, story) : mayShowQuestion(file, item.id)));
const statedFacts: readonly string[] = (review as { STORY_STATED_FACTS?: readonly string[] }).STORY_STATED_FACTS ?? ["whenHappened", "amount", "wants"];

/** A story that states the fact, and one that does not (made-up details). */
const ROWS: Record<string, { states: string; silent: string }> = {
  whenHappened: { states: "On October 4, 2026 my neighbour cut down my maple tree.", silent: "My neighbour cut down my maple tree." },
  amount: { states: "My contractor kept my $1,200 deposit.", silent: "My contractor left the job unfinished." },
  wants: { states: "My contractor left the job unfinished. I want my deposit back.", silent: "My contractor left the job unfinished." },
  // Added with the one story reader (21 Nov 2026, batch (a)): the facts it now states for every court.
  children: { states: "We separated in April 2026. We have a 6-year-old.", silent: "We separated in April 2026." },
  servedDate: { states: "I was served with the claim on October 1, 2026.", silent: "I was served with the claim." },
  courtDate: { states: "The case conference is on December 3, 2026.", silent: "There is a case conference coming up." },
};

// 1.
const missing = statedFacts.filter((fact) => !ROWS[fact]);
check("1. every fact the story reader states has a row (stating story, silent story)", missing.length === 0, `no row for: ${missing.join(", ")}`);
for (const [fact, row] of Object.entries(ROWS)) {
  const said = review.statedInStory(row.states) as Record<string, string | undefined>;
  const silent = review.statedInStory(row.silent) as Record<string, string | undefined>;
  check(`1. setup ${fact}: the reader finds it in the stating story only`, Boolean(said[fact]) && !silent[fact], JSON.stringify({ said, silent }));
}

// 2.
const COURTS: Court[] = ["small-claims", "civil", "family"];
const SIDES: Side[] = ["starting", "responding"];
let covered = 0;
for (const fact of statedFacts) {
  const row = ROWS[fact];
  if (!row) continue;
  for (const court of COURTS) for (const side of SIDES) {
    const asking = questions.homeQuestionsFor(court, side).filter((item) => factsOfQuestion(item.id).includes(fact));
    for (const item of asking) {
      covered++;
      const stating = decide(court, side, null, row.states).some((asked) => asked.id === item.id);
      const silent = decide(court, side, null, row.silent).some((asked) => asked.id === item.id);
      check(`2. ${court} ${side} ${item.id} (${fact}): not asked when the story states it`, !stating);
      check(`2. ${court} ${side} ${item.id} (${fact}): asked when the story does not`, silent);
    }
  }
}
check("2. setup: at least one home question asks each stated fact somewhere", covered >= statedFacts.length, `${covered} rows`);

// 3.
const held = (state: "answered" | "unsure"): CaseFile => {
  const file = emptyCaseFile();
  file.amount = state === "answered" ? { state, value: "1200", source: { kind: "answer", question: "q" }, confirmed: true } : { state, source: { kind: "answer", question: "q" }, confirmed: true };
  return file;
};
for (const state of ["answered", "unsure"] as const) {
  check(`3. the record holds the amount (${state}): not asked, story silent`, !decide("small-claims", "starting", held(state), ROWS.amount.silent).some((item) => item.id === "sc-amount-claimed"));
}

// 4.
const S1 = "On Oct 4, 2026 at about 6:40 pm I slipped on a wet floor near the milk fridge at a Circle K in Ottawa. There was no wet-floor sign. I fell on my right hip. A shopper, Sam Patel, saw it. The manager wrote notes. I went to the hospital that night; X-rays showed a bad bruise, no break. I missed 3 days of work (Oct 5 to 7) at $150 a day and bought Tylenol and an ice pack for $18.45. I want to claim $5,000 for pain and suffering, $450 lost wages and $18.45 for medicine.";
const S2 = "My contractor left the work unfinished and kept my $1,200 deposit.";
const S4 = "On Oct 4, 2026 my neighbour cut down my maple tree, which was on my side of the fence. A nursery gave me a replacement quote of $1,500.";
const ids = (story: string) => decide("small-claims", "starting", null, story).map((item) => item.id);
check("4. S1 is not asked when it happened", !ids(S1).includes("sc-orient-when-happened"), ids(S1).join(", "));
check("4. S4 is not asked when it happened", !ids(S4).includes("sc-orient-when-happened"), ids(S4).join(", "));
check("4. S2 is not asked the amount", !ids(S2).includes("sc-amount-claimed"), ids(S2).join(", "));

// 5.
const runs = [1, 2, 3].map(() => JSON.stringify(decide("small-claims", "starting", null, S2)));
check("5. the same story gives the same questions three times", new Set(runs).size === 1);

// 6.
const card = readFileSync("app/_components/CaseUnderstandingCard.tsx", "utf8");
check("6. the home card asks through homeAsks, the one decider", /homeAsks\(file, item\.id!, story/.test(card) && !/mayShowQuestion\(/.test(card));
check("6. the home card makes no offer of its own (the intake offers a stated value once)", !/offerForAskedWords|case-understanding-offer/.test(card));
check("6. the home card keeps each answer by its question's id, never its place", /replies\[item\.id!\]/.test(card) && !/replies\[index\]/.test(card));

console.log(failed ? `\n${failed} check(s) failed` : "\nAll home-asks-unstated checks passed");
process.exitCode = failed ? 1 : 0;
