/**
 * "The law on your question" in the Court Assistant
 * (src/lib/case-system/retrieval/researchQuestion.ts, /api/assistant/law).
 *
 * WHAT IT CATCHES:
 *   - A question researched as more than two research questions (a chat
 *     answer that takes as long as the whole analysis).
 *   - A provision shown whose quote is not in it (the same code check as the
 *     story research: an answer the code cannot find is not an answer).
 *   - The question or story missing from what the issue call is shown, or the
 *     story reaching the reading call.
 *   - The route answering someone not signed in, ignoring its switch, taking
 *     an unbounded question, or not filing the laws the library lacks.
 *   - The assistant not asking for or not showing the law; the route shipping
 *     without the index.
 *
 * COSTS NOTHING: model calls and embeddings are stubs; real passages come
 * from the built index on disk.
 *
 * Run: npm run test:assistant-law
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { NextRequest } from "next/server";

import { createAssistantLawPost } from "../../app/api/assistant/law/route";
import { loadCorpusIndex, readPassage } from "../../src/lib/case-system/retrieval/corpusIndex";
import { findingsView } from "../../src/lib/case-system/retrieval/findingsView";
import { parseQuestionIssues, questionPrompt, researchQuestion } from "../../src/lib/case-system/retrieval/researchQuestion";
import { readingPrompt, type ResearchResult } from "../../src/lib/case-system/retrieval/researchStory";
import { assistantLawEnabled } from "../../src/lib/content-library/phaseScope";

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

const QUESTION = "Do I have to tell the city before I sue over the bus?";
const STORY = "I was hit by a city bus at a crosswalk and dislocated my shoulder.";

async function main() {
  console.log("\n1. One question, at most two research questions");
  const issues = parseQuestionIssues(
    JSON.stringify({
      situation: "A pedestrian was injured by a bus.",
      issues: [1, 2, 3, 4].map((n) => ({ question: `Research question number ${n} about notice`, queries: [`notice phrase ${n} words`] })),
    }),
  );
  check("at most two", issues.length === 2);
  const prompt = questionPrompt({ question: QUESTION, story: STORY, courtPath: "small-claims", side: "plaintiff" });
  check("the issue call sees the question and the story", prompt.includes(QUESTION) && prompt.includes("dislocated"));

  const index = loadCorpusIndex(ROOT);
  if (!index) {
    console.log("  info  no built index here; the research checks are skipped");
    await routeAndWiring(null);
    return;
  }
  let notice = null as ReturnType<typeof readPassage>;
  for (const [id] of index.meta.chunks) {
    if (!id.startsWith("corpus:insurance-act:")) continue;
    const passage = readPassage(index, id, 0.6);
    if (passage && /258\.3 \(1\)/.test(passage.pinpoint || "")) {
      notice = passage;
      break;
    }
  }
  check("the index has the Insurance Act notice provision", Boolean(notice));
  if (!notice) {
    await routeAndWiring(null);
    return;
  }

  console.log("\n2. Researched like the story, quotes checked by code");
  const dims = index.meta.dimensions;
  const row = index.meta.chunks.findIndex(([id]) => id === notice!.id);
  const vector = Array.from(index.vectors.slice(row * dims, (row + 1) * dims));
  const reads: string[] = [];
  const quote = "served written notice of the intention to commence the action on the defendant within 120 days";
  const result = await researchQuestion(
    { question: QUESTION, story: STORY, courtPath: "small-claims", side: "plaintiff" },
    {
      index,
      spotQuestion: async () => [
        { id: "issue-1", question: "Is notice required before suing over a vehicle injury?", queries: ["notice of intention to commence action"], situation: "A pedestrian was injured by a bus." },
        { id: "issue-2", question: "What is the limitation period?", queries: ["basic limitation period"], situation: "A pedestrian was injured by a bus." },
      ],
      embed: async (texts) => texts.map(() => vector),
      readPassages: async (_input, asked, byIssue) => {
        reads.push(readingPrompt(asked, byIssue));
        const issue = asked[0];
        if (issue.id === "issue-1") return { results: [{ issueId: "issue-1", status: "answered", answers: [{ passageId: notice!.id, quote }] }] };
        return { results: [{ issueId: "issue-2", status: "answered", answers: [{ passageId: notice!.id, quote: "a quote that is nowhere in the passage at all" }] }] };
      },
    },
  );
  const view = findingsView(result, false);
  check("a verified quote is shown with its provision", view[0]?.status === "answered" && view[0].provisions[0]?.quote === quote && /Insurance Act/.test(view[0].provisions[0].citation ?? view[0].provisions[0].label));
  check("an invented quote is not shown", (view[1]?.provisions.length ?? 0) === 0);
  check("the story never reaches the reading call", !reads.some((text) => text.includes("dislocated")));

  await routeAndWiring(result);
}

async function routeAndWiring(stubResult: ResearchResult | null) {
  console.log("\n3. The route");
  const calls: string[] = [];
  const filed: string[][] = [];
  const research: ResearchResult = stubResult ?? { queries: [], passages: [], items: [], issues: [], findings: [], sourceRequests: [], rounds: 1 };
  const route = (signedIn: boolean, enabled = true) =>
    createAssistantLawPost({
      authenticate: (async () => (signedIn ? { id: "u" } : null)) as never,
      enabled: () => enabled,
      hasAi: () => true,
      // The checked answer has its own suite (test:checked-answer).
      answerEnabled: () => false,
      research: async () => {
        calls.push("research");
        return { ...research, sourceRequests: ["Some Missing Act"] };
      },
      fileRequests: (async (names: string[]) => {
        filed.push(names);
        return { filed: names, skipped: [] };
      }) as never,
    });
  const post = (body: unknown, signedIn = true, enabled = true) =>
    route(signedIn, enabled)(new NextRequest("http://localhost/api/assistant/law", { method: "POST", body: JSON.stringify(body) }));
  const ok = await (await post({ question: QUESTION, courtPath: "small-claims", story: STORY })).json();
  check("a signed-in question is researched and answered with findings", calls.length === 1 && Array.isArray(ok.findings));
  check("laws the library lacks are filed", filed.flat().join() === "Some Missing Act");
  const anonymous = await (await post({ question: QUESTION, courtPath: "civil" }, false)).json();
  check("someone not signed in gets nothing and no model is called", anonymous.findings.length === 0 && calls.length === 1);
  const off = await (await post({ question: QUESTION, courtPath: "family" }, true, false)).json();
  check("the switch turns it off", off.skipped === "off" && calls.length === 1);
  check("a question too long is refused", (await post({ question: "x".repeat(1001), courtPath: "civil" })).status === 400);
  check("an unknown court is refused", (await post({ question: QUESTION, courtPath: "criminal" })).status === 400);

  // A follow-up is answered with the conversation it follows (2026-10-09:
  // "It happened in Ottawa" was answered as if nothing came before it).
  {
    let seen = "";
    const followRoute = createAssistantLawPost({
      authenticate: (async () => ({ id: "u" })) as never,
      enabled: () => true,
      hasAi: () => true,
      answerEnabled: () => false,
      research: (async (input: { question: string }) => {
        seen = input.question;
        return research;
      }) as never,
      fileRequests: (async () => ({ filed: [], skipped: [] })) as never,
    });
    const send = (body: unknown) => followRoute(new NextRequest("http://localhost/api/assistant/law", { method: "POST", body: JSON.stringify(body) }));
    await send({ question: "It happened in Ottawa", courtPath: "civil", earlier: ["The man was released on bail four months before."] });
    check("a follow-up goes with the person's earlier words", seen.startsWith("It happened in Ottawa") && seen.includes("released on bail"));
    await send({ question: "It happened in Ottawa", courtPath: "civil" });
    check("a first question goes alone", seen === "It happened in Ottawa");
    check("more than four earlier messages is refused", (await send({ question: "x y z", courtPath: "civil", earlier: ["a", "b", "c", "d", "e"] })).status === 400);
    check("an earlier message must be text", (await send({ question: "x y z", courtPath: "civil", earlier: [42] })).status === 400);
  }

  // Numbered references, one number per source (2026-10-09).
  {
    const { numberedSources } = await import("../../app/_components/CheckedAnswerPanel");
    const source = (citation: string) => ({ passageId: citation, citation, sourceUrl: "", quote: "q", kind: "legislation" as const });
    const refs = numberedSources({
      statements: [
        { text: "One.", sources: [source("Act A, s. 1"), source("Act B, s. 2")] },
        { text: "Two.", sources: [source("Act A, s. 1")] },
      ],
    } as never);
    check(
      "each source gets one number, reused where it is cited again",
      refs.list.length === 2 && refs.numbersFor[0].join() === "1,2" && refs.numbersFor[1].join() === "1",
    );
  }

  // 2026-10-07: the checked answer comes first; the research step is the fallback.
  const answerCalls: string[] = [];
  const answerRoute = (status: "answered" | "not-confirmed" | "unavailable") =>
    createAssistantLawPost({
      authenticate: (async () => ({ id: "u" })) as never,
      enabled: () => true,
      hasAi: () => true,
      answerEnabled: () => true,
      answer: (async () => {
        answerCalls.push(status);
        return {
          status,
          statements: status === "answered" ? [{ text: "A checked statement.", sources: [{ passageId: "corpus:x:1", citation: "Some Act, s. 1", sourceUrl: "", quote: "a quote of the law here", kind: "legislation" }] }] : [],
          notConfirmed: [],
          declinedToJudge: false,
          missingLaw: ["Another Missing Act"],
        };
      }) as never,
      research: async () => {
        answerCalls.push("research");
        return research;
      },
      fileRequests: (async (names: string[]) => {
        filed.push(names);
        return { filed: names, skipped: [] };
      }) as never,
    });
  const answeredReply = await (await answerRoute("answered")(new NextRequest("http://localhost/api/assistant/law", { method: "POST", body: JSON.stringify({ question: QUESTION, courtPath: "small-claims" }) }))).json();
  check("a checked answer is the reply, and the research step is not run", answeredReply.answer?.statements?.length === 1 && !answerCalls.includes("research"));
  check("the reply never carries the internal list of missing laws", answeredReply.answer && !("missingLaw" in answeredReply.answer));
  check("laws the answer named that the library lacks are filed", filed.flat().includes("Another Missing Act"));
  answerCalls.length = 0;
  const fallback = await (await answerRoute("unavailable")(new NextRequest("http://localhost/api/assistant/law", { method: "POST", body: JSON.stringify({ question: QUESTION, courtPath: "small-claims" }) }))).json();
  check("when no checked answer is possible, the research step runs as before", answerCalls.join() === "unavailable,research" && Array.isArray(fallback.findings) && !fallback.answer);

  // The saved case (2026-10-08): its story and what it records reach the
  // answer, read from the case the person owns, never from the request.
  let seenInput = null as Record<string, unknown> | null;
  let loadedFor = "";
  const withCase = createAssistantLawPost({
    authenticate: (async () => ({ id: "u" })) as never,
    enabled: () => true,
    hasAi: () => true,
    answerEnabled: () => true,
    loadCase: async (_request, _user, caseId) => {
      loadedFor = caseId;
      return { story: "the saved story", facts: "Side: responding to a case someone else started (confirmed by the person)" };
    },
    answer: (async (input: Record<string, unknown>) => {
      seenInput = input;
      return { status: "answered", statements: [], notConfirmed: [], declinedToJudge: false, missingLaw: [] };
    }) as never,
    fileRequests: (async () => ({ filed: [], skipped: [] })) as never,
  });
  const caseId = "00000000-0000-4000-8000-000000000002";
  await withCase(new NextRequest("http://localhost/api/assistant/law", { method: "POST", body: JSON.stringify({ question: QUESTION, courtPath: "small-claims", story: "words from the page", caseId }) }));
  check("with a saved case, its story and recorded facts reach the answer", loadedFor === caseId && seenInput?.["story"] === "the saved story" && /confirmed by the person/.test(String(seenInput?.["facts"])));
  check("a case id that is not one is refused", (await withCase(new NextRequest("http://localhost/api/assistant/law", { method: "POST", body: JSON.stringify({ question: QUESTION, courtPath: "small-claims", caseId: "x" }) }))).status === 400);
  check("the Court Assistant sends its saved case", read("app/builder/_components/CourtAssistantChat.tsx").includes("? { caseId } : {}"));

  console.log("\n4. Switches and wiring");
  check("on by default", assistantLawEnabled({}));
  check("ASSISTANT_LAW=off turns it off", !assistantLawEnabled({ ASSISTANT_LAW: "off" }));
  check("off when provisions are not shown (APPLIED_LAW=off)", !assistantLawEnabled({ APPLIED_LAW: "off" }));
  check("off when the research step is off", !assistantLawEnabled({ RESEARCH_STEP: "off" }));
  const module = read("src/lib/case-system/retrieval/researchQuestion.ts");
  check("its model call declares structured output and is audited", (module.match(/chat\.completions\.create\(/g) ?? []).length === 1 && module.includes('response_format: { type: "json_object" }') && module.includes("withAiCallContext("));
  check("declared as a model call site", read("scripts/verification/verifyOutputGuard.ts").includes('"src/lib/case-system/retrieval/researchQuestion.ts"'));
  check("the route ships with the index", read("next.config.ts").includes('"/api/assistant/law": RETRIEVAL_FILES'));
  const chat = read("app/builder/_components/CourtAssistantChat.tsx");
  check("the Court Assistant asks for the law on each question", chat.includes('fetch("/api/assistant/law"'));
  check("and shows it in the provisions' own words", chat.includes("<ResearchPanel findings={answered} />"));
  check("and shows a checked answer first when there is one", chat.includes("<CheckedAnswerPanel answer={entry.answer} />"));

  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

void main();
