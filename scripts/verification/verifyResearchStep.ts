/**
 * The research step (src/lib/case-system/retrieval/researchStory.ts): the
 * model chooses the questions and reads the passages, and code decides what
 * counts as an answer.
 *
 * WHAT IT CATCHES:
 *   - An "answered" verdict whose quote is not in the passage it names, or
 *     names a passage that was never offered for that question, being
 *     treated as an answer (the model inventing support).
 *   - A claimed answer with no surviving quote not being searched again.
 *   - The second round not running for questions the reader could not
 *     answer, or its new passages not reaching the second reading.
 *   - Answering passages not coming first in what the analysis may cite.
 *   - A gap in the library ("not-in-library") not becoming a source request,
 *     or a source request appearing without a gap.
 *   - Another court's procedure being searched for this court.
 *   - Any failure (model error, bad JSON, timeout) blocking the analysis
 *     instead of returning nothing.
 *   - The story reaching the reading call or the embeddings (only the
 *     issue-spotting call may see it).
 *   - A model call without structured output, unaudited, or undeclared.
 *
 * COSTS NOTHING: the model calls and embeddings are stubs; the built index is
 * read from disk.
 *
 * Run: npm run test:research-step
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { loadCorpusIndex, type Passage } from "../../src/lib/case-system/retrieval/corpusIndex";
import {
  parseIssues,
  parseReadResults,
  readingPrompt,
  researchStory,
  type ResearchIssue,
} from "../../src/lib/case-system/retrieval/researchStory";
import { researchStepEnabled } from "../../src/lib/content-library/phaseScope";

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
  console.log("\n1. Parsing the model's questions");
  const issues = parseIssues(
    JSON.stringify({
      issues: [
        { question: "Is notice required before suing over a vehicle injury?", queries: ["notice of intention to commence action bodily injury automobile", "notice of intention to commence action bodily injury automobile", "x"] },
        { question: "short", queries: ["limitation period"] },
        { question: "What is the limitation period for this claim?", queries: [] },
        ...Array.from({ length: 12 }, (_, n) => ({ question: `Question number ${n} about the law`, queries: [`search phrase ${n} words`] })),
      ],
    }),
  );
  check("a question needs words and at least one usable search phrase", !issues.some((issue) => issue.question === "short" || issue.queries.length === 0));
  check("duplicate and too-short phrases are dropped", issues[0]?.queries.length === 1);
  check("at most six questions", issues.length === 6);
  check("prose is not a list of questions", parseIssues("I think the issues are...").length === 0);

  const index = loadCorpusIndex(ROOT);
  if (!index) {
    console.log("  info  no built index here; the loop checks are skipped");
    finish();
    return;
  }

  // Real passages from the index, for the stubs to "find".
  const ids = index.meta.chunks.map(([id]) => id);
  const { readPassage } = await import("../../src/lib/case-system/retrieval/corpusIndex");
  const passageFor = (prefix: string) => {
    for (const id of ids) {
      if (!id.startsWith(prefix)) continue;
      const passage = readPassage(index, id, 0.5);
      if (passage) return passage;
    }
    return null;
  };
  const notice = (() => {
    for (const id of ids.filter((id) => id.startsWith("corpus:insurance-act:"))) {
      const passage = readPassage(index, id, 0.6);
      if (passage && /258\.3 \(1\)/.test(passage.pinpoint || "")) return passage;
    }
    return null;
  })();
  check("the index has the Insurance Act notice provision", Boolean(notice));
  if (!notice) {
    finish();
    return;
  }

  console.log("\n2. Code decides what counts as an answer");
  const twoIssues: ResearchIssue[] = [
    { id: "issue-1", question: "Is notice required before suing over a vehicle injury?", queries: ["notice of intention to commence action"] },
    { id: "issue-2", question: "What is the limitation period?", queries: ["basic limitation period"] },
  ];
  const other = passageFor("corpus:limitations-act-2002:")!;
  const offered = new Map<string, Passage[]>([
    ["issue-1", [notice]],
    ["issue-2", [other]],
  ]);
  const realQuote = "served written notice of the intention to commence the action on the defendant within 120 days";
  const verdicts = parseReadResults(
    {
      results: [
        { issueId: "issue-1", status: "answered", answers: [{ passageId: notice.id, quote: realQuote }, { passageId: other.id, quote: "a passage offered for another question" }] },
        { issueId: "issue-2", status: "answered", answers: [{ passageId: other.id, quote: "words that are not in the passage at all, invented" }] },
        { issueId: "issue-9", status: "answered", answers: [] },
      ],
    },
    twoIssues,
    offered,
  );
  const v1 = verdicts.find((v) => v.issueId === "issue-1");
  const v2 = verdicts.find((v) => v.issueId === "issue-2");
  check("a real quote from an offered passage is an answer", v1?.status === "answered" && v1.answers.length === 1);
  check("a passage offered for a different question does not count", !v1?.answers.some((a) => a.passageId === other.id));
  check("an invented quote is not an answer: the question is searched again", v2?.status === "search-again" && v2.answers.length === 0);
  check("an unknown question id is ignored", !verdicts.some((v) => v.issueId === "issue-9"));
  check("prose is not a verdict", parseReadResults("All answered.", twoIssues, offered).length === 0);

  console.log("\n3. The loop");
  const embedded: string[][] = [];
  const readCalls: { issues: string[]; prompt: string }[] = [];
  // Every query "means" the notice provision: the stub returns that
  // passage's own stored vector, so search finds it and its neighbours.
  const dims = index.meta.dimensions;
  const row = index.meta.chunks.findIndex(([id]) => id === notice.id);
  const noticeVector = Array.from(index.vectors.slice(row * dims, (row + 1) * dims));
  const embed = async (texts: string[]) => {
    embedded.push(texts);
    return texts.map(() => noticeVector);
  };
  const result = await researchStory(
    { story: STORY, courtPath: "small-claims", side: "plaintiff" },
    {
      index,
      spotIssues: async () => twoIssues,
      embed,
      readPassages: async (_input, asked, byIssue) => {
        // Each question is read in its own call.
        readCalls.push({ issues: asked.map((issue) => issue.id), prompt: readingPrompt(asked, byIssue) });
        const issue = asked[0];
        const round = readCalls.filter((call) => call.issues[0] === issue.id).length;
        if (issue.id === "issue-2") {
          return { results: [{ issueId: "issue-2", status: "not-in-library", missingLaw: "Highway Traffic Act, R.S.O. 1990, c. H.8, s. 193" }] };
        }
        if (round === 1) {
          return { results: [{ issueId: "issue-1", status: "search-again", queries: ["notice of intention to commence the action within 120 days"] }] };
        }
        // Round 2: answer issue-1 from a passage it was offered, quoting it.
        const passage = byIssue.get("issue-1")?.[0];
        return { results: [{ issueId: "issue-1", status: "answered", answers: passage ? [{ passageId: passage.id, quote: passage.text.slice(0, 60) }] : [] }] };
      },
    },
  );
  check("two rounds ran", result.rounds === 2, String(result.rounds));
  check("each question is read in its own call", readCalls.every((call) => call.issues.length === 1));
  check("the second round reads only the questions that asked for more", readCalls.slice(2).map((call) => call.issues.join()).join() === "issue-1");
  check("the second search used the reader's new phrases", embedded[1]?.[0] === "notice of intention to commence the action within 120 days");
  check("a question answered in round 2 is answered", result.findings.find((f) => f.issueId === "issue-1")?.status === "answered");
  check("a library gap becomes a source request", result.sourceRequests.join() === "Highway Traffic Act, R.S.O. 1990, c. H.8, s. 193");
  const answeringId = result.findings.find((f) => f.issueId === "issue-1")?.answeredBy[0]?.passageId;
  check("the answering passage comes first in what the analysis may cite", Boolean(answeringId) && result.items[0]?.id === answeringId);
  check("the story never reaches the embeddings", !embedded.flat().some((text) => text.includes("dislocated")));
  check("the story never reaches the reading call", !readCalls.some((call) => call.prompt.includes("dislocated")));
  check(
    "no other court's procedure is searched",
    !result.passages.some((passage) => /^(rules-of-civil-procedure|family-law-rules)$/.test(passage.sourceId)),
  );

  console.log("\n4. Failure is harmless");
  const failed = await researchStory(
    { story: STORY, courtPath: "small-claims" },
    { index, spotIssues: async () => { throw new Error("model down"); }, embed, readPassages: async () => ({}) },
  );
  check("a model failure returns nothing, and does not throw", failed.items.length === 0 && failed.skipped === "error");
  const noIssues = await researchStory({ story: STORY, courtPath: "small-claims" }, { index, spotIssues: async () => [], embed, readPassages: async () => ({}) });
  check("no questions, nothing searched", noIssues.skipped === "no issues" && noIssues.items.length === 0);
  const garbage = await researchStory({ story: STORY, courtPath: "small-claims" }, { index, spotIssues: async () => twoIssues, embed, readPassages: async () => "not json" });
  check("an unreadable verdict leaves every question unanswered, with passages still offered", garbage.findings.every((f) => f.status === "not-found") && garbage.items.length > 0);

  finish();
}

function finish() {
  console.log("\n5. Switches and wiring");
  check("on by default", researchStepEnabled({}));
  check("RESEARCH_STEP=off turns it off", !researchStepEnabled({ RESEARCH_STEP: "off" }));
  const module = read("src/lib/case-system/retrieval/researchStory.ts");
  check("every model call declares structured output", (module.match(/chat\.completions\.create\(/g) ?? []).length === 1 && module.includes('response_format: { type: "json_object" }'));
  check("model calls are audited", module.includes("withAiCallContext("));
  check("declared as a model call site", read("scripts/verification/verifyOutputGuard.ts").includes('"src/lib/case-system/retrieval/researchStory.ts"'));
  const brain = read("src/lib/case-system/intelligence/courtSimplifiedBrain.ts");
  check("the analysis uses the research step when it is on", /researchStepEnabled\(\)/.test(brain) && /researchStory\(/.test(brain));
  console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) FAILED.`}`);
  if (failures) process.exitCode = 1;
}

void main();
