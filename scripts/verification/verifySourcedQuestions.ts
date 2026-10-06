/**
 * Follow-up questions written from the law the research read
 * (src/lib/case-system/retrieval/sourcedQuestions.ts), shown in all three
 * intakes before the analysis.
 *
 * WHAT IT CATCHES:
 *   - A question shown whose quote is not in its passage, or whose passage
 *     was not one the research found to answer a question (the writer
 *     inventing its support).
 *   - A number in a question or its "why" that the passage does not contain
 *     (a time limit rounded or invented).
 *   - Outcome or merits wording, advice ("you should"), or "do you have a
 *     case" reaching a person (CLAUDE.md sections 2 and 3).
 *   - A question the independent check refused, or did not answer for,
 *     being shown anyway; the check seeing the story.
 *   - The writer being offered passages the research did not find to answer
 *     anything.
 *   - Any failure blocking the intake instead of giving no questions.
 *   - The switch not turning it off, or the route serving someone not signed
 *     in; an intake that does not show the questions or does not carry the
 *     answers to the analysis.
 *
 * COSTS NOTHING: the research, writer and checker are stubs; real passages are
 * read from the built index on disk.
 *
 * Run: npm run test:sourced-questions
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { NextRequest } from "next/server";

import { createSourcedQuestionsPost } from "../../app/api/intake/sourced-questions/route";
import { loadCorpusIndex, readPassage, type Passage } from "../../src/lib/case-system/retrieval/corpusIndex";
import type { ResearchResult } from "../../src/lib/case-system/retrieval/researchStory";
import {
  answeringPassages,
  CHECK_SYSTEM_PROMPT,
  checkingPrompt,
  passagesById,
  questionRejection,
  questionsFromPassages,
  researchForQuestions,
  sourcedQuestions,
  writingPrompt,
} from "../../src/lib/case-system/retrieval/sourcedQuestions";
import { sourcedQuestionsEnabled } from "../../src/lib/content-library/phaseScope";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const read = (relative: string) => readFileSync(path.join(ROOT, relative), "utf8");

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

const STORY =
  "i was hit by a city bus when i was waiting to cross at a cross walk and i dislocated my shoulder. i want to sue";

async function main() {
  const index = loadCorpusIndex(ROOT);
  if (!index) {
    console.log("  info  no built index here; the passage checks are skipped");
    wiring();
    return;
  }
  const ids = index.meta.chunks.map(([id]) => id);
  const find = (prefix: string, pinpoint: RegExp): Passage | null => {
    for (const id of ids.filter((id) => id.startsWith(prefix))) {
      const passage = readPassage(index, id, 0.6);
      if (passage && pinpoint.test(passage.pinpoint || "")) return passage;
    }
    return null;
  };
  const notice = find("corpus:insurance-act:", /258\.3 \(1\)/);
  const limitation = find("corpus:limitations-act-2002:", /^s\. 4\b|4\b/);
  check("the index has the passages these checks use", Boolean(notice && limitation));
  if (!notice || !limitation) {
    wiring();
    return;
  }

  console.log("\n1. Code decides what may be asked");
  const quote = "served written notice of the intention to commence the action on the defendant within 120 days";
  const good = {
    question: "Did you send the bus company or the city a written notice that you intend to sue?",
    why: "The Insurance Act says a person must give written notice of the intention to sue within 120 days after the accident.",
    passageId: notice.id,
    quote,
  };
  check("a quoted, neutral question passes", questionRejection(good, notice) === null, String(questionRejection(good, notice)));
  check("a quote not in the passage is refused", questionRejection({ ...good, quote: "notice must be given within ten days of the accident" }, notice) !== null);
  check("no passage, no question", questionRejection(good, undefined) !== null);
  check(
    "a number the passage does not contain is refused",
    /number/.test(questionRejection({ ...good, why: "Notice must be given within 30 days after the accident." }, notice) ?? ""),
  );
  check("outcome wording is refused", questionRejection({ ...good, why: "Giving notice makes for a strong case under the Insurance Act provision." }, notice) !== null);
  check("advice is refused", questionRejection({ ...good, question: "You should send notice right away, have you done it?" }, notice) !== null);
  check("'do you have a case' is refused", questionRejection({ ...good, question: "Do you think you have a case against the driver?" }, notice) !== null);
  check("a question pointing at text the person cannot see is refused", questionRejection({ ...good, question: "Had you filed an agreement to be bound by this section?" }, notice) !== null);
  check("a statement is not a question", questionRejection({ ...good, question: "Tell us whether you sent the written notice." }, notice) !== null);

  console.log("\n2. The pipeline");
  const research: ResearchResult = {
    queries: [],
    passages: [notice, limitation],
    items: [],
    issues: [{ id: "issue-1", question: "Is notice required?", queries: ["notice"], situation: "A pedestrian was hit by a bus and injured and wants compensation." }],
    findings: [{ issueId: "issue-1", question: "Is notice required?", status: "answered", answeredBy: [{ passageId: notice.id, quote }] }],
    sourceRequests: ["Some Missing Act"],
    rounds: 1,
  };
  check("the writer is offered only passages that answered a research question", answeringPassages(research).map((p) => p.id).join() === notice.id);

  let writerSaw = "";
  let checkerSaw = "";
  const drafts = [
    good,
    { ...good, question: "Did you send the bus company or the city a written notice that you intend to sue?" }, // duplicate
    { ...good, question: "Was the notice sent within 30 days?", why: "Notice is due within 30 days after the accident under this section." },
    { ...good, question: "On what date did you send any written notice about the accident?", why: "The section counts the 120 days from the date of the accident in which the injury happened." },
  ];
  const result = await sourcedQuestions(
    { story: STORY, courtPath: "small-claims", side: "plaintiff" },
    {
      research: async () => research,
      write: async (input, passages) => {
        writerSaw = writingPrompt(input, passages);
        return { questions: drafts };
      },
      check: async (situation, items) => {
        checkerSaw = checkingPrompt(situation, items);
        // Passes the first, refuses the second, says nothing about the rest.
        return { results: [{ id: items[0].id, ok: true }, { id: items[1]?.id, ok: false, problem: "leading" }] };
      },
    },
  );
  check("a passing question is shown, with its citation and link", result.questions.length === 1 && /Insurance Act/.test(result.questions[0].citation) && Boolean(result.questions[0].sourceUrl), JSON.stringify(result.questions));
  check("a duplicate and a wrong number never reach the checker", result.counts.refusedByCode === 2, JSON.stringify(result.counts));
  check("a question the check refused or did not answer for is not shown", result.counts.refusedByChecker === 1 && !result.questions.some((q) => /what date/i.test(q.question)));
  check("the writer sees the story", writerSaw.includes("dislocated"));
  check("the check never sees the story", !checkerSaw.includes("dislocated") && checkerSaw.includes("SITUATION:"));
  // Without the court it refused Small Claims rules as "not established"
  // (coverage run, 2026-10-06).
  check("the check is told the court and side", checkerSaw.includes("Small Claims Court") && checkerSaw.includes("one bringing the matter"));
  check("the check is told questions may name the person's own facts", /may name facts from it/.test(CHECK_SYSTEM_PROMPT));
  check("laws the research named as missing are passed on", result.sourceRequests.join() === "Some Missing Act");

  const many = await sourcedQuestions(
    { story: STORY, courtPath: "civil" },
    {
      research: async () => research,
      write: async () => ({
        // Words, not digits: a digit the passage lacks would be refused first.
        questions: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"].map((word) => ({
          ...good,
          question: `Question ${word}: did you give written notice of this?`,
        })),
      }),
      check: async (_s, items) => ({ results: items.map((item) => ({ id: item.id, ok: true })) }),
    },
  );
  check("at most five questions", many.questions.length === 5);

  console.log("\n3. Failure is harmless");
  const malformed = await sourcedQuestions(
    { story: STORY, courtPath: "family" },
    { research: async () => research, write: async () => ({ questions: [good] }), check: async () => "all fine" },
  );
  check("an unreadable check shows nothing", malformed.questions.length === 0);
  const thrown = await sourcedQuestions(
    { story: STORY, courtPath: "civil" },
    { research: async () => research, write: async () => { throw new Error("model down"); }, check: async () => ({}) },
  );
  check("a model failure gives no questions, and does not throw", thrown.questions.length === 0 && thrown.skipped === "error");
  const nothing = await sourcedQuestions(
    { story: STORY, courtPath: "civil" },
    { research: async () => ({ ...research, findings: [], skipped: "timeout" }), write: async () => ({ questions: [good] }), check: async () => ({}) },
  );
  check("no answered research, no questions", nothing.questions.length === 0);

  console.log("\n4. Two requests, and the second takes ids, not text");
  const found = await researchForQuestions({ story: STORY, courtPath: "small-claims" }, { research: async () => research });
  check("phase 1 returns passage ids and the situation", found.passageIds.join() === notice.id && found.situation.length > 0);
  check("phase 2 re-reads passages from the index; an unknown id is dropped", passagesById(index, [notice.id, "corpus:nope:1"]).map((p) => p.id).join() === notice.id);
  const fromIds = await questionsFromPassages({ story: STORY, courtPath: "small-claims" }, passagesById(index, found.passageIds), found.situation, {
    write: async () => ({ questions: [good] }),
    check: async (_s, items) => ({ results: items.map((item) => ({ id: item.id, ok: true })) }),
  });
  check("phase 2 writes from the re-read passages", fromIds.questions.length === 1);

  const calls: string[] = [];
  const filed: string[][] = [];
  const route = (signedIn: boolean) =>
    createSourcedQuestionsPost({
      authenticate: (async () => (signedIn ? { id: "u" } : null)) as never,
      enabled: () => true,
      hasAi: () => true,
      index: () => index,
      research: async () => {
        calls.push("research");
        return { passageIds: [notice.id], situation: "A pedestrian was hit by a bus.", sourceRequests: ["Some Missing Act"] };
      },
      questions: async (_input, passages) => {
        calls.push(`questions:${passages.map((p) => p.id).join()}`);
        return { questions: [], counts: { written: 0, refusedByCode: 0, refusedByChecker: 0 }, sourceRequests: [] };
      },
      fileRequests: (async (names: string[]) => {
        filed.push(names);
        return { filed: names, skipped: [] };
      }) as never,
    });
  const post = (body: unknown, signedIn = true) =>
    route(signedIn)(new NextRequest("http://localhost/api/intake/sourced-questions", { method: "POST", body: JSON.stringify(body) }));
  const one = await (await post({ story: STORY, courtPath: "small-claims" })).json();
  check("the first call researches and returns ids", one.passageIds?.join() === notice.id && calls.join() === "research");
  check("the first call files the laws the research found missing", filed.flat().join() === "Some Missing Act");
  await post({ story: STORY, courtPath: "small-claims", passageIds: [notice.id, "corpus:nope:1"], situation: "x" });
  check("the second call writes from the ids, re-read, without researching again", calls.slice(1).join() === `questions:${notice.id}`);
  const text = await post({ story: STORY, courtPath: "small-claims", passageIds: ["Any text a caller likes"] });
  check("passage text in place of an id is refused", text.status === 400);
  const anonymous = await (await post({ story: STORY, courtPath: "civil" }, false)).json();
  check("someone not signed in gets nothing, and no model is called", (anonymous.questions ?? []).length === 0 && !anonymous.passageIds && calls.length === 2);

  wiring();
}

function wiring() {
  console.log("\n5. Switches and wiring");
  check("on by default", sourcedQuestionsEnabled({}));
  check("SOURCED_QUESTIONS=off turns it off", !sourcedQuestionsEnabled({ SOURCED_QUESTIONS: "off" }));
  check("off when model text to users is off", !sourcedQuestionsEnabled({ AI_ANALYSIS_TEXT_TO_USERS: "off" }));
  check("off when the research step is off", !sourcedQuestionsEnabled({ RESEARCH_STEP: "off" }));
  const module = read("src/lib/case-system/retrieval/sourcedQuestions.ts");
  check("every model call declares structured output", (module.match(/chat\.completions\.create\(/g) ?? []).length === 1 && module.includes('response_format: { type: "json_object" }'));
  check("model calls are audited", module.includes("withAiCallContext("));
  check("declared as a model call site", read("scripts/verification/verifyOutputGuard.ts").includes('"src/lib/case-system/retrieval/sourcedQuestions.ts"'));
  const routeSource = read("app/api/intake/sourced-questions/route.ts");
  check("the route obeys the switch", routeSource.includes("sourcedQuestionsEnabled()"));
  // A route that reads the index must have it packaged with it on Vercel
  // (next.config outputFileTracingIncludes); this one was missing before
  // release and would have found no index in production.
  const config = read(readdirSync(ROOT).find((file) => /^next\.config\./.test(file))!);
  const readers = readdirSync(path.join(ROOT, "app", "api"), { recursive: true })
    .map(String)
    .filter((file) => file.endsWith("route.ts"))
    .filter((file) => /case-system\/retrieval\/(?!sourceRequests)\w+"/.test(read(path.join("app", "api", file))))
    .map((file) => `/api/${path.dirname(file).split(path.sep).join("/")}`);
  const unshipped = readers.filter((route) => !config.includes(`"${route}": RETRIEVAL_FILES`));
  check("every route that reads the index ships it", readers.length > 0 && unshipped.length === 0, unshipped.join(", "));
  for (const [court, file] of [
    ["Small Claims", "app/builder/_components/GuidedSmallClaimsIntake.tsx"],
    ["Civil", "app/builder/_components/CivilIntake.tsx"],
    ["Family", "app/builder/_components/FamilyIntake.tsx"],
  ] as const) {
    const source = read(file);
    check(`${court} shows the questions`, source.includes("<SourcedQuestionsCard"));
    check(`${court} carries the answers to the analysis`, /withSourcedAnswers\(|sourcedAnswersText\(/.test(source));
  }
  check(
    "the Small Claims analysis gets the story as sent, plus the answers",
    /result\.storyText[\s\S]{0,80}result\.followUpText/.test(read("app/builder/_components/guidedIntakeToSmallClaimsInput.ts")),
  );
  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

void main();
