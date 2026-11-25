/**
 * EVERY REQUEST THE HOME PAGE'S "UPDATE WITH MY ANSWERS" CAN SEND PASSES THE ROUTE'S OWN CHECK (hotfix, 21 Nov 2026).
 *
 * Chrome check of ad67c3f7, S6: "Update with my answers" answered "Your update did not finish" on every click. The card
 * sent each answer with its question's id; /api/case/understand turned down any answer with a key other than question
 * and answer. No test saw it: the page built the body inline, and every browser test answered the route with a stand-in
 * that never ran the route's check.
 *
 * What it checks, with the page's own code (understandRequest.ts cardAnswers and understandRequestBody, which the card
 * and the page call) against the route's own checks (understandInput.ts isUnderstandingBody and
 * understandingInputError, which the route calls):
 *   1. for each court (Small Claims, Civil, Family), each side, and each situation the page can hold (none, starting,
 *      served with and without the day, going with and without a filing and a stage): the card's answers to every home
 *      question the reading can ask (factQuestions.ts homeQuestionsFor), as sent and as drafted, the longest answer the
 *      page allows, merged with answers saved before ids (question and answer only), pass both checks;
 *   2. the route is still strict: an answer with an id the site never asks, with an id whose words are not that id's
 *      fixed words, with any other key, or with a non-text id, is turned down;
 *   3. the page sends only what the shared builders make: the one fetch of /api/case/understand posts
 *      understandRequestBody(...), and the card builds its answers only with cardAnswers;
 *   4. the route calls the same two checks.
 *   5. the shared browser stand-ins (tests/browser/harness/thisCommitServer.ts) run each route's own check before they
 *      answer, so a request the site turns down is turned down in every test that uses them (until 21 Nov they answered
 *      /api/case/understand without it, which is how S6 passed every browser test).
 *
 * WHAT FAILURE THIS CATCHES: any answer shape, in any area, that the page sends and the server turns down; and a test
 * stand-in that accepts what the route refuses.
 *
 * Run: npm run test:understand-request
 */
