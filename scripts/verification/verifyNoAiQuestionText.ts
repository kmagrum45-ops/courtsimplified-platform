/**
 * NO QUESTION THE AI WRITES REACHES THE PERSON; THE SAME STORY ASKS THE SAME QUESTIONS, WORDED IDENTICALLY (site owner,
 * 19 Nov 2026).
 *
 * Cause it guards: the home page's story reading wrote its own questions and the site tied each to a fact by its WORDING
 * (factsOfQuestion.ts factOfAskedText). In the recorded real-model readings, 124 of 146 questions matched no fact, and
 * the same fact came back in other words each reading, so a fact already asked could not be recognised: repeats could
 * not be prevented by design. The law follow-up questions (SourcedQuestions.tsx) were the model's words too.
 *
 * What it asserts:
 *   1. on EVERY recorded real-model reading (tests/browser/fixtures/real-ai/<story>/r*.json, step "story-reading"), run
 *      through the real assembly (understandCase, the model's output replayed): every question it gives has an id and
 *      fixed site words (questions/factQuestions.ts), none is the model's;
 *   2. the same story read three times gives the same questions, in the same order, worded identically;
 *   3. build checks: the law follow-up questions are off (SourcedQuestions.tsx AI_WRITTEN_QUESTIONS is the literal
 *      false), the home card shows only a site question by id (isSiteQuestion, mayShowQuestion), the fixed Civil and
 *      Family words are the questions' own words, and the case file reads a home answer by its id;
 *   4. planted controls: a model-worded question, and two readings that differ, each fail the checks above.
 *
 * WHAT FAILURE THIS CATCHES: any model-written question text reaching a screen; a question set that changes with the
 * model's reading.
 *
 * Run: npm run test:no-ai-question-text
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { understandCase } from "../../src/lib/case-system/understanding/understandCase";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail.split("\n").join("\n      ")}`}`);
  if (!ok) failed++;
}

const DIR = path.join("tests", "browser", "fixtures", "real-ai");
type Q = { id?: string; question: string };

/** The site's fixed words, read from the catalogue file if it exists (before the change it does not). */
async function siteWords(): Promise<Set<string>> {
  const file = path.join("src", "lib", "case-system", "caseFile", "factQuestions.ts");
  if (!existsSync(file)) return new Set();
  const module = await import("../../src/lib/case-system/caseFile/factQuestions");
  return module.allHomeQuestionWords();
}

const courtOf = (story: string) => (story.startsWith("sc-") ? "small-claims" : story.startsWith("civil-") ? "civil" : "family") as "small-claims" | "civil" | "family";
const sideOf = (story: string) => (/sued|served/.test(story) ? "responding" : "starting") as "starting" | "responding";

/** The questions the real assembly gives for one recorded reading, the model's output replayed. */
async function questionsOf(story: string, raw: string): Promise<Q[]> {
  const result = await understandCase(
    { story: "A made-up story recorded for this reading.", chosenCourt: courtOf(story), situation: { side: sideOf(story) } },
    { reason: async () => raw, intakeOnly: true } as never,
  );
  return result.status === "understood" ? result.understanding.questions : [];
}

const isSite = (words: Set<string>) => (item: Q) => Boolean(item.id) && words.has(item.question);
const setKey = (list: Q[]) => JSON.stringify(list.map((item) => [item.id ?? null, item.question]));

async function main() {
  const words = await siteWords();

  // 4. Planted controls first: the checks must catch each fault.
  check("planted: a model-worded question is not a site question", !isSite(words)({ question: "When was payment due under your agreement?" }));
  check("planted: two readings that ask differently are told apart", setKey([{ id: "a", question: "x" }]) !== setKey([{ id: "a", question: "y" }]));

  // 1 and 2, on every recorded reading.
  let readings = 0;
  let modelQuestions = 0;
  const differing: string[] = [];
  for (const story of readdirSync(DIR).filter((name) => existsSync(path.join(DIR, name)))) {
    const sets: string[] = [];
    for (const file of readdirSync(path.join(DIR, story)).filter((name) => /^r\d+\.json$/.test(name)).sort()) {
      const fixture = JSON.parse(readFileSync(path.join(DIR, story, file), "utf8")) as { entries: { step: string; output: unknown }[] };
      const reading = fixture.entries.find((entry) => entry.step === "story-reading");
      if (!reading) continue;
      readings++;
      const raw = typeof reading.output === "string" ? reading.output : JSON.stringify(reading.output);
      const questions = await questionsOf(story, raw);
      const notSite = questions.filter((item) => !isSite(words)(item));
      modelQuestions += notSite.length;
      if (notSite.length) console.log(`      ${story}/${file}: ${notSite.map((item) => `"${item.question}"`).join("; ").slice(0, 400)}`);
      sets.push(setKey(questions));
    }
    if (new Set(sets).size > 1) differing.push(`${story}: ${sets.length} readings, ${new Set(sets).size} different question sets`);
  }
  check(`1. every question from the ${readings} recorded readings is a site question (id, fixed words)`, readings > 0 && modelQuestions === 0, `${modelQuestions} model-written question(s) reach the card`);
  check("2. the same story read three times asks the same questions, worded identically", differing.length === 0, differing.join("\n"));

  // 3. Build checks.
  const sourced = readFileSync("app/builder/_components/SourcedQuestions.tsx", "utf8");
  check("3a. the law follow-up questions (the model's words) are off", /export const AI_WRITTEN_QUESTIONS = false;/.test(sourced) && /if \(!AI_WRITTEN_QUESTIONS\) return;/.test(sourced) && /questions: AI_WRITTEN_QUESTIONS \? questions : \[\]/.test(sourced));
  const card = readFileSync("app/_components/CaseUnderstandingCard.tsx", "utf8");
  check("3b. the home card asks only a site question, by id", /isSiteQuestion\(item\) && mayShowQuestion\(file, item\.id!\)/.test(card) && !/mayAskWords/.test(card));
  if (words.size) {
    const { GUIDED_WORDS } = await import("../../src/lib/case-system/caseFile/factQuestions");
    const { civilGuidedFields, familyGuidedFields } = await import("../../app/builder/_components/guidedFields");
    const fields = [...civilGuidedFields({ issues: [], filed: [] } as never).map((field) => [`civil:${field.key}`, field.question]), ...familyGuidedFields({ issues: [], filed: [] }).map((field) => [`family:${field.key}`, field.question])];
    const wrong = Object.entries(GUIDED_WORDS).filter(([key, text]) => fields.find(([fieldKey]) => fieldKey === key)?.[1] !== text).map(([key]) => key);
    check("3c. the fixed Civil and Family words are the questions' own words", wrong.length === 0, wrong.join(", "));
  } else check("3c. the fixed Civil and Family words are the questions' own words", false, "caseFile/factQuestions.ts does not exist");
  const caseFile = readFileSync("src/lib/case-system/caseFile/caseFile.ts", "utf8");
  check("3d. the case file reads a home answer by its id", /for \(const fact of slotsOf\(id\)\) give\(file, fact, answer\.trim\(\), `home:\$\{id\}`\)/.test(caseFile));

  console.log(failed ? `\n${failed} check(s) failed` : "\nAll no-ai-question-text checks passed");
  process.exitCode = failed ? 1 : 0;
}

void main();
