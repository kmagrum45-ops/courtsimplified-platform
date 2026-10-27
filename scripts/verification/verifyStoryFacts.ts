/**
 * EACH FACT THE STORY GIVES, IN PLAIN WORDS (Charter re-test, 27 Oct, root cause 1).
 *
 * Checks, as properties, on the six cases Chrome re-tested (messy pack cases 11, 14, 16, 19 and 20,
 * and the Charter claim), through the readers "What we have so far" and the questions use
 * (caseFile/storyFacts.ts, storyLines.ts, storyAnswers.ts childrenFromStory):
 *   - every case lists the other side, and the loss where the story gives an amount;
 *   - no row is its whole sentence (Safety, kept in the person's words by design, aside); the
 *     sentence is kept as the row's source;
 *   - Witness is just the witness, never the list of evidence; Lost pay is the amount and the time;
 *     the evidence is listed when the story says what they have;
 *   - the children are their names and ages, or who and how old, never the sentence they came in;
 *   - a debt's last payment and whether it was acknowledged in writing (case 11).
 *
 * Failure it exists to catch: "Witness" showing the whole list of evidence, "Lost pay" repeating the
 * injury sentence, "Children" showing a sentence about the divorce, and the other side never listed.
 */
import fs from "node:fs";
import path from "node:path";
import { storyLines } from "../../src/lib/case-system/caseFile/storyLines";
import { caseFileOf } from "../../src/lib/case-system/caseFile/caseFile";
import { childrenFromStory } from "../../app/builder/_components/storyAnswers";
import { reviewEntries } from "../../src/lib/case-system/intakeReview";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failures += 1;
};
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const pack = fs.readFileSync(path.join(ROOT, "tests/browser/storyPackMore.ts"), "utf8");
const storyOf = (id: string) => (new RegExp(`id: "${id}"[\\s\\S]*?story: "((?:[^"\\\\]|\\\\.)*)"`).exec(pack)?.[1] ?? "").replace(/\\'/g, "'");

const CASES: { id: string; label: string; responding: boolean; money: boolean }[] = [
  { id: "m11-old-credit-card", label: "case 11 (civil debt, served)", responding: true, money: true },
  { id: "m14-served-divorce", label: "case 14 (family, served)", responding: true, money: false },
  { id: "m16-conference-safety", label: "case 16 (family, case going)", responding: false, money: false },
  { id: "m19-laptop-repair", label: "case 19 (Small Claims repair)", responding: false, money: true },
  { id: "m20-messy", label: "case 20 (Small Claims, messy)", responding: false, money: false },
  { id: "c1-charter-police", label: "the Charter claim", responding: false, money: true },
];

for (const item of CASES) {
  const story = storyOf(item.id);
  if (!story) { check(`${item.label}: the story is in the pack`, false); continue; }
  const lines = storyLines(story, caseFileOf(null), item.responding);
  const value = (fact: string) => lines.find((line) => line.fact === fact)?.value ?? "";
  check(`${item.label}: the other side is listed`, Boolean(value("otherParty")), JSON.stringify(lines.map((line) => line.label)));
  if (item.money) check(`${item.label}: the loss is listed`, /\$\d/.test(value("amount") + value("amountAgainst") + value("lostPay")), JSON.stringify(lines.map((line) => `${line.label}: ${line.value}`)));
  const sentences = lines.filter((line) => line.fact !== "safety" && line.value.trim() === line.quote.trim() && line.quote.trim().split(/\s+/).length > 8);
  check(`${item.label}: no row is its whole sentence`, sentences.length === 0, sentences.map((line) => `${line.label}: ${line.value}`).join(" | "));
  check(`${item.label}: every row keeps the sentence it came from`, lines.every((line) => line.quote.trim().length > 0 && story.replace(/\s+/g, " ").includes(line.quote.trim().replace(/\s+/g, " ").slice(0, 40))));
}

// The Charter claim: each row as Chrome asked.
const charter = storyLines(storyOf("c1-charter-police"), caseFileOf(null), false);
const charterValue = (fact: string) => charter.find((line) => line.fact === fact)?.value ?? "";
check("Charter: the witness is just the witness", /witness/i.test(charterValue("witness")) && !/timeline|clinic note|receipt/i.test(charterValue("witness")), charterValue("witness"));
check("Charter: lost pay is the amount and the time", /\$2,640/.test(charterValue("lostPay")) && /2 weeks/.test(charterValue("lostPay")) && !/wrist/i.test(charterValue("lostPay")), charterValue("lostPay"));
check("Charter: the injury is not the lost pay", !/\$2,640|missed/i.test(charterValue("injury")), charterValue("injury"));
check("Charter: the evidence is listed, without the witness", /clinic note/i.test(charterValue("evidence")) && !/witness/i.test(charterValue("evidence")), charterValue("evidence"));
check("Charter: the complaint and what came of it", /complaint/i.test(charterValue("complaint")) && /screened out/i.test(charterValue("complaint")), charterValue("complaint"));

// Case 11: the facts the limitation question turns on.
const debt = storyLines(storyOf("m11-old-credit-card"), caseFileOf(null), true);
check("case 11: the last payment", debt.find((line) => line.fact === "lastPayment")?.value === "November 2019", JSON.stringify(debt.find((line) => line.fact === "lastPayment")));
check("case 11: not acknowledged in writing, in their words", /not in writing/i.test(debt.find((line) => line.fact === "acknowledged")?.value ?? ""));

// The children, in plain words.
check("case 14: the children by name and age", childrenFromStory(storyOf("m14-served-divorce"))?.value === "Mia (4) and Noah (2)", JSON.stringify(childrenFromStory(storyOf("m14-served-divorce"))));
check("case 16: the child by who and how old", childrenFromStory(storyOf("m16-conference-safety"))?.value === "Daughter, age 6", JSON.stringify(childrenFromStory(storyOf("m16-conference-safety"))));
check("several children keep every age", childrenFromStory("We have two kids aged 3 and 5.")?.value === "Two children, ages 3 and 5");
check("the children's sentence is kept as the source", /divorce/.test(childrenFromStory(storyOf("m14-served-divorce"))?.quote ?? ""));

// Case 16: what the other side says, as reported.
const family = storyLines(storyOf("m16-conference-safety"), caseFileOf(null), false);
check("case 16: what the other side says is listed", /unstable/.test(family.find((line) => line.fact === "otherSideSays")?.value ?? ""));

// The civil review's empty boxes: the story's words offered in one click (intakeReview.ts fromStory).
const ID = "00000000-0000-4000-8000-000000000027";
const boxes = (id: string) => {
  const story = storyOf(id);
  const stored = { version: 1, flowId: ID, courtPath: "civil", revision: ID, sections: { story: { text: story }, situation: { record: { where: "starting", filed: "nothing", court: "civil" } }, civil: { input: { governmentActor: "", damagesBreakdown: "", timeline: "", facts: story } } } };
  return Object.fromEntries(reviewEntries(stored as never).filter((entry) => entry.fromStory).map((entry) => [entry.field, entry.fromStory!.value]));
};
const charterBoxes = boxes("c1-charter-police");
check("Charter review: the public body is offered from the story", /Police Service/.test(charterBoxes.governmentActor ?? ""), JSON.stringify(charterBoxes));
check("Charter review: the losses are offered from the story", /\$2,640/.test(charterBoxes.damagesBreakdown ?? "") && /Phone/.test(charterBoxes.damagesBreakdown ?? ""), charterBoxes.damagesBreakdown);
check("Charter review: the timeline is offered from the story", /June 3, 2025/.test(charterBoxes.timeline ?? ""), charterBoxes.timeline);
check("a private party is not offered as the public body (case 11's debt collector)", !boxes("m11-old-credit-card").governmentActor);

console.log(failures ? `\n${failures} failure(s)` : "\nall passed");
process.exitCode = failures ? 1 : 0;