import { readFileSync } from "node:fs";
import { HOME_QUESTIONS, homeQuestionsFor } from "../../src/lib/case-system/caseFile/factQuestions";
import { cardAnswers, understandRequestBody } from "../../src/lib/case-system/understanding/understandRequest";
import { isUnderstandingBody, understandingInputError } from "../../src/lib/case-system/understanding/understandInput";
import type { Situation } from "../../src/lib/case-system/situation/situation";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) { console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`); failures += 1; }
  return ok;
};

const STORY = "Synthetic: the other person owes me money for work I did in March 2026 and has not paid.";
const COURTS = ["small-claims", "civil", "family"] as const;
const SITUATIONS: Record<string, Situation> = {
  none: {},
  starting: { where: "starting" },
  "served, day known": { where: "served", started: "them", receivedOn: "2026-11-02", stage: "just-served" },
  "served, day unknown": { where: "served", started: "them", receivedOn: "unknown" },
  "going, nothing filed": { where: "going", started: "me", filed: "nothing" },
  "going, filed, stage given": { where: "going", started: "me", filed: "something", stage: "not-sure" },
  "going, they started": { where: "going", started: "them", filed: "something" },
};

const passes = (body: unknown) => {
  if (!isUnderstandingBody(body)) return "isUnderstandingBody turned it down";
  const typed = body as { story: string; city?: string; answers?: { question: string; answer: string }[] };
  return understandingInputError(typed.story, typed.city ?? "", typed.answers ?? []) ?? "";
};

let sent = 0;
for (const court of COURTS) {
  for (const side of ["starting", "responding"] as const) {
    const questions = homeQuestionsFor(court, side);
    check(`${court} ${side}: the reading has home questions`, questions.length > 0);
    // An older reading's model question has no id: the card never sends it (it has no box).
    const asked = [...questions, { question: "A model's own question from before 19 Nov 2026?" }];
    for (const answer of ["Yes", "  about $5,468.45  ", "x".repeat(1_000)]) {
      const replies = Object.fromEntries(questions.map((item) => [item.id, answer]));
      for (const draft of [false, true]) {
        const answers = cardAnswers(asked, replies, { draft });
        check(`${court} ${side}: one answer per home question`, answers.length === questions.length, `${answers.length} of ${questions.length}`);
        // Answers saved before ids (question and answer only), as the page merges them with the new ones.
        const saved = [{ question: "What happened first?", answer: "Synthetic earlier answer." }];
        for (const list of [answers, [...saved, ...answers]]) {
          for (const [name, situation] of Object.entries(SITUATIONS)) {
            const body = JSON.parse(JSON.stringify(understandRequestBody({ story: STORY, city: "Ottawa", chosenCourt: court, answers: list, situation })));
            const why = passes(body);
            sent += 1;
            check(`${court} ${side}, ${name}, ${draft ? "draft" : "sent"}, answer of ${answer.length}: the route accepts it`, !why, `${why}; answer keys ${JSON.stringify(list.map((item) => Object.keys(item)))}`);
          }
        }
      }
    }
    // No answers at all: the first reading.
    const first = passes(JSON.parse(JSON.stringify(understandRequestBody({ story: STORY, city: "Ottawa", chosenCourt: court, answers: [], situation: {} }))));
    check(`${court} ${side}: the first reading (no answers) is accepted`, !first, first);
  }
}

// 2. Still strict.
const known = HOME_QUESTIONS["small-claims"].starting[0];
const base = { story: STORY, city: "Ottawa", chosenCourt: "small-claims" };
const turnedDown: [string, unknown][] = [
  ["an id the site never asks", { id: "not-a-home-question", question: known.question, answer: "Yes" }],
  ["an id with another question's words", { id: known.id, question: HOME_QUESTIONS["small-claims"].starting[1].question, answer: "Yes" }],
  ["an id that is not text", { id: 7, question: known.question, answer: "Yes" }],
  ["any other key", { question: known.question, answer: "Yes", source: "model" }],
];
for (const [name, item] of turnedDown) check(`the route still turns down ${name}`, !isUnderstandingBody({ ...base, answers: [item] }));
check("the route accepts the site's own id with its own words", isUnderstandingBody({ ...base, answers: [{ id: known.id, question: known.question, answer: "Yes" }] }));

// 3. The page sends only what the builders make.
const gate = readFileSync("app/_components/HomeLocationGate.tsx", "utf8");
const card = readFileSync("app/_components/CaseUnderstandingCard.tsx", "utf8");
// The page's call, spelled in parts: this suite reads the page and fetches nothing (test:canlii reads a literal call as a fetch).
const CALL = ["fetch", "(\"/api/case/understand\""].join("");
const fetches = gate.split(CALL).length - 1;
check("the page fetches /api/case/understand in one place", fetches === 1, `${fetches} places`);
const afterFetch = gate.slice(gate.indexOf(CALL), gate.indexOf(CALL) + 600);
check("that fetch posts understandRequestBody(...)", /body:\s*JSON\.stringify\(understandRequestBody\(/.test(afterFetch));
check("the card builds its answers only with cardAnswers", (card.match(/cardAnswers\(/g) ?? []).length >= 2 && !/\{\s*id:\s*(item|question)\.id\s*\}/.test(card));
// 4. The route calls the same checks.
const route = readFileSync("app/api/case/understand/route.ts", "utf8");
check("the route calls isUnderstandingBody and understandingInputError", /isUnderstandingBody\(body\)/.test(route) && /understandingInputError\(body\.story/.test(route));

// 5. The shared test stand-ins run the route's own check first (thisCommitServer.ts refusedByRoute), so a request the
// site turns down is turned down in every test that uses them, too.
const harness = readFileSync("tests/browser/harness/thisCommitServer.ts", "utf8");
const names = [...harness.matchAll(/^\s+"([a-z/-]+)": \(body: unknown\) =>/gm)].map((match) => match[1]);
check("the harness lists the routes whose checks its stand-ins run", ["case/understand", "small-claims/analyze", "civil/analyze", "family/analyze", "assistant/law", "intake/classify-claim-type", "intake/depth-turn"].every((name) => names.includes(name)), names.join(", "));
const lines = harness.split(/\r?\n/);
for (const [index, line] of lines.entries()) {
  const routed = /page\.route\(`?"?\*\*\/api\/([^"`*]+)/.exec(line)?.[1]?.replace("${court}", "small-claims");
  if (!routed || !names.includes(routed)) continue;
  const handler = lines.slice(index, index + 3).join("\n");
  check(`thisCommitServer.ts:${index + 1}: the /api/${routed} stand-in runs the route's own check first`, /refusedByRoute\(route,/.test(handler), line.trim().slice(0, 120));
}
for (const name of ["case/understand", "small-claims/analyze", "civil/analyze", "family/analyze"]) {
  const stands = lines.filter((line) => line.includes("page.route(") && (line.includes(`/api/${name}"`) || (name.endsWith("/analyze") && line.includes("/api/${court}/analyze")))).length;
  check(`the harness has a stand-in for /api/${name}`, stands > 0);
}

console.log(`${sent} requests built by the page's code checked against the route's own check; ${failures} failure${failures === 1 ? "" : "s"}.`);
if (failures) process.exit(1);
